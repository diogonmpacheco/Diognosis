#!/usr/bin/env node
import { createHash } from 'crypto';
import { isAbsolute, relative, resolve } from 'path';
import { drugAliasMap, loadDiognosisData, normalizeName, readGeneratedConstObject, ROOT } from './lib/diognosis-source-loader.js';
import { dedupeStagedSourceRecords, normalizeStagedSourceRecord } from './lib/staged-source-schema.js';
import { readJson, writeJson } from './lib/enrichment-common.js';

const DEFAULT_OUT = resolve(ROOT, 'data/enrichment/staged/clinpgx-staged-records.json');
const DEFAULT_META = resolve(ROOT, 'data/enrichment/snapshots/clinpgx-snapshot-metadata.json');
const DEFAULT_SNAPSHOT = resolve(ROOT, 'src/data/generatedOpenTargetsSnapshot.js');
const DEFAULT_RAW_INDEX = resolve(ROOT, 'data/enrichment/snapshots/clinpgx-raw/index.json');

function parseArgs(argv) {
  const args = { out: DEFAULT_OUT, metadata: DEFAULT_META, snapshot: DEFAULT_SNAPSHOT, rawIndex: DEFAULT_RAW_INDEX, limit: 200, directLimit: 1500, fromCache: false, includeDerived: true };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') args.out = resolve(ROOT, argv[++i]);
    else if (arg.startsWith('--out=')) args.out = resolve(ROOT, arg.slice(6));
    else if (arg === '--metadata') args.metadata = resolve(ROOT, argv[++i]);
    else if (arg.startsWith('--metadata=')) args.metadata = resolve(ROOT, arg.slice(11));
    else if (arg === '--snapshot') args.snapshot = resolve(ROOT, argv[++i]);
    else if (arg.startsWith('--snapshot=')) args.snapshot = resolve(ROOT, arg.slice(11));
    else if (arg === '--limit') args.limit = Number(argv[++i]);
    else if (arg.startsWith('--limit=')) args.limit = Number(arg.slice(8));
    else if (arg === '--direct-limit') args.directLimit = Number(argv[++i]);
    else if (arg.startsWith('--direct-limit=')) args.directLimit = Number(arg.slice(15));
    else if (arg === '--from-cache') args.fromCache = true;
    else if (arg === '--raw-index') args.rawIndex = resolve(ROOT, argv[++i]);
    else if (arg.startsWith('--raw-index=')) args.rawIndex = resolve(ROOT, arg.slice(12));
    else if (arg === '--direct-only') args.includeDerived = false;
  }
  return args;
}

function truncate(value, max = 220) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function sourceBase(fetchedAt, release) {
  return {
    name: 'ClinPGx',
    sourceType: 'structured_guideline',
    url: 'https://api.clinpgx.org',
    endpoint: 'Open Targets pharmacogenetics snapshot',
    fetchedAt,
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    attribution: 'ClinPGx context imported through the offline Open Targets snapshot; verify source object before promotion.',
    rateLimit: '2 requests/second; use >=550 ms spacing',
    refreshCadence: 'weekly',
    release,
  };
}

function repoRelativePath(path) {
  if (!path) return '';
  return (isAbsolute(path) ? relative(ROOT, path) : path).replace(/\\/g, '/');
}

function resolveRepoPath(path) {
  if (!path) return '';
  return isAbsolute(path) ? path : resolve(ROOT, path);
}

function cacheKeyFor(entry) {
  if (entry.cacheKey) return entry.cacheKey;
  return createHash('sha256')
    .update(JSON.stringify({
      endpoint: entry.endpoint || '',
      params: entry.params || {},
      status: entry.status || '',
      sha256: entry.sha256 || entry.responseSha256 || '',
    }))
    .digest('hex');
}

function cacheIdFor(entry, cacheKey) {
  if (entry.cacheId) return entry.cacheId;
  return `${String(entry.endpoint || 'clinpgx').replace(/\//g, '_')}-${cacheKey.slice(0, 12)}`;
}

