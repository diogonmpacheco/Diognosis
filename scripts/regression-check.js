#!/usr/bin/env node
import { execFileSync } from 'child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { JSDOM, VirtualConsole } from 'jsdom';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, '.tmp', 'regression-index.html');
const ROOT_INDEX = resolve(ROOT, 'index.html');
const SETUP_BUDGET_MS = 60_000;
const FORCE_REBUILD = process.argv.includes('--rebuild');
const setupStartedAt = Date.now();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNoPatientDirectiveLeak(label, text) {
  assert(
    !/\b(?:contraindicated|hold (?:statin|medicine)|dose[-\s]?adjust(?:ed|ment)?|substitut(?:ed|ion)|should be avoided|label-guided|specialist monitoring)\b/i.test(text),
    `${label} exposes clinician-style medication-change directions`
  );
}

function loadCase(win, drugs) {
  win.eval(`activeStack = [];
    if (typeof setAudienceMode === "function") setAudienceMode("clinician", { render:false });
    if (typeof drugDoses !== "undefined") Object.keys(drugDoses).forEach(k => delete drugDoses[k]);
    userGenetics = {};
    activeGenotypeDetails = {};
    activeGenotype = {
      CYP2D6: GENOTYPE_PHENOTYPE.NM,
      CYP2C19: GENOTYPE_PHENOTYPE.NM,
      CYP2C9: GENOTYPE_PHENOTYPE.NM,
    };`);
  for (const drug of drugs) win.addDrug(drug);
}

function risk(win) {
  return win.eval('calcRisk()');
}

function interactions(win) {
  return risk(win).interactions || [];
}

function hasInteraction(win, expected) {
  return interactions(win).some((i) => {
    const pairMatches =
      (i.drug1 === expected.drug1 && i.drug2 === expected.drug2) ||
      (i.drug1 === expected.drug2 && i.drug2 === expected.drug1);
    return pairMatches &&
      (!expected.severity || i.severity === expected.severity) &&
      (!expected.text || `${i.mechanism} ${i.effect}`.toLowerCase().includes(expected.text.toLowerCase()));
  });
}

function latestMtimeMs(pathname) {
  if (!existsSync(pathname)) return 0;
  if (/[/\\]src[/\\]data[/\\]generated[^/\\]*\.js$/.test(pathname)) return 0;
  const stat = statSync(pathname);
  if (!stat.isDirectory()) return stat.mtimeMs;
  return readdirSync(pathname)
    .filter(name => !name.startsWith('.'))
    .reduce((latest, name) => Math.max(latest, latestMtimeMs(resolve(pathname, name))), 0);
}

function isFreshRootIndex() {
  if (!existsSync(ROOT_INDEX)) return false;
  const bundleMtime = statSync(ROOT_INDEX).mtimeMs;
  const inputMtime = Math.max(
    latestMtimeMs(resolve(ROOT, 'src')),
    latestMtimeMs(resolve(ROOT, 'vendor')),
    latestMtimeMs(resolve(ROOT, 'build.js'))
  );
  return bundleMtime >= inputMtime;
}

function regressionHtmlPath() {
  if (!FORCE_REBUILD && isFreshRootIndex()) {
    console.log('Using existing regression-test HTML from index.html...');
    return ROOT_INDEX;
  }
  console.log('Building regression-test HTML...');
  execFileSync(process.execPath, ['build.js', '--out', OUT], { cwd: ROOT, stdio: 'pipe' });
  return OUT;
}

const html = readFileSync(regressionHtmlPath(), 'utf8');
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
const setupElapsedMs = Date.now() - setupStartedAt;
assert(setupElapsedMs <= SETUP_BUDGET_MS, `Regression setup exceeded ${SETUP_BUDGET_MS}ms budget (${setupElapsedMs}ms)`);

assert(window.eval('DIOGNOSIS_VERSION.engine') === '0.1.0-alpha.1', 'Regression build loaded wrong engine version');
assert(window.eval('PK_DOSE_INTERVALS.codeine') === 6, 'PK dose interval rules did not load');
assert(window.eval('PHENOTYPE_RISK_RULES.qtc.thresholds[1]') === 5, 'Phenotype risk rules did not load');
assert(window.eval('EDGE_TYPE_BASE_WEIGHT[EDGE_TYPE.SUBSTRATE_OF]') === 0.92, 'Edge base weight rules did not load');

const repeatedGenotypeParams = window.eval(`parseQueryParams('?genotype=CYP2D6:PM&genotype=CYP2C19:UM')`);
assert(
  Array.isArray(repeatedGenotypeParams.genotype) &&
  repeatedGenotypeParams.genotype.includes('CYP2D6:PM') &&
  repeatedGenotypeParams.genotype.includes('CYP2C19:UM'),
  'Repeated genotype URL params should be preserved as an array'
);

const loadStateResetRegression = window.eval(`(() => {
  resetActiveGenotypeState();
  activeStack = ['Codeine'];
  setGenotypeState('CYP2D6', GENOTYPE_PHENOTYPE.PM);
  activeGenotype['G6PD deficiency'] = GENOTYPE_RISK_STATUS.PRESENT;
  activeGenotypeDetails['G6PD deficiency'] = buildRiskInterpretation('G6PD deficiency', GENOTYPE_RISK_STATUS.PRESENT);
  const beforeGuide = currentStackShareUrl('overview');

  loadMedicationClassGuide(0);
  const noGenotypeGuide = {
    stack:activeStack.slice(),
    cyp2d6:activeGenotype.CYP2D6,
    legacy:userGenetics.CYP2D6 || '',
    g6pd:activeGenotype['G6PD deficiency'],
    detailKeys:Object.keys(activeGenotypeDetails || {}),
    shareUrl:currentStackShareUrl('overview'),
  };

  setGenotypeState('CYP2C19', GENOTYPE_PHENOTYPE.PM);
  activeGenotype['G6PD deficiency'] = GENOTYPE_RISK_STATUS.PRESENT;
  activeGenotypeDetails['G6PD deficiency'] = buildRiskInterpretation('G6PD deficiency', GENOTYPE_RISK_STATUS.PRESENT);
  loadMedicationClassGuide(2);
  const genotypeGuide = {
    stack:activeStack.slice(),
    cyp2d6:activeGenotype.CYP2D6,
    cyp2c19:activeGenotype.CYP2C19,
    g6pd:activeGenotype['G6PD deficiency'],
    detailKeys:Object.keys(activeGenotypeDetails || {}),
    shareUrl:currentStackShareUrl('overview'),
  };

  setGenotypeState('CYP2D6', GENOTYPE_PHENOTYPE.PM);
  window.history.replaceState(null, '', '/index.html?substances=warfarin,ibuprofen&tab=overview');
  loadUrlDemoState();
  const urlNoGenotype = {
    stack:activeStack.slice(),
    cyp2d6:activeGenotype.CYP2D6,
    detailKeys:Object.keys(activeGenotypeDetails || {}),
    shareUrl:currentStackShareUrl('overview'),
  };

  return { beforeGuide, noGenotypeGuide, genotypeGuide, urlNoGenotype };
})()`);
assert(/genotype=.*CYP2D6/i.test(loadStateResetRegression.beforeGuide) && /G6PD/i.test(loadStateResetRegression.beforeGuide),
  'Seeded guide reset test should start with CYP2D6 and G6PD in the share URL');
assert(loadStateResetRegression.noGenotypeGuide.stack.join('|') === 'Warfarin|Fluconazole|Ibuprofen',
  'No-genotype class guide should load its documented stack');
assert(loadStateResetRegression.noGenotypeGuide.cyp2d6 === 'normal_metabolizer',
  'No-genotype class guide should reset stale CYP2D6 PM state');
assert(loadStateResetRegression.noGenotypeGuide.legacy === '',
  'No-genotype class guide should clear stale legacy CYP2D6 state');
assert(loadStateResetRegression.noGenotypeGuide.g6pd === 'risk_allele_absent',
  'No-genotype class guide should reset stale G6PD risk-marker state');
assert(loadStateResetRegression.noGenotypeGuide.detailKeys.length === 0,
  `No-genotype class guide should clear stale genotype details: ${loadStateResetRegression.noGenotypeGuide.detailKeys.join(', ')}`);
assert(!/genotype=/i.test(loadStateResetRegression.noGenotypeGuide.shareUrl),
  'No-genotype class guide share URL should not include stale genotype params');
assert(loadStateResetRegression.genotypeGuide.stack.join('|') === 'Flecainide|Fluoxetine',
  'Genotype class guide should load its documented stack');
assert(loadStateResetRegression.genotypeGuide.cyp2d6 === 'poor_metabolizer',
  'Genotype class guide should still apply its documented CYP2D6 PM state');
assert(loadStateResetRegression.genotypeGuide.cyp2c19 === 'normal_metabolizer',
  'Genotype class guide should reset unrelated stale CYP2C19 PM state');
assert(loadStateResetRegression.genotypeGuide.g6pd === 'risk_allele_absent',
  'Genotype class guide should reset unrelated stale risk-marker state');
assert(loadStateResetRegression.genotypeGuide.detailKeys.length === 1 && loadStateResetRegression.genotypeGuide.detailKeys[0] === 'CYP2D6',
  `Genotype class guide should keep only its own genotype detail: ${loadStateResetRegression.genotypeGuide.detailKeys.join(', ')}`);
assert(/genotype=.*CYP2D6/i.test(loadStateResetRegression.genotypeGuide.shareUrl) && !/CYP2C19|G6PD/i.test(loadStateResetRegression.genotypeGuide.shareUrl),
  'Genotype class guide share URL should include only the guide-selected genotype');
assert(loadStateResetRegression.urlNoGenotype.stack.join('|') === 'Warfarin|Ibuprofen',
  'URL state without genotype should load the requested substances');
assert(loadStateResetRegression.urlNoGenotype.cyp2d6 === 'normal_metabolizer',
  'URL state without genotype should reset stale CYP2D6 PM state');
assert(loadStateResetRegression.urlNoGenotype.detailKeys.length === 0,
  `URL state without genotype should clear stale genotype details: ${loadStateResetRegression.urlNoGenotype.detailKeys.join(', ')}`);
assert(!/genotype=/i.test(loadStateResetRegression.urlNoGenotype.shareUrl),
  'URL state without genotype should not emit stale genotype params in share URL');

const liveUrlStateRegression = window.eval(`(() => {
  window.history.replaceState(null, '', '/index.html');
  activeStack = [];
  if (typeof resetActiveGenotypeState === "function") resetActiveGenotypeState();
  if (typeof drugDoses !== "undefined") Object.keys(drugDoses).forEach(k => delete drugDoses[k]);
  setAudienceMode('clinician', { render:false });
  addDrug('Codeine');
  addDrug('Fluoxetine');
  setGenotype('CYP2D6', GENOTYPE_PHENOTYPE.PM);
  setTab('genes-metabolites');
  const withStack = window.location.search;
  removeDrug('Fluoxetine');
  const afterRemove = window.location.search;
  removeDrug('Codeine');
  if (typeof resetActiveGenotypeState === "function") resetActiveGenotypeState();
  setAudienceMode('patient');
  setTab('overview');
  renderAll();
  const afterClear = window.location.search;
  return { withStack, afterRemove, afterClear };
})()`);
assert(/substances=codeine,fluoxetine/i.test(liveUrlStateRegression.withStack),
  `Live URL sync should include selected substances: ${liveUrlStateRegression.withStack}`);
assert(/genotype=CYP2D6:PM/i.test(liveUrlStateRegression.withStack),
  `Live URL sync should include selected genotype: ${liveUrlStateRegression.withStack}`);
assert(/audience=clinician/i.test(liveUrlStateRegression.withStack),
  `Live URL sync should include current audience: ${liveUrlStateRegression.withStack}`);
assert(/tab=genes-metabolites/i.test(liveUrlStateRegression.withStack),
  `Live URL sync should include current tab: ${liveUrlStateRegression.withStack}`);
assert(/substances=codeine/i.test(liveUrlStateRegression.afterRemove) && !/fluoxetine/i.test(liveUrlStateRegression.afterRemove),
  `Live URL sync should remove deselected substances: ${liveUrlStateRegression.afterRemove}`);
assert(!/(?:substances|drugs|medications)=/i.test(liveUrlStateRegression.afterClear) && !/genotype=/i.test(liveUrlStateRegression.afterClear),
  `Live URL sync should clear stale stack/genotype params when the state is reset: ${liveUrlStateRegression.afterClear}`);

const genotypeSemanticsAudit = window.eval(`(() => {
  const missing = [];
  const missingAxis = [];
  const missingState = [];
  const unsafeLegacyNull = [];
  const legacyNullGenes = [];
  for (const gene of Object.keys(GENOTYPE_EFFECTS)) {
    const semantics = GENE_SEMANTICS[gene];
    if (!semantics) {
      missing.push(gene);
      continue;
    }
    if (!semantics.axis) missingAxis.push(gene);
    if (!semantics.phenotypeStateLabel) missingState.push(gene);
    activeGenotypeDetails = {};
    userGenetics = {};
    setGenotypeState(gene, "null");
    if (userGenetics[gene] === "null") legacyNullGenes.push(gene);
    if (userGenetics[gene] === "null" && semantics.legacyNull !== true) unsafeLegacyNull.push(gene);
  }
  return { missing, missingAxis, missingState, unsafeLegacyNull, legacyNullGenes };
})()`);
assert(genotypeSemanticsAudit.missing.length === 0, `GENOTYPE_EFFECTS genes missing GENE_SEMANTICS: ${genotypeSemanticsAudit.missing.join(', ')}`);
assert(genotypeSemanticsAudit.missingAxis.length === 0, `GENOTYPE_EFFECTS genes missing semantic axis: ${genotypeSemanticsAudit.missingAxis.join(', ')}`);
assert(genotypeSemanticsAudit.missingState.length === 0, `GENOTYPE_EFFECTS genes missing state label: ${genotypeSemanticsAudit.missingState.join(', ')}`);
assert(genotypeSemanticsAudit.unsafeLegacyNull.length === 0, `Legacy null used where not allowed: ${genotypeSemanticsAudit.unsafeLegacyNull.join(', ')}`);
assert(
  genotypeSemanticsAudit.legacyNullGenes.length === 2 &&
  genotypeSemanticsAudit.legacyNullGenes.includes('CYP2D6') &&
  genotypeSemanticsAudit.legacyNullGenes.includes('BCHE'),
  `Only CYP2D6 and BCHE should map reported null/no-function to legacy null, got ${genotypeSemanticsAudit.legacyNullGenes.join(', ')}`
);

const drugUniqueness = window.eval(`(() => {
  const names = new Map();
  const ids = new Map();
  for (const drug of DRUG_DB) {
    names.set(drug.name, (names.get(drug.name) || 0) + 1);
    ids.set(drug.id, (ids.get(drug.id) || 0) + 1);
  }
  return {
    names: [...names].filter(([, count]) => count > 1).map(([name]) => name),
    ids: [...ids].filter(([, count]) => count > 1).map(([id]) => id),
  };
})()`);
assert(drugUniqueness.names.length === 0, `Duplicate DRUG_DB names: ${drugUniqueness.names.join(', ')}`);
assert(drugUniqueness.ids.length === 0, `Duplicate DRUG_DB ids: ${drugUniqueness.ids.join(', ')}`);

const graphIntegrity = window.eval(`(() => {
  const graph = getInteractionGraph();
  const metaboliteEdges = graph.edges.filter(e => e.type === EDGE_TYPE.METABOLIZED_TO || e.type === EDGE_TYPE.ACTIVATES);
  const missingFrom = metaboliteEdges.filter(e => !graph.actors[e.from]).map(e => e.from + '->' + e.to);
  const missingTo = metaboliteEdges.filter(e => !graph.actors[e.to]).map(e => e.from + '->' + e.to);
  const richMetabolites = Object.keys(METABOLITE_ACTORS);
  const richWithoutFormation = richMetabolites.filter(id => !metaboliteEdges.some(e => e.to === id));
  const parentMismatch = Object.entries(METAB).filter(([drugName]) => !graph.actors[getDrugGraphId(drugName)]).map(([drugName]) => drugName);
  return { missingFrom, missingTo, richWithoutFormation, parentMismatch };
})()`);
assert(graphIntegrity.missingFrom.length === 0, `Metabolite edges with missing parent actors: ${graphIntegrity.missingFrom.slice(0, 10).join(', ')}`);
assert(graphIntegrity.missingTo.length === 0, `Metabolite edges with missing metabolite actors: ${graphIntegrity.missingTo.slice(0, 10).join(', ')}`);
assert(graphIntegrity.richWithoutFormation.length === 0, `Detailed metabolite actors without formation edges: ${graphIntegrity.richWithoutFormation.join(', ')}`);
assert(graphIntegrity.parentMismatch.length === 0, `METAB parents without drug actors: ${graphIntegrity.parentMismatch.join(', ')}`);

const metaboliteProvenance = window.eval(`(() => {
  const graph = getInteractionGraph();
  const missing = [];
  const unknownRefs = [];
  for (const rel of HIGH_IMPACT_METABOLITE_RELATIONS) {
    const from = getDrugGraphId(rel.parent);
    const edge = graph.edges.find(e =>
      e.from === from &&
      e.to === rel.metaboliteId &&
      (e.type === EDGE_TYPE.METABOLIZED_TO || e.type === EDGE_TYPE.ACTIVATES)
    );
    if (!edge) {
      missing.push(rel.parent + '->' + rel.metaboliteId + ' missing edge');
      continue;
    }
    const actorRefs = graph.actors[rel.metaboliteId]?.evidenceRefs || [];
    const edgeRefs = edge.props?.evidenceRefs || [];
    const refs = [...new Set(edgeRefs.concat(actorRefs))];
    for (const ref of rel.requiredEvidenceRefs) {
      if (!refs.includes(ref)) missing.push(rel.parent + '->' + rel.metaboliteId + ' missing ' + ref);
      if (!STUDY_DB[ref]) unknownRefs.push(ref);
    }
  }
  return { missing, unknownRefs:[...new Set(unknownRefs)] };
})()`);
assert(metaboliteProvenance.missing.length === 0, `High-impact metabolite provenance gaps: ${metaboliteProvenance.missing.join('; ')}`);
assert(metaboliteProvenance.unknownRefs.length === 0, `Unknown metabolite evidence refs: ${metaboliteProvenance.unknownRefs.join(', ')}`);

const hydroxybupropionRouteAudit = window.eval(`(() => {
  const graph = getInteractionGraph();
  const route = graph.edges.find(e =>
    e.from === 'hydroxybupropion' &&
    e.to === 'CYP2D6' &&
    e.type === EDGE_TYPE.SUBSTRATE_OF &&
    e.props?.role === 'clearance_context'
  );
  const inhibition = graph.edges.find(e =>
    e.from === 'hydroxybupropion' &&
    e.to === 'CYP2D6' &&
    e.type === EDGE_TYPE.INHIBITS
  );
  return {
    hasRoute: !!route,
    routeRefs: route?.props?.evidenceRefs || [],
    routeConfidence: route ? computeEdgeConfidence(route) : null,
    routeEvidenceConfidence: route?.props?.evidence?.confidence || null,
    inhibitionRefs: inhibition?.props?.evidenceRefs || [],
    inhibitionConfidence: inhibition ? computeEdgeConfidence(inhibition) : null,
  };
})()`);
assert(hydroxybupropionRouteAudit.hasRoute, 'Hydroxybupropion should expose a CYP2D6 clearance-context edge');
assert(hydroxybupropionRouteAudit.routeRefs.includes('ev_bupropion_cyp2d6_hesse1996'), 'Hydroxybupropion CYP2D6 route should carry Hesse evidence ref');
assert(hydroxybupropionRouteAudit.routeEvidenceConfidence === 'low', 'Hydroxybupropion CYP2D6 route should remain explicitly low-confidence');
assert(hydroxybupropionRouteAudit.routeConfidence < hydroxybupropionRouteAudit.inhibitionConfidence, 'Low-confidence clearance route should not outrank high-confidence CYP2D6 inhibition');
assert(hydroxybupropionRouteAudit.inhibitionRefs.includes('ev_bupropion_cyp2d6_fda'), 'Hydroxybupropion CYP2D6 inhibition should retain FDA evidence');

const genotypeTraversalAudit = window.eval(`(() => {
  const rows = traverseFromGenotype('CYP2D6', 'poor');
  const hydroxy = rows.find(r => r.actorId === 'hydroxybupropion');
  return {
    count: rows.length,
    hasHydroxy: !!hydroxy,
    hydroxyDirection: hydroxy?.direction,
    hydroxyConfidence: hydroxy?.confidence,
    hydroxyFold: hydroxy?.fold || null,
    hydroxyChain: hydroxy?.chain || ''
  };
})()`);
assert(genotypeTraversalAudit.count > 10, 'CYP2D6 genotype traversal should return a broad affected-actor set');
assert(genotypeTraversalAudit.hasHydroxy, 'CYP2D6 PM traversal should include hydroxybupropion via metabolite-level edge');
assert(genotypeTraversalAudit.hydroxyDirection === 'increase', 'Hydroxybupropion CYP2D6 PM traversal should be directional increase');
assert(genotypeTraversalAudit.hydroxyConfidence === 'low', 'Hydroxybupropion CYP2D6 clearance traversal should remain low confidence');
assert(genotypeTraversalAudit.hydroxyFold === null, 'Low-confidence hydroxybupropion traversal should not invent a precise fold');
assert(genotypeTraversalAudit.hydroxyChain.includes('CYP2D6'), 'Genotype traversal should include an explanatory chain');

const knownDdiEvidenceAudit = window.eval(`(() => {
  const unknownRefs = [];
  const missingRefs = [];
  for (const ddi of KNOWN_DDI) {
    if (!ddi.evidenceRefs || ddi.evidenceRefs.length === 0) {
      missingRefs.push(ddi.drug1 + '+' + ddi.drug2);
      continue;
    }
    for (const ref of ddi.evidenceRefs) {
      if (!STUDY_DB[ref]) unknownRefs.push(ref);
    }
  }
  return { missingRefs, unknownRefs:[...new Set(unknownRefs)] };
})()`);
assert(knownDdiEvidenceAudit.unknownRefs.length === 0, `Unknown KNOWN_DDI evidence refs: ${knownDdiEvidenceAudit.unknownRefs.join(', ')}`);

const batchAuditFixes = window.eval(`(() => {
  const drug = name => DRUG_DB.find(d => d.name === name);
  const hasPair = (a,b) => KNOWN_DDI.some(i =>
    (i.drug1 === a && i.drug2 === b) || (i.drug1 === b && i.drug2 === a)
  );
  const resolve = name => getDrug(name)?.name || null;
  return {
    amphetamineBrands: drug('Amphetamine')?.brandNames || [],
    lisdexamfetamine: drug('Lisdexamfetamine'),
    aliasResolution: {
      prozac: resolve('Prozac'),
      paracetamol: resolve('Paracetamol'),
      diacetylmorphine: resolve('Diacetylmorphine'),
      babyAspirin: resolve('baby aspirin'),
      fiveFu: resolve('5-FU'),
      vyvanse: resolve('Vyvanse'),
    },
    simvastatinProdrug: !!drug('Simvastatin')?.prodrug,
    lovastatinProdrug: !!drug('Lovastatin')?.prodrug,
    dabigatranProdrug: !!drug('Dabigatran')?.prodrug,
    hasGemfibrozilStatin: hasPair('Simvastatin','Gemfibrozil') && hasPair('Rosuvastatin','Gemfibrozil'),
    hasRifampinDoacs: hasPair('Dabigatran','Rifampin') && hasPair('Apixaban','Rifampin') && hasPair('Rivaroxaban','Rifampin'),
    hasTransporterPairs: hasPair('Digoxin', "St. John's Wort") && hasPair('Metformin','Trimethoprim/Sulfamethoxazole') && hasPair('Methotrexate','Probenecid'),
  };
})()`);
assert(!batchAuditFixes.amphetamineBrands.includes('Vyvanse') && !batchAuditFixes.amphetamineBrands.includes('Elvanse'), 'Vyvanse/Elvanse should not be Amphetamine brands');
assert(batchAuditFixes.lisdexamfetamine?.prodrug, 'Lisdexamfetamine should be modeled as a separate prodrug');
assert(batchAuditFixes.aliasResolution.prozac === 'Fluoxetine', 'Prozac should resolve to Fluoxetine');
assert(batchAuditFixes.aliasResolution.paracetamol === 'Acetaminophen', 'Paracetamol should resolve to Acetaminophen');
assert(batchAuditFixes.aliasResolution.diacetylmorphine === 'Heroin (Diacetylmorphine)', 'Diacetylmorphine should resolve to Heroin');
assert(batchAuditFixes.aliasResolution.babyAspirin === 'Aspirin (Low-Dose)', 'Baby aspirin should resolve to Aspirin (Low-Dose)');
assert(batchAuditFixes.aliasResolution.fiveFu === 'Fluorouracil', '5-FU should resolve to Fluorouracil');
assert(batchAuditFixes.aliasResolution.vyvanse === 'Lisdexamfetamine', 'Vyvanse should resolve to Lisdexamfetamine, not Amphetamine');
assert(batchAuditFixes.simvastatinProdrug && batchAuditFixes.lovastatinProdrug && batchAuditFixes.dabigatranProdrug, 'Batch prodrug flags should be present');
assert(batchAuditFixes.hasGemfibrozilStatin, 'Gemfibrozil statin DDIs should be present');
assert(batchAuditFixes.hasRifampinDoacs, 'Rifampin DOAC DDIs should be present');
assert(batchAuditFixes.hasTransporterPairs, 'Batch transporter DDI pairs should be present');

