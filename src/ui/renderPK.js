// Diognosis — PK simulation panel
// Phase E: repeated dosing, steady-state, interaction-adjusted curves
// Phase A: modular source — concatenated by build.js

function renderPKSimulation() {
  const sec = document.getElementById("pkSimSection");
  const el  = document.getElementById("pkSimBody");
  if (!el) return;
  if (activeStack.length < 1) {
    hideSectionAndClear("pkSimSection", "pkSimBody");
    return;
  }

  const drugsWithPK = activeStack.filter(n => getPKParams(n) || pkRelativeForDrug(n, { nPoints:20 }));
  if (!drugsWithPK.length) {
    hideSectionAndClear("pkSimSection", "pkSimBody");
    return;
  }
  if (sec) sec.style.display = "";

  const summaries = drugsWithPK.map(pkVisualizationSummaryForDrug).filter(Boolean);
  let html = renderPKSectionSnapshot(summaries);
  html += '<div class="pk-grid">';
  for (const name of drugsWithPK) {
    html += getPKParams(name) ? renderAbsolutePKCard(name) : renderRelativePKCard(name);
  }

  html += '</div>';
  html += '<div class="pk-disclaimer">Educational model only. Curves show directional exposure comparison using simplified assumptions; they are not calibrated for patient-specific dosing decisions.</div>';
  el.innerHTML = html;
}

function getPKParams(name) {
  const key = toGraphId(name);
  const drug = typeof getDrug === "function" ? getDrug(name) : null;
  return PK_PARAMS[key] || (drug?.id && PK_PARAMS[drug.id]) || PK_PARAMS[name.toLowerCase()];
}

function pkVisualizationSummaryForDrug(name) {
  const params = getPKParams(name);
  if (params) return pkAbsoluteVisualizationSummary(name, params);
  return pkRelativeVisualizationSummary(name);
}

function pkAbsoluteVisualizationSummary(name, params = getPKParams(name)) {
  if (!params) return null;
  const drug = getDrug(name);
  const primaryEnz = drug?.routes?.[0]?.enzyme;
  let genotypeFold = 1;
  let genotypeLabel = "";
  if (primaryEnz && GENOTYPE_EFFECTS[primaryEnz]) {
    genotypeFold = genotypeAdjustedPK(name, primaryEnz);
    const genotype = activeGenotype[primaryEnz];
    const shortLabel = Object.entries(GENOTYPE_PHENOTYPE).find(([_, value]) => value === genotype)?.[0] || "NM";
    if (shortLabel !== "NM") genotypeLabel = `${primaryEnz} ${shortLabel}`;
  }
  const ddiFold = pkGetInteractionFold(name);
  const activeFold = ddiFold > 1.1 ? ddiFold : (genotypeFold !== 1 ? genotypeFold : 1);
  const drivers = [
    ddiFold > 1.1 ? `DDI ${fmtFold(ddiFold)}` : "",
    genotypeLabel ? `${genotypeLabel} ${fmtFold(genotypeFold)}` : "",
  ].filter(Boolean);
  const reason = drivers.join(" · ") || "baseline PK profile";
  return {
    name,
    modelType:"absolute",
    fold:activeFold,
    direction:pkShiftDirection(activeFold),
    reason,
    value:pkShiftValue(activeFold),
    note:ddiFold > 1.1
      ? "Adjusted curve compares baseline with current co-medication context."
      : genotypeLabel
      ? "Curve uses the selected gene result; no separate adjusted line is shown unless a DDI also changes clearance."
      : "Absolute curve uses stored F, dose, half-life, and volume assumptions.",
  };
}

function pkRelativeVisualizationSummary(name) {
  const sim = pkRelativeForDrug(name, { nPoints:40 });
  if (!sim) return null;
  const genotypeDriver = sim.enzyme && sim.genotypeFold !== 1 ? `${sim.enzyme} ${fmtFold(sim.genotypeFold)}` : "";
  const ddiDriver = sim.dampedInteractionFold !== 1 ? `DDI ${fmtFold(sim.dampedInteractionFold)}` : "";
  return {
    name,
    modelType:"relative",
    fold:sim.metrics.aucFold,
    direction:pkShiftDirection(sim.metrics.aucFold),
    reason:[genotypeDriver, ddiDriver].filter(Boolean).join(" · ") || "relative fallback profile",
    value:pkShiftValue(sim.metrics.aucFold),
    note:`${pkRelativeInterpretationLabel(sim.interpretation)}; full absolute PK parameters are not available.`,
  };
}

