#!/usr/bin/env node
// MedCheck database audit
// Run after `node build.js`; audits the generated bundle data for structural gaps.

import { readFileSync } from 'fs';
import vm from 'vm';

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
  DRUG_DB,
  STUDY_DB,
  METAB,
  METABOLITE_ACTORS,
  ENZYME_ACTORS,
  TRANSPORTER_ACTORS,
  HIGH_IMPACT_METABOLITE_RELATIONS,
  GENOTYPE_METABOLITE_EFFECTS,
  KNOWN_DDI,
  COMBINATION_PRODUCTS,
  TRANSPORTER_DDI,
};`, context);

const {
  DRUG_DB,
  STUDY_DB,
  METAB,
  METABOLITE_ACTORS,
  ENZYME_ACTORS,
  TRANSPORTER_ACTORS,
  HIGH_IMPACT_METABOLITE_RELATIONS,
  GENOTYPE_METABOLITE_EFFECTS,
  KNOWN_DDI,
  COMBINATION_PRODUCTS,
  TRANSPORTER_DDI,
} = context.__AUDIT__;

const drugNames = new Set(DRUG_DB.map(d => d.name));
const drugByName = new Map(DRUG_DB.map(d => [d.name, d]));
const enzymeNames = new Set(Object.keys(ENZYME_ACTORS));
const transporterNames = new Set(Object.keys(TRANSPORTER_ACTORS || {}));
const studyIds = new Set(Object.keys(STUDY_DB));
const report = {
  counts: {
    drugs: DRUG_DB.length,
    studies: studyIds.size,
    metaboliteParents: Object.keys(METAB).length,
    knownDdi: KNOWN_DDI.length,
  },
  errors: [],
  warnings: [],
};

function add(kind, type, message, ref) {
  report[kind].push({ type, message, ref });
}

function checkRefs(refs, owner) {
  for (const ref of refs || []) {
    if (!studyIds.has(ref)) add('errors', 'missing_evidence_ref', `${owner} references missing study ${ref}`, owner);
  }
}

function checkEnzyme(enzyme, owner) {
  if (!enzyme) return;
  for (const part of String(enzyme).split('/')) {
    const normalized = part.trim().replace(/\s*\(.+\)\s*$/, '');
    if (normalized === 'CYP') continue;
    if (/^(UGT|FMO|Renal|Esterase|Hydrolysis|Acid|None|Various|Carbonyl|Gut flora|Spontaneous|SULT|AKR|MAO|NAT|COMT|XO|Aldehyde|FPGS|GHB|SSADH|HSD)/i.test(normalized)) continue;
    if ((/^CYP/.test(normalized) || transporterNames.has(normalized)) &&
      !enzymeNames.has(normalized) &&
      !transporterNames.has(normalized)) {
      add('warnings', 'unknown_enzyme_actor', `${owner} uses ${normalized}, but ENZYME_ACTORS has no actor`, owner);
    } else if (/^CYP/.test(normalized) && !enzymeNames.has(normalized)) {
      add('warnings', 'unknown_enzyme_actor', `${owner} uses ${normalized}, but ENZYME_ACTORS has no actor`, owner);
    }
  }
}

for (const drug of DRUG_DB) {
  const routeSum = (drug.routes || []).reduce((sum, r) => sum + (r.fraction || 0), 0);
  if (routeSum > 1.05) add('warnings', 'route_fraction_sum_gt_1', `${drug.name} route fractions sum to ${routeSum.toFixed(2)}`, drug.name);
  for (const r of drug.routes || []) {
    checkEnzyme(r.enzyme, `${drug.name}.routes`);
    checkRefs(r.evidence?.refs || r.evidenceRefs, `${drug.name}.routes.${r.enzyme}`);
  }
  for (const inh of [...(drug.inh || []), ...(drug.metInh || [])]) checkEnzyme(inh.target, `${drug.name}.inhibition`);
  for (const ind of drug.ind || []) checkEnzyme(ind.target, `${drug.name}.induction`);
}

for (const [parent, metabolites] of Object.entries(METAB)) {
  if (!drugNames.has(parent)) add('warnings', 'metabolite_parent_not_drug', `${parent} has metabolites but is not in DRUG_DB`, parent);
  for (const m of metabolites || []) {
    checkEnzyme(m.e, `${parent} -> ${m.n}`);
    checkRefs(m.evidenceRefs, `${parent} -> ${m.n}`);
  }
}

for (const rel of HIGH_IMPACT_METABOLITE_RELATIONS || []) {
  if (!drugNames.has(rel.parent)) add('errors', 'high_impact_parent_missing', `${rel.parent} missing from DRUG_DB`, rel.parent);
  checkRefs(rel.requiredEvidenceRefs, `HIGH_IMPACT ${rel.parent}/${rel.metaboliteId}`);
}

for (const effect of GENOTYPE_METABOLITE_EFFECTS || []) {
  if (!drugNames.has(effect.parent)) add('errors', 'genotype_effect_parent_missing', `${effect.parent} missing from DRUG_DB`, effect.parent);
  checkEnzyme(effect.enzyme, `GENOTYPE_METABOLITE_EFFECTS ${effect.parent}`);
  checkRefs(effect.evidenceRefs, `GENOTYPE_METABOLITE_EFFECTS ${effect.parent}/${effect.metaboliteId}`);
  const actor = METABOLITE_ACTORS?.[effect.metaboliteId];
  for (const [phenotype, phenotypeEffect] of Object.entries(effect.effects || {})) {
    if (!phenotypeEffect || phenotypeEffect.direction === 'baseline' || phenotypeEffect.direction === 'uncertain') continue;
    if (phenotypeEffect.fold || phenotypeEffect.qualitative) continue;
    const canEstimate = phenotypeEffect.direction === 'decrease' ||
      actor?.routes?.some(r => r.enzyme === effect.enzyme) ||
      actor?.formingEnzyme === effect.enzyme;
    if (!canEstimate) {
      add(
        'warnings',
        'unquantified_metabolite_effect',
        `${effect.parent} -> ${effect.metaboliteName} ${phenotype} has ${phenotypeEffect.direction} without fold or estimable ${effect.enzyme} route`,
        `${effect.parent}/${effect.metaboliteId}/${phenotype}`
      );
    }
  }
}

const renderedMetaboliteGaps = vm.runInContext(`(() => {
  const gaps = [];
  const reset = () => {
    activeStack = [];
    userGenetics = {};
    activeGenotype = {
      CYP2D6: GENOTYPE_PHENOTYPE.NM,
      CYP2C19: GENOTYPE_PHENOTYPE.NM,
      CYP2C9: GENOTYPE_PHENOTYPE.NM,
    };
  };
  for (const effect of GENOTYPE_METABOLITE_EFFECTS || []) {
    for (const [phenotype, phenotypeEffect] of Object.entries(effect.effects || {})) {
      if (!phenotypeEffect || phenotypeEffect.direction === 'baseline' || phenotypeEffect.direction === 'uncertain') continue;
      reset();
      activeStack = [effect.parent];
      activeGenotype[effect.enzyme] = phenotype;
      const card = getGenotypeMetaboliteEffectCards(effect.parent)
        .find(c => c.effect.metaboliteId === effect.metaboliteId && c.geno === phenotype);
      if (!card) {
        gaps.push(effect.parent + ' -> ' + effect.metaboliteName + ' ' + phenotype + ' did not render');
      } else if (!card.phenotypeEffect?.fold && !card.phenotypeEffect?.qualitative) {
        gaps.push(effect.parent + ' -> ' + effect.metaboliteName + ' ' + phenotype + ' rendered without fold');
      } else {
        renderFoldBars();
        const html = document.getElementById('foldBody')?.innerHTML || '';
        const needsBar = !!card.phenotypeEffect?.fold;
        if (!html.includes('fold-metabolite-row') || (needsBar && !html.includes('fold-metabolite-bar'))) {
          gaps.push(effect.parent + ' -> ' + effect.metaboliteName + ' ' + phenotype + ' rendered without a metabolite fold bar');
        }
      }
    }
  }
  reset();
  return gaps;
})()`, context);
for (const gap of renderedMetaboliteGaps) {
  add('errors', 'rendered_metabolite_fold_missing', gap, gap);
}

for (const ddi of KNOWN_DDI || []) {
  for (const name of [ddi.drug1, ddi.drug2]) {
    if (name && !drugNames.has(name)) add('warnings', 'known_ddi_drug_missing', `${name} in KNOWN_DDI is not in DRUG_DB`, `${ddi.drug1}/${ddi.drug2}`);
  }
  checkRefs(ddi.evidenceRefs, `KNOWN_DDI ${ddi.drug1}/${ddi.drug2}`);
}

for (const cp of COMBINATION_PRODUCTS || []) {
  for (const name of cp.drugs || []) {
    if (!drugNames.has(name)) add('warnings', 'combo_drug_missing', `${name} in COMBINATION_PRODUCTS is not in DRUG_DB`, cp.name || cp.drugs.join('/'));
  }
}

for (const t of TRANSPORTER_DDI || []) {
  for (const name of [t.substrate, t.inhibitor]) {
    if (name && name !== 'NSAIDs' && !drugNames.has(name)) add('warnings', 'transporter_drug_missing', `${name} in TRANSPORTER_DDI is not in DRUG_DB`, `${t.substrate}/${t.inhibitor}`);
  }
}

function requireDrug(name, type) {
  const drug = drugByName.get(name);
  if (!drug) add('errors', type, `${name} missing from DRUG_DB`, name);
  return drug;
}

const amphetamine = requireDrug('Amphetamine', 'batch_audit_missing_drug');
if (amphetamine?.brandNames?.some(b => b === 'Vyvanse' || b === 'Elvanse')) {
  add('errors', 'batch_audit_brand_misclassification', 'Vyvanse/Elvanse must not be brandNames for Amphetamine', 'Amphetamine');
}
const lisdexamfetamine = requireDrug('Lisdexamfetamine', 'batch_audit_missing_drug');
if (lisdexamfetamine && (!lisdexamfetamine.prodrug || !(lisdexamfetamine.brandNames || []).includes('Vyvanse'))) {
  add('errors', 'batch_audit_lisdexamfetamine_model', 'Lisdexamfetamine must be a separate prodrug with Vyvanse/Elvanse brands', 'Lisdexamfetamine');
}

for (const name of ['Simvastatin','Lovastatin','Prednisone','Enalapril','Ramipril','Benazepril','Candesartan','Dabigatran','Mycophenolate']) {
  const drug = requireDrug(name, 'batch_audit_missing_drug');
  if (drug && !drug.prodrug) add('errors', 'batch_audit_missing_prodrug_flag', `${name} should have prodrug:true`, name);
}

const requiredDdiPairs = [
  ['Simvastatin','Gemfibrozil'],
  ['Rosuvastatin','Gemfibrozil'],
  ['Dabigatran','Rifampin'],
  ['Apixaban','Rifampin'],
  ['Rivaroxaban','Rifampin'],
  ['Digoxin',"St. John's Wort"],
  ['Digoxin','Rifampin'],
  ['Metformin','Trimethoprim/Sulfamethoxazole'],
  ['Methotrexate','Probenecid'],
  ['Rosuvastatin','Eltrombopag'],
];
for (const [a,b] of requiredDdiPairs) {
  const found = (KNOWN_DDI || []).some(ddi =>
    (ddi.drug1 === a && ddi.drug2 === b) || (ddi.drug1 === b && ddi.drug2 === a)
  );
  if (!found) add('errors', 'batch_audit_missing_ddi_pair', `${a} + ${b} missing from KNOWN_DDI`, `${a}/${b}`);
}

console.log(JSON.stringify(report, null, 2));
if (report.errors.length) process.exit(1);
