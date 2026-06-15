#!/usr/bin/env node
import { createHash } from 'crypto';
import { resolve } from 'path';
import { ROOT } from '../enrich/lib/medcheck-source-loader.js';
import { loadAllStagedRecords, writeJson } from '../enrich/lib/enrichment-common.js';
import { stableToken } from '../enrich/lib/staged-source-schema.js';

function parseArgs(argv) {
  const args = { decision: 'checked_by_maintainer', reviewer: 'maintainer', notes: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--record') args.record = argv[++i];
    else if (arg.startsWith('--record=')) args.record = arg.slice(9);
    else if (arg === '--decision') args.decision = argv[++i];
    else if (arg.startsWith('--decision=')) args.decision = arg.slice(11);
    else if (arg === '--reviewer') args.reviewer = argv[++i];
    else if (arg.startsWith('--reviewer=')) args.reviewer = arg.slice(11);
    else if (arg === '--notes') args.notes = argv[++i];
    else if (arg.startsWith('--notes=')) args.notes = arg.slice(8);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.record) throw new Error('Usage: node scripts/review/source-faithfulness-review.js --record candidate_...');
if (!['checked_by_maintainer', 'needs_full_text', 'source_mismatch', 'not_applicable'].includes(args.decision)) {
  throw new Error(`Unsupported source-faithfulness decision: ${args.decision}`);
}

const { records } = loadAllStagedRecords();
const record = records.find(row => row.id === args.record);
if (!record) throw new Error(`Staged record not found: ${args.record}`);

const reviewId = `source_faithfulness_${stableToken(args.decision)}_${createHash('sha256').update(`${record.id}:${Date.now()}`).digest('hex').slice(0, 10)}`;
const decision = {
  schema: 'diognosis.source-faithfulness-review.v1',
  reviewId,
  recordId: record.id,
  reviewer: args.reviewer,
  reviewDate: new Date().toISOString().slice(0, 10),
  decision: args.decision,
  notes: args.notes,
  stillPendingProfessionalReview: true,
  canAffectScoring: false,
};

const out = resolve(ROOT, `data/enrichment/source-faithfulness-decisions/${reviewId}.json`);
writeJson(out, decision);
console.log(JSON.stringify({ ok: true, reviewId, out }, null, 2));
