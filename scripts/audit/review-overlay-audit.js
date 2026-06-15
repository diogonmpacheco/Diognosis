#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { extname, join, resolve } from 'path';
import { ROOT } from '../enrich/lib/diognosis-source-loader.js';
import { readJson } from '../enrich/lib/enrichment-common.js';

const DIR = resolve(ROOT, 'data/review-overlays');
const errors = [];
const files = existsSync(DIR) ? listJson(DIR) : [];

for (const file of files) {
  const overlay = readJson(file, null);
  if (!overlay) {
    errors.push(`${file}: invalid JSON`);
    continue;
  }
  if (overlay.schema !== 'diognosis.review-overlay.v1') errors.push(`${file}: invalid schema`);
  if (!overlay.overlayId) errors.push(`${file}: missing overlayId`);
  if (!overlay.name) errors.push(`${file}: missing name`);
  if (overlay.policy?.canAffectPublicSeverity) errors.push(`${file}: local overlays cannot affect upstream public severity`);
  if (/professionally reviewed|upstream reviewed/i.test(overlay.policy?.displayLabel || '')) {
    errors.push(`${file}: displayLabel must stay local/fork-scoped`);
  }
  for (const review of overlay.reviews || []) {
    if (!review.recordId) errors.push(`${file}: review missing recordId`);
    if (!['approve_locally', 'local_pending', 'local_rejected', 'local_superseded'].includes(review.decision)) {
      errors.push(`${file}: local review decision must stay local-scoped (${review.decision || 'missing'})`);
    }
    if (review.professionalReviewStatus || review.upstreamProfessionalReviewStatus || review.decision === 'approve_professionally') {
      errors.push(`${file}: local overlay cannot claim upstream professional review`);
    }
  }
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, overlays: files.length }, null, 2));

function listJson(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const file = join(dir, entry);
    const stats = statSync(file);
    if (stats.isDirectory()) out.push(...listJson(file));
    else if (extname(file) === '.json') out.push(file);
  }
  return out;
}
