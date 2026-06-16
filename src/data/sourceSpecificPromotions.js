// Diognosis - source-specific promotion layer
// Promotes source-backed rows above adapter rows while keeping review status explicit.

const SOURCE_SPECIFIC_PROMOTION_VERSION = "phase14_source_specific_promotion_framework";
const SOURCE_SPECIFIC_PROMOTION_STATUS = Object.freeze({
  PENDING_REVIEW: "source_specific_pending_review",
  REVIEWED: "source_specific_reviewed",
});
const SOURCE_SPECIFIC_PROMOTION_SURFACES = Object.freeze([
  "ddi",
  "pk",
  "washout",
  "metabolite",
  "pgx",
  "transporter",
  "burden",
]);
const SOURCE_SPECIFIC_ADAPTER_REF_PATTERNS = Object.freeze([
  /adapter/i,
  /top100/i,
  /top250/i,
  /drug_count_expansion/i,
  /ddi_expansion_pack/i,
  /metabolite_expansion_pack/i,
  /pgx_transporter_expansion/i,
]);

const SOURCE_SPECIFIC_PROMOTIONS = Object.freeze({
  ddi: Object.freeze([
    {
      id:"ddi_clopidogrel_omeprazole_cyp2c19",
      drug1:"Clopidogrel",
      drug2:"Omeprazole",
      severity:"severe",
      category:"source_specific_prodrug_activation",
      mechanism:"Omeprazole inhibits CYP2C19 and can reduce clopidogrel active-thiol formation in CYP2C19-sensitive patients.",
      effect:"Reduced clopidogrel antiplatelet effect; prefer a non-CYP2C19-inhibiting acid-suppression option when clinically appropriate.",
      evidence:{confidence:"high",sources:["CPIC","clinical PK"]},
      evidenceRefs:["ev_clopidogrel_cyp2c19_cpic","ev_omeprazole_cyp2c19_lima2021"],
    },
    {
      id:"ddi_warfarin_ibuprofen_bleeding",
      drug1:"Warfarin",
      drug2:"Ibuprofen",
      severity:"severe",
      category:"source_specific_bleeding",
      mechanism:"Warfarin anticoagulation plus NSAID platelet/GI injury effects reduce hemostatic reserve.",
      effect:"Major GI bleeding risk; avoid routine overlap or use a documented gastroprotection and monitoring plan.",
      evidence:{confidence:"high",sources:["clinical evidence"]},
      evidenceRefs:["ev_warfarin_nsaid_bleed"],
    },
    {
      id:"ddi_simvastatin_clarithromycin_cyp3a4",
      drug1:"Simvastatin",
      drug2:"Clarithromycin",
      severity:"severe",
      category:"source_specific_cyp3a_exposure",
      mechanism:"Clarithromycin strongly inhibits CYP3A/P-gp pathways and can markedly raise simvastatin exposure.",
      effect:"Avoid the combination; hold simvastatin or use a non-CYP3A statin/antibiotic alternative.",
      evidence:{confidence:"high",sources:["FDA label","clinical PK"]},
      evidenceRefs:["ev_simvastatin_label_cyp3a4","ev_statin_cyp3a4_williams2002"],
    },
    {
      id:"ddi_tacrolimus_voriconazole_cyp3a_tdm",
      drug1:"Tacrolimus",
      drug2:"Voriconazole",
      severity:"severe",
      category:"source_specific_cyp3a_tdm",
      mechanism:"Voriconazole inhibits tacrolimus CYP3A clearance in a narrow-therapeutic-index transplant drug.",
      effect:"Use specialist dose adjustment and intensive trough/renal monitoring or avoid when feasible.",
      evidence:{confidence:"high",sources:["clinical PK","CPIC context"]},
      evidenceRefs:["ev_tacrolimus_voriconazole_vanhove2017","ev_tacrolimus_cyp3a5_cpic","ev_voriconazole_cyp2c19_hyland2008"],
    },
    {
      id:"ddi_dofetilide_tmp_smx_renal_cation",
      drug1:"Dofetilide",
      drug2:"Trimethoprim/Sulfamethoxazole",
      severity:"severe",
      category:"source_specific_renal_cation_qt",
      mechanism:"Trimethoprim inhibits renal cation secretion involved in dofetilide elimination.",
      effect:"Contraindicated exposure increase and concentration-dependent QT/torsades risk.",
      evidence:{confidence:"high",sources:["FDA label"]},
      evidenceRefs:["ev_dofetilide_renal_cation_label","ev_tmp_smx_label"],
    },
    {
      id:"ddi_phenelzine_sertraline_serotonin",
      drug1:"Phenelzine",
      drug2:"Sertraline",
      severity:"severe",
      category:"source_specific_serotonin_contraindication",
      mechanism:"Irreversible MAO inhibition plus SERT blockade can produce excessive serotonergic signaling.",
      effect:"Contraindicated; observe labeled washout intervals before switching.",
      evidence:{confidence:"high",sources:["FDA label"]},
      evidenceRefs:["ev_maoi_ssri_serotonin_fda"],
    },
    {
      id:"ddi_dronedarone_dabigatran_pgp",
      drug1:"Dronedarone",
      drug2:"Dabigatran",
      severity:"severe",
      category:"source_specific_pgp_anticoagulant",
      mechanism:"Dronedarone inhibits P-gp, raising dabigatran exposure in a renal/P-gp-sensitive anticoagulant.",
      effect:"Bleeding risk increases; use label-guided renal function and dose/alternative review.",
      evidence:{confidence:"high",sources:["FDA label"]},
      evidenceRefs:["ev_dronedarone_cyp3a_pgp_label","ev_dabigatran_dronedarone_fda"],
    },
  ]),

  pk: Object.freeze([
    {id:"pk_clopidogrel_cyp2c19", drug:"Clopidogrel", evidenceRefs:["ev_clopidogrel_cyp2c19_cpic","ev_clopidogrel_active_thiol_kim2014"], noteSuffix:"Source-specific active-metabolite exposure evidence is promoted for CYP2C19-sensitive activation."},
    {id:"pk_simvastatin_cyp3a_slco", drug:"Simvastatin", evidenceRefs:["ev_simvastatin_label_cyp3a4","ev_simvastatin_multigene_choi2016"], noteSuffix:"Source-specific exposure evidence covers CYP3A inhibition and simvastatin-acid transport/genotype context."},
    {id:"pk_omeprazole_cyp2c19", drug:"Omeprazole", evidenceRefs:["ev_omeprazole_cyp2c19_lima2021"], noteSuffix:"Source-specific CYP2C19 PK evidence is promoted for genotype and inhibitor context."},
    {id:"pk_voriconazole_cyp2c19", drug:"Voriconazole", evidenceRefs:["ev_voriconazole_cyp2c19_hyland2008","ev_voriconazole_pop_pk_wang2013"], noteSuffix:"Source-specific CYP2C19 PK evidence is promoted; TDM remains dominant."},
    {id:"pk_tacrolimus_cyp3a5", drug:"Tacrolimus", evidenceRefs:["ev_tacrolimus_cyp3a5_cpic","ev_tacrolimus_cyp3a5_consensus"], noteSuffix:"Source-specific CYP3A5/transplant TDM evidence is promoted for trough-sensitive exposure."},
    {id:"pk_dofetilide_renal", drug:"Dofetilide", evidenceRefs:["ev_dofetilide_renal_cation_label"], noteSuffix:"Source-specific renal cation/QT label evidence is promoted."},
    {id:"pk_sotalol_renal_qt", drug:"Sotalol", evidenceRefs:["ev_sotalol_qt_renal_label"], noteSuffix:"Source-specific renal clearance and QT label evidence is promoted."},
  ]),

  washout: Object.freeze([
    {id:"washout_clopidogrel_platelets", drug:"Clopidogrel", evidenceRefs:["ev_clopidogrel_cyp2c19_cpic","ev_batch_hemostasis_labels"]},
    {id:"washout_clarithromycin_cyp3a", drug:"Clarithromycin", evidenceRefs:["ev_simvastatin_label_cyp3a4","ev_statin_cyp3a4_williams2002"]},
    {id:"washout_linezolid_serotonin", drug:"Linezolid", evidenceRefs:["ev_linezolid_serotonin_fda2011","ev_linezolid_ssri_serotonin"]},
    {id:"washout_dofetilide_qt", drug:"Dofetilide", evidenceRefs:["ev_dofetilide_renal_cation_label"]},
    {id:"washout_sotalol_qt", drug:"Sotalol", evidenceRefs:["ev_sotalol_qt_renal_label"]},
    {id:"washout_voriconazole_cyp2c19", drug:"Voriconazole", evidenceRefs:["ev_voriconazole_cyp2c19_hyland2008","ev_voriconazole_pop_pk_wang2013"]},
    {id:"washout_phenelzine_maoi", drug:"Phenelzine", evidenceRefs:["ev_maoi_ssri_serotonin_fda"]},
  ]),

  metabolite: Object.freeze([
    {id:"metab_simvastatin_acid", parent:"Simvastatin", metaboliteName:"Simvastatin acid (SVA)", evidenceRefs:["ev_simvastatin_multigene_choi2016","ev_simvastatin_label_cyp3a4"]},
    {id:"metab_clopidogrel_active_thiol", parent:"Clopidogrel", metaboliteName:"Active thiol metabolite (R-130964)", evidenceRefs:["ev_clopidogrel_cyp2c19_cpic","ev_clopidogrel_active_thiol_kim2014","ev_clopidogrel_dose_escalation_horenstein2014"]},
    {id:"metab_omeprazole_5oh", parent:"Omeprazole", metaboliteName:"5-Hydroxyomeprazole", evidenceRefs:["ev_omeprazole_cyp2c19_lima2021"]},
    {id:"metab_voriconazole_n_oxide", parent:"Voriconazole", metaboliteName:"Voriconazole N-oxide", evidenceRefs:["ev_voriconazole_cyp2c19_hyland2008","ev_voriconazole_pop_pk_wang2013"]},
    {id:"metab_tacrolimus_13_desmethyl", parent:"Tacrolimus", metaboliteName:"13-O-Desmethyltacrolimus", evidenceRefs:["ev_tacrolimus_cyp3a5_cpic","ev_tacrolimus_liver_multigene_ladd2025"]},
    {id:"metab_dofetilide_unchanged", parent:"Dofetilide", metaboliteName:"Dofetilide (unchanged)", evidenceRefs:["ev_dofetilide_renal_cation_label"]},
    {id:"metab_sotalol_unchanged", parent:"Sotalol", metaboliteName:"Sotalol (unchanged)", evidenceRefs:["ev_sotalol_qt_renal_label"]},
    {id:"metab_tmp_smx_trimethoprim_unchanged", parent:"Trimethoprim/Sulfamethoxazole", metaboliteName:"Trimethoprim (unchanged)", evidenceRefs:["ev_tmp_smx_label"]},
  ]),

  pgx: Object.freeze([
    {id:"pgx_clopidogrel_cyp2c19_public", gene:"CYP2C19", drug:"Clopidogrel", evidenceRefs:["ev_clopidogrel_cyp2c19_cpic","ev_clopidogrel_active_thiol_kim2014"], metaboliteParent:"Clopidogrel", metaboliteEnzyme:"CYP2C19"},
    {id:"pgx_voriconazole_cyp2c19_public", gene:"CYP2C19", drug:"Voriconazole", evidenceRefs:["ev_voriconazole_cyp2c19_hyland2008","ev_voriconazole_pop_pk_wang2013"], metaboliteParent:"Voriconazole", metaboliteEnzyme:"CYP2C19"},
    {id:"pgx_tacrolimus_cyp3a5_public", gene:"CYP3A5", drug:"Tacrolimus", evidenceRefs:["ev_tacrolimus_cyp3a5_cpic","ev_tacrolimus_cyp3a5_consensus"], metaboliteParent:"Tacrolimus", metaboliteEnzyme:"CYP3A5"},
    {id:"pgx_warfarin_vkorc1_public", gene:"VKORC1", drug:"Warfarin", evidenceRefs:["ev_warfarin_cyp2c9_vkorc1_cyp4f2_cpic2017"], metaboliteParent:"Warfarin", metaboliteEnzyme:"VKORC1"},
    {id:"pgx_simvastatin_slco1b1_public", gene:"SLCO1B1", drug:"Simvastatin", evidenceRefs:["ev_statin_slco1b1_abcg2_cpic2022","ev_simvastatin_multigene_choi2016"], metaboliteParent:"Simvastatin", metaboliteEnzyme:"SLCO1B1"},
  ]),

  transporter: Object.freeze([
    {id:"transport_dronedarone_dabigatran_pgp", substrate:"Dabigatran", inhibitor:"Dronedarone", transporter:"P-gp", effect:"Dabigatran exposure increases via P-gp inhibition", severity:"high", evidenceRefs:["ev_dronedarone_cyp3a_pgp_label","ev_dabigatran_dronedarone_fda"]},
    {id:"transport_simvastatin_gemfibrozil_oatp", substrate:"Simvastatin", inhibitor:"Gemfibrozil", transporter:"OATP1B1", effect:"Simvastatin acid exposure increases via OATP/CYP2C8 inhibition context", severity:"critical", evidenceRefs:["ev_statin_gemfibrozil_schneck2004","ev_simvastatin_label_cyp3a4"]},
    {id:"transport_dofetilide_trimethoprim_oct", substrate:"Dofetilide", inhibitor:"Trimethoprim/Sulfamethoxazole", transporter:"Renal cation transport", effect:"Dofetilide exposure increases through inhibited renal cation secretion", severity:"critical", evidenceRefs:["ev_dofetilide_renal_cation_label","ev_tmp_smx_label"]},
    {id:"transport_digoxin_dronedarone_pgp", substrate:"Digoxin", inhibitor:"Dronedarone", transporter:"P-gp", effect:"Digoxin exposure can rise through P-gp inhibition", severity:"high", evidenceRefs:["ev_dronedarone_cyp3a_pgp_label"]},
  ]),

  burden: Object.freeze([
    {id:"burden_linezolid_serotonin", drug:"Linezolid", table:"phenotype", evidenceRefs:["ev_linezolid_serotonin_fda2011","ev_linezolid_ssri_serotonin"]},
    {id:"burden_sotalol_qt_beers", drug:"Sotalol", table:"beers", evidenceRefs:["ev_sotalol_qt_renal_label","ev_qt_torsades_tisdale2016"]},
    {id:"burden_dofetilide_qt_beers", drug:"Dofetilide", table:"beers", evidenceRefs:["ev_dofetilide_renal_cation_label","ev_qt_torsades_tisdale2016"]},
    {id:"burden_phenelzine_serotonin", drug:"Phenelzine", table:"phenotype", evidenceRefs:["ev_maoi_ssri_serotonin_fda"]},
    {id:"burden_voriconazole_qt_context", drug:"Voriconazole", table:"phenotype", evidenceRefs:["ev_voriconazole_cyp2c19_hyland2008","ev_qt_torsades_tisdale2016"]},
  ]),
});

function sourceSpecificPromotionKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sourceSpecificPairKey(a, b) {
  return [sourceSpecificPromotionKey(a), sourceSpecificPromotionKey(b)].sort().join("|");
}

function sourceSpecificUnion(...lists) {
  return [...new Set(lists.flat().filter(Boolean))];
}

function sourceSpecificSeverityRank(value) {
  return {critical:5, severe:4, high:4, moderate:3, mild:2, monitor:2, info:1}[String(value || "").toLowerCase()] || 0;
}

function sourceSpecificMetadata(promotion) {
  const reviewed = promotion.reviewed === true;
  return {
    sourceSpecific:true,
    sourceSpecificPromotion:true,
    sourceSpecificPromotionId:promotion.id,
    promotionVersion:SOURCE_SPECIFIC_PROMOTION_VERSION,
    promotionStatus:reviewed ? SOURCE_SPECIFIC_PROMOTION_STATUS.REVIEWED : SOURCE_SPECIFIC_PROMOTION_STATUS.PENDING_REVIEW,
    reviewRequired:!reviewed,
    verified:reviewed,
    supersedesAdapter:promotion.supersedesAdapter !== false,
    sourceType:"source_specific",
    sourceKind:promotion.sourceKind || "public_evidence_row",
  };
}

function sourceSpecificApplyEvidence(target, promotion) {
  target.evidenceRefs = sourceSpecificUnion(target.evidenceRefs || [], promotion.evidenceRefs || []);
  target.evidence = {
    ...(target.evidence || {}),
    ...(promotion.evidence || {}),
    confidence:promotion.evidence?.confidence || target.evidence?.confidence || "high",
    sources:sourceSpecificUnion(target.evidence?.sources || [], promotion.evidence?.sources || ["source-specific promotion"]),
  };
  Object.assign(target, sourceSpecificMetadata(promotion));
  return target;
}