loadCase(window, ['Paroxetine', 'Codeine']);
const genotypeText = window.document.getElementById('genotypeBody').textContent;
assert(
  genotypeText.includes('CYP2D6'),
  'CYP2D6 genotype selector should appear when CYP2D6 is relevant'
);
assert(
  !genotypeText.includes('East Asian CYP2D6 Note') && !genotypeText.includes('CYP2D6*10 awareness'),
  'CYP2D6 population note should remain hidden pending systematic population model'
);
assert(hasInteraction(window, {
  drug1: 'Paroxetine',
  drug2: 'Codeine',
  severity: 'severe',
  text: 'activation blocked',
}), 'Paroxetine + Codeine should flag severe CYP2D6 prodrug activation loss');
const cyp2d6Cap = window.eval('computeEnzymeCapacity("CYP2D6", activeStack)');
assert(cyp2d6Cap.capacity_pct <= 25, `Paroxetine should severely impair CYP2D6, got ${cyp2d6Cap.capacity_pct}%`);

loadCase(window, ['Grapefruit Juice']);
assert(
  !window.document.getElementById('genotypeBody').textContent.includes('East Asian CYP2D6 Note'),
  'CYP2D6 population note should not appear for CYP2D6-unrelated stacks'
);

loadCase(window, ['Potatoes (Solanine/Solanidine)']);
window.setGenotype('CYP2D6', 'poor_metabolizer');
const potatoGraph = window.eval(`(() => {
  const graph = getInteractionGraph();
  const from = getDrugGraphId('Potatoes (Solanine/Solanidine)');
  return {
    from,
    hasDrug: !!graph.actors[from],
    hasSolanidineEdge: graph.edges.some(e => e.from === from && e.to === 'solanidine')
  };
})()`);
assert(potatoGraph.hasDrug, 'Potatoes should exist as a graph actor');
assert(potatoGraph.hasSolanidineEdge, 'Potatoes should map to solanidine in graph');
assert(
  window.document.getElementById('genotypeBody').textContent.includes('CYP2D6'),
  'Potatoes should make CYP2D6 genotype context relevant'
);
const potatoGenotypeText = window.document.getElementById('genotypeBody').textContent;
assert(
  potatoGenotypeText.includes('solanidine'),
  'Potatoes genotype evidence should include solanidine evidence'
);
assert(
  potatoGenotypeText.includes('18.9x') || potatoGenotypeText.includes('+1887%'),
  'Potatoes CYP2D6 PM context should show solanidine ~18.9x/+1887% exposure, not a generic 1.8x parent multiplier'
);
assert(
  !potatoGenotypeText.includes('Paxil') &&
  !potatoGenotypeText.includes('Prozac') &&
  !potatoGenotypeText.includes('Wellbutrin'),
  'Potatoes genotype evidence should not show unrelated CYP2D6 drug studies'
);

loadCase(window, ['Bupropion']);
window.setGenotype('CYP2D6', 'poor_metabolizer');
const bupropionGenotypeText = window.document.getElementById('genotypeBody').textContent;
assert(
  bupropionGenotypeText.includes('Hydroxybupropion') &&
  bupropionGenotypeText.includes('higher hydroxybupropion level/dose ratio'),
  'Bupropion CYP2D6 PM context should surface hydroxybupropion metabolite exposure, not only parent bupropion'
);
window.setGenetics('CYP2D6', 'null');
const bupropionFoldText = window.document.getElementById('foldBody').textContent;
assert(
  bupropionFoldText.includes('Bupropion') &&
  bupropionFoldText.includes('1.0×') &&
  bupropionFoldText.includes('Hydroxybupropion') &&
  bupropionFoldText.includes('~6.70x'),
  'Bupropion fold bars should show separate parent 1.0× and Hydroxybupropion ~6.70x metabolite rows under CYP2D6 null'
);
assert(
  !bupropionFoldText.includes('Hydroxybupropionfrom BupropionBASELINE'),
  'Hydroxybupropion should not remain baseline when CYP2D6 null is selected'
);
assert(
  window.document.querySelectorAll('#foldBody .fold-metabolite-row .fold-bar').length >= 1,
  'Quantified metabolite rows should render a fold bar, not only text'
);

loadCase(window, ['Clopidogrel']);
window.setGenotype('CYP2C19', 'ultrarapid_metabolizer');
const clopidogrelFoldText = window.document.getElementById('foldBody').textContent;
assert(
  clopidogrelFoldText.includes('Active thiol metabolite') &&
  clopidogrelFoldText.includes('~2.00x'),
  'CYP2C19 UM should quantify the separate active clopidogrel metabolite formation row'
);

loadCase(window, ['Clopidogrel']);
window.setGenotype('CYP2C19', 'poor_metabolizer');
const clopidogrelSummary = {
  title: window.document.querySelector('.summary-title')?.textContent || '',
  label: window.document.querySelector('.summary-risk .lbl')?.textContent || '',
  story: window.document.querySelector('.summary-story')?.textContent || '',
  metrics: window.document.querySelectorAll('.summary-metric').length,
  genotypeText: window.document.getElementById('genotypeBody')?.textContent || '',
};
assert(
  clopidogrelSummary.title.includes('CYP2C19 genotype') &&
  clopidogrelSummary.title.includes('Active thiol metabolite') &&
  clopidogrelSummary.label === 'Gene High',
  'Clopidogrel + CYP2C19 PM should be highest-priority gene-result context, not a generic single-medication prompt'
);
assert(
  clopidogrelSummary.metrics === 0 &&
  clopidogrelSummary.genotypeText.includes('CYP2C19') &&
  clopidogrelSummary.genotypeText.includes('Active thiol metabolite'),
  'Genotype inputs and explanations should live in Genetics, not Summary metrics'
);
assert(
  clopidogrelSummary.story.includes('Why this matters') &&
  clopidogrelSummary.story.includes('What changes') &&
  clopidogrelSummary.story.includes('Next review step'),
  'Highest-priority gene-result summary should include only clinical narrative and next review step'
);

loadCase(window, ['Abacavir']);
window.eval(`activeGenotype["HLA-B*57:01"] = GENOTYPE_RISK_STATUS.PRESENT; renderAll();`);
const abacavirSummary = {
  title: window.document.querySelector('.summary-title')?.textContent || '',
  label: window.document.querySelector('.summary-risk .lbl')?.textContent || '',
};
assert(
  abacavirSummary.title.includes('HLA-B*57:01') &&
  abacavirSummary.title.includes('Abacavir') &&
  abacavirSummary.label === 'Gene High',
  'Abacavir + HLA-B*57:01 present should surface as highest-priority gene-result risk'
);

const pharmGxImportAudit = window.eval(`(() => {
  const imported = parsePharmGxImportDetailed(JSON.stringify({
    CYP2D6: "PM",
    CYP2C19: "NM",
    CYP2C9: "NM",
    CYP2B6: "NM",
    CYP3A4: "NM",
    CYP3A5: "non_expresser",
    CYP1A2: "NM",
    CYP2A6: "NM",
    CYP4F2: "NM",
    NAT2: "IM",
    DPYD: "NM",
    TPMT: "NM",
    UGT1A1: "NM",
    UGT2B7: "NM",
    GSTM1: "null",
    SLCO1B1: "increased_function",
    ABCB1: "reduced_function",
    ABCG2: "NM",
    VKORC1: "NM",
    MTHFR: "HOM_TT",
    GABRG2: "HOM_ALT_contraindicated",
    NOT_SUPPORTED_YET: "PM"
  }));
  imported.rows.forEach(row => applyPharmGxRow(row));
  return {
    rowCount: imported.rows.length,
    skipped: imported.skipped,
    cyp2d6: activeGenotype.CYP2D6,
    cyp3a5: activeGenotype.CYP3A5,
    nat2: activeGenotype.NAT2,
    gstm1: activeGenotype.GSTM1,
    cyp2d6Detail: activeGenotypeDetails.CYP2D6,
    cyp3a5Detail: activeGenotypeDetails.CYP3A5,
    gstm1Detail: activeGenotypeDetails.GSTM1,
    gstm1Legacy: userGenetics.GSTM1,
    slco1b1: activeGenotype.SLCO1B1,
    abcb1: activeGenotype.ABCB1,
    mthfr: activeGenotype["MTHFR C677T"],
    gabrg2: activeGenotype["GABRG2 variant"],
  };
})()`);
assert(pharmGxImportAudit.rowCount === 21, `Direct gene-status JSON import should parse 21 supported rows, got ${pharmGxImportAudit.rowCount}`);
assert(pharmGxImportAudit.skipped.length === 1, 'Direct gene-status JSON import should report unsupported rows');
assert(pharmGxImportAudit.cyp2d6 === 'poor_metabolizer', 'Importer should map CYP2D6 PM to poor_metabolizer');
assert(pharmGxImportAudit.cyp3a5 === 'poor_metabolizer', 'Importer should map CYP3A5 non_expresser to poor_metabolizer');
assert(pharmGxImportAudit.nat2 === 'intermediate_metabolizer', 'Importer should map NAT2 IM to intermediate_metabolizer');
assert(pharmGxImportAudit.gstm1 === 'poor_metabolizer', 'Importer should keep GSTM1 null in the PM calculation bucket');
assert(pharmGxImportAudit.gstm1Legacy === 'poor', 'Importer should not use the generic legacy null multiplier for GSTM1 null');
assert(pharmGxImportAudit.gstm1Detail.mechanism === 'copy_number_null', 'Importer should preserve GSTM1 null as copy-number/null semantics');
assert(pharmGxImportAudit.gstm1Detail.functionalState.includes('GSTM1 null'), 'Importer should label GSTM1 null as null detox context');
assert(pharmGxImportAudit.cyp3a5Detail.mechanism === 'inherited_low_expression', 'Importer should preserve CYP3A5 non-expresser as expression semantics');
assert(pharmGxImportAudit.slco1b1 === 'ultrarapid_metabolizer', 'Importer should map increased_function to ultrarapid_metabolizer');
assert(pharmGxImportAudit.abcb1 === 'intermediate_metabolizer', 'Importer should map reduced_function to intermediate_metabolizer');
assert(pharmGxImportAudit.mthfr === 'risk_allele_present', 'Importer should map MTHFR HOM_TT to risk allele present');
assert(pharmGxImportAudit.gabrg2 === 'risk_allele_present', 'Importer should map GABRG2 HOM_ALT_contraindicated to risk allele present');

const reportedVsInterpretedAudit = window.eval(`(() => {
  activeGenotypeDetails = {};
  userGenetics = {};
  const rows = parsePharmGxImportDetailed([
    "CYP3A5 | *3/*3 | non_expresser",
    "GSTM1 | deletion | null",
    "GSTT1 | deletion | null",
    "CYP2C19 | *2/*2 | Poor Metabolizer"
  ].join("\\n")).rows;
  rows.forEach(row => applyPharmGxRow(row));
  return {
    cyp3a5: { phenotype:activeGenotype.CYP3A5, legacy:userGenetics.CYP3A5, detail:activeGenotypeDetails.CYP3A5 },
    gstm1: { phenotype:activeGenotype.GSTM1, legacy:userGenetics.GSTM1, detail:activeGenotypeDetails.GSTM1 },
    gstt1: { phenotype:activeGenotype.GSTT1, legacy:userGenetics.GSTT1, detail:activeGenotypeDetails.GSTT1 },
    cyp2c19: { phenotype:activeGenotype.CYP2C19, legacy:userGenetics.CYP2C19, detail:activeGenotypeDetails.CYP2C19 },
  };
})()`);
assert(reportedVsInterpretedAudit.cyp3a5.phenotype === 'poor_metabolizer', 'CYP3A5 non-expresser should stay in the PM calculation bucket');
assert(reportedVsInterpretedAudit.cyp3a5.legacy === 'poor', 'CYP3A5 non-expresser should not use legacy null');
assert(reportedVsInterpretedAudit.cyp3a5.detail.reportedLabel.includes('*3/*3') && reportedVsInterpretedAudit.cyp3a5.detail.reportedLabel.includes('non_expresser'), 'Importer should preserve reported CYP3A5 diplotype/status text');
assert(reportedVsInterpretedAudit.cyp3a5.detail.functionalState === 'CYP3A5 non-expresser', 'CYP3A5 non-expresser should display as expression status');
assert(reportedVsInterpretedAudit.gstm1.legacy === 'poor' && reportedVsInterpretedAudit.gstt1.legacy === 'poor', 'GSTM1/GSTT1 null should not use legacy null');
assert(reportedVsInterpretedAudit.gstm1.detail.reportedLabel.includes('deletion') && reportedVsInterpretedAudit.gstm1.detail.reportedLabel.includes('null'), 'Importer should preserve GSTM1 reported deletion/null text');
assert(reportedVsInterpretedAudit.gstm1.detail.functionalState.includes('GSTM1 null') && reportedVsInterpretedAudit.gstt1.detail.functionalState.includes('GSTT1 null'), 'GSTM1/GSTT1 null should display as copy-number detox context');
assert(reportedVsInterpretedAudit.cyp2c19.legacy === 'poor', 'CYP2C19 poor metabolizer should not imply legacy null');
assert(reportedVsInterpretedAudit.cyp2c19.detail.reportedLabel.includes('*2/*2') && reportedVsInterpretedAudit.cyp2c19.detail.reportedLabel.includes('Poor Metabolizer'), 'Importer should preserve reported CYP2C19 diplotype/status text');

const riskMarkerSemanticsAudit = window.eval(`(() => {
  return {
    hla: {
      gene: normalizePharmGxGene("HLA-B*57:01"),
      hasEffect: !!GENOTYPE_EFFECTS["HLA-B*57:01"],
      status: riskTextToStatus("detected", "HLA-B*57:01"),
      detail: buildRiskInterpretation("HLA-B*57:01", GENOTYPE_RISK_STATUS.PRESENT, { reportedLabel:"detected" }),
    },
    g6pd: {
      gene: normalizePharmGxGene("G6PD"),
      hasEffect: !!GENOTYPE_EFFECTS.G6PD,
      detail: buildRiskInterpretation("G6PD deficiency", GENOTYPE_RISK_STATUS.PRESENT, { reportedLabel:"deficient" }),
    },
    ryr1: {
      gene: normalizePharmGxGene("RYR1"),
      hasEffect: !!GENOTYPE_EFFECTS.RYR1,
      detail: buildRiskInterpretation("RYR1/CACNA1S MH variant", GENOTYPE_RISK_STATUS.PRESENT, { reportedLabel:"variant detected" }),
    },
    mtrnr1: {
      gene: normalizePharmGxGene("MT-RNR1"),
      hasEffect: !!GENOTYPE_EFFECTS["MT-RNR1"],
      detail: buildRiskInterpretation("MT-RNR1 m.1555A>G", GENOTYPE_RISK_STATUS.PRESENT, { reportedLabel:"detected" }),
    },
  };
})()`);
assert(riskMarkerSemanticsAudit.hla.gene === 'HLA-B*57:01' && !riskMarkerSemanticsAudit.hla.hasEffect, 'HLA should remain a risk marker, not GENOTYPE_EFFECTS');
assert(riskMarkerSemanticsAudit.g6pd.gene === 'G6PD deficiency' && !riskMarkerSemanticsAudit.g6pd.hasEffect, 'G6PD should remain a deficiency/risk marker, not generic metabolism');
assert(riskMarkerSemanticsAudit.ryr1.gene === 'RYR1/CACNA1S MH variant' && !riskMarkerSemanticsAudit.ryr1.hasEffect, 'RYR1 should remain a malignant-hyperthermia risk marker');
assert(riskMarkerSemanticsAudit.mtrnr1.gene === 'MT-RNR1 m.1555A>G' && !riskMarkerSemanticsAudit.mtrnr1.hasEffect, 'MT-RNR1 should remain an ototoxicity risk marker');
assert(
  [riskMarkerSemanticsAudit.hla.detail, riskMarkerSemanticsAudit.g6pd.detail, riskMarkerSemanticsAudit.ryr1.detail, riskMarkerSemanticsAudit.mtrnr1.detail].every(detail => detail.axis === 'risk_allele' && detail.modelUse === 'risk-allele safety context'),
  'G6PD/HLA/RYR1/MT-RNR1 details should display as risk/deficiency markers'
);

const nullVsPoorAudit = window.eval(`(() => {
  activeGenotypeDetails = {};
  userGenetics = {};
  setGenotypeState('CYP2D6', GENOTYPE_PHENOTYPE.PM);
  const poor = { legacy:userGenetics.CYP2D6, detail:activeGenotypeDetails.CYP2D6 };
  activeGenotypeDetails = {};
  userGenetics = {};
  setGenotypeState('CYP2D6', 'null');
  const nul = { legacy:userGenetics.CYP2D6, detail:activeGenotypeDetails.CYP2D6, mult:getPhenotypeMult('CYP2D6') };
  return { poor, nul };
})()`);
assert(nullVsPoorAudit.poor.legacy === 'poor', 'CYP2D6 PM should remain legacy poor, not null');
assert(nullVsPoorAudit.poor.detail.mechanism !== 'inherited_no_function', 'CYP2D6 PM should not imply a known inherited-null state');
assert(nullVsPoorAudit.nul.legacy === 'null', 'CYP2D6 null should preserve the legacy null channel for null-aware PK');
assert(nullVsPoorAudit.nul.detail.mechanism === 'inherited_no_function', 'CYP2D6 null should preserve inherited no-function semantics');
assert(nullVsPoorAudit.nul.mult === 20, 'CYP2D6 null should retain null-aware exposure multiplier where the old model expects it');

const urlNullAudit = window.eval(`(() => {
  activeStack = [];
  userGenetics = {};
  activeGenotypeDetails = {};
  window.history.replaceState(null, '', '/index.html?substances=codeine,fluoxetine&genotype=CYP2D6:null&tab=pgx');
  loadUrlDemoState();
  return {
    phenotype:activeGenotype.CYP2D6,
    legacy:userGenetics.CYP2D6,
    detail:activeGenotypeDetails.CYP2D6,
    tab:activeTab,
  };
})()`);
assert(urlNullAudit.phenotype === 'poor_metabolizer', 'URL CYP2D6:null should use the PM calculation bucket');
assert(urlNullAudit.legacy === 'null', 'URL CYP2D6:null should preserve inherited null legacy state');
assert(urlNullAudit.detail.mechanism === 'inherited_no_function', 'URL CYP2D6:null should preserve no-function semantics');
assert(urlNullAudit.tab === 'genes-metabolites', 'Legacy pgx URL tab should route to Genes + Metabolites');

const publicNebivololNullDemoAudit = window.eval(`(() => {
  activeStack = [];
  userGenetics = {};
  activeGenotypeDetails = {};
  activeGenotype = {
    CYP2D6: GENOTYPE_PHENOTYPE.NM,
    CYP2C19: GENOTYPE_PHENOTYPE.NM,
    CYP2C9: GENOTYPE_PHENOTYPE.NM,
  };
  window.history.replaceState(null, '', '/index.html?substances=bupropion,clopidogrel,nebivolol&genotype=CYP2D6:null&tab=safety');
  loadUrlDemoState();
  renderAll();
  const interactions = findInteractions();
  const sameEnzymeInhibitor = interactions.find(i =>
    i.drug1 === 'Bupropion' &&
    i.drug2 === 'Nebivolol' &&
    i.enzyme === 'CYP2D6'
  );
  const bidirectionalPair = interactions.find(i =>
    i.drug1 === 'Bupropion' &&
    i.drug2 === 'Clopidogrel' &&
    i.evidenceRefs?.includes('ev_clopidogrel_bupropion_cyp2b6_turpeinen2005')
  );
  return {
    activeStack,
    activeTab,
    legacy:userGenetics.CYP2D6,
    phenotype:activeGenotype.CYP2D6,
    mechanism:activeGenotypeDetails.CYP2D6?.mechanism,
    nebivololFold:calcFold('Nebivolol').fold,
    bupropionFold:calcFold('Bupropion').fold,
    shareUrl:currentStackShareUrl('overview'),
    patientGeneSummary:currentHandoffGeneResultSummary({ patient:true }),
    foldText:document.getElementById('foldBody')?.textContent || '',
    hasSameEnzymeInhibitor:!!sameEnzymeInhibitor,
    bidirectionalMechanism:bidirectionalPair?.mechanism || '',
    bidirectionalRefs:bidirectionalPair?.evidenceRefs || [],
    hasBidirectionalPair:!!bidirectionalPair,
  };
})()`);
assert(
  publicNebivololNullDemoAudit.activeStack.join('|') === 'Bupropion|Clopidogrel|Nebivolol',
  'Public bupropion+clopidogrel+nebivolol demo should load all three drugs'
);
assert(publicNebivololNullDemoAudit.activeTab === 'overview', 'Public nebivolol null demo should open Overview tab from legacy safety alias');
assert(publicNebivololNullDemoAudit.legacy === 'null', 'Public nebivolol null demo should preserve CYP2D6 null legacy state');
assert(publicNebivololNullDemoAudit.phenotype === 'poor_metabolizer', 'Public nebivolol null demo should calculate with PM phenotype bucket');
assert(publicNebivololNullDemoAudit.mechanism === 'inherited_no_function', 'Public nebivolol null demo should preserve inherited no-function semantics');
assert(publicNebivololNullDemoAudit.nebivololFold === 15, 'CYP2D6 null should use the nebivolol PM/null monitoring fold, not an unsupported 23x escalation');
assert(publicNebivololNullDemoAudit.shareUrl.includes('genotype=CYP2D6:null'), 'Public nebivolol null demo share URL should preserve the reported CYP2D6:null token');
assert(publicNebivololNullDemoAudit.patientGeneSummary.includes('CYP2D6:null'), 'Public nebivolol null demo patient handoff should preserve the reported CYP2D6:null token');
assert(publicNebivololNullDemoAudit.foldText.includes('MONITOR') && !publicNebivololNullDemoAudit.foldText.includes('DANGER'), 'Public nebivolol null demo fold bar should be monitoring context, not a DANGER badge');
assert(publicNebivololNullDemoAudit.bupropionFold >= 1.6 && publicNebivololNullDemoAudit.bupropionFold <= 1.8, 'Clopidogrel should shift bupropion exposure through CYP2B6');
assert(!publicNebivololNullDemoAudit.hasSameEnzymeInhibitor, 'CYP2D6-null nebivolol should not show a bupropion CYP2D6-inhibition card');
assert(publicNebivololNullDemoAudit.hasBidirectionalPair, 'Public nebivolol null demo should include source-linked bupropion+clopidogrel pathway context');
assert(publicNebivololNullDemoAudit.bidirectionalMechanism.includes('Hydroxybupropion is harder to predict'), 'Public nebivolol null demo should not claim hydroxybupropion is simply lower in CYP2D6 null context');
assert(publicNebivololNullDemoAudit.bidirectionalRefs.includes('ev_bupropion_cyp2d6_hesse1996'), 'Public nebivolol null demo should cite hydroxybupropion CYP2D6 level/dose context');

