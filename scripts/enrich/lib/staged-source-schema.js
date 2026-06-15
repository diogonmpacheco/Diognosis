import { createHash } from 'crypto';
import { DEFAULT_REVIEW_STATE, isProfessionalReviewStatus, normalizeReviewState, validateReviewState } from './review-status-model.js';

export const STAGED_SOURCE_SCHEMA = 'diognosis.staged-source.v1';

export const SOURCE_TYPES = new Set([
  'literature_discovery',
  'structured_guideline',
  'user_session_pgx',
  'internal_diognosis',
  'external_context',
  'manual_review',
]);

export const CLAIM_TYPES = new Set([
  'gene_drug_recommendation',
  'clinical_annotation',
  'guideline_annotation',
  'drug_label',
  'publication',
  'ddi_evidence',
  'metabolite_evidence',
  'pgx_pair',
  'test_alert',
  'pathway_context',
  'coverage_gap',
  'guideline',
  'allele_function',
  'variant_annotation',
  'reference_gene',
  'reference_chemical',
  'other',
]);

export const DEFAULT_GOVERNANCE = Object.freeze({
  reviewRequired: true,
  professionalReviewStatus: 'pending',
  sourceFaithfulnessStatus: 'unreviewed',
  discoveryStatus: 'staged',
  curationStatus: 'candidate',
  localReviewStatus: 'none',
  scoringStatus: 'cannot_affect_scoring',
  publicDisplayStatus: 'review_queue_only',
  canAffectScoring: false,
  canAffectPublicSeverity: false,
  canBeBundledPublicly: false,
  promotionTarget: null,
  promotionReadiness: 'not_ready',
  reviewScopes: [],
  localReviewOverlays: [],
});

export const DEFAULT_PROVENANCE = Object.freeze({
  rawSourceCachePath: '',
  normalizedAt: '',
  normalizerVersion: '',
  sourceRelease: '',
  sourceSnapshotId: '',
  sourceObjectId: '',
  sourceObjectHash: '',
  sourceTruthStatus: 'local_review_candidate_not_fetched',
  previousRecordId: '',
  supersedes: [],
  supersededBy: [],
});

const REQUIRED_SOURCE_FIELDS = ['name', 'sourceType', 'url', 'fetchedAt', 'license'];

export function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value.filter(v => v != null && String(v).trim() !== '') : [value];
}

