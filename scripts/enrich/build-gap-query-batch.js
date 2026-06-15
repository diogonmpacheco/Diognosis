#!/usr/bin/env node
import { resolve } from 'path';
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

function queryForGap(row) {
  if (row.drug1 && row.drug2) {
    return {
      relation: `${row.drug1}:${row.drug2}`,
      query: `${row.drug1} ${row.drug2} pharmacokinetic interaction`,
      supports: [row.theme || 'gap_candidate'],
      providers: 'pubmed,europepmc,openalex,unpaywall',
      limit: 6,
    };
  }
  if (row.gene && row.drug) {
    return {
      relation: `${row.drug}:${row.gene}`,
      query: `${row.drug} ${row.gene} pharmacogenetics`,
      supports: ['pgx_gap_candidate'],
      providers: 'pubmed,europepmc,openalex,unpaywall',
      limit: 6,
    };
  }
  if (row.parent && row.metabolite) {
    return {
      relation: `${row.parent}:${row.metabolite}`,
      query: `${row.parent} ${row.metabolite} active metabolite CYP UGT`,
      supports: ['metabolite_gap_candidate'],
      providers: 'pubmed,europepmc,openalex,unpaywall',
      limit: 6,
    };
  }
  if (row.name) {
    return {
      relation: row.name,
      query: `${row.name} active metabolite pharmacogenetics FDA label`,
      supports: ['drug_gap_candidate'],
      providers: 'pubmed,europepmc,openalex,unpaywall',
      limit: 6,
    };
  }
  return null;
}

const args = parseArgs(process.argv.slice(2));
const report = readJson(args.in, null);
if (!report) throw new Error(`Coverage audit not found: ${args.in}`);
const candidates = [
  ...(report.top_missing_pairs || []),
  ...(report.top_pgx_gaps || []),
  ...(report.top_metabolite_gaps || []),
  ...(report.top_missing_drugs || []),
].map(queryForGap).filter(Boolean).slice(0, Number.isFinite(args.max) ? args.max : 50);
const batch = {
  schema: 'diognosis.gap-literature-batch.v1',
  generatedAt: new Date().toISOString(),
  sourceAudit: 'docs/audits/enrichment-coverage-audit.json',
  description: 'Gap-driven legal literature discovery candidates. Metadata-only; no auto-promotion.',
  queries: candidates,
};
writeJson(args.out, batch);
console.log(JSON.stringify({ ok: true, queries: candidates.length, out: args.out }, null, 2));
