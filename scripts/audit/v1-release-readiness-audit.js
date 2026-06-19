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
      sourceLinks:document.querySelectorAll('#findingBody a.source-link').length,
      sourceActions:document.querySelectorAll('#findingBody .finding-actions .related-finding-btn').length,
      trustChips:document.querySelectorAll('#findingBody .finding-trust-chip').length,
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
  assert(result.sourceLinkedCards > 0, `${scenario.name}: should include at least one source-linked public concern`);
  assert(result.sourceActions > 0, `${scenario.name}: source-linked cards should expose source actions`);
  assert(result.directEligible === 0 || result.sourceLinks > 0, `${scenario.name}: direct PMID/DOI/source-eligible cards need direct source links`);
  assert(result.reviewTiles > 0, `${scenario.name}: Review Summary should render summary tiles`);
  assert(/Selected|Recognized|Concerns|Source-linked|Limit:/i.test(result.scopeText),
    `${scenario.name}: Review Scope should expose coverage and limits`);
  assert(/Diognosis V1 review summary|Review scope|Standards identity|Top concerns|Boundaries|Share link:/i.test(result.handoffText),
    `${scenario.name}: handoff summary missing required sections`);
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
  tabBarDisplay:document.getElementById('tabBar')?.style.display || '',
  findingTitle:document.getElementById('findingTitle')?.textContent || '',
  findingText:document.getElementById('findingBody')?.textContent || '',
  sourceLinks:document.querySelectorAll('#findingBody a.source-link').length,
  supportingDetails:document.querySelectorAll('#findingBody .finding-support-details').length,
  detailButtons:document.querySelectorAll('#findingBody .related-finding-btn.secondary').length,
  riskDisplay:document.getElementById('riskSection')?.style.display || '',
  scopeText:document.getElementById('scopeBody')?.textContent || '',
  shareUrl:currentStackShareUrl(),
}))()`);

assert(patient.audienceMode === 'patient', 'Patient URL should activate Patient mode');
assert(patient.bodyAudience === 'patient', 'Patient mode should mark body data-audience');
assert(patient.activeTab === 'overview', 'Patient mode should force Overview even if URL asks for Review');
assert(patient.tabBarDisplay === 'none', 'Patient mode should hide clinician tab navigation');
assert(patient.findingTitle === 'Safety Notes', 'Patient mode should rename public findings');
assert(/What this means|What to ask/i.test(patient.findingText), 'Patient mode should use plain-language labels');
assert(patient.sourceLinks === 0, 'Patient mode should hide direct clinician source chips');
assert(patient.supportingDetails === 0, 'Patient mode should hide technical supporting detail drawers');
assert(patient.detailButtons === 0, 'Patient mode should hide clinician supporting-detail buttons');
assert(patient.riskDisplay === 'none', 'Patient mode should hide score-style risk panel');
assert(patient.shareUrl.includes('audience=patient'), 'Patient share URL should preserve audience mode');
assert(/No result means no major signal was found here; it does not prove the list is safe/i.test(patient.scopeText),
  'Patient Review Scope should preserve bounded no-safety language');
assertNoUnsafeCertainty('Patient Overview', patient.findingText);
assertNoInternalLeak('Patient Overview', patient.findingText);

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
