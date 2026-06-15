#!/usr/bin/env node
import { createHash } from 'crypto';
import { resolve } from 'path';
import {
  ROOT,
  drugAliasMap,
  loadMedcheckData,
  normalizeName,
  readGeneratedConstObject,
} from './lib/medcheck-source-loader.js';
import { writeText } from './lib/enrichment-common.js';

const IN_SOURCE = resolve(ROOT, 'src/data/generatedPendingReviewEnrichment.js');
const OUT_SOURCE = resolve(ROOT, 'src/data/generatedPendingCoreEnrichment.js');

const SOURCE_CONST = 'PENDING_REVIEW_ENRICHMENT';
const SCHEMA = 'diognosis.pending-core-enrichment.v1';
const INPUT_SCHEMA = 'diognosis.pending-review-enrichment.v1';

const PENDING_FLAGS = {
  candidateStatus: 'source_linked_unverified',
  reviewStatus: 'source_linked_pending_verification',
  professionalReviewStatus: 'pending',
  professionallyReviewed: false,
  canAffectScoring: false,
  canAffectPublicSeverity: false,
  canBeUsedForClinicalAction: false,
  displayBadge: 'Pending verification',
  experimentalOnly: true,
};

const PGX_CLAIMS = new Set([
  'allele_function',
  'clinical_annotation',
  'gene_drug_recommendation',
  'guideline',
  'guideline_annotation',
  'pgx_pair',
  'reference_gene',
  'test_alert',
  'variant_annotation',
]);

const DRUG_CANDIDATE_CLAIMS = new Set([
  'clinical_annotation',
  'drug_label',
  'gene_drug_recommendation',
  'guideline',
  'guideline_annotation',
  'pgx_pair',
  'publication',
  'reference_chemical',
  'test_alert',
  'variant_annotation',
]);

const GENE_PATTERN = /\b(?:ABCB\d+|ABCC\d+|ABCG\d+|ABO|ACE|BCHE|CACNA1S|CFTR|COMT|CYP\d[A-Z0-9]*|CYB5R\d+|DPYD|DRD\d+|G6PD|GSTM\d+|GSTT\d+|HLA-[A-Z0-9:*]+|IFNL\d+|MTHFR|NAT\d+|NUDT\d+|OPRM\d+|P2RY\d+|RYR\d+|SLC[A-Z0-9]+|SLCO\d[A-Z]\d+|TPMT|TYMS|UGT\dA\d+|VKORC\d+)\b/gi;
const METABOLITE_PATTERN = /\b(?:metabolite|active form|active-form|toxic metabolite|hydroxy|nor(?!mal\b)[a-z]+|desmethyl|demethyl|glucuronide|sulfate|oxide|oxido|carboxy|keto|acetyl)\b/i;
const PK_PATTERN = /\b(?:clinical[_ -]?pk|pharmacokinetic|pharmacokinetics|\bpk\b|exposure|auc|clearance|half[- ]?life|tmax|cmax|bioavailability|steady[- ]?state|plasma concentration|dose adjustment)\b/i;
const DDI_PATTERN = /\b(?:drug[- ]?drug|ddi|interaction|coadministration|co-admin|concomitant|contraindicat|inhibitor|inhibition|inducer|induction|raises?|reduces?|increase[sd]? exposure|decrease[sd]? exposure)\b/i;
const PHENOTYPE_PATTERN = /\b(?:phenotype|receptor|response|toxicity|hypersensitivity|myopathy|hemolysis|haemolysis|bleeding|thrombosis|qt|qtc|serotonin|sedation|respiratory depression|seizure|neutropenia|agranulocytosis)\b/i;
const BEERS_PATTERN = /\b(?:beers|geriatric|older adult|elderly|falls?|delirium|cognitive impairment|dementia|anticholinergic burden)\b/i;
const WASHOUT_PATTERN = /\b(?:washout|half[- ]?life|persist|persistence|clearance|duration|offset|recovery|after discontinuation|time to)\b/i;

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value.filter(item => item != null && String(item).trim() !== '') : [value];
}

function uniq(values, limit = 20) {
  return [...new Set(asArray(values).map(value => String(value).trim()).filter(Boolean))].slice(0, limit);
}

function uniqNormalized(values, limit = 20) {
  const out = new Map();
  for (const value of asArray(values)) {
    const text = String(value || '').trim();
    const key = normalizeName(text);
    if (key && !out.has(key)) out.set(key, text);
  }
  return [...out.values()].slice(0, limit);
}

