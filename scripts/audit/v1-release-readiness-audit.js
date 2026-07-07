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

function extractPublicReadiness(window) {
  return window.eval(`(() => {
    function isVisibleForAudit(el) {
      for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden' || node.hidden) return false;
      }
      return true;
    }
    function visibleTextForAudit(root) {
      if (!root) return '';
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const out = [];
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const text = String(node.nodeValue || '').replace(/\\s+/g, ' ').trim();
        if (text && isVisibleForAudit(node.parentElement)) out.push(text);
      }
      return out.join(' ').replace(/\\s+/g, ' ').trim();
    }
    const tabText = {};
    for (const tab of ['mechanisms', 'genes-metabolites', 'timing-levels', 'evidence']) {
      setTab(tab);
      tabText[tab] = visibleTextForAudit(document.getElementById('tab-' + tab));
    }
    setTab('overview');
    const stateBefore = window.DIOGNOSIS_V1?.getState ? window.DIOGNOSIS_V1.getState() : null;
    window.DIOGNOSIS_V1?.setAudience?.('plain');
    const stateAfter = window.DIOGNOSIS_V1?.getState ? window.DIOGNOSIS_V1.getState() : null;
    const handoffText = typeof buildOverviewHandoffText === 'function'
      ? buildOverviewHandoffText()
      : buildV1HandoffSummaryText();
    return {
      activeTab,
      locationSearch:window.location.search,
      audienceMode,
      bodyAudience:document.body.dataset.audience || '',
      bodyReviewer:document.body.dataset.reviewer || '',
      reviewerMode:typeof isReviewerMode === 'function' ? isReviewerMode() : false,
      tagline:document.getElementById('audienceTagline')?.textContent || '',
      searchPlaceholder:document.getElementById('searchInput')?.getAttribute('placeholder') || '',
      listTitle:document.getElementById('listTitle')?.textContent || '',
      geneIntro:document.getElementById('geneSectionIntro')?.textContent || '',
      findingTitle:document.getElementById('findingTitle')?.textContent || '',
      findingCount:document.getElementById('findingCount')?.textContent || '',
      findingText:document.getElementById('findingBody')?.textContent || '',
      summaryText:document.getElementById('summaryBar')?.textContent || '',
      medListText:document.getElementById('medList')?.textContent || '',
      selectedChips:document.querySelectorAll('#medList .med-chip').length,
      unrecognizedChips:document.querySelectorAll('#medList .med-chip.unrecognized').length,
      removeButtons:document.querySelectorAll('#medList button.x').length,
      doseSelects:document.querySelectorAll('#medList .dose-select').length,
      primaryCards:document.querySelectorAll('#findingBody .primary-finding-card').length,
      plainQuestionCards:document.querySelectorAll('#findingBody .plain-question-card').length,
      findingNotes:document.querySelectorAll('#findingBody .primary-finding-card .finding-note').length,
      actorRows:document.querySelectorAll('#findingBody .primary-finding-card .finding-actors').length,
      oldOverviewLabels:/Plain-language questions|Start here, then use the detailed review below|What changed|Why it matters|Review focus/i.test(document.getElementById('findingBody')?.textContent || ''),
      sourceLinks:document.querySelectorAll('#findingBody a.source-link').length,
      sourceActions:document.querySelectorAll('#findingBody .finding-actions .related-finding-btn').length,
      supportDetails:document.querySelectorAll('#findingBody .finding-support-details').length,
      discussionGuides:document.querySelectorAll('#findingBody .finding-discussion').length,
      monitoringGuides:document.querySelectorAll('#findingBody .finding-monitoring').length,
      trustChips:document.querySelectorAll('#findingBody .finding-trust-chip').length,
      trustChipHeadingCount:document.querySelectorAll('#findingBody .finding-trust-chip strong').length,
      trustChipText:[...document.querySelectorAll('#findingBody .finding-trust-chip')]
        .map(chip => chip.textContent.replace(/\\s+/g, ' ').trim())
        .join(' | '),
      summaryActions:document.querySelectorAll('#summaryBar .summary-actions .summary-action-btn').length,
      reviewButtonDisplay:document.getElementById('tabbtn-review')?.style.display || '',
      reviewPanelDisplay:document.getElementById('tab-review')?.style.display || '',
      reviewText:document.getElementById('tab-review')?.textContent || '',
      scopeDisplay:document.getElementById('scopeSection')?.style.display || '',
      scopeText:document.getElementById('scopeBody')?.textContent || '',
      patientButton:!!document.getElementById('audience-patient'),
      clinicianButton:!!document.getElementById('audience-clinician'),
      audienceWrap:!!document.querySelector('.audience-wrap'),
      dataAudienceCss:[...document.querySelectorAll('style')].some(style => /body\\[data-audience=/i.test(style.textContent || '')),
      remoteScripts:[...document.querySelectorAll('script[src]')].map(script => script.getAttribute('src')),
      shareUrl:currentStackShareUrl('overview'),
      handoffText,
      tabText,
      stateBefore,
      stateAfter,
      bodyText:document.body.textContent || '',
    };
  })()`);
}

