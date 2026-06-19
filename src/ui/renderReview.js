// Diognosis — Reviewer console summary and diagnostics

function renderReviewSummary() {
  const section = document.getElementById("reviewSummarySection");
  const body = document.getElementById("reviewSummaryBody");
  const count = document.getElementById("reviewSummaryCount");
  if (!section || !body) return [];
  if (typeof isReviewerMode === "function" && !isReviewerMode()) {
    hideSectionAndClear("reviewSummarySection", "reviewSummaryBody", "reviewSummaryCount");
    return [];
  }
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
  section.style.display = "";
  if (count) count.textContent = `${findings.length} finding${findings.length === 1 ? "" : "s"}`;
  body.innerHTML = `${renderV1HandoffSummary()}
  ${renderV1ReadinessPanel()}
  <div class="review-summary-grid">
    ${renderReviewSummaryTile(findings.length, "Findings", "Normalized current-stack findings across all engines.")}
    ${renderReviewSummaryTile(severeCritical.length, "Severe/Critical", "Highest priority rows for professional review.")}
    ${renderReviewSummaryTile(pendingReview.length, "Pending Review", "Rows not marked professionally reviewed.")}
    ${renderReviewSummaryTile(sourceLinked.length, "Source-Linked", "Findings with evidence refs or linked source context.")}
    ${renderReviewSummaryTile(activeMetabolite.length, "Metabolite Involved", "Parent, active, or toxic metabolite reasoning present.")}
    ${renderReviewSummaryTile(genotype.length, "Gene Results", "Genotype or pathway-conversion context present.")}
    ${renderReviewSummaryTile(timing.length, "Timing", "Persistence, washout, recovery, or induction context present.")}
    ${renderReviewSummaryTile(concerns.length, "Clinical Concerns", "Grouped Overview presentation objects.")}
  </div>
  <div class="quality-list">
    <div class="quality-item"><strong>Reviewer console scope:</strong> technical pathway details, evidence review queue, interaction grid, data diagnostics, scenario snapshots, and contribution links are grouped here for auditing.</div>
    ${renderClinicalConcernReviewList(concerns)}
  </div>`;
  return findings;
}

function renderV1HandoffSummary() {
  const text = buildV1HandoffSummaryText();
  const shareUrl = typeof currentStackShareUrl === "function" ? currentStackShareUrl("overview") : "";
  return `<div class="v1-handoff">
    <div class="v1-handoff-title">V1 Handoff Summary</div>
    <div class="v1-handoff-note">Plain-language handoff for the current stack. It preserves the same source-linked and clinical-review boundaries as the finding cards.</div>
    <pre class="v1-handoff-text" id="v1HandoffText">${safePublicHtml(text)}</pre>
    <div class="review-actions">
      <button type="button" class="review-action-btn" onclick="copyV1HandoffSummary()">Copy summary</button>
      ${shareUrl ? `<a class="review-action-btn" href="${safeAttr(shareUrl)}" target="_blank" rel="noopener">Open share link</a>` : ""}
      <span class="review-action-status" id="v1HandoffCopyStatus"></span>
    </div>
  </div>`;
}

