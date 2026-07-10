# Diognosis Design Brief

## Current V1 Direction

Diognosis now has one public **Medication Review** surface, presented as a connected signal-review workspace. The shell separates review setup from results, makes Review Priorities the visual anchor, and connects the main app to PGx Explorer, Reference, and Class Guides through persistent product navigation. The previous public explanation-depth split has been removed. Legacy `audience=` links still load for compatibility, but they behave as no-op legacy parameters and should disappear from generated/share URLs.

The public summary uses a transparent count of review priorities. It must not expose the internal 0–100 model score or score-derived labels. Model-score diagnostics may remain available only in Reviewer Console mode.

Selected medicines and gene results are synchronized after the URL `#` fragment, not in the query string, so the static host does not receive them in the request URL. The explicit share action must state that its link contains the selected medicines and gene results.

## Primary Public Flow

1. Add medicines, supplements, foods, or substances to the Medicine List.
2. Add real gene or marker results from a report when relevant.
3. Start in Overview, titled `Review Priorities`.
4. Read the plain-language questions first.
5. Use the same Overview card for mechanism, expected change, review focus, monitoring focus, evidence/status, sources, and supporting detail.
6. Open Mechanisms, Genes + Metabolites, Timing + Levels, and Evidence for deeper inspection.

## V1 Information Architecture

- **Product navigation:** Medication Review, PGx Explorer, Reference, and Class Guides.
- **Review setup:** one sticky rail for search/browse, the selected Medicine List, optional gene/marker results, and the local-data privacy boundary.
- **First run:** a plain-language product promise, a visual input-to-signal explanation, guided demo cases, and direct routes into gene exploration and medication class guides.
- **Review header:** the leading signal, affected inputs, a priority count, a compact exposure snapshot when available, and copy/share actions.
- **Overview:** plain-language questions first, followed by the detailed primary priority and supporting exposure context.
- **Supporting tabs:** Mechanisms, Genes + Metabolites, Timing + Levels, and Evidence retain the deeper model without competing with the first priority.

## Reviewer Console

Reviewer tooling remains hidden behind `#reviewer=1`. It is for QA, diagnostics, contribution workflows, raw paths, coverage gaps, and release-readiness review. Do not bring reviewer concepts into the normal public Medication Review.

## Design Goals

- Make the first screen feel like a working medication-review tool, not a landing page.
- Keep plain questions visible without hiding the detailed review context.
- Preserve patient-safe boundaries: not medical advice, not proof of safety, do not start/stop/change medicines alone, bring real gene reports, and unrecognized items are not checked here.
- Keep dense clinical information scannable through hierarchy, compact cards, tabs, source chips, and supporting-detail disclosure.
- Use semantic color only for signal meaning. The core visual identity is warm white, charcoal, and deep emerald; red, amber, and blue are reserved for clinical status or direction.
- Keep public trust visible in the shell: local/on-device status, source trail, limitations, and no opaque risk score.
- Preserve semantic landmarks, 44px touch targets, visible keyboard focus, reduced-motion support, and horizontal-safe navigation at mobile widths.
- Treat `viewMode` as Search/Browse only; it is not an audience or explanation-depth mode.

## Screens To Evaluate

- Empty public start.
- Warfarin + amiodarone Overview.
- Clopidogrel + omeprazole with CYP2C19 poor metabolizer.
- Codeine + fluoxetine with CYP2D6 poor metabolizer.
- Unknown or unrecognized selected items.
- Reviewer Console with `#reviewer=1`.
