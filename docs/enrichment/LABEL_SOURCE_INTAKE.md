# Label Source Intake

The label-source lane is initialized for public medication-label metadata from allowlisted sources such as FDA/DailyMed.

Current check mode does not fetch label source objects. It creates an explicit empty staged lane and coverage audit so future label enrichment can be added without changing the browser privacy boundary.

Rules:

- No browser runtime calls.
- No automatic changes to warnings, severity, scoring, PK, PGx, or metabolite logic.
- Label context remains review-only until source faithfulness, mapping, and clinical/professional review are complete.
- Label source metadata must use the source truth states `label_source_candidate_not_fetched` or `fetched_from_label_source`.

Generated files:

- `data/enrichment/staged/label-staged-records.json`
- `data/enrichment/snapshots/label-source-snapshot-metadata.json`
- `docs/audits/label-source-coverage-audit.json`
- `docs/audits/label-source-coverage-audit.md`
