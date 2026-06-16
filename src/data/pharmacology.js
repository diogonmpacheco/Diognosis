// Diognosis — PK parameters, temporal profiles, phenotype/burden scoring data
// Phase A: modular source — concatenated by build.js

const TEMPORAL_PROFILES = {
  'norfluoxetine':     {onset:'1-2_weeks', offset:'5_weeks',   mechanism:'MBI',          reversible:false, persistenceClass:'long'},
  'hydroxybupropion':  {onset:'days',      offset:'4-5_days',  mechanism:'competitive',  reversible:true,  persistenceClass:'medium'},
  'paroxetine':        {onset:'days',      offset:'2-3_weeks', mechanism:'MBI',          reversible:false, persistenceClass:'long'},
  'amiodarone':        {onset:'weeks',     offset:'months',    mechanism:'MBI+accumulation', reversible:false, persistenceClass:'very_long'},
  'bergamottin':       {onset:'hours',     offset:'24-72h',    mechanism:'MBI_intestinal',reversible:false, persistenceClass:'short',
                        note:'Destroys intestinal CYP3A4; effect is local (gut wall), not systemic'},
  'solanidine':        {onset:'days_to_weeks', offset:'weeks_from_adipose', mechanism:'competitive_chronic',
                        reversible:true, persistenceClass:'long', adiposeRelease:true,
                        note:'Lipophilic depot — elimination kinetics follow adipose distribution, not plasma t½'},
  'rifampin':          {onset:'1-2_weeks', offset:'1-2_weeks', mechanism:'nuclear_receptor_CYP3A4_induction', reversible:true, persistenceClass:'medium'},
  'carbamazepine':     {onset:'2-4_weeks', offset:'2-3_weeks', mechanism:'auto-induction+CYP3A4_ind', reversible:true, persistenceClass:'medium'},
  'st-johns-wort':     {onset:'1-2_weeks', offset:'1_week',    mechanism:'PXR_CYP3A4/P-gp_induction', reversible:true, persistenceClass:'medium'},
  'clarithromycin':    {onset:'hours',     offset:'3_days',    mechanism:'MBI_CYP3A4',          reversible:false, persistenceClass:'short'},
  'erythromycin':      {onset:'hours',     offset:'3_days',    mechanism:'MBI_CYP3A4',          reversible:false, persistenceClass:'short'},
  'fluconazole':       {onset:'days',      offset:'7_days',    mechanism:'competitive_azole',    reversible:true,  persistenceClass:'medium'},
  'itraconazole':      {onset:'days',      offset:'2_weeks',   mechanism:'competitive_azole',    reversible:true,  persistenceClass:'medium'},
  'ketoconazole':      {onset:'hours',     offset:'5_days',    mechanism:'competitive_azole',    reversible:true,  persistenceClass:'medium'},
  'voriconazole':      {onset:'hours',     offset:'5_days',    mechanism:'competitive_azole',    reversible:true,  persistenceClass:'medium'},
  'fluvoxamine':       {onset:'days',      offset:'5_days',    mechanism:'strong_CYP1A2_2C19_inhibition', reversible:true, persistenceClass:'medium'},
  'ciprofloxacin':     {onset:'hours',     offset:'3_days',    mechanism:'competitive_CYP1A2',   reversible:true,  persistenceClass:'short'},
  'phenytoin':         {onset:'1-2_weeks', offset:'2-3_weeks', mechanism:'nuclear_receptor_CYP_induction', reversible:true, persistenceClass:'medium'},
  'primidone':         {onset:'1-2_weeks', offset:'2-3_weeks', mechanism:'phenobarbital_induction', reversible:true, persistenceClass:'medium'},
  'phenelzine':        {onset:'days',      offset:'14_days',   mechanism:'MAOI_irreversible',    reversible:false, persistenceClass:'long'},
  'tranylcypromine':   {onset:'days',      offset:'14_days',   mechanism:'MAOI_irreversible',    reversible:false, persistenceClass:'long'},
  'rasagiline':        {onset:'days',      offset:'14_days',   mechanism:'MAOI_B_irreversible',  reversible:false, persistenceClass:'long'},
  'selegiline':        {onset:'days',      offset:'14_days',   mechanism:'MAOI_B_irreversible',  reversible:false, persistenceClass:'long'},
  'linezolid':         {onset:'hours',     offset:'3_days',    mechanism:'MAOI_reversible',      reversible:true,  persistenceClass:'short'},
  'valproic-acid':     {onset:'days',      offset:'7_days',    mechanism:'UGT_inhibition',       reversible:true,  persistenceClass:'medium'},
};

function getTemporalProfile(actorId) {
  return TEMPORAL_PROFILES[actorId] || null;
}

function getTemporalActorName(graph, actorId, drugName) {
  const actor = graph.actors[actorId];
  if (actor) return actor.name || actorId;
  const drug = typeof getDrug === "function" ? getDrug(drugName) : null;
  if (drug && toGraphId(drug.name) === actorId) return drug.name;
  return actorId;
}

// getTemporalWarnings — check active stack for temporally persistent inhibitors/inducers
// Returns [{actor, profile, warning}] for display
function getTemporalWarnings() {
  const graph = getInteractionGraph();
  const warnings = [];
  for (const drugName of activeStack) {
    const drugId = toGraphId(drugName);
    // Check drug + its metabolites
    const nodeIds = [drugId];
    const metabEdges = (graph.edges||[]).filter(e => e.from === drugId &&
      (e.type === EDGE_TYPE.METABOLIZED_TO || e.type === EDGE_TYPE.ACTIVATES));
    for (const me of metabEdges) nodeIds.push(me.to);

    for (const nid of nodeIds) {
      const profile = getTemporalProfile(nid);
      if (!profile) continue;
      const name = getTemporalActorName(graph, nid, drugName);
      if (profile.persistenceClass === 'long' || profile.persistenceClass === 'very_long') {
        warnings.push({
          actorId: nid, name, profile,
          warning: `${name} (${profile.mechanism}): inhibition persists ${profile.offset} after stopping — plan washout before switching drugs`,
        });
      }
    }
  }
  return warnings;
}


// ═══════════════════════════════════════════════════════════════════
// PK SIMULATION — ONE-COMPARTMENT MODEL (#1)
// C(t) = (F×D/Vd) × (ka/(ka-ke)) × (e^(-ke×t) - e^(-ka×t))
// ═══════════════════════════════════════════════════════════════════

// PK_PARAMS: oral pharmacokinetic parameters for key drugs
// Sources: FDA labels, Goodman & Gilman, DrugBank, clinical PK literature
// F=bioavailability, ka=absorption_rate/h, t½=elimination_halflife_h, Vd=L/kg
function pkKaFromTmax(tmax, halfLife) {
  const ke = 0.693 / halfLife;
  if (!Number.isFinite(tmax) || !Number.isFinite(halfLife) || tmax <= 0 || halfLife <= 0) return 1;
  if (tmax >= 1 / ke) return Number(Math.max(ke * 1.1, 3 / tmax).toFixed(3));

  let lo = ke + 1e-6;
  let hi = 20;
  const predictedTmax = ka => Math.log(ka / ke) / (ka - ke);
  while (predictedTmax(hi) > tmax && hi < 100) hi *= 2;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (predictedTmax(mid) > tmax) lo = mid;
    else hi = mid;
  }
  return Number(((lo + hi) / 2).toFixed(3));
}

