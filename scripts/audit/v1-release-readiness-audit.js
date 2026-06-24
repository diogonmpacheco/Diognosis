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

function assertNoPatientDirectiveLeak(label, text) {
  assert(
    !/\b(?:contraindicated|hold (?:statin|medicine)|dose[-\s]?adjust(?:ed|ment)?|substitut(?:ed|ion)|should be avoided|label-guided|specialist monitoring)\b/i.test(text),
    `${label} exposes clinician-style medication-change directions`
  );
}

function assertNoPatientFooterLeak(label, text) {
  assert(
    !/(?:Technical details remain available in Review|Detailed technical context|pathway, metabolite, timing, and evidence signals|clinical concerns)/i.test(text),
    `${label} exposes clinician-only Overview footer language`
  );
}

function extractProductReadiness(window) {
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
    setTab('mechanisms');
    const mechanismVisibleText = visibleTextForAudit(document.getElementById('tab-mechanisms'));
    setTab('overview');
    const handoffText = typeof buildOverviewHandoffText === 'function'
      ? buildOverviewHandoffText()
      : buildV1HandoffSummaryText();
    return {
      activeTab,
      reviewerMode:typeof isReviewerMode === 'function' ? isReviewerMode() : false,
      handoffText,
      findingText:document.getElementById('findingBody')?.textContent || '',
      mechanismVisibleText,
      reviewButtonDisplay:document.getElementById('tabbtn-review')?.style.display || '',
      reviewPanelDisplay:document.getElementById('tab-review')?.style.display || '',
      reviewText:document.getElementById('reviewSummaryBody')?.textContent || '',
      scopeDisplay:document.getElementById('scopeSection')?.style.display || '',
      scopeText:document.getElementById('scopeBody')?.textContent || '',
      sourceLinks:document.querySelectorAll('#findingBody a.source-link').length,
      sourceActions:document.querySelectorAll('#findingBody .finding-actions .related-finding-btn').length,
      trustChips:document.querySelectorAll('#findingBody .finding-trust-chip').length,
      trustChipText:[...document.querySelectorAll('#findingBody .finding-trust-chip')]
        .map(chip => chip.textContent.replace(/\\s+/g, ' ').trim())
        .join(' | '),
      discussionGuides:document.querySelectorAll('#findingBody .finding-discussion').length,
      monitoringGuides:document.querySelectorAll('#findingBody .finding-monitoring').length,
      summaryActions:document.querySelectorAll('#summaryBar .summary-actions .summary-action-btn').length,
      selectedChips:document.querySelectorAll('#medList .med-chip').length,
      removeButtons:document.querySelectorAll('#medList button.x').length,
      clinicianLayoutCss:[...document.querySelectorAll('style')].some(style => {
        const css = style.textContent || '';
        return css.includes('body[data-audience="clinician"] .input-rail{display:flex}')
          && css.includes('body[data-audience="clinician"] #geneticsSection{order:2}')
          && css.includes('body[data-audience="clinician"] .result-area{order:3}');
      }),
      compactMedListCss:[...document.querySelectorAll('style')].some(style => {
        const css = style.textContent || '';
        return css.includes('.med-chip{display:grid;grid-template-columns:minmax(0,1fr) minmax(90px,128px) 28px')
          && css.includes('.med-chip .x{grid-column:3');
      }),
      cards:document.querySelectorAll('#findingBody .primary-finding-card').length,
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
    url:'http://localhost/index.html?substances=warfarin,amiodarone&audience=clinician&tab=review',
    expected:['Warfarin', 'Amiodarone'],
  },
  {
    name:'Clopidogrel + Omeprazole with CYP2C19 PM',
    url:'http://localhost/index.html?substances=clopidogrel,omeprazole&genotype=CYP2C19:PM&audience=clinician&tab=review',
    expected:['Clopidogrel', 'Omeprazole', 'CYP2C19'],
  },
  {
    name:'Codeine + Fluoxetine with CYP2D6 PM',
    url:'http://localhost/index.html?substances=codeine,fluoxetine&genotype=CYP2D6:PM&audience=clinician&tab=review',
    expected:['Codeine', 'Fluoxetine', 'CYP2D6'],
  },
];