const audienceModeRegression = window.eval(`(() => {
  activeStack = [];
  userGenetics = {};
  activeGenotypeDetails = {};
  activeGenotype = {
    CYP2D6: GENOTYPE_PHENOTYPE.NM,
    CYP2C19: GENOTYPE_PHENOTYPE.NM,
    CYP2C9: GENOTYPE_PHENOTYPE.NM,
  };
  window.history.replaceState(null, '', '/index.html?substances=warfarin,amiodarone&audience=patient&tab=review');
  loadUrlDemoState();
  renderAll();
  const patient = {
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
    firstUseOrder:[
      document.querySelector('.header .audience-wrap') ? 'audience' : '',
      ...[...document.querySelector('.input-rail')?.children || []]
        .map(el => el.classList?.contains('mode-toggle') ? 'mode' : el.classList?.contains('search-wrap') ? 'search' : el.id === 'selectedListSection' ? 'selected-list' : el.id === 'geneticsSection' ? 'gene-results' : '')
    ]
      .filter(Boolean),
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
    summaryText:document.getElementById('summaryBar')?.textContent || '',
    summaryStoryCount:document.querySelectorAll('#summaryBar .summary-story-row').length,
    summaryNext:document.querySelector('#summaryBar .summary-next')?.textContent || '',
    summaryRisk:document.querySelector('#summaryBar .summary-risk')?.textContent || '',
    findingTitle:document.getElementById('findingTitle')?.textContent || '',
    findingCount:document.getElementById('findingCount')?.textContent || '',
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
    actionRows:document.querySelectorAll('#findingBody .finding-actions').length,
    detailButtons:document.querySelectorAll('#findingBody .related-finding-btn.secondary').length,
    supportDetails:document.querySelectorAll('#findingBody .finding-support-details').length,
    findingText:document.getElementById('findingBody')?.textContent || '',
    patientQuestionCards:document.querySelectorAll('#findingBody .patient-question-card').length,
    patientMeaningCards:document.querySelectorAll('#findingBody .patient-meaning-card').length,
    patientStackSummary:document.querySelector('#findingBody .patient-stack-summary')?.textContent || '',
    severityLabels:[...document.querySelectorAll('#findingBody .finding-sev, #findingBody .patient-question-tag')].map(el => el.textContent.trim()),
    scopeDisplay:document.getElementById('scopeSection')?.style.display || '',
    scopeText:document.getElementById('scopeBody')?.textContent || '',
    riskDisplay:document.getElementById('riskSection')?.style.display || '',
    riskText:document.getElementById('riskBody')?.textContent || '',
    altExists:!!document.getElementById('altSection'),
    altDisplay:document.getElementById('altSection')?.style.display || '',
    altText:document.getElementById('altBody')?.textContent || '',
    shareUrl:currentStackShareUrl(),
  };
  setAudienceMode('clinician');
  const clinician = {
    audienceMode,
    bodyAudience:document.body.dataset.audience,
    tagline:document.getElementById('audienceTagline')?.textContent || '',
    searchPlaceholder:document.getElementById('searchInput')?.getAttribute('placeholder') || '',
    listTitle:document.getElementById('listTitle')?.textContent || '',
    medCount:document.getElementById('medCount')?.textContent || '',
    geneIntro:document.getElementById('geneSectionIntro')?.textContent || '',
    tabBarDisplay:document.getElementById('tabBar')?.style.display || '',
    summaryText:document.getElementById('summaryBar')?.textContent || '',
    summaryStoryCount:document.querySelectorAll('#summaryBar .summary-story-row').length,
    summaryNext:document.querySelector('#summaryBar .summary-next')?.textContent || '',
    findingTitle:document.getElementById('findingTitle')?.textContent || '',
    firstFindingText:document.querySelector('#findingBody .primary-finding-card')?.textContent || '',
    doseSelects:document.querySelectorAll('#medList .dose-select').length,
    removeButtons:document.querySelectorAll('#medList button.x').length,
    clinicianLayoutCss:[...document.querySelectorAll('style')].some(style => {
      const css = style.textContent || '';
      return css.includes('body[data-audience="clinician"] .input-rail{display:flex}')
        && css.includes('body[data-audience="clinician"] #geneticsSection{order:2}')
        && css.includes('body[data-audience="clinician"] .result-area{order:3}');
    }),
    compactMedListCss:[...document.querySelectorAll('style')].some(style => {
      const css = style.textContent || '';
      return css.includes('.med-chip{display:grid;grid-template-columns:minmax(0,1fr) minmax(90px,128px) 44px')
        && css.includes('.med-chip .x{grid-column:3');
    }),
    reviewButtonDisplay:document.getElementById('tabbtn-review')?.style.display || '',
    reviewPanelDisplay:document.getElementById('tab-review')?.style.display || '',
    diagnosticPanelDisplays:[
      document.getElementById('interSection')?.style.display || '',
      document.getElementById('comboSection')?.style.display || '',
      document.getElementById('matrixSection')?.style.display || '',
    ],
    scopeDisplay:document.getElementById('scopeSection')?.style.display || '',
    scopeText:document.getElementById('scopeBody')?.textContent || '',
    circulatingDisplay:document.getElementById('circulatingSection')?.style.display || '',
    circulatingCount:document.getElementById('circulatingCount')?.textContent || '',
    circulatingCards:document.querySelectorAll('#circulatingBody .circulating-card').length,
    circulatingText:document.getElementById('circulatingBody')?.textContent || '',
    actionRows:document.querySelectorAll('#findingBody .finding-actions').length,
    supportDetails:document.querySelectorAll('#findingBody .finding-support-details').length,
  };
  return { patient, clinician };
})()`);
assert(audienceModeRegression.patient.audienceMode === 'patient', 'Audience URL should set Patient mode');
assert(audienceModeRegression.patient.bodyAudience === 'patient', 'Patient mode should mark body data-audience');
assert(audienceModeRegression.patient.activeTab === 'overview', 'Patient mode should force the Overview tab');
assert(/prepare medicine-list questions|doctor or pharmacist/i.test(audienceModeRegression.patient.tagline), 'Patient mode should use patient-facing app tagline');
assert(/Search medicines, supplements, or foods/i.test(audienceModeRegression.patient.searchPlaceholder), 'Patient mode should use patient-facing search placeholder');
assert(audienceModeRegression.patient.listTitle === 'My Medicine List', 'Patient mode should use patient-facing selected-list label');
assert(audienceModeRegression.patient.firstUseOrder.join('|').startsWith('audience|mode|search|selected-list|gene-results'),
  `Clinical Calm shell should keep audience in the header, then add controls and Gene Results in the rail; got ${audienceModeRegression.patient.firstUseOrder.join('|')}`);
assert(audienceModeRegression.patient.modeGroupLabel === 'Choose how to add items', 'Search/Browse mode group should describe the add-choice control');
assert(audienceModeRegression.patient.modeLabels.join('|') === 'Search by Name|Browse Categories', 'Search/Browse mode labels should describe add modes, not submit actions');
assert(audienceModeRegression.patient.modeTags.join('|') === 'BUTTON|BUTTON', 'Search/Browse mode controls should be keyboard-accessible buttons');
assert(audienceModeRegression.patient.modePressed.join('|') === 'true|false', 'Search/Browse mode controls should expose the selected state');
assert(audienceModeRegression.patient.compactChromeCss, 'V1 chrome should keep add-mode controls compact and database stats off the work surface');
assert(audienceModeRegression.patient.browsePressedAfterToggle.join('|') === 'false|true', 'Browse mode control should expose the selected state after toggle');
assert(/2 items selected/i.test(audienceModeRegression.patient.medCount), 'Patient mode should use plain selected-item count copy');
assert(!/substances?/i.test(audienceModeRegression.patient.medCount), 'Patient mode selected-list count should not use substance terminology');
assert(audienceModeRegression.patient.doseSelects === 0, 'Patient mode selected list should not expose clinician dose-tier selectors');
assert(audienceModeRegression.patient.removeButtons === 2, 'Patient mode selected list should use compact removable item buttons');
assert(audienceModeRegression.patient.patientLayoutCss, 'Patient mode should keep optional gene controls with the list before safety results');
assert(/Gene Results/i.test(audienceModeRegression.patient.geneTitle) && /Do not guess|original report|doctor or pharmacist/i.test(audienceModeRegression.patient.geneIntro), 'Patient mode should use patient-facing gene helper copy');
assert(!/Genes \+ Metabolites tab|source-linked|parent drugs|PK timing|pathway activity|metabolite balance/i.test(
  `${audienceModeRegression.patient.tagline} ${audienceModeRegression.patient.geneIntro}`
), 'Patient mode should not refer to hidden clinician tabs or technical tagline copy');
assert(audienceModeRegression.patient.tabBarDisplay === 'none', 'Patient mode should hide clinician tab navigation');
assert(audienceModeRegression.patient.summaryStoryCount === 0, 'Patient mode top summary should stay compact and leave detailed explanation to Safety Notes');
assert(/questions? ready for your list/i.test(audienceModeRegression.patient.summaryText),
  'Patient mode top summary should orient around prepared questions');
assert(!/Can you check/i.test(audienceModeRegression.patient.summaryText),
  'Patient mode top summary should leave exact question wording to Safety Notes');
assert(!/higher-priority safety note was found|safety note was found for this list/i.test(audienceModeRegression.patient.summaryText),
  'Patient mode top summary should not repeat report-style safety-note body copy before Safety Notes');
assert(!/\bView note\b/i.test(audienceModeRegression.patient.summaryText),
  'Patient mode top summary should not show a redundant jump link when Safety Notes are directly below');
assert(/Next step|medication review|share this screen/i.test(audienceModeRegression.patient.summaryNext), 'Patient mode compact summary should still keep a plain next-step line');
assert(audienceModeRegression.patient.summaryRisk.trim() === '', 'Patient mode should hide summary score badges');
assert(audienceModeRegression.patient.findingTitle === 'Safety Notes', 'Patient mode should rename findings to Safety Notes');
assert(/safety notes?/i.test(audienceModeRegression.patient.findingCount), 'Patient mode should label public finding count as safety notes');
assert(audienceModeRegression.patient.patientQuestionCards > 0, 'Patient mode should render dedicated question cards');
assert(/What to ask[\s\S]*For this list/i.test(audienceModeRegression.patient.findingText),
  'Patient mode should make the question primary before the reason text');
assert(!audienceModeRegression.patient.patientStackSummary,
  'Patient mode should not repeat the top summary before visible Safety Notes');
assert(audienceModeRegression.patient.patientMeaningCards === 0, 'Patient mode should not duplicate the same findings in a separate meaning grid');
assert(audienceModeRegression.patient.exposureSummaryCount === 0, 'Patient mode should hide technical exposure summary rows from the selected list');
assert(audienceModeRegression.patient.actionRows === 0, 'Patient mode should not render empty clinician action rows on patient question cards');
assert(audienceModeRegression.patient.detailButtons === 0, 'Patient mode should hide clinician supporting-detail buttons');
assert(audienceModeRegression.patient.supportDetails === 0, 'Patient mode should hide clinician supporting detail drawers');
assert(!/What this means/.test(audienceModeRegression.patient.findingText), 'Patient mode should fold the old meaning section into the synthesis summary');
assert(/Do not start, stop, switch, or change medicines on your own|Bring this list to a doctor or pharmacist/i.test(audienceModeRegression.patient.findingText), 'Patient mode should use a plain-language bring-to-clinician footer');
assert(!/(?:Technical details remain available in Review|Detailed technical context|pathway, metabolite, timing, and evidence signals|clinical concerns)/i.test(
  audienceModeRegression.patient.findingText
), 'Patient mode should not expose clinician-only Overview footer language');
assert(audienceModeRegression.patient.scopeDisplay === 'none', 'Patient mode should hide the reviewer-only console scope panel');
assert(!String(audienceModeRegression.patient.scopeText || '').replace(/\s+/g, ' ').trim(), 'Patient mode should not render hidden reviewer console scope copy');
assert(!/\b(?:AUC|Cmax|RxNorm|PGx|PMID|source-linked|modeled|confidence|clinical review needed|pharmacogenomics|metabolite-level|CYP\d)/i.test(
  `${audienceModeRegression.patient.tagline} ${audienceModeRegression.patient.geneIntro} ${audienceModeRegression.patient.summaryText} ${audienceModeRegression.patient.findingText} ${audienceModeRegression.patient.medListText} ${audienceModeRegression.patient.scopeText}`
), 'Patient mode should avoid clinician-only technical vocabulary in visible Overview copy');
assert(audienceModeRegression.patient.severityLabels.length > 0 && audienceModeRegression.patient.severityLabels.every(label => !/^(critical|severe|moderate|monitor|info)$/i.test(label)),
  `Patient mode should use plain priority labels instead of raw severity labels: ${audienceModeRegression.patient.severityLabels.join(', ')}`);
assert(audienceModeRegression.patient.riskDisplay === 'none', 'Patient mode should hide the score-style risk panel');
assert(!String(audienceModeRegression.patient.riskText || '').replace(/\s+/g, ' ').trim(), 'Patient mode should clear hidden score-style risk text');
assert(!audienceModeRegression.patient.altExists, 'Patient mode should not expose an alternatives panel');
assert(!String(audienceModeRegression.patient.altText || '').replace(/\s+/g, ' ').trim(), 'Patient mode should clear hidden clinician alternative text');
assert(audienceModeRegression.patient.shareUrl.includes('audience=patient'), 'Patient-mode share URL should preserve audience mode');
assert(audienceModeRegression.clinician.audienceMode === 'clinician', 'Clinician mode should restore clinician state');
assert(audienceModeRegression.clinician.bodyAudience === 'clinician', 'Clinician mode should mark body data-audience');
assert(/Mechanistic medication intelligence for source-linked review/i.test(audienceModeRegression.clinician.tagline), 'Clinician mode should restore clinician workbench tagline');
assert(/Medication, supplement, or food/i.test(audienceModeRegression.clinician.searchPlaceholder), 'Clinician mode should restore clinician search placeholder');
assert(audienceModeRegression.clinician.listTitle === 'Selected List', 'Clinician mode should restore selected-list label');
assert(/2 substances/i.test(audienceModeRegression.clinician.medCount), 'Clinician mode should keep substance count copy');
assert(audienceModeRegression.clinician.doseSelects > 0, 'Clinician mode should keep dose-tier selectors for supported medications');
assert(audienceModeRegression.clinician.removeButtons === 2, 'Clinician mode selected list should use compact removable item buttons');
assert(audienceModeRegression.clinician.compactMedListCss, 'Clinician mode should render selected medicines as compact rows');
assert(audienceModeRegression.clinician.clinicianLayoutCss, 'Clinician mode should keep optional gene controls with the selected list before results');
assert(/Genes \+ Metabolites|functional phenotype|parent\/metabolite direction|pathway consequences/i.test(audienceModeRegression.clinician.geneIntro), 'Clinician mode should restore clinician gene helper copy');
assert(audienceModeRegression.clinician.tabBarDisplay !== 'none', 'Clinician mode should show tab navigation');
assert(audienceModeRegression.clinician.summaryStoryCount === 0, 'Clinician mode should leave detailed rationale/action rows to the first priority card');
assert(/Clinical Review Priorities/i.test(audienceModeRegression.clinician.summaryText), 'Clinician mode should orient the top summary around review priorities');
assert(/source detail is in Evidence|Use the first card/i.test(audienceModeRegression.clinician.summaryText), 'Clinician mode should use the top summary for orientation and routing');
assert(/Use the first card|open Evidence/i.test(audienceModeRegression.clinician.summaryNext), 'Clinician mode should route details instead of repeating the card action');
assert(audienceModeRegression.clinician.findingTitle === 'Clinical Review Priorities', 'Clinician mode should use a mixed drug/PGx priority title');
assert(/Review first/i.test(audienceModeRegression.clinician.firstFindingText) && /Review focus/i.test(audienceModeRegression.clinician.firstFindingText), 'Clinician mode should mark the first Overview card as the first review priority');
assert(audienceModeRegression.clinician.circulatingDisplay !== 'none', 'Clinician Overview should show circulating/exposure context');
assert(audienceModeRegression.clinician.circulatingCards > 0, 'Clinician Overview should render circulating cards');
assert(/parent|metabolite|current stack|CYP/i.test(audienceModeRegression.clinician.circulatingText), 'Clinician circulating cards should include actor context');
assert(audienceModeRegression.clinician.reviewButtonDisplay === 'none', 'Clinician V1 mode should hide reviewer-only console navigation');
assert(audienceModeRegression.clinician.reviewPanelDisplay === 'none', 'Clinician V1 mode should keep the reviewer panel hidden');
assert(audienceModeRegression.clinician.diagnosticPanelDisplays.every(value => value === 'none'),
  `Clinician V1 mode should keep raw reviewer diagnostic panels hidden; got ${audienceModeRegression.clinician.diagnosticPanelDisplays.join('|')}`);
assert(audienceModeRegression.clinician.scopeDisplay === 'none', 'Clinician V1 mode should hide reviewer-only console scope');
assert(!String(audienceModeRegression.clinician.scopeText || '').replace(/\s+/g, ' ').trim(), 'Clinician V1 mode should not render reviewer-only console scope copy');
assert(audienceModeRegression.clinician.actionRows > 0, 'Clinician mode should restore finding action rows');
assert(audienceModeRegression.clinician.supportDetails > 0, 'Clinician mode should show supporting detail drawers');

const handoffAudienceRegression = window.eval(`(() => {
  setAudienceMode('patient');
  const patientText = buildOverviewHandoffText();
  const patientAria = document.getElementById('summaryCopyText')?.getAttribute('aria-label') || '';
  setAudienceMode('clinician');
  const clinicianText = buildOverviewHandoffText();
  const clinicianAria = document.getElementById('summaryCopyText')?.getAttribute('aria-label') || '';
  return { patientText, clinicianText, patientAria, clinicianAria };
})()`);
assert(/Handoff type: patient question list/i.test(handoffAudienceRegression.patientText), 'Patient handoff should identify itself as a question list');
assert(/Generated from local Diognosis/i.test(handoffAudienceRegression.patientText) && /no patient-specific data was uploaded/i.test(handoffAudienceRegression.patientText),
  'Patient handoff should carry the local-data boundary');
assert(!/V1 scope|Clinical context still needed|clinician\/pharmacist medication-review/i.test(handoffAudienceRegression.patientText),
  'Patient handoff should not expose clinician-only report sections');
assert(/Handoff type: clinician\/pharmacist medication-review handoff/i.test(handoffAudienceRegression.clinicianText),
  'Clinician handoff should identify itself as a clinician/pharmacist handoff');
assert(['V1 scope', 'Clinical context still needed', 'Top concerns', 'Boundaries'].every(section => handoffAudienceRegression.clinicianText.includes(section)),
  'Clinician handoff should preserve report sections');
assert(/Selected gene\/marker results:/i.test(handoffAudienceRegression.clinicianText),
  'Clinician handoff should include selected gene/marker result summary');
assert(/question list/i.test(handoffAudienceRegression.patientAria) && /clinician handoff/i.test(handoffAudienceRegression.clinicianAria),
  'Copy fallback aria labels should match Patient versus Clinician handoff types');

const emptyAudienceListRegression = window.eval(`(() => {
  activeStack = [];
  userGenetics = {};
  activeGenotypeDetails = {};
  activeGenotype = {
    CYP2D6: GENOTYPE_PHENOTYPE.NM,
    CYP2C19: GENOTYPE_PHENOTYPE.NM,
    CYP2C9: GENOTYPE_PHENOTYPE.NM,
  };
  window.history.replaceState(null, '', '/index.html?audience=patient');
  loadUrlDemoState();
  renderAll();
  const patient = {
    audienceMode,
    medListText:document.getElementById('medList')?.textContent || '',
    medCount:document.getElementById('medCount')?.textContent || '',
    mainEmptyText:document.getElementById('mainEmptyState')?.textContent || '',
  };
  setAudienceMode('clinician');
  const clinician = {
    audienceMode,
    medListText:document.getElementById('medList')?.textContent || '',
    medCount:document.getElementById('medCount')?.textContent || '',
  };
  return { patient, clinician };
})()`);
assert(emptyAudienceListRegression.patient.audienceMode === 'patient', 'Empty selected-list regression should enter Patient mode');
assert(/Add medicines, supplements, or foods above to start a list for your doctor or pharmacist/i.test(emptyAudienceListRegression.patient.medListText),
  'Patient empty selected-list state should give patient-facing start guidance');
assert(!/interact|substances?/i.test(emptyAudienceListRegression.patient.medListText),
  'Patient empty selected-list state should avoid clinician-oriented interaction/substance wording');
assert(emptyAudienceListRegression.patient.medCount.trim() === '', 'Patient empty selected-list state should not show a count');
assert(/doctor or pharmacist/i.test(emptyAudienceListRegression.patient.mainEmptyText), 'Patient empty start state should orient around doctor/pharmacist follow-up');
assert(!/\b(?:Switch to Clinician|clinical context|source-linked|metabolites?|PGx|CYP\d|AUC|Cmax|pharmacogenomic)\b/i.test(emptyAudienceListRegression.patient.mainEmptyText),
  'Patient empty start state should avoid clinician-only technical copy');
assert(emptyAudienceListRegression.clinician.audienceMode === 'clinician', 'Empty selected-list regression should return to Clinician mode');
assert(/Add medications, supplements, or foods above to start a mechanistic review/i.test(emptyAudienceListRegression.clinician.medListText),
  'Clinician empty selected-list state should keep mechanistic-review guidance');
assert(emptyAudienceListRegression.clinician.medCount.trim() === '', 'Clinician empty selected-list state should not show a count');

const patientGeneResultListRegression = window.eval(`(() => {
  activeStack = [];
  userGenetics = {};
  activeGenotypeDetails = {};
  activeGenotype = {
    CYP2D6: GENOTYPE_PHENOTYPE.NM,
    CYP2C19: GENOTYPE_PHENOTYPE.NM,
    CYP2C9: GENOTYPE_PHENOTYPE.NM,
  };
  window.history.replaceState(null, '', '/index.html?substances=clopidogrel,omeprazole&genotype=CYP2C19:PM&audience=patient&tab=overview');
  loadUrlDemoState();
  renderComputationCache = null;
  renderAll();
  const patient = {
    audienceMode,
    medListText:document.getElementById('medList')?.textContent || '',
    doseSelects:document.querySelectorAll('#medList .dose-select').length,
    exposureSummaryCount:document.querySelectorAll('#medList .exposure-summary').length,
    summaryExposureCount:document.querySelectorAll('#summaryBar .summary-exposure-strip').length,
    summaryText:document.getElementById('summaryBar')?.textContent || '',
    findingText:document.getElementById('findingBody')?.textContent || '',
  };
  setAudienceMode('clinician');
  const clinician = {
    exposureSummaryCount:document.querySelectorAll('#medList .exposure-summary').length,
    summaryExposureCount:document.querySelectorAll('#summaryBar .summary-exposure-strip').length,
    doseSelects:document.querySelectorAll('#medList .dose-select').length,
    medListText:document.getElementById('medList')?.textContent || '',
    summaryText:document.getElementById('summaryBar')?.textContent || '',
  };
  return { patient, clinician };
})()`);
assert(patientGeneResultListRegression.patient.audienceMode === 'patient', 'Patient gene-result selected-list regression should stay in Patient mode');
assert(patientGeneResultListRegression.patient.doseSelects === 0, 'Patient gene-result selected list should not expose dose-tier selectors');
assert(patientGeneResultListRegression.patient.exposureSummaryCount === 0, 'Patient gene-result selected list should hide exposure summary rows');
assert(patientGeneResultListRegression.patient.summaryExposureCount === 0, 'Patient gene-result summary should hide technical exposure snapshot');
assert(!/\b(?:AUC|Cmax|metabolite-level|active thiol|CYP\d|clearance|confidence|parent\s+[↑↓]|direction only)\b/i.test(
  patientGeneResultListRegression.patient.medListText
), 'Patient gene-result selected list should not expose technical metabolite/level rows');
assert(patientGeneResultListRegression.clinician.exposureSummaryCount === 0, 'Clinician selected list should keep exposure detail out of the sidebar');
assert(patientGeneResultListRegression.clinician.summaryExposureCount > 0, 'Clinician mode should keep exposure summary rows for gene-result stacks');
assert(patientGeneResultListRegression.clinician.doseSelects > 0, 'Clinician mode should keep dose-tier controls for gene-result stacks');
assert(/\b(?:CYP\d|metabolite|parent|higher|lower)\b/i.test(patientGeneResultListRegression.clinician.summaryText),
  'Clinician summary should retain technical exposure context');

const patientActiveMetaboliteFallbackRegression = window.eval(`(() => {
  activeStack = [];
  userGenetics = {};
  activeGenotypeDetails = {};
  activeGenotype = {
    CYP2D6: GENOTYPE_PHENOTYPE.NM,
    CYP2C19: GENOTYPE_PHENOTYPE.NM,
    CYP2C9: GENOTYPE_PHENOTYPE.NM,
  };
  window.history.replaceState(null, '', '/index.html?substances=bupropion,tamoxifen&audience=patient&tab=overview');
  loadUrlDemoState();
  renderComputationCache = null;
  renderAll();
  return {
    audienceMode,
    activeStack,
    findingTitle:document.getElementById('findingTitle')?.textContent || '',
    visibleText:[
      document.getElementById('summaryBar')?.textContent || '',
      document.getElementById('medList')?.textContent || '',
      document.getElementById('findingBody')?.textContent || '',
    ].join(' '),
  };
})()`);
assert(patientActiveMetaboliteFallbackRegression.audienceMode === 'patient', 'Active-metabolite fallback regression should run in Patient mode');
assert(patientActiveMetaboliteFallbackRegression.activeStack.join('|') === 'Bupropion|Tamoxifen',
  'Active-metabolite fallback regression should load Bupropion + Tamoxifen');
assert(patientActiveMetaboliteFallbackRegression.findingTitle === 'Safety Notes', 'Active-metabolite fallback should render Patient Safety Notes');
assert(!/\b(?:undefined|NaN|\[object Object\])\b/i.test(patientActiveMetaboliteFallbackRegression.visibleText),
  'Patient active-metabolite fallback copy should not expose undefined/NaN/object text');

const singleItemSummaryJumpRegression = window.eval(`(() => {
  activeStack = [];
  userGenetics = {};
  activeGenotypeDetails = {};
  activeGenotype = {
    CYP2D6: GENOTYPE_PHENOTYPE.NM,
    CYP2C19: GENOTYPE_PHENOTYPE.NM,
    CYP2C9: GENOTYPE_PHENOTYPE.NM,
  };
  window.history.replaceState(null, '', '/index.html?substances=mystery-mix&audience=patient&tab=overview');
  loadUrlDemoState();
  renderAll();
  const patient = {
    activeStack,
    findingDisplay:document.getElementById('findingSection')?.style.display || '',
    summaryJumpCount:document.querySelectorAll('#summaryBar .summary-jump').length,
    summaryText:document.getElementById('summaryBar')?.textContent || '',
  };
  setAudienceMode('clinician');
  const clinician = {
    findingDisplay:document.getElementById('findingSection')?.style.display || '',
    summaryJumpCount:document.querySelectorAll('#summaryBar .summary-jump').length,
    summaryText:document.getElementById('summaryBar')?.textContent || '',
  };
  return { patient, clinician };
})()`);
assert(singleItemSummaryJumpRegression.patient.activeStack.join('|') === 'Mystery Mix', 'Single-item summary jump regression should preserve the unrecognized selection');
assert(singleItemSummaryJumpRegression.patient.findingDisplay === 'none', 'Patient single-item mode should hide Safety Notes when no note exists');
assert(singleItemSummaryJumpRegression.patient.summaryJumpCount === 0, 'Patient single-item mode should not show a View note jump to a hidden section');
assert(/Current Check/i.test(singleItemSummaryJumpRegression.patient.summaryText), 'Patient single-item mode should label the summary as a current check when no safety note exists');
assert(/Add another medicine to check the list/i.test(singleItemSummaryJumpRegression.patient.summaryText), 'Patient single-item mode should keep add-another-medicine guidance');
assert(singleItemSummaryJumpRegression.clinician.findingDisplay === 'none', 'Clinician single-item mode should hide findings when no finding exists');
assert(singleItemSummaryJumpRegression.clinician.summaryJumpCount === 0, 'Clinician single-item mode should not show a View finding jump to a hidden section');

