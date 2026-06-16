#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { ROOT, loadDiognosisData, normalizeName, uniq } from './lib/diognosis-source-loader.js';
import { buildCandidateNameContext, normalizeSourceDrugCandidateName } from './lib/candidate-name-normalizer.js';

const SCHEMA = 'diognosis.source-drug-name-candidates.v1';
const OUT_SOURCE = resolve(ROOT, 'data/enrichment/generated/source-drug-name-candidates.json');
const SOURCE_ROOTS = [
  'data/enrichment/cache',
  'data/enrichment/candidates',
  'data/enrichment/review-queue',
];

function walkJson(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) walkJson(path, out);
    else if (path.endsWith('.json')) out.push(path);
  }
  return out;
}

function sourceNameForPath(file) {
  const normalized = file.replace(/\\/g, '/');
  if (normalized.includes('/cpic/')) return 'CPIC Data';
  if (normalized.includes('/clinpgx/')) return 'ClinPGx';
  if (normalized.includes('/candidates/')) return 'Candidate relation store';
  if (normalized.includes('/review-queue/')) return 'Review queue';
  return 'Source cache';
}

function sourceFileLabel(file) {
  return file.replace(`${ROOT}/`, '');
}

function addCandidate(map, name, meta, nameContext) {
  const normalized = normalizeSourceDrugCandidateName(name, nameContext);
  for (const candidate of normalized.accepted) {
    const key = normalizeName(candidate.name);
    const row = map.get(key) || {
      id: `source_drug_name_${key.replace(/\s+/g, '_').slice(0, 90)}`,
      name: candidate.name,
      candidateCategory: candidate.candidateCategory,
      sourceNames: new Set(),
      sourceObjectIds: new Set(),
      sourceFiles: new Set(),
      evidenceIdentifiers: new Set(),
      observationCount: 0,
    };
    row.sourceNames.add(meta.sourceName || 'Source cache');
    if (meta.sourceObjectId) row.sourceObjectIds.add(String(meta.sourceObjectId));
    if (meta.sourceFile) row.sourceFiles.add(meta.sourceFile);
    if (meta.evidenceIdentifier) row.evidenceIdentifiers.add(meta.evidenceIdentifier);
    row.observationCount += 1;
    map.set(key, row);
  }
}

function visit(value, meta, map, nameContext) {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const child of value) visit(child, meta, map, nameContext);
    return;
  }
  if (typeof value !== 'object') return;

  const next = { ...meta };
  if (value.source) {
    next.sourceName = typeof value.source === 'string' ? value.source : value.source?.name || next.sourceName;
  }
  if (value.id) next.sourceObjectId = value.id;
  if (value.drugid) next.sourceObjectId = value.drugid;
  if (value.clinpgxid) next.evidenceIdentifier = `ClinPGx:${value.clinpgxid}`;
  if (value.drugid) next.evidenceIdentifier = value.drugid;

  if (value.objCls === 'Chemical' && value.name) {
    addCandidate(map, value.name, { ...next, sourceName: next.sourceName || 'ClinPGx' }, nameContext);
  }
  if (value.drugid && value.name) {
    addCandidate(map, value.name, { ...next, sourceName: next.sourceName || 'CPIC Data' }, nameContext);
  }
  if (value.candidateKind && Array.isArray(value.drugs)) {
    for (const drug of value.drugs) {
      addCandidate(
        map,
        drug,
        {
          ...next,
          sourceName: value.sourceName || next.sourceName || 'Candidate relation store',
          sourceObjectId: value.candidateId || value.id || next.sourceObjectId,
        },
        nameContext
      );
    }
  }

  for (const child of Object.values(value)) {
    visit(child, next, map, nameContext);
  }
}

function collectCandidates() {
  const data = loadDiognosisData(['src/data/pendingLiveCoreAugmentation.js']);
  const nameContext = buildCandidateNameContext(data);
  const map = new Map();
  const sourceFiles = SOURCE_ROOTS.flatMap(root => walkJson(resolve(ROOT, root)));

  for (const file of sourceFiles) {
    let payload;
    try {
      payload = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      continue;
    }
    visit(payload, {
      sourceName: sourceNameForPath(file),
      sourceFile: sourceFileLabel(file),
    }, map, nameContext);
  }

  return [...map.values()]
    .map(row => ({
      id: row.id,
      name: row.name,
      candidateCategory: row.candidateCategory || 'unmatched_substance',
      observationCount: row.observationCount,
      sourceNames: uniq([...row.sourceNames]).slice(0, 8),
      sourceObjectIds: uniq([...row.sourceObjectIds]).slice(0, 16),
      evidenceIdentifiers: uniq([...row.evidenceIdentifiers]).slice(0, 16),
      sourceFiles: uniq([...row.sourceFiles]).slice(0, 8),
      reviewRequired: true,
      professionalReviewStatus: 'pending',
      professionallyReviewed: false,
      pendingSourceSignal: true,
      canAffectScoring: false,
      canAffectPublicSeverity: false,
      canBeUsedForClinicalAction: false,
    }))
    .sort((a, b) => b.observationCount - a.observationCount || a.name.localeCompare(b.name));
}

const candidates = collectCandidates();
const payload = {
  schema: SCHEMA,
  generatedAt: new Date().toISOString(),
  sourceRoots: SOURCE_ROOTS,
  totalCandidates: candidates.length,
  safetyBoundary: {
    professionalReviewStatus: 'pending',
    professionallyReviewed: false,
    sourceLinkedOnly: true,
    canAffectScoring: false,
    canAffectPublicSeverity: false,
    canBeUsedForClinicalAction: false,
  },
  candidates,
};

writeFileSync(OUT_SOURCE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  ok: true,
  sourceDrugNameCandidates: candidates.length,
  output: sourceFileLabel(OUT_SOURCE),
}, null, 2));
