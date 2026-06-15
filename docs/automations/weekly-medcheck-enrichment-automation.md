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

Do not promote drafts into `STUDY_DB`, `KNOWN_DDI`, `METAB`, genotype rules, scoring rules, or public severity logic automatically.

Run:

```bash
npm run enrich:weekly
```

The workflow should:

1. audit the source registry and license boundary
2. audit enrichment coverage
3. run the legal literature staging workflow
4. check or fetch CPIC staged structured data
5. check or fetch ClinPGx staged structured data
6. generate gap-driven literature query candidates
7. build the enrichment review queue
8. run enrichment self-tests
9. run validation gates
10. summarize changed files

Report:

- new staged records
- updated staged records
- new literature drafts
- drafts with legal open-access metadata
- CPIC changes
- ClinPGx changes
- provider failures
- top missing drugs
- top missing combinations
- top PGx gaps
- top metabolite gaps
- validation results
- changed files
- whether a human should review and commit

Human review is required before any promotion.
