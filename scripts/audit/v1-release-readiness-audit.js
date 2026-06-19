#!/usr/bin/env node
import { readFileSync } from 'fs';
import { JSDOM, VirtualConsole } from 'jsdom';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const html = readFileSync('index.html', 'utf8');

function createDom(url = 'http://localhost/') {
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
    url,
  });
  return { dom, browserErrors };
}

async function loadPage(url) {
  const page = createDom(url);
  await new Promise((resolveReady) => setTimeout(resolveReady, 450));
  assert(page.browserErrors.length === 0, `V1 readiness audit emitted browser errors: ${page.browserErrors.join('; ')}`);
  return page.dom.window;
}

function normalizedText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function assertNoUnsafeCertainty(label, text) {
  assert(
    !/\b(?:guaranteed safe|safe to take|this list is safe|no risks?|risk[-\s]?free|clinically validated)\b/i.test(text),
    `${label} uses unsafe certainty language`
  );
}

function assertNoInternalLeak(label, text) {
  assert(
    !/\b(?:review prompt|top-250|top-100|coverage adapter|route adapter|gold enrichment|bulk_)\b/i.test(text),
    `${label} leaks internal implementation language`
  );
}

function assertNoPatientTechnicalLeak(label, text) {
  assert(
    !/\b(?:AUC|Cmax|RxNorm|PGx|PMID|source-linked|modeled|confidence|clinical review needed|pharmacogenomics|metabolite-level|CYP\d)/i.test(text),
    `${label} exposes clinician-only technical vocabulary`
  );
}

function assertNoPatientFooterLeak(label, text) {
  assert(
    !/(?:Technical details remain available in Review|Detailed technical context|pathway, metabolite, timing, and evidence signals|clinical concerns)/i.test(text),
    `${label} exposes clinician-only Overview footer language`
  );
}

function extractReadiness(window) {
  return window.eval(`(() => {
    setTab('review');
    const snapshot = buildV1ReadinessSnapshot();
    const panel = document.getElementById('v1ReadinessPanel');
    return {
      snapshot,
      panelReady:panel?.dataset.ready || '',
      panelText:panel?.textContent || '',
      handoffText:buildV1HandoffSummaryText(),
      reviewText:document.getElementById('reviewSummaryBody')?.textContent || '',
      scopeText:document.getElementById('scopeBody')?.textContent || '',
      contextChecklist:document.querySelectorAll('#scopeBody .scope-context-list li').length,
      sourceLinks:document.querySelectorAll('#findingBody a.source-link').length,
      sourceActions:document.querySelectorAll('#findingBody .finding-actions .related-finding-btn').length,
      trustChips:document.querySelectorAll('#findingBody .finding-trust-chip').length,
      discussionGuides:document.querySelectorAll('#findingBody .finding-discussion').length,
      monitoringGuides:document.querySelectorAll('#findingBody .finding-monitoring').length,
      summaryActions:document.querySelectorAll('#summaryBar .summary-actions .summary-action-btn').length,
      cards:document.querySelectorAll('#findingBody .primary-finding-card').length,
      reviewTiles:document.querySelectorAll('#reviewSummaryBody .review-summary-tile').length,
      shareUrl:currentStackShareUrl('overview'),
      sourceLinkedCards:getCurrentPublicFindingPresentations().filter(p => p.trustContract?.sourceLinked).length,
      directEligible:getCurrentPublicFindingPresentations().filter(p => (p.trustContract?.evidenceRefs || []).some(ref => {
        const study = typeof getStudy === 'function' ? getStudy(ref) : STUDY_DB[ref];
        return !!(study && (study.pmid || study.doi || study.url));
      })).length,
    };
  })()`);
}

const clinicianScenarios = [
  {
    name:'Warfarin + Amiodarone',
    url:'http://localhost/index.html?substances=warfarin,amiodarone&tab=review',
    expected:['Warfarin', 'Amiodarone'],
  },
  {
    name:'Clopidogrel + Omeprazole with CYP2C19 PM',
    url:'http://localhost/index.html?substances=clopidogrel,omeprazole&genotype=CYP2C19:PM&tab=review',
    expected:['Clopidogrel', 'Omeprazole', 'CYP2C19'],
  },
  {
    name:'Codeine + Fluoxetine with CYP2D6 PM',
    url:'http://localhost/index.html?substances=codeine,fluoxetine&genotype=CYP2D6:PM&tab=review',
    expected:['Codeine', 'Fluoxetine', 'CYP2D6'],
  },
];

