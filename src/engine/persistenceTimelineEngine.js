// MedCheck Engine — Persistence & Washout Timeline

const PERSISTENCE_TYPE_LABELS = {
  parent: "Parent persistence",
  metabolite: "Metabolite persistence",
  enzyme_recovery: "Enzyme recovery",
  induction_offset: "Induction offset",
  washout_rule: "Washout rule",
};

function computePersistenceTimeline(stack, genotypeState = {}, context = {}) {
  const activeNames = Array.isArray(stack) && stack.length ? stack : activeStack;
  const rows = [];
  for (const rawName of activeNames || []) {
    const drug = typeof getDrug === "function" ? getDrug(rawName) : null;
    const displayName = drug?.name || rawName;
    rows.push(computeActorPersistence(displayName, displayName, { drug, persistenceType:"parent" }));
    rows.push(...computeMetabolitePersistenceRows(displayName, drug));
  }
  rows.push(...computeWashoutRuleRows(activeNames));
  rows.push(...computeTemporalProfileRows(activeNames));
  return dedupePersistenceRows(rows.filter(Boolean)).sort((a, b) =>
    persistenceSortScore(b) - persistenceSortScore(a) ||
    String(a.parent || "").localeCompare(String(b.parent || "")) ||
    String(a.actor || "").localeCompare(String(b.actor || ""))
  );
}

function computeActorPersistence(actor, parentDrug, context = {}) {
  const drug = context.drug || (actor === parentDrug && typeof getDrug === "function" ? getDrug(parentDrug) : null);
  const actorId = context.actorId || (drug?.id || (typeof toGraphId === "function" ? toGraphId(actor) : normalizePersistenceToken(actor)));
  const pk = drug ? getPersistencePKParams(drug.name) : null;
  const halfLifeHours = normalizePersistenceNumber(
    context.halfLifeHours ??
    context.halfLife ??
    pk?.halfLife ??
    drug?.hl
  );
  const estimatedPersistenceDays = estimatePersistenceDaysFromHalfLife(halfLifeHours);
  const persistenceType = context.persistenceType || "parent";
  const reasons = uniquePersistenceValues([
    ...(context.reasons || []),
    halfLifeHours
      ? `${actor} half-life is modeled at ${formatPersistenceHours(halfLifeHours)}; about five half-lives gives ${formatPersistenceDays(estimatedPersistenceDays)}.`
      : `${actor} has no modeled half-life; persistence is shown as unknown, not zero.`,
  ]);
  return {
    actor,
    actorId,
    parent: parentDrug || actor,
    actorType: context.actorType || (drug ? "parent_drug" : "actor"),
    role: context.role || (drug ? "parent" : "persistence"),
    halfLifeHours,
    estimatedPersistenceDays,
    pathway: context.pathway || formatPersistencePathway(drug?.routes || []),
    persistenceType,
    riskWindow: classifyPersistenceWindow(estimatedPersistenceDays),
    reasons,
    evidenceRefs: uniquePersistenceValues(context.evidenceRefs || collectRouteEvidenceRefs(drug?.routes || [])),
    confidence: context.confidence || (halfLifeHours ? (pk ? "high" : "moderate") : "unknown"),
    reviewRequired: context.reviewRequired !== false,
  };
}

function classifyPersistenceRisk(timelineRows) {
  const rows = Array.isArray(timelineRows) ? timelineRows : [];
  const knownRows = rows.filter(row => Number.isFinite(row.estimatedPersistenceDays));
  const maxDays = knownRows.length ? Math.max(...knownRows.map(row => row.estimatedPersistenceDays)) : null;
  const unknownCount = rows.filter(row => row.riskWindow === "unknown").length;
  const longRows = rows.filter(row => ["weeks"].includes(row.riskWindow));
  const washoutRows = rows.filter(row => ["washout_rule", "enzyme_recovery", "induction_offset"].includes(row.persistenceType));
  return {
    maxDays,
    unknownCount,
    longCount: longRows.length,
    washoutCount: washoutRows.length,
    level: maxDays == null ? "unknown" : maxDays >= 21 ? "weeks" : maxDays >= 2 ? "days" : "hours",
    summary: maxDays == null
      ? `${unknownCount} persistence row${unknownCount === 1 ? "" : "s"} have unknown duration.`
      : `Longest modeled persistence is ${formatPersistenceDays(maxDays)}.`,
  };
}