for (const scenario of clinicianScenarios) {
  const window = await loadPage(scenario.url);
  const result = extractProductReadiness(window);
  assert(result.activeTab === 'overview', `${scenario.name}: normal V1 product URLs should open Overview, not reviewer Review`);
  assert(result.reviewerMode === false, `${scenario.name}: normal V1 product URLs should not enable reviewer mode`);
  assert(result.cards > 0, `${scenario.name}: Overview should show public finding cards`);
  assert(result.trustChips >= result.cards, `${scenario.name}: Overview cards should expose trust chips`);
  assert(!/\b(?:pending review action|review needed action|insufficient action)\b/i.test(result.trustChipText),
    `${scenario.name}: trust chips should not expose awkward internal action-status wording`);
  assert(/professional sign-off not claimed|action reviewed|action evidence limited/i.test(result.trustChipText),
    `${scenario.name}: trust chips should use readable clinical-action status copy`);
  assert(result.discussionGuides >= result.cards, `${scenario.name}: Overview cards should expose discussion guides`);
  assert(result.monitoringGuides >= result.cards, `${scenario.name}: Overview cards should expose monitoring focus`);
  assert(result.summaryActions >= 2, `${scenario.name}: Overview summary should expose copy/share actions`);
  assert(result.selectedChips >= 2, `${scenario.name}: selected-list should render selected medications`);
  assert(result.removeButtons === result.selectedChips, `${scenario.name}: selected-list should expose compact remove controls`);
  assert(result.compactMedListCss, `${scenario.name}: selected-list should use compact row styling`);
  assert(result.clinicianLayoutCss, `${scenario.name}: optional gene controls should stay with selected-list inputs before results in Clinician mode`);
  assert(result.sourceLinkedCards > 0, `${scenario.name}: should include at least one source-linked public concern`);
  assert(result.sourceActions > 0, `${scenario.name}: source-linked cards should expose source actions`);
  assert(result.directEligible === 0 || result.sourceLinks > 0, `${scenario.name}: direct PMID/DOI/source-eligible cards need direct source links`);
  assert(result.reviewButtonDisplay === 'none', `${scenario.name}: normal V1 clinician UI should hide reviewer-only console navigation`);
  assert(result.reviewPanelDisplay === 'none', `${scenario.name}: normal V1 clinician UI should hide the reviewer panel`);
  assert(result.scopeDisplay === 'none' && !normalizedText(result.scopeText),
    `${scenario.name}: normal V1 clinician UI should hide reviewer-only console scope`);
  assert(!normalizedText(result.reviewText), `${scenario.name}: normal V1 clinician UI should not render reviewer summary copy`);
  assert(/Diognosis questions to ask|Review this medication list|Top concerns|Boundaries|Share link:/i.test(result.handoffText),
    `${scenario.name}: product handoff summary missing required sections`);
  assert(/Mention or verify|Monitoring focus|Current symptoms|dose changes|last-dose timing|doctor or pharmacist/i.test(result.handoffText),
    `${scenario.name}: product handoff summary missing practical review context`);
  for (const expected of scenario.expected) {
    assert(result.handoffText.includes(expected), `${scenario.name}: handoff should preserve ${expected}`);
  }
  assert(/not medical advice/i.test(result.handoffText), `${scenario.name}: handoff missing not-medical-advice boundary`);
  assert(/Do not start, stop, or change medication/i.test(result.handoffText), `${scenario.name}: handoff missing medication-change boundary`);
  assert(result.shareUrl.includes('substances='), `${scenario.name}: share URL should preserve selected substances`);
  assert(result.handoffText.includes(result.shareUrl), `${scenario.name}: handoff should include generated share URL`);
  assertNoUnsafeCertainty(`${scenario.name} handoff`, result.handoffText);
  assertNoUnsafeCertainty(`${scenario.name} Overview`, result.findingText);
  assertNoInternalLeak(`${scenario.name} Overview`, result.findingText);
  assert(!/\\b(?:Open review|reviewer panel|Raw warning paths|raw signals?|remain available in Review)\\b/i.test(result.mechanismVisibleText),
    `${scenario.name}: normal V1 Mechanisms tab should not expose reviewer-only or raw-path actions`);
  assert(!/Related overview/i.test(result.mechanismVisibleText),
    `${scenario.name}: normal V1 Mechanisms tab should use plain Open finding actions instead of Related overview`);
  assert(/Open finding/i.test(result.mechanismVisibleText),
    `${scenario.name}: normal V1 Mechanisms tab should provide clear Open finding actions`);
  assertNoInternalLeak(`${scenario.name} Mechanisms`, result.mechanismVisibleText);
}

