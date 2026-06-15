#!/usr/bin/env node
import { createHash } from 'crypto';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, relative, resolve } from 'path';
import { ROOT, readGeneratedConstObject } from './lib/medcheck-source-loader.js';
import { loadAllStagedRecords, markdownTable, readJson, writeJson, writeText } from './lib/enrichment-common.js';
import { stableToken } from './lib/staged-source-schema.js';
import { actorsForRecord, sourceIdentifiersForRecord } from './lib/live-enrichment-policy.js';

const QUEUE_JSON = resolve(ROOT, 'data/enrichment/review-queue/source-specific-promotion-queue.json');
const TEMPLATE_JSON = resolve(ROOT, 'data/enrichment/source-faithfulness-decisions/source-specific/source-specific-review-templates.json');
const DECISION_DIR = resolve(ROOT, 'data/enrichment/source-faithfulness-decisions/source-specific/decisions');
const OUT_JSON = resolve(ROOT, 'docs/audits/source-specific-promotion-audit.json');
const OUT_MD = resolve(ROOT, 'docs/audits/source-specific-promotion-audit.md');
const LIVE_PENDING = resolve(ROOT, 'src/data/generatedLivePendingReview.js');
const CURATED_DRAFT_DIR = resolve(ROOT, 'data/enrichment/curated-drafts/source-specific');

const DECISION_SCHEMA = 'diognosis.source-specific-review-decision.v1';

const SOURCE_PROFILES = Object.freeze({
  cpic: {
    label: 'CPIC Data',
    sourceNames: ['CPIC Data'],
    target: 'PGX_REVIEW_DRAFT',
    requiredChecks: [
      'sourceObjectOpened',
      'currentGuidelineOrObjectVerified',
      'geneDrugOrAlleleMappingVerified',
      'phenotypeOrRecommendationWordingChecked',
      'evidenceLevelOrObjectTypeRecorded',
      'licenseAndAttributionChecked',
      'noScoringOrSeverityPromotion',
    ],
    reviewerPrompt: 'Verify CPIC source object, gene/drug or allele mapping, recommendation wording, and source-specific usage limits.',
  },
  clinpgx: {
    label: 'ClinPGx',
    sourceNames: ['ClinPGx'],
    target: 'PGX_OR_LABEL_CONTEXT_DRAFT',
    requiredChecks: [
      'sourceObjectOpened',
      'currentClinPgxObjectVerified',
      'drugGeneMarkerMappingVerified',
      'evidenceLevelRecorded',
      'openTargetsDerivedRowsCrossCheckedWhenApplicable',
      'ccBySaAttributionChecked',
      'noScoringOrSeverityPromotion',
    ],
    reviewerPrompt: 'Verify current ClinPGx object/source row, drug/gene/risk-marker mapping, evidence level, and CC BY-SA attribution.',
  },
  dailymed: {
    label: 'DailyMed label metadata',
    sourceNames: ['DailyMed', 'FDA/DailyMed Labels'],
    target: 'LABEL_CONTEXT_DRAFT',
    requiredChecks: [
      'labelSetIdOpened',
      'splVersionChecked',
      'drugIdentityVerified',
      'labelSectionVerifiedIfClaimGoesBeyondMetadata',
      'noProtectedLabelTextCopied',
      'noScoringOrSeverityPromotion',
    ],
    reviewerPrompt: 'Verify DailyMed setid/SPL version, drug identity, and that the draft remains metadata/context unless a label section is reviewed.',
  },
  literature: {
    label: 'Literature metadata',
    sourceNames: ['PubMed', 'Europe PMC', 'OpenAlex', 'Unpaywall'],
    target: 'STUDY_DB_DRAFT',
    requiredChecks: [
      'pmidOrDoiOpened',
      'legalAccessChecked',
      'abstractOrFullTextBoundaryRecorded',
      'mappingAndDirectionVerified',
      'quantitativeClaimsVerifiedFromAllowedSource',
      'noProtectedFullTextCopied',
      'noScoringOrSeverityPromotion',
    ],
    reviewerPrompt: 'Verify PMID/DOI, legal access boundary, mapping, directionality, and any quantitative claim from an allowed source.',
  },
});

