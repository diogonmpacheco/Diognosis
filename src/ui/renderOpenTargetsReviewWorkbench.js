// MedCheck Engine — generated review workbench
// Pulls local generated governance queues into one reviewer-facing surface.

let reviewWorkbenchHandlersBound = false;
const REVIEW_WORKBENCH_KINDS = ["internal", "first_target", "pgx", "promotion"];
const REVIEW_WORKBENCH_FILTERS = ["all", ...REVIEW_WORKBENCH_KINDS];

function getEvidenceReviewQueue() {
  if (typeof GENERATED_EVIDENCE_REVIEW_QUEUE !== "undefined") return GENERATED_EVIDENCE_REVIEW_QUEUE;
  return [];
}

function getOpenTargetsReviewTargets() {
  if (typeof GENERATED_OPEN_TARGETS_REVIEW_TARGETS !== "undefined") return GENERATED_OPEN_TARGETS_REVIEW_TARGETS;
  return [];
}

function getOpenTargetsPgxGapRoadmap() {
  if (typeof GENERATED_OPEN_TARGETS_PGX_GAP_ROADMAP !== "undefined") return GENERATED_OPEN_TARGETS_PGX_GAP_ROADMAP;
  return { pairs:[], unsupportedGenes:[] };
}

function getOpenTargetsPgxGapSummary() {
  if (typeof OPEN_TARGETS_PGX_GAP_ROADMAP_SUMMARY !== "undefined") return OPEN_TARGETS_PGX_GAP_ROADMAP_SUMMARY;
  return null;
}

function renderReviewWorkbench(overrides = {}) {
  const section = document.getElementById("reviewWorkbenchSection");
  const body = document.getElementById("reviewWorkbenchBody");
  const count = document.getElementById("reviewWorkbenchCount");
  if (!body) return;

  if (activeStack.length < 1) {
    hideSectionAndClear("reviewWorkbenchSection", "reviewWorkbenchBody", "reviewWorkbenchCount");
    return;
  }

  const model = buildReviewWorkbenchModel(activeStack, overrides);
  if (!model.rows.length) {
    hideSectionAndClear("reviewWorkbenchSection", "reviewWorkbenchBody", "reviewWorkbenchCount");
    return;
  }

  bindReviewWorkbenchHandlers();
  if (section) section.style.display = "";
  if (count) {
    count.textContent = `${model.rows.length} review row${model.rows.length === 1 ? "" : "s"} · ${model.stackMatchedRows} stack-matched · non-scoring context`;
  }

  body.innerHTML = `
    <div class="review-workbench-notice">
      Professional review queue, Open Targets promotion queue, and ClinPGx gap roadmap. Rows marked external remain context-only and do not change warning severity.
    </div>
    <div class="review-workbench-summary">
      ${renderReviewWorkbenchTile("Internal evidence", model.summary.internalRows, `${model.summary.calculationBearingRows} calculation-bearing`)}
      ${renderReviewWorkbenchTile("First targets", model.summary.firstTargets, `${model.summary.linkedRows} linked rows`)}
      ${renderReviewWorkbenchTile("PGx roadmap", model.summary.pgxPairs, `${model.summary.unsupportedPgxPairs} unsupported`)}
      ${renderReviewWorkbenchTile("Promotion queue", model.summary.promotionRows, `${model.summary.promotionLinked} linked · ${model.summary.promotionCandidates} candidates`)}
    </div>
    <div class="review-workbench-filter" data-review-workbench-filter-wrap="true">
      ${renderReviewWorkbenchFilter("all", "All", model.rows.length, true)}
      ${renderReviewWorkbenchFilter("internal", "Evidence", model.summary.internalRows)}
      ${renderReviewWorkbenchFilter("first_target", "Targets", model.summary.firstTargets)}
      ${renderReviewWorkbenchFilter("pgx", "PGx", model.summary.pgxPairs)}
      ${renderReviewWorkbenchFilter("promotion", "Open Targets", model.summary.promotionRows)}
    </div>
    <div class="review-workbench-list">
      ${model.rows.map(renderReviewWorkbenchRow).join("")}
    </div>
  `;
}

