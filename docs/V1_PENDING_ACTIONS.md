# Diognosis V1 Pending Actions

Working checklist for the remaining V1 product, data, and trust work. This is a planning file, not a launch claim.

## Recommended Next Block

Do items 1 and 2 together first, with a pharmacogenetics-focused review. The same pharmacogenetics agent should also review items 4, 5, and 6 because they all affect PGx interpretation, evidence trust, and pathway-vs-report boundaries.

### Pharmacogenetics Flow Started

Goal: keep PGx Explorer clinically honest by separating report-style PGx inputs from broad pathway exploration and medication-context review.

Flow:

1. Define surfaces before changing more UI
   - PGx Explorer: report-style gene or marker results that a patient might see on a PGx report.
   - Gene Coverage: data reach and exploration coverage, not risk ranking.
   - Future Pathway Explorer: broad CYP3A4/CYP3A5/UGT/transporter pathway context if PGx Explorer becomes too broad.

2. Lock the Gene Coverage safety explanation
   - Implemented: Gene Coverage now explains why broad pathway genes such as CYP3A4 can rank high.
   - Guardrail: wording must say this is not a patient-risk score, clinical-danger ranking, or proof that a pathway result is actionable by itself.

3. Review CYP3A4/CYP3A5 placement
   - Current V1 boundary: CYP3A4 is pathway context, not a report-style PGx selector entry.
   - Current V1 boundary: CYP3A5 stays in PGx Explorer for report-style expression results, especially tacrolimus.
   - Implemented: Gene Coverage links CYP3A4 into Review Questions instead of PGx Explorer until a dedicated Pathway Explorer exists.
   - Implemented: misleading CYP3A4 tacrolimus/CYP3A5 expression evidence row was removed from the CYP3A4 evidence bucket.
   - Pending: decide whether a dedicated Pathway Explorer is necessary for V1 or should stay post-V1.

4. Compare against external PGx expectations
   - Use a fixed 10-case comparison set.
   - Compare Diognosis output against CPIC, PharmGKB, PharmCAT-style output, and FDA/DailyMed label language where relevant.
   - Track whether Diognosis is missing a medication, overstating an action, or failing to explain parent/metabolite exposure.
   - Comparison set:
     - Clopidogrel + CYP2C19 PM/IM.
     - Codeine or tramadol + CYP2D6 PM/UM.
     - Metoprolol + CYP2D6 PM/IM.
     - Warfarin + CYP2C9/VKORC1/CYP4F2.
     - Simvastatin, atorvastatin, or rosuvastatin + SLCO1B1 reduced function.
     - Tacrolimus + CYP3A5 expresser.
     - Capecitabine or fluorouracil + DPYD reduced function.
     - Azathioprine, mercaptopurine, or thioguanine + TPMT/NUDT15 reduced function.
     - Irinotecan + UGT1A1 reduced function.
     - Rasburicase, primaquine, or dapsone + G6PD risk present.

5. Review CYP2D6 edge cases
   - Separate active-metabolite failure cases from parent-exposure accumulation cases.
   - Explicitly flag label-versus-mechanism tension when source labels say no adjustment but the mechanistic graph suggests exposure change.
   - Start with nebivolol, metoprolol, codeine, tramadol, atomoxetine, tamoxifen, and fluoxetine/paroxetine inhibitor contexts.

6. Decide Pathway Explorer minimum viable scope
   - Implemented decision note: `docs/V1_PATHWAY_EXPLORER_DECISION.md`.
   - V1 decision: do not build a dedicated Pathway Explorer yet.
   - Current V1 behavior: route broad pathway context through Gene Coverage -> Review Questions.
   - Revisit after manual QA if broad CYP3A4/CYP3A5/UGT/transporter context still feels confusing.

### Pharmacogenetics Agent Scope

Assigned items:

- 1. Decide CYP3A4/CYP3A5 placement
- 2. Add explanatory note to Gene Coverage
- 4. Compare PGx output to other PGx tools
- 5. CYP2D6 edge cases
- 6. Pathway Explorer

Agent brief:

Review whether Diognosis is presenting PGx results as report-style patient inputs, broad pathway coverage, or medication-context exploration. Pay special attention to CYP3A4/CYP3A5, CYP2D6 edge cases, label-versus-mechanism conflicts, and whether a separate Pathway Explorer is needed to keep PGx Explorer clinically honest.

## Highest Priority

1. Decide CYP3A4/CYP3A5 placement
   - Implemented V1 boundary: CYP3A4 is pathway context and no longer appears as a report-style PGx selector entry.
   - Implemented V1 boundary: CYP3A5 stays report-style for expression/tacrolimus context.
   - Pending: dedicated Pathway Explorer decision.

2. Add explanatory note to Gene Coverage
   - Implemented in UI: explains that high CYP3A4 coverage means broad data reach, not "most dangerous gene."
   - Implemented audit guard: wording must preserve the broad-pathway/not-risk/not-standalone-actionability boundary.
   - This is small but important for trust.

3. Formal QA matrix
   - Pending: test 10-20 medication + gene examples across Patient view, Clinician view, PGx Explorer, Gene Coverage, and shared URLs.
   - Current audits exist, but not a human-readable scenario matrix.

4. Compare PGx output to other PGx tools
   - Implemented: 10-example comparison set selected above.
   - Implemented: human-readable comparison matrix saved in `docs/V1_PGX_COMPARISON_MATRIX.md`.
   - Implemented: PGx Explorer audit coverage added for the 10 comparison families.
   - Pending: manual Patient and Clinician view QA for the same 10 cases.
   - Important for trust and calibration.

5. CYP2D6 edge cases
   - Implemented: CYP2D6 edge-case review note saved in `docs/V1_CYP2D6_EDGE_CASE_REVIEW.md`.
   - Implemented: nebivolol wording now separates parent exposure increase from lower 4-hydroxy-nebivolol formation while keeping the no automatic genotype-only dose-change boundary.
   - Pending: manual Patient and Clinician QA for atomoxetine, tamoxifen, and inhibitor-driven phenoconversion.
   - Pending: decide whether V1 needs a compact "parent vs active metabolite" visual cue or copy-only handling is enough.

## Product / UX Pending

6. Pathway Explorer
   - V1 decision: not implemented as a separate panel.
   - Broad CYP3A4/CYP3A5/UGT/transporter context uses Gene Coverage plus Review Questions for now.
   - Post-V1 option if manual QA shows the current surfaces are not enough.

7. PGx Profile presets/import
   - Current PGx Profile works manually.
   - Pending: easier input from a PGx report, templates, or structured import.

8. Data Views visual QA
   - Functionally repaired.
   - Still pending: mobile/desktop polish pass for PGx Profile chips, Gene Coverage table, and dense rows.

9. Patient/Clinician copy reduction
   - Some repetition has been improved, but not a full final copy audit.
   - Some panels may still have too much text.

10. Reviewer mode full redesign
   - Reviewer is hidden/separated now.
   - The dedicated reviewer product surface is not finished and is not V1.

## Data / Evidence Pending

11. Formal clinical validation
   - Not implemented intentionally.
   - App is source-linked/source-integrated, not professionally validated.

12. More reference facts
   - Reference layer exists, but only covers selected facts.
   - Pending: expand important interactions/PGx cases into LLM/search-readable reference pages.

13. Manual expert-style review simulation
   - Expert-style review was discussed.
   - Not completed as a formal review pass across all high-priority data.

## Architecture / Cleanup Pending

14. Script/package simplification
   - Some cleanup has happened, but not a full final simplification pass.
   - Still worth doing so the repo feels forkable and non-dev friendly.

15. Localization
   - Reverted/not ready.
   - Needs a real translation architecture later.

16. Real backend features
   - Not implemented: FHIR/EHR integration, real HIPAA backend, user accounts/RBAC, live API updates.
   - Current app is static/local-browser by design.

## Suggested Sequence

1. Pharmacogenetics review for items 1, 2, 4, 5, and 6.
2. Product QA matrix for item 3.
3. Data Views and copy polish for items 8 and 9.
4. Repo simplification for item 14.
5. Defer items 10, 11, 15, and 16 until after V1.
