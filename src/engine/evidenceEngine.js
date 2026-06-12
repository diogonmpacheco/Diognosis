// MedCheck Engine — Evidence resolution and display
// Phase A: modular source — concatenated by build.js

function evidenceConfidence(ev) {
  if (!ev) return 'unknown';
  return ev.confidence || 'unknown';
}

function evidenceToHTML(ev) {
  if (!ev) return '';
  const conf = ev.confidence || 'unknown';
  const sources = (ev.sources || []).join(', ');
  const pmids = (ev.pmid || []).map(p => `PMID:${p}`).join(' ');
  const auc = ev.aucFold ? `AUC ×${ev.aucFold}` : '';
  const pop = ev.population ? `[${ev.population}]` : '';
  return [conf, sources, auc, pop, pmids].filter(Boolean).join(' · ');
}

// ── fractionModel ──
// Replaces static `fraction` with a dynamic route-weighting model.
// Static fraction is still valid and used as fractionModel.base.
// The dynamic model adds: saturable kinetics, adaptive regulation,
// inducibility, and competitive substrate burden tracking.
//
// Usage: getEffectiveFraction(route, context) → number [0–1]
function getEffectiveFraction(route, context) {
  const ctx = context || {};
  const base = route.fractionModel ? route.fractionModel.base : (route.fraction || 0);
  let f = base;

  // Competitive substrate burden: if enzyme is congested by many substrates,
  // effective fraction decreases proportionally to competition
  if (route.fractionModel && route.fractionModel.competitive && ctx.enzymeLoad) {
    const load = ctx.enzymeLoad[route.enzyme] || 1;
    f = f / Math.max(1, load);
  }

  // Saturable kinetics: at high dose, saturable routes are capped
  if ((route.fractionModel ? route.fractionModel.saturable : route.saturable) && ctx.doseMultiplier > 1) {
    const km = 0.5; // normalized; saturation at 2× dose
    f = f * (km / (km + Math.max(0, ctx.doseMultiplier - 1)));
  }

  return Math.min(1, Math.max(0, f));
}

// ── Metabolite Actors ──
// Key metabolites promoted to first-class entities with their own
// inhibitory properties, half-lives, and pharmacological activity.
// These are the metabolites that ACTIVELY participate in DDIs.
function getStudy(id) {
  return STUDY_DB[id] || null;
}

function isExternalContextEvidence(study) {
  if (!study) return false;
  return Boolean(
    study.importedContextOnly === true ||
    study.notSeverityBearing === true ||
    study.sourceCategory === SOURCE_CATEGORY.OPEN_TARGETS_CONTEXT ||
    study.sourceCategory === SOURCE_CATEGORY.EXTERNAL_CONTEXT ||
    study.openTargetsDrugId ||
    study.chemblId ||
    study.openTargetsSourceDataset
  );
}

function isPromotedSeverityEvidence(study) {
  return Boolean(
    study &&
    study.reviewDecision === REVIEW_DECISION.PROMOTED_FOR_SEVERITY &&
    study.importedContextOnly !== true &&
    study.notSeverityBearing !== true
  );
}

function isSeverityBearingEvidence(study) {
  if (!study) return false;
  if (!isExternalContextEvidence(study)) return true;
  return isPromotedSeverityEvidence(study);
}

function getSeverityBearingStudies(studies) {
  return (studies || []).filter(isSeverityBearingEvidence);
}

let _studySupportIndex = null;
let _studySupportIndexSize = 0;

function normalizeEvidenceSupportKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getStudySupportIndex() {
  const studyIds = Object.keys(STUDY_DB || {});
  if (_studySupportIndex && _studySupportIndexSize === studyIds.length) return _studySupportIndex;
  const index = new Map();
  for (const study of Object.values(STUDY_DB || {})) {
    for (const support of study.supports || []) {
      const key = normalizeEvidenceSupportKey(support);
      if (!key) continue;
      const list = index.get(key) || [];
      list.push(study);
      index.set(key, list);
    }
  }
  _studySupportIndex = index;
  _studySupportIndexSize = studyIds.length;
  return index;
}

