// Diognosis — Phenotype risk accumulation and washout calendar
// Phase A: modular source — concatenated by build.js

function computePhenotypeAccumulation(drugList) {
  const totals = { serotonin:0, qtc:0, anticholinergic:0, sedation:0, fall_risk:0 };
  const contributors = { serotonin:[], qtc:[], anticholinergic:[], sedation:[], fall_risk:[] };
  for (const drug of drugList) {
    const key = toGraphId(drug.name);
    // Try exact key, then props-based fallback
    const scores = PHENOTYPE_SCORES[key] || {
      serotonin:   drug.props?.serotonergic ? 2 : 0,
      qtc:         drug.props?.qtcRisk || 0,
      anticholinergic: drug.props?.anticholinergic || 0,
      sedation:    drug.props?.sedation ? 2 : 0,
      fall_risk:   (drug.props?.sedation || drug.props?.hypotension) ? 1 : 0,
    };
    for (const k of Object.keys(totals)) {
      const v = Number(scores[k] || 0);
      if (v > 0) {
        totals[k] += v;
        contributors[k].push({ name: drug.name, score: v });
      }
    }
  }
  return { totals, contributors };
}

// phenotypeRiskLevel(score, thresholds) — returns risk level string
function phenotypeRiskLevel(score, thresholds = [2, 4]) {
  if (score <= 0) return 'none';
  if (score < thresholds[0]) return 'low';
  if (score < thresholds[1]) return 'moderate';
  return 'high';
}

// ═══════════════════════════════════════════════════════════════════
// PHASE C — RECEPTOR OCCUPANCY AGGREGATION
//
// Tracks cumulative receptor burden across the full drug stack.
// Infers syndrome-level risks from multi-receptor co-activation.
//
// Receptors tracked:
//   SERT   — serotonin transporter (serotonin syndrome)
//   NET    — norepinephrine transporter (NE toxicity, BP)
//   DAT    — dopamine transporter (dopaminergic effects)
//   H1     — histamine H1 (sedation, weight gain)
//   M1     — muscarinic M1 (anticholinergic: delirium, urinary, constipation)
//   alpha1 — alpha-1 adrenergic (orthostatic hypotension, falls)
//   hERG   — cardiac potassium channel (QT prolongation, TdP)
//   GABA   — GABAergic (CNS depression, respiratory depression)
//   muOp   — mu-opioid (analgesia, respiratory depression, constipation)
//   D2     — dopamine D2 (antipsychotic effects, EPS, prolactin)
//   MAO    — monoamine oxidase (serotonin/NE/DA catabolism — inhibition dangerous)
//
// Score scale per receptor: 0 (none) → 1 (weak) → 2 (moderate) → 3 (strong/major)
// Scores are additive across the stack.
//
// Syndrome thresholds: derived from clinical toxidrome criteria
// ═══════════════════════════════════════════════════════════════════

