// MedCheck Engine — Shared constants and enums
// Phase A: modular source — concatenated by build.js

const INH_MULT = { strong: 5.0, moderate: 2.0, weak: 1.25 };
const IND_MULT = { strong: 0.15, moderate: 0.4, weak: 0.7 };

// ── DOSE TIERS: clinical dose ranges for dose-dependent inhibition modeling ──
// inhMod: multiplier applied to inhibition strength at each dose tier
// low=subtherapeutic inhibition, standard=published Ki data, high=near-saturation, max=supratherapeutic
const ACTOR_TYPE = Object.freeze({
  DRUG:          'drug',
  METABOLITE:    'metabolite',
  ENZYME:        'enzyme',
  TRANSPORTER:   'transporter',
  FOOD:          'food_compound',
  ENVIRONMENTAL: 'environmental_compound',  // toxins, pollutants, xenobiotics
  ENDOGENOUS:    'endogenous_compound',      // neurotransmitters, hormones, trace amines
  RECEPTOR:      'receptor',                // pharmacological targets (mu-opioid, 5-HT2A, D2...)
  PHENOTYPE:     'phenotype',               // observable outcomes (analgesia, serotonin_syndrome...)
});

// ── Edge Types ── (all relationship types between actors)
const EDGE_TYPE = Object.freeze({
  SUBSTRATE_OF:    'substrate_of',     // actor is metabolized by enzyme/transporter
  INHIBITS:        'inhibits',         // actor inhibits enzyme/transporter/receptor
  INDUCES:         'induces',          // actor induces enzyme/transporter expression
  METABOLIZED_TO:  'metabolized_to',   // parent → metabolite (inactive/active)
  TRANSPORTED_BY:  'transported_by',   // actor is a substrate of a transporter
  COMPETES_WITH:   'competes_with',    // two actors compete for same enzymatic/receptor site
  ACTIVATES:       'activates',        // prodrug → active metabolite; agonist → receptor
  BLOCKS:          'blocks',           // antagonist blocks receptor; efflux pump blocks CNS entry
  ACCUMULATES_IN:  'accumulates_in',   // lipophilic actor accumulates in compartment
  PRODUCES:        'produces',         // metabolic step or receptor activation → downstream effect
  SUPPRESSES:      'suppresses',       // actor suppresses phenotype/function (e.g. CYP2D6 inhibition → ↓ analgesia)
});

// ── Tissue Compartments ──
// Conceptual compartments that distinguish where a drug/metabolite acts.
// Key insight: brain CYP2D6 ≠ hepatic CYP2D6; lipophilic compounds in
// adipose behave fundamentally differently from plasma compartment.
const TISSUE_COMPARTMENT = Object.freeze({
  PLASMA:   'plasma',    // systemic circulation (PK measurements)
  LIVER:    'liver',     // primary metabolic organ; hepatic CYPs
  BRAIN:    'brain',     // CNS; brain CYP2D6, BBB gating by P-gp/BCRP
  GUT:      'gut',       // intestinal CYP3A4/P-gp first-pass extraction
  KIDNEY:   'kidney',    // renal clearance; OCT2/MATE1 transporters
  ADIPOSE:  'adipose',   // lipophilic compound depot; slow release
  PLATELET: 'platelet',  // MAO-B location; serotonin storage
});

// ── Evidence Schema ──
// Canonical evidence object used by all edges.
// Older edges may have only {confidence, sources}; new/upgraded edges
// carry full provenance. Both forms are valid — consumers should use
// evidenceConfidence() helper to extract a normalized confidence value.
const EVIDENCE_SCHEMA_VERSION = 2;

const SOURCE_CATEGORY = Object.freeze({
  DIOGNOSIS_CURATED: 'diognosis_curated',
  OPEN_TARGETS_CONTEXT: 'open_targets_context',
  EXTERNAL_CONTEXT: 'external_context',
});

const REVIEW_DECISION = Object.freeze({
  UNREVIEWED: 'unreviewed',
  NEEDS_MORE_REVIEW: 'needs_more_review',
  REJECTED: 'rejected',
  PROMOTED_FOR_SEVERITY: 'promoted_for_severity',
});

const EVIDENCE_TIER = Object.freeze({
  IN_VITRO:     'in_vitro',       // cell/microsome assay only
  ANIMAL:       'animal',         // rodent/primate PK
  CASE_REPORT:  'case_report',    // individual patient observation
  OBSERVATIONAL:'observational',  // retrospective cohort/database
  REVIEW:       'review',         // narrative/non-quantitative synthesis
  CLINICAL_PK:  'clinical_pk',    // prospective clinical PK study (gold standard for DDI)
  RCT:          'rct',            // randomized controlled trial
  META_ANALYSIS:'meta_analysis',  // quantitative synthesis of multiple studies
  GUIDELINE:    'guideline',      // evidence-based clinical guideline (CPIC, EMA, etc.)
  FDA_LABEL:    'fda_label',      // FDA-approved prescribing information (regulatory)
});

// ── Evidence Tier Weights ──
// Used by computeEdgeConfidence() and traverseEffects() decay.
// FDA label is high but not 1.0 — it reflects regulatory consensus, not always RCT quality.
// Meta-analysis can exceed FDA label for quantified pharmacokinetics.
const EVIDENCE_WEIGHT = {
  [EVIDENCE_TIER.FDA_LABEL]:    0.95,
  [EVIDENCE_TIER.META_ANALYSIS]:0.92,
  [EVIDENCE_TIER.RCT]:          0.90,
  [EVIDENCE_TIER.GUIDELINE]:    0.88,
  [EVIDENCE_TIER.CLINICAL_PK]:  0.85,
  [EVIDENCE_TIER.OBSERVATIONAL]:0.70,
  [EVIDENCE_TIER.REVIEW]:       0.65,
  [EVIDENCE_TIER.CASE_REPORT]:  0.45,
  [EVIDENCE_TIER.ANIMAL]:       0.35,
  [EVIDENCE_TIER.IN_VITRO]:     0.30,
};

// ── GENOTYPE_PHENOTYPE — CYP metabolizer phenotype definitions ──
const GENOTYPE_PHENOTYPE = Object.freeze({
  PM: 'poor_metabolizer',
  IM: 'intermediate_metabolizer',
  NM: 'normal_metabolizer',
  UM: 'ultrarapid_metabolizer',
});

const GENOTYPE_RISK_STATUS = Object.freeze({
  ABSENT: 'risk_allele_absent',
  PRESENT: 'risk_allele_present',
});

const GENE_SEMANTIC_AXIS = Object.freeze({
  ACTIVITY_SCORE: 'activity_score',
  EXPRESSION: 'expression',
  COPY_NUMBER_NULL: 'copy_number_null',
  DEFICIENCY: 'deficiency',
  RISK_ALLELE: 'risk_allele',
  SENSITIVITY: 'sensitivity',
  RESPONSE: 'response',
  TRANSPORT: 'transport',
});

const GENE_SEMANTICS = {
  CYP2D6: {
    axis:GENE_SEMANTIC_AXIS.ACTIVITY_SCORE,
    nullMechanism:"inherited_no_function",
    nullStateLabel:"inherited no-function CYP2D6",
    phenotypeStateLabel:"inherited CYP2D6 activity phenotype",
    modelUseLabel:"poor-metabolizer exposure behavior",
    phenoconversion:true,
    legacyNull:true,
    nullExposureFold:20,
    compartments:["liver","gut","brain/CNS","cardiovascular"],
    optionLabels:{
      [GENOTYPE_PHENOTYPE.PM]:"PM",
      [GENOTYPE_PHENOTYPE.IM]:"IM",
      [GENOTYPE_PHENOTYPE.NM]:"NM",
      [GENOTYPE_PHENOTYPE.UM]:"UM",
    },
  },
  CYP3A5: {
    axis:GENE_SEMANTIC_AXIS.EXPRESSION,
    phenotypeStateLabel:"CYP3A5 expression phenotype",
    nullStateLabel:"CYP3A5 non-expresser",
    modelUseLabel:"CYP3A5 non-expresser exposure behavior",
    phenoconversion:false,
    compartments:["liver","gut","kidney","extrahepatic tissue"],
    optionLabels:{
      [GENOTYPE_PHENOTYPE.PM]:"Non-exp.",
      [GENOTYPE_PHENOTYPE.IM]:"Expr./IM",
      [GENOTYPE_PHENOTYPE.NM]:"Reference",
      [GENOTYPE_PHENOTYPE.UM]:"High expr.",
    },
  },
  GSTM1: {
    axis:GENE_SEMANTIC_AXIS.COPY_NUMBER_NULL,
    nullMechanism:"copy_number_null",
    nullStateLabel:"GSTM1 null/absent detoxification capacity",
    phenotypeStateLabel:"GSTM1 detoxification capacity",
    modelUseLabel:"reduced GSTM1 detoxification context",
    phenoconversion:false,
    legacyNull:false,
    compartments:["liver","blood/immune","gut","environmental detox"],
    optionLabels:{
      [GENOTYPE_PHENOTYPE.PM]:"Null",
      [GENOTYPE_PHENOTYPE.IM]:"Reduced",
      [GENOTYPE_PHENOTYPE.NM]:"Present",
    },
  },
  GSTT1: {
    axis:GENE_SEMANTIC_AXIS.COPY_NUMBER_NULL,
    nullMechanism:"copy_number_null",
    nullStateLabel:"GSTT1 null/absent detoxification capacity",
    phenotypeStateLabel:"GSTT1 detoxification capacity",
    modelUseLabel:"reduced GSTT1 detoxification context",
    phenoconversion:false,
    legacyNull:false,
    compartments:["liver","blood/immune","environmental detox"],
    optionLabels:{
      [GENOTYPE_PHENOTYPE.PM]:"Null",
      [GENOTYPE_PHENOTYPE.IM]:"Reduced",
      [GENOTYPE_PHENOTYPE.NM]:"Present",
    },
  },
  BCHE: {
    axis:GENE_SEMANTIC_AXIS.DEFICIENCY,
    nullMechanism:"inherited_deficiency",
    nullStateLabel:"BCHE deficiency / very low pseudocholinesterase activity",
    phenotypeStateLabel:"BCHE activity phenotype",
    modelUseLabel:"prolonged paralytic exposure/offset behavior",
    phenoconversion:false,
    legacyNull:true,
    compartments:["plasma","procedural/anesthesia"],
    optionLabels:{
      [GENOTYPE_PHENOTYPE.PM]:"Deficient",
      [GENOTYPE_PHENOTYPE.IM]:"Partial",
      [GENOTYPE_PHENOTYPE.NM]:"Normal",
    },
  },
  G6PD: {
    axis:GENE_SEMANTIC_AXIS.DEFICIENCY,
    nullMechanism:"erythrocyte_deficiency",
    nullStateLabel:"G6PD deficient red-cell oxidative reserve",
    phenotypeStateLabel:"G6PD red-cell oxidative reserve",
    modelUseLabel:"oxidative hemolysis susceptibility context",
    phenoconversion:false,
    compartments:["RBC","blood"],
  },
  SLCO1B1: {
    axis:GENE_SEMANTIC_AXIS.TRANSPORT,
    phenotypeStateLabel:"OATP1B1 hepatic uptake function",
    modelUseLabel:"transporter exposure behavior",
    phenoconversion:false,
    compartments:["liver","plasma"],
    optionLabels:{
      [GENOTYPE_PHENOTYPE.PM]:"Low uptake",
      [GENOTYPE_PHENOTYPE.IM]:"Reduced",
      [GENOTYPE_PHENOTYPE.NM]:"Normal",
      [GENOTYPE_PHENOTYPE.UM]:"Increased",
    },
  },
  ABCB1: {
    axis:GENE_SEMANTIC_AXIS.TRANSPORT,
    phenotypeStateLabel:"P-gp/ABCB1 efflux function",
    modelUseLabel:"transporter/tissue-penetration context",
    phenoconversion:false,
    compartments:["gut","kidney","brain/CNS","blood-brain barrier"],
    optionLabels:{
      [GENOTYPE_PHENOTYPE.PM]:"Low efflux",
      [GENOTYPE_PHENOTYPE.IM]:"Reduced",
      [GENOTYPE_PHENOTYPE.NM]:"Normal",
    },
  },
  ABCG2: {
    axis:GENE_SEMANTIC_AXIS.TRANSPORT,
    phenotypeStateLabel:"BCRP/ABCG2 efflux function",
    modelUseLabel:"transporter exposure context",
    phenoconversion:false,
    compartments:["gut","liver","kidney","blood-brain barrier"],
    optionLabels:{
      [GENOTYPE_PHENOTYPE.PM]:"Low efflux",
      [GENOTYPE_PHENOTYPE.IM]:"Reduced",
      [GENOTYPE_PHENOTYPE.NM]:"Normal",
    },
  },
  VKORC1: {
    axis:GENE_SEMANTIC_AXIS.SENSITIVITY,
    phenotypeStateLabel:"warfarin target sensitivity",
    modelUseLabel:"warfarin sensitivity behavior, not clearance",
    phenoconversion:false,
    compartments:["liver","coagulation"],
    optionLabels:{
      [GENOTYPE_PHENOTYPE.PM]:"Sensitive",
      [GENOTYPE_PHENOTYPE.IM]:"Intermediate",
      [GENOTYPE_PHENOTYPE.NM]:"Reference",
      [GENOTYPE_PHENOTYPE.UM]:"Resistant",
    },
  },
  OPRM1: { axis:GENE_SEMANTIC_AXIS.RESPONSE, phenotypeStateLabel:"opioid receptor response context", modelUseLabel:"response/tolerability context", phenoconversion:false, compartments:["brain/CNS"] },
  SLC6A4:{ axis:GENE_SEMANTIC_AXIS.RESPONSE, phenotypeStateLabel:"serotonin transporter response context", modelUseLabel:"response/tolerability context", phenoconversion:false, compartments:["brain/CNS"] },
  HTR2A: { axis:GENE_SEMANTIC_AXIS.RESPONSE, phenotypeStateLabel:"serotonin receptor response context", modelUseLabel:"response/tolerability context", phenoconversion:false, compartments:["brain/CNS"] },
  HTR2C: { axis:GENE_SEMANTIC_AXIS.RESPONSE, phenotypeStateLabel:"serotonin receptor metabolic-risk context", modelUseLabel:"tolerability context", phenoconversion:false, compartments:["brain/CNS","metabolic"] },
  DRD2:  { axis:GENE_SEMANTIC_AXIS.RESPONSE, phenotypeStateLabel:"dopamine receptor response context", modelUseLabel:"response/tolerability context", phenoconversion:false, compartments:["brain/CNS"] },
};

