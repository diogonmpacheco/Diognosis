# Claude Design Brief: Diognosis V1 UI Redesign

Use this brief to redesign the Diognosis interface without changing the clinical logic, data model, or safety boundaries.

## Product Summary

Diognosis is a V1 medication-safety and pharmacogenomics review app. It helps people inspect a medicine list together with optional gene or marker results. The app looks for interaction signals, metabolite effects, gene-mediated risks, PK timing changes, pathway explanations, and source-linked evidence.

The product is not medical advice and not a clinical decision system. It is an educational and review-support tool that helps a patient, clinician, pharmacist, or reviewer see what should be discussed or verified.

Core idea: Diognosis should make complex medication safety easier to inspect without mixing three very different audiences:

- Patient: plain-language safety notes and questions to bring to a doctor or pharmacist.
- Clinician: deeper medication, gene, metabolite, timing, mechanism, and evidence review.
- Reviewer: data audit, source review, diagnostics, and contribution tooling. This should remain separate from V1 patient/clinician use.

## Current Live Product

Live app:
https://diogonmpacheco.github.io/Diognosis/

Local preview may be available at:
http://127.0.0.1:4173/index.html?audience=patient

Useful demo URLs:

- Patient mode: `index.html?audience=patient`
- Warfarin + ibuprofen: `index.html?substances=warfarin,ibuprofen&tab=overview`
- Clopidogrel + CYP2C19 poor metabolizer: `index.html?substances=clopidogrel,omeprazole&genotype=CYP2C19:PM&tab=genes-metabolites`
- Codeine + CYP2D6 poor metabolizer: `index.html?substances=codeine,fluoxetine&genotype=CYP2D6:PM&tab=genes-metabolites`
- Reviewer console only: add `&reviewer=1`

## Current App Menus And Screens

### Global Header

The top of the app currently contains:

- Product title: `Diognosis`
- Audience-specific tagline
- Audience toggle:
  - `Patient`
  - `Clinician`

The audience toggle is a presentation mode, not login or role-based access control.

### Add Items Area

Users can build a list with:

- Search input: medications, supplements, foods, and some non-drug actors.
- Search suggestions dropdown with close button.
- Mode toggle:
  - `Search by Name`
  - `Browse Categories`

Selected items appear in `My Medicine List` for patient mode or `Selected List` for clinician mode.

Each selected item is a removable chip. In clinician mode, some drugs expose dose-tier selectors. In patient mode, dose selectors are hidden to keep the view simpler.

### Gene / Marker Results

The optional gene panel sits directly below the selected list and must stay there.

Current labels:

- Patient: `Gene Results (optional)`
- Clinician: `Gene / Marker Results (optional)`

This panel lets users add known medication gene-test results or supported markers. It must be framed carefully:

- The user should not guess.
- It should be clear that this is only for results they already have.
- Gene results should stay close to the selected medicine list because they modify the meaning of the list.

### Summary Area

Once items are selected, a summary bar appears. It contains:

- A main summary title.
- A plain next-step prompt.
- A compact story of what was checked.
- Actions:
  - Patient: copy questions.
  - Clinician: copy handoff.
  - Share link.

### Patient Mode

Patient mode currently:

- Forces the app into Overview only.
- Hides the clinician tab navigation.
- Shows simpler labels like `Safety Notes`.
- Uses doctor/pharmacist language.
- Keeps the selected list and optional gene results at the top.
- Should not expose reviewer, raw evidence-review, or technical audit surfaces.

Design problem: Patient mode still feels too close to the clinician app. It needs to feel like a guided medicine-list safety preparation tool, not a technical dashboard.

### Clinician Mode

Clinician mode currently has five normal tabs:

1. `Overview`
   - Overall risk summary.
   - Ranked interaction findings.
   - High-priority concern cards.
   - Some historical/technical sections may exist but should not dominate the V1 experience.

2. `Mechanisms`
   - Finding why paths.
   - Substance network.
   - Pathway chains with drugs, enzymes, metabolites, transporters, and phenotypes.

