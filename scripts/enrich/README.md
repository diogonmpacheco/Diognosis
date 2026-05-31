# MedCheck Enrichment Tooling

Dev-time literature discovery lives here. It writes review drafts only; it never edits `STUDY_DB` or the shipped bundle.

Current slice: PubMed, Europe PMC, OpenAlex, and Semantic Scholar search/fetch, plus optional one-hop Semantic Scholar citation/reference expansion.

```bash
node scripts/enrich/pubmed-enrich.js \
  --query "fluoxetine desipramine pharmacokinetics CYP2D6" \
  --relation fluoxetine:CYP2D6 \
  --supports fluoxetine_inhibits_CYP2D6 \
  --providers pubmed,europepmc,openalex,semanticscholar \
  --limit 10 \
  --email you@example.com
```

For a citation-graph pass on the Semantic Scholar seed hits:

```bash
node scripts/enrich/pubmed-enrich.js \
  --query "fluoxetine desipramine pharmacokinetics CYP2D6" \
  --relation fluoxetine:CYP2D6 \
  --supports fluoxetine_inhibits_CYP2D6 \
  --providers semanticscholar \
  --expand-citations \
  --limit 5
```

Outputs:

- `scripts/enrich/drafts.json`
- `scripts/enrich/review-report.md`
- cached legal-provider responses under `scripts/enrich/cache/`

Guardrails:

- fetches only from `eutils.ncbi.nlm.nih.gov`, `www.ebi.ac.uk`, `api.openalex.org`, and `api.semanticscholar.org`
- writes only identifiers, citation metadata, paraphrased findings, and extracted numbers
- never stores full text or verbatim abstracts
- dedupes by DOI, PMID, and normalized title against live `STUDY_DB` and existing drafts
- drafts default to `needsFullText:true` and `confidence:"low"` when no abstract-level number is extractable
- provider failures are recorded in the report without discarding successful results from other providers

Offline self-test:

```bash
node scripts/enrich/pubmed-enrich.js --self-test
```
