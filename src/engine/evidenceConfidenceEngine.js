// Diognosis — Evidence Confidence Ladder

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
  "MODELED_CONTEXT",
];

function computeEvidenceLadder(evidenceRefs = [], context = {}) {
  const studies = uniqueEvidenceLadderRefs([
    ...(context.studies || []),
    ...uniqueEvidenceLadderRefs(evidenceRefs).map(ref => typeof getStudy === "function" ? getStudy(ref) : STUDY_DB?.[ref]).filter(Boolean),
  ], study => study?.id || JSON.stringify(study));
  const severityBearingStudies = typeof getSeverityBearingStudies === "function"
    ? getSeverityBearingStudies(studies)
    : studies;
  const tierKeysPresent = buildEvidenceTierPresence(studies);
  const strongestStudy = strongestEvidenceStudy(studies);
  const strongestTierKey = strongestStudy ? evidenceTierKey(strongestStudy.type) : "unknown";
  const sourceLinked = studies.length > 0 || uniqueEvidenceLadderRefs(evidenceRefs).length > 0 || Boolean(context.inlineEvidence);
  const authorityStudies = studies.filter(study => typeof isAuthorityEvidence === "function" && isAuthorityEvidence(study));
  const primaryLiteratureStudies = studies.filter(study => typeof isPrimaryLiteratureEvidence === "function" && isPrimaryLiteratureEvidence(study));
  const modeledStudies = studies.filter(study => typeof isModeledContextEvidence === "function" && isModeledContextEvidence(study));
  const professionalReviewStatus = classifyProfessionalReviewStatus(studies, context.reviewStatus);
  const supportingSignals = context.supportingSignals || {};
  const mechanisticConfidence = classifyMechanisticConfidence(studies, supportingSignals);
  const clinicalActionConfidence = classifyClinicalActionConfidence(studies, professionalReviewStatus, context);
  const sourceSupportStatus = classifySourceSupportStatus(studies, professionalReviewStatus, context);
  const hasPublicIdentifier = studies.some(study => Boolean(study.pmid || study.doi || study.url));
  const notes = uniqueEvidenceLadderRefs([
    !studies.length && context.reviewRequired !== false ? "No source-linked evidence refs on this finding." : "",
    studies.length && !severityBearingStudies.length ? "Linked studies are context-only and not severity-bearing." : "",
    authorityStudies.length ? `${authorityStudies.length} authority source${authorityStudies.length === 1 ? "" : "s"}.` : "",
    modeledStudies.length && modeledStudies.length === studies.length ? "Modeled context only; not severity-bearing." : "",
    context.calculationBearing ? "Calculation-bearing evidence." : "",
  ]);
  return {
    evidenceRefs: uniqueEvidenceLadderRefs(evidenceRefs),
    tiersPresent: tierKeysPresent,
    strongestTier: strongestTierKey,
    sourceLinked,
    authorityLinked:authorityStudies.length > 0,
    primaryLiteratureLinked:primaryLiteratureStudies.length > 0,
    modeledOnly:studies.length > 0 && modeledStudies.length === studies.length,
    sourceSupportStatus,
    hasPublicIdentifier,
    professionalReviewStatus,
    mechanisticConfidence,
    clinicalActionConfidence,
    notes,
    studyCount: studies.length,
    authoritySourceCount:authorityStudies.length,
    primaryLiteratureCount:primaryLiteratureStudies.length,
    modeledContextCount:modeledStudies.length,
    severityBearingStudyCount: severityBearingStudies.length,
    contextOnlyStudyCount: studies.length - severityBearingStudies.length,
    publicIdentifiers: uniqueEvidenceLadderRefs(studies.flatMap(study => [
      study.pmid ? `PMID:${study.pmid}` : "",
      study.doi ? `DOI:${study.doi}` : "",
      study.url ? "URL" : "",
    ])),
  };
}

function classifySourceSupportStatus(studies = [], professionalReviewStatus = "unknown", context = {}) {
  const authorityLinked = studies.some(study => typeof isAuthorityEvidence === "function" && isAuthorityEvidence(study));
  const primaryLinked = studies.some(study => typeof isPrimaryLiteratureEvidence === "function" && isPrimaryLiteratureEvidence(study));
  const modeledOnly = studies.length > 0 && studies.every(study => typeof isModeledContextEvidence === "function" && isModeledContextEvidence(study));
  if (professionalReviewStatus === "reviewed" && authorityLinked) return "reviewed_authority_linked";
  if (authorityLinked) return "authority_linked";
  if (primaryLinked) return "primary_literature_linked";
  if (modeledOnly) return "modeled_context_only";
  if (studies.length) return "linked_source";
  if (context.supportingSignals?.modelOnly || context.reviewRequired === true) return "model_only_review_prompt";
  return "insufficient_source_support";
}

