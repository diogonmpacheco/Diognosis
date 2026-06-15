// Diognosis — compact per-warning why path rendering

function renderWhyPath(path) {
  if (!path?.nodes?.length || !path?.edges?.length) return "";
  const nodeById = new Map(path.nodes.map(node => [node.id, node]));
  const steps = [];
  for (const edge of path.edges.slice(0, 6)) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) continue;
    if (!steps.length) steps.push(`<div class="why-node ${safeAttr(from.type || "actor")}">${safeHtml(from.label)}</div>`);
    steps.push(`<div class="why-edge">${safeHtml(edge.label || edge.type || "affects")}</div>`);
    steps.push(`<div class="why-node ${safeAttr(to.type || "actor")}">${safeHtml(to.label)}</div>`);
  }
  return `<div class="why-path">${steps.join("")}</div>${path.summary ? `<div class="why-summary">${safeHtml(path.summary)}</div>` : ""}`;
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
    const payload = {
      stack: activeStack,
      genotypeState: activeGenotype,
      findingId: finding.id,
      nodes: finding.whyPath.nodes,
      edges: finding.whyPath.edges,
      evidenceRefs: finding.whyPath.evidenceRefs || finding.evidenceRefs || [],
      reviewRequired: finding.whyPath.reviewRequired !== false,
    };
    return `<div class="warning-path-row">
      <div class="warning-path-row-head">
        <div>
          <div class="warning-path-title">${safeHtml(finding.title || finding.id)}</div>
          <div class="warning-path-meta">${safeHtml(finding.source || finding.type || "finding")} · ${safeHtml(finding.severity || "info")}</div>
        </div>
        <button class="mini-btn" onclick="copyWarningPath('${safeAttr(finding.id)}')">Copy path</button>
      </div>
      ${renderWhyPath(finding.whyPath)}
      <pre class="warning-path-json" id="warning-path-json-${safeAttr(finding.id)}">${safeHtml(JSON.stringify(payload, null, 2))}</pre>
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
  return `<div class="mechanism-supporting">
    <div class="mechanism-supporting-title">Grouped supporting signals</div>
    <ul>
      ${shown.map(signal => `<li>
        <span>${safeHtml(signal.label || "Related pathway signal")}</span>
        <small>${safeHtml(signal.sourceStatus || "review prompt")}</small>
      </li>`).join("")}
    </ul>
    ${signals.length > shown.length ? `<div class="mechanism-supporting-more">+${signals.length - shown.length} more raw signal${signals.length - shown.length === 1 ? "" : "s"} in Review</div>` : ""}
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
  body.innerHTML = rows.slice(0, 8).map(finding => `<div class="mechanism-why-row">
    <div class="warning-path-row-head">
      <div>
        <div class="warning-path-title">${safeHtml(finding.title || finding.id)}</div>
        <div class="warning-path-meta">${safeHtml(String(finding.type || "finding").replace(/_/g, " "))} · ${safeHtml(finding.severity || "info")}</div>
      </div>
      <button class="mini-btn" onclick="setTab('review')">Review raw</button>
    </div>
    ${renderWhyPath(finding.whyPath)}
    ${renderMechanismSupportingSignals(finding)}
    <div class="finding-meta">
      <span class="finding-tag type">${safeHtml(String(finding.source || "finding").replace(/_/g, " "))}</span>
      <span class="finding-tag">${safeHtml(finding.evidenceLadder?.mechanisticConfidence || finding.confidence || "unknown")} confidence</span>
      <span class="finding-tag ${finding.reviewRequired ? "warn" : "review"}">${finding.reviewRequired ? "needs review" : "reviewed"}</span>
      ${finding.rawFindingCount ? `<span class="finding-tag">${safeHtml(String(finding.rawFindingCount))} raw signal${finding.rawFindingCount === 1 ? "" : "s"} grouped</span>` : ""}
    </div>
  </div>`).join("") +
    (rows.length > 8 ? `<div class="finding-empty">Showing 8 grouped mechanism paths. Raw warning paths remain available in Review.</div>` : "");
}

function copyWarningPath(findingId) {
  const el = document.getElementById(`warning-path-json-${findingId}`);
  if (!el) return;
  const text = el.textContent || "";
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {});
}