const STARTER_TERMS = [
  'Tacrolimus',
  'Fluconazole',
  'CYP3A4',
  'CYP3A5',
  'Warfarin',
  'CYP2C9',
  'VKORC1',
  'CYP4F2',
  'Azathioprine',
  'Mercaptopurine',
  'TPMT',
  'NUDT15',
  'Clopidogrel',
  'CYP2C19',
  'Codeine',
  'CYP2D6',
  'Capecitabine',
  'DPYD',
  'Irinotecan',
  'UGT1A1',
  'G6PD',
  'Succinylcholine',
  'BCHE',
  'RYR1',
];

function parseArgs(argv) {
  const args = { check: false, apply: false, maxTemplates: 60 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--check') args.check = true;
    else if (arg === '--apply') args.apply = true;
    else if (arg === '--max-templates') args.maxTemplates = Number(argv[++i]);
    else if (arg.startsWith('--max-templates=')) args.maxTemplates = Number(arg.slice(16));
  }
  return args;
}

function rel(path) {
  return relative(ROOT, path).replace(/\\/g, '/');
}

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value.filter(item => item != null && String(item).trim() !== '') : [value];
}

function sourceKeyFor(record = {}) {
  const name = record.source?.name || '';
  const type = record.source?.sourceType || '';
  if (SOURCE_PROFILES.cpic.sourceNames.includes(name)) return 'cpic';
  if (SOURCE_PROFILES.clinpgx.sourceNames.includes(name)) return 'clinpgx';
  if (SOURCE_PROFILES.dailymed.sourceNames.includes(name)) return 'dailymed';
  if (SOURCE_PROFILES.literature.sourceNames.includes(name) || type === 'literature_discovery') return 'literature';
  return '';
}

function sourceProfileFor(record) {
  return SOURCE_PROFILES[sourceKeyFor(record)] || null;
}

function livePendingSourceRecordIds() {
  const live = readGeneratedConstObject(LIVE_PENDING, 'LIVE_PENDING_REVIEW_ENRICHMENTS') || {};
  const ids = new Set();
  for (const study of Object.values(live.studies || {})) {
    for (const id of study.sourceRecordIds || []) ids.add(id);
  }
  for (const row of live.knownDdi || []) {
    for (const id of row.sourceRecordIds || []) ids.add(id);
  }
  for (const row of live.labelContext || []) {
    for (const id of row.sourceRecordIds || []) ids.add(id);
  }
  return ids;
}

function automatedDecisionMap() {
  const path = resolve(ROOT, 'data/enrichment/source-faithfulness-decisions/automated/automated-source-check-decisions.json');
  const parsed = readJson(path, {});
  return new Map((parsed.decisionRows || []).map(row => [row.recordId, row]));
}

function listDecisionFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(name => name.endsWith('.json'))
    .map(name => join(dir, name))
    .sort();
}

function loadSourceSpecificDecisions() {
  const rows = [];
  const files = listDecisionFiles(DECISION_DIR);
  for (const file of files) {
    const parsed = readJson(file, null);
    const decisionRows = Array.isArray(parsed) ? parsed : (parsed?.decisionRows || (parsed ? [parsed] : []));
    for (const decision of decisionRows) rows.push({ ...decision, decisionFile: rel(file) });
  }
  return rows;
}

function evidenceIdsFor(record = {}) {
  return [
    ...asArray(record.evidence?.pmids).map(id => `PMID:${id}`),
    ...asArray(record.evidence?.dois).map(id => `DOI:${id}`),
    ...asArray(record.evidence?.sourceIdentifiers),
    ...asArray(record.evidence?.urls),
  ].filter(Boolean);
}

function mappedActorCount(record = {}) {
  const actors = actorsForRecord(record);
  return [
    ...actors.drugs,
    ...actors.genes,
    ...actors.metabolites,
    ...actors.pathways,
    ...actors.phenotypes,
    ...asArray(record.mapping?.possibleExistingRows),
  ].length;
}

function targetFor(record = {}) {
  const profile = sourceProfileFor(record);
  const claimType = record.claim?.claimType || '';
  if (record.governance?.promotionTarget) return record.governance.promotionTarget;
  if (sourceKeyFor(record) === 'dailymed') return 'LABEL_CONTEXT';
  if (sourceKeyFor(record) === 'literature') return 'STUDY_DB';
  if (/pgx|allele|gene_drug|guideline|clinical_annotation|variant/i.test(claimType)) return 'PGX_RULE_OR_STUDY_DB';
  return profile?.target || 'CURATED_DRAFT';
}