function buildReviewWorkbenchModel(stack = activeStack, overrides = {}) {
  const snapshot = overrides.snapshot || (typeof getOpenTargetsSnapshot === "function" ? getOpenTargetsSnapshot() : null);
  const evidenceQueue = overrides.evidenceQueue || getEvidenceReviewQueue();
  const promotionQueue = overrides.promotionQueue || getOpenTargetsPromotionQueue();
  const reviewTargets = overrides.reviewTargets || getOpenTargetsReviewTargets();
  const pgxRoadmap = overrides.pgxRoadmap || getOpenTargetsPgxGapRoadmap();
  const keys = buildReviewWorkbenchStackKeys(stack, snapshot);

  const internalRows = evidenceQueue
    .filter(row => isReviewWorkbenchEvidenceRelevant(row, keys))
    .sort(sortReviewWorkbenchPriority)
    .slice(0, 8)
    .map(row => normalizeReviewWorkbenchEvidenceRow(row, true));

  const firstTargetRows = reviewTargets
    .filter(row => isReviewWorkbenchOpenTargetsRelevant(row, keys))
    .sort((a, b) => (b.linkedContextRowCount || 0) - (a.linkedContextRowCount || 0) || safeText(a.medcheckName).localeCompare(safeText(b.medcheckName)))
    .map(row => normalizeReviewWorkbenchFirstTargetRow(row, true));

  const pgxRows = (pgxRoadmap.pairs || [])
    .filter(row => isReviewWorkbenchOpenTargetsRelevant(row, keys))
    .sort(sortReviewWorkbenchPgx)
    .slice(0, 14)
    .map(row => normalizeReviewWorkbenchPgxRow(row, true));

  const promotionRows = promotionQueue
    .filter(row => isReviewWorkbenchOpenTargetsRelevant(row, keys))
    .sort(sortReviewWorkbenchPriority)
    .slice(0, 14)
    .map(row => normalizeReviewWorkbenchPromotionRow(row, true));

  const stackMatchedRows = [
    ...internalRows,
    ...firstTargetRows,
    ...pgxRows,
    ...promotionRows,
  ];

  const fallbackRows = stackMatchedRows.length ? [] : [
    ...evidenceQueue.slice().sort(sortReviewWorkbenchPriority).slice(0, 4).map(row => normalizeReviewWorkbenchEvidenceRow(row, false)),
    ...reviewTargets.slice(0, 5).map(row => normalizeReviewWorkbenchFirstTargetRow(row, false)),
  ];

  const rows = [...stackMatchedRows, ...fallbackRows];
  return {
    rows,
    stackMatchedRows: stackMatchedRows.length,
    summary: {
      internalRows: internalRows.length || fallbackRows.filter(row => row.kind === "internal").length,
      calculationBearingRows: rows.filter(row => row.kind === "internal" && row.calculationBearing).length,
      firstTargets: firstTargetRows.length || fallbackRows.filter(row => row.kind === "first_target").length,
      linkedRows: firstTargetRows.reduce((sum, row) => sum + (row.raw.linkedContextRowCount || 0), 0),
      pgxPairs: pgxRows.length,
      unsupportedPgxPairs: pgxRows.filter(row => !row.raw.hasGenotypeSelector).length,
      promotionRows: promotionRows.length,
      promotionLinked: promotionRows.filter(row => row.raw.reviewDecision === "linked_to_diognosis_evidence").length,
      promotionCandidates: promotionRows.filter(row => row.raw.reviewDecision === "candidate_for_diognosis_evidence").length,
      pgxRoadmap: getOpenTargetsPgxGapSummary(),
    },
  };
}

function buildReviewWorkbenchStackKeys(stack, snapshot) {
  const activeNames = new Set();
  const activeIds = new Set();
  const chemblIds = new Set();
  for (const name of stack || []) {
    const drug = typeof getStackDrug === "function" ? getStackDrug(name) : getDrug(name);
    [name, drug?.name].filter(Boolean).forEach(value => activeNames.add(normalizeDrugLookupKey(value)));
    [drug?.id].filter(Boolean).forEach(value => activeIds.add(normalizeDrugLookupKey(value)));
  }
  for (const row of snapshot?.crosswalk || []) {
    const names = [row.medcheckName, row.medcheckId].filter(Boolean).map(normalizeDrugLookupKey);
    if (names.some(value => activeNames.has(value) || activeIds.has(value))) {
      if (row.chemblId) chemblIds.add(safeText(row.chemblId));
      if (row.openTargetsDrugId) chemblIds.add(safeText(row.openTargetsDrugId));
    }
  }
  return { activeNames, activeIds, chemblIds };
}

function isReviewWorkbenchEvidenceRelevant(row, keys) {
  const text = JSON.stringify([
    row.id,
    row.title,
    row.source,
    row.priorityReasons,
    row.severeCriticalPairs,
    row.quantifiedEffectKeys,
  ]).toLowerCase();
  return [...keys.activeNames].some(name => name && text.includes(name.replace(/\s+/g, " ")));
}

