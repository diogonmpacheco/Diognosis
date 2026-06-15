#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const TASKS = {
  pubmed: ['scripts/enrich/pubmed-enrich.js', '--providers', 'pubmed'],
  batch: ['scripts/enrich/run-batch.js'],
  'validate-batches': ['scripts/enrich/validate-batches.js'],
  'self-test': ['scripts/enrich/pubmed-enrich.js', '--self-test'],
  'legal-literature': [
    'scripts/enrich/run-batch.js',
    '--batch',
    'scripts/enrich/legal-literature-batch.json',
    '--providers',
    'pubmed,europepmc,openalex,unpaywall',
  ],
  'stage-legal-literature': ['scripts/enrich/stage-legal-literature.js'],
  'gap-literature-batch': ['scripts/enrich/build-gap-query-batch.js', '--max=50'],
  baseline: ['scripts/enrich/capture-enrichment-baseline.js'],
  'engine-hypotheses': ['scripts/enrich/export-engine-hypotheses.js'],
  'extract-candidates': ['scripts/enrich/extract-candidate-relations.js'],
  'label-source': ['scripts/enrich/label-source-sync.js', '--check'],
  cpic: ['scripts/enrich/cpic-sync.js', '--check'],
  clinpgx: ['scripts/enrich/clinpgx-sync.js', '--check'],
  'cpic-fetch': ['scripts/enrich/cpic-sync.js', '--fetch'],
  'clinpgx-fetch': [
    'scripts/enrich/clinpgx-sync.js',
    '--fetch',
    '--max-genes=50',
    '--max-drugs=100',
    '--include-labels',
    '--include-variants',
    '--direct-limit=1500',
  ],
  'group-review-candidates': ['scripts/enrich/group-staged-records.js'],
  'group-review-candidates-v2': ['scripts/enrich/group-candidate-relations.js'],
  'review-queue': ['scripts/enrich/build-enrichment-review-queue.js'],
  'review-queue-v2': ['scripts/enrich/build-review-queue-v2.js'],
  'automated-source-check': ['scripts/enrich/automated-source-check.js'],
  'live-pending-review': ['scripts/enrich/promote-live-pending-review.js', '--max-live-promotions=75'],
  'sanitize-cache-metadata': ['scripts/enrich/sanitize-enrichment-cache-metadata.js'],
  'live-pending-review-report': ['scripts/enrich/write-live-pending-review-report.js'],
  'pending-review': ['scripts/enrich/generate-pending-review-enrichment.js'],
  'pending-core': ['scripts/enrich/generate-pending-core-enrichment.js'],
  'three-x': ['scripts/enrich/run-three-x-enrichment-campaign.js'],
  'review-data': ['scripts/enrich/generate-enrichment-review-data.js'],
  weekly: ['scripts/enrich/run-weekly-enrichment.js'],
  'weekly-check': ['scripts/enrich/run-weekly-enrichment.js', '--check'],
  'fetch-open-targets': ['scripts/integrations/open-targets/fetch-open-targets-spotlookups.js'],
  'integrate-open-targets': ['scripts/integrations/open-targets/import-open-targets.js'],
  'demo-open-targets': ['scripts/demo/open-targets-fixture-demo.js'],
};

function usage() {
  console.log('Usage: node scripts/enrich/run.js <task> [extra args]');
  console.log(`Tasks: ${Object.keys(TASKS).sort().join(', ')}`);
}

const [taskName, ...extraArgs] = process.argv.slice(2);
if (!taskName || taskName === 'list' || taskName === '--help' || taskName === '-h') {
  usage();
  process.exit(taskName ? 0 : 1);
}

const command = TASKS[taskName];
if (!command) {
  usage();
  process.exit(1);
}

const [scriptPath, ...taskArgs] = command;
console.log(`▶ enrich:${taskName}`);
const result = spawnSync(process.execPath, [scriptPath, ...taskArgs, ...extraArgs], {
  cwd: ROOT,
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
