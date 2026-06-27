// Diognosis — Drug & Metabolite Balance renderer

function renderActiveMoietyBalance() {
  const section = document.getElementById("activeMoietySection");
  const body = document.getElementById("activeMoietyBody");
  const count = document.getElementById("activeMoietyCount");
  if (!section || !body) return [];
  if (!activeStack.length || typeof computeActiveMoietyBalance !== "function") {
    hideSectionAndClear("activeMoietySection", "activeMoietyBody", "activeMoietyCount");
    return [];
  }
  const rows = typeof getRenderComputationCache === "function"
    ? getRenderComputationCache().activeMoietyRows
    : computeActiveMoietyBalance(activeStack, activeGenotype || {});
  const displayRows = rows.filter(row => !isPublicSyntheticContextRow({
    name:row.actor,
    actor:row.actor,
    role:row.role,
    a:row.actorType,
    note:(row.reasons || []).join(" "),
    evidenceRefs:row.evidenceRefs || [],
    publicFacing:row.publicFacing,
    syntheticContext:row.syntheticContext,
  }));
  if (!displayRows.length) {
    section.style.display = "";
    if (count) count.textContent = "";
    body.innerHTML = rows.length
      ? '<div class="finding-empty">Only route/exposure context rows are modeled for this stack so far. Those support calculations but are hidden here until named metabolite curation is available.</div>'
      : '<div class="finding-empty">No parent-metabolite balance rows are modeled for this stack yet.</div>';
    return rows;
  }
  section.style.display = "";
  if (count) count.textContent = `${displayRows.length} row${displayRows.length === 1 ? "" : "s"}`;
  body.innerHTML = `<div class="active-moiety-intro">This section separates parent drugs from active, toxic, and inactive metabolites. A gene, inhibitor, inducer, or clearance pathway can move them in different directions.</div>` +
    renderActiveMoietySummary(displayRows) +
    `<div class="active-moiety-grid">${displayRows.map(renderActiveMoietyRow).join("")}</div>`;
  return rows;
}

function renderActiveMoietySummary(rows = []) {
  if (!rows.length) return "";
  const priority = { severe:4, moderate:3, monitor:2, info:1 };
  const top = rows.slice().sort((a, b) =>
    (priority[b.severityHint] || 0) - (priority[a.severityHint] || 0) ||
    activeMoietyPatternWeight(b.netPattern) - activeMoietyPatternWeight(a.netPattern)
  )[0];
  const toxicCount = rows.filter(row => row.actorType === "toxic_metabolite" || /toxic/.test(row.netPattern || "")).length;
  const activeCount = rows.filter(row => row.actorType === "active_metabolite" || /active/.test(row.netPattern || "")).length;
  const divergentCount = rows.filter(activeMoietyDirectionsDiverge).length;
  const topPattern = safePublicHtml((ACTIVE_MOIETY_PATTERN_LABELS[top?.netPattern] || top?.netPattern || "modeled balance").replace(/_/g, " "));
  const topPair = top ? `${top.parent} -> ${top.actor}` : "No top row";
  return `<div class="active-moiety-summary" aria-label="Parent-metabolite balance snapshot">
    <div class="active-moiety-summary-tile wide">
      <strong>${safePublicHtml(topPair)}</strong>
      <span>top balance signal</span>
      <small>${topPattern}</small>
    </div>
    <div class="active-moiety-summary-tile">
      <strong>${safePublicHtml(String(toxicCount))}</strong>
      <span>toxic metabolite</span>
      <small>rows to review</small>
    </div>
    <div class="active-moiety-summary-tile">
      <strong>${safePublicHtml(String(activeCount))}</strong>
      <span>active metabolite</span>
      <small>rows to review</small>
    </div>
    <div class="active-moiety-summary-tile">
      <strong>${safePublicHtml(String(divergentCount))}</strong>
      <span>direction split</span>
      <small>parent and metabolite differ</small>
    </div>
  </div>`;
}

function activeMoietyPatternWeight(pattern = "") {
  if (/toxic/.test(pattern)) return 4;
  if (/activation_failure/.test(pattern)) return 3;
  if (/active_metabolite/.test(pattern)) return 2;
  if (/mixed/.test(pattern)) return 1;
  return 0;
}

