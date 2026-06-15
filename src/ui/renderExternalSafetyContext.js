// MedCheck Engine — external safety context cards

let externalSafetyContextHandlersBound = false;

function getOpenTargetsSnapshot(snapshot = null) {
  if (snapshot) return snapshot;
  if (typeof GENERATED_OPEN_TARGETS_SNAPSHOT !== "undefined") return GENERATED_OPEN_TARGETS_SNAPSHOT;
  return null;
}

function getOpenTargetsPromotionQueue() {
  if (typeof GENERATED_OPEN_TARGETS_PROMOTION_QUEUE !== "undefined") return GENERATED_OPEN_TARGETS_PROMOTION_QUEUE;
  return [];
}

function openTargetsFactKey(fact) {
  return [
    fact.chemblId || "",
    fact.openTargetsSourceDataset || fact.factType || "",
    fact.label || "",
  ].map(value => String(value).toLowerCase().replace(/\s+/g, " ").trim()).join("|");
}

function openTargetsPromotionDecisionForFact(fact) {
  const queue = getOpenTargetsPromotionQueue();
  const key = openTargetsFactKey(fact);
  return queue.find(row => row.id === fact.id) || queue.find(row => row.factKey === key) || null;
}

function collectOpenTargetsSafetyContext(stack = activeStack, snapshot = null) {
  const data = getOpenTargetsSnapshot(snapshot);
  if (!data || !Array.isArray(data.crosswalk)) return [];

  const activeKeys = new Set();
  for (const name of stack || []) {
    const drug = typeof getStackDrug === "function" ? getStackDrug(name) : getDrug(name);
    [name, drug?.name, drug?.id].filter(Boolean).forEach(value => {
      activeKeys.add(normalizeDrugLookupKey(value));
    });
  }
  if (!activeKeys.size) return [];

  const rows = data.crosswalk.filter(row =>
    activeKeys.has(normalizeDrugLookupKey(row.medcheckName)) ||
    activeKeys.has(normalizeDrugLookupKey(row.medcheckId))
  );
  const contexts = [];
  const release = data.release || data.summary?.release || null;

  for (const row of rows) {
    if (!row || !row.chemblId) continue;
    if (row.blackBoxWarning === true || (typeof row.blackBoxWarning === "string" && row.blackBoxWarning.trim())) {
      contexts.push(openTargetsCrosswalkFact(row, "black_box_warning", row.blackBoxWarning, release));
    }
    if (row.hasBeenWithdrawn === true || (typeof row.hasBeenWithdrawn === "string" && row.hasBeenWithdrawn.trim())) {
      contexts.push(openTargetsCrosswalkFact(row, "withdrawn_or_discontinued", row.hasBeenWithdrawn, release));
    }
    for (const fact of data.contextByChemblId?.[row.chemblId] || []) {
      contexts.push(normalizeOpenTargetsContextFact(fact, row, release));
    }
  }

  const seen = new Set();
  return contexts.filter(context => {
    const key = context.id || `${context.medcheckId}|${context.chemblId}|${context.openTargetsSourceDataset}|${context.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function openTargetsCrosswalkFact(row, warningType, value, release) {
  const label = value === true
    ? (warningType === "black_box_warning"
      ? "Black-box warning flag reported by Open Targets / ChEMBL"
      : "Withdrawn or discontinued status reported by Open Targets / ChEMBL")
    : value;
  return normalizeOpenTargetsContextFact({
    id: `ot_crosswalk_${row.chemblId}_${warningType}`,
    chemblId: row.chemblId,
    openTargetsDrugId: row.openTargetsDrugId || row.chemblId,
    openTargetsRelease: release,
    openTargetsSourceDataset: "drugWarnings",
    sourceCategory: "open_targets_context",
    importedContextOnly: true,
    notSeverityBearing: true,
    reviewRequired: true,
    reviewDecision: "unreviewed",
    factType: "drugWarnings",
    label,
    warningType,
    source: "Open Targets / ChEMBL",
  }, row, release);
}

function normalizeOpenTargetsContextFact(fact, row, release) {
  const promotionDecision = openTargetsPromotionDecisionForFact(fact);
  return {
    id: safeText(fact.id || ""),
    medcheckId: safeText(row.medcheckId || ""),
    medcheckName: safeText(row.medcheckName || ""),
    chemblId: safeText(fact.chemblId || row.chemblId || ""),
    openTargetsDrugId: safeText(fact.openTargetsDrugId || row.openTargetsDrugId || row.chemblId || ""),
    openTargetsRelease: safeText(fact.openTargetsRelease || release || "not specified"),
    openTargetsSourceDataset: safeText(fact.openTargetsSourceDataset || fact.factType || "Open Targets"),
    sourceCategory: safeText(fact.sourceCategory || "open_targets_context"),
    importedContextOnly: fact.importedContextOnly !== false,
    notSeverityBearing: fact.notSeverityBearing !== false,
    reviewRequired: fact.reviewRequired !== false,
    reviewDecision: safeText(promotionDecision?.reviewDecision || fact.reviewDecision || "unreviewed"),
    promotionDecisionId: safeText(promotionDecision?.decisionId || ""),
    promotionRationale: safeText(promotionDecision?.rationale || ""),
    factType: safeText(fact.factType || fact.openTargetsSourceDataset || "context"),
    label: safeText(fact.label || fact.warningType || fact.factType || "Open Targets context"),
    warningType: safeText(fact.warningType || ""),
    targetGene: safeText(fact.targetGene || ""),
    sourceEvidenceLevel: safeText(fact.sourceEvidenceLevel || ""),
    drugResponseCategory: safeText(fact.drugResponseCategory || ""),
    riskMarker: safeText(fact.riskMarker || ""),
    source: safeText(fact.source || "Open Targets"),
  };
}

function renderExternalSafetyContext(snapshot = null) {
  const section = document.getElementById("externalContextSection");
  const body = document.getElementById("externalContextBody");
  const count = document.getElementById("externalContextCount");
  if (!body) return;

  if (activeStack.length < 1) {
    hideSectionAndClear("externalContextSection", "externalContextBody", "externalContextCount");
    return;
  }

  const contexts = collectOpenTargetsSafetyContext(activeStack, snapshot);
  if (!contexts.length) {
    hideSectionAndClear("externalContextSection", "externalContextBody", "externalContextCount");
    return;
  }

  bindExternalSafetyContextHandlers();
  if (section) section.style.display = "";
  if (count) {
    const release = contexts[0]?.openTargetsRelease || "release not specified";
    count.textContent = `${contexts.length} context card${contexts.length === 1 ? "" : "s"} · not risk-scoring · ${release}`;
  }

  body.innerHTML = `
    <div class="external-context-notice">
      Imported Open Targets / ChEMBL facts are review context. They do not change MedCheck warnings, severity, or calculations unless a Diognosis reviewer promotes the signal through the promotion queue.
    </div>
    <div class="external-context-grid">
      ${contexts.map(renderExternalSafetyContextCard).join("")}
    </div>
  `;
}

function renderExternalSafetyContextCard(context) {
  const typeLabel = formatOpenTargetsDataset(context.openTargetsSourceDataset || context.factType);
  const meta = [
    context.medcheckName ? `Drug: ${context.medcheckName}` : "",
    context.chemblId ? `ChEMBL: ${context.chemblId}` : "",
    context.openTargetsRelease ? `Release: ${context.openTargetsRelease}` : "",
    context.source ? `Source: ${context.source}` : "",
    context.targetGene ? `Target/gene: ${context.targetGene}` : "",
    context.warningType ? `Warning type: ${context.warningType}` : "",
    context.sourceEvidenceLevel ? `Evidence level: ${context.sourceEvidenceLevel}` : "",
    context.drugResponseCategory ? `Response: ${context.drugResponseCategory}` : "",
    context.riskMarker ? `Risk marker: ${context.riskMarker}` : "",
  ].filter(Boolean);
  const reviewHref = safeUrl(buildExternalSafetyContextReviewUrl(context));
  const contextNote = `Context only · reviewRequired:${Boolean(context.reviewRequired)} · importedContextOnly:${Boolean(context.importedContextOnly)} · notSeverityBearing:${Boolean(context.notSeverityBearing)}`;
  const reviewDecision = formatOpenTargetsReviewDecision(context.reviewDecision);
  const actionHint = actionHintForOpenTargetsDataset(context.openTargetsSourceDataset || context.factType);
  const rationale = context.promotionRationale ? `Review rationale: ${context.promotionRationale}` : "";

  return `<div class="external-context-card" data-source-category="open_targets_context">
    <div class="external-context-head">
      <span class="ev-review-badge needs-review">needs Diognosis review</span>
      <span class="external-context-type">${safeHtml(typeLabel)}</span>
      <span class="external-context-decision">${safeHtml(reviewDecision)}</span>
    </div>
    <div class="external-context-title">${safeHtml(context.label)}</div>
    <div class="external-context-meta">${safeTextList(meta, "<br>")}</div>
    <div class="external-context-note">${safeHtml(contextNote)}</div>
    <div class="external-context-action">${safeHtml(actionHint)}</div>
    ${rationale ? `<div class="external-context-action">${safeHtml(rationale)}</div>` : ""}
    <div class="feedback-row"><a class="feedback-link external-context-report" data-external-context-report="true" href="${safeAttr(reviewHref)}" target="_blank" rel="noopener">Suggest context review</a></div>
  </div>`;
}

function formatOpenTargetsDataset(value) {
  const key = safeText(value || "context");
  const labels = {
    drugWarnings: "Drug warning",
    faersSignificant: "FAERS context",
    pharmacogenetics: "ClinPGx / PGx",
    targetSafety: "Target safety",
    black_box_warning: "Black-box flag",
    withdrawn_or_discontinued: "Withdrawal status",
  };
  return labels[key] || key.replace(/_/g, " ");
}

function formatOpenTargetsReviewDecision(value) {
  const key = safeText(value || "unreviewed");
  const labels = {
    unreviewed: "unreviewed",
    keep_context: "keep context",
    rejected: "rejected",
    candidate_for_diognosis_evidence: "evidence candidate",
    linked_to_diognosis_evidence: "linked evidence",
    promoted_for_severity: "promoted",
  };
  return labels[key] || key.replace(/_/g, " ");
}

function actionHintForOpenTargetsDataset(value) {
  const key = safeText(value || "context");
  if (key === "drugWarnings") return "Review label source before promotion.";
  if (key === "pharmacogenetics") return "Compare with genotype selector, metabolite rule, and warning card coverage.";
  if (key === "targetSafety") return "Use as mechanistic review context unless linked to reviewed evidence.";
  if (key === "faersSignificant") return "Treat FAERS signal as context because confounding is unresolved.";
  return "Keep non-scoring unless reviewed and promoted.";
}

function buildExternalSafetyContextReviewUrl(context) {
  const details = [
    "External safety context card:",
    `Drug: ${context.medcheckName || "not specified"}`,
    `ChEMBL/Open Targets ID: ${context.chemblId || context.openTargetsDrugId || "not specified"}`,
    `Dataset: ${context.openTargetsSourceDataset || "not specified"}`,
    `Release: ${context.openTargetsRelease || "not specified"}`,
    `Source: ${context.source || "Open Targets"}`,
    `Warning type: ${context.warningType || "not specified"}`,
    `Target/gene: ${context.targetGene || "not specified"}`,
    `Evidence level: ${context.sourceEvidenceLevel || "not specified"}`,
    `Label/context: ${context.label || "not specified"}`,
    "",
    "Review decision requested: keep as context, reject, or promote only after Diognosis clinical/data review.",
  ].join("\n");
  return buildMedCheckIssueUrl({
    type: "data",
    title: `[External context review]: ${context.medcheckName || context.chemblId || "Open Targets"}`,
    focus: `Open Targets context ${context.id || context.chemblId || ""}`,
    details,
  });
}

function bindExternalSafetyContextHandlers() {
  if (externalSafetyContextHandlersBound || typeof document === "undefined") return;
  externalSafetyContextHandlersBound = true;
  document.addEventListener("click", (event) => {
    const link = event.target?.closest?.("[data-external-context-report]");
    if (!link) return;
    event.stopPropagation();
  });
}
