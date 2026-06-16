#!/usr/bin/env node
import { loadDiognosisData } from '../enrich/lib/diognosis-source-loader.js';

const args = new Set(process.argv.slice(2));
const check = args.has('--check');
const data = loadDiognosisData();
const adapterId = 'ev_metabolite_expansion_pack_adapter';
const adapterEvidence = data.STUDY_DB?.[adapterId] || null;
const parentMaps = Object.keys(data.METAB || {}).length;
const metaboliteEdges = Object.values(data.METAB || {}).flat().length;
const metaboliteActors = Object.keys(data.METABOLITE_ACTORS || {}).length;
const adapterMetabRows = Object.values(data.METAB || {}).flat().filter(row => (row.evidenceRefs || []).includes(adapterId));
const adapterActors = Object.values(data.METABOLITE_ACTORS || {}).filter(actor => (actor.evidenceRefs || []).includes(adapterId));
const missingParents = (data.DRUG_DB || []).filter(drug => !data.METAB?.[drug.name]).map(drug => drug.name);

const report = {
  ok:parentMaps >= 1000 &&
    metaboliteEdges >= 2000 &&
    metaboliteActors >= 600 &&
    adapterMetabRows.length >= 500 &&
    adapterActors.length >= 500 &&
    missingParents.length === 0 &&
    !!adapterEvidence &&
    adapterEvidence.reviewRequired === true,
  parentMaps,
  metaboliteEdges,
  metaboliteActors,
  adapterMetabRows:adapterMetabRows.length,
  adapterActors:adapterActors.length,
  missingParents:missingParents.slice(0, 25),
  adapterEvidence:{
    id:adapterId,
    present:!!adapterEvidence,
    reviewRequired:adapterEvidence?.reviewRequired === true,
    verified:adapterEvidence?.verified === true,
  },
};

console.log(JSON.stringify(report, null, 2));
if (check && !report.ok) process.exit(1);