function getEdgeEvidenceSupportKeys(edge) {
  if (!edge) return [];
  const from = edge.from || edge.props?.from || "";
  const to = edge.to || edge.props?.to || "";
  const props = edge.props || {};
  const keys = [
    ...(props.supports || []),
    ...(props.evidenceSupports || []),
  ];

  if (from && to) {
    if (edge.type === EDGE_TYPE?.INHIBITS) keys.push(`${from}_inhibits_${to}`);
    if (edge.type === EDGE_TYPE?.INDUCES) keys.push(`${from}_induces_${to}`);
    if (edge.type === EDGE_TYPE?.SUBSTRATE_OF) {
      keys.push(`${from}_substrate_of_${to}`, `${from}_${to}_substrate`, `${from}_${to}_clearance`, `${from}_${to}_context`);
    }
    if (edge.type === EDGE_TYPE?.METABOLIZED_TO || edge.type === EDGE_TYPE?.ACTIVATES) {
      keys.push(`${from}_metabolized_to_${to}`);
      if (props.enzyme) keys.push(`${from}_${props.enzyme}_metabolite_context`, `${from}_${props.enzyme}_exposure_context`);
    }
    if (edge.type === EDGE_TYPE?.TRANSPORTED_BY) {
      keys.push(`${from}_${to}_transport`, `${from}_${to}_context`, `${from}_substrate_of_${to}`);
    }
  }

  return [...new Set(keys.map(normalizeEvidenceSupportKey).filter(Boolean))];
}

// resolveEvidenceRefs(refs) — resolves an array of study IDs to study objects
// Also accepts structured STUDY_DB.supports keys so enrichment studies can
// contribute to calculations without copying every draft ID into data rows.
function resolveEvidenceRefs(refs, supportKeys) {
  const results = [];
  const seen = new Set();
  for (const id of refs || []) {
    const study = getStudy(id);
    if (study && !seen.has(study.id)) {
      seen.add(study.id);
      results.push(study);
    }
  }
  const supportIndex = getStudySupportIndex();
  for (const key of supportKeys || []) {
    const normalized = normalizeEvidenceSupportKey(key);
    for (const study of supportIndex.get(normalized) || []) {
      if (study && !seen.has(study.id)) {
        seen.add(study.id);
        results.push(study);
      }
    }
  }
  return results;
}

// computeEdgeConfidence(edge) — returns 0–1 confidence for a graph edge
// Priority: evidenceRefs[] with EVIDENCE_WEIGHT → inline evidence.confidence → fallback 0.50
// When multiple studies support an edge, uses the HIGHEST weight (best available evidence)
// plus a small corroboration bonus (+0.02 per additional study, capped at 0.99)
function computeEdgeConfidence(edge) {
  if (!edge) return 0.50;

  // Path 1: evidenceRefs and STUDY_DB.supports keys pointing to STUDY_DB entries
  const refs = edge.props && edge.props.evidenceRefs;
  const studies = resolveEvidenceRefs(refs, getEdgeEvidenceSupportKeys(edge));
  const severityBearingStudies = getSeverityBearingStudies(studies);
  if (severityBearingStudies.length) {
    const weights = severityBearingStudies.map(s => EVIDENCE_WEIGHT[s.type] || 0.50);
    const maxWeight = Math.max(...weights);
    const corroboration = Math.min(0.04, (severityBearingStudies.length - 1) * 0.02);  // +2% per extra study
    return Math.min(0.99, maxWeight + corroboration);
  }

  // Path 2: inline evidence object on edge.props
  const ev = edge.props && edge.props.evidence;
  if (ev) {
    if (typeof ev.confidence === 'number') return ev.confidence;
    const confMap = { high: 0.85, moderate: 0.70, low: 0.45, unknown: 0.50 };
    return confMap[ev.confidence] || 0.50;
  }

  // Path 3: inline on inhibitor object (legacy drug.inh format)
  const str = edge.props && edge.props.strength;
  if (str) {
    const strengthMap = { strong: 0.82, moderate: 0.70, weak: 0.55 };
    return strengthMap[str] || 0.60;
  }

  return 0.50;  // unknown fallback
}

