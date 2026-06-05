// MedCheck — Transporter DDI data and actor definitions
// Phase A: modular source — concatenated by build.js

const TRANSPORTER_DDI = [
{substrate:"Digoxin",inhibitor:"Amiodarone",transporter:"P-gp",effect:"Digoxin AUC ↑ 70%",severity:"high",mechanism:"P-gp inhibition at gut + renal tubule",
  evidence:{confidence:"high",sources:["FDA label"],pmid:["11588492"],foldChange:1.7,studyType:"clinical"}},
{substrate:"Digoxin",inhibitor:"Clarithromycin",transporter:"P-gp",effect:"Digoxin AUC ↑ 70-100%",severity:"critical",mechanism:"Strong P-gp inhibition + kills digoxin-inactivating gut flora",
  evidence:{confidence:"high",sources:["FDA label","literature"],pmid:["12811365"],foldChange:2.0,studyType:"clinical"}},
{substrate:"Digoxin",inhibitor:"Cyclosporine",transporter:"P-gp",effect:"Digoxin AUC ↑ 50%",severity:"high",mechanism:"P-gp inhibition at renal tubule",
  evidence:{confidence:"high",sources:["FDA label"],pmid:["2868837"],foldChange:1.5,studyType:"clinical"}},
{substrate:"Dabigatran",inhibitor:"Ketoconazole",transporter:"P-gp",effect:"Dabigatran AUC ↑ 150%",severity:"critical",mechanism:"Prodrug is P-gp substrate; major bleeding risk",
  evidence:{confidence:"high",sources:["FDA label"],pmid:["19943701"],foldChange:2.5,studyType:"clinical"}},
{substrate:"Dabigatran",inhibitor:"Amiodarone",transporter:"P-gp",effect:"Dabigatran AUC ↑ 60%",severity:"high",mechanism:"P-gp inhibition; FDA dose reduction",
  evidence:{confidence:"high",sources:["FDA label"],foldChange:1.6,studyType:"clinical"}},
{substrate:"Dabigatran",inhibitor:"Rifampin",transporter:"P-gp",effect:"Dabigatran AUC ↓ 67%",severity:"critical",mechanism:"P-gp induction reduces prodrug absorption; anticoagulation failure risk",
  evidence:{confidence:"high",sources:["FDA label"],foldChange:0.33,studyType:"clinical"}},
{substrate:"Digoxin",inhibitor:"Rifampin",transporter:"P-gp",effect:"Digoxin AUC ↓ ~30%",severity:"moderate",mechanism:"P-gp induction reduces digoxin exposure",
  evidence:{confidence:"high",sources:["FDA label","literature"],foldChange:0.7,studyType:"clinical"}},
{substrate:"Digoxin",inhibitor:"St. John's Wort",transporter:"P-gp",effect:"Digoxin AUC ↓ 25-40%",severity:"high",mechanism:"Hyperforin-driven PXR/P-gp induction reduces digoxin exposure",
  evidence:{confidence:"high",sources:["literature"],pmid:["10604132"],foldChange:0.65,studyType:"clinical"}},
{substrate:"Loperamide",inhibitor:"Quinidine",transporter:"P-gp (BBB)",effect:"Loperamide crosses BBB → CNS opioid effects",severity:"critical",mechanism:"P-gp at BBB normally excludes loperamide; inhibition → respiratory depression",
  evidence:{confidence:"high",sources:["literature"],pmid:["12235448"],studyType:"clinical"}},
{substrate:"Atorvastatin",inhibitor:"Cyclosporine",transporter:"OATP1B1",effect:"Atorvastatin AUC ↑ 8x",severity:"critical",mechanism:"Blocks hepatic uptake → systemic statin exposure ↑ → myopathy",
  evidence:{confidence:"high",sources:["FDA label","literature"],pmid:["15328325"],foldChange:8.0,studyType:"clinical"}},
{substrate:"Rosuvastatin",inhibitor:"Cyclosporine",transporter:"OATP1B1",effect:"Rosuvastatin AUC ↑ 7x",severity:"critical",mechanism:"CYP-independent statins still vulnerable via transporters",
  evidence:{confidence:"high",sources:["FDA label"],pmid:["15548098"],foldChange:7.0,studyType:"clinical"}},
{substrate:"Rosuvastatin",inhibitor:"Gemfibrozil",transporter:"OATP1B1",effect:"Rosuvastatin AUC ↑ ~2x",severity:"high",mechanism:"Gemfibrozil inhibits hepatic OATP1B1 uptake",
  evidence:{confidence:"high",sources:["FDA label"],foldChange:2.0,studyType:"clinical"}},
{substrate:"Rosuvastatin",inhibitor:"Eltrombopag",transporter:"OATP1B1/BCRP",effect:"Rosuvastatin AUC ↑ ~3.6x",severity:"high",mechanism:"Eltrombopag inhibits OATP1B1 and BCRP",
  evidence:{confidence:"high",sources:["FDA label"],foldChange:3.6,studyType:"clinical"}},
{substrate:"Methotrexate",inhibitor:"NSAIDs",transporter:"OAT1/OAT3",effect:"MTX clearance ↓ 30-50%",severity:"critical",mechanism:"Competition for renal OAT transporters",
  evidence:{confidence:"high",sources:["FDA label","literature"],pmid:["12042305"],foldChange:1.5,studyType:"clinical"}},
{substrate:"Methotrexate",inhibitor:"Probenecid",transporter:"OAT1/OAT3",effect:"MTX clearance ↓",severity:"critical",mechanism:"Probenecid blocks renal OAT secretion of methotrexate",
  evidence:{confidence:"high",sources:["FDA label","literature"],foldChange:1.5,studyType:"clinical"}},
{substrate:"Metformin",inhibitor:"Cimetidine",transporter:"OCT2/MATE1",effect:"Metformin AUC ↑ 50%",severity:"moderate",mechanism:"Inhibits renal uptake + secretion of metformin",
  evidence:{confidence:"high",sources:["FDA label"],pmid:["7584966"],foldChange:1.5,studyType:"clinical"}},
{substrate:"Metformin",inhibitor:"Dolutegravir",transporter:"OCT2",effect:"Metformin AUC ↑ 79%",severity:"moderate",mechanism:"OCT2+MATE1 inhibition; dose adjustment needed",
  evidence:{confidence:"high",sources:["FDA label","literature"],pmid:["24218476"],foldChange:1.79,studyType:"clinical"}},
{substrate:"Metformin",inhibitor:"Trimethoprim/Sulfamethoxazole",transporter:"OCT2/MATE1",effect:"Metformin AUC ↑ ~40%",severity:"moderate",mechanism:"Trimethoprim inhibits renal OCT2 and MATE1 secretion",
  evidence:{confidence:"high",sources:["clinical PK studies"],pmid:["26953265"],foldChange:1.4,studyType:"clinical"}}
];


