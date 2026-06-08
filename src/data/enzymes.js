// MedCheck — Enzyme/genotype data and legacy genetics system
// Phase A: modular source — concatenated by build.js

const GENE_ENZYMES = [
  "CYP1A2","CYP2B6","CYP2C8","CYP2C9","CYP2C19","CYP2D6","CYP2E1","CYP3A4","CYP3A5","CYP3A7",
  "UGT1A1","UGT1A4","UGT1A9","UGT2B7","UGT2B15","UGT2B17","DPYD","TPMT","NAT1","NAT2","COMT","CYP2A6","CYP4F2",
  "SLCO1B1","ABCB1","ABCG2","GSTM1","GSTT1","GSTP1","BCHE","IFNL3","IFNL4","OPRM1","SLC6A4","HTR2A","HTR2C","DRD2","ALDH2","SLC22A1","SLC22A2","SLC47A1","SCN1A","SCN2A","KCNH2","MAO-A","MAO-B"
];
const PHENOTYPE_OPTIONS = [
  { id: "ultrarapid", label: "Ultrarapid Metabolizer", mult: 0.3, cssClass: "ultrarapid" },
  { id: "rapid", label: "Rapid Metabolizer", mult: 0.5, cssClass: "rapid" },
  { id: "normal", label: "Normal Metabolizer", mult: 1.0, cssClass: "normal" },
  { id: "intermediate", label: "Intermediate Metabolizer", mult: 1.8, cssClass: "intermediate" },
  { id: "poor", label: "Poor Metabolizer", mult: 5.0, cssClass: "poor" },
  { id: "null", label: "No Function (Null)", mult: 20.0, cssClass: "null" },
];

