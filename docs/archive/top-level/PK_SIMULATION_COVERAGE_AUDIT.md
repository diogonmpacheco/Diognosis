# PK Simulation Coverage Audit

Generated: 2026-06-06

Scope: `DRUG_DB` coverage against `PK_PARAMS`, with priority given to common selected drugs, narrow-therapeutic-index drugs, long half-life/active-metabolite drugs, nonlinear kinetics, and renal-clearance contexts where the relative fallback can mislead.

## Summary

- Absolute PK profiles increased from 146 to 206 in the first batch, then to 506 in the second batch.
- 360 high-value profiles were added from public-label pharmacokinetic fields and label-style caveat categories.
- Remaining gaps are mostly non-systemic products, biologics, clinical contexts, supplements/foods, environmental toxicants, or drugs where a one-compartment oral curve is not the main useful representation.

## Top selected/common drugs without PK_PARAMS before this batch

- Statins: pravastatin, lovastatin, fluvastatin, pitavastatin.
- Sedatives/anxiolytics: alprazolam, lorazepam, clonazepam, oxazepam, temazepam, triazolam, zolpidem, eszopiclone, buspirone.
- Antidepressants/TCAs: trazodone, vortioxetine, desvenlafaxine, milnacipran, imipramine, clomipramine, doxepin, desipramine.
- Common antimicrobials: linezolid, azithromycin, erythromycin, amoxicillin, cephalexin, cefuroxime, ceftriaxone, cefepime, piperacillin/tazobactam, vancomycin, gentamicin, tobramycin.
- Antivirals/ART: acyclovir, valacyclovir, oseltamivir, atazanavir, ritonavir, lopinavir, dolutegravir, raltegravir, efavirenz, nevirapine.
- Rheum/gout/NSAID/CCB: hydroxychloroquine, methotrexate, colchicine, allopurinol, probenecid, celecoxib, diclofenac, indomethacin, piroxicam, diltiazem, verapamil, nifedipine, felodipine, eplerenone.

## NTI drugs without absolute profiles before this batch

- Added: methotrexate, colchicine, vancomycin, gentamicin, tobramycin.
- Still worth future prioritization: dofetilide, sotalol, flecainide, procainamide, disopyramide, quinidine, theophylline, phenobarbital, primidone, tacrolimus metabolite/active-moiety refinements, and high-dose oncology/supportive-care agents where TDM or renal protocols dominate.

## Long half-life or active-metabolite risks addressed

- Long half-life/persistence: hydroxychloroquine, isavuconazole, azithromycin, vortioxetine, efavirenz, posaconazole, piroxicam, clonazepam, terbinafine.
- Active metabolite/prodrug caveats: lovastatin, trazodone, desvenlafaxine, imipramine, clomipramine, cefuroxime, valacyclovir, oseltamivir, allopurinol.
- Booster/regimen caveats: ritonavir and lopinavir now note that pharmacologic boosting can outlast the displayed parent curve.

## Nonlinear/special-kinetic notes added

- Methotrexate: oral absorption saturation at higher doses plus renal clearance and nephrotoxin/NSAID context.
- Verapamil: nonlinear first-pass behavior plus active norverapamil and conduction effects.
- Nevirapine: autoinduction makes early single-drug kinetics differ from repeated-dose steady state.
- Terbinafine and hydroxychloroquine: tissue persistence makes simple relative fallback understate washout.

## Renal-dominant profiles added

Renal clearance or renal toxicity caveats were added for amoxicillin, cephalexin, cefuroxime, cefepime, piperacillin/tazobactam, vancomycin, gentamicin, tobramycin, acyclovir, valacyclovir, oseltamivir, desvenlafaxine, milnacipran, linezolid metabolites, methotrexate, colchicine, allopurinol/oxypurinol, probenecid, eplerenone, and several NSAID renal-risk contexts.

## Added profile set

pravastatin, lovastatin, fluvastatin, pitavastatin, alprazolam, lorazepam, clonazepam, oxazepam, temazepam, triazolam, zolpidem, eszopiclone, buspirone, trazodone, vortioxetine, desvenlafaxine, milnacipran, imipramine, clomipramine, doxepin, desipramine, linezolid, azithromycin, erythromycin, amoxicillin, cephalexin, cefuroxime, ceftriaxone, cefepime, piperacillin_tazobactam, vancomycin, gentamicin, tobramycin, acyclovir, valacyclovir, oseltamivir, atazanavir, ritonavir, lopinavir, dolutegravir, raltegravir, efavirenz, nevirapine, posaconazole, isavuconazonium_sulfate, terbinafine, hydroxychloroquine, methotrexate, colchicine, allopurinol, probenecid, celecoxib, diclofenac, indomethacin, piroxicam, diltiazem, verapamil, nifedipine, felodipine, eplerenone.

## Second Batch

The second expansion added 300 more systemic `DRUG_DB` entries. The compact table in `src/data/pharmacology.js` stores drug id, bioavailability/route approximation, tmax, half-life, volume of distribution, representative dose, and caveat note, then materializes normal `PK_PARAMS` records at load time.

Priority groups covered: antimicrobials, antiretrovirals/antivirals, oncology drugs, antipsychotics/antidepressants, sedatives, cardiovascular drugs, renal-clearance drugs, hemostasis drugs, antiseizure drugs, endocrine/metabolic drugs, antiparasitics, and transplant/immunology agents.

Batch count check: 300 source rows, 300 materialized absolute profiles, total `PK_PARAMS` count 506.
