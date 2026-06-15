#!/usr/bin/env node
import { resolve } from 'path';
import { readGeneratedConstObject, ROOT } from '../enrich/lib/diognosis-source-loader.js';
import { markdownTable, writeJson, writeText } from '../enrich/lib/enrichment-common.js';

const SOURCE = resolve(ROOT, 'src/data/generatedLivePendingReview.js');
const OUT_JSON = resolve(ROOT, 'docs/audits/live-enrichment-boundary-audit.json');
const OUT_MD = resolve(ROOT, 'docs/audits/live-enrichment-boundary-audit.md');

const REQUIRED_PENDING = {
  reviewRequired: true,
  professionalReviewStatus: 'pending',
  sourceFaithfulnessStatus: 'automated_source_check',
  curationStatus: 'automated_curated_preview',
  clinicalValidationStatus: 'not_validated',
  displayStatus: 'source_linked_pending_professional_review',
};

const FORBIDDEN_PUBLIC_WORDING = [
  /clinically validated/i,
  /doctor approved/i,
  /professionally reviewed/i,
  /\bsafe\b/i,
  /\bunsafe\b/i,
  /\bmust avoid\b/i,
];

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function flattenLiveRecords(payload = {}) {
  return [
    ...Object.entries(payload.studies || {}).map(([id, row]) => ({ id, kind: 'study', row })),
    ...asArray(payload.knownDdi).map((row, index) => ({ id: row.id || `knownDdi.${index}`, kind: 'knownDdi', row })),
    ...Object.entries(payload.metab || {}).flatMap(([parent, rows]) => asArray(rows).map((row, index) => ({ id: `${parent}.${index}`, kind: 'metab', row }))),
    ...Object.entries(payload.metaboliteActors || {}).map(([id, row]) => ({ id, kind: 'metaboliteActor', row })),
    ...asArray(payload.genotypeEffects).map((row, index) => ({ id: row.id || `genotypeEffects.${index}`, kind: 'genotypeEffects', row })),
    ...asArray(payload.genotypeMetaboliteEffects).map((row, index) => ({ id: row.id || `genotypeMetaboliteEffects.${index}`, kind: 'genotypeMetaboliteEffects', row })),
    ...Object.entries(payload.pkParams || {}).map(([id, row]) => ({ id, kind: 'pkParams', row })),
    ...Object.entries(payload.washoutDays || {}).map(([id, row]) => ({ id, kind: 'washoutDays', row })),
    ...asArray(payload.labelContext).map((row, index) => ({ id: row.id || `labelContext.${index}`, kind: 'labelContext', row })),
  ];
}

function hasRequiredMetadata(row = {}) {
  return Object.entries(REQUIRED_PENDING).flatMap(([key, expected]) => row[key] === expected ? [] : [`${key} must be ${expected}`]);
}

function sourceIdentifiers(row = {}) {
  return [
    row.pmid && `PMID:${row.pmid}`,
    row.doi && `DOI:${row.doi}`,
    row.url,
    ...(row.sourceIdentifiers || []),
    ...(row.sourceRecordIds || []),
    ...(row.evidenceRefs || []),
  ].filter(Boolean);
}

function publicText(row = {}) {
  return [
    row.title,
    row.summary,
    row.description,
    row.mechanismSummary,
    row.clinicalSummary,
    row.source,
    ...(row.limitations || []),
    ...(row.notes || []),
  ].filter(Boolean).join(' ');
}

const payload = readGeneratedConstObject(SOURCE, 'LIVE_PENDING_REVIEW_ENRICHMENTS') || {
  schema: 'diognosis.live-pending-review-enrichments.v1',
  studies: {},
  knownDdi: [],
};
const rows = flattenLiveRecords(payload);
const failures = [];

for (const item of rows) {
  const rowFailures = [];
  rowFailures.push(...hasRequiredMetadata(item.row));
  if (item.row.professionalReviewed === true || item.row.clinicalReviewed === true) rowFailures.push('must not set professionalReviewed/clinicalReviewed true');
  if (item.row.canAffectScoring !== false) rowFailures.push('canAffectScoring must be false');
  if (item.row.canAffectPublicSeverity !== false) rowFailures.push('canAffectPublicSeverity must be false');
  if (/reviewed|validated/i.test(String(item.row.reviewStatus || '')) && item.row.reviewStatus !== 'pending_professional_review') rowFailures.push('reviewStatus overclaims review');
  if (!sourceIdentifiers(item.row).length) rowFailures.push('missing source identifier, source record id, URL, DOI, PMID, or evidence ref');
  const text = publicText(item.row);
  for (const pattern of FORBIDDEN_PUBLIC_WORDING) {
    if (pattern.test(text)) rowFailures.push(`forbidden public wording: ${pattern}`);
  }
  if (item.kind === 'knownDdi' && /severe|critical/i.test(item.row.severity || '')) {
    rowFailures.push('live pending-review DDI may not ship as severe/critical in this lane');
  }
  if (rowFailures.length) failures.push({ id: item.id, kind: item.kind, failures: rowFailures });
}

const report = {
  schema: 'diognosis.live-enrichment-boundary-audit.v1',
  generatedAt: new Date().toISOString(),
  source: SOURCE.replace(`${ROOT}/`, ''),
  liveRecords: rows.length,
  counts: rows.reduce((acc, item) => {
    acc[item.kind] = (acc[item.kind] || 0) + 1;
    return acc;
  }, {}),
  failures,
  ok: failures.length === 0,
};

writeJson(OUT_JSON, report);
writeText(OUT_MD, `# Live Enrichment Boundary Audit

Generated: ${report.generatedAt}

- Live pending-review records checked: ${report.liveRecords}
- Failures: ${report.failures.length}

${markdownTable(['Kind', 'Count'], Object.entries(report.counts).map(([kind, count]) => [kind, count]))}

${report.failures.length ? `## Failures\n\n${report.failures.map(item => `- ${item.kind} ${item.id}: ${item.failures.join('; ')}`).join('\n')}` : 'No boundary failures detected.'}
`);

if (!report.ok) {
  console.error(`Live enrichment boundary audit failed: ${failures.length} failure(s).`);
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, liveRecords: rows.length }, null, 2));
