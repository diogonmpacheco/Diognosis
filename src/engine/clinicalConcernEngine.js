// Diognosis — Overview clinical concern presentation layer

const CLINICAL_CONCERN_CONFIDENCE_ORDER = { high: 3, moderate: 2, low: 1, unknown: 0 };

function getOverviewFindings(stack, genotypeState = {}, options = {}) {
  const activeNames = Array.isArray(stack) && stack.length ? stack : activeStack;
  const rawFindings = Array.isArray(options.findings)
    ? options.findings
    : (typeof buildInteractionFindings === "function"
      ? buildInteractionFindings(activeNames, genotypeState, options)
      : []);
  return buildClinicalConcerns(rawFindings, { ...options, stack:activeNames, genotypeState });
}

function buildClinicalConcerns(findings, context = {}) {
  const rawFindings = (findings || []).filter(Boolean);
  const fullContext = { ...context, findings:rawFindings };
  const classified = rawFindings.map(finding => classifyFindingForClinicalConcern(finding, fullContext));
  const groups = groupFindingsByClinicalConcern(classified, context);
  const concerns = [];
  for (const group of groups.values()) {
    const concern = mergeClinicalConcernGroup(group, context);
    if (concern) concerns.push(concern);
  }
  const ranked = concerns.sort((a, b) =>
    clinicalConcernRankScore(b) - clinicalConcernRankScore(a) ||
    String(a.title || "").localeCompare(String(b.title || ""))
  );
  return typeof attachEvidenceLaddersToFindings === "function"
    ? attachEvidenceLaddersToFindings(ranked)
    : ranked;
}

function classifyFindingForClinicalConcern(finding, context = {}) {
  const domain = inferClinicalConcernDomain(finding, context);
  const victims = inferVictimActors(finding, { ...context, domain });
  const perpetrators = inferPerpetratorActors(finding, { ...context, domain, victims });
  const pathwayActors = inferPathwayActors(finding, context);
  const phenotypeActors = inferPhenotypeActors(finding, { ...context, domain });
  const key = clinicalConcernKey({
    finding,
    domain,
    victims,
    perpetrators,
    pathwayActors,
    phenotypeActors,
    context,
  });
  const roleContext = { ...context, domain, victims, perpetrators, pathwayActors, phenotypeActors, clinicalConcernKey:key };
  return {
    finding,
    presentationLevel: classifyFindingPresentationRole(finding, roleContext),
    clinicalConcernKey: key,
    clinicalConcernDomain: domain,
    victimActors: victims,
    perpetratorActors: perpetrators,
    pathwayActors,
    phenotypeActors,
  };
}

function classifyFindingPresentationRole(finding, context = {}) {
  if (isHiddenFinding(finding, context)) return "hidden";
  if (isPrimaryConcernCandidate(finding, context)) return "primary";
  if (isSupportingSignalCandidate(finding, context)) return "supporting";
  if (isDetailOnlyFinding(finding, context)) return "detail_only";
  return ["severe", "critical"].includes(finding?.severity) ? "primary" : "detail_only";
}

function isPrimaryConcernCandidate(finding, context = {}) {
  const severity = clinicalSeverityValue(finding?.severity);
  const rows = finding?.sourceRows || [];
  const sourceRow = rows[0] || {};
  const text = clinicalConcernText(finding).toLowerCase();
  if (finding?.type === "risk_marker") return true;
  if (finding?.type === "pairwise_interaction") {
    return severity >= clinicalSeverityValue("moderate") || (finding.evidenceRefs || []).length > 0 || !!finding.clinicalAction;
  }
  if (finding?.type === "transporter") return severity >= clinicalSeverityValue("moderate");
  if (finding?.type === "receptor_burden" || finding?.type === "combination_burden") {
    return severity >= clinicalSeverityValue("moderate") || /qtc|bleed|serotonin|sedation|fall|anticholinergic|hyperkalemia/.test(text);
  }
  if (finding?.type === "active_moiety") {
    if (sourceRow.actorType === "inactive_metabolite" || /inactive|unchanged|clearance metabolite/i.test(`${sourceRow.actor || ""} ${sourceRow.role || ""} ${sourceRow.summary || ""}`)) return false;
    if (sourceRow.netPattern === "risk_marker_toxic_context") return false;
    return [
      "activation_failure",
      "toxic_metabolite_accumulation",
      "active_metabolite_accumulation",
    ].includes(sourceRow.netPattern);
  }
  if (finding?.type === "timing_washout") {
    return ["washout_rule", "induction_offset", "enzyme_recovery"].includes(sourceRow.persistenceType) &&
      (severity >= clinicalSeverityValue("monitor") || /washout|switch|overlap|induction|recovery/i.test(text));
  }
  if (finding?.type === "mechanistic_pathway") {
    return severity >= clinicalSeverityValue("severe") && (finding.evidenceRefs || []).length > 0;
  }
  return false;
}

function isSupportingSignalCandidate(finding, context = {}) {
  const row = finding?.sourceRows?.[0] || {};
  if (finding?.type === "phenoconversion") {
    return hasCurrentStackConsequence(row, context);
  }
  if (finding?.type === "active_moiety") {
    return [
      "parent_accumulation",
      "mixed_direction",
      "active_moiety_uncertain",
      "risk_marker_toxic_context",
    ].includes(row.netPattern);
  }
  if (finding?.type === "timing_washout") return true;
  if (finding?.type === "mechanistic_pathway") return true;
  if (finding?.type === "transporter") return clinicalSeverityValue(finding.severity) < clinicalSeverityValue("moderate");
  return false;
}

function isDetailOnlyFinding(finding, context = {}) {
  const row = finding?.sourceRows?.[0] || {};
  const text = clinicalConcernText(finding).toLowerCase();
  if (finding?.type === "phenoconversion") return true;
  if (finding?.type === "active_moiety") {
    return row.netPattern === "no_major_signal" ||
      row.actorType === "inactive_metabolite" ||
      row.metaboliteDirection === "neutral" ||
      row.parentDirection === "neutral" && row.metaboliteDirection === "unknown" ||
      /inactive clearance|pseudo|unchanged/.test(text);
  }
  if (finding?.type === "timing_washout") return clinicalSeverityValue(finding.severity) <= clinicalSeverityValue("info");
  return false;
}

function isHiddenFinding(finding, context = {}) {
  const row = finding?.sourceRows?.[0] || {};
  const text = clinicalConcernText(finding).toLowerCase();
  if (row.netPattern === "no_major_signal") return true;
  if (/no major signal|neutral-only|normal function with no current consequence/.test(text)) return true;
  if (finding?.type === "phenoconversion" && !hasCurrentStackConsequence(row, context)) return true;
  if (finding?.type === "active_moiety" && row.actorType === "inactive_metabolite" && row.metaboliteDirection === "neutral") return true;
  return false;
}

function groupFindingsByClinicalConcern(classifiedFindings, context = {}) {
  const groups = new Map();
  for (const entry of classifiedFindings || []) {
    const key = entry.clinicalConcernKey || `finding:${entry.finding?.id || groups.size}`;
    const group = groups.get(key) || [];
    group.push(entry);
    groups.set(key, group);
  }
  return groups;
}

