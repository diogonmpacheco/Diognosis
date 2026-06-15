#!/usr/bin/env node
import { existsSync, readdirSync } from 'fs';
import { createHash } from 'crypto';
import { join, resolve } from 'path';
import { ROOT } from './lib/diognosis-source-loader.js';
import { markdownTable, readJson, writeJson, writeText } from './lib/enrichment-common.js';
import {
  actorsForRecord,
  claimTypeForRecord,
  explainLiveEligibility,
  makeLivePendingReviewGovernance,
  sourceIdentifiersForRecord,
} from './lib/live-enrichment-policy.js';

const CANDIDATE_DIR = resolve(ROOT, 'data/enrichment/candidates');
const DECISIONS = resolve(ROOT, 'data/enrichment/source-faithfulness-decisions/automated/automated-source-check-decisions.json');
const OUT_SOURCE = resolve(ROOT, 'src/data/generatedLivePendingReview.js');
const OUT_JSON = resolve(ROOT, 'docs/audits/live-pending-review-promotion.json');
const OUT_MD = resolve(ROOT, 'docs/audits/live-pending-review-promotion.md');
const FIRST_JSON = resolve(ROOT, 'docs/audits/first-live-pending-review-enrichment.json');
const FIRST_MD = resolve(ROOT, 'docs/audits/first-live-pending-review-enrichment.md');

const DEFAULT_CAPS = Object.freeze({
  total: 75,
  knownDdi: 25,
  study: 20,
  metab: 20,
  metaboliteActor: 20,
  pkTiming: 10,
  genotypePgx: 10,
  labelContext: 10,
});

const STARTER_TERMS = [
  'Tacrolimus',
  'Fluconazole',
  'CYP3A4',
  'CYP3A5',
  'ABCB1',
  'P-gp',
  'Clopidogrel',
  'CYP2C19',
  'Codeine',
  'CYP2D6',
  'Tamoxifen',
  'Capecitabine',
  'DPYD',
  'Irinotecan',
  'UGT1A1',
  'Azathioprine',
  'Mercaptopurine',
  'TPMT',
  'NUDT15',
  'Warfarin',
  'CYP2C9',
  'VKORC1',
  'CYP4F2',
  'G6PD',
  'Succinylcholine',
  'BCHE',
  'RYR1',
];

function parseArgs(argv) {
  const args = { ...DEFAULT_CAPS };
  for (const arg of argv) {
    if (arg.startsWith('--max-live-promotions=')) args.total = Number(arg.slice(22));
    else if (arg.startsWith('--max-total=')) args.total = Number(arg.slice(12));
    else if (arg.startsWith('--max-ddi=')) args.knownDdi = Number(arg.slice(10));
    else if (arg.startsWith('--max-study=')) args.study = Number(arg.slice(12));
  }
  return args;
}

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

function decisionMap() {
  const parsed = readJson(DECISIONS, {});
  return new Map((parsed.decisionRows || []).map(row => [row.recordId, row]));
}

function rankCandidate(row) {
  const text = [
    row.priority,
    row.sourceName,
    row.claimType,
    ...(row.drugs || []),
    ...(row.genes || []),
    ...(row.metabolites || []),
    ...(row.riskMarkers || []),
    row.strongestExternalTier,
  ].join(' ');
  let score = 0;
  for (const term of STARTER_TERMS) if (text.toLowerCase().includes(term.toLowerCase())) score += 20;
  if (row.priority === 'P1') score += 10;
  if (/1A|1B|FDA_LABEL|GUIDELINE|label|CPIC|ClinPGx/i.test(text)) score += 8;
  if (/interaction|ddi/i.test(row.store || row.claimType || '')) score += 4;
  if (/parent_metabolite|metabolite/i.test(row.store || row.claimType || '')) score += 4;
  if (/pgx|clinical_annotation|guideline_annotation|variant/i.test(row.store || row.claimType || '')) score += 3;
  return score;
}

function stableId(prefix, row) {
  const hash = createHash('sha256').update(JSON.stringify({
    id: row.candidateId,
    source: row.sourceName,
    claim: row.claimType,
    actors: actorsForRecord(row),
    evidence: row.evidenceIdentifiers,
  })).digest('hex').slice(0, 12);
  return `${prefix}_${hash}`;
}

function tierForCandidate(row) {
  const text = `${row.sourceName} ${row.claimType} ${row.strongestExternalTier} ${(row.evidenceIdentifiers || []).join(' ')}`;
  if (/DailyMed|FDA_LABEL|fda label|drug_label/i.test(text)) return 'fda_label';
  if (/CPIC|ClinPGx|guideline|1A|1B/i.test(text)) return 'guideline';
  if (/clinical[_ ]pk|pk_parameter/i.test(text)) return 'clinical_pk';
  if (/PMID:|DOI:/i.test(text)) return 'review';
  return 'guideline';
}

