#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..', '..');
const TARGETS_PATH = resolve(__dirname, 'first-review-targets.json');
const PROMOTION_QUEUE_PATH = resolve(ROOT, 'src/data/generatedOpenTargetsPromotionQueue.js');
const SCENARIOS_PATH = resolve(ROOT, 'tests/scenarios/diognosis-scenarios.json');
const OUT_JS = resolve(ROOT, 'src/data/generatedOpenTargetsReviewTargets.js');
const OUT_MD = resolve(ROOT, 'docs/OPEN_TARGETS_FIRST_REVIEW_TARGETS.md');
const CHECK = process.argv.includes('--check');

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function readPromotionQueue(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const match = text.match(/const\s+GENERATED_OPEN_TARGETS_PROMOTION_QUEUE\s*=\s*Object\.freeze\(([\s\S]*?)\);\s*$/);
  if (!match) throw new Error(`Could not find GENERATED_OPEN_TARGETS_PROMOTION_QUEUE in ${filePath}`);
  return JSON.parse(match[1]);
}

function loadDiognosisCoverage() {
  const context = { console };
  vm.createContext(context);
  vm.runInContext([
    readFileSync(resolve(ROOT, 'src/data/constants.js'), 'utf8'),
    readFileSync(resolve(ROOT, 'src/data/rules.js'), 'utf8'),
    readFileSync(resolve(ROOT, 'src/data/enzymes.js'), 'utf8'),
    readFileSync(resolve(ROOT, 'src/data/evidence.js'), 'utf8'),
  ].join('\n\n') + `
globalThis.__COVERAGE__ = {
  genotypeEffects: Object.keys(GENOTYPE_EFFECTS || {}),
  riskEffects: Object.keys(GENOTYPE_RISK_EFFECTS || {}),
  metaboliteRules: (GENOTYPE_METABOLITE_EFFECTS || []).map(row => ({
    parent: row.parent,
    enzyme: row.enzyme,
    metaboliteName: row.metaboliteName,
    evidenceRefs: row.evidenceRefs || []
  })),
  pharmgkbGenes: typeof PHARMGKB_EVIDENCE !== 'undefined' ? Object.keys(PHARMGKB_EVIDENCE || {}) : [],
  evidence: Object.fromEntries(Object.entries(STUDY_DB || {}).map(([id, study]) => [id, {
    id,
    title: study.title || id,
    type: study.type || null,
    source: study.source || null,
    year: study.year || null,
    verified: study.verified === true,
    reviewRequired: study.reviewRequired === true,
    reviewDecision: study.reviewDecision || 'unreviewed'
  }]))
};`, context);
  return context.__COVERAGE__;
}

function hasSelector(coverage, gene) {
  return coverage.genotypeEffects.includes(gene) || coverage.riskEffects.some(key => key === gene || key.startsWith(`${gene}*`));
}

function hasWarningCard(coverage, gene) {
  return coverage.pharmgkbGenes.includes(gene) || coverage.riskEffects.some(key => key === gene || key.startsWith(`${gene}*`));
}

function matchingMetaboliteRules(coverage, target) {
  return coverage.metaboliteRules.filter(row =>
    row.parent === target.diognosisName &&
    target.genes.some(gene => row.enzyme === gene)
  );
}

function buildReport() {
  const source = readJson(TARGETS_PATH);
  const queue = readPromotionQueue(PROMOTION_QUEUE_PATH);
  const scenarios = readJson(SCENARIOS_PATH);
  const scenarioIds = new Set((scenarios.scenarios || []).map(scenario => scenario.id));
  const coverage = loadDiognosisCoverage();
  const errors = [];

  const targets = (source.targets || []).map(target => {
    const matchingRows = queue.filter(row =>
      row.chemblId === target.chemblId &&
      row.reviewDecision === target.disposition &&
      target.genes.includes(row.targetGene)
    );
    const selectorGenes = target.genes.filter(gene => hasSelector(coverage, gene));
    const warningCardGenes = target.genes.filter(gene => hasWarningCard(coverage, gene));
    const metaboliteRules = matchingMetaboliteRules(coverage, target);
    const scenarioPresent = scenarioIds.has(target.scenarioId);
    const evidenceRefs = target.evidenceRefs || [];
    const linkedEvidence = evidenceRefs.map(ref => coverage.evidence[ref]).filter(Boolean);

    if (!matchingRows.length) errors.push(`${target.id}: no matching promotion-queue rows for disposition ${target.disposition}`);
    if (!scenarioPresent) errors.push(`${target.id}: scenario ${target.scenarioId} is missing`);
    if (!selectorGenes.length) errors.push(`${target.id}: no genotype selector/risk selector found for ${target.genes.join(', ')}`);
    if (target.disposition === 'linked_to_diognosis_evidence' && !evidenceRefs.length) {
      errors.push(`${target.id}: linked target has no Diognosis evidenceRefs`);
    }
    for (const ref of evidenceRefs) {
      if (!coverage.evidence[ref]) errors.push(`${target.id}: evidence ref ${ref} missing from STUDY_DB`);
    }
    for (const row of matchingRows) {
      if (row.importedContextOnly !== true) errors.push(`${target.id}: linked row ${row.id} is not importedContextOnly`);
      if (row.notSeverityBearing !== true) errors.push(`${target.id}: linked row ${row.id} is not notSeverityBearing`);
    }

    return {
      ...target,
      linkedContextRowCount: matchingRows.length,
      scenarioPresent,
      linkedEvidence,
      coverage: {
        selectorGenes,
        warningCardGenes,
        metaboliteRules: metaboliteRules.map(row => ({
          parent: row.parent,
          enzyme: row.enzyme,
          metaboliteName: row.metaboliteName,
          evidenceRefs: row.evidenceRefs,
        })),
      },
      status: 'completed_review_target',
    };
  });

  return {
    schemaVersion: 1,
    reviewedBy: source.reviewedBy,
    reviewedAt: source.reviewedAt,
    summary: {
      totalTargets: targets.length,
      completedTargets: targets.filter(target => target.status === 'completed_review_target').length,
      linkedContextRows: targets.reduce((sum, target) => sum + target.linkedContextRowCount, 0),
      linkedEvidenceRefs: new Set(targets.flatMap(target => target.evidenceRefs || [])).size,
      scenariosPresent: targets.filter(target => target.scenarioPresent).length,
      generatedBy: 'scripts/integrations/open-targets/audit-open-targets-review-targets.js',
    },
    targets,
    errors,
  };
}

