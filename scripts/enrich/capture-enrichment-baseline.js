#!/usr/bin/env node
import { copyFileSync } from 'fs';
import { resolve } from 'path';
import { ROOT } from './lib/medcheck-source-loader.js';
import { markdownTable, readJson, writeJson, writeText, ensureDir } from './lib/enrichment-common.js';

const QUEUE = resolve(ROOT, 'data/enrichment/review-queue/enrichment-review-queue.json');
const GROUPED = resolve(ROOT, 'data/enrichment/review-queue/grouped-review-candidates.json');
const ARCHIVE_DIR = resolve(ROOT, 'data/enrichment/review-queue/archive');
const ARCHIVE_QUEUE = resolve(ARCHIVE_DIR, 'enrichment-review-queue-pre-v2.json');
const ARCHIVE_GROUPED = resolve(ARCHIVE_DIR, 'grouped-review-candidates-pre-v2.json');
const OUT_JSON = resolve(ROOT, 'docs/audits/enrichment-continuation-baseline.json');
const OUT_MD = resolve(ROOT, 'docs/audits/enrichment-continuation-baseline.md');

function priorityCounts(items = []) {
  return items.reduce((acc, item) => {
    const key = item.priority || item.reviewPriority || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function countFlag(items, key) {
  return items.filter(item => item[key] === true || item.governance?.[key] === true).length;
}

const queue = readJson(QUEUE, { items: [] });
const grouped = readJson(GROUPED, { candidates: [] });
const items = Array.isArray(queue) ? queue : (queue.items || []);
const groups = Array.isArray(grouped) ? grouped : (grouped.candidates || []);

ensureDir(ARCHIVE_DIR);
copyFileSync(QUEUE, ARCHIVE_QUEUE);
copyFileSync(GROUPED, ARCHIVE_GROUPED);

const report = {
  schema: 'diognosis.enrichment-continuation-baseline.v1',
  generatedAt: new Date().toISOString(),
  archived: {
    queue: 'data/enrichment/review-queue/archive/enrichment-review-queue-pre-v2.json',
    grouped: 'data/enrichment/review-queue/archive/grouped-review-candidates-pre-v2.json',
  },
  queue: {
    schema: queue.schema || 'unknown',
    totalItems: items.length,
    priorityCounts: priorityCounts(items),
    canAutoPromoteItems: countFlag(items, 'canAutoPromote'),
    canAffectScoringItems: countFlag(items, 'canAffectScoring'),
    professionalReviewClaimItems: items.filter(item => /reviewed|professional/i.test(String(item.professionalReviewStatus || item.reviewStatus || ''))).length,
    topP1: items.filter(item => (item.priority || item.reviewPriority) === 'P1').slice(0, 25),
  },
  grouped: {
    schema: grouped.schema || 'unknown',
    totalCandidates: groups.length,
    priorityCounts: priorityCounts(groups),
    sourceCounts: grouped.sourceCounts || groups.reduce((acc, item) => {
      const key = item.source || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
    canAutoPromoteItems: countFlag(groups, 'canAutoPromote'),
  },
  unrelatedUntrackedFilesPolicy: 'leave_unrelated_untracked_files_untouched',
  reviewBoundary: 'archive_only_no_core_promotion',
};

writeJson(OUT_JSON, report);
writeText(OUT_MD, renderMarkdown(report));
console.log(JSON.stringify({ ok: true, queueItems: items.length, p1: report.queue.priorityCounts.P1 || 0, groupedCandidates: groups.length }, null, 2));

function renderMarkdown(report) {
  return `# Enrichment Continuation Baseline

Generated: ${report.generatedAt}

- Archived queue: \`${report.archived.queue}\`
- Archived grouped candidates: \`${report.archived.grouped}\`
- Queue items: ${report.queue.totalItems}
- P1 queue items: ${report.queue.priorityCounts.P1 || 0}
- P2 queue items: ${report.queue.priorityCounts.P2 || 0}
- P3 queue items: ${report.queue.priorityCounts.P3 || 0}
- Grouped candidates: ${report.grouped.totalCandidates}
- Auto-promotable queue items: ${report.queue.canAutoPromoteItems}
- Scoring-enabled queue items: ${report.queue.canAffectScoringItems}

The v1 queue is preserved as the pre-v2 baseline. The next generators add candidate relation grouping beside it; they do not promote staged records into core data.

## Top P1 Queue Items

${markdownTable(['ID', 'Target', 'Reason'], report.queue.topP1.map(item => [
    item.id,
    item.suggestedTarget || 'review_only',
    item.reason || '',
  ]))}
`;
}
