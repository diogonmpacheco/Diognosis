# Candidate Relation Stores

Candidate stores live under `data/enrichment/candidates/`. They normalize staged source records into relation-shaped review work:

- drug identity and aliases
- interaction events
- parent-metabolite relations
- metabolite roles
- enzyme and transporter effects
- PGx rules and risk markers
- PK parameters and timing rules
- receptor, phenotype, geriatric, and label context
- evidence links
- engine hypotheses

These stores are not clinical data. They are reviewer worklists. Every row carries governance fields that keep it out of scoring and public severity until a reviewer verifies source faithfulness, mapping, directionality, evidence tier, and clinical wording.

The v2 grouped queue merges candidate stores into human-sized review groups while preserving the original enrichment queue as the pre-v2 baseline.
