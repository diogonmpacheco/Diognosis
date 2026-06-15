# Engine Hypotheses

Engine hypotheses are model-only review prompts generated from Diognosis coverage audits.

They answer questions such as:

- Which high-priority interaction pair lacks source-linked coverage?
- Which parent-metabolite relation needs source confirmation?
- Which PGx pair or risk marker is visible in external context but unsupported locally?
- Which drug lacks PK, washout, or active/toxic metabolite context?

They do not represent source truth. A hypothesis can only move forward after source discovery, source-faithfulness review, mapping review, and curated-draft review.

Generated file:

- `data/enrichment/candidates/candidate-engine-hypotheses.json`

Audit files:

- `docs/audits/engine-hypotheses.json`
- `docs/audits/engine-hypotheses.md`
