#!/usr/bin/env node
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { JSDOM, VirtualConsole } from 'jsdom';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, '.tmp', 'regression-index.html');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadCase(win, drugs) {
  win.eval(`activeStack = [];
    drugDoses && Object.keys(drugDoses).forEach(k => delete drugDoses[k]);
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

console.log('Building regression-test HTML...');
execFileSync(process.execPath, ['build.js', '--out', OUT], { cwd: ROOT, stdio: 'pipe' });

const html = readFileSync(OUT, 'utf8');
const browserErrors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (err) => {
  const msg = err && err.message ? err.message : String(err);
  if (!msg.includes('Could not load script: "https://cdnjs.cloudflare.com/ajax/libs/d3/')) {
    browserErrors.push(msg);
  }
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

assert(window.eval('MEDCHECK_VERSION.engine') === '3.5.5', 'Regression build loaded wrong engine version');
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
assert(batchAuditFixes.simvastatinProdrug && batchAuditFixes.dabigatranProdrug, 'Batch prodrug flags should be present');
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
  clopidogrelSummary.label === 'PGx High',
  'Clopidogrel + CYP2C19 PM should be highest-priority PGx, not a generic single-medication prompt'
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
  'Highest-priority PGx summary should include only clinical narrative and next review step'
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
  abacavirSummary.label === 'PGx High',
  'Abacavir + HLA-B*57:01 present should surface as highest-priority PGx risk'
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
assert(urlNullAudit.tab === 'pgx', 'URL state should still restore the requested tab');

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
  !/documented|already curated/i.test(window.document.getElementById('mechanisticBody').textContent),
  'Mechanistic UI should keep documented interactions out of the model-only read-through section'
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
  'Mechanistic renderer should show model-only genotype-drug cards and leave documented PGx to Genetics/Evidence'
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
    lsd: byName.LSD,
    albuterol: byName.Albuterol,
    aspirinLowDose: byName['Aspirin (Low-Dose)'],
    alcohol: byName['Alcohol (Ethanol)'],
  };
})()`);
assert(browseCategoryAudit.categories <= 12, `Browse UI should stay consolidated, got ${browseCategoryAudit.categories} categories`);
assert(browseCategoryAudit.singletonCategories <= 1, `Browse UI should avoid one-item category sprawl, got ${browseCategoryAudit.singletonCategories}`);
assert(browseCategoryAudit.lsd === 'Recreational & Social', 'LSD should browse under Recreational & Social, not Antipsychotics');
assert(browseCategoryAudit.albuterol === 'Respiratory, Allergy & Cough', 'Albuterol should browse under Respiratory, Allergy & Cough, not Beta-Blockers');
assert(browseCategoryAudit.aspirinLowDose === 'Cardiovascular & Blood', 'Low-dose aspirin should browse under Cardiovascular & Blood');
assert(browseCategoryAudit.alcohol === 'Recreational & Social', 'Alcohol should browse under Recreational & Social');

assert(browserErrors.length === 0, `Browser errors:\n${browserErrors.join('\n')}`);

dom.window.close();
console.log('Regression check passed.');
