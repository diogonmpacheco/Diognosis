// Diognosis — Parent-Metabolite Balance renderer

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
    `<div class="active-moiety-grid">${displayRows.map(renderActiveMoietyRow).join("")}</div>`;
  return rows;
}

function renderActiveMoietyRow(row) {
  const severity = safeChoice(row.severityHint, ["severe","moderate","monitor","info"], "info");
  const pattern = safePublicHtml((ACTIVE_MOIETY_PATTERN_LABELS[row.netPattern] || row.netPattern || "review prompt").replace(/_/g, " "));
  const actorType = safePublicHtml((row.actorType || "metabolite").replace(/_/g, " "));
  const reasons = (row.reasons || []).slice(0, 4).map(reason => `<li>${safePublicHtml(reason)}</li>`).join("");
  const evidence = (row.evidenceRefs || []).length
    ? `${row.evidenceRefs.length} source ref${row.evidenceRefs.length === 1 ? "" : "s"}`
    : "inferred/review required";
  const parentFold = row.parentFold ? `${Math.round(row.parentFold * 100) / 100}x` : "unknown";
  const metaboliteDirectionLabel = ACTIVE_MOIETY_DIRECTION_LABELS[row.metaboliteDirection] || row.metaboliteDirection || "unknown";
  const metaboliteFold = row.metaboliteDirection === "risk_context"
    ? "not an exposure increase"
    : (row.metaboliteFold ? `${Math.round(row.metaboliteFold * 100) / 100}x` : "directional");
  return `<div class="active-moiety-card ${severity}">
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
    ${reasons ? `<ul class="active-moiety-reasons">${reasons}</ul>` : ""}
    <div class="finding-meta">
      <span class="finding-tag type">active moiety engine</span>
      <span class="finding-tag">confidence: ${safePublicHtml(row.confidence || "unknown")}</span>
      <span class="finding-tag ${row.reviewRequired ? "warn" : "review"}">${row.reviewRequired ? "needs review" : "reviewed"}</span>
      <span class="finding-tag">${safeHtml(evidence)}</span>
    </div>
  </div>`;
}
