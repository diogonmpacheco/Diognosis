// MedCheck — PK simulation panel
// Phase E: repeated dosing, steady-state, interaction-adjusted curves
// Phase A: modular source — concatenated by build.js

function renderPKSimulation() {
  const sec = document.getElementById("pkSimSection");
  const el  = document.getElementById("pkSimBody");
  if (!el) return;
  if (activeStack.length < 1) { if (sec) sec.style.display = "none"; return; }

  const drugsWithPK = activeStack.filter(n => getPKParams(n) || pkRelativeForDrug(n, { nPoints:20 }));
  if (!drugsWithPK.length) { if (sec) sec.style.display = "none"; return; }
  if (sec) sec.style.display = "";

  let html = '<div class="pk-grid">';
  for (const name of drugsWithPK) {
    html += getPKParams(name) ? renderAbsolutePKCard(name) : renderRelativePKCard(name);
  }

  html += '</div>';
  html += '<div class="pk-disclaimer">Educational model only. Absolute cards use simplified one-compartment estimates; relative cards are normalized exposure curves for drugs without full PK parameters. Not for clinical dosing decisions.</div>';
  el.innerHTML = html;
}

function getPKParams(name) {
  const key = toGraphId(name);
  return PK_PARAMS[key] || PK_PARAMS[name.toLowerCase()];
}

function renderAbsolutePKCard(name) {
  const key = toGraphId(name);
  const params = getPKParams(name);
  const tau = pkGetTau(name);
  const nDoses = 5;
  const drug = getDrug(name);
  const primaryEnz = drug?.routes?.[0]?.enzyme;
  let genoMult = 1.0;
  let genoBadge = '';
  if (primaryEnz && GENOTYPE_EFFECTS[primaryEnz]) {
    genoMult = genotypeAdjustedPK(name, primaryEnz);
    const geno = activeGenotype[primaryEnz];
    const genoLabel = Object.entries(GENOTYPE_PHENOTYPE).find(([_, v]) => v === geno)?.[0] || 'NM';
    if (genoLabel !== 'NM') genoBadge = `<span class="pk-geno-badge">${primaryEnz} ${genoLabel}: AUC ${fmtFold(genoMult)}</span>`;
  }

  const genoParams = genoMult !== 1.0 ? Object.assign({}, params, { halfLife: params.halfLife * genoMult }) : params;
  const rawFold = pkGetInteractionFold(name);
  const adjParams = pkInteractionAdjustedParams(genoParams, rawFold > 1.1 ? rawFold : null);
  const intBadge = adjParams
    ? `<span class="pk-int-badge" title="${primaryEnz || 'Primary pathway'} inhibited by coadministered drug">DDI t½ ${Math.round(adjParams.halfLife * 10) / 10}h (${fmtFold(rawFold)})</span>`
    : '';

  const baseMetrics = pkSteadyStateMetrics(genoParams, tau);
  const adjMetrics = adjParams ? pkSteadyStateMetrics(adjParams, tau) : null;
  const basePts = pkRepeatedDoseCurve(genoParams, tau, nDoses, 200);
  const adjPts = adjParams ? pkRepeatedDoseCurve(adjParams, tau, nDoses, 200) : null;
  const showTrough = baseMetrics.ctrough_ss > Math.max(baseMetrics.cmax_ss, adjMetrics?.cmax_ss || 0) * 0.02;
  const svg = renderPKCurveSvg({
    key,
    basePts,
    adjPts,
    tTotal: tau * nDoses,
    yMax: Math.max(baseMetrics.cmax_ss, adjMetrics?.cmax_ss || 0) * 1.15,
    cmax: baseMetrics.cmax_ss,
    ctrough: showTrough ? baseMetrics.ctrough_ss : null,
    relative:false,
  });
  const daysStr = baseMetrics.t_to_ss_days < 1 ? `${Math.round(baseMetrics.t_to_ss_h)}h` : `${baseMetrics.t_to_ss_days}d`;
  const noteHtml = params.note ? `<div class="pk-note">${params.note.substring(0,140)}${params.note.length>140?'…':''}</div>` : '';

  return `<div class="pk-card">
    <div class="pk-title">${name}${genoBadge}${intBadge}</div>
    <div class="pk-params">Absolute model · F=${Math.round(params.F*100)}% · t½=${params.halfLife}h · τ=${tau}h · dose=${params.dose_mg}mg · Vd=${params.Vd}L/kg</div>
    ${svg}
    <div class="pk-metrics">
      <span title="Accumulation factor R = 1/(1−e^(−ke·τ))">R = ${Math.round(baseMetrics.accum * 10)/10}×</span>
      <span title="Steady-state peak concentration">Cmax_ss: ${fmtPK(baseMetrics.cmax_ss)} ng/mL</span>
      ${showTrough ? `<span title="Trough concentration">Ctrough: ${fmtPK(baseMetrics.ctrough_ss)} ng/mL</span>` : ''}
      <span title="Time to reach ~97% of true steady state">SS in ~${daysStr}</span>
      ${adjMetrics ? `<span class="pk-int-metric" title="Steady-state Cmax with DDI adjustment">Adj Cmax_ss: ${fmtPK(adjMetrics.cmax_ss)} ng/mL</span>` : ''}
    </div>
    ${noteHtml}
    ${params.nonlinear ? `<div class="pk-warning">Nonlinear kinetics: first-order simulation is approximate.</div>` : ''}
    ${params.taperNote ? `<div class="pk-taper">${params.taperNote}</div>` : ''}
  </div>`;
}

