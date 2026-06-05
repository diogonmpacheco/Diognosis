// MedCheck — Core app state management and main render loop
// Phase A: modular source — concatenated by build.js

function addDrug(name) {
  if (!activeStack.includes(name)) {
    activeStack.push(name);
    document.getElementById("searchInput").value = "";
    document.getElementById("searchResults").classList.remove("show");
    renderAll();
  }
}

function removeDrug(name) {
  activeStack = activeStack.filter(n => n !== name);
  delete drugDoses[name];
  renderAll();
}

function swapDrug(oldName, newName) {
  const idx = activeStack.indexOf(oldName);
  if (idx >= 0) activeStack[idx] = newName;
  else activeStack.push(newName);
  renderAll();
}

let viewMode = "search";
let activeTab = "safety";
const MEDCHECK_TABS = ["safety","pgx","pk","evidence","advanced"];
function setViewMode(m) {
  viewMode = m;
  document.getElementById("searchModeBtn").className = "mode-btn" + (m==="search"?" active":"");
  document.getElementById("browseModeBtn").className = "mode-btn" + (m==="browse"?" active":"");
  document.getElementById("browseWrap").className = "browse-wrap" + (m==="browse"?" show":"");
  if (m==="browse") renderBrowse();
}

function setTab(name) {
  activeTab = name;
  MEDCHECK_TABS.forEach(t => {
    const panel = document.getElementById("tab-" + t);
    const btn = document.getElementById("tabbtn-" + t);
    if (panel) panel.classList.toggle("active", t === name);
    if (btn) btn.classList.toggle("active", t === name);
  });
}