const olderAdultDemoPriorityRegression = window.eval(`(() => {
  activeStack = [];
  userGenetics = {};
  activeGenotypeDetails = {};
  activeGenotype = {
    CYP2D6: GENOTYPE_PHENOTYPE.NM,
    CYP2C19: GENOTYPE_PHENOTYPE.NM,
    CYP2C9: GENOTYPE_PHENOTYPE.NM,
  };
  window.history.replaceState(null, '', '/index.html?substances=amitriptyline,diazepam,diphenhydramine,oxycodone&tab=overview');
  loadUrlDemoState();
  renderComputationCache = null;
  renderAll();
  return {
    activeStack,
    activeTab,
    priority:getHighestGenotypePrioritySignal(),
    summaryText:document.getElementById('summaryBar')?.textContent || '',
    findingText:document.getElementById('findingBody')?.textContent || '',
    cards:document.querySelectorAll('#findingBody .primary-finding-card, #findingBody .patient-question-card').length,
  };
})()`);
assert(olderAdultDemoPriorityRegression.activeStack.join('|') === 'Amitriptyline|Diazepam|Diphenhydramine|Oxycodone',
  'Older-adult demo URL should load the documented four-drug stack');
assert(olderAdultDemoPriorityRegression.activeTab === 'overview', 'Older-adult demo URL should open Overview');
assert(olderAdultDemoPriorityRegression.cards > 0, 'Older-adult demo should render Overview findings');
assert(!olderAdultDemoPriorityRegression.priority || !/normal metabolizer|reference state/i.test(olderAdultDemoPriorityRegression.priority.summary || ''),
  'Default normal-genotype metabolite context should not become the top genotype priority');
assert(!/genotype may|CYP2D6 genotype|normal metabolizer/i.test(olderAdultDemoPriorityRegression.summaryText),
  'Older-adult demo summary should not be led by default normal-genotype context');
assert(/sedation|fall|anticholinergic|burden|Amitriptyline|Diazepam|Diphenhydramine|Oxycodone/i.test(
  `${olderAdultDemoPriorityRegression.summaryText} ${olderAdultDemoPriorityRegression.findingText}`
), 'Older-adult demo should surface burden-oriented safety context');

const nebivololPgxDisplayRegression = window.eval(`(() => {
  activeStack = ['Nebivolol'];
  if (typeof setAudienceMode === "function") setAudienceMode("clinician", { render:false });
  userGenetics = {};
  activeGenotypeDetails = {};
  activeGenotype = {
    CYP2D6: GENOTYPE_PHENOTYPE.PM,
    CYP2C19: GENOTYPE_PHENOTYPE.NM,
    CYP2C9: GENOTYPE_PHENOTYPE.NM,
  };
  renderComputationCache = null;
  if (window.HTMLElement) window.HTMLElement.prototype.scrollIntoView = function() { this.dataset.focusScrolled = 'yes'; };
  renderAll();
  const priority = getHighestGenotypePrioritySignal();
  const summaryText = document.querySelector('.summary-card')?.textContent || '';
  const genotypeText = document.getElementById('genotypeBody')?.textContent || '';
  focusPriorityFinding(priority.targetTab, priority.targetElementId);
  return {
    fold:calcFold('Nebivolol').fold,
    priority,
    summaryText,
    genotypeText,
  };
})()`);
await new Promise(resolve => setTimeout(resolve, 30));
const nebivololPgxFocusRegression = window.eval(`(() => {
  const target = document.getElementById('${nebivololPgxDisplayRegression.priority.targetElementId}');
  return {
    activeTab,
    targetText:target?.textContent || '',
    highlighted:!!target?.classList.contains('focus-pulse'),
    scrolled:target?.dataset.focusScrolled === 'yes',
  };
})()`);
assert(nebivololPgxDisplayRegression.fold === 15, 'Nebivolol + CYP2D6 PM should use the observed drug-specific 15x clinical fold');
assert(/15x/i.test(nebivololPgxDisplayRegression.summaryText), 'Nebivolol priority summary should show the drug-specific 15x fold');
assert(/CYP2D6 clinical PK data/i.test(nebivololPgxDisplayRegression.summaryText), 'Nebivolol priority summary should explain the PK basis');
assert(/4-hydroxy-nebivolol formation may fall/i.test(nebivololPgxDisplayRegression.summaryText), 'Nebivolol priority summary should explain active-metabolite formation can fall while parent exposure rises');
assert(/does not recommend a routine dose change/i.test(nebivololPgxDisplayRegression.summaryText), 'Nebivolol priority summary should not imply an automatic genotype-only dose change');
assert(!/Codeine|Tamoxifen|TCAs/i.test(`${nebivololPgxDisplayRegression.summaryText} ${nebivololPgxDisplayRegression.genotypeText}`), 'Nebivolol genotype display should not inherit unrelated CYP2D6 example-drug text');
assert(/15\.0×|15\.0x/i.test(nebivololPgxFocusRegression.targetText), 'Nebivolol genotype card should display the 15x fold');
assert(nebivololPgxFocusRegression.activeTab === 'genes-metabolites', 'Priority View finding should open Genes + Metabolites for genotype priorities');
assert(nebivololPgxFocusRegression.highlighted && nebivololPgxFocusRegression.scrolled, 'Priority View finding should scroll to and highlight the target genotype card');

const clinicalFoldMatrixRegression = window.eval(`(() => {
  const cases = [
    { drug:'Flecainide', gene:'CYP2D6', expected:2.5 },
    { drug:'Omeprazole', gene:'CYP2C19', expected:5.0 },
    { drug:'Codeine', gene:'CYP2D6', expected:1.0, neutralParent:true },
    { drug:'Tramadol', gene:'CYP2D6', expected:1.0, neutralParent:true },
    { drug:'Tamoxifen', gene:'CYP2D6', expected:0.25 },
    { drug:'Clopidogrel', gene:'CYP2C19', expected:0.36 },
  ];
  return cases.map(({ drug, gene, expected, neutralParent }) => {
    activeStack = [drug];
    userGenetics = {};
    activeGenotypeDetails = {};
    activeGenotype = {
      CYP2D6: GENOTYPE_PHENOTYPE.NM,
      CYP2C19: GENOTYPE_PHENOTYPE.NM,
      CYP2C9: GENOTYPE_PHENOTYPE.NM,
      [gene]: GENOTYPE_PHENOTYPE.PM,
    };
    renderComputationCache = null;
    renderAll();
    const priority = getHighestGenotypePrioritySignal();
    const summaryText = document.querySelector('.summary-card')?.textContent || '';
    const genotypeText = document.getElementById('genotypeBody')?.textContent || '';
    return {
      drug,
      gene,
      expected,
      neutralParent:!!neutralParent,
      fold:calcFold(drug).fold,
      targetTab:priority?.targetTab || '',
      targetElementId:priority?.targetElementId || '',
      leakedExamples:/Codeine →|Tamoxifen →|TCAs/i.test(summaryText + ' ' + genotypeText),
    };
  });
})()`);
for (const row of clinicalFoldMatrixRegression) {
  assert(
    Math.abs(row.fold - row.expected) < 0.01,
    row.neutralParent
      ? `${row.drug} ${row.gene} PM should keep parent fold neutral and route actionability through active-metabolite formation, got ${row.fold}x`
      : `${row.drug} ${row.gene} PM should use observed clinical fold ${row.expected}x, not route-diluted ${row.fold}x`
  );
  assert(row.targetTab && row.targetElementId, `${row.drug} ${row.gene} PM should expose a functional View finding target`);
  assert(!row.leakedExamples, `${row.drug} ${row.gene} PM should not leak unrelated CYP2D6 example text`);
}

const urlReportedValueAudit = window.eval(`(() => {
  activeStack = [];
  activeGenotypeDetails = {};
  userGenetics = {};
  window.history.replaceState(null, '', '/index.html?substances=tacrolimus,busulfan&genotype=CYP3A5:non_expresser&genotype=GSTM1:null&genotype=GSTT1:null&tab=pgx');
  loadUrlDemoState();
  return {
    cyp3a5: { phenotype:activeGenotype.CYP3A5, legacy:userGenetics.CYP3A5, detail:activeGenotypeDetails.CYP3A5 },
    gstm1: { phenotype:activeGenotype.GSTM1, legacy:userGenetics.GSTM1, detail:activeGenotypeDetails.GSTM1 },
    gstt1: { phenotype:activeGenotype.GSTT1, legacy:userGenetics.GSTT1, detail:activeGenotypeDetails.GSTT1 },
    params:parseQueryParams(window.location.search).genotype,
  };
})()`);
assert(Array.isArray(urlReportedValueAudit.params) && urlReportedValueAudit.params.length === 3, 'Repeated URL genotype params should preserve every reported value');
assert(urlReportedValueAudit.cyp3a5.detail.reportedLabel === 'non_expresser', 'URL CYP3A5 should preserve reported non_expresser value');
assert(urlReportedValueAudit.cyp3a5.detail.functionalState === 'CYP3A5 non-expresser', 'URL CYP3A5 non_expresser should display as expression status');
assert(urlReportedValueAudit.cyp3a5.legacy === 'poor', 'URL CYP3A5 non_expresser should not use legacy null');
assert(urlReportedValueAudit.gstm1.detail.reportedLabel === 'null' && urlReportedValueAudit.gstt1.detail.reportedLabel === 'null', 'URL GSTM1/GSTT1 should preserve reported null value');
assert(urlReportedValueAudit.gstm1.legacy === 'poor' && urlReportedValueAudit.gstt1.legacy === 'poor', 'URL GSTM1/GSTT1 null should not use legacy null');

const nullPhenoconversionAudit = window.eval(`(() => {
  activeStack = ['Metoprolol'];
  userGenetics = {};
  activeGenotypeDetails = {};
  setGenotypeState('CYP2D6', 'null');
  const nullOnly = calcFold('Metoprolol');
  activeStack = ['Metoprolol', 'Fluoxetine'];
  const nullPlusInhibitor = calcFold('Metoprolol');
  return {
    nullFold:nullOnly.fold,
    inhibitorFold:nullPlusInhibitor.fold,
    nullDetail:activeGenotypeDetails.CYP2D6,
  };
})()`);
assert(
  nullPhenoconversionAudit.inhibitorFold === nullPhenoconversionAudit.nullFold,
  `Inherited CYP2D6 null should not be phenoconverted again by an inhibitor (${nullPhenoconversionAudit.nullFold} vs ${nullPhenoconversionAudit.inhibitorFold})`
);
assert(
  nullPhenoconversionAudit.nullDetail.functionalState.includes('no-function CYP2D6'),
  'CYP2D6 null detail should explain tissue-wide no-function semantics'
);

const expandedGenotypeRuleAudit = window.eval(`(() => {
  activeGenotype = {
    CYP2D6: GENOTYPE_PHENOTYPE.NM,
    CYP2C19: GENOTYPE_PHENOTYPE.NM,
    CYP2C9: GENOTYPE_PHENOTYPE.NM,
    CYP3A5: GENOTYPE_PHENOTYPE.PM,
    NAT2: GENOTYPE_PHENOTYPE.IM,
    SLCO1B1: GENOTYPE_PHENOTYPE.IM,
    ABCB1: GENOTYPE_PHENOTYPE.IM,
    GSTM1: GENOTYPE_PHENOTYPE.PM,
  };
  const expected = {
    Tacrolimus: ['CYP3A5'],
    Alprazolam: ['CYP3A5'],
    Isoniazid: ['NAT2', 'GSTM1'],
    Hydralazine: ['NAT2'],
    Sulfasalazine: ['NAT2'],
    Simvastatin: ['SLCO1B1'],
    Atorvastatin: ['SLCO1B1'],
    Rosuvastatin: ['SLCO1B1'],
    Digoxin: ['ABCB1'],
    Dabigatran: ['ABCB1'],
    Acetaminophen: ['GSTM1'],
  };
  const missing = [];
  const missingRefs = [];
  for (const [drug, genes] of Object.entries(expected)) {
    const cards = getGenotypeMetaboliteEffectCards(drug);
    for (const gene of genes) {
      const card = cards.find(c => c.effect.enzyme === gene);
      if (!card) {
        missing.push(drug + ':' + gene);
        continue;
      }
      for (const ref of (card.effect.evidenceRefs || [])) {
        if (!STUDY_DB[ref]) missingRefs.push(drug + ':' + gene + ':' + ref);
      }
    }
  }
  return { missing, missingRefs };
})()`);
assert(expandedGenotypeRuleAudit.missing.length === 0, `Expanded genotype rules missing cards: ${expandedGenotypeRuleAudit.missing.join(', ')}`);
assert(expandedGenotypeRuleAudit.missingRefs.length === 0, `Expanded genotype rules missing evidence refs: ${expandedGenotypeRuleAudit.missingRefs.join(', ')}`);

loadCase(window, ['Tacrolimus', 'Busulfan', 'Cisplatin']);
window.eval(`
  setGenotypeState('CYP3A5', 'non_expresser');
  setGenotypeState('GSTM1', 'null');
  setGenotypeState('GSTT1', 'null');
  renderAll();
`);
const semanticsPanelText = window.document.getElementById('genotypeBody').textContent;
assert(semanticsPanelText.includes('CYP3A5 non-expresser'), 'CYP3A5 PM bucket should render as non-expresser expression status');
assert(semanticsPanelText.includes('GSTM1 null/absent detoxification capacity'), 'GSTM1 null should render as copy-number detoxification context');
assert(semanticsPanelText.includes('GSTT1 null/absent detoxification capacity'), 'GSTT1 null should render as copy-number detoxification context');
assert(
  !/GSTM1[^\\n]{0,120}poor metabolizer/i.test(semanticsPanelText) &&
  !/GSTT1[^\\n]{0,120}poor metabolizer/i.test(semanticsPanelText) &&
  !/CYP3A5[^\\n]{0,120}poor metabolizer/i.test(semanticsPanelText),
  'GSTM1/GSTT1/CYP3A5 UI should not display generic poor-metabolizer language'
);

assert(
  window.eval(`parsePharmGxImportDetailed(JSON.stringify({ "HLA-B": "detected" })).skipped.length`) === 1,
  'Importer should skip ambiguous generic HLA-B rows instead of guessing a specific HLA-B allele'
);

loadCase(window, ['Warfarin', 'Ibuprofen']);
assert(hasInteraction(window, {
  drug1: 'Warfarin',
  drug2: 'Ibuprofen',
  severity: 'severe',
  text: 'bleeding',
}), 'Warfarin + Ibuprofen should flag severe bleeding risk');
const warfarinIbuprofenIx = interactions(window).find((i) =>
  (i.drug1 === 'Warfarin' && i.drug2 === 'Ibuprofen') ||
  (i.drug1 === 'Ibuprofen' && i.drug2 === 'Warfarin')
);
assert(warfarinIbuprofenIx.evidenceRefs.includes('ev_warfarin_nsaid_bleed'), 'Warfarin + Ibuprofen should retain explicit evidenceRefs');
assert(warfarinIbuprofenIx.evidenceStatus === 'explicit', 'Warfarin + Ibuprofen should be marked explicit evidence');

const interactionSchemaAudit = window.eval(`(() => {
  const interactions = findInteractions();
  const missingFields = interactions.filter(i =>
    !i.id ||
    !i.sourceEngine ||
    !i.affectedPathway ||
    !Array.isArray(i.contributingDrugs) ||
    !Array.isArray(i.evidenceRefs) ||
    !i.evidenceStatus ||
    !i.confidence
  ).map(i => i.drug1 + '+' + i.drug2 + ':' + i.type);
  const audit = auditInteractionEvidence(interactions);
  return {
    missingFields,
    unknownEvidenceRefs: audit.unknownEvidenceRefs,
    severeWithoutEvidenceRefCount: audit.severeWithoutEvidenceRefCount
  };
})()`);
assert(interactionSchemaAudit.missingFields.length === 0, `Interactions missing normalized schema fields: ${interactionSchemaAudit.missingFields.join(', ')}`);
assert(interactionSchemaAudit.unknownEvidenceRefs.length === 0, `Unknown interaction evidence refs: ${JSON.stringify(interactionSchemaAudit.unknownEvidenceRefs)}`);
assert(Number.isInteger(interactionSchemaAudit.severeWithoutEvidenceRefCount), 'Interaction evidence audit should expose severeWithoutEvidenceRefCount');

const cyp2d6MetaboliteEvidenceAudit = window.eval(`(() => {
  const missingEvidenceRefs = [];
  const unknownEvidenceRefs = new Set();
  for (const [parent, metabolites] of Object.entries(METAB)) {
    for (const metabolite of metabolites) {
      if (metabolite.e !== 'CYP2D6') continue;
      const refs = metabolite.evidenceRefs || [];
      if (refs.length === 0) {
        missingEvidenceRefs.push(parent + ' -> ' + metabolite.n);
      }
      for (const ref of refs) {
        if (!STUDY_DB[ref]) unknownEvidenceRefs.add(ref);
      }
    }
  }
  return {
    cyp2d6MetaboliteEdgeCount: Object.values(METAB).flat().filter((m) => m.e === 'CYP2D6').length,
    missingEvidenceRefs,
    unknownEvidenceRefs: [...unknownEvidenceRefs]
  };
})()`);
assert(cyp2d6MetaboliteEvidenceAudit.cyp2d6MetaboliteEdgeCount >= 50, 'CYP2D6 metabolite audit should cover the curated edge set');
assert(
  cyp2d6MetaboliteEvidenceAudit.missingEvidenceRefs.length === 0,
  `CYP2D6 metabolite edges missing evidence refs: ${cyp2d6MetaboliteEvidenceAudit.missingEvidenceRefs.join(', ')}`
);
assert(
  cyp2d6MetaboliteEvidenceAudit.unknownEvidenceRefs.length === 0,
  `CYP2D6 metabolite edges have unknown evidence refs: ${JSON.stringify(cyp2d6MetaboliteEvidenceAudit.unknownEvidenceRefs)}`
);


loadCase(window, ['Grapefruit Juice', 'Simvastatin']);
assert(hasInteraction(window, {
  drug1: 'Grapefruit Juice',
  drug2: 'Simvastatin',
  severity: 'severe',
  text: 'rhabdomyolysis',
}), 'Grapefruit Juice + Simvastatin should flag severe rhabdomyolysis risk');
const grapefruitWashout = window.eval('computeWashoutCalendar(["Grapefruit Juice"]).find(e => e.actorId === "bergamottin")');
assert(grapefruitWashout && grapefruitWashout.days === 3, 'Grapefruit/bergamottin washout should remain 3 days');

loadCase(window, ['Ketoconazole', 'Midazolam']);
const midazolamGut = window.eval('computeGutExtraction("Midazolam")');
assert(
  midazolamGut && midazolamGut.cyp3a4Inhibitors.includes('Ketoconazole'),
  'Gut extraction should detect Ketoconazole as an active CYP3A4 inhibitor for Midazolam'
);

loadCase(window, ['Ketoconazole', 'Voriconazole']);
const bidirectionalCyp3a4 = interactions(window).filter((i) =>
  i.type === 'inhibition' &&
  i.enzyme === 'CYP3A4' &&
  ((i.drug1 === 'Ketoconazole' && i.drug2 === 'Voriconazole') ||
   (i.drug1 === 'Voriconazole' && i.drug2 === 'Ketoconazole'))
);
assert(
  bidirectionalCyp3a4.length === 2,
  `Directed CYP3A4 inhibition should preserve both directions, got ${bidirectionalCyp3a4.length}`
);

loadCase(window, ['Haloperidol', 'Azithromycin', 'Methadone']);
const qtcAlerts = interactions(window).filter((i) => i.enzyme === 'QTc' && i.type === 'pharmacodynamic');
assert(qtcAlerts.length === 1, `QTc burden should remain one aggregate warning, got ${qtcAlerts.length}`);
assert(
  ['Haloperidol', 'Azithromycin', 'Methadone'].every((name) => qtcAlerts[0].contributingDrugs.includes(name)),
  'Aggregate QTc warning should preserve all contributing drugs'
);

loadCase(window, ['Rifampin', 'Simvastatin']);
const cyp3a4Cap = window.eval('computeEnzymeCapacity("CYP3A4", activeStack)');
assert(cyp3a4Cap.capacity_pct >= 130, `Rifampin should induce CYP3A4 capacity, got ${cyp3a4Cap.capacity_pct}%`);
assert(cyp3a4Cap.inducers.some((i) => i.drug === 'Rifampin'), 'CYP3A4 capacity should identify Rifampin as inducer');

loadCase(window, ['Omeprazole', 'Clopidogrel']);
assert(hasInteraction(window, {
  drug1: 'Omeprazole',
  drug2: 'Clopidogrel',
  severity: 'severe',
  text: 'active metabolite',
}), 'Omeprazole + Clopidogrel should flag severe active-metabolite loss');

const activeMoietyRegression = window.eval(`(() => {
  function reset(drugs) {
    activeStack = [];
    userGenetics = {};
    activeGenotype = {
      CYP2D6: GENOTYPE_PHENOTYPE.NM,
      CYP2C19: GENOTYPE_PHENOTYPE.NM,
      CYP2C9: GENOTYPE_PHENOTYPE.NM,
      DPYD: GENOTYPE_PHENOTYPE.NM,
      UGT1A1: GENOTYPE_PHENOTYPE.NM,
      TPMT: GENOTYPE_PHENOTYPE.NM,
      NUDT15: GENOTYPE_PHENOTYPE.NM,
    };
    for (const drug of drugs) addDrug(drug);
  }
  function setPm(gene) {
    setGenotypeState(gene, GENOTYPE_PHENOTYPE.PM);
  }
  function setNull(gene) {
    activeGenotype[gene] = GENOTYPE_PHENOTYPE.PM;
    userGenetics[gene] = 'null';
  }
  function rowsFor(drugs, setup) {
    reset(drugs);
    setup?.();
    return computeActiveMoietyBalance(activeStack, activeGenotype);
  }
  function find(rows, parent, actorText) {
    return rows.find(row => row.parent === parent && String(row.actor).includes(actorText));
  }
  const codeineRows = rowsFor(['Codeine', 'Fluoxetine'], () => setPm('CYP2D6'));
  const clopidogrelRows = rowsFor(['Clopidogrel', 'Omeprazole'], () => setPm('CYP2C19'));
  const irinotecanRows = rowsFor(['Irinotecan'], () => setPm('UGT1A1'));
  const capecitabineRows = rowsFor(['Capecitabine'], () => setPm('DPYD'));
  const azathioprineRows = rowsFor(['Azathioprine', 'Allopurinol'], () => {
    setPm('TPMT');
    setPm('NUDT15');
  });
  const bupropionRows = rowsFor(['Bupropion', 'Clopidogrel', 'Nebivolol'], () => setNull('CYP2D6'));
  const overviewFindings = (() => {
    reset(['Capecitabine']);
    setPm('DPYD');
    return buildInteractionFindings(activeStack, activeGenotype, { interactions:[] }).filter(f => f.type === 'active_moiety');
  })();
  return {
    codeine: find(codeineRows, 'Codeine', 'Morphine'),
    clopidogrel: find(clopidogrelRows, 'Clopidogrel', 'Active thiol'),
    irinotecan: find(irinotecanRows, 'Irinotecan', 'SN-38'),
    capecitabine: find(capecitabineRows, 'Capecitabine', '5-Fluorouracil'),
    azathioprine: find(azathioprineRows, 'Azathioprine', '6-Thioguanine'),
    hydroxybupropion: find(bupropionRows, 'Bupropion', 'Hydroxybupropion'),
    nebivolol: find(bupropionRows, 'Nebivolol', '4-Hydroxy-nebivolol'),
    overviewFindingCount: overviewFindings.length,
  };
})()`);
assert(activeMoietyRegression.codeine?.netPattern === 'activation_failure', 'Codeine + fluoxetine + CYP2D6 PM should detect activation failure');
assert(activeMoietyRegression.codeine?.actorType === 'active_metabolite', 'Codeine -> morphine should be active-metabolite, not toxic-metabolite');
assert(activeMoietyRegression.clopidogrel?.netPattern === 'activation_failure', 'Clopidogrel + omeprazole + CYP2C19 PM should detect active-thiol activation failure');
assert(activeMoietyRegression.clopidogrel?.severityHint === 'severe', 'Clopidogrel activation failure should be severe review priority');
assert(activeMoietyRegression.irinotecan?.netPattern === 'toxic_metabolite_accumulation', 'Irinotecan + UGT1A1 PM should detect SN-38 accumulation');
assert(activeMoietyRegression.capecitabine?.netPattern === 'toxic_metabolite_accumulation', 'Capecitabine + DPYD PM should detect 5-FU accumulation');
assert(activeMoietyRegression.azathioprine?.netPattern === 'toxic_metabolite_accumulation', 'Azathioprine + TPMT/NUDT15 PM should detect 6-TGN toxic accumulation');
assert(activeMoietyRegression.hydroxybupropion?.netPattern === 'active_metabolite_accumulation', 'Bupropion + CYP2D6 null should detect hydroxybupropion active-metabolite accumulation');
assert(
  ['activation_failure', 'mixed_direction'].includes(activeMoietyRegression.nebivolol?.netPattern),
  `Nebivolol + CYP2D6 null should expose active-metabolite directionality, got ${activeMoietyRegression.nebivolol?.netPattern}`
);
assert(activeMoietyRegression.overviewFindingCount > 0, 'Active-moiety rows should feed Overview interaction findings');

