import { normalizeName, uniq } from './diognosis-source-loader.js';

const GENE_SYMBOL_PATTERN = /\b(?:CYP\d[A-Z0-9]*|HLA-[A-Z0-9]+|SLCO\d[A-Z0-9]*|ABCG\d+|ABCB\d+|VKORC1|UGT\d[A-Z0-9]*|MT-RNR1|G6PD|DPYD|TPMT|NUDT15|CFTR|NAT2|RYR1|CACNA1S|IFNL\d*|ADRB\d|ADRA\d[A-Z0-9]*|GRK\d|MTHFR|EGF|CRHR1|SLC\d+[A-Z]\d*|SLC28A3)\b/i;

const BARE_CLASS_NOUNS = new Set([
  'aminoglycoside',
  'aminoglycosides',
  'angiotensin ii antagonists',
  'angiotensin converting enzyme inhibitors',
  'antiinflammatory agents non steroids',
  'anticholinergic agents',
  'antidepressants',
  'antiepileptics',
  'antineoplastic agents',
  'antipsychotics',
  'antivirals for treatment of hiv infections combinations',
  'arbs',
  'beta blocking agents',
  'beta blocker',
  'beta blockers',
  'beta-blocker',
  'beta-blockers',
  'bisphosphonate',
  'bisphosphonates',
  'calcineurin inhibitors',
  'drugs for treatment of tuberculosis',
  'folfiri',
  'folfirinox',
  'folfox',
  'hmg coa reductase inhibitors',
  'non nucleoside reverse transcriptase inhibitors',
  'nsaid',
  'nsaids',
  'opioid',
  'opioids',
  'peginterferon alpha based regimens',
  'platelet aggregation inhibitors excl heparin',
  'platinum compounds',
  'proton pump inhibitor',
  'proton pump inhibitors',
  'purine analogues',
  'pyrimidine analogues',
  'selective serotonin reuptake inhibitors',
  'statin',
  'statins',
  'tricyclic antidepressant',
  'tricyclic antidepressants',
  'vitamin k antagonists',
  'vitamin k and analogues',
  'xelox',
]);

const BROAD_CLASS_PATTERN = /\b(?:agents|inhibitors|antagonists|analogues|compounds|substances|combinations|regimens)\b/i;
const REGIMEN_PATTERN = /^(?:FOLFOX|FOLFIRI|FOLFIRINOX|XELOX)$/i;

function canonicalDisplayName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\bAnd\b/g, 'and');
}

function geneListPrefixPattern() {
  const gene = '(?:CYP\\d[A-Z0-9]*|HLA-[A-Z0-9]+|SLCO\\d[A-Z0-9]*|ABCG\\d+|ABCB\\d+|VKORC1|UGT\\d[A-Z0-9]*|MT-RNR1|G6PD|DPYD|TPMT|NUDT15|CFTR|NAT2|RYR1|CACNA1S|IFNL\\d*|ADRB\\d|ADRA\\d[A-Z0-9]*|GRK\\d|MTHFR|EGF|CRHR1|SLC\\d+[A-Z]\\d*|SLC28A3)';
  return new RegExp(`^\\s*(?:${gene}\\s*,\\s*)*(?:${gene})\\s+(?:and|&)\\s+(.+)$`, 'i');
}

const GENE_LIST_PREFIX = geneListPrefixPattern();

export function buildCandidateNameContext(data = {}) {
  const canonicalDrugByKey = new Map();
  const addDrugTerm = (term, canonical) => {
    const key = normalizeName(term);
    if (key && !canonicalDrugByKey.has(key)) canonicalDrugByKey.set(key, canonical);
  };

  for (const drug of data.DRUG_DB || []) {
    const canonical = drug.name || drug.id;
    for (const term of [
      drug.name,
      drug.id,
      ...(drug.brandNames || []),
      ...(drug.brands || []),
      ...(drug.aliases || []),
      ...(typeof data.getDrugAliases === 'function' ? data.getDrugAliases(drug) || [] : []),
    ]) {
      addDrugTerm(term, canonical);
    }
  }

  const geneKeys = new Set([
    ...Object.keys(data.GENE_ENZYMES || {}),
    ...Object.keys(data.GENOTYPE_EFFECTS || {}),
    ...Object.keys(data.GENOTYPE_RISK_EFFECTS || {}).map(key => String(key).split('*')[0]),
    'MT-RNR1',
    'CACNA1S',
    'RYR1',
    'CFTR',
    'NUDT15',
    'HLA-A',
    'HLA-B',
    'IFNL3',
    'MTHFR',
    'EGF',
    'CRHR1',
    'SLC28A3',
  ].map(normalizeName).filter(Boolean));

  return {
    canonicalDrugByKey,
    existingDrugKeys: new Set(canonicalDrugByKey.keys()),
    geneKeys,
  };
}

