// MedCheck Engine — normalized interaction finding model

const FINDING_SEVERITY_ORDER = {
  critical: 5,
  severe: 4,
  moderate: 3,
  monitor: 2,
  info: 1,
  unknown: 0,
};

function buildInteractionFindings(stack, genotypeState = {}, options = {}) {
  const activeNames = Array.isArray(stack) && stack.length ? stack : activeStack;
  const interactions = Array.isArray(options.interactions)
    ? options.interactions
    : (typeof calcRisk === "function" ? calcRisk().interactions : []);
  const interactionFindings = interactions
    .filter(row => row && row.source !== "combination" && row.type !== "combination")
    .map(row => normalizeKnownInteractionFinding(row, { stack:activeNames, genotypeState }));
  const combinationRows = Array.isArray(options.combinations)
    ? options.combinations
    : getActiveCombinationFindingRows(activeNames);
  const combinationFindings = combinationRows.map(row => normalizeCombinationFinding(row, { stack:activeNames, genotypeState }));
  const activeMoietyRows = Array.isArray(options.activeMoietyRows)
    ? options.activeMoietyRows
    : (typeof computeActiveMoietyBalance === "function" ? computeActiveMoietyBalance(activeNames, genotypeState) : []);
  const activeMoietyFindings = typeof activeMoietyRowsToFindings === "function"
    ? activeMoietyRowsToFindings(activeMoietyRows)
    : [];
  return rankFindings(mergeDuplicateFindings([
    ...interactionFindings,
    ...combinationFindings,
    ...activeMoietyFindings,
  ].filter(Boolean)));
}

function normalizeKnownInteractionFinding(ddi, context = {}) {
  if (!ddi) return null;
  const pair = [ddi.drug1, ddi.drug2].filter(Boolean);
  const evidenceRefs = uniqueFindingValues(ddi.evidenceRefs || []);
  const studies = resolveFindingStudies(evidenceRefs);
  const severity = normalizeFindingSeverity(ddi.severity, ddi);
  const type = classifyInteractionFindingType(ddi);
  const pathway = ddi.enzyme || ddi.affectedPathway || ddi.category || ddi.type || "pathway";
  const confidence = normalizeFindingConfidence(ddi.confidence || ddi.evidence?.confidence, evidenceRefs);
  const title = makeFindingTitle(ddi, type);
  const summary = ddi.effect || ddi.mechanism || "Medication stack signal requires review.";
  const actors = buildFindingActors(ddi, pair, pathway);
  const tags = uniqueFindingValues([
    findingTypeLabel(type),
    ddi.type,
    ddi.category,
    pathway,
    ddi.genotypeContext ? "Genotype context" : "",
    mentionsActiveMetabolite(ddi) ? "Active metabolite" : "",
    mentionsToxicity(ddi) ? "Toxicity" : "",
  ]);
  return {
    id: makeFindingId(["finding", type, ...pair, pathway]),
    type,
    title,
    severity,
    confidence,
    summary,
    affectedActors: actors,
    tags,
    evidenceRefs,
    reviewRequired: !hasProfessionalFindingReview(studies),
    whyPath: null,
    evidenceLadder: null,
    source: ddi.source === "known" || ddi.sourceEngine === "curated" || ddi.type === "known-ddi"
      ? "known_ddi"
      : ddi.source === "transporter" || ddi.type === "transporter"
      ? "transporter_engine"
      : ddi.type === "pharmacodynamic"
      ? "phenotype_engine"
      : ddi.source === "graph"
      ? "mechanistic_pathway"
      : "interaction_engine",
    sourceRows: [ddi],
    groupedFindings: [],
    clinicalAction: ddi.clinicalAction || ddi.management || "",
    evidenceStatus: summarizeFindingEvidenceStatus(evidenceRefs, studies),
  };
}

