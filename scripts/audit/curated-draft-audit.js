#!/usr/bin/env node
import { existsSync, readdirSync, statSync } from 'fs';
import { extname, join, resolve } from 'path';
import { ROOT } from '../enrich/lib/medcheck-source-loader.js';
import { readJson } from '../enrich/lib/enrichment-common.js';

const DIR = resolve(ROOT, 'data/enrichment/curated-drafts');
const files = existsSync(DIR) ? listJson(DIR) : [];
const errors = [];

for (const file of files) {
  const draft = readJson(file, null);
  if (!draft) {
    errors.push(`${file}: invalid JSON`);
    continue;
  }
  if (draft.schema !== 'diognosis.curated-draft.v1') errors.push(`${file}: invalid schema`);
  if (!draft.draftId) errors.push(`${file}: missing draftId`);
  if (!draft.sourceRecordIds?.length) errors.push(`${file}: missing sourceRecordIds`);
  if (draft.sourceFaithfulnessStatus !== 'checked_by_maintainer') errors.push(`${file}: curated draft must be maintainer source-faithfulness checked`);
  if (draft.professionalReviewStatus !== 'pending') errors.push(`${file}: curated draft must remain pending professional review`);
  if (draft.canAffectScoring) errors.push(`${file}: curated draft cannot affect scoring`);
  if (draft.canAffectPublicSeverity) errors.push(`${file}: curated draft cannot affect public severity`);
  if (draft.displayStatus !== 'curated_preview_pending_professional_review') {
    errors.push(`${file}: curated draft display status must remain pending professional review`);
  }
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, curatedDrafts: files.length }, null, 2));

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
