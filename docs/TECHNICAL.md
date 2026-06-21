# Diognosis Technical Notes

This page keeps implementation details out of the README front page while preserving the architecture, build, and validation workflow for contributors.

## Architecture

Diognosis models medication stacks as connected parent-metabolite-gene systems. The engine combines curated DDI pairs, parent/metabolite directionality, functional enzyme status, PK and washout timing, pathway graph traversal, receptor/phenotype burden, and source-linked evidence confidence into normalized interaction findings.

Status: V1 candidate, source-linked, under active validation, not professionally signed off, and not medical advice.

Diognosis currently ships as a single self-contained HTML file. All computation runs in the browser with no backend, no API, no accounts, no analytics, and no medication-data collection. D3.js is vendored locally and bundled at build time for graph visualization.

The central design principle is reviewable mechanism visibility: drugs, genes, metabolites, receptors, transporters, foods, evidence, and time are modeled as connected actors because the important signal often emerges from the whole system rather than from isolated parent-drug names.

## Capability Surface

Diognosis currently models:

- Drug-drug interactions and curated pairwise DDI rows
- CYP and transporter substrate, inhibitor, and inducer pathways
- Pharmacogenomics across CYP2D6, CYP2C19, CYP2C9, CYP3A5, SLCO1B1, HLA risk alleles, G6PD, DPYD, TPMT, UGT1A1, NUDT15, BCHE, and related genes
- Local DNA / PharmGx report paste-in for supported gene phenotype and risk-marker rows, as a report-row bridge rather than a raw DNA caller
- Parent/metabolite divergence for prodrugs, active metabolites, toxic metabolites, inactive clearance metabolites, and active-moiety uncertainty
- Functional enzyme status after inherited genotype, inhibitors, inducers, and substrate burden are considered
- PK curves with absolute parameters where available, plus relative-exposure fallback curves when only half-life data exists
- Parent persistence, active/toxic metabolite persistence, washout rules, enzyme recovery, and induction offset
- Receptor occupancy and syndrome-style burden detection
- Anticholinergic, sedative, fall-risk, Beers, and washout summaries
- Evidence browsing, evidence confidence ladders, and review diagnostics with V1 source-integrated evidence and separate v3 professional sign-off metadata

## Source Layout

The source is structured as editable JavaScript modules in `src/`, assembled in dependency order by `build.js`, alongside generated data modules and the HTML template:

```text
src/
  data/
    constants, rules, drugs, enzymes, metabolites, transporters,
    actors, pharmacology, evidence, clinical standards, interactions, generated stats,
    generated evidence review queues, Open Targets snapshots,
    generated review diagnostics
  engine/
    evidenceEngine
    evidenceConfidenceEngine
    pathwayEngine
    enzymeEngine
    pkEngine
    pkRelativeEngine
    phenotypeEngine
    scoringEngine
    interactionEngine
    activeMoietyEngine
    phenoconversionEngine
    persistenceTimelineEngine
    findingEngine
    warningPathEngine
    mechanisticPredictionEngine
  ui/
    renderSafe
    renderCore
    runtimeFacade
    renderInteractions
    renderMechanisticPredictions
    renderEvidence
    renderExternalSafetyContext
    renderOpenTargetsReviewWorkbench
    renderActiveMoiety
    renderPhenoconversion
    renderPersistenceTimeline
    renderWhyPath
    renderReview
    renderCascade
    renderAlternatives
    renderGenotype
    renderPhenotype
    renderPK
    renderGraph
    renderBurden
  main.js
  index.template.html
```

`npm run build` produces `index.html` at the repo root for GitHub Pages. Work should happen in `src/`; the root `index.html` is generated.

## Core Data Structures

