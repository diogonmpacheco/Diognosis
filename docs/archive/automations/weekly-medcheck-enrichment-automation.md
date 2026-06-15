# Weekly MedCheck Enrichment Automation

Run the Diognosis staged enrichment workflow against the saved project workspace.

Use only allowlisted sources:

- PubMed
- Europe PMC
- OpenAlex
- Unpaywall
- CPIC Data
- ClinPGx

Do not use Sci-Hub, LibGen, pirate mirrors, or non-allowlisted full-text sources.

Do not promote drafts into professional-review lanes automatically. Live pending-review preview is allowed only when explicitly requested and must remain visibly pending professional review.

Run:

```bash
npm run enrich:weekly
```

Optional live preview run:

```bash
npm run enrich:weekly -- --live-pending-review --max-live-promotions=75
```

The workflow should:

1. audit the source registry and license boundary
2. audit enrichment coverage
3. run the legal literature staging workflow
4. check or fetch CPIC staged structured data
5. check or fetch ClinPGx staged structured data
6. generate gap-driven literature query candidates
7. group CPIC/ClinPGx staged records into human-readable review candidates
8. build the enrichment review queue
9. run automated source-faithfulness checks
10. optionally build live pending-review preview data
11. run enrichment self-tests
12. run validation gates
13. summarize changed files

Report:

- new staged records
- updated staged records
- new literature drafts
- drafts with legal open-access metadata
- CPIC local coverage candidate records
- CPIC fetched source records
- ClinPGx direct fetched records
- ClinPGx/Open Targets derived records
- grouped review candidates
- curated drafts
- local overlay reviews
- live pending-review records, when enabled
- provider failures
- top missing drugs
- top missing combinations
- top PGx gaps
- top metabolite gaps
- validation results
- changed files
- whether a human should review and commit

Human review is required before any promotion.

The report must not blur local candidates with fetched source records, and must not blur direct ClinPGx API records with ClinPGx/Open Targets derived context.
