# Diognosis Changelog

## Unreleased — 2026-06-04

### Launch Hardening

- Renamed the broader platform from the working name MedCheck to Diognosis, preserving MedCheck Engine as the first medication-safety module.
- Added a deep pre-v1 launch QA audit covering five uncommon/hard scenarios: thiopurine/allopurinol marrow toxicity, capecitabine/DPYD fluoropyrimidine toxicity, irinotecan/UGT1A1 SN-38 toxicity, G6PD oxidant hemolysis, and succinylcholine BCHE/RYR1 anesthesia risk.
- Made the launch QA audit assert panel hygiene: visible panels must render content and hidden panels must not retain stale text from previous stacks.
- Added contextual GitHub feedback links to warning and evidence cards so external reviewers can report data/evidence issues with stack and evidence context.
- Added the public trust model document and `npm run launch:v1` final launch gate.
- Updated launch audit, sitemap, release date, and generated stats to match the current bundle.
- Expanded CI from basic smoke checks to the full release gate, evidence ledger check, severity report freshness check, and genotype gap audit.
- Made the severity report deterministic by tying its generated header to the app release date instead of wall-clock time.
- Hardened the DNA / PharmGx importer for direct gene-to-status JSON profiles, short phenotype labels, underscore labels, and explicit skipped-row reporting.
- Added regression coverage for direct genotype profile imports across CYP, transporter, detox, and risk-marker examples.
- Added compact evidence-card badges for curated evidence versus entries that still need human review.

---

## v3.5.5 — 2026-06-03

### Launch Preparation: Trust, Provenance, And Local PharmGx Import

- Added local DNA / PharmGx report paste-in for supported phenotype and risk-allele rows.
- Synchronized legacy genotype state with the newer `activeGenotype` model so URL demos, manual selectors, PK/fold models, and imports agree.
- Quarantined unreviewed enrichment drafts and exposed verified vs review-pending evidence counts in generated stats.
- Added a severe-pair provenance evidence batch and linked severe DDI rows to structured evidence refs.
- Updated the local evidence ledger so strict validation covers the newly added PMIDs.
- Rebuilt README stats, release metadata, severity reports, and the generated single-file `index.html`.
- Release gate passes build, metadata, database audit, regression, smoke, strict validation, and whitespace checks.

---

## v3.4.0 — 2026-05-26

### Phase F: Weighted Propagating Confidence & Convergence Detection

**New engine additions in `src/engine/pathwayEngine.js`:**

**`EDGE_TYPE_BASE_WEIGHT`** — structural reliability weight per edge type, independent of evidence tier. Captures mechanistic certainty: `SUBSTRATE_OF=0.92` (biochemical fact), `INHIBITS=0.85`, `METABOLIZED_TO=0.88`, `PRODUCES=0.68` (probabilistic phenotype inference). This is a second layer on top of `computeEdgeConfidence()` which handles study-tier weighting.

**`PHENOTYPE_SEVERITY_WEIGHT`** — clinical urgency multiplier per phenotype node. Applied during impact scoring to prioritize life-threatening outcomes: `serotonin-syndrome-risk=1.6`, `qt-prolongation-risk=1.5`, `respiratory-depression-risk=1.5`, `seizure-risk=1.4`, `bleeding-risk=1.3`. Efficacy loss (`analgesia_phenotype=0.85`) ranks below harm pathways at equal confidence.

**`computeHopConfidences(eff, graph)`** — re-traces a traversal path and returns per-hop confidence objects: `{edgeConf, cumConf, fromName, toName, edgeType}` for each step. Used by the cascade renderer to display decay at every hop, not just the final terminal confidence.

**`rankPathsByImpact(effects)`** — scores each path as:
```
impactScore = confidence × severityWeight × geometricMean(edgeBaseWeights)
```
Geometric mean rewards short reliable paths over long uncertain ones. Validated:
- 80% conf → serotonin-syndrome-risk (severity 1.6) → impact 97
- 80% conf → analgesia_phenotype (severity 0.85) → impact 63