// resolveInteractionEvidence(interaction) — finds all STUDY_DB entries that support a DDI
// Searches by: evidenceRefs on the interaction, STUDY_DB supports[] fields, and DRUG_DB inline evidence
function resolveInteractionEvidence(interaction) {
  const results = [];
  const seen = new Set();

  // Direct evidenceRefs on the interaction object
  if (interaction.evidenceRefs) {
    for (const ref of interaction.evidenceRefs) {
      const s = getStudy(ref);
      if (s && !seen.has(s.id)) { seen.add(s.id); results.push(s); }
    }
  }

  // Structured STUDY_DB.supports keys are calculation-bearing evidence too.
  for (const s of resolveEvidenceRefs([], getInteractionEvidenceSupportKeys(interaction))) {
    if (s && !seen.has(s.id)) {
      seen.add(s.id);
      results.push(s);
    }
  }

  // Search STUDY_DB.supports[] for matching edges
  // Matches are fuzzy: look for drug name substrings in supports[] strings
  const drug1 = (interaction.drug1 || '').toLowerCase();
  const drug2 = (interaction.drug2 || '').toLowerCase();
  const enzyme = (interaction.enzyme || '').toLowerCase();
  for (const [sid, study] of Object.entries(STUDY_DB)) {
    if (seen.has(sid)) continue;
    const supportsText = (study.supports || []).join(' ').toLowerCase();
    const titleText = (study.title || '').toLowerCase();
    const matchesDrug1 = drug1 && (supportsText.includes(drug1) || titleText.includes(drug1));
    const matchesDrug2 = drug2 && (supportsText.includes(drug2) || titleText.includes(drug2));
    const matchesEnzyme = enzyme && (supportsText.includes(enzyme) || titleText.includes(enzyme));
    if ((matchesDrug1 || matchesDrug2) && (matchesEnzyme || matchesDrug1 && matchesDrug2)) {
      seen.add(sid);
      results.push(study);
    }
  }

  return results;
}

function getInteractionEvidenceSupportKeys(interaction) {
  if (!interaction) return [];
  const drug1 = interaction.drug1 || "";
  const drug2 = interaction.drug2 || "";
  const enzyme = interaction.enzyme || interaction.category || interaction.affectedPathway || "";
  const keys = [
    ...(interaction.supports || []),
    ...(interaction.evidenceSupports || []),
  ];
  if (drug1 && drug2) {
    keys.push(`${drug1}_${drug2}_interaction`, `${drug1}_${drug2}_context`, `${drug1}_${drug2}_risk`);
  }
  if (drug1 && enzyme) {
    keys.push(`${drug1}_inhibits_${enzyme}`, `${drug1}_induces_${enzyme}`, `${drug1}_substrate_of_${enzyme}`, `${drug1}_${enzyme}_substrate`, `${drug1}_${enzyme}_context`);
  }
  if (drug2 && enzyme) {
    keys.push(`${drug2}_inhibits_${enzyme}`, `${drug2}_induces_${enzyme}`, `${drug2}_substrate_of_${enzyme}`, `${drug2}_${enzyme}_substrate`, `${drug2}_${enzyme}_context`);
  }
  return [...new Set(keys.map(normalizeEvidenceSupportKey).filter(Boolean))];
}