function renderJs(report) {
  return `// Generated by scripts/integrations/open-targets/audit-open-targets-review-targets.js. Do not edit by hand.
// First Open Targets/ClinPGx review targets. These are linked to Diognosis evidence, not promoted external evidence.

const OPEN_TARGETS_REVIEW_TARGETS_SCHEMA_VERSION = 1;

const OPEN_TARGETS_REVIEW_TARGETS_SUMMARY = Object.freeze(${JSON.stringify(report.summary, null, 2)});

const GENERATED_OPEN_TARGETS_REVIEW_TARGETS = Object.freeze(${JSON.stringify(report.targets, null, 2)});
`;
}

function cell(value) {
  return String(value == null ? '' : Array.isArray(value) ? value.join(', ') : value)
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ');
}

function renderMarkdown(report) {
  const rows = report.targets.map(target => `| ${[
    target.diognosisName,
    target.genes.join(', '),
    target.disposition,
    target.linkedContextRowCount,
    target.coverage.selectorGenes.length ? 'yes' : 'no',
    target.coverage.metaboliteRules.map(row => `${row.parent}/${row.enzyme}`).join(', ') || 'no',
    target.coverage.warningCardGenes.length ? 'yes' : 'no',
    target.scenarioId,
    target.evidenceTask,
  ].map(cell).join(' | ')} |`).join('\n');

  const details = report.targets.map(target => `### ${target.diognosisName} / ${target.genes.join(', ')}

- Disposition: \`${target.disposition}\`
- Current assessment: ${target.currentAssessment}
- Needed product behavior: ${target.neededProductBehavior}
- Scenario: \`${target.scenarioId}\` (${target.scenarioPresent ? 'present' : 'missing'})
- Linked Open Targets context rows: ${target.linkedContextRowCount}
- Diognosis evidence refs: ${(target.evidenceRefs || []).map(ref => `\`${ref}\``).join(', ') || 'none'}
`).join('\n');

  return `# Open Targets First Review Targets

Generated by \`scripts/integrations/open-targets/audit-open-targets-review-targets.js\`.

This is the first completed Diognosis data-review batch for Open Targets/ClinPGx context. These Open Targets rows are linked to existing Diognosis evidence references, but the imported context remains non-scoring and pending professional review.

## Summary

| Metric | Count |
| --- | ---: |
| Targets | ${report.summary.totalTargets} |
| Completed targets | ${report.summary.completedTargets} |
| Linked Open Targets context rows | ${report.summary.linkedContextRows} |
| Diognosis evidence refs linked | ${report.summary.linkedEvidenceRefs} |
| Scenarios present | ${report.summary.scenariosPresent} |

Reviewed by: ${report.reviewedBy || 'not specified'}

Reviewed at: ${report.reviewedAt || 'not specified'}

## Target Table

| Drug | Gene(s) | Disposition | Linked Rows | Selector | Metabolite Rule | Warning Card | Scenario | Evidence Task |
| --- | --- | --- | ---: | --- | --- | --- | --- | --- |
${rows}

## Target Details

${details}

## Completion Contract

- Each target has at least one linked row in the Open Targets promotion queue.
- Each linked row remains \`importedContextOnly:true\` and \`notSeverityBearing:true\`.
- Each linked target points to at least one Diognosis \`STUDY_DB\` evidence ref.
- Each target has a deterministic scenario.
- External context remains non-scoring; warning behavior stays owned by Diognosis source-linked evidence.
`;
}

function writeIfChanged(filePath, content) {
  if (existsSync(filePath) && readFileSync(filePath, 'utf8') === content) return false;
  if (CHECK) throw new Error(`${filePath.replace(`${ROOT}/`, '')} is stale. Run npm run audit:open-targets-review-targets.`);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
  return true;
}

try {
  const report = buildReport();
  if (report.errors.length) throw new Error(report.errors.join('\n'));
  const wroteJs = writeIfChanged(OUT_JS, renderJs(report));
  const wroteMd = writeIfChanged(OUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    ok: true,
    check: CHECK,
    wrote: {
      generatedOpenTargetsReviewTargets: wroteJs,
      openTargetsFirstReviewTargetsDoc: wroteMd,
    },
    summary: report.summary,
  }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
