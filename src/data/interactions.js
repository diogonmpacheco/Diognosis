// MedCheck — Pathway diversions, combination products, known DDI pairs
// Phase A: modular source — concatenated by build.js

const PATHWAY_DIVERSION = {
"Codeine":{primary:{enzyme:"CYP2D6",metabolite:"Morphine",activity:"active",pct:10},diverted:[{enzyme:"CYP3A4",metabolite:"Norcodeine",activity:"inactive",pct:80,note:"Major when 2D6 blocked; no analgesic effect"},{enzyme:"UGT2B7",metabolite:"Codeine-6-glucuronide",activity:"weak",pct:10}],clinicalImpact:"Complete loss of analgesia in CYP2D6 PM",severity:"critical",pmEffect:"no_effect",umEffect:"toxicity"},
"Tramadol":{primary:{enzyme:"CYP2D6",metabolite:"O-desmethyltramadol (M1)",activity:"active",pct:30},diverted:[{enzyme:"CYP3A4",metabolite:"N-desmethyltramadol (M2)",activity:"inactive",pct:60},{enzyme:"CYP2B6",metabolite:"N,O-didesmethyltramadol",activity:"inactive",pct:10}],clinicalImpact:"Reduced analgesia — M1 has 200x higher mu-opioid affinity than parent",severity:"high",pmEffect:"reduced_effect",umEffect:"toxicity"},
"Oxycodone":{primary:{enzyme:"CYP3A4",metabolite:"Noroxycodone",activity:"weak",pct:45},diverted:[{enzyme:"CYP2D6",metabolite:"Oxymorphone",activity:"active_potent",pct:11,note:"14x more potent; increased when CYP3A4 blocked"}],clinicalImpact:"CYP3A4 inhibitors shunt toward oxymorphone, paradoxically increasing potency",severity:"high",pmEffect:"altered_profile"},
"Hydrocodone":{primary:{enzyme:"CYP2D6",metabolite:"Hydromorphone",activity:"active_potent",pct:5},diverted:[{enzyme:"CYP3A4",metabolite:"Norhydrocodone",activity:"weak",pct:60}],clinicalImpact:"CYP2D6 PM: slightly reduced analgesia (parent still active)",severity:"moderate",pmEffect:"slightly_reduced"},
"Fluoxetine":{primary:{enzyme:"CYP2D6",metabolite:"Norfluoxetine",activity:"active",pct:50},diverted:[{enzyme:"CYP2C9",metabolite:"p-Trifluoromethylphenol",activity:"inactive",pct:20},{enzyme:"CYP2C19",metabolite:"Norfluoxetine (minor route)",activity:"active",pct:15}],clinicalImpact:"CYP2D6 PM: parent ↑ but norfluoxetine also active — effect maintained, DDI risk ↑",severity:"moderate",pmEffect:"increased_exposure_same_effect"},
"Venlafaxine":{primary:{enzyme:"CYP2D6",metabolite:"O-desmethylvenlafaxine (desvenlafaxine)",activity:"active_equipotent",pct:56},diverted:[{enzyme:"CYP3A4",metabolite:"N-desmethylvenlafaxine",activity:"weak",pct:30},{enzyme:"CYP2C19",metabolite:"N,O-didesmethylvenlafaxine",activity:"inactive",pct:5}],clinicalImpact:"CYP2D6 PM: parent ↑ ~2.5x, desvenlafaxine formation reduced, active moiety often similar but ratio shifts",severity:"moderate",pmEffect:"altered_profile"},
"Mirtazapine":{primary:{enzyme:"CYP2D6",metabolite:"8-Hydroxymirtazapine",activity:"weak",pct:20},diverted:[{enzyme:"CYP3A4",metabolite:"N-desmethylmirtazapine",activity:"weak",pct:40},{enzyme:"CYP1A2",metabolite:"N-oxide-mirtazapine",activity:"inactive",pct:10}],clinicalImpact:"CYP2D6 PM: AUC ↑ ~50%. Increased sedation and weight gain",severity:"moderate",pmEffect:"increased_exposure"},
"Bupropion":{primary:{enzyme:"CYP2B6",metabolite:"Hydroxybupropion",activity:"active",pct:80},diverted:[{enzyme:"CYP2C19",metabolite:"Threo-hydrobupropion",activity:"weak",pct:10},{enzyme:"AKR",metabolite:"Erythro-hydrobupropion",activity:"weak",pct:10}],clinicalImpact:"CYP2B6 PM: hydroxybupropion AUC ↓ ~23%, parent bupropion modestly elevated (~1.5-2x), active moiety slightly reduced",severity:"moderate",pmEffect:"altered_profile"},
"Atomoxetine":{primary:{enzyme:"CYP2D6",metabolite:"4-Hydroxyatomoxetine",activity:"active_equipotent",pct:60},diverted:[{enzyme:"CYP2C19",metabolite:"N-desmethylatomoxetine",activity:"weak",pct:10},{enzyme:"FMO3",metabolite:"Atomoxetine N-oxide",activity:"inactive",pct:5}],clinicalImpact:"CYP2D6 PM: AUC ↑ 10x, t1/2 5h→22h. CV side effects ↑↑",severity:"critical",pmEffect:"severe_toxicity"},
"Aripiprazole":{primary:{enzyme:"CYP2D6",metabolite:"Dehydro-aripiprazole",activity:"active",pct:40},diverted:[{enzyme:"CYP3A4",metabolite:"Dehydro-aripiprazole (minor)",activity:"active",pct:30}],clinicalImpact:"CYP2D6 PM: AUC ↑ 80%. FDA recommends 50% dose reduction",severity:"high",pmEffect:"increased_exposure"},
"Risperidone":{primary:{enzyme:"CYP2D6",metabolite:"9-Hydroxyrisperidone (paliperidone)",activity:"active_equipotent",pct:70},diverted:[{enzyme:"CYP3A4",metabolite:"N-dealkylation products",activity:"inactive",pct:10}],clinicalImpact:"CYP2D6 PM: altered ratio may affect EPS risk but active moiety similar",severity:"moderate",pmEffect:"altered_ratio"},
"Haloperidol":{primary:{enzyme:"CYP2D6",metabolite:"4-fluorobenzoylpropionic acid",activity:"inactive",pct:15},diverted:[{enzyme:"Carbonyl reductase",metabolite:"Reduced haloperidol",activity:"active",pct:25,note:"Reduced haloperidol can recycle to parent and feed HPP+ formation"},{enzyme:"CYP3A4",metabolite:"Pyridinium metabolite (HPP+)",activity:"neurotoxic",pct:15,note:"Formed from reduced haloperidol; neurotoxic, similar to MPTP"}],clinicalImpact:"CYP2D6 PM: parent haloperidol accumulates, increasing reduced haloperidol substrate pool and potential HPP+ formation",severity:"critical",pmEffect:"neurotoxic_shift"},
"Clopidogrel":{primary:{enzyme:"CYP2C19",metabolite:"Active thiol metabolite",activity:"active",pct:15},diverted:[{enzyme:"Esterases",metabolite:"SR26334 (inactive acid)",activity:"inactive",pct:85}],clinicalImpact:"CYP2C19 PM: active metabolite ↓ 70%. FDA black box warning",severity:"critical",pmEffect:"no_effect"},
"Warfarin":{primary:{enzyme:"CYP2C9",metabolite:"7-Hydroxywarfarin (S-warfarin clearance)",activity:"inactive",pct:85},diverted:[{enzyme:"CYP3A4",metabolite:"10-Hydroxywarfarin (R-warfarin)",activity:"inactive",pct:10},{enzyme:"CYP1A2",metabolite:"6-Hydroxywarfarin",activity:"inactive",pct:5}],clinicalImpact:"CYP2C9 PM: S-warfarin clearance ↓ 50-90%. Requires 30-50% dose reduction",severity:"critical",pmEffect:"severe_toxicity"},
"Metoprolol":{primary:{enzyme:"CYP2D6",metabolite:"O-desmethylmetoprolol",activity:"inactive",pct:65},diverted:[{enzyme:"CYP2D6",metabolite:"alpha-Hydroxymetoprolol",activity:"inactive",pct:10}],clinicalImpact:"CYP2D6 PM: AUC ↑ 5x. Severe bradycardia/hypotension",severity:"critical",pmEffect:"severe_toxicity"},
"Nebivolol":{primary:{enzyme:"CYP2D6",metabolite:"4-Hydroxynebivolol",activity:"weak",pct:38},diverted:[{enzyme:"UGT",metabolite:"Glucuronide conjugates",activity:"inactive",pct:30}],clinicalImpact:"CYP2D6 PM: AUC ↑ 15x (up to 23x in CYP2D6-null homozygotes). Severe bradycardia at standard doses",severity:"critical",pmEffect:"severe_toxicity"},
"Omeprazole":{primary:{enzyme:"CYP2C19",metabolite:"5-Hydroxyomeprazole",activity:"inactive",pct:80},diverted:[{enzyme:"CYP3A4",metabolite:"Omeprazole sulfone",activity:"inactive",pct:20}],clinicalImpact:"CYP2C19 PM: AUC ↑ 5-10x. Enhanced acid suppression — beneficial but infection risk ↑",severity:"low",pmEffect:"enhanced_effect"},
"Tamoxifen":{primary:{enzyme:"CYP2D6",metabolite:"Endoxifen",activity:"active_100x",pct:5},diverted:[{enzyme:"CYP3A4",metabolite:"N-desmethyltamoxifen",activity:"weak",pct:90}],clinicalImpact:"CYP2D6 PM: endoxifen ↓ 75%. Breast cancer recurrence risk increases",severity:"critical",pmEffect:"treatment_failure"},
"DXM (Dextromethorphan)":{primary:{enzyme:"CYP2D6",metabolite:"Dextrorphan",activity:"active_different",pct:90},diverted:[{enzyme:"CYP3A4",metabolite:"3-Methoxymorphinan",activity:"weak",pct:10}],clinicalImpact:"CYP2D6 PM: DXM accumulates as NMDA antagonist/dissociative. Serotonin syndrome risk ↑↑",severity:"high",pmEffect:"qualitative_shift"}
};