function sourceSpecificAppendNote(target, suffix) {
  if (!suffix) return;
  const note = String(target.note || "").trim();
  target.note = note && !note.includes(suffix) ? `${note} ${suffix}` : (note || suffix);
}

function sourceSpecificTargetExistsDrug(drugName) {
  return typeof getDrug !== "function" || !!getDrug(drugName);
}

function sourceSpecificApplyDdiPromotion(promotion, diagnostics) {
  if (!Array.isArray(KNOWN_DDI) || !sourceSpecificTargetExistsDrug(promotion.drug1) || !sourceSpecificTargetExistsDrug(promotion.drug2)) {
    diagnostics.missingTargets.push({surface:"ddi", id:promotion.id});
    return false;
  }
  const key = sourceSpecificPairKey(promotion.drug1, promotion.drug2);
  let row = KNOWN_DDI.find(item => sourceSpecificPairKey(item.drug1, item.drug2) === key);
  if (!row) {
    row = {
      drug1:promotion.drug1,
      drug2:promotion.drug2,
      severity:promotion.severity || "moderate",
      category:promotion.category || "source_specific_ddi",
      mechanism:promotion.mechanism,
      effect:promotion.effect,
    };
    KNOWN_DDI.push(row);
  } else {
    if (sourceSpecificSeverityRank(promotion.severity) >= sourceSpecificSeverityRank(row.severity)) row.severity = promotion.severity;
    row.category = promotion.category || row.category;
    row.mechanism = promotion.mechanism || row.mechanism;
    row.effect = promotion.effect || row.effect;
  }
  sourceSpecificApplyEvidence(row, promotion);
  diagnostics.applied.ddi.push(promotion.id);
  return true;
}