// ── PharmGKB / CPIC EVIDENCE GRADES (Phase 6) ──
// Level A = required before prescribing, Level B = moderate evidence, Level C = some evidence
// Source: PharmGKB clinical annotations + CPIC guidelines (2024)
const PHARMGKB_EVIDENCE = {
  "CYP2D6":{
    grade:"A",
    guideline:"CPIC",
    pairs:[
      {drug:"Codeine",level:"A",action:"Avoid in PM; use alternative analgesic"},
      {drug:"Tramadol",level:"A",action:"Avoid in PM/UM; reduced efficacy or toxicity"},
      {drug:"Oxycodone",level:"B",action:"Reduced efficacy in PM; consider alternative"},
      {drug:"Hydrocodone",level:"B",action:"Reduced activation in PM"},
      {drug:"Fluoxetine",level:"A",action:"PM: higher levels/ADR; UM: subtherapeutic"},
      {drug:"Paroxetine",level:"A",action:"PM: higher levels/ADR; UM: reduced efficacy"},
      {drug:"Sertraline",level:"B",action:"Consider dose adjustment in PM"},
      {drug:"Venlafaxine",level:"B",action:"PM: ↑ parent, ↓ active metabolite"},
      {drug:"Amitriptyline",level:"A",action:"PM: reduce dose 50%; UM: avoid or increase dose"},
      {drug:"Nortriptyline",level:"A",action:"PM: reduce dose 50%; UM: increase dose or use alternative"},
      {drug:"Imipramine",level:"A",action:"PM: reduce dose; UM: consider alternative"},
      {drug:"Clomipramine",level:"A",action:"PM: reduce dose; UM: consider alternative"},
      {drug:"Doxepin",level:"B",action:"PM: reduce dose; monitor levels"},
      {drug:"Atomoxetine",level:"A",action:"PM: reduce dose to 0.5mg/kg/day"},
      {drug:"Aripiprazole",level:"B",action:"PM: reduce dose to 50% of standard (FDA label); use extra caution with CYP3A4 inhibitors"},
      {drug:"Risperidone",level:"B",action:"PM: reduce dose; active metabolite reduced"},
      {drug:"Haloperidol",level:"B",action:"PM: reduce dose 50%"},
      {drug:"Metoprolol",level:"B",action:"PM: ↑ AUC 5×; consider atenolol/bisoprolol"},
      {drug:"Carvedilol",level:"B",action:"PM: ↑ levels; monitor for bradycardia"},
      {drug:"Propranolol",level:"C",action:"PM: ↑ levels; clinical significance unclear"},
      {drug:"Tamoxifen",level:"A",action:"PM: ineffective; use aromatase inhibitor"},
      {drug:"Ondansetron",level:"B",action:"PM: elevated levels may increase QTc risk; UM effect is usually minor/no dose change"},
      {drug:"Metoclopramide",level:"C",action:"PM: ↑ EPS risk"}
    ]
  },
  "CYP2C19":{
    grade:"A",
    guideline:"CPIC",
    pairs:[
      {drug:"Clopidogrel",level:"A",action:"PM: ineffective; use prasugrel or ticagrelor"},
      {drug:"Omeprazole",level:"A",action:"PM: ↑ efficacy; UM: reduced efficacy, ↑ dose"},
      {drug:"Esomeprazole",level:"A",action:"PM: ↑ efficacy; UM: may need higher dose"},
      {drug:"Lansoprazole",level:"A",action:"PM: ↑ levels; UM: reduced efficacy"},
      {drug:"Pantoprazole",level:"B",action:"Less affected by genotype than omeprazole"},
      {drug:"Voriconazole",level:"A",action:"PM: 4× higher levels, toxicity risk; UM: subtherapeutic"},
      {drug:"Citalopram",level:"B",action:"PM: reduce dose; UM: may need higher dose"},
      {drug:"Escitalopram",level:"B",action:"PM: reduce dose by 50%"},
      {drug:"Sertraline",level:"B",action:"PM: consider dose reduction"},
      {drug:"Amitriptyline",level:"A",action:"PM: reduce dose 50% (2C19 + 2D6 combined effect)"},
      {drug:"Imipramine",level:"A",action:"PM: reduce dose; monitor levels"},
      {drug:"Clomipramine",level:"A",action:"PM: reduce dose"},
      {drug:"Phenytoin",level:"A",action:"PM: reduce dose by 25%; monitor levels"},
      {drug:"Brivaracetam",level:"C",action:"Minor CYP2C19 contribution"},
      {drug:"Diazepam",level:"B",action:"PM: ↑ t½; reduced clearance"}
    ]
  },
  "CYP2C9":{
    grade:"A",
    guideline:"CPIC",
    pairs:[
      {drug:"Warfarin",level:"A",action:"PM (*2/*3): reduce dose 30-50%; use pharmacogenomic dosing"},
      {drug:"Phenytoin",level:"A",action:"PM: reduce dose by 25-50%; monitor levels closely"},
      {drug:"Celecoxib",level:"B",action:"PM: reduce dose 50%; increased GI/CV risk"},
      {drug:"Ibuprofen",level:"B",action:"PM: ↑ AUC ~2×; consider dose reduction"},
      {drug:"Fluvastatin",level:"C",action:"PM: ↑ levels; monitor for myopathy"},
      {drug:"Losartan",level:"B",action:"PM: ↓ active metabolite → reduced efficacy"},
      {drug:"Glipizide",level:"C",action:"PM: ↑ levels; hypoglycemia risk"},
      {drug:"Glyburide",level:"C",action:"PM: ↑ levels; hypoglycemia risk"}
    ]
  },
  "CYP2C8":{
    grade:"B",
    guideline:"PharmGKB/FDA labels",
    pairs:[
      {drug:"Paclitaxel",level:"B",action:"Reduced function or CYP2C8 inhibition may raise parent exposure; monitor neuropathy/myelosuppression"},
      {drug:"Pioglitazone",level:"C",action:"Reduced function or inhibitors may raise parent and active metabolite exposure; edema/hypoglycemia context matters"},
      {drug:"Repaglinide",level:"C",action:"CYP2C8/OATP1B1 substrate; gemfibrozil-like inhibition is high impact; genotype-only actionability is weaker"},
      {drug:"Montelukast",level:"C",action:"CYP2C8 contributes to clearance; clinical actionability uncertain"}
    ]
  },
  "BCHE":{
    grade:"B",
    guideline:"FDA labels / clinical anesthesia references",
    pairs:[
      {drug:"Succinylcholine",level:"B",action:"Deficiency: avoid or prepare for prolonged paralysis/apnea and ventilatory support"},
      {drug:"Mivacurium",level:"B",action:"Deficiency: avoid or prepare for prolonged neuromuscular blockade"}
    ]
  },
  "CYP3A4":{
    grade:"B",
    guideline:"CPIC/DPWG",
    pairs:[
      {drug:"Simvastatin",level:"B",action:"CYP3A4 inhibitors → 10-15× ↑ levels; rhabdomyolysis"},
      {drug:"Atorvastatin",level:"B",action:"CYP3A4 inhibitors → 3-4× ↑ levels"},
      {drug:"Tacrolimus",level:"A",action:"CYP3A5 expressors: need higher doses"},
      {drug:"Cyclosporine",level:"B",action:"Monitor with CYP3A4 inhibitors/inducers"},
      {drug:"Fentanyl",level:"B",action:"CYP3A4 inhibitors → respiratory depression risk"},
      {drug:"Midazolam",level:"B",action:"CYP3A4 inhibitors → excessive sedation"},
      {drug:"Triazolam",level:"B",action:"CYP3A4 inhibitors → excessive sedation"},
      {drug:"Apixaban",level:"B",action:"CYP3A4 inhibitors → ↑ bleeding; inducers → ↓ efficacy"}
    ]
  },
  "CYP3A5":{
    grade:"B",
    guideline:"PharmGKB",
    pairs:[
      {drug:"Tacrolimus",level:"A",action:"CYP3A5 expressors often require higher doses; non-expressors have higher concentration/dose"},
      {drug:"Alprazolam",level:"B",action:"CYP3A5*3/*3 non-expressors: higher alprazolam AUC vs expressors"}
    ]
  },
  "CYP2B6":{
    grade:"B",
    guideline:"CPIC",
    pairs:[
      {drug:"Efavirenz",level:"A",action:"PM: reduce dose to 400mg; UM: may need 800mg"},
      {drug:"Bupropion",level:"B",action:"PM: ↓ hydroxybupropion AUC ~23%; parent bupropion modestly elevated"},
      {drug:"Methadone",level:"B",action:"PM: ↑ levels; UM: faster clearance"}
    ]
  },
  "CYP1A2":{
    grade:"B",
    guideline:"DPWG",
    pairs:[
      {drug:"Theophylline",level:"B",action:"UM (smoker): need higher dose; PM: reduce dose"},
      {drug:"Caffeine",level:"C",action:"PM: slow metabolism, anxiety/insomnia; UM: rapid clearance"},
      {drug:"Clozapine",level:"B",action:"PM: ↑ levels, toxicity risk; UM: subtherapeutic"},
      {drug:"Tizanidine",level:"B",action:"PM with CYP1A2 inhibitor: 33× ↑ AUC (contraindicated)"},
      {drug:"Fluvoxamine",level:"B",action:"Strong CYP1A2 inhibitor — affects all 1A2 substrates"}
    ]
  },
  "CYP2E1":{
    grade:"C",
    guideline:"PharmGKB/literature",
    pairs:[
      {drug:"Chlorzoxazone",level:"C",action:"CYP2E1 phenotyping probe; useful for activity context rather than treatment selection"},
      {drug:"Acetaminophen",level:"C",action:"CYP2E1 forms toxic NAPQI; dose, alcohol, fasting, liver disease, and glutathione reserve dominate"},
      {drug:"Halothane",level:"C",action:"Older volatile anesthetic with CYP2E1 oxidative metabolism to reactive trifluoroacetylated intermediates"}
    ]
  },
  "CYP3A7":{
    grade:"C",
    guideline:"PharmGKB/literature",
    pairs:[
      {drug:"Etonogestrel",level:"C",action:"CYP3A7*1C/persistent expression has been associated with lower implant concentrations; BMI, duration, adherence, and CYP3A inducers still dominate clinical review"},
      {drug:"Estradiol / endogenous estrogens",level:"C",action:"Persistent CYP3A7 expression shifts DHEA-S/estrogen metabolism; useful endocrine context, not a medication dose rule"},
      {drug:"CYP3A oncology substrates",level:"D",action:"Exploratory cancer-outcome associations exist; do not treat as a chemotherapy dosing rule without specialist review"}
    ]
  },
  "DPYD":{
    grade:"A",
    guideline:"CPIC",
    pairs:[
      {drug:"Fluorouracil",level:"A",action:"PM: AVOID — fatal toxicity risk; IM: reduce dose 50%"},
      {drug:"Capecitabine",level:"A",action:"PM: AVOID; IM: reduce dose 50%"}
    ]
  },
  "TPMT":{
    grade:"A",
    guideline:"CPIC",
    pairs:[
      {drug:"Azathioprine",level:"A",action:"PM: reduce dose 90%; IM: reduce dose 30-70%"},
      {drug:"Mercaptopurine",level:"A",action:"PM: reduce dose 90%; IM: reduce dose 30-70%"}
    ]
  },
  "UGT1A1":{
    grade:"A",
    guideline:"CPIC",
    pairs:[
      {drug:"Atazanavir",level:"A",action:"*28/*28: ↑ hyperbilirubinemia, but usually benign"},
      {drug:"Irinotecan",level:"A",action:"*28/*28: reduce dose 30%; severe neutropenia risk"}
    ]
  },
  "UGT1A4":{
    grade:"C",
    guideline:"PharmGKB/FDA labels",
    pairs:[
      {drug:"Lamotrigine",level:"B",action:"Glucuronidation-sensitive; valproate/estrogens/inducers often dominate genotype"},
      {drug:"Asenapine",level:"C",action:"UGT1A4/CYP1A2 clearance; sedation/orthostasis context matters"},
      {drug:"Lorlatinib",level:"C",action:"Minor UGT1A4 contribution; CYP3A induction/inhibition usually dominates"}
    ]
  },
  "UGT1A9":{
    grade:"C",
    guideline:"PharmGKB/FDA labels",
    pairs:[
      {drug:"Propofol",level:"C",action:"UGT1A9 is a major clearance route; procedural titration dominates genotype"},
      {drug:"Mycophenolate",level:"C",action:"MPAG formation/enterohepatic recycling context; TDM and transplant protocol dominate"},
      {drug:"Sorafenib",level:"C",action:"CYP3A4/UGT1A9 oncology clearance context"},
      {drug:"Regorafenib",level:"C",action:"CYP3A4/UGT1A9 active-metabolite context"}
    ]
  },
  "UGT2B15":{
    grade:"C",
    guideline:"PharmGKB/FDA labels",
    pairs:[
      {drug:"Lorazepam",level:"C",action:"Glucuronidated benzodiazepine; age/renal/sedation burden dominates genotype"},
      {drug:"Oxazepam",level:"C",action:"Glucuronidation context; less CYP interaction burden than diazepam"},
      {drug:"Dabigatran",level:"C",action:"Active acyl-glucuronide context; renal/P-gp effects dominate"}
    ]
  },
  "UGT2B17":{
    grade:"C",
    guideline:"PharmGKB/FDA labels",
    pairs:[
      {drug:"Oxazepam",level:"C",action:"Possible glucuronidation modifier; not a standalone dose rule"},
      {drug:"Temazepam",level:"C",action:"Possible glucuronidation modifier; sedation/falls context dominates"}
    ]
  },
  "SLCO1B1":{
    grade:"A",
    guideline:"CPIC",
    pairs:[
      {drug:"Simvastatin",level:"A",action:"521TC/CC: avoid >20mg; myopathy risk 5-17×"},
      {drug:"Atorvastatin",level:"B",action:"521CC: ↑ levels; consider dose reduction"},
      {drug:"Rosuvastatin",level:"B",action:"521CC: ↑ levels 1.6×; use lower starting dose"},
      {drug:"Pravastatin",level:"B",action:"521CC: ↑ levels; monitor"},
      {drug:"Pitavastatin",level:"B",action:"521CC: ↑ levels; start low dose"}
    ]
  },
  "NAT2":{
    grade:"B",
    guideline:"CPIC",
    pairs:[
      {drug:"Isoniazid",level:"A",action:"Slow acetylator: ↑ hepatotoxicity; reduce dose/monitor LFTs"},
      {drug:"Sulfasalazine",level:"B",action:"Slow acetylator: ↑ ADR frequency"},
      {drug:"Hydralazine",level:"C",action:"Slow acetylator: ↑ SLE-like syndrome risk"}
    ]
  },
  "NAT1":{
    grade:"C",
    guideline:"PharmGKB/literature",
    pairs:[
      {drug:"Aminosalicylic Acid",level:"C",action:"NAT1-selective acetylation context; clinical TB regimen decisions still follow specialist protocols"},
      {drug:"PABA",level:"C",action:"NAT1 probe/substrate context; mainly useful for supplements, dermatology products, and biochemical interpretation"},
      {drug:"Trimethoprim/Sulfamethoxazole",level:"C",action:"Sulfonamide arylamine/hypersensitivity context is weak and not a substitute for allergy history or label warnings"}
    ]
  },
  "GSTM1":{
    grade:"C",
    guideline:"PharmGKB/literature",
    pairs:[
      {drug:"Busulfan",level:"C",action:"Null genotype is a conditioning-regimen toxicity/PK review flag; therapeutic drug monitoring remains central"},
      {drug:"Acetaminophen",level:"C",action:"Detoxification reserve context for NAPQI risk stacking, especially overdose/alcohol/liver disease"},
      {drug:"Isoniazid",level:"C",action:"Hepatotoxicity monitoring context alongside NAT2 and clinical risk factors"}
    ]
  },
  "GSTT1":{
    grade:"C",
    guideline:"PharmGKB/literature",
    pairs:[
      {drug:"Cisplatin",level:"C",action:"Null genotype is a platinum toxicity-context flag; evidence is inconsistent and tumor/regimen-specific"},
      {drug:"Busulfan",level:"C",action:"Glutathione detoxification context for conditioning regimens; do not replace busulfan TDM"},
      {drug:"Cruciferous Vegetables (Isothiocyanates)",level:"C",action:"Null genotype can alter isothiocyanate mercapturic-acid excretion kinetics"}
    ]
  },
  "GSTP1":{
    grade:"C",
    guideline:"PharmGKB/literature",
    pairs:[
      {drug:"Cisplatin",level:"C",action:"rs1695/reduced activity is associated with platinum toxicity signals; use as oncology review context"},
      {drug:"Carboplatin",level:"C",action:"Platinum detoxification/toxicity context; no standalone dose rule"},
      {drug:"Oxaliplatin",level:"C",action:"Platinum neurotoxicity/myelosuppression context; tumor and regimen matter"}
    ]
  },
  "ABCB1":{
    grade:"B",
    guideline:"DPWG",
    pairs:[
      {drug:"Digoxin",level:"B",action:"3435TT: ↑ absorption; monitor levels"},
      {drug:"Dabigatran",level:"B",action:"P-gp inhibitors → ↑ levels; bleeding risk"},
      {drug:"Tacrolimus",level:"C",action:"3435TT: variable effects on levels"}
    ]
  },
  "CYP4F2":{
    grade:"B",
    guideline:"CPIC",
    pairs:[
      {drug:"Warfarin",level:"B",action:"V433M (*3): ↑ dose requirement ~1mg/day"}
    ]
  },
  "COMT":{
    grade:"C",
    guideline:"PharmGKB",
    pairs:[
      {drug:"Levodopa",level:"C",action:"Val/Val: faster dopamine degradation; Met/Met: slower"},
      {drug:"MDMA (Ecstasy)",level:"C",action:"Met/Met: ↑ dopamine/noradrenaline neurotoxicity"}
    ]
  },
  "IFNL3":{
    grade:"B",
    guideline:"CPIC",
    pairs:[
      {drug:"Peginterferon Alfa",level:"B",action:"Unfavorable IFNL3/IL28B context lowers likelihood of response to peginterferon/ribavirin-era HCV therapy"},
      {drug:"Ribavirin",level:"B",action:"Regimen-response context when used with peginterferon; modern DAA regimens usually dominate treatment choice"}
    ]
  },
  "IFNL4":{
    grade:"C",
    guideline:"Literature/CPIC context",
    pairs:[
      {drug:"Peginterferon Alfa",level:"C",action:"IFNL4-generating variants are unfavorable response context for interferon-based HCV clearance"},
      {drug:"Ribavirin",level:"C",action:"Use only as interferon-era regimen context, not as a ribavirin toxicity or exposure rule"}
    ]
  },
  "OPRM1":{
    grade:"C",
    guideline:"CPIC",
    pairs:[
      {drug:"Morphine",level:"C",action:"Mu-opioid receptor response context; CPIC gives no opioid dosing recommendation based on OPRM1 alone"},
      {drug:"Fentanyl",level:"C",action:"Response/sedation review context only; dose, tolerance, renal function, CYP/UGT and co-sedatives dominate"},
      {drug:"Oxycodone",level:"C",action:"Low-actionability receptor-response context; do not treat as an exposure rule"},
      {drug:"Methadone",level:"C",action:"Response context only; QT risk and CYP2B6/CYP3A interactions remain more actionable"}
    ]
  },
  "SLC6A4":{
    grade:"B",
    guideline:"CPIC",
    pairs:[
      {drug:"Sertraline",level:"B",action:"Serotonin-transporter response/tolerability context; not a clearance dose rule"},
      {drug:"Escitalopram",level:"B",action:"Response context to read beside CYP2C19 exposure and prior SSRI response"},
      {drug:"Citalopram",level:"B",action:"Response context; QT and CYP2C19 remain more actionable"},
      {drug:"Fluoxetine",level:"B",action:"Response context to read beside CYP2D6/CYP2C19 and long half-life"}
    ]
  },
  "HTR2A":{
    grade:"B",
    guideline:"CPIC",
    pairs:[
      {drug:"Sertraline",level:"B",action:"Serotonin-receptor response/tolerability context; no standalone dose change"},
      {drug:"Escitalopram",level:"B",action:"Response context to read beside CYP2C19 and clinical history"},
      {drug:"Venlafaxine",level:"B",action:"Response/tolerability context; CYP2D6 active-metabolite pathway remains more actionable"}
    ]
  },
  "HTR2C":{
    grade:"C",
    guideline:"PharmGKB/literature",
    pairs:[
      {drug:"Olanzapine",level:"C",action:"Weight/metabolic adverse-effect susceptibility context"},
      {drug:"Risperidone",level:"C",action:"Weight/prolactin/EPS context; CYP2D6 exposure remains more actionable"},
      {drug:"Clozapine",level:"C",action:"Metabolic-risk context; TDM, smoking/CYP1A2, and ANC monitoring dominate"}
    ]
  },
  "DRD2":{
    grade:"C",
    guideline:"PharmGKB/literature",
    pairs:[
      {drug:"Risperidone",level:"C",action:"Dopamine-receptor response/prolactin/EPS context"},
      {drug:"Haloperidol",level:"C",action:"EPS/response context; dose and CYP2D6 remain more actionable"},
      {drug:"Olanzapine",level:"C",action:"Response/tolerability context; not a dose rule"}
    ]
  },
  "SCN1A":{
    grade:"C",
    guideline:"Neurology literature",
    pairs:[
      {drug:"Carbamazepine",level:"C",action:"Dravet/SCN1A loss-of-function context: sodium-channel blockers can worsen seizures"},
      {drug:"Lamotrigine",level:"C",action:"Sodium-channel blocker; specialist review in SCN1A/Dravet-spectrum contexts"},
      {drug:"Phenytoin",level:"C",action:"Sodium-channel blocker; phenotype and emergency context matter"}
    ]
  },
  "SCN2A":{
    grade:"C",
    guideline:"Neurology literature",
    pairs:[
      {drug:"Carbamazepine",level:"C",action:"Variant-direction-dependent sodium-channel blocker response"},
      {drug:"Lacosamide",level:"C",action:"Sodium-channel modulator; use only with specialist variant interpretation"}
    ]
  },
  "KCNH2":{
    grade:"C",
    guideline:"Cardiac safety literature",
    pairs:[
      {drug:"Citalopram",level:"C",action:"Long-QT susceptibility context; ECG/electrolyte/interaction review"},
      {drug:"Methadone",level:"C",action:"Long-QT susceptibility context; QT and accumulation monitoring"},
      {drug:"Haloperidol",level:"C",action:"Long-QT susceptibility context; route/dose and QT stacking matter"}
    ]
  },
  "ALDH2":{
    grade:"B",
    guideline:"Clinical pharmacology literature",
    pairs:[
      {drug:"Nitroglycerin",level:"B",action:"Reduced ALDH2 function can blunt nitrate bioactivation/vasodilatory response"},
      {drug:"Isosorbide Dinitrate",level:"C",action:"Denitration/nitrate-response context; evidence weaker than nitroglycerin"},
      {drug:"Metronidazole",level:"C",action:"Alcohol/disulfiram-like reaction context; avoid alcohol per label regardless of genotype"}
    ]
  },
  "SLC22A1":{
    grade:"B",
    guideline:"PharmGKB/literature",
    pairs:[
      {drug:"Metformin",level:"B",action:"OCT1 hepatic uptake context; response and GI intolerance may vary"},
      {drug:"Cimetidine",level:"C",action:"OCT transporter interaction context; kidney function and inhibitors dominate"}
    ]
  },
  "SLC22A2":{
    grade:"B",
    guideline:"Transporter pharmacology literature",
    pairs:[
      {drug:"Metformin",level:"B",action:"OCT2 renal transport context; interpret with eGFR and OCT2/MATE inhibitors"},
      {drug:"Dolutegravir",level:"C",action:"OCT2/MATE inhibition can raise creatinine/metformin context; genotype is a modifier, not a dose rule"},
      {drug:"Trimethoprim/Sulfamethoxazole",level:"C",action:"Trimethoprim OCT2 inhibition can add to renal/metformin handling context"}
    ]
  },
  "SLC47A1":{
    grade:"B",
    guideline:"Transporter pharmacology literature",
    pairs:[
      {drug:"Metformin",level:"B",action:"MATE1 efflux context; renal function and transporter inhibitors dominate"},
      {drug:"Dolutegravir",level:"C",action:"MATE/OCT inhibitor context for metformin and creatinine interpretation"}
    ]
  },
  "MAO-A":{
    grade:"C",
    guideline:"PharmGKB",
    pairs:[
      {drug:"Moclobemide",level:"C",action:"Genotype affects serotonin metabolism capacity"},
      {drug:"Sumatriptan",level:"C",action:"MAO-A metabolizes sumatriptan"}
    ]
  }
};

