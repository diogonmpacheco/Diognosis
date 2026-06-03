// MedCheck — Relative-exposure PK fallback model.
// Uses drug half-life plus genotype/DDI exposure fold when full PK_PARAMS are absent.

const PK_REL_RESIDUAL_ACTIVITY = {
  poor_metabolizer: 0.10,
  intermediate_metabolizer: 0.60,
  normal_metabolizer: 1.00,
  rapid_metabolizer: 1.00,
  ultrarapid_metabolizer: 1.00,
};

function pkRelGenotypeFold(enzyme) {
  const pheno = activeGenotype && activeGenotype[enzyme] ? activeGenotype[enzyme] : GENOTYPE_PHENOTYPE.NM;
  const eff = GENOTYPE_EFFECTS && GENOTYPE_EFFECTS[enzyme] && GENOTYPE_EFFECTS[enzyme][pheno];
  return { fold:(eff && eff.auc_fold > 0) ? eff.auc_fold : 1, pheno };
}

function pkRelativeExposureFold(drugName) {
  const drug = getDrug(drugName);
  const route = drug && drug.routes && drug.routes[0];
  const enzyme = route && route.enzyme;
  if (!drug || !enzyme) {
    return { E:1, genotypeFold:1, interactionFold:1, dampedInteractionFold:1, pheno:GENOTYPE_PHENOTYPE.NM, enzyme:null };
  }

  const genotype = pkRelGenotypeFold(enzyme);
  const interactionFold = pkGetInteractionFold(drugName);
  const resid = PK_REL_RESIDUAL_ACTIVITY[genotype.pheno] != null ? PK_REL_RESIDUAL_ACTIVITY[genotype.pheno] : 1;
  const dampedInteractionFold = interactionFold >= 1
    ? 1 + (interactionFold - 1) * resid
    : 1 - (1 - interactionFold) * resid;

  return {
    E: genotype.fold * dampedInteractionFold,
    genotypeFold: genotype.fold,
    interactionFold,
    dampedInteractionFold,
    pheno: genotype.pheno,
    enzyme,
  };
}

function pkRelSingle(t, ke, ka) {
  if (t < 0) return 0;
  return (ka / (ka - ke)) * (Math.exp(-ke * t) - Math.exp(-ka * t));
}

function pkRelPeakSingle(ke, ka) {
  let maxC = 0;
  const span = 6 * Math.log(2) / ke;
  for (let i = 0; i <= 240; i++) {
    const t = span * i / 240;
    maxC = Math.max(maxC, pkRelSingle(t, ke, ka));
  }
  return maxC || 1;
}

function pkRelativeModel(opts) {
  const halfLifeH = opts.halfLifeH;
  const exposureFold = Math.max(opts.exposureFold || 1, 0.01);
  const absorptionHalfLifeH = opts.absorptionHalfLifeH || 0.5;
  const tau = opts.tau || 24;
  const nPoints = opts.nPoints || 180;

  if (!Number.isFinite(halfLifeH) || halfLifeH <= 0) return null;

  const ke0 = Math.log(2) / halfLifeH;
  let ka = Math.log(2) / absorptionHalfLifeH;
  const ke = ke0 / exposureFold;
  if (Math.abs(ka - ke) < 1e-4) ka += 0.01;
  if (Math.abs(ka - ke0) < 1e-4) ka += 0.011;

  const effectiveHalfLifeH = Math.log(2) / ke;
  const horizon = Math.min(800, Math.max(3.5 * effectiveHalfLifeH, 3 * tau));
  const nDoses = Math.min(90, Math.floor(horizon / tau) + 1);
  const norm = pkRelPeakSingle(ke0, ka);

  const curve = [];
  const refCurve = [];
  for (let i = 0; i <= nPoints; i++) {
    const t = horizon * i / nPoints;
    let scenarioC = 0;
    let refC = 0;
    for (let dose = 0; dose < nDoses; dose++) {
      const dt = t - dose * tau;
      if (dt >= 0) {
        scenarioC += pkRelSingle(dt, ke, ka);
        refC += pkRelSingle(dt, ke0, ka);
      }
    }
    curve.push({ t, c:scenarioC / norm });
    refCurve.push({ t, c:refC / norm });
  }

  let cmax_ss = 0;
  let ctrough_ss = 0;
  const intervalStart = Math.max(0, horizon - tau);
  for (let i = 0; i <= 80; i++) {
    const t = intervalStart + tau * i / 80;
    let c = 0;
    for (let dose = 0; dose < nDoses; dose++) {
      const dt = t - dose * tau;
      if (dt >= 0) c += pkRelSingle(dt, ke, ka);
    }
    c /= norm;
    cmax_ss = Math.max(cmax_ss, c);
    if (i === 80) ctrough_ss = c;
  }

  return {
    curve, refCurve, horizon, tau, nDoses,
    metrics: {
      aucFold: exposureFold,
      cmax_ss,
      ctrough_ss,
      accumRatio: 1 / (1 - Math.exp(-ke * tau)),
      effectiveHalfLifeH,
      timeTo90ssH: 3.3 * effectiveHalfLifeH,
    },
  };
}

function pkRelativeForDrug(drugName, opts) {
  const drug = getDrug(drugName);
  if (!drug || !drug.hl) return null;

  const fold = pkRelativeExposureFold(drugName);
  const sim = pkRelativeModel({
    halfLifeH: drug.hl,
    exposureFold: fold.E,
    absorptionHalfLifeH: opts?.absorptionHalfLifeH || 0.5,
    tau: opts?.tau || pkGetTau(drugName),
    nPoints: opts?.nPoints || 180,
  });
  if (!sim) return null;

  const isProdrug = !!drug.prodrug;
  const activeFormFold = isProdrug && fold.E > 0 ? 1 / fold.E : null;
  let interpretation = 'exposure_near_reference';
  if (isProdrug) {
    if (activeFormFold < 0.7) interpretation = 'reduced_active_metabolite_possible_failure';
    else if (activeFormFold > 1.4) interpretation = 'excess_active_metabolite_toxicity_risk';
    else interpretation = 'active_metabolite_near_normal';
  } else if (fold.E > 1.3) {
    interpretation = 'accumulation_dose_related_toxicity_risk';
  } else if (fold.E < 0.8) {
    interpretation = 'reduced_exposure_possible_subtherapeutic';
  }

  return {
    drug: drugName,
    enzyme: fold.enzyme,
    phenotype: fold.pheno,
    genotypeFold: fold.genotypeFold,
    interactionFold: fold.interactionFold,
    dampedInteractionFold: fold.dampedInteractionFold,
    exposureFold: fold.E,
    isProdrug,
    activeFormFold,
    interpretation,
    ...sim,
  };
}
