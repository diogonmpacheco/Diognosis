#!/usr/bin/env node
import { execFileSync, spawnSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { extname, join, resolve } from 'path';
import { ROOT } from './lib/medcheck-source-loader.js';
import { readJson, writeJson, writeText, commandSummary } from './lib/enrichment-common.js';

const OUT_JSON = resolve(ROOT, 'docs/audits/weekly-enrichment-report.json');
const OUT_MD = resolve(ROOT, 'docs/audits/weekly-enrichment-report.md');

function parseArgs(argv) {
  const args = { check: false, fetch: false, legalOnly: false, structuredOnly: false, livePendingReview: false, maxGapQueries: 50, maxLivePromotions: 75 };
  for (const arg of argv) {
    if (arg === '--check') args.check = true;
    else if (arg === '--fetch') args.fetch = true;
    else if (arg === '--legal-literature-only') args.legalOnly = true;
    else if (arg === '--structured-only') args.structuredOnly = true;
    else if (arg === '--live-pending-review') args.livePendingReview = true;
    else if (arg.startsWith('--max-gap-queries=')) args.maxGapQueries = Number(arg.slice(18));
    else if (arg.startsWith('--max-live-promotions=')) args.maxLivePromotions = Number(arg.slice(22));
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
    commands.push(run('label source sync/check', node, ['scripts/enrich/label-source-sync.js', args.fetch ? '--fetch' : '--check']));
  }

  commands.push(run('grouped review candidate generation', node, ['scripts/enrich/group-staged-records.js']));
  commands.push(run('enrichment review queue', node, ['scripts/enrich/build-enrichment-review-queue.js']));
  commands.push(run('enrichment continuation baseline/archive', node, ['scripts/enrich/capture-enrichment-baseline.js']));
  commands.push(run('engine hypothesis export', node, ['scripts/enrich/export-engine-hypotheses.js']));
  commands.push(run('candidate relation extraction', node, ['scripts/enrich/extract-candidate-relations.js']));
  commands.push(run('automated source-faithfulness check', node, ['scripts/enrich/automated-source-check.js']));
  if (args.livePendingReview) {
    commands.push(run('live pending-review promotion', node, ['scripts/enrich/promote-live-pending-review.js', `--max-live-promotions=${args.maxLivePromotions}`]));
  }
  commands.push(run('gap query batch generation', node, ['scripts/enrich/build-gap-query-batch.js', `--max=${args.maxGapQueries}`]));
  commands.push(run('grouped review candidate v2 generation', node, ['scripts/enrich/group-candidate-relations.js']));
  commands.push(run('enrichment review queue v2', node, ['scripts/enrich/build-review-queue-v2.js']));
  commands.push(run('knowledge growth dashboard', node, ['scripts/audit/knowledge-growth-dashboard.js']));
  commands.push(run('3x enrichment campaign report', node, ['scripts/enrich/run-three-x-enrichment-campaign.js']));
  commands.push(run('generated enrichment review data', node, ['scripts/enrich/generate-enrichment-review-data.js']));
  commands.push(run('source registry audit after staging', node, ['scripts/audit/source-registry-audit.js']));
  commands.push(run('license boundary audit', node, ['scripts/audit/enrichment-license-boundary-audit.js']));
  commands.push(run('promotion boundary audit', node, ['scripts/audit/promotion-boundary-audit.js']));
  commands.push(run('review overlay audit', node, ['scripts/audit/review-overlay-audit.js']));
  commands.push(run('curated draft audit', node, ['scripts/audit/curated-draft-audit.js']));
  commands.push(run('grouped review candidate audit', node, ['scripts/audit/grouped-review-candidate-audit.js']));
  commands.push(run('candidate relation audit', node, ['scripts/audit/candidate-relation-audit.js']));
  commands.push(run('engine hypothesis audit', node, ['scripts/audit/engine-hypothesis-audit.js']));
  commands.push(run('review queue v2 audit', node, ['scripts/audit/review-queue-v2-audit.js']));
  commands.push(run('label source boundary audit', node, ['scripts/audit/label-source-boundary-audit.js']));
  commands.push(run('3x target audit', node, ['scripts/audit/three-x-target-audit.js']));
  commands.push(run('enrichment preview mode audit', node, ['scripts/audit/enrichment-preview-mode-audit.js']));
  commands.push(run('live enrichment boundary audit', node, ['scripts/audit/live-enrichment-boundary-audit.js']));
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
  const reviewQueueV2 = readJson(resolve(ROOT, 'data/enrichment/review-queue/enrichment-review-queue-v2.json'), {});
  const legalReport = readJson(resolve(ROOT, 'data/enrichment/reports/legal-literature-report.json'), {});
  const cpic = readJson(resolve(ROOT, 'data/enrichment/snapshots/cpic-snapshot-metadata.json'), {});
  const clinpgx = readJson(resolve(ROOT, 'data/enrichment/snapshots/clinpgx-snapshot-metadata.json'), {});
  const labelSource = readJson(resolve(ROOT, 'data/enrichment/snapshots/label-source-snapshot-metadata.json'), {});
  const grouped = readJson(resolve(ROOT, 'data/enrichment/review-queue/grouped-review-candidates.json'), {});
  const groupedV2 = readJson(resolve(ROOT, 'data/enrichment/review-queue/grouped-review-candidates-v2.json'), {});
  const growth = readJson(resolve(ROOT, 'docs/audits/knowledge-growth-dashboard.json'), {});
  const overlayReviewCount = listJson(resolve(ROOT, 'data/review-overlays'))
    .map(file => readJson(file, null))
    .filter(overlay => overlay?.schema === 'diognosis.review-overlay.v1')
    .reduce((sum, overlay) => sum + (overlay.reviews?.length || 0), 0);
  const curatedDraftCount = listJson(resolve(ROOT, 'data/enrichment/curated-drafts'))
    .map(file => readJson(file, null))
    .filter(draft => draft?.schema === 'diognosis.curated-draft.v1')
    .length;
  const files = changedFiles();
  const report = {
    schema: 'diognosis.weekly-enrichment-report.v1',
    generatedAt: new Date().toISOString(),
    mode: args.fetch ? 'fetch' : 'check',
    livePendingReview: args.livePendingReview,
    maxLivePromotions: args.maxLivePromotions,
    newStagedRecords: (cpic.stagedRecords || 0) + (clinpgx.stagedRecords || 0) + (labelSource.stagedRecords || 0) + (legalReport.stagedRecords || 0),
    updatedStagedRecords: 0,
    dedupedRecords: reviewQueue.totalItems || 0,
    newLiteratureDrafts: legalReport.drafts || 0,
    draftsWithLegalOpenAccess: legalReport.draftsWithLegalOpenAccess || 0,
    cpicRecordsStaged: cpic.stagedRecords || 0,
    clinpgxRecordsStaged: clinpgx.stagedRecords || 0,
    labelRecordsStaged: labelSource.stagedRecords || 0,
    cpic: {
      localCandidateRecords: cpic.localCandidateRecords || 0,
      fetchedRecords: cpic.fetchedRecords || 0,
      sourceRelease: cpic.sourceRelease || cpic.sourceTruthStatus || '',
      providerFailures: cpic.providerFailures || [],
    },
    clinpgx: {
      directFetchedRecords: clinpgx.directFetchedRecords || 0,
      openTargetsDerivedRecords: clinpgx.openTargetsDerivedRecords || 0,
      providerFailures: clinpgx.providerFailures || [],
      rateLimitEvents: clinpgx.rateLimitEvents || 0,
    },
    review: {
      rawStagedRecords: (cpic.stagedRecords || 0) + (clinpgx.stagedRecords || 0) + (labelSource.stagedRecords || 0) + (legalReport.stagedRecords || 0),
      groupedReviewCandidates: grouped.totalCandidates || 0,
      groupedReviewCandidatesV2: groupedV2.totalCandidates || 0,
      reviewQueueV2Items: reviewQueueV2.totalItems || 0,
      candidateRelationRows: growth.candidates?.totalCandidates || 0,
      curatedDrafts: curatedDraftCount,
      localOverlayReviews: overlayReviewCount,
    },
    livePendingReviewSummary: growth.livePendingReview || {},
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
- Live pending-review promotion: ${report.livePendingReview ? 'enabled' : 'disabled'}
- Max live promotions: ${report.maxLivePromotions}
- New staged records: ${report.newStagedRecords}
- Literature drafts: ${report.newLiteratureDrafts}
- Drafts with legal OA metadata: ${report.draftsWithLegalOpenAccess}
- CPIC staged records: ${report.cpicRecordsStaged}
- CPIC local candidate records: ${report.cpic.localCandidateRecords}
- CPIC fetched records: ${report.cpic.fetchedRecords}
- ClinPGx staged records: ${report.clinpgxRecordsStaged}
- ClinPGx direct fetched records: ${report.clinpgx.directFetchedRecords}
- ClinPGx/Open Targets derived records: ${report.clinpgx.openTargetsDerivedRecords}
- Label-source staged records: ${report.labelRecordsStaged}
- Grouped review candidates: ${report.review.groupedReviewCandidates}
- Grouped review candidates v2: ${report.review.groupedReviewCandidatesV2}
- Review queue v2 items: ${report.review.reviewQueueV2Items}
- Candidate relation rows: ${report.review.candidateRelationRows}
- Live pending-review records: ${report.livePendingReviewSummary.totalRecords || 0}
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

function listJson(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const file = join(dir, entry);
    const stats = statSync(file);
    if (stats.isDirectory()) out.push(...listJson(file));
    else if (extname(file) === '.json') out.push(file);
  }
  return out;
}
