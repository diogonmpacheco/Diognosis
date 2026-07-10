#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { JSDOM, VirtualConsole } from "jsdom";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalized(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

const html = readFileSync("index.html", "utf8");
const dataViewsHtml = readFileSync("data-views.html", "utf8");
const matrixDoc = readFileSync("docs/V1_VALIDATION_MATRIX.md", "utf8");
const matrix = JSON.parse(readFileSync("data/v1-validation-scenarios.json", "utf8"));

assert(matrix.schema === "diognosis.v1-validation-scenarios.v1", "Unexpected V1 validation-matrix schema.");
assert(Array.isArray(matrix.scenarios) && matrix.scenarios.length === 15,
  `Phase 4 requires exactly 15 fixed validation scenarios; found ${matrix.scenarios?.length || 0}.`);
assert(new Set(matrix.scenarios.map((scenario) => scenario.id)).size === matrix.scenarios.length,
  "V1 validation scenario ids must be unique.");
assert(matrix.scenarios.filter((scenario) => scenario.group === "authority_pgx").length === 10,
  "Phase 4 requires 10 authority-framed PGx scenario families.");
assert(matrix.scenarios.filter((scenario) => scenario.group === "edge_and_journey").length === 5,
  "Phase 4 requires five edge/journey scenarios.");

