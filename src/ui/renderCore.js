// Diognosis — Core app state management and main render loop
// Phase A: modular source — concatenated by build.js

function closeSearchResults(options = {}) {
  const input = document.getElementById("searchInput");
  const results = document.getElementById("searchResults");
  if (input && options.clearInput) input.value = "";
  if (results) {
    results.classList.remove("show");
    results.innerHTML = "";
  }
  if (input && options.blurInput && typeof input.blur === "function") input.blur();
}

function handleSearchKeydown(event) {
  if (!event || event.key !== "Escape") return;
  closeSearchResults({ clearInput:true, blurInput:true });
}

function handleGlobalDismissKeydown(event) {
  if (!event || event.key !== "Escape") return;
  if (viewMode === "browse") {
    event.preventDefault();
    closeBrowsePanel({ focusToggle:true });
    return;
  }
  const results = document.getElementById("searchResults");
  if (results?.classList.contains("show")) {
    event.preventDefault();
    closeSearchResults({ clearInput:true, blurInput:true });
  }
}

function addDrug(name) {
  if (!activeStack.includes(name)) {
    if (!canAddSelection()) return;
    clearSelectionUndoSnapshot();
    activeStack.push(name);
    closeSearchResults({ clearInput:true, blurInput:true });
    renderAll();
  }
}

function removeDrug(name) {
  activeStack = activeStack.filter(n => n !== name);
  setSelectionStatus("");
  delete drugDoses[name];
  closeSearchResults({ clearInput:true, blurInput:true });
  renderAll();
}

function addFoodActor(id) {
  const actor = typeof getSupplementActor === "function" ? getSupplementActor(id) : null;
  const actorId = actor ? actor.id : id;
  if (!activeStack.includes(actorId)) {
    if (!canAddSelection()) return;
    clearSelectionUndoSnapshot();
    activeStack.push(actorId);
    closeSearchResults({ clearInput:true, blurInput:true });
    renderAll();
  }
}

function addUnrecognizedSubstance(value) {
  const name = typeof resolveUrlDrugName === "function"
    ? resolveUrlDrugName(value, { preserveUnknown:true })
    : publicDisplayText(value).slice(0, 80);
  if (!name) return;
  const key = typeof stackSelectionDedupeKey === "function" ? stackSelectionDedupeKey(name) : String(name).toLowerCase();
  const alreadySelected = activeStack.some(item => {
    const itemKey = typeof stackSelectionDedupeKey === "function" ? stackSelectionDedupeKey(item) : String(item).toLowerCase();
    return itemKey === key;
  });
  if (!alreadySelected) {
    if (!canAddSelection()) return;
    clearSelectionUndoSnapshot();
    activeStack.push(name);
  }
  closeSearchResults({ clearInput:true, blurInput:true });
  renderAll();
}

function canAddSelection() {
  if (activeStack.length < INPUT_LIMITS.selectedSubstances) {
    setSelectionStatus("");
    return true;
  }
  setSelectionStatus(`Up to ${INPUT_LIMITS.selectedSubstances} items can be reviewed at once. Remove an item before adding another.`, "warning");
  return false;
}

function setSelectionStatus(message = "", tone = "") {
  const status = document.getElementById("selectionStatus");
  if (!status) return;
  status.textContent = message;
  if (status.dataset) status.dataset.tone = tone;
}

function removeFoodActor(id) {
  const actor = typeof getSupplementActor === "function" ? getSupplementActor(id) : null;
  const actorId = actor ? actor.id : id;
  activeStack = activeStack.filter(n => {
    const selectedActor = typeof getStackSupplementActor === "function" ? getStackSupplementActor(n) : null;
    return (selectedActor ? selectedActor.id : n) !== actorId;
  });
  setSelectionStatus("");
  closeSearchResults({ clearInput:true, blurInput:true });
  renderAll();
}

function swapDrug(oldName, newName) {
  const idx = activeStack.indexOf(oldName);
  if (idx < 0 && !canAddSelection()) return;
  clearSelectionUndoSnapshot();
  if (idx >= 0) activeStack[idx] = newName;
  else activeStack.push(newName);
  renderAll();
}

let viewMode = "search";
let activeTab = "overview";
const PUBLIC_AUDIENCE_MODE = "public";
let audienceMode = PUBLIC_AUDIENCE_MODE;
let currentInteractionFindings = [];
let currentClinicalConcerns = [];
let currentPublicFindingPresentations = [];
let renderComputationCache = null;
let lazyRenderState = { evidenceKey:"", reviewKey:"" };
let manualSectionToggleKeys = {};
let lastClearedSelection = null;
let pendingBrowseFocusDrug = null;
const DIOGNOSIS_TABS = ["overview","mechanisms","genes-metabolites","timing-levels","evidence","review"];

const CLINICAL_CONTEXT_DEFAULTS = Object.freeze({
  regimen:"",
  indications:"",
  timing:"",
  ageBand:"unknown",
  renalFunction:"unknown",
  hepaticFunction:"unknown",
  pregnancyStatus:"unknown",
  symptomsStatus:"unknown",
  labsStatus:"unknown",
  allergiesReviewed:false,
});
let activeClinicalContext = { ...CLINICAL_CONTEXT_DEFAULTS };

const CLINICAL_CONTEXT_SELECT_VALUES = Object.freeze({
  ageBand:["unknown","under18","18-64","65-74","75-plus"],
  renalFunction:["unknown","no-known-impairment","reduced","dialysis"],
  hepaticFunction:["unknown","no-known-impairment","reduced"],
  pregnancyStatus:["unknown","not-applicable","pregnant","breastfeeding"],
  symptomsStatus:["unknown","none-reported","new-or-worsening"],
  labsStatus:["unknown","not-available","reviewed"],
});

function updateClinicalContextField(field, value) {
  if (!Object.prototype.hasOwnProperty.call(CLINICAL_CONTEXT_DEFAULTS, field)) return;
  if (field === "allergiesReviewed") activeClinicalContext[field] = Boolean(value);
  else if (CLINICAL_CONTEXT_SELECT_VALUES[field]) {
    activeClinicalContext[field] = CLINICAL_CONTEXT_SELECT_VALUES[field].includes(value) ? value : "unknown";
  } else {
    activeClinicalContext[field] = safeText(value).slice(0, field === "indications" ? 200 : 240);
  }
  renderClinicalContextPanel();
  renderSummaryBar();
  refreshFindingContextApplicability();
}

function resetClinicalContext() {
  activeClinicalContext = { ...CLINICAL_CONTEXT_DEFAULTS };
  document.querySelectorAll("[data-context-field]").forEach(control => {
    const field = control.dataset.contextField;
    const value = CLINICAL_CONTEXT_DEFAULTS[field];
    if (control.type === "checkbox") control.checked = Boolean(value);
    else control.value = value == null ? "" : String(value);
  });
  renderClinicalContextPanel();
  renderSummaryBar();
  refreshFindingContextApplicability();
}

function getClinicalContextAssessment(context = activeClinicalContext) {
  const checks = [
    [Boolean(context.regimen), "exact regimen"],
    [Boolean(context.indications), "reason for use"],
    [Boolean(context.timing), "timing / recent changes"],
    [context.ageBand !== "unknown", "age range"],
    [context.renalFunction !== "unknown", "kidney function"],
    [context.hepaticFunction !== "unknown", "liver function"],
    [context.pregnancyStatus !== "unknown", "pregnancy / feeding status"],
    [context.symptomsStatus !== "unknown", "current symptoms"],
    [context.labsStatus !== "unknown", "relevant labs"],
    [context.allergiesReviewed === true, "allergies / previous reactions"],
  ];
  const completed = checks.filter(([done]) => done).length;
  const percent = Math.round((completed / checks.length) * 100);
  const missing = checks.filter(([done]) => !done).map(([, label]) => label);
  const level = percent >= 80 ? "substantial" : percent >= 50 ? "partial" : "limited";
  return {
    completed,
    total:checks.length,
    percent,
    missing,
    level,
    preliminary:percent < 80,
    hasNewSymptoms:context.symptomsStatus === "new-or-worsening",
  };
}

function renderClinicalContextPanel() {
  const count = document.getElementById("clinicalContextCount");
  const status = document.getElementById("clinicalContextStatus");
  if (!count || !status) return;
  const assessment = getClinicalContextAssessment();
  count.textContent = `${assessment.percent}%`;
  if (count.dataset) count.dataset.level = assessment.level;
  const missing = assessment.missing.slice(0, 4).join(", ");
  const symptomNote = assessment.hasNewSymptoms
    ? `<strong>New or worsening symptoms selected.</strong> Use prompt professional review; urgent or severe symptoms need urgent local care.`
    : "";
  status.innerHTML = `<strong>${assessment.preliminary ? "Preliminary context" : "Context substantially supplied"}</strong>
    <span>${assessment.preliminary ? `Still missing ${safePublicHtml(missing)}${assessment.missing.length > 4 ? ` and ${assessment.missing.length - 4} more` : ""}.` : "These details qualify relevance but do not turn the result into medical advice."}</span>
    ${symptomNote ? `<span class="context-symptom-note">${symptomNote}</span>` : ""}`;
}

function renderClinicalContextStatus() {
  if (!activeStack.length) return "";
  const assessment = getClinicalContextAssessment();
  const missing = assessment.missing.slice(0, 3).join(", ");
  const label = assessment.preliminary ? "Preliminary review" : "Context supplied";
  const detail = assessment.preliminary
    ? `${assessment.percent}% context complete · missing ${missing}${assessment.missing.length > 3 ? ` +${assessment.missing.length - 3} more` : ""}`
    : `${assessment.percent}% context complete · verify against the actual record`;
  return `<div class="summary-context ${safeAttr(assessment.level)}">
    <span class="summary-context-label">${safePublicHtml(label)}</span>
    <span>${safePublicHtml(detail)}</span>
  </div>`;
}

function clinicalContextHandoffLines() {
  const context = activeClinicalContext || CLINICAL_CONTEXT_DEFAULTS;
  const assessment = getClinicalContextAssessment(context);
  const values = [
    context.regimen ? `Regimen: ${context.regimen}` : "",
    context.indications ? `Reason for use: ${context.indications}` : "",
    context.timing ? `Timing / recent changes: ${context.timing}` : "",
    context.ageBand !== "unknown" ? `Age range: ${clinicalContextValueLabel("ageBand", context.ageBand)}` : "",
    context.renalFunction !== "unknown" ? `Kidney function: ${clinicalContextValueLabel("renalFunction", context.renalFunction)}` : "",
    context.hepaticFunction !== "unknown" ? `Liver function: ${clinicalContextValueLabel("hepaticFunction", context.hepaticFunction)}` : "",
    context.pregnancyStatus !== "unknown" ? `Pregnancy / feeding: ${clinicalContextValueLabel("pregnancyStatus", context.pregnancyStatus)}` : "",
    context.symptomsStatus !== "unknown" ? `Symptoms: ${clinicalContextValueLabel("symptomsStatus", context.symptomsStatus)}` : "",
    context.labsStatus !== "unknown" ? `Labs: ${clinicalContextValueLabel("labsStatus", context.labsStatus)}` : "",
    context.allergiesReviewed ? "Allergies / previous reactions: checked" : "",
  ].filter(Boolean);
  return [
    `Context completeness: ${assessment.percent}% (${assessment.level})`,
    ...values,
    assessment.missing.length ? `Context still missing: ${assessment.missing.join(", ")}` : "",
  ].filter(Boolean);
}

function clinicalContextValueLabel(field, value) {
  const labels = {
    ageBand:{ under18:"under 18", "18-64":"18–64", "65-74":"65–74", "75-plus":"75+" },
    renalFunction:{ "no-known-impairment":"no known impairment", reduced:"reduced", dialysis:"dialysis" },
    hepaticFunction:{ "no-known-impairment":"no known impairment", reduced:"reduced" },
    pregnancyStatus:{ "not-applicable":"not applicable", pregnant:"pregnant / trying", breastfeeding:"breastfeeding" },
    symptomsStatus:{ "none-reported":"none reported", "new-or-worsening":"new or worsening" },
    labsStatus:{ "not-available":"not available", reviewed:"added / reviewed" },
  };
  return labels[field]?.[value] || publicDisplayText(value).replace(/-/g, " ");
}

function clinicalContextApplicability() {
  const assessment = getClinicalContextAssessment();
  if (assessment.level === "substantial") return { label:"Context fit", value:"Substantially assessed", level:assessment.level };
  if (assessment.level === "partial") return { label:"Context fit", value:"Partly assessed", level:assessment.level };
  return { label:"Context fit", value:"Preliminary", level:assessment.level };
}

function refreshFindingContextApplicability() {
  const applicability = clinicalContextApplicability();
  document.querySelectorAll(".finding-context-applicability").forEach(chip => {
    if (chip.dataset.contextFormat === "labelled") {
      chip.innerHTML = `<strong>${safePublicHtml(applicability.label)}</strong>${safePublicHtml(applicability.value)}`;
    } else {
      chip.textContent = `${applicability.label}: ${applicability.value}`;
    }
    chip.dataset.contextLevel = applicability.level;
  });
}

function clearSelectionUndoSnapshot() {
  lastClearedSelection = null;
}

function captureSelectionSnapshot() {
  return {
    stack:[...(activeStack || [])],
    doses:{...(typeof drugDoses !== "undefined" ? drugDoses : {})},
  };
}

function restoreDoseSnapshot(doses = {}) {
  if (typeof drugDoses === "undefined") return;
  Object.keys(drugDoses).forEach(key => delete drugDoses[key]);
  Object.entries(doses || {}).forEach(([key, value]) => {
    drugDoses[key] = value;
  });
}

function clearSelectedList() {
  if (!activeStack.length) return;
  lastClearedSelection = captureSelectionSnapshot();
  activeStack = [];
  restoreDoseSnapshot({});
  closeSearchResults({ clearInput:true, blurInput:true });
  renderAll();
}

function restoreClearedList() {
  if (!lastClearedSelection?.stack?.length) return;
  activeStack = [...lastClearedSelection.stack];
  restoreDoseSnapshot(lastClearedSelection.doses);
  lastClearedSelection = null;
  closeSearchResults({ clearInput:true, blurInput:true });
  renderAll();
  focusReviewNotes();
}

function focusReviewNotes() {
  closeSearchResults({ blurInput:true });
  setTab("overview");
  const runFocus = () => {
    const target = ["summaryBar", "findingSection", "mainEmptyState"]
      .map(id => document.getElementById(id))
      .find(el => el && !el.hidden && el.style.display !== "none");
    if (!target) return;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    if (typeof target.focus === "function") target.focus({ preventScroll:true });
    if (typeof target.scrollIntoView === "function") target.scrollIntoView({ behavior:"smooth", block:"start" });
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(runFocus);
  else runFocus();
}

function keyboardButtonAttrs() {
  return `role="button" tabindex="0" data-keyboard-button="true"`;
}

function activateKeyboardButton(event) {
  if (!event || (event.key !== "Enter" && event.key !== " ")) return;
  event.preventDefault();
  const target = event.target?.closest?.('[data-keyboard-button="true"]') || event.currentTarget;
  target?.click();
}

function syncCollapsibleSectionControls() {
  document.querySelectorAll('.section-title.collapsible[data-action="toggle-section"]').forEach(title => {
    const id = title.dataset.section || "";
    const body = id ? document.getElementById(id + "Body") : null;
    if (!body) return;
    title.setAttribute("role", "button");
    title.setAttribute("tabindex", "0");
    title.setAttribute("data-keyboard-button", "true");
    title.setAttribute("aria-controls", body.id);
    title.setAttribute("aria-expanded", body.classList.contains("open") ? "true" : "false");
  });
}

function handleDelegatedUiClick(event) {
  if (!event?.target?.closest) return;
  if (event.target.closest('[data-stop-propagation="true"], .feedback-link')) event.stopPropagation();
  const control = event.target.closest("[data-action]");
  if (!control) return;
  const action = control.dataset.action || "";
  const value = key => control.dataset[key] || "";
  switch (action) {
    case "set-view-mode": setViewMode(value("mode")); break;
    case "toggle-browse-mode": toggleBrowseMode(); break;
    case "toggle-section": toggleSection(value("section")); break;
    case "add-gene-from-select": addGeneFromSelect(); break;
    case "set-tab": setTab(value("tab")); break;
    case "filter-evidence": filterEvidenceTier(value("tier") || null, control); break;
    case "copy-warning-path": copyWarningPath(value("findingId")); break;
    case "copy-v1-handoff": copyV1HandoffSummary(); break;
    case "set-genotype": setGenotype(value("gene"), value("phenotype")); break;
    case "focus-priority": focusPriorityFinding(value("tab") || "overview", value("target")); break;
    case "apply-pharmgx-import": applyPharmGxImport(); break;
    case "copy-overview": copyOverviewHandoffSummary(); break;
    case "close-search": closeSearchResults({ clearInput:true, blurInput:true }); break;
    case "add-drug": addDrug(value("name")); break;
    case "remove-drug": removeDrug(value("name")); break;
    case "add-food-actor": addFoodActor(value("actorId")); break;
    case "remove-food-actor": removeFoodActor(value("actorId")); break;
    case "add-unrecognized": addUnrecognizedSubstance(value("name")); break;
    case "close-browse": closeBrowsePanel({ focusToggle:true }); break;
    case "toggle-browse-category": toggleBrowseCat(control); break;
    case "toggle-drug": toggleDrug(value("name")); break;
    case "load-class-guide": loadMedicationClassGuide(Number(value("index"))); break;
    case "restore-cleared-list": restoreClearedList(); break;
    case "focus-review-notes": focusReviewNotes(); break;
    case "clear-selected-list": clearSelectedList(); break;
    case "remove-genetics": removeGenetics(value("gene")); break;
    case "reset-clinical-context": resetClinicalContext(); break;
  }
}

function handleDelegatedUiChange(event) {
  const control = event?.target;
  if (!control?.matches) return;
  if (control.matches('[data-action="set-genetics"]')) setGenetics(control.dataset.gene || "", control.value);
  else if (control.matches('[data-action="set-dose-tier"]')) setDoseTier(control.dataset.name || "", control.value);
  else if (control.matches("[data-context-field]")) updateClinicalContextField(control.dataset.contextField, control.type === "checkbox" ? control.checked : control.value);
}

function handleDelegatedUiInput(event) {
  const control = event?.target;
  if (control?.id === "searchInput") onSearch(control.value);
  else if (control?.matches?.('[data-context-field]') && control.type !== "checkbox") {
    updateClinicalContextField(control.dataset.contextField, control.value);
  }
}

function handleDelegatedUiFocus(event) {
  const control = event?.target;
  if (control?.id === "searchInput") onSearch(control.value);
}

function handleDelegatedUiKeydown(event) {
  const control = event?.target;
  if (!control?.closest) return;
  if (control.id === "searchInput") handleSearchKeydown(event);
  else if (control.closest('[role="tab"]')) handleReviewTabKeydown(event);
  else if (control.closest('[data-keyboard-button="true"]')) activateKeyboardButton(event);
}

function clearCurrentFindingState() {
  currentInteractionFindings = [];
  currentClinicalConcerns = [];
  currentPublicFindingPresentations = [];
}

const TAB_ALIASES = {
  safety:"overview",
  summary:"overview",
  overview:"overview",
  pgx:"genes-metabolites",
  genetics:"genes-metabolites",
  "genes-metabolites":"genes-metabolites",
  genes:"genes-metabolites",
  metabolites:"genes-metabolites",
  pk:"timing-levels",
  levels:"timing-levels",
  "timing-levels":"timing-levels",
  network:"mechanisms",
  mechanism:"mechanisms",
  mechanisms:"mechanisms",
  evidence:"evidence",
  advanced:"review",
  contributor:"review",
  contributors:"review",
  review:"review",
};

function resolveTabAlias(name) {
  const raw = String(name || "").trim();
  if (DIOGNOSIS_TABS.includes(raw)) return raw === "review" && !isReviewerMode() ? "overview" : raw;
  const key = raw.toLowerCase();
  const resolved = TAB_ALIASES[key] || "overview";
  return resolved === "review" && !isReviewerMode() ? "overview" : resolved;
}

function setActiveTab(name) {
  activeTab = resolveTabAlias(name);
  return activeTab;
}

function isPatientAudience() {
  return false;
}

function isReviewerParamEnabled(params = {}) {
  return String(params.reviewer || "").trim() === "1";
}

function isReviewerMode() {
  const params = typeof getUrlStateParams === "function" ? getUrlStateParams() : {};
  return isReviewerParamEnabled(params);
}

function setReviewerShellHidden(el, hidden) {
  if (!el) return;
  el.hidden = hidden;
  el.style.display = hidden ? "none" : "";
  el.setAttribute("aria-hidden", hidden ? "true" : "false");
}

function setAudienceMode(mode, options = {}) {
  audienceMode = PUBLIC_AUDIENCE_MODE;
  lazyRenderState = { evidenceKey:"", reviewKey:"" };
  syncAudienceModeUI();
  if (options.render !== false) renderAll();
}

function syncAudienceModeUI() {
  audienceMode = PUBLIC_AUDIENCE_MODE;
  syncMainEmptyStateCopy();
  const tagline = document.getElementById("audienceTagline") || document.querySelector(".header p");
  if (tagline) {
    tagline.textContent = "Medication review with plain questions, mechanisms, timing, genes, and source-linked evidence";
  }
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.placeholder = "Medication, supplement, or food";
  }
  const listTitle = document.getElementById("listTitle");
  if (listTitle) listTitle.textContent = "Medicine List";
  const geneTitle = document.getElementById("geneSectionTitle");
  if (geneTitle) {
    geneTitle.innerHTML = 'Gene / Marker Results <span style="font-size:11px;font-weight:400;color:var(--text2)">(optional)</span>';
  }
  const geneIntro = document.getElementById("geneSectionIntro");
  if (geneIntro) {
    geneIntro.textContent = "Add a real gene or marker result from a report. Leave blank if you do not have one.";
  }
  const findingTitle = document.getElementById("findingTitle");
  if (findingTitle) findingTitle.textContent = "Review Priorities";
}

function syncMainEmptyStateCopy() {
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  setText("mainEmptyTitle", "See what changes — not just what interacts.");
  setText("mainEmptyCopy", "Diognosis follows medicines through genes, enzymes, metabolites, timing, and evidence to surface the signals worth reviewing first.");
  setText("mainEmptyStep3Title", "Start with Review Priorities");
  setText("mainEmptyStep3Copy", "Then inspect mechanism, genes and metabolites, timing, and the source trail.");
  const checks = document.getElementById("mainEmptyChecks");
  if (!checks) return;
  const items = [
    "Priority signals across the full medication list",
    "Parent-drug and metabolite direction, not names alone",
    "Timing, persistence, washout, and exposure context",
    "Evidence status and limits behind every signal",
  ];
  checks.innerHTML = items.map(item => `<div class="main-empty-check">${safePublicHtml(item)}</div>`).join("");
}

function setViewMode(m, options = {}) {
  viewMode = m === "browse" ? "browse" : "search";
  const isBrowse = viewMode === "browse";
  if (document.body) document.body.dataset.addMode = viewMode;
  const searchBtn = document.getElementById("searchModeBtn");
  const browseBtn = document.getElementById("browseModeBtn");
  if (searchBtn) {
    searchBtn.className = "mode-btn" + (!isBrowse ? " active" : "");
    searchBtn.setAttribute("aria-pressed", !isBrowse ? "true" : "false");
  }
  if (browseBtn) {
    browseBtn.className = "mode-btn" + (isBrowse ? " active" : "");
    browseBtn.setAttribute("aria-pressed", isBrowse ? "true" : "false");
    browseBtn.setAttribute("aria-expanded", isBrowse ? "true" : "false");
  }
  const browseWrap = document.getElementById("browseWrap");
  if (browseWrap) browseWrap.className = "browse-wrap" + (isBrowse ? " show" : "");
  if (isBrowse) {
    closeSearchResults({ blurInput:true });
    renderBrowse();
  }
  if (!isBrowse && options.focusSearchInput) {
    const input = document.getElementById("searchInput");
    if (input && typeof input.focus === "function") input.focus();
  }
}

function toggleBrowseMode() {
  setViewMode(viewMode === "browse" ? "search" : "browse");
}

function closeBrowsePanel(options = {}) {
  setViewMode("search");
  if (options.focusToggle) {
    const btn = document.getElementById("browseModeBtn");
    if (btn && typeof btn.focus === "function") btn.focus({ preventScroll:true });
  }
}

function setTab(name) {
  const resolvedTab = setActiveTab(name);
  DIOGNOSIS_TABS.forEach(t => {
    const panel = document.getElementById("tab-" + t);
    const btn = document.getElementById("tabbtn-" + t);
    const reviewerTab = t === "review";
    if (panel) {
      panel.classList.toggle("active", t === resolvedTab);
      panel.setAttribute("aria-hidden", t === resolvedTab ? "false" : "true");
      if (reviewerTab) setReviewerShellHidden(panel, !isReviewerMode());
    }
    if (btn) {
      btn.classList.toggle("active", t === resolvedTab);
      btn.setAttribute("aria-selected", t === resolvedTab ? "true" : "false");
      btn.setAttribute("tabindex", t === resolvedTab ? "0" : "-1");
      if (reviewerTab) setReviewerShellHidden(btn, !isReviewerMode());
    }
  });
  renderLazyTab(resolvedTab);
  updateEmptyTabs();
  syncUrlStateFromSelection(resolvedTab);
}