function normalizeCombinationFinding(row, context = {}) {
  if (!row) return null;
  const pair = uniqueFindingValues(row.drugs || [row.drug1, row.drug2]);
  const severity = normalizeFindingSeverity(row.severity, row);
  const metabolite = row.metabolite || row.result?.increased || "";
  const summary = row.effect || row.risk || row.mechanism || "Combination-product signal requires review.";
  const actors = [
    ...pair.map(name => ({ id:name, type:"parent_drug", direction:"involved" })),
    metabolite ? {
      id:metabolite,
      type:mentionsToxicity(row) ? "toxic_metabolite" : "metabolite",
      direction:row.result?.decreased === metabolite ? "down" : "up",
    } : null,
  ].filter(Boolean);
  const tags = uniqueFindingValues([
    "Combination burden",
    row.type,
    metabolite ? "Metabolite" : "",
    mentionsToxicity(row) ? "Toxicity" : "",
    row.management ? "Management prompt" : "",
  ]);
  return {
    id: makeFindingId(["finding", "combination", ...pair, row.type || metabolite]),
    type: "combination_burden",
    title: row.metabolite
      ? `${pair.join(" + ")} may create ${row.metabolite}`
      : `${pair.join(" + ")} creates a combination warning`,
    severity,
    confidence: row.evidence?.confidence || "moderate",
    summary,
    affectedActors: actors,
    tags,
    evidenceRefs: uniqueFindingValues(row.evidenceRefs || []),
    reviewRequired: true,
    whyPath: null,
    evidenceLadder: null,
    source: "combination_engine",
    sourceRows: [row],
    groupedFindings: [],
    clinicalAction: row.management || row.alternative || "",
    evidenceStatus: "modeled/review prompt",
  };
}

function normalizeMechanisticFinding(row, context = {}) {
  if (!row) return null;
  return {
    id: makeFindingId(["finding", "mechanistic", row.id || row.title || row.pathway]),
    type: "mechanistic_pathway",
    title: row.title || "Mechanistic pathway review prompt",
    severity: normalizeFindingSeverity(row.severity || row.curatedSeverity || "monitor", row),
    confidence: row.confidence || "low",
    summary: row.clinicalMeaning || row.action || row.summary || "Mechanistic model signal requires review.",
    affectedActors: uniqueFindingValues([...(row.drugs || []), row.metabolite, row.pathway])
      .map(id => ({ id, type:String(id || "").match(/^CYP|UGT|DPYD|TPMT|NUDT/i) ? "enzyme" : "actor", direction:"involved" })),
    tags: uniqueFindingValues(["Mechanistic pathway", row.kind, row.pathway]),
    evidenceRefs: uniqueFindingValues(row.evidenceRefs || []),
    reviewRequired: true,
    whyPath: null,
    evidenceLadder: null,
    source: "mechanistic_pathway",
    sourceRows: [row],
    groupedFindings: [],
    clinicalAction: row.action || "",
    evidenceStatus: "model-only review prompt",
  };
}

function mergeDuplicateFindings(findings) {
  const groups = new Map();
  for (const finding of findings || []) {
    const actors = (finding.affectedActors || [])
      .filter(actor => actor.type === "parent_drug")
      .map(actor => normalizeFindingToken(actor.id))
      .sort();
    const key = actors.length >= 2
      ? `pair:${actors.slice(0, 2).join("|")}`
      : `finding:${finding.id}`;
    const list = groups.get(key) || [];
    list.push(finding);
    groups.set(key, list);
  }

  const merged = [];
  for (const list of groups.values()) {
    if (list.length === 1) {
      merged.push(list[0]);
      continue;
    }
    const ranked = rankFindings(list);
    const base = Object.assign({}, ranked[0]);
    const grouped = ranked.slice(1);
    base.severity = ranked.reduce((worst, finding) =>
      FINDING_SEVERITY_ORDER[finding.severity] > FINDING_SEVERITY_ORDER[worst] ? finding.severity : worst,
      base.severity
    );
    base.confidence = highestFindingConfidence(ranked.map(f => f.confidence));
    base.tags = uniqueFindingValues(ranked.flatMap(f => f.tags || []));
    base.evidenceRefs = uniqueFindingValues(ranked.flatMap(f => f.evidenceRefs || []));
    base.affectedActors = mergeFindingActors(ranked.flatMap(f => f.affectedActors || []));
    base.sourceRows = ranked.flatMap(f => f.sourceRows || []);
    base.groupedFindings = grouped.map(f => ({
      id:f.id,
      type:f.type,
      title:f.title,
      severity:f.severity,
      source:f.source,
    }));
    base.source = uniqueFindingValues(ranked.map(f => f.source)).length > 1 ? "multiple_engines" : base.source;
    base.reviewRequired = ranked.some(f => f.reviewRequired);
    if (grouped.length) {
      const groupedText = grouped.map(f => f.title).filter(Boolean).slice(0, 2).join("; ");
      if (groupedText && !base.summary.includes(groupedText)) {
        base.summary = `${base.summary} Additional grouped signal: ${groupedText}.`;
      }
    }
    base.evidenceStatus = summarizeFindingEvidenceStatus(base.evidenceRefs, resolveFindingStudies(base.evidenceRefs));
    merged.push(base);
  }
  return merged;
}

