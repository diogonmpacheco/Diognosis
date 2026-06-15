#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { resolve } from 'path';
import { ROOT } from './lib/diognosis-source-loader.js';

function parseArgs(argv) {
  const args = { check: false, fetch: false, normalize: false, out: 'data/enrichment/staged/cpic-staged-records.json', limit: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--check') args.check = true;
    else if (arg === '--fetch') args.fetch = true;
    else if (arg === '--normalize') args.normalize = true;
    else if (arg === '--out') args.out = argv[++i];
    else if (arg.startsWith('--out=')) args.out = arg.slice(6);
    else if (arg === '--limit') args.limit = Number(argv[++i]);
    else if (arg.startsWith('--limit=')) args.limit = Number(arg.slice(8));
  }
  if (!args.check && !args.fetch && !args.normalize) args.check = true;
  return args;
}

function runNormalize(out, fromCache = false) {
  const script = resolve(ROOT, 'scripts/enrich/cpic-normalize.js');
  return spawnSync(process.execPath, [script, '--out', out, ...(fromCache ? ['--from-cache'] : [])], { cwd: ROOT, stdio: 'inherit' });
}

const args = parseArgs(process.argv.slice(2));
if (args.fetch) {
  const fetchScript = resolve(ROOT, 'scripts/enrich/cpic-fetch.js');
  const fetchArgs = [fetchScript];
  if (Number.isFinite(args.limit)) fetchArgs.push(`--limit=${args.limit}`);
  const fetched = spawnSync(process.execPath, fetchArgs, { cwd: ROOT, stdio: 'inherit' });
  if (fetched.status && fetched.status !== 2) process.exit(fetched.status);
}
const result = runNormalize(args.out, args.fetch || args.normalize);
process.exit(result.status || 0);
