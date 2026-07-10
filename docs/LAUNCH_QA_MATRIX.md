# Launch QA Matrix

Generated: 2026-06-19

The launch QA matrix guards cases that are easy to miss when a medication checker only compares parent drug names. The goal is broad V1 behavior: the app must preserve active-metabolite, toxic-metabolite, pharmacogenomic, timing, evidence, the hidden Reviewer Console, and the single public Medication Review surface without stale panels or unsafe wording.

Phase 4 adds a fixed 15-journey acceptance layer in [V1 Phase 4 Validation Matrix](V1_VALIDATION_MATRIX.md): 10 authority-framed PGx families plus five edge/journey cases, tied to machine-readable definitions and an executable release audit.

## What The Gate Checks

- The Overview renders current-stack public concern cards with trust chips.
- Mechanisms explain the pathway behind high-priority findings.
- Genes + Metabolites shows genotype, marker, active-moiety, and metabolite context.
- Timing + Levels renders PK, persistence, washout, and burden surfaces where applicable.
- Evidence separates authority sources, primary literature, other linked context, modeled context, and independent-review status, while the hidden Reviewer Console keeps contribution links and diagnostics separate from normal V1.
- Review Context completeness is visible on the summary and each priority finding; patient-specific context enters the handoff but never the share URL.
- Medication/gene share state is fragment-only, CSP blocks inline event handlers and runtime connections, and hostile or oversized shared/imported input is bounded.
- Skip links, explicit context labels, semantic tablists, arrow-key navigation, and a list-autocomplete medication combobox preserve keyboard and screen-reader access across Medication Review and Data Views.
- The public Overview starts with plain-language questions and safety boundaries, then keeps mechanism, expected-change, review-focus, monitoring, evidence/status, and supporting-detail layers available in one view.
- Legacy `audience=` URLs render the same public view and generated/share URLs strip the old parameter.
- Hidden panels stay empty so one stack cannot leak stale content into the next.

## Deep Scenario Set

| # | Scenario | Why It Matters | Share URL |
| ---: | --- | --- | --- |
| 1 | Thiopurine marrow toxicity | Allopurinol changes thiopurine metabolism; TPMT/NUDT15 loss-of-function shifts toward cytotoxic 6-TGN. | `index.html#substances=azathioprine,allopurinol&genotype=TPMT:PM&genotype=NUDT15:PM&tab=genes-metabolites` |
| 2 | Fluoropyrimidine toxicity | Capecitabine is a prodrug and DPYD deficiency can make 5-FU exposure the safety-critical actor. | `index.html#substances=capecitabine&genotype=DPYD:PM&tab=genes-metabolites` |
| 3 | Irinotecan SN-38 toxicity | SN-38 and UGT1A1 detoxification can matter more than the parent-drug name. | `index.html#substances=irinotecan&genotype=UGT1A1:PM&tab=genes-metabolites` |
| 4 | G6PD oxidant stack | Unrelated-looking medicines converge on red-cell oxidative reserve. | `index.html#substances=rasburicase,primaquine,dapsone&genotype=G6PD:deficiency&tab=genes-metabolites` |
| 5 | Anesthesia pharmacogenetics | Succinylcholine risk is driven by BCHE hydrolysis and malignant-hyperthermia susceptibility, not a normal DDI pair. | `index.html#substances=succinylcholine&genotype=BCHE:null&genotype=RYR1:present&tab=genes-metabolites` |

## Commands

Run the fast GitHub Pages deploy gate used for live testing:

```sh
npm run pages:check
```

Run the full release gate:

```sh
npm run release:check
```

The Pages deploy gate rebuilds the static bundle, verifies release metadata, runs smoke validation, security-boundary, authority-evidence, clinical-context, privacy/static, and whitespace checks. GitHub Pages then publishes the generated `index.html` artifact, keeping live testing from waiting on every release-depth data and readiness audit.

The release gate also runs the focused launch QA audit, the 15-journey Phase 4 validation matrix, database checks, V1 public-docs, standards/readiness, strict validation, V1 PGx contract audit, V1 PK visualization audit, V1 finding contract audit including a complete sweep over every recognized shipped `KNOWN_DDI` pair, and the V1 release readiness audit.
