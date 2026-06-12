#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..', '..');
const SNAPSHOT_PATH = resolve(ROOT, 'src/data/generatedOpenTargetsSnapshot.js');
const PROMOTION_QUEUE_PATH = resolve(ROOT, 'src/data/generatedOpenTargetsPromotionQueue.js');
const OUT_JS = resolve(ROOT, 'src/data/generatedOpenTargetsMechanisticQueue.js');
const OUT_MD = resolve(ROOT, 'docs/OPEN_TARGETS_MECHANISTIC_REVIEW_QUEUE.md');
const CHECK = process.argv.includes('--check');

const TARGET_ALIASES = {
  SLC6A4: ['SLC6A4', 'SERT', 'serotonin transporter', 'SSRI', 'serotonergic'],
  OPRM1: ['OPRM1', 'MOR', 'mu-opioid', 'opioid'],
  OPRD1: ['OPRD1', 'delta opioid', 'opioid'],
  OPRK1: ['OPRK1', 'kappa opioid', 'opioid'],
  TYMS: ['TYMS', 'thymidylate synthase', 'fluoropyrimidine', 'fluorouracil', '5-FU', 'capecitabine'],
  DRD2: ['DRD2', 'D2', 'dopamine', 'dopaminergic', 'antipsychotic', 'atypical AP'],
  HTR2A: ['HTR2A', '5-HT2A', 'serotonin', 'serotonergic', 'antipsychotic', 'atypical AP'],
  VKORC1: ['VKORC1', 'vitamin K', 'warfarin', 'anticoag'],
  P2RY12: ['P2RY12', 'P2Y12', 'platelet', 'clopidogrel'],
  ESR1: ['ESR1', 'estrogen receptor', 'estrogen', 'tamoxifen'],
  HMGCR: ['HMGCR', 'HMG-CoA reductase', 'statin', 'cholesterol'],
  KCNH2: ['KCNH2', 'hERG', 'QT'],
};

function readGeneratedObject(filePath, constName) {
  const text = readFileSync(filePath, 'utf8');
  const pattern = new RegExp(`const\\s+${constName}\\s*=\\s*Object\\.freeze\\(([\\s\\S]*?)\\);\\s*$`);
  const match = text.match(pattern);
  if (!match) throw new Error(`Could not find ${constName} in ${filePath}`);
  return JSON.parse(match[1]);
}