for (const scenario of clinicianScenarios) {
  const window = await loadPage(scenario.url);
  const result = extractReadiness(window);
  const snapshot = result.snapshot;
  assert(snapshot?.ready, `${scenario.name}: V1 readiness snapshot should pass, got ${snapshot?.passed}/${snapshot?.total}`);
  assert(result.panelReady === 'true', `${scenario.name}: V1 readiness panel should report ready`);
  assert(/V1 Readiness|Review scope|Finding contracts|Source traceability|Standards identity|Clinical boundaries/i.test(result.panelText),
    `${scenario.name}: V1 readiness panel missing required checks`);
  assert(result.cards > 0, `${scenario.name}: Overview should show public finding cards`);
  assert(result.trustChips >= result.cards, `${scenario.name}: Overview cards should expose trust chips`);
  assert(result.discussionGuides >= result.cards, `${scenario.name}: Overview cards should expose discussion guides`);
  assert(result.monitoringGuides >= result.cards, `${scenario.name}: Overview cards should expose monitoring focus`);
  assert(result.summaryActions >= 2, `${scenario.name}: Overview summary should expose copy/share actions`);
  assert(result.sourceLinkedCards > 0, `${scenario.name}: should include at least one source-linked public concern`);
  assert(result.sourceActions > 0, `${scenario.name}: source-linked cards should expose source actions`);
  assert(result.directEligible === 0 || result.sourceLinks > 0, `${scenario.name}: direct PMID/DOI/source-eligible cards need direct source links`);
  assert(result.reviewTiles > 0, `${scenario.name}: Review Summary should render summary tiles`);
  assert(result.contextChecklist >= 4, `${scenario.name}: Overview scope should expose a current-stack review checklist`);
  assert(/Selected|Recognized|Concerns|Source-linked|Limit:/i.test(result.scopeText),
    `${scenario.name}: Review Scope should expose coverage and limits`);
  assert(/Diognosis V1 review summary|Review scope|Standards identity|Top concerns|Boundaries|Share link:/i.test(result.handoffText),
    `${scenario.name}: handoff summary missing required sections`);
  assert(/Review checklist|Medication reconciliation|Patient context/i.test(result.handoffText),
    `${scenario.name}: handoff summary missing practical review checklist`);
  assert(/Monitoring focus|Current symptoms|dose changes|last-dose timing/i.test(result.handoffText),
    `${scenario.name}: handoff summary missing per-concern monitoring focus`);
  for (const expected of scenario.expected) {
    assert(result.handoffText.includes(expected), `${scenario.name}: handoff should preserve ${expected}`);
  }
  assert(/not medical advice/i.test(result.handoffText), `${scenario.name}: handoff missing not-medical-advice boundary`);
  assert(/Do not start, stop, or change medication/i.test(result.handoffText), `${scenario.name}: handoff missing medication-change boundary`);
  assert(result.shareUrl.includes('substances='), `${scenario.name}: share URL should preserve selected substances`);
  assert(result.handoffText.includes(result.shareUrl), `${scenario.name}: handoff should include generated share URL`);
  assertNoUnsafeCertainty(`${scenario.name} Review Scope`, result.scopeText);
  assertNoUnsafeCertainty(`${scenario.name} handoff`, result.handoffText);
  assertNoInternalLeak(`${scenario.name} readiness panel`, result.panelText);
  assertNoInternalLeak(`${scenario.name} review summary`, result.reviewText);
}