function handleReviewTabKeydown(event) {
  if (!event || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const buttons = DIOGNOSIS_TABS
    .map(tab => document.getElementById("tabbtn-" + tab))
    .filter(button => button && !button.hidden && button.style.display !== "none");
  if (!buttons.length) return;
  const currentButton = event.target?.closest?.('[role="tab"]') || event.currentTarget;
  const currentIndex = Math.max(0, buttons.indexOf(currentButton));
  let nextIndex = currentIndex;
  if (event.key === "Home") nextIndex = 0;
  else if (event.key === "End") nextIndex = buttons.length - 1;
  else if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % buttons.length;
  else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
  event.preventDefault();
  buttons[nextIndex].focus();
  buttons[nextIndex].click();
}

function focusPriorityFinding(tabName = "overview", elementId = "") {
  const resolvedTab = resolveTabAlias(tabName);
  setTab(resolvedTab);
  const fallbackIds = {
    overview:"findingSection",
    mechanisms:"mechanismWhySection",
    "genes-metabolites":"genotypeSection",
    "timing-levels":"persistenceTimelineSection",
    evidence:"evidenceSection",
    review:"reviewSummarySection",
  };
  const runFocus = () => {
    const target = elementId ? document.getElementById(elementId) : null;
    const el = target || document.getElementById(fallbackIds[resolvedTab]) || document.getElementById(`tab-${resolvedTab}`);
    if (!el) return;
    openParentDisclosure(el);
    if (typeof el.scrollIntoView === "function") el.scrollIntoView({ behavior:"smooth", block:"center" });
    el.classList.remove("focus-pulse");
    void el.offsetWidth;
    el.classList.add("focus-pulse");
    window.setTimeout(() => el.classList.remove("focus-pulse"), 2200);
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(runFocus);
  else runFocus();
}

function openParentDisclosure(el) {
  let node = el?.parentElement || null;
  while (node) {
    if (node.tagName && node.tagName.toLowerCase() === "details") node.open = true;
    node = node.parentElement;
  }
}

function publicDomToken(value) {
  return String(value || "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function getRenderCacheKey() {
  return JSON.stringify({
    stack: activeStack,
    genotype: activeGenotype || {},
    genetics: userGenetics || {},
    doses: typeof drugDoses !== "undefined" ? drugDoses : {},
  });
}

function getRenderComputationCache() {
  const key = getRenderCacheKey();
  if (renderComputationCache && renderComputationCache.key === key) return renderComputationCache;
  const safeGenotype = activeGenotype || {};
  const risk = activeStack.length >= 2 && typeof calcRisk === "function"
    ? calcRisk()
    : { interactions:[], factors:[], score:0, level:"MINIMAL RISK" };
  const activeMoietyRows = typeof computeActiveMoietyBalance === "function"
    ? computeActiveMoietyBalance(activeStack, safeGenotype)
    : [];
  const riskMarkerRows = typeof computeRiskMarkerFindings === "function"
    ? computeRiskMarkerFindings(activeStack, safeGenotype, { activeMoietyRows })
    : [];
  const phenoconversionRows = typeof computePhenoconversionState === "function"
    ? computePhenoconversionState(activeStack, safeGenotype, { activeMoietyRows })
    : [];
  const timelineRows = typeof computePersistenceTimeline === "function"
    ? computePersistenceTimeline(activeStack, safeGenotype)
    : [];
  const findings = typeof buildInteractionFindings === "function"
    ? buildInteractionFindings(activeStack, safeGenotype, {
        interactions: risk.interactions || [],
        activeMoietyRows,
        riskMarkerRows,
        phenoconversionRows,
        timelineRows,
      })
    : [];
  const clinicalConcerns = typeof buildClinicalConcerns === "function"
    ? buildClinicalConcerns(findings, {
        stack:activeStack,
        genotypeState:safeGenotype,
        interactions:risk.interactions || [],
        activeMoietyRows,
        riskMarkerRows,
        phenoconversionRows,
        timelineRows,
      })
    : findings;
  renderComputationCache = {
    key,
    risk,
    activeMoietyRows,
    riskMarkerRows,
    phenoconversionRows,
    timelineRows,
    sourceIntegrationContext:null,
    sourceCoreContext:null,
    pendingCalculationContext:null,
    findings,
    clinicalConcerns,
  };
  return renderComputationCache;
}

function currentRenderFingerprint() {
  return getRenderCacheKey();
}

function renderLazyTab(tabId = activeTab) {
  const key = currentRenderFingerprint();
  if (tabId === "evidence") {
    if (lazyRenderState.evidenceKey === key) return;
    if (typeof renderEvidenceExplorer === "function") renderEvidenceExplorer();
    lazyRenderState.evidenceKey = key;
    return;
  }
  if (tabId === "review") {
    if (!isReviewerMode()) return;
    if (lazyRenderState.reviewKey === key) return;
    if (typeof renderReviewSummary === "function") renderReviewSummary();
    if (typeof renderQualityDashboard === "function") renderQualityDashboard();
    if (typeof renderWarningPathReview === "function") renderWarningPathReview();
    if (typeof renderScenarioSnapshotsReview === "function") renderScenarioSnapshotsReview();
    if (typeof renderMetaboliteCoverageGapsReview === "function") renderMetaboliteCoverageGapsReview();
    if (typeof renderContributeReview === "function") renderContributeReview();
    lazyRenderState.reviewKey = key;
  }
}

function renderSummaryBar() {
  const bar = document.getElementById("summaryBar");
  const tabBar = document.getElementById("tabBar");
  const mainEmptyState = document.getElementById("mainEmptyState");
  if (!bar || !tabBar) return;

  const overviewBtn = document.getElementById("tabbtn-overview");
  const tabPanels = DIOGNOSIS_TABS
    .map(t => document.getElementById("tab-" + t))
    .filter(Boolean);
  if (activeStack.length < 1) {
    bar.style.display = "none";
    tabBar.style.display = "none";
    if (mainEmptyState) mainEmptyState.style.display = "";
    tabPanels.forEach(panel => { panel.style.display = "none"; });
    if (overviewBtn) overviewBtn.innerHTML = "Overview";
    return;
  }

  if (mainEmptyState) mainEmptyState.style.display = "none";
  bar.style.display = "";
  tabBar.style.display = "";
  tabPanels.forEach(panel => { panel.style.display = ""; });
  setTab(activeTab);

  let riskClass = "neutral";
  let headline = "";
  let summaryCopy = "";
  let nextStep = "";
  let severeCount = 0;
  let interactionScore = 0;
  let genotypePriority = null;
  let priorityInteraction = null;
  let priorityStory = null;
  if (activeStack.length >= 2) {
    const risk = typeof getRenderComputationCache === "function"
      ? getRenderComputationCache().risk
      : calcRisk();
    interactionScore = risk.score;
    const severeInteractions = risk.interactions.filter(i => i.severity === "severe" || i.severity === "critical");
    const moderateInteractions = risk.interactions.filter(i => i.severity === "moderate");
    priorityInteraction = severeInteractions[0] || moderateInteractions[0] || risk.interactions[0] || null;
    const severePairs = uniqueInteractionPairLabels(severeInteractions);
    const moderatePairs = uniqueInteractionPairLabels(moderateInteractions);
    severeCount = severePairs.length;
    riskClass = severeCount || interactionScore >= 60 ? "high" : interactionScore >= 30 ? "moderate" : "low";
    const topSevere = severePairs.slice(0, 2).join(", ");
    headline = severeCount > 0 ? "High-priority interaction found" :
      interactionScore >= 30 ? "Some monitoring may be needed" :
      "No major interaction signal found";
    summaryCopy = severeCount > 0
      ? `${severeCount} severe finding${severeCount>1?"s":""}${topSevere ? `: ${topSevere}` : ""}. Review the findings before changing doses or adding more substances.`
      : `Checked ${activeStack.length} substances. Diognosis did not find a severe pairwise interaction, but genotype, transporter, metabolite, and dose context may still matter.`;
    nextStep = severeCount > 0
      ? "Start with the severe findings, then review timing, burden, and evidence context."
      : "Review level changes, burden, timing, and any selected gene results.";
    if (priorityInteraction) {
      priorityStory = buildInteractionPriorityStory(priorityInteraction);
    }
  } else {
    genotypePriority = typeof getHighestGenotypePrioritySignal === "function" ? getHighestGenotypePrioritySignal() : null;
    headline = "Add another substance to check interactions";
    summaryCopy = "Single-substance pharmacogenomic, metabolite, and PK context appears below when available. Interaction risk needs at least two substances.";
    nextStep = "Add a second medication, supplement, herb, food, or recreational substance.";
  }

  if (!genotypePriority && typeof getHighestGenotypePrioritySignal === "function") {
    genotypePriority = getHighestGenotypePrioritySignal();
  }
  if (genotypePriority && genotypePriority.score > interactionScore) {
    riskClass = genotypePriority.score >= 70 ? "high" : genotypePriority.score >= 45 ? "moderate" : "low";
    headline = genotypePriority.headline;
    summaryCopy = genotypePriority.summary;
    nextStep = genotypePriority.nextStep;
    priorityStory = genotypePriority.story || buildGenotypePriorityStory(genotypePriority);
  }
  if (genotypePriority && genotypePriority.score >= 70 && genotypePriority.score <= interactionScore && summaryCopy) {
    summaryCopy = `${summaryCopy} Also check: ${genotypePriority.summary}`;
    nextStep = "Start with the severe findings, then review genotype/metabolite warnings.";
  }
  if (!priorityStory) {
    priorityStory = buildDefaultPriorityStory(activeStack.length);
  }

  const patient = isPatientAudience();
  const publicPresentations = getCurrentPublicFindingPresentations();
  const visiblePresentations = patient
    ? getPatientFacingPublicFindingPresentations(publicPresentations)
    : (isReviewerMode()
      ? publicPresentations
      : getClinicianFacingPublicFindingPresentations(publicPresentations));
  const primaryPresentation = visiblePresentations[0] || null;
  const isGenotypePriority = genotypePriority && genotypePriority.score > interactionScore;
  const jumpTab = primaryPresentation ? primaryPresentation.targetTab : (isGenotypePriority ? (genotypePriority.targetTab || "genes-metabolites") : "overview");
  const jumpTarget = primaryPresentation ? primaryPresentation.targetElementId : (isGenotypePriority ? (genotypePriority.targetElementId || "genotypeSection") : "findingSection");

  if (patient) {
    if (primaryPresentation) {
      const noteCount = visiblePresentations.length;
      const firstActors = (primaryPresentation.affectedSubstances || []).slice(0, 2).join(" + ");
      headline = `${noteCount} question${noteCount === 1 ? "" : "s"} ready for your list`;
      summaryCopy = firstActors
        ? `Start with the Safety Notes below. The first question is about ${firstActors}.`
        : "Start with the Safety Notes below.";
      nextStep = "Copy the question or share this screen before a medication review.";
      priorityStory = patientPriorityStory(primaryPresentation);
    } else if (activeStack.length >= 2) {
      headline = "No major safety note found here";
      summaryCopy = "This does not prove the list is safe. Dose, timing, health history, and medicines not in the list can still matter.";
      nextStep = "Ask a doctor or pharmacist if symptoms, dose changes, or new medicines are involved.";
      priorityStory = {
        why:"The checker did not find a higher-priority note in the local dataset for this list.",
        changes:"No result here does not mean no risk.",
        review:"Ask a doctor or pharmacist before changing medicines.",
      };
    } else {
      headline = "Add another medicine to check the list";
      summaryCopy = "One medicine can show some safety context, but interaction checking needs at least two selected items.";
      nextStep = "Add another medicine, supplement, food, or known gene result if relevant.";
      priorityStory = {
        why:"A single item cannot show pairwise interactions.",
        changes:"More context can change the safety note.",
        review:"Add another item or ask a doctor or pharmacist if you have a concern.",
      };
    }
  } else if (primaryPresentation && !isGenotypePriority) {
    const concernCount = visiblePresentations.length;
    const actorText = (primaryPresentation.affectedSubstances || []).slice(0, 3).join(" + ");
    const genotypeAlsoCheck = genotypePriority && genotypePriority.score >= 70 && genotypePriority.summary
      ? ` Also check: ${genotypePriority.summary}`
      : "";
    headline = primaryPresentation.title;
    summaryCopy = `${actorText ? `${actorText}. ` : ""}${compactClinicianEvidenceLine(primaryPresentation)}${genotypeAlsoCheck}`;
    nextStep = clinicianOverviewActionText(primaryPresentation, primaryPresentation.whatToReview || nextStep);
    priorityStory = buildClinicianPriorityStory(primaryPresentation, priorityStory);
  }

  const summaryKicker = patient
    ? (primaryPresentation ? "Questions ready" : "Current check")
    : (primaryPresentation ? "Review Priorities" : summaryBandLabel(riskClass, activeStack.length));
  const jumpLabel = patient ? "View note" : (primaryPresentation ? "Open" : "View");
  const hasVisibleSummaryJump = !patient && (Boolean(primaryPresentation) || activeStack.length >= 2 || Boolean(isGenotypePriority));
  const summaryJumpHtml = hasVisibleSummaryJump
    ? `<button type="button" class="summary-jump" data-action="focus-priority" data-tab="${safeAttr(jumpTab)}" data-target="${safeAttr(jumpTarget)}">${safePublicHtml(jumpLabel)}</button>`
    : "";
  const nextLabel = patient ? "Next step" : (primaryPresentation ? "Next" : "Next review");
  const visibleNextStep = !patient && primaryPresentation && !isGenotypePriority
    ? "Use the first card for the clinical focus; open Evidence only when source detail changes the decision."
    : nextStep;
  const summaryStoryHtml = !patient && primaryPresentation && !isGenotypePriority
    ? ""
    : renderPriorityStory(priorityStory);
  const priorityMetricValue = visiblePresentations.length;
  const priorityMetricLabel = priorityMetricValue === 1 ? "priority" : "priorities";

    bar.innerHTML = `<div class="summary-card">
    <div class="summary-main">
      <div>
        <div class="summary-kicker"><span class="summary-band-dot ${safeAttr(riskClass)}"></span><span>${safePublicHtml(summaryKicker)}</span></div>
        <h2 class="summary-title">${safePublicHtml(headline)}</h2>
        <div class="summary-copy">${summaryCopy ? `${safePublicHtml(summaryCopy)} ` : ""}${summaryJumpHtml}</div>
      </div>
      ${patient ? "" : `<div class="summary-risk summary-priority-count ${riskClass}" aria-label="${safeAttr(`${priorityMetricValue} review ${priorityMetricLabel}`)}">
        <div class="num">${priorityMetricValue}</div>
        <div class="lbl">${safePublicHtml(priorityMetricLabel)}</div>
      </div>`}
    </div>
    ${renderClinicalContextStatus()}
    ${patient ? "" : summaryStoryHtml}
    ${renderSummaryExposureSnapshot(patient)}
    <div class="summary-next"><span class="summary-next-pill">${safePublicHtml(nextLabel)}</span><span>${safePublicHtml(visibleNextStep)}</span></div>
    ${renderSummaryActions(patient)}
  </div>`;
  const badge = severeCount > 0 ? `<span class="tab-badge">${severeCount}</span>` : "";
  if (overviewBtn) overviewBtn.innerHTML = "Overview" + badge;
}

function summaryBandLabel(riskClass = "neutral", stackCount = 0) {
  if (stackCount < 2) return "Current check";
  if (riskClass === "high") return "High priority";
  if (riskClass === "moderate") return "Review recommended";
  if (riskClass === "low") return "No high-priority signal surfaced";
  return "Current check";
}

function renderSummaryActions(patient = isPatientAudience()) {
  const shareUrl = typeof currentStackShareUrl === "function" ? currentStackShareUrl("overview") : "";
  const copyLabel = "Copy review summary";
  const copyAriaLabel = "Copyable Diognosis medication review summary";
  return `<div class="summary-actions">
    <button type="button" class="summary-action-btn" data-action="copy-overview">${safePublicHtml(copyLabel)}</button>
    ${shareUrl ? `<a class="summary-action-btn" href="${safeAttr(shareUrl)}" target="_blank" rel="noopener" title="Includes the selected medicines and gene results">Share review link</a><span class="summary-share-note">Includes selected medicines and gene results</span>` : ""}
    <span class="summary-action-status" id="summaryCopyStatus" role="status" aria-live="polite" aria-atomic="true"></span>
    <pre class="summary-copy-text" id="summaryCopyText" tabindex="0" aria-label="${safeAttr(copyAriaLabel)}" hidden></pre>
  </div>`;
}

function renderSummaryExposureSnapshot(patient = isPatientAudience()) {
  if (patient || !activeStack.length || typeof computeActorExposureDeltas !== "function") return "";
  const rows = computeActorExposureDeltas(activeStack)
    .filter(row => row && row.direction && row.direction !== "baseline")
    .slice(0, 8);
  if (!rows.length) return "";
  const shown = rows.slice(0, 3);
  const extra = rows.length - shown.length;
  return `<div class="summary-exposure-strip" aria-label="Exposure direction snapshot">
    <div class="summary-exposure-top">
      <div class="summary-exposure-title">Exposure snapshot</div>
      <button type="button" class="summary-exposure-link" data-action="focus-priority" data-tab="overview" data-target="circulatingSection">Open full view</button>
    </div>
    <div class="summary-exposure-items">${shown.map(renderSummaryExposureItem).join("")}</div>
    ${extra > 0 ? `<button type="button" class="summary-exposure-more" data-action="focus-priority" data-tab="overview" data-target="circulatingSection">+${extra} more exposure signal${extra === 1 ? "" : "s"} in Overview</button>` : ""}
  </div>`;
}

function renderSummaryExposureItem(row = {}) {
  const direction = row.direction || "baseline";
  const tone = direction === "increase" ? "up" : direction === "decrease" ? "down" : "";
  const value = formatExposureDirectionValue(row, { words:true });
  const parent = row.type === "metabolite" && row.parent ? ` from ${row.parent}` : "";
  const meta = [
    row.type || "actor",
    parent.trim(),
    row.driver || "current stack",
  ].filter(Boolean).join(" · ");
  return `<div class="summary-exposure-item">
    <div class="summary-exposure-label">
      <div class="summary-exposure-name">${safePublicHtml(row.name || "Unknown actor")}</div>
      <div class="summary-exposure-meta">${safePublicHtml(meta)}</div>
    </div>
    <div class="summary-exposure-visual">
      <div class="summary-exposure-value ${safeAttr(tone)}">${safePublicHtml(value)}</div>
      ${renderSummaryExposureMeter(row)}
    </div>
  </div>`;
}

function renderSummaryExposureMeter(row = {}) {
  const { marker, left, width, tone } = exposureMeterGeometry(row);
  return `<div class="summary-exposure-meter" aria-hidden="true">
    <div class="summary-exposure-band"></div>
    <div class="summary-exposure-fill ${safeAttr(tone)}" style="left:${safeAttr(left)}%;width:${safeAttr(width)}%"></div>
    <div class="summary-exposure-marker" style="left:calc(${safeAttr(marker)}% - 1.5px)"></div>
  </div>`;
}

function exposureMeterGeometry(row = {}) {
  const direction = row.direction || "baseline";
  const fold = Number(row.fold);
  let marker = 50;
  if (Number.isFinite(fold) && fold > 0) {
    marker = 50 + Math.log2(fold) * 18;
  } else if (direction === "increase") {
    marker = 68;
  } else if (direction === "decrease") {
    marker = 32;
  }
  marker = Math.max(4, Math.min(96, Math.round(marker)));
  const center = 50;
  const left = Math.min(center, marker);
  const width = Math.max(2, Math.abs(marker - center));
  const tone = direction === "increase" ? "up" : direction === "decrease" ? "down" : "";
  return { marker, left, width, tone };
}

function buildOverviewHandoffText() {
  if (typeof buildV1HandoffSummaryText === "function") return buildV1HandoffSummaryText({ limit:5 });
  return [
    "Diognosis V1 handoff summary",
    `Stack: ${(activeStack || []).join(" + ") || "none selected"}`,
    "Boundary: not medical advice; review with a qualified clinician or pharmacist.",
  ].join("\n");
}

function currentHandoffGeneResultSummary(options = {}) {
  const patient = !!options.patient;
  const labels = typeof activeGenotypeHandoffLabels === "function" ? activeGenotypeHandoffLabels() : [];
  if (!labels.length) {
    return patient
      ? "Gene results added in this screen: none"
      : "Selected gene/marker results: none";
  }
  return patient
    ? `Gene results added in this screen: ${labels.join(", ")}`
    : `Selected gene/marker results: ${labels.join(", ")}`;
}

function currentHandoffDataBoundaryLine() {
  const engine = typeof DIOGNOSIS_VERSION !== "undefined" ? DIOGNOSIS_VERSION.engine : "V1";
  return `Generated from local Diognosis ${engine} static data; no patient-specific data was uploaded.`;
}

function buildPatientQuestionSummaryText() {
  const presentations = getPatientFacingPublicFindingPresentations();
  const questions = presentations.length
    ? presentations.slice(0, 5).map(presentation => buildPatientDiscussionQuestion(presentation, presentation.trustContract))
    : [patientFallbackQuestionForCurrentStack()];
  const shareUrl = typeof currentStackShareUrl === "function" ? currentStackShareUrl("overview") : "";
  return [
    "Diognosis questions to ask",
    "Handoff type: patient question list",
    `Selected list: ${(activeStack || []).join(" + ") || "none selected"}`,
    currentHandoffGeneResultSummary({ patient:true }),
    shareUrl ? `Share link: ${shareUrl}` : "",
    currentHandoffDataBoundaryLine(),
    "",
    "Questions to ask",
    ...questions.map((question, index) => `${index + 1}. ${question}`),
    "",
    "Symptoms or changes to mention",
    ...buildPatientMentionSummaryItems(presentations).map(item => `- ${item}`),
    "",
    "Bring to review",
    ...buildReviewContextChecklist(null, { patient:true }).map(item => `- ${item}`),
    "",
    "Boundaries",
    "- This is for education and review, not medical advice.",
    "- A quiet result here does not prove the list is safe.",
    "- Do not start, stop, or change medication without a doctor or pharmacist.",
  ].filter(line => line !== "").join("\n");
}

function patientFallbackQuestionForCurrentStack() {
  if ((activeStack || []).length >= 2) {
    return "Can you check this medication list for dose, timing, symptoms, and health-history concerns? I do not want to start, stop, or change anything without guidance.";
  }
  if ((activeStack || []).length === 1) {
    return "Can you check whether this medicine has any safety or monitoring concerns for me? I do not want to start, stop, or change anything without guidance.";
  }
  return "Can you help me review my medication list? I do not want to start, stop, or change anything without guidance.";
}

function renderNoPublicFindingPanel(scope = null) {
  const currentScope = scope || (typeof buildReviewScopeSummary === "function"
    ? buildReviewScopeSummary(typeof getRenderComputationCache === "function" ? getRenderComputationCache() : {})
    : {});
  const unknownText = currentScope.unknownCount
    ? `Not checked here: ${formatScopeUnknownItems(currentScope.unknownItems)}.`
    : "";
  const items = [
    unknownText,
    "Medication reconciliation: exact product names, formulation, route, dose, timing, adherence, and indication.",
    "Clinical context: kidney or liver function, allergies, pregnancy/lactation, labs, symptoms, diagnoses, and recent procedures.",
    "Concomitants: OTC products, supplements, alcohol/substance exposure, duplicate classes, and unrecognized selected items.",
    "A quiet result here does not prove the list is safe; review with a qualified clinician or pharmacist before changing medicines.",
  ];
  return `<div class="no-signal-card public">
    <div class="no-signal-title">No major review priority generated</div>
    <div class="no-signal-copy">No public Overview concern was generated from the current local finding set. This is a bounded no-signal state, not a safety clearance.</div>
    <div class="no-signal-label">Review before relying on this</div>
    <ul class="no-signal-list">
      ${items.filter(Boolean).map(item => `<li>${safePublicHtml(item)}</li>`).join("")}
    </ul>
  </div>`;
}

function copyOverviewHandoffSummary() {
  const text = buildOverviewHandoffText();
  const status = document.getElementById("summaryCopyStatus");
  const done = (message) => {
    if (message === "Copy unavailable") {
      showSummaryCopyText(text);
      message = "Select text below";
    } else {
      hideSummaryCopyText();
    }
    if (status) status.textContent = message;
  };
  copyTextToClipboard(text, done);
}

function copyTextToClipboard(text, done = () => {}) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => done("Copied")).catch(() => {
      done(copyTextWithSelectionFallback(text) ? "Copied" : "Copy unavailable");
    });
    return;
  }
  done(copyTextWithSelectionFallback(text) ? "Copied" : "Copy unavailable");
}

function copyTextWithSelectionFallback(text) {
  if (!document?.body) return false;
  const textarea = document.createElement("textarea");
  textarea.value = String(text || "");
  textarea.setAttribute("readonly", "readonly");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand && document.execCommand("copy");
  } catch {
    ok = false;
  }
  textarea.remove();
  return !!ok;
}

function showSummaryCopyText(text) {
  const el = document.getElementById("summaryCopyText");
  if (!el) return;
  el.textContent = text;
  el.hidden = false;
  el.focus();
}

function hideSummaryCopyText() {
  const el = document.getElementById("summaryCopyText");
  if (!el) return;
  el.hidden = true;
}

function renderInteractionFindingsOverview(risk) {
  const section = document.getElementById("findingSection");
  const body = document.getElementById("findingBody");
  const count = document.getElementById("findingCount");
  if (!section || !body) return [];
  const findings = typeof getRenderComputationCache === "function"
    ? getRenderComputationCache().findings
    : (typeof buildInteractionFindings === "function"
      ? buildInteractionFindings(activeStack, activeGenotype || {}, { interactions:risk?.interactions || [] })
      : []);
  const overviewFindings = typeof getRenderComputationCache === "function"
    ? getRenderComputationCache().clinicalConcerns || findings
    : (typeof buildClinicalConcerns === "function" ? buildClinicalConcerns(findings, { stack:activeStack, genotypeState:activeGenotype || {} }) : findings);
  currentInteractionFindings = findings;
  currentClinicalConcerns = overviewFindings;
  currentPublicFindingPresentations = rankPublicFindingPresentations(buildPublicFindingPresentations(overviewFindings));
  const visiblePresentations = isPatientAudience()
    ? rankPublicFindingPresentations(getPatientFacingPublicFindingPresentations(currentPublicFindingPresentations))
    : rankPublicFindingPresentations(isReviewerMode()
      ? currentPublicFindingPresentations
      : getClinicianFacingPublicFindingPresentations(currentPublicFindingPresentations));
  if (!currentPublicFindingPresentations.length) {
    if (activeStack.length < 2) {
      hideSectionAndClear("findingSection", "findingBody", "findingCount");
      return currentPublicFindingPresentations;
    }
    section.style.display = "";
    body.innerHTML = renderNoPublicFindingPanel();
    if (count) count.textContent = "";
    return currentPublicFindingPresentations;
  }
  section.style.display = "";
  if (count) {
    const label = isPatientAudience() ? "plain note" : "review priority";
    count.textContent = `${visiblePresentations.length} ${label}${visiblePresentations.length === 1 ? "" : "s"}`;
  }
  body.innerHTML = isPatientAudience()
    ? renderPatientQuestionsPage(visiblePresentations)
    : renderClinicianFindingsOverview(visiblePresentations);
  return currentPublicFindingPresentations;
}

function renderPatientQuestionsPage(presentations = []) {
  const ranked = rankPublicFindingPresentations(presentations);
  const shown = ranked.slice(0, 1);
  const remaining = ranked.slice(1);
  return `
    ${renderPatientStackSummary(buildPatientStackSummary(ranked))}
    ${shown.length ? `<div class="patient-question-list">
      ${shown.map(renderPatientQuestionCard).join("")}
    </div>` : ""}
    ${renderCollapsedPatientQuestions(remaining)}
    ${renderFindingOverviewFooter(ranked.length)}
  `;
}

function renderClinicianFindingsOverview(presentations = []) {
  const ranked = rankPublicFindingPresentations(isReviewerMode()
    ? presentations
    : getClinicianFacingPublicFindingPresentations(presentations));
  const shown = ranked.slice(0, 1);
  const remaining = ranked.slice(1);
  return `
    ${renderPlainQuestionBridge(getPatientFacingPublicFindingPresentations(currentPublicFindingPresentations))}
    ${shown.map((presentation, index) => renderPublicFindingCard(presentation, index)).join("")}
    ${renderCollapsedClinicianFindings(remaining, shown.length)}
    ${renderFindingOverviewFooter(ranked.length)}
  `;
}

function renderPlainQuestionBridge(presentations = []) {
  const ranked = rankPublicFindingPresentations(presentations).slice(0, 2);
  if (!ranked.length) return "";
  return `<div class="plain-question-bridge">
    ${ranked.map(renderPlainBridgeQuestion).join("")}
  </div>`;
}

function renderPlainBridgeQuestion(presentation = {}) {
  const trust = presentation.trustContract || null;
  const question = buildPatientDiscussionQuestion(presentation, trust);
  const affected = (presentation.affectedSubstances || []).slice(0, 3).join(" + ");
  const severity = safeChoice(presentation.severity, ["critical","severe","moderate","monitor","info"], "info");
  const tone = patientQuestionTone(severity);
  return `<div class="plain-question-card ${safeAttr(tone)}">
    <div class="plain-question-card-top">
      <span class="patient-question-tag">${safePublicHtml(patientSeverityLabel(severity))}</span>
      ${affected ? `<span>${safePublicHtml(affected)}</span>` : ""}
    </div>
    <div class="plain-question-card-question">${safePublicHtml(question)}</div>
  </div>`;
}

function renderPatientStackSummary(summary = null) {
  if (!summary) return "";
  return `<div class="patient-stack-summary">
    <div class="patient-stack-summary-title">${safePublicHtml(summary.headline)}</div>
    <div class="patient-stack-summary-body">${safePublicHtml(summary.body)}</div>
  </div>`;
}

function buildPatientStackSummary(presentations = []) {
  const scope = typeof buildReviewScopeSummary === "function"
    ? buildReviewScopeSummary(typeof getRenderComputationCache === "function" ? getRenderComputationCache() : {})
    : {};
  const selectedCount = Number(scope.selectedCount || activeStack.length || 0);
  if (!selectedCount) return null;
  const ranked = rankPublicFindingPresentations(presentations);
  const unknownText = scope.unknownCount
    ? `Also mention ${formatScopeUnknownItems(scope.unknownItems)} because ${scope.unknownCount === 1 ? "it was" : "they were"} not recognized here.`
    : "";
  if (ranked.length) {
    return unknownText
      ? {
        headline:"Some items were not recognized",
        body:unknownText,
      }
      : null;
  }
  if (!ranked.length) {
    const quiet = selectedCount >= 2
      ? "Nothing major stood out in the current local data for this list."
      : "This view can show single-medicine gene or safety context, but interaction checks need the rest of the medication list.";
    return {
      headline:scope.unknownCount ? "Some items were not recognized" : "Nothing major stood out here",
      body:[quiet, unknownText].filter(Boolean).join(" "),
    };
  }
  return null;
}

function renderCollapsedPatientQuestions(presentations = []) {
  if (!presentations.length) return "";
  const label = `Show ${presentations.length} more note${presentations.length === 1 ? "" : "s"}`;
  return `<details class="overview-more patient-more">
    <summary>${safePublicHtml(label)}</summary>
    <div class="overview-more-list patient-question-list">
      ${presentations.map(renderPatientQuestionCard).join("")}
    </div>
  </details>`;
}

function renderCollapsedClinicianFindings(presentations = [], startIndex = 0) {
  if (!presentations.length) return "";
  const label = `Show ${presentations.length} more concern${presentations.length === 1 ? "" : "s"}`;
  return `<details class="overview-more clinician-more">
    <summary>${safePublicHtml(label)}</summary>
    <div class="overview-more-list">
      ${presentations.map((presentation, index) => renderPublicFindingCard(presentation, startIndex + index)).join("")}
    </div>
  </details>`;
}