**`traverseWithConvergence(maxDepth)`** — runs `traverseEffects()` from all active source nodes (drugs + immediate metabolites), groups results by terminal node, and identifies **convergence points**: ≥2 independent drug sources reaching the same phenotype. Combined probability uses: `P = 1 − Π(1 − P_i)` (independent path OR formula). Returns `{bySource, convergencePoints, allEffects}`.

**`buildClinicalSummary()`** — single entry point for the cascade render layer. Integrates Phase B enzyme capacities, convergence detection, per-drug impact-ranked paths, and high-risk path extraction (confidence > 40% + severity ≥ 1.3). Returns `{drugSummaries, convergencePoints, allEffects, highRiskPaths, enzymeCapacities}`.

**Render update (`src/ui/renderCascade.js`):**
- **Section 1 — Convergence Alerts**: prominently shows multi-drug convergence to same phenotype with combined confidence, contributing drug list, and impact score
- **Section 2 — Per-drug paths**: grouped by drug, ranked by impact score, showing per-hop confidence badges (green ≥80%, amber 60–79%, red <60%)
- **Impact score badge** on each path card
- **Direction badge**: ↑ elevated / ↓ reduced concentration
- New CSS: `cs-convergence-card`, `cs-conv-*`, `cs-hop-conf`, `cs-impact-score`, `cs-dir-badge`, `cs-drug-group`, `cs-section-header`
- Graph stats footer now shows convergence point count

---

## v3.3.0 — 2026-05-26

### Phase E: Repeated-Dosing & Steady-State PK Simulator

**New engine functions in `src/engine/pkEngine.js`:**

**`PK_DOSE_INTERVALS`** — clinical dosing interval lookup table (hours) for all 15 PK_PARAMS drugs.

**`pkGetTau(drugName)`** — resolves dosing interval for a drug by name.

**`pkSteadyStateCurve(params, tau, nPoints)`** — exact Css(t) within one dosing interval using the superposition formula:
```
Css(t) = A·(ka/(ka−ke)) · [exp(−ke·t)/(1−exp(−ke·τ)) − exp(−ka·t)/(1−exp(−ka·τ))]
```
Degenerate case (ka ≈ ke) handled separately.

**`pkRepeatedDoseCurve(params, tau, nDoses, nPoints)`** — superposition of N single doses. Each point at global time T is the sum of all prior single-dose contributions: `C(T) = Σ C_single(T − n·τ)`.

**`pkSteadyStateMetrics(params, tau)`** — returns `{ cmax_ss, ctrough_ss, accum, tmax_ss, t_to_ss_h, t_to_ss_days }` where:
- `accum = R = 1/(1 − e^(−ke·τ))` — accumulation factor
- `ctrough_ss` — trough concentration at end of interval (just before next dose)
- `t_to_ss_days` — ~5 half-lives, the time to reach 97% of true steady state

Validation results:
```
Paroxetine:   R=2.07×, SS in 4.4 days  (t½=21h, τ=20h)
Fluoxetine:   R=3.7×,  SS in 11 days   (t½=53h, τ=24h)
Amiodarone:   R=58×,   SS in 200 days  (t½=960h, τ=24h — notorious tissue accumulator)
```

**`pkInteractionAdjustedParams(params, fold)`** — returns modified params with `halfLife × fold`. Returns `null` if fold ≤ 1.1 (no meaningful adjustment). Half-life extends proportionally to AUC increase (same Vd, reduced clearance model).

**`pkGetInteractionFold(drugName)`** — looks up `calcFold()` for the drug's primary CYP enzyme given the active stack. Returns fold for use in adjusted-curve display.

