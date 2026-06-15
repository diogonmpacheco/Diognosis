// Diognosis — Food, endogenous, receptor, and phenotype actor definitions
// Phase A: modular source — concatenated by build.js

const FOOD_ACTORS = {
  "solanidine": {
    id:"solanidine", type:ACTOR_TYPE.FOOD,
    name:"Solanidine (α-solanine aglycone)",
    sources:["potato","tomato","eggplant"],
    routes:[{enzyme:"CYP2D6",fraction:0.4,evidence:{confidence:"low",sources:["literature"],pmid:["11678145"]}},{enzyme:"CYP3A4",fraction:0.3,evidence:{confidence:"low",sources:["literature"]}}],
    inh:[{target:"BChE",strength:"moderate",evidence:{confidence:"moderate",sources:["literature"],pmid:["7544290"]}},{target:"AChE",strength:"weak",evidence:{confidence:"moderate",sources:["literature"]}}],
    evidenceRefs:["ev_solanidine_cyp2d6_mock2001","ev_solanidine_cyp2d6_hellden2024"],
    persistence:{adiposeAccumulation:true, halfLife:48, note:"Lipophilic; accumulates with chronic exposure"},
    note:"Glycoalkaloid aglycone; CYP2D6 substrate with long t½ → chronic exposure burden in PM/null"
  },
  "bergamottin": {
    id:"bergamottin", type:ACTOR_TYPE.FOOD,
    name:"Bergamottin (6,7-dihydroxybergamottin)",
    sources:["grapefruit","seville_orange","pomelo"],
    routes:[],
    inh:[{target:"CYP3A4",strength:"strong",mechanism:"mechanism_based",evidence:{confidence:"high",sources:["FDA label","literature"],pmid:["12811365"]}},{target:"P-gp",strength:"moderate",evidence:{confidence:"high",sources:["literature"],pmid:["11687634"]}}],
    persistence:{gutWall:true, halfLife:24, note:"Destroys intestinal CYP3A4; recovery requires enzyme resynthesis (24-72h)"},
    note:"MBI of intestinal CYP3A4; single glass → 2-3 day inhibition; affects first-pass metabolism"
  },
  "indole-3-carbinol": {
    id:"indole-3-carbinol", type:ACTOR_TYPE.FOOD,
    name:"Indole-3-carbinol / DIM",
    sources:["broccoli","cabbage","brussels_sprouts","kale"],
    routes:[{enzyme:"CYP1A1",fraction:0.5}],
    inh:[],
    ind:[{target:"CYP1A2",strength:"moderate",evidence:{confidence:"moderate",sources:["literature"],pmid:["11010930"]}},{target:"CYP1A1",strength:"moderate",evidence:{confidence:"moderate",sources:["literature"]}}],
    persistence:{halfLife:4},
    note:"AhR agonist → induces CYP1A2; chronic high cruciferous intake ↓ CYP1A2 substrate exposure"
  },
  "allicin": {
    id:"allicin", type:ACTOR_TYPE.FOOD,
    name:"Allicin / Diallyl sulfide",
    sources:["garlic","onion"],
    routes:[{enzyme:"CYP2E1",fraction:0.6}],
    inh:[{target:"CYP2E1",strength:"moderate",evidence:{confidence:"moderate",sources:["literature"],pmid:["12424753"]}}],
    persistence:{halfLife:6},
    note:"CYP2E1 inhibitor → may reduce NAPQI formation from acetaminophen; protective effect"
  },
  "curcumin": {
    id:"curcumin", type:ACTOR_TYPE.FOOD,
    name:"Curcumin",
    sources:["turmeric"],
    routes:[{enzyme:"UGT",fraction:0.5},{enzyme:"SULT",fraction:0.3}],
    inh:[{target:"CYP2C9",strength:"moderate",evidence:{confidence:"moderate",sources:["literature"],pmid:["17692679"]}},{target:"CYP3A4",strength:"weak",evidence:{confidence:"low",sources:["literature"]}},{target:"UGT",strength:"weak",evidence:{confidence:"low",sources:["literature"]}}],
    persistence:{halfLife:2, note:"Very low oral bioavailability; gut effects predominate"},
    note:"Clinically relevant at supplement doses; ↑ warfarin/NSAID exposure via CYP2C9"
  },
  "piperine": {
    id:"piperine", type:ACTOR_TYPE.FOOD,
    name:"Piperine",
    sources:["black_pepper"],
    routes:[{enzyme:"CYP3A4",fraction:0.4},{enzyme:"CYP2D6",fraction:0.2}],
    inh:[{target:"CYP3A4",strength:"moderate",evidence:{confidence:"moderate",sources:["literature"],pmid:["9869591"]}},{target:"P-gp",strength:"moderate",evidence:{confidence:"moderate",sources:["literature"],pmid:["14757178"]}},{target:"UGT",strength:"weak",evidence:{confidence:"low",sources:["literature"]}}],
    persistence:{halfLife:6},
    note:"Often combined with curcumin to increase bioavailability; inhibits first-pass metabolism"
  },
  "st-johns-wort": {
    id:"st-johns-wort", type:ACTOR_TYPE.FOOD,
    name:"St John's Wort (Hypericum perforatum)",
    sources:["supplement","herbal_tea"],
    routes:[{enzyme:"CYP3A4",fraction:0.5},{enzyme:"CYP2C9",fraction:0.2}],
    inh:[],
    ind:[{target:"CYP3A4",strength:"strong",evidence:{confidence:"high",sources:["literature"],pmid:["11180019"]}},
         {target:"P-gp",strength:"strong",evidence:{confidence:"high",sources:["literature"],pmid:["11180019"]}},
         {target:"CYP2C9",strength:"moderate",evidence:{confidence:"moderate",sources:["literature"]}}],
    persistence:{halfLife:12, note:"Hyperforin-mediated PXR activation; 1-2 week onset and about 1 week offset after stopping"},
    note:"Strong CYP3A4/P-gp inducer via PXR. Can lower exposure to narrow-therapeutic-index CYP3A4/P-gp substrates, including transplant, antiviral, anticoagulant, contraceptive, and cardiac medicines."
  },
  "sulforaphane": {
    id:"sulforaphane", type:ACTOR_TYPE.FOOD,
    name:"Sulforaphane (Watercress / Broccoli sprouts)",
    sources:["watercress","broccoli_sprouts","broccoli"],
    routes:[{enzyme:"CYP1A2",fraction:0.3},{enzyme:"GSTM1",fraction:0.4}],
    inh:[],
    ind:[{target:"CYP1A2",strength:"moderate",evidence:{confidence:"moderate",sources:["literature"],pmid:["19843669"]}},
         {target:"GSTM1",strength:"moderate",evidence:{confidence:"low",sources:["literature"]}}],
    persistence:{halfLife:2, note:"Short parent exposure; pathway effects depend on ongoing intake"},
    note:"Cruciferous isothiocyanate context. Modeled as a CYP1A2/GSTM1 dietary signal, with genotype relevance strongest for GSTM1-null interpretation rather than acute DDI prediction."
  },
  "caffeine": {
    id:"caffeine", type:ACTOR_TYPE.FOOD,
    name:"Caffeine",
    sources:["coffee","tea","energy_drinks","cola"],
    routes:[{enzyme:"CYP1A2",fraction:0.95,evidence:{confidence:"high",sources:["literature"],pmid:["10942180"]}}],
    inh:[],
    ind:[],
    persistence:{halfLife:5},
    note:"Canonical CYP1A2 probe substrate. CYP1A2 inhibitors such as fluvoxamine or ciprofloxacin can raise caffeine exposure; smoking and cruciferous intake can lower it."
  },
  "quercetin": {
    id:"quercetin", type:ACTOR_TYPE.FOOD,
    name:"Quercetin",
    sources:["onions","apples","supplement"],
    routes:[{enzyme:"CYP3A4",fraction:0.3},{enzyme:"UGT",fraction:0.4}],
    inh:[{target:"OATP1B1",strength:"moderate",evidence:{confidence:"moderate",sources:["literature"],pmid:["22114872"]}},
         {target:"P-gp",strength:"weak",evidence:{confidence:"low",sources:["literature"],pmid:["20335952"]}}],
    ind:[],
    persistence:{halfLife:3, note:"Low oral bioavailability; gut/hepatic effects dominate"},
    note:"Flavonoid with in vitro OATP1B1/P-gp modulation. Treat as supplement-dose context; food-level exposure is usually lower and clinical direction may vary by substrate."
  },
  "resveratrol": {
    id:"resveratrol", type:ACTOR_TYPE.FOOD,
    name:"Resveratrol",
    sources:["red_wine","supplement","grapes"],
    routes:[{enzyme:"CYP1A1",fraction:0.3},{enzyme:"SULT",fraction:0.5}],
    inh:[{target:"CYP2C9",strength:"weak",evidence:{confidence:"low",sources:["literature"],pmid:["32985569"]}},
         {target:"BCRP",strength:"weak",evidence:{confidence:"low",sources:["literature"],pmid:["32985569"]}}],
    ind:[],
    persistence:{halfLife:2, note:"Very low bioavailability from food; clinical relevance mainly at supplement doses"},
    note:"Polyphenol with weak modeled CYP2C9/BCRP inhibition at supplement-dose context. Food-level red wine exposure should not be treated as equivalent to high-dose supplements."
  },
  "pomegranate-juice": {
    id:"pomegranate-juice", type:ACTOR_TYPE.FOOD,
    name:"Pomegranate Juice",
    sources:["pomegranate_juice"],
    routes:[],
    inh:[{target:"CYP3A4",strength:"weak",evidence:{confidence:"low",sources:["review"],pmid:["24813412"]}},
         {target:"CYP2C9",strength:"weak",evidence:{confidence:"low",sources:["review"],pmid:["24813412"]}}],
    ind:[],
    persistence:{halfLife:12, note:"Modeled conservatively because human clinical PK studies are mixed"},
    note:"Preclinical CYP3A4/CYP2C9 inhibition signal, but human substrate studies have often found little or no exposure change. Use as a low-confidence review prompt for narrow-therapeutic-index substrates."
  },
  "nac": {
    id:"nac", type:ACTOR_TYPE.FOOD,
    name:"N-Acetylcysteine (NAC)",
    sources:["supplement"],
    routes:[{enzyme:"GSTM1",fraction:0.5}],
    inh:[],
    ind:[],
    persistence:{halfLife:6},
    note:"Glutathione precursor and acetaminophen-overdose antidote context. Included for supplement-stack visibility and GSTM1/null discussions, not as a strong CYP interaction actor."
  },
  "coq10": {
    id:"coq10", type:ACTOR_TYPE.FOOD,
    name:"Coenzyme Q10 (Ubiquinone)",
    sources:["supplement"],
    routes:[{enzyme:"CYP3A4",fraction:0.3}],
    inh:[],
    ind:[],
    persistence:{halfLife:33, note:"Long t½; lipophilic; accumulates with supplementation"},
    note:"Supplement commonly used with statins. Case reports and mixed data describe possible warfarin response changes; modeled as context rather than enzyme inhibition."
  },
  "methylfolate": {
    id:"methylfolate", type:ACTOR_TYPE.FOOD,
    name:"L-Methylfolate (5-MTHF)",
    sources:["supplement","fortified_foods"],
    routes:[{enzyme:"DHFR",fraction:0.3}],
    inh:[],
    ind:[],
    persistence:{halfLife:3},
    note:"Active folate form bypassing MTHFR. Relevant to folate-pathway and methotrexate context, with no significant CYP interaction modeled."
  },
  "vitamin-d3": {
    id:"vitamin-d3", type:ACTOR_TYPE.FOOD,
    name:"Vitamin D3 (Cholecalciferol)",
    sources:["supplement","sunlight"],
    routes:[{enzyme:"CYP27B1",fraction:0.8},{enzyme:"CYP24A1",fraction:0.5}],
    inh:[],
    ind:[],
    persistence:{halfLife:720, note:"25-OH-D half-life is measured in weeks; fat-soluble depot"},
    note:"Vitamin D metabolism is linked to CYP24A1, CYP27B1, and alternative CYP3A4 catabolism under strong induction. Included for supplement-stack visibility and inducer context."
  },
};

