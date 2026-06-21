// Diognosis — risk-marker-aware normalized findings

function computeRiskMarkerFindings(stack, genotypeState = {}, context = {}) {
  const activeNames = Array.isArray(stack) && stack.length ? stack : activeStack;
  if (!Array.isArray(activeNames) || !activeNames.length) return [];
  const genotype = { ...(typeof activeGenotype !== "undefined" ? activeGenotype : {}), ...(genotypeState || {}) };
  const rows = [];

  for (const [marker, risk] of Object.entries(GENOTYPE_RISK_EFFECTS || {})) {
    if (genotype[marker] !== GENOTYPE_RISK_STATUS.PRESENT) continue;
    const matchedEffects = (risk.drugEffects || []).filter(effect =>
      riskMarkerStackHasDrug(activeNames, effect.parent)
    );
    if (!matchedEffects.length) continue;
    rows.push(riskMarkerRowFromDrugEffects(marker, risk, matchedEffects, context));
  }

  rows.push(...computeFunctionalRiskMarkerRows(activeNames, genotype, context));
  return rows.filter(Boolean).sort((a, b) =>
    riskMarkerSeverityScore(b.severityHint) - riskMarkerSeverityScore(a.severityHint) ||
    String(a.marker).localeCompare(String(b.marker))
  );
}

function riskMarkerRowsToFindings(rows) {
  return (rows || []).map(row => {
    const severity = normalizeRiskMarkerSeverity(row.severityHint);
    const affectedActors = [
      { id:row.marker, type:"risk_marker", direction:row.status || "present" },
      ...(row.affectedDrugs || []).map(name => ({
        id:name,
        type:"parent_drug",
        direction:row.drugDirection || "risk context",
      })),
      ...(row.affectedActors || []).map(name => ({
        id:name,
        type:row.actorType || "risk_context",
        direction:"contextual risk",
      })),
    ];
    return {
      id: makeFindingId(["finding", "risk-marker", row.marker, ...(row.affectedDrugs || []), row.phenotype]),
      type: "risk_marker",
      title: row.title || riskMarkerFindingTitle(row),
      severity,
      confidence: row.confidence || "moderate",
      summary: row.summary || row.mechanism || "Risk-marker context requires review for this stack.",
      affectedActors,
      tags: uniqueRiskMarkerValues([
        "Risk marker",
        row.marker,
        row.phenotype,
        ...(row.tags || []),
      ]),
      evidenceRefs: uniqueRiskMarkerValues(row.evidenceRefs || []),
      reviewRequired: row.reviewRequired !== false,
      whyPath: null,
      evidenceLadder: null,
      source: "risk_marker_engine",
      sourceRows: [row],
      groupedFindings: [],
      clinicalAction: row.clinicalAction || "",
      evidenceStatus: (row.evidenceRefs || []).length
        ? "source-linked; professional sign-off not claimed"
        : "risk-marker review prompt",
    };
  });
}

function buildRiskMarkerWarningPath(row, context = {}) {
  if (!row) return null;
  const markerId = riskMarkerId(row.marker);
  const outcomeId = riskMarkerId(["outcome", row.marker, row.phenotype || row.title || "review prompt"].join(" "));
  const nodes = [
    { id:markerId, label:row.marker, type:"risk_marker", role:"reported marker" },
  ];
  const edges = [];
  const relation = riskMarkerPathRelation(row);
  const outcomeLabel = row.outcome || `${row.phenotype || "risk"} review prompt`;

  for (const drug of row.affectedDrugs || []) {
    const drugId = riskMarkerId(drug);
    nodes.push({ id:drugId, label:drug, type:"drug", role:row.drugDirection || "risk context" });
    edges.push({
      from:markerId,
      to:drugId,
      type:"RISK_CONTEXT_FOR",
      label:relation.markerToDrug,
      direction:"risk context",
      confidence:row.confidence || "moderate",
      evidenceRefs:row.evidenceRefs || [],
    });
    edges.push({
      from:drugId,
      to:outcomeId,
      type:"REVIEW_PROMPT",
      label:relation.drugToOutcome,
      direction:"review prompt",
      confidence:row.confidence || "moderate",
      evidenceRefs:row.evidenceRefs || [],
    });
  }

  nodes.push({ id:outcomeId, label:outcomeLabel, type:"outcome", role:"review prompt" });
  return {
    nodes: uniqueWarningPathNodes ? uniqueWarningPathNodes(nodes) : riskMarkerUniqueNodes(nodes),
    edges,
    summary: row.summary || row.mechanism || `${row.marker} is present, so ${row.affectedDrugs?.join(" / ") || "this stack"} needs risk-marker review.`,
    evidenceRefs: uniqueRiskMarkerValues(row.evidenceRefs || []),
    reviewRequired: row.reviewRequired !== false,
  };
}

