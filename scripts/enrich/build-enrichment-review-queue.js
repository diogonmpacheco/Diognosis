#!/usr/bin/env node
import { resolve } from 'path';
import { ROOT } from './lib/medcheck-source-loader.js';
import { loadAllStagedRecords, markdownTable, readJson, writeJson, writeText } from './lib/enrichment-common.js';

const OUT_JSON = resolve(ROOT, 'data/enrichment/review-queue/enrichment-review-queue.json');
const OUT_MD = resolve(ROOT, 'docs/audits/enrichment-review-queue.md');
const COVERAGE = resolve(ROOT, 'docs/audits/enrichment-coverage-audit.json');
const GROUPED = resolve(ROOT, 'data/enrichment/review-queue/grouped-review-candidates.json');

function priority(record) {
  const claim = record.claim?.claimType || '';
  const source = record.source?.name || '';
  const summary = `${record.claim?.mechanismSummary || ''} ${record.claim?.clinicalSummary || ''}`;
  if (/CPIC|ClinPGx/.test(source) && /reference_gene|reference_chemical/.test(claim)) return 'P3';
  if (/CPIC|ClinPGx/.test(source) && /guideline|label|recommendation/.test(claim) && (record.claim?.genes?.length || record.claim?.drugs?.length)) return 'P1';
  if (/severe|critical|narrow|transplant|oncology|toxic|prodrug/i.test(summary)) return 'P1';
  if (/publication|pgx_pair|metabolite/.test(claim)) return 'P2';
  return 'P3';
}

function suggestedTarget(record) {
  const claim = record.claim?.claimType || '';
  if (claim === 'publication') return 'STUDY_DB';
  if (/ddi/.test(claim)) return 'KNOWN_DDI';
  if (/metabolite/.test(claim)) return 'METAB';
  if (/gene|pgx|guideline|clinical_annotation|variant|test_alert/.test(claim)) return 'GENOTYPE_EFFECTS';
  return 'review_only';
}

function queueItem(record) {
  return {
    id: `review_${record.id}`,
    priority: priority(record),
    sourceRecords: [record.id],
    suggestedTarget: suggestedTarget(record),
    reason: record.claim?.clinicalSummary || record.claim?.mechanismSummary || 'Staged enrichment candidate requires human review.',
    affectedDrugs: record.claim?.drugs || [],
    affectedGenes: record.claim?.genes || [],
    affectedMetabolites: record.claim?.metabolites || [],
    evidenceIdentifiers: [
      ...(record.evidence?.pmids || []).map(id => `PMID:${id}`),
      ...(record.evidence?.dois || []).map(id => `DOI:${id}`),
      ...(record.evidence?.sourceIdentifiers || []),
    ],
    licenseNotes: [record.source?.license, record.source?.licenseUrl].filter(Boolean),
    requiredHumanChecks: [
      'source faithfulness',
      'drug/gene mapping',
      'directionality',
      'severity wording',
      'copyright/license',
      'clinical review',
    ],
    canAutoPromote: false,
  };
}

function queueItemFromGroup(group) {
  return {
    id: `review_${group.candidateId}`,
    priority: group.priority || 'P2',
    sourceRecords: group.records || [],
    groupedCandidateId: group.candidateId,
    suggestedTarget: group.suggestedTarget || 'review_only',
    reason: group.summary || 'Grouped structured-source candidate requires human review.',
    affectedDrugs: group.drugs || [],
    affectedGenes: group.genes || [],
    affectedMetabolites: group.metabolites || [],
    evidenceIdentifiers: [group.highestExternalTier].filter(Boolean),
    licenseNotes: [group.source === 'ClinPGx' ? 'CC BY-SA 4.0' : 'source-specific'].filter(Boolean),
    requiredHumanChecks: [
      'source faithfulness',
      'drug/gene mapping',
      'directionality',
      'severity wording',
      'copyright/license',
      'clinical review',
    ],
    canAutoPromote: false,
  };
}

function main() {
  const { records } = loadAllStagedRecords();
  const coverage = readJson(COVERAGE, null);
  const grouped = readJson(GROUPED, { candidates: [] });
  const groupedRecordIds = new Set((grouped.candidates || []).flatMap(item => item.records || []));
  const items = [
    ...(grouped.candidates || []).map(queueItemFromGroup),
    ...records.filter(record => !groupedRecordIds.has(record.id)).map(queueItem),
  ].sort((a, b) => a.priority.localeCompare(b.priority) || a.id.localeCompare(b.id));
  const report = {
    schema: 'diognosis.enrichment-review-queue.v1',
    generatedAt: new Date().toISOString(),
    totalItems: items.length,
    groupedCandidateItems: grouped.candidates?.length || 0,
    rawRecordItems: records.length - groupedRecordIds.size,
    priorityCounts: items.reduce((acc, item) => {
      acc[item.priority] = (acc[item.priority] || 0) + 1;
      return acc;
    }, {}),
    coverageSummary: coverage?.counts || null,
    items,
  };
  writeJson(OUT_JSON, report);
  writeText(OUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({ ok: true, queueItems: items.length, priorityCounts: report.priorityCounts, out: OUT_JSON }, null, 2));
}

function renderMarkdown(report) {
  const rows = report.items.slice(0, 50).map(item => [
    item.priority,
    item.suggestedTarget,
    item.affectedDrugs.join(', ') || item.affectedGenes.join(', ') || 'n/a',
    item.reason,
    item.sourceRecords.join(', '),
  ]);
  return `# Enrichment Review Queue

Generated: ${report.generatedAt}

- Queue items: ${report.totalItems}
- Grouped structured-source items: ${report.groupedCandidateItems}
- Raw staged-record items: ${report.rawRecordItems}
- P1: ${report.priorityCounts.P1 || 0}
- P2: ${report.priorityCounts.P2 || 0}
- P3: ${report.priorityCounts.P3 || 0}

No item can auto-promote. Every item requires human review.

${markdownTable(['Priority', 'Suggested target', 'Affected', 'Reason', 'Source record'], rows)}
`;
}

main();
