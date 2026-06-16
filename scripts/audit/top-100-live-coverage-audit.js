#!/usr/bin/env node
import { loadDiognosisData } from '../enrich/lib/diognosis-source-loader.js';

const args = new Set(process.argv.slice(2));
const check = args.has('--check');
const json = args.has('--json') || check;

const data = loadDiognosisData();
const top100 = data.TOP100_LIVE_COVERAGE_DRUGS || [];
const evidenceRefs = data.TOP100_LIVE_COVERAGE_EVIDENCE_REFS || [];
const adapterEvidenceId = evidenceRefs[0] || 'ev_top100_live_coverage_adapter';

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

const drugMap = new Map();
for (const drug of data.DRUG_DB || []) {
  for (const name of [drug.name, drug.id, ...(drug.aliases || []), ...(drug.brandNames || []), ...(drug.brands || [])].filter(Boolean)) {
    drugMap.set(lookupKey(name), drug);
  }
}

function getDrug(name) {
  return drugMap.get(lookupKey(name));
}

function tableKeys(drug) {
  const name = drug?.name || '';
  return [
    drug?.id,
    name,
    graphKey(name),
    lookupKey(name).replace(/\s+/g, '_'),
    lookupKey(name).replace(/\s+/g, ''),
  ].filter(Boolean);
}

function hasTableRow(table, drug) {
  return tableKeys(drug).some(key => Object.prototype.hasOwnProperty.call(table || {}, key));
}

function hasEvidenceRef(row) {
  return evidenceRefs.some(ref => (row?.evidenceRefs || []).includes(ref));
}

function directDdiCount(drug) {
  return (data.KNOWN_DDI || []).filter(row => row.drug1 === drug.name || row.drug2 === drug.name).length;
}

function metaboliteRows(drug) {
  return data.METAB?.[drug.name] || [];
}

function hasMetaboliteActor(drug) {
  return Object.values(data.METABOLITE_ACTORS || {}).some(actor => actor?.parentDrug === drug.name);
}

function routeGenes(drug) {
  const genes = [];
  for (const route of drug?.routes || []) {
    const parts = String(route?.enzyme || '').split(/[\/,+]/).map(part => part.trim());
    for (const part of parts) {
      if (data.GENOTYPE_EFFECTS?.[part]) genes.push(part);
    }
  }
  return [...new Set(genes)];
}

function hasPgxRule(drug) {
  const genes = routeGenes(drug);
  if (!genes.length) return null;
  return (data.GENOTYPE_METABOLITE_EFFECTS || []).some(rule =>
    rule?.parent === drug.name && genes.includes(rule.enzyme)
  ) || genes.some(gene => data.GENOTYPE_EFFECTS?.[gene]);
}

function transporterRequired(drug) {
  const routeText = (drug?.routes || []).map(route => route.enzyme).join('/');
  const cls = drug?.cls || '';
  return /P-gp|ABCB1|BCRP|ABCG2|OATP|SLCO|OAT1|OAT3|OCT2|MATE|Renal Cation|Renal Anion/i.test(routeText) ||
    /\bstatin\b|kinase|oncology|immunosuppress|anticoag|opioid antagonist|anticonvulsant/i.test(cls);
}

function hasTransporterCoverage(drug) {
  if (!transporterRequired(drug)) return null;
  const inDdi = (data.TRANSPORTER_DDI || []).some(row => row.substrate === drug.name || row.inhibitor === drug.name);
  const inActor = Object.values(data.TRANSPORTER_ACTORS || {}).some(actor => (actor?.substrates || []).includes(drug.name));
  return inDdi || inActor;
}

function burdenRequired(drug) {
  return /ssri|snri|tca|maoi|antipsychotic|phenothiazine|opioid|benzodiazepine|sedative|hypnotic|anticonvulsant|antiarrhythmic|anticholinergic|antihistamine|nsaid|statin|alpha|parkinson|vmat|muscle relax|psychedelic|QT|bleeding/i
    .test(`${drug?.name || ''} ${drug?.cls || ''} ${JSON.stringify(drug?.props || {})}`);
}

function hasBurdenCoverage(drug) {
  if (!burdenRequired(drug)) return null;
  return hasTableRow(data.PHENOTYPE_SCORES, drug) ||
    hasTableRow(data.BEERS_FLAGS, drug) ||
    hasTableRow(data.ACB_SCORES, drug);
}

