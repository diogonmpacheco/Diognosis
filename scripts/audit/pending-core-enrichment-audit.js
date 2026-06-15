#!/usr/bin/env node
import { resolve } from 'path';
import { ROOT, readGeneratedConstObject } from '../enrich/lib/medcheck-source-loader.js';

const SOURCE = resolve(ROOT, 'src/data/generatedPendingCoreEnrichment.js');
const payload = readGeneratedConstObject(SOURCE, 'PENDING_CORE_ENRICHMENT');
const errors = [];

const CANDIDATE_ARRAYS = [
  'drugCandidates',
  'studyCandidates',
  'interactionCandidates',
  'metaboliteCandidates',
  'pgxCandidates',
  'pkCandidates',
  'receptorPhenotypeCandidates',
  'beersCandidates',
  'washoutCandidates',
];

const ABSOLUTE_PATH_PATTERNS = [
  /\/Users\//,
  /file:\/\/\/Users\//,
  /Documents\/GitHub\/medcheck/,
  new RegExp(ROOT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
];

const FORBIDDEN_KEYS = [
  /^response$/i,
  /^raw/i,
  /^sourceObject/i,
  /payload/i,
  /fullText/i,
  /rawText/i,
  /abstract/i,
  /labelText/i,
  /bodyText/i,
  /^body$/i,
];

function fail(message) {
  errors.push(message);
}

function isPrimitive(value) {
  return value == null || ['string', 'number', 'boolean'].includes(typeof value);
}

function hasAbsolutePath(value) {
  return ABSOLUTE_PATH_PATTERNS.some(pattern => pattern.test(String(value || '')));
}

function validateNoRawPayloadShape(record, label) {
  for (const [key, value] of Object.entries(record || {})) {
    if (FORBIDDEN_KEYS.some(pattern => pattern.test(key))) fail(`${label}: forbidden raw/full-text key ${key}`);
    if (hasAbsolutePath(value)) fail(`${label}: local absolute path in ${key}`);
    if (Array.isArray(value)) {
      if (value.some(item => !isPrimitive(item))) fail(`${label}: array ${key} contains nested objects`);
      if (value.some(item => String(item || '').length > 500)) fail(`${label}: array ${key} contains oversized text`);
      continue;
    }
    if (!isPrimitive(value)) fail(`${label}: nested object not allowed in compact candidate field ${key}`);
    if (typeof value === 'string' && value.length > 700) fail(`${label}: oversized text in ${key}`);
  }
}

if (!payload) {
  fail('PENDING_CORE_ENRICHMENT was not found');
} else {
  if (payload.schema !== 'diognosis.pending-core-enrichment.v1') fail('schema must be diognosis.pending-core-enrichment.v1');
  if (payload.sourceSchema !== 'diognosis.pending-review-enrichment.v1') fail('sourceSchema must be diognosis.pending-review-enrichment.v1');
  if (payload.safetyBoundary?.professionalReviewStatus !== 'pending') fail('safetyBoundary professionalReviewStatus must be pending');
  if (payload.safetyBoundary?.professionallyReviewed !== false) fail('safetyBoundary professionallyReviewed must be false');
  if (payload.safetyBoundary?.canAffectScoring !== false) fail('safetyBoundary canAffectScoring must be false');
  if (payload.safetyBoundary?.canAffectPublicSeverity !== false) fail('safetyBoundary canAffectPublicSeverity must be false');
  if (payload.safetyBoundary?.canBeUsedForClinicalAction !== false) fail('safetyBoundary canBeUsedForClinicalAction must be false');

  let total = 0;
  const ids = new Set();
  for (const key of CANDIDATE_ARRAYS) {
    const rows = payload[key];
    if (!Array.isArray(rows)) {
      fail(`${key} must be an array`);
      continue;
    }
    total += rows.length;
    const countKey = key;
    if ((payload.counts?.[countKey] || 0) !== rows.length) fail(`counts.${countKey} must match ${key}.length`);
    for (const row of rows) {
      const label = `${key}:${row?.id || '(missing id)'}`;
      if (!row?.id || ids.has(row.id)) fail(`${label}: id must be stable, non-empty, and unique`);
      if (row?.id) ids.add(row.id);
      if (!row.suggestedTarget) fail(`${label}: suggestedTarget is required`);
      if (!row.candidateCategory) fail(`${label}: candidateCategory is required`);
      if (row.candidateStatus !== 'source_linked_unverified') fail(`${label}: candidateStatus must be source_linked_unverified`);
      if (row.reviewStatus !== 'source_linked_pending_verification') fail(`${label}: reviewStatus must be source_linked_pending_verification`);
      if (row.professionalReviewStatus !== 'pending') fail(`${label}: professionalReviewStatus must be pending`);
      if (row.professionallyReviewed !== false) fail(`${label}: professionallyReviewed must be false`);
      if (row.canAffectScoring !== false) fail(`${label}: canAffectScoring must be false`);
      if (row.canAffectPublicSeverity !== false) fail(`${label}: canAffectPublicSeverity must be false`);
      if (row.canBeUsedForClinicalAction !== false) fail(`${label}: canBeUsedForClinicalAction must be false`);
      if (row.displayBadge !== 'Pending verification') fail(`${label}: displayBadge must be Pending verification`);
      if (row.publicSeverity && row.publicSeverity !== 'pending_unrated') fail(`${label}: publicSeverity must remain pending_unrated`);
      if (row.suggestedSeverity && row.suggestedSeverity !== 'pending_unrated') fail(`${label}: suggestedSeverity must remain pending_unrated`);
      if (!Array.isArray(row.evidenceIdentifiers) || !row.evidenceIdentifiers.length) fail(`${label}: evidenceIdentifiers must be non-empty`);
      if (/clinical action|approved|validated|severity upgrade|\bpromotion\b/i.test(`${row.title || ''} ${row.summary || ''}`)) {
        fail(`${label}: public text overstates review, actionability, severity, or promotion`);
      }
      validateNoRawPayloadShape(row, label);
    }
  }
  if ((payload.counts?.totalCandidates || 0) !== total) fail('counts.totalCandidates must match all candidate arrays');
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  sourceRecords: payload.sourceRecords,
  counts: payload.counts,
  candidateExpandedCounts: payload.candidateExpandedCounts,
}, null, 2));
