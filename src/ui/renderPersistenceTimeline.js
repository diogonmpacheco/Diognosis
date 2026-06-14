// MedCheck Engine — Persistence & Washout timeline renderer

function renderPersistenceTimeline() {
  const section = document.getElementById("persistenceTimelineSection");
  const body = document.getElementById("persistenceTimelineBody");
  const count = document.getElementById("persistenceTimelineCount");
  if (!section || !body) return [];
  if (!activeStack.length || typeof computePersistenceTimeline !== "function") {
    hideSectionAndClear("persistenceTimelineSection", "persistenceTimelineBody", "persistenceTimelineCount");
    return [];
  }
  const rows = computePersistenceTimeline(activeStack, activeGenotype || {});
  section.style.display = "";
  if (count) count.textContent = rows.length ? `${rows.length} row${rows.length === 1 ? "" : "s"}` : "";
  if (!rows.length) {
    body.innerHTML = '<div class="finding-empty">No persistence model rows are available for this stack yet.</div>';
    return rows;
  }
  const summary = classifyPersistenceRisk(rows);
  body.innerHTML = `<div class="persistence-intro">Some risks persist after the parent drug level falls. This timeline separates parent drug, active or toxic metabolites, washout rules, and enzyme recovery where data exists.</div>` +
    renderPersistenceSummary(summary) +
    `<div class="persistence-grid">${rows.slice(0, 18).map(renderPersistenceRow).join("")}</div>` +
    (rows.length > 18 ? `<div class="persistence-more">Showing 18 of ${rows.length} modeled timeline rows.</div>` : "");
  return rows;
}

function renderPersistenceSummary(summary) {
  return `<div class="persistence-summary">
    <div><strong>${safeHtml(summary.maxDays == null ? "Unknown" : formatPersistenceDays(summary.maxDays))}</strong><span>longest modeled window</span></div>
    <div><strong>${safeHtml(String(summary.washoutCount || 0))}</strong><span>washout/recovery rows</span></div>
    <div><strong>${safeHtml(String(summary.unknownCount || 0))}</strong><span>unknown durations</span></div>
  </div>`;
}

function renderPersistenceRow(row) {
  const type = safeChoice(row.persistenceType, ["parent","metabolite","enzyme_recovery","induction_offset","washout_rule"], "parent");
  const label = PERSISTENCE_TYPE_LABELS[type] || type.replace(/_/g, " ");
  const windowClass = safeChoice(row.riskWindow, ["hours","days","weeks","unknown"], "unknown");
  const duration = Number.isFinite(row.estimatedPersistenceDays)
    ? formatPersistenceDays(row.estimatedPersistenceDays)
    : "unknown";
  const reasons = (row.reasons || []).slice(0, 3).map(reason => `<li>${safeHtml(reason)}</li>`).join("");
  const pathway = row.pathway ? `<span class="finding-tag">${safeHtml(row.pathway.replace(/_/g, " "))}</span>` : "";
  const onset = row.onset ? `<span class="finding-tag">onset: ${safeHtml(row.onset.replace(/_/g, " "))}</span>` : "";
  const offset = row.offset ? `<span class="finding-tag">offset: ${safeHtml(row.offset.replace(/_/g, " "))}</span>` : "";
  return `<div class="persistence-card ${windowClass}">
    <div class="persistence-head">
      <div>
        <div class="persistence-title">${safeHtml(row.actor)}</div>
        <div class="persistence-subtitle">${safeHtml(row.actor === row.parent ? "parent substance" : `from ${row.parent}`)}</div>
      </div>
      <span class="persistence-window ${windowClass}">${safeHtml(windowClass)}</span>
    </div>
    <div class="persistence-duration">${safeHtml(duration)}</div>
    <div class="persistence-meta-line">${safeHtml(label)} · ${safeHtml((row.actorType || "actor").replace(/_/g, " "))}</div>
    ${reasons ? `<ul class="active-moiety-reasons">${reasons}</ul>` : ""}
    <div class="finding-meta">
      <span class="finding-tag type">${safeHtml(label)}</span>
      ${pathway}
      ${onset}
      ${offset}
      <span class="finding-tag">confidence: ${safeHtml(row.confidence || "unknown")}</span>
      <span class="finding-tag warn">${row.reviewRequired ? "needs review" : "reviewed"}</span>
      <span class="finding-tag">${(row.evidenceRefs || []).length ? `${row.evidenceRefs.length} evidence ref${row.evidenceRefs.length === 1 ? "" : "s"}` : "inferred/review required"}</span>
    </div>
  </div>`;
}
