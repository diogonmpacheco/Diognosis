// MedCheck Engine — typed pending core enrichment context
// Matches source-linked generated candidates to the active stack without changing risk scoring.

function getPendingCoreEnrichmentData(data = null) {
  if (data) return data;
  if (typeof PENDING_CORE_ENRICHMENT !== "undefined") return PENDING_CORE_ENRICHMENT;
  return {
    schema:"diognosis.pending-core-enrichment.v1",
    sourceRecords:0,
    counts:{ totalCandidates:0 },
    candidateExpandedCounts:{},
    safetyBoundary:{
      professionalReviewStatus:"pending",
      professionallyReviewed:false,
      sourceLinkedOnly:true,
      canAffectScoring:false,
      canAffectPublicSeverity:false,
      canBeUsedForClinicalAction:false,
    },
    drugCandidates:[],
    studyCandidates:[],
    interactionCandidates:[],
    metaboliteCandidates:[],
    pgxCandidates:[],
    pkCandidates:[],
    receptorPhenotypeCandidates:[],
    beersCandidates:[],
    washoutCandidates:[],
  };
}

function pendingCoreCandidateBuckets(payload = null) {
  const data = getPendingCoreEnrichmentData(payload);
  return [
    ["drugCandidates", "Drug/label candidates", data.drugCandidates || []],
    ["studyCandidates", "Evidence candidates", data.studyCandidates || []],
    ["interactionCandidates", "Interaction candidates", data.interactionCandidates || []],
    ["metaboliteCandidates", "Metabolite candidates", data.metaboliteCandidates || []],
    ["pgxCandidates", "PGx rule candidates", data.pgxCandidates || []],
    ["pkCandidates", "PK candidates", data.pkCandidates || []],
    ["receptorPhenotypeCandidates", "Receptor/phenotype candidates", data.receptorPhenotypeCandidates || []],
    ["beersCandidates", "Beers candidates", data.beersCandidates || []],
    ["washoutCandidates", "Washout candidates", data.washoutCandidates || []],
  ];
}

function pendingCoreAllCandidates(payload = null) {
  return pendingCoreCandidateBuckets(payload).flatMap(([bucket, bucketLabel, rows]) =>
    (rows || []).map(row => ({ ...row, candidateBucket:bucket, candidateBucketLabel:bucketLabel }))
  );
}

function pendingCoreActiveKeys(stack = [], genotypeState = {}) {
  if (typeof pendingReviewActiveKeys === "function") return pendingReviewActiveKeys(stack, genotypeState);
  const drugKeys = new Set();
  const geneKeys = new Set(Object.keys(genotypeState || {}).map(pendingCoreNormalizeKey).filter(Boolean));
  const textKeys = new Set();
  for (const name of stack || []) {
    const drug = typeof getStackDrug === "function"
      ? getStackDrug(name)
      : (typeof getDrug === "function" ? getDrug(name) : null);
    [name, drug?.name, drug?.id].filter(Boolean).forEach(value => drugKeys.add(pendingCoreNormalizeKey(value)));
    [name, drug?.name, drug?.id, ...(drug?.aliases || []), ...(drug?.brandNames || []), ...(drug?.brands || [])]
      .filter(Boolean)
      .forEach(value => textKeys.add(pendingCoreNormalizeKey(value)));
  }
  return { drugKeys, geneKeys, textKeys };
}