function rankFindings(findings) {
  return (findings || []).slice().sort((a, b) => findingRankScore(b) - findingRankScore(a) || String(a.title || "").localeCompare(String(b.title || "")));
}

function findingRankScore(finding) {
  const severity = FINDING_SEVERITY_ORDER[finding?.severity] || 0;
  const confidence = { high: 3, moderate: 2, low: 1, unknown: 0 }[finding?.confidence] || 0;
  const tags = (finding?.tags || []).join(" ").toLowerCase();
  const actors = finding?.affectedActors || [];
  return (severity * 1000) +
    (mentionsActiveMetabolite(finding) || /active metabolite|prodrug|toxic/.test(tags) ? 150 : 0) +
    (/genotype|phenoconversion|cyp|ugt|dpyd|tpmt|nudt/.test(tags) ? 100 : 0) +
    ((finding?.evidenceRefs || []).length ? 75 : 0) +
    (actors.length * 10) +
    (confidence * 5);
}

function getActiveCombinationFindingRows(stack) {
  const activeNames = Array.isArray(stack) ? stack : [];
  return (COMBINATION_PRODUCTS || []).filter(row =>
    (row.drugs || []).every(name => activeNames.includes(name))
  );
}

function classifyInteractionFindingType(row) {
  const text = `${row.type || ""} ${row.category || ""} ${row.effect || ""} ${row.mechanism || ""}`.toLowerCase();
  if (row.type === "transporter" || /transporter|p-gp|oatp|oct|oat\b/.test(text)) return "transporter";
  if (/prodrug|active metabolite|activation|metabolite-chain/.test(text)) return "active_moiety";
  if (row.type === "pharmacodynamic" || /serotonin|qtc|anticholinergic|sedation|bleeding|seizure|hemostasis|receptor/.test(text)) return "receptor_burden";
  if (row.source === "graph") return "mechanistic_pathway";
  return "pairwise_interaction";
}

function normalizeFindingSeverity(severity, row = {}) {
  const value = String(severity || row.strength || "").toLowerCase();
  const text = `${row.effect || ""} ${row.risk || ""} ${row.management || ""}`.toLowerCase();
  if (value === "critical" || /contraindicated|life-threatening|fatal|no safe combination/.test(text)) return "critical";
  if (value === "severe" || value === "high") return "severe";
  if (value === "moderate") return "moderate";
  if (value === "mild" || value === "low" || value === "weak") return "monitor";
  return "info";
}

function normalizeFindingConfidence(confidence, evidenceRefs = []) {
  const value = String(confidence || "").toLowerCase();
  if (["high", "moderate", "low", "unknown"].includes(value)) return value;
  return evidenceRefs.length ? "moderate" : "unknown";
}

function highestFindingConfidence(values = []) {
  const order = { high: 3, moderate: 2, low: 1, unknown: 0 };
  return values.reduce((best, value) => (order[value] || 0) > (order[best] || 0) ? value : best, "unknown");
}

function makeFindingTitle(row, type) {
  if (type === "active_moiety") {
    if (/activation|efficacy|active metabolite|prodrug/i.test(row.effect || row.mechanism || "")) {
      return `${row.drug1} may change ${row.drug2} activation`;
    }
    return `${row.drug1} may shift ${row.drug2} active moiety`;
  }
  if (type === "transporter") return `${row.drug1} may alter ${row.drug2} transport`;
  if (type === "receptor_burden") return `${row.drug1} and ${row.drug2} may add burden`;
  if (type === "mechanistic_pathway") return `${row.drug1} and ${row.drug2} have a pathway signal`;
  if (/decrease|reduced|lower|induces/i.test(row.effect || row.mechanism || "")) return `${row.drug1} may lower ${row.drug2} exposure`;
  if (/increase|higher|raises|toxicity|inhibits/i.test(row.effect || row.mechanism || "")) return `${row.drug1} may raise ${row.drug2} exposure`;
  return `${row.drug1} + ${row.drug2} interaction finding`;
}

