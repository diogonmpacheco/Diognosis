#!/usr/bin/env node
import { createHash } from 'crypto';
import { resolve } from 'path';
import { drugAliasMap, loadMedcheckData, normalizeName, ROOT } from './lib/medcheck-source-loader.js';
import { readJson, writeJson, writeText } from './lib/enrichment-common.js';
import { normalizeStagedSourceRecord } from './lib/staged-source-schema.js';

const DEFAULT_OUT = resolve(ROOT, 'data/enrichment/staged/label-staged-records.json');
const DEFAULT_META = resolve(ROOT, 'data/enrichment/snapshots/label-source-snapshot-metadata.json');
const DEFAULT_RAW_INDEX = resolve(ROOT, 'data/enrichment/snapshots/label-source-raw/index.json');
const OUT_AUDIT = resolve(ROOT, 'docs/audits/label-source-coverage-audit.json');
const OUT_MD = resolve(ROOT, 'docs/audits/label-source-coverage-audit.md');
const DAILYMED_BASE = 'https://dailymed.nlm.nih.gov/dailymed/services/v2';

function parseArgs(argv) {
  const args = { out: DEFAULT_OUT, metadata: DEFAULT_META, rawIndex: DEFAULT_RAW_INDEX, fetch: false, maxDrugs: 40 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') args.out = resolve(ROOT, argv[++i]);
    else if (arg.startsWith('--out=')) args.out = resolve(ROOT, arg.slice(6));
    else if (arg === '--metadata') args.metadata = resolve(ROOT, argv[++i]);
    else if (arg.startsWith('--metadata=')) args.metadata = resolve(ROOT, arg.slice(11));
    else if (arg === '--raw-index') args.rawIndex = resolve(ROOT, argv[++i]);
    else if (arg.startsWith('--raw-index=')) args.rawIndex = resolve(ROOT, arg.slice(12));
    else if (arg === '--fetch') args.fetch = true;
    else if (arg === '--max-drugs') args.maxDrugs = Number(argv[++i]);
    else if (arg.startsWith('--max-drugs=')) args.maxDrugs = Number(arg.slice(12));
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const data = loadMedcheckData();
const aliasMap = drugAliasMap(data.DRUG_DB || []);
const rawIndex = args.fetch ? await fetchDailyMedMetadata(args) : readJson(args.rawIndex, null);
const records = rawIndex?.fetched?.length ? normalizeDailyMedRecords(rawIndex, aliasMap) : [];
const metadata = {
  schema: 'diognosis.label-source-snapshot-metadata.v1',
  generatedAt: new Date().toISOString(),
  mode: args.fetch ? 'fetch_public_metadata' : 'check',
  source: 'DailyMed public label metadata',
  stagedRecords: records.length,
  fetchedRecords: rawIndex?.fetched?.length || 0,
  providerFailures: rawIndex?.providerFailures || [],
  sourceTruthStatus: rawIndex?.fetched?.length ? 'fetched_public_label_metadata_only' : 'label_source_candidate_not_fetched',
  note: rawIndex?.fetched?.length
    ? 'DailyMed public label metadata was fetched. No full label text, tables, figures, or abstracts are stored.'
    : 'Label-source intake lane is initialized for allowlisted public label metadata. No source objects were fetched in check mode.',
};

writeJson(args.out, records);
writeJson(args.metadata, metadata);
writeJson(OUT_AUDIT, {
  schema: 'diognosis.label-source-coverage-audit.v1',
  generatedAt: metadata.generatedAt,
  stagedRecords: records.length,
  fetchedRecords: metadata.fetchedRecords,
  providerFailures: metadata.providerFailures,
  sourceTruthStatus: metadata.sourceTruthStatus,
  reviewBoundary: 'label_source_lane_initialized_no_runtime_fetch_no_core_promotion',
});
writeText(OUT_MD, `# Label Source Coverage Audit

Generated: ${metadata.generatedAt}

- Staged label records: ${records.length}
- Fetched source metadata records: ${metadata.fetchedRecords}
- Provider failures: ${metadata.providerFailures.length}
- Source truth status: ${metadata.sourceTruthStatus}
- Boundary: label source intake is build-time only. It stores public metadata/identifiers only and cannot affect scoring or public severity without live pending-review promotion.
`);
console.log(JSON.stringify({ ok: true, stagedRecords: records.length, sourceTruthStatus: metadata.sourceTruthStatus }, null, 2));

function highPriorityDrugs(maxDrugs) {
  const starter = [
    'Tacrolimus',
    'Fluconazole',
    'Clopidogrel',
    'Omeprazole',
    'Codeine',
    'Fluoxetine',
    'Tamoxifen',
    'Capecitabine',
    'Irinotecan',
    'Azathioprine',
    'Mercaptopurine',
    'Warfarin',
    'Succinylcholine',
    'Simvastatin',
    'Clarithromycin',
    'Paroxetine',
    'Rifampin',
  ];
  const names = [...starter, ...(data.DRUG_DB || []).map(drug => drug.name)];
  return [...new Set(names)].slice(0, maxDrugs);
}

async function fetchDailyMedMetadata(fetchArgs) {
  const fetched = [];
  const providerFailures = [];
  for (const drugName of highPriorityDrugs(fetchArgs.maxDrugs)) {
    const url = `${DAILYMED_BASE}/spls.json?drug_name=${encodeURIComponent(drugName)}&name_type=both`;
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      const body = await res.text();
      let response = null;
      try {
        response = JSON.parse(body);
      } catch {
        response = null;
      }
      const dataRows = response?.data || response?.results || [];
      const metadataRows = Array.isArray(dataRows) ? dataRows.slice(0, 3).map(row => ({
        setid: row.setid || row.setId || row.set_id || '',
        splVersion: row.spl_version || row.splVersion || '',
        title: row.title || '',
        publishedDate: row.published_date || row.publishedDate || '',
        labelType: row.type || row.label_type || '',
      })).filter(row => row.setid || row.title) : [];
      fetched.push({
        drugName,
        url,
        status: res.status,
        fetchedAt: new Date().toISOString(),
        sha256: createHash('sha256').update(JSON.stringify(metadataRows)).digest('hex'),
        records: metadataRows,
      });
      if (res.status !== 200) providerFailures.push({ drugName, url, status: res.status });
      await new Promise(resolveSleep => setTimeout(resolveSleep, 150));
    } catch (error) {
      providerFailures.push({ drugName, url, status: 'network_error', error: error.message });
    }
  }
  const index = {
    schema: 'diognosis.label-source-public-metadata-index.v1',
    generatedAt: new Date().toISOString(),
    source: 'DailyMed',
    baseUrl: DAILYMED_BASE,
    fetched,
    providerFailures,
    note: 'Public metadata only. No label body/full text is stored.',
  };
  writeJson(fetchArgs.rawIndex, index);
  return index;
}

function normalizeDailyMedRecords(index, aliasMapRef) {
  const normalizedAt = new Date().toISOString();
  const rows = [];
  for (const item of index.fetched || []) {
    const matchedDrug = aliasMapRef.get(normalizeName(item.drugName)) || item.drugName;
    for (const label of item.records || []) {
      const sourceObjectId = label.setid || createHash('sha256').update(`${item.drugName}:${label.title}`).digest('hex').slice(0, 12);
      const labelUrl = label.setid
        ? `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${encodeURIComponent(label.setid)}`
        : item.url;
      rows.push(normalizeStagedSourceRecord({
        source: {
          name: 'DailyMed',
          sourceType: 'external_context',
          url: labelUrl,
          endpoint: item.url,
          fetchedAt: item.fetchedAt || normalizedAt,
          license: 'U.S. National Library of Medicine public API metadata',
          attribution: 'DailyMed public label metadata; no full label text stored.',
          refreshCadence: 'weekly',
        },
        claim: {
          claimType: 'drug_label',
          drugs: [matchedDrug],
          direction: 'label_metadata',
          affectedActors: [matchedDrug],
          mechanismSummary: `DailyMed label metadata available for ${matchedDrug}.`,
          clinicalSummary: 'Public label metadata is staged as source context only and remains pending professional review.',
        },
        evidence: {
          sourceIdentifiers: [`DailyMed:${sourceObjectId}`, label.splVersion && `SPL version ${label.splVersion}`].filter(Boolean),
          urls: [labelUrl],
          strongestExternalTier: 'FDA_LABEL',
          openAccess: {
            hasLegalOpenAccess: true,
            provider: 'DailyMed',
            license: 'public metadata',
            url: labelUrl,
          },
        },
        mapping: {
          matchedDiognosisDrugs: [matchedDrug],
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
          rawSourceCachePath: item.url,
          normalizedAt,
          normalizerVersion: 'label-source-normalize.v2',
          sourceRelease: label.publishedDate || 'DailyMed v2',
          sourceSnapshotId: item.sha256 || '',
          sourceObjectId,
          sourceObjectHash: createHash('sha256').update(JSON.stringify(label)).digest('hex'),
          sourceTruthStatus: 'fetched_public_label_metadata_only',
        },
        notes: ['DailyMed metadata record. Label body text was not copied or stored.'],
      }));
    }
  }
  return rows;
}
