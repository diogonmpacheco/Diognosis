// Diognosis - external clinical standards bridge
// Keeps runtime local while exposing source-linked identity and PGx action context.

const CLINICAL_STANDARDS_VERSION = "2026-06-18-first-pass";

const EXTERNAL_ID_SYSTEMS = Object.freeze({
  RXNORM: "RxNorm",
  DBSNP: "dbSNP",
  PHARMVAR: "PharmVar",
  HLA: "HLA nomenclature",
  CPIC: "CPIC",
});

const EXTERNAL_SUBSTANCE_MAPPINGS = Object.freeze([
  { substance:"Allopurinol", rxnormCui:"519", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Amiodarone", rxnormCui:"703", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Amitriptyline", rxnormCui:"704", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Bupropion", rxnormCui:"42347", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Clarithromycin", rxnormCui:"21212", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Clopidogrel", rxnormCui:"32968", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Codeine", rxnormCui:"2670", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Dapsone", rxnormCui:"3108", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Diazepam", rxnormCui:"3322", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Diphenhydramine", rxnormCui:"3498", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Warfarin", rxnormCui:"11289", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Simvastatin", rxnormCui:"36567", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Tacrolimus", rxnormCui:"42316", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Fluorouracil", rxnormCui:"4492", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Capecitabine", rxnormCui:"194000", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Ibuprofen", rxnormCui:"5640", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Irinotecan", rxnormCui:"51499", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Mercaptopurine", rxnormCui:"103", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Nebivolol", rxnormCui:"31555", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Thioguanine", rxnormCui:"10485", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Azathioprine", rxnormCui:"1256", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Omeprazole", rxnormCui:"7646", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Oxycodone", rxnormCui:"7804", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Pantoprazole", rxnormCui:"40790", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Paroxetine", rxnormCui:"32937", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Fluoxetine", rxnormCui:"4493", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Primaquine", rxnormCui:"8687", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Prasugrel", rxnormCui:"613391", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Rasburicase", rxnormCui:"283821", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Succinylcholine", rxnormCui:"10154", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Ticagrelor", rxnormCui:"1116632", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Morphine", rxnormCui:"7052", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
]);

const PGX_MARKER_MAPPINGS = Object.freeze({
  CYP2C19: Object.freeze([
    { label:"CYP2C19*2", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs4244285", interpretation:"no-function allele context" },
    { label:"CYP2C19*3", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs4986893", interpretation:"no-function allele context" },
    { label:"CYP2C19*17", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs12248560", interpretation:"increased-function allele context" },
  ]),
  CYP2D6: Object.freeze([
    { label:"CYP2D6*4", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs3892097", interpretation:"no-function allele context" },
    { label:"CYP2D6*10", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs1065852", interpretation:"decreased-function allele context" },
    { label:"CYP2D6*41", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs28371725", interpretation:"decreased-function allele context" },
  ]),
  CYP2C9: Object.freeze([
    { label:"CYP2C9*2", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs1799853", interpretation:"decreased-function allele context" },
    { label:"CYP2C9*3", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs1057910", interpretation:"decreased-function allele context" },
  ]),
  CYP3A5: Object.freeze([
    { label:"CYP3A5*3", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs776746", interpretation:"splice-defect/non-expresser allele context" },
    { label:"CYP3A5*6", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs10264272", interpretation:"splice-defect/non-expresser allele context" },
    { label:"CYP3A5*7", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs41303343", interpretation:"frameshift/non-expresser allele context" },
  ]),
  VKORC1: Object.freeze([
    { label:"VKORC1 -1639G>A", system:EXTERNAL_ID_SYSTEMS.DBSNP, dbsnp:"rs9923231", interpretation:"warfarin sensitivity context" },
  ]),
  SLCO1B1: Object.freeze([
    { label:"SLCO1B1 c.521T>C / *5", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs4149056", interpretation:"reduced OATP1B1 uptake context" },
  ]),
  DPYD: Object.freeze([
    { label:"DPYD*2A", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs3918290", interpretation:"no-function allele context" },
    { label:"DPYD c.2846A>T", system:EXTERNAL_ID_SYSTEMS.DBSNP, dbsnp:"rs67376798", interpretation:"decreased-function allele context" },
    { label:"DPYD c.1679T>G", system:EXTERNAL_ID_SYSTEMS.DBSNP, dbsnp:"rs55886062", interpretation:"decreased-function allele context" },
  ]),
  TPMT: Object.freeze([
    { label:"TPMT*3B", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs1800460", interpretation:"decreased/no-function allele context" },
    { label:"TPMT*3C", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs1142345", interpretation:"decreased/no-function allele context" },
  ]),
  NUDT15: Object.freeze([
    { label:"NUDT15 c.415C>T", system:EXTERNAL_ID_SYSTEMS.DBSNP, dbsnp:"rs116855232", interpretation:"decreased/no-function allele context" },
  ]),
  "HLA-B": Object.freeze([
    { label:"HLA-B*57:01", system:EXTERNAL_ID_SYSTEMS.HLA, interpretation:"abacavir hypersensitivity risk-marker context" },
    { label:"HLA-B*15:02", system:EXTERNAL_ID_SYSTEMS.HLA, interpretation:"aromatic anticonvulsant severe cutaneous adverse reaction context" },
  ]),
});

const PGX_ACTION_SUMMARIES = Object.freeze([
  {
    id:"pgx_action_clopidogrel_cyp2c19_reduced_function",
    drug:"Clopidogrel",
    gene:"CYP2C19",
    phenotypes:[GENOTYPE_PHENOTYPE.PM, GENOTYPE_PHENOTYPE.IM],
    level:"A",
    source:"CPIC",
    guidelineUrl:"https://www.clinpgx.org/guideline/PA166251443",
    title:"CPIC-linked clopidogrel activation review",
    whatChanged:"Reduced CYP2C19 function can lower clopidogrel active-thiol formation.",
    reviewDirection:"Review the indication and whether a non-CYP2C19-dependent P2Y12 option such as prasugrel or ticagrelor is appropriate and not contraindicated.",
    safetyBoundary:"Do not treat this as automatic substitution advice; bleeding risk, indication, procedure timing, and contraindications still decide.",
    evidenceRefs:["ev_clopidogrel_cyp2c19_cpic","ev_clopidogrel_active_thiol_kim2014"],
  },
  {
    id:"pgx_action_codeine_cyp2d6_extreme_function",
    drug:"Codeine",
    gene:"CYP2D6",
    phenotypes:[GENOTYPE_PHENOTYPE.PM, GENOTYPE_PHENOTYPE.UM],
    level:"A",
    source:"CPIC",
    guidelineUrl:"https://www.clinpgx.org/guideline/PA166251454",
    title:"CPIC-linked codeine activation review",
    whatChanged:"CYP2D6 poor metabolism can reduce morphine formation, while ultrarapid metabolism can increase active-metabolite toxicity risk.",
    reviewDirection:"Review whether codeine should be avoided in favor of an analgesic plan that does not depend on CYP2D6 activation.",
    safetyBoundary:"Pain indication, age, respiratory risk, opioid tolerance, and local protocols still govern the final choice.",
    evidenceRefs:["ev_codeine_cyp2d6_cpic","ev_cyp2d6_codeine_genotype"],
  },
  {
    id:"pgx_action_warfarin_cyp2c9_reduced_function",
    drug:"Warfarin",
    gene:"CYP2C9",
    phenotypes:[GENOTYPE_PHENOTYPE.PM, GENOTYPE_PHENOTYPE.IM],
    level:"A",
    source:"CPIC",
    guidelineUrl:"https://www.clinpgx.org/guideline/PA166251465",
    title:"CPIC-linked warfarin dosing-context review",
    whatChanged:"Reduced CYP2C9 function can lower warfarin clearance and increase dose sensitivity.",
    reviewDirection:"Use genotype-aware warfarin dosing context together with VKORC1/CYP4F2, clinical factors, and INR-guided adjustment.",
    safetyBoundary:"This app does not calculate a patient-specific warfarin dose; INR and anticoagulation protocol remain mandatory.",
    evidenceRefs:["ev_warfarin_cyp2c9_vkorc1_cyp4f2_cpic2017"],
  },
  {
    id:"pgx_action_warfarin_vkorc1_sensitivity",
    drug:"Warfarin",
    gene:"VKORC1",
    phenotypes:[GENOTYPE_PHENOTYPE.PM, GENOTYPE_PHENOTYPE.IM],
    level:"A",
    source:"CPIC",
    guidelineUrl:"https://www.clinpgx.org/guideline/PA166251465",
    title:"CPIC-linked warfarin sensitivity review",
    whatChanged:"VKORC1 sensitivity context can lower warfarin dose requirement.",
    reviewDirection:"Interpret VKORC1 with CYP2C9/CYP4F2, age, size, diet, interacting drugs, and INR response.",
    safetyBoundary:"This is algorithm context, not a standalone dosing instruction.",
    evidenceRefs:["ev_warfarin_cyp2c9_vkorc1_cyp4f2_cpic2017"],
  },
  {
    id:"pgx_action_simvastatin_slco1b1_reduced_function",
    drug:"Simvastatin",
    gene:"SLCO1B1",
    phenotypes:[GENOTYPE_PHENOTYPE.PM, GENOTYPE_PHENOTYPE.IM],
    level:"A",
    source:"CPIC",
    guidelineUrl:"https://www.clinpgx.org/guideline/PA166251447",
    title:"CPIC-linked simvastatin myopathy-risk review",
    whatChanged:"Reduced SLCO1B1/OATP1B1 function can raise simvastatin acid exposure.",
    reviewDirection:"Review statin selection, dose intensity, interacting drugs, and myopathy monitoring before relying on standard simvastatin assumptions.",
    safetyBoundary:"ASCVD risk target, prior tolerance, CK/symptoms, and interacting drugs still determine the plan.",
    evidenceRefs:["ev_statin_slco1b1_abcg2_cpic2022","ev_simvastatin_multigene_choi2016"],
  },
  {
    id:"pgx_action_tacrolimus_cyp3a5_expression",
    drug:"Tacrolimus",
    gene:"CYP3A5",
    phenotypes:[GENOTYPE_PHENOTYPE.IM, GENOTYPE_PHENOTYPE.UM],
    level:"A",
    source:"CPIC",
    guidelineUrl:"https://www.clinpgx.org/guideline/PA166251455",
    title:"CPIC-linked tacrolimus expresser review",
    whatChanged:"CYP3A5 expresser status can increase tacrolimus clearance relative to non-expressers.",
    reviewDirection:"Use transplant-team genotype context with trough targets, organ type, interacting drugs, kidney function, and time after transplant.",
    safetyBoundary:"Tacrolimus is narrow-index; therapeutic drug monitoring and specialist protocol dominate.",
    evidenceRefs:["ev_tacrolimus_cyp3a5_cpic","ev_tacrolimus_cyp3a5_consensus"],
  },
  {
    id:"pgx_action_fluoropyrimidine_dpyd_reduced_function",
    drugs:["Capecitabine","Fluorouracil"],
    gene:"DPYD",
    phenotypes:[GENOTYPE_PHENOTYPE.PM, GENOTYPE_PHENOTYPE.IM],
    level:"A",
    source:"CPIC",
    guidelineUrl:"https://www.clinpgx.org/guideline/PA166251462",
    title:"CPIC-linked fluoropyrimidine toxicity review",
    whatChanged:"Reduced DPYD function can impair 5-FU catabolism and sharply increase fluoropyrimidine toxicity risk.",
    reviewDirection:"Review oncology protocol, whether fluoropyrimidines should be avoided or started with a major dose reduction, and whether additional DPYD testing is needed.",
    safetyBoundary:"Cancer regimen, organ function, prior toxicity, and oncology protocol decide the final treatment path.",
    evidenceRefs:["ev_fluorouracil_dpyd_amstutz2018"],
  },
  {
    id:"pgx_action_thiopurine_tpmt_reduced_function",
    drugs:["Azathioprine","Mercaptopurine"],
    gene:"TPMT",
    phenotypes:[GENOTYPE_PHENOTYPE.PM, GENOTYPE_PHENOTYPE.IM],
    level:"A",
    source:"CPIC",
    guidelineUrl:"https://www.clinpgx.org/guideline/PA166251442",
    title:"CPIC-linked thiopurine TPMT review",
    whatChanged:"Reduced TPMT activity can shift thiopurine metabolism toward cytotoxic 6-TGN exposure.",
    reviewDirection:"Review thiopurine dose strategy, alternatives, CBC monitoring, and NUDT15 status before relying on a standard dose.",
    safetyBoundary:"Disease protocol, leukocyte counts, liver tests, and specialist monitoring remain decisive.",
    evidenceRefs:["ev_azathioprine_tpmt_cpic2019","ev_thiopurine_tpmt_nudt15_cpic2025"],
  },
  {
    id:"pgx_action_thiopurine_nudt15_reduced_function",
    drugs:["Azathioprine","Mercaptopurine","Thioguanine"],
    gene:"NUDT15",
    phenotypes:[GENOTYPE_PHENOTYPE.PM, GENOTYPE_PHENOTYPE.IM],
    level:"A",
    source:"CPIC",
    guidelineUrl:"https://www.clinpgx.org/guideline/PA166251442",
    title:"CPIC-linked thiopurine NUDT15 review",
    whatChanged:"Reduced NUDT15 function can increase DNA-thioguanine toxicity and myelosuppression risk.",
    reviewDirection:"Review thiopurine dose strategy, alternatives, CBC monitoring, and TPMT status before relying on a standard dose.",
    safetyBoundary:"Disease protocol, leukocyte counts, liver tests, and specialist monitoring remain decisive.",
    evidenceRefs:["ev_thiopurine_tpmt_nudt15_cpic2025"],
  },
]);

function clinicalStandardKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function mappedDrugNamesForAction(row = {}) {
  return [...new Set([row.drug, ...(row.drugs || [])].filter(Boolean))];
}

function getExternalSubstanceMapping(name) {
  const drug = typeof getDrug === "function" ? getDrug(name) : null;
  const keys = [name, drug?.name, drug?.id].map(clinicalStandardKey).filter(Boolean);
  return (EXTERNAL_SUBSTANCE_MAPPINGS || []).find(row =>
    keys.includes(clinicalStandardKey(row.substance))
  ) || null;
}

function getExternalIdentifiersForSubstance(name) {
  const mapping = getExternalSubstanceMapping(name);
  if (!mapping) return [];
  return [{
    system:EXTERNAL_ID_SYSTEMS.RXNORM,
    id:mapping.rxnormCui,
    label:`RxNorm ${mapping.rxnormCui}`,
    source:mapping.source,
    confidence:mapping.confidence,
    scope:mapping.scope,
  }];
}

function getPgxMarkerMappings(gene) {
  const key = String(gene || "").toUpperCase();
  return PGX_MARKER_MAPPINGS[key] || [];
}

function pgxActionSummaryMatches(row, stack = [], genotypeState = {}) {
  const stackKeys = new Set((stack || []).map(clinicalStandardKey));
  const drugHit = mappedDrugNamesForAction(row).some(name => stackKeys.has(clinicalStandardKey(name)));
  if (!drugHit || !row.gene) return false;
  const phenotype = genotypeState[row.gene];
  return (row.phenotypes || []).includes(phenotype);
}

function getPgxActionSummariesForStack(stack = [], genotypeState = {}) {
  return (PGX_ACTION_SUMMARIES || [])
    .filter(row => pgxActionSummaryMatches(row, stack, genotypeState))
    .map(row => ({
      ...row,
      matchedDrugs:mappedDrugNamesForAction(row).filter(name =>
        (stack || []).some(stackName => clinicalStandardKey(stackName) === clinicalStandardKey(name))
      ),
      phenotype:genotypeState[row.gene],
      markerMappings:getPgxMarkerMappings(row.gene),
    }));
}

function getPgxActionSummaryForDrugGene(drugName, gene, phenotype) {
  return (PGX_ACTION_SUMMARIES || []).find(row =>
    row.gene === gene &&
    (row.phenotypes || []).includes(phenotype) &&
    mappedDrugNamesForAction(row).some(name => clinicalStandardKey(name) === clinicalStandardKey(drugName))
  ) || null;
}

function isSelectedGenotypePhenotype(gene, phenotype) {
  if (!gene || !phenotype) return false;
  if (phenotype === GENOTYPE_PHENOTYPE.NM) return false;
  if (typeof GENOTYPE_RISK_STATUS !== "undefined" && phenotype === GENOTYPE_RISK_STATUS.ABSENT) return false;
  return true;
}

function buildClinicalStandardsCoverage(stack = [], genotypeState = {}) {
  const selected = [...new Set(stack || [])].filter(Boolean);
  const recognizedDrugs = selected.filter(name => typeof getDrug === "function" && getDrug(name));
  const mappedSubstances = recognizedDrugs.map(name => ({
    name:(typeof getDrug === "function" ? getDrug(name)?.name : name) || name,
    identifiers:getExternalIdentifiersForSubstance(name),
  }));
  const mappedDrugs = mappedSubstances.filter(row => row.identifiers.length);
  const unmappedDrugs = mappedSubstances.filter(row => !row.identifiers.length);
  const selectedGenotypes = Object.entries(genotypeState || {})
    .filter(([gene, phenotype]) => isSelectedGenotypePhenotype(gene, phenotype));
  const markerMappings = selectedGenotypes.map(([gene, phenotype]) => ({
    gene,
    phenotype,
    markers:getPgxMarkerMappings(gene),
  }));
  const markerMapped = markerMappings.filter(row => row.markers.length);
  const pgxActions = getPgxActionSummariesForStack(selected, genotypeState);
  const systemsPresent = [...new Set([
    ...mappedDrugs.flatMap(row => row.identifiers.map(item => item.system)),
    ...markerMapped.flatMap(row => row.markers.map(marker => marker.system)),
    ...pgxActions.map(row => row.source).filter(Boolean),
  ])].filter(Boolean);
  const limitations = [
    unmappedDrugs.length
      ? `${unmappedDrugs.length} recognized selected medication${unmappedDrugs.length === 1 ? "" : "s"} lack local RxNorm identity mappings.`
      : "Selected recognized medications have local RxNorm identity mappings where medication identity standards are currently supported.",
    selectedGenotypes.length && markerMapped.length < selectedGenotypes.length
      ? `${selectedGenotypes.length - markerMapped.length} selected gene or marker result${selectedGenotypes.length - markerMapped.length === 1 ? "" : "s"} lack local star-allele, dbSNP, or HLA mapping rows.`
      : selectedGenotypes.length
        ? "Selected gene or marker results have local PGx marker identity rows where currently supported."
        : "No selected gene or marker result requires PGx marker identity mapping.",
    "SNOMED CT diagnosis/symptom mapping is not used because this review does not ingest diagnoses or symptoms.",
  ];
  return {
    version:"v1-clinical-standards-coverage-1",
    selectedCount:selected.length,
    recognizedDrugCount:recognizedDrugs.length,
    mappedDrugCount:mappedDrugs.length,
    unmappedDrugCount:unmappedDrugs.length,
    mappedSubstances:mappedDrugs,
    unmappedSubstances:unmappedDrugs.map(row => row.name),
    genotypeCount:selectedGenotypes.length,
    markerMappedGeneCount:markerMapped.length,
    markerMappingCount:markerMapped.reduce((sum, row) => sum + row.markers.length, 0),
    markerMappings:markerMapped,
    pgxActionCount:pgxActions.length,
    pgxActions,
    systemsPresent,
    limitations,
    ready:true,
  };
}
