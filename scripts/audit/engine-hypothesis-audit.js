#!/usr/bin/env node
import { resolve } from 'path';
import { ROOT } from '../enrich/lib/medcheck-source-loader.js';
import { readJson } from '../enrich/lib/enrichment-common.js';

const FILE = resolve(ROOT, 'data/enrichment/candidates/candidate-engine-hypotheses.json');
const store = readJson(FILE, null);
const errors = [];

if (store?.schema !== 'diognosis.candidate-relation-store.v1') errors.push('engine hypothesis store missing or invalid');
for (const row of store?.candidates || []) {
  if (row.sourceSupportStatus !== 'model_only_review_prompt') errors.push(`${row.candidateId}: must be model_only_review_prompt`);
  if (row.sourceRecords?.length) errors.push(`${row.candidateId}: must not claim source records`);
  if (row.governance?.canAutoPromote) errors.push(`${row.candidateId}: cannot auto-promote`);
  if (row.governance?.canAffectScoring) errors.push(`${row.candidateId}: cannot affect scoring`);
  if (row.governance?.canAffectPublicSeverity) errors.push(`${row.candidateId}: cannot affect public severity`);
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, engineHypotheses: store?.candidates?.length || 0 }, null, 2));
