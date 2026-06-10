# Diognosis Public Trust Model

Generated: 2026-06-09

## Launch Status

Diognosis is an AI-assisted medication safety and pharmacogenomics platform in active development.

Its first module, the MedCheck Engine, explores drug-drug interactions, pharmacogenomics, active and toxic metabolites, pharmacokinetic exposure shifts, transporter pathways, medication class effects, and source-linked evidence through a privacy-preserving static web application.

Status: pre-v1, source-linked, under active validation, and not yet professionally reviewed.

Diognosis is a source-linked educational preview. It is designed to make pharmacology, pharmacogenomics, metabolites, and interaction pathways easier to inspect. It is not medical advice, not a clinical decision support system, and it does not replace a licensed clinician or pharmacist.

Current evidence status:

- 456 `STUDY_DB` entries are source-linked.
- 456 entries are pending professional review.
- 0 entries are professionally reviewed.
- 295 entries are currently marked `reviewRequired:true` as an internal enrichment/scoring flag, not a public reviewed/unreviewed boundary.
- Severe and critical warnings remain visible for discovery, but severity is not clinically final until reviewed.

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

These links open a GitHub issue with the current stack, share URL, evidence refs, and warning/evidence context. Contributors should include public identifiers such as PMIDs, DOIs, DailyMed/FDA labels, CPIC/DPWG guidance, or guideline URLs.

Do not include private patient data.

## How Feedback Becomes A Commit

1. A reviewer or contributor opens a GitHub issue or pull request with source identifiers.
2. A maintainer converts accepted feedback into source changes under `src/`.
3. No browser session writes directly to the repository.
4. The generated bundle is rebuilt from source.
5. CI/release gates must pass before merge.
6. The merge commit becomes the audit trail for the change.
7. Professional-reviewed status should only be added when the reviewer role, decision, date, scope, and source snapshot are explicit.

## Required Pre-Launch Gate

Run:

```sh
npm run launch:v1
```

This runs the generated stats pass, build, release gate, deep launch QA, launch data trust audit, and evidence ledger check.

## Current Review Priorities

The first human review pass should prioritize:

- Severe/critical warnings used in public demos.
- Calculation-bearing pending evidence.
- High-impact transplant, oncology, anesthesia, G6PD, and anticoagulation cases.
- Evidence entries linked to many severe or critical rows.
- Any report that claims a quantified fold, dose reduction, contraindication, or guideline-backed action.