function getPatientFacingPublicFindingPresentations(presentations = getCurrentPublicFindingPresentations()) {
  const list = Array.isArray(presentations) ? presentations.filter(Boolean) : [];
  const filtered = list.filter(presentation =>
    !shouldSuppressPatientTimingPresentation(presentation, list) &&
    !shouldSuppressPatientRedundantPresentation(presentation, list)
  );
  const deduped = [];
  const seen = new Set();
  for (const presentation of filtered) {
    const title = patientFindingTitleText(presentation).toLowerCase();
    const question = buildPatientDiscussionQuestion(presentation, presentation?.trustContract || null).toLowerCase();
    const key = `${title}|${question}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(presentation);
  }
  return deduped;
}

function getClinicianFacingPublicFindingPresentations(presentations = getCurrentPublicFindingPresentations()) {
  const list = Array.isArray(presentations) ? presentations.filter(Boolean) : [];
  const filtered = list.filter(presentation =>
    !shouldSuppressClinicianRedundantPresentation(presentation, list)
  );
  const deduped = [];
  const seen = new Set();
  for (const presentation of filtered) {
    const keyParts = clinicianOverviewDedupeKeys(presentation);
    if (keyParts.some(key => seen.has(key))) continue;
    keyParts.forEach(key => seen.add(key));
    deduped.push(presentation);
  }
  return deduped;
}

function shouldSuppressClinicianRedundantPresentation(presentation = {}, presentations = []) {
  if (!isGenericClinicianExposurePresentation(presentation)) return false;
  const currentActors = clinicianOverviewActorTokens(presentation);
  if (!currentActors.size) return false;
  return (presentations || []).some(candidate => {
    if (!candidate || candidate === presentation) return false;
    if (publicFindingSeverityScore(candidate.severity) < publicFindingSeverityScore(presentation.severity)) return false;
    if (!clinicianActorSetsOverlap(currentActors, clinicianOverviewActorTokens(candidate))) return false;
    return isSpecificClinicianPgxOrProcedurePresentation(candidate);
  });
}

function clinicianOverviewActorTokens(presentation = {}) {
  const actors = [
    ...(presentation.affectedSubstances || []),
    ...(presentation.sourceFinding?.affectedActors || []).map(actor => actor?.id),
    ...(presentation.sourceFinding?.victimActors || []).map(actor => actor?.id),
    ...(presentation.sourceFinding?.perpetratorActors || []).map(actor => actor?.id),
    ...(presentation.sourceFinding?.sourceFindings || []).flatMap(row => [row.drug1, row.drug2, row.parent, row.actor, row.victim, row.perpetrator]),
    ...(presentation.sourceFinding?.sourceFindingsFull || []).flatMap(finding => [
      ...(finding?.affectedActors || []).map(actor => actor?.id),
      ...(finding?.victimActors || []).map(actor => actor?.id),
      ...(finding?.perpetratorActors || []).map(actor => actor?.id),
      ...(finding?.sourceRows || []).flatMap(row => [row.drug1, row.drug2, row.parent, row.actor, row.victim, row.perpetrator]),
    ]),
  ];
  return new Set(actors.map(actor => normalizeFindingToken(actor)).filter(Boolean));
}

function clinicianActorSetsOverlap(left = new Set(), right = new Set()) {
  for (const actor of left) {
    if (right.has(actor)) return true;
  }
  return false;
}

function isGenericClinicianExposurePresentation(presentation = {}) {
  const domain = presentation.sourceFinding?.clinicalConcernDomain || presentation.trustContract?.concernCategory || "";
  const text = publicFindingSearchText(presentation);
  if (presentation.signal?.kind === "exposure") return true;
  return /exposure|level|auc|substrate|inhibitor|inducer|tdm|enzyme|genotype may change/.test(text) &&
    /exposure_increase_toxicity|exposure_decrease_failure|induction_loss_of_efficacy|parent_accumulation|model_only|metabolism|exposure/i.test(domain);
}

function isSpecificClinicianPgxOrProcedurePresentation(presentation = {}) {
  const domain = presentation.sourceFinding?.clinicalConcernDomain || "";
  const text = publicFindingSearchText(presentation);
  return /activation_failure|risk_marker_context|hypersensitivity_or_scar|toxic_metabolite_accumulation|active_metabolite_accumulation/i.test(domain) ||
    /\b(?:activation|active thiol|morphine|o-desmethyltramadol|m1|bche|pseudocholinesterase|paralysis|apnea|malignant hyperthermia|anesthesia|risk marker|sn-38|5-fu|6-tgn)\b/.test(text);
}

function clinicianOverviewDedupeKeys(presentation = {}) {
  const actorKey = clinicianOverviewActorKey(presentation);
  const review = normalizeClinicianOverviewText(clinicianOverviewActionText(presentation, presentation.whatToReview || ""));
  const why = normalizeClinicianOverviewText(presentation.whyItMatters || "");
  const changed = normalizeClinicianOverviewText(presentation.whatChanged || "");
  const category = clinicianOverviewConcernCategory([
    presentation.title,
    presentation.whatChanged,
    presentation.whyItMatters,
    presentation.whatToReview,
    review,
  ].join(" "));
  return [
    `${category}|${actorKey}|review|${review}`,
    why.length > 24 ? `${category}|${actorKey}|why|${why}` : "",
    why.length > 24 ? `${actorKey}|why|${why}` : "",
    changed.length > 32 && category !== "general" ? `${category}|${actorKey}|changed|${changed}` : "",
  ].filter(Boolean);
}

function clinicianOverviewActorKey(presentation = {}) {
  const actors = (presentation.affectedSubstances || [])
    .map(actor => normalizeFindingToken(actor))
    .filter(Boolean)
    .sort();
  if (actors.length) return actors.join("|");
  return (activeStack || [])
    .map(actor => normalizeFindingToken(actor))
    .filter(Boolean)
    .sort()
    .join("|") || "current-stack";
}

function normalizeClinicianOverviewText(value = "") {
  return publicDisplayText(value)
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\b\d+(?:\.\d+)?\b/g, "#")
    .replace(/\s+/g, " ")
    .trim();
}

function clinicianOverviewConcernCategory(value = "") {
  const text = publicDisplayText(value).toLowerCase();
  if (/\b(?:washout|persistence|timing|switch|overlap|enzyme resynthesis|after stopping|recovery)\b/.test(text)) return "timing";
  if (/contraindicat|avoid|do not use|do not take|hold|suspend|strong cyp3a4/.test(text)) return "avoidance";
  if (/bleed|clot|anticoagul|platelet|inr/.test(text)) return "hemostasis";
  if (/qt|torsades|arrhythm|heart rhythm|bradycard/.test(text)) return "rhythm";
  if (/genotype|pgx|phenotype|cyp\d|ugt1a1|dpyd|tpmt|nudt15|hla-b/.test(text)) return "pgx";
  if (/exposure|auc|substrate|inhibitor|inducer|metabolite|toxicity/.test(text)) return "exposure";
  return "general";
}

function patientTimingPresentation(presentation = {}, trust = null) {
  const titleText = publicDisplayText(presentation?.title || "").toLowerCase();
  const bodyText = publicDisplayText([presentation?.whatChanged, presentation?.whyItMatters].filter(Boolean).join(" ")).toLowerCase();
  return patientTimingConcern(presentation, trust) &&
    (/timing|washout|persist|switch|overlap/.test(titleText) || /timing|washout|persist|switch|overlap/.test(bodyText));
}

function shouldSuppressPatientTimingPresentation(presentation = {}, presentations = []) {
  if (!patientTimingPresentation(presentation, presentation?.trustContract || null)) return false;
  const nonTiming = (presentations || []).filter(candidate =>
    candidate &&
    candidate !== presentation &&
    !patientTimingPresentation(candidate, candidate?.trustContract || null) &&
    publicFindingSeverityScore(candidate.severity) >= publicFindingSeverityScore("moderate")
  );
  if (!nonTiming.length) return false;
  const dominant = nonTiming[0];
  const dominantText = publicDisplayText([
    dominant?.title,
    dominant?.whatChanged,
    dominant?.whyItMatters,
    dominant?.whatToReview,
    ...(dominant?.affectedSubstances || []),
  ].join(" ")).toLowerCase();
  const dominantRiskMarker = patientRiskMarkerContext(dominantText);
  if (dominantRiskMarker) return true;
  if (hasPatientAnticholinergicConcern(dominantText) || hasPatientSedationConcern(dominantText)) return true;
  if (nonTiming.length >= 2) return true;
  if ((activeStack || []).length <= 1 && (
    hasToxicMetabolitePatientContext(dominantText) ||
    hasActiveMetabolitePatientContext(dominantText) ||
    /\b(?:gene|genotype|cyp\d|ugt1a1|dpyd|tpmt|nudt15|hla-b\*?[0-9:]+)\b/.test(dominantText)
  )) {
    return true;
  }
  return false;
}

function patientPrimaryActor(presentation = {}) {
  return normalizeFindingToken((presentation?.affectedSubstances || [])[0] || "");
}

function patientGenericExposureTitle(title = "") {
  return /may change medicine effects|side-effect risk may increase|medicine side-effect risk may increase/i.test(String(title || ""));
}

function shouldSuppressPatientRedundantPresentation(presentation = {}, presentations = []) {
  const currentTitle = patientFindingTitleText(presentation);
  const currentText = publicDisplayText([
    presentation?.title,
    presentation?.whatChanged,
    presentation?.whyItMatters,
    presentation?.whatToReview,
  ].join(" ")).toLowerCase();
  if (!patientGenericExposureTitle(currentTitle)) return false;
  const actorKey = patientPrimaryActor(presentation);
  if (!actorKey) return false;
  return (presentations || []).some(candidate => {
    if (!candidate || candidate === presentation) return false;
    const candidateTitle = patientFindingTitleText(candidate);
    const candidateText = publicDisplayText([
      candidate?.title,
      candidate?.whatChanged,
      candidate?.whyItMatters,
      candidate?.whatToReview,
    ].join(" ")).toLowerCase();
    if (patientPrimaryActor(candidate) !== actorKey) return false;
    if (publicFindingSeverityScore(candidate.severity) < publicFindingSeverityScore(presentation.severity)) return false;
    return hasToxicMetabolitePatientContext(candidateText) ||
      hasActiveMetabolitePatientContext(candidateText) ||
      patientRiskMarkerContext(candidateText) ||
      hasPatientAnticholinergicConcern(candidateText) ||
      hasPatientSedationConcern(candidateText) ||
      !patientGenericExposureTitle(candidateTitle);
  });
}

function renderPatientQuestionCard(presentation = {}) {
  const severity = safeChoice(presentation.severity, ["critical","severe","moderate","monitor","info"], "info");
  const tone = patientQuestionTone(severity);
  const trust = presentation.trustContract || (typeof buildV1FindingTrustContract === "function" ? buildV1FindingTrustContract(presentation.sourceFinding || {}, { stack:activeStack }) : null);
  const title = patientFindingTitleText(presentation);
  const affected = (presentation.affectedSubstances || []).slice(0, 3).join(" + ");
  const question = buildPatientDiscussionQuestion(presentation, trust);
  const meaning = patientFindingStepText(presentation, "changed");
  const contextBadges = renderFindingContextBadges(presentation, { patient:true });
  const monitoringGuide = renderFindingMonitoringGuide(presentation, trust, true);
  return `<div id="${safeAttr(presentation.targetElementId)}" class="patient-question-card ${safeAttr(tone)}" data-finding-id="${safeAttr(presentation.id || "")}">
    <span class="patient-question-dot ${safeAttr(tone)}"></span>
    <div class="patient-question-main">
      <div class="patient-question-top">
        <span class="patient-question-tag">${safePublicHtml(patientSeverityLabel(severity))}</span>
      </div>
      ${contextBadges}
      <div class="patient-question-meaning">
        <div class="patient-question-meaning-label">What this may mean</div>
        <div class="patient-question-meaning-text">${safePublicHtml(meaning)}</div>
      </div>
      <div class="finding-discussion patient-question-discussion">
        <div class="finding-discussion-label">What to ask</div>
        <div class="finding-discussion-text">${safePublicHtml(question)}</div>
      </div>
      <div class="patient-question-reason">
        <div class="patient-question-reason-label">For this list</div>
        <div class="patient-question-title">${safePublicHtml(title)}</div>
        ${affected ? `<div class="patient-question-meta">${safePublicHtml(affected)}</div>` : ""}
      </div>
      ${monitoringGuide}
    </div>
  </div>`;
}

function patientQuestionTone(severity = "") {
  if (severity === "critical" || severity === "severe") return "high";
  if (severity === "moderate" || severity === "monitor") return "medium";
  return "low";
}

function renderFindingOverviewFooter(totalCount = 0) {
  if (isPatientAudience()) {
    return `<div class="patient-clinician-note"><div><strong>Do not start, stop, switch, or change medicines on your own.</strong> Bring this list to a doctor or pharmacist.</div></div>`;
  }
  if (totalCount <= 1) return "";
  return `<div class="finding-empty">Additional concerns are collapsed above. Use the tabs only when mechanism, timing, gene, or evidence detail changes the decision.</div>`;
}

function renderReviewScopePanel() {
  const section = document.getElementById("scopeSection");
  const body = document.getElementById("scopeBody");
  const count = document.getElementById("scopeCount");
  if (!section || !body) return null;
  if (!activeStack.length) {
    hideSectionAndClear("scopeSection", "scopeBody", "scopeCount");
    return null;
  }
  const cache = typeof getRenderComputationCache === "function" ? getRenderComputationCache() : {};
  const scope = buildReviewScopeSummary(cache);
  if (isPatientAudience() || !isReviewerMode()) {
    hideSectionAndClear("scopeSection", "scopeBody", "scopeCount");
    return scope;
  }
  section.style.display = "";
  if (count) count.textContent = scope.statusLabel;
  body.innerHTML = renderReviewScopeSummary(scope);
  return scope;
}

function buildReviewScopeSummary(cache = {}) {
  const stack = activeStack || [];
  const scopeEntries = stack.map(name => {
    const drug = typeof getStackDrug === "function" ? getStackDrug(name) : getDrug(name);
    const actor = drug ? null : (typeof getStackSupplementActor === "function" ? getStackSupplementActor(name) : null);
    return { name, drug, actor };
  });
  const recognizedDrugCount = scopeEntries.filter(entry => entry.drug).length;
  const recognizedActorCount = scopeEntries.filter(entry => entry.actor).length;
  const unknownItems = scopeEntries
    .filter(entry => !entry.drug && !entry.actor)
    .map(entry => publicDisplayText(entry.name))
    .filter(Boolean);
  const unknownCount = unknownItems.length;
  const genotypeCount = typeof activeGenotypeUrlTokens === "function" ? activeGenotypeUrlTokens().length : 0;
  const standardsCoverage = typeof buildClinicalStandardsCoverage === "function"
    ? buildClinicalStandardsCoverage(stack, activeGenotype || {})
    : null;
  const findings = cache.findings || currentInteractionFindings || [];
  const concerns = cache.clinicalConcerns || currentClinicalConcerns || [];
  const allPublicPresentations = currentPublicFindingPresentations.length
    ? currentPublicFindingPresentations
    : buildPublicFindingPresentations(concerns);
  const publicPresentations = isPatientAudience()
    ? getPatientFacingPublicFindingPresentations(allPublicPresentations)
    : (isReviewerMode()
      ? allPublicPresentations
      : getClinicianFacingPublicFindingPresentations(allPublicPresentations));
  const sourceLinked = publicPresentations.filter(presentation => presentation.trustContract?.sourceLinked).length;
  const authorityLinked = publicPresentations.filter(presentation =>
    presentation.sourceFinding?.evidenceLadder?.authorityLinked || presentation.evidenceLadder?.authorityLinked
  ).length;
  const modeled = publicPresentations.filter(presentation => presentation.trustContract && !presentation.trustContract.sourceLinked).length;
  const trustReady = publicPresentations.filter(presentation => presentation.trustContract?.ready).length;
  const maxSeverity = publicPresentations.reduce((best, presentation) =>
    publicFindingSeverityScore(presentation.severity) > publicFindingSeverityScore(best) ? presentation.severity : best,
    "info"
  );
  const statusLabel = publicPresentations.length
    ? `${publicPresentations.length} concern${publicPresentations.length === 1 ? "" : "s"}`
    : "No major signal";
  const contextAssessment = getClinicalContextAssessment();
  const checks = [
    stack.length >= 2
      ? `Checked pairwise and grouped interaction logic across ${stack.length} selected substances.`
      : "Single-substance context checked; pairwise interactions need at least two selected substances.",
    unknownCount
      ? `Unrecognized selections kept visible: ${formatScopeUnknownItems(unknownItems)}. These items are not assessed by the local interaction model.`
      : "",
    genotypeCount
      ? `Included ${genotypeCount} selected gene or marker result${genotypeCount === 1 ? "" : "s"}.`
      : "No gene or marker result is selected.",
    standardsCoverage
      ? `Standards coverage: ${standardsCoverage.mappedDrugCount}/${standardsCoverage.recognizedDrugCount} recognized medication${standardsCoverage.recognizedDrugCount === 1 ? "" : "s"} mapped to RxNorm; ${standardsCoverage.markerMappingCount} PGx marker identity row${standardsCoverage.markerMappingCount === 1 ? "" : "s"} available.`
      : "Standards coverage was not available for this render.",
    findings.length
      ? `Normalized ${findings.length} engine signal${findings.length === 1 ? "" : "s"} into ${publicPresentations.length} public concern${publicPresentations.length === 1 ? "" : "s"}.`
      : "No major normalized signal was found in the current local dataset.",
    `Clinical context is ${contextAssessment.percent}% complete (${contextAssessment.level}).`,
  ].filter(Boolean);
  const limits = [
    "No result means no major signal was found here; it does not prove the list is safe.",
    "Authority-linked evidence identifies a regulator or recognized guideline; literature-linked evidence identifies a claim-specific study. Neither is independent Diognosis clinical validation.",
    ...(standardsCoverage?.limitations || []),
    unknownCount
      ? `${unknownCount} selected item${unknownCount === 1 ? " was" : "s were"} not recognized by the medication dataset: ${formatScopeUnknownItems(unknownItems)}.`
      : (contextAssessment.missing.length
        ? `Context still missing: ${contextAssessment.missing.join(", ")}.`
        : "Context fields are substantially supplied but still require verification against the clinical record."),
  ];
  return {
    selectedCount: stack.length,
    recognizedDrugCount,
    recognizedActorCount,
    unknownCount,
    unknownItems,
    genotypeCount,
    rawFindingCount: findings.length,
    publicConcernCount: publicPresentations.length,
    sourceLinked,
    authorityLinked,
    modeled,
    trustReady,
    standardsCoverage,
    standardsMappedCount:standardsCoverage?.mappedDrugCount || 0,
    standardsUnmappedCount:standardsCoverage?.unmappedDrugCount || 0,
    pgxMarkerMappingCount:standardsCoverage?.markerMappingCount || 0,
    pgxActionCount:standardsCoverage?.pgxActionCount || 0,
    maxSeverity,
    statusLabel,
    contextAssessment,
    checks,
    limits,
  };
}

function renderReviewScopeSummary(scope) {
  if (isPatientAudience()) return renderPatientReviewScopeSummary(scope);
  const tiles = [
    [scope.selectedCount, "Selected"],
    [scope.recognizedDrugCount + scope.recognizedActorCount, "Recognized"],
    [scope.genotypeCount, "Gene results"],
    [scope.publicConcernCount, "Concerns"],
    [scope.sourceLinked, "Source-linked"],
    [scope.modeled, "Modeled"],
    [scope.standardsMappedCount, "RxNorm IDs"],
    [scope.pgxMarkerMappingCount, "PGx IDs"],
  ];
  return `<div class="scope-grid">
    ${tiles.map(([value, label]) => `<div class="scope-tile"><strong>${safePublicHtml(value)}</strong><span>${safePublicHtml(label)}</span></div>`).join("")}
  </div>
  <ul class="scope-list">
    ${scope.checks.map(item => `<li><span>${safePublicHtml(item)}</span></li>`).join("")}
    ${scope.limits.map(item => `<li><span><strong>Limit:</strong> ${safePublicHtml(item)}</span></li>`).join("")}
  </ul>
  ${renderReviewContextChecklist(scope)}`;
}

function renderPatientReviewScopeSummary(scope) {
  const tiles = [
    [scope.selectedCount, "Selected"],
    [scope.recognizedDrugCount + scope.recognizedActorCount, "Recognized"],
    [scope.genotypeCount, "Gene results"],
    [scope.publicConcernCount, "Safety notes"],
  ];
  const checks = [
    scope.selectedCount >= 2
      ? "Checked the selected list for safety notes in the local dataset."
      : "Add at least two selected items to check for interaction safety notes.",
    scope.unknownCount
      ? `Not checked here: ${formatScopeUnknownItems(scope.unknownItems)}. Ask a doctor or pharmacist to identify it before relying on this review.`
      : "",
    scope.genotypeCount
      ? `Included ${scope.genotypeCount} selected gene result${scope.genotypeCount === 1 ? "" : "s"}.`
      : "No gene result is selected.",
    scope.publicConcernCount
      ? `Found ${scope.publicConcernCount} safety note${scope.publicConcernCount === 1 ? "" : "s"} to discuss with a doctor or pharmacist.`
      : "No major signal was found in the current local dataset.",
  ].filter(Boolean);
  const limits = [
    "No result means no major signal was found here; it does not prove the list is safe.",
    "This page is for education and review, not medical advice.",
    scope.unknownCount
      ? `${scope.unknownCount} selected item${scope.unknownCount === 1 ? " was" : "s were"} not recognized here: ${formatScopeUnknownItems(scope.unknownItems)}.`
      : "Dose, timing, allergies, diagnoses, labs, pregnancy status, and health history are not fully assessed.",
  ];
  return `<div class="scope-grid">
    ${tiles.map(([value, label]) => `<div class="scope-tile"><strong>${safePublicHtml(value)}</strong><span>${safePublicHtml(label)}</span></div>`).join("")}
  </div>
  <ul class="scope-list">
    ${checks.map(item => `<li><span>${safePublicHtml(item)}</span></li>`).join("")}
    ${limits.map(item => `<li><span><strong>Limit:</strong> ${safePublicHtml(item)}</span></li>`).join("")}
  </ul>
  ${renderReviewContextChecklist(scope, { patient:true })}`;
}

function renderReviewContextChecklist(scope = null, options = {}) {
  const patient = options.patient === undefined ? isPatientAudience() : !!options.patient;
  const items = buildReviewContextChecklist(scope, { patient });
  if (!items.length) return "";
  return `<div class="scope-context">
    <div class="scope-context-label">${safePublicHtml(patient ? "Bring to review" : "Review checklist")}</div>
    <ul class="scope-context-list">
      ${items.map(item => `<li>${safePublicHtml(item)}</li>`).join("")}
    </ul>
  </div>`;
}

function buildReviewContextChecklist(scope = null, options = {}) {
  const patient = options.patient === undefined ? isPatientAudience() : !!options.patient;
  const currentScope = scope || (typeof buildReviewScopeSummary === "function"
    ? buildReviewScopeSummary(typeof getRenderComputationCache === "function" ? getRenderComputationCache() : {})
    : {});
  const presentations = getCurrentPublicFindingPresentations();
  const text = publicDisplayText([
    ...(presentations || []).flatMap(presentation => [
      presentation.title,
      presentation.whatChanged,
      presentation.whyItMatters,
      presentation.whatToReview,
      presentation.trustContract?.concernCategory,
      presentation.trustContract?.clinicalConcern,
      presentation.trustContract?.clinicianAction,
    ]),
    ...(currentClinicalConcerns || []).flatMap(finding => [
      finding.title,
      finding.summary,
      finding.clinicalAction,
      finding.clinicalConcernDomain,
      ...(finding.tags || []),
    ]),
  ].filter(Boolean).join(" ")).toLowerCase();
  const items = [];
  const add = (item) => {
    const clean = publicDisplayText(item);
    if (clean && !items.includes(clean)) items.push(clean);
  };
  if (patient) {
    add("Exact medicine names, dose, timing, last dose, and any recent starts or stops.");
    add("The reason each medicine is used, plus any new or worsening symptoms.");
    add("Allergies, pregnancy or breastfeeding status, kidney or liver problems, and recent lab results.");
    if ((currentScope.selectedCount || activeStack.length || 0) < 2) {
      add("The rest of the medication list, including over-the-counter items, vitamins, supplements, and alcohol if relevant.");
    } else {
      add("Over-the-counter items, vitamins, supplements, and alcohol if relevant.");
    }
    if (currentScope.genotypeCount) {
      add("The original gene-test report or portal screenshot, including the lab and date.");
    } else {
      add("Any medication gene-test report you already have; do not guess a result.");
    }
    if (currentScope.unknownCount) {
      add(`Not checked here: ${formatScopeUnknownItems(currentScope.unknownItems)}. Confirm spelling, generic or brand name, strength, and formulation.`);
    }
    if (/bleed|inr|anticoag|warfarin|platelet|clot|hemostasis/.test(text)) {
      add("Bleeding or clotting symptoms, recent procedures, and any lab checks your care team follows.");
    }
    if (/qt|torsades|arrhythm|heart rhythm|bradycard|electrolyte/.test(text)) {
      add("Heart rhythm history, fainting, palpitations, and whether heart tracing or electrolyte checks are needed.");
    }
    if (/sedation|fall|sleepiness|breathing|confusion|cns|opioid|benzodiazepine|anticholinergic/.test(text)) {
      add("Sleepiness, falls, confusion, breathing issues, driving risk, and alcohol or sedating products.");
    }
    if (/washout|persistence|timing|switch|overlap|induction offset/.test(text)) {
      add("The planned start, stop, switch, or overlap dates for each medicine.");
    }
    if (/auc|cmax|exposure|level|concentration|toxicity|renal|hepatic|kidney|liver|clearance/.test(text)) {
      add("Side effects to watch for and whether blood-level or organ-function checks are used for this medicine.");
    }
    if (!(presentations || []).length) {
      add("A doctor or pharmacist should still check whether dose, timing, medical history, or labs change the answer.");
    }
    return items.slice(0, 8);
  }
  add("Medication reconciliation: product, dose, route, frequency, last dose, start/stop dates, adherence, and indication.");
  add("Patient context: age/frailty, pregnancy/lactation, allergies, renal/hepatic function, baseline labs, and current symptoms.");
  add("Concomitants: OTC products, supplements, alcohol/substance exposure, duplicate classes, and recent acute illness.");
  if (currentScope.genotypeCount) {
    add("PGx context: lab method, allele/star result, phenotype translation, report date, and CPIC/label applicability.");
  } else {
    add("PGx context if available: original report quality, allele/star result, phenotype translation, and clinical indication.");
  }
  if (currentScope.unknownCount) {
    add(`Unrecognized selections (${formatScopeUnknownItems(currentScope.unknownItems)}): verify generic/brand identity, formulation, route, and whether the item is outside the local dataset.`);
  }
  if (/bleed|inr|anticoag|warfarin|platelet|clot|hemostasis/.test(text)) {
    add("Bleeding/clotting: INR or relevant anticoagulation labs, platelet count, procedure timing, bleeding history, and indication.");
  }
  if (/qt|torsades|arrhythm|heart rhythm|bradycard|electrolyte/.test(text)) {
    add("QT/rhythm: baseline QTc, potassium/magnesium/calcium, bradycardia, heart disease, and other QT-risk medicines.");
  }
  if (/sedation|fall|sleepiness|breathing|confusion|cns|opioid|benzodiazepine|anticholinergic/.test(text)) {
    add("CNS/fall burden: respiratory disease, cognition, falls, driving/work risk, alcohol, opioids, benzodiazepines, and anticholinergics.");
  }
  if (/washout|persistence|timing|switch|overlap|induction offset/.test(text)) {
    add("Timing: planned switch/overlap dates, washout, half-life, induction or recovery offset, and monitoring window.");
  }
  if (/auc|cmax|exposure|level|concentration|toxicity|renal|hepatic|kidney|liver|clearance|tdm/.test(text)) {
    add("Exposure/TDM: renal and hepatic status, troughs or levels, toxicity symptoms, inhibitor/inducer timing, and dose changes.");
  }
  if (!(presentations || []).length) {
    add("No-signal review: verify whether dose, timing, missing diagnoses, labs, or unmodeled context could change the risk assessment.");
  }
  return items.slice(0, 9);
}

function formatScopeUnknownItems(items = [], limit = 4) {
  const clean = (items || [])
    .map(item => publicDisplayText(item))
    .filter(Boolean);
  if (!clean.length) return "unrecognized item";
  const shown = clean.slice(0, limit).join(", ");
  const remaining = clean.length - limit;
  return remaining > 0 ? `${shown}, and ${remaining} more` : shown;
}

function renderInteractionFindingCard(finding) {
  return renderPublicFindingCard(buildPublicFindingPresentationFromFinding(finding));
}

function buildPublicFindingPresentations(overviewFindings = []) {
  let presentations = (overviewFindings || [])
    .map(buildPublicFindingPresentationFromFinding)
    .filter(hasCompletePublicFindingPresentation);
  const genotypeSignal = typeof getHighestGenotypePrioritySignal === "function" ? getHighestGenotypePrioritySignal() : null;
  const genotypePresentation = buildPublicFindingPresentationFromGenotypeSignal(genotypeSignal);
  if (isFoodBiomarkerSignal(genotypeSignal) && presentations.length && presentations.every(presentation =>
    publicPresentationIsTimingContext(presentation) || publicPresentationIsFoodBiomarkerContext(presentation)
  )) {
    presentations = [];
  }
  if (shouldAddGenotypePublicFinding(genotypePresentation, presentations, genotypeSignal)) {
    presentations.push(genotypePresentation);
    presentations.sort((a, b) => publicFindingSeverityScore(b.severity) - publicFindingSeverityScore(a.severity));
  }
  return presentations;
}

function hasCompletePublicFindingPresentation(presentation) {
  return !!(presentation &&
    presentation.whatChanged &&
    presentation.whyItMatters &&
    presentation.whatToReview &&
    presentation.evidenceSummary);
}

function buildPublicFindingPresentationFromFinding(finding = {}) {
  const id = String(finding.id || finding.title || "finding");
  const sourceIds = [
    id,
    ...(finding.sourceFindings || []).map(row => row.id),
    ...(finding.groupedFindings || []).map(row => row.id),
  ].filter(Boolean);
  const title = publicDisplayText(finding.title || "Interaction finding");
  const affectedSubstances = publicFindingAffectedSubstances(finding);
  const evidenceRefs = [...new Set(finding.evidenceRefs || [])];
  const detail = publicFindingDetailTarget(finding);
  const presentation = {
    id,
    sourceIds,
    sourceFinding:finding,
    trustContract: typeof buildV1FindingTrustContract === "function" ? buildV1FindingTrustContract(finding, { stack:activeStack }) : null,
    severity:safeChoice(finding.severity, ["critical","severe","moderate","monitor","info"], "info"),
    title,
    affectedSubstances,
    whatChanged:publicDisplayText(finding.summary || title || "This stack changes expected exposure, activation, timing, or safety context."),
    whyItMatters:publicDisplayText(publicFindingWhy(finding)),
    whatToReview:publicDisplayText(publicFindingReviewAction(finding)),
    evidenceSummary:publicEvidenceSummaryForFinding(finding),
    targetTab:"overview",
    targetElementId:publicFindingElementId(id),
    detailTab:detail.tab,
    detailElementId:detail.elementId,
    tags:(finding.tags || []).slice(0, 6),
  };
  return presentation;
}

function buildPublicFindingPresentationFromGenotypeSignal(signal) {
  if (!signal) return null;
  const id = `pgx-${publicDomToken(signal.kind || "signal")}-${publicDomToken(signal.headline || signal.summary)}`;
  const severity = signal.score >= 70 ? "severe" : signal.score >= 45 ? "moderate" : "monitor";
  return {
    id,
    sourceIds:[id],
    sourceFinding:null,
    trustContract: typeof buildV1GenotypeSignalTrustContract === "function" ? buildV1GenotypeSignalTrustContract(signal, severity, { stack:activeStack }) : null,
    severity,
    title:publicDisplayText(signal.headline || "Pharmacogenomic finding"),
    affectedSubstances:publicFindingSignalSubstances(signal),
    whatChanged:publicDisplayText(signal.changes || signal.summary || "A selected genotype changes expected exposure or active-metabolite behavior."),
    whyItMatters:publicDisplayText(signal.why || "A medication in the current list depends on this gene or risk marker."),
    whatToReview:publicDisplayText(signal.review || signal.nextStep || "Review whether dose, monitoring, or an alternative should change."),
    evidenceSummary:publicEvidenceSummaryFromRefs(signal.evidenceRefs || []),
    targetTab:"overview",
    targetElementId:publicFindingElementId(id),
    detailTab:signal.targetTab || "genes-metabolites",
    detailElementId:signal.targetElementId || "genotypeSection",
    tags:["PGx", signal.contextKind === "food_biomarker" ? "food/biomarker context" : ""].filter(Boolean),
    signal,
  };
}

function shouldAddGenotypePublicFinding(genotypePresentation, presentations = [], signal = null) {
  if (!genotypePresentation || !signal || signal.score < 30) return false;
  if (!presentations.length) return true;
  if (isFoodBiomarkerSignal(signal) && presentations.every(publicPresentationIsTimingContext)) return true;
  const signalEvidenceRefs = new Set(signal.evidenceRefs || []);
  const sourceBackedSignal = signalEvidenceRefs.size > 0;
  const equivalentSourceBackedPresentation = sourceBackedSignal && presentations.some(presentation => {
    const presentationRefs = new Set([
      ...(presentation.trustContract?.evidenceRefs || []),
      ...(presentation.sourceFinding?.evidenceRefs || []),
      ...(presentation.signal?.evidenceRefs || []),
    ]);
    return presentation.trustContract?.sourceLinked &&
      [...signalEvidenceRefs].some(ref => presentationRefs.has(ref));
  });
  if (sourceBackedSignal && !equivalentSourceBackedPresentation) return true;
  const signalText = publicFindingSearchText(genotypePresentation);
  const overlapsPrimary = presentations.some(presentation => {
    const text = publicFindingSearchText(presentation);
    const sharedSubstance = (genotypePresentation.affectedSubstances || []).some(name =>
      name && text.includes(name.toLowerCase())
    );
    const headlineTokens = (signal.headline || "").split(/\s+/).filter(token => token.length >= 4);
    const sharedHeadline = headlineTokens.some(token => text.includes(token.toLowerCase()));
    return sharedSubstance && sharedHeadline;
  });
  if (overlapsPrimary) return false;
  return signal.score >= 70 && !presentations.some(presentation => publicFindingSearchText(presentation).includes(signalText.slice(0, 40)));
}

function isFoodBiomarkerSignal(signal = {}) {
  if (!signal) return false;
  const text = publicDisplayText([
    signal.contextKind,
    signal.headline,
    signal.summary,
    signal.why,
    signal.changes,
    signal.review,
  ].join(" ")).toLowerCase();
  return /\bfood_biomarker\b|food\/biomarker|diet-derived|food-toxicology|biomarker|solanidine|glycoalkaloid|potatoes?/i.test(text);
}

function publicPresentationIsTimingContext(presentation = {}) {
  const domain = presentation.sourceFinding?.clinicalConcernDomain || presentation.trustContract?.concernCategory || "";
  const text = publicFindingSearchText(presentation);
  return /washout|persistence|timing/.test(String(domain || "").toLowerCase()) ||
    /\b(?:washout|persistence|timing|after stopping)\b/.test(text);
}

function publicPresentationIsFoodBiomarkerContext(presentation = {}) {
  const text = publicFindingSearchText(presentation);
  return /\b(?:food\/biomarker|food biomarker|diet-derived|food-toxicology|biomarker|solanidine|solanine|chaconine|glycoalkaloid|potatoes?)\b/i.test(text);
}

function publicFindingAffectedSubstances(finding = {}) {
  const actors = (finding.affectedActors || [])
    .filter(actor => actor && (actor.type === "parent_drug" || activeStack.includes(actor.id)))
    .map(actor => publicDisplayText(actor.id))
    .filter(Boolean);
  const sourceDrugs = (finding.sourceFindings || [])
    .flatMap(row => [row.drug1, row.drug2, row.parent, row.victim, row.perpetrator])
    .map(value => publicDisplayText(value))
    .filter(Boolean);
  const substances = [...new Set([...actors, ...sourceDrugs])];
  if (substances.length) return substances.slice(0, 6);
  return activeStack.map(value => publicDisplayText(value)).filter(Boolean).slice(0, 6);
}

function publicFindingSignalSubstances(signal = {}) {
  const text = `${signal.headline || ""} ${signal.summary || ""}`.toLowerCase();
  const substances = activeStack
    .map(value => publicDisplayText(value))
    .filter(name => name && text.includes(name.toLowerCase()));
  return substances.length ? substances.slice(0, 6) : activeStack.map(value => publicDisplayText(value)).filter(Boolean).slice(0, 3);
}

function publicFindingWhy(finding = {}) {
  if (finding.whyPath?.summary) return shortenOverviewWhyText(finding.whyPath.summary);
  return shortenOverviewWhyText(buildFindingWhyText(finding));
}

function publicFindingReviewAction(finding = {}) {
  const candidates = [
    finding.clinicalAction,
    finding.action,
    finding.management,
    ...(finding.sourceFindings || []).flatMap(row => [row.clinicalAction, row.management, row.action, row.review]),
  ].filter(Boolean);
  if (candidates.length) return candidates[0];
  if (finding.severity === "critical" || finding.severity === "severe") {
    return "Review whether this combination needs a different plan, dose context, timing, or monitoring before any medication changes.";
  }
  if (finding.severity === "moderate") {
    return "Review dose, timing, monitoring, and whether the combination is still appropriate.";
  }
  return "Review this supporting context with symptoms, doses, timing, and the rest of the medication list.";
}

function publicEvidenceSummaryForFinding(finding = {}) {
  if (finding.evidenceLadder) {
    const ladder = finding.evidenceLadder;
    const tier = ladder.strongestTier && ladder.strongestTier !== "unknown"
      ? ladder.strongestTier.replace(/_/g, " ").toLowerCase()
      : "";
    const source = ladder.authorityLinked
      ? "authority-linked"
      : ladder.primaryLiteratureLinked
        ? "primary-literature linked"
        : ladder.modeledOnly
          ? "modeled context"
          : ladder.sourceLinked
            ? "linked source"
            : "modeled signal";
    const count = ladder.studyCount ? `${ladder.studyCount} source${ladder.studyCount === 1 ? "" : "s"}` : "";
    return publicDisplayText([source, tier, count].filter(Boolean).join(" · "));
  }
  return publicEvidenceSummaryFromRefs(finding.evidenceRefs || []);
}

function publicEvidenceSummaryFromRefs(refs = []) {
  const uniqueRefs = [...new Set(refs || [])];
  const studies = uniqueRefs
    .map(ref => typeof getStudy === "function" ? getStudy(ref) : STUDY_DB?.[ref])
    .filter(Boolean);
  const authorityCount = studies.filter(study => typeof isAuthorityEvidence === "function" && isAuthorityEvidence(study)).length;
  const literatureCount = studies.filter(study => typeof isPrimaryLiteratureEvidence === "function" && isPrimaryLiteratureEvidence(study)).length;
  const modeledCount = studies.filter(study => typeof isModeledContextEvidence === "function" && isModeledContextEvidence(study)).length;
  const count = uniqueRefs.length;
  if (authorityCount) return `${authorityCount} authority source${authorityCount === 1 ? "" : "s"}${count > authorityCount ? ` · ${count} linked total` : ""}`;
  if (literatureCount) return `${literatureCount} primary source${literatureCount === 1 ? "" : "s"}${count > literatureCount ? ` · ${count} linked total` : ""}`;
  if (modeledCount && modeledCount === studies.length) return "modeled context · not severity-bearing";
  if (count) return `${count} linked source${count === 1 ? "" : "s"}`;
  return "modeled signal · no linked source yet";
}

function publicFindingDetailTarget(finding = {}) {
  const id = publicDomToken(finding.id || finding.title || "finding");
  if (finding.whyPath) return { tab:"mechanisms", elementId:`mechanism-${id}` };
  if ((finding.evidenceRefs || []).length) return { tab:"evidence", elementId:"evidenceLadderLedger" };
  if (/timing|washout|persistence/i.test(`${finding.type || ""} ${finding.title || ""}`)) {
    return { tab:"timing-levels", elementId:"persistenceTimelineSection" };
  }
  if (/genotype|pgx|active|metabolite|phenoconversion/i.test(`${finding.type || ""} ${finding.title || ""}`)) {
    return { tab:"genes-metabolites", elementId:"genotypeSection" };
  }
  return isReviewerMode()
    ? { tab:"review", elementId:"reviewSummarySection" }
    : { tab:"evidence", elementId:"evidenceSection" };
}

function publicFindingElementId(id) {
  return `overview-finding-${publicDomToken(id)}`;
}

function publicFindingSeverityScore(severity) {
  return { critical:5, severe:4, moderate:3, monitor:2, info:1 }[severity] || 0;
}

function rankPublicFindingPresentations(presentations = []) {
  return (presentations || []).filter(Boolean);
}

function patientSeverityLabel(severity) {
  const key = safeChoice(severity, ["critical","severe","moderate","monitor","info"], "info");
  if (key === "critical" || key === "severe") return "Higher priority";
  if (key === "moderate") return "Review soon";
  if (key === "monitor") return "Mention";
  return "Note";
}

function publicFindingSearchText(presentation = {}) {
  return [
    presentation.id,
    presentation.title,
    presentation.whatChanged,
    presentation.whyItMatters,
    presentation.whatToReview,
    ...(presentation.affectedSubstances || []),
    ...(presentation.sourceIds || []),
  ].join(" ").toLowerCase();
}

function getCurrentPublicFindingPresentations() {
  if (currentPublicFindingPresentations.length) return currentPublicFindingPresentations;
  const cache = typeof getRenderComputationCache === "function" ? getRenderComputationCache() : {};
  currentPublicFindingPresentations = rankPublicFindingPresentations(buildPublicFindingPresentations(cache.clinicalConcerns || []));
  return currentPublicFindingPresentations;
}

function findRelatedPublicFindingPresentation(context = {}) {
  const presentations = getCurrentPublicFindingPresentations();
  if (!presentations.length) return null;
  const sourceId = context.finding?.id || context.id || "";
  if (sourceId) {
    const exact = presentations.find(presentation => (presentation.sourceIds || []).includes(sourceId) || presentation.id === sourceId);
    if (exact) return exact;
  }
  const refs = new Set(context.evidenceRefs || context.finding?.evidenceRefs || []);
  const terms = [
    ...(context.terms || []),
    context.title,
    context.finding?.title,
    context.finding?.summary,
  ].map(value => publicDisplayText(value)).filter(Boolean);
  let best = null;
  let bestScore = 0;
  for (const presentation of presentations) {
    const text = publicFindingSearchText(presentation);
    let score = 0;
    for (const term of terms) {
      const normalized = term.toLowerCase();
      if (!normalized || normalized.length < 3) continue;
      if (text.includes(normalized)) score += normalized.length > 8 ? 3 : 1;
    }
    const findingRefs = new Set(presentation.sourceFinding?.evidenceRefs || presentation.signal?.evidenceRefs || []);
    for (const ref of refs) if (findingRefs.has(ref)) score += 4;
    if (score > bestScore) {
      best = presentation;
      bestScore = score;
    }
  }
  return bestScore >= 2 ? best : null;
}

function renderRelatedFindingButton(context = {}, label = "Related finding") {
  const presentation = findRelatedPublicFindingPresentation(context);
  if (!presentation) return "";
  return `<button type="button" class="related-finding-btn" data-action="focus-priority" data-tab="overview" data-target="${safeAttr(presentation.targetElementId)}">${safePublicHtml(label)}</button>`;
}

function renderFindingContextBadges(presentation = {}, options = {}) {
  const badges = findingContextBadges(presentation).slice(0, options.patient ? 3 : 5);
  if (!badges.length) return "";
  const className = options.patient ? "finding-context-badges patient-context-badges" : "finding-context-badges";
  return `<div class="${className}">${badges.map(label => `<span class="finding-tag context">${safePublicHtml(label)}</span>`).join("")}</div>`;
}

function findingContextBadges(presentation = {}) {
  const finding = presentation.sourceFinding || {};
  const signal = presentation.signal || null;
  const trust = presentation.trustContract || null;
  const domain = String(finding.clinicalConcernDomain || trust?.concernCategory || "").toLowerCase();
  const geneEvidenceText = publicDisplayText([
    signal?.gene,
    signal?.marker,
    signal?.phenotype,
    signal?.label,
    ...(finding.tags || []),
    ...(presentation.tags || []),
    ...(finding.sourceRows || []).flatMap(row => [
      row.gene,
      row.marker,
      row.genotype,
      row.phenotype,
      row.result,
      row.type,
      row.category,
      row.sourceType,
    ]),
  ].join(" ")).toLowerCase();
  const text = publicDisplayText([
    presentation.title,
    presentation.whatChanged,
    presentation.whyItMatters,
    presentation.whatToReview,
    signal?.contextKind,
    signal?.kind,
    ...(presentation.tags || []),
  ].join(" ")).toLowerCase();
  const badges = [];
  const add = label => {
    if (label && !badges.includes(label)) badges.push(label);
  };
  if (
    signal ||
    /\b(?:pgx|pharmacogen|genotype|phenotype|gene result|risk marker|poor metabolizer|intermediate metabolizer|ultrarapid metabolizer|deficiency|present|g6pd|hla|dpyd|tpmt|nudt|slco1b1|vkorc1|ugt1a1|cyp2c9|cyp2c19|cyp2d6)\b/.test(geneEvidenceText)
  ) add("Gene result");
  if (/food_biomarker|food\/biomarker|diet-derived|food-toxicology|glycoalkaloid|solanidine|solanine|chaconine|potatoes?/.test(text)) {
    add("Food context");
    add("Biomarker");
  }
  if (/risk.marker|hypersensitivity|scar|g6pd|hla/.test(domain + " " + text)) add("Risk marker");
  if (/activation|prodrug|active-form|active form/.test(domain + " " + text)) add("Active metabolite");
  if (/active-metabolite accumulation|active metabolite .*rise|o-desmethyltramadol|morphine|endoxifen|active thiol/.test(domain + " " + text)) add("Active metabolite");
  if (/toxic-metabolite|toxic metabolite|sn-38|5-fluorouracil|6-tgn|hydroxylamine/.test(domain + " " + text)) add("Toxic metabolite");
  if (/parent accumulation|parent-drug|parent drug|exposure may rise|exposure\/toxicity|levels? may rise/.test(domain + " " + text)) add("Parent drug");
  if (/parent-metabolite|mixed direction|balance/.test(domain + " " + text)) add("Parent + metabolite");
  if (/washout|persistence|timing/.test(domain)) add("Timing");
  if (/absorption|chelation/.test(domain) || /\b(?:food absorption|with food|empty stomach)\b/.test(text)) add("Absorption");
  return badges;
}

function renderPublicFindingCard(presentation, index = 0) {
  if (!presentation) return "";
  const severity = safeChoice(presentation.severity, ["critical","severe","moderate","monitor","info"], "info");
  const finding = presentation.sourceFinding || {};
  const tags = (presentation.tags || []).slice(0, 6).map(tag => `<span class="finding-tag">${safePublicHtml(tag)}</span>`).join("");
  const grouped = finding.groupedFindings?.length
    ? `<span class="finding-tag">${finding.groupedFindings.length + 1} grouped signals</span>`
    : "";
  const supportingSignals = renderConcernSupportingSignals(finding);
  const sourceLabel = safePublicHtml(String(finding.source || finding.type || "finding").replace(/_/g, " "));
  const patient = isPatientAudience();
  const title = patient ? patientFindingTitleText(presentation) : presentation.title;
  const trust = presentation.trustContract || (typeof buildV1FindingTrustContract === "function" ? buildV1FindingTrustContract(finding, { stack:activeStack }) : null);
  const changedText = patient ? patientFindingStepText(presentation, "changed") : presentation.whatChanged;
  const whyText = patient ? patientFindingStepText(presentation, "why") : clinicianOverviewWhyText(presentation);
  const reviewText = patient ? patientFindingStepText(presentation, "review") : clinicianOverviewActionText(presentation, presentation.whatToReview);
  const detailButton = !patient && presentation.detailTab && presentation.detailElementId
    ? `<button type="button" class="related-finding-btn secondary" data-action="focus-priority" data-tab="${safeAttr(presentation.detailTab)}" data-target="${safeAttr(presentation.detailElementId)}">Supporting detail</button>`
    : "";
  const sourceLinks = patient ? "" : renderFindingSourceLinks(presentation, trust);
  const severityLabel = patient ? patientSeverityLabel(severity) : severity;
  const discussionGuide = renderFindingDiscussionGuide(presentation, trust, patient);
  const monitoringGuide = renderFindingMonitoringGuide(presentation, trust, patient);
  const followupGuide = !patient && typeof isReviewerMode === "function" && !isReviewerMode() && (discussionGuide || monitoringGuide)
    ? `<details class="finding-followup-details"><summary>Review notes</summary>${discussionGuide}${monitoringGuide}</details>`
    : `${discussionGuide}${monitoringGuide}`;
  const actionHtml = detailButton || sourceLinks
    ? `<div class="finding-actions">${detailButton}${sourceLinks}</div>`
    : "";
  const technicalDetail = patient ? "" : `<details class="finding-support-details">
      <summary>Supporting detail</summary>
      ${renderFindingTrustDetails(trust)}
      ${supportingSignals}
      <div class="finding-meta">
        <span class="finding-tag type">${sourceLabel}</span>
        <span class="finding-tag">confidence: ${safePublicHtml(finding.confidence || presentation.signal?.label || "unknown")}</span>
        <span class="finding-tag">${safePublicHtml(publicEvidenceSummaryForFinding(finding || {}))}</span>
        ${grouped}
        ${tags}
      </div>
    </details>`;
  return `<div id="${safeAttr(presentation.targetElementId)}" class="finding-card primary-finding-card ${severity}" data-finding-id="${safeAttr(presentation.id)}">
    <div class="finding-top">
      <div>
        <div class="finding-title">${safePublicHtml(title)}</div>
        <div class="finding-subtitle">${safePublicHtml((presentation.affectedSubstances || []).join(" + ") || "current stack")}</div>
      </div>
      <span class="finding-sev ${severity}">${safePublicHtml(severityLabel)}</span>
    </div>
    ${renderFindingTrustStrip(trust, patient)}
    <div class="finding-explain">
      ${renderFindingNoteLine(changedText)}
      ${renderFindingNoteLine(whyText)}
      ${renderFindingNoteLine(reviewText, "review")}
    </div>
    ${followupGuide}
    ${actionHtml}
    ${technicalDetail}
  </div>`;
}

function renderFindingDiscussionGuide(presentation = {}, trust = null, patient = false) {
  const text = patient
    ? buildPatientDiscussionQuestion(presentation, trust)
    : buildClinicianDiscussionGuide(presentation, trust);
  if (!text) return "";
  const label = patient ? "Question to ask" : "Discussion guide";
  return `<div class="finding-discussion">
    <div class="finding-discussion-label">${safePublicHtml(label)}</div>
    <div class="finding-discussion-text">${safePublicHtml(text)}</div>
  </div>`;
}

function clinicianOverviewWhyText(presentation = {}) {
  const why = publicDisplayText(presentation.whyItMatters || "");
  if (!why) return "";
  const changed = publicDisplayText(presentation.whatChanged || "");
  const whyNorm = normalizeClinicianOverviewText(why);
  const changedNorm = normalizeClinicianOverviewText(changed);
  const firstWhyClause = whyNorm.split(/[.;]/)[0]?.trim() || "";
  if (
    (firstWhyClause.length > 60 && changedNorm.includes(firstWhyClause.slice(0, 60))) ||
    (whyNorm.length > 80 && changedNorm.includes(whyNorm.slice(0, 80)))
  ) {
    return "Same mechanism as the expected-change statement above; source detail is grouped in Evidence.";
  }
  return why;
}

function hasAntiplateletPatientContext(text = "") {
  return /\b(?:clopidogrel|ticlopidine|prasugrel|ticagrelor|p2y12|antiplatelet|stent|active thiol|thienopyridine)\b/i.test(String(text || ""));
}

function hasActiveMetabolitePatientContext(text = "") {
  const value = String(text || "").toLowerCase();
  if (/\b(?:activation failure|prodrug|bioactivation|reduced activation)\b/.test(value)) return true;
  const activeFormCue = /\b(?:active metabolite|morphine|endoxifen|thiol metabolite|o-desmethyltramadol|m1)\b/.test(value);
  const reducedEffectCue = /\b(?:work less well|less effective|reduced efficacy|loss of efficacy|efficacy loss|may be reduced|complete loss|blocked)\b/.test(value);
  return activeFormCue && reducedEffectCue;
}

function hasToxicMetabolitePatientContext(text = "") {
  return /\b(?:toxic metabolite|accumulat(?:e|ion)|5-fluorouracil|5-fu|sn-38|6-tgn|6-thioguanine|life-threatening toxicity|myelosuppression|neutropenia|mucositis|severe side effects)\b/i.test(String(text || ""));
}

function hasOpioidActiveMetaboliteIncreaseContext(text = "") {
  const value = String(text || "").toLowerCase();
  return /\b(?:codeine|tramadol)\b/.test(value) &&
    /\b(?:morphine|o-desmethyltramadol|m1|opioid-active|active metabolite)\b/.test(value) &&
    /\b(?:rise|increase|higher|ultrarapid|toxicity|respiratory depression|side-effect)\b/.test(value);
}

function patientRiskMarkerContext(text = "") {
  const value = String(text || "").toLowerCase();
  if (/\bg6pd\b|hemolys|methemoglobin|oxidant/.test(value)) return "g6pd";
  if (/malignant hyperthermia|ryr1|cacna1s|anesthesia trigger/.test(value)) return "malignant_hyperthermia";
  if (/bche|paralysis|apnea|neuromuscular blockade/.test(value)) return "procedural_paralysis";
  if (/abacavir/.test(value) && (/\bhla(?:-[ab]\*?[0-9:]+)?\b/.test(value) || /\bhypersens/i.test(value))) return "abacavir_hypersensitivity";
  if (/allopurinol/.test(value) && (/\bhla(?:-[ab]\*?[0-9:]+)?\b/.test(value) || /\bscar\b|\bsjs\b|\bten\b|\bdress\b|skin reaction/.test(value))) return "allopurinol_scar";
  if (/\bhla(?:-[ab]\*?[0-9:]+)?\b|\bhypersens/i.test(value) || /\bscar\b|\bsjs\b|\bten\b/.test(value)) return "hypersensitivity";
  return "";
}

function hasPatientStatinMuscleConcern(text = "") {
  return /\b(?:statin|simvastatin|atorvastatin|lovastatin|pravastatin|rosuvastatin|fluvastatin|pitavastatin|rhabdomyolysis|myopathy|muscle injury|muscle breakdown)\b/i.test(String(text || ""));
}

function hasPatientMethotrexateToxicityConcern(text = "") {
  return /\b(?:methotrexate|mucositis|pancytopenia|bone marrow|marrow toxicity|myelosuppression|mouth sores)\b/i.test(String(text || ""));
}

function hasPatientTacrolimusToxicityConcern(text = "") {
  return /\b(?:tacrolimus|calcineurin|transplant|nephrotoxicity|neurotoxicity|tacrolimus toxicity)\b/i.test(String(text || ""));
}

function hasPatientNebivololGeneContext(text = "") {
  return /\bnebivolol\b/i.test(String(text || "")) &&
    /\b(?:cyp2d6|gene|genotype|pgx|exposure)\b/i.test(String(text || ""));
}

function hasPatientMetoprololGeneContext(text = "") {
  return /\bmetoprolol\b/i.test(String(text || "")) &&
    /\b(?:cyp2d6|gene|genotype|pgx|exposure|level|clearance|poor metabolizer|ultrarapid)\b/i.test(String(text || ""));
}

function hasPatientAtomoxetineGeneContext(text = "") {
  return /\batomoxetine\b/i.test(String(text || "")) &&
    /\b(?:cyp2d6|gene|genotype|pgx|exposure|level|clearance|poor metabolizer|ultrarapid)\b/i.test(String(text || ""));
}

function hasPatientFoodBiomarkerContext(text = "") {
  return /\b(?:food\/biomarker|food biomarker|diet-derived|food-toxicology|biomarker|solanidine|solanine|chaconine|glycoalkaloid|potatoes?)\b/i.test(String(text || ""));
}

function hasPatientHyperkalemiaConcern(text = "") {
  return /\b(?:hyperkalemia|high potassium|potassium)\b/i.test(String(text || ""));
}

function hasPatientHypotensionConcern(text = "") {
  return /\b(?:hypotension|low blood pressure|blood pressure|syncope|fainting|vasodil|pde5|nitrate|nitroglycerin|sildenafil|tadalafil)\b/i.test(String(text || ""));
}

function hasPatientBradycardiaConcern(text = "") {
  return /\b(?:bradycardia|slow heart|slow pulse|heart-rate|heart rate|ivabradine)\b/i.test(String(text || ""));
}

function hasPatientAbsorptionConcern(text = "") {
  return /\b(?:absorption|chelat|gastric|acid suppression|binder|bioavailability|separate .* from|reduced antibiotic exposure|reduced antiviral exposure)\b/i.test(String(text || ""));
}

function hasPatientExposureDecreaseConcern(text = "") {
  return /\b(?:exposure may fall|exposure or effect may fall|effect may fall|lower exposure|reduced exposure|loss of efficacy|efficacy loss|less effective|induction\/loss of efficacy|induction|reduced expected effect)\b/i.test(String(text || ""));
}

function hasPatientExposureIncreaseConcern(text = "") {
  return /\b(?:exposure may rise|levels? may rise|level risk|higher exposure|raise exposure|raises exposure|toxicity review priority|side-effect risk|adverse-effect risk)\b/i.test(String(text || ""));
}

function patientUsesSerotonergicAgent(name = "") {
  const value = String(name || "").toLowerCase();
  if (!value) return false;
  const drug = typeof getDrug === "function" ? getDrug(name) : null;
  if (drug?.props?.serotonergic) return true;
  return /\b(?:fluoxetine|paroxetine|sertraline|citalopram|escitalopram|fluvoxamine|venlafaxine|desvenlafaxine|duloxetine|levomilnacipran|milnacipran|phenelzine|tranylcypromine|isocarboxazid|linezolid|methylene blue|selegiline|rasagiline)\b/.test(value);
}

function hasPatientSerotoninConcern(text = "", actors = []) {
  if (/\b(?:serotonin|ssri|snri|maoi)\b/i.test(String(text || ""))) return true;
  return (actors || []).filter(patientUsesSerotonergicAgent).length >= 2;
}

function patientConcernCategoryKey(trust = null) {
  return String(trust?.concernCategory || "").toLowerCase();
}

function patientTimingConcern(presentation = {}, trust = null) {
  const concern = patientConcernCategoryKey(trust);
  if (/washout|persistence/.test(concern)) return true;
  const coreText = publicDisplayText([
    presentation?.title,
    presentation?.whatChanged,
    presentation?.whyItMatters,
  ].filter(Boolean).join(" ")).toLowerCase();
  return /\b(?:washout|overlap|switch(?:ing)?|persist(?:s|ence)?|enzyme recovery)\b/.test(coreText);
}

function hasPatientSedationConcern(text = "") {
  return /\b(?:sedation|sleepiness|breathing|confusion|cns depression|respiratory depression|slowed breathing|drows(?:iness)?|falls|fall[-\s]?risk|delirium|anticholinergic syndrome)\b/i.test(String(text || ""));
}

function hasPatientAnticholinergicConcern(text = "") {
  return /\b(?:anticholinergic|dry mouth|constipation|trouble urinating|urinary retention|blurred vision|delirium|confusion|fall[-\s]?risk|beers)\b/i.test(String(text || ""));
}

function buildPatientDiscussionQuestion(presentation = {}, trust = null) {
  const title = patientFindingTitleText(presentation);
  const text = publicDisplayText([
    title,
    presentation.whatChanged,
    presentation.whyItMatters,
    trust?.concernCategory,
    trust?.expectedChange,
    trust?.clinicalConcern,
  ].join(" ")).toLowerCase();
  const actors = (presentation.affectedSubstances || []).filter(Boolean);
  const pair = actors.slice(0, 2).join(" + ");
  const concern = patientConcernLabel(trust?.concernCategory || "");
  const riskMarkerKind = patientRiskMarkerContext(text);
  const timingPresentation = patientTimingPresentation(presentation, trust);
  const topic = concern && concern !== "Safety note" ? concern.toLowerCase() : "this safety note";
  let question = pair
    ? `Can you check whether ${pair} needs closer review?`
    : `Can you check ${topic} for my medication list?`;
  if (riskMarkerKind === "g6pd") {
    question = "Can you check whether my G6PD result changes whether these medicines are safe for me?";
  } else if (riskMarkerKind === "abacavir_hypersensitivity") {
    question = "Can you check whether my gene result raises serious allergy risk with Abacavir?";
  } else if (riskMarkerKind === "allopurinol_scar") {
    question = "Can you check whether my gene result raises serious skin-reaction risk with Allopurinol?";
  } else if (riskMarkerKind === "malignant_hyperthermia" || riskMarkerKind === "procedural_paralysis") {
    question = "Can you check whether my gene result changes anesthesia safety for me?";
  } else if (riskMarkerKind) {
    question = "Can you check whether my gene result raises serious allergy or skin-reaction risk with this medicine?";
  } else if (timingPresentation) {
    question = "Can you check whether timing, overlap, or washout matters for this list?";
  } else if (hasPatientStatinMuscleConcern(text)) {
    question = "Can you check whether this combination could raise muscle pain or muscle injury risk?";
  } else if (hasPatientMethotrexateToxicityConcern(text)) {
    question = "Can you check whether this combination could make Methotrexate side effects or lab problems stronger?";
  } else if (hasPatientTacrolimusToxicityConcern(text)) {
    question = "Can you check whether this combination could raise Tacrolimus side effects or monitoring needs?";
  } else if (hasPatientNebivololGeneContext(text)) {
    question = "Can you check whether my gene result and current medicines could raise Nebivolol side effects or monitoring needs?";
  } else if (hasPatientMetoprololGeneContext(text)) {
    question = "Can you check whether my gene result could raise Metoprolol side effects, pulse, blood pressure, or monitoring needs?";
  } else if (hasPatientAtomoxetineGeneContext(text)) {
    question = "Can you check whether my gene result could raise Atomoxetine side effects, dose tolerance, pulse, or blood pressure concerns?";
  } else if (hasPatientFoodBiomarkerContext(text)) {
    question = "Can you check whether this is only food or biomarker context, and whether any symptoms or unusual exposure need review?";
  } else if (hasPatientHyperkalemiaConcern(text)) {
    question = "Can you check whether this list could raise potassium or kidney-related monitoring concerns?";
  } else if (hasPatientHypotensionConcern(text)) {
    question = "Can you check whether this combination could cause low blood pressure, dizziness, or fainting?";
  } else if (hasPatientBradycardiaConcern(text)) {
    question = "Can you check whether this combination could slow my heart rate or pulse too much?";
  } else if (hasPatientAbsorptionConcern(text)) {
    question = actors[0]
      ? `Can you check whether ${actors[0]} may not absorb as expected with my current list?`
      : "Can you check whether one of my medicines may not absorb as expected?";
  } else if (hasOpioidActiveMetaboliteIncreaseContext(text)) {
    question = "Can you check whether my gene result could raise opioid side effects or breathing-risk concerns?";
  } else if (hasPatientSerotoninConcern(text, actors)) {
    question = "Can you check whether this combination raises serotonin-related side effects or switching concerns?";
  } else if (hasAntiplateletPatientContext(text) || hasActiveMetabolitePatientContext(text)) {
    question = actors[0]
      ? `Can you check whether ${actors[0]} may work less well with my current list?`
      : "Can you check whether one of my medicines may work less well with my current list?";
  } else if (hasPatientExposureDecreaseConcern(text)) {
    question = actors[0]
      ? `Can you check whether ${actors[0]} may work less well with my current list?`
      : "Can you check whether one of my medicines may work less well with my current list?";
  } else if (hasPatientExposureIncreaseConcern(text)) {
    question = actors[0]
      ? `Can you check whether ${actors[0]} side effects or monitoring needs could increase?`
      : "Can you check whether side effects or monitoring needs could increase?";
  } else if (hasToxicMetabolitePatientContext(text)) {
    question = actors[0]
      ? `Can you check whether ${actors[0]} could build up and cause stronger side effects for me?`
      : "Can you check whether one of my medicines could build up and cause stronger side effects?";
  } else if (/bleed|inr|anticoag|warfarin|platelet|clot/.test(text)) {
    question = pair
      ? `Can you check whether ${pair} needs closer bleeding or clotting monitoring?`
      : "Can you check whether my list needs closer bleeding or clotting monitoring?";
  } else if (/qt|torsades|arrhythm|heart rhythm|bradycard/.test(text)) {
    question = pair
      ? `Can you check whether ${pair} needs heart-rhythm review?`
      : "Can you check whether my list needs heart-rhythm review?";
  } else if (hasPatientAnticholinergicConcern(text)) {
    question = "Can you check whether this list raises confusion, constipation, urination, or fall risk?";
  } else if (hasPatientSedationConcern(text)) {
    question = "Can you check whether this list raises sleepiness, breathing, confusion, or fall risk?";
  }
  return question;
}

function buildClinicianDiscussionGuide(presentation = {}, trust = null) {
  const affected = (presentation.affectedSubstances || []).join(" + ") || trust?.affected || "current stack";
  const change = trust?.expectedChange || presentation.whatChanged || "";
  const concern = trust?.clinicalConcern || presentation.whyItMatters || "";
  const action = clinicianOverviewActionText(presentation, trust?.clinicianAction || presentation.whatToReview || "");
  return [
    `Review ${affected}.`,
    change,
    concern,
    action ? `Review: ${action}` : "",
  ].filter(Boolean).join(" ");
}

function renderFindingMonitoringGuide(presentation = {}, trust = null, patient = false) {
  const items = buildFindingMonitoringItems(presentation, trust, { patient });
  if (!items.length) return "";
  return `<div class="finding-monitoring">
    <div class="finding-monitoring-label">${safePublicHtml(patient ? "Tell them if" : "Monitoring focus")}</div>
    <ul class="finding-monitoring-list">
      ${items.map(item => `<li>${safePublicHtml(item)}</li>`).join("")}
    </ul>
  </div>`;
}

function buildPatientMentionSummaryItems(presentations = getCurrentPublicFindingPresentations()) {
  const rows = isPatientAudience() ? getPatientFacingPublicFindingPresentations(presentations) : (presentations || []);
  const items = [];
  const add = (item) => {
    const clean = publicDisplayText(item);
    if (clean && !items.includes(clean)) items.push(clean);
  };
  const shown = rows.length ? rows.slice(0, 4) : [null];
  for (const presentation of shown) {
    for (const item of buildFindingMonitoringItems(presentation || {}, presentation?.trustContract || null, { patient:true })) {
      add(item);
    }
  }
  return items.slice(0, 6);
}

function buildFindingMonitoringItems(presentation = {}, trust = null, options = {}) {
  const patient = !!options.patient;
  const text = publicDisplayText([
    presentation?.title,
    presentation?.whatChanged,
    presentation?.whyItMatters,
    presentation?.whatToReview,
    ...(presentation?.tags || []),
    trust?.concernCategory,
    trust?.expectedChange,
    trust?.clinicalConcern,
    trust?.clinicianAction,
  ].filter(Boolean).join(" ")).toLowerCase();
  const items = [];
  const add = (item) => {
    const clean = publicDisplayText(item);
    if (clean && !items.includes(clean)) items.push(clean);
  };
  const timingConcern = patientTimingConcern(presentation, trust);
  const toxicMetabolite = hasToxicMetabolitePatientContext(text);
  const riskMarkerKind = patientRiskMarkerContext(text);
  if (patient) {
    if (/statin|simvastatin|atorvastatin|rosuvastatin|pravastatin|lovastatin|myopathy|rhabdomyolysis|muscle injury|muscle pain/.test(text)) {
      add("New muscle pain or weakness, dark urine, fever, or feeling very unwell.");
    }
    add("New or worsening symptoms, side effects, missed doses, or recent dose changes.");
    if (hasAntiplateletPatientContext(text)) {
      add("Symptoms the medicine is meant to prevent or treat, especially if they are new or getting worse.");
      add("Any recent changes to stomach acid medicines, antibiotics, seizure medicines, or herbal products.");
    } else if (hasActiveMetabolitePatientContext(text)) {
      add("Symptoms the medicine is meant to prevent or treat, especially if they are new, getting worse, or not improving as expected.");
      add("Any recent changes to antidepressants, antibiotics, seizure medicines, or herbal products.");
    } else if (toxicMetabolite) {
      add("Severe diarrhea, vomiting, mouth sores, fever, infection symptoms, unusual bruising, or extreme tiredness.");
    }
    if (/bleed|inr|anticoag|warfarin|platelet|clot|hemostasis/.test(text)) {
      add("Unusual bruising, bleeding, dark stools, severe headache, or clot-related symptoms.");
    }
    if (/qt|torsades|arrhythm|heart rhythm|bradycard|electrolyte/.test(text)) {
      add("Fainting, palpitations, chest pain, severe dizziness, vomiting, or dehydration.");
    }
    if (/nebivolol|beta[-\s]?block|slow pulse|slow heart|bradycard/.test(text)) {
      add("Dizziness, fainting, unusual fatigue, very slow pulse, low blood pressure symptoms, shortness of breath, or wheezing.");
    }
    if (hasPatientAnticholinergicConcern(text)) {
      add("Confusion, dry mouth, constipation, trouble urinating, blurred vision, or falls.");
    }
    if (hasPatientSedationConcern(text)) {
      add("Extreme sleepiness, confusion, falls, slowed breathing, constipation, or trouble urinating.");
    }
    if (/serotonin|ssri|snri|maoi|linezolid|methylene blue/.test(text)) {
      add("Agitation, fever, sweating, diarrhea, tremor, stiffness, or unusual restlessness.");
    }
    if (/hypogly|glucose|diabetes|insulin|sulfonylurea/.test(text)) {
      add("Shakiness, sweating, confusion, weakness, or very high or low blood sugar readings.");
    }
    if (riskMarkerKind === "g6pd") {
      add("Dark urine, yellowing skin or eyes, shortness of breath, blue or gray lips, sudden weakness, or severe tiredness.");
    }
    if (riskMarkerKind === "malignant_hyperthermia" || riskMarkerKind === "procedural_paralysis") {
      add("Tell the care team about prior anesthesia problems, family history, fever with anesthesia, or unusually long paralysis after a procedure.");
    }
    if (timingConcern) {
      add("Last dose dates, planned switch dates, overlap periods, and symptoms after stopping or starting.");
    }
    if (/auc|cmax|exposure|level|concentration|toxicity|renal|hepatic|kidney|liver|clearance|tdm|nephro|electrolyte/.test(text)) {
      add("Nausea, weakness, confusion, less urination, yellowing skin or eyes, or severe side effects.");
    }
    if (/infection|immunosupp|neutrop|myelosuppression|marrow|cytopenia/.test(text)) {
      add("Fever, infection symptoms, mouth sores, unusual bruising, or unusual tiredness.");
    }
    return items.slice(0, 4);
  }
  add("Current symptoms, indication, dose changes, adherence, and last-dose timing.");
  if (hasAntiplateletPatientContext(text) || hasActiveMetabolitePatientContext(text)) {
    add("Therapeutic failure risk, indication acuity, adherence, genotype/phenotype context, and alternative selection.");
  }
  if (/bleed|inr|anticoag|warfarin|platelet|clot|hemostasis/.test(text)) {
    add("Bleeding/thrombosis history, INR or anticoagulation labs, platelet count, procedure timing, and concomitant antithrombotics.");
  }
  if (/qt|torsades|arrhythm|heart rhythm|bradycard|electrolyte/.test(text)) {
    add("ECG/QTc, potassium, magnesium, calcium, bradycardia, structural heart disease, and other QT-risk medicines.");
  }
  if (/sedation|fall|sleepiness|breathing|confusion|cns|opioid|benzodiazepine|anticholinergic|drows/.test(text)) {
    add("Respiratory status, cognition, falls, driving/work risk, alcohol/CNS depressants, opioid and anticholinergic burden.");
  }
  if (/serotonin|ssri|snri|maoi|linezolid|methylene blue/.test(text)) {
    add("Temperature, clonus/rigidity, tremor, autonomic symptoms, serotonergic burden, and washout timing.");
  }
  if (/hypogly|glucose|diabetes|insulin|sulfonylurea/.test(text)) {
    add("Glucose log, renal function, meal pattern, sick-day context, and concurrent glucose-lowering medicines.");
  }
  if (/washout|persistence|timing|switch|overlap|induction offset/.test(text)) {
    add("Start/stop dates, overlap plan, half-life, induction/recovery offset, and monitoring window.");
  }
  if (/auc|cmax|exposure|level|concentration|toxicity|renal|hepatic|kidney|liver|clearance|tdm|nephro|electrolyte/.test(text)) {
    add("Renal/hepatic function, electrolytes, troughs or levels, toxicity signs, inhibitor/inducer timing, and dose changes.");
  }
  if (/infection|immunosupp|neutrop|myelosuppression|marrow|cytopenia/.test(text)) {
    add("CBC with differential, infection symptoms, immunosuppression burden, prophylaxis/vaccine context, and specialty protocol.");
  }
  return items.slice(0, 5);
}

function renderFindingSourceLinks(presentation = {}, trust = null) {
  const refs = [...new Set([
    ...(trust?.evidenceRefs || []),
    ...(presentation.sourceFinding?.evidenceRefs || []),
    ...(presentation.signal?.evidenceRefs || []),
  ])].filter(Boolean);
  if (!refs.length) {
    return `<button type="button" class="related-finding-btn secondary" data-action="focus-priority" data-tab="evidence" data-target="evidenceLadderLedger">Evidence status</button>`;
  }
  const primaryRef = refs.find(ref => /label|dailymed|fda/i.test(String(ref || ""))) || refs[0];
  const label = compactOverviewEvidenceLabel(primaryRef);
  const url = typeof publicEvidenceReferenceUrl === "function" ? publicEvidenceReferenceUrl(primaryRef) : "";
  const primary = url
    ? `<a class="related-finding-btn secondary source-link" href="${safeAttr(url)}" target="_blank" rel="noopener">${safePublicHtml(label)}</a>`
    : `<button type="button" class="related-finding-btn secondary" data-action="focus-priority" data-tab="evidence" data-target="evidenceLadderLedger">${safePublicHtml(label)}</button>`;
  const more = refs.length > 1
    ? `<button type="button" class="related-finding-btn secondary" data-action="focus-priority" data-tab="evidence" data-target="evidenceLadderLedger">Evidence details</button>`
    : "";
  return `${primary}${more}`;
}

function compactOverviewEvidenceLabel(ref = "") {
  const study = typeof getStudy === "function" ? getStudy(ref) : (typeof STUDY_DB !== "undefined" ? STUDY_DB?.[ref] : null);
  const text = `${ref || ""} ${study?.title || ""} ${study?.type || ""}`.toLowerCase();
  if (/label|dailymed|fda/.test(text)) return "FDA label";
  if (study?.pmid) return `PMID:${study.pmid}`;
  if (study?.doi) return "DOI source";
  if (/guideline|cpic/.test(text)) return "Guideline";
  if (/clinical|pk/.test(text)) return "Clinical PK";
  return "Evidence";
}

function renderFindingTrustStrip(trust, patient = false) {
  if (!trust) return "";
  const applicability = clinicalContextApplicability();
  if (patient) {
    const chips = [
      ["Note", patientConcernLabel(trust.concernCategory)],
      [applicability.label, applicability.value],
      ["Status", trust.clinicalReviewStatus === "reviewed" ? "Reviewed" : "Ask a doctor or pharmacist"],
    ].filter(([, value]) => value);
    return `<div class="finding-trust-strip">
      ${chips.map(([label, value]) => `<span class="finding-trust-chip${label === applicability.label ? " finding-context-applicability" : ""}"${label === applicability.label ? ` data-context-format="labelled" data-context-level="${safeAttr(applicability.level)}"` : ""}><strong>${safePublicHtml(label)}</strong>${safePublicHtml(value)}</span>`).join("")}
    </div>`;
  }
  const refs = trust.evidenceRefs || [];
  const studies = refs.map(ref => typeof getStudy === "function" ? getStudy(ref) : STUDY_DB?.[ref]).filter(Boolean);
  const source = studies.some(study => typeof isAuthorityEvidence === "function" && isAuthorityEvidence(study))
    ? "Authority-linked"
    : studies.some(study => typeof isPrimaryLiteratureEvidence === "function" && isPrimaryLiteratureEvidence(study))
      ? "Primary-literature linked"
      : studies.length && studies.every(study => typeof isModeledContextEvidence === "function" && isModeledContextEvidence(study))
        ? "Modeled context"
        : trust.sourceLinked
          ? "Linked source"
          : "Modeled signal";
  const confidence = compactTrustConfidenceLabel(trust.confidence);
  const chips = [
    trust.concernCategory,
    source,
    confidence ? `Mechanism: ${confidence}` : "",
    `${applicability.label}: ${applicability.value}`,
  ].filter(Boolean);
  return `<div class="finding-trust-strip">
    ${chips.map(value => `<span class="finding-trust-chip${value.startsWith(`${applicability.label}:`) ? " finding-context-applicability" : ""}"${value.startsWith(`${applicability.label}:`) ? ` data-context-format="inline" data-context-level="${safeAttr(applicability.level)}"` : ""}>${safePublicHtml(value)}</span>`).join("")}
  </div>`;
}

function compactTrustConfidenceLabel(value = "") {
  const text = publicDisplayText(value);
  if (/high/i.test(text)) return "High";
  if (/moderate/i.test(text)) return "Moderate";
  if (/low|limited/i.test(text)) return "Limited";
  return text.trim();
}

function patientConcernLabel(value = "") {
  const key = String(value || "").toLowerCase();
  if (/hypersensitivity|scar/.test(key)) return "Allergic or skin reaction";
  if (/risk-marker/.test(key)) return "Gene-related safety risk";
  if (/toxic-metabolite/.test(key)) return "Stronger side effects may happen";
  if (/activation|prodrug|effectiveness/.test(key)) return "Medicine may work differently";
  if (/bleed|clot|anticoag|platelet|hemostasis/.test(key)) return "Bleeding or clotting";
  if (/heart|qt|rhythm|brady/.test(key)) return "Heart rhythm";
  if (/anticholinergic|fall/.test(key)) return "Confusion or falls";
  if (/sedation|fall|cns|sleep|breath/.test(key)) return "Sleepiness or falls";
  if (/washout|timing|persistence/.test(key)) return "Timing may matter";
  if (/exposure|toxicity|level|concentration/.test(key)) return "Side effects may change";
  return "Safety note";
}

function renderFindingTrustDetails(trust) {
  if (!trust) return "";
  const rows = [
    ["Mechanism", trust.mechanism],
    ["Expected change", trust.expectedChange],
    ["Clinical concern", trust.clinicalConcern],
    ["Clinician action", trust.clinicianAction],
    ["Evidence", trust.evidence],
    ["Status", trust.limitationStatus],
  ].filter(([, value]) => value);
  return `<div class="finding-trust-details">
    <div class="finding-trust-title">Review basis</div>
    <div class="finding-trust-grid">
      ${rows.map(([label, value]) => `<div class="finding-trust-row"><strong>${safePublicHtml(label)}</strong><span>${safePublicHtml(value)}</span></div>`).join("")}
    </div>
  </div>`;
}

function patientFindingStepText(presentation = {}, field = "changed") {
  const text = publicDisplayText([
    presentation.title,
    presentation.whatChanged,
    presentation.whyItMatters,
    presentation.whatToReview,
    ...(presentation.tags || []),
  ].join(" "));
  const actors = (presentation.affectedSubstances || []).filter(Boolean);
  const severity = safeChoice(presentation.severity, ["critical","severe","moderate","monitor","info"], "info");
  const serious = severity === "critical" || severity === "severe";
  const lower = text.toLowerCase();
  const riskMarkerKind = patientRiskMarkerContext(lower);
  const toxicMetabolite = hasToxicMetabolitePatientContext(lower);
  const timingPresentation = patientTimingPresentation(presentation, presentation?.trustContract || null);
  if (field === "changed") {
    if (hasPatientNebivololGeneContext(lower)) {
      return "Your gene result and current medicines may raise nebivolol levels and side-effect risk, so follow-up may be needed.";
    }
    if (hasPatientMetoprololGeneContext(lower)) {
      return "Your gene result may raise metoprolol levels, so pulse, blood pressure, dizziness, tiredness, or dose tolerance may need review.";
    }
    if (hasPatientAtomoxetineGeneContext(lower)) {
      return "Your gene result may raise atomoxetine levels, so side effects, dose tolerance, sleep, appetite, pulse, or blood pressure may need review.";
    }
    if (hasPatientFoodBiomarkerContext(lower)) {
      return "This is food and biomarker context. It does not mean ordinary potatoes are unsafe, and it is not medication-style avoidance advice.";
    }
    if (timingPresentation) {
      return "Timing may matter because some effects can last after a medicine is changed.";
    }
    if (riskMarkerKind === "g6pd") {
      return "A known G6PD result can make some medicines much riskier because they can damage red blood cells or reduce oxygen carrying capacity.";
    }
    if (riskMarkerKind === "abacavir_hypersensitivity") {
      return "A known gene result can make abacavir much more likely to cause a serious allergic reaction.";
    }
    if (riskMarkerKind === "allopurinol_scar") {
      return "A known gene result can make allopurinol much more likely to cause a serious skin reaction.";
    }
    if (riskMarkerKind === "malignant_hyperthermia" || riskMarkerKind === "procedural_paralysis") {
      return "A known gene result may change anesthesia safety and needs to be reviewed before a procedure.";
    }
    if (riskMarkerKind) {
      return "A known gene result may make this medicine more likely to cause a serious allergic or skin reaction.";
    }
    if (hasPatientStatinMuscleConcern(lower)) {
      return "This combination may raise statin levels and increase muscle side-effect risk.";
    }
    if (hasPatientMethotrexateToxicityConcern(lower)) {
      return "This combination may raise methotrexate levels and increase serious side-effect risk.";
    }
    if (hasPatientTacrolimusToxicityConcern(lower)) {
      return "This combination may raise tacrolimus levels and increase side-effect or monitoring risk.";
    }
    if (hasPatientHyperkalemiaConcern(lower)) {
      return "This combination may raise potassium-related safety or kidney-monitoring concerns.";
    }
    if (hasPatientHypotensionConcern(lower)) {
      return "This combination may increase low blood pressure, dizziness, or fainting risk.";
    }
    if (hasPatientBradycardiaConcern(lower)) {
      return "This combination may slow heart rate or pulse too much.";
    }
    if (hasPatientAbsorptionConcern(lower)) {
      return "This combination may reduce how much of one medicine is absorbed.";
    }
    if (hasOpioidActiveMetaboliteIncreaseContext(lower)) {
      return "Your gene result may form more opioid-active metabolite, which can raise side-effect or breathing-risk concerns.";
    }
    if (hasPatientSerotoninConcern(lower, actors)) {
      return "This combination may add serotonin-related side-effect risk.";
    }
    if (hasPatientExposureDecreaseConcern(lower)) {
      return "This combination may make one medicine work less well.";
    }
    if (hasPatientExposureIncreaseConcern(lower)) {
      return "This combination may raise medicine levels and increase side-effect or monitoring risk.";
    }
    if (toxicMetabolite) {
      return serious
        ? "This medicine may build up into a more harmful form and raise serious side-effect risk."
        : "This medicine may build up and change side-effect risk.";
    }
    if (hasAntiplateletPatientContext(lower)) {
      return serious
        ? "This combination may make an antiplatelet medicine work less well, which can raise clot-related risk."
        : "This combination may change how well an antiplatelet medicine works.";
    }
    if (hasActiveMetabolitePatientContext(lower)) {
      return serious
        ? "This combination may make one medicine work less well because the body may form less of its active effect."
        : "This combination may change how well one medicine works.";
    }
    if (/bleed|inr|anticoag|warfarin|platelet|clot/.test(lower)) {
      return serious
        ? "This combination may raise bleeding or clotting-related risk and may need closer monitoring."
        : "This combination may affect bleeding or clotting-related monitoring.";
    }
    if (/qt|torsades|arrhythm|heart rhythm|bradycard/.test(lower)) {
      return serious
        ? "This combination may increase heart-rhythm risk and should be checked carefully."
        : "This combination may add heart-rhythm monitoring concerns.";
    }
    if (hasPatientAnticholinergicConcern(lower)) {
      return "This combination may increase confusion, constipation, dry mouth, urination trouble, or fall risk.";
    }
    if (/sedation|falls?\s+risk|fall-risk|cns|opioid|benzodiazepine|drows/.test(lower)) {
      return "This combination may increase sleepiness, confusion, breathing, or fall risk.";
    }
    if (/auc|exposure|level|concentration|metabol|cyp|enzyme|genotype|pgx|clearance/.test(lower)) {
      return "This may change how strongly a medication works or how long it stays active.";
    }
    return serious
      ? "This is the most important safety note found for the current list."
      : "This is a safety note to review for the current list.";
  }
  if (field === "why") {
    if (hasPatientNebivololGeneContext(lower)) {
      return "Nebivolol can become more sensitive to gene-related processing differences, especially when another medicine pushes levels even higher.";
    }
    if (hasPatientMetoprololGeneContext(lower)) {
      return "Metoprolol can become more sensitive when CYP2D6 processing is lower, so pulse and blood-pressure effects can be stronger.";
    }
    if (hasPatientAtomoxetineGeneContext(lower)) {
      return "Atomoxetine can become more sensitive when CYP2D6 processing is lower, so side effects can be stronger at the same dose.";
    }
    if (hasPatientFoodBiomarkerContext(lower)) {
      return "Solanidine is a diet-derived CYP2D6 biomarker. Food risk depends more on exposure amount, greening, sprouting, peel burden, symptoms, and food-toxicity context.";
    }
    if (riskMarkerKind === "abacavir_hypersensitivity" || riskMarkerKind === "allopurinol_scar" || riskMarkerKind === "hypersensitivity") {
      return "Some medicines become much riskier when a known gene result changes immune reaction risk.";
    }
    if (riskMarkerKind) {
      return "The same medicine can become riskier when a known gene result changes how your body reacts to it.";
    }
    if (hasPatientStatinMuscleConcern(lower)) {
      return "A second medicine or food can slow statin clearance enough to raise muscle side-effect risk.";
    }
    if (hasPatientMethotrexateToxicityConcern(lower)) {
      return "Methotrexate can become more dangerous when another medicine slows clearance or adds toxicity.";
    }
    if (hasPatientTacrolimusToxicityConcern(lower)) {
      return "Tacrolimus can become riskier when another medicine raises levels or changes how it is cleared.";
    }
    if (hasPatientHyperkalemiaConcern(lower)) {
      return "Some medicines can add together to raise potassium, especially when kidneys or potassium-sparing medicines are involved.";
    }
    if (hasPatientHypotensionConcern(lower)) {
      return "Some combinations lower blood pressure through overlapping effects rather than through drug levels alone.";
    }
    if (hasPatientBradycardiaConcern(lower)) {
      return "Some medicines can add together to slow heart rate or make pulse-related side effects more likely.";
    }
    if (hasPatientAbsorptionConcern(lower)) {
      return "Some medicines, minerals, or stomach-acid medicines can bind or block absorption, so timing may matter.";
    }
    if (hasPatientExposureDecreaseConcern(lower)) {
      return "A second medicine can lower the level or expected effect of another medicine.";
    }
    if (hasPatientExposureIncreaseConcern(lower)) {
      return "A second medicine can raise the level or expected effect of another medicine.";
    }
    if (hasOpioidActiveMetaboliteIncreaseContext(lower)) {
      return "Some gene results can make opioid-active metabolites form faster, so side effects can be stronger than expected.";
    }
    if (toxicMetabolite) {
      return "Your body may process or clear this medicine differently, so harmful buildup can happen more easily.";
    }
    if (hasPatientAnticholinergicConcern(lower)) {
      return "Several medicines can add up to stronger confusion, constipation, blurred vision, or fall risk.";
    }
    if (/avoid|contraindicat|severe|critical|high risk/.test(lower) || serious) {
      return "The combination may need a different plan or extra monitoring before use.";
    }
    return "The same medicine can behave differently depending on the full list, dose, timing, and gene results.";
  }
  const review = String(presentation.whatToReview || "").replace(/\s+/g, " ").trim();
  if (riskMarkerKind === "g6pd") {
    return "Ask a doctor or pharmacist whether your G6PD result changes whether any of these medicines should be avoided or monitored differently.";
  }
  if (riskMarkerKind === "abacavir_hypersensitivity") {
    return "Ask a doctor or pharmacist whether your gene result means abacavir should be avoided.";
  }
  if (riskMarkerKind === "allopurinol_scar") {
    return "Ask a doctor or pharmacist whether your gene result means allopurinol should be avoided.";
  }
  if (riskMarkerKind === "malignant_hyperthermia" || riskMarkerKind === "procedural_paralysis") {
    return "Ask a doctor or pharmacist whether your gene result changes anesthesia planning, emergency precautions, or procedure safety.";
  }
  if (riskMarkerKind) {
    return "Ask a doctor or pharmacist whether your gene result changes whether this medicine should be avoided or monitored differently.";
  }
  if (hasPatientStatinMuscleConcern(lower)) {
    return "Ask a doctor or pharmacist whether this combination raises statin side effects, muscle injury risk, or monitoring needs.";
  }
  if (hasPatientMethotrexateToxicityConcern(lower)) {
    return "Ask a doctor or pharmacist whether this combination raises methotrexate side effects, lab risk, or monitoring needs.";
  }
  if (hasPatientTacrolimusToxicityConcern(lower)) {
    return "Ask a doctor or pharmacist whether tacrolimus monitoring, side effects, or dose timing should be reviewed with this combination.";
  }
  if (hasPatientMetoprololGeneContext(lower)) {
    return "Ask a doctor or pharmacist whether metoprolol side effects, pulse, blood pressure, dose tolerance, or monitoring should be reviewed.";
  }
  if (hasPatientAtomoxetineGeneContext(lower)) {
    return "Ask a doctor or pharmacist whether atomoxetine side effects, dose tolerance, pulse, blood pressure, or monitoring should be reviewed.";
  }
  if (hasPatientFoodBiomarkerContext(lower)) {
    return "Ask whether this is only biomarker context, and mention unusual green, sprouted, or peel-heavy potato exposure, stomach symptoms, or neurologic symptoms if present.";
  }
  if (hasPatientHyperkalemiaConcern(lower)) {
    return "Ask a doctor or pharmacist whether potassium, kidney function, symptoms, or lab monitoring should be reviewed.";
  }
  if (hasPatientHypotensionConcern(lower)) {
    return "Ask a doctor or pharmacist whether low blood pressure, dizziness, fainting, or timing precautions should be reviewed.";
  }
  if (hasPatientBradycardiaConcern(lower)) {
    return "Ask a doctor or pharmacist whether pulse, dizziness, fainting, heart symptoms, or timing should be reviewed.";
  }
  if (hasPatientAbsorptionConcern(lower)) {
    return "Ask a doctor or pharmacist whether these medicines need different timing so absorption is not reduced.";
  }
  if (hasPatientExposureDecreaseConcern(lower)) {
    return "Ask a doctor or pharmacist whether the medicine could work less well and what monitoring or timing matters.";
  }
  if (hasPatientExposureIncreaseConcern(lower)) {
    return "Ask a doctor or pharmacist whether side effects, symptoms, labs, or timing need closer review.";
  }
  if (toxicMetabolite) {
    return "Ask a doctor or pharmacist whether this medicine could build up to unsafe levels, which symptoms matter most, and whether extra monitoring is needed.";
  }
  if (hasPatientAnticholinergicConcern(lower)) {
    return "Ask a doctor or pharmacist whether this list raises confusion, constipation, urination problems, or fall risk.";
  }
  const patientSafeDirective = patientSafeReviewDirective(presentation, review, { serious });
  if (patientSafeDirective) return patientSafeDirective;
  if (/^use\s+/i.test(review)) {
    const optionText = review.replace(/^use\s+/i, "").replace(/\.$/, "");
    return shortenPatientReviewText(`Ask a doctor or pharmacist whether ${optionText} would be a better option.`);
  }
  if (/ask|call|contact/i.test(review)) return shortenPatientReviewText(review);
  const cleaned = review
    .replace(/^review whether\s+/i, "whether ")
    .replace(/^review\s+/i, "")
    .replace(/\bpharmacogenomics?\b/gi, "gene result")
    .replace(/\bgenotype\b/gi, "gene result")
    .replace(/\bactive[-\s]?metabolite persistence\b/gi, "how long active effects last")
    .replace(/\benzyme recovery\b/gi, "how long body processing takes to return to normal")
    .replace(/\bactive[-\s]?metabolite\b/gi, "active effect")
    .replace(/\bmetabolite\b/gi, "active effect")
    .replace(/\bCYP[0-9A-Z]*\b/g, "medicine-processing pathway")
    .replace(/\bAUC\b/g, "level")
    .replace(/\bphenoconversion\b/gi, "pathway change");
  const base = cleaned || "this medication list needs a different plan, dose, timing, or monitoring";
  return shortenPatientReviewText(`Ask a doctor or pharmacist about ${base}.`);
}

function patientSafeReviewDirective(presentation = {}, review = "", options = {}) {
  const cleaned = publicDisplayText(review);
  if (!cleaned) return "";
  const lower = cleaned.toLowerCase();
  const directive = /\b(?:contraindicat(?:ed|ion)?|avoid(?:ed|ance)?|do not use|do not take|hold|substitut(?:e|ed|ion)?|dose[-\s]?adjust(?:ed|ment)?|dose reduction|dose limit|label-guided|specialist|monitor(?:ed|ing)?|ecg|inr|cbc|tdm)\b/i.test(cleaned);
  if (!directive) return "";
  const actors = (presentation.affectedSubstances || []).filter(Boolean);
  const pair = actors.slice(0, 2).join(" + ");
  const subject = pair || "these medicines";
  if (/(?:contraindicat|avoid|do not use|do not take|hold)/.test(lower)) {
    return shortenPatientReviewText(`Ask a doctor or pharmacist whether there is a concern using ${subject} together, or whether a different plan is needed.`);
  }
  if (/(?:substitut|alternative|different medicine)/.test(lower)) {
    return shortenPatientReviewText(`Ask a doctor or pharmacist whether there may be another option to discuss for ${subject}.`);
  }
  return shortenPatientReviewText(`Ask a doctor or pharmacist whether dose, timing, symptoms, or monitoring should be discussed for ${subject}.`);
}

function shortenPatientReviewText(text) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  const cleaned = raw
    .replace(/\s+\./g, ".")
    .replace(/\.\.+/g, ".")
    .replace(/\.\s*\./g, ".");
  if (cleaned.length <= 180) return cleaned;
  return cleaned.slice(0, 177).trim() + "...";
}

function patientFindingTitleText(presentation = {}) {
  const text = publicDisplayText([
    presentation.title,
    presentation.whatChanged,
    presentation.whyItMatters,
    ...(presentation.tags || []),
  ].join(" ")).toLowerCase();
  const actors = (presentation.affectedSubstances || []).filter(Boolean);
  const pair = actors.slice(0, 2).join(" + ");
  const riskMarkerKind = patientRiskMarkerContext(text);
  const timingPresentation = patientTimingPresentation(presentation, presentation?.trustContract || null);
  if (hasPatientNebivololGeneContext(text)) {
    return "Nebivolol side-effect risk may increase";
  }
  if (hasPatientMetoprololGeneContext(text)) {
    return "Metoprolol side-effect risk may increase";
  }
  if (hasPatientAtomoxetineGeneContext(text)) {
    return "Atomoxetine side-effect risk may increase";
  }
  if (hasPatientFoodBiomarkerContext(text)) {
    return "Food biomarker context may change";
  }
  if (timingPresentation) return "Timing may need review";
  if (riskMarkerKind === "g6pd") return "G6PD-related blood reaction risk may increase";
  if (riskMarkerKind === "abacavir_hypersensitivity") return "Abacavir may cause a serious allergic reaction";
  if (riskMarkerKind === "allopurinol_scar") return "Allopurinol may cause a serious skin reaction";
  if (riskMarkerKind === "malignant_hyperthermia") return "An anesthesia reaction risk may increase";
  if (riskMarkerKind === "procedural_paralysis") return "An anesthesia breathing risk may increase";
  if (riskMarkerKind) return "A serious allergic or skin reaction risk may increase";
  if (hasPatientStatinMuscleConcern(text)) return "Muscle injury risk may increase";
  if (hasPatientMethotrexateToxicityConcern(text)) return "Methotrexate side effects may increase";
  if (hasPatientTacrolimusToxicityConcern(text)) return actors.includes("Tacrolimus")
    ? "Tacrolimus side-effect risk may increase"
    : "Medicine side-effect risk may increase";
  if (hasPatientHyperkalemiaConcern(text)) return "High potassium risk may increase";
  if (hasPatientHypotensionConcern(text)) return "Low blood pressure risk may increase";
  if (hasPatientBradycardiaConcern(text)) return "Slow heart-rate risk may increase";
  if (hasPatientAbsorptionConcern(text)) return actors[0]
    ? `${actors[0]} may not absorb as expected`
    : "Medicine absorption may change";
  if (hasAntiplateletPatientContext(text)) {
    return actors.length >= 2
      ? `${actors[0]} may work less well with ${actors[1]}`
      : "An antiplatelet medicine may work less well";
  }
  if (hasActiveMetabolitePatientContext(text)) {
    return actors.length >= 2
      ? `${actors[0]} may work less well with ${actors[1]}`
      : (actors[0] ? `${actors[0]} may work less well` : "A medicine may work less well");
  }
  if (hasPatientSerotoninConcern(text, actors)) return "Serotonin-related side effects may increase";
  if (hasOpioidActiveMetaboliteIncreaseContext(text)) {
    return actors[0] ? `${actors[0]} opioid side-effect risk may increase` : "Opioid side-effect risk may increase";
  }
  if (hasPatientExposureDecreaseConcern(text)) return actors[0]
    ? `${actors[0]} may work less well`
    : "A medicine may work less well";
  if (hasPatientExposureIncreaseConcern(text)) return actors[0]
    ? `${actors[0]} side-effect risk may increase`
    : "Medicine side-effect risk may increase";
  if (hasPatientAnticholinergicConcern(text)) return "Confusion, constipation, or fall risk may increase";
  if (hasToxicMetabolitePatientContext(text)) {
    return actors[0] ? `${actors[0]} may cause stronger side effects` : "Serious side-effect risk may increase";
  }
  if (/bleed|inr|anticoag|warfarin|platelet|clot/.test(text)) {
    if (actors.some(actor => /warfarin/i.test(actor))) return "Warfarin bleeding risk may increase";
    return pair ? `${pair} may need closer monitoring` : "Bleeding or clotting monitoring may change";
  }
  if (/qt|torsades|arrhythm|heart rhythm|bradycard/.test(text)) {
    return pair ? `${pair} may need heart-rhythm review` : "Heart-rhythm monitoring may matter";
  }
  if (/sedation|falls?\s+risk|fall-risk|cns|opioid|benzodiazepine|drows/.test(text)) return "Sleepiness, breathing, or fall risk may increase";
  if (/auc|exposure|level|concentration|metabol|cyp|enzyme|genotype|pgx|clearance/.test(text)) {
    return pair ? `${pair} may change medicine effects` : "Medicine effects may change";
  }
  return pair ? `Safety note for ${pair}` : "Safety note for this list";
}

function patientPriorityStory(presentation = {}) {
  return {
    why:patientFindingStepText(presentation, "why"),
    changes:patientFindingStepText(presentation, "changed"),
    review:patientFindingStepText(presentation, "review"),
  };
}

function compactOverviewLine(value = "", maxLength = 220) {
  const text = publicDisplayText(value).replace(/\s+/g, " ").trim();
  if (!text || text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength).replace(/\s+\S*$/, "").replace(/[;:,.\s-]+$/, "");
  return `${cut || text.slice(0, maxLength)}…`;
}

function renderFindingNoteLine(value, tone = "") {
  const fullText = publicDisplayText(value);
  const text = compactOverviewLine(fullText);
  if (!text) return "";
  const title = fullText && fullText !== text ? ` title="${safeAttr(fullText)}"` : "";
  return `<p class="finding-note ${safeAttr(tone)}"${title}>${safePublicHtml(text)}</p>`;
}

function renderConcernSupportingSignals(finding) {
  const signals = finding.supportingSignals || [];
  if (!signals.length) return "";
  const shown = signals.slice(0, 4);
  return `<div class="concern-supporting">
    <div class="concern-supporting-title">Supporting signals</div>
    <ul>
      ${shown.map(signal => `<li>
        <span>${safePublicHtml(signal.label || "Related signal")}</span>
        <small>${safePublicHtml(compactReviewStatus(signal.sourceStatus || "modeled support"))}</small>
      </li>`).join("")}
    </ul>
    ${signals.length > shown.length ? `<div class="concern-supporting-more">+${signals.length - shown.length} more in Mechanisms / Review</div>` : ""}
  </div>`;
}

function compactReviewStatus(value) {
  return publicDisplayText(value || "")
    .replace(/\bno sign[-\s]?off\b/gi, "not independently reviewed")
    .replace(/\bpending professional review\b/gi, "not independently reviewed")
    .replace(/\bneeds review\b/gi, "not independently reviewed")
    .replace(/\breview prompt\b/gi, "modeled context")
    .replace(/\bsource linked, pending review\b/gi, "linked source · not independently reviewed")
    .trim();
}

function renderEvidenceLadderCompact(ladder) {
  if (!ladder) return "";
  const sourceStatus = typeof sourceSupportStatusLabel === "function"
    ? compactReviewStatus(sourceSupportStatusLabel(ladder.sourceSupportStatus))
    : String(ladder.sourceSupportStatus || "source status unknown").replace(/_/g, " ");
  const tier = ladder.strongestTier && ladder.strongestTier !== "unknown"
    ? `${publicDisplayText(ladder.strongestTier.replace(/_/g, " ").toLowerCase())}${ladder.studyCount ? ` · ${safePublicHtml(String(ladder.studyCount))} source${ladder.studyCount === 1 ? "" : "s"}` : ""}`
    : sourceStatus;
  const clinical = compactReviewStatus(String(ladder.clinicalActionConfidence || "insufficient").replace(/_/g, " "));
  const review = ladder.professionalReviewStatus === "reviewed"
    ? "reviewed source"
    : ladder.professionalReviewStatus === "pending"
    ? "not independently reviewed"
    : "review status unknown";
  return `<div class="evidence-ladder-compact">
    <span>Evidence: ${safePublicHtml(tier)}</span>
    <span>Source status: ${safePublicHtml(sourceStatus)}</span>
    <span>Mechanistic confidence: ${safePublicHtml(ladder.mechanisticConfidence || "unknown")}</span>
    <span>Clinical action status: ${safePublicHtml(clinical)}</span>
    <span>${safePublicHtml(review)}</span>
  </div>`;
}

function buildFindingWhyText(finding) {
  const actors = (finding.affectedActors || []).map(actor =>
      `${publicDisplayText(actor.id)}${actor.direction ? ` (${publicDisplayText(actor.direction)})` : ""}`
  ).join(" -> ");
  const grouped = finding.groupedFindings?.length
    ? ` Grouped with ${finding.groupedFindings.length} related signal${finding.groupedFindings.length === 1 ? "" : "s"} from the same actor pair.`
    : "";
  return `${publicDisplayText(finding.summary || finding.title || "This stack produced a normalized review finding.")}${actors ? ` Actors: ${actors}.` : ""}${grouped}`;
}

function renderOverviewWhySummary(finding) {
  const path = finding?.whyPath;
  const text = path
    ? (path.summary || (typeof formatWarningPath === "function" ? formatWarningPath(path) : ""))
    : buildFindingWhyText(finding);
  return `<div class="finding-why-body"><strong>Why:</strong> ${safePublicHtml(shortenOverviewWhyText(text || buildFindingWhyText(finding)))}</div>`;
}

function shortenOverviewWhyText(text) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (raw.length <= 220) return raw;
  return raw.slice(0, 217).trim() + "...";
}

function uniqueInteractionPairLabels(interactions = []) {
  const seen = new Set();
  const labels = [];
  for (const ix of interactions) {
    const drugs = [ix.drug1, ix.drug2].filter(Boolean);
    if (!drugs.length) continue;
    const key = drugs.map(d => String(d).toLowerCase()).sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(drugs.join(" + "));
  }
  return labels;
}

function buildInteractionPriorityStory(ix) {
  if (!ix) return null;
  const pair = [ix.drug1, ix.drug2].filter(Boolean).join(" + ");
  const pathway = ix.enzyme || ix.affectedPathway || ix.category || "shared pathway";
  const mechanism = ix.mechanism || ix.effect || "a modeled interaction";
  const action = ix.clinicalAction || ix.management || (
    ix.severity === "severe" || ix.severity === "critical"
      ? "Review whether this combination needs a different plan, dose context, timing, or monitoring before any medication changes."
      : "Review dose, timing, monitoring, and whether the combination is still appropriate."
  );
  return {
    why:publicDisplayText(`${pair || "This stack"} has the strongest substance-interaction signal in the current profile.`),
    changes:publicDisplayText(`The concern is ${mechanism}${pathway ? ` through ${pathway}` : ""}.`),
    review:publicDisplayText(action),
  };
}

function buildGenotypePriorityStory(signal) {
  if (!signal) return null;
  return {
    why:signal.why || "A selected genotype changes the interpretation of a medication already in the list.",
    changes:signal.changes || signal.summary || "The genotype changes expected exposure, active metabolite formation, or hypersensitivity risk.",
    review:signal.review || signal.nextStep || "Review the pharmacogenomics panel before relying on the standard medication assumption.",
  };
}

function buildClinicianPriorityStory(presentation = {}, fallbackStory = null) {
  const actors = (presentation.affectedSubstances || []).slice(0, 3).join(" + ");
  return {
    clinicianQueue:true,
    why:publicDisplayText(presentation.whyItMatters || `${presentation.title || fallbackStory?.why || "Top clinical review priority"}${actors ? ` (${actors})` : ""}.`),
    changes:publicDisplayText(presentation.whatChanged || fallbackStory?.changes || "The selected list changes exposure, activation, timing, or safety context."),
    review:clinicianOverviewActionText(presentation, presentation.whatToReview || fallbackStory?.review || "Review dose, timing, monitoring, and whether the combination is still appropriate."),
  };
}

function clinicianOverviewActionText(presentation = {}, text = "") {
  const raw = publicDisplayText(text || presentation.whatToReview || "");
  const context = publicDisplayText([
    presentation.title,
    presentation.whatChanged,
    presentation.whyItMatters,
    raw,
    ...(presentation.affectedSubstances || []),
  ].join(" ")).toLowerCase();
  const actors = (presentation.affectedSubstances || []).slice(0, 2).join(" + ") || "this combination";
  if (hasPatientFoodBiomarkerContext(context)) {
    return "Review whether this is biomarker context only; consider exposure history, symptoms, and toxicology context before drawing clinical conclusions.";
  }
  if (/\b(?:washout|persistence|timing|switch|overlap|enzyme resynthesis|after stopping|recovery)\b/.test(context)) {
    return `Review stop/start dates, overlap, washout, and whether timing changes the plan for ${actors}.`;
  }
  if (/contraindicat|avoid|hold|suspend|strong cyp3a4/.test(context) &&
    /simvastatin/.test(context) &&
    /clarithromycin/.test(context)) {
    return "Review labeled contraindication. Determine whether interruption, substitution, timing, or monitoring is appropriate for the patient context.";
  }
  if (/\breduce(?: [a-z0-9-]+)? dose (?:by )?(?:~)?75%|\b75%\b/i.test(raw)) {
    return `Review label- or guideline-supported dose adjustment and monitoring for ${actors}; do not apply a fixed percentage without indication, labs, and protocol context.`;
  }
  if (/^(?:use|choose|prefer)\s+/i.test(raw) ||
    /\b(?:use|choose|prefer)\s+(?:morphine|pantoprazole|famotidine|azithromycin|prasugrel|ticagrelor|citalopram|escitalopram|venlafaxine)\b/i.test(raw)) {
    return `Review whether the suggested option or another plan is appropriate for ${actors}; confirm indication, contraindications, and patient context.`;
  }
  if (/contraindicat|avoid|do not use|do not take|hold|suspend/.test(context)) {
    return `Review labeled contraindication or avoidance guidance for ${actors}; determine the appropriate plan in clinical context.`;
  }
  if (/substitut|alternative|switch/.test(context)) {
    return `Review whether an alternative plan is appropriate for ${actors}.`;
  }
  return raw || "Review dose, timing, monitoring, and whether the combination is still appropriate.";
}

function compactClinicianEvidenceLine(presentation = {}) {
  const trust = presentation.trustContract || null;
  const sourceLinked = trust?.sourceLinked || /source-linked|fda|label|guideline/i.test(String(presentation.evidenceSummary || ""));
  const labelLinked = /fda|label|dailymed/i.test(String(presentation.evidenceSummary || "")) ||
    (presentation.sourceFinding?.evidenceRefs || []).some(ref => /label|dailymed/i.test(String(ref || "")));
  if (labelLinked) return "FDA/DailyMed label-linked; source detail is in Evidence.";
  if (sourceLinked) return "Source-linked; source detail is in Evidence.";
  return "Modeled review signal; verify in Evidence before clinical use.";
}

function buildDefaultPriorityStory(count) {
  if (count < 1) return null;
  if (count < 2) {
    return {
      why:"Diognosis can already show pharmacogenomic, metabolite, and dose context for one medication when available.",
      changes:"Pairwise interaction risk needs at least two substances, but genotype or metabolite context can still matter.",
      review:"Add another substance or set known genotype results to personalize the review.",
    };
  }
  return {
    why:"No severe pairwise signal is currently ahead of the rest of the profile.",
    changes:"Lower-priority genotype, transporter, metabolite, receptor, and dose context may still affect interpretation.",
    review:"Review the findings tabs if the patient has narrow-therapeutic-index drugs, unusual symptoms, or known genotype results.",
  };
}

function getPriorityEvidenceLayer(refs = [], inlineEvidence = null, source = "") {
  const studies = [...new Set(refs || [])].map(ref => typeof getStudy === "function" ? getStudy(ref) : STUDY_DB[ref]).filter(Boolean);
  const types = new Set(studies.map(s => s.type));
  const sourceText = `${source || ""} ${(inlineEvidence?.sources || []).join(" ")} ${inlineEvidence?.confidence || ""}`.toLowerCase();
  const hasGuidance = types.has(EVIDENCE_TIER.GUIDELINE) || types.has(EVIDENCE_TIER.FDA_LABEL) || /cpic|guideline|fda|label/.test(sourceText);
  const hasHuman = [
    EVIDENCE_TIER.META_ANALYSIS,
    EVIDENCE_TIER.RCT,
    EVIDENCE_TIER.CLINICAL_PK,
    EVIDENCE_TIER.OBSERVATIONAL,
    EVIDENCE_TIER.CASE_REPORT,
  ].some(type => types.has(type)) || /clinical|observational|rct|meta/.test(sourceText);
  const hasOnlyMechanistic = types.has(EVIDENCE_TIER.IN_VITRO) || types.has(EVIDENCE_TIER.ANIMAL) || /in vitro|animal|mechanistic/.test(sourceText);
  if (hasGuidance) {
    return { label:"Strong clinical guidance", className:"strong", note:studies.length ? `${studies.length} linked source${studies.length === 1 ? "" : "s"}, including guideline or label evidence.` : "Guideline or product-label evidence is attached." };
  }
  if (hasHuman) {
    return { label:"Human clinical evidence", className:"moderate", note:studies.length ? `${studies.length} linked human source${studies.length === 1 ? "" : "s"}.` : "Human clinical evidence is referenced inline." };
  }
  if (hasOnlyMechanistic) {
    return { label:"Mechanistic evidence", className:"limited", note:"Mechanistic evidence supports the pathway; clinical magnitude may be less certain." };
  }
  return { label:"Modeled review signal", className:"limited", note:"This is a conservative model signal; use the detailed tabs and evidence links for context." };
}

function renderPriorityStory(story) {
  if (!story) return "";
  const patient = isPatientAudience();
  const clinicianQueue = !patient && story.clinicianQueue;
  return `<div class="summary-story ${clinicianQueue ? "clinician-priority" : ""}">
    <div class="summary-story-row"><strong>Why</strong>${safePublicHtml(story.why)}</div>
    <div class="summary-story-row"><strong>Change</strong>${safePublicHtml(story.changes)}</div>
    <div class="summary-story-row"><strong>Next</strong>${safePublicHtml(story.review)}</div>
  </div>`;
}

function updateEmptyTabs() {
  DIOGNOSIS_TABS.forEach(t => {
    const panel = document.getElementById("tab-" + t);
    if (!panel || typeof panel.querySelectorAll !== "function") return;
    const sections = Array.from(panel.querySelectorAll(".section"));
    const anyVisible = sections
      .some(section => section.style.display !== "none");
    let note = panel.querySelector(".tab-empty");
    if (!anyVisible) {
      if (!note) {
        note = document.createElement("div");
        note.className = "tab-empty";
        panel.appendChild(note);
      }
      note.textContent = activeStack.length < 2
        ? "Add a second substance to populate this view."
        : "No data available for this substance set.";
      note.style.display = "";
    } else if (note) {
      note.style.display = "none";
    }
  });
}

function applyReviewerVisibility() {
  const reviewer = isReviewerMode();
  if (document.body) document.body.dataset.reviewer = reviewer ? "reviewer" : "standard";
  const reviewBtn = document.getElementById("tabbtn-review");
  const reviewPanel = document.getElementById("tab-review");
  setReviewerShellHidden(reviewBtn, !reviewer);
  setReviewerShellHidden(reviewPanel, !reviewer);
  if (reviewPanel && !reviewer) {
    reviewPanel.classList.remove("active");
  }
  if (!reviewer && activeTab === "review") setActiveTab("overview");
  const reviewerSections = [
    ["scopeSection", "scopeBody", "scopeCount"],
    ["sourceIntegrationCandidateSection", "sourceIntegrationCandidateBody", "sourceIntegrationCandidateCount"],
    ["reviewSummarySection", "reviewSummaryBody", "reviewSummaryCount"],
    ["scenarioSnapshotSection", "scenarioSnapshotBody", "scenarioSnapshotCount"],
    ["metaboliteGapSection", "metaboliteGapBody", "metaboliteGapCount"],
    ["warningPathSection", "warningPathBody", "warningPathCount"],
    ["interSection", "interBody", "interCount"],
    ["comboSection", "comboBody", "comboCount"],
    ["matrixSection", "matrixBody", null],
    ["qualitySection", "qualityBody", "qualityCount"],
    ["contributeSection", "contributeBody", null],
  ];
  if (!reviewer) {
    reviewerSections.forEach(([sectionId, bodyId, countId]) => hideSectionAndClear(sectionId, bodyId, countId));
    lazyRenderState.reviewKey = "";
  }
}

function arrangeAdvancedSections() {
  const placements = {
    overview:["scopeSection","findingSection","circulatingSection","riskSection"],
    mechanisms:["mechanismWhySection","mechanisticSection","transporterSection","pdSection","cascadeSection","phenoAccumSection","graphSection"],
    "genes-metabolites":["genotypeSection","phenoconversionSection","activeMoietySection","metabSection"],
    "timing-levels":["foldSection","pkSimSection","persistenceTimelineSection","washoutSection","burdenSection"],
    evidence:["evidenceSection"],
    review:["reviewSummarySection","scenarioSnapshotSection","metaboliteGapSection","warningPathSection","matrixSection","interSection","comboSection","qualitySection","contributeSection"],
  };
  Object.entries(placements).forEach(([tabId, sectionIds]) => {
    const panel = document.getElementById("tab-" + tabId);
    if (!panel || typeof panel.appendChild !== "function") return;
    sectionIds.forEach(sectionId => {
      const section = document.getElementById(sectionId);
      if (section) panel.appendChild(section);
    });
  });
}

function onSearch(q) {
  const el = document.getElementById("searchResults");
  if (!q || q.length < 1) { closeSearchResults(); return; }
  const panelHead = `<div class="search-results-head"><span class="search-results-title">Best matches</span><button type="button" class="sr-close" data-action="close-search" aria-label="Close search suggestions">&times;</button></div>`;
  const seen = new Set();
  const seenAliasMatches = new Set();
  const rawMatches = DRUG_DB
    .map(d => ({ drug:d, match:scoreDrugSearch(d, q) }))
    .filter(row => row.match.score > 0)
    .sort((a,b) =>
      Number(isAdvancedSearchDrug(a.drug)) - Number(isAdvancedSearchDrug(b.drug)) ||
      b.match.score - a.match.score ||
      drugSearchRichness(b.drug) - drugSearchRichness(a.drug) ||
      a.drug.name.localeCompare(b.drug.name)
    );
  const dedupedMatches = rawMatches.filter(row => {
    const d = row.drug;
    if (seen.has(d.name)) return false;
    const aliasKey = getSearchAliasDedupeKey(row);
    if (aliasKey && seenAliasMatches.has(aliasKey)) return false;
    seen.add(d.name);
    if (aliasKey) seenAliasMatches.add(aliasKey);
    return true;
  });
  const primaryMatches = dedupedMatches
    .filter(row => !isAdvancedSearchDrug(row.drug) || row.match.score >= 110)
    .slice(0, INPUT_LIMITS.searchResultsPrimary);
  const primaryNames = new Set(primaryMatches.map(row => row.drug.name));
  const advancedMatches = dedupedMatches
    .filter(row => isAdvancedSearchDrug(row.drug) && !primaryNames.has(row.drug.name))
    .slice(0, INPUT_LIMITS.searchResultsAdvanced);
  const actorMatches = findSupplementActorMatches(q).slice(0, 6);
  const matches = [...primaryMatches, ...advancedMatches];
  if (!matches.length && !actorMatches.length) {
    el.innerHTML = panelHead + renderUnrecognizedSearchResult(q);
    el.classList.add("show");
    return;
  }

  // Group by practical browse category, while preserving exact class on the row.
  const groups = {};
  primaryMatches.forEach(row => {
    const d = row.drug;
    const cat = getBrowseCategory(d);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(row);
  });

  let html = panelHead;
  for (const [cls, rows] of Object.entries(groups)) {
    if (primaryMatches.length > 5) html += `<div class="sr-cat">${safePublicHtml(cls)}</div>`;
    rows.forEach(row => {
      const d = row.drug;
      const added = activeStack.includes(d.name);
      const matchedAlias = row.match.term && row.match.term !== d.name && row.match.term !== d.id ? row.match.term : "";
      const secondary = typeof getDrugSecondaryLabel === "function" ? getDrugSecondaryLabel(d) : "";
      const displayName = matchedAlias ? `${highlight(matchedAlias, q)} -> ${d.name}` : highlight(d.name, q);
      const matchNote = row.match.reason && row.match.reason !== "name" ? `<span class="sr-match">${row.match.reason}</span>` : "";
      const secondaryHtml = secondary || matchNote ? `<span class="sr-secondary">${[safePublicHtml(secondary), matchNote].filter(Boolean).join(" ")}</span>` : "";
      html += `<div class="sr-item" ${keyboardButtonAttrs()} data-action="${added ? "remove-drug" : "add-drug"}" data-name="${safeAttr(d.name)}">
        <span><span class="sr-name">${displayName}</span>${secondaryHtml}</span>
        <span>${added ? '<span class="sr-added">✓ Added</span>' : `<span class="sr-class">${safePublicHtml(d.cls)}</span>`}</span>
      </div>`;
    });
  }
  if (advancedMatches.length) {
    html += `<div class="sr-cat sr-cat-advanced">Advanced model actors</div>`;
    advancedMatches.forEach(row => {
      const d = row.drug;
      const added = activeStack.includes(d.name);
      const secondary = typeof getDrugSecondaryLabel === "function" ? getDrugSecondaryLabel(d) : "";
      html += `<div class="sr-item sr-advanced" ${keyboardButtonAttrs()} data-action="${added ? "remove-drug" : "add-drug"}" data-name="${safeAttr(d.name)}">
        <span><span class="sr-name">${highlight(d.name, q)}</span><span class="sr-secondary">${safePublicHtml(secondary || "Modeled metabolite, research actor, or source-candidate record")}</span></span>
        <span>${added ? '<span class="sr-added">✓ Added</span>' : '<span class="sr-class">Advanced</span>'}</span>
      </div>`;
    });
  }
  if (actorMatches.length) {
    html += `<div class="sr-cat">Food / Supplement</div>`;
    actorMatches.forEach(row => {
      const actor = row.actor;
      const added = activeStack.some(item => {
        const selectedActor = typeof getStackSupplementActor === "function" ? getStackSupplementActor(item) : null;
        return selectedActor && selectedActor.id === actor.id;
      });
      const secondary = formatActorSources(actor);
      const matchedAlias = row.match.term && row.match.term !== actor.name && row.match.term !== actor.id ? row.match.term : "";
      const displayName = matchedAlias ? `${highlight(matchedAlias, q)} -> ${actor.name}` : highlight(actor.name, q);
      html += `<div class="sr-item" ${keyboardButtonAttrs()} data-action="${added ? "remove-food-actor" : "add-food-actor"}" data-actor-id="${safeAttr(actor.id)}">
        <span><span class="sr-name">${displayName}</span>${secondary ? `<span class="sr-secondary">${safePublicHtml(secondary)}</span>` : ""}</span>
        <span>${added ? '<span class="sr-added">✓ Added</span>' : '<span class="sr-class">Food/Supplement</span>'}</span>
      </div>`;
    });
  }
  if (dedupedMatches.length > matches.length || findSupplementActorMatches(q).length > actorMatches.length) {
    html += `<div class="sr-limit-note">Showing the most relevant results. Use a more specific name or brand to narrow the list.</div>`;
  }
  el.innerHTML = html;
  el.classList.add("show");
}

function renderUnrecognizedSearchResult(query) {
  const name = typeof resolveUrlDrugName === "function"
    ? resolveUrlDrugName(query, { preserveUnknown:true })
    : publicDisplayText(query).slice(0, 80);
  if (!name) {
    return '<div class="sr-item"><span class="sr-name" style="color:var(--text2)">No matches found</span></div>';
  }
  const key = typeof stackSelectionDedupeKey === "function" ? stackSelectionDedupeKey(name) : String(name).toLowerCase();
  const added = activeStack.some(item => {
    const itemKey = typeof stackSelectionDedupeKey === "function" ? stackSelectionDedupeKey(item) : String(item).toLowerCase();
    return itemKey === key;
  });
  return `<div class="sr-item sr-unrecognized" ${keyboardButtonAttrs()} data-action="${added ? "remove-drug" : "add-unrecognized"}" data-name="${safeAttr(name)}">
    <span>
      <span class="sr-name">${safePublicHtml(name)}</span>
      <span class="sr-secondary">Not recognized here. Diognosis will keep it in the list but will not assess interactions for it.</span>
    </span>
    <span>${added ? '<span class="sr-added">✓ Added</span>' : '<span class="sr-class sr-unrecognized-class">Add unrecognized</span>'}</span>
  </div>`;
}

function isAdvancedSearchDrug(drug) {
  if (!drug) return true;
  const refs = drug.evidenceRefs || [];
  const id = typeof toGraphId === "function" ? toGraphId(drug.name || drug.id || "") : String(drug.id || "");
  return refs.includes("ev_drug_count_expansion_batch") ||
    /source candidate|identity context/i.test(String(drug.cls || "")) ||
    /phase\s*12|source-candidate|screening\/enrichment scaffold/i.test(String(drug.note || "")) ||
    Boolean(typeof METABOLITE_ACTORS !== "undefined" && METABOLITE_ACTORS[id]);
}

function findSupplementActorMatches(query) {
  const actorMaps = [
    typeof FOOD_ACTORS !== "undefined" ? FOOD_ACTORS : {},
    typeof ENDOGENOUS_ACTORS !== "undefined" ? ENDOGENOUS_ACTORS : {},
  ];
  const seen = new Set();
  return actorMaps
    .flatMap(actorMap => Object.values(actorMap || {}))
    .filter(actor => actor && (actor.type === ACTOR_TYPE.FOOD || (actor.type === ACTOR_TYPE.ENDOGENOUS && actor.sources)))
    .map(actor => ({ actor, match:scoreSupplementActorSearch(actor, query) }))
    .filter(row => row.match.score > 0)
    .filter(row => {
      if (seen.has(row.actor.id)) return false;
      seen.add(row.actor.id);
      return true;
    })
    .sort((a,b) =>
      b.match.score - a.match.score ||
      supplementActorSearchRichness(b.actor) - supplementActorSearchRichness(a.actor) ||
      a.actor.name.localeCompare(b.actor.name)
    )
    .slice(0, 12);
}

function scoreSupplementActorSearch(actor, query) {
  const norm = typeof normalizeDrugLookupKey === "function"
    ? normalizeDrugLookupKey
    : value => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const q = norm(query);
  if (!q) return { score:0, term:"", reason:"" };
  const tokens = q.split(" ").filter(Boolean);
  const terms = typeof getSupplementActorSearchTerms === "function"
    ? getSupplementActorSearchTerms(actor)
    : [actor.name, actor.id, ...(actor.sources || [])];
  const searchable = terms.map(term => ({ raw:String(term || ""), key:norm(term) })).filter(term => term.key);
  const joined = searchable.map(term => term.key).join(" ");
  const actorKey = norm(actor.name);
  let best = { score:0, term:"", reason:"" };
  const setBest = (score, term, reason) => {
    if (score > best.score) best = { score, term, reason };
  };

  if (actorKey === q) setBest(112, actor.name, "name");
  if (actorKey.startsWith(q)) setBest(90, actor.name, "name prefix");
  searchable.forEach(term => {
    const isPrimary = term.raw === actor.name || term.raw === actor.id;
    if (term.key === q) setBest(isPrimary ? 112 : 96, term.raw, isPrimary ? "name" : "source");
    else if (term.key.startsWith(q)) setBest(isPrimary ? 90 : 80, term.raw, isPrimary ? "name prefix" : "source prefix");
    else if (term.key.includes(q)) setBest(isPrimary ? 72 : 64, term.raw, isPrimary ? "partial name" : "partial source");
  });
  if (tokens.length > 1 && tokens.every(token => joined.includes(token))) setBest(62, actor.name, "matched words");
  return best;
}

function supplementActorSearchRichness(actor) {
  return (actor.routes || []).length * 3 +
    (actor.inh || []).length * 2 +
    (actor.ind || []).length * 2 +
    (actor.sources || []).length +
    (actor.note ? 2 : 0);
}

function formatActorSources(actor) {
  const sources = (actor.sources || []).slice(0, 3).map(source => String(source || "").replace(/_/g, " "));
  return sources.length ? sources.join(", ") : "";
}

function getSearchAliasDedupeKey(row) {
  const drug = row?.drug;
  const term = row?.match?.term;
  const reason = row?.match?.reason || "";
  if (!drug || !term || reason === "name" || reason === "name prefix" || reason === "medication class") return "";
  if (term === drug.name || term === drug.id || term === drug.cls) return "";
  const norm = typeof normalizeDrugLookupKey === "function"
    ? normalizeDrugLookupKey
    : value => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return `alias:${norm(term)}`;
}

function drugSearchRichness(drug) {
  return (drug.routes || []).length * 3 +
    (drug.inh || []).length * 2 +
    (drug.ind || []).length * 2 +
    (drug.metInh || []).length * 2 +
    (drug.evidenceRefs || []).length +
    (drug.note ? 2 : 0);
}

function scoreDrugSearch(drug, query) {
  const norm = typeof normalizeDrugLookupKey === "function"
    ? normalizeDrugLookupKey
    : value => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const q = norm(query);
  if (!q) return { score:0, term:"", reason:"" };
  const tokens = q.split(" ").filter(Boolean);
  const terms = typeof getDrugSearchTerms === "function" ? getDrugSearchTerms(drug) : [drug.name, drug.cls, ...(BRAND_NAMES[drug.name] || [])];
  const searchable = terms.map(term => ({ raw:String(term || ""), key:norm(term) })).filter(term => term.key);
  const joined = searchable.map(term => term.key).join(" ");
  const genericKey = norm(drug.name);
  let best = { score:0, term:"", reason:"" };
  const setBest = (score, term, reason) => {
    if (score > best.score) best = { score, term, reason };
  };

  if (genericKey === q) setBest(120, drug.name, "name");
  if (genericKey.startsWith(q)) setBest(95, drug.name, "name prefix");
  searchable.forEach(term => {
    const isGeneric = term.raw === drug.name || term.raw === drug.id;
    if (term.key === q) setBest(isGeneric ? 120 : 110, term.raw, isGeneric ? "name" : "brand or alias");
    else if (term.key.startsWith(q)) setBest(isGeneric ? 95 : 88, term.raw, isGeneric ? "name prefix" : "brand or alias prefix");
    else if (term.key.includes(q)) setBest(isGeneric ? 76 : 72, term.raw, isGeneric ? "partial name" : "partial brand or alias");
  });
  if (tokens.length > 1 && tokens.every(token => joined.includes(token))) setBest(68, drug.name, "matched words");
  if (String(drug.cls || "").toLowerCase().includes(query.toLowerCase())) setBest(52, drug.cls, "medication class");
  if (tokens.length === 1 && q.length >= 4) {
    searchable.forEach(term => {
      for (const part of term.key.split(" ")) {
        if (part.length >= 4 && levenshteinWithin(part, q, q.length > 6 ? 2 : 1)) {
          setBest(42, term.raw, "possible spelling match");
        }
      }
    });
  }
  return best;
}

function levenshteinWithin(a, b, maxDistance) {
  if (Math.abs(a.length - b.length) > maxDistance) return false;
  const prev = Array.from({ length:b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let rowMin = curr[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      rowMin = Math.min(rowMin, curr[j]);
    }
    if (rowMin > maxDistance) return false;
    for (let j = 0; j < curr.length; j++) prev[j] = curr[j];
  }
  return prev[b.length] <= maxDistance;
}

function highlight(text, q) {
  if (!q) return text;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`, "gi");
  return text.replace(re, "<strong style='color:var(--accent)'>$1</strong>");
}

