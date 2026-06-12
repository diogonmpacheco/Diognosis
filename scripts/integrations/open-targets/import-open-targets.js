#!/usr/bin/env node
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { dirname, extname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..', '..');
const DEFAULT_INPUT_DIR = resolve(__dirname, 'input');
const DEFAULT_MANUAL_CROSSWALK = resolve(__dirname, 'manual-crosswalk.json');
const OUT_JS = resolve(ROOT, 'src/data/generatedOpenTargetsSnapshot.js');
const OUT_MD = resolve(ROOT, 'docs/OPEN_TARGETS_INTEGRATION_AUDIT.md');

const SOURCE_MODULES = [
  'src/data/constants.js',
  'src/data/rules.js',
  'src/data/drugs.js',
  'src/data/interactions.js',
];

const DATASET_HINTS = [
  ['molecule', ['molecule', 'drug', 'drugs']],
  ['drugWarnings', ['drugwarnings', 'drug_warnings', 'warning', 'warnings']],
  ['faersSignificant', ['faerssignificant', 'faers', 'pharmacovigilance']],
  ['pharmacogenetics', ['pharmacogenetics', 'clinpgx', 'pharmgkb']],
  ['targetSafety', ['targetsafety', 'target_safety', 'safety']],
  ['mechanismOfAction', ['mechanismofaction', 'mechanism_of_action', 'moa']],
];

function parseArgs(argv) {
  const args = {
    inputDir: DEFAULT_INPUT_DIR,
    manualCrosswalk: DEFAULT_MANUAL_CROSSWALK,
    release: null,
    maxContextPerDrug: 100,
    check: false,
  };
  for (let idx = 0; idx < argv.length; idx += 1) {
    const arg = argv[idx];
    if (arg === '--check') args.check = true;
    else if (arg === '--input-dir') args.inputDir = resolve(argv[++idx]);
    else if (arg === '--manual-crosswalk') args.manualCrosswalk = resolve(argv[++idx]);
    else if (arg === '--release') args.release = argv[++idx];
    else if (arg === '--max-context-per-drug') args.maxContextPerDrug = Number(argv[++idx]);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isFinite(args.maxContextPerDrug) || args.maxContextPerDrug < 0) {
    throw new Error('--max-context-per-drug must be a non-negative number');
  }
  return args;
}

function loadMedcheckContext() {
  const context = { console };
  vm.createContext(context);
  const source = SOURCE_MODULES
    .map((relPath) => readFileSync(resolve(ROOT, relPath), 'utf8'))
    .join('\n\n');
  vm.runInContext(`${source}
globalThis.__OPEN_TARGETS_SOURCE__ = {
  DRUG_DB,
  COMBINATION_PRODUCTS,
  normalizeDrugLookupKey,
  getDrugAliases,
  getDrugSearchTerms
};`, context);
  return context.__OPEN_TARGETS_SOURCE__;
}

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeChembl(value) {
  const match = String(value || '').toUpperCase().match(/CHEMBL\d+/);
  return match ? match[0] : null;
}

function uniq(values) {
  return [...new Set(values.filter(value => value != null && String(value).trim() !== ''))];
}

function collectStringLeaves(value, out = []) {
  if (value == null) return out;
  if (typeof value === 'string' || typeof value === 'number') {
    out.push(String(value));
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectStringLeaves(item, out));
    return out;
  }
  if (typeof value === 'object') {
    for (const child of Object.values(value)) collectStringLeaves(child, out);
  }
  return out;
}

function inferDatasetName(filePath) {
  const name = relative(DEFAULT_INPUT_DIR, filePath).toLowerCase().replace(/[^a-z0-9]+/g, '');
  for (const [dataset, hints] of DATASET_HINTS) {
    if (hints.some(hint => name.includes(hint))) return dataset;
  }
  return 'unknown';
}

function collectInputFiles(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  function visit(current) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (!entry.name.startsWith('.') && ['.json', '.jsonl', '.ndjson', '.tsv', '.csv'].includes(extname(entry.name).toLowerCase())) {
        files.push(fullPath);
      }
    }
  }
  visit(dir);
  return files.sort();
}

