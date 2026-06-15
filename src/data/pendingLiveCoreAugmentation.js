// MedCheck Engine - live pending core augmentation
// Promotes missing source-linked core candidates into live app tables.

const PENDING_LIVE_CORE_AUGMENTATION = (() => {
  const data = typeof PENDING_CORE_ENRICHMENT !== "undefined" ? PENDING_CORE_ENRICHMENT : null;
  const summary = {
    schema:"diognosis.pending-live-core-augmentation.v1",
    sourceSchema:data?.schema || "missing",
    professionalReviewStatus:"pending",
    professionallyReviewed:false,
    drugsAdded:0,
    sourceDrugNameCandidatesAdded:0,
    studyEntriesAdded:0,
    interactionPairsAdded:0,
    metaboliteEntriesAdded:0,
    metaboliteParentsAdded:0,
    pkProfilesAdded:0,
    pkProfileSignalsAttached:0,
    pgxGenesAdded:0,
    pgxEvidencePairsAdded:0,
    phenotypeProfilesAdded:0,
    phenotypeSignalsAttached:0,
    beersFlagsAdded:0,
    beersSignalsAttached:0,
    washoutRulesAdded:0,
    washoutSignalsAttached:0,
    canAffectScoring:true,
    canAffectPublicSeverity:false,
    addedDrugNames:[],
    addedInteractionPairs:[],
    addedMetaboliteParents:[],
  };

  if (!data) return summary;
  promotePendingDrugCandidates(data.drugCandidates || [], summary);
  promoteSourceDrugNameCandidates(
    typeof SOURCE_DRUG_NAME_CANDIDATES === "undefined" ? [] : SOURCE_DRUG_NAME_CANDIDATES.candidates || [],
    summary
  );
  promotePendingStudyCandidates(data.studyCandidates || [], summary);
  promotePendingPgxCandidates(data.pgxCandidates || [], summary);
  promotePendingPkCandidates(data.pkCandidates || [], summary);
  promotePendingPhenotypeCandidates(data.receptorPhenotypeCandidates || [], summary);
  promotePendingBeersCandidates(data.beersCandidates || [], summary);
  promotePendingWashoutCandidates(data.washoutCandidates || [], summary);
  promotePendingInteractionCandidates(data.interactionCandidates || [], summary);
  promotePendingMetaboliteCandidates(data.metaboliteCandidates || [], summary);
  return summary;
})();

function promotePendingDrugCandidates(candidates = [], summary) {
  const existing = new Set((DRUG_DB || []).map(drug => pendingLiveCoreKey(drug.name)));
  for (const candidate of candidates || []) {
    const name = String(candidate.name || candidate.knownDrugName || "").trim();
    const key = pendingLiveCoreKey(name);
    if (!name || existing.has(key)) continue;
    const drug = pendingLiveDrugFromCandidate(candidate);
    DRUG_DB.push(drug);
    existing.add(key);
    summary.drugsAdded += 1;
    summary.addedDrugNames.push(name);
  }
}

function promoteSourceDrugNameCandidates(candidates = [], summary) {
  const existing = new Set((DRUG_DB || []).map(drug => pendingLiveCoreKey(drug.name)));
  for (const candidate of candidates || []) {
    const name = String(candidate.name || "").trim();
    const key = pendingLiveCoreKey(name);
    if (!name || existing.has(key)) continue;
    const drug = pendingLiveDrugFromSourceNameCandidate(candidate);
    DRUG_DB.push(drug);
    existing.add(key);
    summary.drugsAdded += 1;
    summary.sourceDrugNameCandidatesAdded += 1;
    summary.addedDrugNames.push(name);
  }
}

function promotePendingInteractionCandidates(candidates = [], summary) {
  const existing = new Set((KNOWN_DDI || []).map(pendingLiveDdiKey));
  for (const candidate of candidates || []) {
    const drug1 = candidate.drug1 || candidate.drugs?.[0] || "";
    const drug2 = candidate.drug2 || candidate.drugs?.[1] || "";
    if (!drug1 || !drug2) continue;
    const key = pendingLiveDdiKey({ drug1, drug2 });
    if (existing.has(key)) continue;
    KNOWN_DDI.push(pendingLiveInteractionFromCandidate(candidate));
    existing.add(key);
    summary.interactionPairsAdded += 1;
    summary.addedInteractionPairs.push(`${drug1} + ${drug2}`);
  }
}