**Render update (`src/ui/renderPK.js`):**
- Displays **5-dose repeated-dosing buildup curve** instead of single-dose curve
- **Dashed Cmax_ss and Ctrough reference lines** overlaid on the SVG
- **Interaction-adjusted curve** shown in amber when a CYP inhibitor is active (with fold badge)
- **Metrics row**: accumulation factor R, SS Cmax, SS Ctrough, time to steady state
- Updated CSS: `pk-metrics`, `pk-int-badge`, `pk-int-metric`, `pk-note`, `pk-warning`, `pk-taper`, `pk-sex-range`, `pk-disclaimer`

**Build bugfix in `build.js`:** Switched template injection from `template.replace(placeholder, string)` to `template.replace(placeholder, () => string)`. The string form interprets `$&` in the replacement as "insert matched text", which corrupted `highlight()`'s `"\\$&"` regex call.

---

## v3.2.0 — 2026-05-26

### Phase B: Deterministic Enzyme Capacity Model

**New engine: `computeEnzymeCapacity(enzyme, stack)`**

Replaces the previous per-substrate fold-lookup with a full global enzyme state model. Returns a structured capacity object for every enzyme in the active stack.

Formula: `capacity_pct = 100 × genotypeFactor × Π(1/INH_MULT[inhibitor]) × Π(1/IND_MULT[inducer]) × (1 − substrateBurden)`

Fields returned: `enzyme`, `capacity_pct`, `genotype_factor`, `genotype_phenotype`, `inhibitors[]` (per-drug, per-mechanism breakdown), `inducers[]`, `substrate_burden`, `affected_substrates[]`, `limiting_factor` (plain-English), `clinical_note`, `confidence`.

Example outputs:
- CYP2D6 PM + Paroxetine + Fluoxetine → **1% capacity** (near-zero; all substrates at extreme risk)
- Rifampin → CYP3A4 **667% capacity** (strong induction; substrates under-dosed)
- Digoxin alone → CYP2D6 **100%** (P-gp substrate only; correct no CYP effect)

**New engine: `computeAllEnzymeCapacities(stack)`**

Aggregates all enzymes touched by the active stack, sorted by severity (most impaired first). Feeds into the Enzyme Burden UI section.

**`findInteractions()` updated**

Every interaction object now carries `enzymeCapacity: EnzymeCapacity | null` — the full capacity state for its affected enzyme. UI can show "CYP2D6 at 1% capacity (PM + Paroxetine MBI + Fluoxetine)" alongside the fold number.

**Verified by 9-test suite** (TC1–TC6: Paroxetine NM, PM+double-inhibitor, Rifampin induction, Digoxin CYP isolation, multi-enzyme stack sort, interaction annotation)

---

### Phase C: Receptor Occupancy Aggregation

**New data: `RECEPTOR_SCORES`** — per-drug receptor affinity scores (0–3 scale) for 11 receptors across ~55 drugs:
- SERT, NET, DAT (monoamine transporters)
- H1, M1, alpha1, D2 (receptor targets)
- hERG (cardiac K+ channel)
- GABA, muOp, MAO (synaptic/oxidase)

Sources: receptor binding Ki/IC50 data, clinical toxidrome criteria, FDA labels, PharmGKB profiles.

**New data: `SYNDROME_RULES`** — 8 clinical syndrome definitions with mathematical thresholds:
1. Serotonin Syndrome (SERT ≥3 + any MAO, or SERT ≥4)
2. NE Toxicity / Hypertensive Crisis (NET ≥4 or NET+MAO ≥2)
3. QTc Prolongation / TdP (hERG ≥3)
4. Anticholinergic Syndrome / Delirium (M1 ≥4)
5. CNS / Respiratory Depression (GABA + muOp ≥4)
6. Orthostatic Hypotension / Falls (alpha1 ≥4)
7. Excessive Sedation (H1 + GABA ≥5)
8. Dopaminergic Excess / Agitation (DAT ≥3 + MAO ≥1)

**New engine: `computeReceptorOccupancy(drugNames)`**

