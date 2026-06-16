#!/usr/bin/env node
import { loadDiognosisData } from '../enrich/lib/diognosis-source-loader.js';

const args = new Set(process.argv.slice(2));
const check = args.has('--check');
const data = loadDiognosisData();
const adapterId = 'ev_drug_count_expansion_batch';
const adapterEvidence = data.STUDY_DB?.[adapterId] || null;
const batchRows = (data.DRUG_DB || []).filter(drug => (drug.evidenceRefs || []).includes(adapterId));

function lookupKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function graphKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function tableKeys(drug) {
  const name = drug?.name || '';
  const normalized = lookupKey(name);
  return [
    drug?.id,
    name,
    graphKey(name),
    normalized.replace(/\s+/g, '_'),
    normalized.replace(/\s+/g, ''),
  ].filter(Boolean);
}

function hasTableRow(table, drug) {
  return tableKeys(drug).some(key => Object.prototype.hasOwnProperty.call(table || {}, key));
}

function hasBatchRef(row) {
  return (row?.evidenceRefs || []).includes(adapterId);
}

const normalizedNames = (data.DRUG_DB || []).map(drug => lookupKey(drug.name));
const duplicateNames = normalizedNames
  .filter((name, index) => name && normalizedNames.indexOf(name) !== index)
  .slice(0, 25);
const missingRoutes = batchRows.filter(drug => !(drug.routes || []).length);
const missingEvidence = batchRows.filter(drug => !hasBatchRef(drug));
const missingAlternatives = batchRows.filter(drug => !(drug.alts || []).length);
const missingMetabolites = batchRows.filter(drug => !(data.METAB?.[drug.name] || []).length);
const missingPk = batchRows.filter(drug => !hasTableRow(data.PK_PARAMS, drug));
const missingWashout = batchRows.filter(drug => !hasTableRow(data.WASHOUT_DAYS, drug));
const missingDdi = batchRows.filter(drug => !(data.KNOWN_DDI || []).some(row => row.drug1 === drug.name || row.drug2 === drug.name));
const missingTransporter = batchRows.filter(drug =>
  !((data.TRANSPORTER_DDI || []).some(row => row.substrate === drug.name || row.inhibitor === drug.name))
);

const report = {
  ok:(data.DRUG_DB || []).length >= 1500 &&
    batchRows.length >= 500 &&
    (data.KNOWN_DDI || []).length >= 2200 &&
    Object.keys(data.METAB || {}).length >= (data.DRUG_DB || []).length &&
    Object.values(data.METAB || {}).flat().length >= 2500 &&
    Object.keys(data.PK_PARAMS || {}).length >= 1150 &&
    Object.keys(data.WASHOUT_DAYS || {}).length >= 750 &&
    (data.TRANSPORTER_DDI || []).length >= 900 &&
    duplicateNames.length === 0 &&
    missingRoutes.length === 0 &&
    missingEvidence.length === 0 &&
    missingAlternatives.length === 0 &&
    missingMetabolites.length === 0 &&
    missingPk.length === 0 &&
    missingWashout.length === 0 &&
    missingDdi.length === 0 &&
    missingTransporter.length === 0 &&
    !!adapterEvidence &&
    adapterEvidence.reviewRequired === true,
  totals:{
    drugs:(data.DRUG_DB || []).length,
    batchRows:batchRows.length,
    knownDdi:(data.KNOWN_DDI || []).length,
    metaboliteParents:Object.keys(data.METAB || {}).length,
    metaboliteEdges:Object.values(data.METAB || {}).flat().length,
    metaboliteActors:Object.keys(data.METABOLITE_ACTORS || {}).length,
    pkProfiles:Object.keys(data.PK_PARAMS || {}).length,
    washoutRules:Object.keys(data.WASHOUT_DAYS || {}).length,
    phenotypeScores:Object.keys(data.PHENOTYPE_SCORES || {}).length,
    beersFlags:Object.keys(data.BEERS_FLAGS || {}).length,
    transporterRows:(data.TRANSPORTER_DDI || []).length,
    evidenceEntries:Object.keys(data.STUDY_DB || {}).length,
  },
  adapterEvidence:{
    id:adapterId,
    present:!!adapterEvidence,
    reviewRequired:adapterEvidence?.reviewRequired === true,
    verified:adapterEvidence?.verified === true,
  },
  gaps:{
    duplicateNames,
    missingRoutes:missingRoutes.slice(0, 25).map(drug => drug.name),
    missingEvidence:missingEvidence.slice(0, 25).map(drug => drug.name),
    missingAlternatives:missingAlternatives.slice(0, 25).map(drug => drug.name),
    missingMetabolites:missingMetabolites.slice(0, 25).map(drug => drug.name),
    missingPk:missingPk.slice(0, 25).map(drug => drug.name),
    missingWashout:missingWashout.slice(0, 25).map(drug => drug.name),
    missingDdi:missingDdi.slice(0, 25).map(drug => drug.name),
    missingTransporter:missingTransporter.slice(0, 25).map(drug => drug.name),
  },
};

console.log(JSON.stringify(report, null, 2));
if (check && !report.ok) process.exit(1);