// ── Endogenous Substrate Actors ──
// Endogenous compounds that compete for the same enzymes as drugs
const ENDOGENOUS_ACTORS = {
  "endogenous-morphine": {
    id:"endogenous-morphine", type:ACTOR_TYPE.ENDOGENOUS,
    name:"Endogenous morphine",
    routes:[{enzyme:"CYP2D6",fraction:0.6}],
    function:"Endogenous pain modulation via mu-opioid receptor",
    note:"Brain CYP2D6 converts codeine analogs; PM have altered endogenous opioid tone"
  },
  "tyramine": {
    id:"tyramine", type:ACTOR_TYPE.ENDOGENOUS,
    name:"Tyramine",
    sources:["aged_cheese","fermented_foods","wine"],
    routes:[{enzyme:"MAO-A",fraction:0.7},{enzyme:"MAO-B",fraction:0.2}],
    function:"Sympathomimetic amine; normally degraded by gut MAO",
    note:"MAO inhibitor + tyramine-rich food → hypertensive crisis"
  },
  "serotonin": {
    id:"serotonin", type:ACTOR_TYPE.ENDOGENOUS,
    name:"Serotonin (5-HT)",
    routes:[{enzyme:"MAO-A",fraction:0.8}],
    function:"Neurotransmitter; mood, sleep, GI motility",
    note:"SSRI + MAOi → serotonin accumulation → serotonin syndrome"
  },
  "dopamine": {
    id:"dopamine", type:ACTOR_TYPE.ENDOGENOUS,
    name:"Dopamine",
    routes:[{enzyme:"MAO-B",fraction:0.5},{enzyme:"COMT",fraction:0.4}],
    function:"Neurotransmitter; reward, motivation, motor control",
    note:"CYP2D6 involved in brain dopamine metabolism; PM may have altered dopaminergic tone"
  },
};