const patientWindow = await loadPage('http://localhost/index.html?substances=warfarin,amiodarone&audience=patient&tab=review');
const patient = patientWindow.eval(`(() => ({
  audienceMode,
  bodyAudience:document.body.dataset.audience,
  activeTab,
  tagline:document.getElementById('audienceTagline')?.textContent || '',
  searchPlaceholder:document.getElementById('searchInput')?.getAttribute('placeholder') || '',
  listTitle:document.getElementById('listTitle')?.textContent || '',
  geneTitle:document.getElementById('geneSectionTitle')?.textContent || '',
  geneIntro:document.getElementById('geneSectionIntro')?.textContent || '',
  tabBarDisplay:document.getElementById('tabBar')?.style.display || '',
  summaryText:document.getElementById('summaryBar')?.textContent || '',
  summaryRisk:document.querySelector('#summaryBar .summary-risk')?.textContent || '',
  findingTitle:document.getElementById('findingTitle')?.textContent || '',
  findingCount:document.getElementById('findingCount')?.textContent || '',
  findingText:document.getElementById('findingBody')?.textContent || '',
  severityLabels:[...document.querySelectorAll('#findingBody .finding-sev')].map(el => el.textContent.trim()),
  sourceLinks:document.querySelectorAll('#findingBody a.source-link').length,
  actionRows:document.querySelectorAll('#findingBody .finding-actions').length,
  supportingDetails:document.querySelectorAll('#findingBody .finding-support-details').length,
  detailButtons:document.querySelectorAll('#findingBody .related-finding-btn.secondary').length,
  discussionGuides:document.querySelectorAll('#findingBody .finding-discussion').length,
  monitoringGuides:document.querySelectorAll('#findingBody .finding-monitoring').length,
  summaryActions:document.querySelectorAll('#summaryBar .summary-actions .summary-action-btn').length,
  overviewHandoffText:buildOverviewHandoffText(),
  riskDisplay:document.getElementById('riskSection')?.style.display || '',
  scopeDisplay:document.getElementById('scopeSection')?.style.display || '',
  scopeText:document.getElementById('scopeBody')?.textContent || '',
  shareUrl:currentStackShareUrl(),
}))()`);

assert(patient.audienceMode === 'patient', 'Patient URL should activate Patient mode');
assert(patient.bodyAudience === 'patient', 'Patient mode should mark body data-audience');
assert(patient.activeTab === 'overview', 'Patient mode should force Overview even if URL asks for Review');
assert(/prepare medicine-list questions|doctor or pharmacist/i.test(patient.tagline),
  'Patient mode should use patient-facing app tagline');
assert(/Search medicines/i.test(patient.searchPlaceholder), 'Patient mode should use patient-facing search placeholder');
assert(patient.listTitle === 'My Medicine List', 'Patient mode should use patient-facing list label');
assert(/Gene Results/i.test(patient.geneTitle) && /Do not guess|original report|doctor or pharmacist/i.test(patient.geneIntro),
  'Patient mode should use patient-facing gene helper copy');
assert(!/Genes \+ Metabolites tab|source-linked|parent drugs|PK timing|pathway activity|metabolite balance/i.test(
  `${patient.tagline} ${patient.geneIntro}`
), 'Patient chrome should not refer to hidden clinician tabs or technical tagline language');
assert(patient.tabBarDisplay === 'none', 'Patient mode should hide clinician tab navigation');
assert(patient.summaryRisk.trim() === '', 'Patient mode should hide score-style summary badges');
assert(patient.findingTitle === 'Safety Notes', 'Patient mode should rename public findings');
assert(/safety notes?/i.test(patient.findingCount), 'Patient mode should label public finding count as safety notes');
assert(/What this means|What to ask/i.test(patient.findingText), 'Patient mode should use plain-language labels');
assert(/Question to ask|Can you check/i.test(patient.findingText), 'Patient mode should expose a plain-language discussion question');
assert(/Safety notes group related concerns|doctor or pharmacist/i.test(patient.findingText), 'Patient mode should use a plain-language Safety Notes footer');
assert(patient.discussionGuides > 0, 'Patient mode should render discussion guides on safety notes');
assert(patient.monitoringGuides > 0, 'Patient mode should render plain-language mention-if-present guidance');
assert(patient.summaryActions >= 2, 'Patient mode should expose top-level copy/share actions');
assert(patient.scopeDisplay === 'none', 'Patient mode should hide the clinician Review Scope panel');
assert(!normalizedText(patient.scopeText), 'Patient mode should not render hidden Review Scope copy');
assert(/Diognosis questions to ask|Questions to ask|Symptoms or changes to mention|Bring to review|Do not start, stop, or change medication/i.test(patient.overviewHandoffText),
  'Patient mode should build a patient-safe copyable question summary');
