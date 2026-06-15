#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { ROOT } from '../enrich/lib/medcheck-source-loader.js';
import { readJson } from '../enrich/lib/enrichment-common.js';

const data = readJson(resolve(ROOT, 'data/enrichment/review-queue/enrichment-review-queue-v2.json'), null);
const generated = readFileSync(resolve(ROOT, 'src/data/generatedEnrichmentReviewData.js'), 'utf8');
const ui = readFileSync(resolve(ROOT, 'src/ui/renderOpenTargetsReviewWorkbench.js'), 'utf8');
const errors = [];

if (data?.schema !== 'diognosis.enrichment-review-queue.v2') errors.push('queue v2 missing');
if (!generated.includes('GENERATED_ENRICHMENT_REVIEW_DATA')) errors.push('generated review data module missing');
if (!generated.includes('must not affect scoring')) errors.push('generated module lacks scoring boundary comment');
if (!ui.includes('knowledge_queue')) errors.push('Review Workbench does not expose knowledge queue rows');
if (!ui.includes('GENERATED_ENRICHMENT_REVIEW_DATA')) errors.push('Review Workbench does not read generated enrichment review data');

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, queueV2Items: data.totalItems || 0 }, null, 2));