const publicScenarios = [
  {
    name:'Warfarin + Amiodarone legacy plain URL',
    url:'http://localhost/index.html?substances=warfarin,amiodarone&audience=patient&tab=review',
    expected:['Warfarin', 'Amiodarone'],
  },
  {
    name:'Clopidogrel + Omeprazole with CYP2C19 PM legacy detailed URL',
    url:'http://localhost/index.html?substances=clopidogrel,omeprazole&genotype=CYP2C19:PM&audience=detailed&tab=review',
    expected:['Clopidogrel', 'Omeprazole', 'CYP2C19'],
  },
  {
    name:'Codeine + Fluoxetine with CYP2D6 PM legacy clinician URL',
    url:'http://localhost/index.html?substances=codeine,fluoxetine&genotype=CYP2D6:PM&audience=clinician&tab=review',
    expected:['Codeine', 'Fluoxetine', 'CYP2D6'],
  },
];

for (const scenario of publicScenarios) {
  const window = await loadPage(scenario.url);
  const result = extractPublicReadiness(window);
  assert(result.activeTab === 'overview', `${scenario.name}: normal product URLs should open Overview, not Reviewer Console`);
  assert(result.reviewerMode === false, `${scenario.name}: normal product URLs should not enable reviewer mode`);
  assert(result.audienceMode === 'public' && !result.bodyAudience, `${scenario.name}: legacy audience params should resolve to the public view`);
  assert(!result.patientButton && !result.clinicianButton && !result.audienceWrap, `${scenario.name}: Plain/Detailed controls should not be bundled`);
  assert(!result.dataAudienceCss, `${scenario.name}: public view should not depend on body[data-audience] CSS`);
  assert(!/audience=/i.test(`${result.locationSearch} ${result.shareUrl} ${result.handoffText}`),
    `${scenario.name}: generated, share, and handoff URLs should strip legacy audience params`);
  assert(/Medication review with plain questions, mechanisms, timing, genes, and source-linked evidence/i.test(result.tagline),
    `${scenario.name}: public tagline should describe the single Medication Review surface`);
  assert(/Medication, supplement, or food/i.test(result.searchPlaceholder), `${scenario.name}: search placeholder should stay canonical`);
  assert(result.listTitle === 'Medicine List', `${scenario.name}: selected list should be Medicine List`);
  assert(result.selectedChips >= 2, `${scenario.name}: selected medicines should render`);
  assert(result.removeButtons === result.selectedChips, `${scenario.name}: selected medicines should remain removable`);
  assert(result.doseSelects > 0, `${scenario.name}: dose selectors should remain available where supported`);
  assert(result.primaryCards > 0, `${scenario.name}: Overview should show detailed public priority cards`);
  assert(result.plainQuestionCards > 0, `${scenario.name}: Overview should show direct question cards`);
  assert(result.findingTitle === 'Review Priorities', `${scenario.name}: Overview should use Review Priorities`);
  assert(/review priorit/i.test(result.findingCount), `${scenario.name}: finding count should use review-priority language`);
  assert(result.findingNotes >= 2, `${scenario.name}: Overview should include compact unlabeled review notes`);
  assert(result.actorRows === 0, `${scenario.name}: Overview should not duplicate medicines as extra chip rows`);
  assert(!result.oldOverviewLabels, `${scenario.name}: Overview should not render the old question header or step labels`);
  assert(result.trustChips >= result.primaryCards, `${scenario.name}: priority cards should expose evidence/status chips`);
  assert(result.trustChipHeadingCount === 0,
    `${scenario.name}: trust chips should not use label/value headings`);
  assert(/Source-linked|Modeled/i.test(result.trustChipText) && /confidence/i.test(result.trustChipText),
    `${scenario.name}: trust chips should use concise evidence and confidence values`);
  assert(result.discussionGuides >= result.primaryCards, `${scenario.name}: priority cards should expose discussion guides`);
  assert(result.monitoringGuides >= result.primaryCards, `${scenario.name}: priority cards should expose monitoring focus`);
  assert(result.sourceActions > 0 || result.sourceLinks > 0, `${scenario.name}: source-linked evidence actions should remain reachable`);
  assert(result.supportDetails > 0, `${scenario.name}: supporting detail should remain reachable`);
  assert(result.summaryActions >= 2, `${scenario.name}: summary should expose copy/share actions`);
  assert(result.reviewButtonDisplay === 'none' && result.reviewPanelDisplay === 'none',
    `${scenario.name}: Reviewer Console should stay hidden outside reviewer mode`);
  assert(result.scopeDisplay === 'none' && !normalizedText(result.scopeText),
    `${scenario.name}: reviewer-only scope panel should stay hidden`);
  assert(/Open finding/i.test(result.tabText.mechanisms), `${scenario.name}: Mechanisms tab should remain reachable`);
  assert(/Gene|Metabolite|CYP|marker/i.test(result.tabText['genes-metabolites']), `${scenario.name}: Genes + Metabolites tab should remain reachable`);
  assert(/Timing|Level|AUC|Cmax|Persistence|exposure/i.test(result.tabText['timing-levels']), `${scenario.name}: Timing + Levels tab should remain reachable`);
  assert(/Evidence|source|PMID|DOI|label|guideline/i.test(result.tabText.evidence), `${scenario.name}: Evidence tab should remain reachable`);
  assert(/Diognosis V1 handoff summary|Handoff type: clinician\/pharmacist medication-review handoff|V1 scope|Top concerns|Boundaries/i.test(result.handoffText),
    `${scenario.name}: public handoff summary missing required sections`);
  assert(/not medical advice/i.test(result.handoffText), `${scenario.name}: handoff missing not-medical-advice boundary`);
  assert(/Do not start, stop, or change medication/i.test(result.handoffText), `${scenario.name}: handoff missing medication-change boundary`);
  for (const expected of scenario.expected) {
    assert(result.handoffText.includes(expected), `${scenario.name}: handoff should preserve ${expected}`);
  }
  assert(result.stateBefore?.audience === 'public' && result.stateAfter?.audience === 'public',
    `${scenario.name}: DIOGNOSIS_V1 audience should stay public before and after deprecated setAudience`);
  assertNoUnsafeCertainty(`${scenario.name} handoff`, result.handoffText);
  assertNoUnsafeCertainty(`${scenario.name} Overview`, result.findingText);
  assertNoInternalLeak(`${scenario.name} Overview`, result.findingText);
}

