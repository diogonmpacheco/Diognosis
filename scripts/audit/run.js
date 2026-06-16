#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OPEN_TARGETS_TMP = '.tmp/open-targets-gate';
const OPEN_TARGETS_SNAPSHOT = `${OPEN_TARGETS_TMP}/generatedOpenTargetsSnapshot.js`;
const OPEN_TARGETS_PROMOTION_QUEUE = `${OPEN_TARGETS_TMP}/generatedOpenTargetsPromotionQueue.js`;
const OPEN_TARGETS_REVIEW_TARGETS = `${OPEN_TARGETS_TMP}/generatedOpenTargetsReviewTargets.js`;

const TASKS = {
  database: ['scripts/database-audit.js'],
  'data-views': ['scripts/audit/data-views-audit.js'],
  'evidence-review-ui': ['scripts/audit/evidence-review-ui-audit.js'],
  'review-workbench-ui': ['scripts/audit/review-workbench-ui-audit.js'],
  'evidence-calculation': ['scripts/audit/evidence-calculation-audit.js'],
  'evidence-review-queue': ['scripts/audit/evidence-review-queue.js'],
  'generated-boundary': ['scripts/audit/generated-artifact-boundary-audit.js'],
  'external-context-firewall': ['scripts/audit/external-context-firewall-audit.js'],
  'external-context-ui': ['scripts/audit/external-safety-context-ui-audit.js'],
  'privacy-static': ['scripts/audit/privacy-static-audit.js'],
  'scenario-snapshots': ['scripts/audit/scenario-snapshot-audit.js'],
  'metabolite-coverage': ['scripts/audit/metabolite-coverage-audit.js'],
  'mechanistic-gaps': ['scripts/audit/mechanistic-curation-gaps.js'],
  'overview-fragmentation': ['scripts/audit/overview-fragmentation-audit.js'],
  'enrichment-coverage': ['scripts/audit/enrichment-coverage-audit.js'],
  'cpic-coverage': ['scripts/audit/cpic-coverage-audit.js'],
  'clinpgx-coverage': ['scripts/audit/clinpgx-coverage-audit.js'],
  'candidate-relations': ['scripts/audit/candidate-relation-audit.js'],
  'engine-hypotheses': ['scripts/audit/engine-hypothesis-audit.js'],
  'review-queue-v2': ['scripts/audit/review-queue-v2-audit.js'],
  'label-source-boundary': ['scripts/audit/label-source-boundary-audit.js'],
  'knowledge-growth': ['scripts/audit/knowledge-growth-dashboard.js'],
  'top-100-live-coverage': ['scripts/audit/top-100-live-coverage-audit.js'],
  'top-250-live-coverage': ['scripts/audit/top-100-live-coverage-audit.js', '--target=250'],
  'ddi-expansion': ['scripts/audit/ddi-expansion-audit.js'],
  'metabolite-expansion': ['scripts/audit/metabolite-expansion-audit.js'],
  'pgx-transporter-expansion': ['scripts/audit/pgx-transporter-expansion-audit.js'],
  'drug-count-expansion': ['scripts/audit/drug-count-expansion-audit.js'],
  'top-100-gold-enrichment': ['scripts/audit/top-100-gold-enrichment-audit.js'],
  'source-specific-promotions': ['scripts/audit/source-specific-promotion-audit.js'],
  'three-x-target': ['scripts/audit/three-x-target-audit.js'],
  'enrichment-preview-mode': ['scripts/audit/enrichment-preview-mode-audit.js'],
  'live-enrichment-boundary': ['scripts/audit/live-enrichment-boundary-audit.js'],
  'pending-review-enrichment': ['scripts/audit/pending-review-enrichment-audit.js'],
  'pending-core-enrichment': ['scripts/audit/pending-core-enrichment-audit.js'],
  'enrichment-metadata-paths': ['scripts/audit/enrichment-metadata-path-audit.js'],
  'source-registry': ['scripts/audit/source-registry-audit.js'],
  'enrichment-license-boundary': ['scripts/audit/enrichment-license-boundary-audit.js'],
  'promotion-boundary': ['scripts/audit/promotion-boundary-audit.js'],
  'review-overlays': ['scripts/audit/review-overlay-audit.js'],
  'curated-drafts': ['scripts/audit/curated-draft-audit.js'],
  'grouped-review-candidates': ['scripts/audit/grouped-review-candidate-audit.js'],
  'open-targets': [
    'scripts/integrations/open-targets/import-open-targets.js',
    '--out-js',
    OPEN_TARGETS_SNAPSHOT,
    '--out-md',
    `${OPEN_TARGETS_TMP}/OPEN_TARGETS_INTEGRATION_AUDIT.md`,
  ],
  'open-targets-identity': [
    'scripts/integrations/open-targets/audit-open-targets-identity-review.js',
    '--snapshot',
    OPEN_TARGETS_SNAPSHOT,
    '--out-md',
    `${OPEN_TARGETS_TMP}/OPEN_TARGETS_IDENTITY_REVIEW.md`,
  ],
  'open-targets-promotions': [
    'scripts/integrations/open-targets/audit-open-targets-promotions.js',
    '--snapshot',
    OPEN_TARGETS_SNAPSHOT,
    '--out-js',
    OPEN_TARGETS_PROMOTION_QUEUE,
    '--out-md',
    `${OPEN_TARGETS_TMP}/OPEN_TARGETS_PROMOTION_QUEUE.md`,
  ],
  'open-targets-review-targets': [
    'scripts/integrations/open-targets/audit-open-targets-review-targets.js',
    '--promotion-queue',
    OPEN_TARGETS_PROMOTION_QUEUE,
    '--out-js',
    OPEN_TARGETS_REVIEW_TARGETS,
    '--out-md',
    `${OPEN_TARGETS_TMP}/OPEN_TARGETS_FIRST_REVIEW_TARGETS.md`,
  ],
  'open-targets-pgx-roadmap': [
    'scripts/integrations/open-targets/audit-open-targets-pgx-roadmap.js',
    '--snapshot',
    OPEN_TARGETS_SNAPSHOT,
    '--promotion-queue',
    OPEN_TARGETS_PROMOTION_QUEUE,
    '--review-targets',
    OPEN_TARGETS_REVIEW_TARGETS,
    '--out-js',
    `${OPEN_TARGETS_TMP}/generatedOpenTargetsPgxGapRoadmap.js`,
    '--out-md',
    `${OPEN_TARGETS_TMP}/OPEN_TARGETS_PGX_GAP_ROADMAP.md`,
  ],
  'open-targets-mechanistic-queue': [
    'scripts/integrations/open-targets/audit-open-targets-mechanistic-queue.js',
    '--snapshot',
    OPEN_TARGETS_SNAPSHOT,
    '--promotion-queue',
    OPEN_TARGETS_PROMOTION_QUEUE,
    '--out-js',
    `${OPEN_TARGETS_TMP}/generatedOpenTargetsMechanisticQueue.js`,
    '--out-md',
    `${OPEN_TARGETS_TMP}/OPEN_TARGETS_MECHANISTIC_REVIEW_QUEUE.md`,
  ],
};

