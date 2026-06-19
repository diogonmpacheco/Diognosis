// Diognosis — Repeated-dosing and steady-state PK simulation.
// Base one-compartment helpers live in data/pharmacology.js.

// ═══════════════════════════════════════════════════════════════════
// PHASE E: REPEATED DOSING & STEADY-STATE PK MODEL
// R = 1/(1 − e^(−ke·τ))  |  Css(t) = superposition of infinite prior doses
// ═══════════════════════════════════════════════════════════════════

function pkGetTau(drugName) {
  const key = toGraphId(drugName);
  return PK_DOSE_INTERVALS[key] || PK_DOSE_INTERVALS[drugName.toLowerCase()] || 24;
}

function pkApproxTmax(params = {}) {
  if (!params?.halfLife || !params?.ka) return 0;
  const ke = 0.693 / params.halfLife;
  const ka = params.ka;
  if (!Number.isFinite(ke) || !Number.isFinite(ka) || ke <= 0 || ka <= 0) return 0;
  if (Math.abs(ka - ke) < 1e-6) return Math.max(0.01, 1 / Math.max(ka, ke));
  return Math.max(0.01, Math.log(ka / ke) / (ka - ke));
}

function pkCurveSampleTimes(params = {}, tTotal, nPoints, tau = null) {
  const times = new Set([0, tTotal]);
  const linearPoints = Math.max(20, nPoints || 120);
  for (let i = 0; i <= linearPoints; i++) times.add((i / linearPoints) * tTotal);

  const halfLife = Number(params.halfLife) || 0;
  const tmax = pkApproxTmax(params);
  const offsets = [
    0.01,
    tmax * 0.25,
    tmax * 0.5,
    tmax,
    tmax * 1.5,
    tmax * 2,
    halfLife * 0.5,
    halfLife,
    halfLife * 2,
    halfLife * 4,
    halfLife * 8,
  ].filter(value => Number.isFinite(value) && value > 0);
  const doseInterval = Number.isFinite(tau) && tau > 0 ? tau : tTotal + 1;
  for (let doseTime = 0; doseTime <= tTotal; doseTime += doseInterval) {
    for (const offset of offsets) {
      const t = doseTime + offset;
      if (t >= 0 && t <= tTotal) times.add(t);
    }
  }
  return [...times].sort((a, b) => a - b);
}

function pkDisplayCurveWindow(params = {}, tau, nDoses = 5) {
  const fullHorizon = tau * nDoses;
  const halfLife = Number(params.halfLife) || 0;
  const absorptionWindow = params.ka ? (6 / params.ka) : 0;
  const earlyWindow = Math.max(2, halfLife * 12, pkApproxTmax(params) * 8, absorptionWindow);
  if (halfLife > 0 && halfLife < tau / 6 && earlyWindow < fullHorizon * 0.35) {
    return {
      nDoses: 1,
      tTotal: Math.min(tau, Math.max(earlyWindow, halfLife * 8, 1)),
      compressed:true,
    };
  }
  return { nDoses, tTotal:fullHorizon, compressed:false };
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
    for (const t of pkCurveSampleTimes(params, tau, nPoints, tau)) {
      pts.push({ t, c: Math.max(0, A * ke * t * Math.exp(-ke * t) * R) });
    }
    return pts;
  }

  const R_ke = 1 / (1 - Math.exp(-ke * tau));
  const R_ka = 1 / (1 - Math.exp(-ka * tau));
  for (const t of pkCurveSampleTimes(params, tau, nPoints, tau)) {
    const c = A * (ka / (ka - ke)) * (R_ke * Math.exp(-ke * t) - R_ka * Math.exp(-ka * t));
    pts.push({ t, c: Math.max(0, c) });
  }
  return pts;
}

// pkRepeatedDoseCurve — superposition of nDoses single doses, from t=0 to t=nDoses×τ
function pkRepeatedDoseCurve(params, tau, nDoses, nPoints, tTotalOverride = null) {
  nDoses  = nDoses  || 5;
  nPoints = nPoints || 120;
  const tTotal = Number.isFinite(tTotalOverride) && tTotalOverride > 0 ? tTotalOverride : tau * nDoses;
  const pts = [];
  for (const t of pkCurveSampleTimes(params, tTotal, nPoints, tau)) {
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