const riskMarkerFindingRegression = window.eval(`(() => {
  function reset(drugs, genotype = {}) {
    activeStack = [];
    userGenetics = {};
    activeGenotype = {
      CYP2D6: GENOTYPE_PHENOTYPE.NM,
      CYP2C19: GENOTYPE_PHENOTYPE.NM,
      CYP2C9: GENOTYPE_PHENOTYPE.NM,
      CYP3A4: GENOTYPE_PHENOTYPE.NM,
      BCHE: GENOTYPE_PHENOTYPE.NM,
      "G6PD deficiency": GENOTYPE_RISK_STATUS.ABSENT,
      "RYR1/CACNA1S MH variant": GENOTYPE_RISK_STATUS.ABSENT,
      "HLA-B*57:01": GENOTYPE_RISK_STATUS.ABSENT,
      "HLA-B*58:01": GENOTYPE_RISK_STATUS.ABSENT,
      "HLA-B*15:02": GENOTYPE_RISK_STATUS.ABSENT,
      "HLA-A*31:01": GENOTYPE_RISK_STATUS.ABSENT,
      "MT-RNR1 m.1555A>G": GENOTYPE_RISK_STATUS.ABSENT,
    };
    Object.assign(activeGenotype, genotype);
    for (const drug of drugs) addDrug(drug);
    renderAll();
  }
  function currentRiskFindings() {
    return getRenderComputationCache().findings.filter(f => f.type === "risk_marker");
  }
  reset(["Rasburicase", "Primaquine", "Dapsone"], { "G6PD deficiency": GENOTYPE_RISK_STATUS.PRESENT });
  const g6pdFindings = currentRiskFindings();
  const g6pdRows = getRenderComputationCache().activeMoietyRows.filter(row => row.actorType === "toxic_metabolite");
  const g6pdPhenoconversions = getRenderComputationCache().findings.filter(f =>
    f.type === "phenoconversion" &&
    /G6PD|HLA|RYR1|CACNA1S/.test((f.title || "") + " " + (f.tags || []).join(" "))
  );
  setTab("mechanisms");
  const g6pdMechanismText = document.getElementById("mechanismWhyBody")?.textContent || "";
  window.history.replaceState(null, '', '/index.html?reviewer=1');
  setTab("review");
  const g6pdReviewText = document.getElementById("warningPathBody")?.textContent || "";
  window.history.replaceState(null, '', '/index.html');
  const g6pdOverviewCard = document.querySelector('#findingBody .finding-card[data-finding-id*="risk-marker"]');

  reset(["Succinylcholine"], {
    BCHE: GENOTYPE_PHENOTYPE.PM,
    "RYR1/CACNA1S MH variant": GENOTYPE_RISK_STATUS.PRESENT,
  });
  userGenetics.BCHE = "null";
  renderAll();
  const anesthesiaFindings = currentRiskFindings();

  reset(["Abacavir"], { "HLA-B*57:01": GENOTYPE_RISK_STATUS.PRESENT });
  const abacavirFindings = currentRiskFindings();
  reset(["Allopurinol"], { "HLA-B*58:01": GENOTYPE_RISK_STATUS.PRESENT });
  const allopurinolFindings = currentRiskFindings();
  reset(["Carbamazepine"], { "HLA-B*15:02": GENOTYPE_RISK_STATUS.PRESENT });
  const carbamazepineFindings = currentRiskFindings();

  return {
    g6pdCount:g6pdFindings.length,
    g6pdFinding:g6pdFindings[0],
    g6pdOverviewCard:Boolean(g6pdOverviewCard),
    g6pdMechanismHasPath:/G6PD deficiency|oxidative reserve|oxidant/i.test(g6pdMechanismText),
    g6pdReviewHasTechnicalDetails:/G6PD deficiency/.test(g6pdReviewText) && /copy technical path/i.test(g6pdReviewText),
    g6pdAllHaveLadders:g6pdFindings.every(f => f.evidenceLadder && f.evidenceLadder.clinicalActionConfidence),
    g6pdReviewedClaims:g6pdFindings.filter(f => f.evidenceLadder?.professionalReviewStatus === "reviewed").length,
    g6pdFakePhenoconversions:g6pdPhenoconversions.length,
    g6pdToxicPatterns:g6pdRows.map(row => row.netPattern),
    g6pdToxicDirections:g6pdRows.map(row => row.metaboliteDirection),
    g6pdToxicSummaries:g6pdRows.map(row => activeMoietyFindingSummary(row)).join(" | "),
    anesthesiaTitles:anesthesiaFindings.map(f => f.title),
    anesthesiaWhyCount:anesthesiaFindings.filter(f => f.whyPath).length,
    hlaAbacavir:abacavirFindings.length,
    hlaAllopurinol:allopurinolFindings.length,
    hlaCarbamazepine:carbamazepineFindings.length,
  };
})()`);
assert(riskMarkerFindingRegression.g6pdCount > 0, 'G6PD oxidant stack should produce normalized risk-marker findings');
assert(riskMarkerFindingRegression.g6pdFinding?.type === 'risk_marker', 'G6PD finding should use type risk_marker');
assert(riskMarkerFindingRegression.g6pdFinding?.whyPath?.nodes?.length > 0, 'G6PD risk-marker finding should have a why path');
assert(riskMarkerFindingRegression.g6pdOverviewCard, 'G6PD risk-marker finding should appear in Overview');
assert(riskMarkerFindingRegression.g6pdMechanismHasPath, 'G6PD risk-marker why path should appear in Mechanisms');
assert(riskMarkerFindingRegression.g6pdReviewHasTechnicalDetails, 'G6PD technical risk-marker path should appear in Review');
assert(riskMarkerFindingRegression.g6pdAllHaveLadders, 'Risk-marker findings should have evidence ladders');
assert(riskMarkerFindingRegression.g6pdReviewedClaims === 0, 'Risk-marker findings should not claim professional review without metadata');
assert(riskMarkerFindingRegression.g6pdFakePhenoconversions === 0, 'G6PD/HLA/RYR1 risk markers should not create fake CYP-style phenoconversion findings');
assert(
  riskMarkerFindingRegression.g6pdToxicPatterns.includes('risk_marker_toxic_context'),
  `G6PD toxic-metabolite rows should show risk-marker toxic context, got ${riskMarkerFindingRegression.g6pdToxicPatterns.join(', ')}`
);
assert(
  riskMarkerFindingRegression.g6pdToxicDirections.includes('risk_context'),
  `G6PD toxic-metabolite rows should use risk_context direction, got ${riskMarkerFindingRegression.g6pdToxicDirections.join(', ')}`
);
assert(!/may accumulate/i.test(riskMarkerFindingRegression.g6pdToxicSummaries), 'G6PD toxic context should not imply unsupported exposure increase');
assert(riskMarkerFindingRegression.anesthesiaTitles.some(t => /BCHE/i.test(t)), 'Succinylcholine + BCHE null should produce BCHE risk-marker context');
assert(riskMarkerFindingRegression.anesthesiaTitles.some(t => /Malignant-hyperthermia/i.test(t)), 'Succinylcholine + RYR1/CACNA1S should produce MH risk-marker context');
assert(riskMarkerFindingRegression.anesthesiaWhyCount >= 2, 'Anesthesia risk-marker findings should have why paths');
assert(riskMarkerFindingRegression.hlaAbacavir > 0, 'Abacavir + HLA-B*57:01 should produce a risk-marker finding');
assert(riskMarkerFindingRegression.hlaAllopurinol > 0, 'Allopurinol + HLA-B*58:01 should produce a risk-marker finding');
assert(riskMarkerFindingRegression.hlaCarbamazepine > 0, 'Carbamazepine + HLA-B*15:02 should produce a risk-marker finding');

const phenoconversionRegression = window.eval(`(() => {
  function reset(drugs) {
    activeStack = [];
    userGenetics = {};
    activeGenotype = {
      CYP2D6: GENOTYPE_PHENOTYPE.NM,
      CYP2C19: GENOTYPE_PHENOTYPE.NM,
      CYP2C9: GENOTYPE_PHENOTYPE.NM,
      CYP3A4: GENOTYPE_PHENOTYPE.NM,
    };
    for (const drug of drugs) addDrug(drug);
  }
  function rowFor(drugs, enzyme, setup) {
    reset(drugs);
    setup?.();
    return computePhenoconversionState(activeStack, activeGenotype).find(row => row.enzyme === enzyme);
  }
  const cyp2d6Fluoxetine = rowFor(['Codeine', 'Fluoxetine'], 'CYP2D6');
  const cyp2c19Omeprazole = rowFor(['Clopidogrel', 'Omeprazole'], 'CYP2C19');
  const cyp3a4Clarithro = rowFor(['Simvastatin', 'Clarithromycin'], 'CYP3A4');
  const cyp3a4Rifampin = rowFor(['Simvastatin', 'Rifampin'], 'CYP3A4');
  const cyp2d6Null = rowFor(['Codeine'], 'CYP2D6', () => {
    activeGenotype.CYP2D6 = GENOTYPE_PHENOTYPE.PM;
    userGenetics.CYP2D6 = 'null';
  });
  const overviewFindings = (() => {
    reset(['Codeine', 'Fluoxetine']);
    return buildInteractionFindings(activeStack, activeGenotype, { interactions:calcRisk().interactions }).filter(f =>
      f.type === 'phenoconversion' ||
      (f.groupedFindings || []).some(grouped => grouped.type === 'phenoconversion') ||
      (f.sourceRows || []).some(row => row?.functionalPhenotype)
    );
  })();
  const normalContext = (() => {
    reset(['Codeine']);
    renderAll();
    const rows = computePhenoconversionState(activeStack, activeGenotype);
    const normalRows = rows.filter(row => classifyPhenoconversionDisplayGroup(row) === 'normal_relevant');
    const changedRows = rows.filter(row => classifyPhenoconversionDisplayGroup(row) === 'changed');
    const defaultFindings = phenoconversionRowsToFindings(rows);
    const explicitFindings = phenoconversionRowsToFindings(rows, { includeNormalRelevant:true });
    const overviewFindings = buildInteractionFindings(activeStack, activeGenotype, { interactions:[] }).filter(f =>
      f.type === 'phenoconversion' ||
      (f.groupedFindings || []).some(grouped => grouped.type === 'phenoconversion') ||
      (f.sourceRows || []).some(row => row?.functionalPhenotype)
    );
    const normalGroup = document.querySelector('details.phenoconversion-normal-group');
    return {
      normalRows:normalRows.length,
      changedRows:changedRows.length,
      defaultFindingCount:defaultFindings.length,
      explicitFindingCount:explicitFindings.length,
      overviewFindingCount:overviewFindings.length,
      normalGroupExists:Boolean(normalGroup),
      normalGroupOpen:normalGroup?.hasAttribute('open') || false,
    };
  })();
  return {
    cyp2d6Fluoxetine,
    cyp2c19Omeprazole,
    cyp3a4Clarithro,
    cyp3a4Rifampin,
    cyp2d6Null,
    overviewFindingCount: overviewFindings.length,
    normalContext,
  };
})()`);
assert(phenoconversionRegression.cyp2d6Fluoxetine?.direction === 'reduced', 'CYP2D6 normal + fluoxetine should phenoconvert reduced/poor-like');
assert(
  ['poor_function', 'minimal_or_no_function'].includes(phenoconversionRegression.cyp2d6Fluoxetine?.functionalPhenotype),
  `CYP2D6 + fluoxetine should be poor-like, got ${phenoconversionRegression.cyp2d6Fluoxetine?.functionalPhenotype}`
);
assert(phenoconversionRegression.cyp2c19Omeprazole?.direction === 'reduced', 'CYP2C19 normal + omeprazole should phenoconvert reduced');
assert(phenoconversionRegression.cyp3a4Clarithro?.direction === 'reduced', 'CYP3A4 substrate + clarithromycin should phenoconvert reduced');
assert(phenoconversionRegression.cyp3a4Rifampin?.direction === 'increased', 'CYP3A4 substrate + rifampin should phenoconvert increased');
assert(phenoconversionRegression.cyp2d6Null?.functionalPhenotype === 'minimal_or_no_function', 'CYP2D6 null genotype should remain minimal/no function');
assert(phenoconversionRegression.overviewFindingCount > 0, 'Phenoconversion rows should feed Overview interaction findings');
assert(phenoconversionRegression.normalContext.normalRows > 0, 'Single-drug Codeine should expose relevant normal CYP2D6 context');
assert(phenoconversionRegression.normalContext.changedRows === 0, 'Single-drug Codeine with normal genotype should not have changed functional gene rows');
assert(phenoconversionRegression.normalContext.defaultFindingCount === 0, 'Normal-function phenoconversion rows should not become findings by default');
assert(phenoconversionRegression.normalContext.explicitFindingCount >= phenoconversionRegression.normalContext.normalRows, 'Review diagnostics can explicitly include relevant normal phenoconversion rows');
assert(phenoconversionRegression.normalContext.overviewFindingCount === 0, 'Overview phenoconversion findings should not balloon from normal pathway context');
assert(phenoconversionRegression.normalContext.normalGroupExists, 'Genes + Metabolites should render the collapsed normal/relevant pathway group');
assert(!phenoconversionRegression.normalContext.normalGroupOpen, 'Relevant normal pathway group should be collapsed by default');

const warningPathRegression = window.eval(`(() => {
  function reset(drugs) {
    activeStack = [];
    userGenetics = {};
    activeGenotype = {
      CYP2D6: GENOTYPE_PHENOTYPE.NM,
      CYP2C19: GENOTYPE_PHENOTYPE.NM,
      CYP2C9: GENOTYPE_PHENOTYPE.NM,
      CYP3A4: GENOTYPE_PHENOTYPE.NM,
      TPMT: GENOTYPE_PHENOTYPE.NM,
      NUDT15: GENOTYPE_PHENOTYPE.NM,
    };
    for (const drug of drugs) addDrug(drug);
  }
  function pathTextFor(drugs, match, setup) {
    reset(drugs);
    setup?.();
    const findings = buildInteractionFindings(activeStack, activeGenotype, { interactions:activeStack.length >= 2 ? calcRisk().interactions : [] });
    const finding = findings.find(match);
    return {
      title:finding?.title,
      text: finding?.whyPath ? formatWarningPath(finding.whyPath) : "",
      nodeCount:finding?.whyPath?.nodes?.length || 0,
      edgeCount:finding?.whyPath?.edges?.length || 0,
      evidenceRefs:finding?.whyPath?.evidenceRefs || [],
    };
  }
  return {
    codeine: pathTextFor(['Codeine', 'Fluoxetine'], f => /Codeine activation/.test(f.title || ''), () => setGenotypeState('CYP2D6', GENOTYPE_PHENOTYPE.PM)),
    azathioprine: pathTextFor(['Azathioprine', 'Allopurinol'], f => /6-Thioguanine/.test(f.title || ''), () => {
      setGenotypeState('TPMT', GENOTYPE_PHENOTYPE.PM);
      setGenotypeState('NUDT15', GENOTYPE_PHENOTYPE.PM);
    }),
    simvastatin: pathTextFor(['Simvastatin', 'Clarithromycin'], f => /Simvastatin/.test(f.title || '') && f.whyPath),
    phenoconversion: pathTextFor(['Codeine', 'Fluoxetine'], f => {
      const rows = f.sourceRows || [];
      return rows.some(row => row?.functionalPhenotype);
    }),
  };
})()`);
assert(/Fluoxetine.*inhibits.*CYP2D6.*Morphine/s.test(warningPathRegression.codeine.text), `Codeine why path should explain Fluoxetine -> CYP2D6 -> Morphine, got ${warningPathRegression.codeine.text}`);
assert(warningPathRegression.codeine.nodeCount >= 4 && warningPathRegression.codeine.edgeCount >= 2, 'Codeine why path should have structured nodes and edges');
assert(/6-Thioguanine|6-TGN/.test(warningPathRegression.azathioprine.text), 'Azathioprine why path should include 6-TGN context');
assert(/Clarithromycin|CYP3A4|Simvastatin/.test(warningPathRegression.simvastatin.text), 'Simvastatin + clarithromycin why path should include drug/pathway context');
assert(
  warningPathRegression.phenoconversion.text.includes('CYP2D6') ||
    warningPathRegression.phenoconversion.text.includes('poor function') ||
    warningPathRegression.phenoconversion.text.includes('minimal/no function'),
  'Phenoconversion why path should show functional gene status'
);

const persistenceTimelineRegression = window.eval(`(() => {
  function reset(drugs) {
    activeStack = [];
    userGenetics = {};
    activeGenotype = {
      CYP2D6: GENOTYPE_PHENOTYPE.NM,
      CYP2C19: GENOTYPE_PHENOTYPE.NM,
      CYP2C9: GENOTYPE_PHENOTYPE.NM,
      CYP3A4: GENOTYPE_PHENOTYPE.NM,
      TPMT: GENOTYPE_PHENOTYPE.NM,
      NUDT15: GENOTYPE_PHENOTYPE.NM,
    };
    for (const drug of drugs) addDrug(drug);
  }
  function rowsFor(drugs) {
    reset(drugs);
    return computePersistenceTimeline(activeStack, activeGenotype);
  }
  const ssriRows = rowsFor(['Fluoxetine', 'Paroxetine']);
  const maoiRows = rowsFor(['Phenelzine']);
  const rifampinRows = rowsFor(['Rifampin', 'Simvastatin']);
  const diazepamRows = rowsFor(['Diazepam']);
  const unknownRow = computeActorPersistence('Unmodeled Review Actor', 'Unmodeled Review Actor', {});
  reset(['Fluoxetine', 'Paroxetine']);
  const overviewFindings = buildInteractionFindings(activeStack, activeGenotype, { interactions:calcRisk().interactions });
  return {
    norfluoxetineMetabolite:ssriRows.find(row => /Norfluoxetine/i.test(row.actor) && row.persistenceType === 'metabolite'),
    norfluoxetineMetaboliteCount:ssriRows.filter(row => /Norfluoxetine/i.test(row.actor) && row.persistenceType === 'metabolite').length,
    norfluoxetineWashoutCount:ssriRows.filter(row => /Norfluoxetine/i.test(row.actor) && row.persistenceType === 'washout_rule').length,
    fluoxetineParent:ssriRows.find(row => row.actor === 'Fluoxetine' && row.persistenceType === 'parent'),
    paroxetineWashout:ssriRows.find(row => row.actor === 'Paroxetine' && row.persistenceType === 'washout_rule'),
    maoiWashout:maoiRows.find(row => row.actor === 'Phenelzine' && row.persistenceType === 'washout_rule'),
    rifampinInduction:rifampinRows.find(row => row.actor === 'Rifampin' && row.persistenceType === 'induction_offset'),
    diazepamParent:diazepamRows.find(row => row.actor === 'Diazepam' && row.persistenceType === 'parent'),
    diazepamMetabolite:diazepamRows.find(row => /Nordiazepam/i.test(row.actor) && row.persistenceType === 'metabolite'),
    unknownRow,
    overviewTimingCount:overviewFindings.filter(f => f.type === 'timing_washout' || (f.sourceRows || []).some(row => row?.persistenceType)).length,
  };
})()`);
assert(persistenceTimelineRegression.norfluoxetineMetabolite?.riskWindow === 'weeks', 'Norfluoxetine should display as a long-lived active metabolite');
assert(persistenceTimelineRegression.norfluoxetineMetaboliteCount === 1, `Norfluoxetine should appear once per metabolite persistence type, got ${persistenceTimelineRegression.norfluoxetineMetaboliteCount}`);
assert(persistenceTimelineRegression.norfluoxetineWashoutCount >= 1, 'Norfluoxetine washout rows should remain distinct from metabolite persistence rows');
assert(persistenceTimelineRegression.fluoxetineParent?.estimatedPersistenceDays >= 10, 'Fluoxetine parent persistence should display separately from norfluoxetine');
assert(persistenceTimelineRegression.paroxetineWashout?.estimatedPersistenceDays === 18, 'Paroxetine washout rule should display in the persistence timeline');
assert(persistenceTimelineRegression.maoiWashout?.estimatedPersistenceDays === 14, 'MAOI washout rule should display as 14 days');
assert(persistenceTimelineRegression.rifampinInduction?.riskWindow === 'weeks', 'Rifampin induction offset should display as a weeks-long row');
assert(persistenceTimelineRegression.diazepamParent?.riskWindow === 'days', 'Diazepam parent persistence should display separately from active-metabolite persistence');
assert(persistenceTimelineRegression.diazepamMetabolite?.riskWindow === 'weeks', 'Diazepam active metabolite persistence should display separately');
assert(persistenceTimelineRegression.unknownRow.riskWindow === 'unknown' && persistenceTimelineRegression.unknownRow.estimatedPersistenceDays === null, 'Unknown persistence should be shown as unknown, not zero');
assert(persistenceTimelineRegression.overviewTimingCount > 0, 'Timing/washout rows should feed Overview interaction findings');

const evidenceLadderRegression = window.eval(`(() => {
  activeStack = [];
  userGenetics = {};
  activeGenotype = { CYP2D6:GENOTYPE_PHENOTYPE.PM, CYP2C19:GENOTYPE_PHENOTYPE.NM, CYP2C9:GENOTYPE_PHENOTYPE.NM, CYP3A4:GENOTYPE_PHENOTYPE.NM };
  addDrug('Codeine');
  addDrug('Fluoxetine');
  const findings = buildInteractionFindings(activeStack, activeGenotype, { interactions:calcRisk().interactions });
  const sourceLinkedFinding = findings.find(f => (f.evidenceRefs || []).length);
  const evidenceFreeFinding = findings.find(f => !(f.evidenceRefs || []).length);
  const ladder = sourceLinkedFinding?.evidenceLadder || findings[0]?.evidenceLadder;
  const modelOnlyLadder = computeEvidenceLadder([], {
    reviewRequired:true,
    supportingSignals:{ modelOnly:true },
  });
  const modelOnlyCompact = renderEvidenceLadderCompact(modelOnlyLadder);
  renderAll();
  setTab('evidence');
  renderEvidenceExplorer();
  return {
    findingCount:findings.length,
    allHaveLadders:findings.every(f => f.evidenceLadder && f.evidenceLadder.clinicalActionConfidence),
    reviewedClaims:findings.filter(f => f.evidenceLadder?.professionalReviewStatus === 'reviewed').length,
    severeWithoutRefsOrReviewRequired:findings.filter(f => ['severe','critical'].includes(f.severity) && !(f.evidenceRefs || []).length && f.reviewRequired !== true).length,
    strongestTier:ladder?.strongestTier,
    sourceSupportStatus:ladder?.sourceSupportStatus,
    evidenceFreeSourceSupportStatus:evidenceFreeFinding?.evidenceLadder?.sourceSupportStatus || modelOnlyLadder.sourceSupportStatus,
    modelOnlyStrongestTier:modelOnlyLadder.strongestTier,
    modelOnlyClinicalActionConfidence:modelOnlyLadder.clinicalActionConfidence,
    modelOnlyCompact,
    clinicalActionConfidence:ladder?.clinicalActionConfidence,
    cardLadderCount:document.querySelectorAll('#findingBody .evidence-ladder-compact').length,
    primaryFindingCards:document.querySelectorAll('#findingBody .primary-finding-card').length,
    primaryFindingEvidenceSteps:Array.from(document.querySelectorAll('#findingBody .primary-finding-card')).filter(card => /Evidence/i.test(card.textContent || '')).length,
    ledgerExists:Boolean(document.getElementById('evidenceLadderLedger')),
  };
})()`);
assert(evidenceLadderRegression.findingCount > 0, 'Evidence ladder regression should have representative findings');
assert(evidenceLadderRegression.allHaveLadders, 'Every major finding should have an evidence confidence ladder');
assert(evidenceLadderRegression.reviewedClaims === 0, 'No finding should claim professional review when no review metadata exists');
assert(evidenceLadderRegression.severeWithoutRefsOrReviewRequired === 0, 'Severe/critical findings without refs must stay marked reviewRequired');
assert(evidenceLadderRegression.strongestTier, 'Evidence ladder should report strongest tier or unknown');
assert(
  ['source_linked_integrated', 'source_linked', 'reviewed_source_linked'].includes(evidenceLadderRegression.sourceSupportStatus),
  `Source-linked findings should expose source support status, got ${evidenceLadderRegression.sourceSupportStatus}`
);
assert(
  ['model_only_review_prompt', 'insufficient_source_support'].includes(evidenceLadderRegression.evidenceFreeSourceSupportStatus),
  `Evidence-free findings should show modeled/insufficient source support, got ${evidenceLadderRegression.evidenceFreeSourceSupportStatus}`
);
assert(evidenceLadderRegression.modelOnlyStrongestTier === 'unknown', 'Modeled evidence ladder should not display FDA/guideline backing');
assert(/modeled|no linked source yet|source-integrated|source-linked/i.test(evidenceLadderRegression.modelOnlyCompact), 'Compact ladder should visibly identify modeled support and source boundaries');
assert(evidenceLadderRegression.clinicalActionConfidence === 'source_integrated' || evidenceLadderRegression.clinicalActionConfidence === 'insufficient', 'Clinical action confidence should remain conservative');
assert(evidenceLadderRegression.primaryFindingCards > 0, 'Finding cards should render primary public finding UI');
assert(evidenceLadderRegression.primaryFindingEvidenceSteps === evidenceLadderRegression.primaryFindingCards, 'Each primary finding card should include an Evidence step');
assert(evidenceLadderRegression.ledgerExists, 'Evidence tab should render the evidence ladder ledger');