| Constant | Purpose |
|---|---|
| `DRUG_DB` | Drug definitions with routes, inhibitions, inductions, dose tiers, alternatives, and safety context |
| `METAB` | Parent-to-metabolite rows used for metabolite display and active-moiety reasoning |
| `METABOLITE_ACTORS` | First-class metabolite entities with active/toxic role metadata |
| `METABOLITE_ACTOR_ALIASES` | Canonicalizes alternate metabolite names to detailed actor IDs |
| `GENOTYPE_METABOLITE_EFFECTS` | Gene-to-metabolite effect rows for prodrug activation, toxic accumulation, and active-metabolite direction |
| `HIGH_IMPACT_METABOLITE_RELATIONS` | Regression-checked active/toxic metabolite relations requiring provenance |
| `ENZYME_ACTORS` / `TRANSPORTER_ACTORS` | Pathway actors used by graph, capacity, and transporter views |
| `RECEPTOR_ACTORS` / `RECEPTOR_SCORES` | Receptor and phenotype-burden model inputs |
| `PHENOTYPE_ACTORS` | Clinical outcome nodes |
| `KNOWN_DDI` | Curated pairwise interaction entries with evidence refs |
| `COMBINATION_PRODUCTS` | Additive and combination-product warnings |
| `STUDY_DB` | Evidence entities with provenance and review status |
| `EXTERNAL_SUBSTANCE_MAPPINGS` | Local ingredient-level RxNorm crosswalk rows for selected standardized medication identity |
| `PGX_MARKER_MAPPINGS` | Star-allele, dbSNP, and HLA labels used to explain supported gene/marker inputs |
| `PGX_ACTION_SUMMARIES` | Review-gated CPIC-linked action context, evidence refs, and safety boundaries |
| `GENOTYPE_EFFECTS` / `GENOTYPE_RISK_EFFECTS` | Metabolizer fold-change and risk-marker rules |
| `PK_PARAMS` | One-compartment absolute PK parameters |
| `TEMPORAL_PROFILES` | Onset/offset profiles for persistent inhibitors and inducers |
| `WASHOUT_DAYS` | Evidence-based enzyme recovery timelines |
| `ACB_SCORES` / `BEERS_FLAGS` | Adverse burden lookup tables |
| `REVIEW_DIAGNOSTICS` | Static scenario snapshot and coverage-gap summaries shown in the hidden Reviewer Console |

## Reasoning Layers

### Normalized Interaction Findings

Purpose: unify pairwise DDI rows, combination burden, active-moiety rows, phenoconversion rows, timing rows, and other major warning signals into ranked finding cards.

Input data: `calcRisk()` interactions, `COMBINATION_PRODUCTS`, active-moiety rows, phenoconversion rows, persistence rows, and evidence refs.

Output shape: finding objects with `id`, `type`, `severity`, `confidence`, `summary`, `affectedActors`, `evidenceRefs`, `reviewRequired`, `whyPath`, `evidenceLadder`, `sourceRows`, and optional grouped findings.

UI placement: Overview shows ranked finding cards; Mechanisms explains them; Evidence details support; the hidden Reviewer Console exposes raw path objects and technical tables.

Review/safety limitations: findings are educational screening signals. They are not clinical decisions and should not be treated as final severity judgments without appropriate professional judgment.

V1 trust contract: each public Overview finding is normalized into a reusable trust contract with concern category, affected actors, mechanism, expected change, clinical concern, confidence, evidence status, patient-safe action, clinician action, and limitation status. Source-linked finding cards expose direct source chips when public identifiers are available, or a jump to the Evidence ledger otherwise. Finding cards also include a bounded symptom/monitoring discussion guide: Patient mode phrases it as what to mention if present, while Clinician mode lists monitoring focus areas to review with dose, timing, labs, and clinical context. Empty/no-signal Overview states are also bounded: they say no major public concern was generated, name unrecognized selections when present, and provide patient/clinician next-step review prompts instead of implying safety. Reviewer-only scope and readiness details stay in the hidden Reviewer Console, while Patient and Clinician V1 keep the normal workflow focused on selected items, optional gene/marker results, and the relevant findings. The V1 handoff summary turns the same contract into a shareable text artifact with stack, scope, top concerns, evidence/status, standards identity coverage, monitoring focus, patient-safe boundaries, and share URL. The hidden Reviewer Console also exposes a V1 readiness snapshot for the current stack; it checks scope, contracts, source traceability, standards identity disclosure, action wording, handoff, safety boundaries, share state, and Audience Mode availability without claiming clinical validation. `scripts/audit/v1-finding-contract-audit.js` checks this contract, direct source traceability, scope wording, and handoff summary across broad data-derived stacks, then sweeps every recognized shipped `KNOWN_DDI` pair for a complete public contract. `scripts/audit/v1-pgx-contract-audit.js` checks every supported CPIC-linked action case, recognized risk-marker drug row, and high-priority genotype-metabolite row for V1-ready public contracts and PGx marker identity coverage. `scripts/audit/v1-pk-visualization-audit.js` checks every PK-eligible drug for a nonblank absolute or relative SVG curve, model badges, AUC/Cmax metrics, safety disclaimer text, short-acting compressed display windows, and a DDI-adjusted AUC curve. `scripts/audit/v1-standards-coverage-audit.js` checks RxNorm, PGx marker, CPIC action, and standards-gap disclosure. `scripts/audit/v1-release-readiness-audit.js` checks the cross-surface V1 behavior for representative clinician and patient modes.