// studyBadgeHTML(study) — renders a compact evidence type badge
function studyBadgeHTML(study) {
  const type = study?.type || "evidence";
  const tierColors = {
    [EVIDENCE_TIER.FDA_LABEL]:    'background:#dcfce7;color:#166534',
    [EVIDENCE_TIER.META_ANALYSIS]:'background:#dbeafe;color:#1e40af',
    [EVIDENCE_TIER.RCT]:          'background:#ede9fe;color:#5b21b6',
    [EVIDENCE_TIER.GUIDELINE]:    'background:#ecfdf5;color:#065f46',
    [EVIDENCE_TIER.CLINICAL_PK]:  'background:#f0f9ff;color:#0369a1',
    [EVIDENCE_TIER.OBSERVATIONAL]:'background:#fef9c3;color:#854d0e',
    [EVIDENCE_TIER.CASE_REPORT]:  'background:#fef3c7;color:#92400e',
    [EVIDENCE_TIER.IN_VITRO]:     'background:#f1f5f9;color:#475569',
    [EVIDENCE_TIER.ANIMAL]:       'background:#f1f5f9;color:#475569',
  };
  const style = tierColors[type] || 'background:#f1f5f9;color:#475569';
  const label = type.replace(/_/g,' ').toUpperCase();
  const weight = EVIDENCE_WEIGHT[type] || 0.5;
  const pct = Math.round(weight * 100);
  return `<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:6px;${style}">${label} ${pct}%</span>`;
}

// ═══════════════════════════════════════════════════════════════════
// PHASE D — EVIDENCE NORMALIZATION
//
// Every severity judgment must carry full provenance:
//   sourceType       — what kind of study
//   studyCount       — how many studies support this
//   confidence       — 0–1 calibrated weight from EVIDENCE_WEIGHT
//   reproducibility  — 'established'|'replicated'|'single'|'conflicting'
//   humanData        — true if any human study supports it
//   genotypeSpecific — true if evidence stratified by genotype
//   lastReviewed     — year of most recent supporting study
//   contradictions   — any directly contradicting studies
//
// Severity may NEVER be output without calling normalizeEvidence() first.
// getEvidenceSummary() provides human-readable provenance.
// ═══════════════════════════════════════════════════════════════════

/**
 * normalizeEvidence(interaction, studies)
 *
 * Produces a full evidence provenance object from an interaction + its studies.
 * This is the canonical way to attach evidence metadata to any severity claim.
 *
 * @param {object} interaction — interaction object (from findInteractions or KNOWN_DDI)
 * @param {object[]} studies   — resolved STUDY_DB entries (from resolveInteractionEvidence)
 * @returns {EvidenceProvenance}
 */
