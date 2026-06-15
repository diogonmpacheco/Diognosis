# Fork Review Teams

Forks can maintain specialty review overlays without changing upstream Diognosis.

## Psychiatry Team

Scope examples: SSRIs, SNRIs, TCAs, antipsychotics, CYP2D6, CYP2C19, QT, serotonin toxicity.

## Family Medicine Team

Scope examples: common outpatient drugs, NSAIDs, antihypertensives, anticoagulants, diabetes medicines.

## Transplant Clinic

Scope examples: tacrolimus, cyclosporine, sirolimus, everolimus, azoles, macrolides, rifamycins, CYP3A5.

## University Review Group

Scope examples: source-faithfulness review, committee clinical review, broad review policy, and periodic source updates.

## How To Use

1. Copy `data/review-overlays/example-local-review-overlay.json`.
2. Give the overlay a local team name and scope.
3. Add local review decisions.
4. Run `npm run audit:review-overlays`.
5. Display local review labels as local/fork-scoped.

Local overlays do not imply upstream endorsement.