const GROUPS = {
  data: [
    'database',
    'data-views',
    'generated-boundary',
    'evidence-review-ui',
    'evidence-calculation',
    'external-context-firewall',
    'external-context-ui',
    'source-registry',
    'enrichment-license-boundary',
    'promotion-boundary',
    'review-overlays',
    'curated-drafts',
    'label-source-boundary',
    'scenario-snapshots',
    'privacy-static',
  ],
  enrichment: [
    ['enrichment-coverage', '--check'],
    ['top-100-live-coverage', '--check'],
    ['top-250-live-coverage', '--check'],
    ['ddi-expansion', '--check'],
    ['metabolite-expansion', '--check'],
    ['pgx-transporter-expansion', '--check'],
    ['drug-count-expansion', '--check'],
    ['top-100-gold-enrichment', '--check'],
    ['source-specific-promotions', '--check'],
    'live-enrichment-boundary',
    'enrichment-metadata-paths',
    'metabolite-coverage',
  ],
  integrations: [
    'open-targets',
    'open-targets-identity',
    'open-targets-promotions',
    'open-targets-review-targets',
    'open-targets-pgx-roadmap',
    'open-targets-mechanistic-queue',
  ],
};
GROUPS.all = [...GROUPS.data, ...GROUPS.integrations, ...GROUPS.enrichment];

function usage() {
  console.log('Usage: node scripts/audit/run.js <group-or-task> [extra args]');
  console.log(`Groups: ${Object.keys(GROUPS).join(', ')}`);
  console.log(`Tasks: ${Object.keys(TASKS).sort().join(', ')}`);
}

function resolveEntry(entry) {
  if (Array.isArray(entry)) {
    const [taskName, ...extraArgs] = entry;
    return { taskName, extraArgs };
  }
  return { taskName: entry, extraArgs: [] };
}

function runTask(entry, trailingArgs = []) {
  const { taskName, extraArgs } = resolveEntry(entry);
  const command = TASKS[taskName];
  if (!command) throw new Error(`Unknown audit task: ${taskName}`);

  const [scriptPath, ...taskArgs] = command;
  const args = [scriptPath, ...taskArgs, ...extraArgs, ...trailingArgs];
  console.log(`\n▶ ${taskName}`);
  const result = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit' });
  return result.status ?? 1;
}

const [target, ...extraArgs] = process.argv.slice(2);
if (!target || target === 'list' || target === '--help' || target === '-h') {
  usage();
  process.exit(target ? 0 : 1);
}

const entries = GROUPS[target] || (TASKS[target] ? [target] : null);
if (!entries) {
  usage();
  process.exit(1);
}

const failures = [];
for (const entry of entries) {
  const { taskName } = resolveEntry(entry);
  const status = runTask(entry, GROUPS[target] ? [] : extraArgs);
  if (status !== 0) failures.push(taskName);
}

if (failures.length) {
  console.error(`\nAudit gate failed: ${failures.join(', ')}`);
  process.exit(1);
}

console.log(`\nAudit gate passed: ${target}`);
