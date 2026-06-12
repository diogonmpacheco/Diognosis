#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const CHECK = process.argv.includes('--check');

const SOURCE_MODULES = [
  'src/data/constants.js',
  'src/data/rules.js',
  'src/data/drugs.js',
  'src/data/enzymes.js',
  'src/data/metabolites.js',
  'src/data/transporters.js',
  'src/data/actors.js',
  'src/data/pharmacology.js',
  'src/data/evidence.js',
  'src/data/interactions.js',
  'src/engine/evidenceEngine.js',
];

const OUT_JS = resolve(ROOT, 'src/data/generatedEvidenceReviewQueue.js');
const OUT_MD = resolve(ROOT, 'docs/EVIDENCE_REVIEW_QUEUE.md');

function loadSourceContext() {
  const context = {
    console,
    document: {
      getElementById() {
        return {
          innerHTML: '',
          textContent: '',
          style: {},
          classList: { add() {}, remove() {}, toggle() {} },
          nextElementSibling: { classList: { toggle() {} } },
        };
      },
      addEventListener() {},
      querySelector() { return null; },
      querySelectorAll() { return []; },
      createElement() { return { className: '', textContent: '', style: {}, dataset: {} }; },
    },
    window: { addEventListener() {}, location: { search: '' }, history: { replaceState() {} } },
    localStorage: { getItem() { return null; }, setItem() {} },
    navigator: { userAgent: '' },
    d3: undefined,
    setTimeout() {},
    clearTimeout() {},
  };
  vm.createContext(context);

  const source = SOURCE_MODULES
    .map((relPath) => readFileSync(resolve(ROOT, relPath), 'utf8'))
    .join('\n\n');

  vm.runInContext(`${source}
globalThis.__QUEUE_SOURCE__ = {
  DRUG_DB, STUDY_DB, KNOWN_DDI, EVIDENCE_TIER, SOURCE_CATEGORY, REVIEW_DECISION,
  getDdiEvidenceProfile, isSeverityBearingEvidence
};`, context);
  return context.__QUEUE_SOURCE__;
}

function professionalReviewStatus(study) {
  if (
    study.professionalReviewed === true ||
    study.clinicalReviewed === true ||
    study.reviewStatus === 'professional_reviewed' ||
    study.reviewStatus === 'clinician_reviewed'
  ) {
    return 'professionally_reviewed';
  }
  return 'pending_professional_review';
}

function evidenceHasExternalId(study) {
  return Boolean(study.pmid || study.doi || study.url);
}

function quantifiedEffectKeys(study) {
  return Object.entries(study.quantifiedEffects || {})
    .filter(([, value]) => value != null && value !== '')
    .map(([key]) => key)
    .sort();
}

function pairLabel(ddi) {
  return `${ddi.drug1} + ${ddi.drug2}`;
}

function severityRank(severity) {
  return severity === 'critical' ? 3 : severity === 'severe' ? 2 : severity === 'moderate' ? 1 : 0;
}

function priorityTier(score) {
  if (score >= 90) return 'critical_review';
  if (score >= 70) return 'high_review';
  if (score >= 40) return 'standard_review';
  return 'backlog_review';
}

