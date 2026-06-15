import { createHash } from 'crypto';
import { normalizeEvidenceIdentifiers } from './knowledge-layer-model.js';

export const LIVE_ENRICHMENT_POLICY_SCHEMA = 'diognosis.live-pending-review-policy.v1';

export const LIVE_ELIGIBILITY = Object.freeze({
  ELIGIBLE: 'eligible_live_pending_review',
  CANDIDATE_ONLY: 'candidate_only',
  NEEDS_SOURCE_IDENTIFIER: 'needs_source_identifier',
  NEEDS_MAPPING: 'needs_mapping',
  AMBIGUOUS_DIRECTION: 'ambiguous_direction',
  ENGINE_ONLY: 'engine_only',
  LICENSE_BLOCKED: 'license_blocked',
  REQUIRES_MANUAL_REVIEW: 'requires_manual_review',
});

export const LIVE_LANES = Object.freeze({
  CANDIDATE_ONLY: 'candidate_only',
  LIVE_PENDING_REVIEW: 'live_pending_review_curated_preview',
  PROFESSIONALLY_REVIEWED: 'professionally_reviewed',
});

export const LIVE_GOVERNANCE = Object.freeze({
  reviewRequired: true,
  professionalReviewStatus: 'pending',
  sourceFaithfulnessStatus: 'automated_source_check',
  curationStatus: 'automated_curated_preview',
  clinicalValidationStatus: 'not_validated',
  canAffectScoring: false,
  canAffectPublicSeverity: false,
  displayStatus: 'source_linked_pending_professional_review',
  publicDisplayStatus: 'source_linked_pending_professional_review',
  scoringStatus: 'external_context_only',
  promotionLane: LIVE_LANES.LIVE_PENDING_REVIEW,
});

const ENGINE_ONLY_STATUSES = new Set([
  'engine_hypothesis',
  'model_only',
  'model_only_review_prompt',
  'local_engine_hypothesis',
  'local_review_candidate_not_fetched',
]);

const SOURCE_REQUIRED_CLAIMS = new Set([
  'interaction_event',
  'ddi_evidence',
  'contraindication_context',
  'warning_context',
  'gene_drug_recommendation',
  'guideline_annotation',
  'clinical_annotation',
  'pgx_effect',
  'pgx_recommendation',
  'pgx_pair',
  'variant_annotation',
  'risk_marker_effect',
  'parent_metabolite_relation',
  'metabolite_evidence',
  'metabolite_role',
  'metabolite_formation',
  'metabolite_clearance',
  'active_moiety_effect',
  'toxic_metabolite_effect',
  'enzyme_effect',
  'transporter_effect',
  'pk_parameter',
  'washout_timing',
  'temporal_profile',
  'receptor_score',
  'phenotype_burden',
  'beers_flag',
  'geriatric_safety_flag',
  'drug_label',
  'publication',
]);

const DIRECTION_EXEMPT_CLAIMS = new Set([
  'drug_identity',
  'drug_alias',
  'drug_classification',
  'reference_gene',
  'reference_chemical',
  'drug_label',
  'publication',
  'guideline',
  'pk_parameter',
  'washout_timing',
  'temporal_profile',
  'metabolite_role',
  'parent_metabolite_relation',
]);

const BLOCKED_SOURCE_RE = /(sci[- ]?hub|libgen|library genesis|pirate mirror|researchgate\.net\/publication|academia\.edu)/i;

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value.filter(item => item != null && String(item).trim() !== '') : [value];
}

export function liveRecordFingerprint(record = {}) {
  return createHash('sha256').update(JSON.stringify({
    id: record.id || record.candidateId,
    source: record.source || record.sourceName,
    claim: record.claim || record.claimType,
    evidence: record.evidence || record.evidenceIdentifiers,
    actors: actorsForRecord(record),
  })).digest('hex').slice(0, 12);
}

export function sourceIdentifiersForRecord(record = {}) {
  const ids = [
    ...(record.evidenceIdentifiers || []),
    ...normalizeEvidenceIdentifiers(record),
    ...asArray(record.evidence?.sourceIdentifiers),
    ...asArray(record.evidence?.urls),
    record.source?.url,
    record.source?.endpoint,
    record.url,
  ].filter(Boolean).map(String);
  return [...new Set(ids)].filter(value =>
    /^PMID:/i.test(value) ||
    /^DOI:/i.test(value) ||
    /^ClinPGx:/i.test(value) ||
    /^CPIC:/i.test(value) ||
    /^DailyMed:/i.test(value) ||
    /^FDA:/i.test(value) ||
    /^ot_/i.test(value) ||
    /^rs\d+/i.test(value) ||
    /^PA\d+/i.test(value) ||
    /^https?:\/\//i.test(value)
  );
}

export function actorsForRecord(record = {}) {
  const mapping = record.mapping || {};
  const claim = record.claim || {};
  return {
    drugs: [...new Set([
      ...asArray(record.matchedDiognosisDrugs),
      ...asArray(mapping.matchedDiognosisDrugs),
      ...asArray(record.drugs),
      ...asArray(claim.drugs),
    ])],
    genes: [...new Set([
      ...asArray(record.matchedGenes),
      ...asArray(mapping.matchedGenes),
      ...asArray(record.genes),
      ...asArray(claim.genes),
    ])],
    metabolites: [...new Set([
      ...asArray(record.matchedMetabolites),
      ...asArray(mapping.matchedMetabolites),
      ...asArray(record.metabolites),
      ...asArray(claim.metabolites),
    ])],
    pathways: [...new Set([
      ...asArray(record.pathways),
      ...asArray(claim.pathways),
    ])],
    phenotypes: [...new Set([
      ...asArray(record.phenotypes),
      ...asArray(claim.phenotypes),
      ...asArray(record.riskMarkers),
      ...asArray(claim.riskMarkers),
    ])],
  };
}