function buildFindingActors(row, pair, pathway) {
  const actors = [];
  for (const name of pair) actors.push({ id:name, type:"parent_drug", direction:findingDirectionForActor(name, row) });
  if (pathway) actors.push({ id:pathway, type:isFindingGeneLike(pathway) ? "enzyme" : "pathway", direction:findingPathwayDirection(row) });
  for (const name of row.contributorDrugs || []) {
    if (!actors.some(actor => actor.id === name)) actors.push({ id:name, type:"parent_drug", direction:"involved" });
  }
  return actors;
}

function findingDirectionForActor(name, row) {
  if (name === row.drug1 && /inhibit|block|strong|induce/i.test(`${row.mechanism || ""} ${row.effect || ""}`)) return row.type === "induction" ? "induces" : "inhibits";
  if (name === row.drug2) {
    if (/↓|decrease|reduced|lower|loss|blocked/i.test(row.effect || "")) return "down";
    if (/↑|increase|higher|raises|toxicity|accumul/i.test(row.effect || "")) return "up";
  }
  return "involved";
}

function findingPathwayDirection(row) {
  const text = `${row.type || ""} ${row.mechanism || ""} ${row.effect || ""}`.toLowerCase();
  if (/inhibit|block/.test(text)) return "reduced";
  if (/induc/.test(text)) return "increased";
  return "involved";
}

function mergeFindingActors(actors = []) {
  const byKey = new Map();
  for (const actor of actors) {
    if (!actor?.id) continue;
    const key = `${actor.type || "actor"}:${normalizeFindingToken(actor.id)}`;
    if (!byKey.has(key)) byKey.set(key, actor);
  }
  return [...byKey.values()];
}

function summarizeFindingEvidenceStatus(evidenceRefs = [], studies = []) {
  if (!evidenceRefs.length && !studies.length) return "inferred/review required";
  const reviewed = hasProfessionalFindingReview(studies);
  const tier = strongestFindingEvidenceTier(studies);
  return `${tier || "source-linked"}; ${reviewed ? "professionally reviewed" : "pending professional review"}`;
}

function strongestFindingEvidenceTier(studies = []) {
  if (!studies.length) return "";
  const sorted = studies.slice().sort((a, b) => (EVIDENCE_WEIGHT[b.type] || 0) - (EVIDENCE_WEIGHT[a.type] || 0));
  return sorted[0]?.type ? sorted[0].type.replace(/_/g, " ") : "";
}

function hasProfessionalFindingReview(studies = []) {
  return (studies || []).some(study =>
    study.professionalReviewed === true ||
    study.clinicalReviewed === true ||
    ["professional_reviewed", "clinician_reviewed", "reviewed"].includes(study.reviewStatus)
  );
}

function resolveFindingStudies(evidenceRefs = []) {
  return uniqueFindingValues(evidenceRefs).map(ref => STUDY_DB[ref]).filter(Boolean);
}

function findingTypeLabel(type) {
  return String(type || "finding").replace(/_/g, " ");
}

function mentionsActiveMetabolite(row) {
  return /active metabolite|active moiety|prodrug|activation|morphine|endoxifen|thiol|sn-38|5-fu|hydroxy/i.test(`${row?.title || ""} ${row?.summary || ""} ${row?.effect || ""} ${row?.mechanism || ""} ${(row?.tags || []).join(" ")}`);
}

function mentionsToxicity(row) {
  return /toxic|toxicity|rhabdomyolysis|hepatotoxic|myelosuppression|fatal|contraindicated|napqi|cocaethylene/i.test(`${row?.title || ""} ${row?.summary || ""} ${row?.effect || ""} ${row?.risk || ""} ${row?.mechanism || ""} ${(row?.tags || []).join(" ")}`);
}

function isFindingGeneLike(value) {
  return /^(CYP|UGT|DPYD|TPMT|NUDT|BCHE|G6PD|VKORC|SLCO|ABCB|OATP|P-gp|OCT|OAT)/i.test(String(value || ""));
}

function uniqueFindingValues(values = []) {
  return [...new Set((values || []).map(value => String(value || "").trim()).filter(Boolean))];
}

function normalizeFindingToken(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function makeFindingId(parts = []) {
  return uniqueFindingValues(parts).join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