function renderSummaryBar() {
  const bar = document.getElementById("summaryBar");
  const tabBar = document.getElementById("tabBar");
  if (!bar || !tabBar) return;

  const safetyBtn = document.getElementById("tabbtn-safety");
  const tabPanels = MEDCHECK_TABS
    .map(t => document.getElementById("tab-" + t))
    .filter(Boolean);
  if (activeStack.length < 1) {
    bar.style.display = "none";
    tabBar.style.display = "none";
    tabPanels.forEach(panel => { panel.style.display = "none"; });
    if (safetyBtn) safetyBtn.innerHTML = "Summary";
    return;
  }

  bar.style.display = "";
  tabBar.style.display = "";
  tabPanels.forEach(panel => { panel.style.display = ""; });
  setTab(activeTab);

  let riskClass = "neutral";
  let scoreValue = "—";
  let scoreLabel = "Add 2+";
  let headline = "";
  let summaryCopy = "";
  let nextStep = "";
  let severeCount = 0;
  let moderateCount = 0;
  let evidenceCount = 0;
  let interactionScore = 0;
  let genotypePriority = null;
  let priorityInteraction = null;
  let priorityStory = null;
  let priorityEvidence = null;
  if (activeStack.length >= 2) {
    const risk = calcRisk();
    interactionScore = risk.score;
    const severeInteractions = risk.interactions.filter(i => i.severity === "severe" || i.severity === "critical");
    const moderateInteractions = risk.interactions.filter(i => i.severity === "moderate");
    priorityInteraction = severeInteractions[0] || moderateInteractions[0] || risk.interactions[0] || null;
    const severePairs = uniqueInteractionPairLabels(severeInteractions);
    const moderatePairs = uniqueInteractionPairLabels(moderateInteractions);
    severeCount = severePairs.length;
    moderateCount = moderatePairs.length;
    evidenceCount = new Set(risk.interactions.flatMap(i => i.evidenceRefs || [])).size;
    riskClass = severeCount || interactionScore >= 60 ? "high" : interactionScore >= 30 ? "moderate" : "low";
    scoreValue = interactionScore;
    scoreLabel = risk.level.split(" ")[0];
    const topSevere = severePairs.slice(0, 2).join(", ");
    headline = severeCount > 0 ? "High-priority interaction found" :
      interactionScore >= 30 ? "Some monitoring may be needed" :
      "No major interaction signal found";
    summaryCopy = severeCount > 0
      ? `${severeCount} severe finding${severeCount>1?"s":""}${topSevere ? `: ${topSevere}` : ""}. Review the findings before changing doses or adding more medicines.`
      : `Checked ${activeStack.length} substances. MedCheck did not find a severe pairwise interaction, but genotype, transporter, metabolite, and dose context may still matter.`;
    nextStep = severeCount > 0
      ? "Start with the severe findings, then review genotype-adjusted levels."
      : "Review level changes and genotype notes for dose-sensitive medications.";
    if (priorityInteraction) {
      priorityStory = buildInteractionPriorityStory(priorityInteraction);
      priorityEvidence = getPriorityEvidenceLayer(priorityInteraction.evidenceRefs || [], priorityInteraction.evidence, priorityInteraction.sourceEngine || priorityInteraction.source);
    }
  } else {
    genotypePriority = typeof getHighestGenotypePrioritySignal === "function" ? getHighestGenotypePrioritySignal() : null;
    headline = "Add another medication to check interactions";
    summaryCopy = "Single-medication pharmacogenomic, metabolite, and PK context is available below. Interaction risk needs at least two substances.";
    nextStep = "Add a second medication, supplement, herb, food, or recreational substance.";
  }

  if (!genotypePriority && typeof getHighestGenotypePrioritySignal === "function") {
    genotypePriority = getHighestGenotypePrioritySignal();
  }
  const genotypeActionable = genotypePriority && genotypePriority.score >= 45 ? 1 : 0;
  const genotypeEvidenceCount = genotypePriority ? (genotypePriority.evidenceRefs || []).length : 0;
  if (genotypePriority && genotypePriority.score > interactionScore) {
    riskClass = genotypePriority.score >= 70 ? "high" : genotypePriority.score >= 45 ? "moderate" : "low";
    scoreValue = genotypePriority.score;
    scoreLabel = genotypePriority.label;
    headline = genotypePriority.headline;
    summaryCopy = genotypePriority.summary;
    nextStep = genotypePriority.nextStep;
    priorityStory = genotypePriority.story || buildGenotypePriorityStory(genotypePriority);
    priorityEvidence = getPriorityEvidenceLayer(genotypePriority.evidenceRefs || [], null, "genotype");
  }
  evidenceCount += genotypeEvidenceCount;
  if (!priorityStory) {
    priorityStory = buildDefaultPriorityStory(activeStack.length);
    priorityEvidence = priorityEvidence || getPriorityEvidenceLayer([], null, "model");
  }

  const activeGenotypes = Object.values({ ...(activeGenotype || {}), ...(userGenetics || {}) })
    .filter(value =>
      value &&
      value !== "normal" &&
      value !== GENOTYPE_PHENOTYPE.NM &&
      value !== GENOTYPE_RISK_STATUS.ABSENT
    )
    .length;
  const actionableCount = severeCount + moderateCount + genotypeActionable;
  const jumpTab = genotypePriority && genotypePriority.score > interactionScore ? "pgx" : "safety";

  let syndromeHtml = "";
  try {
    const occ = computeReceptorOccupancy(activeStack);
    if (occ && occ.active_syndromes && occ.active_syndromes.length) {
      const chips = occ.active_syndromes.map(s => {
        const note = (s.clinical_note || "").replace(/"/g, "&quot;");
        return `<span class="syndrome-chip ${s.severity}" title="${note}">${s.name}</span>`;
      }).join("");
      syndromeHtml = `<div class="summary-syndromes">${chips}</div>`;
    }
  } catch (e) {
    // Summary should never block the rest of the UI.
  }

  bar.innerHTML = `<div class="summary-card">
    <div class="summary-main">
      <div>
        <div class="summary-kicker">Highest Priority</div>
        <div class="summary-title">${headline}</div>
        <div class="summary-copy">${summaryCopy} <span class="summary-jump" onclick="setTab('${jumpTab}')">View findings</span></div>
      </div>
      <div class="summary-risk ${riskClass}">
        <div class="num">${scoreValue}</div>
        <div class="lbl">${scoreLabel}</div>
      </div>
    </div>
    ${renderPriorityStory(priorityStory, priorityEvidence)}
    <div class="summary-metrics">
      <div class="summary-metric"><strong>${activeStack.length}</strong><span>Substances</span></div>
      <div class="summary-metric"><strong>${actionableCount}</strong><span>Actionable Findings</span></div>
      <div class="summary-metric"><strong>${activeGenotypes}</strong><span>Genotype Inputs</span></div>
      <div class="summary-metric"><strong>${evidenceCount}</strong><span>Evidence Links</span></div>
    </div>
    <div class="summary-next"><span class="summary-next-pill">Next</span><span>${nextStep}</span></div>
    ${syndromeHtml}
  </div>`;
  const badge = severeCount > 0 ? `<span class="tab-badge">${severeCount}</span>` : "";
  if (safetyBtn) safetyBtn.innerHTML = "Summary" + badge;
}

function uniqueInteractionPairLabels(interactions = []) {
  const seen = new Set();
  const labels = [];
  for (const ix of interactions) {
    const drugs = [ix.drug1, ix.drug2].filter(Boolean);
    if (!drugs.length) continue;
    const key = drugs.map(d => String(d).toLowerCase()).sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(drugs.join(" + "));
  }
  return labels;
}

function buildInteractionPriorityStory(ix) {
  if (!ix) return null;
  const pair = [ix.drug1, ix.drug2].filter(Boolean).join(" + ");
  const pathway = ix.enzyme || ix.affectedPathway || ix.category || "shared pathway";
  const mechanism = ix.mechanism || ix.effect || "a modeled interaction";
  const action = ix.clinicalAction || ix.management || (
    ix.severity === "severe" || ix.severity === "critical"
      ? "Review whether this combination should be avoided, substituted, dose-adjusted, or monitored before use."
      : "Review dose, timing, monitoring, and whether the combination is still appropriate."
  );
  return {
    why:`${pair || "This stack"} has the strongest medication-interaction signal in the current profile.`,
    changes:`The concern is ${mechanism}${pathway ? ` through ${pathway}` : ""}.`,
    review:action,
  };
}

function buildGenotypePriorityStory(signal) {
  if (!signal) return null;
  return {
    why:signal.why || "A selected genotype changes the interpretation of a medication already in the list.",
    changes:signal.changes || signal.summary || "The genotype changes expected exposure, active metabolite formation, or hypersensitivity risk.",
    review:signal.review || signal.nextStep || "Review the pharmacogenomics panel before relying on the standard medication assumption.",
  };
}

function buildDefaultPriorityStory(count) {
  if (count < 1) return null;
  if (count < 2) {
    return {
      why:"MedCheck can already show pharmacogenomic, metabolite, and dose context for one medication.",
      changes:"Pairwise interaction risk needs at least two substances, but genotype or metabolite context can still matter.",
      review:"Add another substance or set known genotype results to personalize the review.",
    };
  }
  return {
    why:"No severe pairwise signal is currently ahead of the rest of the profile.",
    changes:"Lower-priority genotype, transporter, metabolite, receptor, and dose context may still affect interpretation.",
    review:"Review the findings tabs if the patient has narrow-therapeutic-index drugs, unusual symptoms, or known genotype results.",
  };
}

function getPriorityEvidenceLayer(refs = [], inlineEvidence = null, source = "") {
  const studies = [...new Set(refs || [])].map(ref => STUDY_DB[ref]).filter(Boolean);
  const types = new Set(studies.map(s => s.type));
  const sourceText = `${source || ""} ${(inlineEvidence?.sources || []).join(" ")} ${inlineEvidence?.confidence || ""}`.toLowerCase();
  const hasGuidance = types.has(EVIDENCE_TIER.GUIDELINE) || types.has(EVIDENCE_TIER.FDA_LABEL) || /cpic|guideline|fda|label/.test(sourceText);
  const hasHuman = [
    EVIDENCE_TIER.META_ANALYSIS,
    EVIDENCE_TIER.RCT,
    EVIDENCE_TIER.CLINICAL_PK,
    EVIDENCE_TIER.OBSERVATIONAL,
    EVIDENCE_TIER.CASE_REPORT,
  ].some(type => types.has(type)) || /clinical|observational|rct|meta/.test(sourceText);
  const hasOnlyMechanistic = types.has(EVIDENCE_TIER.IN_VITRO) || types.has(EVIDENCE_TIER.ANIMAL) || /in vitro|animal|mechanistic/.test(sourceText);
  if (hasGuidance) {
    return { label:"Strong clinical guidance", className:"strong", note:studies.length ? `${studies.length} linked source${studies.length === 1 ? "" : "s"}, including guideline or label evidence.` : "Guideline or product-label evidence is attached." };
  }
  if (hasHuman) {
    return { label:"Human clinical evidence", className:"moderate", note:studies.length ? `${studies.length} linked human source${studies.length === 1 ? "" : "s"}.` : "Human clinical evidence is referenced inline." };
  }
  if (hasOnlyMechanistic) {
    return { label:"Mechanistic evidence", className:"limited", note:"Mechanistic evidence supports the pathway; clinical magnitude may be less certain." };
  }
  return { label:"Modeled review signal", className:"limited", note:"This is a conservative model signal; use the detailed tabs and evidence links for context." };
}

function renderPriorityStory(story, evidence) {
  if (!story) return "";
  const ev = evidence || getPriorityEvidenceLayer();
  return `<div class="summary-story">
    <div class="summary-story-row"><strong>Why this matters</strong>${story.why}</div>
    <div class="summary-story-row"><strong>What changes</strong>${story.changes}</div>
    <div class="summary-story-row"><strong>What to review</strong>${story.review}</div>
    <div class="summary-confidence">
      <span class="summary-confidence-pill ${ev.className === "strong" ? "" : ev.className}">${ev.label}</span>
      <span class="summary-confidence-note">${ev.note}</span>
    </div>
  </div>`;
}

function updateEmptyTabs() {
  MEDCHECK_TABS.forEach(t => {
    const panel = document.getElementById("tab-" + t);
    if (!panel || typeof panel.querySelectorAll !== "function") return;
    const sections = Array.from(panel.querySelectorAll(".section"));
    const anyVisible = sections
      .some(section => section.style.display !== "none");
    let note = panel.querySelector(".tab-empty");
    if (!anyVisible) {
      if (!note) {
        note = document.createElement("div");
        note.className = "tab-empty";
        panel.appendChild(note);
      }
      note.textContent = activeStack.length < 2
        ? "Add a second medication to populate this view."
        : "No data available for this medication set.";
      note.style.display = "";
    } else if (note) {
      note.style.display = "none";
    }
  });
}

function arrangeAdvancedSections() {
  const advanced = document.getElementById("tab-advanced");
  if (!advanced || typeof advanced.appendChild !== "function") return;
  ["matrixSection","pdSection","cascadeSection","qualitySection","graphSection"].forEach(id => {
    const section = document.getElementById(id);
    if (section && section.parentElement !== advanced) advanced.appendChild(section);
  });
}

function onSearch(q) {
  const el = document.getElementById("searchResults");
  if (!q || q.length < 1) { el.classList.remove("show"); return; }
  const seen = new Set();
  const seenAliasMatches = new Set();
  const rawMatches = DRUG_DB
    .map(d => ({ drug:d, match:scoreDrugSearch(d, q) }))
    .filter(row => row.match.score > 0)
    .sort((a,b) =>
      b.match.score - a.match.score ||
      drugSearchRichness(b.drug) - drugSearchRichness(a.drug) ||
      a.drug.name.localeCompare(b.drug.name)
    );
  const matches = rawMatches.filter(row => {
    const d = row.drug;
    if (seen.has(d.name)) return false;
    const aliasKey = getSearchAliasDedupeKey(row);
    if (aliasKey && seenAliasMatches.has(aliasKey)) return false;
    seen.add(d.name);
    if (aliasKey) seenAliasMatches.add(aliasKey);
    return true;
  });
  if (!matches.length) { el.innerHTML = '<div class="sr-item"><span class="sr-name" style="color:var(--text2)">No matches found</span></div>'; el.classList.add("show"); return; }

  // Group by practical browse category, while preserving exact class on the row.
  const groups = {};
  matches.forEach(row => {
    const d = row.drug;
    const cat = getBrowseCategory(d);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(row);
  });

  let html = "";
  for (const [cls, rows] of Object.entries(groups)) {
    if (matches.length > 5) html += `<div class="sr-cat">${cls}</div>`;
    rows.forEach(row => {
      const d = row.drug;
      const added = activeStack.includes(d.name);
      const matchedAlias = row.match.term && row.match.term !== d.name && row.match.term !== d.id ? row.match.term : "";
      const secondary = typeof getDrugSecondaryLabel === "function" ? getDrugSecondaryLabel(d) : "";
      const displayName = matchedAlias ? `${highlight(matchedAlias, q)} -> ${d.name}` : highlight(d.name, q);
      const matchNote = row.match.reason && row.match.reason !== "name" ? `<span class="sr-match">${row.match.reason}</span>` : "";
      const secondaryHtml = secondary || matchNote ? `<span class="sr-secondary">${[secondary, matchNote].filter(Boolean).join(" ")}</span>` : "";
      html += `<div class="sr-item" onclick="${added ? `removeDrug('${d.name.replace(/'/g,"\\'")}')` : `addDrug('${d.name.replace(/'/g,"\\'")}')` }">
        <span><span class="sr-name">${displayName}</span>${secondaryHtml}</span>
        <span>${added ? '<span class="sr-added">✓ Added</span>' : `<span class="sr-class">${d.cls}</span>`}</span>
      </div>`;
    });
  }
  el.innerHTML = html;
  el.classList.add("show");
}

function getSearchAliasDedupeKey(row) {
  const drug = row?.drug;
  const term = row?.match?.term;
  const reason = row?.match?.reason || "";
  if (!drug || !term || reason === "name" || reason === "name prefix" || reason === "medication class") return "";
  if (term === drug.name || term === drug.id || term === drug.cls) return "";
  const norm = typeof normalizeDrugLookupKey === "function"
    ? normalizeDrugLookupKey
    : value => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return `alias:${norm(term)}`;
}

function drugSearchRichness(drug) {
  return (drug.routes || []).length * 3 +
    (drug.inh || []).length * 2 +
    (drug.ind || []).length * 2 +
    (drug.metInh || []).length * 2 +
    (drug.evidenceRefs || []).length +
    (drug.note ? 2 : 0);
}

function scoreDrugSearch(drug, query) {
  const norm = typeof normalizeDrugLookupKey === "function"
    ? normalizeDrugLookupKey
    : value => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const q = norm(query);
  if (!q) return { score:0, term:"", reason:"" };
  const tokens = q.split(" ").filter(Boolean);
  const terms = typeof getDrugSearchTerms === "function" ? getDrugSearchTerms(drug) : [drug.name, drug.cls, ...(BRAND_NAMES[drug.name] || [])];
  const searchable = terms.map(term => ({ raw:String(term || ""), key:norm(term) })).filter(term => term.key);
  const joined = searchable.map(term => term.key).join(" ");
  const genericKey = norm(drug.name);
  let best = { score:0, term:"", reason:"" };
  const setBest = (score, term, reason) => {
    if (score > best.score) best = { score, term, reason };
  };

  if (genericKey === q) setBest(120, drug.name, "name");
  if (genericKey.startsWith(q)) setBest(95, drug.name, "name prefix");
  searchable.forEach(term => {
    const isGeneric = term.raw === drug.name || term.raw === drug.id;
    if (term.key === q) setBest(isGeneric ? 120 : 110, term.raw, isGeneric ? "name" : "brand or alias");
    else if (term.key.startsWith(q)) setBest(isGeneric ? 95 : 88, term.raw, isGeneric ? "name prefix" : "brand or alias prefix");
    else if (term.key.includes(q)) setBest(isGeneric ? 76 : 72, term.raw, isGeneric ? "partial name" : "partial brand or alias");
  });
  if (tokens.length > 1 && tokens.every(token => joined.includes(token))) setBest(68, drug.name, "matched words");
  if (String(drug.cls || "").toLowerCase().includes(query.toLowerCase())) setBest(52, drug.cls, "medication class");
  if (tokens.length === 1 && q.length >= 4) {
    searchable.forEach(term => {
      for (const part of term.key.split(" ")) {
        if (part.length >= 4 && levenshteinWithin(part, q, q.length > 6 ? 2 : 1)) {
          setBest(42, term.raw, "possible spelling match");
        }
      }
    });
  }
  return best;
}

function levenshteinWithin(a, b, maxDistance) {
  if (Math.abs(a.length - b.length) > maxDistance) return false;
  const prev = Array.from({ length:b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let rowMin = curr[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      rowMin = Math.min(rowMin, curr[j]);
    }
    if (rowMin > maxDistance) return false;
    for (let j = 0; j < curr.length; j++) prev[j] = curr[j];
  }
  return prev[b.length] <= maxDistance;
}

function highlight(text, q) {
  if (!q) return text;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`, "gi");
  return text.replace(re, "<strong style='color:var(--accent)'>$1</strong>");
}

function textHasAny(text, terms) {
  const haystack = String(text || "").toLowerCase();
  return terms.some(term => haystack.includes(term));
}

function drugNameHasAny(drug, terms) {
  const name = String(drug?.name || "").toLowerCase();
  return terms.some(term => name.includes(term));
}

function getBrowseCategory(drug) {
  const cls = String(drug?.cls || "");

  if (
    textHasAny(cls, ["recreational", "psychedelic", "hallucinogen", "empathogen", "dissociative", "cannabinoid"]) ||
    drugNameHasAny(drug, ["alcohol", "cannabis", "mdma", "ghb", "cocaine", "heroin", "poppers", "kratom", "ayahuasca", "ketamine", "psilocybin", "lsd", "dmt", "2c-b", "2c-i"])
  ) return "Recreational & Social";

  if (
    textHasAny(cls, ["ssri", "snri", "tca", "maoi", "rima", "antidepressant", "atypical ad", "nassa", "anxiolytic"]) ||
    textHasAny(cls, ["antipsychotic", "atypical ap", "typical ap", "mood stabilizer", "anticonvulsant", "antiepileptic", "barbiturate", "triptan", "dopamine", "dopa", "comt inhibitor", "dementia", "acetylcholinesterase"])
  ) return "Mental Health & Neurology";

  if (
    textHasAny(cls, ["statin", "fibrate", "beta-blocker", "ace inhibitor", "arb", "ccb", "diuretic", "thiazide", "antihypertensive", "alpha-blocker", "antiarrhythmic", "cardiac glycoside"]) ||
    textHasAny(cls, ["antiplatelet", "anticoag", "doac", "pde5 inhibitor", "nitrate", "vasodilator", "thrombopoietin"])
  ) return "Cardiovascular & Blood";

  if (
    textHasAny(cls, ["opioid", "analgesic", "nsaid", "muscle relaxant", "anesthetic", "sedative-hypnotic", "neuromuscular blocker", "nmb", "relaxant binding", "malignant hyperthermia"]) ||
    textHasAny(cls, ["benzodiazepine", "volatile anesthetic"])
  ) return "Pain, Sedation & Anesthesia";

  if (
    textHasAny(cls, ["antibiotic", "macrolide", "fluoroquinolone", "penicillin", "rifamycin", "sulfonamide", "nitrofuran", "nitroimidazole", "lincosamide", "glycopeptide", "tetracycline", "antistaphylococcal", "antitubercular", "antiviral"]) ||
    textHasAny(cls, ["azole", "antifungal", "antimalarial", "aminoquinoline", "antiretroviral", "nrti", "protease inhibitor", "integrase inhibitor", "ccr5", "hcv", "antimicrobial", "aminoglycoside", "sulfone"])
  ) return "Infectious Disease";

  if (
    textHasAny(cls, ["immunosuppressant", "antimetabolite", "dmard", "jak", "kinase inhibitor", "mtor", "chemotherapy", "egfr", "bcr-abl", "vegfr", "pyrimidine synthesis", "dhodh"])
  ) return "Oncology, Immunology & Transplant";

  if (
    textHasAny(cls, ["ppi", "h2 blocker", "gi", "antidiarrheal", "prokinetic", "antiemetic", "5-ht3", "laxative", "binding resin", "bile acid sequestrant", "pancreatic enzyme", "antacid", "alkalinizing", "biguanide", "sglt2", "dpp-4", "glp-1", "sulfonylurea", "tzd", "insulin", "contraceptive", "estrogen", "progestin", "thyroid", "antithyroid", "urate", "uricosuric", "gout", "xanthine oxidase", "xo inhibitor", "bisphosphonate", "calcimimetic"])
  ) return "GI, Endocrine & Metabolic";

  if (
    textHasAny(cls, ["antihistamine", "beta-2 agonist", "decongestant", "antitussive", "expectorant", "leukotriene", "5-lipoxygenase", "pde4", "muscarinic", "cftr"]) ||
    drugNameHasAny(drug, ["albuterol"])
  ) return "Respiratory, Allergy & Cough";

  if (
    textHasAny(cls, ["estrogen", "progestin", "contraceptive", "serm", "progesterone receptor", "5-ari", "corticosteroid"])
  ) return "Hormones & Reproductive";

  if (
    textHasAny(cls, ["supplement", "vitamin", "herbal", "food", "imaging agent"]) ||
    drugNameHasAny(drug, ["grapefruit", "pomegranate", "black pepper", "vitamin k", "charbroiled", "smoked foods", "contrast dye"])
  ) return "Supplements, Foods & Environment";

  if (textHasAny(cls, ["stimulant", "adhd", "methylxanthine", "nri"])) return "Stimulants & ADHD";

  return "Other Specialized Agents";
}

const MEDICATION_CLASS_GUIDES = [
  {
    title:"Anticoagulants and antiplatelets",
    note:"Bleeding, CYP2C9/VKORC1, antiplatelet activation, NSAIDs, SSRIs, azoles, and transporter overlap.",
    tags:["bleeding","CYP2C19","CYP2C9","transporters"],
    drugs:["Warfarin","Fluconazole","Ibuprofen"],
    tab:"safety"
  },
  {
    title:"Psychiatry and neurology",
    note:"CYP2D6/CYP2C19 shifts, active-metabolite failures, QT, serotonin toxicity, sedation, and anticholinergic burden.",
    tags:["CYP2D6","CYP2C19","serotonin/QT","burden"],
    drugs:["Paroxetine","Fluoxetine"],
    tab:"safety"
  },
  {
    title:"Cardiology and QT risk",
    note:"Antiarrhythmics, narrow therapeutic index drugs, CYP2D6 metabolism, QT stacking, and electrolyte-sensitive combinations.",
    tags:["QT","NTI","CYP2D6"],
    drugs:["Flecainide","Fluoxetine"],
    genotype:{ CYP2D6:GENOTYPE_PHENOTYPE.PM },
    tab:"pgx"
  },
  {
    title:"Antibiotics, antifungals, antivirals",
    note:"Macrolides, azoles, rifamycins, boosters, CYP3A4, CYP2C9, P-gp, and OATP pathway risk.",
    tags:["CYP3A4","CYP2C9","P-gp"],
    drugs:["Simvastatin","Clarithromycin"],
    tab:"pk"
  },
  {
    title:"Oncology, immunology, transplant",
    note:"Narrow windows, prodrug activation, genotype actionability, transporters, and strong inhibitor or inducer sensitivity.",
    tags:["NTI","prodrugs","PGx"],
    drugs:["Tacrolimus","Fluconazole"],
    tab:"pk"
  }
];

function renderBrowse() {
  const el = document.getElementById("browseWrap");
  const groups = {};
  DRUG_DB.forEach(d => {
    const cat = getBrowseCategory(d);
    if (!groups[cat]) groups[cat] = [];
    if (!groups[cat].find(x => x.name === d.name)) groups[cat].push(d);
  });

  const catOrder = [
    "Mental Health & Neurology",
    "Cardiovascular & Blood",
    "Pain, Sedation & Anesthesia",
    "Infectious Disease",
    "GI, Endocrine & Metabolic",
    "Oncology, Immunology & Transplant",
    "Respiratory, Allergy & Cough",
    "Hormones & Reproductive",
    "Stimulants & ADHD",
    "Supplements, Foods & Environment",
    "Recreational & Social",
    "Other Specialized Agents"
  ];
  const sortedCats = [...new Set([...catOrder, ...Object.keys(groups)])];

  el.innerHTML = renderBrowseClassGuides() + sortedCats.filter(c => groups[c]).map(cat => `
    <div class="browse-cat">
      <div class="browse-cat-title" onclick="toggleBrowseCat(this)">
        ${cat} <span style="font-weight:400;font-size:12px;color:var(--text2)">(${groups[cat].length})</span>
        <span class="arrow">▶</span>
      </div>
      <div class="browse-items" data-cat="${cat}">
        ${groups[cat].sort((a,b)=>a.name.localeCompare(b.name)).map(d => {
          const alias = typeof getDrugSecondaryLabel === "function" ? getDrugSecondaryLabel(d, 2) : "";
          return `<div class="browse-chip ${activeStack.includes(d.name)?'added':''}" onclick="toggleDrug('${d.name.replace(/'/g,"\\'")}')">${d.name}<span class="browse-chip-class">${d.cls}</span>${alias ? `<span class="browse-chip-alias">${alias}</span>` : ""}</div>`;
        }).join("")}
      </div>
    </div>
  `).join("");
}

function renderBrowseClassGuides() {
  return `<div class="class-guide-list">
    ${MEDICATION_CLASS_GUIDES.map((guide, idx) => `<div class="class-guide-card" onclick="loadMedicationClassGuide(${idx})">
      <div class="class-guide-title">${guide.title}</div>
      <div class="class-guide-note">${guide.note}</div>
      <div class="class-guide-tags">${guide.tags.map(tag => `<span class="class-guide-tag">${tag}</span>`).join("")}</div>
      <div class="class-guide-action">Load example: ${guide.drugs.join(" + ")}</div>
    </div>`).join("")}
  </div>`;
}

function loadMedicationClassGuide(index) {
  const guide = MEDICATION_CLASS_GUIDES[index];
  if (!guide) return;
  activeStack = guide.drugs
    .map(name => typeof resolveUrlDrugName === "function" ? resolveUrlDrugName(name) : name)
    .filter(Boolean);
  for (const [gene, phenotype] of Object.entries(guide.genotype || {})) {
    if (GENOTYPE_EFFECTS[gene] && GENOTYPE_EFFECTS[gene][phenotype]) setGenotypeState(gene, phenotype);
  }
  activeTab = guide.tab || "safety";
  renderAll();
}

function toggleBrowseCat(el) {
  el.classList.toggle("open");
  el.nextElementSibling.classList.toggle("show");
}

function toggleDrug(name) {
  if (activeStack.includes(name)) removeDrug(name);
  else addDrug(name);
}

function toggleSection(id) {
  const body = document.getElementById(id + "Body");
  body.classList.toggle("open");
}

// ── RENDER ALL ──
function renderAll() {
  arrangeAdvancedSections();
  renderMedList();
  renderGenetics();
  if (activeStack.length >= 1) {
    renderFoldBars();
    renderTiming();
    renderMetabolites();
    renderPathwayDiversions();
    renderCascade();                // Phase 3: graph traversal
    renderEvidenceExplorer();       // Phase 4: study browser
    renderQualityDashboard();       // Database quality / curation status
    renderGenotypePanel();          // Phase 5 #2: genotype-stratified evidence
    renderPhenotypeAccumulation();  // Phase 5 #6: serotonin/QTc/anticholinergic
    renderPKSimulation();           // Phase 5 #1: 1-compartment PK curves
    renderScenarioComparison();     // Dose + genotype scenario comparison
    renderInteractionGraph();       // Phase 5 #4: D3 force-directed graph
    renderWashoutCalendar();        // Phase 5 #9: safe-to-switch dates
    renderAdverseBurden();          // Phase 5 #10: ACB + Beers + fall risk
    document.getElementById("foldSection").style.display = "";
    document.getElementById("timingSection").style.display = "";
    document.getElementById("metabSection").style.display = "";
    document.getElementById("pdSection").style.display = "";
  } else {
    document.getElementById("foldSection").style.display = "none";
    document.getElementById("timingSection").style.display = "none";
    document.getElementById("metabSection").style.display = "none";
    document.getElementById("pdSection").style.display = "none";
    document.getElementById("cascadeSection").style.display = "none";
    document.getElementById("evidenceSection").style.display = "none";
    document.getElementById("qualitySection").style.display = "none";
    document.getElementById("genotypeSection").style.display = "none";
    document.getElementById("phenoAccumSection").style.display = "none";
    document.getElementById("pkSimSection").style.display = "none";
    document.getElementById("scenarioSection").style.display = "none";
    document.getElementById("graphSection").style.display = "none";
    document.getElementById("washoutSection").style.display = "none";
    document.getElementById("burdenSection").style.display = "none";
  }
  if (activeStack.length >= 2) {
    const risk = calcRisk();
    renderRiskGauge(risk);
    renderInteractions(risk.interactions);
    renderCombinationProducts();
    renderTransporterDDI();
    renderMatrix(risk.interactions);
    renderAlternatives();
    document.getElementById("riskSection").style.display = "";
    document.getElementById("interSection").style.display = "";
    document.getElementById("comboSection").style.display = "";
    document.getElementById("transporterSection").style.display = "";
    document.getElementById("matrixSection").style.display = "";
    document.getElementById("altSection").style.display = "";
  } else {
    document.getElementById("riskSection").style.display = "none";
    document.getElementById("interSection").style.display = "none";
    document.getElementById("comboSection").style.display = "none";
    document.getElementById("transporterSection").style.display = "none";
    document.getElementById("matrixSection").style.display = "none";
    document.getElementById("altSection").style.display = "none";
  }
  renderSummaryBar();
  updateEmptyTabs();
  if (viewMode === "browse") renderBrowse();
}

function renderMedList() {
  const el = document.getElementById("medList");
  const countEl = document.getElementById("medCount");
  if (!activeStack.length) {
    el.innerHTML = '<div class="empty-state"><div class="icon">💊</div>Add your medications above to see how they interact</div>';
    countEl.textContent = "";
    return;
  }
  countEl.textContent = `${activeStack.length} medication${activeStack.length>1?"s":""}`;
  el.innerHTML = activeStack.map(name => {
    const escaped = name.replace(/'/g,"\\'");
    const tiers = DOSE_TIERS[name];
    let doseHtml = "";
    if (tiers) {
      const current = getDoseTier(name);
      const opts = Object.entries(tiers.tiers).map(([k,v]) =>
        `<option value="${k}"${k===current?" selected":""}>${v.label}</option>`
      ).join("");
      doseHtml = `<select class="dose-select" onclick="event.stopPropagation()" onchange="setDoseTier('${escaped}',this.value)">${opts}</select>`;
    }
    const drug = getDrug(name);
    const secondary = typeof getDrugSecondaryLabel === "function" ? getDrugSecondaryLabel(drug, 2) : "";
    const labelHtml = `<span class="med-chip-name"><span class="med-chip-primary">${getDrugDisplayName(drug || name)}</span>${secondary ? `<span class="med-chip-secondary">${secondary}</span>` : ""}</span>`;
    return `<span class="med-chip" title="${secondary ? secondary.replace(/"/g, "&quot;") : ""}">${labelHtml}${doseHtml}<span class="x" onclick="removeDrug('${escaped}')">×</span></span>`;
  }).join("") + renderActorExposureSummary();
}

