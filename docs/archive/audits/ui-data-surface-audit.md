# Diognosis UI/Data Surface Audit

Generated: 2026-06-15T08:43:29Z

## Executive Summary

The post-polish app is structurally sound. The six-tab information architecture is in place, legacy aliases route correctly, section placement matches the intended hierarchy, evidence wording is generally conservative, and all requested build/test gates passed.

What is working:

- Overview is constrained to the expected three major sections: risk, normalized Interaction Findings, and alternatives.
- Legacy detail panels are no longer competing inside Overview; they live in Review or Mechanisms.
- Source-linked, model-only, and pending-professional-review evidence states are visible on finding cards and in the Evidence ledger.
- Normal/relevant phenoconversion rows are collapsed and do not inflate Overview findings.
- The render cache exists and is used by the major UI renderers.

Top risks:

1. G6PD oxidant stack has no normalized Overview finding or why path despite a selected risk marker and oxidant-drug context.
2. Review and Evidence tabs can become very dense: up to 10 visible Review sections and around 40k text characters in high-context scenarios.
3. Overview and Mechanisms often render effectively the same per-warning why path, creating mild duplication rather than a true summary/detail distinction.
4. Toxic-metabolite rows in the G6PD oxidant stack show `no_major_signal`, which can understate toxic-metabolite relevance.
5. Persistence timelines can repeat long-lived actors, especially norfluoxetine, and Timing + Levels still includes burden sections that are not strictly timing-oriented.

Integration readiness: **ready after minor fixes**.

The app is ready to start external PGx import work only if imported ClawBio/Allelix risk markers are first mapped into normalized findings, Review diagnostics, and clear no-risk-marker-match states. The current G6PD result is the main warning sign: risk-marker input can be present without a prominent normalized finding.

## Test/Command Results

All requested commands passed.

| Command | Status | Notes |
|---|---:|---|
| `npm run build` | pass | Built `index.html`; generated 625 drugs, 456 studies, 627 DDI pairs. Generated timestamp churn was restored after the audit. |
| `npm run smoke` | pass | Smoke check passed. |
| `npm run regression` | pass | Regression check passed. |
| `npm run validate` | pass | No errors or warnings. Notes: 456 studies pending professional review; optional local PharmGKB/CPIC reference snapshot missing, genotype diff skipped. |
| `npm run validate:strict` | pass | No strict validation errors or warnings. Same informational notes as non-strict validation. |
| `npm test` | pass | Full test bundle passed, including evidence, Open Targets, scenario snapshot, review workbench, and privacy/static audits. |

## Scenario Findings

| Scenario | Target tab loaded | Findings | Main observations |
|---|---:|---:|---|
| Codeine + Fluoxetine + CYP2D6 PM | Genes + Metabolites | 8 | Strong parent-metabolite display; 2 changed functional gene rows and 6 collapsed normal rows. Evidence/Review are very dense. |
| Clopidogrel + Omeprazole + CYP2C19 PM | Genes + Metabolites | 8 | Activation failure is visible. Known interaction is correctly in Review. |
| Irinotecan + UGT1A1 PM | Genes + Metabolites | 2 | Clean, focused toxic-metabolite and phenoconversion output. |
| Capecitabine + DPYD PM | Genes + Metabolites | 2 | Cleanest single-gene toxic-metabolite scenario; evidence is source-linked and conservative. |
| Azathioprine + Allopurinol + TPMT/NUDT15 PM | Genes + Metabolites | 4 | Good toxic-metabolite signal; known interaction detail remains in Review. |
| Fluoxetine + Paroxetine | Timing + Levels | 8 | Persistence is prominent, but duplicate norfluoxetine timeline rows should be reviewed. |
| Simvastatin + Clarithromycin | Mechanisms | 7 | Mechanistic explanation works; old known/combination detail remains in Review. |
| Warfarin + Ibuprofen | Overview | 1 | Concise Overview; source-linked evidence status is clear. |
| Older-adult burden stack | Overview | 8 | Overview remains capped, but Genes + Metabolites and Timing + Levels are dense for a burden-style case. |
| G6PD oxidant stack | Genes + Metabolites | 0 | Main integration blocker: selected risk marker and oxidant stack do not create normalized findings or warning paths. |

Alias routing passed:

- `tab=safety` -> Overview
- `tab=pgx` -> Genes + Metabolites
- `tab=pk` -> Timing + Levels
- `tab=network` -> Mechanisms
- `tab=advanced` -> Review
- `tab=contributor` -> Review

## Duplicate Presentation Findings

