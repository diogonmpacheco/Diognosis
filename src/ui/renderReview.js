// MedCheck Engine — Review tab summary and diagnostics

function renderReviewSummary() {
  const section = document.getElementById("reviewSummarySection");
  const body = document.getElementById("reviewSummaryBody");
  const count = document.getElementById("reviewSummaryCount");
  if (!section || !body) return [];
  if (!activeStack.length) {
    hideSectionAndClear("reviewSummarySection", "reviewSummaryBody", "reviewSummaryCount");
    return [];
  }
  const findings = getReviewTabFindings();
  const concerns = getReviewClinicalConcerns(findings);
  const severeCritical = findings.filter(finding => ["severe", "critical"].includes(finding.severity));
  const pendingReview = findings.filter(finding => finding.reviewRequired !== false || finding.evidenceLadder?.professionalReviewStatus !== "reviewed");
  const sourceLinked = findings.filter(finding => finding.evidenceLadder?.sourceLinked || (finding.evidenceRefs || []).length);
  const activeMetabolite = findings.filter(finding => findingInvolves(finding, /active metabolite|toxic metabolite|active moiety|prodrug|metabolite/i));
  const genotype = findings.filter(finding => findingInvolves(finding, /genotype|phenoconversion|cyp|ugt|dpyd|tpmt|nudt|hla|g6pd/i));
  const timing = findings.filter(finding => finding.type === "timing_washout" || findingInvolves(finding, /washout|persistence|enzyme recovery|induction offset/i));
  const pendingEnrichment = typeof getRenderComputationCache === "function"
    ? getRenderComputationCache().pendingReviewContext
    : null;
  const pendingCore = typeof getRenderComputationCache === "function"
    ? getRenderComputationCache().pendingCoreContext
    : null;
  const pendingCalculation = typeof getRenderComputationCache === "function"
    ? getRenderComputationCache().pendingCalculationContext
    : null;
  const pendingCoreCounts = pendingCore?.counts || {};
  const pendingCalculationCounts = pendingCalculation?.counts || {};
  section.style.display = "";
  if (count) count.textContent = `${findings.length} finding${findings.length === 1 ? "" : "s"}`;
  body.innerHTML = `<div class="review-summary-grid">
    ${renderReviewSummaryTile(findings.length, "Findings", "Normalized current-stack findings across all engines.")}
    ${renderReviewSummaryTile(severeCritical.length, "Severe/Critical", "Highest priority rows for professional review.")}
    ${renderReviewSummaryTile(pendingReview.length, "Pending Review", "Rows not marked professionally reviewed.")}
    ${renderReviewSummaryTile(sourceLinked.length, "Source-Linked", "Findings with evidence refs or linked source context.")}
    ${renderReviewSummaryTile(activeMetabolite.length, "Metabolite Involved", "Parent, active, or toxic metabolite reasoning present.")}
    ${renderReviewSummaryTile(genotype.length, "Gene / PGx", "Genotype or phenoconversion context present.")}
    ${renderReviewSummaryTile(timing.length, "Timing", "Persistence, washout, recovery, or induction context present.")}
    ${renderReviewSummaryTile(pendingEnrichment?.matchedCount || 0, "Pending Enrichment", `${pendingEnrichment?.totalRecords || 0} staged external records available as non-scoring context.`)}
    ${renderReviewSummaryTile(pendingCore?.matchedCount || 0, "Typed Pending Core", `${pendingCore?.totalCandidates || 0} candidates: ${pendingCoreCounts.studyCandidates || 0} evidence, ${pendingCoreCounts.pgxCandidates || 0} PGx, ${pendingCoreCounts.interactionCandidates || 0} interaction.`)}
    ${renderReviewSummaryTile(pendingCalculation?.pendingSignalScore || 0, "Pending Live Score", `${pendingCalculationCounts.evidenceRows || 0} evidence, ${pendingCalculationCounts.pgxSignals || 0} PGx, ${pendingCalculationCounts.pkSignals || 0} PK, ${pendingCalculationCounts.ddiSignals || 0} DDI signals are calculation-visible.`)}
    ${renderReviewSummaryTile(concerns.length, "Clinical Concerns", "Grouped Overview presentation objects.")}
  </div>
  <div class="quality-list">
    <div class="quality-item"><strong>Review scope:</strong> raw warning paths, evidence review queue, interaction grid, data diagnostics, scenario snapshots, and contribution links are grouped here for auditing.</div>
    ${renderPendingCalculationReviewList(pendingCalculation)}
    ${renderPendingCoreReviewList(pendingCore)}
    ${renderClinicalConcernReviewList(concerns)}
  </div>`;
  return findings;
}