function parseDelimited(text, separator) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let idx = 0; idx < text.length; idx += 1) {
    const char = text[idx];
    const next = text[idx + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        idx += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === separator) {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows.shift().map(header => header.trim());
  return rows
    .filter(values => values.some(value => value.trim()))
    .map(values => Object.fromEntries(headers.map((header, idx) => [header, values[idx] ?? ''])));
}

function extractRowsFromJson(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value.rows)) return value.rows;
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.results)) return value.results;
  if (Array.isArray(value.records)) return value.records;
  if (value.data && typeof value.data === 'object') {
    const nested = Object.values(value.data).find(Array.isArray);
    if (nested) return nested;
  }
  return [value];
}

function readRecords(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const ext = extname(filePath).toLowerCase();
  if (ext === '.jsonl' || ext === '.ndjson') {
    return text.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  }
  if (ext === '.json') return extractRowsFromJson(JSON.parse(text));
  if (ext === '.tsv') return parseDelimited(text, '\t');
  if (ext === '.csv') return parseDelimited(text, ',');
  return [];
}

function recordChemblId(record) {
  return normalizeChembl(
    record.id ||
    record.chemblId ||
    record.chembl_id ||
    record.drugId ||
    record.drug_id ||
    record.drug?.id ||
    record.drug?.chemblId ||
    record.moleculeId ||
    record.molecule_id ||
    (Array.isArray(record.chemblIds) ? record.chemblIds[0] : null)
  );
}

function recordDrugName(record) {
  return (
    record.name ||
    record.prefName ||
    record.preferredName ||
    record.drugName ||
    record.drug_name ||
    record.drug?.name ||
    record.moleculeName ||
    record.molecule_name ||
    null
  );
}

function moleculeAliases(record) {
  return uniq([
    recordDrugName(record),
    ...collectStringLeaves(record.tradeNames || record.trade_names || record.tradeNameList || []),
    ...collectStringLeaves(record.synonyms || record.synonymList || record.aliases || []),
  ]).filter(value => !/^CHEMBL\d+$/i.test(value));
}

function normalizeMoleculeRecord(record, dataset, filePath) {
  const chemblId = recordChemblId(record);
  if (!chemblId) return null;
  const name = recordDrugName(record) || chemblId;
  return {
    chemblId,
    openTargetsDrugId: chemblId,
    name,
    normalizedName: normalize(name),
    aliases: moleculeAliases(record).sort((a, b) => a.localeCompare(b)),
    normalizedAliases: moleculeAliases(record).map(normalize).filter(Boolean),
    drugType: record.drugType || record.drug_type || null,
    isApproved: record.isApproved ?? record.is_approved ?? null,
    blackBoxWarning: record.blackBoxWarning ?? record.black_box_warning ?? null,
    hasBeenWithdrawn: record.hasBeenWithdrawn ?? record.has_been_withdrawn ?? null,
    sourceDatasets: [dataset],
    sourceFiles: [relative(ROOT, filePath)],
  };
}

function mergeMolecule(existing, next) {
  if (!existing) return next;
  existing.aliases = uniq([...existing.aliases, ...next.aliases]).sort((a, b) => a.localeCompare(b));
  existing.normalizedAliases = uniq([...existing.normalizedAliases, ...next.normalizedAliases]);
  existing.sourceDatasets = uniq([...existing.sourceDatasets, ...next.sourceDatasets]).sort();
  existing.sourceFiles = uniq([...existing.sourceFiles, ...next.sourceFiles]).sort();
  for (const key of ['name', 'normalizedName', 'drugType', 'isApproved', 'blackBoxWarning', 'hasBeenWithdrawn']) {
    if (existing[key] == null && next[key] != null) existing[key] = next[key];
  }
  return existing;
}

