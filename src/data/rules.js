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
  {
    parent:"Tacrolimus",
    metaboliteId:"tacrolimus-cyp3a5-exposure",
    metaboliteName:"Tacrolimus exposure / trough requirement",
    enzyme:"CYP3A5",
    systemic:true,
    note:"Tacrolimus is a narrow-therapeutic-index calcineurin inhibitor. CYP3A5 expressers clear tacrolimus faster and often need higher starting doses; non-expressers have higher concentration/dose at the same dose. Therapeutic drug monitoring remains mandatory.",
    evidenceRefs:["ev_tacrolimus_cyp3a5_cpic","ev_tacrolimus_cyp3a5_consensus"],
    effects:{
      [GENOTYPE_PHENOTYPE.PM]: { qualitative:true, direction:"increase", label:"CYP3A5 non-expresser: higher tacrolimus concentration/dose; standard starting dose is usually closer than expresser dosing, then TDM" },
      [GENOTYPE_PHENOTYPE.IM]: { qualitative:true, direction:"decrease", label:"CYP3A5 expresser/intermediate: lower troughs at standard dose; CPIC recommends 1.5-2x higher starting dose with TDM" },
      [GENOTYPE_PHENOTYPE.NM]: { fold:1.0, direction:"baseline", label:"baseline" },
      [GENOTYPE_PHENOTYPE.UM]: { qualitative:true, direction:"decrease", label:"high-expression context: higher dose pressure; use trough-guided dosing and interaction review" },
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
    evidenceRefs:["ev_tafenoquine_g6pd_fda"],
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
    evidenceRefs:["ev_g6pd_oxidative_antimalarials"],
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
    evidenceRefs:["ev_statin_slco1b1_abcg2_cpic2022"],
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
];
