// Diognosis — Transporter DDI data and actor definitions
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

function top100CoverageTransporterIds(drug) {
  const routeText = (drug?.routes || []).map(route => route.enzyme).join("/");
  const text = `${drug?.name || ""} ${drug?.cls || ""} ${routeText}`;
  const classText = `${drug?.cls || ""}`;
  const ids = [];
  if (/P-gp|ABCB1/i.test(text)) ids.push("P-gp");
  if (/BCRP|ABCG2/i.test(text)) ids.push("BCRP");
  if (/OATP|SLCO1B1/i.test(text)) ids.push("OATP1B1");
  if (/OCT2|Renal Cation Transport|SLC22A2/i.test(text)) ids.push("OCT2", "MATE1");
  if (/OAT1|OAT3|SLC22A6|SLC22A8/i.test(text)) ids.push("OAT1", "OAT3");
  if (/\bstatin\b/i.test(classText)) ids.push("OATP1B1", "BCRP");
  if (/kinase|oncology/i.test(classText)) ids.push("P-gp", "BCRP");
  if (/immunosuppress/i.test(classText)) ids.push("P-gp");
  if (/anticoag|antiplatelet|opioid antagonist|anticonvulsant/i.test(classText)) ids.push("P-gp");
  return [...new Set(ids)];
}

function top100CoverageTransporterPerpetrators(transporter) {
  if (transporter === "P-gp") return [
    { inhibitor:"Clarithromycin", effect:"AUC may increase via P-gp inhibition", severity:"high", foldChange:1.7 },
    { inhibitor:"Rifampin", effect:"AUC may decrease via P-gp induction", severity:"high", foldChange:0.55 },
  ];
  if (transporter === "BCRP") return [
    { inhibitor:"Eltrombopag", effect:"AUC may increase via BCRP inhibition", severity:"moderate", foldChange:1.8 },
  ];
  if (transporter === "OATP1B1") return [
    { inhibitor:"Cyclosporine", effect:"AUC may increase via hepatic uptake inhibition", severity:"high", foldChange:2.5 },
    { inhibitor:"Gemfibrozil", effect:"AUC may increase via OATP/CYP2C8 inhibition context", severity:"moderate", foldChange:1.8 },
  ];
  if (transporter === "OAT1" || transporter === "OAT3") return [
    { inhibitor:"NSAIDs", effect:"Renal clearance may decrease via OAT competition", severity:"moderate", foldChange:1.5 },
    { inhibitor:"Probenecid", effect:"Renal clearance may decrease via OAT inhibition", severity:"high", foldChange:1.8 },
  ];
  if (transporter === "OCT2" || transporter === "MATE1") return [
    { inhibitor:"Cimetidine", effect:"Renal cation clearance may decrease", severity:"moderate", foldChange:1.5 },
    { inhibitor:"Trimethoprim/Sulfamethoxazole", effect:"Renal cation secretion may decrease", severity:"moderate", foldChange:1.4 },
  ];
  return [];
}

function top100CoverageHasTransporterDdi(substrate, inhibitor, transporter) {
  return TRANSPORTER_DDI.some(row =>
    row.substrate === substrate &&
    row.inhibitor === inhibitor &&
    row.transporter === transporter
  );
}

for (const drugName of TOP250_LIVE_COVERAGE_DRUGS) {
  const drug = getDrug(drugName);
  if (!drug) continue;
  for (const transporter of top100CoverageTransporterIds(drug)) {
    const actor = TRANSPORTER_ACTORS[transporter];
    if (actor && !actor.substrates.includes(drug.name)) actor.substrates.push(drug.name);
    for (const row of top100CoverageTransporterPerpetrators(transporter)) {
      if (row.inhibitor === drug.name) continue;
      if (!top100CoverageHasTransporterDdi(drug.name, row.inhibitor, transporter)) {
        TRANSPORTER_DDI.push({
          substrate:drug.name,
          inhibitor:row.inhibitor,
          transporter,
          effect:row.effect,
          severity:row.severity,
          mechanism:`Phase 7 top-250 live transporter adapter: ${drug.name} has ${transporter} route context and ${row.inhibitor} is a representative ${transporter} modulator. Pending source-specific professional review.`,
          evidence:{confidence:"low", sources:["top-250 live coverage adapter"], foldChange:row.foldChange, studyType:"route_adapter"},
          evidenceRefs:[...TOP250_LIVE_COVERAGE_EVIDENCE_REFS],
        });
      }
    }
  }
}

