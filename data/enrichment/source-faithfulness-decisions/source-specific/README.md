# Source-Specific Review Decisions

This folder is for human source-faithfulness decisions that are specific to a provider lane such as CPIC, ClinPGx, DailyMed, or literature metadata.

Generated templates live in `source-specific-review-templates.json`. Copy one template into `decisions/`, complete the provider-specific checks, and set `decision` to `approve_curated_draft`, `keep_context`, `reject_source`, `needs_more_review`, or `superseded`.

These decisions are not professional clinical review. They may create curated drafts only, and those drafts must remain:

- `professionalReviewStatus: "pending"`
- `canAffectScoring: false`
- `canAffectPublicSeverity: false`

Run `npm run enrich:source-specific-promotions` after editing decisions.
