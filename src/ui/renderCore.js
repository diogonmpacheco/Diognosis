// Diognosis — Core app state management and main render loop
// Phase A: modular source — concatenated by build.js

function addDrug(name) {
  if (!activeStack.includes(name)) {
    activeStack.push(name);
    document.getElementById("searchInput").value = "";
    document.getElementById("searchResults").classList.remove("show");
    renderAll();
  }
}

function removeDrug(name) {
  activeStack = activeStack.filter(n => n !== name);
  delete drugDoses[name];
  renderAll();
}

function addFoodActor(id) {
  const actor = typeof getSupplementActor === "function" ? getSupplementActor(id) : null;
  const actorId = actor ? actor.id : id;
  if (!activeStack.includes(actorId)) {
    activeStack.push(actorId);
    document.getElementById("searchInput").value = "";
    document.getElementById("searchResults").classList.remove("show");
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
  if (!alreadySelected) activeStack.push(name);
  document.getElementById("searchInput").value = "";
  document.getElementById("searchResults").classList.remove("show");
  renderAll();
}

function removeFoodActor(id) {
  const actor = typeof getSupplementActor === "function" ? getSupplementActor(id) : null;
  const actorId = actor ? actor.id : id;
  activeStack = activeStack.filter(n => {
    const selectedActor = typeof getStackSupplementActor === "function" ? getStackSupplementActor(n) : null;
    return (selectedActor ? selectedActor.id : n) !== actorId;
  });
  renderAll();
}

function swapDrug(oldName, newName) {
  const idx = activeStack.indexOf(oldName);
  if (idx >= 0) activeStack[idx] = newName;
  else activeStack.push(newName);
  renderAll();
}

let viewMode = "search";
let activeTab = "overview";
let audienceMode = "clinician";
let currentInteractionFindings = [];
let currentClinicalConcerns = [];
let currentPublicFindingPresentations = [];
let renderComputationCache = null;
let lazyRenderState = { evidenceKey:"", reviewKey:"" };
let manualSectionToggleKeys = {};
const DIOGNOSIS_TABS = ["overview","mechanisms","genes-metabolites","timing-levels","evidence","review"];
const AUDIENCE_MODES = ["patient","clinician"];

function keyboardButtonAttrs() {
  return `role="button" tabindex="0" onkeydown="activateKeyboardButton(event)"`;
}

function activateKeyboardButton(event) {
  if (!event || (event.key !== "Enter" && event.key !== " ")) return;
  event.preventDefault();
  event.currentTarget?.click();
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

function normalizeAudienceMode(value) {
  const key = String(value || "").trim().toLowerCase();
  if (key === "patient" || key === "simple" || key === "public") return "patient";
  if (key === "clinician" || key === "clinical" || key === "professional" || key === "reviewer") return "clinician";
  return null;
}

function isPatientAudience() {
  return audienceMode === "patient";
}

function isReviewerMode() {
  const params = typeof getUrlStateParams === "function" ? getUrlStateParams() : {};
  const raw = String(params.reviewer || params.reviewMode || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "reviewer";
}

function setAudienceMode(mode, options = {}) {
  audienceMode = normalizeAudienceMode(mode) || "clinician";
  if (isPatientAudience() && activeTab !== "overview") setActiveTab("overview");
  lazyRenderState = { evidenceKey:"", reviewKey:"" };
  syncAudienceModeUI();
  if (options.render !== false) renderAll();
}

function syncAudienceModeUI() {
  const patient = isPatientAudience();
  if (document.body) document.body.dataset.audience = audienceMode;
  for (const mode of AUDIENCE_MODES) {
    const btn = document.getElementById(`audience-${mode}`);
    if (!btn) continue;
    btn.classList.toggle("active", mode === audienceMode);
    btn.setAttribute("aria-pressed", mode === audienceMode ? "true" : "false");
  }
  const tagline = document.getElementById("audienceTagline") || document.querySelector(".header p");
  if (tagline) {
    tagline.textContent = patient
      ? "Diognosis helps you prepare medicine-list questions for a doctor or pharmacist."
      : "Diognosis - parent drugs, metabolites, genes, pathways, PK timing, and source-linked evidence checked together";
  }
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.placeholder = patient
      ? "Search medicines, supplements, foods..."
      : "Search medications, supplements, foods...";
  }
  const listTitle = document.getElementById("listTitle");
  if (listTitle) listTitle.textContent = patient ? "My Medicine List" : "Selected List";
  const geneTitle = document.getElementById("geneSectionTitle");
  if (geneTitle) {
    geneTitle.innerHTML = patient
      ? 'Gene Results <span style="font-size:11px;font-weight:400;color:var(--text2)">(optional)</span>'
      : 'Gene / Marker Results <span style="font-size:11px;font-weight:400;color:var(--text2)">(optional)</span>';
  }
  const geneIntro = document.getElementById("geneSectionIntro");
  if (geneIntro) {
    geneIntro.textContent = patient
      ? "Only add a medication gene-test result if you already have one. Do not guess a result; bring the original report to a doctor or pharmacist."
      : "Set inherited gene or marker results here. The Genes + Metabolites tab shows how your list may change medication response, pathway activity, and metabolite balance.";
  }
  const findingTitle = document.getElementById("findingTitle");
  if (findingTitle) findingTitle.textContent = patient ? "Safety Notes" : "Interaction Findings";
}

function setViewMode(m) {
  viewMode = m;
  const searchBtn = document.getElementById("searchModeBtn");
  const browseBtn = document.getElementById("browseModeBtn");
  if (searchBtn) {
    searchBtn.className = "mode-btn" + (m==="search"?" active":"");
    searchBtn.setAttribute("aria-pressed", m==="search" ? "true" : "false");
  }
  if (browseBtn) {
    browseBtn.className = "mode-btn" + (m==="browse"?" active":"");
    browseBtn.setAttribute("aria-pressed", m==="browse" ? "true" : "false");
  }
  document.getElementById("browseWrap").className = "browse-wrap" + (m==="browse"?" show":"");
  if (m==="browse") renderBrowse();
}

function setTab(name) {
  const resolvedTab = setActiveTab(name);
  DIOGNOSIS_TABS.forEach(t => {
    const panel = document.getElementById("tab-" + t);
    const btn = document.getElementById("tabbtn-" + t);
    const reviewerTab = t === "review";
    if (panel) {
      panel.classList.toggle("active", t === resolvedTab);
      if (reviewerTab && !isReviewerMode()) panel.style.display = "none";
    }
    if (btn) {
      btn.classList.toggle("active", t === resolvedTab);
      if (reviewerTab) btn.style.display = isReviewerMode() ? "" : "none";
    }
  });
  renderLazyTab(resolvedTab);
  updateEmptyTabs();
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
    if (typeof el.scrollIntoView === "function") el.scrollIntoView({ behavior:"smooth", block:"center" });
    el.classList.remove("focus-pulse");
    void el.offsetWidth;
    el.classList.add("focus-pulse");
    window.setTimeout(() => el.classList.remove("focus-pulse"), 2200);
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(runFocus);
  else runFocus();
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
    audience: audienceMode,
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
    pendingReviewContext:null,
    pendingCoreContext:null,
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
    if (typeof renderReviewWorkbench === "function") renderReviewWorkbench();
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
  if (!bar || !tabBar) return;

  const overviewBtn = document.getElementById("tabbtn-overview");
  const tabPanels = DIOGNOSIS_TABS
    .map(t => document.getElementById("tab-" + t))
    .filter(Boolean);
  if (activeStack.length < 1) {
    bar.style.display = "none";
    tabBar.style.display = "none";
    tabPanels.forEach(panel => { panel.style.display = "none"; });
    if (overviewBtn) overviewBtn.innerHTML = "Overview";
    return;
  }

  bar.style.display = "";
  if (isPatientAudience()) setActiveTab("overview");
  tabBar.style.display = isPatientAudience() ? "none" : "";
  tabPanels.forEach(panel => { panel.style.display = ""; });
  setTab(activeTab);

  let riskClass = "neutral";
  let scoreValue = "—";
  let scoreLabel = "Add 2+";
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
    scoreValue = interactionScore;
    scoreLabel = risk.level.split(" ")[0];
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
    scoreValue = genotypePriority.score;
    scoreLabel = genotypePriority.label;
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

  const primaryPresentation = getCurrentPublicFindingPresentations()[0] || null;
  const isGenotypePriority = genotypePriority && genotypePriority.score > interactionScore;
  const jumpTab = primaryPresentation ? primaryPresentation.targetTab : (isGenotypePriority ? (genotypePriority.targetTab || "genes-metabolites") : "overview");
  const jumpTarget = primaryPresentation ? primaryPresentation.targetElementId : (isGenotypePriority ? (genotypePriority.targetElementId || "genotypeSection") : "findingSection");

  const patient = isPatientAudience();
  if (patient) {
    if (primaryPresentation) {
      const serious = primaryPresentation.severity === "critical" || primaryPresentation.severity === "severe";
      headline = patientFindingTitleText(primaryPresentation);
      summaryCopy = serious
        ? "A higher-priority safety note was found for this list. Discuss it before starting, stopping, or changing medicines."
        : "A safety note was found for this list. Discuss the next step before changing medicines.";
      nextStep = patientFindingStepText(primaryPresentation, "review");
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
  }

  const summaryKicker = patient ? (primaryPresentation ? "Main Safety Note" : "Current Check") : "Highest Priority";
  const jumpLabel = patient ? "View note" : "View finding";
  const hasVisibleSummaryJump = Boolean(primaryPresentation) || activeStack.length >= 2 || (!patient && Boolean(isGenotypePriority));
  const summaryJumpHtml = hasVisibleSummaryJump
    ? `<button type="button" class="summary-jump" onclick="focusPriorityFinding('${safeAttr(jumpTab)}','${safeAttr(jumpTarget)}')">${safePublicHtml(jumpLabel)}</button>`
    : "";
  const nextLabel = patient ? "Next step" : "Next review";

    bar.innerHTML = `<div class="summary-card">
    <div class="summary-main">
      <div>
        <div class="summary-kicker">${safePublicHtml(summaryKicker)}</div>
        <div class="summary-title">${safePublicHtml(headline)}</div>
        <div class="summary-copy">${summaryCopy ? `${safePublicHtml(summaryCopy)} ` : ""}${summaryJumpHtml}</div>
      </div>
      ${patient ? "" : `<div class="summary-risk ${riskClass}">
        <div class="num">${scoreValue}</div>
        <div class="lbl">${safePublicHtml(scoreLabel)}</div>
      </div>`}
    </div>
    ${renderPriorityStory(priorityStory)}
    <div class="summary-next"><span class="summary-next-pill">${safePublicHtml(nextLabel)}</span><span>${safePublicHtml(nextStep)}</span></div>
    ${renderSummaryActions(patient)}
  </div>`;
  const badge = severeCount > 0 ? `<span class="tab-badge">${severeCount}</span>` : "";
  if (overviewBtn) overviewBtn.innerHTML = "Overview" + badge;
}

function renderSummaryActions(patient = isPatientAudience()) {
  const shareUrl = typeof currentStackShareUrl === "function" ? currentStackShareUrl("overview") : "";
  const copyLabel = patient ? "Copy questions" : "Copy handoff";
  return `<div class="summary-actions">
    <button type="button" class="summary-action-btn" onclick="copyOverviewHandoffSummary()">${safePublicHtml(copyLabel)}</button>
    ${shareUrl ? `<a class="summary-action-btn" href="${safeAttr(shareUrl)}" target="_blank" rel="noopener">Share link</a>` : ""}
    <span class="summary-action-status" id="summaryCopyStatus"></span>
    <pre class="summary-copy-text" id="summaryCopyText" hidden></pre>
  </div>`;
}

function buildOverviewHandoffText() {
  if (isPatientAudience()) return buildPatientQuestionSummaryText();
  if (typeof buildV1HandoffSummaryText === "function") return buildV1HandoffSummaryText({ limit:5 });
  return [
    "Diognosis V1 handoff summary",
    `Stack: ${(activeStack || []).join(" + ") || "none selected"}`,
    "Boundary: not medical advice; review with a qualified clinician or pharmacist.",
  ].join("\n");
}

function buildPatientQuestionSummaryText() {
  const presentations = getCurrentPublicFindingPresentations();
  const questions = presentations.length
    ? presentations.slice(0, 5).map(presentation => buildPatientDiscussionQuestion(presentation, presentation.trustContract))
    : [patientFallbackQuestionForCurrentStack()];
  const shareUrl = typeof currentStackShareUrl === "function" ? currentStackShareUrl("overview") : "";
  return [
    "Diognosis questions to ask",
    `Selected list: ${(activeStack || []).join(" + ") || "none selected"}`,
    shareUrl ? `Share link: ${shareUrl}` : "",
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
  const patient = isPatientAudience();
  const currentScope = scope || (typeof buildReviewScopeSummary === "function"
    ? buildReviewScopeSummary(typeof getRenderComputationCache === "function" ? getRenderComputationCache() : {})
    : {});
  const unknownText = currentScope.unknownCount
    ? `${patient ? "Not assessed here" : "Unrecognized selections"}: ${formatScopeUnknownItems(currentScope.unknownItems)}.`
    : "";
  const title = patient ? "No major safety note found here" : "No public concern generated";
  const body = patient
    ? "Diognosis did not find a higher-priority safety note for this selected list. That does not prove the list is safe."
    : "No public Overview concern was generated from the current local finding set. This is a bounded no-signal state, not a safety clearance.";
  const label = patient ? "Still check" : "Review before relying on this";
  const items = patient
    ? [
        unknownText,
        "Exact product names, spelling, dose, strength, and formulation.",
        "Recent starts, stops, missed doses, or timing changes.",
        "New symptoms, allergies, pregnancy status, kidney or liver problems, and recent labs.",
        "Ask a doctor or pharmacist before starting, stopping, or changing medicines.",
      ]
    : [
        unknownText,
        "Medication reconciliation: identity, formulation, route, dose, timing, adherence, and indication.",
        "Clinical context: renal/hepatic function, allergies, pregnancy/lactation, labs, symptoms, diagnoses, and recent procedures.",
        "Concomitants: OTC products, supplements, alcohol/substance exposure, duplicate classes, and unrecognized selected items.",
        "Review detailed tabs and source evidence before treating this as clinically quiet.",
      ];
  return `<div class="no-signal-card ${patient ? "patient" : "clinician"}">
    <div class="no-signal-title">${safePublicHtml(title)}</div>
    <div class="no-signal-copy">${safePublicHtml(body)}</div>
    <div class="no-signal-label">${safePublicHtml(label)}</div>
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
  currentPublicFindingPresentations = buildPublicFindingPresentations(overviewFindings);
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
    const label = isPatientAudience() ? "safety note" : "concern";
    count.textContent = `${currentPublicFindingPresentations.length} ${label}${currentPublicFindingPresentations.length === 1 ? "" : "s"}`;
  }
  body.innerHTML = currentPublicFindingPresentations.slice(0, 8).map(renderPublicFindingCard).join("") +
    renderFindingOverviewFooter(currentPublicFindingPresentations.length);
  return currentPublicFindingPresentations;
}

function renderFindingOverviewFooter(totalCount = 0) {
  if (isPatientAudience()) {
    return totalCount > 8
      ? `<div class="finding-empty">Showing 8 of ${safePublicHtml(totalCount)} safety notes. Copy questions or ask a doctor or pharmacist to review the full list before making medication changes.</div>`
      : `<div class="finding-empty">Safety notes group related concerns for this list. Ask a doctor or pharmacist to review dose, timing, health history, symptoms, and anything not recognized here before making medication changes.</div>`;
  }
  return totalCount > 8
    ? `<div class="finding-empty">Showing 8 of ${safePublicHtml(totalCount)} grouped concerns. Use the Mechanisms, Genes, Timing, and Evidence tabs for supporting detail.</div>`
    : `<div class="finding-empty">Overview groups related pathway, metabolite, timing, and evidence signals into clinical concerns. Supporting detail is organized in the Mechanisms, Genes, Timing, and Evidence tabs.</div>`;
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
  const publicPresentations = currentPublicFindingPresentations.length
    ? currentPublicFindingPresentations
    : buildPublicFindingPresentations(concerns);
  const sourceLinked = publicPresentations.filter(presentation => presentation.trustContract?.sourceLinked).length;
  const modeled = publicPresentations.filter(presentation => presentation.trustContract && !presentation.trustContract.sourceLinked).length;
  const trustReady = publicPresentations.filter(presentation => presentation.trustContract?.ready).length;
  const maxSeverity = publicPresentations.reduce((best, presentation) =>
    publicFindingSeverityScore(presentation.severity) > publicFindingSeverityScore(best) ? presentation.severity : best,
    "info"
  );
  const statusLabel = publicPresentations.length
    ? `${publicPresentations.length} concern${publicPresentations.length === 1 ? "" : "s"}`
    : "No major signal";
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
  ].filter(Boolean);
  const limits = [
    "No result means no major signal was found here; it does not prove the list is safe.",
    "Source-linked evidence is traceability, not professional clinical validation.",
    ...(standardsCoverage?.limitations || []),
    unknownCount
      ? `${unknownCount} selected item${unknownCount === 1 ? " was" : "s were"} not recognized by the medication dataset: ${formatScopeUnknownItems(unknownItems)}.`
      : "Dose, timing, allergies, diagnoses, labs, pregnancy status, and clinical history are not fully assessed.",
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
    modeled,
    trustReady,
    standardsCoverage,
    standardsMappedCount:standardsCoverage?.mappedDrugCount || 0,
    standardsUnmappedCount:standardsCoverage?.unmappedDrugCount || 0,
    pgxMarkerMappingCount:standardsCoverage?.markerMappingCount || 0,
    pgxActionCount:standardsCoverage?.pgxActionCount || 0,
    maxSeverity,
    statusLabel,
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
  const presentations = (overviewFindings || [])
    .map(buildPublicFindingPresentationFromFinding)
    .filter(hasCompletePublicFindingPresentation);
  const genotypeSignal = typeof getHighestGenotypePrioritySignal === "function" ? getHighestGenotypePrioritySignal() : null;
  const genotypePresentation = buildPublicFindingPresentationFromGenotypeSignal(genotypeSignal);
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
    tags:["PGx"],
    signal,
  };
}

function shouldAddGenotypePublicFinding(genotypePresentation, presentations = [], signal = null) {
  if (!genotypePresentation || !signal || signal.score < 30) return false;
  if (!presentations.length) return true;
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
    return "Review whether this combination should be avoided, substituted, dose-adjusted, or monitored before use.";
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
    const source = ladder.sourceLinked ? "source-linked" : "modeled";
    const count = ladder.studyCount ? `${ladder.studyCount} source${ladder.studyCount === 1 ? "" : "s"}` : "";
    const review = ladder.professionalReviewStatus === "reviewed" ? "reviewed" : "clinical review needed";
    return publicDisplayText([source, tier, count, review].filter(Boolean).join(" · "));
  }
  return publicEvidenceSummaryFromRefs(finding.evidenceRefs || []);
}

function publicEvidenceSummaryFromRefs(refs = []) {
  const count = [...new Set(refs || [])].length;
  if (count) return `${count} linked source${count === 1 ? "" : "s"} · clinical review needed`;
  return "modeled signal · clinical review needed";
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
  currentPublicFindingPresentations = buildPublicFindingPresentations(cache.clinicalConcerns || []);
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
  return `<button type="button" class="related-finding-btn" onclick="focusPriorityFinding('overview','${safeAttr(presentation.targetElementId)}')">${safePublicHtml(label)}</button>`;
}

function renderPublicFindingCard(presentation) {
  if (!presentation) return "";
  const severity = safeChoice(presentation.severity, ["critical","severe","moderate","monitor","info"], "info");
  const finding = presentation.sourceFinding || {};
  const actorHtml = (presentation.affectedSubstances || []).slice(0, 8).map(actor => `
    <span class="finding-actor">${safePublicHtml(actor)}</span>
  `).join("");
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
  const whyText = patient ? patientFindingStepText(presentation, "why") : presentation.whyItMatters;
  const reviewText = patient ? patientFindingStepText(presentation, "review") : presentation.whatToReview;
  const detailButton = !patient && presentation.detailTab && presentation.detailElementId
    ? `<button type="button" class="related-finding-btn secondary" onclick="focusPriorityFinding('${safeAttr(presentation.detailTab)}','${safeAttr(presentation.detailElementId)}')">Supporting detail</button>`
    : "";
  const sourceLinks = patient ? "" : renderFindingSourceLinks(presentation, trust);
  const evidenceStep = patient ? "" : renderFindingStep("Evidence", presentation.evidenceSummary);
  const severityLabel = patient ? patientSeverityLabel(severity) : severity;
  const discussionGuide = renderFindingDiscussionGuide(presentation, trust, patient);
  const monitoringGuide = renderFindingMonitoringGuide(presentation, trust, patient);
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
    ${actorHtml ? `<div class="finding-actors">${actorHtml}</div>` : ""}
    <div class="finding-explain">
      ${renderFindingStep(patient ? "What this means" : "What changed", changedText)}
      ${renderFindingStep("Why it matters", whyText)}
      ${renderFindingStep(patient ? "What to ask" : "What to review", reviewText)}
      ${evidenceStep}
    </div>
    ${discussionGuide}
    ${monitoringGuide}
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

function buildPatientDiscussionQuestion(presentation = {}, trust = null) {
  const title = patientFindingTitleText(presentation);
  const text = publicDisplayText([
    title,
    presentation.whatChanged,
    presentation.whyItMatters,
    presentation.whatToReview,
  ].join(" ")).toLowerCase();
  const actors = (presentation.affectedSubstances || []).filter(Boolean);
  const pair = actors.slice(0, 2).join(" + ");
  const concern = patientConcernLabel(trust?.concernCategory || "");
  const topic = concern && concern !== "Safety note" ? concern.toLowerCase() : "this safety note";
  let question = pair
    ? `Can you check whether ${pair} needs closer review?`
    : `Can you check ${topic} for my medication list?`;
  if (/work less well|activation|antiplatelet|effectiveness|prodrug/.test(text)) {
    question = actors[0]
      ? `Can you check whether ${actors[0]} may work less well with my current list?`
      : "Can you check whether one of my medicines may work less well with my current list?";
  } else if (/bleed|inr|anticoag|warfarin|platelet|clot/.test(text)) {
    question = pair
      ? `Can you check whether ${pair} needs closer bleeding or clotting monitoring?`
      : "Can you check whether my list needs closer bleeding or clotting monitoring?";
  } else if (/qt|torsades|arrhythm|heart rhythm|bradycard/.test(text)) {
    question = pair
      ? `Can you check whether ${pair} needs heart-rhythm review?`
      : "Can you check whether my list needs heart-rhythm review?";
  } else if (/sedation|fall|sleepiness|breathing|confusion|cns|opioid|benzodiazepine/.test(text)) {
    question = "Can you check whether this list raises sleepiness, breathing, confusion, or fall risk?";
  } else if (/washout|persistence|timing|switch/.test(text)) {
    question = "Can you check whether timing, overlap, or washout matters for this list?";
  }
  return `${question} I do not want to start, stop, or change anything without guidance.`;
}

function buildClinicianDiscussionGuide(presentation = {}, trust = null) {
  const affected = (presentation.affectedSubstances || []).join(" + ") || trust?.affected || "current stack";
  const change = trust?.expectedChange || presentation.whatChanged || "";
  const concern = trust?.clinicalConcern || presentation.whyItMatters || "";
  const action = trust?.clinicianAction || presentation.whatToReview || "";
  return [
    `Review ${affected}.`,
    change,
    concern,
    action ? `Action: ${action}` : "",
  ].filter(Boolean).join(" ");
}

function renderFindingMonitoringGuide(presentation = {}, trust = null, patient = false) {
  const items = buildFindingMonitoringItems(presentation, trust, { patient });
  if (!items.length) return "";
  return `<div class="finding-monitoring">
    <div class="finding-monitoring-label">${safePublicHtml(patient ? "Mention if present" : "Monitoring focus")}</div>
    <ul class="finding-monitoring-list">
      ${items.map(item => `<li>${safePublicHtml(item)}</li>`).join("")}
    </ul>
  </div>`;
}

function buildPatientMentionSummaryItems(presentations = getCurrentPublicFindingPresentations()) {
  const items = [];
  const add = (item) => {
    const clean = publicDisplayText(item);
    if (clean && !items.includes(clean)) items.push(clean);
  };
  const shown = (presentations || []).length ? presentations.slice(0, 4) : [null];
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
  if (patient) {
    add("New or worsening symptoms, side effects, missed doses, or recent dose changes.");
    if (/work less well|activation|antiplatelet|effectiveness|prodrug|active thiol/.test(text)) {
      add("Symptoms the medicine is meant to prevent or treat, especially if they are new or getting worse.");
      add("Any recent changes to stomach acid medicines, antibiotics, seizure medicines, or herbal products.");
    }
    if (/bleed|inr|anticoag|warfarin|platelet|clot|hemostasis/.test(text)) {
      add("Unusual bruising, bleeding, dark stools, severe headache, or clot-related symptoms.");
    }
    if (/qt|torsades|arrhythm|heart rhythm|bradycard|electrolyte/.test(text)) {
      add("Fainting, palpitations, chest pain, severe dizziness, vomiting, or dehydration.");
    }
    if (/sedation|fall|sleepiness|breathing|confusion|cns|opioid|benzodiazepine|anticholinergic|drows/.test(text)) {
      add("Extreme sleepiness, confusion, falls, slowed breathing, constipation, or trouble urinating.");
    }
    if (/serotonin|ssri|snri|maoi|linezolid|methylene blue/.test(text)) {
      add("Agitation, fever, sweating, diarrhea, tremor, stiffness, or unusual restlessness.");
    }
    if (/hypogly|glucose|diabetes|insulin|sulfonylurea/.test(text)) {
      add("Shakiness, sweating, confusion, weakness, or very high or low blood sugar readings.");
    }
    if (/washout|persistence|timing|switch|overlap|induction offset/.test(text)) {
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
  if (/work less well|activation|antiplatelet|effectiveness|prodrug|active thiol/.test(text)) {
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
    return `<button type="button" class="related-finding-btn secondary" onclick="focusPriorityFinding('evidence','evidenceLadderLedger')">Evidence status</button>`;
  }
  const chips = refs.slice(0, 3).map(ref => {
    const label = typeof publicEvidenceReferenceLabel === "function" ? publicEvidenceReferenceLabel(ref) : "Source";
    const url = typeof publicEvidenceReferenceUrl === "function" ? publicEvidenceReferenceUrl(ref) : "";
    if (url) {
      return `<a class="related-finding-btn secondary source-link" href="${safeAttr(url)}" target="_blank" rel="noopener">${safePublicHtml(label)}</a>`;
    }
    return `<button type="button" class="related-finding-btn secondary" onclick="focusPriorityFinding('evidence','evidenceLadderLedger')">${safePublicHtml(label)}</button>`;
  }).join("");
  const more = refs.length > 3
    ? `<button type="button" class="related-finding-btn secondary" onclick="focusPriorityFinding('evidence','evidenceLadderLedger')">+${safePublicHtml(String(refs.length - 3))} sources</button>`
    : "";
  return `${chips}${more}`;
}

function renderFindingTrustStrip(trust, patient = false) {
  if (!trust) return "";
  if (patient) {
    const chips = [
      ["Note", patientConcernLabel(trust.concernCategory)],
      ["Status", trust.clinicalReviewStatus === "reviewed" ? "Reviewed" : "Ask a doctor or pharmacist"],
    ].filter(([, value]) => value);
    return `<div class="finding-trust-strip">
      ${chips.map(([label, value]) => `<span class="finding-trust-chip"><strong>${safePublicHtml(label)}</strong>${safePublicHtml(value)}</span>`).join("")}
    </div>`;
  }
  const source = trust.sourceLinked ? "Source-linked" : "Modeled";
  const status = trust.clinicalReviewStatus === "reviewed" ? "Reviewed" : "Clinical review needed";
  const chips = [
    ["Concern", trust.concernCategory],
    ["Evidence", source],
    patient ? ["Status", status] : ["Confidence", trust.confidence],
  ].filter(([, value]) => value);
  return `<div class="finding-trust-strip">
    ${chips.map(([label, value]) => `<span class="finding-trust-chip"><strong>${safePublicHtml(label)}</strong>${safePublicHtml(value)}</span>`).join("")}
  </div>`;
}

function patientConcernLabel(value = "") {
  const key = String(value || "").toLowerCase();
  if (/activation|prodrug|effectiveness/.test(key)) return "Medicine may work differently";
  if (/bleed|clot|anticoag|platelet|hemostasis/.test(key)) return "Bleeding or clotting";
  if (/heart|qt|rhythm|brady/.test(key)) return "Heart rhythm";
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
  const severity = safeChoice(presentation.severity, ["critical","severe","moderate","monitor","info"], "info");
  const serious = severity === "critical" || severity === "severe";
  const lower = text.toLowerCase();
  if (field === "changed") {
    if (/washout|persistence|timing|switch/.test(lower)) {
      return "Stop or switch timing may matter because some effects can last after a medicine is changed.";
    }
    if (/clopidogrel|antiplatelet|stent|thrombosis|active thiol|activation failure/.test(lower)) {
      return serious
        ? "This combination may make an antiplatelet medicine work less well, which can raise clot-related risk."
        : "This combination may change how well an antiplatelet medicine works.";
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
    if (/serotonin|ssri|snri|maoi/.test(lower)) {
      return "This combination may add serotonin-related side-effect risk.";
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
    if (/avoid|contraindicat|severe|critical|high risk/.test(lower) || serious) {
      return "The combination may need a different plan or extra monitoring before use.";
    }
    return "The same medicine can behave differently depending on the full list, dose, timing, and gene results.";
  }
  const review = String(presentation.whatToReview || "").replace(/\s+/g, " ").trim();
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
    return shortenPatientReviewText(`Ask a doctor or pharmacist whether ${subject} should be used together, or whether one should be changed before use.`);
  }
  if (/(?:substitut|alternative|different medicine)/.test(lower)) {
    return shortenPatientReviewText(`Ask a doctor or pharmacist whether ${subject} should be changed or whether there is a safer option.`);
  }
  return shortenPatientReviewText(`Ask a doctor or pharmacist whether dose, timing, monitoring, or a different medicine should be reviewed for ${subject}.`);
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
  if (/activation failure|stent|thrombosis|antiplatelet/.test(text)) {
    return actors.length >= 2
      ? `${actors[0]} may work less well with ${actors[1]}`
      : "An antiplatelet medicine may work less well";
  }
  if (/bleed|inr|anticoag|warfarin|platelet|clot/.test(text)) {
    return pair ? `${pair} may need closer monitoring` : "Bleeding or clotting monitoring may change";
  }
  if (/qt|torsades|arrhythm|heart rhythm|bradycard/.test(text)) {
    return pair ? `${pair} may need heart-rhythm review` : "Heart-rhythm monitoring may matter";
  }
  if (/serotonin|ssri|snri|maoi/.test(text)) return "Serotonin-related side effects may increase";
  if (/sedation|falls?\s+risk|fall-risk|cns|opioid|benzodiazepine|drows/.test(text)) return "Sleepiness, breathing, or fall risk may increase";
  if (/washout|persistence|timing|switch/.test(text)) return "Switching or stop timing may need review";
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

function renderFindingStep(label, value) {
  return `<div class="finding-step">
    <div class="finding-step-label">${safePublicHtml(label)}</div>
    <div class="finding-step-text">${safePublicHtml(value)}</div>
  </div>`;
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
    .replace(/\bpending professional review\b/gi, "review needed")
    .replace(/\bneeds review\b/gi, "review needed")
    .replace(/\breview prompt\b/gi, "modeled support")
    .replace(/\bsource linked, pending review\b/gi, "source-linked support")
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
  const clinical = String(ladder.clinicalActionConfidence || "insufficient").replace(/_/g, " ");
  const review = ladder.professionalReviewStatus === "reviewed"
    ? "reviewed"
    : ladder.professionalReviewStatus === "pending"
    ? "clinical review needed"
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
      ? "Review whether this combination should be avoided, substituted, dose-adjusted, or monitored before use."
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
  return `<div class="summary-story">
    <div class="summary-story-row"><strong>Why this matters</strong>${safePublicHtml(story.why)}</div>
    <div class="summary-story-row"><strong>${safePublicHtml(patient ? "What this means" : "What changes")}</strong>${safePublicHtml(story.changes)}</div>
    <div class="summary-story-row"><strong>${safePublicHtml(patient ? "What to ask" : "Next review step")}</strong>${safePublicHtml(story.review)}</div>
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

function applyAudienceModeVisibility() {
  const reviewer = isReviewerMode();
  if (document.body) document.body.dataset.reviewer = reviewer ? "reviewer" : "standard";
  const reviewBtn = document.getElementById("tabbtn-review");
  const reviewPanel = document.getElementById("tab-review");
  if (reviewBtn) reviewBtn.style.display = reviewer ? "" : "none";
  if (reviewPanel && !reviewer) {
    reviewPanel.classList.remove("active");
    reviewPanel.style.display = "none";
  }
  if (!reviewer && activeTab === "review") setActiveTab("overview");
  const reviewerSections = [
    ["scopeSection", "scopeBody", "scopeCount"],
    ["pendingReviewEnrichmentSection", "pendingReviewEnrichmentBody", "pendingReviewEnrichmentCount"],
    ["externalContextSection", "externalContextBody", "externalContextCount"],
    ["reviewSummarySection", "reviewSummaryBody", "reviewSummaryCount"],
    ["reviewWorkbenchSection", "reviewWorkbenchBody", "reviewWorkbenchCount"],
    ["scenarioSnapshotSection", "scenarioSnapshotBody", "scenarioSnapshotCount"],
    ["metaboliteGapSection", "metaboliteGapBody", "metaboliteGapCount"],
    ["warningPathSection", "warningPathBody", "warningPathCount"],
    ["qualitySection", "qualityBody", "qualityCount"],
    ["contributeSection", "contributeBody", null],
  ];
  if (!reviewer) {
    reviewerSections.forEach(([sectionId, bodyId, countId]) => hideSectionAndClear(sectionId, bodyId, countId));
    lazyRenderState.reviewKey = "";
  }
  if (!isPatientAudience()) return;
  [
    "riskSection",
    "altSection",
  ].forEach(sectionId => {
    const section = document.getElementById(sectionId);
    if (section) section.style.display = "none";
  });
}

function arrangeAdvancedSections() {
  const placements = {
    overview:["scopeSection","riskSection","findingSection","altSection"],
    mechanisms:["mechanismWhySection","mechanisticSection","transporterSection","pdSection","cascadeSection","phenoAccumSection","graphSection"],
    "genes-metabolites":["genotypeSection","phenoconversionSection","activeMoietySection","metabSection"],
    "timing-levels":["foldSection","pkSimSection","persistenceTimelineSection","washoutSection","burdenSection"],
    evidence:["externalContextSection","evidenceSection"],
    review:["reviewSummarySection","reviewWorkbenchSection","scenarioSnapshotSection","metaboliteGapSection","warningPathSection","matrixSection","interSection","comboSection","qualitySection","contributeSection"],
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
  if (!q || q.length < 1) { el.classList.remove("show"); return; }
  const seen = new Set();
  const seenAliasMatches = new Set();
  const rawMatches = DRUG_DB
    .map(d => ({ drug:d, match:scoreDrugSearch(d, q) }))
    .filter(row => row.match.score > 0)
    .sort((a,b) =>
      b.match.score - a.match.score ||
      drugSearchRichness(b.drug) - drugSearchRichness(a.drug) ||
      a.drug.name.localeCompare(b.drug.name)
    );
  const matches = rawMatches.filter(row => {
    const d = row.drug;
    if (seen.has(d.name)) return false;
    const aliasKey = getSearchAliasDedupeKey(row);
    if (aliasKey && seenAliasMatches.has(aliasKey)) return false;
    seen.add(d.name);
    if (aliasKey) seenAliasMatches.add(aliasKey);
    return true;
  });
  const actorMatches = findSupplementActorMatches(q);
  if (!matches.length && !actorMatches.length) {
    el.innerHTML = renderUnrecognizedSearchResult(q);
    el.classList.add("show");
    return;
  }

  // Group by practical browse category, while preserving exact class on the row.
  const groups = {};
  matches.forEach(row => {
    const d = row.drug;
    const cat = getBrowseCategory(d);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(row);
  });

  let html = "";
  for (const [cls, rows] of Object.entries(groups)) {
    if (matches.length > 5) html += `<div class="sr-cat">${cls}</div>`;
    rows.forEach(row => {
      const d = row.drug;
      const added = activeStack.includes(d.name);
      const matchedAlias = row.match.term && row.match.term !== d.name && row.match.term !== d.id ? row.match.term : "";
      const secondary = typeof getDrugSecondaryLabel === "function" ? getDrugSecondaryLabel(d) : "";
      const displayName = matchedAlias ? `${highlight(matchedAlias, q)} -> ${d.name}` : highlight(d.name, q);
      const matchNote = row.match.reason && row.match.reason !== "name" ? `<span class="sr-match">${row.match.reason}</span>` : "";
      const secondaryHtml = secondary || matchNote ? `<span class="sr-secondary">${[secondary, matchNote].filter(Boolean).join(" ")}</span>` : "";
      html += `<div class="sr-item" ${keyboardButtonAttrs()} onclick="${added ? `removeDrug('${d.name.replace(/'/g,"\\'")}')` : `addDrug('${d.name.replace(/'/g,"\\'")}')` }">
        <span><span class="sr-name">${displayName}</span>${secondaryHtml}</span>
        <span>${added ? '<span class="sr-added">✓ Added</span>' : `<span class="sr-class">${d.cls}</span>`}</span>
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
      html += `<div class="sr-item" ${keyboardButtonAttrs()} onclick="${added ? `removeFoodActor('${actor.id}')` : `addFoodActor('${actor.id}')`}">
        <span><span class="sr-name">${displayName}</span>${secondary ? `<span class="sr-secondary">${secondary}</span>` : ""}</span>
        <span>${added ? '<span class="sr-added">✓ Added</span>' : '<span class="sr-class">Food/Supplement</span>'}</span>
      </div>`;
    });
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
  const action = added ? `removeDrug('${inlineJsString(name)}')` : `addUnrecognizedSubstance('${inlineJsString(name)}')`;
  return `<div class="sr-item sr-unrecognized" ${keyboardButtonAttrs()} onclick="${action}">
    <span>
      <span class="sr-name">${safePublicHtml(name)}</span>
      <span class="sr-secondary">Not recognized here. Diognosis will keep it in the list but will not assess interactions for it.</span>
    </span>
    <span>${added ? '<span class="sr-added">✓ Added</span>' : '<span class="sr-class sr-unrecognized-class">Add unrecognized</span>'}</span>
  </div>`;
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
    category:"Source Candidates Pending Review",
    terms:["source candidate drug/substance", "pending identity review", "review candidate"],
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
  "Source Candidates Pending Review",
];

function getBrowseCategory(drug) {
  const text = getBrowseCategoryText(drug);
  const match = BROWSE_CATEGORY_RULES.find(rule => browseRuleMatches(text, rule));
  return match ? match.category : "Source Candidates Pending Review";
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
  const groups = {};
  DRUG_DB.forEach(d => {
    const cat = getBrowseCategory(d);
    if (!groups[cat]) groups[cat] = [];
    if (!groups[cat].find(x => x.name === d.name)) groups[cat].push(d);
  });

  const sortedCats = [...new Set([...BROWSE_CATEGORY_ORDER, ...Object.keys(groups)])];

  el.innerHTML = renderBrowseClassGuides() + sortedCats.filter(c => groups[c]).map(cat => `
    <div class="browse-cat">
      <div class="browse-cat-title" ${keyboardButtonAttrs()} aria-expanded="false" onclick="toggleBrowseCat(this)">
        ${cat} <span style="font-weight:400;font-size:12px;color:var(--text2)">(${groups[cat].length})</span>
        <span class="arrow">▶</span>
      </div>
      <div class="browse-items" data-cat="${cat}">
        ${groups[cat].sort((a,b)=>a.name.localeCompare(b.name)).map(d => {
          const alias = typeof getDrugSecondaryLabel === "function" ? getDrugSecondaryLabel(d, 2) : "";
          return `<div class="browse-chip ${activeStack.includes(d.name)?'added':''}" ${keyboardButtonAttrs()} onclick="toggleDrug('${d.name.replace(/'/g,"\\'")}')">${d.name}<span class="browse-chip-class">${d.cls}</span>${alias ? `<span class="browse-chip-alias">${alias}</span>` : ""}</div>`;
        }).join("")}
      </div>
    </div>
  `).join("");
}

function renderBrowseClassGuides() {
  return `<div class="class-guide-list">
    ${MEDICATION_CLASS_GUIDES.map((guide, idx) => `<div class="class-guide-card" ${keyboardButtonAttrs()} onclick="loadMedicationClassGuide(${idx})">
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
  activeStack = guide.drugs
    .map(name => typeof resolveUrlDrugName === "function" ? resolveUrlDrugName(name) : name)
    .filter(Boolean);
  for (const [gene, phenotype] of Object.entries(guide.genotype || {})) {
    if (GENOTYPE_EFFECTS[gene] && GENOTYPE_EFFECTS[gene][phenotype]) setGenotypeState(gene, phenotype);
  }
  setActiveTab(guide.tab || "overview");
  renderAll();
}

function toggleBrowseCat(el) {
  el.classList.toggle("open");
  el.nextElementSibling.classList.toggle("show");
  el.setAttribute("aria-expanded", el.classList.contains("open") ? "true" : "false");
}

function toggleDrug(name) {
  if (activeStack.includes(name)) removeDrug(name);
  else addDrug(name);
}

function toggleSection(id) {
  const body = document.getElementById(id + "Body");
  if (!body) return;
  body.classList.toggle("open");
  manualSectionToggleKeys[id] = getRenderCacheKey();
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

function currentStackShareUrl(tab = activeTab) {
  const params = [];
  if (activeStack.length) {
    params.push(["substances", activeStack.map(name => {
      const actor = typeof getStackSupplementActor === "function" ? getStackSupplementActor(name) : null;
      const drug = typeof getStackDrug === "function" ? getStackDrug(name) : getDrug(name);
      return actor?.id || drug?.id || toGraphId(name);
    }).join(",")]);
  }
  for (const token of activeGenotypeUrlTokens()) params.push(["genotype", token]);
  if (isPatientAudience()) params.push(["audience", audienceMode]);
  if (isReviewerMode()) params.push(["reviewer", "1"]);
  const shareTab = tab === "review" && !isReviewerMode() ? "overview" : tab;
  if (shareTab) params.push(["tab", shareTab]);
  const query = params
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeUrlStateValueLocal(value)}`)
    .join("&");
  return `https://diogonmpacheco.github.io/Diognosis/index.html${query ? `?${query}` : ""}`;
}

function activeGenotypeUrlTokens() {
  const tokens = [];
  const genotypeState = typeof activeGenotype !== "undefined" ? activeGenotype : {};
  for (const [gene, phenotype] of Object.entries(genotypeState || {})) {
    if (GENOTYPE_EFFECTS[gene] && phenotype && phenotype !== GENOTYPE_PHENOTYPE.NM) {
      tokens.push(`${gene}:${genotypeTokenForUrl(phenotype)}`);
    } else if (typeof GENOTYPE_RISK_EFFECTS !== "undefined" && GENOTYPE_RISK_EFFECTS[gene] && phenotype === GENOTYPE_RISK_STATUS.PRESENT) {
      tokens.push(riskMarkerTokenForUrl(gene));
    }
  }
  return tokens;
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
  return `<a class="feedback-link" href="${escapeHtml(href)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${escapeHtml(label)}</a>`;
}

// ── RENDER ALL ──
function renderAll() {
  syncAudienceModeUI();
  if (isPatientAudience() && activeTab !== "overview") setActiveTab("overview");
  const activeDrugNames = typeof getActiveDrugNames === "function" ? getActiveDrugNames() : activeStack.filter(name => getDrug(name));
  arrangeAdvancedSections();
  renderMedList();
  renderGenetics();
  if (activeStack.length >= 1) {
    renderFoldBars();
    renderMetabolites();
    renderPathwayDiversions();
    renderCascade();                // Phase 3: graph traversal
    renderExternalSafetyContext();  // External context, not severity-bearing
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
    hideSectionAndClear("phenoconversionSection", "phenoconversionBody", "phenoconversionCount");
    hideSectionAndClear("activeMoietySection", "activeMoietyBody", "activeMoietyCount");
    hideSectionAndClear("persistenceTimelineSection", "persistenceTimelineBody", "persistenceTimelineCount");
    hideSectionAndClear("foldSection", "foldBody");
    hideSectionAndClear("metabSection", "metabBody");
    hideSectionAndClear("pdSection", "pdBody");
    hideSectionAndClear("cascadeSection", "cascadeBody");
    hideSectionAndClear("evidenceSection", "evidenceBody", "evidenceCount");
    hideSectionAndClear("pendingReviewEnrichmentSection", "pendingReviewEnrichmentBody", "pendingReviewEnrichmentCount");
    hideSectionAndClear("externalContextSection", "externalContextBody", "externalContextCount");
    hideSectionAndClear("reviewWorkbenchSection", "reviewWorkbenchBody", "reviewWorkbenchCount");
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
    renderRiskGauge(risk);
    renderInteractionFindingsOverview(risk);
    if (typeof renderMechanismWhyPaths === "function") renderMechanismWhyPaths();
    renderInteractions(risk.interactions);
    renderCombinationProducts();
    renderTransporterDDI();
    renderMatrix(risk.interactions);
    renderAlternatives();
    document.getElementById("riskSection").style.display = "";
    if (isReviewerMode()) document.getElementById("scopeSection").style.display = "";
    document.getElementById("findingSection").style.display = "";
    document.getElementById("interSection").style.display = "";
    document.getElementById("comboSection").style.display = "";
    document.getElementById("transporterSection").style.display = "";
    document.getElementById("matrixSection").style.display = "";
    document.getElementById("altSection").style.display = "";
  } else {
    if (activeDrugNames.length) {
      renderInteractionFindingsOverview({ interactions:[] });
      renderReviewScopePanel();
      if (typeof renderMechanismWhyPaths === "function") renderMechanismWhyPaths();
    }
    else {
      clearCurrentFindingState();
      hideSectionAndClear("findingSection", "findingBody", "findingCount");
      hideSectionAndClear("mechanismWhySection", "mechanismWhyBody", "mechanismWhyCount");
      hideSectionAndClear("warningPathSection", "warningPathBody", "warningPathCount");
    }
    hideSectionAndClear("riskSection", "riskBody");
    hideSectionAndClear("interSection", "interBody", "interCount");
    hideSectionAndClear("comboSection", "comboBody", "comboCount");
    hideSectionAndClear("transporterSection", "transporterBody", "transporterCount");
    hideSectionAndClear("matrixSection", "matrixBody");
    hideSectionAndClear("altSection", "altBody");
  }
  renderSummaryBar();
  applyAudienceModeVisibility();
  updateEmptyTabs();
  if (viewMode === "browse") renderBrowse();
}

function renderMedList() {
  const el = document.getElementById("medList");
  const countEl = document.getElementById("medCount");
  const patient = isPatientAudience();
  if (!activeStack.length) {
    const emptyCopy = patient
      ? "Add medicines, supplements, or foods above to start a list for your doctor or pharmacist"
      : "Add medications, supplements, or foods above to see how they interact";
    el.innerHTML = `<div class="empty-state"><div class="icon">💊</div>${emptyCopy}</div>`;
    countEl.textContent = "";
    return;
  }
  countEl.textContent = patient
    ? `${activeStack.length} item${activeStack.length>1?"s":""} selected`
    : `${activeStack.length} substance${activeStack.length>1?"s":""}`;
  el.innerHTML = activeStack.map(name => {
    const actor = typeof getStackSupplementActor === "function" ? getStackSupplementActor(name) : null;
    const drug = typeof getStackDrug === "function" ? getStackDrug(name) : getDrug(name);
    const actorId = actor?.id || "";
    const escaped = inlineJsString(drug ? drug.name : name);
    const tiers = DOSE_TIERS[name];
    let doseHtml = "";
    if (!patient && drug && tiers) {
      const current = getDoseTier(name);
      const opts = Object.entries(tiers.tiers).map(([k,v]) =>
        `<option value="${k}"${k===current?" selected":""}>${v.label}</option>`
      ).join("");
      doseHtml = `<select class="dose-select" onclick="event.stopPropagation()" onchange="setDoseTier('${escaped}',this.value)">${opts}</select>`;
    }
    const recognized = !!(drug || actor);
    const secondary = drug
      ? (typeof getDrugSecondaryLabel === "function" ? getDrugSecondaryLabel(drug, 2) : "")
      : (actor ? formatActorSources(actor) : (isPatientAudience() ? "Not checked here" : "Not recognized by local dataset"));
    const primary = drug ? getDrugDisplayName(drug) : (actor ? actor.name : name);
    const labelHtml = `<span class="med-chip-name"><span class="med-chip-primary">${safePublicHtml(primary)}</span>${secondary ? `<span class="med-chip-secondary">${safePublicHtml(secondary)}</span>` : ""}</span>`;
    const removeAction = actor && !drug ? `removeFoodActor('${actorId}')` : `removeDrug('${escaped}')`;
    const chipClass = recognized ? "med-chip" : "med-chip unrecognized";
    const removeLabel = `Remove ${primary}`;
    return `<span class="${chipClass}" title="${secondary ? safeAttr(secondary) : ""}">${labelHtml}${doseHtml}<button type="button" class="x" aria-label="${safeAttr(removeLabel)}" onclick="${removeAction}">×</button></span>`;
  }).join("") + renderActorExposureSummary();
}

function inlineJsString(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/[\u0000-\u001f\u007f]/g, " ");
}

function renderActorExposureSummary() {
  if (isPatientAudience()) return "";
  if (!activeStack.length || typeof computeActorExposureDeltas !== "function") return "";
  const rows = computeActorExposureDeltas(activeStack)
    .filter(row => row.direction !== "baseline")
    .slice(0, 8);
  if (!rows.length) return "";
  return `<div class="exposure-summary">${rows.map(row => {
    const up = row.direction === "increase";
    const low = row.confidence === "low" || row.qualitative || !row.fold;
    const chipClass = low ? "low" : (up ? "up" : "down");
    const arrow = up ? "↑" : row.direction === "decrease" ? "↓" : "↔";
    const value = row.fold ? `${arrow} ${row.fold.toFixed(row.fold >= 10 ? 1 : 2)}×` : `${arrow} direction only`;
    const parent = row.type === "metabolite" ? ` from ${row.parent}` : "";
    return `<div class="exposure-line">
      <span class="exposure-name">${row.name}</span>
      <span class="exposure-type">${row.type}</span>
      <span class="exposure-chip ${chipClass}">${value}</span>
      <span>${safePublicHtml(row.driver || "current stack")}${safePublicHtml(parent)}${row.note ? ` · ${safePublicHtml(row.note)}` : ""}</span>
    </div>`;
  }).join("")}</div>`;
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
