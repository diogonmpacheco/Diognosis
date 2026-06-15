# Launch QA Matrix

Generated from `npm run launch:qa` on 2026-06-08.

The launch QA audit validates five less-common cases that stress active metabolites, toxic metabolites, pharmacogenomics, and source-linked evidence. These are intentionally more demanding than the familiar public demo links.

The audit checks:

- Highest-priority summary signal is present.
- Fold/exposure panel contains the expected active or toxic actor.
- Genotype panel contains the expected gene or risk marker.
- Metabolite panel contains the expected metabolite/pathway explanation.
- Evidence panel contains relevant source-linked evidence and review status.
- Contextual feedback links are present.
- Every visible panel renders content.
- Every hidden panel is empty, preventing stale data from a previous stack from leaking into later reviews.

| # | Deep scenario | Why it matters | Expected core signal | Share URL |
|---:|---|---|---|---|
| 1 | Thiopurine marrow toxicity | Allopurinol changes thiopurine metabolism; TPMT/NUDT15 loss-of-function shifts toward cytotoxic 6-TGN. | 6-TGN accumulation, myelosuppression, CBC monitoring, CPIC thiopurine evidence. | `index.html?substances=azathioprine,allopurinol&genotype=TPMT:PM&genotype=NUDT15:PM&tab=pgx` |
| 2 | Fluoropyrimidine fatal toxicity | Capecitabine looks like a parent prodrug, but the safety-critical actor is 5-FU accumulation when DPYD is deficient. | 5-FU accumulation and life-threatening fluoropyrimidine toxicity context. | `index.html?substances=capecitabine&genotype=DPYD:PM&tab=pgx` |
| 3 | Irinotecan SN-38 toxicity | The parent drug is less informative than SN-38 exposure and UGT1A1 detoxification capacity. | SN-38 exposure, UGT1A1, CBC monitoring, irinotecan evidence. | `index.html?substances=irinotecan&genotype=UGT1A1:PM&tab=pgx` |
| 4 | G6PD oxidant stack | Several oxidant drugs can look unrelated by parent name, but converge on red-cell oxidative reserve. | Rasburicase contraindication, hemolysis/methemoglobinemia, G6PD evidence. | `index.html?substances=rasburicase,primaquine,dapsone&genotype=G6PD:deficiency&tab=pgx` |
| 5 | Anesthesia pharmacogenetics | Succinylcholine risk is driven by BCHE hydrolysis plus malignant-hyperthermia susceptibility, not by a normal DDI pair. | Prolonged paralysis/apnea, BCHE deficiency, RYR1/CACNA1S malignant-hyperthermia risk. | `index.html?substances=succinylcholine&genotype=BCHE:null&genotype=RYR1:present&tab=pgx` |

## Panel Coverage

The audit traverses these launch-facing panels for each scenario:

- Safety: risk gauge, known interactions, combination alerts, mechanistic interpretation, transporter interactions, interaction grid, alternatives.
- Pharmacogenomics: fold exposure, genotype effects, metabolites, downstream effects, side-effect burden.
- PK/network/evidence/contributor: PK simulation, washout calendar, burden flags, network, evidence, review queue.

Some panels are expected to be hidden for single-drug or no-data scenarios. The invariant is not that every panel must appear for every case; the invariant is that a visible panel must contain relevant content and a hidden panel must not retain stale text from a previous case.

## Command

```sh
npm run launch:qa
```