function getSupplementActor(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const slug = toGraphId(raw);
  return FOOD_ACTORS[raw] || FOOD_ACTORS[slug] ||
    ENDOGENOUS_ACTORS[raw] || ENDOGENOUS_ACTORS[slug] || null;
}

function getSupplementActorSearchTerms(actor) {
  if (!actor) return [];
  return [...new Set([
    actor.name,
    actor.id,
    ...(actor.sources || []).map(source => String(source || "").replace(/_/g, " ")),
    ...(actor.sources || []),
  ].filter(Boolean))];
}

function getStackEntryLabel(value) {
  const actor = getStackSupplementActor(value);
  if (actor) return actor.name;
  const drug = getStackDrug(value);
  if (drug) return drug.name;
  const fallbackActor = getSupplementActor(value);
  if (fallbackActor) return fallbackActor.name;
  return String(value || "");
}

function getStackSupplementActor(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  return FOOD_ACTORS[raw] || ENDOGENOUS_ACTORS[raw] || null;
}

function getStackDrug(value) {
  if (getStackSupplementActor(value)) return null;
  return typeof getDrug === "function" ? getDrug(value) : null;
}

function getActiveDrugNames(stack = activeStack) {
  return [...new Set((stack || []).map(name => {
    const drug = getStackDrug(name);
    return drug ? drug.name : null;
  }).filter(Boolean))];
}