function readinessFor(record, automatedDecision, decision) {
  const profile = sourceProfileFor(record);
  if (!profile) return 'unsupported_source';
  if (!sourceIdentifiersForRecord(record).length && !evidenceIdsFor(record).length) return 'needs_source_identifier';
  if (!mappedActorCount(record)) return 'needs_mapping';
  if (sourceKeyFor(record) === 'literature' && record.provenance?.sourceTruthStatus === 'local_review_candidate_not_fetched') {
    return 'needs_full_text_or_source_object_review';
  }
  if (decision?.decision === 'approve_curated_draft') return 'source_specific_decision_approved';
  if (decision?.decision === 'reject_source') return 'source_specific_decision_rejected';
  if (decision?.decision) return 'source_specific_decision_recorded';
  if (automatedDecision?.decision === 'passed_traceability_check') return 'ready_for_source_specific_review';
  return automatedDecision?.liveEligibility || 'needs_traceability_check';
}

function scoreRecord(record, liveIds, automatedDecision) {
  const text = [
    record.source?.name,
    record.claim?.claimType,
    record.evidence?.strongestExternalTier,
    ...(record.claim?.drugs || []),
    ...(record.claim?.genes || []),
    ...(record.claim?.metabolites || []),
    ...(record.claim?.riskMarkers || []),
    ...(record.mapping?.possibleExistingRows || []),
  ].join(' ');
  let score = 0;
  if (liveIds.has(record.id)) score += 60;
  for (const term of STARTER_TERMS) if (text.toLowerCase().includes(term.toLowerCase())) score += 14;
  if (automatedDecision?.decision === 'passed_traceability_check') score += 12;
  if (/FDA_LABEL|CPIC|ClinPGx|guideline|1A|1B/i.test(text)) score += 10;
  if (/fetched_from_(cpic|clinpgx)_source|fetched_public_label_metadata/i.test(record.provenance?.sourceTruthStatus || '')) score += 8;
  if ((record.mapping?.possibleExistingRows || []).length) score += 5;
  if (/interaction|warning|contraindication|toxicity|dose|recommendation/i.test(text)) score += 5;
  return score;
}

function decisionMapByRecord(decisions) {
  const map = new Map();
  for (const decision of decisions) {
    if (!decision.recordId) continue;
    if (!map.has(decision.recordId)) map.set(decision.recordId, []);
    map.get(decision.recordId).push(decision);
  }
  return map;
}

function latestDecision(decisions = []) {
  return decisions
    .slice()
    .sort((a, b) => String(b.reviewDate || b.generatedAt || '').localeCompare(String(a.reviewDate || a.generatedAt || '')))[0] || null;
}

function reviewTemplateFor(item) {
  const sourceChecks = {};
  for (const check of item.requiredChecks) sourceChecks[check] = false;
  return {
    schema: DECISION_SCHEMA,
    decisionId: `source_specific_template_${stableToken(item.recordId)}`,
    recordId: item.recordId,
    sourceKey: item.sourceKey,
    sourceName: item.sourceName,
    decision: 'needs_review',
    reviewer: {
      name: '',
      role: '',
      organization: '',
    },
    reviewDate: '',
    sourceChecks,
    rationale: '',
    promotion: {
      target: item.suggestedTarget,
      allowCuratedDraft: false,
      allowScoring: false,
      allowPublicSeverity: false,
    },
    stillPendingProfessionalReview: true,
    professionalReviewStatus: 'pending',
    canAffectScoring: false,
    canAffectPublicSeverity: false,
  };
}

