#!/usr/bin/env node
import { resolve } from 'path';
import { ROOT, readGeneratedConstObject } from '../enrich/lib/diognosis-source-loader.js';

const SOURCE = resolve(ROOT, 'src/data/generatedPendingReviewEnrichment.js');
const payload = readGeneratedConstObject(SOURCE, 'PENDING_REVIEW_ENRICHMENT');
const errors = [];

const ABSOLUTE_PATH_PATTERNS = [
  /\/Users\//,
  /file:\/\/\/Users\//,
  /Documents\/GitHub\/diognosis/,
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

function validateNoRawPayloadShape(record) {
  for (const [key, value] of Object.entries(record || {})) {
    if (FORBIDDEN_KEYS.some(pattern => pattern.test(key))) fail(`${record.id}: forbidden raw/full-text key ${key}`);
    if (hasAbsolutePath(value)) fail(`${record.id}: local absolute path in ${key}`);
    if (Array.isArray(value)) {
      if (value.some(item => !isPrimitive(item))) fail(`${record.id}: array ${key} contains nested objects`);
      if (value.some(item => String(item || '').length > 500)) fail(`${record.id}: array ${key} contains oversized text`);
      continue;
    }
    if (!isPrimitive(value)) fail(`${record.id}: nested object not allowed in compact record field ${key}`);
    if (typeof value === 'string' && value.length > 700) fail(`${record.id}: oversized text in ${key}`);
  }
}

if (!payload) {
  fail('PENDING_REVIEW_ENRICHMENT was not found');
} else {
  if (payload.schema !== 'diognosis.pending-review-enrichment.v1') fail('schema must be diognosis.pending-review-enrichment.v1');
  if (!Array.isArray(payload.records)) fail('records must be an array');
  if ((payload.exportedRecords || 0) > (payload.totalStagedRecords || 0)) fail('exportedRecords cannot exceed totalStagedRecords');
  if (payload.records && payload.exportedRecords !== payload.records.length) fail('exportedRecords must match records.length');
  if (payload.safetyBoundary?.professionalReviewStatus !== 'pending') fail('safetyBoundary professionalReviewStatus must be pending');
  if (payload.safetyBoundary?.requiresHumanReview !== true) fail('safetyBoundary requiresHumanReview must be true');
  if (payload.safetyBoundary?.canAffectScoring !== false) fail('safetyBoundary canAffectScoring must be false');
  if (payload.safetyBoundary?.canAffectPublicSeverity !== false) fail('safetyBoundary canAffectPublicSeverity must be false');
  if (payload.safetyBoundary?.canBeUsedForClinicalAction !== false) fail('safetyBoundary canBeUsedForClinicalAction must be false');

  const ids = new Set();
  for (const record of payload.records || []) {
    if (!record.id || ids.has(record.id)) fail(`${record.id || '(missing id)'}: source id must be stable, non-empty, and unique`);
    ids.add(record.id);
    if (!record.sourceKey) fail(`${record.id}: sourceKey is required`);
    if (!record.sourceName) fail(`${record.id}: sourceName is required`);
    if (record.reviewStatus !== 'needs_human_review') fail(`${record.id}: reviewStatus must be needs_human_review`);
    if (record.professionalReviewStatus !== 'pending') fail(`${record.id}: professionalReviewStatus must be pending`);
    if (record.canAffectScoring !== false) fail(`${record.id}: canAffectScoring must be false`);
    if (record.canAffectPublicSeverity !== false) fail(`${record.id}: canAffectPublicSeverity must be false`);
    if (record.displayBadge !== 'Professional sign-off required') fail(`${record.id}: displayBadge must be Professional sign-off required`);
    if (!Array.isArray(record.evidenceIdentifiers) || !record.evidenceIdentifiers.length) fail(`${record.id}: evidenceIdentifiers must be non-empty`);
    if (/clinical action|approved|validated|severity upgrade|\bpromotion\b/i.test(`${record.title || ''} ${record.summary || ''}`)) {
      fail(`${record.id}: public text overstates review, actionability, severity, or promotion`);
    }
    validateNoRawPayloadShape(record);
  }
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  records: payload.records.length,
  sourceCounts: payload.exportedSourceCounts || {},
}, null, 2));
