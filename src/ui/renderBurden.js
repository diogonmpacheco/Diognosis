// MedCheck — Washout calendar and adverse burden panels
// Phase A: modular source — concatenated by build.js

function renderWashoutCalendar() {
  const sec = document.getElementById("washoutSection");
  const el = document.getElementById("washoutBody");
  if (!el) return;
  if (activeStack.length < 1) { if (sec) sec.style.display = "none"; return; }

  const events = computeWashoutCalendar(activeStack);
  if (events.length === 0) { if (sec) sec.style.display = "none"; return; }
  if (sec) sec.style.display = "";

  const maxDays = Math.max(...events.map(e => e.days));
  let html = `<p style="font-size:12px;color:var(--text2);margin:0 0 10px">
    Stopping date: <strong>Today (${new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})})</strong>.
    Estimated days before enzyme activity is fully recovered.
  </p>`;
  html += '<table class="washout-table"><thead><tr><th>Agent</th><th>Mechanism</th><th>Recovery Time</th><th>Safe-to-Switch Date</th></tr></thead><tbody>';
  for (const ev of events) {
    const pct = Math.round((ev.days / maxDays) * 100);
    html += `<tr>
      <td><strong>${ev.name}</strong>${ev.drugName !== ev.name ? `<br><span style="font-size:10px;color:var(--text2)">from ${ev.drugName}</span>` : ''}</td>
      <td style="color:var(--text2);font-size:11px">${ev.mechanism.replace(/_/g,' ')}</td>
      <td>
        <div class="washout-bar-wrap">
          <div class="washout-bar" style="width:${Math.max(pct*1.2,8)}px"></div>
          <span style="font-size:12px;font-weight:700">${ev.days} days</span>
        </div>
        <div style="font-size:10px;color:var(--text2);margin-top:2px">${ev.note}</div>
      </td>
      <td class="washout-safe">${ev.safeDateStr}</td>
    </tr>`;
  }
  html += '</tbody></table>';
  html += '<div style="font-size:10px;color:var(--text2);margin-top:8px">⚠ Estimates based on population PK data. Individual variation is substantial. Consult clinical pharmacist before switching medications.</div>';
  el.innerHTML = html;
}

// ── renderAdverseBurden (#10) ──────────────────────────────────────
function renderAdverseBurden() {
  const sec = document.getElementById("burdenSection");
  const el = document.getElementById("burdenBody");
  if (!el) return;
  if (activeStack.length < 1) { if (sec) sec.style.display = "none"; return; }

  const drugs = activeStack.map(n => DRUG_DB.find(d => d.name === n)).filter(Boolean);
  const burden = computeAdverseBurden(drugs);
  const hasContent = burden.acb_total > 0 || burden.beers_flags.length > 0 ||
                     burden.sedation_contributors.length > 0 || burden.fall_risk_total > 0;
  if (sec) sec.style.display = "";
  if (!hasContent) {
    el.innerHTML = '<div class="empty-state">No curated adverse burden flags for this stack. Absence of a flag is not evidence of safety.</div>';
    return;
  }

  const acbLevel = burden.acb_total >= 3 ? 'high' : burden.acb_total >= 1 ? 'moderate' : 'none';
  const fallLevel = burden.fall_risk_total >= 6 ? 'high' : burden.fall_risk_total >= 3 ? 'moderate' : 'low';

  let html = '<div class="burden-grid">';

  // ACB Score
  const acbColor = acbLevel==='high'?'var(--red)':acbLevel==='moderate'?'var(--amber)':'var(--green)';
  html += `<div class="burden-card">
    <div class="burden-header">Anticholinergic Cognitive Burden (ACB)</div>
    <div class="burden-score" style="color:${acbColor}">${burden.acb_total}</div>
    <div class="burden-sub">${burden.acb_contributors.map(c=>`${c.name} (${c.score})`).join(', ') || 'None'}</div>
    ${burden.acb_total >= 3 ? '<div style="font-size:10px;color:var(--red);margin-top:4px;font-weight:600">High risk: delirium, cognitive impairment, urinary retention</div>' : ''}
  </div>`;

  // Fall Risk
  const fallColor = fallLevel==='high'?'var(--red)':fallLevel==='moderate'?'var(--amber)':'var(--text2)';
  html += `<div class="burden-card">
    <div class="burden-header">Fall Risk Score</div>
    <div class="burden-score" style="color:${fallColor}">${burden.fall_risk_total}</div>
    <div class="burden-sub">${burden.fall_risk_contributors.map(c=>c.name).join(', ') || 'None'}</div>
    ${burden.fall_risk_total >= 4 ? '<div style="font-size:10px;color:var(--amber);margin-top:4px;font-weight:600">Elevated fall/fracture risk — especially in elderly</div>' : ''}
  </div>`;

  // Sedation
  if (burden.sedation_contributors.length > 0) {
    html += `<div class="burden-card">
      <div class="burden-header">Sedating Agents</div>
      <div class="burden-score" style="color:var(--amber)">${burden.sedation_contributors.length}</div>
      <div class="burden-sub">${burden.sedation_contributors.join(', ')}</div>
      ${burden.sedation_contributors.length >= 2 ? '<div style="font-size:10px;color:var(--amber);margin-top:4px;font-weight:600">Combined CNS depression — avoid driving/machinery</div>' : ''}
    </div>`;
  }
  html += '</div>';

  // Beers flags
  if (burden.beers_flags.length > 0) {
    html += `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text2);margin-bottom:6px">Beers Criteria 2023 Flags (≥65 years)</div>`;
    for (const flag of burden.beers_flags) {
      html += `<div class="beers-flag">
        <span class="beers-drug">⚑ ${flag.name}</span>
        <span>${flag.concern}</span>
      </div>`;
    }
  }

  // Summary
  if (burden.summary.length > 0) {
    html += `<div style="margin-top:8px;padding:8px 10px;border-radius:6px;background:var(--card2);font-size:11px">
      ${burden.summary.map(s => `<div style="margin-bottom:3px">• ${s}</div>`).join('')}
    </div>`;
  }
  el.innerHTML = html;
}