| Category | Severity | Finding | Recommended fix |
|---|---:|---|---|
| Why paths | mild duplication | Overview and Mechanisms often show the same compact why chain. This affects Codeine + Fluoxetine, Clopidogrel + Omeprazole, Simvastatin + Clarithromycin, and older-adult burden scenarios. | Keep a short one-line causal summary in Overview; reserve the node/edge chain for Mechanisms. |
| Legacy DDI cards | acceptable cross-tab summary/detail | Known Interactions appear in Review while normalized findings appear in Overview. This is acceptable and matches the hierarchy. | Keep as-is; continue labeling Review panels as technical/detail views. |
| Combination alerts | acceptable cross-tab summary/detail | Combination alerts are in Review; related normalized findings may appear in Overview. | Keep as-is, but ensure Review helper text remains visible. |
| Active moiety vs metabolite panel | mild duplication | Genes + Metabolites can show active-moiety cards and older metabolite rows for the same parent/metabolite concepts. | For high-card scenarios, collapse older raw metabolite rows behind “Raw metabolite map.” |
| Phenoconversion vs genotype | mild duplication | Genotype selectors and Functional Gene Status both mention gene status. Labels are understandable after the polish pass. | Keep inherited-vs-functional language consistent. |

## Evidence Wording Findings

No false professional-review claims were detected. All scenarios showed pending professional review where evidence was present. No evidence-free finding appeared FDA-label-backed.

Positive findings:

- `Source status:` is visible on finding cards with normalized findings.
- Model-only review prompts are visibly different from source-linked pending-review findings.
- Evidence ledger is present for all audited scenarios.
- Clinical-action confidence remains conservative.

Remaining ambiguity:

- Scenarios with zero normalized findings, especially G6PD oxidant stack, cannot show source-status wording in Overview because there is no finding card. Evidence still appears in the Evidence tab, but the user-facing gap is in the missing finding, not the evidence wording itself.
- FDA-label text appears in some finding cards as the strongest evidence tier; this is acceptable because pending professional review is also shown, but it should remain visually subordinate to review status.

## Phenoconversion Findings

What works:

- Changed functional status appears first.
- Normal/relevant rows are collapsed by default.
- Normal rows do not inflate Overview finding counts.
- The genotype helper copy now points users toward Functional Gene Status without overclaiming.

Scenario notes:

- Codeine + Fluoxetine: 2 changed rows, 6 normal/relevant rows collapsed.
- Clopidogrel + Omeprazole: 3 changed rows, 3 normal/relevant rows collapsed.
- Fluoxetine + Paroxetine: 2 changed rows, 5 normal/relevant rows collapsed.
- Warfarin + Ibuprofen: 0 changed rows, 6 normal/relevant rows collapsed.
- G6PD oxidant stack: 0 changed rows, 3 normal/relevant rows collapsed.

Risk:

- Risk markers such as G6PD deficiency can be set, but the audited stack did not create a normalized finding. This is a blocker for import workflows that may bring in G6PD or other non-CYP risk-marker results.
- Inherited null/no-function phenotypes should be audited again when ClawBio/Allelix imports are added, especially CYP2D6 null, CYP3A5 non-expresser, GSTM1 null, and risk markers, to avoid double-counting with inhibitor-driven phenoconversion.

## Active-Moiety Findings

What works:

- Prodrug activation failure is understandable in Codeine + Fluoxetine and Clopidogrel + Omeprazole.
- Toxic-metabolite accumulation is understandable in Irinotecan + UGT1A1 PM, Capecitabine + DPYD PM, and Azathioprine + Allopurinol + TPMT/NUDT15 PM.
- Parent vs metabolite direction is visible on each active-moiety card.
- Mixed-direction cases are labeled as mixed or monitor-level prompts.

Risks:

- G6PD oxidant stack shows toxic metabolites such as dapsone hydroxylamine and primaquine oxidant metabolites, but all active-moiety rows are `no_major_signal`. That can make toxic-metabolite biology look unimportant even when the risk marker is clinically central.
- Older-adult burden stack has many active-moiety rows, mostly `no_major_signal`, which adds biology detail but may distract from the burden warning.

Recommended fix:

- Add a risk-marker-aware active-moiety or phenotype finding path for oxidant hemolysis stacks. Do not force this into CYP-style phenoconversion.

## Persistence/Washout Findings

What works:

- Parent persistence and metabolite persistence are separated.
- Washout rules are labeled separately from PK persistence.
- Unknown persistence appears as unknown rather than zero.
- Long-lived active metabolites, especially norfluoxetine and nordiazepam, are visible.

Risks:

- Codeine + Fluoxetine produced repeated norfluoxetine rows in the weeks-long persistence list. Review deduplication by actor plus persistence type.
- Timing + Levels includes burden flags. This can be useful clinically, but it weakens the tab promise of “how much/how long” by mixing in non-timing burden content.

## Section Placement Findings

No section placement mismatches were detected.

Expected placement was confirmed:

- Overview: `riskSection`, `findingSection`, `altSection`
- Mechanisms: `mechanismWhySection`, `mechanisticSection`, `transporterSection`, `pdSection`, `cascadeSection`, `phenoAccumSection`, `graphSection`
- Genes + Metabolites: `genotypeSection`, `phenoconversionSection`, `activeMoietySection`, `metabSection`
- Timing + Levels: `foldSection`, `pkSimSection`, `persistenceTimelineSection`, `washoutSection`, `burdenSection`
- Evidence: `externalContextSection`, `evidenceSection`
- Review: `reviewSummarySection`, `reviewWorkbenchSection`, `scenarioSnapshotSection`, `metaboliteGapSection`, `warningPathSection`, `matrixSection`, `interSection`, `comboSection`, `qualitySection`, `contributeSection`

