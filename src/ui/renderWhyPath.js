// Diognosis — compact per-warning why path rendering

function renderWhyPath(path) {
  if (!path?.nodes?.length || !path?.edges?.length) return "";
  const nodeById = new Map(path.nodes.map(node => [node.id, node]));
  const steps = [];
  for (const edge of path.edges.slice(0, 6)) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) continue;
    if (!steps.length) steps.push(`<div class="why-node ${safeAttr(from.type || "actor")}">${safePublicHtml(from.label)}</div>`);
    steps.push(`<div class="why-edge">${safePublicHtml(edge.label || edge.type || "affects")}</div>`);
    steps.push(`<div class="why-node ${safeAttr(to.type || "actor")}">${safePublicHtml(to.label)}</div>`);
  }
  return `<div class="why-path">${steps.join("")}</div>${path.summary ? `<div class="why-summary">${safePublicHtml(path.summary)}</div>` : ""}`;
}

function renderWarningPathReview() {
  const section = document.getElementById("warningPathSection");
  const body = document.getElementById("warningPathBody");
  const count = document.getElementById("warningPathCount");
  if (!section || !body) return;
  const findings = (currentInteractionFindings || []).length
    ? currentInteractionFindings
    : (typeof getRenderComputationCache === "function" ? getRenderComputationCache().findings : []);
  const rows = (findings || []).filter(finding => finding.whyPath);
  if (!rows.length) {
    hideSectionAndClear("warningPathSection", "warningPathBody", "warningPathCount");
    return;
  }
  section.style.display = "";
  if (count) count.textContent = `${rows.length} path${rows.length === 1 ? "" : "s"}`;
  body.innerHTML = rows.slice(0, 12).map(finding => {
      return `<div class="warning-path-row">
        <div class="warning-path-row-head">
          <div>
            <div class="warning-path-title">${safePublicHtml(finding.title || finding.id)}</div>
            <div class="warning-path-meta">${safePublicHtml(finding.source || finding.type || "finding")} · ${safePublicHtml(finding.severity || "info")}</div>
          </div>
          <button class="mini-btn" onclick="copyWarningPath('${safeAttr(finding.id)}')">Copy technical path</button>
        </div>
        ${renderWhyPath(finding.whyPath)}
      </div>`;
    }).join("");
}

function getMechanismWhyPathFindings() {
  const cache = typeof getRenderComputationCache === "function" ? getRenderComputationCache() : {};
  const concerns = (Array.isArray(currentClinicalConcerns) && currentClinicalConcerns.length)
    ? currentClinicalConcerns
    : (cache.clinicalConcerns || []);
  if (concerns.length) return concerns;
  return (currentInteractionFindings || []).length ? currentInteractionFindings : (cache.findings || []);
}

function renderMechanismSupportingSignals(finding) {
  const signals = finding?.supportingSignals || [];
  if (!signals.length) return "";
  const shown = signals.slice(0, 5);
  const extraLocation = typeof isReviewerMode === "function" && isReviewerMode()
    ? "in Review"
    : "across supporting tabs";
  return `<div class="mechanism-supporting">
    <div class="mechanism-supporting-title">Grouped supporting signals</div>
    <ul>
      ${shown.map(signal => `<li>
        <span>${safePublicHtml(signal.label || "Related pathway signal")}</span>
        <small>${safePublicHtml(typeof compactReviewStatus === "function" ? compactReviewStatus(signal.sourceStatus || "modeled support") : signal.sourceStatus || "modeled support")}</small>
      </li>`).join("")}
    </ul>
    ${signals.length > shown.length ? `<div class="mechanism-supporting-more">+${signals.length - shown.length} more supporting signal${signals.length - shown.length === 1 ? "" : "s"} ${safePublicHtml(extraLocation)}</div>` : ""}
  </div>`;
}

function renderMechanismWhyPaths() {
  const section = document.getElementById("mechanismWhySection");
  const body = document.getElementById("mechanismWhyBody");
  const count = document.getElementById("mechanismWhyCount");
  if (!section || !body) return;
  const findings = getMechanismWhyPathFindings();
  const rows = (findings || []).filter(finding => finding.whyPath);
  if (!rows.length) {
    hideSectionAndClear("mechanismWhySection", "mechanismWhyBody", "mechanismWhyCount");
    return;
  }
  section.style.display = "";
  const usesGroupedConcerns = rows.some(finding => finding.type === "clinical_concern");
  if (count) count.textContent = `${rows.length} ${usesGroupedConcerns ? "concern " : ""}path${rows.length === 1 ? "" : "s"}`;
  body.innerHTML = rows.slice(0, 8).map(finding => {
    const rowId = `mechanism-${publicDomToken(finding.id || finding.title || "finding")}`;
    const relatedButton = typeof renderRelatedFindingButton === "function"
      ? renderRelatedFindingButton({ finding }, "Related overview")
      : "";
    const reviewerButton = typeof isReviewerMode === "function" && isReviewerMode()
      ? `<button class="mini-btn" onclick="setTab('review')">Open reviewer panel</button>`
      : "";
    return `<div id="${safeAttr(rowId)}" class="mechanism-why-row supporting-context-row">
    <div class="warning-path-row-head">
      <div>
        <div class="warning-path-title">${safePublicHtml(finding.title || finding.id)}</div>
        <div class="warning-path-meta">${safePublicHtml(String(finding.type || "finding").replace(/_/g, " "))} · ${safePublicHtml(finding.severity || "info")}</div>
      </div>
      <div class="supporting-actions">${relatedButton}${reviewerButton}</div>
    </div>
    ${renderWhyPath(finding.whyPath)}
    ${renderMechanismSupportingSignals(finding)}
    <div class="finding-meta">
      <span class="finding-tag type">${safePublicHtml(String(finding.source || "finding").replace(/_/g, " "))}</span>
      <span class="finding-tag">${safePublicHtml(finding.evidenceLadder?.mechanisticConfidence || finding.confidence || "unknown")} confidence</span>
      <span class="finding-tag ${finding.reviewRequired ? "warn" : "review"}">${finding.reviewRequired ? "review needed" : "reviewed"}</span>
      ${finding.rawFindingCount ? `<span class="finding-tag">${safePublicHtml(String(finding.rawFindingCount))} supporting signal${finding.rawFindingCount === 1 ? "" : "s"} grouped</span>` : ""}
    </div>
  </div>`;
  }).join("") +
    (rows.length > 8 ? `<div class="finding-empty">Showing 8 grouped mechanism paths. Additional supporting paths remain available ${typeof isReviewerMode === "function" && isReviewerMode() ? "in Review" : "across the supporting tabs"}.</div>` : "");
}

function copyWarningPath(findingId) {
  const findings = (currentInteractionFindings || []).length
    ? currentInteractionFindings
    : (typeof getRenderComputationCache === "function" ? getRenderComputationCache().findings : []);
  const finding = (findings || []).find(row => row.id === findingId);
  if (!finding?.whyPath) return;
  const text = JSON.stringify({
    stack: activeStack,
    genotypeState: activeGenotype,
    findingId: finding.id,
    nodes: finding.whyPath.nodes,
    edges: finding.whyPath.edges,
    evidenceRefs: finding.whyPath.evidenceRefs || finding.evidenceRefs || [],
    reviewRequired: finding.whyPath.reviewRequired !== false,
  }, null, 2);
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {});
}
