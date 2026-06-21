#!/usr/bin/env node
import { createHash } from 'crypto';
import { resolve } from 'path';
import { ROOT, readGeneratedConstObject } from './lib/diognosis-source-loader.js';
import { readJson, writeText } from './lib/enrichment-common.js';
import { actorsForRecord, sourceIdentifiersForRecord } from './lib/live-enrichment-policy.js';
import { stableToken } from './lib/staged-source-schema.js';

const OUT_SOURCE = resolve(ROOT, 'src/data/generatedPendingReviewEnrichment.js');
const DEFAULT_MAX_RECORDS = 'all';
const DEFAULT_PER_SOURCE = 'all';

const STAGED_INPUTS = [
  'data/enrichment/staged/cpic-staged-records.json',
  'data/enrichment/staged/clinpgx-staged-records.json',
  'data/enrichment/staged/label-staged-records.json',
  'data/enrichment/staged/legal-literature-staged-records.json',
];

const SOURCE_ORDER = ['cpic', 'dailymed', 'clinpgx', 'literature'];
const HIGH_VALUE_TERMS = [
  'Tacrolimus',
  'Warfarin',
  'Clopidogrel',
  'Codeine',
  'Capecitabine',
  'Irinotecan',
  'Azathioprine',
  'Mercaptopurine',
  'CYP2C19',
  'CYP2D6',
  'CYP2C9',
  'VKORC1',
  'DPYD',
  'TPMT',
  'NUDT15',
  'UGT1A1',
  'G6PD',
];

const CLAIM_LABELS = {
  gene_drug_recommendation: 'gene-drug source context',
  guideline_annotation: 'guideline annotation context',
  clinical_annotation: 'clinical annotation context',
  drug_label: 'label metadata context',
  publication: 'literature metadata context',
  pgx_pair: 'PGx pair context',
  allele_function: 'allele function context',
  variant_annotation: 'variant annotation context',
  clinical_pk: 'clinical PK context',
};

function parseArgs(argv) {
  const args = {
    maxRecords: Number.POSITIVE_INFINITY,
    perSource: Number.POSITIVE_INFINITY,
    maxRecordsLabel: DEFAULT_MAX_RECORDS,
    perSourceLabel: DEFAULT_PER_SOURCE,
  };
  for (const arg of argv) {
    if (arg.startsWith('--max-records=')) {
      const raw = arg.slice(14);
      args.maxRecords = parseLimit(raw, '--max-records');
      args.maxRecordsLabel = raw;
    } else if (arg.startsWith('--per-source=')) {
      const raw = arg.slice(13);
      args.perSource = parseLimit(raw, '--per-source');
      args.perSourceLabel = raw;
    }
  }
  return args;
}

function parseLimit(raw, label) {
  if (String(raw).toLowerCase() === 'all') return Number.POSITIVE_INFINITY;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new Error(`${label} must be a positive integer or all`);
  return value;
}

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value.filter(item => item != null && String(item).trim() !== '') : [value];
}

function uniq(values, limit = 12) {
  return [...new Set(asArray(values).map(value => String(value).trim()).filter(Boolean))].slice(0, limit);
}

function loadStagedRecords() {
  const byId = new Map();
  for (const rel of STAGED_INPUTS) {
    const file = resolve(ROOT, rel);
    const parsed = readJson(file, []);
    const rows = Array.isArray(parsed) ? parsed : parsed.records || [];
    for (const row of rows) {
      const id = row.id || stableRecordId(row);
      if (!byId.has(id)) byId.set(id, { ...row, id, stagedFile: rel });
    }
  }
  return [...byId.values()];
}

function stableRecordId(record) {
  const hash = createHash('sha256').update(JSON.stringify({
    source: record.source,
    claim: record.claim,
    evidence: record.evidence,
    mapping: record.mapping,
  })).digest('hex').slice(0, 12);
  return `pending_review_${stableToken(record.source?.name || 'source')}_${hash}`;
}

function sourceKeyFor(record = {}) {
  const name = `${record.source?.name || ''} ${record.source?.endpoint || ''} ${record.source?.sourceType || ''}`;
  if (/CPIC/i.test(name)) return 'cpic';
  if (/DailyMed|FDA\/DailyMed|label-source/i.test(name)) return 'dailymed';
  if (/ClinPGx/i.test(name)) return 'clinpgx';
  if (/PubMed|Europe PMC|OpenAlex|Unpaywall|literature/i.test(name)) return 'literature';
  return stableToken(record.source?.name || 'other') || 'other';
}

function sourcePriorityOrder(sourceKey) {
  const index = SOURCE_ORDER.indexOf(sourceKey);
  return index === -1 ? SOURCE_ORDER.length : index;
}