const renderCacheRegression = window.eval(`(() => {
  function reset(drugs) {
    activeStack = [];
    userGenetics = {};
    if (typeof drugDoses !== "undefined") Object.keys(drugDoses).forEach(k => delete drugDoses[k]);
    activeGenotype = {
      CYP2D6:GENOTYPE_PHENOTYPE.NM,
      CYP2C19:GENOTYPE_PHENOTYPE.NM,
      CYP2C9:GENOTYPE_PHENOTYPE.NM,
      CYP3A4:GENOTYPE_PHENOTYPE.NM,
      DPYD:GENOTYPE_PHENOTYPE.NM,
      UGT1A1:GENOTYPE_PHENOTYPE.NM,
      TPMT:GENOTYPE_PHENOTYPE.NM,
      NUDT15:GENOTYPE_PHENOTYPE.NM,
    };
    for (const drug of drugs) addDrug(drug);
    renderAll();
  }
  function morphineSnapshot() {
    const row = getRenderComputationCache().activeMoietyRows.find(r => r.parent === 'Codeine' && r.actor === 'Morphine');
    return row ? {
      netPattern:row.netPattern,
      metaboliteDirection:row.metaboliteDirection,
      severityHint:row.severityHint,
      confidence:row.confidence,
    } : null;
  }
  function cyp2d6Direction() {
    const row = getRenderComputationCache().phenoconversionRows.find(r => r.enzyme === 'CYP2D6');
    return row ? [row.direction, row.functionalPhenotype, row.capacityPct].join(':') : '';
  }
  reset(['Codeine']);
  const normalKey = getRenderCacheKey();
  const normalMorphine = morphineSnapshot();
  setGenotypeState('CYP2D6', GENOTYPE_PHENOTYPE.PM);
  const pmKey = getRenderCacheKey();
  const pmMorphine = morphineSnapshot();

  reset(['Codeine', 'Fluoxetine']);
  const inhibitedDirection = cyp2d6Direction();
  removeDrug('Fluoxetine');
  const removedDirection = cyp2d6Direction();

  reset(['Codeine', 'Fluoxetine']);
  const stackAKey = getRenderCacheKey();
  const stackAFindingIds = getRenderComputationCache().findings.map(f => f.id).join('|');
  reset(['Codeine', 'Paroxetine']);
  const stackBKey = getRenderCacheKey();
  const stackBFindingIds = getRenderComputationCache().findings.map(f => f.id).join('|');

  reset(['Paroxetine', 'Codeine']);
  const doseBaseKey = getRenderCacheKey();
  setDoseTier('Paroxetine', 'high');
  const doseHighKey = getRenderCacheKey();
  return {
    genotypeKeyChanged:normalKey !== pmKey,
    activeMoietyChanged:JSON.stringify(normalMorphine) !== JSON.stringify(pmMorphine),
    fluoxetineRemovalChanged:inhibitedDirection !== removedDirection,
    stackKeyChanged:stackAKey !== stackBKey,
    stackFindingsChanged:stackAFindingIds !== stackBFindingIds,
    doseKeyChanged:doseBaseKey !== doseHighKey,
  };
})()`);
assert(renderCacheRegression.genotypeKeyChanged, 'Render computation cache key should change when genotype changes');
assert(renderCacheRegression.activeMoietyChanged, 'Changing CYP2D6 genotype should update active-moiety rows');
assert(renderCacheRegression.fluoxetineRemovalChanged, 'Removing Fluoxetine should update CYP2D6 functional status');
assert(renderCacheRegression.stackKeyChanged, 'Render computation cache key should change when stack changes');
assert(renderCacheRegression.stackFindingsChanged, 'Changing stack should update normalized findings');
assert(renderCacheRegression.doseKeyChanged, 'Render computation cache key should change when dose tier changes');

const lazyRenderingRegression = window.eval(`(() => {
  window.history.replaceState(null, '', '/index.html?reviewer=1');
  activeStack = [];
  userGenetics = {};
  activeGenotype = {
    CYP2D6:GENOTYPE_PHENOTYPE.NM,
    CYP2C19:GENOTYPE_PHENOTYPE.NM,
    CYP2C9:GENOTYPE_PHENOTYPE.NM,
    CYP3A4:GENOTYPE_PHENOTYPE.NM,
  };
  lazyRenderState = { evidenceKey:"", reviewKey:"" };
  const evidenceBody = document.getElementById("evidenceBody");
  const reviewBody = document.getElementById("reviewSummaryBody");
  if (evidenceBody) evidenceBody.innerHTML = "";
  if (reviewBody) reviewBody.innerHTML = "";
  setActiveTab("overview");
  addDrug("Codeine");
  addDrug("Fluoxetine");
  renderAll();
  const overviewFindingIds = getRenderComputationCache().findings.map(f => f.id).join("|");
  const evidenceBeforeOpen = Boolean(document.getElementById("evidenceLadderLedger"));
  const reviewBeforeOpen = document.querySelectorAll("#reviewSummaryBody .review-summary-tile").length;
  setTab("evidence");
  const evidenceRendered = Boolean(document.getElementById("evidenceLadderLedger"));
  const evidenceKeyA = lazyRenderState.evidenceKey;
  setTab("review");
  const reviewRendered = document.querySelectorAll("#reviewSummaryBody .review-summary-tile").length > 0 &&
    document.querySelectorAll("#warningPathBody .warning-path-row").length > 0;
  const reviewKeyA = lazyRenderState.reviewKey;
  setTab("overview");
  setGenotypeState("CYP2D6", GENOTYPE_PHENOTYPE.PM);
  const overviewFindingIdsAfterGenotype = getRenderComputationCache().findings.map(f => f.id).join("|");
  setTab("evidence");
  const evidenceKeyB = lazyRenderState.evidenceKey;
  setTab("review");
  const reviewKeyB = lazyRenderState.reviewKey;
  const result = {
    evidenceBeforeOpen,
    reviewBeforeOpen,
    evidenceRendered,
    reviewRendered,
    findingsRetained:Boolean(overviewFindingIds) && Boolean(overviewFindingIdsAfterGenotype),
    genotypeChangedFindings:overviewFindingIds !== overviewFindingIdsAfterGenotype,
    evidenceInvalidated:evidenceKeyA !== evidenceKeyB,
    reviewInvalidated:reviewKeyA !== reviewKeyB,
  };
  window.history.replaceState(null, '', '/index.html');
  return result;
})()`);
assert(!lazyRenderingRegression.evidenceBeforeOpen, 'Evidence ledger should not render before Evidence tab is opened in a fresh lazy state');
assert(lazyRenderingRegression.reviewBeforeOpen === 0, 'Reviewer summary should not render before Reviewer Console is opened in a fresh lazy state');
assert(lazyRenderingRegression.evidenceRendered, 'Evidence should render when active tab is evidence');
assert(lazyRenderingRegression.reviewRendered, 'Reviewer Console should render when active tab is review');
assert(lazyRenderingRegression.findingsRetained, 'Switching lazy tabs should not lose current findings');
assert(lazyRenderingRegression.genotypeChangedFindings, 'Changing genotype should update normalized findings');
assert(lazyRenderingRegression.evidenceInvalidated, 'Changing genotype should invalidate lazy Evidence content');
assert(lazyRenderingRegression.reviewInvalidated, 'Changing genotype should invalidate lazy Reviewer Console content');

const rawMetaboliteMapRegression = window.eval(`(() => {
  activeStack = [];
  userGenetics = {};
  activeGenotype = { CYP2D6:GENOTYPE_PHENOTYPE.PM, CYP2C19:GENOTYPE_PHENOTYPE.NM, CYP2C9:GENOTYPE_PHENOTYPE.NM, CYP3A4:GENOTYPE_PHENOTYPE.NM };
  manualSectionToggleKeys = {};
  addDrug("Codeine");
  addDrug("Fluoxetine");
  renderAll();
  setTab("genes-metabolites");
  const titleText = document.querySelector("#metabSection .section-title")?.textContent || "";
  const body = document.getElementById("metabBody");
  const collapsedByDefault = body ? !body.classList.contains("open") : false;
  const parentBalanceVisible = document.getElementById("activeMoietySection")?.style.display !== "none" &&
    document.querySelectorAll("#activeMoietyBody .active-moiety-card").length > 0;
  const parentBalanceSummaryVisible = document.querySelectorAll("#activeMoietyBody .active-moiety-summary-tile").length >= 4;
  const helperText = body?.textContent || "";
  toggleSection("metab");
  const manualOpen = body?.classList.contains("open") || false;
  renderAll();
  const manualOpenPreserved = body?.classList.contains("open") || false;
  return {
    titleText,
    accessible:Boolean(body),
    collapsedByDefault,
    parentBalanceVisible,
    parentBalanceSummaryVisible,
    helperText,
    manualOpen,
    manualOpenPreserved,
  };
})()`);
assert(/Supporting Metabolite Details/.test(rawMetaboliteMapRegression.titleText), 'Supporting metabolite details should use the public supporting-data label');
assert(rawMetaboliteMapRegression.accessible, 'Raw metabolite map should remain accessible');
assert(rawMetaboliteMapRegression.collapsedByDefault, 'Raw metabolite map should collapse by default when active-moiety rows exist');
assert(rawMetaboliteMapRegression.parentBalanceVisible, 'Drug & Metabolite Balance should remain visible above supporting metabolite details');
assert(rawMetaboliteMapRegression.parentBalanceSummaryVisible, 'Drug & Metabolite Balance should expose a section-level snapshot');
assert(/supporting details list modeled metabolites/i.test(rawMetaboliteMapRegression.helperText), 'Supporting metabolite details should explain that they are supporting data');
assert(rawMetaboliteMapRegression.manualOpen && rawMetaboliteMapRegression.manualOpenPreserved, 'Manual raw-map expansion should be preserved for the same stack');

const reviewHomeRegression = window.eval(`(() => {
  window.history.replaceState(null, '', '/index.html?reviewer=1');
  activeStack = [];
  userGenetics = {};
  activeGenotype = { CYP2D6:GENOTYPE_PHENOTYPE.PM, CYP2C19:GENOTYPE_PHENOTYPE.NM, CYP2C9:GENOTYPE_PHENOTYPE.NM, CYP3A4:GENOTYPE_PHENOTYPE.NM };
  addDrug('Codeine');
  addDrug('Fluoxetine');
  renderAll();
  setTab('review');
  const result = {
    activeTab,
    matrixPanel:document.getElementById('matrixSection')?.closest('.tab-panel')?.id,
    summaryTiles:document.querySelectorAll('#reviewSummaryBody .review-summary-tile').length,
    scenarioCards:document.querySelectorAll('#scenarioSnapshotBody .review-diagnostic-card').length,
    gapCards:document.querySelectorAll('#metaboliteGapBody .review-diagnostic-card').length,
    warningPaths:document.querySelectorAll('#warningPathBody .warning-path-row').length,
    actionButtons:document.querySelectorAll('#contributeBody .review-action-btn').length,
    summaryText:document.getElementById('reviewSummaryBody')?.textContent || '',
  };
  window.history.replaceState(null, '', '/index.html');
  return result;
})()`);
assert(reviewHomeRegression.activeTab === 'review', 'Reviewer Console should activate');
assert(reviewHomeRegression.matrixPanel === 'tab-review', 'Interaction Grid should live in Reviewer Console');
assert(reviewHomeRegression.summaryTiles >= 6, 'Reviewer Summary should expose current-stack summary tiles');
assert(reviewHomeRegression.scenarioCards === 0, 'Generated scenario snapshots should stay out of the slim bundle');
assert(reviewHomeRegression.gapCards === 0, 'Generated metabolite coverage gaps should stay out of the slim bundle');
assert(reviewHomeRegression.warningPaths > 0, 'Reviewer Console should expose technical pathway diagnostics');
assert(reviewHomeRegression.actionButtons >= 3, 'Reviewer Console should expose report/contribute actions');
assert(/V1 Source Context/i.test(reviewHomeRegression.summaryText), 'Reviewer Summary should expose source-context diagnostics');

const crossTabFindingRegression = window.eval(`(() => {
  activeStack = [];
  userGenetics = {};
  activeGenotype = { CYP2D6:GENOTYPE_PHENOTYPE.PM, CYP2C19:GENOTYPE_PHENOTYPE.NM, CYP2C9:GENOTYPE_PHENOTYPE.NM, CYP3A4:GENOTYPE_PHENOTYPE.NM };
  addDrug('Codeine');
  addDrug('Fluoxetine');
  renderAll();
  const firstId = document.querySelector('#findingBody .finding-card')?.getAttribute('data-finding-id') || '';
  const overviewHas = Boolean(firstId);
  const overviewFullPathCount = document.querySelectorAll('#findingBody .why-path').length;
  const overviewWhyText = Array.from(document.querySelectorAll('#findingBody .finding-step'))
    .find(step => /Why it matters/i.test(step.textContent || ''))?.textContent || '';
  setTab('mechanisms');
  const mechanismsHas = document.querySelectorAll('#mechanismWhyBody .mechanism-why-row .why-path').length > 0;
  setTab('evidence');
  const evidenceHas = Boolean(document.getElementById('evidenceLadderLedger')) && /Evidence Browser \\/ Evidence Ledger/i.test(document.getElementById('evidenceLadderLedger')?.textContent || '');
  const reviewHiddenInV1 = document.getElementById('tabbtn-review')?.style.display === 'none';
  setTab('review');
  const activeAfterStandardReview = activeTab;
  const standardReviewHas = document.querySelectorAll('#warningPathBody .warning-path-row').length > 0;
  window.history.replaceState(null, '', '/index.html?reviewer=1');
  setTab('review');
  const reviewerReviewHas = document.querySelectorAll('#warningPathBody .warning-path-row').length > 0;
  const result = {
    overviewHas,
    overviewFullPathCount,
    overviewWhyText,
    mechanismsHas,
    evidenceHas,
    reviewHiddenInV1,
    activeAfterStandardReview,
    standardReviewHas,
    reviewerReviewHas,
    mechanismPanel:document.getElementById('mechanismWhySection')?.closest('.tab-panel')?.id,
    reviewPanel:document.getElementById('warningPathSection')?.closest('.tab-panel')?.id,
  };
  window.history.replaceState(null, '', '/index.html');
  return result;
})()`);
assert(crossTabFindingRegression.overviewHas, 'Overview should summarize a finding card');
assert(crossTabFindingRegression.overviewFullPathCount === 0, 'Overview should show compact why text, not the detailed vertical why path');
assert(
  /^Why it matters/.test(crossTabFindingRegression.overviewWhyText.trim()) &&
    crossTabFindingRegression.overviewWhyText.replace(/^Why it matters\s*/,'').length <= 260,
  `Overview why summary should be one compact line <=260 chars, got ${crossTabFindingRegression.overviewWhyText}`
);
assert(crossTabFindingRegression.mechanismsHas, 'Mechanisms should explain findings with why paths');
assert(crossTabFindingRegression.evidenceHas, 'Evidence should detail finding support through the evidence ledger');
assert(crossTabFindingRegression.reviewHiddenInV1, 'Normal V1 navigation should hide reviewer-only console');
assert(crossTabFindingRegression.activeAfterStandardReview === 'overview', 'Normal V1 should route reviewer-console requests back to Overview');
assert(!crossTabFindingRegression.standardReviewHas, 'Normal V1 should not render reviewer-only technical pathways');
assert(crossTabFindingRegression.reviewerReviewHas, 'Reviewer mode should still expose technical pathway diagnostics');
assert(crossTabFindingRegression.mechanismPanel === 'tab-mechanisms', 'Mechanism why paths should stay in Mechanisms');
assert(crossTabFindingRegression.reviewPanel === 'tab-review', 'Technical pathways should stay in Reviewer Console');

const publicFindingHierarchyRegression = window.eval(`(() => {
  function resetScenario(stack, setup) {
    activeStack = stack.slice();
    userGenetics = {};
    activeGenotype = {};
    Object.keys(GENOTYPE_EFFECTS || {}).forEach(g => activeGenotype[g] = GENOTYPE_PHENOTYPE.NM);
    Object.keys(GENOTYPE_RISK_EFFECTS || {}).forEach(g => activeGenotype[g] = GENOTYPE_RISK_STATUS.ABSENT);
    renderComputationCache = null;
    currentInteractionFindings = [];
    currentClinicalConcerns = [];
    currentPublicFindingPresentations = [];
    if (typeof setup === "function") setup();
    renderAll();
    setTab("overview");
    const presentations = getClinicianFacingPublicFindingPresentations(getCurrentPublicFindingPresentations());
    const cards = Array.from(document.querySelectorAll("#findingBody .primary-finding-card"));
    const overviewText = document.getElementById("findingBody")?.textContent || "";
    const trustText = [...document.querySelectorAll("#findingBody .finding-trust-chip")]
      .map(chip => chip.textContent.replace(/\\s+/g, " ").trim())
      .join(" | ");
    const summaryOnclick = document.querySelector("#summaryBar .summary-jump")?.getAttribute("onclick") || "";
    setTab("mechanisms");
    const mechanismText = document.getElementById("mechanismWhyBody")?.textContent || "";
    const mechanismRelatedButtons = document.querySelectorAll("#mechanismWhyBody .related-finding-btn").length;
    setTab("genes-metabolites");
    const genesText = document.getElementById("genotypeBody")?.textContent + " " + document.getElementById("phenoconversionBody")?.textContent + " " + document.getElementById("activeMoietyBody")?.textContent;
    const genesRelatedButtons = document.querySelectorAll("#phenoconversionBody .related-finding-btn, #activeMoietyBody .related-finding-btn").length;
    setTab("evidence");
    const evidenceText = document.getElementById("evidenceBody")?.textContent || "";
    const evidenceRelatedButtons = document.querySelectorAll("#evidenceBody .related-finding-btn").length;
    return {
      presentations: presentations.map(p => ({
        title:p.title,
        whatChanged:p.whatChanged,
        whyItMatters:p.whyItMatters,
        whatToReview:p.whatToReview,
        evidenceSummary:p.evidenceSummary,
        targetTab:p.targetTab,
        targetElementId:p.targetElementId,
      })),
      cardCount:cards.length,
      allCardsHaveSteps:cards.every(card => ["What changed", "Why it matters", "Review focus"].every(label => card.textContent.includes(label)) && !card.textContent.includes("What to review")),
      summaryOnclick,
      overviewText,
      trustText,
      mechanismText,
      genesText,
      evidenceText,
      mechanismRelatedButtons,
      genesRelatedButtons,
      evidenceRelatedButtons,
    };
  }
  return {
    ssri:resetScenario(["Paroxetine", "Fluoxetine"]),
    nebivolol:resetScenario(["Nebivolol"], () => { activeGenotype.CYP2D6 = GENOTYPE_PHENOTYPE.PM; }),
    codeine:resetScenario(["Codeine", "Fluoxetine"], () => { activeGenotype.CYP2D6 = GENOTYPE_PHENOTYPE.PM; }),
    codeineUm:resetScenario(["Codeine"], () => { activeGenotype.CYP2D6 = GENOTYPE_PHENOTYPE.UM; }),
    tramadolPm:resetScenario(["Tramadol"], () => { activeGenotype.CYP2D6 = GENOTYPE_PHENOTYPE.PM; }),
    tramadolUm:resetScenario(["Tramadol"], () => { activeGenotype.CYP2D6 = GENOTYPE_PHENOTYPE.UM; }),
    clopidogrel:resetScenario(["Clopidogrel", "Omeprazole"], () => { activeGenotype.CYP2C19 = GENOTYPE_PHENOTYPE.PM; }),
    warfarin:resetScenario(["Warfarin"], () => {
      activeGenotype.CYP2C9 = GENOTYPE_PHENOTYPE.PM;
      activeGenotype.VKORC1 = GENOTYPE_PHENOTYPE.PM;
      activeGenotype.CYP4F2 = GENOTYPE_PHENOTYPE.PM;
    }),
    atorvastatinSlco1b1:resetScenario(["Atorvastatin"], () => { activeGenotype.SLCO1B1 = GENOTYPE_PHENOTYPE.PM; }),
    rosuvastatinSlco1b1:resetScenario(["Rosuvastatin"], () => { activeGenotype.SLCO1B1 = GENOTYPE_PHENOTYPE.PM; }),
    anesthesia:resetScenario(["Succinylcholine"], () => {
      activeGenotype.BCHE = GENOTYPE_PHENOTYPE.PM;
      activeGenotype["RYR1/CACNA1S MH variant"] = GENOTYPE_RISK_STATUS.PRESENT;
    }),
  };
})()`);
for (const [scenarioName, result] of Object.entries(publicFindingHierarchyRegression)) {
  assert(result.presentations.length > 0, `${scenarioName}: expected at least one public Overview finding`);
  assert(result.cardCount === result.presentations.length || result.cardCount === Math.min(8, result.presentations.length), `${scenarioName}: Overview cards should match public finding presentations`);
  assert(result.allCardsHaveSteps, `${scenarioName}: every primary Overview card should use What changed / Why / Review focus, with evidence routed through compact actions`);
  assert(result.presentations.every(p => p.whatChanged && p.whyItMatters && p.whatToReview && p.evidenceSummary), `${scenarioName}: public finding presentation fields must be non-empty`);
  assert(result.presentations.every(p => p.targetTab === "overview" && /^overview-finding-/.test(p.targetElementId || "")), `${scenarioName}: public finding targets should point to Overview cards`);
  assert(result.summaryOnclick.includes("focusPriorityFinding('overview','overview-finding-"), `${scenarioName}: Summary View finding should jump to a concrete Overview card`);
  assert(!/Phase\\s*\\d+|top-250|top-100|coverage adapter|route adapter|pending professional review|review prompt/i.test(result.overviewText), `${scenarioName}: Overview should not expose internal labels or repeated review wording`);
  assert(!/\b(?:pending review action|review needed action|insufficient action)\b/i.test(result.trustText), `${scenarioName}: trust chips should not expose awkward internal action-status wording`);
  assert(/Concern|Evidence|Confidence/i.test(result.trustText) && /Source-linked|Modeled|High|Moderate|Limited/i.test(result.trustText),
    `${scenarioName}: trust chips should use compact readable trust status copy`);
  assert(!/Phase\\s*\\d+|top-250|top-100|coverage adapter|route adapter|pending professional review/i.test(result.mechanismText), `${scenarioName}: Mechanisms should not expose internal labels`);
  assert(!/\b(?:Open review|reviewer panel|Raw warning paths|raw signals?|remain available in Review)\b/i.test(result.mechanismText), `${scenarioName}: normal V1 Mechanisms should not expose reviewer-only or raw-path actions`);
  assert(!/Related overview/i.test(`${result.mechanismText} ${result.genesText} ${result.evidenceText}`), `${scenarioName}: supporting tabs should use plain Open finding actions instead of Related overview`);
  assert(/Open finding/i.test(`${result.mechanismText} ${result.genesText} ${result.evidenceText}`), `${scenarioName}: supporting tabs should provide clear Open finding actions`);
  assert(!/Phase\\s*\\d+|top-250|top-100|coverage adapter|route adapter|pending professional review/i.test(result.genesText), `${scenarioName}: Genes + Metabolites should not expose internal labels`);
  assert(!/pending professional review/i.test(result.evidenceText), `${scenarioName}: Evidence should use compact review labels instead of repeated pending-professional-review copy`);
}
assert(/Paroxetine|Fluoxetine/i.test(publicFindingHierarchyRegression.ssri.overviewText), 'Paroxetine + Fluoxetine should still identify affected substances in Overview');
assert(publicFindingHierarchyRegression.nebivolol.presentations.filter(p => /Nebivolol|CYP2D6/i.test(p.title + " " + p.whatChanged)).length === 1, 'Nebivolol + CYP2D6 PM should show one clear Overview PGx priority');
assert(publicFindingHierarchyRegression.nebivolol.cardCount <= 3, 'Nebivolol + CYP2D6 PM should not fragment into many Overview cards');
assert(/Nebivolol/i.test(publicFindingHierarchyRegression.nebivolol.overviewText), 'Nebivolol PGx Overview should name Nebivolol');
assert(!/Codeine|Tamoxifen|TCAs/i.test(publicFindingHierarchyRegression.nebivolol.overviewText + publicFindingHierarchyRegression.nebivolol.genesText), 'Nebivolol PGx copy should not leak generic CYP2D6 examples');
assert(publicFindingHierarchyRegression.codeine.presentations.some(p => /Codeine activation|Morphine/i.test(p.title + " " + p.whatChanged)), 'Codeine + Fluoxetine + CYP2D6 PM should keep activation-failure interpretation in Overview');
assert(!/parent down|parent exposure may fall/i.test(publicFindingHierarchyRegression.codeine.overviewText), 'Codeine CYP2D6 PM should not claim lower parent-codeine exposure');
assert(publicFindingHierarchyRegression.codeineUm.presentations.some(p => /Morphine|active metabolite|opioid toxicity/i.test(p.title + " " + p.whatChanged + " " + p.whatToReview)), 'Codeine CYP2D6 UM should lead with active-metabolite/opioid toxicity context');
assert(publicFindingHierarchyRegression.tramadolPm.presentations.some(p => /Tramadol activation|O-desmethyltramadol|M1/i.test(p.title + " " + p.whatChanged)), 'Tramadol CYP2D6 PM should keep M1 activation-failure interpretation in Overview');
assert(publicFindingHierarchyRegression.tramadolUm.presentations.some(p => /O-desmethyltramadol|M1|opioid toxicity/i.test(p.title + " " + p.whatChanged + " " + p.whatToReview)), 'Tramadol CYP2D6 UM should lead with M1/opioid toxicity context');
assert(publicFindingHierarchyRegression.codeine.genesRelatedButtons > 0, 'Codeine PGx/metabolite support should link back to the Overview finding');
assert(publicFindingHierarchyRegression.clopidogrel.presentations.some(p => /Clopidogrel activation|active thiol/i.test(p.title + " " + p.whatChanged)), 'Clopidogrel + Omeprazole + CYP2C19 PM should keep prodrug activation traceability in Overview');
assert(!/Clopidogrel exposure may rise|Clopidogrel.*levels may rise|genotype may change Clopidogrel exposure|PM: ineffective; use prasugrel/i.test(publicFindingHierarchyRegression.clopidogrel.overviewText),
  'Clopidogrel + CYP2C19 PM should not show a generic exposure card or raw alternative directive ahead of activation context');
