#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..', '..');
const ROADMAP_PATH = resolve(__dirname, 'pgx-gap-roadmap.json');
const SNAPSHOT_PATH = resolve(ROOT, 'src/data/generatedOpenTargetsSnapshot.js');
const PROMOTION_QUEUE_PATH = resolve(ROOT, 'src/data/generatedOpenTargetsPromotionQueue.js');
const REVIEW_TARGETS_PATH = resolve(ROOT, 'src/data/generatedOpenTargetsReviewTargets.js');
const OUT_JS = resolve(ROOT, 'src/data/generatedOpenTargetsPgxGapRoadmap.js');
const OUT_MD = resolve(ROOT, 'docs/OPEN_TARGETS_PGX_GAP_ROADMAP.md');

function parseArgs(argv) {
  const args = {
    snapshotPath: SNAPSHOT_PATH,
    promotionQueuePath: PROMOTION_QUEUE_PATH,
    reviewTargetsPath: REVIEW_TARGETS_PATH,
    outJs: OUT_JS,
    outMd: OUT_MD,
    check: false,
  };
  for (let idx = 0; idx < argv.length; idx += 1) {
    const arg = argv[idx];
    if (arg === '--check') args.check = true;
    else if (arg === '--snapshot') args.snapshotPath = resolve(argv[++idx]);
    else if (arg === '--promotion-queue') args.promotionQueuePath = resolve(argv[++idx]);
    else if (arg === '--review-targets') args.reviewTargetsPath = resolve(argv[++idx]);
    else if (arg === '--out-js') args.outJs = resolve(argv[++idx]);
    else if (arg === '--out-md') args.outMd = resolve(argv[++idx]);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

const ARGS = parseArgs(process.argv.slice(2));
const CHECK = ARGS.check;

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function readGeneratedConst(filePath, constName) {
  const text = readFileSync(filePath, 'utf8');
  const match = text.match(new RegExp(`const\\s+${constName}\\s*=\\s*Object\\.freeze\\(([\\s\\S]*?)\\);\\s*$`));
  if (!match) throw new Error(`Could not find ${constName} in ${filePath}`);
  return JSON.parse(match[1]);
}

function loadCoverage() {
  const context = { console };
  vm.createContext(context);
  vm.runInContext([
    readFileSync(resolve(ROOT, 'src/data/constants.js'), 'utf8'),
    readFileSync(resolve(ROOT, 'src/data/rules.js'), 'utf8'),
    readFileSync(resolve(ROOT, 'src/data/enzymes.js'), 'utf8'),
  ].join('\n\n') + `
globalThis.__COVERAGE__ = {
  genotypeEffects: Object.keys(GENOTYPE_EFFECTS || {}),
  riskEffects: Object.keys(GENOTYPE_RISK_EFFECTS || {}),
  metaboliteGenes: [...new Set((GENOTYPE_METABOLITE_EFFECTS || []).map(row => row.enzyme).filter(Boolean))],
  pharmgkbGenes: typeof PHARMGKB_EVIDENCE !== 'undefined' ? Object.keys(PHARMGKB_EVIDENCE || {}) : []
};`, context);
  return context.__COVERAGE__;
}

function isHighEvidence(fact) {
  return /(^|[^a-z0-9])(1a|1b|level\s*1|high|strong|guideline|cpic|fda|clinical annotation)([^a-z0-9]|$)/i
    .test(`${fact.sourceEvidenceLevel || ''} ${fact.label || ''}`);
}

function hasSelector(coverage, gene) {
  return coverage.genotypeEffects.includes(gene) || coverage.riskEffects.some(key => key === gene || key.startsWith(`${gene}*`));
}

function hasWarningCard(coverage, gene) {
  return coverage.pharmgkbGenes.includes(gene) || coverage.riskEffects.some(key => key === gene || key.startsWith(`${gene}*`));
}

function pairKey(fact, diognosisName) {
  return [
    diognosisName,
    fact.chemblId,
    fact.targetGene || 'unknown',
    fact.riskMarker || '',
    fact.drugResponseCategory || '',
    fact.sourceEvidenceLevel || '',
  ].map(value => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim()).join('|');
}

function classifyPair(pair, coverage, roadmap, firstTargetGenes) {
  const gene = pair.gene;
  const selector = gene !== 'unknown' && hasSelector(coverage, gene);
  const warningCard = gene !== 'unknown' && hasWarningCard(coverage, gene);
  const metaboliteRule = gene !== 'unknown' && coverage.metaboliteGenes.includes(gene);
  const firstReviewTarget = firstTargetGenes.has(`${pair.chemblId}|${gene}`);
  const highEvidence = pair.highEvidence;

  if (firstReviewTarget) return 'first_review_linked';
  if (gene === 'unknown') return roadmap.unsupportedGeneDispositions.unknown?.disposition || 'needs_source_gene_normalization';
  if (selector && (warningCard || metaboliteRule)) return 'covered_keep_context';
  if (selector) return roadmap.selectorOnlyDispositions[gene]?.disposition || 'selector_only_review_warning_card';
  if (highEvidence) return roadmap.unsupportedGeneDispositions[gene]?.disposition || 'unsupported_high_evidence_triage';
  return roadmap.unsupportedGeneDispositions[gene]?.disposition || 'context_only_no_selector';
}

function buildReport(args = ARGS) {
  const roadmap = readJson(ROADMAP_PATH);
  const snapshot = readGeneratedConst(args.snapshotPath, 'GENERATED_OPEN_TARGETS_SNAPSHOT');
  const queue = readGeneratedConst(args.promotionQueuePath, 'GENERATED_OPEN_TARGETS_PROMOTION_QUEUE');
  const reviewTargets = readGeneratedConst(args.reviewTargetsPath, 'GENERATED_OPEN_TARGETS_REVIEW_TARGETS');
  const coverage = loadCoverage();
  const errors = [];

  const crosswalkByChembl = new Map();
  for (const row of snapshot.crosswalk || []) {
    if (!row.chemblId) continue;
    crosswalkByChembl.set(row.chemblId, row);
  }

  const firstTargetGenes = new Set();
  for (const target of reviewTargets || []) {
    for (const gene of target.genes || []) firstTargetGenes.add(`${target.chemblId}|${gene}`);
  }

  const pairMap = new Map();
  for (const facts of Object.values(snapshot.contextByChemblId || {})) {
    for (const fact of facts || []) {
      if (fact.openTargetsSourceDataset !== 'pharmacogenetics') continue;
      const row = crosswalkByChembl.get(fact.chemblId);
      const diognosisName = row?.diognosisName || fact.chemblId;
      const key = pairKey(fact, diognosisName);
      const existing = pairMap.get(key);
      if (existing) {
        existing.factCount += 1;
        existing.labels.add(fact.label || '');
        continue;
      }
      const promotionRows = queue.filter(q => q.chemblId === fact.chemblId && q.targetGene === fact.targetGene);
      pairMap.set(key, {
        diognosisName,
        chemblId: fact.chemblId,
        gene: fact.targetGene || 'unknown',
        riskMarker: fact.riskMarker || null,
        responseCategory: fact.drugResponseCategory || null,
        evidenceLevel: fact.sourceEvidenceLevel || 'not_specified',
        highEvidence: isHighEvidence(fact),
        labels: new Set([fact.label || '']),
        factCount: 1,
        promotionDecision: promotionRows.find(row => row.reviewDecision === 'linked_to_diognosis_evidence')?.reviewDecision ||
          promotionRows.find(row => row.reviewDecision === 'candidate_for_diognosis_evidence')?.reviewDecision ||
          promotionRows[0]?.reviewDecision ||
          'unreviewed',
      });
    }
  }

  const pairs = [...pairMap.values()].map(pair => {
    const selector = pair.gene !== 'unknown' && hasSelector(coverage, pair.gene);
    const warningCard = pair.gene !== 'unknown' && hasWarningCard(coverage, pair.gene);
    const metaboliteRule = pair.gene !== 'unknown' && coverage.metaboliteGenes.includes(pair.gene);
    const classification = classifyPair(pair, coverage, roadmap, firstTargetGenes);
    return {
      ...pair,
      labels: [...pair.labels].filter(Boolean).slice(0, 3),
      hasGenotypeSelector: selector,
      hasWarningCard: warningCard,
      hasMetaboliteRule: metaboliteRule,
      classification,
      reviewerDisposition: roadmap.unsupportedGeneDispositions[pair.gene]?.disposition ||
        roadmap.selectorOnlyDispositions[pair.gene]?.disposition ||
        classification,
      reviewerRationale: roadmap.unsupportedGeneDispositions[pair.gene]?.rationale ||
        roadmap.selectorOnlyDispositions[pair.gene]?.rationale ||
        null,
    };
  }).sort((a, b) =>
    a.classification.localeCompare(b.classification) ||
    a.diognosisName.localeCompare(b.diognosisName) ||
    a.gene.localeCompare(b.gene)
  );

  const unsupportedGenes = [...new Set(pairs
    .filter(pair => !pair.hasGenotypeSelector)
    .map(pair => pair.gene))]
    .sort();
  for (const gene of unsupportedGenes) {
    if (!roadmap.unsupportedGeneDispositions[gene]) errors.push(`Unsupported gene ${gene} has no roadmap disposition`);
  }

  const summary = {
    schemaVersion: 1,
    uniquePairs: pairs.length,
    firstReviewLinked: pairs.filter(pair => pair.classification === 'first_review_linked').length,
    coveredKeepContext: pairs.filter(pair => pair.classification === 'covered_keep_context').length,
    selectorOnlyReview: pairs.filter(pair => pair.classification === 'selector_only_review_warning_card' || pair.classification.includes('needs_warning_card_review')).length,
    unsupportedContextOnly: pairs.filter(pair => pair.classification === 'context_only_no_selector').length,
    unsupportedHighEvidenceTriage: pairs.filter(pair => pair.classification === 'unsupported_high_evidence_triage').length,
    needsSourceGeneNormalization: pairs.filter(pair => pair.classification === 'needs_source_gene_normalization').length,
    unsupportedGenes: unsupportedGenes.length,
    generatedBy: 'scripts/integrations/open-targets/audit-open-targets-pgx-roadmap.js',
  };

  return {
    schemaVersion: 1,
    reviewedBy: roadmap.reviewedBy,
    reviewedAt: roadmap.reviewedAt,
    summary,
    pairs,
    unsupportedGenes: unsupportedGenes.map(gene => ({
      gene,
      pairCount: pairs.filter(pair => pair.gene === gene).length,
      disposition: roadmap.unsupportedGeneDispositions[gene]?.disposition || null,
      rationale: roadmap.unsupportedGeneDispositions[gene]?.rationale || null,
    })),
    errors,
  };
}

function renderJs(report) {
  return `// Generated by scripts/integrations/open-targets/audit-open-targets-pgx-roadmap.js. Do not edit by hand.
// Open Targets/ClinPGx gap roadmap. This does not promote external context into risk scoring.

const OPEN_TARGETS_PGX_GAP_ROADMAP_SCHEMA_VERSION = 1;

const OPEN_TARGETS_PGX_GAP_ROADMAP_SUMMARY = Object.freeze(${JSON.stringify(report.summary, null, 2)});

const GENERATED_OPEN_TARGETS_PGX_GAP_ROADMAP = Object.freeze(${JSON.stringify({
    reviewedBy: report.reviewedBy,
    reviewedAt: report.reviewedAt,
    pairs: report.pairs,
    unsupportedGenes: report.unsupportedGenes,
  }, null, 2)});
`;
}

function cell(value) {
  return String(value == null ? '' : Array.isArray(value) ? value.join(', ') : value)
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ');
}

function pairTable(rows) {
  if (!rows.length) return 'None.';
  const body = rows.slice(0, 80).map(pair => `| ${[
    pair.diognosisName,
    pair.gene,
    pair.evidenceLevel,
    pair.riskMarker || '',
    pair.classification,
    pair.hasGenotypeSelector ? 'yes' : 'no',
    pair.hasMetaboliteRule ? 'yes' : 'no',
    pair.hasWarningCard ? 'yes' : 'no',
  ].map(cell).join(' | ')} |`).join('\n');
  return `| Drug | Gene | Evidence | Marker | Classification | Selector | Metabolite Rule | Warning Card |
| --- | --- | --- | --- | --- | --- | --- | --- |
${body}`;
}

function renderMarkdown(report) {
  return `# Open Targets PGx Gap Roadmap

Generated by \`scripts/integrations/open-targets/audit-open-targets-pgx-roadmap.js\`.

This roadmap turns Open Targets/ClinPGx context into explicit implementation dispositions. It is planning material only: no Open Targets PGx row affects \`calcRisk()\` unless a future Diognosis evidence entry is reviewed and wired deliberately.

## Summary

| Metric | Count |
| --- | ---: |
| Unique PGx pairs | ${report.summary.uniquePairs} |
| First review linked rows | ${report.summary.firstReviewLinked} |
| Covered, keep context | ${report.summary.coveredKeepContext} |
| Selector-only / warning-card review | ${report.summary.selectorOnlyReview} |
| Unsupported context-only pairs | ${report.summary.unsupportedContextOnly} |
| Unsupported high-evidence triage pairs | ${report.summary.unsupportedHighEvidenceTriage} |
| Needs source gene normalization | ${report.summary.needsSourceGeneNormalization} |
| Unsupported genes | ${report.summary.unsupportedGenes} |

Reviewed by: ${report.reviewedBy}

Reviewed at: ${report.reviewedAt}

## Unsupported Gene Dispositions

${report.unsupportedGenes.length ? report.unsupportedGenes.map(row => `- ${row.gene}: ${row.disposition} (${row.pairCount} pair${row.pairCount === 1 ? '' : 's'}) — ${row.rationale}`).join('\n') : 'None.'}

## First Review Linked Rows

${pairTable(report.pairs.filter(pair => pair.classification === 'first_review_linked'))}

## Covered / Keep Context

${pairTable(report.pairs.filter(pair => pair.classification === 'covered_keep_context'))}

## Other PGx Context

${pairTable(report.pairs.filter(pair => pair.classification !== 'first_review_linked' && pair.classification !== 'covered_keep_context'))}

## Completion Contract

- Every unsupported gene has a disposition.
- First-review targets are linked to Diognosis evidence and separated from context-only PGx rows.
- Covered rows remain useful for audit and UI context but do not change warning severity.
`;
}

function writeIfChanged(filePath, content) {
  if (existsSync(filePath) && readFileSync(filePath, 'utf8') === content) return false;
  if (CHECK) throw new Error(`${filePath.replace(`${ROOT}/`, '')} is stale. Run node scripts/audit/run.js open-targets-pgx-roadmap.`);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
  return true;
}

try {
  const report = buildReport();
  if (report.errors.length) throw new Error(report.errors.join('\n'));
  const wroteJs = writeIfChanged(ARGS.outJs, renderJs(report));
  const wroteMd = writeIfChanged(ARGS.outMd, renderMarkdown(report));
  console.log(JSON.stringify({
    ok: true,
    check: CHECK,
    wrote: {
      generatedOpenTargetsPgxGapRoadmap: wroteJs,
      openTargetsPgxGapRoadmapDoc: wroteMd,
    },
    summary: report.summary,
  }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
