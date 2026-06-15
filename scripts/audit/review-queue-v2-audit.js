#!/usr/bin/env node
import { resolve } from 'path';
import { ROOT } from '../enrich/lib/diognosis-source-loader.js';
import { readJson } from '../enrich/lib/enrichment-common.js';

const queue = readJson(resolve(ROOT, 'data/enrichment/review-queue/enrichment-review-queue-v2.json'), null);
const baseline = readJson(resolve(ROOT, 'docs/audits/enrichment-continuation-baseline.json'), null);
const errors = [];

if (queue?.schema !== 'diognosis.enrichment-review-queue.v2') errors.push('v2 queue missing or invalid schema');
if (!baseline?.archived?.queue) errors.push('pre-v2 baseline archive summary missing');
if ((queue?.preservedV1Items || 0) < (baseline?.queue?.totalItems || 0)) {
  errors.push(`v2 queue preserved ${queue?.preservedV1Items || 0} items, below baseline ${baseline?.queue?.totalItems || 0}`);
}
for (const item of queue?.items || []) {
  if (item.canAutoPromote) errors.push(`${item.id}: canAutoPromote must be false`);
  if (item.canAffectScoring) errors.push(`${item.id}: canAffectScoring must be false`);
  if (item.canAffectPublicSeverity) errors.push(`${item.id}: canAffectPublicSeverity must be false`);
  if (!['P1', 'P2', 'P3'].includes(item.priority)) errors.push(`${item.id}: invalid priority`);
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, queueItems: queue?.totalItems || 0, preservedV1Items: queue?.preservedV1Items || 0 }, null, 2));