function pendingCoreNormalizeKey(value) {
  if (typeof normalizePendingReviewKey === "function") return normalizePendingReviewKey(value);
  if (typeof normalizeDrugLookupKey === "function") return normalizeDrugLookupKey(value);
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function pendingCoreCandidateKeys(candidate = {}) {
  const drugs = [
    candidate.name,
    candidate.knownDrugName,
    candidate.drug,
    candidate.drug1,
    candidate.drug2,
    candidate.parentDrug,
    ...(candidate.drugs || []),
  ].map(pendingCoreNormalizeKey).filter(Boolean);
  const genes = [
    candidate.gene,
    ...(candidate.genes || []),
    ...(candidate.linkedGenes || []),
  ].map(pendingCoreNormalizeKey).filter(Boolean);
  const metabolites = [
    candidate.metaboliteName,
    ...(candidate.metabolites || []),
  ].map(pendingCoreNormalizeKey).filter(Boolean);
  const text = [
    candidate.id,
    candidate.title,
    candidate.summary,
    candidate.sourceName,
    candidate.claimType,
    candidate.candidateCategory,
    candidate.suggestedTarget,
    ...(candidate.evidenceIdentifiers || []),
    ...(candidate.pathways || []),
    ...(candidate.phenotypes || []),
    ...drugs,
    ...genes,
    ...metabolites,
  ].join(" ").toLowerCase();
  return { drugs, genes, metabolites, text };
}

function pendingCoreCandidateMatch(candidate, keys) {
  const candidateKeys = pendingCoreCandidateKeys(candidate);
  const matchedDrugs = candidateKeys.drugs.filter(key => keys.drugKeys.has(key));
  const matchedGenes = candidateKeys.genes.filter(key => keys.geneKeys.has(key));
  const matchedText = [...keys.textKeys].filter(key => key && candidateKeys.text.includes(key));
  const matchedGeneText = [...keys.geneKeys].filter(key => key && candidateKeys.text.includes(key));
  const bucketWeight = {
    interactionCandidates:8,
    pgxCandidates:7,
    pkCandidates:6,
    studyCandidates:5,
    metaboliteCandidates:5,
    drugCandidates:4,
    receptorPhenotypeCandidates:4,
    beersCandidates:4,
    washoutCandidates:4,
  }[candidate.candidateBucket] || 2;
  const score = matchedDrugs.length * 20 +
    matchedGenes.length * 18 +
    matchedText.length * 8 +
    matchedGeneText.length * 8 +
    bucketWeight;
  return {
    matched: score > bucketWeight,
    score,
    matchedDrugs,
    matchedGenes,
    matchedText,
    matchedGeneText,
  };
}

function buildPendingCoreEnrichmentContext(stack = [], genotypeState = {}, options = {}) {
  const payload = getPendingCoreEnrichmentData(options.data);
  const candidates = pendingCoreAllCandidates(payload);
  const keys = pendingCoreActiveKeys(stack, genotypeState);
  const matched = candidates
    .map(candidate => ({ candidate, match:pendingCoreCandidateMatch(candidate, keys) }))
    .filter(item => item.match.matched)
    .sort((a, b) =>
      b.match.score - a.match.score ||
      String(a.candidate.candidateBucket || "").localeCompare(String(b.candidate.candidateBucket || "")) ||
      String(a.candidate.id || "").localeCompare(String(b.candidate.id || ""))
    );
  const visible = (matched.length ? matched : candidates.map(candidate => ({
    candidate,
    match:pendingCoreCandidateMatch(candidate, keys),
  }))).slice(0, options.limit || 30);
  const matchedCandidates = matched.map(item => ({ ...item.candidate, matchScore:item.match.score, match:item.match }));
  const visibleCandidates = visible.map(item => ({ ...item.candidate, matchScore:item.match.score, match:item.match }));
  return {
    schema:"diognosis.pending-core-context.v1",
    payload,
    totalCandidates:candidates.length,
    matchedCandidates,
    visibleCandidates,
    matchedCount:matchedCandidates.length,
    counts:payload.counts || {},
    candidateExpandedCounts:payload.candidateExpandedCounts || {},
    matchedCountsByBucket:pendingCoreCountBy(matchedCandidates, row => row.candidateBucket || "other"),
    matchedCountsByTarget:pendingCoreCountBy(matchedCandidates, row => row.suggestedTarget || "other"),
    safetyBoundary:payload.safetyBoundary || {},
    canAffectScoring:false,
    canAffectPublicSeverity:false,
    professionalReviewStatus:"pending",
  };
}

function pendingCoreCountBy(records = [], keyFn) {
  return records.reduce((acc, record) => {
    const key = keyFn(record) || "other";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}
