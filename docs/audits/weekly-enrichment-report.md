# Weekly Enrichment Report

Generated: 2026-06-15T12:55:48.164Z

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
- Grouped review candidates: 186
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

- M  README.md
- A  data/enrichment/cache/clinpgx/README.md
- A  data/enrichment/cache/cpic/README.md
- A  data/enrichment/curated-drafts/README.md
- M  data/enrichment/generated/gap-literature-batch.json
- M  data/enrichment/reports/legal-literature-report.json
- M  data/enrichment/reports/legal-literature-report.md
- M  data/enrichment/review-queue/enrichment-review-queue.json
- A  data/enrichment/review-queue/grouped-review-candidates.json
- A  data/enrichment/snapshots/clinpgx-raw/README.md
- M  data/enrichment/snapshots/clinpgx-snapshot-metadata.json
- A  data/enrichment/snapshots/cpic-raw/README.md
- M  data/enrichment/snapshots/cpic-snapshot-metadata.json
- A  data/enrichment/source-faithfulness-decisions/README.md
- M  data/enrichment/source-registry.json
- M  data/enrichment/staged/clinpgx-staged-records.json
- M  data/enrichment/staged/cpic-staged-records.json
- M  data/enrichment/staged/legal-literature-staged-records.json
- A  data/review-overlays/README.md
- A  data/review-overlays/example-local-review-overlay.json
- M  docs/PUBLIC_TRUST.md
- M  docs/TECHNICAL.md
- M  docs/audits/clinpgx-coverage-audit.json
- M  docs/audits/clinpgx-coverage-audit.md
- M  docs/audits/cpic-coverage-audit.json
- M  docs/audits/cpic-coverage-audit.md
- M  docs/audits/enrichment-coverage-audit.json
- M  docs/audits/enrichment-coverage-audit.md
- M  docs/audits/enrichment-review-queue.md
- A  docs/audits/grouped-review-candidates.md
- M  docs/audits/weekly-enrichment-report.json
- M  docs/audits/weekly-enrichment-report.md
- M  docs/automations/weekly-medcheck-enrichment-automation.json
- M  docs/automations/weekly-medcheck-enrichment-automation.md
- M  docs/enrichment/AUTOMATION_RUNBOOK.md
- A  docs/enrichment/CURATED_DRAFTS.md
- M  docs/enrichment/ENRICHMENT_ARCHITECTURE.md
- A  docs/enrichment/FORK_REVIEW_TEAMS.md
- A  docs/enrichment/LOCAL_REVIEW_POLICY_TEMPLATE.md
- M  docs/enrichment/PROMOTION_POLICY.md
- A  docs/enrichment/REVIEW_OVERLAYS.md
- A  docs/enrichment/REVIEW_STATUS_MODEL.md
- A  docs/enrichment/SOURCE_FAITHFULNESS_REVIEW.md
- M  docs/enrichment/SOURCE_REGISTRY.md
- M  docs/enrichment/STAGED_SOURCE_SCHEMA.md
- M  index.html
- M  package.json
- M  scripts/audit/clinpgx-coverage-audit.js
- M  scripts/audit/cpic-coverage-audit.js
- A  scripts/audit/curated-draft-audit.js
- M  scripts/audit/enrichment-coverage-audit.js
- A  scripts/audit/grouped-review-candidate-audit.js
- A  scripts/audit/promotion-boundary-audit.js
- A  scripts/audit/review-overlay-audit.js
- M  scripts/enrich/build-enrichment-review-queue.js
- A  scripts/enrich/clinpgx-fetch.js
- M  scripts/enrich/clinpgx-normalize.js
- M  scripts/enrich/clinpgx-sync.js
- A  scripts/enrich/cpic-fetch.js
- M  scripts/enrich/cpic-normalize.js
- M  scripts/enrich/cpic-sync.js
- A  scripts/enrich/group-staged-records.js
- A  scripts/enrich/lib/review-status-model.js
- M  scripts/enrich/lib/staged-source-schema.js
- A  scripts/enrich/promote-to-curated-draft.js
- M  scripts/enrich/run-weekly-enrichment.js
- M  scripts/release-check.js
- A  scripts/review/apply-review-overlay.js
- A  scripts/review/source-faithfulness-review.js
- M  src/data/generatedStats.js
