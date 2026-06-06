// MedCheck — Genotype panel and phenotype selector
// Phase A: modular source — concatenated by build.js

const GENOTYPE_METABOLITE_RISK_KEYS = {
  G6PD: "G6PD deficiency",
};

function renderGenotypePanel() {
  const sec = document.getElementById("genotypeSection");
  const el = document.getElementById("genotypeBody");
  if (!el) return;
  if (activeStack.length < 1) { if (sec) sec.style.display = "none"; return; }
  if (sec) sec.style.display = "";

  // Determine which enzymes are relevant for current stack
  const relevantEnzymes = new Set();
  const relevantRiskAlleles = new Set();
  for (const name of activeStack) {
    const drug = DRUG_DB.find(d => d.name === name);
    if (!drug) continue;
    for (const r of (drug.routes || [])) relevantEnzymes.add(r.enzyme);
    for (const i of (drug.inh || [])) relevantEnzymes.add(i.target);
    for (const i of (drug.ind || [])) relevantEnzymes.add(i.target);
    for (const i of (drug.metInh || [])) relevantEnzymes.add(i.target);
    const diversion = PATHWAY_DIVERSION[name];
    if (diversion?.primary?.enzyme) relevantEnzymes.add(diversion.primary.enzyme);
    for (const d of (diversion?.diverted || [])) {
      if (d.enzyme) relevantEnzymes.add(d.enzyme);
    }
    const genotypeMetaboliteEffects = typeof GENOTYPE_METABOLITE_EFFECTS !== 'undefined' ? GENOTYPE_METABOLITE_EFFECTS : [];
    for (const effect of genotypeMetaboliteEffects) {
      if (effect.parent === name && effect.enzyme) relevantEnzymes.add(effect.enzyme);
    }
    const genotypeRiskEffects = typeof GENOTYPE_RISK_EFFECTS !== 'undefined' ? GENOTYPE_RISK_EFFECTS : {};
    for (const [riskKey, risk] of Object.entries(genotypeRiskEffects)) {
      if ((risk.drugEffects || []).some(effect => effect.parent === name)) relevantRiskAlleles.add(riskKey);
    }
  }
  const showEnzymes = Object.keys(GENOTYPE_EFFECTS).filter(e => relevantEnzymes.has(e));
  const showRiskAlleles = Object.keys(typeof GENOTYPE_RISK_EFFECTS !== 'undefined' ? GENOTYPE_RISK_EFFECTS : {}).filter(e => relevantRiskAlleles.has(e));
  const importHtml = renderPharmGxImportCard();
  if (showEnzymes.length === 0 && showRiskAlleles.length === 0) {
    el.innerHTML = importHtml + '<div style="color:var(--text2);font-size:12px;padding:8px">No genotype-modeled pathways in current stack.</div>';
    return;
  }

  // Selector rows
  let html = importHtml + '<div style="margin-bottom:12px">';
  html += '<p style="font-size:12px;color:var(--text2);margin:0 0 8px">Set your genotype result to see how it changes predicted exposure or safety risk:</p>';
  for (const enz of showEnzymes) {
    const cur = activeGenotype[enz] || GENOTYPE_PHENOTYPE.NM;
    html += `<div class="geno-selector" style="margin-bottom:6px">
      <span class="geno-enz-label">${enz}</span>`;
    const phenotypeButtons = [
      GENOTYPE_PHENOTYPE.PM, GENOTYPE_PHENOTYPE.IM,
      GENOTYPE_PHENOTYPE.NM, GENOTYPE_PHENOTYPE.UM
    ].filter(k => GENOTYPE_EFFECTS[enz]?.[k]);
    for (const k of phenotypeButtons) {
      const label = genotypeDisplayLabel(enz, k);
      const freq = GENOTYPE_EFFECTS[enz]?.[k]?.freq_pct || '?';
      const semanticTitle = genotypeOptionTitle(enz, k);
      html += `<button class="geno-btn ${cur===k?'active':''}"
        onclick="setGenotype('${enz}','${k}')"
        title="${semanticTitle}; frequency: ~${freq}% of population">${label} <span style="font-weight:400;font-size:9px">${freq}%</span></button>`;
    }
    html += '</div>';
  }
  for (const riskKey of showRiskAlleles) {
    const risk = GENOTYPE_RISK_EFFECTS[riskKey];
    const cur = activeGenotype[riskKey] || GENOTYPE_RISK_STATUS.ABSENT;
    const buttons = [
      [GENOTYPE_RISK_STATUS.ABSENT, 'Absent'],
      [GENOTYPE_RISK_STATUS.PRESENT, 'Present'],
    ];
    html += `<div class="geno-selector" style="margin-bottom:6px">
      <span class="geno-enz-label">${risk.label}</span>`;
    for (const [status, label] of buttons) {
      const effect = risk.effects?.[status];
      html += `<button class="geno-btn ${cur===status?'active':''}"
        onclick="setGenotype('${riskKey}','${status}')"
        title="${effect?.note || ''}">${label}</button>`;
    }
    html += '</div>';
  }
  html += '</div>';

  // Effect cards for current stack
  for (const drugName of activeStack) {
    const drug = DRUG_DB.find(d => d.name === drugName);
    if (!drug) continue;
    for (const r of (drug.routes || [])) {
      const enz = r.enzyme;
      if (!GENOTYPE_EFFECTS[enz]) continue;
      const geno = activeGenotype[enz] || GENOTYPE_PHENOTYPE.NM;
      const eff = GENOTYPE_EFFECTS[enz][geno];
      if (!eff) continue;
      const fold = eff.auc_fold;
      const foldStr = fold === 1.0 ? '1× (baseline)' : fold > 1 ? `${fold.toFixed(1)}× ↑ AUC` : `${fold.toFixed(1)}× ↓ AUC`;
      const foldColor = fold > 2 ? 'var(--red)' : fold > 1.3 ? 'var(--amber)' : fold < 0.5 ? 'var(--amber)' : 'var(--green)';
      html += `<div class="geno-effect-card">
        <div class="geno-effect-title">${drugName} <span style="color:var(--text2);font-size:11px;font-weight:400">via ${enz}</span>
          <span style="float:right;font-size:18px;font-weight:800;color:${foldColor}">${foldStr}</span>
        </div>
        ${renderGenotypeInterpretationLine(enz, geno)}
        <div class="geno-effect-note">${eff.note}</div>
        ${fold !== 1.0 ? `<div style="font-size:10px;color:var(--text2);margin-top:4px">Population frequency: ~${eff.freq_pct}% | Vs NM baseline fold-change: ${fold.toFixed(1)}×</div>` : ''}
      </div>`;
    }
    for (const card of getGenotypeMetaboliteEffectCards(drugName)) {
      html += renderGenotypeMetaboliteEffectCard(card);
    }
    for (const card of getGenotypeRiskEffectCards(drugName)) {
      html += renderGenotypeRiskEffectCard(card);
    }
  }
  el.innerHTML = html;
}

