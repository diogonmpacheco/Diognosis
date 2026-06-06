# Metabolite Launch Gaps

Generated during the metabolite coverage audit on 2026-06-06 after the first high-confidence fixes were applied.

Scope checked:
- `prodrug:true` drugs missing `METAB` rows
- focused genes/enzymes: CYP2D6, CYP2C19, CYP2C9, CYP2B6, CYP3A5, UGT1A1, UGT2B7, NAT2, DPYD, TPMT, NUDT15, BCHE, G6PD, GSTM1/GSTT1
- `CLINICAL_FOLD` rows without matching `GENOTYPE_METABOLITE_EFFECTS`
- `METAB` rows lacking `evidenceRefs`
- first-class `METABOLITE_ACTORS` missing formation or clearance edges
- high-risk active/toxic metabolites that should remain visible in the Network tab

## Residual Gap Table

| Priority | Parent | Metabolite | Gene/enzyme | Clinical reason | Missing data | Suggested source type |
|---|---|---|---|---|---|---|
| P0 | Pimozide | oxidative/dealkylated metabolites | CYP2D6/CYP3A4 | High QT-risk antipsychotic with calibrated CYP2D6 parent exposure but no metabolite map. | `METAB` parent row and metabolite refs. | FDA label plus human PK review. |
| P0 | Ticlopidine | active thiol/reactive antiplatelet metabolites | CYP2C19/CYP2B6 | Older P2Y12 drug with bleeding, neutropenia/TTP, and CYP2C19/CYP2B6 inhibition context. | `METAB` parent row and evidence-backed active/metabolite inhibition details. | FDA label plus PMID metabolism/DDI studies. |
| P0 | Busulfan | glutathione conjugates / TDM exposure context | GSTA1/GSTM1/GSTT1 | Narrow-index conditioning chemotherapy; GST variation is a clearance/toxicity signal but not a metabolite network row. | `METAB` row for GST conjugation context; possible Network actor for busulfan GST clearance. | Meta-analysis plus transplant PK/TDM guidance. |
| P0 | Mycophenolic Acid | MPAG / Acyl-MPAG | UGT1A9/UGT2B7/ABCG2 | Active moiety is modeled separately from mycophenolate; transplant toxicity/enterohepatic context needs same metabolite coverage. | `METAB` row and UGT2B7 genotype-metabolite effect for acyl glucuronide context. | FDA label plus transplant PK PMID. |
| P1 | Cyclophosphamide | 4-hydroxycyclophosphamide / phosphoramide mustard / acrolein | CYP2B6/CYP3A4/CYP2C9 | Prodrug activation row exists, but `CLINICAL_FOLD` has no `GENOTYPE_METABOLITE_EFFECTS` entry. | CYP2B6 genotype-metabolite effect with formation/toxicity language. | FDA label plus CYP2B6 activation PMID. |
| P1 | Pimozide | parent exposure context | CYP2D6 | `CLINICAL_FOLD` is calibrated but no metabolite/genotype explanation row exists. | Parent-exposure style `GENOTYPE_METABOLITE_EFFECTS` entry or explicit non-metabolite rationale. | FDA label / PharmGKB-style PGx source. |
| P1 | Eliglustat | parent exposure context | CYP2D6/CYP3A4 | High-impact genotype/interaction drug; calibrated CYP2D6 fold lacks metabolite-effect row. | Genotype context row explaining parent exposure and CYP3A interaction gating. | FDA label. |
| P1 | Vincristine | parent exposure / inactive metabolites | CYP3A5/ABCB1 | CYP3A5 fold exists, but Network needs a metabolite or explicit parent-exposure context for neurotoxicity. | CYP3A5 genotype-effect context, preferably not overstated as active metabolite biology. | Oncology label plus CYP3A5 PK/toxicity PMID. |
| P1 | Clopidogrel | 2-oxo-clopidogrel | CYP2C19 | Active thiol is supported, but the two-step activation intermediate still lacks evidence refs. | `evidenceRefs` on intermediate row. | CPIC/FDA label or active-metabolite PK paper. |
| P1 | Diazepam | nordiazepam / oxazepam | CYP2C19 | Active long-lived benzodiazepine metabolites affect sedation/falls; rows lack evidence refs. | `evidenceRefs`; possible first-class nordiazepam actor if Network visibility is desired. | FDA label plus benzodiazepine PK review. |
| P1 | Codeine | M3G/M6G/codeine-6-glucuronide | UGT2B7 | CYP2D6 morphine row is strong; UGT2B7 glucuronides lack row-level refs. | `evidenceRefs` for glucuronide rows. | Opioid glucuronidation review / FDA label. |
| P1 | Morphine | M3G/M6G | UGT2B7 | Active/toxic glucuronide balance matters in renal impairment and opioid toxicity. | `evidenceRefs`; possible Network actor for M6G if high-risk opioid metabolite view expands. | Opioid glucuronidation review and renal PK sources. |
| P1 | Azathioprine | 6-MMP | TPMT | 6-TGN is first-class; toxic 6-MMP row remains compact and not first-class. | Evidence refs and optional toxic-metabolite actor. | CPIC thiopurine guideline plus TDM review. |
| P1 | Dapsone | N-acetyldapsone | NAT2 | Dapsone hydroxylamine is modeled, but NAT2 acetylation row lacks evidence refs. | `evidenceRefs` for NAT2 row. | FDA label / NAT2 PMID. |
| P1 | Sulfasalazine | N-acetylsulfapyridine | NAT2 | NAT2 slow acetylator toxicity context needs provenance. | `evidenceRefs`; possible genotype-metabolite effect refinement. | FDA label plus NAT2 pharmacogenetic review. |
| P2 | alpha-Hydroxymetoprolol | alpha-Hydroxymetoprolol | CYP2D6 | First-class actor has formation edge but no clearance route. Clinical signal is parent exposure. | Clearance route or explicit no-route rationale. | CPIC beta-blocker guideline / metoprolol PK review. |
| P2 | 4-Hydroxy-nebivolol | 4-Hydroxy-nebivolol | CYP2D6 | First-class active actor has formation edge but no clearance route. | Clearance route or explicit no-route rationale. | FDA label / nebivolol CYP2D6 PK source. |
| P2 | EXP3174 | EXP3174 | CYP2C9 | First-class active losartan metabolite has formation edge but no clearance route. | Clearance route evidence, if clinically useful. | Losartan PK review / FDA label. |
| P2 | 6-TGN | 6-thioguanine nucleotides | TPMT/NUDT15 | First-class actor has formation edge but no clearance route; NUDT15 effect is pharmacodynamic/detox rather than simple clearance. | Add detox/dephosphorylation edge only with strong source, or document as systemic effect. | CPIC thiopurine guideline. |
| P2 | Active thiol clopidogrel | active thiol metabolite | CYP2C19 | First-class actor has formation edge and refs, but no clearance route. | Clearance/deactivation route only if source-backed. | CPIC/FDA label or active metabolite PK paper. |
| P2 | Cannabis (THC) | 11-OH-THC / THC-COOH | CYP2C9 | Active oral THC metabolite and inactive marker rows lack refs. | `evidenceRefs` and potential Network actor for 11-OH-THC. | Human cannabinoid PK review. |
| P2 | Cannabis (CBD) | 7-OH-CBD / 7-COOH-CBD | CYP2C19 | Active 7-OH-CBD and CYP2C19 inhibition context lack row refs. | `evidenceRefs`; reconcile with CBD interaction evidence. | FDA Epidiolex label / human PK review. |
| P2 | Sertraline | N-desmethylsertraline | CYP2B6 | Active long-lived metabolite row lacks refs. | `evidenceRefs`. | FDA label / SSRI metabolism review. |
| P2 | Citalopram/Escitalopram | desmethylcitalopram metabolites | CYP2C19 | CYP2C19 active metabolite rows lack refs while CYP2D6 didesmethyl rows are referenced. | `evidenceRefs`. | FDA label / enantiomer PK PMID. |
| P2 | Warfarin | S-7-hydroxywarfarin / S-6-hydroxywarfarin | CYP2C9 | Classic CYP2C9 clearance metabolites lack row refs. | `evidenceRefs`; keep parent-exposure genotype rule central. | CPIC warfarin guideline / label. |
| P2 | Fluorouracil | FBAL | DPYD | DHFU row is referenced; downstream FBAL catabolite lacks refs. | `evidenceRefs`. | CPIC fluoropyrimidine guideline / label. |