## Mobile/Overflow Findings

Static CSS heuristics found several protections already in place:

- Tab bar uses horizontal scroll.
- Matrix is inside an overflow wrapper.
- Section bodies use horizontal overflow.
- Many long labels use `overflow-wrap:anywhere`.

Risks:

- `.warning-path-json` uses `overflow:auto` and `pre-wrap`, which is probably safe, but explicit `overflow-x:auto` would be clearer.
- Active-moiety direction cards use a three-column grid. They have `minmax(0, 1fr)` and wrapping, but no specific mobile breakpoint; dense labels could feel tight on narrow devices.
- Long imported names from ClawBio/Allelix, Open Targets, or risk markers should be stress-tested before import support ships.

Candidate selectors:

- `.warning-path-json`
- `.active-moiety-directions`
- `.phenoconversion-grid`
- `.persistence-grid`
- `.review-workbench-list`
- `.external-context-grid`
- `.tab-bar`

## Performance Findings

The new render cache exists and covers:

- `calcRisk()`
- `computeActiveMoietyBalance()`
- `computePhenoconversionState()`
- `computePersistenceTimeline()`
- `buildInteractionFindings()`

The major renderers use the cache:

- Overview findings
- Phenoconversion dashboard
- Active-moiety balance
- Persistence timeline
- Evidence explorer
- Review summary
- Warning path review
- Mechanism why paths

Remaining hotspots:

- `renderAll()` still renders many heavy sections on every update, including Evidence and Review diagnostics, even when the active tab is not visible.
- Evidence and external context can produce very large DOM/text surfaces: Codeine + Fluoxetine had around 40k characters in Evidence and around 40k in Review.
- Fallback code paths still recompute when called outside the render cache. This is acceptable for tests/audits, but future import previews should call through the cache.

Recommended cache boundaries:

- Keep current stack-level cache.
- Consider lazy-rendering Evidence and Review only when the user opens those tabs, or using tab-level cached HTML invalidated by stack/genotype/dose changes.
- Include imported report fingerprint in cache keys when ClawBio/Allelix support is added.

## Docs/README Consistency Findings

No stale public-copy blockers were detected.

- README uses the new public tab names and no longer uses `tab=safety` in the main share-link example.
- `docs/TECHNICAL.md` documents the six-tab UI and current engine modules.
- Package description matches the README identity.
- Live app metadata matches the parent-metabolite-aware positioning.
- Disclaimer language remains conservative: educational exploration only, not medical advice, not clinical decision support, not professionally reviewed, and source-linked evidence does not equal clinical validation.

## Integration Readiness

Classification: **ready after minor fixes**.

External PGx import work can begin after a focused pre-integration cleanup:

- Make risk-marker imports produce reviewable normalized findings or explicit “context only / no current warning” rows.
- Add a raw imported-result review queue before import results affect user-facing warnings.
- Ensure imported null/no-function calls do not double-count with inhibitor-driven phenoconversion.
- Stress-test long imported gene, allele, and source labels on mobile.

## Prioritized Fix List

### P0

No P0 issue was found that requires stopping all work.

### P1

1. Risk-marker findings for G6PD/imported PGx
   - Why it matters: ClawBio/Allelix imports will likely include risk markers and non-CYP traits. The G6PD oxidant scenario currently has zero normalized findings.
   - Recommended fix: Add risk-marker-aware normalized findings and why paths for G6PD oxidant hemolysis, RYR1/CACNA1S malignant hyperthermia, HLA risk, and similar markers.
   - Integration blocker: yes.

2. Toxic-metabolite display for oxidant stacks
   - Why it matters: Dapsone and primaquine toxic metabolites are visible but marked `no_major_signal`.
   - Recommended fix: Link oxidant-toxic-metabolite rows to risk-marker phenotype context without converting them into generic CYP phenoconversion.
   - Integration blocker: yes.

3. Review/Evidence density before import preview
   - Why it matters: Import support will add more source/context rows to already dense tabs.
   - Recommended fix: Add filtering or lazy rendering for Evidence and Review before showing imported reports.
   - Integration blocker: partial.

### P2

1. Reduce why-path duplication
   - Keep summary text in Overview and detailed path chains in Mechanisms.

2. Deduplicate persistence rows
   - Merge repeated actor/type rows such as norfluoxetine metabolite persistence.

3. Collapse raw metabolite map in high-card scenarios
   - Keep Parent-Metabolite Balance prominent and make older metabolite rows explicitly raw/supporting.

4. Add mobile breakpoint for active-moiety direction grid
   - Consider switching `.active-moiety-directions` to one column below 420px.

### P3

1. Make `.warning-path-json` explicitly horizontal-scrollable.
2. Add a docs note explaining imported PGx results as inherited context, not automatic clinical validation.
3. Track scenario-level text length in future UI audits.