const ACTIVITY_PHENOTYPE_LABELS = {
  [GENOTYPE_PHENOTYPE.PM]:"poor metabolizer",
  [GENOTYPE_PHENOTYPE.IM]:"intermediate metabolizer",
  [GENOTYPE_PHENOTYPE.NM]:"normal metabolizer",
  [GENOTYPE_PHENOTYPE.UM]:"ultrarapid metabolizer",
};

const REDUCED_ACTIVITY_LABELS = {
  [GENOTYPE_PHENOTYPE.PM]:"very low activity",
  [GENOTYPE_PHENOTYPE.IM]:"reduced activity",
  [GENOTYPE_PHENOTYPE.NM]:"reference activity",
  [GENOTYPE_PHENOTYPE.UM]:"higher activity",
};

const SLOW_ACETYLATOR_LABELS = {
  [GENOTYPE_PHENOTYPE.PM]:"slow acetylator",
  [GENOTYPE_PHENOTYPE.IM]:"intermediate acetylator",
  [GENOTYPE_PHENOTYPE.NM]:"reference acetylator",
  [GENOTYPE_PHENOTYPE.UM]:"rapid acetylator",
};

const RESPONSE_PHENOTYPE_LABELS = {
  [GENOTYPE_PHENOTYPE.PM]:"reduced/unfavorable response context",
  [GENOTYPE_PHENOTYPE.IM]:"intermediate response context",
  [GENOTYPE_PHENOTYPE.NM]:"reference response context",
  [GENOTYPE_PHENOTYPE.UM]:"higher/alternate response context",
};

function addActivitySemantics(genes, options = {}) {
  for (const gene of genes) {
    GENE_SEMANTICS[gene] = {
      axis:GENE_SEMANTIC_AXIS.ACTIVITY_SCORE,
      phenotypeStateLabel:options.phenotypeStateLabel || `${gene} activity phenotype`,
      modelUseLabel:options.modelUseLabel || `${gene} exposure behavior`,
      phenoconversion:options.phenoconversion !== undefined ? options.phenoconversion : true,
      compartments:options.compartments || ["liver","systemic"],
      phenotypeLabels:options.phenotypeLabels || ACTIVITY_PHENOTYPE_LABELS,
      optionLabels:options.optionLabels,
    };
  }
}

addActivitySemantics(["CYP2C19","CYP2C9","CYP2B6","CYP3A4","CYP2C8","CYP2A6","CYP1A2"], {
  compartments:["liver","gut","systemic"],
});
addActivitySemantics(["CYP3A7"], {
  phenotypeStateLabel:"CYP3A7 adult expression/activity context",
  modelUseLabel:"CYP3A7 persistent-expression review context",
  phenoconversion:false,
  compartments:["liver","developmental"],
  phenotypeLabels:REDUCED_ACTIVITY_LABELS,
});
addActivitySemantics(["CYP2E1"], {
  phenotypeStateLabel:"CYP2E1 activity/environmental induction context",
  modelUseLabel:"reactive-metabolite risk-stack context",
  compartments:["liver","environmental toxicants"],
  phenotypeLabels:REDUCED_ACTIVITY_LABELS,
});
addActivitySemantics(["NAT1","NAT2"], {
  phenotypeStateLabel:"acetylator phenotype",
  modelUseLabel:"acetylation exposure/toxicity context",
  compartments:["liver","systemic"],
  phenotypeLabels:SLOW_ACETYLATOR_LABELS,
  optionLabels:{
    [GENOTYPE_PHENOTYPE.PM]:"Slow",
    [GENOTYPE_PHENOTYPE.IM]:"Inter.",
    [GENOTYPE_PHENOTYPE.NM]:"Ref.",
    [GENOTYPE_PHENOTYPE.UM]:"Rapid",
  },
});
addActivitySemantics(["UGT1A1","UGT1A4","UGT1A9","UGT2B7","UGT2B15","UGT2B17"], {
  phenotypeStateLabel:"UGT glucuronidation activity context",
  modelUseLabel:"glucuronidation exposure context",
  compartments:["liver","systemic"],
  phenotypeLabels:REDUCED_ACTIVITY_LABELS,
});
addActivitySemantics(["CYP4F2"], {
  phenotypeStateLabel:"vitamin K oxidation context",
  modelUseLabel:"warfarin dose-modifier context",
  phenoconversion:false,
  compartments:["liver","coagulation"],
  phenotypeLabels:REDUCED_ACTIVITY_LABELS,
});

Object.assign(GENE_SEMANTICS, {
  DPYD: {
    axis:GENE_SEMANTIC_AXIS.DEFICIENCY,
    nullMechanism:"inherited_deficiency",
    nullStateLabel:"DPYD severe deficiency / very low fluoropyrimidine catabolism",
    phenotypeStateLabel:"DPYD fluoropyrimidine catabolism capacity",
    modelUseLabel:"fluoropyrimidine toxicity-risk exposure behavior",
    phenoconversion:false,
    legacyNull:false,
    compartments:["liver","systemic"],
    phenotypeLabels:{
      [GENOTYPE_PHENOTYPE.PM]:"DPYD deficient / very low activity",
      [GENOTYPE_PHENOTYPE.IM]:"partial DPYD activity",
      [GENOTYPE_PHENOTYPE.NM]:"normal DPYD activity",
    },
  },
  TPMT: {
    axis:GENE_SEMANTIC_AXIS.DEFICIENCY,
    nullMechanism:"inherited_deficiency",
    nullStateLabel:"TPMT very low activity",
    phenotypeStateLabel:"TPMT thiopurine methylation capacity",
    modelUseLabel:"thiopurine myelosuppression-risk context",
    phenoconversion:false,
    legacyNull:false,
    compartments:["blood","systemic"],
    phenotypeLabels:REDUCED_ACTIVITY_LABELS,
  },
  NUDT15: {
    axis:GENE_SEMANTIC_AXIS.DEFICIENCY,
    nullMechanism:"inherited_deficiency",
    nullStateLabel:"NUDT15 poor function",
    phenotypeStateLabel:"NUDT15 thiopurine tolerance capacity",
    modelUseLabel:"thiopurine cytotoxicity-risk context",
    phenoconversion:false,
    legacyNull:false,
    compartments:["blood","systemic"],
    phenotypeLabels:{
      [GENOTYPE_PHENOTYPE.PM]:"poor NUDT15 function",
      [GENOTYPE_PHENOTYPE.IM]:"intermediate NUDT15 function",
      [GENOTYPE_PHENOTYPE.NM]:"normal NUDT15 function",
    },
  },
  GSTP1: {
    axis:GENE_SEMANTIC_AXIS.DEFICIENCY,
    phenotypeStateLabel:"GSTP1 detoxification activity context",
    modelUseLabel:"oncology detoxification/toxicity context",
    phenoconversion:false,
    legacyNull:false,
    compartments:["liver","tumor/tissue","environmental detox"],
    phenotypeLabels:REDUCED_ACTIVITY_LABELS,
  },
  COMT: {
    axis:GENE_SEMANTIC_AXIS.RESPONSE,
    phenotypeStateLabel:"COMT catechol methylation response context",
    modelUseLabel:"pharmacodynamic catechol-response context",
    phenoconversion:false,
    compartments:["brain/CNS","cardiovascular"],
    phenotypeLabels:{
      [GENOTYPE_PHENOTYPE.PM]:"low COMT activity context",
      [GENOTYPE_PHENOTYPE.IM]:"intermediate COMT context",
      [GENOTYPE_PHENOTYPE.NM]:"reference COMT context",
      [GENOTYPE_PHENOTYPE.UM]:"higher COMT activity context",
    },
  },
  IFNL3: { axis:GENE_SEMANTIC_AXIS.RESPONSE, phenotypeStateLabel:"IFNL3 interferon-response context", modelUseLabel:"antiviral response context, not clearance", phenoconversion:false, compartments:["immune","liver"], phenotypeLabels:RESPONSE_PHENOTYPE_LABELS },
  IFNL4: { axis:GENE_SEMANTIC_AXIS.RESPONSE, phenotypeStateLabel:"IFNL4 interferon-response context", modelUseLabel:"antiviral response context, not clearance", phenoconversion:false, compartments:["immune","liver"], phenotypeLabels:RESPONSE_PHENOTYPE_LABELS },
  ALDH2: {
    axis:GENE_SEMANTIC_AXIS.RESPONSE,
    phenotypeStateLabel:"ALDH2 aldehyde detoxification/bioactivation context",
    modelUseLabel:"aldehyde/nitrate response-toxicity context",
    phenoconversion:false,
    compartments:["liver","cardiovascular"],
    phenotypeLabels:{
      [GENOTYPE_PHENOTYPE.PM]:"low/deficient ALDH2 context",
      [GENOTYPE_PHENOTYPE.IM]:"intermediate ALDH2 context",
      [GENOTYPE_PHENOTYPE.NM]:"reference ALDH2 context",
    },
  },
  SLC22A1: { axis:GENE_SEMANTIC_AXIS.TRANSPORT, phenotypeStateLabel:"OCT1 hepatic uptake function", modelUseLabel:"transporter response/exposure context", phenoconversion:false, compartments:["liver"], phenotypeLabels:{ [GENOTYPE_PHENOTYPE.PM]:"low OCT1 uptake", [GENOTYPE_PHENOTYPE.IM]:"reduced OCT1 uptake", [GENOTYPE_PHENOTYPE.NM]:"normal OCT1 uptake" } },
  SLC22A2: { axis:GENE_SEMANTIC_AXIS.TRANSPORT, phenotypeStateLabel:"OCT2 renal cation transport function", modelUseLabel:"renal transporter exposure context", phenoconversion:false, compartments:["kidney"], phenotypeLabels:{ [GENOTYPE_PHENOTYPE.PM]:"low OCT2 transport", [GENOTYPE_PHENOTYPE.IM]:"reduced OCT2 transport", [GENOTYPE_PHENOTYPE.NM]:"normal OCT2 transport" } },
  SLC47A1: { axis:GENE_SEMANTIC_AXIS.TRANSPORT, phenotypeStateLabel:"MATE1 efflux function", modelUseLabel:"renal/hepatic transporter exposure context", phenoconversion:false, compartments:["kidney","liver"], phenotypeLabels:{ [GENOTYPE_PHENOTYPE.PM]:"low MATE1 efflux", [GENOTYPE_PHENOTYPE.IM]:"reduced MATE1 efflux", [GENOTYPE_PHENOTYPE.NM]:"normal MATE1 efflux" } },
});