3. `Genes + Metabolites`
   - Gene result effects.
   - Current pathway status.
   - Drug and metabolite balance.
   - Supporting metabolite details.
   - Downstream effects.
   - Combined side-effect burden.

4. `Timing + Levels`
   - PK simulation.
   - Persistence and washout.
   - Washout calendar.
   - Safety burden flags.

5. `Evidence`
   - Pending human-review enrichment.
   - External safety context.
   - Evidence ledger / evidence browser.

Design problem: Clinician mode has the right material but too much of it appears as stacked panels. It needs stronger prioritization, better scan paths, and fewer competing visual treatments.

### Reviewer Console

Reviewer Console is not part of normal V1.

It is hidden unless the URL has `?reviewer=1`.

When enabled, it adds a `Reviewer Console` tab with:

- Reviewer Summary.
- Scenario Snapshots.
- Metabolite Coverage Gaps.
- Review Workbench.
- Technical Pathways.
- Report / Contribute.
- Other legacy reviewer/contributor sections may exist behind the scenes.

Design requirement: Reviewer must stay visually and structurally separate from Patient and Clinician. Do not mix reviewer concepts into the normal V1 redesign.

## Current Technical Architecture

Diognosis is a static browser app.

Important architecture constraints:

- No backend.
- No accounts.
- No analytics.
- No cookies.
- No medication data collection.
- No routine third-party runtime requests.
- D3 is vendored locally for graph visualization.
- The app is built from editable source files into a generated root `index.html`.
- Work should happen in `src/`, not by editing the generated `index.html`.

Main source structure:

```text
src/
  index.template.html      App shell, CSS, layout placeholders
  main.js                  App startup, URL state, demo loading
  data/                    Drug, evidence, gene, metabolite, standards, and interaction data
  engine/                  Medication safety, PK, evidence, genotype, pathway, and finding logic
  ui/                      Rendering modules for each screen and panel
build.js                   Builds the final single-file app
```

The engine creates a normalized set of findings from:

- Pairwise drug interactions.
- Active and toxic metabolite direction.
- Functional gene status and phenoconversion.
- PK exposure shifts.
- Persistence and washout timing.
- Receptor and burden models.
- Evidence confidence and source links.

## Runtime Handoff Contract

The built app exposes a small redesign/wrapper API at:

```js
window.DIOGNOSIS_V1
```

Supported calls:

```js
window.DIOGNOSIS_V1.getState();
window.DIOGNOSIS_V1.addSubstance("Warfarin");
window.DIOGNOSIS_V1.removeSubstance("Warfarin");
window.DIOGNOSIS_V1.setAudience("patient"); // or "clinician"
window.DIOGNOSIS_V1.setTab("overview");
window.DIOGNOSIS_V1.render();
```

`getState()` returns:

- Version metadata.
- Current audience.
- Whether reviewer mode is enabled.
- Active tab.
- Selected substances.
- Summary title and next step.
- Current finding summaries.
- Counts.
- Share URL.

Design implication: a redesigned UI should use this facade where possible instead of scraping DOM internals.

## Current Visual Direction

The current palette is warm and orange:

- Background: warm cream.
- Cards: white / off-white.
- Accent: orange.
- Red, amber, green, blue, and purple are used for risk/status categories.

The current visual style is not final. The redesign can explore new visual language, but do not make one massive color change inside the existing app without presenting options first.

## Main UX Problems To Solve

1. Patient, clinician, and reviewer concepts have historically been too close together. Reviewer must be separated.
2. Patient mode is still too technical and should feel like a guided conversation-prep tool.
3. Clinician mode is too stacked and dense. It needs hierarchy, grouping, and faster scanning.
4. The current UI uses many panels with similar weight, making it hard to see what matters first.
5. The same result can appear in multiple places without clear summary/detail relationships.
6. Search, selected list, gene results, summary, and results need a cleaner flow.
7. Evidence and source links are important, but they should not overwhelm the first screen.
8. The app needs to feel trustworthy without pretending to be clinically validated.

## Non-Negotiables

