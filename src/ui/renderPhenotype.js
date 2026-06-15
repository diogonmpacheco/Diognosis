// Diognosis — Phenotype risk accumulation panel
// Phase A: modular source — concatenated by build.js

function renderPhenotypeAccumulation() {
  const sec = document.getElementById("phenoAccumSection");
  const el = document.getElementById("phenoAccumBody");
  if (!el) return;
  if (activeStack.length < 1) {
    hideSectionAndClear("phenoAccumSection", "phenoAccumBody");
    return;
  }
  if (sec) sec.style.display = "";

  const drugs = activeStack.map(n => DRUG_DB.find(d => d.name === n)).filter(Boolean);
  const { totals, contributors } = computePhenotypeAccumulation(drugs);

  let html = '<div class="pheno-grid">';
  for (const [key, meta] of Object.entries(PHENOTYPE_RISK_RULES)) {
    const score = totals[key];
    const level = phenotypeRiskLevel(score, meta.thresholds);
    const drugs_list = (contributors[key]||[]).map(c => `${c.name} (${c.score})`).join(', ');
    const colorDot = level === 'high' ? 'var(--red)' : level === 'moderate' ? 'var(--amber)' : level === 'low' ? 'var(--green)' : 'var(--text3)';
    html += `<div class="pheno-card risk-${level}">
      <div class="pheno-label">${meta.name}</div>
      <div class="pheno-score" style="color:${colorDot}">${score}</div>
      <div class="pheno-drugs">${drugs_list || '—'}</div>
    </div>`;
  }
  html += '</div>';

  // Serotonin syndrome risk narrative
  if (totals.serotonin >= PHENOTYPE_NARRATIVE_THRESHOLDS.serotonin) {
    const serDrugs = (contributors.serotonin||[]).map(c=>c.name).join(' + ');
    html += `<div style="padding:8px 10px;border-radius:6px;background:var(--amberBg);border:1px solid var(--amber);font-size:12px;margin-bottom:8px">
      <strong>⚠ Serotonin Syndrome Risk:</strong> ${serDrugs} — combined serotonergic load score ${totals.serotonin}.
      Monitor for: hyperthermia, clonus, hyperreflexia, agitation, diaphoresis. Onset typically within 24h of combination or dose increase.
    </div>`;
  }
  if (totals.qtc >= PHENOTYPE_NARRATIVE_THRESHOLDS.qtc) {
    html += `<div style="padding:8px 10px;border-radius:6px;background:var(--redBg);border:1px solid var(--red);font-size:12px;margin-bottom:8px">
      <strong>🫀 High QTc Risk:</strong> Multiple QTc-prolonging agents (score ${totals.qtc}). Consider baseline ECG. Risk of Torsades de Pointes in susceptible patients (hypokalemia, hypomagnesemia, bradycardia, female sex, structural heart disease).
    </div>`;
  }
  if (totals.sedation >= PHENOTYPE_NARRATIVE_THRESHOLDS.sedation) {
    html += `<div style="padding:8px 10px;border-radius:6px;background:var(--amberBg);border:1px solid var(--amber);font-size:12px;margin-bottom:8px">
      <strong>💤 Sedation Accumulation:</strong> Score ${totals.sedation}. Combined CNS depression risk — caution in elderly, respiratory compromise, driving/operating machinery.
    </div>`;
  }
  el.innerHTML = html;
}

// ── renderPKSimulation (#1) ──────────────────────────────────────
