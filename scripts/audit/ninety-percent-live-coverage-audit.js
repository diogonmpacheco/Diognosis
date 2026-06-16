#!/usr/bin/env node
import { loadDiognosisData } from '../enrich/lib/diognosis-source-loader.js';

const args = new Set(process.argv.slice(2));
const check = args.has('--check');
const THRESHOLD = 0.9;
const data = loadDiognosisData(['src/engine/phenotypeEngine.js']);

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function hasOwn(table, key) {
  return Object.prototype.hasOwnProperty.call(table || {}, key);
}

function hasDrugTableRow(table, drug) {
  const name = drug?.name || '';
  const keys = [
    drug?.id,
    name,
    normalizeKey(name),
    normalizeKey(name).replace(/_/g, ''),
    name.toLowerCase(),
    name.toLowerCase().replace(/\s+/g, '_').replace(/-/g, ''),
    name.toLowerCase().replace(/\s/g, ''),
  ].filter(Boolean);
  return keys.some(key => hasOwn(table, key));
}

function routeText(drug) {
  return (drug?.routes || []).map(route => route.enzyme).join('/');
}

const ddiLiveNames = new Set();
for (const row of data.KNOWN_DDI || []) {
  if (row.drug1) ddiLiveNames.add(row.drug1);
  if (row.drug2) ddiLiveNames.add(row.drug2);
}

const actorParents = new Set();
for (const actor of Object.values(data.METABOLITE_ACTORS || {})) {
  for (const parent of [actor.parentDrug, ...(actor.parentDrugs || [])].filter(Boolean)) actorParents.add(parent);
}

function routeGenes(drug) {
  return [...new Set(
    (drug?.routes || [])
      .flatMap(route => String(route.enzyme || '').split(/[\/,+]/).map(part => part.trim()))
      .filter(gene => data.GENOTYPE_EFFECTS?.[gene])
  )];
}

function pgxRequired(drug) {
  return routeGenes(drug).length > 0 ||
    /prodrug|thiopurine|fluoropyrimidine|statin|warfarin|antidepressant|antipsychotic|opioid|oncology|antiviral|antiretroviral|transplant/i
      .test(`${drug?.name || ''} ${drug?.cls || ''}`);
}

function pgxLive(drug) {
  return (data.GENOTYPE_METABOLITE_EFFECTS || []).some(row => row.parent === drug.name) ||
    routeGenes(drug).some(gene => (data.PHARMGKB_EVIDENCE?.[gene]?.pairs || []).some(pair => pair.drug === drug.name));
}

function transporterRequired(drug) {
  return /P-gp|ABCB1|BCRP|ABCG2|OATP|SLCO|OAT|OCT|MATE|Renal Excretion|renal|statin|kinase|oncology|immunosuppress|anticoag|antiplatelet|antiviral|antiretroviral|diabetes|opioid/i
    .test(`${drug?.name || ''} ${drug?.cls || ''} ${routeText(drug)}`);
}

function transporterLive(drug) {
  return (data.TRANSPORTER_DDI || []).some(row => row.substrate === drug.name || row.inhibitor === drug.name) ||
    Object.values(data.TRANSPORTER_ACTORS || {}).some(actor => (actor.substrates || []).includes(drug.name));
}

function burdenRequired(drug) {
  return /ssri|snri|tca|maoi|antipsychotic|phenothiazine|opioid|benzodiazepine|sedative|hypnotic|anticonvulsant|antiarrhythmic|anticholinergic|antihistamine|nsaid|statin|alpha|parkinson|vmat|muscle relax|psychedelic|anticoag|antiplatelet|doac|direct thrombin|vitamin k antagonist|azole|macrolide|fluoroquinolone|protease inhibitor|antiretroviral|immunosuppress|kinase|oncology|monoclonal antibody|vegf|stimulant|thyroid|ccb|pde5|lama|mood stabilizer|lithium|QT|bleeding/i
    .test(`${drug?.name || ''} ${drug?.cls || ''}`);
}

function beersRequired(drug) {
  return /benzodiazepine|sedative|hypnotic|anticholinergic|antihistamine|tca|antipsychotic|opioid|nsaid|muscle relax|alpha|antiarrhythmic|ssri|snri|parkinson|proton pump|ppi|bladder|antimuscarinic|phenothiazine|barbiturate/i
    .test(`${drug?.name || ''} ${drug?.cls || ''}`);
}

