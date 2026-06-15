# Review Status Model

Diognosis separates review into layers so enrichment can continue without implying clinical validation.

## Status Dimensions

- `discoveryStatus`: where the record is in the intake flow: discovered, staged, deduped, queued, or discarded.
- `sourceFaithfulnessStatus`: whether someone checked that the source identifier and summarized claim match the source. This is not clinical review.
- `curationStatus`: whether a record is raw external data, a candidate, a curated draft, a curated preview, promoted, rejected, or superseded.
- `professionalReviewStatus`: whether a clinician, pharmacist, specialist, or committee has reviewed the clinical meaning.
- `localReviewStatus`: whether a fork or local team has made a local decision.
- `scoringStatus`: whether a record is context-only or enabled by a future explicit review policy.
- `publicDisplayStatus`: how the record may be shown to users.

## Default For External Staged Records

```js
{
  discoveryStatus: "staged",
  sourceFaithfulnessStatus: "unreviewed",
  curationStatus: "candidate",
  professionalReviewStatus: "pending",
  localReviewStatus: "none",
  scoringStatus: "cannot_affect_scoring",
  publicDisplayStatus: "review_queue_only"
}
```

Maintainer source-faithfulness review can happen before professional review. It only means the cited source and local summary were checked for fidelity. It does not mean the clinical recommendation is reviewed.

Local/fork review overlays are scoped to the local team. Upstream Diognosis does not treat them as upstream professional review unless they are explicitly adopted through a separate process.