function renderPendingCalculationReviewList(context) {
  if (!context || !(context.pendingSignalScore || context.evidenceRows?.length || context.pgxSignals?.length || context.pkSignals?.length || context.ddiSignals?.length)) return "";
  const factors = context.score?.factors || [];
  const rows = [
    `Pending score contribution: +${context.pendingSignalScore || 0} of max ${context.score?.cap || 15}.`,
    `${context.evidenceRows?.length || 0} adapted source-linked evidence rows are resolvable by evidence refs.`,
    `${context.pgxSignals?.length || 0} PGx, ${context.pkSignals?.length || 0} PK, and ${context.ddiSignals?.length || 0} strict DDI pending signals are live in findings.`,
    "Public severity remains locked: pending rows are source-linked, pending review, and not public-severity-bearing.",
    ...factors.slice(0, 4),
  ];
  return `<div class="quality-item"><strong>Pending live calculation:</strong><ul>${rows.map(row => `<li>${safeHtml(row)}</li>`).join("")}</ul></div>`;
}

function renderScenarioSnapshotsReview() {
  const section = document.getElementById("scenarioSnapshotSection");
  const body = document.getElementById("scenarioSnapshotBody");
  const count = document.getElementById("scenarioSnapshotCount");
  if (!section || !body) return;
  const rows = REVIEW_DIAGNOSTICS?.scenarioSnapshots || [];
  if (!rows.length) {
    hideSectionAndClear("scenarioSnapshotSection", "scenarioSnapshotBody", "scenarioSnapshotCount");
    return;
  }
  const activeKeys = new Set(activeStack.map(name => normalizeDrugLookupKey(name)));
  const currentRows = rows.filter(row => (row.stack || []).some(name => activeKeys.has(normalizeDrugLookupKey(name))));
  section.style.display = "";
  if (count) count.textContent = `${rows.length} guarded`;
  body.innerHTML = `<div class="review-diagnostic-grid">${rows.map(row => {
    const isCurrent = currentRows.includes(row);
    return `<div class="review-diagnostic-card ${isCurrent ? "review-diagnostic-current" : ""}">
      <div class="review-diagnostic-title">${safeHtml(row.name)}</div>
      <div class="review-diagnostic-meta">${safeHtml((row.stack || []).join(" + "))}${row.genotype?.length ? ` · PGx: ${safeHtml(row.genotype.join(", "))}` : ""}</div>
      <div class="review-diagnostic-meta">${safeHtml(row.focus || "scenario guard")} · ${safeHtml(row.status || "tracked")}</div>
    </div>`;
  }).join("")}</div>`;
}

function renderMetaboliteCoverageGapsReview() {
  const section = document.getElementById("metaboliteGapSection");
  const body = document.getElementById("metaboliteGapBody");
  const count = document.getElementById("metaboliteGapCount");
  if (!section || !body) return;
  const rows = REVIEW_DIAGNOSTICS?.metaboliteCoverageGaps || [];
  if (!rows.length) {
    hideSectionAndClear("metaboliteGapSection", "metaboliteGapBody", "metaboliteGapCount");
    return;
  }
  const activeKeys = new Set(activeStack.map(name => normalizeDrugLookupKey(name)));
  const currentRows = rows.filter(row => activeKeys.has(normalizeDrugLookupKey(row.parent)));
  const shown = currentRows.length ? currentRows : rows.slice(0, 9);
  section.style.display = "";
  if (count) count.textContent = currentRows.length ? `${currentRows.length} current` : `${rows.length} tracked`;
  body.innerHTML = `<div class="review-diagnostic-grid">${shown.map(row => {
    const isCurrent = currentRows.includes(row);
    return `<div class="review-diagnostic-card ${isCurrent ? "review-diagnostic-current" : ""}">
      <div class="review-diagnostic-title">${safeHtml(row.parent)} -> ${safeHtml(row.metabolite)}</div>
      <div class="review-diagnostic-meta">${safeHtml(row.gene)} · ${safeHtml(row.activity)} · ${safeHtml(row.priority)}</div>
    </div>`;
  }).join("")}</div>`;
}

function renderContributeReview() {
  const section = document.getElementById("contributeSection");
  const body = document.getElementById("contributeBody");
  if (!section || !body) return;
  if (!activeStack.length) {
    hideSectionAndClear("contributeSection", "contributeBody");
    return;
  }
  const stackText = activeStack.join(" + ");
  const dataUrl = buildMedCheckIssueUrl({
    type:"data",
    title:`[Data review]: ${stackText}`,
    focus:`Current stack: ${stackText}`,
    details:"Describe the suspected wrong interaction, missing metabolite, incorrect evidence, or UI issue:",
  });
  const evidenceUrl = buildMedCheckIssueUrl({
    type:"evidence",
    title:`[Evidence suggestion]: ${stackText}`,
    focus:`Evidence suggestion for current stack: ${stackText}`,
    details:"Add PMID, DOI, label URL, or guideline link and what it supports:",
  });
  const scenarioUrl = buildMedCheckIssueUrl({
    type:"scenario",
    title:`[Scenario request]: ${stackText}`,
    focus:`Scenario request for current stack: ${stackText}`,
    details:"Describe the patient/context scenario this stack should guard in regression tests:",
  });
  section.style.display = "";
  body.innerHTML = `<div class="review-actions">
    <a class="review-action-btn" href="${safeAttr(dataUrl)}" target="_blank" rel="noopener">Report data issue</a>
    <a class="review-action-btn" href="${safeAttr(evidenceUrl)}" target="_blank" rel="noopener">Suggest evidence</a>
    <a class="review-action-btn" href="${safeAttr(scenarioUrl)}" target="_blank" rel="noopener">Request scenario</a>
  </div>
  <div class="review-diagnostic-meta" style="margin-top:8px">These links open prefilled GitHub issues for review. They do not send medication data unless opened and submitted.</div>`;
}