function sanitizeProviderFailure(entry) {
  const cacheKey = cacheKeyFor(entry);
  const cacheId = cacheIdFor(entry, cacheKey);
  return {
    endpoint: entry.endpoint || '',
    params: entry.params || {},
    status: entry.status || '',
    records: entry.records || 0,
    cacheId,
    cacheKey,
    cacheFile: repoRelativePath(entry.cacheFile || `data/enrichment/cache/clinpgx/${cacheId}.json`),
    responseSha256: entry.responseSha256 || entry.sha256 || '',
    error: entry.error || undefined,
  };
}

function mapClaimType(fact) {
  if (/label/i.test(fact.factType || fact.warningType || '')) return 'drug_label';
  if (/guideline/i.test(fact.factType || fact.sourceCategory || '')) return 'guideline_annotation';
  if (/variant/i.test(fact.factType || fact.riskMarker || '')) return 'variant_annotation';
  return 'clinical_annotation';
}

function normalizeClinPgxRecords() {
  const args = parseArgs(process.argv.slice(2));
  const data = loadDiognosisData();
  const aliasMap = drugAliasMap(data.DRUG_DB || []);
  const snapshot = readGeneratedConstObject(args.snapshot, 'GENERATED_OPEN_TARGETS_SNAPSHOT') || {};
  const release = snapshot.release || snapshot.summary?.release || 'unknown';
  const fetchedAt = new Date().toISOString();
  const crosswalk = new Map();
  for (const row of snapshot.crosswalk || []) {
    if (row.chemblId && row.diognosisName) crosswalk.set(row.chemblId, row.diognosisName);
  }
  const facts = Object.values(snapshot.contextByChemblId || {})
    .flat()
    .filter(fact => /clinpgx|pharmacogenetics/i.test(`${fact.source || ''} ${fact.factType || ''} ${fact.openTargetsSourceDataset || ''}`))
    .slice(0, Number.isFinite(args.limit) ? args.limit : 200);

  const records = facts.map((fact) => {
    const diognosisDrug = crosswalk.get(fact.chemblId) || aliasMap.get(normalizeName(fact.drugName || fact.label)) || '';
    const gene = fact.targetGene || '';
    return normalizeStagedSourceRecord({
      source: sourceBase(fetchedAt, release),
      claim: {
        claimType: mapClaimType(fact),
        genes: gene ? [gene] : [],
        drugs: diognosisDrug ? [diognosisDrug] : [],
        riskMarkers: fact.riskMarker ? [fact.riskMarker] : [],
        pathways: gene ? [gene] : [],
        direction: fact.drugResponseCategory || fact.warningType || '',
        affectedActors: [diognosisDrug, gene].filter(Boolean),
        mechanismSummary: truncate(fact.label || fact.warningType || fact.drugResponseCategory || 'ClinPGx pharmacogenetics context'),
        clinicalSummary: 'ClinPGx source context is staged for review and cannot affect severity or scoring until promoted by Diognosis review.',
      },
      evidence: {
        sourceIdentifiers: [fact.id, fact.riskMarker, fact.sourceEvidenceLevel && `ClinPGx evidence ${fact.sourceEvidenceLevel}`].filter(Boolean),
        urls: ['https://api.clinpgx.org'],
        strongestExternalTier: fact.sourceEvidenceLevel || 'ClinPGx',
        openAccess: {
          hasLegalOpenAccess: false,
          provider: 'ClinPGx',
          license: 'CC BY-SA 4.0',
          url: 'https://creativecommons.org/licenses/by-sa/4.0/',
        },
      },
      mapping: {
        matchedDiognosisDrugs: diognosisDrug ? [diognosisDrug] : [],
        unmatchedDrugs: diognosisDrug ? [] : [fact.chemblId || fact.openTargetsDrugId || 'unknown'],
        matchedGenes: gene && data.GENOTYPE_EFFECTS?.[gene] ? [gene] : [],
        unmatchedGenes: gene && !data.GENOTYPE_EFFECTS?.[gene] ? [gene] : [],
      },
      governance: {
        reviewRequired: true,
        professionalReviewStatus: 'pending',
        sourceFaithfulnessStatus: 'unreviewed',
        discoveryStatus: 'staged',
        curationStatus: 'candidate',
        scoringStatus: 'cannot_affect_scoring',
        publicDisplayStatus: 'review_queue_only',
        canAffectScoring: false,
        canAffectPublicSeverity: false,
        canBeBundledPublicly: false,
        promotionTarget: null,
      },
      provenance: {
        normalizedAt: fetchedAt,
        normalizerVersion: 'clinpgx-normalize.v2',
        sourceRelease: release,
        sourceSnapshotId: release,
        sourceObjectId: fact.id || fact.riskMarker || '',
        sourceObjectHash: createHash('sha256').update(JSON.stringify(fact)).digest('hex'),
        sourceTruthStatus: 'derived_from_open_targets_snapshot',
      },
      notes: [`Open Targets release ${release}; source dataset ${fact.openTargetsSourceDataset || fact.factType || 'pharmacogenetics'}.`],
      warnings: ['ClinPGx source text/meaning must be checked against the current ClinPGx object before promotion.'],
    });
  });
  return { records: dedupeStagedSourceRecords(records), metadata: { snapshot, release, facts } };
}

