#!/usr/bin/env node
// MedCheck Engine validation harness
// Non-mutating: reports provenance/reference gaps without editing source data.

import { readFileSync } from 'fs';
import vm from 'vm';

const strict = process.argv.includes('--strict');

function loadBundleContext() {
  const html = readFileSync('index.html', 'utf8');
  const match = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/);
  if (!match) throw new Error('Could not find generated bundle in index.html. Run node build.js first.');

  const elements = {};
  const context = {
    console,
    document: {
      getElementById(id) {
        return elements[id] || (elements[id] = {
          innerHTML: '', textContent: '', style: {},
          classList: { add(){}, remove(){}, toggle(){} },
          nextElementSibling: { classList: { toggle(){} } },
        });
      },
      addEventListener(){},
      querySelector(){ return null; },
      querySelectorAll(){ return []; },
      createElement(){ return { className:'', textContent:'', style:{} }; },
    },
    window: { addEventListener(){}, location: { search: '' }, history: { replaceState(){} } },
    localStorage: { getItem(){ return null; }, setItem(){} },
    navigator: { userAgent: '' },
    d3: undefined,
    setTimeout(){},
    clearTimeout(){},
  };
  vm.createContext(context);
  vm.runInContext(`${match[1]}
globalThis.__VALIDATE__ = {
  DRUG_DB, STUDY_DB, KNOWN_DDI, METAB, METABOLITE_ACTORS, GENOTYPE_EFFECTS,
  GENOTYPE_RISK_EFFECTS, GENOTYPE_RISK_STATUS,
  GENOTYPE_METABOLITE_EFFECTS, HIGH_IMPACT_METABOLITE_RELATIONS,
  ENZYME_ACTORS, TRANSPORTER_ACTORS, TRANSPORTER_DDI, PHARMGKB_EVIDENCE,
  FOOD_ACTORS, ENDOGENOUS_ACTORS, RECEPTOR_ACTORS, PHENOTYPE_ACTORS, EVIDENCE_TIER,
  resolveUrlDrugName, normalizeDrugLookupKey, getDrugAliases,
  normalizePharmGxGene, normalizeUrlPhenotype,
};`, context);
  return context.__VALIDATE__;
}

function collectPmids(value, out = new Set()) {
  if (!value) return out;
  if (Array.isArray(value)) {
    value.forEach(v => collectPmids(v, out));
    return out;
  }
  if (typeof value !== 'object') return out;
  for (const [key, child] of Object.entries(value)) {
    if (key.toLowerCase() === 'pmid' || key.toLowerCase() === 'pmids') {
      (Array.isArray(child) ? child : [child]).filter(Boolean).forEach(p => out.add(String(p)));
    } else {
      collectPmids(child, out);
    }
  }
  return out;
}

function evidenceRefsExist(refs, studyIds) {
  return (refs || []).filter(ref => !studyIds.has(ref));
}

const data = loadBundleContext();
const ledger = JSON.parse(readFileSync('scripts/reference-snapshots/evidence-ledger.json', 'utf8'));
const ledgerPmids = new Set((ledger.pmids || []).map(String));
const studyIds = new Set(Object.keys(data.STUDY_DB || {}));
const allPmids = collectPmids({
  STUDY_DB: data.STUDY_DB,
  KNOWN_DDI: data.KNOWN_DDI,
  METAB: data.METAB,
  METABOLITE_ACTORS: data.METABOLITE_ACTORS,
  DRUG_DB: data.DRUG_DB,
});

const report = {
  mode: strict ? 'strict' : 'report',
  counts: {
    drugs: data.DRUG_DB.length,
    studies: studyIds.size,
    pmidsInCode: allPmids.size,
    pmidsInLedger: ledgerPmids.size,
  },
  errors: [],
  warnings: [],
  info: [],
};

function add(kind, type, message, ref) {
  report[kind].push({ type, message, ref });
}

for (const pmid of allPmids) {
  if (!ledgerPmids.has(pmid)) {
    add('warnings', 'pmid_not_in_retrieval_ledger', `PMID ${pmid} appears in code but not in the local retrieval ledger`, pmid);
  }
}

