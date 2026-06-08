# MedCheck V1 Launch Closure

Generated: 2026-06-08

## Launch Position

MedCheck can launch as a public educational preview once the release gate passes and the site is pushed to GitHub Pages. The product should not claim professional data verification yet. The correct public framing is source-linked, pending professional review, and ready for external feedback.

## Data Integration Decision

- All 455 `STUDY_DB` entries have source identifiers.
- All 455 `STUDY_DB` entries are pending professional review.
- 294 launch-enrichment entries remain marked `reviewRequired:true` as an internal enrichment/scoring control.
- 188 severe/critical interaction rows are linked only to pending-review evidence. These are intentionally kept in the public preview for feedback and discovery.
- 0 entries are currently marked as professionally reviewed.
- Evidence must stay visible inline with pending-professional-review badges and the panel-level professional-review notice.

## Fixed In This Closure Pass

- Replaced launch-facing `verified` and `curated` wording with source-linked / pending-review language.
- Added the severe/critical pending-only evidence count to the launch trust audit.
- Added Data Views audit coverage to the release gate.
- Added GitHub issue templates for external data review and app/UX feedback.
- Removed dead genotype evidence helper code that still encoded the old quarantine behavior.

## Must Pass Before Publishing

Run:

```sh
node scripts/gen-stats.js
node build.js
node scripts/audit/data-views-audit.js
node scripts/audit/evidence-review-ui-audit.js
node scripts/smoke-check.js
node scripts/regression-check.js
node scripts/validate-db.js
node scripts/release-check.js
node scripts/check-evidence.js
```

Expected result: all pass with no structural errors. Validation may still report pending-review evidence as informational output.

## Post-Launch Feedback Loop

- Ask reviewers to use the GitHub issue templates rather than unstructured comments.
- Prioritize the top launch trust audit items first: pregnancy/obstetric, transplant, CABG, stroke/neurocritical, dialysis/CKD, and tacrolimus/CYP3A5.
- Promote entries to professional-reviewed status only after source review by an appropriate pharmacist/physician/domain expert.

## Deferred Until After Public Preview

- Decide whether `index.html` remains committed or moves to deploy-time build output.
- Add golden-value numeric tests for PK and enzyme-capacity math.
- Integrate structured literature tools into enrichment for tier suggestions and faithfulness checks.
- Replace CDN-loaded D3 with a vendored asset if zero third-party requests becomes a release requirement.
