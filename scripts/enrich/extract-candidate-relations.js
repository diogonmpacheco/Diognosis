#!/usr/bin/env node
import { createHash } from 'crypto';
import { resolve } from 'path';
import { loadMedcheckData, ROOT } from './lib/medcheck-source-loader.js';
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

for (const relation of buildLocalCoverageCandidates()) {
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

function localCandidateId(storeKey, row) {
  const actors = [
    ...(row.drugs || []),
    ...(row.genes || []),
    ...(row.metabolites || []),
    ...(row.riskMarkers || []),
    row.claimType,
  ].map(stableToken).filter(Boolean).slice(0, 7).join('_');
  const hash = createHash('sha256').update(JSON.stringify({ storeKey, row })).digest('hex').slice(0, 10);
  return `candidate_relation_${stableToken(storeKey)}_local_${actors || 'coverage'}_${hash}`;
}

function localRelation(storeKey, row) {
  const def = candidateStoreDefinition(storeKey);
  return {
    candidateId: localCandidateId(storeKey, row),
    schema: 'diognosis.candidate-relation.v1',
    store: storeKey,
    layer: def.layer,
    candidateKind: storeKey,
    claimType: row.claimType || 'coverage_gap',
    sourceRecords: row.sourceRecords || [],
    sourceName: row.sourceName || 'Diognosis local coverage',
    sourceType: row.sourceType || 'internal_diognosis',
    sourceTruthStatus: row.sourceTruthStatus || 'existing_core_data_review_prompt',
    sourceRelease: '',
    rawSourceCachePath: '',
    drugs: row.drugs || [],
    genes: row.genes || [],
    metabolites: row.metabolites || [],
    pathways: row.pathways || [],
    riskMarkers: row.riskMarkers || [],
    phenotypes: row.phenotypes || [],
    affectedActors: row.affectedActors || [],
    direction: row.direction || '',
    mechanismSummary: row.mechanismSummary || '',
    clinicalSummary: row.clinicalSummary || 'Existing Diognosis row surfaced for source review and expansion.',
    evidenceIdentifiers: row.evidenceIdentifiers || [],
    strongestExternalTier: row.strongestExternalTier || '',
    matchedDiognosisDrugs: row.drugs || [],
    matchedGenes: row.genes || [],
    matchedMetabolites: row.metabolites || [],
    possibleExistingRows: row.possibleExistingRows || [],
    suggestedTarget: row.suggestedTarget || suggestedTarget({ claim:{ claimType:row.claimType } }, storeKey),
    priority: row.priority || 'P2',
    existingCoreRow: true,
    governance: baseCandidateGovernance({
      sourceFaithfulnessStatus: 'existing_core_needs_source_review',
      curationStatus: 'candidate',
    }),
    notes: [
      'Candidate relation generated from existing Diognosis local data so review lanes do not appear empty.',
      'This is not a new external source claim and should not create duplicate live rows.',
      ...(row.notes || []),
    ],
  };
}

function evidenceIdentifiersForRefs(data, refs = []) {
  return [...new Set((refs || []).flatMap(ref => {
    const study = data.STUDY_DB?.[ref];
    return [
      ref,
      study?.pmid && `PMID:${study.pmid}`,
      study?.doi && `DOI:${study.doi}`,
      study?.url,
      ...(study?.sourceIdentifiers || []),
    ].filter(Boolean);
  }))];
}

function buildLocalCoverageCandidates() {
  const data = loadMedcheckData();
  const candidates = [];
  for (const row of (data.KNOWN_DDI || []).slice(0, 80)) {
    const refs = row.evidenceRefs || row.refs || [];
    candidates.push(localRelation('interactions', {
      claimType: 'interaction_event',
      drugs: [row.drug1, row.drug2].filter(Boolean),
      pathways: [row.enzyme, row.category].filter(Boolean),
      direction: row.severity || 'interaction_context',
      mechanismSummary: row.mechanism || row.category || '',
      sourceRecords: refs,
      evidenceIdentifiers: evidenceIdentifiersForRefs(data, refs),
      strongestExternalTier: refs.length ? 'existing_source_ref' : '',
      suggestedTarget: 'KNOWN_DDI',
      priority: /severe|critical/i.test(row.severity || '') ? 'P1' : 'P2',
      possibleExistingRows: [row.id || `${row.drug1}_${row.drug2}`],
    }));
  }
  for (const [parent, metabolites] of Object.entries(data.METAB || {}).slice(0, 80)) {
    for (const metabolite of (metabolites || []).slice(0, 4)) {
      candidates.push(localRelation('parent_metabolite_relations', {
        claimType: 'parent_metabolite_relation',
        drugs: [parent],
        metabolites: [metabolite.n || metabolite.id].filter(Boolean),
        pathways: [metabolite.e].filter(Boolean),
        direction: metabolite.a || 'metabolite_relation',
        mechanismSummary: `${parent} maps to ${metabolite.n || metabolite.id || 'metabolite'} in existing Diognosis metabolism data.`,
        suggestedTarget: 'METAB',
        priority: /active|toxic/i.test(metabolite.a || '') ? 'P1' : 'P2',
      }));
    }
  }
  for (const actor of Object.values(data.METABOLITE_ACTORS || {}).slice(0, 80)) {
    candidates.push(localRelation('metabolite_roles', {
      claimType: 'metabolite_role',
      drugs: [actor.parentDrug].filter(Boolean),
      metabolites: [actor.name || actor.id].filter(Boolean),
      pathways: [actor.formingEnzyme, actor.clearanceEnzyme].filter(Boolean),
      direction: actor.type || actor.role || 'metabolite_role',
      mechanismSummary: `${actor.name || actor.id} is modeled as ${actor.type || actor.role || 'a metabolite actor'} for ${actor.parentDrug || 'parent drug'}.`,
      suggestedTarget: 'METABOLITE_ACTORS',
      priority: /active|toxic/i.test(`${actor.type || ''} ${actor.role || ''}`) ? 'P1' : 'P2',
    }));
  }
  for (const [gene, effects] of Object.entries(data.GENOTYPE_EFFECTS || {}).filter(([key]) => !key.startsWith('_')).slice(0, 80)) {
    candidates.push(localRelation('enzyme_effects', {
      claimType: 'enzyme_effect',
      genes: [gene],
      pathways: [gene],
      direction: 'genotype_enzyme_context',
      mechanismSummary: `${gene} has existing genotype/enzyme effect modeling with ${Object.keys(effects || {}).length} phenotype row(s).`,
      suggestedTarget: 'GENOTYPE_EFFECTS',
      priority: 'P2',
    }));
  }
  for (const [drug, params] of Object.entries(data.PK_PARAMS || {}).slice(0, 80)) {
    candidates.push(localRelation('pk_parameters', {
      claimType: 'pk_parameter',
      drugs: [drug],
      direction: 'pk_parameter',
      mechanismSummary: `${drug} has existing PK profile fields: ${Object.keys(params || {}).slice(0, 6).join(', ')}.`,
      suggestedTarget: 'PK_PARAMS',
      priority: 'P2',
    }));
  }
  for (const [drug, days] of Object.entries(data.WASHOUT_DAYS || {}).slice(0, 60)) {
    candidates.push(localRelation('timing_rules', {
      claimType: 'washout_timing',
      drugs: [drug],
      direction: 'washout_timing',
      mechanismSummary: `${drug} has an existing washout timing rule of ${days} days.`,
      suggestedTarget: 'WASHOUT_DAYS',
      priority: 'P2',
    }));
  }
  for (const row of (data.TRANSPORTER_DDI || []).slice(0, 80)) {
    candidates.push(localRelation('transporter_effects', {
      claimType: 'transporter_effect',
      drugs: [row.drug1, row.drug2].filter(Boolean),
      pathways: [row.transporter || row.category].filter(Boolean),
      direction: row.effect || row.severity || 'transporter_context',
      mechanismSummary: row.mechanism || row.category || '',
      suggestedTarget: 'review_only',
      priority: 'P2',
    }));
  }
  for (const [drug, scores] of Object.entries(data.PHENOTYPE_SCORES || {}).slice(0, 80)) {
    candidates.push(localRelation('receptor_effects', {
      claimType: 'phenotype_burden',
      drugs: [drug],
      phenotypes: Object.keys(scores || {}).slice(0, 8),
      direction: 'phenotype_score',
      mechanismSummary: `${drug} has existing phenotype/receptor burden scores.`,
      suggestedTarget: 'PHENOTYPE_SCORES',
      priority: 'P2',
    }));
  }
  for (const [drug, flag] of Object.entries(data.BEERS_FLAGS || {}).slice(0, 60)) {
    candidates.push(localRelation('beers_geriatrics', {
      claimType: 'geriatric_safety_flag',
      drugs: [drug],
      phenotypes: ['geriatric_safety'],
      direction: flag.severity || 'geriatric_context',
      mechanismSummary: flag.reason || `${drug} has an existing geriatric safety flag.`,
      suggestedTarget: 'BEERS_FLAGS',
      priority: /avoid|high|strong/i.test(JSON.stringify(flag)) ? 'P1' : 'P2',
    }));
  }
  for (const drug of (data.DRUG_DB || []).slice(0, 100)) {
    candidates.push(localRelation('drug_identity', {
      claimType: 'drug_identity',
      drugs: [drug.name],
      pathways: (drug.routes || []).map(route => route.enzyme).filter(Boolean),
      direction: 'identity_context',
      mechanismSummary: `${drug.name} exists in DRUG_DB with ${drug.cls || 'unspecified'} class metadata.`,
      suggestedTarget: 'DRUG_DB',
      priority: /transplant|oncology|anticoag|antiplatelet|opioid|azole|macrolide/i.test(`${drug.name} ${drug.cls || ''}`) ? 'P1' : 'P2',
    }));
  }
  return candidates;
}
