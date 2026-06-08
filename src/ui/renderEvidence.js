// MedCheck — Evidence explorer panel
// Phase A: modular source — concatenated by build.js

function renderEvidenceExplorer() {
  const el = document.getElementById("evidenceBody");
  const section = document.getElementById("evidenceSection");
  const countEl = document.getElementById("evidenceCount");
  if (!el) return;

  if (activeStack.length < 1) {
    if (section) section.style.display = "none";
    return;
  }

  // Collect all relevant studies for current stack.
  // Public trust status is intentionally unified: no evidence entry is presented
  // as professionally reviewed yet. The reviewRequired flag remains an internal
  // enrichment/scoring control, not a separate public trust tier.
  const relevantStudies = new Map();
  const reviewStudies = new Map();
  const drugNames = activeStack.map(n => n.toLowerCase());
  const stackContext = typeof getStackEvidenceContext === "function"
    ? getStackEvidenceContext()
    : { evidenceRefs:new Set() };

  for (const [sid, study] of Object.entries(STUDY_DB)) {
    if (study.public === false) continue;
    const title = (study.title || '').toLowerCase();
    const source = (study.source || '').toLowerCase();
    const supports = (study.supports || []).join(' ').toLowerCase();
    const relevantToStack = drugNames.some(name =>
      title.includes(name) || source.includes(name) || supports.includes(name)) ||
      stackContext.evidenceRefs?.has?.(sid);
    if (!relevantToStack) continue;
    if (study.reviewRequired === true) reviewStudies.set(sid, study);
    else relevantStudies.set(sid, study);
  }

  if (relevantStudies.size === 0 && reviewStudies.size === 0) {
    if (section) section.style.display = "none";
    return;
  }

  if (section) section.style.display = "";

  // Integrated display. Review-required enrichment drafts are shown inline with
  // the older evidence entries, while every card carries the same pending
  // professional-review badge from studyCardHTML.
  const combinedStudies = [...relevantStudies.values(), ...reviewStudies.values()]
    .sort((a, b) => {
      const ra = a.reviewRequired === true ? 1 : 0;
      const rb = b.reviewRequired === true ? 1 : 0;
      if (ra !== rb) return ra - rb;                                 // baseline entries first
      return (EVIDENCE_WEIGHT[b.type] || 0) - (EVIDENCE_WEIGHT[a.type] || 0);
    });

  if (countEl) {
    countEl.textContent = `${combinedStudies.length} source-linked evidence · all pending professional review`;
  }

  // Tier filter buttons span every displayed card.
  const tiers = [...new Set(combinedStudies.map(s => s.type).filter(Boolean))].sort();
  const tierFilterHTML = combinedStudies.length ? `<div class="ev-explorer-filter" id="evFilterWrap">
    <span class="ev-filter-btn active" onclick="filterEvidenceTier(null,this)">All (${combinedStudies.length})</span>
    ${tiers.map(t => {
      const count = combinedStudies.filter(s => s.type === t).length;
      return `<span class="ev-filter-btn" onclick="filterEvidenceTier('${t}',this)">${t.replace(/_/g,' ')} (${count})</span>`;
    }).join('')}
  </div>` : '';

  const cardsHTML = combinedStudies
    .map(s => `<div class="ev-explorer-card" data-tier="${s.type || 'uncategorized'}">${studyCardHTML(s)}</div>`)
    .join('') || `<div class="ev-explorer-empty" style="color:var(--text2);font-size:13px;padding:8px 4px">No evidence entries match this stack yet.</div>`;

  // Panel-level review notice — applies to every entry until a licensed
  // pharmacist/physician signs off.
  const reviewNotice = `<div class="ev-review-notice" style="margin-bottom:10px;border:1px solid var(--amber);background:var(--amberBg);border-radius:8px;padding:8px 10px;font-size:11px;color:var(--amber);line-height:1.5">
    ⚠ Educational only — no entry below has been reviewed by a licensed pharmacist or physician yet. Treat every evidence entry as source-linked and pending professional review; severity output is explanatory and not clinically final.
  </div>`;

  el.innerHTML = reviewNotice + tierFilterHTML + `<div id="evCardsContainer">${cardsHTML}</div>`;
}

