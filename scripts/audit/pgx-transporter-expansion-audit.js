#!/usr/bin/env node
import { loadDiognosisData } from '../enrich/lib/diognosis-source-loader.js';

const args = new Set(process.argv.slice(2));
const check = args.has('--check');
const data = loadDiognosisData();
const adapterId = 'ev_pgx_transporter_expansion_adapter';
const adapterEvidence = data.STUDY_DB?.[adapterId] || null;
const genotypeRules = data.GENOTYPE_METABOLITE_EFFECTS || [];
const transporterRows = data.TRANSPORTER_DDI || [];
const adapterGenotypeRules = genotypeRules.filter(row => (row.evidenceRefs || []).includes(adapterId));
const adapterTransporterRows = transporterRows.filter(row => (row.evidenceRefs || []).includes(adapterId));
const drugNames = new Set((data.DRUG_DB || []).map(drug => drug.name));
const badTransporterRefs = adapterTransporterRows.filter(row =>
  !drugNames.has(row.substrate) ||
  (row.inhibitor !== 'NSAIDs' && !drugNames.has(row.inhibitor))
);

const report = {
  ok:genotypeRules.length >= 500 &&
    transporterRows.length >= 500 &&
    adapterGenotypeRules.length >= 150 &&
    adapterTransporterRows.length >= 200 &&
    badTransporterRefs.length === 0 &&
    !!adapterEvidence &&
    adapterEvidence.reviewRequired === true,
  genotypeMetaboliteRules:genotypeRules.length,
  transporterInteractions:transporterRows.length,
  adapterGenotypeRules:adapterGenotypeRules.length,
  adapterTransporterRows:adapterTransporterRows.length,
  badTransporterRefs:badTransporterRefs.slice(0, 25),
  adapterEvidence:{
    id:adapterId,
    present:!!adapterEvidence,
    reviewRequired:adapterEvidence?.reviewRequired === true,
    verified:adapterEvidence?.verified === true,
  },
};

console.log(JSON.stringify(report, null, 2));
if (check && !report.ok) process.exit(1);
