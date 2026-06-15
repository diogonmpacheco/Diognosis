# Knowledge Layers

Diognosis separates imported knowledge into review layers before anything can become core data.

| Layer | Purpose | Promotion boundary |
|---|---|---|
| identity | Drug names, aliases, classifications, and mapping hints | Cannot alter drug identity until reviewed |
| interaction | Candidate interaction events, warnings, and contraindication context | Cannot alter `KNOWN_DDI` or severity |
| parent_metabolite | Parent-metabolite relations, formation, clearance, roles, and persistence | Cannot alter `METAB` or active/toxic actor logic |
| enzyme_transporter | Candidate enzyme, transporter, pathway, and bottleneck facts | Cannot alter capacity or transporter scoring |
| pgx | Gene-drug, allele, marker, and recommendation candidates | Cannot alter genotype warnings |
| pk_timing | PK parameters, washout rules, temporal profiles, recovery, and induction offset | Cannot alter PK curves or washout display |
| safety_phenotype | Receptor, phenotype-burden, Beers, geriatric, renal/hepatic, pregnancy, and label context | Cannot alter risk score |
| evidence | Source identifiers, PMIDs, DOIs, tiers, and source-faithfulness work | Cannot become reviewed evidence without review metadata |
| engine_hypothesis | Model-only coverage prompts from local audits | Not source truth |

All candidate layers default to review-required, non-scoring, and non-severity-bearing. Professional review, source-faithfulness review, identity mapping, and curated-draft promotion remain separate actions.
