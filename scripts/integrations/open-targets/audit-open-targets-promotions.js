#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..', '..');
const SNAPSHOT_PATH = resolve(ROOT, 'src/data/generatedOpenTargetsSnapshot.js');
const DECISIONS_PATH = resolve(__dirname, 'review-decisions.json');
const OUT_JS = resolve(ROOT, 'src/data/generatedOpenTargetsPromotionQueue.js');
const OUT_MD = resolve(ROOT, 'docs/OPEN_TARGETS_PROMOTION_QUEUE.md');
const CHECK = process.argv.includes('--check');

const VALID_DECISIONS = new Set([
  'unreviewed',
  'keep_context',
  'rejected',
  'candidate_for_diognosis_evidence',
  'linked_to_diognosis_evidence',
  'promoted_for_severity',
]);

function readSnapshot(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const match = text.match(/const\s+GENERATED_OPEN_TARGETS_SNAPSHOT\s*=\s*Object\.freeze\(([\s\S]*?)\);\s*$/);
  if (!match) throw new Error(`Could not find GENERATED_OPEN_TARGETS_SNAPSHOT in ${filePath}`);
  return JSON.parse(match[1]);
}

function readDecisions(filePath) {
  if (!existsSync(filePath)) return { decisions: [] };
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function factKey(fact) {
  return [
    fact.chemblId || '',
    fact.openTargetsSourceDataset || fact.factType || '',
    fact.label || '',
  ].map(value => String(value).toLowerCase().replace(/\s+/g, ' ').trim()).join('|');
}

function decisionIndex(decisions) {
  const byId = new Map();
  const byKey = new Map();
  const selectors = [];
  for (const decision of decisions.decisions || []) {
    const value = decision.reviewDecision || 'unreviewed';
    if (!VALID_DECISIONS.has(value)) {
      throw new Error(`Invalid Open Targets reviewDecision "${value}" for ${decision.factId || decision.key || 'unknown fact'}`);
    }
    if (decision.factId) byId.set(decision.factId, decision);
    if (decision.key) byKey.set(String(decision.key).toLowerCase(), decision);
    if (decision.selector) selectors.push(decision);
  }
  return { byId, byKey, selectors };
}

function matchesSelectorValue(actual, expected) {
  if (expected == null || expected === '') return true;
  if (Array.isArray(expected)) return expected.some(value => matchesSelectorValue(actual, value));
  return String(actual || '').toLowerCase() === String(expected).toLowerCase();
}

function matchesSelectorPattern(actual, pattern) {
  if (!pattern) return true;
  return new RegExp(pattern, 'i').test(String(actual || ''));
}

function selectorMatches(decision, fact, mappedRows) {
  const selector = decision.selector || {};
  const diognosisNames = mappedRows.map(row => row.diognosisName).filter(Boolean);
  if (!matchesSelectorValue(fact.chemblId, selector.chemblId)) return false;
  if (!matchesSelectorValue(fact.openTargetsSourceDataset || fact.factType, selector.dataset)) return false;
  if (!matchesSelectorValue(fact.targetGene, selector.targetGene)) return false;
  if (!matchesSelectorValue(fact.sourceEvidenceLevel, selector.sourceEvidenceLevel)) return false;
  if (selector.diognosisName && !diognosisNames.some(name => matchesSelectorValue(name, selector.diognosisName))) return false;
  if (!matchesSelectorPattern(fact.label, selector.labelPattern)) return false;
  if (!matchesSelectorPattern(fact.riskMarker, selector.riskMarkerPattern)) return false;
  return true;
}

function decisionForFact(index, fact, mappedRows) {
  return (
    index.byId.get(fact.id) ||
    index.byKey.get(factKey(fact)) ||
    index.selectors.find(decision => selectorMatches(decision, fact, mappedRows)) ||
    {}
  );
}

function missingPromotionFields(decision) {
  if ((decision?.reviewDecision || 'unreviewed') !== 'promoted_for_severity') return [];
  const missing = [];
  for (const field of ['reviewedBy', 'reviewedAt', 'rationale', 'diognosisEvidenceTier']) {
    if (!decision[field]) missing.push(field);
  }
  if (!Array.isArray(decision.supports) || !decision.supports.length) missing.push('supports');
  if (!decision.pmid && !decision.doi && !decision.sourceUrl && !Array.isArray(decision.evidenceRefs)) {
    missing.push('pmid_or_doi_or_sourceUrl_or_evidenceRefs');
  }
  return missing;
}

function candidatePriority(fact) {
  const dataset = fact.openTargetsSourceDataset || fact.factType || '';
  if (dataset === 'drugWarnings') return 90;
  if (dataset === 'pharmacogenetics') return /1a|1b|level\s*1|high|cpic|guideline/i.test(`${fact.sourceEvidenceLevel || ''} ${fact.label || ''}`) ? 85 : 55;
  if (dataset === 'targetSafety') return 60;
  if (dataset === 'faersSignificant') return 45;
  return 25;
}

function suggestedAction(fact) {
  const dataset = fact.openTargetsSourceDataset || fact.factType || '';
  if (dataset === 'drugWarnings') return 'Verify label source and decide whether Diognosis already models the warning.';
  if (dataset === 'pharmacogenetics') return 'Compare against Diognosis genotype selector, metabolite rule, and warning card coverage.';
  if (dataset === 'targetSafety') return 'Use as a mechanistic review prompt only unless tied to reviewed Diognosis evidence.';
  if (dataset === 'faersSignificant') return 'Keep as context unless disproportionality signal is confirmed against clinical evidence.';
  return 'Review source context and keep non-scoring unless promoted with reviewer metadata.';
}

function buildQueue(snapshot, decisions) {
  const index = decisionIndex(decisions);
  const crosswalkByChembl = new Map();
  for (const row of snapshot.crosswalk || []) {
    if (!row.chemblId) continue;
    const list = crosswalkByChembl.get(row.chemblId) || [];
    list.push(row);
    crosswalkByChembl.set(row.chemblId, list);
  }

  const rows = [];
  for (const facts of Object.values(snapshot.contextByChemblId || {})) {
    for (const fact of facts || []) {
      const mapped = crosswalkByChembl.get(fact.chemblId) || [];
      const decision = decisionForFact(index, fact, mapped);
      const reviewDecision = decision.reviewDecision || fact.reviewDecision || 'unreviewed';
      const missingFields = missingPromotionFields({ ...decision, reviewDecision });
      rows.push({
        id: fact.id,
        factKey: factKey(fact),
        diognosisNames: mapped.map(row => row.diognosisName).filter(Boolean),
        chemblId: fact.chemblId || null,
        openTargetsDrugId: fact.openTargetsDrugId || fact.chemblId || null,
        dataset: fact.openTargetsSourceDataset || fact.factType || null,
        release: fact.openTargetsRelease || snapshot.release || null,
        label: fact.label || null,
        targetGene: fact.targetGene || null,
        sourceEvidenceLevel: fact.sourceEvidenceLevel || null,
        source: fact.source || 'Open Targets',
        reviewDecision,
        importedContextOnly: reviewDecision === 'promoted_for_severity' ? false : fact.importedContextOnly !== false,
        notSeverityBearing: reviewDecision === 'promoted_for_severity' ? false : fact.notSeverityBearing !== false,
        promotionReady: reviewDecision === 'promoted_for_severity' && missingFields.length === 0,
        promotionBlockedReasons: missingFields,
        priorityScore: candidatePriority(fact),
        suggestedAction: suggestedAction(fact),
        reviewedBy: decision.reviewedBy || null,
        reviewedAt: decision.reviewedAt || null,
        rationale: decision.rationale || null,
        evidenceRefs: Array.isArray(decision.evidenceRefs) ? decision.evidenceRefs : [],
        evidenceReviewStatus: decision.evidenceReviewStatus || null,
        diognosisEvidenceDecision: decision.diognosisEvidenceDecision || null,
        decisionId: decision.id || decision.factId || decision.key || null,
      });
    }
  }

  rows.sort((a, b) =>
    b.priorityScore - a.priorityScore ||
    String(a.diognosisNames[0] || a.chemblId).localeCompare(String(b.diognosisNames[0] || b.chemblId)) ||
    String(a.id).localeCompare(String(b.id))
  );

  const summary = {
    schemaVersion: 1,
    release: snapshot.release || snapshot.summary?.release || null,
    totalContextFacts: rows.length,
    unreviewed: rows.filter(row => row.reviewDecision === 'unreviewed').length,
    keepContext: rows.filter(row => row.reviewDecision === 'keep_context').length,
    rejected: rows.filter(row => row.reviewDecision === 'rejected').length,
    candidateForDiognosisEvidence: rows.filter(row => row.reviewDecision === 'candidate_for_diognosis_evidence').length,
    linkedToDiognosisEvidence: rows.filter(row => row.reviewDecision === 'linked_to_diognosis_evidence').length,
    promotedForSeverity: rows.filter(row => row.reviewDecision === 'promoted_for_severity').length,
    promotionReady: rows.filter(row => row.promotionReady).length,
    blockedPromotions: rows.filter(row => row.reviewDecision === 'promoted_for_severity' && !row.promotionReady).length,
    generatedBy: 'scripts/integrations/open-targets/audit-open-targets-promotions.js',
  };
  return { rows, summary };
}

function renderJs(queue) {
  return `// Generated by scripts/integrations/open-targets/audit-open-targets-promotions.js. Do not edit by hand.
// Open Targets context promotion queue. Promotion still requires explicit Diognosis evidence wiring.

const OPEN_TARGETS_PROMOTION_QUEUE_SCHEMA_VERSION = 1;

const OPEN_TARGETS_PROMOTION_QUEUE_SUMMARY = Object.freeze(${JSON.stringify(queue.summary, null, 2)});

const GENERATED_OPEN_TARGETS_PROMOTION_QUEUE = Object.freeze(${JSON.stringify(queue.rows, null, 2)});
`;
}

function cell(value) {
  return String(value == null ? '' : value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function renderMarkdown(queue) {
  const table = queue.rows.slice(0, 80).map((row, idx) => `| ${[
    idx + 1,
    row.reviewDecision,
    row.priorityScore,
    row.diognosisNames.join(', ') || row.chemblId,
    row.dataset,
    row.targetGene || '',
    row.sourceEvidenceLevel || '',
    row.promotionBlockedReasons.join(', '),
    row.suggestedAction,
  ].map(cell).join(' | ')} |`).join('\n') || '| none | none | 0 | none | none | none | none | none | none |';

  return `# Open Targets Promotion Queue

Generated by \`scripts/integrations/open-targets/audit-open-targets-promotions.js\`.

Open Targets context starts as non-scoring review material. A reviewer may record \`keep_context\`, \`linked_to_diognosis_evidence\`, \`rejected\`, or \`promoted_for_severity\` in \`scripts/integrations/open-targets/review-decisions.json\`. A promoted entry is blocked unless it includes reviewer, date, rationale, Diognosis evidence tier, support keys, and a source reference.

## Summary

| Metric | Count |
| --- | ---: |
| Context facts | ${queue.summary.totalContextFacts} |
| Unreviewed | ${queue.summary.unreviewed} |
| Keep as context | ${queue.summary.keepContext} |
| Rejected | ${queue.summary.rejected} |
| Candidate for Diognosis evidence | ${queue.summary.candidateForDiognosisEvidence} |
| Linked to Diognosis evidence | ${queue.summary.linkedToDiognosisEvidence} |
| Promoted for severity | ${queue.summary.promotedForSeverity} |
| Promotion-ready | ${queue.summary.promotionReady} |
| Blocked promotions | ${queue.summary.blockedPromotions} |

Open Targets release: ${queue.summary.release || 'not specified'}

## Queue

| Rank | Decision | Priority | Drug | Dataset | Gene/Target | Evidence | Missing Promotion Fields | Suggested Action |
| ---: | --- | ---: | --- | --- | --- | --- | --- | --- |
${table}

## Promotion Contract

- Unreviewed, rejected, and keep-context decisions must never alter \`calcRisk()\`.
- Candidate rows are reviewed follow-up work, not promoted evidence.
- Linked rows point to existing Diognosis evidence references, but the imported Open Targets row remains \`importedContextOnly:true\` and \`notSeverityBearing:true\`.
- Promotion requires Diognosis clinical/data review plus explicit support wiring into the curated evidence model.
- Target-safety and FAERS rows are review prompts, not direct severity evidence by themselves.
`;
}

function writeIfChanged(filePath, content) {
  if (existsSync(filePath) && readFileSync(filePath, 'utf8') === content) return false;
  if (CHECK) throw new Error(`${filePath.replace(`${ROOT}/`, '')} is stale. Run npm run audit:open-targets-promotions.`);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
  return true;
}

try {
  const snapshot = readSnapshot(SNAPSHOT_PATH);
  const decisions = readDecisions(DECISIONS_PATH);
  const queue = buildQueue(snapshot, decisions);
  const wroteJs = writeIfChanged(OUT_JS, renderJs(queue));
  const wroteMd = writeIfChanged(OUT_MD, renderMarkdown(queue));
  if (queue.summary.blockedPromotions > 0) {
    throw new Error(`${queue.summary.blockedPromotions} Open Targets promotion decision(s) are missing required metadata.`);
  }
  console.log(JSON.stringify({
    ok: true,
    check: CHECK,
    wrote: {
      generatedOpenTargetsPromotionQueue: wroteJs,
      openTargetsPromotionQueueDoc: wroteMd,
    },
    summary: queue.summary,
  }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
