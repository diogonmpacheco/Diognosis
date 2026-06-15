# Curated Drafts

Curated drafts are a middle lane between raw staged enrichment and trusted source files.

A curated draft means:

- A maintainer checked the source identifier and basic source faithfulness.
- Drug, gene, metabolite, or evidence mapping was reviewed at a maintainer level.
- The summary is written in Diognosis wording rather than copied from protected text.
- Professional clinical review is still pending.
- The draft cannot affect scoring, public severity, or clinical-action confidence.

Staged records can become curated drafts with:

```bash
node scripts/enrich/promote-to-curated-draft.js --record candidate_...
```

Curated draft to source-file promotion is deliberately not automatic. It requires a separate future review action.
