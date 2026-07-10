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
  url:'http://localhost/index.html#substances=codeine,fluoxetine&genotype=CYP2D6:PM&tab=evidence',
});
await new Promise(resolve => setTimeout(resolve, 450));
assert(browserErrors.length === 0, `Authority evidence audit emitted browser errors: ${browserErrors.join('; ')}`);
const { window } = dom;

const report = window.eval(`(() => {
  const studies = Object.values(STUDY_DB || {});
  const modeled = studies.filter(isModeledContextEvidence);
  const authority = studies.filter(isAuthorityEvidence);
  const primary = studies.filter(isPrimaryLiteratureEvidence);
  const adapterIds = modeled.map(study => study.id).filter(id => /adapter|expansion|phase/i.test(id));
  const adapterViolations = modeled.filter(study => study.public !== false || study.notSeverityBearing !== true || isSeverityBearingEvidence(study));
  const adapterOnlyRows = (KNOWN_DDI || []).filter(row => {
    const refs = (row.evidenceRefs || []).map(getStudy).filter(Boolean);
    return refs.length > 0 && refs.every(isModeledContextEvidence);
  });
  const adapterOnlyStillSevere = adapterOnlyRows.filter(row => ['severe', 'critical'].includes(calibrateDdiSeverity(row)));
  const authorityPgxActions = (PGX_ACTION_SUMMARIES || []).filter(row => (row.authorityEvidenceRefs || []).length > 0);
  return {
    authorityCount:authority.length,
    primaryCount:primary.length,
    modeledCount:modeled.length,
    adapterIds,
    adapterViolations:adapterViolations.map(study => study.id),
    adapterOnlyRowCount:adapterOnlyRows.length,
    adapterOnlyStillSevere:adapterOnlyStillSevere.map(row => row.id || (row.drugs || []).join('+')).slice(0,20),
    authorityPgxActionCount:authorityPgxActions.length,
    fluoxetineUrl:publicEvidenceReferenceUrl('ev_fluoxetine_cyp2d6_fda'),
    fdaAssociationClass:evidenceProvenanceClass(STUDY_DB.ev_fda_pharmacogenetic_associations_2026),
    adapterLabel:evidenceProvenanceLabel(STUDY_DB.ev_ddi_expansion_pack_adapter),
  };
})()`);

assert(report.authorityCount >= 200, `Expected at least 200 authority-source entries, found ${report.authorityCount}`);
assert(report.primaryCount >= 200, `Expected at least 200 primary-literature entries, found ${report.primaryCount}`);
assert(report.adapterIds.length >= 8, 'Expected the known internal adapter families to be classified as modeled context');
assert(report.adapterViolations.length === 0, `Modeled adapters violated public/severity boundary: ${report.adapterViolations.join(', ')}`);
assert(report.adapterOnlyRowCount > 0, 'Expected to exercise adapter-only DDI rows');
assert(report.adapterOnlyStillSevere.length === 0, `Adapter-only rows still preserve severe output: ${report.adapterOnlyStillSevere.join(', ')}`);
assert(report.authorityPgxActionCount >= 16, `Expected at least 16 PGx actions with an FDA authority source, found ${report.authorityPgxActionCount}`);
assert(/dailymed\.nlm\.nih\.gov\/dailymed\/drugInfo\.cfm/i.test(report.fluoxetineUrl), 'Fluoxetine authority link must resolve to the exact DailyMed label, not a DOI');
assert(report.fdaAssociationClass === 'authority_source', 'FDA pharmacogenetic table must be classified as an authority source');
assert(/modeled context/i.test(report.adapterLabel), 'Internal adapter label must state modeled context');

const evidenceText = window.document.getElementById('evidenceBody')?.textContent || '';
assert(/authority source/i.test(evidenceText), 'Public evidence panel must explain or display authority sources');
assert(/no independent professional sign-off/i.test(evidenceText), 'Public evidence panel must disclose the absence of independent sign-off');

console.log(`V1 authority evidence audit passed: ${report.authorityCount} authority sources, ${report.primaryCount} primary-literature sources, ${report.adapterOnlyRowCount} adapter-only DDI rows quarantined.`);
