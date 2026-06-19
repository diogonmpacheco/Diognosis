#!/usr/bin/env node
// Diognosis Pages deploy checklist
// Fast confidence gate for live testing. The full pre-release gate remains scripts/release-check.js.

import { node, run, verifyReleaseMetadata } from './lib/release-check-common.js';

run('Build index.html', node, ['build.js']);
verifyReleaseMetadata();

run('Smoke check', node, ['scripts/smoke-check.js']);
run('Privacy/static audit', node, ['scripts/audit/privacy-static-audit.js']);
run('Whitespace diff check', 'git', ['diff', '--check']);

console.log('\nPages deploy check passed.');
console.log('Run npm run release:check before tagged releases, public launch claims, or clinical-review milestones.');
