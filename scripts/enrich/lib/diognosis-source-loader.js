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
  'src/data/sourceSpecificPromotions.js',
  'src/data/generatedPendingReviewEnrichment.js',
  'src/data/generatedPendingCoreEnrichment.js',
];

export function loadDiognosisData(extraModules = []) {
  const modules = [...SOURCE_MODULES, ...extraModules];
  const context = { console };
  vm.createContext(context);
  const source = modules
    .filter((file) => existsSync(resolve(ROOT, file)))
    .map((file) => readFileSync(resolve(ROOT, file), 'utf8'))
    .join('\n\n');
  vm.runInContext(`${source}
globalThis.__DIOGNOSIS_DATA__ = {
  DRUG_DB: typeof DRUG_DB !== "undefined" ? DRUG_DB : [],
  KNOWN_DDI: typeof KNOWN_DDI !== "undefined" ? KNOWN_DDI : [],
  COMBINATION_PRODUCTS: typeof COMBINATION_PRODUCTS !== "undefined" ? COMBINATION_PRODUCTS : [],
  METAB: typeof METAB !== "undefined" ? METAB : {},
  METABOLITE_ACTORS: typeof METABOLITE_ACTORS !== "undefined" ? METABOLITE_ACTORS : {},
  GENE_ENZYMES: typeof GENE_ENZYMES !== "undefined" ? GENE_ENZYMES : {},
  GENOTYPE_EFFECTS: typeof GENOTYPE_EFFECTS !== "undefined" ? GENOTYPE_EFFECTS : {},
  GENOTYPE_RISK_EFFECTS: typeof GENOTYPE_RISK_EFFECTS !== "undefined" ? GENOTYPE_RISK_EFFECTS : {},
  GENOTYPE_METABOLITE_EFFECTS: typeof GENOTYPE_METABOLITE_EFFECTS !== "undefined" ? GENOTYPE_METABOLITE_EFFECTS : [],
  PHARMGKB_EVIDENCE: typeof PHARMGKB_EVIDENCE !== "undefined" ? PHARMGKB_EVIDENCE : {},
  PK_PARAMS: typeof PK_PARAMS !== "undefined" ? PK_PARAMS : {},
  TEMPORAL_PROFILES: typeof TEMPORAL_PROFILES !== "undefined" ? TEMPORAL_PROFILES : {},
  WASHOUT_DAYS: typeof WASHOUT_DAYS !== "undefined" ? WASHOUT_DAYS : {},
  ACB_SCORES: typeof ACB_SCORES !== "undefined" ? ACB_SCORES : {},
  BEERS_FLAGS: typeof BEERS_FLAGS !== "undefined" ? BEERS_FLAGS : {},
  PHENOTYPE_SCORES: typeof PHENOTYPE_SCORES !== "undefined" ? PHENOTYPE_SCORES : {},
  RECEPTOR_SCORES: typeof RECEPTOR_SCORES !== "undefined" ? RECEPTOR_SCORES : {},
  STUDY_DB: typeof STUDY_DB !== "undefined" ? STUDY_DB : {},
  TRANSPORTER_DDI: typeof TRANSPORTER_DDI !== "undefined" ? TRANSPORTER_DDI : [],
  TRANSPORTER_ACTORS: typeof TRANSPORTER_ACTORS !== "undefined" ? TRANSPORTER_ACTORS : {},
  SOURCE_SPECIFIC_PROMOTIONS: typeof SOURCE_SPECIFIC_PROMOTIONS !== "undefined" ? SOURCE_SPECIFIC_PROMOTIONS : {},
  SOURCE_SPECIFIC_PROMOTION_DIAGNOSTICS: typeof SOURCE_SPECIFIC_PROMOTION_DIAGNOSTICS !== "undefined" ? SOURCE_SPECIFIC_PROMOTION_DIAGNOSTICS : null,
  SOURCE_SPECIFIC_PROMOTION_SURFACES: typeof SOURCE_SPECIFIC_PROMOTION_SURFACES !== "undefined" ? SOURCE_SPECIFIC_PROMOTION_SURFACES : [],
  RECEPTOR_ACTORS: typeof RECEPTOR_ACTORS !== "undefined" ? RECEPTOR_ACTORS : {},
  PHENOTYPE_ACTORS: typeof PHENOTYPE_ACTORS !== "undefined" ? PHENOTYPE_ACTORS : {},
  TOP100_LIVE_COVERAGE_DRUGS: typeof TOP100_LIVE_COVERAGE_DRUGS !== "undefined" ? TOP100_LIVE_COVERAGE_DRUGS : [],
  TOP100_LIVE_COVERAGE_EVIDENCE_REFS: typeof TOP100_LIVE_COVERAGE_EVIDENCE_REFS !== "undefined" ? TOP100_LIVE_COVERAGE_EVIDENCE_REFS : [],
  TOP250_LIVE_COVERAGE_DRUGS: typeof TOP250_LIVE_COVERAGE_DRUGS !== "undefined" ? TOP250_LIVE_COVERAGE_DRUGS : [],
  TOP250_LIVE_COVERAGE_EVIDENCE_REFS: typeof TOP250_LIVE_COVERAGE_EVIDENCE_REFS !== "undefined" ? TOP250_LIVE_COVERAGE_EVIDENCE_REFS : [],
  CLINICAL_STANDARDS_VERSION: typeof CLINICAL_STANDARDS_VERSION !== "undefined" ? CLINICAL_STANDARDS_VERSION : null,
  EXTERNAL_SUBSTANCE_MAPPINGS: typeof EXTERNAL_SUBSTANCE_MAPPINGS !== "undefined" ? EXTERNAL_SUBSTANCE_MAPPINGS : [],
  PGX_MARKER_MAPPINGS: typeof PGX_MARKER_MAPPINGS !== "undefined" ? PGX_MARKER_MAPPINGS : {},
  PGX_ACTION_SUMMARIES: typeof PGX_ACTION_SUMMARIES !== "undefined" ? PGX_ACTION_SUMMARIES : [],
  PENDING_CORE_ENRICHMENT: typeof PENDING_CORE_ENRICHMENT !== "undefined" ? PENDING_CORE_ENRICHMENT : null,
  normalizeDrugLookupKey: typeof normalizeDrugLookupKey !== "undefined" ? normalizeDrugLookupKey : null,
  getDrugAliases: typeof getDrugAliases !== "undefined" ? getDrugAliases : null,
};`, context);
  return context.__DIOGNOSIS_DATA__;
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
