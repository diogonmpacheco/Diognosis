#!/usr/bin/env node
import { existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { ROOT } from '../enrich/lib/medcheck-source-loader.js';
import { readJson } from '../enrich/lib/enrichment-common.js';

const DIR = resolve(ROOT, 'data/enrichment/candidates');
const errors = [];
let stores = 0;
let candidates = 0;

if (!existsSync(DIR)) errors.push('candidate store directory missing');
else {
  for (const name of readdirSync(DIR).filter(file => file.startsWith('candidate-') && file.endsWith('.json')).sort()) {
    const file = join(DIR, name);
    const store = readJson(file, null);
    stores += 1;
    if (store?.schema !== 'diognosis.candidate-relation-store.v1') errors.push(`${name}: invalid schema`);
    for (const row of store?.candidates || []) {
      candidates += 1;
      if (!row.candidateId) errors.push(`${name}: candidate missing id`);
      if (row.governance?.reviewRequired !== true) errors.push(`${row.candidateId}: reviewRequired must be true`);
      if (row.governance?.canAutoPromote) errors.push(`${row.candidateId}: canAutoPromote must be false`);
      if (row.governance?.canAffectScoring) errors.push(`${row.candidateId}: canAffectScoring must be false`);
      if (row.governance?.canAffectPublicSeverity) errors.push(`${row.candidateId}: canAffectPublicSeverity must be false`);
      if (row.sourceSupportStatus === 'model_only_review_prompt' && row.sourceRecords?.length) {
        errors.push(`${row.candidateId}: model-only hypothesis should not claim source records`);
      }
    }
  }
}

if (stores === 0) errors.push('no candidate stores found');

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, stores, candidates }, null, 2));