assert(publicFindingHierarchyRegression.clopidogrel.evidenceRelatedButtons > 0, 'Clopidogrel evidence support should link back to the Overview finding');
assert(/Warfarin|CYP2C9|INR|VKORC1|CYP4F2/i.test(publicFindingHierarchyRegression.warfarin.overviewText),
  'Warfarin PGx Overview should frame CYP2C9 together with INR and multi-gene dosing context');
assert(!/reduce dose 30-50|reduce dose by|dose requirement ~1mg|standalone dose instruction/i.test(publicFindingHierarchyRegression.warfarin.overviewText),
  'Warfarin PGx Overview should not expose fixed genotype-only dosing instructions');
for (const [label, result] of Object.entries({
  atorvastatinSlco1b1: publicFindingHierarchyRegression.atorvastatinSlco1b1,
  rosuvastatinSlco1b1: publicFindingHierarchyRegression.rosuvastatinSlco1b1,
})) {
  assert(/SLCO1B1|OATP1B1|statin|muscle/i.test(result.overviewText),
    `${label}: statin SLCO1B1 Overview should frame transporter-mediated muscle-symptom risk`);
  assert(/rs4149056|CPIC-linked|statin-associated muscle/i.test(result.genesText),
    `${label}: Genes + Metabolites should expose SLCO1B1 marker/action source context`);
  assert(/CPIC Guideline for SLCO1B1, ABCG2, and CYP2C9|statin-associated musculoskeletal/i.test(result.evidenceText),
    `${label}: Evidence should expose CPIC statin SLCO1B1 source context`);
}
assert(publicFindingHierarchyRegression.anesthesia.presentations.some(p => /BCHE|paralysis|apnea|Malignant-hyperthermia|RYR1|CACNA1S/i.test(p.title + " " + p.whatChanged + " " + p.whatToReview)),
  'Succinylcholine + BCHE/RYR1 should lead with procedural anesthesia risk context');
assert(!/Succinylcholine exposure may rise|TDM|levels may rise|genotype may change Succinylcholine exposure/i.test(publicFindingHierarchyRegression.anesthesia.overviewText),
  'Succinylcholine + BCHE/RYR1 should not show generic exposure/TDM wording as the Overview priority');

const warfarinStandardsRegression = window.eval(`(() => {
  activeStack = ["Warfarin"];
  userGenetics = {};
  activeGenotype = {};
  Object.keys(GENOTYPE_EFFECTS || {}).forEach(g => activeGenotype[g] = GENOTYPE_PHENOTYPE.NM);
  activeGenotype.CYP2C9 = GENOTYPE_PHENOTYPE.PM;
  activeGenotype.VKORC1 = GENOTYPE_PHENOTYPE.PM;
  activeGenotype.CYP4F2 = GENOTYPE_PHENOTYPE.PM;
  const rows = getPgxActionSummariesForStack(activeStack, activeGenotype || {});
  return {
    genes: rows.map(row => row.gene),
    text: rows.map(row => [row.whatChanged, row.reviewDirection, row.safetyBoundary].join(" ")).join(" "),
    markers: rows.flatMap(row => row.markerMappings || []).map(marker => marker.dbsnp || marker.label),
  };
})()`);
assert(["CYP2C9","VKORC1","CYP4F2"].every(gene => warfarinStandardsRegression.genes.includes(gene)),
  `Warfarin standards should expose CYP2C9, VKORC1, and CYP4F2 action rows, got ${warfarinStandardsRegression.genes.join(', ')}`);
assert(warfarinStandardsRegression.markers.includes("rs2108622"), 'Warfarin CYP4F2 standards should include rs2108622 marker identity');
assert(/INR|algorithm/i.test(warfarinStandardsRegression.text) && !/reduce dose 30-50|~1mg\/day/i.test(warfarinStandardsRegression.text),
  'Warfarin standards copy should be algorithm/INR based and avoid fixed dose-change phrases');

const statinSlcoStandardsRegression = window.eval(`(() => {
  const statins = ["Simvastatin", "Atorvastatin", "Rosuvastatin"];
  return statins.map(drugName => {
    activeStack = [drugName];
    userGenetics = {};
    activeGenotype = {};
    Object.keys(GENOTYPE_EFFECTS || {}).forEach(g => activeGenotype[g] = GENOTYPE_PHENOTYPE.NM);
    activeGenotype.SLCO1B1 = GENOTYPE_PHENOTYPE.PM;
    const rows = getPgxActionSummariesForStack(activeStack, activeGenotype || {});
    const row = rows.find(item => item.gene === "SLCO1B1");
    return {
      drugName,
      hasRow: !!row,
      evidenceRefs: row?.evidenceRefs || [],
      markers: (row?.markerMappings || []).map(marker => marker.dbsnp || marker.label),
      text: row ? [row.whatChanged, row.reviewDirection, row.safetyBoundary].join(" ") : "",
    };
  });
})()`);
for (const row of statinSlcoStandardsRegression) {
  assert(row.hasRow, `${row.drugName} should expose a SLCO1B1 CPIC-linked action row`);
  assert(row.evidenceRefs.includes("ev_statin_slco1b1_abcg2_cpic2022"), `${row.drugName} SLCO1B1 action should include CPIC statin evidence`);
  assert(row.markers.includes("rs4149056"), `${row.drugName} SLCO1B1 action should include rs4149056 marker identity`);
  assert(/muscle|myopathy|statin-associated/i.test(row.text), `${row.drugName} SLCO1B1 action should describe statin muscle-risk context`);
}

const oncologyPgxActionRegression = window.eval(`(() => {
  const scenarios = [
    { drug:"Capecitabine", gene:"DPYD", phenotype:GENOTYPE_PHENOTYPE.PM, required:/5-FU|fluoropyrimidine|oncology-protocol/i },
    { drug:"Fluorouracil", gene:"DPYD", phenotype:GENOTYPE_PHENOTYPE.PM, required:/5-FU|fluoropyrimidine|oncology-protocol/i },
    { drug:"Irinotecan", gene:"UGT1A1", phenotype:GENOTYPE_PHENOTYPE.PM, required:/SN-38|bilirubin|CBC|diarrhea/i },
    { drug:"Azathioprine", gene:"TPMT", phenotype:GENOTYPE_PHENOTYPE.PM, required:/6-TGN|CBC|NUDT15|thiopurine/i },
    { drug:"Mercaptopurine", gene:"NUDT15", phenotype:GENOTYPE_PHENOTYPE.PM, required:/DNA-thioguanine|CBC|TPMT|thiopurine/i },
    { drug:"Thioguanine", gene:"NUDT15", phenotype:GENOTYPE_PHENOTYPE.PM, required:/DNA-thioguanine|CBC|TPMT|thiopurine/i },
  ];
  const rows = scenarios.map(scenario => {
    activeStack = [scenario.drug];
    activeGenotype = {};
    Object.keys(GENOTYPE_EFFECTS || {}).forEach(g => activeGenotype[g] = GENOTYPE_PHENOTYPE.NM);
    activeGenotype[scenario.gene] = scenario.phenotype;
    const row = getPgxActionSummariesForStack(activeStack, activeGenotype || {}).find(item => item.gene === scenario.gene);
    return {
      label: scenario.drug + ":" + scenario.gene,
      hasRow: !!row,
      text: row ? [row.whatChanged, row.reviewDirection, row.safetyBoundary].join(" ") : "",
      requiredOk: row ? scenario.required.test([row.whatChanged, row.reviewDirection, row.safetyBoundary].join(" ")) : false,
    };
  });
  const enzymeActions = [
    PHARMGKB_EVIDENCE.DPYD.pairs.find(row => row.drug === "Fluorouracil")?.action || "",
    PHARMGKB_EVIDENCE.DPYD.pairs.find(row => row.drug === "Capecitabine")?.action || "",
    PHARMGKB_EVIDENCE.TPMT.pairs.find(row => row.drug === "Azathioprine")?.action || "",
    PHARMGKB_EVIDENCE.TPMT.pairs.find(row => row.drug === "Mercaptopurine")?.action || "",
    PHARMGKB_EVIDENCE.NUDT15.pairs.find(row => row.drug === "Thioguanine")?.action || "",
    PHARMGKB_EVIDENCE.UGT1A1.pairs.find(row => row.drug === "Irinotecan")?.action || "",
  ].join(" ");
  return { rows, enzymeActions };
})()`);
const fixedOncologyDosePattern = /reduce dose\s*\d|reduce dose by|reduce starting dose|start\s+\d|standard dose|10-fold|thrice-weekly|\d+\s*-\s*\d+%|\b(?:30|50|70|80|90)%\b/i;
for (const row of oncologyPgxActionRegression.rows) {
  assert(row.hasRow, `${row.label} should expose an oncology PGx action summary`);
  assert(row.requiredOk, `${row.label} should name the specific metabolite/pathway and monitoring context, got ${row.text}`);
  assert(!fixedOncologyDosePattern.test(row.text), `${row.label} should not expose fixed dose percentages in public action copy: ${row.text}`);
}
assert(!fixedOncologyDosePattern.test(oncologyPgxActionRegression.enzymeActions),
  `Oncology PGx enzyme table should avoid fixed percentage dosing instructions: ${oncologyPgxActionRegression.enzymeActions}`);

loadCase(window, ['Fluoxetine']);
const fluoxetineWashout = window.eval('computeWashoutCalendar(["Fluoxetine"]).find(e => e.actorId === "norfluoxetine")');
assert(fluoxetineWashout && fluoxetineWashout.days === 35, 'Norfluoxetine washout should remain 35 days');

loadCase(window, ['Sertraline', 'Linezolid']);
const receptorRisk = window.eval('computeReceptorOccupancy(activeStack)');
assert(
  receptorRisk.active_syndromes.some((s) => s.id === 'serotonin_syndrome'),
  'Sertraline + Linezolid should cross serotonin syndrome receptor threshold'
);

loadCase(window, ['Diazepam', 'Morphine']);
const cnsRisk = window.eval('computeReceptorOccupancy(activeStack)');
assert(
  cnsRisk.active_syndromes.some((s) => s.id === 'cns_depression' && s.severity === 'critical'),
  'Diazepam + Morphine should cross respiratory depression receptor threshold'
);

loadCase(window, ['Apalutamide', 'Fentanyl']);
const mechanisticMedicationPredictions = window.eval('getMechanisticPredictions(activeStack)');
assert(
  mechanisticMedicationPredictions.some(p =>
    p.kind === 'medication-enzyme' &&
    p.drugs.includes('Apalutamide') &&
    p.drugs.includes('Fentanyl') &&
    p.pathway === 'CYP3A4'
  ),
  'Mechanistic interpretation should surface undocumented enzyme-mediated medication relations'
);

loadCase(window, ['Bupropion', 'Codeine']);
const documentedMechanisticPredictions = window.eval('getMechanisticPredictions(activeStack)');
assert(
  documentedMechanisticPredictions.some(p =>
    p.kind === 'medication-enzyme' &&
    p.documented === true &&
    p.drugs.includes('Bupropion') &&
    p.drugs.includes('Codeine') &&
    p.pathway === 'CYP2D6'
  ),
  'Mechanistic engine should still identify documented medication pathway read-throughs'
);
assert(
  window.document.getElementById('mechanisticSection').style.display === 'none' ||
  !/documented|already source-linked/i.test(window.document.getElementById('mechanisticBody').textContent),
  'Mechanistic UI should keep documented interactions out of the modeled read-through section'
);

loadCase(window, ['Atazanavir']);
window.eval(`setGenotypeState('UGT1A1', GENOTYPE_PHENOTYPE.PM); renderAll();`);
const mechanisticGenotypePredictions = window.eval('getMechanisticPredictions(activeStack)');
assert(
  mechanisticGenotypePredictions.some(p =>
    p.kind === 'genotype-metabolite' &&
    p.drugs.includes('Atazanavir') &&
    p.pathway === 'UGT1A1'
  ),
  'Mechanistic interpretation should surface genotype-metabolite relations'
);

loadCase(window, ['Codeine']);
window.eval(`setGenotypeState('CYP2D6', GENOTYPE_PHENOTYPE.PM); renderAll();`);
const mechanisticGenotypeDrugPredictions = window.eval('getMechanisticPredictions(activeStack)');
assert(
  mechanisticGenotypeDrugPredictions.some(p =>
    p.kind === 'genotype-drug' &&
    p.drugs.includes('Codeine') &&
    p.pathway === 'CYP2D6'
  ),
  'Mechanistic interpretation should surface genotype-drug pathway calculations'
);
assert(
  mechanisticGenotypeDrugPredictions.some(p => p.documented) ||
  window.document.querySelectorAll('#mechanisticBody .mechanistic-card').length >= 1,
  'Mechanistic renderer should show modeled genotype-drug cards and leave documented PGx to Genetics/Evidence'
);

const browseCategoryAudit = window.eval(`(() => {
  const byName = Object.fromEntries(DRUG_DB.map(d => [d.name, getBrowseCategory(d)]));
  const counts = DRUG_DB.reduce((acc, d) => {
    const cat = getBrowseCategory(d);
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
  return {
    categories: Object.keys(counts).length,
    singletonCategories: Object.values(counts).filter(n => n === 1).length,
    sourceCandidates: counts['Source Candidates'] || 0,
    legacyOther: counts['Other Specialized Agents'] || 0,
    lsd: byName.LSD,
    albuterol: byName.Albuterol,
    aspirinLowDose: byName['Aspirin (Low-Dose)'],
    alcohol: byName['Alcohol (Ethanol)'],
    timolol: byName['Timolol Ophthalmic'] || byName.Timolol,
    warfarin: byName.Warfarin,
    mirabegron: byName.Mirabegron,
    acalabrutinib: byName.Acalabrutinib,
  };
})()`);
assert(browseCategoryAudit.categories <= 18, `Browse UI should stay consolidated, got ${browseCategoryAudit.categories} categories`);
assert(browseCategoryAudit.singletonCategories <= 1, `Browse UI should avoid one-item category sprawl, got ${browseCategoryAudit.singletonCategories}`);
assert(browseCategoryAudit.legacyOther === 0, 'Browse UI should not route substances into legacy Other Specialized Agents');
assert(browseCategoryAudit.sourceCandidates <= 8, `Browse UI should leave only truly ambiguous source candidates grouped as source candidates, got ${browseCategoryAudit.sourceCandidates}`);
assert(browseCategoryAudit.lsd === 'Recreational & Social', 'LSD should browse under Recreational & Social, not Antipsychotics');
assert(browseCategoryAudit.albuterol === 'Respiratory, Allergy & Cough', 'Albuterol should browse under Respiratory, Allergy & Cough, not Beta-Blockers');
assert(browseCategoryAudit.aspirinLowDose === 'Cardiovascular & Blood', 'Low-dose aspirin should browse under Cardiovascular & Blood');
assert(browseCategoryAudit.alcohol === 'Recreational & Social', 'Alcohol should browse under Recreational & Social');
assert(browseCategoryAudit.timolol === 'Dermatology, Eye & Local Care', 'Ophthalmic timolol should browse under Dermatology, Eye & Local Care');
assert(browseCategoryAudit.warfarin === 'Cardiovascular & Blood', 'Warfarin should browse under Cardiovascular & Blood');
assert(browseCategoryAudit.mirabegron === 'Renal, Electrolytes & Urologic', 'Mirabegron should browse under Renal, Electrolytes & Urologic');
assert(browseCategoryAudit.acalabrutinib === 'Oncology, Immunology & Transplant', 'Acalabrutinib should browse under Oncology, Immunology & Transplant');

