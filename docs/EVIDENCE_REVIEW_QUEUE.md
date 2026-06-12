# Evidence Review Queue

Generated from the current Diognosis source data by `scripts/audit/evidence-review-queue.js`.

This queue ranks evidence entries for professional review. It is intentionally conservative: all current public evidence remains pending professional review, and Open Targets-ready fields are present now so imported context can enter the same governance workflow later.

## Summary

| Metric | Count |
| --- | ---: |
| Total queue rows | 454 |
| Pending professional review | 454 |
| Professionally reviewed | 0 |
| Calculation-bearing rows | 235 |
| Rows linked to severe/critical warnings | 170 |
| Critical review rows | 170 |
| High review rows | 0 |
| External context rows | 0 |

## Open Targets-Ready Fields

Each row includes `openTargetsDrugId`, `chemblId`, `openTargetsRelease`, `openTargetsSourceDataset`, `sourceCategory`, `importedContextOnly`, `notSeverityBearing`, and `reviewDecision`. For current Diognosis-curated evidence these fields default to local curated context and `unreviewed`.

Imported Open Targets entries should default to `sourceCategory: "open_targets_context"`, `reviewRequired: true`, `importedContextOnly: true`, `notSeverityBearing: true`, and `reviewDecision: "unreviewed"` until a qualified Diognosis reviewer promotes the entry.

## Top Review Priorities

| Rank | Tier | Score | Evidence ID | Severe/Critical Links | Total Links | Calculation-Bearing | Review Required | Source Category | Decision | Reasons |
| ---: | --- | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |
| 1 | critical_review | 149 | ev_pregnancy_obstetric_workflow | 12 | 19 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 2 | critical_review | 149 | ev_transplant_perioperative_workflow | 10 | 18 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 3 | critical_review | 143 | ev_tacrolimus_cyp3a5_consensus | 8 | 12 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 4 | critical_review | 140 | ev_stroke_neurocritical_workflow | 7 | 16 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 5 | critical_review | 140 | ev_apalutamide_induction_label | 7 | 9 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 6 | critical_review | 140 | ev_enzalutamide_induction_label | 7 | 9 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 7 | critical_review | 137 | ev_maoi_ssri_serotonin | 15 | 15 | yes | no | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, quantified_effects_present, pending_professional_review |
| 8 | critical_review | 137 | ev_mdma_meth_cyp2d6_review | 12 | 12 | yes | no | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, quantified_effects_present, pending_professional_review |
| 9 | critical_review | 137 | ev_cabg_perioperative_medications | 6 | 18 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 10 | critical_review | 137 | ev_everolimus_cyp3a_pgp_label | 6 | 6 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 11 | critical_review | 137 | ev_nitrate_pde5_label | 6 | 6 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 12 | critical_review | 134 | ev_cobicistat_cyp3a_label | 5 | 6 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 13 | critical_review | 132 | ev_dofetilide_renal_cation_label | 5 | 5 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 14 | critical_review | 131 | ev_qt_torsades_tisdale2016 | 8 | 11 | yes | no | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, quantified_effects_present, pending_professional_review |
| 15 | critical_review | 129 | ev_lorlatinib_cyp3a_label | 4 | 5 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 16 | critical_review | 129 | ev_paxlovid_cyp3a_label | 4 | 5 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 17 | critical_review | 128 | ev_simvastatin_label_cyp3a4 | 7 | 7 | yes | no | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, quantified_effects_present, pending_professional_review |
| 18 | critical_review | 127 | ev_dronedarone_cyp3a_pgp_label | 4 | 4 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 19 | critical_review | 127 | ev_stimulant_maoi_fda | 4 | 4 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 20 | critical_review | 126 | ev_erlotinib_ppi_absorption | 3 | 5 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 21 | critical_review | 126 | ev_maribavir_label | 3 | 5 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 22 | critical_review | 125 | ev_sodium_oxybate_cns_depressants_label | 6 | 6 | yes | no | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, quantified_effects_present, pending_professional_review |
| 23 | critical_review | 124 | ev_rilpivirine_acid_cyp3a_qt_label | 3 | 4 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 24 | critical_review | 123 | ev_edoxaban_p_gp_fda | 2 | 5 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 25 | critical_review | 122 | ev_darunavir_boosted_cyp3a_label | 3 | 3 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 26 | critical_review | 122 | ev_flecainide_cyp2d6_pgx | 3 | 3 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 27 | critical_review | 122 | ev_gpiibiiia_bleeding_label | 3 | 3 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 28 | critical_review | 122 | ev_nilotinib_qt_cyp3a_label | 3 | 3 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 29 | critical_review | 122 | ev_ritonavir_cyp3a4_booster_label | 3 | 3 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 30 | critical_review | 122 | ev_tofacitinib_cyp3a4_label | 3 | 3 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 31 | critical_review | 122 | ev_vorapaxar_cyp3a_label | 3 | 3 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 32 | critical_review | 122 | ev_icu_sepsis_shock_workflow | 1 | 12 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 33 | critical_review | 122 | ev_coc_label | 1 | 11 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 34 | critical_review | 121 | ev_bedaquiline_label | 2 | 4 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 35 | critical_review | 121 | ev_dabigatran_dronedarone_fda | 2 | 4 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 36 | critical_review | 121 | ev_dasatinib_cyp3a_acid_label | 2 | 4 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 37 | critical_review | 121 | ev_tmp_smx_label | 2 | 4 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 38 | critical_review | 120 | ev_maoi_ssri_serotonin_fda | 5 | 5 | yes | no | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, quantified_effects_present, pending_professional_review |
| 39 | critical_review | 120 | ev_statin_cyp3a4_williams2002 | 5 | 5 | yes | no | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, quantified_effects_present, pending_professional_review |
| 40 | critical_review | 119 | ev_artemether_lumefantrine_cyp3a_qt_label | 2 | 3 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 41 | critical_review | 119 | ev_atazanavir_cyp3a_ugt1a1_label | 2 | 3 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 42 | critical_review | 119 | ev_crizotinib_cyp3a_label | 2 | 3 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 43 | critical_review | 119 | ev_eplerenone_cyp3a_label | 2 | 3 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 44 | critical_review | 119 | ev_guanfacine_cyp3a_label | 2 | 3 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 45 | critical_review | 119 | ev_midodrine_desglymidodrine_label | 2 | 3 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 46 | critical_review | 119 | ev_potassium_hyperkalemia_label | 2 | 3 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 47 | critical_review | 119 | ev_sunitinib_cyp3a_qt_label | 2 | 3 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 48 | critical_review | 118 | ev_darolutamide_bcrp_label | 3 | 7 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 49 | critical_review | 118 | ev_atovaquone_interactions_label | 1 | 4 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
| 50 | critical_review | 118 | ev_capmatinib_cyp3a_transporter_label | 1 | 4 | yes | yes | diognosis_curated | unreviewed | linked_to_severe_or_critical_warning, calculation_bearing, direct_ddi_evidence_ref, internal_review_required, quantified_effects_present, pending_professional_review |