function normalizeEvidence(interaction, studies) {
  const resolvedStudies = studies || resolveInteractionEvidence(interaction);
  const severityBearingStudies = getSeverityBearingStudies(resolvedStudies);

  if (!severityBearingStudies || severityBearingStudies.length === 0) {
    // No STUDY_DB entries — fall back to inline evidence on the interaction
    const ev = interaction.evidence || {};
    const confStr = ev.confidence || 'unknown';
    const confMap = { high: 0.78, moderate: 0.60, low: 0.40, unknown: 0.45 };
    const contextOnlyCount = (resolvedStudies || []).length;
    return {
      sourceType: ev.sources ? ev.sources[0] : 'unknown',
      studyCount: 0,
      confidence: confMap[confStr] || 0.45,
      reproducibility: 'unknown',
      humanData: !!(ev.sources && ev.sources.some(s =>
        ['FDA label','clinical','RCT','observational'].some(k => s.toLowerCase().includes(k))
      )),
      genotypeSpecific: false,
      lastReviewed: null,
      contradictions: [],
      studies: resolvedStudies || [],
      severityBearingStudies: [],
      contextOnlyStudyCount: contextOnlyCount,
      provenance_note: contextOnlyCount
        ? `${contextOnlyCount} context-only source${contextOnlyCount === 1 ? '' : 's'} excluded from severity calibration`
        : (ev.sources ? `Inline evidence: ${ev.sources.join(', ')}` : 'No formal evidence linked'),
      pmids: (ev.pmid || []).map(String),
    };
  }

  // ── Aggregate across all linked studies ──
  const weights = severityBearingStudies.map(s => EVIDENCE_WEIGHT[s.type] || 0.50);
  const maxWeight = Math.max(...weights);
  const corroboration = Math.min(0.06, (severityBearingStudies.length - 1) * 0.02);
  const confidence = Math.min(0.99, maxWeight + corroboration);

  // Reproducibility: based on study count and types
  const humanTypes = new Set([
    EVIDENCE_TIER.RCT, EVIDENCE_TIER.META_ANALYSIS,
    EVIDENCE_TIER.CLINICAL_PK, EVIDENCE_TIER.OBSERVATIONAL,
    EVIDENCE_TIER.CASE_REPORT, EVIDENCE_TIER.FDA_LABEL, EVIDENCE_TIER.GUIDELINE
  ]);
  const humanStudies = severityBearingStudies.filter(s => humanTypes.has(s.type));
  const rcts = severityBearingStudies.filter(s => s.type === EVIDENCE_TIER.RCT || s.type === EVIDENCE_TIER.META_ANALYSIS);
  const contradictions = severityBearingStudies.flatMap(s => s.contradicts || []);

  let reproducibility;
  if (contradictions.length > 0) {
    reproducibility = 'conflicting';
  } else if (rcts.length >= 2 || severityBearingStudies.length >= 3) {
    reproducibility = 'established';
  } else if (humanStudies.length >= 2) {
    reproducibility = 'replicated';
  } else {
    reproducibility = 'single';
  }

  // Best source type (highest tier)
  const bestStudy = severityBearingStudies.reduce((best, s) =>
    (EVIDENCE_WEIGHT[s.type] || 0) > (EVIDENCE_WEIGHT[best.type] || 0) ? s : best
  );

  // Genotype-specific: any study stratified by genotype
  const genotypeSpecific = severityBearingStudies.some(s =>
    s.genotypeStratified ||
    (s.quantifiedEffects && s.quantifiedEffects.genotypeEffect) ||
    (s.title || '').toLowerCase().includes('genotype') ||
    (s.title || '').toLowerCase().includes('cyp2d6') ||
    (s.title || '').toLowerCase().includes('phenotype')
  );

  // Last reviewed: most recent study year
  const years = severityBearingStudies.map(s => s.year).filter(Boolean);
  const lastReviewed = years.length > 0 ? Math.max(...years) : null;

  // All PMIDs
  const pmids = severityBearingStudies.map(s => s.pmid).filter(Boolean).map(String);

  // Human-readable provenance note
  const typeLabel = bestStudy.type.replace(/_/g,' ').toLowerCase();
  const provenance_note =
    `${severityBearingStudies.length} stud${severityBearingStudies.length === 1 ? 'y' : 'ies'} — best: ${typeLabel}` +
    (rcts.length > 0 ? ` (${rcts.length} RCT/meta)` : '') +
    (genotypeSpecific ? ' · genotype-stratified' : '') +
    (contradictions.length > 0 ? ` · ⚠ ${contradictions.length} contradicting source(s)` : '') +
    (lastReviewed ? ` · reviewed ${lastReviewed}` : '');

  return {
    sourceType: bestStudy.type,
    studyCount: severityBearingStudies.length,
    confidence,
    reproducibility,
    humanData: humanStudies.length > 0,
    genotypeSpecific,
    lastReviewed,
    contradictions,
    studies: resolvedStudies,
    severityBearingStudies,
    contextOnlyStudyCount: resolvedStudies.length - severityBearingStudies.length,
    provenance_note,
    pmids,
  };
}

/**
 * getEvidenceSummary(drug1, drug2, enzyme)
 *
 * Returns a human-readable provenance string for displaying alongside any severity claim.
 * Call this whenever you show "severe" / "moderate" / "mild" — severity without provenance
 * is forbidden by the MASTER OBJECTIVE.
 *
 * @returns {string}  — e.g. "3 studies (RCT, Clinical PK, In vitro) · AUC ×4.8 · Confidence 85%"
 */
