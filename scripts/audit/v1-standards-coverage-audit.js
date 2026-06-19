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

const fullyMapped = standardsReport(await loadWindow('http://localhost/index.html?substances=clopidogrel,omeprazole&genotype=CYP2C19:PM&tab=review'));
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

const partial = standardsReport(await loadWindow('http://localhost/index.html?substances=warfarin,metoprolol&genotype=CYP2C9:IM&tab=review'));
assert(partial.coverage.recognizedDrugCount === 2, 'Warfarin + metoprolol should resolve as two recognized drugs');
assert(partial.coverage.mappedDrugCount >= 1, 'Partial standards case should include at least one RxNorm mapping');
assert(partial.coverage.unmappedDrugCount >= 1, 'Partial standards case should disclose unmapped recognized drugs');
assert(partial.coverage.unmappedSubstances.some(name => /metoprolol/i.test(name)), 'Metoprolol should be disclosed as unmapped until RxNorm row exists');
assert(partial.coverage.markerMappingCount >= 2, 'CYP2C9 IM should expose marker mappings');
assert(partial.coverage.pgxActionCount >= 1, 'Warfarin CYP2C9 case should expose CPIC-linked action context');
assert(/recognized medications mapped to RxNorm/i.test(partial.scopeText), 'Partial Reviewer Console scope should summarize RxNorm coverage');
assert(/lack local RxNorm identity mappings/i.test(partial.scopeText), 'Partial Reviewer Console scope should disclose RxNorm mapping gaps');
assert(/SNOMED CT diagnosis\/symptom mapping is not used/i.test(partial.scopeText), 'Reviewer Console scope should state SNOMED boundary');
assert(/Standards identity:/i.test(partial.handoffText), 'Partial V1 handoff should include standards identity coverage');
assert(partial.readiness.checks.some(check => check.key === 'standards' && check.ok === true),
  'Partial standards disclosure should keep the Standards identity readiness check passing');

console.log('V1 standards coverage audit passed: RxNorm, PGx marker, CPIC action, and standards-gap disclosure are visible.');