function buildReviewQueue(data) {
  const directDdiByStudy = new Map();
  const calculationDdiByStudy = new Map();

  for (const ddi of data.KNOWN_DDI || []) {
    for (const ref of ddi.evidenceRefs || []) {
      if (!directDdiByStudy.has(ref)) directDdiByStudy.set(ref, []);
      directDdiByStudy.get(ref).push(ddi);
    }

    const profile = data.getDdiEvidenceProfile(ddi);
    for (const study of profile.studies || []) {
      if (!calculationDdiByStudy.has(study.id)) calculationDdiByStudy.set(study.id, []);
      calculationDdiByStudy.get(study.id).push(ddi);
    }
  }

  const rows = Object.values(data.STUDY_DB || {})
    .filter((study) => study.public !== false)
    .map((study) => {
      const directDdis = directDdiByStudy.get(study.id) || [];
      const calculationDdis = calculationDdiByStudy.get(study.id) || [];
      const allDdisByPair = new Map();
      for (const ddi of [...directDdis, ...calculationDdis]) allDdisByPair.set(pairLabel(ddi), ddi);
      const allDdis = [...allDdisByPair.values()];
      const severeCriticalDdis = allDdis.filter((ddi) => severityRank(ddi.severity) >= 2);
      const quantifiedKeys = quantifiedEffectKeys(study);
      const status = professionalReviewStatus(study);
      const calculationBearing = calculationDdis.length > 0 && data.isSeverityBearingEvidence(study);
      const sourceCategory = study.sourceCategory || data.SOURCE_CATEGORY.DIOGNOSIS_CURATED;
      const reviewDecision = study.reviewDecision || data.REVIEW_DECISION.UNREVIEWED;

      let score = 0;
      const reasons = [];
      if (severeCriticalDdis.length) {
        score += 55 + Math.min(30, severeCriticalDdis.length * 3);
        reasons.push('linked_to_severe_or_critical_warning');
      }
      if (calculationBearing) {
        score += 25;
        reasons.push('calculation_bearing');
      }
      if (directDdis.length) {
        score += Math.min(12, directDdis.length * 2);
        reasons.push('direct_ddi_evidence_ref');
      }
      if (study.reviewRequired === true) {
        score += 12;
        reasons.push('internal_review_required');
      }
      if (quantifiedKeys.length) {
        score += 10;
        reasons.push('quantified_effects_present');
      }
      if (status === 'pending_professional_review') {
        score += 5;
        reasons.push('pending_professional_review');
      }
      if (!evidenceHasExternalId(study)) {
        score += 4;
        reasons.push('missing_pmid_doi_or_url');
      }
      if (sourceCategory !== data.SOURCE_CATEGORY.DIOGNOSIS_CURATED) {
        score += 18;
        reasons.push('external_context_requires_review');
      }

      const severeCriticalPairs = severeCriticalDdis
        .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || pairLabel(a).localeCompare(pairLabel(b)))
        .slice(0, 12)
        .map((ddi) => ({
          pair: pairLabel(ddi),
          severity: ddi.severity || 'unknown',
        }));

      return {
        id: study.id,
        title: study.title || 'Untitled evidence entry',
        evidenceType: study.type || null,
        studyDesign: study.studyDesign || null,
        source: study.source || study.journal || null,
        year: study.year || null,
        pmid: study.pmid || null,
        doi: study.doi || null,
        url: study.url || null,
        professionalReviewStatus: status,
        reviewRequired: study.reviewRequired === true,
        verified: study.verified === true,
        calculationBearing,
        calculationSurfaces: calculationBearing ? ['ddi_evidence_profile'] : [],
        linkedDdiCount: allDdis.length,
        directDdiRefCount: directDdis.length,
        severeCriticalDdiCount: severeCriticalDdis.length,
        severeCriticalPairs,
        quantifiedEffectKeys: quantifiedKeys,
        priorityScore: score,
        priorityTier: priorityTier(score),
        priorityReasons: [...new Set(reasons)],
        openTargetsDrugId: study.openTargetsDrugId || null,
        chemblId: study.chemblId || null,
        openTargetsRelease: study.openTargetsRelease || null,
        openTargetsSourceDataset: study.openTargetsSourceDataset || null,
        sourceCategory,
        importedContextOnly: study.importedContextOnly === true,
        notSeverityBearing: study.notSeverityBearing === true,
        reviewDecision,
      };
    })
    .sort((a, b) => (
      b.priorityScore - a.priorityScore ||
      b.severeCriticalDdiCount - a.severeCriticalDdiCount ||
      b.linkedDdiCount - a.linkedDdiCount ||
      a.id.localeCompare(b.id)
    ));

  const summary = {
    schemaVersion: 1,
    totalRows: rows.length,
    pendingProfessionalReviewRows: rows.filter((row) => row.professionalReviewStatus === 'pending_professional_review').length,
    professionallyReviewedRows: rows.filter((row) => row.professionalReviewStatus === 'professionally_reviewed').length,
    calculationBearingRows: rows.filter((row) => row.calculationBearing).length,
    severeCriticalLinkedRows: rows.filter((row) => row.severeCriticalDdiCount > 0).length,
    criticalReviewRows: rows.filter((row) => row.priorityTier === 'critical_review').length,
    highReviewRows: rows.filter((row) => row.priorityTier === 'high_review').length,
    externalContextRows: rows.filter((row) => row.sourceCategory !== data.SOURCE_CATEGORY.DIOGNOSIS_CURATED).length,
    generatedBy: 'scripts/audit/evidence-review-queue.js',
  };

  return { rows, summary };
}

