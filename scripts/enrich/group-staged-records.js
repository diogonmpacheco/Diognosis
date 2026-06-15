#!/usr/bin/env node
import { resolve } from 'path';
import { ROOT } from './lib/diognosis-source-loader.js';
import { loadAllStagedRecords, markdownTable, writeJson, writeText } from './lib/enrichment-common.js';
import { stableToken } from './lib/staged-source-schema.js';

const OUT_JSON = resolve(ROOT, 'data/enrichment/review-queue/grouped-review-candidates.json');
const OUT_MD = resolve(ROOT, 'docs/audits/grouped-review-candidates.md');

function claimFamily(claimType = '') {
  if (/guideline|recommendation|test_alert/.test(claimType)) return 'guideline_recommendation';
  if (/clinical_annotation|variant_annotation|drug_label/.test(claimType)) return 'clinical_annotation';
  if (/coverage_gap|pgx_pair/.test(claimType)) return 'pgx_coverage';
  return claimType || 'other';
}

function groupKey(record) {
  const genes = (record.claim?.genes || []).join('+') || 'no_gene';
  const drugs = (record.claim?.drugs || []).join('+') || 'no_drug';
  const mets = (record.claim?.metabolites || []).join('+') || 'no_metabolite';
  const markers = (record.claim?.riskMarkers || []).slice(0, 2).join('+') || 'no_marker';
  const tier = record.evidence?.strongestExternalTier || 'unknown_tier';
  return [record.source?.name, claimFamily(record.claim?.claimType), genes, drugs, mets, markers, tier].map(stableToken).join('|');
}

function priorityForGroup(group) {
  const text = `${group.claimFamily} ${group.genes.join(' ')} ${group.drugs.join(' ')} ${group.highestExternalTier}`;
  if (/1A|1B|CPIC|guideline|recommendation|label/i.test(text) && (group.genes.length || group.drugs.length)) return 'P1';
  if (/unsupported|no_gene|no_drug/i.test(text)) return 'P3';
  return 'P2';
}

function suggestedTarget(group) {
  if (/guideline|clinical|pgx|variant|label/.test(group.claimFamily)) return 'GENOTYPE_EFFECTS';
  if (/metabolite/.test(group.claimFamily)) return 'METAB';
  return 'review_only';
}

const { records } = loadAllStagedRecords();
const grouped = new Map();

for (const record of records.filter(row => ['CPIC Data', 'ClinPGx'].includes(row.source?.name))) {
  const key = groupKey(record);
  if (!grouped.has(key)) {
    grouped.set(key, {
      candidateId: `grouped_${key.replace(/\\|/g, '_')}`,
      source: record.source?.name || '',
      claimFamily: claimFamily(record.claim?.claimType),
      genes: [],
      drugs: [],
      metabolites: [],
      riskMarkers: [],
      records: [],
      recordCount: 0,
      highestExternalTier: record.evidence?.strongestExternalTier || '',
      matchedDiognosisRows: [],
      suggestedTarget: 'review_only',
      priority: 'P2',
      summary: '',
      governance: {
        canAutoPromote: false,
        reviewRequired: true,
      },
    });
  }
  const group = grouped.get(key);
  group.records.push(record.id);
  group.recordCount += 1;
  group.genes = [...new Set([...group.genes, ...(record.claim?.genes || [])])].filter(Boolean);
  group.drugs = [...new Set([...group.drugs, ...(record.claim?.drugs || [])])].filter(Boolean);
  group.metabolites = [...new Set([...group.metabolites, ...(record.claim?.metabolites || [])])].filter(Boolean);
  group.riskMarkers = [...new Set([...group.riskMarkers, ...(record.claim?.riskMarkers || [])])].filter(Boolean);
  group.matchedDiognosisRows = [...new Set([...group.matchedDiognosisRows, ...(record.mapping?.possibleExistingRows || []), ...(record.mapping?.matchedEvidenceRefs || [])])].filter(Boolean);
  if (!group.highestExternalTier && record.evidence?.strongestExternalTier) group.highestExternalTier = record.evidence.strongestExternalTier;
}

const candidates = [...grouped.values()].map(group => ({
  ...group,
  suggestedTarget: suggestedTarget(group),
  priority: priorityForGroup(group),
  summary: `${group.source} ${group.claimFamily} review candidate for ${group.genes.join(', ') || 'unmapped gene'} / ${group.drugs.join(', ') || 'unmapped drug'} (${group.recordCount} staged record${group.recordCount === 1 ? '' : 's'}).`,
})).sort((a, b) => a.priority.localeCompare(b.priority) || b.recordCount - a.recordCount || a.candidateId.localeCompare(b.candidateId));

const report = {
  schema: 'diognosis.grouped-review-candidates.v1',
  generatedAt: new Date().toISOString(),
  totalCandidates: candidates.length,
  sourceCounts: candidates.reduce((acc, item) => {
    acc[item.source] = (acc[item.source] || 0) + 1;
    return acc;
  }, {}),
  candidates,
};

writeJson(OUT_JSON, report);
writeText(OUT_MD, renderMarkdown(report));
console.log(JSON.stringify({ ok: true, groupedReviewCandidates: candidates.length, out: OUT_JSON }, null, 2));

function renderMarkdown(report) {
  return `# Grouped Review Candidates

Generated: ${report.generatedAt}

- Grouped candidates: ${report.totalCandidates}
- CPIC groups: ${report.sourceCounts['CPIC Data'] || 0}
- ClinPGx groups: ${report.sourceCounts.ClinPGx || 0}

${markdownTable(['Priority', 'Source', 'Claim family', 'Gene', 'Drug', 'Records', 'Summary'], report.candidates.slice(0, 80).map(item => [
    item.priority,
    item.source,
    item.claimFamily,
    item.genes.join(', ') || 'n/a',
    item.drugs.join(', ') || 'n/a',
    item.recordCount,
    item.summary,
  ]))}
`;
}