const unknownWindow = await loadPage('http://localhost/index.html?substances=warfarin,mystery-mix&audience=plain&tab=overview');
const unknown = extractPublicReadiness(unknownWindow);
assert(unknown.audienceMode === 'public' && !unknown.bodyAudience, 'Unknown legacy URL should still use the public view');
assert(unknown.selectedChips === 2 && unknown.unrecognizedChips === 1, 'Unknown selections should stay visible beside recognized medicines');
assert(/Mystery Mix|Not checked here/i.test(unknown.medListText), 'Unknown chip should clearly show the not-checked-here boundary');
assert(/Mystery Mix/i.test(unknown.handoffText), 'Unknown item should be preserved in the handoff summary');
assert(/not recognized by the local dataset|Unrecognized selections/i.test(unknown.handoffText), 'Unknown handoff should explain the unrecognized-item boundary');
assert(!/audience=/i.test(`${unknown.locationSearch} ${unknown.shareUrl} ${unknown.handoffText}`), 'Unknown legacy URL should canonicalize away audience params');
assertNoUnsafeCertainty('Unknown public handoff', unknown.handoffText);

const noSignalWindow = await loadPage('http://localhost/index.html?substances=mystery-mix,unknown-herb&audience=patient&tab=overview');
const noSignal = extractPublicReadiness(noSignalWindow);
assert(noSignal.primaryCards === 0, 'Unknown-only no-signal scenario should not render priority cards');
assert(/No major review priority generated|not a safety clearance|A quiet result here does not prove the list is safe|Not checked here/i.test(noSignal.findingText),
  'Unknown-only no-signal state should render bounded public next steps');
