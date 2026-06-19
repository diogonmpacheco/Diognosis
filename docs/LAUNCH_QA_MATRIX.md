# Launch QA Matrix

Generated: 2026-06-19

The launch QA matrix guards cases that are easy to miss when a medication checker only compares parent drug names. The goal is broad V1 behavior: the app must preserve active-metabolite, toxic-metabolite, pharmacogenomic, timing, evidence, hidden Reviewer Console, and patient/clinician presentation surfaces without stale panels or unsafe wording.

## What The Gate Checks

- The Overview renders current-stack public concern cards with trust chips.
- Mechanisms explain the pathway behind high-priority findings.
- Genes + Metabolites shows genotype, marker, active-moiety, and metabolite context.
- Timing + Levels renders PK, persistence, washout, and burden surfaces where applicable.
- Evidence exposes source-linked context and review status, while the hidden Reviewer Console keeps contribution links, diagnostics, and the V1 handoff separate from normal V1.
- Patient mode stays in plain-language Overview, hides clinician-only detail, and preserves safety boundaries.
- Hidden panels stay empty so one stack cannot leak stale content into the next.

## Deep Scenario Set

| # | Scenario | Why It Matters | Share URL |
| ---: | --- | --- | --- |
| 1 | Thiopurine marrow toxicity | Allopurinol changes thiopurine metabolism; TPMT/NUDT15 loss-of-function shifts toward cytotoxic 6-TGN. | `index.html?substances=azathioprine,allopurinol&genotype=TPMT:PM&genotype=NUDT15:PM&tab=genes-metabolites` |
| 2 | Fluoropyrimidine toxicity | Capecitabine is a prodrug and DPYD deficiency can make 5-FU exposure the safety-critical actor. | `index.html?substances=capecitabine&genotype=DPYD:PM&tab=genes-metabolites` |
| 3 | Irinotecan SN-38 toxicity | SN-38 and UGT1A1 detoxification can matter more than the parent-drug name. | `index.html?substances=irinotecan&genotype=UGT1A1:PM&tab=genes-metabolites` |
| 4 | G6PD oxidant stack | Unrelated-looking medicines converge on red-cell oxidative reserve. | `index.html?substances=rasburicase,primaquine,dapsone&genotype=G6PD:deficiency&tab=genes-metabolites` |
| 5 | Anesthesia pharmacogenetics | Succinylcholine risk is driven by BCHE hydrolysis and malignant-hyperthermia susceptibility, not a normal DDI pair. | `index.html?substances=succinylcholine&genotype=BCHE:null&genotype=RYR1:present&tab=genes-metabolites` |

## Commands

Run the focused launch QA gate:

```sh
npm run launch:qa
```

Run the fast GitHub Pages deploy gate used for live testing:

```sh
npm run pages:check
```

Run the full release gate:

```sh
npm run release:check
```

The Pages deploy gate rebuilds the static bundle, verifies release metadata, runs smoke validation, privacy/static checks, and whitespace checks. GitHub Pages then publishes the generated `index.html` artifact, keeping live testing from waiting on every release-depth data and readiness audit.

The release gate also runs the database, V1 public-docs, standards/readiness, strict validation, V1 PGx contract audit, V1 PK visualization audit, V1 finding contract audit including a complete sweep over every recognized shipped `KNOWN_DDI` pair, and the V1 release readiness audit.
