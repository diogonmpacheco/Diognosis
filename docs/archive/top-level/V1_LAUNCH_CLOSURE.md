# Diognosis V1 Launch Closure

Generated: 2026-06-09

## Launch Position

Diognosis can launch with the MedCheck Engine as a public educational preview once the release gate passes and the site is pushed to GitHub Pages. The product should not claim professional data verification yet. The correct public framing is source-linked, pending professional review, and ready for external feedback.

## Data Integration Decision

- All 456 `STUDY_DB` entries have source identifiers.
- All 456 `STUDY_DB` entries are pending professional review.
- 295 launch-enrichment entries remain marked `reviewRequired:true` as an internal enrichment/scoring control.
- Internal launch-enrichment entries are calculation-bearing: support-key evidence feeds graph confidence and DDI evidence-profile calculations.
- 188 severe/critical interaction rows are linked only to pending-review evidence. These are intentionally kept in the public preview for feedback and discovery.
- 0 entries are currently marked as professionally reviewed.
- Evidence must stay visible inline with pending-professional-review badges and the panel-level professional-review notice.

## Fixed In This Closure Pass

- Replaced launch-facing `verified` and `curated` wording with source-linked / pending-review language.
- Added the severe/critical pending-only evidence count to the launch trust audit.
- Added Data Views audit coverage to the release gate.
- Added GitHub issue templates for external data review and app/UX feedback.
- Removed dead genotype evidence helper code that still encoded the old quarantine behavior.
- Added contextual report links on warning/evidence cards for external feedback.
- Added a deep launch QA audit for five less-common metabolite/genotype scenarios and stale-panel detection.
- Added `npm run launch:v1` as the single pre-push launch gate.

## Must Pass Before Publishing

Run:

```sh
npm run launch:v1
```

Expected result: all pass with no structural errors. Validation may still report pending-review evidence as informational output.

## Post-Launch Feedback Loop

- Ask reviewers to use the GitHub issue templates rather than unstructured comments.
- Prefer the contextual report links on warning/evidence cards because they include stack and evidence context.
- Prioritize the top launch trust audit items first: pregnancy/obstetric, transplant, CABG, stroke/neurocritical, dialysis/CKD, and tacrolimus/CYP3A5.
- Promote entries to professional-reviewed status only after source review by an appropriate pharmacist/physician/domain expert.

## Deferred Until After Public Preview

- Decide whether `index.html` remains committed or moves to deploy-time build output.
- Add golden-value numeric tests for PK and enzyme-capacity math.
- Integrate structured literature tools into enrichment for tier suggestions and faithfulness checks.
- Keep the vendored D3 and privacy/static audit in the release gate so the app remains free of routine third-party runtime requests.