function renderPKSectionSnapshot(summaries = []) {
  if (!summaries.length) return "";
  const meaningful = summaries
    .filter(summary => summary && pkShiftMagnitude(summary.fold) > 0.18)
    .sort((a, b) => pkShiftMagnitude(b.fold) - pkShiftMagnitude(a.fold));
  const lead = meaningful[0] || summaries[0];
  const shiftedCount = meaningful.length;
  const absoluteCount = summaries.filter(summary => summary.modelType === "absolute").length;
  const relativeCount = summaries.length - absoluteCount;
  const shown = [lead, ...meaningful.filter(summary => summary.name !== lead.name)].slice(0, 3);
  return `<div class="pk-snapshot">
    <div class="pk-snapshot-head">
      <div>
        <div class="pk-snapshot-kicker">Exposure snapshot</div>
        <div class="pk-snapshot-title">${safePublicHtml(pkSnapshotTitle(lead, shiftedCount))}</div>
      </div>
      <div class="pk-snapshot-counts">
        <span>${safePublicHtml(`${absoluteCount} absolute`)}</span>
        ${relativeCount ? `<span>${safePublicHtml(`${relativeCount} relative`)}</span>` : ""}
      </div>
    </div>
    <div class="pk-snapshot-items">${shown.map(renderPKSnapshotItem).join("")}</div>
  </div>`;
}

function pkSnapshotTitle(lead = {}, shiftedCount = 0) {
  if (!lead) return "No exposure shift is modeled for this stack.";
  const shifted = pkShiftMagnitude(lead.fold) > 0.18;
  if (!shifted) return "No major modeled AUC shift stands out in this stack.";
  const direction = lead.direction === "down" ? "falls" : "rises";
  const count = shiftedCount > 1 ? `; ${shiftedCount - 1} more shift${shiftedCount === 2 ? "" : "s"} also appear` : "";
  return `${lead.name} modeled AUC ${direction} most (${lead.value})${count}.`;
}

function renderPKSnapshotItem(summary = {}) {
  return `<div class="pk-snapshot-item ${safeAttr(summary.direction || "")}">
    <div class="pk-snapshot-label">
      <strong>${safePublicHtml(summary.name || "Unknown")}</strong>
      <span>${safePublicHtml(summary.reason || "current context")}</span>
    </div>
    <div class="pk-snapshot-visual">
      <div class="pk-snapshot-value">${safePublicHtml(summary.value || "baseline")}</div>
      ${renderPKShiftMeter(summary)}
    </div>
  </div>`;
}

function renderPKShiftMeter(summary = {}) {
  const geometry = pkShiftMeterGeometry(summary.fold);
  return `<div class="pk-shift-meter" aria-hidden="true">
    <div class="pk-shift-band"></div>
    <div class="pk-shift-fill ${safeAttr(summary.direction || "")}" style="left:${safeAttr(geometry.left)}%;width:${safeAttr(geometry.width)}%"></div>
    <div class="pk-shift-marker" style="left:calc(${safeAttr(geometry.marker)}% - 1.5px)"></div>
  </div>`;
}

function pkShiftMeterGeometry(fold) {
  let marker = 50;
  const value = Number(fold);
  if (Number.isFinite(value) && value > 0) marker = 50 + Math.log2(value) * 18;
  marker = Math.max(4, Math.min(96, Math.round(marker)));
  const left = Math.min(50, marker);
  const width = Math.max(2, Math.abs(marker - 50));
  return { marker, left, width };
}

function pkShiftMagnitude(fold) {
  const value = Number(fold);
  return Number.isFinite(value) && value > 0 ? Math.abs(Math.log2(value)) : 0;
}

function pkShiftDirection(fold) {
  const value = Number(fold);
  if (!Number.isFinite(value)) return "";
  if (value > 1.15) return "up";
  if (value < 0.85) return "down";
  return "";
}