function riskMarkerRowFromDrugEffects(marker, risk, matchedEffects, context = {}) {
  const affectedDrugs = uniqueRiskMarkerValues(matchedEffects.map(effect => effect.parent));
  const evidenceRefs = uniqueRiskMarkerValues(matchedEffects.flatMap(effect => effect.evidenceRefs || []));
  const phenotypes = uniqueRiskMarkerValues(matchedEffects.map(effect => effect.phenotype));
  const notes = uniqueRiskMarkerValues(matchedEffects.map(effect => effect.note));
  const clinicalActions = uniqueRiskMarkerValues(matchedEffects.map(effect => effect.clinicalAction));
  const affectedActors = riskMarkerAffectedActors(marker, affectedDrugs, context);
  const effectStatus = risk.effects?.[GENOTYPE_RISK_STATUS.PRESENT];
  const severityHint = riskMarkerSeverityHint([...notes, ...clinicalActions, effectStatus?.note].join(" "));
  const mechanism = riskMarkerMechanism(marker, risk, matchedEffects);
  return {
    marker,
    status: "present",
    markerType: "risk_marker",
    affectedDrugs,
    affectedActors,
    actorType: marker === "G6PD deficiency" ? "toxic_metabolite" : "risk_context",
    phenotype: phenotypes.join(" / ") || effectStatus?.label || "risk-marker context",
    mechanism,
    summary: riskMarkerSummary(marker, affectedDrugs, phenotypes, mechanism),
    severityHint,
    confidence: evidenceRefs.length ? "moderate" : "unknown",
    evidenceRefs,
    reviewRequired: true,
    source: "risk_marker_engine",
    clinicalAction: clinicalActions.join(" "),
    drugDirection: riskMarkerDrugDirection(marker),
    outcome: riskMarkerOutcome(marker, phenotypes),
    tags: riskMarkerTags(marker, phenotypes),
  };
}

function computeFunctionalRiskMarkerRows(activeNames, genotype, context = {}) {
  const rows = [];
  const bchePhenotype = genotype?.BCHE || GENOTYPE_PHENOTYPE.NM;
  if ([GENOTYPE_PHENOTYPE.PM, GENOTYPE_PHENOTYPE.IM].includes(bchePhenotype)) {
    const effects = [
      { parent:"Succinylcholine", phenotype:"prolonged paralysis / apnea", clinicalAction:"avoid or prepare ventilatory support", evidenceRefs:["ev_bche_succinylcholine_mivacurium_label"] },
      { parent:"Mivacurium", phenotype:"prolonged neuromuscular blockade", clinicalAction:"avoid or prepare ventilatory support", evidenceRefs:["ev_bche_succinylcholine_mivacurium_label"] },
    ].filter(effect => riskMarkerStackHasDrug(activeNames, effect.parent));
    if (effects.length) {
      rows.push({
        marker: "BCHE low/no function",
        status: bchePhenotype === GENOTYPE_PHENOTYPE.PM ? "poor/no function" : "intermediate function",
        markerType: "functional_risk_marker",
        affectedDrugs: uniqueRiskMarkerValues(effects.map(effect => effect.parent)),
        affectedActors: ["BCHE hydrolysis pathway"],
        actorType: "enzyme",
        phenotype: uniqueRiskMarkerValues(effects.map(effect => effect.phenotype)).join(" / "),
        mechanism: "Reduced butyrylcholinesterase activity can prolong succinylcholine or mivacurium neuromuscular blockade after expected offset.",
        summary: "BCHE low/no function is a procedural risk context for succinylcholine or mivacurium because hydrolysis can be delayed.",
        severityHint: bchePhenotype === GENOTYPE_PHENOTYPE.PM ? "severe" : "moderate",
        confidence: "moderate",
        evidenceRefs: ["ev_bche_succinylcholine_mivacurium_label"],
        reviewRequired: true,
        source: "risk_marker_engine",
        clinicalAction: uniqueRiskMarkerValues(effects.map(effect => effect.clinicalAction)).join(" "),
        drugDirection: "delayed offset",
        outcome: "prolonged paralysis / apnea review prompt",
        tags: ["Risk marker", "BCHE", "Procedural anesthesia", "Neuromuscular blockade"],
      });
    }
  }
  return rows;
}

