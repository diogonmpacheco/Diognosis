# MedCheck Technical Notes

This page keeps implementation details out of the README front page while preserving the architecture, build, and validation workflow for contributors.

## Architecture

MedCheck distributes as a single self-contained HTML file. All computation runs in the browser with no backend, no API, no accounts, and no persistent storage. D3.js is loaded from CDN for graph visualization.

The central design principle is synergy: drugs, genes, metabolites, receptors, transporters, foods, and time are modeled as connected actors because the clinically interesting signal often emerges from the whole system rather than from isolated parts.

## Capability Surface

MedCheck currently models:

- Drug-drug interactions and known curated DDI pairs
- CYP and transporter substrate, inhibitor, and inducer pathways
- Pharmacogenomics across CYP2D6, CYP2C19, CYP2C9, CYP3A5, SLCO1B1, HLA risk alleles, G6PD, DPYD, TPMT, UGT1A1, NUDT15, and related genes
- Local DNA / PharmGx report paste-in for supported gene phenotype and risk-allele rows, as a report-row bridge rather than a raw DNA caller
- Parent/metabolite divergence for prodrugs and active or toxic metabolites
- PK curves with absolute parameters where available, plus relative-exposure fallback curves when only half-life data exists
- Receptor occupancy and syndrome-style burden detection
- Anticholinergic, sedative, fall-risk, Beers, and washout summaries
- Evidence browsing with review-required entries clearly separated

## Source Layout

The source is structured as editable JavaScript modules in `src/`, assembled in dependency order by `build.js`, alongside the generated stats file and HTML template:

```text
src/
  data/         constants, drugs, enzymes, metabolites, transporters,
                actors, pharmacology, evidence, interactions, rules
  engine/       evidenceEngine, pathwayEngine, enzymeEngine, pkEngine,
                pkRelativeEngine, phenotypeEngine, scoringEngine,
                interactionEngine
  ui/           renderCore, renderInteractions, renderEvidence,
                renderCascade, renderAlternatives, renderGenotype,
                renderPhenotype, renderPK, renderGraph, renderBurden
  main.js       bootstrap and URL demo loader
  index.template.html
```

`npm run build` produces `index.html` at the repo root for GitHub Pages.

## Core Data Structures

| Constant | Purpose |
|---|---|
| `DRUG_DB` | Drug definitions with routes, inhibitions, inductions, dose tiers, and alternatives |
| `METABOLITE_ACTORS` | First-class metabolite entities |
| `METABOLITE_ACTOR_ALIASES` | Canonicalizes alternate metabolite names to detailed actor IDs |
| `HIGH_IMPACT_METABOLITE_RELATIONS` | Regression-checked active/toxic metabolite relations requiring provenance |
| `RECEPTOR_ACTORS` | Receptor nodes such as mu-opioid, 5-HT2A, D2, hERG |
| `RECEPTOR_SCORES` | Per-drug affinity scores across receptor/transporter targets |
| `PHENOTYPE_ACTORS` | Clinical outcome nodes |
| `KNOWN_DDI` | Curated pairwise interaction entries with evidence refs |
| `STUDY_DB` | Evidence entities with provenance and review status |
| `GENOTYPE_EFFECTS` / `GENOTYPE_RISK_EFFECTS` | Metabolizer fold-change and risk-allele rules |
| `PK_PARAMS` | One-compartment absolute PK parameters |
| `TEMPORAL_PROFILES` | Onset/washout profiles for persistent inhibitors and inducers |
| `WASHOUT_DAYS` | Evidence-based enzyme recovery timelines |
| `ACB_SCORES` / `BEERS_FLAGS` | Adverse burden lookup tables |

## Biochemical Graph Engine

The graph uses a unified actor model across drugs, metabolites, enzymes, transporters, foods, endogenous actors, receptors, and phenotypes.

Supported edge types include:

- `SUBSTRATE_OF`
- `INHIBITS`
- `INDUCES`
- `METABOLIZED_TO`
- `TRANSPORTED_BY`
- `COMPETES_WITH`
- `ACTIVATES`
- `BLOCKS`
- `ACCUMULATES_IN`
- `PRODUCES`
- `SUPPRESSES`

`traverseEffects()` performs depth-limited traversal across the graph with cycle protection, confidence decay, and temporal modifier accumulation. `traverseFromGenotype()` starts from an enzyme phenotype and lists affected parent and metabolite actors.

## Evidence System

`STUDY_DB` entries use a 9-tier hierarchy:

```text
IN_VITRO -> ANIMAL -> CASE_REPORT -> OBSERVATIONAL -> CLINICAL_PK
-> RCT -> META_ANALYSIS -> GUIDELINE -> FDA_LABEL
```

Each tier carries a calibrated confidence weight used by `computeEdgeConfidence()`. Contradictory evidence can be modeled directly rather than suppressed.

Important evidence helpers:

- `normalizeEvidence()`
- `getEvidenceSummary()`
- `assertEvidencedSeverity()`
- `createStudyDraft()`
- `reviewStudyDraft()`

Live enrichment entries should remain marked `reviewRequired:true` until checked by a qualified human reviewer.

