# Overview Fragmentation Audit

Generated: 2026-06-15T10:25:10.460Z

Scenarios: 15
Skipped: 0
Failures: 0

| Scenario | Raw findings | Overview concerns | Mechanism paths | Domains | Flags |
|---|---:|---:|---:|---|---|
| Tacrolimus + fluconazole | 10 | 2 | 2 | exposure_increase_toxicity, washout_or_persistence | pass |
| Simvastatin + clarithromycin | 7 | 2 | 2 | exposure_increase_toxicity, washout_or_persistence | pass |
| Rifampin + simvastatin | 10 | 3 | 3 | model_only_mechanistic_context, active_metabolite_accumulation, washout_or_persistence | pass |
| Codeine + fluoxetine + CYP2D6 PM | 11 | 2 | 2 | activation_failure, washout_or_persistence | pass |
| Clopidogrel + omeprazole + CYP2C19 PM | 8 | 1 | 1 | activation_failure | pass |
| Irinotecan + UGT1A1 PM | 2 | 1 | 1 | toxic_metabolite_accumulation | pass |
| Capecitabine + DPYD PM | 2 | 1 | 1 | toxic_metabolite_accumulation | pass |
| Azathioprine + allopurinol + TPMT/NUDT15 PM | 4 | 2 | 2 | exposure_increase_toxicity, toxic_metabolite_accumulation | pass |
| G6PD oxidant stack | 5 | 1 | 1 | risk_marker_context | pass |
| Succinylcholine + BCHE/RYR1 context | 5 | 3 | 3 | risk_marker_context, risk_marker_context, exposure_increase_toxicity | pass |
| Warfarin + ibuprofen | 1 | 1 | 1 | exposure_increase_toxicity | pass |
| Haloperidol + azithromycin + methadone | 11 | 4 | 4 | exposure_increase_toxicity, washout_or_persistence, washout_or_persistence, washout_or_persistence | pass |
| Sertraline + linezolid | 5 | 3 | 3 | exposure_increase_toxicity, washout_or_persistence, washout_or_persistence | pass |
| Diazepam + morphine | 2 | 2 | 2 | exposure_increase_toxicity, washout_or_persistence | pass |
| Fluoxetine + paroxetine washout | 16 | 3 | 3 | exposure_increase_toxicity, washout_or_persistence, washout_or_persistence | pass |

## Concern Titles

### Tacrolimus + fluconazole

- Tacrolimus exposure may rise with Fluconazole
- Fluconazole may persist after stopping

Mechanism paths:
- Tacrolimus exposure may rise with Fluconazole
- Fluconazole may persist after stopping

### Simvastatin + clarithromycin

- Simvastatin exposure may rise with Clarithromycin
- Clarithromycin may persist after stopping

Mechanism paths:
- Simvastatin exposure may rise with Clarithromycin
- Clarithromycin may persist after stopping

### Rifampin + simvastatin

- Simvastatin, Rifampin: interaction review prompt
- Simvastatin active metabolite 6'-Hydroxy-SVA may rise
- Rifampin may persist after stopping

Mechanism paths:
- Simvastatin, Rifampin: interaction review prompt
- Simvastatin active metabolite 6'-Hydroxy-SVA may rise
- Rifampin may persist after stopping

### Codeine + fluoxetine + CYP2D6 PM

- Codeine activation to Morphine may be reduced with Fluoxetine
- Norfluoxetine may persist after stopping

Mechanism paths:
- Codeine activation to Morphine may be reduced with Fluoxetine
- Norfluoxetine may persist after stopping

### Clopidogrel + omeprazole + CYP2C19 PM

- Clopidogrel activation to Active thiol metabolite may be reduced with Omeprazole

Mechanism paths:
- Clopidogrel activation to Active thiol metabolite may be reduced with Omeprazole

### Irinotecan + UGT1A1 PM

- SN-38 may accumulate from Irinotecan

Mechanism paths:
- SN-38 may accumulate from Irinotecan

### Capecitabine + DPYD PM

- 5-Fluorouracil may accumulate from Capecitabine

Mechanism paths:
- 5-Fluorouracil may accumulate from Capecitabine

### Azathioprine + allopurinol + TPMT/NUDT15 PM

- Azathioprine exposure may rise with Allopurinol
- 6-Thioguanine nucleotides (6-TGN) may accumulate from Azathioprine

Mechanism paths:
- Azathioprine exposure may rise with Allopurinol
- 6-Thioguanine nucleotides (6-TGN) may accumulate from Azathioprine

### G6PD oxidant stack

- G6PD deficiency increases oxidant hemolysis review priority

Mechanism paths:
- G6PD deficiency increases oxidant hemolysis review priority

### Succinylcholine + BCHE/RYR1 context

- BCHE low/no function increases prolonged paralysis review priority
- RYR1/CACNA1S MH variant increases malignant hyperthermia review priority
- Succinylcholine may rise

Mechanism paths:
- BCHE low/no function increases prolonged paralysis review priority
- RYR1/CACNA1S MH variant increases malignant hyperthermia review priority
- Succinylcholine may rise

### Warfarin + ibuprofen

- Warfarin exposure may rise with Ibuprofen

Mechanism paths:
- Warfarin exposure may rise with Ibuprofen

### Haloperidol + azithromycin + methadone

- Haloperidol exposure may rise with Azithromycin, Methadone
- Pyridinium metabolite (HPP+) may persist after stopping
- Azithromycin (unchanged, biliary) may persist after stopping
- Desosaminyl-azithromycin may persist after stopping

Mechanism paths:
- Haloperidol exposure may rise with Azithromycin, Methadone
- Pyridinium metabolite (HPP+) may persist after stopping
- Azithromycin (unchanged, biliary) may persist after stopping
- Desosaminyl-azithromycin may persist after stopping

### Sertraline + linezolid

- Sertraline exposure may rise with Linezolid
- Linezolid may persist after stopping
- N-Desmethylsertraline may persist after stopping

Mechanism paths:
- Sertraline exposure may rise with Linezolid
- Linezolid may persist after stopping
- N-Desmethylsertraline may persist after stopping

### Diazepam + morphine

- Diazepam exposure may rise with Morphine
- Nordiazepam (desmethyldiazepam) may persist after stopping

Mechanism paths:
- Diazepam exposure may rise with Morphine
- Nordiazepam (desmethyldiazepam) may persist after stopping

### Fluoxetine + paroxetine washout

- Fluoxetine exposure may rise with Paroxetine
- Norfluoxetine may persist after stopping
- Paroxetine may persist after stopping

Mechanism paths:
- Fluoxetine exposure may rise with Paroxetine
- Norfluoxetine may persist after stopping
- Paroxetine may persist after stopping