let userGenetics = {};

function genotypeToLegacyPhenotype(phenotype) {
  if (!phenotype || phenotype === GENOTYPE_PHENOTYPE.NM) return "normal";
  if (phenotype === GENOTYPE_PHENOTYPE.PM) return "poor";
  if (phenotype === GENOTYPE_PHENOTYPE.IM) return "intermediate";
  if (phenotype === GENOTYPE_PHENOTYPE.UM) return "ultrarapid";
  return phenotype;
}

function setGenotypeState(enzyme, phenotype, details = {}) {
  if (!enzyme || !GENOTYPE_EFFECTS[enzyme]) return false;
  const parsed = typeof normalizeGenePhenotypeInput === "function"
    ? normalizeGenePhenotypeInput(enzyme, details.reportedLabel || phenotype)
    : null;
  const normalized = legacyPhenotypeToGenotype(parsed?.phenotype || phenotype);
  const valid = GENOTYPE_EFFECTS[enzyme][normalized] ? normalized : GENOTYPE_PHENOTYPE.NM;
  activeGenotype[enzyme] = valid;
  const interpretation = typeof buildGeneInterpretation === "function"
    ? buildGeneInterpretation(enzyme, valid, { ...(parsed || {}), ...details })
    : null;
  if (typeof activeGenotypeDetails !== "undefined") {
    if (valid === GENOTYPE_PHENOTYPE.NM && !details.reportedLabel) delete activeGenotypeDetails[enzyme];
    else activeGenotypeDetails[enzyme] = interpretation;
  }
  const legacy = typeof shouldUseLegacyNullState === "function" && shouldUseLegacyNullState(enzyme, interpretation)
    ? "null"
    : genotypeToLegacyPhenotype(valid);
  if (legacy === "normal") delete userGenetics[enzyme];
  else userGenetics[enzyme] = legacy;
  return true;
}

