#!/usr/bin/env node
import { resolve } from 'path';
import { ROOT } from '../enrich/lib/diognosis-source-loader.js';
import { readJson } from '../enrich/lib/enrichment-common.js';

const REPORT = resolve(ROOT, 'data/enrichment/review-queue/grouped-review-candidates.json');
const report = readJson(REPORT, { candidates: [] });
const errors = [];

for (const item of report.candidates || []) {
  if (!item.candidateId) errors.push('candidate missing candidateId');
  if (!item.records?.length) errors.push(`${item.candidateId}: no source records`);
  if (item.governance?.canAutoPromote) errors.push(`${item.candidateId}: grouped candidates cannot auto-promote`);
  if (item.governance?.reviewRequired !== true) errors.push(`${item.candidateId}: reviewRequired must be true`);
  if (!['P1', 'P2', 'P3'].includes(item.priority)) errors.push(`${item.candidateId}: invalid priority`);
}

const hasClinPgx = (report.candidates || []).some(item => item.source === 'ClinPGx');
const hasCpic = (report.candidates || []).some(item => item.source === 'CPIC Data');
if (!hasClinPgx) errors.push('No ClinPGx grouped candidates found');
if (!hasCpic) errors.push('No CPIC grouped candidates found');

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, groupedReviewCandidates: report.candidates.length }, null, 2));
