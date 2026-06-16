#!/usr/bin/env node
import { loadDiognosisData } from '../enrich/lib/diognosis-source-loader.js';

const args = new Set(process.argv.slice(2));
const check = args.has('--check');
const data = loadDiognosisData(['src/engine/phenotypeEngine.js']);
const adapterId = 'ev_top100_gold_enrichment_adapter';
const adapterEvidence = data.STUDY_DB?.[adapterId] || null;
const cohort = data.TOP100_LIVE_COVERAGE_DRUGS || [];

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
    String(name).toLowerCase().replace(/\s+/g, '_').replace(/-/g, ''),
    String(name).toLowerCase().replace(/\s/g, ''),
  ].filter(Boolean);
}

function hasTableRow(table, drug, predicate = () => true) {
  return tableKeys(drug).some(key => Object.prototype.hasOwnProperty.call(table || {}, key) && predicate(table[key]));
}

function hasGoldRef(row) {
  return (row?.evidenceRefs || []).includes(adapterId);
}

const drugByName = new Map((data.DRUG_DB || []).map(drug => [drug.name, drug]));
const rows = cohort.map(name => {
  const drug = drugByName.get(name);
  if (!drug) {
    return {
      name,
      present:false,
      gaps:['present'],
    };
  }
  const statuses = {
    ddi:(data.KNOWN_DDI || []).some(row => (row.drug1 === drug.name || row.drug2 === drug.name) && hasGoldRef(row)),
    metabolite:(data.METAB?.[drug.name] || []).some(hasGoldRef),
    metaboliteActor:Object.values(data.METABOLITE_ACTORS || {}).some(actor =>
      (actor?.parentDrug === drug.name || (actor?.parentDrugs || []).includes(drug.name)) && hasGoldRef(actor)
    ),
    pk:hasTableRow(data.PK_PARAMS, drug, hasGoldRef),
    washout:hasTableRow(data.WASHOUT_DAYS, drug, hasGoldRef),
    pgx:(data.GENOTYPE_METABOLITE_EFFECTS || []).some(row => row.parent === drug.name && hasGoldRef(row)),
    transporter:(data.TRANSPORTER_DDI || []).some(row => (row.substrate === drug.name || row.inhibitor === drug.name) && hasGoldRef(row)),
    phenotype:hasTableRow(data.PHENOTYPE_SCORES, drug, hasGoldRef),
    receptor:hasTableRow(data.RECEPTOR_SCORES, drug),
  };
  return {
    name:drug.name,
    present:true,
    ...statuses,
    gaps:Object.entries(statuses).filter(([, live]) => !live).map(([key]) => key),
  };
});

const failingRows = rows.filter(row => !row.present || row.gaps.length);
const duplicateNames = cohort.filter((name, index) => cohort.indexOf(name) !== index);
const directDdiCounts = cohort.map(name => (data.KNOWN_DDI || []).filter(row => row.drug1 === name || row.drug2 === name).length);
const metaboliteCounts = cohort.map(name => (data.METAB?.[name] || []).length);

const report = {
  ok:cohort.length === 100 &&
    duplicateNames.length === 0 &&
    failingRows.length === 0 &&
    Math.min(...directDdiCounts) >= 3 &&
    Math.min(...metaboliteCounts) >= 4 &&
    (data.KNOWN_DDI || []).length >= 2700 &&
    Object.values(data.METAB || {}).flat().length >= 2800 &&
    Object.keys(data.METABOLITE_ACTORS || {}).length >= 2350 &&
    (data.GENOTYPE_METABOLITE_EFFECTS || []).length >= 1200 &&
    (data.TRANSPORTER_DDI || []).length >= 1500 &&
    Object.keys(data.PHENOTYPE_SCORES || {}).length >= 375 &&
    Object.keys(data.RECEPTOR_SCORES || {}).length >= 180 &&
    !!adapterEvidence &&
    adapterEvidence.reviewRequired === true,
  cohortCount:cohort.length,
  duplicateNames,
  totals:{
    knownDdi:(data.KNOWN_DDI || []).length,
    metaboliteEntries:Object.values(data.METAB || {}).flat().length,
    metaboliteActors:Object.keys(data.METABOLITE_ACTORS || {}).length,
    pgxRules:(data.GENOTYPE_METABOLITE_EFFECTS || []).length,
    transporterRows:(data.TRANSPORTER_DDI || []).length,
    pkProfiles:Object.keys(data.PK_PARAMS || {}).length,
    washoutRules:Object.keys(data.WASHOUT_DAYS || {}).length,
    phenotypeScores:Object.keys(data.PHENOTYPE_SCORES || {}).length,
    receptorScores:Object.keys(data.RECEPTOR_SCORES || {}).length,
    evidenceEntries:Object.keys(data.STUDY_DB || {}).length,
    minDirectDdi:Math.min(...directDdiCounts),
    minMetaboliteRows:Math.min(...metaboliteCounts),
  },
  adapterEvidence:{
    id:adapterId,
    present:!!adapterEvidence,
    reviewRequired:adapterEvidence?.reviewRequired === true,
    verified:adapterEvidence?.verified === true,
  },
  summary:{
    ddi:rows.filter(row => row.ddi).length,
    metabolite:rows.filter(row => row.metabolite).length,
    metaboliteActor:rows.filter(row => row.metaboliteActor).length,
    pk:rows.filter(row => row.pk).length,
    washout:rows.filter(row => row.washout).length,
    pgx:rows.filter(row => row.pgx).length,
    transporter:rows.filter(row => row.transporter).length,
    phenotype:rows.filter(row => row.phenotype).length,
    receptor:rows.filter(row => row.receptor).length,
  },
  failingRows:failingRows.slice(0, 25),
};

console.log(JSON.stringify(report, null, 2));
if (check && !report.ok) process.exit(1);