function promotePendingStudyCandidates(candidates = [], summary) {
  if (typeof STUDY_DB === "undefined") return;
  for (const candidate of candidates || []) {
    const id = pendingLiveStudyId(candidate);
    if (!id || STUDY_DB[id]) continue;
    STUDY_DB[id] = pendingLiveStudyFromCandidate(candidate, id);
    summary.studyEntriesAdded += 1;
  }
}

function promotePendingMetaboliteCandidates(candidates = [], summary) {
  const previousParents = new Set(Object.keys(METAB || {}));
  for (const candidate of candidates || []) {
    const parent = pendingLiveInferMetaboliteParent(candidate);
    const metaboliteName = String(candidate.metaboliteName || "").trim();
    if (!parent || !metaboliteName) continue;
    pendingLiveEnsureDrugParent(parent, candidate, summary);
    if (!METAB[parent]) METAB[parent] = [];
    METAB[parent].push(pendingLiveMetaboliteFromCandidate(candidate));
    summary.metaboliteEntriesAdded += 1;
  }
  const nextParents = Object.keys(METAB || {});
  summary.addedMetaboliteParents = nextParents.filter(parent => !previousParents.has(parent));
  summary.metaboliteParentsAdded = summary.addedMetaboliteParents.length;
}

function promotePendingPkCandidates(candidates = [], summary) {
  if (typeof PK_PARAMS === "undefined") return;
  const existingKeyByCore = new Map(Object.keys(PK_PARAMS || {}).map(key => [pendingLiveCoreKey(key), key]));
  for (const candidate of candidates || []) {
    const drugName = pendingLivePrimaryDrugName(candidate);
    if (!drugName) continue;
    const key = pendingLiveGraphKey(drugName);
    if (!key) continue;
    const existingKey = existingKeyByCore.get(pendingLiveCoreKey(key));
    if (existingKey) {
      if (pendingLiveAttachSourceSignal(PK_PARAMS[existingKey], candidate, "pk")) {
        summary.pkProfileSignalsAttached += 1;
      }
      continue;
    }
    PK_PARAMS[key] = pendingLivePkProfileFromCandidate(candidate, drugName);
    existingKeyByCore.set(pendingLiveCoreKey(key), key);
    summary.pkProfilesAdded += 1;
  }
}

function promotePendingPgxCandidates(candidates = [], summary) {
  if (typeof PHARMGKB_EVIDENCE === "undefined") return;
  const existingGenes = new Set([
    ...Object.keys(PHARMGKB_EVIDENCE || {}),
    ...((typeof GENE_ENZYMES === "undefined" ? [] : GENE_ENZYMES) || []),
  ].map(gene => String(gene || "").toUpperCase()));

  for (const candidate of candidates || []) {
    const genes = uniquePendingLiveValues(candidate.genes || []);
    const drugName = pendingLivePrimaryDrugName(candidate);
    if (!genes.length) continue;
    for (const gene of genes) {
      const geneKey = String(gene || "").trim();
      if (!geneKey) continue;
      if (!PHARMGKB_EVIDENCE[geneKey]) {
        PHARMGKB_EVIDENCE[geneKey] = {
          grade:"pending",
          guideline:candidate.sourceName || candidate.sourceKey || "Pending source",
          pairs:[],
          pendingSourceSignal:true,
          reviewRequired:true,
          professionalReviewStatus:"pending",
          professionallyReviewed:false,
          canAffectPublicSeverity:false,
          canBeUsedForClinicalAction:false,
        };
      }
      if (typeof GENE_ENZYMES !== "undefined" && !GENE_ENZYMES.some(value => String(value || "").toUpperCase() === geneKey.toUpperCase())) {
        GENE_ENZYMES.push(geneKey);
      }
      if (!existingGenes.has(geneKey.toUpperCase())) {
        summary.pgxGenesAdded += 1;
        existingGenes.add(geneKey.toUpperCase());
      }
      if (!drugName) continue;
      const pairs = PHARMGKB_EVIDENCE[geneKey].pairs || (PHARMGKB_EVIDENCE[geneKey].pairs = []);
      if (pairs.some(pair => pendingLiveCoreKey(pair.drug) === pendingLiveCoreKey(drugName))) continue;
      const evidenceRef = pendingLiveEnsureEvidenceStudy(candidate, "pgx");
      pairs.push({
        drug:drugName,
        level:"pending",
        action:pendingLiveShortSummary(candidate, `Pending source-linked PGx signal for ${geneKey} and ${drugName}.`),
        evidenceRefs:evidenceRef ? [evidenceRef] : [],
        sourceRecordIds:candidate.sourceRecordIds || [],
        pendingSourceSignal:true,
        reviewRequired:true,
        professionalReviewStatus:"pending",
        professionallyReviewed:false,
        experimentalOnly:true,
        canAffectPublicSeverity:false,
        canBeUsedForClinicalAction:false,
      });
      summary.pgxEvidencePairsAdded += 1;
    }
  }
}