function sourceSpecificFindByDrugTable(table, drugName) {
  if (!table) return {key:null, row:null};
  const candidates = [
    sourceSpecificPromotionKey(drugName),
    String(drugName || "").trim().toLowerCase(),
    String(drugName || "").trim(),
  ].filter(Boolean);
  for (const key of candidates) {
    if (table[key]) return {key, row:table[key]};
  }
  return {key:candidates[0], row:null};
}

function sourceSpecificApplyPkPromotion(promotion, diagnostics) {
  const {key, row} = sourceSpecificFindByDrugTable(PK_PARAMS, promotion.drug);
  if (!key) return false;
  if (!PK_PARAMS[key]) {
    diagnostics.missingTargets.push({surface:"pk", id:promotion.id});
    return false;
  }
  sourceSpecificApplyEvidence(row, promotion);
  sourceSpecificAppendNote(row, promotion.noteSuffix);
  diagnostics.applied.pk.push(promotion.id);
  return true;
}

function sourceSpecificApplyWashoutPromotion(promotion, diagnostics) {
  const {key, row} = sourceSpecificFindByDrugTable(WASHOUT_DAYS, promotion.drug);
  if (!key) return false;
  if (!WASHOUT_DAYS[key]) {
    diagnostics.missingTargets.push({surface:"washout", id:promotion.id});
    return false;
  }
  sourceSpecificApplyEvidence(row, promotion);
  diagnostics.applied.washout.push(promotion.id);
  return true;
}

