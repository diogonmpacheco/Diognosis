#!/usr/bin/env node
import { createHash } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { relative, resolve } from 'path';
import { loadMedcheckData, ROOT } from './lib/medcheck-source-loader.js';
import { writeJson } from './lib/enrichment-common.js';

export const CLINPGX_RATE_LIMIT_MS = 550;

const DEFAULT_CACHE_DIR = resolve(ROOT, 'data/enrichment/cache/clinpgx');
const DEFAULT_RAW_DIR = resolve(ROOT, 'data/enrichment/snapshots/clinpgx-raw');
const CLINPGX_BASE = 'https://api.clinpgx.org/v1';

function parseArgs(argv) {
  const args = {
    cacheDir: DEFAULT_CACHE_DIR,
    rawDir: DEFAULT_RAW_DIR,
    maxGenes: 50,
    maxDrugs: 100,
    maxPairs: 60,
    includeLabels: false,
    includeVariants: false,
    forceRefresh: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--cache-dir') args.cacheDir = resolve(ROOT, argv[++i]);
    else if (arg.startsWith('--cache-dir=')) args.cacheDir = resolve(ROOT, arg.slice(12));
    else if (arg === '--raw-dir') args.rawDir = resolve(ROOT, argv[++i]);
    else if (arg.startsWith('--raw-dir=')) args.rawDir = resolve(ROOT, arg.slice(10));
    else if (arg === '--max-genes') args.maxGenes = Number(argv[++i]);
    else if (arg.startsWith('--max-genes=')) args.maxGenes = Number(arg.slice(12));
    else if (arg === '--max-drugs') args.maxDrugs = Number(argv[++i]);
    else if (arg.startsWith('--max-drugs=')) args.maxDrugs = Number(arg.slice(12));
    else if (arg === '--max-pairs') args.maxPairs = Number(argv[++i]);
    else if (arg.startsWith('--max-pairs=')) args.maxPairs = Number(arg.slice(12));
    else if (arg === '--include-labels') args.includeLabels = true;
    else if (arg === '--include-variants') args.includeVariants = true;
    else if (arg === '--force-refresh') args.forceRefresh = true;
  }
  return args;
}

function sleep(ms) {
  return new Promise(resolveSleep => setTimeout(resolveSleep, ms));
}

async function rateLimitedFetch(url, attempt = 0) {
  await sleep(CLINPGX_RATE_LIMIT_MS);
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (res.status === 429 && attempt < 3) {
    await sleep(CLINPGX_RATE_LIMIT_MS * (attempt + 2));
    return rateLimitedFetch(url, attempt + 1);
  }
  return res;
}

function highPriorityInputs(args) {
  const data = loadMedcheckData();
  const severeDrugs = new Set();
  for (const row of data.KNOWN_DDI || []) {
    if (/severe|critical/i.test(row.severity || '')) {
      if (row.drug1) severeDrugs.add(row.drug1);
      if (row.drug2) severeDrugs.add(row.drug2);
    }
  }
  const genes = Object.keys(data.GENOTYPE_EFFECTS || {}).slice(0, args.maxGenes);
  const drugs = (data.DRUG_DB || [])
    .filter(drug => severeDrugs.has(drug.name) || drug.prodrug || /transplant|oncology|anticoag|antiplatelet|antiarrhythmic|ssri|snri|tca|antipsychotic|azole|macrolide/i.test(`${drug.name} ${drug.cls || ''}`))
    .map(drug => drug.name)
    .slice(0, args.maxDrugs);
  return { genes, drugs };
}

function endpointUrl(endpoint, params) {
  const search = new URLSearchParams(params);
  return `${CLINPGX_BASE}/${endpoint}?${search.toString()}`;
}

function repoRelative(path) {
  return relative(ROOT, path).replace(/\\/g, '/');
}

function cacheKeyFor({ url, endpoint, params, status, responseSha256 }) {
  return createHash('sha256')
    .update(JSON.stringify({ url, endpoint, params, status, responseSha256 }))
    .digest('hex');
}