function timelineRowsToFindings(rows) {
  const importantRows = (rows || []).filter(row => {
    if (!row) return false;
    if (["washout_rule", "enzyme_recovery", "induction_offset"].includes(row.persistenceType)) return true;
    if (["active_metabolite", "toxic_metabolite"].includes(row.actorType) && row.riskWindow === "weeks") return true;
    if (row.persistenceType === "parent" && row.riskWindow === "weeks") return true;
    return false;
  });
  return importantRows.map(row => {
    const days = Number.isFinite(row.estimatedPersistenceDays) ? row.estimatedPersistenceDays : null;
    const severity = persistenceFindingSeverity(row);
    const label = PERSISTENCE_TYPE_LABELS[row.persistenceType] || "Persistence";
    const duration = days == null ? "unknown duration" : formatPersistenceDays(days);
    const actorPhrase = row.actor === row.parent ? row.actor : `${row.actor} from ${row.parent}`;
    return {
      id: makeFindingId(["finding", "timing", row.persistenceType, row.parent, row.actor]),
      type: "timing_washout",
      title: `${actorPhrase} may persist after stopping`,
      severity,
      confidence: row.confidence || "unknown",
      summary: `${label}: ${actorPhrase} has ${duration} of modeled persistence. ${row.reasons?.[0] || "Timing context requires review."}`,
      affectedActors: [
        { id:row.parent || row.actor, type:"parent_drug", direction:"stopped/source" },
        row.actor !== row.parent ? { id:row.actor, type:row.actorType || "actor", direction:"persists" } : null,
        row.pathway ? { id:row.pathway, type:isFindingGeneLike(row.pathway) ? "enzyme" : "pathway", direction:row.persistenceType } : null,
      ].filter(Boolean),
      tags: uniquePersistenceValues([
        "Persistence",
        label,
        row.riskWindow,
        row.actorType === "active_metabolite" ? "Active metabolite" : "",
        row.actorType === "toxic_metabolite" ? "Toxic metabolite" : "",
        row.persistenceType === "induction_offset" ? "Induction" : "",
        row.persistenceType === "enzyme_recovery" ? "Enzyme recovery" : "",
      ]),
      evidenceRefs: uniquePersistenceValues(row.evidenceRefs || []),
      reviewRequired: row.reviewRequired !== false,
      whyPath: null,
      evidenceLadder: null,
      source: "timeline_engine",
      sourceRows: [row],
      groupedFindings: [],
      clinicalAction: "Review stop date, switch timing, enzyme recovery, and active-metabolite persistence before applying standard timing assumptions.",
      evidenceStatus: (row.evidenceRefs || []).length ? "source-linked; pending professional review" : "inferred/review required",
    };
  });
}

function computeMetabolitePersistenceRows(parentName, drug) {
  const metList = METAB[parentName] || METAB[drug?.name] || [];
  return metList
    .map(met => {
      const actorId = typeof getMetaboliteGraphId === "function" ? getMetaboliteGraphId(met.n) : normalizePersistenceToken(met.n);
      const actor = METABOLITE_ACTORS?.[actorId] || null;
      const halfLifeHours = normalizePersistenceNumber(actor?.halfLife ?? met.t);
      const actorType = classifyPersistenceMetaboliteType(met, actor);
      const role = met.role || actor?.role || normalizeMetaboliteActivity?.(met.a) || (actor?.active ? "active" : "metabolite");
      if (!halfLifeHours && !["active_metabolite", "toxic_metabolite"].includes(actorType)) return null;
      const persistenceDays = estimatePersistenceDaysFromHalfLife(halfLifeHours);
      const parentPk = drug ? getPersistencePKParams(drug.name) : null;
      const parentHalfLife = normalizePersistenceNumber(parentPk?.halfLife ?? drug?.hl);
      const reasons = [
        `${met.n} is modeled as ${actorType.replace(/_/g, " ")} from ${parentName}.`,
        halfLifeHours
          ? `${met.n} half-life is ${formatPersistenceHours(halfLifeHours)}, giving about ${formatPersistenceDays(persistenceDays)} persistence.`
          : `${met.n} lacks a half-life estimate; persistence is unknown.`,
        parentHalfLife && halfLifeHours && halfLifeHours > parentHalfLife
          ? `It persists longer than parent ${parentName} (${formatPersistenceHours(parentHalfLife)}).`
          : "",
        met.e ? `Formation pathway: ${met.e}.` : "",
      ];
      return {
        actor: actor?.name || met.n,
        actorId,
        parent: parentName,
        actorType,
        role,
        halfLifeHours,
        estimatedPersistenceDays: persistenceDays,
        pathway: met.e || actor?.formingEnzyme || "",
        persistenceType: "metabolite",
        riskWindow: classifyPersistenceWindow(persistenceDays),
        reasons: uniquePersistenceValues(reasons),
        evidenceRefs: uniquePersistenceValues([...(met.evidenceRefs || []), ...(actor?.evidenceRefs || [])]),
        confidence: halfLifeHours ? ((met.evidenceRefs || actor?.evidenceRefs || []).length ? "high" : "moderate") : "unknown",
        reviewRequired: true,
      };
    })
    .filter(Boolean);
}

