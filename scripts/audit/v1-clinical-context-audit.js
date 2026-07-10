#!/usr/bin/env node
import { readFileSync } from 'fs';
import { JSDOM, VirtualConsole } from 'jsdom';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const html = readFileSync('index.html', 'utf8');
const browserErrors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', error => browserErrors.push(error?.message || String(error)));
virtualConsole.on('error', message => browserErrors.push(String(message)));

const dom = new JSDOM(html, {
  runScripts:'dangerously',
  resources:'usable',
  pretendToBeVisual:true,
  virtualConsole,
  url:'http://localhost/index.html#substances=codeine,fluoxetine&genotype=CYP2D6:PM&tab=overview',
});
await new Promise(resolve => setTimeout(resolve, 450));
assert(browserErrors.length === 0, `Clinical context audit emitted browser errors: ${browserErrors.join('; ')}`);
const { window } = dom;

const blank = window.eval(`({
  assessment:getClinicalContextAssessment(),
  shareUrl:currentStackShareUrl('overview'),
  handoff:buildV1HandoffSummaryText(),
})`);
assert(blank.assessment.percent === 0 && blank.assessment.preliminary, 'Blank context must remain explicitly preliminary');
assert(/preliminary review/i.test(window.document.getElementById('summaryBar')?.textContent || ''),
  'Summary must label a context-poor result as preliminary');
assert(/context fit:\s*preliminary/i.test(window.document.querySelector('.finding-trust-strip')?.textContent || ''),
  'Finding trust strip must distinguish preliminary context applicability');
assert(/context still missing/i.test(blank.handoff), 'Blank handoff must enumerate missing clinical context');

window.eval(`
  updateClinicalContextField('regimen', 'Codeine 30 mg by mouth as needed');
  updateClinicalContextField('indications', 'Short-term pain');
  updateClinicalContextField('timing', 'Fluoxetine started 10 days ago');
  updateClinicalContextField('ageBand', '65-74');
  updateClinicalContextField('renalFunction', 'no-known-impairment');
  updateClinicalContextField('hepaticFunction', 'no-known-impairment');
  updateClinicalContextField('pregnancyStatus', 'not-applicable');
  updateClinicalContextField('symptomsStatus', 'new-or-worsening');
  updateClinicalContextField('labsStatus', 'reviewed');
  updateClinicalContextField('allergiesReviewed', true);
`);

const complete = window.eval(`({
  assessment:getClinicalContextAssessment(),
  shareUrl:currentStackShareUrl('overview'),
  handoff:buildV1HandoffSummaryText(),
  state:window.DIOGNOSIS_V1.getState(),
})`);
assert(complete.assessment.percent === 100 && !complete.assessment.preliminary, 'Complete context must reach the supplied-context state');
assert(/context supplied/i.test(window.document.getElementById('summaryBar')?.textContent || ''),
  'Summary must acknowledge substantially supplied context');
assert(/context fit:\s*substantially assessed/i.test(window.document.querySelector('.finding-trust-strip')?.textContent || ''),
  'Finding trust strip must show context applicability separately from mechanistic confidence');
assert(/new or worsening/i.test(window.document.getElementById('clinicalContextStatus')?.textContent || ''),
  'New or worsening symptoms must surface a prompt-review warning');
assert(/Codeine 30 mg by mouth as needed/.test(complete.handoff) && /Context completeness: 100%/.test(complete.handoff),
  'Clinician handoff must include supplied regimen and context completeness');
assert(complete.shareUrl === blank.shareUrl, 'Patient-specific context must not change the share URL');
assert(!/Codeine%2030|clinicalContext|regimen=|indications=|symptomsStatus=/i.test(complete.shareUrl),
  'Share URL must exclude patient-specific context fields and values');
assert(complete.state.clinicalContext.shareLinkIncludesContext === false,
  'Runtime facade must explicitly disclose that context is excluded from share links');

window.eval(`onSearch('met')`);
const searchRows = [...window.document.querySelectorAll('#searchResults .sr-item')];
assert(searchRows.length <= 20, `Broad search must be capped at 20 practical results, found ${searchRows.length}`);
const firstSearchText = searchRows[0]?.textContent || '';
assert(/metformin|metoprolol|methotrexate|metoclopramide|metronidazole|methadone/i.test(firstSearchText),
  `Broad search must lead with a recognizable medicine, got "${firstSearchText.trim()}"`);

window.eval('resetClinicalContext()');
const reset = window.eval('getClinicalContextAssessment()');
assert(reset.percent === 0 && reset.missing.length === reset.total, 'Reset must clear all clinical-context fields');

console.log('V1 clinical context audit passed: preliminary-state labeling, applicability, context-rich handoff, local-only privacy, reset, and bounded search verified.');
