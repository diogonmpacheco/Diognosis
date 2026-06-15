#!/usr/bin/env node
import { resolve } from 'path';
import { ROOT } from '../enrich/lib/diognosis-source-loader.js';
import { readJson } from '../enrich/lib/enrichment-common.js';

const dashboard = readJson(resolve(ROOT, 'docs/audits/knowledge-growth-dashboard.json'), null);
const errors = [];

if (dashboard?.schema !== 'diognosis.knowledge-growth-dashboard.v1') errors.push('knowledge growth dashboard missing');
if ((dashboard?.review?.professionallyReviewedEntries || 0) !== 0) {
  errors.push('dashboard must not claim professionally reviewed shipped entries');
}
if ((dashboard?.candidates?.totalCandidates || 0) <= 0) errors.push('candidate layer did not generate any review rows');
if ((dashboard?.review?.queueV2Items || 0) < (dashboard?.candidates?.totalCandidates || 0) / 4) {
  errors.push('queue v2 looks unexpectedly small relative to candidate layer');
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  candidateRows: dashboard.candidates.totalCandidates,
  queueV2Items: dashboard.review.queueV2Items,
  recommendation: dashboard.recommendation,
}, null, 2));