function computeWashoutRuleRows(activeNames) {
  if (typeof computeWashoutCalendar !== "function") return [];
  return computeWashoutCalendar(activeNames || []).map(event => ({
    actor: event.name || event.actorId,
    actorId: event.actorId,
    parent: event.drugName || event.name,
    actorType: event.actorId === toGraphId(event.drugName || "") ? "parent_drug" : "actor",
    role: "clinical display rule",
    halfLifeHours: null,
    estimatedPersistenceDays: event.days,
    pathway: event.mechanism || "washout",
    persistenceType: "washout_rule",
    riskWindow: classifyPersistenceWindow(event.days),
    reasons: uniquePersistenceValues([
      event.note,
      `Display washout rule: ${formatPersistenceDays(event.days)} before assuming recovery.`,
    ]),
    evidenceRefs: [],
    confidence: "moderate",
    reviewRequired: true,
  }));
}

function computeTemporalProfileRows(activeNames) {
  const graph = typeof getInteractionGraph === "function" ? getInteractionGraph() : null;
  const rows = [];
  for (const drugName of activeNames || []) {
    const drug = typeof getDrug === "function" ? getDrug(drugName) : null;
    const drugId = drug?.id || (typeof toGraphId === "function" ? toGraphId(drug?.name || drugName) : normalizePersistenceToken(drugName));
    const nodeIds = uniquePersistenceValues([drugId, ...(WASHOUT_SOURCE_ALIASES?.[drugId] || [])]);
    const metabEdges = (graph?.edges || []).filter(edge => edge.from === drugId && edge.type === EDGE_TYPE.METABOLIZED_TO);
    for (const edge of metabEdges) nodeIds.push(edge.to);
    for (const actorId of uniquePersistenceValues(nodeIds)) {
      const profile = typeof getTemporalProfile === "function" ? getTemporalProfile(actorId) : null;
      if (!profile) continue;
      const existingRule = WASHOUT_DAYS?.[actorId];
      const type = classifyTemporalPersistenceType(profile);
      const estimatedDays = parsePersistenceOffsetDays(profile.offset) ?? existingRule?.days ?? null;
      const actor = typeof getTemporalActorName === "function"
        ? getTemporalActorName(graph, actorId, drug?.name || drugName)
        : actorId;
      rows.push({
        actor,
        actorId,
        parent: drug?.name || drugName,
        actorType: actorId === drugId ? "parent_drug" : (METABOLITE_ACTORS?.[actorId] ? "metabolite" : "actor"),
        role: profile.mechanism || "temporal profile",
        halfLifeHours: null,
        estimatedPersistenceDays: estimatedDays,
        pathway: profile.mechanism || "",
        persistenceType: type,
        riskWindow: classifyPersistenceWindow(estimatedDays),
        onset: profile.onset || "",
        offset: profile.offset || "",
        reasons: uniquePersistenceValues([
          profile.onset ? `Onset: ${profile.onset.replace(/_/g, " ")}.` : "",
          profile.offset ? `Offset: ${profile.offset.replace(/_/g, " ")}.` : "",
          profile.note || "",
          existingRule?.note ? `Washout rule also exists: ${existingRule.note}` : "",
        ]),
        evidenceRefs: [],
        confidence: estimatedDays == null ? "unknown" : "moderate",
        reviewRequired: true,
      });
    }
  }
  return rows;
}

function classifyTemporalPersistenceType(profile) {
  const text = `${profile?.mechanism || ""} ${profile?.offset || ""}`.toLowerCase();
  if (/induction|induc|pxr|receptor/.test(text)) return "induction_offset";
  if (/mbi|maoi|inhibit|enzyme|competitive/.test(text)) return "enzyme_recovery";
  return "enzyme_recovery";
}

