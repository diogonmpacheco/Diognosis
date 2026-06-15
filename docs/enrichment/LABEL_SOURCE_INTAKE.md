# Label Source Intake

The label-source lane is initialized for public medication-label metadata from allowlisted sources such as FDA/DailyMed.

Check mode does not fetch label source objects. Fetch mode uses DailyMed v2 public metadata endpoints and stores only public metadata such as set IDs, title metadata, SPL version, dates, source URLs, and hashes. It does not store label body text, tables, figures, or copied warning passages.

Rules:

- No browser runtime calls.
- No automatic changes to warnings, severity, scoring, PK, PGx, or metabolite logic.
- Label context remains review-only until source faithfulness and mapping checks pass. Live pending-review preview remains explicitly pending professional review.
- Label source metadata must use the source truth states `label_source_candidate_not_fetched` or `fetched_public_label_metadata_only`.

Generated files:

- `data/enrichment/staged/label-staged-records.json`
- `data/enrichment/snapshots/label-source-raw/index.json`
- `data/enrichment/snapshots/label-source-snapshot-metadata.json`
- `docs/audits/label-source-coverage-audit.json`
- `docs/audits/label-source-coverage-audit.md`