function textHasAny(text, terms) {
  const haystack = String(text || "").toLowerCase();
  return terms.some(term => haystack.includes(term));
}

function drugNameHasAny(drug, terms) {
  const name = String(drug?.name || "").toLowerCase();
  return terms.some(term => name.includes(term));
}

function getBrowseCategoryText(drug) {
  return [
    drug?.name,
    drug?.id,
    drug?.cls,
    drug?.timing,
    drug?.note,
    ...(drug?.brandNames || []),
    ...Object.keys(drug?.props || {}),
  ].filter(Boolean).join(" ").toLowerCase();
}

function normalizeBrowseCategoryText(text) {
  return ` ${String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()} `;
}

function browseTextHasAny(text, terms) {
  const haystack = normalizeBrowseCategoryText(text);
  return terms.some(term => {
    const needle = normalizeBrowseCategoryText(term).trim();
    return needle && haystack.includes(` ${needle} `);
  });
}

function browseRuleMatches(text, rule) {
  if (browseTextHasAny(text, rule.terms || [])) return true;
  const raw = String(text || "").toLowerCase();
  return (rule.contains || []).some(term => raw.includes(String(term || "").toLowerCase()));
}

const BROWSE_CATEGORY_RULES = [
  {
    category:"Recreational & Social",
    terms:["recreational", "psychedelic", "hallucinogen", "empathogen", "dissociative", "cannabinoid", "alcohol", "cannabis", "mdma", "ghb", "cocaine", "heroin", "poppers", "kratom", "ayahuasca", "ketamine", "psilocybin", "lsd", "dmt", "2c-b", "2c-i", "mephedrone", "ibogaine"],
    contains:["cannabinoid"],
  },
  {
    category:"Dermatology, Eye & Local Care",
    terms:["ophthalmic", "glaucoma", "dry eye", "intravitreal", "ocular", "eye", "otic", "topical", "dermatology", "dermatologic", "acne", "psoriasis", "eczema", "rosacea", "keratolytic", "retinoid", "sunscreen", "wound", "local anesthetic", "prilocaine", "benzoyl peroxide", "adapalene", "tazarotene", "crisaborole", "mupirocin", "bacitracin"],
    contains:["fluocinolone", "fluocinonide", "fluorometholone", "difluprednate", "flurandrenolide", "loteprednol", "clobetasol", "halobetasol", "desonide", "desoximetasone", "alclometasone", "amcinonide", "betamethasone", "triamcinolone", "hydroquinone", "homatropine", "lodoxamide", "apraclonidine", "pemirolast", "bimatoprost", "travoprost", "latanoprost", "olopatadine", "tropicamide", "pilocarpine", "becaplermin", "eflornithine", "ingenol", "methoxsalen", "amlexanox"],
  },
  {
    category:"Renal, Electrolytes & Urologic",
    terms:["renal", "kidney", "urologic", "urology", "overactive bladder", "bph", "phosphate binder", "potassium binder", "electrolyte", "sodium solution", "sodium bicarbonate", "calcium salt", "calcium carbonate", "hypertonic", "isotonic", "crystalloid", "resuscitation fluid", "plasma expander", "colloid", "dialysis", "diuretic", "loop diuretic", "thiazide", "uricosuric", "urate", "gout", "xanthine oxidase", "xo inhibitor", "probenecid", "carbonic anhydrase", "mra", "mineralocorticoid", "antimuscarinic"],
    contains:["gliflozin", "benzbromarone", "lesinurad", "ethacrynic", "acetazolamide", "methazolamide", "amiloride", "bumetanide", "torsemide", "deferasirox", "alfuzosin", "silodosin", "mirabegron", "vibegron", "darifenacin", "fesoterodine", "flavoxate", "oxybutynin", "tolterodine", "trospium", "bethanechol", "cevimeline", "uric acid"],
  },
  {
    category:"Mental Health & Neurology",
    terms:["ssri", "snri", "tca", "maoi", "rima", "antidepressant", "atypical ad", "nassa", "anxiolytic", "antipsychotic", "atypical ap", "typical ap", "mood stabilizer", "anticonvulsant", "antiepileptic", "antiseizure", "barbiturate", "triptan", "ditan", "cgrp", "migraine", "dopamine", "dopa", "parkinson", "parkinsonism", "comt inhibitor", "dementia", "acetylcholinesterase", "multiple sclerosis", "s1p receptor", "potassium channel blocker", "orexin", "vmat2", "wakefulness", "wake-promoting", "wake-promoting agent", "hypnotic", "zolpidem", "z-drug", "melatonin", "adhd", "stimulant", "methylxanthine", "nri", "amphetamine", "modafinil", "histamine h3 inverse agonist", "nicotine dependence"],
    contains:["xanthine", "aminophylline", "phenobarbital", "phenytoin", "ethosuximide", "deutetrabenazine", "bromocriptine", "carbidopa", "levodopa", "clozapine", "quetiapine", "dextromethorphan", "doxylamine", "esketamine", "flupenthixol", "mianserin", "blonanserin", "levomepromazine", "mesoridazine", "sertindole", "sibutramine", "ulotaront", "viloxazine", "xanomeline", "pridopidine", "tiagabine", "perampanel", "mephenytoin", "benztropine", "dalfampridine", "istradefylline", "etrasimod", "acamprosate", "bupropion hydrochloride", "flibanserin", "pitolisant", "suvorexant", "lemborexant", "daridorexant", "lofexidine", "clonidine"],
  },
  {
    category:"Cardiovascular & Blood",
    terms:["statin", "fibrate", "lipid-lowering", "pcsk9", "cholesterol", "omega-3", "beta-blocker", "ace inhibitor", "arb", "ccb", "calcium channel blocker", "antihypertensive", "blood pressure", "alpha-blocker", "antianginal", "antiarrhythmic", "cardiac glycoside", "heart rate", "if current", "myosin inhibitor", "inotrope", "vasopressor", "pressor", "antiplatelet", "anticoag", "anticoagulant", "doac", "direct thrombin", "factor xa", "heparin", "low molecular weight heparin", "thrombolytic", "tissue plasminogen", "antifibrinolytic", "coagulation factor", "hemophilia", "pde5 inhibitor", "nitrate", "vasodilator", "prostacyclin", "endothelin", "sgc stimulator", "thrombopoietin", "erythroid maturation", "itp"],
    contains:["sartan", "pril", "olol", "dipine", "dihydropyridine", "azosin", "afil", "aliskiren", "antihypertensive", "bepridil", "vernakalant", "aficamten", "mavacamten", "atrasentan", "anagrelide", "fostamatinib", "luspatercept", "pentoxifylline", "fluindione", "warfarin"],
  },
  {
    category:"Pain, Sedation & Anesthesia",
    terms:["opioid", "analgesic", "nsaid", "muscle relaxant", "anesthetic", "anesthetics", "sedative", "hypnotic", "neuromuscular blocker", "nmb", "relaxant binding", "malignant hyperthermia", "benzodiazepine", "volatile anesthetic", "volatile anesthetics", "icu sedative", "alpha-2 agonist", "dexmedetomidine", "lidocaine", "ketorolac", "acetaminophen", "botulinum toxin"],
    contains:["profen", "fenac", "coxib", "fentanil", "morph", "codeine", "tramadol", "meperidine", "ketobemidone", "propoxyphene", "dipyrone", "nitazene", "oliceridine", "piritramide", "tilidine", "opium", "botulinum", "tolperisone", "carisoprodol", "chlorzoxazone"],
  },
  {
    category:"Infectious Disease",
    terms:["antibiotic", "antimicrobial", "macrolide", "fluoroquinolone", "penicillin", "cephalosporin", "carbapenem", "beta-lactam", "rifamycin", "sulfonamide", "nitrofuran", "nitroimidazole", "lincosamide", "glycopeptide", "tetracycline", "antistaphylococcal", "antitubercular", "antimycobacterial", "antiviral", "antifungal", "azole", "echinocandin", "antimalarial", "aminoquinoline", "antiretroviral", "nrti", "protease inhibitor", "integrase inhibitor", "ccr5", "hcv", "ns5b", "aminoglycoside", "sulfone", "anthelmintic", "antiparasitic", "antiprotozoal", "orthopoxvirus", "vaccine"],
    contains:["cillin", "cef", "ceft", "penem", "floxacin", "cycline", "thromycin", "conazole", "fungin", "vir", "quine", "artem", "artesunate", "avibactam", "clavulanate", "clofazimine", "mafenide", "clotrimazole", "miconazole", "ciclopirox", "chlorhexidine", "isoniazid", "trimethoprim", "polymyxin", "lumefantrine", "rimantadine", "stavudine"],
  },
  {
    category:"Oncology, Immunology & Transplant",
    terms:["oncology", "antineoplastic", "chemotherapy", "alkylating", "antimetabolite", "taxane", "taxanes", "platinum", "topoisomerase", "proteasome", "parp", "pi3k", "bcl-2", "braf", "mek inhibitor", "egfr", "bcr-abl", "vegfr", "fgfr", "alk tyrosine", "kinase inhibitor", "btk inhibitor", "cdk4/6", "hdac", "ezh2", "kit/pdgfra", "cyp17", "antibody-drug conjugate", "bispecific", "checkpoint", "pd-1", "pd-l1", "ctla-4", "immunosuppressant", "transplant", "dmard", "jak", "jak1", "tyk2", "mtor", "calcineurin", "tnf", "interleukin", "il-1 receptor", "il-1 trap", "monoclonal antibody", "biologic", "immune globulin", "blys", "rankl", "sclerostin", "complement", "p-selectin", "type i interferon", "t-cell", "pyrimidine synthesis", "dhodh", "cd123-directed cytotoxin"],
    contains:["tinib", "ciclib", "platin", "rubicin", "tecan", "mustine", "parib", "rafenib", "taxel", "trexed", "trastuzumab", "bevacizumab", "nivolumab", "pembrolizumab", "ipilimumab", "atezolizumab", "durvalumab", "avelumab", "rituximab", "cetuximab", "ifosfamide", "dactinomycin", "fludarabine", "cytarabine", "gemcitabine", "capecitabine", "fluoropyrimidine", "thioguan", "thiopurine", "mercaptopurine", "asparaginase", "l-asparagine", "chop", "fec100", "vinblastine", "vindesine", "teniposide", "trabectedin", "tipifarnib", "vandetanib", "mitotane", "bisantrene", "belzutifan", "lonafarnib", "anastrozole", "letrozole", "exemestane", "fulvestrant", "bicalutamide", "goserelin", "leuprolide", "mycophenolate", "iguratimod", "anakinra", "rilonacept", "tagraxofusp", "glucarpidase", "dexrazoxane", "amifostine"],
  },
  {
    category:"GI, Endocrine & Metabolic",
    terms:["ppi", "proton pump", "h2 blocker", "gi", "ibd", "5-asa", "alpha-glucosidase", "antidiarrheal", "prokinetic", "antiemetic", "5-ht3", "laxative", "binding resin", "bile acid sequestrant", "pancreatic enzyme", "antacid", "alkalinizing", "biguanide", "sglt2", "sglt2i", "dpp-4", "dpp-4i", "glp-1", "sulfonylurea", "meglitinide", "tzd", "thiazolidinedione", "insulin", "amylin", "diabetes", "antidiabetic", "thyroid", "antithyroid", "bisphosphonate", "calcimimetic", "parathyroid", "vitamin d analog", "hif-ph", "anemia", "erythropoiesis", "iron", "metabolic", "somatostatin", "tyrosinemia", "tetrahydrobiopterin", "phenylalanine", "glucosylceramide", "growth hormone", "igf-1", "glucocorticoid", "glucocorticoids", "corticosteroid", "corticosteroids"],
    contains:["gliptin", "glutide", "glinide", "glyburide", "gliclazide", "gliquidone", "acarbose", "miglitol", "orlistat", "vonoprazan", "resmetirom", "seladelpar", "troglitazone", "sepiapterin", "prazole", "tidine", "salazine", "mesalazine", "balsalazide", "diphenoxylate", "atropine", "colestipol", "methylcellulose", "dicyclomine", "hyoscyamine", "methimazole", "risedronate", "ibandronate", "alendronate", "teriparatide", "abaloparatide", "calcipotriene", "lanreotide", "octreotide", "aprepitant", "fosaprepitant", "casopitant", "dolasetron", "ondansetron", "tropisetron", "pyridoxine"],
  },
  {
    category:"Respiratory, Allergy & Cough",
    terms:["antihistamine", "beta-2 agonist", "bronchodilator", "laba", "lama", "decongestant", "antitussive", "expectorant", "leukotriene", "5-lipoxygenase", "pde4", "muscarinic", "cftr", "respiratory", "asthma", "copd", "allergy", "cough", "nasal", "inhaled", "fluticasone", "budesonide", "beclomethasone", "albuterol"],
    contains:["aclidinium", "formoterol", "salmeterol", "vilanterol", "umeclidinium", "glycopyrronium", "glycopyrrolate", "levalbuterol", "terbutaline", "epinephrine auto-injector", "oxymetazoline", "azelastine", "alcaftadine", "bepotastine", "chlorpheniramine", "clemastine", "desloratadine", "levocetirizine", "epinastine", "nedocromil", "cromolyn", "cyproheptadine", "benzonatate", "guaifenesin", "noscapine", "ivacaftor", "elexacaftor", "tezacaftor", "pirfenidone"],
  },
  {
    category:"Hormones & Reproductive",
    terms:["estrogen", "estradiol", "progestin", "progesterone", "contraceptive", "serm", "progesterone receptor", "5-ari", "androgen", "testosterone", "antiandrogen", "gnrh", "uterotonic", "fertility", "reproductive", "pregnancy", "clomiphene", "ulipristal", "levonorgestrel", "norethindrone", "drospirenone"],
    contains:["estrone", "estropipate", "hydroxyprogesterone", "hydroxytestosterone", "androstenedione", "dronabinol", "desoxycortone", "cortisone", "fludrocortisone", "dutasteride", "finasteride", "dinoprostone", "elagolix", "ospemifene", "raloxifene", "toremifene"],
  },
  {
    category:"Metabolites & Active Moieties",
    terms:["metabolite", "active metabolite", "carboxylic acid", "glucuronide", "sulfate", "sulfoxide", "hydroxy", "desmethyl", "desethyl", "norfluoxetine", "noroxycodone", "noroxymorphone", "n-des", "o-des", "r-eddp", "s-eddp", "sn-38", "simvastatin acid", "lovastatin acid", "atorvastatin lactone", "thiol metabolite", "quinone", "solanidine", "cotinine", "ritalinic acid"],
    contains:["hydroxy", "dehydro", "desmethyl", "desethyl", "nor", "glucuronide", "sulfate", "sulfoxide", "carboxy", "n-oxide", "eddp", "ar-c", "dt-678", "sn-38", "cotinine", "bufuralol", "debrisoquine", "spartein", "coproporphyrin", "bilirubin", "gimeracil", "oteracil", "endoxifen", "pentoxifylline m5", "rhodamine", "toluidine blue", "uracil"],
  },
  {
    category:"Rare Disease & Advanced Therapies",
    terms:["enzyme replacement", "gene therapy", "aav", "oligonucleotide", "antisense", "exon-skipping", "sma", "sod1", "cftr modulator", "rare disease", "lysosomal", "gaucher", "hemoglobin s", "sickle", "fgf23", "smn2", "phenylalanine ammonia lyase"],
  },
  {
    category:"Diagnostics, Antidotes & Procedures",
    terms:["diagnostic", "imaging agent", "contrast", "radiopharmaceutical", "antidote", "reversal agent", "chelator", "detox", "methemoglobinemia", "dye", "surgery", "procedure", "current context", "clinical context"],
    contains:["fomepizole", "calcein", "dimercaprol"],
  },
  {
    category:"Supplements, Foods & Environment",
    terms:["supplement", "vitamin", "mineral", "herbal", "food", "environment", "environmental", "toxicant", "solvent", "industrial", "grapefruit", "pomegranate", "black pepper", "vitamin k", "charbroiled", "smoked foods", "folic acid", "leucovorin", "calcium", "iron", "zinc", "fluoride"],
    contains:["folate", "methylfolate", "glucose", "arachidonic", "berberine", "bergamottin", "coptisine", "forskolin", "pyridoxal", "silibinin", "ammonium lactate"],
  },
  {
    category:"Source Candidates",
    terms:["source candidate drug/substance", "identity context", "review candidate"],
  },
];