function contextFactFromRecord(record, dataset, release, index) {
  const chemblId = recordChemblId(record);
  if (!chemblId) return null;
  const warningType = record.warningType || record.warning_type || record.toxicityClass || record.toxicity_class || record.event || record.eventName || null;
  const targetGene = record.targetGeneSymbol || record.targetSymbol || record.geneSymbol || record.gene || record.target?.approvedSymbol || record.target?.name || null;
  const sourceEvidenceLevel = record.evidenceLevel || record.evidence_level || record.clinicalAnnotationLevel || record.clinical_annotation_level || record.levelOfEvidence || null;
  const drugResponseCategory = record.drugResponseCategory || record.drug_response_category || record.responseCategory || record.category || null;
  const riskMarker = record.variant || record.variantId || record.variant_id || record.haplotype || record.starAllele || record.star_allele || record.marker || null;
  const label = (
    warningType ||
    record.description ||
    record.mechanismOfAction ||
    record.mechanism_of_action ||
    record.adverseEvent ||
    record.adverse_event ||
    record.phenotypeText ||
    record.phenotype ||
    targetGene ||
    dataset
  );
  return {
    id: `ot_${dataset}_${chemblId}_${index}`,
    chemblId,
    openTargetsDrugId: chemblId,
    openTargetsRelease: release,
    openTargetsSourceDataset: dataset,
    sourceCategory: 'open_targets_context',
    importedContextOnly: true,
    notSeverityBearing: true,
    reviewRequired: true,
    reviewDecision: 'unreviewed',
    factType: dataset,
    label: String(label || dataset).slice(0, 240),
    warningType: warningType ? String(warningType).slice(0, 160) : null,
    targetGene: targetGene ? String(targetGene).slice(0, 80) : null,
    sourceEvidenceLevel: sourceEvidenceLevel ? String(sourceEvidenceLevel).slice(0, 80) : null,
    drugResponseCategory: drugResponseCategory ? String(drugResponseCategory).slice(0, 120) : null,
    riskMarker: riskMarker ? String(riskMarker).slice(0, 120) : null,
    source: record.datasource || record.dataSource || record.source || 'Open Targets',
  };
}

function medcheckTerms(drug, data) {
  return uniq([
    drug.name,
    drug.id,
    drug.cls,
    ...(drug.brandNames || []),
    ...(typeof data.getDrugAliases === 'function' ? data.getDrugAliases(drug) : []),
    ...(typeof data.getDrugSearchTerms === 'function' ? data.getDrugSearchTerms(drug) : []),
  ]);
}

function isCombinationLike(drug) {
  const text = `${drug.name || ''} ${drug.id || ''} ${drug.cls || ''}`;
  if (/clinical context|food|administration context/i.test(text)) return true;
  return /\/|\+/.test(drug.name || '') || /\/|\+/.test(drug.id || '');
}

function buildMoleculeIndexes(molecules) {
  const byChembl = new Map();
  const byTerm = new Map();
  for (const molecule of molecules.values()) {
    byChembl.set(molecule.chemblId, molecule);
    for (const term of [molecule.name, ...molecule.aliases]) {
      const key = normalize(term);
      if (!key) continue;
      const list = byTerm.get(key) || [];
      list.push(molecule);
      byTerm.set(key, list);
    }
  }
  return { byChembl, byTerm };
}

function loadManualCrosswalk(filePath) {
  if (!existsSync(filePath)) return { release: null, mappings: [] };
  const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
  return {
    release: parsed.release || null,
    mappings: parsed.mappings || [],
  };
}

function manualMappingForDrug(drug, manual) {
  const id = normalize(drug.id);
  const name = normalize(drug.name);
  return (manual.mappings || []).find(mapping =>
    normalize(mapping.medcheckId) === id ||
    normalize(mapping.medcheckName) === name ||
    normalize(mapping.name) === name
  ) || null;
}