const patientWindow = await loadPage('http://localhost/index.html?substances=warfarin,amiodarone&audience=patient&tab=review');
const patient = patientWindow.eval(`(() => ({
  audienceMode,
  bodyAudience:document.body.dataset.audience,
  activeTab,
  tagline:document.getElementById('audienceTagline')?.textContent || '',
  searchPlaceholder:document.getElementById('searchInput')?.getAttribute('placeholder') || '',
  listTitle:document.getElementById('listTitle')?.textContent || '',
  medCount:document.getElementById('medCount')?.textContent || '',
  geneTitle:document.getElementById('geneSectionTitle')?.textContent || '',
  geneIntro:document.getElementById('geneSectionIntro')?.textContent || '',
  tabBarDisplay:document.getElementById('tabBar')?.style.display || '',
  summaryText:document.getElementById('summaryBar')?.textContent || '',
  summaryRisk:document.querySelector('#summaryBar .summary-risk')?.textContent || '',
  findingTitle:document.getElementById('findingTitle')?.textContent || '',
  findingCount:document.getElementById('findingCount')?.textContent || '',
  findingText:document.getElementById('findingBody')?.textContent || '',
  medListText:document.getElementById('medList')?.textContent || '',
  doseSelects:document.querySelectorAll('#medList .dose-select').length,
  removeButtons:document.querySelectorAll('#medList button.x').length,
  patientLayoutCss:[...document.querySelectorAll('style')].some(style => {
    const css = style.textContent || '';
    return css.includes('body[data-audience="patient"] .input-rail{display:flex}')
      && css.includes('body[data-audience="patient"] #geneticsSection{order:2}')
      && css.includes('body[data-audience="patient"] .result-area{order:3}');
  }),
  exposureSummaryCount:document.querySelectorAll('#medList .exposure-summary').length,
  severityLabels:[...document.querySelectorAll('#findingBody .finding-sev, #findingBody .patient-question-tag')].map(el => el.textContent.trim()),
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
assert(/2 items selected/i.test(patient.medCount), 'Patient mode should use plain selected-item count copy');
assert(!/substances?/i.test(patient.medCount), 'Patient mode selected-list count should not use substance terminology');
assert(patient.doseSelects === 0, 'Patient mode selected list should not expose clinician dose-tier selectors');
assert(patient.removeButtons === 2, 'Patient mode selected list should use compact removable item buttons');
assert(patient.patientLayoutCss, 'Patient mode should keep optional gene controls with the list before safety results');
assert(/Gene Results/i.test(patient.geneTitle) && /Do not guess|original report|doctor or pharmacist/i.test(patient.geneIntro),
  'Patient mode should use patient-facing gene helper copy');
assert(!/Genes \+ Metabolites tab|source-linked|parent drugs|PK timing|pathway activity|metabolite balance/i.test(
  `${patient.tagline} ${patient.geneIntro}`
), 'Patient chrome should not refer to hidden clinician tabs or technical tagline language');
assert(patient.tabBarDisplay === 'none', 'Patient mode should hide clinician tab navigation');
assert(patient.summaryRisk.trim() === '', 'Patient mode should hide score-style summary badges');
assert(patient.findingTitle === 'Safety Notes', 'Patient mode should rename public findings');
assert(/safety notes?/i.test(patient.findingCount), 'Patient mode should label public finding count as safety notes');
assert(patient.exposureSummaryCount === 0, 'Patient mode should hide technical exposure summary rows from the selected list');
assert(/What to ask|Why this came up/i.test(patient.findingText), 'Patient mode should use plain-language labels');
assert(/Question to ask|Can you check/i.test(patient.findingText), 'Patient mode should expose a plain-language discussion question');
assert(/Safety notes group related concerns|doctor or pharmacist/i.test(patient.findingText), 'Patient mode should use a plain-language Safety Notes footer');
assert(patient.discussionGuides > 0, 'Patient mode should render discussion guides on safety notes');
assert(patient.monitoringGuides > 0, 'Patient mode should render plain-language mention-if-present guidance');
assert(patient.summaryActions >= 2, 'Patient mode should expose top-level copy/share actions');
assert(patient.scopeDisplay === 'none', 'Patient mode should hide the reviewer-only console scope panel');
assert(!normalizedText(patient.scopeText), 'Patient mode should not render hidden reviewer console scope copy');
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
assertNoPatientTechnicalLeak('Patient Selected List', patient.medListText);
assertNoPatientDirectiveLeak('Patient Summary', patient.summaryText);
assertNoPatientDirectiveLeak('Patient Overview', patient.findingText);
assertNoPatientDirectiveLeak('Patient Copy Summary', patient.overviewHandoffText);
assertNoPatientFooterLeak('Patient Overview', patient.findingText);
assertNoUnsafeCertainty('Patient Overview', patient.findingText);
assertNoInternalLeak('Patient Overview', patient.findingText);

const patientGeneWindow = await loadPage('http://localhost/index.html?substances=clopidogrel,omeprazole&genotype=CYP2C19:PM&audience=patient&tab=overview');
const patientGene = patientGeneWindow.eval(`(() => ({
  audienceMode,
  activeStack,
  summaryText:document.getElementById('summaryBar')?.textContent || '',
  findingText:document.getElementById('findingBody')?.textContent || '',
  medListText:document.getElementById('medList')?.textContent || '',
  doseSelects:document.querySelectorAll('#medList .dose-select').length,
  exposureSummaryCount:document.querySelectorAll('#medList .exposure-summary').length,
  cards:document.querySelectorAll('#findingBody .primary-finding-card, #findingBody .patient-question-card').length,
}))()`);

assert(patientGene.audienceMode === 'patient', 'Patient gene-result scenario should keep Patient mode active');
assert(patientGene.activeStack.join('|') === 'Clopidogrel|Omeprazole',
  'Patient gene-result scenario should preserve selected medicines');
assert(patientGene.cards > 0, 'Patient gene-result scenario should still render Safety Notes');
assert(patientGene.doseSelects === 0,
  'Patient gene-result scenario should not expose clinician dose-tier selectors');
assert(patientGene.exposureSummaryCount === 0,
  'Patient gene-result scenario should hide technical selected-list exposure rows');
assert(!/\b(?:AUC|Cmax|metabolite-level|active thiol|CYP\d|clearance|confidence|parent\s+[↑↓]|direction only)\b/i.test(patientGene.medListText),
  'Patient gene-result selected list should not expose technical metabolite/level rows');
assertNoPatientTechnicalLeak('Patient Gene Summary', patientGene.summaryText);
assertNoPatientTechnicalLeak('Patient Gene Overview', patientGene.findingText);
assertNoPatientTechnicalLeak('Patient Gene Selected List', patientGene.medListText);
assertNoPatientDirectiveLeak('Patient Gene Summary', patientGene.summaryText);
assertNoPatientDirectiveLeak('Patient Gene Overview', patientGene.findingText);
assertNoUnsafeCertainty('Patient Gene Overview', patientGene.findingText);

const patientCodeineWindow = await loadPage('http://localhost/index.html?substances=codeine,fluoxetine&genotype=CYP2D6:PM&audience=patient&tab=overview');
const patientCodeine = patientCodeineWindow.eval(`(() => ({
  findingText:document.getElementById('findingBody')?.textContent || '',
  overviewHandoffText:buildOverviewHandoffText(),
  cards:document.querySelectorAll('#findingBody .primary-finding-card, #findingBody .patient-question-card').length,
}))()`);

assert(patientCodeine.cards > 0, 'Patient codeine/CYP2D6 scenario should still render Safety Notes');
assert(/Codeine may work less well|medicine may work less well|pain control|symptom control/i.test(
  `${patientCodeine.findingText} ${patientCodeine.overviewHandoffText}`
), 'Patient codeine/CYP2D6 scenario should describe reduced medicine effect in plain language');
assert(!/antiplatelet|clot-related|clotting monitoring/i.test(
  `${patientCodeine.findingText} ${patientCodeine.overviewHandoffText}`
), 'Patient codeine/CYP2D6 scenario should not borrow antiplatelet or clotting language');
assertNoPatientTechnicalLeak('Patient Codeine Overview', patientCodeine.findingText);
assertNoPatientDirectiveLeak('Patient Codeine Overview', patientCodeine.findingText);
assertNoUnsafeCertainty('Patient Codeine Overview', patientCodeine.findingText);

const patientContraindicatedWindow = await loadPage('http://localhost/index.html?substances=simvastatin,clarithromycin&audience=patient&tab=overview');
const patientContraindicated = patientContraindicatedWindow.eval(`(() => ({
  summaryText:document.getElementById('summaryBar')?.textContent || '',
  findingText:document.getElementById('findingBody')?.textContent || '',
  overviewHandoffText:buildOverviewHandoffText(),
  cards:document.querySelectorAll('#findingBody .primary-finding-card, #findingBody .patient-question-card').length,
}))()`);

assert(patientContraindicated.cards > 0, 'Patient contraindicated-source scenario should still render Safety Notes');
assert(/concern using|different plan|doctor or pharmacist/i.test(
  `${patientContraindicated.summaryText} ${patientContraindicated.findingText}`
), 'Patient contraindicated-source scenario should translate clinician directions into review questions');
assertNoPatientTechnicalLeak('Patient Contraindicated Summary', patientContraindicated.summaryText);
assertNoPatientTechnicalLeak('Patient Contraindicated Overview', patientContraindicated.findingText);
assertNoPatientTechnicalLeak('Patient Contraindicated Copy Summary', patientContraindicated.overviewHandoffText);
assertNoPatientDirectiveLeak('Patient Contraindicated Summary', patientContraindicated.summaryText);
assertNoPatientDirectiveLeak('Patient Contraindicated Overview', patientContraindicated.findingText);
assertNoPatientDirectiveLeak('Patient Contraindicated Copy Summary', patientContraindicated.overviewHandoffText);
assertNoUnsafeCertainty('Patient Contraindicated Overview', patientContraindicated.findingText);

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

const patientEmptyWindow = await loadPage('http://localhost/index.html?audience=patient&tab=review');
const patientEmpty = patientEmptyWindow.eval(`(() => ({
  audienceMode,
  activeTab,
  medListText:document.getElementById('medList')?.textContent || '',
  medCount:document.getElementById('medCount')?.textContent || '',
}))()`);

assert(patientEmpty.audienceMode === 'patient', 'Patient empty start should activate Patient mode');
assert(patientEmpty.activeTab === 'overview', 'Patient empty start should force Overview');
assert(/Add medicines, supplements, or foods above to start a list for your doctor or pharmacist/i.test(patientEmpty.medListText),
  'Patient empty selected-list state should give patient-facing start guidance');
assert(!/interact|substances?/i.test(patientEmpty.medListText),
  'Patient empty selected-list state should avoid clinician-oriented interaction/substance wording');
assert(patientEmpty.medCount.trim() === '', 'Patient empty selected-list state should not show a count');
assertNoPatientTechnicalLeak('Patient Empty Selected List', patientEmpty.medListText);
assertNoUnsafeCertainty('Patient Empty Selected List', patientEmpty.medListText);

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
  'Unknown URL Patient mode should keep the reviewer-only console scope panel hidden');
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
  'Manual unknown Patient mode should keep the reviewer-only console scope panel hidden');
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
  cards:document.querySelectorAll('#findingBody .primary-finding-card, #findingBody .patient-question-card').length,
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
  'Patient no-signal mode should keep the reviewer-only console scope panel hidden');
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
  cards:document.querySelectorAll('#findingBody .primary-finding-card, #findingBody .patient-question-card').length,
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
  audienceMode,
  bodyAudience:document.body.dataset.audience,
  bodyReviewer:document.body.dataset.reviewer,
  patientPressed:document.getElementById('audience-patient')?.getAttribute('aria-pressed') || '',
  clinicianPressed:document.getElementById('audience-clinician')?.getAttribute('aria-pressed') || '',
  tagline:document.getElementById('audienceTagline')?.textContent || '',
  searchPlaceholder:document.getElementById('searchInput')?.getAttribute('placeholder') || '',
  reviewButtonDisplay:document.getElementById('tabbtn-review')?.style.display || '',
  reviewPanelDisplay:document.getElementById('tab-review')?.style.display || '',
  patientButton:!!document.getElementById('audience-patient'),
  clinicianButton:!!document.getElementById('audience-clinician'),
  firstUseOrder:(() => {
    const controls = [
      ['audience', document.querySelector('.audience-wrap')],
      ['mode', document.querySelector('.mode-toggle')],
      ['search', document.querySelector('.search-wrap')],
    ].filter(([, el]) => el);
    return controls
      .sort((a, b) => a[1].compareDocumentPosition(b[1]) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)
      .map(([label]) => label);
  })(),
  modeGroupLabel:document.querySelector('.mode-toggle')?.getAttribute('aria-label') || '',
  modeLabels:[document.getElementById('searchModeBtn')?.textContent?.trim(), document.getElementById('browseModeBtn')?.textContent?.trim()],
  modeTags:[document.getElementById('searchModeBtn')?.tagName, document.getElementById('browseModeBtn')?.tagName],
  modePressed:[document.getElementById('searchModeBtn')?.getAttribute('aria-pressed'), document.getElementById('browseModeBtn')?.getAttribute('aria-pressed')],
  compactChromeCss:[...document.querySelectorAll('style')].some(style => {
    const css = style.textContent || '';
    return css.includes('.mode-toggle{display:grid;grid-template-columns:1fr 1fr')
      && css.includes('.stats-line{display:none}')
      && css.includes('@media(min-width:760px)')
      && css.includes('.summary-story{grid-template-columns:repeat(3,minmax(0,1fr))');
  }),
  browsePressedAfterToggle:(() => {
    setViewMode('browse');
    const state = [document.getElementById('searchModeBtn')?.getAttribute('aria-pressed'), document.getElementById('browseModeBtn')?.getAttribute('aria-pressed')];
    setViewMode('search');
    return state;
  })(),
  remoteScripts:[...document.querySelectorAll('script[src]')].map(script => script.getAttribute('src')),
  disclaimer:document.body.textContent || '',
}))()`);

