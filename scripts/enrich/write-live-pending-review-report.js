#!/usr/bin/env node
import { existsSync } from 'fs';
import { relative, resolve } from 'path';
import { ROOT } from './lib/diognosis-source-loader.js';
import { loadAllStagedRecords, markdownTable, readJson, writeJson, writeText } from './lib/enrichment-common.js';

const OUT_JSON = resolve(ROOT, 'docs/audits/live-pending-review-enrichment-report.json');
const OUT_MD = resolve(ROOT, 'docs/audits/live-pending-review-enrichment-report.md');
const WEEKLY_JSON = resolve(ROOT, 'docs/audits/weekly-enrichment-report.json');
const WEEKLY_MD = resolve(ROOT, 'docs/audits/weekly-enrichment-report.md');

function load(path, fallback = null) {
  return readJson(resolve(ROOT, path), fallback);
}

function countRows(path) {
  const fullPath = resolve(ROOT, path);
  if (!existsSync(fullPath)) return 0;
  const parsed = readJson(fullPath, []);
  return Array.isArray(parsed) ? parsed.length : (parsed.records || []).length;
}

function compactFailures(failures = []) {
  return failures.map((failure) => ({
    endpoint: failure.endpoint || '',
    params: failure.params || {},
    status: failure.status || '',
    records: failure.records || 0,
    cacheId: failure.cacheId || '',
    cacheKey: failure.cacheKey || '',
    responseSha256: failure.responseSha256 || failure.sha256 || '',
    error: failure.error || undefined,
  }));
}

function rel(path) {
  return relative(ROOT, path).replace(/\\/g, '/');
}

function sum(values) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

function reportBody(report) {
  const rows = [
    ['CPIC fetched records', report.cpic.fetchedRecords],
    ['ClinPGx direct staged records', report.clinpgx.directFetchedRecords],
    ['ClinPGx Open Targets-derived records', report.clinpgx.openTargetsDerivedRecords],
    ['DailyMed label metadata records', report.labelRecordsStaged],
    ['Legal literature staged records', report.legalLiteratureRecordsStaged],
    ['Candidate relation rows', report.review.candidateRelationRows],
    ['Review queue v2 items', report.review.reviewQueueV2Items],
    ['Live pending-review preview records', report.livePendingReview.liveRecords],
  ];
  const failureRows = [
    ['ClinPGx', report.clinpgx.providerFailures.length],
    ['CPIC', report.cpic.providerFailures.length],
    ['DailyMed label metadata', report.label.providerFailures.length],
  ];
  return `# Live Pending-Review Enrichment Report

Generated: ${report.generatedAt}

This report reflects the live pending-review enrichment pass, not the earlier check-only dry run. All imported records remain source-linked review candidates unless a Diognosis reviewer explicitly promotes them.

${markdownTable(['Metric', 'Count'], rows)}

## Provider Status

${markdownTable(['Provider', 'Failures'], failureRows)}

## Governance

- Raw provider cache payloads are local build artifacts and ignored by default.
- Small manifests, metadata, review queues, and generated summaries are the committed review surface.
- Live records shown in the app are pending professional review and cannot affect scoring or public severity by themselves.

## Files

${markdownTable(['Surface', 'Path'], [
    ['CPIC metadata', report.files.cpicMetadata],
    ['ClinPGx metadata', report.files.clinpgxMetadata],
    ['Label metadata', report.files.labelMetadata],
    ['Live pending review data', report.files.livePendingReview],
  ])}
`;
}

const cpic = load('data/enrichment/snapshots/cpic-snapshot-metadata.json', {});
const clinpgx = load('data/enrichment/snapshots/clinpgx-snapshot-metadata.json', {});
const label = load('data/enrichment/snapshots/label-source-snapshot-metadata.json', {});
const candidate = load('docs/audits/candidate-relation-extraction.json', {});
const grouped = load('docs/audits/grouped-review-candidates-v2.json', {});
const queue = load('docs/audits/enrichment-review-queue-v2.json', {});
const dashboard = load('docs/audits/knowledge-growth-dashboard.json', {});
const liveBoundary = load('docs/audits/live-enrichment-boundary-audit.json', {});
const promotion = load('docs/audits/live-pending-review-promotion.json', {});
const { records: dedupedRecords, files: stagedFiles } = loadAllStagedRecords();

const legalLiteratureRecordsStaged = countRows('data/enrichment/staged/legal-literature-staged-records.json');
const cpicRecordsStaged = countRows('data/enrichment/staged/cpic-staged-records.json');
const clinpgxRecordsStaged = countRows('data/enrichment/staged/clinpgx-staged-records.json');
const labelRecordsStaged = countRows('data/enrichment/staged/label-staged-records.json');

