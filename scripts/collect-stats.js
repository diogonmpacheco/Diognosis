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
  'src/data/interactions.js',
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
  return {
    generatedAt: new Date().toISOString(),
    bundleBytes: 0,
    bundleKB: 0,
    bundleLines: 0,
    drugs: DRUG_DB.length,
    studies: studyValues.length,
    sourceLinkedStudies: sourceLinkedStudies.length,
    professionalReviewedStudies: professionalReviewedStudies.length,
    verifiedStudies: studyValues.filter((study) => study.reviewRequired !== true).length,
    reviewQueue: studyValues.filter((study) => study.reviewRequired === true).length,
    studiesWithPmid: studyValues.filter((study) => !!study.pmid).length,
    nonRegulatoryUncited: nonRegulatoryUncited.length,
    ddiPairs: KNOWN_DDI.length,
    severeDdi: severitySplit.severe || 0,
    moderateDdi: severitySplit.moderate || 0,
    mildDdi: severitySplit.mild || 0,
    severitySplit,
    genotypeGenes: Object.keys(GENOTYPE_EFFECTS).filter((key) => !key.startsWith('_')).length +
      (typeof GENOTYPE_RISK_EFFECTS === 'undefined' ? 0 : Object.keys(GENOTYPE_RISK_EFFECTS).length),
    metaboliteParents: metaboliteParents.length,
    metaboliteEntries,
    metaboliteActors: Object.keys(METABOLITE_ACTORS).length,
    pkParams: pkParams.length,
    receptorScores: Object.keys(RECEPTOR_SCORES).length,
    beersFlags: Object.keys(BEERS_FLAGS).length,
    washoutRules: Object.keys(WASHOUT_DAYS).length,
  };
})())`;

  return JSON.parse(vm.runInNewContext(code, { console }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(`${JSON.stringify(collectStats(), null, 2)}\n`);
}