### Active-Moiety Balance

Purpose: separate the direction of parent drug, active metabolite, toxic metabolite, inactive metabolite, and net active-moiety effect.

Input data: `METAB`, `METABOLITE_ACTORS`, `GENOTYPE_METABOLITE_EFFECTS`, enzyme capacity, selected genotype state, current stack, and curated routes.

Output shape: rows with parent, metabolite actor, role, formation/clearance pathways, parent/metabolite direction, net pattern, confidence, severity hint, evidence refs, and review status.

UI placement: top active-moiety findings may appear in Overview; the full Parent-Metabolite Balance section appears in Genes + Metabolites; why paths can appear in Mechanisms and the hidden Reviewer Console.

Review/safety limitations: directionality is conservative and mechanistic. Unknown rows should stay unknown, not zero-risk.

### Phenoconversion / Functional Gene Status

Purpose: show how inherited genotype plus current inhibitors, inducers, and substrate burden can change what an enzyme behaves like today.

Input data: enzyme capacity, `GENOTYPE_EFFECTS`, selected genotype state, active stack routes, inhibitors, inducers, active-moiety rows, and route evidence refs.

Output shape: rows with enzyme, genetic phenotype, functional phenotype, capacity percentage, direction, drivers, affected parents, affected metabolites, active-moiety consequences, evidence refs, and review status.

UI placement: changed functional status can feed Overview findings; the full Functional Gene Status dashboard appears in Genes + Metabolites, with relevant normal rows collapsed.

Review/safety limitations: normal/relevant rows are context. Changed functional status is still a mechanistic signal and does not claim professional sign-off unless explicit sign-off metadata exists.

### Per-Warning Why Paths

Purpose: provide a compact causal chain for each major finding.

Input data: normalized findings, source rows, active-moiety rows, phenoconversion rows, persistence rows, current stack, genotype state, and evidence refs.

Output shape: path objects with nodes, edges, summary, evidence refs, and review status.

UI placement: compact why paths appear inside finding cards and in Mechanisms; raw JSON-like path payloads are inspectable in the hidden Reviewer Console.

Review/safety limitations: why paths explain why a signal appears. They do not by themselves validate clinical action.

### Persistence & Washout Timeline

Purpose: distinguish parent persistence, metabolite persistence, washout rules, enzyme recovery, and induction offset.

Input data: `PK_PARAMS`, `METAB`, `METABOLITE_ACTORS`, `WASHOUT_DAYS`, `TEMPORAL_PROFILES`, and current stack/genotype state.

Output shape: rows with actor, parent, actor type, half-life, estimated persistence days, pathway, persistence type, risk window, reasons, confidence, evidence refs, and review status.

UI placement: important timing rows can feed Overview; the full Persistence & Washout section appears in Timing + Levels; timing why paths can appear in Mechanisms and the hidden Reviewer Console.

Review/safety limitations: five-half-life estimates are display approximations. Missing half-life data is shown as unknown, not omitted or treated as zero.

### Evidence Confidence Ladder

Purpose: separate source support from mechanistic confidence, clinical-action confidence, source tier, and professional-review status.

Input data: evidence refs, `STUDY_DB`, inline evidence flags, source category, review status, severity-bearing/context-only flags, and model-only support signals.

Output shape: ladders with evidence refs, tiers present, strongest tier, source-linked status, source-support status, public identifiers, professional-review status, mechanistic confidence, clinical-action confidence, and notes.

UI placement: compact evidence status appears on finding cards; the Evidence tab shows the Evidence Browser / Evidence Ledger; the hidden Reviewer Console keeps governance diagnostics visible.

