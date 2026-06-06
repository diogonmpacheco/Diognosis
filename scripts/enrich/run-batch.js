#!/usr/bin/env node
// Run curated legal literature discovery queries in sequence.

import { existsSync, readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { resolve } from 'path';

const root = resolve(new URL('../..', import.meta.url).pathname);
const DEFAULT_BATCH = resolve(root, 'scripts/enrich/legal-literature-batch.json');
const ENRICH_SCRIPT = resolve(root, 'scripts/enrich/pubmed-enrich.js');
const AREA_BATCHES = {
  '1': 'scripts/enrich/primary-care-common-chronic-batch.json',
  'primary-care/common chronic meds': 'scripts/enrich/primary-care-common-chronic-batch.json',
  'primary care/common chronic meds': 'scripts/enrich/primary-care-common-chronic-batch.json',
  'primary-care': 'scripts/enrich/primary-care-common-chronic-batch.json',
  'primary care': 'scripts/enrich/primary-care-common-chronic-batch.json',
};

function usage() {
  return `Usage:
  node scripts/enrich/run-batch.js [--batch scripts/enrich/legal-literature-batch.json] [--limit 8] [--providers pubmed,europepmc,openalex,semanticscholar] [--oa --oa-email you@example.com]
  node scripts/enrich/run-batch.js --area 1

Runs each batch query through pubmed-enrich.js. Provider responses are cached and drafts are deduped.
`;
}

function parseArgs(argv) {
  const args = {};
  const booleanArgs = new Set(['help', 'oa', 'expand-citations']);
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    if (booleanArgs.has(key)) args[key] = true;
    else args[key] = argv[++i];
  }
  return args;
}

function pushOpt(argv, key, value) {
  if (value === undefined || value === null || value === false) return;
  argv.push(`--${key}`);
  if (value !== true) argv.push(String(value));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const areaBatch = args.area ? AREA_BATCHES[String(args.area).toLowerCase()] : null;
  if (args.area && !areaBatch) throw new Error(`Unknown enrichment area: ${args.area}`);
  const batchPath = resolve(root, args.batch || areaBatch || DEFAULT_BATCH);
  if (!existsSync(batchPath)) throw new Error(`Batch file not found: ${batchPath}`);
  const batch = JSON.parse(readFileSync(batchPath, 'utf8'));
  const queries = batch.queries || [];
  if (!queries.length) throw new Error(`Batch file has no queries: ${batchPath}`);

  const failures = [];
  for (const item of queries) {
    const argv = [ENRICH_SCRIPT];
    pushOpt(argv, 'query', item.query);
    pushOpt(argv, 'relation', item.relation);
    pushOpt(argv, 'supports', (item.supports || []).join(','));
    pushOpt(argv, 'providers', args.providers || item.providers || 'pubmed,europepmc,openalex,semanticscholar');
    pushOpt(argv, 'limit', args.limit || item.limit || 8);
    pushOpt(argv, 'email', args.email);
    pushOpt(argv, 'mailto', args.mailto);
    pushOpt(argv, 'api-key', args['api-key']);
    pushOpt(argv, 'semantic-scholar-key', args['semantic-scholar-key']);
    pushOpt(argv, 'oa', args.oa || item.oa);
    pushOpt(argv, 'oa-email', args['oa-email'] || args.mailto || args.email);
    pushOpt(argv, 'expand-citations', args['expand-citations'] || item.expandCitations);

    console.error(`\n▶ ${item.relation}`);
    const result = spawnSync(process.execPath, argv, {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
    });
    if (result.status !== 0) failures.push({ relation: item.relation, status: result.status });
  }

  if (failures.length) {
    console.error(`\nBatch finished with ${failures.length} failed quer${failures.length === 1 ? 'y' : 'ies'}.`);
    for (const failure of failures) console.error(`- ${failure.relation}: exit ${failure.status}`);
    process.exit(1);
  }
  console.error('\nBatch complete.');
}

main();