function receptorRequired(drug) {
  return burdenRequired(drug) ||
    !!(drug?.props && (drug.props.serotonergic || drug.props.sedation || drug.props.qtcRisk || drug.props.anticholinergic));
}

function summarize(name, rows, predicate) {
  const live = rows.filter(predicate).length;
  const required = rows.length;
  const target = Math.ceil(required * THRESHOLD);
  const pct = required ? live / required : 1;
  return {
    name,
    live,
    required,
    target,
    missing: Math.max(0, target - live),
    pct: Number((pct * 100).toFixed(1)),
    ok: live >= target,
    sampleMissing: rows.filter(row => !predicate(row)).slice(0, 15).map(row => row.name),
  };
}

const drugs = data.DRUG_DB || [];
const studyValues = Object.values(data.STUDY_DB || {});
const sourceLinkedStudies = studyValues.filter(study =>
  study.pmid ||
  study.doi ||
  study.url ||
  study.type === data.EVIDENCE_TIER?.FDA_LABEL ||
  study.type === data.EVIDENCE_TIER?.GUIDELINE ||
  /label|guideline|dailymed|fda|cpic|clinical|study|pubmed|doi/i.test(String(study.source || ''))
);

const categories = [
  summarize('ddi', drugs, drug => ddiLiveNames.has(drug.name)),
  summarize('metaboliteParents', drugs, drug => Array.isArray(data.METAB?.[drug.name]) && data.METAB[drug.name].length > 0),
  summarize('metaboliteActors', drugs, drug => actorParents.has(drug.name)),
  summarize('pk', drugs, drug => hasDrugTableRow(data.PK_PARAMS, drug)),
  summarize('washout', drugs, drug => hasDrugTableRow(data.WASHOUT_DAYS, drug)),
  summarize('pgx', drugs.filter(pgxRequired), pgxLive),
  summarize('transporter', drugs.filter(transporterRequired), transporterLive),
  summarize('burden', drugs.filter(burdenRequired), drug => hasDrugTableRow(data.PHENOTYPE_SCORES, drug)),
  summarize('beers', drugs.filter(beersRequired), drug => hasDrugTableRow(data.BEERS_FLAGS, drug)),
  summarize('receptor', drugs.filter(receptorRequired), drug => hasDrugTableRow(data.RECEPTOR_SCORES, drug)),
  {
    name:'evidenceSourceLinked',
    live:sourceLinkedStudies.length,
    required:studyValues.length,
    target:Math.ceil(studyValues.length * THRESHOLD),
    missing:Math.max(0, Math.ceil(studyValues.length * THRESHOLD) - sourceLinkedStudies.length),
    pct:studyValues.length ? Number(((sourceLinkedStudies.length / studyValues.length) * 100).toFixed(1)) : 100,
    ok:sourceLinkedStudies.length >= Math.ceil(studyValues.length * THRESHOLD),
    sampleMissing:studyValues.filter(study => !sourceLinkedStudies.includes(study)).slice(0, 15).map(study => study.id),
  },
];

const report = {
  ok: categories.every(category => category.ok),
  threshold: THRESHOLD,
  totals: {
    drugs: drugs.length,
    studies: studyValues.length,
    ddiPairs: (data.KNOWN_DDI || []).length,
    metaboliteEntries: Object.values(data.METAB || {}).flat().length,
    metaboliteActors: Object.keys(data.METABOLITE_ACTORS || {}).length,
    pkProfiles: Object.keys(data.PK_PARAMS || {}).length,
    washoutRules: Object.keys(data.WASHOUT_DAYS || {}).length,
    transporterRows: (data.TRANSPORTER_DDI || []).length,
    phenotypeScores: Object.keys(data.PHENOTYPE_SCORES || {}).length,
    beersFlags: Object.keys(data.BEERS_FLAGS || {}).length,
    receptorScores: Object.keys(data.RECEPTOR_SCORES || {}).length,
  },
  categories:Object.fromEntries(categories.map(category => [category.name, category])),
};

console.log(JSON.stringify(report, null, 2));
if (check && !report.ok) process.exit(1);
