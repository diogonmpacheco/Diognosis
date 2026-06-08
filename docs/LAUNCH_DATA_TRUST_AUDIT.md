# Launch Data Trust Audit

Audit date: 2026-06-06

## Scope

This audit checked the generated launch bundle (`index.html`) after rebuilding from source. The pass covered drug naming, aliases, brand/generic collisions, duplicate DDI pairs, severe-pair provenance, dangling evidence references, evidence review flags, generated stats, README stats, live-app stats, and high-risk drug metadata.

## Counts

| Metric | Count |
| --- | ---: |
| Drugs in `DRUG_DB` | 625 |
| Evidence entries in `STUDY_DB` | 455 |
| Public evidence entries | 453 |
| Baseline source-linked entries, all `STUDY_DB` | 161 |
| Professional-reviewed evidence entries | 0 |
| Pending-review enrichment entries | 294 |
| Interaction pairs after fixes | 627 |
| Severe/critical interaction pairs after fixes | 323 |
| Severe/critical pairs linked only to pending-review evidence | 188 |

Note: generated stats and README intentionally count all `STUDY_DB` entries. No entry has been marked professionally reviewed yet. The 188 severe/critical rows linked only to pending-review evidence are intentionally integrated for public-preview feedback, but must remain visibly badged as pending professional review.

## Check Results

| Check | Result |
| --- | ---: |
| Duplicate drug names | 0 |
| Duplicate aliases | 0 |
| Brand/generic collisions | 0 |
| Duplicate DDI pairs | 0 |
| Duplicate DDI pairs with conflicting severity | 0 |
| Severe/critical DDI pairs missing `evidenceRefs` | 0 |
| Evidence refs pointing to missing `STUDY_DB` entries | 0 |
| Baseline public entries lacking PMID, DOI, or URL unless regulatory label | 0 |
| `reviewRequired:true` entries presented as professionally reviewed | 0 |
| Generated stats mismatching source data | 0 |
| README stats mismatching generated stats | 0 |
| Live bundle stats mismatching generated stats | 0 |
| High-risk drugs lacking class/category/route metadata | 0 |

## Errors Fixed

Removed 4 duplicate DDI rows from `src/data/interactions.js`:

| Pair | Fix |
| --- | --- |
| `Methotrexate + Trimethoprim/Sulfamethoxazole` | Removed older reversed duplicate; preserved `ev_mtx_interactions_bannwarth1996` on the retained row. |
| `Warfarin + Trimethoprim/Sulfamethoxazole` | Removed older reversed duplicate; preserved `ev_warfarin_abx_lane2014` on the retained row. |
| `Lisinopril + Trimethoprim/Sulfamethoxazole` | Removed older reversed duplicate with no linked `STUDY_DB` ref; retained newer label-backed row. |
| `Dronedarone + Dabigatran` | Removed stale enrichment duplicate; preserved `ev_dabigatran_dronedarone_fda` on the retained row. |

After rebuild, `KNOWN_DDI` dropped from 631 to 627 rows, severe DDI rows dropped from 326 to 323, and duplicate-pair count dropped from 4 to 0.

## Remaining Review Queue

The remaining queue is expected launch review work, not a structural data failure:

| Queue | Count |
| --- | ---: |
| `reviewRequired:true` evidence entries | 294 |
| Review-queue entries with PMID, DOI, or URL | 294 |
| Pending-review entries accidentally marked professionally reviewed | 0 |
| Pending-review entries hidden from evidence UI badges | 0 |

Most pending entries are enrichment batches that already carry external identifiers but still need clinician/pharmacist review before being treated as professionally reviewed. The highest-priority items are those linked to the greatest number or severity of DDI rows.

## Top 25 Human-Review Priorities

1. `ev_pregnancy_obstetric_workflow` - Pregnancy/obstetric workflow coverage; weighted DDI severity score 68.
2. `ev_transplant_perioperative_workflow` - Transplant perioperative/immunosuppression workflow coverage; score 62.
3. `ev_cabg_perioperative_medications` - CABG/cardiac surgery perioperative medications; score 59.
4. `ev_stroke_neurocritical_workflow` - Stroke/thrombolysis/neurocritical workflow coverage; score 55.
5. `ev_dialysis_advanced_ckd_workflow` - Dialysis/advanced CKD workflow coverage; score 43.
6. `ev_tacrolimus_cyp3a5_consensus` - CPIC CYP3A5/tacrolimus dosing guideline; score 43.
7. `ev_apalutamide_induction_label` - Apalutamide CYP/UGT/transporter label; score 34.
8. `ev_coc_label` - Combined oral contraceptive enzyme induction and lamotrigine label; score 34.
9. `ev_enzalutamide_induction_label` - Enzalutamide CYP induction label; score 34.
10. `ev_icu_sepsis_shock_workflow` - ICU/sepsis/shock workflow coverage; score 34.
11. `ev_fluoroquinolone_cation_absorption_label` - Fluoroquinolone cation-chelation label; score 27.
12. `ev_everolimus_cyp3a_pgp_label` - Everolimus CYP3A4/P-gp label; score 24.
13. `ev_insulin_glargine_beta_blocker_label` - Insulin glargine hypoglycemia masking context; score 24.
14. `ev_nitrate_pde5_label` - Nitrate/PDE5 contraindication label; score 24.
15. `ev_cobicistat_cyp3a_label` - Cobicistat strong CYP3A4 inhibition label; score 23.
16. `ev_dofetilide_renal_cation_label` - Dofetilide renal cation transport contraindications; score 20.
17. `ev_lorlatinib_cyp3a_label` - Lorlatinib CYP3A inducer/substrate label; score 19.
18. `ev_paxlovid_cyp3a_label` - Paxlovid CYP3A inhibition/inducer contraindications; score 19.
19. `ev_maribavir_label` - Maribavir UL97/CYP3A/P-gp label; score 18.
20. `ev_edoxaban_p_gp_fda` - Edoxaban P-gp transport scaling factors; score 17.
21. `ev_dronedarone_cyp3a_pgp_label` - Dronedarone CYP3A4/P-gp interactions label; score 16.
22. `ev_levothyroxine_absorption_label` - Levothyroxine absorption-reduction label; score 16.
23. `ev_stimulant_maoi_fda` - Stimulant/MAOI contraindication label; score 16.
24. `ev_erlotinib_ppi_absorption` - Erlotinib/PPI pharmacokinetic evidence; score 17.
25. `ev_rilpivirine_acid_cyp3a_qt_label` - Rilpivirine acid/CYP3A/QT context label; score 15.

## Validation Commands

Completed:

- `npm run build`
- `node scripts/launch-data-trust-audit.js`
- `npm test`
- `npm run validate:strict`