Returns cumulative burden across all receptors, per-drug breakdown, active syndromes with driving drugs named, receptor leaders (which drugs dominate each receptor), and plain-English summary with clinical action notes (Hunter Criteria for serotonin syndrome, Beers for anticholinergic, naloxone recommendation for opioid+benzo).

---

### Phase D: Evidence Normalization — Full Provenance Model

Severity may no longer be displayed without evidence provenance. All three new functions enforce this contract.

**New function: `normalizeEvidence(interaction, studies)`**

Produces a full `EvidenceProvenance` object from any interaction + its STUDY_DB entries:
- `sourceType` — best available study type
- `studyCount` — total supporting studies
- `confidence` — calibrated 0–1 weight (EVIDENCE_WEIGHT-based, with corroboration bonus)
- `reproducibility` — `'established'|'replicated'|'single'|'conflicting'`
- `humanData` — true if any clinical study supports it
- `genotypeSpecific` — true if evidence stratified by genotype
- `lastReviewed` — most recent supporting study year
- `contradictions` — directly contradicting study IDs
- `provenance_note` — human-readable summary string

**New function: `getEvidenceSummary(drug1, drug2, enzyme)`**

Returns a display-ready provenance string, e.g.:
`"3 studies (RCT, CLINICAL PK, IN VITRO) · AUC ×4.8 · Confidence 85% · Genotype-stratified · PMID:14730412"`

**New function: `assertEvidencedSeverity(severity, drug1, drug2, enzyme)`**

Safety guard: automatically downgrades `'severe'` → `'moderate'` if confidence < 30% and emits a console warning with full provenance. Prevents false-confidence severity inflation.

---

## v3.1.0 — 2026-05-26

### Phase A: Modularization & Build Infrastructure

The 10,299-line monolith has been split into a structured source tree with a reproducible build pipeline. The runtime distributable (`dist/index.html`) remains a single self-contained HTML file with no server dependency.

**Build toolchain**
- Installed esbuild 0.28.0 as dev dependency; added `npm run build` / `npm run build:min` scripts
- `build.js` — Node.js build script that concatenates 27 source modules in dependency order and injects the bundle into `src/index.template.html`, producing `dist/index.html`
- All 133 top-level identifiers verified present; syntax checked clean via `node --check`

**Source structure (`src/`)**

*Data layer (no cross-module deps within layer):*
- `data/constants.js` — ACTOR_TYPE, EDGE_TYPE, TISSUE_COMPARTMENT, EVIDENCE_TIER, EVIDENCE_WEIGHT, GENOTYPE_PHENOTYPE, INH_MULT, IND_MULT
- `data/drugs.js` — DRUG_DB (247 drugs), MEDCHECK_VERSION, BRAND_NAMES, DOSE_TIERS, getDrug
- `data/enzymes.js` — GENE_ENZYMES, PHARMGKB_EVIDENCE, ENZYME_ACTORS, CV_ESTIMATES, legacy genetics functions
- `data/metabolites.js` — METAB, SIDER_PD, METABOLITE_ACTORS (first-class graph entities)
- `data/transporters.js` — TRANSPORTER_DDI, TRANSPORTER_ACTORS
- `data/actors.js` — FOOD_ACTORS, ENDOGENOUS_ACTORS, RECEPTOR_ACTORS, PHENOTYPE_ACTORS
- `data/pharmacology.js` — TEMPORAL_PROFILES, PK_PARAMS, PHENOTYPE_SCORES, WASHOUT_DAYS, ACB_SCORES, BEERS_FLAGS
- `data/evidence.js` — STUDY_DB (40+ entries), INGESTION_QUEUE, evidence ingestion pipeline
- `data/interactions.js` — PATHWAY_DIVERSION, COMBINATION_PRODUCTS, KNOWN_DDI (188 pairs)