function activeMoietyDirectionsDiverge(row = {}) {
  const parent = row.parentDirection || "";
  const metabolite = row.metaboliteDirection || "";
  if (!parent || !metabolite || metabolite === "risk_context") return false;
  if (parent === "unknown" || metabolite === "unknown") return false;
  return parent !== metabolite;
}

function renderActiveMoietyRow(row) {
  const severity = safeChoice(row.severityHint, ["severe","moderate","monitor","info"], "info");
  const pattern = safePublicHtml((ACTIVE_MOIETY_PATTERN_LABELS[row.netPattern] || row.netPattern || "review prompt").replace(/_/g, " "));
  const actorType = safePublicHtml((row.actorType || "metabolite").replace(/_/g, " "));
  const reasons = (row.reasons || []).slice(0, 4).map(reason => `<li>${safePublicHtml(reason)}</li>`).join("");
  const reasonsBlock = reasons
    ? (typeof isReviewerMode === "function" && !isReviewerMode()
      ? `<details class="supporting-row-details"><summary>Why this row appears</summary><ul class="active-moiety-reasons">${reasons}</ul></details>`
      : `<ul class="active-moiety-reasons">${reasons}</ul>`)
    : "";
  const evidence = (row.evidenceRefs || []).length
    ? `${row.evidenceRefs.length} source ref${row.evidenceRefs.length === 1 ? "" : "s"}`
    : "inferred/review required";
  const parentFold = row.parentFold ? `${Math.round(row.parentFold * 100) / 100}x` : "unknown";
  const metaboliteDirectionLabel = ACTIVE_MOIETY_DIRECTION_LABELS[row.metaboliteDirection] || row.metaboliteDirection || "unknown";
  const metaboliteFold = row.metaboliteDirection === "risk_context"
    ? "not an exposure increase"
    : (row.metaboliteFold ? `${Math.round(row.metaboliteFold * 100) / 100}x` : "directional");
  const relatedButton = typeof renderRelatedFindingButton === "function"
    ? renderRelatedFindingButton({
        terms:[row.parent, row.actor, row.formationPathway, row.netPattern, ...(row.reasons || [])],
        evidenceRefs:row.evidenceRefs || [],
      }, "Open finding")
    : "";
  return `<div class="active-moiety-card supporting-context-row ${severity}">
    <div class="active-moiety-head">
      <div>
        <div class="active-moiety-title">${safePublicHtml(row.parent)} -> ${safePublicHtml(row.actor)}</div>
        <div class="active-moiety-subtitle">${actorType} via ${safePublicHtml(row.formationPathway || "unknown pathway")}</div>
      </div>
      <span class="finding-sev ${severity}">${safeHtml(severity)}</span>
    </div>
    <div class="active-moiety-pattern">${pattern}</div>
    <div class="active-moiety-directions">
      <div><strong>Parent</strong><span class="${safeAttr(row.parentDirection || "unknown")}">${safePublicHtml(row.parentDirection || "unknown")}</span><small>${safePublicHtml(parentFold)}</small></div>
      <div><strong>Metabolite</strong><span class="${safeAttr(row.metaboliteDirection || "unknown")}">${safePublicHtml(metaboliteDirectionLabel)}</span><small>${safePublicHtml(metaboliteFold)}</small></div>
      <div><strong>Clearance</strong><span>${safePublicHtml(row.clearancePathway || "not modeled")}</span><small>${safePublicHtml(row.clearanceDirection || "unknown")}</small></div>
    </div>
    ${reasonsBlock}
    ${relatedButton ? `<div class="supporting-actions">${relatedButton}</div>` : ""}
    <div class="finding-meta">
      <span class="finding-tag type">parent-metabolite model</span>
      <span class="finding-tag">confidence: ${safePublicHtml(row.confidence || "unknown")}</span>
      <span class="finding-tag ${row.reviewRequired ? "warn" : "review"}">${row.reviewRequired ? "source context" : "source-linked"}</span>
      <span class="finding-tag">${safeHtml(evidence)}</span>
    </div>
  </div>`;
}
