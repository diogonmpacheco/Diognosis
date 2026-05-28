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
function setViewMode(m) {
  viewMode = m;
  document.getElementById("searchModeBtn").className = "mode-btn" + (m==="search"?" active":"");
  document.getElementById("browseModeBtn").className = "mode-btn" + (m==="browse"?" active":"");
  document.getElementById("browseWrap").className = "browse-wrap" + (m==="browse"?" show":"");
  if (m==="browse") renderBrowse();
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

  // Group by class
  const groups = {};
  matches.forEach(d => {
    if (!groups[d.cls]) groups[d.cls] = [];
    groups[d.cls].push(d);
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

function renderBrowse() {
  const el = document.getElementById("browseWrap");
  const groups = {};
  DRUG_DB.forEach(d => {
    let cat = d.cls;
    // Simplify categories
    if (cat.includes("Beta")) cat = "Beta-Blockers";
    else if (cat.includes("Statin")) cat = "Statins";
    else if (cat.includes("SSRI") || cat.includes("SNRI") || cat.includes("TCA") || cat.includes("MAOI") || cat.includes("RIMA") || cat.includes("Antidepressant") || cat.includes("Atypical AD") || cat.includes("NaSSA")) cat = "Antidepressants";
    else if (cat.includes("Benzo")) cat = "Benzodiazepines & Sedatives";
    else if (cat.includes("Opioid") || cat.includes("Analgesic")) cat = "Pain Medications";
    else if (cat.includes("Antiplatelet") || cat.includes("Anticoag") || cat.includes("DOAC")) cat = "Blood Thinners";
    else if (cat.includes("ACE") || cat.includes("ARB") || cat.includes("CCB") || cat.includes("Diuretic") || cat.includes("Antihyper")) cat = "Blood Pressure";
    else if (cat.includes("Antipsychotic") || cat.includes("Psych")) cat = "Antipsychotics";
    else if (cat.includes("Anticonvulsant") || cat.includes("Antiepileptic")) cat = "Anticonvulsants";
    else if (cat.includes("Antibiotic") || cat.includes("Macrolide") || cat.includes("Fluoroquinolone") || cat.includes("Azole") || cat.includes("Antifungal") || cat.includes("Antimicrobial")) cat = "Antibiotics & Antifungals";
    else if (cat.includes("PPI") || cat.includes("H2") || cat.includes("GI") || cat.includes("Antidiarrheal")) cat = "Stomach & GI";
    else if (cat.includes("Supplement") || cat.includes("Vitamin") || cat.includes("Herbal")) cat = "Supplements & Herbs";
    else if (cat.includes("Stimulant") || cat.includes("ADHD")) cat = "Stimulants & ADHD";
    else if (cat.includes("Antihistamine") || cat.includes("Sleep")) cat = "Allergy & Sleep";
    else if (cat.includes("Immunosup")) cat = "Immunosuppressants";
    else if (cat.includes("Recreational") || cat.includes("Hallucinogen") || cat.includes("Empathogen") || cat.includes("Dissociative") || cat.includes("Depressant") || cat.includes("NRI") && cat.includes("Vasodilator") || d.name.includes("Cannabis") || d.name.includes("MDMA") || d.name.includes("GHB") || d.name.includes("Cocaine") || d.name.includes("Heroin") || d.name.includes("Poppers") || d.name.includes("Kratom") || d.name.includes("Ayahuasca") || d.name.includes("Meth") || d.name.includes("Ketamine") || d.name.includes("Psilocybin") || d.name.includes("LSD")) cat = "Recreational & Social";
    if (!groups[cat]) groups[cat] = [];
    if (!groups[cat].find(x => x.name === d.name)) groups[cat].push(d);
  });

  const catOrder = ["Antidepressants","Pain Medications","Blood Pressure","Blood Thinners","Statins","Beta-Blockers",
    "Stomach & GI","Antibiotics & Antifungals","Benzodiazepines & Sedatives","Antipsychotics","Anticonvulsants",
    "Allergy & Sleep","Stimulants & ADHD","Supplements & Herbs","Immunosuppressants","Recreational & Social"];
  const sortedCats = [...new Set([...catOrder, ...Object.keys(groups)])];

  el.innerHTML = sortedCats.filter(c => groups[c]).map(cat => `
    <div class="browse-cat">
      <div class="browse-cat-title" onclick="toggleBrowseCat(this)">
        ${cat} <span style="font-weight:400;font-size:12px;color:var(--text2)">(${groups[cat].length})</span>
        <span class="arrow">▶</span>
      </div>
      <div class="browse-items" data-cat="${cat}">
        ${groups[cat].sort((a,b)=>a.name.localeCompare(b.name)).map(d =>
          `<div class="browse-chip ${activeStack.includes(d.name)?'added':''}" onclick="toggleDrug('${d.name.replace(/'/g,"\\'")}')">${d.name}</div>`
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
  }).join("");
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