const pendingProfessionalReviewIds = [];
for (const [id, study] of Object.entries(data.STUDY_DB || {})) {
  const professionallyReviewed =
    study.professionalReviewed === true ||
    study.clinicalReviewed === true ||
    study.reviewStatus === 'professional_reviewed' ||
    study.reviewStatus === 'clinician_reviewed';
  if (study.verified === true) {
    add('errors', 'legacy_verified_flag', `${id} uses deprecated verified:true; use professional review fields only after sign-off`, id);
  }
  if (!professionallyReviewed) pendingProfessionalReviewIds.push(id);
  if (!study.pmid && !study.doi && !study.url) {
    add('warnings', 'study_without_external_identifier', `${id} lacks PMID, DOI, and URL`, id);
  }
}
if (pendingProfessionalReviewIds.length) {
  add('info', 'studies_pending_professional_review', `${pendingProfessionalReviewIds.length} studies are pending professional review`, pendingProfessionalReviewIds.length);
}

for (const ddi of data.KNOWN_DDI || []) {
  const missingRefs = evidenceRefsExist(ddi.evidenceRefs || [], studyIds);
  for (const ref of missingRefs) add('errors', 'missing_ddi_evidence_ref', `${ddi.drug1}+${ddi.drug2} references missing study ${ref}`, `${ddi.drug1}/${ddi.drug2}`);
  if (ddi.severity === 'severe' && !(ddi.evidenceRefs || []).length && ddi.evidence?.confidence !== 'high') {
    add('warnings', 'severe_ddi_weak_provenance', `${ddi.drug1}+${ddi.drug2} is severe without linked evidence refs`, `${ddi.drug1}/${ddi.drug2}`);
  }
}

function normalizedKey(value) {
  if (typeof data.normalizeDrugLookupKey === 'function') return data.normalizeDrugLookupKey(value);
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function aliasTermsForDrug(drug) {
  const terms = new Set([
    drug.name,
    drug.id,
    ...(drug.brandNames || []),
  ].filter(Boolean));
  if (typeof data.getDrugAliases === 'function') {
    for (const term of data.getDrugAliases(drug) || []) terms.add(term);
  }
  return [...terms];
}

const exactNames = new Map();
for (const drug of data.DRUG_DB || []) {
  const key = normalizedKey(drug.name);
  if (exactNames.has(key)) {
    add('errors', 'duplicate_drug_name', `${drug.name} duplicates ${exactNames.get(key)} after normalization`, drug.name);
  } else {
    exactNames.set(key, drug.name);
  }
}

const aliasOwners = new Map();
for (const drug of data.DRUG_DB || []) {
  for (const term of aliasTermsForDrug(drug)) {
    const key = normalizedKey(term);
    if (!key) continue;
    const owner = aliasOwners.get(key);
    if (owner && owner !== drug.name) {
      add('errors', 'duplicate_drug_alias', `"${term}" maps to both ${owner} and ${drug.name}`, term);
    } else {
      aliasOwners.set(key, drug.name);
    }
  }
}

const linkSources = [
  ['README.md', readFileSync('README.md', 'utf8')],
  ['medication-classes.html', readFileSync('medication-classes.html', 'utf8')],
  ['medication-class-examples.html', readFileSync('medication-class-examples.html', 'utf8')],
  ['data-views.html', readFileSync('data-views.html', 'utf8')],
];
const savedLinkPattern = /https:\/\/diogonmpacheco\.github\.io\/PharmTrace\/index\.html\?[^)\s"']+|\.\/index\.html\?[^"\s']+/g;
for (const [source, text] of linkSources) {
  for (const match of text.matchAll(savedLinkPattern)) {
    const raw = match[0].replace(/\)$/g, '');
    const url = new URL(raw, 'https://diogonmpacheco.github.io/PharmTrace/');
    const substances = url.searchParams.get('substances') || url.searchParams.get('drugs') || url.searchParams.get('medications');
    if (!substances) continue;
    for (const token of substances.split(',').map(s => s.trim()).filter(Boolean)) {
      const resolved = data.resolveUrlDrugName(token);
      if (!resolved) {
        add('errors', 'saved_link_unresolved_substance', `${source} link ${raw} cannot resolve substance "${token}"`, `${source}:${token}`);
      }
    }
    const genotypes = url.searchParams.getAll('genotype');
    for (const genotype of genotypes) {
      for (const pair of genotype.split(/[;,]/).filter(Boolean)) {
        const sep = pair.lastIndexOf(':');
        const rawGene = sep >= 0 ? pair.slice(0, sep).trim() : pair.trim();
        const rawPhenotype = sep >= 0 ? pair.slice(sep + 1).trim() : '';
        const gene = rawGene && typeof data.normalizePharmGxGene === 'function'
          ? (data.normalizePharmGxGene(rawGene) || rawGene.toUpperCase())
          : (rawGene ? rawGene.toUpperCase() : '');
        const parsed = typeof data.normalizeUrlPhenotype === 'function'
          ? data.normalizeUrlPhenotype(gene, rawPhenotype)
          : { gene, phenotype:rawPhenotype };
        const resolvesMetabolismPhenotype = !!(gene && parsed?.phenotype && data.GENOTYPE_EFFECTS[gene]?.[parsed.phenotype]);
        const resolvesRiskStatus = !!(gene && parsed?.status && data.GENOTYPE_RISK_EFFECTS?.[gene]?.effects?.[parsed.status]);
        if (!resolvesMetabolismPhenotype && !resolvesRiskStatus) {
          add('errors', 'saved_link_unresolved_genotype', `${source} link ${raw} cannot resolve genotype "${pair}"`, `${source}:${pair}`);
        }
      }
    }
  }
}

