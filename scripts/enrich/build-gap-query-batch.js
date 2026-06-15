#!/usr/bin/env node
import { existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { ROOT } from './lib/medcheck-source-loader.js';
import { readJson, writeJson } from './lib/enrichment-common.js';

const DEFAULT_IN = resolve(ROOT, 'docs/audits/enrichment-coverage-audit.json');
const DEFAULT_OUT = resolve(ROOT, 'data/enrichment/generated/gap-literature-batch.json');

function parseArgs(argv) {
  const args = { max: 50, in: DEFAULT_IN, out: DEFAULT_OUT };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--max') args.max = Number(argv[++i]);
    else if (arg.startsWith('--max=')) args.max = Number(arg.slice(6));
    else if (arg === '--in') args.in = resolve(ROOT, argv[++i]);
    else if (arg === '--out') args.out = resolve(ROOT, argv[++i]);
  }
  return args;
}

function priorityFromRow(row = {}) {
  if (row.priority) return row.priority;
  if ((row.score || 0) >= 70) return 'P1';
  if ((row.score || 0) >= 30) return 'P2';
  return 'P3';
}

function sourcePreferenceForClaim(claimType = '', suggestedTarget = '') {
  if (/pgx|gene|variant|allele/i.test(`${claimType} ${suggestedTarget}`)) return ['CPIC', 'ClinPGx', 'FDA label', 'PubMed clinical pharmacogenetics'];
  if (/label|contraindication|warning|renal|hepatic|pregnancy|lactation/i.test(claimType)) return ['FDA label', 'DailyMed', 'guideline', 'PubMed'];
  if (/metabolite|moiety|formation|clearance/i.test(claimType)) return ['FDA label', 'clinical PK', 'PubMed', 'review article'];
  if (/pk|washout|timing|temporal/i.test(claimType)) return ['FDA label', 'clinical PK', 'guideline', 'PubMed'];
  return ['FDA label', 'PubMed clinical PK', 'guideline', 'case report'];
}

function normalizeQuery(row) {
  const actors = [
    ...(row.drugs || []),
    ...(row.affectedDrugs || []),
    ...(row.genes || []),
    ...(row.affectedGenes || []),
    ...(row.metabolites || []),
    ...(row.affectedMetabolites || []),
  ].filter(Boolean);
  if (!actors.length) return null;
  const claimType = row.targetClaimType || row.claimType || (row.claimTypes || [])[0] || 'coverage_gap';
  const query = row.query || [
    actors.join(' '),
    /pgx|gene|variant|allele/i.test(claimType) ? 'pharmacogenetics guideline label' :
      /metabolite|moiety|formation|clearance/i.test(claimType) ? 'active metabolite clinical pharmacokinetics' :
      /washout|timing|pk|temporal/i.test(claimType) ? 'half life washout clinical pharmacokinetics' :
      'drug interaction clinical pharmacokinetics label',
  ].join(' ');
  return {
    id: row.candidateId || row.groupedCandidateId || row.id || actors.join(':'),
    priority: priorityFromRow(row),
    query,
    reason: row.reason || row.summary || 'Gap-driven source search candidate.',
    targetClaimType: claimType,
    suggestedTarget: row.suggestedTarget || row.suggestedTargets?.[0] || 'review_only',
    drugs: [...new Set([...(row.drugs || []), ...(row.affectedDrugs || [])])],
    genes: [...new Set([...(row.genes || []), ...(row.affectedGenes || [])])],
    metabolites: [...new Set([...(row.metabolites || []), ...(row.affectedMetabolites || [])])],
    sourcePreference: sourcePreferenceForClaim(claimType, row.suggestedTarget || ''),
    providers: 'pubmed,europepmc,openalex,unpaywall',
    maxResults: row.priority === 'P1' ? 8 : 6,
    relation: actors.join(':'),
    supports: [claimType],
    limit: row.priority === 'P1' ? 8 : 6,
  };
}

function loadCandidateQueries() {
  const out = [];
  const dirs = [
    resolve(ROOT, 'data/enrichment/candidates'),
    resolve(ROOT, 'data/enrichment/review-queue'),
  ];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).filter(file => file.endsWith('.json')).sort()) {
      const data = readJson(join(dir, name), null);
      const rows = data?.candidates || data?.items || [];
      for (const row of rows) {
        const normalized = normalizeQuery(row);
        if (normalized) out.push(normalized);
      }
    }
  }
  return out;
}

