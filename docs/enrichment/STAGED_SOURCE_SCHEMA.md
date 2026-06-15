# Staged Source Schema

All external enrichment enters Diognosis as `diognosis.staged-source.v1` records before any human can promote it into curated source files.

Required governance defaults:

```js
{
  reviewRequired: true,
  professionalReviewStatus: "pending",
  sourceFaithfulnessStatus: "unreviewed",
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
    canAffectScoring: false,
    canAffectPublicSeverity: false,
    canBeBundledPublicly: false,
    promotionTarget: null
  },
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

Validation fails when source/license/review fields are missing, when a staged record claims to be professionally reviewed, or when an unreviewed record can affect scoring or public severity.