function riskMarkerAffectedActors(marker, affectedDrugs = [], context = {}) {
  if (marker !== "G6PD deficiency") return [];
  const rows = context.activeMoietyRows || [];
  const direct = rows
    .filter(row => affectedDrugs.includes(row.parent) && row.actorType === "toxic_metabolite")
    .map(row => row.actor);
  const fromRules = (GENOTYPE_METABOLITE_EFFECTS || [])
    .filter(effect => effect.enzyme === "G6PD" && affectedDrugs.includes(effect.parent))
    .map(effect => effect.metaboliteName);
  return uniqueRiskMarkerValues([...direct, ...fromRules]);
}

function riskMarkerStackHasDrug(activeNames, parent) {
  const wanted = riskMarkerDrugKey(parent);
  return (activeNames || []).some(name => {
    const drug = typeof getStackDrug === "function" ? getStackDrug(name) : (typeof getDrug === "function" ? getDrug(name) : null);
    return riskMarkerDrugKey(drug?.name || name) === wanted || riskMarkerDrugKey(drug?.id || "") === wanted;
  });
}

function riskMarkerMechanism(marker, risk, matchedEffects) {
  if (marker === "G6PD deficiency") return "Reduced red-cell oxidative reserve makes oxidant drugs and oxidative metabolites more concerning.";
  if (/RYR1|CACNA1S/i.test(marker)) return "Malignant-hyperthermia susceptibility changes the anesthesia-trigger review context.";
  if (/MT-RNR1/i.test(marker)) return "Mitochondrial rRNA risk variants increase aminoglycoside ototoxicity susceptibility.";
  if (/HLA/i.test(marker)) return "HLA risk alleles can create immune-mediated hypersensitivity or severe cutaneous reaction context for specific drugs.";
  if (/BCHE/i.test(marker)) return "Low butyrylcholinesterase function can delay hydrolysis and procedural drug offset.";
  return `${risk?.label || marker} is present and matches a modeled drug-specific risk context.`;
}

function riskMarkerSummary(marker, affectedDrugs, phenotypes, mechanism) {
  const drugText = affectedDrugs.length > 1 ? affectedDrugs.join(" / ") : affectedDrugs[0] || "this stack";
  const phenotypeText = phenotypes.length ? ` ${phenotypes.join(" / ")}.` : ".";
  return `${marker} is present for ${drugText}, creating a risk-marker review prompt for${phenotypeText} ${mechanism}`;
}

function riskMarkerFindingTitle(row) {
  if (row.marker === "G6PD deficiency") return "G6PD deficiency increases oxidant-drug risk";
  if (/RYR1|CACNA1S/i.test(row.marker)) return "Malignant-hyperthermia risk marker matches an anesthesia trigger";
  if (/BCHE/i.test(row.marker)) return "BCHE low/no function may prolong procedural paralysis";
  if (/MT-RNR1/i.test(row.marker)) return "MT-RNR1 risk marker matches an aminoglycoside";
  return `${row.marker} matches a drug-specific risk marker`;
}