// ═══════════════════════════════════════════════════════════════════
// COMBINATION PRODUCTS — new substances/effects from drug combos
// ═══════════════════════════════════════════════════════════════════
const COMBINATION_PRODUCTS = [
{type:"toxic_overlap",drugs:["Acetaminophen","Isoniazid"],metabolite:"NAPQI",mechanism:"Isoniazid induces CYP2E1, increasing NAPQI from acetaminophen 3-5x. NAPQI depletes glutathione → hepatocellular necrosis",risk:"Severe hepatotoxicity at therapeutic doses",severity:"critical",management:"Limit acetaminophen <2g/day; monitor LFTs"},
{type:"toxic_overlap",drugs:["Acetaminophen","Alcohol (Ethanol)"],metabolite:"NAPQI",mechanism:"Chronic alcohol induces CYP2E1 + depletes glutathione. NAPQI pathway share 5%→20%+",risk:"Hepatotoxicity at normal doses in chronic drinkers",severity:"high",management:"Avoid in heavy drinkers; max 2g/day"},
{type:"toxic_overlap",drugs:["Valproic Acid","Carbamazepine"],metabolite:"4-ene-Valproic acid",mechanism:"CBZ induces CYP2C9/CYP2A6, shifting VPA toward hepatotoxic 4-ene-VPA. CBZ 10,11-epoxide competes for epoxide hydrolase",risk:"Hepatotoxicity, hyperammonemia",severity:"high",management:"Monitor ammonia and LFTs closely"},
{type:"toxic_overlap",drugs:["Simvastatin","Clarithromycin"],metabolite:"Simvastatin acid (muscle accumulation)",mechanism:"Clarithromycin (strong CYP3A4+P-gp inhibitor) blocks simvastatin first-pass. AUC ↑ 10-12x",risk:"Rhabdomyolysis → myoglobin → acute kidney injury",severity:"critical",management:"CONTRAINDICATED. Hold statin or use azithromycin"},
{type:"toxic_overlap",drugs:["Metformin","Contrast Dye"],metabolite:"Metformin accumulation (renal failure)",mechanism:"Contrast dye can cause AKI. Metformin (100% renal clearance) accumulates → inhibits mitochondrial complex I → lactate overwhelms hepatic clearance",risk:"Metformin-associated lactic acidosis (MALA) — 50% mortality",severity:"critical",management:"Hold metformin 48h before contrast; restart after creatinine stable"},
{type:"toxic_overlap",drugs:["Methotrexate","Ibuprofen"],metabolite:"7-Hydroxymethotrexate (renal precipitation)",mechanism:"NSAIDs compete for OAT1/OAT3 transporters, reducing MTX renal clearance 30-50%",risk:"AKI, pancytopenia, mucositis",severity:"critical",management:"Avoid NSAIDs with high-dose MTX; space >48h"},
{type:"pathway_competition",drugs:["Fluoxetine","Codeine"],mechanism:"Fluoxetine (strong CYP2D6 inhibitor) blocks Codeine→Morphine entirely → all to Norcodeine (inactive)",result:{increased:"Norcodeine (inactive)",decreased:"Morphine (active)"},effect:"Complete loss of codeine analgesia",severity:"critical",alternative:"Use morphine directly or non-opioid"},
{type:"pathway_competition",drugs:["Paroxetine","Tamoxifen"],mechanism:"Paroxetine (strong CYP2D6 inhibitor) blocks Tamoxifen→Endoxifen (100x more potent). Endoxifen ↓ 67%",result:{increased:"N-desmethyltamoxifen (weak)",decreased:"Endoxifen (potent)"},effect:"Breast cancer recurrence risk increases significantly",severity:"critical",alternative:"Use citalopram, escitalopram, or venlafaxine"},
{type:"pathway_competition",drugs:["Fluoxetine","Metoprolol"],mechanism:"Fluoxetine inhibits CYP2D6, blocking metoprolol clearance. AUC ↑ 4-7x = pharmacological PM phenotype",result:{increased:"Unchanged metoprolol",decreased:"O-desmethylmetoprolol"},effect:"Severe bradycardia, hypotension, heart block risk",severity:"high",alternative:"Switch to bisoprolol (renal) or atenolol"},
{type:"pathway_competition",drugs:["Bupropion","DXM (Dextromethorphan)"],mechanism:"Hydroxybupropion (strong CYP2D6 inhibitor) blocks DXM→dextrorphan. DXM accumulates as NMDA antagonist",result:{increased:"DXM (NMDA antagonist)",decreased:"Dextrorphan (antitussive)"},effect:"FDA-approved as Nuedexta when intentional; serotonin risk if unintentional",severity:"moderate"},
{type:"pathway_competition",drugs:["Omeprazole","Clopidogrel"],mechanism:"Omeprazole inhibits CYP2C19, blocking clopidogrel 2-step bioactivation. Active metabolite ↓ 45%",result:{increased:"SR26334 (inactive acid)",decreased:"Active thiol metabolite"},effect:"Increased stent thrombosis and MI risk. FDA warning",severity:"critical",alternative:"Use pantoprazole or famotidine"},
{type:"reactive_intermediate",drugs:["Carbamazepine","Lamotrigine"],mechanism:"CBZ induces UGT1A4 (lamotrigine clearance ↓ 50%). Lamotrigine inhibits epoxide hydrolase → CBZ-epoxide accumulates",result:{increased:"CBZ-10,11-epoxide (toxic)",decreased:"Lamotrigine levels"},effect:"Lamotrigine subtherapeutic + CBZ epoxide toxicity",severity:"high",management:"Double lamotrigine dose; monitor CBZ epoxide"},
{type:"reactive_intermediate",drugs:["Valproic Acid","Lamotrigine"],mechanism:"VPA inhibits UGT1A4 → lamotrigine AUC ↑ 2-3x → increased reactive arene oxide intermediate → immune hypersensitivity",result:{increased:"Lamotrigine arene oxide (reactive)",decreased:"Lamotrigine-N2-glucuronide (safe)"},effect:"Stevens-Johnson syndrome/TEN risk ↑ 5-10x",severity:"critical",management:"MUST halve lamotrigine dose; titrate 25mg q2wk"},
{type:"dual_saturation",drugs:["Phenytoin","Valproic Acid"],mechanism:"VPA displaces phenytoin from albumin (free fraction 10%→15-20%) + inhibits CYP2C9. PHT induces CYP/UGT lowering VPA",result:{increased:"Free phenytoin (unbound, active)",decreased:"Total phenytoin (misleading)"},effect:"PHT toxicity despite 'normal' total levels. Must measure FREE phenytoin",severity:"high",management:"Monitor free phenytoin, not total"},
{type:"additive_channel_block",drugs:["Citalopram","Ondansetron"],mechanism:"Both block hERG K+ channels. Metabolite didesmethylcitalopram also has hERG activity",result:{increased:"Combined hERG blockade",decreased:"Cardiac repolarization reserve"},effect:"Additive QTc prolongation → Torsades de Pointes. Amplified if CYP2C19 PM",severity:"high",management:"Avoid combination; baseline ECG + QTc monitoring"},
{type:"additive_bleeding",drugs:["Warfarin","Aspirin (Low-Dose)"],mechanism:"Warfarin inhibits clotting factors II/VII/IX/X. Aspirin blocks COX-1→TXA2→platelet aggregation. Different mechanisms, additive bleed",result:{increased:"Prostacyclin predominance",decreased:"Thromboxane A2 + clotting factors"},effect:"GI bleeding risk ↑ 2-5x. ICH risk ↑",severity:"high",management:"If both needed: lowest aspirin dose (81mg) + PPI"},
{type:"nephrotoxic_synergy",drugs:["Lisinopril","Ibuprofen"],mechanism:"ACEi dilates efferent arteriole. NSAIDs constrict afferent arteriole. Combined: glomerular perfusion collapse",result:{increased:"Blocked renal prostaglandin PGE2",decreased:"Glomerular filtration pressure"},effect:"AKI + hyperkalemia. Triple whammy with diuretic",severity:"high",management:"Avoid chronic NSAIDs with ACEi; short courses <5 days"},
{type:"hyperkalemia_cascade",drugs:["Spironolactone","Lisinopril"],mechanism:"Spironolactone blocks aldosterone directly. ACEi ↓ aldosterone via ↓ angiotensin II. Dual blockade of K+ excretion",result:{increased:"Serum potassium",decreased:"Aldosterone-mediated K+ excretion"},effect:"Hyperkalemia → cardiac arrhythmia. K+ >6.0 can be fatal",severity:"high",management:"Check K+ within 1 week; avoid K+ supplements"},
{type:"novel_metabolite",drugs:["Cocaine","Alcohol (Ethanol)"],metabolite:"Cocaethylene",mechanism:"Hepatic transesterification: cocaine + ethanol → cocaethylene via carboxylesterase-1. Unique metabolite that ONLY forms when both are present",result:{increased:"Cocaethylene (t½ 5h vs cocaine 1h)",decreased:"Benzoylecgonine clearance"},effect:"Cocaethylene has 3x longer half-life, equivalent cardiotoxicity. 18-25x increase in sudden death risk",severity:"critical",management:"No safe combination. Cocaethylene prolongs the 'high' but dramatically increases cardiac arrest risk"},
{type:"novel_metabolite",drugs:["MDMA (Ecstasy)","Alcohol (Ethanol)"],metabolite:"Ethyl-MDA",mechanism:"CYP2D6-mediated N-demethylation increased by alcohol co-administration; alcohol impairs thermoregulation and worsens dehydration",result:{increased:"MDA (neurotoxic metabolite) + core temperature",decreased:"MDMA clearance + fluid regulation"},effect:"Synergistic hyperthermia, severe dehydration, hyponatremia. Hepatotoxicity risk ↑ 3-5x",severity:"critical",management:"Extremely dangerous. Both impair thermoregulation; combined hepatotoxicity"},
{type:"novel_metabolite",drugs:["MDMA (Ecstasy)","Cannabis (THC)"],metabolite:"Enhanced serotonin surge",mechanism:"THC modulates 5-HT release via CB1 receptors. MDMA causes massive serotonin release. Combined: unpredictable serotonin potentiation",result:{increased:"Serotonin + dopamine release",decreased:"Serotonin reuptake"},effect:"Increased serotonin syndrome risk, cardiovascular strain, hyperthermia",severity:"high",management:"Unpredictable potentiation; tachycardia and panic attacks common"},
{type:"novel_metabolite",drugs:["Cocaine","Cannabis (THC)"],metabolite:"Enhanced cardiovascular stress",mechanism:"Cocaine blocks norepinephrine reuptake (sympathomimetic). THC causes tachycardia via CB1. Combined: additive heart rate ↑ + coronary vasospasm",result:{increased:"Heart rate (25-50% above either alone)",decreased:"Coronary perfusion"},effect:"16x increase in MI risk in first hour vs cocaine alone. Aortic dissection risk",severity:"critical",management:"No safe combination. Coronary vasospasm + tachycardia + increased oxygen demand"},
{type:"novel_metabolite",drugs:["Heroin (Diacetylmorphine)","Cocaine"],metabolite:"Speedball interaction",mechanism:"Heroin (→morphine) causes CNS/respiratory depression + vasodilation. Cocaine causes CNS stimulation + vasoconstriction. Opposing effects mask overdose signals",result:{increased:"False sense of safety — stimulation masks sedation",decreased:"Respiratory drive awareness"},effect:"Respiratory failure when cocaine wears off (shorter t½) but opioid persists. Leading cause of poly-drug death",severity:"critical",management:"EXTREMELY DANGEROUS. Cocaine wears off in 30min, heroin persists 4-6h → delayed respiratory arrest"},
{type:"novel_metabolite",drugs:["GHB","Alcohol (Ethanol)"],metabolite:"Synergistic GABA-A/B agonism",mechanism:"Both act on GABA receptors: alcohol on GABA-A, GHB on GABA-B and GHB receptor. Combined: profound CNS depression with steep dose-response curve",result:{increased:"GABA-ergic inhibition (supra-additive)",decreased:"Respiratory drive + gag reflex"},effect:"Respiratory arrest at doses that would be tolerable individually. Death from aspiration or respiratory failure",severity:"critical",management:"CONTRAINDICATED. Supra-additive CNS depression — no safe dose combination"},
{type:"novel_metabolite",drugs:["Ketamine","Alcohol (Ethanol)"],metabolite:"Synergistic dissociation",mechanism:"Ketamine blocks NMDA glutamate receptors; alcohol potentiates GABA-A. Combined: profound dissociation + loss of protective reflexes",result:{increased:"Sedation depth + vomiting risk",decreased:"Protective airway reflexes"},effect:"Aspiration pneumonia risk. Unpredictable loss of consciousness. Liver damage from norketamine + acetaldehyde",severity:"high",management:"High aspiration risk — both cause nausea/vomiting but ketamine suppresses gag reflex"},
{type:"pathway_competition",drugs:["Cocaine","Fluoxetine"],mechanism:"Both are strong serotonin reuptake inhibitors. Cocaine also blocks dopamine and norepinephrine reuptake. Fluoxetine inhibits CYP3A4 (weak) reducing cocaine→norcocaine clearance",result:{increased:"Synaptic serotonin + cocaine exposure",decreased:"Cocaine hepatic clearance"},effect:"Serotonin syndrome risk + prolonged cocaine cardiotoxicity + seizure risk",severity:"critical",management:"Severe interaction. Cocaine + any SSRI raises serotonin syndrome and cardiac risk"},
{type:"pathway_competition",drugs:["MDMA (Ecstasy)","Fluoxetine"],mechanism:"Fluoxetine blocks SERT, preventing MDMA from entering neurons to release serotonin. MDMA effects greatly reduced but residual NE/DA effects cause unpredictable cardiovascular response",result:{increased:"Norepinephrine + residual effects",decreased:"MDMA serotonin release (blocked 80%+)"},effect:"MDMA effects mostly blocked but cardiovascular risk remains. Users may re-dose dangerously",severity:"moderate",management:"SSRI blocks MDMA's primary mechanism; re-dosing is dangerous"},
{type:"pathway_competition",drugs:["MDMA (Ecstasy)","Paroxetine"],mechanism:"Paroxetine (strong CYP2D6 inhibitor) blocks MDMA→MDA conversion AND blocks SERT. MDMA parent compound accumulates — increased neurotoxicity from direct MDMA action on neurons",result:{increased:"MDMA parent compound (neurotoxic at high levels)",decreased:"MDA formation + serotonin release"},effect:"Paradoxical: less 'high' but more neurotoxicity from MDMA accumulation",severity:"high",management:"Strong CYP2D6 inhibitor + SERT block = unpredictable, dangerous"},
{type:"toxic_overlap",drugs:["Acetaminophen","Cocaine"],metabolite:"NAPQI + norcocaine nitrosonium",mechanism:"Cocaine induces CYP3A4 and causes hepatic ischemia via vasoconstriction. This shifts acetaminophen toward CYP-mediated NAPQI pathway while reducing hepatic blood flow for clearance",risk:"Synergistic hepatotoxicity — cocaine ischemia + NAPQI toxicity",severity:"high",management:"Avoid acetaminophen during/after cocaine use; hepatic blood flow already compromised"}
];

