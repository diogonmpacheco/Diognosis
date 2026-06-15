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
  'src/data/generatedPendingReviewEnrichment.js',
  'src/data/generatedPendingCoreEnrichment.js',
  'src/data/generatedSourceDrugNameCandidates.js',
  'src/data/pendingLiveCoreAugmentation.js',
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
  const pendingProfessionalReviewStudies = studyValues.length - professionalReviewedStudies.length;
  const pendingCore = typeof PENDING_CORE_ENRICHMENT === 'undefined' ? null : PENDING_CORE_ENRICHMENT;
  const pendingCoreCounts = pendingCore?.counts || {};
  const candidateExpandedCounts = pendingCore?.candidateExpandedCounts || {};
  const sourceDrugNameCandidates = typeof SOURCE_DRUG_NAME_CANDIDATES === 'undefined' ? null : SOURCE_DRUG_NAME_CANDIDATES;
  const pendingLiveCore = typeof PENDING_LIVE_CORE_AUGMENTATION === 'undefined' ? null : PENDING_LIVE_CORE_AUGMENTATION;
  const pendingLiveReceptor = typeof PENDING_LIVE_RECEPTOR_AUGMENTATION === 'undefined' ? null : PENDING_LIVE_RECEPTOR_AUGMENTATION;
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
    professionalReviewedStudies: professionalReviewedStudies.length,
    pendingProfessionalReviewStudies,
    livePendingReviewStudies: studyValues.filter((study) => study.livePendingReview === true).length,
    pendingReviewEnrichmentRecords: typeof PENDING_REVIEW_ENRICHMENT === 'undefined' ? 0 : PENDING_REVIEW_ENRICHMENT.exportedRecords || 0,
    pendingReviewEnrichmentSources: typeof PENDING_REVIEW_ENRICHMENT === 'undefined' ? 0 : Object.keys(PENDING_REVIEW_ENRICHMENT.exportedSourceCounts || {}).length,
    pendingCoreTotalCandidates: pendingCoreCounts.totalCandidates || 0,
    pendingCoreDrugCandidates: pendingCoreCounts.drugCandidates || 0,
    pendingCoreStudyCandidates: pendingCoreCounts.studyCandidates || 0,
    pendingCoreInteractionCandidates: pendingCoreCounts.interactionCandidates || 0,
    pendingCoreMetaboliteCandidates: pendingCoreCounts.metaboliteCandidates || 0,
    pendingCorePgxCandidates: pendingCoreCounts.pgxCandidates || 0,
    pendingCorePkCandidates: pendingCoreCounts.pkCandidates || 0,
    pendingCoreReceptorPhenotypeCandidates: pendingCoreCounts.receptorPhenotypeCandidates || 0,
    pendingCoreBeersCandidates: pendingCoreCounts.beersCandidates || 0,
    pendingCoreWashoutCandidates: pendingCoreCounts.washoutCandidates || 0,
    pendingCoreUniquePgxGenes: pendingCore?.uniquePendingPgxGenes || 0,
    sourceDrugNameCandidates: sourceDrugNameCandidates?.totalCandidates || 0,
    pendingLiveCoreDrugsAdded: pendingLiveCore?.drugsAdded || 0,
    pendingLiveCoreSourceDrugNameCandidatesAdded: pendingLiveCore?.sourceDrugNameCandidatesAdded || 0,
    pendingLiveCoreStudyEntriesAdded: pendingLiveCore?.studyEntriesAdded || 0,
    pendingLiveCoreInteractionPairsAdded: pendingLiveCore?.interactionPairsAdded || 0,
    pendingLiveCoreMetaboliteEntriesAdded: pendingLiveCore?.metaboliteEntriesAdded || 0,
    pendingLiveCoreMetaboliteParentsAdded: pendingLiveCore?.metaboliteParentsAdded || 0,
    pendingLiveCorePkProfilesAdded: pendingLiveCore?.pkProfilesAdded || 0,
    pendingLiveCorePkProfileSignalsAttached: pendingLiveCore?.pkProfileSignalsAttached || 0,
    pendingLiveCorePgxGenesAdded: pendingLiveCore?.pgxGenesAdded || 0,
    pendingLiveCorePgxEvidencePairsAdded: pendingLiveCore?.pgxEvidencePairsAdded || 0,
    pendingLiveCorePhenotypeProfilesAdded: pendingLiveCore?.phenotypeProfilesAdded || 0,
    pendingLiveCorePhenotypeSignalsAttached: pendingLiveCore?.phenotypeSignalsAttached || 0,
    pendingLiveCoreBeersFlagsAdded: pendingLiveCore?.beersFlagsAdded || 0,
    pendingLiveCoreBeersSignalsAttached: pendingLiveCore?.beersSignalsAttached || 0,
    pendingLiveCoreWashoutRulesAdded: pendingLiveCore?.washoutRulesAdded || 0,
    pendingLiveCoreWashoutSignalsAttached: pendingLiveCore?.washoutSignalsAttached || 0,
    pendingLiveReceptorProfilesAdded: pendingLiveReceptor?.receptorProfilesAdded || 0,
    pendingLiveReceptorSignalsAttached: pendingLiveReceptor?.receptorSignalsAttached || 0,
    candidateExpandedDrugs: candidateExpandedCounts.drugs || DRUG_DB.length,
    candidateExpandedStudies: candidateExpandedCounts.evidenceEntries || studyValues.length,
    candidateExpandedDdiPairs: candidateExpandedCounts.interactionPairs || KNOWN_DDI.length,
    candidateExpandedMetaboliteEntries: candidateExpandedCounts.metaboliteEntries || metaboliteEntries,
    candidateExpandedPkProfiles: candidateExpandedCounts.pkProfiles || pkParams.length,
    candidateExpandedGenotypeGenes: candidateExpandedCounts.genotypeGenes || liveGenotypeGeneKeys.size,
    candidateExpandedReceptorProfiles: candidateExpandedCounts.receptorScoreProfiles || Object.keys(RECEPTOR_SCORES).length,
    candidateExpandedBeersFlags: candidateExpandedCounts.beersFlags || Object.keys(BEERS_FLAGS).length,
    candidateExpandedWashoutRules: candidateExpandedCounts.washoutRules || Object.keys(WASHOUT_DAYS).length,
    internalReviewRequiredEntries: studyValues.filter((study) => study.reviewRequired === true).length,
    studiesWithPmid: studyValues.filter((study) => !!study.pmid).length,
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
  };
})())`;

  return JSON.parse(vm.runInNewContext(code, { console }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(`${JSON.stringify(collectStats(), null, 2)}\n`);
}
