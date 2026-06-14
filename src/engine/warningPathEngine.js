// MedCheck Engine — per-warning causal path objects

function buildWarningPath(finding, stack, genotypeState = {}, context = {}) {
  if (!finding) return null;
  const sourceRows = finding.sourceRows || [];
  const activeMoietyRow = sourceRows.find(row => row?.netPattern);
  if (activeMoietyRow) return buildActiveMoietyWarningPath(activeMoietyRow, { finding, stack, genotypeState, ...context });
  const phenoconversionRow = sourceRows.find(row => row?.functionalPhenotype);
  if (phenoconversionRow) return buildPhenoconversionWarningPath(phenoconversionRow, { finding, stack, genotypeState, ...context });
  const timingRow = sourceRows.find(row => row?.persistenceType);
  if (timingRow) return buildTimingWarningPath(timingRow, { finding, stack, genotypeState, ...context });
  const interactionRow = sourceRows.find(row => row?.drug1 || row?.drug2 || row?.enzyme);
  if (interactionRow) return buildInteractionWarningPath(interactionRow, { finding, stack, genotypeState, ...context });
  return null;
}

function buildActiveMoietyWarningPath(activeMoietyRow, context = {}) {
  if (!activeMoietyRow) return null;
  const nodes = [];
  const edges = [];
  const addNode = (node) => {
    if (!node?.id || nodes.some(existing => existing.id === node.id)) return;
    nodes.push(node);
  };
  const addEdge = (edge) => {
    if (!edge?.from || !edge?.to) return;
    edges.push(edge);
  };
  const formation = activeMoietyRow.formationPathway || "";
  const clearance = activeMoietyRow.clearancePathway || "";
  const parentId = activeMoietyFindingId([activeMoietyRow.parent]);
  const actorId = activeMoietyRow.actorId || activeMoietyFindingId([activeMoietyRow.actor]);
  addNode({ id:parentId, label:activeMoietyRow.parent, type:"drug", role:"parent" });
  addNode({ id:actorId, label:activeMoietyRow.actor, type:"metabolite", role:activeMoietyRow.actorType || "metabolite" });

  const inhibitor = formation ? activeMoietyInhibitionContext(formation, activeMoietyRow.parent, context.stack || activeStack)[0] : null;
  if (inhibitor) {
    const inhibitorId = activeMoietyFindingId([inhibitor.name]);
    addNode({ id:inhibitorId, label:inhibitor.name, type:"drug", role:"inhibitor" });
    addNode({ id:formation, label:formation, type:"enzyme", role:"formation pathway" });
    addEdge({ from:inhibitorId, to:formation, type:"INHIBITS", label:"inhibits", direction:"blocks", confidence:activeMoietyRow.confidence || "moderate", evidenceRefs:[] });
  } else if (formation) {
    addNode({ id:formation, label:formation, type:"enzyme", role:"formation pathway" });
  }

  if (formation) {
    addEdge({
      from:formation,
      to:actorId,
      type:activeMoietyRow.metaboliteDirection === "down" ? "REDUCES_FORMATION" : "CHANGES_FORMATION",
      label:activeMoietyRow.metaboliteDirection === "down" ? "reduces formation of" : "changes formation of",
      direction:activeMoietyRow.metaboliteDirection || "unknown",
      confidence:activeMoietyRow.confidence || "unknown",
      evidenceRefs:activeMoietyRow.evidenceRefs || [],
    });
  }
  if (clearance && activeMoietyRow.netPattern === "toxic_metabolite_accumulation") {
    addNode({ id:clearance, label:clearance, type:"enzyme", role:"clearance pathway" });
    addEdge({ from:clearance, to:actorId, type:"REDUCES_CLEARANCE", label:"reduced clearance may raise", direction:"up", confidence:activeMoietyRow.confidence || "unknown", evidenceRefs:activeMoietyRow.evidenceRefs || [] });
  }
  const outcomeId = activeMoietyFindingId(["outcome", activeMoietyRow.netPattern, activeMoietyRow.actor]);
  addNode({ id:outcomeId, label:(ACTIVE_MOIETY_PATTERN_LABELS[activeMoietyRow.netPattern] || activeMoietyRow.netPattern || "review prompt").replace(/_/g, " "), type:"outcome", role:"review prompt" });
  addEdge({ from:actorId, to:outcomeId, type:"MAY_CAUSE", label:"may cause", direction:activeMoietyRow.metaboliteDirection || "unknown", confidence:activeMoietyRow.confidence || "unknown", evidenceRefs:activeMoietyRow.evidenceRefs || [] });
  return {
    nodes,
    edges,
    summary: activeMoietyFindingSummary(activeMoietyRow),
    evidenceRefs: uniqueWarningPathValues(activeMoietyRow.evidenceRefs || []),
    reviewRequired: activeMoietyRow.reviewRequired !== false,
  };
}

