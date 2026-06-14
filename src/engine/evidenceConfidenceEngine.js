// MedCheck Engine — Evidence Confidence Ladder

const EVIDENCE_LADDER_TIER_KEYS = [
  "FDA_LABEL",
  "GUIDELINE",
  "META_ANALYSIS",
  "RCT",
  "CLINICAL_PK",
  "OBSERVATIONAL",
  "CASE_REPORT",
  "REVIEW",
  "ANIMAL",
  "IN_VITRO",
];

function computeEvidenceLadder(evidenceRefs = [], context = {}) {
  const studies = uniqueEvidenceLadderRefs([
    ...(context.studies || []),
    ...uniqueEvidenceLadderRefs(evidenceRefs).map(ref => STUDY_DB?.[ref]).filter(Boolean),
  ], study => study?.id || JSON.stringify(study));
  const severityBearingStudies = typeof getSeverityBearingStudies === "function"
    ? getSeverityBearingStudies(studies)
    : studies;
  const tierKeysPresent = buildEvidenceTierPresence(studies);
  const strongestStudy = strongestEvidenceStudy(studies);
  const strongestTierKey = strongestStudy ? evidenceTierKey(strongestStudy.type) : "unknown";
  const sourceLinked = studies.length > 0 || uniqueEvidenceLadderRefs(evidenceRefs).length > 0 || Boolean(context.inlineEvidence);
  const professionalReviewStatus = classifyProfessionalReviewStatus(studies, context.reviewStatus);
  const supportingSignals = context.supportingSignals || {};
  const mechanisticConfidence = classifyMechanisticConfidence(studies, supportingSignals);
  const clinicalActionConfidence = classifyClinicalActionConfidence(studies, professionalReviewStatus, context);
  const hasPublicIdentifier = studies.some(study => Boolean(study.pmid || study.doi || study.url || study.source));
  const notes = uniqueEvidenceLadderRefs([
    !studies.length && context.reviewRequired !== false ? "No source-linked evidence refs on this finding." : "",
    studies.length && !severityBearingStudies.length ? "Linked studies are context-only and not severity-bearing." : "",
    professionalReviewStatus === "pending" ? "Pending professional review." : "",
    context.calculationBearing ? "Calculation-bearing evidence." : "",
  ]);
  return {
    evidenceRefs: uniqueEvidenceLadderRefs(evidenceRefs),
    tiersPresent: tierKeysPresent,
    strongestTier: strongestTierKey,
    sourceLinked,
    hasPublicIdentifier,
    professionalReviewStatus,
    mechanisticConfidence,
    clinicalActionConfidence,
    notes,
    studyCount: studies.length,
    severityBearingStudyCount: severityBearingStudies.length,
    contextOnlyStudyCount: studies.length - severityBearingStudies.length,
    publicIdentifiers: uniqueEvidenceLadderRefs(studies.flatMap(study => [
      study.pmid ? `PMID:${study.pmid}` : "",
      study.doi ? `DOI:${study.doi}` : "",
      study.url ? "URL" : "",
    ])),
  };
}

function classifyMechanisticConfidence(evidenceRefsOrStudies = [], supportingSignals = {}) {
  const studies = evidenceRefsOrStudies.map(item =>
    typeof item === "string" ? STUDY_DB?.[item] : item
  ).filter(Boolean);
  const types = new Set(studies.map(study => study.type));
  if (
    types.has(EVIDENCE_TIER.FDA_LABEL) ||
    types.has(EVIDENCE_TIER.GUIDELINE) ||
    types.has(EVIDENCE_TIER.META_ANALYSIS) ||
    types.has(EVIDENCE_TIER.RCT) ||
    types.has(EVIDENCE_TIER.CLINICAL_PK)
  ) return "high";
  if (studies.length >= 2 || types.has(EVIDENCE_TIER.OBSERVATIONAL) || types.has(EVIDENCE_TIER.CASE_REPORT) || supportingSignals.pathwayLinked) return "moderate";
  if (types.has(EVIDENCE_TIER.IN_VITRO) || types.has(EVIDENCE_TIER.ANIMAL) || types.has(EVIDENCE_TIER.REVIEW) || supportingSignals.modelOnly) return "low";
  return "unknown";
}