function renderRelativePKCard(name) {
  const sim = pkRelativeForDrug(name, { nPoints:200 });
  if (!sim) return '';
  const key = `rel_${toGraphId(name)}`;
  const metrics = sim.metrics;
  const yMax = Math.max(...sim.curve.map(p => p.c), ...sim.refCurve.map(p => p.c), 1) * 1.15;
  const svg = renderPKCurveSvg({
    key,
    basePts: sim.refCurve,
    adjPts: sim.curve,
    tTotal: sim.horizon,
    yMax,
    cmax: metrics.cmax_ss,
    ctrough: metrics.ctrough_ss > yMax * 0.02 ? metrics.ctrough_ss : null,
    relative:true,
  });
  const genoBadge = sim.enzyme && sim.genotypeFold !== 1
    ? `<span class="pk-geno-badge">${sim.enzyme}: ${fmtFold(sim.genotypeFold)}</span>`
    : '';
  const intBadge = sim.dampedInteractionFold !== 1
    ? `<span class="pk-int-badge">DDI ${fmtFold(sim.dampedInteractionFold)}</span>`
    : '';
  const activeFold = sim.activeFormFold ? ` · active form ${fmtFold(sim.activeFormFold)}` : '';
  const interpretation = pkRelativeInterpretationLabel(sim.interpretation);
  const ssDays = metrics.timeTo90ssH < 24 ? `${Math.round(metrics.timeTo90ssH)}h` : `${Math.round(metrics.timeTo90ssH / 24 * 10) / 10}d`;

  return `<div class="pk-card">
    <div class="pk-title">${name}<span class="pk-geno-badge">Relative</span>${genoBadge}${intBadge}</div>
    <div class="pk-params">Fallback model · t½=${Math.round(metrics.effectiveHalfLifeH * 10) / 10}h effective · τ=${sim.tau}h · reference peak = 1.0</div>
    ${svg}
    <div class="pk-metrics">
      <span title="Relative AUC versus NM/no-interaction reference">AUC ${fmtFold(metrics.aucFold)}</span>
      <span title="Relative steady-state peak versus reference single-dose peak">Cmax_ss: ${fmtPK(metrics.cmax_ss)} rel</span>
      <span title="Accumulation factor">R = ${Math.round(metrics.accumRatio * 10) / 10}×</span>
      <span title="Approximate time to 90% steady state">90% SS ~${ssDays}</span>
      ${activeFold ? `<span class="pk-int-metric">${activeFold}</span>` : ''}
    </div>
    <div class="pk-note">${interpretation}. Relative curve shown because full F/ka/Vd/dose parameters are not available.</div>
  </div>`;
}

