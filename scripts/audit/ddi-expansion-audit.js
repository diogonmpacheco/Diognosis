#!/usr/bin/env node
import { loadDiognosisData } from '../enrich/lib/diognosis-source-loader.js';

const args = new Set(process.argv.slice(2));
const check = args.has('--check');
const data = loadDiognosisData();
const adapterId = 'ev_ddi_expansion_pack_adapter';
const adapterRows = (data.KNOWN_DDI || []).filter(row => (row.evidenceRefs || []).includes(adapterId));
const drugNames = new Set((data.DRUG_DB || []).map(drug => drug.name));
const missingDrugRefs = adapterRows.filter(row => !drugNames.has(row.drug1) || !drugNames.has(row.drug2));
const severeMissingRefs = adapterRows.filter(row => row.severity === 'severe' && !(row.evidenceRefs || []).length);
const adapterEvidence = data.STUDY_DB?.[adapterId] || null;

const report = {
  ok:(data.KNOWN_DDI || []).length >= 1500 &&
    adapterRows.length >= 500 &&
    !!adapterEvidence &&
    adapterEvidence.reviewRequired === true &&
    missingDrugRefs.length === 0 &&
    severeMissingRefs.length === 0,
  knownDdi:(data.KNOWN_DDI || []).length,
  expansionRows:adapterRows.length,
  severeExpansionRows:adapterRows.filter(row => row.severity === 'severe').length,
  moderateExpansionRows:adapterRows.filter(row => row.severity === 'moderate').length,
  mildExpansionRows:adapterRows.filter(row => row.severity === 'mild').length,
  adapterEvidence:{
    id:adapterId,
    present:!!adapterEvidence,
    reviewRequired:adapterEvidence?.reviewRequired === true,
    verified:adapterEvidence?.verified === true,
  },
  missingDrugRefs:missingDrugRefs.slice(0, 25),
  severeMissingRefs:severeMissingRefs.slice(0, 25),
};

console.log(JSON.stringify(report, null, 2));
if (check && !report.ok) process.exit(1);
