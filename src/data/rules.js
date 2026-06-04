// MedCheck — Clinical rule configuration
// Centralized numeric rule tables used by engines and renderers.

// Structural/mechanistic reliability, independent of study evidence.
// Evidence-tier weighting is handled separately by computeEdgeConfidence().
var EDGE_TYPE_BASE_WEIGHT = {};
EDGE_TYPE_BASE_WEIGHT[EDGE_TYPE.SUBSTRATE_OF]   = 0.92;
EDGE_TYPE_BASE_WEIGHT[EDGE_TYPE.INHIBITS]       = 0.85;
EDGE_TYPE_BASE_WEIGHT[EDGE_TYPE.INDUCES]        = 0.75;
EDGE_TYPE_BASE_WEIGHT[EDGE_TYPE.METABOLIZED_TO] = 0.88;
EDGE_TYPE_BASE_WEIGHT[EDGE_TYPE.ACTIVATES]      = 0.80;
EDGE_TYPE_BASE_WEIGHT[EDGE_TYPE.BLOCKS]         = 0.80;
EDGE_TYPE_BASE_WEIGHT[EDGE_TYPE.PRODUCES]       = 0.68;
EDGE_TYPE_BASE_WEIGHT[EDGE_TYPE.TRANSPORTED_BY] = 0.80;
EDGE_TYPE_BASE_WEIGHT[EDGE_TYPE.COMPETES_WITH]  = 0.65;
EDGE_TYPE_BASE_WEIGHT[EDGE_TYPE.SUPPRESSES]     = 0.75;
EDGE_TYPE_BASE_WEIGHT[EDGE_TYPE.ACCUMULATES_IN] = 0.70;

// Clinical urgency multiplier per phenotype node ID.
const PHENOTYPE_SEVERITY_WEIGHT = {
  'serotonin-syndrome-risk':     1.6,
  'qt-prolongation-risk':        1.5,
  'respiratory-depression-risk': 1.5,
  'seizure-risk':                1.4,
  'hepatotoxicity-risk':         1.3,
  'bleeding-risk':               1.3,
  'anticholinergic-syndrome':    1.2,
  'hypotension-risk':            1.1,
  'cns-depression-risk':         1.1,
  'cyp2d6_burden_phenotype':     1.0,
  'cyp3a4_induction_phenotype':  1.0,
  'sedation-phenotype':          1.0,
  'analgesia_phenotype':         0.85,
};

// Standard dosing intervals in hours for repeated-dose PK display.
const PK_DOSE_INTERVALS = {
  paroxetine:20,  fluoxetine:24,  sertraline:24, citalopram:24, escitalopram:24,
  venlafaxine:12, duloxetine:24,  mirtazapine:24,
  warfarin:24,    clopidogrel:24, codeine:6,     simvastatin:24, atorvastatin:24,
  digoxin:24,     amiodarone:24,  methadone:8,   rifampin:24, omeprazole:24,
  tamoxifen:24,   metoprolol:12,
  // Antiarrhythmics
  flecainide:12,  propafenone:8,  mexiletine:8,   procainamide:6, disopyramide:6, dronedarone:12,
  // ADHD / alpha-2
  methylphenidate:4, guanfacine:24, clonidine_adhd:12,
  // MAOIs
  phenelzine:12,  tranylcypromine:12, selegiline:24,
  // Typical APs
  thioridazine:12, chlorpromazine:8, perphenazine:12, fluphenazine:12,
  // Anti-infective
  linezolid:12,   cobicistat:24,  atazanavir:24,  sofosbuvir:24,
  // Oncology
  cyclophosphamide:24, palbociclib:24, erlotinib:24, gefitinib:24, everolimus:24,
};