function renderPKCurveSvg(opts) {
  const W = 280, H = 100, PAD_L = 6, PAD_R = 6, PAD_T = 10, PAD_B = 14;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const yMax = opts.yMax > 0 ? opts.yMax : 1;
  const sx = t => PAD_L + (t / opts.tTotal) * plotW;
  const sy = c => H - PAD_B - (c / yMax) * plotH;
  const pathFor = pts => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.t).toFixed(1)},${sy(p.c).toFixed(1)}`).join(' ');
  const fillFor = pts => `${pathFor(pts)} L${sx(opts.tTotal).toFixed(1)},${(H-PAD_B).toFixed(1)} L${sx(0).toFixed(1)},${(H-PAD_B).toFixed(1)} Z`;
  const ticks = [0, 0.5, 1].map(frac => {
    const t = opts.tTotal * frac;
    const label = t < 72 ? `${Math.round(t)}h` : `D${Math.round(t / 24)}`;
    const x = sx(t).toFixed(1);
    return `<text x="${x}" y="${(H - 2).toFixed(1)}" font-size="7.5" fill="var(--text2)" text-anchor="middle">${label}</text>`;
  }).join('');
  const cmaxY = sy(opts.cmax).toFixed(1);
  const troughLine = opts.ctrough != null
    ? `<line x1="${PAD_L}" y1="${sy(opts.ctrough).toFixed(1)}" x2="${(W-PAD_R).toFixed(1)}" y2="${sy(opts.ctrough).toFixed(1)}" stroke="var(--accent)" stroke-width="0.5" stroke-dasharray="2,2" opacity="0.45"/>`
    : '';
  return `<svg class="pk-svg" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="${opts.key}_base" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="${opts.key}_adj" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--amber)" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="var(--amber)" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <line x1="${PAD_L}" y1="${cmaxY}" x2="${(W-PAD_R).toFixed(1)}" y2="${cmaxY}" stroke="var(--accent)" stroke-width="0.7" stroke-dasharray="3,2" opacity="0.55"/>
    ${troughLine}
    <path d="${fillFor(opts.basePts)}" fill="url(#${opts.key}_base)" stroke="none"/>
    <path d="${pathFor(opts.basePts)}" fill="none" stroke="var(--accent)" stroke-width="${opts.relative ? '1.1' : '1.5'}" opacity="${opts.relative ? '0.55' : '1'}"/>
    ${opts.adjPts ? `<path d="${fillFor(opts.adjPts)}" fill="url(#${opts.key}_adj)" stroke="none"/><path d="${pathFor(opts.adjPts)}" fill="none" stroke="var(--amber)" stroke-width="1.3" stroke-dasharray="${opts.relative ? '0' : '4,2'}" opacity="0.85"/>` : ''}
    <line x1="${PAD_L}" y1="${H-PAD_B}" x2="${W-PAD_R}" y2="${H-PAD_B}" stroke="var(--border)" stroke-width="0.6"/>
    ${ticks}
  </svg>`;
}

function fmtPK(n) {
  return n < 0.1 ? n.toExponential(1) : n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString();
}

function fmtFold(n) {
  return `${Math.round(n * 10) / 10}×`;
}

function pkRelativeInterpretationLabel(key) {
  const labels = {
    accumulation_dose_related_toxicity_risk: 'Higher parent exposure / accumulation risk',
    reduced_exposure_possible_subtherapeutic: 'Lower parent exposure possible',
    reduced_active_metabolite_possible_failure: 'Lower active-metabolite formation possible',
    excess_active_metabolite_toxicity_risk: 'Higher active-metabolite toxicity risk possible',
    active_metabolite_near_normal: 'Active-metabolite exposure near reference',
    exposure_near_reference: 'Exposure near reference',
  };
  return labels[key] || 'Exposure near reference';
}


// ── renderInteractionGraph — D3 force-directed graph (#4) ──────────
