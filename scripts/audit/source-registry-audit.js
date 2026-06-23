#!/usr/bin/env node
import { resolve } from 'path';
import { ROOT, loadDiognosisData } from '../lib/diognosis-source-loader.js';
import { buildCandidateNameContext, candidateNamePolicyViolation } from '../lib/candidate-name-normalizer.js';
import { loadAllStagedRecords, readJson } from '../lib/enrichment-common.js';
import { validateStagedSourceRecord } from '../lib/staged-source-schema.js';

const REGISTRY = resolve(ROOT, 'data/enrichment/source-registry.json');
const ALLOWLIST = resolve(ROOT, 'data/enrichment/provider-allowlist.json');
const CANDIDATE_FILES = [
  'data/enrichment/generated/source-drug-name-candidates.json',
  'data/enrichment/candidates/candidate-drug-identities.json',
  'data/enrichment/candidates/candidate-pgx-rules.json',
  'data/enrichment/candidates/candidate-pgx-risk-markers.json',
  'data/enrichment/candidates/candidate-interactions.json',
  'data/enrichment/candidates/candidate-enzyme-effects.json',
  'data/enrichment/candidates/candidate-transporter-effects.json',
  'data/enrichment/candidates/candidate-label-context.json',
];

const registry = readJson(REGISTRY, { sources: [] });
const allowlist = readJson(ALLOWLIST, { allowed: [], forbidden: [] });
const sourceNames = new Set((registry.sources || []).map(source => source.name));
const allowedNames = new Set((allowlist.allowed || []).map(source => source.name));
const { records, files } = loadAllStagedRecords();
const nameContext = buildCandidateNameContext(loadDiognosisData());
const errors = [];

for (const source of registry.sources || []) {
  if (!source.name || !source.type || !source.licenseNote) errors.push(`Registry source missing required fields: ${source.name || '(missing)'}`);
  if (source.canAffectScoring && source.reviewRequired !== true && source.name !== 'Internal Diognosis curated data') {
    errors.push(`${source.name} can affect scoring without review boundary`);
  }
}

for (const record of records) {
  const validation = validateStagedSourceRecord(record);
  if (!validation.ok) errors.push(`${record.id}: ${validation.errors.join('; ')}`);
  if (!sourceNames.has(record.source?.name)) errors.push(`${record.id}: source not in registry: ${record.source?.name}`);
  if (!allowedNames.has(record.source?.name) && !['Manual human review', 'Internal Diognosis curated data', 'PharmCAT output'].includes(record.source?.name)) {
    errors.push(`${record.id}: source not in provider allowlist: ${record.source?.name}`);
  }
}

function checkCandidateName(file, rowId, field, value) {
  const violation = candidateNamePolicyViolation(value, nameContext);
  if (violation) errors.push(`${file}: ${rowId || '(unknown candidate)'} ${field} "${value}" violates candidate-name policy: ${violation.reason}`);
}

for (const file of CANDIDATE_FILES) {
  const parsed = readJson(resolve(ROOT, file), null);
  if (!parsed) continue;
  for (const row of parsed.candidates || []) {
    if (row.name) checkCandidateName(file, row.id || row.candidateId, 'name', row.name);
    for (const drug of row.drugs || []) checkCandidateName(file, row.candidateId || row.id, 'drug', drug);
    for (const drug of row.matchedDiognosisDrugs || []) checkCandidateName(file, row.candidateId || row.id, 'matchedDrug', drug);
  }
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, registrySources: sourceNames.size, stagedRecords: records.length, stagedFiles: files.length }, null, 2));
