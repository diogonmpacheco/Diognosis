// MedCheck — PK parameters, temporal profiles, phenotype/burden scoring data
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
};

function getTemporalProfile(actorId) {
  return TEMPORAL_PROFILES[actorId] || null;
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
      const actor = graph.actors[nid];
      const name = actor ? actor.name : nid;
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
  const params = PK_PARAMS[toGraphId(drugName)] || PK_PARAMS[drugName.toLowerCase()];
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
};

// computeWashoutCalendar(drugNames, stopDate) — returns washout schedule
// stopDate: Date object (today by default)
function computeWashoutCalendar(drugNames, stopDate = new Date()) {
  const graph = getInteractionGraph();
  const events = [];
  for (const drugName of drugNames) {
    const drugId = toGraphId(drugName);
    const nodeIds = [drugId].concat(WASHOUT_SOURCE_ALIASES[drugId] || []);
    const metabEdges = (graph.edges||[]).filter(e => e.from === drugId &&
      (e.type === EDGE_TYPE.METABOLIZED_TO));
    for (const me of metabEdges) nodeIds.push(me.to);
    for (const nid of nodeIds) {
      const wo = WASHOUT_DAYS[nid];
      const tp = getTemporalProfile(nid);
      if (!wo && !tp) continue;
      const actor = graph.actors[nid];
      const name = actor ? actor.name : nid;
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
};

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
    const key = toGraphId(drug.name);
    const acb = ACB_SCORES[key];
    if (acb > 0) {
      result.acb_total += acb;
      result.acb_contributors.push({ name: drug.name, score: acb });
    }
    const beers = BEERS_FLAGS[key];
    if (beers) result.beers_flags.push({ name: drug.name, ...beers });
    if (drug.props?.sedation) result.sedation_contributors.push(drug.name);
    const fall = (PHENOTYPE_SCORES[key]?.fall_risk || 0);
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
