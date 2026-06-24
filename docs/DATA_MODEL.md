# Diognosis Data Model

Diognosis keeps the live application data in browser-shipped JavaScript arrays, but external users and contributors should treat `DATA_VIEW_INDEX` as the cleaner derived data surface.

The raw sources remain useful for maintainers:

- `DRUG_DB` stores live parent-substance records, route hooks, basic flags, brands, and aliases.
- `METAB` and `METABOLITE_ACTORS` store parent-metabolite links and first-class metabolite actors.
- `KNOWN_DDI`, `TRANSPORTER_DDI`, PGx rules, receptor profiles, PK profiles, Beers flags, and washout rules store live clinical-review prompts.

For reuse, prefer these derived exports:

- `canonicalSubstances`: one row per normalized substance or actor.
- `canonicalFacts`: source-collapsed relationship facts for DDI, PGx, metabolite, transporter, pathway, and evidence views.
- `aliasRows`: every known lookup alias and its canonical target.
- `aliasCollisions`: aliases that still map to more than one canonical target.
- `externalIdentifiers`: local crosswalk rows such as RxNorm CUIs attached to canonical substances when the mapping is ingredient-level and reviewable.
- `bySubstanceId`: relationships grouped by canonical substance ID.
- `dataHygiene`: audit counts for substance kinds, alias collisions, duplicate facts, class placeholders, orphan metabolites, and unresolved relations.

## Substance Kinds

Every canonical substance receives a `substanceKind`:

- `parent_drug`
- `prodrug`
- `active_metabolite`
- `inactive_metabolite`
- `metabolite`
- `salt_or_formulation`
- `combination_product`
- `class_placeholder`
- `non_drug_context`
- `external_substance`
- `gene`
- `actor`

This prevents downstream consumers from treating a metabolite, broad class, combination product, and parent drug as the same kind of object.

## Identity Rules

Use `canonicalId` and `substanceKind` as the stable identity pair. Names and aliases are display/search helpers, not identity.

Parent-metabolite relationships should use `parentIds`. Combination products should use `componentIds` when components resolve to first-class Diognosis substances.

Alias collisions are intentionally preserved in `aliasCollisions`; consumers should not guess which target is correct when a collision is present.

## External Standards

Clinical standards live in `src/data/clinicalStandards.js` and are shipped as local static data, not fetched at runtime.

- Medication identity mappings use RxNorm CUIs from NIH RxNav for selected ingredient-level substances.
- PGx marker rows use star-allele, dbSNP `rs` identifier, or HLA nomenclature labels where applicable.
- CPIC-linked action summaries remain review context. They can add evidence refs and a review direction, but they do not become automatic medication instructions or professional review.
- `buildClinicalStandardsCoverage()` reports selected-stack standards coverage for V1 surfaces. It shows RxNorm-mapped and unmapped recognized medications, PGx marker rows, CPIC-linked action summaries, and the explicit SNOMED boundary for non-ingested diagnoses/symptoms.

`npm test` runs strict validation, including checks that mapped substances resolve, RxNorm CUIs are numeric, PGx marker identifiers are well formed, and PGx action summaries point at existing evidence refs. `scripts/audit/v1-standards-coverage-audit.js` checks that hidden Reviewer Console scope, V1 handoff, and V1 readiness expose standards coverage and standards gaps.

## Fact Rules

Use `canonicalFacts` when building external summaries or data exports. Raw relations remain available in `relations`, but they may include multiple source-specific rows for the same clinical concept.

Each relation has:

- `subjectId` / `objectId`
- `subjectSubstanceKind` / `objectSubstanceKind`
- `factKey`
- `source`
- `role`
- `gene`
- `severity`
- `actionGroup`
- `actionText`

## Hygiene Gate

Run:

```bash
npm test
```

The strict validator enforces the canonical export shape and keeps budgets for remaining known ambiguity:

- alias collisions
- duplicate canonical facts
- class placeholders
- orphan metabolite actors
- unresolved relation subjects

Quality/review tiering is intentionally not part of this model. Professional review status and source governance remain separate.
