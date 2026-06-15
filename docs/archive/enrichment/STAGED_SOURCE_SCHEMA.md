# Staged Source Schema

All external enrichment enters Diognosis as `diognosis.staged-source.v1` records before any human can promote it into curated source files.

Required governance defaults:

```js
{
  reviewRequired: true,
  professionalReviewStatus: "pending",
  sourceFaithfulnessStatus: "unreviewed",
  curationStatus: "candidate",
  scoringStatus: "cannot_affect_scoring",
  publicDisplayStatus: "review_queue_only",
  canAffectScoring: false,
  canAffectPublicSeverity: false
}
```

Staged records are review candidates. They are not clinical validation, do not change warning severity, and do not mutate `STUDY_DB`, `KNOWN_DDI`, `METAB`, genotype rules, scoring rules, or public recommendation text.

## Shape

```js
{
  id: "candidate_cpic_cyp2d6_codeine_pm_2026_06",
  schema: "diognosis.staged-source.v1",
  source: {
    name: "CPIC Data",
    sourceType: "structured_guideline",
    url: "https://api.cpicpgx.org",
    endpoint: "/recommendation",
    fetchedAt: "2026-06-15T00:00:00Z",
    license: "source-specific",
    licenseUrl: "",
    attribution: ""
  },
  claim: {
    claimType: "gene_drug_recommendation",
    genes: [],
    drugs: [],
    metabolites: [],
    pathways: [],
    phenotypes: [],
    riskMarkers: [],
    population: "",
    genotypeOrPhenotype: "",
    direction: "",
    affectedActors: [],
    mechanismSummary: "",
    clinicalSummary: ""
  },
  evidence: {
    pmids: [],
    dois: [],
    urls: [],
    sourceIdentifiers: [],
    strongestExternalTier: "",
    openAccess: {
      hasLegalOpenAccess: false,
      provider: "",
      license: "",
      url: ""
    }
  },
  mapping: {
    matchedDiognosisDrugs: [],
    unmatchedDrugs: [],
    matchedGenes: [],
    unmatchedGenes: [],
    matchedMetabolites: [],
    unmatchedMetabolites: [],
    matchedEvidenceRefs: [],
    possibleExistingRows: []
  },
  governance: {
    reviewRequired: true,
    professionalReviewStatus: "pending",
    sourceFaithfulnessStatus: "unreviewed",
    discoveryStatus: "staged",
    curationStatus: "candidate",
    localReviewStatus: "none",
    scoringStatus: "cannot_affect_scoring",
    publicDisplayStatus: "review_queue_only",
    canAffectScoring: false,
    canAffectPublicSeverity: false,
    canBeBundledPublicly: false,
    promotionTarget: null,
    promotionReadiness: "not_ready",
    reviewScopes: [],
    localReviewOverlays: []
  },
  provenance: {
    rawSourceCachePath: "",
    normalizedAt: "",
    normalizerVersion: "",
    sourceRelease: "",
    sourceSnapshotId: "",
    sourceObjectId: "",
    sourceObjectHash: "",
    sourceTruthStatus: "local_review_candidate_not_fetched",
    previousRecordId: "",
    supersedes: [],
    supersededBy: []
  },
  reviews: [],
  notes: [],
  warnings: []
}
```

## Helpers

The canonical helper module is `scripts/enrich/lib/staged-source-schema.js`.

It exports:

- `makeStagedSourceId(record)`
- `validateStagedSourceRecord(record)`
- `normalizeStagedSourceRecord(record)`
- `dedupeStagedSourceRecords(records)`
- `mergeStagedSourceRecords(existing, incoming)`

Validation fails when source/license/review fields are missing, when a staged record claims professional review without a review object, or when an unreviewed record can affect scoring or public severity.

`sourceTruthStatus` distinguishes local candidates from direct source cache records:

- `local_review_candidate_not_fetched`
- `fetched_from_source`
- `derived_from_open_targets_snapshot`

Source-faithfulness review, local overlay review, and professional review are separate. Source-linked does not mean clinically reviewed.
