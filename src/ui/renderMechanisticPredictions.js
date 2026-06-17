// Diognosis — Mechanistic interpretation renderer

function renderMechanisticPredictions() {
  const sec = document.getElementById("mechanisticSection");
  const el = document.getElementById("mechanisticBody");
  const countEl = document.getElementById("mechanisticCount");
  if (!sec || !el) return;

  if (!activeStack.length || typeof getMechanisticPredictions !== "function") {
    hideSectionAndClear("mechanisticSection", "mechanisticBody", "mechanisticCount");
    return;
  }

  const predictions = getMechanisticPredictions(activeStack).filter(p => !p.documented);
  if (!predictions.length) {
    hideSectionAndClear("mechanisticSection", "mechanisticBody", "mechanisticCount");
    return;
  }

  sec.style.display = "";
  if (countEl) countEl.textContent = `${predictions.length} model${predictions.length === 1 ? "" : "s"}`;
  el.innerHTML = `
    <div class="mechanistic-note">
      This section shows modeled pathway read-through from Diognosis enzyme, transporter, genotype, and metabolite data. Confirmed warnings stay in Known Interactions; citations and review status stay in Evidence.
    </div>
    ${predictions.slice(0, 12).map(renderMechanisticPredictionCard).join("")}
    ${predictions.length > 12 ? `<div class="finding-empty">Showing 12 of ${predictions.length} model predictions for readability.</div>` : ""}
  `;
}

function renderMechanisticPredictionCard(prediction) {
  const isGenotype = prediction.kind === "genotype-metabolite";
  const isDocumented = !!prediction.documented;
  const className = MECHANISTIC_SEVERITY_WORDS.test(`${prediction.title} ${prediction.clinicalMeaning} ${prediction.action}`)
    ? "moderate"
    : "mild";
  const estimateText = prediction.estimate && prediction.estimate !== 1
    ? `<span class="finding-tag">~${prediction.estimate}x modeled</span>`
    : "";
  return `<div class="finding-card ${className} mechanistic-card">
    <div class="finding-top">
      <div>
        <div class="finding-title">${safePublicHtml(prediction.title)}</div>
        <div class="finding-subtitle">${safePublicHtml(prediction.subtitle)}</div>
      </div>
      <span class="finding-sev mild">${isDocumented ? "documented" : "experimental"}</span>
    </div>
    <div class="finding-effect">${safePublicHtml(prediction.clinicalMeaning)}</div>
    <div class="finding-grid">
      <div class="finding-detail"><strong>Model</strong>${prediction.kind === "genotype-drug" ? "Genotype plus drug route" : isGenotype ? "Genotype plus metabolite pathway" : "Medication effect on enzyme plus victim route"}</div>
      <div class="finding-detail"><strong>Pathway</strong>${safePublicHtml(prediction.pathway || "modeled pathway")}</div>
      <div class="finding-detail"><strong>Discuss</strong>${safePublicHtml(prediction.action)}</div>
    </div>
    <div class="inter-trace">Path: ${safePublicHtml(prediction.drugs.join(" + "))}${prediction.metabolite ? ` -> ${safePublicHtml(prediction.metabolite)}` : ""} -> ${safePublicHtml(prediction.direction)}</div>
    <div class="finding-meta">
      <span class="finding-tag">${safePublicHtml(prediction.kind)}</span>
      <span class="finding-tag ${isDocumented ? "" : "warn"}">${isDocumented ? "already source-linked" : "no direct study linked"}</span>
      <span class="finding-tag">confidence: ${safePublicHtml(prediction.confidence)}</span>
      ${prediction.curatedSeverity ? `<span class="finding-tag">source-linked severity: ${safePublicHtml(prediction.curatedSeverity)}</span>` : ""}
      ${estimateText}
    </div>
  </div>`;
}
