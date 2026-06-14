// MedCheck Engine — Parent-Metabolite Balance renderer

function renderActiveMoietyBalance() {
  const section = document.getElementById("activeMoietySection");
  const body = document.getElementById("activeMoietyBody");
  const count = document.getElementById("activeMoietyCount");
  if (!section || !body) return [];
  if (!activeStack.length || typeof computeActiveMoietyBalance !== "function") {
    hideSectionAndClear("activeMoietySection", "activeMoietyBody", "activeMoietyCount");
    return [];
  }
  const rows = computeActiveMoietyBalance(activeStack, activeGenotype || {});
  if (!rows.length) {
    section.style.display = "";
    if (count) count.textContent = "";
    body.innerHTML = '<div class="finding-empty">No parent-metabolite balance rows are modeled for this stack yet.</div>';
    return rows;
  }
  section.style.display = "";
  if (count) count.textContent = `${rows.length} row${rows.length === 1 ? "" : "s"}`;
  body.innerHTML = `<div class="active-moiety-intro">This section separates parent drugs from active, toxic, and inactive metabolites. A gene, inhibitor, inducer, or clearance pathway can move them in different directions.</div>` +
    `<div class="active-moiety-grid">${rows.map(renderActiveMoietyRow).join("")}</div>`;
  return rows;
}

function renderActiveMoietyRow(row) {
  const severity = safeChoice(row.severityHint, ["severe","moderate","monitor","info"], "info");
  const pattern = safeHtml((ACTIVE_MOIETY_PATTERN_LABELS[row.netPattern] || row.netPattern || "review prompt").replace(/_/g, " "));
  const actorType = safeHtml((row.actorType || "metabolite").replace(/_/g, " "));
  const reasons = (row.reasons || []).slice(0, 4).map(reason => `<li>${safeHtml(reason)}</li>`).join("");
  const evidence = (row.evidenceRefs || []).length
    ? `${row.evidenceRefs.length} source ref${row.evidenceRefs.length === 1 ? "" : "s"}`
    : "inferred/review required";
  const parentFold = row.parentFold ? `${Math.round(row.parentFold * 100) / 100}x` : "unknown";
  const metaboliteFold = row.metaboliteFold ? `${Math.round(row.metaboliteFold * 100) / 100}x` : "directional";
  return `<div class="active-moiety-card ${severity}">
    <div class="active-moiety-head">
      <div>
        <div class="active-moiety-title">${safeHtml(row.parent)} -> ${safeHtml(row.actor)}</div>
        <div class="active-moiety-subtitle">${actorType} via ${safeHtml(row.formationPathway || "unknown pathway")}</div>
      </div>
      <span class="finding-sev ${severity}">${safeHtml(severity)}</span>
    </div>
    <div class="active-moiety-pattern">${pattern}</div>
    <div class="active-moiety-directions">
      <div><strong>Parent</strong><span class="${safeAttr(row.parentDirection || "unknown")}">${safeHtml(row.parentDirection || "unknown")}</span><small>${safeHtml(parentFold)}</small></div>
      <div><strong>Metabolite</strong><span class="${safeAttr(row.metaboliteDirection || "unknown")}">${safeHtml(row.metaboliteDirection || "unknown")}</span><small>${safeHtml(metaboliteFold)}</small></div>
      <div><strong>Clearance</strong><span>${safeHtml(row.clearancePathway || "not modeled")}</span><small>${safeHtml(row.clearanceDirection || "unknown")}</small></div>
    </div>
    ${reasons ? `<ul class="active-moiety-reasons">${reasons}</ul>` : ""}
    <div class="finding-meta">
      <span class="finding-tag type">active moiety engine</span>
      <span class="finding-tag">confidence: ${safeHtml(row.confidence || "unknown")}</span>
      <span class="finding-tag ${row.reviewRequired ? "warn" : "review"}">${row.reviewRequired ? "needs review" : "reviewed"}</span>
      <span class="finding-tag">${safeHtml(evidence)}</span>
    </div>
  </div>`;
}