const PK_PARAMS = {
  'paroxetine':     { F:0.50, ka:0.40, halfLife:21,   Vd:8.7,  dose_mg:20,
    note:"CYP2D6 substrate. NONLINEAR PK: auto-inhibits own CYP2D6 clearance → disproportionate AUC increase at doses >30mg. Genotype and dose history can materially change exposure.",
    nonlinear:true,
    taperNote:"High-dose (≥40mg/day): taper 5mg/2-4 weeks. Standard 10mg/week guideline is too fast — ADDS risk (Huang 2025)" },
  'fluoxetine':     { F:0.72, ka:0.30, halfLife:53,   Vd:12.0, dose_mg:20,  note:"Active metabolite norfluoxetine t½=168h; very long washout" },
  'sertraline':     { F:0.44, ka:0.60, halfLife:26,   Vd:20.0, dose_mg:50,  note:"Modest CYP2D6 inhibitor" },
  'citalopram':     { F:0.80, ka:0.80, halfLife:35,   Vd:12.0, dose_mg:20,  note:"QTc risk at higher doses (>40mg)" },
  'warfarin':       { F:0.99, ka:2.00, halfLife:37,   Vd:0.14, dose_mg:5,   note:"CYP2C9 substrate; narrow therapeutic window" },
  'clopidogrel':    { F:0.50, ka:1.20, halfLife:6,    Vd:6.0,  dose_mg:75,  note:"CYP2C19 prodrug; active metabolite t½~30min" },
  'codeine':        { F:0.53, ka:1.50, halfLife:3.0,  Vd:3.5,  dose_mg:30,  note:"CYP2D6 prodrug → morphine" },
  'simvastatin':    { F:0.05, ka:2.00, halfLife:2.0,  Vd:1.0,  dose_mg:20,  note:"Extensive first-pass CYP3A4; active acid form" },
  'atorvastatin':   { F:0.12, ka:2.00, halfLife:14,   Vd:5.4,  dose_mg:20,  note:"CYP3A4 substrate; active lactonized metabolite" },
  'digoxin':        { F:0.70, ka:0.80, halfLife:36,   Vd:7.0,  dose_mg:0.125,note:"P-gp substrate; narrow therapeutic index" },
  'amiodarone':     { F:0.50, ka:0.10, halfLife:960,  Vd:60.0, dose_mg:200, note:"t½=40 days; extensive tissue accumulation; very long washout" },
  'methadone':      { F:0.80, ka:0.30, halfLife:24,   Vd:4.0,  dose_mg:30,  note:"QTc risk; variable t½ (8-59h); CYP3A4/2D6/2B6" },
  'rifampin':       { F:0.90, ka:1.20, halfLife:3.5,  Vd:0.9,  dose_mg:600, note:"Potent CYP inducer; self-inducing kinetics" },
  'omeprazole':     { F:0.55, ka:1.50, halfLife:1.0,  Vd:0.3,  dose_mg:20,  note:"CYP2C19 substrate; enantiomer kinetics" },
  'tamoxifen':      { F:0.97, ka:0.20, halfLife:120,  Vd:60.0, dose_mg:20,  note:"CYP2D6 → endoxifen activation; t½=5-7 days" },

  // PK enrichment batch: source-lock values before clinical use.
  'nebivolol':      { F:0.12, ka:pkKaFromTmax(2.0, 12),   halfLife:12, Vd:10.0, dose_mg:5,    note:"F shown for CYP2D6 EM; bioavailability rises markedly in PMs due to reduced first-pass." },
  'metoprolol':     { F:0.50, ka:pkKaFromTmax(1.5, 5),    halfLife:5,  Vd:4.2,  dose_mg:50 },
  'carvedilol':     { F:0.30, ka:pkKaFromTmax(1.5, 7),    halfLife:7,  Vd:1.6,  dose_mg:12.5 },
  'propranolol':    { F:0.26, ka:pkKaFromTmax(1.5, 5),    halfLife:5,  Vd:4.0,  dose_mg:40 },
  'bisoprolol':     { F:0.90, ka:pkKaFromTmax(3.0, 11),   halfLife:11, Vd:3.5,  dose_mg:5 },
  'atenolol':       { F:0.50, ka:pkKaFromTmax(3.0, 7),    halfLife:7,  Vd:0.95, dose_mg:50,   note:"Renally cleared." },
  'risperidone':    { F:0.70, ka:pkKaFromTmax(1.0, 6),    halfLife:6,  Vd:1.5,  dose_mg:2 },
  'haloperidol':    { F:0.60, ka:pkKaFromTmax(4.0, 18),   halfLife:18, Vd:18.0, dose_mg:5 },
  'aripiprazole':   { F:0.87, ka:pkKaFromTmax(4.0, 75),   halfLife:75, Vd:4.9,  dose_mg:10 },
  'atomoxetine':    { F:0.63, ka:pkKaFromTmax(1.5, 24),   halfLife:24, Vd:0.85, dose_mg:40,   note:"F shown for CYP2D6 EM; bioavailability rises in PMs." },
  'amitriptyline':  { F:0.45, ka:pkKaFromTmax(4.0, 20),   halfLife:20, Vd:15.0, dose_mg:25 },
  'nortriptyline':  { F:0.51, ka:pkKaFromTmax(7.0, 30),   halfLife:30, Vd:18.0, dose_mg:25 },
  'venlafaxine':    { F:0.45, ka:pkKaFromTmax(2.0, 5),    halfLife:5,  Vd:7.5,  dose_mg:75,   note:"Immediate-release parent parameters; active O-desmethylvenlafaxine handled separately in pathway data." },
  'duloxetine':     { F:0.50, ka:pkKaFromTmax(6.0, 12),   halfLife:12, Vd:23.0, dose_mg:60 },
  'escitalopram':   { F:0.80, ka:pkKaFromTmax(5.0, 30),   halfLife:30, Vd:12.0, dose_mg:10 },
  'diazepam':       { F:0.90, ka:pkKaFromTmax(1.0, 43),   halfLife:43, Vd:1.1,  dose_mg:5,    note:"Active nordazepam metabolite has a longer half-life." },
  'clobazam':       { F:0.87, ka:pkKaFromTmax(1.5, 36),   halfLife:36, Vd:1.5,  dose_mg:10,   note:"Active N-desmethylclobazam metabolite is CYP2C19-cleared." },
  'midazolam':      { F:0.40, ka:pkKaFromTmax(0.7, 2.5),  halfLife:2.5,Vd:1.5,  dose_mg:7.5 },
  'tramadol':       { F:0.70, ka:pkKaFromTmax(2.0, 6),    halfLife:6,  Vd:2.7,  dose_mg:50,   note:"CYP2D6 prodrug-like activation to O-desmethyltramadol (M1)." },
  'ondansetron':    { F:0.60, ka:pkKaFromTmax(1.5, 4),    halfLife:4,  Vd:2.0,  dose_mg:8 },
  'esomeprazole':   { F:0.68, ka:pkKaFromTmax(1.5, 1.5),  halfLife:1.5,Vd:0.22, dose_mg:40,   note:"Nonlinear exposure; CYP2C19-dependent." },
  'pantoprazole':   { F:0.77, ka:pkKaFromTmax(2.5, 1),    halfLife:1,  Vd:0.17, dose_mg:40 },
  'lansoprazole':   { F:0.81, ka:pkKaFromTmax(1.7, 1.5),  halfLife:1.5,Vd:0.5,  dose_mg:30 },
  'voriconazole':   { F:0.96, ka:pkKaFromTmax(1.5, 6),    halfLife:6,  Vd:4.6,  dose_mg:200,  note:"Saturable Michaelis-Menten metabolism; first-order simulation is approximate." },
  'phenytoin':      { F:0.90, ka:pkKaFromTmax(4.0, 22),   halfLife:22, Vd:0.65, dose_mg:300,  note:"Narrow therapeutic index; nonlinear Michaelis-Menten kinetics make first-order simulation approximate." },
  'ibuprofen':      { F:0.95, ka:pkKaFromTmax(1.5, 2),    halfLife:2,  Vd:0.15, dose_mg:400 },
  'meloxicam':      { F:0.89, ka:pkKaFromTmax(5.0, 20),   halfLife:20, Vd:0.15, dose_mg:15 },
  'naproxen':       { F:0.95, ka:pkKaFromTmax(3.0, 14),   halfLife:14, Vd:0.16, dose_mg:250 },
  'losartan':       { F:0.33, ka:pkKaFromTmax(1.0, 6),    halfLife:6,  Vd:0.5,  dose_mg:50,   note:"Active E-3174 metabolite is more potent and CYP2C9-linked." },
  'glipizide':      { F:1.00, ka:pkKaFromTmax(2.0, 4),    halfLife:4,  Vd:0.16, dose_mg:5 },
  'rosuvastatin':   { F:0.20, ka:pkKaFromTmax(4.0, 19),   halfLife:19, Vd:1.8,  dose_mg:10,   note:"Minimal CYP metabolism; OATP1B1 transport-driven exposure." },
  'amlodipine':     { F:0.74, ka:pkKaFromTmax(8.0, 40),   halfLife:40, Vd:21.0, dose_mg:5 },
  'metformin':      { F:0.55, ka:pkKaFromTmax(2.5, 5),    halfLife:5,  Vd:1.0,  dose_mg:500,  note:"No CYP metabolism; OCT/MATE transporters; renally cleared." },
  'tacrolimus':     { F:0.25, ka:pkKaFromTmax(1.5, 12),   halfLife:12, Vd:1.0,  dose_mg:5,    note:"Whole-blood PK; CYP3A5 expressers often need higher doses; narrow therapeutic index." },
  'sildenafil':     { F:0.41, ka:pkKaFromTmax(1.0, 4),    halfLife:4,  Vd:1.5,  dose_mg:50 },

  // PK simulation expansion: common high-risk exposure-changing medicines.
  'apixaban':       { F:0.50, ka:pkKaFromTmax(3.0, 12),   halfLife:12, Vd:0.30, dose_mg:5,    note:"Factor Xa inhibitor; CYP3A4/P-gp substrate with clinically important inducer/inhibitor exposure shifts." },
  'rivaroxaban':    { F:0.80, ka:pkKaFromTmax(3.0, 9),    halfLife:9,  Vd:0.70, dose_mg:20,   note:"Food-dependent high-dose absorption; CYP3A4/P-gp substrate. Strong inducers can lower anticoagulant exposure." },
  'dabigatran':     { F:0.065,ka:pkKaFromTmax(2.0, 13),   halfLife:13, Vd:0.90, dose_mg:150,  note:"Low-bioavailability prodrug; P-gp and renal function dominate exposure. Capsule integrity matters." },
  'edoxaban':       { F:0.62, ka:pkKaFromTmax(1.5, 11),   halfLife:11, Vd:1.5,  dose_mg:60,   note:"P-gp substrate with substantial renal clearance; exposure changes with P-gp modulation and kidney function." },
  'ticagrelor':     { F:0.36, ka:pkKaFromTmax(1.5, 7),    halfLife:7,  Vd:1.3,  dose_mg:90,   note:"CYP3A substrate with active metabolite; strong CYP3A inhibitors/inducers can markedly change antiplatelet exposure." },
  'prasugrel':      { F:0.79, ka:pkKaFromTmax(0.5, 7),    halfLife:7,  Vd:0.9,  dose_mg:10,   note:"Active metabolite parameterized; parent prodrug is short-lived and not clinically represented by this curve." },
  'cilostazol':     { F:0.90, ka:pkKaFromTmax(2.7, 11),   halfLife:11, Vd:2.8,  dose_mg:100,  note:"Parent plus active metabolites; CYP3A4/CYP2C19 inhibitors require dose reduction." },
  'vorapaxar':      { F:1.00, ka:pkKaFromTmax(1.0, 192),  halfLife:192,Vd:6.0,  dose_mg:2.08, note:"Very long-lived PAR-1 antiplatelet active moiety; exposure and bleeding risk persist for weeks." },
  'cyclosporine':   { F:0.30, ka:pkKaFromTmax(2.0, 8),    halfLife:8,  Vd:4.0,  dose_mg:100,  note:"Highly variable oral bioavailability; CYP3A/P-gp substrate with therapeutic-drug monitoring." },
  'sirolimus':      { F:0.14, ka:pkKaFromTmax(1.5, 62),   halfLife:62, Vd:12.0, dose_mg:2,    note:"Long half-life mTOR inhibitor; CYP3A/P-gp substrate requiring trough monitoring." },
  'everolimus':     { F:0.30, ka:pkKaFromTmax(1.0, 30),   halfLife:30, Vd:1.5,  dose_mg:5,    note:"CYP3A/P-gp substrate; strong inhibitors/inducers can produce large exposure changes." },
  'quetiapine':     { F:0.09, ka:pkKaFromTmax(1.5, 6),    halfLife:6,  Vd:10.0, dose_mg:100,  note:"Extensive CYP3A first-pass metabolism; strong CYP3A inhibitors/inducers can require major dose changes." },
  'lurasidone':     { F:0.19, ka:pkKaFromTmax(2.0, 18),   halfLife:18, Vd:6.0,  dose_mg:40,   note:"Food substantially increases absorption; CYP3A substrate with contraindicated strong inhibitors/inducers." },
  'oxycodone':      { F:0.60, ka:pkKaFromTmax(1.3, 3.5),  halfLife:3.5,Vd:2.6,  dose_mg:10,   note:"CYP3A4 clearance with CYP2D6 oxymorphone formation; inhibitors raise opioid toxicity risk." },
  'fentanyl':       { F:0.33, ka:pkKaFromTmax(1.5, 7),    halfLife:7,  Vd:4.0,  dose_mg:0.6,  note:"Oral/transmucosal parameter approximation; CYP3A substrate and highly formulation-dependent." },
  'clarithromycin': { F:0.55, ka:pkKaFromTmax(2.0, 5),    halfLife:5,  Vd:3.0,  dose_mg:500,  note:"CYP3A/P-gp inhibitor with active 14-hydroxy metabolite; exposure rises with renal impairment." },
  'fluconazole':    { F:0.90, ka:pkKaFromTmax(1.5, 30),   halfLife:30, Vd:0.7,  dose_mg:200,  note:"Renally cleared azole; inhibits CYP2C9/CYP2C19 and moderately inhibits CYP3A." },
  'itraconazole':   { F:0.55, ka:pkKaFromTmax(4.0, 34),   halfLife:34, Vd:10.0, dose_mg:200,  note:"Absorption/formulation and gastric acidity matter; strong CYP3A/P-gp inhibitor." },
  'ketoconazole':   { F:0.75, ka:pkKaFromTmax(2.0, 8),    halfLife:8,  Vd:0.4,  dose_mg:200,  note:"Strong CYP3A inhibitor; systemic use is hepatotoxicity-limited in many settings." },
  'crizotinib':     { F:0.43, ka:pkKaFromTmax(4.0, 42),   halfLife:42, Vd:25.0, dose_mg:250,  note:"CYP3A substrate/inhibitor with QT/bradycardia risk; strong inducers markedly reduce exposure." },
  'enzalutamide':   { F:0.84, ka:pkKaFromTmax(1.0, 140),  halfLife:140,Vd:1.6,  dose_mg:160,  note:"Long-lived androgen receptor inhibitor with active N-desmethyl metabolite and strong induction burden." },
  'apalutamide':    { F:1.00, ka:pkKaFromTmax(2.0, 72),   halfLife:72, Vd:3.9,  dose_mg:240,  note:"Active N-desmethyl metabolite; strong inducer that can lower many victim-drug exposures." },
  'darolutamide':   { F:0.30, ka:pkKaFromTmax(4.0, 20),   halfLife:20, Vd:1.7,  dose_mg:600,  note:"Food increases exposure; BCRP/OATP inhibition can raise rosuvastatin exposure." },
  'lorlatinib':     { F:0.81, ka:pkKaFromTmax(1.2, 24),   halfLife:24, Vd:4.4,  dose_mg:100,  note:"CYP3A substrate and inducer; strong CYP3A inducer co-use is contraindicated because of hepatotoxicity." },
  'alectinib':      { F:0.37, ka:pkKaFromTmax(4.0, 33),   halfLife:33, Vd:4.0,  dose_mg:600,  note:"Active-moiety curve; food strongly increases alectinib+M4 exposure, while CYP3A modulators have limited net active-moiety effect." },
  'brigatinib':     { F:1.00, ka:pkKaFromTmax(2.0, 25),   halfLife:25, Vd:2.0,  dose_mg:180,  note:"CYP3A substrate ALK inhibitor; strong inhibitors raise exposure and rifampin markedly lowers exposure." },
  'capmatinib':     { F:0.70, ka:pkKaFromTmax(1.5, 6),    halfLife:6,  Vd:2.5,  dose_mg:400,  note:"MET inhibitor with CYP3A/AO clearance and P-gp/BCRP inhibition; strong inducers can markedly lower exposure." },
  'sunitinib':      { F:0.50, ka:pkKaFromTmax(8.0, 50),   halfLife:50, Vd:22.0, dose_mg:50,   note:"Parent plus active SU12662 exposure; CYP3A modifiers and QT-risk co-meds can change safety margin." },
  'sorafenib':      { F:0.38, ka:pkKaFromTmax(3.0, 30),   halfLife:30, Vd:3.0,  dose_mg:400,  note:"CYP3A/UGT multikinase inhibitor; strong inducers, warfarin/bleeding, hepatic injury, and QT context matter." },
  'lenvatinib':     { F:0.85, ka:pkKaFromTmax(2.0, 28),   halfLife:28, Vd:1.5,  dose_mg:24,   note:"Mixed CYP3A/AO/nonenzymatic clearance; QT/hypertension/proteinuria risk is more actionable than simple CYP3A modulation." },
  'regorafenib':    { F:0.69, ka:pkKaFromTmax(4.0, 28),   halfLife:28, Vd:1.0,  dose_mg:160,  note:"Active M-2/M-5 metabolites; CYP3A modifiers can shift parent/metabolite balance and BCRP substrates can rise." },
  'axitinib':       { F:0.58, ka:pkKaFromTmax(3.0, 6),     halfLife:6,  Vd:2.3,  dose_mg:5,    note:"CYP3A-sensitive VEGFR TKI; strong inhibitors/inducers can require dose changes and BP/hepatic monitoring." },
  'lumateperone':   { F:0.04, ka:pkKaFromTmax(2.0, 18),    halfLife:18, Vd:4.1,  dose_mg:42,   note:"CYP3A/UGT/AKR antipsychotic; strong CYP3A inhibitors require lower dose and inducers should be avoided." },
  'levomilnacipran':{ F:0.92, ka:pkKaFromTmax(6.0, 12),    halfLife:12, Vd:5.0,  dose_mg:40,   note:"SNRI with renal excretion and CYP3A contribution; strong CYP3A inhibitors cap maximum dose." },
  'asenapine':      { F:0.35, ka:pkKaFromTmax(1.0, 24),    halfLife:24, Vd:20.0, dose_mg:5,    note:"Sublingual/transdermal antipsychotic approximation; UGT1A4/CYP1A2 clearance and CYP2D6 victim context matter." },

  // PK simulation expansion: primary-care, psychiatry, neurology, endocrine, transplant.
  'fluvoxamine':     { F:0.53, ka:pkKaFromTmax(5.0, 15),   halfLife:15, Vd:25.0, dose_mg:100,  note:"Strong CYP1A2 and CYP2C19 inhibitor; PK curve is parent-only and does not encode inhibition persistence." },
  'bupropion':       { F:0.05, ka:pkKaFromTmax(2.0, 21),   halfLife:21, Vd:19.0, dose_mg:150,  note:"Parent exposure is not the whole signal; hydroxybupropion is active and drives much CYP2D6 inhibition." },
  'mirtazapine':     { F:0.50, ka:pkKaFromTmax(2.0, 30),   halfLife:30, Vd:4.5,  dose_mg:15,   note:"CYP1A2/2D6/3A substrate with sedating exposure-response context." },
  'carbamazepine':   { F:0.85, ka:pkKaFromTmax(6.0, 30),   halfLife:30, Vd:1.4,  dose_mg:200,  note:"Autoinduction shortens half-life over weeks; first-order curve is an early-treatment approximation." },
  'valproic_acid':   { F:0.90, ka:pkKaFromTmax(4.0, 14),   halfLife:14, Vd:0.15, dose_mg:500,  note:"Protein binding is concentration dependent; UGT/mitochondrial toxicity context is not captured by a simple curve." },
  'lamotrigine':     { F:0.98, ka:pkKaFromTmax(2.5, 25),   halfLife:25, Vd:1.0,  dose_mg:100,  note:"UGT1A4 clearance; valproate roughly doubles exposure while estrogen-containing contraceptives can reduce it." },
  'levetiracetam':   { F:1.00, ka:pkKaFromTmax(1.0, 7),    halfLife:7,  Vd:0.7,  dose_mg:500,  note:"Renally cleared with low CYP interaction burden." },
  'topiramate':      { F:0.80, ka:pkKaFromTmax(2.0, 21),   halfLife:21, Vd:0.7,  dose_mg:100,  note:"Renal clearance dominates; enzyme induction is dose-dependent at higher doses." },
  'gabapentin':      { F:0.60, ka:pkKaFromTmax(3.0, 6),    halfLife:6,  Vd:0.8,  dose_mg:300,  note:"Saturable L-amino-acid transporter absorption; bioavailability falls at higher doses." },
  'pregabalin':      { F:0.90, ka:pkKaFromTmax(1.5, 6),    halfLife:6,  Vd:0.5,  dose_mg:75,   note:"Renally cleared; dose changes track kidney function more than CYP genotype." },
  'lithium':         { F:0.95, ka:pkKaFromTmax(2.0, 24),   halfLife:24, Vd:0.8,  dose_mg:300,  note:"Narrow therapeutic index; renal clearance, sodium balance, and diuretics dominate risk." },
  'olanzapine':      { F:0.60, ka:pkKaFromTmax(6.0, 30),   halfLife:30, Vd:15.0, dose_mg:10,   note:"CYP1A2 substrate; smoking induction and fluvoxamine/ciprofloxacin inhibition can change exposure." },
  'clozapine':       { F:0.60, ka:pkKaFromTmax(2.5, 12),   halfLife:12, Vd:1.6,  dose_mg:100,  note:"CYP1A2-sensitive narrow-safety antipsychotic; smoking changes and CYP1A2 inhibitors are high impact." },
  'levothyroxine':   { F:0.75, ka:pkKaFromTmax(2.0, 168),  halfLife:168,Vd:0.15, dose_mg:0.1,  note:"Long half-life thyroid hormone; absorption is reduced by minerals, resins, and some acid-suppression contexts. Dose is mg, so 0.1 mg = 100 mcg." },
  'mycophenolate':   { F:0.94, ka:pkKaFromTmax(1.0, 17),   halfLife:17, Vd:4.0,  dose_mg:1000, note:"Mofetil prodrug represented as active MPA exposure; enterohepatic recycling and formulation matter." },
  'dasatinib':       { F:0.35, ka:pkKaFromTmax(0.5, 5),    halfLife:5,  Vd:35.0, dose_mg:100,  note:"Acid-dependent absorption and CYP3A clearance; H2/PPI co-use can markedly reduce exposure." },
  'erlotinib':       { F:0.60, ka:pkKaFromTmax(4.0, 36),   halfLife:36, Vd:3.3,  dose_mg:150,  note:"Acid-dependent EGFR TKI; smoking/CYP1A2 induction and CYP3A modulation change exposure." },
  'gefitinib':       { F:0.60, ka:pkKaFromTmax(5.0, 48),   halfLife:48, Vd:20.0, dose_mg:250,  note:"CYP2D6/CYP3A substrate; CYP2D6 PM status and acid reducers can raise or lower exposure signals." },
  'nilotinib':       { F:0.30, ka:pkKaFromTmax(3.0, 17),   halfLife:17, Vd:8.0,  dose_mg:300,  note:"Food and strong CYP3A inhibitors can increase exposure; QT risk makes exposure changes clinically important." },
  'amphetamine':     { F:0.75, ka:pkKaFromTmax(3.0, 10),   halfLife:10, Vd:3.5,  dose_mg:10,   note:"Urinary pH substantially changes renal elimination; curve assumes typical urine pH." },
  'lisdexamfetamine':{ F:0.96, ka:pkKaFromTmax(3.5, 11),   halfLife:11, Vd:3.5,  dose_mg:30,   note:"Prodrug represented as d-amphetamine active-moiety exposure; enzymatic conversion is not CYP-driven." },
  'methylphenidate': { F:0.30, ka:pkKaFromTmax(2.0, 3),    halfLife:3,  Vd:2.7,  dose_mg:20,   note:"CES1 metabolism and formulation shape exposure; immediate-release approximation." },
  'dexmethylphenidate':{ F:0.22, ka:pkKaFromTmax(1.5, 3),  halfLife:3,  Vd:2.7,  dose_mg:10,   note:"Active d-enantiomer; immediate-release approximation." },
  'ciprofloxacin':   { F:0.70, ka:pkKaFromTmax(1.5, 4),    halfLife:4,  Vd:2.5,  dose_mg:500,  note:"Cation chelation can reduce oral absorption; also inhibits CYP1A2." },
  'levofloxacin':    { F:0.99, ka:pkKaFromTmax(1.5, 7),    halfLife:7,  Vd:1.1,  dose_mg:500,  note:"High oral bioavailability, but multivalent cations can reduce absorption." },
  'moxifloxacin':    { F:0.90, ka:pkKaFromTmax(2.0, 12),   halfLife:12, Vd:2.0,  dose_mg:400,  note:"High oral bioavailability; multivalent cations reduce absorption and QT-risk context matters." },
  'doxycycline':     { F:0.90, ka:pkKaFromTmax(2.5, 18),   halfLife:18, Vd:0.7,  dose_mg:100,  note:"Cation chelation reduces absorption; minimal CYP metabolism." },
  'minocycline':     { F:0.90, ka:pkKaFromTmax(2.0, 16),   halfLife:16, Vd:1.0,  dose_mg:100,  note:"Tetracycline-class chelation and vestibular toxicity context; limited CYP burden." },

  // PK simulation expansion: under-covered transplant, TB, and antiparasitic medicines.
  'letermovir':      { F:0.94, ka:pkKaFromTmax(1.5, 12),   halfLife:12, Vd:0.9,  dose_mg:480,  note:"CMV prophylaxis; cyclosporine requires lower letermovir dose and CYP3A/OATP interactions affect immunosuppressants/statins." },
  'maribavir':       { F:0.90, ka:pkKaFromTmax(1.0, 4),    halfLife:4,  Vd:0.4,  dose_mg:400,  note:"CMV UL97 inhibitor; strong inducers lower exposure and UL97 inhibition antagonizes ganciclovir/valganciclovir activation." },
  'valganciclovir':  { F:0.60, ka:pkKaFromTmax(3.0, 4),    halfLife:4,  Vd:0.7,  dose_mg:900,  note:"Oral prodrug represented as ganciclovir active exposure; food and renal function materially affect exposure." },
  'rifapentine':     { F:0.70, ka:pkKaFromTmax(6.0, 13),   halfLife:13, Vd:1.0,  dose_mg:900,  note:"Longer-acting rifamycin inducer; induction persists beyond parent concentration curve." },
  'bedaquiline':     { F:1.00, ka:pkKaFromTmax(5.0, 132),  halfLife:132,Vd:164.0,dose_mg:400,  note:"Very long terminal half-life and tissue distribution; CYP3A induction lowers exposure and QT risk accumulates in MDR-TB regimens." },
  'delamanid':       { F:0.45, ka:pkKaFromTmax(4.0, 38),   halfLife:38, Vd:20.0, dose_mg:100,  note:"Food increases exposure; QT risk and albumin/CYP3A metabolism make simple first-order simulation approximate." },
  'pyrazinamide':    { F:0.90, ka:pkKaFromTmax(2.0, 10),   halfLife:10, Vd:0.7,  dose_mg:1500, note:"TB drug; hepatic injury and hyperuricemia dominate clinical risk more than CYP interactions." },
  'ethambutol':      { F:0.80, ka:pkKaFromTmax(2.5, 4),    halfLife:4,  Vd:3.0,  dose_mg:1200, note:"Renally cleared TB drug; optic neuropathy and renal adjustment dominate risk." },
  'praziquantel':    { F:0.80, ka:pkKaFromTmax(2.0, 1.5),  halfLife:1.5,Vd:2.5,  dose_mg:1200, note:"High first-pass CYP3A substrate; rifampin can markedly reduce antiparasitic exposure." },
  'atovaquone':      { F:0.23, ka:pkKaFromTmax(5.0, 70),   halfLife:70, Vd:8.8,  dose_mg:750,  note:"Food/fat-dependent absorption; rifampin/rifabutin and tetracycline can reduce exposure." },
  'proguanil':       { F:0.75, ka:pkKaFromTmax(4.0, 14),   halfLife:14, Vd:20.0, dose_mg:100,  note:"CYP2C19 prodrug to cycloguanil; atovaquone/proguanil efficacy is multi-factorial." },
  'argatroban':      { F:1.00, ka:pkKaFromTmax(0.2, 0.75),  halfLife:0.75,Vd:0.17, dose_mg:50, note:"Infusion anticoagulant approximation; hepatic clearance, aPTT titration, bleeding, and warfarin-transition INR effects dominate." },
  'amphotericin_b':  { F:1.00, ka:pkKaFromTmax(0.5, 24),    halfLife:24, Vd:4.0,  dose_mg:50,   note:"Infusion/tissue-distribution approximation; nephrotoxicity and electrolyte wasting are the key interaction mechanisms." },
  'belinostat':      { F:1.00, ka:pkKaFromTmax(0.5, 1),     halfLife:1,  Vd:0.6,  dose_mg:1000, note:"Infusion approximation; UGT1A1 glucuronidation and myelosuppression/hepatic monitoring are key." },

  // PK simulation expansion: HIV, PARP/HDAC oncology, renal-clearance, and prodrug blind spots.
  'darunavir':       { F:0.37, ka:pkKaFromTmax(4.0, 15),   halfLife:15, Vd:2.0,  dose_mg:800,  note:"Boosted PI exposure is regimen-dependent; CYP3A/P-gp inhibition and rifamycin induction dominate risk." },
  'rilpivirine':     { F:0.45, ka:pkKaFromTmax(4.0, 50),   halfLife:50, Vd:2.0,  dose_mg:25,   note:"Must be taken with food; acid suppression and CYP3A induction can cause antiviral underexposure." },
  'bictegravir':     { F:0.70, ka:pkKaFromTmax(2.5, 18),   halfLife:18, Vd:0.9,  dose_mg:50,   note:"CYP3A/UGT1A1 substrate; cation chelation and rifampin-like induction lower exposure." },
  'tenofovir_alafenamide':{ F:0.25, ka:pkKaFromTmax(1.0, 0.5), halfLife:0.5, Vd:1.2, dose_mg:25, note:"Plasma prodrug curve only; intracellular tenofovir diphosphate persists longer and is the active antiviral exposure." },
  'lamivudine':      { F:0.86, ka:pkKaFromTmax(1.0, 6),    halfLife:6,  Vd:1.3,  dose_mg:300,  note:"Renally cleared unchanged; trimethoprim and kidney function can increase exposure." },
  'emtricitabine':   { F:0.93, ka:pkKaFromTmax(2.0, 10),   halfLife:10, Vd:1.4,  dose_mg:200,  note:"Renally cleared NRTI with low CYP burden; regimen context and kidney function dominate." },
  'flucytosine':     { F:0.85, ka:pkKaFromTmax(2.0, 3),    halfLife:3,  Vd:0.7,  dose_mg:1500, note:"Renally cleared with concentration-dependent marrow/GI/hepatic toxicity; TDM is preferred in serious fungal infection." },
  'olaparib':        { F:0.70, ka:pkKaFromTmax(1.5, 15),   halfLife:15, Vd:2.4,  dose_mg:300,  note:"CYP3A substrate PARP inhibitor; inhibitors require dose reduction and inducers risk loss of efficacy." },
  'rucaparib':       { F:0.36, ka:pkKaFromTmax(2.0, 17),   halfLife:17, Vd:1.7,  dose_mg:600,  note:"PARP inhibitor with multi-CYP metabolism and clinically relevant CYP1A2/CYP2C9 substrate inhibition." },
  'niraparib':       { F:0.73, ka:pkKaFromTmax(3.0, 36),   halfLife:36, Vd:17.0, dose_mg:200,  note:"Less CYP-dependent PARP inhibitor; myelosuppression, BP, and renal/hepatic context dominate." },
  'talazoparib':     { F:0.56, ka:pkKaFromTmax(1.0, 90),   halfLife:90, Vd:6.0,  dose_mg:1,    note:"Long half-life PARP inhibitor; P-gp/BCRP inhibition and renal impairment can raise exposure." },
  'romidepsin':      { F:1.00, ka:pkKaFromTmax(0.5, 3),    halfLife:3,  Vd:0.7,  dose_mg:14,   note:"Infusion approximation; CYP3A exposure shifts, ECG context, and warfarin PT/INR monitoring matter." },
  'abiraterone':     { F:0.10, ka:pkKaFromTmax(2.0, 12),   halfLife:12, Vd:4.0,  dose_mg:1000, note:"Food can massively increase exposure; CYP2D6/CYP2C8 inhibition and mineralocorticoid toxicity are key." },
  'clorazepate':     { F:0.90, ka:pkKaFromTmax(1.0, 80),   halfLife:80, Vd:1.0,  dose_mg:7.5,  note:"Prodrug represented as long-lived nordiazepam active-moiety exposure; older age and inhibitors can prolong sedation." },
  'midodrine':       { F:0.93, ka:pkKaFromTmax(1.0, 3),    halfLife:3,  Vd:0.7,  dose_mg:10,   note:"Prodrug represented as active desglymidodrine pressor exposure; BP timing is more important than CYP metabolism." },
  'droxidopa':       { F:0.90, ka:pkKaFromTmax(2.0, 2.5),  halfLife:2.5,Vd:0.9,  dose_mg:300,  note:"Prodrug to norepinephrine; pressor interactions and supine hypertension drive safety." },
  'nitazoxanide':    { F:0.70, ka:pkKaFromTmax(2.0, 1.5),  halfLife:1.5,Vd:0.5,  dose_mg:500,  note:"Parent rapidly forms active tizoxanide; low CYP burden, glucuronidation and protein binding context matter." },
  'dipyridamole':    { F:0.60, ka:pkKaFromTmax(2.0, 10),   halfLife:10, Vd:2.0,  dose_mg:75,   note:"Antiplatelet/vasodilator; additive bleeding/hypotension more important than CYP metabolism." },
  'artemether_lumefantrine':{ F:0.40, ka:pkKaFromTmax(6.0, 96), halfLife:96, Vd:5.0, dose_mg:480, note:"Active-moiety approximation weighted toward long-lived lumefantrine; food and CYP3A induction are high-impact." },

  // PK simulation expansion: public-label high-value common/NTI/renal/nonlinear gaps.
  'pravastatin':     { F:0.17, ka:pkKaFromTmax(1.5, 1.8),  halfLife:1.8,Vd:0.5,  dose_mg:40,   note:"Hydrophilic statin with OATP uptake and renal/biliary elimination; relative CYP fallback would overstate CYP interaction relevance." },
  'lovastatin':      { F:0.05, ka:pkKaFromTmax(2.0, 2.9),  halfLife:2.9,Vd:0.7,  dose_mg:20,   note:"Extensive first-pass CYP3A substrate; active beta-hydroxy acid exposure is the clinically relevant statin signal." },
  'fluvastatin':     { F:0.24, ka:pkKaFromTmax(0.5, 1.2),  halfLife:1.2,Vd:0.35, dose_mg:40,   note:"CYP2C9-predominant statin; short parent half-life does not fully describe LDL-response duration." },
  'pitavastatin':    { F:0.51, ka:pkKaFromTmax(1.0, 12),   halfLife:12, Vd:2.1,  dose_mg:2,    note:"Minimal CYP metabolism; UGT/OATP/BCRP transporter context is more important than CYP-only fallback." },
  'alprazolam':      { F:0.90, ka:pkKaFromTmax(2.0, 11.2), halfLife:11.2,Vd:1.0, dose_mg:0.5,  note:"CYP3A benzodiazepine; strong inhibitors can prolong sedation and psychomotor impairment." },
  'lorazepam':       { F:0.90, ka:pkKaFromTmax(2.0, 12),   halfLife:12, Vd:1.3,  dose_mg:1,    note:"UGT-cleared benzodiazepine with no major CYP route; renal/hepatic frailty affects glucuronide handling and sedation." },
  'clonazepam':      { F:0.90, ka:pkKaFromTmax(2.0, 30),   halfLife:30, Vd:3.0,  dose_mg:0.5,  note:"Long half-life benzodiazepine; accumulation and additive CNS depression make relative single-curve fallback misleading." },
  'oxazepam':        { F:0.95, ka:pkKaFromTmax(2.0, 8),    halfLife:8,  Vd:0.9,  dose_mg:15,   note:"UGT-cleared benzodiazepine; often preferred when CYP oxidative metabolism is a concern." },
  'temazepam':       { F:0.96, ka:pkKaFromTmax(1.5, 9),    halfLife:9,  Vd:1.3,  dose_mg:15,   note:"UGT-cleared hypnotic benzodiazepine; next-day sedation is more exposure-context dependent in older adults." },
  'triazolam':       { F:0.44, ka:pkKaFromTmax(1.0, 2),    halfLife:2,  Vd:1.3,  dose_mg:0.25, note:"Short-acting CYP3A benzodiazepine; strong CYP3A inhibitors can markedly raise hypnotic exposure." },
  'zolpidem':        { F:0.70, ka:pkKaFromTmax(1.6, 2.5),  halfLife:2.5,Vd:0.54, dose_mg:10,   note:"Sex/age and hepatic impairment affect exposure; formulation changes can dominate the shape of the curve." },
  'eszopiclone':     { F:0.80, ka:pkKaFromTmax(1.0, 6),    halfLife:6,  Vd:1.3,  dose_mg:3,    note:"CYP3A/CYP2E1 hypnotic; strong CYP3A inhibitors and hepatic impairment increase next-day impairment risk." },
  'buspirone':       { F:0.04, ka:pkKaFromTmax(1.0, 3),    halfLife:3,  Vd:5.3,  dose_mg:10,   note:"Very high first-pass CYP3A substrate; grapefruit/strong CYP3A inhibitors can greatly increase exposure despite short half-life." },
  'trazodone':       { F:0.65, ka:pkKaFromTmax(1.0, 8),    halfLife:8,  Vd:0.8,  dose_mg:50,   note:"CYP3A substrate with active mCPP metabolite; sedation, orthostasis, and QT context can exceed parent-curve signal." },
  'vortioxetine':    { F:0.75, ka:pkKaFromTmax(10, 66),    halfLife:66, Vd:37.0, dose_mg:10,   note:"Long half-life CYP2D6-sensitive antidepressant; dose changes and inhibitors take weeks to equilibrate." },
  'desvenlafaxine':  { F:0.80, ka:pkKaFromTmax(7.5, 11),   halfLife:11, Vd:3.4,  dose_mg:50,   note:"Active venlafaxine metabolite; renal clearance is clinically important and CYP2D6 genotype is less central." },
  'milnacipran':     { F:0.85, ka:pkKaFromTmax(2.0, 8),    halfLife:8,  Vd:5.3,  dose_mg:50,   note:"Renal excretion dominates; kidney function and blood-pressure/heart-rate effects matter more than CYP modulation." },
  'imipramine':      { F:0.43, ka:pkKaFromTmax(2.0, 16),   halfLife:16, Vd:21.0, dose_mg:50,   note:"CYP2D6/CYP2C19 TCA with active desipramine metabolite; narrow safety margin and TDM context." },
  'clomipramine':    { F:0.50, ka:pkKaFromTmax(2.5, 32),   halfLife:32, Vd:17.0, dose_mg:25,   note:"Serotonergic TCA with active desmethylclomipramine; CYP2D6/CYP2C19 changes can shift parent/metabolite balance." },
  'doxepin':         { F:0.13, ka:pkKaFromTmax(2.0, 15),   halfLife:15, Vd:20.0, dose_mg:25,   note:"CYP2D6/CYP2C19 TCA; anticholinergic/sedation burden can be clinically larger than parent PK alone." },
  'desipramine':     { F:0.80, ka:pkKaFromTmax(4.0, 24),   halfLife:24, Vd:18.0, dose_mg:25,   note:"CYP2D6-sensitive TCA; narrow safety margin, QT, and TDM context make genotype/DDI shifts high value." },
  'linezolid':       { F:1.00, ka:pkKaFromTmax(1.5, 5),    halfLife:5,  Vd:0.6,  dose_mg:600,  note:"High oral bioavailability oxazolidinone; renal impairment increases metabolite exposure and serotonin/MAOI context is not captured by PK curve." },
  'azithromycin':    { F:0.37, ka:pkKaFromTmax(2.0, 68),   halfLife:68, Vd:31.0, dose_mg:500,  note:"Very large tissue distribution and long terminal half-life; relative plasma fallback understates persistence and QT context." },
  'erythromycin':    { F:0.35, ka:pkKaFromTmax(2.0, 2),    halfLife:2,  Vd:0.8,  dose_mg:500,  note:"CYP3A substrate/inhibitor with formulation-dependent absorption; QT and prokinetic effects matter beyond parent exposure." },
  'amoxicillin':     { F:0.75, ka:pkKaFromTmax(1.0, 1),    halfLife:1,  Vd:0.3,  dose_mg:500,  note:"Renally cleared beta-lactam; time above MIC and kidney function dominate, not CYP interactions." },
  'cephalexin':      { F:0.90, ka:pkKaFromTmax(1.0, 1),    halfLife:1,  Vd:0.23, dose_mg:500,  note:"Renally excreted cephalosporin; renal function is the key exposure modifier." },
  'cefuroxime':      { F:0.37, ka:pkKaFromTmax(2.5, 1.5),  halfLife:1.5,Vd:0.2,  dose_mg:500,  note:"Axetil oral prodrug approximation; food improves absorption and renal clearance dominates." },
  'ceftriaxone':     { F:1.00, ka:pkKaFromTmax(0.5, 8),    halfLife:8,  Vd:0.12, dose_mg:1000, note:"Parenteral approximation; high protein binding and biliary/renal elimination make albumin and cholestasis context important." },
  'cefepime':        { F:1.00, ka:pkKaFromTmax(0.5, 2),    halfLife:2,  Vd:0.25, dose_mg:1000, note:"Parenteral renal-clearance approximation; renal impairment strongly raises neurotoxicity risk." },
  'piperacillin_tazobactam':{ F:1.00, ka:pkKaFromTmax(0.5, 1), halfLife:1, Vd:0.25, dose_mg:4500, note:"Parenteral beta-lactam/beta-lactamase inhibitor approximation; renal function and infusion strategy dominate exposure." },
  'vancomycin':      { F:1.00, ka:pkKaFromTmax(0.5, 6),    halfLife:6,  Vd:0.7,  dose_mg:1000, note:"Parenteral/TDM approximation; narrow safety margin with renal clearance and AUC-guided monitoring." },
  'gentamicin':      { F:1.00, ka:pkKaFromTmax(0.5, 2.5),  halfLife:2.5,Vd:0.25, dose_mg:300,  note:"Parenteral aminoglycoside approximation; renal clearance, peak/trough monitoring, nephrotoxicity, and ototoxicity dominate." },
  'tobramycin':      { F:1.00, ka:pkKaFromTmax(0.5, 2.5),  halfLife:2.5,Vd:0.3,  dose_mg:300,  note:"Parenteral aminoglycoside approximation; renal clearance and TDM dominate exposure and toxicity." },
  'acyclovir':       { F:0.20, ka:pkKaFromTmax(2.0, 3),    halfLife:3,  Vd:0.7,  dose_mg:400,  note:"Renally eliminated guanosine analog; renal impairment, hydration, and probenecid can raise neuro/renal toxicity risk." },
  'valacyclovir':    { F:0.54, ka:pkKaFromTmax(2.0, 3),    halfLife:3,  Vd:0.7,  dose_mg:1000, note:"Prodrug represented as acyclovir active exposure; renal function dominates dose adjustment." },
  'oseltamivir':     { F:0.80, ka:pkKaFromTmax(3.0, 6),    halfLife:6,  Vd:0.3,  dose_mg:75,   note:"Prodrug represented as oseltamivir carboxylate active exposure; renal clearance dominates exposure." },
  'atazanavir':      { F:0.68, ka:pkKaFromTmax(2.5, 7),    halfLife:7,  Vd:1.2,  dose_mg:300,  note:"CYP3A protease inhibitor with food/acid-dependent exposure and UGT1A1 hyperbilirubinemia context." },
  'ritonavir':       { F:0.75, ka:pkKaFromTmax(3.0, 5),    halfLife:5,  Vd:0.4,  dose_mg:100,  note:"PK enhancer; inhibition/induction effects outlast and exceed what a parent concentration curve can convey." },
  'lopinavir':       { F:0.80, ka:pkKaFromTmax(4.0, 6),    halfLife:6,  Vd:0.3,  dose_mg:400,  note:"Usually ritonavir-boosted; CYP3A inhibition/induction context is regimen-dependent." },
  'dolutegravir':    { F:0.70, ka:pkKaFromTmax(3.0, 14),   halfLife:14, Vd:0.25, dose_mg:50,   note:"UGT1A1/CYP3A substrate; polyvalent cations and rifampin-like induction can lower antiviral exposure." },
  'raltegravir':     { F:0.60, ka:pkKaFromTmax(3.0, 9),    halfLife:9,  Vd:1.0,  dose_mg:400,  note:"UGT1A1 integrase inhibitor; antacid/cation interactions and formulation differences can dominate exposure." },
  'efavirenz':       { F:0.45, ka:pkKaFromTmax(3.0, 52),   halfLife:52, Vd:3.5,  dose_mg:600,  note:"Long half-life CYP2B6-sensitive NNRTI; genotype, induction, and CNS toxicity make relative fallback incomplete." },
  'nevirapine':      { F:0.90, ka:pkKaFromTmax(4.0, 30),   halfLife:30, Vd:1.2,  dose_mg:200,  note:"Autoinducing NNRTI; early half-life shortens after repeated dosing, so first-order parent curve is approximate." },
  'posaconazole':    { F:0.54, ka:pkKaFromTmax(5.0, 35),   halfLife:35, Vd:25.0, dose_mg:300,  note:"Formulation, food, and gastric conditions strongly affect exposure; strong CYP3A inhibition is clinically important." },
  'isavuconazonium_sulfate':{ F:0.98, ka:pkKaFromTmax(3.0, 130), halfLife:130, Vd:6.4, dose_mg:372, note:"Prodrug represented as isavuconazole active exposure; long half-life and CYP3A interactions make changes slow to resolve." },
  'terbinafine':     { F:0.70, ka:pkKaFromTmax(1.5, 36),   halfLife:36, Vd:16.0, dose_mg:250,  note:"Long terminal tissue persistence and CYP2D6 inhibition; short relative fallback understates washout." },
  'hydroxychloroquine':{ F:0.74, ka:pkKaFromTmax(3.0, 960), halfLife:960,Vd:44.0, dose_mg:200, note:"Very long terminal half-life with tissue distribution; renal/hepatic impairment and QT context matter." },
  'methotrexate':    { F:0.70, ka:pkKaFromTmax(1.0, 6),    halfLife:6,  Vd:0.7,  dose_mg:15,   note:"Renally cleared narrow-safety antimetabolite; oral absorption is saturable at higher doses and interacting nephrotoxins/NSAIDs matter.", nonlinear:true },
  'colchicine':      { F:0.45, ka:pkKaFromTmax(1.5, 30),   halfLife:30, Vd:5.0,  dose_mg:0.6,  note:"Narrow safety margin P-gp/CYP3A substrate; renal/hepatic impairment plus inhibitors can cause fatal toxicity." },
  'allopurinol':     { F:0.90, ka:pkKaFromTmax(1.5, 2),    halfLife:2,  Vd:0.6,  dose_mg:300,  note:"Active oxypurinol metabolite has much longer renal half-life; parent curve alone understates persistence in kidney impairment." },
  'probenecid':      { F:0.90, ka:pkKaFromTmax(4.0, 6),    halfLife:6,  Vd:0.2,  dose_mg:500,  note:"Renal tubular transporter inhibitor; interaction effect can be more important than its own concentration curve." },
  'celecoxib':       { F:0.40, ka:pkKaFromTmax(3.0, 11),   halfLife:11, Vd:6.0,  dose_mg:200,  note:"CYP2C9 NSAID; CYP2C9 poor metabolizers and inhibitors can increase exposure, while renal/CV/GI risks are pharmacodynamic." },
  'diclofenac':      { F:0.55, ka:pkKaFromTmax(2.0, 2),    halfLife:2,  Vd:0.17, dose_mg:50,   note:"CYP2C9/UGT NSAID with high protein binding; hepatic and renal adverse-effect context exceeds short parent half-life." },
  'indomethacin':    { F:1.00, ka:pkKaFromTmax(2.0, 5),    halfLife:5,  Vd:0.34, dose_mg:25,   note:"Highly protein-bound NSAID; renal, GI, CNS, and ductus/renal perfusion risks are not captured by parent curve." },
  'piroxicam':       { F:1.00, ka:pkKaFromTmax(3.0, 50),   halfLife:50, Vd:0.14, dose_mg:20,   note:"Long half-life oxicam NSAID; accumulation makes relative fallback misleading for GI/renal bleeding risk." },
  'diltiazem':       { F:0.40, ka:pkKaFromTmax(3.0, 5),    halfLife:5,  Vd:5.3,  dose_mg:60,   note:"CYP3A/P-gp inhibitor with active metabolites; bradycardia and boosted substrate exposure matter beyond parent curve." },
  'verapamil':       { F:0.22, ka:pkKaFromTmax(1.5, 7),    halfLife:7,  Vd:4.8,  dose_mg:80,   note:"CYP3A/P-gp substrate and inhibitor with active norverapamil; nonlinear first-pass and conduction effects make simple simulation approximate.", nonlinear:true },
  'nifedipine':      { F:0.45, ka:pkKaFromTmax(1.5, 2),    halfLife:2,  Vd:1.4,  dose_mg:10,   note:"CYP3A dihydropyridine; strong inhibitors and grapefruit can increase hypotension risk despite short half-life." },
  'felodipine':      { F:0.15, ka:pkKaFromTmax(2.5, 16),   halfLife:16, Vd:10.0, dose_mg:5,    note:"High first-pass CYP3A substrate; grapefruit/strong inhibitors can cause large exposure increases." },
  'eplerenone':      { F:0.69, ka:pkKaFromTmax(1.5, 5),    halfLife:5,  Vd:0.6,  dose_mg:50,   note:"CYP3A-cleared mineralocorticoid antagonist; renal function, potassium, and strong CYP3A inhibitors drive hyperkalemia risk." },
};