function pkShiftValue(fold) {
  const value = Number(fold);
  if (!Number.isFinite(value) || value <= 0) return "directional";
  if (value > 1.15 || value < 0.85) return fmtFold(value);
  return "near baseline";
}

function renderPKTakeaway(summary = {}) {
  if (!summary) return "";
  const prefix = summary.direction === "up"
    ? "Higher modeled exposure"
    : summary.direction === "down"
    ? "Lower modeled exposure"
    : "Modeled exposure near baseline";
  return `<div class="pk-takeaway ${safeAttr(summary.direction || "")}">
    <div>
      <strong>${safePublicHtml(prefix)}</strong>
      <span>${safePublicHtml(summary.note || "Directional comparison only.")}</span>
    </div>
    <div class="pk-takeaway-visual">
      <span>${safePublicHtml(summary.value || "baseline")}</span>
      ${renderPKShiftMeter(summary)}
    </div>
  </div>`;
}

function renderAbsolutePKCard(name) {
  const key = toGraphId(name);
  const params = getPKParams(name);
  const summary = pkAbsoluteVisualizationSummary(name, params);
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
  const baseAuc = pkIntervalAuc(genoParams);
  const adjAuc = adjParams ? pkIntervalAuc(adjParams) : null;
  const exposureShift = adjAuc ? adjAuc / Math.max(baseAuc || 0, 1e-9) : 1;
  const displayWindow = typeof pkDisplayCurveWindow === "function"
    ? pkDisplayCurveWindow(genoParams, tau, nDoses)
    : { nDoses, tTotal:tau * nDoses, compressed:false };
  const adjDisplayWindow = adjParams && typeof pkDisplayCurveWindow === "function"
    ? pkDisplayCurveWindow(adjParams, tau, nDoses)
    : displayWindow;
  const displayTTotal = Math.max(displayWindow.tTotal, adjParams ? adjDisplayWindow.tTotal : 0);
  const displayDoseCount = Math.max(displayWindow.nDoses, adjParams ? adjDisplayWindow.nDoses : 0);
  const basePts = pkRepeatedDoseCurve(genoParams, tau, displayDoseCount, 200, displayTTotal);
  const adjPts = adjParams ? pkRepeatedDoseCurve(adjParams, tau, displayDoseCount, 200, displayTTotal) : null;
  const showTrough = baseMetrics.ctrough_ss > Math.max(baseMetrics.cmax_ss, adjMetrics?.cmax_ss || 0) * 0.02;
  const svg = renderPKCurveSvg({
    key,
    basePts,
    adjPts,
    tTotal: displayTTotal,
    yMax: Math.max(baseMetrics.cmax_ss, adjMetrics?.cmax_ss || 0) * 1.15,
    cmax: baseMetrics.cmax_ss,
    ctrough: showTrough ? baseMetrics.ctrough_ss : null,
    relative:false,
  });
  const daysStr = baseMetrics.t_to_ss_days < 1 ? `${Math.round(baseMetrics.t_to_ss_h)}h` : `${baseMetrics.t_to_ss_days}d`;
  const note = publicDisplayText(params.note || "");
  const noteHtml = note ? `<div class="pk-note">${safePublicHtml(note.substring(0,140))}${note.length>140?'...' : ''}</div>` : '';

  return `<div class="pk-card">
    <div class="pk-title">${safePublicHtml(name)}${genoBadge}${intBadge}</div>
    <div class="pk-trust-row">
      <span class="pk-trust-badge absolute">modeled estimate</span>
      <span class="pk-trust-badge">directional comparison</span>
      ${adjAuc ? `<span class="pk-trust-badge shift">AUC shift ${safePublicHtml(fmtFold(exposureShift))}</span>` : ""}
    </div>
    ${renderPKTakeaway(summary)}
    <div class="pk-params">F=${safePublicHtml(Math.round(params.F*100))}% · t½=${safePublicHtml(params.halfLife)}h · τ=${safePublicHtml(tau)}h · dose=${safePublicHtml(params.dose_mg)}mg · Vd=${safePublicHtml(params.Vd)}L/kg</div>
    ${svg}
    ${renderPKLegend(!!adjPts, false)}
    ${displayWindow.compressed ? `<div class="pk-window-note">Curve window compressed to show the early concentration peak for a short-acting profile; modeled AUC and steady-state metrics still use τ=${safePublicHtml(tau)}h.</div>` : ""}
    <div class="pk-metrics">
      <span title="Accumulation factor">R = ${safePublicHtml(Math.round(baseMetrics.accum * 10)/10)}x</span>
      <span title="Modeled steady-state dose-interval area under the curve">Modeled AUCτ: ${safePublicHtml(fmtPK(baseAuc))} ng*h/mL</span>
      <span title="Modeled steady-state peak concentration">Modeled peak: ${fmtPK(baseMetrics.cmax_ss)} ng/mL</span>
      ${showTrough ? `<span title="Modeled trough concentration">Modeled trough: ${safePublicHtml(fmtPK(baseMetrics.ctrough_ss))} ng/mL</span>` : ''}
      <span title="Time to reach about 97% of true steady state">SS in ~${safePublicHtml(daysStr)}</span>
      ${adjMetrics ? `<span class="pk-int-metric" title="Modeled peak with DDI adjustment">Modeled adjusted peak: ${fmtPK(adjMetrics.cmax_ss)} ng/mL</span>` : ''}
      ${adjAuc ? `<span class="pk-int-metric" title="Modeled adjusted AUC over one dosing interval">Modeled adjusted AUCτ: ${safePublicHtml(fmtPK(adjAuc))} ng*h/mL</span>` : ''}
    </div>
    ${noteHtml}
    ${params.nonlinear ? `<div class="pk-warning">Nonlinear kinetics: first-order simulation is approximate.</div>` : ''}
    ${params.taperNote ? `<div class="pk-taper">${params.taperNote}</div>` : ''}
  </div>`;
}