function getHighestGenotypePrioritySignal() {
  if (!activeStack.length) return null;
  const signals = [];
  for (const drugName of activeStack) {
    const drug = getDrug(drugName);
    if (!drug) continue;

    for (const route of (drug.routes || [])) {
      const enzyme = route.enzyme;
      if (!GENOTYPE_EFFECTS[enzyme]) continue;
      const phenotype = activeGenotype[enzyme] || GENOTYPE_PHENOTYPE.NM;
      const effect = GENOTYPE_EFFECTS[enzyme]?.[phenotype];
      if (!effect || phenotype === GENOTYPE_PHENOTYPE.NM || effect.auc_fold === 1) continue;
      const score = scoreGenotypeExposureSignal(effect.auc_fold, effect.note, drug);
      if (score < 30) continue;
      signals.push({
        kind:"exposure",
        score,
        label:score >= 70 ? "PGx High" : "PGx Watch",
        headline:`${enzyme} genotype may change ${drugName} exposure`,
        summary:`${drugName} is in your list and ${enzyme} is set to ${phenotypeLabelForGene(enzyme, phenotype)}. ${effect.note}`,
        why:`${drugName} depends on ${enzyme}, and the selected ${enzyme} phenotype is not the reference state.`,
        changes:`Expected parent-drug exposure shifts to about ${effect.auc_fold}x the normal-metabolizer baseline.`,
        review:score >= 70
          ? "Review dose sensitivity, toxicity signs, inhibitors/inducers, and whether therapeutic monitoring or an alternative is preferred."
          : "Review whether the exposure shift changes monitoring, dose, or follow-up.",
        nextStep:score >= 70
          ? "Review the pharmacogenomics finding before changing dose or adding inhibitors."
          : "Review the pharmacogenomics panel and monitor dose-sensitive effects.",
        evidenceRefs:[...(drug.evidenceRefs || [])],
      });
    }

    for (const card of getGenotypeMetaboliteEffectCards(drugName)) {
      const { effect, phenotypeEffect, geno } = card;
      const score = scoreGenotypeMetaboliteSignal(effect, phenotypeEffect);
      if (score < 30) continue;
      const direction = phenotypeEffect.direction === "decrease" ? "reduce" : "increase";
      signals.push({
        kind:"metabolite",
        score,
        label:score >= 70 ? "PGx High" : "PGx Watch",
        headline:`${effect.enzyme} genotype may ${direction} ${effect.metaboliteName}`,
        summary:`${effect.parent} is in your list and ${effect.enzyme} is set to ${phenotypeLabelForGene(effect.enzyme, geno)}. ${phenotypeEffect.label || effect.note}`,
        why:`${effect.parent} has a genotype-sensitive metabolite pathway through ${effect.enzyme}.`,
        changes:phenotypeEffect.fold
          ? `${effect.metaboliteName} is expected to shift to about ${phenotypeEffect.fold}x the normal-metabolizer reference.`
          : `${effect.metaboliteName} is expected to ${direction}; the direction is modeled but the fold is not calibrated.`,
        review:effect.clinicalAction || (score >= 70
          ? "Review whether standard medication assumptions still apply before relying on efficacy or safety."
          : "Review metabolite-level context and relevant monitoring."),
        nextStep:score >= 70
          ? "Review the pharmacogenomics finding before relying on this medication effect."
          : "Review metabolite-level pharmacogenomics context.",
        evidenceRefs:[...(effect.evidenceRefs || [])],
      });
    }

    for (const card of getGenotypeRiskEffectCards(drugName)) {
      const { risk, status, riskEffect, drugEffect } = card;
      if (status !== GENOTYPE_RISK_STATUS.PRESENT) continue;
      const score = riskEffect.severity === "high" ? 90 : riskEffect.severity === "moderate" ? 60 : 35;
      signals.push({
        kind:"risk",
        score,
        label:score >= 70 ? "PGx High" : "PGx Watch",
        headline:`${risk.label} conflicts with ${drugEffect.parent}`,
        summary:`${drugEffect.parent} is in your list and ${risk.label} is selected as present. ${drugEffect.clinicalAction || drugEffect.note}`,
        why:`${risk.label} is a medication-specific risk marker for ${drugEffect.parent}.`,
        changes:drugEffect.note,
        review:drugEffect.clinicalAction || "Review whether this medication should be avoided or substituted.",
        nextStep:score >= 70
          ? "Review this genotype-medication safety warning before using this medication."
          : "Review this genotype-medication context with the rest of the profile.",
        evidenceRefs:[...(drugEffect.evidenceRefs || [])],
      });
    }
  }
  signals.sort((a,b) => b.score - a.score);
  return signals[0] || null;
}

