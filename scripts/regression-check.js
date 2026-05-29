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

assert(window.eval('MEDCHECK_VERSION.engine') === '3.5.3', 'Regression build loaded wrong engine version');
assert(window.eval('PK_DOSE_INTERVALS.codeine') === 6, 'PK dose interval rules did not load');
assert(window.eval('PHENOTYPE_RISK_RULES.qtc.thresholds[1]') === 5, 'Phenotype risk rules did not load');
assert(window.eval('EDGE_TYPE_BASE_WEIGHT[EDGE_TYPE.SUBSTRATE_OF]') === 0.92, 'Edge base weight rules did not load');

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
  return {
    amphetamineBrands: drug('Amphetamine')?.brandNames || [],
    lisdexamfetamine: drug('Lisdexamfetamine'),
    simvastatinProdrug: !!drug('Simvastatin')?.prodrug,
    dabigatranProdrug: !!drug('Dabigatran')?.prodrug,
    hasGemfibrozilStatin: hasPair('Simvastatin','Gemfibrozil') && hasPair('Rosuvastatin','Gemfibrozil'),
    hasRifampinDoacs: hasPair('Dabigatran','Rifampin') && hasPair('Apixaban','Rifampin') && hasPair('Rivaroxaban','Rifampin'),
    hasTransporterPairs: hasPair('Digoxin', "St. John's Wort") && hasPair('Metformin','Trimethoprim-SMX') && hasPair('Methotrexate','Probenecid'),
  };
})()`);
assert(!batchAuditFixes.amphetamineBrands.includes('Vyvanse') && !batchAuditFixes.amphetamineBrands.includes('Elvanse'), 'Vyvanse/Elvanse should not be Amphetamine brands');
assert(batchAuditFixes.lisdexamfetamine?.prodrug, 'Lisdexamfetamine should be modeled as a separate prodrug');
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

assert(browserErrors.length === 0, `Browser errors:\n${browserErrors.join('\n')}`);

dom.window.close();
console.log('Regression check passed.');
