#!/usr/bin/env node
import { createHash } from 'crypto';
import { resolve } from 'path';
import { ROOT } from './lib/medcheck-source-loader.js';
import { loadAllStagedRecords, markdownTable, readJson, writeJson, writeText } from './lib/enrichment-common.js';
import {
  baseCandidateGovernance,
  candidateStoreDefinition,
  candidateStoreForClaimType,
  CANDIDATE_STORE_DEFINITIONS,
  CANDIDATE_STORE_SCHEMA,
  normalizeEvidenceIdentifiers,
} from './lib/knowledge-layer-model.js';
import { stableToken } from './lib/staged-source-schema.js';

const OUT_DIR = resolve(ROOT, 'data/enrichment/candidates');
const OUT_AUDIT = resolve(ROOT, 'docs/audits/candidate-relation-extraction.json');
const OUT_MD = resolve(ROOT, 'docs/audits/candidate-relation-extraction.md');

function candidateId(record, storeKey) {
  const actors = [
    ...(record.claim?.drugs || []),
    ...(record.claim?.genes || []),
    ...(record.claim?.metabolites || []),
    ...(record.claim?.riskMarkers || []),
  ].map(stableToken).filter(Boolean).slice(0, 6).join('_');
  const hash = createHash('sha256').update(JSON.stringify({
    source: record.source,
    claim: record.claim,
    evidence: record.evidence,
    mapping: record.mapping,
    storeKey,
  })).digest('hex').slice(0, 10);
  return `candidate_relation_${stableToken(storeKey)}_${actors || stableToken(record.id)}_${hash}`;
}

function relationForRecord(record) {
  const storeKey = candidateStoreForClaimType(record.claim?.claimType || 'other');
  const def = candidateStoreDefinition(storeKey);
  return {
    candidateId: candidateId(record, storeKey),
    schema: 'diognosis.candidate-relation.v1',
    store: storeKey,
    layer: def.layer,
    candidateKind: storeKey,
    claimType: record.claim?.claimType || 'other',
    sourceRecords: [record.id],
    sourceName: record.source?.name || '',
    sourceType: record.source?.sourceType || '',
    sourceTruthStatus: record.provenance?.sourceTruthStatus || 'local_review_candidate_not_fetched',
    sourceRelease: record.provenance?.sourceRelease || '',
    rawSourceCachePath: record.provenance?.rawSourceCachePath || '',
    drugs: record.claim?.drugs || [],
    genes: record.claim?.genes || [],
    metabolites: record.claim?.metabolites || [],
    pathways: record.claim?.pathways || [],
    riskMarkers: record.claim?.riskMarkers || [],
    phenotypes: record.claim?.phenotypes || [],
    affectedActors: record.claim?.affectedActors || [],
    direction: record.claim?.direction || '',
    mechanismSummary: record.claim?.mechanismSummary || '',
    clinicalSummary: record.claim?.clinicalSummary || '',
    evidenceIdentifiers: normalizeEvidenceIdentifiers(record),
    strongestExternalTier: record.evidence?.strongestExternalTier || '',
    matchedDiognosisDrugs: record.mapping?.matchedDiognosisDrugs || [],
    matchedGenes: record.mapping?.matchedGenes || [],
    matchedMetabolites: record.mapping?.matchedMetabolites || [],
    possibleExistingRows: record.mapping?.possibleExistingRows || [],
    suggestedTarget: suggestedTarget(record, storeKey),
    priority: priorityForCandidate(record, storeKey),
    governance: baseCandidateGovernance({
      sourceFaithfulnessStatus: record.governance?.sourceFaithfulnessStatus || 'unreviewed',
      professionalReviewStatus: record.governance?.professionalReviewStatus || 'pending',
      localReviewStatus: record.governance?.localReviewStatus || 'none',
      curationStatus: record.governance?.curationStatus || 'candidate',
      promotionReadiness: record.governance?.promotionReadiness || 'not_ready',
    }),
    notes: [
      'Candidate relation extracted from staged enrichment data. Review required before any curated data change.',
      ...(record.notes || []),
    ],
  };
}

function priorityForCandidate(record, storeKey) {
  const text = [
    record.source?.name,
    record.claim?.claimType,
    record.evidence?.strongestExternalTier,
    record.claim?.clinicalSummary,
    record.claim?.mechanismSummary,
  ].join(' ');
  if (/1A|1B|FDA|label|guideline|recommendation|severe|critical|narrow|transplant|oncology|toxic|prodrug/i.test(text)) return 'P1';
  if (storeKey === 'engine_hypotheses') return 'P2';
  if ((record.evidence?.pmids || []).length || (record.evidence?.dois || []).length || (record.evidence?.sourceIdentifiers || []).length) return 'P2';
  return 'P3';
}

