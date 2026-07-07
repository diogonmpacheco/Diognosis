# V1 CYP2D6 Edge-Case Review

Working review notes for CYP2D6 cases where simple "poor metabolizer means higher risk" wording is not enough.

## Boundary

Diognosis should separate these CYP2D6 patterns:

- Active-metabolite formation failure: codeine, tramadol, tamoxifen.
- Parent-exposure accumulation: metoprolol, nebivolol, atomoxetine, many antipsychotic or antidepressant contexts.
- Label-versus-mechanism tension: cases where parent exposure shifts, but labeling or guidelines do not establish an automatic genotype-only dose change.
- Phenoconversion: CYP2D6 inhibitors such as fluoxetine, paroxetine, bupropion, or quinidine can push functional activity lower, but inherited null/no-function status should not be phenoconverted again.

## Nebivolol

Current V1 position:

- CYP2D6 poor/null status can substantially raise parent nebivolol exposure.
- 4-hydroxy-nebivolol formation may fall at the same time.
- The app should treat this as monitoring/review context, not automatic dose-change advice.
- The summary should mention pulse, blood pressure, dizziness/syncope, breathing symptoms, dose tolerance, and CYP2D6 inhibitors.

Implemented guardrails:

- Drug-specific parent exposure fold remains capped at the current nebivolol-specific 15x monitoring context.
- CYP2D6 null preserves the reported `CYP2D6:null` token while calculating in the poor-metabolizer bucket.
- Inherited null status is not phenoconverted again by CYP2D6 inhibitors.
- Nebivolol copy must not inherit unrelated CYP2D6 examples such as codeine, tamoxifen, or TCAs.
- Public patient/clinician overview should show one clear nebivolol priority rather than duplicate cards.

## Other V1 CYP2D6 Cases

| Case | Required Framing | Current Status |
|---|---|---|
| Codeine | CYP2D6 PM/null can reduce morphine formation; UM can increase active-metabolite toxicity concern. | Covered by PGx comparison audit and source-linked action summary. |
| Tramadol | CYP2D6 PM/null can reduce O-desmethyltramadol formation; UM can increase opioid-active metabolite concern while parent serotonergic/seizure risks still matter. | Covered by PGx comparison audit and source-linked action summary. |
| Metoprolol | Parent exposure/hemodynamic monitoring; no genotype-only dose instruction. | Covered by PGx comparison audit and source-linked action summary. |
| Atomoxetine | Parent exposure can rise; monitor tolerability and indication-specific response. | Present in PGx Explorer; needs manual public Medication Review QA. |
| Tamoxifen | Active-metabolite/endoxifen formation can fall; oncology context and CYP2D6 inhibitors matter. | Present in PGx Explorer; needs manual public Medication Review QA. |
| Fluoxetine/paroxetine/bupropion inhibitors | Functional activity can fall through phenoconversion; inherited null should not be double-counted. | Covered by regression checks for null/phenoconversion behavior; needs manual UX review for wording. |

## Still Pending

- Manual public Medication Review QA for atomoxetine, tamoxifen, and inhibitor-driven phenoconversion.
- Decide whether CYP2D6 edge-case summaries need a compact "parent vs active metabolite" visual cue in V1 or can remain copy-only.
