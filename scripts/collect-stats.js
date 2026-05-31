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
  const nonRegulatoryUncited = studyValues.filter((study) =>
    study.type !== EVIDENCE_TIER.FDA_LABEL &&
    study.type !== EVIDENCE_TIER.GUIDELINE &&
    !study.pmid &&
    !study.doi
  );
  return {
    generatedAt: new Date().toISOString(),
    bundleBytes: 0,
    bundleKB: 0,
    bundleLines: 0,
    drugs: DRUG_DB.length,
    studies: studyValues.length,
    studiesWithPmid: studyValues.filter((study) => !!study.pmid).length,
    nonRegulatoryUncited: nonRegulatoryUncited.length,
    ddiPairs: KNOWN_DDI.length,
    severeDdi: severitySplit.severe || 0,
    moderateDdi: severitySplit.moderate || 0,
    mildDdi: severitySplit.mild || 0,
    severitySplit,
    genotypeGenes: Object.keys(GENOTYPE_EFFECTS).filter((key) => !key.startsWith('_')).length +
      (typeof GENOTYPE_RISK_EFFECTS === 'undefined' ? 0 : Object.keys(GENOTYPE_RISK_EFFECTS).length),
    metaboliteActors: Object.keys(METABOLITE_ACTORS).length,
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
