# Enrichment Preview Mode

The app exposes a compact preview of the enrichment review layer inside the Review Workbench.

Preview rows come from:

- `data/enrichment/review-queue/enrichment-review-queue-v2.json`
- `data/enrichment/review-queue/grouped-review-candidates-v2.json`
- `docs/audits/knowledge-growth-dashboard.json`
- `docs/audits/three-x-enrichment-report.json`

The browser receives only generated, static review metadata in `src/data/generatedEnrichmentReviewData.js`.

This preview is not a clinical feature. It shows reviewer work items, source-truth status, candidate layer, suggested target, and pending review status. It does not affect `calcRisk()`, warning severity, evidence review status, or public scoring.