const knownDataViewConcepts = new Set([
  'NSAIDs',
  'Estradiol / endogenous estrogens',
  'CYP3A oncology substrates',
]);
const actorNames = new Set();
const metaboliteNames = new Set();
const externalActorNames = new Set();
function addEntityAlias(set, value) {
  if (!value) return;
  set.add(normalizedKey(value));
  set.add(normalizedKey(String(value).replace(/\s*\([^)]*\)/g, '').trim()));
}
for (const map of [
  data.FOOD_ACTORS,
  data.ENDOGENOUS_ACTORS,
  data.RECEPTOR_ACTORS,
  data.PHENOTYPE_ACTORS,
  data.TRANSPORTER_ACTORS,
  data.METABOLITE_ACTORS,
].filter(Boolean)) {
  for (const actor of Object.values(map)) {
    for (const term of [actor.name, actor.id].filter(Boolean)) addEntityAlias(actorNames, term);
    for (const name of actor.substrates || []) addEntityAlias(externalActorNames, name);
    for (const item of actor.inhibitors || []) addEntityAlias(externalActorNames, item.name);
    for (const item of actor.inducers || []) addEntityAlias(externalActorNames, item.name);
  }
}
for (const entries of Object.values(data.METAB || {})) {
  for (const item of entries || []) addEntityAlias(metaboliteNames, item.n);
}
function dataViewEntityResolves(name) {
  if (!name || knownDataViewConcepts.has(name)) return true;
  if (data.resolveUrlDrugName(name)) return true;
  const strippedName = String(name).replace(/\s*\([^)]*\)/g, '').trim();
  if (strippedName && strippedName !== name && data.resolveUrlDrugName(strippedName)) return true;
  const key = normalizedKey(name);
  return actorNames.has(key) || metaboliteNames.has(key) || externalActorNames.has(key);
}
const dataViewNames = new Set();
for (const entry of Object.values(data.PHARMGKB_EVIDENCE || {})) {
  for (const pair of entry.pairs || []) dataViewNames.add(pair.drug);
}
for (const ddi of data.KNOWN_DDI || []) {
  dataViewNames.add(ddi.drug1);
  dataViewNames.add(ddi.drug2);
}
for (const ddi of data.TRANSPORTER_DDI || []) {
  dataViewNames.add(ddi.substrate);
  dataViewNames.add(ddi.inhibitor);
}
for (const map of [
  data.FOOD_ACTORS,
  data.ENDOGENOUS_ACTORS,
  data.RECEPTOR_ACTORS,
  data.PHENOTYPE_ACTORS,
  data.TRANSPORTER_ACTORS,
].filter(Boolean)) {
  for (const actor of Object.values(map)) {
    for (const route of actor.routes || []) dataViewNames.add(actor.name || actor.id);
    for (const item of actor.inh || []) dataViewNames.add(actor.name || actor.id);
    for (const item of actor.ind || []) dataViewNames.add(actor.name || actor.id);
    for (const name of actor.substrates || []) dataViewNames.add(name);
    for (const item of actor.inhibitors || []) dataViewNames.add(item.name);
    for (const item of actor.inducers || []) dataViewNames.add(item.name);
  }
}
for (const parent of Object.keys(data.METAB || {})) dataViewNames.add(parent);
for (const item of data.GENOTYPE_METABOLITE_EFFECTS || []) dataViewNames.add(item.parent);
for (const name of [...dataViewNames].sort()) {
  if (!dataViewEntityResolves(name)) {
    add('errors', 'data_view_unresolved_entity', `data-views generated entity "${name}" is not a resolvable substance, actor, or approved concept`, name);
  }
}