function promotePendingPhenotypeCandidates(candidates = [], summary) {
  if (typeof PHENOTYPE_SCORES === "undefined") return;
  const existingKeyByCore = new Map(Object.keys(PHENOTYPE_SCORES || {}).map(key => [pendingLiveCoreKey(key), key]));
  for (const candidate of candidates || []) {
    const drugName = pendingLivePrimaryDrugName(candidate);
    if (!drugName) continue;
    const key = pendingLiveGraphKey(drugName);
    if (!key) continue;
    const existingKey = existingKeyByCore.get(pendingLiveCoreKey(key));
    if (existingKey) {
      if (pendingLiveAttachSourceSignal(PHENOTYPE_SCORES[existingKey], candidate, "phenotype")) {
        summary.phenotypeSignalsAttached += 1;
      }
      continue;
    }
    PHENOTYPE_SCORES[key] = pendingLivePhenotypeScoreFromCandidate(candidate);
    existingKeyByCore.set(pendingLiveCoreKey(key), key);
    summary.phenotypeProfilesAdded += 1;
  }
}

function promotePendingBeersCandidates(candidates = [], summary) {
  if (typeof BEERS_FLAGS === "undefined") return;
  const existingKeyByCore = new Map(Object.keys(BEERS_FLAGS || {}).map(key => [pendingLiveCoreKey(key), key]));
  for (const candidate of candidates || []) {
    const drugName = pendingLivePrimaryDrugName(candidate);
    if (!drugName) continue;
    const key = pendingLiveGraphKey(drugName);
    if (!key) continue;
    const existingKey = existingKeyByCore.get(pendingLiveCoreKey(key));
    if (existingKey) {
      if (pendingLiveAttachSourceSignal(BEERS_FLAGS[existingKey], candidate, "beers")) {
        summary.beersSignalsAttached += 1;
      }
      continue;
    }
    const evidenceRef = pendingLiveEnsureEvidenceStudy(candidate, "beers");
    BEERS_FLAGS[key] = {
      concern:pendingLiveShortSummary(candidate, `Pending source-linked older-adult caution candidate for ${drugName}.`),
      avoid:"pending_source_review",
      evidenceRefs:evidenceRef ? [evidenceRef] : [],
      sourceRecordIds:candidate.sourceRecordIds || [],
      pendingSourceSignal:true,
      reviewRequired:true,
      professionalReviewStatus:"pending",
      professionallyReviewed:false,
      experimentalOnly:true,
      canAffectPublicSeverity:false,
      canBeUsedForClinicalAction:false,
    };
    existingKeyByCore.set(pendingLiveCoreKey(key), key);
    summary.beersFlagsAdded += 1;
  }
}

function promotePendingWashoutCandidates(candidates = [], summary) {
  if (typeof WASHOUT_DAYS === "undefined") return;
  const existingKeyByCore = new Map(Object.keys(WASHOUT_DAYS || {}).map(key => [pendingLiveCoreKey(key), key]));
  for (const candidate of candidates || []) {
    const drugName = pendingLivePrimaryDrugName(candidate);
    if (!drugName) continue;
    const key = pendingLiveGraphKey(drugName);
    if (!key) continue;
    const existingKey = existingKeyByCore.get(pendingLiveCoreKey(key));
    if (existingKey) {
      if (pendingLiveAttachSourceSignal(WASHOUT_DAYS[existingKey], candidate, "washout")) {
        summary.washoutSignalsAttached += 1;
      }
      continue;
    }
    const evidenceRef = pendingLiveEnsureEvidenceStudy(candidate, "washout");
    WASHOUT_DAYS[key] = {
      days:pendingLiveWashoutDays(candidate),
      mechanism:"pending_source_context",
      note:pendingLiveShortSummary(candidate, `Pending source-linked persistence or washout context for ${drugName}.`),
      evidenceRefs:evidenceRef ? [evidenceRef] : [],
      sourceRecordIds:candidate.sourceRecordIds || [],
      pendingSourceSignal:true,
      reviewRequired:true,
      professionalReviewStatus:"pending",
      professionallyReviewed:false,
      experimentalOnly:true,
      canAffectPublicSeverity:false,
      canBeUsedForClinicalAction:false,
    };
    existingKeyByCore.set(pendingLiveCoreKey(key), key);
    summary.washoutRulesAdded += 1;
  }
}