function buildV1ReadinessSnapshot(options = {}) {
  const findings = getReviewTabFindings();
  const concerns = getReviewClinicalConcerns(findings);
  const presentations = currentPublicFindingPresentations.length
    ? currentPublicFindingPresentations
    : (typeof buildPublicFindingPresentations === "function" ? buildPublicFindingPresentations(concerns) : []);
  const cache = typeof getRenderComputationCache === "function" ? getRenderComputationCache() : {};
  const scope = typeof buildReviewScopeSummary === "function" ? buildReviewScopeSummary(cache) : null;
  const handoffText = options.handoffText || buildV1HandoffSummaryText({ limit: options.limit || 5 });
  const shareUrl = typeof currentStackShareUrl === "function" ? currentStackShareUrl("overview") : "";
  const sourceLinked = presentations.filter(presentation => presentation.trustContract?.sourceLinked);
  const modeled = presentations.filter(presentation => presentation.trustContract && !presentation.trustContract.sourceLinked);
  const readyContracts = presentations.filter(presentation => {
    const trust = presentation.trustContract || {};
    return trust.ready && !(trust.missingFields || []).length;
  });
  const patientActions = presentations.filter(presentation =>
    presentation.trustContract?.patientAction && presentation.trustContract?.clinicianAction
  );
  const unsafeCertaintyPattern = /\b(?:guaranteed safe|safe to take|this list is safe|no risks?|risk[-\s]?free|clinically validated)\b/i;
  const boundaryText = `${handoffText} ${(scope?.limits || []).join(" ")}`;
  const checks = [
    {
      key:"scope",
      label:"V1 scope",
      ok:!!scope && scope.selectedCount === activeStack.length && Array.isArray(scope.limits) && scope.limits.length >= 2,
      detail:scope ? `${scope.selectedCount} selected, ${scope.recognizedDrugCount + scope.recognizedActorCount} recognized, ${scope.unknownCount} unknown.` : "Scope summary is not available.",
    },
    {
      key:"contracts",
      label:"Finding contracts",
      ok:presentations.length === 0 || readyContracts.length === presentations.length,
      detail:presentations.length
        ? `${readyContracts.length}/${presentations.length} public concern${presentations.length === 1 ? "" : "s"} have complete V1 trust fields.`
        : "No public concern was generated for this stack.",
    },
    {
      key:"sources",
      label:"Source traceability",
      ok:presentations.length === 0 || sourceLinked.length > 0,
      detail:presentations.length
        ? `${sourceLinked.length} source-linked, ${modeled.length} modeled.`
        : "No source-backed concern was needed for an empty concern set.",
    },
    {
      key:"standards",
      label:"Standards identity",
      ok:!!scope?.standardsCoverage,
      detail:scope?.standardsCoverage
        ? `${scope.standardsCoverage.mappedDrugCount}/${scope.standardsCoverage.recognizedDrugCount} recognized medication${scope.standardsCoverage.recognizedDrugCount === 1 ? "" : "s"} mapped to RxNorm; ${scope.standardsCoverage.markerMappingCount} PGx marker row${scope.standardsCoverage.markerMappingCount === 1 ? "" : "s"}.`
        : "Standards coverage summary is not available.",
    },
    {
      key:"actions",
      label:"Action language",
      ok:presentations.length === 0 || patientActions.length === presentations.length,
      detail:presentations.length
        ? `${patientActions.length}/${presentations.length} concern${presentations.length === 1 ? "" : "s"} include patient-safe and clinician-review actions.`
        : "No concern action language is needed.",
    },
    {
      key:"handoff",
      label:"Handoff summary",
      ok:/Diognosis V1 handoff summary|V1 scope|Top concerns|Boundaries/i.test(handoffText),
      detail:"Plain-text handoff includes scope, top concerns, boundaries, and share context.",
    },
    {
      key:"boundaries",
      label:"Clinical boundaries",
      ok:/not medical advice/i.test(handoffText) && /Do not start, stop, or change medication/i.test(handoffText) && !unsafeCertaintyPattern.test(boundaryText),
      detail:"Copy avoids certainty language and keeps medication-change decisions with qualified clinicians.",
    },
    {
      key:"share",
      label:"Shareable state",
      ok:activeStack.length > 0 && shareUrl.includes("substances=") && handoffText.includes(shareUrl),
      detail:shareUrl ? "Current list can be reopened from the generated share link." : "No share link is available.",
    },
    {
      key:"audience",
      label:"Audience mode",
      ok:typeof setAudienceMode === "function" && !!document.getElementById("audience-patient") && !!document.getElementById("audience-clinician"),
      detail:"Patient and Clinician presentation modes are available at the top level.",
    },
  ];
  const passed = checks.filter(check => check.ok).length;
  const ready = activeStack.length > 0 && passed === checks.length;
  return {
    version:"v1-readiness-1",
    ready,
    statusLabel:ready ? "V1-shaped" : "Needs review",
    passed,
    total:checks.length,
    checks,
    scope,
    publicConcernCount:presentations.length,
    sourceLinkedCount:sourceLinked.length,
    modeledCount:modeled.length,
    readyContractCount:readyContracts.length,
    shareUrl,
  };
}

function renderV1ReadinessPanel(snapshot = buildV1ReadinessSnapshot()) {
  const statusClass = snapshot.ready ? "ready" : "needs-review";
  return `<div class="v1-readiness ${statusClass}" id="v1ReadinessPanel" data-ready="${snapshot.ready ? "true" : "false"}">
    <div class="v1-readiness-head">
      <div>
        <div class="v1-readiness-title">V1 Readiness</div>
        <div class="v1-readiness-note">Current-stack product checks. This is not medical validation.</div>
      </div>
      <span class="v1-readiness-status">${safePublicHtml(snapshot.statusLabel)} · ${safePublicHtml(`${snapshot.passed}/${snapshot.total}`)}</span>
    </div>
    <div class="v1-readiness-list">
      ${snapshot.checks.map(check => `<div class="v1-readiness-item ${check.ok ? "ok" : "warn"}">
        <span class="v1-readiness-mark">${check.ok ? "OK" : "Review"}</span>
        <span><strong>${safePublicHtml(check.label)}</strong>${safePublicHtml(check.detail)}</span>
      </div>`).join("")}
    </div>
  </div>`;
}

