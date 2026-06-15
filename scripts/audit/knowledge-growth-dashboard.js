#!/usr/bin/env node
import { existsSync, readdirSync, statSync } from 'fs';
import { extname, join, resolve } from 'path';
import { loadDiognosisData, readGeneratedConstObject, ROOT } from '../enrich/lib/diognosis-source-loader.js';
import { loadAllStagedRecords, markdownTable, readJson, writeJson, writeText } from '../enrich/lib/enrichment-common.js';

const OUT_JSON = resolve(ROOT, 'docs/audits/knowledge-growth-dashboard.json');
const OUT_MD = resolve(ROOT, 'docs/audits/knowledge-growth-dashboard.md');

function listJson(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const file = join(dir, entry);
    const stats = statSync(file);
    if (stats.isDirectory()) out.push(...listJson(file));
    else if (extname(file) === '.json') out.push(file);
  }
  return out;
}

function countCandidateStores() {
  const stores = [];
  for (const file of listJson(resolve(ROOT, 'data/enrichment/candidates'))) {
    const store = readJson(file, null);
    if (store?.schema !== 'diognosis.candidate-relation-store.v1') continue;
    stores.push({
      file: file.replace(`${ROOT}/`, ''),
      store: store.store,
      layer: store.layer,
      totalCandidates: store.totalCandidates || (store.candidates || []).length,
    });
  }
  return stores;
}

const data = loadDiognosisData();
const { records: staged } = loadAllStagedRecords();
const queueV2 = readJson(resolve(ROOT, 'data/enrichment/review-queue/enrichment-review-queue-v2.json'), {});
const groupedV2 = readJson(resolve(ROOT, 'data/enrichment/review-queue/grouped-review-candidates-v2.json'), {});
const cpic = readJson(resolve(ROOT, 'data/enrichment/snapshots/cpic-snapshot-metadata.json'), {});
const clinpgx = readJson(resolve(ROOT, 'data/enrichment/snapshots/clinpgx-snapshot-metadata.json'), {});
const labelMeta = readJson(resolve(ROOT, 'data/enrichment/snapshots/label-source-snapshot-metadata.json'), {});
const livePending = readGeneratedConstObject(resolve(ROOT, 'src/data/generatedLivePendingReview.js'), 'LIVE_PENDING_REVIEW_ENRICHMENTS') || {};
const candidateStores = countCandidateStores();
const overlayReviews = listJson(resolve(ROOT, 'data/review-overlays'))
  .map(file => readJson(file, null))
  .filter(row => row?.schema === 'diognosis.review-overlay.v1')
  .reduce((sum, row) => sum + (row.reviews?.length || 0), 0);
const curatedDrafts = listJson(resolve(ROOT, 'data/enrichment/curated-drafts'))
  .map(file => readJson(file, null))
  .filter(row => row?.schema === 'diognosis.curated-draft.v1').length;

const core = {
  drugs: data.DRUG_DB.length,
  interactions: data.KNOWN_DDI.length,
  evidenceEntries: Object.keys(data.STUDY_DB || {}).length,
  parentMetaboliteMaps: Object.keys(data.METAB || {}).length,
  metaboliteEdges: Object.values(data.METAB || {}).flat().length,
  firstClassMetaboliteActors: Object.keys(data.METABOLITE_ACTORS || {}).length,
  pkProfiles: Object.keys(data.PK_PARAMS || {}).length,
  washoutRules: Object.keys(data.WASHOUT_DAYS || {}).length,
  genotypeGenes: Object.keys(data.GENOTYPE_EFFECTS || {}).length,
  genotypeMetaboliteRules: (data.GENOTYPE_METABOLITE_EFFECTS || []).length,
  transporterInteractions: (data.TRANSPORTER_DDI || []).length,
  receptorActors: Object.keys(data.RECEPTOR_ACTORS || {}).length,
  phenotypeScores: Object.keys(data.PHENOTYPE_SCORES || {}).length,
  beersFlags: Object.keys(data.BEERS_FLAGS || {}).length,
};

const candidateTotal = candidateStores.reduce((sum, store) => sum + store.totalCandidates, 0);
const threeXTargets = Object.fromEntries(Object.entries(core).map(([key, value]) => [key, value * 3]));
const report = {
  schema: 'diognosis.knowledge-growth-dashboard.v1',
  generatedAt: new Date().toISOString(),
  core,
  threeXTargets,
  staged: {
    totalRecords: staged.length,
    cpic: cpic.stagedRecords || 0,
    clinpgx: clinpgx.stagedRecords || 0,
    label: labelMeta.stagedRecords || 0,
  },
  candidates: {
    totalStores: candidateStores.length,
    totalCandidates: candidateTotal,
    stores: candidateStores,
  },
  livePendingReview: {
    totalRecords: livePending.summary?.totalLiveRecords || 0,
    studies: livePending.summary?.studies || 0,
    knownDdi: livePending.summary?.knownDdi || 0,
    metab: livePending.summary?.metab || 0,
    metaboliteActors: livePending.summary?.metaboliteActors || 0,
    genotypeEffects: livePending.summary?.genotypeEffects || 0,
    genotypeMetaboliteEffects: livePending.summary?.genotypeMetaboliteEffects || 0,
    pkParams: livePending.summary?.pkParams || 0,
    washoutDays: livePending.summary?.washoutDays || 0,
    labelContext: livePending.summary?.labelContext || 0,
  },
  review: {
    queueV2Items: queueV2.totalItems || 0,
    groupedV2Candidates: groupedV2.totalCandidates || 0,
    curatedDrafts,
    localOverlayReviews: overlayReviews,
    professionallyReviewedEntries: 0,
  },
  recommendation: 'continue_source_driven_review_before_core_promotion',
};

writeJson(OUT_JSON, report);
writeText(OUT_MD, `# Knowledge Growth Dashboard

Generated: ${report.generatedAt}

## Current Core Data

${markdownTable(['Area', 'Current', '3x target'], Object.entries(core).map(([key, value]) => [
  key,
  value,
  threeXTargets[key],
]))}

## Candidate/Review Layer

- Staged records: ${report.staged.totalRecords}
- Candidate relation stores: ${report.candidates.totalStores}
- Candidate relation rows: ${report.candidates.totalCandidates}
- Live pending-review preview records: ${report.livePendingReview.totalRecords}
- Live preview studies: ${report.livePendingReview.studies}
- Live preview DDI rows: ${report.livePendingReview.knownDdi}
- Live preview label context rows: ${report.livePendingReview.labelContext}
- Grouped v2 candidates: ${report.review.groupedV2Candidates}
- Review queue v2 items: ${report.review.queueV2Items}
- Curated drafts: ${report.review.curatedDrafts}
- Local overlay reviews: ${report.review.localOverlayReviews}
- Professionally reviewed shipped entries: ${report.review.professionallyReviewedEntries}

The growth layer is intentionally larger than the curated core. It gives reviewers source-driven work without silently changing public warnings.
`);

console.log(JSON.stringify({ ok: true, core, candidateRows: candidateTotal, queueV2Items: report.review.queueV2Items }, null, 2));
