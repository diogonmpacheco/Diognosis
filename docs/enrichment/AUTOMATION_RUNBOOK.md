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
6. gap query batch generation
7. enrichment review queue generation
8. enrichment self-test
9. validation gates
10. changed-file summary
11. markdown and JSON report

## What to commit

Commit deterministic staged records, review queues, coverage reports, and automation reports when the source/license audits pass and the report recommends review/commit.

## What not to commit

Do not commit protected full text, non-allowlisted PDFs, provider credentials, raw user PGx files, or staged records that claim to affect scoring before human review.

## Failure handling

Provider failures should be listed in the report. A single provider failure should not erase successful staged results from other providers. License-boundary or forbidden-source failures should block commit.