// ── Receptor Actors ──
// Pharmacological receptors as first-class graph nodes.
// Drugs and metabolites can ACTIVATE, BLOCK, or INHIBIT these receptors.
// Receptors connect to Phenotype nodes via PRODUCES edges.
const RECEPTOR_ACTORS = {
  "mu-opioid-receptor": {
    id:"mu-opioid-receptor", type:ACTOR_TYPE.RECEPTOR, name:"μ-Opioid Receptor (MOR)",
    gene:"OPRM1", tissue:[TISSUE_COMPARTMENT.BRAIN, TISSUE_COMPARTMENT.LIVER, TISSUE_COMPARTMENT.GUT],
    function:"Pain suppression, reward, respiratory drive",
    note:"Activated by morphine, O-desmethyltramadol, oxymorphone, endorphins; blocked by naloxone/naltrexone",
    produces:["analgesia_phenotype","respiratory_depression_phenotype","reward_phenotype"],
  },
  "5-ht2a-receptor": {
    id:"5-ht2a-receptor", type:ACTOR_TYPE.RECEPTOR, name:"5-HT2A Receptor",
    gene:"HTR2A", tissue:[TISSUE_COMPARTMENT.BRAIN],
    function:"Serotonin receptor; mood, cognition, psychedelic effects",
    note:"Excess serotonin activation → serotonin syndrome when combined with serotonergic drugs",
    produces:["serotonin_syndrome_phenotype","mood_effect_phenotype"],
  },
  "d2-dopamine-receptor": {
    id:"d2-dopamine-receptor", type:ACTOR_TYPE.RECEPTOR, name:"D2 Dopamine Receptor",
    gene:"DRD2", tissue:[TISSUE_COMPARTMENT.BRAIN],
    function:"Dopaminergic signaling; reward, motor control, prolactin inhibition",
    note:"Blocked by antipsychotics; altered by CYP2D6 status via endogenous dopamine metabolism",
    produces:["antipsychotic_effect_phenotype","extrapyramidal_phenotype"],
  },
  "alpha1-adrenergic": {
    id:"alpha1-adrenergic", type:ACTOR_TYPE.RECEPTOR, name:"α1-Adrenergic Receptor",
    gene:"ADRA1A", tissue:[TISSUE_COMPARTMENT.BRAIN, TISSUE_COMPARTMENT.LIVER],
    function:"Vasoconstriction, sympathetic tone",
    note:"Blocked by TCAs/antipsychotics → orthostatic hypotension",
    produces:["hypotension_phenotype"],
  },
  "mao-a-enzyme": {
    id:"mao-a-enzyme", type:ACTOR_TYPE.RECEPTOR, name:"MAO-A (Monoamine Oxidase A)",
    gene:"MAOA", tissue:[TISSUE_COMPARTMENT.GUT, TISSUE_COMPARTMENT.BRAIN, TISSUE_COMPARTMENT.LIVER],
    function:"Degrades serotonin, noradrenaline, tyramine",
    note:"Inhibited by MAOIs; serotonin/tyramine accumulate → serotonin syndrome / hypertensive crisis",
    produces:["serotonin_syndrome_phenotype","tyramine_crisis_phenotype"],
  },
  "nr1i2-pregnane-x": {
    id:"nr1i2-pregnane-x", type:ACTOR_TYPE.RECEPTOR, name:"Pregnane X Receptor (PXR/NR1I2)",
    gene:"NR1I2", tissue:[TISSUE_COMPARTMENT.LIVER, TISSUE_COMPARTMENT.GUT],
    function:"Nuclear receptor; master regulator of CYP3A4/P-gp induction",
    note:"Activated by rifampin, St. John's Wort, carbamazepine → CYP3A4 ↑↑",
    produces:["cyp3a4_induction_phenotype"],
  },
};