function renderJs({ rows, summary }) {
  return `// Generated by scripts/audit/evidence-review-queue.js. Do not edit by hand.
// Professional review queue for Diognosis evidence governance.

const EVIDENCE_REVIEW_QUEUE_SCHEMA_VERSION = 1;

const EVIDENCE_REVIEW_QUEUE_FIELDS = Object.freeze([
  "id",
  "title",
  "evidenceType",
  "studyDesign",
  "source",
  "year",
  "pmid",
  "doi",
  "url",
  "professionalReviewStatus",
  "reviewRequired",
  "verified",
  "calculationBearing",
  "calculationSurfaces",
  "linkedDdiCount",
  "directDdiRefCount",
  "severeCriticalDdiCount",
  "severeCriticalPairs",
  "quantifiedEffectKeys",
  "priorityScore",
  "priorityTier",
  "priorityReasons",
  "openTargetsDrugId",
  "chemblId",
  "openTargetsRelease",
  "openTargetsSourceDataset",
  "sourceCategory",
  "importedContextOnly",
  "notSeverityBearing",
  "reviewDecision"
]);

const EVIDENCE_REVIEW_QUEUE_SUMMARY = Object.freeze(${JSON.stringify(summary, null, 2)});

const GENERATED_EVIDENCE_REVIEW_QUEUE = Object.freeze(${JSON.stringify(rows, null, 2)});
`;
}

function escapeCell(value) {
  return String(value == null ? '' : value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function renderMarkdown({ rows, summary }) {
  const topRows = rows.slice(0, 50);
  const table = topRows.map((row, idx) => `| ${[
    idx + 1,
    row.priorityTier,
    row.priorityScore,
    row.id,
    row.severeCriticalDdiCount,
    row.linkedDdiCount,
    row.calculationBearing ? 'yes' : 'no',
    row.reviewRequired ? 'yes' : 'no',
    row.sourceCategory,
    row.reviewDecision,
    row.priorityReasons.join(', '),
  ].map(escapeCell).join(' | ')} |`).join('\n');

  return `# Evidence Review Queue

Generated from the current Diognosis source data by \`scripts/audit/evidence-review-queue.js\`.

This queue ranks evidence entries for professional review. It is intentionally conservative: all current public evidence remains pending professional review, and Open Targets-ready fields are present now so imported context can enter the same governance workflow later.

## Summary

| Metric | Count |
| --- | ---: |
| Total queue rows | ${summary.totalRows} |
| Pending professional review | ${summary.pendingProfessionalReviewRows} |
| Professionally reviewed | ${summary.professionallyReviewedRows} |
| Calculation-bearing rows | ${summary.calculationBearingRows} |
| Rows linked to severe/critical warnings | ${summary.severeCriticalLinkedRows} |
| Critical review rows | ${summary.criticalReviewRows} |
| High review rows | ${summary.highReviewRows} |
| External context rows | ${summary.externalContextRows} |

## Open Targets-Ready Fields

Each row includes \`openTargetsDrugId\`, \`chemblId\`, \`openTargetsRelease\`, \`openTargetsSourceDataset\`, \`sourceCategory\`, \`importedContextOnly\`, \`notSeverityBearing\`, and \`reviewDecision\`. For current Diognosis-curated evidence these fields default to local curated context and \`unreviewed\`.

Imported Open Targets entries should default to \`sourceCategory: "open_targets_context"\`, \`reviewRequired: true\`, \`importedContextOnly: true\`, \`notSeverityBearing: true\`, and \`reviewDecision: "unreviewed"\` until a qualified Diognosis reviewer promotes the entry.

## Top Review Priorities

| Rank | Tier | Score | Evidence ID | Severe/Critical Links | Total Links | Calculation-Bearing | Review Required | Source Category | Decision | Reasons |
| ---: | --- | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
${table}
`;
}

function writeIfChanged(filePath, content) {
  if (existsSync(filePath) && readFileSync(filePath, 'utf8') === content) return false;
  if (CHECK) {
    throw new Error(`${filePath.replace(`${ROOT}/`, '')} is stale. Run npm run audit:evidence-review-queue.`);
  }
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
  return true;
}

const data = loadSourceContext();
const queue = buildReviewQueue(data);
const wroteJs = writeIfChanged(OUT_JS, renderJs(queue));
const wroteMd = writeIfChanged(OUT_MD, renderMarkdown(queue));

console.log(JSON.stringify({
  ok: true,
  check: CHECK,
  wrote: {
    generatedEvidenceReviewQueue: wroteJs,
    evidenceReviewQueueDoc: wroteMd,
  },
  summary: queue.summary,
}, null, 2));