Enrichment can use public factual signals from PubMed abstracts, DOI metadata, FDA/EMA labels, CPIC/DPWG guidance, Europe PMC/OpenAlex/Semantic Scholar metadata, and Unpaywall open-access status. A paper being paywalled does not make its public facts unusable. It only means MedCheck should not copy protected wording, tables, figures, full abstracts, or full-text-only values. Drafts based on public-only signals can support qualitative context, while `needsFullTextForPrecision:true` marks records where exact quantitative rules need a licensed/open full text or another public source.

## Enzyme Capacity Model

`computeEnzymeCapacity(enzyme, stack)` calculates net enzymatic capacity:

```text
capacity_pct = 100 x genotypeFactor x product(1 / INH_MULT)
               x product(1 / IND_MULT) x (1 - substrateBurden)
```

`substrateBurden = min(0.50, (n_competing_substrates - 1) x 0.10)`.

Mechanism-based inhibitors carry a 1.3x amplification factor. `computeAllEnzymeCapacities(stack)` returns enzymes deviating from baseline, sorted by impairment.

## PK Models

MedCheck has two PK paths:

- Absolute one-compartment PK for drugs with `PK_PARAMS`
- Relative exposure fallback for drugs with half-life data but incomplete absolute F/ka/Vd/dose parameters

The relative fallback normalizes curves against a no-interaction, normal-metabolizer single-dose reference peak. It is intended for directionality and comparison, not calibrated concentration prediction.

## URL Demo Loader

The live app supports preloaded examples:

```text
?substances=paroxetine,fluoxetine&tab=safety
?substances=clopidogrel,omeprazole&genotype=CYP2C19:poor_metabolizer&tab=pgx
?substances=codeine,fluoxetine&genotype=CYP2D6:poor_metabolizer&tab=pgx
?substances=simvastatin,clarithromycin&tab=pk
?substances=amitriptyline,diazepam,diphenhydramine,oxycodone&tab=safety
```

Legacy named demos and hash links are also supported for static-hosting compatibility:

```text
?demo=ssri-switch
#demo=ssri-switch
#clopidogrel-cyp2c19
```

Custom links should use `substances=`. The older `drugs=` and `medications=` names remain accepted as aliases.

```text
?substances=warfarin,ibuprofen&tab=safety
?substances=codeine,fluoxetine&genotype=CYP2D6:poor_metabolizer&tab=pgx
```

Supported tabs are `safety`, `pgx`, `pk`, and `evidence`.

## DNA / PharmGx Report Import

The pharmacogenomics panel includes a local paste-in importer for report-style gene rows. It is meant as the first integration step toward external DNA/report projects such as ClawBio, not as a raw DNA variant caller.

Accepted inputs:

- ClawBio-style Markdown/table rows, for example `CYP2C19 | *1/*2 | Intermediate Metabolizer`
- Simple CSV or tab-separated rows containing a supported gene/risk marker and a phenotype/status
- JSON arrays, or JSON objects with `gene_profiles`, `geneProfiles`, `genes`, or `results`

The importer maps supported metabolizer phenotypes into `GENOTYPE_EFFECTS` (`poor_metabolizer`, `intermediate_metabolizer`, `normal_metabolizer`, `ultrarapid_metabolizer`) and supported risk markers into `GENOTYPE_RISK_EFFECTS` (`risk_allele_present` / `risk_allele_absent`). Current examples include CYP2D6, CYP2C19, CYP2C9, CYP3A5, SLCO1B1, HLA-B*15:02, HLA-B*57:01, HLA-B*58:01, G6PD deficiency, and related modeled markers.

All parsing runs in the browser. Nothing is uploaded, stored, or sent to an API.

Future raw-DNA integration should stay separate from MedCheck's clinical display layer: a report generator should call star alleles and risk markers from 23andMe/Ancestry-style files, then pass only normalized gene phenotype/status rows into this importer or a future equivalent structured API.

Backlog: accept direct gene-to-status JSON objects such as `{ "CYP2D6": "PM", "CYP3A5": "non_expresser" }`, normalize short labels and underscore-style function labels, and report unsupported rows instead of silently skipping them.

## Build And Validation

```bash
npm install
npm run build
npm run build:min
npm run smoke
npm run regression
npm run validate
npm run release:check
npm run test
```

The release gate rebuilds the bundle, verifies README/version metadata, runs database audit, regression, smoke, strict validation, and whitespace checks.

## Genotype Gap Audit

```bash
npm run audit:genotype-gaps
node scripts/audit/genotype-gap-audit.js --catalog-dir /path/to/local-pgx-catalog
```

The genotype gap audit reads MedCheck source text, lists every referenced gene/enzyme/transporter, compares that list with `GENOTYPE_EFFECTS` and `GENOTYPE_RISK_EFFECTS`, then scores missing panels by estimated clinical consequence of the null. If a local external PGx catalog is supplied, it also classifies catalog genes as covered, modeled without a panel, or absent from MedCheck.

Generated reports are written to `scripts/audit/genotype-gap-report.json` and `scripts/audit/genotype-gap-report.md`.

## Release Checklist

1. Update `MEDCHECK_VERSION` in `src/data/drugs.js` when app behavior changes.
2. Update Drug DB version/date when curated data changes.
3. Run `npm run release:check`.
4. Commit source changes plus rebuilt `index.html`.
5. Push `main` to GitHub Pages.

## Safety Contract

No interaction should be presented as clinically final without enough provenance to explain:

- the affected pathway
- the enzyme, transporter, receptor, metabolite, or phenotype involved
- the expected direction of effect
- the evidence basis
- whether human review is still required
