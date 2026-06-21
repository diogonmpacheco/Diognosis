// Diognosis — Current Pathway Status renderer

function renderPhenoconversionDashboard() {
  const section = document.getElementById("phenoconversionSection");
  const body = document.getElementById("phenoconversionBody");
  const count = document.getElementById("phenoconversionCount");
  if (!section || !body) return [];
  if (!activeStack.length || typeof computePhenoconversionState !== "function") {
    hideSectionAndClear("phenoconversionSection", "phenoconversionBody", "phenoconversionCount");
    return [];
  }
  const rows = typeof getRenderComputationCache === "function"
    ? getRenderComputationCache().phenoconversionRows
    : computePhenoconversionState(activeStack, activeGenotype || {});
  if (!rows.length) {
    section.style.display = "";
    if (count) count.textContent = "";
    body.innerHTML = '<div class="finding-empty">No functional gene status rows are modeled for this stack yet.</div>';
    return rows;
  }
  const changedRows = rows.filter(row => classifyPhenoconversionDisplayGroup(row) === "changed");
  const normalRows = rows.filter(row => classifyPhenoconversionDisplayGroup(row) === "normal_relevant");
  section.style.display = "";
  if (count) {
    const label = `${changedRows.length} changed${normalRows.length ? ` · ${normalRows.length} baseline` : ""}`;
    count.textContent = label;
  }
  const changedHtml = changedRows.length
    ? `<div class="phenoconversion-grid">${changedRows.map(renderPhenoconversionRow).join("")}</div>`
    : '<div class="finding-empty">No major functional pathway change is modeled for this stack.</div>';
  const normalHtml = normalRows.length ? `<details class="phenoconversion-normal-group">
      <summary>Relevant pathways currently near baseline (${normalRows.length})</summary>
      <div class="phenoconversion-intro">These genes/pathways are relevant to the selected stack, but no major functional change is currently modeled.</div>
      <div class="phenoconversion-grid normal-relevant">${normalRows.map(renderPhenoconversionRow).join("")}</div>
    </details>` : "";
  body.innerHTML = `<div class="phenoconversion-intro">Genetic phenotype is inherited. Functional phenotype is what the pathway may behave like after current inhibitors, inducers, and competing substrates are considered.</div>` +
    `<div class="phenoconversion-group-label">Changed functional status</div>` +
    changedHtml +
    normalHtml;
  return rows;
}

function renderPhenoconversionRow(row) {
  const functional = PHENOCONVERSION_LABELS[row.functionalPhenotype] || row.functionalPhenotype || "unknown";
  const direction = safeChoice(row.direction, ["reduced","increased","normal","unknown"], "unknown");
  const drivers = (row.drivers || []).slice(0, 5).map(driver =>
    `<span class="finding-tag">${safePublicHtml(driver.actor)} ${safePublicHtml(driver.type.replace(/_/g, " "))}${driver.strength ? `: ${safePublicHtml(driver.strength)}` : ""}</span>`
  ).join("");
  const parents = (row.affectedParents || []).slice(0, 5).map(name => `<span class="finding-actor">${safePublicHtml(name)}</span>`).join("");
  const metaboliteNames = (row.affectedMetabolites || []).filter(name => !isSyntheticContextName(name));
  const metabolites = metaboliteNames.slice(0, 5).map(name => `<span class="finding-actor">${safePublicHtml(name)}</span>`).join("");
  const consequences = (row.activeMoietyConsequences || [])
    .filter(item => !isSyntheticContextName(item))
    .slice(0, 3)
    .map(item => `<li>${safePublicHtml(item)}</li>`)
    .join("");
  const relatedButton = typeof renderRelatedFindingButton === "function"
    ? renderRelatedFindingButton({
        terms:[row.enzyme, functional, ...(row.affectedParents || []), ...(row.affectedMetabolites || []), ...(row.activeMoietyConsequences || [])],
        evidenceRefs:row.evidenceRefs || [],
      }, "Open finding")
    : "";
  return `<div class="phenoconversion-card supporting-context-row ${direction}">
    <div class="phenoconversion-head">
      <div>
        <div class="phenoconversion-gene">${safePublicHtml(row.enzyme)}</div>
        <div class="phenoconversion-subtitle">genetic: ${safePublicHtml(String(row.geneticPhenotype || "normal").replace(/_/g, " "))}</div>
      </div>
      <div class="phenoconversion-capacity">${safePublicHtml(String(row.capacityPct))}%</div>
    </div>
    <div class="phenoconversion-state">${safePublicHtml(functional)}</div>
    <div class="phenoconversion-drivers">${drivers || '<span class="finding-tag">no current drivers</span>'}</div>
    ${parents ? `<div class="finding-actors"><strong>Affected parents</strong>${parents}</div>` : ""}
    ${metabolites ? `<div class="finding-actors"><strong>Affected metabolites</strong>${metabolites}</div>` : ""}
    ${consequences ? `<ul class="active-moiety-reasons">${consequences}</ul>` : ""}
    ${relatedButton ? `<div class="supporting-actions">${relatedButton}</div>` : ""}
    <div class="finding-meta">
      <span class="finding-tag type">functional gene status</span>
      <span class="finding-tag">confidence: ${safePublicHtml(row.confidence || "unknown")}</span>
      <span class="finding-tag warn">source context</span>
      <span class="finding-tag">${(row.evidenceRefs || []).length ? `${row.evidenceRefs.length} source refs` : "inferred/review required"}</span>
    </div>
  </div>`;
}