function domainStatus(required, live) {
  if (!required) return 'not_applicable';
  return live ? 'live' : 'missing';
}

const duplicateNames = top100.filter((name, index) => top100.indexOf(name) !== index);
const rows = top100.map(name => {
  const drug = getDrug(name);
  if (!drug) {
    return {
      name,
      present:false,
      ddi:'missing',
      metabolites:'missing',
      metaboliteActor:'missing',
      pk:'missing',
      washout:'missing',
      pgx:'missing',
      transporter:'missing',
      burden:'missing',
      gaps:['present'],
    };
  }

  const metab = metaboliteRows(drug);
  const pgx = hasPgxRule(drug);
  const transporter = hasTransporterCoverage(drug);
  const burden = hasBurdenCoverage(drug);
  const statuses = {
    ddi:domainStatus(true, directDdiCount(drug) > 0),
    metabolites:domainStatus(true, metab.length > 0),
    metaboliteActor:domainStatus(true, hasMetaboliteActor(drug)),
    pk:domainStatus(true, hasTableRow(data.PK_PARAMS, drug)),
    washout:domainStatus(true, hasTableRow(data.WASHOUT_DAYS, drug)),
    pgx:domainStatus(pgx !== null, pgx === true),
    transporter:domainStatus(transporter !== null, transporter === true),
    burden:domainStatus(burden !== null, burden === true),
  };
  return {
    name:drug.name,
    present:true,
    class:drug.cls,
    directDdiCount:directDdiCount(drug),
    metaboliteCount:metab.length,
    routeGenes:routeGenes(drug),
    transporterRequired:transporter !== null,
    burdenRequired:burden !== null,
    ...statuses,
    gaps:Object.entries(statuses).filter(([, status]) => status === 'missing').map(([domain]) => domain),
  };
});

const domains = ['ddi', 'metabolites', 'metaboliteActor', 'pk', 'washout', 'pgx', 'transporter', 'burden'];
const summary = Object.fromEntries(domains.map(domain => {
  const requiredRows = rows.filter(row => row[domain] !== 'not_applicable');
  return [domain, {
    required:requiredRows.length,
    live:requiredRows.filter(row => row[domain] === 'live').length,
    missing:requiredRows.filter(row => row[domain] === 'missing').length,
  }];
}));

const adapterEvidence = data.STUDY_DB?.[adapterEvidenceId] || null;
const adapterUse = {
  knownDdi:(data.KNOWN_DDI || []).filter(hasEvidenceRef).length,
  metaboliteParents:Object.values(data.METAB || {}).flat().filter(hasEvidenceRef).length,
  metaboliteActors:Object.values(data.METABOLITE_ACTORS || {}).filter(hasEvidenceRef).length,
  pkProfiles:Object.values(data.PK_PARAMS || {}).filter(hasEvidenceRef).length,
  washoutRules:Object.values(data.WASHOUT_DAYS || {}).filter(hasEvidenceRef).length,
  transporterRows:(data.TRANSPORTER_DDI || []).filter(hasEvidenceRef).length,
};

const failingRows = rows.filter(row => row.gaps.length);
const report = {
  ok:top100.length === 100 && duplicateNames.length === 0 && !!adapterEvidence && adapterEvidence.reviewRequired === true && failingRows.length === 0,
  targetCount:top100.length,
  duplicateNames,
  missingDrugNames:rows.filter(row => !row.present).map(row => row.name),
  adapterEvidence:{
    id:adapterEvidenceId,
    present:!!adapterEvidence,
    reviewRequired:adapterEvidence?.reviewRequired === true,
    verified:adapterEvidence?.verified === true,
  },
  summary,
  adapterUse,
  failingRows,
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Top-100 live coverage: ${report.ok ? 'pass' : 'needs work'}`);
  console.log(`Target drugs: ${report.targetCount}/100`);
  for (const [domain, stats] of Object.entries(summary)) {
    console.log(`${domain}: ${stats.live}/${stats.required} live${stats.missing ? ` (${stats.missing} missing)` : ''}`);
  }
  if (failingRows.length) {
    console.log('');
    for (const row of failingRows.slice(0, 25)) {
      console.log(`${row.name}: ${row.gaps.join(', ')}`);
    }
  }
}

if (check && !report.ok) process.exit(1);