const report = {
  schema: 'diognosis.live-pending-review-enrichment-report.v1',
  generatedAt: new Date().toISOString(),
  mode: 'fetch_live_pending_review_summary',
  newStagedRecords: sum([cpicRecordsStaged, clinpgxRecordsStaged, labelRecordsStaged, legalLiteratureRecordsStaged]),
  updatedStagedRecords: 0,
  dedupedRecords: dedupedRecords.length,
  stagedFiles: stagedFiles.map(file => ({ file: rel(file.file), records: file.records })),
  cpicRecordsStaged,
  clinpgxRecordsStaged,
  labelRecordsStaged,
  legalLiteratureRecordsStaged,
  cpic: {
    mode: cpic.mode || '',
    fetchedRecords: cpic.fetchedRecords || 0,
    localCandidateRecords: cpic.localCandidateRecords || 0,
    stagedRecords: cpic.stagedRecords || cpicRecordsStaged,
    sourceTruthStatus: cpic.sourceTruthStatus || '',
    providerFailures: compactFailures(cpic.providerFailures || []),
  },
  clinpgx: {
    mode: clinpgx.mode || '',
    directFetchedRecords: clinpgx.directFetchedRecords || 0,
    openTargetsDerivedRecords: clinpgx.openTargetsDerivedRecords || 0,
    stagedRecords: clinpgx.stagedRecords || clinpgxRecordsStaged,
    rateLimitEvents: clinpgx.rateLimitEvents || 0,
    providerFailures: compactFailures(clinpgx.providerFailures || []),
  },
  label: {
    mode: label.mode || '',
    fetchedRecords: label.fetchedRecords || 0,
    stagedRecords: label.stagedRecords || labelRecordsStaged,
    sourceTruthStatus: label.sourceTruthStatus || '',
    providerFailures: compactFailures(label.providerFailures || []),
  },
  review: {
    rawStagedRecords: candidate.stagedRecords || dashboard.staged?.totalRecords || dedupedRecords.length,
    candidateRelationRows: candidate.totalCandidates || dashboard.candidates?.totalCandidates || 0,
    groupedReviewCandidatesV2: grouped.totalCandidates || 0,
    reviewQueueV2Items: queue.totalItems || 0,
    reviewQueuePriorityCounts: queue.priorityCounts || {},
    candidatePriorityCounts: grouped.priorityCounts || {},
    liveEligibleCandidates: promotion.eligibleCandidates || 0,
    liveSelectedCandidates: promotion.selectedCandidates || 0,
  },
  livePendingReview: {
    source: liveBoundary.source || 'src/data/generatedLivePendingReview.js',
    liveRecords: liveBoundary.liveRecords || 0,
    counts: liveBoundary.counts || {},
    boundaryOk: liveBoundary.ok === true,
    selectedCandidates: promotion.selectedCandidates || 0,
    candidatesScanned: promotion.candidatesScanned || 0,
  },
  files: {
    cpicMetadata: 'data/enrichment/snapshots/cpic-snapshot-metadata.json',
    clinpgxMetadata: 'data/enrichment/snapshots/clinpgx-snapshot-metadata.json',
    labelMetadata: 'data/enrichment/snapshots/label-source-snapshot-metadata.json',
    livePendingReview: 'src/data/generatedLivePendingReview.js',
  },
  governance: {
    rawProviderCacheCommitted: false,
    rawProviderCacheIgnoredByDefault: true,
    publicSeverityEnabled: queue.publicSeverityEnabled || 0,
    scoringEnabled: queue.scoringEnabled || 0,
    professionalReviewPerformed: false,
    recommendation: 'show staged enrichment as pending human review context; keep external records non-scoring and non-severity-bearing.',
  },
};

writeJson(OUT_JSON, report);
writeText(OUT_MD, reportBody(report));
writeJson(WEEKLY_JSON, { ...report, schema: 'diognosis.weekly-enrichment-report.v1' });
writeText(WEEKLY_MD, reportBody({ ...report, schema: 'diognosis.weekly-enrichment-report.v1' }));

console.log(JSON.stringify({
  ok: true,
  report: rel(OUT_JSON),
  weeklyReport: rel(WEEKLY_JSON),
  mode: report.mode,
  stagedRecords: report.newStagedRecords,
  liveRecords: report.livePendingReview.liveRecords,
}, null, 2));
