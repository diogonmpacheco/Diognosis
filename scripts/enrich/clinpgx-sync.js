#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { resolve } from 'path';
import { ROOT } from './lib/medcheck-source-loader.js';

export const CLINPGX_RATE_LIMIT_MS = 550;

function parseArgs(argv) {
  const args = { check: false, fetch: false, out: 'data/enrichment/staged/clinpgx-staged-records.json' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--check') args.check = true;
    else if (arg === '--fetch') args.fetch = true;
    else if (arg === '--out') args.out = argv[++i];
    else if (arg.startsWith('--out=')) args.out = arg.slice(6);
    else if (arg.startsWith('--max-genes=')) args.maxGenes = Number(arg.slice(12));
    else if (arg.startsWith('--max-drugs=')) args.maxDrugs = Number(arg.slice(12));
    else if (arg === '--include-labels') args.includeLabels = true;
    else if (arg === '--include-variants') args.includeVariants = true;
  }
  if (!args.check && !args.fetch) args.check = true;
  return args;
}

async function sleep(ms) {
  return new Promise(resolveSleep => setTimeout(resolveSleep, ms));
}

export async function rateLimitedFetch(url, options = {}, attempt = 0) {
  await sleep(CLINPGX_RATE_LIMIT_MS);
  const res = await fetch(url, options);
  if (res.status === 429 && attempt < 3) {
    await sleep(CLINPGX_RATE_LIMIT_MS * (attempt + 2));
    return rateLimitedFetch(url, options, attempt + 1);
  }
  return res;
}

function runNormalize(out) {
  const script = resolve(ROOT, 'scripts/enrich/clinpgx-normalize.js');
  return spawnSync(process.execPath, [script, '--out', out], { cwd: ROOT, stdio: 'inherit' });
}

const args = parseArgs(process.argv.slice(2));
if (args.fetch) {
  console.log(`ClinPGx fetch mode is opt-in and rate-limited at ${CLINPGX_RATE_LIMIT_MS} ms/request. This run normalizes cached/offline context only.`);
}
const result = runNormalize(args.out);
process.exit(result.status || 0);
