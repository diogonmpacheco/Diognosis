# Diognosis Design Brief

## Current V1 Direction

Diognosis now has one public **Medication Review** surface. The previous public explanation-depth split has been removed. Legacy `audience=` links still load for compatibility, but they behave as no-op legacy parameters and should disappear from generated/share URLs.

## Primary Public Flow

1. Add medicines, supplements, foods, or substances to the Medicine List.
2. Add real gene or marker results from a report when relevant.
3. Start in Overview, titled `Review Priorities`.
4. Read the plain-language questions first.
5. Use the same Overview card for mechanism, expected change, review focus, monitoring focus, evidence/status, sources, and supporting detail.
6. Open Mechanisms, Genes + Metabolites, Timing + Levels, and Evidence for deeper inspection.

## Reviewer Console

Reviewer tooling remains hidden behind `?reviewer=1`. It is for QA, diagnostics, contribution workflows, raw paths, coverage gaps, and release-readiness review. Do not bring reviewer concepts into the normal public Medication Review.

## Design Goals

- Make the first screen feel like a working medication-review tool, not a landing page.
- Keep plain questions visible without hiding the detailed review context.
- Preserve patient-safe boundaries: not medical advice, not proof of safety, do not start/stop/change medicines alone, bring real gene reports, and unrecognized items are not checked here.
- Keep dense clinical information scannable through hierarchy, compact cards, tabs, source chips, and supporting-detail disclosure.
- Treat `viewMode` as Search/Browse only; it is not an audience or explanation-depth mode.

## Screens To Evaluate

- Empty public start.
- Warfarin + amiodarone Overview.
- Clopidogrel + omeprazole with CYP2C19 poor metabolizer.
- Codeine + fluoxetine with CYP2D6 poor metabolizer.
- Unknown or unrecognized selected items.
- Reviewer Console with `?reviewer=1`.