export function stableToken(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

export function shortHash(value) {
  return createHash('sha256').update(String(value || '')).digest('hex').slice(0, 10);
}

export function makeStagedSourceId(record) {
  const source = stableToken(record?.source?.name || 'source');
  const type = stableToken(record?.claim?.claimType || 'claim');
  const actors = [
    ...asArray(record?.claim?.genes),
    ...asArray(record?.claim?.drugs),
    ...asArray(record?.claim?.metabolites),
    ...asArray(record?.evidence?.sourceIdentifiers),
    ...asArray(record?.evidence?.pmids),
    ...asArray(record?.evidence?.dois),
  ].map(stableToken).filter(Boolean).slice(0, 5).join('_');
  const hash = shortHash(JSON.stringify({
    source: record?.source,
    claim: record?.claim,
    evidence: record?.evidence,
    mapping: record?.mapping,
  }));
  return `candidate_${source}_${type}_${actors || hash}_${hash}`.replace(/_+/g, '_');
}

export function normalizeStagedSourceRecord(record = {}) {
  const normalized = {
    id: record.id || null,
    schema: record.schema || STAGED_SOURCE_SCHEMA,
    source: {
      name: record.source?.name || '',
      sourceType: record.source?.sourceType || '',
      url: record.source?.url || '',
      endpoint: record.source?.endpoint || '',
      fetchedAt: record.source?.fetchedAt || new Date(0).toISOString(),
      license: record.source?.license || '',
      licenseUrl: record.source?.licenseUrl || '',
      attribution: record.source?.attribution || '',
      rateLimit: record.source?.rateLimit || '',
      refreshCadence: record.source?.refreshCadence || '',
    },
    claim: {
      claimType: record.claim?.claimType || 'other',
      genes: asArray(record.claim?.genes),
      drugs: asArray(record.claim?.drugs),
      metabolites: asArray(record.claim?.metabolites),
      pathways: asArray(record.claim?.pathways),
      phenotypes: asArray(record.claim?.phenotypes),
      riskMarkers: asArray(record.claim?.riskMarkers),
      population: record.claim?.population || '',
      genotypeOrPhenotype: record.claim?.genotypeOrPhenotype || '',
      direction: record.claim?.direction || '',
      affectedActors: asArray(record.claim?.affectedActors),
      mechanismSummary: record.claim?.mechanismSummary || '',
      clinicalSummary: record.claim?.clinicalSummary || '',
    },
    evidence: {
      pmids: asArray(record.evidence?.pmids).map(String),
      dois: asArray(record.evidence?.dois).map(String),
      urls: asArray(record.evidence?.urls),
      sourceIdentifiers: asArray(record.evidence?.sourceIdentifiers),
      strongestExternalTier: record.evidence?.strongestExternalTier || '',
      openAccess: {
        hasLegalOpenAccess: Boolean(record.evidence?.openAccess?.hasLegalOpenAccess),
        provider: record.evidence?.openAccess?.provider || '',
        license: record.evidence?.openAccess?.license || '',
        url: record.evidence?.openAccess?.url || '',
      },
    },
    mapping: {
      matchedDiognosisDrugs: asArray(record.mapping?.matchedDiognosisDrugs),
      unmatchedDrugs: asArray(record.mapping?.unmatchedDrugs),
      matchedGenes: asArray(record.mapping?.matchedGenes),
      unmatchedGenes: asArray(record.mapping?.unmatchedGenes),
      matchedMetabolites: asArray(record.mapping?.matchedMetabolites),
      unmatchedMetabolites: asArray(record.mapping?.unmatchedMetabolites),
      matchedEvidenceRefs: asArray(record.mapping?.matchedEvidenceRefs),
      possibleExistingRows: asArray(record.mapping?.possibleExistingRows),
    },
    governance: {
      ...DEFAULT_GOVERNANCE,
      ...(record.governance || {}),
    },
    provenance: {
      ...DEFAULT_PROVENANCE,
      ...(record.provenance || {}),
      supersedes: asArray(record.provenance?.supersedes),
      supersededBy: asArray(record.provenance?.supersededBy),
    },
    reviews: asArray(record.reviews).map(normalizeReview),
    notes: asArray(record.notes),
    warnings: asArray(record.warnings),
  };
  const reviewState = normalizeReviewState({
    ...DEFAULT_REVIEW_STATE,
    ...normalized.governance,
  });
  normalized.governance.discoveryStatus = reviewState.discoveryStatus;
  normalized.governance.sourceFaithfulnessStatus = reviewState.sourceFaithfulnessStatus;
  normalized.governance.curationStatus = reviewState.curationStatus;
  normalized.governance.professionalReviewStatus = reviewState.professionalReviewStatus;
  normalized.governance.localReviewStatus = reviewState.localReviewStatus;
  normalized.governance.scoringStatus = reviewState.scoringStatus;
  normalized.governance.publicDisplayStatus = reviewState.publicDisplayStatus;
  normalized.governance.promotionReadiness = reviewState.promotionReadiness;
  normalized.governance.reviewScopes = asArray(normalized.governance.reviewScopes);
  normalized.governance.localReviewOverlays = asArray(normalized.governance.localReviewOverlays);
  normalized.governance.reviewRequired = normalized.governance.reviewRequired !== false;
  if (normalized.governance.reviewRequired) {
    if (!isProfessionalReviewStatus(normalized.governance.professionalReviewStatus)) {
      normalized.governance.professionalReviewStatus = normalized.governance.professionalReviewStatus || 'pending';
    }
    normalized.governance.sourceFaithfulnessStatus = normalized.governance.sourceFaithfulnessStatus || 'unreviewed';
    normalized.governance.canAffectScoring = false;
    normalized.governance.canAffectPublicSeverity = false;
    if (normalized.governance.scoringStatus === 'locally_enabled' || normalized.governance.scoringStatus === 'professionally_reviewed_enabled') {
      normalized.governance.scoringStatus = 'cannot_affect_scoring';
    }
  }
  normalized.id = record.id || makeStagedSourceId(normalized);
  return normalized;
}

function normalizeReview(review = {}) {
  return {
    reviewId: review.reviewId || '',
    reviewType: review.reviewType || '',
    reviewerName: review.reviewerName || '',
    reviewerRole: review.reviewerRole || '',
    reviewerOrganization: review.reviewerOrganization || '',
    reviewerCredentials: review.reviewerCredentials || '',
    reviewDate: review.reviewDate || '',
    scope: asArray(review.scope),
    decision: review.decision || '',
    notes: review.notes || '',
    appliesToClaims: asArray(review.appliesToClaims),
    signature: review.signature || '',
  };
}

export function validateStagedSourceRecord(record) {
  const row = normalizeStagedSourceRecord(record);
  const errors = [];
  if (row.schema !== STAGED_SOURCE_SCHEMA) errors.push(`schema must be ${STAGED_SOURCE_SCHEMA}`);
  for (const field of REQUIRED_SOURCE_FIELDS) {
    if (!row.source[field]) errors.push(`source.${field} is required`);
  }
  if (!SOURCE_TYPES.has(row.source.sourceType)) errors.push(`unknown source.sourceType: ${row.source.sourceType}`);
  if (!CLAIM_TYPES.has(row.claim.claimType)) errors.push(`unknown claim.claimType: ${row.claim.claimType}`);
  const reviewState = validateReviewState(row.governance, { stagedRecord: true });
  if (!reviewState.ok) errors.push(...reviewState.errors);
  if (row.governance.reviewRequired !== true) errors.push('governance.reviewRequired must default to true for staged records');
  if (isProfessionalReviewStatus(row.governance.professionalReviewStatus) && !row.reviews.some(review => review.decision === 'approve_professionally')) {
    errors.push('professional review status requires an approve_professionally review object');
  }
  if (row.governance.canAffectScoring) errors.push('unreviewed staged records cannot affect scoring');
  if (row.governance.canAffectPublicSeverity) errors.push('unreviewed staged records cannot affect public severity');
  return { ok: errors.length === 0, errors, record: row };
}

export function dedupeStagedSourceRecords(records = []) {
  const seen = new Map();
  for (const record of records.map(normalizeStagedSourceRecord)) {
    const key = record.id || makeStagedSourceId(record);
    if (!seen.has(key)) seen.set(key, record);
  }
  return [...seen.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function mergeStagedSourceRecords(existing = [], incoming = []) {
  return dedupeStagedSourceRecords([...existing, ...incoming]);
}