function phenotypeLabel(phenotype) {
  if (phenotype === GENOTYPE_PHENOTYPE.PM) return "poor metabolizer";
  if (phenotype === GENOTYPE_PHENOTYPE.IM) return "intermediate metabolizer";
  if (phenotype === GENOTYPE_PHENOTYPE.UM) return "ultrarapid metabolizer";
  if (phenotype === GENOTYPE_RISK_STATUS.PRESENT) return "present";
  if (phenotype === GENOTYPE_RISK_STATUS.ABSENT) return "absent";
  return "normal metabolizer";
}

function phenotypeLabelForGene(gene, phenotype) {
  const semantics = getGeneSemantics(gene);
  if (semantics.phenotypeLabels?.[phenotype]) return semantics.phenotypeLabels[phenotype];
  if (semantics.axis === GENE_SEMANTIC_AXIS.EXPRESSION) {
    if (phenotype === GENOTYPE_PHENOTYPE.PM) return "non-expresser";
    if (phenotype === GENOTYPE_PHENOTYPE.IM) return "intermediate expresser";
    if (phenotype === GENOTYPE_PHENOTYPE.UM) return "high expresser";
    return "reference expression";
  }
  if (semantics.axis === GENE_SEMANTIC_AXIS.COPY_NUMBER_NULL) {
    if (phenotype === GENOTYPE_PHENOTYPE.PM) return `${gene} null`;
    if (phenotype === GENOTYPE_PHENOTYPE.IM) return `reduced ${gene} detox context`;
    return `${gene} present`;
  }
  if (semantics.axis === GENE_SEMANTIC_AXIS.DEFICIENCY) {
    if (phenotype === GENOTYPE_PHENOTYPE.PM) return "deficient / very low activity";
    if (phenotype === GENOTYPE_PHENOTYPE.IM) return "partial activity";
    return "normal activity";
  }
  if (semantics.axis === GENE_SEMANTIC_AXIS.SENSITIVITY) {
    if (phenotype === GENOTYPE_PHENOTYPE.PM) return "increased sensitivity";
    if (phenotype === GENOTYPE_PHENOTYPE.UM) return "relative resistance";
    return phenotypeLabel(phenotype).replace("metabolizer", "context");
  }
  if (semantics.axis === GENE_SEMANTIC_AXIS.RESPONSE) {
    if (phenotype === GENOTYPE_PHENOTYPE.PM) return "reduced/unfavorable response context";
    if (phenotype === GENOTYPE_PHENOTYPE.IM) return "intermediate response context";
    if (phenotype === GENOTYPE_PHENOTYPE.UM) return "higher/alternate response context";
    return "reference response context";
  }
  if (semantics.axis === GENE_SEMANTIC_AXIS.TRANSPORT) {
    if (phenotype === GENOTYPE_PHENOTYPE.PM) return "low transporter function";
    if (phenotype === GENOTYPE_PHENOTYPE.IM) return "reduced transporter function";
    if (phenotype === GENOTYPE_PHENOTYPE.UM) return "increased transporter function";
    return "normal transporter function";
  }
  return phenotypeLabel(phenotype);
}

