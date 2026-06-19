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

function loadCase(win, drugs) {
  win.eval(`activeStack = [];
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
assert(publicNebivololNullDemoAudit.nebivololFold === 23, 'CYP2D6 null should use the observed nebivolol null fold');
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
    tabBarDisplay:document.getElementById('tabBar')?.style.display || '',
    summaryText:document.getElementById('summaryBar')?.textContent || '',
    summaryRisk:document.querySelector('#summaryBar .summary-risk')?.textContent || '',
    findingTitle:document.getElementById('findingTitle')?.textContent || '',
    detailButtons:document.querySelectorAll('#findingBody .related-finding-btn.secondary').length,
    supportDetails:document.querySelectorAll('#findingBody .finding-support-details').length,
    findingText:document.getElementById('findingBody')?.textContent || '',
    scopeText:document.getElementById('scopeBody')?.textContent || '',
    riskDisplay:document.getElementById('riskSection')?.style.display || '',
    shareUrl:currentStackShareUrl(),
  };
  setAudienceMode('clinician');
  const clinician = {
    audienceMode,
    bodyAudience:document.body.dataset.audience,
    tabBarDisplay:document.getElementById('tabBar')?.style.display || '',
    findingTitle:document.getElementById('findingTitle')?.textContent || '',
    supportDetails:document.querySelectorAll('#findingBody .finding-support-details').length,
  };
  return { patient, clinician };
})()`);
assert(audienceModeRegression.patient.audienceMode === 'patient', 'Audience URL should set Patient mode');
assert(audienceModeRegression.patient.bodyAudience === 'patient', 'Patient mode should mark body data-audience');
assert(audienceModeRegression.patient.activeTab === 'overview', 'Patient mode should force the Overview tab');
assert(audienceModeRegression.patient.tabBarDisplay === 'none', 'Patient mode should hide clinician tab navigation');
assert(audienceModeRegression.patient.summaryRisk.trim() === '', 'Patient mode should hide summary score badges');
assert(audienceModeRegression.patient.findingTitle === 'Safety Notes', 'Patient mode should rename findings to Safety Notes');
assert(audienceModeRegression.patient.detailButtons === 0, 'Patient mode should hide clinician supporting-detail buttons');
assert(audienceModeRegression.patient.supportDetails === 0, 'Patient mode should hide clinician supporting detail drawers');
assert(/What this means/.test(audienceModeRegression.patient.findingText), 'Patient mode should use plain-language finding labels');
assert(!/\b(?:AUC|Cmax|RxNorm|PGx|PMID|source-linked|modeled|confidence|clinical review needed|pharmacogenomics|metabolite-level|CYP\d)/i.test(
  `${audienceModeRegression.patient.summaryText} ${audienceModeRegression.patient.findingText} ${audienceModeRegression.patient.scopeText}`
), 'Patient mode should avoid clinician-only technical vocabulary in visible Overview copy');
assert(audienceModeRegression.patient.riskDisplay === 'none', 'Patient mode should hide the score-style risk panel');
assert(audienceModeRegression.patient.shareUrl.includes('audience=patient'), 'Patient-mode share URL should preserve audience mode');
assert(audienceModeRegression.clinician.audienceMode === 'clinician', 'Clinician mode should restore clinician state');
assert(audienceModeRegression.clinician.bodyAudience === 'clinician', 'Clinician mode should mark body data-audience');
assert(audienceModeRegression.clinician.tabBarDisplay !== 'none', 'Clinician mode should show tab navigation');
assert(audienceModeRegression.clinician.findingTitle === 'Interaction Findings', 'Clinician mode should restore clinician finding title');
assert(audienceModeRegression.clinician.supportDetails > 0, 'Clinician mode should show supporting detail drawers');

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
    cards:document.querySelectorAll('#findingBody .primary-finding-card').length,
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
assert(/drug-specific CYP2D6 clinical PK data/i.test(nebivololPgxDisplayRegression.summaryText), 'Nebivolol priority summary should explain the drug-specific PK basis');
assert(!/Codeine|Tamoxifen|TCAs/i.test(`${nebivololPgxDisplayRegression.summaryText} ${nebivololPgxDisplayRegression.genotypeText}`), 'Nebivolol genotype display should not inherit unrelated CYP2D6 example-drug text');
assert(/15\.0×|15\.0x/i.test(nebivololPgxFocusRegression.targetText), 'Nebivolol genotype card should display the 15x fold');
assert(nebivololPgxFocusRegression.activeTab === 'genes-metabolites', 'Priority View finding should open Genes + Metabolites for genotype priorities');
assert(nebivololPgxFocusRegression.highlighted && nebivololPgxFocusRegression.scrolled, 'Priority View finding should scroll to and highlight the target genotype card');

const clinicalFoldMatrixRegression = window.eval(`(() => {
  const cases = [
    { drug:'Flecainide', gene:'CYP2D6', expected:2.5 },
    { drug:'Omeprazole', gene:'CYP2C19', expected:5.0 },
    { drug:'Codeine', gene:'CYP2D6', expected:0.41 },
    { drug:'Tamoxifen', gene:'CYP2D6', expected:0.25 },
    { drug:'Clopidogrel', gene:'CYP2C19', expected:0.36 },
  ];
  return cases.map(({ drug, gene, expected }) => {
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
    `${row.drug} ${row.gene} PM should use observed clinical fold ${row.expected}x, not route-diluted ${row.fold}x`
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
  setTab("review");
  const g6pdReviewText = document.getElementById("warningPathBody")?.textContent || "";
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
  ['source_linked_pending_review', 'source_linked', 'professionally_reviewed_source_linked'].includes(evidenceLadderRegression.sourceSupportStatus),
  `Source-linked findings should expose source support status, got ${evidenceLadderRegression.sourceSupportStatus}`
);
assert(
  ['model_only_review_prompt', 'insufficient_source_support'].includes(evidenceLadderRegression.evidenceFreeSourceSupportStatus),
  `Evidence-free findings should show modeled/insufficient source support, got ${evidenceLadderRegression.evidenceFreeSourceSupportStatus}`
);
assert(evidenceLadderRegression.modelOnlyStrongestTier === 'unknown', 'Modeled evidence ladder should not display FDA/guideline backing');
assert(/modeled|clinical review needed/i.test(evidenceLadderRegression.modelOnlyCompact), 'Compact ladder should visibly identify modeled support and review need');
assert(evidenceLadderRegression.clinicalActionConfidence === 'pending_review' || evidenceLadderRegression.clinicalActionConfidence === 'insufficient', 'Clinical action confidence should remain conservative');
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
  return {
    evidenceBeforeOpen,
    reviewBeforeOpen,
    evidenceRendered,
    reviewRendered,
    findingsRetained:Boolean(overviewFindingIds) && Boolean(overviewFindingIdsAfterGenotype),
    genotypeChangedFindings:overviewFindingIds !== overviewFindingIdsAfterGenotype,
    evidenceInvalidated:evidenceKeyA !== evidenceKeyB,
    reviewInvalidated:reviewKeyA !== reviewKeyB,
  };
})()`);
assert(!lazyRenderingRegression.evidenceBeforeOpen, 'Evidence ledger should not render before Evidence tab is opened in a fresh lazy state');
assert(lazyRenderingRegression.reviewBeforeOpen === 0, 'Review summary should not render before Review tab is opened in a fresh lazy state');
assert(lazyRenderingRegression.evidenceRendered, 'Evidence should render when active tab is evidence');
assert(lazyRenderingRegression.reviewRendered, 'Review should render when active tab is review');
assert(lazyRenderingRegression.findingsRetained, 'Switching lazy tabs should not lose current findings');
assert(lazyRenderingRegression.genotypeChangedFindings, 'Changing genotype should update normalized findings');
assert(lazyRenderingRegression.evidenceInvalidated, 'Changing genotype should invalidate lazy Evidence content');
assert(lazyRenderingRegression.reviewInvalidated, 'Changing genotype should invalidate lazy Review content');

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
    helperText,
    manualOpen,
    manualOpenPreserved,
  };
})()`);
assert(/Supporting Metabolite Details/.test(rawMetaboliteMapRegression.titleText), 'Supporting metabolite details should use the public supporting-data label');
assert(rawMetaboliteMapRegression.accessible, 'Raw metabolite map should remain accessible');
assert(rawMetaboliteMapRegression.collapsedByDefault, 'Raw metabolite map should collapse by default when active-moiety rows exist');
assert(rawMetaboliteMapRegression.parentBalanceVisible, 'Drug & Metabolite Balance should remain visible above supporting metabolite details');
assert(/supporting details list modeled metabolites/i.test(rawMetaboliteMapRegression.helperText), 'Supporting metabolite details should explain that they are supporting data');
assert(rawMetaboliteMapRegression.manualOpen && rawMetaboliteMapRegression.manualOpenPreserved, 'Manual raw-map expansion should be preserved for the same stack');

const reviewHomeRegression = window.eval(`(() => {
  activeStack = [];
  userGenetics = {};
  activeGenotype = { CYP2D6:GENOTYPE_PHENOTYPE.PM, CYP2C19:GENOTYPE_PHENOTYPE.NM, CYP2C9:GENOTYPE_PHENOTYPE.NM, CYP3A4:GENOTYPE_PHENOTYPE.NM };
  addDrug('Codeine');
  addDrug('Fluoxetine');
  renderAll();
  setTab('review');
  return {
    activeTab,
    matrixPanel:document.getElementById('matrixSection')?.closest('.tab-panel')?.id,
    summaryTiles:document.querySelectorAll('#reviewSummaryBody .review-summary-tile').length,
    scenarioCards:document.querySelectorAll('#scenarioSnapshotBody .review-diagnostic-card').length,
    gapCards:document.querySelectorAll('#metaboliteGapBody .review-diagnostic-card').length,
    warningPaths:document.querySelectorAll('#warningPathBody .warning-path-row').length,
    actionButtons:document.querySelectorAll('#contributeBody .review-action-btn').length,
    summaryText:document.getElementById('reviewSummaryBody')?.textContent || '',
  };
})()`);
assert(reviewHomeRegression.activeTab === 'review', 'Review tab should activate');
assert(reviewHomeRegression.matrixPanel === 'tab-review', 'Interaction Grid should live in Review');
assert(reviewHomeRegression.summaryTiles >= 6, 'Review Summary should expose current-stack summary tiles');
assert(reviewHomeRegression.scenarioCards === 0, 'Generated scenario snapshots should stay out of the slim bundle');
assert(reviewHomeRegression.gapCards === 0, 'Generated metabolite coverage gaps should stay out of the slim bundle');
assert(reviewHomeRegression.warningPaths > 0, 'Review should expose technical pathway diagnostics');
assert(reviewHomeRegression.actionButtons >= 3, 'Review should expose report/contribute actions');
assert(/Pending Review/i.test(reviewHomeRegression.summaryText), 'Review Summary should expose pending review status');

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
  setTab('review');
  const reviewHas = document.querySelectorAll('#warningPathBody .warning-path-row').length > 0;
  return {
    overviewHas,
    overviewFullPathCount,
    overviewWhyText,
    mechanismsHas,
    evidenceHas,
    reviewHas,
    mechanismPanel:document.getElementById('mechanismWhySection')?.closest('.tab-panel')?.id,
    reviewPanel:document.getElementById('warningPathSection')?.closest('.tab-panel')?.id,
  };
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
assert(crossTabFindingRegression.reviewHas, 'Review should debug findings through technical pathways');
assert(crossTabFindingRegression.mechanismPanel === 'tab-mechanisms', 'Mechanism why paths should stay in Mechanisms');
assert(crossTabFindingRegression.reviewPanel === 'tab-review', 'Technical pathways should stay in Review');

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
    const presentations = getCurrentPublicFindingPresentations();
    const cards = Array.from(document.querySelectorAll("#findingBody .primary-finding-card"));
    const overviewText = document.getElementById("findingBody")?.textContent || "";
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
      allCardsHaveSteps:cards.every(card => ["What changed", "Why it matters", "What to review", "Evidence"].every(label => card.textContent.includes(label))),
      summaryOnclick,
      overviewText,
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
    clopidogrel:resetScenario(["Clopidogrel", "Omeprazole"], () => { activeGenotype.CYP2C19 = GENOTYPE_PHENOTYPE.PM; }),
  };
})()`);
for (const [scenarioName, result] of Object.entries(publicFindingHierarchyRegression)) {
  assert(result.presentations.length > 0, `${scenarioName}: expected at least one public Overview finding`);
  assert(result.cardCount === result.presentations.length || result.cardCount === Math.min(8, result.presentations.length), `${scenarioName}: Overview cards should match public finding presentations`);
  assert(result.allCardsHaveSteps, `${scenarioName}: every primary Overview card should use What changed / Why / What to review / Evidence`);
  assert(result.presentations.every(p => p.whatChanged && p.whyItMatters && p.whatToReview && p.evidenceSummary), `${scenarioName}: public finding presentation fields must be non-empty`);
  assert(result.presentations.every(p => p.targetTab === "overview" && /^overview-finding-/.test(p.targetElementId || "")), `${scenarioName}: public finding targets should point to Overview cards`);
  assert(result.summaryOnclick.includes("focusPriorityFinding('overview','overview-finding-"), `${scenarioName}: Summary View finding should jump to a concrete Overview card`);
  assert(!/Phase\\s*\\d+|top-250|top-100|coverage adapter|route adapter|pending professional review|review prompt/i.test(result.overviewText), `${scenarioName}: Overview should not expose internal labels or repeated review wording`);
  assert(!/Phase\\s*\\d+|top-250|top-100|coverage adapter|route adapter|pending professional review/i.test(result.mechanismText), `${scenarioName}: Mechanisms should not expose internal labels`);
  assert(!/Phase\\s*\\d+|top-250|top-100|coverage adapter|route adapter|pending professional review/i.test(result.genesText), `${scenarioName}: Genes + Metabolites should not expose internal labels`);
  assert(!/pending professional review/i.test(result.evidenceText), `${scenarioName}: Evidence should use compact review labels instead of repeated pending-professional-review copy`);
}
assert(/Paroxetine|Fluoxetine/i.test(publicFindingHierarchyRegression.ssri.overviewText), 'Paroxetine + Fluoxetine should still identify affected substances in Overview');
assert(publicFindingHierarchyRegression.nebivolol.presentations.filter(p => /Nebivolol|CYP2D6/i.test(p.title + " " + p.whatChanged)).length === 1, 'Nebivolol + CYP2D6 PM should show one clear Overview PGx priority');
assert(publicFindingHierarchyRegression.nebivolol.cardCount <= 3, 'Nebivolol + CYP2D6 PM should not fragment into many Overview cards');
assert(/Nebivolol/i.test(publicFindingHierarchyRegression.nebivolol.overviewText), 'Nebivolol PGx Overview should name Nebivolol');
assert(!/Codeine|Tamoxifen|TCAs/i.test(publicFindingHierarchyRegression.nebivolol.overviewText + publicFindingHierarchyRegression.nebivolol.genesText), 'Nebivolol PGx copy should not leak generic CYP2D6 examples');
assert(publicFindingHierarchyRegression.codeine.presentations.some(p => /Codeine activation|Morphine/i.test(p.title + " " + p.whatChanged)), 'Codeine + Fluoxetine + CYP2D6 PM should keep activation-failure interpretation in Overview');
assert(publicFindingHierarchyRegression.codeine.genesRelatedButtons > 0, 'Codeine PGx/metabolite support should link back to the Overview finding');
assert(publicFindingHierarchyRegression.clopidogrel.presentations.some(p => /Clopidogrel activation|active thiol/i.test(p.title + " " + p.whatChanged)), 'Clopidogrel + Omeprazole + CYP2C19 PM should keep prodrug activation traceability in Overview');
assert(publicFindingHierarchyRegression.clopidogrel.evidenceRelatedButtons > 0, 'Clopidogrel evidence support should link back to the Overview finding');

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
    sourcePending: counts['Source Candidates Pending Review'] || 0,
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
assert(browseCategoryAudit.sourcePending <= 8, `Browse UI should leave only truly ambiguous source candidates pending, got ${browseCategoryAudit.sourcePending}`);
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
    setTab("review");
    return {
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

assert(browserErrors.length === 0, `Browser errors:\n${browserErrors.join('\n')}`);

dom.window.close();
console.log('Regression check passed.');