function mergeClinicalConcernGroup(group, context = {}) {
  const entries = (group || []).filter(entry => entry?.finding);
  const visible = entries.filter(entry => entry.presentationLevel !== "hidden");
  if (!visible.length) return null;
  const primaryEntry = choosePrimaryFindingForConcern(visible, context);
  if (!primaryEntry) return null;
  const primary = primaryEntry.finding;
  const allFindings = entries.map(entry => entry.finding);
  const visibleFindings = visible.map(entry => entry.finding);
  const domain = primaryEntry.clinicalConcernDomain;
  const victims = mergeClinicalActors(visible.flatMap(entry => entry.victimActors || []));
  const victimKeys = new Set(victims.map(actor => normalizeFindingToken(actor.id)));
  const perpetrators = mergeClinicalActors(visible.flatMap(entry => entry.perpetratorActors || []))
    .filter(actor => !victimKeys.has(normalizeFindingToken(actor.id)));
  const pathwayActors = mergeClinicalActors(visible.flatMap(entry => entry.pathwayActors || []));
  const phenotypeActors = mergeClinicalActors(visible.flatMap(entry => entry.phenotypeActors || []));
  const supportingSignals = buildSupportingSignals(visible, primaryEntry, context);
  const evidenceRefs = uniqueClinicalValues(visibleFindings.flatMap(finding => finding.evidenceRefs || []));
  const sourceRows = visibleFindings.flatMap(finding => finding.sourceRows || []);
  const severity = clinicalWorstSeverity(visibleFindings.map(finding => finding.severity));
  const confidence = clinicalBestConfidence(visibleFindings.map(finding => finding.confidence));
  const detailOnlyCount = entries.filter(entry => entry.presentationLevel === "detail_only").length;
  const hiddenCount = entries.filter(entry => entry.presentationLevel === "hidden").length;
  const affectedActors = mergeClinicalActors([
    ...victims,
    ...perpetrators,
    ...pathwayActors,
    ...phenotypeActors,
  ]);
  const concern = {
    id: makeFindingId(["concern", primaryEntry.clinicalConcernKey]),
    type: "clinical_concern",
    presentationLevel: "primary",
    clinicalConcernKey: primaryEntry.clinicalConcernKey,
    clinicalConcernDomain: domain,
    sourceFindingsFull: visibleFindings,
    title: makeClinicalConcernTitle({
      domain,
      primaryFinding: primary,
      sourceFindingsFull: visibleFindings,
      victimActors: victims,
      perpetratorActors: perpetrators,
      pathwayActors,
      phenotypeActors,
      supportingSignals,
    }, context),
    severity,
    confidence,
    summary: makeClinicalConcernSummary({
      domain,
      primaryFinding: primary,
      victimActors: victims,
      perpetratorActors: perpetrators,
      supportingSignals,
    }, context),
    affectedActors,
    victimActors: victims,
    perpetratorActors: perpetrators,
    pathwayActors,
    phenotypeActors,
    tags: uniqueClinicalValues([
      "Consolidated concern",
      clinicalDomainLabel(domain),
      ...(primary.tags || []),
    ]),
    evidenceRefs,
    reviewRequired: visibleFindings.some(finding => finding.reviewRequired !== false),
    whyPath: primary.whyPath || null,
    evidenceLadder: null,
    source: "clinical_concern_grouping",
    sourceRows,
    sourceFindings: allFindings.map(finding => ({
      id: finding.id,
      type: finding.type,
      title: finding.title,
      severity: finding.severity,
      source: finding.source,
    })),
    groupedFindings: visible
      .filter(entry => entry.finding.id !== primary.id)
      .map(entry => ({
        id: entry.finding.id,
        type: entry.finding.type,
        title: entry.finding.title,
        severity: entry.finding.severity,
        source: entry.finding.source,
        presentationLevel: entry.presentationLevel,
      })),
    supportingSignals,
    detailOnlyCount,
    hiddenCount,
    rawFindingCount: allFindings.length,
    clinicalAction: primary.clinicalAction || "",
    evidenceStatus: summarizeFindingEvidenceStatus(evidenceRefs, resolveFindingStudies(evidenceRefs)),
    primaryFindingId: primary.id,
  };
  return concern;
}

function choosePrimaryFindingForConcern(group, context = {}) {
  const primary = group.filter(entry => entry.presentationLevel === "primary");
  if (primary.length) return primary.sort((a, b) => clinicalConcernEntryScore(b) - clinicalConcernEntryScore(a))[0];
  const supporting = group.filter(entry => entry.presentationLevel === "supporting");
  if (!supporting.length || !shouldPromoteSupportingGroup(supporting, context)) return null;
  return supporting.sort((a, b) => clinicalConcernEntryScore(b) - clinicalConcernEntryScore(a))[0];
}

function shouldPromoteSupportingGroup(group, context = {}) {
  const domains = new Set(group.map(entry => entry.clinicalConcernDomain));
  if (domains.has("enzyme_capacity_context") || domains.has("model_only_mechanistic_context")) return false;
  if (!group.some(entry => (entry.victimActors || []).length)) return false;
  if (group.every(entry => entry.finding?.type === "phenoconversion") &&
    !group.some(entry => (entry.perpetratorActors || []).length) &&
    [...domains].some(domain => domain === "exposure_increase_toxicity" || domain === "exposure_decrease_failure" || domain === "induction_loss_of_efficacy")) {
    return false;
  }
  return group.some(entry => clinicalSeverityValue(entry.finding?.severity) >= clinicalSeverityValue("moderate"));
}