Review/safety limitations: source-linked does not mean professionally signed off. Model-only screening signals should remain distinct from FDA-label/guideline-backed findings.

### Reviewer Console Diagnostics

Purpose: keep technical audit surfaces available without making them compete with the primary user flow.

Input data: current findings, generated review workbench rows, scenario snapshots, metabolite coverage gaps, evidence queues, Open Targets review queues, raw warning paths, and interaction matrices.

Output shape: reviewer summary tiles, scenario snapshot cards, gap cards, raw warning path payloads, technical tables, and contribution links.

UI placement: hidden Reviewer Console, available through `?reviewer=1`.

Review/safety limitations: diagnostics are for audit, debugging, and contribution workflows. They are not user-facing clinical advice.

## UI Information Architecture

The normal V1 product uses Patient and Clinician audience modes. Clinician mode exposes five normal top-level tabs:

- Overview: ranked findings and highest-priority summary
- Mechanisms: why paths, pathway chains, transporter/pathway bottlenecks, and full network
- Genes + Metabolites: genotype input, phenoconversion, parent-metabolite balance, and metabolite catalog rows
- Timing + Levels: PK curves, relative exposure shifts, persistence, washout, and burden timing
- Evidence: external context cards, evidence browser, and evidence ladder ledger

The Reviewer Console is a separate hidden reviewer-only surface. It is available only with `?reviewer=1` and contains raw paths, diagnostics, scenario snapshots, coverage gaps, technical interaction tables, review workbench, and contribution links.

Audience mode is a top-level presentation switch, not RBAC. `Patient` is the default public view. `Clinician` can be loaded with `?audience=clinician` for the fuller clinician-oriented surface. Patient mode keeps the same local calculation model but shows the Overview safety notes with simpler labels and hides clinician-only tab navigation/details. The top chrome also follows the selected audience: Patient mode uses medicine-list, doctor/pharmacist, and "do not guess" gene-result language, while Clinician mode restores pathway, evidence, and Genes + Metabolites helper copy. Both modes keep the selected list and optional gene/marker results together before the results. Reviewer-only scope, readiness, raw paths, and contribution tooling stay out of normal V1 and live behind `?reviewer=1`; reviewer mode forces the clinician-style surface so reviewer tooling is not mixed into Patient mode. Patient selected-list chips keep names and not-checked boundaries visible, but hide clinician-only dose selectors and exposure/metabolite rollups. Patient selected-list count and empty-state copy use "items selected" and doctor/pharmacist list-building language instead of clinician-oriented substance/interaction wording. Patient Safety Notes also use patient-facing count/footer copy and plain priority labels instead of raw severity terms or hidden Reviewer Console pointers, and summary jump controls are shown only when there is a visible note or status target.

Legacy tab aliases remain supported for old demo links:

```text
safety -> overview
summary -> overview
pgx -> genes-metabolites
genetics -> genes-metabolites
pk -> timing-levels
levels -> timing-levels
network -> mechanisms
advanced -> review
contributor -> review
contributors -> review
evidence -> evidence
```

Old detailed panels remain available but are not the primary Overview surface. `Known Interactions`, `Combination Alerts`, and `Interaction Grid` live in the hidden Reviewer Console. Full network and pathway views live in Mechanisms.

## Runtime Handoff Contract

The built V1 app exposes a small browser runtime facade at `window.DIOGNOSIS_V1` so another UI can wrap or redesign the experience without scraping DOM internals. This is the supported handoff surface for V1:

```js
window.DIOGNOSIS_V1.getState();
window.DIOGNOSIS_V1.addSubstance("Warfarin");
window.DIOGNOSIS_V1.removeSubstance("Warfarin");
window.DIOGNOSIS_V1.setAudience("patient"); // or "clinician"
window.DIOGNOSIS_V1.setTab("overview");
window.DIOGNOSIS_V1.render();
```

`getState()` returns release metadata, active audience, reviewer mode, active tab, selected substances, compact summary text, public finding summaries, counts, and the current share URL. The facade intentionally does not expose private scoring internals, raw reviewer diagnostics, or mutable data tables. Normal V1 keeps reviewer surfaces hidden unless the page is opened with `?reviewer=1`.