function countBySource(records) {
  const counts = {};
  for (const record of records) {
    const key = record.sourceKey || sourceKeyFor(record);
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) =>
    sourcePriorityOrder(a[0]) - sourcePriorityOrder(b[0]) || a[0].localeCompare(b[0])
  ));
}

function loadLiveSourceRecordIds() {
  const live = readGeneratedConstObject(resolve(ROOT, 'src/data/generatedLivePendingReview.js'), 'LIVE_PENDING_REVIEW_ENRICHMENTS') || {};
  const ids = new Set();
  for (const study of Object.values(live.studies || {})) {
    for (const id of study.sourceRecordIds || []) ids.add(id);
  }
  for (const row of live.knownDdi || []) {
    for (const id of row.sourceRecordIds || []) ids.add(id);
  }
  for (const row of live.labelContext || []) {
    for (const id of row.sourceRecordIds || []) ids.add(id);
  }
  return ids;
}

function recordText(record) {
  return [
    record.id,
    record.source?.name,
    record.source?.endpoint,
    record.claim?.claimType,
    record.claim?.mechanismSummary,
    record.claim?.clinicalSummary,
    ...asArray(record.claim?.drugs),
    ...asArray(record.claim?.genes),
    ...asArray(record.claim?.pathways),
    ...asArray(record.evidence?.sourceIdentifiers),
    ...asArray(record.evidence?.pmids),
    ...asArray(record.evidence?.dois),
    record.evidence?.strongestExternalTier,
  ].join(' ');
}

function priorityScore(record, liveSourceRecordIds) {
  const sourceKey = sourceKeyFor(record);
  const text = recordText(record);
  const lower = text.toLowerCase();
  let score = 0;
  if (liveSourceRecordIds.has(record.id)) score += 100;
  if (sourceKey === 'cpic') score += 30;
  if (sourceKey === 'dailymed') score += 25;
  if (sourceKey === 'clinpgx' && /fetched_from_clinpgx_api|fetched_from_source/i.test(record.provenance?.sourceTruthStatus || '')) score += 20;
  if (sourceKey === 'literature' && evidenceIdentifiers(record).some(id => /^PMID:|^DOI:/i.test(id))) score += 15;
  if (asArray(record.mapping?.matchedDiognosisDrugs).length || asArray(record.mapping?.matchedGenes).length) score += 10;
  if (HIGH_VALUE_TERMS.some(term => lower.includes(term.toLowerCase()))) score += 10;
  return score;
}

function evidenceIdentifiers(record) {
  return uniq([
    ...sourceIdentifiersForRecord(record),
    ...asArray(record.evidence?.pmids).map(pmid => `PMID:${pmid}`),
    ...asArray(record.evidence?.dois).map(doi => `DOI:${doi}`),
    ...asArray(record.evidence?.sourceIdentifiers),
    ...asArray(record.evidence?.urls),
    record.source?.url,
  ], 10);
}

function validateGovernance(records) {
  const errors = [];
  const pendingStatuses = new Set(['', 'pending', 'unreviewed']);
  for (const record of records) {
    const governance = record.governance || {};
    if (governance.canAffectScoring === true) errors.push(`${record.id}: staged record can affect scoring`);
    if (governance.canAffectPublicSeverity === true) errors.push(`${record.id}: staged record can affect public severity`);
    const status = String(governance.professionalReviewStatus || '').toLowerCase();
    if (!pendingStatuses.has(status)) errors.push(`${record.id}: professional review status must remain pending or unreviewed`);
  }
  if (errors.length) throw new Error(`Pending-review generation refused unsafe staged records:\n${errors.join('\n')}`);
}

function selectRecords(records, options) {
  const liveSourceRecordIds = loadLiveSourceRecordIds();
  const ranked = records
    .map(record => ({ record, score: priorityScore(record, liveSourceRecordIds), sourceKey: sourceKeyFor(record) }))
    .sort((a, b) =>
      b.score - a.score ||
      sourcePriorityOrder(a.sourceKey) - sourcePriorityOrder(b.sourceKey) ||
      String(a.record.id).localeCompare(String(b.record.id))
    );
  const groups = new Map();
  for (const item of ranked) {
    if (!groups.has(item.sourceKey)) groups.set(item.sourceKey, []);
    groups.get(item.sourceKey).push(item);
  }
  const keys = [...groups.keys()].sort((a, b) =>
    sourcePriorityOrder(a) - sourcePriorityOrder(b) || a.localeCompare(b)
  );
  const cursors = Object.fromEntries(keys.map(key => [key, 0]));
  const sourceCounts = {};
  const selected = [];

  while (selected.length < options.maxRecords) {
    let progressed = false;
    for (const key of keys) {
      if (selected.length >= options.maxRecords) break;
      if ((sourceCounts[key] || 0) >= options.perSource) continue;
      const group = groups.get(key) || [];
      const item = group[cursors[key]];
      if (!item) continue;
      cursors[key] += 1;
      sourceCounts[key] = (sourceCounts[key] || 0) + 1;
      selected.push(item);
      progressed = true;
    }
    if (!progressed) break;
  }

  return selected.map(item => item.record);
}

