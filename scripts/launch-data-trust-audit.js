#!/usr/bin/env node
import { readFileSync } from 'fs';
import vm from 'vm';
import { collectStats } from './collect-stats.js';

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
      createElement(){ return { className:'', textContent:'', style:{}, dataset:{} }; },
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
globalThis.__AUDIT__ = {
  DRUG_DB, STUDY_DB, KNOWN_DDI, METAB, METABOLITE_ACTORS, GENOTYPE_EFFECTS,
  GENOTYPE_METABOLITE_EFFECTS, HIGH_IMPACT_METABOLITE_RELATIONS,
  ENZYME_ACTORS, TRANSPORTER_ACTORS, PHARMGKB_EVIDENCE, PK_PARAMS,
  BEERS_FLAGS, MEDCHECK_STATS, EVIDENCE_TIER,
  normalizeDrugLookupKey, getDrugAliases,
};`, context);
  return { data: context.__AUDIT__, elements };
}

function normalized(value, data) {
  if (typeof data.normalizeDrugLookupKey === 'function') return data.normalizeDrugLookupKey(value);
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function pairKey(a, b, data) {
  return [normalized(a, data), normalized(b, data)].sort().join('|');
}

function collectEvidenceRefs(value, path = 'root', out = []) {
  if (!value) return out;
  if (Array.isArray(value)) {
    value.forEach((child, idx) => collectEvidenceRefs(child, `${path}[${idx}]`, out));
    return out;
  }
  if (typeof value !== 'object') return out;
  for (const [key, child] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (key === 'evidenceRefs' || (key === 'refs' && path.endsWith('.evidence'))) {
      (Array.isArray(child) ? child : [child]).filter(Boolean).forEach(ref => out.push({ ref: String(ref), path: nextPath }));
    } else {
      collectEvidenceRefs(child, nextPath, out);
    }
  }
  return out;
}

function hasExternalIdentifier(study) {
  return Boolean(study?.pmid || study?.doi || study?.url);
}

function isRegulatoryLabel(study, tiers) {
  return study?.type === tiers.FDA_LABEL || study?.studyDesign === 'regulatory_label' || /label|dailymed|fda/i.test(`${study?.type || ''} ${study?.source || ''}`);
}

function diffStats(actual, generated) {
  const keys = [
    'drugs', 'studies', 'sourceLinkedStudies', 'professionalReviewedStudies', 'verifiedStudies', 'reviewQueue', 'studiesWithPmid',
    'nonRegulatoryUncited', 'ddiPairs', 'severeDdi', 'moderateDdi', 'mildDdi',
    'genotypeGenes', 'metaboliteParents', 'metaboliteEntries', 'metaboliteActors',
    'pkParams', 'receptorScores', 'beersFlags', 'washoutRules',
  ];
  return keys
    .filter(key => actual[key] !== generated[key])
    .map(key => ({ key, actual: actual[key], generated: generated[key] }));
}

const { data, elements } = loadBundleContext();
const actualStats = collectStats();
const readme = readFileSync('README.md', 'utf8');
const index = readFileSync('index.html', 'utf8');
const studyIds = new Set(Object.keys(data.STUDY_DB || {}));
const publicStudies = Object.values(data.STUDY_DB || {}).filter(study => study.public !== false);

const report = {
  generatedAt: new Date().toISOString(),
  counts: {
    drugs: data.DRUG_DB.length,
    studies: studyIds.size,
    publicStudies: publicStudies.length,
    baselineSourceLinkedStudies: publicStudies.filter(study => study.reviewRequired !== true).length,
    pendingReviewStudies: publicStudies.filter(study => study.reviewRequired === true).length,
    ddiPairs: data.KNOWN_DDI.length,
    severeDdi: data.KNOWN_DDI.filter(ddi => ddi.severity === 'severe' || ddi.severity === 'critical').length,
  },
  checks: {},
  samples: {},
};

const nameOwners = new Map();
const duplicateDrugNames = [];
for (const drug of data.DRUG_DB) {
  const key = normalized(drug.name, data);
  const owner = nameOwners.get(key);
  if (owner) duplicateDrugNames.push({ term: drug.name, owners: [owner, drug.name] });
  else nameOwners.set(key, drug.name);
}

const aliasOwners = new Map();
const duplicateAliases = [];
const brandGenericCollisions = [];
for (const drug of data.DRUG_DB) {
  const terms = new Set([drug.name, drug.id, ...(drug.brandNames || [])].filter(Boolean));
  if (typeof data.getDrugAliases === 'function') {
    for (const alias of data.getDrugAliases(drug) || []) terms.add(alias);
  }
  for (const term of terms) {
    const key = normalized(term, data);
    if (!key) continue;
    const owner = aliasOwners.get(key);
    if (owner && owner !== drug.name) {
      duplicateAliases.push({ term, owners: [owner, drug.name] });
    } else {
      aliasOwners.set(key, drug.name);
    }
    if ((drug.brandNames || []).includes(term)) {
      const genericOwner = nameOwners.get(key);
      if (genericOwner && genericOwner !== drug.name) brandGenericCollisions.push({ brand: term, brandOwner: drug.name, genericOwner });
    }
  }
}

const duplicatePairs = [];
const conflictingDuplicatePairs = [];
const pairs = new Map();
for (const ddi of data.KNOWN_DDI) {
  const key = pairKey(ddi.drug1, ddi.drug2, data);
  const list = pairs.get(key) || [];
  list.push(ddi);
  pairs.set(key, list);
}
for (const [key, list] of pairs.entries()) {
  if (list.length < 2) continue;
  const severities = [...new Set(list.map(ddi => ddi.severity))];
  const entry = { key, count: list.length, severities, labels: list.map(ddi => `${ddi.drug1} + ${ddi.drug2}`) };
  duplicatePairs.push(entry);
  if (severities.length > 1) conflictingDuplicatePairs.push(entry);
}

const severeMissingRefs = data.KNOWN_DDI
  .filter(ddi => (ddi.severity === 'severe' || ddi.severity === 'critical') && !(ddi.evidenceRefs || []).length)
  .map(ddi => ({ pair: `${ddi.drug1} + ${ddi.drug2}`, severity: ddi.severity, confidence: ddi.evidence?.confidence || null }));

const severeOnlyPendingReviewRefs = data.KNOWN_DDI
  .filter(ddi => ddi.severity === 'severe' || ddi.severity === 'critical')
  .filter(ddi => (ddi.evidenceRefs || []).length)
  .filter(ddi => (ddi.evidenceRefs || []).every(ref => data.STUDY_DB?.[ref]?.reviewRequired === true))
  .map(ddi => ({ pair: `${ddi.drug1} + ${ddi.drug2}`, severity: ddi.severity, evidenceRefs: ddi.evidenceRefs }));

const evidenceRefSources = {
  DRUG_DB: data.DRUG_DB,
  KNOWN_DDI: data.KNOWN_DDI,
  METAB: data.METAB,
  METABOLITE_ACTORS: data.METABOLITE_ACTORS,
  GENOTYPE_EFFECTS: data.GENOTYPE_EFFECTS,
  GENOTYPE_METABOLITE_EFFECTS: data.GENOTYPE_METABOLITE_EFFECTS,
  HIGH_IMPACT_METABOLITE_RELATIONS: data.HIGH_IMPACT_METABOLITE_RELATIONS,
  ENZYME_ACTORS: data.ENZYME_ACTORS,
  TRANSPORTER_ACTORS: data.TRANSPORTER_ACTORS,
  PHARMGKB_EVIDENCE: data.PHARMGKB_EVIDENCE,
  PK_PARAMS: data.PK_PARAMS,
};
const missingEvidenceRefs = Object.entries(evidenceRefSources)
  .flatMap(([source, value]) => collectEvidenceRefs(value, source))
  .filter(item => !studyIds.has(item.ref));

const unreviewedButVerified = publicStudies
  .filter(study => study.reviewRequired === true && (study.verified === true || study.reviewStatus === 'verified'))
  .map(study => ({ id: study.id, title: study.title, verified: study.verified, reviewStatus: study.reviewStatus }));

const professionalReviewed = publicStudies
  .filter(study => study.professionalReviewed === true || study.clinicalReviewed === true || ['professional_reviewed', 'clinician_reviewed'].includes(study.reviewStatus))
  .map(study => ({ id: study.id, title: study.title, reviewStatus: study.reviewStatus || null }));

const baselineSourceLinkedNoExternalId = publicStudies
  .filter(study => study.reviewRequired !== true && !hasExternalIdentifier(study) && !isRegulatoryLabel(study, data.EVIDENCE_TIER))
  .map(study => ({ id: study.id, type: study.type, title: study.title }));

const statsMismatches = diffStats(actualStats, data.MEDCHECK_STATS || {});
const readmeMismatches = [
  ['drugs', actualStats.drugs],
  ['studies', actualStats.studies],
  ['studiesWithPmid', actualStats.studiesWithPmid],
  ['sourceLinkedStudies', actualStats.sourceLinkedStudies],
  ['professionalReviewedStudies', actualStats.professionalReviewedStudies],
  ['reviewQueue', actualStats.reviewQueue],
  ['ddiPairs', actualStats.ddiPairs],
  ['severeDdi', actualStats.severeDdi],
  ['moderateDdi', actualStats.moderateDdi],
  ['mildDdi', actualStats.mildDdi],
  ['metaboliteEntries', actualStats.metaboliteEntries],
  ['metaboliteParents', actualStats.metaboliteParents],
  ['metaboliteActors', actualStats.metaboliteActors],
  ['pkParams', actualStats.pkParams],
  ['genotypeGenes', actualStats.genotypeGenes],
  ['receptorScores', actualStats.receptorScores],
  ['beersFlags', actualStats.beersFlags],
  ['washoutRules', actualStats.washoutRules],
].filter(([, value]) => !readme.includes(String(value))).map(([key, value]) => ({ key, value }));
const liveStatsMismatches = diffStats(actualStats, JSON.parse(index.match(/const MEDCHECK_STATS = (\{[\s\S]*?\n\});/)?.[1] || '{}'));

const severeDrugNames = new Set();
for (const ddi of data.KNOWN_DDI) {
  if (ddi.severity === 'severe' || ddi.severity === 'critical') {
    severeDrugNames.add(normalized(ddi.drug1, data));
    severeDrugNames.add(normalized(ddi.drug2, data));
  }
}
for (const [name, diversion] of Object.entries(data.PATHWAY_DIVERSION || {})) {
  if (diversion?.severity === 'high' || diversion?.severity === 'critical') severeDrugNames.add(normalized(name, data));
}
const highRiskMetadataGaps = data.DRUG_DB
  .filter(drug => severeDrugNames.has(normalized(drug.name, data)) || severeDrugNames.has(normalized(drug.id, data)))
  .filter(drug => !drug.cls || !(drug.category || drug.cls) || !Array.isArray(drug.routes))
  .map(drug => ({
    name: drug.name,
    missing: [
      !drug.cls ? 'class' : null,
      !(drug.category || drug.cls) ? 'category/class' : null,
      !Array.isArray(drug.routes) ? 'routes' : null,
    ].filter(Boolean),
  }));

report.checks = {
  duplicateDrugNames: duplicateDrugNames.length,
  duplicateAliases: duplicateAliases.length,
  brandGenericCollisions: brandGenericCollisions.length,
  duplicateDdiPairs: duplicatePairs.length,
  conflictingDuplicateDdiPairs: conflictingDuplicatePairs.length,
  severeDdiMissingEvidenceRefs: severeMissingRefs.length,
  severeDdiOnlyPendingReviewRefs: severeOnlyPendingReviewRefs.length,
  missingEvidenceRefs: missingEvidenceRefs.length,
  baselineSourceLinkedNoExternalId: baselineSourceLinkedNoExternalId.length,
  reviewRequiredPresentedProfessionallyReviewed: unreviewedButVerified.length,
  professionalReviewedEvidenceEntries: professionalReviewed.length,
  generatedStatsMismatches: statsMismatches.length,
  readmeStatsMismatches: readmeMismatches.length,
  liveStatsMismatches: liveStatsMismatches.length,
  highRiskMetadataGaps: highRiskMetadataGaps.length,
};

report.samples = {
  duplicateDrugNames,
  duplicateAliases: duplicateAliases.slice(0, 50),
  brandGenericCollisions,
  duplicatePairs,
  conflictingDuplicatePairs,
  severeMissingRefs: severeMissingRefs.slice(0, 100),
  severeOnlyPendingReviewRefs: severeOnlyPendingReviewRefs.slice(0, 100),
  missingEvidenceRefs: missingEvidenceRefs.slice(0, 100),
  baselineSourceLinkedNoExternalId,
  reviewRequiredPresentedProfessionallyReviewed: unreviewedButVerified,
  professionalReviewed,
  statsMismatches,
  readmeMismatches,
  liveStatsMismatches,
  highRiskMetadataGaps: highRiskMetadataGaps.slice(0, 100),
};

report.reviewQueue = publicStudies
  .filter(study => study.reviewRequired === true)
  .map(study => ({
    id: study.id,
    type: study.type,
    year: study.year,
    title: study.title,
    source: study.source,
    hasExternalIdentifier: hasExternalIdentifier(study),
    verifyNote: study.verifyNote || null,
  }));

const severityRank = { severe: 4, critical: 4, moderate: 3, mild: 2, low: 1 };
const refUseCounts = new Map();
for (const ddi of data.KNOWN_DDI) {
  for (const ref of ddi.evidenceRefs || []) refUseCounts.set(ref, (refUseCounts.get(ref) || 0) + (severityRank[ddi.severity] || 1));
}
report.topReviewPriorities = report.reviewQueue
  .map(study => ({
    id: study.id,
    title: study.title,
    reason: [
      refUseCounts.has(study.id) ? `linked to weighted DDI severity score ${refUseCounts.get(study.id)}` : null,
      !study.hasExternalIdentifier ? 'missing external identifier' : null,
      study.type,
    ].filter(Boolean).join('; '),
    score: (refUseCounts.get(study.id) || 0) + (!study.hasExternalIdentifier ? 10 : 0) + (/label|guideline/i.test(study.type || '') ? 2 : 0),
  }))
  .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
  .slice(0, 25);

console.log(JSON.stringify(report, null, 2));
