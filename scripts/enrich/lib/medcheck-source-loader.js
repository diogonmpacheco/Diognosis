import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import vm from 'vm';

export const ROOT = resolve(new URL('../../..', import.meta.url).pathname);

const SOURCE_MODULES = [
  'src/data/constants.js',
  'src/data/rules.js',
  'src/data/drugs.js',
  'src/data/enzymes.js',
  'src/data/metabolites.js',
  'src/data/transporters.js',
  'src/data/actors.js',
  'src/data/pharmacology.js',
  'src/data/evidence.js',
  'src/data/interactions.js',
];

export function loadMedcheckData(extraModules = []) {
  const modules = [...SOURCE_MODULES, ...extraModules];
  const context = { console };
  vm.createContext(context);
  const source = modules
    .filter((file) => existsSync(resolve(ROOT, file)))
    .map((file) => readFileSync(resolve(ROOT, file), 'utf8'))
    .join('\n\n');
  vm.runInContext(`${source}
globalThis.__MEDCHECK_DATA__ = {
  DRUG_DB: typeof DRUG_DB !== "undefined" ? DRUG_DB : [],
  KNOWN_DDI: typeof KNOWN_DDI !== "undefined" ? KNOWN_DDI : [],
  COMBINATION_PRODUCTS: typeof COMBINATION_PRODUCTS !== "undefined" ? COMBINATION_PRODUCTS : [],
  METAB: typeof METAB !== "undefined" ? METAB : {},
  METABOLITE_ACTORS: typeof METABOLITE_ACTORS !== "undefined" ? METABOLITE_ACTORS : {},
  GENOTYPE_EFFECTS: typeof GENOTYPE_EFFECTS !== "undefined" ? GENOTYPE_EFFECTS : {},
  GENOTYPE_RISK_EFFECTS: typeof GENOTYPE_RISK_EFFECTS !== "undefined" ? GENOTYPE_RISK_EFFECTS : {},
  GENOTYPE_METABOLITE_EFFECTS: typeof GENOTYPE_METABOLITE_EFFECTS !== "undefined" ? GENOTYPE_METABOLITE_EFFECTS : [],
  PK_PARAMS: typeof PK_PARAMS !== "undefined" ? PK_PARAMS : {},
  TEMPORAL_PROFILES: typeof TEMPORAL_PROFILES !== "undefined" ? TEMPORAL_PROFILES : {},
  WASHOUT_DAYS: typeof WASHOUT_DAYS !== "undefined" ? WASHOUT_DAYS : {},
  ACB_SCORES: typeof ACB_SCORES !== "undefined" ? ACB_SCORES : {},
  BEERS_FLAGS: typeof BEERS_FLAGS !== "undefined" ? BEERS_FLAGS : {},
  PHENOTYPE_SCORES: typeof PHENOTYPE_SCORES !== "undefined" ? PHENOTYPE_SCORES : {},
  STUDY_DB: typeof STUDY_DB !== "undefined" ? STUDY_DB : {},
  TRANSPORTER_DDI: typeof TRANSPORTER_DDI !== "undefined" ? TRANSPORTER_DDI : [],
  TRANSPORTER_ACTORS: typeof TRANSPORTER_ACTORS !== "undefined" ? TRANSPORTER_ACTORS : {},
  RECEPTOR_ACTORS: typeof RECEPTOR_ACTORS !== "undefined" ? RECEPTOR_ACTORS : {},
  PHENOTYPE_ACTORS: typeof PHENOTYPE_ACTORS !== "undefined" ? PHENOTYPE_ACTORS : {},
  normalizeDrugLookupKey: typeof normalizeDrugLookupKey !== "undefined" ? normalizeDrugLookupKey : null,
  getDrugAliases: typeof getDrugAliases !== "undefined" ? getDrugAliases : null,
};`, context);
  return context.__MEDCHECK_DATA__;
}

export function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function drugAliasMap(drugs = []) {
  const map = new Map();
  for (const drug of drugs) {
    const names = [drug.name, drug.id, drug.cls, ...(drug.aliases || []), ...(drug.brands || [])]
      .filter(Boolean);
    for (const name of names) {
      const key = normalizeName(name);
      if (key && !map.has(key)) map.set(key, drug.name);
    }
  }
  return map;
}

export function readGeneratedConstObject(filePath, constName) {
  if (!existsSync(filePath)) return null;
  const context = { console };
  vm.createContext(context);
  vm.runInContext(`${readFileSync(filePath, 'utf8')}
globalThis.__GENERATED_OBJECT__ = typeof ${constName} !== "undefined" ? ${constName} : null;`, context);
  return context.__GENERATED_OBJECT__;
}

export function severityValue(value) {
  return { critical: 5, severe: 4, moderate: 3, monitor: 2, info: 1 }[String(value || '').toLowerCase()] || 0;
}

export function uniq(values) {
  return [...new Set((values || []).filter(value => value != null && String(value).trim() !== ''))];
}
