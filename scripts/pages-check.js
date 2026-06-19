#!/usr/bin/env node
// Diognosis Pages deploy checklist
// Fast confidence gate for live testing. The full pre-release gate remains scripts/release-check.js.

import { node, run, verifyReleaseMetadata } from './lib/release-check-common.js';

run('Build index.html', node, ['build.js']);
verifyReleaseMetadata();

run('Database audit', node, ['scripts/database-audit.js']);
run('V1 database warning audit', node, ['scripts/audit/v1-database-warning-audit.js']);
run('V1 public docs audit', node, ['scripts/audit/v1-public-docs-audit.js']);
run('V1 standards coverage audit', node, ['scripts/audit/v1-standards-coverage-audit.js']);
run('V1 release readiness audit', node, ['scripts/audit/v1-release-readiness-audit.js']);
run('Smoke check', node, ['scripts/smoke-check.js']);
run('Strict validation', node, ['scripts/validate-db.js', '--strict']);
run('Privacy/static audit', node, ['scripts/audit/privacy-static-audit.js']);
run('Whitespace diff check', 'git', ['diff', '--check']);

console.log('\nPages deploy check passed.');
console.log('Run npm run release:check before tagged releases or clinical-review milestones.');