function cacheIdFor(endpoint, cacheKey) {
  return `${endpoint.replace(/\//g, '_')}-${cacheKey.slice(0, 12)}`;
}

async function fetchAndCache(args, endpoint, params) {
  const url = endpointUrl(endpoint, params);
  try {
    const res = await rateLimitedFetch(url);
    const text = await res.text();
    const responseSha256 = createHash('sha256').update(text).digest('hex');
    const cacheKey = cacheKeyFor({ url, endpoint, params, status: res.status, responseSha256 });
    const cacheId = cacheIdFor(endpoint, cacheKey);
    let response = null;
    try {
      response = JSON.parse(text);
    } catch {
      response = { rawText: text.slice(0, 500) };
    }
    const payload = {
      source: 'ClinPGx',
      url,
      endpoint,
      params,
      fetchedAt: new Date().toISOString(),
      status: res.status,
      sha256: responseSha256,
      responseSha256,
      cacheKey,
      cacheKeyBasis: 'url+endpoint+params+status+responseSha256',
      response,
    };
    const file = resolve(args.cacheDir, `${cacheId}.json`);
    writeJson(file, payload);
    return {
      endpoint,
      params,
      file: repoRelative(file),
      cacheFile: repoRelative(file),
      cacheId,
      cacheKey,
      status: res.status,
      sha256: responseSha256,
      responseSha256,
      records: Array.isArray(response?.data) ? response.data.length : 0,
    };
  } catch (error) {
    return { endpoint, params, status: 'network_error', error: error.message };
  }
}

const args = parseArgs(process.argv.slice(2));
mkdirSync(args.cacheDir, { recursive: true });
mkdirSync(args.rawDir, { recursive: true });
const { genes, drugs } = highPriorityInputs(args);
const requests = [];

for (const gene of genes) requests.push(['data/gene', { symbol: gene }]);
for (const drug of drugs) requests.push(['data/chemical', { name: drug }]);
for (const gene of genes.slice(0, 20)) requests.push(['data/guidelineAnnotation', { 'relatedGenes.symbol': gene }]);
if (args.includeLabels) {
  for (const gene of genes.slice(0, 20)) requests.push(['data/label', { 'relatedGenes.symbol': gene }]);
}
if (args.includeVariants) {
  for (const gene of genes.slice(0, 20)) requests.push(['data/variantAnnotation', { 'location.genes.symbol': gene }]);
}

let pairCount = 0;
for (const gene of genes) {
  for (const drug of drugs) {
    if (pairCount >= args.maxPairs) break;
    requests.push(['data/summaryAnnotation', { 'location.genes.symbol': gene, 'relatedChemicals.name': drug }]);
    pairCount += 1;
  }
  if (pairCount >= args.maxPairs) break;
}

const fetched = [];
const providerFailures = [];
let rateLimitEvents = 0;
for (const [endpoint, params] of requests) {
  const result = await fetchAndCache(args, endpoint, params);
  fetched.push(result);
  if (result.status === 429) rateLimitEvents += 1;
  if (result.status !== 200) providerFailures.push(result);
}

const index = {
  schema: 'diognosis.clinpgx-raw-cache-index.v1',
  generatedAt: new Date().toISOString(),
  source: 'ClinPGx',
  baseUrl: CLINPGX_BASE,
  requestedGenes: genes,
  requestedDrugs: drugs,
  fetched,
  providerFailures,
  rateLimitEvents,
};

writeJson(resolve(args.rawDir, 'index.json'), index);
writeFileSync(resolve(args.rawDir, 'README.md'), '# ClinPGx Raw Cache\n\nGenerated by `scripts/enrich/clinpgx-fetch.js`. Raw responses are script-time cache artifacts and are not trusted clinical content.\n');
console.log(JSON.stringify({ ok: providerFailures.length === 0, fetched: fetched.length, providerFailures: providerFailures.length, rateLimitEvents, index: repoRelative(resolve(args.rawDir, 'index.json')) }, null, 2));
if (providerFailures.length) process.exitCode = 2;
