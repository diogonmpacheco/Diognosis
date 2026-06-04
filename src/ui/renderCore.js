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
function setViewMode(m) {
  viewMode = m;
  document.getElementById("searchModeBtn").className = "mode-btn" + (m==="search"?" active":"");
  document.getElementById("browseModeBtn").className = "mode-btn" + (m==="browse"?" active":"");
  document.getElementById("browseWrap").className = "browse-wrap" + (m==="browse"?" show":"");
  if (m==="browse") renderBrowse();
}

function setTab(name) {
  activeTab = name;
  ["safety","pgx","pk","evidence"].forEach(t => {
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
  const tabPanels = ["safety","pgx","pk","evidence"]
    .map(t => document.getElementById("tab-" + t))
    .filter(Boolean);
  if (activeStack.length < 1) {
    bar.style.display = "none";
    tabBar.style.display = "none";
    tabPanels.forEach(panel => { panel.style.display = "none"; });
    if (safetyBtn) safetyBtn.innerHTML = "Safety";
    return;
  }

  bar.style.display = "";
  tabBar.style.display = "";
  tabPanels.forEach(panel => { panel.style.display = ""; });
  setTab(activeTab);

  let scoreHtml = "";
  let headline = "";
  let severeCount = 0;
  if (activeStack.length >= 2) {
    const risk = calcRisk();
    const severeInteractions = risk.interactions.filter(i => i.severity === "severe" || i.severity === "critical");
    severeCount = severeInteractions.length;
    scoreHtml = `<div class="summary-score" style="background:${risk.color}">
        <span class="num">${risk.score}</span><span class="lbl">${risk.level.split(" ")[0]}</span>
      </div>`;
    const topSevere = severeInteractions.slice(0, 2)
      .map(i => `${i.drug1} ↔ ${i.drug2}`).join(", ");
    headline = severeCount > 0
      ? `<strong>${severeCount} severe interaction${severeCount>1?"s":""}</strong>${topSevere ? ": " + topSevere : ""}. <span class="summary-jump" onclick="setTab('safety')">View safety →</span>`
      : `No severe interactions detected across ${activeStack.length} medications. <span class="summary-jump" onclick="setTab('safety')">View details →</span>`;
  } else {
    scoreHtml = `<div class="summary-score" style="background:var(--text2)">
        <span class="num">—</span><span class="lbl">ADD 2+</span></div>`;
    headline = "Add a second medication to check for interactions. Pharmacogenomic and PK analysis for this drug is available in the tabs below.";
  }

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

  bar.innerHTML = `<div class="summary-row">${scoreHtml}<div class="summary-headline">${headline}</div></div>${syndromeHtml}`;
  const badge = severeCount > 0 ? `<span class="tab-badge">${severeCount}</span>` : "";
  if (safetyBtn) safetyBtn.innerHTML = "Safety" + badge;
}

function updateEmptyTabs() {
  ["safety","pgx","pk","evidence"].forEach(t => {
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

function onSearch(q) {
  const el = document.getElementById("searchResults");
  if (!q || q.length < 1) { el.classList.remove("show"); return; }
  const ql = q.toLowerCase();
  const seen = new Set();
  const matches = DRUG_DB.filter(d => {
    if (seen.has(d.name)) return false;
    const nameMatch = d.name.toLowerCase().includes(ql) || d.cls.toLowerCase().includes(ql);
    const brands = BRAND_NAMES[d.name] || [];
    const brandMatch = brands.some(b => b.toLowerCase().includes(ql));
    if (nameMatch || brandMatch) { seen.add(d.name); return true; }
    return false;
  });
  if (!matches.length) { el.innerHTML = '<div class="sr-item"><span class="sr-name" style="color:var(--text2)">No matches found</span></div>'; el.classList.add("show"); return; }

  // Group by practical browse category, while preserving exact class on the row.
  const groups = {};
  matches.forEach(d => {
    const cat = getBrowseCategory(d);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(d);
  });

  let html = "";
  for (const [cls, drugs] of Object.entries(groups)) {
    if (matches.length > 5) html += `<div class="sr-cat">${cls}</div>`;
    drugs.forEach(d => {
      const added = activeStack.includes(d.name);
      const brands = BRAND_NAMES[d.name] || [];
      const brandStr = brands.length ? `<span style="font-size:11px;color:var(--text2);margin-left:4px">(${brands.slice(0,3).join(", ")}${brands.length>3?"…":""})</span>` : "";
      const matchedBrand = brands.find(b => b.toLowerCase().includes(ql));
      const displayName = matchedBrand ? `${highlight(matchedBrand, q)} → ${d.name}` : highlight(d.name, q);
      html += `<div class="sr-item" onclick="${added ? `removeDrug('${d.name.replace(/'/g,"\\'")}')` : `addDrug('${d.name.replace(/'/g,"\\'")}')` }">
        <span><span class="sr-name">${displayName}</span>${!matchedBrand ? brandStr : ""}</span>
        <span>${added ? '<span class="sr-added">✓ Added</span>' : `<span class="sr-class">${d.cls}</span>`}</span>
      </div>`;
    });
  }
  el.innerHTML = html;
  el.classList.add("show");
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

  el.innerHTML = sortedCats.filter(c => groups[c]).map(cat => `
    <div class="browse-cat">
      <div class="browse-cat-title" onclick="toggleBrowseCat(this)">
        ${cat} <span style="font-weight:400;font-size:12px;color:var(--text2)">(${groups[cat].length})</span>
        <span class="arrow">▶</span>
      </div>
      <div class="browse-items" data-cat="${cat}">
        ${groups[cat].sort((a,b)=>a.name.localeCompare(b.name)).map(d =>
          `<div class="browse-chip ${activeStack.includes(d.name)?'added':''}" onclick="toggleDrug('${d.name.replace(/'/g,"\\'")}')">${d.name}<span class="browse-chip-class">${d.cls}</span></div>`
        ).join("")}
      </div>
    </div>
  `).join("");
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
    return `<span class="med-chip">${name}${doseHtml}<span class="x" onclick="removeDrug('${escaped}')">×</span></span>`;
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
