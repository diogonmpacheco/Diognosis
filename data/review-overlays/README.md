# Review Overlays

Review overlays let a fork, clinic, specialty group, or university keep local review decisions separate from upstream Diognosis.

An overlay can label records as locally reviewed for that fork. It must not claim upstream professional review unless the upstream project explicitly adopts that review.

Run:

```bash
node scripts/audit/review-overlay-audit.js
```

The example overlay is intentionally non-operational: it shows shape and policy without approving any real staged record.