export function candidateNamePolicyViolation(value, context = {}) {
  const text = canonicalDisplayName(value);
  const key = normalizeName(text);
  if (!text) return { reason: 'empty_candidate_name' };
  if (looksLikeGeneGuidelineTitle(text)) return { reason: 'gene_drug_guideline_title' };
  if (isBareClassNoun(text)) return { reason: 'bare_class_noun' };
  if (context.geneKeys?.has(key) || GENE_SYMBOL_PATTERN.test(text) && !/\s/.test(text)) {
    return { reason: 'gene_symbol_not_substance' };
  }
  return null;
}

export function looksLikeGeneGuidelineTitle(value) {
  const text = canonicalDisplayName(value);
  return GENE_SYMBOL_PATTERN.test(text) && /\b(?:and|&)\b/i.test(text);
}

export function isBareClassNoun(value) {
  const text = canonicalDisplayName(value);
  return BARE_CLASS_NOUNS.has(normalizeName(text)) || BROAD_CLASS_PATTERN.test(text) || REGIMEN_PATTERN.test(text);
}

export function splitCombinationName(value) {
  const text = canonicalDisplayName(value);
  if (!text) return [];
  if (/[\/+]/.test(text)) return text.split(/\s*[\/+]\s*/).map(canonicalDisplayName).filter(Boolean);
  return [text];
}

export function extractDrugPhraseFromGeneTitle(value) {
  const match = canonicalDisplayName(value).match(GENE_LIST_PREFIX);
  return match ? canonicalDisplayName(match[1]) : '';
}

function isInvalidSubstanceName(value) {
  const text = canonicalDisplayName(value);
  if (text.length < 3 || text.length > 80) return true;
  if (/^\*/.test(text)) return true;
  if (/[()<>={}]/.test(text)) return true;
  if (/^m\.\d/i.test(text)) return true;
  if (/\b(no drug|unknown|xenobiotics)\b/i.test(text)) return true;
  if (/\b(rs\d+|chr\d+|genotype|allele|variant|polymorphism|gene|protein|receptor|transporter|enzyme)\b/i.test(text)) return true;
  return false;
}

function normalizeSourcePart(value, context) {
  const text = canonicalDisplayName(value)
    .replace(/^and\s+/i, '')
    .replace(/\s+and$/i, '')
    .trim();
  const violation = candidateNamePolicyViolation(text, context);
  if (violation) return { accepted: [], rejected: [{ name: text, ...violation }] };
  const key = normalizeName(text);
  if (!key || isInvalidSubstanceName(text)) return { accepted: [], rejected: [{ name: text, reason: 'invalid_substance_name' }] };
  if (context.existingDrugKeys?.has(key)) return { accepted: [], rejected: [{ name: text, reason: 'already_in_drug_db' }] };
  return {
    accepted: [{ name: text, candidateCategory: 'unmatched_substance' }],
    rejected: [],
  };
}

export function normalizeSourceDrugCandidateName(value, context = {}) {
  const text = canonicalDisplayName(value);
  if (looksLikeGeneGuidelineTitle(text)) {
    return { accepted: [], rejected: [{ name: text, reason: 'gene_drug_guideline_title' }] };
  }
  const parts = splitCombinationName(text);
  if (parts.length > 1) {
    const accepted = [];
    const rejected = [];
    for (const part of parts) {
      const normalized = normalizeSourcePart(part, context);
      accepted.push(...normalized.accepted);
      rejected.push(...normalized.rejected);
    }
    if (!accepted.length && rejected.every(row => row.reason === 'already_in_drug_db')) {
      rejected.push({ name: text, reason: 'combination_components_already_in_drug_db' });
    }
    return { accepted, rejected };
  }
  return normalizeSourcePart(text, context);
}

function normalizeRelationPart(value, context) {
  const text = canonicalDisplayName(value);
  const violation = candidateNamePolicyViolation(text, context);
  if (violation) return { names: [], rejected: [{ name: text, ...violation }] };
  const key = normalizeName(text);
  if (!key || isInvalidSubstanceName(text)) return { names: [], rejected: [{ name: text, reason: 'invalid_substance_name' }] };
  return {
    names: [context.canonicalDrugByKey?.get(key) || text],
    rejected: [],
  };
}

export function normalizeRelationDrugNames(values = [], context = {}) {
  const names = [];
  const rejected = [];
  for (const value of values || []) {
    const text = canonicalDisplayName(value);
    if (!text) continue;
    if (looksLikeGeneGuidelineTitle(text)) {
      const drugPhrase = extractDrugPhraseFromGeneTitle(text);
      if (!drugPhrase) {
        rejected.push({ name: text, reason: 'gene_drug_guideline_title' });
        continue;
      }
      for (const part of splitCombinationName(drugPhrase)) {
        const normalized = normalizeRelationPart(part, context);
        names.push(...normalized.names);
        rejected.push(...normalized.rejected);
      }
      continue;
    }
    for (const part of splitCombinationName(text)) {
      const normalized = normalizeRelationPart(part, context);
      names.push(...normalized.names);
      rejected.push(...normalized.rejected);
    }
  }
  return { names: uniq(names), rejected };
}
