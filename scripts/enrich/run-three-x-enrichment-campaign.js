#!/usr/bin/env node
import { resolve } from 'path';
import { ROOT } from './lib/medcheck-source-loader.js';
import { markdownTable, readJson, writeJson, writeText } from './lib/enrichment-common.js';

const DASHBOARD = resolve(ROOT, 'docs/audits/knowledge-growth-dashboard.json');
const QUEUE_V2 = resolve(ROOT, 'data/enrichment/review-queue/enrichment-review-queue-v2.json');
const OUT_JSON = resolve(ROOT, 'docs/audits/three-x-enrichment-report.json');
const OUT_MD = resolve(ROOT, 'docs/audits/three-x-enrichment-report.md');
const BASELINE_JSON = resolve(ROOT, 'docs/audits/three-x-baseline.json');
const BASELINE_MD = resolve(ROOT, 'docs/audits/three-x-baseline.md');

const dashboard = readJson(DASHBOARD, null);
const queue = readJson(QUEUE_V2, { items: [] });
if (!dashboard) throw new Error('Knowledge growth dashboard must be generated before the 3x campaign report.');

const layerRows = Object.entries(dashboard.core || {}).map(([area, current]) => {
  const target = dashboard.threeXTargets?.[area] || current * 3;
  return {
    area,
    current,
    target,
    additionalNeeded: Math.max(0, target - current),
  };
});

const baseline = {
  schema: 'diognosis.three-x-baseline.v1',
  generatedAt: new Date().toISOString(),
  core: dashboard.core,
  targets: dashboard.threeXTargets,
  stagedRecords: dashboard.staged.totalRecords,
  candidateRows: dashboard.candidates.totalCandidates,
  queueV2Items: dashboard.review.queueV2Items,
};

const report = {
  schema: 'diognosis.three-x-enrichment-campaign.v1',
  generatedAt: baseline.generatedAt,
  baseline: 'docs/audits/three-x-baseline.json',
  goals: layerRows,
  reviewLayer: {
    stagedRecords: dashboard.staged.totalRecords,
    candidateRows: dashboard.candidates.totalCandidates,
    groupedV2Candidates: dashboard.review.groupedV2Candidates,
    queueV2Items: dashboard.review.queueV2Items,
    p1QueueItems: queue.priorityCounts?.P1 || 0,
    p2QueueItems: queue.priorityCounts?.P2 || 0,
    p3QueueItems: queue.priorityCounts?.P3 || 0,
  },
  promotions: {
    corePromotions: 0,
    reason: 'No source candidate was promoted to core data in this campaign. Review and source-faithfulness decisions are required first.',
  },
  recommendation: 'Prioritize P1 candidate relation groups and fetched source verification before increasing curated core counts.',
};

writeJson(BASELINE_JSON, baseline);
writeJson(OUT_JSON, report);
writeText(BASELINE_MD, `# 3x Enrichment Baseline

Generated: ${baseline.generatedAt}

- Staged records: ${baseline.stagedRecords}
- Candidate rows: ${baseline.candidateRows}
- Queue v2 items: ${baseline.queueV2Items}

${markdownTable(['Area', 'Current', '3x target'], layerRows.map(row => [row.area, row.current, row.target]))}
`);
writeText(OUT_MD, `# 3x Enrichment Campaign Report

Generated: ${report.generatedAt}

- Staged records: ${report.reviewLayer.stagedRecords}
- Candidate rows: ${report.reviewLayer.candidateRows}
- Grouped v2 candidates: ${report.reviewLayer.groupedV2Candidates}
- Review queue v2 items: ${report.reviewLayer.queueV2Items}
- P1 queue items: ${report.reviewLayer.p1QueueItems}
- Core promotions: ${report.promotions.corePromotions}

This campaign expands the review layer, not the shipped clinical core. The next useful work is source-faithfulness review and curated drafts for the highest-priority P1 groups.

${markdownTable(['Area', 'Current', '3x target', 'Additional curated rows needed'], layerRows.map(row => [
  row.area,
  row.current,
  row.target,
  row.additionalNeeded,
]))}
`);

console.log(JSON.stringify({ ok: true, queueV2Items: report.reviewLayer.queueV2Items, corePromotions: 0 }, null, 2));