function loadMedcheckContext() {
  const context = { console };
  vm.createContext(context);
  vm.runInContext([
    readFileSync(resolve(ROOT, 'src/data/constants.js'), 'utf8'),
    readFileSync(resolve(ROOT, 'src/data/rules.js'), 'utf8'),
    readFileSync(resolve(ROOT, 'src/data/drugs.js'), 'utf8'),
  ].join('\n\n') + `
globalThis.__MECHANISTIC_CONTEXT__ = {
  drugs: DRUG_DB.map(drug => ({
    id: drug.id,
    name: drug.name,
    cls: drug.cls,
    note: drug.note || '',
    brandNames: drug.brandNames || [],
    props: drug.props || {},
    routes: drug.routes || [],
    inh: drug.inh || [],
    ind: drug.ind || []
  })),
  normalizeDrugLookupKey
};`, context);
  return context.__MECHANISTIC_CONTEXT__;
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cell(value) {
  return String(value == null ? '' : Array.isArray(value) ? value.join(', ') : value)
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ');
}

function promotionKey(row) {
  return [
    row.chemblId || '',
    row.dataset || row.openTargetsSourceDataset || '',
    row.label || '',
  ].map(value => String(value).toLowerCase().replace(/\s+/g, ' ').trim()).join('|');
}

function factKey(fact) {
  return [
    fact.chemblId || '',
    fact.openTargetsSourceDataset || fact.factType || '',
    fact.label || '',
  ].map(value => String(value).toLowerCase().replace(/\s+/g, ' ').trim()).join('|');
}

function drugText(drug) {
  return normalize([
    drug?.id,
    drug?.name,
    drug?.cls,
    drug?.note,
    ...(drug?.brandNames || []),
    ...Object.keys(drug?.props || {}),
    ...(drug?.routes || []).map(row => row.enzyme),
    ...(drug?.inh || []).map(row => row.target),
    ...(drug?.ind || []).map(row => row.target),
  ].filter(Boolean).join(' '));
}

function targetAliases(gene) {
  const upper = String(gene || '').toUpperCase();
  return [...new Set([upper, ...(TARGET_ALIASES[upper] || [])].filter(Boolean))];
}

function classifyTargetRelationship(fact, mappedRows, drugByName) {
  const aliases = targetAliases(fact.targetGene);
  const matches = [];
  for (const row of mappedRows) {
    const drug = drugByName.get(row.medcheckName);
    const text = drugText(drug);
    const matchedAliases = aliases.filter(alias => {
      const normalizedAlias = normalize(alias);
      return normalizedAlias && text.includes(normalizedAlias);
    });
    if (matchedAliases.length) {
      matches.push(`${row.medcheckName}: ${matchedAliases.slice(0, 3).join(', ')}`);
    }
  }
  if (matches.length) {
    return {
      targetRelationship: 'target_or_class_consistent',
      targetRelationshipEvidence: matches,
    };
  }
  return {
    targetRelationship: 'external_off_target_context',
    targetRelationshipEvidence: [],
  };
}

function priorityForFact(fact, relationship) {
  const evidence = `${fact.sourceEvidenceLevel || ''} ${fact.source || ''}`;
  const label = `${fact.label || ''} ${fact.warningType || ''}`;
  let priority = 45;
  if (/clinical|clinpgx|pharmgkb/i.test(evidence)) priority += 20;
  else if (/preclinical/i.test(evidence)) priority += 10;
  else if (/cell|aop|toxcast/i.test(evidence)) priority += 5;
  if (relationship === 'target_or_class_consistent') priority += 15;
  if (/severe|toxicity|hemorrhage|bleed|arrhythm|qt|pulmonary hypertension|neurological|psychosis|fainting|fertility/i.test(label)) {
    priority += 15;
  }
  return Math.min(100, priority);
}

function buildQueue(snapshot, promotionQueue, medcheck) {
  const crosswalkByChembl = new Map();
  for (const row of snapshot.crosswalk || []) {
    if (!row.chemblId) continue;
    const list = crosswalkByChembl.get(row.chemblId) || [];
    list.push(row);
    crosswalkByChembl.set(row.chemblId, list);
  }
  const promotionById = new Map(promotionQueue.map(row => [row.id, row]));
  const promotionByKey = new Map(promotionQueue.map(row => [promotionKey(row), row]));
  const drugByName = new Map((medcheck.drugs || []).map(drug => [drug.name, drug]));

  const rows = [];
  for (const facts of Object.values(snapshot.contextByChemblId || {})) {
    for (const fact of facts || []) {
      const dataset = fact.openTargetsSourceDataset || fact.factType || '';
      if (dataset !== 'targetSafety') continue;
      const mappedRows = crosswalkByChembl.get(fact.chemblId) || [];
      const promotion = promotionById.get(fact.id) || promotionByKey.get(factKey(fact)) || {};
      const reviewDecision = promotion.reviewDecision || fact.reviewDecision || 'unreviewed';
      if (reviewDecision === 'promoted_for_severity') {
        throw new Error(`${fact.id}: target-safety context cannot be promoted directly for severity`);
      }
      const relationship = classifyTargetRelationship(fact, mappedRows, drugByName);
      const linkedToDiognosisEvidence = reviewDecision === 'linked_to_diognosis_evidence' && (promotion.evidenceRefs || []).length > 0;
      rows.push({
        id: fact.id,
        medcheckNames: mappedRows.map(row => row.medcheckName).filter(Boolean),
        medcheckIds: mappedRows.map(row => row.medcheckId).filter(Boolean),
        chemblId: fact.chemblId || null,
        openTargetsDrugId: fact.openTargetsDrugId || fact.chemblId || null,
        openTargetsRelease: fact.openTargetsRelease || snapshot.release || null,
        openTargetsSourceDataset: 'targetSafety',
        sourceCategory: 'open_targets_context',
        importedContextOnly: true,
        notSeverityBearing: true,
        reviewRequired: true,
        reviewDecision,
        label: fact.label || null,
        warningType: fact.warningType || fact.label || null,
        targetGene: fact.targetGene || null,
        targetRelationship: relationship.targetRelationship,
        targetRelationshipEvidence: relationship.targetRelationshipEvidence,
        sourceEvidenceLevel: fact.sourceEvidenceLevel || null,
        source: fact.source || 'Open Targets target safety',
        priorityScore: priorityForFact(fact, relationship.targetRelationship),
        linkedToDiognosisEvidence,
        experimental: !linkedToDiognosisEvidence,
        evidenceRefs: promotion.evidenceRefs || [],
        suggestedAction: linkedToDiognosisEvidence
          ? 'Use as source-linked mechanistic context only; severity remains owned by Diognosis evidence.'
          : 'External target-safety context only. Review target/off-target plausibility before any Diognosis evidence change.',
      });
    }
  }

  rows.sort((a, b) =>
    b.priorityScore - a.priorityScore ||
    String(a.medcheckNames[0] || a.chemblId).localeCompare(String(b.medcheckNames[0] || b.chemblId)) ||
    String(a.targetGene || '').localeCompare(String(b.targetGene || '')) ||
    String(a.label || '').localeCompare(String(b.label || ''))
  );

  const errors = [];
  if (!rows.length) errors.push('No Open Targets targetSafety rows were found.');
  for (const row of rows) {
    if (row.importedContextOnly !== true) errors.push(`${row.id}: target-safety row is not importedContextOnly`);
    if (row.notSeverityBearing !== true) errors.push(`${row.id}: target-safety row is not notSeverityBearing`);
    if (row.reviewRequired !== true) errors.push(`${row.id}: target-safety row is not reviewRequired`);
    if (row.openTargetsSourceDataset !== 'targetSafety') errors.push(`${row.id}: row is not targetSafety`);
  }

  return {
    schemaVersion: 1,
    summary: {
      schemaVersion: 1,
      release: snapshot.release || snapshot.summary?.release || null,
      targetSafetyRows: rows.length,
      targetOrClassConsistentRows: rows.filter(row => row.targetRelationship === 'target_or_class_consistent').length,
      externalOffTargetRows: rows.filter(row => row.targetRelationship === 'external_off_target_context').length,
      experimentalRows: rows.filter(row => row.experimental).length,
      linkedToDiognosisEvidenceRows: rows.filter(row => row.linkedToDiognosisEvidence).length,
      uniqueTargets: new Set(rows.map(row => row.targetGene).filter(Boolean)).size,
      generatedBy: 'scripts/integrations/open-targets/audit-open-targets-mechanistic-queue.js',
    },
    rows,
    errors,
  };
}

function renderJs(queue) {
  return `// Generated by scripts/integrations/open-targets/audit-open-targets-mechanistic-queue.js. Do not edit by hand.
// Open Targets target-safety facts as mechanistic review prompts only.

const OPEN_TARGETS_MECHANISTIC_QUEUE_SCHEMA_VERSION = 1;

const OPEN_TARGETS_MECHANISTIC_QUEUE_SUMMARY = Object.freeze(${JSON.stringify(queue.summary, null, 2)});

const GENERATED_OPEN_TARGETS_MECHANISTIC_QUEUE = Object.freeze(${JSON.stringify(queue.rows, null, 2)});
`;
}

function renderMarkdown(queue) {
  const table = queue.rows.slice(0, 80).map((row, idx) => `| ${[
    idx + 1,
    row.priorityScore,
    row.medcheckNames.join(', ') || row.chemblId,
    row.targetGene || '',
    row.targetRelationship,
    row.label || '',
    row.sourceEvidenceLevel || '',
    row.source || '',
    row.reviewDecision,
    row.experimental ? 'yes' : 'no',
  ].map(cell).join(' | ')} |`).join('\n') || '| none | 0 | none | none | none | none | none | none | none | none |';

  return `# Open Targets Mechanistic Review Queue

Generated by \`scripts/integrations/open-targets/audit-open-targets-mechanistic-queue.js\`.

This queue isolates Open Targets \`targetSafety\` facts as mechanistic review prompts. They are external target-safety context, not source-linked interaction warnings, and they do not affect \`calcRisk()\`, severity, or warning cards.

## Summary

| Metric | Count |
| --- | ---: |
| Target-safety rows | ${queue.summary.targetSafetyRows} |
| Target/class-consistent rows | ${queue.summary.targetOrClassConsistentRows} |
| External off-target rows | ${queue.summary.externalOffTargetRows} |
| Experimental rows | ${queue.summary.experimentalRows} |
| Linked to Diognosis evidence rows | ${queue.summary.linkedToDiognosisEvidenceRows} |
| Unique targets | ${queue.summary.uniqueTargets} |

Open Targets release: ${queue.summary.release || 'not specified'}

## Queue

| Rank | Priority | Drug | Target/Gene | Relationship | Liability | Evidence | Source | Decision | Experimental |
| ---: | ---: | --- | --- | --- | --- | --- | --- | --- | --- |
${table}

## Review Contract

- Rows are labeled as \`external target-safety context\` in the review workbench.
- Target-safety context remains \`importedContextOnly:true\` and \`notSeverityBearing:true\`.
- Rows stay experimental unless linked to Diognosis-reviewed evidence.
- A target-safety row cannot directly promote an interaction to severe or critical.
- Target/off-target labels are triage aids, not clinical conclusions.
`;
}

function writeIfChanged(filePath, content) {
  if (existsSync(filePath) && readFileSync(filePath, 'utf8') === content) return false;
  if (CHECK) throw new Error(`${filePath.replace(`${ROOT}/`, '')} is stale. Run npm run audit:open-targets-mechanistic-queue.`);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
  return true;
}

try {
  const snapshot = readGeneratedObject(SNAPSHOT_PATH, 'GENERATED_OPEN_TARGETS_SNAPSHOT');
  const promotionQueue = readGeneratedObject(PROMOTION_QUEUE_PATH, 'GENERATED_OPEN_TARGETS_PROMOTION_QUEUE');
  const medcheck = loadMedcheckContext();
  const queue = buildQueue(snapshot, promotionQueue, medcheck);
  if (queue.errors.length) throw new Error(queue.errors.join('\n'));
  const wroteJs = writeIfChanged(OUT_JS, renderJs(queue));
  const wroteMd = writeIfChanged(OUT_MD, renderMarkdown(queue));
  console.log(JSON.stringify({
    ok: true,
    check: CHECK,
    wrote: {
      generatedOpenTargetsMechanisticQueue: wroteJs,
      openTargetsMechanisticReviewQueueDoc: wroteMd,
    },
    summary: queue.summary,
  }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
