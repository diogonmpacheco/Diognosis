#!/usr/bin/env node
import { resolve } from 'path';
import { loadMedcheckData, ROOT } from '../enrich/lib/medcheck-source-loader.js';
import { readJson, writeJson, writeText, markdownTable } from '../enrich/lib/enrichment-common.js';

const OUT_JSON = resolve(ROOT, 'docs/audits/cpic-coverage-audit.json');
const OUT_MD = resolve(ROOT, 'docs/audits/cpic-coverage-audit.md');
const STAGED = resolve(ROOT, 'data/enrichment/staged/cpic-staged-records.json');
const check = process.argv.includes('--check');

const data = loadMedcheckData();
const staged = readJson(STAGED, []);
const modeledGenes = new Set(Object.keys(data.GENOTYPE_EFFECTS || {}));
const modeledPairs = new Set();
for (const drug of data.DRUG_DB || []) {
  for (const route of drug.routes || []) modeledPairs.add(`${route.enzyme}|${drug.name}`);
}
for (const row of data.GENOTYPE_METABOLITE_EFFECTS || []) modeledPairs.add(`${row.enzyme}|${row.parent}`);

const stagedPairs = staged.map(record => ({
  id: record.id,
  gene: record.claim?.genes?.[0] || '',
  drug: record.claim?.drugs?.[0] || '',
  claimType: record.claim?.claimType || '',
  matched: modeledPairs.has(`${record.claim?.genes?.[0] || ''}|${record.claim?.drugs?.[0] || ''}`),
}));

const missingGenes = [...new Set(stagedPairs.map(row => row.gene).filter(Boolean))]
  .filter(gene => !modeledGenes.has(gene))
  .sort();
const missingPairs = stagedPairs.filter(row => row.gene && row.drug && !row.matched).slice(0, 50);
const report = {
  generatedAt: new Date().toISOString(),
  source: 'CPIC Data',
  stagedRecords: staged.length,
  modeledGenes: modeledGenes.size,
  stagedPairs: stagedPairs.length,
  missingGenes,
  missingPairs,
  reviewRequired: staged.filter(record => record.governance?.reviewRequired !== false).length,
  canAffectScoring: staged.filter(record => record.governance?.canAffectScoring).length,
};

if (!check) {
  writeJson(OUT_JSON, report);
  writeText(OUT_MD, renderMarkdown(report));
}
if (report.canAffectScoring) throw new Error('CPIC staged records must not affect scoring.');
console.log(JSON.stringify({ ok: true, stagedRecords: report.stagedRecords, missingPairs: report.missingPairs.length, wrote: check ? null : { json: OUT_JSON, markdown: OUT_MD } }, null, 2));

function renderMarkdown(report) {
  const rows = report.missingPairs.slice(0, 20).map(row => [row.gene, row.drug, row.claimType, row.id]);
  return `# CPIC Coverage Audit

Generated: ${report.generatedAt}

- Staged records: ${report.stagedRecords}
- Staged pairs: ${report.stagedPairs}
- Missing genes: ${report.missingGenes.length}
- Missing modeled-pair matches: ${report.missingPairs.length}
- Records that can affect scoring: ${report.canAffectScoring}

## Top Missing Pair Matches

${markdownTable(['Gene', 'Drug', 'Claim', 'Record'], rows.length ? rows : [['none', 'none', 'none', 'none']])}
`;
}