function countBy(values, keyFn) {
  return values.reduce((acc, value) => {
    const key = keyFn(value) || 'other';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function stableHash(parts) {
  return createHash('sha256')
    .update(parts.map(part => String(part ?? '')).join('|'))
    .digest('hex')
    .slice(0, 10);
}

function slug(value, maxLength = 72) {
  const token = normalizeName(value).replace(/\s+/g, '_').slice(0, maxLength);
  return token || 'candidate';
}

function stableId(prefix, parts) {
  return `${prefix}_${slug(parts.join('_'))}_${stableHash(parts)}`;
}

function compactText(value, maxLength = 220) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1).trim()}...`;
}

function recordText(record) {
  return [
    record.id,
    record.sourceName,
    record.sourceKey,
    record.claimType,
    record.title,
    record.summary,
    record.strongestExternalTier,
    ...(record.drugs || []),
    ...(record.genes || []),
    ...(record.metabolites || []),
    ...(record.pathways || []),
    ...(record.phenotypes || []),
    ...(record.evidenceIdentifiers || []),
  ].join(' ');
}

function normalizedRecordText(record) {
  return ` ${normalizeName(recordText(record))} `;
}

function evidenceIdentifiers(record) {
  return uniq(record.evidenceIdentifiers || [], 10);
}

function sourceRecordIds(record) {
  return uniq([record.sourceRecordId, record.id], 4);
}

function buildGeneSet(data, records) {
  const genes = new Set();
  [
    ...Object.keys(data.GENOTYPE_EFFECTS || {}),
    ...Object.keys(data.GENOTYPE_RISK_EFFECTS || {}),
    ...Object.keys(data.PHENOTYPE_SCORES || {}),
    ...Object.keys(data.RECEPTOR_ACTORS || {}),
    ...Object.keys(data.PHENOTYPE_ACTORS || {}),
  ].forEach(gene => genes.add(normalizeName(gene)));
  for (const record of records) {
    for (const gene of record.genes || []) genes.add(normalizeName(gene));
    for (const match of recordText(record).matchAll(GENE_PATTERN)) genes.add(normalizeName(match[0]));
  }
  return genes;
}

function geneNamesFor(record, geneSet) {
  const out = [...(record.genes || [])];
  for (const match of recordText(record).matchAll(GENE_PATTERN)) out.push(match[0].toUpperCase());
  for (const pathway of record.pathways || []) {
    const normalized = normalizeName(pathway);
    if (geneSet.has(normalized)) out.push(pathway);
  }
  return uniq(out.map(gene => String(gene).replace(/\s+/g, '').toUpperCase()), 12);
}

function looksLikeGene(value, geneSet) {
  const text = String(value || '').trim();
  const normalized = normalizeName(text);
  return geneSet.has(normalized) || /^(?:CYP|UGT|SLCO|ABC|HLA|DPYD|TPMT|NUDT|G6PD|VKORC|CYB5R|GSTM|GSTT|SLC|RYR|CFTR|NAT|TYMS|MTHFR|COMT|DRD|OPRM|P2RY)/i.test(text);
}

function looksLikeAlleleOrVariant(value) {
  const text = String(value || '').trim();
  return /^\*/.test(text) || /^rs\d+/i.test(text) || /^c\.\d/i.test(text) || /^p\.[A-Z]/i.test(text);
}

function looksLikeBadDrugName(value, geneSet) {
  const text = String(value || '').trim();
  if (!text || text.length < 3) return true;
  if (looksLikeAlleleOrVariant(text)) return true;
  if (looksLikeGene(text, geneSet)) return true;
  if (/^(drug|gene|guideline|label|variant|allele|clinical|source|data|test|alert|cpic|clinpgx)$/i.test(text)) return true;
  return false;
}

function titleCaseDrugName(value) {
  return String(value || '').trim().replace(/\S+/g, word => {
    if (/^[A-Z0-9-]{2,}$/.test(word)) return word;
    return `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`;
  });
}

function canonicalDrugName(value, aliases) {
  const text = String(value || '').trim();
  return aliases.get(normalizeName(text)) || titleCaseDrugName(text);
}

function buildDrugAliasEntries(data, geneSet) {
  const aliases = drugAliasMap(data.DRUG_DB || []);
  return [...aliases.entries()]
    .filter(([key]) => key.length >= 4 && !looksLikeBadDrugName(key, geneSet))
    .sort((a, b) => b[0].length - a[0].length);
}

function recordDrugNames(record, aliases, aliasEntries, geneSet) {
  const names = [];
  if (DRUG_CANDIDATE_CLAIMS.has(record.claimType || '')) {
    for (const drug of record.drugs || []) {
      if (!looksLikeBadDrugName(drug, geneSet)) names.push(canonicalDrugName(drug, aliases));
    }
  }

  const text = normalizedRecordText(record);
  for (const [alias, generic] of aliasEntries) {
    if (names.length >= 12) break;
    if (text.includes(` ${alias} `)) names.push(generic);
  }

  return uniqNormalized(names, 12);
}

function metaboliteLabelsFor(record, aliases = new Map()) {
  const labels = [...(record.metabolites || [])];
  for (const pathway of record.pathways || []) {
    if (METABOLITE_PATTERN.test(pathway)) labels.push(String(pathway).replace(/_/g, ' '));
  }
  const title = `${record.title || ''} ${record.summary || ''}`;
  for (const token of title.match(/\b[a-z0-9-]*(?:hydroxy|desmethyl|nor(?!mal\b)[a-z]+|glucuronide|metabolite)[a-z0-9-]*\b/gi) || []) {
    labels.push(token.replace(/[_-]/g, ' '));
  }
  return uniqNormalized(labels, 8).filter(label => !aliases.has(normalizeName(label)));
}

function evidenceTypeFor(record) {
  const text = `${record.claimType || ''} ${record.strongestExternalTier || ''} ${record.sourceName || ''}`;
  if (/FDA_LABEL|DailyMed|drug_label/i.test(text)) return 'pending_fda_label_context';
  if (/CPIC|guideline/i.test(text)) return 'pending_guideline_context';
  if (/clinical[_ -]?pk|pharmacokinetic/i.test(text)) return 'pending_clinical_pk_context';
  if (/PMID:|DOI:|publication|literature/i.test(`${text} ${(record.evidenceIdentifiers || []).join(' ')}`)) return 'pending_publication_metadata';
  return 'pending_source_evidence_context';
}

function baseCandidate(record, target, category) {
  return {
    sourceRecordId: record.sourceRecordId || record.id,
    sourceRecordIds: sourceRecordIds(record),
    sourceKey: record.sourceKey || 'other',
    sourceName: record.sourceName || record.sourceKey || 'External source',
    sourceUrl: record.sourceUrl || '',
    sourceEndpoint: record.sourceEndpoint || '',
    sourceTruthStatus: record.sourceTruthStatus || '',
    claimType: record.claimType || 'source_context',
    mappingStatus: record.mappingStatus || 'source_identified',
    evidenceIdentifiers: evidenceIdentifiers(record),
    strongestExternalTier: record.strongestExternalTier || '',
    suggestedTarget: target,
    candidateCategory: category,
    ...PENDING_FLAGS,
  };
}

function buildStudyCandidate(record, drugs, genes, aliases) {
  return {
    id: stableId('pending_study', [record.id, record.claimType, record.sourceName]),
    ...baseCandidate(record, 'STUDY_DB', 'evidence_entry'),
    title: compactText(record.title || `${record.sourceName || 'External source'} evidence candidate`),
    summary: compactText(record.summary || 'Source-linked evidence candidate.'),
    evidenceType: evidenceTypeFor(record),
    drugs,
    genes,
    metabolites: metaboliteLabelsFor(record, aliases),
    pathways: uniq(record.pathways || [], 10),
    phenotypes: uniq(record.phenotypes || [], 10),
    sourceLinked: true,
  };
}

function buildInteractionCandidates(records, aliases, aliasEntries, geneSet) {
  const rows = [];
  const seen = new Set();
  for (const record of records) {
    const text = recordText(record);
    const drugs = recordDrugNames(record, aliases, aliasEntries, geneSet);
    const hasInteractionLanguage = DDI_PATTERN.test(text);
    if (!hasInteractionLanguage || drugs.length < 2) continue;
    if (drugs.length < 2) continue;
    for (let i = 0; i < drugs.length; i += 1) {
      for (let j = i + 1; j < drugs.length; j += 1) {
        const pair = [drugs[i], drugs[j]].sort((a, b) => a.localeCompare(b));
        if (normalizeName(pair[0]) === normalizeName(pair[1])) continue;
        const key = `${pair[0]}|${pair[1]}|${record.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({
          id: stableId('pending_interaction', [record.id, ...pair]),
          ...baseCandidate(record, 'KNOWN_DDI', 'interaction_pair'),
          drug1: pair[0],
          drug2: pair[1],
          drugs: pair,
          genes: geneNamesFor(record, geneSet),
          interactionLanguagePresent: hasInteractionLanguage,
          suggestedSeverity: 'pending_unrated',
          publicSeverity: 'pending_unrated',
          countedAsKnownDdi: false,
          summary: compactText(record.summary || record.title || 'Source-linked interaction candidate.'),
        });
      }
    }
  }
  return rows;
}