function suggestedTarget(record, storeKey) {
  const claim = record.claim?.claimType || '';
  if (storeKey === 'interactions') return 'KNOWN_DDI';
  if (['parent_metabolite_relations', 'metabolite_roles'].includes(storeKey)) return 'METAB';
  if (['pgx_rules', 'pgx_risk_markers'].includes(storeKey)) return 'GENOTYPE_EFFECTS';
  if (storeKey === 'pk_parameters') return 'PK_PARAMS';
  if (storeKey === 'timing_rules') return 'WASHOUT_DAYS';
  if (storeKey === 'evidence_links' || claim === 'publication') return 'STUDY_DB';
  return 'review_only';
}

function mergeCandidateRows(rows = []) {
  const merged = new Map();
  for (const row of rows) {
    const key = [
      row.store,
      row.claimType,
      row.sourceName,
      row.drugs.join('+') || 'no_drug',
      row.genes.join('+') || 'no_gene',
      row.metabolites.join('+') || 'no_metabolite',
      row.riskMarkers.join('+') || 'no_marker',
      row.strongestExternalTier || 'no_tier',
    ].map(stableToken).join('|');
    if (!merged.has(key)) {
      merged.set(key, { ...row });
      continue;
    }
    const existing = merged.get(key);
    existing.sourceRecords = [...new Set([...existing.sourceRecords, ...row.sourceRecords])];
    existing.evidenceIdentifiers = [...new Set([...existing.evidenceIdentifiers, ...row.evidenceIdentifiers])];
    existing.possibleExistingRows = [...new Set([...existing.possibleExistingRows, ...row.possibleExistingRows])];
    if (existing.priority > row.priority) existing.priority = row.priority;
  }
  return [...merged.values()].sort((a, b) => a.priority.localeCompare(b.priority) || a.candidateId.localeCompare(b.candidateId));
}

const { records, files } = loadAllStagedRecords();
const byStore = Object.fromEntries(CANDIDATE_STORE_DEFINITIONS.map(def => [def.key, []]));

for (const record of records) {
  const relation = relationForRecord(record);
  byStore[relation.store] ||= [];
  byStore[relation.store].push(relation);
}

for (const def of CANDIDATE_STORE_DEFINITIONS.filter(def => def.key !== 'engine_hypotheses')) {
  const candidates = mergeCandidateRows(byStore[def.key] || []);
  const store = {
    schema: CANDIDATE_STORE_SCHEMA,
    store: def.key,
    layer: def.layer,
    title: def.title,
    generatedAt: new Date().toISOString(),
    sourceStagedFiles: files.map(file => ({ file: file.file.replace(`${ROOT}/`, ''), records: file.records })),
    totalCandidates: candidates.length,
    candidates,
  };
  writeJson(resolve(OUT_DIR, def.file), store);
}

const stores = CANDIDATE_STORE_DEFINITIONS
  .map(def => {
    const store = readJson(resolve(OUT_DIR, def.file), null);
    return store ? {
      store: def.key,
      file: `data/enrichment/candidates/${def.file}`,
      layer: def.layer,
      totalCandidates: store.totalCandidates || 0,
      priorityCounts: (store.candidates || []).reduce((acc, item) => {
        acc[item.priority] = (acc[item.priority] || 0) + 1;
        return acc;
      }, {}),
    } : null;
  })
  .filter(Boolean);

const audit = {
  schema: 'diognosis.candidate-relation-extraction.v1',
  generatedAt: new Date().toISOString(),
  stagedRecords: records.length,
  stagedFiles: files.length,
  stores,
  totalCandidates: stores.reduce((sum, item) => sum + item.totalCandidates, 0),
  reviewBoundary: 'candidate_relations_only_no_core_promotion',
};

writeJson(OUT_AUDIT, audit);
writeText(OUT_MD, `# Candidate Relation Extraction

Generated: ${audit.generatedAt}

- Staged records scanned: ${audit.stagedRecords}
- Candidate relation rows: ${audit.totalCandidates}
- Review boundary: ${audit.reviewBoundary}

${markdownTable(['Store', 'Layer', 'Candidates', 'P1', 'P2', 'P3'], stores.map(item => [
  item.store,
  item.layer,
  item.totalCandidates,
  item.priorityCounts.P1 || 0,
  item.priorityCounts.P2 || 0,
  item.priorityCounts.P3 || 0,
]))}
`);

console.log(JSON.stringify({ ok: true, stagedRecords: records.length, candidateRelations: audit.totalCandidates }, null, 2));
