export const REVIEW_STATUS_SCHEMA = 'diognosis.review-status.v2';

export const REVIEW_STATUS_VALUES = Object.freeze({
  discoveryStatus: ['discovered', 'staged', 'deduped', 'queued', 'discarded'],
  sourceFaithfulnessStatus: [
    'unreviewed',
    'checked_by_maintainer',
    'checked_by_domain_reviewer',
    'needs_full_text',
    'source_mismatch',
    'not_applicable',
  ],
  curationStatus: [
    'raw_external',
    'candidate',
    'curated_draft',
    'curated_preview',
    'promoted_to_source',
    'rejected',
    'superseded',
  ],
  professionalReviewStatus: [
    'none',
    'pending',
    'reviewed_by_clinician',
    'reviewed_by_pharmacist',
    'reviewed_by_specialist',
    'reviewed_by_committee',
  ],
  localReviewStatus: ['none', 'local_pending', 'local_reviewed', 'local_rejected', 'local_superseded'],
  scoringStatus: [
    'cannot_affect_scoring',
    'context_only',
    'mechanistic_preview',
    'severity_preview',
    'locally_enabled',
    'professionally_reviewed_enabled',
  ],
  publicDisplayStatus: [
    'hidden',
    'review_queue_only',
    'source_linked_pending_review',
    'curated_preview_pending_professional_review',
    'locally_reviewed_overlay',
    'professionally_reviewed',
  ],
  promotionReadiness: [
    'not_ready',
    'ready_for_source_faithfulness_review',
    'ready_for_curated_preview',
    'ready_for_professional_review',
    'ready_for_local_overlay',
  ],
});

export const DEFAULT_REVIEW_STATE = Object.freeze({
  discoveryStatus: 'staged',
  sourceFaithfulnessStatus: 'unreviewed',
  curationStatus: 'candidate',
  professionalReviewStatus: 'pending',
  localReviewStatus: 'none',
  scoringStatus: 'cannot_affect_scoring',
  publicDisplayStatus: 'review_queue_only',
  promotionReadiness: 'not_ready',
});

export function normalizeReviewState(value = {}) {
  return {
    discoveryStatus: value.discoveryStatus || DEFAULT_REVIEW_STATE.discoveryStatus,
    sourceFaithfulnessStatus: value.sourceFaithfulnessStatus || DEFAULT_REVIEW_STATE.sourceFaithfulnessStatus,
    curationStatus: value.curationStatus || DEFAULT_REVIEW_STATE.curationStatus,
    professionalReviewStatus: value.professionalReviewStatus || DEFAULT_REVIEW_STATE.professionalReviewStatus,
    localReviewStatus: value.localReviewStatus || DEFAULT_REVIEW_STATE.localReviewStatus,
    scoringStatus: value.scoringStatus || DEFAULT_REVIEW_STATE.scoringStatus,
    publicDisplayStatus: value.publicDisplayStatus || DEFAULT_REVIEW_STATE.publicDisplayStatus,
    promotionReadiness: value.promotionReadiness || DEFAULT_REVIEW_STATE.promotionReadiness,
  };
}

export function isProfessionalReviewStatus(status) {
  return String(status || '').startsWith('reviewed_by_');
}

export function validateReviewState(value = {}, options = {}) {
  const state = normalizeReviewState(value);
  const errors = [];
  for (const [field, allowed] of Object.entries(REVIEW_STATUS_VALUES)) {
    if (state[field] && !allowed.includes(state[field])) {
      errors.push(`${field} must be one of: ${allowed.join(', ')}`);
    }
  }
  if (options.stagedRecord) {
    if (state.scoringStatus === 'locally_enabled' || state.scoringStatus === 'professionally_reviewed_enabled') {
      errors.push('staged records cannot be scoring-enabled');
    }
    if (state.publicDisplayStatus === 'professionally_reviewed' && !isProfessionalReviewStatus(state.professionalReviewStatus)) {
      errors.push('professionally reviewed display requires a professional review status');
    }
  }
  return { ok: errors.length === 0, errors, state };
}
