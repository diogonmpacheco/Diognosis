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
,
"Cyclophosphamide":{"primary":{"enzyme":"CYP2B6","metabolite":"4-Hydroxycyclophosphamide","activity":"active","pct":45},"diverted":[{"enzyme":"CYP3A4","metabolite":"N-deschloroethylcyclophosphamide","activity":"inactive_toxic","pct":35,"note":"Chloroacetaldehyde (neurotoxic) released; preferential at high doses when CYP2B6 saturated"},{"enzyme":"CYP2C9","metabolite":"Dechloroethylcyclophosphamide","activity":"inactive","pct":10}],"clinicalImpact":"CYP2B6 PM: 4-OH-CPA formation reduced → lower alkylating efficacy. UM: excess activation → hemorrhagic cystitis. CYP3A4 inducers shift toward neurotoxic metabolite.","severity":"high","pmEffect":"reduced_activation","umEffect":"enhanced_toxicity"},
"Flecainide":{"primary":{"enzyme":"CYP2D6","metabolite":"m-O-dealkylated flecainide","activity":"inactive","pct":60},"diverted":[{"enzyme":"Renal Excretion","metabolite":"Unchanged flecainide","activity":"active","pct":30}],"clinicalImpact":"CYP2D6 PM: flecainide AUC ↑2-3×. Proarrhythmic risk increases sharply. Narrow therapeutic index — PM requires dose reduction.","severity":"critical","pmEffect":"severe_toxicity"},
"Thioridazine":{"primary":{"enzyme":"CYP2D6","metabolite":"Mesoridazine (active) + Sulforidazine","activity":"active","pct":60},"diverted":[{"enzyme":"CYP3A4","metabolite":"Ring hydroxylation products","activity":"inactive","pct":25}],"clinicalImpact":"CYP2D6 PM: parent thioridazine accumulates → QT prolongation → torsades de pointes. CONTRAINDICATED with CYP2D6 inhibitors. Black-box QT warning.","severity":"critical","pmEffect":"fatal_arrhythmia"},
"Propafenone":{"primary":{"enzyme":"CYP2D6","metabolite":"5-Hydroxypropafenone","activity":"active_equipotent","pct":70},"diverted":[{"enzyme":"CYP3A4","metabolite":"N-depropylpropafenone","activity":"active","pct":15},{"enzyme":"CYP1A2","metabolite":"4-Hydroxypropafenone","activity":"weak","pct":10}],"clinicalImpact":"CYP2D6 PM: parent propafenone AUC ↑2.4×. Beta-blocking effect more pronounced. Propafenone itself inhibits CYP2D6 in EMs (phenoconversion) at higher doses.","severity":"high","pmEffect":"increased_exposure"}
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
  {drug1:"Lithium",drug2:"Hydrochlorothiazide",severity:"severe",category:"nephro",mechanism:"Thiazides reduce lithium clearance by 25-40%",effect:"↑↑ Lithium levels — high toxicity risk",evidence:{confidence:"high",sources:["clinical guidelines"]},evidenceRefs:["ev_lithium_thiazide_label"]},
  {drug1:"Lithium",drug2:"Furosemide",severity:"moderate",category:"nephro",mechanism:"Loop diuretics can reduce lithium clearance via volume depletion",effect:"↑ Lithium levels — monitor closely",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  // ── Methotrexate toxicity ──
  {drug1:"Methotrexate",drug2:"Ibuprofen",severity:"severe",category:"nephro",mechanism:"NSAIDs reduce methotrexate renal clearance",effect:"↑↑ Methotrexate levels — bone marrow toxicity risk",evidence:{confidence:"high",sources:["clinical guidelines"]},evidenceRefs:["ev_mtx_interactions_bannwarth1996"]},
  {drug1:"Methotrexate",drug2:"Naproxen",severity:"severe",category:"nephro",mechanism:"NSAIDs reduce methotrexate renal clearance",effect:"↑↑ Methotrexate levels — toxicity risk",evidence:{confidence:"high",sources:["clinical guidelines"]},evidenceRefs:["ev_mtx_interactions_bannwarth1996"]},
  {drug1:"Methotrexate",drug2:"Omeprazole",severity:"moderate",category:"renal",mechanism:"PPIs may reduce methotrexate renal clearance",effect:"↑ Methotrexate levels",evidence:{confidence:"moderate",sources:["case reports"]}},
  // ── Digoxin interactions ──
  {drug1:"Digoxin",drug2:"Amiodarone",severity:"severe",category:"pk",mechanism:"Amiodarone inhibits P-glycoprotein and reduces digoxin renal clearance by ~50%",effect:"↑↑ Digoxin levels — toxicity risk (halve digoxin dose)",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_digoxin_pgp_amiodarone_fda"]},
  {drug1:"Digoxin",drug2:"St. John's Wort",severity:"severe",category:"induction",mechanism:"St. John's Wort induces P-gp, reducing digoxin absorption and increasing clearance",effect:"Digoxin AUC ↓ 25-40% — loss of rate control or heart failure control",evidence:{confidence:"high",sources:["clinical PK studies"],pmid:["10604132"]},evidenceRefs:["ev_sjw_digoxin_durr2000"]},
  {drug1:"Digoxin",drug2:"Rifampin",severity:"moderate",category:"induction",mechanism:"Rifampin induces P-gp, reducing digoxin exposure by ~30%",effect:"Lower digoxin levels — monitor response and serum concentrations",evidence:{confidence:"high",sources:["FDA label","clinical PK studies"]}},
  {drug1:"Digoxin",drug2:"Verapamil",severity:"severe",category:"pk",mechanism:"Verapamil inhibits P-gp, raises digoxin levels 50-75%",effect:"↑↑ Digoxin levels — toxicity + AV block risk",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_digoxin_verapamil_klein1982"]},
  {drug1:"Digoxin",drug2:"Diltiazem",severity:"moderate",category:"pk",mechanism:"Diltiazem raises digoxin levels ~20% + additive AV block",effect:"↑ Digoxin levels + ↑ bradycardia",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Digoxin",drug2:"Cyclosporine",severity:"severe",category:"pk",mechanism:"Cyclosporine inhibits P-gp, raises digoxin levels",effect:"↑↑ Digoxin levels",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_digoxin_pgp_koren1998"]},
  {drug1:"Digoxin",drug2:"Spironolactone",severity:"moderate",category:"pk",mechanism:"Spironolactone reduces digoxin clearance + hyperkalemia potentiates digoxin toxicity",effect:"↑ Digoxin toxicity risk",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  // ── Warfarin specific ──
  {drug1:"Warfarin",drug2:"Aspirin",severity:"severe",category:"bleed",mechanism:"Additive anticoagulant + antiplatelet effect. Aspirin also causes GI mucosal damage",effect:"↑↑ Major bleeding risk",evidence:{confidence:"high",sources:["clinical guidelines"]},evidenceRefs:["ev_warfarin_nsaid_bleed"]},
  {drug1:"Warfarin",drug2:"Ibuprofen",severity:"severe",category:"bleed",mechanism:"NSAIDs + warfarin: additive bleeding + NSAID GI damage + CYP2C9 competition",effect:"↑↑ Major GI bleeding risk",evidence:{confidence:"high",sources:["clinical guidelines"]},evidenceRefs:["ev_warfarin_nsaid_bleed"]},
  {drug1:"Warfarin",drug2:"Naproxen",severity:"severe",category:"bleed",mechanism:"NSAID + warfarin: additive bleeding",effect:"↑↑ GI bleeding risk",evidence:{confidence:"high",sources:["clinical guidelines"]},evidenceRefs:["ev_warfarin_nsaid_bleed"]},
  {drug1:"Warfarin",drug2:"Acetaminophen",severity:"moderate",category:"pk",mechanism:"Acetaminophen's metabolite NAPQI inhibits vitamin K-dependent clotting factor synthesis at doses >2g/day",effect:"↑ INR — monitor closely",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Warfarin",drug2:"Fluconazole",severity:"severe",category:"pk",mechanism:"Fluconazole strongly inhibits CYP2C9 (warfarin's primary metabolic pathway)",effect:"↑↑ INR — major bleeding risk",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_fluconazole_warfarin_black1996"]},
  {drug1:"Warfarin",drug2:"Metronidazole",severity:"severe",category:"pk",mechanism:"Metronidazole inhibits warfarin metabolism",effect:"↑↑ INR — bleeding risk",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_warfarin_abx_lane2014"]},
  // ── DOAC specific ──
  {drug1:"Apixaban",drug2:"Aspirin",severity:"moderate",category:"bleed",mechanism:"Additive anticoagulant + antiplatelet bleeding risk",effect:"↑ Bleeding risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Rivaroxaban",drug2:"Aspirin",severity:"moderate",category:"bleed",mechanism:"Additive bleeding risk",effect:"↑ Bleeding risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Apixaban",drug2:"Clopidogrel",severity:"moderate",category:"bleed",mechanism:"Additive bleeding risk",effect:"↑ Bleeding risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Rivaroxaban",drug2:"Clopidogrel",severity:"moderate",category:"bleed",mechanism:"Additive bleeding risk",effect:"↑ Bleeding risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Dabigatran",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin induces P-gp, reducing dabigatran etexilate absorption and dabigatran AUC by ~67%",effect:"Loss of anticoagulation — avoid/contraindicated",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_doac_rifampin_hartter2012","ev_doac_rifampin_label"]},
  {drug1:"Apixaban",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin induces CYP3A4 and P-gp, reducing apixaban AUC by ~54%",effect:"Loss of anticoagulation — avoid/contraindicated",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_doac_rifampin_hartter2012","ev_doac_rifampin_label"]},
  {drug1:"Rivaroxaban",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin induces CYP3A4 and P-gp, reducing rivaroxaban AUC by ~50%",effect:"Loss of anticoagulation — avoid/contraindicated",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_doac_rifampin_hartter2012","ev_doac_rifampin_label"]},
  {drug1:"Edoxaban",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin induces P-gp, reducing edoxaban exposure by ~35%",effect:"Loss of anticoagulation — avoid when possible",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_doac_rifampin_hartter2012","ev_doac_rifampin_label"]},
  // ── Hyperkalemia combos ──
  {drug1:"Spironolactone",drug2:"Lisinopril",severity:"moderate",category:"hyperK",mechanism:"Both cause potassium retention — additive hyperkalemia risk",effect:"↑ Hyperkalemia — monitor K+ closely",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Spironolactone",drug2:"Losartan",severity:"moderate",category:"hyperK",mechanism:"Both cause potassium retention",effect:"↑ Hyperkalemia risk",evidence:{confidence:"high",sources:["clinical guidelines"]}},
  {drug1:"Spironolactone",drug2:"Trimethoprim/Sulfamethoxazole",severity:"severe",category:"hyperK",mechanism:"Both block potassium excretion via different mechanisms",effect:"↑↑ Severe hyperkalemia risk",evidence:{confidence:"high",sources:["clinical guidelines"]},evidenceRefs:["ev_spironolactone_tmpsmx_antoniou2011"]},
  // ── Serotonin syndrome specific pairs ──
  {drug1:"Fluoxetine",drug2:"Tramadol",severity:"severe",category:"serotonin",mechanism:"SSRI + serotonergic opioid — high serotonin syndrome risk. Also fluoxetine blocks tramadol activation via CYP2D6",effect:"↑↑ Serotonin syndrome + ↓↓ tramadol efficacy",evidence:{confidence:"high",sources:["FDA warning"]},evidenceRefs:["ev_tramadol_serotonin_beakley2015","ev_ssri_cyp2d6_liston2002"]},
  {drug1:"Sertraline",drug2:"Tramadol",severity:"severe",category:"serotonin",mechanism:"SSRI + serotonergic opioid",effect:"↑↑ Serotonin syndrome risk",evidence:{confidence:"high",sources:["FDA warning"]},evidenceRefs:["ev_tramadol_serotonin_beakley2015"]},
  {drug1:"Fluoxetine",drug2:"Sumatriptan",severity:"moderate",category:"serotonin",mechanism:"SSRI + triptan — serotonin syndrome risk (FDA warning)",effect:"↑ Serotonin syndrome risk — monitor",evidence:{confidence:"high",sources:["FDA warning"]}},
  {drug1:"Sertraline",drug2:"Sumatriptan",severity:"moderate",category:"serotonin",mechanism:"SSRI + triptan",effect:"↑ Serotonin syndrome risk",evidence:{confidence:"high",sources:["FDA warning"]}},
  // ── Seizure threshold ──
  {drug1:"Bupropion",drug2:"Cyclobenzaprine",severity:"moderate",category:"seizure",mechanism:"Both lower seizure threshold",effect:"↑ Seizure risk",evidence:{confidence:"high",sources:["FDA label"]}},
  // ── Colchicine + strong 3A4 inhibitors ──
  {drug1:"Colchicine",drug2:"Clarithromycin",severity:"severe",category:"pk",mechanism:"Clarithromycin strongly inhibits CYP3A4, causing massive colchicine accumulation. Multiple fatalities reported",effect:"↑↑↑ Colchicine toxicity — CONTRAINDICATED",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_colchicine_clarithromycin_hung2005","ev_colchicine_label"]},
  {drug1:"Colchicine",drug2:"Ritonavir",severity:"severe",category:"pk",mechanism:"Ritonavir strongly inhibits CYP3A4 — colchicine accumulation",effect:"↑↑↑ Colchicine toxicity — CONTRAINDICATED",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_colchicine_label","ev_colchicine_cyp3a4_hansten2022"]},
  {drug1:"Colchicine",drug2:"Itraconazole",severity:"severe",category:"pk",mechanism:"Strong CYP3A4 inhibition — colchicine accumulation",effect:"↑↑ Colchicine toxicity",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_colchicine_label","ev_colchicine_cyp3a4_hansten2022"]},
  {drug1:"Colchicine",drug2:"Ketoconazole",severity:"severe",category:"pk",mechanism:"Strong CYP3A4 inhibition — colchicine accumulation",effect:"↑↑ Colchicine toxicity",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_colchicine_label","ev_colchicine_cyp3a4_hansten2022"]},
  // ── Statin myopathy pairs ──
  {drug1:"Simvastatin",drug2:"Clarithromycin",severity:"severe",category:"pk",mechanism:"Strong CYP3A4 inhibition raises simvastatin AUC 10-fold — rhabdomyolysis risk",effect:"↑↑↑ Rhabdomyolysis — CONTRAINDICATED",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_simvastatin_label_cyp3a4","ev_statin_cyp3a4_williams2002"]},
  {drug1:"Simvastatin",drug2:"Itraconazole",severity:"severe",category:"pk",mechanism:"Strong CYP3A4 inhibition — rhabdomyolysis",effect:"↑↑↑ Rhabdomyolysis — CONTRAINDICATED",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_simvastatin_label_cyp3a4","ev_statin_cyp3a4_williams2002"]},
  {drug1:"Simvastatin",drug2:"Ritonavir",severity:"severe",category:"pk",mechanism:"Strong CYP3A4 inhibition — rhabdomyolysis",effect:"↑↑↑ Rhabdomyolysis — CONTRAINDICATED",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_simvastatin_label_cyp3a4","ev_statin_cyp3a4_williams2002"]},
  {drug1:"Simvastatin",drug2:"Cyclosporine",severity:"severe",category:"pk",mechanism:"CYP3A4 inhibition + OATP inhibition — rhabdomyolysis",effect:"↑↑↑ Rhabdomyolysis — CONTRAINDICATED",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_simvastatin_label_cyp3a4","ev_statin_cyp3a4_williams2002"]},
  {drug1:"Simvastatin",drug2:"Gemfibrozil",severity:"severe",category:"transporter",mechanism:"Gemfibrozil inhibits OATP1B1 and CYP2C8, raising simvastatin acid exposure about 10-fold",effect:"CONTRAINDICATED — rhabdomyolysis risk",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_statin_gemfibrozil_schneck2004","ev_simvastatin_label_cyp3a4"]},
  {drug1:"Rosuvastatin",drug2:"Gemfibrozil",severity:"severe",category:"transporter",mechanism:"Gemfibrozil inhibits OATP1B1, raising rosuvastatin exposure about 2-fold",effect:"↑ Myopathy risk — avoid or use reduced statin dose",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_statin_gemfibrozil_schneck2004","ev_rosuvastatin_label"]},
  {drug1:"Atorvastatin",drug2:"Gemfibrozil",severity:"moderate",category:"transporter",mechanism:"Gemfibrozil inhibits OATP1B1 and raises statin exposure",effect:"↑ Myopathy risk — fenofibrate preferred if fibrate needed",evidence:{confidence:"moderate",sources:["FDA label"]}},
  {drug1:"Pravastatin",drug2:"Gemfibrozil",severity:"moderate",category:"transporter",mechanism:"Gemfibrozil inhibits hepatic uptake transporters and can raise pravastatin exposure",effect:"↑ Myopathy risk — monitor or use alternative",evidence:{confidence:"moderate",sources:["FDA label"]}},
  {drug1:"Rosuvastatin",drug2:"Eltrombopag",severity:"severe",category:"transporter",mechanism:"Eltrombopag inhibits OATP1B1 and BCRP, raising rosuvastatin AUC about 3.6-fold",effect:"↑↑ Myopathy risk — use reduced rosuvastatin dose",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_rosuvastatin_label"]},
  {drug1:"Lovastatin",drug2:"Clarithromycin",severity:"severe",category:"pk",mechanism:"Strong CYP3A4 inhibition — rhabdomyolysis risk",effect:"↑↑ Rhabdomyolysis risk",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_simvastatin_label_cyp3a4","ev_statin_cyp3a4_williams2002"]},
  {drug1:"Atorvastatin",drug2:"Clarithromycin",severity:"moderate",category:"pk",mechanism:"Moderate increase in atorvastatin levels via CYP3A4 inhibition",effect:"↑ Myopathy risk — use lower statin dose",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  // ── Tacrolimus/Cyclosporine ──
  {drug1:"Tacrolimus",drug2:"Fluconazole",severity:"severe",category:"pk",mechanism:"CYP3A4 + CYP2C9 inhibition doubles tacrolimus levels",effect:"↑↑ Tacrolimus toxicity — nephrotoxicity, neurotoxicity",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_tacrolimus_fluconazole_ferchichi2024"]},
  {drug1:"Tacrolimus",drug2:"Voriconazole",severity:"severe",category:"pk",mechanism:"Strong CYP3A4 inhibition triples tacrolimus levels",effect:"↑↑↑ Tacrolimus toxicity",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_tacrolimus_voriconazole_vanhove2017"]},
  {drug1:"Cyclosporine",drug2:"Ketoconazole",severity:"severe",category:"pk",mechanism:"Ketoconazole inhibits intestinal and hepatic CYP3A, raising cyclosporine bioavailability and reducing clearance",effect:"↑↑ Cyclosporine levels — nephrotoxicity risk; use TDM and major dose reduction",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_ketoconazole_cyclosporine_gomez1995"]},
  // ── Tizanidine + CYP1A2 ──
  {drug1:"Tizanidine",drug2:"Ciprofloxacin",severity:"severe",category:"pk",mechanism:"Ciprofloxacin strongly inhibits CYP1A2, raising tizanidine AUC 10-fold",effect:"↑↑↑ Severe hypotension, sedation — CONTRAINDICATED",evidence:{confidence:"high",sources:["FDA label","clinical PK studies"]},evidenceRefs:["ev_tizanidine_ciprofloxacin_fda"]},
  {drug1:"Tizanidine",drug2:"Fluvoxamine",severity:"severe",category:"pk",mechanism:"Fluvoxamine strongly inhibits CYP1A2, raising tizanidine AUC 33-fold",effect:"↑↑↑ Severe hypotension — CONTRAINDICATED",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_tizanidine_fluvoxamine_granfors2004"]},
  // ── Theophylline ──
  {drug1:"Theophylline",drug2:"Ciprofloxacin",severity:"severe",category:"pk",mechanism:"CYP1A2 inhibition raises theophylline levels — seizure/arrhythmia risk",effect:"↑↑ Theophylline toxicity",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_theophylline_quinolone_wijnands1988"]},
  {drug1:"Theophylline",drug2:"Fluvoxamine",severity:"severe",category:"pk",mechanism:"Strong CYP1A2 inhibition — theophylline toxicity",effect:"↑↑ Theophylline toxicity — CONTRAINDICATED",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_theophylline_cyp1a2_label"]},
  // ── Clozapine ──
  {drug1:"Clozapine",drug2:"Ciprofloxacin",severity:"severe",category:"pk",mechanism:"CYP1A2 inhibition raises clozapine levels — seizure/agranulocytosis risk",effect:"↑↑ Clozapine toxicity",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_clozapine_ciprofloxacin_waters2025"]},
  {drug1:"Clozapine",drug2:"Fluvoxamine",severity:"severe",category:"pk",mechanism:"Strong CYP1A2 inhibition raises clozapine 5-10x",effect:"↑↑↑ Clozapine toxicity — CONTRAINDICATED",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_clozapine_cyp1a2_chetty2007"]},
  // ── Midazolam sentinel ──
  {drug1:"Midazolam",drug2:"Clarithromycin",severity:"severe",category:"pk",mechanism:"CYP3A4 inhibition raises midazolam AUC 7-fold — respiratory depression",effect:"↑↑ Prolonged deep sedation",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_midazolam_cyp3a4_olkkola1994"]},
  {drug1:"Midazolam",drug2:"Ketoconazole",severity:"severe",category:"pk",mechanism:"CYP3A4 inhibition raises midazolam AUC 15-fold",effect:"↑↑↑ Prolonged sedation — AVOID",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_midazolam_cyp3a4_olkkola1994"]},
  {drug1:"Midazolam",drug2:"Ritonavir",severity:"severe",category:"pk",mechanism:"CYP3A4 inhibition raises midazolam AUC dramatically",effect:"↑↑↑ Prolonged sedation — CONTRAINDICATED",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_midazolam_cyp3a4_olkkola1994"]},
  // ── Levothyroxine absorption ──
  {drug1:"Levothyroxine",drug2:"Calcium",severity:"moderate",category:"absorption",mechanism:"Calcium binds levothyroxine in the GI tract, reducing absorption.",effect:"Reduced levothyroxine exposure and possible hypothyroid breakthrough; separate administration and monitor TSH after chronic changes.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_levothyroxine_absorption_label"]},
  {drug1:"Levothyroxine",drug2:"Iron",severity:"moderate",category:"absorption",mechanism:"Iron forms insoluble complexes with levothyroxine and reduces absorption.",effect:"Reduced levothyroxine exposure; separate administration and monitor thyroid response after chronic iron use.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_levothyroxine_absorption_label"]},
  {drug1:"Levothyroxine",drug2:"Omeprazole",severity:"mild",category:"absorption",mechanism:"Reduced gastric acidity can reduce levothyroxine tablet dissolution and absorption in some patients.",effect:"Possible need for levothyroxine dose adjustment; monitor TSH after sustained acid-suppression changes.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_levothyroxine_absorption_label"]},
  {drug1:"Levothyroxine",drug2:"Esomeprazole",severity:"mild",category:"absorption",mechanism:"Reduced gastric acidity can reduce levothyroxine tablet dissolution and absorption in some patients.",effect:"Possible reduced thyroid hormone exposure; monitor TSH if symptoms or chronic PPI use changes.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_levothyroxine_absorption_label"]},
  // ── Metformin + contrast / alcohol ──
  {drug1:"Metformin",drug2:"Alcohol (Ethanol)",severity:"moderate",category:"metabolic",mechanism:"Both increase lactic acidosis risk. Alcohol inhibits gluconeogenesis",effect:"↑ Lactic acidosis + ↑ hypoglycemia risk",evidence:{confidence:"moderate",sources:["literature"]}},
  {drug1:"Metformin",drug2:"Trimethoprim/Sulfamethoxazole",severity:"moderate",category:"transporter",mechanism:"Trimethoprim inhibits OCT2 and MATE1, reducing metformin renal secretion by ~40%",effect:"Metformin AUC ↑ ~40%; lactic acidosis risk rises especially with renal impairment",evidence:{confidence:"high",sources:["clinical PK studies"],pmid:["26953265"]}},
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
  {drug1:"Grapefruit Juice",drug2:"Simvastatin",severity:"severe",category:"pk",mechanism:"Grapefruit irreversibly inhibits intestinal CYP3A4, raising simvastatin AUC 3-16x",effect:"↑↑ Rhabdomyolysis risk",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_grapefruit_simvastatin_lilja1998"]},
  {drug1:"Grapefruit Juice",drug2:"Felodipine",severity:"moderate",category:"pk",mechanism:"Intestinal CYP3A4 inhibition raises felodipine levels 2-3x",effect:"↑ Hypotension risk",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Grapefruit Juice",drug2:"Midazolam",severity:"moderate",category:"pk",mechanism:"Intestinal CYP3A4 inhibition raises oral midazolam levels",effect:"↑ Sedation",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Grapefruit Juice",drug2:"Tacrolimus",severity:"moderate",category:"pk",mechanism:"Intestinal CYP3A4 inhibition raises tacrolimus levels",effect:"↑ Tacrolimus toxicity risk",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  // ── MAO-related (sumatriptan) ──
  // ── Amiodarone ──
  {drug1:"Amiodarone",drug2:"Warfarin",severity:"severe",category:"pk",mechanism:"Amiodarone inhibits CYP2C9, raising warfarin effect and lowering dose requirement",effect:"↑↑ INR — reduce warfarin dose ~25-50% and monitor closely",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_amiodarone_warfarin_kerin1988"]},
  {drug1:"Amiodarone",drug2:"Simvastatin",severity:"severe",category:"pk",mechanism:"CYP3A4 inhibition — FDA max simvastatin 20mg with amiodarone",effect:"↑ Rhabdomyolysis risk — dose limit",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_amiodarone_simvastatin_ricaurte2006","ev_simvastatin_label_cyp3a4"]},
  {drug1:"Amiodarone",drug2:"Metoprolol",severity:"moderate",category:"cardiac",mechanism:"Additive bradycardia and AV block risk",effect:"↑ Bradycardia / heart block",evidence:{confidence:"moderate",sources:["literature"]}},
  // ── Valproic acid ──
  {drug1:"Valproic Acid",drug2:"Lamotrigine",severity:"severe",category:"pk",mechanism:"Valproate inhibits lamotrigine glucuronidation, doubling its levels",effect:"↑↑ Lamotrigine levels — Stevens-Johnson syndrome risk at high levels",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_lamotrigine_valproate_rambeck1993"]},
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
  {drug1:"MDMA (Ecstasy)",drug2:"Ritonavir",severity:"severe",category:"pk",mechanism:"Ritonavir strongly inhibits CYP3A4+CYP2D6, MDMA levels ↑ 5-10×. Multiple deaths reported in HIV patients",effect:"⚠⚠ CONTRAINDICATED — fatal MDMA overdoses reported",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_mdma_ritonavir_papaseit2012"]},
  {drug1:"MDMA (Ecstasy)",drug2:"Bupropion",severity:"moderate",category:"pk",mechanism:"Bupropion (via hydroxybupropion) strongly inhibits CYP2D6, MDMA's primary metabolism route. MDMA levels ↑ 2-3×",effect:"↑↑ MDMA levels — increased neurotoxicity and hyperthermia risk",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"MDMA (Ecstasy)",drug2:"Amphetamine",severity:"severe",category:"pd",mechanism:"Dual dopamine/norepinephrine/serotonin releasers. Additive cardiovascular stress, hyperthermia, neurotoxicity",effect:"⚠ Extreme cardiovascular + hyperthermic risk",evidence:{confidence:"moderate",sources:["clinical toxicology review"]},evidenceRefs:["ev_sympathomimetic_toxicity_review","ev_mdma_meth_cyp2d6_review"]},
  {drug1:"MDMA (Ecstasy)",drug2:"Cocaine",severity:"severe",category:"pd",mechanism:"Both sympathomimetic stimulants. Additive cardiac stress — arrhythmias, MI, stroke, hyperthermia",effect:"⚠ Severe cardiovascular risk — deaths reported",evidence:{confidence:"moderate",sources:["clinical toxicology review"]},evidenceRefs:["ev_sympathomimetic_toxicity_review","ev_cocaine_toxicity_review","ev_mdma_meth_cyp2d6_review"]},
  // ── Cocaine interactions ──
  {drug1:"Cocaine",drug2:"Alcohol (Ethanol)",severity:"severe",category:"metabolite",mechanism:"Liver forms cocaethylene (active metabolite) with 5× longer half-life + equal cardiotoxicity. Cocaethylene is more toxic than either drug alone",effect:"⚠⚠ CONTRAINDICATED — cocaethylene formation, cardiac death risk ↑ 18-25×",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_cocaethylene_henning1996"]},
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
  {drug1:"DXM (Dextromethorphan)",drug2:"Fluoxetine",severity:"severe",category:"pk",mechanism:"Fluoxetine strongly inhibits CYP2D6, DXM levels ↑ 5×+ converting it from cough suppressant to dissociative doses. Also serotonin syndrome",effect:"⚠ Serotonin syndrome + DXM toxicity — potentially fatal",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_ssri_cyp2d6_liston2002"]},
  {drug1:"DXM (Dextromethorphan)",drug2:"Paroxetine",severity:"severe",category:"pk",mechanism:"Paroxetine strongly inhibits CYP2D6, DXM levels ↑ 5×+. Also serotonin syndrome risk",effect:"⚠ Serotonin syndrome + DXM toxicity",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_paroxetine_cyp2d6_fda","ev_paroxetine_cyp2d6_rct","ev_paroxetine_cyp2d6_japanese"]},
  {drug1:"DXM (Dextromethorphan)",drug2:"Bupropion",severity:"severe",category:"pk",mechanism:"Hydroxybupropion strongly inhibits CYP2D6 — DXM levels ↑ 5×+. DXM becomes dissociative at these levels",effect:"⚠ DXM toxicity — dissociative effects at normal cough doses",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_ssri_cyp2d6_liston2002","ev_bupropion_cyp2d6_fda"]},
  // ── Kratom interactions ──
  {drug1:"Kratom (Mitragynine)",drug2:"Fluoxetine",severity:"moderate",category:"pk",mechanism:"Kratom inhibits CYP2D6 + fluoxetine inhibits CYP2D6. Mutual PK interaction + opioid+serotonergic PD overlap",effect:"↑ Both drug levels + serotonin syndrome risk",evidence:{confidence:"high",sources:["clinical PK studies"]}},
  {drug1:"Kratom (Mitragynine)",drug2:"Tramadol",severity:"severe",category:"pd",mechanism:"Kratom has opioid-like pharmacology and potential CYP interaction liability; tramadol adds serotonergic, opioid, and seizure-threshold risks",effect:"⚠ Respiratory depression + seizure + serotonin risk",evidence:{confidence:"moderate",sources:["clinical/mechanistic review"]},evidenceRefs:["ev_kratom_polysubstance_review","ev_kratom_mitragynine_cyp2d6_basiliere2020","ev_opioid_cyp2d6_cpic_2020"]},
  {drug1:"Kratom (Mitragynine)",drug2:"Alcohol (Ethanol)",severity:"severe",category:"pd",mechanism:"Kratom-related adverse events commonly involve polysubstance use; alcohol adds CNS impairment and can worsen sedation/respiratory-risk context",effect:"⚠ Severe sedation/impairment risk; fatalities often involve co-ingestants",evidence:{confidence:"moderate",sources:["clinical/mechanistic review"]},evidenceRefs:["ev_kratom_polysubstance_review"]},
  // ── Alcohol-specific ──
  {drug1:"Alcohol (Ethanol)",drug2:"Acetaminophen",severity:"severe",category:"metabolite",mechanism:"Chronic alcohol induces CYP2E1, shifting acetaminophen toward toxic NAPQI metabolite pathway. Depletes glutathione stores needed to neutralize NAPQI",effect:"⚠⚠ CONTRAINDICATED in heavy drinkers — hepatotoxicity, liver failure risk even at therapeutic acetaminophen doses",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_apap_alcohol_riordan2002"]},
  // ── CBD interactions ──
  {drug1:"Cannabis (CBD)",drug2:"Clobazam",severity:"severe",category:"pk",mechanism:"CBD strongly inhibits CYP2C19, raising active metabolite N-desmethylclobazam 5×+. FDA-documented interaction",effect:"↑↑ Clobazam sedation — dose reduction required",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_cbd_clobazam_geffrey2015"]},
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
  drug2:"Trimethoprim/Sulfamethoxazole",
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
  },
  evidenceRefs:["ev_qt_torsades_tisdale2016"]
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
  },
  evidenceRefs:["ev_digoxin_pgp_koren1998"]
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
  // ── Curated Gemini salvage batch 2: high-signal non-duplicate pairs ──
  {drug1:"Loperamide",drug2:"Quinidine",severity:"severe",category:"transport",mechanism:"Quinidine strongly inhibits P-gp at the blood-brain barrier, allowing loperamide to enter the CNS.",effect:"Increased central opioid effects and respiratory depression risk; avoid supratherapeutic loperamide and strong P-gp blockade.",evidence:{confidence:"high",sources:["clinical PK study"]},evidenceRefs:["ev_loperamide_pgp_inhibitor_cns"]},
  {drug1:"Loperamide",drug2:"Clarithromycin",severity:"severe",category:"transport",mechanism:"Clarithromycin inhibits P-gp and CYP3A4, increasing loperamide systemic and CNS exposure.",effect:"Increased CNS opioid toxicity and QT/arrhythmia risk, especially with high-dose loperamide.",evidence:{confidence:"high",sources:["FDA label","clinical pharmacology"]},evidenceRefs:["ev_loperamide_pgp_inhibitor_cns"]},
  {drug1:"Rifaximin",drug2:"Cyclosporine",severity:"moderate",category:"transport",mechanism:"Cyclosporine inhibits intestinal P-gp/OATP transport and can markedly increase systemic rifaximin exposure.",effect:"Increased rifaximin exposure; monitor for unexpected systemic adverse effects.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_rifaximin_cyclosporine_transporter"]},
  {drug1:"Cimetidine",drug2:"Theophylline",severity:"severe",category:"metabolic",mechanism:"Cimetidine inhibits CYP1A2-mediated theophylline clearance.",effect:"Theophylline toxicity risk, including seizure and arrhythmia; avoid or monitor levels closely.",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_cimetidine_theophylline_clearance"]},
  {drug1:"Omeprazole",drug2:"Mycophenolate",severity:"moderate",category:"absorption",mechanism:"Acid suppression can reduce mycophenolate mofetil dissolution and active mycophenolic acid exposure.",effect:"Reduced mycophenolate exposure; monitor transplant/immunosuppression context.",evidence:{confidence:"moderate",sources:["clinical PK studies"]},evidenceRefs:["ev_mycophenolate_ppi_solubility"]},
  {drug1:"Tofacitinib",drug2:"Ketoconazole",severity:"severe",category:"metabolic",mechanism:"Strong CYP3A4 inhibition raises tofacitinib exposure.",effect:"Increased tofacitinib toxicity and infection risk; dose adjustment or avoidance required.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_tofacitinib_cyp3a4_label"]},
  {drug1:"Tofacitinib",drug2:"Fluconazole",severity:"severe",category:"metabolic",mechanism:"Combined CYP3A4 and CYP2C19 inhibition increases tofacitinib exposure.",effect:"Increased tofacitinib toxicity and infection risk; dose adjustment required.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_tofacitinib_cyp3a4_label"]},
  {drug1:"Tofacitinib",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin strongly induces CYP3A4, accelerating tofacitinib clearance.",effect:"Reduced tofacitinib exposure and likely therapeutic failure; avoid combination.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_tofacitinib_cyp3a4_label"]},
  {drug1:"Upadacitinib",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin strongly induces CYP3A4, reducing upadacitinib exposure.",effect:"Reduced upadacitinib efficacy; avoid chronic co-administration.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_upadacitinib_cyp3a4_label"]},
  {drug1:"Zileuton",drug2:"Theophylline",severity:"severe",category:"metabolic",mechanism:"Zileuton inhibits CYP1A2 and reduces theophylline clearance.",effect:"Theophylline toxicity; reduce dose and monitor serum concentrations.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_zileuton_theophylline_label"]},
  {drug1:"Zileuton",drug2:"Warfarin",severity:"moderate",category:"metabolic",mechanism:"Zileuton can increase warfarin anticoagulant response.",effect:"Increased INR/bleeding risk; monitor INR when starting or stopping zileuton.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_zileuton_theophylline_label"]},
  {drug1:"Zafirlukast",drug2:"Warfarin",severity:"severe",category:"metabolic",mechanism:"Zafirlukast inhibits CYP2C9-mediated warfarin clearance.",effect:"Increased INR and bleeding risk; close INR monitoring or alternative leukotriene therapy.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_zafirlukast_warfarin_label"]},
  {drug1:"Roflumilast",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin induces CYP3A4/CYP1A2 pathways involved in roflumilast active exposure.",effect:"Reduced roflumilast exposure and COPD exacerbation prevention; avoid combination.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_roflumilast_cyp_label"]},
  {drug1:"Ethinyl Estradiol",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin strongly induces CYP3A4 and UGT pathways, lowering estrogen/progestin contraceptive exposure.",effect:"Reduced contraceptive efficacy; use reliable nonhormonal backup or an alternative.",evidence:{confidence:"high",sources:["FDA label","clinical guidance"]},evidenceRefs:["ev_rifampin_hormonal_contraception"]},
  {drug1:"Ethinyl Estradiol",drug2:"Lamotrigine",severity:"severe",category:"glucuronidation",mechanism:"Ethinyl estradiol induces lamotrigine glucuronidation.",effect:"Reduced lamotrigine exposure and seizure/mood destabilization risk; levels may rebound during pill-free intervals.",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_estradiol_lamotrigine_ugt1a4"]},
  {drug1:"Levonorgestrel",drug2:"Efavirenz",severity:"severe",category:"induction",mechanism:"Efavirenz induces CYP3A4 and can lower levonorgestrel exposure.",effect:"Reduced hormonal contraceptive efficacy; use additional reliable contraception.",evidence:{confidence:"high",sources:["clinical PK studies"]},evidenceRefs:["ev_efavirenz_levonorgestrel_contraception"]},
  {drug1:"Cinacalcet",drug2:"Paroxetine",severity:"severe",category:"metabolic",mechanism:"Paroxetine inhibits CYP2D6, increasing cinacalcet exposure; cinacalcet also inhibits CYP2D6 substrates.",effect:"Increased cinacalcet exposure and hypocalcemia risk; monitor calcium and symptoms.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_cinacalcet_cyp2d6_label"]},
  {drug1:"Alendronate",drug2:"Calcium",severity:"moderate",category:"absorption",mechanism:"Calcium binds alendronate in the GI tract and prevents absorption.",effect:"Reduced alendronate exposure; separate dosing and take alendronate with plain water only.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_alendronate_cation_absorption"]},
  {drug1:"Mifepristone",drug2:"Simvastatin",severity:"severe",category:"metabolic",mechanism:"Mifepristone strongly inhibits CYP3A4, raising simvastatin exposure.",effect:"Increased myopathy/rhabdomyolysis risk; avoid sensitive CYP3A statins.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_mifepristone_cyp3a4_label"]},
  {drug1:"Dantrolene",drug2:"Verapamil",severity:"severe",category:"cardiac",mechanism:"Dantrolene with calcium channel blockers has been associated with cardiovascular collapse/hyperkalemia signals in malignant hyperthermia treatment context.",effect:"Avoid IV verapamil/diltiazem with dantrolene in acute malignant hyperthermia management.",evidence:{confidence:"high",sources:["label warning"]},evidenceRefs:["ev_dantrolene_calcium_channel_warning"]},
  {drug1:"Rocuronium",drug2:"Sugammadex",severity:"mild",category:"reversal",mechanism:"Sugammadex encapsulates rocuronium and rapidly removes it from neuromuscular junction availability.",effect:"Purposeful reversal of rocuronium neuromuscular blockade.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_sugammadex_rocuronium_reversal"]},
  {drug1:"Sugammadex",drug2:"Ethinyl Estradiol",severity:"moderate",category:"binding",mechanism:"Sugammadex can reduce hormonal contraceptive exposure via steroid binding.",effect:"Use backup contraception for 7 days after sugammadex exposure.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_sugammadex_contraception_label"]},
  {drug1:"Propofol",drug2:"Midazolam",severity:"moderate",category:"pharmacodynamic",mechanism:"Both depress CNS arousal and respiratory drive.",effect:"Increased deep sedation/respiratory depression risk; titrate and monitor airway/ventilation.",evidence:{confidence:"moderate",sources:["clinical standard"]},evidenceRefs:["ev_propofol_midazolam_sedation"]},
  // ── Launch enrichment batch 3: QT/cardiology and oncology label-backed pairs ──
  {drug1:"Dofetilide",drug2:"Cimetidine",severity:"severe",category:"renal_transport",mechanism:"Cimetidine inhibits renal cation transport, reducing dofetilide elimination and raising plasma concentrations.",effect:"CONTRAINDICATED — increased QT prolongation and torsades risk.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_dofetilide_renal_cation_label"]},
  {drug1:"Dofetilide",drug2:"Trimethoprim/Sulfamethoxazole",severity:"severe",category:"renal_transport",mechanism:"Trimethoprim inhibits renal cation secretion involved in dofetilide elimination.",effect:"CONTRAINDICATED — increased dofetilide exposure and torsades risk.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_dofetilide_renal_cation_label"]},
  {drug1:"Dofetilide",drug2:"Verapamil",severity:"severe",category:"renal_transport",mechanism:"Verapamil increases dofetilide exposure through contraindicated transport and electrophysiologic interaction risk.",effect:"CONTRAINDICATED — concentration-dependent QT prolongation/torsades risk.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_dofetilide_renal_cation_label"]},
  {drug1:"Dofetilide",drug2:"Hydrochlorothiazide",severity:"severe",category:"renal_transport",mechanism:"Hydrochlorothiazide increases dofetilide plasma concentrations and QT interval effect.",effect:"CONTRAINDICATED — increased ventricular arrhythmia risk.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_dofetilide_renal_cation_label"]},
  {drug1:"Dofetilide",drug2:"Ketoconazole",severity:"severe",category:"renal_transport",mechanism:"Ketoconazole inhibits pathways involved in dofetilide clearance and is listed as contraindicated.",effect:"CONTRAINDICATED — increased dofetilide exposure and QT/torsades risk.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_dofetilide_renal_cation_label"]},
  {drug1:"Sotalol",drug2:"Hydrochlorothiazide",severity:"moderate",category:"qt_electrolyte",mechanism:"Sotalol prolongs QT; thiazide-associated hypokalemia/hypomagnesemia lowers repolarization reserve.",effect:"Increased torsades risk; monitor electrolytes, renal function, heart rate, and QT interval.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_sotalol_qt_renal_label"]},
  {drug1:"Sotalol",drug2:"Amiodarone",severity:"severe",category:"qt",mechanism:"Both antiarrhythmics prolong repolarization and can cause bradycardia/conduction slowing.",effect:"Avoid overlapping therapy unless specialist-directed with ECG monitoring and washout planning.",evidence:{confidence:"moderate",sources:["FDA label","clinical guidance"]},evidenceRefs:["ev_sotalol_qt_renal_label","ev_qt_torsades_tisdale2016"]},
  {drug1:"Ranolazine",drug2:"Ketoconazole",severity:"severe",category:"metabolic",mechanism:"Strong CYP3A inhibition markedly increases ranolazine exposure.",effect:"CONTRAINDICATED — increased adverse effects and QT prolongation risk.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_ranolazine_cyp3a_label"]},
  {drug1:"Ranolazine",drug2:"Diltiazem",severity:"moderate",category:"metabolic",mechanism:"Moderate CYP3A inhibition increases ranolazine exposure.",effect:"Limit ranolazine dose and monitor QT/adverse effects.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_ranolazine_cyp3a_label"]},
  {drug1:"Ranolazine",drug2:"Metformin",severity:"moderate",category:"transporter",mechanism:"Ranolazine inhibits OCT2-mediated metformin renal handling.",effect:"Metformin exposure can increase; dose limit/monitor especially at higher ranolazine doses or renal impairment.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_ranolazine_cyp3a_label"]},
  {drug1:"Venetoclax",drug2:"Ritonavir",severity:"severe",category:"metabolic",mechanism:"Ritonavir strongly inhibits CYP3A and P-gp, sharply increasing venetoclax exposure.",effect:"High tumor lysis/toxicity risk; contraindicated during some initiation/ramp-up contexts and requires strict dose modification otherwise.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_venetoclax_cyp3a_pgp_label"]},
  {drug1:"Venetoclax",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Strong CYP3A induction reduces venetoclax exposure.",effect:"Reduced anti-cancer efficacy; avoid strong CYP3A inducers.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_venetoclax_cyp3a_pgp_label"]},
  {drug1:"Ibrutinib",drug2:"Itraconazole",severity:"severe",category:"metabolic",mechanism:"Strong CYP3A inhibition increases ibrutinib plasma concentrations.",effect:"Increased bleeding, arrhythmia, infection, and other toxicity risk; avoid or interrupt/reduce per label.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_ibrutinib_cyp3a_label"]},
  {drug1:"Ibrutinib",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Strong CYP3A induction can greatly lower ibrutinib exposure.",effect:"Reduced anti-cancer efficacy; avoid strong CYP3A inducers.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_ibrutinib_cyp3a_label"]},
  {drug1:"Nilotinib",drug2:"Ketoconazole",severity:"severe",category:"metabolic_qt",mechanism:"Strong CYP3A inhibition increases nilotinib exposure, amplifying concentration-dependent QT prolongation.",effect:"Avoid combination; if unavoidable, specialist dose adjustment and ECG/electrolyte monitoring are required.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_nilotinib_qt_cyp3a_label"]},
  {drug1:"Nilotinib",drug2:"Amiodarone",severity:"severe",category:"qt",mechanism:"Nilotinib and amiodarone both prolong QT/repolarization reserve.",effect:"Avoid concomitant QT-prolonging therapy when possible; high torsades risk.",evidence:{confidence:"high",sources:["FDA label","clinical guidance"]},evidenceRefs:["ev_nilotinib_qt_cyp3a_label","ev_qt_torsades_tisdale2016"]},
  {drug1:"Dasatinib",drug2:"Omeprazole",severity:"moderate",category:"absorption",mechanism:"Gastric acid suppression reduces dasatinib solubility and absorption.",effect:"Reduced dasatinib exposure; avoid PPIs/H2 blockers or use label-directed alternatives.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_dasatinib_cyp3a_acid_label"]},
  {drug1:"Dasatinib",drug2:"Ketoconazole",severity:"severe",category:"metabolic",mechanism:"Strong CYP3A inhibition increases dasatinib exposure several-fold.",effect:"Increased myelosuppression/fluid retention/toxicity risk; avoid or reduce dose per label.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_dasatinib_cyp3a_acid_label"]},
  {drug1:"Osimertinib",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin strongly induces CYP3A pathways and markedly reduces osimertinib exposure.",effect:"Reduced EGFR inhibitor efficacy; avoid strong CYP3A inducers.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_osimertinib_cyp3a_qt_label"]},
  {drug1:"Osimertinib",drug2:"Amiodarone",severity:"moderate",category:"qt",mechanism:"Osimertinib can prolong QT; amiodarone adds long-lasting repolarization burden.",effect:"Increased QT risk; ECG/electrolyte monitoring or alternatives when feasible.",evidence:{confidence:"moderate",sources:["FDA label","clinical guidance"]},evidenceRefs:["ev_osimertinib_cyp3a_qt_label","ev_qt_torsades_tisdale2016"]},

  // ── Antiarrhythmic DDIs ──
  {drug1:"Flecainide",drug2:"Fluoxetine",severity:"severe",category:"metabolic",mechanism:"Fluoxetine is a strong CYP2D6 inhibitor; creates a pharmacological CYP2D6 PM state raising flecainide AUC 2-3×.",effect:"Proarrhythmic risk ↑↑; bradycardia, heart failure exacerbation. Monitor ECG and flecainide levels.",evidence:{confidence:"high",sources:["FDA label","literature"]},evidenceRefs:["ev_flecainide_cyp2d6_pgx"]},
  {drug1:"Flecainide",drug2:"Paroxetine",severity:"severe",category:"metabolic",mechanism:"Paroxetine is a mechanism-based CYP2D6 inhibitor; raises flecainide exposure to PM levels.",effect:"Increased proarrhythmic risk; consider flecainide level monitoring or switching SSRI.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_flecainide_cyp2d6_pgx"]},
  {drug1:"Flecainide",drug2:"Amiodarone",severity:"severe",category:"metabolic_pd",mechanism:"Amiodarone inhibits CYP2D6, raising flecainide levels. Also pharmacodynamic: additive sodium channel blockade + QT.",effect:"Flecainide AUC ↑↑; proarrhythmic risk. Reduce flecainide dose by 50% if combination unavoidable.",evidence:{confidence:"high",sources:["FDA label","literature"]},evidenceRefs:["ev_flecainide_cyp2d6_pgx"]},
  {drug1:"Propafenone",drug2:"Metoprolol",severity:"moderate",category:"metabolic_pd",mechanism:"Propafenone inhibits CYP2D6 (especially in EMs), raising metoprolol AUC 2-4×. Added pharmacodynamic beta-blockade from propafenone itself.",effect:"Excessive beta-blockade: bradycardia, AV block, hypotension. Reduce metoprolol dose.",evidence:{confidence:"high",sources:["FDA label","literature"]},evidenceRefs:["ev_propafenone_cyp2d6_pgx"]},
  {drug1:"Propafenone",drug2:"Digoxin",severity:"moderate",category:"transporter",mechanism:"Propafenone inhibits P-gp, reducing digoxin renal/GI clearance and raising plasma levels 40-85%.",effect:"Digoxin toxicity risk; reduce digoxin dose by 25-50% and monitor levels.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_propafenone_cyp2d6_pgx"]},
  {drug1:"Propafenone",drug2:"Warfarin",severity:"moderate",category:"metabolic",mechanism:"Propafenone inhibits CYP2C9, reducing S-warfarin clearance and elevating INR.",effect:"Bleeding risk ↑; check INR within 1 week of starting propafenone and adjust warfarin dose.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_propafenone_cyp2d6_pgx"]},
  {drug1:"Dronedarone",drug2:"Digoxin",severity:"severe",category:"transporter",mechanism:"Dronedarone inhibits P-gp, reducing digoxin renal secretion. Digoxin levels can double.",effect:"Digoxin toxicity (nausea, bradycardia, heart block); halve digoxin dose, monitor levels.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_dronedarone_cyp3a_pgp_label"]},
  {drug1:"Dronedarone",drug2:"Simvastatin",severity:"severe",category:"metabolic",mechanism:"Dronedarone inhibits CYP3A4 and OATP1B1, raising simvastatin acid AUC ~4×.",effect:"Rhabdomyolysis risk; avoid simvastatin >10mg or switch to pravastatin/rosuvastatin.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_dronedarone_cyp3a_pgp_label"]},
  {drug1:"Dronedarone",drug2:"Dabigatran",severity:"severe",category:"transporter",mechanism:"Dronedarone inhibits P-gp, raising dabigatran exposure 1.7-2× via reduced renal P-gp efflux.",effect:"Increased bleeding risk; reduce dabigatran dose or use alternative anticoagulant.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_dronedarone_cyp3a_pgp_label","ev_dabigatran_dronedarone_fda"]},
  {drug1:"Dronedarone",drug2:"Cyclosporine",severity:"severe",category:"metabolic",mechanism:"Both are CYP3A4 substrates; dronedarone increases cyclosporine exposure.",effect:"Nephrotoxicity risk ↑; avoid or monitor levels closely.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_dronedarone_cyp3a_pgp_label"]},
  {drug1:"Sofosbuvir",drug2:"Amiodarone",severity:"severe",category:"unknown_pd",mechanism:"Mechanism unclear but likely involves adenosine signalling modulation. Multiple cases of severe symptomatic bradycardia and sinus arrest reported.",effect:"FDA/EMA contraindication. Can occur within hours to days; cases have required pacemaker.",evidence:{confidence:"high",sources:["FDA label","FDA Drug Safety Communication 2015"]},evidenceRefs:["ev_sofosbuvir_amiodarone_bradycardia"]},
  {drug1:"Sofosbuvir",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin strongly induces P-gp and BCRP, reducing sofosbuvir AUC by ~72%.",effect:"CONTRAINDICATED — loss of HCV antiviral efficacy.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_sofosbuvir_pgp_induction"]},
  {drug1:"Sofosbuvir",drug2:"Carbamazepine",severity:"severe",category:"induction",mechanism:"Carbamazepine induces P-gp, reducing sofosbuvir absorption substantially.",effect:"Reduced HCV treatment efficacy; avoid or switch anticonvulsant.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_sofosbuvir_pgp_induction"]},
  // ── MAOI / serotonin syndrome DDIs ──
  {drug1:"Phenelzine",drug2:"Sertraline",severity:"severe",category:"serotonin",mechanism:"Irreversible MAO-A/B inhibition + SERT blockade. Serotonin catabolism abolished + reuptake prevented → serotonin storm.",effect:"CONTRAINDICATED. Potentially fatal serotonin syndrome. 14-day washout required on both sides.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_maoi_ssri_serotonin_fda"]},
  {drug1:"Phenelzine",drug2:"Fluoxetine",severity:"severe",category:"serotonin",mechanism:"Irreversible MAOI + strongest SSRI (plus CYP inhibition). Extra risk from fluoxetine's 5-week half-life.",effect:"CONTRAINDICATED. Washout: 5 weeks after fluoxetine before MAOI; 14 days after MAOI before fluoxetine.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_maoi_ssri_serotonin_fda"]},
  {drug1:"Phenelzine",drug2:"Venlafaxine",severity:"severe",category:"serotonin",mechanism:"Irreversible MAOI + SERT/NET inhibition. Dual serotonin/noradrenaline synergy.",effect:"CONTRAINDICATED. 14-day washout required.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_maoi_ssri_serotonin_fda"]},
  {drug1:"Phenelzine",drug2:"Tramadol",severity:"severe",category:"serotonin_opioid",mechanism:"MAO-A inhibition + tramadol's serotonin reuptake inhibition + weak MAOI activity of parent compound. Serotonin syndrome + seizure risk.",effect:"CONTRAINDICATED. Even single tramadol dose can be fatal with MAOI on board.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_maoi_ssri_serotonin_fda"]},
  {drug1:"Tranylcypromine",drug2:"Sertraline",severity:"severe",category:"serotonin",mechanism:"Irreversible MAOI (with stimulant properties) + SERT blockade.",effect:"CONTRAINDICATED. Fatal serotonin syndrome risk. 14-day washout each direction.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_maoi_ssri_serotonin_fda"]},
  {drug1:"Tranylcypromine",drug2:"Tyramine-rich Foods",severity:"severe",category:"diet",mechanism:"MAO-A inactivation prevents tyramine breakdown in gut → absorbed tyramine triggers massive catecholamine release.",effect:"Hypertensive crisis (BP >180 mmHg) — cheese, cured meats, fermented foods, red wine all implicated. Dietary restriction is mandatory.",evidence:{confidence:"high",sources:["FDA label","clinical guidelines"]},evidenceRefs:["ev_maoi_tyramine_fda"]},
  {drug1:"Selegiline",drug2:"Fluoxetine",severity:"severe",category:"serotonin",mechanism:"At therapeutic doses selegiline is selective MAO-B but at transdermal 9mg+ or with SSRI — MAO-A is partially inhibited and SERT is blocked.",effect:"Serotonin syndrome risk. 14-day washout selegiline before fluoxetine; 5 weeks after fluoxetine.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_selegiline_ssri_fda"]},
  {drug1:"Linezolid",drug2:"Sertraline",severity:"severe",category:"serotonin",mechanism:"Linezolid is a reversible non-selective MAO-A/B inhibitor. Combining with any serotonergic agent risks serotonin syndrome.",effect:"CONTRAINDICATED per FDA 2011 safety communication. Cases of fatal serotonin syndrome.",evidence:{confidence:"high",sources:["FDA Safety Communication 2011","FDA label"]},evidenceRefs:["ev_linezolid_serotonin_fda2011"]},
  {drug1:"Linezolid",drug2:"Venlafaxine",severity:"severe",category:"serotonin",mechanism:"MAO-A/B inhibition + SNRI serotonin/NE reuptake blockade. Additive serotonergic toxicity.",effect:"CONTRAINDICATED. Reserve linezolid for infections with no alternatives; provide intensive monitoring.",evidence:{confidence:"high",sources:["FDA Safety Communication 2011"]},evidenceRefs:["ev_linezolid_serotonin_fda2011"]},
  {drug1:"Linezolid",drug2:"Tramadol",severity:"severe",category:"serotonin_opioid",mechanism:"MAO inhibition + tramadol's serotonin reuptake inhibition. Serotonin syndrome plus seizure threshold lowering.",effect:"CONTRAINDICATED. Do not combine.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_linezolid_serotonin_fda2011"]},
  {drug1:"Methylphenidate",drug2:"Phenelzine",severity:"severe",category:"sympathomimetic_maoi",mechanism:"Methylphenidate releases and blocks reuptake of catecholamines. MAO-A/B inhibition abolishes NE/DA catabolism → hypertensive crisis.",effect:"CONTRAINDICATED. 14-day washout after MAOI before any stimulant.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_stimulant_maoi_fda"]},
  {drug1:"Methylphenidate",drug2:"Tranylcypromine",severity:"severe",category:"sympathomimetic_maoi",mechanism:"Same catecholamine storm mechanism as phenelzine.",effect:"CONTRAINDICATED.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_stimulant_maoi_fda"]},
  // ── Thioridazine QT DDIs ──
  {drug1:"Thioridazine",drug2:"Paroxetine",severity:"severe",category:"metabolic_qt",mechanism:"Paroxetine inhibits CYP2D6 → thioridazine parent accumulates → QT ↑↑↑. Independent QT effects from thioridazine also.",effect:"CONTRAINDICATED — potentially fatal QT prolongation/torsades. FDA black box.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_thioridazine_qt_cyp2d6_fda"]},
  {drug1:"Thioridazine",drug2:"Fluoxetine",severity:"severe",category:"metabolic_qt",mechanism:"Strong CYP2D6 inhibition raises thioridazine plasma levels → QTc prolongation → torsades.",effect:"CONTRAINDICATED — fatal arrhythmia risk.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_thioridazine_qt_cyp2d6_fda"]},
  {drug1:"Thioridazine",drug2:"Moxifloxacin",severity:"severe",category:"qt",mechanism:"Both prolong QTc via hERG blockade. Additive repolarization burden.",effect:"Avoid combination; very high torsades risk.",evidence:{confidence:"high",sources:["FDA label","AZCERT list"]},evidenceRefs:["ev_thioridazine_qt_cyp2d6_fda"]},
  // ── HIV/HCV booster DDIs ──
  {drug1:"Cobicistat",drug2:"Simvastatin",severity:"severe",category:"metabolic",mechanism:"Cobicistat is a strong CYP3A4 inhibitor; simvastatin AUC increases >10×.",effect:"CONTRAINDICATED — rhabdomyolysis risk. Use pravastatin or low-dose rosuvastatin.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_cobicistat_cyp3a_label"]},
  {drug1:"Cobicistat",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin strongly induces CYP3A4, abolishing cobicistat inhibitory effect and reducing boosted HIV drug exposure.",effect:"CONTRAINDICATED — loss of antiretroviral efficacy.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_cobicistat_cyp3a_label"]},
  {drug1:"Cobicistat",drug2:"Midazolam",severity:"severe",category:"metabolic",mechanism:"Strong CYP3A4 inhibition: oral midazolam AUC ↑~15×. IV midazolam less affected but still needs careful titration.",effect:"CONTRAINDICATED oral midazolam; IV midazolam only with intensive monitoring.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_cobicistat_cyp3a_label"]},
  {drug1:"Cobicistat",drug2:"Atorvastatin",severity:"moderate",category:"metabolic",mechanism:"CYP3A4 inhibition raises atorvastatin AUC ~3×; P-gp/OATP interactions add to effect.",effect:"Start at lowest atorvastatin dose (10mg); do not exceed 40mg. Monitor for myopathy.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_cobicistat_cyp3a_label"]},
  {drug1:"Atazanavir",drug2:"Omeprazole",severity:"severe",category:"absorption",mechanism:"Atazanavir requires acidic environment for absorption; PPIs reduce plasma levels by ~75%.",effect:"CONTRAINDICATED with high-dose PPIs. If needed, use omeprazole ≤20mg 12h before atazanavir (boosted only).",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_atazanavir_cyp3a_ugt1a1_label"]},
  {drug1:"Atazanavir",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin strongly induces CYP3A4, reducing atazanavir AUC by ~72%.",effect:"CONTRAINDICATED — unacceptable loss of HIV suppression.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_atazanavir_cyp3a_ugt1a1_label"]},
  {drug1:"Atazanavir",drug2:"Rosuvastatin",severity:"moderate",category:"transporter",mechanism:"Atazanavir inhibits OATP1B1/1B3, reducing rosuvastatin hepatic uptake and raising plasma levels ~3×.",effect:"Limit rosuvastatin to 10mg/day; myopathy risk.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_atazanavir_cyp3a_ugt1a1_label"]},
  // ── Oncology DDIs ──
  {drug1:"Cyclophosphamide",drug2:"Allopurinol",severity:"moderate",category:"metabolic",mechanism:"Allopurinol inhibits oxidative metabolism of cyclophosphamide, raising alkylating exposure and myelosuppression.",effect:"Increased bone marrow toxicity; consider dose reduction and CBC monitoring.",evidence:{confidence:"moderate",sources:["literature","clinical guidelines"]},evidenceRefs:["ev_cyclophosphamide_cyp2b6_label"]},
  {drug1:"Paclitaxel",drug2:"Gemfibrozil",severity:"moderate",category:"metabolic",mechanism:"Gemfibrozil is a strong CYP2C8 inhibitor; paclitaxel AUC increases significantly.",effect:"Increased neurotoxicity and myelosuppression; avoid or monitor closely.",evidence:{confidence:"moderate",sources:["literature"]},evidenceRefs:["ev_paclitaxel_cyp2c8_label"]},
  {drug1:"Docetaxel",drug2:"Ketoconazole",severity:"severe",category:"metabolic",mechanism:"Strong CYP3A4 inhibition markedly increases docetaxel AUC.",effect:"Severe myelosuppression and neurotoxicity risk; avoid strong CYP3A4 inhibitors.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_docetaxel_cyp3a4_label"]},
  {drug1:"Docetaxel",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin strongly induces CYP3A4, reducing docetaxel AUC ~4-fold.",effect:"Loss of cancer treatment efficacy; avoid strong CYP3A4 inducers.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_docetaxel_cyp3a4_label"]},
  {drug1:"Palbociclib",drug2:"Itraconazole",severity:"severe",category:"metabolic",mechanism:"Strong CYP3A4 inhibition increases palbociclib AUC by 87%.",effect:"Increased neutropenia and toxicity risk; reduce palbociclib dose from 125mg to 75mg or avoid.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_palbociclib_cyp3a_label"]},
  {drug1:"Palbociclib",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin reduces palbociclib AUC by 85% via CYP3A4 induction.",effect:"Loss of CDK4/6 inhibitor efficacy; avoid.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_palbociclib_cyp3a_label"]},
  {drug1:"Everolimus",drug2:"Ketoconazole",severity:"severe",category:"metabolic",mechanism:"Strong CYP3A4/P-gp inhibition increases everolimus AUC ~15×.",effect:"CONTRAINDICATED in most contexts; severe immunosuppression/toxicity.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_everolimus_cyp3a_pgp_label"]},
  {drug1:"Everolimus",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Strong CYP3A4 induction reduces everolimus AUC by ~90%.",effect:"CONTRAINDICATED — complete loss of mTOR inhibitor efficacy.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_everolimus_cyp3a_pgp_label"]},
  {drug1:"Erlotinib",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin induces CYP3A4 and CYP1A2, reducing erlotinib AUC by ~66%.",effect:"Reduced EGFR inhibitor efficacy; avoid strong CYP3A4/1A2 inducers.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_erlotinib_cyp3a_label"]},
  {drug1:"Erlotinib",drug2:"Ciprofloxacin",severity:"moderate",category:"metabolic",mechanism:"Ciprofloxacin inhibits CYP1A2, reducing erlotinib clearance.",effect:"Erlotinib exposure ↑ ~40%; increased rash/diarrhea risk. Monitor and consider dose reduction.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_erlotinib_cyp3a_label"]},
  {drug1:"Guanfacine",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin strongly induces CYP3A4, reducing guanfacine AUC by ~70%.",effect:"Loss of ADHD/antihypertensive efficacy; double dose or use alternative.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_guanfacine_cyp3a_label"]},
  {drug1:"Guanfacine",drug2:"Valproic Acid",severity:"moderate",category:"metabolic",mechanism:"Valproate inhibits CYP3A4 (mild-moderate), raising guanfacine AUC ~2-fold.",effect:"Excessive sedation/bradycardia; reduce guanfacine dose by 50%.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_guanfacine_cyp3a_label"]},
  {drug1:"Guanfacine",drug2:"Carbamazepine",severity:"severe",category:"induction",mechanism:"Carbamazepine is a strong CYP3A4 inducer; reduces guanfacine plasma levels substantially.",effect:"Loss of therapeutic effect; double guanfacine dose per FDA label when combined.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_guanfacine_cyp3a_label"]},
  // ── Clinician workflow batch: primary care, cardiology, psychiatry ──
  {drug1:"Buspirone",drug2:"Itraconazole",severity:"severe",category:"metabolic",mechanism:"Itraconazole strongly inhibits CYP3A4, the primary buspirone clearance pathway. Label PK data show very large buspirone exposure increases.",effect:"Marked dizziness/sedation and adverse-effect risk; avoid or use very low buspirone dose with close monitoring.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_buspirone_cyp3a_label"]},
  {drug1:"Buspirone",drug2:"Diltiazem",severity:"moderate",category:"metabolic",mechanism:"Diltiazem inhibits CYP3A4 and increases buspirone exposure several-fold.",effect:"Increased dizziness, sedation, and hypotension risk; reduce buspirone dose and monitor.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_buspirone_cyp3a_label"]},
  {drug1:"Buspirone",drug2:"Grapefruit Juice",severity:"moderate",category:"food_metabolic",mechanism:"Grapefruit inhibits intestinal CYP3A4 and markedly increases buspirone exposure.",effect:"Avoid grapefruit or use a lower buspirone dose; watch for dizziness/sedation.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_buspirone_cyp3a_label"]},
  {drug1:"Terbinafine",drug2:"Metoprolol",severity:"moderate",category:"metabolic",mechanism:"Terbinafine inhibits CYP2D6, reducing metoprolol clearance.",effect:"Increased beta-blockade: bradycardia, fatigue, dizziness, hypotension; monitor HR/BP and reduce dose if needed.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_terbinafine_cyp2d6_label"]},
  {drug1:"Terbinafine",drug2:"Nortriptyline",severity:"moderate",category:"metabolic",mechanism:"Terbinafine inhibits CYP2D6, which contributes to TCA clearance.",effect:"Increased anticholinergic/CNS/cardiac toxicity risk; consider TCA level monitoring or dose reduction.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_terbinafine_cyp2d6_label"]},
  {drug1:"Cephalexin",drug2:"Metformin",severity:"mild",category:"renal_transport",mechanism:"Cephalexin can increase metformin concentrations and reduce metformin renal clearance in label PK data.",effect:"Usually manageable; monitor for GI intolerance, hypoglycemia symptoms, or lactic-acidosis risk in renal impairment.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_cephalexin_metformin_label"]},
  {drug1:"Nitroglycerin",drug2:"Sildenafil",severity:"severe",category:"pharmacodynamic",mechanism:"Both increase cGMP-mediated vasodilation; PDE5 inhibition amplifies nitrate hypotensive effects.",effect:"CONTRAINDICATED — potentially life-threatening hypotension, syncope, or ischemia.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_nitrate_pde5_label"]},
  {drug1:"Nitroglycerin",drug2:"Tadalafil",severity:"severe",category:"pharmacodynamic",mechanism:"Tadalafil potentiates nitrate-mediated cGMP vasodilation and has a longer effect duration than sildenafil.",effect:"CONTRAINDICATED — severe hypotension risk; requires longer PDE5 washout consideration.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_nitrate_pde5_label"]},
  {drug1:"Isosorbide Mononitrate",drug2:"Sildenafil",severity:"severe",category:"pharmacodynamic",mechanism:"Long-acting nitrate plus PDE5 inhibition causes additive cGMP-mediated vasodilation.",effect:"CONTRAINDICATED — severe hypotension/syncope risk.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_nitrate_pde5_label"]},
  {drug1:"Isosorbide Mononitrate",drug2:"Tadalafil",severity:"severe",category:"pharmacodynamic",mechanism:"Long-acting nitrate plus long-acting PDE5 inhibition can cause prolonged hypotensive interaction.",effect:"CONTRAINDICATED — severe hypotension/syncope risk.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_nitrate_pde5_label"]},
  {drug1:"Sacubitril/Valsartan",drug2:"Lisinopril",severity:"severe",category:"angioedema",mechanism:"Sacubitril/neprilysin inhibition plus ACE inhibition increases bradykinin-mediated angioedema risk.",effect:"CONTRAINDICATED — separate ACE inhibitor and sacubitril/valsartan by at least 36 hours.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_sacubitril_valsartan_label"]},
  {drug1:"Sacubitril/Valsartan",drug2:"Spironolactone",severity:"moderate",category:"electrolyte",mechanism:"ARB/neprilysin inhibition plus aldosterone blockade reduces potassium excretion.",effect:"Hyperkalemia risk; monitor potassium and renal function, especially in CKD or diabetes.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_sacubitril_valsartan_label"]},
  {drug1:"Tirzepatide",drug2:"Warfarin",severity:"mild",category:"absorption",mechanism:"Tirzepatide delays gastric emptying and can alter oral drug absorption timing; warfarin has a narrow therapeutic margin.",effect:"Monitor INR after tirzepatide initiation or dose escalation if warfarin control changes.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_tirzepatide_oral_absorption_label"]},
  // ── Clinician workflow batch 2: urgent-care and specialist handoffs ──
  {drug1:"Nirmatrelvir/Ritonavir",drug2:"Simvastatin",severity:"severe",category:"metabolic",mechanism:"Ritonavir strongly inhibits CYP3A4, and simvastatin is highly CYP3A-dependent.",effect:"CONTRAINDICATED during Paxlovid treatment; hold or replace simvastatin according to local protocol to prevent severe myopathy/rhabdomyolysis.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_paxlovid_cyp3a_label"]},
  {drug1:"Nirmatrelvir/Ritonavir",drug2:"Amiodarone",severity:"severe",category:"metabolic",mechanism:"Ritonavir strongly inhibits CYP3A4/P-gp pathways that contribute to antiarrhythmic exposure; Paxlovid labeling lists serious antiarrhythmic interactions.",effect:"Avoid/contraindicated in most settings because of potentially life-threatening arrhythmia or conduction toxicity.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_paxlovid_cyp3a_label"]},
  {drug1:"Nirmatrelvir/Ritonavir",drug2:"Quetiapine",severity:"severe",category:"metabolic",mechanism:"Strong CYP3A inhibition markedly increases quetiapine exposure.",effect:"High sedation, hypotension, QT, and delirium risk; avoid or use specialist-guided major dose reduction with monitoring.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_paxlovid_cyp3a_label"]},
  {drug1:"Nirmatrelvir/Ritonavir",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin strongly induces CYP3A and can substantially reduce nirmatrelvir/ritonavir concentrations.",effect:"CONTRAINDICATED — antiviral failure and resistance risk; choose a different COVID treatment.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_paxlovid_cyp3a_label"]},
  {drug1:"Hydroxyzine",drug2:"Amiodarone",severity:"severe",category:"qtc",mechanism:"Hydroxyzine has post-marketing QT/TdP reports, and amiodarone is a high-risk QT-prolonging antiarrhythmic.",effect:"Avoid combination when possible; if unavoidable, correct electrolytes and monitor ECG/QT risk.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_hydroxyzine_qt_label"]},
  {drug1:"Hydroxyzine",drug2:"Azithromycin",severity:"moderate",category:"qtc",mechanism:"Both agents can contribute to QT prolongation, especially with cardiac disease, electrolyte disturbance, or other QT-risk medicines.",effect:"Prefer a non-QT sedating alternative or monitor QT/electrolytes in higher-risk patients.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_hydroxyzine_qt_label"]},
  {drug1:"Ivabradine",drug2:"Clarithromycin",severity:"severe",category:"metabolic",mechanism:"Clarithromycin is a strong CYP3A4 inhibitor and ivabradine is primarily cleared by CYP3A4.",effect:"CONTRAINDICATED — increased ivabradine exposure with bradycardia/conduction risk.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_ivabradine_cyp3a_label"]},
  {drug1:"Ivabradine",drug2:"Diltiazem",severity:"severe",category:"metabolic",mechanism:"Diltiazem inhibits CYP3A4 and also lowers heart rate; ivabradine exposure and bradycardia risk increase.",effect:"Avoid/contraindicated per labeling context; use a non-rate-slowing alternative when possible.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_ivabradine_cyp3a_label"]},
  {drug1:"Amoxicillin/Clavulanate",drug2:"Warfarin",severity:"moderate",category:"anticoagulation",mechanism:"Labeling reports increased prolongation of prothrombin time with oral anticoagulants during amoxicillin/clavulanate use.",effect:"Check INR more frequently during and shortly after antibiotic therapy; counsel for bleeding.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_amox_clav_warfarin_label"]},
  {drug1:"Cefuroxime",drug2:"Probenecid",severity:"moderate",category:"renal_transport",mechanism:"Probenecid inhibits renal tubular secretion and increases cefuroxime systemic exposure.",effect:"Coadministration is not recommended in labeling; consider an alternative or monitor tolerability.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_cefuroxime_probenecid_label"]},
  {drug1:"Insulin Glargine",drug2:"Metoprolol",severity:"moderate",category:"pharmacodynamic",mechanism:"Beta-blockers can blunt adrenergic warning symptoms of hypoglycemia in patients using insulin.",effect:"Hypoglycemia may be harder to recognize; reinforce glucose monitoring and patient education.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_insulin_glargine_beta_blocker_label"]},
  {drug1:"Insulin Glargine",drug2:"Tirzepatide",severity:"moderate",category:"pharmacodynamic",mechanism:"Tirzepatide improves glycemic control and can increase hypoglycemia risk when combined with insulin.",effect:"Consider insulin dose reduction and increase glucose monitoring when tirzepatide is started or escalated.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_insulin_glargine_beta_blocker_label","ev_tirzepatide_oral_absorption_label"]},
  // ── Primary-care enrichment batch: respiratory, insulin, GI OTC, hormones ──
  {drug1:"Fluticasone",drug2:"Ritonavir",severity:"severe",category:"metabolic",mechanism:"Ritonavir strongly inhibits CYP3A4, sharply increasing systemic fluticasone exposure despite inhaled/intranasal dosing.",effect:"Iatrogenic Cushing syndrome and adrenal suppression risk; avoid or switch corticosteroid when possible.",evidence:{confidence:"high",sources:["FDA label","case reports"]},evidenceRefs:["ev_ritonavir_cyp3a4_booster_label"]},
  {drug1:"Fluticasone",drug2:"Cobicistat",severity:"severe",category:"metabolic",mechanism:"Cobicistat is a strong CYP3A4 booster and can markedly increase systemic exposure to fluticasone.",effect:"Avoid combination or select a safer inhaled/intranasal steroid; monitor for adrenal suppression if unavoidable.",evidence:{confidence:"high",sources:["FDA label","case reports"]},evidenceRefs:["ev_cobicistat_cyp3a_label"]},
  {drug1:"Fluticasone",drug2:"Nirmatrelvir/Ritonavir",severity:"moderate",category:"metabolic",mechanism:"Paxlovid contains ritonavir, a strong CYP3A inhibitor, which can raise systemic fluticasone exposure during treatment.",effect:"Short-course risk is context-dependent; review temporary steroid switch/hold options and counsel for systemic steroid effects.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_paxlovid_cyp3a_label"]},
  {drug1:"Albuterol",drug2:"Propranolol",severity:"moderate",category:"pharmacodynamic",mechanism:"Nonselective beta-blockade can antagonize beta-2 bronchodilation.",effect:"Reduced rescue bronchodilator response or bronchospasm risk; prefer cardioselective beta-blocker when clinically appropriate.",evidence:{confidence:"high",sources:["FDA label"]}},
  {drug1:"Ipratropium",drug2:"Tiotropium",severity:"moderate",category:"pharmacodynamic",mechanism:"Duplicate inhaled antimuscarinic therapy adds anticholinergic burden without a clear routine benefit.",effect:"Dry mouth, urinary retention, glaucoma flare, and anticholinergic adverse effects; avoid routine SAMA/LAMA duplication unless specifically directed.",evidence:{confidence:"moderate",sources:["FDA label"]}},
  {drug1:"Senna",drug2:"Digoxin",severity:"moderate",category:"electrolyte",mechanism:"Stimulant laxative overuse can cause diarrhea and hypokalemia, increasing digoxin arrhythmia/toxicity risk.",effect:"Avoid chronic overuse; monitor potassium and digoxin toxicity symptoms in higher-risk patients.",evidence:{confidence:"moderate",sources:["clinical guidance"]}},
  {drug1:"Bisacodyl",drug2:"Digoxin",severity:"moderate",category:"electrolyte",mechanism:"Bisacodyl overuse can cause diarrhea and hypokalemia, which sensitizes patients to digoxin toxicity.",effect:"Avoid chronic overuse; monitor electrolytes and toxicity symptoms if stimulant laxatives are needed repeatedly.",evidence:{confidence:"moderate",sources:["clinical guidance"]}},
  {drug1:"Polyethylene Glycol",drug2:"Lithium",severity:"mild",category:"volume_status",mechanism:"Excessive osmotic laxative or bowel-prep use can cause diarrhea/dehydration, reducing renal lithium clearance.",effect:"Usually low risk at labeled constipation doses; maintain hydration and monitor lithium symptoms during high-dose/bowel-prep use.",evidence:{confidence:"moderate",sources:["clinical guidance"]}},
  {drug1:"Insulin Lispro",drug2:"Metoprolol",severity:"moderate",category:"pharmacodynamic",mechanism:"Beta-blockers can blunt adrenergic warning symptoms of hypoglycemia in patients using rapid-acting insulin.",effect:"Hypoglycemia may be harder to recognize; reinforce glucose monitoring and patient education.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_insulin_glargine_beta_blocker_label"]},
  {drug1:"Insulin Aspart",drug2:"Metoprolol",severity:"moderate",category:"pharmacodynamic",mechanism:"Beta-blockers can blunt adrenergic warning symptoms of hypoglycemia in patients using rapid-acting insulin.",effect:"Hypoglycemia may be harder to recognize; reinforce glucose monitoring and patient education.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_insulin_glargine_beta_blocker_label"]},
  {drug1:"Insulin Degludec",drug2:"Metoprolol",severity:"moderate",category:"pharmacodynamic",mechanism:"Beta-blockers can blunt adrenergic warning symptoms of hypoglycemia in patients using basal insulin.",effect:"Hypoglycemia may be harder to recognize; reinforce glucose monitoring and patient education.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_insulin_glargine_beta_blocker_label"]},
  {drug1:"Insulin Lispro",drug2:"Tirzepatide",severity:"moderate",category:"pharmacodynamic",mechanism:"Tirzepatide improves glycemic control and can increase hypoglycemia risk when combined with insulin.",effect:"Consider insulin dose reduction and increase glucose monitoring when tirzepatide is started or escalated.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_tirzepatide_oral_absorption_label","ev_insulin_glargine_beta_blocker_label"]},
  {drug1:"Insulin Aspart",drug2:"Tirzepatide",severity:"moderate",category:"pharmacodynamic",mechanism:"Tirzepatide improves glycemic control and can increase hypoglycemia risk when combined with insulin.",effect:"Consider insulin dose reduction and increase glucose monitoring when tirzepatide is started or escalated.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_tirzepatide_oral_absorption_label","ev_insulin_glargine_beta_blocker_label"]},
  {drug1:"Insulin Degludec",drug2:"Tirzepatide",severity:"moderate",category:"pharmacodynamic",mechanism:"Tirzepatide improves glycemic control and can increase hypoglycemia risk when combined with basal insulin.",effect:"Consider insulin dose reduction and increase glucose monitoring when tirzepatide is started or escalated.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_tirzepatide_oral_absorption_label","ev_insulin_glargine_beta_blocker_label"]},
  {drug1:"Estradiol",drug2:"Rifampin",severity:"moderate",category:"induction",mechanism:"Rifampin induces CYP3A and UGT pathways that contribute to estradiol clearance.",effect:"Reduced hormone exposure; clinical impact depends on route, dose, and indication.",evidence:{confidence:"moderate",sources:["FDA label","clinical guidance"]},evidenceRefs:["ev_rifampin_hormonal_contraception"]},
  {drug1:"Progesterone",drug2:"Rifampin",severity:"moderate",category:"induction",mechanism:"Rifampin induces CYP3A pathways involved in progesterone clearance.",effect:"Reduced progestogen exposure with possible bleeding or symptom-control loss; use route/formulation-specific guidance.",evidence:{confidence:"moderate",sources:["FDA label","clinical guidance"]},evidenceRefs:["ev_rifampin_hormonal_contraception"]},
  {drug1:"Medroxyprogesterone",drug2:"Rifampin",severity:"moderate",category:"induction",mechanism:"Rifampin induces CYP3A metabolism of progestins; magnitude is formulation-dependent.",effect:"Reduced oral progestin exposure or contraceptive concern; depot medroxyprogesterone is less clearly affected but should be reviewed.",evidence:{confidence:"moderate",sources:["FDA label","clinical guidance"]},evidenceRefs:["ev_rifampin_hormonal_contraception"]},
  // ── Clinician workflow batch 3: primary care, neurology, cardiology handoffs ──
  {drug1:"Trimethoprim/Sulfamethoxazole",drug2:"Warfarin",severity:"severe",category:"anticoagulation",mechanism:"Sulfamethoxazole/trimethoprim can prolong prothrombin time in patients receiving warfarin; CYP2C9 inhibition and illness-related factors can both raise INR.",effect:"High bleeding risk. Prefer an alternative when possible, or pre-plan close INR monitoring and warfarin adjustment.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_tmp_smx_label","ev_warfarin_abx_lane2014"]},
  {drug1:"Trimethoprim/Sulfamethoxazole",drug2:"Lisinopril",severity:"moderate",category:"electrolyte",mechanism:"Trimethoprim can reduce renal potassium excretion, and ACE inhibition also raises potassium.",effect:"Hyperkalemia risk, especially in older adults, CKD, diabetes, or high-dose TMP-SMX; check potassium/renal function or choose an alternative.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_tmp_smx_label"]},
  {drug1:"Trimethoprim/Sulfamethoxazole",drug2:"Methotrexate",severity:"severe",category:"pharmacodynamic",mechanism:"Both drugs impair folate pathways and can add renal/marrow toxicity; TMP-SMX also has transporter effects relevant to methotrexate clearance context.",effect:"Avoid when possible due to severe myelosuppression/mucositis risk; use specialist guidance if unavoidable.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_tmp_smx_label","ev_methotrexate_oat3_probenecid","ev_mtx_interactions_bannwarth1996"]},
  {drug1:"Eplerenone",drug2:"Itraconazole",severity:"severe",category:"metabolic",mechanism:"Itraconazole is a strong CYP3A inhibitor and eplerenone is predominantly metabolized by CYP3A.",effect:"CONTRAINDICATED — high eplerenone exposure and hyperkalemia risk.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_eplerenone_cyp3a_label"]},
  {drug1:"Eplerenone",drug2:"Lisinopril",severity:"moderate",category:"electrolyte",mechanism:"ACE inhibitors increase hyperkalemia risk when combined with eplerenone.",effect:"Check potassium and creatinine soon after initiation or dose changes, and avoid in high-risk renal/potassium states.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_eplerenone_cyp3a_label"]},
  {drug1:"Lacosamide",drug2:"Metoprolol",severity:"moderate",category:"cardiac_conduction",mechanism:"Lacosamide can prolong PR interval; beta-blockers can slow AV nodal conduction.",effect:"Bradycardia or AV block risk; consider ECG/heart-rate monitoring in cardiac disease or higher doses.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_lacosamide_pr_label"]},
  {drug1:"Lacosamide",drug2:"Diltiazem",severity:"moderate",category:"cardiac_conduction",mechanism:"Lacosamide PR prolongation can add to calcium-channel-blocker conduction slowing.",effect:"Monitor for dizziness, syncope, bradycardia, or AV block; consider ECG in higher-risk patients.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_lacosamide_pr_label"]},
  {drug1:"Donepezil",drug2:"Metoprolol",severity:"moderate",category:"cardiac_conduction",mechanism:"Donepezil can have vagotonic effects on sinoatrial/atrioventricular nodes, and metoprolol also lowers heart rate.",effect:"Bradycardia, syncope, or heart block risk; monitor pulse/symptoms, especially after initiation or dose escalation.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_donepezil_bradycardia_label"]},
  {drug1:"Donepezil",drug2:"Ketoconazole",severity:"moderate",category:"metabolic",mechanism:"Ketoconazole inhibits CYP3A4, one of the donepezil metabolic pathways.",effect:"Potential donepezil exposure increase with more GI, bradycardic, or cholinergic adverse effects; monitor tolerability.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_donepezil_bradycardia_label"]},
  {drug1:"Valacyclovir",drug2:"Probenecid",severity:"mild",category:"renal_transport",mechanism:"Probenecid reduces renal clearance of acyclovir, the active metabolite of valacyclovir.",effect:"Usually manageable, but monitor renal function/neurotoxicity risk in older adults or renal impairment.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_valacyclovir_probenecid_label"]},
  {drug1:"Valacyclovir",drug2:"Cimetidine",severity:"mild",category:"renal_transport",mechanism:"Cimetidine plus probenecid increases acyclovir exposure after valacyclovir dosing; cimetidine contributes renal clearance inhibition context.",effect:"Usually no dose change alone, but use caution in renal impairment or when combined with probenecid.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_valacyclovir_probenecid_label"]},
  {drug1:"Ceftriaxone",drug2:"Calcium",severity:"severe",category:"precipitation",mechanism:"Ceftriaxone can precipitate with calcium-containing IV solutions; neonates are at particular risk and labeling contraindicates the combination in neonates requiring calcium-containing IV fluids.",effect:"Neonatal contraindication. For non-neonates, follow institutional line-flush and sequential-administration protocols.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_ceftriaxone_calcium_label"]},
  // ── Clinician workflow batch 4: contraception, diuretics, dementia, antivirals ──
  {drug1:"Combined Oral Contraceptive",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin strongly induces drug-metabolizing enzymes and can reduce estrogen/progestin exposure.",effect:"Contraceptive failure risk; use non-hormonal or backup contraception during and after inducer therapy per product guidance.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_coc_label"]},
  {drug1:"Combined Oral Contraceptive",drug2:"Carbamazepine",severity:"moderate",category:"induction",mechanism:"Carbamazepine induces CYP3A and can reduce hormonal contraceptive exposure.",effect:"Breakthrough bleeding and contraceptive failure risk; use reliable backup or non-hormonal contraception.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_coc_label"]},
  {drug1:"Combined Oral Contraceptive",drug2:"Lamotrigine",severity:"moderate",category:"metabolic",mechanism:"Ethinyl estradiol-containing contraceptives induce lamotrigine glucuronidation and can reduce lamotrigine exposure by about half.",effect:"Loss of seizure or mood-stabilizing control during active-pill weeks and level rebound during pill-free week; monitor levels/clinical response.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_coc_label"]},
  {drug1:"Combined Oral Contraceptive",drug2:"St. John's Wort",severity:"moderate",category:"induction",mechanism:"St. John's Wort can induce CYP3A/P-gp and reduce hormonal contraceptive exposure.",effect:"Contraceptive failure and breakthrough bleeding risk; avoid or use reliable backup contraception.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_coc_label"]},
  {drug1:"Chlorthalidone",drug2:"Lithium",severity:"severe",category:"renal_clearance",mechanism:"Thiazide-like diuretics can reduce lithium renal clearance.",effect:"High lithium toxicity risk; avoid if possible or reduce lithium dose and monitor levels closely.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_chlorthalidone_lithium_label"]},
  {drug1:"Chlorthalidone",drug2:"Digoxin",severity:"moderate",category:"electrolyte",mechanism:"Chlorthalidone can cause hypokalemia and hypomagnesemia, which increase digoxin toxicity and arrhythmia risk.",effect:"Monitor potassium/magnesium and digoxin toxicity signs; replete electrolytes.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_chlorthalidone_lithium_label"]},
  {drug1:"Torsemide",drug2:"Lithium",severity:"severe",category:"renal_clearance",mechanism:"Loop diuretics can reduce lithium renal clearance; torsemide labeling warns of lithium toxicity risk.",effect:"Avoid when possible or monitor lithium levels and renal function closely after changes.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_torsemide_lithium_label"]},
  {drug1:"Torsemide",drug2:"Digoxin",severity:"moderate",category:"electrolyte",mechanism:"Torsemide can cause hypokalemia/hypomagnesemia, increasing digoxin arrhythmia risk.",effect:"Monitor electrolytes and digoxin toxicity; adjust diuretic/electrolyte therapy as needed.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_torsemide_lithium_label"]},
  {drug1:"Memantine",drug2:"Sodium Bicarbonate",severity:"moderate",category:"renal_ph",mechanism:"Urine alkalinization can reduce memantine renal elimination.",effect:"Increased dizziness, confusion, or CNS adverse effects; avoid sustained alkalinization or monitor response.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_memantine_urine_ph_label"]},
  {drug1:"Oseltamivir",drug2:"Probenecid",severity:"mild",category:"renal_transport",mechanism:"Probenecid reduces renal tubular secretion of oseltamivir carboxylate and approximately doubles exposure.",effect:"Usually no dose adjustment due to safety margin, but consider renal function and adverse effects.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_oseltamivir_probenecid_label"]},
  {drug1:"Acyclovir",drug2:"Probenecid",severity:"moderate",category:"renal_transport",mechanism:"Probenecid reduces acyclovir renal clearance and increases half-life/AUC, especially relevant for IV or renal-risk patients.",effect:"Monitor renal function, hydration, and neurotoxicity; dose-adjust in renal impairment.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_acyclovir_probenecid_label"]},
  // ── Medication/genotype pivot batch: practical primary-care, psychiatry, cardiology entries ──
  {drug1:"Famciclovir",drug2:"Probenecid",severity:"mild",category:"renal_transport",mechanism:"Famciclovir is converted to penciclovir, whose exposure is mainly renal-clearance dependent; probenecid-like tubular secretion inhibition can increase exposure.",effect:"Usually manageable, but monitor renal function and CNS/GI adverse effects in older adults or renal impairment.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_famciclovir_penciclovir_label"]},
  {drug1:"Cefepime",drug2:"Acyclovir",severity:"moderate",category:"renal_neurotoxicity",mechanism:"Both are renally cleared and can contribute to neurotoxicity when renal function is reduced or doses are not adjusted.",effect:"Higher encephalopathy/seizure/neurotoxicity risk in renal impairment; dose-adjust, hydrate, and monitor mental status.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_cefepime_neurotoxicity_label","ev_acyclovir_probenecid_label"]},
  {drug1:"Cefepime",drug2:"Valacyclovir",severity:"moderate",category:"renal_neurotoxicity",mechanism:"Valacyclovir forms acyclovir and cefepime is renally cleared; both can accumulate and cause CNS toxicity when renal clearance is reduced.",effect:"Monitor renal function and neurotoxicity; dose-adjust both drugs in renal impairment.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_cefepime_neurotoxicity_label","ev_valacyclovir_probenecid_label"]},
  {drug1:"Dexmethylphenidate",drug2:"Phenelzine",severity:"severe",category:"sympathomimetic_maoi",mechanism:"MAO-A/B inhibition prevents catecholamine breakdown while dexmethylphenidate increases catecholaminergic tone.",effect:"CONTRAINDICATED. Hypertensive crisis and severe sympathomimetic toxicity risk; observe MAOI washout.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_dexmethylphenidate_label","ev_stimulant_maoi_fda"]},
  {drug1:"Dexmethylphenidate",drug2:"Tranylcypromine",severity:"severe",category:"sympathomimetic_maoi",mechanism:"Irreversible MAOI plus stimulant catecholamine effects can precipitate hypertensive crisis.",effect:"CONTRAINDICATED. Avoid within 14 days of MAOI therapy.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_dexmethylphenidate_label","ev_stimulant_maoi_fda"]},
  {drug1:"Sodium Nitroprusside",drug2:"Sildenafil",severity:"severe",category:"pharmacodynamic",mechanism:"Nitroprusside releases nitric oxide and sildenafil amplifies cGMP signaling, producing additive vasodilation.",effect:"Severe hypotension/syncope risk; avoid PDE5 inhibitors with acute nitrate/nitric-oxide donor therapy.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_nitroprusside_cyanide_label","ev_nitrate_pde5_label"]},
  {drug1:"Sodium Nitroprusside",drug2:"Tadalafil",severity:"severe",category:"pharmacodynamic",mechanism:"Nitric oxide donor therapy plus long-acting PDE5 inhibition can cause prolonged additive hypotension.",effect:"CONTRAINDICATED/avoid in acute care unless specialist-directed with hemodynamic monitoring.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_nitroprusside_cyanide_label","ev_nitrate_pde5_label"]},
  {drug1:"Potassium Chloride",drug2:"Spironolactone",severity:"severe",category:"electrolyte",mechanism:"Potassium supplementation plus aldosterone antagonism reduces potassium excretion reserve.",effect:"Hyperkalemia can be life-threatening; avoid routine co-use or monitor potassium/renal function closely.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_potassium_hyperkalemia_label","ev_spironolactone_tmpsmx_antoniou2011"]},
  {drug1:"Potassium Chloride",drug2:"Eplerenone",severity:"severe",category:"electrolyte",mechanism:"Potassium supplement plus eplerenone can cause additive potassium retention.",effect:"Avoid or monitor potassium and kidney function soon after initiation or dose changes.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_potassium_hyperkalemia_label","ev_eplerenone_cyp3a_label"]},
  {drug1:"Potassium Chloride",drug2:"Lisinopril",severity:"moderate",category:"electrolyte",mechanism:"ACE inhibition lowers aldosterone-mediated potassium excretion while supplementation increases potassium load.",effect:"Hyperkalemia risk, especially with CKD, diabetes, NSAIDs, or higher supplement doses; monitor potassium.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_potassium_hyperkalemia_label"]},
  // ── Metabolite-first batch: active metabolites, toxic metabolites, recycling ──
  {drug1:"Leflunomide",drug2:"Cholestyramine",severity:"moderate",category:"metabolite_elimination",mechanism:"Leflunomide is converted to long-lived active teriflunomide. Cholestyramine interrupts enterohepatic recycling and accelerates teriflunomide elimination.",effect:"Useful for planned washout/toxicity/pregnancy-risk management, but can remove therapeutic effect if used unintentionally.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_leflunomide_teriflunomide_half_life"]},
  {drug1:"Leflunomide",drug2:"Rosuvastatin",severity:"moderate",category:"transporter",mechanism:"Active metabolite teriflunomide inhibits BCRP/OATP transporters and can raise rosuvastatin exposure.",effect:"Limit rosuvastatin dose and monitor myopathy risk according to label guidance.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_leflunomide_teriflunomide_label"]},
  {drug1:"Teriflunomide",drug2:"Rosuvastatin",severity:"moderate",category:"transporter",mechanism:"Teriflunomide inhibits BCRP/OATP transporters and raises rosuvastatin exposure.",effect:"Limit rosuvastatin dose and monitor for muscle toxicity.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_leflunomide_teriflunomide_label"]},
  {drug1:"Mycophenolate",drug2:"Cholestyramine",severity:"moderate",category:"enterohepatic_recycling",mechanism:"Mycophenolate mofetil is converted to active mycophenolic acid (MPA). MPAG can be converted back to MPA during enterohepatic recirculation; cholestyramine interrupts that cycle.",effect:"Reduced MPA exposure and possible transplant/immunosuppression failure risk; avoid unless washout is intended.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_mycophenolate_enterohepatic_label"]},
  {drug1:"Primidone",drug2:"Combined Oral Contraceptive",severity:"moderate",category:"induction",mechanism:"Primidone forms phenobarbital, a long-lived enzyme-inducing active metabolite that can reduce hormonal contraceptive exposure.",effect:"Contraceptive failure risk; use reliable backup or non-hormonal contraception.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_primidone_metabolites_label","ev_coc_label"]},
  {drug1:"Phenobarbital",drug2:"Combined Oral Contraceptive",severity:"moderate",category:"induction",mechanism:"Phenobarbital is an enzyme inducer that can reduce estrogen/progestin contraceptive exposure.",effect:"Breakthrough bleeding and contraceptive failure risk; use backup/non-hormonal contraception.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_primidone_metabolites_label","ev_coc_label"]},
  {drug1:"Phenobarbital",drug2:"Warfarin",severity:"moderate",category:"induction",mechanism:"Phenobarbital induction can increase warfarin clearance; primidone can create this pattern through phenobarbital formation.",effect:"INR may fall after initiation and rise after discontinuation; monitor INR and adjust warfarin.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_primidone_metabolites_label"]},
  // ── Correlation pass: label-backed gaps for newer oncology/antiplatelet actors ──
  {drug1:"Vorapaxar",drug2:"Ketoconazole",severity:"severe",category:"pk",mechanism:"Vorapaxar is cleared mainly by CYP3A4; strong CYP3A inhibition can raise exposure during a very long-lived antiplatelet effect.",effect:"Avoid combination because bleeding risk can persist for weeks after exposure changes.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_vorapaxar_cyp3a_label"]},
  {drug1:"Vorapaxar",drug2:"Clarithromycin",severity:"severe",category:"pk",mechanism:"Clarithromycin strongly inhibits CYP3A4 and can increase vorapaxar exposure.",effect:"Avoid combination; consider an antibacterial without strong CYP3A inhibition when possible.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_vorapaxar_cyp3a_label"]},
  {drug1:"Vorapaxar",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin strongly induces CYP3A and can lower vorapaxar exposure.",effect:"Avoid combination because antiplatelet protection may be reduced and recovery is slow after induction changes.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_vorapaxar_cyp3a_label"]},
  {drug1:"Crizotinib",drug2:"Ketoconazole",severity:"moderate",category:"pk",mechanism:"Strong CYP3A inhibition increases crizotinib exposure.",effect:"More QT prolongation, bradycardia, visual, GI, or hepatic toxicity risk; avoid strong inhibitors or monitor closely.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_crizotinib_cyp3a_label"]},
  {drug1:"Crizotinib",drug2:"Clarithromycin",severity:"severe",category:"pk_qt",mechanism:"Clarithromycin strongly inhibits CYP3A and also carries QT-risk context, while crizotinib is a CYP3A substrate with QT/bradycardia liability.",effect:"Avoid when possible; use a non-macrolide alternative or oncology-directed monitoring.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_crizotinib_cyp3a_label"]},
  {drug1:"Crizotinib",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin strongly induces CYP3A and markedly lowers crizotinib exposure.",effect:"Loss of oncologic efficacy risk; avoid strong CYP3A inducers.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_crizotinib_cyp3a_label"]},
  {drug1:"Enzalutamide",drug2:"Warfarin",severity:"severe",category:"induction",mechanism:"Enzalutamide induces CYP2C9 and can reduce exposure to CYP2C9 substrates such as warfarin.",effect:"INR may fall with thrombotic risk; avoid when possible or monitor INR closely after start/stop.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_enzalutamide_induction_label"]},
  {drug1:"Enzalutamide",drug2:"Tacrolimus",severity:"severe",category:"induction",mechanism:"Enzalutamide strongly induces CYP3A4 and can reduce tacrolimus exposure.",effect:"Transplant rejection or immunosuppression failure risk; avoid or use intensive concentration monitoring.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_enzalutamide_induction_label"]},
  {drug1:"Enzalutamide",drug2:"Apixaban",severity:"severe",category:"induction",mechanism:"Enzalutamide strongly induces CYP3A4 and can reduce exposure of CYP3A-dependent anticoagulants.",effect:"Loss of anticoagulation risk; consider an anticoagulant strategy not compromised by strong induction.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_enzalutamide_induction_label"]},
  {drug1:"Apalutamide",drug2:"Warfarin",severity:"severe",category:"induction",mechanism:"Apalutamide induces CYP2C9/CYP3A4/CYP2C19 and can lower exposure of sensitive substrates such as warfarin.",effect:"INR may fall; avoid when possible or monitor INR closely after start/stop.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_apalutamide_induction_label"]},
  {drug1:"Apalutamide",drug2:"Tacrolimus",severity:"severe",category:"induction",mechanism:"Apalutamide induction of CYP3A4 can reduce tacrolimus exposure.",effect:"Transplant rejection or immunosuppression failure risk; avoid or use intensive concentration monitoring.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_apalutamide_induction_label"]},
  {drug1:"Apalutamide",drug2:"Apixaban",severity:"severe",category:"induction",mechanism:"Apalutamide can reduce exposure of CYP3A4/P-gp/BCRP substrate medicines.",effect:"Loss of anticoagulation risk; avoid when possible or choose a strategy robust to induction.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_apalutamide_induction_label"]},
  {drug1:"Cilostazol",drug2:"Ketoconazole",severity:"moderate",category:"pk",mechanism:"Strong CYP3A inhibition increases cilostazol and active metabolite exposure.",effect:"Dose reduction is recommended; monitor headache, palpitations, tachycardia, and bleeding symptoms.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_cilostazol_cyp_inhibitor_label"]},
  {drug1:"Cilostazol",drug2:"Omeprazole",severity:"moderate",category:"pk",mechanism:"CYP2C19 inhibition increases exposure to cilostazol active metabolites.",effect:"Dose reduction is recommended with CYP2C19 inhibitors; monitor tolerability and antiplatelet adverse effects.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_cilostazol_cyp_inhibitor_label"]},
  {drug1:"Cilostazol",drug2:"Fluconazole",severity:"moderate",category:"pk",mechanism:"Fluconazole inhibits CYP2C19 and can increase cilostazol exposure.",effect:"Use reduced cilostazol dose and monitor antiplatelet and cardiovascular adverse effects.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_cilostazol_cyp_inhibitor_label"]},
  // ── Correlation pass: androgen-receptor inducers and ALK/BCRP label gaps ──
  {drug1:"Enzalutamide",drug2:"Rivaroxaban",severity:"severe",category:"induction",mechanism:"Enzalutamide strongly induces CYP3A4 and can reduce exposure of CYP3A-dependent anticoagulants.",effect:"Loss of anticoagulation risk; avoid when possible or select an anticoagulant plan not compromised by strong induction.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_enzalutamide_induction_label"]},
  {drug1:"Enzalutamide",drug2:"Dabigatran",severity:"moderate",category:"transporter_induction",mechanism:"Enzalutamide induction context can reduce exposure of transporter-dependent victim medicines; dabigatran etexilate depends on P-gp for absorption/disposition.",effect:"Possible reduced anticoagulant exposure; consider an alternative or monitor anticoagulation strategy in high-risk patients.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_enzalutamide_induction_label","ev_edoxaban_p_gp_fda"]},
  {drug1:"Enzalutamide",drug2:"Cyclosporine",severity:"severe",category:"induction",mechanism:"Enzalutamide strongly induces CYP3A4 and can lower cyclosporine exposure.",effect:"Transplant rejection or immunosuppression failure risk; avoid or use intensive trough monitoring.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_enzalutamide_induction_label"]},
  {drug1:"Enzalutamide",drug2:"Sirolimus",severity:"severe",category:"induction",mechanism:"Enzalutamide can lower exposure of CYP3A4/P-gp dependent mTOR inhibitors.",effect:"Immunosuppression failure risk; avoid or use therapeutic-drug monitoring with specialist dose adjustment.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_enzalutamide_induction_label"]},
  {drug1:"Enzalutamide",drug2:"Everolimus",severity:"severe",category:"induction",mechanism:"Enzalutamide strongly induces CYP3A4, the main everolimus clearance pathway.",effect:"Loss of oncology/transplant effect risk; avoid when possible or monitor trough/response closely.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_enzalutamide_induction_label","ev_everolimus_cyp3a_pgp_label"]},
  {drug1:"Enzalutamide",drug2:"Combined Oral Contraceptive",severity:"moderate",category:"induction",mechanism:"Enzalutamide is a strong CYP3A4 inducer and can reduce exposure of CYP3A substrate hormones.",effect:"Contraceptive failure risk; use reliable non-hormonal or backup contraception per oncology guidance.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_enzalutamide_induction_label","ev_coc_label"]},
  {drug1:"Apalutamide",drug2:"Rivaroxaban",severity:"severe",category:"induction",mechanism:"Apalutamide can reduce exposure of CYP3A4/P-gp/BCRP substrate medicines.",effect:"Loss of anticoagulation risk; avoid when possible or choose a strategy robust to induction.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_apalutamide_induction_label"]},
  {drug1:"Apalutamide",drug2:"Dabigatran",severity:"moderate",category:"transporter_induction",mechanism:"Apalutamide can reduce exposure of P-gp substrate medicines, and dabigatran etexilate is P-gp dependent.",effect:"Possible reduced anticoagulant effect; consider alternatives or specialist monitoring in high-risk patients.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_apalutamide_induction_label","ev_edoxaban_p_gp_fda"]},
  {drug1:"Apalutamide",drug2:"Cyclosporine",severity:"severe",category:"induction",mechanism:"Apalutamide induces CYP3A4 and can reduce cyclosporine exposure.",effect:"Transplant rejection or immunosuppression failure risk; avoid or use intensive trough monitoring.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_apalutamide_induction_label"]},
  {drug1:"Apalutamide",drug2:"Sirolimus",severity:"severe",category:"induction",mechanism:"Apalutamide can reduce exposure of CYP3A4/P-gp dependent mTOR inhibitors.",effect:"Immunosuppression failure risk; avoid or use therapeutic-drug monitoring with specialist dose adjustment.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_apalutamide_induction_label"]},
  {drug1:"Apalutamide",drug2:"Everolimus",severity:"severe",category:"induction",mechanism:"Apalutamide induction can lower everolimus exposure through CYP3A4/P-gp pathways.",effect:"Loss of oncology/transplant effect risk; avoid when possible or monitor trough/response closely.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_apalutamide_induction_label","ev_everolimus_cyp3a_pgp_label"]},
  {drug1:"Apalutamide",drug2:"Combined Oral Contraceptive",severity:"moderate",category:"induction",mechanism:"Apalutamide can reduce exposure of CYP3A/UGT/P-gp substrate hormones.",effect:"Contraceptive failure risk; use reliable non-hormonal or backup contraception.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_apalutamide_induction_label","ev_coc_label"]},
  {drug1:"Lorlatinib",drug2:"Rifampin",severity:"severe",category:"contraindicated_induction",mechanism:"Strong CYP3A induction with rifampin is contraindicated with lorlatinib because serious hepatotoxicity has occurred.",effect:"CONTRAINDICATED. Stop strong CYP3A inducer and allow washout before lorlatinib initiation.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_lorlatinib_cyp3a_label"]},
  {drug1:"Lorlatinib",drug2:"Tacrolimus",severity:"severe",category:"induction",mechanism:"Lorlatinib induces CYP3A and can lower exposure of narrow-therapeutic-index CYP3A substrates.",effect:"Transplant rejection risk; avoid or use intensive tacrolimus concentration monitoring.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_lorlatinib_cyp3a_label","ev_tacrolimus_cyp3a5_consensus"]},
  {drug1:"Lorlatinib",drug2:"Sirolimus",severity:"severe",category:"induction",mechanism:"Lorlatinib induction can lower exposure of CYP3A-dependent mTOR inhibitors.",effect:"Immunosuppression failure risk; avoid or use therapeutic-drug monitoring.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_lorlatinib_cyp3a_label"]},
  {drug1:"Lorlatinib",drug2:"Everolimus",severity:"severe",category:"induction",mechanism:"Lorlatinib induces CYP3A and can reduce everolimus exposure.",effect:"Loss of oncology/transplant effect risk; avoid when possible or monitor trough/response closely.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_lorlatinib_cyp3a_label","ev_everolimus_cyp3a_pgp_label"]},
  {drug1:"Lorlatinib",drug2:"Combined Oral Contraceptive",severity:"moderate",category:"induction",mechanism:"Lorlatinib induces CYP3A and can reduce exposure of CYP3A substrate hormones.",effect:"Contraceptive failure risk; use effective non-hormonal contraception during treatment and for the label-recommended period after stopping.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_lorlatinib_cyp3a_label","ev_coc_label"]},
  {drug1:"Darolutamide",drug2:"Rosuvastatin",severity:"severe",category:"transporter",mechanism:"Darolutamide inhibits BCRP/OATP transport and can markedly raise rosuvastatin exposure.",effect:"Myopathy/rhabdomyolysis risk; do not exceed low-dose rosuvastatin limits per labeling.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_darolutamide_bcrp_label","ev_rosuvastatin_label"]},
  // ── Oncology TKI batch: active metabolites, transporter victims, QT and exposure rules ──
  {drug1:"Alectinib",drug2:"Meal / Food",severity:"moderate",category:"food_active_moiety",mechanism:"Food strongly increases combined alectinib plus active M4 exposure; label dosing assumes administration with food.",effect:"Fasting administration can underexpose the active moiety; take consistently with food per oncology instructions.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_alectinib_m4_food_label"]},
  {drug1:"Brigatinib",drug2:"Itraconazole",severity:"moderate",category:"pk",mechanism:"Strong CYP3A inhibition increases brigatinib exposure.",effect:"More pulmonary, hypertensive, bradycardia, CPK, or hepatic toxicity risk; avoid or reduce dose per label.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_brigatinib_cyp3a_label"]},
  {drug1:"Brigatinib",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin strongly induces CYP3A and markedly lowers brigatinib exposure.",effect:"Loss of oncology efficacy risk; avoid strong CYP3A inducers.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_brigatinib_cyp3a_label"]},
  {drug1:"Capmatinib",drug2:"Itraconazole",severity:"moderate",category:"pk",mechanism:"Strong CYP3A inhibition increases capmatinib exposure.",effect:"More edema, hepatotoxicity, photosensitivity, or pulmonary toxicity risk; monitor closely or avoid when possible.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_capmatinib_cyp3a_transporter_label"]},
  {drug1:"Capmatinib",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin strongly induces CYP3A and markedly lowers capmatinib exposure.",effect:"Loss of MET-inhibitor efficacy risk; avoid strong/moderate CYP3A inducers.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_capmatinib_cyp3a_transporter_label"]},
  {drug1:"Capmatinib",drug2:"Digoxin",severity:"moderate",category:"transport",mechanism:"Capmatinib inhibits P-gp and can increase exposure of P-gp substrates.",effect:"Digoxin toxicity risk; monitor concentrations and clinical toxicity if combined.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_capmatinib_cyp3a_transporter_label","ev_digoxin_pgp_koren1998"]},
  {drug1:"Capmatinib",drug2:"Rosuvastatin",severity:"moderate",category:"transport",mechanism:"Capmatinib inhibits BCRP and can increase exposure of BCRP substrate medicines such as rosuvastatin.",effect:"Myopathy risk; use conservative statin dosing and monitor muscle symptoms.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_capmatinib_cyp3a_transporter_label","ev_rosuvastatin_label"]},
  {drug1:"Lenvatinib",drug2:"Amiodarone",severity:"severe",category:"qt",mechanism:"Lenvatinib can prolong QT and the label advises avoiding coadministration with drugs known to prolong QT/QTc.",effect:"Additive QT/torsades risk; avoid when possible or use ECG/electrolyte monitoring under oncology/cardiology guidance.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_lenvatinib_qt_label","ev_qt_torsades_tisdale2016"]},
  {drug1:"Lenvatinib",drug2:"Moxifloxacin",severity:"moderate",category:"qt",mechanism:"Both medicines can prolong QT, reducing repolarization reserve.",effect:"Additive QT risk; monitor ECG/electrolytes or choose a non-QT-risk antibacterial if clinically reasonable.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_lenvatinib_qt_label","ev_qt_torsades_tisdale2016"]},
  {drug1:"Sunitinib",drug2:"Ketoconazole",severity:"moderate",category:"pk_qt",mechanism:"Strong CYP3A inhibition can increase sunitinib exposure, and exposure is linked to QT and toxicity risk.",effect:"Consider dose reduction/avoidance and monitor QT, blood pressure, hepatic toxicity, and tolerability.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_sunitinib_cyp3a_qt_label"]},
  {drug1:"Sunitinib",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin strongly induces CYP3A and can reduce sunitinib exposure.",effect:"Loss of oncology efficacy risk; avoid strong CYP3A inducers or adjust per oncology label guidance.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_sunitinib_cyp3a_qt_label"]},
  {drug1:"Sunitinib",drug2:"Amiodarone",severity:"severe",category:"qt",mechanism:"Sunitinib can prolong QT in a dose-dependent manner; amiodarone adds long-lived QT-prolonging effect.",effect:"High QT/torsades concern; avoid when possible or use ECG/electrolyte monitoring with specialist oversight.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_sunitinib_cyp3a_qt_label","ev_qt_torsades_tisdale2016"]},
  {drug1:"Sorafenib",drug2:"Rifampin",severity:"moderate",category:"induction",mechanism:"Strong CYP3A induction can reduce sorafenib exposure.",effect:"Reduced oncology effect risk; avoid strong CYP3A inducers when possible.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_sorafenib_cyp_ugt_warfarin_label"]},
  {drug1:"Sorafenib",drug2:"Warfarin",severity:"moderate",category:"anticoagulation",mechanism:"Sorafenib labeling warns of increased bleeding risk and INR elevations with warfarin.",effect:"Monitor INR and bleeding closely during start/stop and dose changes.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_sorafenib_cyp_ugt_warfarin_label"]},
  {drug1:"Regorafenib",drug2:"Ketoconazole",severity:"moderate",category:"active_metabolite_shift",mechanism:"Strong CYP3A inhibition increases regorafenib parent exposure while lowering active M-2/M-5 metabolite exposure.",effect:"Net active-moiety/toxicity balance can shift; avoid strong CYP3A inhibitors when possible and monitor toxicity.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_regorafenib_cyp3a_ugt_bcrp_label"]},
  {drug1:"Regorafenib",drug2:"Rifampin",severity:"severe",category:"active_metabolite_shift",mechanism:"Strong CYP3A induction lowers regorafenib parent exposure and shifts active metabolite balance.",effect:"Reduced efficacy risk; avoid strong CYP3A inducers.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_regorafenib_cyp3a_ugt_bcrp_label"]},
  {drug1:"Regorafenib",drug2:"Rosuvastatin",severity:"moderate",category:"transport",mechanism:"Regorafenib inhibits BCRP and can increase exposure of BCRP substrate medicines.",effect:"Myopathy risk; use conservative rosuvastatin dosing and monitor muscle symptoms.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_regorafenib_cyp3a_ugt_bcrp_label","ev_rosuvastatin_label"]},
  // ── Psychiatry/VEGFR batch: practical label gaps with strong exposure signals ──
  {drug1:"Axitinib",drug2:"Ketoconazole",severity:"moderate",category:"pk",mechanism:"Strong CYP3A4/5 inhibition increases axitinib exposure.",effect:"Higher hypertension, diarrhea, hepatic, thrombotic, and VEGFR-toxicity risk; reduce axitinib dose if unavoidable per label.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_axitinib_cyp3a_label"]},
  {drug1:"Axitinib",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin strongly induces CYP3A4/5 and reduces axitinib exposure.",effect:"Loss of VEGFR inhibitor efficacy risk; avoid strong CYP3A inducers.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_axitinib_cyp3a_label"]},
  {drug1:"Lumateperone",drug2:"Ketoconazole",severity:"moderate",category:"pk",mechanism:"Strong CYP3A4 inhibition increases lumateperone exposure.",effect:"Use the lower label dose and monitor sedation, orthostasis, and EPS/tolerability.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_lumateperone_cyp3a_label"]},
  {drug1:"Lumateperone",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"CYP3A4 induction decreases lumateperone exposure.",effect:"Reduced antipsychotic/mood efficacy; avoid CYP3A inducers.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_lumateperone_cyp3a_label"]},
  {drug1:"Levomilnacipran",drug2:"Ketoconazole",severity:"moderate",category:"pk",mechanism:"Strong CYP3A4 inhibition increases levomilnacipran exposure.",effect:"Do not exceed the label maximum dose with strong CYP3A inhibitors; monitor blood pressure, heart rate, urinary hesitation, and serotonergic adverse effects.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_levomilnacipran_cyp3a_renal_label"]},
  {drug1:"Asenapine",drug2:"Fluvoxamine",severity:"moderate",category:"pk",mechanism:"Fluvoxamine inhibits CYP1A2, one of asenapine's clearance pathways.",effect:"Asenapine exposure/tolerability may increase; monitor sedation, orthostasis, EPS, and QT-risk context.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_asenapine_ugt1a4_cyp1a2_label"]},
  {drug1:"Asenapine",drug2:"Paroxetine",severity:"moderate",category:"metabolic",mechanism:"Asenapine weakly inhibits CYP2D6 and can increase exposure of CYP2D6 substrates such as paroxetine.",effect:"Monitor SSRI adverse effects and serotonergic burden, especially with other serotonergic medicines.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_asenapine_ugt1a4_cyp1a2_label","ev_paroxetine_cyp2d6_fda"]},
  // ── Exposure/bioavailability batch: chelation, acid suppression, enterohepatic recycling ──
  {drug1:"Levothyroxine",drug2:"Cholestyramine",severity:"moderate",category:"absorption_binding",mechanism:"Cholestyramine binds thyroid hormone in the gut and reduces levothyroxine absorption.",effect:"Reduced thyroid hormone exposure and possible hypothyroid breakthrough; separate dosing and re-check TSH after sustained use.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_levothyroxine_absorption_label","ev_cholestyramine_label"]},
  {drug1:"Dasatinib",drug2:"Famotidine",severity:"severe",category:"absorption",mechanism:"H2 blockade raises gastric pH and reduces dasatinib solubility; label PK data report large AUC and Cmax reductions after famotidine.",effect:"Loss of oncology efficacy risk; avoid H2 blockers/PPIs with dasatinib unless oncology-directed timing strategy is used.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_dasatinib_cyp3a_acid_label"]},
  {drug1:"Dasatinib",drug2:"Calcium",severity:"moderate",category:"absorption",mechanism:"Antacid/mineral exposure near dasatinib dosing can reduce pH-dependent absorption.",effect:"Avoid simultaneous administration; separate antacid/mineral doses from dasatinib per label timing.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_dasatinib_cyp3a_acid_label"]},
  {drug1:"Erlotinib",drug2:"Famotidine",severity:"moderate",category:"absorption",mechanism:"H2 antagonists raise gastric pH and decrease erlotinib plasma concentrations unless label timing separation is used.",effect:"Reduced EGFR TKI exposure; use label timing strategy or avoid chronic acid suppression when possible.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_erlotinib_ppi_absorption"]},
  {drug1:"Erlotinib",drug2:"Calcium",severity:"mild",category:"absorption",mechanism:"Antacid/mineral products can alter gastric pH around erlotinib dosing.",effect:"Separate antacid/mineral doses by several hours to protect erlotinib absorption.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_erlotinib_ppi_absorption"]},
  {drug1:"Mycophenolate",drug2:"Pantoprazole",severity:"moderate",category:"absorption",mechanism:"Acid suppression can reduce mycophenolate mofetil dissolution and lower active mycophenolic acid exposure.",effect:"Possible reduced immunosuppression exposure; monitor transplant context and consider formulation/level strategy.",evidence:{confidence:"moderate",sources:["clinical PK studies","FDA label"]},evidenceRefs:["ev_mycophenolate_ppi_solubility","ev_mycophenolate_enterohepatic_label"]},
  {drug1:"Ciprofloxacin",drug2:"Calcium",severity:"moderate",category:"chelation_absorption",mechanism:"Calcium and other multivalent cations chelate ciprofloxacin in the gut and reduce absorption.",effect:"Reduced antibiotic exposure and treatment-failure risk; separate ciprofloxacin from calcium/mineral products.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_fluoroquinolone_cation_absorption_label"]},
  {drug1:"Ciprofloxacin",drug2:"Iron",severity:"moderate",category:"chelation_absorption",mechanism:"Iron chelates ciprofloxacin in the GI tract and reduces absorption.",effect:"Reduced antibiotic exposure; separate ciprofloxacin from iron-containing products.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_fluoroquinolone_cation_absorption_label"]},
  {drug1:"Levofloxacin",drug2:"Calcium",severity:"moderate",category:"chelation_absorption",mechanism:"Multivalent cations including calcium can chelate levofloxacin and reduce absorption when dosed too close together.",effect:"Reduced fluoroquinolone exposure; separate from mineral products according to label timing.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_fluoroquinolone_cation_absorption_label"]},
  {drug1:"Levofloxacin",drug2:"Iron",severity:"moderate",category:"chelation_absorption",mechanism:"Iron chelates levofloxacin in the gut and reduces absorption when dosed within the interaction window.",effect:"Reduced antibiotic exposure; separate levofloxacin from iron products.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_fluoroquinolone_cation_absorption_label"]},
  {drug1:"Moxifloxacin",drug2:"Calcium",severity:"moderate",category:"chelation_absorption",mechanism:"Multivalent cation products can chelate moxifloxacin and reduce oral absorption.",effect:"Reduced moxifloxacin exposure; separate mineral/antacid products from the antibiotic dose.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_fluoroquinolone_cation_absorption_label"]},
  {drug1:"Moxifloxacin",drug2:"Iron",severity:"moderate",category:"chelation_absorption",mechanism:"Iron-containing products can chelate moxifloxacin and reduce systemic exposure.",effect:"Reduced antibiotic exposure; separate iron from moxifloxacin dosing.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_fluoroquinolone_cation_absorption_label"]},
  {drug1:"Doxycycline",drug2:"Calcium",severity:"moderate",category:"chelation_absorption",mechanism:"Calcium-containing antacids/minerals impair tetracycline absorption through chelation.",effect:"Reduced doxycycline exposure and possible treatment failure; separate dosing from calcium products.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_tetracycline_cation_absorption_label"]},
  {drug1:"Doxycycline",drug2:"Iron",severity:"moderate",category:"chelation_absorption",mechanism:"Iron-containing preparations impair doxycycline absorption through tetracycline chelation.",effect:"Reduced doxycycline exposure; separate from iron products.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_tetracycline_cation_absorption_label"]},
  {drug1:"Minocycline",drug2:"Calcium",severity:"moderate",category:"chelation_absorption",mechanism:"Calcium-containing antacids/minerals can chelate tetracycline-class antibiotics and reduce absorption.",effect:"Reduced minocycline exposure; separate dosing from calcium/mineral products.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_tetracycline_cation_absorption_label"]},
  {drug1:"Minocycline",drug2:"Iron",severity:"moderate",category:"chelation_absorption",mechanism:"Iron-containing preparations can chelate tetracycline-class antibiotics and reduce absorption.",effect:"Reduced minocycline exposure; separate dosing from iron products.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_tetracycline_cation_absorption_label"]},
  // ── Exposure/bioavailability batch 2: urinary pH and fed-state switches ──
  {drug1:"Amphetamine",drug2:"Sodium Bicarbonate",severity:"moderate",category:"renal_ph",mechanism:"Urinary/GI alkalinizing agents reduce amphetamine ionization and renal excretion, increasing blood levels.",effect:"Increased stimulant exposure and sympathomimetic adverse effects; avoid casual alkalinization and monitor BP/HR/sleep.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_amphetamine_urinary_ph_label"]},
  {drug1:"Lisdexamfetamine",drug2:"Sodium Bicarbonate",severity:"moderate",category:"renal_ph",mechanism:"Lisdexamfetamine releases d-amphetamine; urinary alkalinization can increase amphetamine blood levels after conversion.",effect:"Increased stimulant effect/toxicity risk; avoid coadministration with urinary alkalinizing agents unless clinician-directed.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_amphetamine_urinary_ph_label","ev_lisdexamfetamine_cyp2d6_fda"]},
  {drug1:"Amphetamine",drug2:"Ascorbic Acid (Vitamin C)",severity:"mild",category:"renal_ph",mechanism:"Acidifying agents can increase amphetamine urinary excretion and decrease blood levels.",effect:"Possible reduced stimulant effect; clinical impact varies by dose and urinary pH change.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_amphetamine_urinary_ph_label"]},
  {drug1:"Lisdexamfetamine",drug2:"Ascorbic Acid (Vitamin C)",severity:"mild",category:"renal_ph",mechanism:"After lisdexamfetamine conversion to d-amphetamine, acidifying agents can lower amphetamine blood levels.",effect:"Possible reduced duration or effect; avoid large unsupervised acidifying regimens if response changes.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_amphetamine_urinary_ph_label","ev_lisdexamfetamine_cyp2d6_fda"]},
  {drug1:"Lurasidone",drug2:"Meal / Food",severity:"moderate",category:"food_absorption",mechanism:"Food substantially increases lurasidone absorption; fasting administration can underexpose the patient.",effect:"Take with food per label to avoid low exposure and poor antipsychotic response.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_lurasidone_food_label"]},
  {drug1:"Atovaquone",drug2:"Meal / Food",severity:"moderate",category:"food_absorption",mechanism:"Atovaquone absorption is strongly food-dependent; fasting or poor intake can reduce exposure.",effect:"Reduced antimalarial/antiparasitic exposure and treatment-failure risk if taken without food; use food/fat-containing intake when possible.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_atovaquone_food_label"]},
  {drug1:"Nilotinib",drug2:"Meal / Food",severity:"severe",category:"food_absorption_qt",mechanism:"Food increases nilotinib exposure, which can amplify concentration-dependent QT prolongation risk.",effect:"Avoid food around nilotinib dosing according to label timing; exposure increases can be dangerous.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_nilotinib_qt_cyp3a_label"]},
  // ── Under-looked specialist batch: transplant CMV, TB/parasites, procedural antithrombotics ──
  {drug1:"Maribavir",drug2:"Valganciclovir",severity:"severe",category:"antiviral_antagonism",mechanism:"Maribavir inhibits CMV UL97 kinase, which is required to phosphorylate/activate ganciclovir formed from valganciclovir.",effect:"Reduced antiviral activity; coadministration is not recommended.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_maribavir_label"]},
  {drug1:"Maribavir",drug2:"Ganciclovir",severity:"severe",category:"antiviral_antagonism",mechanism:"Maribavir inhibits CMV UL97 kinase, reducing ganciclovir activation/phosphorylation.",effect:"Reduced antiviral activity; avoid coadministration unless specialist-directed.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_maribavir_label"]},
  {drug1:"Maribavir",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin strongly induces CYP3A and lowers maribavir exposure.",effect:"Reduced CMV virologic response; coadministration is not recommended.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_maribavir_label"]},
  {drug1:"Maribavir",drug2:"Carbamazepine",severity:"moderate",category:"induction",mechanism:"Carbamazepine induces CYP3A and lowers maribavir exposure.",effect:"Maribavir dose adjustment is required per label; monitor virologic response.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_maribavir_label"]},
  {drug1:"Maribavir",drug2:"Digoxin",severity:"moderate",category:"transport",mechanism:"Maribavir inhibits P-gp and can increase digoxin exposure.",effect:"Digoxin toxicity risk; monitor concentrations and clinical toxicity.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_maribavir_label","ev_digoxin_pgp_koren1998"]},
  {drug1:"Letermovir",drug2:"Cyclosporine",severity:"moderate",category:"transport_metabolic",mechanism:"Cyclosporine increases letermovir exposure and letermovir/cyclosporine together increase transporter/CYP interaction burden.",effect:"Letermovir dose adjustment and close immunosuppressant monitoring are required in transplant protocols.",evidence:{confidence:"high",sources:["FDA label","clinical PK study"]},evidenceRefs:["ev_letermovir_immunosuppressant_label"]},
  {drug1:"Letermovir",drug2:"Tacrolimus",severity:"moderate",category:"metabolic",mechanism:"Letermovir inhibits CYP3A and can increase tacrolimus exposure.",effect:"Tacrolimus troughs can rise; monitor concentrations and adjust dose after start/stop.",evidence:{confidence:"high",sources:["FDA label","clinical PK study"]},evidenceRefs:["ev_letermovir_immunosuppressant_label","ev_tacrolimus_cyp3a5_consensus"]},
  {drug1:"Letermovir",drug2:"Sirolimus",severity:"moderate",category:"metabolic",mechanism:"Letermovir inhibits CYP3A/P-gp pathways relevant to sirolimus exposure.",effect:"Sirolimus troughs may increase; monitor and adjust dose.",evidence:{confidence:"high",sources:["FDA label","clinical PK study"]},evidenceRefs:["ev_letermovir_immunosuppressant_label"]},
  {drug1:"Letermovir",drug2:"Rosuvastatin",severity:"moderate",category:"transporter",mechanism:"Letermovir inhibits OATP transporters and can raise statin exposure; risk is higher with cyclosporine context.",effect:"Myopathy risk; use label dose limits and monitor muscle symptoms.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_letermovir_immunosuppressant_label","ev_rosuvastatin_label"]},
  {drug1:"Valganciclovir",drug2:"Zidovudine",severity:"moderate",category:"myelosuppression",mechanism:"Both drugs can suppress bone marrow, especially neutrophils and anemia reserve.",effect:"Additive hematologic toxicity; monitor CBC and consider alternatives in high-risk patients.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_valganciclovir_label"]},
  {drug1:"Bedaquiline",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin strongly induces CYP3A4, the main bedaquiline clearance pathway.",effect:"Reduced bedaquiline exposure and MDR-TB treatment failure risk; avoid strong CYP3A inducers.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_bedaquiline_label"]},
  {drug1:"Bedaquiline",drug2:"Ketoconazole",severity:"moderate",category:"metabolic_qt",mechanism:"Strong CYP3A inhibition can increase bedaquiline exposure during a very long half-life and QT-risk treatment.",effect:"More hepatotoxicity/QT risk; avoid prolonged strong CYP3A inhibition or monitor closely.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_bedaquiline_label"]},
  {drug1:"Bedaquiline",drug2:"Moxifloxacin",severity:"severe",category:"qt",mechanism:"Both agents can prolong QT, reducing repolarization reserve in MDR-TB regimens.",effect:"High QT/torsades concern; monitor ECG/electrolytes and use specialist TB guidance.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_bedaquiline_label","ev_qt_torsades_tisdale2016"]},
  {drug1:"Bedaquiline",drug2:"Delamanid",severity:"moderate",category:"qt",mechanism:"Both MDR-TB agents can prolong QT.",effect:"Additive QT risk; use ECG and electrolyte monitoring when combined in specialist regimens.",evidence:{confidence:"moderate",sources:["FDA label","clinical guidance"]},evidenceRefs:["ev_bedaquiline_label"]},
  {drug1:"Rifapentine",drug2:"Combined Oral Contraceptive",severity:"moderate",category:"induction",mechanism:"Rifapentine induces CYP/transport pathways and can reduce hormonal contraceptive exposure.",effect:"Contraceptive failure risk; use reliable backup or nonhormonal contraception.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_rifapentine_label","ev_coc_label"]},
  {drug1:"Rifapentine",drug2:"Tacrolimus",severity:"severe",category:"induction",mechanism:"Rifapentine is a rifamycin inducer and can lower tacrolimus exposure.",effect:"Transplant rejection risk; avoid or use intensive trough monitoring and specialist adjustment.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_rifapentine_label","ev_tacrolimus_cyp3a5_consensus"]},
  {drug1:"Praziquantel",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin induces CYP3A and can markedly reduce praziquantel exposure.",effect:"Antiparasitic treatment failure risk; avoid combination and consider washout before praziquantel.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_praziquantel_label"]},
  {drug1:"Atovaquone",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin reduces atovaquone concentrations.",effect:"Treatment or prophylaxis failure risk; coadministration is not recommended.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_atovaquone_interactions_label","ev_atovaquone_food_label"]},
  {drug1:"Atovaquone",drug2:"Rifabutin",severity:"moderate",category:"induction",mechanism:"Rifabutin reduces atovaquone concentrations.",effect:"Reduced antiparasitic/antimalarial exposure; avoid when possible or monitor response.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_atovaquone_interactions_label"]},
  {drug1:"Atovaquone",drug2:"Doxycycline",severity:"moderate",category:"absorption_exposure",mechanism:"Tetracycline-class coadministration has been associated with lower atovaquone plasma concentrations.",effect:"Reduced atovaquone exposure; monitor parasitemia/clinical response or choose an alternative.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_atovaquone_interactions_label"]},
  {drug1:"Atovaquone",drug2:"Metoclopramide",severity:"moderate",category:"absorption_exposure",mechanism:"Metoclopramide has been associated with reduced atovaquone bioavailability.",effect:"Reduced antimalarial/antiparasitic exposure; use another antiemetic when possible or monitor response closely.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_malarone_label","ev_atovaquone_interactions_label"]},
  {drug1:"Albendazole",drug2:"Dexamethasone",severity:"moderate",category:"active_metabolite_exposure",mechanism:"Dexamethasone can increase steady-state trough concentrations of active albendazole sulfoxide.",effect:"Higher active-metabolite exposure; monitor liver enzymes/CBC during prolonged or high-risk courses.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_albendazole_active_sulfoxide_label"]},
  {drug1:"Albendazole",drug2:"Praziquantel",severity:"moderate",category:"active_metabolite_exposure",mechanism:"Praziquantel can increase albendazole sulfoxide Cmax and AUC in the fed state.",effect:"Higher active-metabolite exposure; useful in some parasite regimens but monitor toxicity in prolonged therapy.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_albendazole_active_sulfoxide_label"]},
  {drug1:"Albendazole",drug2:"Cimetidine",severity:"moderate",category:"active_metabolite_exposure",mechanism:"Cimetidine can increase albendazole sulfoxide concentrations in bile and cystic fluid.",effect:"Higher active-metabolite exposure; monitor adverse effects and liver/CBC markers in extended courses.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_albendazole_active_sulfoxide_label"]},
  {drug1:"Griseofulvin",drug2:"Warfarin",severity:"moderate",category:"induction",mechanism:"Griseofulvin can reduce warfarin anticoagulant response through enzyme induction and altered clearance.",effect:"INR may fall during therapy and rise after stopping; monitor INR and adjust warfarin as needed.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_griseofulvin_induction_label"]},
  {drug1:"Griseofulvin",drug2:"Combined Oral Contraceptive",severity:"moderate",category:"induction",mechanism:"Griseofulvin can reduce hormonal contraceptive effect.",effect:"Breakthrough bleeding or contraceptive failure risk; use reliable backup/non-hormonal contraception during therapy.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_griseofulvin_induction_label","ev_coc_label"]},
  {drug1:"Griseofulvin",drug2:"Alcohol (Ethanol)",severity:"moderate",category:"intolerance",mechanism:"Griseofulvin labeling describes alcohol potentiation/intolerance reactions.",effect:"Avoid alcohol during therapy; flushing, tachycardia, or severe discomfort can occur.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_griseofulvin_induction_label"]},
  {drug1:"Fondaparinux",drug2:"Aspirin",severity:"moderate",category:"bleeding",mechanism:"Fondaparinux anticoagulation plus aspirin antiplatelet effect increases bleeding risk.",effect:"Additive bleeding risk; use only with clear indication and monitor.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_fondaparinux_bleeding_label"]},
  {drug1:"Fondaparinux",drug2:"Clopidogrel",severity:"moderate",category:"bleeding",mechanism:"Fondaparinux plus P2Y12 platelet inhibition increases bleeding risk.",effect:"Additive bleeding risk; monitor closely in ACS/procedural contexts.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_fondaparinux_bleeding_label"]},
  {drug1:"Eptifibatide",drug2:"Heparin",severity:"severe",category:"procedural_bleeding",mechanism:"GP IIb/IIIa platelet inhibition plus anticoagulation increases procedural bleeding risk.",effect:"Major bleeding/thrombocytopenia risk; use protocolized dosing and monitoring.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_gpiibiiia_bleeding_label"]},
  {drug1:"Tirofiban",drug2:"Heparin",severity:"severe",category:"procedural_bleeding",mechanism:"GP IIb/IIIa platelet inhibition plus anticoagulation increases bleeding risk.",effect:"Major bleeding risk; use renal/protocol dose adjustment and monitoring.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_gpiibiiia_bleeding_label"]},
  {drug1:"Abciximab",drug2:"Heparin",severity:"severe",category:"procedural_bleeding",mechanism:"Abciximab causes potent platelet inhibition and heparin adds anticoagulation.",effect:"Major procedural bleeding risk; protocolized anticoagulation and platelet monitoring required.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_gpiibiiia_bleeding_label"]},
  // ── Blind-spot closure batch: HIV, PARP/HDAC oncology, renal transport, prodrugs ──
  {drug1:"Darunavir",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin strongly induces CYP3A/P-gp and can sharply reduce boosted darunavir exposure.",effect:"Contraindicated/avoid. Loss of HIV virologic suppression and resistance risk.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_darunavir_boosted_cyp3a_label"]},
  {drug1:"Darunavir",drug2:"Simvastatin",severity:"severe",category:"pk",mechanism:"Boosted darunavir inhibits CYP3A/P-gp while simvastatin is a high first-pass CYP3A substrate.",effect:"Contraindicated/avoid because myopathy/rhabdomyolysis risk can be severe; use a safer statin plan.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_darunavir_boosted_cyp3a_label"]},
  {drug1:"Darunavir",drug2:"Midazolam",severity:"severe",category:"pk_sedation",mechanism:"Boosted darunavir can markedly raise orally administered CYP3A benzodiazepine exposure.",effect:"Excess/prolonged sedation and respiratory depression risk; avoid oral midazolam or use specialist procedural monitoring.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_darunavir_boosted_cyp3a_label"]},
  {drug1:"Rilpivirine",drug2:"Pantoprazole",severity:"severe",category:"absorption",mechanism:"Rilpivirine absorption is gastric-acid dependent; PPIs raise gastric pH and reduce rilpivirine exposure.",effect:"Contraindicated/avoid because antiviral failure and resistance can occur.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_rilpivirine_acid_cyp3a_qt_label"]},
  {drug1:"Rilpivirine",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin strongly induces CYP3A4, rilpivirine's main clearance pathway.",effect:"Contraindicated/avoid; marked rilpivirine exposure loss can cause HIV treatment failure.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_rilpivirine_acid_cyp3a_qt_label"]},
  {drug1:"Rilpivirine",drug2:"Carbamazepine",severity:"severe",category:"induction",mechanism:"Carbamazepine induces CYP3A4 and can reduce rilpivirine concentrations.",effect:"Contraindicated/avoid due to virologic failure and resistance risk.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_rilpivirine_acid_cyp3a_qt_label"]},
  {drug1:"Rilpivirine",drug2:"Amiodarone",severity:"moderate",category:"qt",mechanism:"Rilpivirine has dose/exposure-related QT concern and amiodarone has long-lived QT-prolonging effect.",effect:"Additive QT risk; avoid in high-risk patients or monitor ECG/electrolytes under HIV/cardiology guidance.",evidence:{confidence:"moderate",sources:["FDA label","clinical review"]},evidenceRefs:["ev_rilpivirine_acid_cyp3a_qt_label","ev_qt_torsades_tisdale2016"]},
  {drug1:"Bictegravir",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin induces both CYP3A and UGT1A1 pathways relevant to bictegravir exposure.",effect:"Contraindicated/not recommended; reduced bictegravir exposure can cause antiviral failure.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_bictegravir_cation_induction_label"]},
  {drug1:"Bictegravir",drug2:"Calcium",severity:"moderate",category:"chelation_absorption",mechanism:"Polyvalent cations can bind integrase inhibitors in the gut and reduce bictegravir absorption when timing/food instructions are not followed.",effect:"Separate or administer according to label timing/food instructions to protect HIV regimen exposure.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_bictegravir_cation_induction_label"]},
  {drug1:"Bictegravir",drug2:"Iron",severity:"moderate",category:"chelation_absorption",mechanism:"Iron can chelate bictegravir and lower absorption if taken together incorrectly.",effect:"Use label timing/food strategy; treatment failure risk matters when mineral use is chronic.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_bictegravir_cation_induction_label"]},
  {drug1:"Tenofovir Alafenamide",drug2:"Rifampin",severity:"severe",category:"transporter_induction",mechanism:"Rifampin induces P-gp/BCRP and can reduce tenofovir alafenamide prodrug exposure before intracellular activation.",effect:"Avoid/not recommended; reduced tenofovir diphosphate delivery may compromise the antiviral backbone.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_taf_pgp_induction_label"]},
  {drug1:"Tenofovir Alafenamide",drug2:"Carbamazepine",severity:"moderate",category:"transporter_induction",mechanism:"Carbamazepine induces P-gp and can lower tenofovir alafenamide exposure.",effect:"Avoid when possible or use HIV-specialist regimen selection because chronic exposure loss can matter.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_taf_pgp_induction_label"]},
  {drug1:"Lamivudine",drug2:"Trimethoprim/Sulfamethoxazole",severity:"moderate",category:"renal_transport",mechanism:"Trimethoprim can increase lamivudine exposure through renal tubular transport/clearance effects.",effect:"Usually manageable, but monitor renal function and adverse effects in CKD, older adults, or high-dose TMP-SMX.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_lamivudine_renal_transport_label"]},
  {drug1:"Flucytosine",drug2:"Amphotericin B",severity:"severe",category:"renal_toxicity",mechanism:"Amphotericin-related nephrotoxicity can reduce flucytosine renal clearance, raising concentration-dependent marrow/GI/hepatic toxicity.",effect:"Use therapeutic-drug monitoring and renal adjustment; toxicity can be serious in cryptococcal induction regimens.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_flucytosine_amphotericin_label"]},
  {drug1:"Olaparib",drug2:"Ketoconazole",severity:"moderate",category:"pk",mechanism:"Olaparib is a CYP3A substrate and strong CYP3A inhibitors increase exposure.",effect:"Avoid when possible or reduce olaparib dose per label; monitor myelosuppression/GI toxicity.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_olaparib_cyp3a_label"]},
  {drug1:"Olaparib",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin strongly induces CYP3A and can markedly reduce olaparib exposure.",effect:"Avoid strong CYP3A inducers because oncology efficacy may be compromised.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_olaparib_cyp3a_label"]},
  {drug1:"Rucaparib",drug2:"Warfarin",severity:"moderate",category:"pk_anticoagulation",mechanism:"Rucaparib inhibits CYP2C9 and can increase exposure of sensitive CYP2C9 substrates such as warfarin.",effect:"INR/bleeding risk may rise; monitor INR closely after start/stop or choose another anticoagulation plan.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_rucaparib_cyp_substrate_label"]},
  {drug1:"Rucaparib",drug2:"Caffeine",severity:"moderate",category:"pk",mechanism:"Rucaparib inhibits CYP1A2 and can increase exposure to sensitive CYP1A2 substrates.",effect:"Caffeine adverse effects may increase; more important for narrow-index CYP1A2 substrates.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_rucaparib_cyp_substrate_label"]},
  {drug1:"Talazoparib",drug2:"Amiodarone",severity:"moderate",category:"transport",mechanism:"Talazoparib is a P-gp/BCRP substrate and amiodarone can inhibit P-gp, increasing exposure.",effect:"More myelosuppression/fatigue risk; monitor CBC and tolerability, especially with renal impairment.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_parp_transporter_myelosuppression_label"]},
  {drug1:"Romidepsin",drug2:"Ketoconazole",severity:"moderate",category:"pk",mechanism:"Romidepsin is primarily metabolized by CYP3A4; strong inhibitors can raise exposure.",effect:"Higher myelosuppression, infection, ECG, and GI toxicity risk; avoid or monitor closely.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_romidepsin_cyp3a_qt_warfarin_label"]},
  {drug1:"Romidepsin",drug2:"Warfarin",severity:"moderate",category:"anticoagulation",mechanism:"Romidepsin labeling reports PT/INR prolongation with warfarin-class anticoagulants.",effect:"Monitor PT/INR more frequently during start/stop and dose changes.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_romidepsin_cyp3a_qt_warfarin_label"]},
  {drug1:"Romidepsin",drug2:"Amiodarone",severity:"severe",category:"qt",mechanism:"Romidepsin has ECG/QT context and amiodarone adds potent long-lived QT prolongation.",effect:"Avoid when possible or use oncology/cardiology ECG and electrolyte monitoring.",evidence:{confidence:"high",sources:["FDA label","clinical review"]},evidenceRefs:["ev_romidepsin_cyp3a_qt_warfarin_label","ev_qt_torsades_tisdale2016"]},
  {drug1:"Abiraterone",drug2:"Metoprolol",severity:"moderate",category:"pk",mechanism:"Abiraterone inhibits CYP2D6 and can increase metoprolol exposure.",effect:"Monitor bradycardia, hypotension, fatigue, and falls; dose-adjust beta-blocker if needed.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_abiraterone_cyp2d6_cyp2c8_label"]},
  {drug1:"Abiraterone",drug2:"Warfarin",severity:"moderate",category:"electrolyte_anticoagulation",mechanism:"Abiraterone can cause mineralocorticoid effects, hepatic injury, and potassium/BP changes that complicate anticoagulation risk context.",effect:"Monitor blood pressure, potassium, liver tests, INR/bleeding risk in complex oncology patients.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_abiraterone_cyp2d6_cyp2c8_label"]},
  {drug1:"Clorazepate",drug2:"Fluconazole",severity:"moderate",category:"active_metabolite_clearance",mechanism:"Clorazepate forms long-lived nordiazepam; fluconazole inhibits CYP2C19/3A pathways involved in benzodiazepine active-metabolite clearance.",effect:"Prolonged sedation, falls, and cognitive impairment risk; use lower-risk benzodiazepine if possible.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_clorazepate_nordiazepam_label"]},
  {drug1:"Midodrine",drug2:"Droxidopa",severity:"severe",category:"pressor",mechanism:"Midodrine forms alpha-1 agonist desglymidodrine while droxidopa forms norepinephrine; both raise pressor tone.",effect:"Supine hypertension and hypertensive crisis risk; avoid routine co-use unless specialist-directed with BP monitoring.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_midodrine_desglymidodrine_label","ev_droxidopa_norepinephrine_label"]},
  {drug1:"Droxidopa",drug2:"Phenelzine",severity:"severe",category:"pressor_maoi",mechanism:"Droxidopa increases norepinephrine availability while MAO inhibition reduces catecholamine breakdown.",effect:"Hypertensive crisis risk; avoid coadministration or use specialist autonomic/psychiatric guidance.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_droxidopa_norepinephrine_label"]},
  {drug1:"Midodrine",drug2:"Phenelzine",severity:"severe",category:"pressor_maoi",mechanism:"MAOI therapy can amplify pressor responses while midodrine's active metabolite is an alpha-1 agonist.",effect:"Avoid when possible; if unavoidable, use intensive BP monitoring and specialist oversight.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_midodrine_desglymidodrine_label"]},
  {drug1:"Nitazoxanide",drug2:"Warfarin",severity:"mild",category:"protein_binding",mechanism:"Active tizoxanide is highly protein bound; label context suggests caution with other highly protein-bound narrow-index medicines.",effect:"Clinical impact is uncertain; monitor INR if starting/stopping in a fragile warfarin patient.",evidence:{confidence:"low",sources:["FDA label"]},evidenceRefs:["ev_nitazoxanide_tizoxanide_label"]},
  {drug1:"Dipyridamole",drug2:"Aspirin",severity:"moderate",category:"bleeding",mechanism:"Dipyridamole adds antiplatelet/vasodilator effect to aspirin platelet inhibition.",effect:"Combination can be intentional, but bleeding/headache/hypotension risk should be recognized.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_dipyridamole_antiplatelet_label"]},
  {drug1:"Dipyridamole",drug2:"Warfarin",severity:"moderate",category:"bleeding",mechanism:"Antiplatelet effect plus anticoagulation can increase bleeding risk.",effect:"Monitor bleeding and INR context; use only with a clear indication.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_dipyridamole_antiplatelet_label"]},
  {drug1:"Argatroban",drug2:"Aspirin",severity:"moderate",category:"bleeding",mechanism:"Direct thrombin inhibition plus aspirin platelet inhibition increases bleeding risk.",effect:"Combination can be intentional in ACS/procedural contexts, but bleeding monitoring is essential.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_argatroban_bleeding_label"]},
  {drug1:"Argatroban",drug2:"Clopidogrel",severity:"moderate",category:"bleeding",mechanism:"Argatroban anticoagulation plus P2Y12 platelet inhibition reduces hemostatic reserve.",effect:"Additive bleeding risk; monitor closely and use protocolized dosing in HIT/ACS contexts.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_argatroban_bleeding_label"]},
  {drug1:"Argatroban",drug2:"Warfarin",severity:"moderate",category:"anticoagulation_transition",mechanism:"Argatroban and warfarin overlap may be clinically intended during transition, but argatroban prolongs INR and complicates interpretation.",effect:"Use label/protocol INR strategy during transition; bleeding risk rises with overlapping anticoagulation.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_argatroban_bleeding_label"]},
  {drug1:"Artemether/Lumefantrine",drug2:"Rifampin",severity:"severe",category:"induction",mechanism:"Rifampin induces CYP3A4 and can reduce artemether/lumefantrine exposure.",effect:"Antimalarial treatment failure risk; avoid strong CYP3A inducers.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_artemether_lumefantrine_cyp3a_qt_label"]},
  {drug1:"Artemether/Lumefantrine",drug2:"Ketoconazole",severity:"moderate",category:"pk_qt",mechanism:"Strong CYP3A inhibition can increase artemether/lumefantrine exposure while the regimen has QT context.",effect:"Monitor tolerability and ECG risk factors; avoid unnecessary strong CYP3A inhibition during treatment.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_artemether_lumefantrine_cyp3a_qt_label"]},
  {drug1:"Artemether/Lumefantrine",drug2:"Amiodarone",severity:"severe",category:"qt",mechanism:"Lumefantrine has QT-prolongation context and amiodarone adds long-lived QT risk.",effect:"Avoid combination when possible; use malaria-specialist alternative and ECG/electrolyte monitoring if unavoidable.",evidence:{confidence:"high",sources:["FDA label","clinical review"]},evidenceRefs:["ev_artemether_lumefantrine_cyp3a_qt_label","ev_qt_torsades_tisdale2016"]},
  // ── CABG / cardiac surgery perioperative enrichment batch ──
  {drug1:"Protamine Sulfate",drug2:"Heparin",severity:"moderate",category:"intentional_reversal",mechanism:"Protamine complexes with unfractionated heparin and neutralizes anticoagulant activity after cardiopulmonary bypass.",effect:"Intentional reversal, but excess protamine can cause anticoagulant effect, hypotension, pulmonary hypertension, or anaphylactoid reactions; dose to heparin exposure and ACT/protocol.",evidence:{confidence:"high",sources:["FDA label","cardiac surgery guidance"]},evidenceRefs:["ev_cabg_perioperative_medications"]},
  {drug1:"Tranexamic Acid",drug2:"Combined Oral Contraceptive",severity:"severe",category:"thrombosis",mechanism:"Antifibrinolysis plus estrogen/progestin thrombosis risk can reduce fibrinolytic reserve.",effect:"Avoid/contraindicated in many label contexts; use specialist risk assessment if antifibrinolysis is essential.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_cabg_perioperative_medications"]},
  {drug1:"Aminocaproic Acid",drug2:"Combined Oral Contraceptive",severity:"moderate",category:"thrombosis",mechanism:"Antifibrinolysis can add to prothrombotic risk contexts such as estrogen-containing contraception.",effect:"Assess thrombosis risk and alternatives; cardiac-surgery use is protocolized and time-limited.",evidence:{confidence:"moderate",sources:["FDA label","clinical guidance"]},evidenceRefs:["ev_cabg_perioperative_medications"]},
  {drug1:"Tranexamic Acid",drug2:"Warfarin",severity:"moderate",category:"hemostasis_balance",mechanism:"Antifibrinolysis can oppose bleeding while warfarin reduces clotting-factor activity; the clinical issue is competing thrombosis/bleeding goals rather than CYP metabolism.",effect:"Use only with clear procedural indication and monitor for thrombosis/bleeding according to surgical protocol.",evidence:{confidence:"moderate",sources:["clinical guidance"]},evidenceRefs:["ev_cabg_perioperative_medications"]},
  {drug1:"Norepinephrine",drug2:"Phenelzine",severity:"severe",category:"pressor_maoi",mechanism:"MAO inhibition reduces catecholamine breakdown while norepinephrine directly increases alpha/beta adrenergic tone.",effect:"Hypertensive crisis/arrhythmia risk; avoid unless emergency ICU use with invasive monitoring.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_cabg_perioperative_medications"]},
  {drug1:"Epinephrine",drug2:"Phenelzine",severity:"severe",category:"pressor_maoi",mechanism:"MAOI therapy can amplify epinephrine's alpha/beta adrenergic effects.",effect:"Severe hypertension, tachyarrhythmia, or ischemia risk; emergency use requires close monitoring.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_cabg_perioperative_medications"]},
  {drug1:"Phenylephrine",drug2:"Phenelzine",severity:"severe",category:"pressor_maoi",mechanism:"MAOI therapy can amplify alpha-1 pressor responses to phenylephrine.",effect:"Hypertensive crisis or reflex bradycardia risk; avoid nonessential use and monitor closely if required.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_cabg_perioperative_medications"]},
  {drug1:"Dopamine",drug2:"Phenelzine",severity:"severe",category:"pressor_maoi",mechanism:"MAO inhibition can amplify dopamine/catecholamine pressor and chronotropic effects.",effect:"Hypertension and tachyarrhythmia risk; avoid unless emergency monitored care.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_cabg_perioperative_medications"]},
  {drug1:"Dobutamine",drug2:"Metoprolol",severity:"moderate",category:"pharmacodynamic_antagonism",mechanism:"Beta-blockade can blunt dobutamine's beta-1 inotropic/chronotropic response.",effect:"Reduced inotrope response or need for alternative/additional hemodynamic support; manage with ICU/cardiac anesthesia protocol.",evidence:{confidence:"moderate",sources:["clinical pharmacology"]},evidenceRefs:["ev_cabg_perioperative_medications"]},
  {drug1:"Dobutamine",drug2:"Propranolol",severity:"moderate",category:"pharmacodynamic_antagonism",mechanism:"Nonselective beta-blockade can blunt dobutamine response and leave alpha effects less balanced.",effect:"Reduced inotropic effect and possible hemodynamic unpredictability; use specialist monitoring.",evidence:{confidence:"moderate",sources:["clinical pharmacology"]},evidenceRefs:["ev_cabg_perioperative_medications"]},
  {drug1:"Milrinone",drug2:"Nitroglycerin",severity:"moderate",category:"hypotension",mechanism:"Milrinone inodilation and nitrate vasodilation can add to reduce vascular tone and filling pressures.",effect:"Hypotension risk; titrate with invasive monitoring in cardiac ICU/OR settings.",evidence:{confidence:"moderate",sources:["clinical pharmacology"]},evidenceRefs:["ev_cabg_perioperative_medications"]},
  {drug1:"Milrinone",drug2:"Furosemide",severity:"moderate",category:"electrolyte_arrhythmia",mechanism:"Furosemide can lower potassium/magnesium while milrinone can increase ventricular arrhythmia susceptibility.",effect:"Monitor potassium, magnesium, renal function, and rhythm closely in post-bypass low-output states.",evidence:{confidence:"moderate",sources:["FDA label","clinical guidance"]},evidenceRefs:["ev_cabg_perioperative_medications"]},
  {drug1:"Norepinephrine",drug2:"Midodrine",severity:"moderate",category:"pressor",mechanism:"IV catecholamine vasopressor plus oral alpha-1 agonist can add vasoconstriction/afterload.",effect:"May be intentional during ICU weaning, but monitor hypertension, ischemia, and bradycardia.",evidence:{confidence:"moderate",sources:["clinical guidance"]},evidenceRefs:["ev_midodrine_desglymidodrine_label","ev_cabg_perioperative_medications"]},
  {drug1:"Vasopressin",drug2:"Norepinephrine",severity:"moderate",category:"pressor_combination",mechanism:"V1 vasoconstriction plus alpha-adrenergic vasoconstriction increases vascular tone through separate pathways.",effect:"Can be intentional for vasoplegia, but excessive vasoconstriction/ischemia risk requires protocolized titration.",evidence:{confidence:"moderate",sources:["cardiac surgery guidance"]},evidenceRefs:["ev_cabg_perioperative_medications"]},
  {drug1:"Calcium Chloride",drug2:"Digoxin",severity:"severe",category:"calcium_digoxin",mechanism:"Rapid IV calcium can increase myocardial excitability in digoxin toxicity or high-risk digoxin states.",effect:"Avoid rapid IV calcium in suspected digoxin toxicity unless specialist-directed/resuscitative indication; monitor rhythm.",evidence:{confidence:"moderate",sources:["clinical toxicology","FDA label"]},evidenceRefs:["ev_cabg_perioperative_medications"]},
  {drug1:"Calcium Gluconate",drug2:"Digoxin",severity:"moderate",category:"calcium_digoxin",mechanism:"IV calcium can increase myocardial excitability in digoxin toxicity contexts; gluconate delivers calcium more slowly than calcium chloride.",effect:"Use caution in digoxin toxicity/high digoxin levels; monitor ECG and clinical context.",evidence:{confidence:"moderate",sources:["clinical toxicology","FDA label"]},evidenceRefs:["ev_cabg_perioperative_medications"]},
  {drug1:"Magnesium Sulfate",drug2:"Rocuronium",severity:"moderate",category:"neuromuscular_blockade",mechanism:"Magnesium can potentiate nondepolarizing neuromuscular blockade.",effect:"Prolonged paralysis/ventilation risk; monitor train-of-four and reversal response.",evidence:{confidence:"moderate",sources:["anesthesia pharmacology"]},evidenceRefs:["ev_cabg_perioperative_medications"]},
  // ── ICU/sepsis/shock enrichment batch ──
  {drug1:"Piperacillin/Tazobactam",drug2:"Vancomycin",severity:"moderate",category:"nephrotoxicity",mechanism:"The vancomycin plus piperacillin/tazobactam combination is associated with higher acute kidney injury signals than several alternative beta-lactam pairings.",effect:"Monitor creatinine and vancomycin exposure closely; consider cefepime/meropenem alternatives when clinically appropriate.",evidence:{confidence:"moderate",sources:["clinical studies","ICU guidance"]},evidenceRefs:["ev_icu_sepsis_shock_workflow"]},
  {drug1:"Meropenem",drug2:"Valproic Acid",severity:"severe",category:"active_level_loss",mechanism:"Carbapenems can rapidly and profoundly lower valproate concentrations, likely by interrupting enterohepatic recycling and glucuronide hydrolysis.",effect:"Breakthrough seizure risk; avoid combination or use non-valproate antiseizure strategy with specialist input.",evidence:{confidence:"high",sources:["FDA label","clinical pharmacology"]},evidenceRefs:["ev_icu_sepsis_shock_workflow"]},
  {drug1:"Dexmedetomidine",drug2:"Metoprolol",severity:"moderate",category:"bradycardia_hypotension",mechanism:"Alpha-2 sympatholysis plus beta-blockade can add bradycardia and hypotension.",effect:"Monitor heart rate/BP and reduce/titrate sedative or beta-blocker in ICU settings.",evidence:{confidence:"moderate",sources:["FDA label","PADIS guidance"]},evidenceRefs:["ev_icu_sepsis_shock_workflow"]},
  {drug1:"Dexmedetomidine",drug2:"Propofol",severity:"moderate",category:"sedation_hemodynamics",mechanism:"Both agents can lower sympathetic tone and blood pressure while producing sedation.",effect:"Additive hypotension/bradycardia/deep sedation risk; titrate to sedation target and hemodynamics.",evidence:{confidence:"moderate",sources:["FDA label","PADIS guidance"]},evidenceRefs:["ev_icu_sepsis_shock_workflow"]},
  {drug1:"Dexmedetomidine",drug2:"Fentanyl",severity:"moderate",category:"sedation_respiratory",mechanism:"Sedation and vagotonic/bradycardic effects can add with opioid analgesia.",effect:"Monitor sedation depth, respiratory status, heart rate, and BP.",evidence:{confidence:"moderate",sources:["FDA label","ICU sedation guidance"]},evidenceRefs:["ev_icu_sepsis_shock_workflow"]},
  {drug1:"Cisatracurium",drug2:"Magnesium Sulfate",severity:"moderate",category:"neuromuscular_blockade",mechanism:"Magnesium can potentiate nondepolarizing neuromuscular blockade.",effect:"Prolonged paralysis/ventilator dependence risk; monitor train-of-four and recovery.",evidence:{confidence:"moderate",sources:["SCCM NMBA guidance","anesthesia pharmacology"]},evidenceRefs:["ev_icu_sepsis_shock_workflow"]},
  {drug1:"Vecuronium",drug2:"Magnesium Sulfate",severity:"moderate",category:"neuromuscular_blockade",mechanism:"Magnesium can potentiate vecuronium neuromuscular blockade, and renal/hepatic dysfunction can further prolong effect.",effect:"Monitor train-of-four and avoid unrecognized prolonged paralysis.",evidence:{confidence:"moderate",sources:["SCCM NMBA guidance","anesthesia pharmacology"]},evidenceRefs:["ev_icu_sepsis_shock_workflow"]},
  {drug1:"Vecuronium",drug2:"Sugammadex",severity:"mild",category:"intentional_reversal",mechanism:"Sugammadex encapsulates aminosteroid neuromuscular blockers including vecuronium.",effect:"Intentional reversal; renal dysfunction can prolong sugammadex-complex exposure and hormonal contraception counseling applies.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_sugammadex_rocuronium_reversal","ev_icu_sepsis_shock_workflow"]},
  {drug1:"Hydrocortisone",drug2:"Furosemide",severity:"moderate",category:"electrolyte",mechanism:"Glucocorticoid/mineralocorticoid activity plus loop diuresis can increase potassium loss.",effect:"Hypokalemia can worsen arrhythmia risk in shock/ICU patients; monitor potassium and magnesium.",evidence:{confidence:"moderate",sources:["clinical pharmacology","sepsis guidance"]},evidenceRefs:["ev_icu_sepsis_shock_workflow"]},
  {drug1:"Sodium Chloride 0.9%",drug2:"Sodium Bicarbonate",severity:"mild",category:"sodium_acid_base_load",mechanism:"Both can add sodium load and affect chloride/acid-base balance during resuscitation.",effect:"Usually protocol-managed; monitor sodium, chloride, bicarbonate, pH, and fluid balance in ICU resuscitation.",evidence:{confidence:"moderate",sources:["sepsis guidance"]},evidenceRefs:["ev_icu_sepsis_shock_workflow"]},
  {drug1:"Albumin Human",drug2:"Phenytoin",severity:"moderate",category:"protein_binding_interpretation",mechanism:"Critical illness and albumin administration/low albumin states can make total phenytoin concentrations misleading because free phenytoin is the active exposure.",effect:"Use free phenytoin or albumin-adjusted interpretation in ICU patients.",evidence:{confidence:"moderate",sources:["clinical pharmacology"]},evidenceRefs:["ev_icu_sepsis_shock_workflow"]},
  {drug1:"Lactated Ringer's Solution",drug2:"Ceftriaxone",severity:"mild",category:"line_compatibility",mechanism:"Lactated Ringer's contains calcium; ceftriaxone-calcium precipitation is contraindicated in neonates and line-compatibility guidance matters by age/protocol.",effect:"Adult sequential administration is often protocolized; avoid unsafe co-infusion and follow line-flush guidance.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_ceftriaxone_calcium_label","ev_icu_sepsis_shock_workflow"]},
  // ── Stroke / thrombolysis / neurocritical care enrichment batch ──
  {drug1:"Alteplase",drug2:"Warfarin",severity:"severe",category:"thrombolysis_bleeding",mechanism:"Thrombolysis plus therapeutic anticoagulation can overwhelm hemostasis and sharply increases intracranial/systemic bleeding risk.",effect:"Usually contraindicated for acute stroke thrombolysis when anticoagulation thresholds are not met; use stroke protocol and labs.",evidence:{confidence:"high",sources:["FDA label","AHA/ASA stroke guideline"]},evidenceRefs:["ev_stroke_neurocritical_workflow"]},
  {drug1:"Alteplase",drug2:"Apixaban",severity:"severe",category:"thrombolysis_bleeding",mechanism:"Recent factor Xa inhibition plus fibrinolysis increases intracranial and major bleeding risk.",effect:"Avoid thrombolysis unless guideline-defined timing/lab/reversal criteria are satisfied by stroke specialists.",evidence:{confidence:"high",sources:["stroke guideline","FDA label"]},evidenceRefs:["ev_stroke_neurocritical_workflow"]},
  {drug1:"Alteplase",drug2:"Rivaroxaban",severity:"severe",category:"thrombolysis_bleeding",mechanism:"Recent factor Xa inhibition plus fibrinolysis increases intracranial and major bleeding risk.",effect:"Avoid thrombolysis unless guideline-defined timing/lab/reversal criteria are satisfied by stroke specialists.",evidence:{confidence:"high",sources:["stroke guideline","FDA label"]},evidenceRefs:["ev_stroke_neurocritical_workflow"]},
  {drug1:"Tenecteplase",drug2:"Warfarin",severity:"severe",category:"thrombolysis_bleeding",mechanism:"Bolus thrombolysis plus anticoagulation increases intracranial and systemic hemorrhage risk.",effect:"Use strict stroke/STEMI thrombolysis eligibility and anticoagulation thresholds.",evidence:{confidence:"high",sources:["FDA label","stroke guideline"]},evidenceRefs:["ev_stroke_neurocritical_workflow"]},
  {drug1:"Tenecteplase",drug2:"Apixaban",severity:"severe",category:"thrombolysis_bleeding",mechanism:"Factor Xa anticoagulant effect can persist into the thrombolysis window and add to fibrinolytic bleeding.",effect:"Avoid unless specialist protocol confirms eligibility; consider reversal/alternative reperfusion pathways where appropriate.",evidence:{confidence:"high",sources:["stroke guideline","FDA label"]},evidenceRefs:["ev_stroke_neurocritical_workflow"]},
  {drug1:"Tenecteplase",drug2:"Rivaroxaban",severity:"severe",category:"thrombolysis_bleeding",mechanism:"Factor Xa anticoagulant effect can persist into the thrombolysis window and add to fibrinolytic bleeding.",effect:"Avoid unless specialist protocol confirms eligibility; consider reversal/alternative reperfusion pathways where appropriate.",evidence:{confidence:"high",sources:["stroke guideline","FDA label"]},evidenceRefs:["ev_stroke_neurocritical_workflow"]},
  {drug1:"Andexanet Alfa",drug2:"Apixaban",severity:"moderate",category:"intentional_reversal",mechanism:"Andexanet alfa binds and sequesters factor Xa inhibitors, reducing anti-Xa activity.",effect:"Intentional reversal for life-threatening/uncontrolled bleeding; monitor for thrombosis and plan anticoagulation restart.",evidence:{confidence:"high",sources:["FDA label","ICH guideline"]},evidenceRefs:["ev_stroke_neurocritical_workflow"]},
  {drug1:"Andexanet Alfa",drug2:"Rivaroxaban",severity:"moderate",category:"intentional_reversal",mechanism:"Andexanet alfa binds and sequesters factor Xa inhibitors, reducing anti-Xa activity.",effect:"Intentional reversal for life-threatening/uncontrolled bleeding; monitor for thrombosis and plan anticoagulation restart.",evidence:{confidence:"high",sources:["FDA label","ICH guideline"]},evidenceRefs:["ev_stroke_neurocritical_workflow"]},
  {drug1:"Idarucizumab",drug2:"Dabigatran",severity:"moderate",category:"intentional_reversal",mechanism:"Idarucizumab binds dabigatran and neutralizes anticoagulant activity.",effect:"Intentional reversal for life-threatening bleeding or urgent procedure; reassess thrombosis risk after reversal.",evidence:{confidence:"high",sources:["FDA label","ICH guideline"]},evidenceRefs:["ev_stroke_neurocritical_workflow"]},
  {drug1:"Four-Factor Prothrombin Complex Concentrate",drug2:"Warfarin",severity:"moderate",category:"intentional_reversal",mechanism:"4F-PCC replaces vitamin K-dependent clotting factors depleted by warfarin.",effect:"Intentional urgent reversal; pair with vitamin K for sustained INR correction and monitor thrombosis risk.",evidence:{confidence:"high",sources:["FDA label","ICH guideline"]},evidenceRefs:["ev_stroke_neurocritical_workflow"]},
  {drug1:"Vitamin K",drug2:"Warfarin",severity:"moderate",category:"intentional_reversal",mechanism:"Vitamin K restores hepatic production of vitamin K-dependent clotting factors and opposes warfarin effect.",effect:"Intentional reversal; delayed onset compared with PCC, and later warfarin re-initiation may be harder.",evidence:{confidence:"high",sources:["FDA label","ICH guideline"]},evidenceRefs:["ev_warfarin_cyp2c9_vkorc1_cyp4f2_cpic2017","ev_stroke_neurocritical_workflow"]},
  {drug1:"Desmopressin",drug2:"Hydrochlorothiazide",severity:"severe",category:"hyponatremia",mechanism:"Desmopressin increases water retention while thiazides impair dilution and increase hyponatremia risk.",effect:"Avoid or monitor sodium very closely; seizures/coma can occur with severe hyponatremia.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_stroke_neurocritical_workflow"]},
  {drug1:"Desmopressin",drug2:"Sertraline",severity:"moderate",category:"hyponatremia",mechanism:"SSRI-associated SIADH tendency can add to desmopressin water retention.",effect:"Monitor sodium and neurologic symptoms, especially in older adults or acute neurologic illness.",evidence:{confidence:"moderate",sources:["FDA label","clinical pharmacology"]},evidenceRefs:["ev_stroke_neurocritical_workflow"]},
  {drug1:"Mannitol",drug2:"Furosemide",severity:"moderate",category:"osmotic_diuresis",mechanism:"Osmotic diuresis plus loop diuresis can amplify volume depletion, electrolyte shifts, and renal stress.",effect:"Monitor osmolality/osmolar gap, sodium, potassium, renal function, and hemodynamics in neurocritical care.",evidence:{confidence:"moderate",sources:["FDA label","neurocritical guideline"]},evidenceRefs:["ev_stroke_neurocritical_workflow"]},
  {drug1:"Hypertonic Saline 3%",drug2:"Sodium Bicarbonate",severity:"moderate",category:"sodium_osmolar_load",mechanism:"Both therapies add sodium load and can shift osmolality and acid-base status.",effect:"Monitor sodium correction rate, chloride/bicarbonate, osmolality, fluid balance, and neurologic status.",evidence:{confidence:"moderate",sources:["neurocritical guideline"]},evidenceRefs:["ev_stroke_neurocritical_workflow"]},
  {drug1:"Fosphenytoin",drug2:"Amiodarone",severity:"moderate",category:"cardiac_conduction_pk",mechanism:"Fosphenytoin converts to phenytoin, which has infusion-related cardiac risk and CYP interactions; amiodarone can raise phenytoin exposure and adds conduction/QT context.",effect:"Monitor ECG, blood pressure, and phenytoin levels/free levels during loading and maintenance.",evidence:{confidence:"moderate",sources:["FDA label","clinical pharmacology"]},evidenceRefs:["ev_stroke_neurocritical_workflow"]},
  // ── Dialysis / advanced CKD enrichment batch ──
  {drug1:"Sevelamer",drug2:"Levothyroxine",severity:"moderate",category:"binding_absorption",mechanism:"Sevelamer can bind levothyroxine in the gut and reduce thyroid hormone absorption.",effect:"Separate dosing and monitor TSH after binder changes; hypothyroidism can emerge slowly.",evidence:{confidence:"high",sources:["FDA label","CKD medication stewardship"]},evidenceRefs:["ev_dialysis_advanced_ckd_workflow"]},
  {drug1:"Sevelamer",drug2:"Ciprofloxacin",severity:"moderate",category:"binding_absorption",mechanism:"Sevelamer can reduce oral fluoroquinolone absorption through GI binding.",effect:"Separate administration or use non-oral/alternative antibiotic strategy when reliable exposure is critical.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_dialysis_advanced_ckd_workflow","ev_fluoroquinolone_cation_absorption_label"]},
  {drug1:"Lanthanum Carbonate",drug2:"Levofloxacin",severity:"moderate",category:"chelation_absorption",mechanism:"Lanthanum can bind quinolones and reduce absorption.",effect:"Separate dosing per label/protocol; treatment failure risk matters for serious infections.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_dialysis_advanced_ckd_workflow","ev_fluoroquinolone_cation_absorption_label"]},
  {drug1:"Calcium Acetate",drug2:"Levothyroxine",severity:"moderate",category:"chelation_absorption",mechanism:"Calcium salts can bind levothyroxine and reduce absorption.",effect:"Separate dosing and monitor TSH after starting/stopping calcium binder therapy.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_dialysis_advanced_ckd_workflow","ev_levothyroxine_absorption_label"]},
  {drug1:"Calcium Acetate",drug2:"Calcitriol",severity:"moderate",category:"hypercalcemia",mechanism:"Calcium-based phosphate binding plus active vitamin D can raise calcium absorption/exposure.",effect:"Monitor calcium, phosphate, PTH, and calcification risk; adjust binder or vitamin D analog.",evidence:{confidence:"high",sources:["FDA label","CKD-MBD guidance"]},evidenceRefs:["ev_dialysis_advanced_ckd_workflow"]},
  {drug1:"Calcitriol",drug2:"Hydrochlorothiazide",severity:"moderate",category:"hypercalcemia",mechanism:"Thiazides reduce urinary calcium excretion while calcitriol increases calcium absorption.",effect:"Monitor calcium and symptoms; avoid stacking hypercalcemia risks in CKD.",evidence:{confidence:"moderate",sources:["FDA label","clinical pharmacology"]},evidenceRefs:["ev_dialysis_advanced_ckd_workflow"]},
  {drug1:"Patiromer",drug2:"Levothyroxine",severity:"moderate",category:"binding_absorption",mechanism:"Patiromer can bind coadministered oral drugs and reduce absorption if not separated.",effect:"Separate administration and monitor TSH when binder therapy changes.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_dialysis_advanced_ckd_workflow"]},
  {drug1:"Patiromer",drug2:"Ciprofloxacin",severity:"moderate",category:"binding_absorption",mechanism:"Patiromer can bind selected oral medications in vitro; fluoroquinolone exposure is timing-sensitive.",effect:"Separate dosing or choose an administration route/agent that protects antibiotic exposure.",evidence:{confidence:"moderate",sources:["FDA label","clinical pharmacology"]},evidenceRefs:["ev_dialysis_advanced_ckd_workflow","ev_fluoroquinolone_cation_absorption_label"]},
  {drug1:"Sodium Zirconium Cyclosilicate",drug2:"Tacrolimus",severity:"moderate",category:"absorption_tdm",mechanism:"Sodium zirconium cyclosilicate can transiently alter gastric pH and may change absorption of pH-sensitive oral drugs; tacrolimus is narrow-index and TDM-guided.",effect:"Separate dosing when clinically prudent and monitor tacrolimus troughs around binder changes.",evidence:{confidence:"moderate",sources:["FDA label","transplant pharmacology"]},evidenceRefs:["ev_dialysis_advanced_ckd_workflow","ev_tacrolimus_cyp3a5_consensus"]},
  {drug1:"Sodium Zirconium Cyclosilicate",drug2:"Lisinopril",severity:"moderate",category:"hyperkalemia_management",mechanism:"Potassium binder therapy may be intentionally used to manage ACE-inhibitor-associated hyperkalemia, but sodium load/edema and renal function still require monitoring.",effect:"Combination can preserve RAAS therapy in CKD/HF, but monitor potassium, edema, BP, and renal function.",evidence:{confidence:"moderate",sources:["KDIGO guidance","FDA label"]},evidenceRefs:["ev_dialysis_advanced_ckd_workflow"]},
  {drug1:"Sodium Polystyrene Sulfonate",drug2:"Phenytoin",severity:"moderate",category:"binding_absorption",mechanism:"Sodium polystyrene sulfonate can bind oral drugs in the gut and reduce absorption; phenytoin is narrow-index.",effect:"Separate administration and monitor seizure control/free or total phenytoin levels when binder use changes.",evidence:{confidence:"moderate",sources:["FDA label"]},evidenceRefs:["ev_dialysis_advanced_ckd_workflow"]},
  {drug1:"Sodium Polystyrene Sulfonate",drug2:"Warfarin",severity:"moderate",category:"binding_absorption_anticoagulation",mechanism:"Sodium polystyrene sulfonate can bind oral drugs and may reduce warfarin absorption if coadministered.",effect:"Separate dosing and monitor INR after starting/stopping resin therapy.",evidence:{confidence:"moderate",sources:["FDA label","clinical pharmacology"]},evidenceRefs:["ev_dialysis_advanced_ckd_workflow"]},
  {drug1:"Epoetin Alfa",drug2:"Iron Sucrose",severity:"mild",category:"intentional_anemia_support",mechanism:"ESA response depends on adequate iron availability; IV iron repletion can improve erythropoietic response.",effect:"Intentional CKD anemia pairing; monitor hemoglobin trajectory, ferritin/TSAT, BP, and infusion reactions.",evidence:{confidence:"high",sources:["CKD anemia guideline","FDA label"]},evidenceRefs:["ev_dialysis_advanced_ckd_workflow"]},
  {drug1:"Darbepoetin Alfa",drug2:"Iron Sucrose",severity:"mild",category:"intentional_anemia_support",mechanism:"Long-acting ESA response depends on adequate iron stores.",effect:"Intentional CKD anemia pairing; monitor hemoglobin, iron indices, BP, and thrombosis risk.",evidence:{confidence:"high",sources:["CKD anemia guideline","FDA label"]},evidenceRefs:["ev_dialysis_advanced_ckd_workflow"]},
  {drug1:"Cinacalcet",drug2:"Calcitriol",severity:"moderate",category:"calcium_pth_balance",mechanism:"Cinacalcet lowers calcium/PTH while calcitriol raises calcium absorption and suppresses PTH through a different pathway.",effect:"Combination can be intentional in CKD-MBD but requires calcium/phosphate/PTH monitoring to avoid hypo- or hypercalcemia.",evidence:{confidence:"moderate",sources:["CKD-MBD guidance","FDA label"]},evidenceRefs:["ev_cinacalcet_cyp2d6_label","ev_dialysis_advanced_ckd_workflow"]},
  // ── Pregnancy / obstetric emergency enrichment batch ──
  {drug1:"Pregnancy / Trying to Conceive",drug2:"Isotretinoin",severity:"severe",category:"pregnancy_teratogenicity",mechanism:"Isotretinoin is a known human teratogen with strict pregnancy-prevention requirements.",effect:"Contraindicated in pregnancy. Stop/avoid and arrange urgent obstetric/teratology counseling for exposure.",evidence:{confidence:"high",sources:["FDA REMS","FDA label","teratology guidance"]},evidenceRefs:["ev_pregnancy_obstetric_workflow"]},
  {drug1:"Pregnancy / Trying to Conceive",drug2:"Acitretin",severity:"severe",category:"pregnancy_teratogenicity",mechanism:"Acitretin is a systemic retinoid with prolonged teratogenic risk, especially with alcohol-related etretinate formation.",effect:"Contraindicated in pregnancy and for prolonged post-treatment conception windows; specialist counseling required.",evidence:{confidence:"high",sources:["FDA label","teratology guidance"]},evidenceRefs:["ev_pregnancy_obstetric_workflow"]},
  {drug1:"Pregnancy / Trying to Conceive",drug2:"Methotrexate",severity:"severe",category:"pregnancy_teratogenicity_abortifacient",mechanism:"Methotrexate is an antifolate with abortifacient and teratogenic effects.",effect:"Contraindicated outside intended pregnancy-termination/ectopic protocols; urgent specialist review for exposure.",evidence:{confidence:"high",sources:["ACOG guidance","FDA label"]},evidenceRefs:["ev_pregnancy_obstetric_workflow"]},
  {drug1:"Pregnancy / Trying to Conceive",drug2:"Mycophenolate",severity:"severe",category:"pregnancy_teratogenicity",mechanism:"Mycophenolate exposure is associated with miscarriage and congenital malformation risk.",effect:"Avoid/replace before conception when possible; transplant/rheumatology plus obstetric specialist review required.",evidence:{confidence:"high",sources:["FDA label","ACOG guidance"]},evidenceRefs:["ev_pregnancy_obstetric_workflow"]},
  {drug1:"Pregnancy / Trying to Conceive",drug2:"Warfarin",severity:"severe",category:"pregnancy_fetal_anticoagulation",mechanism:"Warfarin crosses the placenta and can cause fetal bleeding and warfarin embryopathy, with risk depending on timing/dose.",effect:"Usually avoid in pregnancy unless highly specialized indication; use maternal-fetal medicine/cardiology anticoagulation plan.",evidence:{confidence:"high",sources:["ACOG/AHA guidance","FDA label"]},evidenceRefs:["ev_pregnancy_obstetric_workflow","ev_warfarin_cyp2c9_vkorc1_cyp4f2_cpic2017"]},
  {drug1:"Pregnancy / Trying to Conceive",drug2:"Valproic Acid",severity:"severe",category:"pregnancy_teratogenicity_neurodevelopment",mechanism:"Valproate exposure in pregnancy is associated with major congenital malformations and neurodevelopmental risk.",effect:"Avoid when possible, especially for non-epilepsy indications; specialist seizure/psychiatry plan needed before conception.",evidence:{confidence:"high",sources:["FDA label","teratology guidance"]},evidenceRefs:["ev_pregnancy_obstetric_workflow"]},
  {drug1:"Pregnancy / Trying to Conceive",drug2:"Lisinopril",severity:"severe",category:"pregnancy_fetotoxicity",mechanism:"ACE inhibitors can cause fetal renal injury/oligohydramnios and neonatal morbidity, especially later in pregnancy.",effect:"Stop/replace when pregnancy is recognized unless specialist-directed; assess fetal/renal context.",evidence:{confidence:"high",sources:["FDA label","obstetric guidance"]},evidenceRefs:["ev_pregnancy_obstetric_workflow"]},
  {drug1:"Pregnancy / Trying to Conceive",drug2:"Losartan",severity:"severe",category:"pregnancy_fetotoxicity",mechanism:"ARBs can impair fetal renal function and cause oligohydramnios/fetal harm.",effect:"Stop/replace when pregnancy is recognized unless specialist-directed; obstetric review required.",evidence:{confidence:"high",sources:["FDA label","obstetric guidance"]},evidenceRefs:["ev_pregnancy_obstetric_workflow"]},
  {drug1:"Pregnancy / Trying to Conceive",drug2:"Leflunomide",severity:"severe",category:"pregnancy_teratogenicity_washout",mechanism:"Leflunomide forms long-lived teriflunomide with teratogenic concern and enterohepatic recirculation.",effect:"Use accelerated elimination/washout and specialist counseling when pregnancy is planned or exposure occurs.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_leflunomide_teriflunomide_half_life","ev_pregnancy_obstetric_workflow"]},
  {drug1:"Oxytocin",drug2:"Misoprostol",severity:"moderate",category:"uterotonic_stacking",mechanism:"Both increase uterine contractility through different pathways.",effect:"May be intentional by protocol, but monitor tachysystole, uterine tone, fetal status, and hemorrhage response.",evidence:{confidence:"high",sources:["ACOG guidance","FDA label"]},evidenceRefs:["ev_pregnancy_obstetric_workflow"]},
  {drug1:"Oxytocin",drug2:"Methylergonovine",severity:"moderate",category:"uterotonic_hemodynamics",mechanism:"Additive uterotonic effect plus methylergonovine vasoconstriction/hypertension risk.",effect:"Intentional postpartum hemorrhage escalation may occur; avoid methylergonovine in hypertension/preeclampsia contexts and monitor BP.",evidence:{confidence:"high",sources:["obstetric guidance","FDA label"]},evidenceRefs:["ev_pregnancy_obstetric_workflow"]},
  {drug1:"Oxytocin",drug2:"Carboprost",severity:"moderate",category:"uterotonic_stacking",mechanism:"Additive uterotonic effect can help postpartum hemorrhage but increases adverse-effect monitoring needs.",effect:"Use protocolized PPH escalation; monitor uterine tone, bleeding, GI effects, bronchospasm risk, and hemodynamics.",evidence:{confidence:"high",sources:["obstetric guidance","FDA label"]},evidenceRefs:["ev_pregnancy_obstetric_workflow"]},
  {drug1:"Magnesium Sulfate",drug2:"Nifedipine",severity:"moderate",category:"hypotension_neuromuscular",mechanism:"Magnesium can add vasodilation/neuromuscular effects while nifedipine lowers vascular tone.",effect:"Often used in obstetric care with monitoring; watch hypotension, weakness, respiratory status, and reflexes.",evidence:{confidence:"moderate",sources:["ACOG guidance","clinical pharmacology"]},evidenceRefs:["ev_pregnancy_obstetric_workflow"]},
  {drug1:"Magnesium Sulfate",drug2:"Calcium Gluconate",severity:"mild",category:"intentional_antidote",mechanism:"IV calcium physiologically antagonizes severe magnesium toxicity at the neuromuscular/cardiac level.",effect:"Intentional antidote context; do not interpret as routine co-therapy. Use emergency protocol and monitoring.",evidence:{confidence:"high",sources:["obstetric guidance","FDA label"]},evidenceRefs:["ev_pregnancy_obstetric_workflow","ev_cabg_perioperative_medications"]},
  {drug1:"Methylergonovine",drug2:"Norepinephrine",severity:"severe",category:"pressor_vasospasm",mechanism:"Ergot vasoconstriction plus catecholamine vasopressor tone can amplify hypertension, ischemia, and vasospasm.",effect:"Avoid nonessential overlap; if hemorrhagic shock requires pressors, use obstetric/anesthesia protocol-level monitoring.",evidence:{confidence:"moderate",sources:["FDA label","obstetric anesthesia pharmacology"]},evidenceRefs:["ev_pregnancy_obstetric_workflow"]},
  {drug1:"Methylergonovine",drug2:"Ketoconazole",severity:"severe",category:"cyp3a_vasospasm",mechanism:"Strong CYP3A inhibition can increase ergot exposure and vasospasm/ischemia risk.",effect:"Avoid combination; use alternative uterotonic or antifungal strategy.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_pregnancy_obstetric_workflow"]},
  {drug1:"Carboprost",drug2:"Albuterol",severity:"moderate",category:"bronchospasm_context",mechanism:"Carboprost can provoke bronchospasm while albuterol use may signal reactive airway disease or rescue need.",effect:"Avoid or use extreme caution in asthma/reactive airway contexts; choose obstetric hemorrhage alternatives when appropriate.",evidence:{confidence:"moderate",sources:["FDA label","obstetric guidance"]},evidenceRefs:["ev_pregnancy_obstetric_workflow"]},
  {drug1:"Acitretin",drug2:"Alcohol (Ethanol)",severity:"severe",category:"teratogenic_metabolite_persistence",mechanism:"Alcohol can promote conversion of acitretin to etretinate, a much longer-lived retinoid stored in fat.",effect:"Avoid alcohol during and after acitretin per label; pregnancy-prevention window may be prolonged.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_pregnancy_obstetric_workflow"]},
  {drug1:"Rho(D) Immune Globulin",drug2:"MMR Vaccine",severity:"moderate",category:"immune_globulin_vaccine_timing",mechanism:"Immune globulin can reduce response to live attenuated vaccines if timing is too close.",effect:"Follow immunization timing guidance for live vaccines after immune globulin exposure.",evidence:{confidence:"moderate",sources:["CDC/ACIP guidance","FDA label"]},evidenceRefs:["ev_pregnancy_obstetric_workflow"]},
  // ── Transplant perioperative / immunosuppression enrichment batch ──
  {drug1:"Transplant Recipient / Perioperative",drug2:"MMR Vaccine",severity:"severe",category:"live_vaccine_immunosuppression",mechanism:"Live attenuated vaccines can cause infection or fail safety criteria in significantly immunosuppressed transplant recipients.",effect:"Avoid live vaccines after transplant or during intense immunosuppression unless transplant/infectious-disease protocol explicitly permits.",evidence:{confidence:"high",sources:["CDC/ACIP guidance","transplant guidance"]},evidenceRefs:["ev_transplant_perioperative_workflow"]},
  {drug1:"Rabbit Antithymocyte Globulin",drug2:"MMR Vaccine",severity:"severe",category:"live_vaccine_immunosuppression",mechanism:"Lymphocyte-depleting therapy impairs live-vaccine safety and response.",effect:"Avoid live vaccines during and after depletion per transplant/ID guidance; plan immunization before transplant when possible.",evidence:{confidence:"high",sources:["FDA label","CDC/ACIP guidance"]},evidenceRefs:["ev_transplant_perioperative_workflow"]},
  {drug1:"Belatacept",drug2:"MMR Vaccine",severity:"severe",category:"live_vaccine_immunosuppression",mechanism:"Costimulation blockade suppresses T-cell immune response and can make live vaccines unsafe or ineffective.",effect:"Avoid live vaccines during belatacept therapy unless transplant/ID specialist protocol permits.",evidence:{confidence:"high",sources:["FDA label","CDC/ACIP guidance"]},evidenceRefs:["ev_transplant_perioperative_workflow"]},
  {drug1:"Basiliximab",drug2:"Tacrolimus",severity:"mild",category:"intentional_induction_maintenance",mechanism:"IL-2 receptor induction is commonly combined with calcineurin inhibitor maintenance immunosuppression.",effect:"Intentional transplant regimen context; monitor infection risk, renal function, and tacrolimus troughs.",evidence:{confidence:"moderate",sources:["transplant guidance","FDA label"]},evidenceRefs:["ev_transplant_perioperative_workflow","ev_tacrolimus_cyp3a5_consensus"]},
  {drug1:"Rabbit Antithymocyte Globulin",drug2:"Valganciclovir",severity:"moderate",category:"myelosuppression_infection",mechanism:"Lymphocyte depletion/cytopenia risk plus valganciclovir marrow suppression can reduce neutrophil reserve.",effect:"Monitor CBC, infection risk, CMV strategy, and prophylaxis intensity in early transplant/rejection treatment.",evidence:{confidence:"high",sources:["FDA label","transplant guidance"]},evidenceRefs:["ev_transplant_perioperative_workflow","ev_valganciclovir_label"]},
  {drug1:"Tacrolimus",drug2:"Posaconazole",severity:"severe",category:"cyp3a_tdm",mechanism:"Posaconazole strongly inhibits CYP3A/P-gp pathways that clear tacrolimus.",effect:"Tacrolimus toxicity/nephrotoxicity/neurotoxicity risk; avoid or use major dose reduction with intensive trough monitoring.",evidence:{confidence:"high",sources:["FDA label","transplant pharmacology"]},evidenceRefs:["ev_transplant_perioperative_workflow","ev_tacrolimus_cyp3a5_consensus"]},
  {drug1:"Tacrolimus",drug2:"Clarithromycin",severity:"severe",category:"cyp3a_tdm",mechanism:"Clarithromycin inhibits CYP3A and can markedly raise tacrolimus exposure.",effect:"Avoid when possible; if unavoidable, use transplant-team dose adjustment and frequent trough/renal monitoring.",evidence:{confidence:"high",sources:["FDA label","transplant pharmacology"]},evidenceRefs:["ev_transplant_perioperative_workflow","ev_tacrolimus_cyp3a5_consensus"]},
  {drug1:"Tacrolimus",drug2:"Cobicistat",severity:"severe",category:"pharmacoenhancer_cyp3a",mechanism:"Cobicistat is a strong CYP3A inhibitor and can dramatically increase tacrolimus exposure.",effect:"Extreme trough elevation/toxicity risk; requires specialist HIV/transplant pharmacology management or alternative regimen.",evidence:{confidence:"high",sources:["FDA label","HIV transplant guidance"]},evidenceRefs:["ev_transplant_perioperative_workflow","ev_cobicistat_cyp3a_label","ev_tacrolimus_cyp3a5_consensus"]},
  {drug1:"Tacrolimus",drug2:"Ibuprofen",severity:"moderate",category:"nephrotoxicity",mechanism:"Calcineurin inhibitor nephrotoxicity plus NSAID renal prostaglandin inhibition can reduce renal reserve.",effect:"Avoid routine NSAIDs in transplant recipients when possible; monitor creatinine, potassium, BP, and tacrolimus trough context.",evidence:{confidence:"moderate",sources:["transplant guidance","clinical pharmacology"]},evidenceRefs:["ev_transplant_perioperative_workflow"]},
  {drug1:"Tacrolimus",drug2:"Trimethoprim/Sulfamethoxazole",severity:"moderate",category:"hyperkalemia_nephrotoxicity",mechanism:"Tacrolimus can raise potassium and impair renal function while trimethoprim reduces renal potassium excretion.",effect:"PJP prophylaxis may be intentional; monitor potassium, creatinine, CBC, and dose by renal function.",evidence:{confidence:"high",sources:["FDA label","transplant guidance"]},evidenceRefs:["ev_transplant_perioperative_workflow","ev_tmp_smx_label"]},
  {drug1:"Cyclosporine",drug2:"Posaconazole",severity:"severe",category:"cyp3a_tdm",mechanism:"Posaconazole inhibits CYP3A/P-gp and can increase cyclosporine exposure.",effect:"Nephrotoxicity and over-immunosuppression risk; use trough-guided dose adjustment or alternative antifungal.",evidence:{confidence:"high",sources:["FDA label","transplant pharmacology"]},evidenceRefs:["ev_transplant_perioperative_workflow"]},
  {drug1:"Sirolimus",drug2:"Cyclosporine",severity:"moderate",category:"cyp3a_pgp_tdm",mechanism:"Cyclosporine inhibits CYP3A/P-gp and can increase sirolimus exposure; timing separation is label-relevant.",effect:"Combination may be intentional in selected regimens but requires trough monitoring, timing strategy, renal/lipid/wound monitoring.",evidence:{confidence:"high",sources:["FDA label","transplant guidance"]},evidenceRefs:["ev_transplant_perioperative_workflow"]},
  {drug1:"Sirolimus",drug2:"Grapefruit Juice",severity:"severe",category:"cyp3a_food",mechanism:"Grapefruit inhibits intestinal CYP3A4 and can increase sirolimus exposure.",effect:"Avoid grapefruit with sirolimus; toxicity and over-immunosuppression risk.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_transplant_perioperative_workflow"]},
  {drug1:"Everolimus",drug2:"Grapefruit Juice",severity:"severe",category:"cyp3a_food",mechanism:"Grapefruit inhibits intestinal CYP3A4/P-gp pathways relevant to everolimus exposure.",effect:"Avoid grapefruit; monitor troughs/toxicity if exposure occurred.",evidence:{confidence:"high",sources:["FDA label"]},evidenceRefs:["ev_everolimus_cyp3a_pgp_label","ev_transplant_perioperative_workflow"]},
  {drug1:"Mycophenolate",drug2:"Valganciclovir",severity:"moderate",category:"myelosuppression",mechanism:"Mycophenolate and valganciclovir can both suppress bone marrow, especially leukocytes/neutrophils.",effect:"Monitor CBC closely and adjust CMV prophylaxis or immunosuppression strategy if cytopenias emerge.",evidence:{confidence:"high",sources:["FDA label","transplant guidance"]},evidenceRefs:["ev_mycophenolate_enterohepatic_label","ev_valganciclovir_label","ev_transplant_perioperative_workflow"]},
  {drug1:"Foscarnet",drug2:"Tacrolimus",severity:"severe",category:"nephrotoxicity_electrolyte",mechanism:"Foscarnet nephrotoxicity/electrolyte wasting can stack with tacrolimus nephrotoxicity and neurotoxicity context.",effect:"Use transplant/ID protocol with renal dosing, hydration, electrolyte replacement, and tacrolimus trough/creatinine monitoring.",evidence:{confidence:"high",sources:["FDA label","transplant ID guidance"]},evidenceRefs:["ev_transplant_perioperative_workflow","ev_tacrolimus_cyp3a5_consensus"]},
  {drug1:"Pentamidine",drug2:"Tacrolimus",severity:"moderate",category:"nephrotoxicity_qt_dysglycemia",mechanism:"Pentamidine can cause nephrotoxicity, QT prolongation, and dysglycemia while tacrolimus can impair renal function and electrolytes.",effect:"Monitor renal function, glucose, electrolytes, ECG risk factors, and tacrolimus troughs when PJP alternatives are needed.",evidence:{confidence:"moderate",sources:["FDA label","transplant guidance"]},evidenceRefs:["ev_transplant_perioperative_workflow"]},
  {drug1:"Nystatin",drug2:"Tacrolimus",severity:"mild",category:"low_systemic_antifungal_context",mechanism:"Nystatin is minimally absorbed, so it avoids the CYP3A inhibition burden of systemic azoles.",effect:"Usually low systemic DDI risk; useful contrast when oral candidiasis prophylaxis/treatment is local.",evidence:{confidence:"moderate",sources:["FDA label","transplant pharmacology"]},evidenceRefs:["ev_transplant_perioperative_workflow"]},

];
// ── COMBINATION calcFold — considers parent + metabolite inhibitions ──