function filterEvidenceTier(tier, btn) {
  // Update active button
  const wrap = document.getElementById('evFilterWrap');
  if (wrap) wrap.querySelectorAll('.ev-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  // Show/hide cards
  const container = document.getElementById('evCardsContainer');
  if (!container) return;
  container.querySelectorAll('.ev-explorer-card').forEach(card => {
    card.style.display = (!tier || card.dataset.tier === tier) ? '' : 'none';
  });
}

function renderQualityDashboard() {
  const section = document.getElementById("qualitySection");
  const el = document.getElementById("qualityBody");
  const countEl = document.getElementById("qualityCount");
  if (!el) return;
  if (activeStack.length < 1) { if (section) section.style.display = "none"; return; }

  const studies = Object.values(STUDY_DB || {});
  const publicStudies = studies.filter(s => s.public !== false);
  const professionalReviewed = publicStudies.filter(s =>
    s.professionalReviewed === true ||
    s.clinicalReviewed === true ||
    s.reviewStatus === "professional_reviewed" ||
    s.reviewStatus === "clinician_reviewed"
  );
  const pendingProfessionalReview = publicStudies.length - professionalReviewed.length;
  const reviewNotes = publicStudies.filter(s => s.verifyNote);
  const qualitative = [];
  const quantified = [];
  const missingSignals = [];
  for (const effect of GENOTYPE_METABOLITE_EFFECTS || []) {
    for (const [phenotype, pe] of Object.entries(effect.effects || {})) {
      if (!pe || pe.direction === "baseline" || pe.direction === "uncertain") continue;
      if (pe.qualitative) qualitative.push(`${effect.parent} -> ${effect.metaboliteName} ${phenotype}`);
      if (pe.fold) quantified.push(`${effect.parent} -> ${effect.metaboliteName} ${phenotype}`);
    }
    if (!effect.exposureSignal) missingSignals.push(`${effect.parent} -> ${effect.metaboliteName}`);
  }
  const estimatedFoldCount = (document.getElementById("foldBody")?.textContent || "").match(/model estimate/g)?.length || 0;
  const knownDdiMissingRefs = (KNOWN_DDI || []).filter(d => !d.evidenceRefs || d.evidenceRefs.length === 0).length;
  const stackStudies = publicStudies.filter(s => activeStack.some(name =>
    JSON.stringify([s.id,s.title,s.source,s.supports,s.quantifiedEffects]).toLowerCase().includes(name.toLowerCase())
  ));

  if (section) section.style.display = "";
  if (countEl) countEl.textContent = `${publicStudies.length} evidence · ${pendingProfessionalReview} pending professional review · ${qualitative.length} qualitative PGx effects`;

  const issueItems = [
    ...reviewNotes.slice(0,3).map(s => `<div class="quality-item"><strong>Evidence review note:</strong> ${s.id} · ${s.verifyNote}</div>`),
    ...missingSignals.slice(0,3).map(x => `<div class="quality-item"><strong>Schema upgrade:</strong> add explicit exposureSignal/action metadata for ${x}</div>`),
    knownDdiMissingRefs ? `<div class="quality-item"><strong>Interaction provenance:</strong> ${knownDdiMissingRefs} interaction rows still rely on inline evidence instead of STUDY_DB refs.</div>` : ""
  ].filter(Boolean).join("");

  el.innerHTML = `
    <div class="quality-grid">
      <div class="quality-tile"><div class="quality-num">${DRUG_DB.length}</div><div class="quality-label">Drugs</div><div class="quality-note">Current searchable database</div></div>
      <div class="quality-tile"><div class="quality-num">${publicStudies.length}</div><div class="quality-label">Source-Linked Evidence</div><div class="quality-note">${stackStudies.length} relevant to this stack · all pending professional review</div></div>
      <div class="quality-tile"><div class="quality-num">${quantified.length}</div><div class="quality-label">Quantified PGx Effects</div><div class="quality-note">Metabolite/active-form rows with numeric folds</div></div>
      <div class="quality-tile"><div class="quality-num">${qualitative.length}</div><div class="quality-label">Qualitative PGx Effects</div><div class="quality-note">Shown without invented fold numbers</div></div>
      <div class="quality-tile"><div class="quality-num">${professionalReviewed.length}</div><div class="quality-label">Professionally Reviewed Evidence</div><div class="quality-note">${pendingProfessionalReview} entries still pending pharmacist/physician review</div></div>
      <div class="quality-tile"><div class="quality-num">${estimatedFoldCount}</div><div class="quality-label">Live Model Estimates</div><div class="quality-note">Estimated folds visible in the current stack</div></div>
    </div>
    ${issueItems ? `<div class="quality-list">${issueItems}</div>` : `<div class="quality-list"><div class="quality-item"><strong>Current stack:</strong> no structural quality warnings surfaced by the local dashboard.</div></div>`}
  `;
}

// ── renderCascade — Explainable Graph Output ──
// Renders the traverseEffects() results as a visual pathway chain.
// Each chain shows: Source → edge → Node → edge → ... → Phenotype
// Color-coded by phenotype severity; confidence shown as percentage.
