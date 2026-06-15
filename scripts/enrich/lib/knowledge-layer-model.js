export const KNOWLEDGE_LAYER_SCHEMA = 'diognosis.knowledge-layer-model.v1';

export const KNOWLEDGE_LAYERS = Object.freeze({
  IDENTITY: 'identity',
  INTERACTION: 'interaction',
  PARENT_METABOLITE: 'parent_metabolite',
  ENZYME_TRANSPORTER: 'enzyme_transporter',
  PGX: 'pgx',
  PK_TIMING: 'pk_timing',
  SAFETY_PHENOTYPE: 'safety_phenotype',
  EVIDENCE: 'evidence',
  REVIEW_GOVERNANCE: 'review_governance',
  ENGINE_HYPOTHESIS: 'engine_hypothesis',
});

export const CANDIDATE_STORE_SCHEMA = 'diognosis.candidate-relation-store.v1';

export const CANDIDATE_STORE_DEFINITIONS = Object.freeze([
  { key: 'drug_identity', file: 'candidate-drug-identities.json', layer: KNOWLEDGE_LAYERS.IDENTITY, title: 'Drug identities and aliases' },
  { key: 'interactions', file: 'candidate-interactions.json', layer: KNOWLEDGE_LAYERS.INTERACTION, title: 'Interaction events' },
  { key: 'parent_metabolite_relations', file: 'candidate-parent-metabolite-relations.json', layer: KNOWLEDGE_LAYERS.PARENT_METABOLITE, title: 'Parent-metabolite relations' },
  { key: 'metabolite_roles', file: 'candidate-metabolite-roles.json', layer: KNOWLEDGE_LAYERS.PARENT_METABOLITE, title: 'Metabolite roles' },
  { key: 'enzyme_effects', file: 'candidate-enzyme-effects.json', layer: KNOWLEDGE_LAYERS.ENZYME_TRANSPORTER, title: 'Enzyme effects' },
  { key: 'transporter_effects', file: 'candidate-transporter-effects.json', layer: KNOWLEDGE_LAYERS.ENZYME_TRANSPORTER, title: 'Transporter effects' },
  { key: 'pgx_rules', file: 'candidate-pgx-rules.json', layer: KNOWLEDGE_LAYERS.PGX, title: 'PGx rules' },
  { key: 'pgx_risk_markers', file: 'candidate-pgx-risk-markers.json', layer: KNOWLEDGE_LAYERS.PGX, title: 'PGx risk markers' },
  { key: 'pk_parameters', file: 'candidate-pk-parameters.json', layer: KNOWLEDGE_LAYERS.PK_TIMING, title: 'PK parameters' },
  { key: 'timing_rules', file: 'candidate-timing-rules.json', layer: KNOWLEDGE_LAYERS.PK_TIMING, title: 'Timing and washout rules' },
  { key: 'receptor_effects', file: 'candidate-receptor-effects.json', layer: KNOWLEDGE_LAYERS.SAFETY_PHENOTYPE, title: 'Receptor and phenotype effects' },
  { key: 'beers_geriatrics', file: 'candidate-beers-geriatrics.json', layer: KNOWLEDGE_LAYERS.SAFETY_PHENOTYPE, title: 'Geriatric safety flags' },
  { key: 'evidence_links', file: 'candidate-evidence-links.json', layer: KNOWLEDGE_LAYERS.EVIDENCE, title: 'Evidence links' },
  { key: 'engine_hypotheses', file: 'candidate-engine-hypotheses.json', layer: KNOWLEDGE_LAYERS.ENGINE_HYPOTHESIS, title: 'Engine hypotheses' },
  { key: 'label_context', file: 'candidate-label-context.json', layer: KNOWLEDGE_LAYERS.SAFETY_PHENOTYPE, title: 'Label source context' },
]);

export const CLAIM_TYPE_TO_STORE = Object.freeze({
  drug_identity: 'drug_identity',
  drug_alias: 'drug_identity',
  drug_classification: 'drug_identity',
  ddi_evidence: 'interactions',
  interaction_event: 'interactions',
  contraindication_context: 'interactions',
  warning_context: 'interactions',
  parent_metabolite_relation: 'parent_metabolite_relations',
  metabolite_evidence: 'parent_metabolite_relations',
  metabolite_role: 'metabolite_roles',
  metabolite_formation: 'parent_metabolite_relations',
  metabolite_clearance: 'parent_metabolite_relations',
  metabolite_persistence: 'timing_rules',
  active_moiety_effect: 'metabolite_roles',
  toxic_metabolite_effect: 'metabolite_roles',
  enzyme_effect: 'enzyme_effects',
  transporter_effect: 'transporter_effects',
  gene_drug_recommendation: 'pgx_rules',
  guideline_annotation: 'pgx_rules',
  clinical_annotation: 'pgx_rules',
  pgx_effect: 'pgx_rules',
  pgx_recommendation: 'pgx_rules',
  pgx_pair: 'pgx_rules',
  variant_annotation: 'pgx_risk_markers',
  allele_function: 'pgx_risk_markers',
  risk_marker_effect: 'pgx_risk_markers',
  reference_gene: 'pgx_risk_markers',
  reference_chemical: 'drug_identity',
  pk_parameter: 'pk_parameters',
  washout_timing: 'timing_rules',
  temporal_profile: 'timing_rules',
  receptor_score: 'receptor_effects',
  phenotype_burden: 'receptor_effects',
  beers_flag: 'beers_geriatrics',
  geriatric_safety_flag: 'beers_geriatrics',
  pregnancy_lactation_flag: 'label_context',
  renal_adjustment_context: 'label_context',
  hepatic_adjustment_context: 'label_context',
  drug_label: 'label_context',
  test_alert: 'pgx_rules',
  pathway_context: 'enzyme_effects',
  guideline: 'pgx_rules',
  coverage_gap: 'engine_hypotheses',
  publication: 'evidence_links',
  engine_hypothesis: 'engine_hypotheses',
});

export function candidateStoreForClaimType(claimType = '') {
  return CLAIM_TYPE_TO_STORE[claimType] || 'evidence_links';
}

export function candidateStoreDefinition(key) {
  return CANDIDATE_STORE_DEFINITIONS.find(def => def.key === key) || CANDIDATE_STORE_DEFINITIONS.find(def => def.key === 'evidence_links');
}

export function candidateStoreFile(key) {
  return candidateStoreDefinition(key).file;
}

export function normalizeEvidenceIdentifiers(record = {}) {
  return [
    ...((record.evidence?.pmids || []).map(id => `PMID:${id}`)),
    ...((record.evidence?.dois || []).map(id => `DOI:${id}`)),
    ...(record.evidence?.sourceIdentifiers || []),
    ...(record.evidence?.urls || []),
  ].filter(Boolean);
}

export function baseCandidateGovernance(extra = {}) {
  return {
    reviewRequired: true,
    professionalReviewStatus: 'pending',
    sourceFaithfulnessStatus: 'unreviewed',
    localReviewStatus: 'none',
    curationStatus: 'candidate',
    publicDisplayStatus: 'review_queue_only',
    scoringStatus: 'cannot_affect_scoring',
    canAutoPromote: false,
    canAffectScoring: false,
    canAffectPublicSeverity: false,
    canBeBundledPublicly: false,
    promotionReadiness: 'not_ready',
    ...extra,
  };
}