*Engine layer:*
- `engine/evidenceEngine.js` — evidenceConfidence, computeEdgeConfidence, resolveInteractionEvidence, studyCardHTML
- `engine/pathwayEngine.js` — buildInteractionGraph, traverseEffects, findInteractionChains, temporal profile accessors
- `engine/enzymeEngine.js` — getAllInhibitions, calcFold, computeGutExtraction, foldChangeBands
- `engine/pkEngine.js` — pkConcentration, pkCurve, genotypeAdjustedPK
- `engine/phenotypeEngine.js` — computePhenotypeAccumulation, phenotypeRiskLevel, computeWashoutCalendar
- `engine/scoringEngine.js` — computeAdverseBurden (ACB + Beers + fall risk)
- `engine/interactionEngine.js` — findInteractions, calcRisk, analyzeMetabolites

*UI layer:*
- `ui/renderCore.js` — addDrug/removeDrug, renderAll, renderMedList, search/browse
- `ui/renderInteractions.js` — interaction cards, fold bars, matrix, timing
- `ui/renderEvidence.js` — Evidence Explorer panel
- `ui/renderCascade.js` — Effect Cascade visualization
- `ui/renderAlternatives.js` — alternatives, genetics, combinations, transporters, metabolites
- `ui/renderGenotype.js` — Genotype panel (PM/IM/NM/UM selectors)
- `ui/renderPhenotype.js` — Phenotype Risk Accumulation panel
- `ui/renderPK.js` — PK Simulation panel
- `ui/renderGraph.js` — D3.js Interaction Network Graph
- `ui/renderBurden.js` — Washout Calendar + Adverse Burden panels
- `main.js` — bootstrap (event listeners, renderGenetics, renderAll, version display)

---

## v3.0.0 — 2026-05-23

### Phase 5: Engine Improvements — 10 new analytical systems

**New UI Panels**
- **PK Simulation** — one-compartment oral absorption model (C(t) = F×D/Vd × ka/(ka−ke) × (e^−ke·t − e^−ka·t)) with SVG concentration-time curves for 15 drugs; genotype-adjusted AUC display; sex-specific reference range bands for paroxetine
- **Genotype-Stratified Evidence** — PM/IM/NM/UM selector buttons per enzyme (CYP2D6, CYP2C19, CYP2C9); fold-change multipliers and population frequency sourced from CPIC guidelines; persistent East Asian CYP2D6*10 population warning when CYP2D6 is relevant
- **Phenotype Risk Accumulation** — serotonin load, QTc accumulation, anticholinergic burden, sedation, and fall risk scored individually per drug and summed across the stack, with color-coded risk cards and syndrome-specific clinical warnings (serotonin syndrome, TdP criteria)
- **Interaction Network Graph** — D3.js force-directed graph (v7.8.5) with drag, zoom, hover highlight, and node/edge coloring by ACTOR_TYPE and EDGE_TYPE; adaptive depth-limited subgraph centered on active drug stack
- **Washout Calendar** — computes safe-to-switch dates from WASHOUT_DAYS constants; proportional timeline bars; covers norfluoxetine (35d), amiodarone (90d), paroxetine (18d), rifampin (14d), bergamottin (3d), and more
- **Adverse Effect Burden** — Anticholinergic Cognitive Burden (ACB) scale, Beers Criteria 2023 flags for patients ≥65, sedation accumulation count, fall risk scoring; all rendered as a dedicated panel

**New Engine Functions**
- `computePhenotypeAccumulation()` — per-drug scoring against PHENOTYPE_SCORES lookup (serotonin/QTc/anticholinergic/sedation/fall_risk axes)
- `computeAdverseBurden()` — ACB_SCORES + BEERS_FLAGS lookup with summary interpretation
- `computeWashoutCalendar()` — integrates WASHOUT_DAYS and TEMPORAL_PROFILES; returns `{days, mechanism, note, safeDateStr}` per actor
- `pkCurve()` / `pkConcentration()` — one-compartment PK model with 15 drugs in PK_PARAMS; ke derived from halfLife
- `foldChangeBands()` — inter-individual CV% (from CV_ESTIMATES per enzyme) → log-normal ±1 SD bands
- `computeGutExtraction()` — two-step gut extraction: Fg = (1 − Emetab) × (1 − Etransporter)
- `setGenotype()` — runtime PM/IM/NM/UM state update per enzyme; triggers full re-render

