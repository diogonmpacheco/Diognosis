#!/usr/bin/env node
import { existsSync, readdirSync, statSync } from 'fs';
import { extname, join, resolve } from 'path';
import { ROOT } from '../enrich/lib/medcheck-source-loader.js';
import { loadAllStagedRecords, readJson } from '../enrich/lib/enrichment-common.js';
import { isProfessionalReviewStatus } from '../enrich/lib/review-status-model.js';

const errors = [];
const { records } = loadAllStagedRecords();

for (const record of records) {
  if (record.governance?.canAffectScoring) errors.push(`${record.id}: staged record can affect scoring`);
  if (record.governance?.canAffectPublicSeverity) errors.push(`${record.id}: staged record can affect public severity`);
  if (isProfessionalReviewStatus(record.governance?.professionalReviewStatus) && !(record.reviews || []).some(review => review.decision === 'approve_professionally')) {
    errors.push(`${record.id}: professional review status without professional review object`);
  }
  if (record.source?.name === 'ClinPGx' && ['fetched_from_source', 'fetched_from_clinpgx_api'].includes(record.provenance?.sourceTruthStatus) && !record.provenance?.sourceSnapshotId) {
    errors.push(`${record.id}: direct ClinPGx record lacks cache metadata`);
  }
  if (record.source?.name === 'ClinPGx' && /Open Targets/i.test(record.source?.endpoint || '') && record.provenance?.sourceTruthStatus !== 'derived_from_open_targets_snapshot') {
    errors.push(`${record.id}: Open Targets-derived ClinPGx record is mislabeled as direct ClinPGx`);
  }
  if (record.source?.name === 'CPIC Data' && ['fetched_from_source', 'fetched_from_cpic_source'].includes(record.provenance?.sourceTruthStatus) && !record.provenance?.sourceSnapshotId) {
    errors.push(`${record.id}: fetched CPIC record lacks cache metadata`);
  }
}

for (const file of listJson(resolve(ROOT, 'data/enrichment/curated-drafts'))) {
  const draft = readJson(file, null);
  if (!draft || draft.schema !== 'diognosis.curated-draft.v1') continue;
  if (draft.professionalReviewStatus !== 'pending') errors.push(`${file}: curated draft claims professional review`);
  if (draft.canAffectScoring) errors.push(`${file}: curated draft can affect scoring`);
  if (draft.canAffectPublicSeverity) errors.push(`${file}: curated draft can affect public severity`);
}

for (const file of listJson(resolve(ROOT, 'data/review-overlays'))) {
  const overlay = readJson(file, null);
  if (!overlay || overlay.schema !== 'diognosis.review-overlay.v1') continue;
  if (overlay.policy?.canAffectPublicSeverity) errors.push(`${file}: local overlay can affect upstream public severity`);
  for (const review of overlay.reviews || []) {
    if (review.decision === 'approve_professionally' || review.professionalReviewStatus) {
      errors.push(`${file}: local overlay claims upstream professional review`);
    }
  }
}

for (const file of listJson(resolve(ROOT, 'data/enrichment/source-faithfulness-decisions'))) {
  const decision = readJson(file, null);
  if (!decision || decision.schema !== 'diognosis.source-faithfulness-review.v1') continue;
  if (!decision.stillPendingProfessionalReview) errors.push(`${file}: source-faithfulness review must remain pending professional review`);
  if (decision.canAffectScoring) errors.push(`${file}: source-faithfulness review can affect scoring`);
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, stagedRecords: records.length }, null, 2));

function listJson(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const file = join(dir, entry);
    const stats = statSync(file);
    if (stats.isDirectory()) out.push(...listJson(file));
    else if (extname(file) === '.json') out.push(file);
  }
  return out;
}