## Evidence Status Boundaries

These concepts are deliberately separate:

- Source-linked evidence: a finding has linked public refs, labels, guidelines, papers, or curated source rows.
- Mechanistic confidence: the strength of the pathway/source support for the mechanism.
- Clinical-action confidence: whether the app can treat the finding as professionally signed off, source-integrated without sign-off, or insufficient for action.
- Professional sign-off status: explicit professional sign-off metadata. This must never be inferred from source links alone.
- Model-only screening signal: a mechanistic or computed finding without linked source refs on that specific finding.

Source-linked does not mean professionally reviewed. The current public evidence ledger is intentionally presented as V1 source-integrated evidence with professional sign-off not claimed. Severe and critical findings can be visible as educational review priorities, but severity should not be treated as clinically final.

## Biochemical Graph Engine

The graph uses a unified actor model across drugs, metabolites, enzymes, transporters, foods, endogenous actors, receptors, and phenotypes.

Supported edge types include `SUBSTRATE_OF`, `INHIBITS`, `INDUCES`, `METABOLIZED_TO`, `TRANSPORTED_BY`, `COMPETES_WITH`, `ACTIVATES`, `BLOCKS`, `ACCUMULATES_IN`, `PRODUCES`, and `SUPPRESSES`.

`traverseEffects()` performs depth-limited traversal across the graph with cycle protection, confidence decay, and temporal modifier accumulation. `traverseFromGenotype()` starts from an enzyme phenotype and lists affected parent and metabolite actors.

## Evidence System

`STUDY_DB` entries use a 9-tier hierarchy:

```text
IN_VITRO -> ANIMAL -> CASE_REPORT -> OBSERVATIONAL -> CLINICAL_PK
-> RCT -> META_ANALYSIS -> GUIDELINE -> FDA_LABEL
```

Each tier carries a calibrated confidence weight used by graph and finding-level evidence helpers. Contradictory evidence can be modeled directly rather than suppressed.

Important evidence helpers include `normalizeEvidence()`, `getEvidenceSummary()`, `assertEvidencedSeverity()`, `createStudyDraft()`, `reviewStudyDraft()`, `computeEvidenceLadder()`, and `attachEvidenceLaddersToFindings()`.

Live enrichment entries should remain marked `reviewRequired:true` until explicitly signed off. Open Targets-derived context remains local/static at runtime and defaults to context-only, sign-off-required, and not severity-bearing unless explicitly promoted by Diognosis governance.

## Enrichment Governance

External enrichment now uses one staged-source architecture:

```text
External Source -> Fetch / Discover -> Normalize -> Stage -> Dedupe
  -> Optional Backlog Review -> Explicit Promotion
  -> Live Validation -> Build
```

Version 1 treats source-linked live data as the product surface. The default enrichment audit is therefore a live-readiness gate: it checks promoted DDI, metabolites, PK, washout, PGx, transporter, burden, and boundary metadata. Backlog cleanup should promote source-backed rows only when they fill concrete live gaps, archive rows already represented in live core data, and delete model-only or unmapped rows. Generated review queues, candidate stores, source-faithfulness decision exports, and gap-query batches are not kept as active project backlog; regenerate them only for a deliberate enrichment campaign.

Canonical schema helpers live in `scripts/enrich/lib/staged-source-schema.js`. Every staged record defaults to `reviewRequired:true`, `professionalReviewStatus:"pending"`, `sourceFaithfulnessStatus:"unreviewed"`, `canAffectScoring:false`, and `canAffectPublicSeverity:false`.

Source governance files:

- `data/enrichment/source-registry.json`
- `data/enrichment/provider-allowlist.json`
- `docs/enrichment/STAGED_SOURCE_SCHEMA.md`
- `docs/enrichment/SOURCE_REGISTRY.md`
- `docs/enrichment/ENRICHMENT_ARCHITECTURE.md`
- `docs/enrichment/PROMOTION_POLICY.md`
- `docs/enrichment/REVIEW_STATUS_MODEL.md`
- `docs/enrichment/REVIEW_OVERLAYS.md`
- `docs/enrichment/FORK_REVIEW_TEAMS.md`
- `docs/enrichment/CURATED_DRAFTS.md`
- `docs/enrichment/SOURCE_FAITHFULNESS_REVIEW.md`
- `docs/enrichment/AUTOMATION_RUNBOOK.md`