const BROWSE_CATEGORY_ORDER = [
  "Mental Health & Neurology",
  "Cardiovascular & Blood",
  "Pain, Sedation & Anesthesia",
  "Infectious Disease",
  "Oncology, Immunology & Transplant",
  "GI, Endocrine & Metabolic",
  "Respiratory, Allergy & Cough",
  "Hormones & Reproductive",
  "Dermatology, Eye & Local Care",
  "Renal, Electrolytes & Urologic",
  "Metabolites & Active Moieties",
  "Rare Disease & Advanced Therapies",
  "Diagnostics, Antidotes & Procedures",
  "Supplements, Foods & Environment",
  "Recreational & Social",
  "Source Candidates",
];

function getBrowseCategory(drug) {
  const text = getBrowseCategoryText(drug);
  const match = BROWSE_CATEGORY_RULES.find(rule => browseRuleMatches(text, rule));
  return match ? match.category : "Source Candidates";
}

const MEDICATION_CLASS_GUIDES = [
  {
    title:"Anticoagulants and antiplatelets",
    note:"Bleeding, CYP2C9/VKORC1, antiplatelet activation, NSAIDs, SSRIs, azoles, and transporter overlap.",
    tags:["bleeding","CYP2C19","CYP2C9","transporters"],
    drugs:["Warfarin","Fluconazole","Ibuprofen"],
    tab:"overview"
  },
  {
    title:"Psychiatry and neurology",
    note:"CYP2D6/CYP2C19 shifts, active-metabolite failures, QT, serotonin toxicity, sedation, and anticholinergic burden.",
    tags:["CYP2D6","CYP2C19","serotonin/QT","burden"],
    drugs:["Paroxetine","Fluoxetine"],
    tab:"overview"
  },
  {
    title:"Cardiology and QT risk",
    note:"Antiarrhythmics, narrow therapeutic index drugs, CYP2D6 metabolism, QT stacking, and electrolyte-sensitive combinations.",
    tags:["QT","NTI","CYP2D6"],
    drugs:["Flecainide","Fluoxetine"],
    genotype:{ CYP2D6:GENOTYPE_PHENOTYPE.PM },
    tab:"genes-metabolites"
  },
  {
    title:"Antibiotics, antifungals, antivirals",
    note:"Macrolides, azoles, rifamycins, boosters, CYP3A4, CYP2C9, P-gp, and OATP pathway risk.",
    tags:["CYP3A4","CYP2C9","P-gp"],
    drugs:["Simvastatin","Clarithromycin"],
    tab:"timing-levels"
  },
  {
    title:"Oncology, immunology, transplant",
    note:"Narrow windows, prodrug activation, genotype actionability, transporters, and strong inhibitor or inducer sensitivity.",
    tags:["NTI","prodrugs","PGx"],
    drugs:["Tacrolimus","Fluconazole"],
    tab:"timing-levels"
  }
];