function renderRelativePKCard(name) {
  const sim = pkRelativeForDrug(name, { nPoints:200 });
  if (!sim) return '';
  const summary = pkRelativeVisualizationSummary(name);
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
    <div class="pk-title">${safePublicHtml(name)}<span class="pk-geno-badge">Relative</span>${genoBadge}${intBadge}</div>
    <div class="pk-trust-row">
      <span class="pk-trust-badge relative">relative estimate</span>
      <span class="pk-trust-badge">reference vs current context</span>
      <span class="pk-trust-badge shift">AUC ${safePublicHtml(fmtFold(metrics.aucFold))}</span>
    </div>
    ${renderPKTakeaway(summary)}
    <div class="pk-params">t½=${safePublicHtml(Math.round(metrics.effectiveHalfLifeH * 10) / 10)}h effective · τ=${safePublicHtml(sim.tau)}h · reference peak = 1.0</div>
    ${svg}
    ${renderPKLegend(true, true)}
    <div class="pk-metrics">
      <span title="Relative AUC versus NM/no-interaction reference">Relative AUC ${safePublicHtml(fmtFold(metrics.aucFold))}</span>
      <span title="Relative modeled peak versus reference single-dose peak">Modeled peak: ${fmtPK(metrics.cmax_ss)} rel</span>
      <span title="Accumulation factor">R = ${safePublicHtml(Math.round(metrics.accumRatio * 10) / 10)}x</span>
      <span title="Approximate time to 90% steady state">90% SS ~${safePublicHtml(ssDays)}</span>
      ${activeFold ? `<span class="pk-int-metric">${activeFold}</span>` : ''}
    </div>
    <div class="pk-note">${safePublicHtml(interpretation)}. Relative curve shown because full F/ka/Vd/dose parameters are not available.</div>
  </div>`;
}

function pkIntervalAuc(params) {
  if (!params || !params.halfLife || !params.Vd || !params.dose_mg) return 0;
  const ke = 0.693 / params.halfLife;
  const clearanceLh = ke * params.Vd * 70;
  if (!Number.isFinite(clearanceLh) || clearanceLh <= 0) return 0;
  return params.F * params.dose_mg * 1000 / clearanceLh;
}

function renderPKLegend(hasAdjusted, relative) {
  return `<div class="pk-legend">
    <span><i class="pk-legend-base"></i>${relative ? "reference" : "baseline"}</span>
    ${hasAdjusted ? `<span><i class="pk-legend-adjusted"></i>${relative ? "current context" : "adjusted"}</span>` : ""}
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