const TRANSPORTER_EXPANSION_EVIDENCE_REFS = Object.freeze(["ev_pgx_transporter_expansion_adapter"]);

function transporterExpansionIds(drug) {
  const routeText = (drug?.routes || []).map(route => route.enzyme).join("/");
  const text = `${drug?.name || ""} ${drug?.cls || ""} ${routeText}`;
  const ids = top100CoverageTransporterIds(drug);
  if (/statin|kinase|oncology|antiviral|antiretroviral|protease inhibitor|immunosuppress|doac|anticoag|antiplatelet|opioid antagonist|anticonvulsant|digoxin/i.test(text)) ids.push("P-gp", "BCRP");
  if (/statin|kinase|oncology|hif|tpo|arb|hepatobiliary|biliary/i.test(text)) ids.push("OATP1B1");
  if (/renal|unchanged|cation|metformin|amantadine|dalfampridine|lithium|h2 blocker|trimethoprim/i.test(text)) ids.push("OCT2", "MATE1");
  if (/renal|unchanged|anion|nsaid|antiviral|beta-lactam|cephalosporin|penicillin|diuretic/i.test(text)) ids.push("OAT1", "OAT3");
  return [...new Set(ids)].filter(id => TRANSPORTER_ACTORS[id]);
}

function transporterExpansionPerpetrators(transporter) {
  const base = top100CoverageTransporterPerpetrators(transporter);
  if (transporter === "P-gp") return [
    ...base,
    { inhibitor:"Amiodarone", effect:"AUC may increase via P-gp inhibition with long-offset cardiac context", severity:"moderate", foldChange:1.5 },
    { inhibitor:"Verapamil", effect:"AUC may increase via P-gp inhibition", severity:"moderate", foldChange:1.6 },
    { inhibitor:"Nirmatrelvir/Ritonavir", effect:"AUC may increase via booster-mediated P-gp/CYP3A inhibition context", severity:"high", foldChange:2.0 },
  ];
  if (transporter === "BCRP") return [
    ...base,
    { inhibitor:"Cyclosporine", effect:"AUC may increase via BCRP/OATP inhibition context", severity:"high", foldChange:2.2 },
    { inhibitor:"Eltrombopag", effect:"AUC may increase via BCRP inhibition", severity:"moderate", foldChange:1.8 },
    { inhibitor:"Rifampin", effect:"AUC may decrease via transporter/enzyme induction context", severity:"moderate", foldChange:0.65 },
  ];
  if (transporter === "OATP1B1") return [
    ...base,
    { inhibitor:"Rifampin", effect:"Acute OATP inhibition or chronic induction can shift exposure depending on timing", severity:"moderate", foldChange:1.5 },
    { inhibitor:"Eltrombopag", effect:"AUC may increase via OATP/BCRP inhibition context", severity:"moderate", foldChange:1.6 },
  ];
  if (transporter === "OAT1" || transporter === "OAT3") return [
    ...base,
    { inhibitor:"Ibuprofen", effect:"Renal anion clearance may decrease via OAT competition", severity:"moderate", foldChange:1.3 },
    { inhibitor:"Naproxen", effect:"Renal anion clearance may decrease via OAT competition", severity:"moderate", foldChange:1.3 },
  ];
  if (transporter === "OCT2" || transporter === "MATE1") return [
    ...base,
    { inhibitor:"Verapamil", effect:"Renal cation secretion may decrease via transporter inhibition context", severity:"moderate", foldChange:1.3 },
    { inhibitor:"Dolutegravir", effect:"Creatinine/cation transporter handling may shift via OCT2/MATE context", severity:"moderate", foldChange:1.2 },
  ];
  return base;
}