function pendingLiveDrugFromCandidate(candidate = {}) {
  const name = String(candidate.name || candidate.knownDrugName || "").trim();
  const genes = uniquePendingLiveValues(candidate.linkedGenes || candidate.genes || []);
  const pathways = uniquePendingLiveValues(candidate.linkedPathways || candidate.pathways || []);
  const sourceKeys = uniquePendingLiveValues(candidate.sourceKeys || [candidate.sourceKey]);
  const evidenceIdentifiers = uniquePendingLiveValues(candidate.evidenceIdentifiers || []);
  return {
    id:pendingLiveSlug(name),
    name,
    cls:"Pending Source Candidate",
    brandNames:[],
    hl:null,
    timing:"unknown",
    props:{ pendingSourceSignal:true },
    routes:genes.slice(0, 4).map(gene => ({
      enzyme:gene,
      fraction:0,
      evidence:{ confidence:"low", sources:sourceKeys.length ? sourceKeys : ["pending source"] },
      pendingSourceSignal:true,
    })),
    inh:[],
    ind:[],
    alts:[],
    sourceRecordIds:candidate.sourceRecordIds || [],
    evidenceIdentifiers,
    sourceKeys,
    linkedGenes:genes,
    linkedPathways:pathways,
    note:candidate.summary || `${name} was added from pending source-linked enrichment as a searchable live substance.`,
    reviewRequired:true,
    professionalReviewStatus:"pending",
    professionallyReviewed:false,
    pendingSourceSignal:true,
    experimentalOnly:true,
    canAffectScoring:true,
    canAffectPublicSeverity:false,
    canBeUsedForClinicalAction:false,
  };
}

function pendingLiveDrugFromSourceNameCandidate(candidate = {}) {
  const name = String(candidate.name || "").trim();
  const sourceNames = uniquePendingLiveValues(candidate.sourceNames || []);
  const evidenceIdentifiers = uniquePendingLiveValues(candidate.evidenceIdentifiers || []);
  return {
    id:pendingLiveSlug(name),
    name,
    cls:"Pending Source Substance",
    brandNames:[],
    hl:null,
    timing:"unknown",
    props:{ pendingSourceSignal:true },
    routes:[],
    inh:[],
    ind:[],
    alts:[],
    sourceRecordIds:candidate.sourceObjectIds || [],
    evidenceIdentifiers,
    sourceKeys:sourceNames,
    sourceFiles:candidate.sourceFiles || [],
    observationCount:candidate.observationCount || 0,
    note:`${name} was added from cached source drug-name candidates as a searchable live pending substance.`,
    reviewRequired:true,
    professionalReviewStatus:"pending",
    professionallyReviewed:false,
    pendingSourceSignal:true,
    sourceDrugNameCandidate:true,
    experimentalOnly:true,
    canAffectScoring:true,
    canAffectPublicSeverity:false,
    canBeUsedForClinicalAction:false,
  };
}