// PK simulation expansion: 300 public-label systemic profiles, compact materialized table.
const PK_LABEL_BATCH_2 = [
  ["abacavir",0.75,2,1.5,1.2,300,"Antiviral label approximation; regimen, transporter, food, cation, renal, or boosting context may dominate exposure."],
  ["acebutolol",0.5,2,12,3,50,"Beta-blocker label approximation; renal clearance or CYP2D6 status may materially change exposure."],
  ["acetaminophen",0.7,2,3,1,100,"Public-label PK approximation; educational one-compartment card."],
  ["acitretin",0.7,2,49,1,100,"Public-label PK approximation; educational one-compartment card. Renal/transporter context is important."],
  ["albendazole",0.7,3,9,5,250,"Antiparasitic label approximation; food, CYP/transporters, active metabolites, and long tissue persistence can dominate. CYP3A modulation is clinically relevant."],
  ["albuterol",0.7,2,5,1,100,"Public-label PK approximation; educational one-compartment card. Renal/transporter context is important."],
  ["alendronate",0.007,1,1000,1,70,"Very low oral bioavailability label approximation; bone binding and renal function make plasma curves misleading."],
  ["alfentanil",0.5,1.5,1.5,3,10,"Opioid label approximation; CYP modulation, active metabolites, renal/hepatic impairment, and respiratory depression dominate. CYP3A modulation is clinically relevant."],
  ["amikacin",1,0.5,2.5,0.25,300,"Parenteral aminoglycoside label approximation; renal clearance and TDM dominate safety."],
  ["aminocaproic_acid",0.7,2,2,0.2,75,"Hemostasis label approximation; renal function, bleeding risk, procedure timing, and monitoring dominate."],
  ["para_aminosalicylic_acid",0.7,2,1,1,100,"Public-label PK approximation; educational one-compartment card. Renal/transporter context is important."],
  ["amonafide",0.6,2.5,4,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate."],
  ["amoxicillin_clavulanate",0.75,1.5,1,0.35,500,"Antimicrobial label approximation; renal function, infection-site exposure, and time-above-MIC can matter more than peak shape."],
  ["aprepitant",0.7,2,11,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant."],
  ["armodafinil",0.7,2,15,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant."],
  ["aspirin",0.7,2,0.3,0.2,75,"Hemostasis label approximation; renal function, bleeding risk, procedure timing, and monitoring dominate."],
  ["aspirin_low-dose",0.7,2,0.3,0.2,75,"Hemostasis label approximation; renal function, bleeding risk, procedure timing, and monitoring dominate."],
  ["azathioprine",0.7,2,5,1,100,"Public-label PK approximation; educational one-compartment card."],
  ["aztreonam",1,0.5,1.7,0.35,500,"Antimicrobial label approximation; renal function, infection-site exposure, and time-above-MIC can matter more than peak shape."],
  ["basiliximab",0.7,2,168,1,100,"Public-label PK approximation; educational one-compartment card."],
  ["belatacept",0.7,2,216,1,100,"Public-label PK approximation; educational one-compartment card."],
  ["benazepril",0.6,2,11,0.7,10,"ACE-inhibitor label approximation; active metabolite and renal function often dominate dosing context."],
  ["benztropine",0.6,2,36,2,50,"Movement-disorder label approximation; active metabolites, renal function, and pressor/CNS context can dominate."],
  ["betamethasone",0.8,1.5,36,1,10,"Corticosteroid label approximation; CYP3A modulation and systemic steroid toxicity can dominate."],
  ["betaxolol",0.5,2,16,3,50,"Beta-blocker label approximation; renal clearance or CYP2D6 status may materially change exposure."],
  ["bivalirudin",1,0.5,0.4,0.2,5,"Hemostasis label approximation; renal function, bleeding risk, procedure timing, and monitoring dominate."],
  ["brexpiprazole",0.6,3,91,10,10,"Psychiatry label approximation; CYP phenotype/inhibition, QT, sedation, and active metabolites can dominate risk. CYP3A modulation is clinically relevant. CYP2D6 phenotype/inhibition may matter."],
  ["brivaracetam",0.9,3,9,0.8,100,"Antiseizure label approximation; TDM, renal/hepatic function, induction, and active metabolites can dominate."],
  ["budesonide",0.8,1.5,3,1,10,"Corticosteroid label approximation; CYP3A modulation and systemic steroid toxicity can dominate."],
  ["buprenorphine",0.5,1.5,28,3,10,"Opioid label approximation; CYP modulation, active metabolites, renal/hepatic impairment, and respiratory depression dominate. CYP3A modulation is clinically relevant."],
  ["busulfan",0.6,2.5,2.5,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate."],
  ["cabergoline",0.6,2,65,2,50,"Movement-disorder label approximation; active metabolites, renal function, and pressor/CNS context can dominate."],
  ["caffeine",0.7,2,5,1,100,"Public-label PK approximation; educational one-compartment card."],
  ["canagliflozin",0.8,2,11,0.8,10,"Diabetes-drug label approximation; renal function, hypoglycemia, food, or injection kinetics can dominate."],
  ["candesartan",0.5,2,9,0.3,80,"ARB label approximation; hepatic/renal excretion balance and potassium/renal context dominate."],
  ["capecitabine",0.6,2.5,0.75,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate."],
  ["capreomycin",1,0.5,4,0.25,300,"Parenteral aminoglycoside label approximation; renal clearance and TDM dominate safety."],
  ["captopril",0.6,2,2,0.7,10,"ACE-inhibitor label approximation; active metabolite and renal function often dominate dosing context."],
  ["carbidopa",0.6,2,2,2,50,"Movement-disorder label approximation; active metabolites, renal function, and pressor/CNS context can dominate."],
  ["carboplatin",1,0.5,6,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate. Renal/transporter context is important."],
  ["cariprazine",0.6,3,72,10,10,"Psychiatry label approximation; CYP phenotype/inhibition, QT, sedation, and active metabolites can dominate risk. CYP3A modulation is clinically relevant. CYP2D6 phenotype/inhibition may matter."],
  ["ceftazidime_avibactam",1,0.5,2.5,0.35,500,"Antimicrobial label approximation; renal function, infection-site exposure, and time-above-MIC can matter more than peak shape."],
  ["cetirizine",0.7,2,8,4,10,"Antihistamine label approximation; renal/hepatic function, sedation, and QT context can dominate."],
  ["chlorambucil",0.6,2.5,1.5,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate."],
  ["chloroquine",0.7,3,240,5,250,"Antiparasitic label approximation; food, CYP/transporters, active metabolites, and long tissue persistence can dominate. CYP3A modulation is clinically relevant. CYP2D6 phenotype/inhibition may matter."],
  ["chlorpromazine",0.6,3,23,10,10,"Psychiatry label approximation; CYP phenotype/inhibition, QT, sedation, and active metabolites can dominate risk. CYP3A modulation is clinically relevant. CYP2D6 phenotype/inhibition may matter."],
  ["chlorthalidone",0.5,1.5,45,2,10,"Cardiovascular label approximation; BP/heart-rate response, renal/hepatic context, and ECG monitoring can dominate."],
  ["chlorzoxazone",0.7,2,1,1,100,"Public-label PK approximation; educational one-compartment card. Renal/transporter context is important."],
  ["cimetidine",0.65,2,2,0.5,20,"Acid-suppression label approximation; renal function, CYP2C19, and target-drug absorption context can dominate."],
  ["cinacalcet",0.5,3,40,6,30,"Mineral-metabolism label approximation; calcium/phosphate/PTH and renal context dominate. CYP3A modulation is clinically relevant. CYP2D6 phenotype/inhibition may matter."],
  ["cisplatin",0.6,2.5,72,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate."],
  ["clevidipine",0.4,2,0.02,5,10,"Calcium-channel blocker label approximation; CYP3A inhibitors, food/formulation, and hypotension/bradycardia context dominate."],
  ["clindamycin",0.7,2,3,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant."],
  ["clonidine_adhd",0.5,1.5,13,2,10,"Cardiovascular label approximation; BP/heart-rate response, renal/hepatic context, and ECG monitoring can dominate. CYP2D6 phenotype/inhibition may matter."],
  ["cobicistat",0.7,2,4,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant. CYP2D6 phenotype/inhibition may matter."],
  ["combined_oral_contraceptive",0.6,3,24,4,1,"Hormone label approximation; formulation, binding proteins, CYP3A induction, and clinical-response timing dominate."],
  ["cyclobenzaprine",0.7,2,18,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant. CYP2D6 phenotype/inhibition may matter."],
  ["cyclophosphamide",0.6,2.5,6,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate. CYP3A modulation is clinically relevant."],
  ["cycloserine",0.7,2,10,1,100,"Public-label PK approximation; educational one-compartment card. Renal/transporter context is important."],
  ["dabrafenib",0.6,2.5,8,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate. CYP3A modulation is clinically relevant."],
  ["dantrolene",0.7,2,8,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant."],
  ["dapagliflozin",0.8,2,13,0.8,10,"Diabetes-drug label approximation; renal function, hypoglycemia, food, or injection kinetics can dominate."],
  ["dapsone",0.7,2,28,1,100,"Public-label PK approximation; educational one-compartment card."],
  ["daptomycin",1,0.5,8,0.35,500,"Antimicrobial label approximation; renal function, infection-site exposure, and time-above-MIC can matter more than peak shape."],
  ["darbepoetin_alfa",1,0.5,25,0.3,100,"Parenteral label approximation; infusion timing, renal function, distribution phase, or TDM can dominate the displayed curve."],
  ["daridorexant",0.8,2,8,2,10,"Sedative label approximation; age, hepatic function, formulation, and additive CNS depression can dominate. CYP3A modulation is clinically relevant."],
  ["delafloxacin",0.75,1.5,8,0.35,500,"Antimicrobial label approximation; renal function, infection-site exposure, and time-above-MIC can matter more than peak shape."],
  ["desmopressin",0.7,2,2.5,1,100,"Public-label PK approximation; educational one-compartment card. Renal/transporter context is important."],
  ["dexamethasone",0.8,1.5,4,1,10,"Corticosteroid label approximation; CYP3A modulation and systemic steroid toxicity can dominate."],
  ["dexlansoprazole",0.7,2,1.5,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant."],
  ["dexmedetomidine",0.5,1.5,2,2,10,"Cardiovascular label approximation; BP/heart-rate response, renal/hepatic context, and ECG monitoring can dominate."],
  ["diphenhydramine",0.7,2,8,4,10,"Antihistamine label approximation; renal/hepatic function, sedation, and QT context can dominate. CYP2D6 phenotype/inhibition may matter."],
  ["disopyramide",0.5,1.5,7,2,10,"Cardiovascular label approximation; BP/heart-rate response, renal/hepatic context, and ECG monitoring can dominate. CYP3A modulation is clinically relevant."],
  ["docetaxel",1,0.5,11,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate. CYP3A modulation is clinically relevant."],
  ["dofetilide",0.5,1.5,10,2,10,"Cardiovascular label approximation; BP/heart-rate response, renal/hepatic context, and ECG monitoring can dominate. CYP3A modulation is clinically relevant."],
  ["domperidone",0.7,2,7,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant."],
  ["donepezil",0.7,2,70,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant. CYP2D6 phenotype/inhibition may matter."],
  ["doravirine",0.75,2,15,1.2,300,"Antiviral label approximation; regimen, transporter, food, cation, renal, or boosting context may dominate exposure. CYP3A modulation is clinically relevant."],
  ["dronedarone",0.5,1.5,24,2,10,"Cardiovascular label approximation; BP/heart-rate response, renal/hepatic context, and ECG monitoring can dominate. CYP3A modulation is clinically relevant."],
  ["dxm_dextromethorphan",0.7,2,3,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant. CYP2D6 phenotype/inhibition may matter."],
  ["eliglustat",0.7,2,7,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant. CYP2D6 phenotype/inhibition may matter."],
  ["eltrombopag",0.7,2,26,1,100,"Public-label PK approximation; educational one-compartment card."],
  ["elvitegravir",0.75,2,13,1.2,300,"Antiviral label approximation; regimen, transporter, food, cation, renal, or boosting context may dominate exposure. CYP3A modulation is clinically relevant."],
  ["empagliflozin",0.8,2,12,0.8,10,"Diabetes-drug label approximation; renal function, hypoglycemia, food, or injection kinetics can dominate."],
  ["enalapril",0.6,2,11,0.7,10,"ACE-inhibitor label approximation; active metabolite and renal function often dominate dosing context."],
  ["enoxaparin",0.7,2,4.5,1,100,"Public-label PK approximation; educational one-compartment card. Renal/transporter context is important."],
  ["entacapone",0.6,2,2,2,50,"Movement-disorder label approximation; active metabolites, renal function, and pressor/CNS context can dominate."],
  ["epoetin_alfa",1,0.5,8,0.3,100,"Parenteral label approximation; infusion timing, renal function, distribution phase, or TDM can dominate the displayed curve."],
  ["eptifibatide",1,0.5,2.5,0.2,5,"Hemostasis label approximation; renal function, bleeding risk, procedure timing, and monitoring dominate."],
  ["eravacycline",0.75,1.5,20,0.35,500,"Antimicrobial label approximation; renal function, infection-site exposure, and time-above-MIC can matter more than peak shape. CYP3A modulation is clinically relevant."],
  ["ertapenem",1,0.5,4,0.35,500,"Antimicrobial label approximation; renal function, infection-site exposure, and time-above-MIC can matter more than peak shape."],
  ["estradiol",0.6,3,14,4,1,"Hormone label approximation; formulation, binding proteins, CYP3A induction, and clinical-response timing dominate."],
  ["ethinyl_estradiol",0.6,3,18,4,1,"Hormone label approximation; formulation, binding proteins, CYP3A induction, and clinical-response timing dominate."],
  ["etonogestrel",0.6,3,25,4,1,"Hormone label approximation; formulation, binding proteins, CYP3A induction, and clinical-response timing dominate."],
  ["etravirine",0.75,2,41,1.2,300,"Antiviral label approximation; regimen, transporter, food, cation, renal, or boosting context may dominate exposure. CYP3A modulation is clinically relevant."],
  ["famciclovir",0.75,2,2,1.2,300,"Antiviral label approximation; regimen, transporter, food, cation, renal, or boosting context may dominate exposure."],
  ["famotidine",0.65,2,3,0.5,20,"Acid-suppression label approximation; renal function, CYP2C19, and target-drug absorption context can dominate."],
  ["febuxostat",0.7,2,7,1,100,"Public-label PK approximation; educational one-compartment card."],
  ["fexofenadine",0.7,2,14,4,10,"Antihistamine label approximation; renal/hepatic function, sedation, and QT context can dominate."],
  ["fidaxomicin",0.75,1.5,11,0.35,500,"Antimicrobial label approximation; renal function, infection-site exposure, and time-above-MIC can matter more than peak shape."],
  ["finasteride",0.7,2,6,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant."],
  ["flecainide",0.5,1.5,20,2,10,"Cardiovascular label approximation; BP/heart-rate response, renal/hepatic context, and ECG monitoring can dominate. CYP2D6 phenotype/inhibition may matter."],
  ["flucloxacillin",0.75,1.5,1,0.35,500,"Antimicrobial label approximation; renal function, infection-site exposure, and time-above-MIC can matter more than peak shape."],
  ["fluorouracil",1,0.5,0.25,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate."],
  ["fluphenazine",0.6,3,14,10,10,"Psychiatry label approximation; CYP phenotype/inhibition, QT, sedation, and active metabolites can dominate risk. CYP2D6 phenotype/inhibition may matter."],
  ["flurazepam",0.8,2,74,2,10,"Sedative label approximation; age, hepatic function, formulation, and additive CNS depression can dominate. CYP3A modulation is clinically relevant."],
  ["flurbiprofen",0.9,2,6,0.2,100,"NSAID label approximation; high protein binding plus renal/GI/CV risk can exceed parent curve signal."],
  ["fluticasone",0.8,1.5,8,1,10,"Corticosteroid label approximation; CYP3A modulation and systemic steroid toxicity can dominate."],
  ["fondaparinux",1,0.5,17,0.2,5,"Hemostasis label approximation; renal function, bleeding risk, procedure timing, and monitoring dominate."],
  ["foscarnet",0.75,2,4,1.2,300,"Antiviral label approximation; regimen, transporter, food, cation, renal, or boosting context may dominate exposure."],
  ["fosfomycin",0.75,1.5,6,0.35,500,"Antimicrobial label approximation; renal function, infection-site exposure, and time-above-MIC can matter more than peak shape."],
  ["fosphenytoin",0.9,3,0.25,0.8,100,"Antiseizure label approximation; TDM, renal/hepatic function, induction, and active metabolites can dominate."],
  ["furosemide",0.7,2,1.5,0.3,25,"Diuretic label approximation; renal function, electrolytes, lithium/digoxin context, and volume status dominate."],
  ["galantamine",0.7,2,7,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant. CYP2D6 phenotype/inhibition may matter. Renal/transporter context is important."],
  ["ganciclovir",0.75,2,4,1.2,300,"Antiviral label approximation; regimen, transporter, food, cation, renal, or boosting context may dominate exposure."],
  ["gemfibrozil",0.8,2,1.5,0.2,600,"Lipid-drug label approximation; protein binding, renal/hepatic function, and statin myopathy context dominate."],
  ["glecaprevir",0.75,2,6,1.2,300,"Antiviral label approximation; regimen, transporter, food, cation, renal, or boosting context may dominate exposure."],
  ["glimepiride",0.8,2,5,0.8,10,"Diabetes-drug label approximation; renal function, hypoglycemia, food, or injection kinetics can dominate."],
  ["glyburide",0.8,2,10,0.8,10,"Diabetes-drug label approximation; renal function, hypoglycemia, food, or injection kinetics can dominate. CYP3A modulation is clinically relevant."],
  ["granisetron",0.7,2,9,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant."],
  ["griseofulvin",0.7,3,24,5,200,"Antifungal label approximation; food, gastric pH, CYP inhibition/induction, and hepatic context can dominate. CYP3A modulation is clinically relevant. First-order simulation is approximate."],
  ["guaifenesin",0.7,2,1,1,100,"Public-label PK approximation; educational one-compartment card."],
  ["guanfacine",0.5,1.5,18,2,10,"Cardiovascular label approximation; BP/heart-rate response, renal/hepatic context, and ECG monitoring can dominate. CYP3A modulation is clinically relevant."],
  ["heparin",1,0.5,1.5,0.2,5,"Hemostasis label approximation; renal function, bleeding risk, procedure timing, and monitoring dominate."],
  ["hydralazine",0.5,1.5,3,2,10,"Cardiovascular label approximation; BP/heart-rate response, renal/hepatic context, and ECG monitoring can dominate."],
  ["hydrochlorothiazide",0.7,2,10,0.3,25,"Diuretic label approximation; renal function, electrolytes, lithium/digoxin context, and volume status dominate."],
  ["hydrocodone",0.5,1.5,4,3,10,"Opioid label approximation; CYP modulation, active metabolites, renal/hepatic impairment, and respiratory depression dominate. CYP3A modulation is clinically relevant. CYP2D6 phenotype/inhibition may matter."],
  ["hydrocortisone",0.8,1.5,1.5,1,10,"Corticosteroid label approximation; CYP3A modulation and systemic steroid toxicity can dominate."],
  ["hydroxyzine",0.7,2,20,4,10,"Antihistamine label approximation; renal/hepatic function, sedation, and QT context can dominate. CYP3A modulation is clinically relevant."],
  ["ibrutinib",0.6,2.5,6,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate. CYP3A modulation is clinically relevant. CYP2D6 phenotype/inhibition may matter."],
  ["iloperidone",0.6,3,18,10,10,"Psychiatry label approximation; CYP phenotype/inhibition, QT, sedation, and active metabolites can dominate risk. CYP3A modulation is clinically relevant. CYP2D6 phenotype/inhibition may matter."],
  ["imatinib",0.6,2.5,18,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate. CYP3A modulation is clinically relevant."],
  ["indinavir",0.75,2,2,1.2,300,"Antiviral label approximation; regimen, transporter, food, cation, renal, or boosting context may dominate exposure. CYP3A modulation is clinically relevant."],
  ["insulin_aspart",1,0.5,1,0.3,100,"Parenteral label approximation; infusion timing, renal function, distribution phase, or TDM can dominate the displayed curve."],
  ["insulin_degludec",1,0.5,25,0.3,100,"Parenteral label approximation; infusion timing, renal function, distribution phase, or TDM can dominate the displayed curve."],
  ["insulin_glargine",1,0.5,24,0.3,100,"Parenteral label approximation; infusion timing, renal function, distribution phase, or TDM can dominate the displayed curve."],
  ["insulin_lispro",1,0.5,1,0.3,100,"Parenteral label approximation; infusion timing, renal function, distribution phase, or TDM can dominate the displayed curve."],
  ["ipratropium",0.7,2,2,1,100,"Public-label PK approximation; educational one-compartment card. Renal/transporter context is important."],
  ["irbesartan",0.5,2,13,0.3,80,"ARB label approximation; hepatic/renal excretion balance and potassium/renal context dominate."],
  ["irinotecan",0.6,2.5,12,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate. CYP3A modulation is clinically relevant."],
  ["isoniazid",0.7,2,3,1,100,"Public-label PK approximation; educational one-compartment card."],
  ["isosorbide_dinitrate",0.5,1.5,1,2,10,"Cardiovascular label approximation; BP/heart-rate response, renal/hepatic context, and ECG monitoring can dominate."],
  ["isosorbide_mononitrate",0.5,1.5,5,2,10,"Cardiovascular label approximation; BP/heart-rate response, renal/hepatic context, and ECG monitoring can dominate."],
  ["isotretinoin",0.7,2,21,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant."],
  ["ivabradine",0.5,1.5,6,2,10,"Cardiovascular label approximation; BP/heart-rate response, renal/hepatic context, and ECG monitoring can dominate. CYP3A modulation is clinically relevant."],
  ["ivacaftor",0.7,2,12,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant."],
  ["ivermectin",0.7,3,18,5,250,"Antiparasitic label approximation; food, CYP/transporters, active metabolites, and long tissue persistence can dominate. CYP3A modulation is clinically relevant. Renal/transporter context is important."],
  ["labetalol",0.5,2,6,3,50,"Beta-blocker label approximation; renal clearance or CYP2D6 status may materially change exposure."],
  ["lacosamide",0.9,3,13,0.8,100,"Antiseizure label approximation; TDM, renal/hepatic function, induction, and active metabolites can dominate."],
  ["leflunomide",0.7,2,360,1,100,"Public-label PK approximation; educational one-compartment card. Renal/transporter context is important."],
  ["lemborexant",0.8,2,17,2,10,"Sedative label approximation; age, hepatic function, formulation, and additive CNS depression can dominate. CYP3A modulation is clinically relevant."],
  ["levodopa",0.6,2,1.5,2,50,"Movement-disorder label approximation; active metabolites, renal function, and pressor/CNS context can dominate."],
  ["levonorgestrel",0.6,3,24,4,1,"Hormone label approximation; formulation, binding proteins, CYP3A induction, and clinical-response timing dominate."],
  ["liothyronine",0.6,3,1,4,1,"Hormone label approximation; formulation, binding proteins, CYP3A induction, and clinical-response timing dominate."],
  ["liraglutide",0.8,2,13,0.8,10,"Diabetes-drug label approximation; renal function, hypoglycemia, food, or injection kinetics can dominate."],
  ["lisinopril",0.6,2,12,0.7,10,"ACE-inhibitor label approximation; active metabolite and renal function often dominate dosing context."],
  ["loperamide",0.7,2,11,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant."],
  ["loratadine",0.7,2,8,4,10,"Antihistamine label approximation; renal/hepatic function, sedation, and QT context can dominate. CYP3A modulation is clinically relevant. CYP2D6 phenotype/inhibition may matter."],
  ["lumacaftor",0.7,2,26,1,100,"Public-label PK approximation; educational one-compartment card. Renal/transporter context is important. First-order simulation is approximate."],
  ["mannitol",0.7,2,1.2,0.3,25,"Diuretic label approximation; renal function, electrolytes, lithium/digoxin context, and volume status dominate."],
  ["maraviroc",0.7,2,10,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant."],
  ["medroxyprogesterone",0.6,3,50,4,1,"Hormone label approximation; formulation, binding proteins, CYP3A induction, and clinical-response timing dominate. Renal/transporter context is important."],
  ["mefloquine",0.7,3,504,5,250,"Antiparasitic label approximation; food, CYP/transporters, active metabolites, and long tissue persistence can dominate. CYP3A modulation is clinically relevant."],
  ["melphalan",0.6,2.5,1.5,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate."],
  ["memantine",0.7,2,60,1,100,"Public-label PK approximation; educational one-compartment card. Renal/transporter context is important."],
  ["mercaptopurine",0.6,2.5,1.5,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate."],
  ["meropenem",1,0.5,1,0.35,500,"Antimicrobial label approximation; renal function, infection-site exposure, and time-above-MIC can matter more than peak shape."],
  ["methamphetamine",0.7,2,10,1,100,"Public-label PK approximation; educational one-compartment card. CYP2D6 phenotype/inhibition may matter."],
  ["methenamine",0.7,2,4,1,100,"Public-label PK approximation; educational one-compartment card."],
  ["methimazole",0.6,3,6,4,1,"Hormone label approximation; formulation, binding proteins, CYP3A induction, and clinical-response timing dominate."],
  ["methyldopa",0.5,1.5,2,2,10,"Cardiovascular label approximation; BP/heart-rate response, renal/hepatic context, and ECG monitoring can dominate."],
  ["methylene_blue",0.7,2,5.5,1,100,"Public-label PK approximation; educational one-compartment card."],
  ["methylprednisolone",0.8,1.5,3,1,10,"Corticosteroid label approximation; CYP3A modulation and systemic steroid toxicity can dominate."],
  ["metoclopramide",0.7,2,5,1,100,"Public-label PK approximation; educational one-compartment card. CYP2D6 phenotype/inhibition may matter."],
  ["metronidazole",0.75,1.5,8,0.35,500,"Antimicrobial label approximation; renal function, infection-site exposure, and time-above-MIC can matter more than peak shape."],
  ["mexiletine",0.5,1.5,12,2,10,"Cardiovascular label approximation; BP/heart-rate response, renal/hepatic context, and ECG monitoring can dominate. CYP2D6 phenotype/inhibition may matter."],
  ["mifepristone",0.8,1.5,84,1,10,"Corticosteroid label approximation; CYP3A modulation and systemic steroid toxicity can dominate."],
  ["milrinone",1,0.5,2.5,0.3,100,"Parenteral label approximation; infusion timing, renal function, distribution phase, or TDM can dominate the displayed curve."],
  ["minoxidil",0.5,1.5,4,2,10,"Cardiovascular label approximation; BP/heart-rate response, renal/hepatic context, and ECG monitoring can dominate."],
  ["mitoxantrone",1,0.5,75,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate. Renal/transporter context is important."],
  ["moclobemide",0.6,2.5,2,15,25,"Antidepressant label approximation; CYP phenotype, active metabolites, serotonin/QT, and taper context can dominate. CYP2D6 phenotype/inhibition may matter."],
  ["modafinil",0.7,2,15,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant."],
  ["montelukast",0.7,2,5,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant."],
  ["morphine",0.5,1.5,3,3,10,"Opioid label approximation; CYP modulation, active metabolites, renal/hepatic impairment, and respiratory depression dominate."],
  ["mycophenolic_acid",0.6,2.5,18,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate."],
  ["nadolol",0.5,2,22,3,50,"Beta-blocker label approximation; renal clearance or CYP2D6 status may materially change exposure."],
  ["nalidixic_acid",0.75,1.5,1.5,0.35,500,"Antimicrobial label approximation; renal function, infection-site exposure, and time-above-MIC can matter more than peak shape."],
  ["nefazodone",0.6,2.5,4,15,25,"Antidepressant label approximation; CYP phenotype, active metabolites, serotonin/QT, and taper context can dominate. CYP3A modulation is clinically relevant."],
  ["nicardipine",0.5,1.5,8,2,10,"Cardiovascular label approximation; BP/heart-rate response, renal/hepatic context, and ECG monitoring can dominate. CYP3A modulation is clinically relevant."],
  ["nicotine",0.7,2,2,1,100,"Public-label PK approximation; educational one-compartment card."],
  ["nimodipine",0.4,2,9,5,10,"Calcium-channel blocker label approximation; CYP3A inhibitors, food/formulation, and hypotension/bradycardia context dominate."],
  ["nirmatrelvir_ritonavir",0.75,2,6,1.2,300,"Antiviral label approximation; regimen, transporter, food, cation, renal, or boosting context may dominate exposure. CYP3A modulation is clinically relevant."],
  ["nisoldipine",0.4,2,7,5,10,"Calcium-channel blocker label approximation; CYP3A inhibitors, food/formulation, and hypotension/bradycardia context dominate."],
  ["nitrofurantoin",0.75,1.5,0.5,0.35,500,"Antimicrobial label approximation; renal function, infection-site exposure, and time-above-MIC can matter more than peak shape."],
  ["nitroglycerin",0.5,1.5,0.05,2,10,"Cardiovascular label approximation; BP/heart-rate response, renal/hepatic context, and ECG monitoring can dominate."],
  ["olmesartan",0.5,2,13,0.3,80,"ARB label approximation; hepatic/renal excretion balance and potassium/renal context dominate."],
  ["omadacycline",0.75,1.5,16,0.35,500,"Antimicrobial label approximation; renal function, infection-site exposure, and time-above-MIC can matter more than peak shape."],
  ["osimertinib",0.6,2.5,48,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate. CYP3A modulation is clinically relevant."],
  ["oxaliplatin",1,0.5,273,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate."],
  ["oxcarbazepine",0.9,3,9,0.8,100,"Antiseizure label approximation; TDM, renal/hepatic function, induction, and active metabolites can dominate. CYP3A modulation is clinically relevant."],
  ["paclitaxel",1,0.5,20,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate. CYP3A modulation is clinically relevant."],
  ["palbociclib",0.6,2.5,29,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate. CYP3A modulation is clinically relevant."],
  ["paliperidone",0.6,3,23,10,10,"Psychiatry label approximation; CYP phenotype/inhibition, QT, sedation, and active metabolites can dominate risk."],
  ["pazopanib",0.6,2.5,31,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate. CYP3A modulation is clinically relevant."],
  ["peginterferon_alfa",0.75,2,80,1.2,300,"Antiviral label approximation; regimen, transporter, food, cation, renal, or boosting context may dominate exposure."],
  ["pegloticase",1,0.5,336,0.3,100,"Parenteral label approximation; infusion timing, renal function, distribution phase, or TDM can dominate the displayed curve."],
  ["pentamidine",0.7,3,6,5,250,"Antiparasitic label approximation; food, CYP/transporters, active metabolites, and long tissue persistence can dominate. Renal/transporter context is important."],
  ["perphenazine",0.6,3,10,10,10,"Psychiatry label approximation; CYP phenotype/inhibition, QT, sedation, and active metabolites can dominate risk. CYP2D6 phenotype/inhibition may matter."],
  ["phenazopyridine",0.7,2,7,1,100,"Public-label PK approximation; educational one-compartment card. Renal/transporter context is important."],
  ["phenelzine",0.6,2.5,12,15,25,"Antidepressant label approximation; CYP phenotype, active metabolites, serotonin/QT, and taper context can dominate."],
  ["phenobarbital",0.9,3,96,0.8,100,"Antiseizure label approximation; TDM, renal/hepatic function, induction, and active metabolites can dominate. First-order simulation is approximate."],
  ["pibrentasvir",0.75,2,23,1.2,300,"Antiviral label approximation; regimen, transporter, food, cation, renal, or boosting context may dominate exposure."],
  ["pimavanserin",0.6,3,57,10,10,"Psychiatry label approximation; CYP phenotype/inhibition, QT, sedation, and active metabolites can dominate risk. CYP3A modulation is clinically relevant."],
  ["pimozide",0.6,3,55,10,10,"Psychiatry label approximation; CYP phenotype/inhibition, QT, sedation, and active metabolites can dominate risk. CYP3A modulation is clinically relevant. CYP2D6 phenotype/inhibition may matter."],
  ["pindolol",0.5,2,4,3,50,"Beta-blocker label approximation; renal clearance or CYP2D6 status may materially change exposure."],
  ["pioglitazone",0.8,2,5,0.8,10,"Diabetes-drug label approximation; renal function, hypoglycemia, food, or injection kinetics can dominate. CYP3A modulation is clinically relevant."],
  ["pramipexole",0.6,2,8,2,50,"Movement-disorder label approximation; active metabolites, renal function, and pressor/CNS context can dominate."],
  ["prednisolone",0.8,1.5,3,1,10,"Corticosteroid label approximation; CYP3A modulation and systemic steroid toxicity can dominate."],
  ["prednisone",0.8,1.5,3,1,10,"Corticosteroid label approximation; CYP3A modulation and systemic steroid toxicity can dominate."],
  ["primaquine",0.7,3,6,5,250,"Antiparasitic label approximation; food, CYP/transporters, active metabolites, and long tissue persistence can dominate."],
  ["primidone",0.9,3,10,0.8,100,"Antiseizure label approximation; TDM, renal/hepatic function, induction, and active metabolites can dominate."],
  ["procainamide",0.5,1.5,3,2,10,"Cardiovascular label approximation; BP/heart-rate response, renal/hepatic context, and ECG monitoring can dominate."],
  ["progesterone",0.6,3,5,4,1,"Hormone label approximation; formulation, binding proteins, CYP3A induction, and clinical-response timing dominate."],
  ["propafenone",0.5,1.5,5,2,10,"Cardiovascular label approximation; BP/heart-rate response, renal/hepatic context, and ECG monitoring can dominate. CYP3A modulation is clinically relevant. CYP2D6 phenotype/inhibition may matter."],
  ["propofol",0.8,2,0.7,2,10,"Sedative label approximation; age, hepatic function, formulation, and additive CNS depression can dominate."],
  ["propylthiouracil",0.6,3,2,4,1,"Hormone label approximation; formulation, binding proteins, CYP3A induction, and clinical-response timing dominate."],
  ["protriptyline",0.6,2.5,80,15,25,"Antidepressant label approximation; CYP phenotype, active metabolites, serotonin/QT, and taper context can dominate. CYP2D6 phenotype/inhibition may matter."],
  ["pseudoephedrine",0.7,2,6,1,100,"Public-label PK approximation; educational one-compartment card. CYP2D6 phenotype/inhibition may matter."],
  ["quazepam",0.8,2,39,2,10,"Sedative label approximation; age, hepatic function, formulation, and additive CNS depression can dominate. CYP3A modulation is clinically relevant."],
  ["quinidine",0.5,1.5,7,2,10,"Cardiovascular label approximation; BP/heart-rate response, renal/hepatic context, and ECG monitoring can dominate. CYP3A modulation is clinically relevant."],
  ["quinine",0.7,3,11,5,250,"Antiparasitic label approximation; food, CYP/transporters, active metabolites, and long tissue persistence can dominate. CYP3A modulation is clinically relevant."],
  ["rabeprazole",0.65,2,1,0.5,30,"Acid-suppression label approximation; renal function, CYP2C19, and target-drug absorption context can dominate. CYP3A modulation is clinically relevant."],
  ["ramelteon",0.7,2,2,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant."],
  ["ramipril",0.6,2,15,0.7,10,"ACE-inhibitor label approximation; active metabolite and renal function often dominate dosing context."],
  ["ranitidine",0.65,2,2.5,0.5,20,"Acid-suppression label approximation; renal function, CYP2C19, and target-drug absorption context can dominate."],
  ["ranolazine",0.5,1.5,7,2,10,"Cardiovascular label approximation; BP/heart-rate response, renal/hepatic context, and ECG monitoring can dominate. CYP3A modulation is clinically relevant. CYP2D6 phenotype/inhibition may matter."],
  ["rasagiline",0.6,2,3,2,50,"Movement-disorder label approximation; active metabolites, renal function, and pressor/CNS context can dominate."],
  ["rasburicase",0.7,2,18,1,100,"Public-label PK approximation; educational one-compartment card."],
  ["repaglinide",0.8,2,1,0.8,10,"Diabetes-drug label approximation; renal function, hypoglycemia, food, or injection kinetics can dominate. CYP3A modulation is clinically relevant."],
  ["ribavirin",0.75,2,120,1.2,300,"Antiviral label approximation; regimen, transporter, food, cation, renal, or boosting context may dominate exposure."],
  ["rifabutin",0.75,1.5,45,0.35,500,"Antimicrobial label approximation; renal function, infection-site exposure, and time-above-MIC can matter more than peak shape. CYP3A modulation is clinically relevant."],
  ["rifaximin",0.75,1.5,6,0.35,500,"Antimicrobial label approximation; renal function, infection-site exposure, and time-above-MIC can matter more than peak shape."],
  ["rivastigmine",0.7,2,1.5,1,100,"Public-label PK approximation; educational one-compartment card."],
  ["roflumilast",0.7,2,17,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant."],
  ["ropinirole",0.6,2,6,2,50,"Movement-disorder label approximation; active metabolites, renal function, and pressor/CNS context can dominate."],
  ["sacubitril_valsartan",0.5,2,12,0.3,80,"ARB label approximation; hepatic/renal excretion balance and potassium/renal context dominate."],
  ["safinamide",0.6,2,20,2,50,"Movement-disorder label approximation; active metabolites, renal function, and pressor/CNS context can dominate."],
  ["saquinavir",0.75,2,7,1.2,300,"Antiviral label approximation; regimen, transporter, food, cation, renal, or boosting context may dominate exposure. CYP3A modulation is clinically relevant."],
  ["selegiline",0.6,2,18,2,50,"Movement-disorder label approximation; active metabolites, renal function, and pressor/CNS context can dominate. CYP3A modulation is clinically relevant."],
  ["semaglutide",0.8,2,168,0.8,10,"Diabetes-drug label approximation; renal function, hypoglycemia, food, or injection kinetics can dominate."],
  ["siponimod",0.7,2,30,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant."],
  ["sitagliptin",0.8,2,12,0.8,10,"Diabetes-drug label approximation; renal function, hypoglycemia, food, or injection kinetics can dominate. CYP3A modulation is clinically relevant."],
  ["sofosbuvir",0.7,2,0.5,1,100,"Public-label PK approximation; educational one-compartment card. Renal/transporter context is important."],
  ["sotalol",0.5,1.5,12,2,10,"Cardiovascular label approximation; BP/heart-rate response, renal/hepatic context, and ECG monitoring can dominate."],
  ["spironolactone",0.7,2,1.4,0.3,25,"Diuretic label approximation; renal function, electrolytes, lithium/digoxin context, and volume status dominate. CYP3A modulation is clinically relevant."],
  ["streptomycin",1,0.5,2.5,0.25,300,"Parenteral aminoglycoside label approximation; renal clearance and TDM dominate safety."],
  ["sufentanil",0.5,1.5,3,3,10,"Opioid label approximation; CYP modulation, active metabolites, renal/hepatic impairment, and respiratory depression dominate. CYP3A modulation is clinically relevant."],
  ["sulfadiazine",0.75,1.5,10,0.35,500,"Antimicrobial label approximation; renal function, infection-site exposure, and time-above-MIC can matter more than peak shape."],
  ["sulfasalazine",0.7,2,8,1,100,"Public-label PK approximation; educational one-compartment card."],
  ["sumatriptan",0.7,2,2,1,100,"Public-label PK approximation; educational one-compartment card."],
  ["suvorexant",0.8,2,12,2,10,"Sedative label approximation; age, hepatic function, formulation, and additive CNS depression can dominate. CYP3A modulation is clinically relevant."],
  ["tadalafil",0.7,2,18,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant."],
  ["tafenoquine",0.7,3,336,5,250,"Antiparasitic label approximation; food, CYP/transporters, active metabolites, and long tissue persistence can dominate. CYP2D6 phenotype/inhibition may matter."],
  ["tamsulosin",0.5,1.5,13,2,10,"Cardiovascular label approximation; BP/heart-rate response, renal/hepatic context, and ECG monitoring can dominate. CYP3A modulation is clinically relevant. CYP2D6 phenotype/inhibition may matter."],
  ["tedizolid",0.75,1.5,12,0.35,500,"Antimicrobial label approximation; renal function, infection-site exposure, and time-above-MIC can matter more than peak shape."],
  ["tegafur",0.7,2,10,1,100,"Public-label PK approximation; educational one-compartment card."],
  ["telmisartan",0.5,2,24,0.3,80,"ARB label approximation; hepatic/renal excretion balance and potassium/renal context dominate."],
  ["tenoxicam",0.9,2,72,0.2,100,"NSAID label approximation; high protein binding plus renal/GI/CV risk can exceed parent curve signal."],
  ["teriflunomide",0.7,2,432,1,100,"Public-label PK approximation; educational one-compartment card. Renal/transporter context is important."],
  ["theophylline",0.7,2,8,1,100,"Public-label PK approximation; educational one-compartment card."],
  ["thioguanine",0.6,2.5,7,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate."],
  ["thioridazine",0.6,3,24,10,10,"Psychiatry label approximation; CYP phenotype/inhibition, QT, sedation, and active metabolites can dominate risk. CYP3A modulation is clinically relevant. CYP2D6 phenotype/inhibition may matter."],
  ["thiotepa",0.6,2.5,2,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate. CYP3A modulation is clinically relevant."],
  ["ticlopidine",0.7,2,12,0.2,75,"Hemostasis label approximation; renal function, bleeding risk, procedure timing, and monitoring dominate."],
  ["tigecycline",1,0.5,42,0.35,500,"Antimicrobial label approximation; renal function, infection-site exposure, and time-above-MIC can matter more than peak shape."],
  ["timolol",0.5,2,4,3,50,"Beta-blocker label approximation; renal clearance or CYP2D6 status may materially change exposure."],
  ["tiotropium",0.7,2,30,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant. Renal/transporter context is important."],
  ["tirofiban",1,0.5,2,0.2,5,"Hemostasis label approximation; renal function, bleeding risk, procedure timing, and monitoring dominate."],
  ["tirzepatide",0.8,2,120,0.8,10,"Diabetes-drug label approximation; renal function, hypoglycemia, food, or injection kinetics can dominate."],
  ["tizanidine",0.7,2,2.5,1,100,"Public-label PK approximation; educational one-compartment card."],
  ["tofacitinib",0.7,2,3,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant."],
  ["tolbutamide",0.8,2,7,0.8,10,"Diabetes-drug label approximation; renal function, hypoglycemia, food, or injection kinetics can dominate."],
  ["topotecan",1,0.5,3,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate. Renal/transporter context is important."],
  ["torsemide",0.7,2,3.5,0.3,25,"Diuretic label approximation; renal function, electrolytes, lithium/digoxin context, and volume status dominate."],
  ["tranexamic_acid",0.7,2,2,0.2,75,"Hemostasis label approximation; renal function, bleeding risk, procedure timing, and monitoring dominate."],
  ["tranylcypromine",0.6,2.5,2,15,25,"Antidepressant label approximation; CYP phenotype, active metabolites, serotonin/QT, and taper context can dominate."],
  ["trihexyphenidyl",0.6,2,4,2,50,"Movement-disorder label approximation; active metabolites, renal function, and pressor/CNS context can dominate."],
  ["trimethoprim_sulfamethoxazole",0.75,1.5,10,0.35,500,"Antimicrobial label approximation; renal function, infection-site exposure, and time-above-MIC can matter more than peak shape."],
  ["trimipramine",0.6,2.5,24,15,25,"Antidepressant label approximation; CYP phenotype, active metabolites, serotonin/QT, and taper context can dominate. CYP2D6 phenotype/inhibition may matter."],
  ["tropisetron",0.7,2,8,1,100,"Public-label PK approximation; educational one-compartment card. CYP2D6 phenotype/inhibition may matter. Renal/transporter context is important."],
  ["upadacitinib",0.7,2,11,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant."],
  ["valsartan",0.5,2,9,0.3,80,"ARB label approximation; hepatic/renal excretion balance and potassium/renal context dominate."],
  ["vardenafil",0.7,2,5,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant."],
  ["vecuronium",0.7,2,1.2,1,100,"Public-label PK approximation; educational one-compartment card. CYP3A modulation is clinically relevant. Renal/transporter context is important."],
  ["venetoclax",0.6,2.5,26,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate. CYP3A modulation is clinically relevant. Renal/transporter context is important."],
  ["vilazodone",0.6,2.5,25,15,25,"Antidepressant label approximation; CYP phenotype, active metabolites, serotonin/QT, and taper context can dominate. CYP3A modulation is clinically relevant."],
  ["vincristine",0.6,2.5,85,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate. CYP3A modulation is clinically relevant. Renal/transporter context is important."],
  ["vorinostat",0.6,2.5,2,5,100,"Oncology label approximation; active metabolites, protein binding, organ impairment, and exposure-toxicity monitoring can dominate."],
  ["zafirlukast",0.7,2,10,1,100,"Public-label PK approximation; educational one-compartment card."],
  ["zaleplon",0.8,2,1,2,10,"Sedative label approximation; age, hepatic function, formulation, and additive CNS depression can dominate. CYP3A modulation is clinically relevant."]
];

for (const [drugId, F, tmax, halfLife, Vd, dose_mg, note] of PK_LABEL_BATCH_2) {
  if (!PK_PARAMS[drugId]) {
    PK_PARAMS[drugId] = {
      F, ka: pkKaFromTmax(tmax, halfLife), halfLife, Vd, dose_mg, note,
      nonlinear: /nonlinear|saturable|autoinduction|michaelis/i.test(note),
    };
  }
}

const PK_LABEL_BATCH_3 = [
  ["afatinib",0.92,3,37,28,40,"Batch 01 TKI label approximation; P-gp/BCRP transport and diarrhea/skin toxicity can dominate exposure management."],
  ["ceritinib",0.75,6,41,60,450,"Batch 01 TKI label approximation; food, hepatic toxicity, QT, and CYP3A modulation are clinically relevant."],
  ["cabozantinib",0.75,4,99,4,60,"Batch 01 TKI label approximation; long half-life, protein binding, hepatic function, and CYP3A modulation matter."],
  ["bosutinib",0.34,6,22,100,400,"Batch 01 TKI label approximation; food and CYP3A modulation can materially change exposure."],
  ["ponatinib",0.75,6,24,25,45,"Batch 01 TKI label approximation; thrombotic/cardiovascular toxicity and CYP3A modulation dominate risk."],
  ["acalabrutinib",0.25,0.9,1,34,100,"Batch 01 BTK inhibitor label approximation; acid suppression and CYP3A modulation can change exposure."],
  ["zanubrutinib",0.7,2,4,9,160,"Batch 01 BTK inhibitor label approximation; CYP3A inhibition/induction and bleeding/infection context matter."],
  ["selpercatinib",0.74,2,22,3,160,"Batch 01 RET inhibitor label approximation; CYP3A, acid suppression, QT, and hepatic context matter."],
  ["entrectinib",0.55,4,20,8,600,"Batch 01 kinase inhibitor label approximation; CYP3A modulation and CNS/QT context can dominate."],
  ["encorafenib",0.86,2,3.5,3,450,"Batch 01 BRAF inhibitor label approximation; CYP3A and QT/skin toxicity context matter."],
  ["binimetinib",0.5,1.5,3.5,3,45,"Batch 01 MEK inhibitor label approximation; ocular/cardiac toxicity monitoring can dominate over CYP concerns."],
  ["trametinib",0.72,1.5,96,3,2,"Batch 01 MEK inhibitor label approximation; long half-life and cardiomyopathy/ocular/rash context matter."],
  ["cobimetinib",0.46,2.4,44,15,60,"Batch 01 MEK inhibitor label approximation; CYP3A modulation and cardiac/ocular toxicity context matter."],
  ["vemurafenib",0.64,4,57,100,960,"Batch 01 BRAF inhibitor label approximation; CYP1A2 inhibition, CYP3A induction, QT, photosensitivity, and hepatic context matter."],
  ["ruxolitinib",0.95,1.5,3,1.2,20,"Batch 01 JAK inhibitor label approximation; CYP3A modulation, myelosuppression, infection risk, and renal/hepatic status matter."],
  ["baricitinib",0.79,1,12,1,2,"Batch 01 JAK inhibitor label approximation; renal/OAT3 clearance, infection, thrombosis, and myelosuppression context matter."],
  ["abrocitinib",0.6,1,5,1,100,"Batch 01 JAK inhibitor label approximation; CYP2C19/2C9 metabolism, P-gp inhibition, infection, thrombosis, and myelosuppression context matter."],
  ["neratinib",0.4,7,17,4,240,"Batch 01 HER2 TKI label approximation; CYP3A modulation, acid suppression, diarrhea, and hepatic context matter."],
  ["tucatinib",0.76,2,8,5,300,"Batch 01 HER2 TKI label approximation; CYP2C8/CYP3A routes plus CYP3A/P-gp inhibition can affect co-medications."],
  ["midostaurin",0.75,1.5,20,95,50,"Batch 01 FLT3/multikinase label approximation; active metabolites and CYP3A modulation are important."],
  ["gilteritinib",0.75,4,113,1100,120,"Batch 01 FLT3 inhibitor label approximation; long half-life, CYP3A modulation, QT, and differentiation syndrome context matter."],
  ["pralsetinib",0.9,4,15,4,400,"Batch 01 RET inhibitor label approximation; CYP3A/P-gp modulation and hepatic/pulmonary toxicity context matter."],
  ["larotrectinib",0.34,1,3,3,100,"Batch 01 TRK inhibitor label approximation; CYP3A modulation and CNS effects context matter."],
  ["sotorasib",0.62,1,5,3,960,"Batch 01 KRAS inhibitor label approximation; acid suppression, CYP3A/P-gp/BCRP context, and hepatic toxicity matter."],
  ["fedratinib",0.63,2,41,25,400,"Batch 01 JAK2 inhibitor label approximation; CYP3A/2C19 modulation, myelosuppression, GI, and thiamine/Wernicke risk context matter."],
  ["ivosidenib",0.57,3,93,4,500,"Batch 01 IDH1 inhibitor label approximation; CYP3A induction, QT, differentiation syndrome, and long half-life matter."],
  ["dacomitinib",0.8,6,70,27,45,"Batch 01 EGFR TKI label approximation; CYP2D6 inhibition and long half-life are relevant."],
  ["rizatriptan",0.45,1,2,2,10,"Batch 01 triptan label approximation; serotonergic/vasoconstrictive context and MAO-A metabolism matter."],
  ["zolmitriptan",0.4,1.5,3,7,2.5,"Batch 01 triptan label approximation; MAO-A/CYP1A2 context and serotonin/vasospasm risk matter."],
  ["eletriptan",0.5,1.5,4,2,40,"Batch 01 triptan label approximation; CYP3A modulation and vasoconstrictive context matter."],
  ["naratriptan",0.7,2.5,6,2.5,2.5,"Batch 01 triptan label approximation; renal clearance and serotonergic/vascular context matter."],
  ["almotriptan",0.7,2,3.5,2,12.5,"Batch 01 triptan label approximation; MAO-A/CYP3A context and vascular risk matter."],
  ["frovatriptan",0.3,3,26,4,2.5,"Batch 01 triptan label approximation; long triptan half-life and serotonergic/vascular context matter."],
  ["rimegepant",0.64,1.5,11,120,75,"Batch 01 gepant label approximation; CYP3A/P-gp/BCRP modulation affects exposure."],
  ["ubrogepant",0.19,1.5,6,5,100,"Batch 01 gepant label approximation; CYP3A/P-gp/BCRP modulation affects exposure."],
  ["atogepant",0.6,1.5,11,4,60,"Batch 01 gepant label approximation; CYP3A/OATP/P-gp context matters."],
  ["lasmiditan",0.4,1.8,5.7,4,100,"Batch 01 ditan label approximation; CNS depression/driving impairment and serotonergic context matter."],
  ["zonisamide",1,4,63,1.5,100,"Batch 01 antiseizure label approximation; long half-life, carbonic-anhydrase effects, renal stones, and CYP3A context matter."],
  ["ethosuximide",0.93,3,53,0.7,500,"Batch 01 antiseizure label approximation; long half-life and concentration monitoring context matter."],
  ["felbamate",0.9,3,20,0.8,600,"Batch 01 antiseizure label approximation; CYP2C19 inhibition/CYP3A induction plus aplastic anemia/hepatic risk matter."],
  ["cenobamate",0.88,3,60,0.7,200,"Batch 01 antiseizure label approximation; CYP2C19 inhibition/CYP3A induction and long half-life matter."],
  ["eslicarbazepine",0.9,2,16,0.9,800,"Batch 01 antiseizure label approximation; CYP2C19 inhibition/CYP3A induction and sodium/cardiac context matter."],
  ["stiripentol",0.75,2,10,1,500,"Batch 01 antiseizure label approximation; broad CYP inhibition and sedation/myelosuppression context matter."],
  ["daclatasvir",0.67,2,13,0.7,60,"Batch 01 HCV antiviral label approximation; CYP3A/P-gp context and regimen partners dominate."],
  ["elbasvir",0.32,3,24,0.7,50,"Batch 01 HCV antiviral label approximation; CYP3A induction and hepatic status dominate."],
  ["grazoprevir",0.27,2,31,1,100,"Batch 01 HCV protease inhibitor label approximation; OATP/CYP3A and hepatic status dominate."],
  ["entecavir",1,1,128,1.4,0.5,"Batch 01 HBV antiviral label approximation; renal clearance and intracellular persistence dominate."],
  ["ertugliflozin",1,1,17,2,15,"Batch 02 SGLT2 inhibitor label approximation; glucuronidation, renal function, volume status, and hypoglycemia co-therapy context matter."],
  ["saxagliptin",0.67,2,2.5,2,5,"Batch 02 DPP-4 inhibitor label approximation; CYP3A forms active metabolite and renal status matters."],
  ["linagliptin",0.3,1.5,100,15,5,"Batch 02 DPP-4 inhibitor label approximation; long terminal half-life, biliary excretion, CYP3A/P-gp context matter."],
  ["alogliptin",1,1.5,21,0.7,25,"Batch 02 DPP-4 inhibitor label approximation; renal clearance dominates."],
  ["miglitol",1,2,2,0.2,50,"Batch 02 alpha-glucosidase inhibitor label approximation; local gut action and renal clearance dominate."],
  ["rosiglitazone",0.99,1,4,0.2,4,"Batch 02 thiazolidinedione label approximation; CYP2C8 metabolism, edema, heart-failure, and hypoglycemia co-therapy context matter."],
  ["nateglinide",0.73,1,1.5,0.2,120,"Batch 02 meglitinide label approximation; CYP2C9/CYP3A context and hypoglycemia timing matter."],
  ["deutetrabenazine",0.8,3,9,5,12,"Batch 02 VMAT2 inhibitor label approximation; active metabolites, CYP2D6 status/inhibition, QT, depression, and parkinsonism context matter."],
  ["valbenazine",0.5,1,20,5,80,"Batch 02 VMAT2 inhibitor label approximation; active metabolite, CYP2D6/CYP3A modulation, QT, somnolence, and parkinsonism context matter."],
  ["lapatinib",0.5,4,24,30,1250,"Batch 02 HER2/EGFR TKI label approximation; CYP3A exposure, QT, hepatotoxicity, and acid/food context matter."],
  ["tepotinib",0.7,8,32,10,450,"Batch 02 MET inhibitor label approximation; P-gp inhibition, edema, and CYP3A context matter."],
  ["adagrasib",0.75,6,23,70,600,"Batch 02 KRAS inhibitor label approximation; CYP3A inhibition/substrate behavior, QT, hepatic, and GI context matter."],
  ["pirtobrutinib",0.85,2,19,3,200,"Batch 02 BTK inhibitor label approximation; CYP3A modulation and bleeding/infection context matter."],
  ["asciminib",0.73,2.5,5.5,1.5,80,"Batch 02 BCR-ABL inhibitor label approximation; CYP3A/CYP2C9/P-gp inhibition, myelosuppression, and pancreatic context matter."],
  ["prucalopride",0.93,2,24,8,2,"Batch 02 GI motility label approximation; renal clearance dominates."],
  ["eluxadoline",0.75,1.5,5,2,100,"Batch 02 GI agent label approximation; biliary/OATP context and pancreatitis/sphincter-risk context dominate."],
  ["naldemedine",0.25,0.8,11,2,0.2,"Batch 02 peripheral opioid antagonist label approximation; CYP3A/P-gp modulation changes exposure."],
  ["naloxegol",0.6,1.5,6,15,25,"Batch 02 peripheral opioid antagonist label approximation; strong CYP3A inhibitors are high-impact."],
  ["apremilast",0.73,2.5,9,1,30,"Batch 02 PDE4 inhibitor label approximation; CYP3A induction lowers exposure and GI/weight context matters."],
  ["mirabegron",0.35,3.5,50,25,50,"Batch 02 beta-3 agonist label approximation; CYP2D6 inhibition, BP, and renal/hepatic status matter."],
  ["vibegron",0.7,1,31,5,75,"Batch 02 beta-3 agonist label approximation; low CYP burden; renal/hepatic and BP context matter."],
  ["solifenacin",0.9,6,45,10,5,"Batch 02 bladder antimuscarinic label approximation; CYP3A, QT, anticholinergic burden, and older-adult context matter."],
  ["tolterodine",0.77,2,3,3,2,"Batch 02 bladder antimuscarinic label approximation; CYP2D6/CYP3A phenotype and anticholinergic burden matter."],
  ["darifenacin",0.2,7,14,20,7.5,"Batch 02 bladder antimuscarinic label approximation; CYP2D6/CYP3A and anticholinergic burden matter."],
  ["trospium",0.1,5,20,4,20,"Batch 02 bladder antimuscarinic label approximation; renal clearance and anticholinergic burden matter."],
  ["silodosin",0.32,2.5,13,0.8,8,"Batch 02 alpha-1 blocker label approximation; CYP3A, UGT2B7, food, renal status, and orthostasis matter."],
  ["alfuzosin",0.49,8,10,2.5,10,"Batch 02 alpha-1 blocker label approximation; CYP3A and QT/orthostasis context matter."],
  ["dutasteride",0.6,3,840,5,0.5,"Batch 02 5-alpha reductase inhibitor label approximation; very long half-life and teratogenic handling context matter."],
  ["bempedoic_acid",0.7,3.5,21,0.5,180,"Batch 02 lipid drug label approximation; UGT metabolism, OATP inhibition, uric acid, and tendon context matter."],
  ["ezetimibe",0.35,6,22,1.5,10,"Batch 02 lipid drug label approximation; glucuronidation and enterohepatic recycling dominate."],
  ["icosapent_ethyl",0.8,5,89,1,4000,"Batch 02 omega-3 ethyl ester label approximation; ester hydrolysis, food, bleeding/AF context matter."],
  ["fenofibrate",0.6,4,20,0.9,145,"Batch 02 fibrate label approximation; active fenofibric acid, renal function, and statin myopathy context matter."],
  ["fludrocortisone",0.8,1.7,3.5,1,0.1,"Batch 02 mineralocorticoid label approximation; electrolyte/fluid balance dominates."],
  ["fosaprepitant",1,0.5,13,0.7,150,"Batch 02 NK1 prodrug label approximation represented as aprepitant exposure; CYP3A inhibition/induction context matters."],
  ["netupitant",0.65,5,80,100,300,"Batch 02 NK1 antagonist label approximation; long half-life and CYP3A inhibition matter."],
  ["palonosetron",0.97,5,40,8,0.5,"Batch 02 5-HT3 antagonist label approximation; long half-life and QT/constipation context matter."],
  ["prochlorperazine",0.2,4,7,20,10,"Batch 02 phenothiazine label approximation; CYP2D6, QT, EPS, sedation, anticholinergic burden, and older-adult context matter."],
  ["promethazine",0.25,3,12,13,25,"Batch 02 phenothiazine antihistamine label approximation; CYP2D6, sedation, anticholinergic burden, and respiratory/CNS context matter."],
  ["scopolamine",0.5,8,9.5,2,1.5,"Batch 02 antimuscarinic patch label approximation; anticholinergic CNS burden and older-adult context matter."],
  ["meclizine",0.5,3,6,5,25,"Batch 02 antihistamine label approximation; sedation and anticholinergic burden matter."],
  ["ixazomib",0.58,1,216,15,4,"Batch 02 oral proteasome inhibitor label approximation; long half-life, CYP3A induction, neuropathy, and myelosuppression context matter."],
  ["pomalidomide",0.73,3,7.5,1,4,"Batch 02 IMiD label approximation; CYP1A2/3A/P-gp context, myelosuppression, thrombosis, and teratogenicity matter."],
  ["thalidomide",0.9,3,6,1,100,"Batch 02 IMiD label approximation; hydrolysis, sedation, neuropathy, thrombosis, and teratogenicity matter."],
  ["hydroxyurea",0.8,2,4,0.7,500,"Batch 02 cytoreductive label approximation; myelosuppression and renal status dominate."],
  ["anagrelide",0.75,1,1.5,12,0.5,"Batch 02 platelet-reducing agent label approximation; CYP1A2, QT/cardiac, bleeding, and platelet monitoring matter."],
  ["duvelisib",0.42,1,5,28,25,"Batch 03 PI3K inhibitor label approximation; CYP3A, infection, hepatic, GI, and myelosuppression context matter."],
  ["futibatinib",0.7,2,3,1.5,20,"Batch 03 FGFR inhibitor label approximation; CYP3A, ocular toxicity, and phosphate management matter."],
  ["pemigatinib",0.85,1.5,15,3,13.5,"Batch 03 FGFR inhibitor label approximation; CYP3A, ocular toxicity, and phosphate management matter."],
  ["ripretinib",0.6,4,15,4,150,"Batch 03 KIT/PDGFRA inhibitor label approximation; CYP3A and dermatologic/cardiac context matter."],
  ["tazemetostat",0.33,1,3.1,2,800,"Batch 03 EZH2 inhibitor label approximation; CYP3A and secondary malignancy/myelosuppression context matter."],
  ["selumetinib",0.62,1.5,6,3,25,"Batch 03 MEK inhibitor label approximation; CYP3A/UGT1A1/2C19 and ocular/cardiac context matter."],
  ["idelalisib",0.75,1.5,8,23,150,"Batch 03 PI3K inhibitor label approximation; CYP3A inhibition and severe immune/infectious toxicity context matter."],
  ["copanlisib",1,1,39,12,60,"Batch 03 PI3K inhibitor infusion approximation; CYP3A, hyperglycemia, hypertension, and myelosuppression matter."],
  ["abemaciclib",0.45,8,18,8,150,"Batch 03 CDK4/6 inhibitor label approximation; CYP3A, diarrhea, myelosuppression, and thrombosis context matter."],
  ["ribociclib",0.65,4,32,20,600,"Batch 03 CDK4/6 inhibitor label approximation; CYP3A inhibition/substrate behavior, QT, hepatic, and myelosuppression context matter."],
  ["alpelisib",0.75,2,9,1.5,300,"Batch 03 PI3K inhibitor label approximation; hydrolysis/CYP3A, hyperglycemia, rash, and diarrhea context matter."],
  ["erdafitinib",0.8,2.5,59,1.3,8,"Batch 03 FGFR inhibitor label approximation; CYP2C9/CYP3A, ocular toxicity, and phosphate management matter."],
  ["avacopan",0.65,5,97,10,30,"Batch 03 complement receptor antagonist label approximation; CYP3A, liver tests, and infection context matter."],
  ["iptacopan",0.55,2,25,3,200,"Batch 03 complement factor B inhibitor label approximation; CYP2C8/CYP3A/UGT context and infection risk matter."],
  ["cladribine",0.4,0.5,24,5,10,"Batch 03 purine analog label approximation; intracellular phosphorylation, renal clearance, and prolonged lymphopenia context matter."],
  ["dimethyl_fumarate",0.5,2,1,1,240,"Batch 03 fumarate label approximation; active monomethyl fumarate, GI effects, and lymphopenia context matter."],
  ["diroximel_fumarate",0.6,2.5,1,1,462,"Batch 03 fumarate label approximation; active monomethyl fumarate, GI effects, and lymphopenia context matter."],
  ["fingolimod",0.93,12,216,20,0.5,"Batch 03 S1P modulator label approximation; long offset, bradycardia, infection, macular edema, and CYP4F/CYP3A context matter."],
  ["ozanimod",0.48,8,21,5,0.92,"Batch 03 S1P modulator label approximation; active metabolites, CYP2C8/MAO-B context, bradycardia, infection, and washout matter."],
  ["ponesimod",0.84,4,33,2,20,"Batch 03 S1P modulator label approximation; bradycardia, infection, and immune offset matter."],
  ["filgotinib",0.8,2,7,1,200,"Batch 03 JAK1 inhibitor label approximation; carboxylesterase activation, infection, thrombosis, and myelosuppression context matter."],
  ["nitisinone",0.9,3,54,0.3,10,"Batch 03 HPD inhibitor label approximation; tyrosine/ocular monitoring and CYP context matter."],
  ["miglustat",0.97,2.5,6,0.8,100,"Batch 03 glucosylceramide synthase inhibitor label approximation; renal clearance, GI, tremor, and neuropathy context matter."],
  ["balsalazide",0.15,2,1,0.3,2250,"Batch 03 5-ASA prodrug label approximation; bacterial activation to mesalamine and renal context matter."],
  ["olsalazine",0.2,1,1,0.3,500,"Batch 03 5-ASA prodrug label approximation; bacterial activation to mesalamine and diarrhea/renal context matter."],
  ["mesalamine",0.3,4,1,0.2,1200,"Batch 03 5-ASA label approximation; formulation/site release and renal context dominate."],
  ["ibrexafungerp",0.45,4,20,8,300,"Batch 03 antifungal label approximation; CYP3A and pregnancy/GI context matter."],
  ["lefamulin",0.25,1,8,1.8,600,"Batch 03 antibiotic label approximation; CYP3A inhibition/substrate behavior and QT context matter."],
  ["tecovirimat",0.77,6,20,4,600,"Batch 03 antiviral label approximation; UGT/CYP induction and food context matter."],
  ["brincidofovir",0.13,3,16,1,200,"Batch 03 antiviral prodrug label approximation; intracellular cidofovir activity, GI, and hepatic context matter."],
  ["lercanidipine",0.1,3,10,20,10,"Batch 03 CCB label approximation; CYP3A and hypotension/edema context matter."],
  ["treprostinil",0.17,4,4,14,1,"Batch 03 prostacyclin label approximation; formulation differs; CYP2C8, hypotension, bleeding, and infusion/inhaled route context matter."],
  ["betrixaban",0.34,4,19,32,80,"Batch 03 factor Xa inhibitor label approximation; P-gp and bleeding/renal context matter."],
  ["acenocoumarol",0.6,2,10,0.2,2,"Batch 03 vitamin K antagonist approximation; CYP2C9 and INR/bleeding context dominate."],
  ["phenprocoumon",1,3,120,0.2,3,"Batch 03 vitamin K antagonist approximation; long half-life, CYP2C9/CYP3A, and INR/bleeding context dominate."],
  ["pitolisant",0.9,3,20,5,17.8,"Batch 03 wake-promoting agent label approximation; CYP2D6/CYP3A and QT/insomnia context matter."],
  ["solriamfetol",0.95,2,7,2,150,"Batch 03 wake-promoting agent label approximation; renal clearance, BP, and insomnia context matter."],
  ["tetrabenazine",0.75,1.5,7,5,25,"Batch 03 VMAT2 inhibitor label approximation; active metabolites, CYP2D6, depression, parkinsonism, and QT context matter."],
  ["rotigotine",0.37,16,5,4,4,"Batch 03 dopamine agonist patch label approximation; sulfation/glucuronidation, hypotension, somnolence, and impulse-control context matter."],
  ["apomorphine",0.17,0.7,0.7,3,3,"Batch 03 dopamine agonist label approximation; sulfation/glucuronidation, hypotension, nausea, QT, and antiemetic contraindications matter."],
  ["istradefylline",0.55,4,83,8,20,"Batch 03 A2A antagonist label approximation; CYP3A modulation and dyskinesia context matter."],
  ["dalfampridine",0.96,3.5,6,2,10,"Batch 03 potassium channel blocker label approximation; renal clearance and seizure risk dominate."],
  ["zavegepant",0.5,0.5,7,3,10,"Batch 03 nasal gepant label approximation; CYP3A/transporter context and local route matter."],
  ["risdiplam",0.9,3,50,6,5,"Batch 03 SMN2 splicing modifier label approximation; FMO/CYP3A and reproductive counseling context matter."],
  ["voxelotor",0.6,2,35,8,1500,"Batch 03 hemoglobin S polymerization inhibitor label approximation; CYP3A, hemolysis/lab interference context matter."],
  ["roxadustat",0.7,2,12,0.4,70,"Batch 03 HIF-PH inhibitor label approximation; CYP2C8/UGT1A9, BCRP/OATP, thrombosis, and BP context matter."],
  ["daprodustat",0.65,1,4,3,4,"Batch 03 HIF-PH inhibitor label approximation; CYP2C8 and thrombosis/BP context matter."],
  ["vadadustat",0.6,2,5,0.3,300,"Batch 03 HIF-PH inhibitor label approximation; glucuronidation, mineral binders, thrombosis, and BP context matter."],
  ["fostamatinib",0.55,1.5,15,2,100,"Batch 03 SYK inhibitor prodrug approximation represented as active R406 exposure; CYP3A, BCRP, BP, liver, and diarrhea context matter."],
  ["avatrombopag",0.75,6,19,3,20,"Batch 03 TPO receptor agonist label approximation; CYP2C9/CYP3A and thrombosis context matter."],
  ["lusutrombopag",0.9,6,27,3,3,"Batch 03 TPO receptor agonist label approximation; hepatic/biliary clearance and thrombosis context matter."]
];

for (const [drugId, F, tmax, halfLife, Vd, dose_mg, note] of PK_LABEL_BATCH_3) {
  if (!PK_PARAMS[drugId]) {
    PK_PARAMS[drugId] = {
      F, ka: pkKaFromTmax(tmax, halfLife), halfLife, Vd, dose_mg, note,
      nonlinear: /nonlinear|saturable|autoinduction|michaelis/i.test(note),
    };
  }
}

const PK_LABEL_BATCH_4 = [
  ["gemtuzumab_ozogamicin",1,2,72,0.08,4.5,"Phase 3 ADC approximation; antibody disposition and calicheamicin payload toxicity are regimen/protocol dependent."],
  ["inotuzumab_ozogamicin",1,2,288,0.08,1.8,"Phase 3 ADC approximation; long antibody/payload persistence and hepatic sinusoidal-obstruction risk dominate timing."],
  ["ado_trastuzumab_emtansine",1,2,96,0.06,3.6,"Phase 3 ADC approximation; DM1 payload, hepatic function, thrombocytopenia, and oncology protocol dominate."],
  ["ziprasidone",0.6,6,7,1.5,40,"Phase 3 antipsychotic label approximation; food-dependent absorption and QT context are clinically important."],
  ["mdma_ecstasy",0.8,2,8,5,100,"Phase 3 recreational empathogen approximation; nonlinear/autoinhibition, hyperthermia, hyponatremia, serotonergic, and CYP2D6 context can dominate."],
  ["mda",0.8,2,8,5,100,"Phase 3 empathogen approximation; active metabolite/related stimulant context, serotonin toxicity, hyperthermia, and CYP2D6 variability matter."],
  ["alcohol_ethanol",1,0.5,4,0.6,14000,"Phase 3 ethanol approximation; nonlinear zero-order clearance, CNS depression, hypoglycemia, and hepatic context dominate."],
  ["cangrelor",1,0.03,0.1,0.06,1,"Phase 3 IV P2Y12 approximation; very short parent half-life, platelet recovery, and transition timing dominate."],
  ["abciximab",1,0.5,24,0.05,25,"Phase 3 GP IIb/IIIa approximation; plasma PK is less important than prolonged platelet-bound effect and bleeding monitoring."],
  ["alteplase",1,0.05,0.1,0.05,50,"Phase 3 thrombolytic approximation; rapid clearance but fibrinolytic/bleeding protocol context dominates."],
  ["tenecteplase",1,0.05,0.4,0.05,40,"Phase 3 thrombolytic approximation; bolus fibrinolytic with short plasma half-life and protocol-driven bleeding risk."],
  ["dalteparin",1,0.5,4,0.05,5000,"Phase 3 LMWH approximation; renal function, anti-Xa context, and bleeding/procedure timing dominate."],
  ["tinzaparin",1,0.5,3.9,0.05,10000,"Phase 3 LMWH approximation; renal function, anti-Xa context, and procedural timing dominate."],
  ["desirudin",1,0.5,2,0.25,15,"Phase 3 direct thrombin inhibitor approximation; renal function and bleeding/procedure timing dominate."],
  ["lepirudin",1,0.5,1.3,0.2,50,"Phase 3 direct thrombin inhibitor approximation; renal function and aPTT/bleeding monitoring dominate."],
  ["gemfibrozil",0.98,2,1.5,0.15,600,"Phase 3 CYP2C8/OATP inhibitor approximation; interaction persistence can outlast parent half-life for sensitive substrates."],
];

for (const [drugId, F, tmax, halfLife, Vd, dose_mg, note] of PK_LABEL_BATCH_4) {
  if (!PK_PARAMS[drugId]) {
    PK_PARAMS[drugId] = {
      F, ka: pkKaFromTmax(tmax, halfLife), halfLife, Vd, dose_mg, note,
      nonlinear: /nonlinear|saturable|autoinduction|michaelis|zero-order/i.test(note),
    };
  }
}

// pkConcentration(params, t_h) — one-compartment oral model
// Returns plasma concentration (ng/mL equiv. relative units)
function pkConcentration(params, t_h) {
  const { F, ka, dose_mg } = params;
  const ke = 0.693 / params.halfLife;
  const Vd_L = params.Vd * 70; // 70 kg body weight assumption
  if (Math.abs(ka - ke) < 1e-6) {
    // Degenerate case: use simpler approximation
    return (F * dose_mg * 1000 / Vd_L) * ke * t_h * Math.exp(-ke * t_h);
  }
  const C = (F * dose_mg * 1000 / Vd_L) * (ka / (ka - ke)) * (Math.exp(-ke * t_h) - Math.exp(-ka * t_h));
  return Math.max(0, C);
}

// pkCurve(drugName, nPoints) — returns array of {t, c} points for SVG rendering
function pkCurve(drugName, nPoints = 80) {
  const key = toGraphId(drugName);
  const drug = typeof getDrug === "function" ? getDrug(drugName) : null;
  const params = PK_PARAMS[key] || (drug?.id && PK_PARAMS[drug.id]) || PK_PARAMS[drugName.toLowerCase()];
  if (!params) return null;
  const ke = 0.693 / params.halfLife;
  const tMax = Math.min(params.halfLife * 8, 200); // up to 8 half-lives or 200h
  const pts = [];
  for (let i = 0; i <= nPoints; i++) {
    const t = (i / nPoints) * tMax;
    pts.push({ t, c: pkConcentration(params, t) });
  }
  return { pts, tMax, params };
}

// genotypeAdjustedPK(drugName, enzyme) — adjusts AUC for active genotype
function genotypeAdjustedPK(drugName, enzyme) {
  const geno = activeGenotype[enzyme];
  const eff = GENOTYPE_EFFECTS[enzyme]?.[geno];
  if (!eff) return 1.0;
  return eff.auc_fold;
}

// ═══════════════════════════════════════════════════════════════════
// MULTI-DRUG PHENOTYPE ACCUMULATION (#6)
// Serotonin load · QTc risk · Anticholinergic burden
// ═══════════════════════════════════════════════════════════════════

// PHENOTYPE_SCORES — contributions to each accumulation bucket per drug
// Sources: Beers Criteria, STOPP/START, CredibleMeds QTc risk list, ADS anticholinergic scale
const PHENOTYPE_SCORES = {
  // format: drugName (lowercase): { serotonin:0-3, qtc:0-3, anticholinergic:0-3, sedation:0-3, fall_risk:0-3 }
  'paroxetine':    { serotonin:3, qtc:1, anticholinergic:2, sedation:1, fall_risk:1 },
  'fluoxetine':    { serotonin:3, qtc:1, anticholinergic:1, sedation:1, fall_risk:1 },
  'sertraline':    { serotonin:3, qtc:1, anticholinergic:1, sedation:1, fall_risk:1 },
  'citalopram':    { serotonin:3, qtc:3, anticholinergic:1, sedation:1, fall_risk:1 },
  'escitalopram':  { serotonin:3, qtc:2, anticholinergic:1, sedation:1, fall_risk:1 },
  'venlafaxine':   { serotonin:3, qtc:1, anticholinergic:0, sedation:1, fall_risk:1 },
  'duloxetine':    { serotonin:3, qtc:0, anticholinergic:0, sedation:1, fall_risk:1 },
  'tramadol':      { serotonin:2, qtc:1, anticholinergic:0, sedation:2, fall_risk:2 },
  'linezolid':     { serotonin:2, qtc:0, anticholinergic:0, sedation:0, fall_risk:0 },
  'amitriptyline': { serotonin:2, qtc:2, anticholinergic:3, sedation:3, fall_risk:3 },
  'nortriptyline': { serotonin:2, qtc:2, anticholinergic:2, sedation:2, fall_risk:2 },
  'imipramine':    { serotonin:2, qtc:2, anticholinergic:3, sedation:3, fall_risk:3 },
  'clomipramine':  { serotonin:3, qtc:2, anticholinergic:3, sedation:3, fall_risk:3 },
  'haloperidol':   { serotonin:0, qtc:2, anticholinergic:1, sedation:2, fall_risk:2 },
  'quetiapine':    { serotonin:0, qtc:2, anticholinergic:2, sedation:3, fall_risk:3 },
  'olanzapine':    { serotonin:0, qtc:1, anticholinergic:2, sedation:3, fall_risk:2 },
  'risperidone':   { serotonin:0, qtc:2, anticholinergic:1, sedation:2, fall_risk:2 },
  'methadone':     { serotonin:1, qtc:3, anticholinergic:0, sedation:2, fall_risk:2 },
  'amiodarone':    { serotonin:0, qtc:3, anticholinergic:0, sedation:0, fall_risk:0 },
  'ondansetron':   { serotonin:1, qtc:2, anticholinergic:0, sedation:0, fall_risk:0 },
  'diphenhydramine':{ serotonin:0, qtc:1, anticholinergic:3, sedation:3, fall_risk:3 },
  'diazepam':      { serotonin:0, qtc:0, anticholinergic:0, sedation:3, fall_risk:3 },
  'lorazepam':     { serotonin:0, qtc:0, anticholinergic:0, sedation:3, fall_risk:3 },
  'alprazolam':    { serotonin:0, qtc:0, anticholinergic:0, sedation:2, fall_risk:2 },
  'zolpidem':      { serotonin:0, qtc:0, anticholinergic:0, sedation:3, fall_risk:3 },
  'codeine':       { serotonin:0, qtc:0, anticholinergic:0, sedation:2, fall_risk:2 },
  'oxycodone':     { serotonin:0, qtc:0, anticholinergic:0, sedation:2, fall_risk:2 },
  'morphine':      { serotonin:0, qtc:0, anticholinergic:0, sedation:2, fall_risk:2 },
};

Object.assign(PHENOTYPE_SCORES, {
  // Batch 01-03 receptor/phenotype score profiles.
  'amoxapine':       { serotonin:2, qtc:2, anticholinergic:3, sedation:3, fall_risk:3 },
  'amisulpride':     { serotonin:0, qtc:2, anticholinergic:0, sedation:1, fall_risk:2 },
  'sulpiride':       { serotonin:0, qtc:1, anticholinergic:0, sedation:1, fall_risk:2 },
  'loxapine':        { serotonin:0, qtc:1, anticholinergic:2, sedation:3, fall_risk:3 },
  'thiothixene':     { serotonin:0, qtc:1, anticholinergic:1, sedation:2, fall_risk:2 },
  'flupentixol':     { serotonin:0, qtc:1, anticholinergic:1, sedation:2, fall_risk:2 },
  'zuclopenthixol':  { serotonin:0, qtc:1, anticholinergic:1, sedation:3, fall_risk:3 },
  'prochlorperazine':{ serotonin:0, qtc:2, anticholinergic:2, sedation:2, fall_risk:3 },
  'promethazine':    { serotonin:0, qtc:1, anticholinergic:3, sedation:3, fall_risk:3 },
  'scopolamine':     { serotonin:0, qtc:0, anticholinergic:3, sedation:2, fall_risk:3 },
  'meclizine':       { serotonin:0, qtc:0, anticholinergic:2, sedation:2, fall_risk:3 },
  'solifenacin':     { serotonin:0, qtc:1, anticholinergic:2, sedation:1, fall_risk:2 },
  'tolterodine':     { serotonin:0, qtc:1, anticholinergic:3, sedation:1, fall_risk:2 },
  'darifenacin':     { serotonin:0, qtc:0, anticholinergic:3, sedation:1, fall_risk:2 },
  'trospium':        { serotonin:0, qtc:0, anticholinergic:2, sedation:1, fall_risk:2 },
  'alfuzosin':       { serotonin:0, qtc:1, anticholinergic:0, sedation:0, fall_risk:2 },
  'silodosin':       { serotonin:0, qtc:0, anticholinergic:0, sedation:0, fall_risk:2 },
  'lasmiditan':      { serotonin:1, qtc:0, anticholinergic:0, sedation:3, fall_risk:3 },
  'valbenazine':     { serotonin:0, qtc:1, anticholinergic:0, sedation:2, fall_risk:2 },
  'deutetrabenazine':{ serotonin:0, qtc:1, anticholinergic:0, sedation:2, fall_risk:2 },
  'tetrabenazine':   { serotonin:0, qtc:1, anticholinergic:0, sedation:2, fall_risk:2 },
  'pitolisant':      { serotonin:0, qtc:1, anticholinergic:0, sedation:0, fall_risk:0 },
  'solriamfetol':    { serotonin:0, qtc:0, anticholinergic:0, sedation:0, fall_risk:0 },
  'rotigotine':      { serotonin:0, qtc:0, anticholinergic:0, sedation:2, fall_risk:3 },
  'pramipexole':     { serotonin:0, qtc:0, anticholinergic:0, sedation:2, fall_risk:3 },
  'ropinirole':      { serotonin:0, qtc:0, anticholinergic:0, sedation:2, fall_risk:3 },
  'apomorphine':     { serotonin:0, qtc:1, anticholinergic:0, sedation:2, fall_risk:3 },
  'dalfampridine':   { serotonin:0, qtc:0, anticholinergic:0, sedation:0, fall_risk:1 },
  'ribociclib':      { serotonin:0, qtc:3, anticholinergic:0, sedation:0, fall_risk:0 },
  'adagrasib':       { serotonin:0, qtc:2, anticholinergic:0, sedation:0, fall_risk:0 },
  'lapatinib':       { serotonin:0, qtc:1, anticholinergic:0, sedation:0, fall_risk:0 },
  'lefamulin':      { serotonin:0, qtc:2, anticholinergic:0, sedation:0, fall_risk:0 },
  'palonosetron':    { serotonin:1, qtc:1, anticholinergic:0, sedation:0, fall_risk:0 },
  'fosaprepitant':   { serotonin:0, qtc:0, anticholinergic:0, sedation:1, fall_risk:1 },
  'netupitant':      { serotonin:0, qtc:0, anticholinergic:0, sedation:1, fall_risk:1 },
  'zolmitriptan':    { serotonin:1, qtc:0, anticholinergic:0, sedation:1, fall_risk:1 },
  'rizatriptan':     { serotonin:1, qtc:0, anticholinergic:0, sedation:1, fall_risk:1 },
  'eletriptan':      { serotonin:1, qtc:0, anticholinergic:0, sedation:1, fall_risk:1 },
  'naratriptan':     { serotonin:1, qtc:0, anticholinergic:0, sedation:1, fall_risk:1 },
  'almotriptan':     { serotonin:1, qtc:0, anticholinergic:0, sedation:1, fall_risk:1 },
  'frovatriptan':    { serotonin:1, qtc:0, anticholinergic:0, sedation:1, fall_risk:1 },
  'zolpidem':        PHENOTYPE_SCORES.zolpidem,
  'eszopiclone':     { serotonin:0, qtc:0, anticholinergic:0, sedation:3, fall_risk:3 },
  'ramelteon':       { serotonin:0, qtc:0, anticholinergic:0, sedation:1, fall_risk:1 },
  'lemborexant':     { serotonin:0, qtc:0, anticholinergic:0, sedation:3, fall_risk:3 },
  'daridorexant':    { serotonin:0, qtc:0, anticholinergic:0, sedation:3, fall_risk:3 },
  'pimozide':        { serotonin:0, qtc:3, anticholinergic:0, sedation:1, fall_risk:2 },
  'ziprasidone':     { serotonin:0, qtc:3, anticholinergic:0, sedation:2, fall_risk:2 },
  'domperidone':     { serotonin:0, qtc:3, anticholinergic:0, sedation:0, fall_risk:1 },
  'iloperidone':     { serotonin:0, qtc:2, anticholinergic:0, sedation:2, fall_risk:3 },
  'pimavanserin':    { serotonin:0, qtc:2, anticholinergic:0, sedation:1, fall_risk:2 },
  'thioridazine':    { serotonin:0, qtc:3, anticholinergic:3, sedation:3, fall_risk:3 },
  'chlorpromazine':  { serotonin:0, qtc:2, anticholinergic:3, sedation:3, fall_risk:3 },
  'fluphenazine':    { serotonin:0, qtc:1, anticholinergic:1, sedation:2, fall_risk:2 },
  'hydroxyzine':     { serotonin:0, qtc:1, anticholinergic:3, sedation:3, fall_risk:3 },
  'alfentanil':      { serotonin:0, qtc:0, anticholinergic:0, sedation:3, fall_risk:3 },
  'bedaquiline':     { serotonin:0, qtc:2, anticholinergic:0, sedation:0, fall_risk:0 },
  'nilotinib':       { serotonin:0, qtc:2, anticholinergic:0, sedation:0, fall_risk:0 },
  'hydroxychloroquine':{ serotonin:0, qtc:2, anticholinergic:0, sedation:0, fall_risk:0 },
  'mdma_ecstasy':    { serotonin:2, qtc:1, anticholinergic:0, sedation:0, fall_risk:1 },
  'mda':             { serotonin:2, qtc:1, anticholinergic:0, sedation:0, fall_risk:1 },
  'alcohol_ethanol': { serotonin:0, qtc:0, anticholinergic:0, sedation:3, fall_risk:3 },
});

// computePhenotypeAccumulation(drugList) — sums all risk scores
const WASHOUT_DAYS = {
  'norfluoxetine':  { days: 35, mechanism:'MBI_irreversible', note:"Fluoxetine/norfluoxetine CYP2D6: ~5 weeks for enzyme resynthesis" },
  'paroxetine':     { days: 18, mechanism:'MBI_irreversible', note:"Paroxetine CYP2D6: ~2-3 weeks for full CYP2D6 recovery. HIGH-DOSE WARNING (≥40mg/day): nonlinear auto-inhibition kinetics mean washout is prolonged and discontinuation syndrome risk is high — taper at 5mg/2-4 weeks (not standard 10mg/week)." },
  'hydroxybupropion':{ days:5,  mechanism:'competitive',      note:"Bupropion CYP2D6: ~5 days competitive inhibition clearance" },
  'amiodarone':     { days: 90, mechanism:'MBI+accumulation', note:"Amiodarone: 40-day t½ + tissue redistribution; months for full washout" },
  'bergamottin':    { days: 3,  mechanism:'MBI_intestinal',   note:"Grapefruit CYP3A4: gut enzyme resynthesis 24-72h" },
  'rifampin':       { days: 14, mechanism:'induction_reversal',note:"Rifampin CYP3A4 induction: 2 weeks to de-induce after stopping" },
  'carbamazepine':  { days: 21, mechanism:'induction_reversal',note:"Carbamazepine: 2-3 weeks for CYP3A4 induction reversal" },
  'st-johns-wort':  { days: 7,  mechanism:'induction_reversal',note:"St. John's Wort: ~1 week for P-gp/CYP3A4 induction reversal" },
  'clarithromycin': { days: 3,  mechanism:'MBI_CYP3A4',        note:"Clarithromycin CYP3A4/P-gp mechanism-based inhibition: allow ~3 days for enzyme resynthesis after stopping" },
  'erythromycin':   { days: 3,  mechanism:'MBI_CYP3A4',        note:"Erythromycin CYP3A4 mechanism-based inhibition: allow ~3 days recovery; generally weaker than clarithromycin" },
  'fluconazole':    { days: 7,  mechanism:'competitive_CYP2C9_2C19_3A4', note:"Fluconazole t½ ~30h: ~5 half-lives gives ~6-7 days for clearance of competitive CYP2C9/2C19/3A4 inhibition" },
  'itraconazole':   { days: 14, mechanism:'competitive_CYP3A4_Pgp', note:"Itraconazole and active hydroxy-itraconazole persist; allow up to 14 days for conservative CYP3A4/P-gp recovery" },
  'ketoconazole':   { days: 5,  mechanism:'competitive_CYP3A4', note:"Ketoconazole competitive CYP3A4 inhibition: conservative 5-day clearance interval" },
  'voriconazole':   { days: 5,  mechanism:'competitive_CYP2C19_2C9_3A4', note:"Voriconazole competitive inhibition across CYP2C19/2C9/3A4: conservative 4-5 day clearance interval" },
  'fluvoxamine':    { days: 5,  mechanism:'strong_CYP1A2_2C19_inhibition', note:"Fluvoxamine strong CYP1A2/CYP2C19 inhibition: allow ~5 days for practical offset after stopping" },
  'ciprofloxacin':  { days: 3,  mechanism:'competitive_CYP1A2', note:"Ciprofloxacin CYP1A2 inhibition: short half-life; conservative 2-3 day clearance interval" },
  'phenytoin':      { days: 21, mechanism:'induction_reversal', note:"Phenytoin CYP3A4/2C9/1A2 induction: 2-3 weeks for de-induction after stopping" },
  'primidone':      { days: 21, mechanism:'induction_reversal', note:"Primidone metabolizes partly to phenobarbital; allow 2-3 weeks for barbiturate-like induction reversal" },
  'phenelzine':     { days: 14, mechanism:'MAOI_irreversible', note:"Phenelzine irreversible MAO-A/MAO-B inhibitor: minimum 14 days before serotonergic agents; new enzyme synthesis required" },
  'tranylcypromine':{ days: 14, mechanism:'MAOI_irreversible', note:"Tranylcypromine irreversible MAOI: 14-day medication-free interval before contraindicated serotonergic/sympathomimetic drugs" },
  'rasagiline':     { days: 14, mechanism:'MAOI_B_irreversible', note:"Rasagiline irreversible MAO-B inhibitor: label recommends at least 14 days before selected serotonergic/opioid/MAOI agents" },
  'selegiline':     { days: 14, mechanism:'MAOI_B_irreversible', note:"Selegiline irreversible MAO-B inhibitor: 14 days before SSRIs/SNRIs/TCAs and selected opioids or MAOIs" },
  'linezolid':      { days: 3,  mechanism:'MAOI_reversible',  note:"Linezolid reversible MAO inhibitor: short offset; 3-day display interval is conservative relative to label monitoring through 24h after last dose" },
  'valproic-acid':  { days: 7,  mechanism:'UGT_inhibition', note:"Valproate inhibits lamotrigine metabolism and prolongs lamotrigine half-life; allow 5-7 days for practical offset after stopping VPA" },
};

Object.assign(WASHOUT_DAYS, {
  // Batch 01-03 washout additions for persistent inhibitors/inducers or long-offset immune agents.
  'vemurafenib':    { days:14, mechanism:'CYP1A2_inhibition_CYP3A_induction_offset', note:"Vemurafenib inhibits CYP1A2 and can induce CYP3A4; use a conservative 2-week offset for sensitive victims." },
  'felbamate':      { days:14, mechanism:'CYP2C19_inhibition_CYP3A_induction_offset', note:"Felbamate inhibits CYP2C19 and induces CYP3A4; allow roughly 2 weeks for induction/inhibition context to settle." },
  'cenobamate':     { days:14, mechanism:'CYP2C19_inhibition_CYP3A_CYP2B6_induction_offset', note:"Cenobamate has a long half-life and inhibits CYP2C19 while inducing CYP3A4/CYP2B6; conservative offset is 2 weeks." },
  'eslicarbazepine':{ days:14, mechanism:'CYP2C19_inhibition_CYP3A_induction_offset', note:"Eslicarbazepine inhibits CYP2C19 and induces CYP3A4; use a conservative 2-week interaction offset." },
  'stiripentol':    { days:7, mechanism:'multi_CYP_inhibition_offset', note:"Stiripentol inhibits several CYP pathways; allow about a week after stopping for practical interaction offset." },
  'adagrasib':      { days:7, mechanism:'CYP3A_CYP2C9_CYP2D6_Pgp_inhibition_offset', note:"Adagrasib inhibits CYP3A/CYP2C9/CYP2D6/P-gp and has a multi-day half-life; allow about 1 week for sensitive substrates." },
  'ribociclib':     { days:7, mechanism:'CYP3A_inhibition_QT_offset', note:"Ribociclib inhibits CYP3A and has QT context; allow about 1 week after stopping before sensitive CYP3A/QT combinations." },
  'netupitant':     { days:14, mechanism:'long_half_life_CYP3A_inhibition_offset', note:"Netupitant has a long half-life and inhibits CYP3A; use a conservative 2-week interval for sensitive CYP3A substrates." },
  'fosaprepitant':  { days:5, mechanism:'aprepitant_CYP3A_inhibition_induction_offset', note:"Fosaprepitant forms aprepitant; CYP3A inhibition/induction effects can persist several days." },
  'mirabegron':     { days:7, mechanism:'CYP2D6_inhibition_offset', note:"Mirabegron inhibits CYP2D6 and has a long half-life; allow about 1 week before assuming CYP2D6 victim exposure normalizes." },
  'lefamulin':      { days:3, mechanism:'CYP3A_inhibition_QT_offset', note:"Lefamulin inhibits CYP3A and has QT context; short course offset is generally days, not weeks." },
  'tecovirimat':    { days:7, mechanism:'CYP3A_CYP2B6_induction_offset', note:"Tecovirimat can induce CYP3A/CYP2B6; use about 1 week for practical de-induction after a treatment course." },
  'pitolisant':     { days:7, mechanism:'CYP2D6_inhibition_QT_offset', note:"Pitolisant is CYP2D6-sensitive and can inhibit CYP2D6; use about 1 week around sensitive CYP2D6/QT changes." },
  'fingolimod':     { days:60, mechanism:'S1P_modulator_immune_reconstitution', note:"Fingolimod immune and cardiac monitoring context can persist after drug stop; label-style washout is weeks to months." },
  'ozanimod':       { days:30, mechanism:'S1P_modulator_active_metabolite_offset', note:"Ozanimod active metabolites and immune effects persist; use about 1 month for conservative switch/vaccine planning." },
  'ponesimod':      { days:14, mechanism:'S1P_modulator_immune_reconstitution', note:"Ponesimod lymphocyte recovery is shorter than fingolimod, but switch/vaccine planning still needs a conservative interval." },
  'cladribine':     { days:90, mechanism:'lymphocyte_depletion_reconstitution', note:"Cladribine causes prolonged lymphocyte effects; live vaccine/immunosuppression planning should use months, not parent half-life." },
  'teriflunomide':  { days:730, mechanism:'enterohepatic_recirculation_accelerated_elimination_needed', note:"Teriflunomide can persist for many months to years without accelerated elimination; use label washout procedures for pregnancy or toxicity." },
});

Object.assign(WASHOUT_DAYS, {
  // Phase 3 persistence/timing additions for high-risk PK, QT, bleeding, and active-moiety rows.
  'busulfan':       { days:14, mechanism:'conditioning_TDM_and_myelohepatic_toxicity_offset', note:"Busulfan plasma half-life is short, but conditioning toxicity, marrow reserve, seizure prophylaxis, and VOD monitoring persist beyond parent clearance." },
  'dofetilide':     { days:3, mechanism:'renal_QT_offset', note:"Dofetilide QT risk follows renal clearance and dose interval; use at least several days before assuming additive QT risk has settled." },
  'sotalol':        { days:3, mechanism:'renal_beta_blocker_QT_offset', note:"Sotalol has renal clearance and QT/bradycardia context; allow several days and reassess renal function/electrolytes." },
  'disopyramide':   { days:3, mechanism:'class_Ia_QT_anticholinergic_offset', note:"Disopyramide QT, negative inotropy, and anticholinergic effects generally require a multi-day offset after stopping." },
  'procainamide':   { days:3, mechanism:'class_Ia_NAPA_QT_offset', note:"Procainamide and NAPA can persist longer in renal impairment; use a conservative multi-day QT/proarrhythmia offset." },
  'propafenone':    { days:7, mechanism:'cyp2d6_class_Ic_offset', note:"Propafenone has CYP2D6-sensitive exposure and active metabolites; allow about a week for antiarrhythmic and CYP2D6-inhibition context to settle." },
  'flecainide':     { days:7, mechanism:'class_Ic_narrow_index_offset', note:"Flecainide is narrow-index with renal/CYP2D6 context; use about a week before assuming conduction risk has normalized." },
  'mexiletine':     { days:3, mechanism:'class_Ib_cyp_offset', note:"Mexiletine CNS/cardiac exposure and CYP interaction context generally settles over several days." },
  'ticlopidine':    { days:10, mechanism:'irreversible_P2Y12_platelet_turnover', note:"Ticlopidine irreversibly inhibits platelets; practical antiplatelet offset follows platelet turnover, not parent plasma half-life." },
  'clopidogrel':    { days:7, mechanism:'irreversible_P2Y12_platelet_turnover', note:"Clopidogrel active thiol effect persists for platelet lifespan; use about 5-7 days for procedure/bleeding timing." },
  'prasugrel':      { days:7, mechanism:'irreversible_P2Y12_platelet_turnover', note:"Prasugrel platelet inhibition persists after parent clearance; procedure planning usually follows platelet turnover." },
  'cangrelor':      { days:1, mechanism:'short_acting_P2Y12_transition_timing', note:"Cangrelor offset is minutes to hours, but transition timing to oral P2Y12 agents is protocol-critical on the same day." },
  'vorapaxar':      { days:56, mechanism:'long_half_life_PAR1_platelet_antagonism', note:"Vorapaxar has very long persistence; bleeding-risk context can last many weeks after discontinuation." },
  'betrixaban':     { days:5, mechanism:'factor_Xa_bleeding_offset', note:"Betrixaban half-life supports a multi-day anticoagulant/procedure timing window, longer with renal impairment or bleeding risk." },
  'acenocoumarol':  { days:5, mechanism:'vitamin_K_antagonist_INR_offset', note:"Acenocoumarol offset follows INR and vitamin-K-cycle recovery, not only parent half-life." },
  'bedaquiline':    { days:180, mechanism:'very_long_terminal_half_life_QT_offset', note:"Bedaquiline has very long terminal persistence and QT context; additive QT/interacting-drug planning can remain relevant for months." },
  'nilotinib':      { days:7, mechanism:'CYP3A_QT_oncology_offset', note:"Nilotinib CYP3A and QT context supports about a week of conservative interaction/QT offset after stopping." },
  'hydroxychloroquine':{ days:60, mechanism:'large_volume_long_terminal_QT_offset', note:"Hydroxychloroquine has long tissue persistence; QT, retinal, and toxicity context can outlast short dosing interruptions." },
  'methadone':      { days:14, mechanism:'variable_long_half_life_QT_resp_offset', note:"Methadone has variable long half-life, respiratory-depression, and QT context; conservative offset is days to weeks." },
  'pimozide':       { days:14, mechanism:'long_half_life_CYP2D6_CYP3A_QT_offset', note:"Pimozide label titration/genotype context and long half-life support a conservative 2-week QT/CYP-sensitive offset." },
  'leflunomide':    { days:730, mechanism:'teriflunomide_enterohepatic_recirculation', note:"Leflunomide forms teriflunomide; without accelerated elimination, pregnancy/toxicity washout can require months to years." },
  'prochlorperazine':{ days:3, mechanism:'phenothiazine_QT_EPS_sedation_offset', note:"Phenothiazine QT/EPS/sedation context generally settles over several days, longer after high-dose or depot-like exposure." },
  'ziprasidone':    { days:3, mechanism:'antipsychotic_QT_offset', note:"Ziprasidone QT risk generally needs several half-lives plus electrolyte/risk-factor reassessment." },
  'lapatinib':      { days:7, mechanism:'CYP3A_hepatotoxicity_QT_offset', note:"Lapatinib CYP3A, hepatic, diarrhea, and QT context supports about a week of conservative offset for sensitive combinations." },
  'gemfibrozil':    { days:4, mechanism:'CYP2C8_OATP_inhibition_offset', note:"Gemfibrozil interaction context can outlast parent half-life for CYP2C8/OATP-sensitive victims; use several days before assuming offset." },
  'everolimus':     { days:7, mechanism:'CYP3A_Pgp_mTOR_offset', note:"Everolimus has CYP3A/P-gp interaction and immunosuppressive context; use about a week for practical exposure offset." },
  'abciximab':      { days:2, mechanism:'platelet_bound_GPIIbIIIa_offset', note:"Abciximab platelet-bound effect can persist after plasma clearance; procedure/bleeding timing is protocol-driven." },
  'alteplase':      { days:1, mechanism:'thrombolytic_bleeding_protocol_offset', note:"Alteplase plasma clearance is rapid, but acute bleeding/thrombolysis protocol precautions remain same-day critical." },
  'tenecteplase':   { days:1, mechanism:'thrombolytic_bleeding_protocol_offset', note:"Tenecteplase offset is dominated by acute fibrinolytic protocol and bleeding monitoring rather than long plasma persistence." },
  'alcohol_ethanol':{ days:1, mechanism:'acute_CNS_metabolic_offset', note:"Ethanol clearance is variable and nonlinear; same-day CNS depression, hypoglycemia, and withdrawal/context risk should be considered." },
  'mdma_ecstasy':   { days:3, mechanism:'serotonergic_stimulant_hyperthermia_offset', note:"MDMA serotonergic/stimulant and hyponatremia/hyperthermia context can persist beyond acute intoxication." },
  'mda':            { days:3, mechanism:'serotonergic_stimulant_offset', note:"MDA serotonergic/stimulant context supports a multi-day caution window after exposure." },
});

// computeWashoutCalendar(drugNames, stopDate) — returns washout schedule
// stopDate: Date object (today by default)
function computeWashoutCalendar(drugNames, stopDate = new Date()) {
  const graph = getInteractionGraph();
  const events = [];
  for (const drugName of drugNames) {
    const drugId = typeof getDrugGraphId === "function" ? getDrugGraphId(drugName) : toGraphId(drugName);
    const nodeIds = [drugId].concat(WASHOUT_SOURCE_ALIASES[drugId] || []);
    const metabEdges = (graph.edges||[]).filter(e => e.from === drugId &&
      (e.type === EDGE_TYPE.METABOLIZED_TO));
    for (const me of metabEdges) nodeIds.push(me.to);
    for (const nid of nodeIds) {
      const wo = WASHOUT_DAYS[nid];
      const tp = getTemporalProfile(nid);
      if (!wo && !tp) continue;
      const name = getTemporalActorName(graph, nid, drugName);
      const days = wo?.days || 14;
      const safeDate = new Date(stopDate.getTime() + days * 86400000);
      events.push({
        drugName, actorId: nid, name,
        days, mechanism: wo?.mechanism || tp?.mechanism || 'unknown',
        note: wo?.note || tp?.note || '',
        safeDate,
        safeDateStr: safeDate.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),
      });
    }
  }
  // Sort by days descending (longest washout first)
  return events.sort((a,b) => b.days - a.days);
}

// ═══════════════════════════════════════════════════════════════════
// ADVERSE EFFECT BURDEN SCORING (#10)
// Anticholinergic Cognitive Burden (ACB), Sedative Load, Fall Risk
// Beers Criteria 2023, STOPP v3
// ═══════════════════════════════════════════════════════════════════

// ACB_SCORES — Anticholinergic Cognitive Burden scale (0-3)
// Source: Anticholinergic Cognitive Burden Scale (Rudolph et al. 2008, updated)
const ACB_SCORES = {
  'amitriptyline':3,'nortriptyline':2,'imipramine':3,'clomipramine':3,
  'doxepin':3,'trimipramine':3,'maprotiline':3,'amoxapine':3,
  'diphenhydramine':3,'hydroxyzine':3,'promethazine':3,'cyproheptadine':2,
  'chlorpheniramine':2,'brompheniramine':2,
  'oxybutynin':3,'tolterodine':3,'fesoterodine':2,'solifenacin':2,'darifenacin':3,
  'atropine':3,'hyoscyamine':3,'scopolamine':3,
  'haloperidol':2,'chlorpromazine':3,'thioridazine':3,'clozapine':3,
  'quetiapine':2,'olanzapine':2,'risperidone':1,
  'paroxetine':2,'fluoxetine':1,'sertraline':1,
  'mirtazapine':2,'trazodone':1,
  'carbamazepine':2,'oxcarbazepine':1,'lamotrigine':1,'phenobarbital':2,
  'metoclopramide':1,'prochlorperazine':2,
  'nifedipine':1,'diltiazem':1,'digoxin':1,
  'codeine':0,'morphine':0,'oxycodone':0,
  'diazepam':0,'lorazepam':0,'alprazolam':0,
  'cimetidine':1,'ranitidine':1,
};

Object.assign(ACB_SCORES, {
  'meclizine':2,
  'trospium':2,
  'loxapine':2,
  'thiothixene':1,
  'flupentixol':1,
  'zuclopenthixol':1,
  'amisulpride':0,
  'sulpiride':0,
  'solifenacin':2,
  'tolterodine':3,
  'darifenacin':3,
  'prochlorperazine':2,
  'promethazine':3,
  'scopolamine':3,
  'fluphenazine':1,
  'ziprasidone':0,
  'pimozide':0,
});

// BEERS_FLAGS — drugs flagged for older adults (≥65) per Beers 2023
const BEERS_FLAGS = {
  'diphenhydramine':{ concern:'CNS effects; high anticholinergic', avoid:'generally_avoid_65plus' },
  'diazepam':       { concern:'Falls/fractures; cognitive impairment', avoid:'benzodiazepines_65plus' },
  'lorazepam':      { concern:'Falls/fractures; cognitive impairment', avoid:'benzodiazepines_65plus' },
  'alprazolam':     { concern:'Falls/fractures; cognitive impairment', avoid:'benzodiazepines_65plus' },
  'zolpidem':       { concern:'Falls/fractures; cognitive impairment', avoid:'sleep_aids_65plus' },
  'amitriptyline':  { concern:'Highly anticholinergic; QTc risk; orthostatic hypotension', avoid:'TCAs_65plus' },
  'imipramine':     { concern:'Highly anticholinergic; QTc risk', avoid:'TCAs_65plus' },
  'oxybutynin':     { concern:'CNS adverse effects; anticholinergic', avoid:'bladder_antimuscarinics_65plus' },
  'nifedipine':     { concern:'Hypotension; constipation', avoid:'immediate_release_CCB_65plus' },
  'amiodarone':     { concern:'Thyroid; pulmonary toxicity; QTc', avoid:'antiarrhythmics_65plus_caution' },
  'methadone':      { concern:'QTc; respiratory depression', avoid:'opioid_65plus_caution' },
  'meperidine':     { concern:'CNS toxicity; seizures', avoid:'avoid_65plus' },
  'indomethacin':   { concern:'GI toxicity; acute kidney injury', avoid:'NSAIDs_65plus' },
  'temazepam':      { concern:'Falls/fractures; cognitive impairment; psychomotor impairment', avoid:'benzodiazepines_65plus' },
  'flurazepam':     { concern:'Falls/fractures; long-lived active metabolite; cognitive impairment', avoid:'benzodiazepines_65plus' },
  'quazepam':       { concern:'Falls/fractures; long-lived active metabolite; cognitive impairment', avoid:'benzodiazepines_65plus' },
  'oxazepam':       { concern:'Falls/fractures; cognitive impairment', avoid:'benzodiazepines_65plus' },
  'clorazepate':    { concern:'Falls/fractures; cognitive impairment; long-acting active metabolite', avoid:'benzodiazepines_65plus' },
  'thioridazine':   { concern:'QTc prolongation; CYP2D6-sensitive exposure; extrapyramidal effects', avoid:'antipsychotics_65plus_high_caution' },
  'chlorpromazine': { concern:'Orthostatic hypotension; sedation; anticholinergic effects; QTc risk', avoid:'antipsychotics_65plus_high_caution' },
  'fluphenazine':   { concern:'Extrapyramidal effects; sedation; tardive dyskinesia risk', avoid:'antipsychotics_65plus_caution' },
  'perphenazine':   { concern:'Extrapyramidal effects; sedation; CYP2D6-sensitive exposure', avoid:'antipsychotics_65plus_caution' },
  'pimozide':       { concern:'QTc prolongation; CYP2D6/CYP3A-sensitive exposure; extrapyramidal effects', avoid:'antipsychotics_65plus_high_caution' },
  'quetiapine':     { concern:'Sedation; orthostatic hypotension; falls; metabolic risk', avoid:'antipsychotics_65plus_caution' },
  'olanzapine':     { concern:'Sedation; anticholinergic effects; metabolic risk; falls', avoid:'antipsychotics_65plus_caution' },
  'iloperidone':    { concern:'QTc prolongation; orthostatic hypotension; falls', avoid:'antipsychotics_65plus_caution' },
  'dronedarone':    { concern:'Higher mortality in permanent AF; QTc and hepatic risk', avoid:'antiarrhythmics_65plus_caution' },
  'disopyramide':   { concern:'Strongly anticholinergic; negative inotrope; avoid in heart failure', avoid:'antiarrhythmics_65plus' },
  'procainamide':   { concern:'Torsades risk; lupus-like syndrome; NAPA accumulation in renal impairment', avoid:'antiarrhythmics_65plus_caution' },
  'sotalol':        { concern:'QTc prolongation; torsades risk; dose-dependent renal accumulation', avoid:'antiarrhythmics_65plus_caution' },
  'dofetilide':     { concern:'QTc prolongation; narrow therapeutic window; requires renal adjustment', avoid:'antiarrhythmics_65plus_caution' },
  'hydroxyzine':    { concern:'Highly anticholinergic; sedation; cognitive impairment; QTc risk', avoid:'antihistamines_65plus' },
  'maprotiline':    { concern:'Highly anticholinergic; seizure risk; QTc risk', avoid:'TCAs_65plus' },
  'trimipramine':   { concern:'Highly anticholinergic; QTc risk; orthostatic hypotension', avoid:'TCAs_65plus' },
  'desipramine':    { concern:'Anticholinergic effects; cardiac conduction risk', avoid:'TCAs_65plus' },
  'eszopiclone':    { concern:'Cognitive impairment; delirium; falls; next-day motor impairment', avoid:'sleep_aids_65plus' },
  'methyldopa':     { concern:'CNS adverse effects; bradycardia; orthostatic hypotension', avoid:'antihypertensives_65plus_avoid' },
  'clonidine':      { concern:'Bradycardia; orthostatic hypotension; CNS depression; rebound hypertension on discontinuation', avoid:'antihypertensives_65plus_caution' },
  'chlorzoxazone':  { concern:'Sedation; falls risk; anticholinergic-like adverse effects; hepatotoxicity', avoid:'muscle_relaxants_65plus' },
  'desmopressin':   { concern:'Hyponatremia risk in older adults; avoid for nocturia', avoid:'desmopressin_65plus' },
  'dipyridamole':   { concern:'Orthostatic hypotension in older adults, especially immediate-release oral use', avoid:'vasodilators_65plus_caution' },
  'trihexyphenidyl':{ concern:'Highly anticholinergic; hallucinations; urinary retention; cognitive impairment', avoid:'anticholinergics_65plus' },
  'benztropine':    { concern:'Highly anticholinergic; delirium risk; urinary retention', avoid:'anticholinergics_65plus' },
};

Object.assign(BEERS_FLAGS, {
  // Batch 01-03 older-adult safety flags.
  'amoxapine':       { concern:'Antidepressant with anticholinergic, sedating, seizure, orthostasis, and cardiac-conduction burden', avoid:'TCAs_65plus' },
  'meclizine':       { concern:'Anticholinergic antihistamine; sedation, confusion, urinary retention, and falls', avoid:'antihistamines_65plus' },
  'promethazine':    { concern:'Highly anticholinergic and sedating phenothiazine antihistamine; delirium/falls/respiratory depression risk', avoid:'antihistamines_65plus' },
  'prochlorperazine':{ concern:'Phenothiazine antiemetic/antipsychotic; extrapyramidal effects, QT, sedation, anticholinergic burden, and falls', avoid:'antipsychotics_65plus_caution' },
  'scopolamine':     { concern:'Strong anticholinergic; delirium, urinary retention, blurred vision, and falls', avoid:'anticholinergics_65plus' },
  'solifenacin':     { concern:'Bladder antimuscarinic with anticholinergic cognitive and constipation/urinary retention burden', avoid:'bladder_antimuscarinics_65plus' },
  'tolterodine':     { concern:'Bladder antimuscarinic with anticholinergic cognitive and QT/CYP2D6 exposure context', avoid:'bladder_antimuscarinics_65plus' },
  'darifenacin':     { concern:'Bladder antimuscarinic with anticholinergic cognitive and constipation/urinary retention burden', avoid:'bladder_antimuscarinics_65plus' },
  'trospium':        { concern:'Bladder antimuscarinic; renal accumulation and anticholinergic adverse effects can matter in older adults', avoid:'bladder_antimuscarinics_65plus' },
  'alfuzosin':       { concern:'Alpha-1 blocker; orthostatic hypotension and falls, especially when used for blood pressure or with vasodilators', avoid:'alpha1_blockers_65plus_caution' },
  'silodosin':       { concern:'Alpha-1 blocker; orthostatic hypotension and falls, especially with PDE5 inhibitors or antihypertensives', avoid:'alpha1_blockers_65plus_caution' },
  'loxapine':        { concern:'Antipsychotic; sedation, extrapyramidal effects, anticholinergic burden, and falls', avoid:'antipsychotics_65plus_caution' },
  'thiothixene':     { concern:'Typical antipsychotic; extrapyramidal effects, sedation, QT/fall risk', avoid:'antipsychotics_65plus_caution' },
  'flupentixol':     { concern:'Typical antipsychotic; extrapyramidal effects, sedation, orthostasis, and falls', avoid:'antipsychotics_65plus_caution' },
  'zuclopenthixol':  { concern:'Typical antipsychotic; extrapyramidal effects, sedation, orthostasis, and falls', avoid:'antipsychotics_65plus_caution' },
  'amisulpride':     { concern:'Antipsychotic; QT and extrapyramidal/fall risk in older adults', avoid:'antipsychotics_65plus_caution' },
  'sulpiride':       { concern:'Antipsychotic; extrapyramidal effects, sedation, and fall risk', avoid:'antipsychotics_65plus_caution' },
  'valbenazine':     { concern:'VMAT2 inhibitor; somnolence, parkinsonism, QT context, and falls', avoid:'movement_disorder_agents_65plus_caution' },
  'deutetrabenazine':{ concern:'VMAT2 inhibitor; depression/suicidality warning context, parkinsonism, somnolence, QT, and falls', avoid:'movement_disorder_agents_65plus_caution' },
  'tetrabenazine':   { concern:'VMAT2 inhibitor; depression/suicidality warning context, parkinsonism, somnolence, QT, and falls', avoid:'movement_disorder_agents_65plus_caution' },
  'lasmiditan':      { concern:'Marked CNS impairment/driving warning; dizziness, sedation, and falls', avoid:'cns_impairing_agents_65plus_caution' },
  'lemborexant':     { concern:'Orexin antagonist hypnotic; next-day impairment, cognitive effects, and falls', avoid:'sleep_aids_65plus' },
  'daridorexant':    { concern:'Orexin antagonist hypnotic; next-day impairment, cognitive effects, and falls', avoid:'sleep_aids_65plus' },
  'ziprasidone':      { concern:'Antipsychotic with prominent QTc prolongation potential, sedation, orthostasis, and falls', avoid:'antipsychotics_65plus_high_caution' },
  'domperidone':      { concern:'QTc prolongation and ventricular arrhythmia concern; use extra caution in older adults and with CYP3A/QT stacks', avoid:'qt_prolonging_gi_agents_65plus_caution' },
  'pimavanserin':     { concern:'Antipsychotic-class mortality warning context in dementia-related psychosis plus QT/sedation/fall risk', avoid:'antipsychotics_65plus_caution' },
});

function getScoringLookupKeys(drugOrName) {
  const drug = typeof drugOrName === "object" && drugOrName !== null
    ? drugOrName
    : (typeof getDrug === "function" ? getDrug(drugOrName) : null);
  const name = drug?.name || String(drugOrName || "");
  const lower = name.toLowerCase();
  const graphId = typeof getDrugGraphId === "function"
    ? getDrugGraphId(name)
    : (typeof toGraphId === "function" ? toGraphId(name) : lower.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  const simpleGraph = typeof toGraphId === "function"
    ? toGraphId(name)
    : lower.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return [...new Set([
    drug?.id,
    graphId,
    simpleGraph,
    lower,
    lower.replace(/\s+/g, "_").replace(/-/g, ""),
    lower.replace(/\s/g, ""),
  ].filter(Boolean))];
}

function getScoringValue(table, drugOrName) {
  for (const key of getScoringLookupKeys(drugOrName)) {
    if (Object.prototype.hasOwnProperty.call(table || {}, key)) return table[key];
  }
  return undefined;
}

function assertReviewedScoringRow(row, scorerName) {
  if (!row || typeof row !== "object") return;
  const status = String(row.professionalReviewStatus || row.reviewStatus || "").toLowerCase();
  if (row.pendingSourceSignal === true || row.experimentalOnly === true || status.includes("pending")) {
    const label = row.name || row.id || row.label || "unknown row";
    throw new Error(`${scorerName} received pending or experimental input: ${label}`);
  }
}

// computeAdverseBurden(drugList) — full adverse effect burden analysis
function computeAdverseBurden(drugList) {
  const result = {
    acb_total: 0, acb_contributors: [],
    beers_flags: [],
    sedation_contributors: [],
    fall_risk_total: 0, fall_risk_contributors: [],
    summary: []
  };
  for (const drug of drugList) {
    assertReviewedScoringRow(drug, "computeAdverseBurden");
    const acb = getScoringValue(ACB_SCORES, drug);
    if (acb > 0) {
      result.acb_total += acb;
      result.acb_contributors.push({ name: drug.name, score: acb });
    }
    const beers = getScoringValue(BEERS_FLAGS, drug);
    if (beers) result.beers_flags.push({ name: drug.name, ...beers });
    if (drug.props?.sedation) result.sedation_contributors.push(drug.name);
    const fall = (getScoringValue(PHENOTYPE_SCORES, drug)?.fall_risk || 0);
    if (fall > 0) {
      result.fall_risk_total += fall;
      result.fall_risk_contributors.push({ name: drug.name, score: fall });
    }
  }
  // Summary interpretation
  if (result.acb_total >= 3) result.summary.push(`ACB score ${result.acb_total} — high risk of cognitive impairment, delirium, urinary retention`);
  else if (result.acb_total >= 1) result.summary.push(`ACB score ${result.acb_total} — some anticholinergic burden; monitor in elderly`);
  if (result.beers_flags.length > 0) result.summary.push(`${result.beers_flags.length} Beers Criteria flag(s) for older adults`);
  if (result.sedation_contributors.length >= 2) result.summary.push(`${result.sedation_contributors.length} sedating agents — combined CNS depression risk`);
  if (result.fall_risk_total >= 4) result.summary.push(`High fall risk accumulation (score ${result.fall_risk_total})`);
  return result;
}

// ═══════════════════════════════════════════════════════════════════
// TRANSPORTER-ENZYME CROSSTALK (#7)
// Two-step gut extraction: Fg = (1 − Emetab) × (1 − Etransporter)
// ═══════════════════════════════════════════════════════════════════

// computeGutExtraction(drugName) — estimates oral bioavailability loss from gut wall
// Returns {Emetab, Etransporter, Fg, note}