// GENOTYPE_EFFECTS — fold-change multipliers vs NM baseline for key enzymes
// Source: CPIC guidelines, FDA labels, clinical PK studies
const GENOTYPE_EFFECTS = {
  CYP2D6: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:4.5, freq_pct:7,  note:"Enzyme absent. Codeine → no morphine (analgesia failure). Tamoxifen → reduced endoxifen (<30% of NM). TCAs may accumulate dangerously." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:2.0, freq_pct:11, note:"Reduced activity (~2× AUC vs NM). Allele frequencies vary substantially by ancestry; population-specific interpretation should use genotype report context." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:75, note:"Normal metabolism (reference)." },
    [GENOTYPE_PHENOTYPE.UM]:  { auc_fold:0.3, freq_pct:7,  note:"Ultra-rapid metabolism. Reduced AUC. Codeine → excess morphine → respiratory depression. Frequency varies substantially by ancestry." },
  },
  CYP2C19: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:3.0, freq_pct:3, note:"Clopidogrel prodrug not activated → stent thrombosis risk. PPIs highly elevated. Frequency varies substantially by ancestry." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.6, freq_pct:26,note:"Partial clopidogrel activation; intermediate platelet inhibition." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:65,note:"Normal activation of prodrugs (clopidogrel, voriconazole)." },
    [GENOTYPE_PHENOTYPE.UM]:  { auc_fold:0.5, freq_pct:6, note:"Ultra-rapid; reduced PPI efficacy; possible increased clopidogrel bleeding risk." },
  },
  CYP2C9: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:3.5, freq_pct:2, note:"Warfarin/phenytoin accumulation — markedly reduced maintenance dose. Highest bleeding risk." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.8, freq_pct:12,note:"Reduced warfarin clearance; dose reduction ~25-50% vs NM." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:82,note:"Standard warfarin dosing." },
    [GENOTYPE_PHENOTYPE.UM]:  { auc_fold:0.7, freq_pct:4, note:"Rare. Standard or slightly increased dose." },
  },
  CYP2B6: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:3.5, freq_pct:null, note:"Reduced CYP2B6 activity; efavirenz parent exposure rises and inactive 8-hydroxyefavirenz formation falls." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:2.0, freq_pct:null, note:"Intermediate CYP2B6 activity." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Normal CYP2B6 activity." },
    [GENOTYPE_PHENOTYPE.UM]:  { auc_fold:0.5, freq_pct:null, note:"Higher CYP2B6 activity; lower parent exposure for sensitive substrates." },
  },
  CYP3A4: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:2.0, freq_pct:null, note:"Low CYP3A4 activity context, including rare/no-function or strong reduced-expression patterns. CYP3A4*22 and non-genetic factors can raise exposure to sensitive substrates, but inhibitor/inducer stack and gut CYP3A4 often dominate." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.4, freq_pct:null, note:"Reduced CYP3A4 activity context; CYP3A4*22 carriers may have higher exposure for selected CYP3A4 substrates. Use as a cautious context flag, not a standalone dose rule." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference CYP3A4 activity. Clinical CYP3A4 variability is strongly shaped by inhibitors, inducers, liver function, inflammation, and intestinal first-pass effects." },
    [GENOTYPE_PHENOTYPE.UM]:  { auc_fold:0.7, freq_pct:null, note:"Higher CYP3A4 activity context; substrate exposure may fall, especially with environmental or medication induction. Germline ultra-rapid CYP3A4 prediction is less established than CYP2D6/CYP2C19." },
  },
  CYP3A5: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:1.8, freq_pct:null, note:"CYP3A5 non-expresser status. Tacrolimus concentration/dose is higher than in expressers; standard starting dose is usually closer than expresser dosing." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:0.7, freq_pct:null, note:"CYP3A5 expresser/intermediate status. Tacrolimus dose requirements are often higher; use therapeutic drug monitoring." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference CYP3A5 phenotype for this model." },
    [GENOTYPE_PHENOTYPE.UM]:  { auc_fold:0.5, freq_pct:null, note:"High CYP3A5 expression/activity context; sensitive CYP3A5 substrates may require higher exposure-guided dosing." },
  },
  CYP3A7: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:1.0, freq_pct:null, note:"Typical postnatal silencing / low adult CYP3A7 expression context. Most adult CYP3A drug metabolism is handled by CYP3A4 and CYP3A5." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:0.85, freq_pct:null, note:"Possible low-level CYP3A7 expression context. Treat as a weak modifier for steroid/progestin and selected CYP3A substrate review." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference adult CYP3A7 context. CYP3A7 is mainly fetal/neonatal; adult drug actionability is limited and substrate-specific." },
    [GENOTYPE_PHENOTYPE.UM]:  { auc_fold:0.75, freq_pct:null, note:"Persistent CYP3A7 expression context, often mapped from CYP3A7*1C. This may lower exposure for steroid/progestin substrates such as etonogestrel; use as a review flag, not a standalone contraceptive decision." },
  },
  CYP2C8: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:2.0, freq_pct:null, note:"Reduced CYP2C8 activity; sensitive substrates such as pioglitazone, repaglinide, paclitaxel, montelukast, and hydroxychloroquine may have higher exposure. Interpret with CYP2C8 inhibitors such as gemfibrozil or clopidogrel acyl glucuronide." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.4, freq_pct:null, note:"Intermediate CYP2C8 activity; modest substrate exposure increase possible, especially when a CYP2C8 inhibitor or hepatic uptake transporter issue is also present." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Normal CYP2C8 activity." },
    [GENOTYPE_PHENOTYPE.UM]:  { auc_fold:0.8, freq_pct:null, note:"Higher CYP2C8 activity context; substrate exposure may be lower." },
  },
  CYP2A6: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:3.0, freq_pct:null, note:"Reduced CYP2A6 activity; nicotine and cotinine formation/clearance shift, often lowering smoking intensity but raising nicotine exposure per cigarette." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.6, freq_pct:null, note:"Intermediate CYP2A6 activity; slower nicotine clearance." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Normal CYP2A6 activity." },
    [GENOTYPE_PHENOTYPE.UM]:  { auc_fold:0.7, freq_pct:null, note:"Higher CYP2A6 activity; faster nicotine clearance." },
  },
  CYP1A2: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:2.0, freq_pct:null, note:"Lower CYP1A2 activity context; exposure to sensitive substrates such as caffeine, clozapine, theophylline, and tizanidine may rise. Smoking cessation or CYP1A2 inhibitors can matter more than genotype alone." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.4, freq_pct:null, note:"Intermediate CYP1A2 activity context; substrate exposure may rise modestly, especially without environmental induction." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference CYP1A2 activity." },
    [GENOTYPE_PHENOTYPE.UM]:  { auc_fold:0.6, freq_pct:null, note:"Higher or inducible CYP1A2 activity context; sensitive substrate exposure may fall. Smoking, charbroiled foods, and other induction context should be reviewed separately." },
  },
  CYP2E1: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:1.8, freq_pct:null, note:"Low CYP2E1 activity context. For acetaminophen, lower CYP2E1 may reduce NAPQI formation, but glutathione reserve, dose, alcohol timing, fasting, liver disease, and interacting drugs dominate." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.3, freq_pct:null, note:"Intermediate CYP2E1 context. Useful for chlorzoxazone/probe, acetaminophen-NAPQI, alcohol/isoniazid induction, and selected toxicant review." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference CYP2E1 activity. CYP2E1 is highly environmentally modulated by alcohol, fasting, obesity, diabetes, and inflammation." },
    [GENOTYPE_PHENOTYPE.UM]:  { auc_fold:0.6, freq_pct:null, note:"Higher/induced CYP2E1 context. This can increase reactive metabolite formation for acetaminophen, halogenated solvents, and older volatile anesthetics; use as a risk-stack flag, not a dose rule." },
  },
  NAT2: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:2.0, freq_pct:null, note:"Slow acetylator phenotype; isoniazid and hydralazine exposure/toxicity risk can rise while some efficacy/toxicity tradeoffs differ by indication." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.4, freq_pct:null, note:"Intermediate acetylator phenotype." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference acetylator phenotype for this model." },
    [GENOTYPE_PHENOTYPE.UM]:  { auc_fold:0.7, freq_pct:null, note:"Rapid acetylator phenotype; lower exposure for NAT2 substrates." },
  },
  NAT1: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:1.8, freq_pct:null, note:"Reduced NAT1 acetylation context. NAT1 is more relevant for PABA/PAS-like arylamine substrates and some xenobiotic bioactivation/deactivation than for classic NAT2 slow-acetylator dosing." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.25, freq_pct:null, note:"Intermediate NAT1 activity context; treat as a review flag for PABA/PAS/sulfonamide/aromatic-amine exposure rather than a prescribing rule." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference NAT1 acetylation context." },
    [GENOTYPE_PHENOTYPE.UM]:  { auc_fold:0.8, freq_pct:null, note:"Higher NAT1 expression/activity context. Some NAT1 alleles may increase expression; clinical actionability is limited and substrate-specific." },
  },
  SLCO1B1: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:2.5, freq_pct:null, note:"Decreased OATP1B1 hepatic uptake. Simvastatin acid and several statins can have higher systemic exposure and higher muscle-symptom risk." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.5, freq_pct:null, note:"Decreased/intermediate OATP1B1 function; statin exposure may rise." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Normal OATP1B1 function." },
    [GENOTYPE_PHENOTYPE.UM]:  { auc_fold:0.8, freq_pct:null, note:"Higher OATP1B1 uptake context; systemic statin exposure may be lower." },
  },
  ABCG2: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:2.0, freq_pct:null, note:"Reduced BCRP/ABCG2 efflux. Rosuvastatin and sulfasalazine exposure can rise; gout/urate context may also matter." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.4, freq_pct:null, note:"Intermediate BCRP/ABCG2 function." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Normal BCRP/ABCG2 function." },
  },
  ABCB1: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:1.5, freq_pct:null, note:"Reduced P-gp/ABCB1 efflux context. Directionally, susceptible substrates such as digoxin, dabigatran, loperamide, and calcineurin inhibitors may have higher exposure or altered tissue penetration; clinical action remains drug- and study-specific." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.2, freq_pct:null, note:"Intermediate P-gp/ABCB1 function context; substrate exposure or CNS penetration may rise modestly for sensitive P-gp substrates." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference P-gp/ABCB1 function." },
  },
  VKORC1: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:1.8, freq_pct:null, note:"Warfarin-sensitive VKORC1 context; lower maintenance dose is usually needed for the same INR target." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.3, freq_pct:null, note:"Intermediate warfarin sensitivity context." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference VKORC1 warfarin sensitivity context." },
    [GENOTYPE_PHENOTYPE.UM]:  { auc_fold:0.8, freq_pct:null, note:"Relative warfarin-resistant VKORC1 context; higher dose may be required, guided by INR." },
  },
  CYP4F2: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:0.9, freq_pct:null, note:"Reduced vitamin K oxidation can modestly increase warfarin dose requirement; effect is smaller than VKORC1/CYP2C9." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:0.95, freq_pct:null, note:"Intermediate CYP4F2 vitamin K oxidation context." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Normal CYP4F2 vitamin K oxidation." },
  },
  DPYD: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:20.0, freq_pct:null, note:"Very low/absent DPYD activity; fluoropyrimidine toxicity risk can be life-threatening." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:2.0, freq_pct:null, note:"Reduced DPYD activity; fluoropyrimidine starting dose usually requires major reduction." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Normal DPYD activity." },
  },
  TPMT: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:20.0, freq_pct:null, note:"Very low/absent TPMT activity; thiopurine myelosuppression risk at standard doses." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:2.0, freq_pct:null, note:"Reduced TPMT activity; thiopurine dose reduction needed." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Normal TPMT activity." },
    [GENOTYPE_PHENOTYPE.UM]:  { auc_fold:0.5, freq_pct:null, note:"Higher methylation tendency; lower 6-TGN and possible 6-MMP shunting." },
  },
  UGT1A1: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:1.7, freq_pct:null, note:"Reduced UGT1A1 glucuronidation; SN-38 or bilirubin exposure can rise depending on substrate." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.2, freq_pct:null, note:"Intermediate UGT1A1 activity." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Normal UGT1A1 activity." },
  },
  UGT1A4: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:1.8, freq_pct:null, note:"Reduced UGT1A4 glucuronidation context. Lamotrigine, asenapine, posaconazole, and selected oncology drugs can shift, but induction/inhibition from valproate, estrogens, rifampin, and anticonvulsants often dominates genotype alone." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.3, freq_pct:null, note:"Intermediate UGT1A4 activity context; lamotrigine or UGT1A4 substrate exposure may rise modestly." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference UGT1A4 glucuronidation activity." },
    [GENOTYPE_PHENOTYPE.UM]:  { auc_fold:0.8, freq_pct:null, note:"Higher UGT1A4 glucuronidation context; parent exposure may fall while glucuronide formation may rise for selected substrates." },
  },
  UGT1A9: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:1.7, freq_pct:null, note:"Reduced UGT1A9 glucuronidation context. Propofol, mycophenolate, dapagliflozin, darolutamide, sorafenib, and regorafenib can shift, but clinical impact is usually drug-, organ-, and protocol-specific." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.25, freq_pct:null, note:"Intermediate UGT1A9 activity context; modest exposure shifts possible for sensitive glucuronidated substrates." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference UGT1A9 glucuronidation activity." },
    [GENOTYPE_PHENOTYPE.UM]:  { auc_fold:0.8, freq_pct:null, note:"Higher UGT1A9 glucuronidation context; parent exposure may fall for selected substrates." },
  },
  UGT2B7: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:1.8, freq_pct:null, note:"Reduced UGT2B7 glucuronidation context. Morphine, hydromorphone, oxymorphone, zidovudine, and some NSAID/glucuronide pathways may shift, but clinical direction depends on active vs inactive glucuronides." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.3, freq_pct:null, note:"Intermediate UGT2B7 activity context; glucuronide formation may be modestly reduced for sensitive substrates." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference UGT2B7 glucuronidation activity." },
    [GENOTYPE_PHENOTYPE.UM]:  { auc_fold:0.8, freq_pct:null, note:"Higher UGT2B7 glucuronidation context; parent exposure may fall while glucuronide metabolite exposure may rise for selected substrates." },
  },
  UGT2B15: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:1.8, freq_pct:null, note:"Reduced UGT2B15 glucuronidation context. Lorazepam, oxazepam, and dabigatran acyl-glucuronide pathways may shift; clinical interpretation depends strongly on age, renal function, dose, sedation burden, and bleeding risk." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.3, freq_pct:null, note:"Intermediate UGT2B15 activity context; glucuronidated substrate exposure may rise modestly." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference UGT2B15 glucuronidation activity." },
    [GENOTYPE_PHENOTYPE.UM]:  { auc_fold:0.8, freq_pct:null, note:"Higher UGT2B15 glucuronidation context; parent exposure may fall for selected substrates." },
  },
  UGT2B17: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:1.5, freq_pct:null, note:"UGT2B17 deletion/low-function context. Effects are substrate-specific and often strongest for androgen/steroid glucuronidation; MedCheck Engine uses it as a caution flag for oxazepam/temazepam-like glucuronidation rather than a dose rule." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.2, freq_pct:null, note:"Intermediate UGT2B17 activity context; usually a weak modifier unless the substrate is strongly UGT2B17-dependent." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference UGT2B17 activity." },
  },
  COMT: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:1.5, freq_pct:null, note:"Low COMT activity context, often mapped from Met/Met-like reports. Catechol tone and levodopa/pressor response may be amplified; use as a pharmacodynamic context flag, not a classic clearance dose rule." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.2, freq_pct:null, note:"Intermediate COMT activity context; catecholamine methylation may be modestly reduced." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference COMT activity." },
    [GENOTYPE_PHENOTYPE.UM]:  { auc_fold:0.8, freq_pct:null, note:"Higher COMT activity context, often mapped from Val/Val-like reports; catechol methylation may be faster." },
  },
  GSTM1: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:1.5, freq_pct:null, note:"GSTM1 null context. GSTM1 enzyme activity is absent; detoxification capacity for electrophilic/oxidative drug intermediates may be lower. Evidence is context-specific and often strongest for oncology or anti-tuberculosis toxicity signals." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.2, freq_pct:null, note:"Possible reduced GSTM1 detoxification context; use cautiously because many reports classify GSTM1 as present vs null rather than graded activity." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"GSTM1 present/reference detoxification context." },
  },
  GSTT1: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:1.4, freq_pct:null, note:"GSTT1 null context. GSTT1 enzyme activity is absent; detoxification of selected halogenated/environmental substrates and some oncology conditioning contexts may shift. Evidence is inconsistent for many drugs." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.15, freq_pct:null, note:"Possible reduced GSTT1 detoxification context. Use as a broad detoxification review flag rather than a dose rule." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"GSTT1 present/reference detoxification context." },
  },
  GSTP1: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:1.5, freq_pct:null, note:"Reduced GSTP1 activity context, often mapped from rs1695/Ile105Val variant reports. Platinum chemotherapy toxicity/response signals exist, but evidence is tumor- and regimen-specific." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.25, freq_pct:null, note:"Intermediate GSTP1 detoxification context. Treat as oncology review context for platinum/alkylating regimens, not as a standalone dose change." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference GSTP1 detoxification context." },
  },
  NUDT15: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:20.0, freq_pct:null, note:"NUDT15 poor function; thiopurine cytotoxic nucleotide intolerance can be profound even when TPMT is normal." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:2.0, freq_pct:null, note:"NUDT15 intermediate function; thiopurine dose reduction and close CBC monitoring are usually needed." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Normal NUDT15 function." },
  },
  BCHE: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:20.0, freq_pct:null, note:"Pseudocholinesterase/butyrylcholinesterase deficiency context. Succinylcholine and mivacurium hydrolysis can be severely impaired, causing prolonged paralysis/apnea after standard procedural doses." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:4.0, freq_pct:null, note:"Intermediate BCHE activity context; succinylcholine or mivacurium paralysis may be prolonged. Review prior anesthesia history and consider nondepolarizing alternatives." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference plasma butyrylcholinesterase activity for succinylcholine/mivacurium hydrolysis." },
  },
  IFNL3: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:0.5, freq_pct:null, note:"Unfavorable IFNL3/IL28B interferon-response context. This is an efficacy-response marker for peginterferon/ribavirin-era HCV regimens, not a clearance enzyme." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:0.75, freq_pct:null, note:"Intermediate IFNL3 interferon-response context. Modern direct-acting antiviral regimens usually supersede this marker, but it remains useful historical/regimen context." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Favorable/reference IFNL3 interferon-response context for peginterferon/ribavirin-era HCV treatment." },
  },
  IFNL4: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:0.5, freq_pct:null, note:"IFNL4-generating/unfavorable response context. Mainly affects spontaneous or interferon-based HCV clearance probability, not parent-drug exposure." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:0.75, freq_pct:null, note:"Intermediate IFNL4 response context; interpret with viral genotype, fibrosis, prior treatment, and whether interferon is actually being used." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference/favorable IFNL4 response context." },
  },
  OPRM1: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:0.8, freq_pct:null, note:"Reduced mu-opioid receptor response context. CPIC does not recommend opioid dosing changes from OPRM1 alone; use as response/sedation review context only." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:0.9, freq_pct:null, note:"Intermediate OPRM1 response context. Analgesia and adverse effects remain strongly shaped by dose, tolerance, renal function, CYP2D6/CYP3A/UGT context, and co-sedatives." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference OPRM1 response context." },
  },
  SLC6A4: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:0.75, freq_pct:null, note:"Low serotonin-transporter expression/response context, often mapped from 5-HTTLPR S/S or reduced-function reports. CPIC 2023 treats this as antidepressant response/tolerability context, not a clearance rule." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:0.9, freq_pct:null, note:"Intermediate SLC6A4 response context for serotonin reuptake inhibitors; combine with CYP2D6/CYP2C19/CYP2B6 exposure, indication, prior response, and adverse-effect history." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference SLC6A4 response context." },
  },
  HTR2A: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:0.85, freq_pct:null, note:"HTR2A serotonin-receptor response/tolerability context for SSRIs/SNRIs. Evidence is less deterministic than CYP exposure rules; use as a shared-decision review flag." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:0.95, freq_pct:null, note:"Intermediate HTR2A response context; monitor efficacy, activation, sleep, and tolerability rather than changing dose from genotype alone." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference HTR2A response context." },
  },
  HTR2C: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:1.3, freq_pct:null, note:"HTR2C appetite/weight-gain susceptibility context for selected antipsychotics. This is a tolerability-risk flag, not a parent-drug exposure rule." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.15, freq_pct:null, note:"Intermediate HTR2C tolerability context; metabolic baseline, dose, antipsychotic choice, age, and lifestyle factors dominate." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference HTR2C tolerability context." },
  },
  DRD2: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:1.3, freq_pct:null, note:"DRD2 dopamine-receptor response/adverse-effect context for antipsychotics. Associations with efficacy, EPS, and prolactin are study-specific; use as a review prompt only." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.1, freq_pct:null, note:"Intermediate DRD2 response context; do not override clinical response, dose, CYP2D6 exposure, or adverse-effect monitoring." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference DRD2 response context." },
  },
  ALDH2: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:0.4, freq_pct:null, note:"Low/deficient ALDH2 context. Nitroglycerin bioactivation and ethanol-derived acetaldehyde clearance can be reduced; this is a response/toxicity-context marker, not a CYP-style clearance rule." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:0.7, freq_pct:null, note:"Intermediate ALDH2 context; nitrate response may be blunted and alcohol/disulfiram-like reactions may be more pronounced." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference ALDH2 aldehyde detoxification and nitrate bioactivation context." },
  },
  SLC22A1: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:0.7, freq_pct:null, note:"Reduced OCT1 hepatic uptake context. Metformin hepatic delivery and glycemic response may be lower; GI intolerance and transporter inhibitors can complicate interpretation." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:0.85, freq_pct:null, note:"Intermediate OCT1 hepatic uptake context; metformin response may be modestly shifted." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference OCT1 hepatic uptake context." },
  },
  SLC22A2: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:1.4, freq_pct:null, note:"Reduced OCT2 renal cation transport context. Metformin renal handling and transporter inhibitor sensitivity may shift; kidney function remains the dominant safety variable." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.2, freq_pct:null, note:"Intermediate OCT2 renal transport context; interpret with eGFR, dose, and OCT2/MATE inhibitors such as cimetidine, dolutegravir, or trimethoprim." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference OCT2 renal cation transport context." },
  },
  SLC47A1: {
    [GENOTYPE_PHENOTYPE.PM]:  { auc_fold:1.3, freq_pct:null, note:"Reduced MATE1 efflux context. Metformin renal/hepatic efflux may be lower, especially when MATE/OCT inhibitors or renal impairment are present." },
    [GENOTYPE_PHENOTYPE.IM]:  { auc_fold:1.15, freq_pct:null, note:"Intermediate MATE1 transport context; monitor metformin tolerability and renal context rather than changing dose from genotype alone." },
    [GENOTYPE_PHENOTYPE.NM]:  { auc_fold:1.0, freq_pct:null, note:"Reference MATE1 efflux context." },
  },
};