function sourceSpecificApplyMetabolitePromotion(promotion, diagnostics) {
  const rows = METAB[promotion.parent];
  if (!Array.isArray(rows)) {
    diagnostics.missingTargets.push({surface:"metabolite", id:promotion.id});
    return false;
  }
  const row = rows.find(item => item.n === promotion.metaboliteName);
  if (!row) {
    diagnostics.missingTargets.push({surface:"metabolite", id:promotion.id});
    return false;
  }
  sourceSpecificApplyEvidence(row, promotion);
  diagnostics.applied.metabolite.push(promotion.id);
  return true;
}

function sourceSpecificApplyPgxPromotion(promotion, diagnostics) {
  let applied = false;
  const pair = PHARMGKB_EVIDENCE?.[promotion.gene]?.pairs?.find(item => item.drug === promotion.drug);
  if (pair) {
    sourceSpecificApplyEvidence(pair, promotion);
    applied = true;
  }
  const metEffect = (GENOTYPE_METABOLITE_EFFECTS || []).find(effect =>
    effect.parent === promotion.metaboliteParent &&
    effect.enzyme === promotion.metaboliteEnzyme
  );
  if (metEffect) {
    sourceSpecificApplyEvidence(metEffect, promotion);
    applied = true;
  }
  if (!applied) {
    diagnostics.missingTargets.push({surface:"pgx", id:promotion.id});
    return false;
  }
  diagnostics.applied.pgx.push(promotion.id);
  return true;
}

