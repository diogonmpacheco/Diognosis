// MedCheck — Metabolite database and actor definitions
// Phase A: modular source — concatenated by build.js

const METAB = {
// ── ACUTE STROKE / NEUROCRITICAL WORKFLOWS ──
"Alteplase":[
  {n:"Plasmin",e:"Plasminogen Activation",a:"active",p:100,t:0.1,note:"Functional fibrinolytic product; bleeding risk is pharmacodynamic rather than CYP-mediated.",evidenceRefs:["ev_stroke_neurocritical_workflow"]}
],
"Tenecteplase":[
  {n:"Tenecteplase-driven plasmin activity",e:"Plasminogen Activation",a:"active",p:100,t:0.33,note:"Functional fibrinolytic effect used in selected stroke/MI workflows.",evidenceRefs:["ev_stroke_neurocritical_workflow"]}
],
"Andexanet Alfa":[
  {n:"Andexanet-factor Xa inhibitor complex",e:"Drug Binding",a:"inactive",p:100,t:1,note:"Reversal complex that neutralizes apixaban/rivaroxaban anti-Xa activity.",evidenceRefs:["ev_stroke_neurocritical_workflow"]}
],
"Idarucizumab":[
  {n:"Idarucizumab-dabigatran complex",e:"Drug Binding",a:"inactive",p:100,t:0.75,note:"High-affinity reversal complex that neutralizes dabigatran anticoagulant activity.",evidenceRefs:["ev_stroke_neurocritical_workflow"]}
],
"Fosphenytoin":[
  {n:"Phenytoin",e:"Phosphatase",a:"active_form",p:95,t:22,note:"Rapid active conversion product; downstream interactions follow phenytoin protein binding, CYP2C9/CYP2C19 clearance, and enzyme induction.",evidenceRefs:["ev_stroke_neurocritical_workflow"]}
],
"Hypertonic Saline 3%":[
  {n:"Hypertonic sodium/chloride load",e:"Electrolyte/Volume Distribution",a:"active",p:100,t:0,note:"Osmotic sodium/chloride effect used for selected cerebral edema workflows.",evidenceRefs:["ev_stroke_neurocritical_workflow"]}
],
// ── STIMULANTS & SOCIAL ──
"Caffeine":[
  {n:"Paraxanthine (1,7-DMX)",e:"CYP1A2",a:"active",p:80,t:4,note:"Primary metabolite, CNS stimulant, ↑ lipolysis"},
  {n:"Theobromine (3,7-DMX)",e:"CYP1A2",a:"active",p:11,t:7,note:"Vasodilator, mild diuretic, found in chocolate"},
  {n:"Theophylline (1,3-DMX)",e:"CYP2E1",a:"active",p:4,t:8,note:"Bronchodilator — narrow therapeutic index drug",inh:[{e:"CYP1A2",s:"weak"}]},
  {n:"1-Methylxanthine",e:"CYP1A2",a:"inactive",p:3},
  {n:"1-Methyluric acid",e:"XO",a:"inactive",p:1},
  {n:"AAMU (5-acetylamino-6-amino-3-methyluracil)",e:"NAT2",a:"inactive",p:1,note:"NAT2 polymorphism affects ratio"}
],
"Nicotine":[
  {n:"Cotinine",e:"CYP2A6",a:"active",p:70,t:16,note:"Primary metabolite, biomarker for tobacco exposure"},
  {n:"Nicotine-N'-oxide",e:"FMO3",a:"inactive",p:5},
  {n:"Nornicotine",e:"CYP2A6",a:"active",p:5,t:8,note:"Weak nicotinic agonist"},
  {n:"Trans-3'-hydroxycotinine",e:"CYP2A6",a:"inactive",p:15,t:6,note:"Main urinary metabolite"},
  {n:"Nicotine glucuronide",e:"UGT",a:"inactive",p:3},
  {n:"Cotinine glucuronide",e:"UGT",a:"inactive",p:2}
],
"Cocaine":[
  {n:"Benzoylecgonine",e:"Esterase",a:"inactive",p:45,t:6,note:"Primary urinary metabolite, detection marker"},
  {n:"Ecgonine methyl ester",e:"BChE",a:"inactive",p:40,t:4},
  {n:"Norcocaine",e:"CYP3A4",a:"active",p:5,t:2,note:"Hepatotoxic, crosses BBB",inh:[{e:"CYP2D6",s:"weak"}]},
  {n:"Cocaethylene",e:"CYP3A4",a:"toxic",p:0,t:5,note:"ONLY formed with ethanol co-ingestion. Equal cardiotoxicity, 5× longer t½"},
  {n:"Hydroxynorcocaine",e:"CYP3A4",a:"toxic",p:2,note:"Further hepatotoxic metabolite"}
],
"Atomoxetine":[
  {n:"4-Hydroxyatomoxetine",e:"CYP2D6",a:"active",p:60,t:6,note:"Primary active metabolite; equipotent NET inhibitor. Formation severely impaired in CYP2D6 PM; pediatric population PK public abstracts support large CYP2D6 activity-score effects on clearance and metabolite balance.",evidenceRefs:["ev_atomoxetine_cyp2d6_cpic","ev_atomoxetine_cyp2d6_pbpk2018","ev_atomoxetine_pop_pk_shen2023","ev_atomoxetine_pop_pk_tobin2026"]},
  {n:"4-Hydroxyatomoxetine glucuronide",e:"UGT1A2",a:"inactive",p:25,note:"Major excretory metabolite"},
  {n:"N-Desmethylatomoxetine",e:"CYP2C19",a:"weak",p:10,t:8,note:"Minor pathway; modest NET activity"},
  {n:"Atomoxetine (unchanged)",e:"Renal",a:"active",p:5,note:"<3% unchanged in urine"}
],
"Amphetamine":[
  {n:"4-Hydroxyamphetamine",e:"CYP2D6",a:"active",p:30,t:8,note:"Active metabolite",evidenceRefs:["ev_amphetamine_cyp2d6_fda","ev_mdma_meth_cyp2d6_review"]},
  {n:"Norephedrine (phenylpropanolamine)",e:"DBH",a:"active",p:5,t:4,note:"Weak sympathomimetic"},
  {n:"Benzoic acid",e:"MAO",a:"inactive",p:30},
  {n:"Hippuric acid",e:"Conjugation",a:"inactive",p:15},
  {n:"Amphetamine (unchanged)",e:"Renal",a:"active",p:20,note:"30-40% excreted unchanged (pH dependent)"}
],
"Lisdexamfetamine":[
  {n:"d-Amphetamine (dextroamphetamine)",e:"RBC peptidases",a:"active_form",role:"active_form",p:100,t:10,note:"Active stimulant released by red blood cell hydrolysis; prodrug activation is CYP-independent",evidenceRefs:["ev_lisdexamfetamine_rbc_activation","ev_lisdexamfetamine_cyp2d6_fda"]},
  {n:"L-lysine",e:"Hydrolysis",a:"inactive",p:100,note:"Benign amino acid coproduct of lisdexamfetamine activation"},
  {n:"d-Amphetamine (unchanged renal)",e:"Renal",a:"active",p:30,note:"Renal clearance is strongly urinary-pH dependent"}
],
"Methamphetamine":[
  {n:"Amphetamine",e:"CYP2D6",a:"active",p:15,t:10,note:"Active metabolite — IS a scheduled drug itself",evidenceRefs:["ev_mdma_meth_cyp2d6_review"]},
  {n:"4-Hydroxymethamphetamine",e:"CYP2D6",a:"active",p:20,t:6,evidenceRefs:["ev_mdma_meth_cyp2d6_review"]},
  {n:"Norephedrine",e:"Beta-hydroxylation",a:"active",p:5,t:4,note:"Active sympathomimetic; not treated as a CYP2D6-specific relation in the current graph"},
  {n:"Methamphetamine (unchanged)",e:"Renal",a:"active",p:40,note:"Heavily pH-dependent renal clearance"}
],

// ── EMPATHOGENS ──
"MDMA (Ecstasy)":[
  {n:"MDA (tenamfetamine)",e:"CYP3A4",a:"active",p:10,t:12,note:"Minor N-demethylation product; active empathogen and neurotoxic",inh:[{e:"CYP2D6",s:"moderate"}],evidenceRefs:["ev_mdma_meth_cyp2d6_review"]},
  {n:"HHMA (3,4-dihydroxymethamphetamine)",e:"CYP2D6",a:"active",p:30,t:3,note:"Catechol metabolite → oxidative stress; CYP2D6-mediated O-demethylenation",inh:[{e:"CYP2D6",s:"strong"}],evidenceRefs:["ev_mdma_meth_cyp2d6_review"]},
  {n:"HMMA (4-hydroxy-3-methoxymethamphetamine)",e:"COMT",a:"inactive",p:25},
  {n:"HHA (3,4-dihydroxyamphetamine)",e:"CYP2D6",a:"toxic",p:10,t:4,note:"Neurotoxic quinone precursor",evidenceRefs:["ev_mdma_meth_cyp2d6_review"]},
  {n:"HMA (4-hydroxy-3-methoxyamphetamine)",e:"COMT",a:"inactive",p:15},
  {n:"MDMA-thioether conjugates",e:"GST",a:"toxic",p:5,note:"Nephrotoxic in rats"}
],
"MDA":[
  {n:"HHA (3,4-dihydroxyamphetamine)",e:"CYP2D6",a:"toxic",p:30,t:4,note:"Neurotoxic catechol/quinone precursor",evidenceRefs:["ev_mdma_meth_cyp2d6_review"]},
  {n:"HMA",e:"COMT",a:"inactive",p:40},
  {n:"MDA (unchanged)",e:"Renal",a:"active",p:20}
],

// ── PSYCHEDELICS ──
"LSD":[
  {n:"2-Oxo-3-hydroxy-LSD (O-H-LSD)",e:"CYP3A4",a:"inactive",p:40,t:12,note:"Primary urinary metabolite, detection marker"},
  {n:"Nor-LSD",e:"CYP2D6",a:"active",p:20,t:6,note:"Weak 5-HT2A agonist; minor CYP2D6-contributing pathway",evidenceRefs:["ev_lsd_cyp2d6_holze2021"]},
  {n:"13-Hydroxy-LSD",e:"CYP1A2",a:"inactive",p:15},
  {n:"Lysergic acid ethylamide (LAE)",e:"CYP3A4",a:"inactive",p:10},
  {n:"LSD glucuronide",e:"UGT",a:"inactive",p:10}
],
"Psilocybin":[
  {n:"Psilocin (4-HO-DMT)",e:"ALP",a:"active_form",role:"active_form",p:90,t:3,note:"THE active compound — psilocybin is a prodrug. 5-HT2A agonist"},
  {n:"4-Hydroxyindole-3-acetic acid (4-HIAA)",e:"MAO-A",a:"inactive",p:5},
  {n:"Psilocin glucuronide",e:"UGT",a:"inactive",p:5}
],
"2C-B":[
  {n:"4-Bromo-2,5-dimethoxyphenethylamine (deaminated)",e:"MAO-A",a:"inactive",p:40},
  {n:"2-(4-Bromo-2,5-dimethoxyphenyl)ethanol",e:"ADH",a:"inactive",p:25},
  {n:"Demethylated 2C-B",e:"O-demethylation",a:"active",p:20,t:3,note:"Enzyme assignment not treated as a CYP2D6 genotype edge until primary evidence is added"},
  {n:"2C-B (unchanged)",e:"Renal",a:"active",p:15}
],
"2C-I":[
  {n:"Deaminated 2C-I",e:"MAO-A",a:"inactive",p:40},
  {n:"Demethylated 2C-I",e:"O-demethylation",a:"active",p:25,note:"Enzyme assignment not treated as a CYP2D6 genotype edge until primary evidence is added"},
  {n:"2C-I (unchanged)",e:"Renal",a:"active",p:15}
],
"DMT":[
  {n:"Indole-3-acetic acid (IAA)",e:"MAO-A",a:"inactive",p:90,t:0.1,note:"Rapidly degraded by MAO — oral DMT inactive without MAOI"},
  {n:"DMT-N-oxide",e:"FMO",a:"inactive",p:5},
  {n:"2-Methyl-1,2,3,4-tetrahydro-β-carboline",e:"Spontaneous",a:"active",p:2,note:"Trace, formed in vivo"}
],
"Ayahuasca (DMT+MAOI)":[
  {n:"DMT (protected from MAO)",e:"Oral",a:"active",p:40,t:1,note:"Harmine/harmaline block MAO-A, allowing oral DMT activity"},
  {n:"Harmine → Harmol",e:"CYP2D6",a:"inactive",p:20,note:"O-demethylation; CYP1A enzymes also contribute",evidenceRefs:["ev_harmala_cyp2d6_yu2003"]},
  {n:"Harmaline → Harmalol",e:"CYP2D6",a:"inactive",p:15,note:"O-demethylation; CYP1A enzymes also contribute",evidenceRefs:["ev_harmala_cyp2d6_yu2003","ev_harmaline_cyp2d6_wu2009"]},
  {n:"THH (tetrahydroharmine)",e:"MAO-A",a:"active",p:15,note:"Weak SSRI + MAO-A inhibitor"}
],
"Mescaline":[
  {n:"3,4,5-Trimethoxyphenylacetic acid",e:"MAO-A",a:"inactive",p:60,t:6},
  {n:"N-Acetylmescaline",e:"NAT",a:"inactive",p:15},
  {n:"Mescaline (unchanged)",e:"Renal",a:"active",p:20}
],
"Ketamine":[
  {n:"Norketamine",e:"CYP3A4",a:"active",p:80,t:5,note:"~30% potency of ketamine, NMDA antagonist"},
  {n:"Dehydronorketamine (DHNK)",e:"CYP2B6",a:"active",p:10,t:12,note:"Weak activity, long-lived"},
  {n:"6-Hydroxynorketamine (6-HNK)",e:"CYP2A6",a:"active",p:5,t:4,note:"Antidepressant effects (non-NMDA)"},
  {n:"Norketamine glucuronide",e:"UGT",a:"inactive",p:5}
],
"PCP":[
  {n:"4-Phenyl-4-piperidinecyclohexanol",e:"CYP3A4",a:"active",p:40,t:15},
  {n:"PPC (1-(1-phenylcyclohexyl)-4-hydroxypiperidine)",e:"CYP2B6",a:"active",p:30,t:10},
  {n:"PCP (unchanged, enterohepatic)",e:"Renal",a:"active",p:10,note:"Ion trapping in acidic urine"}
],
"DXM (Dextromethorphan)":[
  {n:"Dextrorphan (DXO)",e:"CYP2D6",a:"active_form",role:"active_form",p:70,t:3,note:"Primary active metabolite — NMDA antagonist + σ1 agonist",evidenceRefs:["ev_dxm_dextrorphan_cyp2d6"]},
  {n:"3-Methoxymorphinan (3-MM)",e:"CYP3A4",a:"inactive",p:15},
  {n:"3-Hydroxymorphinan (3-HM)",e:"CYP2D6",a:"inactive",p:10,evidenceRefs:["ev_dxm_dextrorphan_cyp2d6"]},
  {n:"DXM (unchanged in PM)",e:"Renal",a:"active",p:5,note:"CYP2D6 PMs accumulate parent DXM — dissociative effects",evidenceRefs:["ev_dxm_dextrorphan_cyp2d6"]}
],
"GHB":[
  {n:"Succinic semialdehyde (SSA)",e:"GHB-DH",a:"inactive",p:95,t:0.3},
  {n:"Succinic acid → Krebs cycle",e:"SSADH",a:"inactive",p:95,note:"Enters normal energy metabolism"},
  {n:"GHB (unchanged)",e:"Renal",a:"active",p:5,note:"Saturable metabolism — nonlinear kinetics"}
],
"Cannabis (THC)":[
  {n:"11-Hydroxy-THC (11-OH-THC)",e:"CYP2C9",a:"active",p:40,t:2,note:"MORE potent than THC at CB1. Dominant after oral ingestion"},
  {n:"11-Nor-9-carboxy-THC (THC-COOH)",e:"CYP2C9",a:"inactive",p:40,t:50,note:"Detection marker, very long t½"},
  {n:"THC-COOH glucuronide",e:"UGT",a:"inactive",p:10,note:"Main urinary analyte in drug testing"},
  {n:"8β-Hydroxy-THC",e:"CYP3A4",a:"active",p:5},
  {n:"THC (unchanged)",e:"Adipose",a:"active",p:5,note:"Lipophilic — stored in fat tissue"}
],
"Cannabis (CBD)":[
  {n:"7-Hydroxy-CBD (7-OH-CBD)",e:"CYP2C19",a:"active",p:35,t:4,note:"Active metabolite",inh:[{e:"CYP2C19",s:"strong"}]},
  {n:"6α-Hydroxy-CBD",e:"CYP3A4",a:"active",p:20},
  {n:"7-COOH-CBD",e:"CYP2C19",a:"inactive",p:20},
  {n:"CBD-glucuronide",e:"UGT",a:"inactive",p:15},
  {n:"4'-Hydroxy-CBD",e:"CYP3A4",a:"inactive",p:10}
],
"Potatoes (Solanine/Solanidine)":[
  {n:"Solanidine (α-solanine/α-chaconine aglycone)",e:"Gut hydrolysis",a:"active",p:60,t:48,note:"Potato glycoalkaloid aglycone; in vitro CYP2D6/CYP3A4 substrate and diet-derived CYP2D6 activity biomarker. CYP2D6 null status changes biomarker exposure, but food toxicity depends mostly on total glycoalkaloid dose and exposure context.",evidenceRefs:["ev_solanidine_cyp2d6_mock2001","ev_solanidine_cyp2d6_hellden2024","ev_potato_glycoalkaloid_human_pk_mensinga2005"]},
  {n:"4-OH-solanidine",e:"CYP2D6",a:"inactive",p:25,t:8,note:"CYP2D6-formed solanidine metabolite. Metabolite/parent ratio falls sharply with strong CYP2D6 inhibition and likely CYP2D6 null function.",evidenceRefs:["ev_solanidine_metabolites_tamoxifen_2024"]},
  {n:"3,4-seco-solanidine-3,4-dioic acid (SSDA)",e:"CYP2D6",a:"inactive",p:15,t:12,note:"Urinary/plasma solanidine-derived downstream oxidation biomarker. SSDA/solanidine ratio is a sensitive CYP2D6 activity signal.",evidenceRefs:["ev_solanidine_metabolites_tamoxifen_2024","ev_solanidine_ssda_tay2022"]},
  {n:"α-Solanine",e:"Dietary glycoalkaloid",a:"active",p:35,t:11,note:"Parent potato glycoalkaloid. Human volunteer and EFSA review data support GI/systemic toxicity framing at high exposure; apparent half-life is roughly 11 h but estimates are limited by short sampling windows.",evidenceRefs:["ev_potato_glycoalkaloid_human_pk_mensinga2005","ev_potato_glycoalkaloid_efsa_2020"]},
  {n:"α-Chaconine",e:"Dietary glycoalkaloid",a:"active",p:45,t:19,note:"Major potato glycoalkaloid often exceeding α-solanine. It shares the solanidine aglycone and is important for combined potato glycoalkaloid toxicity/exposure review; apparent half-life is roughly 19 h in the human volunteer study.",evidenceRefs:["ev_potato_glycoalkaloid_human_pk_mensinga2005","ev_potato_glycoalkaloid_efsa_2020"]},
  {n:"α-Solanine + α-Chaconine membrane/cholinesterase toxicity context",e:"Dietary glycoalkaloids",a:"toxic",p:50,note:"Food-toxicology effect layer: GI membrane disruption and cholinesterase inhibition are more relevant to acute glycoalkaloid toxicity than CYP2D6 biomarker changes alone.",evidenceRefs:["ev_solanidine_ache_griffin1995","ev_potato_glycoalkaloid_toxicology_review_1990","ev_potato_glycoalkaloid_efsa_2020"]}
],
"Cruciferous Vegetables (Isothiocyanates)":[
  {n:"Sulforaphane",e:"Myrosinase / gut microbiome",a:"active",p:45,t:2,note:"Bioactive isothiocyanate formed from glucoraphanin; GST-mediated mercapturic acid pathway controls elimination and exposure duration.",evidenceRefs:["ev_cruciferous_isothiocyanate_gstm1_2005","ev_watercress_itc_gst_2009"]},
  {n:"Phenethyl isothiocyanate (PEITC)",e:"Myrosinase / gut microbiome",a:"active",p:35,t:2,note:"Watercress-derived isothiocyanate. GSTM1/GSTT1 null status can slow excretion and prolong exposure.",evidenceRefs:["ev_watercress_itc_gst_2009"]},
  {n:"Isothiocyanate mercapturic acids",e:"GST/GSH → mercapturic acid pathway",a:"inactive",p:80,t:6,note:"Urinary conjugates used to track isothiocyanate clearance. Null GST genotypes can change elimination kinetics.",evidenceRefs:["ev_cruciferous_isothiocyanate_gstm1_2005","ev_watercress_itc_gst_2009"]}
],
"Cinnamon / Coumarin":[
  {n:"7-Hydroxycoumarin",e:"CYP2A6",a:"inactive",p:80,t:2,note:"Primary human detoxification product. CYP2A6 poor/intermediate function can reduce this preferred pathway.",evidenceRefs:["ev_coumarin_cyp2a6_hepatotoxicity_review"]},
  {n:"Coumarin-3,4-epoxide / o-HPA",e:"CYP2E1",a:"toxic",p:10,t:1,note:"Minor CYP1A2/CYP2E1/CYP3A4 ring-opening pathway linked to hepatotoxicity concern. More relevant when 7-hydroxylation is low or exposure is high/chronic.",evidenceRefs:["ev_coumarin_cyp2a6_hepatotoxicity_review"]}
],

// ── DEPRESSANTS ──
"Alcohol (Ethanol)":[
  {n:"Acetaldehyde",e:"ADH",a:"toxic",p:95,t:0.5,note:"TOXIC — causes flushing, nausea, DNA damage. ALDH2*2 carriers accumulate this"},
  {n:"Acetic acid → Acetyl-CoA",e:"ALDH2",a:"inactive",p:95,note:"Enters Krebs cycle for energy"},
  {n:"Ethyl glucuronide (EtG)",e:"UGT",a:"inactive",p:0.1,note:"Detection marker up to 80h post-drinking"},
  {n:"Ethyl sulfate (EtS)",e:"SULT",a:"inactive",p:0.1,note:"Detection marker"},
  {n:"Fatty acid ethyl esters (FAEE)",e:"Esterase",a:"toxic",p:0.5,note:"Organ damage marker, found in hair"}
],

// ── SSRIs ──
"Fluoxetine":[
  {n:"Norfluoxetine",e:"CYP2D6/CYP2C9",a:"active",p:80,t:240,note:"POTENT CYP2D6 inhibitor, t½ 4-16 DAYS; CYP2D6 primary with CYP2C9/CYP2C19/CYP3A4 secondary contributors",evidenceRefs:["ev_fluoxetine_cyp2d6_fda","ev_fluoxetine_cyp2d6_sunkara2010"],inh:[{e:"CYP2D6",s:"strong"},{e:"CYP2C19",s:"moderate"}]},
  {n:"Fluoxetine glucuronide",e:"UGT",a:"inactive",p:10},
  {n:"p-Trifluoromethylphenol",e:"CYP2D6",a:"inactive",p:10,evidenceRefs:["ev_fluoxetine_cyp2d6_fda","ev_ssri_cyp2d6_review"]}
],
"Paroxetine":[
  {n:"M1 catechol metabolite",e:"CYP2D6",a:"inactive",p:60,inh:[{e:"CYP2D6",s:"strong"}],note:"Mechanism-based CYP2D6 inhibitor (irreversible)",evidenceRefs:["ev_paroxetine_cyp2d6_fda","ev_paroxetine_cyp2d6_invitro"]},
  {n:"M2 methylenedioxy ring-opened",e:"CYP2D6",a:"inactive",p:20,evidenceRefs:["ev_paroxetine_cyp2d6_fda","ev_paroxetine_cyp2d6_invitro"]},
  {n:"Paroxetine glucuronide",e:"UGT",a:"inactive",p:15},
  {n:"Paroxetine sulfate",e:"SULT",a:"inactive",p:5}
],
"Sertraline":[
  {n:"N-Desmethylsertraline",e:"CYP2B6",a:"active",p:70,t:66,note:"~10% potency of parent, long t½",inh:[{e:"CYP2D6",s:"weak"},{e:"CYP2B6",s:"weak"}]},
  {n:"Sertraline glucuronide",e:"UGT",a:"inactive",p:15},
  {n:"Sertraline ketone",e:"CYP3A4",a:"inactive",p:10}
],
"Citalopram":[
  {n:"N-Desmethylcitalopram (DCIT)",e:"CYP2C19",a:"active",p:50,t:50,note:"~50% SERT potency"},
  {n:"Didesmethylcitalopram (DDCIT)",e:"CYP2D6",a:"active",p:20,t:100,note:"Weak activity, very long t½",evidenceRefs:["ev_citalopram_cyp2d6_oestad2003"]},
  {n:"Citalopram N-oxide",e:"CYP3A4",a:"inactive",p:15},
  {n:"Propionic acid derivative",e:"MAO",a:"inactive",p:10}
],
"Escitalopram":[
  {n:"S-Desmethylcitalopram (S-DCIT)",e:"CYP2C19",a:"active",p:50,t:50},
  {n:"S-Didesmethylcitalopram (S-DDCIT)",e:"CYP2D6",a:"active",p:20,t:100,evidenceRefs:["ev_citalopram_cyp2d6_oestad2003"]},
  {n:"Escitalopram N-oxide",e:"CYP3A4",a:"inactive",p:15}
],
"Fluvoxamine":[
  {n:"Fluvoxamine acid",e:"CYP2D6",a:"inactive",p:60,note:"Oxidative deamination product; CYP2D6 is a secondary contributor",evidenceRefs:["ev_ssri_cyp2d6_review"]},
  {n:"Fluvoxamine N-oxide",e:"FMO",a:"inactive",p:20},
  {n:"Fluvoxamine glucuronide",e:"UGT",a:"inactive",p:15}
],

// ── SNRIs ──
"Venlafaxine":[
  {n:"O-Desmethylvenlafaxine (desvenlafaxine)",e:"CYP2D6",a:"active",p:56,t:11,note:"EQUIPOTENT — sold separately as Pristiq",evidenceRefs:["ev_venlafaxine_cyp2d6_ncbi"]},
  {n:"N-Desmethylvenlafaxine",e:"CYP3A4",a:"active",p:16,t:10},
  {n:"N,O-Didesmethylvenlafaxine",e:"CYP2D6",a:"active",p:5,t:13,evidenceRefs:["ev_venlafaxine_cyp2d6_ncbi"]}
],
"Duloxetine":[
  {n:"4-Hydroxyduloxetine glucuronide",e:"CYP2D6",a:"inactive",p:40,evidenceRefs:["ev_ssri_cyp2d6_review"]},
  {n:"5-Hydroxy-6-methoxy duloxetine glucuronide",e:"CYP1A2",a:"inactive",p:30},
  {n:"Duloxetine sulfate",e:"SULT",a:"inactive",p:20}
],
"Desvenlafaxine":[
  {n:"Desvenlafaxine glucuronide",e:"UGT",a:"inactive",p:55,note:"Main metabolic pathway — minimal CYP involvement"},
  {n:"N-Desmethyldesvenlafaxine",e:"CYP3A4",a:"inactive",p:15}
],

// ── TCAs ──
"Amitriptyline":[
  {n:"Nortriptyline",e:"CYP2C19",a:"active",p:50,t:30,note:"Active metabolite — itself a marketed antidepressant"},
  {n:"10-Hydroxyamitriptyline",e:"CYP2D6",a:"active",p:15,evidenceRefs:["ev_tca_cyp2d6_cpic"]},
  {n:"10-Hydroxynortriptyline",e:"CYP2D6",a:"active",p:10,evidenceRefs:["ev_tca_cyp2d6_cpic"]},
  {n:"Amitriptyline N-oxide",e:"CYP3A4",a:"inactive",p:10}
],
"Nortriptyline":[
  {n:"10-Hydroxynortriptyline",e:"CYP2D6",a:"active",p:60,t:20,note:"Active, CYP2D6-dependent",evidenceRefs:["ev_tca_cyp2d6_cpic"]},
  {n:"Desmethylnortriptyline",e:"CYP2D6",a:"inactive",p:20,evidenceRefs:["ev_tca_cyp2d6_cpic"]},
  {n:"Nortriptyline glucuronide",e:"UGT",a:"inactive",p:15}
],
"Imipramine":[
  {n:"Desipramine",e:"CYP2C19",a:"active",p:50,t:20,note:"Active — itself a marketed TCA (potent NRI)"},
  {n:"2-Hydroxyimipramine",e:"CYP2D6",a:"active",p:15,evidenceRefs:["ev_tca_cyp2d6_cpic"]},
  {n:"2-Hydroxydesipramine",e:"CYP2D6",a:"active",p:10,evidenceRefs:["ev_tca_cyp2d6_cpic"]},
  {n:"Iminodibenzyl",e:"CYP1A2",a:"inactive",p:10}
],
"Clomipramine":[
  {n:"N-Desmethylclomipramine",e:"CYP2C19",a:"active",p:50,t:36,note:"Active — more NRI than parent"},
  {n:"8-Hydroxyclomipramine",e:"CYP2D6",a:"active",p:15,evidenceRefs:["ev_tca_cyp2d6_cpic"]},
  {n:"Clomipramine N-oxide",e:"CYP3A4",a:"inactive",p:10}
],
"Doxepin":[
  {n:"N-Desmethyldoxepin (nordoxepin)",e:"CYP2C19",a:"active",p:50,t:30,note:"Active NRI"},
  {n:"Doxepin glucuronide",e:"UGT",a:"inactive",p:20},
  {n:"Hydroxydoxepin",e:"CYP2D6",a:"inactive",p:15,evidenceRefs:["ev_tca_cyp2d6_cpic"]}
],

// ── OTHER ANTIDEPRESSANTS ──
"Bupropion":[
  {n:"Hydroxybupropion (R,R-OH-bupropion)",e:"CYP2B6",a:"active",p:45,t:20,note:"~50% potency, strong CYP2D6 inhibitor, t½ LONGER than parent",evidenceRefs:["ev_bupropion_cyp2d6_fda","ev_bupropion_cyp2d6_kotlyar2005"],inh:[{e:"CYP2D6",s:"strong"},{e:"CYP2B6",s:"moderate"},{e:"CYP2C19",s:"weak"}]},
  {n:"Threohydrobupropion",e:"Carbonyl-R",a:"active",p:25,t:37,note:"Active, reductase pathway"},
  {n:"Erythrohydrobupropion",e:"Carbonyl-R",a:"active",p:20,t:33,note:"Active, reductase pathway"},
  {n:"Bupropion glucuronide",e:"UGT",a:"inactive",p:5}
],
"Mirtazapine":[
  {n:"N-Desmethylmirtazapine",e:"CYP3A4",a:"active",p:50,t:20,note:"~25% potency of parent"},
  {n:"8-Hydroxymirtazapine",e:"CYP2D6",a:"inactive",p:20,evidenceRefs:["ev_ssri_cyp2d6_review"]},
  {n:"Mirtazapine N-oxide",e:"CYP3A4",a:"inactive",p:15},
  {n:"Mirtazapine glucuronide",e:"UGT",a:"inactive",p:10}
],
"Trazodone":[
  {n:"m-Chlorophenylpiperazine (mCPP)",e:"CYP3A4",a:"active",p:20,t:6,note:"5-HT2C agonist — causes anxiety in some patients"},
  {n:"Triazolopyridine carboxylic acid",e:"CYP3A4",a:"inactive",p:50},
  {n:"Trazodone glucuronide",e:"UGT",a:"inactive",p:15}
],

// ── BETA-BLOCKERS ──
"Metoprolol":[
  {n:"alpha-Hydroxymetoprolol",e:"CYP2D6",a:"active",p:10,t:3,note:"~10% beta-blocking potency; minor CYP2D6 oxidative pathway",evidenceRefs:["ev_metoprolol_cyp2d6_cpic"]},
  {n:"O-Desmethylmetoprolol",e:"CYP2D6",a:"inactive",p:65,evidenceRefs:["ev_metoprolol_cyp2d6_cpic"]},
  {n:"Metoprolol acid (deaminated)",e:"CYP2D6",a:"inactive",p:15,evidenceRefs:["ev_metoprolol_cyp2d6_cpic"]}
],
"Propranolol":[
  {n:"4-Hydroxypropranolol",e:"CYP2D6",a:"active",p:40,t:1,note:"Equipotent β-blocker, very short t½",evidenceRefs:["ev_beta_blocker_cyp2d6_propranolol"]},
  {n:"Naphthoxylactic acid",e:"CYP1A2",a:"inactive",p:30},
  {n:"Propranolol glucuronide",e:"UGT",a:"inactive",p:15}
],
"Carvedilol":[
  {n:"4'-Hydroxyphenyl carvedilol",e:"CYP2D6",a:"active",p:30,t:5,note:"Active β-blocker + vasodilator",evidenceRefs:["ev_carvedilol_cyp2d6_label"]},
  {n:"1'-Hydroxyphenyl carvedilol",e:"CYP2C9",a:"active",p:20},
  {n:"Desmethyl carvedilol",e:"CYP2C9/3A4",a:"active",p:15,note:"Not treated as a CYP2D6-specific relation in the current graph"},
  {n:"Carvedilol glucuronide",e:"UGT",a:"inactive",p:20}
],
"Nebivolol":[
  {n:"4-Hydroxy-nebivolol",e:"CYP2D6",a:"active",p:40,t:10,note:"Active β1-selective metabolite",evidenceRefs:["ev_nebivolol_cyp2d6_label"]},
  {n:"Nebivolol glucuronide",e:"UGT2B7",a:"inactive",p:30},
  {n:"Hydroxylated ring-opened metabolites",e:"CYP2D6",a:"inactive",p:20,evidenceRefs:["ev_nebivolol_cyp2d6_label"]}
],

// ── STATINS ──
"Atorvastatin":[
  {n:"2-Hydroxyatorvastatin",e:"CYP3A4",a:"active",p:30,t:14,note:"~70% potency of parent"},
  {n:"4-Hydroxyatorvastatin",e:"CYP3A4",a:"active",p:25,t:14,note:"~70% potency of parent"},
  {n:"Atorvastatin lactone",e:"UGT",a:"inactive",p:20},
  {n:"β-Oxidation products",e:"CYP3A4",a:"inactive",p:15}
],
"Simvastatin":[
  {n:"Simvastatin acid (SVA)",e:"Esterase",a:"active_form",role:"active_form",p:60,t:2,note:"THE active form — simvastatin is a lactone prodrug. Multigene PK evidence links SLCO1B1 rs4149056, ABCG2 rs2231142, and CYP2D6*41 variants with higher simvastatin-acid exposure.",evidenceRefs:["ev_simvastatin_multigene_choi2016"]},
  {n:"6'-Hydroxy-SVA",e:"CYP3A4",a:"active",p:15},
  {n:"3',5'-Dihydrodiol-SVA",e:"CYP3A4",a:"inactive",p:10}
],
"Rosuvastatin":[
  {n:"N-Desmethylrosuvastatin",e:"CYP2C9",a:"active",p:10,t:19,note:"~50% potency"},
  {n:"Rosuvastatin lactone",e:"UGT",a:"inactive",p:10},
  {n:"Rosuvastatin (unchanged)",e:"Renal/Biliary",a:"active",p:72,note:"Mostly excreted unchanged"}
],

// ── OPIOIDS ──
"Codeine":[
  {n:"Morphine",e:"CYP2D6",a:"active_form",role:"active_form",p:10,t:3,note:"THE active analgesic — CYP2D6 PMs get NO pain relief",evidenceRefs:["ev_codeine_cyp2d6_cpic","ev_cyp2d6_codeine_genotype"]},
  {n:"Norcodeine",e:"CYP3A4",a:"inactive",p:10},
  {n:"Codeine-6-glucuronide",e:"UGT2B7",a:"active",p:70,note:"Major pathway, some activity"},
  {n:"Morphine-6-glucuronide",e:"UGT2B7",a:"active",p:5,note:"More potent than morphine itself"},
  {n:"Morphine-3-glucuronide",e:"UGT2B7",a:"inactive",p:5,note:"Neuroexcitatory"}
],
"Tramadol":[
  {n:"O-Desmethyltramadol (M1)",e:"CYP2D6",a:"active_form",role:"active_form",p:30,t:9,note:"200× greater μ-opioid affinity than parent",evidenceRefs:["ev_cyp2d6_codeine_genotype","ev_opioid_cyp2d6_cpic_2020"]},
  {n:"N-Desmethyltramadol (M2)",e:"CYP3A4",a:"inactive",p:25},
  {n:"N,O-Didesmethyltramadol (M5)",e:"CYP2D6",a:"active",p:10,evidenceRefs:["ev_opioid_cyp2d6_cpic_2020"]},
  {n:"Tramadol glucuronide",e:"UGT",a:"inactive",p:20}
],
"Oxycodone":[
  {n:"Noroxycodone",e:"CYP3A4",a:"active",p:45,t:5,note:"Primary metabolite, weak activity"},
  {n:"Oxymorphone",e:"CYP2D6",a:"active",p:10,t:8,note:"14× more potent than oxycodone at μ-receptor; CYP2D6 clinical actionability is weaker than codeine/tramadol",evidenceRefs:["ev_opioid_cyp2d6_cpic_2020"]},
  {n:"Noroxymorphone",e:"CYP2D6",a:"active",p:5,evidenceRefs:["ev_opioid_cyp2d6_cpic_2020"]},
  {n:"Oxycodone glucuronide",e:"UGT",a:"inactive",p:20}
],
"Hydrocodone":[
  {n:"Hydromorphone",e:"CYP2D6",a:"active",p:5,t:3,note:"5× more potent; CYP2D6 contribution is recognized but less actionable than codeine/tramadol",evidenceRefs:["ev_opioid_cyp2d6_cpic_2020"]},
  {n:"Norhydrocodone",e:"CYP3A4",a:"active",p:40,t:8,note:"Primary metabolite"},
  {n:"Dihydrocodeine",e:"Reduction",a:"active",p:10},
  {n:"Hydrocodone glucuronide",e:"UGT",a:"inactive",p:20}
],
"Morphine":[
  {n:"Morphine-3-glucuronide (M3G)",e:"UGT2B7",a:"inactive",p:60,t:4,note:"Neuroexcitatory — may cause agitation"},
  {n:"Morphine-6-glucuronide (M6G)",e:"UGT2B7",a:"active",p:10,t:4,note:"2× more potent than morphine, renally cleared"},
  {n:"Normorphine",e:"CYP3A4",a:"active",p:5},
  {n:"Morphine-3-sulfate",e:"SULT",a:"inactive",p:10}
],
"Fentanyl":[
  {n:"Norfentanyl",e:"CYP3A4",a:"inactive",p:80,t:12,note:"Primary metabolite, detection marker, no opioid activity"},
  {n:"Hydroxyfentanyl",e:"CYP3A4",a:"inactive",p:5},
  {n:"Despropionylfentanyl",e:"Esterase",a:"inactive",p:5}
],
"Methadone":[
  {n:"EDDP (2-ethylidene-1,5-dimethyl-3,3-diphenylpyrrolidine)",e:"CYP2B6/CYP3A4",a:"inactive",p:50,t:40,note:"Primary metabolite, detection marker; CYP2B6 is primary with CYP3A4 as secondary contributor"},
  {n:"EMDP",e:"CYP2B6/CYP3A4",a:"inactive",p:20,note:"Further downstream oxidation of EDDP"},
  {n:"Methadol",e:"CYP2D6",a:"active",p:5,note:"Weak opioid activity; minor CYP2D6-contributing route, not a primary methadone genotype signal",evidenceRefs:["ev_opioid_cyp2d6_cpic_2020"]},
  {n:"Methadone (unchanged)",e:"Renal",a:"active",p:20,note:"pH-dependent excretion"}
],
"Buprenorphine":[
  {n:"Norbuprenorphine",e:"CYP3A4",a:"active",p:60,t:30,note:"Active at μ-receptor, respiratory depressant"},
  {n:"Buprenorphine-3-glucuronide",e:"UGT",a:"inactive",p:25},
  {n:"Norbuprenorphine glucuronide",e:"UGT",a:"inactive",p:10}
],
"Heroin (Diacetylmorphine)":[
  {n:"6-Monoacetylmorphine (6-MAM)",e:"Esterase",a:"active",p:40,t:0.1,note:"Unique heroin marker, more potent than morphine"},
  {n:"Morphine",e:"Esterase",a:"active_form",role:"active_form",p:40,t:3,note:"Heroin is a double prodrug → 6-MAM → morphine"},
  {n:"Morphine-3-glucuronide",e:"UGT2B7",a:"inactive",p:10},
  {n:"Morphine-6-glucuronide",e:"UGT2B7",a:"active",p:5}
],
"Kratom (Mitragynine)":[
  {n:"7-Hydroxymitragynine (7-OH-M)",e:"CYP3A4",a:"active",p:5,t:4,note:"13× more potent μ-opioid agonist than parent",inh:[{e:"CYP2D6",s:"moderate"}]},
  {n:"16-Carboxy-mitragynine",e:"CYP2D6",a:"inactive",p:30,note:"Multiple CYPs contribute; CYP2D6 is a minor in vitro contributor",evidenceRefs:["ev_kratom_mitragynine_cyp2d6_basiliere2020"]},
  {n:"9-O-Demethylmitragynine",e:"CYP2D6",a:"active",p:15,note:"Produced by CYP2C19, CYP3A4 and CYP2D6 in vitro",evidenceRefs:["ev_kratom_mitragynine_cyp2d6_basiliere2020"]},
  {n:"Mitragynine glucuronide",e:"UGT",a:"inactive",p:25}
],

// ── BENZODIAZEPINES ──
"Alprazolam":[
  {n:"α-Hydroxyalprazolam",e:"CYP3A4/CYP3A5",a:"active",p:70,t:10,note:"~50% potency; CYP3A5 non-expressors have higher parent alprazolam exposure",evidenceRefs:["ev_alprazolam_cyp3a5_park2006"]},
  {n:"4-Hydroxyalprazolam",e:"CYP3A4/CYP3A5",a:"inactive",p:15,evidenceRefs:["ev_alprazolam_cyp3a5_park2006"]},
  {n:"Alprazolam glucuronide",e:"UGT",a:"inactive",p:10}
],
"Diazepam":[
  {n:"Nordiazepam (desmethyldiazepam)",e:"CYP2C19",a:"active",p:40,t:60,note:"Active, VERY long t½ — accumulates"},
  {n:"Temazepam",e:"CYP3A4",a:"active",p:20,t:11,note:"Active — itself a marketed benzo"},
  {n:"Oxazepam",e:"CYP2C19",a:"active",p:15,t:8,note:"Active — itself a marketed benzo"},
  {n:"Diazepam glucuronide",e:"UGT",a:"inactive",p:5}
],
"Clonazepam":[
  {n:"7-Aminoclonazepam",e:"CYP3A4",a:"inactive",p:60,t:20,note:"Primary metabolite, detection marker"},
  {n:"7-Acetaminoclonazepam",e:"NAT2",a:"inactive",p:20},
  {n:"Clonazepam glucuronide",e:"UGT",a:"inactive",p:10}
],
"Midazolam":[
  {n:"1'-Hydroxymidazolam",e:"CYP3A4",a:"active",p:60,t:1,note:"~50% potency, renally cleared"},
  {n:"4-Hydroxymidazolam",e:"CYP3A4",a:"inactive",p:5},
  {n:"1'-Hydroxymidazolam glucuronide",e:"UGT",a:"inactive",p:30,note:"Accumulates in renal failure → prolonged sedation"}
],
"Clobazam":[
  {n:"N-Desmethylclobazam (norclobazam)",e:"CYP3A4",a:"active",p:80,t:71,note:"Active metabolite formed mainly by CYP3A4 and cleared mainly by CYP2C19. CYP2C19 PMs accumulate norclobazam 5x+; public case/TDM data report N-CLB/CLB ratios 10- to 27-fold above matched medians in presumed CYP2C19 PM children.",evidenceRefs:["ev_clobazam_cyp2c19_fda_onfi","ev_clobazam_cyp2c19_contin2003","ev_clobazam_cbd_ddi_morrison2019"]},
  {n:"4'-Hydroxyclobazam",e:"CYP2C19",a:"inactive",p:10},
  {n:"Clobazam glucuronide",e:"UGT",a:"inactive",p:5}
],

// ── ANTIPLATELETS ──
"Clopidogrel":[
  {n:"2-Oxo-clopidogrel",e:"CYP2C19",a:"active",p:15,t:0.5,note:"Intermediate — requires SECOND CYP activation step"},
  {n:"Active thiol metabolite (R-130964)",e:"CYP3A4",a:"active_form",role:"active_form",p:2,t:0.5,note:"THE active antiplatelet — irreversibly binds P2Y12. Only ~2% of dose; CYP2C19 PM dose-escalation PK/PD data show much higher doses may be needed to approximate EM active-metabolite exposure, but CPIC generally prefers alternative antiplatelets in ACS/PCI.",evidenceRefs:["ev_clopidogrel_cyp2c19_cpic","ev_clopidogrel_dose_escalation_horenstein2014"]},
  {n:"Clopidogrel carboxylic acid (SR26334)",e:"Esterase",a:"inactive",p:85,note:"85% WASTED by esterases → explains why CYP2C19 PMs have no response"},
  {n:"Acyl glucuronide",e:"UGT",a:"inactive",p:5,note:"Potent CYP2C8 inhibitor (OATP interaction source)"}
],
"Prasugrel":[
  {n:"R-95913 (thiolactone)",e:"Esterase",a:"active",p:60,t:0.5,note:"Intermediate metabolite"},
  {n:"R-138727 (active metabolite)",e:"CYP3A4",a:"active_form",role:"active_form",p:30,t:4,note:"The active antiplatelet — more efficient activation than clopidogrel"},
  {n:"Inactive metabolites",e:"Various",a:"inactive",p:10}
],
"Ticagrelor":[
  {n:"AR-C124910XX",e:"CYP3A4",a:"active",p:40,t:9,note:"Equipotent active metabolite — contributes to antiplatelet effect"},
  {n:"Ticagrelor glucuronide",e:"UGT",a:"inactive",p:20}
],

// ── ANTICOAGULANTS ──
"Warfarin":[
  {n:"S-7-Hydroxywarfarin",e:"CYP2C9",a:"inactive",p:35,note:"MAIN clearance pathway for active S-warfarin"},
  {n:"R-10-Hydroxywarfarin",e:"CYP3A4",a:"inactive",p:15},
  {n:"S-6-Hydroxywarfarin",e:"CYP2C9",a:"inactive",p:10},
  {n:"R-6-Hydroxywarfarin",e:"CYP1A2",a:"inactive",p:10},
  {n:"Warfarin alcohols",e:"Carbonyl-R",a:"inactive",p:10}
],

// ── PPIs ──
"Omeprazole":[
  {n:"5-Hydroxyomeprazole",e:"CYP2C19",a:"inactive",p:50,evidenceRefs:["ev_omeprazole_cyp2c19_lima2021"]},
  {n:"Omeprazole sulfone",e:"CYP3A4",a:"inactive",p:30,inh:[{e:"CYP2C19",s:"moderate"}],note:"Inhibits CYP2C19"},
  {n:"5-O-Desmethylomeprazole",e:"CYP2C19",a:"inactive",p:10}
],
"Esomeprazole":[
  {n:"5-Hydroxyesomeprazole",e:"CYP2C19",a:"inactive",p:50},
  {n:"Esomeprazole sulfone",e:"CYP3A4",a:"inactive",p:30,inh:[{e:"CYP2C19",s:"moderate"}]},
  {n:"5-O-Desmethylesomeprazole",e:"CYP2C19",a:"inactive",p:10}
],

// ── MACROLIDE ANTIBIOTICS ──
"Clarithromycin":[
  {n:"14-Hydroxyclarithromycin",e:"CYP3A4",a:"active",p:40,t:7,note:"ACTIVE — synergistic with parent against H. influenzae",inh:[{e:"CYP3A4",s:"strong"}]},
  {n:"N-Desmethylclarithromycin",e:"CYP3A4",a:"inactive",p:20},
  {n:"Clarithromycin glucuronide",e:"UGT",a:"inactive",p:15}
],
"Erythromycin":[
  {n:"N-Desmethylerythromycin",e:"CYP3A4",a:"active",p:30,note:"Active, also mechanism-based CYP3A4 inhibitor",inh:[{e:"CYP3A4",s:"strong"}]},
  {n:"Erythromycin enol ether (anhydro-)",e:"Acid",a:"inactive",p:30,note:"Degraded in stomach acid → GI side effects"},
  {n:"Erythromycin glucuronide",e:"UGT",a:"inactive",p:15}
],

// ── ANTIFUNGALS ──
"Itraconazole":[
  {n:"Hydroxyitraconazole",e:"CYP3A4",a:"active",p:40,t:30,note:"Equipotent antifungal + CYP3A4 inhibitor",inh:[{e:"CYP3A4",s:"strong"}]},
  {n:"Keto-itraconazole",e:"CYP3A4",a:"active",p:15},
  {n:"N-Desalkyl-itraconazole",e:"CYP3A4",a:"inactive",p:15}
],
"Fluconazole":[
  {n:"Fluconazole (unchanged)",e:"Renal",a:"active",p:80,note:"~80% excreted unchanged — minimal metabolism"}
],
"Ketoconazole":[
  {n:"N-Deacetylketoconazole",e:"CYP3A4",a:"inactive",p:40},
  {n:"Ketoconazole (unchanged)",e:"Biliary",a:"active",p:30}
],

// ── ANTIVIRALS ──
"Ritonavir":[
  {n:"M-2 (oxidation)",e:"CYP3A4",a:"active",p:30,note:"Active metabolite, also CYP3A4 inhibitor",inh:[{e:"CYP3A4",s:"strong"}]},
  {n:"M-1 (isopropylthiazole oxidation)",e:"CYP3A4",a:"inactive",p:20,note:"Not treated as a CYP2D6-specific relation in the current graph"},
  {n:"Ritonavir (unchanged)",e:"Biliary",a:"active",p:30}
],

// ── ANTIEPILEPTICS ──
"Carbamazepine":[
  {n:"Carbamazepine-10,11-epoxide (CBZ-E)",e:"CYP3A4",a:"active",p:40,t:6,note:"Active — causes toxicity. Cleared by epoxide hydrolase (EPHX1)"},
  {n:"10,11-Dihydro-10,11-trans-dihydroxy-CBZ (DiOH-CBZ)",e:"EPHX1",a:"inactive",p:30},
  {n:"2-Hydroxy-CBZ",e:"CYP3A4",a:"inactive",p:10},
  {n:"Iminostilbene",e:"CYP3A4",a:"inactive",p:5}
],
"Phenytoin":[
  {n:"5-(p-Hydroxyphenyl)-5-phenylhydantoin (HPPH)",e:"CYP2C9",a:"inactive",p:70,note:"Main metabolite — saturable kinetics at therapeutic doses",evidenceRefs:["ev_phenytoin_cyp2c9_hlab_cpic2020"]},
  {n:"Catechol metabolite",e:"CYP2C19",a:"inactive",p:10},
  {n:"HPPH glucuronide",e:"UGT",a:"inactive",p:15}
],
"Valproic Acid":[
  {n:"2-ene-VPA",e:"CYP2C9",a:"active",p:5,t:10,note:"Anticonvulsant activity"},
  {n:"4-ene-VPA",e:"CYP2A6",a:"toxic",p:1,note:"Hepatotoxic metabolite — rare idiosyncratic liver failure"},
  {n:"VPA glucuronide",e:"UGT",a:"inactive",p:40},
  {n:"3-Oxo-VPA",e:"β-oxidation",a:"inactive",p:25},
  {n:"3-Hydroxy-VPA",e:"β-oxidation",a:"inactive",p:15}
],
"Primidone":[
  {n:"Phenobarbital",e:"Hepatic oxidation",a:"active_form",role:"active_form",p:25,t:96,note:"Long-lived active barbiturate metabolite. Much of chronic enzyme-induction burden follows this metabolite, not parent primidone alone.",evidenceRefs:["ev_primidone_metabolites_label"]},
  {n:"Phenylethylmalonamide (PEMA)",e:"Amidase/oxidation",a:"active",p:50,t:16,note:"Active anticonvulsant metabolite with weaker sedative/inducing profile than phenobarbital.",evidenceRefs:["ev_primidone_metabolites_label"]},
  {n:"Primidone (unchanged)",e:"Renal",a:"active",p:25,t:10,note:"Parent primidone also has anticonvulsant activity; do not model as a simple prodrug only.",evidenceRefs:["ev_primidone_metabolites_label"]}
],
"Phenobarbital":[
  {n:"p-Hydroxyphenobarbital",e:"CYP2C9",a:"inactive",p:50,t:96,note:"Major oxidative metabolite; parent phenobarbital remains long-lived and inducing."},
  {n:"Phenobarbital glucuronide",e:"UGT",a:"inactive",p:25},
  {n:"Phenobarbital (unchanged renal)",e:"Renal",a:"active",p:25,note:"Renal excretion contributes to long persistence."}
],

// ── ANTIPSYCHOTICS ──
"Quetiapine":[
  {n:"Norquetiapine (N-desalkylquetiapine)",e:"CYP3A4",a:"active",p:50,t:12,note:"NET inhibitor — gives quetiapine antidepressant properties"},
  {n:"Quetiapine sulfoxide",e:"CYP3A4",a:"inactive",p:20},
  {n:"7-Hydroxyquetiapine",e:"CYP3A4",a:"inactive",p:5}
],
"Olanzapine":[
  {n:"10-N-Glucuronide",e:"UGT1A4",a:"inactive",p:30},
  {n:"4'-N-Desmethylolanzapine",e:"CYP1A2",a:"active",p:25,note:"~30% potency"},
  {n:"2-Hydroxymethylolanzapine",e:"CYP2D6",a:"inactive",p:15,note:"Minor CYP2D6 pathway; smoking/CYP1A2 remains the primary olanzapine axis",evidenceRefs:["ev_antipsychotic_cyp2d6_labels"]},
  {n:"Olanzapine N-oxide",e:"FMO3",a:"inactive",p:10}
],
"Risperidone":[
  {n:"9-Hydroxyrisperidone (paliperidone)",e:"CYP2D6",a:"active",p:50,t:23,note:"EQUIPOTENT — sold separately as Invega. CYP2D6 PMs have altered ratio",evidenceRefs:["ev_antipsychotic_cyp2d6_labels"]},
  {n:"Risperidone N-oxide",e:"FMO",a:"inactive",p:10}
],
"Aripiprazole":[
  {n:"Dehydro-aripiprazole (OPC-14857)",e:"CYP2D6",a:"active",p:40,t:94,note:"~40% potency, VERY long t½ accumulates",evidenceRefs:["ev_antipsychotic_cyp2d6_labels"]},
  {n:"Aripiprazole glucuronide",e:"UGT",a:"inactive",p:15}
],
"Haloperidol":[
  {n:"Reduced haloperidol",e:"Carbonyl-R",a:"active",p:25,t:18,note:"Back-converted to haloperidol — creates metabolic cycling"},
  {n:"Haloperidol glucuronide",e:"UGT",a:"inactive",p:30},
  {n:"4-Fluorobenzoylpropionic acid",e:"CYP2D6",a:"inactive",p:15,evidenceRefs:["ev_antipsychotic_cyp2d6_labels"]},
  {n:"Pyridinium metabolite (HPP+)",e:"CYP3A4",a:"toxic",p:5,note:"Neurotoxic, similar to MPP+"}
],
"Clozapine":[
  {n:"N-Desmethylclozapine (norclozapine)",e:"CYP1A2",a:"active",p:40,t:12,note:"Active — muscarinic M1 agonist (different from parent)"},
  {n:"Clozapine N-oxide",e:"FMO3",a:"inactive",p:20,note:"Used in DREADD chemogenetics research"},
  {n:"Clozapine glucuronide",e:"UGT",a:"inactive",p:15}
],

// ── CCBs ──
"Amlodipine":[
  {n:"Dehydroamlodipine",e:"CYP3A4",a:"inactive",p:60,note:"Primary inactive metabolite"},
  {n:"Amlodipine pyridine metabolite",e:"CYP3A4",a:"inactive",p:20}
],
"Diltiazem":[
  {n:"Desacetyldiltiazem (DAD)",e:"CYP3A4",a:"active",p:40,t:5,note:"40-50% potency, also CYP3A4 inhibitor",inh:[{e:"CYP3A4",s:"moderate"}]},
  {n:"N-Desmethyldiltiazem",e:"CYP3A4",a:"active",p:20,t:7},
  {n:"Diltiazem glucuronide",e:"UGT",a:"inactive",p:15}
],
"Verapamil":[
  {n:"Norverapamil",e:"CYP3A4",a:"active",p:40,t:9,note:"~20% potency, CYP3A4 inhibitor",inh:[{e:"CYP3A4",s:"moderate"}]},
  {n:"D-617 (gallopamil analog)",e:"CYP3A4",a:"active",p:15},
  {n:"Verapamil glucuronide",e:"UGT",a:"inactive",p:15}
],

// ── NSAIDs ──
"Ibuprofen":[
  {n:"2-Hydroxyibuprofen",e:"CYP2C9",a:"inactive",p:30},
  {n:"3-Hydroxyibuprofen",e:"CYP2C9",a:"inactive",p:25},
  {n:"Carboxyibuprofen",e:"CYP2C9",a:"inactive",p:25},
  {n:"Ibuprofen glucuronide",e:"UGT2B7",a:"inactive",p:15,note:"Acyl glucuronide — potentially reactive"}
],
"Celecoxib":[
  {n:"Hydroxymethyl celecoxib",e:"CYP2C9",a:"inactive",p:60},
  {n:"Carboxylic acid celecoxib",e:"CYP2C9",a:"inactive",p:25},
  {n:"Celecoxib glucuronide",e:"UGT",a:"inactive",p:10}
],

// ── ACETAMINOPHEN ──
"Acetaminophen":[
  {n:"Acetaminophen glucuronide",e:"UGT1A1",a:"inactive",p:52,note:"Main safe pathway"},
  {n:"Acetaminophen sulfate",e:"SULT",a:"inactive",p:30,note:"Safe pathway"},
  {n:"NAPQI (N-acetyl-p-benzoquinone imine)",e:"CYP2E1",a:"toxic",p:5,note:"TOXIC — normally detoxified by glutathione. Liver failure when GSH depleted (overdose/alcohol)",evidenceRefs:["ev_apap_alcohol_riordan2002"]},
  {n:"Cysteine/mercapturic acid conjugate",e:"GST",a:"inactive",p:5,note:"NAPQI detoxification product"},
  {n:"3-Hydroxy-acetaminophen",e:"CYP1A2",a:"inactive",p:3},
  {n:"Methoxy-acetaminophen",e:"COMT",a:"inactive",p:2}
],

// ── MISC DRUGS WITH KNOWN METABOLITES ──
"Losartan":[
  {n:"EXP 3174 (E-3174)",e:"CYP2C9",a:"active_form",role:"active_form",p:14,t:6,note:"THE active metabolite — 10-40× more potent AT1 antagonist than losartan"},
  {n:"EXP 3179",e:"CYP3A4",a:"active",p:5},
  {n:"Losartan carboxylic acid",e:"CYP2C9",a:"inactive",p:40}
],
"Tamoxifen":[
  {n:"N-Desmethyltamoxifen",e:"CYP3A4",a:"active",p:40,t:336,note:"Primary metabolite, weak SERM"},
  {n:"4-Hydroxytamoxifen (4-OHT)",e:"CYP2D6",a:"active",p:5,t:6,note:"100× more potent ER antagonist — minor pathway",evidenceRefs:["ev_tamoxifen_cyp2d6_cpic"]},
  {n:"Endoxifen (4-OH-N-desmethyltamoxifen)",e:"CYP2D6",a:"active_form",role:"active_form",p:10,t:50,note:"THE key active metabolite. CYP2D6 PMs have 75% lower endoxifen — reduced efficacy",evidenceRefs:["ev_tamoxifen_cyp2d6_cpic","ev_tamoxifen_cyp2d6_controversy","ev_paroxetine_cyp2d6_japanese"]},
  {n:"Tamoxifen N-oxide",e:"FMO",a:"inactive",p:10}
],
"Amiodarone":[
  {n:"Desethylamiodarone (DEA)",e:"CYP3A4",a:"active",p:50,t:1200,note:"t½ ~40-55 DAYS. Equipotent + multi-CYP inhibitor",inh:[{e:"CYP2D6",s:"moderate"},{e:"CYP2C9",s:"moderate"},{e:"CYP3A4",s:"moderate"}]},
  {n:"Di-desethylamiodarone",e:"CYP3A4",a:"inactive",p:10}
],
"Tacrolimus":[
  {n:"13-O-Desmethyltacrolimus",e:"CYP3A4",a:"active",p:40,note:"~10% immunosuppressive activity; transplant troughs are shaped by CYP3A4/CYP3A5 plus P-gp context and donor/recipient genetics",evidenceRefs:["ev_tacrolimus_cyp3a5_cpic","ev_tacrolimus_liver_multigene_ladd2025"]},
  {n:"31-O-Desmethyltacrolimus",e:"CYP3A5",a:"active",p:20,evidenceRefs:["ev_tacrolimus_cyp3a5_cpic","ev_tacrolimus_renal_dose_model_srinivas2023"]},
  {n:"15-O-Desmethyltacrolimus",e:"CYP3A4",a:"inactive",p:10}
],
"Cyclosporine":[
  {n:"AM1 (M17)",e:"CYP3A4",a:"active",p:20,note:"~10% activity"},
  {n:"AM9",e:"CYP3A4",a:"inactive",p:15},
  {n:"AM4N",e:"CYP3A4",a:"inactive",p:10}
],
"Sildenafil":[
  {n:"N-Desmethylsildenafil (UK-103,320)",e:"CYP3A4",a:"active",p:40,t:4,note:"~50% potency PDE5 inhibitor"},
  {n:"Sildenafil glucuronide",e:"UGT",a:"inactive",p:20}
],
"Tadalafil":[
  {n:"Methylcatechol tadalafil",e:"CYP3A4",a:"inactive",p:60,note:"Major inactive metabolite"},
  {n:"Methylcatechol glucuronide",e:"UGT",a:"inactive",p:20}
],
"Diphenhydramine":[
  {n:"N-Desmethyldiphenhydramine",e:"CYP2D6",a:"active",p:40,t:6,evidenceRefs:["ev_diphenhydramine_cyp2d6_niwa2007"]},
  {n:"Didesmethyldiphenhydramine",e:"CYP2D6",a:"inactive",p:20,evidenceRefs:["ev_diphenhydramine_cyp2d6_niwa2007"]},
  {n:"Diphenhydramine N-oxide",e:"FMO",a:"inactive",p:15},
  {n:"Diphenylmethoxyacetic acid",e:"Oxidation",a:"inactive",p:15,note:"Downstream acid metabolite; not represented as a CYP2D6-specific genotype edge"}
],
"Melatonin":[
  {n:"6-Hydroxymelatonin",e:"CYP1A2",a:"inactive",p:70},
  {n:"6-Hydroxymelatonin sulfate",e:"SULT",a:"inactive",p:20},
  {n:"N-Acetylserotonin",e:"MAO-A",a:"active",p:5,note:"Precursor with own receptor activity"}
],
"Theophylline":[
  {n:"1,3-Dimethyluric acid",e:"CYP1A2",a:"inactive",p:40},
  {n:"3-Methylxanthine",e:"CYP1A2",a:"active",p:15,note:"Weak bronchodilator"},
  {n:"1-Methyluric acid",e:"XO",a:"inactive",p:20}
],
"Colchicine":[
  {n:"2-O-Demethylcolchicine",e:"CYP3A4",a:"active",p:20,note:"Active — hepatotoxic"},
  {n:"3-O-Demethylcolchicine (colchiceine)",e:"CYP3A4",a:"active",p:15},
  {n:"Colchicine glucuronide",e:"UGT",a:"inactive",p:20}
],
"Cimetidine":[
  {n:"Cimetidine sulfoxide",e:"FMO3",a:"active",p:30,inh:[{e:"CYP3A4",s:"weak"},{e:"CYP2D6",s:"weak"}]},
  {n:"Hydroxymethylcimetidine",e:"CYP3A4",a:"inactive",p:15},
  {n:"Cimetidine (unchanged)",e:"Renal",a:"active",p:50}
],
"Spironolactone":[
  {n:"Canrenone",e:"Hepatic",a:"active",p:25,t:17,note:"Active metabolite — itself an aldosterone antagonist"},
  {n:"7α-Thiomethylspironolactone (TMS)",e:"Hepatic",a:"active",p:30,t:14,note:"Major active metabolite"},
  {n:"6β-Hydroxy-7α-TMS",e:"CYP3A4",a:"inactive",p:15}
],

// ── SUPPLEMENTS ──
"St. John's Wort":[
  {n:"Hypericin (photoactive)",e:"Gut",a:"active",p:20,note:"Phototoxic — causes photosensitivity"},
  {n:"Hyperforin",e:"Gut",a:"active",p:40,note:"KEY active compound — potent PXR activator → induces CYP3A4/2C9"},
  {n:"Pseudohypericin",e:"Gut",a:"active",p:15}
],

// ── POPPERS & MISC ──
"Poppers (Amyl Nitrite)":[
  {n:"Amyl alcohol",e:"Esterase",a:"inactive",p:60},
  {n:"Nitric oxide (NO)",e:"Spontaneous",a:"active",p:30,note:"THE active vasodilator — same pathway as nitroglycerin"},
  {n:"Methemoglobin",e:"Hemoglobin",a:"toxic",p:5,note:"Can cause methemoglobinemia at high doses"}
],
"Nitrous Oxide":[
  {n:"N₂O (unchanged, exhaled)",e:"Lungs",a:"active",p:99,note:"Almost entirely exhaled unchanged"},
  {n:"Free radicals",e:"Reductive",a:"toxic",p:1,note:"Inactivates vitamin B12 → megaloblastic anemia with chronic use"}
],
// ── PHASE 2 EXPANSION: 130 additional drug metabolite cascades ──
"Pravastatin":[
  {n:"3α-Hydroxy-iso-pravastatin",e:"Sulfation",a:"inactive",p:45,t:2,note:"Non-CYP, renal/biliary excretion"},
  {n:"SQ31906 (ring hydroxylation)",e:"CYP3A4",a:"weak",p:10,t:1.5,note:"Minor CYP contribution unlike other statins"},
  {n:"Pravastatin lactone",e:"Spontaneous",a:"inactive",p:20,note:"Interconversion with active acid form"}
],
"Lovastatin":[
  {n:"Lovastatin acid (β-hydroxyacid)",e:"Esterases",a:"active",p:30,t:3,note:"Active open-ring form, the actual HMG-CoA reductase inhibitor"},
  {n:"6'-Hydroxy-lovastatin",e:"CYP3A4",a:"weak",p:40,t:2,note:"Primary oxidative metabolite"},
  {n:"6'-Exomethylene-lovastatin",e:"CYP3A4",a:"inactive",p:15,t:1.5,note:"Dehydration product"}
],
"Fluvastatin":[
  {n:"5-Hydroxy-fluvastatin",e:"CYP2C9",a:"weak",p:35,t:1,note:"Major metabolite, ~50% pharmacological activity"},
  {n:"6-Hydroxy-fluvastatin",e:"CYP2C9",a:"weak",p:25,t:1,note:"Retains partial activity"},
  {n:"N-Desisopropyl-fluvastatin",e:"CYP3A4",a:"inactive",p:10,t:0.8,note:"Minor pathway"}
],
"Pitavastatin":[
  {n:"Pitavastatin lactone",e:"UGT1A3/2B7",a:"inactive",p:50,t:10,note:"Glucuronidated; major elimination pathway, NOT CYP"},
  {n:"Cyclopentyl-epimer",e:"Spontaneous",a:"inactive",p:5,note:"Minor non-enzymatic conversion"}
],
"Milnacipran":[
  {n:"Milnacipran glucuronide",e:"UGT2B7",a:"inactive",p:55,t:8,note:"Major route; largely renally cleared unchanged (50%)"},
  {n:"Desethyl-milnacipran",e:"CYP3A4",a:"weak",p:5,t:6,note:"Very minor pathway"}
],
"Vilazodone":[
  {n:"Desmethyl-vilazodone",e:"CYP3A4",a:"weak",p:15,t:20,note:"Retains 5-HT1A partial agonist activity"},
  {n:"4-Hydroxy-vilazodone glucuronide",e:"CYP3A4/UGT",a:"inactive",p:40,note:"Primary elimination route"},
  {n:"Vilazodone carboxylic acid",e:"CYP3A4",a:"inactive",p:25,note:"Oxidative metabolite"}
],
"Vortioxetine":[
  {n:"Vortioxetine carboxylic acid",e:"CYP2D6",a:"inactive",p:30,t:10,note:"Major inactive metabolite, renally cleared",evidenceRefs:["ev_vortioxetine_cyp2d6_pk"]},
  {n:"Hydroxy-vortioxetine glucuronide",e:"CYP2D6/UGT",a:"inactive",p:25,note:"Phase II conjugate"},
  {n:"Desmethyl-vortioxetine",e:"CYP2D6/3A4",a:"weak",p:10,t:50,note:"Weak 5-HT transporter binding"}
],
"Bisoprolol":[
  {n:"Bisoprolol glucuronide",e:"UGT",a:"inactive",p:30,t:11,note:"50% excreted renally unchanged"},
  {n:"O-dealkylated metabolite",e:"CYP3A4",a:"inactive",p:15,note:"Minor oxidative pathway"},
  {n:"Oxidized bisoprolol",e:"CYP3A4",a:"inactive",p:10,note:"Minor oxidative pathway; not treated as a CYP2D6-specific relation in the current graph"}
],
"Atenolol":[
  {n:"Atenolol (unchanged, renal)",e:"None",a:"active",p:85,t:7,note:"Not metabolized; ~90% renal excretion unchanged"},
  {n:"Hydroxymethyl-atenolol",e:"Gut flora",a:"inactive",p:5,note:"Minor fecal metabolite"}
],
"Labetalol":[
  {n:"Labetalol glucuronide",e:"UGT2B7",a:"inactive",p:60,t:6,note:"Extensive first-pass glucuronidation"},
  {n:"Labetalol sulfate",e:"SULT",a:"inactive",p:15,note:"Secondary conjugation pathway"},
  {n:"3-amino-1-phenylbutane",e:"Reduction",a:"inactive",p:5,note:"Minor reductive metabolite; not treated as a CYP2D6-specific relation in the current graph"}
],
"Lisinopril":[
  {n:"Lisinopril (unchanged, renal)",e:"None",a:"active",p:100,t:12,note:"Not metabolized at all; 100% renal excretion unchanged"}
],
"Enalapril":[
  {n:"Enalaprilat",e:"Esterases",a:"active",p:60,t:11,note:"Active diacid; the actual ACE inhibitor (prodrug activation)"},
  {n:"Enalapril diketopiperazine",e:"Spontaneous",a:"inactive",p:10,note:"Cyclization product"}
],
"Ramipril":[
  {n:"Ramiprilat",e:"Esterases",a:"active",p:45,t:14,note:"Active metabolite; 6× more potent ACE inhibitor than parent"},
  {n:"Ramiprilat diketopiperazine",e:"Spontaneous",a:"inactive",p:15,note:"Ring closure product"},
  {n:"Ramiprilat glucuronide",e:"UGT",a:"inactive",p:20,note:"Renal clearance form"}
],
"Captopril":[
  {n:"Captopril disulfide",e:"Oxidation",a:"inactive",p:40,t:2,note:"Thiol oxidation produces dimer"},
  {n:"Captopril-cysteine disulfide",e:"Thiol exchange",a:"inactive",p:25,note:"Protein-bound form"},
  {n:"Captopril (unchanged, renal)",e:"None",a:"active",p:35,t:2,note:"Short-acting; requires TID dosing"}
],
"Benazepril":[
  {n:"Benazeprilat",e:"Esterases",a:"active",p:55,t:10,note:"Active diacid metabolite; actual ACE inhibitor"},
  {n:"Benazeprilat glucuronide",e:"UGT",a:"inactive",p:25,note:"Biliary/renal elimination"},
  {n:"Benazepril acyl-glucuronide",e:"UGT",a:"inactive",p:15,note:"Direct conjugation of parent"}
],
"Valsartan":[
  {n:"4-Hydroxy-valsartan",e:"CYP2C9",a:"inactive",p:9,t:6,note:"Only ~20% hepatic metabolism; mostly excreted unchanged in feces"},
  {n:"Valsartan (unchanged, fecal)",e:"None",a:"active",p:83,t:6,note:"~83% eliminated unchanged via biliary excretion"}
],
"Irbesartan":[
  {n:"Irbesartan glucuronide",e:"UGT",a:"inactive",p:20,t:12,note:"Direct conjugation"},
  {n:"Hydroxy-irbesartan",e:"CYP2C9",a:"weak",p:15,note:"Oxidation metabolite with some AT1 binding"},
  {n:"Irbesartan (unchanged)",e:"None",a:"active",p:60,t:12,note:"~20% eliminated unchanged renally"}
],
"Candesartan":[
  {n:"Candesartan (from cilexetil prodrug)",e:"Esterases",a:"active",p:85,t:9,note:"Administered as candesartan cilexetil prodrug"},
  {n:"O-deethyl-candesartan",e:"CYP2C9",a:"inactive",p:10,note:"Minor inactive metabolite"}
],
"Olmesartan":[
  {n:"Olmesartan (unchanged, fecal/renal)",e:"None",a:"active",p:100,t:13,note:"No significant metabolism; eliminated unchanged (60% fecal, 40% renal)"}
],
"Telmisartan":[
  {n:"Telmisartan glucuronide",e:"UGT1A3",a:"inactive",p:15,t:24,note:"Only metabolic pathway; >97% fecal elimination"},
  {n:"Telmisartan (unchanged, fecal)",e:"None",a:"active",p:85,t:24,note:"Minimal metabolism; longest-acting ARB"}
],
"Nifedipine":[
  {n:"Oxidized nifedipine (pyridine metabolite)",e:"CYP3A4",a:"inactive",p:70,t:2,note:"Primary aromatization to inactive pyridine analog"},
  {n:"Hydroxy-nifedipine",e:"CYP3A4",a:"weak",p:15,note:"Retains ~5% activity"},
  {n:"Nifedipine acid",e:"CYP3A4/Esterases",a:"inactive",p:10,note:"Ester hydrolysis product"}
],
"Felodipine":[
  {n:"Dehydro-felodipine",e:"CYP3A4",a:"inactive",p:50,t:15,note:"Pyridine analog, no vasodilatory activity"},
  {n:"Hydroxy-felodipine",e:"CYP3A4",a:"inactive",p:30,note:"Ring hydroxylation product"},
  {n:"Felodipine dicarboxylic acid",e:"CYP3A4/Esterases",a:"inactive",p:15,note:"Hydrolysis of both esters"}
],
"Lansoprazole":[
  {n:"5-Hydroxy-lansoprazole",e:"CYP2C19",a:"inactive",p:35,t:1.5,note:"Primary metabolite"},
  {n:"Lansoprazole sulfone",e:"CYP3A4",a:"inactive",p:30,note:"Sulfoxidation product"},
  {n:"5-Hydroxy-lansoprazole sulfone",e:"CYP2C19/3A4",a:"inactive",p:15,note:"Sequential oxidation"}
],
"Pantoprazole":[
  {n:"Desmethyl-pantoprazole sulfate",e:"CYP2C19",a:"inactive",p:50,t:1,note:"Demethylation then sulfate conjugation"},
  {n:"Pantoprazole sulfone",e:"CYP3A4",a:"inactive",p:30,note:"Less dependent on 2C19 than omeprazole"},
  {n:"Pantoprazole thioether",e:"Reduction",a:"inactive",p:10,note:"Reduction product"}
],
"Rabeprazole":[
  {n:"Rabeprazole thioether",e:"Non-enzymatic",a:"inactive",p:60,t:1,note:"Primary route — non-enzymatic reduction, NOT CYP-dependent"},
  {n:"Desmethyl-rabeprazole",e:"CYP2C19",a:"weak",p:15,note:"Minor CYP contribution — least affected by CYP2C19 polymorphisms"},
  {n:"Rabeprazole sulfone",e:"CYP3A4",a:"inactive",p:10,note:"Minor oxidation product"}
],
"Famotidine":[
  {n:"Famotidine S-oxide",e:"FMO",a:"inactive",p:10,t:3,note:"Minor sulfoxidation"},
  {n:"Famotidine (unchanged, renal)",e:"None",a:"active",p:75,t:3,note:"Primarily renally eliminated unchanged (65-80%)"}
],
"Apixaban":[
  {n:"O-Desmethyl-apixaban sulfate",e:"CYP3A4/SULT",a:"inactive",p:25,t:12,note:"Major metabolite in plasma; no anticoagulant activity"},
  {n:"3-Hydroxy-apixaban",e:"CYP3A4",a:"inactive",p:15,note:"Hydroxylation product"},
  {n:"Apixaban (unchanged, fecal)",e:"None",a:"active",p:50,t:12,note:"~27% renal + 50% biliary as unchanged drug"}
],
"Rivaroxaban":[
  {n:"Morpholinone ring-opened metabolites",e:"CYP3A4/2J2",a:"inactive",p:35,t:7,note:"Oxidative cleavage of morpholinone ring"},
  {n:"Hydroxy-rivaroxaban",e:"CYP3A4",a:"inactive",p:15,note:"Hydroxylation"},
  {n:"Rivaroxaban (unchanged, renal)",e:"None",a:"active",p:36,t:7,note:"1/3 excreted unchanged renally"}
],
"Dabigatran":[
  {n:"Dabigatran (from etexilate prodrug)",e:"Esterases",a:"active",p:80,t:13,note:"Prodrug activation by carboxylesterases in gut/liver"},
  {n:"Dabigatran acyl-glucuronide",e:"UGT2B15",a:"active",p:15,t:13,note:"Pharmacologically active conjugate (~same potency)"},
  {n:"Dabigatran (unchanged, renal)",e:"None",a:"active",p:80,t:13,note:"80% renal clearance; contraindicated CrCl<30"}
],
"Edoxaban":[
  {n:"M-4 (hydroxy-edoxaban)",e:"CES1",a:"active",p:10,t:10,note:"Active metabolite formed by carboxylesterase"},
  {n:"M-6 (N-oxide)",e:"CYP3A4",a:"weak",p:5,note:"Minor contribution of CYP3A4"},
  {n:"Edoxaban (unchanged, renal/fecal)",e:"None",a:"active",p:70,t:10,note:"Minimal metabolism; 50% renal + biliary/intestinal"}
],
"Aspirin":[
  {n:"Salicylic acid (salicylate)",e:"Esterases",a:"active",p:90,t:4,note:"Rapid deacetylation; retains anti-inflammatory activity"},
  {n:"Salicyluric acid",e:"Glycine conjugation",a:"inactive",p:50,t:3,note:"Primary elimination metabolite (~75% of dose)"},
  {n:"Gentisic acid",e:"CYP/Oxidation",a:"inactive",p:5,note:"Ring hydroxylation of salicylate"},
  {n:"Salicyl-phenolic glucuronide",e:"UGT",a:"inactive",p:15,note:"Glucuronide conjugation"}
],
"Aspirin (Low-Dose)":[
  {n:"Salicylic acid",e:"Esterases",a:"active",p:90,t:4,note:"Same metabolism as full-dose aspirin"},
  {n:"Salicyluric acid",e:"Glycine conjugation",a:"inactive",p:50,t:3,note:"Primary elimination route"},
  {n:"Acetyl group → COX-1 (irreversible)",e:"Direct",a:"active",p:0,note:"Permanent platelet inhibition — lasts platelet lifetime (7-10 days)"}
],
"Azithromycin":[
  {n:"Desosaminyl-azithromycin",e:"CYP3A4",a:"inactive",p:5,t:68,note:"Very minor metabolism; mostly excreted unchanged in bile"},
  {n:"Azithromycin (unchanged, biliary)",e:"None",a:"active",p:90,t:68,note:"Extremely long tissue half-life; minimal hepatic metabolism"}
],
"Ciprofloxacin":[
  {n:"Desethylene-ciprofloxacin",e:"CYP1A2",a:"weak",p:10,t:4,note:"Retains ~50% antibacterial activity"},
  {n:"Sulfo-ciprofloxacin",e:"Phase II",a:"inactive",p:5,note:"Minor conjugation product"},
  {n:"Oxo-ciprofloxacin",e:"CYP1A2",a:"weak",p:5,note:"Retains partial activity"},
  {n:"Ciprofloxacin (unchanged, renal)",e:"None",a:"active",p:65,t:4,note:"~50% renal excretion unchanged"}
],
"Levofloxacin":[
  {n:"Desmethyl-levofloxacin",e:"CYP",a:"inactive",p:5,t:7,note:"Minor metabolite (<5%)"},
  {n:"Levofloxacin N-oxide",e:"CYP",a:"inactive",p:2,note:"Trace amounts"},
  {n:"Levofloxacin (unchanged, renal)",e:"None",a:"active",p:87,t:7,note:"~87% excreted unchanged in urine"}
],
"Moxifloxacin":[
  {n:"Moxifloxacin sulfate (M1)",e:"SULT",a:"inactive",p:35,t:12,note:"Major metabolite; sulfate conjugation (NOT CYP)"},
  {n:"Moxifloxacin glucuronide (M2)",e:"UGT",a:"inactive",p:15,note:"Phase II conjugation"},
  {n:"Moxifloxacin (unchanged, fecal/renal)",e:"None",a:"active",p:45,t:12,note:"~45% unchanged in feces/urine"}
],
"Metronidazole":[
  {n:"Hydroxy-metronidazole",e:"CYP2A6/3A4",a:"active",p:35,t:8,note:"30-65% antimicrobial activity of parent"},
  {n:"Metronidazole acetic acid",e:"Oxidation",a:"inactive",p:15,note:"Side-chain oxidation"},
  {n:"Metronidazole (unchanged, renal)",e:"None",a:"active",p:20,t:8,note:"~20% excreted unchanged"}
],
"Doxycycline":[
  {n:"Doxycycline (unchanged, fecal)",e:"None",a:"active",p:40,t:18,note:"Chelates Ca²⁺/Fe²⁺ in gut; no significant hepatic metabolism"},
  {n:"Doxycycline (unchanged, renal)",e:"None",a:"active",p:40,t:18,note:"~40% renal excretion"},
  {n:"Epimer/degradation products",e:"Spontaneous",a:"inactive",p:10,note:"pH-dependent degradation; avoid expired tetracyclines (nephrotoxic)"}
],
"Amoxicillin":[
  {n:"Amoxicilloic acid (penicilloic)",e:"β-lactam hydrolysis",a:"inactive",p:30,t:1.2,note:"Ring-opened; major allergenic determinant"},
  {n:"Amoxicillin (unchanged, renal)",e:"None",a:"active",p:60,t:1.2,note:"60% excreted unchanged in urine"},
  {n:"Diketopiperazine",e:"Spontaneous",a:"inactive",p:5,note:"Intramolecular cyclization"}
],
"Trimethoprim/Sulfamethoxazole":[
  {n:"TMP oxide metabolites",e:"CYP2C9/3A4",a:"inactive",p:20,t:10,note:"Trimethoprim: 80% renal unchanged"},
  {n:"N4-acetyl-sulfamethoxazole",e:"NAT2",a:"inactive",p:40,t:10,note:"Major SMX metabolite; NAT2 acetylation (slow acetylators: toxicity↑)"},
  {n:"SMX hydroxylamine",e:"CYP2C9",a:"toxic",p:5,note:"Reactive metabolite → hypersensitivity reactions; detoxified by glutathione"}
],
"Rifampin":[
  {n:"25-Desacetyl-rifampin",e:"Esterases",a:"active",p:30,t:3,note:"Retains antimicrobial activity"},
  {n:"3-Formyl-rifampin",e:"Oxidation",a:"inactive",p:10,note:"Autoinduction accelerates own metabolism"},
  {n:"Rifampin (biliary excretion)",e:"P-gp",a:"active",p:50,t:3,note:"Potent CYP3A4/2C9/2C19/1A2 inducer → ↓ nearly all co-medications"}
],
"Nitrofurantoin":[
  {n:"Aminofurantoin",e:"Nitroreductases",a:"active",p:40,t:0.5,note:"Reduced form → damages bacterial DNA; active inside bacteria"},
  {n:"Nitrofurantoin (unchanged, renal)",e:"None",a:"active",p:40,t:0.5,note:"Concentrated in urine; only effective for UTI, not systemic infections"}
],
"Clindamycin":[
  {n:"Clindamycin sulfoxide",e:"CYP3A4",a:"weak",p:20,t:3,note:"Retains partial antibacterial activity"},
  {n:"N-desmethyl-clindamycin",e:"CYP3A4",a:"weak",p:10,note:"Partial activity"},
  {n:"Clindamycin (biliary excretion)",e:"None",a:"active",p:30,t:3,note:"Significant biliary excretion → C. difficile risk"}
],
"Voriconazole":[
  {n:"Voriconazole N-oxide",e:"CYP2C19",a:"inactive",p:50,t:6,note:"Inactive major metabolite; CYP2C19 PMs form less N-oxide while parent voriconazole accumulates. Population PK data reinforce that CYP2C19 genotype affects clearance, but therapeutic drug monitoring supersedes genotype-only prediction.",evidenceRefs:["ev_voriconazole_cyp2c19_hyland2008","ev_voriconazole_pop_pk_wang2013"]},
  {n:"Hydroxy-voriconazole",e:"CYP3A4",a:"inactive",p:15,note:"Secondary oxidation"},
  {n:"Dihydroxy-voriconazole",e:"CYP2C19/3A4",a:"inactive",p:10,note:"Further oxidation; all metabolites inactive against fungi"}
],
"Posaconazole":[
  {n:"Posaconazole glucuronide",e:"UGT1A4",a:"inactive",p:15,t:25,note:"Phase II conjugation; major route"},
  {n:"Posaconazole (unchanged, fecal)",e:"None",a:"active",p:66,t:25,note:"~66% excreted unchanged in feces; minimal CYP metabolism"}
],
"Lorazepam":[
  {n:"Lorazepam glucuronide",e:"UGT2B15",a:"inactive",p:85,t:12,note:"Direct glucuronidation — NO CYP metabolism (safe in liver disease)"},
  {n:"Lorazepam (unchanged, renal)",e:"None",a:"active",p:10,t:12,note:"~10% unchanged in urine"}
],
"Triazolam":[
  {n:"α-Hydroxytriazolam",e:"CYP3A4",a:"active",p:55,t:3,note:"Primary active metabolite; 50% potency of parent"},
  {n:"4-Hydroxytriazolam",e:"CYP3A4",a:"inactive",p:25,note:"Secondary hydroxylation"},
  {n:"α-Hydroxytriazolam glucuronide",e:"UGT",a:"inactive",p:15,note:"Phase II conjugation for elimination"}
],
"Naproxen":[
  {n:"6-O-desmethyl-naproxen",e:"CYP2C9",a:"inactive",p:60,t:14,note:"Major metabolite; no anti-inflammatory activity"},
  {n:"Naproxen acyl-glucuronide",e:"UGT2B7",a:"inactive",p:25,note:"Reactive intermediate → GI toxicity mechanism"},
  {n:"Naproxen sulfate",e:"SULT",a:"inactive",p:5,note:"Minor conjugation"}
],
"Meloxicam":[
  {n:"5'-Carboxy-meloxicam",e:"CYP2C9",a:"inactive",p:55,t:20,note:"Major metabolite via alcohol then carboxylic acid"},
  {n:"5'-Hydroxymethyl-meloxicam",e:"CYP2C9/3A4",a:"inactive",p:25,note:"Intermediate; further oxidized to carboxy"},
  {n:"Meloxicam (unchanged, fecal)",e:"None",a:"active",p:10,t:20,note:"Long half-life allows once-daily dosing"}
],
"Diclofenac":[
  {n:"4'-Hydroxy-diclofenac",e:"CYP2C9",a:"inactive",p:45,t:2,note:"Major metabolite; reactive quinone-imine intermediate → hepatotoxicity"},
  {n:"5-Hydroxy-diclofenac",e:"CYP3A4",a:"inactive",p:20,note:"Minor hydroxylation route"},
  {n:"Diclofenac acyl-glucuronide",e:"UGT2B7",a:"inactive",p:20,note:"Reactive; protein adducts → immune-mediated liver injury"}
],
"Indomethacin":[
  {n:"O-Desmethyl-indomethacin",e:"CYP2C9",a:"inactive",p:30,t:5,note:"Demethylation product"},
  {n:"O-Deschlorobenzoyl-indomethacin",e:"CYP2C19",a:"inactive",p:15,note:"Deacylation"},
  {n:"Indomethacin acyl-glucuronide",e:"UGT",a:"inactive",p:15,note:"Undergoes enterohepatic recycling → prolonged GI exposure"}
],
"Lamotrigine":[
  {n:"Lamotrigine-2N-glucuronide",e:"UGT1A4",a:"inactive",p:75,t:25,note:"Primary elimination; affected by valproate (inhibitor) and OCs (inducers)"},
  {n:"Lamotrigine-5N-glucuronide",e:"UGT1A4",a:"inactive",p:10,note:"Minor glucuronidation site"},
  {n:"2-N-methyl-lamotrigine",e:"Methylation",a:"inactive",p:5,note:"Minor pathway"}
],
"Levetiracetam":[
  {n:"L057 (carboxylic acid metabolite)",e:"Blood esterases",a:"inactive",p:24,t:7,note:"Enzymatic hydrolysis of acetamide group; NOT CYP dependent"},
  {n:"Levetiracetam (unchanged, renal)",e:"None",a:"active",p:66,t:7,note:"66% excreted unchanged in urine"}
],
"Topiramate":[
  {n:"Topiramate (unchanged, renal)",e:"None",a:"active",p:70,t:21,note:"~70% excreted unchanged when used alone"},
  {n:"Hydroxy-topiramate metabolites",e:"CYP3A4",a:"inactive",p:15,note:"Formation increases with CYP3A4 inducers (phenytoin, carbamazepine)"},
  {n:"Topiramate glucuronide",e:"UGT",a:"inactive",p:5,note:"Minor conjugation"}
],
"Gabapentin":[
  {n:"Gabapentin (unchanged, renal)",e:"None",a:"active",p:100,t:6,note:"Zero metabolism; 100% excreted unchanged renally. Dose adjust for CrCl"}
],
"Pregabalin":[
  {n:"N-methyl-pregabalin",e:"Methylation",a:"inactive",p:1,t:6,note:"Negligible (<1%)"},
  {n:"Pregabalin (unchanged, renal)",e:"None",a:"active",p:98,t:6,note:"98% excreted unchanged; dose adjust for renal impairment"}
],
"Oxcarbazepine":[
  {n:"10-Monohydroxy derivative (MHD/licarbazepine)",e:"Cytosolic reductases",a:"active",p:80,t:9,note:"THE active metabolite responsible for anticonvulsant effect"},
  {n:"MHD glucuronide",e:"UGT",a:"inactive",p:40,note:"Primary elimination of MHD"},
  {n:"10,11-Dihydroxy metabolite (DHD)",e:"UGT",a:"inactive",p:5,note:"Minor oxidation of MHD"}
],
"Lithium":[
  {n:"Lithium ion (unchanged, renal)",e:"None",a:"active",p:100,t:20,note:"Zero metabolism; handled like sodium by kidney. NSAIDs/ACEi/dehydration → toxicity"}
],
"Ziprasidone":[
  {n:"Ziprasidone sulfoxide",e:"Aldehyde oxidase",a:"inactive",p:35,t:7,note:"Major route — aldehyde oxidase, NOT CYP (unusual)"},
  {n:"S-methyl-dihydro-ziprasidone",e:"Thiol methylation",a:"inactive",p:30,note:"Reductive metabolism"},
  {n:"6,7-Dihydro-ziprasidone",e:"Aldehyde oxidase",a:"inactive",p:15,note:"Reduction product"}
],
"Lurasidone":[
  {n:"ID-14283 (norbornane hydroxylation)",e:"CYP3A4",a:"active",p:25,t:18,note:"Active metabolite — similar D2/5-HT2A binding"},
  {n:"ID-14326",e:"CYP3A4",a:"active",p:5,note:"Minor active metabolite"},
  {n:"ID-20219 (N-dealkylated)",e:"CYP3A4",a:"inactive",p:15,note:"Inactive metabolite"}
],
"Paliperidone":[
  {n:"Paliperidone (unchanged, renal)",e:"None",a:"active",p:60,t:23,note:"~60% excreted unchanged renally; minimal CYP involvement"},
  {n:"Dealkylated metabolite",e:"CYP3A4",a:"inactive",p:10,note:"Minor"},
  {n:"Paliperidone glucuronide",e:"UGT",a:"inactive",p:15,note:"Minor conjugation"}
],
"Brexpiprazole":[
  {n:"DM-3411",e:"CYP3A4",a:"weak",p:25,t:86,note:"Major metabolite; minimal pharmacological activity at D2/5-HT1A"},
  {n:"Hydroxy-brexpiprazole",e:"CYP2D6",a:"inactive",p:15,note:"Ring hydroxylation",evidenceRefs:["ev_antipsychotic_cyp2d6_labels"]},
  {n:"Brexpiprazole sulfoxide",e:"FMO3",a:"inactive",p:10,note:"Flavin monooxygenase pathway"}
],
"Cariprazine":[
  {n:"Desmethyl-cariprazine (DDCAR)",e:"CYP3A4",a:"active",p:30,t:48,note:"Pharmacologically active; accumulates due to long t½"},
  {n:"Didesmethyl-cariprazine (DCAR)",e:"CYP3A4/2D6",a:"active",p:25,t:336,note:"Active metabolite with 2-3 WEEK half-life — effects persist weeks after discontinuation"},
  {n:"Hydroxy-cariprazine",e:"CYP3A4",a:"inactive",p:10,note:"Inactive oxidation product"}
],
"Metformin":[
  {n:"Metformin (unchanged, renal)",e:"None",a:"active",p:100,t:5,note:"Zero metabolism; 100% renal excretion unchanged via OCT2/MATE transporters"}
],
"Glipizide":[
  {n:"Hydroxy-cyclohexyl-glipizide",e:"CYP2C9",a:"inactive",p:40,t:4,note:"Primary metabolite; no hypoglycemic activity"},
  {n:"Aryl-amino-glipizide",e:"CYP2C9",a:"inactive",p:20,note:"Deamination product"},
  {n:"Glipizide (unchanged, renal)",e:"None",a:"active",p:10,t:4,note:"~10% unchanged in urine"}
],
"Glyburide":[
  {n:"4-trans-Hydroxy-glyburide",e:"CYP2C9",a:"active",p:35,t:10,note:"Active metabolite — retains 50% hypoglycemic potency → prolonged hypoglycemia risk"},
  {n:"3-cis-Hydroxy-glyburide",e:"CYP3A4",a:"weak",p:20,note:"Less active metabolite"},
  {n:"4-trans-Hydroxy-glyburide glucuronide",e:"UGT",a:"inactive",p:15,note:"Clearance form"}
],
"Pioglitazone":[
  {n:"M-IV (hydroxy-pioglitazone)",e:"CYP2C8",a:"active",p:25,t:5,note:"Active metabolite; PPARγ agonist activity"},
  {n:"M-III (keto-pioglitazone)",e:"CYP2C8/3A4",a:"active",p:20,t:27,note:"Active; long half-life contributes to sustained effect"},
  {n:"M-II",e:"CYP3A4",a:"weak",p:15,note:"Minor active metabolite"}
],
"Sitagliptin":[
  {n:"Sitagliptin (unchanged, renal)",e:"None",a:"active",p:79,t:12,note:"79% excreted unchanged in urine; minimal metabolism"},
  {n:"Hydroxy-sitagliptin (CYP3A4/2C8)",e:"CYP3A4",a:"inactive",p:16,note:"Six trace metabolites, none clinically significant"}
],
"Empagliflozin":[
  {n:"Empagliflozin glucuronides",e:"UGT2B7/1A3/1A8/1A9",a:"inactive",p:50,t:13,note:"Glucuronidation is primary elimination; NO CYP metabolism"},
  {n:"Empagliflozin (unchanged, fecal/renal)",e:"None",a:"active",p:40,t:13,note:"~27% renal unchanged + fecal elimination"}
],
"Dapagliflozin":[
  {n:"Dapagliflozin 3-O-glucuronide",e:"UGT1A9",a:"inactive",p:60,t:13,note:"Major metabolite; no SGLT2 inhibition"},
  {n:"Dapagliflozin (unchanged, renal)",e:"None",a:"active",p:5,t:13,note:"Only ~2% unchanged in urine (works in tubular lumen)"}
],
"Canagliflozin":[
  {n:"Canagliflozin O-glucuronide (M7)",e:"UGT1A9/2B4",a:"inactive",p:45,t:11,note:"Major metabolite"},
  {n:"Canagliflozin O-glucuronide (M5)",e:"UGT1A9/2B4",a:"inactive",p:15,note:"Minor glucuronide"},
  {n:"Hydroxy-canagliflozin",e:"CYP3A4",a:"inactive",p:7,note:"Minor oxidative pathway"}
],
"Semaglutide":[
  {n:"Semaglutide (proteolytic degradation)",e:"Endopeptidases",a:"inactive",p:100,t:168,note:"GLP-1 analog; degraded by non-specific proteases. t½ ~1 week (albumin binding)"},
  {n:"Semaglutide fragments",e:"Proteases",a:"inactive",p:0,note:"No single defined metabolite; cleaved into amino acids"}
],
"Liraglutide":[
  {n:"Liraglutide fragments",e:"Endopeptidases",a:"inactive",p:100,t:13,note:"Degraded by DPP-4 and endopeptidases into amino acids; no active metabolites"},
  {n:"Liraglutide (intact, urine)",e:"None",a:"active",p:6,note:"Only 6% excreted as intact peptide in urine/feces"}
],
"Levothyroxine":[
  {n:"Triiodothyronine (T3)",e:"Deiodinase D1/D2",a:"active",p:35,t:24,note:"Active form; 80% of circulating T3 comes from T4 deiodination"},
  {n:"Reverse T3 (rT3)",e:"Deiodinase D3",a:"inactive",p:40,note:"Inactive; ↑ in illness/fasting ('sick euthyroid')"},
  {n:"T3/T4 glucuronides",e:"UGT1A1",a:"inactive",p:20,note:"Hepatic conjugation → biliary excretion → enterohepatic recycling"}
],
"Liothyronine":[
  {n:"3,5-Diiodo-L-thyronine (T2)",e:"Deiodinase",a:"weak",p:40,t:1,note:"Further deiodination; T2 may have mitochondrial metabolic effects"},
  {n:"T3 glucuronide/sulfate",e:"UGT/SULT",a:"inactive",p:30,note:"Conjugation for biliary elimination"},
  {n:"Triiodothyroacetic acid (Triac)",e:"Oxidative deamination",a:"active",p:5,note:"Minor metabolite with thyroid hormone activity"}
],
"Methimazole":[
  {n:"Methimazole (thyroid accumulation)",e:"TPO interaction",a:"active",p:0,t:6,note:"Inhibits TPO directly; no metabolites needed for action"},
  {n:"3-Methyl-2-thiohydantoin",e:"Ring modification",a:"inactive",p:30,note:"Major urinary metabolite"},
  {n:"Methimazole sulfate/glucuronide",e:"Phase II",a:"inactive",p:20,note:"Conjugation products"}
],
"Prednisone":[
  {n:"Prednisolone",e:"11β-HSD1 (liver)",a:"active",p:80,t:3,note:"PRODRUG → active form; conversion impaired in liver disease"},
  {n:"6β-Hydroxy-prednisolone",e:"CYP3A4",a:"inactive",p:10,note:"Hydroxylation (increased by CYP3A4 inducers)"},
  {n:"20-Reduced metabolites",e:"Reductases",a:"inactive",p:5,note:"Ketone reduction products"}
],
"Prednisolone":[
  {n:"Prednisone (reversible interconversion)",e:"11β-HSD2",a:"active",p:10,t:3,note:"Reversible oxidation by 11β-HSD2"},
  {n:"6β-Hydroxy-prednisolone",e:"CYP3A4",a:"inactive",p:25,note:"Major elimination pathway; induced by rifampin/phenytoin"},
  {n:"20β-Hydroxy-prednisolone",e:"20-ketoreductase",a:"inactive",p:20,note:"Reduction product"}
],
"Dexamethasone":[
  {n:"6β-Hydroxy-dexamethasone",e:"CYP3A4",a:"inactive",p:60,t:36,note:"Primary metabolite; long half-life due to fluorination"},
  {n:"11-Dehydro-dexamethasone",e:"11β-HSD2",a:"inactive",p:10,note:"Oxidation at C11"}
],
"Methylprednisolone":[
  {n:"6β-Hydroxy-methylprednisolone",e:"CYP3A4",a:"inactive",p:50,t:3,note:"Primary metabolite"},
  {n:"20β-Reduced metabolite",e:"Reductases",a:"inactive",p:20,note:"Ketone reduction"},
  {n:"Methylprednisolone (unchanged, renal)",e:"None",a:"active",p:5,t:3,note:"<5% unchanged in urine"}
],
"Hydrocortisone":[
  {n:"Cortisone",e:"11β-HSD2",a:"weak",p:20,t:1.5,note:"Inactive 11-keto form; reversible interconversion"},
  {n:"Tetrahydrocortisol",e:"5α/5β-reductase",a:"inactive",p:40,note:"Major urinary metabolite"},
  {n:"6β-Hydroxycortisol",e:"CYP3A4",a:"inactive",p:10,note:"Urinary marker of CYP3A4 activity"}
],
"Budesonide":[
  {n:"6β-Hydroxy-budesonide",e:"CYP3A4",a:"inactive",p:60,t:3,note:"Major metabolite; <1% activity of parent"},
  {n:"16α-Hydroxy-prednisolone",e:"CYP3A4",a:"inactive",p:20,note:"Less than 1% glucocorticoid activity"},
  {n:"Budesonide (systemic, after first pass)",e:"CYP3A4",a:"active",p:10,note:"~90% first-pass metabolism → low systemic bioavailability"}
],
"Mycophenolate":[
  {n:"Mycophenolic acid (MPA)",e:"Esterases",a:"active",p:95,t:17,note:"Active metabolite from mycophenolate mofetil (prodrug); ABCG2 c.421C>A is an exposure-review flag, not a standalone dose rule",evidenceRefs:["ev_mycophenolate_enterohepatic_label","ev_mycophenolate_abcg2_boribilui2022"]},
  {n:"MPA glucuronide (MPAG)",e:"UGT1A9",a:"inactive",p:85,note:"Major elimination; undergoes enterohepatic recycling",evidenceRefs:["ev_mycophenolate_enterohepatic_label"]},
  {n:"Acyl-MPAG",e:"UGT2B7",a:"toxic",p:10,note:"Reactive acyl glucuronide linked to GI/toxicity context; UGT2B7 variant signals need transplant-pharmacy review",evidenceRefs:["ev_mycophenolate_ugt2b7_ting2009"]}
],
"Sirolimus":[
  {n:"Hydroxy-sirolimus",e:"CYP3A4",a:"weak",p:30,t:62,note:"7 major metabolites identified; all weak immunosuppressive activity"},
  {n:"Demethyl-sirolimus",e:"CYP3A4",a:"weak",p:15,note:"O-demethylation product"},
  {n:"Sirolimus (unchanged)",e:"None",a:"active",p:40,t:62,note:"Concentrates in red blood cells; very long half-life"}
],
"Azathioprine":[
  {n:"6-Mercaptopurine (6-MP)",e:"Non-enzymatic/GST",a:"active",p:88,t:1,note:"PRODRUG activation; same active moiety as standalone 6-MP"},
  {n:"6-Thioguanine nucleotides (6-TGN)",e:"HPRT/FPGS",a:"active",p:0,note:"THE cytotoxic metabolites; increased in TPMT PMs due to shunting away from methylation",evidenceRefs:["ev_azathioprine_tpmt_cpic2019"]},
  {n:"6-Methylmercaptopurine (6-MMP)",e:"TPMT",a:"toxic",p:30,note:"Hepatotoxic at high levels (>5700 pmol); TPMT shunting"},
  {n:"Thiouric acid",e:"Xanthine oxidase",a:"inactive",p:30,note:"Inactivation pathway; blocked by allopurinol → 6-MP toxicity"}
],
// ── ANTIRETROVIRALS ──
"Efavirenz":[
  {n:"8-Hydroxyefavirenz",e:"CYP2B6",a:"inactive",p:40,t:24,note:"Primary inactive CYP2B6 metabolite. CYP2B6 PM: 8-OH formation impaired while parent efavirenz accumulates.",evidenceRefs:["ev_efavirenz_cyp2b6_desta2019"]},
  {n:"7-Hydroxyefavirenz",e:"CYP2A6",a:"inactive",p:15},
  {n:"8,14-Dihydroxyefavirenz",e:"CYP3A4",a:"inactive",p:15}
],
// ── CHEMOTHERAPY ──
"Irinotecan":[
  {n:"SN-38 (7-ethyl-10-hydroxycamptothecin)",e:"CES1/CES2",a:"active_form",role:"active_form",p:5,t:12,note:"Active cytotoxic metabolite. Detoxified by UGT1A1 to inactive SN-38G; UGT1A1 PMs accumulate SN-38. Public PK review abstracts describe SN-38 as roughly 100- to 1000-fold more cytotoxic than irinotecan parent.",evidenceRefs:["ev_irinotecan_ugt1a1_ramsey2014","ev_irinotecan_ugt1a1_stewart2007","ev_irinotecan_ugt1a_han2006","ev_irinotecan_sn38_review_mathijssen2001"]},
  {n:"SN-38G (SN-38 glucuronide)",e:"UGT1A1",a:"inactive",p:60,t:24,note:"Inactive glucuronide elimination pathway. Lower SN-38G/SN-38 AUC ratios in UGT1A reduced-function contexts support the metabolite-balance risk model.",evidenceRefs:["ev_irinotecan_ugt1a1_ramsey2014","ev_irinotecan_ugt1a1_stewart2007","ev_irinotecan_ugt1a_han2006"]},
  {n:"APC (7-ethyl-10-[4-N-(5-aminopentanoic acid)-1-piperidino]carbonyloxycamptothecin)",e:"CYP3A4",a:"inactive",p:25,note:"Inactive oxidative metabolite. CYP3A4 inducers can increase APC and reduce SN-38."}
],
"Fluorouracil":[
  {n:"Dihydrofluorouracil (DHFU)",e:"DPYD",a:"inactive",p:80,t:24,note:"Inactive catabolite. DPYD PM: DHFU formation impaired while parent 5-FU accumulates.",evidenceRefs:["ev_fluorouracil_dpyd_amstutz2018"]},
  {n:"FBAL (alpha-fluoro-beta-alanine)",e:"DPYD",a:"inactive",p:60,note:"Final urinary catabolite."}
],
"Capecitabine":[
  {n:"5-Fluorouracil",e:"CES/TP",a:"active_form",role:"active_form",p:100,t:0.25,note:"Active fluoropyrimidine formed from capecitabine. DPYD loss-of-function impairs 5-FU catabolism and raises severe toxicity risk.",evidenceRefs:["ev_fluorouracil_dpyd_amstutz2018"]}
],
"Vardenafil":[
  {n:"M1 (N-desethyl-vardenafil)",e:"CYP3A4",a:"active",p:25,t:4,note:"Active metabolite with ~28% potency at PDE5"},
  {n:"Piperazine ring-opened metabolites",e:"CYP3A4",a:"inactive",p:20,note:"Further degradation"},
  {n:"Vardenafil glucuronide",e:"UGT",a:"inactive",p:10,note:"Phase II conjugation"}
],
"Tamsulosin":[
  {n:"Hydroxy-tamsulosin metabolites",e:"CYP3A4/2D6",a:"inactive",p:50,t:13,note:"Multiple hydroxylation products; all inactive at α1A-adrenoceptor"},
  {n:"Tamsulosin glucuronides",e:"UGT",a:"inactive",p:20,note:"Phase II conjugation"},
  {n:"Tamsulosin sulfate",e:"SULT",a:"inactive",p:10,note:"Minor pathway"}
],
"Finasteride":[
  {n:"ω-Hydroxy-finasteride",e:"CYP3A4",a:"inactive",p:35,t:6,note:"Terminal hydroxylation"},
  {n:"Finasteride dicarboxylic acid",e:"CYP3A4",a:"inactive",p:30,note:"Side-chain oxidation to acid"},
  {n:"Finasteride (unchanged, fecal)",e:"None",a:"active",p:30,t:6,note:"~40% fecal excretion"}
],
"Montelukast":[
  {n:"M5a (acyl-glucuronide)",e:"CYP2C8",a:"inactive",p:30,t:5,note:"CYP2C8 is the principal enzyme"},
  {n:"M6 (sulfoxide)",e:"CYP3A4/2C9",a:"inactive",p:20,note:"Major oxidative pathway"},
  {n:"Montelukast (biliary, unchanged)",e:"None",a:"active",p:40,t:5,note:"86% excreted in feces via bile"}
],
"Cetirizine":[
  {n:"Cetirizine (unchanged, renal)",e:"None",a:"active",p:70,t:8,note:"Minimal metabolism; ~70% excreted unchanged in urine"},
  {n:"Oxidative/dealkylated metabolites",e:"CYP3A4",a:"inactive",p:10,note:"Minor; cetirizine is already the active metabolite of hydroxyzine"}
],
"Loratadine":[
  {n:"Desloratadine (DCL)",e:"CYP3A4/2D6",a:"active",p:70,t:27,note:"Active metabolite; 4× more potent H1 antagonist than parent"},
  {n:"3-Hydroxy-desloratadine glucuronide",e:"CYP2C8/UGT",a:"inactive",p:50,note:"Major elimination form of desloratadine"},
  {n:"Loratadine (unchanged)",e:"None",a:"active",p:3,t:8,note:"Extensive first-pass → very low parent drug in plasma"}
],
"Fexofenadine":[
  {n:"Fexofenadine (unchanged, fecal)",e:"None",a:"active",p:80,t:14,note:"~80% fecal, 12% renal unchanged; virtually no metabolism"},
  {n:"Methyl-ester metabolite",e:"Esterases",a:"inactive",p:5,note:"Minor (<5%)"}
],
"Ondansetron":[
  {n:"7-Hydroxy-ondansetron",e:"CYP3A4",a:"inactive",p:30,t:4,note:"Hydroxylation and subsequent glucuronidation"},
  {n:"8-Hydroxy-ondansetron",e:"CYP1A2",a:"inactive",p:20,note:"CYP1A2 route; induced by smoking"},
  {n:"Ondansetron glucuronide",e:"UGT",a:"inactive",p:20,note:"Direct glucuronidation; CYP2D6 ultrarapid status is mainly a response/reduced-exposure context",evidenceRefs:["ev_ondansetron_cyp2d6_cpic2017"]}
],
"Metoclopramide":[
  {n:"Metoclopramide sulfate",e:"SULT",a:"inactive",p:20,t:5,note:"Sulfation conjugate"},
  {n:"Metoclopramide glucuronide",e:"UGT",a:"inactive",p:15,note:"Glucuronidation"},
  {n:"N-deethyl-metoclopramide",e:"CYP2D6",a:"weak",p:10,note:"CYP2D6 PMs → higher parent levels → ↑ EPS risk",evidenceRefs:["ev_metoclopramide_cyp2d6_livezey2014"]},
  {n:"Metoclopramide (unchanged, renal)",e:"None",a:"active",p:25,t:5,note:"~25% unchanged in urine"}
],
"Domperidone":[
  {n:"Hydroxy-domperidone",e:"CYP3A4",a:"inactive",p:40,t:7,note:"Ring hydroxylation"},
  {n:"N-dealkyl-domperidone",e:"CYP3A4/1A2",a:"inactive",p:25,note:"Major oxidative metabolite"},
  {n:"Domperidone (fecal unchanged)",e:"None",a:"active",p:30,t:7,note:"~30% fecal excretion"}
],
"Sumatriptan":[
  {n:"Indole acetic acid (IAA) analog",e:"MAO-A",a:"inactive",p:70,t:2,note:"Primary metabolite via MAO-A; explains interaction with MAOIs"},
  {n:"Sumatriptan glucuronide",e:"UGT",a:"inactive",p:10,note:"Minor direct conjugation"},
  {n:"Sumatriptan (unchanged, renal)",e:"None",a:"active",p:20,t:2,note:"Short-acting; multiple doses often needed"}
],
"Allopurinol":[
  {n:"Oxypurinol (alloxanthine)",e:"Xanthine oxidase",a:"active",p:70,t:23,note:"Active metabolite; same enzyme inhibition as parent but much longer acting",evidenceRefs:["ev_allopurinol_oxypurinol_label"]},
  {n:"Allopurinol riboside",e:"HPRT",a:"inactive",p:5,note:"Nucleoside analog"}
],
"Cyclobenzaprine":[
  {n:"Norcyclobenzaprine",e:"CYP3A4/1A2",a:"weak",p:35,t:32,note:"N-demethylation; long t½ contributes to prolonged sedation"},
  {n:"Cyclobenzaprine glucuronide",e:"UGT",a:"inactive",p:30,note:"Direct glucuronidation"},
  {n:"Trans-dihydrodiol",e:"CYP",a:"inactive",p:10,note:"Ring oxidation"}
],
"Tizanidine":[
  {n:"Tizanidine sulfate",e:"SULT",a:"inactive",p:30,t:2.5,note:"Major pathway; CYP1A2 dependent for first oxidation step"},
  {n:"5-Chloro-4-(2-imidazolin-2-ylamino)-2-one",e:"CYP1A2",a:"inactive",p:20,note:"Oxidative metabolite — CYP1A2 inhibitors (fluvoxamine, ciprofloxacin) cause 33× ↑ in AUC"},
  {n:"Tizanidine glucuronide",e:"UGT",a:"inactive",p:15,note:"Minor conjugation"}
],
"Hydroxychloroquine":[
  {n:"Desethyl-hydroxychloroquine (DHCQ)",e:"CYP2C8/3A4",a:"active",p:25,t:40,note:"Active metabolite; accumulates in tissues"},
  {n:"Desethyl-chloroquine (DCQ)",e:"CYP2D6",a:"active",p:10,note:"Further dealkylation; retains activity",evidenceRefs:["ev_hydroxychloroquine_cyp2d6_invitro"]},
  {n:"Bisdesethyl-chloroquine",e:"CYP3A4",a:"weak",p:5,t:40,note:"Terminal metabolite"},
  {n:"HCQ (unchanged, renal)",e:"None",a:"active",p:25,t:40,note:"Very long t½ (40 days); takes months to reach steady state"}
],
"Methotrexate":[
  {n:"7-Hydroxy-methotrexate",e:"Aldehyde oxidase",a:"weak",p:30,t:8,note:"Hepatic; less folate antagonism but nephrotoxic at high doses",evidenceRefs:["ev_methotrexate_hdmtx_pgpk_taylor2021"]},
  {n:"MTX polyglutamates (intracellular)",e:"FPGS",a:"active",p:0,note:"Retained intracellularly; responsible for sustained immunosuppression; MTHFR/transporter signals are context flags, not standalone dose rules",evidenceRefs:["ev_mthfr_c677t_methotrexate_toxicity_meta","ev_methotrexate_pgtox_meta_song2021"]},
  {n:"DAMPA (4-amino-4-deoxy-N10-methylpteroic acid)",e:"Gut flora",a:"inactive",p:5,note:"Bacterial cleavage product"},
  {n:"Methotrexate (unchanged, renal)",e:"None",a:"active",p:60,t:8,note:"80-90% renal excretion unchanged — requires adequate GFR"}
],
"Digoxin":[
  {n:"Digoxin (unchanged, renal)",e:"None",a:"active",p:70,t:36,note:"Primarily renal excretion unchanged via P-gp; narrow therapeutic index"},
  {n:"Dihydrodigoxin",e:"Gut flora (Eggerthella lenta)",a:"inactive",p:10,note:"Gut bacterial reduction; varies 10-40% between patients"},
  {n:"Digoxigenin bisdigitoxoside",e:"Acid hydrolysis",a:"weak",p:5,note:"Sugar cleavage product"}
],
"Furosemide":[
  {n:"Furosemide glucuronide",e:"UGT1A1/1A6",a:"inactive",p:20,t:1.5,note:"Hepatic conjugation (~50% of dose in renal impairment)"},
  {n:"Furosemide (unchanged, renal)",e:"None",a:"active",p:65,t:1.5,note:"Active secretion into tubular lumen via OAT; must reach loop of Henle"},
  {n:"4-Chloro-5-sulfamoyl-anthranilic acid (CSA)",e:"Spontaneous",a:"inactive",p:5,note:"Degradation product"}
],
"Hydrochlorothiazide":[
  {n:"HCTZ (unchanged, renal)",e:"None",a:"active",p:95,t:10,note:"Not metabolized; >95% excreted unchanged in urine"}
],
"Ranitidine":[
  {n:"Ranitidine N-oxide",e:"FMO",a:"inactive",p:6,t:3,note:"Flavin monooxygenase oxidation"},
  {n:"Ranitidine S-oxide",e:"FMO",a:"inactive",p:4,note:"Minor sulfoxide"},
  {n:"Ranitidine (unchanged, renal)",e:"None",a:"active",p:70,t:3,note:"~70% renal unchanged; NDMA concerns led to market withdrawal"}
],
"Moclobemide":[
  {n:"Moclobemide Ro 12-8095 (ring hydroxylation)",e:"CYP2C19",a:"inactive",p:40,t:2,note:"Primary metabolite; CYP2C19 PMs have 3× higher parent levels"},
  {n:"Moclobemide N-oxide",e:"FMO",a:"inactive",p:20,note:"Flavin monooxygenase pathway"},
  {n:"Morpholine ring-opened metabolite",e:"Oxidation",a:"inactive",p:15,note:"Minor route; not treated as a CYP2D6-specific relation in the current graph"}
],
"Loperamide":[
  {n:"N-desmethyl-loperamide",e:"CYP3A4/2C8",a:"weak",p:45,t:11,note:"Primary metabolite via N-demethylation"},
  {n:"Loperamide (fecal, unchanged)",e:"None",a:"active",p:30,t:11,note:"Acts locally in gut; P-gp keeps it OUT of CNS (at normal doses)"},
  {n:"Hydroxy-loperamide",e:"CYP3A4/2C8",a:"inactive",p:10,note:"Minor oxidation; not treated as a CYP2D6-specific relation in the current graph"}
],
"Pseudoephedrine":[
  {n:"Norpseudoephedrine (cathine)",e:"N-demethylation",a:"active",p:5,t:6,note:"Minor route; pseudoephedrine is mostly excreted unchanged and not treated as a CYP2D6 genotype edge"},
  {n:"Pseudoephedrine (unchanged, renal)",e:"None",a:"active",p:70,t:6,note:"~70-90% excreted unchanged; pH-dependent renal clearance"}
],
"Guaifenesin":[
  {n:"β-(2-methoxyphenoxy)-lactic acid",e:"Oxidation",a:"inactive",p:60,t:1,note:"Major urinary metabolite via side-chain oxidation"},
  {n:"Guaifenesin (unchanged, renal)",e:"None",a:"active",p:5,t:1,note:"Very short half-life; requires frequent dosing"}
],
"Valerian":[
  {n:"Valerenic acid metabolites",e:"CYP3A4/UGT",a:"weak",p:50,t:2,note:"GABA-A receptor modulation; metabolized like other terpenoids"},
  {n:"Isovaleric acid",e:"Oxidation",a:"inactive",p:20,note:"Short-chain fatty acid; contributes to characteristic odor"}
],
"Vitamin K":[
  {n:"Vitamin K epoxide",e:"VKORC1",a:"inactive",p:0,note:"Formed during γ-carboxylation of clotting factors; recycled by VKORC1 (warfarin target)"},
  {n:"Vitamin K hydroquinone (KH₂)",e:"VKORC1 (reduction)",a:"active",p:0,note:"Active reduced form; cofactor for clotting factors II, VII, IX, X"},
  {n:"ω-Hydroxylated phylloquinone",e:"CYP4F2",a:"inactive",p:30,note:"CYP4F2 V433M variant → reduced catabolism → warfarin sensitivity"}
],
"Zinc":[
  {n:"Zinc (protein-bound, albumin/α2M)",e:"None",a:"active",p:100,note:"Not metabolized; distributed to 300+ enzymes. Competes with copper (Cu) absorption"},
  {n:"Zinc (fecal, unabsorbed)",e:"None",a:"active",p:70,note:"Only 20-40% absorbed; absorption ↓ by phytates, fiber, iron"}
],
"Echinacea":[
  {n:"Caffeic acid metabolites",e:"Esterases/COMT",a:"weak",p:40,t:2,note:"Phenylpropanoid hydrolysis products"},
  {n:"Alkylamide metabolites",e:"CYP1A2/2C9",a:"weak",p:30,note:"Immunomodulatory alkamides; weak CYP3A4 inhibition/induction"}
],
"Milk Thistle (Silymarin)":[
  {n:"Silybin glucuronide",e:"UGT1A1",a:"weak",p:50,t:6,note:"Major conjugate; silybin is most active component"},
  {n:"Silybin sulfate",e:"SULT2A1",a:"inactive",p:20,note:"Sulfation conjugate"},
  {n:"Desmethyl-silybin",e:"CYP2C8",a:"weak",p:10,note:"O-demethylation; very low oral bioavailability (<1-5%)"}
],
"Saw Palmetto":[
  {n:"Fatty acid metabolites (β-oxidation)",e:"Mitochondrial β-ox",a:"weak",p:60,note:"Lauric/myristic/oleic acids undergo normal fatty acid catabolism"},
  {n:"β-Sitosterol metabolites",e:"CYP27A1",a:"inactive",p:15,note:"Phytosterol metabolism; poorly absorbed"}
],
"Cranberry":[
  {n:"Hippuric acid",e:"Glycine conjugation",a:"inactive",p:40,note:"Major urinary metabolite of PACs; marker of cranberry intake"},
  {n:"Phenylacetic acid derivatives",e:"Gut flora",a:"weak",p:30,note:"Microbial degradation of proanthocyanidins"},
  {n:"A-type PAC metabolites",e:"Gut flora",a:"weak",p:20,note:"Anti-adhesion activity against E. coli (UTI mechanism)"}
],
"Probiotics":[
  {n:"Short-chain fatty acids (SCFA)",e:"Bacterial fermentation",a:"active",p:0,note:"Butyrate, propionate, acetate — produced by gut bacteria, not host enzymes"},
  {n:"Bacterial metabolites (various)",e:"Microbial enzymes",a:"active",p:0,note:"No host metabolism of probiotics; organisms colonize/transit through GI tract"}
],
"Biotin":[
  {n:"Bisnorbiotin",e:"β-oxidation",a:"inactive",p:30,t:2,note:"Side-chain shortening via β-oxidation"},
  {n:"Biotin sulfoxide",e:"Oxidation",a:"inactive",p:15,note:"Sulfur oxidation product"},
  {n:"Biotin (unchanged, renal)",e:"None",a:"active",p:50,t:2,note:"~50% excreted unchanged; excess readily cleared"}
],
"B-Complex":[
  {n:"4-Pyridoxic acid (from B6)",e:"Aldehyde oxidase",a:"inactive",p:30,note:"Major urinary B6 metabolite"},
  {n:"Methylnicotinamide (from B3)",e:"NNMT",a:"inactive",p:25,note:"Niacin methylation product"},
  {n:"N-methylnicotinamide → 2-Py/4-Py",e:"Aldehyde oxidase",a:"inactive",p:20,note:"Further oxidation products of niacin metabolism"},
  {n:"B12 → methylcobalamin/adenosylcobalamin",e:"MMACHC",a:"active",p:0,note:"Active coenzyme forms; NO urinary excretion unless massive excess"}
],
"Grapefruit Juice":[
  {n:"Furanocoumarins (bergamottin, DHB)",e:"Irreversible CYP3A4 binding",a:"active",p:0,note:"Mechanism-based inactivation ('suicide inhibition') of intestinal CYP3A4"},
  {n:"Naringin → Naringenin",e:"Gut flora",a:"weak",p:50,note:"Flavanone with weak CYP3A4 inhibition; also inhibits OATP1A2 uptake"}
],
"Curcumin (Turmeric)":[
  {n:"Curcumin glucuronide",e:"UGT1A1/1A8",a:"weak",p:40,note:"Major Phase II conjugate; explains very low oral bioavailability (<1%)"},
  {n:"Curcumin sulfate",e:"SULT1A1",a:"weak",p:25,note:"Sulfation"},
  {n:"Tetrahydrocurcumin",e:"Gut reductases",a:"active",p:20,note:"Reduced metabolite with antioxidant properties; may inhibit CYP2C9"}
],
"Green Tea Extract":[
  {n:"EGCG glucuronide",e:"UGT1A1/1A8",a:"weak",p:30,note:"Major catechin conjugate"},
  {n:"EGCG sulfate",e:"SULT1A1/1A3",a:"inactive",p:20,note:"Sulfation reduces activity"},
  {n:"4'-O-methyl-EGCG",e:"COMT",a:"inactive",p:15,note:"Methylation; COMT inhibition by catechins affects other catecholamine substrates"},
  {n:"Ring-fission metabolites",e:"Gut flora",a:"weak",p:25,note:"5-(3',4'-dihydroxyphenyl)-γ-valerolactone etc."}
],
"Ginkgo Biloba":[
  {n:"Ginkgolide metabolites",e:"CYP1A2/2C9",a:"weak",p:30,note:"Terpenoid lactone oxidation products"},
  {n:"Bilobalide metabolites",e:"CYP3A4",a:"inactive",p:20,note:"Sesquiterpene degradation"},
  {n:"Flavonoid glucuronides (quercetin/kaempferol)",e:"UGT",a:"weak",p:30,note:"Phase II conjugation of ginkgo flavonoids; weak antiplatelet activity"}
],
"Vitamin D":[
  {n:"25-Hydroxyvitamin D (calcidiol)",e:"CYP2R1 (liver)",a:"active",p:85,t:360,note:"Main circulating form; what blood tests measure. t½ ~15 days"},
  {n:"1,25-Dihydroxyvitamin D (calcitriol)",e:"CYP27B1 (kidney)",a:"active",p:5,t:5,note:"THE active hormone; tightly regulated by PTH and calcium"},
  {n:"24,25-Dihydroxyvitamin D",e:"CYP24A1",a:"inactive",p:10,note:"Inactivation pathway; genetic variants → hypercalcemia risk"}
],
"Magnesium":[
  {n:"Mg²⁺ (intracellular, enzyme cofactor)",e:"None",a:"active",p:100,note:"Not metabolized; cofactor for 600+ enzymes. ~30-50% oral absorption"},
  {n:"Magnesium (renal excretion)",e:"None",a:"active",p:50,note:"Kidney is primary regulator; ~95% reabsorbed in Henle/DCT"}
],
"Fish Oil (Omega-3)":[
  {n:"EPA/DHA (incorporated into membranes)",e:"Phospholipases",a:"active",p:60,note:"Incorporated into cell membranes; displaces arachidonic acid"},
  {n:"Resolvins/Protectins/Maresins",e:"LOX/COX",a:"active",p:5,note:"Anti-inflammatory specialized pro-resolving mediators"},
  {n:"β-Oxidation products",e:"Mitochondrial β-ox",a:"inactive",p:30,note:"Normal fatty acid catabolism for energy"}
],
"CoQ10":[
  {n:"Ubiquinol (reduced CoQ10)",e:"NQO1/Complex I",a:"active",p:90,note:"Active antioxidant form; mitochondrial electron carrier"},
  {n:"CoQ10 short-chain metabolites",e:"β-oxidation",a:"inactive",p:10,note:"Side-chain shortening → urinary excretion"}
],
"Calcium":[
  {n:"Ca²⁺ (bone deposition/resorption)",e:"None",a:"active",p:99,note:"Not metabolized; 99% stored in bone. Absorption requires vitamin D"},
  {n:"Calcium (renal/fecal excretion)",e:"None",a:"active",p:50,note:"Unabsorbed fraction + renal filtered; competes with iron, zinc, T4 for absorption"}
],
"Iron":[
  {n:"Fe²⁺ → Ferritin (storage)",e:"None",a:"active",p:0,note:"No excretion pathway; regulated entirely by absorption (1-2mg/day)"},
  {n:"Fe²⁺ → Transferrin (transport)",e:"Ceruloplasmin",a:"active",p:0,note:"Oxidized to Fe³⁺ for transferrin binding; delivered to marrow for hemoglobin"},
  {n:"Hemosiderin (excess storage)",e:"None",a:"toxic",p:0,note:"Iron overload marker; deposits in liver, heart, pancreas → organ damage"}
],
// ── Salvaged Gemini enrichment: new parent metabolite sets ──
"Propafenone":[
  {
    n: "5-Hydroxypropafenone",
    e: "CYP2D6",
    a: "active",
    p: 50,
    note: "Possesses potent sodium channel blocking properties. This functional structural protection layer disappears within documented CYP2D6 poor metabolizers.",
    evidenceRefs: [
      "ev_propafenone_cyp2d6_m_plus"
    ]
  }
],
"Aprepitant":[
  {
    n: "N-dealkylated metabolite",
    e: "CYP3A4",
    a: "inactive",
    p: 10,
    note: "Demonstrates minimal clinical engagement across target neurokinin central receptors.",
    evidenceRefs: [
      "ev_aprepitant_cyp3a4_label"
    ]
  }
],
"Isavuconazonium Sulfate":[
  {
    n: "Isavuconazole",
    e: "Plasma Esterase Hydrolysis",
    a: "active_form",
    role: "active_form",
    p: 100,
    note: "The active, long-lived triazole entity driving systemic antifungal cell membrane destruction indices.",
    evidenceRefs: [
      "ev_isavuconazole_cyp3a4_validation"
    ]
  }
],
"Abacavir":[
  {
    n: "Abacavir glucuronide",
    e: "UGT1A1",
    a: "inactive",
    p: 35,
    note: "Secondary parallel clearing configuration operating safely inside liver tissues.",
    evidenceRefs: [
      "ev_abacavir_hlab5701_cpic2012"
    ]
  }
],
"Isoniazid":[
  {
    n: "Acetylisoniazid",
    e: "NAT2",
    a: "inactive_intermediate",
    role: "inactive_form",
    p: 70,
    note: "Represents the safe, non-toxic pathway for rapid clinical clearance.",
    evidenceRefs: [
      "ev_nat2_isoniazid_consensus"
    ]
  },
  {
    n: "Acetylhydrazine / Monoacetylhydrazine",
    e: "Downstream hydrolysis",
    a: "hepatotoxic_reactive_radical",
    role: "toxic_form",
    p: 20,
    note: "Can undergo further micro-activation into reactive species that bind directly to hepatic tissues.",
    evidenceRefs: [
      "ev_nat2_isoniazid_consensus"
    ]
  }
],
"Leflunomide":[
  {
    n: "Teriflunomide (A77 1726)",
    e: "Plasma GI opening",
    a: "active_immunomodulator",
    role: "active_form",
    p: 100,
    note: "The primary therapeutic metabolite. Inhibits dihydroorotate dehydrogenase to halt fast-replicating autoimmune T-cell lines.",
    evidenceRefs: [
      "ev_leflunomide_teriflunomide_half_life"
    ]
  }
],
"Levodopa":[
  {
    n: "Dopamine",
    e: "DOPA Decarboxylase",
    a: "active_neurotransmitter",
    role: "active_form",
    p: 70,
    note: "The therapeutic molecule required within central striatal brain receptors to restore motor function.",
    evidenceRefs: [
      "ev_comt_levodopa_parkinson_2012"
    ]
  },
  {
    n: "3-O-Methyldopa (3-OMD)",
    e: "COMT",
    a: "inactive_competitor",
    role: "inactive_form",
    p: 25,
    note: "Accumulates in the periphery and competes with remaining levodopa for transport across the blood-brain barrier.",
    evidenceRefs: [
      "ev_comt_levodopa_parkinson_2012"
    ]
  }
],
"Dapsone":[
  {
    n:"Dapsone hydroxylamine (DDS-NHOH)",
    e:"CYP2C9",
    a:"toxic",
    p:30,
    note:"Primary hematotoxic metabolite that drives dose-dependent methemoglobinemia and oxidative hemolysis, amplified in G6PD deficiency. Also formed via CYP3A4.",
    inh:[],
    evidenceRefs:[
      "ev_dapsone_ddsnhoh_metabolite"
    ]
  },
  {
    n:"N-Acetyldapsone (MADDS)",
    e:"NAT2",
    a:"inactive",
    p:40,
    note:"Acetylation pathway; reversible to dapsone. NAT2 phenotype shifts the acetyl/hydroxylamine balance."
  },
  {
    n:"Dapsone (unchanged)",
    e:"Renal",
    a:"active",
    p:20,
    note:"Long half-life supports metabolite accumulation with chronic dosing."
  }
],
"Mercaptopurine":[
  {
    n:"6-Thioguanine nucleotides (6-TGN)",
    e:"HPRT/IMPDH",
    a:"active_form",
    role:"active_form",
    p:40,
    note:"Cytotoxic/immunosuppressive active metabolites incorporated into DNA. NUDT15 dephosphorylates TGTP to limit DNA-TG incorporation; loss-of-function increases myelosuppression risk.",
    evidenceRefs:["ev_azathioprine_tpmt_cpic2019","ev_thiopurine_tpmt_nudt15_cpic2025"]
  },
  {
    n:"6-Methylmercaptopurine (6-MMP)",
    e:"TPMT",
    a:"toxic",
    p:30,
    note:"TPMT methylation product; high 6-MMP/6-TGN ratios are linked to hepatotoxicity while TPMT loss-of-function shifts exposure toward 6-TGN.",
    evidenceRefs:["ev_azathioprine_tpmt_cpic2019"]
  },
  {
    n:"Thiouric acid",
    e:"Xanthine oxidase",
    a:"inactive",
    p:30,
    note:"XO oxidation pathway; blocked by allopurinol or febuxostat, which can raise active thiopurine nucleotide exposure."
  }
],
"Thioguanine":[
  {
    n:"6-Thioguanine nucleotides (6-TGN)",
    e:"HPRT",
    a:"active_form",
    role:"active_form",
    p:60,
    note:"Direct conversion to active 6-TGN; NUDT15 still governs DNA-thioguanine load and myelosuppression risk.",
    evidenceRefs:["ev_thiopurine_tpmt_nudt15_cpic2025"]
  },
  {
    n:"6-Methylthioguanine",
    e:"TPMT",
    a:"inactive",
    p:25,
    note:"TPMT methylation; TPMT loss-of-function shifts the balance toward active 6-TGN."
  },
  {
    n:"2-Amino-6-methylthiopurine / thiouric acid derivatives",
    e:"Guanase/Aldehyde oxidase",
    a:"inactive",
    p:15,
    note:"Minor oxidative inactivation; not the same xanthine-oxidase-dependent pathway as mercaptopurine."
  }
],
"Tafenoquine":[
  {
    n:"Tafenoquine oxidative metabolites",
    e:"CYP2D6",
    a:"toxic",
    p:20,
    note:"Oxidative metabolite context for erythrocyte oxidative stress; clinically amplified in G6PD deficiency. Activation is less fully defined than primaquine.",
    evidenceRefs:["ev_tafenoquine_g6pd_fda","ev_tafenoquine_relapse_lacerda2019"]
  },
  {
    n:"Tafenoquine (unchanged)",
    e:"Hepatic/biliary",
    a:"active",
    p:80,
    note:"Long-circulating parent drug with prolonged terminal half-life, so oxidative exposure cannot be rapidly stopped after dosing.",
    evidenceRefs:["ev_tafenoquine_relapse_lacerda2019"]
  }
],
"Chloroquine":[
  {
    n:"Desethylchloroquine",
    e:"CYP2C8/CYP3A4",
    a:"active",
    p:35,
    note:"Major active metabolite with retained antimalarial activity.",
    evidenceRefs:["ev_g6pd_oxidative_antimalarials"]
  },
  {
    n:"Bisdesethylchloroquine",
    e:"CYP2D6",
    a:"active",
    p:10,
    note:"Minor active metabolite.",
    evidenceRefs:["ev_g6pd_oxidative_antimalarials"]
  },
  {
    n:"Chloroquine (unchanged)",
    e:"Renal/tissue depot",
    a:"active",
    p:50,
    note:"Large volume of distribution and long terminal half-life; parent persistence remains clinically important."
  }
],
"Quinine":[
  {
    n:"3-Hydroxyquinine",
    e:"CYP3A4",
    a:"active",
    p:60,
    note:"Principal metabolite; some antimalarial activity and renal-impairment accumulation context.",
    evidenceRefs:["ev_g6pd_oxidative_antimalarials"]
  },
  {
    n:"Quinine (unchanged)",
    e:"Renal",
    a:"active",
    p:20,
    note:"Renal clearance contributes and can vary with urine pH."
  }
],
"Sulfasalazine":[
  {
    n:"Sulfapyridine",
    e:"Azoreductase (gut flora)",
    a:"active",
    p:60,
    note:"Released by colonic bacterial azo-cleavage, then acetylated by NAT2. Slow acetylators can accumulate sulfapyridine and develop dose-limiting adverse effects.",
    evidenceRefs:["ev_sulfasalazine_tpmt_inhibition"]
  },
  {
    n:"5-Aminosalicylic acid (mesalamine)",
    e:"Azoreductase (gut flora)",
    a:"active_form",
    role:"active_form",
    p:40,
    note:"Locally acting anti-inflammatory moiety with limited systemic absorption."
  },
  {
    n:"N-Acetylsulfapyridine",
    e:"NAT2",
    a:"inactive",
    p:30,
    note:"NAT2 acetylation product of sulfapyridine."
  }
],
"Cyclophosphamide":[
  {
    n:"4-Hydroxycyclophosphamide",
    e:"CYP2B6/CYP3A4/CYP2C9",
    a:"active_form",
    role:"active_form",
    p:45,
    note:"Primary activation step for the prodrug; formation balance is clinically relevant for efficacy and toxicity.",
    evidenceRefs:["ev_cyclophosphamide_cyp2b6_label"]
  },
  {
    n:"Aldophosphamide",
    e:"Tautomerization",
    a:"active",
    p:45,
    note:"Equilibrates with 4-hydroxycyclophosphamide and decomposes to the alkylating and urotoxic metabolites."
  },
  {
    n:"Phosphoramide mustard",
    e:"Spontaneous decomposition",
    a:"active_form",
    role:"active_form",
    p:40,
    note:"Alkylating cytotoxic species responsible for much of the antineoplastic/immunosuppressive effect.",
    evidenceRefs:["ev_cyclophosphamide_cyp2b6_label"]
  },
  {
    n:"Acrolein",
    e:"Spontaneous decomposition",
    a:"toxic",
    p:40,
    note:"Urotoxic metabolite that drives hemorrhagic cystitis risk; mesna/hydration context belongs to toxicity prevention.",
    evidenceRefs:["ev_cyclophosphamide_cyp2b6_label"]
  },
  {
    n:"Dechloroethylcyclophosphamide",
    e:"CYP3A4",
    a:"inactive",
    p:20,
    note:"Competing inactivation pathway paired with chloroacetaldehyde formation."
  }
],
"Oseltamivir":[
  {
    n:"Oseltamivir carboxylate",
    e:"Carboxylesterase activation",
    a:"active_form",
    role:"active_form",
    p:75,
    note:"Active neuraminidase inhibitor; exposure rises with probenecid through reduced renal tubular secretion.",
    evidenceRefs:["ev_oseltamivir_probenecid_label"]
  },
  {
    n:"Oseltamivir (unchanged prodrug)",
    e:"Renal",
    a:"inactive",
    p:5,
    note:"Parent prodrug has limited antiviral activity compared with oseltamivir carboxylate."
  }
],
"Valacyclovir":[
  {
    n:"Acyclovir",
    e:"Esterase activation",
    a:"active_form",
    role:"active_form",
    p:80,
    note:"Active antiviral formed rapidly from valacyclovir; renal clearance drives exposure and neurotoxicity context.",
    evidenceRefs:["ev_valacyclovir_probenecid_label","ev_acyclovir_probenecid_label"]
  },
  {
    n:"9-Carboxymethoxymethylguanine (CMMG)",
    e:"Aldehyde oxidase",
    a:"toxic",
    p:5,
    note:"Minor downstream acyclovir metabolite associated with renal-impairment neurotoxicity context."
  }
],
"Hydroxyzine":[
  {
    n:"Cetirizine",
    e:"Oxidative dealkylation",
    a:"active",
    p:45,
    note:"Active antihistamine metabolite with lower sedation than parent hydroxyzine but renal persistence.",
    evidenceRefs:["ev_hydroxyzine_qt_label"]
  },
  {
    n:"Norchlorcyclizine",
    e:"CYP3A4/CYP2C9",
    a:"active",
    p:20,
    note:"Sedating piperazine metabolite context; parent anticholinergic/QT risk remains clinically important."
  }
],
"Roflumilast":[
  {
    n:"Roflumilast N-oxide",
    e:"CYP3A4/CYP1A2",
    a:"active_form",
    role:"active_form",
    p:90,
    note:"Major active metabolite; parent plus N-oxide account for PDE4 inhibitory activity.",
    evidenceRefs:["ev_roflumilast_cyp_label"]
  },
  {
    n:"Roflumilast N-oxide glucuronide",
    e:"UGT",
    a:"inactive",
    p:10,
    note:"Inactive conjugated elimination product."
  }
],
"Thioridazine":[
  {
    n:"Mesoridazine",
    e:"CYP2D6/CYP3A4",
    a:"active",
    p:30,
    note:"Active phenothiazine metabolite with QT-prolongation relevance; CYP2D6 poor metabolism raises parent/metabolite risk context.",
    evidenceRefs:["ev_thioridazine_qt_cyp2d6_fda"]
  },
  {
    n:"Sulforidazine",
    e:"CYP2D6/CYP3A4",
    a:"active",
    p:15,
    note:"Active sulfoxide/sulfone metabolite in the same QT-risk family."
  },
  {
    n:"Thioridazine ring-hydroxylated metabolites",
    e:"CYP2D6",
    a:"inactive",
    p:20,
    note:"Clearance products reduced when CYP2D6 activity is low or inhibited.",
    evidenceRefs:["ev_thioridazine_qt_cyp2d6_fda"]
  }
],
"Sacubitril/Valsartan":[
  {
    n:"Sacubitrilat (LBQ657)",
    e:"Esterase activation",
    a:"active_form",
    role:"active_form",
    p:50,
    note:"Active neprilysin inhibitor formed from sacubitril; ACE-inhibitor washout and hypotension/angioedema context belong to the active moiety.",
    evidenceRefs:["ev_sacubitril_valsartan_label"]
  },
  {
    n:"Valsartan (unchanged)",
    e:"Biliary/renal",
    a:"active",
    p:50,
    note:"ARB component is largely recovered unchanged; transporter and potassium/renal context remain parent-driven."
  }
],
"Procainamide":[
  {
    n:"N-Acetylprocainamide (NAPA)",
    e:"NAT2",
    a:"active",
    p:50,
    note:"Active class III antiarrhythmic metabolite with longer half-life and QT contribution; NAT2 phenotype shifts parent/NAPA balance.",
    evidenceRefs:["ev_procainamide_nat2_label"]
  },
  {
    n:"Procainamide (unchanged)",
    e:"Renal",
    a:"active",
    p:40,
    note:"Renal clearance of active parent drug is clinically important for exposure and lupus-like toxicity context."
  }
],
"Osimertinib":[
  {
    n:"AZ5104",
    e:"CYP3A4/CYP3A5",
    a:"active",
    p:10,
    note:"Active demethylated EGFR-inhibitor metabolite; induction can lower total active exposure.",
    evidenceRefs:["ev_osimertinib_cyp3a_qt_label"]
  },
  {
    n:"AZ7550",
    e:"CYP3A4/CYP3A5",
    a:"active",
    p:10,
    note:"Active circulating metabolite in osimertinib exposure context.",
    evidenceRefs:["ev_osimertinib_cyp3a_qt_label"]
  },
  {
    n:"Osimertinib (unchanged)",
    e:"Hepatic",
    a:"active",
    p:70,
    note:"Parent exposure remains the main label-driven interaction signal; strong induction is more important than inhibition."
  }
],
"Dronedarone":[
  {
    n:"N-Desbutyl dronedarone",
    e:"CYP3A4",
    a:"active",
    p:40,
    note:"Main active metabolite; less potent than parent but contributes to CYP3A/P-gp interaction context.",
    evidenceRefs:["ev_dronedarone_cyp3a_pgp_label"]
  },
  {
    n:"Dronedarone (unchanged)",
    e:"Hepatic/biliary",
    a:"active",
    p:50,
    note:"Parent drug remains central to contraindications and P-gp/CYP3A interaction burden."
  }
],
"Disopyramide":[
  {
    n:"Mono-N-dealkyldisopyramide",
    e:"CYP3A4",
    a:"active",
    p:25,
    note:"Active metabolite with clinically relevant anticholinergic contribution; renal clearance of parent and metabolite matters in toxicity.",
    evidenceRefs:["ev_disopyramide_label"]
  },
  {
    n:"Disopyramide (unchanged)",
    e:"Renal",
    a:"active",
    p:40,
    note:"Unchanged parent drug contributes strongly to narrow-therapeutic-index and QT risk."
  }
],
"Paclitaxel":[
  {
    n:"6-alpha-hydroxypaclitaxel",
    e:"CYP2C8",
    a:"inactive",
    p:70,
    note:"Primary hydroxylated metabolite. CYP2C8 inhibition raises parent paclitaxel exposure, so toxicity is parent-driven rather than active-metabolite-driven.",
    evidenceRefs:["ev_paclitaxel_cyp2c8_label"]
  },
  {
    n:"3-p-hydroxypaclitaxel",
    e:"CYP3A4",
    a:"inactive",
    p:20,
    note:"Secondary CYP3A4 metabolite; clinically less important than CYP2C8 parent clearance.",
    evidenceRefs:["ev_paclitaxel_cyp2c8_label"]
  },
  {
    n:"Paclitaxel (unchanged)",
    e:"Biliary",
    a:"active",
    p:10,
    note:"Parent exposure drives neuropathy, myelosuppression, and hypersensitivity risk."
  }
],
"Docetaxel":[
  {
    n:"Hydroxydocetaxel metabolites",
    e:"CYP3A4/CYP3A5",
    a:"inactive",
    p:80,
    note:"Main oxidative clearance products. Strong CYP3A inhibition increases parent docetaxel toxicity rather than creating a more active metabolite.",
    evidenceRefs:["ev_docetaxel_cyp3a4_label"]
  },
  {
    n:"Docetaxel (unchanged)",
    e:"Biliary",
    a:"active",
    p:10,
    note:"Parent drug is the clinically relevant taxane exposure; premedication is used for fluid retention and hypersensitivity prevention.",
    evidenceRefs:["ev_docetaxel_cyp3a4_label"]
  }
],
"Flecainide":[
  {
    n:"m-O-dealkylated flecainide",
    e:"CYP2D6",
    a:"inactive",
    p:35,
    note:"Major oxidative clearance metabolite; CYP2D6 PM or inhibition raises parent flecainide exposure and proarrhythmic risk.",
    evidenceRefs:["ev_flecainide_cyp2d6_pgx","ev_flecainide_cyp2d6_safety"]
  },
  {
    n:"m-O-dealkylated lactam of flecainide",
    e:"CYP2D6",
    a:"inactive",
    p:20,
    note:"Downstream inactive metabolite; parent flecainide and renal clearance remain clinically central.",
    evidenceRefs:["ev_flecainide_cyp2d6_pgx","ev_flecainide_cyp2d6_safety"]
  },
  {
    n:"Flecainide (unchanged)",
    e:"Renal",
    a:"active",
    p:30,
    note:"Unchanged parent contributes materially to narrow-therapeutic-index exposure, especially with reduced renal function."
  }
],
"Mexiletine":[
  {
    n:"p-Hydroxymexiletine",
    e:"CYP2D6",
    a:"inactive",
    p:35,
    note:"Major oxidative metabolite; CYP2D6 inhibition or poor metabolism raises parent mexiletine exposure.",
    evidenceRefs:["ev_mexiletine_label"]
  },
  {
    n:"Hydroxymethylmexiletine",
    e:"CYP1A2/CYP2D6",
    a:"inactive",
    p:25,
    note:"Major oxidative metabolite with downstream glucuronidation; smoking/CYP1A2 induction can lower parent exposure.",
    evidenceRefs:["ev_mexiletine_label"]
  },
  {
    n:"N-Hydroxymexiletine",
    e:"CYP2D6/CYP1A2",
    a:"inactive",
    p:15,
    note:"Oxidative clearance metabolite.",
    evidenceRefs:["ev_mexiletine_label"]
  },
  {
    n:"N-Methylmexiletine",
    e:"CYP2D6/CYP1A2",
    a:"active",
    p:5,
    note:"Minor active metabolite; label describes activity as less than 20% of parent mexiletine.",
    evidenceRefs:["ev_mexiletine_label"]
  }
],
"Quinidine":[
  {
    n:"3-Hydroxyquinidine",
    e:"CYP3A4",
    a:"active",
    p:50,
    note:"Most important quinidine metabolite; levels can exceed quinidine in some patients and the metabolite has antiarrhythmic activity.",
    evidenceRefs:["ev_quinidine_label"]
  },
  {
    n:"Quinidine N-oxide",
    e:"Oxidation",
    a:"inactive",
    p:10,
    note:"Minor oxidative metabolite; parent drug remains the narrow-therapeutic-index and CYP2D6-inhibition actor."
  },
  {
    n:"Quinidine (unchanged)",
    e:"Renal",
    a:"active",
    p:20,
    note:"Unchanged parent contributes to exposure and is strongly affected by renal/hepatic status and CYP3A inhibition."
  }
],
"Dofetilide":[
  {
    n:"Dofetilide (unchanged)",
    e:"Renal cation transport",
    a:"active",
    p:80,
    note:"The clinically important exposure is unchanged parent drug; renal cation transport inhibitors raise concentration-dependent QT/torsades risk.",
    evidenceRefs:["ev_dofetilide_renal_cation_label"]
  },
  {
    n:"Minor inactive oxidative metabolites",
    e:"CYP3A4",
    a:"inactive",
    p:20,
    note:"Minor pathway; CYP interactions are less important than renal cation transport and renal function.",
    evidenceRefs:["ev_dofetilide_renal_cation_label"]
  }
],
"Sotalol":[
  {
    n:"Sotalol (unchanged)",
    e:"Renal",
    a:"active",
    p:90,
    note:"Not meaningfully metabolized; renal clearance and electrolyte/QT co-risk determine exposure and torsades risk.",
    evidenceRefs:["ev_sotalol_qt_renal_label"]
  }
],
"Dasatinib":[
  {
    n:"Active dasatinib metabolite",
    e:"CYP3A4",
    a:"active",
    p:10,
    note:"Label describes an active CYP3A4-formed metabolite, but parent dasatinib exposure and acid-dependent absorption remain the dominant clinical signals.",
    evidenceRefs:["ev_dasatinib_cyp3a_acid_label"]
  },
  {
    n:"Dasatinib (unchanged)",
    e:"CYP3A4/transport",
    a:"active",
    p:70,
    note:"Parent drug exposure is increased by strong CYP3A inhibition and reduced by gastric acid suppression."
  }
],
"Nilotinib":[
  {
    n:"Nilotinib oxidative metabolites",
    e:"CYP3A4",
    a:"inactive",
    p:20,
    note:"Oxidative clearance products; parent nilotinib exposure is the QT-relevant signal.",
    evidenceRefs:["ev_nilotinib_qt_cyp3a_label"]
  },
  {
    n:"Nilotinib (unchanged)",
    e:"Hepatic/biliary",
    a:"active",
    p:70,
    note:"Parent drug is the clinically relevant QT and food/CYP3A interaction actor.",
    evidenceRefs:["ev_nilotinib_qt_cyp3a_label"]
  }
],
"Venetoclax":[
  {
    n:"M27 venetoclax metabolite",
    e:"CYP3A4",
    a:"weak",
    p:15,
    note:"Major plasma metabolite with much weaker BCL-2 inhibition than parent; CYP3A/P-gp interactions are parent-exposure driven.",
    evidenceRefs:["ev_venetoclax_cyp3a_pgp_label"]
  },
  {
    n:"Venetoclax (unchanged)",
    e:"CYP3A4/P-gp",
    a:"active",
    p:70,
    note:"Parent exposure drives tumor-lysis and myelosuppression risk, especially during ramp-up with CYP3A/P-gp inhibitors.",
    evidenceRefs:["ev_venetoclax_cyp3a_pgp_label"]
  }
],
"Palbociclib":[
  {
    n:"Palbociclib oxidative metabolites",
    e:"CYP3A4",
    a:"inactive",
    p:55,
    note:"Oxidative metabolism contributes to clearance; strong CYP3A inhibition raises parent exposure and neutropenia risk.",
    evidenceRefs:["ev_palbociclib_cyp3a_label"]
  },
  {
    n:"Palbociclib sulfation products",
    e:"SULT2A1",
    a:"inactive",
    p:15,
    note:"Sulfation pathway included because parent drug should not be treated as a simple CYP3A-only actor.",
    evidenceRefs:["ev_palbociclib_cyp3a_label"]
  }
],
"Everolimus":[
  {
    n:"Hydroxy-everolimus metabolites",
    e:"CYP3A4",
    a:"weak",
    p:45,
    note:"Multiple hydroxylated metabolites; parent/trough concentration remains the therapeutic monitoring target.",
    evidenceRefs:["ev_everolimus_cyp3a_pgp_label"]
  },
  {
    n:"Everolimus (unchanged)",
    e:"CYP3A4/P-gp",
    a:"active",
    p:45,
    note:"Parent exposure is highly sensitive to CYP3A/P-gp inhibitors and inducers; TDM is central.",
    evidenceRefs:["ev_everolimus_cyp3a_pgp_label"]
  }
],
"Erlotinib":[
  {
    n:"OSI-420 / O-desmethyl erlotinib",
    e:"CYP3A4/CYP1A2",
    a:"active",
    p:20,
    note:"Active metabolite, but parent erlotinib and smoking/CYP1A2 induction remain the main exposure signal.",
    evidenceRefs:["ev_erlotinib_cyp3a_label"]
  },
  {
    n:"Erlotinib oxidative metabolites",
    e:"CYP3A4/CYP1A2",
    a:"inactive",
    p:40,
    note:"Oxidative clearance products; acid suppression separately reduces absorption.",
    evidenceRefs:["ev_erlotinib_cyp3a_label","ev_erlotinib_ppi_absorption"]
  }
],
"Gefitinib":[
  {
    n:"O-Desmethyl gefitinib",
    e:"CYP2D6",
    a:"weak",
    p:14,
    note:"Major active component among identified metabolites, but much weaker in cell-based assays; CYP2D6 PM reduces metabolite formation while parent exposure remains clinically important.",
    evidenceRefs:["ev_gefitinib_label"]
  },
  {
    n:"Gefitinib oxidative metabolites",
    e:"CYP3A4",
    a:"inactive",
    p:45,
    note:"CYP3A4 is the dominant parent clearance pathway; strong inducers can require dose adjustment.",
    evidenceRefs:["ev_gefitinib_label"]
  }
],
"Imatinib":[
  {
    n:"N-demethylated piperazine derivative (CGP74588)",
    e:"CYP3A4",
    a:"active",
    p:20,
    t:40,
    note:"Main circulating active metabolite with longer half-life than parent imatinib.",
    evidenceRefs:["ev_imatinib_label"]
  },
  {
    n:"Imatinib (unchanged)",
    e:"CYP3A4/transport",
    a:"active",
    p:60,
    note:"Parent exposure remains central to CYP3A interaction management."
  }
],
"Pazopanib":[
  {
    n:"Pazopanib monooxygenated metabolites",
    e:"CYP3A4/CYP1A2/CYP2C8",
    a:"weak",
    p:10,
    note:"Pazopanib is mostly parent-driven; metabolites are a small circulating fraction and generally much less active.",
    evidenceRefs:["ev_pazopanib_label"]
  },
  {
    n:"Pazopanib (unchanged)",
    e:"Hepatic/biliary",
    a:"active",
    p:80,
    note:"Parent exposure drives hepatotoxicity, hypertension, and CYP3A/P-gp interaction context.",
    evidenceRefs:["ev_pazopanib_label"]
  }
],
"Terbinafine":[
  {
    n:"Terbinafine carboxylic acid metabolites",
    e:"CYP2C9/CYP1A2/CYP3A4/CYP2C8",
    a:"inactive",
    p:45,
    note:"Oxidative clearance products; parent terbinafine is the clinically important CYP2D6 inhibitor.",
    evidenceRefs:["ev_terbinafine_cyp2d6_label"]
  },
  {
    n:"N-Desmethyl terbinafine",
    e:"CYP2C9/CYP1A2/CYP3A4",
    a:"inactive",
    p:15,
    note:"Minor metabolite included to avoid reducing terbinafine to a single-enzyme substrate.",
    evidenceRefs:["ev_terbinafine_cyp2d6_label"]
  },
  {
    n:"Terbinafine (unchanged)",
    e:"Hepatic/tissue depot",
    a:"active",
    p:20,
    note:"Parent persistence in keratin-rich tissues contributes to prolonged CYP2D6 inhibition after stopping."
  }
],
"Trimethoprim/Sulfamethoxazole":[
  {
    n:"Sulfamethoxazole hydroxylamine",
    e:"CYP2C9",
    a:"toxic",
    p:10,
    note:"Reactive oxidative metabolite associated with sulfonamide hypersensitivity/oxidative toxicity context; parent TMP-SMX interactions remain multifactorial.",
    evidenceRefs:["ev_tmp_smx_label"]
  },
  {
    n:"Sulfamethoxazole N-acetyl metabolite",
    e:"NAT2",
    a:"inactive",
    p:35,
    note:"Acetylation pathway for sulfamethoxazole; NAT2 context can shift sulfonamide metabolite balance.",
    evidenceRefs:["ev_tmp_smx_label"]
  },
  {
    n:"Trimethoprim (unchanged)",
    e:"Renal/OCT2",
    a:"active",
    p:50,
    note:"Trimethoprim inhibits OCT2 and can raise creatinine/metformin context while also contributing to hyperkalemia.",
    evidenceRefs:["ev_tmp_smx_label"]
  },
  {
    n:"Sulfamethoxazole (unchanged)",
    e:"Renal",
    a:"active",
    p:30,
    note:"Parent sulfonamide contributes to folate-antagonist and hypersensitivity context."
  }
],
"Teriflunomide":[
  {
    n:"Teriflunomide (unchanged)",
    e:"Biliary/renal",
    a:"active",
    p:80,
    note:"Teriflunomide is itself the active leflunomide metabolite; clinical persistence is mostly unchanged parent plus enterohepatic recycling.",
    evidenceRefs:["ev_leflunomide_teriflunomide_label","ev_teriflunomide_label"]
  },
  {
    n:"Teriflunomide minor renal metabolites",
    e:"Oxidation/hydrolysis",
    a:"inactive",
    p:20,
    note:"Renally excreted metabolites are secondary; accelerated elimination targets circulating unchanged teriflunomide.",
    evidenceRefs:["ev_teriflunomide_label"]
  }
],
"Cholestyramine":[
  {
    n:"Cholestyramine resin (unabsorbed)",
    e:"GI binding / no metabolism",
    a:"inactive",
    p:100,
    note:"Not systemically absorbed or metabolized. Interaction value comes from binding bile acids and other oral drugs in the gut.",
    evidenceRefs:["ev_cholestyramine_label","ev_mycophenolate_enterohepatic_label"]
  },
  {
    n:"Bound bile acid/drug complexes",
    e:"Fecal elimination",
    a:"inactive",
    p:100,
    note:"Represents the sequestration mechanism that can lower exposure to co-administered drugs or interrupt enterohepatic recycling."
  }
],
"Chlorpromazine":[
  {
    n:"7-Hydroxychlorpromazine",
    e:"CYP2D6/CYP1A2",
    a:"active",
    p:25,
    note:"Phenothiazine hydroxylated metabolite; CYP2D6 lower activity can shift parent/metabolite exposure and adverse-effect risk.",
    evidenceRefs:["ev_chlorpromazine_cyp2d6_label"]
  },
  {
    n:"N-Desmethylchlorpromazine",
    e:"CYP3A4/CYP2D6",
    a:"active",
    p:20,
    note:"Active metabolite in a broad phenothiazine metabolite mixture; parent anticholinergic/QT/sedation burden remains dominant.",
    evidenceRefs:["ev_chlorpromazine_cyp2d6_label"]
  },
  {
    n:"Chlorpromazine sulfoxide",
    e:"FMO/CYP",
    a:"inactive",
    p:20,
    note:"Oxidative clearance product."
  }
],
"Memantine":[
  {
    n:"Memantine (unchanged)",
    e:"Renal / urine pH dependent",
    a:"active",
    p:80,
    note:"Minimal metabolism. Alkaline urine sharply reduces renal elimination, raising parent exposure.",
    evidenceRefs:["ev_memantine_urine_ph_label"]
  },
  {
    n:"Minor hydroxylated memantine metabolites",
    e:"Non-CYP oxidation",
    a:"inactive",
    p:20,
    note:"Minor pathway; renal clearance of unchanged parent is the practical interaction signal.",
    evidenceRefs:["ev_memantine_urine_ph_label"]
  }
],
"Nirmatrelvir/Ritonavir":[
  {
    n:"Nirmatrelvir (unchanged)",
    e:"Renal",
    a:"active",
    p:55,
    note:"Ritonavir intentionally blocks CYP3A metabolism to maintain active nirmatrelvir exposure; renal function determines dose adjustment.",
    evidenceRefs:["ev_paxlovid_cyp3a_label"]
  },
  {
    n:"Nirmatrelvir oxidative metabolites",
    e:"CYP3A4",
    a:"inactive",
    p:20,
    note:"Metabolism is intentionally suppressed by ritonavir boosting.",
    evidenceRefs:["ev_paxlovid_cyp3a_label"]
  },
  {
    n:"Ritonavir oxidative metabolites",
    e:"CYP3A4/CYP2D6",
    a:"weak",
    p:25,
    note:"Ritonavir is the pharmacokinetic booster; its parent inhibition of CYP3A/P-gp/OATP drives most interaction risk.",
    evidenceRefs:["ev_paxlovid_cyp3a_label","ev_ritonavir_cyp3a4_booster_label"]
  }
],
"Propylthiouracil":[
  {
    n:"Propylthiouracil glucuronide",
    e:"UGT",
    a:"inactive",
    p:70,
    note:"Primary conjugated clearance route. Hepatotoxicity risk is not explained by a simple active metabolite model.",
    evidenceRefs:["ev_propylthiouracil_label"]
  },
  {
    n:"Propylthiouracil sulfate / sulfur-containing metabolites",
    e:"Sulfation/oxidation",
    a:"inactive",
    p:20,
    note:"Secondary sulfur-containing metabolites; parent PTU also blocks peripheral T4-to-T3 conversion.",
    evidenceRefs:["ev_propylthiouracil_label"]
  }
],
"Acyclovir":[
  {
    n:"Acyclovir (unchanged)",
    e:"Renal",
    a:"active",
    p:90,
    note:"Minimal metabolism. Parent acyclovir exposure rises with reduced renal clearance and probenecid/cimetidine context.",
    evidenceRefs:["ev_acyclovir_probenecid_label"]
  },
  {
    n:"9-Carboxymethoxymethylguanine (CMMG)",
    e:"Aldehyde oxidase",
    a:"toxic",
    p:5,
    note:"Minor metabolite associated with renal-impairment neurotoxicity context.",
    evidenceRefs:["ev_acyclovir_probenecid_label"]
  }
],

// ── PRIORITY METABOLITE COVERAGE BATCH: hormone, HIV, immunology, cardiology ──
"Combined Oral Contraceptive":[
  {
    n:"Ethinyl estradiol sulfate / glucuronide conjugates",
    e:"SULT/UGT",
    a:"inactive",
    p:45,
    note:"Estrogen component undergoes conjugation and enterohepatic recycling; enzyme induction can lower contraceptive hormone exposure.",
    evidenceRefs:["ev_coc_label"]
  },
  {
    n:"2-Hydroxyethinyl estradiol",
    e:"CYP3A4",
    a:"inactive",
    p:25,
    note:"Oxidative estrogen metabolite. CYP3A induction is the practical failure signal, especially with rifamycins and enzyme-inducing anticonvulsants.",
    evidenceRefs:["ev_coc_label"]
  },
  {
    n:"Levonorgestrel reduced / conjugated metabolites",
    e:"CYP3A4/UGT",
    a:"inactive",
    p:30,
    note:"Progestin component clearance increases with strong CYP3A induction; parent hormone exposure is the clinical target.",
    evidenceRefs:["ev_coc_label"]
  }
],
"Ethinyl Estradiol":[
  {
    n:"Ethinyl estradiol sulfate",
    e:"SULT",
    a:"inactive",
    p:35,
    note:"Major conjugated pool with enterohepatic recycling relevance.",
    evidenceRefs:["ev_coc_label"]
  },
  {
    n:"Ethinyl estradiol glucuronide",
    e:"UGT1A1",
    a:"inactive",
    p:25,
    note:"Glucuronide conjugate; induction can reduce systemic estrogen exposure.",
    evidenceRefs:["ev_coc_label"]
  },
  {
    n:"2-Hydroxyethinyl estradiol",
    e:"CYP3A4",
    a:"inactive",
    p:25,
    note:"Oxidative metabolite used here to make CYP3A induction risk visible without treating it as the active form.",
    evidenceRefs:["ev_coc_label"]
  }
],
"Levonorgestrel":[
  {
    n:"3α,5β-Tetrahydrolevonorgestrel",
    e:"CYP3A4/reduction",
    a:"inactive",
    p:40,
    note:"Reduced metabolite family; parent levonorgestrel exposure is the contraceptive efficacy signal.",
    evidenceRefs:["ev_coc_label"]
  },
  {
    n:"Levonorgestrel glucuronide / sulfate conjugates",
    e:"UGT/SULT",
    a:"inactive",
    p:45,
    note:"Conjugated metabolites; strong enzyme induction can reduce progestin exposure and increase contraceptive failure risk.",
    evidenceRefs:["ev_coc_label"]
  }
],
"Cobicistat":[
  {
    n:"Cobicistat oxidative metabolites",
    e:"CYP3A4",
    a:"inactive",
    p:60,
    note:"Cobicistat interaction risk is parent-drug CYP3A/P-gp/OATP inhibition; metabolites are not the booster signal.",
    evidenceRefs:["ev_cobicistat_cyp3a_label"]
  },
  {
    n:"Cobicistat CYP2D6 minor metabolites",
    e:"CYP2D6",
    a:"inactive",
    p:10,
    note:"Minor CYP2D6 pathway. CYP3A inhibition and induction dominate clinical management.",
    evidenceRefs:["ev_cobicistat_cyp3a_label"]
  }
],
"Atazanavir":[
  {
    n:"Atazanavir oxidative metabolites",
    e:"CYP3A4",
    a:"inactive",
    p:70,
    note:"CYP3A4 clearance pathway; strong inducers lower parent atazanavir exposure and can cause virologic failure.",
    evidenceRefs:["ev_atazanavir_cyp3a_ugt1a1_label"]
  },
  {
    n:"Unconjugated bilirubin accumulation signal",
    e:"UGT1A1",
    a:"toxic",
    p:0,
    note:"Not an atazanavir metabolite: atazanavir inhibits UGT1A1, raising indirect bilirubin. Kept as a pathway signal because genotype and toxicity context matter.",
    evidenceRefs:["ev_atazanavir_cyp3a_ugt1a1_label"]
  }
],
"Dolutegravir":[
  {
    n:"Dolutegravir glucuronide",
    e:"UGT1A1",
    a:"inactive",
    p:55,
    note:"Primary clearance pathway. UGT1A1/CYP3A induction lowers parent dolutegravir exposure.",
    evidenceRefs:["ev_dolutegravir_oct2_mate1_fda"]
  },
  {
    n:"Dolutegravir oxidative metabolites",
    e:"CYP3A4",
    a:"inactive",
    p:10,
    note:"Minor oxidative route; parent dolutegravir also inhibits OCT2/MATE1 and can raise creatinine without true GFR loss.",
    evidenceRefs:["ev_dolutegravir_oct2_mate1_fda"]
  }
],
"Tofacitinib":[
  {
    n:"Tofacitinib oxidative metabolites",
    e:"CYP3A4",
    a:"inactive",
    p:55,
    note:"Major hepatic clearance route. Strong CYP3A inhibitors raise parent exposure; strong inducers can cause therapeutic failure.",
    evidenceRefs:["ev_tofacitinib_cyp3a4_label"]
  },
  {
    n:"Tofacitinib CYP2C19 minor metabolites",
    e:"CYP2C19",
    a:"inactive",
    p:20,
    note:"Minor contribution that becomes relevant when CYP3A4 and CYP2C19 are jointly inhibited.",
    evidenceRefs:["ev_tofacitinib_cyp3a4_label"]
  }
],
"Upadacitinib":[
  {
    n:"Upadacitinib oxidative metabolites",
    e:"CYP3A4",
    a:"inactive",
    p:60,
    note:"Parent-exposure driven JAK inhibitor risk; strong CYP3A induction lowers exposure and strong inhibition increases adverse-event burden.",
    evidenceRefs:["ev_upadacitinib_cyp3a4_label"]
  }
],
"Ibrutinib":[
  {
    n:"Dihydrodiol ibrutinib metabolite (PCI-45227)",
    e:"CYP3A4",
    a:"active",
    p:40,
    t:6,
    note:"Active metabolite with lower BTK inhibitory activity than parent. CYP3A inhibition/induction remains the dominant clinical signal.",
    evidenceRefs:["ev_ibrutinib_cyp3a_label"]
  },
  {
    n:"Ibrutinib minor oxidative metabolites",
    e:"CYP2D6",
    a:"inactive",
    p:10,
    note:"Minor CYP2D6 contribution; not the main dose-adjustment pathway.",
    evidenceRefs:["ev_ibrutinib_cyp3a_label"]
  }
],
"Lacosamide":[
  {
    n:"O-Desmethyl lacosamide",
    e:"CYP2C19",
    a:"inactive",
    p:30,
    note:"Inactive metabolite. Parent lacosamide and renal clearance drive PR-interval and CNS adverse-effect monitoring.",
    evidenceRefs:["ev_lacosamide_pr_label"]
  },
  {
    n:"Lacosamide (unchanged)",
    e:"Renal",
    a:"active",
    p:40,
    note:"Substantial unchanged renal excretion; renal impairment and additive conduction-slowing drugs matter clinically.",
    evidenceRefs:["ev_lacosamide_pr_label"]
  }
],
"Phenelzine":[
  {
    n:"Phenelzine acetylated metabolites",
    e:"NAT2",
    a:"inactive",
    p:40,
    note:"NAT2 acetylation contributes to clearance, but irreversible MAO-A/B inhibition and washout timing drive the clinical interaction risk.",
    evidenceRefs:["ev_maoi_ssri_serotonin_fda"]
  },
  {
    n:"Phenelzine hydrazine metabolites",
    e:"MAO-A",
    a:"active",
    p:30,
    note:"Reactive hydrazine-related metabolism contributes to irreversible MAO inhibition; avoid interpreting parent half-life as offset of effect.",
    evidenceRefs:["ev_maoi_ssri_serotonin_fda"]
  }
],
"Buspirone":[
  {
    n:"1-(2-pyrimidinyl)piperazine (1-PP)",
    e:"CYP3A4",
    a:"active",
    p:30,
    t:6,
    note:"Active metabolite with alpha-2 adrenergic activity; CYP3A inhibition raises parent buspirone and can shift active-moiety exposure.",
    evidenceRefs:["ev_buspirone_cyp3a_label"]
  },
  {
    n:"6-Hydroxybuspirone",
    e:"CYP3A4",
    a:"active",
    p:35,
    note:"Hydroxylated active metabolite. Parent buspirone exposure is still the main label interaction signal.",
    evidenceRefs:["ev_buspirone_cyp3a_label"]
  }
],
"Ranolazine":[
  {
    n:"O-Desmethyl ranolazine",
    e:"CYP3A4",
    a:"active",
    p:35,
    note:"Active metabolite family; parent ranolazine accumulation is most important for QT and adverse-effect risk.",
    evidenceRefs:["ev_ranolazine_cyp3a_label"]
  },
  {
    n:"Ranolazine CYP2D6 minor metabolites",
    e:"CYP2D6",
    a:"weak",
    p:10,
    note:"Minor pathway. CYP3A inhibition/induction and P-gp context dominate interaction handling.",
    evidenceRefs:["ev_ranolazine_cyp3a_label"]
  }
],
"Methylphenidate":[
  {
    n:"Ritalinic acid",
    e:"CES1A1",
    a:"inactive",
    p:80,
    note:"Primary inactive hydrolysis product. Methylphenidate is not a classic CYP prodrug; MAOI contraindication is pharmacodynamic.",
    evidenceRefs:["ev_stimulant_maoi_fda"]
  }
],
"Tranylcypromine":[
  {
    n:"Tranylcypromine oxidative metabolites",
    e:"CYP2C19",
    a:"inactive",
    p:30,
    note:"CYP2C19-linked clearance context. Irreversible MAO inhibition means clinical offset follows enzyme resynthesis, not parent half-life.",
    evidenceRefs:["ev_maoi_ssri_serotonin_fda","ev_maoi_tyramine_fda"]
  },
  {
    n:"Tranylcypromine MAO adduct / irreversible inhibition signal",
    e:"MAO-A",
    a:"active",
    p:0,
    note:"Pathway signal for irreversible MAO-A/B inhibition; tyramine and serotonergic interaction risks persist after parent drug falls.",
    evidenceRefs:["ev_maoi_ssri_serotonin_fda","ev_maoi_tyramine_fda"]
  }
],
"Fluphenazine":[
  {
    n:"7-Hydroxyfluphenazine",
    e:"CYP2D6",
    a:"active",
    p:35,
    note:"Phenothiazine hydroxylated metabolite family; CYP2D6 poor metabolism mainly raises parent fluphenazine and EPS risk.",
    evidenceRefs:["ev_antipsychotic_cyp2d6_labels"]
  },
  {
    n:"Fluphenazine sulfoxide / N-dealkylated metabolites",
    e:"CYP1A2",
    a:"inactive",
    p:25,
    note:"Secondary oxidative metabolites. Smoking/CYP1A2 context may shift exposure but CYP2D6 is the main genotype axis.",
    evidenceRefs:["ev_antipsychotic_cyp2d6_labels"]
  }
],
"Perphenazine":[
  {
    n:"7-Hydroxyperphenazine",
    e:"CYP2D6",
    a:"active",
    p:40,
    note:"Hydroxylated phenothiazine metabolite. CYP2D6 PM increases parent exposure and adverse-effect risk.",
    evidenceRefs:["ev_antipsychotic_cyp2d6_labels"]
  },
  {
    n:"Perphenazine sulfoxide / N-dealkylated metabolites",
    e:"CYP1A2",
    a:"inactive",
    p:25,
    note:"Secondary pathway; included to avoid treating parent-only CYP2D6 exposure as the entire metabolic story.",
    evidenceRefs:["ev_antipsychotic_cyp2d6_labels"]
  }
],
"Guanfacine":[
  {
    n:"3-Hydroxyguanfacine sulfate",
    e:"CYP3A4/SULT",
    a:"inactive",
    p:35,
    note:"Representative oxidative/conjugated metabolite. Parent guanfacine exposure is strongly reduced by CYP3A induction.",
    evidenceRefs:["ev_guanfacine_cyp3a_label"]
  },
  {
    n:"Guanfacine (unchanged)",
    e:"Renal",
    a:"active",
    p:50,
    note:"Substantial unchanged clearance; CYP3A interactions still drive most label dose changes.",
    evidenceRefs:["ev_guanfacine_cyp3a_label"]
  }
],
"Nitroglycerin":[
  {
    n:"1,2-Glyceryl dinitrate",
    e:"ALDH2/denitration",
    a:"active",
    p:45,
    note:"Active denitrated metabolite contributing to vasodilation. PDE5 inhibitor contraindication is pharmacodynamic cGMP stacking.",
    evidenceRefs:["ev_nitrate_pde5_label"]
  },
  {
    n:"1,3-Glyceryl dinitrate",
    e:"ALDH2/denitration",
    a:"active",
    p:45,
    note:"Active nitrate metabolite; parent and metabolites are not CYP-driven.",
    evidenceRefs:["ev_nitrate_pde5_label"]
  }
],
"Isosorbide Mononitrate":[
  {
    n:"Isosorbide mononitrate glucuronide",
    e:"UGT",
    a:"inactive",
    p:65,
    note:"Conjugated clearance product. The clinically critical interaction is additive nitrate/PDE5 vasodilation rather than CYP metabolism.",
    evidenceRefs:["ev_nitrate_pde5_label"]
  },
  {
    n:"Isosorbide",
    e:"Denitration",
    a:"inactive",
    p:25,
    note:"Denitrated metabolite after nitrate bioactivation.",
    evidenceRefs:["ev_nitrate_pde5_label"]
  }
],
"Donepezil":[
  {
    n:"6-O-Desmethyldonepezil",
    e:"CYP2D6",
    a:"active",
    p:20,
    note:"Active metabolite with cholinesterase inhibition; parent donepezil and vagotonic bradycardia risk remain the main clinical signal.",
    evidenceRefs:["ev_donepezil_bradycardia_label"]
  },
  {
    n:"Donepezil N-oxide / hydroxylated metabolites",
    e:"CYP3A4",
    a:"inactive",
    p:35,
    note:"CYP3A4-mediated metabolite family; strong inhibitors may raise parent donepezil exposure.",
    evidenceRefs:["ev_donepezil_bradycardia_label"]
  }
],
"Eplerenone":[
  {
    n:"6β-Hydroxyeplerenone",
    e:"CYP3A4",
    a:"inactive",
    p:45,
    note:"Major inactive CYP3A metabolite. Strong CYP3A inhibition is contraindicated because parent eplerenone exposure and hyperkalemia risk rise.",
    evidenceRefs:["ev_eplerenone_cyp3a_label"]
  },
  {
    n:"21-Hydroxyeplerenone",
    e:"CYP3A4",
    a:"inactive",
    p:25,
    note:"Secondary inactive hydroxylated metabolite.",
    evidenceRefs:["ev_eplerenone_cyp3a_label"]
  }
],
"Ivabradine":[
  {
    n:"N-Desmethyl ivabradine (S18982)",
    e:"CYP3A4",
    a:"active",
    p:40,
    note:"Active metabolite with similar heart-rate lowering pharmacology; CYP3A inhibitors raise active-moiety exposure.",
    evidenceRefs:["ev_ivabradine_cyp3a_label"]
  }
],
"Torsemide":[
  {
    n:"Torsemide M1 metabolite",
    e:"CYP2C9",
    a:"weak",
    p:20,
    note:"Hydroxylated metabolite with weaker diuretic activity. Parent renal/hemodynamic effects and lithium/electrolyte context dominate risk.",
    evidenceRefs:["ev_torsemide_lithium_label"]
  },
  {
    n:"Torsemide M3 / carboxylic acid metabolites",
    e:"CYP2C9",
    a:"inactive",
    p:45,
    note:"Inactive oxidative metabolites; CYP2C9 contributes to clearance.",
    evidenceRefs:["ev_torsemide_lithium_label"]
  }
],
"Zileuton":[
  {
    n:"Zileuton glucuronide",
    e:"UGT1A1",
    a:"inactive",
    p:55,
    note:"Major conjugated clearance product. Parent zileuton inhibits CYP1A2 and raises theophylline exposure.",
    evidenceRefs:["ev_zileuton_theophylline_label"]
  },
  {
    n:"N-Hydroxyzileuton",
    e:"CYP1A2",
    a:"inactive",
    p:20,
    note:"Oxidative metabolite; parent CYP1A2 inhibition remains the key interaction signal.",
    evidenceRefs:["ev_zileuton_theophylline_label"]
  }
],
"Zafirlukast":[
  {
    n:"Hydroxyzafirlukast metabolites",
    e:"CYP2C9",
    a:"inactive",
    p:45,
    note:"CYP2C9-linked oxidative metabolism. Parent zafirlukast can increase warfarin anticoagulant response.",
    evidenceRefs:["ev_zafirlukast_warfarin_label"]
  }
],

// ── PRIORITY METABOLITE COVERAGE BATCH 2: transporter, antiviral, renal-clearance context ──
"Gemfibrozil":[
  {
    n:"Gemfibrozil 1-O-β-glucuronide",
    e:"UGT",
    a:"active",
    p:45,
    note:"Acyl-glucuronide metabolite implicated in mechanism-based CYP2C8 inhibition; this helps explain high-risk statin and CYP2C8-substrate interactions beyond parent fibrate exposure.",
    evidenceRefs:["ev_statin_gemfibrozil_schneck2004"]
  },
  {
    n:"Hydroxygemfibrozil / carboxygemfibrozil metabolites",
    e:"CYP/UGT",
    a:"inactive",
    p:35,
    note:"Oxidative/conjugated clearance products. Clinically, transporter and CYP2C8 inhibition dominate the interaction profile.",
    evidenceRefs:["ev_statin_gemfibrozil_schneck2004"]
  }
],
"Probenecid":[
  {
    n:"Probenecid glucuronide",
    e:"UGT",
    a:"inactive",
    p:45,
    note:"Conjugated clearance product. Parent probenecid is the clinically important OAT1/OAT3 inhibitor that raises renal-transport substrates.",
    evidenceRefs:["ev_methotrexate_oat3_probenecid","ev_cefuroxime_probenecid_label"]
  },
  {
    n:"Probenecid (unchanged renal transport signal)",
    e:"Renal/OAT1/OAT3",
    a:"active",
    p:55,
    note:"Not a metabolite: included as a clearance signal because unchanged probenecid competitively inhibits renal organic anion transporters.",
    evidenceRefs:["ev_methotrexate_oat3_probenecid","ev_valacyclovir_probenecid_label","ev_oseltamivir_probenecid_label","ev_acyclovir_probenecid_label"]
  }
],
"Febuxostat":[
  {
    n:"Febuxostat acyl glucuronide",
    e:"UGT",
    a:"inactive",
    p:45,
    note:"Major conjugated clearance product. Parent xanthine oxidase inhibition drives the dangerous thiopurine interaction.",
    evidenceRefs:["ev_allopurinol_azathioprine_xo_label","ev_thiopurine_tpmt_nudt15_cpic2025"]
  },
  {
    n:"Hydroxyfebuxostat metabolites",
    e:"CYP",
    a:"weak",
    p:25,
    note:"Oxidative metabolite family; not treated as the active urate-lowering signal in this model.",
    evidenceRefs:["ev_allopurinol_azathioprine_xo_label"]
  }
],
"Rifabutin":[
  {
    n:"25-O-Desacetyl rifabutin",
    e:"CYP3A4",
    a:"active",
    p:30,
    t:45,
    note:"Active metabolite with long persistence; CYP3A inhibitors can raise rifabutin/metabolite exposure and uveitis/toxicity risk.",
    evidenceRefs:["ev_ritonavir_cyp3a4_booster_label"]
  },
  {
    n:"Rifabutin oxidative metabolites",
    e:"CYP3A4",
    a:"inactive",
    p:35,
    note:"CYP3A-mediated clearance products. Rifabutin is a weaker inducer than rifampin but still relevant in HIV/TB co-treatment.",
    evidenceRefs:["ev_ritonavir_cyp3a4_booster_label","ev_dolutegravir_oct2_mate1_fda"]
  }
],
"Cinacalcet":[
  {
    n:"Cinacalcet oxidative metabolites",
    e:"CYP3A4/CYP2D6",
    a:"inactive",
    p:70,
    note:"Parent cinacalcet exposure is increased by CYP2D6 inhibitors; cinacalcet itself also inhibits CYP2D6 substrates.",
    evidenceRefs:["ev_cinacalcet_cyp2d6_label"]
  },
  {
    n:"Cinacalcet glucuronide conjugates",
    e:"UGT",
    a:"inactive",
    p:20,
    note:"Secondary conjugated clearance. Hypocalcemia risk is parent-exposure driven.",
    evidenceRefs:["ev_cinacalcet_cyp2d6_label"]
  }
],
"Linezolid":[
  {
    n:"Linezolid aminoethoxyacetic acid metabolite",
    e:"Non-enzymatic oxidation",
    a:"inactive",
    p:35,
    note:"Non-CYP oxidative metabolite; linezolid's major interaction risk is reversible MAO inhibition, not CYP competition.",
    evidenceRefs:["ev_linezolid_serotonin_fda2011","ev_linezolid_ssri_serotonin"]
  },
  {
    n:"Linezolid hydroxyethyl glycine metabolite",
    e:"Non-enzymatic oxidation",
    a:"inactive",
    p:30,
    note:"Second major inactive oxidative metabolite; renal impairment can alter metabolite accumulation while parent MAOI effects remain clinically central.",
    evidenceRefs:["ev_linezolid_serotonin_fda2011"]
  }
],
"Maraviroc":[
  {
    n:"Maraviroc oxidative metabolites",
    e:"CYP3A4",
    a:"inactive",
    p:65,
    note:"CYP3A4 clearance route; ritonavir/cobicistat boosting raises parent maraviroc exposure and requires dose adjustment.",
    evidenceRefs:["ev_ritonavir_cyp3a4_booster_label"]
  },
  {
    n:"Maraviroc (unchanged)",
    e:"Renal/Fecal",
    a:"active",
    p:25,
    note:"Residual unchanged elimination; parent exposure remains the therapeutic and toxicity signal.",
    evidenceRefs:["ev_ritonavir_cyp3a4_booster_label"]
  }
],
"Methylene Blue":[
  {
    n:"Leucomethylene blue",
    e:"NADPH-dependent reduction",
    a:"active",
    p:60,
    note:"Reduced active redox form used in methemoglobinemia treatment. G6PD deficiency impairs NADPH-dependent reduction and increases oxidative hemolysis risk.",
    evidenceRefs:["ev_methylene_blue_maoi_fda"]
  },
  {
    n:"Methylene blue N-demethylated metabolites",
    e:"CYP",
    a:"weak",
    p:20,
    note:"Minor metabolites; the key safety signal is parent/redox MAO-A inhibition plus G6PD-linked oxidant risk.",
    evidenceRefs:["ev_methylene_blue_maoi_fda"]
  }
],
"Mifepristone":[
  {
    n:"N-Demethyl mifepristone metabolites",
    e:"CYP3A4",
    a:"active",
    p:35,
    t:45,
    note:"Active metabolite family contributing to long pharmacologic persistence. Chronic Cushing-syndrome dosing can strongly inhibit CYP3A substrates.",
    evidenceRefs:["ev_mifepristone_cyp3a4_label"]
  },
  {
    n:"Hydroxylated mifepristone metabolites",
    e:"CYP3A4",
    a:"active",
    p:25,
    note:"Active/weak active oxidative metabolites; parent and active-moiety persistence matter for interaction washout.",
    evidenceRefs:["ev_mifepristone_cyp3a4_label"]
  }
],
"Propofol":[
  {
    n:"Propofol glucuronide",
    e:"UGT1A9",
    a:"inactive",
    p:55,
    note:"Major inactive conjugate. Interaction risk with midazolam and opioids is pharmacodynamic sedation/respiratory depression rather than CYP-mediated competition.",
    evidenceRefs:["ev_propofol_midazolam_sedation"]
  },
  {
    n:"4-Hydroxypropofol sulfate / glucuronide",
    e:"CYP2B6/UGT/SULT",
    a:"inactive",
    p:30,
    note:"Oxidative-conjugated metabolite family; rapid redistribution plus conjugation explain short procedural effect.",
    evidenceRefs:["ev_propofol_midazolam_sedation"]
  }
],
"Selegiline":[
  {
    n:"L-Methamphetamine",
    e:"CYP2B6/CYP3A4/CYP2C19",
    a:"active",
    p:35,
    t:10,
    note:"Active amphetamine-like metabolite from selegiline; CYP2B6 poor metabolism may raise parent exposure while metabolites add stimulant context.",
    evidenceRefs:["ev_selegiline_ssri_fda"]
  },
  {
    n:"L-Amphetamine",
    e:"CYP2B6/CYP3A4",
    a:"active",
    p:20,
    t:10,
    note:"Active metabolite relevant to insomnia/sympathomimetic burden; serotonin/MAOI warnings remain the dominant safety issue.",
    evidenceRefs:["ev_selegiline_ssri_fda"]
  },
  {
    n:"Desmethylselegiline",
    e:"CYP2B6",
    a:"active",
    p:20,
    note:"Active intermediate metabolite in selegiline clearance.",
    evidenceRefs:["ev_selegiline_ssri_fda"]
  }
],
"Sofosbuvir":[
  {
    n:"GS-461203 triphosphate",
    e:"Intracellular phosphorylation",
    a:"active_form",
    role:"active_form",
    p:80,
    note:"Intracellular active nucleotide triphosphate that inhibits HCV NS5B polymerase. This activation is not CYP-mediated.",
    evidenceRefs:["ev_sofosbuvir_pgp_induction","ev_sofosbuvir_amiodarone_bradycardia"]
  },
  {
    n:"GS-331007",
    e:"Dephosphorylation/renal elimination",
    a:"inactive",
    p:70,
    note:"Major circulating inactive metabolite, renally cleared. P-gp/BCRP induction reduces parent absorption before active-form generation.",
    evidenceRefs:["ev_sofosbuvir_pgp_induction"]
  }
],
"Black Pepper (Piperine)":[
  {
    n:"Piperine glucuronide / sulfate conjugates",
    e:"UGT/SULT",
    a:"inactive",
    p:60,
    note:"Conjugated metabolites. Parent piperine is modeled mainly as a food/xenobiotic inhibitor of transport and metabolism.",
    evidenceRefs:["ev_piperine_pgp_annaert2010"]
  },
  {
    n:"Hydroxypiperine metabolites",
    e:"CYP3A4",
    a:"weak",
    p:25,
    note:"Oxidative metabolite family; clinical DDI relevance remains much less established than grapefruit-like food interactions.",
    evidenceRefs:["ev_piperine_pgp_annaert2010"]
  }
],
"Chlorthalidone":[
  {
    n:"Chlorthalidone (unchanged renal elimination)",
    e:"Renal",
    a:"active",
    p:70,
    note:"Not a metabolite: included as a clearance signal because chlorthalidone is largely excreted unchanged and alters lithium/electrolyte risk through renal and pharmacodynamic mechanisms.",
    evidenceRefs:["ev_chlorthalidone_lithium_label"]
  }
],
"Insulin Glargine":[
  {
    n:"Insulin glargine M1 metabolite",
    e:"Proteolytic degradation",
    a:"active_form",
    role:"active_form",
    p:70,
    note:"Main active metabolite after subcutaneous conversion; beta-blockers can mask hypoglycemia warning symptoms without changing CYP metabolism.",
    evidenceRefs:["ev_insulin_glargine_beta_blocker_label"]
  },
  {
    n:"Insulin glargine M2 metabolite",
    e:"Proteolytic degradation",
    a:"active_form",
    role:"active_form",
    p:20,
    note:"Secondary active metabolite from proteolytic processing.",
    evidenceRefs:["ev_insulin_glargine_beta_blocker_label"]
  }
],
"Fluticasone":[
  {
    n:"Fluticasone 17beta-carboxylic acid metabolite",
    e:"CYP3A4",
    a:"inactive",
    p:80,
    note:"Primary inactive oxidative metabolite. Strong CYP3A inhibitors can raise parent fluticasone enough to cause systemic corticosteroid effects.",
    evidenceRefs:["ev_ritonavir_cyp3a4_booster_label","ev_cobicistat_cyp3a_label","ev_paxlovid_cyp3a_label"]
  },
  {
    n:"Fluticasone (unchanged local/systemic parent)",
    e:"CYP3A4",
    a:"active",
    p:20,
    note:"Parent steroid drives benefit and toxicity; low oral bioavailability is no longer protective when systemic clearance is limited by strong CYP3A inhibition."
  }
],
"Ipratropium":[
  {
    n:"Ipratropium (unchanged renal/fecal elimination)",
    e:"Renal/Fecal",
    a:"active",
    p:80,
    note:"Not meaningfully CYP-metabolized; additive anticholinergic pharmacodynamics are the main interaction concern."
  },
  {
    n:"Ipratropium ester hydrolysis products",
    e:"Ester hydrolysis",
    a:"inactive",
    p:20,
    note:"Inactive hydrolysis products; systemic exposure is low after inhaled use."
  }
],
"Polyethylene Glycol":[
  {
    n:"Polyethylene glycol (unabsorbed fecal elimination)",
    e:"GI lumen",
    a:"active",
    p:99,
    note:"Not a metabolite: PEG acts osmotically in the gut and is minimally absorbed. High-dose use can still matter through dehydration/electrolyte effects."
  }
],
"Senna":[
  {
    n:"Rhein anthrone",
    e:"Colonic bacterial activation",
    a:"active_form",
    role:"active_form",
    p:70,
    note:"Sennosides are converted by gut bacteria to active anthrone metabolites that stimulate motility and secretion."
  },
  {
    n:"Rhein glucuronide/sulfate conjugates",
    e:"UGT/SULT",
    a:"inactive",
    p:20,
    note:"Conjugated excretory metabolites; repeated diarrhea/hypokalemia is the interaction-relevant signal."
  }
],
"Bisacodyl":[
  {
    n:"Bis-(p-hydroxyphenyl)-pyridyl-2-methane (BHPM)",
    e:"Intestinal/esterase activation",
    a:"active_form",
    role:"active_form",
    p:90,
    note:"Active stimulant laxative metabolite formed in the gut; electrolyte/volume effects matter more than CYP interactions."
  },
  {
    n:"BHPM glucuronide",
    e:"UGT",
    a:"inactive",
    p:10,
    note:"Inactive conjugate for excretion."
  }
],
"Insulin Lispro":[
  {
    n:"Insulin lispro peptide fragments",
    e:"Proteolytic degradation",
    a:"inactive",
    p:100,
    note:"Peptide catabolism rather than CYP metabolism; interaction burden is pharmacodynamic hypoglycemia."
  }
],
"Insulin Aspart":[
  {
    n:"Insulin aspart peptide fragments",
    e:"Proteolytic degradation",
    a:"inactive",
    p:100,
    note:"Peptide catabolism rather than CYP metabolism; interaction burden is pharmacodynamic hypoglycemia."
  }
],
"Insulin Degludec":[
  {
    n:"Insulin degludec albumin-bound depot",
    e:"Depot dissociation",
    a:"active",
    p:70,
    note:"Not a metabolite: albumin binding and depot dissociation create ultra-long basal exposure."
  },
  {
    n:"Insulin degludec peptide fragments",
    e:"Proteolytic degradation",
    a:"inactive",
    p:30,
    note:"Cleared by protein catabolism rather than CYP enzymes."
  }
],
"Estradiol":[
  {
    n:"Estrone",
    e:"17beta-HSD",
    a:"active",
    p:35,
    note:"Reversible estrogen metabolite; route and tissue context influence clinical relevance."
  },
  {
    n:"Estradiol glucuronide/sulfate conjugates",
    e:"UGT/SULT",
    a:"inactive",
    p:45,
    note:"Conjugation supports elimination and enterohepatic cycling context; enzyme induction can lower estrogen exposure."
  },
  {
    n:"Estriol",
    e:"CYP3A4",
    a:"weak",
    p:10,
    note:"Minor weaker estrogenic metabolite family; CYP1A2 can also contribute to hydroxylation context."
  }
],
"Progesterone":[
  {
    n:"Allopregnanolone",
    e:"5alpha-reductase/3alpha-HSD",
    a:"active",
    p:20,
    note:"Neuroactive metabolite that can contribute to sedation and CNS effects."
  },
  {
    n:"Pregnanediol glucuronide",
    e:"UGT",
    a:"inactive",
    p:55,
    note:"Major excretory metabolite used as a progesterone metabolism marker."
  },
  {
    n:"Hydroxylated progesterone metabolites",
    e:"CYP3A4",
    a:"weak",
    p:20,
    note:"CYP3A-mediated metabolism is vulnerable to strong induction or inhibition."
  }
],
"Medroxyprogesterone":[
  {
    n:"Hydroxylated medroxyprogesterone metabolites",
    e:"CYP3A4",
    a:"inactive",
    p:70,
    note:"CYP3A-mediated clearance supports inducer/inhibitor cautions; clinical importance depends strongly on oral vs depot formulation."
  },
  {
    n:"Medroxyprogesterone conjugates",
    e:"UGT/SULT",
    a:"inactive",
    p:20,
    note:"Conjugated excretory metabolite family."
  }
],
"Sugammadex":[
  {
    n:"Sugammadex-rocuronium inclusion complex",
    e:"Binding",
    a:"inactive",
    p:100,
    note:"Purposeful binding complex that reverses rocuronium blockade. Renal clearance eliminates the unchanged complex.",
    evidenceRefs:["ev_sugammadex_rocuronium_reversal"]
  },
  {
    n:"Sugammadex (unchanged renal elimination)",
    e:"Renal",
    a:"active",
    p:95,
    note:"Not a metabolite: included to make clear that sugammadex is cleared unchanged and can transiently bind steroidal hormones.",
    evidenceRefs:["ev_sugammadex_contraception_label"]
  }
],
"Dantrolene":[
  {
    n:"5-Hydroxydantrolene",
    e:"CYP3A4",
    a:"active",
    p:35,
    note:"Active hydroxylated metabolite; acute malignant-hyperthermia safety context is dominated by calcium-handling pharmacodynamics and organ support."
  },
  {
    n:"Dantrolene acetylamino metabolite",
    e:"Nitroreduction/acetylation",
    a:"inactive",
    p:25,
    note:"Secondary metabolite family; not treated as a CYP interaction driver."
  }
],
"Hydralazine":[
  {
    n:"Acetylhydralazine",
    e:"NAT2",
    a:"inactive",
    p:45,
    note:"NAT2 acetylation product; slow acetylation is relevant to dose-related adverse-effect context rather than a classic active-metabolite pathway."
  },
  {
    n:"Hydralazine hydrazone / pyruvic acid conjugates",
    e:"Nonenzymatic conjugation",
    a:"inactive",
    p:35,
    note:"Conjugated metabolite family; parent vasodilation and reflex physiology drive most interactions."
  }
],
"Ivacaftor":[
  {
    n:"M1 hydroxymethyl ivacaftor",
    e:"CYP3A4",
    a:"active",
    p:35,
    note:"Active metabolite with lower CFTR potentiator activity than parent. CYP3A inhibitors/inducers alter active-moiety exposure."
  },
  {
    n:"M6 ivacaftor carboxylate",
    e:"CYP3A4",
    a:"inactive",
    p:45,
    note:"Inactive major metabolite; parent ivacaftor exposure is the key interaction signal."
  }
],
"Tiotropium":[
  {
    n:"Tiotropium (unchanged renal elimination)",
    e:"Renal",
    a:"active",
    p:70,
    note:"Not a metabolite: inhaled tiotropium is largely cleared unchanged; systemic interaction burden is more anticholinergic than metabolic."
  },
  {
    n:"Tiotropium ester hydrolysis products",
    e:"Nonenzymatic ester hydrolysis",
    a:"inactive",
    p:20,
    note:"Inactive hydrolysis products; CYP3A4/CYP2D6 contribution is minor."
  }
],
"Tirzepatide":[
  {
    n:"Tirzepatide peptide fragments",
    e:"Proteolytic degradation",
    a:"inactive",
    p:80,
    note:"Peptide/protein catabolism rather than CYP metabolism. Delayed gastric emptying is the clinically relevant interaction mechanism.",
    evidenceRefs:["ev_tirzepatide_oral_absorption_label"]
  },
  {
    n:"Tirzepatide fatty-diacid catabolites",
    e:"Beta-oxidation/proteolysis",
    a:"inactive",
    p:20,
    note:"Expected catabolic products from the albumin-binding side chain; not a CYP-mediated interaction pathway.",
    evidenceRefs:["ev_tirzepatide_oral_absorption_label"]
  }
],
"Tyramine-rich Foods":[
  {
    n:"Tyramine",
    e:"Dietary amine",
    a:"active",
    p:100,
    note:"Pressor amine normally cleared by gut/liver MAO-A. MAOIs allow absorption and catecholamine release, causing hypertensive crisis.",
    evidenceRefs:["ev_maoi_tyramine_fda"]
  },
  {
    n:"p-Hydroxyphenylacetic acid",
    e:"MAO-A/ALDH",
    a:"inactive",
    p:80,
    note:"Normal inactive tyramine catabolite; formation is blocked when MAO-A is inhibited.",
    evidenceRefs:["ev_maoi_tyramine_fda"]
  }
],
"Alendronate":[
  {
    n:"Alendronate (bone-bound unchanged)",
    e:"Bone matrix incorporation",
    a:"active",
    p:50,
    note:"Not metabolized; binds bone mineral and remains pharmacologically relevant at remodeling surfaces. Oral cations reduce absorption before systemic exposure.",
    evidenceRefs:["ev_alendronate_cation_absorption"]
  },
  {
    n:"Alendronate (unchanged renal elimination)",
    e:"Renal",
    a:"active",
    p:50,
    note:"Systemically absorbed fraction is eliminated unchanged by kidney or incorporated into bone.",
    evidenceRefs:["ev_alendronate_cation_absorption"]
  }
],
"Amoxicillin/Clavulanate":[
  {
    n:"Amoxicillin (unchanged renal elimination)",
    e:"Renal",
    a:"active",
    p:60,
    note:"Amoxicillin is largely cleared unchanged. INR interaction context is pharmacodynamic/microbiome/illness-linked rather than CYP metabolism.",
    evidenceRefs:["ev_amox_clav_warfarin_label"]
  },
  {
    n:"Clavulanic acid metabolites",
    e:"Hydrolysis/renal elimination",
    a:"inactive",
    p:40,
    note:"Clavulanate undergoes hydrolysis and renal clearance; hepatic adverse events are not modeled as a single active metabolite.",
    evidenceRefs:["ev_amox_clav_warfarin_label"]
  }
],
"Cefuroxime":[
  {
    n:"Cefuroxime (unchanged renal elimination)",
    e:"Renal/OAT",
    a:"active",
    p:90,
    note:"Cefuroxime is not meaningfully metabolized. Probenecid raises exposure by inhibiting renal tubular secretion.",
    evidenceRefs:["ev_cefuroxime_probenecid_label"]
  }
],
"Cephalexin":[
  {
    n:"Cephalexin (unchanged renal elimination)",
    e:"Renal/OCT",
    a:"active",
    p:90,
    note:"Mostly unchanged renal clearance; label PK data show metformin exposure can rise with coadministration.",
    evidenceRefs:["ev_cephalexin_metformin_label"]
  }
],
"Ceftriaxone":[
  {
    n:"Ceftriaxone (unchanged renal/biliary elimination)",
    e:"Renal/Biliary",
    a:"active",
    p:90,
    note:"Not meaningfully metabolized. Calcium precipitation risk is a formulation/solubility issue rather than CYP metabolism.",
    evidenceRefs:["ev_ceftriaxone_calcium_label"]
  },
  {
    n:"Ceftriaxone-calcium precipitate",
    e:"Precipitation",
    a:"toxic",
    p:0,
    note:"Pathway signal for the neonatal calcium-containing IV fluid contraindication.",
    evidenceRefs:["ev_ceftriaxone_calcium_label"]
  }
],
"Eltrombopag":[
  {
    n:"Eltrombopag glucuronide",
    e:"UGT",
    a:"inactive",
    p:35,
    note:"Conjugated metabolite. Parent eltrombopag inhibits OATP1B1/BCRP and can raise rosuvastatin exposure.",
    evidenceRefs:["ev_rosuvastatin_label"]
  },
  {
    n:"Eltrombopag oxidative/cleavage metabolites",
    e:"CYP/cleavage",
    a:"inactive",
    p:30,
    note:"Secondary metabolite family; transporter inhibition by parent drug is the main DDI signal.",
    evidenceRefs:["ev_rosuvastatin_label"]
  }
],
"Rifaximin":[
  {
    n:"Rifaximin (fecal unchanged)",
    e:"Fecal",
    a:"active",
    p:97,
    note:"Minimal systemic absorption and mostly fecal unchanged elimination. P-gp/OATP inhibition can increase systemic exposure.",
    evidenceRefs:["ev_rifaximin_cyclosporine_transporter"]
  },
  {
    n:"25-Desacetyl rifaximin",
    e:"Hydrolysis",
    a:"weak",
    p:2,
    note:"Minor metabolite; usually less important than gut-luminal parent drug exposure.",
    evidenceRefs:["ev_rifaximin_cyclosporine_transporter"]
  }
],
"Rocuronium":[
  {
    n:"Rocuronium (unchanged biliary elimination)",
    e:"Biliary",
    a:"active",
    p:70,
    note:"Cleared mostly unchanged; neuromuscular blockade can be reversed by sugammadex binding rather than metabolism.",
    evidenceRefs:["ev_sugammadex_rocuronium_reversal"]
  },
  {
    n:"Rocuronium-sugammadex complex",
    e:"Binding",
    a:"inactive",
    p:100,
    note:"Purposeful inactive inclusion complex after sugammadex administration.",
    evidenceRefs:["ev_sugammadex_rocuronium_reversal"]
  }
],
"Sodium Bicarbonate":[
  {
    n:"Bicarbonate buffer pool",
    e:"Renal bicarbonate handling",
    a:"active",
    p:100,
    note:"Not a metabolite: bicarbonate changes systemic/urinary pH, which can alter renal elimination of pH-sensitive drugs such as memantine.",
    evidenceRefs:["ev_memantine_urine_ph_label"]
  },
  {
    n:"Carbon dioxide + water",
    e:"Carbonic anhydrase / buffering",
    a:"inactive",
    p:100,
    note:"Physiologic buffering endpoint rather than drug metabolism.",
    evidenceRefs:["ev_memantine_urine_ph_label"]
  }
],
"Clonidine":[
  {
    n:"p-Hydroxyclonidine",
    e:"CYP2D6",
    a:"inactive",
    p:25,
    note:"Minor oxidative metabolite. Renal unchanged clearance and pharmacodynamic rebound/bradycardia risks are more clinically important than CYP2D6 metabolism.",
    evidenceRefs:["ev_clonidine_cyp2d6_4hydroxylation"]
  },
  {
    n:"Clonidine (unchanged renal elimination)",
    e:"Renal",
    a:"active",
    p:40,
    note:"Substantial unchanged renal clearance; abrupt withdrawal can produce rebound hypertension independent of metabolite formation."
  }
],
"Glecaprevir":[
  {
    n:"Glecaprevir (biliary/fecal unchanged)",
    e:"OATP1B1/P-gp/Biliary",
    a:"active",
    p:90,
    note:"Minimal metabolism; hepatic uptake/efflux transport determines exposure. Strong inducers can markedly reduce antiviral concentrations.",
    evidenceRefs:["ev_mavyret_oatp_pgp_label"]
  },
  {
    n:"Glecaprevir minor oxidative metabolites",
    e:"CYP3A4",
    a:"inactive",
    p:10,
    note:"Minor route; transporter induction/inhibition is the practical DDI signal.",
    evidenceRefs:["ev_mavyret_oatp_pgp_label"]
  }
],
"Pibrentasvir":[
  {
    n:"Pibrentasvir (fecal unchanged)",
    e:"P-gp/Biliary",
    a:"active",
    p:90,
    note:"Minimal metabolism; P-gp/BCRP and hepatic transporter context determines clinically relevant exposure shifts.",
    evidenceRefs:["ev_mavyret_oatp_pgp_label"]
  }
],
"High Vitamin K Foods":[
  {
    n:"Vitamin K1 (phylloquinone)",
    e:"Dietary vitamin",
    a:"active",
    p:100,
    note:"Active dietary vitamin that opposes warfarin anticoagulation by supporting hepatic clotting-factor gamma-carboxylation. Consistency matters more than avoidance."
  },
  {
    n:"Vitamin K epoxide",
    e:"VKORC1 cycle",
    a:"recycled",
    p:100,
    note:"Warfarin blocks VKORC1 recycling of vitamin K epoxide; abrupt dietary vitamin K changes can shift INR."
  }
],
"Albuterol":[
  {
    n:"Albuterol 4-O-sulfate",
    e:"SULT1A3",
    a:"inactive",
    p:80,
    note:"Primary inactive sulfate conjugate. Interaction risk is mainly beta-agonist pharmacodynamics and beta-blocker antagonism, not CYP metabolism."
  },
  {
    n:"Albuterol (unchanged renal elimination)",
    e:"Renal",
    a:"active",
    p:20,
    note:"Unchanged urinary clearance contributes to elimination after systemic absorption."
  }
],
"Entacapone":[
  {
    n:"Entacapone glucuronide",
    e:"UGT",
    a:"inactive",
    p:60,
    note:"Major conjugated clearance product. Therapeutic effect is parent COMT inhibition that prolongs levodopa exposure.",
    evidenceRefs:["ev_comt_levodopa_parkinson_2012"]
  },
  {
    n:"cis-Entacapone isomer",
    e:"Isomerization",
    a:"weak",
    p:20,
    note:"Isomerization product; not the main active COMT inhibition signal.",
    evidenceRefs:["ev_comt_levodopa_parkinson_2012"]
  }
],
"Carbidopa":[
  {
    n:"Carbidopa (unchanged renal elimination)",
    e:"Renal",
    a:"active",
    p:60,
    note:"Peripheral DOPA decarboxylase inhibition is parent-drug driven; metabolism is not a major DDI pathway."
  },
  {
    n:"Carbidopa hydrazine metabolites",
    e:"Hepatic/renal",
    a:"inactive",
    p:30,
    note:"Minor metabolite family; levodopa-combination pharmacodynamics dominate clinical relevance."
  }
],
"Flucloxacillin":[
  {
    n:"Flucloxacillin hydroxymethyl metabolite",
    e:"Hydroxylation",
    a:"inactive",
    p:20,
    note:"Minor metabolite. The high-value signal is HLA-B*57:01 idiosyncratic liver injury rather than predictable metabolite toxicity.",
    evidenceRefs:["ev_flucloxacillin_hlab5701_daly2009"]
  },
  {
    n:"Flucloxacillin (unchanged renal/biliary elimination)",
    e:"Renal/Biliary",
    a:"active",
    p:70,
    note:"Substantial unchanged elimination; delayed cholestatic DILI remains idiosyncratic.",
    evidenceRefs:["ev_flucloxacillin_hlab5701_daly2009"]
  }
],
"Vancomycin":[
  {
    n:"Vancomycin (unchanged renal elimination)",
    e:"Renal",
    a:"active",
    p:90,
    note:"No meaningful metabolism. Exposure is renal/TDM driven; HLA-A*32:01 is a DRESS risk signal rather than a metabolite pathway.",
    evidenceRefs:["ev_vancomycin_hla_a3201_konvinse2019"]
  }
],
"Succinylcholine":[
  {
    n:"Succinylmonocholine",
    e:"Butyrylcholinesterase",
    a:"weak",
    p:80,
    note:"Rapid hydrolysis product. Prolonged paralysis relates to cholinesterase activity, while malignant hyperthermia risk is RYR1/CACNA1S-triggered.",
    evidenceRefs:["ev_volatile_succinylcholine_ryr1_cacna1s_cpic2019"]
  },
  {
    n:"Succinic acid + choline",
    e:"Butyrylcholinesterase",
    a:"inactive",
    p:80,
    note:"Final hydrolysis products after neuromuscular blockade offset.",
    evidenceRefs:["ev_volatile_succinylcholine_ryr1_cacna1s_cpic2019"]
  }
],
"Lactulose":[
  {
    n:"Lactic acid / acetic acid colonic metabolites",
    e:"Colonic bacterial fermentation",
    a:"active",
    p:80,
    note:"Luminal organic acids acidify colonic contents and trap ammonia as ammonium. Minimal systemic PK interactions."
  },
  {
    n:"Ammonium trapping signal",
    e:"Colonic acidification",
    a:"active",
    p:0,
    note:"Not a metabolite: captures lactulose's ammonia-lowering mechanism in hepatic encephalopathy."
  }
],
"Lumacaftor":[
  {
    n:"Lumacaftor (fecal unchanged)",
    e:"Fecal",
    a:"active",
    p:90,
    note:"Mostly eliminated unchanged; the practical DDI signal is CYP3A/P-gp induction lowering other drugs and ivacaftor exposure."
  }
],
"Primaquine":[
  {
    n:"Carboxyprimaquine",
    e:"MAO-A",
    a:"inactive",
    p:60,
    note:"Major metabolite. Oxidative hemolysis risk in G6PD deficiency is not fully captured by this inactive metabolite alone.",
    evidenceRefs:["ev_g6pd_oxidative_antimalarials","ev_primaquine_g6pd_safety_bastiaens2018"]
  },
  {
    n:"Primaquine hydroxylamine / quinone-imine metabolites",
    e:"CYP/oxidation",
    a:"toxic",
    p:10,
    note:"Reactive oxidative metabolite family implicated in hemolysis/methemoglobinemia risk, especially in G6PD deficiency.",
    evidenceRefs:["ev_g6pd_oxidative_antimalarials","ev_primaquine_g6pd_safety_bastiaens2018","ev_tafenoquine_relapse_lacerda2019"]
  }
],
"Famciclovir":[
  {
    n:"Penciclovir",
    e:"Esterase/oxidase activation",
    a:"active_form",
    role:"active_form",
    p:75,
    note:"Active antiviral formed rapidly after oral dosing. Renal function and renal transport inhibition determine exposure more than CYP metabolism.",
    evidenceRefs:["ev_famciclovir_penciclovir_label"]
  },
  {
    n:"Penciclovir (unchanged renal elimination)",
    e:"Renal",
    a:"active",
    p:70,
    note:"Active metabolite cleared mainly unchanged by the kidney; dose-adjust in renal impairment.",
    evidenceRefs:["ev_famciclovir_penciclovir_label"]
  }
],
"Cefepime":[
  {
    n:"Cefepime (unchanged renal elimination)",
    e:"Renal",
    a:"active",
    p:85,
    note:"Minimal metabolism. Renal accumulation is the key toxicity pathway, especially encephalopathy, myoclonus, seizures, and nonconvulsive status epilepticus.",
    evidenceRefs:["ev_cefepime_neurotoxicity_label"]
  }
],
"Sodium Nitroprusside":[
  {
    n:"Nitric oxide",
    e:"Nonenzymatic release",
    a:"active",
    p:100,
    note:"Immediate vasodilator signal; additive with PDE5 inhibitors, nitrates, and other hypotensive agents.",
    evidenceRefs:["ev_nitroprusside_cyanide_label"]
  },
  {
    n:"Cyanide",
    e:"Nitroprusside decomposition",
    a:"toxic",
    p:100,
    note:"Toxic intermediate formed during infusion; risk rises with high dose, prolonged infusion, hepatic impairment, or low sulfur donor capacity.",
    evidenceRefs:["ev_nitroprusside_cyanide_label"]
  },
  {
    n:"Thiocyanate",
    e:"Thiosulfate sulfurtransferase",
    a:"toxic",
    p:80,
    note:"Detoxification product that can accumulate in renal impairment or prolonged infusion.",
    evidenceRefs:["ev_nitroprusside_cyanide_label"]
  }
],
"Dexmethylphenidate":[
  {
    n:"Ritalinic acid",
    e:"CES1A1",
    a:"inactive",
    p:80,
    note:"Primary inactive hydrolysis product. Dexmethylphenidate is not a CYP prodrug; MAOI contraindication is pharmacodynamic.",
    evidenceRefs:["ev_dexmethylphenidate_label","ev_stimulant_maoi_fda"]
  }
],
"Potassium Chloride":[
  {
    n:"Serum potassium load",
    e:"Renal potassium handling",
    a:"active",
    p:100,
    note:"Not metabolized. Captures supplement-driven potassium load that combines with RAAS blockade, MRAs, trimethoprim, NSAIDs, or renal impairment.",
    evidenceRefs:["ev_potassium_hyperkalemia_label"]
  }
],
"Desipramine":[
  {
    n:"2-Hydroxydesipramine",
    e:"CYP2D6",
    a:"inactive",
    p:75,
    note:"Primary oxidative clearance route. CYP2D6 poor metabolism or strong CYP2D6 inhibition raises parent desipramine and anticholinergic/QT toxicity risk.",
    evidenceRefs:["ev_tca_cyp2d6_cpic"]
  }
],
"Trimipramine":[
  {
    n:"Desmethyltrimipramine",
    e:"CYP2D6/CYP2C19",
    a:"active",
    p:45,
    note:"Active metabolite family. CYP2D6/CYP2C19 poor function or inhibitors can raise parent/metabolite exposure and TCA adverse effects.",
    evidenceRefs:["ev_tca_cyp2d6_cpic"]
  },
  {
    n:"Hydroxytrimipramine metabolites",
    e:"CYP2D6",
    a:"inactive",
    p:30,
    note:"Secondary oxidative clearance route relevant to CYP2D6 phenotype and inhibitor phenoconversion.",
    evidenceRefs:["ev_tca_cyp2d6_cpic"]
  }
],
"Protriptyline":[
  {
    n:"Hydroxyprotriptyline metabolites",
    e:"CYP2D6",
    a:"inactive",
    p:60,
    note:"CYP2D6-linked oxidative clearance. Parent protriptyline has long persistence, so CYP2D6 inhibition can produce delayed toxicity.",
    evidenceRefs:["ev_tca_cyp2d6_cpic"]
  }
],
"Iloperidone":[
  {
    n:"P88 metabolite",
    e:"CYP2D6",
    a:"active",
    p:45,
    note:"Active iloperidone metabolite. CYP2D6 poor metabolism changes active-moiety balance and can increase QT/orthostatic adverse effects.",
    evidenceRefs:["ev_antipsychotic_cyp2d6_labels"]
  },
  {
    n:"P95 metabolite",
    e:"CYP3A4",
    a:"active",
    p:45,
    note:"Active metabolite formed through CYP3A4-linked pathways; CYP3A inhibitors add to CYP2D6 phenotype risk.",
    evidenceRefs:["ev_antipsychotic_cyp2d6_labels"]
  }
],
"Pimavanserin":[
  {
    n:"AC-279 active metabolite",
    e:"CYP3A4/CYP3A5",
    a:"active",
    p:60,
    note:"Major active metabolite with similar receptor profile. CYP3A inhibitors raise parent and metabolite exposure, increasing QT/sedation risk."
  }
],
"Delamanid":[
  {
    n:"DM-6705",
    e:"Albumin/CYP3A4",
    a:"active",
    p:35,
    note:"Key metabolite associated with QT prolongation signal. Exposure can rise with CYP3A inhibition and adds to other QT-risk TB drugs."
  },
  {
    n:"Delamanid albumin-derived metabolites",
    e:"Albumin metabolism",
    a:"inactive",
    p:45,
    note:"Non-CYP metabolism is important, but CYP3A context remains clinically relevant for exposure and QT monitoring."
  }
],
"Tenofovir Alafenamide":[
  {
    n:"Tenofovir",
    e:"Cathepsin A/CES1 activation",
    a:"active_form",
    role:"active_form",
    p:80,
    note:"Active intracellular tenofovir delivery pathway. P-gp/BCRP inducers can lower prodrug exposure before activation."
  },
  {
    n:"Tenofovir diphosphate",
    e:"Intracellular phosphorylation",
    a:"active",
    p:100,
    note:"Pharmacologically active nucleotide analog. Not CYP-cleared; transporter induction and renal function shape clinical exposure context."
  }
],
"Darunavir":[
  {n:"Darunavir oxidative metabolites",e:"CYP3A4",a:"inactive",p:80,note:"Parent darunavir is the antiviral active moiety. Ritonavir/cobicistat boosting and CYP3A induction determine exposure more than active metabolite formation.",evidenceRefs:["ev_darunavir_boosted_cyp3a_label"]},
  {n:"Unchanged darunavir",e:"Biliary/Fecal elimination",a:"active",p:20,note:"Residual active parent elimination. Included so boosted PI interactions are treated as parent-exposure changes, not active-metabolite activation.",evidenceRefs:["ev_darunavir_boosted_cyp3a_label"]}
],
"Rilpivirine":[
  {n:"Rilpivirine oxidative metabolites",e:"CYP3A4",a:"inactive",p:75,note:"CYP3A-mediated clearance. Strong inducers lower parent exposure; acid suppression lowers absorption before metabolism.",evidenceRefs:["ev_rilpivirine_acid_cyp3a_qt_label"]},
  {n:"Unchanged rilpivirine",e:"Biliary/Fecal elimination",a:"active",p:25,note:"Parent rilpivirine drives antiviral activity and QT exposure context.",evidenceRefs:["ev_rilpivirine_acid_cyp3a_qt_label"]}
],
"Bictegravir":[
  {n:"Bictegravir glucuronide/oxidative metabolites",e:"UGT1A1/CYP3A4",a:"inactive",p:70,note:"Dual UGT1A1/CYP3A clearance. Rifampin-like induction can lower exposure, while cations reduce absorption before clearance pathways matter.",evidenceRefs:["ev_bictegravir_cation_induction_label"]},
  {n:"Unchanged bictegravir",e:"Fecal/Renal elimination",a:"active",p:30,note:"Active parent exposure is the relevant antiviral signal.",evidenceRefs:["ev_bictegravir_cation_induction_label"]}
],
"Lamivudine":[
  {n:"Lamivudine unchanged",e:"Renal tubular secretion",a:"active",p:70,note:"Clinically relevant active parent renal elimination. Trimethoprim-like renal transporter effects can increase exposure.",evidenceRefs:["ev_lamivudine_renal_transport_label"]},
  {n:"Lamivudine trans-sulfoxide",e:"Minor oxidation",a:"inactive",p:5,note:"Minor inactive metabolite; renal parent clearance dominates the interaction profile.",evidenceRefs:["ev_lamivudine_renal_transport_label"]}
],
"Emtricitabine":[
  {n:"Emtricitabine unchanged",e:"Renal tubular secretion",a:"active",p:85,note:"Active parent renal elimination dominates; minimal CYP burden.",evidenceRefs:["ev_taf_pgp_induction_label"]},
  {n:"Emtricitabine sulfoxide/glucuronide metabolites",e:"Oxidation/Glucuronidation",a:"inactive",p:15,note:"Minor inactive metabolites included to make the low-metabolism NRTI profile explicit.",evidenceRefs:["ev_taf_pgp_induction_label"]}
],
"Flucytosine":[
  {n:"Flucytosine unchanged",e:"Renal excretion",a:"active",p:90,note:"Active parent is cleared renally; amphotericin-related renal impairment can raise concentration-dependent marrow/GI/hepatic toxicity.",evidenceRefs:["ev_flucytosine_amphotericin_label"]},
  {n:"5-fluorouracil microbial conversion",e:"Gut microbial deamination",a:"toxic",p:1,note:"Minor/non-human conversion pathway discussed historically; systemic toxicity modeling should rely on measured flucytosine levels.",evidenceRefs:["ev_flucytosine_amphotericin_label"]}
],
"Amphotericin B":[
  {n:"Amphotericin B tissue-bound parent",e:"Tissue distribution",a:"active",p:80,t:24,note:"Active parent persists in tissues; nephrotoxicity and electrolyte wasting are the main interaction mechanisms rather than CYP metabolism.",evidenceRefs:["ev_flucytosine_amphotericin_label"]},
  {n:"Renal tubular toxicity signal",e:"Renal toxicity mechanism",a:"toxic",p:20,note:"Functional toxicity pathway included because it can reduce clearance of renally eliminated companion drugs such as flucytosine.",evidenceRefs:["ev_flucytosine_amphotericin_label"]}
],
"Olaparib":[
  {n:"Olaparib oxidative metabolites",e:"CYP3A4",a:"inactive",p:85,note:"CYP3A clearance route. Strong inhibitors increase parent exposure and strong inducers lower active parent exposure.",evidenceRefs:["ev_olaparib_cyp3a_label"]},
  {n:"Unchanged olaparib",e:"Renal/Fecal elimination",a:"active",p:15,note:"Parent olaparib is the PARP-inhibiting active moiety.",evidenceRefs:["ev_olaparib_cyp3a_label"]}
],
"Rucaparib":[
  {n:"Rucaparib oxidative metabolites",e:"CYP2D6/CYP1A2/CYP3A4",a:"inactive",p:60,note:"Multi-CYP metabolism. The clinically important signal also includes rucaparib inhibition of CYP1A2/CYP2C9/CYP2C19/CYP3A substrates.",evidenceRefs:["ev_rucaparib_cyp_substrate_label"]},
  {n:"Unchanged rucaparib",e:"Renal/Fecal elimination",a:"active",p:40,note:"Parent rucaparib drives PARP inhibition and victim-drug CYP inhibition.",evidenceRefs:["ev_rucaparib_cyp_substrate_label"]}
],
"Niraparib":[
  {n:"Niraparib carboxylic acid metabolite",e:"Carboxylesterase hydrolysis",a:"inactive",p:75,note:"Major non-CYP clearance product. Myelosuppression and hypertension monitoring are more actionable than CYP genotype.",evidenceRefs:["ev_parp_transporter_myelosuppression_label"]},
  {n:"Unchanged niraparib",e:"Renal/Fecal elimination",a:"active",p:25,note:"Parent niraparib is the active PARP inhibitor.",evidenceRefs:["ev_parp_transporter_myelosuppression_label"]}
],
"Talazoparib":[
  {n:"Talazoparib unchanged",e:"Renal excretion/P-gp-BCRP transport",a:"active",p:70,note:"Parent talazoparib is mostly unchanged; P-gp/BCRP inhibition and renal impairment can raise exposure.",evidenceRefs:["ev_parp_transporter_myelosuppression_label"]},
  {n:"Talazoparib minor oxidative metabolites",e:"Oxidation",a:"inactive",p:10,note:"Minor inactive pathway; transporter and renal clearance are the clinically relevant routes.",evidenceRefs:["ev_parp_transporter_myelosuppression_label"]}
],
"Romidepsin":[
  {n:"Romidepsin reduced thiol active form",e:"Intracellular reduction",a:"active_form",role:"active_form",p:80,note:"Romidepsin is activated intracellularly by reduction of its disulfide bond; CYP3A affects parent exposure before activation.",evidenceRefs:["ev_romidepsin_cyp3a_qt_warfarin_label"]},
  {n:"Romidepsin oxidative metabolites",e:"CYP3A4",a:"inactive",p:60,note:"Clearance route susceptible to strong CYP3A inhibitors/inducers.",evidenceRefs:["ev_romidepsin_cyp3a_qt_warfarin_label"]}
],
"Abiraterone":[
  {n:"Abiraterone sulfate",e:"SULT2A1",a:"inactive",p:35,note:"Major conjugated metabolite. Parent abiraterone drives CYP17 inhibition and CYP2D6/CYP2C8 inhibition.",evidenceRefs:["ev_abiraterone_cyp2d6_cyp2c8_label"]},
  {n:"N-oxide abiraterone sulfate",e:"CYP3A4/SULT2A1",a:"inactive",p:25,note:"Inactive downstream metabolite; mineralocorticoid toxicity and CYP2D6/CYP2C8 victim interactions remain the clinical focus.",evidenceRefs:["ev_abiraterone_cyp2d6_cyp2c8_label"]}
],
"Belinostat":[
  {n:"Belinostat glucuronide",e:"UGT1A1",a:"inactive",p:80,note:"Major clearance product. UGT1A1 poor function can increase belinostat exposure and myelosuppression/hepatic toxicity risk.",evidenceRefs:["ev_parp_transporter_myelosuppression_label"]},
  {n:"Unchanged belinostat",e:"Renal/Fecal elimination",a:"active",p:20,note:"Parent belinostat is the active HDAC inhibitor.",evidenceRefs:["ev_parp_transporter_myelosuppression_label"]}
],
"Darolutamide":[
  {n:"Keto-darolutamide",e:"CYP3A4/UGT1A9",a:"active",p:45,note:"Major active metabolite with similar androgen receptor activity. Transporter inhibition can raise rosuvastatin exposure.",evidenceRefs:["ev_darolutamide_bcrp_label"]},
  {n:"Darolutamide glucuronide products",e:"UGT1A9",a:"inactive",p:35,note:"Inactive conjugation products; parent plus keto-darolutamide form the active moiety.",evidenceRefs:["ev_darolutamide_bcrp_label"]}
],
"Clorazepate":[
  {n:"Nordiazepam (desmethyldiazepam)",e:"Acid decarboxylation",a:"active_form",role:"active_form",p:80,t:80,note:"Long-lived active benzodiazepine metabolite. This is the main sedative/fall-risk exposure, not parent clorazepate.",evidenceRefs:["ev_clorazepate_nordiazepam_label"]},
  {n:"Oxazepam",e:"CYP2C19",a:"active",p:20,t:8,note:"Downstream active benzodiazepine metabolite; CYP3A and glucuronidation also contribute, but CYP2C19 is the audit-visible route.",evidenceRefs:["ev_clorazepate_nordiazepam_label"]}
],
"Midodrine":[
  {n:"Desglymidodrine",e:"Esterase activation",a:"active_form",role:"active_form",p:80,t:3,note:"Active alpha-1 agonist responsible for pressor effect and supine hypertension risk.",evidenceRefs:["ev_midodrine_desglymidodrine_label"]},
  {n:"Inactive polar metabolites",e:"Renal excretion",a:"inactive",p:20,note:"Renal function affects active-metabolite exposure and dosing safety.",evidenceRefs:["ev_midodrine_desglymidodrine_label"]}
],
"Droxidopa":[
  {n:"Norepinephrine",e:"DOPA decarboxylase",a:"active_form",role:"active_form",p:80,t:2,note:"Active catecholamine formed from droxidopa. MAOI/COMT and other pressor contexts can amplify hypertensive risk.",evidenceRefs:["ev_droxidopa_norepinephrine_label"]},
  {n:"DOPAC/HVA catechol metabolites",e:"MAO/COMT",a:"inactive",p:15,note:"Catecholamine breakdown products; MAOI/COMT inhibitors can alter catecholamine tone rather than simple parent-drug clearance.",evidenceRefs:["ev_droxidopa_norepinephrine_label"]}
],
"Nitazoxanide":[
  {n:"Tizoxanide",e:"Esterase hydrolysis",a:"active_form",role:"active_form",p:90,t:1.5,note:"Active thiazolide formed rapidly after absorption; highly protein-bound and then glucuronidated.",evidenceRefs:["ev_nitazoxanide_tizoxanide_label"]},
  {n:"Tizoxanide glucuronide",e:"UGT glucuronidation",a:"inactive",p:80,note:"Major inactive conjugate; low CYP burden.",evidenceRefs:["ev_nitazoxanide_tizoxanide_label"]}
],
"Dipyridamole":[
  {n:"Dipyridamole glucuronides",e:"Glucuronidation",a:"inactive",p:80,note:"Main clearance route. Interaction relevance is additive antiplatelet/vasodilator effect rather than CYP inhibition.",evidenceRefs:["ev_dipyridamole_antiplatelet_label"]},
  {n:"Unchanged dipyridamole",e:"Biliary elimination",a:"active",p:20,note:"Parent dipyridamole drives antiplatelet and vasodilator effect.",evidenceRefs:["ev_dipyridamole_antiplatelet_label"]}
],
"Artemether/Lumefantrine":[
  {n:"Dihydroartemisinin",e:"CYP3A4/CYP2B6",a:"active",p:40,t:1,note:"Active artemether metabolite. Strong inducers can reduce antimalarial exposure and treatment response.",evidenceRefs:["ev_artemether_lumefantrine_cyp3a_qt_label"]},
  {n:"Desbutyl-lumefantrine",e:"CYP3A4",a:"active",p:10,t:96,note:"Active lumefantrine metabolite; lumefantrine exposure is long-lived and QT/food context matters.",evidenceRefs:["ev_artemether_lumefantrine_cyp3a_qt_label"]},
  {n:"Unchanged lumefantrine",e:"CYP3A4",a:"active",p:80,t:96,note:"Parent lumefantrine is long-lived; food increases absorption while CYP3A inducers can lower exposure.",evidenceRefs:["ev_artemether_lumefantrine_cyp3a_qt_label"]}
],
"Praziquantel":[
  {n:"Hydroxypraziquantel metabolites",e:"CYP3A4",a:"inactive",p:80,note:"Primary oxidative clearance route. Rifampin-like CYP3A induction can markedly lower parent praziquantel exposure.",evidenceRefs:["ev_praziquantel_label"]},
  {n:"Unchanged praziquantel",e:"CYP3A4",a:"active",p:20,note:"Parent praziquantel is the active antiparasitic exposure; food and induction context matter.",evidenceRefs:["ev_praziquantel_label"]}
],
"Argatroban":[
  {n:"Argatroban hydroxylated metabolites",e:"CYP3A4",a:"weak",p:20,note:"Minor metabolites with substantially lower thrombin-inhibitory activity than parent.",evidenceRefs:["ev_argatroban_bleeding_label"]},
  {n:"Unchanged argatroban",e:"Biliary clearance",a:"active",p:80,note:"Parent direct thrombin inhibitor drives anticoagulation; hepatic function and antithrombotic co-use dominate risk.",evidenceRefs:["ev_argatroban_bleeding_label"]}
],
"Cilostazol":[
  {
    n:"3,4-Dehydro-cilostazol",
    e:"CYP3A4",
    a:"active",
    p:35,
    note:"Major active metabolite with higher PDE3 inhibitory potency than parent in label pharmacology. CYP3A inhibitors raise parent/active-moiety exposure, so dose reduction matters.",
    evidenceRefs:["ev_cilostazol_cyp_inhibitor_label"]
  },
  {
    n:"4'-trans-Hydroxy-cilostazol",
    e:"CYP2C19",
    a:"active",
    p:20,
    note:"Active metabolite with lower potency than parent. CYP2C19 inhibition, including omeprazole/fluconazole-like contexts, can change the active-metabolite exposure pattern.",
    evidenceRefs:["ev_cilostazol_cyp_inhibitor_label"]
  },
  {
    n:"Inactive oxidative metabolites",
    e:"CYP3A4/CYP2C19",
    a:"inactive",
    p:45,
    note:"Background oxidative clearance route. Included to keep inhibitor effects framed as parent plus active-metabolite exposure, not a simple parent-only CYP interaction.",
    evidenceRefs:["ev_cilostazol_cyp_inhibitor_label"]
  }
],
"Enzalutamide":[
  {
    n:"N-desmethyl enzalutamide",
    e:"CYP2C8/CYP3A4",
    a:"active",
    p:70,
    note:"Major active metabolite contributing to the active moiety. Induction effects are clinically important both for victim drugs and for enzalutamide exposure changes.",
    evidenceRefs:["ev_enzalutamide_induction_label"]
  },
  {
    n:"Inactive carboxylic acid metabolite",
    e:"Carboxylesterase/oxidation",
    a:"inactive",
    p:30,
    note:"Inactive downstream metabolite. Included to separate active-moiety persistence from clearance into inactive products.",
    evidenceRefs:["ev_enzalutamide_induction_label"]
  }
],
"Apalutamide":[
  {
    n:"N-desmethyl apalutamide",
    e:"CYP2C8/CYP3A4",
    a:"active",
    p:70,
    note:"Major active metabolite with clinically relevant androgen-receptor activity. The parent/metabolite active moiety persists while induction lowers many victim-drug exposures.",
    evidenceRefs:["ev_apalutamide_induction_label"]
  },
  {
    n:"Inactive oxidative metabolites",
    e:"CYP2C8/CYP3A4",
    a:"inactive",
    p:30,
    note:"Inactive clearance products. Included so the model does not treat apalutamide as a simple parent-only inducer.",
    evidenceRefs:["ev_apalutamide_induction_label"]
  }
],
"Lorlatinib":[
  {
    n:"M8 benzoic acid metabolite",
    e:"CYP3A4/UGT1A4",
    a:"inactive",
    p:60,
    note:"Major inactive circulating metabolite. Strong CYP3A inducer co-use is clinically distinct because it can cause serious hepatotoxicity, not just lower parent exposure.",
    evidenceRefs:["ev_lorlatinib_cyp3a_label"]
  },
  {
    n:"Unchanged lorlatinib active moiety",
    e:"CYP3A4/UGT1A4 clearance",
    a:"active",
    p:40,
    note:"Parent lorlatinib drives ALK/ROS1 inhibition and also induces CYP3A, which can lower sensitive CYP3A victim drugs.",
    evidenceRefs:["ev_lorlatinib_cyp3a_label"]
  }
],
"Crizotinib":[
  {
    n:"Crizotinib oxidative/lactam metabolites",
    e:"CYP3A4",
    a:"inactive",
    p:70,
    note:"CYP3A-mediated clearance pathway. Parent crizotinib is the main active exposure, so strong CYP3A inhibitors or inducers can shift QT, bradycardia, and hepatic toxicity risk."
  },
  {
    n:"Unchanged crizotinib",
    e:"Biliary/Fecal elimination",
    a:"active",
    p:20,
    note:"Residual active parent elimination. Included to keep the model from treating CYP3A metabolites as the sole clinical signal."
  }
],
"Alectinib":[
  {
    n:"M4 active metabolite",
    e:"CYP3A4",
    a:"active",
    p:45,
    note:"Major active metabolite with similar ALK inhibition. CYP3A inhibitors or inducers can shift parent/M4 balance, but label data show limited net active-moiety change; food is the bigger exposure signal.",
    evidenceRefs:["ev_alectinib_m4_food_label"]
  },
  {
    n:"Alectinib unchanged active parent",
    e:"CYP3A4",
    a:"active",
    p:55,
    note:"Parent and M4 together form the active moiety. The label recommends dosing with food because food strongly raises combined exposure.",
    evidenceRefs:["ev_alectinib_m4_food_label"]
  }
],
"Brigatinib":[
  {
    n:"Brigatinib inactive oxidative metabolites",
    e:"CYP3A4",
    a:"inactive",
    p:70,
    note:"CYP3A-mediated clearance pathway. Strong inhibitors increase parent exposure; strong inducers can markedly reduce exposure and efficacy.",
    evidenceRefs:["ev_brigatinib_cyp3a_label"]
  },
  {
    n:"Brigatinib unchanged active parent",
    e:"CYP3A4",
    a:"active",
    p:30,
    note:"Parent brigatinib is the main ALK-inhibitory exposure signal; toxicity monitoring includes pulmonary, blood pressure, bradycardia, hepatic, and CPK effects.",
    evidenceRefs:["ev_brigatinib_cyp3a_label"]
  }
],
"Capmatinib":[
  {
    n:"Capmatinib oxidative metabolites",
    e:"CYP3A4",
    a:"inactive",
    p:50,
    note:"CYP3A contributes to clearance; strong CYP3A inducers can substantially lower parent capmatinib exposure.",
    evidenceRefs:["ev_capmatinib_cyp3a_transporter_label"]
  },
  {
    n:"Aldehyde oxidase metabolites",
    e:"Aldehyde Oxidase",
    a:"inactive",
    p:35,
    note:"Non-CYP clearance route. Capmatinib also inhibits P-gp/BCRP, so victim-drug interactions can matter even when parent metabolism is not the whole story.",
    evidenceRefs:["ev_capmatinib_cyp3a_transporter_label"]
  }
],
"Sunitinib":[
  {
    n:"N-desethyl sunitinib (SU12662)",
    e:"CYP3A4",
    a:"active",
    p:40,
    note:"Primary active metabolite with similar kinase inhibition. CYP3A inhibition or induction changes total active exposure and can affect QT, blood pressure, hepatic, and tolerability risk.",
    evidenceRefs:["ev_sunitinib_cyp3a_qt_label"]
  },
  {
    n:"Sunitinib unchanged active parent",
    e:"CYP3A4",
    a:"active",
    p:60,
    note:"Parent plus active metabolite form the clinically relevant active moiety; dose adjustment is label-guided with strong CYP3A modifiers.",
    evidenceRefs:["ev_sunitinib_cyp3a_qt_label"]
  }
],
"Sorafenib":[
  {
    n:"Sorafenib N-oxide",
    e:"CYP3A4",
    a:"active",
    p:15,
    note:"Active oxidative metabolite. Sorafenib is also glucuronidated by UGT1A9, and label management is driven by parent exposure, bleeding/INR, hypertension, liver injury, and QT context.",
    evidenceRefs:["ev_sorafenib_cyp_ugt_warfarin_label"]
  },
  {
    n:"Sorafenib glucuronides",
    e:"UGT1A9",
    a:"inactive",
    p:35,
    note:"Glucuronidation contributes meaningfully to clearance; strong induction can reduce exposure and warfarin/bleeding monitoring is label-relevant.",
    evidenceRefs:["ev_sorafenib_cyp_ugt_warfarin_label"]
  }
],
"Lenvatinib":[
  {
    n:"Lenvatinib unchanged active parent",
    e:"CYP3A4/Aldehyde Oxidase/Nonenzymatic",
    a:"active",
    p:70,
    note:"Multiple clearance pathways mean CYP3A modifiers have modest average effects; hypertension, proteinuria, hepatic toxicity, and QT-risk co-medications dominate clinical handling.",
    evidenceRefs:["ev_lenvatinib_qt_label"]
  },
  {
    n:"Inactive oxidative/nonenzymatic metabolites",
    e:"CYP3A4/Aldehyde Oxidase",
    a:"inactive",
    p:30,
    note:"Included to avoid a parent-only simplification while preserving that QT/hypertension toxicity is the primary actionable signal.",
    evidenceRefs:["ev_lenvatinib_qt_label"]
  }
],
"Regorafenib":[
  {
    n:"M-2 active metabolite",
    e:"CYP3A4/UGT1A9",
    a:"active",
    p:30,
    note:"Active metabolite. Strong CYP3A inhibition can lower active metabolite exposure while increasing parent regorafenib, so parent-only DDI interpretation is misleading.",
    evidenceRefs:["ev_regorafenib_cyp3a_ugt_bcrp_label"]
  },
  {
    n:"M-5 active metabolite",
    e:"CYP3A4/UGT1A9",
    a:"active",
    p:25,
    note:"Active metabolite contributing to the active moiety and transporter inhibition context. Regorafenib also inhibits BCRP substrates.",
    evidenceRefs:["ev_regorafenib_cyp3a_ugt_bcrp_label"]
  },
  {
    n:"Regorafenib unchanged active parent",
    e:"CYP3A4/UGT1A9",
    a:"active",
    p:45,
    note:"Parent exposure increases with strong CYP3A inhibition and falls with strong induction; hepatotoxicity and BCRP substrate interactions are clinically important.",
    evidenceRefs:["ev_regorafenib_cyp3a_ugt_bcrp_label"]
  }
],
"Axitinib":[
  {
    n:"Axitinib oxidative metabolites",
    e:"CYP3A4/CYP1A2",
    a:"inactive",
    p:80,
    note:"CYP3A4/5 dominates axitinib clearance, with minor CYP1A2 contribution. Strong CYP3A inhibition or induction can materially change parent exposure.",
    evidenceRefs:["ev_axitinib_cyp3a_label"]
  },
  {
    n:"Axitinib unchanged active parent",
    e:"CYP3A4",
    a:"active",
    p:20,
    note:"Parent axitinib drives VEGFR inhibition and concentration-linked hypertension/hepatic/toxicity monitoring.",
    evidenceRefs:["ev_axitinib_cyp3a_label"]
  }
],
"Lumateperone":[
  {
    n:"Lumateperone reduced/oxidative metabolites",
    e:"CYP3A4/UGT/AKR",
    a:"inactive",
    p:70,
    note:"Multiple pathways contribute, but CYP3A inhibition or induction is the clearest label-backed interaction signal.",
    evidenceRefs:["ev_lumateperone_cyp3a_label"]
  },
  {
    n:"Lumateperone unchanged active parent",
    e:"CYP3A4/UGT",
    a:"active",
    p:30,
    note:"Parent antipsychotic exposure drives efficacy and tolerability; label dose reduction is required with strong CYP3A inhibition.",
    evidenceRefs:["ev_lumateperone_cyp3a_label"]
  }
],
"Levomilnacipran":[
  {
    n:"Levomilnacipran unchanged renal elimination",
    e:"Renal",
    a:"active",
    p:58,
    note:"Renal excretion is a major elimination pathway; renal impairment can increase exposure independently of CYP3A.",
    evidenceRefs:["ev_levomilnacipran_cyp3a_renal_label"]
  },
  {
    n:"Desethyl levomilnacipran and inactive metabolites",
    e:"CYP3A4",
    a:"inactive",
    p:42,
    note:"CYP3A4 contributes to metabolism, so strong CYP3A inhibitors cap the recommended maximum dose.",
    evidenceRefs:["ev_levomilnacipran_cyp3a_renal_label"]
  }
],
"Asenapine":[
  {
    n:"Asenapine N-glucuronide",
    e:"UGT1A4",
    a:"inactive",
    p:50,
    note:"Primary conjugation pathway. Smoking/CYP1A2 context is less dominant than with clozapine/olanzapine, but CYP1A2 inhibition can still shift exposure.",
    evidenceRefs:["ev_asenapine_ugt1a4_cyp1a2_label"]
  },
  {
    n:"N-desmethyl asenapine and oxidative metabolites",
    e:"CYP1A2",
    a:"inactive",
    p:35,
    note:"CYP1A2 oxidative clearance pathway; fluvoxamine co-use is the practical label-backed exposure concern.",
    evidenceRefs:["ev_asenapine_ugt1a4_cyp1a2_label"]
  }
],
"Vorapaxar":[
  {
    n:"M20 hydroxy metabolite",
    e:"CYP3A4",
    a:"active",
    p:60,
    note:"Major circulating active metabolite. CYP3A inhibition or induction can matter because PAR-1 platelet inhibition persists for a long time after exposure changes."
  },
  {
    n:"M19 amine metabolite",
    e:"CYP3A4",
    a:"inactive",
    p:20,
    note:"Secondary CYP3A-linked metabolite. Bleeding risk is driven mainly by the active parent/active-moiety antiplatelet effect."
  }
],
"Maribavir":[
  {
    n:"Maribavir unchanged parent",
    e:"CYP3A4",
    a:"active",
    p:70,
    note:"Parent drug drives CMV UL97 inhibition and P-gp/BCRP victim-drug interactions. Strong CYP3A induction lowers active parent exposure.",
    evidenceRefs:["ev_maribavir_label"]
  },
  {
    n:"Minor inactive oxidative metabolites",
    e:"CYP3A4",
    a:"inactive",
    p:30,
    note:"Included to avoid treating maribavir as a parent-only actor; the clinically important signal remains parent exposure and UL97 antagonism of ganciclovir activation.",
    evidenceRefs:["ev_maribavir_label"]
  }
],
"Letermovir":[
  {
    n:"Letermovir unchanged parent",
    e:"OATP/biliary transport",
    a:"active",
    p:65,
    note:"Parent letermovir is the active CMV terminase inhibitor and clinically relevant CYP3A/OATP interaction actor; cyclosporine substantially changes exposure context.",
    evidenceRefs:["ev_letermovir_immunosuppressant_label"]
  },
  {
    n:"Letermovir acyl glucuronide",
    e:"UGT1A1/UGT1A3",
    a:"inactive",
    p:35,
    note:"Glucuronidation contributes to clearance, but transplant risk is driven mainly by parent letermovir, cyclosporine, tacrolimus, sirolimus, and statin transporter/CYP interactions.",
    evidenceRefs:["ev_letermovir_immunosuppressant_label"]
  }
],
"Valganciclovir":[
  {
    n:"Ganciclovir",
    e:"Esterases",
    a:"active_form",
    role:"active_form",
    p:90,
    note:"Valganciclovir is an oral prodrug rapidly converted to ganciclovir. The active moiety then requires intracellular/viral phosphorylation; renal function and marrow reserve dominate safety.",
    evidenceRefs:["ev_valganciclovir_label"]
  },
  {
    n:"Valganciclovir unchanged",
    e:"Renal",
    a:"active_form_precursor",
    p:10,
    note:"Residual prodrug exposure; included so prodrug conversion and renal clearance are visible in metabolite-aware views.",
    evidenceRefs:["ev_valganciclovir_label"]
  }
],
"Ganciclovir":[
  {
    n:"Ganciclovir triphosphate",
    e:"Viral UL97 phosphorylation / cellular kinases",
    a:"active",
    p:15,
    note:"Intracellular active antiviral nucleotide. Maribavir inhibits UL97, which can antagonize ganciclovir activation despite unchanged parent pharmacokinetics.",
    evidenceRefs:["ev_valganciclovir_label","ev_maribavir_label"]
  },
  {
    n:"Ganciclovir unchanged renal elimination",
    e:"Renal",
    a:"active",
    p:85,
    note:"Renal clearance drives dose adjustment and accumulation risk; marrow toxicity is additive with other myelosuppressive drugs.",
    evidenceRefs:["ev_valganciclovir_label"]
  }
],
"Zidovudine":[
  {
    n:"Zidovudine glucuronide",
    e:"UGT2B7",
    a:"inactive",
    p:75,
    note:"Major inactive clearance metabolite. The key interaction signal in this dataset is additive marrow suppression with ganciclovir/valganciclovir rather than CYP competition.",
    evidenceRefs:["ev_valganciclovir_label"]
  },
  {
    n:"Zidovudine triphosphate",
    e:"Intracellular kinases",
    a:"active",
    p:5,
    note:"Active NRTI triphosphate. Included to distinguish intracellular activation from systemic glucuronidation and marrow toxicity.",
    evidenceRefs:["ev_valganciclovir_label"]
  }
],
"Bedaquiline":[
  {
    n:"N-desmethyl bedaquiline (M2)",
    e:"CYP3A4",
    a:"active",
    p:45,
    note:"Major metabolite with lower antimycobacterial activity but relevant QT and toxicity context. Strong CYP3A induction reduces bedaquiline exposure; inhibition can increase long-half-life exposure burden.",
    evidenceRefs:["ev_bedaquiline_label"]
  },
  {
    n:"Bedaquiline unchanged active parent",
    e:"CYP3A4",
    a:"active",
    p:55,
    note:"Parent drug is the main MDR-TB efficacy signal and has a very long terminal half-life, making induction, inhibition, and additive QT combinations clinically important.",
    evidenceRefs:["ev_bedaquiline_label"]
  }
],
"Heparin":[
  {
    n:"Heparin reticuloendothelial/protein-bound clearance",
    e:"Reticuloendothelial uptake",
    a:"active",
    p:65,
    note:"No CYP metabolism. Procedural risk is pharmacodynamic bleeding and thrombocytopenia, especially with potent antiplatelets.",
    evidenceRefs:["ev_gpiibiiia_bleeding_label"]
  },
  {
    n:"Heparin renal clearance component",
    e:"Renal",
    a:"active",
    p:25,
    note:"Renal contribution is secondary for unfractionated heparin; monitoring is protocol and response based.",
    evidenceRefs:["ev_gpiibiiia_bleeding_label"]
  }
],
"Fondaparinux":[
  {
    n:"Fondaparinux unchanged renal elimination",
    e:"Renal",
    a:"active",
    p:90,
    note:"No CYP metabolism. Renal function and additive antiplatelet/anticoagulant bleeding risk dominate clinical handling.",
    evidenceRefs:["ev_fondaparinux_bleeding_label"]
  }
],
"Eptifibatide":[
  {
    n:"Eptifibatide unchanged renal elimination",
    e:"Renal",
    a:"active",
    p:50,
    note:"No CYP metabolism. Renal function and concurrent heparin/antithrombotic intensity drive procedural bleeding risk.",
    evidenceRefs:["ev_gpiibiiia_bleeding_label"]
  }
],
"Tirofiban":[
  {
    n:"Tirofiban unchanged renal elimination",
    e:"Renal",
    a:"active",
    p:65,
    note:"No CYP metabolism. The main actionable context is renal dosing plus additive procedural bleeding with heparin and other antithrombotics.",
    evidenceRefs:["ev_gpiibiiia_bleeding_label"]
  }
],
"Abciximab":[
  {
    n:"Platelet-bound abciximab active moiety",
    e:"Platelet binding / reticuloendothelial clearance",
    a:"active",
    p:90,
    note:"Monoclonal Fab with prolonged platelet-bound effect. The important signal is pharmacodynamic platelet inhibition, thrombocytopenia, and bleeding with heparin/procedural anticoagulation.",
    evidenceRefs:["ev_gpiibiiia_bleeding_label"]
  }
],
"Albendazole":[
  {
    n:"Albendazole sulfoxide",
    e:"CYP3A4/FMO",
    a:"active",
    p:70,
    note:"Primary active anthelmintic metabolite. Dexamethasone, praziquantel, and cimetidine can increase active sulfoxide exposure, so prolonged therapy needs liver/CBC monitoring.",
    evidenceRefs:["ev_albendazole_active_sulfoxide_label"]
  },
  {
    n:"Albendazole sulfone",
    e:"CYP3A4",
    a:"inactive",
    p:25,
    note:"Further oxidation product. Included to keep albendazole modeled as an active-metabolite drug rather than a simple parent exposure.",
    evidenceRefs:["ev_albendazole_active_sulfoxide_label"]
  }
],
"Atovaquone":[
  {
    n:"Atovaquone unchanged biliary/fecal elimination",
    e:"Biliary/Fecal",
    a:"active",
    p:94,
    note:"Atovaquone is largely eliminated unchanged; exposure depends strongly on food and is reduced by rifampin/rifabutin, metoclopramide, and tetracycline-class coadministration.",
    evidenceRefs:["ev_atovaquone_food_label","ev_atovaquone_interactions_label","ev_malarone_label"]
  }
],
"Proguanil":[
  {
    n:"Cycloguanil",
    e:"CYP2C19",
    a:"active",
    p:45,
    note:"Active DHFR-inhibiting metabolite. CYP2C19 phenotype can alter formation, although atovaquone/proguanil efficacy is not reducible to this pathway alone.",
    evidenceRefs:["ev_malarone_label"]
  },
  {
    n:"4-chlorophenylbiguanide",
    e:"CYP2C19",
    a:"inactive",
    p:25,
    note:"Additional CYP2C19-linked proguanil metabolite; renal impairment can prolong proguanil/cycloguanil exposure in repeated dosing.",
    evidenceRefs:["ev_malarone_label"]
  }
],
"Griseofulvin":[
  {
    n:"6-desmethylgriseofulvin",
    e:"CYP3A4",
    a:"inactive",
    p:70,
    note:"Major oxidative metabolite. The clinical signal is older enzyme-inducer behavior that can lower warfarin and hormonal contraceptive effect.",
    evidenceRefs:["ev_griseofulvin_induction_label"]
  },
  {
    n:"Griseofulvin unchanged parent",
    e:"Biliary/Fecal",
    a:"active",
    p:30,
    note:"Absorption is improved by fatty meals; alcohol intolerance and photosensitivity/hepatic monitoring are practical counseling points.",
    evidenceRefs:["ev_griseofulvin_induction_label"]
  }
],
"Protamine Sulfate":[
  {n:"Protamine-heparin ion-pair complex",e:"Binding/reticuloendothelial clearance",a:"inactive",p:70,note:"Intentional complex that neutralizes heparin after bypass; excess protamine can itself impair coagulation and cause hemodynamic reactions.",evidenceRefs:["ev_cabg_perioperative_medications"]},
  {n:"Protamine peptide fragments",e:"Proteolytic degradation",a:"inactive",p:30,note:"Peptide/protein catabolism rather than CYP metabolism.",evidenceRefs:["ev_cabg_perioperative_medications"]}
],
"Tranexamic Acid":[
  {n:"Tranexamic acid (unchanged renal elimination)",e:"Renal",a:"active",p:90,note:"No meaningful metabolism; renal function determines exposure and high exposure can increase seizure risk.",evidenceRefs:["ev_cabg_perioperative_medications"]},
  {n:"Minor deaminated/acetylated metabolites",e:"Minor conjugation",a:"inactive",p:10,note:"Minor pathway; not a CYP-mediated interaction driver.",evidenceRefs:["ev_cabg_perioperative_medications"]}
],
"Aminocaproic Acid":[
  {n:"Aminocaproic acid (unchanged renal elimination)",e:"Renal",a:"active",p:80,note:"Renally cleared antifibrinolytic; accumulation increases toxicity risk in renal impairment.",evidenceRefs:["ev_cabg_perioperative_medications"]},
  {n:"Adipic acid metabolite",e:"Oxidative deamination",a:"inactive",p:15,note:"Minor non-CYP metabolic route.",evidenceRefs:["ev_cabg_perioperative_medications"]}
],
"Norepinephrine":[
  {n:"Normetanephrine",e:"COMT",a:"inactive",p:45,note:"Catecholamine methylation product; MAOI/COMT contexts alter catecholamine tone rather than classic CYP clearance.",evidenceRefs:["ev_cabg_perioperative_medications"]},
  {n:"Vanillylmandelic acid (VMA)",e:"MAO/COMT",a:"inactive",p:45,note:"Downstream urinary catecholamine metabolite.",evidenceRefs:["ev_cabg_perioperative_medications"]}
],
"Epinephrine":[
  {n:"Metanephrine",e:"COMT",a:"inactive",p:45,note:"Catecholamine methylation product; pressor interactions are pharmacodynamic.",evidenceRefs:["ev_cabg_perioperative_medications"]},
  {n:"Vanillylmandelic acid (VMA)",e:"MAO/COMT",a:"inactive",p:45,note:"Downstream urinary catecholamine metabolite.",evidenceRefs:["ev_cabg_perioperative_medications"]}
],
"Phenylephrine":[
  {n:"Phenylephrine sulfate",e:"Sulfation",a:"inactive",p:60,note:"Major conjugated metabolite; alpha-1 pressor interactions dominate clinical risk.",evidenceRefs:["ev_cabg_perioperative_medications"]},
  {n:"m-hydroxymandelic acid",e:"MAO",a:"inactive",p:20,note:"Minor oxidative metabolite.",evidenceRefs:["ev_cabg_perioperative_medications"]}
],
"Vasopressin":[
  {n:"Vasopressin peptide fragments",e:"Peptidase degradation",a:"inactive",p:80,note:"Peptide hormone degradation rather than CYP metabolism; V1 vasoconstriction is the interaction signal.",evidenceRefs:["ev_cabg_perioperative_medications"]},
  {n:"Vasopressin (renal/hepatic clearance)",e:"Renal/Hepatic",a:"active",p:20,note:"Short-lived active hormone cleared by tissue metabolism and organ clearance.",evidenceRefs:["ev_cabg_perioperative_medications"]}
],
"Dobutamine":[
  {n:"3-O-methyldobutamine",e:"COMT",a:"inactive",p:70,note:"Primary inactive catechol metabolite; beta-blockers can blunt parent inotropic response.",evidenceRefs:["ev_cabg_perioperative_medications"]},
  {n:"Dobutamine conjugates",e:"Conjugation",a:"inactive",p:20,note:"Conjugated metabolites; not a CYP interaction pathway.",evidenceRefs:["ev_cabg_perioperative_medications"]}
],
"Milrinone":[
  {n:"Milrinone (unchanged renal elimination)",e:"Renal",a:"active",p:85,note:"Renal clearance is the key exposure determinant; accumulation increases hypotension/arrhythmia risk.",evidenceRefs:["ev_cabg_perioperative_medications"]},
  {n:"O-glucuronide milrinone",e:"UGT",a:"inactive",p:15,note:"Minor conjugated metabolite.",evidenceRefs:["ev_cabg_perioperative_medications"]}
],
"Dopamine":[
  {n:"Homovanillic acid (HVA)",e:"MAO/COMT",a:"inactive",p:60,note:"Catecholamine breakdown product; tachyarrhythmia/pressor effects are parent pharmacodynamics.",evidenceRefs:["ev_cabg_perioperative_medications"]},
  {n:"DOPAC",e:"MAO",a:"inactive",p:25,note:"Intermediate dopamine metabolite.",evidenceRefs:["ev_cabg_perioperative_medications"]}
],
"Calcium Chloride":[
  {n:"Ionized calcium",e:"Electrolyte distribution",a:"active",p:100,note:"Not a metabolite: IV calcium increases available calcium immediately; line safety and arrhythmia context matter.",evidenceRefs:["ev_cabg_perioperative_medications"]}
],
"Calcium Gluconate":[
  {n:"Ionized calcium from calcium gluconate",e:"Electrolyte distribution",a:"active",p:100,note:"Not a metabolite: calcium availability depends on distribution and clinical context.",evidenceRefs:["ev_cabg_perioperative_medications"]}
],
"Magnesium Sulfate":[
  {n:"Magnesium ion",e:"Renal",a:"active",p:100,note:"Not a metabolite: renal excretion controls magnesium exposure; can potentiate neuromuscular blockade.",evidenceRefs:["ev_cabg_perioperative_medications"]}
],
"Dexmedetomidine":[
  {n:"Dexmedetomidine glucuronides",e:"UGT",a:"inactive",p:45,note:"Major conjugated metabolites; hepatic dysfunction can increase sedative/hemodynamic exposure.",evidenceRefs:["ev_icu_sepsis_shock_workflow"]},
  {n:"N-methyl/O-hydroxy dexmedetomidine metabolites",e:"CYP2A6",a:"inactive",p:35,note:"Oxidative metabolites; clinical interaction signal is additive bradycardia/hypotension rather than CYP inhibition.",evidenceRefs:["ev_icu_sepsis_shock_workflow"]}
],
"Cisatracurium":[
  {n:"Laudanosine",e:"Hofmann elimination",a:"weak",p:60,note:"Organ-independent degradation product; less accumulation than atracurium but prolonged infusions still need monitoring.",evidenceRefs:["ev_icu_sepsis_shock_workflow"]},
  {n:"Monoquaternary acrylate metabolite",e:"Hofmann elimination/ester hydrolysis",a:"inactive",p:30,note:"Non-CYP clearance supports use in organ dysfunction, but paralysis monitoring remains essential.",evidenceRefs:["ev_icu_sepsis_shock_workflow"]}
],
"Vecuronium":[
  {n:"3-desacetyl vecuronium",e:"Hepatic deacetylation",a:"active",p:35,note:"Active metabolite can accumulate in renal/hepatic dysfunction and prolong blockade.",evidenceRefs:["ev_icu_sepsis_shock_workflow"]},
  {n:"Vecuronium unchanged biliary/renal elimination",e:"Biliary/Renal",a:"active",p:55,note:"Parent clearance depends on organ function; magnesium and aminoglycosides can potentiate blockade.",evidenceRefs:["ev_icu_sepsis_shock_workflow"]}
],
"Lactated Ringer's Solution":[
  {n:"Lactate to bicarbonate",e:"Hepatic metabolism",a:"buffer",p:100,note:"Not a drug metabolite: lactate buffer is metabolized to bicarbonate; fluid/electrolyte and calcium compatibility context matter.",evidenceRefs:["ev_icu_sepsis_shock_workflow"]}
],
"Sodium Chloride 0.9%":[
  {n:"Sodium/chloride distribution",e:"Renal/electrolyte handling",a:"active",p:100,note:"Not metabolized; high chloride and sodium load shape acid-base/kidney context during resuscitation.",evidenceRefs:["ev_icu_sepsis_shock_workflow"]}
],
"Albumin Human":[
  {n:"Albumin amino acid catabolism",e:"Reticuloendothelial/protein catabolism",a:"inactive",p:100,note:"Albumin is catabolized as a protein; clinical relevance is oncotic/volume effect and protein-binding interpretation.",evidenceRefs:["ev_icu_sepsis_shock_workflow"]}
]
};