Structured source workflows:

- `scripts/enrich/cpic-sync.js` and `scripts/audit/cpic-coverage-audit.js` stage CPIC Data review candidates and compare them with Diognosis PGx coverage. Check mode is CPIC local coverage candidate mode; fetch mode caches real CPIC API source objects.
- `scripts/enrich/clinpgx-sync.js` and `scripts/audit/clinpgx-coverage-audit.js` stage ClinPGx guideline, clinical annotation, label, gene, chemical, and variant context. Check mode uses ClinPGx/Open Targets derived context; fetch mode caches direct ClinPGx REST JSON and is rate-limited at 550 ms/request.
- `scripts/enrich/stage-legal-literature.js` normalizes PubMed, Europe PMC, OpenAlex, and Unpaywall literature drafts into the same staged schema.
- `scripts/enrich/group-staged-records.js` groups CPIC/ClinPGx raw staged rows into human-readable review candidates.
- `scripts/audit/enrichment-coverage-audit.js` ranks missing drugs, likely missing combinations, PGx gaps, metabolite gaps, and evidence gaps.
- `scripts/enrich/build-enrichment-review-queue.js` can regenerate a temporary sign-off queue for an enrichment campaign. Queue items cannot auto-promote and do not define V1 completeness.
- `scripts/enrich/generate-pending-review-enrichment.js` and `scripts/enrich/generate-pending-core-enrichment.js` are optional export tools. Their generated files are not required for the live app gate and should only be regenerated for a deliberate enrichment-backlog campaign.
- `scripts/enrich/run-weekly-enrichment.js` orchestrates the staged enrichment run for a deliberate enrichment campaign, not the normal release gate.

PharmCAT remains a future session-input source. It is not a global database enrichment source and should not mutate shipped data files.

Runtime rule: the browser app remains local-first/static and does not call CPIC, ClinPGx, PharmCAT, PubMed, Europe PMC, OpenAlex, Unpaywall, or Open Targets.

Standards rule: RxNorm, PGx marker, and CPIC-linked action rows may be displayed only when they are committed as local reviewed source data and pass validation. They are identity/review aids, not live EHR integration and not automatic clinical orders.

## Enzyme Capacity Model

`computeEnzymeCapacity(enzyme, stack)` calculates net enzymatic capacity:

```text
capacity_pct = 100 x genotypeFactor x product(1 / INH_MULT)
               x product(1 / IND_MULT) x (1 - substrateBurden)
```

`substrateBurden = min(0.50, (n_competing_substrates - 1) x 0.10)`.

Mechanism-based inhibitors carry a 1.3x amplification factor. `computeAllEnzymeCapacities(stack)` returns enzymes deviating from baseline, sorted by impairment.

## PK Models

Diognosis has two PK paths:

- Absolute one-compartment PK for drugs with `PK_PARAMS`
- Relative exposure fallback for drugs with half-life data but incomplete absolute F/ka/Vd/dose parameters

The relative fallback normalizes curves against a no-interaction, normal-metabolizer single-dose reference peak. It is intended for directionality and comparison, not calibrated concentration prediction.

## URL Demo Loader

The live app supports preloaded examples such as:

```text
?substances=paroxetine,fluoxetine&tab=timing-levels
?substances=clopidogrel,omeprazole&genotype=CYP2C19:poor_metabolizer&tab=genes-metabolites
?substances=codeine,fluoxetine&genotype=CYP2D6:poor_metabolizer&tab=genes-metabolites
?substances=simvastatin,clarithromycin&tab=mechanisms
?substances=amitriptyline,diazepam,diphenhydramine,oxycodone&tab=overview
```

Legacy named demos, hash links, and old tab params are also supported for static-hosting compatibility:

```text
?demo=ssri-switch
#demo=ssri-switch
#clopidogrel-cyp2c19
?substances=warfarin,ibuprofen&tab=safety
?substances=codeine,fluoxetine&genotype=CYP2D6:poor_metabolizer&tab=pgx
```

