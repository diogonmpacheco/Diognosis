# Automated Source-Faithfulness Check

This check is intentionally narrow. It is not clinical review and it is not professional review.

It only confirms that a staged or candidate record has:

- a source identifier or API/label URL;
- at least one mapped Diognosis actor;
- a supported claim type;
- a clear direction or a direction-exempt claim type such as label metadata, PK, timing, metabolite role, or publication metadata;
- no blocked source surface and no stored protected full text.

Passing this check means the record may be considered for the **live pending-review curated preview** lane. It still carries:

- `reviewRequired: true`
- `professionalReviewStatus: "pending"`
- `notClinicalReview: true`
- `canAffectScoring: false` in the automated decision object

The separate promotion script is the only place that can create scoring-enabled live preview data, and the boundary audit must keep that data labeled as pending professional review.
