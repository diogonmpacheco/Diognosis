# Enrichment Architecture

Diognosis uses a single controlled path for outside sources:

```text
External Source
  -> Fetch / Discover
    -> Normalize
      -> Stage
        -> Dedupe
          -> Coverage Audit
            -> Review Queue
              -> Human Review
                -> Source-Faithfulness Review
                  -> Curated Draft / Preview
                    -> Optional Professional Review
                      -> Optional Promotion
                        -> Validation
                          -> Build
```

Staged data is not trusted clinical content. Source-linked does not mean professionally reviewed. No external source can automatically change risk scoring, public severity, contraindication wording, genotype rules, metabolite maps, or shipped database behavior.

Forks and clinics can add local review overlays. Those overlays are explicitly local and do not change upstream professional-review status.

## Source roles

- Literature discovery: PubMed, Europe PMC, OpenAlex, Unpaywall. These provide metadata, identifiers, legal OA status, and review candidates.
- Structured guideline sources: CPIC Data and ClinPGx. These provide staged guideline, annotation, label, gene, chemical, variant, and publication context.
- User/session PGx sources: PharmCAT and future PGx JSON imports. These can affect the current browser session only, never shipped data files.
- Internal Diognosis sources: `DRUG_DB`, `KNOWN_DDI`, `METAB`, PGx, PK, timing, `STUDY_DB`, Open Targets snapshots, and generated review queues.

## Runtime boundary

The public app serves static local data. It does not make live calls to CPIC, ClinPGx, PharmCAT, PubMed, Europe PMC, OpenAlex, Unpaywall, or Open Targets.

## Promotion boundary

Promotion is a human act. A staged record can become curated Diognosis data only after source faithfulness, mapping, clinical directionality, severity language, copyright/license, and professional review requirements are checked.

CPIC records distinguish local coverage candidates from fetched source objects. ClinPGx records distinguish direct API cache records from ClinPGx/Open Targets derived context.