function getReviewTabFindings() {
  if (Array.isArray(currentInteractionFindings) && currentInteractionFindings.length) return currentInteractionFindings;
  if (typeof getRenderComputationCache === "function") return getRenderComputationCache().findings || [];
  return typeof buildInteractionFindings === "function"
    ? buildInteractionFindings(activeStack, activeGenotype || {}, { interactions:activeStack.length >= 2 ? calcRisk().interactions : [] })
    : [];
}

function getReviewClinicalConcerns(findings = null) {
  if (Array.isArray(currentClinicalConcerns) && currentClinicalConcerns.length) return currentClinicalConcerns;
  if (typeof getRenderComputationCache === "function") return getRenderComputationCache().clinicalConcerns || [];
  if (typeof buildClinicalConcerns === "function") {
    return buildClinicalConcerns(findings || getReviewTabFindings(), { stack:activeStack, genotypeState:activeGenotype || {} });
  }
  return [];
}

function renderClinicalConcernReviewList(concerns = []) {
  if (!concerns.length) return "";
  return `<div class="quality-item">
    <strong>Clinical Concern Groups:</strong>
    <div class="review-diagnostic-grid" style="margin-top:8px">
      ${concerns.slice(0, 8).map(concern => `<div class="review-diagnostic-card">
        <div class="review-diagnostic-title">${safeHtml(concern.title || concern.id)}</div>
        <div class="review-diagnostic-meta">${safeHtml(concern.clinicalConcernDomain || "domain unknown")} · key: ${safeHtml(concern.clinicalConcernKey || concern.id)}</div>
        <div class="review-diagnostic-meta">primary: ${safeHtml(concern.primaryFindingId || "unknown")} · supporting: ${safeHtml(String((concern.supportingSignals || []).length))} · detail-only: ${safeHtml(String(concern.detailOnlyCount || 0))} · hidden: ${safeHtml(String(concern.hiddenCount || 0))}</div>
        <div class="review-diagnostic-meta">source ids: ${safeHtml((concern.sourceFindings || []).map(row => row.id).slice(0, 5).join(", ") || "none")}</div>
      </div>`).join("")}
    </div>
  </div>`;
}

function renderPendingCoreReviewList(context) {
  if (!context?.totalCandidates) return "";
  const counts = context.counts || {};
  const expanded = context.candidateExpandedCounts || {};
  const rows = [
    ["DRUG_DB", counts.drugCandidates || 0, expanded.drugs],
    ["STUDY_DB", counts.studyCandidates || 0, expanded.evidenceEntries],
    ["KNOWN_DDI", counts.interactionCandidates || 0, expanded.interactionPairs],
    ["METAB", counts.metaboliteCandidates || 0, expanded.metaboliteEntries],
    ["PK", counts.pkCandidates || 0, expanded.pkProfiles],
    ["PGx", counts.pgxCandidates || 0, expanded.genotypeGenes],
    ["Beers", counts.beersCandidates || 0, expanded.beersFlags],
    ["Washout", counts.washoutCandidates || 0, expanded.washoutRules],
  ];
  return `<div class="quality-item">
    <strong>Typed pending core candidates:</strong>
    <div class="review-diagnostic-grid" style="margin-top:8px">
      ${rows.map(([label, pending, expandedCount]) => `<div class="review-diagnostic-card">
        <div class="review-diagnostic-title">${safeHtml(label)}</div>
        <div class="review-diagnostic-meta">${safeHtml(String(pending || 0))} pending candidate${pending === 1 ? "" : "s"}${expandedCount ? ` · ${safeHtml(String(expandedCount))} candidate-expanded` : ""}</div>
      </div>`).join("")}
    </div>
    <div class="review-diagnostic-meta" style="margin-top:6px">These source-linked candidates are visible to the engine as context. They do not change score, public severity, or clinical actions.</div>
  </div>`;
}

function renderReviewSummaryTile(value, label, note) {
  return `<div class="review-summary-tile">
    <div class="review-summary-num">${safeHtml(String(value))}</div>
    <div class="review-summary-label">${safeHtml(label)}</div>
    <div class="review-summary-note">${safeHtml(note)}</div>
  </div>`;
}

function findingInvolves(finding, pattern) {
  return pattern.test(`${finding?.title || ""} ${finding?.summary || ""} ${(finding?.tags || []).join(" ")} ${(finding?.affectedActors || []).map(actor => `${actor.id} ${actor.type} ${actor.direction}`).join(" ")}`);
}
