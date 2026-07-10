# V1 Phase 4 Validation Matrix

Phase 4 converts the most important Diognosis journeys into a fixed, executable release contract. It checks whether the product preserves the medicine, gene result, parent/metabolite mechanism, source provenance, preliminary-context boundary, and safe handoff across the public Medication Review.

This matrix is release QA, not clinical validation. Passing it does not prove that a medication plan is safe and does not turn Diognosis into a prescribing system.

## Authority Frame

- [FDA Table of Pharmacogenetic Associations](https://www.fda.gov/medical-devices/precision-medicine/table-pharmacogenetic-associations) provides the regulator-framed gene–drug association boundary. FDA explicitly notes that inclusion does not automatically mean testing is required and that genotype is only one factor in medication decisions.
- [CPIC Guidelines](https://cpicpgx.org/guidelines/) frame how an already-available genetic result may be interpreted; they do not decide whether a test should be ordered or replace patient-specific clinical judgment.
- [PharmCAT recommendation matching](https://pharmcat.org/methods/Matching-Recommendations/) provides the report-style expectation: match a defined gene result to applicable guideline annotations while preserving the source group’s wording and recommendation boundaries.

## Executable Contract

Every scenario must:

- resolve every selected medicine and preserve every requested gene/marker result;
- render at least one review priority with distinct provenance, mechanism-confidence, and context-fit chips;
- expose authority, primary-literature, or other linked-source provenance in Evidence;
- keep modeled-only evidence from preserving severe or critical output;
- start as a preliminary review until clinical context is supplied;
- keep medicines and gene results in the URL fragment and exclude clinical context from the share URL;
- generate a clinician/pharmacist handoff with not-medical-advice and medication-change boundaries;
- avoid unsafe certainty and internal adapter/expansion language;
- preserve one selected tab and one active tabpanel;
- remain keyboard reachable through skip links, semantic tablists, and the medication-search combobox.

## Fixed Scenarios

| ID | Journey | Mechanism that must remain visible | Share path |
|---|---|---|---|
| `clopidogrel-cyp2c19-activation` | Clopidogrel + CYP2C19 reduced function | Active-thiol formation, not parent name alone | `index.html#substances=clopidogrel,omeprazole&genotype=CYP2C19:PM&tab=overview` |
| `codeine-cyp2d6-activation` | Codeine + CYP2D6 poor metabolism | Morphine formation failure | `index.html#substances=codeine&genotype=CYP2D6:PM&tab=overview` |
| `metoprolol-cyp2d6-parent-exposure` | Metoprolol + CYP2D6 poor metabolism | Parent exposure and hemodynamic monitoring | `index.html#substances=metoprolol&genotype=CYP2D6:PM&tab=overview` |
| `warfarin-multigene-inr` | Warfarin + CYP2C9/VKORC1/CYP4F2 | Multi-gene interpretation plus INR | `index.html#substances=warfarin&genotype=CYP2C9:PM&genotype=VKORC1:PM&genotype=CYP4F2:IM&tab=overview` |
| `simvastatin-slco1b1-transport` | Simvastatin + SLCO1B1 reduced function | OATP1B1 transport and exposure | `index.html#substances=simvastatin&genotype=SLCO1B1:PM&tab=overview` |
| `tacrolimus-cyp3a5-expression` | Tacrolimus + CYP3A5 expresser context | Expression-dependent clearance and troughs | `index.html#substances=tacrolimus&genotype=CYP3A5:IM&tab=overview` |
| `capecitabine-dpyd-detoxification` | Capecitabine + DPYD poor metabolism | 5-FU catabolism and toxicity | `index.html#substances=capecitabine&genotype=DPYD:PM&tab=overview` |
| `thiopurine-tpmt-nudt15-marrow` | Azathioprine/allopurinol + TPMT/NUDT15 | 6-TGN and marrow-toxicity context | `index.html#substances=azathioprine,allopurinol&genotype=TPMT:PM&genotype=NUDT15:PM&tab=overview` |
| `irinotecan-ugt1a1-sn38` | Irinotecan + UGT1A1 reduced function | SN-38 detoxification | `index.html#substances=irinotecan&genotype=UGT1A1:PM&tab=overview` |
| `g6pd-oxidant-reserve` | Rasburicase/primaquine/dapsone + G6PD | Red-cell oxidative reserve and drug-specific risk | `index.html#substances=rasburicase,primaquine,dapsone&genotype=G6PD:deficiency&tab=overview` |
| `succinylcholine-bche-ryr1-anesthesia` | Succinylcholine + BCHE/RYR1 | Hydrolysis versus malignant-hyperthermia susceptibility | `index.html#substances=succinylcholine&genotype=BCHE:null&genotype=RYR1:present&tab=overview` |
| `atomoxetine-cyp2d6-parent-exposure` | Atomoxetine + CYP2D6 poor metabolism | Parent exposure and tolerability | `index.html#substances=atomoxetine&genotype=CYP2D6:PM&tab=overview` |
| `tamoxifen-cyp2d6-endoxifen` | Tamoxifen + CYP2D6 poor metabolism | Endoxifen formation | `index.html#substances=tamoxifen&genotype=CYP2D6:PM&tab=overview` |
| `codeine-fluoxetine-phenoconversion` | Codeine/fluoxetine + CYP2D6 normal result | Inhibitor-driven functional phenotype | `index.html#substances=codeine,fluoxetine&genotype=CYP2D6:NM&tab=overview` |
| `ssri-switch-persistence` | Paroxetine/fluoxetine switching context | Parent/metabolite persistence and recovery | `index.html#substances=paroxetine,fluoxetine&tab=overview` |

The canonical machine-readable definitions and their product-specific guardrails live in `data/v1-validation-scenarios.json`.

## Cross-Surface Coverage

The 10 authority-framed PGx families are also exercised in `scripts/audit/data-views-audit.js` across PGx Explorer, Review Questions, Gene Coverage, and fragment-only links back into Medication Review. Phase 4 does not create a second clinical interpretation engine; it verifies that the existing surfaces agree about identity, mechanism, provenance, and product boundaries.

Accessibility acceptance includes:

- a visible-on-focus skip link on Medication Review and Data Views;
- semantic, arrow-key-operable tablists on both products;
- a list-autocomplete medication-search combobox with active-option state;
- explicit labels for all 10 clinical-context controls;
- one selected tab and one active tabpanel;
- reduced-motion handling and visible keyboard focus.

## Commands

Run the phase-specific gate after building `index.html`:

```sh
node scripts/audit/v1-validation-matrix-audit.js
```

The full release gate runs the matrix together with the exhaustive Data Views audit:

```sh
npm run release:check
```