function chooseBestMatch(drug, terms, indexes, manualMapping) {
  if (manualMapping) {
    const chemblId = normalizeChembl(manualMapping.chemblId || manualMapping.openTargetsDrugId);
    const molecule = chemblId ? indexes.byChembl.get(chemblId) : null;
    return {
      matchStatus: chemblId ? 'manual' : 'manual_unresolved',
      matchConfidence: chemblId ? 1 : 0,
      matchReason: manualMapping.note || 'manual_crosswalk',
      molecule,
      chemblId,
      openTargetsDrugId: chemblId,
    };
  }

  if (isCombinationLike(drug)) {
    return {
      matchStatus: 'requires_manual_combination_review',
      matchConfidence: 0,
      matchReason: 'Open Targets drug entities are molecule-centric; Diognosis combination/context logic remains authoritative.',
      molecule: null,
      chemblId: null,
      openTargetsDrugId: null,
    };
  }

  const candidates = new Map();
  for (const term of terms) {
    const key = normalize(term);
    if (!key) continue;
    for (const molecule of indexes.byTerm.get(key) || []) {
      const score = normalize(drug.name) === key && normalize(molecule.name) === key ? 0.98 : 0.86;
      const existing = candidates.get(molecule.chemblId);
      if (!existing || score > existing.score) candidates.set(molecule.chemblId, { molecule, score, term });
    }
  }
  const sorted = [...candidates.values()].sort((a, b) => b.score - a.score || a.molecule.chemblId.localeCompare(b.molecule.chemblId));
  if (!sorted.length) {
    return {
      matchStatus: 'unmapped',
      matchConfidence: 0,
      matchReason: 'no_exact_name_or_alias_match',
      molecule: null,
      chemblId: null,
      openTargetsDrugId: null,
    };
  }
  if (sorted.length > 1 && sorted[0].score === sorted[1].score) {
    return {
      matchStatus: 'ambiguous',
      matchConfidence: sorted[0].score,
      matchReason: `multiple_exact_matches:${sorted.map(item => item.molecule.chemblId).slice(0, 5).join(',')}`,
      molecule: null,
      chemblId: null,
      openTargetsDrugId: null,
    };
  }
  return {
    matchStatus: sorted[0].score >= 0.95 ? 'exact_name' : 'exact_alias',
    matchConfidence: sorted[0].score,
    matchReason: `matched_term:${sorted[0].term}`,
    molecule: sorted[0].molecule,
    chemblId: sorted[0].molecule.chemblId,
    openTargetsDrugId: sorted[0].molecule.openTargetsDrugId,
  };
}

