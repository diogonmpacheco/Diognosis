# Genotype-Metabolite Enrichment Checklist

Use this checklist when adding or reviewing genotype-specific metabolite rules. The goal is to avoid reducing every genotype effect to "parent drug goes up" when the clinically important signal may be active-metabolite loss, toxic-metabolite gain, detox failure, transporter exposure, or immune risk.

## Per-Rule Checklist

- Parent substance: canonical `DRUG_DB` name and common aliases.
- Key metabolite or pathway: canonical metabolite name, stable metabolite id, and whether it is active, toxic, inactive, or a systemic pathway marker.
- Gene or actor: enzyme, transporter, detox pathway, or immune allele responsible for the clinically relevant change.
- Phenotype coverage: PM, IM, NM, UM where applicable; use null/reduced/increased-function language for genes where PM/UM is not biologically natural.
- Direction of effect: active metabolite decreases, parent accumulates, toxic metabolite increases, detox reserve falls, transporter exposure rises, or sensitivity changes.
- Clinical interpretation: explain the patient-facing consequence in plain language, with indication-specific caveats.
- Evidence references: each rule must include at least one stable evidence ref with PMID or DOI when available.
- Caveats and contradictions: explicitly state when evidence is indication-specific, debated, not dose-calibrated, or not equivalent to a toxicity warning.
- UI behavior: verify the effect appears on the metabolite/pathway row, not only as a generic parent-drug CYP fold.
- Validation: run release, evidence, and severity checks before committing.

## Batch Strategy

Batch 1: Prodrug Activation Failures
Poor or inhibited metabolism lowers active metabolite formation.

Examples: codeine to morphine, tramadol to O-desmethyltramadol, clopidogrel to active thiol metabolite, tamoxifen to endoxifen, hydrocodone to hydromorphone, losartan to EXP3174, proguanil to cycloguanil.

Batch 2: Parent Accumulation With Inactive Clearance Metabolites
Poor metabolism raises parent drug exposure while inactive metabolite formation falls.

Examples: atomoxetine, metoprolol, nebivolol, TCAs, antipsychotics, voriconazole, PPIs, efavirenz.

Batch 3: Detoxification and Reactive Metabolite Nulls
Poor detoxification or null pathways shift exposure toward toxic/reactive species or reduce detox reserve.

Examples: DPYD with fluoropyrimidines, UGT1A1 with irinotecan and bilirubin pathways, TPMT/NUDT15 with thiopurines, GSTM1/GSTT1 with isothiocyanates or reactive intermediates, G6PD with oxidant drugs, CYP2A6 with coumarin/nicotine-like pathways.

Batch 4: Transporter Reduced-Function Exposure
Transporter genotypes alter exposure without classic metabolism.

Examples: SLCO1B1 statin acid exposure, ABCG2 rosuvastatin/sulfasalazine exposure, ABCB1 digoxin/dabigatran absorption and efflux, renal OCT/MATE/OAT transporter contexts.

Batch 5: Immune and Non-Metabolic Genotypes
These require immune-risk language instead of metabolite language.

Examples: HLA-B*57:01 abacavir/flucloxacillin, HLA-B*15:02 carbamazepine and oxcarbazepine SJS/TEN, HLA-A*31:01 carbamazepine hypersensitivity, HLA-A*32:01 vancomycin DRESS.

## Commit Rule

Each batch should be committed separately. Checklist/documentation updates should be their own commit when they change project process rather than database content.