function getPhenotypeMult(enzyme) {
  const active = activeGenotype && activeGenotype[enzyme];
  const legacy = userGenetics[enzyme];
  const pheno = legacy === "null" ? legacy : (active ? genotypeToLegacyPhenotype(active) : legacy);
  if (!pheno) return 1.0;
  if (pheno === "null" && typeof getNullExposureMultiplier === "function") return getNullExposureMultiplier(enzyme);
  const opt = PHENOTYPE_OPTIONS.find(o => o.id === pheno);
  return opt ? opt.mult : 1.0;
}

function setGenetics(enzyme, phenotype) {
  setGenotypeState(enzyme, phenotype || "normal");
  renderGenetics();
  renderAll();
}

function removeGenetics(enzyme) {
  setGenotypeState(enzyme, GENOTYPE_PHENOTYPE.NM);
  renderGenetics();
  renderAll();
}

function addGeneFromSelect() {
  const sel = document.getElementById("geneAddSelect");
  const enzyme = sel.value;
  if (enzyme && !userGenetics[enzyme]) {
    userGenetics[enzyme] = "normal";
    renderGenetics();
  }
}

const ENZYME_ACTORS = {
  "CYP2D6":  {id:"CYP2D6",  type:ACTOR_TYPE.ENZYME, name:"CYP2D6",  family:"CYP450", tissue:["liver","brain","gut"], polymorphic:true, substrateCount:0},
  "CYP3A4":  {id:"CYP3A4",  type:ACTOR_TYPE.ENZYME, name:"CYP3A4",  family:"CYP450", tissue:["liver","gut"],         polymorphic:false,substrateCount:0},
  "CYP3A5":  {id:"CYP3A5",  type:ACTOR_TYPE.ENZYME, name:"CYP3A5",  family:"CYP450", tissue:["liver","gut"],         polymorphic:true, substrateCount:0},
  "CYP3A7":  {id:"CYP3A7",  type:ACTOR_TYPE.ENZYME, name:"CYP3A7",  family:"CYP450", tissue:["fetal_liver","neonatal_liver","adult_liver_variant"], polymorphic:true, substrateCount:0},
  "CYP2C19": {id:"CYP2C19", type:ACTOR_TYPE.ENZYME, name:"CYP2C19", family:"CYP450", tissue:["liver"],              polymorphic:true, substrateCount:0},
  "CYP2C9":  {id:"CYP2C9",  type:ACTOR_TYPE.ENZYME, name:"CYP2C9",  family:"CYP450", tissue:["liver"],              polymorphic:true, substrateCount:0},
  "CYP2C8":  {id:"CYP2C8",  type:ACTOR_TYPE.ENZYME, name:"CYP2C8",  family:"CYP450", tissue:["liver"],              polymorphic:true, substrateCount:0},
  "CYP1A1":  {id:"CYP1A1",  type:ACTOR_TYPE.ENZYME, name:"CYP1A1",  family:"CYP450", tissue:["gut","lung","extrahepatic"], polymorphic:false,substrateCount:0, inducible:["cruciferous","charbroiled"]},
  "CYP1A2":  {id:"CYP1A2",  type:ACTOR_TYPE.ENZYME, name:"CYP1A2",  family:"CYP450", tissue:["liver"],              polymorphic:true, substrateCount:0, inducible:["smoking","cruciferous","charbroiled"]},
  "CYP2A6":  {id:"CYP2A6",  type:ACTOR_TYPE.ENZYME, name:"CYP2A6",  family:"CYP450", tissue:["liver"],              polymorphic:true, substrateCount:0},
  "CYP2B6":  {id:"CYP2B6",  type:ACTOR_TYPE.ENZYME, name:"CYP2B6",  family:"CYP450", tissue:["liver"],              polymorphic:true, substrateCount:0},
  "CYP2E1":  {id:"CYP2E1",  type:ACTOR_TYPE.ENZYME, name:"CYP2E1",  family:"CYP450", tissue:["liver"],              polymorphic:true, substrateCount:0, inducible:["alcohol","isoniazid","obesity","fasting"]},
  "CYP4F2":  {id:"CYP4F2",  type:ACTOR_TYPE.ENZYME, name:"CYP4F2",  family:"CYP450", tissue:["liver"],              polymorphic:true, substrateCount:0},
  "BCHE":    {id:"BCHE",    type:ACTOR_TYPE.ENZYME, name:"BCHE",    family:"esterase", tissue:["plasma","liver"],    polymorphic:true, substrateCount:0},
  "NAT1":    {id:"NAT1",    type:ACTOR_TYPE.ENZYME, name:"NAT1",    family:"NAT",    tissue:["liver","gut","many_tissues"], polymorphic:true, substrateCount:0},
  "NAT2":    {id:"NAT2",    type:ACTOR_TYPE.ENZYME, name:"NAT2",    family:"NAT",    tissue:["liver"],              polymorphic:true, substrateCount:0},
  "GSTM1":   {id:"GSTM1",   type:ACTOR_TYPE.ENZYME, name:"GSTM1",   family:"GST",    tissue:["liver","blood"],       polymorphic:true, substrateCount:0},
  "GSTT1":   {id:"GSTT1",   type:ACTOR_TYPE.ENZYME, name:"GSTT1",   family:"GST",    tissue:["liver","kidney"],      polymorphic:true, substrateCount:0},
  "GSTP1":   {id:"GSTP1",   type:ACTOR_TYPE.ENZYME, name:"GSTP1",   family:"GST",    tissue:["tumor","blood","lung"], polymorphic:true, substrateCount:0},
  "VKORC1":  {id:"VKORC1",  type:ACTOR_TYPE.ENZYME, name:"VKORC1",  family:"vitamin_K_cycle", tissue:["liver"],      polymorphic:true, substrateCount:0},
  "NUDT15":  {id:"NUDT15",  type:ACTOR_TYPE.ENZYME, name:"NUDT15",  family:"nucleotide_hydrolase", tissue:["blood","bone_marrow"], polymorphic:true, substrateCount:0},
  "SLCO1B1": {id:"SLCO1B1", type:ACTOR_TYPE.ENZYME, name:"SLCO1B1/OATP1B1", family:"transporter_gene", tissue:["liver"], polymorphic:true, substrateCount:0},
  "ABCG2":   {id:"ABCG2",   type:ACTOR_TYPE.ENZYME, name:"ABCG2/BCRP", family:"transporter_gene", tissue:["gut","liver"], polymorphic:true, substrateCount:0},
  "CYP27A1": {id:"CYP27A1", type:ACTOR_TYPE.ENZYME, name:"CYP27A1", family:"CYP450", tissue:["liver","macrophage"], polymorphic:false,substrateCount:0},
  "CYP2R1":  {id:"CYP2R1",  type:ACTOR_TYPE.ENZYME, name:"CYP2R1",  family:"CYP450", tissue:["liver"],              polymorphic:true, substrateCount:0},
  "CYP27B1": {id:"CYP27B1", type:ACTOR_TYPE.ENZYME, name:"CYP27B1", family:"CYP450", tissue:["kidney"],             polymorphic:true, substrateCount:0},
  "CYP24A1": {id:"CYP24A1", type:ACTOR_TYPE.ENZYME, name:"CYP24A1", family:"CYP450", tissue:["kidney","liver"],     polymorphic:false,substrateCount:0},
  "UGT2B7":  {id:"UGT2B7",  type:ACTOR_TYPE.ENZYME, name:"UGT2B7",  family:"UGT",    tissue:["liver","kidney"],      polymorphic:true, substrateCount:0},
  "UGT1A4":  {id:"UGT1A4",  type:ACTOR_TYPE.ENZYME, name:"UGT1A4",  family:"UGT",    tissue:["liver","gut"],         polymorphic:true, substrateCount:0},
  "UGT1A9":  {id:"UGT1A9",  type:ACTOR_TYPE.ENZYME, name:"UGT1A9",  family:"UGT",    tissue:["liver","kidney"],      polymorphic:true, substrateCount:0},
  "UGT2B15": {id:"UGT2B15", type:ACTOR_TYPE.ENZYME, name:"UGT2B15", family:"UGT",    tissue:["liver"],               polymorphic:true, substrateCount:0},
  "UGT2B17": {id:"UGT2B17", type:ACTOR_TYPE.ENZYME, name:"UGT2B17", family:"UGT",    tissue:["liver","extrahepatic"],polymorphic:true, substrateCount:0},
  "COMT":    {id:"COMT",    type:ACTOR_TYPE.ENZYME, name:"COMT",    family:"methyltransferase", tissue:["liver","brain","synapse"], polymorphic:true, substrateCount:0},
  "IFNL3":   {id:"IFNL3",   type:ACTOR_TYPE.ENZYME, name:"IFNL3/IL28B", family:"response_gene", tissue:["immune","liver"], polymorphic:true, substrateCount:0},
  "IFNL4":   {id:"IFNL4",   type:ACTOR_TYPE.ENZYME, name:"IFNL4",   family:"response_gene", tissue:["immune","liver"], polymorphic:true, substrateCount:0},
  "OPRM1":   {id:"OPRM1",   type:ACTOR_TYPE.ENZYME, name:"OPRM1/mu-opioid receptor", family:"receptor_gene", tissue:["brain","spinal_cord","gut"], polymorphic:true, substrateCount:0},
  "SLC6A4":  {id:"SLC6A4",  type:ACTOR_TYPE.ENZYME, name:"SLC6A4/SERT", family:"transporter_gene", tissue:["brain","platelets","gut"], polymorphic:true, substrateCount:0},
  "HTR2A":   {id:"HTR2A",   type:ACTOR_TYPE.ENZYME, name:"HTR2A/5-HT2A receptor", family:"receptor_gene", tissue:["brain","platelets"], polymorphic:true, substrateCount:0},
  "HTR2C":   {id:"HTR2C",   type:ACTOR_TYPE.ENZYME, name:"HTR2C/5-HT2C receptor", family:"receptor_gene", tissue:["brain","hypothalamus"], polymorphic:true, substrateCount:0},
  "DRD2":    {id:"DRD2",    type:ACTOR_TYPE.ENZYME, name:"DRD2/dopamine D2 receptor", family:"receptor_gene", tissue:["brain","pituitary"], polymorphic:true, substrateCount:0},
  "ALDH2":   {id:"ALDH2",   type:ACTOR_TYPE.ENZYME, name:"ALDH2", family:"aldehyde_dehydrogenase", tissue:["liver","vasculature","mitochondria"], polymorphic:true, substrateCount:0},
  "SLC22A1": {id:"SLC22A1", type:ACTOR_TYPE.ENZYME, name:"SLC22A1/OCT1", family:"transporter_gene", tissue:["liver","gut"], polymorphic:true, substrateCount:0},
  "SLC22A2": {id:"SLC22A2", type:ACTOR_TYPE.ENZYME, name:"SLC22A2/OCT2", family:"transporter_gene", tissue:["kidney"], polymorphic:true, substrateCount:0},
  "SLC47A1": {id:"SLC47A1", type:ACTOR_TYPE.ENZYME, name:"SLC47A1/MATE1", family:"transporter_gene", tissue:["kidney","liver"], polymorphic:true, substrateCount:0},
  "SCN1A":   {id:"SCN1A",   type:ACTOR_TYPE.ENZYME, name:"SCN1A/Nav1.1", family:"ion_channel_gene", tissue:["brain"], polymorphic:true, substrateCount:0},
  "SCN2A":   {id:"SCN2A",   type:ACTOR_TYPE.ENZYME, name:"SCN2A/Nav1.2", family:"ion_channel_gene", tissue:["brain"], polymorphic:true, substrateCount:0},
  "KCNH2":   {id:"KCNH2",   type:ACTOR_TYPE.ENZYME, name:"KCNH2/hERG", family:"ion_channel_gene", tissue:["heart"], polymorphic:true, substrateCount:0},
  "MAO-A":   {id:"MAO-A",   type:ACTOR_TYPE.ENZYME, name:"MAO-A",   family:"MAO",    tissue:["gut","liver","brain"],  polymorphic:false,substrateCount:0},
  "MAO-B":   {id:"MAO-B",   type:ACTOR_TYPE.ENZYME, name:"MAO-B",   family:"MAO",    tissue:["brain","platelets"],    polymorphic:false,substrateCount:0},
};

// ── Transporter Actors ──
const CV_ESTIMATES = {
  CYP3A4: 0.60,  // ~60% CV (very high variability)
  CYP2D6: 0.45,  // ~45% CV (moderate; genotype-dependent)
  CYP2C9: 0.40,  // ~40% CV
  CYP2C19:0.55,  // ~55% CV (genotype-dependent)
  CYP1A2: 0.50,  // ~50% CV
  'P-gp': 0.65,  // ~65% CV
  DEFAULT:0.40,
};

// foldChangeBands(centralFold, enzyme) — returns {low, mid, high} for ±1 SD
