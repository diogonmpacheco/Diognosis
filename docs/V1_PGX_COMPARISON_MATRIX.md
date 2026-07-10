# V1 PGx Comparison Matrix

Human-readable matrix for comparing Diognosis PGx behavior against CPIC, PharmGKB, PharmCAT-style recommendation expectations, and FDA/DailyMed label wording when relevant.

This is a QA matrix, not a clinical-validation claim. Diognosis should explain mechanism, parent/metabolite exposure, source-linked context, and review boundaries without generating patient-specific prescribing instructions.

## Source Frame

- CPIC/ClinPGx guideline pages are used as the source-linked guideline frame already embedded in `src/data/clinicalStandards.js`.
- PharmCAT-style expectation means phenotype-to-recommendation matching from a reported gene result, not broad pathway-map ranking.
- FDA/DailyMed label language is used where labels create a boundary or tension, especially when mechanism suggests exposure shift but automatic genotype-only dose change is not established.

## Matrix

| Case | External PGx Expectation | Diognosis V1 Expectation | Guardrail |
|---|---|---|---|
| Clopidogrel + CYP2C19 PM/IM | Reduced CYP2C19 function can lower active-thiol formation; review non-CYP2C19-dependent P2Y12 options when appropriate. | PGx Explorer shows Clopidogrel near the top for CYP2C19 reduced function with active-thiol context and Diognosis back-links. | Do not imply automatic substitution; bleeding risk, indication, procedure timing, and contraindications still decide. |
| Codeine or tramadol + CYP2D6 PM/UM | CYP2D6 PM can reduce opioid-active metabolite formation; UM can raise opioid-active metabolite toxicity risk. | PGx Explorer shows Codeine and Tramadol with morphine or O-desmethyltramadol active-metabolite context. | Do not frame this as parent-only exposure; pain indication, age, respiratory risk, seizure/serotonin risk, and local protocols matter. |
| Metoprolol + CYP2D6 PM/IM | Reduced CYP2D6 function can raise parent metoprolol exposure. | PGx Explorer shows Metoprolol as parent-exposure/hemodynamic review context. | Do not make a genotype-only dose instruction; review pulse, blood pressure, indication, dose tolerance, and CYP2D6 inhibitors. |
| Warfarin + CYP2C9/VKORC1/CYP4F2 | Warfarin interpretation is algorithmic and INR-guided across genotype plus clinical factors. | PGx Explorer exposes Warfarin from CYP2C9, VKORC1, and CYP4F2 contexts and preserves multi-gene back-links. | Do not calculate or imply a fixed dose; INR and anticoagulation protocol remain mandatory. |
| Simvastatin, atorvastatin, or rosuvastatin + SLCO1B1 reduced function | Reduced OATP1B1 uptake can raise statin exposure or muscle-symptom risk, especially with dose and interacting drugs. | PGx Explorer shows statin medication contexts for SLCO1B1 reduced function. | Do not imply one universal statin alternative; ASCVD goal, prior tolerance, CK/symptoms, renal/hepatic context, and co-medications decide. |
| Tacrolimus + CYP3A5 expresser | CYP3A5 expressers can have higher tacrolimus clearance relative to non-expressers. | PGx Explorer keeps CYP3A5 as report-style expression context and shows Tacrolimus. | Do not put CYP3A5 expression guidance under CYP3A4; therapeutic drug monitoring and transplant protocol dominate. |
| Capecitabine or fluorouracil + DPYD reduced function | Reduced DPYD function can impair 5-FU catabolism and increase severe fluoropyrimidine toxicity risk. | PGx Explorer shows Capecitabine and Fluorouracil as primary medication contexts with 5-FU/toxicity framing. | Do not calculate chemotherapy doses; oncology protocol, organ function, prior toxicity, and rescue/supportive-care planning decide. |
| Azathioprine, mercaptopurine, or thioguanine + TPMT/NUDT15 reduced function | Reduced TPMT or NUDT15 function increases thiopurine marrow-toxicity context. | PGx Explorer shows thiopurines for TPMT and NUDT15 reduced function. | Do not calculate thiopurine doses; CBC, liver tests, metabolite monitoring, disease protocol, and specialist oversight remain decisive. |
| Irinotecan + UGT1A1 reduced function | Reduced UGT1A1 function can impair SN-38 glucuronidation and increase severe neutropenia or diarrhea risk. | PGx Explorer shows Irinotecan near the top for UGT1A1 reduced function with SN-38/toxicity context. | Do not calculate irinotecan doses; regimen intensity, bilirubin/liver function, CBC/diarrhea monitoring, and oncology protocol decide. |
| Rasburicase, primaquine, or dapsone + G6PD risk present | G6PD deficiency lowers red-cell oxidative reserve; risk differs by drug and context. | PGx Explorer shows Rasburicase, Primaquine, Dapsone, Tafenoquine, and Nitrofurantoin with the G6PD deficiency back-link token. | Do not use blanket avoidance language for every listed drug; keep rasburicase contraindication-level context separate from drug-specific risk tiers. |

## Current Coverage

- Automated PGx Explorer coverage exists in `scripts/audit/data-views-audit.js`.
- Existing checks already cover Clopidogrel/CYP2C19, Codeine/CYP2D6, DPYD, G6PD, HLA marker separation, profile back-links, neutral first load, and Gene Coverage boundaries.
- Added comparison-matrix checks should cover the remaining V1 trust cases without adding another audit script.

## Still Pending

- Real-user comprehension testing beyond the executable Phase 4 matrix.
- Ongoing CYP2D6 wording review when new labels, guidelines, or user-feedback evidence changes the parent-versus-active-metabolite framing.
- Revisit the post-V1 Pathway Explorer decision only if user testing shows that Gene Coverage plus Review Questions remains confusing.