assert(/Mystery Mix/i.test(noSignal.handoffText) && /Unknown Herb/i.test(noSignal.handoffText),
  'Unknown-only handoff should preserve unknown items');
assert(/Do not start, stop, or change medication/i.test(noSignal.handoffText), 'Unknown-only handoff should keep medication-change boundaries');
assert(!/audience=/i.test(`${noSignal.locationSearch} ${noSignal.shareUrl} ${noSignal.handoffText}`), 'Unknown-only URL should strip audience params');
assertNoUnsafeCertainty('Unknown-only no-signal finding', noSignal.findingText);

const structuralWindow = await loadPage('http://localhost/');
const structural = extractPublicReadiness(structuralWindow);
assert(structural.audienceMode === 'public' && !structural.bodyAudience, 'Default route should use the public view');
assert(structural.bodyReviewer === 'standard' && structural.reviewButtonDisplay === 'none' && structural.reviewPanelDisplay === 'none',
  'Default route should keep Reviewer Console hidden');
assert(!structural.patientButton && !structural.clinicianButton && !structural.audienceWrap,
  'Default route should not expose Plain/Detailed buttons');
assert(!structural.dataAudienceCss, 'Default route should not bundle audience layout CSS');
assert(structural.stateBefore?.audience === 'public' && structural.stateAfter?.audience === 'public',
  'DIOGNOSIS_V1 should report audience public and keep deprecated setAudience as a no-op');
assert(structural.remoteScripts.length === 0, `Static privacy posture should not rely on remote scripts: ${structural.remoteScripts.join(', ')}`);
assert(/not medical advice|No information is uploaded/i.test(normalizedText(structural.bodyText)),
  'Static disclaimer should retain medical and privacy boundaries');
assert(!/\bpre-v1\b|research prototype/i.test(normalizedText(structural.bodyText)),
  'Static disclaimer should describe the active app as current platform scope');

const reviewerWindow = await loadPage('http://localhost/index.html?substances=warfarin,amiodarone&audience=patient&reviewer=1&tab=review');
const reviewer = extractPublicReadiness(reviewerWindow);
assert(reviewer.reviewerMode === true, 'Reviewer URL should enable reviewer mode');
assert(reviewer.audienceMode === 'public' && !reviewer.bodyAudience, 'Reviewer URL should keep the single public audience state');
assert(reviewer.bodyReviewer === 'reviewer', 'Reviewer URL should mark the body as reviewer mode');
assert(reviewer.activeTab === 'overview', 'Readiness extraction should return to Overview after confirming reviewer tab access');
assert(reviewer.reviewButtonDisplay !== 'none' && reviewer.reviewPanelDisplay !== 'none',
  'Reviewer URL should expose the Reviewer Console only in reviewer mode');
assert(/Reviewer Console|Reviewer Summary/i.test(reviewer.reviewText),
  'Reviewer URL should render reviewer-only console content inside the Review tab');
assert(!reviewer.patientButton && !reviewer.clinicianButton && !reviewer.audienceWrap,
  'Reviewer mode should not restore Plain/Detailed buttons');
assert(!/audience=/i.test(`${reviewer.locationSearch} ${reviewer.shareUrl}`), 'Reviewer legacy URL should strip audience params');

console.log(`V1 release readiness audit passed: ${publicScenarios.length} public scenarios, legacy URL canonicalization, unknown-item boundaries, and reviewer gate.`);
