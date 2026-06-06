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
  // Quarantine: entries flagged reviewRequired (live, unreviewed enrichment drafts)
  // are routed to a separate, collapsed "review queue" and never mixed into the
  // default verified evidence list. Non-destructive — nothing is removed from STUDY_DB.
  const relevantStudies = new Map();   // verified / curated
  const reviewStudies = new Map();     // reviewRequired drafts (quarantined)
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
  if (countEl) {
    countEl.textContent = reviewStudies.size
      ? `${relevantStudies.size} verified · ${reviewStudies.size} in review queue`
      : `${relevantStudies.size} studies`;
  }

  // Tier filter buttons (verified studies only)
  const tiers = [...new Set([...relevantStudies.values()].map(s => s.type))].sort();
  const tierFilterHTML = relevantStudies.size ? `<div class="ev-explorer-filter" id="evFilterWrap">
    <span class="ev-filter-btn active" onclick="filterEvidenceTier(null,this)">All (${relevantStudies.size})</span>
    ${tiers.map(t => {
      const count = [...relevantStudies.values()].filter(s => s.type === t).length;
      return `<span class="ev-filter-btn" onclick="filterEvidenceTier('${t}',this)">${t.replace(/_/g,' ')} (${count})</span>`;
    }).join('')}
  </div>` : '';

  const cardsHTML = [...relevantStudies.values()]
    .sort((a,b) => (EVIDENCE_WEIGHT[b.type]||0) - (EVIDENCE_WEIGHT[a.type]||0))
    .map(s => `<div class="ev-explorer-card" data-tier="${s.type}">${studyCardHTML(s)}</div>`)
    .join('') || `<div class="ev-explorer-empty" style="color:var(--text2);font-size:13px;padding:8px 4px">No verified evidence entries match this stack yet.</div>`;

  // Quarantined review-queue block — collapsed by default, never shown inline
  // with verified evidence. Opt-in disclosure only.
  let reviewHTML = '';
  if (reviewStudies.size) {
    const reviewCards = [...reviewStudies.values()]
      .sort((a,b) => (EVIDENCE_WEIGHT[b.type]||0) - (EVIDENCE_WEIGHT[a.type]||0))
      .map(s => `<div class="ev-explorer-card" data-tier="${s.type}">${studyCardHTML(s)}</div>`)
      .join('');
    reviewHTML = `<div class="ev-review-queue" style="margin-top:14px;border-top:1px dashed var(--border);padding-top:12px">
      <button type="button" class="ev-review-toggle" onclick="toggleReviewQueue(this)"
        style="background:var(--amberBg);color:var(--amber);border:1px solid var(--amber);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer">
        ⚠ Show review queue — ${reviewStudies.size} unreviewed enrichment ${reviewStudies.size === 1 ? 'entry' : 'entries'}
      </button>
      <div id="evReviewCards" style="display:none;margin-top:10px">
        <div style="font-size:11px;color:var(--text2);margin-bottom:8px;line-height:1.5">
          These are auto-extracted citations pending pharmacist/physician review. They are excluded from the verified
          evidence list above and do not influence severity. Do not rely on them clinically until reviewed.
        </div>
        ${reviewCards}
      </div>
    </div>`;
  }

  el.innerHTML = tierFilterHTML + `<div id="evCardsContainer">${cardsHTML}</div>` + reviewHTML;
}

function toggleReviewQueue(btn) {
  const box = document.getElementById('evReviewCards');
  if (!box) return;
  const open = box.style.display !== 'none';
  box.style.display = open ? 'none' : '';
  if (btn) {
    const n = box.querySelectorAll('.ev-explorer-card').length;
    btn.textContent = open
      ? `⚠ Show review queue — ${n} unreviewed enrichment ${n === 1 ? 'entry' : 'entries'}`
      : `Hide review queue (${n})`;
  }
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
  const reviewQueue = publicStudies.filter(s => s.reviewRequired === true);
  const verifiedStudies = publicStudies.filter(s => s.reviewRequired !== true);
  const unverified = publicStudies.filter(s => s.verified === false || s.verifyNote);
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
  if (countEl) countEl.textContent = `${verifiedStudies.length} verified · ${reviewQueue.length} in review · ${qualitative.length} qualitative PGx effects`;

  const issueItems = [
    ...unverified.slice(0,3).map(s => `<div class="quality-item"><strong>Evidence to verify:</strong> ${s.id} · ${s.verifyNote || "marked unverified"}</div>`),
    ...missingSignals.slice(0,3).map(x => `<div class="quality-item"><strong>Schema upgrade:</strong> add explicit exposureSignal/action metadata for ${x}</div>`),
    knownDdiMissingRefs ? `<div class="quality-item"><strong>Interaction provenance:</strong> ${knownDdiMissingRefs} interaction rows still rely on inline evidence instead of STUDY_DB refs.</div>` : ""
  ].filter(Boolean).join("");

  el.innerHTML = `
    <div class="quality-grid">
      <div class="quality-tile"><div class="quality-num">${DRUG_DB.length}</div><div class="quality-label">Drugs</div><div class="quality-note">Current searchable database</div></div>
      <div class="quality-tile"><div class="quality-num">${verifiedStudies.length}</div><div class="quality-label">Verified Evidence</div><div class="quality-note">${stackStudies.length} relevant to this stack · ${reviewQueue.length} more in review queue</div></div>
      <div class="quality-tile"><div class="quality-num">${quantified.length}</div><div class="quality-label">Quantified PGx Effects</div><div class="quality-note">Metabolite/active-form rows with numeric folds</div></div>
      <div class="quality-tile"><div class="quality-num">${qualitative.length}</div><div class="quality-label">Qualitative PGx Effects</div><div class="quality-note">Shown without invented fold numbers</div></div>
      <div class="quality-tile"><div class="quality-num">${reviewQueue.length}</div><div class="quality-label">Evidence Review Queue</div><div class="quality-note">Quarantined enrichment drafts awaiting human review</div></div>
      <div class="quality-tile"><div class="quality-num">${estimatedFoldCount}</div><div class="quality-label">Live Model Estimates</div><div class="quality-note">Estimated folds visible in the current stack</div></div>
    </div>
    ${issueItems ? `<div class="quality-list">${issueItems}</div>` : `<div class="quality-list"><div class="quality-item"><strong>Current stack:</strong> no structural quality warnings surfaced by the local dashboard.</div></div>`}
  `;
}

// ── renderCascade — Explainable Graph Output ──
// Renders the traverseEffects() results as a visual pathway chain.
// Each chain shows: Source → edge → Node → edge → ... → Phenotype
// Color-coded by phenotype severity; confidence shown as percentage.
