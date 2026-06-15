# Automation Runbook

The weekly enrichment workflow is a staging and audit workflow, not a promotion workflow.
Live pending-review preview generation is opt-in and remains separate from professional review.

## Command

```bash
npm run enrich:weekly
```

For deterministic local checks:

```bash
npm run enrich:weekly:check
```

To intentionally refresh the live pending-review preview lane:

```bash
npm run enrich:weekly -- --live-pending-review --max-live-promotions=75
```

## Allowlisted sources

- PubMed
- Europe PMC
- OpenAlex
- Unpaywall
- CPIC Data
- ClinPGx
- FDA/DailyMed Labels
- Open Targets existing offline snapshot

Forbidden sources:

- Sci-Hub
- LibGen
- pirate mirrors
- unknown full-text PDF mirrors
- non-allowlisted full text

## Weekly phases

1. source registry audit
2. enrichment coverage audit
3. legal literature staging
4. CPIC staged sync/check
5. ClinPGx staged sync/check
6. label-source lane sync/check
7. grouped review candidate generation
8. enrichment review queue generation
9. pre-v2 queue baseline/archive
10. engine hypothesis export
11. candidate relation extraction
12. automated source-faithfulness check
13. optional live pending-review preview generation
14. gap query batch generation
15. grouped review candidate v2 generation
16. enrichment review queue v2 generation
17. knowledge growth dashboard and 3x campaign report
18. generated Review Workbench preview data
19. promotion, overlay, curated draft, grouped-candidate, candidate relation, v2 queue, and live-boundary audits
20. enrichment self-test
21. validation gates
22. changed-file summary
23. markdown and JSON report

## What to commit

Commit deterministic staged records, review queues, coverage reports, and automation reports when the source/license audits pass and the report recommends review/commit.

The v2 queue and candidate relation stores are review-only artifacts. They expand the human worklist. The optional live pending-review lane can create source-linked preview entries in generated data, but it must remain tagged as automated curated preview and pending professional review.

## What not to commit

Do not commit protected full text, non-allowlisted PDFs, provider credentials, raw user PGx files, or staged records that claim to affect scoring before human review.

## Failure handling

Provider failures should be listed in the report. A single provider failure should not erase successful staged results from other providers. License-boundary or forbidden-source failures should block commit.

The report should distinguish CPIC local coverage candidates from fetched CPIC source records, and direct ClinPGx API records from ClinPGx/Open Targets derived context.
