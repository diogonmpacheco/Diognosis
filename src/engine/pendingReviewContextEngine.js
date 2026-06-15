// MedCheck Engine — pending-review enrichment context
// Matches staged external source records to the active stack without changing risk scoring.

function getPendingReviewEnrichmentData(data = null) {
  if (data) return data;
  if (typeof PENDING_REVIEW_ENRICHMENT !== "undefined") return PENDING_REVIEW_ENRICHMENT;
  return {
    schema:"diognosis.pending-review-enrichment.v1",
    records:[],
    exportedRecords:0,
    exportedSourceCounts:{},
    safetyBoundary:{
      professionalReviewStatus:"pending",
      requiresHumanReview:true,
      canAffectScoring:false,
      canAffectPublicSeverity:false,
      canBeUsedForClinicalAction:false,
    },
  };
}

function normalizePendingReviewKey(value) {
  if (typeof normalizeDrugLookupKey === "function") return normalizeDrugLookupKey(value);
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function pendingReviewActiveKeys(stack = [], genotypeState = {}) {
  const drugKeys = new Set();
  const geneKeys = new Set(Object.keys(genotypeState || {}).map(normalizePendingReviewKey).filter(Boolean));
  const textKeys = new Set();
  for (const name of stack || []) {
    const drug = typeof getStackDrug === "function"
      ? getStackDrug(name)
      : (typeof getDrug === "function" ? getDrug(name) : null);
    [name, drug?.name, drug?.id].filter(Boolean).forEach(value => drugKeys.add(normalizePendingReviewKey(value)));
    [name, drug?.name, drug?.id, ...(drug?.aliases || []), ...(drug?.brands || [])]
      .filter(Boolean)
      .forEach(value => textKeys.add(normalizePendingReviewKey(value)));
  }
  return { drugKeys, geneKeys, textKeys };
}

function pendingReviewRecordKeys(record = {}) {
  const drugKeys = (record.drugs || []).map(normalizePendingReviewKey).filter(Boolean);
  const geneKeys = (record.genes || []).map(normalizePendingReviewKey).filter(Boolean);
  const metaboliteKeys = (record.metabolites || []).map(normalizePendingReviewKey).filter(Boolean);
  const pathwayKeys = (record.pathways || []).map(normalizePendingReviewKey).filter(Boolean);
  const phenotypeKeys = (record.phenotypes || []).map(normalizePendingReviewKey).filter(Boolean);
  const text = [
    record.id,
    record.title,
    record.summary,
    record.sourceName,
    record.claimType,
    ...(record.evidenceIdentifiers || []),
    ...drugKeys,
    ...geneKeys,
    ...metaboliteKeys,
    ...pathwayKeys,
    ...phenotypeKeys,
  ].join(" ").toLowerCase();
  return { drugKeys, geneKeys, metaboliteKeys, pathwayKeys, phenotypeKeys, text };
}

function pendingReviewRecordMatch(record, keys) {
  const recordKeys = pendingReviewRecordKeys(record);
  const matchedDrugs = recordKeys.drugKeys.filter(key => keys.drugKeys.has(key));
  const matchedGenes = recordKeys.geneKeys.filter(key => keys.geneKeys.has(key));
  const matchedText = [...keys.textKeys].filter(key => key && recordKeys.text.includes(key));
  const matchedGeneText = [...keys.geneKeys].filter(key => key && recordKeys.text.includes(key));
  const sourceWeight = { cpic:5, dailymed:4, clinpgx:3, literature:2 }[record.sourceKey] || 1;
  const score = matchedDrugs.length * 20 +
    matchedGenes.length * 18 +
    matchedText.length * 8 +
    matchedGeneText.length * 8 +
    sourceWeight;
  return {
    matched: score > sourceWeight,
    score,
    matchedDrugs,
    matchedGenes,
    matchedText,
    matchedGeneText,
  };
}

function buildPendingReviewContext(stack = [], genotypeState = {}, options = {}) {
  const payload = getPendingReviewEnrichmentData(options.data);
  const records = Array.isArray(payload.records) ? payload.records : [];
  const keys = pendingReviewActiveKeys(stack, genotypeState);
  const matchedRecords = records
    .map(record => ({ record, match: pendingReviewRecordMatch(record, keys) }))
    .filter(item => item.match.matched)
    .sort((a, b) =>
      b.match.score - a.match.score ||
      String(a.record.sourceKey || "").localeCompare(String(b.record.sourceKey || "")) ||
      String(a.record.id || "").localeCompare(String(b.record.id || ""))
    );
  const visibleRecords = (matchedRecords.length ? matchedRecords : records.map(record => ({
    record,
    match: pendingReviewRecordMatch(record, keys),
  }))).slice(0, options.limit || 24);
  const bySource = pendingReviewCountBy(records, record => record.sourceKey || "other");
  const matchedBySource = pendingReviewCountBy(matchedRecords.map(item => item.record), record => record.sourceKey || "other");
  const matchedByClaim = pendingReviewCountBy(matchedRecords.map(item => item.record), record => record.claimType || "other");
  return {
    schema:"diognosis.pending-review-context.v1",
    payload,
    totalRecords: records.length,
    matchedRecords: matchedRecords.map(item => ({ ...item.record, matchScore:item.match.score, match:item.match })),
    visibleRecords: visibleRecords.map(item => ({ ...item.record, matchScore:item.match.score, match:item.match })),
    matchedCount: matchedRecords.length,
    bySource,
    matchedBySource,
    matchedByClaim,
    safetyBoundary: payload.safetyBoundary || {},
    canAffectScoring:false,
    canAffectPublicSeverity:false,
    professionalReviewStatus:"pending",
  };
}

function pendingReviewCountBy(records = [], keyFn) {
  return records.reduce((acc, record) => {
    const key = keyFn(record) || "other";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}
