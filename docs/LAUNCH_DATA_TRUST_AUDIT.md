# Launch Data Trust Audit

Audit date: 2026-06-25

## Scope

This audit describes the launch-facing data trust boundary for the current static bundle. Diognosis can show source-integrated evidence, pathway reasoning, pharmacogenomic context, and high-priority findings, but source-integrated evidence does not equal medical advice or clinical validation.

## Current Counts

<!-- LAUNCH_DATA_TRUST_STATS_START -->
| Metric | Count |
| --- | ---: |
| Drugs in `DRUG_DB` | 1549 |
| Evidence entries in `STUDY_DB` | 502 |
| Source-integrated V1 evidence entries | 502 |
| Evidence entries with PMIDs | 269 |
| RxNorm identity mappings | 1251 |
| PGx marker rows | 43 |
| CPIC-linked action summaries | 18 |
| Interaction pairs | 3183 |
| Severe interaction pairs | 1610 |
| Moderate interaction pairs | 1538 |
| Mild interaction pairs | 35 |
<!-- LAUNCH_DATA_TRUST_STATS_END -->

## Required Boundaries

- Public evidence can be source-integrated for V1 when it is traceable to committed data and source identifiers.
- Source integration does not equal medical advice, clinical validation, or proof that a medication list is safe.
- Severe and critical findings can be visible as educational review priorities, but severity is not clinically final.
- Source-linked rows need source identifiers, boundary notes, and passing release checks before they should affect shipped behavior.
- The browser app must remain static and local-first: no accounts, analytics, tracking, medication-data collection, or runtime clinical API calls.
- GitHub feedback links must be privacy-preserving by default: they must not transmit the current medication list, genotype settings, share URL, browser URL, or selected-card context unless a contributor intentionally adds that information.

## Deploy And Release Evidence

The GitHub Pages deploy gate checks the live-testing boundary through:

- generated stats, build, and release metadata checks;
- smoke validation;
- privacy/static and whitespace checks.

Run:

```sh
npm run pages:check
```

GitHub Pages builds `index.html` from `src/` and publishes the generated artifact through `.github/workflows/pages.yml`.

The full release gate checks the deeper trust boundary through:

- database, V1 no-warning database, public docs, standards coverage, readiness, and data-view audits;
- evidence citation and evidence-review UI audits;
- V1 PGx contract audit, V1 PK visualization audit, V1 finding contract audit including all recognized shipped `KNOWN_DDI` pairs, and V1 release readiness audit;
- V1 feedback privacy audit;
- evidence calculation, external-context firewall, patient/clinician wording, standards identity, scenario snapshot, launch QA, regression, smoke, strict validation, privacy/static, and whitespace checks.

Run:

```sh
npm run release:check
```

## Future Clinical Validation Priorities

Any later clinical-validation pass should prioritize severe/critical findings, public demo and deep-QA scenarios, calculation-bearing evidence, source-linked guideline/label claims, and any row that implies a quantified fold change, dose strategy, avoidance/substitution decision, contraindication, or monitoring plan.
