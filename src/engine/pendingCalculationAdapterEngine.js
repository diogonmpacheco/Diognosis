// MedCheck Engine - pending source calculation adapters
// Converts matched pending core candidates into calculation-visible, non-curated signals.

const PENDING_CALCULATION_CONTEXT_SCHEMA = "diognosis.pending-calculation-context.v1";
const PENDING_CALCULATION_SCORE_CAP = 15;
const PENDING_CALCULATION_FINDING_LIMIT = 36;

let _pendingCalculationCache = null;

function getPendingCalculationContext(stack = [], genotypeState = {}, options = {}) {
  const activeNames = Array.isArray(stack) ? stack : [];
  const safeGenotype = genotypeState || {};
  const cacheKey = pendingCalculationCacheKey(activeNames, safeGenotype, options);
  if (!options.pendingCoreContext && _pendingCalculationCache?.key === cacheKey) {
    return _pendingCalculationCache.context;
  }

  const pendingCoreContext = options.pendingCoreContext || (
    typeof buildPendingCoreEnrichmentContext === "function"
      ? buildPendingCoreEnrichmentContext(activeNames, safeGenotype, { limit:options.limit || 60 })
      : null
  );
  const matchedCandidates = pendingCoreContext?.matchedCandidates || [];
  const evidenceRows = adaptPendingEvidenceCandidates(matchedCandidates);
  const evidenceIndex = buildPendingEvidenceIndex(evidenceRows);
  const pgxSignals = adaptPendingPgxCandidates(matchedCandidates, evidenceIndex, activeNames, safeGenotype);
  const pkSignals = adaptPendingPkCandidates(matchedCandidates, evidenceIndex, activeNames);
  const ddiSignals = adaptPendingDdiCandidates(matchedCandidates, evidenceIndex, activeNames);
  const score = scorePendingCalculationSignals({ evidenceRows, pgxSignals, pkSignals, ddiSignals });

  const context = {
    schema:PENDING_CALCULATION_CONTEXT_SCHEMA,
    pendingCoreContext,
    evidenceRows,
    evidenceById:Object.fromEntries(evidenceRows.map(row => [row.id, row])),
    pgxSignals,
    pkSignals,
    ddiSignals,
    score,
    pendingSignalScore:score.score,
    factors:score.factors,
    counts:{
      evidenceRows:evidenceRows.length,
      pgxSignals:pgxSignals.length,
      pkSignals:pkSignals.length,
      ddiSignals:ddiSignals.length,
    },
    experimentalOnly:true,
    professionalReviewStatus:"pending",
    canAffectScoring:true,
    canAffectPublicSeverity:false,
    canBeUsedForClinicalAction:false,
  };

  if (!options.pendingCoreContext) {
    _pendingCalculationCache = { key:cacheKey, context };
  }
  return context;
}

function getActivePendingCalculationContext(options = {}) {
  const stack = Array.isArray(options.stack)
    ? options.stack
    : (typeof activeStack !== "undefined" ? activeStack : []);
  const genotype = options.genotypeState || (typeof activeGenotype !== "undefined" ? activeGenotype || {} : {});
  return getPendingCalculationContext(stack, genotype, options);
}

function getPendingCalculationEvidenceStudy(id) {
  if (!id || !String(id).startsWith("pending_calc_evidence_")) return null;
  const context = getActivePendingCalculationContext();
  return context?.evidenceById?.[id] || null;
}

function getPendingCalculationEvidenceEntries(context = null) {
  const resolved = context || (typeof getActivePendingCalculationContext === "function" ? getActivePendingCalculationContext() : null);
  return (resolved?.evidenceRows || []).map(row => [row.id, row]);
}

function adaptPendingEvidenceCandidates(candidates = []) {
  return (candidates || [])
    .filter(candidate => candidate?.candidateBucket === "studyCandidates")
    .map(candidate => pendingCandidateToEvidenceStudy(candidate))
    .filter(Boolean);
}