const GENOTYPE_RISK_EFFECTS = {
  "HLA-B*15:02": {
    gene:"HLA-B",
    variant:"*15:02",
    label:"HLA-B*15:02",
    drugEffects:[
      {
        parent:"Carbamazepine",
        phenotype:"SJS/TEN risk",
        note:"HLA-B*15:02 is strongly associated with carbamazepine-induced Stevens-Johnson syndrome/toxic epidermal necrolysis. CPIC recommends avoiding carbamazepine in allele-positive patients unless benefits clearly outweigh risks and no alternatives exist.",
        clinicalAction:"avoid carbamazepine; consider non-aromatic alternatives",
        evidenceRefs:["ev_carbamazepine_oxcarbazepine_hla_cpic2017"],
      },
      {
        parent:"Oxcarbazepine",
        phenotype:"SJS/TEN risk",
        note:"HLA-B*15:02 also increases oxcarbazepine SJS/TEN risk. CPIC recommends avoiding oxcarbazepine in allele-positive patients when possible.",
        clinicalAction:"avoid oxcarbazepine when possible; consider alternatives",
        evidenceRefs:["ev_carbamazepine_oxcarbazepine_hla_cpic2017"],
      },
      {
        parent:"Phenytoin",
        phenotype:"SJS/TEN risk",
        note:"HLA-B*15:02 is associated with phenytoin-induced severe cutaneous adverse reactions, especially in populations where the allele is more common. CYP2C9 still controls the exposure/dose component.",
        clinicalAction:"avoid phenytoin/fosphenytoin if possible; use CYP2C9-guided dosing if used",
        evidenceRefs:["ev_phenytoin_cyp2c9_hlab_cpic2020"],
      },
      {
        parent:"Fosphenytoin",
        phenotype:"SJS/TEN risk after conversion to phenytoin",
        note:"Fosphenytoin is rapidly converted to phenytoin, so the same HLA-B*15:02 severe cutaneous adverse reaction risk applies after conversion. This immune-risk signal is separate from infusion-related cardiac effects and CYP2C9 exposure sensitivity.",
        clinicalAction:"avoid fosphenytoin if HLA-B*15:02 positive when alternatives exist; if used, apply phenytoin CYP2C9/TDM and rash monitoring",
        evidenceRefs:["ev_phenytoin_cyp2c9_hlab_cpic2020"],
      },
    ],
    effects:{
      [GENOTYPE_RISK_STATUS.ABSENT]: { label:"not detected", severity:"baseline", note:"Risk allele not detected. This does not remove ordinary rash or hypersensitivity risk." },
      [GENOTYPE_RISK_STATUS.PRESENT]: { label:"detected", severity:"high", note:"Risk allele detected. Severe cutaneous adverse reaction risk is elevated for specific drugs." },
    },
  },
  "HLA-A*31:01": {
    gene:"HLA-A",
    variant:"*31:01",
    label:"HLA-A*31:01",
    drugEffects:[
      {
        parent:"Carbamazepine",
        phenotype:"carbamazepine hypersensitivity risk",
        note:"HLA-A*31:01 is associated with a broader carbamazepine hypersensitivity spectrum, including maculopapular exanthema, DRESS, and SJS/TEN.",
        clinicalAction:"avoid carbamazepine when possible; if used, monitor closely",
        evidenceRefs:["ev_carbamazepine_oxcarbazepine_hla_cpic2017"],
      },
    ],
    effects:{
      [GENOTYPE_RISK_STATUS.ABSENT]: { label:"not detected", severity:"baseline", note:"Risk allele not detected. This does not remove ordinary rash or hypersensitivity risk." },
      [GENOTYPE_RISK_STATUS.PRESENT]: { label:"detected", severity:"high", note:"Risk allele detected. Carbamazepine hypersensitivity risk is elevated." },
    },
  },
  "HLA-B*57:01": {
    gene:"HLA-B",
    variant:"*57:01",
    label:"HLA-B*57:01",
    drugEffects:[
      {
        parent:"Abacavir",
        phenotype:"abacavir hypersensitivity risk",
        note:"HLA-B*57:01 predicts abacavir hypersensitivity. CPIC and product labeling recommend avoiding abacavir in allele-positive patients.",
        clinicalAction:"abacavir contraindicated; use alternative antiretroviral",
        evidenceRefs:["ev_abacavir_hlab5701_cpic2012"],
      },
      {
        parent:"Flucloxacillin",
        phenotype:"flucloxacillin-induced cholestatic liver injury",
        note:"HLA-B*57:01 is associated with flucloxacillin-induced drug-induced liver injury (delayed cholestatic hepatitis), a different organ outcome from abacavir hypersensitivity but the same risk allele. Absolute risk is low (idiosyncratic) but the relative association is strong.",
        clinicalAction:"no routine pre-test recommended; if allele known-positive, prefer alternative anti-staphylococcal agent and monitor LFTs; investigate cholestatic LFTs promptly",
        evidenceRefs:["ev_flucloxacillin_hlab5701_daly2009"],
      },
    ],
    effects:{
      [GENOTYPE_RISK_STATUS.ABSENT]: { label:"not detected", severity:"baseline", note:"Risk allele not detected; abacavir hypersensitivity risk is substantially reduced but not impossible." },
      [GENOTYPE_RISK_STATUS.PRESENT]: { label:"detected", severity:"high", note:"Risk allele detected. Abacavir should be avoided." },
    },
  },
  "HLA-B*58:01": {
    gene:"HLA-B",
    variant:"*58:01",
    label:"HLA-B*58:01",
    drugEffects:[
      {
        parent:"Allopurinol",
        phenotype:"allopurinol SCAR risk",
        note:"HLA-B*58:01 is strongly associated with allopurinol severe cutaneous adverse reactions, including SJS/TEN and DRESS. CPIC recommends allopurinol is contraindicated in allele-positive patients.",
        clinicalAction:"allopurinol contraindicated; use alternative urate-lowering strategy",
        evidenceRefs:["ev_allopurinol_hlab5801_cpic2015"],
      },
    ],
    effects:{
      [GENOTYPE_RISK_STATUS.ABSENT]: { label:"not detected", severity:"baseline", note:"Risk allele not detected. Renal function, starting dose, and clinical monitoring still matter." },
      [GENOTYPE_RISK_STATUS.PRESENT]: { label:"detected", severity:"high", note:"Risk allele detected. Allopurinol severe cutaneous reaction risk is elevated." },
    },
  },
  "G6PD deficiency": {
    gene:"G6PD",
    variant:"deficiency (class I-III)",
    label:"G6PD deficiency",
    drugEffects:[
      {
        parent:"Rasburicase",
        phenotype:"acute hemolytic anemia / methemoglobinemia",
        note:"Rasburicase is contraindicated in G6PD deficiency: oxidative stress from hydrogen peroxide can overwhelm deficient erythrocytes, causing acute hemolytic anemia and methemoglobinemia.",
        clinicalAction:"contraindicated; use another urate-lowering strategy",
        evidenceRefs:["ev_rasburicase_g6pd_cpic2014"],
      },
      {
        parent:"Primaquine",
        phenotype:"acute hemolytic anemia",
        note:"8-aminoquinolines can impose oxidative stress and trigger acute hemolysis in G6PD-deficient patients.",
        clinicalAction:"avoid unless G6PD status and specialist plan support use",
        evidenceRefs:["ev_rasburicase_g6pd_cpic2014"],
      },
      {
        parent:"Dapsone",
        phenotype:"hemolysis / methemoglobinemia",
        note:"Dapsone can cause oxidative hemolysis and methemoglobinemia, with higher risk in G6PD deficiency.",
        clinicalAction:"avoid or use close hematologic monitoring if unavoidable",
        evidenceRefs:["ev_rasburicase_g6pd_cpic2014"],
      },
      {
        parent:"Nitrofurantoin",
        phenotype:"acute hemolytic anemia",
        note:"Nitrofurantoin is an oxidative-stress drug that can precipitate hemolysis in G6PD-deficient patients.",
        clinicalAction:"avoid in known G6PD deficiency when alternatives exist",
        evidenceRefs:["ev_rasburicase_g6pd_cpic2014"],
      },
      {
        parent:"Tafenoquine",
        phenotype:"acute hemolytic anemia / methemoglobinemia",
        note:"8-aminoquinoline imposing oxidative stress; in G6PD deficiency causes severe acute hemolytic anemia. Its ~14-day half-life means hemolysis cannot be halted by stopping the drug, so the FDA requires documented adequate G6PD activity before dosing.",
        clinicalAction:"contraindicated without documented adequate G6PD activity; FDA requires G6PD testing before use",
        evidenceRefs:["ev_tafenoquine_g6pd_fda"],
      },
      {
        parent:"Chloroquine",
        phenotype:"acute hemolytic anemia",
        note:"4-aminoquinoline; can precipitate oxidative hemolysis in G6PD deficiency, though risk is generally lower than with 8-aminoquinolines at antimalarial doses.",
        clinicalAction:"use with caution and hematologic monitoring in known deficiency; consider alternatives where feasible",
        evidenceRefs:["ev_g6pd_oxidative_antimalarials"],
      },
      {
        parent:"Quinine",
        phenotype:"acute hemolytic anemia",
        note:"Antimalarial alkaloid; oxidative-stress hemolysis reported in G6PD deficiency. Also causes immune thrombocytopenia and cinchonism independent of G6PD.",
        clinicalAction:"avoid in known deficiency when alternatives exist; monitor if unavoidable",
        evidenceRefs:["ev_g6pd_oxidative_antimalarials"],
      },
      {
        parent:"Methylene Blue",
        phenotype:"hemolysis; paradoxical worsening of methemoglobinemia",
        note:"Methylene blue reduces methemoglobin via an NADPH-dependent pathway that REQUIRES G6PD. In G6PD deficiency it is both ineffective for methemoglobinemia and itself an oxidant that can precipitate hemolysis — contraindicated.",
        clinicalAction:"contraindicated in G6PD deficiency; use ascorbic acid / exchange transfusion for methemoglobinemia instead",
        evidenceRefs:["ev_methylene_blue_maoi_fda"],
      },
      {
        parent:"Sulfasalazine",
        phenotype:"oxidative hemolysis",
        note:"The sulfapyridine moiety is an oxidant sulfonamide that can trigger hemolysis in G6PD deficiency, especially at higher doses. NAT2 slow acetylators accumulate sulfapyridine and have more dose-related adverse effects generally.",
        clinicalAction:"use cautiously with CBC monitoring in known deficiency; consider mesalamine (5-ASA) alternative",
        evidenceRefs:["ev_sulfasalazine_tpmt_inhibition"],
      },
      {
        parent:"Pegloticase",
        phenotype:"acute hemolytic anemia / methemoglobinemia",
        note:"Pegloticase (PEGylated uricase) generates hydrogen peroxide while converting urate to allantoin; in G6PD deficiency this oxidant causes life-threatening hemolysis and methemoglobinemia — contraindicated.",
        clinicalAction:"contraindicated; FDA requires G6PD screening before use, especially in African, Mediterranean/Southern-European, Middle-Eastern, and South-Asian ancestry",
        evidenceRefs:["ev_pegloticase_g6pd_fda"],
      },
    ],
    effects:{
      [GENOTYPE_RISK_STATUS.ABSENT]: { label:"normal G6PD", severity:"baseline", note:"Normal G6PD activity assumed. Ordinary precautions apply; this does not exclude other causes of hemolysis." },
      [GENOTYPE_RISK_STATUS.PRESENT]: { label:"G6PD deficient", severity:"high", note:"G6PD deficiency present. Oxidative drugs can trigger acute hemolytic anemia; rasburicase is contraindicated." },
    },
  },
  "MT-RNR1 m.1555A>G": {
    gene:"MT-RNR1",
    variant:"m.1555A>G / m.1494C>T / m.1095T>C",
    label:"MT-RNR1 ototoxicity-risk variant",
    drugEffects:[
      {
        parent:"Gentamicin",
        phenotype:"irreversible aminoglycoside ototoxicity",
        note:"MT-RNR1 risk variants markedly increase risk of irreversible aminoglycoside-induced sensorineural hearing loss, which can occur at therapeutic serum levels.",
        clinicalAction:"avoid aminoglycosides unless no safe alternative exists",
        evidenceRefs:["ev_aminoglycoside_mtrnr1_cpic2021"],
      },
      {
        parent:"Amikacin",
        phenotype:"irreversible aminoglycoside ototoxicity",
        note:"MT-RNR1 risk variants markedly increase aminoglycoside ototoxicity risk, including with amikacin.",
        clinicalAction:"avoid; use an alternative antibiotic where possible",
        evidenceRefs:["ev_aminoglycoside_mtrnr1_cpic2021"],
      },
      {
        parent:"Tobramycin",
        phenotype:"irreversible aminoglycoside ototoxicity",
        note:"MT-RNR1 risk variants markedly increase aminoglycoside ototoxicity risk, including with tobramycin.",
        clinicalAction:"avoid; use an alternative antibiotic where possible",
        evidenceRefs:["ev_aminoglycoside_mtrnr1_cpic2021"],
      },
      {
        parent:"Streptomycin",
        phenotype:"irreversible aminoglycoside ototoxicity",
        note:"MT-RNR1 risk variants markedly increase aminoglycoside ototoxicity risk, including with streptomycin.",
        clinicalAction:"avoid; use an alternative antibiotic where possible",
        evidenceRefs:["ev_aminoglycoside_mtrnr1_cpic2021"],
      },
    ],
    effects:{
      [GENOTYPE_RISK_STATUS.ABSENT]: { label:"not detected", severity:"baseline", note:"MT-RNR1 risk variant not detected. A negative result does not eliminate dose- or duration-related aminoglycoside ototoxicity." },
      [GENOTYPE_RISK_STATUS.PRESENT]: { label:"detected", severity:"high", note:"MT-RNR1 risk variant present. Aminoglycosides may cause irreversible hearing loss even at therapeutic levels." },
    },
  },
  "RYR1/CACNA1S MH variant": {
    gene:"RYR1/CACNA1S",
    variant:"malignant-hyperthermia-associated variant",
    label:"Malignant hyperthermia susceptibility",
    drugEffects:[
      {
        parent:"Succinylcholine",
        phenotype:"malignant hyperthermia trigger",
        note:"In carriers of malignant-hyperthermia-associated RYR1/CACNA1S variants, succinylcholine can precipitate a life-threatening hypermetabolic crisis.",
        clinicalAction:"avoid; use non-triggering anesthesia",
        evidenceRefs:["ev_volatile_succinylcholine_ryr1_cacna1s_cpic2019"],
      },
      {
        parent:"Sevoflurane",
        phenotype:"malignant hyperthermia trigger",
        note:"Sevoflurane is a potent volatile anesthetic and malignant hyperthermia trigger in susceptible RYR1/CACNA1S variant carriers.",
        clinicalAction:"avoid; use non-triggering anesthesia",
        evidenceRefs:["ev_volatile_succinylcholine_ryr1_cacna1s_cpic2019"],
      },
      {
        parent:"Isoflurane",
        phenotype:"malignant hyperthermia trigger",
        note:"Isoflurane is a potent volatile anesthetic and malignant hyperthermia trigger in susceptible RYR1/CACNA1S variant carriers.",
        clinicalAction:"avoid; use non-triggering anesthesia",
        evidenceRefs:["ev_volatile_succinylcholine_ryr1_cacna1s_cpic2019"],
      },
      {
        parent:"Desflurane",
        phenotype:"malignant hyperthermia trigger",
        note:"Desflurane is a potent volatile anesthetic and malignant hyperthermia trigger in susceptible RYR1/CACNA1S variant carriers.",
        clinicalAction:"avoid; use non-triggering anesthesia",
        evidenceRefs:["ev_volatile_succinylcholine_ryr1_cacna1s_cpic2019"],
      },
    ],
    effects:{
      [GENOTYPE_RISK_STATUS.ABSENT]: { label:"no MH-associated variant", severity:"baseline", note:"No MH-associated RYR1/CACNA1S variant detected. A negative genotype does not fully exclude malignant hyperthermia susceptibility; personal and family history still matter." },
      [GENOTYPE_RISK_STATUS.PRESENT]: { label:"MH-susceptible", severity:"high", note:"Malignant-hyperthermia-associated variant present. Potent volatile anesthetics and succinylcholine can trigger a life-threatening crisis." },
    },
  },
  "HLA-B*13:01": {
    gene:"HLA-B",
    variant:"*13:01",
    label:"HLA-B*13:01",
    drugEffects:[
      {
        parent:"Dapsone",
        phenotype:"dapsone hypersensitivity syndrome (DHS / DRESS)",
        note:"HLA-B*13:01 is strongly associated with dapsone hypersensitivity syndrome — a delayed (typically 4-6 week) DRESS-type reaction with fever, rash, hepatitis and eosinophilia; reported mortality ~10%. Immune-mediated and INDEPENDENT of the dose-dependent hemolysis/methemoglobinemia hazard, which tracks G6PD (see G6PD card).",
        clinicalAction:"avoid dapsone in allele-positive patients when alternatives exist; if used, counsel on DHS and monitor closely through weeks 1-8",
        evidenceRefs:[
          "ev_dapsone_hlab1301_zhang2013",
          "ev_dapsone_hlab1301_krismawati2020"
        ],
      },
    ],
    effects:{
      [GENOTYPE_RISK_STATUS.ABSENT]:{
        label:"not detected",
        severity:"baseline",
        note:"Risk allele not detected; DHS risk substantially reduced but ordinary dapsone hypersensitivity/hemolysis precautions still apply."
      },
      [GENOTYPE_RISK_STATUS.PRESENT]:{
        label:"detected",
        severity:"high",
        note:"Risk allele detected. Dapsone hypersensitivity syndrome risk markedly elevated (GWAS OR ~20). Largely absent in European/African ancestry; common in East/Southeast Asian and Indian populations."
      },
    },
  },
  "HLA-A*32:01": {
    gene:"HLA-A",
    variant:"*32:01",
    label:"HLA-A*32:01",
    drugEffects:[
      {
        parent:"Vancomycin",
        phenotype:"vancomycin-induced DRESS / liver injury",
        note:"HLA-A*32:01 is strongly associated with vancomycin-induced DRESS (drug reaction with eosinophilia and systemic symptoms), frequently with hepatocellular liver injury. In one cohort ~83% of vancomycin-DRESS cases carried the allele vs 0% of tolerant controls; ~19% of allele-positive patients developed DRESS within 4 weeks of prolonged IV exposure.",
        clinicalAction:"consider HLA-A*32:01 testing before planned prolonged IV vancomycin; if positive, weigh alternative antibiotic and monitor eosinophils/LFTs/rash weeks 1-4",
        evidenceRefs:["ev_vancomycin_hla_a3201_konvinse2019"],
      },
    ],
    effects:{
      [GENOTYPE_RISK_STATUS.ABSENT]:{
        label:"not detected",
        severity:"baseline",
        note:"Risk allele not detected; DRESS risk reduced but not zero — clinical vigilance during prolonged therapy still applies."
      },
      [GENOTYPE_RISK_STATUS.PRESENT]:{
        label:"detected",
        severity:"high",
        note:"Risk allele detected. Vancomycin-induced DRESS risk elevated, particularly with IV therapy beyond ~1-2 weeks."
      },
    },
  },
  "MTHFR C677T": {
    gene:"MTHFR",
    variant:"C677T / rs1801133",
    label:"MTHFR C677T",
    drugEffects:[
      {
        parent:"Methotrexate",
        phenotype:"folate-pathway toxicity context",
        note:"MTHFR C677T, especially TT/homozygous variant context, has been associated with higher methotrexate toxicity in some meta-analyses, but evidence is inconsistent by ancestry, indication, dose, and folate rescue. Do not use as a standalone methotrexate contraindication.",
        clinicalAction:"flag folate-pathway risk context; review dose, renal function, interacting antifolates, CBC/LFT monitoring, and folic/folinic rescue plan",
        evidenceRefs:["ev_mthfr_c677t_methotrexate_toxicity_meta"],
      },
      {
        parent:"Trimethoprim/Sulfamethoxazole",
        phenotype:"additive antifolate context",
        note:"MTHFR C677T does not by itself define trimethoprim-sulfamethoxazole toxicity, but it can be useful context when stacking antifolate drugs with methotrexate.",
        clinicalAction:"avoid or closely monitor high-risk antifolate stacks",
        evidenceRefs:["ev_mthfr_c677t_methotrexate_toxicity_meta"],
      },
    ],
    effects:{
      [GENOTYPE_RISK_STATUS.ABSENT]: { label:"C677T not detected / not homozygous", severity:"baseline", note:"No MTHFR C677T risk marker selected. This does not remove ordinary methotrexate or antifolate toxicity risk." },
      [GENOTYPE_RISK_STATUS.PRESENT]: { label:"C677T risk marker detected", severity:"moderate", note:"MTHFR C677T risk context selected. Treat as a review prompt for antifolate exposure and monitoring, not as a standalone prescribing rule." },
    },
  },
  "GABRG2 variant": {
    gene:"GABRG2",
    variant:"GABRG2 functional/pathogenic or rs211037 context",
    label:"GABRG2 variant",
    drugEffects:[
      {
        parent:"Diazepam",
        phenotype:"GABA-A receptor response context",
        note:"GABRG2 encodes the gamma-2 subunit of the GABA-A receptor. Variants are linked to epilepsy phenotypes and some studies/meta-analyses explore drug-resistant epilepsy, but evidence is not strong enough for an automatic benzodiazepine contraindication.",
        clinicalAction:"specialist review if epilepsy, seizure clusters, or unexpected benzodiazepine/anti-seizure response is present",
        evidenceRefs:["ev_gabrg2_epilepsy_drug_resistance_context"],
      },
      {
        parent:"Phenobarbital",
        phenotype:"GABA-A receptor response context",
        note:"GABA-A receptor genetics may affect seizure biology and anti-seizure response context. MedCheck Engine treats this as a review flag rather than a quantified PK effect.",
        clinicalAction:"specialist review; avoid changing anti-seizure therapy from this marker alone",
        evidenceRefs:["ev_gabrg2_epilepsy_drug_resistance_context"],
      },
    ],
    effects:{
      [GENOTYPE_RISK_STATUS.ABSENT]: { label:"not detected", severity:"baseline", note:"No GABRG2 risk marker selected. This does not exclude epilepsy risk or ordinary CNS depressant risk." },
      [GENOTYPE_RISK_STATUS.PRESENT]: { label:"variant detected", severity:"moderate", note:"GABRG2 variant context selected. Use as a neurologic/pharmacodynamic review flag, not as an automatic contraindication." },
    },
  },
  "SCN1A sodium-channel variant": {
    gene:"SCN1A",
    variant:"SCN1A pathogenic/functional variant context",
    label:"SCN1A sodium-channel variant",
    drugEffects:[
      {
        parent:"Carbamazepine",
        phenotype:"sodium-channel-blocker seizure worsening context",
        note:"SCN1A loss-of-function/Dravet-spectrum context can make sodium-channel blockers such as carbamazepine clinically hazardous because seizures may worsen. This is neurologic syndrome context, not a PK interaction.",
        clinicalAction:"specialist review; avoid sodium-channel blockers in Dravet/SCN1A loss-of-function contexts unless epilepsy specialist directs otherwise",
        evidenceRefs:["ev_scn_channel_epilepsy_pharmacogenetics_review"],
      },
      {
        parent:"Lamotrigine",
        phenotype:"sodium-channel-blocker seizure worsening context",
        note:"Lamotrigine is a sodium-channel blocker and may worsen seizures in some SCN1A loss-of-function/Dravet-spectrum settings despite being useful in other epilepsies.",
        clinicalAction:"specialist review; do not use genotype context alone without phenotype/variant interpretation",
        evidenceRefs:["ev_scn_channel_epilepsy_pharmacogenetics_review"],
      },
      {
        parent:"Phenytoin",
        phenotype:"sodium-channel-blocker seizure worsening context",
        note:"Phenytoin can be problematic in SCN1A loss-of-function/Dravet-spectrum contexts; emergency use and chronic use require specialist risk-benefit interpretation.",
        clinicalAction:"specialist review; prioritize seizure syndrome and variant effect",
        evidenceRefs:["ev_scn_channel_epilepsy_pharmacogenetics_review"],
      },
    ],
    effects:{
      [GENOTYPE_RISK_STATUS.ABSENT]: { label:"not detected", severity:"baseline", note:"No SCN1A sodium-channel risk marker selected. This does not exclude epilepsy syndrome risk or ordinary anti-seizure medication precautions." },
      [GENOTYPE_RISK_STATUS.PRESENT]: { label:"variant detected", severity:"high", note:"SCN1A sodium-channel variant context selected. Sodium-channel blockers can worsen some SCN1A/Dravet-spectrum epilepsies; specialist interpretation is needed." },
    },
  },
  "SCN2A sodium-channel variant": {
    gene:"SCN2A",
    variant:"SCN2A functional variant context",
    label:"SCN2A sodium-channel variant",
    drugEffects:[
      {
        parent:"Carbamazepine",
        phenotype:"variant-direction-dependent sodium-channel-blocker response",
        note:"SCN2A-related epilepsy can be gain- or loss-of-function. Sodium-channel blockers may help some gain-of-function presentations but can be inappropriate in others, so variant direction and age-of-onset matter.",
        clinicalAction:"specialist review; do not generalize from gene name alone",
        evidenceRefs:["ev_scn_channel_epilepsy_pharmacogenetics_review"],
      },
      {
        parent:"Lacosamide",
        phenotype:"variant-direction-dependent sodium-channel-blocker response",
        note:"Lacosamide is a sodium-channel modulator. SCN2A variant direction can change whether sodium-channel modulation is plausible or risky.",
        clinicalAction:"specialist review with molecular diagnosis and seizure phenotype",
        evidenceRefs:["ev_scn_channel_epilepsy_pharmacogenetics_review"],
      },
    ],
    effects:{
      [GENOTYPE_RISK_STATUS.ABSENT]: { label:"not detected", severity:"baseline", note:"No SCN2A sodium-channel risk marker selected." },
      [GENOTYPE_RISK_STATUS.PRESENT]: { label:"variant detected", severity:"moderate", note:"SCN2A variant context selected. Sodium-channel blocker response depends on gain- vs loss-of-function and epilepsy syndrome." },
    },
  },
  "KCNH2 long-QT variant": {
    gene:"KCNH2",
    variant:"KCNH2/LQT2 susceptibility context",
    label:"KCNH2 long-QT variant",
    drugEffects:[
      {
        parent:"Citalopram",
        phenotype:"drug-induced QT/TdP susceptibility",
        note:"KCNH2 encodes hERG/Kv11.1, a central channel in congenital and drug-induced long-QT biology. QT-risk medicines such as citalopram need extra ECG/electrolyte/interaction review when a long-QT susceptibility variant is present.",
        clinicalAction:"review QT alternatives, ECG, potassium/magnesium, dose ceiling, and other QT/CYP inhibitors",
        evidenceRefs:["ev_kcnh2_drug_induced_qt_pharmacogenetics"],
      },
      {
        parent:"Methadone",
        phenotype:"drug-induced QT/TdP susceptibility",
        note:"Methadone has dose- and exposure-related QT liability. KCNH2 long-QT susceptibility context should heighten ECG and interaction review.",
        clinicalAction:"review ECG plan, dose accumulation, CYP2B6/CYP3A interactions, and non-QT alternatives where appropriate",
        evidenceRefs:["ev_kcnh2_drug_induced_qt_pharmacogenetics"],
      },
      {
        parent:"Haloperidol",
        phenotype:"drug-induced QT/TdP susceptibility",
        note:"Haloperidol can prolong QT, especially IV/high-dose or with inhibitors/electrolyte disturbance. KCNH2 context should raise priority of QT-risk mitigation.",
        clinicalAction:"review route/dose, ECG, electrolytes, and alternative antipsychotics",
        evidenceRefs:["ev_kcnh2_drug_induced_qt_pharmacogenetics"],
      },
    ],
    effects:{
      [GENOTYPE_RISK_STATUS.ABSENT]: { label:"not detected", severity:"baseline", note:"No KCNH2 long-QT marker selected. This does not remove ordinary QT-risk checks." },
      [GENOTYPE_RISK_STATUS.PRESENT]: { label:"variant detected", severity:"high", note:"KCNH2/LQT2 susceptibility context selected. QT-risk medicines deserve ECG, electrolyte, dose, and interaction review." },
    },
  },
};