function genotypeOptionTitle(gene, phenotype) {
  const interpretation = buildGeneInterpretation(gene, phenotype, { reportedLabel:genotypeDisplayLabel(gene, phenotype), source:"manual_selector" });
  return `${interpretation.functionalState}; model use: ${interpretation.modelUse}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderGenotypeInterpretationLine(gene, phenotype) {
  const detail = activeGenotypeDetails?.[gene] || buildGeneInterpretation(gene, phenotype);
  const reported = escapeHtml(detail.reportedLabel || genotypeDisplayLabel(gene, phenotype));
  const interpreted = escapeHtml(detail.functionalState || phenotypeLabelForGene(gene, phenotype));
  const modelUse = escapeHtml(detail.modelUse || "");
  const scope = escapeHtml((detail.compartments || []).join(", "));
  const nullLike = ["inherited_no_function","copy_number_null","inherited_deficiency","erythrocyte_deficiency"].includes(detail.mechanism);
  const phenoconversion = nullLike
    ? '<span style="color:var(--text2)">Inherited null/deficiency context; inhibitors should not be double-counted as if they removed enzyme again.</span>'
    : detail.phenoconversion
      ? '<span style="color:var(--text2)">Inherited baseline; medication inhibitors can phenoconvert remaining activity, mostly as systemic/liver pathway context.</span>'
      : '<span style="color:var(--text2)">Not modeled as reversible liver-only phenoconversion.</span>';
  return `<div style="font-size:10px;color:var(--text2);margin:2px 0 5px">
    Reported: <b>${reported}</b> · Interpreted as: <b>${interpreted}</b>${modelUse ? ` · Model use: ${modelUse}` : ""}${scope ? ` · Scope: ${scope}` : ""}<br>${phenoconversion}
  </div>`;
}

function scoreGenotypeExposureSignal(fold, note, drug) {
  const text = `${note || ""} ${drug?.note || ""}`.toLowerCase();
  let score = 0;
  if (fold >= 5 || fold <= 0.3) score = 75;
  else if (fold >= 3 || fold <= 0.5) score = 65;
  else if (fold >= 2 || fold <= 0.7) score = 50;
  else if (fold >= 1.4 || fold <= 0.8) score = 35;
  if (/contraindicat|avoid|life-threatening|fatal|severe|toxicity|bleeding|arrhythmia|respiratory depression|myelosuppression/.test(text)) score += 15;
  if (drug?.props?.nti || drug?.props?.qtcRisk >= 2 || drug?.props?.myelosuppressionRisk >= 2) score += 10;
  return Math.min(95, score);
}

function scoreGenotypeMetaboliteSignal(effect, phenotypeEffect) {
  const fold = phenotypeEffect.fold || null;
  const text = `${effect.note || ""} ${effect.clinicalAction || ""} ${phenotypeEffect.label || ""}`.toLowerCase();
  let score = 35;
  if (fold) {
    if (fold >= 5 || fold <= 0.3) score = 75;
    else if (fold >= 3 || fold <= 0.5) score = 65;
    else if (fold >= 2 || fold <= 0.7) score = 50;
  }
  if (/contraindicat|avoid|life-threatening|fatal|severe|toxicity|failure risk|analgesia failure|stent thrombosis|myelosuppression|respiratory depression|drastically reduced|weekly cbc|close cbc/.test(text)) score += 20;
  if (/cpic/.test(text) && /avoid|drastically reduced|myelosuppression/.test(text)) score = Math.max(score, 75);
  if (/prodrug|active metabolite|key active|opioid-active/.test(text) && phenotypeEffect.direction === "decrease") score += 10;
  return Math.min(95, score);
}

function normalizeEvidenceToken(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function addEvidenceTokens(tokens, value) {
  const normalized = normalizeEvidenceToken(value);
  if (!normalized) return;
  tokens.add(normalized);
  for (const part of normalized.split(/\s+/)) {
    if (part.length >= 4 && !part.startsWith('cyp')) tokens.add(part);
  }
}

function getStackEvidenceContext() {
  const tokens = new Set();
  const evidenceRefs = new Set();
  const graph = getInteractionGraph();

  for (const drugName of activeStack) {
    const drug = getDrug(drugName);
    const parentId = getDrugGraphId(drugName);
    addEvidenceTokens(tokens, drugName);
    addEvidenceTokens(tokens, parentId);
    for (const brand of (drug?.brandNames || [])) addEvidenceTokens(tokens, brand);
    for (const ref of (drug?.evidenceRefs || [])) evidenceRefs.add(ref);

    for (const met of (METAB[drugName] || [])) {
      const metId = getMetaboliteGraphId(met.n);
      addEvidenceTokens(tokens, met.n);
      addEvidenceTokens(tokens, metId);
      for (const ref of (met.evidenceRefs || [])) evidenceRefs.add(ref);
    }

    for (const edge of graph.edges.filter(e => e.from === parentId)) {
      const target = graph.actors[edge.to];
      if (target?.type === ACTOR_TYPE.METABOLITE) {
        addEvidenceTokens(tokens, target.id);
        addEvidenceTokens(tokens, target.name);
        for (const ref of (target.evidenceRefs || [])) evidenceRefs.add(ref);
        for (const ref of (edge.props?.evidenceRefs || [])) evidenceRefs.add(ref);
      }
    }
  }

  return { tokens:[...tokens], evidenceRefs };
}

function studyMatchesStackContext(study, context) {
  if (context.evidenceRefs.has(study.id)) return true;
  const searchText = normalizeEvidenceToken([
    study.id,
    study.title,
    study.source,
    study.journal,
    study.studyDesign,
    (study.supports || []).join(' '),
    (study.quantifiedEffects && JSON.stringify(study.quantifiedEffects)) || ''
  ].join(' '));
  return context.tokens.some(token => searchText.includes(token));
}

function getStackRelevantGenotypeStudies() {
  const selectedPhenotypes = Object.values(activeGenotype);
  const context = getStackEvidenceContext();
  return Object.values(STUDY_DB)
    .filter(s =>
      s.public !== false &&
      s.reviewRequired !== true &&   // quarantine: keep unreviewed drafts out of genotype evidence
      (s.phenotypes || []).some(p => selectedPhenotypes.includes(p)) &&
      studyMatchesStackContext(s, context)
    )
    .sort((a,b) => {
      const aDirect = context.evidenceRefs.has(a.id) ? 1 : 0;
      const bDirect = context.evidenceRefs.has(b.id) ? 1 : 0;
      if (aDirect !== bDirect) return bDirect - aDirect;
      return (EVIDENCE_WEIGHT[b.type]||0) - (EVIDENCE_WEIGHT[a.type]||0);
    });
}

function getGenotypeMetaboliteEffectCards(drugName) {
  if (typeof GENOTYPE_METABOLITE_EFFECTS === 'undefined') return [];
  return GENOTYPE_METABOLITE_EFFECTS
    .filter(effect => effect.parent === drugName && showGenotypeMetaboliteEffect(effect))
    .map(effect => {
      const geno = getSelectedGenotypePhenotype(effect.enzyme);
      let phenotypeEffect = effect.effects?.[geno];
      const inhibitorContext = getActiveEnzymeInhibitionContext(effect.enzyme, drugName);
      if ((!phenotypeEffect || phenotypeEffect.direction === "baseline") && inhibitorContext.length) {
        phenotypeEffect = getInhibitionMetaboliteEffect(effect, inhibitorContext);
      }
      if (phenotypeEffect && phenotypeEffect.direction !== "baseline" && !phenotypeEffect.fold && !phenotypeEffect.qualitative) {
        const estimatedFold = estimateMetaboliteEffectFold(effect, phenotypeEffect, inhibitorContext, geno);
        if (estimatedFold) phenotypeEffect = { ...phenotypeEffect, fold:estimatedFold, estimated:true };
      }
      if (!phenotypeEffect) return null;
      return { effect, geno, phenotypeEffect };
    })
    .filter(Boolean);
}

function getGenotypeRiskEffectCards(drugName) {
  if (typeof GENOTYPE_RISK_EFFECTS === 'undefined') return [];
  return Object.entries(GENOTYPE_RISK_EFFECTS)
    .map(([riskKey, risk]) => {
      const status = activeGenotype[riskKey] || GENOTYPE_RISK_STATUS.ABSENT;
      const riskEffect = risk.effects?.[status];
      const drugEffect = (risk.drugEffects || []).find(effect => effect.parent === drugName);
      if (!drugEffect || !riskEffect) return null;
      return { riskKey, risk, status, riskEffect, drugEffect };
    })
    .filter(Boolean);
}

function renderGenotypeRiskEffectCard(card) {
  const { risk, status, riskEffect, drugEffect } = card;
  const isPresent = status === GENOTYPE_RISK_STATUS.PRESENT;
  const label = isPresent ? 'risk allele present' : 'risk allele absent';
  const foldColor = isPresent ? 'var(--red)' : 'var(--green)';
  const refs = (drugEffect.evidenceRefs || []).filter(ref => STUDY_DB[ref]);
  const evidenceText = refs.length
    ? refs.map(ref => {
      const study = STUDY_DB[ref];
      return study.pmid ? `PMID:${study.pmid}` : (study.doi ? `DOI:${study.doi}` : ref);
    }).join(' · ')
    : 'Evidence pending';
  return `<div class="geno-effect-card">
    <div class="geno-effect-title">${drugEffect.parent} <span style="color:var(--text2);font-size:11px;font-weight:400">with ${risk.label}</span>
      <span style="float:right;font-size:18px;font-weight:800;color:${foldColor}">${label}</span>
    </div>
    <div class="geno-effect-note">${isPresent ? drugEffect.note : riskEffect.note}</div>
    <div style="font-size:10px;color:var(--text2);margin-top:4px">${drugEffect.phenotype}: ${isPresent ? drugEffect.clinicalAction : riskEffect.label} · ${evidenceText}</div>
  </div>`;
}

function getSelectedGenotypePhenotype(enzyme) {
  const riskKey = GENOTYPE_METABOLITE_RISK_KEYS[enzyme];
  if (riskKey && activeGenotype[enzyme]) return activeGenotype[enzyme];
  if (riskKey) {
    return activeGenotype[riskKey] === GENOTYPE_RISK_STATUS.PRESENT
      ? GENOTYPE_PHENOTYPE.PM
      : GENOTYPE_PHENOTYPE.NM;
  }
  return activeGenotype[enzyme] || GENOTYPE_PHENOTYPE.NM;
}

function getSelectedEnzymeExposureMult(enzyme, geno, inhibitorContext = []) {
  const genotypeMult = getSelectedGenotypeExposureMult(enzyme, geno);
  const inhibitorMult = getSelectedInhibitorExposureMult(inhibitorContext);
  return Math.max(genotypeMult, inhibitorMult);
}

function getSelectedGenotypeExposureMult(enzyme, geno) {
  if (typeof userGenetics !== 'undefined' && userGenetics[enzyme] === "null") {
    return typeof getNullExposureMultiplier === "function" ? getNullExposureMultiplier(enzyme) : 20;
  }
  return GENOTYPE_EFFECTS[enzyme]?.[geno]?.auc_fold || 1;
}

function getSelectedInhibitorExposureMult(inhibitorContext = []) {
  return inhibitorContext.reduce((max, inh) => {
    let mult = (INH_MULT[inh.strength] || 1) * (inh.doseMod || 1);
    if (inh.mechanism === "mechanism_based" || inh.mechanism === "time-dependent") mult *= 1.3;
    return Math.max(max, mult);
  }, 1);
}

function estimateFormationFold(enzyme, geno, inhibitorContext = []) {
  const genotypeMult = getSelectedGenotypeExposureMult(enzyme, geno);
  const inhibitorMult = getSelectedInhibitorExposureMult(inhibitorContext);
  const genotypeFormationFold = genotypeMult ? 1 / genotypeMult : 1;
  if (inhibitorMult > 1) return Math.min(genotypeFormationFold, 1 / inhibitorMult);
  return genotypeFormationFold;
}

function estimateMetaboliteEffectFold(effect, phenotypeEffect, inhibitorContext, geno) {
  const actor = typeof METABOLITE_ACTORS !== 'undefined' ? METABOLITE_ACTORS[effect.metaboliteId] : null;
  const formedByTarget = actor?.formingEnzyme === effect.enzyme;
  const route = actor?.routes?.find(r => r.enzyme === effect.enzyme);
  const enzymeMult = getSelectedEnzymeExposureMult(effect.enzyme, geno, inhibitorContext);

  if (phenotypeEffect.direction === "decrease") {
    if (formedByTarget) {
      const formationFold = estimateFormationFold(effect.enzyme, geno, inhibitorContext);
      if (!formationFold || formationFold === 1) return null;
      return Math.round(Math.max(0.05, formationFold) * 100) / 100;
    }
    if (!enzymeMult || enzymeMult === 1) return null;
    return Math.round(Math.max(0.05, 1 / enzymeMult) * 100) / 100;
  }

  if (phenotypeEffect.direction !== "increase") return null;
  if (formedByTarget) {
    const formationFold = estimateFormationFold(effect.enzyme, geno, inhibitorContext);
    if (!formationFold || formationFold === 1) return null;
    return Math.round(Math.max(0.05, formationFold) * 100) / 100;
  }
  if (!enzymeMult || enzymeMult === 1 || !route) return null;
  const remaining = Math.max(0, 1 - route.fraction);
  const fold = remaining + route.fraction * enzymeMult;
  return Math.round(fold * 100) / 100;
}

function getActiveEnzymeInhibitionContext(enzyme, subjectDrugName) {
  if (!enzyme || typeof activeStack === 'undefined') return [];
  const inhibitors = [];
  for (const name of activeStack) {
    const drug = getDrug(name);
    if (!drug) continue;
    const allInh = typeof getAllInhibitions === 'function'
      ? getAllInhibitions(drug)
      : (drug.inh || []);
    for (const inh of allInh) {
      if (inh.target !== enzyme) continue;
      const doseMod = inh.doseDependent ? getDoseModifier(name) : 1.0;
      inhibitors.push({
        name,
        isSelf: name === subjectDrugName,
        strength: inh.strength || "inhibitor",
        mechanism: inh.mechanism || (inh.timeDependent ? "time-dependent" : ""),
        doseDependent: !!inh.doseDependent,
        doseMod,
      });
      break;
    }
  }
  return inhibitors;
}

function getInhibitionMetaboliteEffect(effect, inhibitorContext) {
  const hasSelfOnly = inhibitorContext.every(i => i.isSelf);
  const names = inhibitorContext.map(i => i.isSelf ? `${i.name} itself` : i.name).join(", ");
  const hasStrong = inhibitorContext.some(i => i.strength === "strong");
  const direction = effect.inhibitionDirection || (effect.effects?.[GENOTYPE_PHENOTYPE.PM]?.direction);
  if (!direction || direction === "baseline") return null;
  const label = effect.inhibitionLabel ||
    (direction === "increase"
      ? `${hasSelfOnly ? "self-inhibition" : `${names} inhibition`} context: higher metabolite exposure expected; fold not calibrated`
      : `${hasSelfOnly ? "self-inhibition" : `${names} inhibition`} context: lower active metabolite formation expected; fold not calibrated`);
  return {
    direction,
    label,
    fold:effect.inhibitionFold,
    inhibitorContext:names,
    strength:hasStrong ? "strong" : inhibitorContext[0]?.strength,
  };
}

function showGenotypeMetaboliteEffect(effect) {
  if (!effect || !effect.enzyme) return false;
  if (!GENOTYPE_EFFECTS[effect.enzyme] && !GENOTYPE_METABOLITE_RISK_KEYS[effect.enzyme]) return false;
  if (effect.systemic) return true;
  const metId = effect.metaboliteId;
  const listed = (METAB[effect.parent] || []).some(m => getMetaboliteGraphId(m.n) === metId);
  if (listed) return true;
  const graph = getInteractionGraph();
  const parentId = getDrugGraphId(effect.parent);
  return graph.edges.some(e => e.from === parentId && e.to === metId);
}

function renderGenotypeMetaboliteEffectCard(card) {
  const { effect, phenotypeEffect } = card;
  const fold = phenotypeEffect.fold || null;
  const isIncrease = phenotypeEffect.direction === "increase";
  const isDecrease = phenotypeEffect.direction === "decrease";
  const foldStr = fold
    ? (fold === 1.0 ? "1x (baseline)" : fold > 1 ? `${fold.toFixed(1)}x ↑ level` : `${fold.toFixed(2)}x ↓ level`)
    : phenotypeEffect.label;
  const foldColor = isIncrease && fold && fold >= 10 ? 'var(--red)' :
    isIncrease ? 'var(--amber)' :
    isDecrease ? 'var(--green)' :
    'var(--text2)';
  const refs = (effect.evidenceRefs || []).filter(ref => STUDY_DB[ref]);
  const evidenceText = refs.length
    ? refs.map(ref => {
      const study = STUDY_DB[ref];
      return study.pmid ? `PMID:${study.pmid}` : (study.doi ? `DOI:${study.doi}` : ref);
    }).join(' · ')
    : 'Evidence pending';
  const signal = typeof getExposureSignalLabel === 'function' ? getExposureSignalLabel(effect, phenotypeEffect) : 'metabolite level';
  const action = effect.clinicalAction || (typeof clinicalActionForMetaboliteEffect === 'function' ? clinicalActionForMetaboliteEffect(effect, phenotypeEffect) : '');
  return `<div class="geno-effect-card">
    <div class="geno-effect-title">${effect.metaboliteName} <span style="color:var(--text2);font-size:11px;font-weight:400">from ${effect.parent} via ${effect.enzyme}</span>
      <span style="float:right;font-size:18px;font-weight:800;color:${foldColor}">${foldStr}</span>
    </div>
    ${renderGenotypeInterpretationLine(effect.enzyme, card.geno)}
    <div class="geno-effect-note">${effect.note}</div>
    <div style="font-size:10px;color:var(--text2);margin-top:4px">${signal}: ${phenotypeEffect.label}${action ? ` · ${action}` : ""} · ${evidenceText}</div>
  </div>`;
}

function setGenotype(enzyme, phenotype) {
  if (GENOTYPE_EFFECTS[enzyme]) setGenotypeState(enzyme, phenotype, { reportedLabel:genotypeDisplayLabel(enzyme, phenotype), source:"manual_selector" });
  else {
    activeGenotype[enzyme] = phenotype;
    if (typeof activeGenotypeDetails !== "undefined") activeGenotypeDetails[enzyme] = buildRiskInterpretation(enzyme, phenotype, { source:"manual_selector" });
  }
  renderAll();
}

function renderPharmGxImportCard() {
  const id = "pharmgxImportText";
  return `<div class="geno-import-card">
    <div class="geno-import-title">DNA / PharmGx report import <span>local preview</span></div>
    <div class="geno-import-note">Paste gene phenotype rows from a ClawBio-style PharmGx report, or simple JSON/CSV with gene and phenotype/status fields. Nothing is uploaded.</div>
    <textarea id="${id}" class="geno-import-text" placeholder="CYP2C19 | *1/*2 | Intermediate Metabolizer&#10;CYP2D6 | *4/*4 | Poor Metabolizer&#10;HLA-B*57:01 | detected"></textarea>
    <div class="geno-import-actions">
      <button onclick="applyPharmGxImport()">Apply genotypes</button>
      <span id="pharmgxImportStatus"></span>
    </div>
  </div>`;
}

function applyPharmGxImport() {
  const input = document.getElementById("pharmgxImportText");
  const result = parsePharmGxImportDetailed(input?.value || "");
  const parsed = result.rows;
  const applied = [];
  for (const row of parsed) {
    if (applyPharmGxRow(row)) applied.push(row.gene);
  }
  if (applied.length) renderAll();
  const status = document.getElementById("pharmgxImportStatus");
  if (status) {
    const skippedText = result.skipped.length ? ` · skipped ${result.skipped.length}` : "";
    status.textContent = applied.length
      ? `Applied ${applied.length}: ${applied.join(", ")}${skippedText}`
      : `No supported MedCheck genes found${skippedText}`;
    if (result.skipped.length) status.title = `Skipped: ${result.skipped.slice(0,8).join("; ")}`;
  }
}

function applyPharmGxRow(row) {
  if (!row?.gene) return false;
  if (GENOTYPE_EFFECTS[row.gene]) return setGenotypeState(row.gene, row.phenotype, row.interpretation || row);
  if (typeof GENOTYPE_RISK_EFFECTS !== 'undefined' && GENOTYPE_RISK_EFFECTS[row.gene] && row.status) {
    activeGenotype[row.gene] = row.status;
    if (typeof activeGenotypeDetails !== "undefined") activeGenotypeDetails[row.gene] = buildRiskInterpretation(row.gene, row.status, row.interpretation || row);
    return true;
  }
  return false;
}

function parsePharmGxImport(text) {
  return parsePharmGxImportDetailed(text).rows;
}

function parsePharmGxImportDetailed(text) {
  const raw = String(text || "").trim();
  if (!raw) return { rows:[], skipped:[] };
  const jsonRows = parsePharmGxJson(raw);
  if (jsonRows.rows.length || jsonRows.skipped.length) return jsonRows;
  const rows = [];
  const skipped = [];
  for (const line of raw.split(/\r?\n/)) {
    const parsed = parsePharmGxLine(line);
    if (parsed) rows.push(parsed);
    else if (line.trim() && !line.trim().startsWith("|---") && !/^gene\s*[,\t|]/i.test(line.trim())) skipped.push(line.trim());
  }
  return { rows, skipped };
}

function parsePharmGxJson(raw) {
  try {
    const data = JSON.parse(raw);
    const sourceRows = normalizePharmGxJsonRows(data);
    if (!sourceRows.length) return { rows:[], skipped:[] };
    const rows = [];
    const skipped = [];
    for (const row of sourceRows) {
      const parsed = parsePharmGxObjectRow(row);
      if (parsed) rows.push(parsed);
      else skipped.push(typeof row === "string" ? row : JSON.stringify(row));
    }
    return { rows, skipped };
  } catch (_) {
    return { rows:[], skipped:[] };
  }
}

function normalizePharmGxJsonRows(data) {
  if (Array.isArray(data)) return data;
  const nested = data?.gene_profiles || data?.geneProfiles || data?.genes || data?.results || data?.profile || data?.genotypes;
  if (Array.isArray(nested)) return nested;
  if (nested && typeof nested === "object") return Object.entries(nested).map(([gene, value]) => ({ gene, value }));
  if (data && typeof data === "object") {
    const objectKeys = ["gene", "Gene", "symbol", "variant", "allele", "marker", "name"];
    if (objectKeys.some(key => data[key])) return [data];
    return Object.entries(data).map(([gene, value]) => ({ gene, value }));
  }
  return [];
}

function parsePharmGxObjectRow(row) {
  const gene = [
    row.gene, row.Gene, row.symbol, row.variant, row.allele, row.marker, row.name
  ].map(normalizePharmGxGene).find(Boolean);
  if (!gene) return null;
  const value = row.phenotype || row.Phenotype || row.metabolizerStatus || row.status || row.result || row.value;
  const reportedLabel = pharmGxObjectReportedLabel(row, value);
  const phenotype = phenotypeTextToGenotype(value, gene);
  const status = riskTextToStatus(value, gene);
  if (GENOTYPE_EFFECTS[gene] && phenotype?.phenotype) {
    return { gene, phenotype:phenotype.phenotype, interpretation:{ ...phenotype, reportedLabel } };
  }
  if (typeof GENOTYPE_RISK_EFFECTS !== 'undefined' && GENOTYPE_RISK_EFFECTS[gene] && status) {
    return { gene, status, interpretation:buildRiskInterpretation(gene, status, { reportedLabel }) };
  }
  return null;
}

function pharmGxObjectReportedLabel(row, value) {
  const reported = [
    row.genotype,
    row.Genotype,
    row.diplotype,
    row.Diplotype,
    row.alleles,
    row.Alleles,
    value,
  ].map(v => String(v || "").trim()).filter(Boolean);
  return [...new Set(reported)].join(" / ") || String(value || "").trim();
}

function parsePharmGxLine(line) {
  const clean = line.trim();
  if (!clean || clean.startsWith("|---") || /^gene\s*[,\t|]/i.test(clean)) return null;
  const parts = clean
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/\s*\|\s*|,|\t/)
    .map(p => p.trim())
    .filter(Boolean);
  const gene = normalizePharmGxGene(parts.find(p => normalizePharmGxGene(p)));
  if (!gene) return null;
  const phenotypeText = parts.slice().reverse().find(p => phenotypeTextToGenotype(p, gene));
  const phenotype = phenotypeTextToGenotype(phenotypeText || clean, gene);
  const statusText = parts.slice().reverse().find(p => riskTextToStatus(p, gene));
  const status = riskTextToStatus(statusText || clean, gene);
  const reportedLabel = pharmGxLineReportedLabel(parts, gene, phenotypeText || statusText || clean);
  if (GENOTYPE_EFFECTS[gene] && phenotype?.phenotype) {
    return { gene, phenotype:phenotype.phenotype, interpretation:{ ...phenotype, reportedLabel } };
  }
  if (typeof GENOTYPE_RISK_EFFECTS !== 'undefined' && GENOTYPE_RISK_EFFECTS[gene] && status) {
    return { gene, status, interpretation:buildRiskInterpretation(gene, status, { reportedLabel }) };
  }
  return null;
}

function pharmGxLineReportedLabel(parts, gene, fallback) {
  const reported = parts.filter(part => normalizePharmGxGene(part) !== gene);
  return reported.length ? reported.join(" / ") : String(fallback || "").trim();
}

function normalizePharmGxGene(value) {
  const gene = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  if (GENOTYPE_EFFECTS[gene]) return gene;
  const genotypeAliases = {
    IL28B: "IFNL3",
    MUOPIOIDRECEPTOR: "OPRM1",
    MOR: "OPRM1",
    OCT1: "SLC22A1",
    OCT2: "SLC22A2",
    MATE1: "SLC47A1",
  };
  if (genotypeAliases[gene] && GENOTYPE_EFFECTS[genotypeAliases[gene]]) return genotypeAliases[gene];
  if (typeof GENOTYPE_RISK_EFFECTS === 'undefined') return null;
  const riskAliases = {
    MTHFR: "MTHFR C677T",
    GABRG2: "GABRG2 variant",
    G6PD: "G6PD deficiency",
    MTRNR1: "MT-RNR1 m.1555A>G",
    "MT-RNR1": "MT-RNR1 m.1555A>G",
    RYR1: "RYR1/CACNA1S MH variant",
    CACNA1S: "RYR1/CACNA1S MH variant",
    SCN1A: "SCN1A sodium-channel variant",
    SCN2A: "SCN2A sodium-channel variant",
    KCNH2: "KCNH2 long-QT variant",
    HERG: "KCNH2 long-QT variant",
  };
  if (riskAliases[gene] && GENOTYPE_RISK_EFFECTS[riskAliases[gene]]) return riskAliases[gene];
  const exactRiskKey = Object.keys(GENOTYPE_RISK_EFFECTS).find(key =>
    key.toUpperCase().replace(/\s+/g, "") === gene
  );
  if (exactRiskKey) return exactRiskKey;
  const geneMatches = Object.keys(GENOTYPE_RISK_EFFECTS).filter(key =>
    (GENOTYPE_RISK_EFFECTS[key].gene || "").toUpperCase().replace(/\s+/g, "") === gene
  );
  return geneMatches.length === 1 ? geneMatches[0] : null;
}

function phenotypeTextToGenotype(value, gene = null) {
  return typeof normalizeGenePhenotypeInput === "function"
    ? normalizeGenePhenotypeInput(gene, value)
    : null;
}

function riskTextToStatus(value, gene = null) {
  const text = String(value || "").toLowerCase();
  if (!text) return null;
  const normalized = text.replace(/[_-]+/g, " ");
  const riskKey = gene && typeof GENOTYPE_RISK_EFFECTS !== "undefined" ? GENOTYPE_RISK_EFFECTS[gene] : null;
  if (riskKey && /deficient|deficiency/.test(normalized)) return GENOTYPE_RISK_STATUS.PRESENT;
  if (/absent|negative|not detected|not present|normal|no variant|wild ?type|hom cc|hom ref/.test(normalized)) return GENOTYPE_RISK_STATUS.ABSENT;
  if (/present|positive|detected|carrier|risk allele|deficient|variant found|pathogenic|null|hom tt|hom alt|hetero|contraindicated/.test(normalized)) return GENOTYPE_RISK_STATUS.PRESENT;
  return null;
}

// ── renderPhenotypeAccumulation (#6) ────────────────────────────────