function renderBrowse() {
  const el = document.getElementById("browseWrap");
  if (!el) return;
  const openCategories = new Set(
    [...el.querySelectorAll(".browse-items.show[data-cat]")]
      .map(node => node.getAttribute("data-cat"))
      .filter(Boolean)
  );
  const groups = {};
  DRUG_DB.forEach(d => {
    const cat = getBrowseCategory(d);
    if (!groups[cat]) groups[cat] = [];
    if (!groups[cat].find(x => x.name === d.name)) groups[cat].push(d);
  });

  const sortedCats = [...new Set([...BROWSE_CATEGORY_ORDER, ...Object.keys(groups)])];

  const categoryCount = sortedCats.filter(c => groups[c]).length;
  el.innerHTML = `<div class="browse-head">
    <div>
      <div class="browse-head-title">Browse Categories</div>
      <span class="browse-head-meta">${categoryCount} groups · select medicines, supplements, or foods</span>
    </div>
    <button type="button" class="sr-close" data-action="close-browse" aria-label="Close browse categories">&times;</button>
  </div>` + renderBrowseClassGuides() + sortedCats.filter(c => groups[c]).map(cat => {
    const open = openCategories.has(cat);
    return `
    <div class="browse-cat">
      <div class="browse-cat-title${open ? " open" : ""}" ${keyboardButtonAttrs()} aria-expanded="${open ? "true" : "false"}" data-action="toggle-browse-category">
        ${cat} <span style="font-weight:400;font-size:12px;color:var(--text2)">(${groups[cat].length})</span>
        <span class="arrow">▶</span>
      </div>
      <div class="browse-items${open ? " show" : ""}" data-cat="${safeAttr(cat)}">
        ${groups[cat].sort((a,b)=>a.name.localeCompare(b.name)).map(d => {
          const alias = typeof getDrugSecondaryLabel === "function" ? getDrugSecondaryLabel(d, 2) : "";
          const selected = activeStack.includes(d.name);
          return `<div class="browse-chip ${selected?'added':''}" ${keyboardButtonAttrs()} aria-pressed="${selected ? "true" : "false"}" data-browse-name="${safeAttr(d.name)}" data-action="toggle-drug" data-name="${safeAttr(d.name)}">${safePublicHtml(d.name)}<span class="browse-chip-class">${safePublicHtml(d.cls)}</span>${alias ? `<span class="browse-chip-alias">${safePublicHtml(alias)}</span>` : ""}</div>`;
        }).join("")}
      </div>
    </div>
  `}).join("");
  if (pendingBrowseFocusDrug) {
    const focusName = pendingBrowseFocusDrug;
    pendingBrowseFocusDrug = null;
    const focusChip = [...el.querySelectorAll(".browse-chip[data-browse-name]")]
      .find(chip => chip.getAttribute("data-browse-name") === focusName);
    if (focusChip && typeof focusChip.focus === "function") focusChip.focus({ preventScroll:true });
  }
}