assert(
  /@media\(max-width:420px\)\{\s*\.active-moiety-directions\{grid-template-columns:1fr\}/.test(html),
  'Mobile CSS should force active-moiety direction cards to one column below 420px'
);
assert(
  /\.warning-path-json\{[^}]*overflow-x:auto/.test(html),
  'Warning path raw JSON should explicitly allow horizontal scrolling'
);
assert(
  /risk_context/.test(html) &&
    html.includes('Primaquine hydroxylamine / quinone-imine metabolites') &&
    html.includes('RYR1/CACNA1S MH variant'),
  'Generated UI/data surface should preserve long risk-marker and metabolite labels'
);

const overviewConsolidationRegression = window.eval(`(() => {
  function resetScenario(stack, setup) {
    activeStack = stack.slice();
    userGenetics = {};
    activeGenotype = {};
    Object.keys(GENOTYPE_EFFECTS || {}).forEach(g => activeGenotype[g] = GENOTYPE_PHENOTYPE.NM);
    Object.keys(GENOTYPE_RISK_EFFECTS || {}).forEach(g => activeGenotype[g] = GENOTYPE_RISK_STATUS.ABSENT);
    renderComputationCache = null;
    currentInteractionFindings = [];
    currentClinicalConcerns = [];
    if (typeof setup === "function") setup();
    renderAll();
    setTab("overview");
    const cache = getRenderComputationCache();
    setTab("mechanisms");
    const mechanismRows = Array.from(document.querySelectorAll("#mechanismWhyBody .mechanism-why-row"));
    const mechanismTitles = mechanismRows.map(row => row.querySelector(".warning-path-title")?.textContent || "");
    const mechanismText = document.getElementById("mechanismWhyBody")?.textContent || "";
    window.history.replaceState(null, '', '/index.html?reviewer=1');
    setTab("review");
    const result = {
      concerns: (cache.clinicalConcerns || []).map(c => ({
        title:c.title,
        domain:c.clinicalConcernDomain,
        key:c.clinicalConcernKey,
        support:(c.supportingSignals || []).map(s => s.label),
        sourceTypes:(c.sourceFindings || []).map(s => s.type),
        rawFindingCount:c.rawFindingCount || 0,
      })),
      raw: (cache.findings || []).map(f => ({ id:f.id, type:f.type, title:f.title })),
      overviewText: document.getElementById("findingBody")?.textContent || "",
      mechanismText,
      mechanismPathCount: mechanismRows.length,
      mechanismTitles,
      reviewTechnicalPathCount: document.querySelectorAll("#warningPathBody .warning-path-row").length,
      reviewText: document.getElementById("reviewSummaryBody")?.textContent || "",
      genesText: document.getElementById("activeMoietyBody")?.textContent || "",
    };
    window.history.replaceState(null, '', '/index.html');
    return result;
  }
  return {
    tacrolimus: resetScenario(["Tacrolimus", "Fluconazole"]),
    simvastatin: resetScenario(["Simvastatin", "Clarithromycin"]),
    codeine: resetScenario(["Codeine", "Fluoxetine"], () => { activeGenotype.CYP2D6 = GENOTYPE_PHENOTYPE.PM; }),
    clopidogrel: resetScenario(["Clopidogrel", "Omeprazole"], () => { activeGenotype.CYP2C19 = GENOTYPE_PHENOTYPE.PM; }),
    g6pd: resetScenario(["Rasburicase", "Primaquine", "Dapsone"], () => { activeGenotype["G6PD deficiency"] = GENOTYPE_RISK_STATUS.PRESENT; }),
    washout: resetScenario(["Fluoxetine", "Paroxetine"]),
  };
})()`);
const tacConcern = overviewConsolidationRegression.tacrolimus.concerns.find(c => /Tacrolimus exposure may rise with Fluconazole/i.test(c.title));
assert(overviewConsolidationRegression.tacrolimus.concerns.length <= 4, 'Tacrolimus + fluconazole should consolidate to 1-4 Overview concerns');
assert(tacConcern, `Tacrolimus + fluconazole should identify tacrolimus as the affected exposure concern: ${JSON.stringify(overviewConsolidationRegression.tacrolimus.concerns)}`);
assert(/Tacrolimus exposure may rise with Fluconazole/i.test(overviewConsolidationRegression.tacrolimus.concerns[0]?.title || ''),
  `Tacrolimus + fluconazole should lead with the exposure concern, got ${overviewConsolidationRegression.tacrolimus.concerns.map(c => c.title).join(' | ')}`);
assert(!/Tacrolimus may raise Fluconazole exposure/i.test(overviewConsolidationRegression.tacrolimus.overviewText), 'Overview must not reverse tacrolimus/fluconazole direction');
assert(!overviewConsolidationRegression.tacrolimus.concerns.some(c => /^CYP2C19|^CYP2C9/i.test(c.title)), 'Tacrolimus scenario should not expose CYP2C19/CYP2C9 as standalone Overview cards');
assert(tacConcern.support.some(label => /CYP3A4|CYP2C9|parent-metabolite/i.test(label)), 'Tacrolimus concern should show CYP/metabolite supporting signals');
assert(overviewConsolidationRegression.tacrolimus.mechanismPathCount <= overviewConsolidationRegression.tacrolimus.concerns.length, 'Tacrolimus Mechanisms should render grouped concern paths instead of raw duplicates');
assert(!overviewConsolidationRegression.tacrolimus.mechanismTitles.some(title => /^CYP2C19|^CYP2C9|^CYP3A4 behaves/i.test(title)), 'Tacrolimus Mechanisms should not expose standalone CYP function rows as primary paths');
assert(/Grouped supporting signals/i.test(overviewConsolidationRegression.tacrolimus.mechanismText), 'Tacrolimus Mechanisms should keep sub-signals inside the grouped concern');
assert(overviewConsolidationRegression.tacrolimus.reviewTechnicalPathCount > overviewConsolidationRegression.tacrolimus.mechanismPathCount, 'Review should retain more technical paths than the grouped Mechanisms view');
assert(/Clinical Concern Groups/i.test(overviewConsolidationRegression.tacrolimus.reviewText), 'Review should expose clinical concern grouping diagnostics');

const simConcern = overviewConsolidationRegression.simvastatin.concerns.find(c => /Simvastatin exposure may rise with Clarithromycin/i.test(c.title));
assert(simConcern, 'Simvastatin + clarithromycin should identify simvastatin as affected');
assert(simConcern.support.some(label => /active-moiety|parent exposure|metabolite/i.test(label)), 'Simvastatin concern should group active-moiety support');

const codeineConcern = overviewConsolidationRegression.codeine.concerns.find(c => /Codeine activation/i.test(c.title));
assert(codeineConcern, 'Codeine + fluoxetine + CYP2D6 PM should keep activation failure primary');
assert(/Morphine|activation/i.test(codeineConcern.title), 'Codeine activation concern should identify morphine formation or activation');
assert(!overviewConsolidationRegression.codeine.concerns.some(c => /^CYP2D6 behaves/i.test(c.title)), 'CYP2D6 phenoconversion should not be a duplicate Overview primary');

const clopidogrelConcern = overviewConsolidationRegression.clopidogrel.concerns.find(c => /Clopidogrel activation/i.test(c.title));
assert(clopidogrelConcern, 'Clopidogrel + omeprazole + CYP2C19 PM should keep activation failure primary');
assert(!overviewConsolidationRegression.clopidogrel.concerns.some(c => /^CYP2C19 behaves/i.test(c.title)), 'CYP2C19 phenoconversion should be grouped or demoted');

const g6pdConcern = overviewConsolidationRegression.g6pd.concerns.find(c => /G6PD/i.test(c.title));
assert(g6pdConcern, 'G6PD oxidant stack should show a primary risk-marker concern');
assert(g6pdConcern.support.some(label => /Dapsone|Primaquine|Rasburicase/i.test(label)), 'G6PD concern should group toxic-metabolite context');
assert(overviewConsolidationRegression.g6pd.concerns.length <= 4, 'G6PD toxic-metabolite rows should not duplicate into many primary concerns');

assert(
  overviewConsolidationRegression.washout.concerns.some(c => /persist|washout|Norfluoxetine/i.test(c.title)),
  'Persistence/washout scenario should retain a timing concern when relevant'
);

const publicQuestionRegression = window.eval(`(() => {
  function resetScenario(path) {
    window.history.replaceState(null, '', path);
    loadUrlDemoState();
    renderComputationCache = null;
    currentInteractionFindings = [];
    currentClinicalConcerns = [];
    renderAll();
    const cache = getRenderComputationCache();
    setAudienceMode('patient', { render:false });
    const patient = buildPublicFindingPresentations(cache.clinicalConcerns)[0];
    const patientQuestion = buildPatientDiscussionQuestion(patient, patient?.trustContract);
    const patientMonitoring = buildFindingMonitoringItems(patient, patient?.trustContract, { patient:true });
    setAudienceMode('clinician', { render:false });
    const clinician = buildPublicFindingPresentations(cache.clinicalConcerns)[0];
    return {
      patientTitle: patient?.title || '',
      patientQuestion,
      patientMonitoring,
      clinicianTitle: clinician?.title || '',
    };
  }
  return {
    methotrexate: resetScenario('/index.html?substances=methotrexate,ibuprofen'),
    tamoxifen: resetScenario('/index.html?substances=tamoxifen,paroxetine'),
    clopidogrel: resetScenario('/index.html?substances=clopidogrel,omeprazole'),
    olderAdult: resetScenario('/index.html?demo=older-adult-burden'),
    capecitabine: resetScenario('/index.html?demo=fluoropyrimidine-dpyd-toxicity'),
    irinotecan: resetScenario('/index.html?demo=irinotecan-sn38-toxicity'),
  };
})()`);
assert(/Methotrexate exposure may rise with Ibuprofen/i.test(publicQuestionRegression.methotrexate.clinicianTitle),
  `Methotrexate + ibuprofen should present increased exposure, got ${publicQuestionRegression.methotrexate.clinicianTitle}`);
assert(!/timing, overlap, or washout matters/i.test(publicQuestionRegression.methotrexate.patientQuestion),
  'Methotrexate + ibuprofen patient question should not collapse into the generic timing prompt');
assert(!publicQuestionRegression.methotrexate.patientMonitoring.some(item => /Extreme sleepiness|slowed breathing/i.test(item)),
  `Methotrexate + ibuprofen patient monitoring should not leak sedation copy: ${publicQuestionRegression.methotrexate.patientMonitoring.join(' | ')}`);
assert(/Endoxifen/i.test(publicQuestionRegression.tamoxifen.clinicianTitle) && !/N-?desmethyltamoxifen/i.test(publicQuestionRegression.tamoxifen.clinicianTitle),
  `Tamoxifen + paroxetine should name Endoxifen in the clinician title, got ${publicQuestionRegression.tamoxifen.clinicianTitle}`);
assert(!publicQuestionRegression.tamoxifen.patientMonitoring.some(item => /Extreme sleepiness|slowed breathing/i.test(item)),
  `Tamoxifen + paroxetine patient monitoring should not leak sedation copy: ${publicQuestionRegression.tamoxifen.patientMonitoring.join(' | ')}`);
assert(/Active thiol metabolite/i.test(publicQuestionRegression.clopidogrel.clinicianTitle) && !/2-Oxo-clopidogrel/i.test(publicQuestionRegression.clopidogrel.clinicianTitle),
  `Clopidogrel + omeprazole should name the active thiol metabolite, got ${publicQuestionRegression.clopidogrel.clinicianTitle}`);
assert(!/timing, overlap, or washout matters/i.test(publicQuestionRegression.olderAdult.patientQuestion),
  'Older-adult burden patient question should not default to the timing prompt');
assert(!/timing, overlap, or washout matters/i.test(publicQuestionRegression.capecitabine.patientQuestion),
  'Capecitabine + DPYD patient question should not default to the timing prompt');
assert(/5-Fluorouracil may accumulate from Capecitabine/i.test(publicQuestionRegression.capecitabine.clinicianTitle),
  `Capecitabine + DPYD should present 5-FU toxic-metabolite accumulation, got ${publicQuestionRegression.capecitabine.clinicianTitle}`);
assert(!/timing, overlap, or washout matters/i.test(publicQuestionRegression.irinotecan.patientQuestion),
  'Irinotecan + UGT1A1 patient question should not default to the timing prompt');
assert(/SN-38 may accumulate from Irinotecan/i.test(publicQuestionRegression.irinotecan.clinicianTitle),
  `Irinotecan + UGT1A1 should present SN-38 toxic-metabolite accumulation, got ${publicQuestionRegression.irinotecan.clinicianTitle}`);

const patientCopyAuditRegression = window.eval(`(() => {
  function resetScenario(path, audience = 'patient') {
    window.history.replaceState(null, '', path);
    loadUrlDemoState();
    renderComputationCache = null;
    currentInteractionFindings = [];
    currentClinicalConcerns = [];
    currentPublicFindingPresentations = [];
    setAudienceMode(audience, { render:false });
    renderAll();
    return {
      titles: Array.from(document.querySelectorAll(audience === 'patient'
        ? '#findingBody .patient-question-card .patient-question-title'
        : '#findingBody .primary-finding-card .finding-title'
      )).map(el => el.textContent.replace(/\\s+/g, ' ').trim()),
      questions: Array.from(document.querySelectorAll(audience === 'patient'
        ? '#findingBody .patient-question-card .finding-discussion-text'
        : '#findingBody .primary-finding-card .finding-discussion-text'
      )).map(el => el.textContent.replace(/\\s+/g, ' ').trim()),
      meanings: Array.from(document.querySelectorAll('#findingBody .patient-meaning-card .patient-meaning-title'))
        .map(el => el.textContent.replace(/\\s+/g, ' ').trim()),
      patientCards: document.querySelectorAll('#findingBody .patient-question-card').length,
    };
  }
  return {
    tacrolimusClinician: resetScenario('/index.html?substances=tacrolimus,fluconazole', 'clinician'),
    simvastatinPatient: resetScenario('/index.html?substances=simvastatin,clarithromycin'),
    grapefruitPatient: resetScenario('/index.html?substances=grapefruit%20juice,simvastatin'),
    methotrexatePatient: resetScenario('/index.html?substances=methotrexate,ibuprofen'),
    tamoxifenPatient: resetScenario('/index.html?substances=tamoxifen&genotype=CYP2D6:PM'),
    g6pdPatient: resetScenario('/index.html?substances=rasburicase,primaquine,dapsone&genotype=G6PD:deficiency'),
    abacavirPatient: resetScenario('/index.html?substances=abacavir&genotype=HLA-B*57:01:present'),
    allopurinolPatient: resetScenario('/index.html?substances=allopurinol&genotype=HLA-B*58:01:present'),
    capecitabinePatient: resetScenario('/index.html?substances=capecitabine&genotype=DPYD:PM'),
    clopidogrelPatient: resetScenario('/index.html?substances=clopidogrel,omeprazole&genotype=CYP2C19:PM'),
    olderAdultPatient: resetScenario('/index.html?demo=older-adult-burden'),
    ssriPatient: resetScenario('/index.html?demo=ssri-switch'),
    anesthesiaPatient: resetScenario('/index.html?demo=anesthesia-pgx-risk'),
    nebivololNullPatient: resetScenario('/index.html?substances=bupropion,clopidogrel,nebivolol&genotype=CYP2D6:null'),
    nebivololNullClinician: resetScenario('/index.html?substances=bupropion,clopidogrel,nebivolol&genotype=CYP2D6:null', 'clinician'),
    thiopurinePatient: resetScenario('/index.html?demo=thiopurine-marrow-toxicity'),
    potassiumClinician: resetScenario('/index.html?substances=potassium_chloride,spironolactone&tab=overview', 'clinician'),
    nitrateClinician: resetScenario('/index.html?substances=nitroglycerin,sildenafil&tab=overview', 'clinician'),
    ciprofloxacinIronPatient: resetScenario('/index.html?substances=ciprofloxacin,iron&tab=overview'),
    ciprofloxacinIronClinician: resetScenario('/index.html?substances=ciprofloxacin,iron&tab=overview', 'clinician'),
    tmpSmxAliasPatient: resetScenario('/index.html?substances=warfarin,sulfamethoxazole-trimethoprim&tab=overview'),
    tmpSmxAliasClinician: resetScenario('/index.html?substances=warfarin,sulfamethoxazole-trimethoprim&tab=overview', 'clinician'),
    ivabradinePatient: resetScenario('/index.html?substances=ivabradine,clarithromycin&tab=timing-levels'),
    codeineBupropionPatient: resetScenario('/index.html?substances=bupropion,codeine&genotype=CYP2D6:PM&tab=genes-metabolites'),
    codeineUmPatient: resetScenario('/index.html?substances=codeine&genotype=CYP2D6:UM&tab=overview'),
    codeineUmClinician: resetScenario('/index.html?substances=codeine&genotype=CYP2D6:UM&tab=overview', 'clinician'),
    tramadolPmPatient: resetScenario('/index.html?substances=tramadol&genotype=CYP2D6:PM&tab=overview'),
    tramadolUmPatient: resetScenario('/index.html?substances=tramadol&genotype=CYP2D6:UM&tab=overview'),
    metoprololPatient: resetScenario('/index.html?substances=metoprolol&genotype=CYP2D6:PM&tab=overview'),
    metoprololClinician: resetScenario('/index.html?substances=metoprolol&genotype=CYP2D6:PM&tab=overview', 'clinician'),
    atomoxetinePatient: resetScenario('/index.html?substances=atomoxetine&genotype=CYP2D6:PM&tab=overview'),
    atomoxetineClinician: resetScenario('/index.html?substances=atomoxetine&genotype=CYP2D6:PM&tab=overview', 'clinician'),
    warfarinPgxClinician: resetScenario('/index.html?substances=warfarin&genotype=CYP2C9:PM&genotype=VKORC1:PM&genotype=CYP4F2:IM&tab=overview', 'clinician'),
    g6pdClinician: resetScenario('/index.html?substances=rasburicase,primaquine,dapsone&genotype=G6PD:deficiency', 'clinician'),
    potatoFoodBiomarkerPatient: resetScenario('/index.html?substances=potatoes_solanine&genotype=CYP2D6:UM&tab=overview'),
    potatoFoodBiomarkerClinician: resetScenario('/index.html?substances=potatoes_solanine&genotype=CYP2D6:UM&tab=overview', 'clinician'),
  };
})()`);
assert(/Tacrolimus exposure may rise with Fluconazole/i.test(patientCopyAuditRegression.tacrolimusClinician.titles[0] || ''),
  `Tacrolimus + fluconazole should lead with tacrolimus exposure, got ${patientCopyAuditRegression.tacrolimusClinician.titles.join(' | ')}`);
assert(/Muscle injury risk may increase/i.test(patientCopyAuditRegression.simvastatinPatient.titles[0] || '') &&
  !/change medicine effects/i.test(patientCopyAuditRegression.simvastatinPatient.titles[0] || ''),
  `Simvastatin + clarithromycin patient title should be concrete, got ${patientCopyAuditRegression.simvastatinPatient.titles.join(' | ')}`);
assert(/muscle/i.test(patientCopyAuditRegression.simvastatinPatient.questions[0] || ''),
  `Simvastatin + clarithromycin patient question should mention muscle risk, got ${patientCopyAuditRegression.simvastatinPatient.questions.join(' | ')}`);
assert(/Muscle injury risk may increase/i.test(patientCopyAuditRegression.grapefruitPatient.titles[0] || '') &&
  !/change medicine effects/i.test(patientCopyAuditRegression.grapefruitPatient.titles[0] || ''),
  `Grapefruit + simvastatin patient title should be concrete, got ${patientCopyAuditRegression.grapefruitPatient.titles.join(' | ')}`);
assert(/Methotrexate side effects may increase/i.test(patientCopyAuditRegression.methotrexatePatient.titles[0] || '') &&
  !/change medicine effects/i.test(patientCopyAuditRegression.methotrexatePatient.titles[0] || ''),
  `Methotrexate + ibuprofen patient title should be concrete, got ${patientCopyAuditRegression.methotrexatePatient.titles.join(' | ')}`);
assert(/Tamoxifen may work less well/i.test(patientCopyAuditRegression.tamoxifenPatient.titles[0] || ''),
  `Tamoxifen + CYP2D6 PM patient title should name tamoxifen, got ${patientCopyAuditRegression.tamoxifenPatient.titles.join(' | ')}`);
assert(!patientCopyAuditRegression.g6pdPatient.titles.some(title => /Timing may need review/i.test(title)),
  `G6PD patient view should suppress low-value timing clutter, got ${patientCopyAuditRegression.g6pdPatient.titles.join(' | ')}`);
assert(/Abacavir may cause a serious allergic reaction/i.test(patientCopyAuditRegression.abacavirPatient.titles[0] || '') &&
  !patientCopyAuditRegression.abacavirPatient.titles.some(title => /Timing may need review/i.test(title)),
  `Abacavir + HLA-B*57:01 patient copy should be specific and suppress timing clutter, got ${patientCopyAuditRegression.abacavirPatient.titles.join(' | ')}`);
assert(/Allopurinol may cause a serious skin reaction/i.test(patientCopyAuditRegression.allopurinolPatient.titles[0] || '') &&
  !patientCopyAuditRegression.allopurinolPatient.titles.some(title => /Timing may need review/i.test(title)),
  `Allopurinol + HLA-B*58:01 patient copy should be specific and suppress timing clutter, got ${patientCopyAuditRegression.allopurinolPatient.titles.join(' | ')}`);
assert(patientCopyAuditRegression.capecitabinePatient.patientCards === 1 &&
  !patientCopyAuditRegression.capecitabinePatient.titles.some(title => /A medicine may work less well|Timing may need review/i.test(title)),
  `Capecitabine + DPYD patient view should keep one toxicity-first note, got ${patientCopyAuditRegression.capecitabinePatient.titles.join(' | ')}`);
assert(new Set(patientCopyAuditRegression.clopidogrelPatient.meanings).size === patientCopyAuditRegression.clopidogrelPatient.meanings.length,
  `Clopidogrel patient meaning cards should not duplicate, got ${patientCopyAuditRegression.clopidogrelPatient.meanings.join(' | ')}`);
assert(/Confusion, constipation, or fall risk may increase/i.test(patientCopyAuditRegression.olderAdultPatient.titles[0] || '') &&
  !patientCopyAuditRegression.olderAdultPatient.titles.some(title => /Timing may need review/i.test(title)) &&
  patientCopyAuditRegression.olderAdultPatient.patientCards <= 2,
  `Older-adult burden patient view should stay focused on burden cards, got ${patientCopyAuditRegression.olderAdultPatient.titles.join(' | ')}`);
assert(patientCopyAuditRegression.ssriPatient.titles.length >= 2 &&
  patientCopyAuditRegression.ssriPatient.titles.some(title => /Serotonin-related side effects may increase/i.test(title)) &&
  !/may change medicine effects/i.test((patientCopyAuditRegression.ssriPatient.titles || []).join(' | ')),
  `SSRI switch patient copy should avoid generic exposure wording, got ${patientCopyAuditRegression.ssriPatient.titles.join(' | ')}`);
assert(new Set(patientCopyAuditRegression.anesthesiaPatient.titles).size === patientCopyAuditRegression.anesthesiaPatient.titles.length,
  `Anesthesia PGx patient titles should dedupe repeated cards, got ${patientCopyAuditRegression.anesthesiaPatient.titles.join(' | ')}`);
assert(patientCopyAuditRegression.nebivololNullPatient.patientCards <= 4 &&
  new Set(patientCopyAuditRegression.nebivololNullPatient.titles).size === patientCopyAuditRegression.nebivololNullPatient.titles.length &&
  !/CYP2D6/i.test(patientCopyAuditRegression.nebivololNullPatient.titles[0] || '') &&
  /Nebivolol side-effect risk may increase/i.test(patientCopyAuditRegression.nebivololNullPatient.titles[0] || '') &&
  !patientCopyAuditRegression.nebivololNullPatient.titles.some(title => /Timing may need review/i.test(title)),
  `Nebivolol null patient view should reduce duplicate/noisy cards, got ${patientCopyAuditRegression.nebivololNullPatient.titles.join(' | ')}`);
assert(patientCopyAuditRegression.nebivololNullClinician.titles.length <= 4,
  `Nebivolol null clinician view should prune redundant overview cards, got ${patientCopyAuditRegression.nebivololNullClinician.titles.join(' | ')}`);
assert(patientCopyAuditRegression.thiopurinePatient.patientCards <= 2 &&
  !patientCopyAuditRegression.thiopurinePatient.titles.some(title => /may change medicine effects/i.test(title)),
  `Thiopurine marrow toxicity patient view should stay focused on the strongest risk, got ${patientCopyAuditRegression.thiopurinePatient.titles.join(' | ')}`);
assert(/High potassium risk may increase/i.test(patientCopyAuditRegression.potassiumClinician.titles[0] || ''),
  `Potassium + spironolactone clinician view should classify high potassium risk, got ${patientCopyAuditRegression.potassiumClinician.titles.join(' | ')}`);
assert(/Low blood pressure risk may increase/i.test(patientCopyAuditRegression.nitrateClinician.titles[0] || ''),
  `Nitroglycerin + sildenafil clinician view should classify low blood pressure risk, got ${patientCopyAuditRegression.nitrateClinician.titles.join(' | ')}`);
assert(/Ciprofloxacin may not absorb as expected/i.test(patientCopyAuditRegression.ciprofloxacinIronPatient.titles[0] || '') &&
  !patientCopyAuditRegression.ciprofloxacinIronPatient.titles.some(title => /may change medicine effects/i.test(title)),
  `Ciprofloxacin + iron patient view should use absorption wording, got ${patientCopyAuditRegression.ciprofloxacinIronPatient.titles.join(' | ')}`);
assert(/Ciprofloxacin absorption may fall with Iron/i.test(patientCopyAuditRegression.ciprofloxacinIronClinician.titles[0] || '') &&
  !patientCopyAuditRegression.ciprofloxacinIronClinician.titles.some(title => /^Ciprofloxacin may rise$/i.test(title)),
  `Ciprofloxacin + iron clinician view should lead with absorption and suppress model-only exposure noise, got ${patientCopyAuditRegression.ciprofloxacinIronClinician.titles.join(' | ')}`);
assert(/Warfarin bleeding risk may increase/i.test(patientCopyAuditRegression.tmpSmxAliasPatient.titles[0] || ''),
  `Warfarin + sulfamethoxazole-trimethoprim alias should resolve to a patient bleeding/side-effect concern, got ${patientCopyAuditRegression.tmpSmxAliasPatient.titles.join(' | ')}`);
assert(/Bleeding burden may rise/i.test(patientCopyAuditRegression.tmpSmxAliasClinician.titles[0] || ''),
  `Warfarin + sulfamethoxazole-trimethoprim alias should resolve to the TMP-SMX interaction, got ${patientCopyAuditRegression.tmpSmxAliasClinician.titles.join(' | ')}`);
assert(/Slow heart-rate risk may increase/i.test(patientCopyAuditRegression.ivabradinePatient.titles[0] || '') &&
  !patientCopyAuditRegression.ivabradinePatient.titles.some(title => /may change medicine effects/i.test(title)),
  `Ivabradine + clarithromycin patient view should use slow-heart-rate wording, got ${patientCopyAuditRegression.ivabradinePatient.titles.join(' | ')}`);
assert(patientCopyAuditRegression.codeineBupropionPatient.patientCards <= 2 &&
  patientCopyAuditRegression.codeineBupropionPatient.titles.some(title => /Codeine may work less well with Bupropion/i.test(title)) &&
  !patientCopyAuditRegression.codeineBupropionPatient.titles.some(title => /may change medicine effects/i.test(title)),
  `Bupropion + codeine patient view should suppress generic exposure wording, got ${patientCopyAuditRegression.codeineBupropionPatient.titles.join(' | ')}`);
assert(patientCopyAuditRegression.codeineUmPatient.titles.some(title => /Codeine opioid side-effect risk may increase/i.test(title)) &&
  !patientCopyAuditRegression.codeineUmPatient.titles.some(title => /work less well|build up|may change medicine effects/i.test(title)),
  `Codeine CYP2D6 UM patient view should describe opioid side-effect risk, got ${patientCopyAuditRegression.codeineUmPatient.titles.join(' | ')}`);
assert(!patientCopyAuditRegression.codeineUmClinician.titles.some(title => /Switching and washout timing may need review/i.test(title)),
  `Codeine CYP2D6 UM clinician view should suppress routine timing clutter, got ${patientCopyAuditRegression.codeineUmClinician.titles.join(' | ')}`);
assert(patientCopyAuditRegression.tramadolPmPatient.titles.some(title => /Tramadol may work less well/i.test(title)) &&
  !patientCopyAuditRegression.tramadolPmPatient.titles.some(title => /may change medicine effects/i.test(title)),
  `Tramadol CYP2D6 PM patient view should describe reduced analgesic effect, got ${patientCopyAuditRegression.tramadolPmPatient.titles.join(' | ')}`);
assert(patientCopyAuditRegression.tramadolUmPatient.titles.some(title => /Tramadol opioid side-effect risk may increase/i.test(title)) &&
  !patientCopyAuditRegression.tramadolUmPatient.titles.some(title => /work less well|build up|may change medicine effects/i.test(title)),
  `Tramadol CYP2D6 UM patient view should describe opioid side-effect risk, got ${patientCopyAuditRegression.tramadolUmPatient.titles.join(' | ')}`);
assert(/Metoprolol side-effect risk may increase/i.test(patientCopyAuditRegression.metoprololPatient.titles[0] || '') &&
  /pulse|blood pressure/i.test(patientCopyAuditRegression.metoprololPatient.questions[0] || '') &&
  !patientCopyAuditRegression.metoprololPatient.titles.some(title => /may change medicine effects/i.test(title)),
  `Metoprolol CYP2D6 PM patient view should be specific, got ${patientCopyAuditRegression.metoprololPatient.titles.join(' | ')}`);
assert(!patientCopyAuditRegression.metoprololClinician.titles.some(title => /Switching and washout timing may need review/i.test(title)),
  `Metoprolol CYP2D6 PM clinician view should suppress routine timing clutter, got ${patientCopyAuditRegression.metoprololClinician.titles.join(' | ')}`);
assert(/Atomoxetine side-effect risk may increase/i.test(patientCopyAuditRegression.atomoxetinePatient.titles[0] || '') &&
  /pulse|blood pressure|dose tolerance/i.test(patientCopyAuditRegression.atomoxetinePatient.questions[0] || '') &&
  !patientCopyAuditRegression.atomoxetinePatient.titles.some(title => /may change medicine effects/i.test(title)),
  `Atomoxetine CYP2D6 PM patient view should be specific, got ${patientCopyAuditRegression.atomoxetinePatient.titles.join(' | ')}`);
assert(!patientCopyAuditRegression.atomoxetineClinician.titles.some(title => /Switching and washout timing may need review/i.test(title)),
  `Atomoxetine CYP2D6 PM clinician view should suppress routine timing clutter, got ${patientCopyAuditRegression.atomoxetineClinician.titles.join(' | ')}`);
assert(/Warfarin INR sensitivity may increase/i.test(patientCopyAuditRegression.warfarinPgxClinician.titles[0] || '') &&
  !patientCopyAuditRegression.warfarinPgxClinician.titles.some(title => /Switching and washout timing may need review/i.test(title)),
  `Warfarin PGx clinician view should lead with INR sensitivity and suppress routine timing clutter, got ${patientCopyAuditRegression.warfarinPgxClinician.titles.join(' | ')}`);
assert(!patientCopyAuditRegression.g6pdClinician.titles.some(title => /Switching and washout timing may need review/i.test(title)),
  `G6PD clinician view should suppress routine timing clutter when a risk-marker concern exists, got ${patientCopyAuditRegression.g6pdClinician.titles.join(' | ')}`);
assert(/Food biomarker context may change/i.test(patientCopyAuditRegression.potatoFoodBiomarkerPatient.titles[0] || '') &&
  !patientCopyAuditRegression.potatoFoodBiomarkerPatient.titles.some(title => /Timing may need review/i.test(title)),
  `Potatoes + CYP2D6 patient view should lead with food/biomarker context, got ${patientCopyAuditRegression.potatoFoodBiomarkerPatient.titles.join(' | ')}`);
assert(/food|biomarker/i.test(patientCopyAuditRegression.potatoFoodBiomarkerPatient.questions[0] || ''),
  `Potatoes + CYP2D6 patient question should ask about food/biomarker context, got ${patientCopyAuditRegression.potatoFoodBiomarkerPatient.questions.join(' | ')}`);
assert(/CYP2D6 changes solanidine biomarker context/i.test(patientCopyAuditRegression.potatoFoodBiomarkerClinician.titles[0] || '') &&
  !patientCopyAuditRegression.potatoFoodBiomarkerClinician.titles.some(title => /Switching and washout timing may need review/i.test(title)),
  `Potatoes + CYP2D6 clinician view should lead with biomarker context, got ${patientCopyAuditRegression.potatoFoodBiomarkerClinician.titles.join(' | ')}`);

assert(browserErrors.length === 0, `Browser errors:\n${browserErrors.join('\n')}`);

dom.window.close();
console.log('Regression check passed.');