assert(structural.hasReadinessHelper, 'V1 readiness snapshot helper should be bundled');
assert(structural.hasTrustHelper, 'V1 trust contract helper should be bundled');
assert(structural.hasHandoffHelper, 'V1 handoff helper should be bundled');
assert(structural.hasScopeHelper, 'Reviewer console scope helper should be bundled');
assert(structural.patientButton && structural.clinicianButton, 'Audience toggle should be top-level and bundled');
assert(structural.audienceMode === 'patient' && structural.bodyAudience === 'patient',
  `Default public route should open Patient mode, got ${structural.audienceMode}/${structural.bodyAudience}`);
assert(structural.bodyReviewer === 'standard' && structural.reviewButtonDisplay === 'none' && structural.reviewPanelDisplay === 'none',
  'Default public route should keep Reviewer Console hidden');
assert(structural.patientPressed === 'true' && structural.clinicianPressed === 'false',
  'Default public route should mark Patient as selected');
assert(/doctor or pharmacist/i.test(structural.tagline) && /Search medicines/i.test(structural.searchPlaceholder),
  'Default public route should use patient-facing chrome');
assert(structural.firstUseOrder.join('|').startsWith('audience|mode|search'),
  `Audience toggle should sit above add-mode controls and search; got ${structural.firstUseOrder.join('|')}`);
