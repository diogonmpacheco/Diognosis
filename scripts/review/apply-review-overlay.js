#!/usr/bin/env node
import { resolve } from 'path';
import { ROOT } from '../enrich/lib/diognosis-source-loader.js';
import { loadAllStagedRecords, readJson, writeJson } from '../enrich/lib/enrichment-common.js';

function parseArgs(argv) {
  const args = {
    overlay: 'data/review-overlays/example-local-review-overlay.json',
    out: 'data/review-overlays/applied-review-overlay.json',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--overlay') args.overlay = argv[++i];
    else if (arg.startsWith('--overlay=')) args.overlay = arg.slice(10);
    else if (arg === '--out') args.out = argv[++i];
    else if (arg.startsWith('--out=')) args.out = arg.slice(6);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const overlay = readJson(resolve(ROOT, args.overlay), null);
if (!overlay) throw new Error(`Unable to read overlay: ${args.overlay}`);
const { records } = loadAllStagedRecords();
const byId = new Map(records.map(record => [record.id, record]));
const applied = [];
const missing = [];

for (const review of overlay.reviews || []) {
  const record = byId.get(review.recordId);
  if (!record) {
    missing.push(review.recordId);
    continue;
  }
  applied.push({
    recordId: record.id,
    overlayId: overlay.overlayId,
    localReviewStatus: review.decision === 'approve_locally' ? 'local_reviewed' : review.decision,
    displayLabel: overlay.policy?.displayLabel || `Locally reviewed by ${overlay.name}`,
    canAffectLocalScoring: Boolean(overlay.policy?.canAffectLocalScoring),
    canAffectPublicSeverity: false,
    upstreamProfessionalReviewStatus: record.governance?.professionalReviewStatus || 'pending',
  });
}

const report = {
  schema: 'diognosis.applied-review-overlay.v1',
  generatedAt: new Date().toISOString(),
  overlayId: overlay.overlayId,
  overlayName: overlay.name,
  applied,
  missing,
  note: 'Applied overlays are local/fork-scoped and do not mutate upstream staged records.',
};

writeJson(resolve(ROOT, args.out), report);
console.log(JSON.stringify({ ok: true, applied: applied.length, missing: missing.length, out: resolve(ROOT, args.out) }, null, 2));