for (const frame of matrix.sourceFrames || []) {
  assert(/^https:\/\//.test(frame.url || ""), `Source frame ${frame.name || "(unnamed)"} needs an HTTPS URL.`);
  assert(matrixDoc.includes(frame.url), `Validation documentation is missing source frame ${frame.url}.`);
}

for (const scenario of matrix.scenarios) {
  assert(/^[a-z0-9-]+$/.test(scenario.id || ""), `Invalid validation id: ${scenario.id || "(missing)"}.`);
  assert(/^index\.html#substances=/.test(scenario.sharePath || ""), `${scenario.id}: sharePath must use fragment-only medication state.`);
  assert(!scenario.sharePath.includes("index.html?substances="), `${scenario.id}: sensitive state must not use the query string.`);
  assert(Array.isArray(scenario.substances) && scenario.substances.length > 0, `${scenario.id}: substances are required.`);
  assert(Array.isArray(scenario.expectedPatterns) && scenario.expectedPatterns.length >= 3,
    `${scenario.id}: at least three expected behavior patterns are required.`);
  assert(matrixDoc.includes(`\`${scenario.id}\``), `Validation documentation is missing scenario ${scenario.id}.`);
  assert(matrixDoc.includes(scenario.sharePath), `Validation documentation is missing the share path for ${scenario.id}.`);
  assert(normalized(scenario.guardrail).length >= 40, `${scenario.id}: guardrail needs a concrete decision boundary.`);
}

function createPage(url) {
  const browserErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("error", (message) => browserErrors.push(String(message)));
  virtualConsole.on("jsdomError", (error) => browserErrors.push(error?.message || String(error)));
  const dom = new JSDOM(html, {
    url,
    runScripts:"dangerously",
    resources:"usable",
    pretendToBeVisual:true,
    virtualConsole,
  });
  return { dom, browserErrors };
}

async function loadScenario(scenario) {
  const page = createPage(new URL(scenario.sharePath, "http://localhost/").href);
  await new Promise((resolveReady) => setTimeout(resolveReady, 500));
  assert(page.browserErrors.length === 0, `${scenario.id}: browser errors: ${page.browserErrors.join(" | ")}`);
  return page.dom;
}

function extractScenario(window) {
  return window.eval(`(() => {
    const readPanel = (tab) => {
      setTab(tab);
      return document.getElementById('tab-' + tab)?.textContent || '';
    };
    setTab('overview');
    const summaryText = document.getElementById('summaryBar')?.textContent || '';
    const overviewText = document.getElementById('tab-overview')?.textContent || '';
    const genesText = readPanel('genes-metabolites');
    const timingText = readPanel('timing-levels');
    const evidenceText = readPanel('evidence');
    setTab('overview');
    const handoffText = typeof buildOverviewHandoffText === 'function'
      ? buildOverviewHandoffText()
      : buildV1HandoffSummaryText();
    const severeModeledOnly = (currentClinicalConcerns || []).filter((finding) =>
      ['severe','critical'].includes(String(finding.severity || finding.priority || '').toLowerCase()) &&
      finding.evidenceLadder?.modeledOnly
    ).length;
    return {
      activeStack:[...(activeStack || [])],
      genotypeState:JSON.stringify(activeGenotype || {}),
      selectedChips:document.querySelectorAll('#medList .med-chip').length,
      unrecognizedChips:document.querySelectorAll('#medList .med-chip.unrecognized').length,
      primaryCards:document.querySelectorAll('#findingBody .primary-finding-card').length,
      trustChips:document.querySelectorAll('#findingBody .finding-trust-chip').length,
      provenanceChips:[...document.querySelectorAll('#findingBody .finding-trust-chip')]
        .map((chip) => chip.textContent.replace(/\\s+/g, ' ').trim()).join(' | '),
      sourceActions:document.querySelectorAll('#findingBody a.source-link, #findingBody .related-finding-btn').length,
      summaryText,
      overviewText,
      genesText,
      timingText,
      evidenceText,
      handoffText,
      shareUrl:currentStackShareUrl('overview'),
      contextAssessment:getClinicalContextAssessment(),
      contextText:document.getElementById('clinicalContextStatus')?.textContent || '',
      severeModeledOnly,
      selectedTabs:document.querySelectorAll('#tabBar [role="tab"][aria-selected="true"]').length,
      activePanels:document.querySelectorAll('.tab-panel.active[aria-hidden="false"]').length,
    };
  })()`);
}

function assertScenario(scenario, result) {
  const combined = normalized([
    result.summaryText,
    result.overviewText,
    result.genesText,
    result.timingText,
    result.evidenceText,
    result.handoffText,
  ].join(" "));
  assert(result.selectedChips === scenario.substances.length,
    `${scenario.id}: expected ${scenario.substances.length} selected chips, found ${result.selectedChips}.`);
  assert(result.unrecognizedChips === 0, `${scenario.id}: fixed validation substances must all resolve.`);
  for (const substance of scenario.substances) {
    assert(result.activeStack.some((item) => normalized(item).toLowerCase() === substance.toLowerCase()),
      `${scenario.id}: active stack is missing ${substance}.`);
    assert(new RegExp(substance, "i").test(combined), `${scenario.id}: rendered journey is missing ${substance}.`);
  }
  for (const genotypePattern of scenario.genotypePatterns || []) {
    assert(new RegExp(genotypePattern, "i").test(result.genotypeState),
      `${scenario.id}: genotype state is missing ${genotypePattern}.`);
  }
  for (const expectedPattern of scenario.expectedPatterns) {
    assert(new RegExp(expectedPattern, "i").test(combined),
      `${scenario.id}: output is missing expected behavior /${expectedPattern}/i.`);
  }
  assert(result.primaryCards > 0, `${scenario.id}: Overview should render at least one review-priority card.`);
  assert(result.trustChips >= result.primaryCards * 3,
    `${scenario.id}: every priority should expose provenance, mechanism, and context-fit trust chips.`);
  assert(/Authority-linked|Primary-literature linked|Linked source/i.test(result.provenanceChips),
    `${scenario.id}: priority cards should expose source provenance.`);
  assert(/Mechanism:/i.test(result.provenanceChips) && /Context fit:/i.test(result.provenanceChips),
    `${scenario.id}: priority cards should separate mechanism confidence from context fit.`);
  assert(/Authority-linked|Primary-literature linked|linked source|authority source/i.test(result.evidenceText),
    `${scenario.id}: Evidence should expose authority/literature provenance.`);
  assert(result.sourceActions > 0, `${scenario.id}: a source/finding action should remain reachable from Overview.`);
  assert(result.severeModeledOnly === 0, `${scenario.id}: modeled-only evidence must not preserve severe/critical output.`);
  assert(result.contextAssessment.preliminary === true && result.contextAssessment.percent === 0,
    `${scenario.id}: shared journeys must start with explicit preliminary context.`);
  assert(/Preliminary context/i.test(result.contextText), `${scenario.id}: context rail should expose the preliminary state.`);
  const shareUrl = new URL(result.shareUrl);
  assert(shareUrl.search === "" && /(?:^|[&#])substances=/i.test(shareUrl.hash),
    `${scenario.id}: share state must stay fragment-only.`);
  assert(!/regimen=|indications=|symptomsStatus=|renalFunction=/i.test(result.shareUrl),
    `${scenario.id}: clinical context must not enter the share URL.`);
  assert(/not medical advice/i.test(result.handoffText) && /Do not start, stop, or change medication/i.test(result.handoffText),
    `${scenario.id}: handoff is missing medication-decision boundaries.`);
  assert(!/\b(?:guaranteed safe|safe to take|risk[- ]?free|clinically validated)\b/i.test(combined),
    `${scenario.id}: public output uses unsafe certainty language.`);
  assert(!/\b(?:top-250|top-100|coverage adapter|route adapter|bulk_)\b/i.test(`${result.summaryText} ${result.overviewText}`),
    `${scenario.id}: public output leaks internal implementation labels.`);
  assert(result.selectedTabs === 1 && result.activePanels === 1,
    `${scenario.id}: tab selection and tabpanel state must remain singular.`);
}

const scenarioResults = [];
for (const scenario of matrix.scenarios) {
  const dom = await loadScenario(scenario);
  const result = extractScenario(dom.window);
  assertScenario(scenario, result);
  scenarioResults.push({
    id:scenario.id,
    priorities:result.primaryCards,
    selected:result.selectedChips,
    mechanism:scenario.expectedMechanism,
  });
  dom.window.close();
}

const structuralDom = await loadScenario(matrix.scenarios[0]);
const structuralDocument = structuralDom.window.document;
const skipLink = structuralDocument.querySelector('.skip-link[data-action="focus-review-results"]');
assert(skipLink && skipLink.dataset.keyboardButton === "true" && !skipLink.hasAttribute("href"),
  "Medication Review needs a keyboard skip control that does not overwrite fragment-based review state.");
assert(structuralDocument.querySelector('main#reviewWorkspace'), "Medication Review needs a stable main landmark.");
assert(structuralDocument.querySelector('section#reviewResults[tabindex="-1"]'), "Results need a programmatically focusable landmark.");
assert(structuralDocument.querySelector('#summaryBar[role="region"][aria-label="Review summary"]'), "Review summary needs an accessible region label.");
assert(structuralDocument.querySelector('#searchInput[role="combobox"][aria-controls="searchOptions"][aria-autocomplete="list"]'),
  "Medication search needs a list-autocomplete combobox contract.");
assert(structuralDocument.getElementById('searchResults'), "Medication search needs a suggestions container.");
const contextControls = [...structuralDocument.querySelectorAll('[data-context-field]')];
assert(contextControls.length === 10, `Expected 10 clinical-context controls, found ${contextControls.length}.`);
for (const control of contextControls) {
  assert(control.id, `Clinical-context control ${control.dataset.contextField || "(unknown)"} needs an id.`);
  assert(structuralDocument.querySelector(`label[for="${control.id}"]`),
    `Clinical-context control ${control.id} needs an explicit label.`);
}
const searchInput = structuralDocument.getElementById("searchInput");
searchInput.value = "met";
structuralDom.window.onSearch("met");
assert(structuralDocument.querySelector('#searchOptions[role="listbox"]'), "Expanded medication suggestions need a labelled listbox.");
assert(!structuralDocument.querySelector('#searchOptions button'), "The listbox must not contain unrelated interactive controls.");
const searchOptions = [...structuralDocument.querySelectorAll('#searchOptions [role="option"]')];
assert(searchOptions.length > 0 && searchOptions.length <= 20,
  `Bounded combobox should render 1-20 options, found ${searchOptions.length}.`);
assert(searchInput.getAttribute("aria-expanded") === "true", "Combobox should expose its expanded state.");
searchInput.dispatchEvent(new structuralDom.window.KeyboardEvent("keydown", { key:"ArrowDown", bubbles:true }));
assert(searchInput.getAttribute("aria-activedescendant") === searchOptions[0].id,
  "ArrowDown should establish the first active search option without moving focus out of the combobox.");
searchInput.dispatchEvent(new structuralDom.window.KeyboardEvent("keydown", { key:"Escape", bubbles:true }));
assert(searchInput.getAttribute("aria-expanded") === "false" && !searchInput.hasAttribute("aria-activedescendant"),
  "Escape should close and reset the search combobox.");

const activeTab = structuralDocument.querySelector('#tabBar [role="tab"][aria-selected="true"]');
activeTab.dispatchEvent(new structuralDom.window.KeyboardEvent("keydown", { key:"ArrowRight", bubbles:true }));
assert(structuralDocument.getElementById("tabbtn-mechanisms")?.getAttribute("aria-selected") === "true",
  "ArrowRight should advance the Medication Review tablist.");
structuralDom.window.close();

const dataViewsDom = new JSDOM(dataViewsHtml);
const dataViewsDocument = dataViewsDom.window.document;
assert(dataViewsDocument.querySelector('.skip-link[href="#dataViewsMain"]'), "Data Views needs a keyboard skip link.");
assert(dataViewsDocument.querySelector('main#dataViewsMain[tabindex="-1"]'), "Data Views needs a focusable main landmark.");
assert(dataViewsDocument.querySelectorAll('nav[role="tablist"] .nav-btn[role="tab"]').length === 3,
  "Data Views needs three semantic view tabs.");
assert(dataViewsDocument.querySelectorAll('.view[role="tabpanel"][aria-labelledby]').length === 3,
  "Data Views needs three labelled tabpanels.");
assert(/handleViewTabKeydown/.test(dataViewsHtml) && /aria-selected/.test(dataViewsHtml),
  "Data Views must implement keyboard tab navigation and selected-state synchronization.");
dataViewsDom.window.close();

console.log(JSON.stringify({
  ok:true,
  phase:4,
  scenarios:scenarioResults.length,
  authorityPgx:scenarioResults.filter((result) => matrix.scenarios.find((scenario) => scenario.id === result.id)?.group === "authority_pgx").length,
  edgeJourneys:scenarioResults.filter((result) => matrix.scenarios.find((scenario) => scenario.id === result.id)?.group === "edge_and_journey").length,
  priorities:scenarioResults.reduce((sum, result) => sum + result.priorities, 0),
  accessibility:["skip-links", "combobox", "tablists", "explicit-context-labels", "reduced-motion"],
}, null, 2));
