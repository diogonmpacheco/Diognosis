#!/usr/bin/env node
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { JSDOM, VirtualConsole } from 'jsdom';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, '.tmp', 'smoke-index.html');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function evalInPage(win, expression) {
  return win.eval(expression);
}

console.log('Building smoke-test HTML...');
execFileSync(process.execPath, ['build.js', '--out', OUT], { cwd: ROOT, stdio: 'pipe' });

const html = readFileSync(OUT, 'utf8');
const readme = readFileSync(resolve(ROOT, 'README.md'), 'utf8');
const technical = readFileSync(resolve(ROOT, 'docs', 'TECHNICAL.md'), 'utf8');
const browserErrors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (err) => {
  const msg = err && err.message ? err.message : String(err);
  browserErrors.push(msg);
});
virtualConsole.on('error', (msg) => browserErrors.push(String(msg)));

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  virtualConsole,
  url: 'http://localhost/',
});

await new Promise((resolveReady) => setTimeout(resolveReady, 400));

const { window } = dom;
const doc = window.document;

assert(doc.title.includes('Diognosis'), 'Page title did not load');
assert(doc.getElementById('ver-engine')?.textContent === '0.1.0-alpha.1', 'Version strip did not render engine 0.1.0-alpha.1');
assert(evalInPage(window, 'DRUG_DB.length') >= 200, 'Drug database did not load');
assert(evalInPage(window, 'DIOGNOSIS_VERSION.engine') === '0.1.0-alpha.1', 'DIOGNOSIS_VERSION is not 0.1.0-alpha.1');
assert(evalInPage(window, 'DIOGNOSIS_VERSION.drugCount') === evalInPage(window, 'DRUG_DB.length'), 'DIOGNOSIS_VERSION drug count is stale');
assert(doc.getElementById('ver-count')?.textContent === String(evalInPage(window, 'DRUG_DB.length')), 'Version strip drug count is stale');
assert(!readme.includes('tab=safety'), 'README public examples should use tab=overview instead of tab=safety');
for (const label of ['Overview', 'Mechanisms', 'Genes + Metabolites', 'Timing + Levels', 'Evidence']) {
  assert(readme.includes(label), `README should mention the ${label} tab`);
  assert(technical.includes(label), `TECHNICAL.md should document the ${label} tab`);
}
assert(readme.includes('Reviewer Console'), 'README should document that the Reviewer Console is hidden from normal V1');
assert(technical.includes('Reviewer Console'), 'TECHNICAL.md should document the hidden Reviewer Console');
for (const moduleName of ['activeMoietyEngine', 'phenoconversionEngine', 'persistenceTimelineEngine', 'findingEngine', 'warningPathEngine', 'evidenceConfidenceEngine']) {
  assert(technical.includes(moduleName), `TECHNICAL.md should document ${moduleName}`);
}

const tabLabels = Array.from(doc.querySelectorAll('#tabBar .tab-btn')).map((btn) => btn.textContent.trim());
assert(
  tabLabels.join('|') === 'Overview|Mechanisms|Genes + Metabolites|Timing + Levels|Evidence|Reviewer Console',
  `Unexpected top-level tabs: ${tabLabels.join('|')}`
);
const reviewTabButton = doc.getElementById('tabbtn-review');
const reviewTabPanel = doc.getElementById('tab-review');
assert(reviewTabButton?.hidden && reviewTabButton?.getAttribute('aria-hidden') === 'true',
  'Normal V1 should keep the reviewer tab button hidden from the accessibility tree');
assert(reviewTabPanel?.hidden && reviewTabPanel?.getAttribute('aria-hidden') === 'true',
  'Normal V1 should keep the reviewer panel hidden from the accessibility tree');
assert(typeof window.DIOGNOSIS_V1?.getState === 'function', 'V1 should expose a small runtime handoff facade');
const initialHandoffState = window.DIOGNOSIS_V1.getState();
assert(initialHandoffState.version.engine === '0.1.0-alpha.1', 'V1 facade should expose version metadata');
assert(Array.isArray(initialHandoffState.substances) && initialHandoffState.substances.length === 0,
  'V1 facade should expose an empty selected-list state at startup');