// Per-drug receptor affinity scores
// Sources: receptor binding databases (Ki/IC50 data), clinical toxidrome criteria,
//          FDA labels, PharmGKB, CNSDrugs.com receptor profiles
const RECEPTOR_SCORES = {
  // ── SSRIs ──
  fluoxetine:      { SERT:3, NET:1, H1:1, M1:1, alpha1:0, hERG:1, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  paroxetine:      { SERT:3, NET:2, H1:1, M1:3, alpha1:1, hERG:1, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  sertraline:      { SERT:3, NET:1, H1:0, M1:1, alpha1:0, hERG:0, GABA:0, muOp:0, D2:0, MAO:0, DAT:1 },
  escitalopram:    { SERT:3, NET:0, H1:0, M1:0, alpha1:0, hERG:1, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  citalopram:      { SERT:3, NET:0, H1:1, M1:1, alpha1:0, hERG:2, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  fluvoxamine:     { SERT:3, NET:1, H1:0, M1:1, alpha1:0, hERG:0, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  // ── SNRIs ──
  venlafaxine:     { SERT:3, NET:2, H1:0, M1:0, alpha1:0, hERG:1, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  duloxetine:      { SERT:3, NET:2, H1:0, M1:1, alpha1:0, hERG:0, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  desvenlafaxine:  { SERT:3, NET:2, H1:0, M1:0, alpha1:0, hERG:0, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  // ── TCAs ──
  amitriptyline:   { SERT:3, NET:3, H1:3, M1:3, alpha1:3, hERG:3, GABA:1, muOp:0, D2:1, MAO:0, DAT:0 },
  nortriptyline:   { SERT:2, NET:3, H1:2, M1:2, alpha1:2, hERG:2, GABA:1, muOp:0, D2:1, MAO:0, DAT:0 },
  imipramine:      { SERT:3, NET:2, H1:3, M1:3, alpha1:3, hERG:3, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  clomipramine:    { SERT:3, NET:2, H1:2, M1:2, alpha1:2, hERG:2, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  desipramine:     { SERT:1, NET:3, H1:1, M1:2, alpha1:1, hERG:2, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  // ── MAOIs ──
  phenelzine:      { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:0, GABA:0, muOp:0, D2:0, MAO:3, DAT:0 },
  tranylcypromine: { SERT:1, NET:0, H1:0, M1:0, alpha1:0, hERG:0, GABA:0, muOp:0, D2:0, MAO:3, DAT:1 },
  selegiline:      { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:0, GABA:0, muOp:0, D2:0, MAO:2, DAT:0 },
  moclobemide:     { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:0, GABA:0, muOp:0, D2:0, MAO:2, DAT:0 },
  linezolid:       { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:0, GABA:0, muOp:0, D2:0, MAO:2, DAT:0 }, // weak MAO-A inhibitor
  // ── Atypical antidepressants ──
  bupropion:       { SERT:0, NET:2, H1:0, M1:0, alpha1:0, hERG:1, GABA:0, muOp:0, D2:1, MAO:0, DAT:2 },
  mirtazapine:     { SERT:0, NET:0, H1:3, M1:1, alpha1:2, hERG:0, GABA:1, muOp:0, D2:0, MAO:0, DAT:0 },
  trazodone:       { SERT:2, NET:0, H1:2, M1:0, alpha1:3, hERG:1, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  // ── Antipsychotics ──
  quetiapine:      { SERT:1, NET:0, H1:3, M1:1, alpha1:3, hERG:2, GABA:0, muOp:0, D2:2, MAO:0, DAT:0 },
  olanzapine:      { SERT:1, NET:0, H1:3, M1:3, alpha1:2, hERG:1, GABA:0, muOp:0, D2:3, MAO:0, DAT:0 },
  haloperidol:     { SERT:0, NET:0, H1:1, M1:1, alpha1:2, hERG:3, GABA:0, muOp:0, D2:3, MAO:0, DAT:0 },
  risperidone:     { SERT:1, NET:0, H1:1, M1:0, alpha1:3, hERG:1, GABA:0, muOp:0, D2:3, MAO:0, DAT:0 },
  aripiprazole:    { SERT:1, NET:0, H1:0, M1:0, alpha1:1, hERG:0, GABA:0, muOp:0, D2:2, MAO:0, DAT:0 }, // partial D2 agonist
  clozapine:       { SERT:1, NET:0, H1:3, M1:3, alpha1:3, hERG:1, GABA:0, muOp:0, D2:2, MAO:0, DAT:0 },
  // ── Opioids ──
  morphine:        { SERT:0, NET:0, H1:1, M1:0, alpha1:0, hERG:0, GABA:0, muOp:3, D2:0, MAO:0, DAT:0 },
  codeine:         { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:0, GABA:0, muOp:2, D2:0, MAO:0, DAT:0 }, // prodrug
  tramadol:        { SERT:2, NET:1, H1:0, M1:0, alpha1:0, hERG:0, GABA:0, muOp:1, D2:0, MAO:0, DAT:0 },
  oxycodone:       { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:0, GABA:0, muOp:3, D2:0, MAO:0, DAT:0 },
  methadone:       { SERT:1, NET:1, H1:0, M1:0, alpha1:0, hERG:3, GABA:0, muOp:3, D2:0, MAO:0, DAT:0 },
  fentanyl:        { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:0, GABA:0, muOp:3, D2:0, MAO:0, DAT:0 },
  buprenorphine:   { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:0, GABA:0, muOp:2, D2:0, MAO:0, DAT:0 }, // partial agonist
  // ── Benzodiazepines / sedatives ──
  diazepam:        { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:0, GABA:3, muOp:0, D2:0, MAO:0, DAT:0 },
  lorazepam:       { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:0, GABA:3, muOp:0, D2:0, MAO:0, DAT:0 },
  clonazepam:      { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:0, GABA:3, muOp:0, D2:0, MAO:0, DAT:0 },
  alprazolam:      { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:0, GABA:3, muOp:0, D2:0, MAO:0, DAT:0 },
  zolpidem:        { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:0, GABA:2, muOp:0, D2:0, MAO:0, DAT:0 },
  // ── Antihistamines ──
  diphenhydramine: { SERT:0, NET:0, H1:3, M1:3, alpha1:1, hERG:1, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  hydroxyzine:     { SERT:0, NET:0, H1:3, M1:2, alpha1:1, hERG:1, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  promethazine:    { SERT:0, NET:0, H1:3, M1:2, alpha1:2, hERG:2, GABA:0, muOp:0, D2:2, MAO:0, DAT:0 },
  // ── QT-prolonging ──
  amiodarone:      { SERT:0, NET:0, H1:0, M1:0, alpha1:1, hERG:3, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  ondansetron:     { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:2, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  azithromycin:    { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:2, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  ciprofloxacin:   { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:2, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  // ── Other ──
  dextromethorphan: { SERT:2, NET:0, H1:0, M1:0, alpha1:0, hERG:0, GABA:0, muOp:1, D2:0, MAO:0, DAT:0 },
  lithium:         { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:0, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 }, // facilitates serotonin release
  meperidine:      { SERT:2, NET:0, H1:0, M1:0, alpha1:0, hERG:0, GABA:0, muOp:2, D2:0, MAO:0, DAT:0 },
  cyclobenzaprine: { SERT:2, NET:1, H1:2, M1:3, alpha1:2, hERG:1, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  carisoprodol:    { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:0, GABA:2, muOp:0, D2:0, MAO:0, DAT:0 },
};

Object.assign(RECEPTOR_SCORES, {
  // Batch 01-03 receptor/channel burden profiles.
  amoxapine:        { SERT:2, NET:3, H1:3, M1:3, alpha1:2, hERG:2, GABA:0, muOp:0, D2:2, MAO:0, DAT:0 },
  amisulpride:      { SERT:0, NET:0, H1:0, M1:0, alpha1:1, hERG:2, GABA:0, muOp:0, D2:3, MAO:0, DAT:0 },
  sulpiride:        { SERT:0, NET:0, H1:0, M1:0, alpha1:1, hERG:1, GABA:0, muOp:0, D2:3, MAO:0, DAT:0 },
  loxapine:         { SERT:1, NET:0, H1:3, M1:2, alpha1:2, hERG:1, GABA:0, muOp:0, D2:3, MAO:0, DAT:0 },
  thiothixene:      { SERT:0, NET:0, H1:2, M1:1, alpha1:2, hERG:1, GABA:0, muOp:0, D2:3, MAO:0, DAT:0 },
  flupentixol:      { SERT:0, NET:0, H1:1, M1:1, alpha1:2, hERG:1, GABA:0, muOp:0, D2:3, MAO:0, DAT:0 },
  zuclopenthixol:   { SERT:0, NET:0, H1:2, M1:1, alpha1:2, hERG:1, GABA:0, muOp:0, D2:3, MAO:0, DAT:0 },
  prochlorperazine: { SERT:0, NET:0, H1:2, M1:2, alpha1:2, hERG:2, GABA:0, muOp:0, D2:3, MAO:0, DAT:0 },
  scopolamine:      { SERT:0, NET:0, H1:0, M1:3, alpha1:0, hERG:0, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  meclizine:        { SERT:0, NET:0, H1:3, M1:2, alpha1:1, hERG:0, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  solifenacin:      { SERT:0, NET:0, H1:0, M1:2, alpha1:0, hERG:1, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  tolterodine:      { SERT:0, NET:0, H1:0, M1:3, alpha1:0, hERG:1, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  darifenacin:      { SERT:0, NET:0, H1:0, M1:3, alpha1:0, hERG:0, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  trospium:         { SERT:0, NET:0, H1:0, M1:2, alpha1:0, hERG:0, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  glycopyrrolate:   { SERT:0, NET:0, H1:0, M1:2, alpha1:0, hERG:0, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  umeclidinium:     { SERT:0, NET:0, H1:0, M1:1, alpha1:0, hERG:0, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  revefenacin:      { SERT:0, NET:0, H1:0, M1:1, alpha1:0, hERG:0, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  alfuzosin:        { SERT:0, NET:0, H1:0, M1:0, alpha1:3, hERG:1, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  silodosin:        { SERT:0, NET:0, H1:0, M1:0, alpha1:3, hERG:0, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  mirabegron:       { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:0, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  lasmiditan:       { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:0, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  valbenazine:      { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:1, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  deutetrabenazine: { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:1, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  tetrabenazine:    { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:1, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  pitolisant:       { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:1, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  solriamfetol:     { SERT:0, NET:2, H1:0, M1:0, alpha1:0, hERG:0, GABA:0, muOp:0, D2:0, MAO:0, DAT:2 },
  rotigotine:       { SERT:0, NET:0, H1:0, M1:0, alpha1:1, hERG:0, GABA:0, muOp:0, D2:3, MAO:0, DAT:0 },
  pramipexole:      { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:0, GABA:0, muOp:0, D2:3, MAO:0, DAT:0 },
  ropinirole:       { SERT:0, NET:0, H1:0, M1:0, alpha1:1, hERG:0, GABA:0, muOp:0, D2:3, MAO:0, DAT:0 },
  apomorphine:      { SERT:0, NET:0, H1:0, M1:0, alpha1:2, hERG:1, GABA:0, muOp:0, D2:3, MAO:0, DAT:0 },
  ribociclib:       { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:3, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  adagrasib:        { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:2, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  lapatinib:        { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:1, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  lefamulin:        { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:2, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  palonosetron:     { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:1, GABA:0, muOp:0, D2:0, MAO:0, DAT:0 },
  eszopiclone:      { SERT:0, NET:0, H1:0, M1:0, alpha1:0, hERG:0, GABA:2, muOp:0, D2:0, MAO:0, DAT:0 },
});

// Syndrome thresholds and clinical inference rules
// These are deliberate clinical thresholds, not arbitrary numbers.
const SYNDROME_RULES = [
  // ── Serotonin Syndrome ──
  {
    id: 'serotonin_syndrome',
    name: 'Serotonin Syndrome Risk',
    test: (r) => (r.SERT >= 3 && r.MAO >= 1) ||   // SSRI/SNRI + any MAOI = high risk
                 (r.SERT >= 4) ||                    // multiple serotonergic drugs
                 (r.SERT >= 2 && r.MAO >= 2),        // moderate SERT + MAO inhibitor
    severity: (r) => (r.SERT >= 3 && r.MAO >= 2) ? 'critical' :
                     (r.SERT >= 4 || (r.SERT >= 2 && r.MAO >= 2)) ? 'severe' : 'moderate',
    description: 'Hunter Criteria: clonus + hyperthermia. SERT inhibition + MAO inhibition = additive serotonin excess.',
    clinical_note: 'Check for: clonus (inducible, spontaneous, ocular), agitation, hyperthermia, diaphoresis. Stop all serotonergic agents immediately. Cyproheptadine 12mg if symptomatic.',
    receptors: ['SERT', 'MAO'],
  },
  // ── NE Toxicity / Hypertensive Crisis ──
  {
    id: 'ne_toxicity',
    name: 'Noradrenergic Excess Risk',
    test: (r) => r.NET >= 4 || (r.NET >= 2 && r.MAO >= 2),
    severity: (r) => (r.NET >= 4 || r.MAO >= 3) ? 'severe' : 'moderate',
    description: 'Multiple NET inhibitors + MAO inhibition → norepinephrine accumulation → hypertensive crisis.',
    clinical_note: 'Monitor BP. MAO inhibitor + SNRIs/TCAs is contraindicated. Risk of hypertensive crisis.',
    receptors: ['NET', 'MAO'],
  },
  // ── QTc Prolongation / TdP ──
  {
    id: 'qt_prolongation',
    name: 'QTc Prolongation / TdP Risk',
    test: (r) => r.hERG >= 3,
    severity: (r) => r.hERG >= 5 ? 'critical' : r.hERG >= 4 ? 'severe' : 'moderate',
    description: 'Cumulative hERG channel blockade → QTc prolongation → Torsades de Pointes risk.',
    clinical_note: 'Obtain baseline ECG. QTc >500ms or ΔQTc >60ms requires intervention. Risk amplified by: hypokalemia, hypomagnesemia, bradycardia, female sex, CKD.',
    receptors: ['hERG'],
  },
  // ── Anticholinergic Syndrome ──
  {
    id: 'anticholinergic',
    name: 'Anticholinergic Syndrome / Delirium Risk',
    test: (r) => r.M1 >= 4,
    severity: (r) => r.M1 >= 6 ? 'critical' : r.M1 >= 5 ? 'severe' : 'moderate',
    description: 'Cumulative M1 muscarinic blockade → delirium, urinary retention, constipation, blurred vision, tachycardia.',
    clinical_note: 'Use ACB scale. Total ACB ≥3: significant delirium risk in elderly. Avoid in: BPH, narrow-angle glaucoma, dementia. Physostigmine for severe toxicity.',
    receptors: ['M1'],
  },
  // ── CNS/Respiratory Depression ──
  {
    id: 'cns_depression',
    name: 'CNS / Respiratory Depression Risk',
    test: (r) => r.GABA + r.muOp >= 4,
    severity: (r) => (r.GABA >= 3 && r.muOp >= 2) || r.GABA + r.muOp >= 6 ? 'critical' :
                     r.GABA + r.muOp >= 4 ? 'severe' : 'moderate',
    description: 'GABAergic + opioid synergism → additive CNS depression → respiratory arrest risk.',
    clinical_note: 'Black box warning: opioid + benzodiazepine combination. Assess respiratory rate. Naloxone should be available. Consider naloxone prescription.',
    receptors: ['GABA', 'muOp'],
  },
  // ── Orthostatic Hypotension / Falls ──
  {
    id: 'orthostatic',
    name: 'Orthostatic Hypotension / Fall Risk',
    test: (r) => r.alpha1 >= 4,
    severity: (r) => r.alpha1 >= 6 ? 'severe' : 'moderate',
    description: 'Cumulative alpha1-adrenergic blockade → orthostatic hypotension → syncope and falls.',
    clinical_note: 'Check lying and standing BP. Risk amplified in elderly, dehydration, volume depletion, diuretic use.',
    receptors: ['alpha1'],
  },
  // ── Excessive Sedation ──
  {
    id: 'sedation',
    name: 'Excessive Sedation Risk',
    test: (r) => r.H1 + r.GABA >= 5 || r.H1 >= 4,
    severity: (r) => r.H1 + r.GABA >= 7 ? 'severe' : 'moderate',
    description: 'Combined H1 antihistamine blockade and GABAergic activity → excessive sedation → driving/operating machinery risk.',
    clinical_note: 'Warn patient about driving impairment. Avoid CNS depressants (alcohol, other sedatives). Risk amplified in elderly (falls, aspiration).',
    receptors: ['H1', 'GABA'],
  },
  // ── Dopaminergic Excess (stimulant combination) ──
  {
    id: 'dopaminergic_excess',
    name: 'Dopaminergic Excess / Agitation Risk',
    test: (r) => r.DAT >= 3 && r.MAO >= 1,
    severity: (r) => r.MAO >= 2 ? 'severe' : 'moderate',
    description: 'DAT inhibition + MAO inhibition → dopamine accumulation → hypertensive crisis, agitation, psychosis.',
    clinical_note: 'Stimulants (methylphenidate, amphetamine, bupropion) + MAOIs: contraindicated. Risk of hypertensive crisis and serotonin-like syndrome.',
    receptors: ['DAT', 'MAO'],
  },
];

/**
 * computeReceptorOccupancy(drugNames)
 *
 * Computes cumulative receptor burden across all drugs in the stack.
 * Infers syndrome risks from multi-receptor co-activation.
 *
 * @param {string[]} drugNames — drug name strings (matches DRUG_DB names)
 * @returns {ReceptorOccupancy}
 *
 * ReceptorOccupancy {
 *   receptor_totals  : { SERT, NET, DAT, H1, M1, alpha1, hERG, GABA, muOp, D2, MAO }
 *   per_drug         : { drugName: receptorScores }
 *   active_syndromes : SyndromeResult[]
 *   receptor_leaders : { receptor: string, drugs: string[] }[]  — which drugs dominate each receptor
 *   summary          : string   — plain-English explanation
 * }
 */
function computeReceptorOccupancy(drugNames) {
  const totals = { SERT:0, NET:0, DAT:0, H1:0, M1:0, alpha1:0, hERG:0, GABA:0, muOp:0, D2:0, MAO:0 };
  const perDrug = {};
  const receptorContributors = {};  // receptor → [{drug, score}]

  for (const receptor of Object.keys(totals)) {
    receptorContributors[receptor] = [];
  }

  for (const drugName of drugNames) {
    // Normalize lookup key (lowercase, spaces→underscore)
    const key = drugName.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '');
    // Also try exact match
    const scores = RECEPTOR_SCORES[key]
      || RECEPTOR_SCORES[drugName.toLowerCase()]
      || RECEPTOR_SCORES[drugName.toLowerCase().replace(/\s/g,'')]
      || null;

    if (!scores) {
      // Fall back to drug props if no receptor profile
      const drug = getDrug(drugName);
      if (drug) {
        const fallback = {
          SERT: drug.props?.serotonergic ? 2 : 0,
          NET:  0,
          DAT:  0,
          H1:   0,
          M1:   drug.props?.anticholinergic ? 2 : 0,
          alpha1: 0,
          hERG: drug.props?.qtcRisk ? 2 : 0,
          GABA: 0,
          muOp: drug.cls === 'opioid' ? 2 : 0,
          D2:   0,
          MAO:  0,
        };
        perDrug[drugName] = fallback;
        for (const [r, v] of Object.entries(fallback)) {
          if (v > 0) {
            totals[r] += v;
            receptorContributors[r].push({ drug: drugName, score: v });
          }
        }
      }
      continue;
    }

    perDrug[drugName] = scores;
    for (const [receptor, score] of Object.entries(scores)) {
      if (score > 0) {
        totals[receptor] += score;
        receptorContributors[receptor].push({ drug: drugName, score });
      }
    }
  }

  // ── Evaluate syndrome rules ──
  const activeSyndromes = [];
  for (const rule of SYNDROME_RULES) {
    if (rule.test(totals)) {
      const sev = rule.severity(totals);
      // Which drugs drive this syndrome?
      const drivingDrugs = [];
      for (const receptor of rule.receptors) {
        for (const c of (receptorContributors[receptor] || [])) {
          if (!drivingDrugs.includes(c.drug)) drivingDrugs.push(c.drug);
        }
      }
      const receptorValues = Object.fromEntries(rule.receptors.map(r => [r, totals[r]]));
      activeSyndromes.push({
        id: rule.id,
        name: rule.name,
        severity: sev,
        driving_drugs: drivingDrugs,
        receptor_scores: receptorValues,
        description: rule.description,
        clinical_note: rule.clinical_note,
        receptors: rule.receptors,
      });
    }
  }

  // Sort syndromes by severity
  const sevOrder = { critical: 0, severe: 1, moderate: 2, mild: 3 };
  activeSyndromes.sort((a, b) => (sevOrder[a.severity] || 3) - (sevOrder[b.severity] || 3));

  // ── Receptor leaders ──
  const receptorLeaders = Object.entries(receptorContributors)
    .filter(([, contribs]) => contribs.length > 0)
    .map(([receptor, contribs]) => ({
      receptor,
      total: totals[receptor],
      drugs: contribs.sort((a, b) => b.score - a.score).map(c => c.drug),
      top_contributor: contribs.sort((a, b) => b.score - a.score)[0]?.drug || null,
    }))
    .filter(r => r.total > 0)
    .sort((a, b) => b.total - a.total);

  // ── Plain-English summary ──
  let summary = '';
  if (activeSyndromes.length === 0) {
    summary = 'No receptor-level syndrome thresholds exceeded at current drug stack.';
  } else {
    const criticals = activeSyndromes.filter(s => s.severity === 'critical');
    const severes = activeSyndromes.filter(s => s.severity === 'severe');
    if (criticals.length > 0) {
      summary = `⚠ CRITICAL: ${criticals.map(s => s.name).join(' + ')}. `;
    } else if (severes.length > 0) {
      summary = `⚠ Severe receptor risk: ${severes.map(s => s.name).join(' + ')}. `;
    }
    summary += activeSyndromes.map(s =>
      `${s.name} (${s.driving_drugs.join(' + ')} → ${s.receptors.join('/')} burden = ${s.receptors.map(r => totals[r]).join('+')})`
    ).join('; ');
  }

  return {
    receptor_totals: totals,
    per_drug: perDrug,
    active_syndromes: activeSyndromes,
    receptor_leaders: receptorLeaders,
    summary,
  };
}

// ═══════════════════════════════════════════════════════════════════
// ADVERSE EFFECT BURDEN SCORING (#10)
// Anticholinergic Cognitive Burden (ACB), Sedative Load, Fall Risk
// Beers Criteria 2023, STOPP v3
// ═══════════════════════════════════════════════════════════════════

// ACB_SCORES — Anticholinergic Cognitive Burden scale (0-3)
// Source: Anticholinergic Cognitive Burden Scale (Rudolph et al. 2008, updated)