// Phenotype burden panel labels and thresholds.
const PHENOTYPE_RISK_RULES = {
  serotonin:      { name:"Serotonin Load", thresholds:[2,4], unit:"agents" },
  qtc:            { name:"QTc Risk",       thresholds:[2,5], unit:"pts" },
  anticholinergic:{ name:"Anticholinergic",thresholds:[2,4], unit:"ACB pts" },
  sedation:       { name:"Sedation Load",  thresholds:[2,4], unit:"pts" },
  fall_risk:      { name:"Fall Risk",      thresholds:[3,6], unit:"pts" },
};

const PHENOTYPE_NARRATIVE_THRESHOLDS = {
  serotonin: 2,
  qtc: 4,
  sedation: 4,
};

// Source products whose clinically relevant persistence belongs to a named
// active constituent actor rather than the product label itself.
const WASHOUT_SOURCE_ALIASES = {
  'grapefruit-juice': ['bergamottin'],
};

const HIGH_IMPACT_METABOLITE_RELATIONS = [
  { parent:"Codeine", metaboliteId:"morphine", requiredEvidenceRefs:["ev_codeine_cyp2d6_cpic"] },
  { parent:"Tramadol", metaboliteId:"o-desmethyltramadol", requiredEvidenceRefs:["ev_cyp2d6_codeine_genotype"] },
  { parent:"Clopidogrel", metaboliteId:"active-thiol-clopidogrel", requiredEvidenceRefs:["ev_clopidogrel_cyp2c19_cpic"] },
  { parent:"Tamoxifen", metaboliteId:"endoxifen", requiredEvidenceRefs:["ev_tamoxifen_cyp2d6_cpic"] },
  { parent:"Bupropion", metaboliteId:"hydroxybupropion", requiredEvidenceRefs:["ev_bupropion_cyp2d6_fda"] },
  { parent:"Fluoxetine", metaboliteId:"norfluoxetine", requiredEvidenceRefs:["ev_fluoxetine_cyp2d6_fda"] },
  { parent:"Potatoes (Solanine/Solanidine)", metaboliteId:"solanidine", requiredEvidenceRefs:["ev_solanidine_cyp2d6_hellden2024"] },
  { parent:"DXM (Dextromethorphan)", metaboliteId:"dextrorphan-dxo", requiredEvidenceRefs:["ev_dxm_dextrorphan_cyp2d6"] },
  { parent:"Atomoxetine", metaboliteId:"4-hydroxyatomoxetine", requiredEvidenceRefs:["ev_atomoxetine_cyp2d6_cpic"] },
  { parent:"Metoprolol", metaboliteId:"alpha-hydroxymetoprolol", requiredEvidenceRefs:["ev_metoprolol_cyp2d6_cpic"] },
  { parent:"Nebivolol", metaboliteId:"4-hydroxy-nebivolol", requiredEvidenceRefs:["ev_nebivolol_cyp2d6_label"] },
  { parent:"Clobazam", metaboliteId:"n-desmethylclobazam-norclobazam", requiredEvidenceRefs:["ev_clobazam_cyp2c19_fda_onfi"] },
  { parent:"Losartan", metaboliteId:"exp-3174-e-3174", requiredEvidenceRefs:["ev_losartan_cyp2c9_sica2002"] },
  { parent:"Azathioprine", metaboliteId:"6-thioguanine-nucleotides-6-tgn", requiredEvidenceRefs:["ev_azathioprine_tpmt_cpic2019"] },
  { parent:"Omeprazole", metaboliteId:"5-hydroxyomeprazole", requiredEvidenceRefs:["ev_omeprazole_cyp2c19_lima2021"] },
  { parent:"Voriconazole", metaboliteId:"voriconazole-n-oxide", requiredEvidenceRefs:["ev_voriconazole_cyp2c19_hyland2008"] },
  { parent:"Efavirenz", metaboliteId:"8-hydroxyefavirenz", requiredEvidenceRefs:["ev_efavirenz_cyp2b6_desta2019"] },
  { parent:"Fluorouracil", metaboliteId:"dihydrofluorouracil-dhfu", requiredEvidenceRefs:["ev_fluorouracil_dpyd_amstutz2018"] },
  { parent:"Capecitabine", metaboliteId:"5-fluorouracil", requiredEvidenceRefs:["ev_fluorouracil_dpyd_amstutz2018"] },
  { parent:"Irinotecan", metaboliteId:"sn-38-7-ethyl-10-hydroxycamptothecin", requiredEvidenceRefs:["ev_irinotecan_ugt1a1_ramsey2014"] },
  { parent:"Leflunomide", metaboliteId:"teriflunomide-a77-1726", requiredEvidenceRefs:["ev_leflunomide_teriflunomide_half_life"] },
  { parent:"Mycophenolate", metaboliteId:"mycophenolic-acid-mpa", requiredEvidenceRefs:["ev_mycophenolate_enterohepatic_label"] },
  { parent:"Allopurinol", metaboliteId:"oxypurinol-alloxanthine", requiredEvidenceRefs:["ev_allopurinol_oxypurinol_label"] },
  { parent:"Primidone", metaboliteId:"phenobarbital", requiredEvidenceRefs:["ev_primidone_metabolites_label"] },
  { parent:"Acetaminophen", metaboliteId:"napqi", requiredEvidenceRefs:["ev_apap_alcohol_riordan2002"] },
  { parent:"Dapsone", metaboliteId:"dapsone-hydroxylamine-dds-nhoh", requiredEvidenceRefs:["ev_dapsone_ddsnhoh_metabolite"] },
  { parent:"Lisdexamfetamine", metaboliteId:"d-amphetamine-dextroamphetamine", requiredEvidenceRefs:["ev_lisdexamfetamine_rbc_activation"] },
  { parent:"Amphetamine", metaboliteId:"4-hydroxyamphetamine", requiredEvidenceRefs:["ev_amphetamine_cyp2d6_fda"] },
  { parent:"Methamphetamine", metaboliteId:"amphetamine", requiredEvidenceRefs:["ev_mdma_meth_cyp2d6_review"] },
  { parent:"Methamphetamine", metaboliteId:"4-hydroxymethamphetamine", requiredEvidenceRefs:["ev_mdma_meth_cyp2d6_review"] },
  { parent:"MDMA (Ecstasy)", metaboliteId:"hhma-3-4-dihydroxymethamphetamine", requiredEvidenceRefs:["ev_mdma_meth_cyp2d6_review"] },
  { parent:"Citalopram", metaboliteId:"didesmethylcitalopram-ddcit", requiredEvidenceRefs:["ev_citalopram_cyp2d6_oestad2003"] },
  { parent:"Escitalopram", metaboliteId:"s-didesmethylcitalopram-s-ddcit", requiredEvidenceRefs:["ev_citalopram_cyp2d6_oestad2003"] },
];

