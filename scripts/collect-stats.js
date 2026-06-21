#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve } from 'path';
import vm from 'vm';

const root = resolve(new URL('..', import.meta.url).pathname);

const dataFiles = [
  'src/data/constants.js',
  'src/data/rules.js',
  'src/data/drugs.js',
  'src/data/enzymes.js',
  'src/data/metabolites.js',
  'src/data/transporters.js',
  'src/data/actors.js',
  'src/data/pharmacology.js',
  'src/data/evidence.js',
  'src/data/clinicalStandards.js',
  'src/data/interactions.js',
  'src/data/sourceSpecificPromotions.js',
  'src/engine/phenotypeEngine.js',
];

function loadSource() {
  return dataFiles.map((file) => readFileSync(resolve(root, file), 'utf8')).join('\n');
}

export function collectStats() {
  const code = `${loadSource()}
JSON.stringify((() => {
  const studyValues = Object.values(STUDY_DB);
  const severitySplit = KNOWN_DDI.reduce((acc, ddi) => {
    const key = ddi.severity || 'unrated';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const metaboliteParents = Object.keys(METAB);
  const metaboliteEntries = Object.values(METAB).reduce((sum, metabolites) =>
    sum + (Array.isArray(metabolites) ? metabolites.length : 0), 0);
  const pkParams = Object.keys(PK_PARAMS || {});
  const nonRegulatoryUncited = studyValues.filter((study) =>
    study.type !== EVIDENCE_TIER.FDA_LABEL &&
    study.type !== EVIDENCE_TIER.GUIDELINE &&
    !study.pmid &&
    !study.doi
  );
  const sourceLinkedStudies = studyValues.filter((study) =>
    study.pmid ||
    study.doi ||
    study.url ||
    study.type === EVIDENCE_TIER.FDA_LABEL ||
    study.type === EVIDENCE_TIER.GUIDELINE ||
    /label|guideline|dailymed|fda/i.test(String(study.source || ''))
  );
  const professionalReviewedStudies = studyValues.filter((study) =>
    study.professionalReviewed === true ||
    study.clinicalReviewed === true ||
    study.reviewStatus === 'professional_reviewed' ||
    study.reviewStatus === 'clinician_reviewed'
  );
  const notProfessionallyReviewedStudies = studyValues.length - professionalReviewedStudies.length;
  const pgxMarkerRows = typeof PGX_MARKER_MAPPINGS === 'undefined'
    ? 0
    : Object.values(PGX_MARKER_MAPPINGS).reduce((sum, rows) => sum + (rows || []).length, 0);
  const liveGenotypeGeneKeys = new Set([
    ...Object.keys(GENOTYPE_EFFECTS).filter((key) => !key.startsWith('_')),
    ...(typeof GENOTYPE_RISK_EFFECTS === 'undefined' ? [] : Object.keys(GENOTYPE_RISK_EFFECTS)),
    ...(typeof GENE_ENZYMES === 'undefined' ? [] : GENE_ENZYMES),
    ...(typeof PHARMGKB_EVIDENCE === 'undefined' ? [] : Object.keys(PHARMGKB_EVIDENCE)),
  ].map((key) => String(key || '').trim()).filter(Boolean));
  return {
    generatedAt: new Date().toISOString(),
    bundleBytes: 0,
    bundleKB: 0,
    bundleLines: 0,
    drugs: DRUG_DB.length,
    studies: studyValues.length,
    sourceLinkedStudies: sourceLinkedStudies.length,
    sourceIntegratedStudies: sourceLinkedStudies.length,
    professionalReviewedStudies: professionalReviewedStudies.length,
    notProfessionallyReviewedStudies,
    v3ProfessionalReviewCandidateStudies: notProfessionallyReviewedStudies,
    livePendingReviewStudies: studyValues.filter((study) => study.livePendingReview === true).length,
    internalReviewRequiredEntries: studyValues.filter((study) => study.reviewRequired === true).length,
    studiesWithPmid: studyValues.filter((study) => !!study.pmid).length,
    externalSubstanceMappings: typeof EXTERNAL_SUBSTANCE_MAPPINGS === 'undefined' ? 0 : EXTERNAL_SUBSTANCE_MAPPINGS.length,
    pgxMarkerRows,
    pgxActionSummaries: typeof PGX_ACTION_SUMMARIES === 'undefined' ? 0 : PGX_ACTION_SUMMARIES.length,
    nonRegulatoryUncited: nonRegulatoryUncited.length,
    ddiPairs: KNOWN_DDI.length,
    severeDdi: severitySplit.severe || 0,
    moderateDdi: severitySplit.moderate || 0,
    mildDdi: severitySplit.mild || 0,
    severitySplit,
    genotypeGenes: liveGenotypeGeneKeys.size,
    metaboliteParents: metaboliteParents.length,
    metaboliteEntries,
    metaboliteActors: Object.keys(METABOLITE_ACTORS).length,
    pkParams: pkParams.length,
    receptorScores: Object.keys(RECEPTOR_SCORES).length,
    beersFlags: Object.keys(BEERS_FLAGS).length,
    washoutRules: Object.keys(WASHOUT_DAYS).length,
    sourceSpecificPromotions: typeof SOURCE_SPECIFIC_PROMOTION_DIAGNOSTICS === 'undefined' ? 0 : SOURCE_SPECIFIC_PROMOTION_DIAGNOSTICS.totalSourceSpecificPromoted,
  };
})())`;

  return JSON.parse(vm.runInNewContext(code, { console }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(`${JSON.stringify(collectStats(), null, 2)}\n`);
}