**Data Constants Added**
- `GENOTYPE_PHENOTYPE` / `GENOTYPE_EFFECTS` — fold-change multipliers and population frequencies for CYP2D6, CYP2C19, CYP2C9 with full CPIC-sourced clinical notes
- `PK_PARAMS` — oral PK parameters (F, ka, halfLife, Vd, dose_mg) for 15 drugs
- `PHENOTYPE_SCORES` — serotonin/QTc/anticholinergic/sedation/fall_risk scores for ~30 drugs
- `ACB_SCORES` — Anticholinergic Cognitive Burden scale values for ~40 drugs
- `BEERS_FLAGS` — Beers Criteria 2023 flags for ~15 drug classes
- `WASHOUT_DAYS` — evidence-based enzyme recovery times for 8 persistent inhibitors/inducers
- `CV_ESTIMATES` — inter-individual coefficient of variation per CYP enzyme for variability bands

**STUDY_DB: 8 new real-world evidence entries (PubMed-sourced)**
- `ev_paroxetine_cyp2d6_rct` — Laine 2004, RCT, paroxetine 4.8× desipramine AUC (n=15, PMID 14730412)
- `ev_paroxetine_cyp2d6_invitro` — von Moltke 1995, in vitro Ki=2.0µM for CYP2D6 (PMID 7782485)
- `ev_ssri_cyp2d6_review` — Baumann 1996, SSRI CYP2D6 rank order (PMID 8968657)
- `ev_qtc_polypharmacy_ckd` — Sommer 2020, 29.5% QTc risk with ≥2 agents in CKD patients (PMID 32056163)
- `ev_methadone_qtc_polypharmacy` — Chowdhury 2015, methadone+QTc drugs observational (PMID 25825202)
- `ev_qtc_older_adults_review` — Zarowitz 2019, QTc polypharmacy in nursing facility residents (PMID 30747995)
- `ev_cyp2d6_codeine_genotype` — Zahari 2013, CYP2D6 genotype effects on codeine/tramadol (PMID 23759977)
- `ev_linezolid_ssri_serotonin` — Sola 2006, linezolid-SSRI serotonin syndrome case series (PMID 16529136)

**STUDY_DB: 2 ScienceDirect studies — pharmacogenomics not captured elsewhere**
- `ev_paroxetine_cyp2d6_japanese` — Ueda et al. 2006, *Progress in Neuro-Psychopharmacology*, n=55 Japanese patients. ~500× interindividual variation in steady-state paroxetine levels; CYP2D6*10 at 41.8% allele frequency makes most East Asian patients functional IMs. Concentration by functional allele count at 30mg quantified (76.7 / 150.9 / 243.6 ng/mL·mg⁻¹·kg⁻¹). DOI: 10.1016/j.pnpbp.2005.11.007
- `ev_paroxetine_ppk_sex_chinese` — Huang et al. 2025, *Journal of Pharmaceutical Sciences*, n=360 Chinese patients, 645 TDM observations. Sex-specific reference ranges: males 15–125 ng/mL, females 30–210 ng/mL. Nonlinear auto-inhibition kinetics confirmed at high doses. High-dose tapering strategy: 5mg/2-4 weeks (not standard 10mg/week). DOI: 10.1016/j.xphs.2025.103893

**Wiring and Cross-references**
- `endoxifen` METABOLITE_ACTOR: added `ev_paroxetine_cyp2d6_japanese` to evidenceRefs; updated note to warn that CYP2D6*10 prevalence in East Asians reduces endoxifen production even in non-PM patients — standard CPIC thresholds will miss this
- CYP2D6 IM phenotype description updated with Ueda 2006 data and Asian-specific note
- Paroxetine PK_PARAMS: added `sexSpecificRange`, `nonlinear`, `asianNote`, `taperNote` fields
- Washout calendar entry for paroxetine updated with high-dose tapering warning
- DXM+Paroxetine KNOWN_DDI: added `evidenceRefs` pointing to paroxetine/CYP2D6 studies

