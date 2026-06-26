# V1 Pathway Explorer Decision

Decision: do not build a dedicated Pathway Explorer for V1.

## Why

The immediate product problem was CYP3A4 being presented like a report-style PGx result. That has been addressed without adding another public panel:

- PGx Explorer is for report-style gene or marker results.
- Gene Coverage is for data reach, not patient risk.
- Broad pathway genes such as CYP3A4 link from Gene Coverage into Review Questions as pathway-context review.

A full Pathway Explorer would add a fourth public Data Views surface. That may be useful later, but for V1 it risks adding more UI, more copy, and more review burden before the current panels have finished manual QA.

## V1 Boundary

Use Review Questions as the pathway-context surface for now.

Examples:

- CYP3A4 from Gene Coverage opens `data-views.html?view=action&action=CYP3A4`.
- CYP2D6, CYP2C19, CYP3A5, DPYD, TPMT, NUDT15, SLCO1B1, G6PD, and other report-style targets remain in PGx Explorer when they have modeled statuses or risk-marker statuses.
- Class placeholders, composite CYP route labels, and broad pathway-only rows should not become primary PGx selector entries.

## Revisit Criteria

Build a dedicated Pathway Explorer after V1 only if at least one of these becomes true:

- Users need to compare pathway roles across substrates, inhibitors, inducers, transporters, and metabolites in one place.
- Gene Coverage plus Review Questions is not enough to explain broad CYP3A4/CYP3A5/UGT/transporter context.
- Manual QA shows that broad pathway context is making PGx Explorer or Review Questions confusing.
- The product needs a visual pathway map that is clearly non-patient-specific and non-prescriptive.

## Minimum Future Scope

If built later, Pathway Explorer should stay educational and non-prescriptive:

- pathway selector
- relationship filter
- substrate/modulator/metabolite/transporter buckets
- medication links back into Diognosis review
- no patient score
- no dose recommendation
- no claim that broad pathway coverage means a gene result is actionable by itself

## Current Status

V1 uses the simpler boundary:

- report-style PGx: PGx Explorer
- data reach: Gene Coverage
- broad pathway context: Review Questions
