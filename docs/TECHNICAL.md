# MedCheck Technical Notes

This page keeps implementation details out of the README front page while preserving the architecture, build, and validation workflow for contributors.

## Architecture

MedCheck distributes as a single self-contained HTML file. All computation runs in the browser with no backend, no API, no accounts, and no persistent storage. D3.js is loaded from CDN for graph visualization.

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
?demo=ssri-switch
?demo=clopidogrel-cyp2c19
?demo=codeine-cyp2d6
?demo=statin-inhibitor
?demo=older-adult-burden
```

Hash links are also supported for static-hosting compatibility:

```text
#demo=ssri-switch
#clopidogrel-cyp2c19
```

Custom links can use:

```text
?drugs=Warfarin,Ibuprofen&tab=safety
?drugs=Codeine,Fluoxetine&genotype=CYP2D6:poor_metabolizer&tab=pgx
```

Supported tabs are `safety`, `pgx`, `pk`, and `evidence`.

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
