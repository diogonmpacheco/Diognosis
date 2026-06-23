// Diognosis — Evidence explorer panel
// Phase A: modular source — concatenated by build.js

function renderEvidenceExplorer() {
  const el = document.getElementById("evidenceBody");
  const section = document.getElementById("evidenceSection");
  const countEl = document.getElementById("evidenceCount");
  if (!el) return;

  if (activeStack.length < 1) {
    hideSectionAndClear("evidenceSection", "evidenceBody", "evidenceCount");
    return;
  }

  // Collect all relevant studies for current stack.
  // Public trust status is intentionally unified: evidence can be source-integrated
  // for V1 without claiming professional sign-off. The reviewRequired flag remains
  // an internal enrichment/scoring control, not a separate public trust tier.
  const relevantStudies = new Map();
  const reviewStudies = new Map();
  const drugNames = activeStack.map(n => n.toLowerCase());
  const geneNames = Object.keys(activeGenotype || {}).map(n => n.toLowerCase());
  const stackContext = typeof getStackEvidenceContext === "function"
    ? getStackEvidenceContext()
    : { evidenceRefs:new Set() };
  const pendingCalculationContext = typeof getRenderComputationCache === "function"
    ? getRenderComputationCache().pendingCalculationContext
    : (typeof getActivePendingCalculationContext === "function" ? getActivePendingCalculationContext() : null);
  const cache = typeof getRenderComputationCache === "function" ? getRenderComputationCache() : null;
  const findings = cache
    ? ((cache.clinicalConcerns || []).length ? cache.clinicalConcerns : cache.findings)
    : (typeof buildInteractionFindings === "function"
      ? buildInteractionFindings(activeStack, activeGenotype || {}, { interactions:activeStack.length >= 2 ? calcRisk().interactions : [] })
      : []);

  const studyEntries = typeof getEvidenceStudyEntries === "function"
    ? getEvidenceStudyEntries(pendingCalculationContext)
    : Object.entries(STUDY_DB);
  for (const [sid, study] of studyEntries) {
    if (study.public === false) continue;
    const title = (study.title || '').toLowerCase();
    const source = (study.source || '').toLowerCase();
    const supports = (study.supports || []).join(' ').toLowerCase();
    const relevantToStack = drugNames.some(name =>
      title.includes(name) || source.includes(name) || supports.includes(name)) ||
      geneNames.some(name => title.includes(name) || source.includes(name) || supports.includes(name)) ||
      stackContext.evidenceRefs?.has?.(sid);
    if (!relevantToStack) continue;
    if (study.reviewRequired === true) reviewStudies.set(sid, study);
    else relevantStudies.set(sid, study);
  }

  if (relevantStudies.size === 0 && reviewStudies.size === 0 && !findings.length) {
    hideSectionAndClear("evidenceSection", "evidenceBody", "evidenceCount");
    return;
  }

  if (section) section.style.display = "";

  // Integrated display. Review-required enrichment rows are shown inline with
  // the older evidence entries, while every card carries the same source-linked
  // badge from studyCardHTML.
  const combinedStudies = [...relevantStudies.values(), ...reviewStudies.values()]
    .sort((a, b) => {
      const ra = a.reviewRequired === true ? 1 : 0;
      const rb = b.reviewRequired === true ? 1 : 0;
      if (ra !== rb) return ra - rb;                                 // baseline entries first
      return (EVIDENCE_WEIGHT[b.type] || 0) - (EVIDENCE_WEIGHT[a.type] || 0);
    });

  if (countEl) {
    const pendingRows = combinedStudies.filter(study => study.pendingSourceSignal).length;
    countEl.textContent = `${combinedStudies.length} source-integrated evidence${pendingRows ? ` · ${pendingRows} source preview signal${pendingRows === 1 ? "" : "s"}` : ""} · professional sign-off not claimed`;
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
  const ladderLedger = renderEvidenceLadderLedger(findings);

  const reviewNotice = `<div class="ev-review-notice" style="margin-bottom:10px;border:1px solid var(--amber);background:var(--amberBg);border-radius:8px;padding:8px 10px;font-size:11px;color:var(--amber);line-height:1.5">
    Mechanistic review only. Source entries are integrated for traceability; professional sign-off is not claimed and severity output is explanatory, not medical advice.
  </div>`;

  el.innerHTML = reviewNotice + ladderLedger + tierFilterHTML + `<div id="evCardsContainer">${cardsHTML}</div>`;
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

function renderEvidenceLadderLedger(findings = []) {
  const rowsByRef = new Map();
  for (const finding of findings || []) {
    for (const ref of finding.evidenceRefs || []) {
      const study = typeof getStudy === "function" ? getStudy(ref) : STUDY_DB[ref];
      if (!study) continue;
      const row = rowsByRef.get(ref) || {
        ref,
        study,
        findings: [],
        ladder: computeEvidenceLadder([ref], { reviewRequired:true, calculationBearing:true }),
      };
      row.findings.push(finding.title || finding.id || "Finding");
      rowsByRef.set(ref, row);
    }
  }
  const sourceLinkedFindings = findings.filter(finding => finding.evidenceLadder?.sourceLinked);
  const noRefFindings = findings.length - sourceLinkedFindings.length;
  const unsignedFindings = findings.filter(finding => finding.evidenceLadder?.professionalReviewStatus !== "reviewed");
  const rows = [...rowsByRef.values()].sort((a, b) =>
    (EVIDENCE_WEIGHT[b.study.type] || 0) - (EVIDENCE_WEIGHT[a.study.type] || 0) ||
    String(a.study.title || "").localeCompare(String(b.study.title || ""))
  );
  const rowHtml = rows.length ? rows.slice(0, 18).map(row => {
    const ladder = row.ladder;
    const tier = ladder.strongestTier && ladder.strongestTier !== "unknown" ? ladder.strongestTier.replace(/_/g, " ") : "unknown";
    const identifiers = ladder.publicIdentifiers?.length ? ladder.publicIdentifiers.join(" · ") : "source-linked entry";
    const title = publicEvidenceTitle(row.study);
    const relatedButton = typeof renderRelatedFindingButton === "function"
      ? renderRelatedFindingButton({ terms:row.findings, evidenceRefs:[row.ref] }, "Open finding")
      : "";
    return `<div class="evidence-ledger-row">
      <div class="evidence-ledger-head">
        <div>
          <div class="evidence-ledger-title">${safePublicHtml(title)}</div>
          <div class="evidence-ledger-meta">${safePublicHtml(tier.toLowerCase())} · ${safePublicHtml(identifiers)}</div>
        </div>
        <span class="ev-review-badge needs-review">${ladder.professionalReviewStatus === "reviewed" ? "reviewed" : "source-linked"}</span>
      </div>
      <div class="evidence-ledger-support">${safePublicHtml([...new Set(row.findings)].slice(0, 4).join(" · "))}</div>
      ${relatedButton ? `<div class="supporting-actions">${relatedButton}</div>` : ""}
      <div class="finding-meta">
        <span class="finding-tag">source: ${safePublicHtml(typeof compactReviewStatus === "function" ? compactReviewStatus(sourceSupportStatusLabel(ladder.sourceSupportStatus)) : sourceSupportStatusLabel(ladder.sourceSupportStatus))}</span>
        <span class="finding-tag">mechanistic: ${safePublicHtml(ladder.mechanisticConfidence)}</span>
        <span class="finding-tag">clinical action: ${safePublicHtml(typeof compactReviewStatus === "function" ? compactReviewStatus(String(ladder.clinicalActionConfidence).replace(/_/g, " ")) : String(ladder.clinicalActionConfidence).replace(/_/g, " "))}</span>
        <span class="finding-tag">sign-off: ${safePublicHtml(ladder.professionalReviewStatus === "reviewed" ? "professional" : "not claimed")}</span>
        <span class="finding-tag">${row.study.quantifiedEffects ? "calculation-bearing context" : "qualitative context"}</span>
      </div>
    </div>`;
  }).join("") : `<div class="evidence-ledger-empty">Some findings are modeled review prompts and do not yet have linked source refs. Source absence is shown on each finding card.</div>`;
  return `<div class="evidence-ledger" id="evidenceLadderLedger">
    <div class="evidence-ledger-summary">
      <div><strong>${safePublicHtml(String(findings.length))}</strong><span>current findings</span></div>
      <div><strong>${safePublicHtml(String(sourceLinkedFindings.length))}</strong><span>source-linked findings</span></div>
      <div><strong>${safePublicHtml(String(unsignedFindings.length))}</strong><span>no sign-off claimed</span></div>
      <div><strong>${safePublicHtml(String(noRefFindings))}</strong><span>inferred / no refs</span></div>
    </div>
    <div class="evidence-ledger-label">Evidence Browser / Evidence Ledger</div>
    <div class="evidence-ledger-list">${rowHtml}</div>
  </div>`;
}

function renderQualityDashboard() {
  const section = document.getElementById("qualitySection");
  const el = document.getElementById("qualityBody");
  const countEl = document.getElementById("qualityCount");
  if (!el) return;
  if (typeof isReviewerMode === "function" && !isReviewerMode()) {
    hideSectionAndClear("qualitySection", "qualityBody", "qualityCount");
    return;
  }
  if (activeStack.length < 1) {
    hideSectionAndClear("qualitySection", "qualityBody", "qualityCount");
    return;
  }

  const studies = Object.values(STUDY_DB || {});
  const publicStudies = studies.filter(s => s.public !== false);
  const professionalReviewed = publicStudies.filter(s =>
    s.professionalReviewed === true ||
    s.clinicalReviewed === true ||
    s.reviewStatus === "professional_reviewed" ||
    s.reviewStatus === "clinician_reviewed"
  );
  const v3ProfessionalCandidates = publicStudies.length - professionalReviewed.length;
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
  const openTargetsSnapshot = typeof getOpenTargetsSnapshot === "function" ? getOpenTargetsSnapshot() : null;
  const openTargetsSummary = openTargetsSnapshot?.summary || {};
  const openTargetsPromotionSummary = typeof OPEN_TARGETS_PROMOTION_QUEUE_SUMMARY !== "undefined" ? OPEN_TARGETS_PROMOTION_QUEUE_SUMMARY : null;
  const stackExternalContextCount = typeof collectOpenTargetsSafetyContext === "function"
    ? collectOpenTargetsSafetyContext(activeStack, openTargetsSnapshot).length
    : 0;
  const openTargetsRelease = openTargetsSummary.release || openTargetsSnapshot?.release || "not imported";

  if (section) section.style.display = "";
  if (countEl) countEl.textContent = `${publicStudies.length} evidence · ${v3ProfessionalCandidates} v3 sign-off candidates · ${stackExternalContextCount} external context cards`;

  const issueItems = [
    ...reviewNotes.slice(0,3).map(s => `<div class="quality-item"><strong>Evidence review note:</strong> ${safePublicHtml(publicEvidenceTitle(s))} · ${safePublicHtml(s.verifyNote)}</div>`),
    ...missingSignals.slice(0,3).map(x => `<div class="quality-item"><strong>Schema upgrade:</strong> add explicit exposure/action metadata for ${safePublicHtml(x)}</div>`),
    knownDdiMissingRefs ? `<div class="quality-item"><strong>Interaction provenance:</strong> ${knownDdiMissingRefs} interaction rows still rely on inline evidence instead of STUDY_DB refs.</div>` : ""
  ].filter(Boolean).join("");

  el.innerHTML = `
    <div class="quality-grid">
      <div class="quality-tile"><div class="quality-num">${DRUG_DB.length}</div><div class="quality-label">Drugs</div><div class="quality-note">Current searchable database</div></div>
      <div class="quality-tile"><div class="quality-num">${publicStudies.length}</div><div class="quality-label">Source-Integrated Evidence</div><div class="quality-note">${stackStudies.length} relevant to this stack · professional sign-off not claimed</div></div>
      <div class="quality-tile"><div class="quality-num">${quantified.length}</div><div class="quality-label">Quantified Gene Effects</div><div class="quality-note">Metabolite/active-form rows with numeric folds</div></div>
      <div class="quality-tile"><div class="quality-num">${qualitative.length}</div><div class="quality-label">Qualitative Gene Effects</div><div class="quality-note">Shown without invented fold numbers</div></div>
      <div class="quality-tile"><div class="quality-num">${professionalReviewed.length}</div><div class="quality-label">V3 Professional Sign-Offs</div><div class="quality-note">${v3ProfessionalCandidates} source-integrated entries remain eligible for future sign-off</div></div>
      <div class="quality-tile"><div class="quality-num">${stackExternalContextCount}</div><div class="quality-label">External Context Cards</div><div class="quality-note">${safePublicHtml(openTargetsSummary.contextFactsIncluded || 0)} imported facts · ${safePublicHtml(openTargetsPromotionSummary?.unreviewed || 0)} awaiting review · ${safePublicHtml(openTargetsRelease)}</div></div>
      <div class="quality-tile"><div class="quality-num">${estimatedFoldCount}</div><div class="quality-label">Live Model Estimates</div><div class="quality-note">Estimated folds visible in the current stack</div></div>
    </div>
    ${issueItems ? `<div class="quality-list">${issueItems}</div>` : `<div class="quality-list"><div class="quality-item"><strong>Current stack:</strong> no structural quality warnings surfaced by the local dashboard.</div></div>`}
  `;
}

// ── renderCascade — Explainable Graph Output ──
// Renders the traverseEffects() results as a visual pathway chain.
// Each chain shows: Source → edge → Node → edge → ... → Phenotype
// Color-coded by phenotype severity; confidence shown as percentage.