function buildPhenoconversionWarningPath(phenoconversionRow, context = {}) {
  if (!phenoconversionRow) return null;
  const nodes = [{ id:phenoconversionRow.enzyme, label:phenoconversionRow.enzyme, type:"enzyme", role:"functional pathway" }];
  const edges = [];
  for (const driver of phenoconversionRow.drivers || []) {
    const driverId = activeMoietyFindingId([driver.actor, driver.type]);
    nodes.push({ id:driverId, label:driver.type === "genotype" ? `${driver.actor} genotype` : driver.actor, type:driver.type === "genotype" ? "gene" : "drug", role:driver.type });
    edges.push({
      from:driverId,
      to:phenoconversionRow.enzyme,
      type:driver.type === "inducer" ? "INDUCES" : driver.type === "inhibitor" ? "INHIBITS" : "CHANGES_FUNCTION",
      label:driver.type === "inducer" ? "induces" : driver.type === "inhibitor" ? "inhibits" : "changes function of",
      direction:phenoconversionRow.direction,
      confidence:phenoconversionRow.confidence || "unknown",
      evidenceRefs:phenoconversionRow.evidenceRefs || [],
    });
  }
  const functionalId = activeMoietyFindingId([phenoconversionRow.enzyme, phenoconversionRow.functionalPhenotype]);
  nodes.push({ id:functionalId, label:PHENOCONVERSION_LABELS[phenoconversionRow.functionalPhenotype] || phenoconversionRow.functionalPhenotype, type:"phenotype", role:"functional phenotype" });
  edges.push({ from:phenoconversionRow.enzyme, to:functionalId, type:"FUNCTIONS_AS", label:"behaves as", direction:phenoconversionRow.direction, confidence:phenoconversionRow.confidence || "unknown", evidenceRefs:phenoconversionRow.evidenceRefs || [] });
  for (const name of (phenoconversionRow.affectedParents || []).slice(0, 3)) {
    const id = activeMoietyFindingId([name]);
    nodes.push({ id, label:name, type:"drug", role:"affected parent" });
    edges.push({ from:functionalId, to:id, type:"AFFECTS", label:"affects", direction:phenoconversionRow.direction, confidence:phenoconversionRow.confidence || "unknown", evidenceRefs:phenoconversionRow.evidenceRefs || [] });
  }
  return {
    nodes: uniqueWarningPathNodes(nodes),
    edges,
    summary: phenoconversionSummary(phenoconversionRow),
    evidenceRefs: uniqueWarningPathValues(phenoconversionRow.evidenceRefs || []),
    reviewRequired: true,
  };
}

function buildTimingWarningPath(timelineRow, context = {}) {
  if (!timelineRow) return null;
  const parentId = activeMoietyFindingId([timelineRow.parent || timelineRow.actor]);
  const actorId = activeMoietyFindingId([timelineRow.actor]);
  return {
    nodes:[
      { id:parentId, label:timelineRow.parent || timelineRow.actor, type:"drug", role:"parent" },
      { id:actorId, label:timelineRow.actor, type:"actor", role:timelineRow.persistenceType || "persistence" },
    ],
    edges:[{ from:parentId, to:actorId, type:"PERSISTS_AS", label:"persists as", direction:timelineRow.riskWindow || "unknown", confidence:timelineRow.confidence || "unknown", evidenceRefs:timelineRow.evidenceRefs || [] }],
    summary: timelineRow.reasons?.join("; ") || "Persistence timing requires review.",
    evidenceRefs: uniqueWarningPathValues(timelineRow.evidenceRefs || []),
    reviewRequired: timelineRow.reviewRequired !== false,
  };
}

function buildInteractionWarningPath(row, context = {}) {
  const nodes = [];
  const edges = [];
  const drug1 = row.drug1 || row.drugs?.[0];
  const drug2 = row.drug2 || row.drugs?.[1];
  const pathway = row.enzyme || row.affectedPathway || row.category || "";
  const drug1Id = activeMoietyFindingId([drug1]);
  const drug2Id = activeMoietyFindingId([drug2]);
  if (drug1) nodes.push({ id:drug1Id, label:drug1, type:"drug", role:"perpetrator" });
  if (pathway) nodes.push({ id:pathway, label:pathway, type:isFindingGeneLike(pathway) ? "enzyme" : "pathway", role:"pathway" });
  if (drug2) nodes.push({ id:drug2Id, label:drug2, type:"drug", role:"victim" });
  if (drug1 && pathway) edges.push({ from:drug1Id, to:pathway, type:/induc/i.test(row.type || row.mechanism || "") ? "INDUCES" : "INHIBITS", label:/induc/i.test(row.type || row.mechanism || "") ? "induces" : "inhibits", direction:findingPathwayDirection(row), confidence:row.confidence || "unknown", evidenceRefs:row.evidenceRefs || [] });
  if (pathway && drug2) edges.push({ from:pathway, to:drug2Id, type:"CHANGES_EXPOSURE", label:row.effect || "changes exposure of", direction:findingDirectionForActor(drug2, row), confidence:row.confidence || "unknown", evidenceRefs:row.evidenceRefs || [] });
  return {
    nodes: uniqueWarningPathNodes(nodes),
    edges,
    summary: row.mechanism || row.effect || "Interaction pathway requires review.",
    evidenceRefs: uniqueWarningPathValues(row.evidenceRefs || []),
    reviewRequired: true,
  };
}

function formatWarningPath(path) {
  if (!path?.nodes?.length) return "";
  const nodeById = new Map(path.nodes.map(node => [node.id, node]));
  if (!path.edges?.length) return path.nodes.map(node => node.label).join(" -> ");
  return path.edges.map(edge => {
    const from = nodeById.get(edge.from)?.label || edge.from;
    const to = nodeById.get(edge.to)?.label || edge.to;
    return `${from} ${edge.label || edge.type} ${to}`;
  }).join(" -> ");
}

function uniqueWarningPathNodes(nodes = []) {
  const seen = new Set();
  const out = [];
  for (const node of nodes) {
    if (!node?.id || seen.has(node.id)) continue;
    seen.add(node.id);
    out.push(node);
  }
  return out;
}

function uniqueWarningPathValues(values = []) {
  return [...new Set((values || []).map(value => String(value || "").trim()).filter(Boolean))];
}