assert(structural.modeGroupLabel === 'Choose how to add items', 'Search/Browse mode group should describe the add-choice control');
assert(structural.modeLabels.join('|') === 'Search by Name|Browse Categories', 'Search/Browse mode labels should describe add modes, not submit actions');
assert(structural.modeTags.join('|') === 'BUTTON|BUTTON', 'Search/Browse mode controls should be real buttons');
assert(structural.modePressed.join('|') === 'true|false', 'Search/Browse mode controls should expose initial pressed state');
assert(structural.compactChromeCss, 'V1 chrome should keep add-mode controls compact, hide database stats from the work surface, and compact summary layout on wide screens');
assert(structural.browsePressedAfterToggle.join('|') === 'false|true', 'Browse mode control should expose selected state after toggle');
assert(structural.remoteScripts.length === 0, `Static privacy posture should not rely on remote scripts: ${structural.remoteScripts.join(', ')}`);
assert(/not medical advice|No information is uploaded/i.test(normalizedText(structural.disclaimer)),
  'Static disclaimer should retain medical and privacy boundaries');
assert(!/\bpre-v1\b|research prototype/i.test(normalizedText(structural.disclaimer)),
  'Static disclaimer should describe the active app as current platform scope, not a pre-v1 prototype');

const reviewerIsolationWindow = await loadPage('http://localhost/index.html?audience=patient&reviewer=1&tab=review');
const reviewerIsolation = reviewerIsolationWindow.eval(`(() => ({
  reviewerMode:typeof isReviewerMode === 'function' ? isReviewerMode() : false,
  audienceMode,
  bodyAudience:document.body.dataset.audience,
  bodyReviewer:document.body.dataset.reviewer,
  activeTab,
  patientPressed:document.getElementById('audience-patient')?.getAttribute('aria-pressed') || '',
  clinicianPressed:document.getElementById('audience-clinician')?.getAttribute('aria-pressed') || '',
  reviewButtonDisplay:document.getElementById('tabbtn-review')?.style.display || '',
  reviewPanelDisplay:document.getElementById('tab-review')?.style.display || '',
  reviewText:document.getElementById('tab-review')?.textContent || '',
}))()`);

assert(reviewerIsolation.reviewerMode === true, 'Reviewer URL should enable reviewer mode');
assert(reviewerIsolation.audienceMode === 'clinician' && reviewerIsolation.bodyAudience === 'clinician',
  'Reviewer URL should force the clinician-style surface instead of mixing with Patient mode');
assert(reviewerIsolation.bodyReviewer === 'reviewer', 'Reviewer URL should mark the body as reviewer mode');
assert(reviewerIsolation.activeTab === 'review', 'Reviewer URL should open the Reviewer Console tab');
assert(reviewerIsolation.patientPressed === 'false' && reviewerIsolation.clinicianPressed === 'true',
  'Reviewer URL should not leave Patient selected');
assert(reviewerIsolation.reviewButtonDisplay !== 'none' && reviewerIsolation.reviewPanelDisplay !== 'none',
  'Reviewer URL should expose the Reviewer Console only in reviewer mode');
assert(/Reviewer Console|Reviewer Summary/i.test(reviewerIsolation.reviewText),
  'Reviewer URL should render reviewer-only console content inside the Review tab');

console.log(`V1 release readiness audit passed: ${clinicianScenarios.length} clinician scenarios, Patient mode boundary, and static readiness surface.`);
