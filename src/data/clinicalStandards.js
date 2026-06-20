// Diognosis - external clinical standards bridge
// Keeps runtime local while exposing source-linked identity and PGx action context.

const CLINICAL_STANDARDS_VERSION = "2026-06-20-batch5-high-impact-rxnorm";

const EXTERNAL_ID_SYSTEMS = Object.freeze({
  RXNORM: "RxNorm",
  DBSNP: "dbSNP",
  PHARMVAR: "PharmVar",
  HLA: "HLA nomenclature",
  HGNC: "HGNC gene symbol",
  HGVS: "HGVS / ClinVar variant notation",
  MITOCHONDRIAL: "Mitochondrial variant nomenclature",
  CPIC: "CPIC",
});

const EXTERNAL_SUBSTANCE_MAPPINGS = Object.freeze([
  { substance:"Allopurinol", rxnormCui:"519", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Amiodarone", rxnormCui:"703", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Amitriptyline", rxnormCui:"704", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Bupropion", rxnormCui:"42347", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Clarithromycin", rxnormCui:"21212", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Clopidogrel", rxnormCui:"32968", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Codeine", rxnormCui:"2670", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Dapsone", rxnormCui:"3108", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Diazepam", rxnormCui:"3322", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Diphenhydramine", rxnormCui:"3498", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Warfarin", rxnormCui:"11289", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Simvastatin", rxnormCui:"36567", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Tacrolimus", rxnormCui:"42316", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Fluorouracil", rxnormCui:"4492", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Capecitabine", rxnormCui:"194000", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Ibuprofen", rxnormCui:"5640", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Irinotecan", rxnormCui:"51499", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Mercaptopurine", rxnormCui:"103", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Metoprolol", rxnormCui:"6918", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Nebivolol", rxnormCui:"31555", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Thioguanine", rxnormCui:"10485", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Azathioprine", rxnormCui:"1256", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Omeprazole", rxnormCui:"7646", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Oxycodone", rxnormCui:"7804", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Pantoprazole", rxnormCui:"40790", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Paroxetine", rxnormCui:"32937", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Fluoxetine", rxnormCui:"4493", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Primaquine", rxnormCui:"8687", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Prasugrel", rxnormCui:"613391", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Rasburicase", rxnormCui:"283821", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Succinylcholine", rxnormCui:"10154", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Ticagrelor", rxnormCui:"1116632", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Morphine", rxnormCui:"7052", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Acetaminophen", rxnormCui:"161", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Apixaban", rxnormCui:"1364430", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Atorvastatin", rxnormCui:"83367", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Bictegravir", rxnormCui:"1999660", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Calcium", rxnormCui:"1895", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Carbamazepine", rxnormCui:"2002", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Cimetidine", rxnormCui:"2541", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Ciprofloxacin", rxnormCui:"2551", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Colchicine", rxnormCui:"2683", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Cyclosporine", rxnormCui:"3008", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Dabigatran", rxnormCui:"1546356", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Darolutamide", rxnormCui:"2180325", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Darunavir", rxnormCui:"460132", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Desmopressin", rxnormCui:"3251", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Diltiazem", rxnormCui:"3443", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Dofetilide", rxnormCui:"49247", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Dolutegravir", rxnormCui:"1433868", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Donepezil", rxnormCui:"135447", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Doxycycline", rxnormCui:"3640", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Duloxetine", rxnormCui:"72625", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Efavirenz", rxnormCui:"195085", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Erlotinib", rxnormCui:"337525", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Ethinyl Estradiol", rxnormCui:"4124", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Famotidine", rxnormCui:"4278", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Flecainide", rxnormCui:"4441", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Fluconazole", rxnormCui:"4450", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Gemfibrozil", rxnormCui:"4719", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Hydrochlorothiazide", rxnormCui:"5487", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Insulin Glargine", rxnormCui:"274783", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Insulin Lispro", rxnormCui:"86009", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Iron", rxnormCui:"90176", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Itraconazole", rxnormCui:"28031", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Ivabradine", rxnormCui:"1649480", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Lamotrigine", rxnormCui:"28439", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Leflunomide", rxnormCui:"27169", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Levonorgestrel", rxnormCui:"6373", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Levothyroxine", rxnormCui:"10582", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Linezolid", rxnormCui:"190376", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Lisinopril", rxnormCui:"29046", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Lithium", rxnormCui:"6448", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Metformin", rxnormCui:"6809", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Methotrexate", rxnormCui:"6851", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Naproxen", rxnormCui:"7258", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Nirmatrelvir/Ritonavir", rxnormCui:"2599542", source:"NIH RxNav", confidence:"review_needed", scope:"multi_ingredient_pack" },
  { substance:"Nitroglycerin", rxnormCui:"4917", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Phenelzine", rxnormCui:"8123", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Posaconazole", rxnormCui:"282446", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Potassium Chloride", rxnormCui:"8591", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Propafenone", rxnormCui:"8754", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Ranolazine", rxnormCui:"35829", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Rifampin", rxnormCui:"9384", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Ritonavir", rxnormCui:"85762", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Rosuvastatin", rxnormCui:"301542", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Sacubitril/Valsartan", rxnormCui:"1656339", source:"NIH RxNav", confidence:"review_needed", scope:"multi_ingredient" },
  { substance:"Sertraline", rxnormCui:"36437", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Sildenafil", rxnormCui:"136411", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Sotalol", rxnormCui:"9947", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Spironolactone", rxnormCui:"9997", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Sugammadex", rxnormCui:"1726988", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Sumatriptan", rxnormCui:"37418", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Tamsulosin", rxnormCui:"77492", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Terbinafine", rxnormCui:"37801", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Tirzepatide", rxnormCui:"2601723", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Tizanidine", rxnormCui:"57258", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Tramadol", rxnormCui:"10689", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Trimethoprim/Sulfamethoxazole", rxnormCui:"10831", source:"NIH RxNav", confidence:"review_needed", scope:"multi_ingredient" },
  { substance:"Valproic Acid", rxnormCui:"11118", source:"NIH RxNav", confidence:"exact_ingredient", scope:"precise_ingredient" },
  { substance:"Venetoclax", rxnormCui:"1747556", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Voriconazole", rxnormCui:"121243", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Acalabrutinib", rxnormCui:"1986808", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Acenocoumarol", rxnormCui:"154", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Adagrasib", rxnormCui:"2625882", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Albendazole", rxnormCui:"430", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Alfentanil", rxnormCui:"480", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Apalutamide", rxnormCui:"1999574", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Aspirin", rxnormCui:"1191", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Capmatinib", rxnormCui:"2362165", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Clomipramine", rxnormCui:"2597", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Cobicistat", rxnormCui:"1306284", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Cocaine", rxnormCui:"2653", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Crizotinib", rxnormCui:"1148495", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Dasatinib", rxnormCui:"475342", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Digoxin", rxnormCui:"3407", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Disopyramide", rxnormCui:"3541", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Dronedarone", rxnormCui:"233698", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Edoxaban", rxnormCui:"1599538", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Enzalutamide", rxnormCui:"1307298", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Everolimus", rxnormCui:"141704", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Fentanyl", rxnormCui:"4337", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Fluvoxamine", rxnormCui:"42355", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Heparin", rxnormCui:"5224", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Ketoconazole", rxnormCui:"6135", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Lapatinib", rxnormCui:"480167", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Lefamulin", rxnormCui:"2198944", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Lorlatinib", rxnormCui:"2103164", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Maribavir", rxnormCui:"2586068", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Methadone", rxnormCui:"6813", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Metronidazole", rxnormCui:"6922", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Midazolam", rxnormCui:"6960", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Naloxegol", rxnormCui:"1551777", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Naldemedine", rxnormCui:"1876597", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Nilotinib", rxnormCui:"662281", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Ondansetron", rxnormCui:"26225", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Osimertinib", rxnormCui:"1721560", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Pimozide", rxnormCui:"8331", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Pirtobrutinib", rxnormCui:"2629338", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Prochlorperazine", rxnormCui:"8704", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Quinidine", rxnormCui:"9068", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Ribociclib", rxnormCui:"1873916", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Rivaroxaban", rxnormCui:"1114195", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Sirolimus", rxnormCui:"35302", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Tadalafil", rxnormCui:"358263", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Tepotinib", rxnormCui:"2477103", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Ticlopidine", rxnormCui:"10594", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Tranylcypromine", rxnormCui:"10734", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Venlafaxine", rxnormCui:"39786", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Verapamil", rxnormCui:"11170", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Vincristine", rxnormCui:"11202", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Vorapaxar", rxnormCui:"1537034", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Alcohol (Ethanol)", rxnormCui:"448", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient_alias" },
  { substance:"Pomalidomide", rxnormCui:"1369713", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Heroin (Diacetylmorphine)", rxnormCui:"3304", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient_alias" },
  { substance:"Clonazepam", rxnormCui:"2598", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"dihydrocodeine", rxnormCui:"23088", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"ethylmorphine", rxnormCui:"4166", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Hydrocodone", rxnormCui:"5489", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Isavuconazonium Sulfate", rxnormCui:"1608321", source:"NIH RxNav", confidence:"exact_ingredient", scope:"precise_ingredient" },
  { substance:"Lansoprazole", rxnormCui:"17128", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"levomethadone", rxnormCui:"236913", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"meperidine", rxnormCui:"6754", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"oxymorphone", rxnormCui:"7814", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Rabeprazole", rxnormCui:"114979", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"remifentanil", rxnormCui:"73032", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"sulfamethoxazole", rxnormCui:"10180", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Thioridazine", rxnormCui:"10502", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Grapefruit Juice", rxnormCui:"1431224", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Mycophenolic Acid", rxnormCui:"7145", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Azithromycin", rxnormCui:"18631", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Bortezomib", rxnormCui:"358258", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Diclofenac", rxnormCui:"3355", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Lovastatin", rxnormCui:"6472", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Mexiletine", rxnormCui:"6926", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"St. John's Wort", rxnormCui:"258326", source:"NIH RxNav", confidence:"review_needed", scope:"herbal_extract" },
  { substance:"Sufentanil", rxnormCui:"56795", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Tapentadol", rxnormCui:"787390", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Asciminib", rxnormCui:"2584304", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Phenytoin", rxnormCui:"8183", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Adefovir", rxnormCui:"16521", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Alprazolam", rxnormCui:"596", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Amikacin", rxnormCui:"641", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Amlodipine", rxnormCui:"17767", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"amprenavir", rxnormCui:"228656", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Aripiprazole", rxnormCui:"89013", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Bendamustine", rxnormCui:"134547", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"bleomycin", rxnormCui:"1622", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"epirubicin", rxnormCui:"3995", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"etoposide", rxnormCui:"4179", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"fludarabine", rxnormCui:"24698", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Flurazepam", rxnormCui:"4501", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"fosamprenavir", rxnormCui:"358262", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"gemcitabine", rxnormCui:"12574", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Gilteritinib", rxnormCui:"2105806", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Ibrutinib", rxnormCui:"1442981", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"idarubicin", rxnormCui:"5650", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Imatinib", rxnormCui:"282388", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Indinavir", rxnormCui:"114289", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"isavuconazole", rxnormCui:"1720882", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Ivosidenib", rxnormCui:"2049873", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Larotrectinib", rxnormCui:"2105628", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"aripiprazole lauroxil", rxnormCui:"1673265", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Bosutinib", rxnormCui:"1307619", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Brexpiprazole", rxnormCui:"1658314", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Buprenorphine", rxnormCui:"1819", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"cabazitaxel", rxnormCui:"996051", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Cabozantinib", rxnormCui:"1363268", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"carbimazole", rxnormCui:"2020", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Ceritinib", rxnormCui:"1535457", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Clobazam", rxnormCui:"21241", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Clotrimazole", rxnormCui:"2623", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"cytarabine", rxnormCui:"3041", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Dabrafenib", rxnormCui:"1424911", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"dacarbazine", rxnormCui:"3098", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"daunorubicin", rxnormCui:"3109", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Dexlansoprazole", rxnormCui:"816346", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"doxorubicin", rxnormCui:"3639", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Econazole", rxnormCui:"3743", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Entrectinib", rxnormCui:"2197862", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Lopinavir", rxnormCui:"195088", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"lurbinectedin", rxnormCui:"2374729", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Mebendazole", rxnormCui:"6672", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Miconazole", rxnormCui:"6932", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Midostaurin", rxnormCui:"1919083", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"nelfinavir", rxnormCui:"134527", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Neratinib", rxnormCui:"1940643", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Nicardipine", rxnormCui:"7396", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Nimodipine", rxnormCui:"7426", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Nisoldipine", rxnormCui:"7435", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Ponatinib", rxnormCui:"1364347", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Pralsetinib", rxnormCui:"2394936", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Quazepam", rxnormCui:"35185", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Rilpivirine", rxnormCui:"1102270", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Saquinavir", rxnormCui:"83395", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Selpercatinib", rxnormCui:"2370147", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Selumetinib", rxnormCui:"2289380", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Sertaconazole", rxnormCui:"36435", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"temozolomide", rxnormCui:"37776", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"tenofovir", rxnormCui:"117466", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"tenofovir disoproxil", rxnormCui:"300195", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"tenofovir disoproxil fumarate", rxnormCui:"322248", source:"NIH RxNav", confidence:"exact_ingredient", scope:"precise_ingredient" },
  { substance:"Terconazole", rxnormCui:"37806", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"tipranavir", rxnormCui:"190548", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Tivozanib", rxnormCui:"2534233", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Triazolam", rxnormCui:"10767", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Vardenafil", rxnormCui:"306674", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Vemurafenib", rxnormCui:"1147220", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Zanubrutinib", rxnormCui:"2262435", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Betrixaban", rxnormCui:"1927851", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Imipramine", rxnormCui:"5691", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Trimipramine", rxnormCui:"10834", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Abemaciclib", rxnormCui:"1946825", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Alpelisib", rxnormCui:"2169285", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Erdafitinib", rxnormCui:"2123125", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Erythromycin", rxnormCui:"4053", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Esomeprazole", rxnormCui:"283742", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Ethosuximide", rxnormCui:"4135", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Felbamate", rxnormCui:"24812", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Flurbiprofen", rxnormCui:"4502", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Glyburide", rxnormCui:"4815", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Hydroxyzine", rxnormCui:"5553", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Perampanel", rxnormCui:"1356552", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Phenobarbital", rxnormCui:"8134", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Piroxicam", rxnormCui:"8356", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Tenoxicam", rxnormCui:"37790", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Theophylline", rxnormCui:"10438", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Tiagabine", rxnormCui:"31914", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Topiramate", rxnormCui:"38404", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Zonisamide", rxnormCui:"39998", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Tamoxifen", rxnormCui:"10324", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Citalopram", rxnormCui:"2556", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Furosemide", rxnormCui:"4603", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Abciximab", rxnormCui:"83929", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Abrocitinib", rxnormCui:"2591476", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Alectinib", rxnormCui:"1727455", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Atazanavir", rxnormCui:"343047", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Baloxavir Marboxil", rxnormCui:"2099995", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Bedaquiline", rxnormCui:"1364504", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Brigatinib", rxnormCui:"1921217", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Cefaclor", rxnormCui:"2176", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Cefadroxil", rxnormCui:"2177", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Cefditoren", rxnormCui:"83682", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Cefprozil", rxnormCui:"19552", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Chloramphenicol", rxnormCui:"2348", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Cobimetinib", rxnormCui:"1722365", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Copanlisib", rxnormCui:"1945077", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Cyclophosphamide", rxnormCui:"3002", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Daclatasvir", rxnormCui:"1606218", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Dacomitinib", rxnormCui:"2058849", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Desvenlafaxine", rxnormCui:"734064", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"dicloxacillin", rxnormCui:"3356", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Doxepin", rxnormCui:"3638", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Duvelisib", rxnormCui:"2058509", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Encorafenib", rxnormCui:"2049106", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Eravacycline", rxnormCui:"2055906", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Escitalopram", rxnormCui:"321988", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Felodipine", rxnormCui:"4316", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Fosaprepitant", rxnormCui:"1731071", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Fostamatinib", rxnormCui:"2044896", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Futibatinib", rxnormCui:"2628190", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Gatifloxacin", rxnormCui:"228476", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Gefitinib", rxnormCui:"328134", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Grazoprevir", rxnormCui:"1734630", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Idelalisib", rxnormCui:"1544460", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Indomethacin", rxnormCui:"5781", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Isosorbide Mononitrate", rxnormCui:"28004", source:"NIH RxNav", confidence:"exact_ingredient", scope:"precise_ingredient" },
  { substance:"Ixazomib", rxnormCui:"1723735", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Lenvatinib", rxnormCui:"1603296", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Nifedipine", rxnormCui:"7417", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Nortriptyline", rxnormCui:"7531", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Oxcarbazepine", rxnormCui:"32624", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Pazopanib", rxnormCui:"714438", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Pemigatinib", rxnormCui:"2359268", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Penicillin V", rxnormCui:"7984", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Regorafenib", rxnormCui:"1312397", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Remdesivir", rxnormCui:"2284718", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Rifabutin", rxnormCui:"55672", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Ripretinib", rxnormCui:"2369389", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Romidepsin", rxnormCui:"877510", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Ruxolitinib", rxnormCui:"1193326", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Sotorasib", rxnormCui:"2550714", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Stiripentol", rxnormCui:"2054968", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Sulfacetamide", rxnormCui:"10169", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"sulfamethazine", rxnormCui:"10178", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"sulfapyridine", rxnormCui:"10188", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Sunitinib", rxnormCui:"357977", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Tazemetostat", rxnormCui:"2274378", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"telithromycin", rxnormCui:"274786", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Temsirolimus", rxnormCui:"657797", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Tucatinib", rxnormCui:"2361285", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Vigabatrin", rxnormCui:"14851", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Abiraterone", rxnormCui:"1100072", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Amoxapine", rxnormCui:"722", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Argatroban", rxnormCui:"15202", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Axitinib", rxnormCui:"1242999", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Belinostat", rxnormCui:"1543543", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"cerivastatin", rxnormCui:"596723", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Cilostazol", rxnormCui:"21107", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Delafloxacin", rxnormCui:"1927663", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Eluxadoline", rxnormCui:"1653781", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Glecaprevir", rxnormCui:"1940635", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Hydroxychloroquine", rxnormCui:"5521", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Levomilnacipran", rxnormCui:"1433212", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Moxifloxacin", rxnormCui:"139462", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Olaparib", rxnormCui:"1597582", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Pravastatin", rxnormCui:"42463", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Rucaparib", rxnormCui:"1862579", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Sorafenib", rxnormCui:"495881", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Tenofovir Alafenamide", rxnormCui:"1721603", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Zidovudine", rxnormCui:"11413", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
  { substance:"Abatacept", rxnormCui:"614391", source:"NIH RxNav", confidence:"exact_ingredient", scope:"ingredient" },
]);

const STANDARD_CONTEXT_EXEMPTIONS = Object.freeze([
  {
    substance:"Combined Oral Contraceptive",
    standard:"RxNorm",
    reason:"Search-friendly class actor; RxNorm identity should be attached to the selected formulation ingredients rather than the class abstraction.",
    representativeSubstances:["Ethinyl Estradiol", "Levonorgestrel"],
  },
  {
    substance:"Pregnancy / Trying to Conceive",
    standard:"RxNorm",
    reason:"Clinical context actor, not a medication substance.",
    representativeSubstances:[],
  },
  {
    substance:"Transplant Recipient / Perioperative",
    standard:"RxNorm",
    reason:"Clinical context actor used to surface transplant and perioperative safety constraints; not a medication substance.",
    representativeSubstances:[],
  },
  {
    substance:"Opioid anesthetics",
    standard:"RxNorm",
    reason:"Search-friendly class actor; RxNorm identity should attach to the selected opioid anesthetic ingredient rather than the class abstraction.",
    representativeSubstances:["Alfentanil", "Fentanyl", "Remifentanil", "Sufentanil"],
  },
  {
    substance:"Aspirin (Low-Dose)",
    standard:"RxNorm",
    reason:"Dose/formulation actor; RxNorm identity should attach to aspirin or to an exact clinical product when dose is clinically relevant.",
    representativeSubstances:["Aspirin"],
  },
]);

const PGX_MARKER_MAPPINGS = Object.freeze({
  CYP2C19: Object.freeze([
    { label:"CYP2C19*2", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs4244285", interpretation:"no-function allele context" },
    { label:"CYP2C19*3", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs4986893", interpretation:"no-function allele context" },
    { label:"CYP2C19*17", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs12248560", interpretation:"increased-function allele context" },
  ]),
  CYP2D6: Object.freeze([
    { label:"CYP2D6*4", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs3892097", interpretation:"no-function allele context" },
    { label:"CYP2D6*10", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs1065852", interpretation:"decreased-function allele context" },
    { label:"CYP2D6*41", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs28371725", interpretation:"decreased-function allele context" },
  ]),
  CYP2C9: Object.freeze([
    { label:"CYP2C9*2", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs1799853", interpretation:"decreased-function allele context" },
    { label:"CYP2C9*3", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs1057910", interpretation:"decreased-function allele context" },
  ]),
  CYP3A5: Object.freeze([
    { label:"CYP3A5*3", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs776746", interpretation:"splice-defect/non-expresser allele context" },
    { label:"CYP3A5*6", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs10264272", interpretation:"splice-defect/non-expresser allele context" },
    { label:"CYP3A5*7", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs41303343", interpretation:"frameshift/non-expresser allele context" },
  ]),
  UGT1A1: Object.freeze([
    { label:"UGT1A1*28 / TA7 repeat", system:EXTERNAL_ID_SYSTEMS.DBSNP, dbsnp:"rs8175347", interpretation:"decreased-function promoter repeat context" },
    { label:"UGT1A1*6", system:EXTERNAL_ID_SYSTEMS.DBSNP, dbsnp:"rs4148323", interpretation:"decreased-function coding variant context" },
  ]),
  VKORC1: Object.freeze([
    { label:"VKORC1 -1639G>A", system:EXTERNAL_ID_SYSTEMS.DBSNP, dbsnp:"rs9923231", interpretation:"warfarin sensitivity context" },
  ]),
  SLCO1B1: Object.freeze([
    { label:"SLCO1B1 c.521T>C / *5", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs4149056", interpretation:"reduced OATP1B1 uptake context" },
  ]),
  DPYD: Object.freeze([
    { label:"DPYD*2A", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs3918290", interpretation:"no-function allele context" },
    { label:"DPYD c.2846A>T", system:EXTERNAL_ID_SYSTEMS.DBSNP, dbsnp:"rs67376798", interpretation:"decreased-function allele context" },
    { label:"DPYD c.1679T>G", system:EXTERNAL_ID_SYSTEMS.DBSNP, dbsnp:"rs55886062", interpretation:"decreased-function allele context" },
  ]),
  TPMT: Object.freeze([
    { label:"TPMT*3B", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs1800460", interpretation:"decreased/no-function allele context" },
    { label:"TPMT*3C", system:EXTERNAL_ID_SYSTEMS.PHARMVAR, dbsnp:"rs1142345", interpretation:"decreased/no-function allele context" },
  ]),
  NUDT15: Object.freeze([
    { label:"NUDT15 c.415C>T", system:EXTERNAL_ID_SYSTEMS.DBSNP, dbsnp:"rs116855232", interpretation:"decreased/no-function allele context" },
  ]),
  "HLA-B": Object.freeze([
    { label:"HLA-B*57:01", system:EXTERNAL_ID_SYSTEMS.HLA, interpretation:"abacavir hypersensitivity risk-marker context" },
    { label:"HLA-B*15:02", system:EXTERNAL_ID_SYSTEMS.HLA, interpretation:"aromatic anticonvulsant severe cutaneous adverse reaction context" },
  ]),
  "HLA-A": Object.freeze([
    { label:"HLA-A*31:01", system:EXTERNAL_ID_SYSTEMS.HLA, interpretation:"aromatic anticonvulsant hypersensitivity risk-marker context" },
    { label:"HLA-A*32:01", system:EXTERNAL_ID_SYSTEMS.HLA, interpretation:"vancomycin DRESS risk-marker context" },
  ]),
  G6PD: Object.freeze([
    { label:"G6PD deficient phenotype", system:EXTERNAL_ID_SYSTEMS.CPIC, interpretation:"erythrocyte oxidative-reserve phenotype context" },
    { label:"G6PD A- c.202G>A", system:EXTERNAL_ID_SYSTEMS.DBSNP, dbsnp:"rs1050828", interpretation:"G6PD A- deficiency haplotype component" },
    { label:"G6PD A- c.376A>G", system:EXTERNAL_ID_SYSTEMS.DBSNP, dbsnp:"rs1050829", interpretation:"G6PD A- deficiency haplotype component" },
    { label:"G6PD Mediterranean c.563C>T", system:EXTERNAL_ID_SYSTEMS.DBSNP, dbsnp:"rs5030868", interpretation:"severe G6PD deficiency variant context" },
  ]),
  BCHE: Object.freeze([
    { label:"BCHE deficient / low pseudocholinesterase activity", system:EXTERNAL_ID_SYSTEMS.CPIC, interpretation:"butyrylcholinesterase activity phenotype context" },
    { label:"BCHE atypical dibucaine-resistant variant", system:EXTERNAL_ID_SYSTEMS.DBSNP, dbsnp:"rs1799807", interpretation:"pseudocholinesterase deficiency context" },
    { label:"BCHE K variant", system:EXTERNAL_ID_SYSTEMS.DBSNP, dbsnp:"rs1803274", interpretation:"reduced butyrylcholinesterase activity context" },
  ]),
  RYR1: Object.freeze([
    { label:"RYR1 malignant-hyperthermia susceptibility variant", system:EXTERNAL_ID_SYSTEMS.HGVS, interpretation:"pathogenic or likely pathogenic RYR1 variant context" },
  ]),
  CACNA1S: Object.freeze([
    { label:"CACNA1S malignant-hyperthermia susceptibility variant", system:EXTERNAL_ID_SYSTEMS.HGVS, interpretation:"pathogenic or likely pathogenic CACNA1S variant context" },
  ]),
  "MT-RNR1": Object.freeze([
    { label:"MT-RNR1 m.1555A>G", system:EXTERNAL_ID_SYSTEMS.MITOCHONDRIAL, dbsnp:"rs267606617", interpretation:"aminoglycoside ototoxicity risk-marker context" },
    { label:"MT-RNR1 m.1494C>T", system:EXTERNAL_ID_SYSTEMS.MITOCHONDRIAL, interpretation:"aminoglycoside ototoxicity risk-marker context" },
    { label:"MT-RNR1 m.1095T>C", system:EXTERNAL_ID_SYSTEMS.MITOCHONDRIAL, interpretation:"aminoglycoside ototoxicity risk-marker context" },
  ]),
  MTHFR: Object.freeze([
    { label:"MTHFR C677T", system:EXTERNAL_ID_SYSTEMS.DBSNP, dbsnp:"rs1801133", interpretation:"folate-pathway variant context" },
  ]),
  KCNH2: Object.freeze([
    { label:"KCNH2 long-QT susceptibility variant", system:EXTERNAL_ID_SYSTEMS.HGVS, interpretation:"pathogenic or likely pathogenic long-QT variant context" },
  ]),
  SCN1A: Object.freeze([
    { label:"SCN1A sodium-channel variant", system:EXTERNAL_ID_SYSTEMS.HGVS, interpretation:"seizure and sodium-channel pharmacodynamic risk-marker context" },
  ]),
  SCN2A: Object.freeze([
    { label:"SCN2A sodium-channel variant", system:EXTERNAL_ID_SYSTEMS.HGVS, interpretation:"seizure and sodium-channel pharmacodynamic risk-marker context" },
  ]),
  GABRG2: Object.freeze([
    { label:"GABRG2 epilepsy-associated variant", system:EXTERNAL_ID_SYSTEMS.HGVS, interpretation:"GABA-A receptor pharmacodynamic risk-marker context" },
  ]),
});

const PGX_ACTION_SUMMARIES = Object.freeze([
  {
    id:"pgx_action_clopidogrel_cyp2c19_reduced_function",
    drug:"Clopidogrel",
    gene:"CYP2C19",
    phenotypes:[GENOTYPE_PHENOTYPE.PM, GENOTYPE_PHENOTYPE.IM],
    level:"A",
    source:"CPIC",
    guidelineUrl:"https://www.clinpgx.org/guideline/PA166251443",
    title:"CPIC-linked clopidogrel activation review",
    whatChanged:"Reduced CYP2C19 function can lower clopidogrel active-thiol formation.",
    reviewDirection:"Review the indication and whether a non-CYP2C19-dependent P2Y12 option such as prasugrel or ticagrelor is appropriate and not contraindicated.",
    safetyBoundary:"Do not treat this as automatic substitution advice; bleeding risk, indication, procedure timing, and contraindications still decide.",
    evidenceRefs:["ev_clopidogrel_cyp2c19_cpic","ev_clopidogrel_active_thiol_kim2014"],
  },
  {
    id:"pgx_action_codeine_cyp2d6_extreme_function",
    drug:"Codeine",
    gene:"CYP2D6",
    phenotypes:[GENOTYPE_PHENOTYPE.PM, GENOTYPE_PHENOTYPE.UM],
    level:"A",
    source:"CPIC",
    guidelineUrl:"https://www.clinpgx.org/guideline/PA166251454",
    title:"CPIC-linked codeine activation review",
    whatChanged:"CYP2D6 poor metabolism can reduce morphine formation, while ultrarapid metabolism can increase active-metabolite toxicity risk.",
    reviewDirection:"Review whether codeine should be avoided in favor of an analgesic plan that does not depend on CYP2D6 activation.",
    safetyBoundary:"Pain indication, age, respiratory risk, opioid tolerance, and local protocols still govern the final choice.",
    evidenceRefs:["ev_codeine_cyp2d6_cpic","ev_cyp2d6_codeine_genotype"],
  },
  {
    id:"pgx_action_warfarin_cyp2c9_reduced_function",
    drug:"Warfarin",
    gene:"CYP2C9",
    phenotypes:[GENOTYPE_PHENOTYPE.PM, GENOTYPE_PHENOTYPE.IM],
    level:"A",
    source:"CPIC",
    guidelineUrl:"https://www.clinpgx.org/guideline/PA166251465",
    title:"CPIC-linked warfarin dosing-context review",
    whatChanged:"Reduced CYP2C9 function can lower warfarin clearance and increase dose sensitivity.",
    reviewDirection:"Use genotype-aware warfarin dosing context together with VKORC1/CYP4F2, clinical factors, and INR-guided adjustment.",
    safetyBoundary:"This app does not calculate a patient-specific warfarin dose; INR and anticoagulation protocol remain mandatory.",
    evidenceRefs:["ev_warfarin_cyp2c9_vkorc1_cyp4f2_cpic2017"],
  },
  {
    id:"pgx_action_warfarin_vkorc1_sensitivity",
    drug:"Warfarin",
    gene:"VKORC1",
    phenotypes:[GENOTYPE_PHENOTYPE.PM, GENOTYPE_PHENOTYPE.IM],
    level:"A",
    source:"CPIC",
    guidelineUrl:"https://www.clinpgx.org/guideline/PA166251465",
    title:"CPIC-linked warfarin sensitivity review",
    whatChanged:"VKORC1 sensitivity context can lower warfarin dose requirement.",
    reviewDirection:"Interpret VKORC1 with CYP2C9/CYP4F2, age, size, diet, interacting drugs, and INR response.",
    safetyBoundary:"This is algorithm context, not a standalone dosing instruction.",
    evidenceRefs:["ev_warfarin_cyp2c9_vkorc1_cyp4f2_cpic2017"],
  },
  {
    id:"pgx_action_simvastatin_slco1b1_reduced_function",
    drug:"Simvastatin",
    gene:"SLCO1B1",
    phenotypes:[GENOTYPE_PHENOTYPE.PM, GENOTYPE_PHENOTYPE.IM],
    level:"A",
    source:"CPIC",
    guidelineUrl:"https://www.clinpgx.org/guideline/PA166251447",
    title:"CPIC-linked simvastatin myopathy-risk review",
    whatChanged:"Reduced SLCO1B1/OATP1B1 function can raise simvastatin acid exposure.",
    reviewDirection:"Review statin selection, dose intensity, interacting drugs, and myopathy monitoring before relying on standard simvastatin assumptions.",
    safetyBoundary:"ASCVD risk target, prior tolerance, CK/symptoms, and interacting drugs still determine the plan.",
    evidenceRefs:["ev_statin_slco1b1_abcg2_cpic2022","ev_simvastatin_multigene_choi2016"],
  },
  {
    id:"pgx_action_tacrolimus_cyp3a5_expression",
    drug:"Tacrolimus",
    gene:"CYP3A5",
    phenotypes:[GENOTYPE_PHENOTYPE.IM, GENOTYPE_PHENOTYPE.UM],
    level:"A",
    source:"CPIC",
    guidelineUrl:"https://www.clinpgx.org/guideline/PA166251455",
    title:"CPIC-linked tacrolimus expresser review",
    whatChanged:"CYP3A5 expresser status can increase tacrolimus clearance relative to non-expressers.",
    reviewDirection:"Use transplant-team genotype context with trough targets, organ type, interacting drugs, kidney function, and time after transplant.",
    safetyBoundary:"Tacrolimus is narrow-index; therapeutic drug monitoring and specialist protocol dominate.",
    evidenceRefs:["ev_tacrolimus_cyp3a5_cpic","ev_tacrolimus_cyp3a5_consensus"],
  },
  {
    id:"pgx_action_fluoropyrimidine_dpyd_reduced_function",
    drugs:["Capecitabine","Fluorouracil"],
    gene:"DPYD",
    phenotypes:[GENOTYPE_PHENOTYPE.PM, GENOTYPE_PHENOTYPE.IM],
    level:"A",
    source:"CPIC",
    guidelineUrl:"https://www.clinpgx.org/guideline/PA166251462",
    title:"CPIC-linked fluoropyrimidine toxicity review",
    whatChanged:"Reduced DPYD function can impair 5-FU catabolism and sharply increase fluoropyrimidine toxicity risk.",
    reviewDirection:"Review oncology protocol, whether fluoropyrimidines should be avoided or started with a major dose reduction, and whether additional DPYD testing is needed.",
    safetyBoundary:"Cancer regimen, organ function, prior toxicity, and oncology protocol decide the final treatment path.",
    evidenceRefs:["ev_fluorouracil_dpyd_amstutz2018"],
  },
  {
    id:"pgx_action_thiopurine_tpmt_reduced_function",
    drugs:["Azathioprine","Mercaptopurine"],
    gene:"TPMT",
    phenotypes:[GENOTYPE_PHENOTYPE.PM, GENOTYPE_PHENOTYPE.IM],
    level:"A",
    source:"CPIC",
    guidelineUrl:"https://www.clinpgx.org/guideline/PA166251442",
    title:"CPIC-linked thiopurine TPMT review",
    whatChanged:"Reduced TPMT activity can shift thiopurine metabolism toward cytotoxic 6-TGN exposure.",
    reviewDirection:"Review thiopurine dose strategy, alternatives, CBC monitoring, and NUDT15 status before relying on a standard dose.",
    safetyBoundary:"Disease protocol, leukocyte counts, liver tests, and specialist monitoring remain decisive.",
    evidenceRefs:["ev_azathioprine_tpmt_cpic2019","ev_thiopurine_tpmt_nudt15_cpic2025"],
  },
  {
    id:"pgx_action_thiopurine_nudt15_reduced_function",
    drugs:["Azathioprine","Mercaptopurine","Thioguanine"],
    gene:"NUDT15",
    phenotypes:[GENOTYPE_PHENOTYPE.PM, GENOTYPE_PHENOTYPE.IM],
    level:"A",
    source:"CPIC",
    guidelineUrl:"https://www.clinpgx.org/guideline/PA166251442",
    title:"CPIC-linked thiopurine NUDT15 review",
    whatChanged:"Reduced NUDT15 function can increase DNA-thioguanine toxicity and myelosuppression risk.",
    reviewDirection:"Review thiopurine dose strategy, alternatives, CBC monitoring, and TPMT status before relying on a standard dose.",
    safetyBoundary:"Disease protocol, leukocyte counts, liver tests, and specialist monitoring remain decisive.",
    evidenceRefs:["ev_thiopurine_tpmt_nudt15_cpic2025"],
  },
  {
    id:"pgx_action_metoprolol_cyp2d6_reduced_function",
    drug:"Metoprolol",
    gene:"CYP2D6",
    phenotypes:[GENOTYPE_PHENOTYPE.PM, GENOTYPE_PHENOTYPE.IM],
    level:"A",
    source:"CPIC",
    guidelineUrl:"https://www.clinpgx.org/guideline/PA166343383",
    title:"CPIC-linked metoprolol exposure review",
    whatChanged:"Reduced CYP2D6 function can raise parent metoprolol exposure and reduce oxidative metabolite formation.",
    reviewDirection:"Review heart rate, blood pressure, beta-blocker indication, dose tolerance, and whether a less CYP2D6-dependent beta-blocker option is appropriate.",
    safetyBoundary:"Do not treat genotype alone as a metoprolol dose instruction; clinical response, indication, comorbidities, and interacting CYP2D6 inhibitors still decide.",
    evidenceRefs:["ev_metoprolol_cyp2d6_cpic"],
  },
  {
    id:"pgx_action_irinotecan_ugt1a1_reduced_function",
    drug:"Irinotecan",
    gene:"UGT1A1",
    phenotypes:[GENOTYPE_PHENOTYPE.PM, GENOTYPE_PHENOTYPE.IM],
    level:"A",
    source:"CPIC/PubMed",
    guidelineUrl:"https://pubmed.ncbi.nlm.nih.gov/24786769/",
    title:"CPIC-linked irinotecan SN-38 toxicity review",
    whatChanged:"Reduced UGT1A1 function can impair SN-38 glucuronidation and increase severe neutropenia or diarrhea risk.",
    reviewDirection:"Review irinotecan regimen, starting dose strategy, neutropenia/diarrhea monitoring, bilirubin context, and oncology protocol before relying on standard dosing assumptions.",
    safetyBoundary:"Dose changes depend on regimen intensity, cancer protocol, prior toxicity, ancestry-linked alleles, liver function, and specialist oncology judgment.",
    evidenceRefs:["ev_irinotecan_ugt1a1_ramsey2014","ev_irinotecan_ugt1a1_stewart2007","ev_irinotecan_ugt1a_han2006","ev_irinotecan_sn38_review_mathijssen2001"],
  },
  {
    id:"pgx_action_g6pd_oxidant_drug_review",
    drugs:["Rasburicase","Primaquine","Dapsone"],
    gene:"G6PD deficiency",
    phenotypes:[GENOTYPE_RISK_STATUS.PRESENT],
    level:"A",
    source:"CPIC",
    guidelineUrl:"https://www.clinpgx.org/guideline/PA166251450",
    title:"CPIC-linked G6PD oxidant-drug review",
    whatChanged:"G6PD deficiency lowers erythrocyte oxidative-stress reserve, so selected oxidant drugs can trigger hemolysis or methemoglobinemia.",
    reviewDirection:"Treat rasburicase as contraindication-level context and review primaquine or dapsone by drug-specific CPIC risk tier, quantitative G6PD activity, indication, dose, and monitoring feasibility.",
    safetyBoundary:"Do not apply blanket avoidance to every G6PD-listed medicine; CPIC separates high, medium, low-to-no-risk, variable, and indeterminate contexts.",
    evidenceRefs:["ev_rasburicase_g6pd_cpic2014","ev_g6pd_cpic2022_expanded","ev_g6pd_oxidative_antimalarials","ev_dapsone_ddsnhoh_metabolite","ev_primaquine_g6pd_safety_bastiaens2018"],
  },
  {
    id:"pgx_action_succinylcholine_bche_low_activity",
    drug:"Succinylcholine",
    gene:"BCHE",
    phenotypes:[GENOTYPE_PHENOTYPE.PM, GENOTYPE_PHENOTYPE.IM],
    level:"label",
    source:"FDA/DailyMed",
    guidelineUrl:"https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=succinylcholine%20pseudocholinesterase",
    title:"Label-linked succinylcholine BCHE review",
    whatChanged:"Reduced butyrylcholinesterase activity can greatly prolong succinylcholine neuromuscular blockade.",
    reviewDirection:"Review prior anesthesia history, pseudocholinesterase activity or dibucaine-number testing, acquired causes of low activity, and non-BCHE-dependent paralytic alternatives.",
    safetyBoundary:"This is procedural anesthesia risk context, not an outpatient medication-change instruction; anesthesia team protocol and airway/ventilation readiness decide management.",
    evidenceRefs:["ev_bche_succinylcholine_mivacurium_label"],
  },
  {
    id:"pgx_action_succinylcholine_ryr1_cacna1s_mh_variant",
    drug:"Succinylcholine",
    gene:"RYR1/CACNA1S MH variant",
    phenotypes:[GENOTYPE_RISK_STATUS.PRESENT],
    level:"A",
    source:"CPIC",
    guidelineUrl:"https://www.clinpgx.org/guideline/PA166251460",
    title:"CPIC-linked malignant-hyperthermia trigger review",
    whatChanged:"Malignant-hyperthermia-associated RYR1 or CACNA1S variants can make succinylcholine and volatile anesthetics dangerous triggers.",
    reviewDirection:"Use non-triggering anesthesia planning, avoid succinylcholine and potent volatile anesthetics when susceptibility is present, and review personal or family anesthesia history.",
    safetyBoundary:"A negative genotype does not fully exclude malignant-hyperthermia susceptibility; anesthesia history and specialist planning remain necessary.",
    evidenceRefs:["ev_volatile_succinylcholine_ryr1_cacna1s_cpic2019"],
  },
]);

function clinicalStandardKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function mappedDrugNamesForAction(row = {}) {
  return [...new Set([row.drug, ...(row.drugs || [])].filter(Boolean))];
}

function getExternalSubstanceMapping(name) {
  const drug = typeof getDrug === "function" ? getDrug(name) : null;
  const keys = [name, drug?.name, drug?.id].map(clinicalStandardKey).filter(Boolean);
  return (EXTERNAL_SUBSTANCE_MAPPINGS || []).find(row =>
    keys.includes(clinicalStandardKey(row.substance))
  ) || null;
}

function getStandardContextExemption(name) {
  const drug = typeof getDrug === "function" ? getDrug(name) : null;
  const keys = [name, drug?.name, drug?.id].map(clinicalStandardKey).filter(Boolean);
  return (STANDARD_CONTEXT_EXEMPTIONS || []).find(row =>
    keys.includes(clinicalStandardKey(row.substance))
  ) || null;
}

function getExternalIdentifiersForSubstance(name) {
  const mapping = getExternalSubstanceMapping(name);
  if (!mapping || !mapping.rxnormCui) return [];
  return [{
    system:EXTERNAL_ID_SYSTEMS.RXNORM,
    id:mapping.rxnormCui,
    label:`RxNorm ${mapping.rxnormCui}`,
    source:mapping.source,
    confidence:mapping.confidence,
    scope:mapping.scope,
  }];
}

function pgxMarkerMappingKeys(gene) {
  const raw = String(gene || "").trim();
  const upper = raw.toUpperCase();
  const keys = [raw, upper];
  if (/^G6PD\b/.test(upper)) keys.push("G6PD", "G6PD deficiency");
  if (/^RYR1\b|^CACNA1S\b|^RYR1\/CACNA1S\b/.test(upper)) keys.push("RYR1", "CACNA1S", "RYR1/CACNA1S MH variant");
  if (/^HLA-A\b|^HLA-A\*/.test(upper)) keys.push("HLA-A");
  if (/^HLA-B\b|^HLA-B\*/.test(upper)) keys.push("HLA-B");
  if (/^MT-RNR1\b/.test(upper)) keys.push("MT-RNR1");
  if (/^MTHFR\b/.test(upper)) keys.push("MTHFR");
  if (/^KCNH2\b/.test(upper)) keys.push("KCNH2");
  if (/^SCN1A\b/.test(upper)) keys.push("SCN1A");
  if (/^SCN2A\b/.test(upper)) keys.push("SCN2A");
  if (/^GABRG2\b/.test(upper)) keys.push("GABRG2");
  return [...new Set(keys.filter(Boolean))];
}

function getPgxMarkerMappings(gene) {
  const rows = [];
  const seen = new Set();
  for (const key of pgxMarkerMappingKeys(gene)) {
    for (const row of PGX_MARKER_MAPPINGS[key] || []) {
      const rowKey = `${row.system}:${row.label}:${row.dbsnp || ""}`;
      if (seen.has(rowKey)) continue;
      seen.add(rowKey);
      rows.push(row);
    }
  }
  return rows;
}

function selectedPhenotypeForActionGene(gene, genotypeState = {}) {
  for (const key of pgxMarkerMappingKeys(gene)) {
    if (Object.prototype.hasOwnProperty.call(genotypeState, key)) return genotypeState[key];
  }
  return genotypeState[gene];
}

function actionGenesMatch(left, right) {
  const leftKeys = new Set(pgxMarkerMappingKeys(left).map(clinicalStandardKey));
  return pgxMarkerMappingKeys(right).some(key => leftKeys.has(clinicalStandardKey(key)));
}

function pgxActionSummaryMatches(row, stack = [], genotypeState = {}) {
  const stackKeys = new Set((stack || []).map(clinicalStandardKey));
  const drugHit = mappedDrugNamesForAction(row).some(name => stackKeys.has(clinicalStandardKey(name)));
  if (!drugHit || !row.gene) return false;
  const phenotype = selectedPhenotypeForActionGene(row.gene, genotypeState);
  return (row.phenotypes || []).includes(phenotype);
}

function getPgxActionSummariesForStack(stack = [], genotypeState = {}) {
  return (PGX_ACTION_SUMMARIES || [])
    .filter(row => pgxActionSummaryMatches(row, stack, genotypeState))
    .map(row => ({
      ...row,
      matchedDrugs:mappedDrugNamesForAction(row).filter(name =>
        (stack || []).some(stackName => clinicalStandardKey(stackName) === clinicalStandardKey(name))
      ),
      phenotype:selectedPhenotypeForActionGene(row.gene, genotypeState),
      markerMappings:getPgxMarkerMappings(row.gene),
    }));
}

function getPgxActionSummaryForDrugGene(drugName, gene, phenotype) {
  return (PGX_ACTION_SUMMARIES || []).find(row =>
    actionGenesMatch(row.gene, gene) &&
    (row.phenotypes || []).includes(phenotype) &&
    mappedDrugNamesForAction(row).some(name => clinicalStandardKey(name) === clinicalStandardKey(drugName))
  ) || null;
}

function isSelectedGenotypePhenotype(gene, phenotype) {
  if (!gene || !phenotype) return false;
  if (phenotype === GENOTYPE_PHENOTYPE.NM) return false;
  if (typeof GENOTYPE_RISK_STATUS !== "undefined" && phenotype === GENOTYPE_RISK_STATUS.ABSENT) return false;
  return true;
}

function buildClinicalStandardsCoverage(stack = [], genotypeState = {}) {
  const selected = [...new Set(stack || [])].filter(Boolean);
  const recognizedDrugs = selected.filter(name => typeof getDrug === "function" && getDrug(name));
  const mappedSubstances = recognizedDrugs.map(name => ({
    name:(typeof getDrug === "function" ? getDrug(name)?.name : name) || name,
    identifiers:getExternalIdentifiersForSubstance(name),
    standardsException:getStandardContextExemption(name),
  }));
  const mappedDrugs = mappedSubstances.filter(row => row.identifiers.length);
  const exemptedDrugs = mappedSubstances.filter(row => !row.identifiers.length && row.standardsException);
  const unmappedDrugs = mappedSubstances.filter(row => !row.identifiers.length && !row.standardsException);
  const selectedGenotypes = Object.entries(genotypeState || {})
    .filter(([gene, phenotype]) => isSelectedGenotypePhenotype(gene, phenotype));
  const markerMappings = selectedGenotypes.map(([gene, phenotype]) => ({
    gene,
    phenotype,
    markers:getPgxMarkerMappings(gene),
  }));
  const markerMapped = markerMappings.filter(row => row.markers.length);
  const pgxActions = getPgxActionSummariesForStack(selected, genotypeState);
  const systemsPresent = [...new Set([
    ...mappedDrugs.flatMap(row => row.identifiers.map(item => item.system)),
    ...markerMapped.flatMap(row => row.markers.map(marker => marker.system)),
    ...pgxActions.map(row => row.source).filter(Boolean),
  ])].filter(Boolean);
  const limitations = [
    unmappedDrugs.length
      ? `${unmappedDrugs.length} recognized selected medication${unmappedDrugs.length === 1 ? "" : "s"} lack local RxNorm identity mappings.`
      : exemptedDrugs.length
        ? "Selected recognized medications have local RxNorm identity mappings where medication identity standards apply; non-medication context actors are explicitly marked."
      : "Selected recognized medications have local RxNorm identity mappings where medication identity standards are currently supported.",
    selectedGenotypes.length && markerMapped.length < selectedGenotypes.length
      ? `${selectedGenotypes.length - markerMapped.length} selected gene or marker result${selectedGenotypes.length - markerMapped.length === 1 ? "" : "s"} lack local star-allele, dbSNP, or HLA mapping rows.`
      : selectedGenotypes.length
        ? "Selected gene or marker results have local PGx marker identity rows where currently supported."
        : "No selected gene or marker result requires PGx marker identity mapping.",
    "SNOMED CT diagnosis/symptom mapping is not used because this review does not ingest diagnoses or symptoms.",
  ];
  return {
    version:"v1-clinical-standards-coverage-1",
    selectedCount:selected.length,
    recognizedDrugCount:recognizedDrugs.length,
    mappedDrugCount:mappedDrugs.length,
    unmappedDrugCount:unmappedDrugs.length,
    mappedSubstances:mappedDrugs,
    standardsExemptionCount:exemptedDrugs.length,
    standardContextExemptions:exemptedDrugs.map(row => ({
      name:row.name,
      reason:row.standardsException.reason,
      representativeSubstances:row.standardsException.representativeSubstances || [],
    })),
    unmappedSubstances:unmappedDrugs.map(row => row.name),
    genotypeCount:selectedGenotypes.length,
    markerMappedGeneCount:markerMapped.length,
    markerMappingCount:markerMapped.reduce((sum, row) => sum + row.markers.length, 0),
    markerMappings:markerMapped,
    pgxActionCount:pgxActions.length,
    pgxActions,
    systemsPresent,
    limitations,
    ready:true,
  };
}