for (const [metId, actor] of Object.entries(data.METABOLITE_ACTORS || {})) {
  if (!actor.active) continue;
  const actorRefs = actor.evidenceRefs || [];
  for (const route of actor.routes || []) {
    const refs = route.evidenceRefs || route.evidence?.refs || actorRefs;
    if (!refs || !refs.length) {
      add('warnings', 'active_metabolite_route_without_refs', `${actor.name || metId} ${route.enzyme} route lacks evidenceRefs`, metId);
    }
    for (const ref of evidenceRefsExist(refs || [], studyIds)) {
      add('errors', 'missing_metabolite_route_ref', `${actor.name || metId} route references missing study ${ref}`, metId);
    }
    if (route.evidence?.confidence === 'low' && route.severity === 'severe') {
      add('errors', 'low_confidence_route_marked_severe', `${actor.name || metId} ${route.enzyme} route is low confidence but severe`, metId);
    }
  }
  for (const inh of actor.inh || []) {
    const refs = inh.evidenceRefs || inh.evidence?.refs || actorRefs;
    if (!refs || !refs.length) {
      add('warnings', 'active_metabolite_inhibition_without_refs', `${actor.name || metId} inhibition of ${inh.target} lacks evidenceRefs`, metId);
    }
    for (const ref of evidenceRefsExist(refs || [], studyIds)) {
      add('errors', 'missing_metabolite_inhibition_ref', `${actor.name || metId} inhibition references missing study ${ref}`, metId);
    }
  }
}

const reference = (() => {
  try {
    return JSON.parse(readFileSync('scripts/reference-snapshots/pharmgx-reference.json', 'utf8'));
  } catch {
    return null;
  }
})();

if (!reference) {
  add('info', 'pharmgx_reference_missing', 'No local PharmGKB/CPIC reference snapshot found; genotype diff skipped', 'scripts/reference-snapshots/pharmgx-reference.json');
} else {
  for (const [enzyme, phenos] of Object.entries(reference.GENOTYPE_EFFECTS || {})) {
    if (!data.GENOTYPE_EFFECTS[enzyme]) {
      add('warnings', 'reference_enzyme_missing_in_medcheck', `${enzyme} exists in reference but not MedCheck Engine`, enzyme);
      continue;
    }
    for (const [phenotype, refEffect] of Object.entries(phenos || {})) {
      const local = data.GENOTYPE_EFFECTS[enzyme][phenotype];
      if (!local) {
        add('warnings', 'reference_phenotype_missing_in_medcheck', `${enzyme}/${phenotype} exists in reference but not MedCheck Engine`, `${enzyme}/${phenotype}`);
        continue;
      }
      const tolerance = refEffect.tolerance || 0.25;
      if (typeof refEffect.auc_fold === 'number' && Math.abs((local.auc_fold || 0) - refEffect.auc_fold) > tolerance) {
        add('warnings', 'genotype_auc_fold_delta', `${enzyme}/${phenotype} local ${local.auc_fold} vs reference ${refEffect.auc_fold}`, `${enzyme}/${phenotype}`);
      }
    }
  }
}

console.log(JSON.stringify(report, null, 2));

if (report.errors.length || (strict && report.warnings.length)) {
  process.exit(1);
}
