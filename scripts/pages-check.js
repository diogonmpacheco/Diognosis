#!/usr/bin/env node
// Diognosis Pages deploy checklist
// Fast confidence gate for live testing. The full pre-release gate remains scripts/release-check.js.

import { existsSync, readFileSync } from 'fs';
import { node, run, verifyReleaseMetadata } from './lib/release-check-common.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function verifyAuxiliaryPages() {
  const requiredFiles = [
    'data-views.html',
    'medication-classes.html',
    'medication-class-examples.html',
    'assets/logo-mark.png',
    'assets/auxiliary-pages.css',
    'src/data/dataViewsIndex.js',
  ];
  for (const file of requiredFiles) {
    assert(existsSync(file), `Pages auxiliary file is missing: ${file}`);
  }
  const workflow = readFileSync('.github/workflows/pages.yml', 'utf8');
  for (const file of requiredFiles.slice(0, 5)) {
    assert(workflow.includes(file), `Pages workflow does not deploy ${file}`);
  }
  assert(/cp src\/data\/\*\.js dist\/src\/data\//.test(workflow), 'Pages workflow must deploy data-views source data files');
  console.log('✓ Auxiliary Pages files and workflow artifact entries');
}

run('Build index.html', node, ['build.js']);
verifyReleaseMetadata();
verifyAuxiliaryPages();

run('Smoke check', node, ['scripts/smoke-check.js']);
run('Privacy/static audit', node, ['scripts/audit/privacy-static-audit.js']);
run('Whitespace diff check', 'git', ['diff', '--check']);

console.log('\nPages deploy check passed.');
console.log('Run npm run release:check before tagged releases, public launch claims, or clinical-review milestones.');