// activeGenotype — user-selected metabolizer phenotype per enzyme (runtime state)
// Format: { CYP2D6: 'normal_metabolizer', CYP2C19: 'normal_metabolizer', CYP2C9: 'normal_metabolizer' }
let activeGenotype = {
  CYP2D6:  GENOTYPE_PHENOTYPE.NM,
  CYP2C19: GENOTYPE_PHENOTYPE.NM,
  CYP2C9:  GENOTYPE_PHENOTYPE.NM,
  CYP2B6:  GENOTYPE_PHENOTYPE.NM,
  CYP3A4:  GENOTYPE_PHENOTYPE.NM,
  CYP3A5:  GENOTYPE_PHENOTYPE.NM,
  CYP3A7:  GENOTYPE_PHENOTYPE.NM,
  CYP2C8:  GENOTYPE_PHENOTYPE.NM,
  CYP2A6:  GENOTYPE_PHENOTYPE.NM,
  CYP1A2:  GENOTYPE_PHENOTYPE.NM,
  CYP2E1:  GENOTYPE_PHENOTYPE.NM,
  NAT2:    GENOTYPE_PHENOTYPE.NM,
  NAT1:    GENOTYPE_PHENOTYPE.NM,
  SLCO1B1: GENOTYPE_PHENOTYPE.NM,
  ABCB1:   GENOTYPE_PHENOTYPE.NM,
  ABCG2:   GENOTYPE_PHENOTYPE.NM,
  VKORC1:  GENOTYPE_PHENOTYPE.NM,
  CYP4F2:  GENOTYPE_PHENOTYPE.NM,
  DPYD:    GENOTYPE_PHENOTYPE.NM,
  TPMT:    GENOTYPE_PHENOTYPE.NM,
  UGT1A1:  GENOTYPE_PHENOTYPE.NM,
  UGT1A4:  GENOTYPE_PHENOTYPE.NM,
  UGT1A9:  GENOTYPE_PHENOTYPE.NM,
  UGT2B7:  GENOTYPE_PHENOTYPE.NM,
  UGT2B15: GENOTYPE_PHENOTYPE.NM,
  UGT2B17: GENOTYPE_PHENOTYPE.NM,
  COMT:    GENOTYPE_PHENOTYPE.NM,
  GSTM1:   GENOTYPE_PHENOTYPE.NM,
  GSTT1:   GENOTYPE_PHENOTYPE.NM,
  GSTP1:   GENOTYPE_PHENOTYPE.NM,
  NUDT15:  GENOTYPE_PHENOTYPE.NM,
  BCHE:    GENOTYPE_PHENOTYPE.NM,
  IFNL3:   GENOTYPE_PHENOTYPE.NM,
  IFNL4:   GENOTYPE_PHENOTYPE.NM,
  OPRM1:   GENOTYPE_PHENOTYPE.NM,
  SLC6A4:  GENOTYPE_PHENOTYPE.NM,
  HTR2A:   GENOTYPE_PHENOTYPE.NM,
  HTR2C:   GENOTYPE_PHENOTYPE.NM,
  DRD2:    GENOTYPE_PHENOTYPE.NM,
  ALDH2:   GENOTYPE_PHENOTYPE.NM,
  SLC22A1: GENOTYPE_PHENOTYPE.NM,
  SLC22A2: GENOTYPE_PHENOTYPE.NM,
  SLC47A1: GENOTYPE_PHENOTYPE.NM,
  "HLA-B*15:02": GENOTYPE_RISK_STATUS.ABSENT,
  "HLA-A*31:01": GENOTYPE_RISK_STATUS.ABSENT,
  "HLA-B*57:01": GENOTYPE_RISK_STATUS.ABSENT,
  "HLA-B*58:01": GENOTYPE_RISK_STATUS.ABSENT,
  "G6PD deficiency": GENOTYPE_RISK_STATUS.ABSENT,
  "MT-RNR1 m.1555A>G": GENOTYPE_RISK_STATUS.ABSENT,
  "RYR1/CACNA1S MH variant": GENOTYPE_RISK_STATUS.ABSENT,
  "HLA-B*13:01": GENOTYPE_RISK_STATUS.ABSENT,
  "HLA-A*32:01": GENOTYPE_RISK_STATUS.ABSENT,
  "MTHFR C677T": GENOTYPE_RISK_STATUS.ABSENT,
  "GABRG2 variant": GENOTYPE_RISK_STATUS.ABSENT,
  "SCN1A sodium-channel variant": GENOTYPE_RISK_STATUS.ABSENT,
  "SCN2A sodium-channel variant": GENOTYPE_RISK_STATUS.ABSENT,
  "KCNH2 long-QT variant": GENOTYPE_RISK_STATUS.ABSENT,
};