function adaptPendingPgxCandidates(candidates = [], evidenceIndex = {}, stack = [], genotypeState = {}) {
  const stackKeys = new Set((stack || []).map(pendingCalculationNormalizeKey).filter(Boolean));
  const genotypeKeys = new Set(Object.keys(genotypeState || {}).map(pendingCalculationNormalizeKey).filter(Boolean));
  const rows = [];
  const seen = new Set();
  for (const candidate of candidates || []) {
    if (candidate?.candidateBucket !== "pgxCandidates") continue;
    const gene = candidate.gene || candidate.genes?.[0] || "";
    const drugs = pendingCandidateDrugs(candidate);
    const candidateDrugKeys = drugs.map(pendingCalculationNormalizeKey).filter(Boolean);
    const stackMatched = !candidateDrugKeys.length || candidateDrugKeys.some(key => stackKeys.has(key));
    const genotypeMatched = gene && genotypeKeys.has(pendingCalculationNormalizeKey(gene));
    const textMatched = candidate.match?.matchedText?.length || candidate.match?.matchedGeneText?.length || candidate.match?.matchedGenes?.length;
    if (!stackMatched && !genotypeMatched && !textMatched) continue;
    const drugLabel = drugs[0] || "";
    const key = `${pendingCalculationNormalizeKey(gene)}|${pendingCalculationNormalizeKey(drugLabel)}|${candidate.sourceRecordId || candidate.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      id:`pending_calc_pgx_${pendingCalculationSlug(candidate.id || key)}`,
      candidateId:candidate.id,
      sourceRecordId:candidate.sourceRecordId,
      sourceRecordIds:candidate.sourceRecordIds || [],
      gene,
      drug:drugLabel,
      drugs,
      pathways:candidate.pathways || [],
      ruleKind:candidate.ruleKind || candidate.claimType || "pending_pgx_rule",
      title:drugLabel
        ? `Pending PGx source signal: ${gene || "gene"} + ${drugLabel}`
        : `Pending PGx source signal: ${gene || "gene"}`,
      summary:pendingCalculationSummary(candidate, "Source-linked PGx relationship is available but not curated into a rule yet."),
      sourceName:candidate.sourceName || candidate.sourceKey || "pending source",
      sourceUrl:candidate.sourceUrl || "",
      confidence:"low",
      severity:"monitor",
      evidenceRefs:pendingEvidenceRefsForCandidate(candidate, evidenceIndex),
      reviewRequired:true,
      pendingSourceSignal:true,
      experimentalOnly:true,
      canAffectScoring:true,
      canAffectPublicSeverity:false,
    });
  }
  return rows.sort(pendingSignalSort);
}

function adaptPendingPkCandidates(candidates = [], evidenceIndex = {}, stack = []) {
  const stackKeys = new Set((stack || []).map(pendingCalculationNormalizeKey).filter(Boolean));
  const rows = [];
  const seen = new Set();
  for (const candidate of candidates || []) {
    if (candidate?.candidateBucket !== "pkCandidates") continue;
    const drugs = pendingCandidateDrugs(candidate);
    const candidateDrugKeys = drugs.map(pendingCalculationNormalizeKey).filter(Boolean);
    const stackMatched = !candidateDrugKeys.length || candidateDrugKeys.some(key => stackKeys.has(key));
    const textMatched = candidate.match?.matchedText?.length || candidate.match?.matchedDrugs?.length;
    if (!stackMatched && !textMatched) continue;
    const extracted = extractPendingPkMagnitude(candidate);
    const drugLabel = drugs[0] || candidate.drug || "";
    const key = `${pendingCalculationNormalizeKey(drugLabel)}|${candidate.sourceRecordId || candidate.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      id:`pending_calc_pk_${pendingCalculationSlug(candidate.id || key)}`,
      candidateId:candidate.id,
      sourceRecordId:candidate.sourceRecordId,
      sourceRecordIds:candidate.sourceRecordIds || [],
      drug:drugLabel,
      drugs,
      genes:candidate.genes || [],
      title:drugLabel
        ? `Pending PK source signal: ${drugLabel}`
        : "Pending PK source signal",
      summary:pendingCalculationSummary(candidate, "Source-linked PK profile candidate is available but not curated into simulation parameters yet."),
      sourceName:candidate.sourceName || candidate.sourceKey || "pending source",
      sourceUrl:candidate.sourceUrl || "",
      numericExtractionStatus:candidate.numericExtractionStatus || extracted.status,
      canCreateAbsoluteProfile:candidate.canCreateAbsoluteProfile === true,
      aucFold:extracted.aucFold,
      clearanceReductionPct:extracted.clearanceReductionPct,
      halfLifeFold:extracted.halfLifeFold,
      confidence:extracted.hasNumeric ? "moderate" : "low",
      severity:extracted.hasNumeric ? "monitor" : "info",
      evidenceRefs:pendingEvidenceRefsForCandidate(candidate, evidenceIndex),
      reviewRequired:true,
      pendingSourceSignal:true,
      experimentalOnly:true,
      canAffectScoring:true,
      canAffectPublicSeverity:false,
    });
  }
  return rows.sort(pendingSignalSort);
}

