#!/usr/bin/env node
import { existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { ROOT } from './lib/diognosis-source-loader.js';
import { loadAllStagedRecords, markdownTable, readJson, writeJson, writeText } from './lib/enrichment-common.js';
import {
  actorsForRecord,
  claimTypeForRecord,
  explainLiveEligibility,
  liveRecordFingerprint,
  sourceIdentifiersForRecord,
} from './lib/live-enrichment-policy.js';

const DECISION_SCHEMA = 'diognosis.automated-source-check.v1';
const OUT_DIR = resolve(ROOT, 'data/enrichment/source-faithfulness-decisions/automated');
const OUT_JSON = resolve(OUT_DIR, 'automated-source-check-decisions.json');
const OUT_MD = resolve(ROOT, 'docs/audits/automated-source-check.md');
const DOC = resolve(ROOT, 'docs/enrichment/AUTOMATED_SOURCE_CHECK.md');
const CANDIDATE_DIR = resolve(ROOT, 'data/enrichment/candidates');

function readCandidateStores() {
  if (!existsSync(CANDIDATE_DIR)) return [];
  return readdirSync(CANDIDATE_DIR)
    .filter(name => name.startsWith('candidate-') && name.endsWith('.json'))
    .sort()
    .flatMap(name => {
      const parsed = readJson(join(CANDIDATE_DIR, name), null);
      return (parsed?.candidates || []).map(row => ({ ...row, candidateStoreFile: `data/enrichment/candidates/${name}` }));
    });
}

function decisionFor(record, recordType) {
  const eligibility = explainLiveEligibility(record);
  const identifiers = sourceIdentifiersForRecord(record);
  const actors = actorsForRecord(record);
  const passed = eligibility.liveEligibility === 'eligible_live_pending_review';
  return {
    schema: DECISION_SCHEMA,
    decisionId: `automated_source_check_${record.id || record.candidateId || liveRecordFingerprint(record)}`,
    recordId: record.id || record.candidateId || '',
    recordType,
    generatedAt: new Date().toISOString(),
    decision: passed ? 'passed_traceability_check' : 'candidate_only_traceability_gap',
    liveEligibility: eligibility.liveEligibility,
    reasons: eligibility.reasons,
    checks: {
      hasSourceIdentifier: identifiers.length > 0,
      sourceIdentifiers: identifiers.slice(0, 12),
      hasMappedActor: [
        ...actors.drugs,
        ...actors.genes,
        ...actors.metabolites,
        ...actors.pathways,
        ...actors.phenotypes,
      ].length > 0,
      mappedDrugs: actors.drugs,
      mappedGenes: actors.genes,
      mappedMetabolites: actors.metabolites,
      claimType: claimTypeForRecord(record),
      noProtectedFullTextStored: noProtectedText(record),
      noBlockedSourceSurface: eligibility.liveEligibility !== 'license_blocked',
    },
    stillPendingProfessionalReview: true,
    notClinicalReview: true,
    canAffectScoring: false,
    canAffectPublicSeverity: false,
  };
}

function noProtectedText(record = {}) {
  const raw = JSON.stringify({
    abstract: record.abstract,
    fullText: record.fullText,
    sourceText: record.sourceText,
    tableText: record.tableText,
    figureText: record.figureText,
    sourceQuote: record.sourceQuote,
  });
  return !/(abstract|fullText|sourceText|tableText|figureText|sourceQuote)":"[^"]{120,}/i.test(raw);
}

function renderDoc() {
  return `# Automated Source-Faithfulness Check

This check is intentionally narrow. It is not clinical review and it is not professional review.

It only confirms that a staged or candidate record has:

- a source identifier or API/label URL;
- at least one mapped Diognosis actor;
- a supported claim type;
- a clear direction or a direction-exempt claim type such as label metadata, PK, timing, metabolite role, or publication metadata;
- no blocked source surface and no stored protected full text.

Passing this check means the record may be considered for the **live pending-review curated preview** lane. It still carries:

- \`reviewRequired: true\`
- \`professionalReviewStatus: "pending"\`
- \`notClinicalReview: true\`
- \`canAffectScoring: false\` in the automated decision object

The separate promotion script is the only place that can create scoring-enabled live preview data, and the boundary audit must keep that data labeled as without professional sign-off.
`;
}

const { records: stagedRecords, files } = loadAllStagedRecords();
const candidateRecords = readCandidateStores();
const stagedDecisions = stagedRecords.map(record => decisionFor(record, 'staged_source_record'));
const candidateDecisions = candidateRecords.map(record => decisionFor(record, 'candidate_relation'));
const decisions = [...stagedDecisions, ...candidateDecisions];
const summary = decisions.reduce((acc, decision) => {
  acc[decision.liveEligibility] = (acc[decision.liveEligibility] || 0) + 1;
  return acc;
}, {});
const passed = decisions.filter(row => row.decision === 'passed_traceability_check').length;
const report = {
  schema: DECISION_SCHEMA,
  generatedAt: new Date().toISOString(),
  stagedFiles: files.map(file => ({ file: file.file.replace(`${ROOT}/`, ''), records: file.records })),
  stagedRecords: stagedRecords.length,
  candidateRecords: candidateRecords.length,
  decisions: decisions.length,
  passedTraceabilityCheck: passed,
  candidateOnly: decisions.length - passed,
  eligibilityCounts: summary,
  stillPendingProfessionalReview: true,
  notClinicalReview: true,
  canAffectScoring: false,
  decisionRows: decisions,
};

writeJson(OUT_JSON, report);
writeText(DOC, renderDoc());
writeText(OUT_MD, `# Automated Source Check

Generated: ${report.generatedAt}

- Staged records checked: ${report.stagedRecords}
- Candidate records checked: ${report.candidateRecords}
- Passed traceability check: ${report.passedTraceabilityCheck}
- Kept candidate-only: ${report.candidateOnly}
- Clinical review performed: no
- Professional review performed: no

${markdownTable(['Eligibility', 'Count'], Object.entries(report.eligibilityCounts).map(([key, count]) => [key, count]))}
`);

console.log(JSON.stringify({
  ok: true,
  decisions: report.decisions,
  passedTraceabilityCheck: report.passedTraceabilityCheck,
  candidateOnly: report.candidateOnly,
}, null, 2));
