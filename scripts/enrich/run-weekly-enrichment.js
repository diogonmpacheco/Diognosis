#!/usr/bin/env node
import { execFileSync, spawnSync } from 'child_process';
import { resolve } from 'path';
import { ROOT } from './lib/medcheck-source-loader.js';
import { readJson, writeJson, writeText, commandSummary } from './lib/enrichment-common.js';

const OUT_JSON = resolve(ROOT, 'docs/audits/weekly-enrichment-report.json');
const OUT_MD = resolve(ROOT, 'docs/audits/weekly-enrichment-report.md');

function parseArgs(argv) {
  const args = { check: false, fetch: false, legalOnly: false, structuredOnly: false, maxGapQueries: 50 };
  for (const arg of argv) {
    if (arg === '--check') args.check = true;
    else if (arg === '--fetch') args.fetch = true;
    else if (arg === '--legal-literature-only') args.legalOnly = true;
    else if (arg === '--structured-only') args.structuredOnly = true;
    else if (arg.startsWith('--max-gap-queries=')) args.maxGapQueries = Number(arg.slice(18));
  }
  if (!args.fetch) args.check = true;
  return args;
}

function run(label, cmd, argv, options = {}) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(cmd, argv, { cwd: ROOT, stdio: 'inherit', env: process.env });
  const summary = commandSummary(label, result);
  if (result.status !== 0 && options.required !== false) {
    throw new Error(`${label} failed with status ${result.status}`);
  }
  return summary;
}

function changedFiles() {
  try {
    return execFileSync('git', ['status', '--short'], { cwd: ROOT, encoding: 'utf8' })
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const node = process.execPath;
  const commands = [];

  commands.push(run('source registry audit', node, ['scripts/audit/source-registry-audit.js']));
  commands.push(run('enrichment coverage audit', node, ['scripts/audit/enrichment-coverage-audit.js']));

  if (!args.structuredOnly) {
    if (args.fetch && !args.check) {
      commands.push(run('legal literature batch', node, ['scripts/enrich/run-batch.js', '--batch', 'scripts/enrich/legal-literature-batch.json', '--providers', 'pubmed,europepmc,openalex,unpaywall'], { required: false }));
    }
    commands.push(run('legal literature staging', node, ['scripts/enrich/stage-legal-literature.js']));
  }

  if (!args.legalOnly) {
    commands.push(run('CPIC sync/check', node, ['scripts/enrich/cpic-sync.js', args.fetch ? '--fetch' : '--check']));
    commands.push(run('ClinPGx sync/check', node, ['scripts/enrich/clinpgx-sync.js', args.fetch ? '--fetch' : '--check']));
  }

  commands.push(run('gap query batch generation', node, ['scripts/enrich/build-gap-query-batch.js', `--max=${args.maxGapQueries}`]));
  commands.push(run('enrichment review queue', node, ['scripts/enrich/build-enrichment-review-queue.js']));
  commands.push(run('source registry audit after staging', node, ['scripts/audit/source-registry-audit.js']));
  commands.push(run('license boundary audit', node, ['scripts/audit/enrichment-license-boundary-audit.js']));
  commands.push(run('enrichment self-test', node, ['scripts/enrich/pubmed-enrich.js', '--self-test']));

  const validationCommands = [
    ['stats', ['run', 'stats']],
    ['build', ['run', 'build']],
    ['smoke', ['run', 'smoke']],
    ['regression', ['run', 'regression']],
    ['validate', ['run', 'validate']],
    ['validate:strict', ['run', 'validate:strict']],
    ['check:evidence', ['run', 'check:evidence']],
    ['release:check', ['run', 'release:check']],
  ];
  for (const [label, argv] of validationCommands) {
    commands.push(run(`validation: ${label}`, 'npm', argv));
  }

  const coverage = readJson(resolve(ROOT, 'docs/audits/enrichment-coverage-audit.json'), {});
  const reviewQueue = readJson(resolve(ROOT, 'data/enrichment/review-queue/enrichment-review-queue.json'), {});
  const legalReport = readJson(resolve(ROOT, 'data/enrichment/reports/legal-literature-report.json'), {});
  const cpic = readJson(resolve(ROOT, 'data/enrichment/snapshots/cpic-snapshot-metadata.json'), {});
  const clinpgx = readJson(resolve(ROOT, 'data/enrichment/snapshots/clinpgx-snapshot-metadata.json'), {});
  const files = changedFiles();
  const report = {
    schema: 'diognosis.weekly-enrichment-report.v1',
    generatedAt: new Date().toISOString(),
    mode: args.fetch ? 'fetch' : 'check',
    newStagedRecords: (cpic.stagedRecords || 0) + (clinpgx.stagedRecords || 0) + (legalReport.stagedRecords || 0),
    updatedStagedRecords: 0,
    dedupedRecords: reviewQueue.totalItems || 0,
    newLiteratureDrafts: legalReport.drafts || 0,
    draftsWithLegalOpenAccess: legalReport.draftsWithLegalOpenAccess || 0,
    cpicRecordsStaged: cpic.stagedRecords || 0,
    clinpgxRecordsStaged: clinpgx.stagedRecords || 0,
    providerFailures: legalReport.providerFailures || [],
    topMissingDrugs: coverage.top_missing_drugs?.slice(0, 10) || [],
    topMissingCombinations: coverage.top_missing_pairs?.slice(0, 10) || [],
    topPgxGaps: coverage.top_pgx_gaps?.slice(0, 10) || [],
    topMetaboliteGaps: coverage.top_metabolite_gaps?.slice(0, 10) || [],
    topEvidenceGaps: coverage.top_evidence_gaps?.slice(0, 10) || [],
    changedFiles: files,
    validationResults: commands,
    recommendation: files.length ? 'human_review_then_commit' : 'no_changes_to_commit',
    humanReviewRequired: true,
  };
  writeJson(OUT_JSON, report);
  writeText(OUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({ ok: true, mode: report.mode, stagedRecords: report.newStagedRecords, changedFiles: files.length, recommendation: report.recommendation }, null, 2));
}

function renderMarkdown(report) {
  return `# Weekly Enrichment Report

Generated: ${report.generatedAt}

- Mode: ${report.mode}
- New staged records: ${report.newStagedRecords}
- Literature drafts: ${report.newLiteratureDrafts}
- Drafts with legal OA metadata: ${report.draftsWithLegalOpenAccess}
- CPIC staged records: ${report.cpicRecordsStaged}
- ClinPGx staged records: ${report.clinpgxRecordsStaged}
- Provider failures: ${report.providerFailures.length}
- Recommendation: ${report.recommendation}
- Human review required: ${report.humanReviewRequired ? 'yes' : 'no'}

## Top Missing Drugs

${(report.topMissingDrugs || []).map(row => `- ${row.name}: ${row.gaps?.slice(0, 3).join('; ')}`).join('\n') || '- none'}

## Top Missing Combinations

${(report.topMissingCombinations || []).map(row => `- ${row.drug1} + ${row.drug2}: ${row.theme}`).join('\n') || '- none'}

## Top PGx Gaps

${(report.topPgxGaps || []).map(row => `- ${row.source}: ${row.gene}${row.drug ? ` / ${row.drug}` : ''}`).join('\n') || '- none'}

## Changed Files

${report.changedFiles.map(file => `- ${file}`).join('\n') || '- none'}
`;
}

main();