function validateDecision(decision, record) {
  const errors = [];
  const profile = sourceProfileFor(record);
  if (!profile) errors.push('unsupported source profile');
  if (decision.schema !== DECISION_SCHEMA) errors.push(`schema must be ${DECISION_SCHEMA}`);
  if (decision.sourceKey !== sourceKeyFor(record)) errors.push('sourceKey does not match record source');
  if (!['approve_curated_draft', 'keep_context', 'reject_source', 'needs_more_review', 'superseded', 'needs_review'].includes(decision.decision)) {
    errors.push('decision is not an allowed source-specific decision');
  }
  if (decision.canAffectScoring) errors.push('source-specific decision cannot affect scoring');
  if (decision.canAffectPublicSeverity) errors.push('source-specific decision cannot affect public severity');
  if (decision.promotion?.allowScoring) errors.push('promotion.allowScoring must remain false');
  if (decision.promotion?.allowPublicSeverity) errors.push('promotion.allowPublicSeverity must remain false');
  if (decision.stillPendingProfessionalReview !== true) errors.push('stillPendingProfessionalReview must be true');
  if (decision.professionalReviewStatus && decision.professionalReviewStatus !== 'pending') {
    errors.push('source-specific source-faithfulness decision must keep professionalReviewStatus pending');
  }
  if (decision.decision === 'approve_curated_draft') {
    if (!decision.reviewer?.name) errors.push('approved decision requires reviewer.name');
    if (!decision.reviewer?.role) errors.push('approved decision requires reviewer.role');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(decision.reviewDate || '')) errors.push('approved decision requires YYYY-MM-DD reviewDate');
    if (!decision.promotion?.allowCuratedDraft) errors.push('approved decision requires promotion.allowCuratedDraft true');
    if (!decision.rationale || String(decision.rationale).trim().length < 20) errors.push('approved decision requires rationale');
    for (const check of profile?.requiredChecks || []) {
      if (decision.sourceChecks?.[check] !== true) errors.push(`missing source check: ${check}`);
    }
  }
  return errors;
}

function draftIdFor(record, decision) {
  const hash = createHash('sha256').update(`${record.id}:${decision.decisionId || decision.reviewDate || ''}`).digest('hex').slice(0, 10);
  return `curated_draft_${sourceKeyFor(record)}_${stableToken(record.claim?.claimType)}_${hash}`;
}

function curatedDraftFor(record, decision) {
  const draftId = draftIdFor(record, decision);
  return {
    schema: 'diognosis.curated-draft.v1',
    draftId,
    sourceRecordIds: [record.id],
    sourceSpecificDecisionId: decision.decisionId || '',
    sourceSpecificDecisionFile: decision.decisionFile || '',
    target: decision.promotion?.target || targetFor(record),
    claimSummary: decision.claimSummary || record.claim?.clinicalSummary || record.claim?.mechanismSummary || '',
    sourceFaithfulnessStatus: 'checked_by_maintainer',
    professionalReviewStatus: 'pending',
    canAffectScoring: false,
    canAffectPublicSeverity: false,
    displayStatus: 'curated_preview_pending_professional_review',
    evidenceIdentifiers: evidenceIdsFor(record),
    requiredSourceChecks: sourceProfileFor(record)?.requiredChecks || [],
    completedSourceChecks: Object.entries(decision.sourceChecks || {}).filter(([, value]) => value === true).map(([key]) => key),
    reviewNotes: [
      {
        reviewer: decision.reviewer?.name || '',
        reviewerRole: decision.reviewer?.role || '',
        date: decision.reviewDate || new Date().toISOString().slice(0, 10),
        notes: decision.rationale || 'Source-specific faithfulness review passed; still pending professional review.',
      },
    ],
    requiredNextReview: ['professional clinical review', 'pharmacist review where applicable', 'source freshness check before core promotion'],
  };
}