---

## v2.0.0 — 2026-05-22

### Phase 4: First-Class Evidence Entity System

- `EVIDENCE_TIER` enum (9 levels: IN_VITRO → FDA_LABEL)
- `EVIDENCE_WEIGHT` map (0.30–0.95) used by `computeEdgeConfidence()` and `traverseEffects()` decay
- `STUDY_DB` — 22 curated evidence entries with real PMIDs (where available), DOIs, quantified PK effects, phenotype stratification, temporal data, and explicit contradicts[] links
- Contradictory evidence modeled (Province 2014 meta-analysis vs CPIC tamoxifen guideline)
- `computeEdgeConfidence()` — tier-weighted evidence resolver replacing flat confidence strings
- `evidenceRefs[]` wired into 13 KNOWN_DDI entries and key METABOLITE_ACTORS
- `resolveInteractionEvidence()` — fuzzy match against STUDY_DB for any drug pair
- Evidence ingestion pipeline: `INGESTION_QUEUE`, `createStudyDraft()`, `reviewStudyDraft()` — human review required before publishing (safety constraint preserved)
- Evidence Explorer UI section with per-study cards and tier filtering
- Expandable per-interaction evidence panels in interaction cards

---

## v1.5.0 — 2026-05-20

### Phase 3: Graph-First Biochemical Engine

- Generalized actor model: `ACTOR_TYPE` enum (DRUG, METABOLITE, ENZYME, TRANSPORTER, FOOD, ENVIRONMENTAL, ENDOGENOUS, RECEPTOR, PHENOTYPE)
- `EDGE_TYPE` enum (SUBSTRATE_OF, INHIBITS, INDUCES, METABOLIZED_TO, TRANSPORTED_BY, COMPETES_WITH, ACTIVATES, BLOCKS, ACCUMULATES_IN, PRODUCES, SUPPRESSES)
- `TISSUE_COMPARTMENT` constants (PLASMA, LIVER, BRAIN, GUT, KIDNEY, ADIPOSE, PLATELET)
- `traverseEffects(startNodeId, maxDepth)` — DFS graph traversal with cycle protection (visitedKey set keyed actorId|depth), confidence decay, direction inference, temporal accumulation, 5% confidence pruning
- Metabolites as first-class entities in `METABOLITE_ACTORS{}` with own halfLife, inh[], potencyRatio, evidenceRefs
- 6 RECEPTOR_ACTORS (mu-opioid, 5-HT2A, D2, alpha1-adrenergic, MAO-A, PXR)
- 13 PHENOTYPE_ACTORS (analgesia, serotonin syndrome, respiratory depression, prodrug failure, etc.)
- `TEMPORAL_PROFILES` with onset/washout data for 9 key actors (norfluoxetine 5-week MBI, bergamottin 24-72h gut resynthesis, solanidine adipose depot release, etc.)
- `getEffectiveFraction()` — dynamic fractionModel replacing static fraction field
- Effect Cascade UI section — visual multi-hop pathway display

---

## v1.0.0 — 2026-05-05

- Initial release
- 247 drugs: Rx, OTC, supplements, herbs, recreational substances
- 104 metabolite cascades with full cross-referencing engine
- 188 known drug-drug interaction pairs
- 27 clinical fold-change entries from published PK studies
- Search and category browse modes
- Optional pharmacogenomics (CYP enzyme phenotype selection)
- Risk gauge, interaction cards, fold bars, interaction matrix
- Timing guidance and alternative suggestions
- Metabolite cascade visualization with cross-reference alerts
- PWA support (Add to Home Screen on iOS/Android)
- 100% client-side — no data collected, no server calls
