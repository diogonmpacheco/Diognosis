# Review Overlays

Review overlays let a fork, clinic, specialty group, or university keep its own review decisions without changing upstream Diognosis truth.

An overlay may say:

```text
Locally reviewed by Example Psychiatry Review Team
```

It may not say or imply:

```text
Professionally reviewed by upstream Diognosis
```

## Rules

- Overlay decisions are local unless upstream explicitly adopts them.
- A fork can choose local display/scoring policy for its own deployment.
- Upstream Diognosis does not enable local overlay scoring.
- Overlay audits fail if a local review claims upstream professional review.

Use `data/review-overlays/example-local-review-overlay.json` as the starting shape and run `npm run audit:review-overlays` before committing overlay changes.