// ── Phenotype Actors ──
// Observable outcomes that result from drug-receptor-enzyme interactions.
// These are terminal nodes in traversal — no further downstream edges.
// Severity: 'info' < 'monitor' < 'warn' < 'critical'
const PHENOTYPE_ACTORS = {
  "analgesia_phenotype": {
    id:"analgesia_phenotype", type:ACTOR_TYPE.PHENOTYPE, name:"Analgesic Effect",
    severity:"info", direction:"beneficial",
    note:"Produced by activation of mu-opioid receptor; reduced in CYP2D6 PM with prodrug opioids",
    requires:["mu-opioid-receptor"],
  },
  "respiratory_depression_phenotype": {
    id:"respiratory_depression_phenotype", type:ACTOR_TYPE.PHENOTYPE, name:"Respiratory Depression",
    severity:"critical", direction:"adverse",
    note:"Dose-dependent mu-opioid effect; amplified by CNS depressants, benzodiazepines, alcohol",
  },
  "serotonin_syndrome_phenotype": {
    id:"serotonin_syndrome_phenotype", type:ACTOR_TYPE.PHENOTYPE, name:"Serotonin Syndrome Risk",
    severity:"critical", direction:"adverse",
    note:"Triad: mental status change, autonomic instability, neuromuscular abnormalities; caused by excess 5-HT",
  },
  "tyramine_crisis_phenotype": {
    id:"tyramine_crisis_phenotype", type:ACTOR_TYPE.PHENOTYPE, name:"Hypertensive Crisis (Tyramine)",
    severity:"critical", direction:"adverse",
    note:"MAOi + tyramine-rich food → sympathomimetic surge → BP ↑↑↑; risk of stroke",
  },
  "cyp3a4_induction_phenotype": {
    id:"cyp3a4_induction_phenotype", type:ACTOR_TYPE.PHENOTYPE, name:"CYP3A4 Induction (↓ drug levels)",
    severity:"warn", direction:"adverse",
    note:"Downstream effect of PXR activation; reduces plasma levels of CYP3A4 substrates",
  },
  "cyp2d6_burden_phenotype": {
    id:"cyp2d6_burden_phenotype", type:ACTOR_TYPE.PHENOTYPE, name:"CYP2D6 Chronic Burden",
    severity:"monitor", direction:"adverse",
    note:"Persistent competitive occupancy of CYP2D6 by chronic substrates (solanidine, etc.) reduces xenobiotic metabolism capacity, amplified in PM/null genotypes",
  },
  "qtc_prolongation_phenotype": {
    id:"qtc_prolongation_phenotype", type:ACTOR_TYPE.PHENOTYPE, name:"QTc Prolongation Risk",
    severity:"warn", direction:"adverse",
    note:"Cardiac arrhythmia risk; additive with multiple QTc-prolonging drugs",
  },
  "hypotension_phenotype": {
    id:"hypotension_phenotype", type:ACTOR_TYPE.PHENOTYPE, name:"Orthostatic Hypotension",
    severity:"monitor", direction:"adverse",
    note:"Alpha1 blockade → loss of vascular tone → falls, dizziness",
  },
  "reward_phenotype": {
    id:"reward_phenotype", type:ACTOR_TYPE.PHENOTYPE, name:"Reward / Addiction Pathway",
    severity:"monitor", direction:"contextual",
    note:"Mu-opioid + dopaminergic activation; relevant for substance use risk assessment",
  },
  "antipsychotic_effect_phenotype": {
    id:"antipsychotic_effect_phenotype", type:ACTOR_TYPE.PHENOTYPE, name:"Antipsychotic Effect",
    severity:"info", direction:"beneficial",
    note:"D2 blockade reduces positive psychotic symptoms; CYP2D6 PM → higher D2 occupancy at same dose",
  },
  "extrapyramidal_phenotype": {
    id:"extrapyramidal_phenotype", type:ACTOR_TYPE.PHENOTYPE, name:"Extrapyramidal Side Effects",
    severity:"warn", direction:"adverse",
    note:"Excess D2 blockade → akathisia, parkinsonism, tardive dyskinesia; CYP2D6 PM at higher risk",
  },
  "mood_effect_phenotype": {
    id:"mood_effect_phenotype", type:ACTOR_TYPE.PHENOTYPE, name:"Mood / Antidepressant Effect",
    severity:"info", direction:"beneficial",
    note:"5-HT2A + other serotonin receptor modulation underpins SSRI antidepressant activity",
  },
  "prodrug_failure_phenotype": {
    id:"prodrug_failure_phenotype", type:ACTOR_TYPE.PHENOTYPE, name:"Prodrug Activation Failure",
    severity:"critical", direction:"adverse",
    note:"CYP2D6 or CYP2C19 inhibition → failure to form active metabolite → therapeutic failure (codeine, tamoxifen, clopidogrel)",
  },
};

// ── Enzyme Actors ──
// Enzymes as first-class actors in the graph with capacity and expression data