function buildSnapshot(data, inputs, manual, args) {
  const molecules = new Map();
  const rawContextFacts = [];
  const inputFiles = [];
  const datasetCounts = {};

  for (const filePath of inputs) {
    const dataset = inferDatasetName(filePath);
    const records = readRecords(filePath);
    inputFiles.push({ path: relative(ROOT, filePath), dataset, records: records.length });
    datasetCounts[dataset] = (datasetCounts[dataset] || 0) + records.length;
    records.forEach((record, idx) => {
      if (dataset === 'molecule' || recordDrugName(record)) {
        const molecule = normalizeMoleculeRecord(record, dataset, filePath);
        if (molecule) molecules.set(molecule.chemblId, mergeMolecule(molecules.get(molecule.chemblId), molecule));
      }
      if (dataset !== 'molecule') {
        const fact = contextFactFromRecord(record, dataset, args.release || manual.release || null, idx);
        if (fact) rawContextFacts.push(fact);
      }
    });
  }

  const indexes = buildMoleculeIndexes(molecules);
  const crosswalk = data.DRUG_DB.map((drug) => {
    const terms = medcheckTerms(drug, data);
    const match = chooseBestMatch(drug, terms, indexes, manualMappingForDrug(drug, manual));
    const molecule = match.molecule;
    return {
      medcheckId: drug.id || null,
      medcheckName: drug.name,
      medcheckClass: drug.cls || null,
      medcheckAliases: terms.filter(term => term !== drug.name).slice(0, 20),
      openTargetsDrugId: match.openTargetsDrugId,
      chemblId: match.chemblId,
      openTargetsName: molecule?.name || null,
      drugType: molecule?.drugType || null,
      isApproved: molecule?.isApproved ?? null,
      blackBoxWarning: molecule?.blackBoxWarning ?? null,
      hasBeenWithdrawn: molecule?.hasBeenWithdrawn ?? null,
      matchStatus: match.matchStatus,
      matchConfidence: match.matchConfidence,
      matchReason: match.matchReason,
      sourceDatasets: molecule?.sourceDatasets || [],
      combinationProductAuthority: isCombinationLike(drug) ? 'diognosis' : null,
    };
  }).sort((a, b) => a.medcheckName.localeCompare(b.medcheckName));

  const mappedChemblIds = new Set(crosswalk.map(row => row.chemblId).filter(Boolean));
  const contextByChemblId = {};
  const truncatedContextCounts = {};
  for (const fact of rawContextFacts) {
    if (!mappedChemblIds.has(fact.chemblId)) continue;
    const list = contextByChemblId[fact.chemblId] || [];
    if (list.length < args.maxContextPerDrug) list.push(fact);
    else truncatedContextCounts[fact.chemblId] = (truncatedContextCounts[fact.chemblId] || 0) + 1;
    contextByChemblId[fact.chemblId] = list;
  }

  const summary = {
    schemaVersion: 1,
    release: args.release || manual.release || null,
    medcheckSubstances: crosswalk.length,
    openTargetsMoleculesLoaded: molecules.size,
    inputFiles: inputFiles.length,
    mappedRows: crosswalk.filter(row => ['manual', 'exact_name', 'exact_alias'].includes(row.matchStatus)).length,
    unmappedRows: crosswalk.filter(row => row.matchStatus === 'unmapped').length,
    ambiguousRows: crosswalk.filter(row => row.matchStatus === 'ambiguous').length,
    manualRows: crosswalk.filter(row => row.matchStatus === 'manual').length,
    combinationReviewRows: crosswalk.filter(row => row.matchStatus === 'requires_manual_combination_review').length,
    contextFactsLoaded: rawContextFacts.length,
    contextFactsIncluded: Object.values(contextByChemblId).reduce((sum, list) => sum + list.length, 0),
    datasetCounts,
    generatedBy: 'scripts/integrations/open-targets/import-open-targets.js',
  };

  return {
    schemaVersion: 1,
    release: summary.release,
    inputFiles,
    summary,
    crosswalk,
    contextByChemblId,
    truncatedContextCounts,
  };
}

function stableFingerprint(files, manualCrosswalkPath) {
  const hash = createHash('sha256');
  for (const filePath of [...files, manualCrosswalkPath].filter(existsSync).sort()) {
    hash.update(relative(ROOT, filePath));
    hash.update('\0');
    hash.update(readFileSync(filePath));
    hash.update('\0');
  }
  return hash.digest('hex').slice(0, 16);
}

function renderJs(snapshot, fingerprint) {
  const summary = { ...snapshot.summary, inputFingerprint: fingerprint };
  return `// Generated by scripts/integrations/open-targets/import-open-targets.js. Do not edit by hand.
// Static Open Targets context snapshot. Imported facts are context-only until reviewed.

const OPEN_TARGETS_SNAPSHOT_SCHEMA_VERSION = 1;

const OPEN_TARGETS_SNAPSHOT_SUMMARY = Object.freeze(${JSON.stringify(summary, null, 2)});

const GENERATED_OPEN_TARGETS_SNAPSHOT = Object.freeze(${JSON.stringify({ ...snapshot, summary }, null, 2)});
`;
}