function buildOutputs({ generatedAt, apply, maxTemplates }) {
  const { records } = loadAllStagedRecords();
  const liveIds = livePendingSourceRecordIds();
  const automated = automatedDecisionMap();
  const decisions = loadSourceSpecificDecisions();
  const decisionsByRecord = decisionMapByRecord(decisions);
  const recordById = new Map(records.map(record => [record.id, record]));
  const decisionErrors = [];
  const approvedDrafts = [];
  const appliedDrafts = [];

  const items = records
    .filter(record => sourceProfileFor(record))
    .map((record) => {
      const sourceKey = sourceKeyFor(record);
      const profile = sourceProfileFor(record);
      const recordDecisions = decisionsByRecord.get(record.id) || [];
      const decision = latestDecision(recordDecisions);
      const decisionValidationErrors = decision ? validateDecision(decision, record) : [];
      if (decisionValidationErrors.length) {
        decisionErrors.push({ recordId: record.id, decisionId: decision.decisionId || '', sourceKey, errors: decisionValidationErrors });
      }
      if (decision?.decision === 'approve_curated_draft' && !decisionValidationErrors.length) {
        const draft = curatedDraftFor(record, decision);
        approvedDrafts.push({ recordId: record.id, draftId: draft.draftId, sourceKey, target: draft.target });
        if (apply) appliedDrafts.push(draft);
      }
      const actors = actorsForRecord(record);
      return {
        schema: 'diognosis.source-specific-promotion-queue-item.v1',
        recordId: record.id,
        sourceKey,
        sourceName: record.source?.name || '',
        sourceEndpoint: record.source?.endpoint || '',
        sourceTruthStatus: record.provenance?.sourceTruthStatus || '',
        claimType: record.claim?.claimType || '',
        suggestedTarget: targetFor(record),
        inLivePendingReview: liveIds.has(record.id),
        automatedTraceabilityDecision: automated.get(record.id)?.decision || 'missing',
        sourceSpecificReadiness: decisionValidationErrors.length ? 'source_specific_decision_invalid' : readinessFor(record, automated.get(record.id), decision),
        latestDecision: decision ? {
          decisionId: decision.decisionId || '',
          decision: decision.decision || '',
          reviewerRole: decision.reviewer?.role || '',
          reviewDate: decision.reviewDate || '',
          decisionFile: decision.decisionFile || '',
        } : null,
        priorityScore: scoreRecord(record, liveIds, automated.get(record.id)),
        actors: {
          drugs: actors.drugs,
          genes: actors.genes,
          metabolites: actors.metabolites,
          pathways: actors.pathways,
          phenotypes: actors.phenotypes,
          possibleExistingRows: asArray(record.mapping?.possibleExistingRows),
        },
        evidenceIdentifiers: evidenceIdsFor(record).slice(0, 16),
        requiredChecks: profile.requiredChecks,
        reviewerPrompt: profile.reviewerPrompt,
        stillPendingProfessionalReview: true,
        canAffectScoring: false,
        canAffectPublicSeverity: false,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore || a.recordId.localeCompare(b.recordId));

  for (const decision of decisions) {
    if (!recordById.has(decision.recordId)) {
      decisionErrors.push({
        recordId: decision.recordId || '',
        decisionId: decision.decisionId || '',
        sourceKey: decision.sourceKey || '',
        errors: ['decision recordId was not found in staged records'],
      });
    }
  }

  const sourceCounts = countBy(items, 'sourceKey');
  const readinessCounts = countBy(items, 'sourceSpecificReadiness');
  const templateItems = selectTemplateItems(items, Number.isFinite(maxTemplates) ? maxTemplates : 60);
  const templates = templateItems.map(reviewTemplateFor);

  const queue = {
    schema: 'diognosis.source-specific-promotion-queue.v1',
    generatedAt,
    totalItems: items.length,
    sourceCounts,
    readinessCounts,
    approvedDrafts: approvedDrafts.length,
    appliedDrafts: appliedDrafts.length,
    decisionErrors,
    items,
  };

  const templatePayload = {
    schema: 'diognosis.source-specific-review-templates.v1',
    generatedAt,
    templateCount: templates.length,
    note: 'Copy a template into data/enrichment/source-faithfulness-decisions/source-specific/decisions/ and complete it. Templates are not approvals.',
    templates,
  };

  const report = {
    schema: 'diognosis.source-specific-promotion-audit.v1',
    generatedAt,
    queueItems: queue.totalItems,
    sourceCounts,
    readinessCounts,
    decisionFiles: listDecisionFiles(DECISION_DIR).map(rel),
    decisions: decisions.length,
    decisionErrors,
    templateCount: templates.length,
    templateSourceCounts: countBy(templateItems, 'sourceKey'),
    livePendingReviewTemplates: templateItems.filter(item => item.inLivePendingReview).length,
    approvedDrafts,
    appliedDrafts: appliedDrafts.map(draft => draft.draftId),
    safetyBoundary: {
      sourceSpecificReviewIsProfessionalReview: false,
      canAffectScoring: false,
      canAffectPublicSeverity: false,
      curatedDraftsRemainPendingProfessionalReview: true,
    },
  };

  return { queue, templatePayload, report, appliedDrafts };
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || 'unknown';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function selectTemplateItems(items, maxTemplates) {
  const eligible = items.filter(item => ['ready_for_source_specific_review', 'needs_full_text_or_source_object_review'].includes(item.sourceSpecificReadiness));
  const selected = [];
  const seen = new Set();
  const sourceKeys = Object.keys(SOURCE_PROFILES);
  const perSourceStarter = Math.max(1, Math.min(10, Math.floor(maxTemplates / sourceKeys.length)));
  const add = (item) => {
    if (!item || seen.has(item.recordId) || selected.length >= maxTemplates) return;
    seen.add(item.recordId);
    selected.push(item);
  };
  for (const sourceKey of sourceKeys) {
    for (const item of eligible.filter(row => row.sourceKey === sourceKey).slice(0, perSourceStarter)) add(item);
  }
  for (const item of eligible) add(item);
  return selected;
}

function renderMarkdown(report) {
  return `# Source-Specific Promotion Audit

Generated: ${report.generatedAt}

This lane turns reviewed source-faithfulness decisions into curated drafts only. It does not perform professional clinical review, and it cannot enable scoring or public severity.

${markdownTable(['Metric', 'Count'], [
    ['Queue items', report.queueItems],
    ['Decision files', report.decisionFiles.length],
    ['Decisions', report.decisions],
    ['Decision errors', report.decisionErrors.length],
    ['Reviewer templates', report.templateCount],
    ['Live pending-review templates', report.livePendingReviewTemplates],
    ['Approved curated drafts', report.approvedDrafts.length],
    ['Applied curated drafts', report.appliedDrafts.length],
  ])}

## Sources

${markdownTable(['Source', 'Items'], Object.entries(report.sourceCounts).map(([source, count]) => [source, count]))}

## Reviewer Templates

${markdownTable(['Source', 'Templates'], Object.entries(report.templateSourceCounts).map(([source, count]) => [source, count]))}

## Readiness

${markdownTable(['Readiness', 'Items'], Object.entries(report.readinessCounts).map(([readiness, count]) => [readiness, count]))}

## Boundary

- Source-specific review is professional review: no
- Can affect scoring: no
- Can affect public severity: no
- Curated drafts remain pending professional review: yes
`;
}

function stableString(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function readText(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function compareOrFail(path, value) {
  const next = typeof value === 'string' ? value : stableString(value);
  const current = readText(path);
  if (current !== next) {
    throw new Error(`${rel(path)} is stale; run npm run enrich:source-specific-promotions`);
  }
}

function writeAppliedDrafts(drafts) {
  for (const draft of drafts) {
    writeJson(resolve(CURATED_DRAFT_DIR, `${draft.draftId}.json`), draft);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const existing = readJson(OUT_JSON, {});
  const generatedAt = args.check && existing.generatedAt ? existing.generatedAt : new Date().toISOString();
  const outputs = buildOutputs({ generatedAt, apply: args.apply, maxTemplates: args.maxTemplates });
  const md = renderMarkdown(outputs.report);

  if (outputs.report.decisionErrors.length) {
    console.error(JSON.stringify({ ok: false, decisionErrors: outputs.report.decisionErrors }, null, 2));
    process.exit(1);
  }

  if (args.check) {
    compareOrFail(QUEUE_JSON, outputs.queue);
    compareOrFail(TEMPLATE_JSON, outputs.templatePayload);
    compareOrFail(OUT_JSON, outputs.report);
    compareOrFail(OUT_MD, md);
  } else {
    writeJson(QUEUE_JSON, outputs.queue);
    writeJson(TEMPLATE_JSON, outputs.templatePayload);
    writeJson(OUT_JSON, outputs.report);
    writeText(OUT_MD, md);
    if (args.apply) writeAppliedDrafts(outputs.appliedDrafts);
  }

  console.log(JSON.stringify({
    ok: true,
    check: args.check,
    applied: args.apply,
    queueItems: outputs.queue.totalItems,
    decisions: outputs.report.decisions,
    approvedDrafts: outputs.report.approvedDrafts.length,
    appliedDrafts: outputs.report.appliedDrafts.length,
    readinessCounts: outputs.report.readinessCounts,
  }, null, 2));
}

main();
