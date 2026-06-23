#!/usr/bin/env node
// Diognosis release checklist
// Rebuilds the bundle, verifies release metadata, and runs the full local gate.

import { node, run, verifyReleaseMetadata } from './lib/release-check-common.js';

run('Build index.html', node, ['build.js']);
run('Generate reference layer', node, ['scripts/generate-reference-layer.js']);
run('Reference layer drift check', node, ['scripts/generate-reference-layer.js', '--check']);
verifyReleaseMetadata();

run('Database audit', node, ['scripts/database-audit.js']);
run('V1 database warning audit', node, ['scripts/audit/v1-database-warning-audit.js']);
run('Data views audit', node, ['scripts/audit/data-views-audit.js']);
run('Evidence ledger check', node, ['scripts/check-evidence.js']);
run('Generated artifact boundary audit', node, ['scripts/audit/generated-artifact-boundary-audit.js']);
run('V1 public docs audit', node, ['scripts/audit/v1-public-docs-audit.js']);
run('Evidence review UI audit', node, ['scripts/audit/evidence-review-ui-audit.js']);
run('V1 standards coverage audit', node, ['scripts/audit/v1-standards-coverage-audit.js']);
run('V1 PGx contract audit', node, ['scripts/audit/v1-pgx-contract-audit.js']);
run('V1 PK visualization audit', node, ['scripts/audit/v1-pk-visualization-audit.js']);
run('V1 finding contract audit', node, ['scripts/audit/v1-finding-contract-audit.js']);
run('V1 release readiness audit', node, ['scripts/audit/v1-release-readiness-audit.js']);
run('V1 feedback privacy audit', node, ['scripts/audit/v1-feedback-privacy-audit.js']);
run('Evidence calculation audit', node, ['scripts/audit/evidence-calculation-audit.js']);
run('External context firewall audit', node, ['scripts/audit/external-context-firewall-audit.js']);
run('External context UI audit', node, ['scripts/audit/external-safety-context-ui-audit.js']);
run('Scenario snapshot audit', node, ['scripts/audit/scenario-snapshot-audit.js']);
run('Deep launch QA audit', node, ['scripts/launch-qa-audit.js']);
run('Regression check', node, ['scripts/regression-check.js']);
run('Smoke check', node, ['scripts/smoke-check.js']);
run('Strict validation', node, ['scripts/validate-db.js', '--strict']);
run('Privacy/static audit', node, ['scripts/audit/privacy-static-audit.js']);
run('Whitespace diff check', 'git', ['diff', '--check']);

console.log('\nRelease check passed.');
