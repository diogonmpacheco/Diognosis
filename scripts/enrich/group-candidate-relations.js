#!/usr/bin/env node
import { existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { ROOT } from './lib/medcheck-source-loader.js';
import { markdownTable, readJson, writeJson, writeText } from './lib/enrichment-common.js';
import { baseCandidateGovernance } from './lib/knowledge-layer-model.js';
import { stableToken } from './lib/staged-source-schema.js';

const CANDIDATE_DIR = resolve(ROOT, 'data/enrichment/candidates');
const LEGACY_GROUPED = resolve(ROOT, 'data/enrichment/review-queue/grouped-review-candidates.json');
const OUT_JSON = resolve(ROOT, 'data/enrichment/review-queue/grouped-review-candidates-v2.json');
const OUT_MD = resolve(ROOT, 'docs/audits/grouped-review-candidates-v2.md');
const OUT_AUDIT = resolve(ROOT, 'docs/audits/grouped-review-candidates-v2.json');

function readCandidateStores() {
  if (!existsSync(CANDIDATE_DIR)) return [];
  return readdirSync(CANDIDATE_DIR)
    .filter(name => name.startsWith('candidate-') && name.endsWith('.json'))
    .sort()
    .map(name => ({ name, store: readJson(join(CANDIDATE_DIR, name), null) }))
    .filter(row => row.store?.schema === 'diognosis.candidate-relation-store.v1');
}

function groupKey(row) {
  const actors = centralActors(row);
  return [
    row.layer,
    row.store,
    claimFamily(row),
    row.sourceName || row.sourceSupportStatus || 'source',
    clinicalDomain(row),
    actors.drugs.join('+') || 'no_drug',
    actors.genes.join('+') || 'no_gene',
    actors.metabolites.join('+') || 'no_metabolite',
    row.strongestExternalTier || 'no_tier',
  ].map(stableToken).join('|');
}

function claimFamily(row = {}) {
  const text = `${row.store || ''} ${row.claimType || ''} ${row.candidateKind || ''}`;
  if (/pgx|genotype|variant|allele|risk_marker|clinical_annotation|guideline_annotation/i.test(text)) return 'pgx';
  if (/interaction|ddi|contraindication|warning/i.test(text)) return 'interaction';
  if (/parent_metabolite|metabolite|active_moiety|toxic/i.test(text)) return 'parent_metabolite';
  if (/pk|washout|timing|temporal/i.test(text)) return 'pk_timing';
  if (/transporter|enzyme|pathway/i.test(text)) return 'enzyme_transporter';
  if (/receptor|phenotype|beers|geriatr/i.test(text)) return 'phenotype_safety';
  if (/label/i.test(text)) return 'label_context';
  return row.store || row.candidateKind || 'candidate';
}

function clinicalDomain(row = {}) {
  const text = [
    row.sourceName,
    row.claimType,
    row.mechanismSummary,
    ...(row.drugs || []),
    ...(row.genes || []),
    ...(row.metabolites || []),
    ...(row.pathways || []),
  ].join(' ');
  if (/tacrolimus|cyclosporine|sirolimus|everolimus|transplant|immunosuppress/i.test(text)) return 'transplant';
  if (/warfarin|apixaban|rivaroxaban|dabigatran|edoxaban|anticoag|antiplatelet|clopidogrel/i.test(text)) return 'anticoagulation_antiplatelet';
  if (/codeine|morphine|opioid|analges/i.test(text)) return 'analgesia';
  if (/capecitabine|irinotecan|tamoxifen|azathioprine|mercaptopurine|oncology|chemotherapy|thiopurine/i.test(text)) return 'oncology';
  if (/succinylcholine|bche|ryr1|anesthesia|anaesthesia/i.test(text)) return 'anesthesia';
  if (/g6pd|oxidant|hemol/i.test(text)) return 'oxidant_risk';
  if (/beers|geriatric|older adult/i.test(text)) return 'geriatrics';
  if (/CYP|UGT|DPYD|TPMT|NUDT15|VKORC1|SLCO|ABCB|G6PD|BCHE/i.test(text)) return 'pharmacogenomics';
  return 'general';
}

function centralActors(row = {}) {
  const drugs = (row.drugs || []).slice(0, 2);
  const genes = (row.genes || []).slice(0, 2);
  const metabolites = (row.metabolites || []).slice(0, 1);
  return { drugs, genes, metabolites };
}

function priorityForRows(rows = []) {
  if (rows.some(row => row.priority === 'P1')) return 'P1';
  if (rows.some(row => row.priority === 'P2')) return 'P2';
  return 'P3';
}

function makeGroup(key, rows) {
  const first = rows[0] || {};
  const drugs = uniq(rows.flatMap(row => row.drugs || []));
  const genes = uniq(rows.flatMap(row => row.genes || []));
  const metabolites = uniq(rows.flatMap(row => row.metabolites || []));
  const sourceRecords = uniq(rows.flatMap(row => row.sourceRecords || []));
  const sourceNames = uniq(rows.map(row => row.sourceName || row.sourceSupportStatus).filter(Boolean));
  const priority = priorityForRows(rows);
  return {
    candidateId: `grouped_v2_${key.replace(/\|/g, '_')}`,
    schema: 'diognosis.grouped-candidate-relation.v2',
    layer: first.layer || 'unknown',
    store: first.store || 'unknown',
    candidateKind: first.candidateKind || first.store || 'unknown',
    claimTypes: uniq(rows.map(row => row.claimType).filter(Boolean)),
    sourceNames,
    sourceRecords,
    candidateRecords: rows.map(row => row.candidateId),
    recordCount: rows.length,
    drugs,
    genes,
    metabolites,
    riskMarkers: uniq(rows.flatMap(row => row.riskMarkers || [])),
    evidenceIdentifiers: uniq(rows.flatMap(row => row.evidenceIdentifiers || [])),
    suggestedTargets: uniq(rows.map(row => row.suggestedTarget).filter(Boolean)),
    priority,
    sourceTruthStatuses: uniq(rows.map(row => row.sourceTruthStatus || row.sourceSupportStatus).filter(Boolean)),
    clinicalDomain: clinicalDomain(first),
    claimFamily: claimFamily(first),
    reason: summarizeGroup(first, drugs, genes, metabolites, rows.length),
    governance: baseCandidateGovernance(),
  };
}

function summarizeGroup(first, drugs, genes, metabolites, count) {
  const actors = [...drugs, ...genes, ...metabolites].slice(0, 5).join(' + ') || 'unmapped actors';
  const label = String(first.store || first.candidateKind || 'candidate').replace(/_/g, ' ');
  return `${label} review group for ${actors} (${count} candidate row${count === 1 ? '' : 's'}).`;
}

function uniq(values) {
  return [...new Set((values || []).filter(Boolean))];
}

const grouped = new Map();
for (const { store } of readCandidateStores()) {
  for (const row of store.candidates || []) {
    const key = groupKey(row);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
}

const candidateGroups = [...grouped.entries()].map(([key, rows]) => makeGroup(key, rows));
const legacy = readJson(LEGACY_GROUPED, { candidates: [] });
const legacyGroups = (legacy.candidates || []).map(item => ({
  ...item,
  schema: 'diognosis.grouped-review-candidates.v1',
  layer: 'legacy_structured_source',
  store: 'legacy_grouped_review_candidate',
  candidateKind: item.claimFamily || 'legacy_grouped_review_candidate',
  sourceNames: [item.source].filter(Boolean),
  sourceRecords: item.records || [],
  candidateRecords: [],
  sourceTruthStatuses: [],
  governance: {
    ...baseCandidateGovernance(),
    ...(item.governance || {}),
    canAutoPromote: false,
    canAffectScoring: false,
    canAffectPublicSeverity: false,
  },
}));

const candidates = [...legacyGroups, ...candidateGroups]
  .sort((a, b) => a.priority.localeCompare(b.priority) || String(a.layer).localeCompare(String(b.layer)) || a.candidateId.localeCompare(b.candidateId));

const report = {
  schema: 'diognosis.grouped-review-candidates.v2',
  generatedAt: new Date().toISOString(),
  legacyGroupedCandidates: legacyGroups.length,
  candidateRelationGroups: candidateGroups.length,
  totalCandidates: candidates.length,
  priorityCounts: candidates.reduce((acc, item) => {
    acc[item.priority] = (acc[item.priority] || 0) + 1;
    return acc;
  }, {}),
  layerCounts: candidates.reduce((acc, item) => {
    acc[item.layer] = (acc[item.layer] || 0) + 1;
    return acc;
  }, {}),
  candidates,
};

const audit = {
  schema: 'diognosis.grouped-review-candidates-v2-audit.v1',
  generatedAt: report.generatedAt,
  totalCandidates: report.totalCandidates,
  legacyGroupedCandidates: report.legacyGroupedCandidates,
  candidateRelationGroups: report.candidateRelationGroups,
  priorityCounts: report.priorityCounts,
  layerCounts: report.layerCounts,
  canAutoPromote: candidates.filter(item => item.governance?.canAutoPromote).length,
  scoringEnabled: candidates.filter(item => item.governance?.canAffectScoring).length,
};

writeJson(OUT_JSON, report);
writeJson(OUT_AUDIT, audit);
writeText(OUT_MD, `# Grouped Review Candidates v2

Generated: ${report.generatedAt}

- Total groups: ${report.totalCandidates}
- Preserved legacy groups: ${report.legacyGroupedCandidates}
- Candidate relation groups: ${report.candidateRelationGroups}
- P1: ${report.priorityCounts.P1 || 0}
- P2: ${report.priorityCounts.P2 || 0}
- P3: ${report.priorityCounts.P3 || 0}

${markdownTable(['Priority', 'Layer', 'Store', 'Actors', 'Rows', 'Reason'], candidates.slice(0, 100).map(item => [
  item.priority,
  item.layer,
  item.store,
  [...(item.drugs || []), ...(item.genes || []), ...(item.metabolites || [])].join(' + ') || 'n/a',
  item.recordCount || (item.records || []).length || 0,
  item.reason || item.summary || '',
]))}
`);

console.log(JSON.stringify({ ok: true, totalCandidates: report.totalCandidates, candidateRelationGroups: report.candidateRelationGroups }, null, 2));
