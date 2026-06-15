#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { ROOT, loadMedcheckData, normalizeName, uniq } from './lib/medcheck-source-loader.js';

const SCHEMA = 'diognosis.source-drug-name-candidates.v1';
const OUT_SOURCE = resolve(ROOT, 'src/data/generatedSourceDrugNameCandidates.js');
const SOURCE_ROOTS = [
  'data/enrichment/cache',
  'data/enrichment/candidates',
  'data/enrichment/review-queue',
];

const BROAD_CONTEXT_PATTERN = /\b(no drug|unknown|xenobiotics)\b/i;
const GENE_CONTEXT_PATTERN = /\b(rs\d+|chr\d+|genotype|allele|variant|polymorphism|gene|protein|receptor|transporter|enzyme|cyp\d|ugt\d|hla|ifnl|vkorc|slco|abcg|abcb|dpyd|tpmt|nudt|cftr|nat2|mt-rnr|g6pd|ryr1|cacna|cyb5r)\b/i;

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

function isBadDrugName(name, data, existingDrugKeys, geneKeys) {
  const value = String(name || '').trim();
  const key = normalizeName(value);
  if (!key || existingDrugKeys.has(key) || geneKeys.has(key)) return true;
  if (value.length < 3 || value.length > 80) return true;
  if (/^\*/.test(value)) return true;
  if (/[()<>={}]/.test(value)) return true;
  if (/^m\.\d/i.test(value)) return true;
  if (GENE_CONTEXT_PATTERN.test(value)) return true;
  if (BROAD_CONTEXT_PATTERN.test(value)) return true;
  if (typeof data.normalizeDrugLookupKey === 'function' && geneKeys.has(data.normalizeDrugLookupKey(value))) return true;
  return false;
}

function splitDrugName(value) {
  const text = String(value || '').trim();
  if (!text) return [];
  if (/\s(?:\/|\+)\s|\//.test(text)) {
    return text.split(/\s*(?:\/|\+)\s*/).filter(Boolean);
  }
  return [text];
}

function addCandidate(map, name, meta, data, existingDrugKeys, geneKeys) {
  for (let piece of splitDrugName(name)) {
    piece = piece
      .replace(/^and\s+/i, '')
      .replace(/\s+and$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (isBadDrugName(piece, data, existingDrugKeys, geneKeys)) continue;
    const key = normalizeName(piece);
    const row = map.get(key) || {
      id: `source_drug_name_${key.replace(/\s+/g, '_').slice(0, 90)}`,
      name: piece,
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

function visit(value, meta, map, data, existingDrugKeys, geneKeys) {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const child of value) visit(child, meta, map, data, existingDrugKeys, geneKeys);
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
    addCandidate(map, value.name, { ...next, sourceName: next.sourceName || 'ClinPGx' }, data, existingDrugKeys, geneKeys);
  }
  if (value.drugid && value.name) {
    addCandidate(map, value.name, { ...next, sourceName: next.sourceName || 'CPIC Data' }, data, existingDrugKeys, geneKeys);
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
        data,
        existingDrugKeys,
        geneKeys
      );
    }
  }

  for (const child of Object.values(value)) {
    visit(child, next, map, data, existingDrugKeys, geneKeys);
  }
}

function collectCandidates() {
  const data = loadMedcheckData(['src/data/pendingLiveCoreAugmentation.js']);
  const existingDrugKeys = new Set();
  for (const drug of data.DRUG_DB || []) {
    for (const term of [
      drug.name,
      drug.id,
      ...(drug.brandNames || []),
      ...(drug.aliases || []),
      ...(typeof data.getDrugAliases === 'function' ? data.getDrugAliases(drug) || [] : []),
    ]) {
      const key = normalizeName(term);
      if (key) existingDrugKeys.add(key);
    }
  }
  const geneKeys = new Set(Object.keys(data.GENE_ENZYMES || {}).map(normalizeName));
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
    }, map, data, existingDrugKeys, geneKeys);
  }

  return [...map.values()]
    .map(row => ({
      id: row.id,
      name: row.name,
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

function generatedSource(payload) {
  return `// Auto-generated by scripts/enrich/generate-source-drug-name-candidates.js. Do not edit by hand.
const SOURCE_DRUG_NAME_CANDIDATES = ${JSON.stringify(payload, null, 2)};
`;
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

writeFileSync(OUT_SOURCE, generatedSource(payload), 'utf8');
console.log(JSON.stringify({
  ok: true,
  sourceDrugNameCandidates: candidates.length,
  output: sourceFileLabel(OUT_SOURCE),
}, null, 2));
