# Enrichment Coverage Audit

Generated: 2026-06-15T12:54:55.743Z

| Metric | Count |
| --- | --- |
| drugs | 625 |
| ddi_pairs | 627 |
| study_entries | 456 |
| staged_records | 532 |
| literature_drafts | 248 |
| high_priority_missing_drugs | 152 |
| high_priority_missing_pairs | 100 |
| pgx_gaps | 57 |
| metabolite_gaps | 100 |
| evidence_gaps | 100 |

## Top Missing Drugs

| Drug | Class | Score | Gaps |
| --- | --- | --- | --- |
| Rifampin | Rifamycin | 175 | no active/toxic actor |
| Warfarin | Anticoagulant | 154 | no active/toxic actor; no timing/washout context |
| Ketoconazole | Azole Antifungal | 125 | no active/toxic actor |
| Tacrolimus | Immunosuppressant | 114 | no active/toxic actor; no timing/washout context |
| Amiodarone | Antiarrhythmic | 107 | no active/toxic actor |
| Clopidogrel | Antiplatelet | 95 | no timing/washout context |
| Dofetilide | Class III Antiarrhythmic | 81 | no active/toxic actor; no timing/washout context |
| MDMA (Ecstasy) | Empathogen | 76 | no active/toxic actor; no PK profile; no timing/washout context |
| Clarithromycin | Macrolide AB | 74 | no active/toxic actor |
| Disopyramide | Class IA Antiarrhythmic | 74 | no direct DDI/evidence refs; no DDI rows; no active/toxic actor; no timing/washout context |
| Cyclosporine | Immunosuppressant | 71 | no active/toxic actor; no timing/washout context |
| Simvastatin | Statin | 70 | no active/toxic actor; no timing/washout context |
| Propafenone | Class IC Antiarrhythmic | 68 | no active/toxic actor; no timing/washout context |
| Ayahuasca (DMT+MAOI) | Psychedelic | 67 | no active/toxic actor; no PK profile; no timing/washout context |
| Fluoxetine | SSRI | 67 | no timing/washout context |

## Top Missing Combinations

| Drug 1 | Drug 2 | Theme | Confidence | Basis | Score |
| --- | --- | --- | --- | --- | --- |
| Clarithromycin | Abiraterone | CYP3A inhibitor + CYP3A substrate | strong_mechanistic_candidate | explicit route match: CYP3A4; high-risk or narrow-therapeutic-index victim | 80 |
| Clarithromycin | Albendazole | CYP3A inhibitor + CYP3A substrate | strong_mechanistic_candidate | explicit route match: CYP3A4; high-risk or narrow-therapeutic-index victim; active/toxic/prodrug context | 80 |
| Clarithromycin | Alfentanil | CYP3A inhibitor + CYP3A substrate | strong_mechanistic_candidate | explicit route match: CYP3A4; high-risk or narrow-therapeutic-index victim | 80 |
| Clarithromycin | Alprazolam | CYP3A inhibitor + CYP3A substrate | strong_mechanistic_candidate | explicit route match: CYP3A4; structured/source candidate touches pair drug | 80 |
| Clarithromycin | Amiodarone | CYP3A inhibitor + CYP3A substrate | strong_mechanistic_candidate | explicit route match: CYP3A4; high-risk or narrow-therapeutic-index victim | 80 |
| Clarithromycin | Amitriptyline | CYP3A inhibitor + CYP3A substrate | strong_mechanistic_candidate | explicit route match: CYP3A4; high-risk or narrow-therapeutic-index victim; structured/source candidate touches pair drug | 80 |
| Clarithromycin | Apalutamide | CYP3A inhibitor + CYP3A substrate | strong_mechanistic_candidate | explicit route match: CYP3A4; high-risk or narrow-therapeutic-index victim | 80 |
| Clarithromycin | Aripiprazole | CYP3A inhibitor + CYP3A substrate | strong_mechanistic_candidate | explicit route match: CYP3A4; high-risk or narrow-therapeutic-index victim; structured/source candidate touches pair drug | 80 |
| Clarithromycin | Atazanavir | CYP3A inhibitor + CYP3A substrate | strong_mechanistic_candidate | explicit route match: CYP3A4; high-risk or narrow-therapeutic-index victim | 80 |
| Clarithromycin | Azithromycin | CYP3A inhibitor + CYP3A substrate | strong_mechanistic_candidate | explicit route match: CYP3A4; high-risk or narrow-therapeutic-index victim | 80 |
| Clarithromycin | Bictegravir | CYP3A inhibitor + CYP3A substrate | strong_mechanistic_candidate | explicit route match: CYP3A4; high-risk or narrow-therapeutic-index victim | 80 |
| Clarithromycin | Brexpiprazole | CYP3A inhibitor + CYP3A substrate | strong_mechanistic_candidate | explicit route match: CYP3A4; high-risk or narrow-therapeutic-index victim | 80 |
| Clarithromycin | Buprenorphine | CYP3A inhibitor + CYP3A substrate | strong_mechanistic_candidate | explicit route match: CYP3A4; high-risk or narrow-therapeutic-index victim | 80 |
| Clarithromycin | Cilostazol | CYP3A inhibitor + CYP3A substrate | strong_mechanistic_candidate | explicit route match: CYP3A4; high-risk or narrow-therapeutic-index victim; structured/source candidate touches pair drug | 80 |
| Clarithromycin | Citalopram | CYP3A inhibitor + CYP3A substrate | strong_mechanistic_candidate | explicit route match: CYP3A4; high-risk or narrow-therapeutic-index victim; structured/source candidate touches pair drug | 80 |

