#!/usr/bin/env node
import { resolve } from 'path';
import { ROOT } from './lib/diognosis-source-loader.js';
import { markdownTable, readJson, writeJson, writeText } from './lib/enrichment-common.js';

const LEGACY_QUEUE = resolve(ROOT, 'data/enrichment/review-queue/enrichment-review-queue.json');
const GROUPED_V2 = resolve(ROOT, 'data/enrichment/review-queue/grouped-review-candidates-v2.json');
const BASELINE = resolve(ROOT, 'docs/audits/enrichment-continuation-baseline.json');
const OUT_JSON = resolve(ROOT, 'data/enrichment/review-queue/enrichment-review-queue-v2.json');
const OUT_MD = resolve(ROOT, 'docs/audits/enrichment-review-queue-v2.md');
const OUT_AUDIT = resolve(ROOT, 'docs/audits/enrichment-review-queue-v2.json');

function normalizeLegacyItem(item) {
  return {
    ...item,
    schema: 'diognosis.enrichment-review-queue-item.v2',
    id: item.id,
    lane: 'existing_enrichment_queue',
    queueVersion: 'v2_preserved_from_v1',
    reviewStatus: 'pending_professional_review',
    canAutoPromote: false,
    canAffectScoring: false,
    canAffectPublicSeverity: false,
  };
}

function itemFromGroup(group) {
  const suggestedTarget = (group.suggestedTargets || [group.suggestedTarget || 'review_only'])[0] || 'review_only';
  return {
    schema: 'diognosis.enrichment-review-queue-item.v2',
    id: `review_v2_${group.candidateId}`,
    lane: group.layer === 'engine_hypothesis' ? 'engine_hypothesis_review' : 'candidate_relation_review',
    priority: group.priority || 'P2',
    sourceRecords: group.sourceRecords || group.records || [],
    groupedCandidateId: group.candidateId,
    layer: group.layer || 'unknown',
    store: group.store || group.claimFamily || 'unknown',
    claimTypes: group.claimTypes || [group.claimFamily].filter(Boolean),
    suggestedTarget,
    reason: group.reason || group.summary || 'Candidate relation group requires professional sign-off.',
    affectedDrugs: group.drugs || [],
    affectedGenes: group.genes || [],
    affectedMetabolites: group.metabolites || [],
    evidenceIdentifiers: group.evidenceIdentifiers || [group.highestExternalTier].filter(Boolean),
    sourceTruthStatuses: group.sourceTruthStatuses || [],
    requiredHumanChecks: [
      'source faithfulness',
      'identity mapping',
      'directionality',
      'evidence tier',
      'copyright/license',
      'clinical/professional review',
    ],
    reviewStatus: 'pending_professional_review',
    canAutoPromote: false,
    canAffectScoring: false,
    canAffectPublicSeverity: false,
  };
}

const legacy = readJson(LEGACY_QUEUE, { items: [] });
const grouped = readJson(GROUPED_V2, { candidates: [] });
const baseline = readJson(BASELINE, null);
const legacyItems = (legacy.items || []).map(normalizeLegacyItem);
const relationItems = (grouped.candidates || [])
  .filter(group => group.layer !== 'legacy_structured_source')
  .map(itemFromGroup);
const items = [...legacyItems, ...relationItems]
  .sort((a, b) => a.priority.localeCompare(b.priority) || a.lane.localeCompare(b.lane) || a.id.localeCompare(b.id));

const report = {
  schema: 'diognosis.enrichment-review-queue.v2',
  generatedAt: new Date().toISOString(),
  baselineArchive: baseline?.archived || null,
  totalItems: items.length,
  preservedV1Items: legacyItems.length,
  candidateRelationItems: relationItems.length,
  priorityCounts: items.reduce((acc, item) => {
    acc[item.priority] = (acc[item.priority] || 0) + 1;
    return acc;
  }, {}),
  laneCounts: items.reduce((acc, item) => {
    acc[item.lane] = (acc[item.lane] || 0) + 1;
    return acc;
  }, {}),
  items,
};

const audit = {
  schema: 'diognosis.enrichment-review-queue-v2-audit.v1',
  generatedAt: report.generatedAt,
  totalItems: report.totalItems,
  preservedV1Items: report.preservedV1Items,
  candidateRelationItems: report.candidateRelationItems,
  priorityCounts: report.priorityCounts,
  laneCounts: report.laneCounts,
  canAutoPromote: items.filter(item => item.canAutoPromote).length,
  scoringEnabled: items.filter(item => item.canAffectScoring).length,
  publicSeverityEnabled: items.filter(item => item.canAffectPublicSeverity).length,
};

writeJson(OUT_JSON, report);
writeJson(OUT_AUDIT, audit);
writeText(OUT_MD, `# Enrichment Review Queue v2

Generated: ${report.generatedAt}

- Total queue items: ${report.totalItems}
- Preserved v1 items: ${report.preservedV1Items}
- New candidate-relation items: ${report.candidateRelationItems}
- P1: ${report.priorityCounts.P1 || 0}
- P2: ${report.priorityCounts.P2 || 0}
- P3: ${report.priorityCounts.P3 || 0}
- Auto-promotable: ${audit.canAutoPromote}
- Scoring-enabled: ${audit.scoringEnabled}
- Public severity-enabled: ${audit.publicSeverityEnabled}

The v2 queue preserves the old work and adds grouped candidate relations. Every item remains a review prompt.

${markdownTable(['Priority', 'Lane', 'Layer', 'Target', 'Affected', 'Reason'], items.slice(0, 120).map(item => [
  item.priority,
  item.lane,
  item.layer || 'legacy',
  item.suggestedTarget || 'review_only',
  [...(item.affectedDrugs || []), ...(item.affectedGenes || []), ...(item.affectedMetabolites || [])].join(' + ') || 'n/a',
  item.reason || '',
]))}
`);

console.log(JSON.stringify({ ok: true, queueItems: report.totalItems, priorityCounts: report.priorityCounts }, null, 2));