function isReviewWorkbenchOpenTargetsRelevant(row, keys) {
  if (row.chemblId && keys.chemblIds.has(safeText(row.chemblId))) return true;
  if (row.openTargetsDrugId && keys.chemblIds.has(safeText(row.openTargetsDrugId))) return true;
  const names = [
    row.medcheckName,
    ...(row.medcheckNames || []),
  ].filter(Boolean).map(normalizeDrugLookupKey);
  return names.some(name => keys.activeNames.has(name) || keys.activeIds.has(name));
}

function sortReviewWorkbenchPriority(a, b) {
  return (b.priorityScore || 0) - (a.priorityScore || 0) || safeText(a.id).localeCompare(safeText(b.id));
}

function sortReviewWorkbenchPgx(a, b) {
  const aUnsupported = a.hasGenotypeSelector ? 0 : 1;
  const bUnsupported = b.hasGenotypeSelector ? 0 : 1;
  return bUnsupported - aUnsupported ||
    Number(Boolean(b.highEvidence)) - Number(Boolean(a.highEvidence)) ||
    safeText(a.medcheckName).localeCompare(safeText(b.medcheckName)) ||
    safeText(a.gene).localeCompare(safeText(b.gene));
}

function normalizeReviewWorkbenchEvidenceRow(row, stackMatched) {
  const severePairs = row.severeCriticalPairs || [];
  return {
    kind: "internal",
    stackMatched,
    title: row.title || row.id || "Evidence review row",
    badges: ["Diognosis evidence", row.priorityTier || "review"],
    decision: row.reviewDecision || "unreviewed",
    priority: row.priorityScore || 0,
    meta: [
      row.id ? `ID: ${row.id}` : "",
      row.evidenceType ? `Type: ${row.evidenceType}` : "",
      row.professionalReviewStatus ? `Status: ${row.professionalReviewStatus}` : "",
      row.source ? `Source: ${row.source}` : "",
      row.year ? `Year: ${row.year}` : "",
      row.calculationBearing ? "Calculation-bearing" : "",
      severePairs.length ? `${severePairs.length} severe/critical link${severePairs.length === 1 ? "" : "s"}` : "",
    ].filter(Boolean),
    detail: (row.priorityReasons || []).slice(0, 4).join(", ") || "Pending professional review.",
    raw: row,
    calculationBearing: Boolean(row.calculationBearing),
  };
}

function normalizeReviewWorkbenchFirstTargetRow(row, stackMatched) {
  return {
    kind: "first_target",
    stackMatched,
    title: `${row.medcheckName || row.chemblId || "Open Targets"} / ${(row.genes || []).join(", ") || "review target"}`,
    badges: ["First review target", row.status || "review target"],
    decision: row.disposition || "linked_to_diognosis_evidence",
    priority: row.linkedContextRowCount || 0,
    meta: [
      row.chemblId ? `ChEMBL: ${row.chemblId}` : "",
      row.scenarioId ? `Scenario: ${row.scenarioId}` : "",
      `${row.linkedContextRowCount || 0} linked context row${row.linkedContextRowCount === 1 ? "" : "s"}`,
      (row.evidenceRefs || []).length ? `Evidence refs: ${row.evidenceRefs.join(", ")}` : "",
      row.coverage?.selectorGenes?.length ? `Selector: ${row.coverage.selectorGenes.join(", ")}` : "Selector: no",
      row.coverage?.metaboliteRules?.length ? "Metabolite rule: yes" : "Metabolite rule: no",
      row.coverage?.warningCardGenes?.length ? "Warning card: yes" : "Warning card: no",
    ].filter(Boolean),
    detail: row.evidenceTask || row.currentAssessment || "Linked to Diognosis evidence review.",
    raw: row,
  };
}

