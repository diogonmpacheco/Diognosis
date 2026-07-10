# Diognosis Technical Notes

This page keeps implementation details out of the README front page while preserving the architecture, build, and validation workflow for contributors.

## Architecture

Diognosis models medication stacks as connected parent-metabolite-gene systems. The engine combines curated DDI pairs, parent/metabolite directionality, functional enzyme status, PK and washout timing, pathway graph traversal, receptor/phenotype burden, and source-linked evidence confidence into normalized interaction findings.

Status: V1 platform scope, authority/literature provenance visible, modeled context quarantined, under active validation, and not medical advice.

Diognosis currently ships as a single self-contained HTML file. All computation runs in the browser with no backend, no API, no accounts, no analytics, and no medication-data collection. D3.js is vendored locally and bundled at build time for graph visualization.

The built page uses a hash-based Content Security Policy, blocks inline event-handler attributes and runtime network connections, delegates UI events through trusted bundle code, caps shared/import/search inputs, and rejects medication or genotype state supplied in the HTTP query string.

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
- Evidence browsing, evidence confidence ladders, and review diagnostics with authority, primary-literature, linked-context, and modeled-context provenance kept distinct

## Source Layout

The source is structured as editable JavaScript modules in `src/`, assembled in dependency order by `build.js`, alongside generated data modules and the HTML template:

```text
src/
  data/
    constants, rules, drugs, enzymes, metabolites, transporters,
    actors, pharmacology, evidence, clinical standards, interactions, generated stats,
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

V1 trust contract: each public Overview finding is normalized into a reusable trust contract with concern category, affected actors, mechanism, expected change, clinical concern, confidence, evidence status, patient-safe action, review action, and limitation status. Source-linked finding cards expose direct source chips when public identifiers are available, or a jump to the Evidence ledger otherwise. Finding cards also include bounded discussion and monitoring guides; the public Overview places plain-language questions above the detailed priority card so the first layer is understandable without hiding mechanism, dose, timing, gene, or source context. Empty/no-signal Overview states are also bounded: they say no major public concern was generated, name unrecognized selections when present, and provide review prompts instead of implying safety. Reviewer-only scope and readiness details stay in the hidden Reviewer Console, while the public V1 workflow stays focused on selected items, optional gene/marker results, Review Priorities, and the supporting tabs. The V1 handoff summary turns the same contract into a shareable text artifact with stack, scope, top concerns, evidence/status, standards identity coverage, monitoring focus, patient-safe boundaries, and share URL. The hidden Reviewer Console also exposes a V1 readiness snapshot for the current stack; it checks scope, contracts, source traceability, standards identity disclosure, action wording, handoff, safety boundaries, share state, and the single public-view contract without claiming clinical validation. `scripts/audit/v1-finding-contract-audit.js` checks this contract, direct source traceability, scope wording, and handoff summary across broad data-derived stacks, then sweeps every recognized shipped `KNOWN_DDI` pair for a complete public contract. `scripts/audit/v1-pgx-contract-audit.js` checks every supported CPIC-linked action case, recognized risk-marker drug row, and high-priority genotype-metabolite row for V1-ready public contracts and PGx marker identity coverage. `scripts/audit/v1-pk-visualization-audit.js` checks every PK-eligible drug for a nonblank absolute or relative SVG curve, model badges, AUC/Cmax metrics, safety disclaimer text, short-acting compressed display windows, and a DDI-adjusted AUC curve. `scripts/audit/v1-standards-coverage-audit.js` checks RxNorm, PGx marker, CPIC action, and standards-gap disclosure. `scripts/audit/v1-release-readiness-audit.js` checks representative public scenarios, legacy audience URL canonicalization, unknown-item boundaries, and the reviewer-console gate.

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

Review/safety limitations: normal/relevant rows are context. Changed functional status is still a mechanistic signal and does not claim clinical validation.

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

Input data: current findings, scenario snapshots, metabolite coverage gaps, evidence diagnostics, raw warning paths, and interaction matrices.

Output shape: reviewer summary tiles, scenario snapshot cards, gap cards, raw warning path payloads, technical tables, and contribution links.

UI placement: hidden Reviewer Console, available through `#reviewer=1`.

Review/safety limitations: diagnostics are for audit, debugging, and contribution workflows. They are not user-facing clinical advice.

## UI Information Architecture