// ── SIDER-INFORMED PHARMACODYNAMIC FLAGS (Phase 5) ──
// Augments DB entries with additional PD risk flags sourced from SIDER, DrugBank, FDA labels
// Each drug listed ONCE with ALL flags merged to avoid JS object key-shadowing
const SIDER_PD = {
  "Acetaminophen":{hepato:2},
  "Alcohol (Ethanol)":{hepato:2},
  "Allopurinol":{nephro:1},
  "Amiodarone":{hepato:1,photoSens:2},
  "Amphetamine":{seizure:1},
  "Apixaban":{bleed:2},
  "Atorvastatin":{hepato:1,musculo:1},
  "Azathioprine":{hepato:1,myelo:2},
  "Bisoprolol":{hypoT:1},
  "Brexpiprazole":{sed:1},
  "Cannabis (THC)":{sed:1},
  "Carbamazepine":{hepato:1,hypoNa:2,myelo:1},
  "Ciprofloxacin":{seizure:1,nephro:1,photoSens:1,musculo:1},
  "Citalopram":{hypoNa:1},
  "Clarithromycin":{qtc:2},
  "Clozapine":{hypoT:1,seizure:1,myelo:2},
  "Cocaine":{seizure:1,qtc:2,hepato:1},
  "Colchicine":{musculo:1,myelo:1},
  "Cyclobenzaprine":{sed:1,seizure:1,ach:2},
  "Cyclosporine":{nephro:2,hyperK:1,hepato:1,musculo:1},
  "Dabigatran":{bleed:2},
  "Dexamethasone":{bleed:1,musculo:1},
  "Diclofenac":{hepato:1},
  "Diphenhydramine":{sed:1,ach:1},
  "Domperidone":{qtc:2},
  "Doxycycline":{photoSens:2},
  "Duloxetine":{hepato:1,hypoNa:1},
  "Edoxaban":{bleed:2},
  "Erythromycin":{qtc:2},
  "Escitalopram":{hypoNa:1},
  "Felodipine":{hypoT:1},
  "Fish Oil (Omega-3)":{bleed:1},
  "Fluconazole":{qtc:2,hepato:1},
  "Fluoxetine":{hypoNa:1},
  "Fluvoxamine":{hepato:1},
  "Furosemide":{hypoNa:1,photoSens:1},
  "Gabapentin":{sed:1},
  "Ginkgo Biloba":{bleed:1},
  "Green Tea Extract":{hepato:1},
  "Haloperidol":{qtc:3,hypoT:1,hypoNa:1},
  "Hydrochlorothiazide":{hypoNa:1,photoSens:1},
  "Hydroxychloroquine":{myelo:1},
  "Ketoconazole":{hepato:2},
  "Kratom (Mitragynine)":{sed:1},
  "Labetalol":{hypoT:1},
  "Levofloxacin":{seizure:1,photoSens:1,musculo:1},
  "Lithium":{seizure:1,nephro:1,qtc:1},
  "Loperamide":{qtc:1,ach:1},
  "Lorazepam":{sed:1},
  "Lovastatin":{musculo:1},
  "Lurasidone":{sed:1},
  "MDMA (Ecstasy)":{seizure:1,hepato:1,hypoNa:2},
  "Methadone":{qtc:3},
  "Methamphetamine":{seizure:1},
  "Methotrexate":{nephro:1,hepato:2,photoSens:1,myelo:2},
  "Metoclopramide":{qtc:1},
  "Metronidazole":{seizure:1},
  "Methylprednisolone":{musculo:1},
  "Moxifloxacin":{seizure:1,photoSens:1,musculo:1},
  "Mycophenolate":{hepato:1,myelo:1},
  "Naproxen":{photoSens:1},
  "Nifedipine":{hypoT:1},
  "Nitrofurantoin":{hepato:1},
  "Ondansetron":{qtc:1},
  "Oxcarbazepine":{hypoNa:2},
  "Paliperidone":{sed:1},
  "Paroxetine":{hypoNa:1},
  "Phenytoin":{hepato:1},
  "Pioglitazone":{hepato:1},
  "Prednisolone":{bleed:1,musculo:1},
  "Prednisone":{bleed:1,musculo:1},
  "Pregabalin":{sed:1},
  "Quetiapine":{hypoT:1},
  "Rifampin":{hepato:1},
  "Risperidone":{hypoT:1},
  "Rivaroxaban":{bleed:2},
  "Rosuvastatin":{musculo:1},
  "Sertraline":{hypoNa:1},
  "Sildenafil":{hypoT:1},
  "Simvastatin":{hepato:1,musculo:1},
  "Sirolimus":{nephro:1},
  "Spironolactone":{hyperK:2},
  "St. John's Wort":{photoSens:1},
  "Tacrolimus":{nephro:2,hyperK:1,hepato:1},
  "Tadalafil":{hypoT:1},
  "Tamsulosin":{hypoT:1},
  "Theophylline":{seizure:1},
  "Tizanidine":{sed:1,ach:1},
  "Tramadol":{seizure:1},
  "Trazodone":{hypoT:1},
  "Triazolam":{sed:1},
  "Trimethoprim/Sulfamethoxazole":{hyperK:1,photoSens:1,myelo:1},
  "Valerian":{sed:1},
  "Valproic Acid":{hepato:2,hypoNa:1,myelo:1},
  "Vardenafil":{hypoT:1},
  "Venlafaxine":{hypoNa:1},
  "Voriconazole":{qtc:1,hepato:1,photoSens:2,myelo:1}
};