let activeGenotypeDetails = {};

function getGeneSemantics(gene) {
  const key = String(gene || "");
  if (GENE_SEMANTICS[key]) return GENE_SEMANTICS[key];
  const risk = typeof GENOTYPE_RISK_EFFECTS !== "undefined" ? GENOTYPE_RISK_EFFECTS[key] : null;
  if (risk) {
    return {
      axis:GENE_SEMANTIC_AXIS.RISK_ALLELE,
      phenotypeStateLabel:`${risk.label || key} risk marker`,
      modelUseLabel:"risk-allele safety context",
      phenoconversion:false,
      compartments:risk.gene && /^HLA/.test(risk.gene) ? ["immune"] : ["systemic"],
    };
  }
  return {
    axis:GENE_SEMANTIC_AXIS.ACTIVITY_SCORE,
    phenotypeStateLabel:`${key || "gene"} activity phenotype`,
    modelUseLabel:"phenotype exposure behavior",
    phenoconversion:true,
    compartments:["liver","systemic"],
  };
}

function getNullExposureMultiplier(gene) {
  const semantics = getGeneSemantics(gene);
  if (Number.isFinite(semantics.nullExposureFold)) return semantics.nullExposureFold;
  return GENOTYPE_EFFECTS?.[gene]?.[GENOTYPE_PHENOTYPE.PM]?.auc_fold || 1;
}

