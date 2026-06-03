// MedCheck — Repeated-dosing and steady-state PK simulation.
// Base one-compartment helpers live in data/pharmacology.js.

// ═══════════════════════════════════════════════════════════════════
// PHASE E: REPEATED DOSING & STEADY-STATE PK MODEL
// R = 1/(1 − e^(−ke·τ))  |  Css(t) = superposition of infinite prior doses
// ═══════════════════════════════════════════════════════════════════

function pkGetTau(drugName) {
  const key = toGraphId(drugName);
  return PK_DOSE_INTERVALS[key] || PK_DOSE_INTERVALS[drugName.toLowerCase()] || 24;
}

// pkSteadyStateCurve — exact Css(t) within one dosing interval [0, τ]
// One-compartment oral superposition formula:
//   Css(t) = A·(ka/(ka−ke)) · [exp(−ke·t)/(1−exp(−ke·τ)) − exp(−ka·t)/(1−exp(−ka·τ))]
function pkSteadyStateCurve(params, tau, nPoints) {
  nPoints = nPoints || 80;
  const ke = 0.693 / params.halfLife;
  const ka = params.ka;
  const Vd_L = params.Vd * 70;
  const A = params.F * params.dose_mg * 1000 / Vd_L;
  const pts = [];

  if (Math.abs(ka - ke) < 1e-6) {
    // Degenerate: approximate using accumulation on simplified model
    const R = 1 / (1 - Math.exp(-ke * tau));
    for (let i = 0; i <= nPoints; i++) {
      const t = (i / nPoints) * tau;
      pts.push({ t, c: Math.max(0, A * ke * t * Math.exp(-ke * t) * R) });
    }
    return pts;
  }

  const R_ke = 1 / (1 - Math.exp(-ke * tau));
  const R_ka = 1 / (1 - Math.exp(-ka * tau));
  for (let i = 0; i <= nPoints; i++) {
    const t = (i / nPoints) * tau;
    const c = A * (ka / (ka - ke)) * (R_ke * Math.exp(-ke * t) - R_ka * Math.exp(-ka * t));
    pts.push({ t, c: Math.max(0, c) });
  }
  return pts;
}

// pkRepeatedDoseCurve — superposition of nDoses single doses, from t=0 to t=nDoses×τ
function pkRepeatedDoseCurve(params, tau, nDoses, nPoints) {
  nDoses  = nDoses  || 5;
  nPoints = nPoints || 120;
  const tTotal = tau * nDoses;
  const pts = [];
  for (let i = 0; i <= nPoints; i++) {
    const t = (i / nPoints) * tTotal;
    let c = 0;
    for (let d = 0; d < nDoses; d++) {
      const td = t - d * tau;
      if (td > 0) c += pkConcentration(params, td);
    }
    pts.push({ t, c: Math.max(0, c) });
  }
  return pts;
}

// pkSteadyStateMetrics — accumulation factor R, SS Cmax, SS Ctrough, time to SS
function pkSteadyStateMetrics(params, tau) {
  const ke = 0.693 / params.halfLife;
  const accum = 1 / (1 - Math.exp(-ke * tau));
  const ssCurve = pkSteadyStateCurve(params, tau, 300);
  const cmax_ss = Math.max(...ssCurve.map(p => p.c));
  const ctrough_ss = ssCurve[ssCurve.length - 1].c; // Ctrough = concentration at end of interval (just before next dose)
  const tmax_ss = ssCurve.reduce((best, p) => (p.c > best.c ? p : best), ssCurve[0]).t;
  const t_to_ss_h = 5 * params.halfLife;  // 97% of true SS
  const t_to_ss_days = Math.round(t_to_ss_h / 24 * 10) / 10;
  return { cmax_ss, ctrough_ss, accum, tmax_ss, t_to_ss_h, t_to_ss_days };
}

// pkInteractionAdjustedParams — returns a modified params object with CYP-inhibition-extended t½
// fold: AUC fold increase from calcFold() / enzyme capacity
function pkInteractionAdjustedParams(params, fold) {
  if (!fold || fold <= 1.1) return null; // no meaningful adjustment
  // Half-life extends proportionally to AUC increase (same Vd, reduced Cl)
  return Object.assign({}, params, { halfLife: params.halfLife * fold });
}

// pkGetInteractionFold — returns CYP-inhibition fold for this drug's primary enzyme
// Uses existing calcFold() from enzymeEngine and the active stack
function pkGetInteractionFold(drugName) {
  const drug = getDrug(drugName);
  if (!drug) return 1;
  const others = activeStack.filter(n => n !== drugName);
  if (!others.length) return 1;
  try {
    const result = calcFold(drugName);
    const fold = result && Number.isFinite(result.fold) ? result.fold : 1;
    return fold > 1.1 ? Math.min(fold, 20) : 1; // cap at 20× for display safety
  } catch (_) { return 1; }
}

// ═══════════════════════════════════════════════════════════════════
// MULTI-DRUG PHENOTYPE ACCUMULATION (#6)
// Serotonin load · QTc risk · Anticholinergic burden
// ═══════════════════════════════════════════════════════════════════

// PHENOTYPE_SCORES — contributions to each accumulation bucket per drug
// Sources: Beers Criteria, STOPP/START, CredibleMeds QTc risk list, ADS anticholinergic scale
