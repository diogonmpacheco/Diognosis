# Launch Data Trust Audit

Audit date: 2026-06-09

## Scope

This audit checked the generated launch bundle (`index.html`) after rebuilding from source. The pass covered drug naming, aliases, brand/generic collisions, duplicate DDI pairs, severe-pair provenance, dangling evidence references, evidence review flags, generated stats, README stats, live-app stats, and high-risk drug metadata.

## Counts

| Metric | Count |
| --- | ---: |
| Drugs in `DRUG_DB` | 625 |
| Evidence entries in `STUDY_DB` | 456 |
| Public evidence entries | 454 |
| Public source-linked evidence entries | 454 |
| Pending professional review entries | 454 |
| Professional-reviewed evidence entries | 0 |
| Internal `reviewRequired:true` enrichment entries | 295 |
| Internal enrichment entries feeding graph calculations | 229 |
| Internal enrichment entries feeding DDI evidence profiles | 155 |
| Interaction pairs after fixes | 627 |
| Severe/critical interaction pairs after fixes | 323 |
| Severe/critical pairs linked only to pending-review evidence | 188 |

Note: generated stats and README intentionally count all `STUDY_DB` entries. No entry has been marked professionally reviewed yet. The `reviewRequired:true` flag is an internal enrichment/scoring control, not the boundary between reviewed and unreviewed evidence. The 188 severe/critical rows linked only to internally review-required evidence are intentionally integrated for public-preview feedback, and internal enrichment evidence contributes to graph confidence and DDI evidence-profile calculations while the whole evidence set remains visibly pending professional review.

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
| Public entries lacking PMID, DOI, or URL unless regulatory label | 0 |
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

## Remaining Professional Review Work

The remaining queue is expected launch review work, not a structural data failure. All public evidence is pending professional review:

| Queue | Count |
| --- | ---: |
| Public evidence entries pending professional review | 454 |
| `reviewRequired:true` evidence entries | 295 |
| Internal review-required entries with PMID, DOI, or URL | 295 |
| Pending-review entries accidentally marked professionally reviewed | 0 |
| Pending-review entries hidden from evidence UI badges | 0 |

The internal `reviewRequired:true` subset identifies enrichment entries that still need source-faithfulness review before they can affect scoring. It does not imply the other entries are professionally reviewed. The highest-priority items are those linked to the greatest number or severity of DDI rows.

## Top 25 Human-Review Priorities

1. `ev_pregnancy_obstetric_workflow` - Pregnancy and obstetric emergency medication workflow coverage; score 70.
2. `ev_transplant_perioperative_workflow` - Transplant perioperative and immunosuppression workflow coverage; score 64.
3. `ev_maoi_ssri_serotonin` - Serotonin syndrome clinical review and diagnostic criteria; score 62.
4. `ev_cabg_perioperative_medications` - CABG/cardiac surgery perioperative medication coverage; score 61.
5. `ev_stroke_neurocritical_workflow` - Stroke/thrombolysis/neurocritical workflow coverage; score 57.
6. `ev_mdma_meth_cyp2d6_review` - MDMA, methamphetamine, and CYP2D6 pharmacogenetics review; score 48.
7. `ev_dialysis_advanced_ckd_workflow` - Dialysis/advanced CKD medication workflow coverage; score 45.
8. `ev_tacrolimus_cyp3a5_consensus` - CPIC CYP3A5/tacrolimus dosing guideline; score 45.
9. `ev_qt_torsades_tisdale2016` - Drug-induced QT prolongation and torsades pharmacist review; score 41.
10. `ev_apalutamide_induction_label` - Apalutamide CYP/UGT/transporter label; score 36.
11. `ev_coc_label` - Combined oral contraceptive enzyme induction and lamotrigine label; score 36.
12. `ev_enzalutamide_induction_label` - Enzalutamide CYP induction label; score 36.
13. `ev_icu_sepsis_shock_workflow` - ICU/sepsis/shock medication workflow coverage; score 36.
14. `ev_simvastatin_label_cyp3a4` - Simvastatin contraindicated and dose-limited interactions label; score 30.
15. `ev_fluoroquinolone_cation_absorption_label` - Fluoroquinolone cation-chelation label; score 29.
16. `ev_everolimus_cyp3a_pgp_label` - Everolimus narrow-index CYP3A4/P-gp interactions label; score 26.
17. `ev_insulin_glargine_beta_blocker_label` - Insulin glargine hypoglycemia masking context; score 26.
18. `ev_nitrate_pde5_label` - Nitrate/PDE5 inhibitor contraindication label; score 26.
19. `ev_sodium_oxybate_cns_depressants_label` - Sodium oxybate alcohol/CNS depressant contraindication label; score 26.
20. `ev_cobicistat_cyp3a_label` - Cobicistat strong CYP3A4 inhibition label; score 25.
21. `ev_rosuvastatin_label` - Rosuvastatin OATP1B1/BCRP inhibitor interactions label; score 23.
22. `ev_dofetilide_renal_cation_label` - Dofetilide renal cation transport contraindications; score 22.
23. `ev_maoi_ssri_serotonin_fda` - FDA labels for MAOI contraindication with serotonergic agents; score 22.
24. `ev_lorlatinib_cyp3a_label` - Lorlatinib CYP3A inducer/substrate label; score 21.
25. `ev_paxlovid_cyp3a_label` - Paxlovid CYP3A inhibition and strong inducer contraindications; score 21.

## Validation Commands

Completed:

- `npm run build`
- `node scripts/launch-data-trust-audit.js`
- `npm test`
- `npm run validate:strict`
