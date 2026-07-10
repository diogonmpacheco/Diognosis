#!/usr/bin/env node
import { readFileSync } from 'fs';
import { JSDOM, VirtualConsole } from 'jsdom';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const html = readFileSync('index.html', 'utf8');

async function loadWindow(url) {
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
  await new Promise(resolveReady => setTimeout(resolveReady, 450));
  assert(browserErrors.length === 0, `V1 standards audit emitted browser errors: ${browserErrors.join('; ')}`);
  return dom.window;
}

function standardsReport(window) {
  return window.eval(`(() => {
    window.history.replaceState(null, '', '/index.html?reviewer=1');
    setAudienceMode('clinician', { render:false });
    renderAll();
    setTab('review');
    const scope = buildReviewScopeSummary(getRenderComputationCache());
    const coverage = buildClinicalStandardsCoverage(activeStack, activeGenotype || {});
    const readiness = buildV1ReadinessSnapshot();
    return {
      activeStack:[...activeStack],
      activeGenotype:{...activeGenotype},
      coverage,
      scope,
      scopeText:document.getElementById('scopeBody')?.textContent || '',
      handoffText:buildV1HandoffSummaryText(),
      readiness,
      readinessText:document.getElementById('v1ReadinessPanel')?.textContent || '',
      pgxActionCards:document.querySelectorAll('#genotypeBody .pgx-action-card').length,
      pgxActionSteps:document.querySelectorAll('#genotypeBody .pgx-action-step').length,
      pgxActionNotes:document.querySelectorAll('#genotypeBody .pgx-action-note').length,
      pgxActionDetails:document.querySelectorAll('#genotypeBody .pgx-action-details').length,
      pgxActionText:document.getElementById('genotypeBody')?.textContent || '',
    };
  })()`);
}

const publicV1Substances = [
  'Allopurinol',
  'Amitriptyline',
  'Azathioprine',
  'Bupropion',
  'Capecitabine',
  'Clarithromycin',
  'Clopidogrel',
  'Codeine',
  'Dapsone',
  'Diazepam',
  'Diphenhydramine',
  'Fluoxetine',
  'Ibuprofen',
  'Irinotecan',
  'Metoprolol',
  'Nebivolol',
  'Omeprazole',
  'Oxycodone',
  'Paroxetine',
  'Primaquine',
  'Rasburicase',
  'Simvastatin',
  'Succinylcholine',
  'Warfarin',
  'Amiodarone',
];

const structuralWindow = await loadWindow('http://localhost/index.html');
const missingPublicMappings = structuralWindow.eval(`(${JSON.stringify(publicV1Substances)}).filter(name => {
  const resolved = resolveUrlDrugName(name) || name;
  return !(getExternalIdentifiersForSubstance(resolved) || []).some(item => item.system === 'RxNorm' && /^\\d+$/.test(String(item.id || '')));
})`);
assert(missingPublicMappings.length === 0, `Public V1 launch/demo substances missing RxNorm mappings: ${missingPublicMappings.join(', ')}`);

const fullyMapped = standardsReport(await loadWindow('http://localhost/index.html#substances=clopidogrel,omeprazole&genotype=CYP2C19:PM&tab=review'));
assert(fullyMapped.coverage.version === 'v1-clinical-standards-coverage-1', 'Standards coverage contract version missing');
assert(fullyMapped.coverage.recognizedDrugCount === 2, 'Clopidogrel + omeprazole should resolve as two recognized drugs');
assert(fullyMapped.coverage.mappedDrugCount === 2, 'Clopidogrel + omeprazole should both have RxNorm mappings');
assert(fullyMapped.coverage.unmappedDrugCount === 0, 'Fully mapped standards case should not report unmapped drugs');
assert(fullyMapped.coverage.markerMappingCount >= 3, 'CYP2C19 PM should expose star-allele/dbSNP marker mappings');
assert(fullyMapped.coverage.pgxActionCount >= 1, 'CYP2C19 clopidogrel case should expose CPIC-linked action context');
assert(fullyMapped.coverage.systemsPresent.includes('RxNorm'), 'Standards systems should include RxNorm');
assert(fullyMapped.coverage.systemsPresent.some(system => /PharmVar|dbSNP/i.test(system)), 'Standards systems should include PGx marker systems');
assert(/Standards coverage: 2\/2 recognized medications mapped to RxNorm/i.test(fullyMapped.scopeText),
  'Reviewer Console scope should summarize fully mapped RxNorm coverage');
assert(/PGx marker identity row/i.test(fullyMapped.scopeText), 'Reviewer Console scope should mention PGx marker identity rows');
assert(/Standards identity: 2\/2 recognized medications mapped to RxNorm/i.test(fullyMapped.handoffText),
  'V1 handoff should include standards identity coverage');
assert(/Standards identity/i.test(fullyMapped.readinessText), 'V1 readiness panel should include Standards identity check');
assert(fullyMapped.readiness.ready === true, 'Fully mapped PGx standards case should remain V1-ready');
assert(fullyMapped.pgxActionCards >= 1, 'Fully mapped PGx case should render CPIC-linked PGx action card');

