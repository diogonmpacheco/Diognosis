#!/usr/bin/env node
import { resolve } from 'path';
import { loadDiognosisData, ROOT } from '../enrich/lib/diognosis-source-loader.js';
import { markdownTable, readJson, writeJson, writeText } from '../enrich/lib/enrichment-common.js';

const OUT_JSON = resolve(ROOT, 'docs/audits/clinpgx-coverage-audit.json');
const OUT_MD = resolve(ROOT, 'docs/audits/clinpgx-coverage-audit.md');
const STAGED = resolve(ROOT, 'data/enrichment/staged/clinpgx-staged-records.json');
const check = process.argv.includes('--check');

const data = loadDiognosisData();
const staged = readJson(STAGED, []);
const metadata = readJson(resolve(ROOT, 'data/enrichment/snapshots/clinpgx-snapshot-metadata.json'), {});
const modeledGenes = new Set(Object.keys(data.GENOTYPE_EFFECTS || {}));
const modeledDrugs = new Set((data.DRUG_DB || []).map(drug => drug.name));
const unsupportedGenes = [...new Set(staged.flatMap(record => record.claim?.genes || []))]
  .filter(gene => gene && !modeledGenes.has(gene))
  .sort();
const unmatchedDrugs = staged.flatMap(record => record.mapping?.unmatchedDrugs || []).filter(Boolean);
const missingEvidenceRefs = staged
  .filter(record => (record.mapping?.matchedDiognosisDrugs || []).length && !(record.mapping?.matchedEvidenceRefs || []).length)
  .slice(0, 50)
  .map(record => ({
    id: record.id,
    genes: record.claim?.genes || [],
    drugs: record.claim?.drugs || [],
    claimType: record.claim?.claimType || '',
  }));

const report = {
  generatedAt: new Date().toISOString(),
  source: 'ClinPGx',
  mode: metadata.mode || 'unknown',
  directFetchedRecords: metadata.directFetchedRecords || 0,
  openTargetsDerivedRecords: metadata.openTargetsDerivedRecords || 0,
  rateLimitEvents: metadata.rateLimitEvents || 0,
  stagedRecords: staged.length,
  uniqueGenes: [...new Set(staged.flatMap(record => record.claim?.genes || []))].length,
  uniqueDrugs: [...new Set(staged.flatMap(record => record.claim?.drugs || []))].filter(drug => modeledDrugs.has(drug)).length,
  unsupportedGenes,
  unmatchedDrugNames: [...new Set(unmatchedDrugs)].slice(0, 50),
  missingEvidenceRefs,
  reviewRequired: staged.filter(record => record.governance?.reviewRequired !== false).length,
  canAffectScoring: staged.filter(record => record.governance?.canAffectScoring).length,
};

if (!check) {
  writeJson(OUT_JSON, report);
  writeText(OUT_MD, renderMarkdown(report));
}
if (report.canAffectScoring) throw new Error('ClinPGx staged records must not affect scoring.');
console.log(JSON.stringify({ ok: true, stagedRecords: report.stagedRecords, unsupportedGenes: report.unsupportedGenes.length, missingEvidenceRefs: report.missingEvidenceRefs.length, wrote: check ? null : { json: OUT_JSON, markdown: OUT_MD } }, null, 2));

function renderMarkdown(report) {
  const rows = report.missingEvidenceRefs.slice(0, 20).map(row => [
    row.genes.join(', ') || 'unknown',
    row.drugs.join(', ') || 'unknown',
    row.claimType,
    row.id,
  ]);
  return `# ClinPGx Coverage Audit

Generated: ${report.generatedAt}

- Staged records: ${report.stagedRecords}
- Mode: ${report.mode}
- Direct fetched records: ${report.directFetchedRecords}
- ClinPGx/Open Targets derived records: ${report.openTargetsDerivedRecords}
- Rate-limit events: ${report.rateLimitEvents}
- Unique genes: ${report.uniqueGenes}
- Unique matched drugs: ${report.uniqueDrugs}
- Unsupported genes: ${report.unsupportedGenes.length}
- Unmatched drug names/IDs: ${report.unmatchedDrugNames.length}
- Records that can affect scoring: ${report.canAffectScoring}

## Top Matched Records Missing Evidence Refs

${markdownTable(['Gene', 'Drug', 'Claim', 'Record'], rows.length ? rows : [['none', 'none', 'none', 'none']])}
`;
}
