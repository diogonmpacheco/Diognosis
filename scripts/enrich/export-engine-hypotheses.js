#!/usr/bin/env node
import { createHash } from 'crypto';
import { resolve } from 'path';
import { ROOT } from './lib/medcheck-source-loader.js';
import { markdownTable, readJson, writeJson, writeText } from './lib/enrichment-common.js';
import { baseCandidateGovernance, CANDIDATE_STORE_SCHEMA, KNOWLEDGE_LAYERS } from './lib/knowledge-layer-model.js';
import { stableToken } from './lib/staged-source-schema.js';

const DEFAULT_IN = resolve(ROOT, 'docs/audits/enrichment-coverage-audit.json');
const OUT_JSON = resolve(ROOT, 'data/enrichment/candidates/candidate-engine-hypotheses.json');
const OUT_MD = resolve(ROOT, 'docs/audits/engine-hypotheses.md');
const OUT_AUDIT = resolve(ROOT, 'docs/audits/engine-hypotheses.json');

function parseArgs(argv) {
  const args = { max: 300, in: DEFAULT_IN };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--max') args.max = Number(argv[++i]);
    else if (arg.startsWith('--max=')) args.max = Number(arg.slice(6));
    else if (arg === '--in') args.in = resolve(ROOT, argv[++i]);
    else if (arg.startsWith('--in=')) args.in = resolve(ROOT, arg.slice(5));
  }
  return args;
}

function hypothesisId(kind, row) {
  const hash = createHash('sha256').update(JSON.stringify({ kind, row })).digest('hex').slice(0, 10);
  const actors = [row.drug1, row.drug2, row.drug, row.name, row.gene, row.parent, row.metabolite].filter(Boolean).map(stableToken).join('_');
  return `engine_hypothesis_${stableToken(kind)}_${actors || 'gap'}_${hash}`;
}

function priorityFromScore(score = 0, fallback = 'P2') {
  if (score >= 70) return 'P1';
  if (score >= 30) return 'P2';
  return fallback;
}

function makeCandidate(kind, row, details = {}) {
  return {
    candidateId: hypothesisId(kind, row),
    schema: 'diognosis.engine-hypothesis-candidate.v1',
    layer: KNOWLEDGE_LAYERS.ENGINE_HYPOTHESIS,
    candidateKind: kind,
    claimType: 'engine_hypothesis',
    sourceSupportStatus: 'model_only_review_prompt',
    sourceRecords: [],
    sourceTruthStatus: 'model_only_review_prompt',
    priority: details.priority || priorityFromScore(row.score || 0),
    score: row.score || 0,
    drugs: [row.drug1, row.drug2, row.drug, row.name].filter(Boolean),
    genes: [row.gene].filter(Boolean),
    metabolites: [row.metabolite].filter(Boolean),
    pathways: [row.route, row.theme].filter(Boolean),
    reason: details.reason || row.theme || (row.gaps || []).join('; ') || 'Engine coverage gap requires source search and human review.',
    suggestedTarget: details.suggestedTarget || 'review_only',
    targetClaimType: details.targetClaimType || 'coverage_gap',
    searchPreference: details.searchPreference || ['FDA label', 'CPIC/ClinPGx if PGx', 'PubMed clinical PK', 'guideline', 'case report'],
    governance: baseCandidateGovernance(),
    notes: [
      'Generated from local engine/audit coverage. It is not source truth and cannot affect scoring or public warnings.',
    ],
  };
}

const args = parseArgs(process.argv.slice(2));
const report = readJson(args.in, null);
if (!report) throw new Error(`Coverage audit not found: ${args.in}`);