function buildV1HandoffSummaryText(options = {}) {
  const findings = getReviewTabFindings();
  const concerns = getReviewClinicalConcerns(findings);
  const presentations = currentPublicFindingPresentations.length
    ? currentPublicFindingPresentations
    : (typeof buildPublicFindingPresentations === "function" ? buildPublicFindingPresentations(concerns) : []);
  const cache = typeof getRenderComputationCache === "function" ? getRenderComputationCache() : {};
  const scope = typeof buildReviewScopeSummary === "function" ? buildReviewScopeSummary(cache) : null;
  const shareUrl = typeof currentStackShareUrl === "function" ? currentStackShareUrl("overview") : "";
  const lines = [
    "Diognosis V1 handoff summary",
    `Stack: ${(activeStack || []).join(" + ") || "none selected"}`,
    shareUrl ? `Share link: ${shareUrl}` : "",
    "",
    "V1 scope",
    scope ? `- Selected substances: ${scope.selectedCount}` : "",
    scope ? `- Recognized in local dataset: ${scope.recognizedDrugCount + scope.recognizedActorCount}` : "",
    scope ? `- Selected gene/marker results: ${scope.genotypeCount}` : "",
    scope ? `- Public concerns: ${scope.publicConcernCount} (${scope.sourceLinked} source-linked, ${scope.modeled} modeled)` : "",
    scope?.unknownCount ? `- Unrecognized selections: ${typeof formatScopeUnknownItems === "function" ? formatScopeUnknownItems(scope.unknownItems) : `${scope.unknownCount} item(s)`}` : "",
    scope?.standardsCoverage ? `- Standards identity: ${scope.standardsCoverage.mappedDrugCount}/${scope.standardsCoverage.recognizedDrugCount} recognized medications mapped to RxNorm; ${scope.standardsCoverage.markerMappingCount} PGx marker rows; ${scope.standardsCoverage.pgxActionCount} CPIC-linked action contexts` : "",
    "",
    "Review checklist",
    ...(typeof buildReviewContextChecklist === "function"
      ? buildReviewContextChecklist(scope, { patient:false }).map(item => `- ${item}`)
      : ["- Medication reconciliation, patient context, labs, timing, and source evidence should be reviewed."]),
    "",
    "Top concerns",
    ...buildV1HandoffConcernLines(presentations.slice(0, options.limit || 5)),
    "",
    "Boundaries",
    "- This is a medication-safety review aid, not medical advice, diagnosis, prescribing, or proof of safety.",
    "- Source-linked evidence is traceability; it does not equal professional clinical validation.",
    "- Do not start, stop, or change medication without a qualified doctor or pharmacist.",
    scope?.unknownCount ? `- ${scope.unknownCount} selected item${scope.unknownCount === 1 ? " was" : "s were"} not recognized by the local dataset: ${typeof formatScopeUnknownItems === "function" ? formatScopeUnknownItems(scope.unknownItems) : "unrecognized item"}.` : "- Dose, timing, allergies, diagnoses, labs, pregnancy status, and clinical history are not fully assessed.",
  ].filter(line => line !== "");
  return lines.join("\n");
}

function buildV1HandoffConcernLines(presentations = []) {
  if (!presentations.length) {
    return ["- No major public concern was generated for this stack in the current local dataset."];
  }
  return presentations.flatMap((presentation, index) => {
    const trust = presentation.trustContract || {};
    return [
      `${index + 1}. ${presentation.title || "Clinical concern"} [${presentation.severity || "info"}]`,
      `   Concern: ${trust.clinicalConcern || presentation.whatChanged || "Review current stack context."}`,
      `   Mechanism: ${trust.mechanism || presentation.whyItMatters || "Mechanism needs review."}`,
      `   Evidence/status: ${trust.evidence || presentation.evidenceSummary || "Evidence status unknown"}; ${trust.limitationStatus || "clinical review needed"}`,
      `   Patient-safe next step: ${trust.patientAction || "Review with a doctor or pharmacist before making medication changes."}`,
      `   Clinician review: ${trust.clinicianAction || presentation.whatToReview || "Review dose, timing, source evidence, and clinical context."}`,
      `   Monitoring focus: ${typeof buildFindingMonitoringItems === "function" ? buildFindingMonitoringItems(presentation, trust, { patient:false }).join("; ") : "Review symptoms, dose, timing, labs, organ function, and current medication context."}`,
    ];
  });
}

