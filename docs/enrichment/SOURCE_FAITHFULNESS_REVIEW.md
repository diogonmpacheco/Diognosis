# Source-Faithfulness Review

Source-faithfulness review answers a narrow question:

```text
Does this staged record faithfully reflect the cited source identifier, mapping, and direction?
```

It does not answer:

```text
Is this clinically correct, complete, or ready for medical use?
```

Record a maintainer check with:

```bash
node scripts/review/source-faithfulness-review.js \
  --record candidate_... \
  --decision checked_by_maintainer \
  --notes "Source identifier and directionality checked; still pending professional review."
```

The generated decision remains pending professional review and cannot affect scoring.
