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
assert(evalInPage(window, 'MEDCHECK_VERSION.engine') === '0.1.0-alpha.1', 'MEDCHECK_VERSION is not 0.1.0-alpha.1');

const tabLabels = Array.from(doc.querySelectorAll('#tabBar .tab-btn')).map((btn) => btn.textContent.trim());
assert(
  tabLabels.join('|') === 'Overview|Mechanisms|Genes + Metabolites|Timing + Levels|Evidence|Review',
  `Unexpected top-level tabs: ${tabLabels.join('|')}`
);

window.addDrug('Paroxetine');
window.addDrug('Codeine');
await new Promise((resolveReady) => setTimeout(resolveReady, 100));

assert(evalInPage(window, 'activeStack.length') === 2, 'Medication stack did not update');
assert(doc.getElementById('medCount')?.textContent.includes('2'), 'Medication count did not update');
assert(doc.getElementById('tab-overview')?.classList.contains('active'), 'Overview tab should be active by default');
assert(doc.getElementById('findingSection')?.closest('.tab-panel')?.id === 'tab-overview', 'Normalized interaction findings should live under Overview');
assert(doc.getElementById('interSection')?.closest('.tab-panel')?.id === 'tab-review', 'Detailed known interactions should live under Review');
assert(doc.getElementById('comboSection')?.closest('.tab-panel')?.id === 'tab-review', 'Detailed combination alerts should live under Review');
assert(doc.getElementById('graphSection')?.closest('.tab-panel')?.id === 'tab-mechanisms', 'Full network should live under Mechanisms');
assert(doc.getElementById('genotypeSection')?.closest('.tab-panel')?.id === 'tab-genes-metabolites', 'Genotype panel should live under Genes + Metabolites');
assert(doc.getElementById('phenoconversionSection')?.closest('.tab-panel')?.id === 'tab-genes-metabolites', 'Functional Gene Status should live under Genes + Metabolites');
assert(doc.getElementById('activeMoietySection')?.closest('.tab-panel')?.id === 'tab-genes-metabolites', 'Parent-Metabolite Balance should live under Genes + Metabolites');
assert(doc.getElementById('pkSimSection')?.closest('.tab-panel')?.id === 'tab-timing-levels', 'PK simulation should live under Timing + Levels');
assert(doc.getElementById('reviewWorkbenchSection')?.closest('.tab-panel')?.id === 'tab-review', 'Review workbench should live under Review');
assert(doc.getElementById('warningPathSection')?.closest('.tab-panel')?.id === 'tab-review', 'Raw Warning Paths should live under Review');
assert(doc.querySelectorAll('#findingBody .finding-card').length > 0, 'Overview should render normalized finding cards');
assert(doc.querySelectorAll('#findingBody .why-path').length > 0, 'Overview finding cards should render compact why paths');
assert(doc.querySelectorAll('#phenoconversionBody .phenoconversion-card').length > 0, 'Genes + Metabolites should render Functional Gene Status cards');
assert(doc.querySelectorAll('#activeMoietyBody .active-moiety-card').length > 0, 'Genes + Metabolites should render Parent-Metabolite Balance cards');
assert(doc.querySelectorAll('#warningPathBody .warning-path-row').length > 0, 'Review should expose raw warning path rows');

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
assert(findingAudit.first && findingAudit.first.evidenceLadder === null, 'Findings should keep the evidenceLadder placeholder for Action 7');
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
assert(phenoconversionAudit.cyp2d6?.direction === 'reduced', 'Functional Gene Status should show CYP2D6 reduced by Paroxetine');
assert(phenoconversionAudit.cyp2d6?.drivers?.some(driver => driver.actor === 'Paroxetine'), 'CYP2D6 phenoconversion should list Paroxetine as a driver');
assert(phenoconversionAudit.phenoconversionFindingCount > 0, 'Phenoconversion rows should feed the shared Interaction Finding model');

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
assert(evalInPage(window, 'activeTab') === 'review', 'Legacy advanced tab alias should resolve to Review');
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
