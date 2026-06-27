# Diognosis Public Trust Model

Generated: 2026-06-27

## Launch Status

Diognosis is a source-linked mechanistic medication intelligence platform in active development.

Diognosis explores drug-drug interactions, pharmacogenomics, active and toxic metabolites, pharmacokinetic exposure shifts, transporter pathways, medication class effects, and source-linked evidence through a privacy-preserving static web application built for mechanistic review.

Status: V1 platform scope, source-linked, source-integrated, under active validation, and not medical advice.

Diognosis is a source-linked mechanistic review platform. It is designed to make pharmacology, pharmacogenomics, metabolites, timing, and interaction pathways easier to inspect. It is not medical advice, not a clinical decision support system, and it does not replace a licensed clinician or pharmacist.

Current evidence status:

<!-- PUBLIC_TRUST_STATS_START -->
- **502 `STUDY_DB` entries** are source-integrated for V1 evidence display and calculations.
- **269 entries** include PMIDs; label, guideline, DOI, and URL sources are also retained where available.
- Source integration means the claim is traceable to committed Diognosis data and source identifiers; it does not mean medical advice or clinical validation.
<!-- PUBLIC_TRUST_STATS_END -->
- Severe and critical warnings remain visible for discovery, but severity is not clinically final and does not prove a medication plan is safe.

## Source Data Boundary

Diognosis V1 ships committed, static source data. It does not run automated external-source import jobs for PubMed, Europe PMC, OpenAlex, Unpaywall, CPIC Data, ClinPGx, or Open Targets.

External records can affect scoring, public severity, contraindication wording, genotype rules, metabolite maps, or shipped database behavior only after they are intentionally added to committed Diognosis source files and pass validation. CPIC, ClinPGx, label, literature, and Open Targets context can be source-integrated for V1 when local mapping and boundary checks pass.

ClinPGx, CPIC Data, PubMed, Open Targets, and label sources are not queried from the browser.

Diognosis may continue adding source-linked data. Source integration is shown explicitly and does not equal professional clinical review.

## What A Reviewer Should Check

For every data or evidence report, the reviewer should inspect:

- Whether the cited source actually supports the displayed claim.
- Whether the mechanism, direction, and affected actor are correct.
- Whether the entry is too broad and should be split into smaller claims.
- Whether severity should be downgraded, upgraded, or marked uncertain.
- Whether the warning affects calculations, graph confidence, evidence display, or only explanatory text.
- Whether the evidence needs exact full-text quantitative values before it can be used for a numeric rule.

## Feedback Intake

The app includes contextual feedback links on:

- Known interaction cards.
- Evidence cards.

These links open privacy-preserving GitHub issue drafts. They do not include the current medication list, genotype settings, share URL, browser URL, evidence refs, or warning/evidence context unless a contributor intentionally adds that information. Contributors should include public identifiers such as PMIDs, DOIs, DailyMed/FDA labels, CPIC/DPWG guidance, or guideline URLs.

Do not include private patient data.

## How Feedback Becomes A Commit

1. A reviewer or contributor opens a GitHub issue or pull request with source identifiers.
2. A maintainer converts accepted feedback into source changes under `src/`.
3. No browser session writes directly to the repository.
4. The generated bundle is rebuilt from source.
5. CI/release gates must pass before merge.
6. The merge commit becomes the audit trail for the change.
7. Clinical-validation status should only be added if a future process defines reviewer role, decision, date, scope, and source snapshot explicitly.

## Required Gates

For routine live testing, run the same fast deploy gate that GitHub Pages uses:

```sh
npm run pages:check
```

This rebuilds the static bundle, verifies release metadata, runs smoke validation, checks the app remains static and privacy-preserving, and catches whitespace errors before the generated `index.html` artifact is published.

Before tagged releases, public launch claims, or clinical-review milestones, run the full release gate:

```sh
npm run release:check
```

This adds the database, V1 public-docs, standards/readiness, strict validation, data-view, evidence ledger, evidence-review UI, V1 PGx contract, V1 PK visualization, V1 finding contract, feedback privacy, scenario, regression, and other source-boundary audits.

## Future Clinical Validation Priorities

Any later clinical-validation phase should prioritize:

- Severe/critical warnings used in public demos.
- Calculation-bearing source-integrated evidence.
- High-impact transplant, oncology, anesthesia, G6PD, and anticoagulation cases.
- Evidence entries linked to many severe or critical rows.
- Any report that claims a quantified fold, dose reduction, contraindication, or guideline-backed action.
