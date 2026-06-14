// MedCheck Engine — parent/metabolite active-moiety balance

const ACTIVE_MOIETY_DIRECTION_LABELS = {
  up: "up",
  down: "down",
  neutral: "neutral",
  mixed: "mixed",
  unknown: "unknown",
};

const ACTIVE_MOIETY_PATTERN_LABELS = {
  activation_failure: "activation failure",
  active_metabolite_accumulation: "active metabolite accumulation",
  toxic_metabolite_accumulation: "toxic metabolite accumulation",
  parent_accumulation: "parent accumulation",
  mixed_direction: "mixed direction",
  active_moiety_uncertain: "active moiety uncertain",
  no_major_signal: "no major signal",
};

function computeActiveMoietyBalance(stack, genotypeState = {}, context = {}) {
  const activeNames = Array.isArray(stack) && stack.length ? stack : activeStack;
  if (!Array.isArray(activeNames) || !activeNames.length) return [];
  const run = () => {
    const rows = [];
    const seen = new Set();
    for (const parent of activeNames) {
      const parentDrug = typeof getStackDrug === "function" ? getStackDrug(parent) : getDrug(parent);
      if (!parentDrug && !METAB[parent]) continue;
      const parentShift = activeMoietyParentShift(parent);
      for (const candidate of activeMoietyCandidatesForParent(parent)) {
        const row = activeMoietyRowForCandidate(parent, candidate, parentShift, activeNames, context);
        if (!row) continue;
        const key = `${row.parent}|${row.actor}|${row.formationPathway}|${row.clearancePathway}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push(row);
      }
    }
    return summarizeActiveMoietyBalance(rows);
  };
  return withActiveMoietyGenotypeState(genotypeState, run);
}

function classifyActiveMoietyPattern(row) {
  if (!row) return "active_moiety_uncertain";
  const actorType = row.actorType || "";
  const parentUp = row.parentDirection === "up";
  const parentDown = row.parentDirection === "down";
  const metUp = row.metaboliteDirection === "up";
  const metDown = row.metaboliteDirection === "down";
  const metMixed = row.metaboliteDirection === "mixed";
  if (actorType === "toxic_metabolite" && metUp) return "toxic_metabolite_accumulation";
  if ((row.role === "active_form" || row.parentIsProdrug) && metDown) return "activation_failure";
  if (actorType === "active_metabolite" && metUp) return "active_metabolite_accumulation";
  if (metMixed || (parentUp && metDown) || (parentDown && metUp)) return "mixed_direction";
  if (parentUp && !metUp) return "parent_accumulation";
  if (row.parentDirection === "unknown" || row.metaboliteDirection === "unknown") return "active_moiety_uncertain";
  return "no_major_signal";
}

function summarizeActiveMoietyBalance(rows) {
  return (rows || [])
    .map(row => {
      const pattern = row.netPattern || classifyActiveMoietyPattern(row);
      return {
        ...row,
        netPattern: pattern,
        severityHint: row.severityHint || activeMoietySeverityHint({ ...row, netPattern:pattern }),
        confidence: row.confidence || "unknown",
        reviewRequired: row.reviewRequired !== false,
      };
    })
    .sort((a, b) => activeMoietyScore(b) - activeMoietyScore(a) || String(a.parent).localeCompare(String(b.parent)));
}

function activeMoietyRowsToFindings(rows) {
  return (rows || [])
    .filter(row => row && row.netPattern && row.netPattern !== "no_major_signal")
    .map(row => {
      const tags = uniqueActiveMoietyValues([
        "Parent-metabolite",
        ACTIVE_MOIETY_PATTERN_LABELS[row.netPattern] || row.netPattern,
        row.actorType?.replace(/_/g, " "),
        row.formationPathway,
        row.clearancePathway,
      ]);
      const actors = [
        { id:row.parent, type:"parent_drug", direction:row.parentDirection },
        { id:row.actor, type:row.actorType || "metabolite", direction:row.metaboliteDirection },
        row.formationPathway ? { id:row.formationPathway, type:"enzyme", direction:row.formationDirection || "formation" } : null,
        row.clearancePathway ? { id:row.clearancePathway, type:"enzyme", direction:row.clearanceDirection || "clearance" } : null,
      ].filter(Boolean);
      return {
        id: activeMoietyFindingId(["finding", "active-moiety", row.parent, row.actor, row.netPattern]),
        type: "active_moiety",
        title: activeMoietyFindingTitle(row),
        severity: row.severityHint || "monitor",
        confidence: row.confidence || "unknown",
        summary: activeMoietyFindingSummary(row),
        affectedActors: actors,
        tags,
        evidenceRefs: uniqueActiveMoietyValues(row.evidenceRefs || []),
        reviewRequired: row.reviewRequired !== false,
        whyPath: null,
        evidenceLadder: null,
        source: "active_moiety_engine",
        sourceRows: [row],
        groupedFindings: [],
        clinicalAction: row.clinicalAction || "",
        evidenceStatus: (row.evidenceRefs || []).length ? "source-linked; pending professional review" : "inferred/review required",
      };
    });
}

function activeMoietyCandidatesForParent(parent) {
  const out = [];
  const byId = new Map();
  for (const met of (METAB[parent] || [])) {
    const metId = activeMoietyMetaboliteId(met.n);
    const row = { met, metId, actor:activeMoietyActor(metId), effects:[] };
    byId.set(metId, row);
    out.push(row);
  }
  for (const effect of (GENOTYPE_METABOLITE_EFFECTS || []).filter(effect => effect.parent === parent)) {
    const metId = activeMoietyMetaboliteId(effect.metaboliteId || effect.metaboliteName);
    const existing = byId.get(metId);
    if (existing) {
      existing.effects.push(effect);
    } else {
      const row = { met:null, metId, actor:activeMoietyActor(metId), effects:[effect] };
      byId.set(metId, row);
      out.push(row);
    }
  }
  return out;
}

function activeMoietyRowForCandidate(parent, candidate, parentShift, stack, context = {}) {
  const met = candidate.met || {};
  const actor = candidate.actor || {};
  const primaryEffect = activeMoietyBestEffect(parent, candidate, stack);
  const role = activeMoietyRole(met, actor, primaryEffect);
  const actorType = activeMoietyActorType(met, actor, primaryEffect);
  const formationPathway = activeMoietyFormationPathway(met, actor, primaryEffect);
  const clearanceRoute = activeMoietyClearanceRoute(actor, primaryEffect);
  const formationShift = activeMoietyPathwayShift(formationPathway, stack, context);
  const clearanceShift = clearanceRoute ? activeMoietyPathwayShift(clearanceRoute.enzyme, stack, context) : null;
  const inferred = activeMoietyInferMetaboliteDirection(primaryEffect, formationShift, clearanceShift, formationPathway, clearanceRoute);
  const reasons = uniqueActiveMoietyValues([
    parentShift.reason,
    primaryEffect?.label,
    primaryEffect?.effect?.note,
    formationShift?.reason,
    clearanceShift?.reason,
    primaryEffect?.inhibitorReason,
  ]);
  const row = {
    parent,
    actor: primaryEffect?.effect?.metaboliteName || actor.name || met.n || candidate.metId,
    actorId: candidate.metId,
    actorType,
    role,
    formationPathway: formationPathway || "unknown",
    clearancePathway: clearanceRoute?.enzyme || primaryEffect?.effect?.clearanceEnzyme || "",
    parentDirection: parentShift.direction,
    metaboliteDirection: inferred.direction,
    formationDirection: inferred.formationDirection,
    clearanceDirection: inferred.clearanceDirection,
    netPattern: null,
    confidence: primaryEffect?.confidence || inferred.confidence,
    severityHint: null,
    reasons,
    evidenceRefs: uniqueActiveMoietyValues([
      ...(met.evidenceRefs || []),
      ...(actor.evidenceRefs || []),
      ...((candidate.effects || []).flatMap(effect => effect.evidenceRefs || [])),
      ...activeMoietyHighImpactEvidence(parent, candidate.metId),
    ]),
    reviewRequired: true,
    parentFold: parentShift.fold,
    metaboliteFold: primaryEffect?.fold || inferred.fold || null,
    parentIsProdrug: !!(getDrug(parent)?.prodrug || role === "active_form"),
    clinicalAction: primaryEffect?.effect?.clinicalAction || "",
  };
  row.netPattern = classifyActiveMoietyPattern(row);
  row.severityHint = activeMoietySeverityHint(row);
  if (row.netPattern === "no_major_signal" && !activeMoietyShouldKeepContext(row, met, actor, primaryEffect)) return null;
  return row;
}

function activeMoietyBestEffect(parent, candidate, stack) {
  const options = [];
  for (const effect of candidate.effects || []) {
    const phenotype = activeMoietySelectedPhenotype(effect.enzyme);
    const phenotypeEffect = effect.effects?.[phenotype];
    const inhibitors = activeMoietyInhibitionContext(effect.enzyme, parent, stack);
    let selected = phenotypeEffect;
    if ((!selected || selected.direction === "baseline") && inhibitors.length && effect.inhibitionDirection) {
      selected = {
        direction: effect.inhibitionDirection,
        label: effect.inhibitionLabel || `${effect.enzyme} inhibition context: ${effect.metaboliteName || "metabolite"} direction may change`,
        fold: effect.inhibitionFold,
        qualitative: true,
      };
    }
    if (!selected || selected.direction === "baseline") continue;
    options.push({
      effect,
      phenotype,
      direction: activeMoietyDirection(selected.direction),
      label: selected.label,
      fold: selected.fold || null,
      qualitative: !!selected.qualitative || !selected.fold,
      confidence: effect.evidenceRefs?.length ? "high" : "moderate",
      inhibitorReason: inhibitors.length ? `${inhibitors.map(i => i.name).join(", ")} inhibits ${effect.enzyme}` : "",
      selected,
    });
  }
  return options.sort((a, b) => activeMoietyDirectionalWeight(b.direction) - activeMoietyDirectionalWeight(a.direction))[0] || null;
}

function activeMoietyInferMetaboliteDirection(effectResult, formationShift, clearanceShift, formationPathway, clearanceRoute) {
  if (effectResult?.direction && effectResult.direction !== "unknown") {
    return {
      direction: effectResult.direction,
      formationDirection: formationShift?.direction || "",
      clearanceDirection: clearanceShift?.direction || "",
      fold: effectResult.fold || null,
      confidence: effectResult.confidence || "moderate",
    };
  }
  const formationDirection = formationPathway ? activeMoietyFormationDirection(formationShift?.capacityPct) : "unknown";
  const clearanceDirection = clearanceRoute ? activeMoietyClearanceDirection(clearanceShift?.capacityPct) : "unknown";
  const directions = [formationDirection, clearanceDirection].filter(d => d && d !== "neutral" && d !== "unknown");
  if (!directions.length) return { direction:"neutral", formationDirection, clearanceDirection, fold:null, confidence:"low" };
  if (directions.includes("up") && directions.includes("down")) return { direction:"mixed", formationDirection, clearanceDirection, fold:null, confidence:"low" };
  return { direction:directions[0], formationDirection, clearanceDirection, fold:null, confidence:"low" };
}

function activeMoietyParentShift(parent) {
  try {
    const foldResult = typeof calcFold === "function" ? calcFold(parent) : { fold:1, details:[] };
    const fold = foldResult?.fold || 1;
    const direction = fold > 1.15 ? "up" : fold < 0.85 ? "down" : "neutral";
    const driver = foldResult?.details?.[0]
      ? `${foldResult.details[0].enzyme || "pathway"} ${foldResult.details[0].strength || foldResult.details[0].type || "shift"}`
      : "";
    return {
      fold,
      direction,
      reason: direction === "neutral"
        ? `${parent} parent exposure is near baseline`
        : `${parent} parent exposure trends ${direction} (${Math.round(fold * 100) / 100}x${driver ? `; ${driver}` : ""})`,
    };
  } catch (_) {
    return { fold:null, direction:"unknown", reason:`${parent} parent exposure direction is unknown` };
  }
}

function activeMoietyPathwayShift(enzyme, stack, context = {}) {
  if (!enzyme || enzyme === "unknown") return null;
  if (!activeMoietyIsEnzymeLike(enzyme)) {
    return { enzyme, capacityPct:null, direction:"unknown", reason:`${enzyme} is modeled as a formation pathway, not a calibrated enzyme capacity` };
  }
  const phenoconverted = (context.phenoconversionRows || []).find(row => row.enzyme === enzyme);
  if (phenoconverted) {
    const direction = phenoconverted.capacityPct < 75 ? "down" : phenoconverted.capacityPct > 130 ? "up" : "neutral";
    return {
      enzyme,
      capacityPct: phenoconverted.capacityPct,
      direction,
      reason: `${enzyme} functional capacity is ${phenoconverted.capacityPct}% (${(PHENOCONVERSION_LABELS[phenoconverted.functionalPhenotype] || phenoconverted.functionalPhenotype || "functional status")})`,
      capacity: phenoconverted,
    };
  }
  try {
    const cap = typeof computeEnzymeCapacity === "function" ? computeEnzymeCapacity(enzyme, stack) : null;
    if (!cap) return null;
    const direction = cap.capacity_pct < 75 ? "down" : cap.capacity_pct > 130 ? "up" : "neutral";
    const driver = cap.limiting_factor && cap.limiting_factor !== "No significant impairment" ? `; ${cap.limiting_factor}` : "";
    return {
      enzyme,
      capacityPct: cap.capacity_pct,
      direction,
      reason: `${enzyme} functional capacity is ${cap.capacity_pct}%${driver}`,
      capacity: cap,
    };
  } catch (_) {
    return null;
  }
}

function activeMoietyFormationDirection(capacityPct) {
  if (!Number.isFinite(capacityPct)) return "unknown";
  if (capacityPct < 75) return "down";
  if (capacityPct > 130) return "up";
  return "neutral";
}

function activeMoietyClearanceDirection(capacityPct) {
  if (!Number.isFinite(capacityPct)) return "unknown";
  if (capacityPct < 75) return "up";
  if (capacityPct > 130) return "down";
  return "neutral";
}

function activeMoietySeverityHint(row) {
  const text = `${row.netPattern || ""} ${row.actorType || ""} ${(row.reasons || []).join(" ")} ${row.clinicalAction || ""}`.toLowerCase();
  if (/life-threatening|fatal|contraindicat|severe myelosuppression|neutropenia|cytotoxic|hemolysis/.test(text)) return "severe";
  if (row.netPattern === "toxic_metabolite_accumulation") return "severe";
  if (row.netPattern === "activation_failure" && /clopidogrel|thiol|antiplatelet|stent/.test(text)) return "severe";
  if (row.netPattern === "activation_failure" || row.netPattern === "active_metabolite_accumulation") return "moderate";
  if (row.netPattern === "parent_accumulation" || row.netPattern === "mixed_direction") return "monitor";
  return "info";
}

function activeMoietyScore(row) {
  const sev = { severe:4, moderate:3, monitor:2, info:1 }[row.severityHint] || 0;
  const pattern = {
    toxic_metabolite_accumulation:5,
    activation_failure:4,
    active_metabolite_accumulation:3,
    mixed_direction:2,
    parent_accumulation:1,
    active_moiety_uncertain:1,
    no_major_signal:0,
  }[row.netPattern] || 0;
  const evidence = (row.evidenceRefs || []).length ? 1 : 0;
  return sev * 100 + pattern * 20 + evidence * 10 + (row.confidence === "high" ? 8 : row.confidence === "moderate" ? 4 : 0);
}

function activeMoietyShouldKeepContext(row, met, actor, effectResult) {
  return !!(effectResult || row.actorType === "toxic_metabolite" || row.role === "active_form" || actor.active || met.a === "active");
}

function activeMoietyRole(met, actor, effectResult) {
  return met.role || met.a || (actor.toxicity ? "toxic" : actor.active ? "active" : effectResult?.effect?.systemic ? "systemic" : "metabolite");
}

function activeMoietyActorType(met, actor, effectResult) {
  const text = `${met.a || ""} ${met.role || ""} ${actor.note || ""} ${effectResult?.effect?.note || ""}`.toLowerCase();
  if (actor.toxicity || met.a === "toxic" || /hepatotoxic|neurotoxic|cytotoxic|myelosuppression|life-threatening|fatal/.test(text)) return "toxic_metabolite";
  if (met.role === "active_form" || met.a === "active_form" || met.a === "active" || actor.active) return "active_metabolite";
  if (met.a === "inactive" || actor.active === false) return "inactive_clearance_metabolite";
  return "metabolite";
}

function activeMoietyFormationPathway(met, actor, effectResult) {
  return effectResult?.effect?.formationPathway || actor.formingEnzyme || met.e || effectResult?.effect?.enzyme || "";
}

function activeMoietyClearanceRoute(actor, effectResult) {
  if (effectResult?.effect?.enzyme && actor?.formingEnzyme !== effectResult.effect.enzyme) {
    const route = (actor.routes || []).find(r => r.enzyme === effectResult.effect.enzyme);
    if (route) return route;
  }
  return (actor.routes || []).find(route => activeMoietyIsEnzymeLike(route.enzyme)) || null;
}

function activeMoietyDirection(direction) {
  if (direction === "increase" || direction === "up") return "up";
  if (direction === "decrease" || direction === "down") return "down";
  if (direction === "mixed") return "mixed";
  if (direction === "baseline" || direction === "neutral") return "neutral";
  return "unknown";
}

function activeMoietyDirectionalWeight(direction) {
  return { up:3, down:3, mixed:2, unknown:1, neutral:0 }[direction] || 0;
}

function activeMoietySelectedPhenotype(enzyme) {
  if (!enzyme) return GENOTYPE_PHENOTYPE.NM;
  const riskKey = enzyme === "G6PD" ? "G6PD deficiency" : null;
  if (riskKey) return activeGenotype?.[riskKey] === GENOTYPE_RISK_STATUS.PRESENT ? GENOTYPE_PHENOTYPE.PM : GENOTYPE_PHENOTYPE.NM;
  return activeGenotype?.[enzyme] || GENOTYPE_PHENOTYPE.NM;
}

function activeMoietyInhibitionContext(enzyme, subjectParent, stack) {
  if (!enzyme || !Array.isArray(stack)) return [];
  const out = [];
  for (const name of stack) {
    const drug = getDrug(name);
    if (!drug) continue;
    const inhibitors = typeof getAllInhibitions === "function" ? getAllInhibitions(drug) : (drug.inh || []);
    const hit = inhibitors.find(inh => inh.target === enzyme);
    if (!hit) continue;
    out.push({
      name,
      isSelf: name === subjectParent,
      strength: hit.strength || "inhibitor",
      mechanism: hit.mechanism || (hit.timeDependent ? "time-dependent" : ""),
    });
  }
  return out;
}

function withActiveMoietyGenotypeState(genotypeState, callback) {
  const hasOverride = genotypeState && typeof genotypeState === "object" && Object.keys(genotypeState).length;
  if (!hasOverride || typeof activeGenotype === "undefined") return callback();
  const previousActive = activeGenotype;
  const previousUser = typeof userGenetics !== "undefined" ? userGenetics : {};
  try {
    activeGenotype = { ...activeGenotype, ...genotypeState };
    if (typeof userGenetics !== "undefined" && typeof genotypeToLegacyPhenotype === "function") {
      userGenetics = { ...userGenetics };
      for (const [gene, phenotype] of Object.entries(genotypeState)) {
        const legacy = previousUser?.[gene] === "null" && phenotype === GENOTYPE_PHENOTYPE.PM
          ? "null"
          : genotypeToLegacyPhenotype(phenotype);
        if (legacy === "normal") delete userGenetics[gene];
        else userGenetics[gene] = legacy;
      }
    }
    return callback();
  } finally {
    activeGenotype = previousActive;
    if (typeof userGenetics !== "undefined") userGenetics = previousUser;
  }
}

function activeMoietyHighImpactEvidence(parent, metId) {
  const row = (HIGH_IMPACT_METABOLITE_RELATIONS || []).find(rel =>
    rel.parent === parent && activeMoietyMetaboliteId(rel.metaboliteId) === metId
  );
  return row?.requiredEvidenceRefs || [];
}

function activeMoietyActor(metId) {
  const normalized = (METABOLITE_ACTOR_ALIASES || {})[metId] || metId;
  return (METABOLITE_ACTORS || {})[normalized] || null;
}

function activeMoietyMetaboliteId(value) {
  if (!value) return "";
  const raw = typeof getMetaboliteGraphId === "function"
    ? getMetaboliteGraphId(value)
    : String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return (METABOLITE_ACTOR_ALIASES || {})[raw] || raw;
}

function activeMoietyIsEnzymeLike(enzyme) {
  return /^(CYP|UGT|DPYD|TPMT|NUDT|BCHE|G6PD|GST|NAT|SLCO|ABCB|ABCG|CES|XO|SULT|HPRT|FPGS)/i.test(String(enzyme || ""));
}

function activeMoietyFindingTitle(row) {
  if (row.netPattern === "activation_failure") return `${row.parent} activation to ${row.actor} may be reduced`;
  if (row.netPattern === "toxic_metabolite_accumulation") return `${row.actor} from ${row.parent} may accumulate`;
  if (row.netPattern === "active_metabolite_accumulation") return `${row.parent} active metabolite ${row.actor} may rise`;
  if (row.netPattern === "mixed_direction") return `${row.parent} and ${row.actor} move in different directions`;
  if (row.netPattern === "parent_accumulation") return `${row.parent} parent exposure may rise`;
  return `${row.parent} -> ${row.actor} balance needs review`;
}

function activeMoietyFindingSummary(row) {
  const pattern = ACTIVE_MOIETY_PATTERN_LABELS[row.netPattern] || row.netPattern;
  const parent = ACTIVE_MOIETY_DIRECTION_LABELS[row.parentDirection] || row.parentDirection;
  const metabolite = ACTIVE_MOIETY_DIRECTION_LABELS[row.metaboliteDirection] || row.metaboliteDirection;
  const driver = row.reasons?.find(reason => !/near baseline/i.test(reason)) || "";
  return `${pattern}: parent ${parent}, ${row.actorType?.replace(/_/g, " ") || "metabolite"} ${metabolite}.${driver ? ` ${driver}` : ""}`;
}

function uniqueActiveMoietyValues(values = []) {
  return [...new Set((values || []).map(value => String(value || "").trim()).filter(Boolean))];
}

function activeMoietyFindingId(parts = []) {
  return uniqueActiveMoietyValues(parts).join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