function copyV1HandoffSummary() {
  const text = buildV1HandoffSummaryText();
  const status = document.getElementById("v1HandoffCopyStatus");
  const done = (message) => {
    if (message === "Copy unavailable") message = "Select summary text";
    if (status) status.textContent = message;
  };
  if (typeof copyTextToClipboard === "function") copyTextToClipboard(text, done);
  else done("Copy unavailable");
}

function getReviewDiagnostics() {
  if (typeof REVIEW_DIAGNOSTICS !== "undefined") return REVIEW_DIAGNOSTICS;
  return { scenarioSnapshots:[], metaboliteCoverageGaps:[] };
}

function renderScenarioSnapshotsReview() {
  const section = document.getElementById("scenarioSnapshotSection");
  const body = document.getElementById("scenarioSnapshotBody");
  const count = document.getElementById("scenarioSnapshotCount");
  if (!section || !body) return;
  const rows = getReviewDiagnostics().scenarioSnapshots || [];
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
      <div class="review-diagnostic-title">${safePublicHtml(row.name)}</div>
      <div class="review-diagnostic-meta">${safePublicHtml((row.stack || []).join(" + "))}${row.genotype?.length ? ` · Gene: ${safePublicHtml(row.genotype.join(", "))}` : ""}</div>
      <div class="review-diagnostic-meta">${safePublicHtml(row.focus || "scenario guard")} · ${safePublicHtml(row.status || "tracked")}</div>
    </div>`;
  }).join("")}</div>`;
}

function renderMetaboliteCoverageGapsReview() {
  const section = document.getElementById("metaboliteGapSection");
  const body = document.getElementById("metaboliteGapBody");
  const count = document.getElementById("metaboliteGapCount");
  if (!section || !body) return;
  const rows = getReviewDiagnostics().metaboliteCoverageGaps || [];
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
      <div class="review-diagnostic-title">${safePublicHtml(row.parent)} -> ${safePublicHtml(publicMetaboliteLabel(row.metabolite, row.parent))}</div>
      <div class="review-diagnostic-meta">${safePublicHtml(row.gene)} · ${safePublicHtml(row.activity)} · ${safePublicHtml(row.priority)}</div>
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
  const dataUrl = buildDiognosisIssueUrl({
    type:"data",
    title:`[Data review]: ${stackText}`,
    focus:`Current stack: ${stackText}`,
    details:"Describe the suspected wrong interaction, missing metabolite, incorrect evidence, or UI issue:",
  });
  const evidenceUrl = buildDiognosisIssueUrl({
    type:"evidence",
    title:`[Evidence suggestion]: ${stackText}`,
    focus:`Evidence suggestion for current stack: ${stackText}`,
    details:"Add PMID, DOI, label URL, or guideline link and what it supports:",
  });
  const scenarioUrl = buildDiognosisIssueUrl({
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
  <div class="review-diagnostic-meta" style="margin-top:8px">These links open privacy-preserving GitHub issue drafts. They do not include your current list, gene settings, share URL, or browser URL unless you intentionally add that context.</div>`;
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
        <div class="review-diagnostic-title">${safePublicHtml(concern.title || concern.id)}</div>
        <div class="review-diagnostic-meta">${safePublicHtml(concern.clinicalConcernDomain || "domain unknown")} · ${safePublicHtml(concern.severity || "info")}</div>
        <div class="review-diagnostic-meta">supporting signals: ${safePublicHtml(String((concern.supportingSignals || []).length))} · grouped details: ${safePublicHtml(String((concern.detailOnlyCount || 0) + (concern.hiddenCount || 0)))}</div>
      </div>`).join("")}
    </div>
  </div>`;
}

function renderReviewSummaryTile(value, label, note) {
  return `<div class="review-summary-tile">
    <div class="review-summary-num">${safePublicHtml(String(value))}</div>
    <div class="review-summary-label">${safePublicHtml(label)}</div>
    <div class="review-summary-note">${safePublicHtml(note)}</div>
  </div>`;
}

function findingInvolves(finding, pattern) {
  return pattern.test(`${finding?.title || ""} ${finding?.summary || ""} ${(finding?.tags || []).join(" ")} ${(finding?.affectedActors || []).map(actor => `${actor.id} ${actor.type} ${actor.direction}`).join(" ")}`);
}