assert(patient.sourceLinks === 0, 'Patient mode should hide direct clinician source chips');
assert(patient.actionRows === 0, 'Patient mode should not render empty clinician action rows on Safety Notes');
assert(patient.supportingDetails === 0, 'Patient mode should hide technical supporting detail drawers');
assert(patient.detailButtons === 0, 'Patient mode should hide clinician supporting-detail buttons');
assert(patient.severityLabels.length > 0 && patient.severityLabels.every(label => !/^(critical|severe|moderate|monitor|info)$/i.test(label)),
  `Patient mode should use plain priority labels instead of raw severity labels: ${patient.severityLabels.join(', ')}`);
assert(patient.riskDisplay === 'none', 'Patient mode should hide score-style risk panel');
assert(patient.shareUrl.includes('audience=patient'), 'Patient share URL should preserve audience mode');
assertNoPatientTechnicalLeak('Patient Summary', patient.summaryText);
assertNoPatientTechnicalLeak('Patient Overview', patient.findingText);
assertNoPatientTechnicalLeak('Patient Copy Summary', patient.overviewHandoffText);
assertNoPatientTechnicalLeak('Patient Chrome', `${patient.tagline} ${patient.searchPlaceholder} ${patient.listTitle} ${patient.geneTitle} ${patient.geneIntro}`);
assertNoPatientFooterLeak('Patient Overview', patient.findingText);
assertNoUnsafeCertainty('Patient Overview', patient.findingText);
assertNoInternalLeak('Patient Overview', patient.findingText);

const patientSingleWindow = await loadPage('http://localhost/index.html?substances=mystery-mix&audience=patient&tab=overview');
const patientSingle = patientSingleWindow.eval(`(() => ({
  activeStack,
  findingDisplay:document.getElementById('findingSection')?.style.display || '',
  summaryJumpCount:document.querySelectorAll('#summaryBar .summary-jump').length,
  summaryText:document.getElementById('summaryBar')?.textContent || '',
}))()`);

assert(patientSingle.activeStack.join('|') === 'Mystery Mix', 'Patient single-item URL should preserve the unrecognized selection');
assert(patientSingle.findingDisplay === 'none', 'Patient single-item mode should hide Safety Notes when no note exists');
assert(patientSingle.summaryJumpCount === 0, 'Patient single-item mode should not show a View note jump to a hidden section');
assert(/Current Check/i.test(patientSingle.summaryText),
  'Patient single-item mode should label the summary as a current check when no safety note exists');
assert(/Add another medicine to check the list/i.test(patientSingle.summaryText),
  'Patient single-item mode should keep the add-another-medicine guidance');
assertNoPatientTechnicalLeak('Patient Single Summary', patientSingle.summaryText);
assertNoUnsafeCertainty('Patient Single Summary', patientSingle.summaryText);

const unknownUrlWindow = await loadPage('http://localhost/index.html?substances=warfarin,mystery-mix&audience=patient&tab=overview');
const unknownUrl = unknownUrlWindow.eval(`(() => ({
  activeStack,
  medListText:document.getElementById('medList')?.textContent || '',
  scopeDisplay:document.getElementById('scopeSection')?.style.display || '',
  scopeText:document.getElementById('scopeBody')?.textContent || '',
  unknownChips:document.querySelectorAll('#medList .med-chip.unrecognized').length,
  overviewHandoffText:buildOverviewHandoffText(),
  shareUrl:currentStackShareUrl(),
}))()`);

assert(unknownUrl.activeStack.join('|') === 'Warfarin|Mystery Mix',
  'Unknown URL substances should remain visible in the active stack instead of being dropped');
assert(unknownUrl.unknownChips === 1, 'Unknown URL substances should render as unrecognized selected chips');
assert(/Mystery Mix|Not checked here/i.test(unknownUrl.medListText),
  'Unknown URL substance chip should clearly show what was not checked');
assert(unknownUrl.scopeDisplay === 'none' && !normalizedText(unknownUrl.scopeText),
  'Unknown URL Patient mode should keep the clinician Review Scope panel hidden');
assert(/Mystery Mix/i.test(unknownUrl.overviewHandoffText),
  'Unknown URL substance should be preserved in the patient copy summary');
assert(/Not checked here|Confirm spelling/i.test(unknownUrl.overviewHandoffText),
  'Unknown URL patient copy summary should explain the unrecognized item boundary');
assert(/Do not start, stop, or change medication/i.test(unknownUrl.overviewHandoffText),
  'Unknown URL patient copy summary should preserve medication-change boundaries');
