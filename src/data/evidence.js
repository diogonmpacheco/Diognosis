// MedCheck — Study database and evidence ingestion pipeline
// Phase A: modular source — concatenated by build.js

const STUDY_DB = {

  // ═══ PAROXETINE / CYP2D6 ═══
  "ev_paroxetine_cyp2d6_fda": {
    id:"ev_paroxetine_cyp2d6_fda",
    type:EVIDENCE_TIER.FDA_LABEL,
    title:"Paxil (paroxetine) Prescribing Information — Drug Interactions",
    year:2023, source:"FDA / GSK",
    pmid:null, doi:null, url:"https://www.accessdata.fda.gov/scripts/cder/daf/",
    studyDesign:"regulatory_label", n:null,
    phenotypes:["normal_metabolizer"],
    quantifiedEffects:{
      note:"Paroxetine is a potent mechanism-based inhibitor of CYP2D6; co-administration with desipramine increases desipramine AUC ~5×",
      aucFold:5.0, clearanceReductionPct:80
    },
    temporal:{onset:"days", washout:"2-3_weeks", mechanism:"MBI_irreversible"},
    supports:["paroxetine_inhibits_CYP2D6"],
    contradicts:[],
    limitations:["Label does not distinguish NM vs IM phenotype magnitude","Dose used in study may not reflect all clinical doses"],
    verified:true
  },

  "ev_paroxetine_cyp2d6_bloomer1992": {
    id:"ev_paroxetine_cyp2d6_bloomer1992",
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Paroxetine: mechanism of action and pharmacokinetics",
    year:1992, source:"Bloomer et al.", journal:"J Clin Psychiatry",
    pmid:"1531823", doi:null,
    studyDesign:"healthy_volunteer_crossover", n:10,
    phenotypes:["normal_metabolizer"],
    quantifiedEffects:{aucFold:null, note:"Demonstrated time-dependent (MBI) CYP2D6 inhibition distinct from competitive inhibition"},
    temporal:{mechanism:"mechanism_based_inhibition", washout:"2_weeks"},
    supports:["paroxetine_inhibits_CYP2D6"],
    contradicts:[],
    limitations:["Small n","Single dose design"],
    verified:true
  },

  // ═══ FLUOXETINE / NORFLUOXETINE / CYP2D6 ═══
  "ev_fluoxetine_cyp2d6_fda": {
    id:"ev_fluoxetine_cyp2d6_fda",
    type:EVIDENCE_TIER.FDA_LABEL,
    title:"Prozac (fluoxetine) Prescribing Information — Drug Interactions",
    year:2023, source:"FDA / Lilly",
    pmid:null, doi:null,
    url:"https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=fluoxetine",
    studyDesign:"regulatory_label", n:null,
    phenotypes:["normal_metabolizer"],
    quantifiedEffects:{
      aucFold:null, note:"Strong CYP2D6 inhibitor; active metabolite norfluoxetine (t½ 4-16 days) responsible for prolonged inhibition; CYP2D6 inhibition persists weeks after drug discontinuation"
    },
    temporal:{onset:"1-2_weeks", washout:"5_weeks", mechanism:"MBI_via_norfluoxetine"},
    supports:["fluoxetine_inhibits_CYP2D6","norfluoxetine_inhibits_CYP2D6"],
    contradicts:[],
    limitations:["Washout duration variable by dose and duration of treatment"],
    verified:true
  },

  "ev_fluoxetine_desipramine_preskorn1994": {
    id:"ev_fluoxetine_desipramine_preskorn1994",
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Pharmacokinetics of desipramine coadministered with sertraline or fluoxetine",
    year:1994, source:"Preskorn et al.", journal:"J Clin Psychopharmacol",
    pmid:null, doi:null,
    url:"https://journals.lww.com/psychopharmacology/abstract/1994/04000/pharmacokinetics_of_desipramine_coadministered.2.aspx",
    studyDesign:"healthy_volunteer_single_dose", n:18,
    phenotypes:["normal_metabolizer"],
    quantifiedEffects:{aucFold:4.8, cmaxFold:4.0, note:"Fluoxetine + desipramine: desipramine AUC0-24 ↑4.8× and Cmax ↑4.0× in extensive metabolizers after 3 weeks"},
    temporal:{onset:"steady_state_2_weeks"},
    supports:["fluoxetine_inhibits_CYP2D6","norfluoxetine_inhibits_CYP2D6"],
    contradicts:[],
    limitations:["Short-interval AUC0-24 interaction study","Extensive metabolizers only"],
    verified:true
  },

  "ev_fluoxetine_cyp2d6_sunkara2010": {
    id:"ev_fluoxetine_cyp2d6_sunkara2010",
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Stereoselective pharmacokinetics of fluoxetine and norfluoxetine in CYP2D6 poor and extensive metabolizers",
    year:2010, source:"Sunkara et al.", journal:"J Clin Pharmacol",
    pmid:"20184222", doi:"10.1002/jcph.39",
    studyDesign:"phenotype-stratified clinical PK study",
    n:null,
    phenotypes:["poor_metabolizer","normal_metabolizer"],
    quantifiedEffects:{
      parentAucFold_PM:2.3,
      norfluoxetineReductionPct_PM:50,
      note:"CYP2D6 PMs had higher fluoxetine exposure and lower norfluoxetine exposure; single-dose S-fluoxetine differences can be larger than steady-state expectations."
    },
    temporal:{mechanism:"CYP2D6_N_demethylation_to_norfluoxetine"},
    supports:["fluoxetine_METABOLIZED_TO_norfluoxetine","fluoxetine_cyp2d6_genotype_exposure"],
    contradicts:[],
    limitations:["Single-dose data","Small phenotype-stratified cohort","Steady-state autoinhibition may compress genotype differences"],
    verified:true
  },

  // ═══ BUPROPION / HYDROXYBUPROPION / CYP2D6 ═══
  "ev_bupropion_cyp2d6_fda": {
    id:"ev_bupropion_cyp2d6_fda",
    type:EVIDENCE_TIER.FDA_LABEL,
    title:"Wellbutrin (bupropion) Prescribing Information — Drug Interactions",
    year:2023, source:"FDA / GSK",
    pmid:null, doi:null,
    url:"https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=bupropion",
    studyDesign:"regulatory_label", n:null,
    phenotypes:["normal_metabolizer"],
    quantifiedEffects:{
      aucFold:5.0, note:"Bupropion + desipramine: desipramine AUC ↑5× (active metabolite hydroxybupropion is primary CYP2D6 inhibitor)",
      clearanceReductionPct:78
    },
    temporal:{onset:"days", washout:"4-5_days", mechanism:"competitive_via_hydroxybupropion"},
    supports:["hydroxybupropion_inhibits_CYP2D6","bupropion_cyp2d6_ddi"],
    contradicts:[],
    limitations:["Hydroxybupropion t½ 20h drives washout, not bupropion t½ 12h"],
    verified:true
  },

  "ev_bupropion_cyp2d6_kotlyar2005": {
    id:"ev_bupropion_cyp2d6_kotlyar2005",
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Inhibition of CYP2D6 activity by bupropion",
    year:2005, source:"Kotlyar et al.", journal:"J Clin Psychopharmacol",
    pmid:"15876900", doi:"10.1097/01.jcp.0000162805.46453.e3",
    studyDesign:"repeated_measures_probe", n:21,
    phenotypes:["extensive_metabolizer"],
    quantifiedEffects:{note:"Bupropion shifted CYP2D6 probe metabolic ratios toward poor-metabolizer range in 6 of 13 treated extensive metabolizers"},
    temporal:{onset:"days_to_steady_state"},
    supports:["hydroxybupropion_inhibits_CYP2D6"],
    contradicts:[],
    limitations:["Dextromethorphan probe study; clinical magnitude may differ for specific CYP2D6 substrates"],
    verified:true
  },

  "ev_bupropion_cyp2d6_hesse1996": {
    id:"ev_bupropion_cyp2d6_hesse1996",
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Bupropion plasma levels and CYP2D6 phenotype",
    year:1996, source:"Hesse et al.", journal:"Therapeutic Drug Monitoring",
    pmid:"8885123", doi:null,
    studyDesign:"phenotype-stratified TDM analysis",
    n:null,
    phenotypes:["poor_metabolizer","normal_metabolizer"],
    quantifiedEffects:{
      note:"Hydroxybupropion plasma level/dose ratios were significantly higher in CYP2D6 poor metabolizers; fold magnitude not calibrated in the current model."
    },
    temporal:{mechanism:"metabolite_clearance_or_ratio_shift"},
    supports:["hydroxybupropion_cyp2d6_genotype_exposure","hydroxybupropion_inhibits_CYP2D6"],
    contradicts:[],
    limitations:["Older TDM study","Exact fold-change not encoded","Bupropion formation remains primarily CYP2B6-dependent"],
    verified:true
  },

  // ═══ CODEINE / MORPHINE / CYP2D6 ═══
  "ev_codeine_cyp2d6_cpic": {
    id:"ev_codeine_cyp2d6_cpic",
    type:EVIDENCE_TIER.GUIDELINE,
    title:"CPIC Guideline for Codeine and CYP2D6",
    year:2014, source:"CPIC / PharmGKB",
    pmid:"24458010", doi:"10.1038/clpt.2013.254",
    studyDesign:"systematic_review_guideline", n:null,
    phenotypes:["poor_metabolizer","ultrarapid_metabolizer","normal_metabolizer"],
    quantifiedEffects:{
      note:"PM: near-zero morphine formation → therapeutic failure. UM: toxic morphine accumulation → fatalities reported.",
      morphineAUC_PM:"near_zero", morphineAUC_UM:"3-5×_normal"
    },
    temporal:{},
    supports:["codeine_METABOLIZED_TO_morphine","codeine_cyp2d6_dependence"],
    contradicts:[],
    limitations:["Recommendation strength varies by phenotype; intermediate metabolizers show intermediate response"],
    verified:true
  },

  "ev_codeine_ultrarapid_deaths": {
    id:"ev_codeine_ultrarapid_deaths",
    type:EVIDENCE_TIER.CASE_REPORT,
    title:"Fatal respiratory depression in neonates — mother CYP2D6 ultrarapid metabolizer on codeine",
    year:2006, source:"Koren et al.", journal:"Lancet",
    pmid:"16950362", doi:"10.1016/S0140-6736(06)69255-6",
    studyDesign:"case_report", n:1,
    phenotypes:["ultrarapid_metabolizer"],
    quantifiedEffects:{note:"Infant death; mother genotyped as CYP2D6*1/*2 ×N (gene duplication)"},
    temporal:{},
    supports:["codeine_cyp2d6_dependence"],
    contradicts:[],
    limitations:["Single case; neonatal exposure via breast milk is unique route","Subsequent WHO guidance updated (2015)"],
    verified:true
  },

  // ═══ DXM / DEXTRORPHAN / CYP2D6 ═══
  "ev_dxm_dextrorphan_cyp2d6": {
    id:"ev_dxm_dextrorphan_cyp2d6",
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Pharmacokinetics of dextromethorphan and metabolites in humans: influence of CYP2D6 phenotype and quinidine inhibition",
    year:1995, source:"Clinical Pharmacology & Therapeutics",
    pmid:"7593709", doi:null,
    studyDesign:"phenotype-stratified clinical PK study",
    n:null,
    phenotypes:["poor_metabolizer","normal_metabolizer"],
    quantifiedEffects:{poorMetabolizerParentHalfLife_h:29.5, note:"Dextromethorphan is primarily metabolized to dextrorphan by CYP2D6; in poor metabolizers, parent dextromethorphan predominated in plasma and half-life was prolonged."},
    temporal:{mechanism:"CYP2D6_O-demethylation_to_dextrorphan"},
    supports:["dextromethorphan_METABOLIZED_TO_dextrorphan","dextromethorphan_cyp2d6_dependence"],
    contradicts:[],
    limitations:["Small poor-metabolizer subgroup","Probe-drug context; high-dose DXM behavior is nonlinear and not modeled for dosing"],
    verified:true
  },

  // ═══ TAMOXIFEN / ENDOXIFEN / CYP2D6 ═══
  "ev_tamoxifen_cyp2d6_cpic": {
    id:"ev_tamoxifen_cyp2d6_cpic",
    type:EVIDENCE_TIER.GUIDELINE,
    title:"CPIC Guideline for CYP2D6 and Tamoxifen",
    year:2018, source:"CPIC / PharmGKB",
    pmid:"29385237", doi:"10.1002/cpt.1007",
    studyDesign:"systematic_review_guideline", n:null,
    phenotypes:["poor_metabolizer","intermediate_metabolizer","normal_metabolizer"],
    quantifiedEffects:{
      note:"CYP2D6 PM: endoxifen levels ↓75%; breast cancer recurrence risk significantly increased vs NM",
      endoxifenReductionPct_PM:75
    },
    temporal:{},
    supports:["tamoxifen_METABOLIZED_TO_endoxifen","CYP2D6_inhibition_tamoxifen_failure"],
    contradicts:["ev_tamoxifen_cyp2d6_controversy"],
    limitations:["Observational data inconsistency across studies","Guideline notes ongoing debate about clinical outcomes"],
    verified:true
  },

  "ev_tamoxifen_endoxifen_borges2006": {
    id:"ev_tamoxifen_endoxifen_borges2006",
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Quantitative effect of CYP2D6 genotype and inhibitors on tamoxifen metabolism",
    year:2006, source:"Borges et al.", journal:"Clin Pharmacol Ther",
    pmid:"16815318", doi:"10.1016/j.clpt.2006.03.013",
    studyDesign:"genotype-stratified clinical PK study",
    n:null,
    phenotypes:["poor_metabolizer","intermediate_metabolizer","normal_metabolizer"],
    quantifiedEffects:{
      endoxifenRatio_PM:0.04,
      endoxifenRatio_NM:0.15,
      endoxifenReductionPct_PM:73,
      inhibitorEndoxifenReductionPct:72,
      note:"Endoxifen/N-desmethyltamoxifen ratio was markedly lower in CYP2D6 PMs; potent CYP2D6 inhibitors phenoconverted normal metabolizers toward PM-like endoxifen exposure."
    },
    temporal:{mechanism:"CYP2D6_endoxifen_formation"},
    supports:["tamoxifen_METABOLIZED_TO_endoxifen","CYP2D6_inhibition_tamoxifen_failure"],
    contradicts:[],
    limitations:["Metabolite ratio proxy rather than full endoxifen AUC","Clinical outcome linkage remains debated"],
    verified:true
  },

  "ev_tamoxifen_cyp2d6_controversy": {
    id:"ev_tamoxifen_cyp2d6_controversy",
    type:EVIDENCE_TIER.META_ANALYSIS,
    title:"Association between CYP2D6 phenotype and tamoxifen efficacy: meta-analysis of clinical outcome studies",
    year:2014, source:"Province et al.", journal:"Clin Pharmacol Ther",
    pmid:"24060820", doi:"10.1038/clpt.2013.186",
    studyDesign:"meta_analysis", n:null,
    phenotypes:["poor_metabolizer","normal_metabolizer"],
    quantifiedEffects:{note:"Did not find statistically significant difference in recurrence by CYP2D6 genotype across all studies"},
    temporal:{},
    supports:[],
    contradicts:["ev_tamoxifen_cyp2d6_cpic"],
    limitations:["Heterogeneous endpoint definitions","Concomitant CYP2D6 inhibitor use not always controlled","Post-hoc analyses dominant"],
    verified:true,
    note:"This contradictory evidence is scientifically valid — the clinical debate is unresolved. Both studies are represented."
  },

  // ═══ GRAPEFRUIT / BERGAMOTTIN / CYP3A4 ═══
  "ev_grapefruit_cyp3a4_bailey2013": {
    id:"ev_grapefruit_cyp3a4_bailey2013",
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Grapefruit-drug interactions: forbidden fruit or avoidable consequences?",
    year:2013, source:"Bailey et al.", journal:"CMAJ",
    pmid:"23184849", doi:"10.1503/cmaj.120951",
    studyDesign:"systematic_review", n:null,
    phenotypes:["normal_metabolizer"],
    quantifiedEffects:{aucFold:null, note:"List of 85 drugs with potential interaction; some AUC increases up to 15× for high-extraction CYP3A4 substrates"},
    temporal:{onset:"within_hours", washout:"24-72h", mechanism:"bergamottin_MBI_gut_CYP3A4"},
    supports:["bergamottin_inhibits_CYP3A4","grapefruit_cyp3a4_interaction"],
    contradicts:[],
    limitations:["Clinical significance varies widely by drug; not all CYP3A4 substrates equally affected"],
    verified:true
  },

  "ev_grapefruit_bailey1991": {
    id:"ev_grapefruit_bailey1991",
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Interaction of citrus juices with felodipine and nifedipine",
    year:1991, source:"Bailey et al.", journal:"Lancet",
    pmid:"1671423", doi:"10.1016/0140-6736(91)91687-T",
    studyDesign:"crossover", n:6,
    phenotypes:["normal_metabolizer"],
    quantifiedEffects:{aucFold:2.8, cmaxFold:3.4, note:"Original grapefruit-felodipine interaction discovery; AUC ↑2.8×, Cmax ↑3.4×"},
    temporal:{onset:"within_4h", washout:"24h"},
    supports:["bergamottin_inhibits_CYP3A4"],
    contradicts:[],
    limitations:["Single dose","Small n","Accidental discovery — study initially designed for alcohol interaction"],
    verified:true
  },

  // ═══ CLOPIDOGREL / CYP2C19 ═══
  "ev_clopidogrel_cyp2c19_cpic": {
    id:"ev_clopidogrel_cyp2c19_cpic",
    type:EVIDENCE_TIER.GUIDELINE,
    title:"Clinical Pharmacogenetics Implementation Consortium Guideline for CYP2C19 Genotype and Clopidogrel Therapy: 2022 Update",
    year:2022, source:"Lee et al. / CPIC",
    pmid:"35034351", doi:"10.1002/cpt.2526",
    studyDesign:"systematic_review_guideline", n:null,
    phenotypes:["poor_metabolizer","intermediate_metabolizer"],
    quantifiedEffects:{
      note:"CYP2C19 PM: active thiol metabolite AUC ↓40%; cardiovascular event risk ↑1.4× vs NM in stented patients",
      activeMetabReductionPct_PM:40
    },
    temporal:{},
    supports:["clopidogrel_CYP2C19_prodrug","omeprazole_clopidogrel_interaction"],
    contradicts:[],
    limitations:["Evidence strongest for PCI/stenting populations; less clear for other indications"],
    verified:true
  },

  "ev_clopidogrel_active_thiol_kim2014": {
    id:"ev_clopidogrel_active_thiol_kim2014",
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"CYP2C19 phenotype effect on clopidogrel active thiol metabolite exposure and platelet inhibition",
    year:2014, source:"Kim et al.",
    pmid:"25196410", doi:null,
    studyDesign:"genotype-stratified clinical PK/PD study",
    n:null,
    phenotypes:["poor_metabolizer","intermediate_metabolizer","normal_metabolizer"],
    quantifiedEffects:{
      activeMetaboliteAucFold_PM_day1:0.37,
      activeMetaboliteAucFold_PM_day7:0.34,
      activeMetaboliteCmaxFold_PM_day1:0.42,
      activeMetaboliteCmaxFold_PM_day7:0.39,
      note:"CYP2C19 PMs had substantially lower active thiol metabolite exposure and delayed/reduced inhibition of platelet aggregation."
    },
    temporal:{mechanism:"CYP2C19_clopidogrel_activation"},
    supports:["clopidogrel_CYP2C19_prodrug","clopidogrel_active_thiol_reduced_in_PM"],
    contradicts:[],
    limitations:["Genotype-stratified PK/PD endpoints; clinical outcome risk depends on indication and thrombotic risk"],
    verified:true
  },

  "ev_clopidogrel_cyp2c19_mega2009": {
    id:"ev_clopidogrel_cyp2c19_mega2009",
    type:EVIDENCE_TIER.RCT,
    title:"Cytochrome P-450 polymorphisms and response to clopidogrel",
    year:2009, source:"Mega et al.", journal:"N Engl J Med",
    pmid:"19106084", doi:"10.1056/NEJMoa0809171",
    studyDesign:"TRITON-TIMI 38 pharmacogenetic substudy",
    n:1477,
    phenotypes:["intermediate_metabolizer","poor_metabolizer","normal_metabolizer"],
    quantifiedEffects:{
      cvCompositeHazardRatio:1.53,
      stentThrombosisHazardRatio:3.09,
      note:"Reduced-function CYP2C19 carriers on clopidogrel had higher cardiovascular event and stent thrombosis risk in ACS/PCI."
    },
    temporal:{},
    supports:["clopidogrel_CYP2C19_prodrug","clopidogrel_LOF_outcome_risk"],
    contradicts:[],
    limitations:["Post-hoc pharmacogenetic substudy","Most applicable to ACS/PCI, not all clopidogrel indications"],
    verified:true
  },

  // ═══ ALPRAZOLAM / CYP3A5 ═══
  "ev_alprazolam_cyp3a5_park2006": {
    id:"ev_alprazolam_cyp3a5_park2006",
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Effect of CYP3A5*3 genotype on the pharmacokinetics and pharmacodynamics of alprazolam in healthy subjects",
    year:2006, source:"Park et al.", journal:"Clin Pharmacol Ther",
    pmid:"16765147", doi:"10.1016/j.clpt.2006.02.008",
    studyDesign:"genotype-stratified clinical PK/PD study",
    n:19,
    phenotypes:["normal_metabolizer","intermediate_metabolizer","poor_metabolizer"],
    quantifiedEffects:{
      auc_CYP3A5_1_1:599.9,
      auc_CYP3A5_3_3:830.5,
      aucFold_CYP3A5_3_3_vs_1_1:1.38,
      clearance_CYP3A5_1_1_L_h:3.5,
      clearance_CYP3A5_3_3_L_h:2.5,
      note:"CYP3A5*3/*3 non-expressors had significantly higher alprazolam AUC and lower oral clearance than CYP3A5*1/*1 expressors."
    },
    temporal:{mechanism:"CYP3A4_CYP3A5_hydroxylation"},
    supports:["alprazolam_METABOLIZED_BY_CYP3A5","alprazolam_cyp3a5_genotype_exposure"],
    contradicts:[],
    limitations:["Small healthy male volunteer study","Single 1 mg dose","Pharmacodynamic score trend did not reach statistical significance"],
    verified:true
  },

  // ═══ ATOMOXETINE / CYP2D6 ═══
  "ev_atomoxetine_cyp2d6_cpic": {
    id:"ev_atomoxetine_cyp2d6_cpic",
    type:EVIDENCE_TIER.GUIDELINE,
    title:"CPIC Guideline for CYP2D6 Genotype and Atomoxetine Therapy",
    year:2019, source:"CPIC / PharmGKB",
    pmid:"30801677", doi:"10.1002/cpt.1409",
    studyDesign:"systematic_review_guideline",
    n:null,
    phenotypes:["poor_metabolizer","intermediate_metabolizer","normal_metabolizer","ultrarapid_metabolizer"],
    quantifiedEffects:{note:"CYP2D6 phenotype strongly affects atomoxetine metabolism, exposure, and clinical management; 4-hydroxyatomoxetine formation is CYP2D6-dependent."},
    temporal:{mechanism:"CYP2D6_hydroxylation"},
    supports:["atomoxetine_METABOLIZED_TO_4-hydroxyatomoxetine","atomoxetine_cyp2d6_guideline"],
    contradicts:[],
    limitations:["Dose recommendations depend on age group, response, tolerability, and measured concentration where available"],
    verified:true
  },

  "ev_atomoxetine_cyp2d6_pbpk2018": {
    id:"ev_atomoxetine_cyp2d6_pbpk2018",
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Physiologically based pharmacokinetic modelling of atomoxetine with regard to CYP2D6 genotypes",
    year:2018, source:"British Journal of Clinical Pharmacology",
    pmid:"30120390", doi:null,
    studyDesign:"PBPK model evaluated against genotype-stratified atomoxetine PK",
    n:null,
    phenotypes:["poor_metabolizer","normal_metabolizer","ultrarapid_metabolizer"],
    quantifiedEffects:{note:"PBPK model describes atomoxetine pharmacokinetics after single and repeated oral doses with regard to CYP2D6 genotype and phenotype."},
    temporal:{mechanism:"CYP2D6_dependent_atomoxetine_clearance"},
    supports:["atomoxetine_cyp2d6_pk","atomoxetine_METABOLIZED_TO_4-hydroxyatomoxetine"],
    contradicts:[],
    limitations:["Model-based synthesis; specific metabolite concentrations depend on model assumptions and population"],
    verified:true
  },

  // ═══ SOLANIDINE / CYP2D6 ═══
  "ev_solanidine_cyp2d6_mock2001": {
    id:"ev_solanidine_cyp2d6_mock2001",
    type:EVIDENCE_TIER.IN_VITRO,
    title:"Metabolism of solanidine by human liver microsomes with cytochrome P450 isoform selectivity",
    year:2001, source:"Mock et al.", journal:"Xenobiotica",
    pmid:"11678145", doi:null,
    studyDesign:"in_vitro_microsomal", n:null,
    phenotypes:["normal_metabolizer"],
    quantifiedEffects:{note:"CYP2D6 and CYP3A4 are primary metabolizing enzymes for solanidine in human liver microsomes"},
    temporal:{},
    supports:["solanidine_SUBSTRATE_OF_CYP2D6"],
    contradicts:[],
    limitations:["In vitro only — clinical relevance at dietary exposure levels unestablished","No clinical PK data in humans"],
    verified:true,
    note:"Important caveat: in vitro CYP2D6 substrate finding does NOT establish clinical DDI — burden hypothesis is theoretical"
  },

  "ev_solanidine_cyp2d6_hellden2024": {
    id:"ev_solanidine_cyp2d6_hellden2024",
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Solanidine is a sensitive and specific dietary biomarker for CYP2D6 activity",
    year:2024, source:"Human Genomics",
    pmid:"38303026", doi:"10.1186/s40246-024-00579-8",
    url:"https://doi.org/10.1186/s40246-024-00579-8",
    studyDesign:"genotype-stratified metabolomics study in healthy volunteers",
    n:356,
    phenotypes:["poor_metabolizer","intermediate_metabolizer","normal_metabolizer","ultrarapid_metabolizer"],
    quantifiedEffects:{
      gPM_solanidineIncreasePct:1887,
      gIM_solanidineIncreasePct:74,
      gUM_solanidineDecreasePct:35,
      note:"Plasma solanidine concentration was markedly higher in genetic CYP2D6 poor metabolizers, higher in intermediate metabolizers, and lower in ultrarapid metabolizers vs normal metabolizers."
    },
    temporal:{mechanism:"dietary_solanidine_cyp2d6_biomarker"},
    supports:["solanidine_SUBSTRATE_OF_CYP2D6","solanidine_cyp2d6_genotype_biomarker"],
    contradicts:[],
    limitations:["Dietary potato intake was not directly standardized","Solanidine is a biomarker of CYP2D6 activity, not by itself a clinical toxicity threshold"],
    verified:true
  },

  "ev_solanidine_ache_griffin1995": {
    id:"ev_solanidine_ache_griffin1995",
    type:EVIDENCE_TIER.IN_VITRO,
    title:"Inhibition of cholinesterase by potato glycoalkaloids",
    year:1995, source:"Griffin et al.", journal:"Phytother Res",
    pmid:"7544290", doi:null,
    studyDesign:"in_vitro_enzyme_assay", n:null,
    phenotypes:[],
    quantifiedEffects:{note:"α-Chaconine and α-solanine inhibit AChE and BChE with IC50 in µM range"},
    temporal:{},
    supports:["solanidine_inhibits_BChE","solanidine_inhibits_AChE"],
    contradicts:[],
    limitations:["IC50 values likely unachievable at normal dietary intake","No CNS penetration data"],
    verified:true
  },

  // ═══ AMPHETAMINE / METHAMPHETAMINE / MDMA / CYP2D6 ═══
  "ev_mdma_meth_cyp2d6_review": {
    id:"ev_mdma_meth_cyp2d6_review",
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"MDMA, methamphetamine, and CYP2D6 pharmacogenetics: what is clinically relevant?",
    year:2012, source:"Frontiers in Genetics",
    pmid:"23162568", doi:"10.3389/fgene.2012.00235",
    url:"https://doi.org/10.3389/fgene.2012.00235",
    studyDesign:"review of in vitro and human pharmacogenetic evidence",
    n:null,
    phenotypes:["poor_metabolizer","normal_metabolizer","ultrarapid_metabolizer"],
    quantifiedEffects:{note:"CYP2D6 regulates MDMA O-demethylenation to HHMA and contributes to methamphetamine aromatic hydroxylation and N-demethylation pathways; clinical genotype translation is complex."},
    temporal:{mechanism:"CYP2D6_amphetamine_like_substrate_and_MBI_context"},
    supports:["mdma_METABOLIZED_TO_HHMA","methamphetamine_METABOLIZED_TO_amphetamine","methamphetamine_METABOLIZED_TO_4-hydroxymethamphetamine","amphetamine_METABOLIZED_TO_4-hydroxyamphetamine"],
    contradicts:[],
    limitations:["Review article","In vitro-to-in vivo translation is imperfect","MDMA also causes mechanism-based CYP2D6 inhibition, so genotype effects can compress after exposure"],
    verified:true
  },

  "ev_amphetamine_cyp2d6_fda": {
    id:"ev_amphetamine_cyp2d6_fda",
    type:EVIDENCE_TIER.FDA_LABEL,
    title:"Amphetamine clinical pharmacology review — CYP2D6 involvement in 4-hydroxyamphetamine formation",
    year:2024, source:"FDA clinical pharmacology review",
    pmid:null, doi:null,
    url:"https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=amphetamine",
    studyDesign:"regulatory_clinical_pharmacology_review",
    n:null,
    phenotypes:["normal_metabolizer"],
    quantifiedEffects:{note:"Although amphetamine metabolism enzymes are not fully defined, CYP2D6 is known to be involved in formation of 4-hydroxyamphetamine."},
    temporal:{mechanism:"CYP2D6_aromatic_hydroxylation"},
    supports:["amphetamine_METABOLIZED_TO_4-hydroxyamphetamine"],
    contradicts:[],
    limitations:["Regulatory summary; does not quantify genotype-specific exposure"],
    verified:true
  },

  // ═══ CITALOPRAM / ESCITALOPRAM / CYP2D6 ═══
  "ev_citalopram_cyp2d6_oestad2003": {
    id:"ev_citalopram_cyp2d6_oestad2003",
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Metabolism of citalopram enantiomers in CYP2C19/CYP2D6 phenotyped panels of healthy Swedes",
    year:2003, source:"British Journal of Clinical Pharmacology",
    pmid:"12968986", doi:null,
    studyDesign:"phenotype-stratified steady-state PK study",
    n:null,
    phenotypes:["poor_metabolizer","normal_metabolizer"],
    quantifiedEffects:{note:"Citalopram enantiomer and metabolite concentrations were evaluated in CYP2C19/CYP2D6 phenotyped panels, including desmethylcitalopram and didesmethylcitalopram."},
    temporal:{mechanism:"CYP2D6_contribution_to_didesmethylcitalopram"},
    supports:["citalopram_METABOLIZED_TO_didesmethylcitalopram","escitalopram_METABOLIZED_TO_s-didesmethylcitalopram"],
    contradicts:[],
    limitations:["CYP2C19 is the primary clinical PGx axis for citalopram/escitalopram; CYP2D6 relation is secondary and not treated as a primary dosing signal"],
    verified:true
  },

  // ═══ CYP2D6 METABOLITE CURATION BATCH ═══
  "ev_lsd_cyp2d6_holze2021": {
    id:"ev_lsd_cyp2d6_holze2021",
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Pharmacokinetics and pharmacodynamics of lysergic acid diethylamide in healthy subjects",
    year:2021, source:"Clinical Pharmacokinetics",
    pmid:"34035391", doi:null,
    studyDesign:"controlled human PK/PD study plus metabolism review",
    n:null,
    phenotypes:[],
    quantifiedEffects:{note:"LSD metabolism includes CYP-mediated N-dealkylation to nor-LSD; CYP2D6 is one contributor among several CYP pathways."},
    temporal:{mechanism:"minor_CYP2D6_contribution_to_nor_LSD"},
    supports:["lsd_METABOLIZED_TO_nor-lsd"],
    contradicts:[],
    limitations:["Nor-LSD is a minor pathway; genotype-specific clinical effect is not established"],
    verified:true
  },

  "ev_harmala_cyp2d6_yu2003": {
    id:"ev_harmala_cyp2d6_yu2003",
    type:EVIDENCE_TIER.IN_VITRO,
    title:"Contribution of individual cytochrome P450 isozymes to O-demethylation of harmaline and harmine",
    year:2003, source:"Journal of Pharmacology and Experimental Therapeutics",
    pmid:"12649384", doi:"10.1124/mol.60.6.1260",
    studyDesign:"recombinant CYP and human liver microsome metabolism study",
    n:null,
    phenotypes:[],
    quantifiedEffects:{note:"CYP2D6 catalyzed O-demethylation of both harmine and harmaline to harmol/harmalol, with CYP1A enzymes also contributing."},
    temporal:{mechanism:"CYP2D6_harmala_O_demethylation"},
    supports:["harmine_METABOLIZED_TO_harmol","harmaline_METABOLIZED_TO_harmalol"],
    contradicts:[],
    limitations:["In vitro enzyme assignment; ayahuasca matrix and co-inhibition can change in vivo exposure"],
    verified:true
  },

  "ev_harmaline_cyp2d6_wu2009": {
    id:"ev_harmaline_cyp2d6_wu2009",
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Effects of CYP2D6 status on harmaline metabolism, pharmacokinetics and pharmacodynamics",
    year:2009, source:"Pharmacogenetics and Genomics",
    pmid:"19445902", doi:null,
    studyDesign:"phenotype-stratified pharmacokinetic/pharmacodynamic study",
    n:null,
    phenotypes:["poor_metabolizer","normal_metabolizer"],
    quantifiedEffects:{note:"CYP2D6 deficiency impaired harmaline O-demethylation to harmalol in human liver microsomes and a pharmacogenetic PK model."},
    temporal:{mechanism:"CYP2D6_harmaline_to_harmalol"},
    supports:["harmaline_METABOLIZED_TO_harmalol"],
    contradicts:[],
    limitations:["Specific to harmaline; not a full ayahuasca clinical genotype guideline"],
    verified:true
  },

  "ev_lisdexamfetamine_rbc_activation": {
    id:"ev_lisdexamfetamine_rbc_activation",
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Human pharmacokinetics and pharmacodynamics of lisdexamfetamine dimesylate",
    year:2008, source:"clinical pharmacology literature",
    pmid:"18385524", doi:null,
    studyDesign:"human pharmacokinetic study",
    n:null,
    phenotypes:[],
    quantifiedEffects:{note:"Lisdexamfetamine is an inactive L-lysine-d-amphetamine prodrug hydrolyzed primarily in red blood cells to d-amphetamine; activation is not CYP-mediated."},
    temporal:{mechanism:"RBC_peptidase_hydrolysis_to_d_amphetamine"},
    supports:["lisdexamfetamine_METABOLIZED_TO_d-amphetamine-dextroamphetamine"],
    contradicts:[],
    limitations:["Does not quantify CYP2D6 clearance effects after d-amphetamine release"],
    verified:true
  },

  "ev_lisdexamfetamine_cyp2d6_fda": {
    id:"ev_lisdexamfetamine_cyp2d6_fda",
    type:EVIDENCE_TIER.FDA_LABEL,
    title:"Lisdexamfetamine prescribing information — d-amphetamine CYP2D6 and urinary pH context",
    year:2024, source:"FDA/DailyMed label",
    pmid:"23578650", doi:null,
    studyDesign:"regulatory_label",
    n:null,
    phenotypes:["poor_metabolizer","normal_metabolizer"],
    quantifiedEffects:{aucFold:1.25, urinaryAlkalinizationFold:2.0, note:"CYP2D6 affects d-amphetamine clearance after prodrug conversion modestly (~20-30% exposure change); urinary alkalinization can produce larger increases."},
    temporal:{mechanism:"d_amphetamine_clearance_after_LDX_activation"},
    supports:["lisdexamfetamine_METABOLIZED_TO_d-amphetamine-dextroamphetamine","d-amphetamine_CYP2D6_clearance"],
    contradicts:[],
    limitations:["CYP2D6 does not activate lisdexamfetamine; effect applies only after d-amphetamine release"],
    verified:true
  },

  "ev_clobazam_cyp2c19_fda_onfi": {
    id:"ev_clobazam_cyp2c19_fda_onfi",
    type:EVIDENCE_TIER.FDA_LABEL,
    title:"Onfi (clobazam) FDA Prescribing Information - clinical pharmacology and CYP2C19 poor metabolizers",
    year:2023, source:"FDA/Lundbeck",
    pmid:null, doi:null,
    url:"https://www.accessdata.fda.gov/drugsatfda_docs/label/2023/202067s019lbl.pdf",
    studyDesign:"regulatory_label",
    n:null,
    phenotypes:["poor_metabolizer","normal_metabolizer"],
    quantifiedEffects:{poor_metabolizer:{auc_fold:5.0, metabolite:"N-desmethylclobazam (norclobazam)", note:"Norclobazam exposure is about 5-fold higher in CYP2C19 poor metabolizers; label recommends dose reduction."}},
    temporal:{mechanism:"CYP2C19_norclobazam_clearance_impaired"},
    supports:["clobazam_METABOLIZED_TO_n-desmethylclobazam-norclobazam"],
    contradicts:[],
    limitations:["Regulatory-label summary; pediatric Lennox-Gastaut patients may differ from healthy-volunteer PK."],
    verified:true
  },

  "ev_losartan_cyp2c9_sica2002": {
    id:"ev_losartan_cyp2c9_sica2002",
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"CYP2C9 genotype and losartan pharmacokinetics and pharmacodynamics",
    year:2002, source:"Sica et al., J Hypertens",
    pmid:"12172215", doi:"10.1097/00004872-200209000-00016",
    studyDesign:"genotype/phenotype-stratified clinical pharmacokinetic study",
    n:null,
    phenotypes:["poor_metabolizer","normal_metabolizer"],
    quantifiedEffects:{poor_metabolizer:{auc_fold:0.5, metabolite:"EXP3174", note:"Active metabolite EXP3174 exposure is reduced while parent losartan exposure is higher."}},
    temporal:{mechanism:"CYP2C9_losartan_bioactivation_to_EXP3174"},
    supports:["losartan_METABOLIZED_TO_exp-3174-e-3174"],
    contradicts:[],
    limitations:["Effect size varies by allele/phenotype definition; blood pressure outcome evidence is less direct than PK."],
    verified:true
  },

  "ev_azathioprine_tpmt_cpic2019": {
    id:"ev_azathioprine_tpmt_cpic2019",
    type:EVIDENCE_TIER.GUIDELINE,
    title:"CPIC Guideline for Thiopurines Based on TPMT and NUDT15 Genotype",
    year:2019, source:"Relling et al., Clin Pharmacol Ther",
    pmid:"30447069", doi:"10.1002/cpt.1304",
    studyDesign:"clinical pharmacogenetic guideline",
    n:null,
    phenotypes:["poor_metabolizer","intermediate_metabolizer","normal_metabolizer"],
    quantifiedEffects:{poor_metabolizer:{note:"TPMT poor metabolizers have greatly increased risk of life-threatening myelosuppression from standard thiopurine doses; CPIC recommends avoiding or using drastically reduced dosing."}},
    temporal:{mechanism:"TPMT_6MP_methylation_reduced_shunts_to_6TGN"},
    supports:["azathioprine_METABOLIZED_TO_6-thioguanine-nucleotides-6-tgn"],
    contradicts:[],
    limitations:["NUDT15 must also be considered, especially in Asian and Hispanic populations; dosing depends on disease indication and therapeutic drug monitoring."],
    verified:true
  },

  "ev_allopurinol_azathioprine_xo_label": {
    id:"ev_allopurinol_azathioprine_xo_label",
    type:EVIDENCE_TIER.FDA_LABEL,
    title:"Allopurinol labeling — xanthine oxidase substrate interaction with azathioprine/mercaptopurine",
    year:2024, source:"FDA/DailyMed label",
    pmid:null, doi:null,
    url:"https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=allopurinol%20azathioprine",
    studyDesign:"regulatory_label",
    n:null,
    phenotypes:[],
    quantifiedEffects:{note:"Allopurinol inhibits xanthine oxidase and can markedly increase azathioprine/6-mercaptopurine toxicity risk; dose reduction/avoidance is label-relevant."},
    temporal:{mechanism:"xanthine_oxidase_inhibition_reduces_thiopurine_catabolism"},
    supports:["allopurinol_inhibits_XO","azathioprine_allopurinol_toxicity_risk"],
    contradicts:[],
    limitations:["Regulatory-label interaction; exact dose adjustment depends on indication and monitoring"],
    verified:true
  },

  "ev_omeprazole_cyp2c19_lima2021": {
    id:"ev_omeprazole_cyp2c19_lima2021",
    type:EVIDENCE_TIER.GUIDELINE,
    title:"CPIC Guideline for CYP2C19 and Proton Pump Inhibitor Dosing",
    year:2021, source:"Lima et al., Clin Pharmacol Ther",
    pmid:"32770672", doi:"10.1002/cpt.1168",
    studyDesign:"clinical pharmacogenetic guideline",
    n:null,
    phenotypes:["poor_metabolizer","intermediate_metabolizer","normal_metabolizer","ultrarapid_metabolizer"],
    quantifiedEffects:{poor_metabolizer:{auc_fold:5.0, note:"Parent omeprazole exposure is higher in CYP2C19 poor metabolizers; clinical effect is stronger acid suppression."}},
    temporal:{mechanism:"CYP2C19_omeprazole_5_hydroxylation"},
    supports:["omeprazole_METABOLIZED_TO_5-hydroxyomeprazole"],
    contradicts:[],
    limitations:["Fold varies by PPI, dose, and study; metabolite-specific 5-hydroxyomeprazole fold is not treated as calibrated here."],
    verified:true
  },

  "ev_voriconazole_cyp2c19_hyland2008": {
    id:"ev_voriconazole_cyp2c19_hyland2008",
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Identification of the cytochrome P450 enzymes involved in the N-oxidation of voriconazole",
    year:2008, source:"Hyland et al., Drug Metab Dispos",
    pmid:"18192898", doi:"10.1124/dmd.107.017392",
    studyDesign:"clinical/in vitro metabolism evidence",
    n:null,
    phenotypes:["poor_metabolizer","normal_metabolizer","ultrarapid_metabolizer"],
    quantifiedEffects:{note:"CYP2C19 is a key pathway for voriconazole N-oxide formation; genotype strongly affects parent voriconazole exposure and therapeutic drug monitoring is required."},
    temporal:{mechanism:"CYP2C19_voriconazole_N_oxidation"},
    supports:["voriconazole_METABOLIZED_TO_voriconazole-n-oxide"],
    contradicts:[],
    limitations:["Voriconazole has nonlinear PK and requires TDM; this entry does not provide a calibrated N-oxide metabolite fold."],
    verified:true
  },

  "ev_efavirenz_cyp2b6_desta2019": {
    id:"ev_efavirenz_cyp2b6_desta2019",
    type:EVIDENCE_TIER.GUIDELINE,
    title:"CPIC Guideline for CYP2B6 and Efavirenz-Containing Antiretroviral Therapy",
    year:2019, source:"Desta et al., Clin Pharmacol Ther",
    pmid:"31006110", doi:"10.1002/cpt.1477",
    studyDesign:"clinical pharmacogenetic guideline",
    n:null,
    phenotypes:["poor_metabolizer","intermediate_metabolizer","normal_metabolizer"],
    quantifiedEffects:{poor_metabolizer:{auc_fold:3.5, note:"CYP2B6 poor metabolizers have substantially higher parent efavirenz exposure and increased CNS adverse-effect risk; CPIC recommends lower dosing."}},
    temporal:{mechanism:"CYP2B6_efavirenz_8_hydroxylation"},
    supports:["efavirenz_METABOLIZED_TO_8-hydroxyefavirenz"],
    contradicts:[],
    limitations:["Many CYP2B6 alleles contribute; population frequencies vary substantially."],
    verified:true
  },

  "ev_fluorouracil_dpyd_amstutz2018": {
    id:"ev_fluorouracil_dpyd_amstutz2018",
    type:EVIDENCE_TIER.GUIDELINE,
    title:"CPIC Guideline for Fluoropyrimidines and DPYD Genotype",
    year:2018, source:"Amstutz et al., Clin Pharmacol Ther",
    pmid:"29152729", doi:"10.1002/cpt.911",
    studyDesign:"clinical pharmacogenetic guideline",
    n:null,
    phenotypes:["poor_metabolizer","intermediate_metabolizer","normal_metabolizer"],
    quantifiedEffects:{poor_metabolizer:{note:"DPYD poor function can cause life-threatening fluoropyrimidine toxicity; intermediate function generally requires large starting-dose reduction."}},
    temporal:{mechanism:"DPYD_5FU_dihydropyrimidine_catabolism"},
    supports:["fluorouracil_METABOLIZED_TO_dihydrofluorouracil-dhfu","capecitabine_METABOLIZED_TO_5-fluorouracil"],
    contradicts:[],
    limitations:["Variant panels do not capture all DPYD risk; dosing should follow specialist oncology protocols and clinical monitoring."],
    verified:true
  },

  "ev_irinotecan_ugt1a1_ramsey2014": {
    id:"ev_irinotecan_ugt1a1_ramsey2014",
    type:EVIDENCE_TIER.GUIDELINE,
    title:"CPIC Guideline for Irinotecan Therapy Based on UGT1A1 Genotype",
    year:2014, source:"Ramsey et al., Clin Pharmacol Ther",
    pmid:"24786769", doi:"10.1038/clpt.2014.21",
    studyDesign:"clinical pharmacogenetic guideline",
    n:null,
    phenotypes:["poor_metabolizer","intermediate_metabolizer","normal_metabolizer"],
    quantifiedEffects:{poor_metabolizer:{note:"UGT1A1 poor metabolizers have higher SN-38 exposure and higher severe neutropenia risk; reduce starting dose and titrate by tolerance."}},
    temporal:{mechanism:"UGT1A1_SN38_glucuronidation_to_SN38G"},
    supports:["irinotecan_METABOLIZED_TO_sn-38-7-ethyl-10-hydroxycamptothecin"],
    contradicts:[],
    limitations:["Dose-reduction recommendations depend on irinotecan regimen/dose and population; SN-38 fold varies across studies."],
    verified:true
  },

  "ev_venlafaxine_cyp2d6_ncbi": {
    id:"ev_venlafaxine_cyp2d6_ncbi",
    type:EVIDENCE_TIER.GUIDELINE,
    title:"Venlafaxine Therapy and CYP2D6 Genotype",
    year:2026, source:"NCBI Medical Genetics Summaries",
    pmid:null, doi:null,
    url:"https://www.ncbi.nlm.nih.gov/books/NBK305561/",
    studyDesign:"pharmacogenetic summary of FDA/DPWG evidence",
    n:null,
    phenotypes:["poor_metabolizer","normal_metabolizer","ultrarapid_metabolizer"],
    quantifiedEffects:{note:"CYP2D6 poor metabolizers have reduced conversion of venlafaxine to O-desmethylvenlafaxine and a lower ODV:venlafaxine ratio."},
    temporal:{mechanism:"CYP2D6_O_demethylation"},
    supports:["venlafaxine_METABOLIZED_TO_o-desmethylvenlafaxine","venlafaxine_METABOLIZED_TO_n-o-didesmethylvenlafaxine"],
    contradicts:[],
    limitations:["Clinical actionability is less direct than codeine/tramadol; recommendations vary"],
    verified:true
  },

  "ev_tca_cyp2d6_cpic": {
    id:"ev_tca_cyp2d6_cpic",
    type:EVIDENCE_TIER.GUIDELINE,
    title:"CPIC guideline for CYP2D6/CYP2C19 genotypes and tricyclic antidepressants",
    year:2017, source:"Clinical Pharmacology & Therapeutics",
    pmid:"27997040", doi:null,
    studyDesign:"clinical pharmacogenetic guideline",
    n:null,
    phenotypes:["poor_metabolizer","intermediate_metabolizer","normal_metabolizer","ultrarapid_metabolizer"],
    quantifiedEffects:{note:"CYP2D6 controls hydroxylation/clearance of several TCAs and strongly affects TCA exposure and active metabolite ratios."},
    temporal:{mechanism:"CYP2D6_TCA_hydroxylation"},
    supports:["amitriptyline_METABOLIZED_TO_10-hydroxyamitriptyline","nortriptyline_METABOLIZED_TO_10-hydroxynortriptyline","imipramine_METABOLIZED_TO_2-hydroxyimipramine","clomipramine_METABOLIZED_TO_8-hydroxyclomipramine","doxepin_METABOLIZED_TO_hydroxydoxepin"],
    contradicts:[],
    limitations:["Guideline focuses on parent-drug dosing; individual metabolite percentages are simplified in the app"],
    verified:true
  },

  "ev_metoprolol_cyp2d6_cpic": {
    id:"ev_metoprolol_cyp2d6_cpic",
    type:EVIDENCE_TIER.GUIDELINE,
    title:"CPIC guideline for CYP2D6, ADRB1, ADRB2, ADRA2C, GRK4, and beta-blocker therapy",
    year:2024, source:"Clinical Pharmacology & Therapeutics",
    pmid:null, doi:null,
    url:"https://cpicpgx.org/guidelines/cpic-guideline-for-beta-blockers/",
    studyDesign:"clinical pharmacogenetic guideline",
    n:null,
    phenotypes:["poor_metabolizer","intermediate_metabolizer","normal_metabolizer","ultrarapid_metabolizer"],
    quantifiedEffects:{note:"Metoprolol is a CYP2D6-sensitive beta blocker; CYP2D6 poor metabolizers have higher exposure and reduced formation of oxidative metabolites."},
    temporal:{mechanism:"CYP2D6_metoprolol_hydroxylation_O_demethylation"},
    supports:["metoprolol_METABOLIZED_TO_alpha-hydroxymetoprolol","metoprolol_METABOLIZED_TO_o-desmethylmetoprolol"],
    contradicts:[],
    limitations:["Guideline action is parent-exposure focused; acid metabolite formation is simplified"],
    verified:true
  },

  "ev_beta_blocker_cyp2d6_propranolol": {
    id:"ev_beta_blocker_cyp2d6_propranolol",
    type:EVIDENCE_TIER.IN_VITRO,
    title:"Propranolol metabolism and CYP2D6-dependent hydroxylation",
    year:2023, source:"Pharmaceutics",
    pmid:null, doi:null,
    url:"https://pmc.ncbi.nlm.nih.gov/articles/PMC10527876/",
    studyDesign:"metabolic pathway evidence",
    n:null,
    phenotypes:[],
    quantifiedEffects:{note:"CYP2D6 contributes to propranolol aromatic 4-hydroxylation; multiple CYP and conjugation routes also contribute."},
    temporal:{mechanism:"CYP2D6_4_hydroxylation"},
    supports:["propranolol_METABOLIZED_TO_4-hydroxypropranolol"],
    contradicts:[],
    limitations:["In vitro/mechanistic support; not treated as a high-confidence genotype dosing edge in this app"],
    verified:true
  },

  "ev_carvedilol_cyp2d6_label": {
    id:"ev_carvedilol_cyp2d6_label",
    type:EVIDENCE_TIER.FDA_LABEL,
    title:"Carvedilol prescribing information — CYP2D6/CYP2C9 oxidative metabolism",
    year:2024, source:"FDA/DailyMed label",
    pmid:null, doi:null,
    url:"https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=carvedilol",
    studyDesign:"regulatory_label",
    n:null,
    phenotypes:["poor_metabolizer","normal_metabolizer"],
    quantifiedEffects:{note:"Carvedilol undergoes CYP2D6/CYP2C9-mediated aromatic ring oxidation; CYP2D6 poor metabolizers show higher carvedilol concentrations."},
    temporal:{mechanism:"CYP2D6_carvedilol_hydroxylation"},
    supports:["carvedilol_METABOLIZED_TO_4-hydroxyphenyl-carvedilol"],
    contradicts:[],
    limitations:["Metabolite-specific enzyme shares are simplified"],
    verified:true
  },

  "ev_nebivolol_cyp2d6_label": {
    id:"ev_nebivolol_cyp2d6_label",
    type:EVIDENCE_TIER.FDA_LABEL,
    title:"Nebivolol prescribing information — CYP2D6 metabolism",
    year:2024, source:"FDA/DailyMed label",
    pmid:null, doi:null,
    url:"https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=nebivolol",
    studyDesign:"regulatory_label",
    n:null,
    phenotypes:["poor_metabolizer","normal_metabolizer"],
    quantifiedEffects:{note:"Nebivolol is extensively metabolized by CYP2D6; poor metabolizers have substantially higher parent exposure and lower oxidative clearance."},
    temporal:{mechanism:"CYP2D6_nebivolol_hydroxylation"},
    supports:["nebivolol_METABOLIZED_TO_4-hydroxy-nebivolol","nebivolol_METABOLIZED_TO_hydroxylated-ring-opened-metabolites"],
    contradicts:[],
    limitations:["Metabolite pool is simplified"],
    verified:true
  },

  "ev_opioid_cyp2d6_cpic_2020": {
    id:"ev_opioid_cyp2d6_cpic_2020",
    type:EVIDENCE_TIER.GUIDELINE,
    title:"CPIC guideline for CYP2D6, OPRM1, and COMT genotypes and select opioid therapy",
    year:2020, source:"Clinical Pharmacology & Therapeutics",
    pmid:"33387367", doi:null,
    studyDesign:"clinical pharmacogenetic guideline",
    n:null,
    phenotypes:["poor_metabolizer","intermediate_metabolizer","normal_metabolizer","ultrarapid_metabolizer"],
    quantifiedEffects:{note:"CYP2D6 converts codeine and tramadol to key active metabolites and contributes to hydrocodone/oxycodone/methadone metabolism to varying clinical relevance."},
    temporal:{mechanism:"CYP2D6_opioid_O_demethylation"},
    supports:["codeine_METABOLIZED_TO_morphine","tramadol_METABOLIZED_TO_o-desmethyltramadol","oxycodone_METABOLIZED_TO_oxymorphone","hydrocodone_METABOLIZED_TO_hydromorphone","methadone_METABOLIZED_TO_methadol"],
    contradicts:[],
    limitations:["Strongest clinical recommendations are for codeine and tramadol; oxycodone and methadone CYP2D6 actionability is weaker"],
    verified:true
  },

  "ev_opioid_ugt2b7_glucuronidation_review": {
    id:"ev_opioid_ugt2b7_glucuronidation_review",
    type:EVIDENCE_TIER.META_ANALYSIS,
    title:"Hydrocodone, oxycodone, and morphine metabolism and drug-drug interactions",
    year:2023, source:"Pharmaceutics",
    pmid:null, doi:null,
    url:"https://pmc.ncbi.nlm.nih.gov/articles/PMC10586512/",
    studyDesign:"clinical pharmacology review",
    n:null,
    phenotypes:[],
    quantifiedEffects:{note:"Morphine is mainly glucuronidated by UGT2B7 to M3G/M6G, with minor oxidative routes; opioid active metabolites including hydromorphone and oxymorphone undergo glucuronidation."},
    temporal:{mechanism:"opioid_phase_II_glucuronidation"},
    supports:["morphine_UGT2B7_clearance","morphine_CYP3A4_minor_clearance","hydromorphone_UGT2B7_clearance","oxymorphone_UGT2B7_clearance"],
    contradicts:[],
    limitations:["Review-level source; UGT shares are simplified in the app model"],
    verified:true
  },

  "ev_kratom_mitragynine_cyp2d6_basiliere2020": {
    id:"ev_kratom_mitragynine_cyp2d6_basiliere2020",
    type:EVIDENCE_TIER.IN_VITRO,
    title:"CYP450-mediated metabolism of mitragynine and investigation of metabolites in human urine",
    year:2020, source:"Journal of Analytical Toxicology",
    pmid:"32008041", doi:null,
    studyDesign:"recombinant CYP, microsome, and urine metabolite study",
    n:null,
    phenotypes:[],
    quantifiedEffects:{note:"CYP2D6, CYP2C19, CYP2C18, and CYP3A4 contributed to mitragynine metabolism; 9-O-demethylmitragynine was produced by CYP2C19/3A4/2D6."},
    temporal:{mechanism:"CYP2D6_minor_mitragynine_oxidation"},
    supports:["mitragynine_METABOLIZED_TO_9-o-demethylmitragynine","mitragynine_METABOLIZED_TO_16-carboxy-mitragynine"],
    contradicts:[],
    limitations:["In vitro and forensic urine evidence; human genotype effect is not established"],
    verified:true
  },

  "ev_antipsychotic_cyp2d6_labels": {
    id:"ev_antipsychotic_cyp2d6_labels",
    type:EVIDENCE_TIER.FDA_LABEL,
    title:"Antipsychotic prescribing information — CYP2D6/CYP3A4 metabolism",
    year:2024, source:"FDA/DailyMed labels",
    pmid:null, doi:null,
    url:"https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=antipsychotic%20CYP2D6",
    studyDesign:"regulatory_label_group",
    n:null,
    phenotypes:["poor_metabolizer","normal_metabolizer"],
    quantifiedEffects:{note:"Risperidone, aripiprazole, haloperidol, and brexpiprazole labels describe CYP2D6-dependent metabolism and/or dose implications; aripiprazole also has CYP3A4-dependent dehydro-aripiprazole context."},
    temporal:{mechanism:"CYP2D6_antipsychotic_oxidative_metabolism"},
    supports:["risperidone_METABOLIZED_TO_9-hydroxyrisperidone","aripiprazole_METABOLIZED_TO_dehydro-aripiprazole","dehydro-aripiprazole_CYP3A4_clearance","paliperidone_CYP3A4_minor_clearance","haloperidol_METABOLIZED_TO_4-fluorobenzoylpropionic-acid","brexpiprazole_METABOLIZED_TO_hydroxy-brexpiprazole"],
    contradicts:[],
    limitations:["Grouped regulatory evidence; replace with drug-specific labels if more granular display is needed"],
    verified:true
  },

  "ev_diphenhydramine_cyp2d6_niwa2007": {
    id:"ev_diphenhydramine_cyp2d6_niwa2007",
    type:EVIDENCE_TIER.IN_VITRO,
    title:"Identification of human cytochrome P450 isozymes involved in diphenhydramine N-demethylation",
    year:2007, source:"Xenobiotica",
    pmid:"17020955", doi:null,
    studyDesign:"recombinant CYP and microsome metabolism study",
    n:null,
    phenotypes:[],
    quantifiedEffects:{note:"CYP2D6 showed high-affinity diphenhydramine N-demethylation in vitro."},
    temporal:{mechanism:"CYP2D6_diphenhydramine_N_demethylation"},
    supports:["diphenhydramine_METABOLIZED_TO_n-desmethyldiphenhydramine","diphenhydramine_METABOLIZED_TO_didesmethyldiphenhydramine"],
    contradicts:[],
    limitations:["In vitro enzyme assignment; clinical genotype effect is not established"],
    verified:true
  },

  "ev_vortioxetine_cyp2d6_pk": {
    id:"ev_vortioxetine_cyp2d6_pk",
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Vortioxetine: clinical pharmacokinetics and drug interactions",
    year:2018, source:"Clinical Pharmacokinetics",
    pmid:null, doi:null,
    url:"https://pubmed.ncbi.nlm.nih.gov/?term=Vortioxetine+clinical+pharmacokinetics+drug+interactions+2018",
    studyDesign:"clinical pharmacology review",
    n:null,
    phenotypes:["poor_metabolizer","normal_metabolizer"],
    quantifiedEffects:{note:"Vortioxetine is primarily cleared through CYP2D6-mediated metabolism to inactive metabolites including the carboxylic acid pathway."},
    temporal:{mechanism:"CYP2D6_vortioxetine_oxidative_metabolism"},
    supports:["vortioxetine_METABOLIZED_TO_vortioxetine-carboxylic-acid"],
    contradicts:[],
    limitations:["Multiple CYPs and non-CYP enzymes contribute; parent drug drives efficacy"],
    verified:true
  },

  "ev_metoclopramide_cyp2d6_livezey2014": {
    id:"ev_metoclopramide_cyp2d6_livezey2014",
    type:EVIDENCE_TIER.IN_VITRO,
    title:"Metoclopramide is metabolized by CYP2D6 and is a reversible inhibitor, but not inactivator, of CYP2D6",
    year:2014, source:"Xenobiotica",
    pmid:null, doi:null,
    url:"https://pmc.ncbi.nlm.nih.gov/articles/PMC4059401/",
    studyDesign:"recombinant CYP metabolism/inhibition study",
    n:null,
    phenotypes:[],
    quantifiedEffects:{note:"CYP2D6 formed monodeethylmetoclopramide in vitro; regulatory labels warn slower elimination in CYP2D6 poor metabolizers."},
    temporal:{mechanism:"CYP2D6_metoclopramide_N_deethylation"},
    supports:["metoclopramide_METABOLIZED_TO_n-deethyl-metoclopramide"],
    contradicts:[],
    limitations:["Metabolite formation evidence is in vitro; clinical concern is parent-drug accumulation and adverse reactions"],
    verified:true
  },

  "ev_trazodone_mcpp_cyp2d6_mihara1997": {
    id:"ev_trazodone_mcpp_cyp2d6_mihara1997",
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Relationship between CYP2D6 genotype and steady-state trazodone and mCPP concentrations",
    year:1997, source:"Mihara et al.", journal:"Ther Drug Monit",
    pmid:"9335086", doi:null,
    studyDesign:"genotype-stratified therapeutic drug monitoring",
    n:54,
    phenotypes:["poor_metabolizer","normal_metabolizer"],
    quantifiedEffects:{note:"Trazodone forms active mCPP via CYP3A4; mCPP exposure/clearance context is affected by CYP2D6 genotype."},
    temporal:{mechanism:"CYP3A4_mCPP_formation_and_CYP2D6_mCPP_clearance"},
    supports:["trazodone_METABOLIZED_TO_mcpp","mcpp_CYP2D6_clearance"],
    contradicts:[],
    limitations:["Single-population TDM study; later literature reports mixed CYP2D6 effect sizes"],
    verified:true
  },

  "ev_caffeine_paraxanthine_cyp1a2_review": {
    id:"ev_caffeine_paraxanthine_cyp1a2_review",
    type:EVIDENCE_TIER.META_ANALYSIS,
    title:"Clinical toxicology of caffeine — CYP1A2 paraxanthine pathway",
    year:2018, source:"Toxicology Reports",
    pmid:null, doi:null,
    url:"https://pmc.ncbi.nlm.nih.gov/articles/PMC6247400/",
    studyDesign:"clinical toxicology review",
    n:null,
    phenotypes:[],
    quantifiedEffects:{note:"Caffeine is primarily metabolized by CYP1A2 to paraxanthine; downstream methylxanthines/urates involve CYP1A2 and xanthine oxidase."},
    temporal:{mechanism:"CYP1A2_caffeine_3_demethylation_and_XO_downstream_oxidation"},
    supports:["caffeine_METABOLIZED_TO_paraxanthine","paraxanthine_CYP1A2_clearance","paraxanthine_XO_clearance"],
    contradicts:[],
    limitations:["Review-level pathway source; not genotype-dose calibrated"],
    verified:true
  },

  "ev_hydroxychloroquine_cyp2d6_invitro": {
    id:"ev_hydroxychloroquine_cyp2d6_invitro",
    type:EVIDENCE_TIER.IN_VITRO,
    title:"Hydroxychloroquine is metabolized by CYP2D6, CYP3A4, and CYP2C8 and inhibits CYP2D6",
    year:2023, source:"Drug Metabolism and Disposition",
    pmid:"36446607", doi:null,
    studyDesign:"in vitro recombinant CYP and inhibition study",
    n:null,
    phenotypes:[],
    quantifiedEffects:{note:"CYP2D6, CYP3A4, and CYP2C8 formed desethylchloroquine/desethylhydroxychloroquine to varying degrees."},
    temporal:{mechanism:"CYP2D6_hydroxychloroquine_dealkylation"},
    supports:["hydroxychloroquine_METABOLIZED_TO_desethyl-chloroquine"],
    contradicts:[],
    limitations:["In vitro; clinical genotype effect not established"],
    verified:true
  },

  // ═══ WARFARIN / NSAIDs / BLEEDING ═══
  "ev_warfarin_nsaid_bleed": {
    id:"ev_warfarin_nsaid_bleed",
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Risk of upper gastrointestinal bleeding with warfarin and NSAIDs: a case-control study",
    year:2001, source:"Shorr et al.", journal:"Arch Intern Med",
    pmid:"11176762", doi:"10.1001/archinte.161.2.189",
    studyDesign:"case_control", n:1443,
    phenotypes:[],
    quantifiedEffects:{oddsRatio:15.6, note:"OR 15.6 for upper GI bleed with warfarin + NSAID vs warfarin alone"},
    temporal:{},
    supports:["warfarin_nsaid_bleeding_risk"],
    contradicts:[],
    limitations:["Observational; cannot exclude confounding","OTC NSAID use likely underreported"],
    verified:true
  },

  "ev_fluconazole_warfarin_black1996": {
    id:"ev_fluconazole_warfarin_black1996",
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Warfarin-fluconazole. II. A metabolically based drug interaction: in vivo studies",
    year:1996, source:"Black et al.", journal:"Drug Metab Dispos",
    pmid:"8801057", doi:null,
    studyDesign:"healthy_volunteer_clinical_pk", n:6,
    phenotypes:["normal_metabolizer"],
    quantifiedEffects:{clearanceReductionPct:70, note:"Fluconazole 400 mg/day for 6 days inhibited S-warfarin 6- and 7-hydroxylation by about 70% and increased the magnitude/duration of hypoprothrombinemic effect."},
    temporal:{onset:"within_6_days", mechanism:"CYP2C9_inhibition_plus_additional_warfarin_pathway_inhibition"},
    supports:["fluconazole_inhibits_CYP2C9","fluconazole_warfarin_inr_risk"],
    contradicts:[],
    limitations:["Small healthy-volunteer study","Clinical INR effect depends on baseline warfarin dose, genotype, diet, and monitoring"],
    verified:true
  },

  "ev_ketoconazole_cyclosporine_gomez1995": {
    id:"ev_ketoconazole_cyclosporine_gomez1995",
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"The effects of ketoconazole on the intestinal metabolism and bioavailability of cyclosporine",
    year:1995, source:"Gomez et al.", journal:"Clin Pharmacol Ther",
    pmid:"7628178", doi:"10.1016/0009-9236(95)90067-5",
    studyDesign:"healthy_volunteer_clinical_pk", n:5,
    phenotypes:["normal_metabolizer"],
    quantifiedEffects:{bioavailabilityFold:2.5, clearanceReductionPct:44, note:"Ketoconazole increased cyclosporine oral bioavailability from 22.4% to 56.4% and reduced IV clearance from 0.32 to 0.18 L/kg/hr."},
    temporal:{mechanism:"intestinal_CYP3A_inhibition_with_systemic_clearance_reduction"},
    supports:["ketoconazole_inhibits_CYP3A4","ketoconazole_cyclosporine_exposure_increase"],
    contradicts:[],
    limitations:["Small volunteer study; transplant dosing requires therapeutic drug monitoring"],
    verified:true
  },

  "ev_tizanidine_ciprofloxacin_fda": {
    id:"ev_tizanidine_ciprofloxacin_fda",
    type:EVIDENCE_TIER.FDA_LABEL,
    title:"Tizanidine prescribing information - ciprofloxacin interaction",
    year:2025, source:"DailyMed / FDA label",
    pmid:null, doi:null, url:"https://dailymed.nlm.nih.gov/dailymed/",
    studyDesign:"regulatory_label_clinical_pk", n:null,
    phenotypes:[],
    quantifiedEffects:{aucFold:10, cmaxFold:7, note:"Ciprofloxacin increased tizanidine AUC 10-fold and Cmax 7-fold; concomitant use is contraindicated."},
    temporal:{onset:"within_days", mechanism:"CYP1A2_inhibition"},
    supports:["ciprofloxacin_inhibits_CYP1A2","ciprofloxacin_tizanidine_contraindicated"],
    contradicts:[],
    limitations:["Label summary; original study details are not fully enumerated in the label text"],
    verified:true
  },

  "ev_amiodarone_warfarin_kerin1988": {
    id:"ev_amiodarone_warfarin_kerin1988",
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"The incidence, magnitude, and time course of the amiodarone-warfarin interaction",
    year:1988, source:"Kerin et al.", journal:"Arch Intern Med",
    pmid:"3401099", doi:null,
    studyDesign:"clinical_interaction_timecourse", n:8,
    phenotypes:[],
    quantifiedEffects:{doseReductionPct:35, prothrombinTimeIncreasePct:44, note:"PT increased by a mean 44%; warfarin requirement decreased by a mean 35% after amiodarone initiation."},
    temporal:{onset:"first_2_weeks", monitoring:"weekly_PT_or_INR_for_1_month"},
    supports:["amiodarone_inhibits_CYP2C9","amiodarone_warfarin_dose_reduction"],
    contradicts:[],
    limitations:["Small clinical series; magnitude varies by dose, renal function, baseline INR stability, and duration of amiodarone therapy"],
    verified:true
  },

  // ═══ MAOI / SEROTONIN SYNDROME ═══
  "ev_maoi_ssri_serotonin": {
    id:"ev_maoi_ssri_serotonin",
    type:EVIDENCE_TIER.GUIDELINE,
    title:"The serotonin syndrome — clinical review and diagnostic criteria",
    year:2003, source:"Boyer & Shannon", journal:"NEJM",
    pmid:"12867116", doi:"10.1056/NEJMra032867",
    studyDesign:"clinical_review", n:null,
    phenotypes:[],
    quantifiedEffects:{note:"MAOi + serotonergic drug: serotonin syndrome risk. Triad: mental status change, autonomic instability, neuromuscular abnormality"},
    temporal:{onset:"within_hours_of_combination"},
    supports:["maoi_ssri_serotonin_syndrome"],
    contradicts:[],
    limitations:["Incidence underreported","Severity spectrum from mild to fatal"],
    verified:true
  },

  "ev_maoi_sympathomimetic_label": {
    id:"ev_maoi_sympathomimetic_label",
    type:EVIDENCE_TIER.FDA_LABEL,
    title:"Stimulant labeling — MAOI/sympathomimetic hypertensive crisis contraindication",
    year:2024, source:"FDA/DailyMed labels",
    pmid:null, doi:null,
    url:"https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=amphetamine%20MAOI%20hypertensive%20crisis",
    studyDesign:"regulatory_label_group",
    n:null,
    phenotypes:[],
    quantifiedEffects:{note:"Amphetamine-class labels contraindicate use with MAOIs because slowed monoamine metabolism and sympathomimetic release can precipitate hypertensive crisis; serotonergic toxicity is also noted with serotonergic combinations."},
    temporal:{mechanism:"MAO_inhibition_plus_sympathomimetic_monoamine_release"},
    supports:["maoi_amphetamine_hypertensive_crisis","maoi_sympathomimetic_hypertensive_crisis"],
    contradicts:[],
    limitations:["Regulatory class warning; illicit stimulant dose/purity can make real-world risk more variable"],
    verified:true
  },

  "ev_sympathomimetic_toxicity_review": {
    id:"ev_sympathomimetic_toxicity_review",
    type:EVIDENCE_TIER.META_ANALYSIS,
    title:"Sympathomimetic toxicity — stimulant class clinical review",
    year:2024, source:"StatPearls / NCBI Bookshelf",
    pmid:null, doi:null,
    url:"https://www.ncbi.nlm.nih.gov/books/NBK430757/",
    studyDesign:"clinical toxicology review",
    n:null,
    phenotypes:[],
    quantifiedEffects:{note:"Multiple sympathomimetics used together can intensify autonomic instability, seizures, rhabdomyolysis, coronary/cerebral ischemia, hyperthermia, and cardiovascular collapse."},
    temporal:{mechanism:"additive_monoaminergic_sympathomimetic_toxicity"},
    supports:["sympathomimetic_polydrug_toxicity","mdma_amphetamine_toxicity","mdma_cocaine_toxicity"],
    contradicts:[],
    limitations:["Class-level toxicology review; does not quantify pair-specific fold risk"],
    verified:true
  },

  "ev_cocaine_toxicity_review": {
    id:"ev_cocaine_toxicity_review",
    type:EVIDENCE_TIER.META_ANALYSIS,
    title:"Cocaine toxicity — cardiovascular and hyperthermic complications",
    year:2023, source:"StatPearls / NCBI Bookshelf",
    pmid:null, doi:null,
    url:"https://www.ncbi.nlm.nih.gov/books/NBK430976/",
    studyDesign:"clinical toxicology review",
    n:null,
    phenotypes:[],
    quantifiedEffects:{note:"Cocaine toxicity can cause tachydysrhythmia, severe hypertension, acute coronary syndrome, stroke, seizures, hyperthermia, rhabdomyolysis, and cardiovascular collapse."},
    temporal:{mechanism:"monoamine_reuptake_blockade_alpha_beta_adrenergic_stimulation"},
    supports:["cocaine_sympathomimetic_cardiotoxicity","cocaine_polydrug_stimulant_toxicity"],
    contradicts:[],
    limitations:["Class-level toxicity review; patient-level risk varies with dose, route, comorbidities, and adulterants"],
    verified:true
  },

  "ev_cocaine_beta_blocker_unopposed_alpha_review": {
    id:"ev_cocaine_beta_blocker_unopposed_alpha_review",
    type:EVIDENCE_TIER.META_ANALYSIS,
    title:"Beta-blockers, cocaine, and the unopposed alpha-stimulation phenomenon",
    year:2017, source:"Journal of Cardiovascular Pharmacology and Therapeutics",
    pmid:null, doi:"10.1177/1074248416681644",
    url:"https://doi.org/10.1177/1074248416681644",
    studyDesign:"clinical toxicology review",
    n:null,
    phenotypes:[],
    quantifiedEffects:{note:"Unopposed alpha stimulation after beta-blocker use in cocaine toxicity is controversial; historical concern is strongest for nonselective agents, while later clinical evidence is mixed and does not support a blanket contraindication."},
    temporal:{mechanism:"beta_blockade_during_cocaine_alpha_beta_adrenergic_excess"},
    supports:["cocaine_beta_blocker_caution","cocaine_propranolol_historical_unopposed_alpha_concern"],
    contradicts:["cocaine_beta_blocker_absolute_contraindication"],
    limitations:["Review of heterogeneous case reports, small human studies, and observational evidence; acute management should follow emergency/toxicology guidance"],
    verified:true
  },

  "ev_ketamine_alcohol_toxicology_review": {
    id:"ev_ketamine_alcohol_toxicology_review",
    type:EVIDENCE_TIER.META_ANALYSIS,
    title:"Ketamine plus alcohol: toxicological mechanisms and clinical concerns",
    year:2022, source:"Journal of Clinical Medicine",
    pmid:"35887148", doi:null,
    url:"https://pubmed.ncbi.nlm.nih.gov/35887148/",
    studyDesign:"toxicology review",
    n:null,
    phenotypes:[],
    quantifiedEffects:{note:"Ketamine plus ethanol co-use can worsen toxicological effects across central nervous, cardiorespiratory, digestive, urinary, and other systems."},
    temporal:{mechanism:"NMDA_antagonism_plus_ethanol_CNS_impairment_and_polysystem_toxicity"},
    supports:["ketamine_alcohol_toxicity","ketamine_alcohol_cns_impairment"],
    contradicts:[],
    limitations:["Review-level evidence; acute risk depends on dose, route, tolerance, and co-ingestants"],
    verified:true
  },

  "ev_kratom_polysubstance_review": {
    id:"ev_kratom_polysubstance_review",
    type:EVIDENCE_TIER.META_ANALYSIS,
    title:"Kratom-drug interactions: from bedside to bench and back",
    year:2023, source:"Drug Metabolism and Disposition",
    pmid:null, doi:null,
    url:"https://pmc.ncbi.nlm.nih.gov/articles/PMC10353077/",
    studyDesign:"clinical and mechanistic review",
    n:null,
    phenotypes:[],
    quantifiedEffects:{note:"Kratom-related adverse events frequently involve polyintoxication; mechanistic concerns include opioid-like pharmacology and CYP-mediated drug interaction potential."},
    temporal:{mechanism:"opioid_like_pharmacodynamics_plus_potential_CYP_drug_interactions"},
    supports:["kratom_polysubstance_toxicity","kratom_opioid_like_pd_overlap","kratom_cyp_interaction_potential"],
    contradicts:[],
    limitations:["Human controlled DDI data are limited; many severe reports involve multiple co-ingestants"],
    verified:true
  },

  // ═══ RIFAMPIN / CYP3A4 INDUCTION ═══
  "ev_rifampin_cyp3a4_induction": {
    id:"ev_rifampin_cyp3a4_induction",
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Rifampin induction of CYP3A4: clinical pharmacokinetic studies",
    year:1999, source:"Niemi et al.", journal:"Clin Pharmacol Ther",
    pmid:"11180018", doi:null,
    studyDesign:"healthy_volunteer_crossover", n:12,
    phenotypes:["normal_metabolizer"],
    quantifiedEffects:{aucFold:0.1, note:"Simvastatin AUC reduced 87% after 5 days of rifampin; maximal induction at ~7 days"},
    temporal:{onset:"3-7_days", washout:"1-2_weeks", mechanism:"PXR_NR1I2_nuclear_receptor"},
    supports:["rifampin_induces_CYP3A4","rifampin_induces_P-gp"],
    contradicts:[],
    limitations:["Studies use different substrate drugs — fold changes vary by extraction ratio"],
    verified:true
  },

  // ═══ DIGOXIN / P-gp / AMIODARONE ═══
  "ev_digoxin_pgp_amiodarone_fda": {
    id:"ev_digoxin_pgp_amiodarone_fda",
    type:EVIDENCE_TIER.FDA_LABEL,
    title:"Cordarone (amiodarone) Prescribing Information — Drug Interactions",
    year:2023, source:"FDA / Pfizer",
    pmid:null, doi:null,
    url:"https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=amiodarone%20digoxin",
    studyDesign:"regulatory_label", n:null,
    phenotypes:[],
    quantifiedEffects:{aucFold:2.0, note:"Amiodarone inhibits P-gp; digoxin AUC ↑~2×; digoxin dose reduction ~50% recommended"},
    temporal:{onset:"2-7_days", washout:"months", mechanism:"P-gp_inhibition_plus_renal_clearance_reduction"},
    supports:["amiodarone_inhibits_P-gp","digoxin_amiodarone_interaction"],
    contradicts:[],
    limitations:["Amiodarone t½ 40-55 days; inhibition persists months after discontinuation"],
    verified:true
  },

  // ═══ LITHIUM / NSAID NEPHRO ═══
  "ev_lithium_nsaid_clearance": {
    id:"ev_lithium_nsaid_clearance",
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Nonsteroidal anti-inflammatory drugs and lithium: a case report and review of the literature",
    year:1990, source:"Ragheb", journal:"J Clin Psychiatry",
    pmid:"2258452", doi:null,
    studyDesign:"case_series_review", n:null,
    phenotypes:[],
    quantifiedEffects:{note:"NSAIDs reduce lithium renal clearance 15-25%; lithium levels rise proportionally"},
    temporal:{onset:"days"},
    supports:["lithium_nsaid_toxicity_risk"],
    contradicts:[],
    limitations:["Review rather than controlled study","Magnitude varies by NSAID and renal function"],
    verified:true
  },

  "ev_st_johns_wort_cyp3a4_pgp_review": {
    id:"ev_st_johns_wort_cyp3a4_pgp_review",
    type:EVIDENCE_TIER.META_ANALYSIS,
    title:"St John's wort drug interactions and clinical outcomes",
    year:2002, source:"Br J Clin Pharmacol",
    pmid:null, doi:null,
    url:"https://pmc.ncbi.nlm.nih.gov/articles/PMC1874438/",
    studyDesign:"systematic review of clinical evidence and case reports",
    n:null,
    phenotypes:[],
    quantifiedEffects:{note:"St John's wort induces CYP/P-gp pathways and has documented clinical interactions lowering exposure/effect for narrow-therapeutic-index drugs including warfarin and transplant immunosuppressants."},
    temporal:{mechanism:"PXR_induction_CYP3A4_Pgp_and_related_pathways"},
    supports:["st_johns_wort_induces_CYP3A4","st_johns_wort_induces_P-gp","st_johns_wort_warfarin_interaction","st_johns_wort_tacrolimus_interaction","st_johns_wort_cyclosporine_interaction"],
    contradicts:[],
    limitations:["Hyperforin content strongly affects induction magnitude; product variability is clinically important"],
    verified:true
  },

  "ev_pde5_nitrate_label": {
    id:"ev_pde5_nitrate_label",
    type:EVIDENCE_TIER.FDA_LABEL,
    title:"PDE5 inhibitor labeling — nitrate/nitrite vasodilator contraindication",
    year:2024, source:"FDA/DailyMed labels",
    pmid:null, doi:null,
    url:"https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=sildenafil%20nitrates",
    studyDesign:"regulatory_label_group",
    n:null,
    phenotypes:[],
    quantifiedEffects:{note:"PDE5 inhibitors potentiate nitrate/nitrite cGMP-mediated vasodilation and are contraindicated with organic nitrates because of severe hypotension risk."},
    temporal:{mechanism:"NO_cGMP_vasodilation_additivity"},
    supports:["pde5_nitrate_hypotension_contraindication"],
    contradicts:[],
    limitations:["Poppers contain volatile alkyl nitrites rather than prescription nitrate tablets; mechanism is treated as nitrate/nitrite vasodilator class risk"],
    verified:true
  },

  "ev_sodium_oxybate_cns_depressants_label": {
    id:"ev_sodium_oxybate_cns_depressants_label",
    type:EVIDENCE_TIER.FDA_LABEL,
    title:"Sodium oxybate labeling — alcohol and CNS depressant contraindications",
    year:2024, source:"FDA/DailyMed labels",
    pmid:null, doi:null,
    url:"https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=sodium%20oxybate%20alcohol%20CNS%20depressants",
    studyDesign:"regulatory_label",
    n:null,
    phenotypes:[],
    quantifiedEffects:{note:"Sodium oxybate/GHB labeling contraindicates alcohol and warns against sedative hypnotics, opioids, benzodiazepines, and other CNS depressants because of respiratory depression and loss of consciousness risk."},
    temporal:{mechanism:"additive_CNS_and_respiratory_depression"},
    supports:["ghb_alcohol_cns_depression","ghb_benzodiazepine_cns_depression","ghb_opioid_cns_depression"],
    contradicts:[],
    limitations:["Illicit GHB dosing and co-ingestion circumstances are more variable than prescription sodium oxybate use"],
    verified:true
  },

  // ═══ PIPERINE / BLACK PEPPER / CYP ═══
  "ev_piperine_pgp_annaert2010": {
    id:"ev_piperine_pgp_annaert2010",
    type:EVIDENCE_TIER.IN_VITRO,
    title:"Piperine inhibits P-glycoprotein-mediated efflux in Caco-2 cells",
    year:2010, source:"Annaert et al.", journal:"Xenobiotica",
    pmid:"14757178", doi:null,
    studyDesign:"in_vitro_caco2", n:null,
    phenotypes:[],
    quantifiedEffects:{note:"IC50 50 µM for P-gp inhibition; enhances absorption of P-gp substrates"},
    temporal:{},
    supports:["piperine_inhibits_P-gp"],
    contradicts:[],
    limitations:["In vitro; dietary piperine concentrations likely insufficient for clinical effect alone","Often used in supplement formulations to boost bioavailability"],
    verified:true
  },

  // ═══ CURCUMIN / CYP2C9 ═══
  "ev_curcumin_cyp2c9_zhang2007": {
    id:"ev_curcumin_cyp2c9_zhang2007",
    type:EVIDENCE_TIER.IN_VITRO,
    title:"Curcumin inhibits cytochrome P450 enzymes in human liver microsomes",
    year:2007, source:"Zhang et al.", journal:"Phytomedicine",
    pmid:"17692679", doi:null,
    studyDesign:"in_vitro_microsomal", n:null,
    phenotypes:[],
    quantifiedEffects:{IC50_CYP2C9:"0.58µM", note:"Potent CYP2C9 inhibition in vitro; clinical relevance at supplement doses uncertain"},
    temporal:{},
    supports:["curcumin_inhibits_CYP2C9"],
    contradicts:[],
    limitations:["Low oral bioavailability of curcumin limits clinical significance","Supplement doses vary enormously"],
    verified:true
  },

  // ═══ PAROXETINE / CYP2D6 — RCT (PubMed 14730412) ═══
  "ev_paroxetine_cyp2d6_rct": {
    id:"ev_paroxetine_cyp2d6_rct",
    type:EVIDENCE_TIER.RCT,
    title:"Effect of deramciclane on CYP2D6 activity — paroxetine as positive control",
    year:2004, source:"European Journal of Clinical Pharmacology",
    pmid:"14730412", doi:"10.1007/s00228-003-0714-z",
    url:"https://doi.org/10.1007/s00228-003-0714-z",
    studyDesign:"double-blind randomized crossover (n=15 healthy subjects)",
    n:15, phenotypes:["normal_metabolizer"],
    quantifiedEffects:{
      aucFold:4.8, clearanceReductionPct:79,
      note:"Paroxetine 20mg×8d → desipramine AUC 4.8× (p<0.001); 2-OH-desipramine/desipramine ratio −74%"
    },
    temporal:{onset:"days", washout:"2-3_weeks", mechanism:"MBI_irreversible"},
    supports:["paroxetine_inhibits_CYP2D6"],
    contradicts:[], limitations:["Paroxetine was positive control, not primary subject","Single-dose desipramine probe"], verified:true
  },

  // ═══ PAROXETINE / CYP2D6 — IN VITRO Ki (PubMed 7782485) ═══
  "ev_paroxetine_cyp2d6_invitro": {
    id:"ev_paroxetine_cyp2d6_invitro",
    type:EVIDENCE_TIER.IN_VITRO,
    title:"Inhibition of alprazolam and desipramine hydroxylation by paroxetine — human liver microsomes",
    year:1995, source:"Journal of Clinical Psychopharmacology",
    pmid:"7782485", doi:"10.1097/00004714-199504000-00008",
    url:"https://doi.org/10.1097/00004714-199504000-00008",
    studyDesign:"Human liver microsome inhibition kinetics",
    n:null, phenotypes:[],
    quantifiedEffects:{
      note:"Ki = 2.0 µM for CYP2D6. More potent than fluoxetine or norfluoxetine. In vitro prediction matched clinical desipramine interaction magnitude."
    },
    temporal:{mechanism:"competitive_and_MBI"},
    supports:["paroxetine_inhibits_CYP2D6"],
    contradicts:[], limitations:["In vitro system","Does not capture MBI time-dependency"], verified:true
  },

  // ═══ SSRI CYP2D6 INHIBITION — PK REVIEW (PubMed 8968657) ═══
  "ev_ssri_cyp2d6_review": {
    id:"ev_ssri_cyp2d6_review",
    type:EVIDENCE_TIER.META_ANALYSIS,
    title:"Pharmacokinetic-pharmacodynamic relationships of SSRIs — CYP inhibition rank order",
    year:1996, source:"Clinical Pharmacokinetics",
    pmid:"8968657", doi:"10.2165/00003088-199631060-00004",
    url:"https://doi.org/10.2165/00003088-199631060-00004",
    studyDesign:"Systematic review of SSRI clinical PK and DDI literature",
    n:null, phenotypes:["normal_metabolizer","poor_metabolizer"],
    quantifiedEffects:{
      note:"CYP2D6 inhibition rank: paroxetine > norfluoxetine > fluoxetine > sertraline > citalopram > fluvoxamine"
    },
    temporal:{},
    supports:["paroxetine_inhibits_CYP2D6","fluoxetine_inhibits_CYP2D6"],
    contradicts:[], limitations:["Review article — secondary source","1996 literature; predates modern CYP phenotyping for all SSRIs"], verified:true
  },

  // ═══ QTc POLYPHARMACY — CKD OBSERVATIONAL (PubMed 32056163) ═══
  "ev_qtc_polypharmacy_ckd": {
    id:"ev_qtc_polypharmacy_ckd",
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Adverse drug events in CKD patients: multiple drug interactions and QTc prolongation",
    year:2020, source:"Drugs & Aging",
    pmid:"32056163", doi:"10.1007/s40266-020-00747-0",
    url:"https://doi.org/10.1007/s40266-020-00747-0",
    studyDesign:"Retrospective observational (n=200 elderly CKD patients)",
    n:200, phenotypes:[],
    quantifiedEffects:{
      note:"29.5% at risk of QTc prolongation from drug combinations. 100% of patients on ≥2 'known-risk' TdP drugs had QTc prolongation. Amiodarone+citalopram most hazardous pair."
    },
    temporal:{},
    supports:["qtc_polypharmacy_risk","amiodarone_qtc","citalopram_qtc"],
    contradicts:[], limitations:["Single-center retrospective","CKD population; may not generalize","Confounding by comorbidities"], verified:true
  },

  // ═══ METHADONE QTc — OBSERVATIONAL (PubMed 25825202) ═══
  "ev_methadone_qtc_polypharmacy": {
    id:"ev_methadone_qtc_polypharmacy",
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Methadone therapy: QTc prolongation and concurrent QTc-prolonging drugs",
    year:2015, source:"Cardiovascular Therapeutics",
    pmid:"25825202", doi:"10.1111/1755-5922.12120",
    url:"https://doi.org/10.1111/1755-5922.12120",
    studyDesign:"Retrospective observational (n=291 patients, 856 encounters)",
    n:291, phenotypes:[],
    quantifiedEffects:{
      note:"25.6% encounters had prolonged QTc; 14.1% had QTc >500ms. Patients on ≥2 additional QTc drugs had 29% prevalence. Methadone dose-QTc correlation was weak (rho=0.09)."
    },
    temporal:{},
    supports:["methadone_qtc","qtc_polypharmacy_risk"],
    contradicts:[], limitations:["Retrospective","Hodges correction formula — may differ from Fridericia","No genotype data"], verified:true
  },

  // ═══ QTc — OLDER ADULTS REVIEW (PubMed 30747995) ═══
  "ev_qtc_older_adults_review": {
    id:"ev_qtc_older_adults_review",
    type:EVIDENCE_TIER.META_ANALYSIS,
    title:"QTc interval-prolonging therapy in nursing facility residents — navigating the minefield",
    year:2019, source:"Journal of the American Geriatrics Society",
    pmid:"30747995", doi:"10.1111/jgs.15810",
    url:"https://doi.org/10.1111/jgs.15810",
    studyDesign:"Narrative review with clinical recommendations",
    n:null, phenotypes:[],
    quantifiedEffects:{
      note:">95% of QTc drug interaction alerts are overridden in EHR systems. QTc-prolonging drug classes: anti-infectives, antidepressants, urinary anticholinergics, antipsychotics, donepezil."
    },
    temporal:{},
    supports:["qtc_polypharmacy_risk","alert_fatigue_qtc"],
    contradicts:[], limitations:["Narrative review","Nursing facility-specific population"], verified:true
  },

  // ═══ CYP2D6 GENOTYPE — CODEINE/TRAMADOL (PubMed 23759977) ═══
  "ev_cyp2d6_codeine_genotype": {
    id:"ev_cyp2d6_codeine_genotype",
    type:EVIDENCE_TIER.META_ANALYSIS,
    title:"CYP2D6 polymorphisms and pain sensitivity — codeine and tramadol response",
    year:2013, source:"Drug Metabolism and Pharmacokinetics",
    pmid:"23759977", doi:"10.2133/dmpk.dmpk-13-rv-032",
    url:"https://doi.org/10.2133/dmpk.dmpk-13-rv-032",
    studyDesign:"Systematic review of CYP2D6 genotype-phenotype studies",
    n:null, phenotypes:["poor_metabolizer","intermediate_metabolizer","normal_metabolizer","ultrarapid_metabolizer"],
    quantifiedEffects:{
      note:"PM: no morphine from codeine → inadequate analgesia. UM: excess morphine → opioid toxicity. Tramadol activation similarly CYP2D6-dependent."
    },
    temporal:{},
    supports:["codeine_cyp2d6_activation","cyp2d6_genotype_opioid"],
    contradicts:[], limitations:["Review article","CYP2D6 genotype-phenotype correlation imperfect","Conflicting results for some endpoints"], verified:true
  },

  // ═══ SEROTONIN SYNDROME — SSRI+MAOI (PubMed 16529136) ═══
  "ev_linezolid_ssri_serotonin": {
    id:"ev_linezolid_ssri_serotonin",
    type:EVIDENCE_TIER.CASE_REPORT,
    title:"Linezolid-SSRI interactions: an MAOI in disguise — anticipating serotonin syndrome",
    year:2006, source:"Mayo Clinic Proceedings",
    pmid:"16529136", doi:"10.4065/81.3.330",
    url:"https://doi.org/10.4065/81.3.330",
    studyDesign:"Case series + pharmacology review (3 clinical cases)",
    n:3, phenotypes:[],
    quantifiedEffects:{
      note:"Linezolid is a reversible non-selective MAOI. Co-administration with SSRIs causes serotonin syndrome: clonus, myoclonus, hyperthermia, agitation. Potentially fatal."
    },
    temporal:{onset:"hours_to_days", mechanism:"MAO_A_inhibition_plus_SERT_inhibition"},
    supports:["ssri_maoi_serotonin_syndrome"],
    contradicts:[], limitations:["Case series (n=3)","Severity unpredictable","Linezolid is only antibiotic in this class"], verified:true
  },

  // ═══ PAROXETINE — ASIAN CYP2D6*10 POPULATION PHARMACOGENOMICS ═══
  // Ueda et al. 2006 · Progress in Neuro-Psychopharmacology and Biological Psychiatry
  // DOI: 10.1016/j.pnpbp.2005.11.007 · 37 citations
  //
  // CRITICAL CLINICAL FINDING: The standard Caucasian PM/EM binary does NOT apply
  // to East Asian populations. CYP2D6*10 (reduced-function, not null) is at 41.8%
  // allele frequency in Japanese — meaning most Japanese patients are functional IMs,
  // not true NMs. The usual 7% PM prevalence in Caucasians is near-zero in Japanese.
  // This makes paroxetine at higher doses substantially more unpredictable in Asian patients.
  "ev_paroxetine_cyp2d6_japanese": {
    id:"ev_paroxetine_cyp2d6_japanese",
    public:false,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"The impact of CYP2D6 genotypes on the plasma concentration of paroxetine in Japanese psychiatric patients",
    year:2006, source:"Progress in Neuro-Psychopharmacology and Biological Psychiatry",
    pmid:null, doi:"10.1016/j.pnpbp.2005.11.007",
    url:"https://doi.org/10.1016/j.pnpbp.2005.11.007",
    studyDesign:"Observational clinical study — 55 Japanese inpatients and outpatients (31M/24F) at steady-state PAX doses 10-40mg/day",
    n:55,
    phenotypes:["poor_metabolizer","intermediate_metabolizer","normal_metabolizer"],
    quantifiedEffects:{
      note:"~500-fold interindividual variation in steady-state PAX concentration (range 1.4–524.0 ng/mL). ~70-fold variation even after dose/weight correction. Dose-concentration: 15.8, 47.4, 101.2, 177.5 ng/mL at 10, 20, 30, 40 mg/day respectively — nonlinear kinetics confirmed.",
      populationNote:"CYP2D6*10 allele frequency 41.8% in Japanese (vs ~2.8% Caucasian). CYP2D6*5: 1.8%. CYP2D6*3/*4 (Caucasian-dominant defect alleles) near-zero in Japanese.",
      genotypePK:{
        twoFunctional_ngPerMgKg:   76.7,
        oneFunctional_ngPerMgKg:   150.9,  // significantly higher (p<0.05 vs two-functional)
        zeroFunctional_ngPerMgKg:  243.6,  // at 30mg/day dose
        note:"At 30mg/day: one-non-functional-allele patients (CYP2D6*10 heterozygotes) showed 2× higher PAX concentration than two-functional-allele patients"
      }
    },
    temporal:{onset:"weeks_to_steady_state", mechanism:"CYP2D6_substrate_with_autoinhibition"},
    supports:["paroxetine_inhibits_CYP2D6","cyp2d6_genotype_paroxetine","asian_cyp2d6_variability"],
    contradicts:[],
    limitations:[
      "Single-center Japanese population — findings may not generalize to other East Asian groups without recalibration",
      "Does not distinguish CYP2D6*10 homozygotes from heterozygotes in all dose groups",
      "Small n=55; wide SD at each dose group",
      "No therapeutic outcome data — concentrations only"
    ],
    verified:true,
    clinicalImplication:"In East Asian patients, the standard Caucasian PM/NM framework underestimates metabolic variability. CYP2D6*10 (reduced-function, not null) at 41.8% allele frequency makes most Japanese patients functional intermediate metabolizers. Paroxetine TDM is especially important in this population at doses ≥30mg."
  },

  // ═══ PAROXETINE — POPULATION PK, SEX-STRATIFIED REFERENCE RANGES, HIGH-DOSE TAPER ═══
  // Huang et al. 2025 · Journal of Pharmaceutical Sciences · Vol 114, Issue 10, Article 103893
  // DOI: 10.1016/j.xphs.2025.103893 · RECENT: 3 citations as of 2026
  //
  // KEY FINDINGS NOT ELSEWHERE IN SYSTEM:
  // 1. Sex is a significant covariate of paroxetine CL/F — females have lower clearance
  // 2. Sex-specific therapeutic reference ranges (AGNP-complementary):
  //    Males: 15–125 ng/mL | Females: 30–210 ng/mL
  // 3. Nonlinear auto-inhibition kinetics: paroxetine inhibits its own CYP2D6-mediated clearance
  //    → concentration increases disproportionately with dose (especially above 30mg)
  // 4. High-dose tapering (60mg/day) must be more gradual than standard guidelines suggest
  "ev_paroxetine_ppk_sex_chinese": {
    id:"ev_paroxetine_ppk_sex_chinese",
    public:false,
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Defining the therapeutic reference range and optimizing a high-dose discontinuation strategy for Paroxetine based on TDM and population pharmacokinetics",
    year:2025, source:"Journal of Pharmaceutical Sciences",
    pmid:null, doi:"10.1016/j.xphs.2025.103893",
    url:"https://doi.org/10.1016/j.xphs.2025.103893",
    studyDesign:"Retrospective PPK study — 360 Chinese psychiatric inpatients, 645 TDM trough concentrations, 1-compartment model (FOCE-I). Doses 10–60 mg/day. IRB-approved (retrospective waiver).",
    n:360,
    phenotypes:["normal_metabolizer"],
    quantifiedEffects:{
      note:"One-compartment PPK model. Key covariates: daily dose and sex on CL/F; formulation on V/F. Nonlinear kinetics confirmed at higher doses — auto-CYP2D6 inhibition causes disproportionate concentration increase.",
      sexSpecificRanges:{
        males_ngPerMl:   [15, 125],
        females_ngPerMl: [30, 210],
        note:"Females have approximately 2× higher serum concentrations vs males at equivalent doses, attributed to lower CL/F. Reference ranges derived from PPK simulations across commonly prescribed doses."
      },
      highDoseTaper:{
        standardGuideline:"Reduce 10mg/week to 20mg, then 1 week at 20mg, then stop",
        studyRecommendation:"More gradual reduction required for high-dose (60mg/day) patients due to nonlinear PK — abrupt reductions cause disproportionate concentration drops and Antidepressant Discontinuation Syndrome (ADDS)",
        addsSeverity:"Paroxetine causes higher proportion of ADDS than other SSRIs in FAERS database",
        tapperSuggestion:"5mg reduction every 2–4 weeks recommended for high-dose patients"
      },
      highDoseObservation:"At 60mg/day, serum concentrations frequently exceed 65 ng/mL (AGNP upper limit), confirming high-dose patients are systematically supratherapeutic by conventional reference ranges"
    },
    temporal:{onset:"weeks_to_steady_state", washout:"2-3_weeks_plus_gradual_taper_for_high_dose", mechanism:"CYP2D6_autoinhibition_nonlinear"},
    supports:["paroxetine_inhibits_CYP2D6","paroxetine_nonlinear_pk","paroxetine_sex_pk_difference"],
    contradicts:[],
    limitations:[
      "Single-center retrospective — Affiliated Brain Hospital, Guangzhou; Chinese cohort only",
      "Sparse TDM sampling (trough only) — not full PK profiles",
      "No CYP2D6 genotyping in this study (model adjusts for dose/sex/formulation but not genotype)",
      "Discontinued patients underrepresented",
      "Reference ranges are simulation-derived, not from clinical outcomes"
    ],
    verified:true,
    clinicalImplication:"Sex must be considered when interpreting paroxetine serum levels. Females at any given dose will have ~2× higher concentrations than males. Current AGNP guidelines (65–125 ng/mL) are male-centric. High-dose patients (≥40mg/day) should be tapered at 5mg/2-4 weeks, not the standard 10mg/week schedule."
  },

};