function renderBrowseClassGuides() {
  return `<div class="class-guide-list">
    ${MEDICATION_CLASS_GUIDES.map((guide, idx) => `<div class="class-guide-card" ${keyboardButtonAttrs()} data-action="load-class-guide" data-index="${idx}">
      <div class="class-guide-title">${guide.title}</div>
      <div class="class-guide-note">${guide.note}</div>
      <div class="class-guide-tags">${guide.tags.map(tag => `<span class="class-guide-tag">${tag}</span>`).join("")}</div>
      <div class="class-guide-action">Load example: ${guide.drugs.join(" + ")}</div>
    </div>`).join("")}
  </div>`;
}

function loadMedicationClassGuide(index) {
  const guide = MEDICATION_CLASS_GUIDES[index];
  if (!guide) return;
  if (typeof resetActiveGenotypeState === "function") resetActiveGenotypeState();
  activeStack = guide.drugs
    .map(name => typeof resolveUrlDrugName === "function" ? resolveUrlDrugName(name) : name)
    .filter(Boolean);
  for (const [gene, phenotype] of Object.entries(guide.genotype || {})) {
    if (GENOTYPE_EFFECTS[gene] && GENOTYPE_EFFECTS[gene][phenotype]) setGenotypeState(gene, phenotype);
  }
  setActiveTab(guide.tab || "overview");
  setViewMode("search");
  renderAll();
}

