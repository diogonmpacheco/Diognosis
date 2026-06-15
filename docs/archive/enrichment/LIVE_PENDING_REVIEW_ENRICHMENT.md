# Live Pending-Review Enrichment

Diognosis can grow before professional review is available, but the live app must stay honest about what changed.

This lane is for source-linked, mechanically clear, mapped records that can be shown as an automated curated preview while still saying:

- source-linked does not mean professionally reviewed;
- automated curation does not mean clinical validation;
- every live preview record remains pending professional review.

## Lanes

| Lane | Purpose | Can appear live? | Can claim professional review? |
|---|---|---:|---:|
| Candidate only | Weak, unmapped, ambiguous, source-light, or engine-only records | Review surfaces only | No |
| Live pending-review curated preview | Source-linked, mapped, clear records that passed the automated traceability check | Yes, visibly labeled | No |
| Professionally reviewed | Future reviewer-signed records | Yes | Only with explicit review metadata |

## Live Gate

A record can enter live pending-review preview only when all are true:

1. It has a source identifier such as PMID, DOI, CPIC, ClinPGx, DailyMed/FDA, guideline, label URL, API object ID, or equivalent.
2. It maps to a Diognosis actor: drug, gene, metabolite, pathway, phenotype, risk marker, or class.
3. It has a supported claim type.
4. Direction is clear, or the claim type is direction-exempt metadata such as PK, timing, label metadata, publication metadata, or metabolite role.
5. The live wording is written in Diognosis’s own words.
6. It is tagged as pending professional review.
7. It passes the live enrichment boundary audit.

Engine-only hypotheses can remain useful in Review and gap dashboards, but they cannot become scoring-enabled live preview rows through this lane.

## Required Live Metadata

Every live preview record must include:

```js
{
  reviewRequired: true,
  professionalReviewStatus: "pending",
  sourceFaithfulnessStatus: "automated_source_check",
  curationStatus: "automated_curated_preview",
  clinicalValidationStatus: "not_validated",
  canAffectScoring: true,
  canAffectPublicSeverity: true,
  displayStatus: "source_linked_pending_professional_review"
}
```

The generated automated source-check decision remains non-scoring:

```js
{
  decision: "passed_traceability_check",
  stillPendingProfessionalReview: true,
  notClinicalReview: true,
  canAffectScoring: false
}
```

That separation keeps the pipeline clear: automated checks can recommend, the promotion script can bundle pending-review preview data, and professional review remains a future lane.

## Prohibited Source Surfaces

Do not use Sci-Hub, LibGen, pirate mirrors, copied protected full text, copied tables, copied figures, or full abstracts.

Use public metadata, API identifiers, label metadata, source URLs, and Diognosis-authored summaries.

## Public Wording

Use wording such as:

- source-linked pending review
- automated curated preview
- review prompt
- mechanism-supported
- label/guideline/literature candidate
- not medical advice

Do not use wording such as clinically validated, doctor approved, professionally reviewed, safe, unsafe, must avoid, or contraindicated unless future reviewer metadata explicitly supports that wording.