function sourceSpecificTransporterKey(row) {
  return [
    sourceSpecificPromotionKey(row.substrate),
    sourceSpecificPromotionKey(row.inhibitor),
    sourceSpecificPromotionKey(row.transporter),
  ].join("|");
}

function sourceSpecificApplyTransporterPromotion(promotion, diagnostics) {
  if (!Array.isArray(TRANSPORTER_DDI)) return false;
  const key = sourceSpecificTransporterKey(promotion);
  let row = TRANSPORTER_DDI.find(item => sourceSpecificTransporterKey(item) === key);
  if (!row) {
    row = {
      substrate:promotion.substrate,
      inhibitor:promotion.inhibitor,
      transporter:promotion.transporter,
      effect:promotion.effect,
      severity:promotion.severity || "high",
      mechanism:promotion.mechanism || promotion.effect,
    };
    TRANSPORTER_DDI.push(row);
  } else {
    if (sourceSpecificSeverityRank(promotion.severity) >= sourceSpecificSeverityRank(row.severity)) row.severity = promotion.severity;
    row.effect = promotion.effect || row.effect;
    row.mechanism = promotion.mechanism || row.mechanism;
  }
  sourceSpecificApplyEvidence(row, promotion);
  diagnostics.applied.transporter.push(promotion.id);
  return true;
}

function sourceSpecificApplyBurdenPromotion(promotion, diagnostics) {
  const table = promotion.table === "beers" ? BEERS_FLAGS : PHENOTYPE_SCORES;
  const {key, row} = sourceSpecificFindByDrugTable(table, promotion.drug);
  if (!key || !row) {
    diagnostics.missingTargets.push({surface:"burden", id:promotion.id});
    return false;
  }
  sourceSpecificApplyEvidence(row, promotion);
  diagnostics.applied.burden.push(promotion.id);
  return true;
}

function sourceSpecificIsAdapterEvidenceRef(ref) {
  return SOURCE_SPECIFIC_ADAPTER_REF_PATTERNS.some(pattern => pattern.test(String(ref || "")));
}

function sourceSpecificIsPromotableStudy(study) {
  if (!study) return false;
  return Boolean(
    study.public === true ||
    study.pmid ||
    study.doi ||
    study.url ||
    study.type === EVIDENCE_TIER.FDA_LABEL ||
    study.type === EVIDENCE_TIER.GUIDELINE ||
    study.type === EVIDENCE_TIER.CLINICAL_PK ||
    study.type === EVIDENCE_TIER.REVIEW ||
    /label|guideline|dailymed|fda|cpic|clinical|study|pubmed|doi/i.test(String(study.source || ""))
  );
}

function sourceSpecificPromotableRefs(row) {
  return (row?.evidenceRefs || []).filter(ref =>
    STUDY_DB?.[ref] &&
    !sourceSpecificIsAdapterEvidenceRef(ref) &&
    sourceSpecificIsPromotableStudy(STUDY_DB[ref])
  );
}

function sourceSpecificApplyBulkMetadata(row, surface, refs) {
  if (!row || !refs.length) return false;
  row.sourceSpecific = true;
  row.sourceSpecificPromotion = true;
  row.sourceSpecificBulkPromotion = true;
  row.sourceSpecificPromotionId = row.sourceSpecificPromotionId || `bulk_${surface}`;
  row.sourceSpecificPromotionSurface = row.sourceSpecificPromotionSurface || surface;
  row.sourceSpecificEvidenceRefs = sourceSpecificUnion(row.sourceSpecificEvidenceRefs || [], refs);
  row.promotionVersion = row.promotionVersion || SOURCE_SPECIFIC_PROMOTION_VERSION;
  row.promotionStatus = row.promotionStatus || SOURCE_SPECIFIC_PROMOTION_STATUS.PENDING_REVIEW;
  row.sourceType = row.sourceType || "source_specific";
  row.sourceKind = row.sourceKind || "public_evidence_row";
  row.supersedesAdapter = row.supersedesAdapter !== false;
  if (row.promotionStatus !== SOURCE_SPECIFIC_PROMOTION_STATUS.REVIEWED) {
    row.reviewRequired = true;
    row.verified = false;
  }
  return true;
}

function sourceSpecificBulkPromoteRows(rows, surface, diagnostics) {
  let count = 0;
  for (const row of rows || []) {
    const refs = sourceSpecificPromotableRefs(row);
    if (!refs.length) continue;
    if (sourceSpecificApplyBulkMetadata(row, surface, refs)) count++;
  }
  diagnostics.bulkApplied[surface] = (diagnostics.bulkApplied[surface] || 0) + count;
  return count;
}