- Keep Patient and Clinician distinct.
- Keep Reviewer Console separate and hidden unless reviewer mode is explicitly enabled.
- Keep Gene / Marker Results near the selected medication list.
- Do not make the first screen a marketing landing page.
- Do not claim the app is medical advice.
- Do not imply "no warning" means safe.
- Do not bury source/evidence access for clinician users.
- Do not design around only a few example cases; the layout must work for any medication stack.
- Do not require login or backend assumptions.
- Do not make the normal user handle raw reviewer/audit concepts.

## Requested Claude Design Output

Create four distinct UI/UX proposals for Diognosis V1. These should be product design proposals, not color-only themes.

Each proposal should include:

- Target primary user.
- First screen layout.
- Navigation model.
- How Patient and Clinician modes differ.
- Where selected medicines and gene results live.
- How findings are summarized.
- How evidence and mechanisms are accessed.
- Mobile behavior.
- Desktop behavior.
- What gets hidden or deprioritized.
- Main risk or tradeoff.

The four proposals should be genuinely different:

### Proposal A: Patient-First Safety Check

Optimize for a normal person preparing questions for a doctor or pharmacist.

Expected shape:

- Single guided page.
- Medicine list and optional gene results at top.
- Clear "what to ask" safety notes.
- Minimal jargon.
- No visible clinician tabs in patient mode.
- Share/copy questions prominent.

### Proposal B: Clinician Workbench

Optimize for a clinician or pharmacist reviewing a stack quickly.

Expected shape:

- Dense but clean two-column or three-column layout.
- Left rail for selected list and gene results.
- Main area for prioritized findings.
- Detail drawer or right panel for mechanisms, genes/metabolites, timing, and evidence.
- Strong source and confidence affordances.

### Proposal C: Report / Handoff Mode

Optimize for generating a shareable review summary.

Expected shape:

- Document-like layout.
- Top summary, selected list, gene context, top concerns, evidence status, next questions.
- Good print/export mental model.
- Works for patient questions and clinician handoff.
- Less exploratory, more final-output oriented.

### Proposal D: Mechanism Explorer

Optimize for the thing that makes Diognosis different: parent, metabolite, gene, enzyme, timing, and evidence reasoning.

Expected shape:

- Visual pathway-first interface.
- Finding cards connect to graph/timeline/evidence.
- Mechanisms and Timing are not buried behind many stacked panels.
- Best suited to clinician/research use, not patient-first use.

## Acceptance Criteria For The Redesign

A strong redesign should make these flows feel obvious:

1. Add two or more medicines.
2. Remove a selected medicine.
3. Add an optional gene result without guessing.
4. Switch between Patient and Clinician mode.
5. In Patient mode, understand what to ask a doctor/pharmacist.
6. In Clinician mode, see the top concern and open supporting mechanism/evidence detail.
7. Copy or share a useful summary.
8. Keep reviewer/audit tooling out of normal V1.

## Suggested Design Test Cases

Use these cases to check whether the design works:

- No selected medicines.
- One selected medicine.
- Warfarin + ibuprofen.
- Clopidogrel + omeprazole + CYP2C19 PM.
- Codeine + fluoxetine + CYP2D6 PM.
- Amitriptyline + diazepam + diphenhydramine + oxycodone.
- One unrecognized selected item.
- Patient mode on mobile.
- Clinician mode on desktop.
- Reviewer mode only with `?reviewer=1`.

## Tone And Content Direction

Patient language should sound like:

- "Questions to ask"
- "What this may mean"
- "Bring this to a doctor or pharmacist"
- "Do not change medicines based on this alone"

Clinician language can include:

- Mechanism.
- Expected direction.
- Affected actor.
- Metabolite balance.
- Phenoconversion.
- Evidence status.
- Monitoring focus.

Reviewer language should stay in Reviewer Console only:

- Coverage gap.
- Review queue.
- Scenario snapshot.
- Technical pathway.
- Source faithfulness.

## Final Instruction To Claude Design

Do not redesign Diognosis as a landing page. Design the actual working product screen.

The goal is not to make the existing panels prettier. The goal is to propose better information architecture for the same underlying engine: clear Patient mode, serious Clinician mode, and separate Reviewer mode.