// Metabolite-specific genotype effects override parent-drug generic CYP effects.
// These prevent false simplifications such as "parent via CYP2D6 = 1.8x" when
// the clinically relevant signal is the metabolite concentration or active form.
const GENOTYPE_METABOLITE_EFFECTS = [
  {
    parent:"Potatoes (Solanine/Solanidine)",
    metaboliteId:"solanidine",
    metaboliteName:"Solanidine",
    enzyme:"CYP2D6",
    note:"Diet-derived biomarker: solanidine concentration rises sharply when CYP2D6 activity is absent. This is exposure/phenotyping context, not a dietary toxicity threshold.",
    evidenceRefs:["ev_solanidine_cyp2d6_hellden2024"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { fold:18.9, direction:"increase", label:"+1887% plasma solanidine vs NM" },
      [GENOTYPE_PHENOTYPE.IM]: { fold:1.74, direction:"increase", label:"+74% plasma solanidine vs NM" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
      [GENOTYPE_PHENOTYPE.UM]: { fold:0.65, direction:"decrease", label:"-35% plasma solanidine vs NM" },
    }
  },
  {
    parent:"Bupropion",
    metaboliteId:"hydroxybupropion",
    metaboliteName:"Hydroxybupropion",
    enzyme:"CYP2D6",
    note:"Hydroxybupropion is the main CYP2D6-inhibiting actor. CYP2D6 PM status has been associated with higher hydroxybupropion level/dose ratios, so DDIs should be traced through the metabolite rather than parent bupropion alone.",
    evidenceRefs:["ev_bupropion_cyp2d6_hesse1996","ev_bupropion_cyp2d6_fda"],
    inhibitionDirection:"increase",
    inhibitionLabel:"CYP2D6 inhibition/phenoconversion context: higher level/dose ratio reported; fold not calibrated",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { direction:"increase", label:"higher level/dose ratio reported" },
      [GENOTYPE_PHENOTYPE.IM]: { direction:"uncertain", label:"possible intermediate shift; not fold-calibrated" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Fluoxetine",
    metaboliteId:"norfluoxetine",
    metaboliteName:"Norfluoxetine",
    enzyme:"CYP2D6",
    note:"Norfluoxetine is active and has a long half-life. CYP2D6 PM status raises parent fluoxetine exposure while lowering norfluoxetine formation, so parent and metabolite context should be read together.",
    evidenceRefs:["ev_fluoxetine_cyp2d6_fda","ev_fluoxetine_cyp2d6_sunkara2010"],
    inhibitionDirection:"decrease",
    inhibitionLabel:"CYP2D6 inhibition/phenoconversion context: norfluoxetine formation may fall while parent fluoxetine rises",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { fold:0.5, direction:"decrease", label:"~50% lower norfluoxetine AUC; parent fluoxetine higher" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Tamoxifen",
    metaboliteId:"endoxifen",
    metaboliteName:"Endoxifen",
    enzyme:"CYP2D6",
    note:"Endoxifen is the key active tamoxifen metabolite. Reduced CYP2D6 function lowers endoxifen formation; clinical outcome interpretation remains debated and contradictory evidence is retained.",
    evidenceRefs:["ev_tamoxifen_cyp2d6_cpic","ev_tamoxifen_endoxifen_borges2006","ev_tamoxifen_cyp2d6_controversy"],
    inhibitionDirection:"decrease",
    inhibitionLabel:"CYP2D6 inhibition/phenoconversion context: lower endoxifen formation expected",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { fold:0.27, direction:"decrease", label:"~73-75% lower endoxifen vs EM/NM" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Clopidogrel",
    metaboliteId:"active-thiol-clopidogrel",
    metaboliteName:"Active thiol metabolite",
    enzyme:"CYP2C19",
    note:"Clopidogrel is a prodrug. CYP2C19 loss-of-function sharply lowers active thiol metabolite exposure and platelet inhibition; the strongest evidence applies to ACS/PCI settings.",
    evidenceRefs:["ev_clopidogrel_cyp2c19_cpic","ev_clopidogrel_active_thiol_kim2014","ev_clopidogrel_cyp2c19_mega2009"],
    inhibitionDirection:"decrease",
    inhibitionLabel:"CYP2C19 inhibition/phenoconversion context: lower active thiol formation expected",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { fold:0.35, direction:"decrease", label:"active thiol AUC ~0.34-0.37x of EM" },
      [GENOTYPE_PHENOTYPE.IM]: { direction:"decrease", label:"reduced active metabolite; CPIC recommends avoiding in ACS/PCI" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
      [GENOTYPE_PHENOTYPE.UM]: { direction:"increase", label:"modestly higher active metabolite/platelet inhibition; no CPIC dose change" },
    }
  },
  {
    parent:"Codeine",
    metaboliteId:"morphine",
    metaboliteName:"Morphine",
    enzyme:"CYP2D6",
    note:"Codeine depends on CYP2D6 activation to morphine for analgesia. PM status can mean analgesic failure; UM status can increase morphine exposure and opioid toxicity risk.",
    evidenceRefs:["ev_opioid_cyp2d6_cpic_2020","ev_codeine_cyp2d6_cpic","ev_codeine_ultrarapid_deaths"],
    inhibitionDirection:"decrease",
    inhibitionLabel:"CYP2D6 inhibition/phenoconversion context: lower morphine formation expected",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { direction:"decrease", label:"near-zero morphine formation; analgesia failure risk" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
      [GENOTYPE_PHENOTYPE.UM]: { fold:1.45, direction:"increase", label:"~45% higher median morphine AUC vs NM" },
    }
  },
  {
    parent:"Tramadol",
    metaboliteId:"o-desmethyltramadol",
    metaboliteName:"O-desmethyltramadol (M1)",
    enzyme:"CYP2D6",
    note:"O-desmethyltramadol (M1) is the opioid-active metabolite. CYP2D6 PM status reduces M1 formation while parent tramadol serotonergic/noradrenergic effects remain.",
    evidenceRefs:["ev_opioid_cyp2d6_cpic_2020","ev_cyp2d6_codeine_genotype"],
    inhibitionDirection:"decrease",
    inhibitionLabel:"CYP2D6 inhibition/phenoconversion context: lower M1 formation expected",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { direction:"decrease", label:"M1 formation substantially reduced; analgesia failure risk" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
      [GENOTYPE_PHENOTYPE.UM]: { direction:"increase", label:"higher M1 formation; opioid toxicity risk" },
    }
  },
  {
    parent:"DXM (Dextromethorphan)",
    metaboliteId:"dextrorphan-dxo",
    metaboliteName:"Dextrorphan",
    enzyme:"CYP2D6",
    note:"CYP2D6 normally converts dextromethorphan to dextrorphan. PM status shifts exposure toward parent DXM, so metabolite and parent effects diverge.",
    evidenceRefs:["ev_dxm_dextrorphan_cyp2d6"],
    inhibitionDirection:"decrease",
    inhibitionLabel:"CYP2D6 inhibition/phenoconversion context: lower dextrorphan formation; parent DXM predominates",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { direction:"decrease", label:"dextrorphan formation reduced; parent DXM predominates" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Atomoxetine",
    metaboliteId:"4-hydroxyatomoxetine",
    metaboliteName:"4-Hydroxyatomoxetine",
    enzyme:"CYP2D6",
    note:"4-Hydroxyatomoxetine is equipotent to parent at NET. CYP2D6 PM reduces 4-OH formation while parent atomoxetine accumulates substantially; active moiety is maintained at lower doses.",
    evidenceRefs:["ev_atomoxetine_cyp2d6_cpic"],
    inhibitionDirection:"decrease",
    inhibitionLabel:"CYP2D6 inhibition/phenoconversion: 4-OH formation reduced; parent accumulates",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"4-OH formation reduced; parent atomoxetine accumulates about 10x (see parent row/CLINICAL_FOLD); CPIC recommends lower starting dose" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"decrease", label:"4-OH moderately reduced; parent exposure higher than NM" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"increase", label:"faster 4-OH formation; parent exposure lower; monitor response" },
    }
  },
  {
    parent:"Metoprolol",
    metaboliteId:"alpha-hydroxymetoprolol",
    metaboliteName:"alpha-Hydroxymetoprolol",
    enzyme:"CYP2D6",
    note:"alpha-Hydroxymetoprolol is a weak metabolite. CYP2D6 PM reduces formation; the clinical signal is parent metoprolol accumulation, which remains on the parent row.",
    evidenceRefs:["ev_metoprolol_cyp2d6_cpic"],
    inhibitionDirection:"decrease",
    inhibitionLabel:"CYP2D6 inhibition/phenoconversion: alpha-OH formation reduced; parent metoprolol accumulates",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"alpha-OH formation reduced; parent metoprolol accumulates about 4.9x (see parent row/CLINICAL_FOLD)" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"decrease", label:"alpha-OH moderately reduced; parent metoprolol higher than NM" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"increase", label:"faster alpha-OH formation; parent exposure lower" },
    }
  },
  {
    parent:"Nebivolol",
    metaboliteId:"4-hydroxy-nebivolol",
    metaboliteName:"4-Hydroxy-nebivolol",
    enzyme:"CYP2D6",
    note:"4-Hydroxy-nebivolol is active, but CYP2D6 PM reduces formation while parent nebivolol accumulates markedly. The parent exposure fold remains on the parent row.",
    evidenceRefs:["ev_nebivolol_cyp2d6_label"],
    inhibitionDirection:"decrease",
    inhibitionLabel:"CYP2D6 inhibition/phenoconversion: 4-OH formation reduced; parent nebivolol accumulates",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"4-OH formation reduced; parent nebivolol accumulates about 15x (see parent row/CLINICAL_FOLD)" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"decrease", label:"4-OH moderately reduced; parent nebivolol higher than NM" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Clobazam",
    metaboliteId:"n-desmethylclobazam-norclobazam",
    metaboliteName:"Norclobazam (N-Desmethylclobazam)",
    enzyme:"CYP2C19",
    note:"Norclobazam is active and cleared by CYP2C19. CYP2C19 PM impairs norclobazam clearance, producing metabolite accumulation; this fold belongs on the metabolite row.",
    evidenceRefs:["ev_clobazam_cyp2c19_fda_onfi"],
    inhibitionDirection:"increase",
    inhibitionLabel:"CYP2C19 inhibition/phenoconversion: norclobazam clearance impaired -> accumulation",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { fold:5.0, direction:"increase", label:"norclobazam AUC about 5x higher; FDA: reduce clobazam to 50% of standard dose" },
      [GENOTYPE_PHENOTYPE.IM]: { fold:2.5, direction:"increase", label:"intermediate norclobazam elevation; monitor sedation" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
      [GENOTYPE_PHENOTYPE.UM]: { fold:0.5, direction:"decrease", label:"faster norclobazam clearance; monitor seizure control" },
    }
  },
  {
    parent:"Losartan",
    metaboliteId:"exp-3174-e-3174",
    metaboliteName:"EXP3174",
    enzyme:"CYP2C9",
    note:"Losartan requires CYP2C9-mediated bioactivation to EXP3174, a much more potent AT1 antagonist. CYP2C9 PM reduces EXP3174 exposure despite higher parent losartan exposure.",
    evidenceRefs:["ev_losartan_cyp2c9_sica2002"],
    inhibitionDirection:"decrease",
    inhibitionLabel:"CYP2C9 inhibition/phenoconversion: EXP3174 bioactivation reduced",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { fold:0.5, direction:"decrease", label:"EXP3174 AUC about 50% lower; antihypertensive effect may be reduced" },
      [GENOTYPE_PHENOTYPE.IM]: { fold:0.75, direction:"decrease", label:"intermediate EXP3174 reduction; monitor blood pressure response" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Azathioprine",
    metaboliteId:"6-thioguanine-nucleotides-6-tgn",
    metaboliteName:"6-Thioguanine nucleotides (6-TGN)",
    enzyme:"TPMT",
    note:"TPMT normally diverts 6-MP toward methylated metabolites. TPMT PM shunts more substrate into cytotoxic 6-TGN, causing severe myelosuppression at standard doses. NUDT15 should also be considered.",
    evidenceRefs:["ev_azathioprine_tpmt_cpic2019"],
    inhibitionDirection:"increase",
    inhibitionLabel:"TPMT loss-of-function: flux shifts toward cytotoxic 6-TGN",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"6-TGN toxic accumulation; CPIC: avoid or use drastically reduced dose with weekly CBC" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate 6-TGN elevation; reduce dose and monitor CBC" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"decrease", label:"lower 6-TGN with possible 6-MMP shunting; use TDM if available" },
    }
  },
  {
    parent:"Azathioprine",
    metaboliteId:"6-thioguanine-nucleotides-6-tgn",
    metaboliteName:"6-Thioguanine nucleotides (6-TGN)",
    enzyme:"NUDT15",
    note:"NUDT15 inactivates thiopurine cytotoxic nucleotide metabolites. NUDT15 poor function can cause severe myelosuppression even when TPMT function is normal.",
    evidenceRefs:["ev_azathioprine_tpmt_cpic2019"],
    inhibitionDirection:"increase",
    inhibitionLabel:"NUDT15 loss-of-function: cytotoxic thiopurine nucleotide intolerance",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"very high myelosuppression risk; CPIC: avoid or use drastically reduced dose" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"increased myelosuppression risk; reduce dose and monitor CBC" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Warfarin",
    metaboliteId:"warfarin-dose-sensitivity",
    metaboliteName:"Warfarin dose sensitivity",
    enzyme:"VKORC1",
    systemic:true,
    note:"VKORC1 genotype changes warfarin pharmacodynamic sensitivity at the vitamin K epoxide reductase target. INR-guided dosing remains mandatory.",
    evidenceRefs:["ev_warfarin_cyp2c9_vkorc1_cyp4f2_cpic2017"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"warfarin-sensitive VKORC1 context; lower maintenance dose likely" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate sensitivity; use pharmacogenomic dosing plus INR" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"decrease", label:"relative resistance context; higher dose may be needed, guided by INR" },
    }
  },
  {
    parent:"Warfarin",
    metaboliteId:"vitamin-k-oxidation",
    metaboliteName:"Vitamin K oxidation",
    enzyme:"CYP4F2",
    systemic:true,
    note:"CYP4F2 V433M reduces vitamin K oxidation and modestly increases warfarin dose requirement; the effect is smaller than VKORC1 and CYP2C9.",
    evidenceRefs:["ev_warfarin_cyp2c9_vkorc1_cyp4f2_cpic2017"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"modestly higher dose requirement from reduced vitamin K oxidation" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"decrease", label:"small upward dose-pressure signal" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Omeprazole",
    metaboliteId:"5-hydroxyomeprazole",
    metaboliteName:"5-Hydroxyomeprazole",
    enzyme:"CYP2C19",
    note:"5-Hydroxyomeprazole is inactive. CYP2C19 PM reduces 5-OH formation while parent omeprazole accumulates and acid suppression increases.",
    evidenceRefs:["ev_omeprazole_cyp2c19_lima2021"],
    inhibitionDirection:"decrease",
    inhibitionLabel:"CYP2C19 inhibition/phenoconversion: 5-OH formation reduced; parent accumulates",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"5-OH formation reduced; parent omeprazole accumulates about 5x (see parent row/CLINICAL_FOLD)" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"increase", label:"faster 5-OH formation; parent lower; acid suppression may be reduced" },
    }
  },
  {
    parent:"Voriconazole",
    metaboliteId:"voriconazole-n-oxide",
    metaboliteName:"Voriconazole N-oxide",
    enzyme:"CYP2C19",
    note:"Voriconazole N-oxide is inactive. CYP2C19 PM reduces N-oxide formation while parent voriconazole accumulates; TDM is mandatory.",
    evidenceRefs:["ev_voriconazole_cyp2c19_hyland2008"],
    inhibitionDirection:"decrease",
    inhibitionLabel:"CYP2C19 inhibition/phenoconversion: N-oxide formation reduced; parent accumulates",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"N-oxide formation reduced; parent voriconazole about 4x higher (see parent row/CLINICAL_FOLD); TDM essential" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"increase", label:"faster N-oxide formation; parent lower; subtherapeutic risk; TDM essential" },
    }
  },
  {
    parent:"Efavirenz",
    metaboliteId:"8-hydroxyefavirenz",
    metaboliteName:"8-Hydroxyefavirenz",
    enzyme:"CYP2B6",
    note:"8-Hydroxyefavirenz is inactive. CYP2B6 PM reduces 8-OH formation while parent efavirenz accumulates; the parent fold stays on the parent row.",
    evidenceRefs:["ev_efavirenz_cyp2b6_desta2019"],
    inhibitionDirection:"decrease",
    inhibitionLabel:"CYP2B6 inhibition/phenoconversion: 8-OH formation reduced; parent efavirenz accumulates",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"8-OH formation reduced; parent efavirenz AUC 3-4x higher (see parent row/CLINICAL_FOLD)" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"decrease", label:"8-OH formation moderately reduced; parent efavirenz higher" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Fluorouracil",
    metaboliteId:"dihydrofluorouracil-dhfu",
    metaboliteName:"Dihydrofluorouracil (DHFU)",
    enzyme:"DPYD",
    note:"DPYD catabolizes most 5-FU to inactive DHFU. DPYD PM reduces DHFU formation and causes parent 5-FU accumulation with life-threatening toxicity.",
    evidenceRefs:["ev_fluorouracil_dpyd_amstutz2018"],
    inhibitionDirection:"decrease",
    inhibitionLabel:"DPYD loss-of-function: DHFU formation reduced; parent 5-FU accumulates",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"DHFU formation reduced; parent 5-FU accumulates -> life-threatening toxicity" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"decrease", label:"DHFU formation reduced; 5-FU toxicity risk higher; CPIC recommends major dose reduction" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Capecitabine",
    metaboliteId:"5-fluorouracil",
    metaboliteName:"5-Fluorouracil",
    enzyme:"DPYD",
    note:"Capecitabine is converted to active 5-FU. DPYD loss-of-function impairs 5-FU catabolism, so 5-FU accumulates and can cause fatal fluoropyrimidine toxicity.",
    evidenceRefs:["ev_fluorouracil_dpyd_amstutz2018"],
    inhibitionDirection:"increase",
    inhibitionLabel:"DPYD loss-of-function: 5-FU from capecitabine accumulates",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"5-FU from capecitabine accumulates -> life-threatening toxicity" },
      [GENOTYPE_PHENOTYPE.IM]: { fold:2.0, direction:"increase", label:"higher 5-FU exposure risk; CPIC recommends major dose reduction" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Irinotecan",
    metaboliteId:"sn-38-7-ethyl-10-hydroxycamptothecin",
    metaboliteName:"SN-38",
    enzyme:"UGT1A1",
    note:"SN-38 is the active cytotoxic metabolite of irinotecan. UGT1A1 poor function impairs SN-38 glucuronidation to inactive SN-38G, increasing severe neutropenia risk.",
    evidenceRefs:["ev_irinotecan_ugt1a1_ramsey2014"],
    inhibitionDirection:"increase",
    inhibitionLabel:"UGT1A1 loss-of-function: SN-38 glucuronidation impaired -> SN-38 accumulates",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { fold:1.4, direction:"increase", label:"SN-38 exposure higher; reduce starting dose and monitor CBC" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"modest SN-38 elevation; standard dose with close CBC monitoring" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Lisdexamfetamine",
    metaboliteId:"d-amphetamine-dextroamphetamine",
    metaboliteName:"d-Amphetamine",
    enzyme:"CYP2D6",
    note:"Lisdexamfetamine activation is CYP-independent RBC hydrolysis. CYP2D6 affects clearance of the released d-amphetamine only modestly; urinary pH can be a larger driver.",
    evidenceRefs:["ev_lisdexamfetamine_rbc_activation","ev_lisdexamfetamine_cyp2d6_fda"],
    inhibitionDirection:"increase",
    inhibitionLabel:"CYP2D6 inhibition after prodrug conversion: modestly higher d-amphetamine exposure",
    inhibitionFold:1.25,
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { fold:1.25, direction:"increase", label:"~20-30% higher d-amphetamine exposure after conversion" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
];
