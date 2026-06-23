#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const GROUPS = {
  unit: [
    ['build', ['build.js']],
    ['smoke', ['scripts/smoke-check.js']],
    ['regression', ['scripts/regression-check.js']],
    ['strict validation', ['scripts/validate-db.js', '--strict']],
    ['evidence citations', ['scripts/check-evidence.js']],
  ],
};

function usage() {
  console.log(`Usage: node scripts/test-gate.js <${Object.keys(GROUPS).join('|')}>`);
}

const target = process.argv[2];
const tasks = GROUPS[target];
if (!tasks) {
  usage();
  process.exit(1);
}

const failures = [];
for (const [name, args] of tasks) {
  console.log(`\n▶ ${name}`);
  const result = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit' });
  if ((result.status ?? 1) !== 0) failures.push(name);
}

if (failures.length) {
  console.error(`\nTest gate failed: ${failures.join(', ')}`);
  process.exit(1);
}

console.log(`\nTest gate passed: ${target}`);