export function claimTypeForRecord(record = {}) {
  return record.claimType || record.claim?.claimType || 'other';
}

export function hasSourceIdentifier(record = {}) {
  return sourceIdentifiersForRecord(record).length > 0;
}

export function hasCleanMapping(record = {}) {
  const actors = actorsForRecord(record);
  return [
    ...actors.drugs,
    ...actors.genes,
    ...actors.metabolites,
    ...actors.pathways,
    ...actors.phenotypes,
  ].length > 0;
}

export function hasClearClaimType(record = {}) {
  return SOURCE_REQUIRED_CLAIMS.has(claimTypeForRecord(record));
}

export function hasClearDirection(record = {}) {
  const claimType = claimTypeForRecord(record);
  if (DIRECTION_EXEMPT_CLAIMS.has(claimType)) return true;
  const direction = record.direction || record.claim?.direction || '';
  if (String(direction).trim()) return true;
  const text = [record.mechanismSummary, record.clinicalSummary, record.claim?.mechanismSummary, record.claim?.clinicalSummary].join(' ');
  return /(increase|decrease|reduc|inhibit|induc|toxicit|accumulat|activat|clearance|metabolism|risk|exposure|contraindicat|avoid|monitor|warning)/i.test(text);
}

export function isEngineOnly(record = {}) {
  const text = [
    record.store,
    record.layer,
    record.candidateKind,
    record.claimType,
    record.sourceTruthStatus,
    record.sourceSupportStatus,
    record.provenance?.sourceTruthStatus,
    record.governance?.sourceTruthStatus,
  ].join(' ');
  return /engine_hypothesis/i.test(text) || [...ENGINE_ONLY_STATUSES].some(status => text.includes(status));
}

export function isLicenseBlocked(record = {}) {
  const text = [
    record.source?.name,
    record.source?.url,
    record.source?.endpoint,
    record.source?.license,
    record.evidence?.openAccess?.url,
    ...(record.evidence?.urls || []),
    ...(record.evidenceIdentifiers || []),
  ].join(' ');
  return BLOCKED_SOURCE_RE.test(text);
}

export function explainLiveEligibility(record = {}) {
  const reasons = [];
  if (isLicenseBlocked(record)) {
    return { liveEligibility: LIVE_ELIGIBILITY.LICENSE_BLOCKED, reasons: ['blocked or non-allowlisted source surface'] };
  }
  if (isEngineOnly(record)) {
    return { liveEligibility: LIVE_ELIGIBILITY.ENGINE_ONLY, reasons: ['engine-only or local model hypothesis'] };
  }
  if (!hasSourceIdentifier(record)) {
    return { liveEligibility: LIVE_ELIGIBILITY.NEEDS_SOURCE_IDENTIFIER, reasons: ['missing PMID, DOI, guideline, label, API object, or source URL identifier'] };
  }
  if (!hasCleanMapping(record)) {
    return { liveEligibility: LIVE_ELIGIBILITY.NEEDS_MAPPING, reasons: ['missing mapped Diognosis drug, gene, metabolite, pathway, phenotype, or risk marker'] };
  }
  if (!hasClearClaimType(record)) {
    return { liveEligibility: LIVE_ELIGIBILITY.REQUIRES_MANUAL_REVIEW, reasons: [`unsupported or unclear claim type: ${claimTypeForRecord(record)}`] };
  }
  if (!hasClearDirection(record)) {
    return { liveEligibility: LIVE_ELIGIBILITY.AMBIGUOUS_DIRECTION, reasons: ['direction or claim action is ambiguous'] };
  }
  reasons.push('source identifier present');
  reasons.push('mapped Diognosis actor present');
  reasons.push('clear claim type and direction');
  reasons.push('automated preview only; professional review remains pending');
  return { liveEligibility: LIVE_ELIGIBILITY.ELIGIBLE, reasons };
}

export function isEligibleForLivePendingReview(record = {}) {
  return explainLiveEligibility(record).liveEligibility === LIVE_ELIGIBILITY.ELIGIBLE;
}

export function rejectLivePromotionReason(record = {}) {
  const result = explainLiveEligibility(record);
  return result.liveEligibility === LIVE_ELIGIBILITY.ELIGIBLE ? '' : `${result.liveEligibility}: ${result.reasons.join('; ')}`;
}

export function makeLivePendingReviewGovernance(extra = {}) {
  return {
    ...LIVE_GOVERNANCE,
    livePendingReview: true,
    importedContextOnly: false,
    notSeverityBearing: false,
    professionalReviewed: false,
    clinicalReviewed: false,
    reviewStatus: 'pending_professional_review',
    reviewDecision: 'unreviewed',
    notClinicalReview: true,
    stillPendingProfessionalReview: true,
    addedBy: 'live_pending_review_enrichment',
    addedAt: new Date().toISOString(),
    ...extra,
  };
}