function compactPhenotypeKey(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[-\s/]+/g, "_");
}

function normalizeGenePhenotypeInput(gene, value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const key = compactPhenotypeKey(raw);
  const normalized = raw.toLowerCase().replace(/[_-]+/g, " ");
  const semantics = getGeneSemantics(gene);
  const base = {
    gene,
    reportedLabel:raw,
    source:"reported",
    confidence:"reported",
    axis:semantics.axis,
  };

  if (/^\s*(um|ultrarapid)\s*$/i.test(raw) || /ultra|increased function/.test(normalized)) {
    return { ...base, phenotype:GENOTYPE_PHENOTYPE.UM, mechanism:"inherited_high_activity" };
  }
  if (/^\s*(im|intermediate)\s*$/i.test(raw) || /intermediate|decreased function|reduced function|decreased expression|decreased\/intermediate/.test(normalized)) {
    return { ...base, phenotype:GENOTYPE_PHENOTYPE.IM, mechanism:"inherited_reduced_activity" };
  }
  if (/non ?express|nonexpress|no expression/.test(normalized)) {
    return { ...base, phenotype:GENOTYPE_PHENOTYPE.PM, mechanism:"inherited_low_expression" };
  }
  if (/null|no function|nonfunctional|deletion|deleted|absent|zero function/.test(normalized)) {
    const mechanism = semantics.axis === GENE_SEMANTIC_AXIS.COPY_NUMBER_NULL
      ? "copy_number_null"
      : (semantics.nullMechanism || "inherited_no_function");
    return { ...base, phenotype:GENOTYPE_PHENOTYPE.PM, mechanism };
  }
  if (/^\s*(pm|poor)\s*$/i.test(raw) || /poor|high warfarin sensitivity/.test(normalized)) {
    return { ...base, phenotype:GENOTYPE_PHENOTYPE.PM, mechanism:"inherited_low_activity" };
  }
  if (/deficient|deficiency/.test(normalized)) {
    return { ...base, phenotype:GENOTYPE_PHENOTYPE.PM, mechanism:semantics.nullMechanism || "inherited_deficiency" };
  }
  if (/^\s*(nm|normal)\s*$/i.test(raw) || /normal|reference|standard|expressor|normal function|normal metabolizer|present/.test(normalized)) {
    return { ...base, phenotype:GENOTYPE_PHENOTYPE.NM, mechanism:"reference" };
  }
  if (/^\s*(rm|rapid)\s*$/i.test(raw) || /rapid metabolizer/.test(normalized)) {
    return { ...base, phenotype:GENOTYPE_PHENOTYPE.UM, mechanism:"inherited_high_activity", note:"MedCheck Engine currently maps rapid metabolizer reports into the high-activity bucket." };
  }

  const directAliases = {
    POOR_METABOLIZER: GENOTYPE_PHENOTYPE.PM,
    INTERMEDIATE_METABOLIZER: GENOTYPE_PHENOTYPE.IM,
    NORMAL_METABOLIZER: GENOTYPE_PHENOTYPE.NM,
    ULTRA_RAPID: GENOTYPE_PHENOTYPE.UM,
    ULTRARAPID_METABOLIZER: GENOTYPE_PHENOTYPE.UM,
  };
  if (directAliases[key]) return { ...base, phenotype:directAliases[key], mechanism:"reported_phenotype" };
  if (Object.values(GENOTYPE_PHENOTYPE).includes(raw)) return { ...base, phenotype:raw, mechanism:"reported_phenotype" };
  return null;
}