// Apply SIDER_PD augmentation to DRUG_DB at load time
(function augmentPD() {
  for (const [drugName, flags] of Object.entries(SIDER_PD)) {
    const drug = DRUG_DB.find(d => d.name === drugName);
    if (!drug) continue;
    if (!drug.props) drug.props = {};
    for (const [flag, val] of Object.entries(flags)) {
      // Map legacy PD flag names to props sub-object
      if (!drug.props[flag] || drug.props[flag] < val) drug.props[flag] = val;
    }
  }
})();

function normalizeMetaboliteActivity(activity) {
  return activity === "prodrug" ? "active_form" : (activity || "inactive");
}

function isMetaboliteActive(metabolite) {
  const activity = normalizeMetaboliteActivity(metabolite && metabolite.a);
  return activity === "active_form" || String(activity).startsWith("active");
}

const METABOLITE_ACTOR_ALIASES = {
  "solanidine-a-solanine-aglycone": "solanidine",
  "solanidine-solanine-aglycone": "solanidine",
  "solanidine-solanine-chaconine-aglycone": "solanidine",
  "solanidine-a-solanine-a-chaconine-aglycone": "solanidine",
  "hydroxybupropion-r-r-oh-bupropion": "hydroxybupropion",
  "o-desmethyltramadol-m1": "o-desmethyltramadol",
  "endoxifen-4-oh-n-desmethyltamoxifen": "endoxifen",
  "dehydro-aripiprazole-opc-14857": "dehydro-aripiprazole",
  "9-hydroxyrisperidone-paliperidone": "paliperidone",
  "paraxanthine-1-7-dmx": "paraxanthine",
  "active-thiol-metabolite-r-130964": "active-thiol-clopidogrel",
  "m-chlorophenylpiperazine-mcpp": "mcpp",
  "pyridinium-metabolite-hpp": "hpp-plus",
  "napqi-n-acetyl-p-benzoquinone-imine": "napqi",
  "plasmin": "plasmin-from-plasminogen",
  "tenecteplase-driven-plasmin-activity": "tenecteplase-plasmin-effect",
  "andexanet-factor-xa-inhibitor-complex": "andexanet-fxa-inhibitor-complex",
  "idarucizumab-dabigatran-complex": "idarucizumab-dabigatran-complex",
  "phenytoin": "phenytoin-from-fosphenytoin",
  "hypertonic-sodium-chloride-load": "hypertonic-sodium-chloride-load",

};