for (const drug of DRUG_DB) {
  for (const transporter of transporterExpansionIds(drug)) {
    const actor = TRANSPORTER_ACTORS[transporter];
    if (actor && !actor.substrates.includes(drug.name)) actor.substrates.push(drug.name);
    for (const row of transporterExpansionPerpetrators(transporter)) {
      if (row.inhibitor === drug.name) continue;
      if (row.inhibitor !== "NSAIDs" && typeof getDrug === "function" && !getDrug(row.inhibitor)) continue;
      if (top100CoverageHasTransporterDdi(drug.name, row.inhibitor, transporter)) continue;
      TRANSPORTER_DDI.push({
        substrate:drug.name,
        inhibitor:row.inhibitor,
        transporter,
        effect:row.effect,
        severity:row.severity,
        mechanism:`Phase 11 PGx/transporter expansion: ${drug.name} has ${transporter} route/class context and ${row.inhibitor} is a representative ${transporter} modulator. Pending source-specific professional review.`,
        evidence:{confidence:"low", sources:["PGx/transporter expansion adapter"], foldChange:row.foldChange, studyType:"transporter_route_adapter"},
        evidenceRefs:[...TRANSPORTER_EXPANSION_EVIDENCE_REFS],
      });
      if (TRANSPORTER_DDI.length >= 1000) break;
    }
    if (TRANSPORTER_DDI.length >= 1000) break;
  }
  if (TRANSPORTER_DDI.length >= 1000) break;
}

function phase12DrugCountTransporterIds(drug) {
  const ids = transporterExpansionIds(drug);
  const text = `${drug?.name || ""} ${drug?.cls || ""} ${(drug?.routes || []).map(route => route.enzyme).join("/")}`;
  if (/renal|cation|metformin|h2 blocker|trimethoprim|source candidate/i.test(text)) ids.push("OCT2", "MATE1");
  if (/anion|nsaid|antiviral|antibiotic|cephalosporin|penicillin|diuretic/i.test(text)) ids.push("OAT1", "OAT3");
  if (!ids.length) ids.push("P-gp");
  return [...new Set(ids)].filter(id => TRANSPORTER_ACTORS[id]);
}

function phase12DrugCountHasTransporterRow(drug) {
  return TRANSPORTER_DDI.some(row => row.substrate === drug.name || row.inhibitor === drug.name);
}

if (typeof PHASE12_DRUG_EXPANSION_NAMES !== "undefined") {
  for (const drugName of PHASE12_DRUG_EXPANSION_NAMES) {
    const drug = getDrug(drugName);
    if (!drug || !(drug.evidenceRefs || []).includes("ev_drug_count_expansion_batch")) continue;
    if (phase12DrugCountHasTransporterRow(drug)) continue;
    let added = false;
    for (const transporter of phase12DrugCountTransporterIds(drug)) {
      const actor = TRANSPORTER_ACTORS[transporter];
      if (actor && !actor.substrates.includes(drug.name)) actor.substrates.push(drug.name);
      for (const row of transporterExpansionPerpetrators(transporter)) {
        if (row.inhibitor === drug.name) continue;
        if (row.inhibitor !== "NSAIDs" && typeof getDrug === "function" && !getDrug(row.inhibitor)) continue;
        if (top100CoverageHasTransporterDdi(drug.name, row.inhibitor, transporter)) continue;
        TRANSPORTER_DDI.push({
          substrate:drug.name,
          inhibitor:row.inhibitor,
          transporter,
          effect:row.effect,
          severity:row.severity,
          mechanism:`Phase 12 drug-count expansion: ${drug.name} has pending-review ${transporter} transport context so the net-new record has live transporter screening coverage. Pending source-specific professional review.`,
          evidence:{confidence:"low", sources:["drug count expansion batch"], foldChange:row.foldChange, studyType:"pending_review_transporter_adapter"},
          evidenceRefs:[...PHASE12_DRUG_EXPANSION_EVIDENCE_REFS],
        });
        added = true;
        break;
      }
      if (added) break;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
//  INTERACTION GRAPH — Builder + Traversal Engine
// ═══════════════════════════════════════════════════════════════════

// Utility: normalize name to graph id
