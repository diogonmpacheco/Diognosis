# Mechanistic Curation Gap Audit

Generated: 2026-06-06T05:31:29.608Z

This internal audit is generated from MedCheck source data. It lists graph-derived curation gaps that are **not already represented by MedCheck's curated DDI, metabolite, genotype-metabolite, pathway-diversion, metabolite-actor, or evidence layers**. Treat every row as an enrichment task, not as a discovered interaction or clinical guidance.

## What Counts Here

- Metabolite-mediated candidates: a parent substance forms a metabolite, that metabolite inhibits or induces an enzyme/transporter, and another substance depends on that pathway. Basic parent-drug CYP matching is intentionally excluded.
- Genotype-metabolite candidates: a selected high-value genotype gene forms a modeled active/toxic metabolite, excluding relations already covered by curated metabolite evidence, pathway-diversion rules, metabolite actors, or direct genotype-metabolite rules.
- These entries are useful for enrichment searches and pharmacist/clinician review before any website promotion.

## Summary

- 0 metabolite-mediated candidate relations
- 9 genotype-metabolite candidate relations

## Metabolite-Mediated Candidates

_No candidates after excluding known parent-enzyme, curated DDI, metabolite-actor, pathway-diversion, and evidence-backed relations._

## Genotype-Metabolite Candidates

| Medication | Metabolite | Gene | Metabolite activity | Why it matters |
| --- | --- | --- | --- | --- |
| Diclofenac | 4'-Hydroxy-diclofenac | CYP2C9 | inactive | metabolite is toxic/safety-relevant |
| Cannabis (CBD) | 7-Hydroxy-CBD (7-OH-CBD) | CYP2C19 | active | metabolite is active or active-form context |
| Cannabis (THC) | 11-Hydroxy-THC (11-OH-THC) | CYP2C9 | active | metabolite is active or active-form context |
| Diazepam | Nordiazepam (desmethyldiazepam) | CYP2C19 | active | metabolite is active or active-form context |
| Diazepam | Oxazepam | CYP2C19 | active | metabolite is active or active-form context |
| Ketamine | Dehydronorketamine (DHNK) | CYP2B6 | active | metabolite is active or active-form context |
| PCP | PPC (1-(1-phenylcyclohexyl)-4-hydroxypiperidine) | CYP2B6 | active | metabolite is active or active-form context |
| Sertraline | N-Desmethylsertraline | CYP2B6 | active | metabolite is active or active-form context |
| Valproic Acid | 2-ene-VPA | CYP2C9 | active | metabolite is active or active-form context |

## Review Policy

Before promoting any row into evidence-backed warnings, look for public labels, CPIC/DPWG guidance, PubMed abstracts, Europe PMC, OpenAlex, Semantic Scholar, or open full text. If only the mechanism exists, keep it internal or in the experimental prediction layer.
