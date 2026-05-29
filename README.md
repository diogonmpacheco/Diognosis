# MedCheck — Drug Interaction Checker

Free, private drug interaction checker. Enter your medications and see how they interact — no accounts, no data collection, everything runs in your browser.

**Live:** [diogonmpacheco.github.io/medcheck](https://diogonmpacheco.github.io/medcheck/)

---

## What It Is

MedCheck started as a drug interaction calculator. It's now a systems pharmacology graph engine — a single HTML file containing a directed biochemical interaction graph with drugs, metabolites, enzymes, transporters, food compounds, receptors, and clinical phenotypes as equal actors. All reasoning is done client-side, with no server calls, no accounts, and no data collection.

The codebase is structured as 28 source modules in `src/` and assembled into a single deployable HTML file by `build.js`. Each module is independently editable; `npm run build` produces the distributable, `npm run smoke` runs a browser-level sanity check, `npm run regression` checks core pharmacology scenarios, and `npm run validate` reports provenance gaps without mutating the database.

---

## Features

### Drug Database
- **247 drugs** — prescription, OTC, supplements, herbs, recreational, and environmental substances
- Dose tiers, timing guidance, and alternative suggestions for each entry
- **Drug DB v1.2.2** — last reviewed 2026-05-29

### Biochemical Graph Engine
- **Unified actor model** — 9 node types: DRUG, METABOLITE, ENZYME, TRANSPORTER, FOOD, ENVIRONMENTAL, ENDOGENOUS, RECEPTOR, PHENOTYPE
- **11 edge types** — SUBSTRATE_OF, INHIBITS, INDUCES, METABOLIZED_TO, TRANSPORTED_BY, COMPETES_WITH, ACTIVATES, BLOCKS, ACCUMULATES_IN, PRODUCES, SUPPRESSES
- **Multi-hop traversal** — `traverseEffects()` performs depth-limited DFS across the graph with cycle protection, confidence decay per edge, and temporal modifier accumulation
- **Genotype reverse traversal** — `traverseFromGenotype()` starts from an enzyme phenotype and lists affected parent/metabolite actors, including low-confidence metabolite-only signals
- **Metabolites as first-class entities** — each metabolite has its own halfLife, potencyRatio, enzyme interactions, and evidenceRefs independent of its parent drug
- **Transporter modeling** — P-gp, OATP1B1, OCT2, BCRP, OAT1, OAT3, MATE1 at parity with CYP enzymes
- **Nonlinear PK** — auto-inhibition kinetics for paroxetine, fluoxetine, and other saturable substrates
- **Dynamic route fractions** — enzyme burden redistributed across residual pathways when one route is inhibited

### Evidence System
- **STUDY_DB** — 75 curated evidence entries with real PMIDs, DOIs, quantified PK effects (AUC fold, clearance reduction %), phenotype stratification, temporal onset/washout data, and explicit contradicts[] links
- **9-tier evidence hierarchy** — IN_VITRO → ANIMAL → CASE_REPORT → OBSERVATIONAL → CLINICAL_PK → RCT → META_ANALYSIS → GUIDELINE → FDA_LABEL
- **Evidence weights** — each tier carries a calibrated confidence weight (0.30–0.95) used by `computeEdgeConfidence()` to decay traversal confidence
- **Contradictory evidence** — explicitly modeled; Province 2014 meta-analysis vs CPIC tamoxifen guideline are both shown without suppression
- **Evidence Explorer** — browsable panel showing all STUDY_DB entries relevant to the current drug stack with tier filtering
- **Ingestion pipeline** — `createStudyDraft()` / `reviewStudyDraft()` with `INGESTION_QUEUE`; AI-extracted evidence cannot be auto-published without human pharmacist/physician review
- **Validation harness** — `npm run validate` compares the current bundle to local provenance ledgers and reports missing references, weak severe-claim provenance, and genotype-reference gaps

### Evidence Provenance (Phase D)
- **`normalizeEvidence()`** — builds a full `EvidenceProvenance` struct for every interaction: `sourceType`, `studyCount`, `confidence`, `reproducibility`, `humanData`, `genotypeSpecific`, `lastReviewed`, `contradictions[]`, `pmids[]`
- **`getEvidenceSummary()`** — returns a human-readable one-line summary, e.g.: `"3 studies (RCT, CLINICAL PK) · AUC ×4.8 · Confidence 85% · PMID:14730412"`
- **`assertEvidencedSeverity()`** — runtime safety guard: downgrades `'severe'` → `'moderate'` if computed evidence confidence falls below 30%, emitting a console warning; severity is never claimed without provenance
- **Retrieval ledger** — current curated PMIDs are bootstrapped in `scripts/reference-snapshots/evidence-ledger.json`; future evidence additions should come from deterministic retrieval logs
- **Safety contract**: no interaction is surfaced as "dangerous" without explicit specification of which pathway, which enzyme, which metabolite, which receptor, which evidence, and what confidence level

### Genotype-Stratified Evidence
- **PM / IM / NM / UM selectors** per enzyme (CYP2D6, CYP2C19, CYP2C9, CYP2B6, DPYD, TPMT, UGT1A1)
- AUC fold-change multipliers and population frequencies from CPIC guidelines
- Genetics-only preview lists affected actors even before a medication stack is added
- My Medications now shows compact parent/metabolite exposure chips when levels diverge
- Population-specific interpretation is deferred until ancestry examples are modeled consistently across multiple drugs and enzymes
- Genotype-adjusted concentration curves in the PK Simulation panel

### PK Simulation
- One-compartment oral absorption model for 15 drugs (paroxetine, fluoxetine, warfarin, clopidogrel, digoxin, amiodarone, methadone, and more)
- SVG concentration-time curves with Cmax markers and genotype-adjusted AUC scaling
- Nonlinear kinetics warning and high-dose tapering recommendation for paroxetine (5mg/2-4 weeks vs standard 10mg/week)

### Receptor Occupancy & Syndrome Detection (Phase C)
- **`RECEPTOR_SCORES`** — affinity profiles for 55+ drugs across 11 receptor/transporter targets: SERT, NET, DAT, H1, M1, alpha1, hERG, GABA-A, mu-opioid, D2, MAO
- **`computeReceptorOccupancy()`** — sums stack-wide occupancy per receptor, identifies the leading contributor per target, and evaluates 8 syndrome threshold rules
- **8 syndrome rules**: serotonin syndrome (SERT ≥ 3 with MAO co-activity, or combined score ≥ 4), QT prolongation (hERG ≥ 3), anticholinergic syndrome (M1 ≥ 4), CNS/respiratory depression (GABA + mu-opioid ≥ 4), sympathomimetic crisis (NET + DAT ≥ 5), sedative accumulation (H1 + GABA ≥ 5), dopamine suppression (D2 ≥ 4), noradrenergic excess (NET ≥ 4)
- Each triggered syndrome includes severity, mechanism, clinical note, and a per-receptor leader list

### Phenotype Risk Accumulation
- Per-drug scoring across 5 clinical risk axes: serotonin load, QTc accumulation, anticholinergic burden, sedation, fall risk
- Color-coded risk cards with contributing drug lists
- Syndrome-specific clinical warnings: serotonin syndrome criteria (clonus, hyperthermia), TdP risk factors (hypokalemia, female sex, bradycardia), CNS depression

### Adverse Effect Burden
- **Anticholinergic Cognitive Burden (ACB) scale** — scored for ~40 drugs; clinical interpretation (delirium risk, urinary retention) at ACB ≥ 3
- **Beers Criteria 2023** — flags for 15+ drug classes in patients ≥65 years
- Sedation accumulation count and fall risk scoring

### Washout Calendar
- Safe-to-switch dates computed from `WASHOUT_DAYS` constants and `TEMPORAL_PROFILES`
- Covers: norfluoxetine (35 days, MBI), amiodarone (90 days, tissue accumulation), paroxetine (18 days, MBI), rifampin (14 days, induction reversal), bergamottin (3 days, gut resynthesis), and more
- Proportional timeline bars; conservative clinical footnotes

### Interaction Network Graph
- D3.js v7 force-directed visualization of the active subgraph
- Nodes colored by ACTOR_TYPE; edges colored by EDGE_TYPE
- Drag, zoom, and hover-to-highlight neighborhood; adaptive depth expansion around active drugs

### Effect Cascade
- Visual multi-hop pathway display from `traverseEffects()` output
- Each chain shows: Source → edge → Node → ... → Phenotype with confidence percentage and temporal notes

---

## Architecture

MedCheck distributes as a single self-contained HTML file (~758 KB development build). All computation runs in the browser with no dependencies except D3.js (loaded from CDN for graph visualization). There is no backend, no API, and no persistent storage.

The source is structured as **28 modules** in `src/`, assembled in dependency order by `build.js`:

```
src/
  data/         constants, drugs, enzymes, metabolites, transporters,
                actors, pharmacology, evidence, interactions, rules
  engine/       evidenceEngine, pathwayEngine, enzymeEngine, pkEngine,
                phenotypeEngine, scoringEngine, interactionEngine
  ui/           renderCore, renderInteractions, renderEvidence,
                renderCascade, renderAlternatives, renderGenotype,
                renderPhenotype, renderPK, renderGraph, renderBurden
  main.js       bootstrap (calls renderAll on load)
  index.template.html  HTML shell with <script>/* MEDCHECK_BUNDLE */</script>
```

Build: `npm run build` → `index.html`  |  Smoke check: `npm run smoke`  |  Regression check: `npm run regression`  |  All checks: `npm run test`

### Enzyme Capacity Model (Phase B)
`computeEnzymeCapacity(enzyme, stack)` calculates net enzymatic capacity as:

```
capacity_pct = 100 × genotypeFactor × Π(1/INH_MULT) × Π(1/IND_MULT) × (1 − substrateBurden)
```

where `substrateBurden = min(0.50, (n_competing_substrates − 1) × 0.10)` and MBI inhibitors carry a 1.3× amplification factor. `computeAllEnzymeCapacities(stack)` returns all enzymes deviating from baseline (< 80% or > 130%), sorted by impairment. Every interaction returned by `findInteractions()` carries an `enzymeCapacity` annotation for its primary enzyme.

### Core Data Structures

| Constant | Purpose |
|---|---|
| `DRUG_DB` | Drug definitions with routes, inhibitions, inductions, props |
| `METABOLITE_ACTORS` | First-class metabolite entities |
| `METABOLITE_ACTOR_ALIASES` | Canonicalizes alternate metabolite names to detailed actor IDs |
| `HIGH_IMPACT_METABOLITE_RELATIONS` | Regression-checked active/toxic metabolite relations requiring provenance |
| `RECEPTOR_ACTORS` | Receptor nodes (mu-opioid, 5-HT2A, D2, etc.) |
| `RECEPTOR_SCORES` | Per-drug affinity scores across 11 receptor targets |
| `PHENOTYPE_ACTORS` | 13 clinical outcome nodes |
| `KNOWN_DDI` | Curated pairwise interaction entries with evidenceRefs |
| `STUDY_DB` | 75 primary evidence entities with full provenance |
| `GENOTYPE_EFFECTS` | PM/IM/NM/UM fold-change multipliers per enzyme |
| `PK_PARAMS` | One-compartment PK parameters for 15 drugs |
| `TEMPORAL_PROFILES` | Onset/washout profiles for persistent inhibitors |
| `WASHOUT_DAYS` | Evidence-based enzyme recovery timelines |
| `ACB_SCORES` / `BEERS_FLAGS` | Adverse burden lookup tables |

---

## How to Use

**Running the live app:**
1. Open `index.html` in any modern browser (or visit the live link above)
2. Search or browse to add your medications to the active stack
3. Review: interaction warnings, AUC fold predictions, risk gauge, metabolite cascades, effect pathway chains
4. Set your genotype (PM/IM/NM/UM) in the Genotype panel for personalized predictions
5. Check the Washout Calendar before switching medications
6. Use the Adverse Burden panel when prescribing for elderly patients

**Building from source:**
```bash
npm install          # installs esbuild (minification only)
npm run build        # → index.html (~612 KB, development)
npm run build:min    # → index.html (minified)
npm run smoke        # builds and verifies core UI/engine behavior
npm run regression   # checks core pharmacology scenarios
npm run validate     # non-mutating provenance/reference triage
npm run test         # smoke + regression + validation checks
```

The build concatenates all `src/` modules in dependency order and injects the bundle into `src/index.template.html`. Output is always `index.html` at the repo root (GitHub Pages compatible).

---

## Disclaimer

This tool is for **educational purposes only**. It does not replace professional medical advice, clinical pharmacist review, or therapeutic drug monitoring. AI hallucinations in pharmacology are dangerous — every STUDY_DB entry requires independent verification by a qualified pharmacist or physician before any clinical application. The evidence ingestion pipeline (`INGESTION_QUEUE`) enforces a mandatory human review gate; AI-extracted evidence is never auto-published. Always consult your doctor or pharmacist before making changes to your medications.