function normalizeDirectClinPgxRecords(rawIndexPath, limit = 1500) {
  const index = readJson(rawIndexPath, null);
  if (!index?.fetched?.length) return { records: [], providerFailures: index?.providerFailures || [], rateLimitEvents: index?.rateLimitEvents || 0 };
  const data = loadDiognosisData();
  const aliasMap = drugAliasMap(data.DRUG_DB || []);
  const normalizedAt = new Date().toISOString();
  const records = [];
  for (const entry of index.fetched || []) {
    if (records.length >= limit) break;
    const payload = readJson(resolveRepoPath(entry.file || entry.cacheFile), null);
    const rows = Array.isArray(payload?.response?.data) ? payload.response.data : [];
    for (const row of rows) {
      if (records.length >= limit) break;
      const record = directRowToRecord(row, payload, aliasMap, data, normalizedAt);
      if (record) records.push(record);
    }
  }
  return {
    records: dedupeStagedSourceRecords(records),
    providerFailures: (index.providerFailures || []).map(sanitizeProviderFailure),
    rateLimitEvents: index.rateLimitEvents || 0,
  };
}

function directRowToRecord(row, payload, aliasMap, data, normalizedAt) {
  const endpoint = payload.endpoint || '';
  const claimType = endpoint.includes('summaryAnnotation') ? 'clinical_annotation'
    : endpoint.includes('guidelineAnnotation') ? 'guideline_annotation'
      : endpoint.includes('label') ? 'drug_label'
        : endpoint.includes('variantAnnotation') ? 'variant_annotation'
          : endpoint.includes('gene') ? 'reference_gene'
            : endpoint.includes('chemical') ? 'reference_chemical'
              : 'other';
  const genes = extractGenes(row);
  const chemicalNames = extractChemicals(row);
  const matchedDrugs = chemicalNames.map(name => aliasMap.get(normalizeName(name))).filter(Boolean);
  const unmatchedDrugs = chemicalNames.filter(name => !aliasMap.get(normalizeName(name)));
  const sourceObjectId = String(row.accessionId || row.id || row.name || row.symbol || '');
  const sourceIdentifiers = [sourceObjectId && `ClinPGx:${claimType}:${sourceObjectId}`, row._sameAs].filter(Boolean);
  return normalizeStagedSourceRecord({
    source: {
      name: 'ClinPGx',
      sourceType: 'structured_guideline',
      url: payload.url || 'https://api.clinpgx.org/v1',
      endpoint,
      fetchedAt: payload.fetchedAt || normalizedAt,
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      attribution: 'ClinPGx REST API source object; staged until source faithfulness is checked and professional sign-off is explicit.',
      rateLimit: '2 requests/second; use >=550 ms spacing',
      refreshCadence: 'weekly',
    },
    claim: {
      claimType,
      genes,
      drugs: matchedDrugs,
      riskMarkers: extractRiskMarkers(row),
      pathways: genes,
      direction: row.levelOfEvidence?.term || row.testingLevel || row.source || '',
      affectedActors: [...matchedDrugs, ...genes],
      mechanismSummary: truncate(row.name || row.description || `${claimType} source object ${sourceObjectId}`),
      clinicalSummary: 'Direct ClinPGx API source object is staged for review and cannot affect scoring or public severity until explicitly promoted.',
    },
    evidence: {
      sourceIdentifiers,
      urls: [payload.url].filter(Boolean),
      strongestExternalTier: row.levelOfEvidence?.term || row.source || 'ClinPGx',
      openAccess: {
        hasLegalOpenAccess: false,
        provider: 'ClinPGx',
        license: 'CC BY-SA 4.0',
        url: 'https://creativecommons.org/licenses/by-sa/4.0/',
      },
    },
    mapping: {
      matchedDiognosisDrugs: matchedDrugs,
      unmatchedDrugs,
      matchedGenes: genes.filter(gene => data.GENOTYPE_EFFECTS?.[gene]),
      unmatchedGenes: genes.filter(gene => !data.GENOTYPE_EFFECTS?.[gene]),
    },
    governance: {
      reviewRequired: true,
      professionalReviewStatus: 'pending',
      sourceFaithfulnessStatus: 'unreviewed',
      discoveryStatus: 'staged',
      curationStatus: 'candidate',
      scoringStatus: 'cannot_affect_scoring',
      publicDisplayStatus: 'review_queue_only',
      canAffectScoring: false,
      canAffectPublicSeverity: false,
      canBeBundledPublicly: false,
      promotionTarget: null,
      promotionReadiness: 'ready_for_source_faithfulness_review',
    },
    provenance: {
      rawSourceCachePath: payload.url || '',
      normalizedAt,
      normalizerVersion: 'clinpgx-normalize.v2',
      sourceRelease: 'api-v1',
      sourceSnapshotId: payload.cacheKey || payload.sha256 || '',
      sourceObjectId,
      sourceObjectHash: createHash('sha256').update(JSON.stringify(row)).digest('hex'),
      sourceTruthStatus: 'fetched_from_clinpgx_api',
    },
    notes: ['Fetched from ClinPGx API cache. Review source faithfulness, mapping, wording, and clinical status before any promotion.'],
    warnings: ['Direct ClinPGx data is not auto-promoted and is not scoring-enabled.'],
  });
}