function adaptPendingDdiCandidates(candidates = [], evidenceIndex = {}, stack = []) {
  const stackKeys = new Set((stack || []).map(pendingCalculationNormalizeKey).filter(Boolean));
  const rows = [];
  const seen = new Set();
  for (const candidate of candidates || []) {
    if (candidate?.candidateBucket !== "interactionCandidates") continue;
    const drug1 = candidate.drug1 || candidate.drugs?.[0] || "";
    const drug2 = candidate.drug2 || candidate.drugs?.[1] || "";
    const drugs = pendingCandidateDrugs(candidate);
    const drugKeys = drugs.map(pendingCalculationNormalizeKey).filter(Boolean);
    const matchedDrugs = drugKeys.filter(key => stackKeys.has(key));
    if (drugKeys.length >= 2 && matchedDrugs.length < 2) continue;
    const key = `${pendingCalculationNormalizeKey(drug1)}|${pendingCalculationNormalizeKey(drug2)}|${candidate.sourceRecordId || candidate.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      id:`pending_calc_ddi_${pendingCalculationSlug(candidate.id || key)}`,
      candidateId:candidate.id,
      sourceRecordId:candidate.sourceRecordId,
      sourceRecordIds:candidate.sourceRecordIds || [],
      drug1,
      drug2,
      drugs:drugs.length ? drugs : [drug1, drug2].filter(Boolean),
      genes:candidate.genes || [],
      type:"pending-source-ddi",
      source:"pending_source",
      sourceEngine:"pending_source_ddi",
      strength:"pending",
      severity:"monitor",
      rawSeverity:candidate.publicSeverity || candidate.suggestedSeverity || "pending_unrated",
      effect:pendingCalculationSummary(candidate, "Pending source interaction signal requires review."),
      mechanism:`Source-linked possible DDI from ${candidate.sourceName || candidate.sourceKey || "pending source"}; not curated into public severity.`,
      confidence:"low",
      evidenceRefs:pendingEvidenceRefsForCandidate(candidate, evidenceIndex),
      reviewRequired:true,
      pendingSourceSignal:true,
      experimentalOnly:true,
      canAffectScoring:true,
      canAffectPublicSeverity:false,
    });
  }
  return rows.sort(pendingSignalSort);
}

function pendingCalculationContextToInteractions(context = null) {
  const resolved = context || getActivePendingCalculationContext();
  return (resolved?.ddiSignals || []).map(signal => normalizeInteractionRisk({
    id:signal.id,
    drug1:signal.drug1,
    drug2:signal.drug2,
    enzyme:(signal.genes || [])[0] || "pending source",
    type:"pending-source-ddi",
    strength:signal.strength,
    effect:signal.effect,
    severity:signal.severity,
    rawSeverity:signal.rawSeverity,
    mechanism:signal.mechanism,
    source:"pending_source",
    sourceEngine:"pending_source_ddi",
    confidence:signal.confidence,
    evidenceRefs:signal.evidenceRefs || [],
    contributorDrugs:signal.drugs || [signal.drug1, signal.drug2].filter(Boolean),
    reviewRequired:true,
    pendingSourceSignal:true,
    experimentalOnly:true,
    canAffectPublicSeverity:false,
  }));
}

function pendingCalculationSignalsToFindings(context = null) {
  const resolved = context || getActivePendingCalculationContext();
  const findings = [
    ...(resolved?.ddiSignals || []).map(pendingDdiSignalToFinding),
    ...(resolved?.pgxSignals || []).map(pendingPgxSignalToFinding),
    ...(resolved?.pkSignals || []).map(pendingPkSignalToFinding),
  ].filter(Boolean);
  return rankFindings(mergeDuplicateFindings(findings)).slice(0, PENDING_CALCULATION_FINDING_LIMIT);
}

function scorePendingCalculationSignals({ evidenceRows = [], pgxSignals = [], pkSignals = [], ddiSignals = [] } = {}) {
  const uniqueSources = new Set(evidenceRows.map(row => row.sourceRecordId || row.id).filter(Boolean));
  const uniquePgx = new Set(pgxSignals.map(row => `${pendingCalculationNormalizeKey(row.gene)}|${pendingCalculationNormalizeKey(row.drug)}`).filter(Boolean));
  const numericPk = pkSignals.filter(row => row.aucFold || row.clearanceReductionPct || row.halfLifeFold);
  const textPk = pkSignals.filter(row => !(row.aucFold || row.clearanceReductionPct || row.halfLifeFold));
  const uniqueDdi = new Set(ddiSignals.map(row => `${pendingCalculationNormalizeKey(row.drug1)}|${pendingCalculationNormalizeKey(row.drug2)}`).filter(Boolean));

  const ddiScore = Math.min(8, uniqueDdi.size * 4);
  const pgxScore = Math.min(8, uniquePgx.size * 1);
  const numericPkScore = Math.min(6, numericPk.length * 2);
  const textPkScore = Math.min(3, textPk.length * 0.5);
  const evidenceScore = Math.min(4, Math.floor(uniqueSources.size / 8) * 0.5);
  const raw = ddiScore + pgxScore + numericPkScore + textPkScore + evidenceScore;
  const score = Math.min(PENDING_CALCULATION_SCORE_CAP, Math.round(raw));
  const factors = [
    ddiScore ? `${uniqueDdi.size} pending strict DDI signal${uniqueDdi.size === 1 ? "" : "s"}` : "",
    pgxScore ? `${uniquePgx.size} pending PGx signal${uniquePgx.size === 1 ? "" : "s"}` : "",
    numericPkScore ? `${numericPk.length} pending numeric PK signal${numericPk.length === 1 ? "" : "s"}` : "",
    textPkScore ? `${textPk.length} pending PK context signal${textPk.length === 1 ? "" : "s"}` : "",
    evidenceScore ? `${uniqueSources.size} source-linked evidence rows` : "",
  ].filter(Boolean);

  return {
    score,
    rawScore:raw,
    cap:PENDING_CALCULATION_SCORE_CAP,
    factors,
    counts:{
      evidenceRows:evidenceRows.length,
      pgxSignals:pgxSignals.length,
      pkSignals:pkSignals.length,
      ddiSignals:ddiSignals.length,
      numericPkSignals:numericPk.length,
    },
    canAffectPublicSeverity:false,
  };
}

function pendingCandidateToEvidenceStudy(candidate = {}) {
  const id = pendingCalculationEvidenceId(candidate);
  const identifiers = candidate.evidenceIdentifiers || [];
  const pmids = identifiers.map(value => String(value).match(/PMID:?(\d+)/i)?.[1]).filter(Boolean);
  const dois = identifiers.map(value => String(value).match(/DOI:?([^\s]+)/i)?.[1]).filter(Boolean);
  return {
    id,
    type:pendingEvidenceTier(candidate),
    title:candidate.title || `Pending source context: ${candidate.sourceName || candidate.sourceKey || candidate.id || "source"}`,
    source:candidate.sourceName || candidate.sourceKey || "pending source",
    url:candidate.sourceUrl || identifiers.find(value => /^https?:\/\//i.test(value)) || "",
    pmid:pmids[0] || null,
    doi:dois[0] || null,
    supports:pendingEvidenceSupports(candidate),
    quantifiedEffects:pendingEvidenceQuantifiedEffects(candidate),
    studyDesign:candidate.evidenceType || candidate.claimType || "pending_source_context",
    population:candidate.phenotypes?.join(", ") || "",
    summary:pendingCalculationSummary(candidate, "Source-linked evidence candidate pending professional review."),
    limitations:[
      "Source-linked pending calculation signal",
      "Context-only; not public-severity-bearing",
    ],
    candidateId:candidate.id,
    sourceRecordId:candidate.sourceRecordId,
    sourceRecordIds:candidate.sourceRecordIds || [],
    sourceCategory:SOURCE_CATEGORY.EXTERNAL_CONTEXT,
    sourceKey:candidate.sourceKey || "",
    sourceUrl:candidate.sourceUrl || "",
    importedContextOnly:true,
    notSeverityBearing:true,
    pendingSourceSignal:true,
    sourceLinked:true,
    reviewRequired:true,
    reviewDecision:REVIEW_DECISION.UNREVIEWED,
    professionalReviewed:false,
    reviewStatus:"pending",
    professionalReviewStatus:"pending",
    experimentalOnly:true,
    canAffectScoring:false,
    canAffectPublicSeverity:false,
    public:candidate.public !== false,
  };
}

function pendingDdiSignalToFinding(signal) {
  if (!signal) return null;
  const pair = signal.drugs?.length ? signal.drugs : [signal.drug1, signal.drug2].filter(Boolean);
  return {
    id:makeFindingId(["finding", "pending-ddi", signal.id]),
    type:"pending_source_ddi",
    title:pair.length >= 2
      ? `${pair[0]} + ${pair[1]} pending source interaction`
      : "Pending source interaction",
    severity:"monitor",
    confidence:"low",
    summary:signal.effect || signal.summary || "Pending source interaction signal requires review.",
    affectedActors:[
      ...pair.map(name => ({ id:name, type:"parent_drug", direction:"involved" })),
      ...(signal.genes || []).map(gene => ({ id:gene, type:"enzyme", direction:"involved" })),
    ],
    tags:uniqueFindingValues(["Pending source signal", "Strict DDI candidate", signal.sourceName]),
    evidenceRefs:uniqueFindingValues(signal.evidenceRefs || []),
    reviewRequired:true,
    source:"pending_source_ddi",
    sourceRows:[signal],
    groupedFindings:[],
    clinicalAction:"Pending source signal only. Review before clinical action.",
    evidenceStatus:"source-linked; pending professional review",
    whyPath:null,
    evidenceLadder:null,
    pendingSourceSignal:true,
    canAffectPublicSeverity:false,
  };
}

function pendingPgxSignalToFinding(signal) {
  if (!signal) return null;
  const actors = [
    signal.drug ? { id:signal.drug, type:"parent_drug", direction:"involved" } : null,
    signal.gene ? { id:signal.gene, type:"enzyme", direction:"involved" } : null,
  ].filter(Boolean);
  return {
    id:makeFindingId(["finding", "pending-pgx", signal.id]),
    type:"pending_source_pgx",
    title:signal.title || "Pending PGx source signal",
    severity:"monitor",
    confidence:signal.confidence || "low",
    summary:signal.summary || "Pending PGx source signal requires rule curation.",
    affectedActors:actors,
    tags:uniqueFindingValues(["Pending source signal", "PGx", signal.ruleKind, signal.sourceName]),
    evidenceRefs:uniqueFindingValues(signal.evidenceRefs || []),
    reviewRequired:true,
    source:"pending_source_pgx",
    sourceRows:[signal],
    groupedFindings:[],
    clinicalAction:"Pending source signal only. Review before PGx recommendation.",
    evidenceStatus:"source-linked; pending professional review",
    whyPath:null,
    evidenceLadder:null,
    pendingSourceSignal:true,
    canAffectPublicSeverity:false,
  };
}

function pendingPkSignalToFinding(signal) {
  if (!signal) return null;
  const numericText = signal.aucFold
    ? `Extracted AUC fold context: ${signal.aucFold}x.`
    : signal.clearanceReductionPct
    ? `Extracted clearance reduction context: ${signal.clearanceReductionPct}%.`
    : signal.halfLifeFold
    ? `Extracted half-life fold context: ${signal.halfLifeFold}x.`
    : "";
  return {
    id:makeFindingId(["finding", "pending-pk", signal.id]),
    type:"pending_source_pk",
    title:signal.title || "Pending PK source signal",
    severity:signal.severity || "info",
    confidence:signal.confidence || "low",
    summary:[numericText, signal.summary || "Pending PK profile candidate requires parameter curation."].filter(Boolean).join(" "),
    affectedActors:[
      signal.drug ? { id:signal.drug, type:"parent_drug", direction:"involved" } : null,
      ...(signal.genes || []).map(gene => ({ id:gene, type:"enzyme", direction:"involved" })),
    ].filter(Boolean),
    tags:uniqueFindingValues(["Pending source signal", "PK", signal.numericExtractionStatus, signal.sourceName]),
    evidenceRefs:uniqueFindingValues(signal.evidenceRefs || []),
    reviewRequired:true,
    source:"pending_source_pk",
    sourceRows:[signal],
    groupedFindings:[],
    clinicalAction:"Pending source signal only. Review before PK parameter change.",
    evidenceStatus:"source-linked; pending professional review",
    whyPath:null,
    evidenceLadder:null,
    pendingSourceSignal:true,
    canAffectPublicSeverity:false,
  };
}

function buildPendingEvidenceIndex(evidenceRows = []) {
  const byRecordId = {};
  for (const row of evidenceRows || []) {
    for (const recordId of row.sourceRecordIds || [row.sourceRecordId]) {
      if (!recordId) continue;
      const list = byRecordId[recordId] || [];
      list.push(row.id);
      byRecordId[recordId] = list;
    }
  }
  return { byRecordId };
}

function pendingEvidenceRefsForCandidate(candidate = {}, evidenceIndex = {}) {
  const refs = [];
  for (const recordId of candidate.sourceRecordIds || [candidate.sourceRecordId]) {
    for (const ref of evidenceIndex.byRecordId?.[recordId] || []) refs.push(ref);
  }
  return uniqueFindingValues(refs);
}

function pendingCalculationEvidenceId(candidate = {}) {
  return `pending_calc_evidence_${pendingCalculationSlug(candidate.id || candidate.sourceRecordId || candidate.title || "source")}`;
}

function pendingEvidenceTier(candidate = {}) {
  const text = `${candidate.evidenceType || ""} ${candidate.strongestExternalTier || ""} ${candidate.sourceName || ""}`.toLowerCase();
  if (/fda|label|dailymed/.test(text)) return EVIDENCE_TIER.FDA_LABEL;
  if (/cpic|guideline|guidance/.test(text)) return EVIDENCE_TIER.GUIDELINE;
  if (/clinical[_\s-]?pk|pharmacokinetic/.test(text)) return EVIDENCE_TIER.CLINICAL_PK;
  if (/rct|trial/.test(text)) return EVIDENCE_TIER.RCT;
  if (/meta/.test(text)) return EVIDENCE_TIER.META_ANALYSIS;
  if (/observational|cohort|case/.test(text)) return EVIDENCE_TIER.OBSERVATIONAL;
  return EVIDENCE_TIER.REVIEW;
}

function pendingEvidenceSupports(candidate = {}) {
  const pieces = [
    candidate.id,
    candidate.sourceRecordId,
    ...(candidate.sourceRecordIds || []),
    ...(candidate.drugs || []),
    candidate.drug,
    candidate.drug1,
    candidate.drug2,
    candidate.parentDrug,
    ...(candidate.genes || []),
    candidate.gene,
    ...(candidate.pathways || []),
    ...(candidate.metabolites || []),
    candidate.metaboliteName,
    candidate.claimType,
    candidate.candidateCategory,
  ].filter(Boolean);
  return uniqueFindingValues(pieces.map(value => pendingCalculationNormalizeKey(value)).filter(Boolean));
}

function pendingEvidenceQuantifiedEffects(candidate = {}) {
  const extracted = extractPendingPkMagnitude(candidate);
  if (!extracted.hasNumeric) return null;
  return {
    aucFold:extracted.aucFold || undefined,
    clearanceReductionPct:extracted.clearanceReductionPct || undefined,
    halfLifeFold:extracted.halfLifeFold || undefined,
  };
}

function extractPendingPkMagnitude(candidate = {}) {
  const text = `${candidate.summary || ""} ${candidate.title || ""} ${(candidate.evidenceIdentifiers || []).join(" ")}`;
  const aucMatch = text.match(/\b(?:auc|exposure)[^\d]{0,20}(?:x|times|fold)?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:x|times|fold)?/i) ||
    text.match(/\b([0-9]+(?:\.[0-9]+)?)\s*(?:x|times|fold)[^\n.]{0,30}\b(?:auc|exposure|level|concentration)/i);
  const halfLifeMatch = text.match(/\b(?:half[-\s]?life|t1\/2)[^\d]{0,20}([0-9]+(?:\.[0-9]+)?)\s*(?:x|times|fold)/i);
  const clearanceMatch = text.match(/\b(?:clearance)[^\d]{0,24}([0-9]+(?:\.[0-9]+)?)\s*%/i);
  const aucFold = aucMatch ? Number(aucMatch[1]) : null;
  const halfLifeFold = halfLifeMatch ? Number(halfLifeMatch[1]) : null;
  const clearanceReductionPct = clearanceMatch ? Number(clearanceMatch[1]) : null;
  return {
    aucFold:aucFold && aucFold > 1 ? aucFold : null,
    halfLifeFold:halfLifeFold && halfLifeFold > 1 ? halfLifeFold : null,
    clearanceReductionPct:clearanceReductionPct && clearanceReductionPct > 0 ? clearanceReductionPct : null,
    hasNumeric:Boolean((aucFold && aucFold > 1) || (halfLifeFold && halfLifeFold > 1) || (clearanceReductionPct && clearanceReductionPct > 0)),
    status:Boolean((aucFold && aucFold > 1) || (halfLifeFold && halfLifeFold > 1) || (clearanceReductionPct && clearanceReductionPct > 0))
      ? "public_summary_numeric_context"
      : "text_only_context",
  };
}

function pendingCandidateDrugs(candidate = {}) {
  return uniqueFindingValues([
    ...(candidate.drugs || []),
    candidate.drug,
    candidate.drug1,
    candidate.drug2,
    candidate.parentDrug,
    candidate.knownDrugName,
    candidate.name,
  ].filter(Boolean));
}

function pendingCalculationSummary(candidate = {}, fallback = "") {
  const summary = String(candidate.summary || fallback || "").trim();
  return summary.replace(/\s+/g, " ");
}

function pendingSignalSort(a, b) {
  return (b.evidenceRefs?.length || 0) - (a.evidenceRefs?.length || 0) ||
    String(a.title || a.id || "").localeCompare(String(b.title || b.id || ""));
}

function pendingCalculationCacheKey(stack = [], genotypeState = {}, options = {}) {
  return JSON.stringify({
    stack:(stack || []).map(pendingCalculationNormalizeKey).sort(),
    genotype:Object.keys(genotypeState || {}).sort().map(key => [pendingCalculationNormalizeKey(key), genotypeState[key]]),
    limit:options.limit || "",
  });
}

function pendingCalculationNormalizeKey(value) {
  if (typeof pendingCoreNormalizeKey === "function") return pendingCoreNormalizeKey(value);
  if (typeof normalizeDrugLookupKey === "function") return normalizeDrugLookupKey(value);
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function pendingCalculationSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
}