function classifyClinicalActionConfidence(evidenceRefsOrStudies = [], reviewStatus = "unknown", context = {}) {
  const studies = evidenceRefsOrStudies.map(item =>
    typeof item === "string" ? STUDY_DB?.[item] : item
  ).filter(Boolean);
  if (reviewStatus === "reviewed") return "reviewed";
  if (studies.length || context.sourceLinked || context.reviewRequired === true) return "pending_review";
  return "insufficient";
}

function summarizeEvidenceLadder(ladder) {
  if (!ladder) return "Evidence: unknown";
  const tier = ladder.strongestTier && ladder.strongestTier !== "unknown"
    ? evidenceTierLabel(ladder.strongestTier)
    : "no linked source tier";
  const count = ladder.studyCount ? `${ladder.studyCount} source${ladder.studyCount === 1 ? "" : "s"}` : "no linked sources";
  const review = ladder.professionalReviewStatus === "reviewed"
    ? "professionally reviewed"
    : ladder.professionalReviewStatus === "pending"
    ? "pending professional review"
    : "review status unknown";
  return `${tier} · ${count} · mechanistic ${ladder.mechanisticConfidence || "unknown"} · ${review}`;
}

function attachEvidenceLaddersToFindings(findings = []) {
  return (findings || []).map(finding => {
    if (finding.evidenceLadder) return finding;
    const studies = uniqueEvidenceLadderRefs((finding.evidenceRefs || []).map(ref => STUDY_DB?.[ref]).filter(Boolean), study => study.id);
    const supportingSignals = {
      pathwayLinked: (finding.affectedActors || []).some(actor => ["enzyme", "pathway", "transporter"].includes(actor.type)),
      modelOnly: !(finding.evidenceRefs || []).length,
    };
    const ladder = computeEvidenceLadder(finding.evidenceRefs || [], {
      studies,
      supportingSignals,
      reviewRequired: finding.reviewRequired,
      calculationBearing: ["known_ddi", "interaction_engine", "active_moiety_engine", "phenoconversion_engine", "timeline_engine", "multiple_engines"].includes(finding.source),
      sourceLinked: Boolean((finding.evidenceRefs || []).length),
    });
    return {
      ...finding,
      evidenceLadder: ladder,
      evidenceStatus: summarizeEvidenceLadder(ladder),
    };
  });
}

function buildEvidenceTierPresence(studies = []) {
  const presence = {};
  for (const key of EVIDENCE_LADDER_TIER_KEYS) presence[key] = false;
  for (const study of studies || []) {
    const key = evidenceTierKey(study?.type);
    if (key && key !== "unknown") presence[key] = true;
  }
  return presence;
}

function strongestEvidenceStudy(studies = []) {
  return (studies || []).reduce((best, study) => {
    if (!study) return best;
    if (!best) return study;
    return (EVIDENCE_WEIGHT?.[study.type] || 0) > (EVIDENCE_WEIGHT?.[best.type] || 0) ? study : best;
  }, null);
}

function classifyProfessionalReviewStatus(studies = [], explicitStatus = "") {
  const status = String(explicitStatus || "").toLowerCase();
  if (["reviewed", "professional_reviewed", "clinician_reviewed"].includes(status)) return "reviewed";
  if (["pending", "pending_review", "review_required"].includes(status)) return "pending";
  if ((studies || []).some(study =>
    study?.professionalReviewed === true ||
    study?.clinicalReviewed === true ||
    ["reviewed", "professional_reviewed", "clinician_reviewed"].includes(study?.reviewStatus)
  )) return "reviewed";
  if ((studies || []).length) return "pending";
  return "unknown";
}

function evidenceTierKey(type) {
  const value = String(type || "").toUpperCase();
  if (!value) return "unknown";
  if (EVIDENCE_LADDER_TIER_KEYS.includes(value)) return value;
  const matched = EVIDENCE_LADDER_TIER_KEYS.find(key => EVIDENCE_TIER?.[key] === type);
  return matched || "unknown";
}

function evidenceTierLabel(key) {
  return String(key || "unknown").replace(/_/g, " ").toLowerCase();
}

function uniqueEvidenceLadderRefs(values = [], keyFn = value => String(value || "")) {
  const seen = new Set();
  const out = [];
  for (const value of values || []) {
    if (!value) continue;
    const key = keyFn(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}