function buildMetaboliteCandidates(records, aliases, aliasEntries, geneSet) {
  const rows = [];
  for (const record of records) {
    if (!METABOLITE_PATTERN.test(recordText(record))) continue;
    const drugs = recordDrugNames(record, aliases, aliasEntries, geneSet);
    const genes = geneNamesFor(record, geneSet);
    const labels = metaboliteLabelsFor(record, aliases);
    if (!labels.length) continue;
    for (const label of labels) {
      rows.push({
        id: stableId('pending_metabolite', [record.id, label]),
        ...baseCandidate(record, 'METAB / METABOLITE_ACTORS', 'metabolite_entry'),
        parentDrug: drugs[0] || '',
        metaboliteName: compactText(label, 90),
        drugs,
        genes,
        pathways: uniq(record.pathways || [], 8),
        role: 'pending_unclassified',
        summary: compactText(record.summary || record.title || 'Source-linked metabolite candidate.'),
      });
    }
  }
  return rows;
}

function buildPgxCandidates(records, aliases, aliasEntries, geneSet) {
  const rows = [];
  const seen = new Set();
  for (const record of records) {
    const genes = geneNamesFor(record, geneSet);
    const text = recordText(record);
    if (!genes.length) continue;
    if (!PGX_CLAIMS.has(record.claimType || '') && !/pgx|pharmacogen|genotype|allele|variant|gene/i.test(text)) continue;
    const drugs = recordDrugNames(record, aliases, aliasEntries, geneSet);
    const drugTerms = drugs.length ? drugs : ['gene-only context'];
    for (const gene of genes) {
      for (const drug of drugTerms) {
        const key = `${record.id}|${gene}|${drug}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({
          id: stableId('pending_pgx', [record.id, gene, drug]),
          ...baseCandidate(record, 'curated PGx rules', 'pgx_rule'),
          gene,
          drug: drug === 'gene-only context' ? '' : drug,
          drugs: drug === 'gene-only context' ? [] : [drug],
          genes: [gene],
          pathways: uniq(record.pathways || [], 8),
          ruleKind: record.claimType || 'pgx_context',
          summary: compactText(record.summary || record.title || 'Source-linked PGx candidate.'),
        });
      }
    }
  }
  return rows;
}

function buildPkCandidates(records, aliases, aliasEntries, geneSet) {
  return records
    .filter(record => PK_PATTERN.test(recordText(record)))
    .map(record => ({
      id: stableId('pending_pk', [record.id, record.claimType, record.strongestExternalTier]),
      ...baseCandidate(record, 'PK_PARAMS / PK simulation profiles', 'pk_profile'),
      drugs: recordDrugNames(record, aliases, aliasEntries, geneSet),
      genes: geneNamesFor(record, geneSet),
      canCreateAbsoluteProfile: false,
      numericExtractionStatus: 'not_extracted',
      summary: compactText(record.summary || record.title || 'Source-linked PK candidate.'),
    }));
}

function buildPatternCandidates(records, aliases, aliasEntries, geneSet, pattern, prefix, target, category) {
  return records
    .filter(record => pattern.test(recordText(record)))
    .map(record => ({
      id: stableId(prefix, [record.id, record.claimType, target]),
      ...baseCandidate(record, target, category),
      drugs: recordDrugNames(record, aliases, aliasEntries, geneSet),
      genes: geneNamesFor(record, geneSet),
      phenotypes: uniq(record.phenotypes || [], 8),
      pathways: uniq(record.pathways || [], 8),
      summary: compactText(record.summary || record.title || `Source-linked ${category} candidate.`),
    }));
}

function buildDrugCandidates(records, aliases, aliasEntries, geneSet, data) {
  const grouped = new Map();
  const knownDrugKeys = new Set((data.DRUG_DB || []).map(drug => normalizeName(drug.name)));
  for (const record of records) {
    const drugs = recordDrugNames(record, aliases, aliasEntries, geneSet);
    const genes = geneNamesFor(record, geneSet);
    for (const drug of drugs) {
      const key = normalizeName(drug);
      if (!key) continue;
      const row = grouped.get(key) || {
        name: drug,
        knownDrugName: aliases.get(key) || (knownDrugKeys.has(key) ? drug : ''),
        sourceRecordIds: [],
        evidenceIdentifiers: [],
        sourceKeys: [],
        claimTypes: [],
        linkedGenes: [],
        linkedPathways: [],
      };
      row.sourceRecordIds.push(record.sourceRecordId || record.id);
      row.evidenceIdentifiers.push(...evidenceIdentifiers(record));
      row.sourceKeys.push(record.sourceKey || 'other');
      row.claimTypes.push(record.claimType || 'source_context');
      row.linkedGenes.push(...genes);
      row.linkedPathways.push(...(record.pathways || []));
      grouped.set(key, row);
    }
  }

  return [...grouped.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(row => ({
      id: stableId('pending_drug', [row.name]),
      suggestedTarget: 'DRUG_DB / label context',
      candidateCategory: 'drug_or_label_context',
      name: row.name,
      knownDrugName: row.knownDrugName,
      sourceLinkedExistingDrug: Boolean(row.knownDrugName),
      sourceRecordIds: uniq(row.sourceRecordIds, 16),
      evidenceIdentifiers: uniq(row.evidenceIdentifiers, 16),
      sourceKeys: uniq(row.sourceKeys, 8),
      claimTypes: uniq(row.claimTypes, 8),
      linkedGenes: uniq(row.linkedGenes, 12),
      linkedPathways: uniq(row.linkedPathways, 12),
      summary: compactText(`${row.name} appears in source-linked enrichment records as a drug or label context candidate.`),
      ...PENDING_FLAGS,
    }));
}

function baselineCounts(data) {
  const studyValues = Object.values(data.STUDY_DB || {});
  const metaboliteParents = Object.keys(data.METAB || {});
  const metaboliteEntries = Object.values(data.METAB || {}).reduce((sum, metabolites) =>
    sum + (Array.isArray(metabolites) ? metabolites.length : 0), 0);
  return {
    drugs: (data.DRUG_DB || []).length,
    evidenceEntries: studyValues.length,
    interactionPairs: (data.KNOWN_DDI || []).length,
    metaboliteParents: metaboliteParents.length,
    metaboliteEntries,
    pkProfiles: Object.keys(data.PK_PARAMS || {}).length,
    genotypeGenes: Object.keys(data.GENOTYPE_EFFECTS || {}).filter(key => !key.startsWith('_')).length +
      Object.keys(data.GENOTYPE_RISK_EFFECTS || {}).length,
    receptorScoreProfiles: Object.keys(data.PHENOTYPE_SCORES || {}).length,
    beersFlags: Object.keys(data.BEERS_FLAGS || {}).length,
    washoutRules: Object.keys(data.WASHOUT_DAYS || {}).length,
  };
}

function payloadFor(source, data) {
  if (!source || source.schema !== INPUT_SCHEMA || !Array.isArray(source.records)) {
    throw new Error(`Expected ${SOURCE_CONST} with schema ${INPUT_SCHEMA}`);
  }
  const records = source.records;
  const geneSet = buildGeneSet(data, records);
  const aliases = drugAliasMap(data.DRUG_DB || []);
  const aliasEntries = buildDrugAliasEntries(data, geneSet);

  const studyCandidates = records.map(record =>
    buildStudyCandidate(record, recordDrugNames(record, aliases, aliasEntries, geneSet), geneNamesFor(record, geneSet), aliases)
  );
  const drugCandidates = buildDrugCandidates(records, aliases, aliasEntries, geneSet, data);
  const interactionCandidates = buildInteractionCandidates(records, aliases, aliasEntries, geneSet);
  const metaboliteCandidates = buildMetaboliteCandidates(records, aliases, aliasEntries, geneSet);
  const pgxCandidates = buildPgxCandidates(records, aliases, aliasEntries, geneSet);
  const pkCandidates = buildPkCandidates(records, aliases, aliasEntries, geneSet);
  const receptorPhenotypeCandidates = buildPatternCandidates(records, aliases, aliasEntries, geneSet, PHENOTYPE_PATTERN, 'pending_receptor_phenotype', 'PHENOTYPE_SCORES / receptor profiles', 'receptor_or_phenotype_profile');
  const beersCandidates = buildPatternCandidates(records, aliases, aliasEntries, geneSet, BEERS_PATTERN, 'pending_beers', 'BEERS_FLAGS', 'beers_flag');
  const washoutCandidates = buildPatternCandidates(records, aliases, aliasEntries, geneSet, WASHOUT_PATTERN, 'pending_washout', 'WASHOUT_DAYS / persistence rules', 'washout_rule');

  const counts = {
    totalCandidates: drugCandidates.length + studyCandidates.length + interactionCandidates.length +
      metaboliteCandidates.length + pgxCandidates.length + pkCandidates.length +
      receptorPhenotypeCandidates.length + beersCandidates.length + washoutCandidates.length,
    drugCandidates: drugCandidates.length,
    studyCandidates: studyCandidates.length,
    interactionCandidates: interactionCandidates.length,
    metaboliteCandidates: metaboliteCandidates.length,
    pgxCandidates: pgxCandidates.length,
    pkCandidates: pkCandidates.length,
    receptorPhenotypeCandidates: receptorPhenotypeCandidates.length,
    beersCandidates: beersCandidates.length,
    washoutCandidates: washoutCandidates.length,
  };
  const coreBaselines = baselineCounts(data);
  const uniquePendingPgxGenes = new Set(pgxCandidates.map(row => row.gene).filter(Boolean)).size;

  return {
    schema: SCHEMA,
    generatedAt: new Date().toISOString(),
    sourceSchema: source.schema,
    sourceGeneratedAt: source.generatedAt || '',
    sourceRecords: records.length,
    sourceCounts: source.exportedSourceCounts || source.sourceCounts || {},
    safetyBoundary: {
      professionalReviewStatus: 'pending',
      professionallyReviewed: false,
      sourceLinkedOnly: true,
      canAffectScoring: false,
      canAffectPublicSeverity: false,
      canBeUsedForClinicalAction: false,
    },
    coreBaselines,
    counts,
    candidateExpandedCounts: {
      drugs: coreBaselines.drugs + counts.drugCandidates,
      evidenceEntries: coreBaselines.evidenceEntries + counts.studyCandidates,
      interactionPairs: coreBaselines.interactionPairs + counts.interactionCandidates,
      metaboliteEntries: coreBaselines.metaboliteEntries + counts.metaboliteCandidates,
      pkProfiles: coreBaselines.pkProfiles + counts.pkCandidates,
      genotypeGenes: coreBaselines.genotypeGenes + uniquePendingPgxGenes,
      receptorScoreProfiles: coreBaselines.receptorScoreProfiles + counts.receptorPhenotypeCandidates,
      beersFlags: coreBaselines.beersFlags + counts.beersCandidates,
      washoutRules: coreBaselines.washoutRules + counts.washoutCandidates,
    },
    uniquePendingPgxGenes,
    candidatesBySource: countBy([
      ...drugCandidates,
      ...studyCandidates,
      ...interactionCandidates,
      ...metaboliteCandidates,
      ...pgxCandidates,
      ...pkCandidates,
      ...receptorPhenotypeCandidates,
      ...beersCandidates,
      ...washoutCandidates,
    ], row => row.sourceKey || (row.sourceKeys || [])[0] || 'other'),
    drugCandidates,
    studyCandidates,
    interactionCandidates,
    metaboliteCandidates,
    pgxCandidates,
    pkCandidates,
    receptorPhenotypeCandidates,
    beersCandidates,
    washoutCandidates,
  };
}

function generatedSource(payload) {
  return `// Auto-generated by scripts/enrich/generate-pending-core-enrichment.js. Do not edit by hand.
const PENDING_CORE_ENRICHMENT = ${JSON.stringify(payload, null, 2)};
`;
}

function main() {
  const source = readGeneratedConstObject(IN_SOURCE, SOURCE_CONST);
  const data = loadMedcheckData();
  const payload = payloadFor(source, data);
  writeText(OUT_SOURCE, generatedSource(payload));
  console.log(JSON.stringify({
    ok: true,
    sourceRecords: payload.sourceRecords,
    counts: payload.counts,
    candidateExpandedCounts: payload.candidateExpandedCounts,
  }, null, 2));
}

main();