const METABOLITE_ACTORS = {
  "hydroxybupropion": {
    id:"hydroxybupropion", type:ACTOR_TYPE.METABOLITE,
    name:"Hydroxybupropion", parentDrug:"Bupropion", formingEnzyme:"CYP2B6",
    active:true, halfLife:20, potencyRatio:0.5,
    evidenceRefs:["ev_bupropion_cyp2d6_fda","ev_bupropion_cyp2d6_kotlyar2005","ev_bupropion_cyp2d6_hesse1996"],
    routes:[{
      enzyme:"CYP2D6", fraction:0.3, role:"clearance_context",
      evidenceRefs:["ev_bupropion_cyp2d6_hesse1996"],
      evidence:{confidence:"low",sources:["phenotype-stratified TDM"],refs:["ev_bupropion_cyp2d6_hesse1996"],
        note:"CYP2D6 PM status is associated with higher hydroxybupropion level/dose ratio, but CYP2D6 clearance fraction is not firmly established."}
    }],
    inh:[
      {target:"CYP2D6",  strength:"strong",
       temporal:{onset:'days', duration:'2-3_days_post_dose', reversible:true,
                 note:'Competitive inhibition; clears with drug washout (~5 half-lives = 100h)'},
       evidenceRefs:["ev_bupropion_cyp2d6_fda","ev_bupropion_cyp2d6_kotlyar2005"],
       evidence:{confidence:"high",sources:["FDA label","Kotlyar 2005"],refs:["ev_bupropion_cyp2d6_fda","ev_bupropion_cyp2d6_kotlyar2005"]}},
      {target:"CYP2B6",  strength:"moderate", temporal:{onset:'days'}, evidenceRefs:["ev_bupropion_cyp2d6_fda"], evidence:{confidence:"moderate",sources:["FDA label"],refs:["ev_bupropion_cyp2d6_fda"]}},
      {target:"CYP2C19", strength:"weak",     temporal:{onset:'days'}, evidenceRefs:["ev_bupropion_cyp2d6_fda"], evidence:{confidence:"moderate",sources:["FDA label"],refs:["ev_bupropion_cyp2d6_fda"]}},
    ],
    note:"t½ LONGER than parent (20h vs 12h); primary driver of bupropion CYP2D6 DDIs"
  },
  "norfluoxetine": {
    id:"norfluoxetine", type:ACTOR_TYPE.METABOLITE,
    name:"Norfluoxetine", parentDrug:"Fluoxetine", formingEnzyme:"CYP2D6",
    active:true, halfLife:168, potencyRatio:0.8,
    routes:[{enzyme:"CYP2D6",fraction:0.5,evidenceRefs:["ev_fluoxetine_cyp2d6_fda","ev_fluoxetine_cyp2d6_sunkara2010"]}],
    inh:[
      {target:"CYP2D6", strength:"strong",
       temporal:{onset:'1-2_weeks', duration:'2-5_weeks_post_discontinuation', reversible:false,
                 note:'MBI — requires enzyme resynthesis; washout period 5 weeks minimum'},
       evidenceRefs:["ev_fluoxetine_cyp2d6_fda","ev_fluoxetine_desipramine_preskorn1994"],
       evidence:{confidence:"high",sources:["FDA label","Preskorn 1994"],refs:["ev_fluoxetine_cyp2d6_fda","ev_fluoxetine_desipramine_preskorn1994"]}},
      {target:"CYP3A4",  strength:"moderate", temporal:{onset:'1-2_weeks'}, evidenceRefs:["ev_fluoxetine_cyp2d6_fda"], evidence:{confidence:"moderate",sources:["FDA label"],refs:["ev_fluoxetine_cyp2d6_fda"]}},
      {target:"CYP2C19", strength:"moderate", temporal:{onset:'1-2_weeks'}, evidenceRefs:["ev_fluoxetine_cyp2d6_fda"], evidence:{confidence:"moderate",sources:["FDA label"],refs:["ev_fluoxetine_cyp2d6_fda"]}},
    ],
    evidenceRefs:["ev_fluoxetine_cyp2d6_fda","ev_fluoxetine_cyp2d6_sunkara2010","ev_fluoxetine_desipramine_preskorn1994"],
    note:"t½ 4-16 DAYS; CYP2D6 inhibition persists WEEKS after fluoxetine discontinuation"
  },
  "desipramine": {
    id:"desipramine", type:ACTOR_TYPE.METABOLITE,
    name:"Desipramine", parentDrug:"Imipramine", formingEnzyme:"CYP1A2",
    active:true, halfLife:21, potencyRatio:1.0,
    routes:[{enzyme:"CYP2D6",fraction:0.7,evidenceRefs:["ev_tca_cyp2d6_cpic"]}],
    inh:[{target:"CYP2D6",strength:"moderate"}],
    evidenceRefs:["ev_tca_cyp2d6_cpic"],
    note:"Active metabolite; itself a prescribed drug; NRI activity"
  },
  "morphine": {
    id:"morphine", type:ACTOR_TYPE.METABOLITE,
    name:"Morphine", parentDrug:"Codeine", formingEnzyme:"CYP2D6",
    active:true, halfLife:3, potencyRatio:10.0,
    routes:[{enzyme:"UGT2B7",fraction:0.6,evidenceRefs:["ev_opioid_ugt2b7_glucuronidation_review"]},{enzyme:"CYP3A4",fraction:0.1,evidenceRefs:["ev_opioid_ugt2b7_glucuronidation_review"]}],
    inh:[],
    evidenceRefs:["ev_cyp2d6_codeine_genotype","ev_opioid_cyp2d6_cpic_2020","ev_opioid_ugt2b7_glucuronidation_review"],
    note:"200× more potent than codeine at mu-opioid receptor; CYP2D6 PM → no morphine → no analgesia"
  },
  "o-desmethyltramadol": {
    id:"o-desmethyltramadol", type:ACTOR_TYPE.METABOLITE,
    name:"O-desmethyltramadol (M1)", parentDrug:"Tramadol", formingEnzyme:"CYP2D6",
    active:true, halfLife:9, potencyRatio:6.0,
    routes:[{enzyme:"CYP2D6",fraction:0.3,evidenceRefs:["ev_opioid_cyp2d6_cpic_2020"]},{enzyme:"UGT",fraction:0.5}],
    inh:[],
    evidenceRefs:["ev_opioid_cyp2d6_cpic_2020"],
    note:"200× higher mu-opioid affinity than tramadol; CYP2D6 PM → ↓↓ analgesia"
  },
  "endoxifen": {
    id:"endoxifen", type:ACTOR_TYPE.METABOLITE,
    name:"Endoxifen", parentDrug:"Tamoxifen", formingEnzyme:"CYP2D6",
    active:true, halfLife:70, potencyRatio:100.0,
    routes:[{enzyme:"CYP3A4",fraction:0.3},{enzyme:"UGT",fraction:0.5},{enzyme:"SULT",fraction:0.2}],
    inh:[],
    evidenceRefs:["ev_tamoxifen_cyp2d6_cpic","ev_tamoxifen_cyp2d6_controversy","ev_paroxetine_cyp2d6_japanese"],
    contradictoryEvidence:true,
    contradictoryNote:"CPIC guideline supports CYP2D6 genotype-guided tamoxifen dosing; Province 2014 meta-analysis did not find statistically significant clinical outcome difference. Scientific debate ongoing. Reduced-function CYP2D6 alleles can partially impair endoxifen production even outside classic PM status.",
    note:"100× more potent than tamoxifen; CYP2D6 PM → endoxifen ↓75% → breast cancer recurrence ↑. Reduced-function CYP2D6 alleles can lower endoxifen formation."
  },
  "hydromorphone": {
    id:"hydromorphone", type:ACTOR_TYPE.METABOLITE,
    name:"Hydromorphone", parentDrug:"Hydrocodone", formingEnzyme:"CYP2D6",
    active:true, halfLife:2.5, potencyRatio:5.0,
    routes:[{enzyme:"UGT2B7",fraction:0.6,evidenceRefs:["ev_opioid_ugt2b7_glucuronidation_review"]}],
    inh:[],
    evidenceRefs:["ev_opioid_cyp2d6_cpic_2020","ev_opioid_ugt2b7_glucuronidation_review"],
    note:"5× more potent than hydrocodone; CYP2D6 PM → reduced hydromorphone"
  },
  "oxymorphone": {
    id:"oxymorphone", type:ACTOR_TYPE.METABOLITE,
    name:"Oxymorphone", parentDrug:"Oxycodone", formingEnzyme:"CYP2D6",
    active:true, halfLife:7, potencyRatio:14.0,
    routes:[{enzyme:"UGT2B7",fraction:0.5,evidenceRefs:["ev_opioid_ugt2b7_glucuronidation_review"]}],
    inh:[],
    evidenceRefs:["ev_opioid_cyp2d6_cpic_2020","ev_opioid_ugt2b7_glucuronidation_review"],
    note:"14× more potent; CYP3A4 inhibitors shunt toward oxymorphone → paradoxical potency increase"
  },
  "4-hydroxyatomoxetine": {
    id:"4-hydroxyatomoxetine", type:ACTOR_TYPE.METABOLITE,
    name:"4-Hydroxyatomoxetine", parentDrug:"Atomoxetine", formingEnzyme:"CYP2D6",
    active:true, halfLife:6, potencyRatio:1.0,
    routes:[{enzyme:"UGT",fraction:0.7}],
    inh:[],
    evidenceRefs:["ev_atomoxetine_cyp2d6_cpic"],
    note:"Equipotent to parent at NET. CYP2D6 PM: 4-OH formation reduced while parent atomoxetine accumulates; active moiety is maintained at lower doses."
  },
  "alpha-hydroxymetoprolol": {
    id:"alpha-hydroxymetoprolol", type:ACTOR_TYPE.METABOLITE,
    name:"alpha-Hydroxymetoprolol", parentDrug:"Metoprolol", formingEnzyme:"CYP2D6",
    active:true, halfLife:3, potencyRatio:0.1,
    routes:[],
    inh:[],
    evidenceRefs:["ev_metoprolol_cyp2d6_cpic"],
    note:"Weak beta-blocking metabolite with about 10% parent potency. CYP2D6 PM reduces formation while parent metoprolol accumulates."
  },
  "4-hydroxy-nebivolol": {
    id:"4-hydroxy-nebivolol", type:ACTOR_TYPE.METABOLITE,
    name:"4-Hydroxy-nebivolol", parentDrug:"Nebivolol", formingEnzyme:"CYP2D6",
    active:true, halfLife:10, potencyRatio:0.3,
    routes:[],
    inh:[],
    evidenceRefs:["ev_nebivolol_cyp2d6_label"],
    note:"Beta1-selective active metabolite. CYP2D6 PM reduces formation while parent nebivolol accumulates substantially."
  },
  "n-desmethylclobazam-norclobazam": {
    id:"n-desmethylclobazam-norclobazam", type:ACTOR_TYPE.METABOLITE,
    name:"N-Desmethylclobazam (Norclobazam)", parentDrug:"Clobazam", formingEnzyme:"CYP3A4",
    active:true, halfLife:71, potencyRatio:1.0,
    routes:[{enzyme:"CYP2C19",fraction:0.7,evidence:{confidence:"high",sources:["FDA label"]}}],
    inh:[],
    evidenceRefs:["ev_clobazam_cyp2c19_fda_onfi"],
    note:"Active metabolite cleared mainly by CYP2C19. CYP2C19 PM impairs clearance and increases sedation/respiratory-depression risk."
  },
  "exp-3174-e-3174": {
    id:"exp-3174-e-3174", type:ACTOR_TYPE.METABOLITE,
    name:"EXP3174 (E-3174)", parentDrug:"Losartan", formingEnzyme:"CYP2C9",
    active:true, halfLife:6, potencyRatio:40.0,
    routes:[],
    inh:[],
    evidenceRefs:["ev_losartan_cyp2c9_sica2002"],
    note:"Primary active losartan metabolite and much more potent AT1 antagonist than parent. CYP2C9 PM reduces EXP3174 formation."
  },
  "6-thioguanine-nucleotides-6-tgn": {
    id:"6-thioguanine-nucleotides-6-tgn", type:ACTOR_TYPE.METABOLITE,
    name:"6-Thioguanine nucleotides (6-TGN)", parentDrug:"Azathioprine", formingEnzyme:"HPRT/FPGS",
    active:true, halfLife:null, potencyRatio:null,
    routes:[],
    inh:[{target:"DNA_replication", strength:"strong", evidence:{confidence:"high",sources:["CPIC guideline","FDA label"]}}],
    evidenceRefs:["ev_azathioprine_tpmt_cpic2019"],
    note:"Active cytotoxic thiopurine nucleotides. TPMT loss-of-function shunts more 6-MP toward 6-TGN and can cause severe myelosuppression."
  },
  "5-hydroxyomeprazole": {
    id:"5-hydroxyomeprazole", type:ACTOR_TYPE.METABOLITE,
    name:"5-Hydroxyomeprazole", parentDrug:"Omeprazole", formingEnzyme:"CYP2C19",
    active:false, halfLife:null, potencyRatio:0.0,
    routes:[],
    inh:[],
    evidenceRefs:["ev_omeprazole_cyp2c19_lima2021"],
    note:"Inactive CYP2C19 metabolite. CYP2C19 PM reduces formation while parent omeprazole accumulates."
  },
  "voriconazole-n-oxide": {
    id:"voriconazole-n-oxide", type:ACTOR_TYPE.METABOLITE,
    name:"Voriconazole N-oxide", parentDrug:"Voriconazole", formingEnzyme:"CYP2C19",
    active:false, halfLife:null, potencyRatio:0.0,
    routes:[],
    inh:[],
    evidenceRefs:["ev_voriconazole_cyp2c19_hyland2008"],
    note:"Inactive primary voriconazole metabolite. CYP2C19 PM reduces N-oxide formation while parent voriconazole accumulates; TDM supersedes genotype-only prediction."
  },
  "8-hydroxyefavirenz": {
    id:"8-hydroxyefavirenz", type:ACTOR_TYPE.METABOLITE,
    name:"8-Hydroxyefavirenz", parentDrug:"Efavirenz", formingEnzyme:"CYP2B6",
    active:false, halfLife:24, potencyRatio:0.0,
    routes:[],
    inh:[],
    evidenceRefs:["ev_efavirenz_cyp2b6_desta2019"],
    note:"Inactive primary efavirenz metabolite. CYP2B6 PM reduces 8-OH formation while parent efavirenz accumulates."
  },
  "dihydrofluorouracil-dhfu": {
    id:"dihydrofluorouracil-dhfu", type:ACTOR_TYPE.METABOLITE,
    name:"Dihydrofluorouracil (DHFU)", parentDrug:"Fluorouracil", formingEnzyme:"DPYD",
    active:false, halfLife:24, potencyRatio:0.0,
    routes:[],
    inh:[],
    evidenceRefs:["ev_fluorouracil_dpyd_amstutz2018"],
    note:"Inactive primary 5-FU catabolite. DPYD PM reduces DHFU formation while parent 5-FU accumulates to cytotoxic levels."
  },
  "5-fluorouracil": {
    id:"5-fluorouracil", type:ACTOR_TYPE.METABOLITE,
    name:"5-Fluorouracil", parentDrug:"Capecitabine", formingEnzyme:"CES/TP",
    active:true, halfLife:0.25, potencyRatio:1.0,
    routes:[{enzyme:"DPYD",fraction:0.8,evidence:{confidence:"high",sources:["CPIC guideline","FDA label"]}}],
    inh:[],
    evidenceRefs:["ev_fluorouracil_dpyd_amstutz2018"],
    note:"Active fluoropyrimidine formed from capecitabine. DPYD loss-of-function impairs 5-FU catabolism and raises severe toxicity risk."
  },
  "sn-38-7-ethyl-10-hydroxycamptothecin": {
    id:"sn-38-7-ethyl-10-hydroxycamptothecin", type:ACTOR_TYPE.METABOLITE,
    name:"SN-38 (7-ethyl-10-hydroxycamptothecin)", parentDrug:"Irinotecan", formingEnzyme:"CES1/CES2",
    active:true, halfLife:12, potencyRatio:1000.0,
    routes:[{enzyme:"UGT1A1",fraction:0.9,evidence:{confidence:"high",sources:["FDA label","CPIC guideline"]}}],
    inh:[],
    evidenceRefs:["ev_irinotecan_ugt1a1_ramsey2014"],
    note:"Active cytotoxic topoisomerase I inhibitor. UGT1A1 poor function impairs glucuronidation to SN-38G and increases neutropenia risk."
  },
  "dehydro-aripiprazole": {
    id:"dehydro-aripiprazole", type:ACTOR_TYPE.METABOLITE,
    name:"Dehydro-aripiprazole", parentDrug:"Aripiprazole", formingEnzyme:"CYP2D6",
    active:true, halfLife:94, potencyRatio:0.5,
    routes:[{enzyme:"CYP3A4",fraction:0.4,evidenceRefs:["ev_antipsychotic_cyp2d6_labels"]}],
    inh:[],
    evidenceRefs:["ev_antipsychotic_cyp2d6_labels"],
    note:"40% of parent activity; contributes to active moiety"
  },
  "paliperidone": {
    id:"paliperidone", type:ACTOR_TYPE.METABOLITE,
    name:"9-Hydroxyrisperidone (Paliperidone)", parentDrug:"Risperidone", formingEnzyme:"CYP2D6",
    active:true, halfLife:21, potencyRatio:1.0,
    routes:[{enzyme:"UGT",fraction:0.5,evidenceRefs:["ev_antipsychotic_cyp2d6_labels"]},{enzyme:"CYP3A4",fraction:0.1,evidenceRefs:["ev_antipsychotic_cyp2d6_labels"]}],
    inh:[],
    evidenceRefs:["ev_antipsychotic_cyp2d6_labels"],
    note:"Equipotent; itself an approved drug; active moiety = parent + metabolite"
  },
  "paraxanthine": {
    id:"paraxanthine", type:ACTOR_TYPE.METABOLITE,
    name:"Paraxanthine", parentDrug:"Caffeine", formingEnzyme:"CYP1A2",
    active:true, halfLife:4, potencyRatio:0.8,
    routes:[{enzyme:"CYP1A2",fraction:0.5,evidenceRefs:["ev_caffeine_paraxanthine_cyp1a2_review"]},{enzyme:"XO",fraction:0.2,evidenceRefs:["ev_caffeine_paraxanthine_cyp1a2_review"]}],
    inh:[],
    evidenceRefs:["ev_caffeine_paraxanthine_cyp1a2_review"],
    note:"Primary caffeine metabolite (80%); CNS stimulant + lipolysis"
  },
  "active-thiol-clopidogrel": {
    id:"active-thiol-clopidogrel", type:ACTOR_TYPE.METABOLITE,
    name:"Active thiol metabolite", parentDrug:"Clopidogrel", formingEnzyme:"CYP2C19",
    active:true, halfLife:0.5, potencyRatio:100.0,
    routes:[],
    inh:[],
    note:"Only 15% of clopidogrel reaches active form; CYP2C19 PM → 70% ↓ → stent thrombosis"
  },
  "mcpp": {
    id:"mcpp", type:ACTOR_TYPE.METABOLITE,
    name:"m-Chlorophenylpiperazine (mCPP)", parentDrug:"Trazodone", formingEnzyme:"CYP3A4",
    active:true, halfLife:6, potencyRatio:0.3,
    routes:[{enzyme:"CYP2D6",fraction:0.5,evidenceRefs:["ev_trazodone_mcpp_cyp2d6_mihara1997"]}],
    inh:[],
    evidenceRefs:["ev_trazodone_mcpp_cyp2d6_mihara1997"],
    note:"5-HT2C agonist — causes anxiety/panic in some patients; accumulates in CYP2D6 PM"
  },
  "hpp-plus": {
    id:"hpp-plus", type:ACTOR_TYPE.METABOLITE,
    name:"Pyridinium metabolite (HPP+)", parentDrug:"Haloperidol", formingEnzyme:"CYP3A4",
    active:false, halfLife:72, potencyRatio:0,
    routes:[],
    inh:[],
    toxicity:{target:"dopaminergic_neurons", mechanism:"MPP+-like mitochondrial complex I inhibitor"},
    note:"NEUROTOXIC; similar to MPTP → tardive dyskinesia risk; ↑ in CYP2D6 PM"
  },
  "plasmin-from-plasminogen": {
    id:"plasmin-from-plasminogen", type:ACTOR_TYPE.METABOLITE,
    name:"Plasmin", parentDrug:"Alteplase", formingEnzyme:"Plasminogen Activation",
    active:true, halfLife:0.1, potencyRatio:1.0,
    routes:[{enzyme:"Protease Inhibition/Clearance",fraction:1.0,evidenceRefs:["ev_stroke_neurocritical_workflow"]}],
    inh:[],
    evidenceRefs:["ev_stroke_neurocritical_workflow"],
    note:"Functional fibrinolytic product generated by tPA-mediated plasminogen activation. Bleeding risk is pharmacodynamic, especially with anticoagulants/antiplatelets."
  },
  "tenecteplase-plasmin-effect": {
    id:"tenecteplase-plasmin-effect", type:ACTOR_TYPE.METABOLITE,
    name:"Tenecteplase-driven plasmin activity", parentDrug:"Tenecteplase", formingEnzyme:"Plasminogen Activation",
    active:true, halfLife:0.33, potencyRatio:1.0,
    routes:[{enzyme:"Protease Inhibition/Clearance",fraction:1.0,evidenceRefs:["ev_stroke_neurocritical_workflow"]}],
    inh:[],
    evidenceRefs:["ev_stroke_neurocritical_workflow"],
    note:"Represents the pharmacodynamic fibrinolytic effect of tenecteplase rather than a CYP-formed metabolite."
  },
  "andexanet-fxa-inhibitor-complex": {
    id:"andexanet-fxa-inhibitor-complex", type:ACTOR_TYPE.METABOLITE,
    name:"Andexanet-factor Xa inhibitor complex", parentDrug:"Andexanet Alfa", formingEnzyme:"Drug Binding",
    active:false, halfLife:1, potencyRatio:0,
    routes:[{enzyme:"Proteolytic Catabolism",fraction:1.0,evidenceRefs:["ev_stroke_neurocritical_workflow"]}],
    inh:[],
    evidenceRefs:["ev_stroke_neurocritical_workflow"],
    note:"Drug-binding complex that neutralizes apixaban/rivaroxaban anti-Xa activity. Clinical issue is intentional reversal and rebound thrombosis planning."
  },
  "idarucizumab-dabigatran-complex": {
    id:"idarucizumab-dabigatran-complex", type:ACTOR_TYPE.METABOLITE,
    name:"Idarucizumab-dabigatran complex", parentDrug:"Idarucizumab", formingEnzyme:"Drug Binding",
    active:false, halfLife:0.75, potencyRatio:0,
    routes:[{enzyme:"Renal/Proteolytic Clearance",fraction:1.0,evidenceRefs:["ev_stroke_neurocritical_workflow"]}],
    inh:[],
    evidenceRefs:["ev_stroke_neurocritical_workflow"],
    note:"High-affinity binding complex that neutralizes dabigatran anticoagulant effect for emergency reversal."
  },
  "phenytoin-from-fosphenytoin": {
    id:"phenytoin-from-fosphenytoin", type:ACTOR_TYPE.METABOLITE,
    name:"Phenytoin", parentDrug:"Fosphenytoin", formingEnzyme:"Phosphatase",
    active:true, halfLife:22, potencyRatio:1.0,
    routes:[{enzyme:"CYP2C9",fraction:0.7,evidenceRefs:["ev_stroke_neurocritical_workflow"]},{enzyme:"CYP2C19",fraction:0.2,evidenceRefs:["ev_stroke_neurocritical_workflow"]}],
    inh:[{target:"CYP3A4",strength:"moderate",evidenceRefs:["ev_stroke_neurocritical_workflow"]},{target:"CYP2C9",strength:"moderate",evidenceRefs:["ev_stroke_neurocritical_workflow"]}],
    evidenceRefs:["ev_stroke_neurocritical_workflow"],
    note:"Fosphenytoin is converted to phenytoin; downstream interactions follow phenytoin exposure, protein binding, CYP2C9/CYP2C19 clearance, and enzyme induction."
  },
  "hypertonic-sodium-chloride-load": {
    id:"hypertonic-sodium-chloride-load", type:ACTOR_TYPE.METABOLITE,
    name:"Hypertonic sodium/chloride load", parentDrug:"Hypertonic Saline 3%", formingEnzyme:"Electrolyte Distribution",
    active:true, halfLife:0, potencyRatio:1.0,
    routes:[{enzyme:"Electrolyte/Volume Distribution",fraction:1.0,evidenceRefs:["ev_stroke_neurocritical_workflow"]}],
    inh:[],
    evidenceRefs:["ev_stroke_neurocritical_workflow"],
    note:"Represents the osmotic sodium/chloride effect used in cerebral edema workflows. Monitor sodium correction rate and osmolality."
  },
  "napqi": {
    id:"napqi", type:ACTOR_TYPE.METABOLITE,
    name:"NAPQI", parentDrug:"Acetaminophen", formingEnzyme:"CYP2E1",
    active:false, halfLife:0.01, potencyRatio:0,
    routes:[{enzyme:"GST",fraction:0.95}],
    inh:[],
    toxicity:{target:"hepatocytes", mechanism:"Glutathione depletion → covalent protein binding → necrosis"},
    note:"Normally detoxified by glutathione; CYP2E1 inducers (alcohol, isoniazid) ↑ NAPQI production 3-5×"
  },
};

// ── Food/Xenobiotic Actors ──
// Non-drug compounds that interact with the metabolic graph