const betaBlockerMapped = standardsReport(await loadWindow('http://localhost/index.html#substances=warfarin,metoprolol&genotype=CYP2C9:IM&tab=review'));
assert(betaBlockerMapped.coverage.recognizedDrugCount === 2, 'Warfarin + metoprolol should resolve as two recognized drugs');
assert(betaBlockerMapped.coverage.mappedDrugCount === 2, 'Warfarin + metoprolol should both have RxNorm mappings');
assert(betaBlockerMapped.coverage.unmappedDrugCount === 0, 'Metoprolol standards case should not report unmapped drugs');
assert(betaBlockerMapped.coverage.markerMappingCount >= 2, 'CYP2C9 IM should expose marker mappings');
assert(betaBlockerMapped.coverage.pgxActionCount >= 1, 'Warfarin CYP2C9 case should expose CPIC-linked action context');
assert(/Standards coverage: 2\/2 recognized medications mapped to RxNorm/i.test(betaBlockerMapped.scopeText),
  'Reviewer Console scope should summarize the newly mapped Metoprolol case');
assert(/Standards identity: 2\/2 recognized medications mapped to RxNorm/i.test(betaBlockerMapped.handoffText),
  'V1 handoff should include full standards identity coverage for the Metoprolol case');
assert(betaBlockerMapped.readiness.checks.some(check => check.key === 'standards' && check.ok === true),
  'Mapped Metoprolol standards case should keep the Standards identity readiness check passing');

const betaBlockerAction = standardsReport(await loadWindow('http://localhost/index.html#substances=metoprolol&genotype=CYP2D6:PM&tab=review'));
assert(betaBlockerAction.coverage.recognizedDrugCount === 1, 'Metoprolol CPIC action case should resolve as one recognized drug');
assert(betaBlockerAction.coverage.mappedDrugCount === 1, 'Metoprolol CPIC action case should have RxNorm coverage');
assert(betaBlockerAction.coverage.markerMappingCount >= 3, 'Metoprolol CYP2D6 PM case should expose marker identity rows');
assert(betaBlockerAction.coverage.pgxActionCount >= 1, 'Metoprolol CYP2D6 PM case should expose CPIC-linked action context');
assert(betaBlockerAction.pgxActionCards >= 1, 'Metoprolol CYP2D6 PM case should render a PGx action card');
assert(betaBlockerAction.pgxActionSteps === 0 && betaBlockerAction.pgxActionNotes >= 2 && betaBlockerAction.pgxActionDetails >= 1,
  'Metoprolol CYP2D6 PM PGx action card should render compact notes with collapsed source context');
assert(!/What changed|What to review|Boundary/i.test(betaBlockerAction.pgxActionText),
  'Metoprolol CYP2D6 PM PGx action card should not render old labeled step blocks');
assert(/Standards identity: 1\/1 recognized medications mapped to RxNorm/i.test(betaBlockerAction.handoffText),
  'V1 handoff should include full standards identity coverage for the Metoprolol CPIC action case');

const irinotecanMarker = standardsReport(await loadWindow('http://localhost/index.html#substances=irinotecan&genotype=UGT1A1:PM&tab=review'));
assert(irinotecanMarker.coverage.recognizedDrugCount === 1, 'Irinotecan UGT1A1 marker case should resolve as one recognized drug');
assert(irinotecanMarker.coverage.mappedDrugCount === 1, 'Irinotecan UGT1A1 marker case should have RxNorm coverage');
assert(irinotecanMarker.coverage.markerMappingCount >= 2, 'Irinotecan UGT1A1 PM case should expose UGT1A1 marker identity rows');
assert(/PGx marker identity row/i.test(irinotecanMarker.scopeText), 'Reviewer Console scope should mention UGT1A1 marker identity rows');
assert(/Standards identity: 1\/1 recognized medications mapped to RxNorm/i.test(irinotecanMarker.handoffText),
  'V1 handoff should include full standards identity coverage for the UGT1A1 marker case');

const atenololMapped = standardsReport(await loadWindow('http://localhost/index.html#substances=warfarin,atenolol&genotype=CYP2C9:IM&tab=review'));
assert(atenololMapped.coverage.recognizedDrugCount === 2, 'Warfarin + atenolol should resolve as two recognized drugs');
assert(atenololMapped.coverage.mappedDrugCount === 2, 'Warfarin + atenolol should both have RxNorm mappings');
assert(atenololMapped.coverage.unmappedDrugCount === 0, 'Atenolol standards case should not report unmapped drugs after enrichment');
assert(atenololMapped.coverage.markerMappingCount >= 2, 'CYP2C9 IM should expose marker mappings in the Atenolol standards case');
assert(atenololMapped.coverage.pgxActionCount >= 1, 'Warfarin CYP2C9 Atenolol case should expose CPIC-linked action context');
assert(/Standards coverage: 2\/2 recognized medications mapped to RxNorm/i.test(atenololMapped.scopeText),
  'Reviewer Console scope should summarize full RxNorm coverage for the Atenolol case');
assert(/SNOMED CT diagnosis\/symptom mapping is not used/i.test(atenololMapped.scopeText), 'Reviewer Console scope should state SNOMED boundary');
assert(/Standards identity: 2\/2 recognized medications mapped to RxNorm/i.test(atenololMapped.handoffText),
  'V1 handoff should include full standards identity coverage for the Atenolol case');
assert(atenololMapped.readiness.checks.some(check => check.key === 'standards' && check.ok === true),
  'Mapped Atenolol standards case should keep the Standards identity readiness check passing');

console.log('V1 standards coverage audit passed: RxNorm, PGx marker, CPIC action, and SNOMED boundary disclosure are visible.');