function renderActorExposureSummary() {
  if (!activeStack.length || typeof computeActorExposureDeltas !== "function") return "";
  const rows = computeActorExposureDeltas(activeStack)
    .filter(row => row.direction !== "baseline")
    .slice(0, 8);
  if (!rows.length) return "";
  return `<div class="exposure-summary">${rows.map(row => {
    const up = row.direction === "increase";
    const low = row.confidence === "low" || row.qualitative || !row.fold;
    const chipClass = low ? "low" : (up ? "up" : "down");
    const arrow = up ? "↑" : row.direction === "decrease" ? "↓" : "↔";
    const value = row.fold ? `${arrow} ${row.fold.toFixed(row.fold >= 10 ? 1 : 2)}×` : `${arrow} direction only`;
    const parent = row.type === "metabolite" ? ` from ${row.parent}` : "";
    return `<div class="exposure-line">
      <span class="exposure-name">${row.name}</span>
      <span class="exposure-type">${row.type}</span>
      <span class="exposure-chip ${chipClass}">${value}</span>
      <span>${row.driver || "current stack"}${parent}${row.note ? ` · ${row.note}` : ""}</span>
    </div>`;
  }).join("")}</div>`;
}

function renderRiskGauge(risk) {
  const el = document.getElementById("riskBody");
  const pct = Math.min(100, risk.score);
  const barColor = risk.score >= 60 ? "var(--red)" : risk.score >= 30 ? "var(--amber)" : "var(--green)";
  el.innerHTML = `
    <div class="gauge-wrap">
      <div class="gauge-label" style="color:${risk.color}">${risk.level}</div>
      <div class="gauge-bar"><div class="gauge-fill" style="width:${pct}%;background:${barColor}"></div></div>
      <div class="gauge-score">Risk score: ${risk.score}/100</div>
      <div class="risk-factors">
        ${risk.factors.map(f => `<span class="risk-tag ${f.color}">${f.label}</span>`).join("")}
      </div>
    </div>`;
}
