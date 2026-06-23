#!/usr/bin/env node
import { resolve } from 'path';
import { ROOT } from '../lib/diognosis-source-loader.js';
import { readJson } from '../lib/enrichment-common.js';

const staged = readJson(resolve(ROOT, 'data/enrichment/staged/label-staged-records.json'), []);
const meta = readJson(resolve(ROOT, 'data/enrichment/snapshots/label-source-snapshot-metadata.json'), {});
const errors = [];

if (!Array.isArray(staged)) errors.push('label staged records must be an array');
if (meta.sourceTruthStatus && !['label_source_candidate_not_fetched', 'fetched_from_label_source', 'fetched_public_label_metadata_only'].includes(meta.sourceTruthStatus)) {
  errors.push(`unexpected label source truth status: ${meta.sourceTruthStatus}`);
}
for (const record of staged) {
  if (record.governance?.canAffectScoring) errors.push(`${record.id}: label staged record can affect scoring`);
  if (record.governance?.canAffectPublicSeverity) errors.push(`${record.id}: label staged record can affect severity`);
  if (record.governance?.reviewRequired !== true) errors.push(`${record.id}: label staged record must require review`);
  const raw = JSON.stringify(record);
  if (/"(fullText|labelText|sourceText|tableText|figureText|boxedWarningText|warningsText)"\s*:/i.test(raw)) {
    errors.push(`${record.id}: label staged record stores protected label body/source text`);
  }
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, stagedRecords: staged.length, sourceTruthStatus: meta.sourceTruthStatus || 'unknown' }, null, 2));
