// MedCheck — Metabolite database and actor definitions
// Phase A: modular source — concatenated by build.js

const METAB = {
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
  {n:"4-Hydroxyatomoxetine",e:"CYP2D6",a:"active",p:60,t:6,note:"Primary active metabolite; equipotent NET inhibitor. Formation severely impaired in CYP2D6 PM",evidenceRefs:["ev_atomoxetine_cyp2d6_cpic","ev_atomoxetine_cyp2d6_pbpk2018"]},
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
  {n:"Solanidine (α-solanine aglycone)",e:"Gut hydrolysis",a:"active",p:60,t:48,note:"Potato glycoalkaloid aglycone; in vitro CYP2D6/CYP3A4 substrate and diet-derived CYP2D6 activity biomarker. Clinical DDI burden remains theoretical.",evidenceRefs:["ev_solanidine_cyp2d6_mock2001","ev_solanidine_cyp2d6_hellden2024"]},
  {n:"α-Solanine / α-Chaconine",e:"Dietary glycoalkaloids",a:"active",p:40,note:"Potato glycoalkaloids; cholinesterase inhibition shown in vitro.",evidenceRefs:["ev_solanidine_ache_griffin1995"]}
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
  {n:"Simvastatin acid (SVA)",e:"Esterase",a:"active_form",role:"active_form",p:60,t:2,note:"THE active form — simvastatin is a lactone prodrug"},
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
  {n:"N-Desmethylclobazam (norclobazam)",e:"CYP3A4",a:"active",p:80,t:71,note:"Active metabolite formed mainly by CYP3A4 and cleared mainly by CYP2C19. CYP2C19 PMs accumulate norclobazam 5x+",evidenceRefs:["ev_clobazam_cyp2c19_fda_onfi"]},
  {n:"4'-Hydroxyclobazam",e:"CYP2C19",a:"inactive",p:10},
  {n:"Clobazam glucuronide",e:"UGT",a:"inactive",p:5}
],