// ═══════════════════════════════════════════════════════════════════
//  GRAPH ARCHITECTURE — Actor/Edge type system (Phase 3)
//  Converts the drug-centric data model into a generalized biochemical
//  interaction graph where metabolites, enzymes, transporters, food
//  compounds, and endogenous substrates are all first-class actors.
// ═══════════════════════════════════════════════════════════════════

// ── Actor Types ──
// ── Actor Types ── (graph-first: all biochemical entities are equal actors)
const TRANSPORTER_ACTORS = {
  "P-gp": {
    id:"P-gp", type:ACTOR_TYPE.TRANSPORTER, name:"P-glycoprotein (MDR1/ABCB1)",
    gene:"ABCB1", tissue:["gut","BBB","kidney","liver","placenta"], direction:"efflux",
    substrates:["Digoxin","Dabigatran","Loperamide","Colchicine","Cyclosporine","Tacrolimus","Fexofenadine","Rivaroxaban","Apixaban"],
    inhibitors:[
      {name:"Amiodarone",strength:"strong",evidence:{confidence:"high",sources:["FDA label"]}},
      {name:"Clarithromycin",strength:"strong",evidence:{confidence:"high",sources:["FDA label"]}},
      {name:"Cyclosporine",strength:"strong",evidence:{confidence:"high",sources:["FDA label"]}},
      {name:"Ketoconazole",strength:"strong",evidence:{confidence:"high",sources:["FDA label"]}},
      {name:"Quinidine",strength:"strong",evidence:{confidence:"high",sources:["FDA label"]}},
      {name:"Verapamil",strength:"moderate",evidence:{confidence:"high",sources:["FDA label"]}},
      {name:"Dronedarone",strength:"strong",evidence:{confidence:"high",sources:["FDA label"]}}
    ],
    inducers:[
      {name:"Rifampin",strength:"strong",evidence:{confidence:"high",sources:["FDA label"]}},
      {name:"St. John's Wort",strength:"strong",evidence:{confidence:"high",sources:["literature"]}},
      {name:"Carbamazepine",strength:"moderate",evidence:{confidence:"moderate",sources:["literature"]}}
    ],
    genetics:{
      gene:"ABCB1",
      variants:[
        {rsid:"rs1045642",name:"C3435T",effect:"Reduced P-gp expression in TT genotype",clinicalImpact:"↑ digoxin levels, ↑ CNS drug penetration",
          evidence:{confidence:"moderate",sources:["PharmGKB"],pmid:["11668218"]}},
        {rsid:"rs1128503",name:"C1236T",effect:"Altered P-gp function in haplotype",clinicalImpact:"Part of common haplotype with rs1045642",
          evidence:{confidence:"moderate",sources:["literature"],pmid:["12815591"]}},
        {rsid:"rs2032582",name:"G2677T/A",effect:"Reduced P-gp activity",clinicalImpact:"Affects tacrolimus, cyclosporine dosing",
          evidence:{confidence:"moderate",sources:["literature"],pmid:["14504218"]}}
      ]
    },
    clinicalSignificance:"Major determinant of oral bioavailability and CNS penetration. Rate-limiting for digoxin, dabigatran, and CNS drugs."
  },
  "OATP1B1": {
    id:"OATP1B1", type:ACTOR_TYPE.TRANSPORTER, name:"OATP1B1 (SLCO1B1)",
    gene:"SLCO1B1", tissue:["liver"], direction:"uptake",
    substrates:["Atorvastatin","Rosuvastatin","Simvastatin acid","Pravastatin","Pitavastatin","Repaglinide","Methotrexate","Valsartan"],
    inhibitors:[
      {name:"Cyclosporine",strength:"strong",evidence:{confidence:"high",sources:["FDA label"]}},
      {name:"Gemfibrozil",strength:"strong",evidence:{confidence:"high",sources:["FDA label"]}},
      {name:"Rifampin (single dose)",strength:"strong",evidence:{confidence:"high",sources:["literature"]}},
      {name:"Eltrombopag",strength:"moderate",evidence:{confidence:"moderate",sources:["FDA label"]}}
    ],
    inducers:[],
    genetics:{
      gene:"SLCO1B1",
      variants:[
        {rsid:"rs4149056",name:"*5 (Val174Ala)",effect:"Reduced OATP1B1 transport activity",clinicalImpact:"↑ statin levels → ↑ myopathy risk; CPIC guideline for simvastatin",
          evidence:{confidence:"high",sources:["CPIC","PharmGKB"],pmid:["18650507","22617227"]}},
        {rsid:"rs2306283",name:"*1b (Asn130Asp)",effect:"Increased transport activity",clinicalImpact:"↓ statin levels; may be protective",
          evidence:{confidence:"moderate",sources:["literature"],pmid:["16614727"]}}
      ]
    },
    clinicalSignificance:"Primary hepatic uptake transporter for statins. SLCO1B1*5 is CPIC actionable for simvastatin myopathy risk."
  },
  "OCT2": {
    id:"OCT2", type:ACTOR_TYPE.TRANSPORTER, name:"OCT2 (SLC22A2)",
    gene:"SLC22A2", tissue:["kidney"], direction:"uptake",
    substrates:["Metformin","Cisplatin","Oxaliplatin","Lamivudine","Amantadine"],
    inhibitors:[
      {name:"Cimetidine",strength:"moderate",evidence:{confidence:"high",sources:["FDA label"]}},
      {name:"Dolutegravir",strength:"moderate",evidence:{confidence:"high",sources:["FDA label"]}},
      {name:"Vandetanib",strength:"moderate",evidence:{confidence:"moderate",sources:["literature"]}}
    ],
    inducers:[],
    genetics:{
      gene:"SLC22A2",
      variants:[
        {rsid:"rs316019",name:"808G>T (Ala270Ser)",effect:"Reduced OCT2 transport",clinicalImpact:"↓ metformin renal clearance; ↓ cisplatin nephrotoxicity",
          evidence:{confidence:"moderate",sources:["literature"],pmid:["19436079","20010524"]}}
      ]
    },
    clinicalSignificance:"Renal uptake transporter. Determines metformin renal clearance and cisplatin nephrotoxicity risk."
  },
  "BCRP": {
    id:"BCRP", type:ACTOR_TYPE.TRANSPORTER, name:"BCRP (ABCG2)",
    gene:"ABCG2", tissue:["gut","liver","BBB","placenta","mammary"], direction:"efflux",
    substrates:["Rosuvastatin","Sulfasalazine","Topotecan","Methotrexate","Nitrofurantoin"],
    inhibitors:[
      {name:"Eltrombopag",strength:"strong",evidence:{confidence:"high",sources:["FDA label"]}},
      {name:"Curcumin",strength:"moderate",evidence:{confidence:"low",sources:["literature"]}},
      {name:"Lapatinib",strength:"moderate",evidence:{confidence:"moderate",sources:["literature"]}}
    ],
    inducers:[],
    genetics:{
      gene:"ABCG2",
      variants:[
        {rsid:"rs2231142",name:"Q141K (421C>A)",effect:"Reduced BCRP expression and activity",clinicalImpact:"↑ rosuvastatin levels ~2×; ↑ sulfasalazine AUC; gout risk via ↓ urate secretion",
          evidence:{confidence:"high",sources:["CPIC","PharmGKB"],pmid:["19384066","19474428"]}}
      ]
    },
    clinicalSignificance:"Major efflux transporter at gut/liver. Q141K variant affects rosuvastatin levels and urate excretion."
  },
  "OAT1": {
    id:"OAT1", type:ACTOR_TYPE.TRANSPORTER, name:"OAT1 (SLC22A6)",
    gene:"SLC22A6", tissue:["kidney"], direction:"uptake",
    substrates:["Methotrexate","Adefovir","Cidofovir","Tenofovir","Furosemide","Penicillins"],
    inhibitors:[
      {name:"Probenecid",strength:"strong",evidence:{confidence:"high",sources:["FDA label"]}},
      {name:"NSAIDs",strength:"moderate",evidence:{confidence:"high",sources:["literature"]}}
    ],
    inducers:[],
    genetics:{gene:"SLC22A6",variants:[]},
    clinicalSignificance:"Renal basolateral uptake of organic anions. Key for renal clearance of antivirals, MTX, and uricosuric agents."
  },
  "OAT3": {
    id:"OAT3", type:ACTOR_TYPE.TRANSPORTER, name:"OAT3 (SLC22A8)",
    gene:"SLC22A8", tissue:["kidney","choroid_plexus"], direction:"uptake",
    substrates:["Methotrexate","Furosemide","Pravastatin","Cimetidine","Rosuvastatin"],
    inhibitors:[
      {name:"Probenecid",strength:"strong",evidence:{confidence:"high",sources:["FDA label"]}},
      {name:"NSAIDs",strength:"moderate",evidence:{confidence:"high",sources:["literature"]}},
      {name:"Teriflunomide",strength:"moderate",evidence:{confidence:"moderate",sources:["FDA label"]}}
    ],
    inducers:[],
    genetics:{gene:"SLC22A8",variants:[]},
    clinicalSignificance:"Renal and choroid plexus uptake transporter. Handles many anionic drugs. Major MTX elimination pathway."
  },
  "MATE1": {
    id:"MATE1", type:ACTOR_TYPE.TRANSPORTER, name:"MATE1 (SLC47A1)",
    gene:"SLC47A1", tissue:["kidney","liver"], direction:"efflux",
    substrates:["Metformin","Cimetidine","Oxaliplatin","Topotecan"],
    inhibitors:[
      {name:"Cimetidine",strength:"moderate",evidence:{confidence:"high",sources:["FDA label"]}},
      {name:"Pyrimethamine",strength:"strong",evidence:{confidence:"moderate",sources:["literature"]}},
      {name:"Trimethoprim",strength:"moderate",evidence:{confidence:"moderate",sources:["literature"]}}
    ],
    inducers:[],
    genetics:{
      gene:"SLC47A1",
      variants:[
        {rsid:"rs2289669",name:"g.-66T>C (promoter)",effect:"Reduced MATE1 expression",clinicalImpact:"↑ metformin response (↑ intracellular accumulation in hepatocytes)",
          evidence:{confidence:"moderate",sources:["literature"],pmid:["19134193"]}}
      ]
    },
    clinicalSignificance:"Luminal efflux transporter in kidney/liver. Works with OCT2 for metformin renal elimination. Inhibition → metformin accumulation."
  },
};

// ═══════════════════════════════════════════════════════════════════
//  INTERACTION GRAPH — Builder + Traversal Engine
// ═══════════════════════════════════════════════════════════════════

// Utility: normalize name to graph id