function actorLabel(actors) {
  return [
    ...actors.drugs,
    ...actors.genes,
    ...actors.metabolites,
    ...actors.pathways,
    ...actors.phenotypes,
  ].slice(0, 5).join(' + ');
}

function claimLabel(record) {
  const type = record.claim?.claimType || 'source_context';
  return CLAIM_LABELS[type] || `${String(type).replace(/_/g, ' ')} context`;
}

function compactText(value, maxLength = 180) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text || /promot/i.test(text)) return '';
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1).trim()}...`;
}

function mappingStatusFor(record) {
  const mapping = record.mapping || {};
  if (asArray(mapping.matchedDiognosisDrugs).length || asArray(mapping.matchedGenes).length || asArray(mapping.matchedMetabolites).length) return 'mapped';
  if (asArray(mapping.matchedEvidenceRefs).length || asArray(mapping.possibleExistingRows).length) return 'linked_existing_context';
  return 'source_identified';
}

function exportedRecord(record) {
  const actors = actorsForRecord(record);
  const sourceKey = sourceKeyFor(record);
  const label = actorLabel(actors);
  const snippet = compactText(record.claim?.mechanismSummary || record.claim?.clinicalSummary || '');
  const summary = [
    snippet,
    'Staged as source-linked external context without professional sign-off.',
    'Not used for scoring or public severity.',
  ].filter(Boolean).join(' ');
  return {
    id: record.id,
    sourceRecordId: record.id,
    sourceKey,
    sourceName: record.source?.name || sourceKey,
    sourceType: record.source?.sourceType || '',
    sourceUrl: record.source?.url || '',
    sourceEndpoint: record.source?.endpoint || '',
    sourceTruthStatus: record.provenance?.sourceTruthStatus || '',
    claimType: record.claim?.claimType || 'other',
    title: `${record.source?.name || 'External source'} ${claimLabel(record)}${label ? `: ${label}` : ''}`,
    summary,
    drugs: uniq(actors.drugs, 8),
    genes: uniq(actors.genes, 8),
    metabolites: uniq(actors.metabolites, 8),
    pathways: uniq(actors.pathways, 8),
    phenotypes: uniq(actors.phenotypes, 8),
    evidenceIdentifiers: evidenceIdentifiers(record),
    strongestExternalTier: record.evidence?.strongestExternalTier || record.source?.name || '',
    mappingStatus: mappingStatusFor(record),
    reviewStatus: 'needs_human_review',
    professionalReviewStatus: 'pending',
    canAffectScoring: false,
    canAffectPublicSeverity: false,
    canBeUsedForClinicalAction: false,
    displayBadge: 'Professional sign-off required',
    warnings: [
      'External source context only.',
      'Not used for scoring or public severity.',
    ],
  };
}

function payloadFor(records, selected, options) {
  const exported = selected.map(exportedRecord);
  return {
    schema: 'diognosis.pending-review-enrichment.v1',
    generatedAt: new Date().toISOString(),
    totalStagedRecords: records.length,
    exportedRecords: exported.length,
    exportPolicy: {
      maxRecords: options.maxRecordsLabel,
      perSource: options.perSourceLabel,
      exportsAllStagedRecords: exported.length === records.length,
    },
    sourceCounts: countBySource(records),
    exportedSourceCounts: countBySource(exported),
    safetyBoundary: {
      professionalReviewStatus: 'pending',
      requiresHumanReview: true,
      canAffectScoring: false,
      canAffectPublicSeverity: false,
      canBeUsedForClinicalAction: false,
    },
    records: exported,
  };
}

function generatedSource(payload) {
  return `// Auto-generated by scripts/enrich/generate-pending-review-enrichment.js. Do not edit by hand.
const PENDING_REVIEW_ENRICHMENT = ${JSON.stringify(payload, null, 2)};
`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const records = loadStagedRecords();
  validateGovernance(records);
  const selected = selectRecords(records, options);
  const payload = payloadFor(records, selected, options);
  writeText(OUT_SOURCE, generatedSource(payload));
  console.log(JSON.stringify({
    ok: true,
    totalStagedRecords: payload.totalStagedRecords,
    exportedRecords: payload.exportedRecords,
    exportedSourceCounts: payload.exportedSourceCounts,
  }, null, 2));
}

main();
