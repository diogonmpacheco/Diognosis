# Live Pending-Review Enrichment Report

Generated: 2026-06-15T15:02:47.783Z

This report reflects the live pending-review enrichment pass, not the earlier check-only dry run. All imported records remain source-linked review candidates unless a Diognosis reviewer explicitly promotes them.

| Metric | Count |
| --- | --- |
| CPIC fetched records | 379 |
| ClinPGx direct staged records | 1500 |
| ClinPGx Open Targets-derived records | 128 |
| DailyMed label metadata records | 100 |
| Legal literature staged records | 248 |
| Candidate relation rows | 2284 |
| Review queue v2 items | 2186 |
| Live pending-review preview records | 30 |

## Provider Status

| Provider | Failures |
| --- | --- |
| ClinPGx | 169 |
| CPIC | 0 |
| DailyMed label metadata | 0 |

## Governance

- Raw provider cache payloads are local build artifacts and ignored by default.
- Small manifests, metadata, review queues, and generated summaries are the committed review surface.
- Live records shown in the app are pending professional review and cannot affect scoring or public severity by themselves.

## Files

| Surface | Path |
| --- | --- |
| CPIC metadata | data/enrichment/snapshots/cpic-snapshot-metadata.json |
| ClinPGx metadata | data/enrichment/snapshots/clinpgx-snapshot-metadata.json |
| Label metadata | data/enrichment/snapshots/label-source-snapshot-metadata.json |
| Live pending review data | src/data/generatedLivePendingReview.js |