function sourceSpecificBulkPromoteDrugTable(table, surface, diagnostics) {
  return sourceSpecificBulkPromoteRows(Object.values(table || {}), surface, diagnostics);
}

function sourceSpecificBulkPromoteMetabolites(diagnostics) {
  return sourceSpecificBulkPromoteRows(Object.values(METAB || {}).flat(), "metabolite", diagnostics);
}

function sourceSpecificBulkPromotePharmgkbPairs(diagnostics) {
  const rows = Object.values(PHARMGKB_EVIDENCE || {}).flatMap(gene => gene?.pairs || []);
  return sourceSpecificBulkPromoteRows(rows, "pgx", diagnostics);
}

function sourceSpecificBulkPromoteAll(diagnostics) {
  sourceSpecificBulkPromoteRows(KNOWN_DDI || [], "ddi", diagnostics);
  sourceSpecificBulkPromoteDrugTable(PK_PARAMS, "pk", diagnostics);
  sourceSpecificBulkPromoteDrugTable(WASHOUT_DAYS, "washout", diagnostics);
  sourceSpecificBulkPromoteMetabolites(diagnostics);
  sourceSpecificBulkPromoteRows(GENOTYPE_METABOLITE_EFFECTS || [], "pgx", diagnostics);
  sourceSpecificBulkPromotePharmgkbPairs(diagnostics);
  sourceSpecificBulkPromoteRows(TRANSPORTER_DDI || [], "transporter", diagnostics);
  sourceSpecificBulkPromoteDrugTable(PHENOTYPE_SCORES, "burden", diagnostics);
  sourceSpecificBulkPromoteDrugTable(BEERS_FLAGS, "burden", diagnostics);
}

function applySourceSpecificPromotions() {
  const diagnostics = {
    version:SOURCE_SPECIFIC_PROMOTION_VERSION,
    applied:Object.fromEntries(SOURCE_SPECIFIC_PROMOTION_SURFACES.map(surface => [surface, []])),
    bulkApplied:Object.fromEntries(SOURCE_SPECIFIC_PROMOTION_SURFACES.map(surface => [surface, 0])),
    missingEvidenceRefs:[],
    missingTargets:[],
  };
  for (const surface of SOURCE_SPECIFIC_PROMOTION_SURFACES) {
    for (const promotion of SOURCE_SPECIFIC_PROMOTIONS[surface] || []) {
      for (const ref of promotion.evidenceRefs || []) {
        if (!STUDY_DB?.[ref]) diagnostics.missingEvidenceRefs.push({surface, id:promotion.id, ref});
      }
    }
  }
  for (const promotion of SOURCE_SPECIFIC_PROMOTIONS.ddi) sourceSpecificApplyDdiPromotion(promotion, diagnostics);
  for (const promotion of SOURCE_SPECIFIC_PROMOTIONS.pk) sourceSpecificApplyPkPromotion(promotion, diagnostics);
  for (const promotion of SOURCE_SPECIFIC_PROMOTIONS.washout) sourceSpecificApplyWashoutPromotion(promotion, diagnostics);
  for (const promotion of SOURCE_SPECIFIC_PROMOTIONS.metabolite) sourceSpecificApplyMetabolitePromotion(promotion, diagnostics);
  for (const promotion of SOURCE_SPECIFIC_PROMOTIONS.pgx) sourceSpecificApplyPgxPromotion(promotion, diagnostics);
  for (const promotion of SOURCE_SPECIFIC_PROMOTIONS.transporter) sourceSpecificApplyTransporterPromotion(promotion, diagnostics);
  for (const promotion of SOURCE_SPECIFIC_PROMOTIONS.burden) sourceSpecificApplyBurdenPromotion(promotion, diagnostics);
  diagnostics.totalApplied = Object.values(diagnostics.applied).reduce((sum, rows) => sum + rows.length, 0);
  sourceSpecificBulkPromoteAll(diagnostics);
  diagnostics.totalSourceSpecificPromoted = Object.values(diagnostics.bulkApplied).reduce((sum, count) => sum + count, 0);
  return diagnostics;
}

const SOURCE_SPECIFIC_PROMOTION_DIAGNOSTICS = applySourceSpecificPromotions();
