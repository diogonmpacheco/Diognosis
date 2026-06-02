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
};

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