function pendingLiveStudyFromCandidate(candidate = {}, id) {
  const identifiers = uniquePendingLiveValues(candidate.evidenceIdentifiers || []);
  const pmid = pendingLiveIdentifierValue(identifiers, /PMID:?(\d+)/i);
  const doi = pendingLiveIdentifierValue(identifiers, /DOI:?([^\s]+)/i);
  const url = candidate.sourceUrl || identifiers.find(value => /^https?:\/\//i.test(value)) || "";
  const supports = uniquePendingLiveValues([
    candidate.id,
    candidate.sourceRecordId,
    ...(candidate.sourceRecordIds || []),
    ...(candidate.drugs || []),
    ...(candidate.genes || []),
    ...(candidate.metabolites || []),
    ...(candidate.pathways || []),
    ...(candidate.phenotypes || []),
  ].filter(Boolean).map(pendingLiveCoreKey));
  return {
    id,
    type:pendingLiveEvidenceTier(candidate),
    title:candidate.title || `Pending source context: ${pendingLivePrimaryDrugName(candidate) || candidate.genes?.[0] || candidate.sourceName || id}`,
    source:candidate.sourceName || candidate.sourceKey || "pending source",
    url,
    pmid,
    doi,
    supports,
    studyDesign:candidate.evidenceType || candidate.claimType || "pending_source_context",
    summary:candidate.summary || "Pending source-linked evidence context.",
    limitations:[
      "Source-linked pending live augmentation row",
      "Context-only; not public-severity-bearing",
      "Professional review pending",
    ],
    sourceRecordId:candidate.sourceRecordId,
    sourceRecordIds:candidate.sourceRecordIds || [],
    sourceCategory:SOURCE_CATEGORY.EXTERNAL_CONTEXT,
    importedContextOnly:true,
    notSeverityBearing:true,
    pendingSourceSignal:true,
    sourceLinked:true,
    livePendingReview:true,
    reviewRequired:true,
    reviewDecision:REVIEW_DECISION.UNREVIEWED,
    professionalReviewed:false,
    reviewStatus:"pending",
    professionalReviewStatus:"pending",
    experimentalOnly:true,
    canAffectScoring:false,
    canAffectPublicSeverity:false,
    canBeUsedForClinicalAction:false,
  };
}

function pendingLiveInteractionFromCandidate(candidate = {}) {
  const drug1 = candidate.drug1 || candidate.drugs?.[0] || "";
  const drug2 = candidate.drug2 || candidate.drugs?.[1] || "";
  const evidenceRef = pendingLiveEnsureEvidenceStudy(candidate, "interaction");
  return {
    drug1,
    drug2,
    severity:"mild",
    rawSeverity:candidate.publicSeverity || candidate.suggestedSeverity || "pending_unrated",
    category:"pending_source",
    mechanism:candidate.summary || `Pending source-linked interaction candidate for ${drug1} + ${drug2}.`,
    effect:"Pending source-linked interaction context; review before clinical use.",
    evidence:{
      confidence:"low",
      sources:uniquePendingLiveValues([candidate.sourceName, candidate.sourceKey]).filter(Boolean),
      pendingSourceSignal:true,
    },
    evidenceRefs:evidenceRef ? [evidenceRef] : [],
    sourceRecordIds:candidate.sourceRecordIds || [],
    sourceName:candidate.sourceName || candidate.sourceKey || "pending source",
    genes:candidate.genes || [],
    reviewRequired:true,
    professionalReviewStatus:"pending",
    professionallyReviewed:false,
    pendingSourceSignal:true,
    experimentalOnly:true,
    canAffectPublicSeverity:false,
    canBeUsedForClinicalAction:false,
  };
}

function pendingLivePkProfileFromCandidate(candidate = {}, drugName = "") {
  const evidenceRef = pendingLiveEnsureEvidenceStudy(candidate, "pk");
  const halfLife = pendingLiveNumericField(candidate, ["halfLife", "half_life", "halfLifeHours", "half_life_hours"]) || 24;
  const dose = pendingLiveNumericField(candidate, ["dose_mg", "doseMg", "dose"]) || 1;
  return {
    F:pendingLiveNumericField(candidate, ["F", "bioavailability"]) || 0.5,
    ka:pkKaFromTmax(2, halfLife),
    halfLife,
    Vd:pendingLiveNumericField(candidate, ["Vd", "vd"]) || 1,
    dose_mg:dose,
    note:pendingLiveShortSummary(candidate, `Pending source-linked PK profile for ${drugName}; absolute numeric extraction was not available, so the profile uses conservative relative-fallback defaults.`),
    sourceRecordIds:candidate.sourceRecordIds || [],
    evidenceRefs:evidenceRef ? [evidenceRef] : [],
    pendingSourceSignal:true,
    reviewRequired:true,
    professionalReviewStatus:"pending",
    professionallyReviewed:false,
    experimentalOnly:true,
    numericExtractionStatus:candidate.numericExtractionStatus || "pending_source_fallback",
    canAffectPublicSeverity:false,
    canBeUsedForClinicalAction:false,
  };
}

function pendingLivePhenotypeScoreFromCandidate(candidate = {}) {
  const text = pendingLiveCandidateText(candidate);
  const score = {
    serotonin:/seroton|sert|ssri|snri|mao|venlafaxine|duloxetine|tramadol|linezolid/i.test(text) ? 1 : 0,
    qtc:/qt|qtc|herg|torsade|arrhythm|haloperidol|ziprasidone|amiodarone/i.test(text) ? 1 : 0,
    anticholinergic:/anticholin|muscarinic|m1|deliri|oxybutynin|amitriptyline/i.test(text) ? 1 : 0,
    sedation:/sedat|somnol|sleep|cns|gaba|opioid|benzodiazepine|adverse effect/i.test(text) ? 1 : 0,
    fall_risk:/fall|orthostat|hypoten|elder|older|sedat|dizziness/i.test(text) ? 1 : 0,
  };
  if (!Object.values(score).some(Boolean)) {
    score.sedation = 1;
    score.fall_risk = 1;
  }
  return {
    ...score,
    pendingSourceSignal:true,
    reviewRequired:true,
    professionalReviewStatus:"pending",
    professionallyReviewed:false,
    experimentalOnly:true,
    canAffectPublicSeverity:false,
    canBeUsedForClinicalAction:false,
  };
}

function pendingLiveMetaboliteFromCandidate(candidate = {}) {
  const genes = uniquePendingLiveValues(candidate.genes || []);
  const pathways = uniquePendingLiveValues(candidate.pathways || []);
  const enzyme = genes[0] || pathways[0] || "pending_source";
  const evidenceRef = pendingLiveEnsureEvidenceStudy(candidate, "metabolite");
  return {
    n:candidate.metaboliteName,
    e:enzyme,
    a:"pending_unclassified",
    role:candidate.role || "pending_unclassified",
    p:0,
    note:candidate.summary || "Pending source-linked metabolite candidate added to live metabolite map.",
    sourceRecordIds:candidate.sourceRecordIds || [],
    evidenceRefs:evidenceRef ? [evidenceRef] : [],
    evidenceIdentifiers:uniquePendingLiveValues(candidate.evidenceIdentifiers || []),
    sourceName:candidate.sourceName || candidate.sourceKey || "pending source",
    pendingSourceSignal:true,
    reviewRequired:true,
    professionalReviewStatus:"pending",
    professionallyReviewed:false,
    experimentalOnly:true,
    canAffectPublicSeverity:false,
    canBeUsedForClinicalAction:false,
  };
}

function pendingLiveEnsureEvidenceStudy(candidate = {}, kind = "source") {
  if (typeof STUDY_DB === "undefined") return "";
  const id = `pending_live_core_${kind}_${pendingLiveSlug(candidate.id || candidate.sourceRecordId || candidate.title || kind)}`;
  if (STUDY_DB[id]) return id;
  const identifiers = uniquePendingLiveValues(candidate.evidenceIdentifiers || []);
  const pmid = identifiers.map(value => String(value).match(/PMID:?(\d+)/i)?.[1]).find(Boolean) || null;
  const doi = identifiers.map(value => String(value).match(/DOI:?([^\s]+)/i)?.[1]).find(Boolean) || null;
  const url = candidate.sourceUrl || identifiers.find(value => /^https?:\/\//i.test(value)) || "";
  STUDY_DB[id] = {
    id,
    type:pendingLiveEvidenceTier(candidate),
    title:candidate.title || `Pending live ${kind} source: ${candidate.parentDrug || candidate.drug1 || candidate.name || candidate.gene || candidate.id || "source"}`,
    source:candidate.sourceName || candidate.sourceKey || "pending source",
    url,
    pmid,
    doi,
    supports:uniquePendingLiveValues([
      candidate.id,
      candidate.sourceRecordId,
      ...(candidate.sourceRecordIds || []),
      candidate.name,
      candidate.parentDrug,
      candidate.metaboliteName,
      candidate.drug,
      candidate.drug1,
      candidate.drug2,
      ...(candidate.drugs || []),
      candidate.gene,
      ...(candidate.genes || []),
      ...(candidate.pathways || []),
    ].filter(Boolean).map(pendingLiveCoreKey)),
    studyDesign:candidate.claimType || `${kind}_pending_source`,
    summary:candidate.summary || "Pending source-linked live core augmentation evidence.",
    limitations:[
      "Source-linked pending live augmentation row",
      "Context-only; not public-severity-bearing",
    ],
    sourceRecordId:candidate.sourceRecordId,
    sourceRecordIds:candidate.sourceRecordIds || [],
    sourceCategory:SOURCE_CATEGORY.EXTERNAL_CONTEXT,
    importedContextOnly:true,
    notSeverityBearing:true,
    pendingSourceSignal:true,
    sourceLinked:true,
    reviewRequired:true,
    reviewDecision:REVIEW_DECISION.UNREVIEWED,
    professionalReviewed:false,
    reviewStatus:"pending",
    professionalReviewStatus:"pending",
    experimentalOnly:true,
    canAffectScoring:false,
    canAffectPublicSeverity:false,
    canBeUsedForClinicalAction:false,
  };
  return id;
}

function pendingLiveEvidenceTier(candidate = {}) {
  const text = `${candidate.strongestExternalTier || ""} ${candidate.sourceName || ""} ${candidate.claimType || ""}`.toLowerCase();
  if (/fda|label|dailymed/.test(text)) return EVIDENCE_TIER.FDA_LABEL;
  if (/cpic|guideline|guidance/.test(text)) return EVIDENCE_TIER.GUIDELINE;
  if (/meta[_\s-]?analysis|systematic/.test(text)) return EVIDENCE_TIER.META_ANALYSIS;
  if (/\brct\b|randomized|trial/.test(text)) return EVIDENCE_TIER.RCT;
  if (/clinical[_\s-]?pk|pharmacokinetic/.test(text)) return EVIDENCE_TIER.CLINICAL_PK;
  if (/observational|cohort|case/.test(text)) return EVIDENCE_TIER.OBSERVATIONAL;
  return EVIDENCE_TIER.REVIEW;
}

function pendingLiveStudyId(candidate = {}) {
  const raw = String(candidate.id || candidate.sourceRecordId || candidate.title || "").trim();
  return raw ? pendingLiveSlug(raw) : "";
}

function pendingLiveIdentifierValue(values = [], pattern) {
  return (values || []).map(value => String(value || "").match(pattern)?.[1]).find(Boolean) || null;
}

function pendingLivePrimaryDrugName(candidate = {}) {
  const explicit = uniquePendingLiveValues([
    candidate.drug,
    candidate.name,
    candidate.knownDrugName,
    candidate.parentDrug,
    ...(candidate.drugs || []),
  ]).find(value => value && !/^pending[_\s-]/i.test(value));
  if (explicit) return pendingLiveCanonicalDrugName(explicit);
  return pendingLiveInferDrugName(candidate);
}

function pendingLiveCanonicalDrugName(value) {
  const key = pendingLiveCoreKey(value);
  const drug = (DRUG_DB || []).find(row => pendingLiveCoreKey(row.name) === key);
  return drug?.name || String(value || "").trim();
}

function pendingLiveInferDrugName(candidate = {}) {
  const sourceText = pendingLiveCandidateText(candidate);
  const matches = (DRUG_DB || [])
    .map(drug => ({ name:drug.name, key:pendingLiveCoreKey(drug.name) }))
    .filter(row => row.name && row.key && row.key.length > 2 && sourceText.includes(row.key))
    .sort((a, b) => b.key.length - a.key.length || a.name.localeCompare(b.name));
  return matches[0]?.name || "";
}

function pendingLiveCandidateText(candidate = {}) {
  return pendingLiveCoreKey([
    candidate.id,
    candidate.sourceRecordId,
    ...(candidate.sourceRecordIds || []),
    candidate.title,
    candidate.summary,
    ...(candidate.drugs || []),
    ...(candidate.genes || []),
    ...(candidate.metabolites || []),
    ...(candidate.pathways || []),
    ...(candidate.phenotypes || []),
  ].filter(Boolean).join(" "));
}

function pendingLiveNumericField(candidate = {}, keys = []) {
  for (const key of keys) {
    const raw = candidate[key];
    const value = Number(raw);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function pendingLiveWashoutDays(candidate = {}) {
  const text = pendingLiveCandidateText(candidate);
  if (/irreversible|mao|induction|inducer|rifampin|carbamazepine|phenytoin/.test(text)) return 14;
  if (/amiodarone/.test(text)) return 90;
  if (/fluoxetine|norfluoxetine/.test(text)) return 35;
  if (/half life|half-life|clearance|persistence|offset/.test(text)) return 7;
  return 3;
}

function pendingLiveShortSummary(candidate = {}, fallback = "") {
  const value = String(candidate.summary || fallback || "").trim();
  return value.length > 360 ? `${value.slice(0, 357)}...` : value;
}

function pendingLiveAttachSourceSignal(target, candidate = {}, kind = "source") {
  if (!target || typeof target !== "object") return false;
  const sourceId = candidate.sourceRecordId || candidate.id || "";
  target.pendingSourceSignal = true;
  target.reviewRequired = true;
  target.professionalReviewStatus = "pending";
  target.professionallyReviewed = false;
  target.canAffectPublicSeverity = false;
  target.canBeUsedForClinicalAction = false;
  const evidenceRef = pendingLiveEnsureEvidenceStudy(candidate, kind);
  if (evidenceRef) {
    target.evidenceRefs = uniquePendingLiveValues([...(target.evidenceRefs || []), evidenceRef]);
  }
  if (sourceId) {
    target.sourceRecordIds = uniquePendingLiveValues([...(target.sourceRecordIds || []), sourceId, ...(candidate.sourceRecordIds || [])]);
  }
  target.pendingSourceSignals = target.pendingSourceSignals || [];
  if (sourceId && target.pendingSourceSignals.some(signal => signal.sourceRecordId === sourceId)) return false;
  target.pendingSourceSignals.push({
    sourceRecordId:sourceId,
    sourceName:candidate.sourceName || candidate.sourceKey || "pending source",
    sourceUrl:candidate.sourceUrl || "",
    summary:pendingLiveShortSummary(candidate, "Pending source-linked context attached to an existing live row."),
    professionalReviewStatus:"pending",
    professionallyReviewed:false,
    canAffectPublicSeverity:false,
  });
  return true;
}

function pendingLiveInferMetaboliteParent(candidate = {}) {
  const explicit = String(candidate.parentDrug || candidate.drugs?.[0] || "").trim();
  if (explicit) return explicit;
  const sourceText = pendingLiveCoreKey([
    candidate.id,
    candidate.sourceRecordId,
    ...(candidate.sourceRecordIds || []),
    candidate.title,
    candidate.summary,
  ].filter(Boolean).join(" "));
  const matches = (DRUG_DB || [])
    .map(drug => ({ name:drug.name, key:pendingLiveCoreKey(drug.name) }))
    .filter(row => row.name && row.key && row.key.length > 2 && sourceText.includes(row.key))
    .sort((a, b) => b.key.length - a.key.length || a.name.localeCompare(b.name));
  const gene = uniquePendingLiveValues(candidate.genes || [])[0] || "";
  return matches[0]?.name || (gene ? `Pending ${gene} Metabolite Source` : "");
}

function pendingLiveEnsureDrugParent(parent, candidate = {}, summary) {
  const key = pendingLiveCoreKey(parent);
  if (!key || (DRUG_DB || []).some(drug => pendingLiveCoreKey(drug.name) === key)) return;
  const genes = uniquePendingLiveValues(candidate.genes || []);
  DRUG_DB.push({
    id:pendingLiveSlug(parent),
    name:parent,
    cls:"Pending Source Bucket",
    brandNames:[],
    hl:null,
    timing:"unknown",
    props:{ pendingSourceSignal:true },
    routes:genes.slice(0, 2).map(gene => ({
      enzyme:gene,
      fraction:0,
      evidence:{ confidence:"low", sources:[candidate.sourceName || candidate.sourceKey || "pending source"] },
      pendingSourceSignal:true,
    })),
    inh:[],
    ind:[],
    alts:[],
    sourceRecordIds:candidate.sourceRecordIds || [],
    note:`Source bucket for parentless pending metabolite candidates linked to ${genes.join(", ") || "an unclassified pathway"}.`,
    reviewRequired:true,
    professionalReviewStatus:"pending",
    professionallyReviewed:false,
    pendingSourceSignal:true,
    experimentalOnly:true,
    canAffectScoring:true,
    canAffectPublicSeverity:false,
    canBeUsedForClinicalAction:false,
  });
  if (summary) {
    summary.drugsAdded += 1;
    summary.addedDrugNames.push(parent);
  }
}

function pendingLiveDdiKey(row = {}) {
  return [row.drug1, row.drug2].map(pendingLiveCoreKey).sort().join("|");
}

function uniquePendingLiveValues(values = []) {
  return [...new Set((values || []).map(value => String(value || "").trim()).filter(Boolean))];
}

function pendingLiveCoreKey(value) {
  if (typeof normalizeDrugLookupKey === "function") return normalizeDrugLookupKey(value);
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function pendingLiveSlug(value) {
  return pendingLiveCoreKey(value).replace(/\s+/g, "_").slice(0, 120);
}

function pendingLiveGraphKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
}