function queryForGap(row) {
  if (row.drug1 && row.drug2) {
    return {
      id: `gap_${row.drug1}_${row.drug2}`.replace(/[^a-z0-9_]+/gi, '_').toLowerCase(),
      priority: priorityFromRow(row),
      relation: `${row.drug1}:${row.drug2}`,
      query: `${row.drug1} ${row.drug2} pharmacokinetic interaction`,
      reason: row.theme || 'missing interaction candidate',
      targetClaimType: 'interaction_event',
      drugs: [row.drug1, row.drug2],
      genes: [],
      metabolites: [],
      sourcePreference: sourcePreferenceForClaim('interaction_event'),
      supports: [row.theme || 'gap_candidate'],
      providers: 'pubmed,europepmc,openalex,unpaywall',
      maxResults: 6,
      limit: 6,
    };
  }
  if (row.gene && row.drug) {
    return {
      id: `gap_${row.drug}_${row.gene}`.replace(/[^a-z0-9_]+/gi, '_').toLowerCase(),
      priority: priorityFromRow(row),
      relation: `${row.drug}:${row.gene}`,
      query: `${row.drug} ${row.gene} pharmacogenetics`,
      reason: row.source || 'pgx gap candidate',
      targetClaimType: 'pgx_effect',
      drugs: [row.drug],
      genes: [row.gene],
      metabolites: [],
      sourcePreference: sourcePreferenceForClaim('pgx_effect'),
      supports: ['pgx_gap_candidate'],
      providers: 'pubmed,europepmc,openalex,unpaywall',
      maxResults: 6,
      limit: 6,
    };
  }
  if (row.parent && row.metabolite) {
    return {
      id: `gap_${row.parent}_${row.metabolite}`.replace(/[^a-z0-9_]+/gi, '_').toLowerCase(),
      priority: priorityFromRow(row),
      relation: `${row.parent}:${row.metabolite}`,
      query: `${row.parent} ${row.metabolite} active metabolite CYP UGT`,
      reason: 'metabolite gap candidate',
      targetClaimType: 'parent_metabolite_relation',
      drugs: [row.parent],
      genes: [row.gene].filter(Boolean),
      metabolites: [row.metabolite],
      sourcePreference: sourcePreferenceForClaim('parent_metabolite_relation'),
      supports: ['metabolite_gap_candidate'],
      providers: 'pubmed,europepmc,openalex,unpaywall',
      maxResults: 6,
      limit: 6,
    };
  }
  if (row.name) {
    return {
      id: `gap_${row.name}`.replace(/[^a-z0-9_]+/gi, '_').toLowerCase(),
      priority: priorityFromRow(row),
      relation: row.name,
      query: `${row.name} active metabolite pharmacogenetics FDA label`,
      reason: (row.gaps || []).join('; ') || 'drug gap candidate',
      targetClaimType: 'coverage_gap',
      drugs: [row.name],
      genes: [],
      metabolites: [],
      sourcePreference: sourcePreferenceForClaim('coverage_gap'),
      supports: ['drug_gap_candidate'],
      providers: 'pubmed,europepmc,openalex,unpaywall',
      maxResults: 6,
      limit: 6,
    };
  }
  return null;
}

const args = parseArgs(process.argv.slice(2));
const report = readJson(args.in, null);
if (!report) throw new Error(`Coverage audit not found: ${args.in}`);
const candidates = [
  ...loadCandidateQueries(),
  ...(report.top_missing_pairs || []),
  ...(report.top_pgx_gaps || []),
  ...(report.top_metabolite_gaps || []),
  ...(report.top_missing_drugs || []),
].map(row => row.query ? row : queryForGap(row)).filter(Boolean);
const seen = new Set();
const queries = candidates
  .sort((a, b) => String(a.priority || 'P3').localeCompare(String(b.priority || 'P3')) || a.query.localeCompare(b.query))
  .filter(row => {
    const key = `${row.targetClaimType}|${row.query}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .slice(0, Number.isFinite(args.max) ? args.max : 50);
const batch = {
  schema: 'diognosis.gap-literature-batch.v2',
  generatedAt: new Date().toISOString(),
  sourceAudit: 'docs/audits/enrichment-coverage-audit.json',
  description: 'Gap- and candidate-driven legal literature discovery candidates. Metadata-only; no auto-promotion.',
  queries,
};
writeJson(args.out, batch);
console.log(JSON.stringify({ ok: true, queries: queries.length, out: args.out }, null, 2));
