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
  { parent:"Hydrocodone", metaboliteId:"hydromorphone", requiredEvidenceRefs:["ev_opioid_cyp2d6_cpic_2020"] },
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
  { parent:"Proguanil", metaboliteId:"cycloguanil", requiredEvidenceRefs:["ev_malarone_label"] },
  { parent:"Azathioprine", metaboliteId:"6-thioguanine-nucleotides-6-tgn", requiredEvidenceRefs:["ev_azathioprine_tpmt_cpic2019"] },
  { parent:"Omeprazole", metaboliteId:"5-hydroxyomeprazole", requiredEvidenceRefs:["ev_omeprazole_cyp2c19_lima2021"] },
  { parent:"Voriconazole", metaboliteId:"voriconazole-n-oxide", requiredEvidenceRefs:["ev_voriconazole_cyp2c19_hyland2008"] },
  { parent:"Efavirenz", metaboliteId:"8-hydroxyefavirenz", requiredEvidenceRefs:["ev_efavirenz_cyp2b6_desta2019"] },
  { parent:"Vortioxetine", metaboliteId:"vortioxetine-carboxylic-acid", requiredEvidenceRefs:["ev_vortioxetine_cyp2d6_pk"] },
  { parent:"Flecainide", metaboliteId:"m-o-dealkylated-flecainide", requiredEvidenceRefs:["ev_flecainide_cyp2d6_pgx"] },
  { parent:"Mexiletine", metaboliteId:"p-hydroxymexiletine", requiredEvidenceRefs:["ev_mexiletine_label"] },
  { parent:"Perphenazine", metaboliteId:"7-hydroxyperphenazine", requiredEvidenceRefs:["ev_antipsychotic_cyp2d6_labels"] },
  { parent:"Phenytoin", metaboliteId:"5-p-hydroxyphenyl-5-phenylhydantoin-hpph", requiredEvidenceRefs:["ev_phenytoin_cyp2c9_hlab_cpic2020"] },
  { parent:"Fluorouracil", metaboliteId:"dihydrofluorouracil-dhfu", requiredEvidenceRefs:["ev_fluorouracil_dpyd_amstutz2018"] },
  { parent:"Capecitabine", metaboliteId:"5-fluorouracil", requiredEvidenceRefs:["ev_fluorouracil_dpyd_amstutz2018"] },
  { parent:"Irinotecan", metaboliteId:"sn-38-7-ethyl-10-hydroxycamptothecin", requiredEvidenceRefs:["ev_irinotecan_ugt1a1_ramsey2014"] },
  { parent:"Leflunomide", metaboliteId:"teriflunomide-a77-1726", requiredEvidenceRefs:["ev_leflunomide_teriflunomide_half_life"] },
  { parent:"Mycophenolate", metaboliteId:"mycophenolic-acid-mpa", requiredEvidenceRefs:["ev_mycophenolate_enterohepatic_label"] },
  { parent:"Allopurinol", metaboliteId:"oxypurinol-alloxanthine", requiredEvidenceRefs:["ev_allopurinol_oxypurinol_label"] },
  { parent:"Primidone", metaboliteId:"phenobarbital", requiredEvidenceRefs:["ev_primidone_metabolites_label"] },
  { parent:"Acetaminophen", metaboliteId:"napqi", requiredEvidenceRefs:["ev_apap_alcohol_riordan2002"] },
  { parent:"Dapsone", metaboliteId:"dapsone-hydroxylamine-dds-nhoh", requiredEvidenceRefs:["ev_dapsone_ddsnhoh_metabolite"] },
  { parent:"Mercaptopurine", metaboliteId:"6-thioguanine-nucleotides-6-tgn", requiredEvidenceRefs:["ev_thiopurine_tpmt_nudt15_cpic2025"] },
  { parent:"Thioguanine", metaboliteId:"6-thioguanine-nucleotides-6-tgn", requiredEvidenceRefs:["ev_thiopurine_tpmt_nudt15_cpic2025"] },
  { parent:"Tafenoquine", metaboliteId:"tafenoquine-oxidative-metabolites", requiredEvidenceRefs:["ev_tafenoquine_g6pd_fda"] },
  { parent:"Primaquine", metaboliteId:"primaquine-hydroxylamine-quinone-imine-metabolites", requiredEvidenceRefs:["ev_g6pd_oxidative_antimalarials"] },
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
    note:"Diet-derived biomarker: solanidine concentration rises sharply when CYP2D6 activity is absent. This is exposure/phenotyping context, not a dietary toxicity threshold. Acute potato glycoalkaloid toxicity depends more on total α-solanine/α-chaconine exposure, greening/sprouting/peel burden, GI effects, and cholinesterase/membrane toxicity.",
    evidenceRefs:["ev_solanidine_cyp2d6_hellden2024","ev_potato_glycoalkaloid_human_pk_mensinga2005","ev_potato_glycoalkaloid_efsa_2020"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { fold:18.9, direction:"increase", label:"+1887% plasma solanidine vs NM" },
      [GENOTYPE_PHENOTYPE.IM]: { fold:1.74, direction:"increase", label:"+74% plasma solanidine vs NM" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
      [GENOTYPE_PHENOTYPE.UM]: { fold:0.65, direction:"decrease", label:"-35% plasma solanidine vs NM" },
    }
  },
  {
    parent:"Potatoes (Solanine/Solanidine)",
    metaboliteId:"4-oh-solanidine",
    metaboliteName:"4-OH-solanidine / SSDA",
    enzyme:"CYP2D6",
    note:"Solanidine metabolite ratios are a null-impact biomarker pattern: CYP2D6 loss or strong inhibition lowers 4-OH-solanidine and SSDA formation while parent solanidine rises. This is not a potato-toxicity threshold.",
    evidenceRefs:["ev_solanidine_metabolites_tamoxifen_2024","ev_solanidine_cyp2d6_hellden2024"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"CYP2D6 product formation expected very low; parent solanidine accumulation signal dominates" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"decrease", label:"reduced 4-OH/SSDA formation; interpret parent/metabolite ratios cautiously" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline metabolite formation" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"increase", label:"higher metabolite/parent ratio expected; parent solanidine may be lower" },
    }
  },
  {
    parent:"Potatoes (Solanine/Solanidine)",
    metaboliteId:"potato-glycoalkaloid-exposure-context",
    metaboliteName:"α-Solanine/α-Chaconine exposure context",
    enzyme:"CYP2D6",
    systemic:true,
    note:"This card separates food-toxicology exposure from CYP2D6 biomarker biology. Green/sprouted/peel-heavy potatoes and cultivar/storage differences can raise total glycoalkaloid burden; α-chaconine and α-solanine have GI membrane and cholinesterase-linked toxicity mechanisms. Genotype does not convert ordinary potatoes into a medication-like contraindication.",
    evidenceRefs:["ev_potato_glycoalkaloid_human_pk_mensinga2005","ev_potato_glycoalkaloid_efsa_2020","ev_potato_glycoalkaloid_toxicology_review_1990"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"CYP2D6 PM/null: solanidine biomarker may accumulate, but total glycoalkaloid dose drives acute toxicity risk" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"intermediate CYP2D6: biomarker interpretation changes; exposure context still dominates" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline CYP2D6 biomarker context; avoid high glycoalkaloid exposure regardless of genotype" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"decrease", label:"higher CYP2D6 activity may lower solanidine biomarker, but does not remove food-toxicology exposure risk" },
    }
  },
  {
    parent:"Cinnamon / Coumarin",
    metaboliteId:"7-hydroxycoumarin",
    metaboliteName:"7-Hydroxycoumarin",
    enzyme:"CYP2A6",
    note:"Coumarin illustrates detox-route null impact: CYP2A6 normally forms the lower-risk 7-hydroxycoumarin pathway. Reduced CYP2A6 may increase reliance on minor ring-opening metabolites, especially with chronic high-coumarin cassia cinnamon exposure.",
    evidenceRefs:["ev_coumarin_cyp2a6_hepatotoxicity_review"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"7-hydroxylation markedly reduced; review chronic cassia/coumarin exposure and liver risk stack" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"decrease", label:"intermediate detox-route capacity; monitor dose/exposure context" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline detox pathway" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"increase", label:"higher 7-hydroxylation capacity; ordinary exposure limits still apply" },
    }
  },
  {
    parent:"Cruciferous Vegetables (Isothiocyanates)",
    metaboliteId:"isothiocyanate-mercapturic-acids",
    metaboliteName:"Isothiocyanate mercapturic acids",
    enzyme:"GSTM1",
    note:"Cruciferous isothiocyanates are a useful opposite-pattern example: GSTM1 null can slow conjugation/excretion and prolong bioactive isothiocyanate exposure. This may be beneficial or adverse depending on context; do not treat it as a simple toxicity flag.",
    evidenceRefs:["ev_cruciferous_isothiocyanate_gstm1_2005","ev_watercress_itc_gst_2009"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"GSTM1 null: slower GST-mediated conjugation/excretion; exposure may be more sustained" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"possible intermediate GST context; GSTT1 and diet/microbiome also matter" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline GSTM1-present context" },
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
    evidenceRefs:["ev_clopidogrel_cyp2c19_cpic","ev_clopidogrel_active_thiol_kim2014","ev_clopidogrel_cyp2c19_mega2009","ev_clopidogrel_dose_escalation_horenstein2014"],
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
    parent:"Hydrocodone",
    metaboliteId:"hydromorphone",
    metaboliteName:"Hydromorphone",
    enzyme:"CYP2D6",
    note:"Hydrocodone is a partial prodrug-style case: CYP2D6 forms more potent hydromorphone, but parent hydrocodone remains active. CYP2D6 PM status may reduce hydromorphone contribution; clinical actionability is weaker than codeine or tramadol.",
    evidenceRefs:["ev_opioid_cyp2d6_cpic_2020","ev_opioid_ugt2b7_glucuronidation_review"],
    inhibitionDirection:"decrease",
    inhibitionLabel:"CYP2D6 inhibition/phenoconversion context: lower hydromorphone formation expected, but parent hydrocodone remains active",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"hydromorphone formation reduced; parent hydrocodone still active, so response loss is less predictable than codeine/tramadol" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"decrease", label:"possible intermediate hydromorphone reduction; monitor analgesia and sedation clinically" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"increase", label:"higher hydromorphone formation possible; opioid toxicity signal remains less certain than codeine" },
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
    note:"4-Hydroxyatomoxetine is equipotent to parent at NET. CYP2D6 PM reduces 4-OH formation while parent atomoxetine accumulates substantially; pediatric population PK evidence supports large CYP2D6 activity-score effects on clearance and metabolite balance.",
    evidenceRefs:["ev_atomoxetine_cyp2d6_cpic","ev_atomoxetine_pop_pk_shen2023","ev_atomoxetine_pop_pk_tobin2026"],
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
    note:"Norclobazam is active and cleared by CYP2C19. CYP2C19 PM impairs norclobazam clearance, producing metabolite accumulation; public case/TDM data report N-CLB/CLB ratios 10- to 27-fold above matched medians in presumed CYP2C19 PM children.",
    evidenceRefs:["ev_clobazam_cyp2c19_fda_onfi","ev_clobazam_cyp2c19_contin2003","ev_clobazam_cbd_ddi_morrison2019"],
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
    parent:"Succinylcholine",
    metaboliteId:"succinylcholine-bche-blockade-duration",
    metaboliteName:"Neuromuscular blockade duration",
    enzyme:"BCHE",
    systemic:true,
    note:"Succinylcholine is normally hydrolyzed rapidly by plasma butyrylcholinesterase. BCHE poor function does not create an active metabolite problem; it prevents rapid drug offset, so paralysis/apnea can persist after the expected procedural window.",
    evidenceRefs:["ev_bche_succinylcholine_mivacurium_label","ev_volatile_succinylcholine_ryr1_cacna1s_cpic2019"],
    inhibitionDirection:"increase",
    inhibitionLabel:"BCHE inhibition/low enzyme activity: prolonged neuromuscular blockade expected",
    clinicalAction:"avoid if known deficiency when feasible; prepare ventilation/sedation until recovery if exposure occurs",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"severe prolonged paralysis/apnea risk; use non-BCHE-dependent paralytic when possible" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"prolonged blockade risk; review anesthesia history and consider alternatives" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline rapid hydrolysis" },
    }
  },
  {
    parent:"Mivacurium",
    metaboliteId:"mivacurium-bche-blockade-duration",
    metaboliteName:"Neuromuscular blockade duration",
    enzyme:"BCHE",
    systemic:true,
    note:"Mivacurium is also hydrolyzed by plasma butyrylcholinesterase. BCHE deficiency can turn a short-acting paralytic into a prolonged ventilation problem.",
    evidenceRefs:["ev_bche_succinylcholine_mivacurium_label"],
    inhibitionDirection:"increase",
    inhibitionLabel:"BCHE inhibition/low enzyme activity: prolonged mivacurium blockade expected",
    clinicalAction:"avoid if known deficiency when feasible; monitor train-of-four and ventilatory recovery",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"severe prolonged neuromuscular blockade risk" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"prolonged blockade risk; use caution and monitoring" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline rapid hydrolysis" },
    }
  },
  {
    parent:"Ibuprofen",
    metaboliteId:"ibuprofen-cyp2c9-parent-exposure",
    metaboliteName:"Parent ibuprofen exposure",
    enzyme:"CYP2C9",
    systemic:true,
    note:"Ibuprofen is cleared partly by CYP2C9. CYP2C9 reduced function can raise parent NSAID exposure; the risk becomes more important with older age, renal disease, high dose, anticoagulants/antiplatelets, ACEi/ARB plus diuretic stacks, or GI bleed history.",
    evidenceRefs:["ev_cyp2c9_nsaid_cpic2020"],
    inhibitionDirection:"increase",
    inhibitionLabel:"CYP2C9 inhibition/phenoconversion: higher parent ibuprofen exposure expected",
    clinicalAction:"consider lower dose/short duration or non-NSAID analgesic in high-risk patients",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"higher parent exposure and dose-related toxicity risk; CPIC NSAID context applies" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"moderately higher exposure possible; review dose, duration, kidney/GI/CV risk" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Celecoxib",
    metaboliteId:"celecoxib-cyp2c9-parent-exposure",
    metaboliteName:"Parent celecoxib exposure",
    enzyme:"CYP2C9",
    systemic:true,
    note:"Celecoxib is a CYP2C9-sensitive NSAID. CYP2C9 poor metabolizers can have substantially higher parent exposure, so dose and duration matter even though COX-2 selectivity lowers some GI risk.",
    evidenceRefs:["ev_cyp2c9_nsaid_cpic2020"],
    inhibitionDirection:"increase",
    inhibitionLabel:"CYP2C9 inhibition/phenoconversion: higher parent celecoxib exposure expected",
    clinicalAction:"consider lower starting dose or alternative in CYP2C9 poor metabolizers",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { fold:4.0, direction:"increase", label:"celecoxib exposure may be several-fold higher in CYP2C9 poor metabolizers" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate exposure increase; use lowest effective dose" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Meloxicam",
    metaboliteId:"meloxicam-cyp2c9-parent-exposure",
    metaboliteName:"Parent meloxicam exposure",
    enzyme:"CYP2C9",
    systemic:true,
    note:"Meloxicam has CYP2C9-linked clearance and a long half-life. Reduced CYP2C9 activity can matter most during repeated dosing, renal/GI/CV risk, or anticoagulant/antiplatelet overlap.",
    evidenceRefs:["ev_cyp2c9_nsaid_cpic2020"],
    inhibitionDirection:"increase",
    inhibitionLabel:"CYP2C9 inhibition/phenoconversion: higher parent meloxicam exposure expected",
    clinicalAction:"review dose, duration, renal function, and bleeding/cardiovascular context",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"higher exposure possible; long half-life can amplify accumulation" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"modest exposure increase possible" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Pioglitazone",
    metaboliteId:"pioglitazone-cyp2c8-active-metabolites",
    metaboliteName:"Pioglitazone active metabolite balance",
    enzyme:"CYP2C8",
    systemic:true,
    note:"Pioglitazone is mainly CYP2C8-cleared and forms active metabolites. CYP2C8 reduced function or inhibition can raise parent exposure while also changing active metabolite balance; edema, heart-failure risk, hypoglycemia with insulin/sulfonylureas, and hepatic context dominate clinical interpretation.",
    evidenceRefs:["ev_cyp2c8_pharmacogenetics_review_tornio2009"],
    inhibitionDirection:"increase",
    inhibitionLabel:"CYP2C8 inhibition/phenoconversion: higher pioglitazone exposure expected",
    clinicalAction:"monitor edema, weight gain, glycemic effect, and interacting CYP2C8 inhibitors",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"higher parent exposure possible; active metabolite direction is not a simple parent-only rule" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate exposure shift possible" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Paclitaxel",
    metaboliteId:"paclitaxel-cyp2c8-parent-exposure",
    metaboliteName:"Parent paclitaxel exposure",
    enzyme:"CYP2C8",
    systemic:true,
    note:"Paclitaxel toxicity is parent-exposure driven; 6-alpha-hydroxypaclitaxel is mainly an inactive clearance product. CYP2C8 reduced function or inhibition can therefore raise neuropathy/myelosuppression risk without creating an active-metabolite signal.",
    evidenceRefs:["ev_paclitaxel_cyp2c8_label","ev_cyp2c8_pharmacogenetics_review_tornio2009"],
    inhibitionDirection:"increase",
    inhibitionLabel:"CYP2C8 inhibition/phenoconversion: higher parent paclitaxel exposure expected",
    clinicalAction:"review neuropathy/myelosuppression risk and CYP2C8 inhibitors; oncology dosing remains protocol-driven",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"higher parent paclitaxel exposure possible; monitor toxicity" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"moderate parent exposure shift possible" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Proguanil",
    metaboliteId:"cycloguanil",
    metaboliteName:"Cycloguanil",
    enzyme:"CYP2C19",
    note:"Proguanil is CYP2C19-activated to cycloguanil, an active DHFR inhibitor. CYP2C19 PM/IM status can reduce cycloguanil formation, but atovaquone/proguanil efficacy also depends strongly on atovaquone food-dependent absorption, adherence, vomiting/diarrhea, resistance geography, and indication.",
    evidenceRefs:["ev_malarone_label"],
    inhibitionDirection:"decrease",
    inhibitionLabel:"CYP2C19 inhibition/phenoconversion context: lower cycloguanil formation expected; evaluate antimalarial regimen context",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"cycloguanil formation reduced; do not interpret as standalone Malarone failure without atovaquone exposure and clinical context" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"decrease", label:"possible partial cycloguanil reduction; monitor indication and exposure context" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"increase", label:"higher cycloguanil formation possible; clinical relevance uncertain in combination therapy" },
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
    evidenceRefs:["ev_voriconazole_cyp2c19_hyland2008","ev_voriconazole_pop_pk_wang2013"],
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
    parent:"Vortioxetine",
    metaboliteId:"vortioxetine-carboxylic-acid",
    metaboliteName:"Vortioxetine carboxylic acid",
    enzyme:"CYP2D6",
    note:"Vortioxetine carboxylic acid is inactive. CYP2D6 PM reduces oxidative clearance to this metabolite while parent vortioxetine accumulates; clinical management follows parent exposure and tolerability.",
    evidenceRefs:["ev_vortioxetine_cyp2d6_pk"],
    inhibitionDirection:"decrease",
    inhibitionLabel:"CYP2D6 inhibition/phenoconversion: inactive carboxylic acid formation reduced; parent vortioxetine accumulates",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"inactive carboxylic acid formation reduced; parent vortioxetine exposure higher" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"decrease", label:"partial clearance reduction; monitor nausea, CNS effects, and dose response" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"increase", label:"faster inactive metabolite formation; parent exposure may be lower" },
    }
  },
  {
    parent:"Flecainide",
    metaboliteId:"m-o-dealkylated-flecainide",
    metaboliteName:"m-O-dealkylated flecainide",
    enzyme:"CYP2D6",
    note:"m-O-dealkylated flecainide is inactive. CYP2D6 PM or strong inhibition reduces this clearance route while parent flecainide accumulates; because flecainide is narrow-therapeutic-index, ECG/plasma-level context matters.",
    evidenceRefs:["ev_flecainide_cyp2d6_pgx","ev_flecainide_cyp2d6_safety"],
    inhibitionDirection:"decrease",
    inhibitionLabel:"CYP2D6 inhibition/phenoconversion: inactive metabolite formation reduced; parent flecainide accumulates",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"inactive metabolite formation reduced; parent flecainide exposure about 2-3x higher; monitor QRS/levels" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"decrease", label:"intermediate clearance reduction; renal function and ECG monitoring matter" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Mexiletine",
    metaboliteId:"p-hydroxymexiletine",
    metaboliteName:"p-Hydroxymexiletine",
    enzyme:"CYP2D6",
    note:"p-Hydroxymexiletine is an inactive clearance metabolite. CYP2D6 PM or inhibition reduces this pathway while parent mexiletine accumulates; CYP1A2 induction from smoking can pull exposure in the opposite direction.",
    evidenceRefs:["ev_mexiletine_label"],
    inhibitionDirection:"decrease",
    inhibitionLabel:"CYP2D6 inhibition/phenoconversion: inactive hydroxylated metabolite formation reduced; parent mexiletine accumulates",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"p-hydroxymexiletine formation reduced; parent mexiletine exposure may rise about 2-3x" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"decrease", label:"partial clearance reduction; smoking/CYP1A2 and hepatic function can change the net effect" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Perphenazine",
    metaboliteId:"7-hydroxyperphenazine",
    metaboliteName:"7-Hydroxyperphenazine",
    enzyme:"CYP2D6",
    note:"7-Hydroxyperphenazine is part of CYP2D6-linked phenothiazine metabolism. CYP2D6 PM reduces this metabolic route while parent perphenazine exposure rises, increasing EPS and concentration-related adverse-effect concern.",
    evidenceRefs:["ev_antipsychotic_cyp2d6_labels"],
    inhibitionDirection:"decrease",
    inhibitionLabel:"CYP2D6 inhibition/phenoconversion: hydroxylated metabolite formation reduced; parent perphenazine accumulates",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"7-OH formation reduced; parent perphenazine exposure about 2-2.5x higher; consider dose reduction/TDM context" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"decrease", label:"intermediate clearance reduction; monitor EPS, sedation, and QT context" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Phenytoin",
    metaboliteId:"5-p-hydroxyphenyl-5-phenylhydantoin-hpph",
    metaboliteName:"5-(p-Hydroxyphenyl)-5-phenylhydantoin (HPPH)",
    enzyme:"CYP2C9",
    note:"HPPH is the main inactive phenytoin metabolite. CYP2C9 reduced function lowers HPPH formation while parent phenytoin accumulates nonlinearly; dose adjustment and therapeutic drug monitoring remain central.",
    evidenceRefs:["ev_phenytoin_cyp2c9_hlab_cpic2020"],
    inhibitionDirection:"decrease",
    inhibitionLabel:"CYP2C9 reduced function: inactive HPPH formation reduced; parent phenytoin accumulates nonlinearly",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"HPPH formation reduced; parent phenytoin can accumulate 3-4x or more because kinetics are saturable; use TDM" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"decrease", label:"partial clearance reduction; start lower and use TDM/clinical monitoring" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Phenytoin",
    metaboliteId:"phenytoin-cyp2c9-cyp2c19-compound-clearance",
    metaboliteName:"Compound CYP2C9/CYP2C19 clearance pressure",
    enzyme:"CYP2C19",
    systemic:true,
    note:"Phenytoin is mostly CYP2C9-cleared, with CYP2C19 as a secondary pathway. CYP2C19 poor function alone is usually less important than CYP2C9, but it can compound CYP2C9 reduced function or inhibitor stacks because phenytoin has nonlinear, narrow-therapeutic-index kinetics.",
    evidenceRefs:["ev_phenytoin_cyp2c9_hlab_cpic2020"],
    inhibitionDirection:"increase",
    inhibitionLabel:"CYP2C19 inhibition/phenoconversion: secondary phenytoin clearance reserve reduced",
    clinicalAction:"use therapeutic drug monitoring; interpret CYP2C19 together with CYP2C9, albumin, renal status, and interacting drugs",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"secondary clearance reserve reduced; can compound CYP2C9 PM/IM or CYP2C9 inhibition" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"partial secondary clearance reduction; usually monitor rather than genotype-only dose change" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Glipizide",
    metaboliteId:"glipizide-cyp2c9-parent-exposure",
    metaboliteName:"Parent glipizide exposure",
    enzyme:"CYP2C9",
    systemic:true,
    note:"Glipizide is CYP2C9-cleared to largely inactive metabolites. Reduced CYP2C9 function can raise parent sulfonylurea exposure, but hypoglycemia risk is strongly shaped by age, meals, renal/hepatic function, dose, and combination therapy.",
    evidenceRefs:["ev_sulfonylurea_cyp2c9_label_context"],
    inhibitionDirection:"increase",
    inhibitionLabel:"CYP2C9 inhibition/phenoconversion: higher parent glipizide exposure expected",
    clinicalAction:"review hypoglycemia risk; consider lower dose or closer glucose monitoring in high-risk contexts",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"higher parent exposure and hypoglycemia risk possible" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"moderate exposure shift possible" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Glyburide",
    metaboliteId:"glyburide-cyp2c9-active-metabolite-balance",
    metaboliteName:"Glyburide active moiety exposure",
    enzyme:"CYP2C9",
    systemic:true,
    note:"Glyburide has active hydroxylated metabolites and a higher hypoglycemia burden than many alternatives. CYP2C9 reduced function may raise parent exposure while active metabolite formation/clearance is mixed, so this should be treated as active-moiety hypoglycemia risk rather than a simple inactive-metabolite rule.",
    evidenceRefs:["ev_sulfonylurea_cyp2c9_label_context"],
    inhibitionDirection:"increase",
    inhibitionLabel:"CYP2C9 inhibition/phenoconversion: active sulfonylurea burden may rise",
    clinicalAction:"review hypoglycemia risk and consider alternatives in older or renal-risk patients",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"higher active sulfonylurea burden possible; hypoglycemia risk context" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"moderate active-moiety shift possible" },
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
    parent:"Tegafur",
    metaboliteId:"5-fluorouracil",
    metaboliteName:"5-Fluorouracil",
    enzyme:"DPYD",
    note:"Tegafur is converted to active 5-FU, and DPYD loss-of-function impairs 5-FU catabolism. Treat reduced DPYD function as a fluoropyrimidine toxicity signal even though CYP2A6 controls much of tegafur activation.",
    evidenceRefs:["ev_tegafur_cyp2a6_activation_pubmed","ev_fluorouracil_dpyd_amstutz2018"],
    inhibitionDirection:"increase",
    inhibitionLabel:"DPYD loss-of-function: 5-FU from tegafur accumulates",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"5-FU from tegafur accumulates -> life-threatening fluoropyrimidine toxicity risk" },
      [GENOTYPE_PHENOTYPE.IM]: { fold:2.0, direction:"increase", label:"higher 5-FU exposure risk; use fluoropyrimidine PGx dosing precautions" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Irinotecan",
    metaboliteId:"sn-38-7-ethyl-10-hydroxycamptothecin",
    metaboliteName:"SN-38",
    enzyme:"UGT1A1",
    note:"SN-38 is the active cytotoxic metabolite of irinotecan. UGT1A1 poor function impairs SN-38 glucuronidation to inactive SN-38G, increasing severe neutropenia risk; public PK abstracts reinforce lower SN-38G/SN-38 ratios in reduced UGT1A contexts.",
    evidenceRefs:["ev_irinotecan_ugt1a1_ramsey2014","ev_irinotecan_ugt1a1_stewart2007","ev_irinotecan_ugt1a_han2006","ev_irinotecan_sn38_review_mathijssen2001"],
    inhibitionDirection:"increase",
    inhibitionLabel:"UGT1A1 loss-of-function: SN-38 glucuronidation impaired -> SN-38 accumulates",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { fold:1.4, direction:"increase", label:"SN-38 exposure higher; reduce starting dose and monitor CBC" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"modest SN-38 elevation; standard dose with close CBC monitoring" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Lamotrigine",
    metaboliteId:"lamotrigine-ugt1a4-parent-exposure",
    metaboliteName:"Parent lamotrigine exposure",
    enzyme:"UGT1A4",
    systemic:true,
    note:"Lamotrigine is primarily cleared by UGT1A4 glucuronidation. Reduced UGT1A4 activity can raise parent exposure, but valproate inhibition, estrogen-containing contraceptives, pregnancy, and enzyme inducers often produce larger changes than genotype alone.",
    evidenceRefs:["ev_lamotrigine_valproate_rambeck1993","ev_estradiol_lamotrigine_ugt1a4"],
    inhibitionDirection:"increase",
    inhibitionLabel:"UGT1A4 inhibition/phenoconversion: higher parent lamotrigine exposure expected",
    clinicalAction:"monitor seizure/mood control, rash risk, and dose changes around valproate, estrogens, pregnancy, and enzyme inducers",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"higher parent lamotrigine exposure possible; titration and interaction context dominate" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"moderate exposure increase possible" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"decrease", label:"faster glucuronidation possible; watch for loss of seizure/mood control" },
    }
  },
  {
    parent:"Asenapine",
    metaboliteId:"asenapine-ugt1a4-parent-exposure",
    metaboliteName:"Parent asenapine exposure",
    enzyme:"UGT1A4",
    systemic:true,
    note:"Asenapine undergoes UGT1A4 glucuronidation plus CYP1A2 oxidation. UGT1A4 reduced function is a contextual exposure flag; smoking/CYP1A2 inhibition, formulation, sedation, orthostasis, EPS, and QT context are usually more actionable.",
    evidenceRefs:["ev_asenapine_ugt1a4_cyp1a2_label"],
    inhibitionDirection:"increase",
    inhibitionLabel:"UGT1A4 inhibition/phenoconversion: higher asenapine exposure possible",
    clinicalAction:"monitor sedation, orthostasis, EPS, and CYP1A2 inhibitor/smoking changes",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"higher parent exposure possible; not a genotype-only dose rule" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"modest exposure shift possible" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Propofol",
    metaboliteId:"propofol-ugt1a9-parent-exposure",
    metaboliteName:"Parent propofol exposure",
    enzyme:"UGT1A9",
    systemic:true,
    note:"Propofol clearance includes major UGT1A9 glucuronidation and CYP2B6 oxidation. UGT1A9 reduced function is most relevant as a procedural/ICU titration context, especially during prolonged high-dose infusion.",
    evidenceRefs:["ev_propofol_midazolam_sedation"],
    inhibitionDirection:"increase",
    inhibitionLabel:"UGT1A9 inhibition/phenoconversion: slower propofol clearance possible",
    clinicalAction:"titrate to sedation target and monitor hemodynamics, respiratory status, triglycerides/lactate during prolonged infusion",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"slower clearance possible; bedside titration dominates genotype" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"modest slower clearance possible" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Sorafenib",
    metaboliteId:"sorafenib-ugt1a9-parent-active-balance",
    metaboliteName:"Sorafenib parent/metabolite balance",
    enzyme:"UGT1A9",
    systemic:true,
    note:"Sorafenib has CYP3A4 oxidation and UGT1A9 glucuronidation. Reduced UGT1A9 activity can shift parent/conjugate balance, but clinical review should center on hypertension, hepatic injury, bleeding/INR, QT context, and strong inducers.",
    evidenceRefs:["ev_sorafenib_cyp_ugt_warfarin_label"],
    inhibitionDirection:"increase",
    inhibitionLabel:"UGT1A9 inhibition/phenoconversion: sorafenib parent/conjugate balance may shift",
    clinicalAction:"review BP, liver tests, INR/bleeding, QT risk, and CYP3A inducer/inhibitor context",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"parent/conjugate balance may shift; oncology monitoring dominates" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"modest balance shift possible" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Regorafenib",
    metaboliteId:"regorafenib-ugt1a9-active-metabolite-balance",
    metaboliteName:"Regorafenib active-metabolite balance",
    enzyme:"UGT1A9",
    systemic:true,
    note:"Regorafenib forms active M-2/M-5 through CYP3A4/UGT1A9-linked pathways. UGT1A9 changes are not parent-only; they can alter active-metabolite balance while hepatic toxicity, BP, hand-foot reaction, and BCRP inhibition drive monitoring.",
    evidenceRefs:["ev_regorafenib_cyp3a_ugt_bcrp_label"],
    inhibitionDirection:"increase",
    inhibitionLabel:"UGT1A9 inhibition/phenoconversion: active-metabolite balance may shift",
    clinicalAction:"monitor liver tests, BP, skin toxicity, and BCRP substrate exposure",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"active-moiety balance may shift; not a simple parent-only rule" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"modest active-moiety balance shift possible" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Lorazepam",
    metaboliteId:"lorazepam-ugt2b15-parent-exposure",
    metaboliteName:"Parent lorazepam exposure",
    enzyme:"UGT2B15",
    systemic:true,
    note:"Lorazepam is often chosen because it avoids CYP oxidation, but it is still cleared by glucuronidation. UGT2B15 reduced function may raise parent exposure modestly; age, dose, renal/hepatic status, opioids, alcohol, and other sedatives are more important clinically.",
    evidenceRefs:["ev_lorazepam_oxazepam_temazepam_ugt_label"],
    inhibitionDirection:"increase",
    inhibitionLabel:"UGT2B15 inhibition/phenoconversion: higher lorazepam exposure possible",
    clinicalAction:"monitor sedation, delirium, falls, and respiratory depression in combined CNS depressant stacks",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"higher parent exposure possible; sedation/fall context dominates" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"modest exposure increase possible" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Oxazepam",
    metaboliteId:"oxazepam-ugt2b17-parent-exposure",
    metaboliteName:"Parent oxazepam exposure",
    enzyme:"UGT2B17",
    systemic:true,
    note:"Oxazepam is glucuronidated and has low CYP interaction burden. UGT2B17 low function is a weak context flag, not a dose algorithm; sedation, falls, age, liver disease, renal status, and CNS depressant combinations matter more.",
    evidenceRefs:["ev_lorazepam_oxazepam_temazepam_ugt_label"],
    inhibitionDirection:"increase",
    inhibitionLabel:"UGT2B17 low function: slower oxazepam glucuronidation possible",
    clinicalAction:"monitor sedation/falls and combined CNS depressant exposure",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"slower glucuronidation possible; weak genotype-only actionability" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"small exposure shift possible" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Levodopa",
    metaboliteId:"levodopa-comt-3-omd-balance",
    metaboliteName:"Levodopa / 3-OMD balance",
    enzyme:"COMT",
    systemic:true,
    note:"COMT converts levodopa to 3-O-methyldopa, which can compete with levodopa transport. COMT genotype may modify motor fluctuation and COMT-inhibitor response, but carbidopa use, dose timing, disease stage, diet/protein, and entacapone/opicapone/tolcapone exposure dominate.",
    evidenceRefs:["ev_comt_levodopa_parkinson_2012"],
    inhibitionDirection:"decrease",
    inhibitionLabel:"COMT inhibition/low activity: lower 3-OMD formation and higher levodopa availability expected",
    clinicalAction:"review wearing-off, dyskinesia, COMT inhibitor use, protein timing, and orthostatic/neuropsychiatric effects",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"lower 3-OMD formation; levodopa effect may be amplified or prolonged" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"decrease", label:"moderately lower 3-OMD formation possible" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"increase", label:"higher 3-OMD formation possible; wearing-off context may matter" },
    }
  },
  {
    parent:"Droxidopa",
    metaboliteId:"droxidopa-comt-pressor-context",
    metaboliteName:"Norepinephrine pressor tone",
    enzyme:"COMT",
    systemic:true,
    note:"Droxidopa is converted to norepinephrine. COMT/MAO context changes catecholamine breakdown rather than classic CYP clearance; low COMT activity or COMT inhibition can amplify pressor effects and supine hypertension risk.",
    evidenceRefs:["ev_droxidopa_norepinephrine_label"],
    inhibitionDirection:"increase",
    inhibitionLabel:"COMT inhibition/low activity: catecholamine pressor tone may rise",
    clinicalAction:"monitor supine BP, timing near sleep, MAOI/pressor combinations, and carbidopa context",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"pressor tone may be amplified; monitor supine hypertension" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"moderate pressor amplification possible" },
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
  {
    parent:"Tacrolimus",
    metaboliteId:"tacrolimus-cyp3a5-exposure",
    metaboliteName:"Tacrolimus exposure / trough requirement",
    enzyme:"CYP3A5",
    systemic:true,
    note:"Tacrolimus is a narrow-therapeutic-index calcineurin inhibitor. CYP3A5 expressers clear tacrolimus faster and often need higher starting doses; non-expressers have higher concentration/dose at the same dose. Liver and renal transplant data also support ABCB1/CYP3A4 donor-recipient context, but therapeutic drug monitoring remains mandatory.",
    evidenceRefs:["ev_tacrolimus_cyp3a5_cpic","ev_tacrolimus_cyp3a5_consensus","ev_tacrolimus_liver_multigene_ladd2025","ev_tacrolimus_renal_dose_model_srinivas2023"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"CYP3A5 non-expresser: higher tacrolimus concentration/dose; standard starting dose is usually closer than expresser dosing, then TDM" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"decrease", label:"CYP3A5 expresser/intermediate: lower troughs at standard dose; CPIC recommends 1.5-2x higher starting dose with TDM" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"decrease", label:"high-expression context: higher dose pressure; use trough-guided dosing and interaction review" },
    }
  },
  {
    parent:"Ondansetron",
    metaboliteId:"ondansetron-cyp2d6-response-context",
    metaboliteName:"Ondansetron antiemetic response",
    enzyme:"CYP2D6",
    systemic:true,
    note:"Ondansetron is not just a QT drug in genotype review. CPIC frames CYP2D6 ultrarapid metabolism as a reduced-response/lower-exposure context for ondansetron and tropisetron; QT risk still depends more on dose, route, electrolytes, cardiac disease, and co-medications.",
    evidenceRefs:["ev_ondansetron_cyp2d6_cpic2017"],
    inhibitionDirection:"decrease",
    inhibitionLabel:"CYP2D6 ultrarapid metabolism: lower ondansetron response probability",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"slower CYP2D6 clearance context; review QT/sedation burden but CYP2D6 PM is not the CPIC reduced-response concern" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"baseline", label:"intermediate CYP2D6: usually no genotype-only antiemetic change; review QT and co-medications" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline antiemetic response context" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"decrease", label:"CYP2D6 ultrarapid: reduced ondansetron/tropisetron response possible; consider non-CYP2D6-dependent antiemetic options if failure risk matters" },
    }
  },
  {
    parent:"Alprazolam",
    metaboliteId:"alprazolam-cyp3a5-exposure",
    metaboliteName:"Alprazolam exposure",
    enzyme:"CYP3A5",
    systemic:true,
    note:"Alprazolam is cleared by CYP3A4/CYP3A5 hydroxylation. CYP3A5 non-expressers show higher alprazolam exposure in a small clinical PK study, but CYP3A4 inhibitors, age, liver function, and sedative co-medications usually dominate clinical risk.",
    evidenceRefs:["ev_alprazolam_cyp3a5_park2006"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { fold:1.38, direction:"increase", label:"CYP3A5*3/*3 non-expresser: alprazolam AUC about 1.38x vs CYP3A5*1/*1 expressers" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"possible modest exposure increase; monitor sedation and co-prescribed CNS depressants" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Isoniazid",
    metaboliteId:"acetylhydrazine-monoacetylhydrazine",
    metaboliteName:"Acetylhydrazine / reactive hydrazine species",
    enzyme:"NAT2",
    note:"NAT2 acetylator phenotype shifts isoniazid clearance and hepatotoxic intermediate balance. Slow/intermediate acetylators have higher parent exposure and toxicity risk; rapid acetylators may have lower exposure and treatment-response pressure depending on regimen.",
    evidenceRefs:["ev_nat2_isoniazid_consensus"],
    inhibitionDirection:"increase",
    inhibitionLabel:"NAT2 inhibition/slow-acetylator context: higher isoniazid exposure and reactive hydrazine toxicity risk",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"slow acetylator: higher hepatotoxicity and neuropathy risk; monitor LFTs, symptoms, pyridoxine, and regimen context" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate acetylator: moderate toxicity-risk signal; monitor LFTs and neuropathy symptoms" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"decrease", label:"rapid acetylator: lower exposure; review efficacy/TB regimen context" },
    }
  },
  {
    parent:"Hydralazine",
    metaboliteId:"hydralazine-nat2-autoimmunity",
    metaboliteName:"Hydralazine lupus-like toxicity context",
    enzyme:"NAT2",
    systemic:true,
    note:"Hydralazine is a NAT2-relevant drug where slow acetylation increases exposure and lupus-like toxicity risk. This is a safety-context rule, not an automatic contraindication.",
    evidenceRefs:["ev_nat2_isoniazid_consensus"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"slow acetylator: higher hydralazine exposure and drug-induced lupus risk; use lowest effective dose and monitor symptoms/ANA context" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate acetylator: possible elevated autoimmune/toxicity signal; monitor with chronic therapy" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Sulfasalazine",
    metaboliteId:"sulfapyridine",
    metaboliteName:"Sulfapyridine",
    enzyme:"NAT2",
    systemic:true,
    note:"Sulfasalazine releases sulfapyridine, which is acetylated by NAT2. Slow/intermediate acetylation can increase sulfapyridine-related dose-limiting adverse effects; G6PD/oxidative hemolysis context remains separate.",
    evidenceRefs:["ev_sulfasalazine_tpmt_inhibition","ev_nat2_isoniazid_consensus"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"slow acetylator: sulfapyridine adverse effects more likely; monitor GI, headache, rash, blood counts, and hemolysis risk context" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate acetylator: moderate sulfapyridine adverse-effect signal; monitor tolerability" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Mercaptopurine",
    metaboliteId:"6-thioguanine-nucleotides-6-tgn",
    metaboliteName:"6-Thioguanine nucleotides (6-TGN)",
    enzyme:"TPMT",
    note:"Mercaptopurine is shunted away from cytotoxic 6-TGN by TPMT methylation. TPMT poor/intermediate function shifts exposure toward 6-TGN and severe marrow toxicity; xanthine oxidase inhibitors can amplify this pathway separately.",
    evidenceRefs:["ev_thiopurine_tpmt_nudt15_cpic2025","ev_azathioprine_tpmt_cpic2019"],
    inhibitionDirection:"increase",
    inhibitionLabel:"TPMT loss-of-function: less methylation, more cytotoxic 6-TGN",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"6-TGN toxic accumulation; CPIC: avoid or use drastically reduced dose with close CBC/TDM" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"increased 6-TGN exposure; reduce starting dose and monitor CBC/TDM" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"decrease", label:"possible low 6-TGN/high 6-MMP shunting; use metabolite monitoring when available" },
    }
  },
  {
    parent:"Mercaptopurine",
    metaboliteId:"6-thioguanine-nucleotides-6-tgn",
    metaboliteName:"6-Thioguanine nucleotides (6-TGN)",
    enzyme:"NUDT15",
    note:"NUDT15 loss-of-function does not simply raise parent mercaptopurine. It reduces cellular cleanup of cytotoxic thioguanine nucleotide triphosphates, increasing DNA-thioguanine burden and myelosuppression risk even with normal TPMT.",
    evidenceRefs:["ev_thiopurine_tpmt_nudt15_cpic2025"],
    inhibitionDirection:"increase",
    inhibitionLabel:"NUDT15 loss-of-function: cytotoxic thiopurine nucleotide intolerance",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"very high myelosuppression risk; CPIC: avoid or use drastically reduced dose" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"increased myelosuppression risk; reduce dose and monitor CBC" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Thioguanine",
    metaboliteId:"6-thioguanine-nucleotides-6-tgn",
    metaboliteName:"6-Thioguanine nucleotides (6-TGN)",
    enzyme:"NUDT15",
    note:"Thioguanine enters the active 6-TGN pathway more directly than mercaptopurine. NUDT15 poor/intermediate function increases sensitivity to DNA-thioguanine and severe myelosuppression; TPMT still contributes to methylated metabolite balance.",
    evidenceRefs:["ev_thiopurine_tpmt_nudt15_cpic2025"],
    inhibitionDirection:"increase",
    inhibitionLabel:"NUDT15 loss-of-function: direct thioguanine nucleotide toxicity risk",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"very high DNA-thioguanine/myelosuppression risk; avoid or drastically reduce with specialist monitoring" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"higher myelosuppression risk; reduce dose and monitor CBC closely" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Dapsone",
    metaboliteId:"dapsone-hydroxylamine-dds-nhoh",
    metaboliteName:"Dapsone hydroxylamine (DDS-NHOH)",
    enzyme:"G6PD",
    note:"Dapsone hydroxylamine is the hematotoxic metabolite. G6PD deficiency reduces red-cell oxidative-stress reserve, so the same hydroxylamine burden can produce more methemoglobinemia or hemolysis. CYP2C9/CYP3A4 formation and dose still matter.",
    evidenceRefs:["ev_dapsone_ddsnhoh_metabolite","ev_rasburicase_g6pd_cpic2014"],
    inhibitionDirection:"increase",
    inhibitionLabel:"G6PD deficiency: less erythrocyte protection against hydroxylamine oxidant stress",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"G6PD deficient: higher hemolysis/methemoglobinemia concern; avoid or use specialist monitoring depending on indication" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"partial deficiency/intermediate activity: elevated oxidant-risk context; check enzyme activity and monitor blood counts/methemoglobin" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline red-cell oxidative reserve" },
    }
  },
  {
    parent:"Tafenoquine",
    metaboliteId:"tafenoquine-oxidative-metabolites",
    metaboliteName:"Tafenoquine oxidative metabolites",
    enzyme:"G6PD",
    note:"Tafenoquine is an 8-aminoquinoline with prolonged oxidant exposure. G6PD deficiency is contraindicated because hemolysis can be delayed and hard to reverse after a long-half-life dose.",
    evidenceRefs:["ev_tafenoquine_g6pd_fda","ev_tafenoquine_relapse_lacerda2019"],
    inhibitionDirection:"increase",
    inhibitionLabel:"G6PD deficiency: inadequate red-cell defense against prolonged 8-aminoquinoline oxidant stress",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"contraindicated: G6PD deficiency/unknown status can cause delayed hemolysis; quantitative testing required before use" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate activity can be missed by qualitative screens; confirm quantitative G6PD activity before tafenoquine" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline, if quantitative G6PD activity is normal" },
    }
  },
  {
    parent:"Primaquine",
    metaboliteId:"primaquine-hydroxylamine-quinone-imine-metabolites",
    metaboliteName:"Primaquine hydroxylamine / quinone-imine metabolites",
    enzyme:"G6PD",
    note:"Primaquine hemolysis risk is driven by reactive oxidative metabolite families plus host red-cell antioxidant reserve. G6PD deficiency changes the safety frame even when the parent dose looks ordinary.",
    evidenceRefs:["ev_g6pd_oxidative_antimalarials","ev_primaquine_g6pd_safety_bastiaens2018","ev_tafenoquine_relapse_lacerda2019"],
    inhibitionDirection:"increase",
    inhibitionLabel:"G6PD deficiency: reactive oxidative metabolite hemolysis risk",
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"high hemolysis concern; use G6PD-guided regimen selection and monitoring" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate activity: dose/regimen-specific hemolysis risk; confirm quantitative activity when possible" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline red-cell oxidative reserve" },
    }
  },
  {
    parent:"Rasburicase",
    metaboliteId:"rasburicase-g6pd-oxidant-risk",
    metaboliteName:"Rasburicase oxidant hemolysis risk",
    enzyme:"G6PD",
    systemic:true,
    note:"Rasburicase generates hydrogen peroxide while oxidizing uric acid. G6PD deficiency removes key NADPH-dependent red-cell protection, making hemolysis and methemoglobinemia a contraindication-level risk.",
    evidenceRefs:["ev_rasburicase_g6pd_cpic2014"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"contraindicated: G6PD deficiency can cause acute hemolytic anemia/methemoglobinemia" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"possible deficiency/intermediate activity: verify enzyme activity before rasburicase when risk ancestry or history suggests" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline, if G6PD activity is normal" },
    }
  },
  {
    parent:"Methylene Blue",
    metaboliteId:"methylene-blue-g6pd-redox-risk",
    metaboliteName:"Methylene blue redox effect",
    enzyme:"G6PD",
    systemic:true,
    note:"Methylene blue requires NADPH-dependent reduction to work as a methemoglobinemia antidote. In G6PD deficiency it may fail and can worsen oxidative hemolysis; its MAO-A inhibition remains a separate serotonin-toxicity risk.",
    evidenceRefs:["ev_methylene_blue_maoi_fda"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"contraindicated/avoid: G6PD deficiency can cause hemolysis and poor antidote response" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"reduced activity context: avoid or use specialist toxicology guidance with alternatives" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline redox capacity" },
    }
  },
  {
    parent:"Simvastatin",
    metaboliteId:"simvastatin-acid-slco1b1-exposure",
    metaboliteName:"Simvastatin acid exposure",
    enzyme:"SLCO1B1",
    systemic:true,
    note:"Simvastatin acid depends on OATP1B1/SLCO1B1 hepatic uptake. Decreased-function SLCO1B1 phenotypes raise systemic statin-acid exposure and statin-associated muscle symptom risk, especially at higher doses or with interacting drugs.",
    evidenceRefs:["ev_statin_slco1b1_abcg2_cpic2022","ev_simvastatin_multigene_choi2016"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"decreased function: avoid high-dose simvastatin; prefer lower-risk statin/dose per CPIC and monitor muscle symptoms" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate function: higher simvastatin-acid exposure; use lower dose/intensity or alternative statin if risk stack is high" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"decrease", label:"higher uptake context; genotype does not remove ordinary statin monitoring needs" },
    }
  },
  {
    parent:"Atorvastatin",
    metaboliteId:"atorvastatin-slco1b1-exposure",
    metaboliteName:"Atorvastatin active acid exposure",
    enzyme:"SLCO1B1",
    systemic:true,
    note:"Atorvastatin exposure and muscle-symptom risk are partly transporter-driven. SLCO1B1 decreased function is less deterministic than for simvastatin but still clinically relevant in CPIC statin guidance.",
    evidenceRefs:["ev_statin_slco1b1_abcg2_cpic2022"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"decreased function: consider lower starting dose, alternate statin, and closer muscle-symptom review when dose/interactions are high" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate function: modestly higher exposure/SAMS signal; review dose, interacting drugs, and symptoms" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Rosuvastatin",
    metaboliteId:"rosuvastatin-slco1b1-exposure",
    metaboliteName:"Rosuvastatin transporter exposure",
    enzyme:"SLCO1B1",
    systemic:true,
    note:"Rosuvastatin is not meaningfully CYP3A-cleared; transporter uptake/efflux is the key exposure frame. SLCO1B1 decreased function can add to ABCG2 and inhibitor effects.",
    evidenceRefs:["ev_statin_slco1b1_abcg2_cpic2022","ev_rosuvastatin_label"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"decreased OATP1B1 function: higher rosuvastatin exposure signal; use dose/intensity caution with myopathy risk factors" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate OATP1B1 function: modest exposure signal; check dose, renal function, and transporter inhibitors" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Digoxin",
    metaboliteId:"digoxin-abcb1-efflux",
    metaboliteName:"Digoxin P-gp efflux",
    enzyme:"ABCB1",
    systemic:true,
    note:"Digoxin is a narrow-therapeutic-index P-gp substrate. ABCB1 genotype associations are inconsistent, so MedCheck treats reduced P-gp function as a conservative exposure-monitoring context rather than a fixed dose rule.",
    evidenceRefs:["ev_abcb1_pgp_variant_summary","ev_digoxin_pgp_koren1998"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"reduced P-gp context: possible higher digoxin exposure/tissue penetration; prioritize levels, renal function, and P-gp inhibitor review" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate P-gp context: modest exposure signal; monitor levels if dose/risk stack changes" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Dabigatran",
    metaboliteId:"dabigatran-abcb1-efflux",
    metaboliteName:"Dabigatran P-gp absorption/efflux",
    enzyme:"ABCB1",
    systemic:true,
    note:"Dabigatran etexilate is P-gp-sensitive at absorption and elimination interfaces. ABCB1 genotype is not a standalone prescribing rule, but reduced-efflux context should raise attention to renal function and P-gp inhibitors/inducers.",
    evidenceRefs:["ev_abcb1_pgp_variant_summary","ev_dabigatran_dronedarone_fda"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"reduced P-gp context: possible higher dabigatran exposure; review renal function, bleeding risk, and P-gp inhibitors" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate P-gp context: modest exposure signal; interaction and renal-function context dominate" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Rosuvastatin",
    metaboliteId:"rosuvastatin-abcg2-exposure",
    metaboliteName:"Rosuvastatin BCRP efflux exposure",
    enzyme:"ABCG2",
    systemic:true,
    note:"Rosuvastatin is a BCRP/ABCG2 substrate as well as an OATP1B1 substrate. Reduced ABCG2 function can raise rosuvastatin exposure and statin-associated muscle symptom risk, especially with high dose, renal impairment, or transporter inhibitors.",
    evidenceRefs:["ev_statin_slco1b1_abcg2_cpic2022","ev_rosuvastatin_label"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"reduced BCRP function: higher rosuvastatin exposure/SAMS signal; consider lower dose or alternate statin when risk stack is high" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate BCRP function: modest exposure signal; review dose, renal function, and BCRP/OATP inhibitors" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Sulfasalazine",
    metaboliteId:"sulfasalazine-abcg2-exposure",
    metaboliteName:"Sulfasalazine BCRP exposure",
    enzyme:"ABCG2",
    systemic:true,
    note:"Sulfasalazine is a BCRP/ABCG2 substrate with clinically visible transporter sensitivity. Reduced ABCG2 function can add to NAT2 slow-acetylator sulfapyridine toxicity context and ordinary renal/hepatic monitoring.",
    evidenceRefs:["ev_sulfasalazine_abcg2_probe_adkison2010","ev_sulfasalazine_tpmt_inhibition"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"reduced BCRP function: possible higher sulfasalazine/sulfapyridine exposure; monitor GI, rash, blood counts, and hemolysis risk stack" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate BCRP function: modest exposure signal; NAT2 and dose often dominate tolerability" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Pravastatin",
    metaboliteId:"pravastatin-slco1b1-exposure",
    metaboliteName:"Pravastatin OATP1B1 uptake exposure",
    enzyme:"SLCO1B1",
    systemic:true,
    note:"Pravastatin has low CYP burden, so transporter uptake becomes a main exposure axis. SLCO1B1 decreased function can raise systemic pravastatin exposure, although CPIC actionability is generally lower than for simvastatin.",
    evidenceRefs:["ev_statin_slco1b1_abcg2_cpic2022","ev_statin_gemfibrozil_schneck2004"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"decreased OATP1B1 function: higher pravastatin exposure possible; review dose and muscle symptoms when risk factors stack" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate uptake: modest exposure signal; monitor clinically" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Pitavastatin",
    metaboliteId:"pitavastatin-slco1b1-exposure",
    metaboliteName:"Pitavastatin OATP1B1 uptake exposure",
    enzyme:"SLCO1B1",
    systemic:true,
    note:"Pitavastatin is transporter-sensitive with little CYP3A metabolism. SLCO1B1 decreased function can raise exposure and muscle-symptom concern, especially with higher dose or OATP inhibitors.",
    evidenceRefs:["ev_statin_slco1b1_abcg2_cpic2022"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"decreased OATP1B1 function: higher pitavastatin exposure possible; consider lower dose/monitoring if risk stack is high" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate uptake: modest exposure signal; monitor muscle symptoms and interacting drugs" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Loperamide",
    metaboliteId:"loperamide-abcb1-bbb-efflux",
    metaboliteName:"Loperamide P-gp blood-brain-barrier efflux",
    enzyme:"ABCB1",
    systemic:true,
    note:"Loperamide is normally kept out of the CNS by P-gp at the blood-brain barrier. Reduced P-gp context is not a dose rule, but it should increase concern when high-dose misuse or P-gp/CYP3A inhibitors are present.",
    evidenceRefs:["ev_abcb1_pgp_variant_summary","ev_loperamide_pgp_inhibitor_cns"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"reduced P-gp context: higher CNS penetration concern if dose is high or P-gp/CYP3A inhibitors are present" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate P-gp context: modest CNS-exposure signal; inhibitor/dose context dominates" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline BBB efflux context" },
    }
  },
  {
    parent:"Apixaban",
    metaboliteId:"apixaban-abcb1-efflux",
    metaboliteName:"Apixaban P-gp efflux exposure",
    enzyme:"ABCB1",
    systemic:true,
    note:"Apixaban is a P-gp substrate with CYP3A contribution. ABCB1 genotype alone is not a prescribing rule, but reduced-efflux context can add to renal function, age, bleeding risk, and P-gp/CYP3A inhibitors.",
    evidenceRefs:["ev_abcb1_pgp_variant_summary","ev_doac_rifampin_label"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"reduced P-gp context: possible higher apixaban exposure; review bleeding risk and P-gp/CYP3A inhibitor stack" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate P-gp context: modest exposure signal; interaction and renal/age criteria dominate" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Rivaroxaban",
    metaboliteId:"rivaroxaban-abcb1-efflux",
    metaboliteName:"Rivaroxaban P-gp efflux exposure",
    enzyme:"ABCB1",
    systemic:true,
    note:"Rivaroxaban is a P-gp/BCRP substrate with CYP3A contribution and dose-dependent food absorption. ABCB1 reduced-efflux context should be interpreted with renal function, dose with food, and interacting inhibitors/inducers.",
    evidenceRefs:["ev_abcb1_pgp_variant_summary","ev_doac_rifampin_label"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"reduced P-gp context: possible higher rivaroxaban exposure; review renal function, bleeding risk, and inhibitor stack" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate P-gp context: modest exposure signal; food/renal/interaction context dominates" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Edoxaban",
    metaboliteId:"edoxaban-abcb1-efflux",
    metaboliteName:"Edoxaban P-gp efflux exposure",
    enzyme:"ABCB1",
    systemic:true,
    note:"Edoxaban exposure is P-gp-sensitive with substantial renal clearance. ABCB1 reduced-efflux context is a monitoring flag that should be read beside renal function and label-defined P-gp inhibitor dose adjustments.",
    evidenceRefs:["ev_abcb1_pgp_variant_summary","ev_edoxaban_p_gp_fda"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"reduced P-gp context: possible higher edoxaban exposure; check renal function and P-gp inhibitor dose rules" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate P-gp context: modest exposure signal; renal function and inhibitors dominate" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Acetaminophen",
    metaboliteId:"napqi",
    metaboliteName:"NAPQI detoxification reserve",
    enzyme:"GSTM1",
    systemic:true,
    note:"Acetaminophen hepatotoxicity is driven by NAPQI formation and glutathione detoxification capacity. GSTM1 null status is a detoxification-risk context, not an ordinary acetaminophen contraindication and not a substitute for dose/alcohol/liver-disease assessment.",
    evidenceRefs:["ev_gstm1_null_detox_context","ev_apap_alcohol_riordan2002"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"GSTM1 null/reduced detox context: lower reserve for electrophilic intermediates; avoid overdose/risk stacking and review alcohol/CYP2E1 induction" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"possible reduced detox reserve; keep dose, alcohol, fasting, and liver disease context prominent" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Isoniazid",
    metaboliteId:"isoniazid-gstm1-detox",
    metaboliteName:"Anti-tuberculosis hepatotoxicity detox context",
    enzyme:"GSTM1",
    systemic:true,
    note:"GSTM1 null status has been associated with anti-tuberculosis drug-induced hepatotoxicity in meta-analytic literature. Treat this as a monitoring flag alongside NAT2, liver disease, alcohol, age, and regimen composition.",
    evidenceRefs:["ev_gstm1_null_detox_context","ev_nat2_isoniazid_consensus"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"GSTM1 null: hepatotoxicity monitoring flag during isoniazid-containing therapy; not a standalone avoidance rule" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"possible reduced detox reserve; monitor LFTs and symptoms in high-risk regimens" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
    }
  },
  {
    parent:"Peginterferon Alfa",
    metaboliteId:"ifnl3-interferon-response",
    metaboliteName:"Interferon response likelihood",
    enzyme:"IFNL3",
    systemic:true,
    note:"IFNL3/IL28B genotype is an efficacy-response marker for peginterferon/ribavirin-era HCV regimens. It does not change peginterferon exposure; modern DAA regimens usually make this less clinically central.",
    evidenceRefs:["ev_ifnl3_hcv_interferon_cpic2014"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"unfavorable IFNL3 context: lower likelihood of virologic response to interferon-based therapy" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"decrease", label:"intermediate response context; regimen, viral genotype, fibrosis, and prior treatment dominate" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"favorable/reference response context" },
    }
  },
  {
    parent:"Ribavirin",
    metaboliteId:"ifnl3-ribavirin-regimen-response",
    metaboliteName:"Peginterferon/ribavirin response context",
    enzyme:"IFNL3",
    systemic:true,
    note:"When ribavirin is part of a peginterferon-based HCV regimen, IFNL3 can help contextualize response probability. This is not a ribavirin clearance or hemolytic-anemia rule.",
    evidenceRefs:["ev_ifnl3_hcv_interferon_cpic2014"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"unfavorable IFNL3 context: reduced interferon/ribavirin response probability" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"decrease", label:"intermediate response context; modern DAA alternatives usually matter more" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"favorable/reference response context" },
    }
  },
  {
    parent:"Peginterferon Alfa",
    metaboliteId:"ifnl4-interferon-response",
    metaboliteName:"IFNL4 interferon-response context",
    enzyme:"IFNL4",
    systemic:true,
    note:"IFNL4-generating variants are unfavorable response context for spontaneous and interferon-based HCV clearance. Treat this as response biology, not PK.",
    evidenceRefs:["ev_ifnl3_hcv_interferon_cpic2014"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"IFNL4-generating/unfavorable context: lower interferon-response probability" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"decrease", label:"intermediate IFNL4 response context" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"reference/favorable response context" },
    }
  },
  {
    parent:"Morphine",
    metaboliteId:"oprm1-morphine-response",
    metaboliteName:"Mu-opioid receptor response context",
    enzyme:"OPRM1",
    systemic:true,
    note:"OPRM1 is pharmacodynamic: it may alter analgesic response or opioid sensitivity, but CPIC does not recommend morphine dosing changes based on OPRM1 alone. Read beside UGT2B7, renal function, tolerance, and co-sedatives.",
    evidenceRefs:["ev_opioid_cyp2d6_cpic_2020","ev_opioid_ugt2b7_glucuronidation_review"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"reduced receptor-response context; do not increase dose from genotype alone" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"intermediate receptor-response context; monitor analgesia and sedation clinically" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline response context" },
    }
  },
  {
    parent:"Fentanyl",
    metaboliteId:"oprm1-fentanyl-response",
    metaboliteName:"Mu-opioid receptor response context",
    enzyme:"OPRM1",
    systemic:true,
    note:"Fentanyl effect is pharmacodynamic at OPRM1 while exposure is mainly CYP3A4-sensitive. OPRM1 can be shown as a response-context flag, but inhibitor/inducer and respiratory-depression context are more actionable.",
    evidenceRefs:["ev_opioid_cyp2d6_cpic_2020"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"possible reduced analgesic response; no CPIC dose recommendation from OPRM1 alone" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"intermediate response context; co-sedatives and CYP3A4 interactions dominate" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline response context" },
    }
  },
  {
    parent:"Oxycodone",
    metaboliteId:"oprm1-oxycodone-response",
    metaboliteName:"Mu-opioid receptor response context",
    enzyme:"OPRM1",
    systemic:true,
    note:"Oxycodone response reflects parent drug, CYP3A noroxycodone formation, minor CYP2D6 oxymorphone formation, receptor sensitivity, and tolerance. OPRM1 is a low-actionability response flag, not an exposure rule.",
    evidenceRefs:["ev_opioid_cyp2d6_cpic_2020"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"possible reduced opioid response; CPIC does not recommend OPRM1-guided dosing" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"intermediate receptor-response context; interpret with CYP2D6/CYP3A and clinical response" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline response context" },
    }
  },
  {
    parent:"Methadone",
    metaboliteId:"oprm1-methadone-response",
    metaboliteName:"Mu-opioid receptor response context",
    enzyme:"OPRM1",
    systemic:true,
    note:"Methadone safety is dominated by QT risk, accumulation, CYP2B6/CYP3A interactions, and dose titration. OPRM1 can contextualize response, but it is not a dosing rule.",
    evidenceRefs:["ev_opioid_cyp2d6_cpic_2020"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"possible reduced response context; do not override QT/accumulation monitoring" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"intermediate response context; titration and ECG/interaction review dominate" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline response context" },
    }
  },
  {
    parent:"Sertraline",
    metaboliteId:"slc6a4-ssri-response",
    metaboliteName:"SERT response/tolerability context",
    enzyme:"SLC6A4",
    systemic:true,
    note:"SLC6A4/5-HTTLPR is a pharmacodynamic response/tolerability marker for serotonin reuptake inhibitors. It should be read beside CYP exposure, diagnosis, prior response, activation/anxiety, and adherence rather than used as a standalone dose rule.",
    evidenceRefs:["ev_ssri_snri_cpic_2023_slc6a4_htr2a"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"reduced-transporter-expression context; lower SSRI response or tolerability signal possible" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"intermediate response context; monitor early activation, GI effects, sleep, and symptom trajectory" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"reference response context" },
    }
  },
  {
    parent:"Escitalopram",
    metaboliteId:"htr2a-escitalopram-response",
    metaboliteName:"5-HT2A response/tolerability context",
    enzyme:"HTR2A",
    systemic:true,
    note:"HTR2A is included in CPIC's serotonin reuptake inhibitor guideline as response/tolerability context. CYP2C19 exposure, QT context, prior SSRI response, and adverse effects remain more directly actionable.",
    evidenceRefs:["ev_ssri_snri_cpic_2023_slc6a4_htr2a"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"uncertain", label:"HTR2A response/tolerability context; consider closer follow-up rather than genotype-only dose change" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"intermediate response context" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"reference response context" },
    }
  },
  {
    parent:"Fluoxetine",
    metaboliteId:"slc6a4-fluoxetine-response",
    metaboliteName:"SERT response/tolerability context",
    enzyme:"SLC6A4",
    systemic:true,
    note:"Fluoxetine has long parent/metabolite half-lives and CYP interaction complexity. SLC6A4 can add response/tolerability context but should not be treated as a clearance or dose rule.",
    evidenceRefs:["ev_ssri_snri_cpic_2023_slc6a4_htr2a","ev_fluoxetine_cyp2d6_fda"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"reduced SERT expression/response context; monitor response and activation/tolerability" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"intermediate SERT response context" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"reference response context" },
    }
  },
  {
    parent:"Venlafaxine",
    metaboliteId:"htr2a-venlafaxine-response",
    metaboliteName:"5-HT2A response/tolerability context",
    enzyme:"HTR2A",
    systemic:true,
    note:"Venlafaxine response is shaped by CYP2D6 conversion to O-desmethylvenlafaxine plus serotonergic/noradrenergic tolerability. HTR2A is a response-context flag, not a dose rule.",
    evidenceRefs:["ev_ssri_snri_cpic_2023_slc6a4_htr2a"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"uncertain", label:"HTR2A response/tolerability context; monitor BP, activation, sleep, and symptom response" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"intermediate response context" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"reference response context" },
    }
  },
  {
    parent:"Olanzapine",
    metaboliteId:"htr2c-olanzapine-metabolic-risk",
    metaboliteName:"Antipsychotic metabolic tolerability context",
    enzyme:"HTR2C",
    systemic:true,
    note:"HTR2C variation has been studied as a weight/metabolic susceptibility marker for antipsychotics. Use this as a baseline-risk and monitoring prompt; olanzapine metabolic risk is already high independent of genotype.",
    evidenceRefs:["ev_antipsychotic_receptor_pgx_context"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"higher metabolic/weight-gain susceptibility context; strengthen baseline weight/A1c/lipid monitoring" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate metabolic susceptibility context" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline tolerability context" },
    }
  },
  {
    parent:"Risperidone",
    metaboliteId:"drd2-risperidone-response",
    metaboliteName:"D2 response/prolactin/EPS context",
    enzyme:"DRD2",
    systemic:true,
    note:"DRD2 variation is a dopamine-receptor response/adverse-effect context for antipsychotics. Interpret with CYP2D6 active-moiety exposure, dose, EPS/prolactin history, and clinical response.",
    evidenceRefs:["ev_antipsychotic_receptor_pgx_context","ev_antipsychotic_cyp2d6_labels"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"higher D2 adverse-effect/response context possible; monitor EPS/prolactin and response" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"intermediate D2 response context" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline receptor-response context" },
    }
  },
  {
    parent:"Clozapine",
    metaboliteId:"htr2c-clozapine-metabolic-risk",
    metaboliteName:"Antipsychotic metabolic tolerability context",
    enzyme:"HTR2C",
    systemic:true,
    note:"Clozapine metabolic risk is clinically important and not solved by a single genotype. HTR2C can add susceptibility context, while ANC monitoring, smoking/CYP1A2, constipation, myocarditis, seizures, and TDM remain central.",
    evidenceRefs:["ev_antipsychotic_receptor_pgx_context"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"higher metabolic/weight-gain susceptibility context; do not weaken standard clozapine monitoring" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate metabolic susceptibility context" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline tolerability context" },
    }
  },
  {
    parent:"Nitroglycerin",
    metaboliteId:"aldh2-nitroglycerin-bioactivation",
    metaboliteName:"Nitroglycerin bioactivation response",
    enzyme:"ALDH2",
    systemic:true,
    note:"ALDH2 contributes to nitroglycerin bioactivation. Reduced ALDH2 function can blunt vasodilatory response, but acute angina treatment still depends on symptoms, blood pressure, nitrate tolerance, PDE5/sGC contraindications, and urgent-care context.",
    evidenceRefs:["ev_aldh2_nitroglycerin_human_2005","ev_aldh2_nitroglycerin_variant_2020"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"ALDH2 deficient/reduced: nitroglycerin response may be blunted; do not ignore persistent chest pain" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"decrease", label:"intermediate ALDH2 context: possible reduced nitrate response" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline nitrate bioactivation context" },
    }
  },
  {
    parent:"Metronidazole",
    metaboliteId:"aldh2-alcohol-reaction-context",
    metaboliteName:"Alcohol/aldehyde intolerance context",
    enzyme:"ALDH2",
    systemic:true,
    note:"Reduced ALDH2 function increases acetaldehyde intolerance biology. For metronidazole, alcohol avoidance is label/clinical advice regardless of genotype; ALDH2 adds context for why reactions may be more pronounced in some patients.",
    evidenceRefs:["ev_aldh2_alcohol_intolerance_context"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"ALDH2 deficient/reduced: higher acetaldehyde intolerance context; avoid alcohol per medication advice" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate ALDH2 context: alcohol reaction susceptibility may be higher" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline aldehyde detox context" },
    }
  },
  {
    parent:"Metformin",
    metaboliteId:"slc22a1-metformin-hepatic-uptake",
    metaboliteName:"Metformin hepatic OCT1 uptake",
    enzyme:"SLC22A1",
    systemic:true,
    note:"OCT1/SLC22A1 helps move metformin into hepatocytes, a relevant site for glucose-lowering action. Reduced OCT1 function may lower response or alter intolerance, but eGFR, dose, adherence, GI effects, and interacting transport inhibitors dominate safety decisions.",
    evidenceRefs:["ev_metformin_transporter_pgx_review"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"reduced OCT1 hepatic uptake context; metformin response may be lower or intolerance higher" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"intermediate OCT1 context; monitor A1c response and GI tolerability" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline OCT1 uptake context" },
    }
  },
  {
    parent:"Metformin",
    metaboliteId:"slc22a2-metformin-renal-transport",
    metaboliteName:"Metformin renal OCT2 transport",
    enzyme:"SLC22A2",
    systemic:true,
    note:"OCT2/SLC22A2 contributes to renal cation transport. Reduced OCT2 function or OCT2 inhibition can shift metformin handling; kidney function and MATE/OCT inhibitor stacking remain more actionable than genotype alone.",
    evidenceRefs:["ev_metformin_transporter_pgx_review","draft_metformin_oct2_giacomini2010_20190787"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"reduced OCT2 renal transport context; review eGFR, dose, and OCT2/MATE inhibitors" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate OCT2 context; monitor renal context and tolerability" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline OCT2 context" },
    }
  },
  {
    parent:"Metformin",
    metaboliteId:"slc47a1-metformin-efflux",
    metaboliteName:"Metformin MATE1 efflux",
    enzyme:"SLC47A1",
    systemic:true,
    note:"MATE1/SLC47A1 contributes to metformin efflux in kidney/liver transport. Reduced MATE1 function or inhibitor stacking can raise concern for intolerance/exposure in the wrong renal context, but genotype is not a standalone dose rule.",
    evidenceRefs:["ev_metformin_transporter_pgx_review"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"reduced MATE1 efflux context; review eGFR and MATE/OCT inhibitor stack" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate MATE1 context; monitor tolerability and renal context" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline MATE1 efflux context" },
    }
  },
  {
    parent:"Dolutegravir",
    metaboliteId:"dolutegravir-slc22a2-slc47a1-metformin-context",
    metaboliteName:"OCT2/MATE metformin-creatinine context",
    enzyme:"SLC22A2",
    systemic:true,
    note:"Dolutegravir inhibits OCT2/MATE transporters and can raise serum creatinine without true GFR decline; it can also increase metformin exposure. SLC22A2 reduced-function context is a modifier, while label dose limits and renal function remain central.",
    evidenceRefs:["ev_metformin_transporter_pgx_review","ev_dolutegravir_metformin_oct2_2016"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"reduced OCT2 context plus dolutegravir transporter inhibition: review metformin dose/tolerability and creatinine interpretation" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate OCT2 context; monitor metformin tolerability and creatinine trend" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline OCT2 context" },
    }
  },
  {
    parent:"Trimethoprim/Sulfamethoxazole",
    metaboliteId:"tmp-smx-slc22a2-renal-cation-context",
    metaboliteName:"OCT2 renal cation transport context",
    enzyme:"SLC22A2",
    systemic:true,
    note:"Trimethoprim inhibits OCT2 and can raise creatinine by reducing tubular secretion. SLC22A2 reduced-function context can make renal-cation transport interpretation more nuanced, especially with metformin, CKD, or hyperkalemia risk.",
    evidenceRefs:["ev_tmp_smx_label","ev_metformin_transporter_pgx_review"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"reduced OCT2 context: creatinine/metformin/hyperkalemia review has higher priority" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate OCT2 context; review renal and potassium monitoring" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline OCT2 context" },
    }
  },
  {
    parent:"Cisplatin",
    metaboliteId:"cisplatin-gstp1-platinum-detox",
    metaboliteName:"Platinum detoxification/toxicity context",
    enzyme:"GSTP1",
    systemic:true,
    note:"GSTP1 rs1695/reduced activity has platinum-toxicity signals, especially hematologic/neutropenia patterns in meta-analysis, but evidence is not a CPIC dosing rule. Treat this as an oncology review flag beside renal function, hydration, audiology, cumulative dose, and regimen.",
    evidenceRefs:["ev_gstp1_platinum_toxicity_meta"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"reduced GSTP1 context: higher platinum toxicity review priority; not a standalone dose change" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate GSTP1 context: monitor toxicity stack and regimen factors" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline GSTP1 context" },
    }
  },
  {
    parent:"Carboplatin",
    metaboliteId:"carboplatin-gstp1-platinum-detox",
    metaboliteName:"Platinum detoxification/toxicity context",
    enzyme:"GSTP1",
    systemic:true,
    note:"Carboplatin toxicity is usually driven by renal dosing, marrow reserve, and regimen, but GSTP1 can be shown as a platinum-detoxification review context.",
    evidenceRefs:["ev_gstp1_platinum_toxicity_meta"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"reduced GSTP1 context: review marrow toxicity risk with Calvert dosing and prior therapy" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate GSTP1 context: toxicity-monitoring flag" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline GSTP1 context" },
    }
  },
  {
    parent:"Oxaliplatin",
    metaboliteId:"oxaliplatin-gstp1-platinum-detox",
    metaboliteName:"Platinum detoxification/neurotoxicity context",
    enzyme:"GSTP1",
    systemic:true,
    note:"Oxaliplatin neurotoxicity and myelosuppression are regimen- and cumulative-dose dependent. GSTP1 is useful as a context flag because platinum toxicity associations are reported, but it is not a formal dose rule.",
    evidenceRefs:["ev_gstp1_platinum_toxicity_meta"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"reduced GSTP1 context: prioritize neuropathy and marrow monitoring" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate GSTP1 context: review cumulative neuropathy risk" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline GSTP1 context" },
    }
  },
  {
    parent:"Cisplatin",
    metaboliteId:"cisplatin-gstt1-null-context",
    metaboliteName:"GSTT1 null platinum context",
    enzyme:"GSTT1",
    systemic:true,
    note:"GSTT1 null status appears in platinum toxicity/outcome literature, but findings are inconsistent. Use as a lower-confidence toxicity context, especially when paired with GSTM1/GSTP1 or strong clinical risk factors.",
    evidenceRefs:["ev_gstp1_platinum_toxicity_meta","ev_phase2_anticancer_gst_review"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"GSTT1 null: lower-confidence platinum toxicity review flag" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"possible reduced GSTT1 context; evidence inconsistent" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline GSTT1-present context" },
    }
  },
  {
    parent:"Busulfan",
    metaboliteId:"busulfan-gst-conditioning-clearance",
    metaboliteName:"Busulfan glutathione clearance context",
    enzyme:"GSTM1",
    systemic:true,
    note:"Busulfan is a narrow-index conditioning drug where GST variation can affect clearance/toxicity signals. This card is a genotype context reminder, not a replacement for protocol dosing and therapeutic drug monitoring.",
    evidenceRefs:["ev_busulfan_gst_meta"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"GSTM1 null/reduced GST context: busulfan TDM and VOD/toxicity monitoring are high priority" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"possible reduced GST context; keep TDM and hepatic risk central" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline GSTM1-present context" },
    }
  },
  {
    parent:"Busulfan",
    metaboliteId:"busulfan-gstt1-conditioning-context",
    metaboliteName:"GSTT1 conditioning detox context",
    enzyme:"GSTT1",
    systemic:true,
    note:"GSTT1 null is included as a conditioning-regimen detoxification context. Busulfan AUC monitoring and liver/VOD risk assessment remain much more actionable than genotype alone.",
    evidenceRefs:["ev_busulfan_gst_meta"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"GSTT1 null: conditioning toxicity review flag; do not bypass TDM" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"possible intermediate GSTT1 context" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline GSTT1-present context" },
    }
  },
  {
    parent:"Melphalan",
    metaboliteId:"melphalan-gstp1-detox-context",
    metaboliteName:"Alkylator detoxification context",
    enzyme:"GSTP1",
    systemic:true,
    note:"Melphalan is included as a lower-confidence GSTP1/GST detoxification context for oncology review. Evidence is not strong enough for a dose rule; marrow reserve, renal function, mucositis, and protocol dominate.",
    evidenceRefs:["ev_phase2_anticancer_gst_review"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"reduced GSTP1 context: toxicity-monitoring flag for alkylator regimens" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"intermediate GSTP1 context; evidence is lower confidence" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline GSTP1 context" },
    }
  },
  {
    parent:"Thiotepa",
    metaboliteId:"thiotepa-gstp1-detox-context",
    metaboliteName:"Alkylator detoxification context",
    enzyme:"GSTP1",
    systemic:true,
    note:"Thiotepa metabolism is primarily CYP3A4/CYP2B6 to TEPA, but GSTP1/GST context can be useful as a conservative detoxification review flag in conditioning regimens.",
    evidenceRefs:["ev_phase2_anticancer_gst_review"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"reduced GSTP1 context: review conditioning toxicity stack" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"intermediate GSTP1 context; CYP3A/CYP2B6 and protocol dominate" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline GSTP1 context" },
    }
  },
  {
    parent:"Chlorambucil",
    metaboliteId:"chlorambucil-gstp1-detox-context",
    metaboliteName:"Alkylator detoxification context",
    enzyme:"GSTP1",
    systemic:true,
    note:"Chlorambucil is shown as a broad alkylator detoxification context only. It should not trigger genotype-based dose changes without human oncology review.",
    evidenceRefs:["ev_phase2_anticancer_gst_review"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"reduced GSTP1 context: marrow/toxicity review flag" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"intermediate GSTP1 context; lower-confidence evidence" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline GSTP1 context" },
    }
  },
  {
    parent:"Aminosalicylic Acid",
    metaboliteId:"aminosalicylic-acid-nat1-acetylation",
    metaboliteName:"NAT1 acetylated PAS metabolite context",
    enzyme:"NAT1",
    systemic:true,
    note:"PAS/aminosalicylic acid is a classic NAT1-selective acetylation context. This is useful for PGx completeness and medication-list review, but TB regimen decisions remain specialist/protocol driven.",
    evidenceRefs:["ev_nat1_arylamine_review","ev_nat1_paba_pas_polymorphism"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"reduced NAT1 context: possible higher parent PAS exposure/tolerability review" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"increase", label:"intermediate NAT1 context; monitor GI/hepatic tolerability in regimen context" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline NAT1 acetylation context" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"decrease", label:"higher NAT1 context: faster acetylation possible; clinical actionability limited" },
    }
  },
  {
    parent:"PABA",
    metaboliteId:"paba-nat1-acetylation",
    metaboliteName:"N-acetyl-PABA context",
    enzyme:"NAT1",
    systemic:true,
    note:"PABA is included mostly as a NAT1 probe/substrate and supplement/dermatology actor. This helps explain arylamine/sulfonamide context without implying a medication dose rule.",
    evidenceRefs:["ev_nat1_arylamine_review","ev_nat1_paba_pas_polymorphism"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"reduced NAT1 context: slower PABA acetylation possible" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"intermediate NAT1 context; usually low clinical actionability" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline NAT1 context" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"decrease", label:"higher NAT1 context: faster acetylation possible" },
    }
  },
  {
    parent:"Trimethoprim/Sulfamethoxazole",
    metaboliteId:"sulfamethoxazole-nat1-arylamine-context",
    metaboliteName:"Sulfonamide arylamine acetylation context",
    enzyme:"NAT1",
    systemic:true,
    note:"Sulfamethoxazole toxicity is driven by multiple pathways: CYP/oxidative hydroxylamine formation, acetylation, renal function, folate/marrow effects, and immune history. NAT1 is shown only as weak arylamine context; allergy history and label warnings dominate.",
    evidenceRefs:["ev_nat1_smx_hypersensitivity_context","ev_tmp_smx_label"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"reduced NAT1 context: low-confidence sulfonamide hypersensitivity/toxicity review flag" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"intermediate NAT1 context; interpret with NAT2, renal, folate and allergy history" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline NAT1 context" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"uncertain", label:"higher NAT1 expression context; clinical direction is not dose-calibrated" },
    }
  },
  {
    parent:"Sulfadiazine",
    metaboliteId:"sulfadiazine-nat-arylamine-context",
    metaboliteName:"Sulfonamide acetylation context",
    enzyme:"NAT1",
    systemic:true,
    note:"Sulfadiazine is an older arylamine sulfonamide. NAT1/NAT2 context is weaker than renal function, hydration/crystalluria, rash history, and folate/marrow risk.",
    evidenceRefs:["ev_nat1_arylamine_review"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"reduced NAT1 context: review sulfonamide tolerance and renal/crystalluria risk" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"intermediate NAT1 context; low-confidence modifier" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline NAT1 context" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"uncertain", label:"higher NAT1 context; clinical actionability limited" },
    }
  },
  {
    parent:"Phenazopyridine",
    metaboliteId:"phenazopyridine-arylamine-safety-context",
    metaboliteName:"Azo/arylamine safety context",
    enzyme:"NAT1",
    systemic:true,
    note:"Phenazopyridine safety is mostly renal impairment, methemoglobinemia/hemolysis, duration, and symptom masking. NAT1 is included only as an arylamine context flag.",
    evidenceRefs:["ev_nat1_arylamine_review"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"reduced NAT1 context: low-confidence arylamine safety review flag" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"intermediate NAT1 context; renal/G6PD-like oxidant risk dominates" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline NAT1 context" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"uncertain", label:"higher NAT1 context; no dose rule" },
    }
  },
  {
    parent:"Amonafide",
    metaboliteId:"amonafide-nat-acetylation-context",
    metaboliteName:"NAT acetylation oncology research context",
    enzyme:"NAT1",
    systemic:true,
    note:"Amonafide is not a routine medication; it is included as a research oncology example where NAT acetylation can influence exposure/toxicity interpretation. NAT2 is likely more important than NAT1.",
    evidenceRefs:["ev_nat1_arylamine_review"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"reduced NAT1 context: research-only acetylation review flag" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"intermediate NAT1 context; NAT2 and oncology protocol dominate" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline NAT1 context" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"uncertain", label:"higher NAT1 context; no routine clinical action" },
    }
  },
  {
    parent:"Acetaminophen",
    metaboliteId:"napqi-cyp2e1-formation-context",
    metaboliteName:"NAPQI formation context",
    enzyme:"CYP2E1",
    systemic:true,
    note:"CYP2E1 forms the toxic acetaminophen metabolite NAPQI, but clinical risk is not a simple parent-drug exposure rule. Dose, chronic alcohol/withdrawal timing, fasting, liver disease, glutathione reserve, and GST detox context dominate.",
    evidenceRefs:["ev_apap_alcohol_riordan2002"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"low CYP2E1 context: possibly less NAPQI formation, but do not relax dose/alcohol/liver precautions" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"intermediate CYP2E1 context; risk depends on dose, alcohol, fasting, liver disease and GST reserve" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline CYP2E1/NAPQI context" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"increase", label:"higher/induced CYP2E1 context: more NAPQI formation possible; avoid risk stacking" },
    }
  },
  {
    parent:"Chlorzoxazone",
    metaboliteId:"6-hydroxychlorzoxazone",
    metaboliteName:"6-hydroxychlorzoxazone",
    enzyme:"CYP2E1",
    systemic:true,
    note:"Chlorzoxazone is useful as a CYP2E1 activity probe. In routine care, sedation and liver context matter more than genotype-guided dosing.",
    evidenceRefs:["ev_cyp2e1_chlorzoxazone_probe"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"low CYP2E1 context: lower 6-hydroxychlorzoxazone formation possible" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"decrease", label:"intermediate CYP2E1 activity context" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline CYP2E1 probe context" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"increase", label:"higher/induced CYP2E1 context: faster 6-hydroxylation possible" },
    }
  },
  {
    parent:"Halothane",
    metaboliteId:"halothane-trifluoroacetylated-intermediates",
    metaboliteName:"Reactive trifluoroacetylated intermediates",
    enzyme:"CYP2E1",
    systemic:true,
    note:"Halothane is a historical but high-yield CYP2E1 example: parent anesthetic metabolism can create reactive intermediates linked to immune-mediated hepatitis. This is anesthesia/toxicology context, not a patient-facing genotype dose rule.",
    evidenceRefs:["ev_cyp2e1_volatile_anesthetic_livertox"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"low CYP2E1 context: lower reactive-intermediate formation possible; anesthesia history still dominates" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"intermediate CYP2E1 context; historical exposure review" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline CYP2E1 volatile-anesthetic context" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"increase", label:"higher/induced CYP2E1 context: reactive-intermediate formation concern; use anesthesia review" },
    }
  },
  {
    parent:"Benzene",
    metaboliteId:"benzene-cyp2e1-reactive-metabolites",
    metaboliteName:"Reactive benzene metabolites",
    enzyme:"CYP2E1",
    systemic:true,
    note:"Benzene is included as an occupational/environmental toxicant to support null-impact reasoning. Exposure control dominates; genotype is only a susceptibility/context flag.",
    evidenceRefs:["ev_cyp2e1_chlorzoxazone_probe"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"decrease", label:"low CYP2E1 context: possibly less activation, but exposure avoidance remains essential" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"intermediate CYP2E1 toxicant context" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline toxicant context" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"increase", label:"higher/induced CYP2E1 context: toxicant activation concern" },
    }
  },
  {
    parent:"Etonogestrel",
    metaboliteId:"etonogestrel-cyp3a7-clearance-context",
    metaboliteName:"Etonogestrel CYP3A clearance context",
    enzyme:"CYP3A7",
    systemic:true,
    note:"Etonogestrel implant concentrations are mainly governed by release rate, time since insertion, BMI, CYP3A inducers, and formulation. CYP3A7*1C/persistent expression is a plausible lower-exposure review flag, but it is not a standalone contraceptive-failure rule.",
    evidenceRefs:["ev_cyp3a7_etonogestrel_implant_2019"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"baseline", label:"typical low adult CYP3A7 expression: no added CYP3A7 clearance flag" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"possible low CYP3A7 expression: weak etonogestrel review context" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline CYP3A7 context" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"decrease", label:"persistent CYP3A7 expression context: lower etonogestrel concentrations possible; review BMI, implant age, and CYP3A inducers" },
    }
  },
  {
    parent:"Estradiol",
    metaboliteId:"cyp3a7-steroid-hormone-context",
    metaboliteName:"CYP3A7 steroid hormone metabolism context",
    enzyme:"CYP3A7",
    systemic:true,
    note:"Persistent CYP3A7 expression is a steroid/endocrine metabolism signal, especially for DHEA-S and estrogen-metabolite patterns. For hormone therapy or contraception, formulation, route, indication, thrombosis risk, and CYP3A inducers are more actionable than CYP3A7 alone.",
    evidenceRefs:["ev_cyp3a7_1c_dheas_2005","ev_cyp3a7_neonatal_review_2019"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"baseline", label:"typical low adult CYP3A7 expression context" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"uncertain", label:"possible low-level CYP3A7 expression; endocrine context only" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline CYP3A7 steroid context" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"decrease", label:"persistent CYP3A7 expression: altered DHEA-S/estrogen metabolism context; not a dose rule" },
    }
  },
];