function parsePmid(row) {
  const match = (row.evidenceIdentifiers || []).join(' ').match(/PMID:?\s*(\d+)/i);
  return match ? match[1] : '';
}

function parseDoi(row) {
  const match = (row.evidenceIdentifiers || []).join(' ').match(/DOI:?\s*([^\s]+)/i);
  return match ? match[1] : '';
}

function firstUrl(row) {
  return (row.evidenceIdentifiers || []).find(value => /^https?:\/\//i.test(value)) || '';
}

function actorLabel(row) {
  const actors = actorsForRecord(row);
  return [...actors.drugs, ...actors.genes, ...actors.metabolites, ...actors.phenotypes].slice(0, 5).join(' + ') || 'mapped actors';
}

function claimLabel(row) {
  return String(claimTypeForRecord(row)).replace(/_/g, ' ');
}

function studyForCandidate(row) {
  const id = stableId('ev_live_pending', row);
  const actors = actorsForRecord(row);
  const governance = makeLivePendingReviewGovernance();
  const title = `Source-linked pending-review preview: ${actorLabel(row)} ${claimLabel(row)}`;
  const limitations = [
    'Automated source traceability check only; professional review remains pending.',
    'Diognosis-authored summary; no protected full text copied.',
  ];
  return {
    id,
    title,
    year: new Date().getUTCFullYear(),
    type: tierForCandidate(row),
    source: row.sourceName || 'source-linked enrichment',
    url: firstUrl(row),
    pmid: parsePmid(row),
    doi: parseDoi(row),
    supports: [
      row.candidateId,
      row.claimType,
      row.store,
      ...actors.drugs,
      ...actors.genes,
      ...actors.metabolites,
      ...actors.phenotypes,
    ].filter(Boolean),
    sourceIdentifiers: sourceIdentifiersForRecord(row),
    sourceRecordIds: row.sourceRecords || [],
    summary: `Automated curated preview for ${actorLabel(row)}. The mapped claim is kept visible as a review prompt and remains pending professional review.`,
    mechanismSummary: row.mechanismSummary || '',
    clinicalSummary: 'Source-linked pending-review preview. Not clinical decision support.',
    limitations,
    public: true,
    ...governance,
  };
}

function ddiForCandidate(row, studyId) {
  const actors = actorsForRecord(row);
  if ((actors.drugs || []).length < 2) return null;
  return {
    id: stableId('ddi_live_pending', row),
    drug1: actors.drugs[0],
    drug2: actors.drugs[1],
    severity: 'monitor',
    category: 'source-linked pending-review context',
    mechanism: row.mechanismSummary || `Source-linked pending-review interaction context for ${actors.drugs[0]} and ${actors.drugs[1]}.`,
    evidenceRefs: [studyId],
    sourceIdentifiers: sourceIdentifiersForRecord(row),
    sourceRecordIds: row.sourceRecords || [],
    clinicalSummary: 'Live pending-review preview. Severity remains conservative until professional review.',
    ...makeLivePendingReviewGovernance({ canAffectPublicSeverity: false }),
  };
}

function labelContextForCandidate(row, studyId) {
  const actors = actorsForRecord(row);
  if (row.store !== 'label_context' && row.claimType !== 'drug_label') return null;
  return {
    id: stableId('label_live_pending', row),
    drug: actors.drugs[0] || '',
    title: `DailyMed label metadata preview for ${actors.drugs[0] || 'mapped drug'}`,
    evidenceRefs: [studyId],
    sourceIdentifiers: sourceIdentifiersForRecord(row),
    sourceRecordIds: row.sourceRecords || [],
    ...makeLivePendingReviewGovernance({ canAffectScoring: false, canAffectPublicSeverity: false }),
  };
}

function countTotal(payload) {
  return Object.keys(payload.studies).length +
    payload.knownDdi.length +
    Object.values(payload.metab).flat().length +
    Object.keys(payload.metaboliteActors).length +
    payload.genotypeEffects.length +
    payload.genotypeMetaboliteEffects.length +
    Object.keys(payload.pkParams).length +
    Object.keys(payload.washoutDays).length +
    payload.labelContext.length;
}

function generatedSource(payload) {
  return `// Auto-generated by scripts/enrich/promote-live-pending-review.js. Do not edit by hand.
const LIVE_PENDING_REVIEW_ENRICHMENTS = ${JSON.stringify(payload, null, 2)};
`;
}

function main() {
  const caps = parseArgs(process.argv.slice(2));
  const decisions = decisionMap();
  const candidates = readCandidateStores();
  const rejected = [];
  const eligible = [];
  for (const row of candidates) {
    if (row.existingCoreRow) {
      rejected.push({
        candidateId: row.candidateId,
        store: row.store,
        reason: 'existing_core_row_no_live_duplicate',
        details: ['existing local Diognosis row is surfaced for review but not duplicated into live preview'],
      });
      continue;
    }
    const decision = decisions.get(row.candidateId);
    const eligibility = explainLiveEligibility(row);
    if (decision?.decision === 'passed_traceability_check' && eligibility.liveEligibility === 'eligible_live_pending_review') eligible.push(row);
    else rejected.push({
      candidateId: row.candidateId,
      store: row.store,
      reason: decision?.liveEligibility || eligibility.liveEligibility,
      details: decision?.reasons || eligibility.reasons,
    });
  }

  const selected = eligible
    .sort((a, b) => rankCandidate(b) - rankCandidate(a) || String(a.candidateId).localeCompare(String(b.candidateId)))
    .slice(0, caps.total);

  const payload = {
    schema: 'diognosis.live-pending-review-enrichments.v1',
    generatedAt: new Date().toISOString(),
    summary: {},
    studies: {},
    knownDdi: [],
    metab: {},
    metaboliteActors: {},
    genotypeEffects: [],
    genotypeMetaboliteEffects: [],
    pkParams: {},
    washoutDays: {},
    labelContext: [],
  };

  const counts = { study: 0, knownDdi: 0, labelContext: 0 };
  const accepted = [];
  for (const row of selected) {
    if (counts.study >= caps.study || countTotal(payload) >= caps.total) continue;
    const study = studyForCandidate(row);
    payload.studies[study.id] = study;
    counts.study += 1;
    accepted.push({ candidateId: row.candidateId, liveId: study.id, kind: 'study', store: row.store });

    if (row.store === 'interactions' && counts.knownDdi < caps.knownDdi && countTotal(payload) < caps.total) {
      const ddi = ddiForCandidate(row, study.id);
      if (ddi) {
        payload.knownDdi.push(ddi);
        counts.knownDdi += 1;
        accepted.push({ candidateId: row.candidateId, liveId: ddi.id, kind: 'knownDdi', store: row.store });
      }
    }
    if ((row.store === 'label_context' || row.claimType === 'drug_label') && counts.labelContext < caps.labelContext && countTotal(payload) < caps.total) {
      const label = labelContextForCandidate(row, study.id);
      if (label) {
        payload.labelContext.push(label);
        counts.labelContext += 1;
        accepted.push({ candidateId: row.candidateId, liveId: label.id, kind: 'labelContext', store: row.store });
      }
    }
  }

  payload.summary = {
    totalLiveRecords: countTotal(payload),
    studies: Object.keys(payload.studies).length,
    knownDdi: payload.knownDdi.length,
    metab: Object.values(payload.metab).flat().length,
    metaboliteActors: Object.keys(payload.metaboliteActors).length,
    genotypeEffects: payload.genotypeEffects.length,
    genotypeMetaboliteEffects: payload.genotypeMetaboliteEffects.length,
    pkParams: Object.keys(payload.pkParams).length,
    washoutDays: Object.keys(payload.washoutDays).length,
    labelContext: payload.labelContext.length,
  };

  writeText(OUT_SOURCE, generatedSource(payload));
  const report = {
    schema: 'diognosis.live-pending-review-promotion.v1',
    generatedAt: payload.generatedAt,
    caps,
    candidatesScanned: candidates.length,
    eligibleCandidates: eligible.length,
    selectedCandidates: selected.length,
    accepted,
    rejectedCounts: rejected.reduce((acc, row) => {
      acc[row.reason] = (acc[row.reason] || 0) + 1;
      return acc;
    }, {}),
    rejectedSample: rejected.slice(0, 50),
    liveSummary: payload.summary,
    professionalReviewCreated: false,
    clinicalValidationCreated: false,
  };
  writeJson(OUT_JSON, report);
  writeJson(FIRST_JSON, report);
  const md = renderMarkdown(report);
  writeText(OUT_MD, md);
  writeText(FIRST_MD, md.replace('# Live Pending-Review Promotion', '# First Live Pending-Review Enrichment'));
  console.log(JSON.stringify({ ok: true, liveSummary: payload.summary, eligibleCandidates: eligible.length }, null, 2));
}

function renderMarkdown(report) {
  return `# Live Pending-Review Promotion

Generated: ${report.generatedAt}

- Candidates scanned: ${report.candidatesScanned}
- Eligible by automated traceability gate: ${report.eligibleCandidates}
- Selected under caps: ${report.selectedCandidates}
- Live pending-review records: ${report.liveSummary.totalLiveRecords}
- Professional review created: no
- Clinical validation created: no

${markdownTable(['Live lane', 'Count'], Object.entries(report.liveSummary).map(([key, count]) => [key, count]))}

## Rejected Reasons

${markdownTable(['Reason', 'Count'], Object.entries(report.rejectedCounts).map(([reason, count]) => [reason, count]))}

## Accepted Preview Records

${markdownTable(['Kind', 'Store', 'Candidate', 'Live ID'], report.accepted.slice(0, 80).map(row => [
  row.kind,
  row.store,
  row.candidateId,
  row.liveId,
]))}
`;
}

main();