function toggleBrowseCat(el) {
  el.classList.toggle("open");
  el.nextElementSibling.classList.toggle("show");
  el.setAttribute("aria-expanded", el.classList.contains("open") ? "true" : "false");
}

function toggleDrug(name) {
  pendingBrowseFocusDrug = viewMode === "browse" ? name : null;
  if (activeStack.includes(name)) removeDrug(name);
  else addDrug(name);
}

function toggleSection(id) {
  const body = document.getElementById(id + "Body");
  if (!body) return;
  body.classList.toggle("open");
  manualSectionToggleKeys[id] = getRenderCacheKey();
  syncCollapsibleSectionControls();
}

function applyRawMetaboliteMapDefault() {
  const body = document.getElementById("metabBody");
  if (!body) return;
  const key = getRenderCacheKey();
  if (manualSectionToggleKeys.metab === key) return;
  const rows = typeof getRenderComputationCache === "function"
    ? getRenderComputationCache().activeMoietyRows
    : [];
  if (rows.length) body.classList.remove("open");
  else body.classList.add("open");
}

function hideSectionAndClear(sectionId, bodyId, countId = null) {
  const section = document.getElementById(sectionId);
  const body = bodyId ? document.getElementById(bodyId) : null;
  const count = countId ? document.getElementById(countId) : null;
  if (section) section.style.display = "none";
  if (body) body.innerHTML = "";
  if (count) count.textContent = "";
}

function currentStackUrlParams(tab = activeTab, options = {}) {
  const includeReviewer = options.includeReviewer !== false;
  const params = [];
  if (activeStack.length) {
    params.push(["substances", activeStack.map(name => {
      const actor = typeof getStackSupplementActor === "function" ? getStackSupplementActor(name) : null;
      const drug = typeof getStackDrug === "function" ? getStackDrug(name) : getDrug(name);
      return actor?.id || drug?.id || toGraphId(name);
    }).join(",")]);
  }
  for (const token of activeGenotypeUrlTokens()) params.push(["genotype", token]);
  if (includeReviewer && isReviewerMode()) params.push(["reviewer", "1"]);
  const shareTab = tab === "review" && !isReviewerMode() ? "overview" : tab;
  if (shareTab) params.push(["tab", shareTab]);
  return params;
}

function currentStackQuery(tab = activeTab, options = {}) {
  return currentStackUrlParams(tab, options)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeUrlStateValueLocal(value)}`)
    .join("&");
}

function currentStackShareUrl(tab = activeTab, options = {}) {
  const query = currentStackQuery(tab, { includeReviewer:false, ...options });
  return `https://diogonmpacheco.github.io/Diognosis/index.html${query ? `#${query}` : ""}`;
}

function hasUrlSelectionState() {
  if (typeof window === "undefined") return false;
  const search = String(window.location?.search || "");
  const hash = String(window.location?.hash || "");
  return /(?:^|[?&#])(?:substances|drugs|medications|genotype|audience|view|tab|reviewer|reviewMode|demo)=/i.test(search + hash);
}

function shouldExposeCurrentStateInUrl(tab = activeTab) {
  const shareTab = tab === "review" && !isReviewerMode() ? "overview" : tab;
  return activeStack.length > 0 ||
    activeGenotypeUrlTokens().length > 0 ||
    shareTab !== "overview" ||
    isReviewerMode();
}

function currentBrowserUrlPath() {
  const path = typeof window !== "undefined" ? (window.location?.pathname || "") : "";
  return path.endsWith("/") ? `${path}index.html` : (path || "/index.html");
}

function syncUrlStateFromSelection(tab = activeTab) {
  if (typeof window === "undefined" || !window.history || typeof window.history.replaceState !== "function") return;
  const shouldExpose = shouldExposeCurrentStateInUrl(tab);
  if (!shouldExpose && !hasUrlSelectionState()) return;
  const query = shouldExpose ? currentStackQuery(tab) : "";
  const nextUrl = `${currentBrowserUrlPath()}${query ? `#${query}` : ""}`;
  const currentUrl = `${window.location.pathname || ""}${window.location.search || ""}${window.location.hash || ""}`;
  if (nextUrl !== currentUrl) window.history.replaceState(null, "", nextUrl);
}

function activeGenotypeUrlTokens() {
  const tokens = [];
  const genotypeState = typeof activeGenotype !== "undefined" ? activeGenotype : {};
  for (const [gene, phenotype] of Object.entries(genotypeState || {})) {
    if (GENOTYPE_EFFECTS[gene] && phenotype && phenotype !== GENOTYPE_PHENOTYPE.NM) {
      tokens.push(activeGenotypeUrlToken(gene, phenotype));
    } else if (typeof GENOTYPE_RISK_EFFECTS !== "undefined" && GENOTYPE_RISK_EFFECTS[gene] && phenotype === GENOTYPE_RISK_STATUS.PRESENT) {
      tokens.push(riskMarkerTokenForUrl(gene));
    }
  }
  return tokens;
}

function activeGenotypeHandoffLabels() {
  const labels = [];
  const genotypeState = typeof activeGenotype !== "undefined" ? activeGenotype : {};
  for (const [gene, phenotype] of Object.entries(genotypeState || {})) {
    if (GENOTYPE_EFFECTS[gene] && phenotype && phenotype !== GENOTYPE_PHENOTYPE.NM) {
      const token = activeGenotypeUrlToken(gene, phenotype);
      if (token.endsWith(":null")) {
        const interpreted = typeof phenotypeLabelForGene === "function"
          ? phenotypeLabelForGene(gene, phenotype)
          : genotypeTokenForUrl(phenotype);
        labels.push(`${token} (interpreted as ${interpreted})`);
      } else {
        labels.push(token);
      }
    } else if (typeof GENOTYPE_RISK_EFFECTS !== "undefined" && GENOTYPE_RISK_EFFECTS[gene] && phenotype === GENOTYPE_RISK_STATUS.PRESENT) {
      labels.push(riskMarkerTokenForUrl(gene));
    }
  }
  return labels;
}

function activeGenotypeUrlToken(gene, phenotype) {
  if (phenotype === GENOTYPE_PHENOTYPE.PM && isReportedNullGenotype(gene)) return `${gene}:null`;
  return `${gene}:${genotypeTokenForUrl(phenotype)}`;
}

function isReportedNullGenotype(gene) {
  const legacy = typeof userGenetics !== "undefined" ? userGenetics?.[gene] : "";
  if (legacy === "null") return true;
  const detail = typeof activeGenotypeDetails !== "undefined" ? activeGenotypeDetails?.[gene] : null;
  const mechanism = String(detail?.mechanism || "");
  const reported = String(detail?.reportedLabel || "").toLowerCase();
  return mechanism === "inherited_no_function" || /(^|\b)(null|no[-\s]?function|nonfunctional|deletion|deleted|absent)(\b|$)/.test(reported);
}

function genotypeTokenForUrl(phenotype) {
  if (phenotype === GENOTYPE_PHENOTYPE.PM) return "PM";
  if (phenotype === GENOTYPE_PHENOTYPE.IM) return "IM";
  if (phenotype === GENOTYPE_PHENOTYPE.UM) return "UM";
  return String(phenotype || "");
}

function riskMarkerTokenForUrl(gene) {
  if (gene === "G6PD deficiency") return "G6PD:deficiency";
  if (gene === "RYR1/CACNA1S MH variant") return "RYR1:present";
  return `${gene}:present`;
}

function encodeUrlStateValueLocal(value) {
  return encodeURIComponent(value).replace(/%2C/g, ",").replace(/%3A/g, ":");
}

function buildDiognosisIssueUrl({ type = "data", title = "", focus = "", details = "", evidenceRefs = [], includeUserContext = false } = {}) {
  const labels = type === "bug" ? "bug" : "data-review";
  const safeTitle = includeUserContext && title
    ? title
    : type === "evidence"
      ? "[Evidence suggestion]: Diognosis"
      : type === "scenario"
        ? "[Scenario request]: Diognosis"
        : "[Data review]: Diognosis";
  const body = [
    "## Diognosis feedback",
    `- Type: ${type}`,
    includeUserContext && focus ? `- Focus: ${focus}` : "",
    includeUserContext && evidenceRefs && evidenceRefs.length ? `- Evidence refs: ${evidenceRefs.join(", ")}` : "",
    "",
    "## What should change?",
    includeUserContext && details
      ? details
      : "Describe the suspected issue, missing evidence, stale source, or confusing behavior. Add medication or genotype context only if you intentionally want to share it publicly.",
    "",
    "## Public sources",
    "Add PMID, DOI, DailyMed/FDA, CPIC/DPWG, guideline, label, or other public source identifiers.",
    "",
    "## Optional context",
    "If useful, paste a copied V1 review summary or share link from Diognosis. Do not include private patient data.",
    "",
    "## Review note",
    "Diognosis feedback links are privacy-preserving by default: they do not include the current medication list, genotype settings, share URL, or browser URL unless a contributor intentionally adds that information."
  ].filter(Boolean).join("\n");
  const params = new URLSearchParams({
    title:safeTitle,
    body,
    labels,
  });
  return `https://github.com/diogonmpacheco/Diognosis/issues/new?${params.toString()}`;
}

function renderFeedbackLink(label, options = {}) {
  const href = buildDiognosisIssueUrl(options);
  return `<a class="feedback-link" href="${escapeHtml(href)}" target="_blank" rel="noopener" data-stop-propagation="true">${escapeHtml(label)}</a>`;
}

// ── RENDER ALL ──
function renderAll() {
  syncAudienceModeUI();
  const activeDrugNames = typeof getActiveDrugNames === "function" ? getActiveDrugNames() : activeStack.filter(name => getDrug(name));
  arrangeAdvancedSections();
  renderMedList();
  renderGenetics();
  renderClinicalContextPanel();
  if (activeStack.length >= 1) {
    renderFoldBars();
    renderMetabolites();
    renderPathwayDiversions();
    renderCascade();                // Phase 3: graph traversal
    renderGenotypePanel();          // Phase 5 #2: genotype-stratified evidence
    if (typeof renderPhenoconversionDashboard === "function") renderPhenoconversionDashboard();
    if (typeof renderActiveMoietyBalance === "function") renderActiveMoietyBalance();
    applyRawMetaboliteMapDefault();
    renderMechanisticPredictions(); // Experimental model predictions
    renderPhenotypeAccumulation();  // Phase 5 #6: serotonin/QTc/anticholinergic
    renderPKSimulation();           // Phase 5 #1: 1-compartment PK curves
    if (typeof renderPersistenceTimeline === "function") renderPersistenceTimeline();
    renderInteractionGraph();       // Phase 5 #4: D3 force-directed graph
    renderWashoutCalendar();        // Phase 5 #9: safe-to-switch dates
    renderAdverseBurden();          // Phase 5 #10: ACB + Beers + fall risk
    document.getElementById("foldSection").style.display = activeDrugNames.length ? "" : "none";
    document.getElementById("metabSection").style.display = activeDrugNames.length ? "" : "none";
    document.getElementById("pdSection").style.display = activeDrugNames.length ? "" : "none";
  } else {
    clearCurrentFindingState();
    hideSectionAndClear("scopeSection", "scopeBody", "scopeCount");
    hideSectionAndClear("findingSection", "findingBody", "findingCount");
    hideSectionAndClear("circulatingSection", "circulatingBody", "circulatingCount");
    hideSectionAndClear("phenoconversionSection", "phenoconversionBody", "phenoconversionCount");
    hideSectionAndClear("activeMoietySection", "activeMoietyBody", "activeMoietyCount");
    hideSectionAndClear("persistenceTimelineSection", "persistenceTimelineBody", "persistenceTimelineCount");
    hideSectionAndClear("foldSection", "foldBody");
    hideSectionAndClear("metabSection", "metabBody");
    hideSectionAndClear("pdSection", "pdBody");
    hideSectionAndClear("cascadeSection", "cascadeBody");
    hideSectionAndClear("evidenceSection", "evidenceBody", "evidenceCount");
    hideSectionAndClear("sourceIntegrationCandidateSection", "sourceIntegrationCandidateBody", "sourceIntegrationCandidateCount");
    hideSectionAndClear("reviewSummarySection", "reviewSummaryBody", "reviewSummaryCount");
    hideSectionAndClear("mechanismWhySection", "mechanismWhyBody", "mechanismWhyCount");
    hideSectionAndClear("scenarioSnapshotSection", "scenarioSnapshotBody", "scenarioSnapshotCount");
    hideSectionAndClear("metaboliteGapSection", "metaboliteGapBody", "metaboliteGapCount");
    hideSectionAndClear("contributeSection", "contributeBody");
    hideSectionAndClear("warningPathSection", "warningPathBody", "warningPathCount");
    hideSectionAndClear("qualitySection", "qualityBody", "qualityCount");
    hideSectionAndClear("genotypeSection", "genotypeBody");
    hideSectionAndClear("mechanisticSection", "mechanisticBody", "mechanisticCount");
    hideSectionAndClear("phenoAccumSection", "phenoAccumBody");
    hideSectionAndClear("pkSimSection", "pkSimBody");
    hideSectionAndClear("persistenceTimelineSection", "persistenceTimelineBody", "persistenceTimelineCount");
    hideSectionAndClear("graphSection", "graphBody");
    hideSectionAndClear("washoutSection", "washoutBody");
    hideSectionAndClear("burdenSection", "burdenBody");
  }
  if (activeStack.length >= 2) {
    const risk = typeof getRenderComputationCache === "function"
      ? getRenderComputationCache().risk
      : calcRisk();
    renderReviewScopePanel();
    if (isReviewerMode()) {
      renderRiskGauge(risk);
      document.getElementById("riskSection").style.display = "";
    } else {
      hideSectionAndClear("riskSection", "riskBody");
    }
    renderInteractionFindingsOverview(risk);
    renderCirculatingOverview();
    if (typeof renderMechanismWhyPaths === "function") renderMechanismWhyPaths();
    renderTransporterDDI();
    if (isReviewerMode()) document.getElementById("scopeSection").style.display = "";
    document.getElementById("findingSection").style.display = "";
    if (isReviewerMode()) {
      renderInteractions(risk.interactions);
      renderCombinationProducts();
      renderMatrix(risk.interactions);
      document.getElementById("interSection").style.display = "";
      document.getElementById("comboSection").style.display = "";
      document.getElementById("matrixSection").style.display = "";
    } else {
      hideSectionAndClear("interSection", "interBody", "interCount");
      hideSectionAndClear("comboSection", "comboBody", "comboCount");
      hideSectionAndClear("matrixSection", "matrixBody");
    }
    document.getElementById("transporterSection").style.display = "";
  } else {
    if (activeDrugNames.length) {
      renderInteractionFindingsOverview({ interactions:[] });
      renderCirculatingOverview();
      renderReviewScopePanel();
      if (typeof renderMechanismWhyPaths === "function") renderMechanismWhyPaths();
    }
    else {
      clearCurrentFindingState();
      hideSectionAndClear("findingSection", "findingBody", "findingCount");
      hideSectionAndClear("circulatingSection", "circulatingBody", "circulatingCount");
      hideSectionAndClear("mechanismWhySection", "mechanismWhyBody", "mechanismWhyCount");
      hideSectionAndClear("warningPathSection", "warningPathBody", "warningPathCount");
    }
    hideSectionAndClear("riskSection", "riskBody");
    hideSectionAndClear("interSection", "interBody", "interCount");
    hideSectionAndClear("comboSection", "comboBody", "comboCount");
    hideSectionAndClear("transporterSection", "transporterBody", "transporterCount");
    hideSectionAndClear("matrixSection", "matrixBody");
  }
  renderSummaryBar();
  applyReviewerVisibility();
  updateEmptyTabs();
  if (viewMode === "browse") renderBrowse();
  syncCollapsibleSectionControls();
  syncUrlStateFromSelection(activeTab);
}

function renderMedList() {
  const el = document.getElementById("medList");
  const countEl = document.getElementById("medCount");
  if (!activeStack.length) {
    const emptyCopy = "Add medicines, supplements, or foods above to start a medication review";
    const undoHtml = lastClearedSelection?.stack?.length
      ? `<button type="button" class="empty-undo-btn" data-action="restore-cleared-list">Undo clear</button>`
      : "";
    el.innerHTML = `<div class="empty-state"><div class="icon">💊</div>${emptyCopy}${undoHtml ? ` ${undoHtml}` : ""}</div>`;
    countEl.textContent = "";
    return;
  }
  countEl.textContent = `${activeStack.length} item${activeStack.length>1?"s":""} selected`;
  el.innerHTML = activeStack.map(name => {
    const actor = typeof getStackSupplementActor === "function" ? getStackSupplementActor(name) : null;
    const drug = typeof getStackDrug === "function" ? getStackDrug(name) : getDrug(name);
    const actorId = actor?.id || "";
    const actionName = drug ? drug.name : name;
    const tiers = DOSE_TIERS[name];
    let doseHtml = "";
    if (drug && tiers) {
      const current = getDoseTier(name);
      const opts = Object.entries(tiers.tiers).map(([k,v]) =>
        `<option value="${k}"${k===current?" selected":""}>${v.label}</option>`
      ).join("");
      doseHtml = `<select class="dose-select" data-action="set-dose-tier" data-name="${safeAttr(actionName)}" data-stop-propagation="true">${opts}</select>`;
    }
    const recognized = !!(drug || actor);
    const secondary = drug
      ? (typeof getDrugSecondaryLabel === "function" ? getDrugSecondaryLabel(drug, 2) : "")
      : (actor ? formatActorSources(actor) : "Not checked here");
    const primary = drug ? getDrugDisplayName(drug) : (actor ? actor.name : name);
    const labelHtml = `<span class="med-chip-name"><span class="med-chip-primary">${safePublicHtml(primary)}</span>${secondary ? `<span class="med-chip-secondary">${safePublicHtml(secondary)}</span>` : ""}</span>`;
    const removeAction = actor && !drug ? "remove-food-actor" : "remove-drug";
    const removeData = actor && !drug ? `data-actor-id="${safeAttr(actorId)}"` : `data-name="${safeAttr(actionName)}"`;
    const chipClass = recognized ? "med-chip" : "med-chip unrecognized";
    const removeLabel = `Remove ${primary}`;
    return `<span class="${chipClass}" title="${secondary ? safeAttr(secondary) : ""}">${labelHtml}${doseHtml}<button type="button" class="x" aria-label="${safeAttr(removeLabel)}" data-action="${removeAction}" ${removeData}>×</button></span>`;
  }).join("") + renderSelectedListActions();
}

function renderSelectedListActions() {
  if (!activeStack.length) return "";
  const reviewLabel = "Review overview";
  return `<div class="selected-list-actions">
    <button type="button" class="selected-list-action primary" data-action="focus-review-notes">${safePublicHtml(reviewLabel)}</button>
    <button type="button" class="selected-list-action" data-action="clear-selected-list">Clear list</button>
  </div>`;
}

function inlineJsString(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/[\u0000-\u001f\u007f]/g, " ");
}

function renderCirculatingOverview() {
  const section = document.getElementById("circulatingSection");
  const body = document.getElementById("circulatingBody");
  const count = document.getElementById("circulatingCount");
  if (!section || !body) return [];
  if (!activeStack.length || typeof computeActorExposureDeltas !== "function") {
    hideSectionAndClear("circulatingSection", "circulatingBody", "circulatingCount");
    return [];
  }
  const rows = computeActorExposureDeltas(activeStack)
    .filter(row => row.type === "parent" || row.direction !== "baseline")
    .slice(0, 8);
  section.style.display = "";
  if (count) count.textContent = `${rows.length} item${rows.length === 1 ? "" : "s"}`;
  if (!rows.length) {
    body.innerHTML = `<div class="circulating-empty">No exposure or metabolite direction changes are available for the selected list.</div>`;
    return rows;
  }
  body.innerHTML = `${renderCirculatingDirectionMap(rows)}<div class="circulating-grid">${rows.map(renderCirculatingCard).join("")}</div>`;
  return rows;
}

function renderCirculatingDirectionMap(rows = []) {
  const changedRows = rows.filter(row => row.direction !== "baseline");
  const lead = changedRows[0] || rows[0] || {};
  const counts = {
    higher: rows.filter(row => row.direction === "increase").length,
    lower: rows.filter(row => row.direction === "decrease").length,
    expected: rows.filter(row => row.direction === "baseline").length,
  };
  const leadText = lead.name
    ? `${lead.name}: ${formatExposureDirectionValue(lead, { words:true })}`
    : "No directional signal";
  return `<div class="circulating-map" aria-label="Exposure direction map">
    <div class="circulating-map-head">
      <div>
        <div class="circulating-map-kicker">Direction map</div>
        <div class="circulating-map-title">${safePublicHtml(leadText)}</div>
      </div>
      <div class="circulating-map-counts">
        <span>${counts.higher} higher</span>
        <span>${counts.expected} expected</span>
        <span>${counts.lower} lower</span>
      </div>
    </div>
    <div class="circulating-map-rows">${rows.slice(0, 6).map(renderCirculatingMapRow).join("")}</div>
    ${rows.length > 6 ? `<div class="circulating-map-more">+${rows.length - 6} more below</div>` : ""}
  </div>`;
}

function renderCirculatingMapRow(row = {}) {
  const { marker, left, width, tone } = exposureMeterGeometry(row);
  const parent = row.type === "metabolite" && row.parent ? ` from ${row.parent}` : "";
  const kind = `${row.type || "actor"}${parent}`;
  return `<div class="circulating-map-row">
    <div class="circulating-map-label">
      <span class="circulating-map-name">${safePublicHtml(row.name || "Unknown actor")}</span>
      <span class="circulating-map-kind">${safePublicHtml(kind)}</span>
    </div>
    <div class="circulating-map-track" aria-label="${safeAttr(`${row.name || "Unknown actor"} ${formatExposureDirectionValue(row, { words:true })}`)}">
      <div class="circulating-map-band"></div>
      <div class="circulating-map-fill ${safeAttr(tone)}" style="left:${safeAttr(left)}%;width:${safeAttr(width)}%"></div>
      <div class="circulating-map-marker" style="left:calc(${safeAttr(marker)}% - 2px)"></div>
    </div>
    <div class="circulating-map-value ${safeAttr(tone)}">${safePublicHtml(formatExposureDirectionValue(row, { words:true }))}</div>
  </div>`;
}

function renderCirculatingCard(row = {}) {
  const direction = row.direction || "baseline";
  const up = direction === "increase";
  const down = direction === "decrease";
  const tone = up ? "up" : down ? "down" : "";
  const value = formatExposureDirectionValue(row);
  const parent = row.type === "metabolite" && row.parent ? ` from ${row.parent}` : "";
  const note = [
    row.driver || "current stack",
    parent ? parent.trim() : "",
    row.note || "",
  ].filter(Boolean).join(" · ");
  return `<div class="circulating-card">
    <div class="circulating-head">
      <div>
        <div class="circulating-name">${safePublicHtml(row.name || "Unknown actor")}</div>
        <div class="circulating-kind">${safePublicHtml(row.type || "actor")}</div>
      </div>
      <span class="circulating-value ${safeAttr(tone)}">${safePublicHtml(value)}</span>
    </div>
    <div class="circulating-note">${safePublicHtml(note || "No directional change detected.")}</div>
  </div>`;
}

function formatExposureDirectionValue(row = {}, options = {}) {
  const direction = row.direction || "baseline";
  const fold = Number(row.fold);
  const up = direction === "increase";
  const down = direction === "decrease";
  const directionLabel = up ? "higher" : down ? "lower" : "expected";
  if (direction === "baseline") return options.words ? "expected" : "baseline";
  if (options.words) {
    return Number.isFinite(fold) && fold > 0
      ? `${fold.toFixed(fold >= 10 ? 1 : 2)}x ${directionLabel}`
      : directionLabel;
  }
  if (Number.isFinite(fold) && fold > 0) return `${up ? "↑" : down ? "↓" : "↔"} ${fold.toFixed(fold >= 10 ? 1 : 2)}×`;
  return `${up ? "↑" : down ? "↓" : "↔"} direction`;
}

function renderRiskGauge(risk) {
  const el = document.getElementById("riskBody");
  const pct = Math.min(100, risk.score);
  const barColor = risk.score >= 60 ? "var(--red)" : risk.score >= 30 ? "var(--amber)" : "var(--green)";
  el.innerHTML = `
    <div class="gauge-wrap">
      <div class="gauge-label" style="color:${risk.color}">${risk.level}</div>
      <div class="gauge-bar"><div class="gauge-fill" style="width:${pct}%;background:${barColor}"></div></div>
      <div class="gauge-score">Risk score: ${risk.score}/100</div>
      <div class="risk-factors">
        ${risk.factors.map(f => `<span class="risk-tag ${safeAttr(f.color)}">${safePublicHtml(f.label)}</span>`).join("")}
      </div>
    </div>`;
}
