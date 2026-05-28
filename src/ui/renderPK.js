// MedCheck — PK simulation panel
// Phase E: repeated dosing, steady-state, interaction-adjusted curves
// Phase A: modular source — concatenated by build.js

function renderPKSimulation() {
  const sec = document.getElementById("pkSimSection");
  const el  = document.getElementById("pkSimBody");
  if (!el) return;
  if (activeStack.length < 1) { if (sec) sec.style.display = "none"; return; }

  const drugsWithPK = activeStack.filter(n => {
    const key = toGraphId(n);
    return PK_PARAMS[key] || PK_PARAMS[n.toLowerCase()];
  });
  if (!drugsWithPK.length) { if (sec) sec.style.display = "none"; return; }
  if (sec) sec.style.display = "";

  let html = '<div class="pk-grid">';
  for (const name of drugsWithPK) {
    const key    = toGraphId(name);
    const params = PK_PARAMS[key] || PK_PARAMS[name.toLowerCase()];
    const tau    = pkGetTau(name);
    const nDoses = 5;

    // ── Genotype adjustment ────────────────────────────────────────
    const drug       = DRUG_DB.find(d => d.name === name);
    const primaryEnz = drug?.routes?.[0]?.enzyme;
    let genoMult = 1.0;
    let genoBadge = '';
    if (primaryEnz && ['CYP2D6','CYP2C19','CYP2C9'].includes(primaryEnz)) {
      genoMult = genotypeAdjustedPK(name, primaryEnz);
      const geno = activeGenotype[primaryEnz];
      const genoLabel = Object.entries(GENOTYPE_PHENOTYPE).find(([k,v]) => v === geno)?.[0] || 'NM';
      if (genoLabel !== 'NM') {
        genoBadge = `<span class="pk-geno-badge">${primaryEnz} ${genoLabel}: AUC ${genoMult}×</span>`;
      }
    }

    // Effective params after genotype (scale half-life by AUC fold as approximation)
    const genoParams = genoMult !== 1.0
      ? Object.assign({}, params, { halfLife: params.halfLife * genoMult })
      : params;

    // ── Interaction-adjusted curve ────────────────────────────────
    const rawFold = pkGetInteractionFold(name);
    const adjFold = rawFold * genoMult; // combine genotype + DDI
    const adjParams = pkInteractionAdjustedParams(genoParams, rawFold > 1.1 ? rawFold : null);
    let intBadge = '';
    if (adjParams) {
      const adjustedT12 = Math.round(adjParams.halfLife * 10) / 10;
      intBadge = `<span class="pk-int-badge" title="${primaryEnz} inhibited by coadministered drug">⚠ ${primaryEnz} inhibited · t½ → ${adjustedT12}h (×${Math.round(rawFold*10)/10})</span>`;
    }

    // ── Steady-state metrics ──────────────────────────────────────
    const baseMetrics = pkSteadyStateMetrics(genoParams, tau);
    const adjMetrics  = adjParams ? pkSteadyStateMetrics(adjParams, tau) : null;

    // ── Repeated dosing curves ────────────────────────────────────
    const basePts = pkRepeatedDoseCurve(genoParams, tau, nDoses, 200);
    const adjPts  = adjParams ? pkRepeatedDoseCurve(adjParams, tau, nDoses, 200) : null;

    // ── SVG construction ──────────────────────────────────────────
    const W = 280, H = 100, PAD_L = 6, PAD_R = 6, PAD_T = 10, PAD_B = 14;
    const plotW = W - PAD_L - PAD_R;
    const plotH = H - PAD_T - PAD_B;

    // y-scale: use max from either curve (with some headroom)
    const yMax = (adjMetrics ? Math.max(baseMetrics.cmax_ss, adjMetrics.cmax_ss) : baseMetrics.cmax_ss) * 1.15;
    const tTotal = tau * nDoses;

    const sx = t => PAD_L + (t / tTotal) * plotW;
    const sy = c => H - PAD_B - (c / yMax) * plotH;

    function curvePath(pts) {
      return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.t).toFixed(1)},${sy(p.c).toFixed(1)}`).join(' ');
    }

    function fillPath(pts) {
      const path = curvePath(pts);
      return `${path} L${sx(tTotal).toFixed(1)},${(H-PAD_B).toFixed(1)} L${sx(0).toFixed(1)},${(H-PAD_B).toFixed(1)} Z`;
    }

    // Dose tick marks on x-axis
    const doseTicks = Array.from({length: nDoses}, (_, i) => i).map(d => {
      const x = sx(d * tau).toFixed(1);
      return `<line x1="${x}" y1="${(H-PAD_B).toFixed(1)}" x2="${x}" y2="${(H-PAD_B+4).toFixed(1)}" stroke="var(--text2)" stroke-width="0.8"/>`;
    }).join('');

    // Dose label under last visible tick
    const doseLabels = Array.from({length: nDoses}, (_, i) => i)
      .filter(d => d === 0 || d === Math.floor(nDoses/2) || d === nDoses-1)
      .map(d => {
        const x = sx(d * tau).toFixed(1);
        const label = tau < 24 ? `${d * tau}h` : `D${Math.round(d * tau / 24) + 1}`;
        return `<text x="${x}" y="${(H - 2).toFixed(1)}" font-size="7.5" fill="var(--text2)" text-anchor="middle">${label}</text>`;
      }).join('');

    // SS reference lines (dashed)
    const ssMaxY = sy(baseMetrics.cmax_ss).toFixed(1);
    const ssTroughY = sy(Math.max(baseMetrics.ctrough_ss, 0)).toFixed(1);
    const showTrough = baseMetrics.ctrough_ss > yMax * 0.02; // only if trough is meaningful

    const ssLines = `
      <line x1="${PAD_L}" y1="${ssMaxY}" x2="${(W-PAD_R).toFixed(1)}" y2="${ssMaxY}"
            stroke="var(--accent)" stroke-width="0.7" stroke-dasharray="3,2" opacity="0.6"/>
      <text x="${(W-PAD_R-1).toFixed(1)}" y="${(parseFloat(ssMaxY)-2).toFixed(1)}"
            font-size="7" fill="var(--accent)" text-anchor="end" opacity="0.85">Cmax_ss</text>
      ${showTrough ? `
      <line x1="${PAD_L}" y1="${ssTroughY}" x2="${(W-PAD_R).toFixed(1)}" y2="${ssTroughY}"
            stroke="var(--accent)" stroke-width="0.5" stroke-dasharray="2,2" opacity="0.45"/>
      <text x="${(W-PAD_R-1).toFixed(1)}" y="${(parseFloat(ssTroughY)+7).toFixed(1)}"
            font-size="7" fill="var(--accent)" text-anchor="end" opacity="0.7">Ctrough</text>
      ` : ''}
    `;

    const gradId = `pkgrad_${key}`;
    const adjGradId = `pkgrad_adj_${key}`;

    const svg = `
    <svg class="pk-svg" viewBox="0 0 ${W} ${H}">
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
        </linearGradient>
        ${adjParams ? `
        <linearGradient id="${adjGradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--amber)" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="var(--amber)" stop-opacity="0"/>
        </linearGradient>` : ''}
      </defs>

      ${ssLines}

      <!-- Adjusted (interaction) curve behind base curve -->
      ${adjPts ? `
        <path d="${fillPath(adjPts)}" fill="url(#${adjGradId})" stroke="none"/>
        <path d="${curvePath(adjPts)}" fill="none" stroke="var(--amber)" stroke-width="1.2" stroke-dasharray="4,2" opacity="0.8"/>
      ` : ''}

      <!-- Base curve fill and line -->
      <path d="${fillPath(basePts)}" fill="url(#${gradId})" stroke="none"/>
      <path d="${curvePath(basePts)}" fill="none" stroke="var(--accent)" stroke-width="1.5"/>

      <!-- x-axis -->
      <line x1="${PAD_L}" y1="${H-PAD_B}" x2="${W-PAD_R}" y2="${H-PAD_B}"
            stroke="var(--border)" stroke-width="0.6"/>
      ${doseTicks}
      ${doseLabels}
    </svg>`;

    // ── Metrics row ────────────────────────────────────────────────
    const fmt = n => n < 0.1 ? n.toExponential(1) : n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString();
    const daysStr = baseMetrics.t_to_ss_days < 1 ? `${Math.round(baseMetrics.t_to_ss_h)}h` : `${baseMetrics.t_to_ss_days}d`;

    const metricsHtml = `
    <div class="pk-metrics">
      <span title="Accumulation factor R = 1/(1−e^(−ke·τ))">R = ${Math.round(baseMetrics.accum * 10)/10}×</span>
      <span title="Steady-state peak concentration">Cmax_ss: ${fmt(baseMetrics.cmax_ss)} ng/mL</span>
      ${showTrough ? `<span title="Trough concentration (pre-dose at steady state)">Ctrough: ${fmt(baseMetrics.ctrough_ss)} ng/mL</span>` : ''}
      <span title="Time to reach ~97% of true steady state (~5 half-lives)">SS in ~${daysStr}</span>
      ${adjMetrics ? `<span class="pk-int-metric" title="Steady-state Cmax with CYP inhibition">⚠ Adj Cmax_ss: ${fmt(adjMetrics.cmax_ss)} ng/mL</span>` : ''}
    </div>`;

    html += `<div class="pk-card">
      <div class="pk-title">${name}${genoBadge}${intBadge}</div>
      <div class="pk-params">F=${Math.round(params.F*100)}% · t½=${params.halfLife}h · τ=${tau}h · dose=${params.dose_mg}mg · Vd=${params.Vd}L/kg</div>
      ${svg}
      ${metricsHtml}
      <div class="pk-note">${params.note.substring(0,140)}${params.note.length>140?'…':''}</div>
      ${params.nonlinear ? `<div class="pk-warning">⚠ Nonlinear auto-inhibition kinetics — AUC increases disproportionately above 30mg/day. Steady-state model underestimates at higher doses.</div>` : ''}
      ${params.taperNote ? `<div class="pk-taper">🔻 ${params.taperNote}</div>` : ''}
    </div>`;
  }

  html += '</div>';
  html += '<div class="pk-disclaimer">⚠ Educational model only. Linear one-compartment oral model — does not capture auto-inhibition, enterohepatic circulation, or multi-compartment distribution. Concentrations are relative units (not calibrated ng/mL). Not for clinical dosing decisions.</div>';
  el.innerHTML = html;
}

function renderScenarioComparison() {
  const section = document.getElementById("scenarioSection");
  const el = document.getElementById("scenarioBody");
  if (!el) return;
  if (activeStack.length < 1) { if (section) section.style.display = "none"; return; }
  if (section) section.style.display = "";

  const html = `<div class="scenario-grid">${activeStack.map(name => {
    const drug = getDrug(name);
    const primary = getScenarioPrimaryEnzyme(drug);
    const currentFold = calcFold(name).fold;
    const doseRows = getScenarioDoseRows(name);
    const genotypeRows = primary ? getScenarioGenotypeRows(name, primary) : [];
    const action = clinicalActionForFold(currentFold, drug);
    return `<div class="scenario-card">
      <div class="scenario-title">${name}</div>
      ${doseRows.length ? `<div class="scenario-note">Dose sensitivity</div>${doseRows.join("")}` : `<div class="scenario-note">No local dose tiers defined</div>`}
      ${genotypeRows.length ? `<div class="scenario-note" style="margin-top:7px">${primary} phenotype sensitivity</div>${genotypeRows.join("")}` : ""}
      <div class="scenario-action">${action}</div>
    </div>`;
  }).join("")}</div>
  <div class="pk-disclaimer">Scenario values are directional checks from the same exposure model, not dosing instructions. Parent and metabolite rows remain separate.</div>`;
  el.innerHTML = html;
}

function getScenarioPrimaryEnzyme(drug) {
  if (!drug) return null;
  const route = (drug.routes || []).find(r => GENOTYPE_EFFECTS[r.enzyme] || CLINICAL_FOLD[drug.name]?.[r.enzyme]);
  return route?.enzyme || null;
}

function getScenarioDoseRows(name) {
  const tiers = DOSE_TIERS[name]?.tiers;
  if (!tiers) return [];
  const current = getDoseTier(name);
  const candidates = [...new Set(["low", current, "high", "max"].filter(k => tiers[k]))];
  return candidates.map(tier => {
    const fold = withTemporaryState(() => {
      drugDoses[name] = tier;
      return calcFold(name).fold;
    });
    const label = tier === current ? `${tiers[tier].label} current` : tiers[tier].label;
    return scenarioRow(label, fold);
  });
}

function getScenarioGenotypeRows(name, enzyme) {
  const phenos = [
    [GENOTYPE_PHENOTYPE.NM, "NM"],
    [activeGenotype[enzyme] || GENOTYPE_PHENOTYPE.NM, "current"],
    [GENOTYPE_PHENOTYPE.PM, "PM"],
  ];
  return [...new Map(phenos.map(p => [p[0], p])).values()].map(([pheno, label]) => {
    const fold = withTemporaryState(() => {
      activeGenotype[enzyme] = pheno;
      return calcFold(name).fold;
    });
    return scenarioRow(`${enzyme} ${label}`, fold);
  });
}

function scenarioRow(label, fold) {
  const cls = fold >= 4 ? "danger" : fold >= 1.5 ? "high" : fold <= 0.5 ? "low" : "";
  return `<div class="scenario-row"><span>${label}</span><span class="scenario-val ${cls}">${fold.toFixed(fold >= 10 ? 1 : 2)}x</span></div>`;
}

function withTemporaryState(fn) {
  const doseSnapshot = { ...drugDoses };
  const genoSnapshot = { ...activeGenotype };
  try {
    return fn();
  } finally {
    Object.keys(drugDoses).forEach(k => delete drugDoses[k]);
    Object.assign(drugDoses, doseSnapshot);
    activeGenotype = genoSnapshot;
  }
}

function clinicalActionForFold(fold, drug) {
  if (drug?.prodrug && fold <= 0.6) return "Action layer: possible activation failure; consider alternative or response monitoring.";
  if (fold >= 4) return "Action layer: high exposure signal; avoid strong inhibitors, reduce dose, or use TDM/monitoring when clinically appropriate.";
  if (fold >= 2) return "Action layer: elevated exposure; monitor adverse effects and consider lower dose/alternative.";
  if (fold <= 0.5) return "Action layer: low exposure signal; monitor loss of efficacy.";
  return "Action layer: no major parent-exposure shift in the current model.";
}

// ── renderInteractionGraph — D3 force-directed graph (#4) ──────────