function buildSupportingSignals(group, primaryEntry, context = {}) {
  const seen = new Set();
  const out = [];
  for (const signal of group
    .filter(entry => entry.finding.id !== primaryEntry.finding.id && entry.presentationLevel !== "hidden")
    .sort((a, b) => clinicalConcernEntryScore(b) - clinicalConcernEntryScore(a))
    .map(entry => clinicalSupportingSignalForFinding(entry.finding, entry))
    .filter(Boolean)) {
    const key = `${signal.type}:${normalizeFindingToken(signal.label)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(signal);
  }
  return out;
}

function inferVictimActors(findingOrRow, context = {}) {
  const finding = normalizeClinicalFindingInput(findingOrRow);
  const row = finding.sourceRows?.[0] || findingOrRow || {};
  const domain = context.domain || inferClinicalConcernDomain(finding, context);
  const interactionRow = clinicalInteractionLikeRow(finding);
  if (domain === "risk_marker_context" || domain === "hypersensitivity_or_scar") {
    const marker = row.marker || row.riskMarkerContext?.marker || clinicalFirstActor(finding, "risk_marker")?.id;
    return marker ? [{ id:marker, type:"risk_marker", direction:"present" }] : [];
  }
  if (finding.type === "pairwise_interaction" || finding.type === "combination_burden" || interactionRow || row.drug1 || row.drug2) {
    const roleRow = interactionRow || row;
    const roles = typeof inferKnownInteractionVictimPerpetrator === "function"
      ? inferKnownInteractionVictimPerpetrator(roleRow)
      : { victims:[roleRow.drug2].filter(Boolean), perpetrators:[roleRow.drug1].filter(Boolean) };
    return roles.victims.map(id => ({ id, type:"parent_drug", direction:clinicalVictimDirection(domain, finding, row) }));
  }
  if (finding.type === "active_moiety" && row.parent) {
    return [{ id:row.parent, type:"parent_drug", direction:row.parentDirection || "affected" }];
  }
  if (finding.type === "phenoconversion") {
    const perps = new Set((row.drivers || []).map(driver => normalizeFindingToken(driver.actor)));
    const parents = (row.affectedParents || []).filter(name => !perps.has(normalizeFindingToken(name)));
    const explicitParents = uniqueClinicalValues(parents).map(id => ({ id, type:"parent_drug", direction:row.direction || "affected" }));
    if (explicitParents.length) return explicitParents;
    const fallback = clinicalVictimsFromSiblingFindings(finding, context);
    if (fallback.length) return fallback;
    return [];
  }
  if (finding.type === "timing_washout") {
    return [{ id:row.actor || row.parent || finding.title, type:row.actorType || "actor", direction:row.persistenceType || "persists" }];
  }
  const actors = (finding.affectedActors || []).filter(actor =>
    actor.type === "parent_drug" && /up|down|affected|persists|stopped|risk|involved/.test(String(actor.direction || ""))
  );
  return actors.map(actor => ({ ...actor }));
}

function inferPerpetratorActors(findingOrRow, context = {}) {
  const finding = normalizeClinicalFindingInput(findingOrRow);
  const row = finding.sourceRows?.[0] || findingOrRow || {};
  const domain = context.domain || inferClinicalConcernDomain(finding, context);
  const interactionRow = clinicalInteractionLikeRow(finding);
  if (domain === "risk_marker_context" || domain === "hypersensitivity_or_scar") {
    const drugs = row.affectedDrugs || [row.parent].filter(Boolean);
    return uniqueClinicalValues(drugs).map(id => ({ id, type:"parent_drug", direction:row.drugDirection || "risk context" }));
  }
  if (finding.type === "pairwise_interaction" || finding.type === "combination_burden" || interactionRow || row.drug1 || row.drug2) {
    const roleRow = interactionRow || row;
    const roles = typeof inferKnownInteractionVictimPerpetrator === "function"
      ? inferKnownInteractionVictimPerpetrator(roleRow)
      : { victims:[roleRow.drug2].filter(Boolean), perpetrators:[roleRow.drug1].filter(Boolean) };
    return roles.perpetrators.map(id => ({ id, type:"parent_drug", direction:clinicalPerpetratorDirection(domain, finding, row) }));
  }
  if (finding.type === "phenoconversion") {
    return (row.drivers || [])
      .filter(driver => ["inhibitor", "inducer"].includes(driver.type) && clinicalStackIncludes(driver.actor, context.stack))
      .map(driver => ({ id:driver.actor, type:"parent_drug", direction:driver.type === "inducer" ? "induces" : "inhibits" }));
  }
  if (finding.type === "active_moiety") {
    const pathways = uniqueClinicalValues([row.formationPathway, row.clearancePathway].filter(path => path && path !== "unknown"));
    return clinicalPerpetratorsForPathways(pathways, context.stack || activeStack, (context.victims || []).map(actor => actor.id), domain);
  }
  return [];
}

function inferExposureDirectionForActor(actor, findingOrRow, context = {}) {
  const finding = normalizeClinicalFindingInput(findingOrRow);
  const row = finding.sourceRows?.[0] || {};
  const actorName = typeof actor === "string" ? actor : actor?.id;
  const actorEntry = (finding.affectedActors || []).find(item => item.id === actorName);
  if (actorEntry?.direction) return actorEntry.direction;
  if (row.parent === actorName && row.parentDirection) return row.parentDirection;
  if (row.actor === actorName && row.metaboliteDirection) return row.metaboliteDirection;
  const text = clinicalConcernText(finding);
  if (/↑|increase|higher|raises|toxicity|accumul/i.test(text)) return "up";
  if (/↓|decrease|reduced|lower|loss|failure/i.test(text)) return "down";
  return "affected";
}

function makeClinicalConcernTitle(concern, context = {}) {
  const domain = concern.clinicalConcernDomain || concern.domain;
  const victims = concern.victimActors || [];
  const perpetrators = concern.perpetratorActors || [];
  const primary = concern.primaryFinding || {};
  const victim = clinicalActorLabel(victims[0]) || clinicalPrimaryVictimFromFinding(primary);
  const perp = clinicalActorListLabel(perpetrators);
  const row = primary.sourceRows?.[0] || {};
  if (domain === "activation_failure") {
    const metabolite = clinicalActiveMetaboliteFromFindings(concern.sourceFindingsFull || []) || clinicalActiveMetaboliteName(primary, row);
    return metabolite
      ? `${victim || "Prodrug"} activation to ${metabolite} may be reduced${perp ? ` with ${perp}` : ""}`
      : `${victim || "Prodrug"} activation may be reduced${perp ? ` with ${perp}` : ""}`;
  }
  if (domain === "toxic_metabolite_accumulation") {
    const metabolite = clinicalActiveMetaboliteName(primary, row);
    return metabolite && victim ? `${metabolite} may accumulate from ${victim}` : `${victim || "Toxic metabolite"} accumulation concern`;
  }
  if (domain === "active_metabolite_accumulation") {
    const metabolite = clinicalActiveMetaboliteName(primary, row);
    return metabolite && victim ? `${victim} active metabolite ${metabolite} may rise` : `${victim || "Active metabolite"} exposure may rise`;
  }
  if (domain === "risk_marker_context" || domain === "hypersensitivity_or_scar") {
    const marker = clinicalActorLabel(victims[0]) || row.marker || "Risk marker";
    const phenotype = clinicalRiskPhenotypeLabel(row, primary);
    return `${marker} increases ${phenotype} review priority`;
  }
  if (domain === "exposure_decrease_failure" || domain === "induction_loss_of_efficacy") {
    return victim && perp ? `${victim} exposure may fall with ${perp}` : `${victim || "Exposure"} may fall`;
  }
  if (domain === "washout_or_persistence") {
    return "Switching and washout timing may need review";
  }
  if (clinicalBurdenDomain(domain)) {
    return `${clinicalDomainLabel(domain)} may rise`;
  }
  if (domain === "renal_clearance_or_transporter") {
    return victim && perp ? `${victim} transport or clearance may change with ${perp}` : `${victim || "Transporter"} clearance concern`;
  }
  if (domain === "absorption_or_chelation") {
    return victim && perp ? `${victim} absorption may change with ${perp}` : `${victim || "Absorption"} concern`;
  }
  if (domain === "parent_accumulation") {
    return `${victim || row.parent || "Parent drug"} exposure may rise${perp ? ` with ${perp}` : ""}`;
  }
  if (domain === "mixed_parent_metabolite_direction") {
    return `${victim || row.parent || "Parent drug"} parent-metabolite balance may shift${perp ? ` with ${perp}` : ""}`;
  }
  if (domain === "exposure_increase_toxicity") {
    return victim && perp ? `${victim} exposure may rise with ${perp}` : `${victim || "Exposure"} may rise`;
  }
  const stackLabel = clinicalActorListLabel([...(victims || []), ...(perpetrators || [])]);
  return stackLabel ? `${stackLabel}: interaction concern` : "Clinical concern";
}

function groupFindingsForReview(context = {}) {
  const findings = Array.isArray(context.findings)
    ? context.findings
    : (typeof getRenderComputationCache === "function" ? getRenderComputationCache().findings || [] : []);
  return buildClinicalConcerns(findings, {
    stack: context.stack || activeStack,
    genotypeState: context.genotypeState || activeGenotype || {},
  });
}

function inferClinicalConcernDomain(finding, context = {}) {
  const row = finding?.sourceRows?.[0] || {};
  const text = clinicalConcernText(finding).toLowerCase();
  if (finding?.type === "risk_marker") {
    if (/hla|scar|sjs|ten|hypersens/.test(text)) return "hypersensitivity_or_scar";
    return "risk_marker_context";
  }
  if (finding?.type === "active_moiety") {
    if (row.parentDirection === "up" && clinicalHasSiblingExposureConcern(row.parent, context)) return "exposure_increase_toxicity";
    if (row.netPattern === "risk_marker_toxic_context") return "risk_marker_context";
    if (row.netPattern === "activation_failure") return "activation_failure";
    if (row.netPattern === "toxic_metabolite_accumulation") return "toxic_metabolite_accumulation";
    if (row.netPattern === "active_metabolite_accumulation") return "active_metabolite_accumulation";
    if (row.netPattern === "parent_accumulation" || row.parentDirection === "up") return "exposure_increase_toxicity";
    if (row.parentDirection === "down") return "exposure_decrease_failure";
    if (row.netPattern === "mixed_direction") return "mixed_parent_metabolite_direction";
    return "model_only_mechanistic_context";
  }
  if (finding?.type === "phenoconversion") {
    const consequence = `${(row.activeMoietyConsequences || []).join(" ")} ${row.clinicalNote || ""}`.toLowerCase();
    if (/activation.*fall|activation.*reduced|active metabolite.*fall|prodrug/.test(consequence)) return "activation_failure";
    if (row.direction === "increased" && (row.drivers || []).some(driver => driver.type === "inducer")) return "induction_loss_of_efficacy";
    if (row.direction === "reduced") return "exposure_increase_toxicity";
    if (row.direction === "increased") return "exposure_decrease_failure";
    return "enzyme_capacity_context";
  }
  if (finding?.type === "timing_washout") return "washout_or_persistence";
  if (/increase|higher|raises|toxicity|inhibit|accumul|↑|rhabdomyolysis/.test(text) && !/↓|loss of efficacy|efficacy loss/.test(text)) return "exposure_increase_toxicity";
  if (/prodrug|activation|active metabolite|efficacy loss|loss of efficacy/.test(text)) return "activation_failure";
  if (/induc|lower|reduced|decrease|↓↓|↓/.test(text)) return "induction_loss_of_efficacy";
  if (finding?.type === "transporter" || /p-gp|oatp|transporter|renal clearance/.test(text)) return "renal_clearance_or_transporter";
  if (/absorption|chelat|gastric|binder|\bph\b|food/.test(text)) return "absorption_or_chelation";
  if (/qtc|qt prolong/.test(text)) return "qt_burden";
  if (/bleed|inr|hemostasis|anticoag|antiplatelet/.test(text)) return "bleeding_burden";
  if (/serotonin|linezolid|maoi/.test(text)) return "serotonin_toxicity";
  if (/sedation|cns depression|respiratory depression|opioid|benzodiazepine/.test(text)) return "cns_depression_burden";
  if (/anticholinergic|beers|fall|delirium/.test(text)) return "anticholinergic_fall_burden";
  if (/hyperkalemia|nephrotoxicity|renal reserve/.test(text)) return "pharmacodynamic_burden";
  if (finding?.type === "mechanistic_pathway") return "model_only_mechanistic_context";
  return "model_only_mechanistic_context";
}

function clinicalConcernKey({ finding, domain, victims = [], perpetrators = [], pathwayActors = [], phenotypeActors = [], context = {} }) {
  const row = finding?.sourceRows?.[0] || {};
  if (domain === "risk_marker_context" || domain === "hypersensitivity_or_scar") {
    const marker = clinicalActorLabel(victims[0]) || row.marker || row.riskMarkerContext?.marker || "risk-marker";
    return `domain:${domain}|marker:${normalizeFindingToken(marker)}`;
  }
  if (clinicalBurdenDomain(domain)) {
    const phenotype = clinicalActorListLabel(phenotypeActors) || clinicalDomainLabel(domain);
    return `domain:${domain}|phenotype:${normalizeFindingToken(phenotype)}`;
  }
  if (domain === "washout_or_persistence") {
    const stackKey = uniqueClinicalValues(context.stack || activeStack || [])
      .map(normalizeFindingToken)
      .sort()
      .join(",");
    return `domain:${domain}|stack:${stackKey || normalizeFindingToken(row.parent || row.actor || finding.title)}`;
  }
  const victimKey = uniqueClinicalValues(victims.map(actor => actor.id)).map(normalizeFindingToken).sort().join(",");
  const perpKey = uniqueClinicalValues(perpetrators.map(actor => actor.id)).map(normalizeFindingToken).sort().join(",");
  const groupByVictimOnly = [
    "exposure_increase_toxicity",
    "exposure_decrease_failure",
    "induction_loss_of_efficacy",
    "activation_failure",
    "parent_accumulation",
    "mixed_parent_metabolite_direction",
  ].includes(domain);
  const fallbackPath = !perpKey && (domain === "activation_failure" || domain === "toxic_metabolite_accumulation")
    ? uniqueClinicalValues(pathwayActors.map(actor => actor.id)).map(normalizeFindingToken).sort().slice(0, 1).join(",")
    : "";
  return `domain:${domain}|victim:${victimKey || normalizeFindingToken(clinicalPrimaryVictimFromFinding(finding))}|perp:${groupByVictimOnly ? "" : perpKey}|path:${fallbackPath}`;
}

function hasCurrentStackConsequence(phenoconversionRow, context = {}) {
  if (!phenoconversionRow) return false;
  const stackKeys = new Set((context.stack || activeStack || []).map(normalizeFindingToken));
  const parents = phenoconversionRow.affectedParents || [];
  const metabolites = phenoconversionRow.affectedMetabolites || [];
  if (parents.some(name => stackKeys.has(normalizeFindingToken(name)))) return true;
  if (metabolites.length && parents.length) return true;
  if ((phenoconversionRow.activeMoietyConsequences || []).length) return true;
  return phenoconversionRow.direction === "reduced" || phenoconversionRow.direction === "increased";
}

function clinicalVictimsFromSiblingFindings(finding, context = {}) {
  const row = finding?.sourceRows?.[0] || {};
  const pathwayKeys = new Set([row.enzyme, row.pathway].map(normalizeFindingToken).filter(Boolean));
  const driverKeys = new Set((row.drivers || [])
    .filter(driver => ["inhibitor", "inducer"].includes(driver.type))
    .map(driver => normalizeFindingToken(driver.actor)));
  if (!pathwayKeys.size) return [];
  const out = [];
  for (const sibling of context.findings || []) {
    if (!sibling || sibling.id === finding.id || sibling.type === "phenoconversion") continue;
    const siblingRow = sibling.sourceRows?.[0] || {};
    const siblingText = clinicalConcernText(sibling).toLowerCase();
    const pathwayMatch = [...pathwayKeys].some(pathway => pathway && siblingText.includes(pathway.replace(/_/g, ""))) ||
      [...pathwayKeys].some(pathway => pathway && normalizeFindingToken(siblingRow.enzyme || siblingRow.formationPathway || siblingRow.clearancePathway || siblingRow.affectedPathway) === pathway);
    if (!pathwayMatch) continue;
    if (driverKeys.size) {
      const siblingPerps = inferPerpetratorActors(sibling, {
        ...context,
        domain: inferClinicalConcernDomainShallow(sibling),
        victims: [],
      }).map(actor => normalizeFindingToken(actor.id));
      if (!siblingPerps.some(key => driverKeys.has(key))) continue;
    }
    const siblingVictims = inferVictimActors(sibling, {
      ...context,
      domain: inferClinicalConcernDomainShallow(sibling),
    }).filter(actor => actor.type === "parent_drug");
    out.push(...siblingVictims);
  }
  return mergeClinicalActors(out);
}

function clinicalHasSiblingExposureConcern(parent, context = {}) {
  if (!parent) return false;
  const parentKey = normalizeFindingToken(parent);
  return (context.findings || []).some(finding => {
    if (!finding || finding.type === "active_moiety") return false;
    const domain = inferClinicalConcernDomainShallow(finding);
    if (domain !== "exposure_increase_toxicity" && domain !== "exposure_decrease_failure" && domain !== "induction_loss_of_efficacy") return false;
    return inferVictimActors(finding, { ...context, domain })
      .some(actor => normalizeFindingToken(actor.id) === parentKey);
  });
}

function inferClinicalConcernDomainShallow(finding) {
  const text = clinicalConcernText(finding).toLowerCase();
  if (/induc|lower|reduced|decrease|↓↓|↓/.test(text) && !/inhibit|increase|toxicity|↑/.test(text)) return "induction_loss_of_efficacy";
  if (/increase|higher|raises|toxicity|inhibit|accumul|↑|rhabdomyolysis/.test(text)) return "exposure_increase_toxicity";
  if (/prodrug|activation|active metabolite|efficacy loss|loss of efficacy/.test(text)) return "activation_failure";
  if (/p-gp|oatp|transporter|renal clearance/.test(text)) return "renal_clearance_or_transporter";
  return "model_only_mechanistic_context";
}

function clinicalInteractionLikeRow(finding = {}) {
  return (finding.sourceRows || []).find(row => row?.drug1 && row?.drug2) || null;
}

function aggregateActiveMoietyFindingsForOverview(findings, context = {}) {
  return buildClinicalConcerns((findings || []).filter(finding => finding.type === "active_moiety"), context);
}

function aggregatePhenoconversionFindingsForOverview(findings, context = {}) {
  return buildClinicalConcerns((findings || []).filter(finding => finding.type === "phenoconversion"), context);
}

function clinicalSupportingSignalForFinding(finding, entry = {}) {
  const row = finding?.sourceRows?.[0] || {};
  const type = finding?.type || "finding";
  let label = finding?.title || "Related review signal";
  if (type === "pairwise_interaction") {
    const pair = [row.drug1, row.drug2].filter(Boolean).join(" + ");
    label = pair ? `Curated ${pair} interaction` : "Curated interaction";
  } else if (type === "phenoconversion") {
    label = `${row.enzyme || clinicalActorLabel(entry.pathwayActors?.[0]) || "Pathway"} functional capacity ${row.direction || "changed"}`;
  } else if (type === "active_moiety") {
    if (row.netPattern === "risk_marker_toxic_context") label = `${row.actor || row.parent || "Toxic metabolite"} is risk-marker context`;
    else if (row.netPattern === "parent_accumulation") label = `${row.parent || "Parent drug"} parent exposure trends up`;
    else if (row.netPattern === "mixed_direction") label = `${row.parent || "Parent drug"} parent-metabolite balance changed`;
    else label = `${row.parent || "Parent drug"} active-moiety signal`;
  } else if (type === "timing_washout") {
    label = `${row.actor || row.parent || "Substance"} timing or washout context`;
  } else if (type === "transporter") {
    label = "Transporter or clearance pathway context";
  } else if (type === "mechanistic_pathway") {
    label = "Modeled mechanistic pathway context";
  }
  return {
    id: finding.id,
    type,
    label,
    severity: finding.severity || "info",
    confidence: finding.confidence || "unknown",
    evidenceRefs: uniqueClinicalValues(finding.evidenceRefs || []),
    sourceStatus: (finding.evidenceRefs || []).length ? "source-linked, pending review" : "modeled support",
    presentationLevel: entry.presentationLevel || "supporting",
  };
}

function makeClinicalConcernSummary(concern, context = {}) {
  const primary = concern.primaryFinding || {};
  const domain = concern.domain || concern.clinicalConcernDomain;
  const victims = concern.victimActors || [];
  const perpetrators = concern.perpetratorActors || [];
  const victim = clinicalActorLabel(victims[0]) || clinicalPrimaryVictimFromFinding(primary);
  const perp = clinicalActorListLabel(perpetrators);
  if (domain === "exposure_increase_toxicity" && victim && perp) {
    return `${perp} may increase ${victim} exposure, raising ${victim} toxicity review priority. Related pathway, metabolite, and evidence signals are grouped below.`;
  }
  if ((domain === "exposure_decrease_failure" || domain === "induction_loss_of_efficacy") && victim && perp) {
    return `${perp} may reduce ${victim} exposure or effect. Related pathway and timing signals are grouped below.`;
  }
  if (domain === "activation_failure") {
    return `${primary.summary || `${victim || "A prodrug"} activation may be reduced.`} Related genotype, pathway, and metabolite signals are grouped below.`;
  }
  if (domain === "risk_marker_context" || domain === "hypersensitivity_or_scar") {
    return `${primary.summary || "A selected risk marker matches a current medication context."} Related toxic-metabolite or phenotype signals are grouped below.`;
  }
  if (clinicalBurdenDomain(domain)) {
    return `${clinicalDomainLabel(domain)} is the shared concern. Pairwise and pathway signals that feed this burden are grouped below.`;
  }
  if (domain === "washout_or_persistence") {
    return "Timing and persistence context may remain relevant after stopping or switching. Parent, metabolite, and recovery signals are grouped below.";
  }
  return `${primary.summary || "This card groups related pathway, metabolite, and evidence signals for the same clinical concern."}`;
}

function inferPathwayActors(finding, context = {}) {
  const row = finding?.sourceRows?.[0] || {};
  const actors = [];
  for (const actor of finding?.affectedActors || []) {
    if (actor.type === "enzyme" || actor.type === "pathway") actors.push({ ...actor });
  }
  for (const value of [row.enzyme, row.affectedPathway, row.formationPathway, row.clearancePathway, row.pathway]) {
    if (value && value !== "unknown") actors.push({ id:value, type:isFindingGeneLike(value) ? "enzyme" : "pathway", direction:row.direction || "involved" });
  }
  return mergeClinicalActors(actors);
}

function inferPhenotypeActors(finding, context = {}) {
  const domain = context.domain || inferClinicalConcernDomain(finding, context);
  const row = finding?.sourceRows?.[0] || {};
  if (clinicalBurdenDomain(domain)) return [{ id:clinicalDomainLabel(domain), type:"phenotype", direction:"burden" }];
  if (domain === "risk_marker_context" || domain === "hypersensitivity_or_scar") {
    return [{ id:clinicalRiskPhenotypeLabel(row, finding), type:"phenotype", direction:"risk context" }];
  }
  return [];
}

function clinicalPerpetratorsForPathways(pathways = [], stack = [], victims = [], domain = "") {
  const pathwayKeys = new Set(pathways.map(normalizeFindingToken).filter(Boolean));
  const victimKeys = new Set((victims || []).map(normalizeFindingToken));
  if (!pathwayKeys.size || typeof getDrug !== "function") return [];
  const out = [];
  for (const name of stack || []) {
    if (victimKeys.has(normalizeFindingToken(name))) continue;
    const drug = getDrug(name);
    if (!drug) continue;
    const inhibitors = (drug.inh || []).filter(entry => pathwayKeys.has(normalizeFindingToken(entry.target)));
    const inducers = (drug.ind || []).filter(entry => pathwayKeys.has(normalizeFindingToken(entry.target)));
    const metabolicInhibitors = (drug.metInh || []).filter(entry => pathwayKeys.has(normalizeFindingToken(entry.target)));
    if ((domain === "exposure_increase_toxicity" || domain === "activation_failure" || domain === "parent_accumulation" || domain === "mixed_parent_metabolite_direction") && (inhibitors.length || metabolicInhibitors.length)) {
      out.push({ id:name, type:"parent_drug", direction:"inhibits" });
    } else if ((domain === "exposure_decrease_failure" || domain === "induction_loss_of_efficacy") && inducers.length) {
      out.push({ id:name, type:"parent_drug", direction:"induces" });
    } else if (inhibitors.length || inducers.length || metabolicInhibitors.length) {
      out.push({ id:name, type:"parent_drug", direction:inducers.length ? "induces" : "inhibits" });
    }
  }
  return mergeClinicalActors(out);
}

function clinicalConcernEntryScore(entry) {
  const finding = entry.finding || {};
  const role = { primary: 5000, supporting: 1000, detail_only: 100, hidden: 0 }[entry.presentationLevel] || 0;
  return role + clinicalConcernRankScore(finding);
}

function clinicalConcernRankScore(finding) {
  return (clinicalSeverityValue(finding?.severity) * 1000) +
    ((finding?.evidenceRefs || []).length ? 120 : 0) +
    ((finding?.supportingSignals || []).length * 25) +
    ((finding?.rawFindingCount || 0) * 12) +
    ((CLINICAL_CONCERN_CONFIDENCE_ORDER[finding?.confidence] || 0) * 10);
}

function clinicalSeverityValue(severity) {
  return (typeof FINDING_SEVERITY_ORDER !== "undefined" ? FINDING_SEVERITY_ORDER : { critical:5, severe:4, moderate:3, monitor:2, info:1, unknown:0 })[severity] || 0;
}

function clinicalWorstSeverity(values = []) {
  return (values || []).reduce((worst, value) =>
    clinicalSeverityValue(value) > clinicalSeverityValue(worst) ? value : worst,
    "info"
  );
}

function clinicalBestConfidence(values = []) {
  return (values || []).reduce((best, value) =>
    (CLINICAL_CONCERN_CONFIDENCE_ORDER[value] || 0) > (CLINICAL_CONCERN_CONFIDENCE_ORDER[best] || 0) ? value : best,
    "unknown"
  );
}

function clinicalConcernText(finding) {
  return `${finding?.title || ""} ${finding?.summary || ""} ${finding?.clinicalAction || ""} ${finding?.evidenceStatus || ""} ${(finding?.tags || []).join(" ")} ${(finding?.sourceRows || []).map(row => `${row.effect || ""} ${row.mechanism || ""} ${row.clinicalAction || ""} ${row.management || ""} ${row.phenotype || ""} ${(row.reasons || []).join(" ")} ${(row.activeMoietyConsequences || []).join(" ")}`).join(" ")}`;
}

function normalizeClinicalFindingInput(input) {
  if (input?.sourceRows || input?.affectedActors || input?.type) return input;
  return { sourceRows:[input], affectedActors:[], type:input?.type || "row" };
}

function clinicalActorLabel(actor) {
  return actor?.id || actor?.name || "";
}

function clinicalActorListLabel(actors = []) {
  return uniqueClinicalValues((actors || []).map(clinicalActorLabel)).join(", ");
}

function clinicalPrimaryVictimFromFinding(finding = {}) {
  const parent = (finding.affectedActors || []).find(actor => actor.type === "parent_drug" && /up|down|affected|persists|risk|involved/.test(String(actor.direction || "")));
  return parent?.id || finding.sourceRows?.[0]?.parent || finding.sourceRows?.[0]?.drug2 || finding.sourceRows?.[0]?.drug1 || "";
}

function clinicalActiveMetaboliteName(finding = {}, row = {}) {
  if (row.actor && row.actor !== row.parent && !/inactive|unchanged|clearance/i.test(`${row.actor || ""} ${row.actorType || ""} ${row.role || ""}`)) return row.actor;
  const met = (finding.affectedActors || []).find(actor => /metabolite/.test(actor.type || "") && !/inactive|unchanged|clearance/i.test(`${actor.id || ""} ${actor.type || ""} ${actor.direction || ""}`));
  return met?.id || "";
}

function clinicalActiveMetaboliteFromFindings(findings = []) {
  for (const finding of findings || []) {
    for (const row of finding?.sourceRows || []) {
      if (row.actor && row.actorType === "active_metabolite" && row.role === "active_form") return row.actor;
    }
  }
  for (const finding of findings || []) {
    const row = finding?.sourceRows?.[0] || {};
    const name = clinicalActiveMetaboliteName(finding, row);
    if (name) return name;
  }
  return "";
}

function clinicalFirstActor(finding, type) {
  return (finding?.affectedActors || []).find(actor => actor.type === type);
}

function clinicalVictimDirection(domain, finding, row = {}) {
  if (domain === "exposure_increase_toxicity") return "up";
  if (domain === "exposure_decrease_failure" || domain === "induction_loss_of_efficacy") return "down";
  if (domain === "activation_failure") return "activation reduced";
  if (domain === "washout_or_persistence") return "persists";
  return inferExposureDirectionForActor(row.drug2 || row.parent, finding, { domain });
}

function clinicalPerpetratorDirection(domain, finding, row = {}) {
  if (domain === "induction_loss_of_efficacy" || /induc/i.test(`${row.type || ""} ${row.category || ""} ${row.mechanism || ""}`)) return "induces";
  if (domain === "exposure_increase_toxicity" || domain === "activation_failure" || /inhibit|block/i.test(`${row.mechanism || ""}`)) return "inhibits";
  return "involved";
}

function clinicalRiskPhenotypeLabel(row = {}, finding = {}) {
  const text = `${row.phenotype || ""} ${finding.summary || ""} ${finding.title || ""}`.toLowerCase();
  if (/scar|sjs|ten|hypersens/.test(text)) return "hypersensitivity / SCAR";
  if (/hemolysis|methemoglobin|oxidant/.test(text)) return "oxidant hemolysis";
  if (/malignant hyperthermia/.test(text)) return "malignant hyperthermia";
  if (/paralysis|apnea|neuromuscular/.test(text)) return "prolonged paralysis";
  if (/ototox/.test(text)) return "aminoglycoside ototoxicity";
  return row.phenotype || "risk-marker context";
}

function clinicalDomainLabel(domain) {
  const labels = {
    exposure_increase_toxicity: "Exposure/toxicity",
    exposure_decrease_failure: "Exposure failure",
    activation_failure: "Activation failure",
    active_metabolite_accumulation: "Active-metabolite accumulation",
    toxic_metabolite_accumulation: "Toxic-metabolite accumulation",
    parent_accumulation: "Parent accumulation",
    mixed_parent_metabolite_direction: "Parent-metabolite balance",
    risk_marker_context: "Risk-marker context",
    hypersensitivity_or_scar: "Hypersensitivity / SCAR",
    pharmacodynamic_burden: "Pharmacodynamic burden",
    qt_burden: "QTc burden",
    bleeding_burden: "Bleeding burden",
    cns_depression_burden: "CNS depression burden",
    serotonin_toxicity: "Serotonin toxicity",
    anticholinergic_fall_burden: "Anticholinergic/fall burden",
    renal_clearance_or_transporter: "Transporter/renal clearance",
    absorption_or_chelation: "Absorption/chelation",
    washout_or_persistence: "Washout/persistence",
    induction_loss_of_efficacy: "Induction/loss of efficacy",
    enzyme_capacity_context: "Enzyme capacity context",
    model_only_mechanistic_context: "Model-only mechanism",
  };
  return labels[domain] || String(domain || "Clinical concern").replace(/_/g, " ");
}

function clinicalBurdenDomain(domain) {
  return [
    "pharmacodynamic_burden",
    "qt_burden",
    "bleeding_burden",
    "cns_depression_burden",
    "serotonin_toxicity",
    "anticholinergic_fall_burden",
  ].includes(domain);
}

function clinicalStackIncludes(name, stack = []) {
  const key = normalizeFindingToken(name);
  return (stack || activeStack || []).some(item => normalizeFindingToken(item) === key);
}

function mergeClinicalActors(actors = []) {
  const byKey = new Map();
  for (const actor of actors || []) {
    if (!actor?.id) continue;
    const key = `${actor.type || "actor"}:${normalizeFindingToken(actor.id)}`;
    if (!byKey.has(key)) byKey.set(key, actor);
  }
  return [...byKey.values()];
}

function uniqueClinicalValues(values = []) {
  return [...new Set((values || []).map(value => String(value || "").trim()).filter(Boolean))];
}

const V1_FINDING_TRUST_REQUIRED_FIELDS = [
  "concernCategory",
  "affected",
  "mechanism",
  "expectedChange",
  "clinicalConcern",
  "confidence",
  "evidence",
  "patientAction",
  "clinicianAction",
  "limitationStatus",
];

function buildV1FindingTrustContract(finding = {}, context = {}) {
  const safeFinding = finding || {};
  const domain = safeFinding.clinicalConcernDomain || inferClinicalConcernDomain(safeFinding, {
    ...context,
    findings: safeFinding.sourceFindingsFull || context.findings || [],
  });
  const evidenceRefs = uniqueClinicalValues([
    ...(safeFinding.evidenceRefs || []),
    ...(safeFinding.sourceFindingsFull || []).flatMap(item => item.evidenceRefs || []),
  ]);
  const sourceRows = safeFinding.sourceRows || [];
  const studies = typeof resolveFindingStudies === "function" ? resolveFindingStudies(evidenceRefs) : [];
  const sourceLinked = !!safeFinding.evidenceLadder?.sourceLinked || evidenceRefs.length > 0;
  const reviewed = safeFinding.evidenceLadder?.professionalReviewStatus === "reviewed" ||
    (typeof hasProfessionalFindingReview === "function" && hasProfessionalFindingReview(studies));
  const contract = {
    version: "v1-finding-trust-1",
    concernCategory: clinicalDomainLabel(domain),
    affected: v1TrustAffectedLabel(safeFinding, context),
    mechanism: v1TrustMechanism(safeFinding, domain, context),
    expectedChange: v1TrustExpectedChange(safeFinding, domain, context),
    clinicalConcern: v1TrustClinicalConcern(safeFinding, domain, context),
    confidence: v1TrustConfidenceLabel(safeFinding),
    evidence: v1TrustEvidenceLabel(safeFinding, evidenceRefs, sourceLinked),
    patientAction: v1TrustPatientAction(safeFinding, domain),
    clinicianAction: v1TrustClinicianAction(safeFinding, domain),
    limitationStatus: v1TrustLimitationStatus({ sourceLinked, reviewed, finding:safeFinding }),
    sourceLinked,
    clinicalReviewStatus: reviewed ? "reviewed" : "clinical review needed",
    evidenceRefs,
    sourceCount: safeFinding.evidenceLadder?.studyCount || evidenceRefs.length,
    sourceTypes: uniqueClinicalValues(studies.map(study => String(study.type || "").replace(/_/g, " "))),
    reviewed,
    sourceRowCount: sourceRows.length,
  };
  contract.missingFields = V1_FINDING_TRUST_REQUIRED_FIELDS.filter(field => !v1TrustHasValue(contract[field]));
  contract.ready = contract.missingFields.length === 0;
  return contract;
}

function buildV1GenotypeSignalTrustContract(signal = {}, severity = "monitor", context = {}) {
  if (!signal) return null;
  const syntheticFinding = {
    id: `pgx-signal-${signal.kind || signal.headline || "finding"}`,
    type: "risk_marker",
    title: signal.headline || "Pharmacogenomic finding",
    severity,
    confidence: signal.confidence || (signal.score >= 70 ? "moderate" : "low"),
    summary: signal.summary || signal.changes || signal.why || "A selected gene result changes expected medication response.",
    clinicalAction: signal.review || signal.nextStep || "",
    evidenceRefs: signal.evidenceRefs || [],
    affectedActors: (signal.substances || signal.drugs || context.stack || [])
      .map(id => ({ id, type:"parent_drug", direction:"affected" })),
    tags: ["PGx", signal.kind || ""].filter(Boolean),
    sourceRows: [{
      marker: signal.gene || signal.marker || "",
      phenotype: signal.phenotype || signal.label || "",
      effect: signal.changes || signal.summary || "",
      mechanism: signal.why || "",
      management: signal.review || signal.nextStep || "",
    }],
    clinicalConcernDomain: /activat|prodrug|metabolite/i.test(`${signal.headline || ""} ${signal.summary || ""}`)
      ? "activation_failure"
      : "risk_marker_context",
  };
  return buildV1FindingTrustContract(syntheticFinding, context);
}

function v1TrustHasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  return String(value || "").trim().length > 0;
}

function v1TrustAffectedLabel(finding = {}, context = {}) {
  const actors = uniqueClinicalValues([
    ...(finding.victimActors || []).map(clinicalActorLabel),
    ...(finding.perpetratorActors || []).map(clinicalActorLabel),
    ...(finding.affectedActors || []).map(clinicalActorLabel),
    ...(finding.sourceRows || []).flatMap(row => [row.drug1, row.drug2, row.parent, row.actor]),
    ...(finding.sourceFindingsFull || []).flatMap(sourceFinding =>
      (sourceFinding.sourceRows || []).flatMap(row => [row.drug1, row.drug2, row.parent, row.actor])
    ),
    ...(finding.sourceFindings || []).flatMap(row => [row.drug1, row.drug2, row.parent, row.actor]),
    ...(context.stack || []).slice(0, 4),
  ]).filter(value => !/^(pathway|unknown)$/i.test(value));
  return actors.slice(0, 6).join(" + ") || "Current medication stack";
}

function v1TrustMechanism(finding = {}, domain = "", context = {}) {
  const text = v1TrustCompactText(`${finding.whyPath?.summary || ""} ${finding.summary || ""}`);
  const victim = clinicalActorLabel(finding.victimActors?.[0]) || clinicalPrimaryVictimFromFinding(finding);
  const perpetrator = clinicalActorListLabel(finding.perpetratorActors || []);
  const pathway = clinicalActorListLabel(finding.pathwayActors || []);
  if (domain === "exposure_increase_toxicity") {
    return perpetrator && victim
      ? `${perpetrator} may reduce clearance or raise exposure of ${victim}${pathway ? ` through ${pathway}` : ""}.`
      : text || "A pathway in the current stack may raise medication exposure.";
  }
  if (domain === "exposure_decrease_failure" || domain === "induction_loss_of_efficacy") {
    return perpetrator && victim
      ? `${perpetrator} may increase clearance or reduce expected effect of ${victim}${pathway ? ` through ${pathway}` : ""}.`
      : text || "A pathway in the current stack may reduce medication exposure or effect.";
  }
  if (domain === "activation_failure") {
    return victim
      ? `${victim} may depend on metabolic activation, and the current context may reduce active-form formation.`
      : text || "A prodrug or active-metabolite pathway may be reduced.";
  }
  if (domain === "active_metabolite_accumulation" || domain === "toxic_metabolite_accumulation") {
    return victim
      ? `${victim} metabolite balance may shift toward active or toxic exposure.`
      : text || "A parent-metabolite pathway may shift toward clinically important metabolite exposure.";
  }
  if (domain === "washout_or_persistence") {
    return text || "Parent drug, metabolite, or enzyme-recovery timing may outlast the visible dosing window.";
  }
  if (domain === "risk_marker_context" || domain === "hypersensitivity_or_scar") {
    return text || "A selected genetic or risk marker matches a medication-specific safety context.";
  }
  if (clinicalBurdenDomain(domain)) {
    return text || "Multiple substances may contribute to the same safety burden.";
  }
  if (domain === "renal_clearance_or_transporter") {
    return text || "Transporter or renal-clearance pathways may change medication exposure.";
  }
  if (domain === "absorption_or_chelation") {
    return text || "Absorption, food, pH, or binding effects may change how much medication is available.";
  }
  return text || "A source-linked or modeled pathway signal connects the current stack to this concern.";
}

function v1TrustExpectedChange(finding = {}, domain = "", context = {}) {
  const victim = clinicalActorLabel(finding.victimActors?.[0]) || clinicalPrimaryVictimFromFinding(finding);
  if (domain === "exposure_increase_toxicity") return victim ? `${victim} exposure may rise.` : "Exposure may rise.";
  if (domain === "exposure_decrease_failure" || domain === "induction_loss_of_efficacy") return victim ? `${victim} exposure or effect may fall.` : "Exposure or effect may fall.";
  if (domain === "activation_failure") return victim ? `${victim} active-form formation may fall.` : "Active-form formation may fall.";
  if (domain === "active_metabolite_accumulation") return "Active metabolite exposure may rise.";
  if (domain === "toxic_metabolite_accumulation") return "Toxic metabolite exposure may rise.";
  if (domain === "parent_accumulation") return victim ? `${victim} parent-drug exposure may rise.` : "Parent-drug exposure may rise.";
  if (domain === "mixed_parent_metabolite_direction") return "Parent and metabolite directions may diverge.";
  if (domain === "washout_or_persistence") return "Effect or pathway context may persist after a dose change or stop.";
  if (clinicalBurdenDomain(domain)) return `${clinicalDomainLabel(domain)} may increase.`;
  if (domain === "risk_marker_context" || domain === "hypersensitivity_or_scar") return "A selected marker may increase review priority.";
  return v1TrustCompactText(finding.summary) || "Exposure, activation, timing, or safety context may change.";
}

function v1TrustClinicalConcern(finding = {}, domain = "", context = {}) {
  if (domain === "exposure_increase_toxicity" || domain === "parent_accumulation") return "Higher exposure can increase toxicity or monitoring priority.";
  if (domain === "exposure_decrease_failure" || domain === "induction_loss_of_efficacy") return "Lower exposure or effect can reduce expected benefit.";
  if (domain === "activation_failure") return "Reduced activation can lower expected medication response.";
  if (domain === "active_metabolite_accumulation") return "Active-metabolite accumulation can increase effect or adverse effects.";
  if (domain === "toxic_metabolite_accumulation") return "Toxic-metabolite accumulation can increase adverse-effect risk.";
  if (domain === "washout_or_persistence") return "Timing can matter when starting, stopping, or switching medicines.";
  if (domain === "hypersensitivity_or_scar") return "Marker-linked hypersensitivity needs careful clinical review.";
  if (clinicalBurdenDomain(domain)) return `${clinicalDomainLabel(domain)} can become clinically important when multiple contributors stack.`;
  return `${clinicalDomainLabel(domain)} should be reviewed with dose, timing, symptoms, and source evidence.`;
}

function v1TrustConfidenceLabel(finding = {}) {
  const ladder = finding.evidenceLadder || {};
  const mechanistic = ladder.mechanisticConfidence || finding.confidence || "unknown";
  const action = ladder.clinicalActionConfidence || (finding.reviewRequired === false ? "reviewed" : "review needed");
  return `${v1TrustLabelCase(mechanistic)} mechanism · ${v1TrustActionStatusLabel(action)}`;
}

function v1TrustActionStatusLabel(value) {
  const key = String(value || "").trim().toLowerCase().replace(/_/g, " ");
  if (key === "reviewed" || key === "professionally reviewed") return "action reviewed";
  if (key === "pending review" || key === "review needed" || key === "clinical review needed") return "action needs clinical review";
  if (key === "insufficient") return "action evidence limited";
  return `${v1TrustLabelCase(value)} action`;
}

function v1TrustEvidenceLabel(finding = {}, evidenceRefs = [], sourceLinked = false) {
  const ladder = finding.evidenceLadder || {};
  const count = ladder.studyCount || evidenceRefs.length;
  const tier = ladder.strongestTier && ladder.strongestTier !== "unknown"
    ? String(ladder.strongestTier).replace(/_/g, " ").toLowerCase()
    : "";
  if (sourceLinked || count) {
    return `${tier ? `${tier}; ` : ""}${count || 1} linked source${(count || 1) === 1 ? "" : "s"}`;
  }
  return "modeled signal; source review needed";
}

function v1TrustPatientAction(finding = {}, domain = "") {
  const severity = finding.severity || "info";
  if (severity === "critical" || severity === "severe") {
    return "Ask a doctor or pharmacist before using or changing this combination. Do not stop or change medicines without medical advice.";
  }
  if (severity === "moderate") {
    return "Ask a doctor or pharmacist whether dose, timing, or monitoring should change. Do not stop medicines on your own.";
  }
  if (domain === "washout_or_persistence") {
    return "Ask whether timing, overlap, or washout matters for this medication list.";
  }
  return "Review this note with a doctor or pharmacist, especially if symptoms, doses, or timing change.";
}

function v1TrustClinicianAction(finding = {}, domain = "") {
  const rowActions = [
    finding.clinicalAction,
    finding.action,
    finding.management,
    ...(finding.sourceRows || []).flatMap(row => [row.clinicalAction, row.management, row.action, row.review]),
  ].filter(Boolean);
  if (rowActions.length) return v1TrustCompactText(rowActions[0]);
  if (domain === "exposure_increase_toxicity" || domain === "parent_accumulation") return "Review exposure-sensitive toxicity, dose, monitoring, and alternatives.";
  if (domain === "exposure_decrease_failure" || domain === "induction_loss_of_efficacy") return "Review expected efficacy, timing, dose, and whether an alternative is needed.";
  if (domain === "activation_failure") return "Review prodrug activation, phenotype context, response monitoring, and alternatives.";
  if (domain === "washout_or_persistence") return "Review timing, overlap, persistence, and recovery before switching or adding therapy.";
  if (clinicalBurdenDomain(domain)) return "Review additive burden, patient-specific risk factors, monitoring, and deprescribing opportunities.";
  return "Review dose, timing, clinical context, source evidence, and whether action is warranted.";
}

function v1TrustLimitationStatus({ sourceLinked = false, reviewed = false, finding = {} } = {}) {
  if (reviewed) return "Professionally reviewed source-linked finding.";
  if (sourceLinked) return "Source-linked; clinical review needed.";
  if (finding.reviewRequired === false) return "Reviewed modeled context.";
  return "Modeled signal; verify before clinical use.";
}

function v1TrustLabelCase(value) {
  return String(value || "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function v1TrustCompactText(value) {
  return String(value || "")
    .replace(/\bpending\s+professional\s+(?:clinical\s+)?review\b/gi, "clinical review needed")
    .replace(/\bmodel-only\b/gi, "modeled")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