const candidates = [
  ...(report.top_missing_pairs || []).map(row => makeCandidate('missing_interaction_candidate', row, {
    suggestedTarget: 'KNOWN_DDI',
    targetClaimType: 'interaction_event',
    reason: `${row.drug1} + ${row.drug2} appears as a high-priority interaction gap (${row.theme || 'no theme'}).`,
  })),
  ...(report.top_pgx_gaps || []).map(row => makeCandidate('missing_pgx_candidate', row, {
    suggestedTarget: 'GENOTYPE_EFFECTS',
    targetClaimType: 'pgx_effect',
    reason: `${row.gene || 'Gene'}${row.drug ? ` / ${row.drug}` : ''} appears as a PGx coverage gap from ${row.source || 'audit'}.`,
  })),
  ...(report.top_metabolite_gaps || []).map(row => makeCandidate('missing_parent_metabolite_candidate', row, {
    suggestedTarget: 'METAB',
    targetClaimType: 'parent_metabolite_relation',
    reason: `${row.parent || 'Parent'} / ${row.metabolite || 'metabolite'} needs source-linked parent-metabolite review.`,
  })),
  ...(report.top_missing_drugs || []).flatMap(row => (row.gaps || ['coverage gap']).map(gap => makeCandidate('missing_drug_context_candidate', { ...row, theme: gap }, {
    suggestedTarget: /PK/.test(gap) ? 'PK_PARAMS' : /timing|washout/i.test(gap) ? 'WASHOUT_DAYS' : /actor|metabolite/i.test(gap) ? 'METABOLITE_ACTORS' : 'review_only',
    targetClaimType: /PK/.test(gap) ? 'pk_parameter' : /timing|washout/i.test(gap) ? 'washout_timing' : /actor|metabolite/i.test(gap) ? 'metabolite_role' : 'coverage_gap',
    reason: `${row.name} coverage gap: ${gap}.`,
  }))),
]
  .slice(0, Number.isFinite(args.max) ? args.max : 300)
  .sort((a, b) => a.priority.localeCompare(b.priority) || b.score - a.score || a.candidateId.localeCompare(b.candidateId));

const store = {
  schema: CANDIDATE_STORE_SCHEMA,
  store: 'engine_hypotheses',
  layer: KNOWLEDGE_LAYERS.ENGINE_HYPOTHESIS,
  generatedAt: new Date().toISOString(),
  sourceAudit: 'docs/audits/enrichment-coverage-audit.json',
  title: 'Engine hypotheses',
  description: 'Model-only review prompts from Diognosis coverage gaps. Not source truth and not scoring-enabled.',
  totalCandidates: candidates.length,
  candidates,
};

const audit = {
  schema: 'diognosis.engine-hypotheses-audit.v1',
  generatedAt: store.generatedAt,
  totalCandidates: candidates.length,
  priorityCounts: candidates.reduce((acc, item) => {
    acc[item.priority] = (acc[item.priority] || 0) + 1;
    return acc;
  }, {}),
  canAutoPromote: candidates.filter(item => item.governance?.canAutoPromote).length,
  scoringEnabled: candidates.filter(item => item.governance?.canAffectScoring).length,
};

writeJson(OUT_JSON, store);
writeJson(OUT_AUDIT, audit);
writeText(OUT_MD, `# Engine Hypotheses

Generated: ${store.generatedAt}

- Candidates: ${candidates.length}
- P1: ${audit.priorityCounts.P1 || 0}
- P2: ${audit.priorityCounts.P2 || 0}
- P3: ${audit.priorityCounts.P3 || 0}
- Auto-promotable: ${audit.canAutoPromote}
- Scoring-enabled: ${audit.scoringEnabled}

These rows are model-only review prompts. A reviewer must fetch source evidence, verify faithfulness, map actors, and decide whether a curated draft is appropriate.

${markdownTable(['Priority', 'Kind', 'Actors', 'Suggested target', 'Reason'], candidates.slice(0, 80).map(item => [
  item.priority,
  item.candidateKind,
  [...item.drugs, ...item.genes, ...item.metabolites].join(' + ') || 'n/a',
  item.suggestedTarget,
  item.reason,
]))}
`);

console.log(JSON.stringify({ ok: true, candidates: candidates.length, out: OUT_JSON }, null, 2));