function classifyPersistenceMetaboliteType(met, actor) {
  const activity = String(met?.role || met?.a || actor?.role || "").toLowerCase();
  const note = String(met?.note || actor?.note || "").toLowerCase();
  if (/toxic|napqi|tox/.test(activity) || /toxic|myelosuppression|hepatotoxic|rhabdomyolysis/.test(note)) return "toxic_metabolite";
  if (actor?.active || /active/.test(activity)) return "active_metabolite";
  if (/inactive|clearance/.test(activity)) return "inactive_clearance_metabolite";
  return "metabolite";
}

function getPersistencePKParams(name) {
  if (!name) return null;
  const key = typeof toGraphId === "function" ? toGraphId(name) : normalizePersistenceToken(name);
  return PK_PARAMS?.[key] || PK_PARAMS?.[String(name).toLowerCase()] || null;
}

function estimatePersistenceDaysFromHalfLife(halfLifeHours) {
  if (!Number.isFinite(halfLifeHours) || halfLifeHours <= 0) return null;
  return Math.round((halfLifeHours * 5 / 24) * 10) / 10;
}

function classifyPersistenceWindow(days) {
  if (!Number.isFinite(days)) return "unknown";
  if (days >= 10) return "weeks";
  if (days >= 1) return "days";
  return "hours";
}

function persistenceFindingSeverity(row) {
  if (row.persistenceType === "washout_rule" && /MAOI|contraindicated/i.test(`${row.pathway || ""} ${(row.reasons || []).join(" ")}`)) return "moderate";
  if (row.persistenceType === "induction_offset" && row.riskWindow === "weeks") return "monitor";
  if (row.riskWindow === "weeks") return row.actorType === "active_metabolite" || row.actorType === "toxic_metabolite" ? "moderate" : "monitor";
  return "info";
}

function persistenceSortScore(row) {
  const days = Number.isFinite(row.estimatedPersistenceDays) ? row.estimatedPersistenceDays : 0;
  const typeWeight = { washout_rule: 40, induction_offset: 35, enzyme_recovery: 30, metabolite: 20, parent: 10 }[row.persistenceType] || 0;
  const actorWeight = row.actorType === "toxic_metabolite" ? 20 : row.actorType === "active_metabolite" ? 12 : 0;
  return days + typeWeight + actorWeight;
}

function parsePersistenceOffsetDays(offset) {
  const text = String(offset || "").toLowerCase().replace(/_/g, " ").trim();
  if (!text) return null;
  if (/month/.test(text)) return 90;
  if (/week/.test(text)) return parsePersistenceNumberRange(text) * 7;
  if (/day/.test(text)) return parsePersistenceNumberRange(text);
  if (/h\b|hour/.test(text)) return Math.round((parsePersistenceNumberRange(text) / 24) * 10) / 10;
  if (text === "hours") return 0.5;
  if (text === "days") return 3;
  return null;
}

function parsePersistenceNumberRange(text) {
  const nums = String(text || "").match(/\d+(\.\d+)?/g)?.map(Number).filter(Number.isFinite) || [];
  if (!nums.length) return 1;
  return Math.max(...nums);
}

function normalizePersistenceNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatPersistenceHours(hours) {
  if (!Number.isFinite(hours)) return "unknown";
  if (hours >= 24) return `${Math.round((hours / 24) * 10) / 10} days`;
  return `${Math.round(hours * 10) / 10} hours`;
}

function formatPersistenceDays(days) {
  if (!Number.isFinite(days)) return "unknown";
  if (days < 1) return `${Math.round(days * 24)} hours`;
  return `${Math.round(days * 10) / 10} days`;
}

function formatPersistencePathway(routes = []) {
  return uniquePersistenceValues((routes || []).map(route => route.enzyme)).slice(0, 3).join(" / ");
}

function collectRouteEvidenceRefs(routes = []) {
  return uniquePersistenceValues((routes || []).flatMap(route => route.evidenceRefs || route.evidence?.refs || []));
}

function dedupePersistenceRows(rows) {
  const byKey = new Map();
  for (const row of rows || []) {
    if (!row?.actor) continue;
    const key = `${normalizePersistenceToken(row.parent)}|${normalizePersistenceToken(row.actor)}|${row.persistenceType}`;
    const existing = byKey.get(key);
    if (!existing || persistenceSortScore(row) > persistenceSortScore(existing)) byKey.set(key, row);
  }
  return [...byKey.values()];
}

function uniquePersistenceValues(values = []) {
  return [...new Set((values || []).map(value => String(value || "").trim()).filter(Boolean))];
}

function normalizePersistenceToken(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
