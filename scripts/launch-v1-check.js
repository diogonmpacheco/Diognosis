#!/usr/bin/env node
import { execFileSync } from 'child_process';

const node = process.execPath;

function run(label, command, args = []) {
  console.log(`\n▶ ${label}`);
  execFileSync(command, args, { stdio:'inherit' });
}

console.log('Diognosis pre-v1 launch gate');
console.log('Checks source stats, generated bundle, MedCheck Engine deep scenario QA, trust audit, release gate, and evidence ledger.');

run('Generate stats', node, ['scripts/gen-stats.js']);
run('Build GitHub Pages bundle', node, ['build.js']);
run('Release check', node, ['scripts/release-check.js']);
run('Launch data trust audit', node, ['scripts/launch-data-trust-audit.js']);
run('Evidence ledger check', node, ['scripts/check-evidence.js']);

console.log('\nDiognosis pre-v1 launch gate passed.');