function normalizeReviewWorkbenchPgxRow(row, stackMatched) {
  return {
    kind: "pgx",
    stackMatched,
    title: `${row.medcheckName || row.chemblId || "Open Targets"} / ${row.gene || "PGx"}`,
    badges: ["ClinPGx roadmap", row.classification || "context"],
    decision: row.promotionDecision || row.reviewerDisposition || "keep_context",
    priority: row.highEvidence ? 100 : row.hasGenotypeSelector ? 40 : 20,
    meta: [
      row.chemblId ? `ChEMBL: ${row.chemblId}` : "",
      row.evidenceLevel ? `Evidence: ${row.evidenceLevel}` : "",
      row.riskMarker ? `Marker: ${row.riskMarker}` : "",
      row.responseCategory ? `Response: ${row.responseCategory}` : "",
      row.hasGenotypeSelector ? "Selector: yes" : "Selector: no",
      row.hasMetaboliteRule ? "Metabolite rule: yes" : "Metabolite rule: no",
      row.hasWarningCard ? "Warning card: yes" : "Warning card: no",
    ].filter(Boolean),
    detail: row.reviewerRationale || (row.labels || []).join(", ") || "Open Targets PGx context remains non-scoring.",
    raw: row,
  };
}

function normalizeReviewWorkbenchPromotionRow(row, stackMatched) {
  return {
    kind: "promotion",
    stackMatched,
    title: row.label || row.id || "Open Targets context",
    badges: ["Open Targets", formatOpenTargetsDataset(row.dataset || row.openTargetsSourceDataset)],
    decision: row.reviewDecision || "unreviewed",
    priority: row.priorityScore || 0,
    meta: [
      (row.medcheckNames || []).length ? `Drug: ${row.medcheckNames.join(", ")}` : "",
      row.chemblId ? `ChEMBL: ${row.chemblId}` : "",
      row.release ? `Release: ${row.release}` : "",
      row.targetGene ? `Gene: ${row.targetGene}` : "",
      row.sourceEvidenceLevel ? `Evidence: ${row.sourceEvidenceLevel}` : "",
      row.notSeverityBearing !== false ? "Not severity-bearing" : "",
    ].filter(Boolean),
    detail: row.suggestedAction || row.rationale || "Keep as external context unless Diognosis evidence review promotes it.",
    raw: row,
  };
}

function renderReviewWorkbenchTile(label, value, note) {
  return `<div class="review-workbench-tile">
    <div class="review-workbench-num">${safeHtml(value)}</div>
    <div class="review-workbench-label">${safeHtml(label)}</div>
    <div class="review-workbench-note">${safeHtml(note || "")}</div>
  </div>`;
}

function renderReviewWorkbenchFilter(value, label, count, active = false) {
  const filter = safeChoice(value, REVIEW_WORKBENCH_FILTERS, "all");
  return `<button type="button" class="review-workbench-filter-btn${active ? " active" : ""}" data-review-workbench-filter="${safeAttr(filter)}">
    ${safeHtml(label)} <span>${safeHtml(count || 0)}</span>
  </button>`;
}

function renderReviewWorkbenchRow(row) {
  const badges = (row.badges || []).map(badge => `<span class="review-workbench-badge">${safeHtml(formatReviewWorkbenchToken(badge))}</span>`).join("");
  const decision = formatOpenTargetsReviewDecision(row.decision || "unreviewed");
  const kind = safeChoice(row.kind, REVIEW_WORKBENCH_KINDS, "promotion");
  return `<div class="review-workbench-row" data-review-kind="${safeAttr(kind)}" data-stack-matched="${row.stackMatched ? "true" : "false"}">
    <div class="review-workbench-row-head">
      <div class="review-workbench-badges">${badges}</div>
      <span class="external-context-decision">${safeHtml(decision)}</span>
    </div>
    <div class="review-workbench-row-title">${safeHtml(row.title)}</div>
    <div class="review-workbench-row-meta">${safeTextList(row.meta, "<br>")}</div>
    <div class="review-workbench-row-detail">${safeHtml(row.detail)}</div>
  </div>`;
}

function formatReviewWorkbenchToken(value) {
  return safeText(value || "").replace(/_/g, " ");
}

function bindReviewWorkbenchHandlers() {
  if (reviewWorkbenchHandlersBound || typeof document === "undefined") return;
  reviewWorkbenchHandlersBound = true;
  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("[data-review-workbench-filter]");
    if (!button) return;
    const filter = safeChoice(button.getAttribute("data-review-workbench-filter"), REVIEW_WORKBENCH_FILTERS, "all");
    const wrap = button.closest("[data-review-workbench-filter-wrap]");
    if (wrap) {
      wrap.querySelectorAll("[data-review-workbench-filter]").forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
    }
    const body = document.getElementById("reviewWorkbenchBody");
    if (!body) return;
    body.querySelectorAll(".review-workbench-row").forEach(row => {
      const kind = row.getAttribute("data-review-kind");
      row.style.display = filter === "all" || kind === filter ? "" : "none";
    });
  });
}