// ═══════════════════════════════════════════════════════════════════
// TRANSPORTER DDI — P-gp, OATP, OCT, OAT mediated interactions
// ═══════════════════════════════════════════════════════════════════
const KNOWN_DDI = [
  // ── Food / diet interactions ──
  {drug1:"Warfarin",drug2:"High Vitamin K Foods",severity:"moderate",category:"diet",mechanism:"Abrupt increases in vitamin K intake can oppose warfarin anticoagulation and lower INR",effect:"↓ Warfarin effect — keep intake consistent and monitor INR after diet changes",evidence:{confidence:"high",sources:["FDA label","clinical guidelines"]}},
  {drug1:"Ayahuasca (DMT+MAOI)",drug2:"Tyramine-rich Foods",severity:"severe",category:"diet",mechanism:"MAO-A/MAO-B inhibition reduces gut tyramine clearance; absorbed tyramine can trigger norepinephrine release and hypertensive crisis",effect:"Avoid high-tyramine foods with nonselective MAO inhibition",evidence:{confidence:"high",sources:["DailyMed MAOI labels"]},evidenceRefs:["ev_tyramine_maoi_labels"]},
  // ── Clopidogrel prodrug activation failures ──
  {drug1:"Clopidogrel",drug2:"Omeprazole",severity:"severe",category:"prodrug",mechanism:"Omeprazole inhibits CYP2C19, blocking clopidogrel activation to its active thiol metabolite",effect:"↓↓ Clopidogrel efficacy — increased risk of cardiovascular events",evidence:{confidence:"high",sources:["FDA label", "CPIC"]},evidenceRefs:["ev_clopidogrel_cyp2c19_cpic"]},
  {drug1:"Clopidogrel",drug2:"Esomeprazole",severity:"severe",category:"prodrug",mechanism:"Esomeprazole inhibits CYP2C19, blocking clopidogrel activation",effect:"↓↓ Clopidogrel efficacy — use pantoprazole instead",evidence:{confidence:"high",sources:["FDA label", "CPIC"]},evidenceRefs:["ev_clopidogrel_cyp2c19_cpic"]},
  {drug1:"Clopidogrel",drug2:"Fluoxetine",severity:"moderate",category:"prodrug",mechanism:"Fluoxetine's metabolite norfluoxetine inhibits CYP2C19, partially blocking clopidogrel activation",effect:"↓ Clopidogrel efficacy — consider alternative SSRI",evidence:{confidence:"high",sources:["FDA label", "CPIC"]},evidenceRefs:["ev_clopidogrel_cyp2c19_cpic","ev_fluoxetine_cyp2d6_fda"]},
  {drug1:"Clopidogrel",drug2:"Fluvoxamine",severity:"severe",category:"prodrug",mechanism:"Fluvoxamine strongly inhibits CYP2C19, blocking clopidogrel activation",effect:"↓↓ Clopidogrel efficacy — contraindicated combination",evidence:{confidence:"high",sources:["FDA label", "CPIC"]},evidenceRefs:["ev_clopidogrel_cyp2c19_cpic"]},
  {drug1:"Clopidogrel",drug2:"Fluconazole",severity:"moderate",category:"prodrug",mechanism:"Fluconazole strongly inhibits CYP2C19, may reduce clopidogrel activation",effect:"↓ Clopidogrel efficacy",evidence:{confidence:"high",sources:["FDA label", "CPIC"]}},
  {drug1:"Clopidogrel",drug2:"Voriconazole",severity:"moderate",category:"prodrug",mechanism:"Voriconazole strongly inhibits CYP2C19, may reduce clopidogrel activation",effect:"↓ Clopidogrel efficacy",evidence:{confidence:"high",sources:["FDA label", "CPIC"]}},
  // ── Bupropion metabolite interactions ──
  {drug1:"Bupropion",drug2:"Clopidogrel",severity:"mild",category:"prodrug",mechanism:"Bupropion/hydroxybupropion weakly inhibit CYP2C19, one pathway in clopidogrel activation. CYP2D6 inhibition is not the clopidogrel activation mechanism.",effect:"Possible small reduction in clopidogrel activation; monitor context rather than treating as a severe interaction",evidence:{confidence:"low",sources:["mechanistic review"]}},
  {drug1:"Bupropion",drug2:"Tamoxifen",severity:"severe",category:"metabolite",mechanism:"Hydroxybupropion strongly inhibits CYP2D6, blocking tamoxifen conversion to active endoxifen",effect:"↓↓ Tamoxifen efficacy — contraindicated",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_bupropion_cyp2d6_fda","ev_tamoxifen_cyp2d6_cpic"]},
  {drug1:"Bupropion",drug2:"Codeine",severity:"severe",category:"metabolite",mechanism:"Hydroxybupropion strongly inhibits CYP2D6, blocking codeine conversion to morphine",effect:"↓↓ Codeine efficacy — no analgesic effect",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_bupropion_cyp2d6_fda","ev_codeine_cyp2d6_cpic"]},
  {drug1:"Bupropion",drug2:"Tramadol",severity:"severe",category:"metabolite",mechanism:"Hydroxybupropion strongly inhibits CYP2D6, blocking tramadol conversion to active O-desmethyltramadol. Also both lower seizure threshold",effect:"↓↓ Tramadol efficacy + ↑ seizure risk",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_bupropion_cyp2d6_fda","ev_bupropion_cyp2d6_kotlyar2005"]},
  // ── Triple whammy (NSAID + ACEi/ARB + diuretic) ──
  {drug1:"Ibuprofen",drug2:"Lisinopril",severity:"moderate",category:"nephro",mechanism:"NSAIDs reduce renal prostaglandins, counteracting ACE inhibitor renoprotection. Reduces antihypertensive effect and increases AKI risk",effect:"↓ Lisinopril efficacy + ↑ acute kidney injury risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Ibuprofen",drug2:"Enalapril",severity:"moderate",category:"nephro",mechanism:"NSAIDs counteract ACE inhibitor renoprotection",effect:"↓ Enalapril efficacy + ↑ AKI risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Ibuprofen",drug2:"Ramipril",severity:"moderate",category:"nephro",mechanism:"NSAIDs counteract ACE inhibitor renoprotection",effect:"↓ Ramipril efficacy + ↑ AKI risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Ibuprofen",drug2:"Losartan",severity:"moderate",category:"nephro",mechanism:"NSAIDs reduce ARB renoprotection",effect:"↓ Losartan efficacy + ↑ AKI risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Ibuprofen",drug2:"Valsartan",severity:"moderate",category:"nephro",mechanism:"NSAIDs reduce ARB renoprotection",effect:"↓ Valsartan efficacy + ↑ AKI risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Naproxen",drug2:"Lisinopril",severity:"moderate",category:"nephro",mechanism:"NSAIDs reduce ACEi renoprotection",effect:"↓ Lisinopril efficacy + ↑ AKI risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Naproxen",drug2:"Losartan",severity:"moderate",category:"nephro",mechanism:"NSAIDs reduce ARB renoprotection",effect:"↓ Losartan efficacy + ↑ AKI risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Diclofenac",drug2:"Lisinopril",severity:"moderate",category:"nephro",mechanism:"NSAIDs reduce ACEi renoprotection",effect:"↓ Lisinopril efficacy + ↑ AKI risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Indomethacin",drug2:"Lisinopril",severity:"moderate",category:"nephro",mechanism:"NSAIDs reduce ACEi renoprotection",effect:"↓ Lisinopril efficacy + ↑ AKI risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  // ── Lithium toxicity ──
  {drug1:"Lithium",drug2:"Ibuprofen",severity:"severe",category:"nephro",mechanism:"NSAIDs reduce lithium renal clearance by 15-25%",effect:"↑↑ Lithium levels — risk of toxicity",evidence:{confidence:"high",sources:["clinical guidelines"]},evidenceRefs:["ev_lithium_nsaid_clearance"]},
  {drug1:"Lithium",drug2:"Naproxen",severity:"severe",category:"nephro",mechanism:"NSAIDs reduce lithium renal clearance",effect:"↑↑ Lithium levels — risk of toxicity",evidence:{confidence:"high",sources:["clinical guidelines"]},evidenceRefs:["ev_lithium_nsaid_clearance"]},
  {drug1:"Lithium",drug2:"Diclofenac",severity:"severe",category:"nephro",mechanism:"NSAIDs reduce lithium renal clearance",effect:"↑↑ Lithium levels — risk of toxicity",evidence:{confidence:"high",sources:["clinical guidelines"]},evidenceRefs:["ev_lithium_nsaid_clearance"]},
  {drug1:"Lithium",drug2:"Lisinopril",severity:"moderate",category:"nephro",mechanism:"ACE inhibitors reduce lithium renal clearance",effect:"↑ Lithium levels — monitor closely",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Lithium",drug2:"Losartan",severity:"moderate",category:"nephro",mechanism:"ARBs reduce lithium renal clearance",effect:"↑ Lithium levels — monitor closely",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Lithium",drug2:"Hydrochlorothiazide",severity:"severe",category:"nephro",mechanism:"Thiazides reduce lithium clearance by 25-40%",effect:"↑↑ Lithium levels — high toxicity risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Lithium",drug2:"Furosemide",severity:"moderate",category:"nephro",mechanism:"Loop diuretics can reduce lithium clearance via volume depletion",effect:"↑ Lithium levels — monitor closely",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  // ── Methotrexate toxicity ──
  {drug1:"Methotrexate",drug2:"Ibuprofen",severity:"severe",category:"nephro",mechanism:"NSAIDs reduce methotrexate renal clearance",effect:"↑↑ Methotrexate levels — bone marrow toxicity risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Methotrexate",drug2:"Probenecid",severity:"severe",category:"transporter",mechanism:"Probenecid inhibits renal OAT1/OAT3 transporters, reducing methotrexate renal secretion",effect:"↑↑ Methotrexate toxicity — avoid or intensively monitor",evidence:{confidence:"high",sources:["FDA label","literature"]}},
  {drug1:"Methotrexate",drug2:"Naproxen",severity:"severe",category:"nephro",mechanism:"NSAIDs reduce methotrexate renal clearance",effect:"↑↑ Methotrexate levels — toxicity risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Methotrexate",drug2:"Trimethoprim-SMX",severity:"severe",category:"hematologic",mechanism:"Both are folate antagonists — additive bone marrow suppression",effect:"↑↑ Pancytopenia risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Methotrexate",drug2:"Omeprazole",severity:"moderate",category:"renal",mechanism:"PPIs may reduce methotrexate renal clearance",effect:"↑ Methotrexate levels",evidence:{confidence:"moderate",sources:["case reports"]}},
  // ── Digoxin interactions ──
  {drug1:"Digoxin",drug2:"Amiodarone",severity:"severe",category:"pk",mechanism:"Amiodarone inhibits P-glycoprotein and reduces digoxin renal clearance by ~50%",effect:"↑↑ Digoxin levels — toxicity risk (halve digoxin dose)",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_digoxin_pgp_amiodarone_fda"]},
  {drug1:"Digoxin",drug2:"St. John's Wort",severity:"severe",category:"induction",mechanism:"St. John's Wort induces P-gp, reducing digoxin absorption and increasing clearance",effect:"Digoxin AUC ↓ 25-40% — loss of rate control or heart failure control",evidence:{confidence:"high",sources:["clinical PK studies"],pmid:["10604132"]}},
  {drug1:"Digoxin",drug2:"Rifampin",severity:"moderate",category:"induction",mechanism:"Rifampin induces P-gp, reducing digoxin exposure by ~30%",effect:"Lower digoxin levels — monitor response and serum concentrations",evidence:{confidence:"high",sources:["FDA label","clinical PK studies"]}},
  {drug1:"Digoxin",drug2:"Verapamil",severity:"severe",category:"pk",mechanism:"Verapamil inhibits P-gp, raises digoxin levels 50-75%",effect:"↑↑ Digoxin levels — toxicity + AV block risk",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Digoxin",drug2:"Diltiazem",severity:"moderate",category:"pk",mechanism:"Diltiazem raises digoxin levels ~20% + additive AV block",effect:"↑ Digoxin levels + ↑ bradycardia",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Digoxin",drug2:"Cyclosporine",severity:"severe",category:"pk",mechanism:"Cyclosporine inhibits P-gp, raises digoxin levels",effect:"↑↑ Digoxin levels",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Digoxin",drug2:"Spironolactone",severity:"moderate",category:"pk",mechanism:"Spironolactone reduces digoxin clearance + hyperkalemia potentiates digoxin toxicity",effect:"↑ Digoxin toxicity risk",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  // ── Warfarin specific ──
  {drug1:"Warfarin",drug2:"Aspirin",severity:"severe",category:"bleed",mechanism:"Additive anticoagulant + antiplatelet effect. Aspirin also causes GI mucosal damage",effect:"↑↑ Major bleeding risk",evidence:{confidence:"high",sources:["clinical guidelines"]},evidenceRefs:["ev_warfarin_nsaid_bleed"]},
  {drug1:"Warfarin",drug2:"Ibuprofen",severity:"severe",category:"bleed",mechanism:"NSAIDs + warfarin: additive bleeding + NSAID GI damage + CYP2C9 competition",effect:"↑↑ Major GI bleeding risk",evidence:{confidence:"high",sources:["clinical guidelines"]},evidenceRefs:["ev_warfarin_nsaid_bleed"]},
  {drug1:"Warfarin",drug2:"Naproxen",severity:"severe",category:"bleed",mechanism:"NSAID + warfarin: additive bleeding",effect:"↑↑ GI bleeding risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Warfarin",drug2:"Acetaminophen",severity:"moderate",category:"pk",mechanism:"Acetaminophen's metabolite NAPQI inhibits vitamin K-dependent clotting factor synthesis at doses >2g/day",effect:"↑ INR — monitor closely",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Warfarin",drug2:"Fluconazole",severity:"severe",category:"pk",mechanism:"Fluconazole strongly inhibits CYP2C9 (warfarin's primary metabolic pathway)",effect:"↑↑ INR — major bleeding risk",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_fluconazole_warfarin_black1996"]},
  {drug1:"Warfarin",drug2:"Metronidazole",severity:"severe",category:"pk",mechanism:"Metronidazole inhibits warfarin metabolism",effect:"↑↑ INR — bleeding risk",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Warfarin",drug2:"Trimethoprim-SMX",severity:"severe",category:"pk",mechanism:"TMP-SMX inhibits CYP2C9 + displaces warfarin from albumin + folate antagonism",effect:"↑↑ INR — bleeding risk",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  // ── DOAC specific ──
  {drug1:"Apixaban",drug2:"Aspirin",severity:"moderate",category:"bleed",mechanism:"Additive anticoagulant + antiplatelet bleeding risk",effect:"↑ Bleeding risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Rivaroxaban",drug2:"Aspirin",severity:"moderate",category:"bleed",mechanism:"Additive bleeding risk",effect:"↑ Bleeding risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Apixaban",drug2:"Clopidogrel",severity:"moderate",category:"bleed",mechanism:"Additive bleeding risk",effect:"↑ Bleeding risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Rivaroxaban",drug2:"Clopidogrel",severity:"moderate",category:"bleed",mechanism:"Additive bleeding risk",effect:"↑ Bleeding risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Dabigatran",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin induces P-gp, reducing dabigatran etexilate absorption and dabigatran AUC by ~67%",effect:"Loss of anticoagulation — avoid/contraindicated",evidence:{confidence:"high",sources:["FDA label"]}},
  {drug1:"Apixaban",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin induces CYP3A4 and P-gp, reducing apixaban AUC by ~54%",effect:"Loss of anticoagulation — avoid/contraindicated",evidence:{confidence:"high",sources:["FDA label"]}},
  {drug1:"Rivaroxaban",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin induces CYP3A4 and P-gp, reducing rivaroxaban AUC by ~50%",effect:"Loss of anticoagulation — avoid/contraindicated",evidence:{confidence:"high",sources:["FDA label"]}},
  {drug1:"Edoxaban",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin induces P-gp, reducing edoxaban exposure by ~35%",effect:"Loss of anticoagulation — avoid when possible",evidence:{confidence:"high",sources:["FDA label"]}},
  // ── Hyperkalemia combos ──
  {drug1:"Spironolactone",drug2:"Lisinopril",severity:"moderate",category:"hyperK",mechanism:"Both cause potassium retention — additive hyperkalemia risk",effect:"↑ Hyperkalemia — monitor K+ closely",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Spironolactone",drug2:"Losartan",severity:"moderate",category:"hyperK",mechanism:"Both cause potassium retention",effect:"↑ Hyperkalemia risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Spironolactone",drug2:"Trimethoprim-SMX",severity:"severe",category:"hyperK",mechanism:"Both block potassium excretion via different mechanisms",effect:"↑↑ Severe hyperkalemia risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Lisinopril",drug2:"Trimethoprim-SMX",severity:"moderate",category:"hyperK",mechanism:"Both promote potassium retention",effect:"↑ Hyperkalemia risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  // ── Serotonin syndrome specific pairs ──
  {drug1:"Fluoxetine",drug2:"Tramadol",severity:"severe",category:"serotonin",mechanism:"SSRI + serotonergic opioid — high serotonin syndrome risk. Also fluoxetine blocks tramadol activation via CYP2D6",effect:"↑↑ Serotonin syndrome + ↓↓ tramadol efficacy",evidence:{confidence:"high",sources:["FDA warning"]}},
  {drug1:"Sertraline",drug2:"Tramadol",severity:"severe",category:"serotonin",mechanism:"SSRI + serotonergic opioid",effect:"↑↑ Serotonin syndrome risk",evidence:{confidence:"high",sources:["FDA warning"]}},
  {drug1:"Fluoxetine",drug2:"Sumatriptan",severity:"moderate",category:"serotonin",mechanism:"SSRI + triptan — serotonin syndrome risk (FDA warning)",effect:"↑ Serotonin syndrome risk — monitor",evidence:{confidence:"high",sources:["FDA warning"]}},
  {drug1:"Sertraline",drug2:"Sumatriptan",severity:"moderate",category:"serotonin",mechanism:"SSRI + triptan",effect:"↑ Serotonin syndrome risk",evidence:{confidence:"high",sources:["FDA warning"]}},
  // ── Seizure threshold ──
  {drug1:"Bupropion",drug2:"Tramadol",severity:"severe",category:"seizure",mechanism:"Both lower seizure threshold independently",effect:"↑↑ Seizure risk — avoid combination",evidence:{confidence:"high",sources:["FDA label"]}},
  {drug1:"Bupropion",drug2:"Cyclobenzaprine",severity:"moderate",category:"seizure",mechanism:"Both lower seizure threshold",effect:"↑ Seizure risk",evidence:{confidence:"high",sources:["FDA label"]}},
  // ── Colchicine + strong 3A4 inhibitors ──
  {drug1:"Colchicine",drug2:"Clarithromycin",severity:"severe",category:"pk",mechanism:"Clarithromycin strongly inhibits CYP3A4, causing massive colchicine accumulation. Multiple fatalities reported",effect:"↑↑↑ Colchicine toxicity — CONTRAINDICATED",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Colchicine",drug2:"Ritonavir",severity:"severe",category:"pk",mechanism:"Ritonavir strongly inhibits CYP3A4 — colchicine accumulation",effect:"↑↑↑ Colchicine toxicity — CONTRAINDICATED",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Colchicine",drug2:"Itraconazole",severity:"severe",category:"pk",mechanism:"Strong CYP3A4 inhibition — colchicine accumulation",effect:"↑↑ Colchicine toxicity",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Colchicine",drug2:"Ketoconazole",severity:"severe",category:"pk",mechanism:"Strong CYP3A4 inhibition — colchicine accumulation",effect:"↑↑ Colchicine toxicity",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  // ── Statin myopathy pairs ──
  {drug1:"Simvastatin",drug2:"Clarithromycin",severity:"severe",category:"pk",mechanism:"Strong CYP3A4 inhibition raises simvastatin AUC 10-fold — rhabdomyolysis risk",effect:"↑↑↑ Rhabdomyolysis — CONTRAINDICATED",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Simvastatin",drug2:"Itraconazole",severity:"severe",category:"pk",mechanism:"Strong CYP3A4 inhibition — rhabdomyolysis",effect:"↑↑↑ Rhabdomyolysis — CONTRAINDICATED",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Simvastatin",drug2:"Ritonavir",severity:"severe",category:"pk",mechanism:"Strong CYP3A4 inhibition — rhabdomyolysis",effect:"↑↑↑ Rhabdomyolysis — CONTRAINDICATED",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Simvastatin",drug2:"Cyclosporine",severity:"severe",category:"pk",mechanism:"CYP3A4 inhibition + OATP inhibition — rhabdomyolysis",effect:"↑↑↑ Rhabdomyolysis — CONTRAINDICATED",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Simvastatin",drug2:"Gemfibrozil",severity:"severe",category:"transporter",mechanism:"Gemfibrozil inhibits OATP1B1 and CYP2C8, raising simvastatin acid exposure about 10-fold",effect:"CONTRAINDICATED — rhabdomyolysis risk",evidence:{confidence:"high",sources:["FDA label"]}},
  {drug1:"Rosuvastatin",drug2:"Gemfibrozil",severity:"severe",category:"transporter",mechanism:"Gemfibrozil inhibits OATP1B1, raising rosuvastatin exposure about 2-fold",effect:"↑ Myopathy risk — avoid or use reduced statin dose",evidence:{confidence:"high",sources:["FDA label"]}},
  {drug1:"Atorvastatin",drug2:"Gemfibrozil",severity:"moderate",category:"transporter",mechanism:"Gemfibrozil inhibits OATP1B1 and raises statin exposure",effect:"↑ Myopathy risk — fenofibrate preferred if fibrate needed",evidence:{confidence:"moderate",sources:["FDA label"]}},
  {drug1:"Pravastatin",drug2:"Gemfibrozil",severity:"moderate",category:"transporter",mechanism:"Gemfibrozil inhibits hepatic uptake transporters and can raise pravastatin exposure",effect:"↑ Myopathy risk — monitor or use alternative",evidence:{confidence:"moderate",sources:["FDA label"]}},
  {drug1:"Rosuvastatin",drug2:"Eltrombopag",severity:"severe",category:"transporter",mechanism:"Eltrombopag inhibits OATP1B1 and BCRP, raising rosuvastatin AUC about 3.6-fold",effect:"↑↑ Myopathy risk — use reduced rosuvastatin dose",evidence:{confidence:"high",sources:["FDA label"]}},
  {drug1:"Lovastatin",drug2:"Clarithromycin",severity:"severe",category:"pk",mechanism:"Strong CYP3A4 inhibition — rhabdomyolysis risk",effect:"↑↑ Rhabdomyolysis risk",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Atorvastatin",drug2:"Clarithromycin",severity:"moderate",category:"pk",mechanism:"Moderate increase in atorvastatin levels via CYP3A4 inhibition",effect:"↑ Myopathy risk — use lower statin dose",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  // ── Tacrolimus/Cyclosporine ──
  {drug1:"Tacrolimus",drug2:"Fluconazole",severity:"severe",category:"pk",mechanism:"CYP3A4 + CYP2C9 inhibition doubles tacrolimus levels",effect:"↑↑ Tacrolimus toxicity — nephrotoxicity, neurotoxicity",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Tacrolimus",drug2:"Voriconazole",severity:"severe",category:"pk",mechanism:"Strong CYP3A4 inhibition triples tacrolimus levels",effect:"↑↑↑ Tacrolimus toxicity",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Cyclosporine",drug2:"Simvastatin",severity:"severe",category:"pk",mechanism:"Cyclosporine raises statin levels via CYP3A4 + OATP inhibition",effect:"↑↑ Rhabdomyolysis risk",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Cyclosporine",drug2:"Ketoconazole",severity:"severe",category:"pk",mechanism:"Ketoconazole inhibits intestinal and hepatic CYP3A, raising cyclosporine bioavailability and reducing clearance",effect:"↑↑ Cyclosporine levels — nephrotoxicity risk; use TDM and major dose reduction",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_ketoconazole_cyclosporine_gomez1995"]},
  // ── Tizanidine + CYP1A2 ──
  {drug1:"Tizanidine",drug2:"Ciprofloxacin",severity:"severe",category:"pk",mechanism:"Ciprofloxacin strongly inhibits CYP1A2, raising tizanidine AUC 10-fold",effect:"↑↑↑ Severe hypotension, sedation — CONTRAINDICATED",evidence:{confidence:"high",sources:["FDA label","clinical PK studies"]},evidenceRefs:["ev_tizanidine_ciprofloxacin_fda"]},
  {drug1:"Tizanidine",drug2:"Fluvoxamine",severity:"severe",category:"pk",mechanism:"Fluvoxamine strongly inhibits CYP1A2, raising tizanidine AUC 33-fold",effect:"↑↑↑ Severe hypotension — CONTRAINDICATED",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  // ── Theophylline ──
  {drug1:"Theophylline",drug2:"Ciprofloxacin",severity:"severe",category:"pk",mechanism:"CYP1A2 inhibition raises theophylline levels — seizure/arrhythmia risk",effect:"↑↑ Theophylline toxicity",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Theophylline",drug2:"Fluvoxamine",severity:"severe",category:"pk",mechanism:"Strong CYP1A2 inhibition — theophylline toxicity",effect:"↑↑ Theophylline toxicity — CONTRAINDICATED",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  // ── Clozapine ──
  {drug1:"Clozapine",drug2:"Ciprofloxacin",severity:"severe",category:"pk",mechanism:"CYP1A2 inhibition raises clozapine levels — seizure/agranulocytosis risk",effect:"↑↑ Clozapine toxicity",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Clozapine",drug2:"Fluvoxamine",severity:"severe",category:"pk",mechanism:"Strong CYP1A2 inhibition raises clozapine 5-10x",effect:"↑↑↑ Clozapine toxicity — CONTRAINDICATED",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  // ── Midazolam sentinel ──
  {drug1:"Midazolam",drug2:"Clarithromycin",severity:"severe",category:"pk",mechanism:"CYP3A4 inhibition raises midazolam AUC 7-fold — respiratory depression",effect:"↑↑ Prolonged deep sedation",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Midazolam",drug2:"Ketoconazole",severity:"severe",category:"pk",mechanism:"CYP3A4 inhibition raises midazolam AUC 15-fold",effect:"↑↑↑ Prolonged sedation — AVOID",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Midazolam",drug2:"Ritonavir",severity:"severe",category:"pk",mechanism:"CYP3A4 inhibition raises midazolam AUC dramatically",effect:"↑↑↑ Prolonged sedation — CONTRAINDICATED",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  // ── Levothyroxine absorption ──
  {drug1:"Levothyroxine",drug2:"Calcium",severity:"moderate",category:"absorption",mechanism:"Calcium chelates levothyroxine in GI tract, reducing absorption by 20-50%",effect:"↓ Levothyroxine absorption — separate by 4 hours",evidence:{confidence:"moderate",sources:["literature"]}},
  {drug1:"Levothyroxine",drug2:"Iron",severity:"moderate",category:"absorption",mechanism:"Iron chelates levothyroxine, reducing absorption",effect:"↓ Levothyroxine absorption — separate by 4 hours",evidence:{confidence:"moderate",sources:["literature"]}},
  {drug1:"Levothyroxine",drug2:"Omeprazole",severity:"mild",category:"absorption",mechanism:"Reduced gastric acid may decrease levothyroxine absorption",effect:"↓ Levothyroxine absorption — may need dose increase",evidence:{confidence:"moderate",sources:["literature"]}},
  {drug1:"Levothyroxine",drug2:"Esomeprazole",severity:"mild",category:"absorption",mechanism:"Reduced gastric acid may decrease levothyroxine absorption",effect:"↓ Levothyroxine absorption",evidence:{confidence:"moderate",sources:["literature"]}},
  // ── Metformin + contrast / alcohol ──
  {drug1:"Metformin",drug2:"Alcohol (Ethanol)",severity:"moderate",category:"metabolic",mechanism:"Both increase lactic acidosis risk. Alcohol inhibits gluconeogenesis",effect:"↑ Lactic acidosis + ↑ hypoglycemia risk",evidence:{confidence:"moderate",sources:["literature"]}},
  {drug1:"Metformin",drug2:"Trimethoprim-SMX",severity:"moderate",category:"transporter",mechanism:"Trimethoprim inhibits OCT2 and MATE1, reducing metformin renal secretion by ~40%",effect:"Metformin AUC ↑ ~40%; lactic acidosis risk rises especially with renal impairment",evidence:{confidence:"high",sources:["clinical PK studies"],pmid:["26953265"]}},
  // ── Allopurinol ──
  {drug1:"Allopurinol",drug2:"Azathioprine",severity:"severe",category:"metabolic",mechanism:"Allopurinol inhibits xanthine oxidase, blocking azathioprine/6-MP metabolism",effect:"↑↑↑ Azathioprine toxicity — reduce dose 75%",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_allopurinol_azathioprine_xo_label","ev_azathioprine_tpmt_cpic2019"]},
  // ── Sildenafil + nitrates (not in DB but alpha-blockers are) ──
  {drug1:"Sildenafil",drug2:"Tamsulosin",severity:"moderate",category:"hypoT",mechanism:"PDE5 inhibitor + alpha-blocker — additive hypotension",effect:"↑ Orthostatic hypotension risk",evidence:{confidence:"moderate",sources:["literature"]}},
  {drug1:"Tadalafil",drug2:"Tamsulosin",severity:"moderate",category:"hypoT",mechanism:"PDE5 inhibitor + alpha-blocker — additive hypotension",effect:"↑ Orthostatic hypotension risk",evidence:{confidence:"moderate",sources:["literature"]}},
  // ── St John's Wort major interactions ──
  {drug1:"St. John's Wort",drug2:"Clopidogrel",severity:"moderate",category:"induction",mechanism:"CYP2C19 + CYP3A4 induction may paradoxically INCREASE clopidogrel activation but also accelerate clearance",effect:"Unpredictable effect on clopidogrel",evidence:{confidence:"moderate",sources:["literature"]}},
  {drug1:"St. John's Wort",drug2:"Warfarin",severity:"severe",category:"induction",mechanism:"Strong CYP induction reduces warfarin levels dramatically",effect:"↓↓ INR — loss of anticoagulation",evidence:{confidence:"moderate",sources:["clinical review"]},evidenceRefs:["ev_st_johns_wort_cyp3a4_pgp_review"]},
  {drug1:"St. John's Wort",drug2:"Tacrolimus",severity:"severe",category:"induction",mechanism:"CYP3A4 induction reduces tacrolimus levels — transplant rejection risk",effect:"↓↓ Tacrolimus levels — CONTRAINDICATED",evidence:{confidence:"moderate",sources:["clinical review"]},evidenceRefs:["ev_st_johns_wort_cyp3a4_pgp_review"]},
  {drug1:"St. John's Wort",drug2:"Cyclosporine",severity:"severe",category:"induction",mechanism:"CYP3A4 induction reduces cyclosporine levels",effect:"↓↓ Cyclosporine levels — transplant rejection",evidence:{confidence:"moderate",sources:["clinical review"]},evidenceRefs:["ev_st_johns_wort_cyp3a4_pgp_review"]},
  // ── Grapefruit ──
  {drug1:"Grapefruit Juice",drug2:"Simvastatin",severity:"severe",category:"pk",mechanism:"Grapefruit irreversibly inhibits intestinal CYP3A4, raising simvastatin AUC 3-16x",effect:"↑↑ Rhabdomyolysis risk",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Grapefruit Juice",drug2:"Felodipine",severity:"moderate",category:"pk",mechanism:"Intestinal CYP3A4 inhibition raises felodipine levels 2-3x",effect:"↑ Hypotension risk",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Grapefruit Juice",drug2:"Midazolam",severity:"moderate",category:"pk",mechanism:"Intestinal CYP3A4 inhibition raises oral midazolam levels",effect:"↑ Sedation",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Grapefruit Juice",drug2:"Tacrolimus",severity:"moderate",category:"pk",mechanism:"Intestinal CYP3A4 inhibition raises tacrolimus levels",effect:"↑ Tacrolimus toxicity risk",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  // ── MAO-related (sumatriptan) ──
  {drug1:"Sumatriptan",drug2:"Fluoxetine",severity:"moderate",category:"serotonin",mechanism:"Triptan + SSRI: FDA warning for serotonin syndrome risk",effect:"↑ Serotonin syndrome risk — monitor",evidence:{confidence:"high",sources:["FDA warning"]}},
  // ── Amiodarone ──
  {drug1:"Amiodarone",drug2:"Warfarin",severity:"severe",category:"pk",mechanism:"Amiodarone inhibits CYP2C9, raising warfarin effect and lowering dose requirement",effect:"↑↑ INR — reduce warfarin dose ~25-50% and monitor closely",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_amiodarone_warfarin_kerin1988"]},
  {drug1:"Amiodarone",drug2:"Simvastatin",severity:"severe",category:"pk",mechanism:"CYP3A4 inhibition — FDA max simvastatin 20mg with amiodarone",effect:"↑ Rhabdomyolysis risk — dose limit",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Amiodarone",drug2:"Metoprolol",severity:"moderate",category:"cardiac",mechanism:"Additive bradycardia and AV block risk",effect:"↑ Bradycardia / heart block",evidence:{confidence:"moderate",sources:["literature"]}},
  // ── Valproic acid ──
  {drug1:"Valproic Acid",drug2:"Lamotrigine",severity:"severe",category:"pk",mechanism:"Valproate inhibits lamotrigine glucuronidation, doubling its levels",effect:"↑↑ Lamotrigine levels — Stevens-Johnson syndrome risk at high levels",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Valproic Acid",drug2:"Carbamazepine",severity:"moderate",category:"pk",mechanism:"Complex bidirectional interaction — carbamazepine induces valproate metabolism; valproate inhibits epoxide hydrolase increasing carbamazepine-epoxide toxicity",effect:"Unpredictable levels + ↑ carbamazepine-epoxide toxicity",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  // ── Phenytoin ──
  {drug1:"Phenytoin",drug2:"Valproic Acid",severity:"moderate",category:"pk",mechanism:"Valproate displaces phenytoin from albumin + inhibits CYP2C9",effect:"↑ Free phenytoin levels despite lower total levels",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  // ── Cannabis / THC ──
  {drug1:"Cannabis (THC)",drug2:"Clopidogrel",severity:"mild",category:"pk",mechanism:"THC weakly inhibits CYP3A4 — minor effect on clopidogrel activation",effect:"Possible minor ↓ clopidogrel efficacy",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  // ── MDMA / Empathogen interactions ──
  {drug1:"MDMA (Ecstasy)",drug2:"Fluoxetine",severity:"severe",category:"pd",mechanism:"SSRI blocks serotonin reuptake + MDMA floods serotonin release. Fluoxetine also blocks CYP2D6, raising MDMA levels 2-3×",effect:"⚠ Serotonin syndrome — potentially fatal. Hyperthermia, seizures, rhabdomyolysis",evidence:{confidence:"moderate",sources:["clinical review"]},evidenceRefs:["ev_maoi_ssri_serotonin","ev_mdma_meth_cyp2d6_review","ev_fluoxetine_cyp2d6_fda"]},
  {drug1:"MDMA (Ecstasy)",drug2:"Paroxetine",severity:"severe",category:"pd",mechanism:"Paroxetine strongly inhibits CYP2D6 (MDMA's main route) AND blocks SERT. MDMA levels ↑ 2-3× + serotonin syndrome risk",effect:"⚠ Serotonin syndrome + MDMA toxicity — potentially fatal",evidence:{confidence:"moderate",sources:["clinical review"]},evidenceRefs:["ev_maoi_ssri_serotonin","ev_mdma_meth_cyp2d6_review","ev_paroxetine_cyp2d6_fda"]},
  {drug1:"MDMA (Ecstasy)",drug2:"Sertraline",severity:"severe",category:"pd",mechanism:"SSRI + MDMA serotonin flooding = serotonin syndrome risk. Sertraline moderately inhibits CYP2D6 raising MDMA levels",effect:"⚠ Serotonin syndrome risk — dangerous combination",evidence:{confidence:"moderate",sources:["clinical review"]},evidenceRefs:["ev_maoi_ssri_serotonin","ev_mdma_meth_cyp2d6_review"]},
  {drug1:"MDMA (Ecstasy)",drug2:"Citalopram",severity:"severe",category:"pd",mechanism:"SSRI serotonin reuptake blockade + MDMA serotonin release = additive serotonergic toxicity",effect:"⚠ Serotonin syndrome risk",evidence:{confidence:"moderate",sources:["clinical review"]},evidenceRefs:["ev_maoi_ssri_serotonin","ev_mdma_meth_cyp2d6_review"]},
  {drug1:"MDMA (Ecstasy)",drug2:"Escitalopram",severity:"severe",category:"pd",mechanism:"SSRI serotonin reuptake blockade + MDMA serotonin release = additive serotonergic toxicity",effect:"⚠ Serotonin syndrome risk",evidence:{confidence:"moderate",sources:["clinical review"]},evidenceRefs:["ev_maoi_ssri_serotonin","ev_mdma_meth_cyp2d6_review"]},
  {drug1:"MDMA (Ecstasy)",drug2:"Venlafaxine",severity:"severe",category:"pd",mechanism:"SNRI + MDMA = severe serotonin syndrome risk. Venlafaxine also weakly inhibits CYP2D6",effect:"⚠ Serotonin syndrome — potentially fatal",evidence:{confidence:"moderate",sources:["clinical review"]},evidenceRefs:["ev_maoi_ssri_serotonin","ev_mdma_meth_cyp2d6_review"]},
  {drug1:"MDMA (Ecstasy)",drug2:"Duloxetine",severity:"severe",category:"pd",mechanism:"SNRI + strong CYP2D6 inhibitor. MDMA levels ↑ dramatically + serotonin syndrome",effect:"⚠ Serotonin syndrome + MDMA toxicity — potentially fatal",evidence:{confidence:"moderate",sources:["clinical review"]},evidenceRefs:["ev_maoi_ssri_serotonin","ev_mdma_meth_cyp2d6_review"]},
  {drug1:"MDMA (Ecstasy)",drug2:"Tramadol",severity:"severe",category:"pd",mechanism:"Both serotonergic + both lower seizure threshold. Both CYP2D6 substrates",effect:"⚠ Serotonin syndrome + seizure risk — potentially fatal",evidence:{confidence:"moderate",sources:["clinical review"]},evidenceRefs:["ev_maoi_ssri_serotonin","ev_mdma_meth_cyp2d6_review","ev_opioid_cyp2d6_cpic_2020"]},
  {drug1:"MDMA (Ecstasy)",drug2:"Moclobemide",severity:"severe",category:"pd",mechanism:"MAO-A inhibitor prevents serotonin breakdown + MDMA floods serotonin = catastrophic serotonin storm",effect:"⚠⚠ CONTRAINDICATED — deaths reported. Serotonin syndrome almost certain",evidence:{confidence:"moderate",sources:["clinical review"]},evidenceRefs:["ev_maoi_ssri_serotonin","ev_mdma_meth_cyp2d6_review"]},
  {drug1:"MDMA (Ecstasy)",drug2:"Ritonavir",severity:"severe",category:"pk",mechanism:"Ritonavir strongly inhibits CYP3A4+CYP2D6, MDMA levels ↑ 5-10×. Multiple deaths reported in HIV patients",effect:"⚠⚠ CONTRAINDICATED — fatal MDMA overdoses reported",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"MDMA (Ecstasy)",drug2:"Bupropion",severity:"moderate",category:"pk",mechanism:"Bupropion (via hydroxybupropion) strongly inhibits CYP2D6, MDMA's primary metabolism route. MDMA levels ↑ 2-3×",effect:"↑↑ MDMA levels — increased neurotoxicity and hyperthermia risk",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"MDMA (Ecstasy)",drug2:"Amphetamine",severity:"severe",category:"pd",mechanism:"Dual dopamine/norepinephrine/serotonin releasers. Additive cardiovascular stress, hyperthermia, neurotoxicity",effect:"⚠ Extreme cardiovascular + hyperthermic risk",evidence:{confidence:"moderate",sources:["clinical toxicology review"]},evidenceRefs:["ev_sympathomimetic_toxicity_review","ev_mdma_meth_cyp2d6_review"]},
  {drug1:"MDMA (Ecstasy)",drug2:"Cocaine",severity:"severe",category:"pd",mechanism:"Both sympathomimetic stimulants. Additive cardiac stress — arrhythmias, MI, stroke, hyperthermia",effect:"⚠ Severe cardiovascular risk — deaths reported",evidence:{confidence:"moderate",sources:["clinical toxicology review"]},evidenceRefs:["ev_sympathomimetic_toxicity_review","ev_cocaine_toxicity_review","ev_mdma_meth_cyp2d6_review"]},
  // ── Cocaine interactions ──
  {drug1:"Cocaine",drug2:"Alcohol (Ethanol)",severity:"severe",category:"metabolite",mechanism:"Liver forms cocaethylene (active metabolite) with 5× longer half-life + equal cardiotoxicity. Cocaethylene is more toxic than either drug alone",effect:"⚠⚠ CONTRAINDICATED — cocaethylene formation, cardiac death risk ↑ 18-25×",evidence:{confidence:"high",sources:["FDA label"]}},
  {drug1:"Cocaine",drug2:"Propranolol",severity:"moderate",category:"pd",mechanism:"Nonselective beta-blockade during acute cocaine toxicity has a historical unopposed-alpha concern; evidence is mixed and emergency/toxicology guidance should drive management",effect:"⚠ Use caution in acute cocaine toxicity; avoid unsupervised beta-blocker treatment",evidence:{confidence:"moderate",sources:["clinical toxicology review"]},evidenceRefs:["ev_cocaine_beta_blocker_unopposed_alpha_review","ev_cocaine_toxicity_review","ev_beta_blocker_cyp2d6_propranolol"]},
  {drug1:"Cocaine",drug2:"Metoprolol",severity:"moderate",category:"pd",mechanism:"Beta-blocker risk in acute cocaine toxicity is controversial; beta-1 selective agents have mixed observational evidence rather than a clear absolute contraindication",effect:"⚠ Caution in acute cocaine toxicity; manage with emergency/toxicology guidance",evidence:{confidence:"moderate",sources:["clinical toxicology review"]},evidenceRefs:["ev_cocaine_beta_blocker_unopposed_alpha_review","ev_cocaine_toxicity_review","ev_metoprolol_cyp2d6_cpic"]},
  // ── Ayahuasca / MAOI interactions ──
  {drug1:"Ayahuasca (DMT+MAOI)",drug2:"Fluoxetine",severity:"severe",category:"pd",mechanism:"MAO inhibition + SSRI = catastrophic serotonin syndrome. Fluoxetine has 2-week washout due to long half-life",effect:"⚠⚠ CONTRAINDICATED — fatal serotonin syndrome. Need 5+ week washout from fluoxetine",evidence:{confidence:"high",sources:["clinical review"]},evidenceRefs:["ev_maoi_ssri_serotonin","ev_fluoxetine_cyp2d6_fda"]},
  {drug1:"Ayahuasca (DMT+MAOI)",drug2:"Paroxetine",severity:"severe",category:"pd",mechanism:"MAO inhibition + SSRI = catastrophic serotonin syndrome",effect:"⚠⚠ CONTRAINDICATED — fatal serotonin syndrome",evidence:{confidence:"high",sources:["clinical review"]},evidenceRefs:["ev_maoi_ssri_serotonin","ev_paroxetine_cyp2d6_fda"]},
  {drug1:"Ayahuasca (DMT+MAOI)",drug2:"Sertraline",severity:"severe",category:"pd",mechanism:"MAO inhibition + SSRI = catastrophic serotonin syndrome",effect:"⚠⚠ CONTRAINDICATED — fatal serotonin syndrome",evidence:{confidence:"high",sources:["clinical review"]},evidenceRefs:["ev_maoi_ssri_serotonin"]},
  {drug1:"Ayahuasca (DMT+MAOI)",drug2:"Venlafaxine",severity:"severe",category:"pd",mechanism:"MAO inhibition + SNRI = catastrophic serotonin syndrome",effect:"⚠⚠ CONTRAINDICATED — fatal serotonin syndrome",evidence:{confidence:"high",sources:["clinical review"]},evidenceRefs:["ev_maoi_ssri_serotonin"]},
  {drug1:"Ayahuasca (DMT+MAOI)",drug2:"Tramadol",severity:"severe",category:"pd",mechanism:"MAO inhibition + serotonergic opioid = serotonin syndrome + seizures",effect:"⚠⚠ CONTRAINDICATED — multiple fatalities reported",evidence:{confidence:"high",sources:["clinical review"]},evidenceRefs:["ev_maoi_ssri_serotonin","ev_opioid_cyp2d6_cpic_2020"]},
  {drug1:"Ayahuasca (DMT+MAOI)",drug2:"MDMA (Ecstasy)",severity:"severe",category:"pd",mechanism:"MAO inhibition + massive serotonin release = fatal serotonin storm",effect:"⚠⚠ CONTRAINDICATED — almost certain serotonin syndrome",evidence:{confidence:"high",sources:["clinical review"]},evidenceRefs:["ev_maoi_ssri_serotonin","ev_mdma_meth_cyp2d6_review"]},
  {drug1:"Ayahuasca (DMT+MAOI)",drug2:"Amphetamine",severity:"severe",category:"pd",mechanism:"MAO inhibition + amphetamine = hypertensive crisis + serotonin syndrome",effect:"⚠⚠ CONTRAINDICATED — hypertensive crisis",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_maoi_sympathomimetic_label","ev_amphetamine_cyp2d6_fda"]},
  {drug1:"Ayahuasca (DMT+MAOI)",drug2:"Cocaine",severity:"severe",category:"pd",mechanism:"MAO inhibition + sympathomimetic = hypertensive crisis",effect:"⚠⚠ CONTRAINDICATED — hypertensive crisis",evidence:{confidence:"moderate",sources:["FDA label class warning"]},evidenceRefs:["ev_maoi_sympathomimetic_label"]},
  // ── GHB interactions ──
  {drug1:"GHB",drug2:"Alcohol (Ethanol)",severity:"severe",category:"pd",mechanism:"Dual GABA-B/GHB receptor agonists. Profoundly additive CNS/respiratory depression. Most GHB deaths involve alcohol",effect:"⚠⚠ CONTRAINDICATED — respiratory arrest. Leading cause of GHB-related deaths",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_sodium_oxybate_cns_depressants_label"]},
  {drug1:"GHB",drug2:"Diazepam",severity:"severe",category:"pd",mechanism:"Dual CNS depressants — GHB + benzodiazepine = severe respiratory depression",effect:"⚠ Respiratory depression — potentially fatal",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_sodium_oxybate_cns_depressants_label"]},
  {drug1:"GHB",drug2:"Clonazepam",severity:"severe",category:"pd",mechanism:"Dual CNS depressants — additive respiratory depression",effect:"⚠ Respiratory depression — potentially fatal",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_sodium_oxybate_cns_depressants_label"]},
  {drug1:"GHB",drug2:"Morphine",severity:"severe",category:"pd",mechanism:"Dual CNS/respiratory depressants — additive respiratory arrest risk",effect:"⚠⚠ CONTRAINDICATED — respiratory arrest",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_sodium_oxybate_cns_depressants_label"]},
  {drug1:"GHB",drug2:"Fentanyl",severity:"severe",category:"pd",mechanism:"Dual CNS/respiratory depressants — extreme respiratory arrest risk",effect:"⚠⚠ CONTRAINDICATED — respiratory arrest almost certain",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_sodium_oxybate_cns_depressants_label"]},
  // ── Poppers interactions ──
  {drug1:"Poppers (Amyl Nitrite)",drug2:"Sildenafil",severity:"severe",category:"pd",mechanism:"Both potent vasodilators via NO/cGMP pathway. Additive = catastrophic hypotension, syncope, MI, death",effect:"⚠⚠ CONTRAINDICATED — fatal hypotension. Deaths reported",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_pde5_nitrate_label"]},
  {drug1:"Poppers (Amyl Nitrite)",drug2:"Tadalafil",severity:"severe",category:"pd",mechanism:"Both vasodilators via NO/cGMP — catastrophic hypotension",effect:"⚠⚠ CONTRAINDICATED — fatal hypotension",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_pde5_nitrate_label"]},
  {drug1:"Poppers (Amyl Nitrite)",drug2:"Vardenafil",severity:"severe",category:"pd",mechanism:"Both vasodilators via NO/cGMP — catastrophic hypotension",effect:"⚠⚠ CONTRAINDICATED — fatal hypotension",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_pde5_nitrate_label"]},
  // ── Ketamine interactions ──
  {drug1:"Ketamine",drug2:"Alcohol (Ethanol)",severity:"severe",category:"pd",mechanism:"Ketamine plus alcohol can worsen CNS impairment and cardiorespiratory/digestive toxicity; vomiting, dissociation, and impaired airway protection increase harm risk",effect:"⚠ Severe impairment and aspiration/cardiorespiratory risk",evidence:{confidence:"moderate",sources:["toxicology review"]},evidenceRefs:["ev_ketamine_alcohol_toxicology_review"]},
  {drug1:"Ketamine",drug2:"GHB",severity:"severe",category:"pd",mechanism:"Dual CNS depressants — additive unconsciousness + respiratory depression",effect:"⚠ Respiratory arrest risk — both cause unconsciousness",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_sodium_oxybate_cns_depressants_label"]},
  // ── DXM interactions ──
  {drug1:"DXM (Dextromethorphan)",drug2:"Fluoxetine",severity:"severe",category:"pk",mechanism:"Fluoxetine strongly inhibits CYP2D6, DXM levels ↑ 5×+ converting it from cough suppressant to dissociative doses. Also serotonin syndrome",effect:"⚠ Serotonin syndrome + DXM toxicity — potentially fatal",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"DXM (Dextromethorphan)",drug2:"Paroxetine",severity:"severe",category:"pk",mechanism:"Paroxetine strongly inhibits CYP2D6, DXM levels ↑ 5×+. Also serotonin syndrome risk",effect:"⚠ Serotonin syndrome + DXM toxicity",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_paroxetine_cyp2d6_fda","ev_paroxetine_cyp2d6_rct","ev_paroxetine_cyp2d6_japanese"]},
  {drug1:"DXM (Dextromethorphan)",drug2:"Bupropion",severity:"severe",category:"pk",mechanism:"Hydroxybupropion strongly inhibits CYP2D6 — DXM levels ↑ 5×+. DXM becomes dissociative at these levels",effect:"⚠ DXM toxicity — dissociative effects at normal cough doses",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  // ── Kratom interactions ──
  {drug1:"Kratom (Mitragynine)",drug2:"Fluoxetine",severity:"moderate",category:"pk",mechanism:"Kratom inhibits CYP2D6 + fluoxetine inhibits CYP2D6. Mutual PK interaction + opioid+serotonergic PD overlap",effect:"↑ Both drug levels + serotonin syndrome risk",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Kratom (Mitragynine)",drug2:"Tramadol",severity:"severe",category:"pd",mechanism:"Kratom has opioid-like pharmacology and potential CYP interaction liability; tramadol adds serotonergic, opioid, and seizure-threshold risks",effect:"⚠ Respiratory depression + seizure + serotonin risk",evidence:{confidence:"moderate",sources:["clinical/mechanistic review"]},evidenceRefs:["ev_kratom_polysubstance_review","ev_kratom_mitragynine_cyp2d6_basiliere2020","ev_opioid_cyp2d6_cpic_2020"]},
  {drug1:"Kratom (Mitragynine)",drug2:"Alcohol (Ethanol)",severity:"severe",category:"pd",mechanism:"Kratom-related adverse events commonly involve polysubstance use; alcohol adds CNS impairment and can worsen sedation/respiratory-risk context",effect:"⚠ Severe sedation/impairment risk; fatalities often involve co-ingestants",evidence:{confidence:"moderate",sources:["clinical/mechanistic review"]},evidenceRefs:["ev_kratom_polysubstance_review"]},
  // ── Alcohol-specific ──
  {drug1:"Alcohol (Ethanol)",drug2:"Metformin",severity:"moderate",category:"pd",mechanism:"Alcohol inhibits gluconeogenesis + metformin inhibits gluconeogenesis = additive lactic acidosis risk + hypoglycemia",effect:"↑ Lactic acidosis + hypoglycemia risk",evidence:{confidence:"moderate",sources:["literature"]}},
  {drug1:"Alcohol (Ethanol)",drug2:"Acetaminophen",severity:"severe",category:"metabolite",mechanism:"Chronic alcohol induces CYP2E1, shifting acetaminophen toward toxic NAPQI metabolite pathway. Depletes glutathione stores needed to neutralize NAPQI",effect:"⚠⚠ CONTRAINDICATED in heavy drinkers — hepatotoxicity, liver failure risk even at therapeutic acetaminophen doses",evidence:{confidence:"high",sources:["FDA label"]}},
  // ── CBD interactions ──
  {drug1:"Cannabis (CBD)",drug2:"Clobazam",severity:"severe",category:"pk",mechanism:"CBD strongly inhibits CYP2C19, raising active metabolite N-desmethylclobazam 5×+. FDA-documented interaction",effect:"↑↑ Clobazam sedation — dose reduction required",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Cannabis (CBD)",drug2:"Warfarin",severity:"moderate",category:"pk",mechanism:"CBD inhibits CYP2C9+CYP3A4, raising warfarin levels. INR increases documented",effect:"↑ Warfarin levels — INR monitoring essential",evidence:{confidence:"high",sources:["clinical PK studies"]}},
// ──────────── Enrichment Batch 1 ────────────
{
  drug1:"Allopurinol",
  drug2:"Mercaptopurine",
  severity:"severe",
  category:"metabolic",
  mechanism:"Allopurinol inhibits xanthine oxidase, blocking 6-MP inactivation and shifting metabolism toward cytotoxic 6-TGN",
  effect:"↑↑↑ Mercaptopurine toxicity — reduce 6-MP dose ~75% and monitor CBC",
  evidence:{
    confidence:"high",
    sources:[
      "FDA label"
    ]
  },
  evidenceRefs:[
    "ev_allopurinol_azathioprine_xo_label",
    "ev_thiopurine_tpmt_nudt15_cpic2025"
  ]
},{
  drug1:"Febuxostat",
  drug2:"Mercaptopurine",
  severity:"severe",
  category:"metabolic",
  mechanism:"Febuxostat is a potent XO inhibitor; blocks 6-MP inactivation with no labeled dose-reduction protocol",
  effect:"↑↑↑ Mercaptopurine toxicity — combination contraindicated (avoid, do not co-dose)",
  evidence:{
    confidence:"high",
    sources:[
      "FDA label"
    ]
  },
  evidenceRefs:[
    "ev_thiopurine_tpmt_nudt15_cpic2025"
  ]
},{
  drug1:"Febuxostat",
  drug2:"Azathioprine",
  severity:"severe",
  category:"metabolic",
  mechanism:"Febuxostat inhibits XO, blocking azathioprine/6-MP inactivation",
  effect:"↑↑↑ Azathioprine toxicity — contraindicated (avoid co-use)",
  evidence:{
    confidence:"high",
    sources:[
      "FDA label"
    ]
  },
  evidenceRefs:[
    "ev_allopurinol_azathioprine_xo_label"
  ]
},{
  drug1:"Sulfasalazine",
  drug2:"Azathioprine",
  severity:"moderate",
  category:"metabolic",
  mechanism:"Sulfasalazine inhibits TPMT, shifting thiopurine metabolism toward cytotoxic 6-TGN",
  effect:"↑ Azathioprine/6-TGN exposure — monitor CBC, esp. in TPMT/NUDT15 IM",
  evidence:{
    confidence:"moderate",
    sources:[
      "literature"
    ]
  },
  evidenceRefs:[
    "ev_sulfasalazine_tpmt_inhibition"
  ]
},{
  drug1:"Sulfasalazine",
  drug2:"Mercaptopurine",
  severity:"moderate",
  category:"metabolic",
  mechanism:"Sulfasalazine inhibits TPMT, increasing active thiopurine nucleotides",
  effect:"↑ Mercaptopurine toxicity — monitor CBC",
  evidence:{
    confidence:"moderate",
    sources:[
      "literature"
    ]
  },
  evidenceRefs:[
    "ev_sulfasalazine_tpmt_inhibition"
  ]
},{
  drug1:"Sulfasalazine",
  drug2:"Methotrexate",
  severity:"moderate",
  category:"hematologic",
  mechanism:"Additive antifolate effect and competition for folate handling; both myelosuppressive",
  effect:"↑ Myelosuppression / mucositis risk — monitor CBC and folate status",
  evidence:{
    confidence:"moderate",
    sources:[
      "clinical guidelines"
    ]
  }
},{
  drug1:"Sulfasalazine",
  drug2:"Digoxin",
  severity:"moderate",
  category:"pk",
  mechanism:"Sulfasalazine reduces digoxin GI absorption",
  effect:"↓ Digoxin levels — separate dosing and monitor concentrations",
  evidence:{
    confidence:"moderate",
    sources:[
      "FDA label"
    ]
  }
},{
  drug1:"Dapsone",
  drug2:"Trimethoprim-SMX",
  severity:"moderate",
  category:"toxicity",
  mechanism:"Trimethoprim raises dapsone levels (competition for clearance) and both are oxidant — additive methemoglobinemia/hemolysis",
  effect:"↑ Methemoglobinemia/hemolysis risk — monitor metHb and CBC, esp. in G6PD deficiency",
  evidence:{
    confidence:"high",
    sources:[
      "FDA label",
      "literature"
    ]
  },
  evidenceRefs:[
    "ev_dapsone_ddsnhoh_metabolite"
  ]
},{
  drug1:"Dapsone",
  drug2:"Rifampin",
  severity:"moderate",
  category:"induction",
  mechanism:"Rifampin induces dapsone metabolism, lowering parent levels but increasing hydroxylamine metabolite formation",
  effect:"↓ Dapsone efficacy + possible ↑ oxidative-metabolite burden — monitor response and metHb",
  evidence:{
    confidence:"moderate",
    sources:[
      "literature"
    ]
  },
  evidenceRefs:[
    "ev_dapsone_ddsnhoh_metabolite"
  ]
},{
  drug1:"Methylene Blue",
  drug2:"Sertraline",
  severity:"severe",
  category:"serotonergic",
  mechanism:"Methylene blue is a potent MAO-A inhibitor; combined with an SSRI → serotonin accumulation",
  effect:"↑↑ Serotonin syndrome risk — FDA advises withholding serotonergic agent before elective methylene blue",
  evidence:{
    confidence:"high",
    sources:[
      "FDA Drug Safety Communication"
    ]
  },
  evidenceRefs:[
    "ev_methylene_blue_maoi_fda"
  ]
},{
  drug1:"Methylene Blue",
  drug2:"Venlafaxine",
  severity:"severe",
  category:"serotonergic",
  mechanism:"MAO-A inhibition by methylene blue plus SNRI serotonin reuptake inhibition",
  effect:"↑↑ Serotonin syndrome risk — avoid/withhold; emergency use requires monitoring",
  evidence:{
    confidence:"high",
    sources:[
      "FDA Drug Safety Communication"
    ]
  },
  evidenceRefs:[
    "ev_methylene_blue_maoi_fda"
  ]
},{
  drug1:"Methylene Blue",
  drug2:"Duloxetine",
  severity:"severe",
  category:"serotonergic",
  mechanism:"MAO-A inhibition by methylene blue plus SNRI serotonin reuptake inhibition",
  effect:"↑↑ Serotonin syndrome risk — avoid/withhold",
  evidence:{
    confidence:"high",
    sources:[
      "FDA Drug Safety Communication"
    ]
  },
  evidenceRefs:[
    "ev_methylene_blue_maoi_fda"
  ]
},{
  drug1:"Chloroquine",
  drug2:"Amiodarone",
  severity:"severe",
  category:"qt",
  mechanism:"Additive QT prolongation (both block IKr); amiodarone also has very long t½",
  effect:"↑↑ QT prolongation / torsades risk — avoid combination",
  evidence:{
    confidence:"high",
    sources:[
      "clinical guidelines"
    ]
  }
},{
  drug1:"Chloroquine",
  drug2:"Ondansetron",
  severity:"moderate",
  category:"qt",
  mechanism:"Additive QT prolongation",
  effect:"↑ QT prolongation — use granisetron alternative and monitor ECG/electrolytes",
  evidence:{
    confidence:"moderate",
    sources:[
      "clinical guidelines"
    ]
  }
},{
  drug1:"Quinine",
  drug2:"Digoxin",
  severity:"severe",
  category:"pk",
  mechanism:"Quinine inhibits P-glycoprotein, reducing digoxin clearance",
  effect:"↑↑ Digoxin levels — toxicity risk; reduce digoxin dose and monitor levels",
  evidence:{
    confidence:"high",
    sources:[
      "clinical PK studies"
    ]
  }
},{
  drug1:"Quinine",
  drug2:"Warfarin",
  severity:"moderate",
  category:"anticoagulant",
  mechanism:"Quinine potentiates warfarin anticoagulant effect (hypoprothrombinemic effect / displacement)",
  effect:"↑ INR / bleeding risk — monitor INR closely",
  evidence:{
    confidence:"moderate",
    sources:[
      "FDA label",
      "case reports"
    ]
  }
},
  // ── Salvaged Gemini enrichment: reviewed for duplicates, pending human review ──
{
    drug1: "Dronedarone",
    drug2: "Dabigatran",
    severity: "severe",
    category: "metabolic",
    mechanism: "Dronedarone induces potent competitive structural arrest of active P-gp transporter mechanics across the intestinal lining.",
    effect: "↑↑ Increases dabigatran systemic bio-availability parameters by more than 100% — clinical combination requires strict avoidance or instant separation protocols.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA Boxed Warning"
      ]
    },
    evidenceRefs: [
      "ev_dabigatran_dronedarone_fda"
    ]
  },
{
    drug1: "Dronedarone",
    drug2: "Rosuvastatin",
    severity: "moderate",
    category: "transport",
    mechanism: "Concurrent competitive structural inhibition targeting active OATP1B1 and BCRP transport channels.",
    effect: "↑ Systemic concentration of rosuvastatin — require careful reduction of statin dosing limits to protect muscle integrity parameters.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: []
  },
{
    drug1: "Amiodarone",
    drug2: "Dabigatran",
    severity: "moderate",
    category: "transport",
    mechanism: "Slow P-gp efflux transporter structural inhibition across long-term steady-state therapeutic phases.",
    effect: "↑ Systemic exposure of dabigatran — observe closely for localized micro-bleeding and monitor renal functions.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_dabigatran_dronedarone_fda"
    ]
  },
{
    drug1: "Quinidine",
    drug2: "Dabigatran",
    severity: "severe",
    category: "transport",
    mechanism: "Immediate high-potency competitive inhibition of operating intestinal P-gp efflux machinery.",
    effect: "↑↑ Marked dabigatran systemic exposure spikes — co-administration is strictly contraindicated across current safety literature.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_dabigatran_dronedarone_fda"
    ]
  },
{
    drug1: "Verapamil",
    drug2: "Dabigatran",
    severity: "moderate",
    category: "transport",
    mechanism: "Time-dependent inhibition of intestinal P-gp; exposure variance maps tightly to immediate-release formulations.",
    effect: "↑ Dabigatran peak plasma concentration profiles — consider administering your verapamil dosage minimal hours apart.",
    evidence: {
      confidence: "high",
      sources: [
        "Clinical PK study"
      ]
    },
    evidenceRefs: [
      "ev_dabigatran_dronedarone_fda"
    ]
  },
{
    drug1: "Dronedarone",
    drug2: "Edoxaban",
    severity: "severe",
    category: "transport",
    mechanism: "Potent structural inhibition of P-gp efflux transport networks.",
    effect: "↑↑ Elevated systemic edoxaban concentrations — adjust edoxaban daily dosing schedules down to 30mg parameters.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_edoxaban_p_gp_fda"
    ]
  },
{
    drug1: "Quinidine",
    drug2: "Edoxaban",
    severity: "severe",
    category: "transport",
    mechanism: "High-affinity competitive interaction with apical cell membrane P-gp transporters.",
    effect: "↑↑ Substantial exposure spikes for edoxaban — clinical safety consensus requires structural dose reduction steps.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_edoxaban_p_gp_fda"
    ]
  },
{
    drug1: "Verapamil",
    drug2: "Edoxaban",
    severity: "moderate",
    category: "transport",
    mechanism: "Moderate-tier P-gp cellular efflux pump saturation mechanics.",
    effect: "↑ Moderate edoxaban exposure parameters — initiate clinical tracking of absolute hematocrit values.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_edoxaban_p_gp_fda"
    ]
  },
{
    drug1: "Fluconazole",
    drug2: "Ticagrelor",
    severity: "severe",
    category: "metabolic",
    mechanism: "Moderate-to-strong validation blockage targeting core hepatic CYP3A4 metabolic conversion pathways.",
    effect: "↑↑ Severe elevations in parent ticagrelor exposure levels, drastically increasing risk for major clinical bleeding events.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_ticagrelor_cyp3a_label"
    ]
  },
{
    drug1: "Rifampin",
    drug2: "Ticagrelor",
    severity: "severe",
    category: "induction",
    mechanism: "High-velocity induction of operational CYP3A4 clearant extraction paths.",
    effect: "↓↓ Destroys absolute antiplatelet utility, dropping active exposure margins by up to 80%. Alternative therapies required.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_ticagrelor_cyp3a_label"
    ]
  },
{
    drug1: "Paroxetine",
    drug2: "Prasugrel",
    severity: "moderate",
    category: "antiplatelet_pd",
    mechanism: "Overlapping pharmacodynamic structural antiplatelet disruption via inhibition of serotonin reuptake inside blood platelets.",
    effect: "↑ Compounded gastrointestinal and mucosal bleeding risks with zero changes to primary prasugrel metabolic metrics.",
    evidence: {
      confidence: "moderate",
      sources: [
        "literature"
      ]
    },
    evidenceRefs: [
      "ev_prasugrel_active_metab_label"
    ]
  },
{
    drug1: "Quinidine",
    drug2: "Propafenone",
    severity: "moderate",
    category: "metabolic",
    mechanism: "High-affinity competitive inhibition of primary CYP2D6 clearance pathways.",
    effect: "↑↑ Shunts propafenone breakdown, shifting systemic profiles from 5-hydroxy configurations to toxic levels of parent propafenone.",
    evidence: {
      confidence: "high",
      sources: [
        "literature"
      ]
    },
    evidenceRefs: [
      "ev_propafenone_cyp2d6_m_plus"
    ]
  },
{
    drug1: "Aprepitant",
    drug2: "Tacrolimus",
    severity: "moderate",
    category: "metabolic",
    mechanism: "Moderate competitive inhibition of intestinal and hepatic CYP3A4 metabolic processing nodes.",
    effect: "↑ Elevated tacrolimus trough concentrations — require therapeutic drug monitoring adjustments during supportive care cycles.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_aprepitant_cyp3a4_label",
      "ev_tacrolimus_cyp3a5_consensus"
    ]
  },
{
    drug1: "Ketoconazole",
    drug2: "Tacrolimus",
    severity: "severe",
    category: "metabolic",
    mechanism: "Strong structural inactivation of operating CYP3A4 and CYP3A5 enzymatic clearances.",
    effect: "↑↑ Extreme, rapid spikes in tacrolimus blood levels, accelerating acute nephrotoxicity risk cascades.",
    evidence: {
      confidence: "high",
      sources: [
        "Clinical guidelines"
      ]
    },
    evidenceRefs: [
      "ev_tacrolimus_cyp3a5_consensus"
    ]
  },
{
    drug1: "Rifampin",
    drug2: "Tacrolimus",
    severity: "severe",
    category: "induction",
    mechanism: "PXR-mediated transcriptional upregulation of CYP3A4/3A5 and apical P-gp transport lines.",
    effect: "↓↓ Severe reduction in systemic tacrolimus levels, risking acute cellular organ transplant rejection episodes.",
    evidence: {
      confidence: "high",
      sources: [
        "Clinical Consensus"
      ]
    },
    evidenceRefs: [
      "ev_tacrolimus_cyp3a5_consensus"
    ]
  },
{
    drug1: "Ketoconazole",
    drug2: "Erlotinib",
    severity: "severe",
    category: "metabolic",
    mechanism: "Potent suppression of the primary hepatic CYP3A4 oxidative conversion loop.",
    effect: "↑↑ Doubles systemic erlotinib exposure metrics — avoid combination or perform proactive 50% down-dosing steps.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_erlotinib_ppi_absorption"
    ]
  },
{
    drug1: "Omeprazole",
    drug2: "Erlotinib",
    severity: "severe",
    category: "absorption",
    mechanism: "Elevation of gastric pH decreases the solubility and dissolution rate of the erlotinib crystalline structure.",
    effect: "↓↓ Marked 46% reduction in erlotinib systemic bio-availability, risking premature oncology therapeutic failure.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_erlotinib_ppi_absorption"
    ]
  },
{
    drug1: "Omeprazole",
    drug2: "Pazopanib",
    severity: "severe",
    category: "absorption",
    mechanism: "Suppression of gastric acid production halts the direct physical dissolution parameters of pazopanib.",
    effect: "↓↓ Significant drop in systemic TKI efficacy metrics — avoid concurrent proton pump inhibitor therapy configurations.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_erlotinib_ppi_absorption"
    ]
  },
{
    drug1: "Aprepitant",
    drug2: "Dexamethasone",
    severity: "moderate",
    category: "metabolic",
    mechanism: "Moderate CYP3A4 metabolic inhibition slows the clearance of corticosteroid structures.",
    effect: "↑ Significantly increases dexamethasone systemic exposure; requires a 50% reduction in oral dexamethasone doses.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_aprepitant_cyp3a4_label"
    ]
  },
{
    drug1: "Ritonavir",
    drug2: "Voriconazole",
    severity: "severe",
    category: "metabolic",
    mechanism: "Dual structural impact: low-dose ritonavir induces CYP2C19 while simultaneously blocking CYP3A4 channels.",
    effect: "↓↓ Unpredictable degradation of voriconazole steady-state plasma metrics — concurrent low-dose booster use (100mg) is contraindicated.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_ritonavir_cyp3a4_booster_label",
      "ev_voriconazole_cyp2c19_hyland2008"
    ]
  },
{
    drug1: "Ritonavir",
    drug2: "Maraviroc",
    severity: "severe",
    category: "metabolic",
    mechanism: "Potent mechanism-based inhibition of hepatic microsomal CYP3A4 complexes.",
    effect: "↑↑ Spikes systemic maraviroc levels significantly. Mandatory clinical action: reduce maraviroc dose from 300mg twice daily down to 150mg twice daily.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_ritonavir_cyp3a4_booster_label"
    ]
  },
{
    drug1: "Rifabutin",
    drug2: "Voriconazole",
    severity: "severe",
    category: "metabolic",
    mechanism: "Bidirectional interaction: rifabutin induces voriconazole clearance via CYP3A4, while voriconazole inhibits rifabutin metabolism.",
    effect: "↓↓ Drops voriconazole levels while ↑ structural rifabutin toxicity risks (uveitis). Avoid combination unless vital.",
    evidence: {
      confidence: "high",
      sources: [
        "Clinical PK validation"
      ]
    },
    evidenceRefs: [
      "ev_voriconazole_cyp2c19_hyland2008"
    ]
  },
{
    drug1: "Efavirenz",
    drug2: "Voriconazole",
    severity: "severe",
    category: "metabolic",
    mechanism: "Efavirenz induces CYP3A4 and CYP2C19 channels, while voriconazole inhibits efavirenz clearance.",
    effect: "↓↓ Decreases voriconazole exposure by 50% while increasing toxic efavirenz exposures. Co-administration is contraindicated.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_efavirenz_cyp2b6_desta2019",
      "ev_voriconazole_cyp2c19_hyland2008"
    ]
  },
{
    drug1: "Glecaprevir",
    drug2: "Rifampin",
    severity: "severe",
    category: "induction",
    mechanism: "Strong transcriptional up-regulation of active hepatic OATP1B1/1B3 uptake nodes and apical P-gp systems.",
    effect: "↓↓ Drastic 80% drop in systemic protease inhibitor levels, leading to immediate HCV therapeutic failure. Do not co-administer.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_mavyret_oatp_pgp_label"
    ]
  },
{
    drug1: "Pibrentasvir",
    drug2: "Rifampin",
    severity: "severe",
    category: "induction",
    mechanism: "High-velocity induction of intestinal and biliary P-glycoprotein extrusion networks.",
    effect: "↓↓ Destroys systemic pibrentasvir exposures — co-administration is strictly contraindicated within international viral guidelines.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_mavyret_oatp_pgp_label"
    ]
  },
{
    drug1: "Dolutegravir",
    drug2: "Metformin",
    severity: "moderate",
    category: "transport",
    mechanism: "Dolutegravir inhibits renal OCT2 and MATE1 transporters, blocking the clearance vectors for metformin.",
    effect: "↑ Elevated systemic metformin exposure (up to 79% increase) — consider lower metformin doses to limit lactic acidosis risks.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_dolutegravir_oct2_mate1_fda"
    ]
  },
{
    drug1: "Dolutegravir",
    drug2: "Calcium",
    severity: "moderate",
    category: "absorption",
    mechanism: "Direct polyvalent cation chelation of the dolutegravir ring structure within the gastrointestinal tract.",
    effect: "↓↓ Blunts absorption metrics; administer dolutegravir either 2 hours before or 6 hours after cation-containing compounds.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_dolutegravir_oct2_mate1_fda"
    ]
  },
{
    drug1: "Voriconazole",
    drug2: "Omeprazole",
    severity: "moderate",
    category: "metabolic",
    mechanism: "Competitive saturation across shared polymorphic CYP2C19 enzymatic sites.",
    effect: "↑ Increased exposure metrics for both agents — consider reducing the omeprazole dose by 50% if high doses are required.",
    evidence: {
      confidence: "high",
      sources: [
        "Clinical PK mapping"
      ]
    },
    evidenceRefs: [
      "ev_voriconazole_cyp2c19_hyland2008"
    ]
  },
{
    drug1: "Isavuconazonium Sulfate",
    drug2: "Ketoconazole",
    severity: "severe",
    category: "metabolic",
    mechanism: "Potent structural inhibition of down-stream CYP3A4 oxidative transformations.",
    effect: "↑↑ Spikes active isavuconazole exposure metrics by several fold. Co-administration alongside strong inhibitors is contraindicated.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_isavuconazole_cyp3a4_validation"
    ]
  },
{
    drug1: "Isavuconazonium Sulfate",
    drug2: "Rifampin",
    severity: "severe",
    category: "induction",
    mechanism: "Strong induction of CYP3A4 expression via PXR nuclear receptor activation paths.",
    effect: "↓↓ Reduces active isavuconazole systemic exposures by 90%, destroying antifungal efficacy. Do not combine.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_isavuconazole_cyp3a4_validation"
    ]
  },
{
    drug1: "Efavirenz",
    drug2: "Dolutegravir",
    severity: "moderate",
    category: "metabolic",
    mechanism: "Efavirenz induces UGT1A1 expression, accelerating the clearance of dolutegravir.",
    effect: "↓↓ Reduces dolutegravir trough concentrations; requires increasing the dolutegravir dose to 50mg twice daily in treatment-experienced patients.",
    evidence: {
      confidence: "high",
      sources: [
        "HIV Guideline"
      ]
    },
    evidenceRefs: [
      "ev_efavirenz_cyp2b6_desta2019",
      "ev_dolutegravir_oct2_mate1_fda"
    ]
  },
{
    drug1: "Rifabutin",
    drug2: "Dolutegravir",
    severity: "moderate",
    category: "metabolic",
    mechanism: "Moderate transcriptional up-regulation targeting operating UGT1A1 clearance channels.",
    effect: "↓ Decreases dolutegravir systemic trough levels — adjust dolutegravir schedules safely to preserve viral suppression.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_dolutegravir_oct2_mate1_fda"
    ]
  },
{
    drug1: "Duloxetine",
    drug2: "Tizanidine",
    severity: "severe",
    category: "metabolic",
    mechanism: "Moderate-to-strong competitive inhibition of hepatic CYP1A2 networks.",
    effect: "↑ Significant elevations in systemic tizanidine exposure. Avoid combination; select alternative muscle relaxants or manage with lower initial doses.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_tizanidine_cyp1a2_contraindication"
    ]
  },
{
    drug1: "Amiodarone",
    drug2: "Cyclobenzaprine",
    severity: "moderate",
    category: "metabolic",
    mechanism: "Amiodarone inhibits the CYP3A4 and CYP2D6 pathways required for cyclobenzaprine clearance.",
    effect: "↑ Elevates circulating cyclobenzaprine concentrations, increasing the risk of prolonged QTc intervals and anticholinergic toxicities.",
    evidence: {
      confidence: "moderate",
      sources: [
        "literature"
      ]
    },
    evidenceRefs: [
      "ev_cyclobenzaprine_serotonin_syndrome"
    ]
  },
{
    drug1: "Duloxetine",
    drug2: "Cyclobenzaprine",
    severity: "moderate",
    category: "pharmacodynamic",
    mechanism: "Additive serotonergic activity combined with shared CYP1A2 competitive metabolic networks.",
    effect: "↑ Elevates the risk of serotonin syndrome and severe central nervous system depression; monitor for tremors or autonomic instability.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_cyclobenzaprine_serotonin_syndrome"
    ]
  },
{
    drug1: "Methotrexate",
    drug2: "Probenecid",
    severity: "severe",
    category: "transport",
    mechanism: "Probenecid competitively inhibits renal OAT1 and OAT3 organic anion transporters, blocking methotrexate excretion.",
    effect: "↑↑ Drives severe, toxic systemic accumulation of methotrexate, risking bone marrow failure and acute kidney injury. Co-administration is contraindicated.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA Boxed Warning"
      ]
    },
    evidenceRefs: [
      "ev_methotrexate_oat3_probenecid"
    ]
  },
{
    drug1: "Leflunomide",
    drug2: "Warfarin",
    severity: "moderate",
    category: "metabolic",
    mechanism: "Weak competitive inhibition of CYP2C9 by the active metabolite teriflunomide.",
    effect: "↑ Prolongs the international normalized ratio (INR), increasing bleeding risks; requires frequent INR monitoring during co-therapy.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_leflunomide_teriflunomide_half_life"
    ]
  },
{
    drug1: "Isoniazid",
    drug2: "Carbamazepine",
    severity: "severe",
    category: "metabolic",
    mechanism: "Isoniazid inhibits CYP3A4, blocking the primary clearance pathway for carbamazepine.",
    effect: "↑↑ Spikes carbamazepine levels to toxic thresholds, causing ataxia and diplopia, while increasing isoniazid hepatotoxicity risks. Reduce carbamazepine dose by 50%.",
    evidence: {
      confidence: "high",
      sources: [
        "FDA label"
      ]
    },
    evidenceRefs: [
      "ev_nat2_isoniazid_consensus"
    ]
  },
{
    drug1: "Hydralazine",
    drug2: "Metoprolol",
    severity: "moderate",
    category: "clearance",
    mechanism: "Hydralazine decreases hepatic blood flow velocity and alters first-pass extraction parameters.",
    effect: "↑ Significantly increases the systemic bio-availability and beta-blocking efficacy of metoprolol; monitor heart rate closely.",
    evidence: {
      confidence: "high",
      sources: [
        "literature"
      ]
    },
    evidenceRefs: [
      "ev_nat2_isoniazid_consensus"
    ]
  },
];
// ── COMBINATION calcFold — considers parent + metabolite inhibitions ──
