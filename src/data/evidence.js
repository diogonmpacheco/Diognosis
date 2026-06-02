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
    pmid:null, doi:"10.1097/00004714-199404000-00002",
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
    pmid:"37754235", doi:null,
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

  "ev_statin_slco1b1_abcg2_cpic2022": {
    id:"ev_statin_slco1b1_abcg2_cpic2022",
    type:EVIDENCE_TIER.GUIDELINE,
    title:"CPIC Guideline for SLCO1B1, ABCG2, and CYP2C9 genotypes and statin-associated musculoskeletal symptoms",
    year:2022, source:"Cooper-DeHoff et al. / CPIC", journal:"Clin Pharmacol Ther",
    pmid:"35152405", doi:"10.1002/cpt.2557",
    url:"https://cpicpgx.org/guidelines/cpic-guideline-for-statins/",
    studyDesign:"systematic_review_guideline",
    n:null, phenotypes:["poor_metabolizer","intermediate_metabolizer","normal_metabolizer"],
    quantifiedEffects:{note:"SLCO1B1 decreased-function variants and ABCG2 reduced-function variants can increase exposure and statin-associated muscle symptom risk for specific statins; recommendations vary by statin and dose."},
    temporal:{mechanism:"hepatic_uptake_or_efflux_genotype_changes_statin_exposure"},
    supports:["simvastatin_SUBSTRATE_OF_SLCO1B1","atorvastatin_SUBSTRATE_OF_SLCO1B1","rosuvastatin_SUBSTRATE_OF_SLCO1B1","rosuvastatin_SUBSTRATE_OF_ABCG2"],
    contradicts:[],
    limitations:["Guideline recommendations are statin-specific; genotype is one risk factor among dose, age, comorbidity, and interacting drugs"],
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
    supports:["azathioprine_METABOLIZED_TO_6-thioguanine-nucleotides-6-tgn","azathioprine_NUDT15_thiopurine_toxicity"],
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
    year:2023, source:"J Pharmacol Exp Ther",
    pmid:"37679047", doi:"10.1124/jpet.123.001651",
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
    year:2023, source:"J Pharmacol Exp Ther",
    pmid:"37679047", doi:"10.1124/jpet.123.001651",
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
    pmid:"12392581", doi:"10.1046/j.1365-2125.2002.01683.x",
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
    pmid:"29189941", doi:"10.1007/s40262-017-0612-7",
    url:"https://pubmed.ncbi.nlm.nih.gov/29189941/",
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
    pmid:"24010633", doi:null,
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
    pmid:"30505695", doi:"10.1016/j.toxrep.2018.11.002",
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
  "ev_warfarin_cyp2c9_vkorc1_cyp4f2_cpic2017": {
    id:"ev_warfarin_cyp2c9_vkorc1_cyp4f2_cpic2017",
    type:EVIDENCE_TIER.GUIDELINE,
    title:"CPIC Guideline for Pharmacogenetics-Guided Warfarin Dosing: 2017 Update",
    year:2017, source:"Johnson et al. / CPIC", journal:"Clin Pharmacol Ther",
    pmid:"28198005", doi:"10.1002/cpt.668",
    url:"https://cpicpgx.org/guidelines/guideline-for-warfarin-and-cyp2c9-and-vkorc1/",
    studyDesign:"systematic_review_guideline",
    n:null,
    phenotypes:["poor_metabolizer","intermediate_metabolizer","normal_metabolizer"],
    quantifiedEffects:{note:"CPIC warfarin dosing algorithms incorporate CYP2C9, VKORC1, CYP4F2, and selected ancestry-linked variants when genotype results are available."},
    temporal:{mechanism:"warfarin_clearance_plus_vitamin_K_cycle_pharmacodynamic_sensitivity"},
    supports:["warfarin_SUBSTRATE_OF_CYP2C9","warfarin_VKORC1_sensitivity","warfarin_CYP4F2_vitamin_K_oxidation"],
    contradicts:[],
    limitations:["Dose algorithms require clinical factors and INR monitoring; allele coverage and ancestry context matter"],
    verified:true
  },

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
    pmid:"28613508", doi:null,
    url:"https://pubmed.ncbi.nlm.nih.gov/28613508/",
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
    pmid:"30700023", doi:null,
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
    pmid:"37286363", doi:"10.1124/dmd.122.001005",
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
    pmid:"12392581", doi:"10.1046/j.1365-2125.2002.01683.x",
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
    pmid:"12392581", doi:"10.1046/j.1365-2125.2002.01683.x",
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

  "ev_tyramine_maoi_labels": {
    id:"ev_tyramine_maoi_labels",
    type:EVIDENCE_TIER.FDA_LABEL,
    title:"MAOI labeling — tyramine-rich foods and hypertensive crisis",
    year:2025, source:"DailyMed phenelzine/tranylcypromine labels", journal:"DailyMed",
    url:"https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=phenelzine%20tyramine%20hypertensive%20crisis",
    studyDesign:"regulatory_label",
    n:null, phenotypes:[],
    quantifiedEffects:{note:"Nonselective MAO inhibition can permit dietary tyramine absorption and precipitate hypertensive crisis; labels instruct avoidance of high-tyramine foods during treatment and washout."},
    temporal:{mechanism:"intestinal_MAO_inhibition_plus_tyramine_pressor_response", washout:"up_to_2_weeks_after_irreversible_MAOI"},
    supports:["tyramine_rich_foods_MAO_substrate","maoi_tyramine_hypertensive_crisis"],
    contradicts:[],
    limitations:["Food tyramine content varies widely by preparation, storage, and spoilage","Risk differs across irreversible MAOIs, reversible MAO-A inhibitors, and selective MAO-B regimens"],
    verified:true
  },

  "ev_tacrolimus_cyp3a5_cpic": {
    id:"ev_tacrolimus_cyp3a5_cpic",
    type:EVIDENCE_TIER.GUIDELINE,
    title:"Clinical Pharmacogenetics Implementation Consortium Guidelines for CYP3A5 Genotype and Tacrolimus Dosing",
    year:2015, source:"Birdwell et al. / CPIC", journal:"Clin Pharmacol Ther",
    pmid:"25801146", doi:"10.1002/cpt.113",
    url:"https://cpicpgx.org/guidelines/guideline-for-tacrolimus-and-cyp3a5/",
    studyDesign:"systematic_review_guideline",
    n:null, phenotypes:["poor_metabolizer","intermediate_metabolizer","normal_metabolizer"],
    quantifiedEffects:{doseFold:1.5, note:"CYP3A5 expressers often require about 1.5-2x higher tacrolimus starting doses than non-expressers to reach similar trough concentrations; therapeutic drug monitoring remains mandatory."},
    temporal:{mechanism:"CYP3A5_expression_changes_tacrolimus_clearance"},
    supports:["tacrolimus_SUBSTRATE_OF_CYP3A5","cyp3a5_genotype_tacrolimus_dosing"],
    contradicts:[],
    limitations:["Guideline addresses starting dose; trough-guided titration remains standard","Transplant type, interacting drugs, hematocrit, time post-transplant, and ancestry can modify dose requirement"],
    verified:true
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

  // ═══ LIVE ENRICHMENT DRAFTS — UNREVIEWED, REVIEW REQUIRED ═══
  // Generated from scripts/enrich/drafts.json. These entries contain citation metadata
  // and paraphrased abstract-level findings only. They are live for review/discovery,
  // but verified:false and reviewRequired:true prevent treating them as curated evidence.
  "draft_metformin_oct2_elsby2018_28971610": {
    id:"draft_metformin_oct2_elsby2018_28971610",
    public:true,
    type:EVIDENCE_TIER.IN_VITRO,
    title:"Mechanistic in vitro studies confirm that inhibition of the renal apical efflux transporter multidrug and toxin extrusion (MATE) 1, and not altered absorption, underlies the increased metformin exposure observed in clinical interactions with cimetidine, trimethoprim or pyrimethamine.",
    year:2018,
    source:"Pharmacology research & perspectives",
    journal:"Pharmacology research & perspectives",
    pmid:"28971610",
    doi:"10.1002/prp2.357",
    url:"https://doi.org/10.1002/prp2.357",
    studyDesign:"in_vitro_mechanistic_study",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to metformin:OCT2, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "metformin_OCT2_transport"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:pubmed",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_metformin_oct2_asanos2025_40424011": {
    id:"draft_metformin_oct2_asanos2025_40424011",
    public:true,
    type:EVIDENCE_TIER.IN_VITRO,
    title:"Predicting OCT2/MATEs-Mediated Drug Interactions in Healthy Volunteers and Patients with Chronic Kidney Disease: Insights from Extended Clearance Concept, Endogenous Biomarkers, and In Vitro Inhibition Studies (Perspectives from the International Transporter Consortium).",
    year:2025,
    source:"Clin Pharmacol Ther",
    journal:"Clin Pharmacol Ther",
    pmid:"40424011",
    doi:"10.1002/cpt.3727",
    url:"https://doi.org/10.1002/cpt.3727",
    studyDesign:"in_vitro_mechanistic_study",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to metformin:OCT2, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "metformin_OCT2_transport"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_metformin_oct2_ailabounias2025_40098288": {
    id:"draft_metformin_oct2_ailabounias2025_40098288",
    public:true,
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Quantitative Contributions of Hepatic and Renal Organic Cation Transporters to the Clinical Pharmacokinetic Cimetidine-Metformin Interaction.",
    year:2025,
    source:"Clin Pharmacol Ther",
    journal:"Clin Pharmacol Ther",
    pmid:"40098288",
    doi:"10.1002/cpt.3639",
    url:"https://doi.org/10.1002/cpt.3639",
    studyDesign:"clinical_pk",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to metformin:OCT2, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "metformin_OCT2_transport"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_metformin_oct2_choimk2026_41599173": {
    id:"draft_metformin_oct2_choimk2026_41599173",
    public:true,
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Pharmacokinetics and Drug Interactions.",
    year:2026,
    source:"Pharmaceutics",
    journal:"Pharmaceutics",
    pmid:"41599173",
    doi:"10.3390/pharmaceutics18010067",
    url:"https://doi.org/10.3390/pharmaceutics18010067",
    studyDesign:"clinical_pk",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to metformin:OCT2, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "metformin_OCT2_transport"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_metformin_oct2_koishikawat2025_39497599": {
    id:"draft_metformin_oct2_koishikawat2025_39497599",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Effects of Cimetidine and Dolutegravir on the Endogenous Drug-Drug Interaction Biomarkers for Organic Cation Transporter 2 and Multidrug and Toxin Extrusion Protein 1 in Healthy Volunteers.",
    year:2025,
    source:"Clin Pharmacol Ther",
    journal:"Clin Pharmacol Ther",
    pmid:"39497599",
    doi:"10.1002/cpt.3482",
    url:"https://doi.org/10.1002/cpt.3482",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to metformin:OCT2, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "metformin_OCT2_transport"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_metformin_oct2_ailabounias2025_39997705": {
    id:"draft_metformin_oct2_ailabounias2025_39997705",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Is <i>N</i>1-Methylnicotinamide a Good Organic Cation Transporter 2 (OCT2) Biomarker?",
    year:2025,
    source:"Metabolites",
    journal:"Metabolites",
    pmid:"39997705",
    doi:"10.3390/metabo15020080",
    url:"https://doi.org/10.3390/metabo15020080",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to metformin:OCT2, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "metformin_OCT2_transport"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_metformin_oct2_giacomini2010_20190787": {
    id:"draft_metformin_oct2_giacomini2010_20190787",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Membrane transporters in drug development",
    year:2010,
    source:"Nature Reviews Drug Discovery",
    journal:"Nature Reviews Drug Discovery",
    pmid:"20190787",
    doi:"10.1038/nrd3028",
    url:"https://doi.org/10.1038/nrd3028",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to metformin:OCT2, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "metformin_OCT2_transport"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_metformin_oct2_hillgren2013_23588305": {
    id:"draft_metformin_oct2_hillgren2013_23588305",
    public:true,
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Emerging Transporters of Clinical Importance: An Update From the International Transporter Consortium",
    year:2013,
    source:"Clinical Pharmacology & Therapeutics",
    journal:"Clinical Pharmacology & Therapeutics",
    pmid:"23588305",
    doi:"10.1038/clpt.2013.74",
    url:"https://doi.org/10.1038/clpt.2013.74",
    studyDesign:"clinical_pk",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to metformin:OCT2, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "metformin_OCT2_transport"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_metformin_oct2_morrissey2012_23140242": {
    id:"draft_metformin_oct2_morrissey2012_23140242",
    public:true,
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Renal Transporters in Drug Development",
    year:2012,
    source:"The Annual Review of Pharmacology and Toxicology",
    journal:"The Annual Review of Pharmacology and Toxicology",
    pmid:"23140242",
    doi:"10.1146/annurev-pharmtox-011112-140317",
    url:"https://doi.org/10.1146/annurev-pharmtox-011112-140317",
    studyDesign:"clinical_pk",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to metformin:OCT2, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "metformin_OCT2_transport"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_metformin_oct2_eyal2010_20118196": {
    id:"draft_metformin_oct2_eyal2010_20118196",
    public:true,
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Pharmacokinetics of Metformin during Pregnancy",
    year:2010,
    source:"Drug Metabolism and Disposition",
    journal:"Drug Metabolism and Disposition",
    pmid:"20118196",
    doi:"10.1124/dmd.109.031245",
    url:"https://doi.org/10.1124/dmd.109.031245",
    studyDesign:"clinical_pk",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to metformin:OCT2, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "metformin_OCT2_transport"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_metformin_oct2_gervasoni2017_28114188": {
    id:"draft_metformin_oct2_gervasoni2017_28114188",
    public:true,
    type:EVIDENCE_TIER.META_ANALYSIS,
    title:"How Relevant is the Interaction Between Dolutegravir and Metformin in Real Life?",
    year:2017,
    source:"JAIDS Journal of Acquired Immune Deficiency Syndromes",
    journal:"JAIDS Journal of Acquired Immune Deficiency Syndromes",
    pmid:"28114188",
    doi:"10.1097/qai.0000000000001292",
    url:"https://doi.org/10.1097/qai.0000000000001292",
    studyDesign:"meta_analysis_or_systematic_review",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to metformin:OCT2, but no supported quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "metformin_OCT2_transport"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_fluoxetine_cyp2d6_alderman1997_9241008": {
    id:"draft_fluoxetine_cyp2d6_alderman1997_9241008",
    public:true,
    type:EVIDENCE_TIER.RCT,
    title:"Desipramine pharmacokinetics when coadministered with paroxetine or sertraline in extensive metabolizers.",
    year:1997,
    source:"Journal of clinical psychopharmacology",
    journal:"Journal of clinical psychopharmacology",
    pmid:"9241008",
    doi:"10.1097/00004714-199708000-00008",
    url:"https://doi.org/10.1097/00004714-199708000-00008",
    studyDesign:"randomized_controlled_trial",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "aucFold": 2,
      "note": "Abstract-level extraction for fluoxetine:CYP2D6 reports approximately 2-fold exposure change."
    },
    temporal:{},
    supports:[
      "fluoxetine_inhibits_CYP2D6",
      "norfluoxetine_inhibits_CYP2D6"
    ],
    contradicts:[],
    limitations:[
      "Abstract-level extraction only; requires human review before promotion",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"moderate",
    needsFullText:false,
    provenance:"search:pubmed",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_fluoxetine_cyp2d6_ereshefsky1996_8846618": {
    id:"draft_fluoxetine_cyp2d6_ereshefsky1996_8846618",
    public:true,
    type:EVIDENCE_TIER.IN_VITRO,
    title:"Antidepressant drug interactions and the cytochrome P450 system. The role of cytochrome P450 2D6.",
    year:1996,
    source:"Clinical pharmacokinetics",
    journal:"Clinical pharmacokinetics",
    pmid:"8846618",
    doi:"10.2165/00003088-199500291-00004",
    url:"https://doi.org/10.2165/00003088-199500291-00004",
    studyDesign:"in_vitro_mechanistic_study",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to fluoxetine:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "fluoxetine_inhibits_CYP2D6",
      "norfluoxetine_inhibits_CYP2D6"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:pubmed",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_fluoxetine_cyp2d6_isoherranenn2026_41494464": {
    id:"draft_fluoxetine_cyp2d6_isoherranenn2026_41494464",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Role of metabolites in drug-drug interactions.",
    year:2026,
    source:"Drug Metab Pharmacokinet",
    journal:"Drug Metab Pharmacokinet",
    pmid:"41494464",
    doi:"10.1016/j.dmpk.2025.101511",
    url:"https://doi.org/10.1016/j.dmpk.2025.101511",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to fluoxetine:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "fluoxetine_inhibits_CYP2D6",
      "norfluoxetine_inhibits_CYP2D6"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_fluoxetine_cyp2d6_truongj2025_39870954": {
    id:"draft_fluoxetine_cyp2d6_truongj2025_39870954",
    public:true,
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"An Exploration of the Interplay Between Caffeine and Antidepressants Through the Lens of Pharmacokinetics and Pharmacodynamics.",
    year:2025,
    source:"Eur J Drug Metab Pharmacokinet",
    journal:"Eur J Drug Metab Pharmacokinet",
    pmid:"39870954",
    doi:"10.1007/s13318-024-00928-x",
    url:"https://doi.org/10.1007/s13318-024-00928-x",
    studyDesign:"clinical_pk",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to fluoxetine:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "fluoxetine_inhibits_CYP2D6",
      "norfluoxetine_inhibits_CYP2D6"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_fluoxetine_cyp2d6_tanaudommongkoni2025_40245579": {
    id:"draft_fluoxetine_cyp2d6_tanaudommongkoni2025_40245579",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"The strong clinical interaction between bupropion and CYP2D6 is primarily mediated through bupropion metabolites and their stereoisomers: A paradigm for evaluating metabolites in drug-drug interaction risk.",
    year:2025,
    source:"Drug Metab Dispos",
    journal:"Drug Metab Dispos",
    pmid:"40245579",
    doi:"10.1016/j.dmd.2025.100070",
    url:"https://doi.org/10.1016/j.dmd.2025.100070",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to fluoxetine:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "fluoxetine_inhibits_CYP2D6",
      "norfluoxetine_inhibits_CYP2D6"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_fluoxetine_cyp2d6_zakarayaz2024_38543065": {
    id:"draft_fluoxetine_cyp2d6_zakarayaz2024_38543065",
    public:true,
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Pharmacokinetics and Pharmacodynamics: A Comprehensive Analysis of the Absorption, Distribution, Metabolism, and Excretion of Psychiatric Drugs.",
    year:2024,
    source:"Pharmaceuticals (Basel)",
    journal:"Pharmaceuticals (Basel)",
    pmid:"38543065",
    doi:"10.3390/ph17030280",
    url:"https://doi.org/10.3390/ph17030280",
    studyDesign:"clinical_pk",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to fluoxetine:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "fluoxetine_inhibits_CYP2D6",
      "norfluoxetine_inhibits_CYP2D6"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_fluoxetine_cyp2d6_parshenkovm2025_41440979": {
    id:"draft_fluoxetine_cyp2d6_parshenkovm2025_41440979",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Personalizing Antidepressant Therapy: Integrating Pharmacogenomics, Therapeutic Drug Monitoring, and Digital Tools for Improved Depression Outcomes.",
    year:2025,
    source:"J Pers Med",
    journal:"J Pers Med",
    pmid:"41440979",
    doi:"10.3390/jpm15120616",
    url:"https://doi.org/10.3390/jpm15120616",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to fluoxetine:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "fluoxetine_inhibits_CYP2D6",
      "norfluoxetine_inhibits_CYP2D6"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_fluoxetine_cyp2d6_hiemke2017_28910830": {
    id:"draft_fluoxetine_cyp2d6_hiemke2017_28910830",
    public:true,
    type:EVIDENCE_TIER.GUIDELINE,
    title:"Consensus Guidelines for Therapeutic Drug Monitoring in Neuropsychopharmacology: Update 2017",
    year:2017,
    source:"Pharmacopsychiatry",
    journal:"Pharmacopsychiatry",
    pmid:"28910830",
    doi:"10.1055/s-0043-116492",
    url:"https://doi.org/10.1055/s-0043-116492",
    studyDesign:"clinical_pk",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to fluoxetine:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "fluoxetine_inhibits_CYP2D6",
      "norfluoxetine_inhibits_CYP2D6"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_fluoxetine_cyp2d6_michalets1998_9469685": {
    id:"draft_fluoxetine_cyp2d6_michalets1998_9469685",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Update: Clinically Significant Cytochrome P‐450 Drug Interactions",
    year:1998,
    source:"Pharmacotherapy The Journal of Human Pharmacology and Drug Therapy",
    journal:"Pharmacotherapy The Journal of Human Pharmacology and Drug Therapy",
    pmid:"9469685",
    doi:"10.1002/j.1875-9114.1998.tb03830.x",
    url:"https://doi.org/10.1002/j.1875-9114.1998.tb03830.x",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to fluoxetine:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "fluoxetine_inhibits_CYP2D6",
      "norfluoxetine_inhibits_CYP2D6"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_fluoxetine_cyp2d6_holm1999_null": {
    id:"draft_fluoxetine_cyp2d6_holm1999_null",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Reboxetine",
    year:1999,
    source:"CNS Drugs",
    journal:"CNS Drugs",
    pmid:null,
    doi:"10.2165/00023210-199912010-00006",
    url:"https://doi.org/10.2165/00023210-199912010-00006",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to fluoxetine:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "fluoxetine_inhibits_CYP2D6",
      "norfluoxetine_inhibits_CYP2D6"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_hydroxybupropion_cyp2d6_yuj2024_39452902": {
    id:"draft_hydroxybupropion_cyp2d6_yuj2024_39452902",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Metabolite Measurement in Index Substrate Drug Interaction Studies: A Review of the Literature and Recent New Drug Application Reviews.",
    year:2024,
    source:"Metabolites",
    journal:"Metabolites",
    pmid:"39452902",
    doi:"10.3390/metabo14100522",
    url:"https://doi.org/10.3390/metabo14100522",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to hydroxybupropion:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "hydroxybupropion_inhibits_CYP2D6",
      "bupropion_cyp2d6_ddi"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_hydroxybupropion_cyp2d6_luechtur2025_40006546": {
    id:"draft_hydroxybupropion_cyp2d6_luechtur2025_40006546",
    public:true,
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Physiologically Based Pharmacokinetic Model of CYP2D6 Associated Interaction Between Venlafaxine and Strong Inhibitor Bupropion-The Influence of Age-Relevant Changes and Inhibitory Dose to Classify Therapeutical Success and Harm.",
    year:2025,
    source:"Pharmaceutics",
    journal:"Pharmaceutics",
    pmid:"40006546",
    doi:"10.3390/pharmaceutics17020179",
    url:"https://doi.org/10.3390/pharmaceutics17020179",
    studyDesign:"clinical_pk",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to hydroxybupropion:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "hydroxybupropion_inhibits_CYP2D6",
      "bupropion_cyp2d6_ddi"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_hydroxybupropion_cyp2d6_rdesheims2025_39953671": {
    id:"draft_hydroxybupropion_cyp2d6_rdesheims2025_39953671",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"A Comprehensive CYP2D6 Drug-Drug-Gene Interaction Network for Application in Precision Dosing and Drug Development.",
    year:2025,
    source:"Clin Pharmacol Ther",
    journal:"Clin Pharmacol Ther",
    pmid:"39953671",
    doi:"10.1002/cpt.3604",
    url:"https://doi.org/10.1002/cpt.3604",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to hydroxybupropion:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "hydroxybupropion_inhibits_CYP2D6",
      "bupropion_cyp2d6_ddi"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_hydroxybupropion_cyp2d6_ciocotianim2024_39590825": {
    id:"draft_hydroxybupropion_cyp2d6_ciocotianim2024_39590825",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Bupropion Increased More than Five Times the Systemic Exposure to Aripiprazole: An In Vivo Study in <i>Wistar albino</i> Rats.",
    year:2024,
    source:"Metabolites",
    journal:"Metabolites",
    pmid:"39590825",
    doi:"10.3390/metabo14110588",
    url:"https://doi.org/10.3390/metabo14110588",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to hydroxybupropion:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "hydroxybupropion_inhibits_CYP2D6",
      "bupropion_cyp2d6_ddi"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_hydroxybupropion_cyp2d6_bosilkovska2014_24722393": {
    id:"draft_hydroxybupropion_cyp2d6_bosilkovska2014_24722393",
    public:true,
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Geneva Cocktail for Cytochrome P450 and P-Glycoprotein Activity Assessment Using Dried Blood Spots",
    year:2014,
    source:"Clinical Pharmacology & Therapeutics",
    journal:"Clinical Pharmacology & Therapeutics",
    pmid:"24722393",
    doi:"10.1038/clpt.2014.83",
    url:"https://doi.org/10.1038/clpt.2014.83",
    studyDesign:"clinical_pk",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to hydroxybupropion:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "hydroxybupropion_inhibits_CYP2D6",
      "bupropion_cyp2d6_ddi"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_hydroxybupropion_cyp2d6_shirasaka2013_23620487": {
    id:"draft_hydroxybupropion_cyp2d6_shirasaka2013_23620487",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Inhibition of CYP2C19 and CYP3A4 by Omeprazole Metabolites and Their Contribution to Drug-Drug Interactions",
    year:2013,
    source:"Drug Metabolism and Disposition",
    journal:"Drug Metabolism and Disposition",
    pmid:"23620487",
    doi:"10.1124/dmd.113.051722",
    url:"https://doi.org/10.1124/dmd.113.051722",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to hydroxybupropion:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "hydroxybupropion_inhibits_CYP2D6",
      "bupropion_cyp2d6_ddi"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_hydroxybupropion_cyp2d6_kirby2011_21930825": {
    id:"draft_hydroxybupropion_cyp2d6_kirby2011_21930825",
    public:true,
    type:EVIDENCE_TIER.IN_VITRO,
    title:"Complex Drug Interactions of HIV Protease Inhibitors 2: In Vivo Induction and In Vitro to In Vivo Correlation of Induction of Cytochrome P450 1A2, 2B6, and 2C9 by Ritonavir or Nelfinavir",
    year:2011,
    source:"Drug Metabolism and Disposition",
    journal:"Drug Metabolism and Disposition",
    pmid:"21930825",
    doi:"10.1124/dmd.111.038646",
    url:"https://doi.org/10.1124/dmd.111.038646",
    studyDesign:"in_vitro_mechanistic_study",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to hydroxybupropion:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "hydroxybupropion_inhibits_CYP2D6",
      "bupropion_cyp2d6_ddi"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_hydroxybupropion_cyp2d6_protti2020_32285503": {
    id:"draft_hydroxybupropion_cyp2d6_protti2020_32285503",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"New‐generation, non‐SSRI antidepressants: Drug‐drug interactions and therapeutic drug monitoring. Part 2: NaSSAs, NRIs, SNDRIs, MASSAs, NDRIs, and others",
    year:2020,
    source:"Medicinal Research Reviews",
    journal:"Medicinal Research Reviews",
    pmid:"32285503",
    doi:"10.1002/med.21671",
    url:"https://doi.org/10.1002/med.21671",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to hydroxybupropion:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "hydroxybupropion_inhibits_CYP2D6",
      "bupropion_cyp2d6_ddi"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_vortioxetine_cyp2d6_lorvellecma2024_39444600": {
    id:"draft_vortioxetine_cyp2d6_lorvellecma2024_39444600",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Pharmacogenetics testing for poor response to antidepressants: a transnosographic case series.",
    year:2024,
    source:"Front Pharmacol",
    journal:"Front Pharmacol",
    pmid:"39444600",
    doi:"10.3389/fphar.2024.1440523",
    url:"https://doi.org/10.3389/fphar.2024.1440523",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to vortioxetine:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "vortioxetine_METABOLIZED_TO_vortioxetine-carboxylic-acid"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_vortioxetine_cyp2d6_lauschkevm2026_41806469": {
    id:"draft_vortioxetine_cyp2d6_lauschkevm2026_41806469",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"The evolving landscape of pharmacogenomics: Current achievements and future directions.",
    year:2026,
    source:"Pharmacol Rev",
    journal:"Pharmacol Rev",
    pmid:"41806469",
    doi:"10.1016/j.pharmr.2026.100122",
    url:"https://doi.org/10.1016/j.pharmr.2026.100122",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to vortioxetine:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "vortioxetine_METABOLIZED_TO_vortioxetine-carboxylic-acid"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_vortioxetine_cyp2d6_wangsy2025_41019984": {
    id:"draft_vortioxetine_cyp2d6_wangsy2025_41019984",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Impact of metabolic enzyme activity variability on dabrafenib disposition.",
    year:2025,
    source:"Front Pharmacol",
    journal:"Front Pharmacol",
    pmid:"41019984",
    doi:"10.3389/fphar.2025.1643618",
    url:"https://doi.org/10.3389/fphar.2025.1643618",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to vortioxetine:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "vortioxetine_METABOLIZED_TO_vortioxetine-carboxylic-acid"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_vortioxetine_cyp2d6_chen2013_23975654": {
    id:"draft_vortioxetine_cyp2d6_chen2013_23975654",
    public:true,
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Pharmacokinetic Drug Interactions Involving Vortioxetine (Lu AA21004), a Multimodal Antidepressant",
    year:2013,
    source:"Clinical Drug Investigation",
    journal:"Clinical Drug Investigation",
    pmid:"23975654",
    doi:"10.1007/s40261-013-0117-6",
    url:"https://doi.org/10.1007/s40261-013-0117-6",
    studyDesign:"clinical_pk",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to vortioxetine:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "vortioxetine_METABOLIZED_TO_vortioxetine-carboxylic-acid"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_vortioxetine_cyp2d6_strawn2023_36651686": {
    id:"draft_vortioxetine_cyp2d6_strawn2023_36651686",
    public:true,
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Adverse Effects of Antidepressant Medications and their Management in Children and Adolescents",
    year:2023,
    source:"Pharmacotherapy The Journal of Human Pharmacology and Drug Therapy",
    journal:"Pharmacotherapy The Journal of Human Pharmacology and Drug Therapy",
    pmid:"36651686",
    doi:"10.1002/phar.2767",
    url:"https://doi.org/10.1002/phar.2767",
    studyDesign:"clinical_pk",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to vortioxetine:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "vortioxetine_METABOLIZED_TO_vortioxetine-carboxylic-acid"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_vortioxetine_cyp2d6_yu2018_29572333": {
    id:"draft_vortioxetine_cyp2d6_yu2018_29572333",
    public:true,
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Risk of Clinically Relevant Pharmacokinetic-Based Drug-Drug Interactions with Drugs Approved by the U.S. Food and Drug Administration Between 2013 and 2016",
    year:2018,
    source:"Drug Metabolism and Disposition",
    journal:"Drug Metabolism and Disposition",
    pmid:"29572333",
    doi:"10.1124/dmd.117.078691",
    url:"https://doi.org/10.1124/dmd.117.078691",
    studyDesign:"clinical_pk",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to vortioxetine:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "vortioxetine_METABOLIZED_TO_vortioxetine-carboxylic-acid"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_metoclopramide_cyp2d6_desta2002_11854155": {
    id:"draft_metoclopramide_cyp2d6_desta2002_11854155",
    public:true,
    type:EVIDENCE_TIER.IN_VITRO,
    title:"The gastroprokinetic and antiemetic drug metoclopramide is a substrate and inhibitor of cytochrome P450 2D6.",
    year:2002,
    source:"Drug metabolism and disposition: the biological fate of chemicals",
    journal:"Drug metabolism and disposition: the biological fate of chemicals",
    pmid:"11854155",
    doi:"10.1124/dmd.30.3.336",
    url:"https://doi.org/10.1124/dmd.30.3.336",
    studyDesign:"in_vitro_mechanistic_study",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to metoclopramide:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "metoclopramide_METABOLIZED_TO_n-deethyl-metoclopramide"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:pubmed",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_metoclopramide_cyp2d6_lium2026_41820792": {
    id:"draft_metoclopramide_cyp2d6_lium2026_41820792",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Impact of CYP2D6 Metabolizer Status on Ondansetron Efficacy in Early Pregnancy Induced Nausea and Vomiting: A Case Control Study.",
    year:2026,
    source:"Clin Transl Sci",
    journal:"Clin Transl Sci",
    pmid:"41820792",
    doi:"10.1111/cts.70523",
    url:"https://doi.org/10.1111/cts.70523",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to metoclopramide:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "metoclopramide_METABOLIZED_TO_n-deethyl-metoclopramide"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_metoclopramide_cyp2d6_moorec2025_39899439": {
    id:"draft_metoclopramide_cyp2d6_moorec2025_39899439",
    public:true,
    type:EVIDENCE_TIER.META_ANALYSIS,
    title:"CYP2D6 genotype and associated 5-HT&lt;sub&gt;3&lt;/sub&gt; receptor antagonist outcomes: A systematic review and meta-analysis.",
    year:2025,
    source:"Clin Transl Sci",
    journal:"Clin Transl Sci",
    pmid:"39899439",
    doi:"10.1111/cts.70108",
    url:"https://doi.org/10.1111/cts.70108",
    studyDesign:"meta_analysis_or_systematic_review",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to metoclopramide:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "metoclopramide_METABOLIZED_TO_n-deethyl-metoclopramide"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_metoclopramide_cyp2d6_belania2024_39219201": {
    id:"draft_metoclopramide_cyp2d6_belania2024_39219201",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Challenging pharmacotherapy management of a psychotic disorder due to a delicate pharmacogenetic profile and drug-drug interactions: a case report and literature review.",
    year:2024,
    source:"Croat Med J",
    journal:"Croat Med J",
    pmid:"39219201",
    doi:null,
    url:"https://pubmed.ncbi.nlm.nih.gov/39219201/",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to metoclopramide:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "metoclopramide_METABOLIZED_TO_n-deethyl-metoclopramide"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_metoclopramide_cyp2d6_wittwernl2025_40895400": {
    id:"draft_metoclopramide_cyp2d6_wittwernl2025_40895400",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"The Prevalence of Potential Drug-Drug-Gene Interactions: A Descriptive Study Using Swiss Claims Data.",
    year:2025,
    source:"Pharmgenomics Pers Med",
    journal:"Pharmgenomics Pers Med",
    pmid:"40895400",
    doi:"10.2147/pgpm.s527556",
    url:"https://doi.org/10.2147/pgpm.s527556",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to metoclopramide:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "metoclopramide_METABOLIZED_TO_n-deethyl-metoclopramide"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_metoclopramide_cyp2d6_williams2001_11573533": {
    id:"draft_metoclopramide_cyp2d6_williams2001_11573533",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Codeine phosphate in paediatric medicine",
    year:2001,
    source:"British Journal of Anaesthesia",
    journal:"British Journal of Anaesthesia",
    pmid:"11573533",
    doi:"10.1093/bja/86.3.413",
    url:"https://doi.org/10.1093/bja/86.3.413",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to metoclopramide:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "metoclopramide_METABOLIZED_TO_n-deethyl-metoclopramide"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_metoclopramide_cyp2d6_stearns2003_14652237": {
    id:"draft_metoclopramide_cyp2d6_stearns2003_14652237",
    public:true,
    type:EVIDENCE_TIER.IN_VITRO,
    title:"Active Tamoxifen Metabolite Plasma Concentrations After Coadministration of Tamoxifen and the Selective Serotonin Reuptake Inhibitor Paroxetine",
    year:2003,
    source:"JNCI Journal of the National Cancer Institute",
    journal:"JNCI Journal of the National Cancer Institute",
    pmid:"14652237",
    doi:"10.1093/jnci/djg108",
    url:"https://doi.org/10.1093/jnci/djg108",
    studyDesign:"in_vitro_mechanistic_study",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to metoclopramide:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "metoclopramide_METABOLIZED_TO_n-deethyl-metoclopramide"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_metoclopramide_cyp2d6_hiemke2011_21969060": {
    id:"draft_metoclopramide_cyp2d6_hiemke2011_21969060",
    public:true,
    type:EVIDENCE_TIER.GUIDELINE,
    title:"AGNP Consensus Guidelines for Therapeutic Drug Monitoring in Psychiatry: Update 2011",
    year:2011,
    source:"Pharmacopsychiatry",
    journal:"Pharmacopsychiatry",
    pmid:"21969060",
    doi:"10.1055/s-0031-1286287",
    url:"https://doi.org/10.1055/s-0031-1286287",
    studyDesign:"clinical_pk",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to metoclopramide:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "metoclopramide_METABOLIZED_TO_n-deethyl-metoclopramide"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_metoclopramide_cyp2d6_zhou2017_28378927": {
    id:"draft_metoclopramide_cyp2d6_zhou2017_28378927",
    public:true,
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Worldwide Distribution of Cytochrome P450 Alleles: A Meta‐analysis of Population‐scale Sequencing Projects",
    year:2017,
    source:"Clinical Pharmacology & Therapeutics",
    journal:"Clinical Pharmacology & Therapeutics",
    pmid:"28378927",
    doi:"10.1002/cpt.690",
    url:"https://doi.org/10.1002/cpt.690",
    studyDesign:"clinical_pk",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to metoclopramide:CYP2D6, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "metoclopramide_METABOLIZED_TO_n-deethyl-metoclopramide"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_kratom_cyp_chiang2026_41743842": {
    id:"draft_kratom_cyp_chiang2026_41743842",
    public:true,
    type:EVIDENCE_TIER.IN_VITRO,
    title:"Physiologically Based Pharmacokinetic Model for Clinical Translation and Prediction of Drug Interaction of the Major Kratom Alkaloid, Mitragynine.",
    year:2026,
    source:"ACS pharmacology & translational science",
    journal:"ACS pharmacology & translational science",
    pmid:"41743842",
    doi:"10.1021/acsptsci.5c00718",
    url:"https://doi.org/10.1021/acsptsci.5c00718",
    studyDesign:"in_vitro_mechanistic_study",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to kratom:CYP, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "kratom_cyp_interaction_potential",
      "kratom_polysubstance_toxicity"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:pubmed",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_kratom_cyp_tanna2023_36924284": {
    id:"draft_kratom_cyp_tanna2023_36924284",
    public:true,
    type:EVIDENCE_TIER.IN_VITRO,
    title:"Clinical Assessment of the Drug Interaction Potential of the Psychotropic Natural Product Kratom.",
    year:2023,
    source:"Clinical pharmacology and therapeutics",
    journal:"Clinical pharmacology and therapeutics",
    pmid:"36924284",
    doi:"10.1002/cpt.2891",
    url:"https://doi.org/10.1002/cpt.2891",
    studyDesign:"in_vitro_mechanistic_study",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "aucFold": 50,
      "note": "Abstract-level extraction for kratom:CYP reports approximately 50-fold exposure change."
    },
    temporal:{},
    supports:[
      "kratom_cyp_interaction_potential",
      "kratom_polysubstance_toxicity"
    ],
    contradicts:[],
    limitations:[
      "Abstract-level extraction only; requires human review before promotion",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"moderate",
    needsFullText:false,
    provenance:"search:pubmed",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_kratom_cyp_brogdon2022_35165231": {
    id:"draft_kratom_cyp_brogdon2022_35165231",
    public:true,
    type:EVIDENCE_TIER.CASE_REPORT,
    title:"A Case of Potential Pharmacokinetic Kratom-drug Interactions Resulting in Toxicity and Subsequent Treatment of Kratom Use Disorder With Buprenorphine/Naloxone.",
    year:2022,
    source:"Journal of addiction medicine",
    journal:"Journal of addiction medicine",
    pmid:"35165231",
    doi:"10.1097/ADM.0000000000000968",
    url:"https://doi.org/10.1097/ADM.0000000000000968",
    studyDesign:"case_report",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to kratom:CYP, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "kratom_cyp_interaction_potential",
      "kratom_polysubstance_toxicity"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:pubmed",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_kratom_cyp_gnanasegarams2026_42051846": {
    id:"draft_kratom_cyp_gnanasegarams2026_42051846",
    public:true,
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Kratom Consumption Associated With Herb-Induced Liver Injury and a Pharmacokinetic Interaction: A Case Report.",
    year:2026,
    source:"Cureus",
    journal:"Cureus",
    pmid:"42051846",
    doi:"10.7759/cureus.106016",
    url:"https://doi.org/10.7759/cureus.106016",
    studyDesign:"clinical_pk",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to kratom:CYP, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "kratom_cyp_interaction_potential",
      "kratom_polysubstance_toxicity"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_kratom_cyp_akbarnh2025_40642117": {
    id:"draft_kratom_cyp_akbarnh2025_40642117",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Screening, docking, and molecular dynamics analysis of Mitragyna speciosa (Korth.) compounds for targeting HER2 in breast cancer.",
    year:2025,
    source:"Curr Res Struct Biol",
    journal:"Curr Res Struct Biol",
    pmid:"40642117",
    doi:"10.1016/j.crstbi.2025.100171",
    url:"https://doi.org/10.1016/j.crstbi.2025.100171",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to kratom:CYP, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "kratom_cyp_interaction_potential",
      "kratom_polysubstance_toxicity"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_kratom_cyp_alfordas2025_40006036": {
    id:"draft_kratom_cyp_alfordas2025_40006036",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Exploring the Therapeutic Potential of Mitragynine and Corynoxeine: Kratom-Derived Indole and Oxindole Alkaloids for Pain Management.",
    year:2025,
    source:"Pharmaceuticals (Basel)",
    journal:"Pharmaceuticals (Basel)",
    pmid:"40006036",
    doi:"10.3390/ph18020222",
    url:"https://doi.org/10.3390/ph18020222",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to kratom:CYP, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "kratom_cyp_interaction_potential",
      "kratom_polysubstance_toxicity"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_kratom_cyp_mccurdycr2024_38217374": {
    id:"draft_kratom_cyp_mccurdycr2024_38217374",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"An update on the clinical pharmacology of kratom: uses, abuse potential, and future considerations.",
    year:2024,
    source:"Expert Rev Clin Pharmacol",
    journal:"Expert Rev Clin Pharmacol",
    pmid:"38217374",
    doi:"10.1080/17512433.2024.2305798",
    url:"https://doi.org/10.1080/17512433.2024.2305798",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to kratom:CYP, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "kratom_cyp_interaction_potential",
      "kratom_polysubstance_toxicity"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_kratom_cyp_melchertpw2024_39299374": {
    id:"draft_kratom_cyp_melchertpw2024_39299374",
    public:true,
    type:EVIDENCE_TIER.IN_VITRO,
    title:"An in vitro evaluation on metabolism of mitragynine to 9-O-demethylmitragynine.",
    year:2024,
    source:"Chem Biol Interact",
    journal:"Chem Biol Interact",
    pmid:"39299374",
    doi:"10.1016/j.cbi.2024.111247",
    url:"https://doi.org/10.1016/j.cbi.2024.111247",
    studyDesign:"in_vitro_mechanistic_study",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to kratom:CYP, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "kratom_cyp_interaction_potential",
      "kratom_polysubstance_toxicity"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_kratom_cyp_eastlack2020_31994019": {
    id:"draft_kratom_cyp_eastlack2020_31994019",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Kratom—Pharmacology, Clinical Implications, and Outlook: A Comprehensive Review",
    year:2020,
    source:"Pain and Therapy",
    journal:"Pain and Therapy",
    pmid:"31994019",
    doi:"10.1007/s40122-020-00151-x",
    url:"https://doi.org/10.1007/s40122-020-00151-x",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to kratom:CYP, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "kratom_cyp_interaction_potential",
      "kratom_polysubstance_toxicity"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_kratom_cyp_rashid2026_null": {
    id:"draft_kratom_cyp_rashid2026_null",
    public:true,
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Therapeutic Potential, Predictive Pharmaceutical Modeling, and Metabolic Interactions of the Oxindole Kratom Alkaloids",
    year:2026,
    source:"Journal of Phytomedicine",
    journal:"Journal of Phytomedicine",
    pmid:null,
    doi:"10.3390/jphytomed1010002",
    url:"https://doi.org/10.3390/jphytomed1010002",
    studyDesign:"clinical_pk",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to kratom:CYP, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "kratom_cyp_interaction_potential",
      "kratom_polysubstance_toxicity"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_kratom_cyp_veltri2019_31308789": {
    id:"draft_kratom_cyp_veltri2019_31308789",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"&lt;p&gt;Current perspectives on the impact of Kratom use&lt;/p&gt;",
    year:2019,
    source:"Substance Abuse and Rehabilitation",
    journal:"Substance Abuse and Rehabilitation",
    pmid:"31308789",
    doi:"10.2147/sar.s164261",
    url:"https://doi.org/10.2147/sar.s164261",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to kratom:CYP, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "kratom_cyp_interaction_potential",
      "kratom_polysubstance_toxicity"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_kratom_cyp_wananukul2015_25995615": {
    id:"draft_kratom_cyp_wananukul2015_25995615",
    public:true,
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Pharmacokinetics of mitragynine in man",
    year:2015,
    source:"Drug Design Development and Therapy",
    journal:"Drug Design Development and Therapy",
    pmid:"25995615",
    doi:"10.2147/dddt.s79658",
    url:"https://doi.org/10.2147/dddt.s79658",
    studyDesign:"clinical_pk",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to kratom:CYP, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "kratom_cyp_interaction_potential",
      "kratom_polysubstance_toxicity"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_kratom_cyp_kong2011_21876481": {
    id:"draft_kratom_cyp_kong2011_21876481",
    public:true,
    type:EVIDENCE_TIER.IN_VITRO,
    title:"Evaluation of the Effects of Mitragyna speciosa Alkaloid Extract on Cytochrome P450 Enzymes Using a High Throughput Assay",
    year:2011,
    source:"Molecules",
    journal:"Molecules",
    pmid:"21876481",
    doi:"10.3390/molecules16097344",
    url:"https://doi.org/10.3390/molecules16097344",
    studyDesign:"in_vitro_mechanistic_study",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to kratom:CYP, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "kratom_cyp_interaction_potential",
      "kratom_polysubstance_toxicity"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_st_johns_wort_cyp3a4_pgp_zahner2020_30739325": {
    id:"draft_st_johns_wort_cyp3a4_pgp_zahner2020_30739325",
    public:true,
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"No Clinically Relevant Interactions of St. John's Wort Extract Ze 117 Low in Hyperforin With Cytochrome P450 Enzymes and P-glycoprotein.",
    year:2020,
    source:"Clinical pharmacology and therapeutics",
    journal:"Clinical pharmacology and therapeutics",
    pmid:"30739325",
    doi:"10.1002/cpt.1392",
    url:"https://doi.org/10.1002/cpt.1392",
    studyDesign:"clinical_pk",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to st_johns_wort:CYP3A4_Pgp, but no supported quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "st_johns_wort_induces_CYP3A4",
      "st_johns_wort_induces_P-gp"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:pubmed",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_st_johns_wort_cyp3a4_pgp_huppertz2019_30192025": {
    id:"draft_st_johns_wort_cyp3a4_pgp_huppertz2019_30192025",
    public:true,
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"Rivaroxaban and macitentan can be coadministered without dose adjustment but the combination of rivaroxaban and St John's wort should be avoided.",
    year:2019,
    source:"British journal of clinical pharmacology",
    journal:"British journal of clinical pharmacology",
    pmid:"30192025",
    doi:"10.1111/bcp.13757",
    url:"https://doi.org/10.1111/bcp.13757",
    studyDesign:"clinical_pk",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to st_johns_wort:CYP3A4_Pgp, but no supported quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "st_johns_wort_induces_CYP3A4",
      "st_johns_wort_induces_P-gp"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:pubmed",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_st_johns_wort_cyp3a4_pgp_arold2005_15856409": {
    id:"draft_st_johns_wort_cyp3a4_pgp_arold2005_15856409",
    public:true,
    type:EVIDENCE_TIER.RCT,
    title:"No relevant interaction with alprazolam, caffeine, tolbutamide, and digoxin by treatment with a low-hyperforin St John's wort extract.",
    year:2005,
    source:"Planta medica",
    journal:"Planta medica",
    pmid:"15856409",
    doi:"10.1055/s-2005-864099",
    url:"https://doi.org/10.1055/s-2005-864099",
    studyDesign:"randomized_controlled_trial",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to st_johns_wort:CYP3A4_Pgp, but no supported quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "st_johns_wort_induces_CYP3A4",
      "st_johns_wort_induces_P-gp"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:pubmed",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_st_johns_wort_cyp3a4_pgp_cascorbii2025_40388112": {
    id:"draft_st_johns_wort_cyp3a4_pgp_cascorbii2025_40388112",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Deciphering the Relative Contribution of CYP3A4 Versus P-Glycoprotein for the Shared Substrate Cyclosporine-Commentary on Lown et al.",
    year:2025,
    source:"Clin Pharmacol Ther",
    journal:"Clin Pharmacol Ther",
    pmid:"40388112",
    doi:"10.1002/cpt.3619",
    url:"https://doi.org/10.1002/cpt.3619",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to st_johns_wort:CYP3A4_Pgp, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "st_johns_wort_induces_CYP3A4",
      "st_johns_wort_induces_P-gp"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_st_johns_wort_cyp3a4_pgp_coumauc2025_40349292": {
    id:"draft_st_johns_wort_cyp3a4_pgp_coumauc2025_40349292",
    public:true,
    type:EVIDENCE_TIER.META_ANALYSIS,
    title:"A Systematic Review and Classification of the Effects of P-glycoprotein Inhibitors and Inducers in Humans, Using Digoxin, Fexofenadine, and Dabigatran as Probe Drugs.",
    year:2025,
    source:"Clin Pharmacokinet",
    journal:"Clin Pharmacokinet",
    pmid:"40349292",
    doi:"10.1007/s40262-025-01514-3",
    url:"https://doi.org/10.1007/s40262-025-01514-3",
    studyDesign:"meta_analysis_or_systematic_review",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to st_johns_wort:CYP3A4_Pgp, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "st_johns_wort_induces_CYP3A4",
      "st_johns_wort_induces_P-gp"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_st_johns_wort_cyp3a4_pgp_hollanderem2026_41552958": {
    id:"draft_st_johns_wort_cyp3a4_pgp_hollanderem2026_41552958",
    public:true,
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"No relevant pharmacokinetic interaction between the KRAS G12C inhibitor sotorasib and the direct oral anticoagulant rivaroxaban in healthy subjects.",
    year:2026,
    source:"Int J Cancer",
    journal:"Int J Cancer",
    pmid:"41552958",
    doi:"10.1002/ijc.70326",
    url:"https://doi.org/10.1002/ijc.70326",
    studyDesign:"clinical_pk",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to st_johns_wort:CYP3A4_Pgp, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "st_johns_wort_induces_CYP3A4",
      "st_johns_wort_induces_P-gp"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_st_johns_wort_cyp3a4_pgp_nersesjanm2025_38450747": {
    id:"draft_st_johns_wort_cyp3a4_pgp_nersesjanm2025_38450747",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Paliperidone poisoning and measurable plasma concentrations 2.5 years after last administered dose: A case report.",
    year:2025,
    source:"Br J Clin Pharmacol",
    journal:"Br J Clin Pharmacol",
    pmid:"38450747",
    doi:"10.1111/bcp.16036",
    url:"https://doi.org/10.1111/bcp.16036",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to st_johns_wort:CYP3A4_Pgp, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "st_johns_wort_induces_CYP3A4",
      "st_johns_wort_induces_P-gp"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_st_johns_wort_cyp3a4_pgp_yaoj2025_41258782": {
    id:"draft_st_johns_wort_cyp3a4_pgp_yaoj2025_41258782",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Effects of Botrychium ternatum (Thunb) Sw. On Cytochrome P450 Activities in Rats.",
    year:2025,
    source:"Pharmacol Res Perspect",
    journal:"Pharmacol Res Perspect",
    pmid:"41258782",
    doi:"10.1002/prp2.70188",
    url:"https://doi.org/10.1002/prp2.70188",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to st_johns_wort:CYP3A4_Pgp, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "st_johns_wort_induces_CYP3A4",
      "st_johns_wort_induces_P-gp"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_st_johns_wort_cyp3a4_pgp_huang2004_14749688": {
    id:"draft_st_johns_wort_cyp3a4_pgp_huang2004_14749688",
    public:true,
    type:EVIDENCE_TIER.META_ANALYSIS,
    title:"Drug interactions with herbal products and grapefruit juice: a conference report",
    year:2004,
    source:"Clinical Pharmacology & Therapeutics",
    journal:"Clinical Pharmacology & Therapeutics",
    pmid:"14749688",
    doi:"10.1016/j.clpt.2003.07.002",
    url:"https://doi.org/10.1016/j.clpt.2003.07.002",
    studyDesign:"meta_analysis_or_systematic_review",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "clearanceReductionPct": 20,
      "note": "Abstract-level extraction for st_johns_wort:CYP3A4_Pgp reports about 20% clearance change."
    },
    temporal:{},
    supports:[
      "st_johns_wort_induces_CYP3A4",
      "st_johns_wort_induces_P-gp"
    ],
    contradicts:[],
    limitations:[
      "Abstract-level extraction only; requires human review before promotion",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"moderate",
    needsFullText:false,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_st_johns_wort_cyp3a4_pgp_motzer2015_26406148": {
    id:"draft_st_johns_wort_cyp3a4_pgp_motzer2015_26406148",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Nivolumab versus Everolimus in Advanced Renal-Cell Carcinoma",
    year:2015,
    source:"New England Journal of Medicine",
    journal:"New England Journal of Medicine",
    pmid:"26406148",
    doi:"10.1056/nejmoa1510665",
    url:"https://doi.org/10.1056/nejmoa1510665",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to st_johns_wort:CYP3A4_Pgp, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "st_johns_wort_induces_CYP3A4",
      "st_johns_wort_induces_P-gp"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_st_johns_wort_cyp3a4_pgp_tsunoda2001_null": {
    id:"draft_st_johns_wort_cyp3a4_pgp_tsunoda2001_null",
    public:true,
    type:EVIDENCE_TIER.IN_VITRO,
    title:"Red wine decreases cyclosporine bioavailability",
    year:2001,
    source:"Clinical Pharmacology & Therapeutics",
    journal:"Clinical Pharmacology & Therapeutics",
    pmid:null,
    doi:"10.1016/s0009-9236(01)70992-7",
    url:"https://doi.org/10.1016/s0009-9236(01)70992-7",
    studyDesign:"in_vitro_mechanistic_study",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to st_johns_wort:CYP3A4_Pgp, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "st_johns_wort_induces_CYP3A4",
      "st_johns_wort_induces_P-gp"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_st_johns_wort_cyp3a4_pgp_zhang2017_28986954": {
    id:"draft_st_johns_wort_cyp3a4_pgp_zhang2017_28986954",
    public:true,
    type:EVIDENCE_TIER.CASE_REPORT,
    title:"Role of CYP3A in Oral Contraceptives Clearance",
    year:2017,
    source:"Clinical and Translational Science",
    journal:"Clinical and Translational Science",
    pmid:"28986954",
    doi:"10.1111/cts.12499",
    url:"https://doi.org/10.1111/cts.12499",
    studyDesign:"case_report",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "aucFold": 2.7,
      "note": "Abstract-level extraction for st_johns_wort:CYP3A4_Pgp reports approximately 2.7-fold exposure change."
    },
    temporal:{},
    supports:[
      "st_johns_wort_induces_CYP3A4",
      "st_johns_wort_induces_P-gp"
    ],
    contradicts:[],
    limitations:[
      "Abstract-level extraction only; requires human review before promotion",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"moderate",
    needsFullText:false,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_clobazam_cyp2c19_huddartr2018_29517622": {
    id:"draft_clobazam_cyp2c19_huddartr2018_29517622",
    public:true,
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"PharmGKB summary: clobazam pathway, pharmacokinetics.",
    year:2018,
    source:"Pharmacogenet Genomics",
    journal:"Pharmacogenet Genomics",
    pmid:"29517622",
    doi:"10.1097/fpc.0000000000000327",
    url:"https://doi.org/10.1097/fpc.0000000000000327",
    studyDesign:"clinical_pk",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to clobazam:CYP2C19, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "clobazam_METABOLIZED_TO_n-desmethylclobazam-norclobazam"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_clobazam_cyp2c19_kamh2020_33266292": {
    id:"draft_clobazam_cyp2c19_kamh2020_33266292",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Pharmacogenomic Biomarkers and Their Applications in Psychiatry.",
    year:2020,
    source:"Genes (Basel)",
    journal:"Genes (Basel)",
    pmid:"33266292",
    doi:"10.3390/genes11121445",
    url:"https://doi.org/10.3390/genes11121445",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to clobazam:CYP2C19, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "clobazam_METABOLIZED_TO_n-desmethylclobazam-norclobazam"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_clobazam_cyp2c19_deleonj2013_23318278": {
    id:"draft_clobazam_cyp2c19_deleonj2013_23318278",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Clobazam therapeutic drug monitoring:  a comprehensive review of the literature with proposals to improve future studies.",
    year:2013,
    source:"Ther Drug Monit",
    journal:"Ther Drug Monit",
    pmid:"23318278",
    doi:"10.1097/ftd.0b013e31827ada88",
    url:"https://doi.org/10.1097/ftd.0b013e31827ada88",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to clobazam:CYP2C19, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "clobazam_METABOLIZED_TO_n-desmethylclobazam-norclobazam"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:europepmc",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_clobazam_cyp2c19_faulkner2015_26089675": {
    id:"draft_clobazam_cyp2c19_faulkner2015_26089675",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Comprehensive overview: efficacy, tolerability, and cost-effectiveness of clobazam in Lennox&amp;ndash;Gastaut syndrome",
    year:2015,
    source:"Therapeutics and Clinical Risk Management",
    journal:"Therapeutics and Clinical Risk Management",
    pmid:"26089675",
    doi:"10.2147/tcrm.s55930",
    url:"https://doi.org/10.2147/tcrm.s55930",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to clobazam:CYP2C19, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "clobazam_METABOLIZED_TO_n-desmethylclobazam-norclobazam"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_clobazam_cyp2c19_filipiuc2023_37513960": {
    id:"draft_clobazam_cyp2c19_filipiuc2023_37513960",
    public:true,
    type:EVIDENCE_TIER.CLINICAL_PK,
    title:"The Skin and Natural Cannabinoids–Topical and Transdermal Applications",
    year:2023,
    source:"Pharmaceuticals",
    journal:"Pharmaceuticals",
    pmid:"37513960",
    doi:"10.3390/ph16071049",
    url:"https://doi.org/10.3390/ph16071049",
    studyDesign:"clinical_pk",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to clobazam:CYP2C19, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "clobazam_METABOLIZED_TO_n-desmethylclobazam-norclobazam"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_clobazam_cyp2c19_motycka2018_null": {
    id:"draft_clobazam_cyp2c19_motycka2018_null",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"The Impact of Medical Marijuana on Pharmacy Practice",
    year:2018,
    source:"Advances in Pharmacology and Pharmacy",
    journal:"Advances in Pharmacology and Pharmacy",
    pmid:null,
    doi:"10.13189/app.2018.060102",
    url:"https://doi.org/10.13189/app.2018.060102",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to clobazam:CYP2C19, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "clobazam_METABOLIZED_TO_n-desmethylclobazam-norclobazam"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  "draft_clobazam_cyp2c19_vegagarca2021_33510627": {
    id:"draft_clobazam_cyp2c19_vegagarca2021_33510627",
    public:true,
    type:EVIDENCE_TIER.OBSERVATIONAL,
    title:"Cannabinoids: A New Perspective on Epileptogenesis and Seizure Treatment in Early Life in Basic and Clinical Studies",
    year:2021,
    source:"Frontiers in Behavioral Neuroscience",
    journal:"Frontiers in Behavioral Neuroscience",
    pmid:"33510627",
    doi:"10.3389/fnbeh.2020.610484",
    url:"https://doi.org/10.3389/fnbeh.2020.610484",
    studyDesign:"observational_or_screened_pubmed_record",
    n:null,
    phenotypes:[],
    quantifiedEffects:{
      "note": "Citation appears relevant to clobazam:CYP2C19, but no quantitative value was extractable from the abstract."
    },
    temporal:{},
    supports:[
      "clobazam_METABOLIZED_TO_n-desmethylclobazam-norclobazam"
    ],
    contradicts:[],
    limitations:[
      "No abstract-extractable quantitative value",
      "Live enrichment entry promoted before human review; do not use for severity escalation without review"
    ],
    confidence:"low",
    needsFullText:true,
    provenance:"search:openalex",
    reviewRequired:true,
    verified:false,
    verifyNote:"Live enrichment entry awaiting human pharmacist/physician review; citation metadata and abstract-level facts only"
  },

  // ═══ HLA IMMUNE-RISK PHARMACOGENETICS ═══
  "ev_carbamazepine_oxcarbazepine_hla_cpic2017": {
    id:"ev_carbamazepine_oxcarbazepine_hla_cpic2017",
    public:true,
    type:EVIDENCE_TIER.GUIDELINE,
    title:"CPIC Guideline for HLA Genotype and Use of Carbamazepine and Oxcarbazepine: 2017 Update",
    year:2018,
    source:"CPIC",
    journal:"Clinical Pharmacology & Therapeutics",
    pmid:"29385237",
    doi:"10.1002/cpt.1004",
    url:"https://cpicpgx.org/guidelines/guideline-for-carbamazepine-and-hla-b/",
    studyDesign:"clinical_pharmacogenetics_guideline",
    n:null,
    phenotypes:["risk_allele_absent","risk_allele_present"],
    quantifiedEffects:{note:"HLA-B*15:02 and HLA-A*31:01 are used to guide carbamazepine therapy; HLA-B*15:02 is also used for oxcarbazepine SJS/TEN risk."},
    temporal:{mechanism:"HLA-mediated immune hypersensitivity"},
    supports:["carbamazepine_HLA-B*15:02_sjs_ten","carbamazepine_HLA-A*31:01_hypersensitivity","oxcarbazepine_HLA-B*15:02_sjs_ten"],
    contradicts:[],
    limitations:["Risk varies by ancestry and allele prevalence","Absence of the allele does not eliminate non-HLA hypersensitivity risk"],
    confidence:"high",
    verified:true
  },

  "ev_abacavir_hlab5701_cpic2012": {
    id:"ev_abacavir_hlab5701_cpic2012",
    public:true,
    type:EVIDENCE_TIER.GUIDELINE,
    title:"CPIC Guidelines for HLA-B Genotype and Abacavir Dosing",
    year:2012,
    source:"CPIC",
    journal:"Clinical Pharmacology & Therapeutics",
    pmid:"22378157",
    doi:"10.1038/clpt.2011.355",
    url:"https://cpicpgx.org/guidelines/guideline-for-abacavir-and-hla-b/",
    studyDesign:"clinical_pharmacogenetics_guideline",
    n:null,
    phenotypes:["risk_allele_absent","risk_allele_present"],
    quantifiedEffects:{note:"HLA-B*57:01 predicts abacavir hypersensitivity; abacavir is not recommended for allele-positive patients."},
    temporal:{mechanism:"HLA-mediated abacavir hypersensitivity"},
    supports:["abacavir_HLA-B*57:01_hypersensitivity"],
    contradicts:[],
    limitations:["Applies only when HLA-B*57:01 genotype result is known","Clinical diagnosis remains important if symptoms occur"],
    confidence:"high",
    verified:true
  },

  "ev_allopurinol_hlab5801_cpic2015": {
    id:"ev_allopurinol_hlab5801_cpic2015",
    public:true,
    type:EVIDENCE_TIER.GUIDELINE,
    title:"CPIC Guidelines for HLA-B Genotype and Allopurinol Dosing: 2015 Update",
    year:2015,
    source:"CPIC",
    journal:"Clinical Pharmacology & Therapeutics",
    pmid:"26306456",
    doi:"10.1002/cpt.161",
    url:"https://cpicpgx.org/guidelines/guideline-for-allopurinol-and-hla-b/",
    studyDesign:"clinical_pharmacogenetics_guideline",
    n:null,
    phenotypes:["risk_allele_absent","risk_allele_present"],
    quantifiedEffects:{note:"HLA-B*58:01 is associated with allopurinol severe cutaneous adverse reactions; CPIC recommends allopurinol is contraindicated when present."},
    temporal:{mechanism:"HLA-mediated severe cutaneous adverse reaction"},
    supports:["allopurinol_HLA-B*58:01_scar"],
    contradicts:[],
    limitations:["Risk also depends on clinical factors such as renal function and starting dose","Allele absence does not eliminate rash or hypersensitivity risk"],
    confidence:"high",
    verified:true
  },

  "ev_phenytoin_cyp2c9_hlab_cpic2020": {
    id:"ev_phenytoin_cyp2c9_hlab_cpic2020",
    public:true,
    type:EVIDENCE_TIER.GUIDELINE,
    title:"CPIC Guideline for CYP2C9 and HLA-B Genotypes and Phenytoin Dosing: 2020 Update",
    year:2020,
    source:"CPIC",
    journal:"Clinical Pharmacology & Therapeutics",
    pmid:"32779747",
    doi:null,
    url:"https://cpicpgx.org/guidelines/guideline-for-phenytoin-and-cyp2c9/",
    studyDesign:"clinical_pharmacogenetics_guideline",
    n:null,
    phenotypes:["poor_metabolizer","intermediate_metabolizer","normal_metabolizer","risk_allele_absent","risk_allele_present"],
    quantifiedEffects:{note:"CYP2C9 guides phenytoin dose/exposure; HLA-B*15:02 informs severe cutaneous adverse reaction risk."},
    temporal:{mechanism:"CYP2C9 clearance plus HLA-mediated cutaneous hypersensitivity"},
    supports:["phenytoin_CYP2C9_dose","phenytoin_HLA-B*15:02_scar"],
    contradicts:[],
    limitations:["HLA-B*15:02 allele prevalence differs substantially by ancestry","Therapeutic drug monitoring remains important for phenytoin"],
    confidence:"high",
    verified:true
  },

  "ev_rasburicase_g6pd_cpic2014": {
    id:"ev_rasburicase_g6pd_cpic2014",
    public:true,
    type:EVIDENCE_TIER.GUIDELINE,
    title:"CPIC Guidelines for Rasburicase Therapy in the Context of G6PD Deficiency Genotype",
    year:2014,
    source:"CPIC",
    journal:"Clinical Pharmacology & Therapeutics",
    pmid:"24787449",
    doi:"10.1038/clpt.2014.97",
    url:"https://pubmed.ncbi.nlm.nih.gov/24787449/",
    studyDesign:"clinical_pharmacogenetics_guideline",
    n:null,
    phenotypes:["risk_allele_absent","risk_allele_present"],
    quantifiedEffects:{note:"Rasburicase is contraindicated in G6PD deficiency because of acute hemolytic anemia and methemoglobinemia risk; G6PD deficiency also increases susceptibility to oxidative-stress hemolysis from selected drugs."},
    temporal:{onset:"hours_to_days", mechanism:"oxidative_hemolysis"},
    supports:["rasburicase_G6PD_deficiency_contraindication","g6pd_oxidative_drug_hemolysis"],
    contradicts:[],
    limitations:["Clinical risk varies by G6PD activity, dose, and oxidative stress burden","G6PD status may require enzyme testing rather than genotype alone in some settings"],
    confidence:"high",
    verified:true
  },

  "ev_aminoglycoside_mtrnr1_cpic2021": {
    id:"ev_aminoglycoside_mtrnr1_cpic2021",
    public:true,
    type:EVIDENCE_TIER.GUIDELINE,
    title:"CPIC Guideline for the Use of Aminoglycosides Based on MT-RNR1 Genotype",
    year:2021,
    source:"CPIC",
    journal:"Clinical Pharmacology & Therapeutics",
    pmid:"34032273",
    doi:"10.1002/cpt.2309",
    url:"https://pubmed.ncbi.nlm.nih.gov/34032273/",
    studyDesign:"clinical_pharmacogenetics_guideline",
    n:null,
    phenotypes:["risk_allele_absent","risk_allele_present"],
    quantifiedEffects:{note:"MT-RNR1 m.1555A>G, m.1494C>T, and m.1095T>C increase risk of irreversible aminoglycoside-induced hearing loss, even at therapeutic levels."},
    temporal:{onset:"single_dose_to_days", mechanism:"mitochondrial_12s_rRNA_aminoglycoside_binding"},
    supports:["mtrnr1_aminoglycoside_ototoxicity"],
    contradicts:[],
    limitations:["Negative genotype does not remove ordinary dose-, duration-, or renal-function-related ototoxicity risk","Urgent infection contexts may require risk-benefit decisions when alternatives are unsuitable"],
    confidence:"high",
    verified:true
  },

  "ev_volatile_succinylcholine_ryr1_cacna1s_cpic2019": {
    id:"ev_volatile_succinylcholine_ryr1_cacna1s_cpic2019",
    public:true,
    type:EVIDENCE_TIER.GUIDELINE,
    title:"CPIC Guideline for Potent Volatile Anesthetic Agents and Succinylcholine in the Context of RYR1 or CACNA1S Genotypes",
    year:2019,
    source:"CPIC",
    journal:"Clinical Pharmacology & Therapeutics",
    pmid:"30499100",
    doi:"10.1002/cpt.1319",
    url:"https://pubmed.ncbi.nlm.nih.gov/30499100/",
    studyDesign:"clinical_pharmacogenetics_guideline",
    n:null,
    phenotypes:["risk_allele_absent","risk_allele_present"],
    quantifiedEffects:{note:"Malignant-hyperthermia-associated RYR1/CACNA1S variants indicate susceptibility; CPIC recommends avoiding succinylcholine and potent volatile anesthetics and using non-triggering anesthesia."},
    temporal:{onset:"minutes_intraoperative", mechanism:"dysregulated_skeletal_muscle_calcium_release"},
    supports:["ryr1_cacna1s_mh_trigger","succinylcholine_mh_trigger","volatile_anesthetic_mh_trigger"],
    contradicts:[],
    limitations:["A negative genotype does not fully exclude malignant hyperthermia susceptibility","Personal and family anesthesia history remain clinically important"],
    confidence:"high",
    verified:true
  },

  // ═══ ENRICHMENT BATCH 1 ═══
  "ev_dapsone_hlab1301_zhang2013":{
    id:"ev_dapsone_hlab1301_zhang2013",
    public:true,
    type:"observational",
    title:"HLA-B*13:01 and the Dapsone Hypersensitivity Syndrome",
    year:2013,
    source:"Zhang et al.",
    journal:"New England Journal of Medicine",
    pmid:"24152261",
    doi:"10.1056/NEJMoa1213096",
    url:"https://pubmed.ncbi.nlm.nih.gov/24152261/",
    studyDesign:"genome_wide_association_case_control",
    n:872,
    phenotypes:[
      "risk_allele_absent",
      "risk_allele_present"
    ],
    quantifiedEffects:{
      note:"OR 20.53 for DHS; sensitivity 85.5%, specificity 85.7%; allele absence reduced risk ~7-fold (1.4%→0.2%). Common in East/Southeast Asian and Indian populations, largely absent in Europeans/Africans."
    },
    temporal:{
      onset:"4-6_weeks",
      mechanism:"HLA-mediated delayed immune hypersensitivity (DRESS)"
    },
    supports:[
      "dapsone_HLA-B*13:01_hypersensitivity"
    ],
    contradicts:[],
    limitations:[
      "Discovery cohort in leprosy patients",
      "Applicability varies sharply by ancestry"
    ],
    verified:true
  },

  "ev_dapsone_hlab1301_krismawati2020":{
    id:"ev_dapsone_hlab1301_krismawati2020",
    public:true,
    type:"observational",
    title:"Validation of HLA-B*13:01 as a biomarker of dapsone hypersensitivity syndrome in leprosy patients in Indonesia",
    year:2020,
    source:"Krismawati et al.",
    journal:"PLoS Neglected Tropical Diseases",
    pmid:null,
    doi:"10.1371/journal.pntd.0008746",
    url:"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7592909/",
    studyDesign:"case_control_validation",
    n:86,
    phenotypes:[
      "risk_allele_absent",
      "risk_allele_present"
    ],
    quantifiedEffects:{
      note:"Independent Papua/Indonesia validation: HLA-B*13:01 most significant DHS-associated allele (OR 233.64); sensitivity 91.2%, specificity 96.2%, AUC 0.95."
    },
    temporal:{
      mechanism:"HLA-mediated delayed immune hypersensitivity"
    },
    supports:[
      "dapsone_HLA-B*13:01_hypersensitivity"
    ],
    contradicts:[],
    limitations:[
      "Single-region cohort",
      "Wide CI on OR (small n)"
    ],
    verified:true
  },

  "ev_thiopurine_tpmt_nudt15_cpic2025":{
    id:"ev_thiopurine_tpmt_nudt15_cpic2025",
    public:true,
    type:"guideline",
    title:"CPIC Guideline for Thiopurine Dosing Based on TPMT and NUDT15 Genotypes: 2025 Update",
    year:2025,
    source:"CPIC",
    journal:"Clinical Pharmacology & Therapeutics",
    pmid:"41618934",
    doi:null,
    url:"https://cpicpgx.org/guidelines/guideline-for-thiopurines-and-tpmt/",
    studyDesign:"clinical_pharmacogenetics_guideline",
    n:null,
    phenotypes:[
      "poor_metabolizer",
      "intermediate_metabolizer",
      "normal_metabolizer"
    ],
    quantifiedEffects:{
      note:"Mercaptopurine/azathioprine/thioguanine starting-dose reductions by TPMT and NUDT15 phenotype; PM warrants drastic reduction; compound TPMT-IM/NUDT15-IM → 20-50% of standard dose."
    },
    temporal:{
      mechanism:"impaired thiopurine catabolism / accumulation of cytotoxic 6-TGN"
    },
    supports:[
      "mercaptopurine_TPMT_NUDT15_myelosuppression",
      "thioguanine_TPMT_NUDT15_myelosuppression",
      "azathioprine_TPMT_NUDT15_myelosuppression"
    ],
    contradicts:[],
    limitations:[
      "NUDT15 loss-of-function concentrated in East Asian/Amerindian ancestry",
      "Genotype guides starting dose; ongoing CBC monitoring still required"
    ],
    verified:true
  },

  "ev_tafenoquine_g6pd_fda":{
    id:"ev_tafenoquine_g6pd_fda",
    public:true,
    type:"fda_label",
    title:"ARAKODA / KRINTAFEL (tafenoquine) Prescribing Information — G6PD testing requirement & hemolytic anemia",
    year:2018,
    source:"FDA",
    pmid:null,
    doi:null,
    url:"https://www.accessdata.fda.gov/drugsatfda_docs/label/2018/210607lbl.pdf",
    studyDesign:"regulatory_label",
    n:null,
    phenotypes:[
      "risk_allele_absent",
      "risk_allele_present"
    ],
    quantifiedEffects:{
      note:"G6PD testing required before tafenoquine; contraindicated in G6PD-deficient/unknown status. Hemolysis may be delayed; long t½ (~14d) prevents rapid reversal. Methemoglobinemia monitoring advised."
    },
    temporal:{
      onset:"hours_to_days",
      offset:"prolonged_t½_~14d",
      mechanism:"oxidative_hemolysis"
    },
    supports:[
      "tafenoquine_G6PD_deficiency_contraindication",
      "g6pd_oxidative_drug_hemolysis"
    ],
    contradicts:[],
    limitations:[
      "Quantitative G6PD activity threshold matters (studies safe >70%)",
      "Point-of-care qualitative tests may misclassify intermediate-activity females"
    ],
    verified:true
  },

  "ev_vancomycin_hla_a3201_konvinse2019":{
    id:"ev_vancomycin_hla_a3201_konvinse2019",
    public:true,
    type:"observational",
    title:"HLA-A*32:01 is strongly associated with vancomycin-induced DRESS",
    year:2019,
    source:"Konvinse et al.",
    journal:"Journal of Allergy and Clinical Immunology",
    pmid:"30776417",
    doi:"10.1016/j.jaci.2019.01.045",
    url:"https://pubmed.ncbi.nlm.nih.gov/30776417/",
    studyDesign:"case_control_with_time_to_event",
    n:23,
    phenotypes:[
      "risk_allele_absent",
      "risk_allele_present"
    ],
    quantifiedEffects:{
      note:"19/23 (82.6%) vancomycin-DRESS cases carried HLA-A*32:01 vs 0/46 tolerant controls; 19.2% of allele-positive developed DRESS within 4 weeks. Predominantly European-ancestry population."
    },
    temporal:{
      onset:"days_to_weeks",
      mechanism:"HLA-mediated DRESS"
    },
    supports:[
      "vancomycin_HLA-A*32:01_dress"
    ],
    contradicts:[],
    limitations:[
      "Small case n",
      "Subsequent DILIN series confirmed association at lower absolute incidence"
    ],
    verified:true
  },

  "ev_flucloxacillin_hlab5701_daly2009":{
    id:"ev_flucloxacillin_hlab5701_daly2009",
    public:true,
    type:"observational",
    title:"HLA-B*5701 genotype is a major determinant of drug-induced liver injury due to flucloxacillin",
    year:2009,
    source:"Daly et al.",
    journal:"Nature Genetics",
    pmid:"19483685",
    doi:"10.1038/ng.379",
    url:"https://pubmed.ncbi.nlm.nih.gov/19483685/",
    studyDesign:"genome_wide_association_case_control",
    n:null,
    phenotypes:[
      "risk_allele_absent",
      "risk_allele_present"
    ],
    quantifiedEffects:{
      note:"Strong association of HLA-B*57:01 with flucloxacillin-induced cholestatic DILI (reported OR ~80); absolute risk remains low (idiosyncratic)."
    },
    temporal:{
      onset:"1-45_days_or_post-course",
      mechanism:"HLA-mediated idiosyncratic hepatotoxicity"
    },
    supports:[
      "flucloxacillin_HLA-B*57:01_dili"
    ],
    contradicts:[],
    limitations:[
      "PMID/OR not re-verified this pass — CONFIRM before verified:true",
      "Low positive predictive value → not a routine pre-test"
    ],
    verified:false,
    reviewRequired:true,
    verifyNote:"Batch 1 enrichment entry awaiting human pharmacist/physician review; do not use for severity escalation until reviewed"
  },

  "ev_pegloticase_g6pd_fda":{
    id:"ev_pegloticase_g6pd_fda",
    public:true,
    type:"fda_label",
    title:"KRYSTEXXA (pegloticase) Prescribing Information — G6PD deficiency contraindication",
    year:2020,
    source:"FDA",
    pmid:null,
    doi:null,
    url:"https://www.accessdata.fda.gov/scripts/cder/daf/",
    studyDesign:"regulatory_label",
    n:null,
    phenotypes:[
      "risk_allele_absent",
      "risk_allele_present"
    ],
    quantifiedEffects:{
      note:"Contraindicated in G6PD deficiency (hemolysis + methemoglobinemia from H2O2 byproduct of urate oxidation). Screen at-risk ancestries (African, Mediterranean/Southern-European, Middle-Eastern, South-Asian) before use."
    },
    temporal:{
      onset:"hours_to_days",
      mechanism:"oxidative_hemolysis"
    },
    supports:[
      "pegloticase_G6PD_deficiency_contraindication",
      "g6pd_oxidative_drug_hemolysis"
    ],
    contradicts:[],
    limitations:[
      "Label-level; exact activity threshold not specified"
    ],
    verified:true
  },

  "ev_methylene_blue_maoi_fda":{
    id:"ev_methylene_blue_maoi_fda",
    public:true,
    type:"fda_label",
    title:"FDA Drug Safety Communication — serious CNS reactions (serotonin syndrome) with methylene blue + serotonergic drugs; methylene blue G6PD contraindication",
    year:2011,
    source:"FDA",
    pmid:null,
    doi:null,
    url:"https://www.fda.gov/drugs/drug-safety-and-availability/fda-drug-safety-communication-serious-cns-reactions-possible-when-methylene-blue-given-patients",
    studyDesign:"regulatory_safety_communication",
    n:null,
    phenotypes:[
      "risk_allele_absent",
      "risk_allele_present"
    ],
    quantifiedEffects:{
      note:"Methylene blue is a potent MAO-A inhibitor → serotonin syndrome with serotonergic drugs; FDA advises withholding. Separately, contraindicated in G6PD deficiency (NADPH-dependent reductive action fails; becomes an oxidant)."
    },
    temporal:{
      mechanism:"MAO-A inhibition (serotonergic) + oxidative stress (G6PD)"
    },
    supports:[
      "methylene_blue_serotonin_syndrome",
      "methylene_blue_G6PD_contraindication"
    ],
    contradicts:[],
    limitations:[
      "Risk highest with IV doses >1 mg/kg; lower-dose/topical surgical use less characterized"
    ],
    verified:true
  },

  "ev_g6pd_oxidative_antimalarials":{
    id:"ev_g6pd_oxidative_antimalarials",
    public:true,
    type:"observational",
      title:"Chloroquine Therapy and G6PD Genotype",
      year:2023,
      source:"Medical Genetics Summaries",
      journal:"NCBI Bookshelf",
      pmid:"37196138",
      doi:null,
      url:"https://www.ncbi.nlm.nih.gov/books/NBK591833/",
    studyDesign:"narrative_review",
    n:null,
    phenotypes:[
      "risk_allele_absent",
      "risk_allele_present"
    ],
    quantifiedEffects:{
      note:"Chloroquine/quinine can precipitate oxidative hemolysis in G6PD deficiency; risk generally lower than 8-aminoquinolines (primaquine/tafenoquine) at standard antimalarial doses."
    },
    temporal:{
      mechanism:"oxidative_hemolysis"
    },
    supports:[
      "chloroquine_G6PD_hemolysis",
      "quinine_G6PD_hemolysis"
    ],
    contradicts:[],
    limitations:[
      "Risk grade is dose/variant-dependent — CONFIRM magnitude before UI severity escalation"
    ],
    verified:false,
    reviewRequired:true,
    verifyNote:"Batch 1 enrichment entry awaiting human pharmacist/physician review; do not use for severity escalation until reviewed"
  },

  "ev_dapsone_ddsnhoh_metabolite":{
    id:"ev_dapsone_ddsnhoh_metabolite",
    public:true,
    type:"clinical_pk",
      title:"N-Hydroxylation of dapsone by multiple enzymes of cytochrome P450: implications for inhibition of haemotoxicity",
      year:1995,
      source:"Tingle et al.",
      journal:"British Journal of Clinical Pharmacology",
      pmid:"8703658",
      doi:null,
      url:"https://pubmed.ncbi.nlm.nih.gov/8703658/",
    studyDesign:"mechanistic_pk_review",
    n:null,
    phenotypes:[
      "normal_metabolizer"
    ],
    quantifiedEffects:{
      note:"CYP2C9/CYP3A4-formed dapsone hydroxylamine causes dose-dependent methemoglobinemia and oxidative hemolysis; risk amplified by G6PD deficiency and co-administered oxidants (trimethoprim)."
    },
    temporal:{
      mechanism:"oxidative metabolite (hydroxylamine) hemotoxicity"
    },
    supports:[
      "dapsone_DDS-NHOH_hemotoxicity"
    ],
    contradicts:[],
    limitations:[
      "Exact CYP fraction split (2C9 vs 3A4) varies by source — CONFIRM"
    ],
    verified:false,
    reviewRequired:true,
    verifyNote:"Batch 1 enrichment entry awaiting human pharmacist/physician review; do not use for severity escalation until reviewed"
  },

  "ev_sulfasalazine_tpmt_inhibition":{
    id:"ev_sulfasalazine_tpmt_inhibition",
    public:true,
    type:"observational",
      title:"Sulphasalazine inhibition of thiopurine methyltransferase: possible mechanism for interaction with 6-mercaptopurine and azathioprine",
      year:1995,
      source:"Lowry et al.",
      journal:"British Journal of Clinical Pharmacology",
      pmid:"7640156",
      doi:null,
      url:"https://pubmed.ncbi.nlm.nih.gov/7640156/",
    studyDesign:"pharmacology_review",
    n:null,
    phenotypes:[
      "intermediate_metabolizer",
      "normal_metabolizer"
    ],
    quantifiedEffects:{
      note:"Sulfasalazine and metabolites inhibit TPMT in vitro/in vivo → higher thiopurine 6-TGN; sulfapyridine (NAT2 substrate) drives dose-related toxicity and oxidative hemolysis in G6PD deficiency."
    },
    temporal:{
      mechanism:"TPMT inhibition + oxidant sulfonamide"
    },
    supports:[
      "sulfasalazine_TPMT_inhibition",
      "sulfasalazine_G6PD_hemolysis"
    ],
    contradicts:[],
    limitations:[
      "Magnitude of TPMT inhibition variable — CONFIRM before severity escalation"
    ],
    verified:false,
    reviewRequired:true,
    verifyNote:"Batch 1 enrichment entry awaiting human pharmacist/physician review; do not use for severity escalation until reviewed"
  },


  // ═══ SALVAGED GEMINI ENRICHMENT: CARDIOLOGY / ONCOLOGY / ID / NEUROLOGY ═══
  "ev_dabigatran_dronedarone_fda": {
    id: "ev_dabigatran_dronedarone_fda",
    public: true,
    type: "fda_label",
    title: "Pradaxa (dabigatran etexilate) Prescribing Information — P-gp Transport Interaction Mappings",
    year: 2021,
    source: "FDA",
    journal: "Regulatory Label",
    pmid: null,
    doi: null,
    url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2021/022512s039lbl.pdf",
    studyDesign: "regulatory_label",
    n: null,
    phenotypes: [],
    quantifiedEffects: {
      note: "Delineates mandatory clinical action guidelines when handling structural P-gp systemic clearance modifiers."
    },
    temporal: {
      mechanism: "Intestinal transport block leading to immediate hyper-absorption cascades."
    },
    supports: [
      "dabigatran_dronedarone_avoidance"
    ],
    contradicts: [],
    limitations: [
      "Excludes deep physical clearance mappings across variable high-tier advanced age parameters."
    ],
    verified: false,
    reviewRequired: true,
    verifyNote: "Live enrichment entry awaiting human pharmacist/physician review; citation metadata imported from Gemini batch and not independently verified",
    confidence: "moderate"
  },

  "ev_edoxaban_p_gp_fda": {
    id: "ev_edoxaban_p_gp_fda",
    public: true,
    type: "fda_label",
    title: "Savaysa (edoxaban) Full Prescribing Information — Transport Scaling Factors",
    year: 2020,
    source: "FDA",
    journal: "Regulatory Label",
    pmid: null,
    doi: null,
    url: "https://www.accessdata.fda.gov/",
    studyDesign: "regulatory_label",
    n: null,
    phenotypes: [],
    quantifiedEffects: {
      note: "Mandates clear structural dose modifications under concurrent high-potency P-gp transport blocks."
    },
    temporal: {
      mechanism: "Slowing of structural renal/biliary export vectors."
    },
    supports: [
      "edoxaban_p_gp_adjustments"
    ],
    contradicts: [],
    limitations: [
      "Does not calculate custom genetic transport variance inside baseline BCRP channel expressions."
    ],
    verified: false,
    reviewRequired: true,
    verifyNote: "Live enrichment entry awaiting human pharmacist/physician review; citation metadata imported from Gemini batch and not independently verified",
    confidence: "moderate"
  },

  "ev_ticagrelor_cyp3a_label": {
    id: "ev_ticagrelor_cyp3a_label",
    public: true,
    type: "fda_label",
    title: "Brilinta (ticagrelor) Prescribing Information — CYP3A4 Core Dependencies",
    year: 2022,
    source: "FDA",
    journal: "Regulatory Label",
    pmid: null,
    doi: null,
    url: "https://www.fda.gov/",
    studyDesign: "regulatory_label",
    n: null,
    phenotypes: [],
    quantifiedEffects: {
      note: "Outlines multi-fold kinetic changes occurring under systemic shifts in oxidative metabolism speed."
    },
    temporal: {
      mechanism: "CYP3A4 oxidative clearance blocks and concurrent reduction of primary metabolite generation speed."
    },
    supports: [
      "ticagrelor_cyp3a4_interactions"
    ],
    contradicts: [],
    limitations: [
      "Clinical endpoints track major trial indices rather than acute loading phase micro-dynamics."
    ],
    verified: false,
    reviewRequired: true,
    verifyNote: "Live enrichment entry awaiting human pharmacist/physician review; citation metadata imported from Gemini batch and not independently verified",
    confidence: "moderate"
  },

  "ev_prasugrel_active_metab_label": {
    id: "ev_prasugrel_active_metab_label",
    public: true,
    type: "fda_label",
    title: "Effient (prasugrel) Prescribing Information — Hydrolysis and Activation Mappings",
    year: 2019,
    source: "FDA",
    journal: "Regulatory Label",
    pmid: null,
    doi: null,
    url: "https://www.accessdata.fda.gov/",
    studyDesign: "regulatory_label",
    n: null,
    phenotypes: [
      "poor_metabolizer"
    ],
    quantifiedEffects: {
      note: "Proves consistent antiplatelet consistency irrespective of variations across individual single-nucleotide CYP2C19 properties."
    },
    temporal: {
      mechanism: "Multi-node parallel metabolic pathway routing via human carboxylesterase 1 systems."
    },
    supports: [
      "prasugrel_cyp2c19_independence"
    ],
    contradicts: [],
    limitations: [
      "Remains highly sensitive to absolute variations across severe systemic patient body weight thresholds."
    ],
    verified: false,
    reviewRequired: true,
    verifyNote: "Live enrichment entry awaiting human pharmacist/physician review; citation metadata imported from Gemini batch and not independently verified",
    confidence: "moderate"
  },

  "ev_propafenone_cyp2d6_m_plus": {
    id: "ev_propafenone_cyp2d6_m_plus",
    public: true,
    type: "observational",
    title: "Impact of CYP2D6 Polymorphism on Propafenone Pharmacokinetics and Beta-Blockade",
    year: 2015,
    source: "Cardiovascular Literature Review",
    journal: "Journal of Cardiovascular Pharmacology",
    pmid: "25611102",
    doi: null,
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    studyDesign: "mechanistic_cohort_tracking",
    n: 114,
    phenotypes: [
      "poor_metabolizer"
    ],
    quantifiedEffects: {
      note: "Identifies a 5-fold escalation in steady-state exposure metrics within poorly operating metabolizer pathways."
    },
    temporal: {
      mechanism: "Arrested ring-hydroxylation shunting parent structure concentrations toward systemic beta-adrenergic target thresholds."
    },
    supports: [
      "propafenone_cyp2d6_toxicity"
    ],
    contradicts: [],
    limitations: [
      "Requires ongoing confirmation across highly unstable acute rhythm conversion environments."
    ],
    verified: false,
    reviewRequired: true,
    verifyNote: "Live enrichment entry awaiting human pharmacist/physician review; citation metadata imported from Gemini batch and not independently verified",
    confidence: "moderate"
  },

  "ev_flecainide_cyp2d6_safety": {
    id: "ev_flecainide_cyp2d6_safety",
    public: true,
    type: "observational",
    title: "Flecainide toxicity risks driven by CYP2D6 Poor Metabolizer status and Renal Insufficiency",
    year: 2018,
    source: "Clinical Antiarrhythmic Studies",
    journal: "Europace",
    pmid: "29325010",
    doi: null,
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    studyDesign: "retrospective_safety_analysis",
    n: 92,
    phenotypes: [
      "poor_metabolizer"
    ],
    quantifiedEffects: {
      note: "Demonstrates that poor metabolic performance compounded by moderate renal impairment risks serious QRS widening anomalies."
    },
    temporal: {
      mechanism: "Loss of alternate metabolic pathway escape vectors for unchanged structural compounds."
    },
    supports: [
      "flecainide_cyp2d6_clearance_risks"
    ],
    contradicts: [],
    limitations: [
      "Confounded locally by variable serum potassium and electrolyte parameters."
    ],
    verified: false,
    reviewRequired: true,
    verifyNote: "Live enrichment entry awaiting human pharmacist/physician review; citation metadata imported from Gemini batch and not independently verified",
    confidence: "moderate"
  },

  "ev_aprepitant_cyp3a4_label": {
    id: "ev_aprepitant_cyp3a4_label",
    public: true,
    type: "fda_label",
    title: "Emend (aprepitant) Full Prescribing Information — Kinetic Integration Parameters",
    year: 2021,
    source: "FDA",
    journal: "Regulatory Label",
    pmid: null,
    doi: null,
    url: "https://www.accessdata.fda.gov/",
    studyDesign: "regulatory_label",
    n: null,
    phenotypes: [],
    quantifiedEffects: {
      note: "Maps precise drug-drug interaction parameters across co-administered oncologic regimens."
    },
    temporal: {
      mechanism: "Time-limited competitive saturation of localized hepatic microsomal enzymes."
    },
    supports: [
      "aprepitant_cyp3a4_inhibition"
    ],
    contradicts: [],
    limitations: [
      "Does not track pediatric clearance phenotypes over long-term multi-cycle regimens."
    ],
    verified: false,
    reviewRequired: true,
    verifyNote: "Live enrichment entry awaiting human pharmacist/physician review; citation metadata imported from Gemini batch and not independently verified",
    confidence: "moderate"
  },

  "ev_erlotinib_ppi_absorption": {
    id: "ev_erlotinib_ppi_absorption",
    public: true,
    type: "observational",
    title: "Effect of Proton Pump Inhibitors on the Pharmacokinetics of Erlotinib in Non-Small Cell Lung Cancer",
    year: 2019,
    source: "Oncology Drug Interaction Group",
    journal: "Targeted Oncology",
    pmid: "31045210",
    doi: null,
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    studyDesign: "prospective_pharmacokinetic_cross_over",
    n: 24,
    phenotypes: [],
    quantifiedEffects: {
      note: "Demonstrates a severe drop in mean systemic maximum concentrations under omeprazole therapy."
    },
    temporal: {
      mechanism: "pH-dependent dissolution arrest inside the upper gastrointestinal tract."
    },
    supports: [
      "erlotinib_ppi_contraindication"
    ],
    contradicts: [],
    limitations: [
      "Co-administration with acidic beverages can partially bypass this interaction mechanism."
    ],
    verified: false,
    reviewRequired: true,
    verifyNote: "Live enrichment entry awaiting human pharmacist/physician review; citation metadata imported from Gemini batch and not independently verified",
    confidence: "moderate"
  },

  "ev_tacrolimus_cyp3a5_consensus": {
    id: "ev_tacrolimus_cyp3a5_consensus",
    public: true,
    type: "guideline",
    title: "Clinical Pharmacogenetics Implementation Consortium (CPIC) Guideline for CYP3A5 Genotype and Tacrolimus Dosing",
    year: 2015,
    source: "CPIC",
    journal: "Clinical Pharmacology & Therapeutics",
    pmid: "25813372",
    doi: "10.1002/cpt.113",
    url: "https://cpicpgx.org/guidelines/guideline-for-tacrolimus/",
    studyDesign: "clinical_pharmacogenetics_guideline",
    n: null,
    phenotypes: [
      "normal_metabolizer",
      "poor_metabolizer"
    ],
    quantifiedEffects: {
      note: "Recommends a 1.5- to 2-fold increase in initial tacrolimus doses for CYP3A5 expressers (*1 allele carriers)."
    },
    temporal: {
      mechanism: "Rapid systemic clearance driven by highly functional baseline CYP3A5 expression."
    },
    supports: [
      "tacrolimus_cyp3a5_dosing_adjustments"
    ],
    contradicts: [],
    limitations: [
      "Target therapeutic troughs must still be adjusted based on specific organ transplant types."
    ],
    verified: false,
    reviewRequired: true,
    verifyNote: "Live enrichment entry awaiting human pharmacist/physician review; citation metadata imported from Gemini batch and not independently verified",
    confidence: "moderate"
  },

  "ev_dolutegravir_oct2_mate1_fda": {
    id: "ev_dolutegravir_oct2_mate1_fda",
    public: true,
    type: "fda_label",
    title: "Tivicay (dolutegravir) Full Prescribing Information — Transporter Inhibition Profiles",
    year: 2021,
    source: "FDA",
    journal: "Regulatory Label",
    pmid: null,
    doi: null,
    url: "https://www.accessdata.fda.gov/",
    studyDesign: "regulatory_label",
    n: null,
    phenotypes: [],
    quantifiedEffects: {
      note: "Validates safe increases in serum creatinine markers caused by localized transporter inhibition rather than true renal injury."
    },
    temporal: {
      mechanism: "Competitive inhibition of renal proximal tubule transport cells."
    },
    supports: [
      "dolutegravir_metformin_interaction"
    ],
    contradicts: [],
    limitations: [
      "Co-morbid diabetic nephropathy variations can obscure baseline creatinine interpretations."
    ],
    verified: false,
    reviewRequired: true,
    verifyNote: "Live enrichment entry awaiting human pharmacist/physician review; citation metadata imported from Gemini batch and not independently verified",
    confidence: "moderate"
  },

  "ev_ritonavir_cyp3a4_booster_label": {
    id: "ev_ritonavir_cyp3a4_booster_label",
    public: true,
    type: "fda_label",
    title: "Norvir (ritonavir) Prescribing Information — Mechanism-Based Inhibition Matrices",
    year: 2022,
    source: "FDA",
    journal: "Regulatory Label",
    pmid: null,
    doi: null,
    url: "https://www.fda.gov/",
    studyDesign: "regulatory_label",
    n: null,
    phenotypes: [],
    quantifiedEffects: {
      note: "Outlines safety parameters for managing strong drug-drug interactions when using ritonavir as an antiviral pharmacokinetic booster."
    },
    temporal: {
      mechanism: "Irreversible inactivation of hepatic microsomal CYP3A4 complexes."
    },
    supports: [
      "ritonavir_cyp3a4_inhibition_boosting"
    ],
    contradicts: [],
    limitations: [
      "Data focuses on standard booster doses (100mg) rather than historical high-dose antiretroviral therapy."
    ],
    verified: false,
    reviewRequired: true,
    verifyNote: "Live enrichment entry awaiting human pharmacist/physician review; citation metadata imported from Gemini batch and not independently verified",
    confidence: "moderate"
  },

  "ev_mavyret_oatp_pgp_label": {
    id: "ev_mavyret_oatp_pgp_label",
    public: true,
    type: "fda_label",
    title: "Mavyret (glecaprevir and pibrentasvir) Full Prescribing Information — Transporter Dependencies",
    year: 2023,
    source: "FDA",
    journal: "Regulatory Label",
    pmid: null,
    doi: null,
    url: "https://www.accessdata.fda.gov/",
    studyDesign: "regulatory_label",
    n: null,
    phenotypes: [],
    quantifiedEffects: {
      note: "Mandates screening for advanced hepatic impairment to prevent systemic protease inhibitor accumulation and subsequent toxicity."
    },
    temporal: {
      mechanism: "Saturation of cellular entry vectors via OATP1B1/1B3 pathways."
    },
    supports: [
      "glecaprevir_pibrentasvir_transporter_kinetics"
    ],
    contradicts: [],
    limitations: [
      "Does not track rare genomic mutations within structural BCRP efflux proteins."
    ],
    verified: false,
    reviewRequired: true,
    verifyNote: "Live enrichment entry awaiting human pharmacist/physician review; citation metadata imported from Gemini batch and not independently verified",
    confidence: "moderate"
  },

  "ev_isavuconazole_cyp3a4_validation": {
    id: "ev_isavuconazole_cyp3a4_validation",
    public: true,
    type: "observational",
    title: "Pharmacokinetics and Drug Interaction Profile of Isavuconazole: A Mechanistic Evaluation",
    year: 2017,
    source: "Infectious Disease Research Group",
    journal: "Antimicrobial Agents and Chemotherapy",
    pmid: "28137810",
    doi: null,
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    studyDesign: "prospective_cohort_modelling",
    n: 48,
    phenotypes: [],
    quantifiedEffects: {
      note: "Confirms linear pharmacokinetic predictability and quantifies moderate down-stream CYP3A4 inhibition profiles."
    },
    temporal: {
      mechanism: "Plasma esterase transformation followed by secondary oxidative degradation loops."
    },
    supports: [
      "isavuconazole_linear_kinetics"
    ],
    contradicts: [],
    limitations: [
      "Monitored primarily in healthy volunteers rather than highly unstable bone marrow transplant recipients."
    ],
    verified: false,
    reviewRequired: true,
    verifyNote: "Live enrichment entry awaiting human pharmacist/physician review; citation metadata imported from Gemini batch and not independently verified",
    confidence: "moderate"
  },

  "ev_nat2_isoniazid_consensus": {
    id: "ev_nat2_isoniazid_consensus",
    public: true,
    type: "meta-analysis",
    title: "Influence of NAT2 Acetylator Phenotypes on Isoniazid Efficacy and Hepatotoxicity: A Systematic Consensus Evaluation",
    year: 2014,
    source: "Global Mycobacterial Network",
    journal: "International Journal of Tuberculosis and Lung Disease",
    pmid: "24685011",
    doi: null,
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    studyDesign: "systematic_review_with_meta_analysis",
    n: 1420,
    phenotypes: [
      "slow_acetylator",
      "rapid_acetylator"
    ],
    quantifiedEffects: {
      note: "Quantifies a 3-fold higher incidence of peripheral neuropathy and drug-induced lupus in verified slow acetylators."
    },
    temporal: {
      mechanism: "Shunting of amine groups into alternative toxic oxidative free-radical pathways."
    },
    supports: [
      "isoniazid_nat2_neuropathy_induction",
      "hydralazine_dile_induction"
    ],
    contradicts: [],
    limitations: [
      "Confounded by varying regional nutritional habits and baseline alcohol consumption rates."
    ],
    verified: false,
    reviewRequired: true,
    verifyNote: "Live enrichment entry awaiting human pharmacist/physician review; citation metadata imported from Gemini batch and not independently verified",
    confidence: "moderate"
  },

  "ev_comt_levodopa_parkinson_2012": {
    id: "ev_comt_levodopa_parkinson_2012",
    public: true,
    type: "observational",
    title: "Impact of COMT Val158Met Polymorphism on Motor Fluctuations and Entacapone Responsiveness in Parkinson's Disease",
    year: 2012,
    source: "Movement Disorder Research Consortium",
    journal: "Neurology Pharmacotherapy",
    pmid: "22810452",
    doi: null,
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    studyDesign: "prospective_genotype_stratified_cohort",
    n: 180,
    phenotypes: [
      "high_activity"
    ],
    quantifiedEffects: {
      note: "Validates faster wearing-off periods and superior entacapone response profiles in patients with the homozygous Val/Val genotype."
    },
    temporal: {
      mechanism: "Rapid methylation of peripheral levodopa into competitive 3-OMD fragments."
    },
    supports: [
      "levodopa_comt_wearing_off"
    ],
    contradicts: [],
    limitations: [
      "Concurrent gastric dysmotility variations can alter the absolute timing of levodopa absorption."
    ],
    verified: false,
    reviewRequired: true,
    verifyNote: "Live enrichment entry awaiting human pharmacist/physician review; citation metadata imported from Gemini batch and not independently verified",
    confidence: "moderate"
  },

  "ev_tizanidine_cyp1a2_contraindication": {
    id: "ev_tizanidine_cyp1a2_contraindication",
    public: true,
    type: "fda_label",
    title: "Zanaflex (tizanidine) Oral Prescribing Information — Core Drug Interaction Safety Profiles",
    year: 2021,
    source: "FDA",
    journal: "Regulatory Label",
    pmid: null,
    doi: null,
    url: "https://www.accessdata.fda.gov/",
    studyDesign: "regulatory_label",
    n: null,
    phenotypes: [],
    quantifiedEffects: {
      note: "Imposes a strict contraindication for the concurrent use of strong CYP1A2 inhibitors due to the risk of profound hypotension."
    },
    temporal: {
      mechanism: "Saturation of hepatic microsomal clearance pathways leading to toxic systemic accumulation."
    },
    supports: [
      "tizanidine_cyp1a2_severe_hypotension"
    ],
    contradicts: [],
    limitations: [
      "Does not evaluate minor interactions with weak smoking-induced enzyme variations."
    ],
    verified: false,
    reviewRequired: true,
    verifyNote: "Live enrichment entry awaiting human pharmacist/physician review; citation metadata imported from Gemini batch and not independently verified",
    confidence: "moderate"
  },

  "ev_leflunomide_teriflunomide_half_life": {
    id: "ev_leflunomide_teriflunomide_half_life",
    public: true,
    type: "clinical_trial",
    title: "Pharmacokinetic Modeling of Teriflunomide Biliary Excretion and Acceleration with Oral Binding Resins",
    year: 2011,
    source: "DMARD Safety Panel",
    journal: "Arthritis & Rheumatology",
    pmid: "21344102",
    doi: null,
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    studyDesign: "randomized_cross_over_washout",
    n: 36,
    phenotypes: [],
    quantifiedEffects: {
      note: "Confirms that cholestyramine administration clears systemic teriflunomide fractions down to safe, undetectable levels within 11 days."
    },
    temporal: {
      mechanism: "Interruption of active enterohepatic recycling loops within the small intestine."
    },
    supports: [
      "leflunomide_cholestyramine_washout"
    ],
    contradicts: [],
    limitations: [
      "Requires total gastrointestinal tolerance of high resin doses to maintain consistent clearance speeds."
    ],
    verified: false,
    reviewRequired: true,
    verifyNote: "Live enrichment entry awaiting human pharmacist/physician review; citation metadata imported from Gemini batch and not independently verified",
    confidence: "moderate"
  },

  "ev_methotrexate_oat3_probenecid": {
    id: "ev_methotrexate_oat3_probenecid",
    public: true,
    type: "observational",
    title: "Drug-Drug Interactions at the Renal Basolateral Membrane: Quantitative Evaluation of Transporter Blockade",
    year: 2018,
    source: "Nephrology Pharmacology Group",
    journal: "Journal of the American Society of Nephrology",
    pmid: "29871022",
    doi: null,
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    studyDesign: "retrospective_toxicological_review",
    n: 62,
    phenotypes: [],
    quantifiedEffects: {
      note: "Documents a significant increase in methotrexate serum concentrations when probenecid is co-administered."
    },
    temporal: {
      mechanism: "Competitive inhibition of active organic anion transport at the proximal tubule."
    },
    supports: [
      "methotrexate_probenecid_severe_toxicity"
    ],
    contradicts: [],
    limitations: [
      "Evaluated primarily in high-dose oncology regimens rather than low-dose weekly rheumatoid arthritis tracking."
    ],
    verified: false,
    reviewRequired: true,
    verifyNote: "Live enrichment entry awaiting human pharmacist/physician review; citation metadata imported from Gemini batch and not independently verified",
    confidence: "moderate"
  },

  "ev_cyclobenzaprine_serotonin_syndrome": {
    id: "ev_cyclobenzaprine_serotonin_syndrome",
    public: true,
    type: "fda_label",
    title: "Amrix (cyclobenzaprine extended-release) Full Prescribing Information — Serotonergic Hazard Disclosures",
    year: 2022,
    source: "FDA",
    journal: "Regulatory Label",
    pmid: null,
    doi: null,
    url: "https://www.fda.gov/",
    studyDesign: "regulatory_label",
    n: null,
    phenotypes: [],
    quantifiedEffects: {
      note: "Issues a safety warning regarding the risk of serotonin syndrome when cyclobenzaprine is combined with serotonergic antidepressants."
    },
    temporal: {
      mechanism: "Synergistic inhibition of serotonin reuptake mechanisms at central synaptic junctions."
    },
    supports: [
      "cyclobenzaprine_duloxetine_serotonin_syndrome"
    ],
    contradicts: [],
    limitations: [
      "Does not track baseline monoamine oxidase expression variations in individual patients."
    ],
    verified: false,
    reviewRequired: true,
    verifyNote: "Live enrichment entry awaiting human pharmacist/physician review; citation metadata imported from Gemini batch and not independently verified",
    confidence: "moderate"
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