function sourceSupportStatusLabel(status) {
  const labels = {
    reviewed_authority_linked: "reviewed authority source",
    authority_linked: "authority-linked",
    primary_literature_linked: "primary-literature linked",
    linked_source: "linked source",
    modeled_context_only: "modeled context · not severity-bearing",
    model_only_review_prompt: "modeled review prompt",
    insufficient_source_support: "insufficient source support",
  };
  return labels[status] || "source status unknown";
}

function classifyMechanisticConfidence(evidenceRefsOrStudies = [], supportingSignals = {}) {
  const allStudies = evidenceRefsOrStudies.map(item =>
    typeof item === "string" ? (typeof getStudy === "function" ? getStudy(item) : STUDY_DB?.[item]) : item
  ).filter(Boolean);
  const studies = allStudies.filter(study => !(typeof isModeledContextEvidence === "function" && isModeledContextEvidence(study)));
  const types = new Set(studies.map(study => study.type));
  if (
    types.has(EVIDENCE_TIER.FDA_LABEL) ||
    types.has(EVIDENCE_TIER.GUIDELINE) ||
    types.has(EVIDENCE_TIER.META_ANALYSIS) ||
    types.has(EVIDENCE_TIER.RCT) ||
    types.has(EVIDENCE_TIER.CLINICAL_PK)
  ) return "high";
  if (studies.length >= 2 || types.has(EVIDENCE_TIER.OBSERVATIONAL) || types.has(EVIDENCE_TIER.CASE_REPORT) || supportingSignals.pathwayLinked) return "moderate";
  if (allStudies.length || types.has(EVIDENCE_TIER.IN_VITRO) || types.has(EVIDENCE_TIER.ANIMAL) || types.has(EVIDENCE_TIER.REVIEW) || supportingSignals.modelOnly) return "low";
  return "unknown";
}

function classifyClinicalActionConfidence(evidenceRefsOrStudies = [], reviewStatus = "unknown", context = {}) {
  const studies = evidenceRefsOrStudies.map(item =>
    typeof item === "string" ? (typeof getStudy === "function" ? getStudy(item) : STUDY_DB?.[item]) : item
  ).filter(Boolean);
  if (reviewStatus === "reviewed") return "reviewed";
  if (studies.some(study => typeof isAuthorityEvidence === "function" && isAuthorityEvidence(study))) return "authority_linked";
  if (studies.some(study => typeof isPrimaryLiteratureEvidence === "function" && isPrimaryLiteratureEvidence(study))) return "literature_linked";
  if (studies.length || context.sourceLinked || context.reviewRequired === true) return "modeled_or_linked_context";
  return "insufficient";
}

function summarizeEvidenceLadder(ladder) {
  if (!ladder) return "Evidence: unknown";
  const tier = ladder.strongestTier && ladder.strongestTier !== "unknown"
    ? evidenceTierLabel(ladder.strongestTier)
    : sourceSupportStatusLabel(ladder.sourceSupportStatus || "insufficient_source_support");
  const count = ladder.studyCount ? `${ladder.studyCount} source${ladder.studyCount === 1 ? "" : "s"}` : "no linked sources";
  const provenance = sourceSupportStatusLabel(ladder.sourceSupportStatus || "insufficient_source_support");
  return `${tier} · ${count} · mechanistic ${ladder.mechanisticConfidence || "unknown"} · ${provenance}`;
}

function attachEvidenceLaddersToFindings(findings = []) {
  return (findings || []).map(finding => {
    if (finding.evidenceLadder) return finding;
    const studies = uniqueEvidenceLadderRefs((finding.evidenceRefs || []).map(ref => typeof getStudy === "function" ? getStudy(ref) : STUDY_DB?.[ref]).filter(Boolean), study => study.id);
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
  if (["pending", "review_required", "no_signoff", "not_signed_off"].includes(status)) return "pending";
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
