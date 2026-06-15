# Automation Runbook

The weekly enrichment workflow is a staging and audit workflow, not a promotion workflow.

## Command

```bash
npm run enrich:weekly
```

For deterministic local checks:

```bash
npm run enrich:weekly:check
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
12. gap query batch generation
13. grouped review candidate v2 generation
14. enrichment review queue v2 generation
15. knowledge growth dashboard and 3x campaign report
16. generated Review Workbench preview data
17. promotion, overlay, curated draft, grouped-candidate, candidate relation, and v2 queue audits
18. enrichment self-test
19. validation gates
20. changed-file summary
21. markdown and JSON report

## What to commit

Commit deterministic staged records, review queues, coverage reports, and automation reports when the source/license audits pass and the report recommends review/commit.

The v2 queue and candidate relation stores are review-only artifacts. They expand the human worklist but do not promote anything into `STUDY_DB`, `KNOWN_DDI`, `METAB`, genotype rules, PK rules, timing rules, or public severity.

## What not to commit

Do not commit protected full text, non-allowlisted PDFs, provider credentials, raw user PGx files, or staged records that claim to affect scoring before human review.

## Failure handling

Provider failures should be listed in the report. A single provider failure should not erase successful staged results from other providers. License-boundary or forbidden-source failures should block commit.

The report should distinguish CPIC local coverage candidates from fetched CPIC source records, and direct ClinPGx API records from ClinPGx/Open Targets derived context.