function riskMarkerOutcome(marker, phenotypes = []) {
  if (marker === "G6PD deficiency") return "hemolysis / methemoglobinemia review prompt";
  if (/RYR1|CACNA1S/i.test(marker)) return "malignant hyperthermia review prompt";
  if (/BCHE/i.test(marker)) return "prolonged paralysis / apnea review prompt";
  if (/MT-RNR1/i.test(marker)) return "ototoxicity review prompt";
  return `${phenotypes.join(" / ") || "risk-marker"} review prompt`;
}

function riskMarkerTags(marker, phenotypes = []) {
  const text = `${marker} ${phenotypes.join(" ")}`.toLowerCase();
  return uniqueRiskMarkerValues([
    "Risk marker",
    /g6pd/.test(text) ? "G6PD" : "",
    /oxid|hemolys|methemoglobin/.test(text) ? "Oxidant stress" : "",
    /hla/.test(text) ? "HLA" : "",
    /sjs|ten|hypersensitivity|scar|dress/.test(text) ? "Immune hypersensitivity" : "",
    /ryr1|cacna1s|malignant/.test(text) ? "Malignant hyperthermia" : "",
    /bche|paralysis|apnea/.test(text) ? "BCHE" : "",
    /mt-rnr1|aminoglycoside|ototoxic/.test(text) ? "Ototoxicity" : "",
  ]);
}

function riskMarkerPathRelation(row) {
  const marker = String(row.marker || "");
  if (marker === "G6PD deficiency") return {
    markerToDrug: "reduces red-cell oxidative reserve for",
    drugToOutcome: "adds oxidant-stress review context",
  };
  if (/RYR1|CACNA1S/i.test(marker)) return {
    markerToDrug: "creates susceptibility context for",
    drugToOutcome: "can act as a trigger exposure",
  };
  if (/BCHE/i.test(marker)) return {
    markerToDrug: "reduces expected hydrolysis of",
    drugToOutcome: "may prolong procedural effect",
  };
  if (/MT-RNR1/i.test(marker)) return {
    markerToDrug: "creates ototoxicity susceptibility for",
    drugToOutcome: "adds hearing-loss review context",
  };
  return {
    markerToDrug: "creates risk-marker context for",
    drugToOutcome: "requires review for",
  };
}

function riskMarkerDrugDirection(marker) {
  if (marker === "G6PD deficiency") return "oxidant stress";
  if (/RYR1|CACNA1S/i.test(marker)) return "trigger exposure";
  if (/BCHE/i.test(marker)) return "delayed offset";
  if (/MT-RNR1/i.test(marker)) return "ototoxicity context";
  return "risk context";
}

function riskMarkerSeverityHint(text) {
  const value = String(text || "").toLowerCase();
  if (/contraindicat|life[-\s]?threat|fatal|malignant hyperthermia|sjs|ten|dress|hemolys|methemoglobin|apnea|paralysis/.test(value)) return "severe";
  if (/avoid|hypersensitivity|ototoxic|risk/.test(value)) return "moderate";
  return "monitor";
}

function normalizeRiskMarkerSeverity(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "critical") return "critical";
  if (normalized === "high" || normalized === "severe") return "severe";
  if (normalized === "moderate") return "moderate";
  if (normalized === "monitor" || normalized === "low") return "monitor";
  return "info";
}

function riskMarkerSeverityScore(value) {
  return FINDING_SEVERITY_ORDER?.[normalizeRiskMarkerSeverity(value)] || 0;
}

function riskMarkerDrugKey(value) {
  if (typeof normalizeDrugLookupKey === "function") return normalizeDrugLookupKey(value);
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function riskMarkerId(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function riskMarkerUniqueNodes(nodes = []) {
  const seen = new Set();
  const out = [];
  for (const node of nodes || []) {
    if (!node?.id || seen.has(node.id)) continue;
    seen.add(node.id);
    out.push(node);
  }
  return out;
}

function uniqueRiskMarkerValues(values = []) {
  return [...new Set((values || []).map(value => String(value || "").trim()).filter(Boolean))];
}