// ── ANTIPLATELETS ──
"Clopidogrel":[
  {n:"2-Oxo-clopidogrel",e:"CYP2C19",a:"active",p:15,t:0.5,note:"Intermediate — requires SECOND CYP activation step"},
  {n:"Active thiol metabolite (R-130964)",e:"CYP3A4",a:"active_form",role:"active_form",p:2,t:0.5,note:"THE active antiplatelet — irreversibly binds P2Y12. Only ~2% of dose!",evidenceRefs:["ev_clopidogrel_cyp2c19_cpic"]},
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
  {n:"5-(p-Hydroxyphenyl)-5-phenylhydantoin (HPPH)",e:"CYP2C9",a:"inactive",p:70,note:"Main metabolite — saturable kinetics at therapeutic doses"},
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
  {n:"13-O-Desmethyltacrolimus",e:"CYP3A4",a:"active",p:40,note:"~10% immunosuppressive activity"},
  {n:"31-O-Desmethyltacrolimus",e:"CYP3A5",a:"active",p:20},
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
"Trimethoprim-SMX":[
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
  {n:"Voriconazole N-oxide",e:"CYP2C19",a:"inactive",p:50,t:6,note:"Inactive major metabolite; CYP2C19 PMs form less N-oxide while parent voriconazole accumulates",evidenceRefs:["ev_voriconazole_cyp2c19_hyland2008"]},
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
  {n:"Mycophenolic acid (MPA)",e:"Esterases",a:"active",p:95,t:17,note:"Active metabolite from mycophenolate mofetil (prodrug)",evidenceRefs:["ev_mycophenolate_enterohepatic_label"]},
  {n:"MPA glucuronide (MPAG)",e:"UGT1A9",a:"inactive",p:85,note:"Major elimination; undergoes enterohepatic recycling",evidenceRefs:["ev_mycophenolate_enterohepatic_label"]},
  {n:"Acyl-MPAG",e:"UGT2B7",a:"toxic",p:10,note:"Reactive acyl glucuronide → GI toxicity, possible leukopenia"}
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
  {n:"SN-38 (7-ethyl-10-hydroxycamptothecin)",e:"CES1/CES2",a:"active_form",role:"active_form",p:5,t:12,note:"Active cytotoxic metabolite. Detoxified by UGT1A1 to inactive SN-38G; UGT1A1 PMs accumulate SN-38.",evidenceRefs:["ev_irinotecan_ugt1a1_ramsey2014"]},
  {n:"SN-38G (SN-38 glucuronide)",e:"UGT1A1",a:"inactive",p:60,t:24,note:"Inactive glucuronide elimination pathway.",evidenceRefs:["ev_irinotecan_ugt1a1_ramsey2014"]},
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
  {n:"Ondansetron glucuronide",e:"UGT",a:"inactive",p:20,note:"Direct glucuronidation"}
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
  {n:"7-Hydroxy-methotrexate",e:"Aldehyde oxidase",a:"weak",p:30,t:8,note:"Hepatic; less folate antagonism but nephrotoxic at high doses"},
  {n:"MTX polyglutamates (intracellular)",e:"FPGS",a:"active",p:0,note:"Retained intracellularly; responsible for sustained immunosuppression"},
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
"Turmeric/Curcumin":[
  {n:"Curcumin glucuronide",e:"UGT1A1/1A8",a:"weak",p:40,note:"Major Phase II metabolite; very low oral bioavailability (<1%)"},
  {n:"Curcumin sulfate",e:"SULT1A1",a:"weak",p:25,note:"Sulfation conjugate"},
  {n:"Tetrahydrocurcumin",e:"Gut reductases",a:"active",p:20,note:"Reduced form with antioxidant activity; may inhibit CYP2C9"}
],
"Curcumin (Turmeric)":[
  {n:"Curcumin glucuronide",e:"UGT1A1/1A8",a:"weak",p:40,note:"Major conjugate; explains poor bioavailability"},
  {n:"Curcumin sulfate",e:"SULT1A1",a:"weak",p:25,note:"Sulfation"},
  {n:"Tetrahydrocurcumin",e:"Gut reductases",a:"active",p:20,note:"Reduced metabolite with antioxidant properties"}
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
  "Trimethoprim-SMX":{hyperK:1,photoSens:1,myelo:1},
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
  // ═══ ENRICHMENT BATCH 1 ═══
  "Mercaptopurine":[
    {
      n:"6-Thioguanine nucleotides (6-TGN)",
      e:"HPRT/IMPDH",
      a:"active_form",
      role:"active_form",
      p:40,
      note:"Cytotoxic/immunosuppressive active metabolites incorporated into DNA. NUDT15 dephosphorylates TGTP to limit DNA-TG incorporation — loss-of-function → myelosuppression.",
      evidenceRefs:[
        "ev_azathioprine_tpmt_cpic2019",
        "ev_thiopurine_tpmt_nudt15_cpic2025"
      ]
    },
    {
      n:"6-Methylmercaptopurine (6-MMP)",
      e:"TPMT",
      a:"toxic",
      p:30,
      note:"TPMT methylation product; hepatotoxic at high 6-MMP/6-TGN ratios. TPMT loss-of-function shunts toward 6-TGN → myelosuppression.",
      evidenceRefs:[
        "ev_azathioprine_tpmt_cpic2019"
      ]
    },
    {
      n:"Thiouric acid",
      e:"Xanthine oxidase",
      a:"inactive",
      p:30,
      note:"XO oxidation pathway; blocked by allopurinol/febuxostat → ↑ active thiopurine nucleotides."
    }
  ],

  "Thioguanine":[
    {
      n:"6-Thioguanine nucleotides (6-TGN)",
      e:"HPRT",
      a:"active_form",
      role:"active_form",
      p:60,
      note:"Direct conversion to active 6-TGN without the XO step — hence no allopurinol interaction. NUDT15 still governs DNA-TG load.",
      evidenceRefs:[
        "ev_thiopurine_tpmt_nudt15_cpic2025"
      ]
    },
    {
      n:"6-Methylthioguanine",
      e:"TPMT",
      a:"inactive",
      p:25,
      note:"TPMT methylation; TPMT loss-of-function shifts balance toward active 6-TGN."
    },
    {
      n:"2-Amino-6-methylthiopurine / thiouric (minor)",
      e:"Guanase/Aldehyde oxidase",
      a:"inactive",
      p:15,
      note:"Minor oxidative inactivation; NOT xanthine-oxidase dependent."
    }
  ],

  "Tafenoquine":[
    {
      n:"Tafenoquine oxidative metabolites",
      e:"CYP2D6",
      a:"toxic",
      p:20,
      t:null,
      note:"Hydroxylated/oxidative metabolites generate hydrogen peroxide → erythrocyte oxidative stress; the proximate hemolysis driver in G6PD deficiency. Activation pathway less defined than primaquine.",
      evidenceRefs:[
        "ev_tafenoquine_g6pd_fda"
      ]
    },
    {
      n:"Tafenoquine (unchanged)",
      e:"Hepatic/biliary",
      a:"active",
      p:80,
      note:"Long-circulating parent (t½ ~14d) — sustained oxidative exposure cannot be truncated by discontinuation."
    }
  ],

  "Dapsone":[
    {
      n:"Dapsone hydroxylamine (DDS-NHOH)",
      e:"CYP2C9",
      a:"toxic",
      p:30,
      note:"Primary hematotoxic metabolite — drives dose-dependent methemoglobinemia and oxidative hemolysis (amplified in G6PD deficiency). Also formed via CYP3A4.",
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
      note:"Long t½ (~28h) → metabolite accumulation with chronic dosing."
    }
  ],

  "Chloroquine":[
    {
      n:"Desethylchloroquine",
      e:"CYP2C8",
      a:"active",
      p:35,
      t:null,
      note:"Major active metabolite; antimalarial activity retained. Also formed via CYP3A4.",
      evidenceRefs:[
        "ev_g6pd_oxidative_antimalarials"
      ]
    },
    {
      n:"Bisdesethylchloroquine",
      e:"CYP2D6",
      a:"active",
      p:10,
      note:"Minor active metabolite."
    },
    {
      n:"Chloroquine (unchanged)",
      e:"Renal",
      a:"active",
      p:50,
      note:"Large Vd, very long terminal t½ (tissue depot)."
    }
  ],

  "Quinine":[
    {
      n:"3-Hydroxyquinine",
      e:"CYP3A4",
      a:"active",
      p:60,
      t:null,
      note:"Principal metabolite; some antimalarial activity, accumulates in renal impairment.",
      evidenceRefs:[
        "ev_g6pd_oxidative_antimalarials"
      ]
    },
    {
      n:"Quinine (unchanged)",
      e:"Renal",
      a:"active",
      p:20,
      note:"Renal clearance increases in acidic urine."
    }
  ],

  "Sulfasalazine":[
    {
      n:"Sulfapyridine",
      e:"Azoreductase (gut flora)",
      a:"active",
      p:60,
      t:null,
      note:"Released by colonic bacterial azo-cleavage, then acetylated by NAT2. Slow acetylators accumulate it → dose-related adverse effects; oxidant sulfonamide → hemolysis risk in G6PD deficiency.",
      evidenceRefs:[
        "ev_sulfasalazine_tpmt_inhibition"
      ]
    },
    {
      n:"5-Aminosalicylic acid (mesalamine)",
      e:"Azoreductase (gut flora)",
      a:"active_form",
      role:"active_form",
      p:40,
      note:"The locally-acting anti-inflammatory moiety; minimal systemic absorption."
    },
    {
      n:"N-Acetylsulfapyridine",
      e:"NAT2",
      a:"inactive",
      p:30,
      note:"NAT2 acetylation product of sulfapyridine."
    }
  ],

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