The normal V1 product uses one public Diognosis Medication Review view. It exposes five normal top-level tabs:

- Overview: ranked findings and highest-priority summary
- Mechanisms: why paths, pathway chains, transporter/pathway bottlenecks, and full network
- Genes + Metabolites: genotype input, phenoconversion, parent-metabolite balance, and metabolite catalog rows
- Timing + Levels: PK curves, relative exposure shifts, persistence, washout, and burden timing
- Evidence: external context cards, evidence browser, and evidence ladder ledger

Overview is the canonical first layer. It uses the title `Review Priorities`, starts with plain-language questions and patient-safe boundaries, then keeps the detailed public card below: what changed, mechanism/why it matters, review focus, monitoring focus, evidence/status chips, source actions, and supporting detail. Dose selectors and technical supporting details remain available where they already exist, but medication-change language stays bounded as review context rather than advice.

The Reviewer Console is a separate hidden reviewer-only surface. It is available only with `#reviewer=1` and contains raw paths, diagnostics, scenario snapshots, coverage gaps, technical interaction tables, review workbench, and contribution links. Reviewer-only scope, readiness, raw paths, and contribution tooling stay out of normal V1.

The setup rail also contains local-only Review Context fields for exact regimen, indication, recent timing changes, age range, kidney/liver function, pregnancy/feeding, symptoms, labs, and allergy/reaction review. Findings show context applicability separately from mechanistic confidence. These fields enter the copyable clinician/pharmacist handoff but never enter browser or share URLs.

There is no public Patient/Clinician or Plain/Detailed presentation switch. Legacy `audience=plain`, `audience=patient`, `audience=detailed`, `audience=clinician`, and similar URL params are accepted as no-op compatibility inputs for old links and are canonicalized away from browser/share URLs on render. `window.DIOGNOSIS_V1.getState()` returns `audience: "public"`; `setAudience()` remains as a deprecated no-op for one release.

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
window.DIOGNOSIS_V1.setAudience("patient"); // deprecated no-op; getState().audience remains "public"
window.DIOGNOSIS_V1.setTab("overview");
window.DIOGNOSIS_V1.render();
```

`getState()` returns release metadata, `audience: "public"` for compatibility, reviewer mode, active tab, selected substances, compact summary text, public finding summaries, local Review Context plus its completeness assessment, counts, and the current share URL. It also declares `shareLinkIncludesContext: false`. The facade intentionally does not expose private scoring internals, raw reviewer diagnostics, or mutable data tables. Normal V1 keeps reviewer surfaces hidden unless the page is opened with `#reviewer=1`.

## Evidence Status Boundaries

These concepts are deliberately separate:

- Authority-linked evidence: a finding points to an official regulator or recognized guideline publisher.
- Primary-literature linked evidence: a finding points to a claim-specific PMID or DOI record.
- Other linked evidence: a finding has a traceable public source that does not meet the authority or primary-literature definitions.
- Mechanistic confidence: the strength of the pathway/source support for the mechanism.
- Clinical-action confidence: whether action context is authority-linked, literature-linked, contextual/model-based, or insufficient.
- Clinical-validation status: this must never be inferred from source links alone.
- Modeled context: internal coverage/expansion scaffolding that is hidden from public evidence and cannot preserve severe output.

Source provenance means traceable committed source context. It does not mean medical advice, clinical validation, patient-specific applicability, or proof that severity is clinically final.

## Biochemical Graph Engine

The graph uses a unified actor model across drugs, metabolites, enzymes, transporters, foods, endogenous actors, receptors, and phenotypes.

Supported edge types include `SUBSTRATE_OF`, `INHIBITS`, `INDUCES`, `METABOLIZED_TO`, `TRANSPORTED_BY`, `COMPETES_WITH`, `ACTIVATES`, `BLOCKS`, `ACCUMULATES_IN`, `PRODUCES`, and `SUPPRESSES`.

`traverseEffects()` performs depth-limited traversal across the graph with cycle protection, confidence decay, and temporal modifier accumulation. `traverseFromGenotype()` starts from an enzyme phenotype and lists affected parent and metabolite actors.

## Evidence System

Public `STUDY_DB` evidence uses a 9-tier hierarchy, with modeled context kept in a separate lowest-weight quarantine tier:

```text
IN_VITRO -> ANIMAL -> CASE_REPORT -> OBSERVATIONAL -> CLINICAL_PK
-> RCT -> META_ANALYSIS -> GUIDELINE -> FDA_LABEL

MODELED_CONTEXT -> context-only, not severity-bearing, not public evidence
```

Each tier carries a calibrated confidence weight used by graph and finding-level evidence helpers. Contradictory evidence can be modeled directly rather than suppressed.

Important evidence helpers include `normalizeEvidence()`, `getEvidenceSummary()`, `assertEvidencedSeverity()`, `createStudyDraft()`, `reviewStudyDraft()`, `computeEvidenceLadder()`, and `attachEvidenceLaddersToFindings()`.

Committed source-context entries can carry internal source-governance flags. External-source context remains local/static at runtime and defaults to context-only and not severity-bearing unless explicitly promoted by Diognosis governance.

## Source Governance

V1 no longer ships the old enrichment-campaign toolchain. The active fork path is intentionally simpler:

```text
Edit committed source data -> Build -> Validate -> Pages check -> Release check
```

New evidence should be integrated directly into the source data with public identifiers, boundary notes, and conservative wording. The release gate then checks source traceability, evidence calculations, patient/clinician wording, standards identity, scenario snapshots, privacy, regression behavior, and database validation.

The small shared source-data helpers live in `scripts/lib/`. Historical import artifacts and local-review examples are no longer part of the active V1 fork path.

PharmCAT remains a future session-input source. It is not a global database enrichment source and should not mutate shipped data files.

Runtime rule: the browser app remains local-first/static and does not call CPIC, ClinPGx, PharmCAT, PubMed, Europe PMC, OpenAlex, Unpaywall, or Open Targets.

Standards rule: RxNorm and PGx marker mappings may be displayed only when they are committed as local source data and pass validation. PGx action rows gain authority status only through an exact official source link. They remain identity/review aids, not live EHR integration or automatic clinical orders.

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
#substances=paroxetine,fluoxetine&tab=timing-levels
#substances=clopidogrel,omeprazole&genotype=CYP2C19:poor_metabolizer&tab=genes-metabolites
#substances=codeine,fluoxetine&genotype=CYP2D6:poor_metabolizer&tab=genes-metabolites
#substances=simvastatin,clarithromycin&tab=mechanisms
#substances=amitriptyline,diazepam,diphenhydramine,oxycodone&tab=overview
```

Legacy named demos, hash links, and old tab params are also supported for static-hosting compatibility:

```text
#demo=ssri-switch
#clopidogrel-cyp2c19
#substances=warfarin,ibuprofen&tab=safety
#substances=codeine,fluoxetine&genotype=CYP2D6:poor_metabolizer&tab=pgx
```

Custom links must put `substances=` and optional gene results after the URL `#`. Fragment state is read locally by the app and is not sent to the static host in the page request. Medication or genotype state in the HTTP query string is rejected and stripped from the address. The `drugs=` and `medications=` aliases remain available only inside fragment state. Link-loaded substances that are not recognized by the local medication/actor dataset are sanitized, preserved in the selected list, shown as unrecognized, included in share/copy context, and excluded from modeled interaction evidence rather than being silently dropped. Shared state is capped at 24 substances and 32 gene-result tokens.

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
npm test
npm run pages:check
npm run release:check
```

`npm run pages:check` is the GitHub Pages deploy gate. It rebuilds `index.html`, verifies release metadata, runs the smoke check, privacy/static audit, and whitespace checks. It is intentionally scoped to catch broken live pages without re-running release-depth clinical/data readiness audits on every push.

`npm run release:check` rebuilds the bundle, verifies metadata, runs database and data-view audits, the V1 no-warning database gate, V1 public-docs/standards/readiness gates, evidence review UI, evidence calculation, source-boundary gates, scenario snapshots, launch QA, regression, smoke, strict validation, privacy/static audit, and whitespace checks.

Routine GitHub Pages deployment uses `.github/workflows/pages.yml` to build `index.html` from `src/` and upload it as a Pages artifact. The generated root `index.html` is ignored locally, so branch-based Pages publishing is not sufficient for live deploys. The separate CI workflow stays deliberately small: branch and pull-request CI run `npm test`, while `npm run release:check` remains the deeper local pre-release gate.

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
- whether clinical-validation metadata exists

The safe default is to show a source-linked or model-only explanation, not a final medical instruction.