## Top PGx Gaps

| Source | Gene | Drug | Claim |
| --- | --- | --- | --- |
| ClinPGx | ATP2A1 | Clozapine | clinical_annotation |
| ClinPGx | ESR1 | Tamoxifen | clinical_annotation |
| ClinPGx | ESR1 | Tamoxifen | clinical_annotation |
| ClinPGx | ESR1 | Tamoxifen | clinical_annotation |
| ClinPGx | FAAH | Clozapine | clinical_annotation |
| ClinPGx | GCG | Clozapine | clinical_annotation |
| ClinPGx | GRIN2B | Clozapine | clinical_annotation |
| ClinPGx | GRIN2B | Clozapine | clinical_annotation |
| ClinPGx | HLA-B | Abacavir | clinical_annotation |
| ClinPGx | HTR3A | Clozapine | clinical_annotation |
| ClinPGx | HTR3A | Clozapine | clinical_annotation |
| ClinPGx | LTA | Abacavir | clinical_annotation |
| ClinPGx | LTA | Abacavir | clinical_annotation |
| ClinPGx | LTB | Abacavir | clinical_annotation |
| ClinPGx | LTB | Abacavir | clinical_annotation |

## Top Metabolite Gaps

| Parent | Metabolite | Gaps |
| --- | --- | --- |
| 2C-B | 4-Bromo-2,5-dimethoxyphenethylamine (deaminated) | metabolite row has no actor; no evidence refs |
| 2C-B | 2-(4-Bromo-2,5-dimethoxyphenyl)ethanol | metabolite row has no actor; no evidence refs |
| 2C-B | Demethylated 2C-B | metabolite row has no actor; no evidence refs |
| 2C-B | 2C-B (unchanged) | metabolite row has no actor; no evidence refs |
| 2C-I | Deaminated 2C-I | metabolite row has no actor; no evidence refs |
| 2C-I | Demethylated 2C-I | metabolite row has no actor; no evidence refs |
| 2C-I | 2C-I (unchanged) | metabolite row has no actor; no evidence refs |
| Acetaminophen | Acetaminophen glucuronide | metabolite row has no actor; no evidence refs |
| Acetaminophen | Acetaminophen sulfate | metabolite row has no actor; no evidence refs |
| Acetaminophen | Cysteine/mercapturic acid conjugate | metabolite row has no actor; no evidence refs |
| Acetaminophen | 3-Hydroxy-acetaminophen | metabolite row has no actor; no evidence refs |
| Acetaminophen | Methoxy-acetaminophen | metabolite row has no actor; no evidence refs |
| Albuterol | Albuterol 4-O-sulfate | metabolite row has no actor; no evidence refs |
| Albuterol | Albuterol (unchanged renal elimination) | metabolite row has no actor; no evidence refs |
| Alcohol (Ethanol) | Acetaldehyde | metabolite row has no actor; no evidence refs |

## Top Evidence Gaps

| Drug 1 | Drug 2 | Severity | Gap |
| --- | --- | --- | --- |
| Ayahuasca (DMT+MAOI) | Tyramine-rich Foods | severe | pending professional review/source tier check |
| Clopidogrel | Omeprazole | severe | pending professional review/source tier check |
| Clopidogrel | Esomeprazole | severe | pending professional review/source tier check |
| Clopidogrel | Fluvoxamine | severe | pending professional review/source tier check |
| Bupropion | Tamoxifen | severe | pending professional review/source tier check |
| Bupropion | Codeine | severe | pending professional review/source tier check |
| Bupropion | Tramadol | severe | pending professional review/source tier check |
| Lithium | Ibuprofen | severe | pending professional review/source tier check |
| Lithium | Naproxen | severe | pending professional review/source tier check |
| Lithium | Diclofenac | severe | pending professional review/source tier check |
| Lithium | Hydrochlorothiazide | severe | pending professional review/source tier check |
| Methotrexate | Ibuprofen | severe | pending professional review/source tier check |
| Methotrexate | Naproxen | severe | pending professional review/source tier check |
| Digoxin | Amiodarone | severe | pending professional review/source tier check |
| Digoxin | St. John's Wort | severe | pending professional review/source tier check |
