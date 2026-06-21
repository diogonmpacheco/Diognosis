#!/usr/bin/env node
import { createHash } from 'crypto';
import { resolve } from 'path';
import { ROOT } from './lib/diognosis-source-loader.js';
import { loadAllStagedRecords, writeJson } from './lib/enrichment-common.js';
import { stableToken } from './lib/staged-source-schema.js';

function parseArgs(argv) {
  const args = { target: 'review_only', reviewer: 'maintainer', notes: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--record') args.record = argv[++i];
    else if (arg.startsWith('--record=')) args.record = arg.slice(9);
    else if (arg === '--target') args.target = argv[++i];
    else if (arg.startsWith('--target=')) args.target = arg.slice(9);
    else if (arg === '--claim-summary') args.claimSummary = argv[++i];
    else if (arg.startsWith('--claim-summary=')) args.claimSummary = arg.slice(16);
    else if (arg === '--reviewer') args.reviewer = argv[++i];
    else if (arg.startsWith('--reviewer=')) args.reviewer = arg.slice(11);
    else if (arg === '--notes') args.notes = argv[++i];
    else if (arg.startsWith('--notes=')) args.notes = arg.slice(8);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.record) throw new Error('Usage: node scripts/enrich/promote-to-curated-draft.js --record candidate_...');
if (/\bDRUG_DB\b/i.test(args.target || '')) {
  throw new Error('Promotion to DRUG_DB is blocked. New drugs require deliberate hand curation from primary regulatory/clinical sources.');
}

const { records } = loadAllStagedRecords();
const record = records.find(row => row.id === args.record);
if (!record) throw new Error(`Staged record not found: ${args.record}`);

const evidenceIds = [
  ...(record.evidence?.pmids || []).map(id => `PMID:${id}`),
  ...(record.evidence?.dois || []).map(id => `DOI:${id}`),
  ...(record.evidence?.sourceIdentifiers || []),
].filter(Boolean);
if (!evidenceIds.length) throw new Error('Curated draft requires a PMID, DOI, label, guideline, or source identifier.');

const hash = createHash('sha256').update(record.id).digest('hex').slice(0, 10);
const draftId = `curated_draft_${stableToken(record.source?.name)}_${stableToken(record.claim?.claimType)}_${hash}`;
const draft = {
  schema: 'diognosis.curated-draft.v1',
  draftId,
  sourceRecordIds: [record.id],
  target: args.target,
  claimSummary: args.claimSummary || record.claim?.clinicalSummary || record.claim?.mechanismSummary || '',
  sourceFaithfulnessStatus: 'checked_by_maintainer',
  professionalReviewStatus: 'pending',
  canAffectScoring: false,
  canAffectPublicSeverity: false,
  displayStatus: 'curated_preview_pending_professional_review',
  reviewNotes: [
    {
      reviewer: args.reviewer,
      date: new Date().toISOString().slice(0, 10),
      notes: args.notes || 'Source identifier and mapping checked by maintainer; still without professional sign-off.',
    },
  ],
  requiredNextReview: ['clinical reviewer', 'pharmacist reviewer', 'source update check'],
};

const out = resolve(ROOT, `data/enrichment/curated-drafts/${draftId}.json`);
writeJson(out, draft);
console.log(JSON.stringify({ ok: true, draftId, out }, null, 2));