assert(unknownUrl.shareUrl.includes('warfarin,mystery-mix') && unknownUrl.shareUrl.includes('audience=patient'),
  'Share URL should preserve known and unknown substances plus patient audience mode');
assertNoPatientTechnicalLeak('Unknown URL Patient Copy Summary', unknownUrl.overviewHandoffText);
assertNoUnsafeCertainty('Unknown URL Patient Copy Summary', unknownUrl.overviewHandoffText);

const manualUnknownWindow = await loadPage('http://localhost/index.html?audience=patient');
const manualUnknown = manualUnknownWindow.eval(`(() => {
  onSearch('mystery mix');
  const searchText = document.getElementById('searchResults')?.textContent || '';
  addUnrecognizedSubstance('mystery mix');
  addDrug('Warfarin');
  return {
    activeStack,
    searchText,
    medListText:document.getElementById('medList')?.textContent || '',
    scopeDisplay:document.getElementById('scopeSection')?.style.display || '',
    scopeText:document.getElementById('scopeBody')?.textContent || '',
    unknownChips:document.querySelectorAll('#medList .med-chip.unrecognized').length,
    overviewHandoffText:buildOverviewHandoffText(),
    shareUrl:currentStackShareUrl(),
  };
})()`);

assert(/Mystery Mix|Add unrecognized|will not assess interactions/i.test(manualUnknown.searchText),
  'Manual no-match search should offer an explicit add-as-unrecognized action');
assert(manualUnknown.activeStack.join('|') === 'Mystery Mix|Warfarin',
  'Manual unknown entry should remain visible in the active stack with recognized medications');
assert(manualUnknown.unknownChips === 1 && /Mystery Mix|Not checked here/i.test(manualUnknown.medListText),
  'Manual unknown entry should render as an unrecognized selected chip');
assert(manualUnknown.scopeDisplay === 'none' && !normalizedText(manualUnknown.scopeText),
  'Manual unknown Patient mode should keep the clinician Review Scope panel hidden');
assert(/Mystery Mix/i.test(manualUnknown.overviewHandoffText),
  'Manual unknown entry should be named in the patient copy summary');
assert(/Not checked here|Confirm spelling/i.test(manualUnknown.overviewHandoffText),
  'Manual unknown patient copy summary should explain the unrecognized item boundary');
assert(manualUnknown.shareUrl.includes('mystery-mix') && manualUnknown.shareUrl.includes('warfarin'),
  'Manual unknown entry should be preserved in share links');
assertNoPatientTechnicalLeak('Manual Unknown Patient Copy Summary', manualUnknown.overviewHandoffText);
assertNoUnsafeCertainty('Manual Unknown Patient Copy Summary', manualUnknown.overviewHandoffText);

const noSignalUnknownWindow = await loadPage('http://localhost/index.html?substances=mystery-mix,unknown-herb&audience=patient&tab=overview');
const noSignalUnknown = noSignalUnknownWindow.eval(`(() => ({
  activeStack,
  cards:document.querySelectorAll('#findingBody .primary-finding-card').length,
  findingText:document.getElementById('findingBody')?.textContent || '',
  scopeDisplay:document.getElementById('scopeSection')?.style.display || '',
  scopeText:document.getElementById('scopeBody')?.textContent || '',
  summaryText:document.getElementById('summaryBar')?.textContent || '',
  overviewHandoffText:buildOverviewHandoffText(),
  shareUrl:currentStackShareUrl(),
}))()`);

assert(noSignalUnknown.activeStack.join('|') === 'Mystery Mix|Unknown Herb',
  'No-signal unknown-only URL should preserve both unrecognized selections');
assert(noSignalUnknown.cards === 0, 'Unknown-only no-signal scenario should not render public finding cards');
assert(/No major safety note found here|does not prove the list is safe|Still check|Not assessed here: Mystery Mix, Unknown Herb/i.test(noSignalUnknown.findingText),
  'Patient no-signal state should render bounded plain-language next steps');
assert(!/No interaction findings|Evidence, genetics, metabolite/i.test(noSignalUnknown.findingText),
  'Patient no-signal state should not show the old technical empty message');
assert(noSignalUnknown.scopeDisplay === 'none' && !normalizedText(noSignalUnknown.scopeText),
  'Patient no-signal mode should keep the clinician Review Scope panel hidden');
