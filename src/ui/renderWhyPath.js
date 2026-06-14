// MedCheck Engine — compact per-warning why path rendering

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
  const rows = (currentInteractionFindings || []).filter(finding => finding.whyPath);
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

function copyWarningPath(findingId) {
  const el = document.getElementById(`warning-path-json-${findingId}`);
  if (!el) return;
  const text = el.textContent || "";
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {});
}