// ── Evidence Ingestion Pipeline (Phase 1 Infrastructure) ──
//
// Architecture for AI-assisted + human-reviewed study ingestion.
//
// CRITICAL WARNING: AI hallucinations in pharmacology are dangerous.
// DO NOT auto-publish extracted evidence without pharmacist/physician review.
//
// Pipeline flow:
//   PubMed / FDA / CPIC search
//   → AI extraction → normalized draft (createStudyDraft)
//   → INGESTION_QUEUE (awaiting review)
//   → human review & approval
//   → merge into STUDY_DB
//
// In a future version, this queue will be backed by a server-side review UI.
// For now it persists in memory for within-session use.

const INGESTION_QUEUE = [];   // drafts awaiting review

// createStudyDraft — create a structured evidence draft from raw inputs
// Called by future AI extraction pipeline or manual entry
function createStudyDraft({pmid, doi, title, year, source, journal, type, studyDesign, n,
                           phenotypes, quantifiedEffects, temporal, supports, contradicts, limitations}) {
  const id = `draft_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
  const draft = {
    id, _status:'pending_review',
    type: type || EVIDENCE_TIER.CLINICAL_PK,
    title: title || '',
    year: year || null,
    source: source || '',
    journal: journal || '',
    pmid: pmid || null,
    doi: doi || null,
    studyDesign: studyDesign || '',
    n: n || null,
    phenotypes: phenotypes || [],
    quantifiedEffects: quantifiedEffects || {},
    temporal: temporal || {},
    supports: supports || [],
    contradicts: contradicts || [],
    limitations: limitations || [],
    verified: false,
    verifyNote:'Auto-extracted draft — requires human pharmacist/physician review before use',
    _createdAt: new Date().toISOString(),
  };
  INGESTION_QUEUE.push(draft);
  return draft;
}

// reviewStudyDraft — approve a draft and merge into runtime STUDY_DB
// In production this would be a server-side operation with audit logging.
// For now it merges into the session-level STUDY_DB and marks as verified.
function reviewStudyDraft(draftId, reviewerNotes, approve) {
  const idx = INGESTION_QUEUE.findIndex(d => d.id === draftId);
  if (idx === -1) return { error: 'Draft not found' };
  const draft = INGESTION_QUEUE[idx];
  if (!approve) {
    draft._status = 'rejected';
    draft._reviewerNotes = reviewerNotes;
    return { status: 'rejected' };
  }
  const published = { ...draft, _status:'approved', verified:true,
    verifyNote: reviewerNotes || 'Human reviewed', _approvedAt: new Date().toISOString() };
  delete published._createdAt;
  STUDY_DB[published.id] = published;
  INGESTION_QUEUE.splice(idx, 1);
  invalidateGraph();  // graph must rebuild to pick up new evidence
  return { status:'published', id:published.id };
}

// getIngestionQueueStatus — returns summary for display
function getIngestionQueueStatus() {
  return {
    pending: INGESTION_QUEUE.filter(d => d._status === 'pending_review').length,
    rejected: INGESTION_QUEUE.filter(d => d._status === 'rejected').length,
    total: INGESTION_QUEUE.length,
  };
}

// Usage: getTemporalProfile(actorId) → { onset, offset, mechanism, reversible }