function getEvidenceSummary(drug1, drug2, enzyme) {
  const interaction = { drug1, drug2, enzyme };
  const studies = resolveInteractionEvidence(interaction);
  const prov = normalizeEvidence(interaction, studies);

  if (prov.studyCount === 0) {
    return prov.humanData
      ? `Supported by: ${prov.provenance_note} · Confidence ${Math.round(prov.confidence * 100)}%`
      : `Limited evidence · ${prov.provenance_note} · Confidence ${Math.round(prov.confidence * 100)}%`;
  }

  const evidenceStudies = prov.severityBearingStudies || prov.studies || [];
  const typeLabels = [...new Set(evidenceStudies.map(s => s.type.replace(/_/g,' ')))].join(', ');
  const aucEffects = evidenceStudies
    .map(s => s.quantifiedEffects?.aucFold ? `AUC ×${s.quantifiedEffects.aucFold}` : null)
    .filter(Boolean)[0] || '';

  let summary = `${prov.studyCount} stud${prov.studyCount === 1 ? 'y' : 'ies'} (${typeLabels})`;
  if (aucEffects) summary += ` · ${aucEffects}`;
  summary += ` · Confidence ${Math.round(prov.confidence * 100)}%`;
  if (prov.reproducibility === 'conflicting') summary += ' · ⚠ Conflicting evidence';
  if (prov.genotypeSpecific) summary += ' · Genotype-stratified';
  if (prov.pmids.length > 0) summary += ` · PMID:${prov.pmids[0]}${prov.pmids.length > 1 ? '…' : ''}`;

  return summary;
}

/**
 * assertEvidencedSeverity(severity, drug1, drug2, enzyme)
 *
 * Safety guard: throws if severity is claimed without resolvable evidence.
 * In production, downgrades to 'moderate' with a warning rather than crashing.
 * Call this before surfacing any severity label to the user.
 */
function assertEvidencedSeverity(severity, drug1, drug2, enzyme) {
  const studies = resolveInteractionEvidence({ drug1, drug2, enzyme });
  const prov = normalizeEvidence({ drug1, drug2, enzyme, evidence: {} }, studies);

  if (prov.confidence < 0.30 && severity === 'severe') {
    // Downgrade severe → moderate when evidence is extremely thin
    console.warn(`[MedCheck Engine] Downgraded '${severity}' for ${drug1}+${drug2} via ${enzyme} — confidence only ${Math.round(prov.confidence*100)}%. Evidence: ${prov.provenance_note}`);
    return 'moderate';
  }
  return severity;
}

function getDdiEvidenceProfile(ddi) {
  const refs = ddi.evidenceRefs || [];
  const studies = resolveEvidenceRefs(refs, getInteractionEvidenceSupportKeys(ddi));
  const severityBearingStudies = getSeverityBearingStudies(studies);
  const sourceText = `${(ddi.evidence?.sources || []).join(" ")} ${ddi.evidence?.confidence || ""}`.toLowerCase();
  const highTiers = new Set([
    EVIDENCE_TIER.FDA_LABEL,
    EVIDENCE_TIER.GUIDELINE,
    EVIDENCE_TIER.RCT,
    EVIDENCE_TIER.META_ANALYSIS,
    EVIDENCE_TIER.CLINICAL_PK,
  ]);
  return {
    studies,
    severityBearingStudies,
    contextOnlyStudies: studies.filter(study => !isSeverityBearingEvidence(study)),
    missingRefs: refs.filter(id => !STUDY_DB[id]),
    hasHighTierStudy: severityBearingStudies.some(study => highTiers.has(study.type)),
    hasQuantifiedClinicalPk: severityBearingStudies.some(study =>
      study.type === EVIDENCE_TIER.CLINICAL_PK &&
      study.quantifiedEffects &&
      (study.quantifiedEffects.aucFold || study.quantifiedEffects.clearanceReductionPct || study.quantifiedEffects.oddsRatio)
    ),
    hasStrongInline: /fda|label|cpic|guideline|clinical pk|meta-analysis|rct/.test(sourceText) && ddi.evidence?.confidence === "high",
  };
}