function buildGeneInterpretation(gene, phenotype, details = {}) {
  const semantics = getGeneSemantics(gene);
  const report = details.reportedLabel || genotypeDisplayLabel(gene, phenotype);
  const mechanism = details.mechanism ||
    (phenotype === GENOTYPE_PHENOTYPE.NM ? "reference" : "reported_phenotype");
  const isNullLike = ["inherited_no_function","copy_number_null","inherited_deficiency","erythrocyte_deficiency"].includes(mechanism);
  const isLowExpression = mechanism === "inherited_low_expression" && phenotype === GENOTYPE_PHENOTYPE.PM;
  const state = details.functionalState ||
    ((isNullLike || isLowExpression) && semantics.nullStateLabel ? semantics.nullStateLabel : semantics.phenotypeStateLabel);
  return {
    gene,
    reportedLabel:report,
    phenotype,
    axis:semantics.axis,
    mechanism,
    functionalState:state,
    modelUse:details.modelUse || semantics.modelUseLabel || "phenotype exposure behavior",
    compartments:details.compartments || semantics.compartments || ["systemic"],
    phenoconversion:!!semantics.phenoconversion,
    confidence:details.confidence || "reported",
    note:details.note || "",
  };
}

function genotypeDisplayLabel(gene, phenotype) {
  const semantics = getGeneSemantics(gene);
  const semanticLabel = semantics.optionLabels?.[phenotype];
  if (semanticLabel) return semanticLabel;
  if (phenotype === GENOTYPE_PHENOTYPE.PM) return "PM";
  if (phenotype === GENOTYPE_PHENOTYPE.IM) return "IM";
  if (phenotype === GENOTYPE_PHENOTYPE.NM) return "NM";
  if (phenotype === GENOTYPE_PHENOTYPE.UM) return "UM";
  if (phenotype === GENOTYPE_RISK_STATUS.PRESENT) return "present";
  if (phenotype === GENOTYPE_RISK_STATUS.ABSENT) return "absent";
  return String(phenotype || "unknown");
}

function shouldUseLegacyNullState(gene, interpretation) {
  const semantics = getGeneSemantics(gene);
  if (!interpretation || !semantics.legacyNull) return false;
  return ["inherited_no_function","inherited_deficiency","erythrocyte_deficiency"].includes(interpretation.mechanism);
}

function buildRiskInterpretation(riskKey, status, details = {}) {
  const risk = typeof GENOTYPE_RISK_EFFECTS !== "undefined" ? GENOTYPE_RISK_EFFECTS[riskKey] : null;
  const label = risk?.label || riskKey;
  const riskEffect = risk?.effects?.[status];
  return {
    gene:riskKey,
    reportedLabel:details.reportedLabel || (status === GENOTYPE_RISK_STATUS.PRESENT ? "present" : "absent"),
    phenotype:status,
    axis:GENE_SEMANTIC_AXIS.RISK_ALLELE,
    mechanism:status === GENOTYPE_RISK_STATUS.PRESENT ? "risk_allele_present" : "risk_allele_absent",
    functionalState:status === GENOTYPE_RISK_STATUS.PRESENT ? `${label} detected` : `${label} not detected`,
    modelUse:"risk-allele safety context",
    compartments:risk?.gene && /^HLA/.test(risk.gene) ? ["immune"] : ["systemic"],
    phenoconversion:false,
    confidence:details.confidence || "reported",
    note:riskEffect?.note || "",
  };
}

// ── STUDY_DB ──
// First-class evidence entities. One study can support multiple graph edges.
// Contradictory evidence is explicitly tracked — real pharmacology disagrees.
//
// IMPORTANT: Every entry here has been curated from primary literature or
// regulatory documents. PMIDs marked verify:true should be independently
// confirmed before clinical use. AI hallucination risk applies — human
// pharmacist/physician review required before any clinical application.
//