function extractGenes(row) {
  return [...new Set([
    row.symbol,
    ...(row.location?.genes || []).map(gene => gene.symbol),
    ...(row.relatedGenes || []).map(gene => gene.symbol || gene.name),
  ].filter(Boolean))];
}

function extractChemicals(row) {
  return [...new Set([
    row.name && row.objCls === 'Chemical' ? row.name : '',
    ...(row.relatedChemicals || []).map(chemical => chemical.name),
  ].filter(Boolean))];
}

function extractRiskMarkers(row) {
  return [...new Set([
    row.location?.fingerprint,
    row.alleleGenotype,
    ...(row.variantHaplotypes || []).map(item => item.name || item.symbol),
  ].filter(Boolean))];
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const derived = args.includeDerived ? normalizeClinPgxRecords() : { records: [], metadata: { release: 'not-included', facts: [] } };
  const direct = args.fromCache ? normalizeDirectClinPgxRecords(args.rawIndex, args.directLimit) : { records: [], providerFailures: [], rateLimitEvents: 0 };
  const records = dedupeStagedSourceRecords([...direct.records, ...derived.records]);
  writeJson(args.out, records);
  writeJson(args.metadata, {
    schema: 'diognosis.clinpgx-snapshot-metadata.v1',
    generatedAt: new Date().toISOString(),
    source: 'ClinPGx',
    fetched: direct.records.length > 0,
    mode: direct.records.length ? 'direct_api_cache_plus_derived_context' : 'open_targets_derived_context',
    sourceRelease: derived.metadata.release,
    directFetchedRecords: direct.records.length,
    openTargetsDerivedRecords: derived.records.length,
    providerFailures: direct.providerFailures,
    rateLimitEvents: direct.rateLimitEvents,
    stagedRecords: records.length,
    note: direct.records.length
      ? 'Direct ClinPGx API cache and existing ClinPGx/Open Targets derived context are staged separately. No record is promoted or scoring-enabled.'
      : 'Check mode normalizes existing ClinPGx/Open Targets derived context. Fetch mode uses cached REST JSON with the documented rate limit.',
  });
  console.log(JSON.stringify({ ok: true, stagedRecords: records.length, out: args.out, metadata: args.metadata }, null, 2));
}

main();
