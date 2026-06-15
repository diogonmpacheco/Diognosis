#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { resolve } from 'path';
import { ROOT } from './lib/medcheck-source-loader.js';

function parseArgs(argv) {
  const args = { check: false, fetch: false, normalize: false, out: 'data/enrichment/staged/cpic-staged-records.json' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--check') args.check = true;
    else if (arg === '--fetch') args.fetch = true;
    else if (arg === '--normalize') args.normalize = true;
    else if (arg === '--out') args.out = argv[++i];
    else if (arg.startsWith('--out=')) args.out = arg.slice(6);
  }
  if (!args.check && !args.fetch && !args.normalize) args.check = true;
  return args;
}

function runNormalize(out) {
  const script = resolve(ROOT, 'scripts/enrich/cpic-normalize.js');
  return spawnSync(process.execPath, [script, '--out', out], { cwd: ROOT, stdio: 'inherit' });
}

const args = parseArgs(process.argv.slice(2));
if (args.fetch) {
  console.log('CPIC fetch mode is intentionally opt-in. This pass keeps provider access cached/staged; no browser/runtime calls occur.');
}
const result = runNormalize(args.out);
process.exit(result.status || 0);
