#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { ROOT } from './lib/medcheck-source-loader.js';

const args = process.argv.slice(2);
const forwarded = args.filter(arg => arg !== '--check' && arg !== '--fetch');
const result = spawnSync(process.execPath, ['scripts/enrich/label-source-normalize.js', ...forwarded], {
  cwd: ROOT,
  stdio: 'inherit',
});
process.exit(result.status || 0);