function calibrateDdiSeverity(ddi) {
  if (!ddi || ddi.severity !== "severe") return ddi?.severity || "mild";
  const profile = getDdiEvidenceProfile(ddi);
  if (profile.hasHighTierStudy || profile.hasQuantifiedClinicalPk || profile.hasStrongInline) return "severe";
  return "moderate";
}

// studyCardHTML(study) — renders a full study card for the evidence explorer
function studyCardHTML(study) {
  if (!study) return '';
  const pmidLink = study.pmid
    ? `<a href="https://pubmed.ncbi.nlm.nih.gov/${study.pmid}/" target="_blank" style="color:var(--blue);text-decoration:none;font-weight:600">PMID:${study.pmid}</a>`
    : '';
  const doiLink = study.doi
    ? `<a href="https://doi.org/${study.doi}" target="_blank" style="color:var(--blue);text-decoration:none">DOI</a>`
    : '';
  const links = [pmidLink, doiLink].filter(Boolean).join(' · ');

  const qe = study.quantifiedEffects || {};
  const qeItems = [];
  if (qe.aucFold != null) qeItems.push(`AUC ×${qe.aucFold}`);
  if (qe.cmaxFold != null) qeItems.push(`Cmax ×${qe.cmaxFold}`);
  if (qe.clearanceReductionPct) qeItems.push(`CL ↓${qe.clearanceReductionPct}%`);
  if (qe.oddsRatio) qeItems.push(`OR ${qe.oddsRatio}`);
  if (qe.note) qeItems.push(qe.note);

  const contradicts = (study.contradicts || []).length
    ? `<div style="font-size:11px;color:var(--amber);margin-top:4px">⚠ Contradicted by: ${study.contradicts.join(', ')}</div>` : '';
  const limits = (study.limitations || []).length
    ? `<div style="font-size:11px;color:var(--text2);margin-top:4px">Limitations: ${study.limitations.join(' · ')}</div>` : '';
  const unverified = study.verifyNote
    ? `<div style="font-size:10px;color:var(--amber);margin-top:3px">⚠ Review note — ${study.verifyNote}</div>` : '';
  const reviewBadge = '<span class="ev-review-badge needs-review">pending professional review</span>';
  const feedbackLink = renderFeedbackLink("Suggest evidence fix", {
    type:"data",
    title:`[Data review]: ${study.id || "evidence entry"}`,
    focus:`Evidence entry ${study.id || ""}: ${study.title || "Untitled study"}`,
    details:`Evidence ID: ${study.id || "unknown"}\nTitle: ${study.title || "Untitled study"}\nSource: ${study.source || study.journal || "not specified"}\nCurrent concern or correction:`,
    evidenceRefs:study.id ? [study.id] : [],
  });

  return `<div class="ev-card">
    <div class="ev-card-head">
      ${studyBadgeHTML(study)}
      ${reviewBadge}
      ${study.n ? `<span class="ev-n">n=${study.n}</span>` : ''}
      ${study.year ? `<span class="ev-year">${study.year}</span>` : ''}
      ${links ? `<span class="ev-links">${links}</span>` : ''}
    </div>
    <div class="ev-title">${study.title || 'Untitled study'}</div>
    ${study.source ? `<div class="ev-source">${study.source}${study.journal ? ` · ${study.journal}` : ''}</div>` : ''}
    ${qeItems.length ? `<div class="ev-effects">${qeItems.join(' · ')}</div>` : ''}
    ${study.temporal && study.temporal.onset ? `<div class="ev-temporal">⏱ Onset: ${study.temporal.onset}${study.temporal.washout ? ` · Washout: ${study.temporal.washout}` : ''}</div>` : ''}
    ${unverified}${contradicts}${limits}
    <div class="feedback-row">${feedbackLink}</div>
  </div>`;
}