const styleText = Array.from(doc.querySelectorAll('style')).map((style) => style.textContent || '').join('\n');
const themeColor = doc.querySelector('meta[name="theme-color"]')?.getAttribute('content') || '';
const approvedPalette = {
  themeColor: '#137a6a',
  bg: '#f1f0ec',
  surface: '#fbfbf9',
  rail: '#f7f6f2',
  card2: '#f7f6f2',
  text: '#17181b',
  text2: '#6c7077',
  border: '#e8e7e0',
  accent: '#137a6a',
  accent2: '#2c5e54',
  accentBg: '#e7f1ee',
};
assert(themeColor === approvedPalette.themeColor, `Theme color should keep the Clinical Calm palette; got ${themeColor}`);
for (const [name, value] of Object.entries(approvedPalette).filter(([name]) => name !== 'themeColor')) {
  assert(new RegExp(`--${name}\\s*:\\s*${value}\\b`, 'i').test(styleText), `Clinical Calm palette token --${name} should be ${value}`);
}
assert(!/--accent\s*:\s*#2563eb\b/i.test(styleText), 'Smoke check should catch the rejected blue accent palette');
assert(!/--accent2\s*:\s*#0f766e\b/i.test(styleText), 'Smoke check should catch unapproved teal secondary palette drift');
assert(/--shadow\s*:\s*0 1px 2px rgba\(23,24,27,0\.04\)/i.test(styleText),
  'Clinical Calm theme should keep quiet card shadows');
assert(/--shadow2\s*:\s*0 8px 24px rgba\(23,24,27,0\.08\)/i.test(styleText),
  'Clinical Calm theme should keep restrained elevated shadows');
assert(/--radius\s*:\s*14px\b/i.test(styleText),
  'Clinical Calm theme should keep the card radius');
assert(/@media\(max-width:480px\)[\s\S]*\.summary-next\s*\{\s*display:grid;grid-template-columns:1fr/i.test(styleText),
  'Mobile Patient summary next-step card should stack label and text for readability');

const patientEmptyText = doc.getElementById('mainEmptyState')?.textContent || '';
assert(patientEmptyText.includes('Review priority signals first'), 'Default Patient landing copy should point to priority signals first');
assert(!patientEmptyText.includes('Review the result tabs'), 'Default Patient landing copy should not point to hidden result tabs');
window.setAudienceMode('clinician', { render:false });
assert((doc.getElementById('mainEmptyState')?.textContent || '').includes('Review the priority signal'),
  'Clinician landing copy should keep explicit priority-signal guidance');
window.setAudienceMode('patient', { render:false });

const inputRailOrder = Array.from(doc.querySelector('.input-rail')?.children || []).map((el) => el.id || el.className);
const mainOrder = Array.from(doc.querySelector('.main')?.children || []).map((el) =>
  el.id || (el.classList.contains('input-rail') ? 'input-rail' : el.classList.contains('result-area') ? 'result-area' : el.className)
);
const selectedListIndex = inputRailOrder.indexOf('selectedListSection');
const geneticsIndex = inputRailOrder.indexOf('geneticsSection');
assert(selectedListIndex >= 0 && geneticsIndex === selectedListIndex + 1,
  `Gene / Marker Results should stay directly after the selected list; got ${inputRailOrder.join('|')}`);
assert(mainOrder.join('|') === 'input-rail|result-area',
  `Results should remain after the input rail; got ${mainOrder.join('|')}`);
assert(/body\[data-audience="patient"\]\s*#geneticsSection\s*\{\s*order\s*:\s*2\s*\}/i.test(styleText),
  'Patient mode should keep Gene Results before results');
assert(/body\[data-audience="clinician"\]\s*#geneticsSection\s*\{\s*order\s*:\s*2\s*\}/i.test(styleText),
  'Clinician mode should keep Gene / Marker Results before results');
assert(/body\[data-audience="patient"\]\s*\.result-area\s*\{\s*order\s*:\s*3\s*\}/i.test(styleText),
  'Patient mode should keep results after Gene Results');
assert(/body\[data-audience="clinician"\]\s*\.result-area\s*\{\s*order\s*:\s*3\s*\}/i.test(styleText),
  'Clinician mode should keep results after Gene / Marker Results');
const geneticsToggle = doc.querySelector('#geneticsSection .section-title.collapsible');
const geneticsBody = doc.getElementById('geneticsBody');
assert(geneticsToggle?.getAttribute('role') === 'button' && geneticsToggle?.getAttribute('tabindex') === '0',
  'Gene Results collapsible header should be keyboard focusable');
assert(geneticsToggle?.getAttribute('aria-controls') === 'geneticsBody',
  'Gene Results collapsible header should name the controlled panel');
assert(geneticsToggle?.getAttribute('aria-expanded') === String(geneticsBody?.classList.contains('open')),
  'Gene Results collapsible header should expose initial expanded state');
geneticsToggle.dispatchEvent(new window.KeyboardEvent('keydown', { key:' ', bubbles:true, cancelable:true }));
assert(geneticsBody?.classList.contains('open') && geneticsToggle.getAttribute('aria-expanded') === 'true',
  'Space on Gene Results collapsible header should open the panel and update aria-expanded');
geneticsToggle.dispatchEvent(new window.KeyboardEvent('keydown', { key:'Enter', bubbles:true, cancelable:true }));
assert(!geneticsBody?.classList.contains('open') && geneticsToggle.getAttribute('aria-expanded') === 'false',
  'Enter on Gene Results collapsible header should close the panel and update aria-expanded');
assert(doc.querySelectorAll('.section-title.collapsible[role="button"][tabindex="0"][aria-controls][aria-expanded]').length >= 10,
  'Core collapsible section headers should expose keyboard and aria state');

const searchInput = doc.getElementById('searchInput');
const searchResults = doc.getElementById('searchResults');
searchInput.value = 'parox';
window.onSearch(searchInput.value);
assert(doc.querySelector('#searchResults .sr-close'), 'Search suggestions should include an explicit close control');
doc.querySelector('#searchResults .sr-close').click();
assert(!searchResults.classList.contains('show'), 'Search suggestions close button should dismiss the panel');
searchInput.value = 'parox';
window.onSearch(searchInput.value);
searchInput.dispatchEvent(new window.KeyboardEvent('keydown', { key:'Escape', bubbles:true, cancelable:true }));
assert(!searchResults.classList.contains('show') && searchInput.value === '',
  'Escape in search should clear and dismiss the suggestions panel');

searchInput.value = 'parox';
window.onSearch(searchInput.value);
let keyboardSearchResult = doc.querySelector('#searchResults .sr-item[role="button"][tabindex="0"]');
assert(keyboardSearchResult?.getAttribute('onkeydown')?.includes('activateKeyboardButton'), 'Search results should support keyboard activation');
keyboardSearchResult.dispatchEvent(new window.KeyboardEvent('keydown', { key:'Enter', bubbles:true, cancelable:true }));
assert(evalInPage(window, 'activeStack.includes("Paroxetine")'), 'Enter on a search result should add the selected medication');
assert(!searchResults.classList.contains('show') && searchInput.value === '',
  'Selecting a search result should clear and dismiss the suggestions panel');
const handoffAfterSearchAdd = window.DIOGNOSIS_V1.getState();
assert(handoffAfterSearchAdd.substances.some(item => item.name === 'Paroxetine'),
  'V1 facade should expose the selected medication for redesign handoff');
searchInput.value = 'parox';
window.onSearch(searchInput.value);
keyboardSearchResult = doc.querySelector('#searchResults .sr-item[role="button"][tabindex="0"]');
keyboardSearchResult.dispatchEvent(new window.KeyboardEvent('keydown', { key:'Enter', bubbles:true, cancelable:true }));
assert(!evalInPage(window, 'activeStack.includes("Paroxetine")'), 'Enter on an already-selected search result should remove the medication');
assert(!searchResults.classList.contains('show') && searchInput.value === '',
  'Removing from a search result should also dismiss the suggestions panel');
assert(!window.DIOGNOSIS_V1.getState().substances.some(item => item.name === 'Paroxetine'),
  'V1 facade should update after medication removal');

searchInput.value = 'not in this database';
window.onSearch(searchInput.value);
const keyboardUnknownResult = doc.querySelector('#searchResults .sr-unrecognized[role="button"][tabindex="0"]');
assert(keyboardUnknownResult, 'Unrecognized search row should support keyboard activation');
keyboardUnknownResult.dispatchEvent(new window.KeyboardEvent('keydown', { key:' ', bubbles:true, cancelable:true }));
assert(evalInPage(window, 'activeStack.includes("Not In This Database")'), 'Space on an unrecognized search row should keep the item in the selected list');
assert(!searchResults.classList.contains('show') && searchInput.value === '',
  'Adding an unrecognized search row should dismiss the suggestions panel');
window.removeDrug('Not In This Database');

window.setViewMode('browse');
const keyboardGuide = doc.querySelector('.class-guide-card[role="button"][tabindex="0"]');
assert(keyboardGuide?.getAttribute('onkeydown')?.includes('activateKeyboardButton'), 'Browse example cards should support keyboard activation');
keyboardGuide.dispatchEvent(new window.KeyboardEvent('keydown', { key:'Enter', bubbles:true, cancelable:true }));
assert(evalInPage(window, 'activeStack.length') > 0, 'Enter on a browse example card should load its example stack');
evalInPage(window, `(() => { activeStack = []; renderAll(); setViewMode('browse'); })()`);
const keyboardBrowseCategory = doc.querySelector('.browse-cat-title[role="button"][tabindex="0"]');
assert(keyboardBrowseCategory?.getAttribute('aria-expanded') === 'false', 'Browse category headers should expose collapsed state');
keyboardBrowseCategory.dispatchEvent(new window.KeyboardEvent('keydown', { key:' ', bubbles:true, cancelable:true }));
assert(keyboardBrowseCategory.getAttribute('aria-expanded') === 'true' && keyboardBrowseCategory.nextElementSibling?.classList.contains('show'),
  'Space on a browse category header should expand the category');
const keyboardBrowseChip = doc.querySelector('.browse-chip[role="button"][tabindex="0"]');
assert(keyboardBrowseChip?.getAttribute('onkeydown')?.includes('activateKeyboardButton'), 'Browse medication chips should support keyboard activation');
window.setViewMode('search');

window.addDrug('Paroxetine');
window.addDrug('Codeine');
await new Promise((resolveReady) => setTimeout(resolveReady, 100));

assert(evalInPage(window, 'activeStack.length') === 2, 'Medication stack did not update');
assert(doc.getElementById('medCount')?.textContent.includes('2'), 'Medication count did not update');
assert(doc.querySelector('#medList .selected-list-action.primary')?.textContent.includes('Review'),
  'Selected list should expose a direct review action');
assert(doc.querySelectorAll('#medList .selected-list-action').length === 2,
  'Selected list should expose compact review and clear actions');
doc.querySelector('#medList .selected-list-action.primary').click();
await new Promise((resolveReady) => setTimeout(resolveReady, 40));
assert(evalInPage(window, 'activeTab') === 'overview', 'Selected-list review action should keep users on Overview');
doc.querySelector('#medList .selected-list-action:not(.primary)').click();
assert(evalInPage(window, 'activeStack.length') === 0, 'Selected-list clear action should empty the stack');
assert(doc.querySelector('#medList .empty-undo-btn'), 'Selected-list clear action should expose undo');
doc.querySelector('#medList .empty-undo-btn').click();
await new Promise((resolveReady) => setTimeout(resolveReady, 40));
assert(evalInPage(window, 'activeStack.join("|")') === 'Paroxetine|Codeine',
  'Selected-list undo should restore the cleared stack in order');
const summaryCopyStatus = doc.getElementById('summaryCopyStatus');
const summaryCopyText = doc.getElementById('summaryCopyText');
assert(summaryCopyStatus?.getAttribute('role') === 'status' && summaryCopyStatus?.getAttribute('aria-live') === 'polite',
  'Summary copy status should be announced politely');
assert(summaryCopyText?.getAttribute('tabindex') === '0' && summaryCopyText?.getAttribute('aria-label'),
  'Summary copy fallback text should be keyboard focusable');
const originalExecCommand = doc.execCommand;
doc.execCommand = () => false;
window.copyOverviewHandoffSummary();
assert(summaryCopyStatus.textContent === 'Select text below', 'Summary copy fallback should explain manual selection');
assert(summaryCopyText.hidden === false && /Diognosis V1 handoff summary|Diognosis questions to ask/i.test(summaryCopyText.textContent),
  'Summary copy fallback should reveal the copyable handoff text');
assert(/Handoff type: patient question list/i.test(summaryCopyText.textContent),
  'Patient copy fallback should identify itself as a patient question list');
assert(/Generated from local Diognosis/i.test(summaryCopyText.textContent) && /no patient-specific data was uploaded/i.test(summaryCopyText.textContent),
  'Patient copy fallback should carry the local-data boundary');
assert(!/V1 scope|Clinical context still needed/i.test(summaryCopyText.textContent),
  'Patient question list should not expose clinician handoff sections');
assert(doc.activeElement === summaryCopyText, 'Summary copy fallback should move focus to the copyable handoff text');
doc.execCommand = originalExecCommand;
assert(doc.getElementById('tab-overview')?.classList.contains('active'), 'Overview tab should be active by default');
assert(doc.getElementById('findingSection')?.closest('.tab-panel')?.id === 'tab-overview', 'Normalized interaction findings should live under Overview');
assert(doc.getElementById('interSection')?.closest('.tab-panel')?.id === 'tab-review', 'Detailed known interactions should live under Reviewer Console');
assert(doc.getElementById('comboSection')?.closest('.tab-panel')?.id === 'tab-review', 'Detailed combination alerts should live under Reviewer Console');
assert(doc.getElementById('graphSection')?.closest('.tab-panel')?.id === 'tab-mechanisms', 'Full network should live under Mechanisms');
assert(doc.getElementById('mechanismWhySection')?.closest('.tab-panel')?.id === 'tab-mechanisms', 'Finding Why Paths should live under Mechanisms');
assert(doc.getElementById('matrixSection')?.closest('.tab-panel')?.id === 'tab-review', 'Interaction grid should live under Reviewer Console');
assert(doc.getElementById('genotypeSection')?.closest('.tab-panel')?.id === 'tab-genes-metabolites', 'Genotype panel should live under Genes + Metabolites');
assert(doc.getElementById('phenoconversionSection')?.closest('.tab-panel')?.id === 'tab-genes-metabolites', 'Current Pathway Status should live under Genes + Metabolites');
assert(doc.getElementById('activeMoietySection')?.closest('.tab-panel')?.id === 'tab-genes-metabolites', 'Drug & Metabolite Balance should live under Genes + Metabolites');
assert(doc.getElementById('pkSimSection')?.closest('.tab-panel')?.id === 'tab-timing-levels', 'PK simulation should live under Timing + Levels');
assert(doc.getElementById('persistenceTimelineSection')?.closest('.tab-panel')?.id === 'tab-timing-levels', 'Persistence & Washout should live under Timing + Levels');
assert(doc.getElementById('reviewWorkbenchSection')?.closest('.tab-panel')?.id === 'tab-review', 'Reviewer workbench should live under Reviewer Console');
assert(doc.getElementById('reviewSummarySection')?.closest('.tab-panel')?.id === 'tab-review', 'Reviewer Summary should live under Reviewer Console');
assert(doc.getElementById('scenarioSnapshotSection')?.closest('.tab-panel')?.id === 'tab-review', 'Scenario Snapshots should live under Reviewer Console');
assert(doc.getElementById('metaboliteGapSection')?.closest('.tab-panel')?.id === 'tab-review', 'Metabolite Coverage Gaps should live under Reviewer Console');
assert(doc.getElementById('contributeSection')?.closest('.tab-panel')?.id === 'tab-review', 'Report / Contribute should live under Reviewer Console');
assert(doc.getElementById('warningPathSection')?.closest('.tab-panel')?.id === 'tab-review', 'Technical Warning Paths should live under Reviewer Console');
assert(evalInPage(window, 'audienceMode') === 'patient', 'Default V1 smoke path should open in Patient mode');
const patientSummaryText = Array.from(doc.querySelectorAll('#summaryBar .summary-title, #summaryBar .summary-copy, #summaryBar .summary-next'))
  .map(el => el.textContent || '')
  .join(' ');
const patientFindingText = doc.getElementById('findingBody')?.textContent || '';
assert(/questions? ready for your list/i.test(patientSummaryText), 'Patient summary should orient around prepared questions');
assert(!/Can you check/i.test(patientSummaryText), 'Patient summary should leave exact questions to Safety Notes');
assert(doc.querySelectorAll('#findingBody .patient-question-card').length > 0, 'Default Overview should render Patient safety-note cards');
assert(doc.querySelector('#findingBody .patient-stack-summary'), 'Default Patient Overview should render a stack synthesis summary');
assert(patientFindingText.includes('What to ask') && patientFindingText.includes('Why this came up'), 'Patient safety-note cards should render question-first plain-language guidance');
assert(doc.querySelectorAll('#findingBody .primary-finding-card').length === 0, 'Default Patient Overview should not render clinician finding cards');
window.setAudienceMode('clinician');
assert(evalInPage(window, 'audienceMode') === 'clinician', 'Clinician smoke path should switch to Clinician mode');
const clinicianSummaryText = doc.getElementById('summaryBar')?.textContent || '';
assert(/Clinical Review Priorities/i.test(clinicianSummaryText), 'Clinician summary should present the Overview as review priorities');
assert(/Review first/i.test(clinicianSummaryText), 'Clinician summary should point to the first review priority');
assert(doc.querySelectorAll('#findingBody .finding-card').length > 0, 'Overview should render normalized finding cards');
assert(doc.querySelectorAll('#findingBody .primary-finding-card').length > 0, 'Overview finding cards should render primary public finding cards');
assert(/Review first/i.test(doc.querySelector('#findingBody .primary-finding-card')?.textContent || ''), 'Clinician first finding should be explicitly marked as the first review priority');
assert([...doc.querySelectorAll('#findingBody .primary-finding-card')].every(card => ['What changed', 'Why it matters', 'What to review', 'Evidence'].every(label => card.textContent.includes(label))), 'Overview finding cards should render the four-part public explanation');
const clinicianVisibleReviewText = `${doc.getElementById('summaryBar')?.textContent || ''} ${doc.getElementById('findingBody')?.textContent || ''}`;
assert(!clinicianVisibleReviewText.includes('should be avoided, substituted, dose-adjusted, or monitored before use'),
  'Clinician review copy should avoid the old directive medication-change fallback phrase');
assert(doc.querySelectorAll('#findingBody .why-path').length === 0, 'Overview should not duplicate the full why-path chain');
assert(doc.querySelectorAll('#findingBody .finding-step').length > 0, 'Overview finding cards should render compact explanation steps');
assert(doc.querySelectorAll('#mechanismWhyBody .mechanism-why-row').length > 0, 'Mechanisms should render finding why paths');
assert(doc.querySelectorAll('#phenoconversionBody .phenoconversion-card').length > 0, 'Genes + Metabolites should render Current Pathway Status cards');
assert(doc.querySelectorAll('#activeMoietyBody .active-moiety-card').length > 0, 'Genes + Metabolites should render Drug & Metabolite Balance cards');
assert(doc.querySelectorAll('#persistenceTimelineBody .persistence-card').length > 0, 'Timing + Levels should render Persistence & Washout cards');
assert(doc.getElementById('tabbtn-review')?.style.display === 'none', 'Normal V1 smoke path should hide reviewer-only console navigation');
window.setTab('review');
assert(evalInPage(window, 'activeTab') === 'overview', 'Normal V1 smoke path should route reviewer-console requests back to Overview');
window.history.replaceState(null, '', '/index.html?reviewer=1');
window.setTab('review');
assert(doc.querySelectorAll('#reviewSummaryBody .review-summary-tile').length > 0, 'Review should render current-stack summary tiles');
assert(doc.querySelectorAll('#scenarioSnapshotBody .review-diagnostic-card').length === 0, 'Generated scenario snapshot diagnostics should stay out of the slim bundle');
assert(doc.querySelectorAll('#metaboliteGapBody .review-diagnostic-card').length === 0, 'Generated metabolite coverage diagnostics should stay out of the slim bundle');
assert(doc.querySelectorAll('#contributeBody .review-action-btn').length >= 2, 'Review should expose report/contribute actions');
assert(doc.querySelectorAll('#warningPathBody .warning-path-row').length > 0, 'Review should expose technical pathway rows');
window.history.replaceState(null, '', '/index.html');
window.setTab('overview');

const findingAudit = evalInPage(window, `(() => {
  const findings = buildInteractionFindings(activeStack, activeGenotype, { interactions: calcRisk().interactions });
  return {
    count:findings.length,
    first:findings[0],
    types:[...new Set(findings.map(f => f.type))],
  };
})()`);
assert(findingAudit.count > 0, 'Shared finding engine should return findings for Paroxetine + Codeine');
assert(findingAudit.types.includes('active_moiety') || findingAudit.types.includes('pairwise_interaction'), 'Finding engine should classify pairwise/active-moiety signals');
assert(findingAudit.first && findingAudit.first.evidenceLadder && findingAudit.first.evidenceLadder.clinicalActionConfidence, 'Findings should attach an evidence confidence ladder');
assert(findingAudit.first.evidenceLadder.sourceSupportStatus, 'Findings should expose source support status separately from clinical action status');
assert(findingAudit.first.evidenceLadder.professionalReviewStatus !== 'reviewed', 'Evidence ladder should not claim professional review without review metadata');
assert(findingAudit.first && findingAudit.first.whyPath && Array.isArray(findingAudit.first.whyPath.nodes), 'Findings should attach a structured whyPath');
assert(Array.isArray(findingAudit.first.affectedActors) && findingAudit.first.affectedActors.length >= 2, 'Findings should include affected actors');

const activeMoietyAudit = evalInPage(window, `(() => {
  const rows = computeActiveMoietyBalance(activeStack, activeGenotype);
  const morphine = rows.find(row => row.parent === 'Codeine' && row.actor === 'Morphine');
  const findings = buildInteractionFindings(activeStack, activeGenotype, { interactions: calcRisk().interactions });
  return {
    count:rows.length,
    morphine,
    activeFindingCount:findings.filter(f => f.type === 'active_moiety').length,
  };
})()`);
assert(activeMoietyAudit.count > 0, 'Active-moiety engine should return rows for Paroxetine + Codeine');
assert(activeMoietyAudit.morphine?.netPattern === 'activation_failure', 'Codeine + Paroxetine should flag morphine activation failure');
assert(activeMoietyAudit.morphine?.actorType === 'active_metabolite', 'Morphine should remain an active-metabolite signal, not a toxic-metabolite signal');
assert(activeMoietyAudit.activeFindingCount > 0, 'Active-moiety rows should feed the shared Interaction Finding model');

const phenoconversionAudit = evalInPage(window, `(() => {
  const rows = computePhenoconversionState(activeStack, activeGenotype);
  const cyp2d6 = rows.find(row => row.enzyme === 'CYP2D6');
  const findings = buildInteractionFindings(activeStack, activeGenotype, { interactions: calcRisk().interactions });
  return {
    cyp2d6,
    phenoconversionFindingCount:findings.filter(f =>
      f.type === 'phenoconversion' ||
      (f.groupedFindings || []).some(grouped => grouped.type === 'phenoconversion') ||
      (f.sourceRows || []).some(row => row?.functionalPhenotype)
    ).length,
  };
})()`);
assert(phenoconversionAudit.cyp2d6?.direction === 'reduced', 'Current Pathway Status should show CYP2D6 reduced by Paroxetine');
assert(phenoconversionAudit.cyp2d6?.drivers?.some(driver => driver.actor === 'Paroxetine'), 'CYP2D6 phenoconversion should list Paroxetine as a driver');
assert(phenoconversionAudit.phenoconversionFindingCount > 0, 'Phenoconversion rows should feed the shared Interaction Finding model');

const phenoconversionUiAudit = evalInPage(window, `(() => {
  const rows = computePhenoconversionState(activeStack, activeGenotype);
  const normalRows = rows.filter(row => classifyPhenoconversionDisplayGroup(row) === 'normal_relevant');
  const normalGroup = document.querySelector('details.phenoconversion-normal-group');
  return {
    normalRows:normalRows.length,
    normalGroupExists:Boolean(normalGroup),
    normalGroupOpen:normalGroup?.hasAttribute('open') || false,
  };
})()`);
if (phenoconversionUiAudit.normalRows > 0) {
  assert(phenoconversionUiAudit.normalGroupExists, 'Genes + Metabolites should collapse relevant normal functional gene rows');
  assert(!phenoconversionUiAudit.normalGroupOpen, 'Relevant normal functional gene rows should be collapsed by default');
}

const persistenceAudit = evalInPage(window, `(() => {
  const rows = computePersistenceTimeline(activeStack, activeGenotype);
  const paroxetineRule = rows.find(row => row.actor === 'Paroxetine' && row.persistenceType === 'washout_rule');
  const findings = buildInteractionFindings(activeStack, activeGenotype, { interactions: calcRisk().interactions });
  return {
    count:rows.length,
    paroxetineRule,
    timingFindingCount:findings.filter(f =>
      f.type === 'timing_washout' ||
      (f.sourceRows || []).some(row => row?.persistenceType)
    ).length,
  };
})()`);
assert(persistenceAudit.count > 0, 'Persistence timeline should return rows for Paroxetine + Codeine');
assert(persistenceAudit.paroxetineRule?.estimatedPersistenceDays === 18, 'Paroxetine washout rule should stay visible in the persistence timeline');
assert(persistenceAudit.timingFindingCount > 0, 'Persistence timeline rows should feed Overview interaction findings');

const mergedFindingAudit = evalInPage(window, `(() => {
  activeStack = ['Simvastatin', 'Clarithromycin'];
  renderAll();
  const findings = buildInteractionFindings(activeStack, activeGenotype, { interactions: calcRisk().interactions });
  return {
    count:findings.length,
    hasCombination:findings.some(f => f.type === 'combination_burden' || (f.tags || []).some(tag => /combination/i.test(tag))),
    hasGrouped:findings.some(f => (f.groupedFindings || []).length > 0),
    cardCount:document.querySelectorAll('#findingBody .finding-card').length,
  };
})()`);
assert(mergedFindingAudit.count > 0, 'Shared finding engine should return findings for Simvastatin + Clarithromycin');
assert(mergedFindingAudit.hasCombination, 'Combination alerts should feed the shared finding model');
assert(mergedFindingAudit.hasGrouped, 'Overlapping known/combination signals should be grouped');
assert(mergedFindingAudit.cardCount > 0, 'Overview should render grouped finding cards');
evalInPage(window, `(() => { activeStack = ['Paroxetine', 'Codeine']; renderAll(); })()`);

window.setTab('pgx');
assert(evalInPage(window, 'activeTab') === 'genes-metabolites', 'Legacy pgx tab alias should resolve to Genes + Metabolites');
assert(doc.getElementById('tab-genes-metabolites')?.classList.contains('active'), 'Legacy pgx alias should activate Genes + Metabolites');
window.setTab('network');
assert(evalInPage(window, 'activeTab') === 'mechanisms', 'Legacy network tab alias should resolve to Mechanisms');
window.setTab('advanced');
assert(evalInPage(window, 'activeTab') === 'overview', 'Legacy advanced tab alias should resolve to Overview in normal V1 mode');
window.history.replaceState(null, '', '/index.html?reviewer=1');
window.setTab('advanced');
assert(evalInPage(window, 'activeTab') === 'review', 'Legacy advanced tab alias should resolve to Review in reviewer mode');
window.history.replaceState(null, '', '/index.html');
window.setTab('safety');
assert(evalInPage(window, 'activeTab') === 'overview', 'Legacy safety tab alias should resolve to Overview');

const risk = evalInPage(window, 'calcRisk()');
assert(risk && Array.isArray(risk.interactions), 'Risk engine did not return interactions');
assert(risk.score > 0, 'Risk score should be positive for Paroxetine + Codeine');

const cyp2d6 = evalInPage(window, 'computeEnzymeCapacity("CYP2D6", ["Paroxetine", "Codeine"])');
assert(cyp2d6.capacity_pct < 100, 'CYP2D6 capacity should be impaired by Paroxetine');
assert(cyp2d6.inhibitors.some((i) => i.drug === 'Paroxetine'), 'CYP2D6 capacity did not identify Paroxetine');

const pk = evalInPage(window, 'pkSteadyStateMetrics(PK_PARAMS.paroxetine, pkGetTau("Paroxetine"))');
assert(pk.accum > 1, 'Paroxetine accumulation factor should be above 1');
assert(pk.t_to_ss_days > 0, 'Paroxetine steady-state time should be positive');

const summary = evalInPage(window, 'buildClinicalSummary()');
assert(summary && Array.isArray(summary.allEffects), 'Clinical summary did not return path effects');

assert(browserErrors.length === 0, `Browser errors:\n${browserErrors.join('\n')}`);

dom.window.close();
console.log('Smoke check passed.');
