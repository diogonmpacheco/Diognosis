# Promotion Policy

Staged enrichment records can suggest work, but they cannot promote themselves.

## Promotion targets

| Target | Minimum source requirement | Human checklist | Validation |
|---|---|---|---|
| `STUDY_DB` | PMID, DOI, label, guideline URL, or source identifier; source tier; license note | source faithfulness, no copied protected text, identifier match, review status | `npm run check:evidence`, `npm run validate:strict` |
| `KNOWN_DDI` | source-linked DDI evidence, directionality, mechanism, severity rationale | victim/perpetrator mapping, mechanism, severity wording, evidence refs | `npm run regression`, `npm run validate:strict` |
| `METAB` / `METABOLITE_ACTORS` | source-linked parent-metabolite relation and role | formation route, clearance route, active/toxic/inactive role, evidence refs | `npm run audit:metabolite-coverage`, `npm run regression` |
| `GENOTYPE_EFFECTS` | structured guideline or strong clinical PK/PGx source | phenotype mapping, activity direction, drug scope, population caveats | `npm run audit:genotype-gaps`, `npm run validate:strict` |
| `GENOTYPE_METABOLITE_EFFECTS` | source-linked metabolite-specific genotype evidence | metabolite identity, directionality, effect magnitude/qualitative limits | `npm run regression`, `npm run validate:strict` |
| `PK_PARAMS` | label or clinical PK source with parameter | units, half-life/clearance/bioavailability context, population | `npm run regression`, `npm run validate:strict` |
| `TEMPORAL_PROFILES` | label/guideline/clinical PK source | onset, offset, induction/recovery logic | `npm run regression` |
| `WASHOUT_DAYS` | label/guideline or clinical rationale | applies to stopping/switching scenario, not generalized beyond source | `npm run regression` |
| generated review snapshots | deterministic local source/audit output | source registry match, license boundary, no scoring promotion | `npm run audit:source-registry`, `npm run audit:enrichment-license-boundary` |

## Required fields before promotion

- source name, URL/endpoint, fetched/generated timestamp
- license or usage note
- source identifiers such as PMID, DOI, source ID, label URL, or guideline URL
- mapping status for drugs, genes, metabolites, and existing evidence refs
- reviewer decision and rationale
- explicit separation of source-faithfulness review, local/fork review, and professional clinical review

## Curated draft lane

A curated draft can be created after maintainer source-faithfulness review. It remains pending professional review, cannot affect scoring, and cannot alter public severity. Curated draft to source-file promotion is a separate future action.

## Local overlays

Local overlays can document fork/team review decisions. They must display as local review and must not change upstream professional-review status.

## Never automatic

No script may automatically change scoring, severity, public recommendation text, contraindication wording, `STUDY_DB`, `KNOWN_DDI`, `METAB`, genotype rules, PK rules, timing rules, or washout rules from staged external content.