Custom links should use `substances=`. The older `drugs=` and `medications=` names remain accepted as aliases. Link-loaded substances that are not recognized by the local medication/actor dataset are preserved in the selected list, shown as unrecognized, included in share/copy context, and excluded from modeled interaction evidence rather than being silently dropped.

## DNA / PharmGx Report Import

The pharmacogenomics panel includes a local paste-in importer for report-style gene rows. It is meant as the first integration step toward external DNA/report projects such as ClawBio, not as a raw DNA variant caller.

Accepted inputs:

- ClawBio-style Markdown/table rows, for example `CYP2C19 | *1/*2 | Intermediate Metabolizer`
- Simple CSV or tab-separated rows containing a supported gene/risk marker and a phenotype/status
- JSON arrays, or JSON objects with `gene_profiles`, `geneProfiles`, `genes`, or `results`

The importer maps supported metabolizer phenotypes into `GENOTYPE_EFFECTS` (`poor_metabolizer`, `intermediate_metabolizer`, `normal_metabolizer`, `ultrarapid_metabolizer`) and supported risk markers into `GENOTYPE_RISK_EFFECTS` (`risk_allele_present` / `risk_allele_absent`).

All parsing runs in the browser. Nothing is uploaded, stored, or sent to an API.

Future raw-DNA integration should stay separate from the Diognosis clinical display layer: a report generator should call star alleles and risk markers from 23andMe/Ancestry-style files, then pass only normalized gene phenotype/status rows into this importer or a future equivalent structured API.

## Build And Validation

```bash
npm install
npm run build
npm run smoke
npm run regression
npm run validate
npm run validate:strict
npm run test:unit
npm run test:data
npm run test:integrations
npm test
npm run pages:check
npm run release:check
```

`npm run pages:check` is the GitHub Pages deploy gate. It rebuilds `index.html`, verifies release metadata, runs the smoke check, privacy/static audit, and whitespace checks. It is intentionally scoped to catch broken live pages without re-running release-depth clinical/data readiness audits on every push.

`npm run release:check` rebuilds the bundle, verifies metadata, runs database and data-view audits, the V1 no-warning database gate, V1 public-docs/standards/readiness gates, evidence review UI, evidence calculation, Open Targets gates, scenario snapshots, launch QA, regression, smoke, strict validation, privacy/static audit, and whitespace checks.

Routine GitHub Pages deployment uses `.github/workflows/pages.yml` to build `index.html` from `src/` and upload it as a Pages artifact. The generated root `index.html` is ignored locally, so branch-based Pages publishing is not sufficient for live deploys. The separate CI workflow is intentionally lighter: branch and pull-request CI run `npm run test:unit`, while the deeper `npm run test:data`, `npm run test:integrations`, and severity report steps are available from manual CI dispatch when a full audit is needed. This keeps live testing from waiting on release-depth data, standards/readiness, and integration audits.

## Genotype Gap Audit

```bash
npm run audit -- genotype-gaps
node scripts/audit/genotype-gap-audit.js --catalog-dir /path/to/local-pgx-catalog
node scripts/audit/genotype-gap-audit.js --open-targets-snapshot src/data/generatedOpenTargetsSnapshot.js
```

The genotype gap audit reads Diognosis source text, lists every referenced gene/enzyme/transporter, compares that list with `GENOTYPE_EFFECTS` and `GENOTYPE_RISK_EFFECTS`, and can optionally compare against Open Targets/ClinPGx context. Generated reports are written to ignored local files at `scripts/audit/genotype-gap-report.json` and `scripts/audit/genotype-gap-report.md`.

## Release Checklist

1. Update `DIOGNOSIS_VERSION` in `src/data/drugs.js` when Diognosis behavior changes.
2. Update Drug DB version/date when curated data changes.
3. Run `npm run pages:check` for routine live-deploy validation.
4. Run `npm run release:check` before tagged releases or clinical-review milestones.
5. Commit source changes.
6. Push `main`; GitHub Pages builds `index.html` from source and deploys the generated artifact.

## Safety Contract

No interaction should be presented as clinically final without enough provenance to explain:

- the affected pathway
- the enzyme, transporter, receptor, metabolite, phenotype, or time window involved
- the expected direction of effect
- the evidence basis and source-support status
- whether professional sign-off metadata exists

The safe default is to show a source-linked or model-only explanation, not a final medical instruction.