assert(/Mystery Mix/i.test(noSignalUnknown.overviewHandoffText) && /Unknown Herb/i.test(noSignalUnknown.overviewHandoffText),
  'Patient no-signal copy summary should preserve unknown items');
assert(/quiet result here does not prove the list is safe|does not prove the list is safe/i.test(noSignalUnknown.overviewHandoffText),
  'Patient no-signal copy summary should preserve bounded no-safety language');
assert(/Bring to review/i.test(noSignalUnknown.overviewHandoffText),
  'Patient no-signal copy summary should keep practical review prompts');
assert(noSignalUnknown.shareUrl.includes('mystery-mix,unknown-herb') && noSignalUnknown.shareUrl.includes('audience=patient'),
  'Patient no-signal share URL should preserve unrecognized selections and audience');
assertNoPatientTechnicalLeak('Patient No-Signal Finding', noSignalUnknown.findingText);
assertNoPatientTechnicalLeak('Patient No-Signal Summary', noSignalUnknown.summaryText);
assertNoPatientTechnicalLeak('Patient No-Signal Copy Summary', noSignalUnknown.overviewHandoffText);
assertNoUnsafeCertainty('Patient No-Signal Finding', noSignalUnknown.findingText);

const olderAdultWindow = await loadPage('http://localhost/index.html?substances=amitriptyline,diazepam,diphenhydramine,oxycodone&tab=overview');
const olderAdultDemo = olderAdultWindow.eval(`(() => ({
  activeStack,
  activeTab,
  summaryText:document.getElementById('summaryBar')?.textContent || '',
  findingText:document.getElementById('findingBody')?.textContent || '',
  cards:document.querySelectorAll('#findingBody .primary-finding-card').length,
}))()`);

assert(olderAdultDemo.activeStack.join('|') === 'Amitriptyline|Diazepam|Diphenhydramine|Oxycodone',
  'Older-adult public demo should load the documented four-drug stack');
assert(olderAdultDemo.activeTab === 'overview', 'Older-adult public demo should open Overview');
assert(olderAdultDemo.cards > 0, 'Older-adult public demo should render public finding cards');
assert(/sedation|sleepiness|fall|anticholinergic|burden|Amitriptyline|Diazepam|Diphenhydramine|Oxycodone/i.test(`${olderAdultDemo.summaryText} ${olderAdultDemo.findingText}`),
  'Older-adult public demo should surface the promised burden-oriented safety context');
assert(!/genotype may|CYP2D6 genotype|normal metabolizer/i.test(olderAdultDemo.summaryText),
  'Older-adult public demo summary should not be led by default normal-genotype context');

const structuralWindow = await loadPage('http://localhost/');
const structural = structuralWindow.eval(`(() => ({
  hasReadinessHelper:typeof buildV1ReadinessSnapshot === 'function',
  hasTrustHelper:typeof buildV1FindingTrustContract === 'function',
  hasHandoffHelper:typeof buildV1HandoffSummaryText === 'function',
  hasScopeHelper:typeof buildReviewScopeSummary === 'function',
  patientButton:!!document.getElementById('audience-patient'),
  clinicianButton:!!document.getElementById('audience-clinician'),
  remoteScripts:[...document.querySelectorAll('script[src]')].map(script => script.getAttribute('src')),
  disclaimer:document.body.textContent || '',
}))()`);

assert(structural.hasReadinessHelper, 'V1 readiness snapshot helper should be bundled');
assert(structural.hasTrustHelper, 'V1 trust contract helper should be bundled');
assert(structural.hasHandoffHelper, 'V1 handoff helper should be bundled');
assert(structural.hasScopeHelper, 'Review Scope helper should be bundled');
assert(structural.patientButton && structural.clinicianButton, 'Audience toggle should be top-level and bundled');
assert(structural.remoteScripts.length === 0, `Static privacy posture should not rely on remote scripts: ${structural.remoteScripts.join(', ')}`);
assert(/not medical advice|No information is uploaded/i.test(normalizedText(structural.disclaimer)),
  'Static disclaimer should retain medical and privacy boundaries');

console.log(`V1 release readiness audit passed: ${clinicianScenarios.length} clinician scenarios, Patient mode boundary, and static readiness surface.`);