function escapeCell(value) {
  return String(value == null ? '' : value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function renderMarkdown(snapshot, fingerprint) {
  const summary = { ...snapshot.summary, inputFingerprint: fingerprint };
  const statusCounts = Object.entries(
    snapshot.crosswalk.reduce((acc, row) => {
      acc[row.matchStatus] = (acc[row.matchStatus] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => a[0].localeCompare(b[0]));
  const statusRows = statusCounts.map(([status, count]) => `| ${escapeCell(status)} | ${count} |`).join('\n');
  const inputRows = snapshot.inputFiles.length
    ? snapshot.inputFiles.map(file => `| ${escapeCell(file.path)} | ${escapeCell(file.dataset)} | ${file.records} |`).join('\n')
    : '| none | none | 0 |';
  const mappedRows = snapshot.crosswalk
    .filter(row => row.chemblId)
    .slice(0, 40)
    .map(row => `| ${escapeCell(row.medcheckName)} | ${escapeCell(row.chemblId)} | ${escapeCell(row.openTargetsName)} | ${escapeCell(row.matchStatus)} | ${row.matchConfidence} |`)
    .join('\n') || '| none | none | none | none | 0 |';
  const reviewRows = snapshot.crosswalk
    .filter(row => row.matchStatus === 'requires_manual_combination_review' || row.matchStatus === 'ambiguous')
    .slice(0, 40)
    .map(row => `| ${escapeCell(row.medcheckName)} | ${escapeCell(row.matchStatus)} | ${escapeCell(row.matchReason)} |`)
    .join('\n') || '| none | none | none |';

  return `# Open Targets Integration Audit

Generated by \`scripts/integrations/open-targets/import-open-targets.js\`.

This audit covers the static, build-time Open Targets crosswalk. No Open Targets request is made from the browser. Imported Open Targets facts are emitted as context-only records and default to \`reviewRequired: true\`, \`importedContextOnly: true\`, \`notSeverityBearing: true\`, and \`reviewDecision: "unreviewed"\`.

## Summary

| Metric | Count |
| --- | ---: |
| MedCheck substances considered | ${summary.medcheckSubstances} |
| Open Targets molecules loaded | ${summary.openTargetsMoleculesLoaded} |
| Input files | ${summary.inputFiles} |
| Mapped rows | ${summary.mappedRows} |
| Unmapped rows | ${summary.unmappedRows} |
| Ambiguous rows | ${summary.ambiguousRows} |
| Manual rows | ${summary.manualRows} |
| Combination/context rows requiring Diognosis review | ${summary.combinationReviewRows} |
| Context facts loaded | ${summary.contextFactsLoaded} |
| Context facts included | ${summary.contextFactsIncluded} |

Open Targets release: ${summary.release || 'not specified'}

Input fingerprint: \`${summary.inputFingerprint}\`

## Input Files

| Path | Dataset | Records |
| --- | --- | ---: |
${inputRows}

## Mapping Status

| Status | Count |
| --- | ---: |
${statusRows}

## Mapped Rows

| Diognosis substance | ChEMBL/Open Targets ID | Open Targets name | Match status | Confidence |
| --- | --- | --- | --- | ---: |
${mappedRows}

## Rows Requiring Manual Review

| Diognosis substance | Status | Reason |
| --- | --- | --- |
${reviewRows}

## Import Contract

- The importer reads local Open Targets dataset exports or saved GraphQL spot-lookup JSON only.
- The generated snapshot is static data under \`src/data/generatedOpenTargetsSnapshot.js\`.
- Open Targets-derived facts are context, not Diognosis warning evidence.
- Combination products remain under Diognosis authority unless a reviewer maps individual ingredients deliberately.
- Future UI cards must show these facts as external safety context with a needs-review badge.
`;
}

function writeIfChanged(filePath, content, check) {
  if (existsSync(filePath) && readFileSync(filePath, 'utf8') === content) return false;
  if (check) {
    throw new Error(`${relative(ROOT, filePath)} is stale. Run npm run integrate:open-targets.`);
  }
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
  return true;
}

try {
  const args = parseArgs(process.argv.slice(2));
  const data = loadMedcheckContext();
  const manual = loadManualCrosswalk(args.manualCrosswalk);
  const inputFiles = collectInputFiles(args.inputDir);
  const snapshot = buildSnapshot(data, inputFiles, manual, args);
  const fingerprint = stableFingerprint(inputFiles, args.manualCrosswalk);
  const wroteJs = writeIfChanged(OUT_JS, renderJs(snapshot, fingerprint), args.check);
  const wroteMd = writeIfChanged(OUT_MD, renderMarkdown(snapshot, fingerprint), args.check);

  console.log(JSON.stringify({
    ok: true,
    check: args.check,
    wrote: {
      generatedOpenTargetsSnapshot: wroteJs,
      openTargetsIntegrationAudit: wroteMd,
    },
    summary: { ...snapshot.summary, inputFingerprint: fingerprint },
  }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