## Completed In This Pass

| Priority | Parent | Metabolite | Gene/enzyme | Clinical reason | Missing data | Suggested source type |
|---|---|---|---|---|---|---|
| Fixed | Misoprostol | Misoprostol acid | Esterase | `prodrug:true` row was missing its active metabolite. | Added `METAB` rows and evidence ledger entry. | DailyMed plus PMID PK review. |
| Fixed | Tegafur | 5-Fluorouracil / DHFU | CYP2A6/DPYD | `prodrug:true` row was missing active 5-FU and DPYD toxicity context. | Added `METAB` rows, evidence ledger entry, and DPYD genotype-metabolite effect. | PMID CYP2A6 study plus CPIC DPYD. |
| Fixed | Clopidogrel | Active thiol metabolite | CYP2C19 | First-class actor lacked actor-level evidence refs. | Added actor `evidenceRefs`. | CPIC and active-metabolite PK/PD studies. |
| Fixed | Acetaminophen | NAPQI | CYP2E1/GST | Toxic metabolite actor lacked actor/clearance-route refs. | Added actor and GST route refs. | PMID acetaminophen/alcohol review. |
| Fixed | Haloperidol | HPP+ | CYP3A4 | Toxic metabolite lacked refs and evidence ledger entry. | Added row refs, actor refs, and evidence ledger entry. | PMID neurotoxicity/metabolism literature. |
| Fixed | Caffeine | Paraxanthine | CYP1A2 | First-class active metabolite row lacked refs. | Added row refs. | PK review. |
| Fixed | Imipramine | Desipramine | CYP2C19 | First-class active metabolite row lacked refs. | Added row refs. | CPIC TCA guideline. |
| Fixed | Trazodone | mCPP | CYP3A4/CYP2D6 | First-class active metabolite row lacked refs. | Added row refs. | PMID PK study. |
| Fixed | Losartan | EXP3174 | CYP2C9 | First-class active metabolite row lacked refs. | Added row refs. | Losartan CYP2C9 PK source. |
