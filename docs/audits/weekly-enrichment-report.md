# Weekly Enrichment Report

Generated: 2026-06-15T13:46:42.969Z

- Mode: check
- New staged records: 532
- Literature drafts: 248
- Drafts with legal OA metadata: 144
- CPIC staged records: 156
- CPIC local candidate records: 156
- CPIC fetched records: 0
- ClinPGx staged records: 128
- ClinPGx direct fetched records: 0
- ClinPGx/Open Targets derived records: 128
- Label-source staged records: 0
- Grouped review candidates: 186
- Grouped review candidates v2: 378
- Review queue v2 items: 626
- Candidate relation rows: 259
- Provider failures: 0
- Recommendation: human_review_then_commit
- Human review required: yes

## Top Missing Drugs

- Rifampin: no active/toxic actor
- Warfarin: no active/toxic actor; no timing/washout context
- Ketoconazole: no active/toxic actor
- Tacrolimus: no active/toxic actor; no timing/washout context
- Amiodarone: no active/toxic actor
- Clopidogrel: no timing/washout context
- Dofetilide: no active/toxic actor; no timing/washout context
- MDMA (Ecstasy): no active/toxic actor; no PK profile; no timing/washout context
- Clarithromycin: no active/toxic actor
- Disopyramide: no direct DDI/evidence refs; no DDI rows; no active/toxic actor

## Top Missing Combinations

- Clarithromycin + Abiraterone: CYP3A inhibitor + CYP3A substrate
- Clarithromycin + Albendazole: CYP3A inhibitor + CYP3A substrate
- Clarithromycin + Alfentanil: CYP3A inhibitor + CYP3A substrate
- Clarithromycin + Alprazolam: CYP3A inhibitor + CYP3A substrate
- Clarithromycin + Amiodarone: CYP3A inhibitor + CYP3A substrate
- Clarithromycin + Amitriptyline: CYP3A inhibitor + CYP3A substrate
- Clarithromycin + Apalutamide: CYP3A inhibitor + CYP3A substrate
- Clarithromycin + Aripiprazole: CYP3A inhibitor + CYP3A substrate
- Clarithromycin + Atazanavir: CYP3A inhibitor + CYP3A substrate
- Clarithromycin + Azithromycin: CYP3A inhibitor + CYP3A substrate

## Top PGx Gaps

- ClinPGx: ATP2A1 / Clozapine
- ClinPGx: ESR1 / Tamoxifen
- ClinPGx: ESR1 / Tamoxifen
- ClinPGx: ESR1 / Tamoxifen
- ClinPGx: FAAH / Clozapine
- ClinPGx: GCG / Clozapine
- ClinPGx: GRIN2B / Clozapine
- ClinPGx: GRIN2B / Clozapine
- ClinPGx: HLA-B / Abacavir
- ClinPGx: HTR3A / Clozapine

## Changed Files

- M README.md
- M build.js
- M data/enrichment/generated/gap-literature-batch.json
- M data/enrichment/provider-allowlist.json
- M data/enrichment/reports/legal-literature-report.json
- M data/enrichment/reports/legal-literature-report.md
- M data/enrichment/review-queue/enrichment-review-queue.json
- M data/enrichment/review-queue/grouped-review-candidates.json
- M data/enrichment/snapshots/clinpgx-snapshot-metadata.json
- M data/enrichment/snapshots/cpic-snapshot-metadata.json
- M data/enrichment/source-registry.json
- M data/enrichment/staged/clinpgx-staged-records.json
- M data/enrichment/staged/cpic-staged-records.json
- M docs/audits/enrichment-coverage-audit.json
- M docs/audits/enrichment-coverage-audit.md
- M docs/audits/enrichment-review-queue.md
- M docs/audits/grouped-review-candidates.md
- M docs/enrichment/AUTOMATION_RUNBOOK.md
- M index.html
- M package.json
- M scripts/audit/promotion-boundary-audit.js
- M scripts/enrich/build-gap-query-batch.js
- M scripts/enrich/clinpgx-normalize.js
- M scripts/enrich/cpic-normalize.js
- M scripts/enrich/lib/medcheck-source-loader.js
- M scripts/enrich/lib/staged-source-schema.js
- M scripts/enrich/run-weekly-enrichment.js
- M scripts/release-check.js
- M src/data/generatedStats.js
- M src/index.template.html
- M src/ui/renderOpenTargetsReviewWorkbench.js
- ?? data/enrichment/candidates/
- ?? data/enrichment/review-queue/archive/
- ?? data/enrichment/review-queue/enrichment-review-queue-v2.json
- ?? data/enrichment/review-queue/grouped-review-candidates-v2.json
- ?? data/enrichment/snapshots/label-source-snapshot-metadata.json
- ?? data/enrichment/staged/label-staged-records.json
- ?? data/review-overlays/example-psychiatry-review-overlay.json
- ?? data/review-overlays/example-transplant-review-overlay.json
- ?? docs/DIOGO_STACK_REPORT.md
- ?? docs/audits/candidate-relation-extraction.json
- ?? docs/audits/candidate-relation-extraction.md
- ?? docs/audits/engine-hypotheses.json
- ?? docs/audits/engine-hypotheses.md
- ?? docs/audits/enrichment-continuation-baseline.json
- ?? docs/audits/enrichment-continuation-baseline.md
- ?? docs/audits/enrichment-review-queue-v2.json
- ?? docs/audits/enrichment-review-queue-v2.md
- ?? docs/audits/grouped-review-candidates-v2.json
- ?? docs/audits/grouped-review-candidates-v2.md
- ?? docs/audits/knowledge-growth-dashboard.json
- ?? docs/audits/knowledge-growth-dashboard.md
- ?? docs/audits/label-source-coverage-audit.json
- ?? docs/audits/label-source-coverage-audit.md
- ?? docs/audits/three-x-baseline.json
- ?? docs/audits/three-x-baseline.md
- ?? docs/audits/three-x-enrichment-report.json
- ?? docs/audits/three-x-enrichment-report.md
- ?? docs/enrichment/CANDIDATE_RELATIONS.md
- ?? docs/enrichment/DATA_GROWTH_DASHBOARD.md
- ?? docs/enrichment/ENGINE_HYPOTHESES.md
- ?? docs/enrichment/ENRICHMENT_PREVIEW_MODE.md
- ?? docs/enrichment/KNOWLEDGE_LAYERS.md
- ?? docs/enrichment/LABEL_SOURCE_INTAKE.md
- ?? scripts/_dbg.mjs
- ?? scripts/audit/candidate-relation-audit.js
- ?? scripts/audit/engine-hypothesis-audit.js
- ?? scripts/audit/enrichment-preview-mode-audit.js
- ?? scripts/audit/knowledge-growth-dashboard.js
- ?? scripts/audit/label-source-boundary-audit.js
- ?? scripts/audit/review-queue-v2-audit.js
- ?? scripts/audit/three-x-target-audit.js
- ?? scripts/diogo-stack-run.js
- ?? scripts/enrich/build-review-queue-v2.js
- ?? scripts/enrich/capture-enrichment-baseline.js
- ?? scripts/enrich/export-engine-hypotheses.js
- ?? scripts/enrich/extract-candidate-relations.js
- ?? scripts/enrich/generate-enrichment-review-data.js
- ?? scripts/enrich/group-candidate-relations.js
- ?? scripts/enrich/label-source-normalize.js
- ?? scripts/enrich/label-source-sync.js
- ?? scripts/enrich/lib/knowledge-layer-model.js
- ?? scripts/enrich/run-three-x-enrichment-campaign.js
- ?? src/data/generatedEnrichmentReviewData.js
