// Diognosis — Genetics panel, combinations, transporters, metabolites
// Phase A: modular source — concatenated by build.js

function renderGenetics() {
  const body = document.getElementById("geneList");
  const addSel = document.getElementById("geneAddSelect");
  const activeGenes = Object.keys(userGenetics);

  const available = GENE_ENZYMES.filter(e => !userGenetics.hasOwnProperty(e));
  addSel.innerHTML = available.map(e => `<option value="${e}">${e}</option>`).join("");

  if (!activeGenes.length) {
    body.innerHTML = '<div class="gene-empty">No gene result added.</div>';
    return;
  }

  body.innerHTML = activeGenes.map(enzyme => {
    const pheno = userGenetics[enzyme];

    return `<div class="gene-row">
      <div class="gene-name">${enzyme}</div>
      <select class="gene-select" data-action="set-genetics" data-gene="${safeAttr(enzyme)}">
        ${PHENOTYPE_OPTIONS
          .filter(o => GENOTYPE_EFFECTS[enzyme]?.[legacyPhenotypeToGenotype(o.id)])
          .map(o => {
            const optionPhenotype = legacyPhenotypeToGenotype(o.id);
            const semantic = genotypeDisplayLabel(enzyme, optionPhenotype);
            const label = semantic && !o.label.toLowerCase().includes(semantic.toLowerCase())
              ? `${semantic} - ${o.label}`
              : o.label;
            return `<option value="${o.id}" ${o.id===pheno?"selected":""}>${label}</option>`;
          }).join("")}
      </select>
      <button type="button" class="gene-remove" data-action="remove-genetics" data-gene="${safeAttr(enzyme)}" title="Remove">✕</button>
    </div>`;
  }).join("");
}

/* ================================================================
   PATHWAY DIVERSION RENDERING
   Shows how blocked enzymes reroute drugs to alternative metabolites
   ================================================================ */

function renderPathwayDiversions() {
  const el = document.getElementById("pdBody");
  if (!activeStack.length) { el.innerHTML = ""; return; }

  // Find drugs with pathway diversion data
  const relevant = activeStack.filter(name => PATHWAY_DIVERSION[name]);
  if (!relevant.length) {
    el.innerHTML = '<div style="text-align:center;color:var(--text2);padding:12px;font-size:13px">No pathway diversion data for your current medications</div>';
    return;
  }

  let html = "";
  relevant.forEach(drugName => {
    const pd = PATHWAY_DIVERSION[drugName];
    const drug = getDrug(drugName);

    // Check if this drug's primary enzyme is affected (PM genetics or DDI)
    const primaryEnzyme = pd.primary.enzyme;
    const isPM = userGenetics[primaryEnzyme] === "poor" || userGenetics[primaryEnzyme] === "null";
    const isInhibited = activeStack.some(other => {
      if (other === drugName) return false;
      const otherDrug = getDrug(other);
      if (!otherDrug) return false;
      const allInh = getAllInhibitions(otherDrug);
      return allInh.some(i => i.target === primaryEnzyme && (i.strength === "strong" || i.strength === "moderate"));
    });
    const isActive = isPM || isInhibited;

    const sevColors = {
      critical: "background:var(--redBg);border-color:var(--red)",
      high: "background:var(--amberBg);border-color:var(--amber)",
      moderate: "background:var(--blueBg);border-color:var(--blue)",
      low: "background:var(--greenBg);border-color:var(--green)"
    };

    html += `<div class="pd-card" ${isActive ? `style="border:2px solid var(--red);box-shadow:0 0 8px rgba(220,38,38,0.15)"` : ""}>`;
    html += `<div class="pd-head">
      <span class="pd-drug">${drugName} <span style="font-size:12px;color:var(--text2);font-weight:400">${drug ? drug.cls : ""}</span></span>
      <span class="pd-sev ${pd.severity}">${pd.severity}</span>
    </div>`;

    if (isActive) {
      html += `<div style="font-size:12px;font-weight:700;color:var(--red);margin-bottom:8px;padding:4px 8px;background:var(--redBg);border-radius:6px">
        ⚠ ACTIVE: ${isPM ? `You are ${primaryEnzyme} PM — this pathway IS diverted` : `${primaryEnzyme} is inhibited by another medication`}
      </div>`;
    }

    // Primary pathway
    html += `<div class="pd-primary">
      <div class="pd-arrow">
        <span style="color:var(--green);font-weight:700">●</span>
        <span class="enzyme">${pd.primary.enzyme}</span>
        <span>→</span>
        <span class="metab">${pd.primary.metabolite}</span>
        <span class="badge" style="background:var(--greenBg);color:var(--green)">${pd.primary.activity.toUpperCase()}</span>
        ${pd.primary.pct ? `<span style="font-size:11px;color:var(--text2)">${pd.primary.pct}%</span>` : ""}
      </div>
    </div>`;

    // Diverted pathways
    pd.diverted.forEach(d => {
      html += `<div class="pd-diverted">
        <div class="pd-arrow">
          <span style="color:var(--amber);font-weight:700">◐</span>
          <span class="enzyme">${d.enzyme}</span>
          <span>→</span>
          <span class="metab">${d.metabolite}</span>
          <span class="badge" style="${d.activity === 'inactive' ? 'background:#f1f5f9;color:#64748b' : d.activity.includes('potent') ? 'background:var(--redBg);color:var(--red)' : d.activity.includes('toxic') || d.activity === 'neurotoxic' ? 'background:var(--redBg);color:var(--red)' : 'background:var(--amberBg);color:var(--amber)'}">${d.activity.toUpperCase()}</span>
          ${d.pct ? `<span style="font-size:11px;color:var(--text2)">${d.pct}%</span>` : ""}
        </div>
        ${d.note ? `<div style="font-size:11px;color:var(--text2);padding-left:18px">${safePublicHtml(d.note)}</div>` : ""}
      </div>`;
    });

    // Clinical impact
    html += `<div class="pd-impact" style="${sevColors[pd.severity] || ''}">
      <strong>Clinical impact:</strong> ${pd.clinicalImpact}
      ${pd.pmEffect ? `<br><span style="font-size:11px">PM effect: ${pd.pmEffect.replace(/_/g, " ")}</span>` : ""}
      ${pd.umEffect ? ` · <span style="font-size:11px">UM effect: ${pd.umEffect.replace(/_/g, " ")}</span>` : ""}
    </div>`;

    html += `</div>`;
  });

  el.innerHTML = html;
}

/* ================================================================
   COMBINATION PRODUCTS RENDERING
   Shows new substances/effects from drug combos
   ================================================================ */

function findActiveCombinations() {
  const results = [];
  COMBINATION_PRODUCTS.forEach(cp => {
    const allPresent = cp.drugs.every(d => activeStack.includes(d));
    if (allPresent) results.push(cp);
  });
  return results;
}

function renderCombinationProducts() {
  const el = document.getElementById("comboBody");
  const countEl = document.getElementById("comboCount");
  const combos = findActiveCombinations();

  if (!combos.length) {
    el.innerHTML = '<div style="text-align:center;color:var(--green);padding:12px;font-weight:600">No combination substance alerts for your medications</div>';
    countEl.textContent = "";
    return;
  }

  countEl.textContent = `${combos.length} alert${combos.length > 1 ? "s" : ""}`;
  const typeLabels = {
    toxic_overlap: "Toxic Overlap", pathway_competition: "Pathway Competition",
    reactive_intermediate: "Reactive Intermediate", dual_saturation: "Dual Saturation",
    additive_channel_block: "Channel Blockade", additive_bleeding: "Additive Bleeding",
    nephrotoxic_synergy: "Nephrotoxic Synergy", hyperkalemia_cascade: "Hyperkalemia Cascade"
  };
  const typeColors = {
    toxic_overlap: "background:var(--red);color:#fff", pathway_competition: "background:var(--purple);color:#fff",
    reactive_intermediate: "background:#dc2626;color:#fff", dual_saturation: "background:var(--amber);color:#fff",
    additive_channel_block: "background:#7c3aed;color:#fff", additive_bleeding: "background:#dc2626;color:#fff",
    nephrotoxic_synergy: "background:#b91c1c;color:#fff", hyperkalemia_cascade: "background:#ea580c;color:#fff"
  };

  const helper = '<div class="active-moiety-intro">Modeled combination-product and additive-burden rows used for review. Overview keeps the ranked interpretation.</div>';
  el.innerHTML = helper + combos.map(cp => {
    const sevClass = cp.severity === "critical" ? "critical" : cp.severity === "high" ? "high" : "moderate";
    return `<div class="cp-card ${sevClass}">
      <span class="cp-type" style="${typeColors[cp.type] || 'background:var(--amber);color:#fff'}">${typeLabels[cp.type] || cp.type}</span>
      <div class="cp-drugs">${cp.drugs.join(" + ")}</div>
      ${cp.metabolite ? `<div style="font-size:13px;font-weight:600;color:var(--red);margin-bottom:4px">→ ${cp.metabolite}</div>` : ""}
      <div class="cp-mech">${cp.mechanism}</div>
      ${cp.result ? `<div class="cp-result">
        ${cp.result.increased ? `<span style="color:var(--red);font-weight:600">↑ ${cp.result.increased}</span>` : ""}
        ${cp.result.decreased ? ` · <span style="color:var(--blue);font-weight:600">↓ ${cp.result.decreased}</span>` : ""}
      </div>` : ""}
      ${cp.effect ? `<div style="font-size:13px;font-weight:600;margin-top:4px">${cp.effect}</div>` : ""}
      ${cp.risk ? `<div style="font-size:13px;font-weight:600;margin-top:4px;color:var(--red)">${cp.risk}</div>` : ""}
      ${cp.management ? `<div class="cp-mgmt">Management: ${cp.management}</div>` : ""}
      ${cp.alternative ? `<div style="font-size:12px;margin-top:4px;color:var(--green);font-weight:600">Alternative: ${cp.alternative}</div>` : ""}
    </div>`;
  }).join("");
}

/* ================================================================
   TRANSPORTER DDI RENDERING
   Shows P-gp, OATP, OCT, OAT interactions
   ================================================================ */

function findActiveTransporterDDI() {
  const results = [];
  TRANSPORTER_DDI.forEach(t => {
    const subPresent = activeStack.includes(t.substrate);
    const inhPresent = activeStack.includes(t.inhibitor) ||
      (t.inhibitor === "NSAIDs" && activeStack.some(n => {
        const d = getDrug(n);
        return d && d.cls === "NSAID";
      }));
    if (subPresent && inhPresent) {
      results.push({
        ...t,
        actualInhibitor: t.inhibitor === "NSAIDs"
          ? activeStack.find(n => { const d = getDrug(n); return d && d.cls === "NSAID"; })
          : t.inhibitor
      });
    }
  });
  return results;
}

function renderTransporterDDI() {
  const el = document.getElementById("transporterBody");
  const countEl = document.getElementById("transporterCount");
  const tddi = findActiveTransporterDDI();

  if (!tddi.length) {
    el.innerHTML = '<div style="text-align:center;color:var(--green);padding:12px;font-weight:600">No transporter-mediated interactions detected</div>';
    countEl.textContent = "";
    return;
  }

  countEl.textContent = `${tddi.length} found`;
  el.innerHTML = tddi.map(t => {
    const sevClass = t.severity === "critical" ? "critical" : t.severity === "high" ? "high" : "moderate";
    return `<div class="tr-card ${sevClass}">
      <div class="tr-head">
        <span class="tr-drugs">${safePublicHtml(t.actualInhibitor || t.inhibitor)} -> ${safePublicHtml(t.substrate)}</span>
        <span class="tr-transporter">${safePublicHtml(t.transporter)}</span>
      </div>
      <div class="tr-effect">${safePublicHtml(t.effect)}</div>
      <div class="tr-mech">${safePublicHtml(t.mechanism)}</div>
    </div>`;
  }).join("");
}

/* ================================================================
   METABOLITE CASCADE RENDERING with full cross-referencing
   ================================================================ */

function renderMetabolites() {
  const el = document.getElementById("metabBody");
  if (!activeStack.length) { el.innerHTML = ""; return; }

  const analysis = analyzeMetabolites();
  let html = `<div class="active-moiety-intro">These supporting details list modeled metabolites. Use Drug & Metabolite Balance above for interpreted directionality and risk context.</div>`;

  activeStack.forEach(drugName => {
    const drug = getDrug(drugName);
    const mets = METAB[drugName];
    const fold = calcFold(drugName);

    html += `<div style="margin-bottom:16px;padding:12px;background:var(--card2);border-radius:var(--radius);border:1px solid var(--border)">`;
    html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <strong style="font-size:14px">${safePublicHtml(drugName)}</strong>
      <span style="font-size:12px;color:var(--text2)">${safePublicHtml(drug ? drug.cls : "")} ${fold.fold !== 1 ? `· <strong style="color:${fold.fold>=2?'var(--red)':fold.fold<=0.5?'var(--blue)':'var(--amber)'}">${safePublicHtml(fold.fold.toFixed(1))}x AUC</strong>` : ""}</span>
    </div>`;

    const displayMets = (mets || []).filter(m => !isPublicSyntheticContextRow(m));
    if (!displayMets.length) {
      html += `<div style="font-size:12px;color:var(--text2);font-style:italic">Metabolite data not yet catalogued</div>`;
    } else {
      displayMets.forEach(m => {
        const activity = normalizeMetaboliteActivity(m.a);
        const badgeColors = { toxic: "background:var(--redBg);color:var(--red)", active_form: "background:var(--purpleBg);color:var(--purple)", active: "background:var(--blueBg);color:var(--blue)", active_equipotent: "background:var(--blueBg);color:var(--blue)", active_potent: "background:var(--purpleBg);color:var(--purple)", weak: "background:var(--amberBg);color:var(--amber)", inactive: "background:#f1f5f9;color:#64748b" };
        const badgeLabels = { toxic: "TOXIC", active_form: "ACTIVE FORM", active: "ACTIVE", active_equipotent: "ACTIVE", active_potent: "POTENT", weak: "WEAK", inactive: "INACTIVE" };
        const badgeKey = String(activity).startsWith("active") && !badgeColors[activity] ? "active" : activity;
        const bc = badgeColors[badgeKey] || badgeColors.inactive;
        const bl = badgeLabels[badgeKey] || "INACTIVE";

        html += `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;flex-wrap:wrap">
          <span style="color:var(--accent);font-weight:700">→</span>
          <span style="font-size:13px;font-weight:600">${safePublicHtml(publicMetaboliteLabel(m, drugName))}</span>
          ${m.p ? `<span style="font-size:11px;color:var(--text2);background:var(--card);padding:1px 6px;border-radius:6px;border:1px solid var(--border)">${m.p}%</span>` : ""}
          <span style="font-size:11px;padding:1px 6px;border-radius:6px;background:#e0e7ff;color:#3730a3">${safePublicHtml(m.e)}</span>
          <span style="font-size:10px;padding:1px 6px;border-radius:6px;font-weight:700;${bc}">${safePublicHtml(bl)}</span>
          ${m.t ? `<span style="font-size:10px;color:var(--text2)">t½ ${safePublicHtml(m.t)}h</span>` : ""}
        </div>`;
        if (m.note) html += `<div style="padding:0 0 2px 22px;font-size:11px;color:var(--text2);line-height:1.3">${safePublicHtml(m.note)}</div>`;
        if (m.inh && m.inh.length) {
          html += `<div style="padding:0 0 2px 22px;font-size:11px;color:var(--amber);font-weight:600">Inhibits: ${safePublicHtml(m.inh.map(i=>`${i.e} (${i.s})`).join(", "))}</div>`;
        }
      });
    }

    // COMBINATION METABOLITES — substances created when this drug combines with another in the stack
    const comboMets = COMBINATION_PRODUCTS.filter(cp =>
      cp.drugs.includes(drugName) && cp.drugs.every(d => activeStack.includes(d)) && cp.metabolite
    );
    if (comboMets.length) {
      comboMets.forEach(cp => {
        const otherDrug = cp.drugs.find(d => d !== drugName);
        const sevColors = { critical: "border-color:var(--red);background:var(--redBg)", high: "border-color:var(--amber);background:var(--amberBg)", moderate: "border-color:var(--blue);background:var(--blueBg)" };
        const sevStyle = sevColors[cp.severity] || sevColors.high;
        html += `<div style="margin-top:8px;padding:10px 12px;border-left:4px solid;border-radius:0 8px 8px 0;${sevStyle}">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span style="font-size:14px">⚗</span>
            <span style="font-size:13px;font-weight:700;color:var(--red)">${safePublicHtml(cp.metabolite)}</span>
            <span style="font-size:10px;padding:1px 8px;border-radius:8px;font-weight:700;background:var(--red);color:#fff">COMBINATION</span>
            <span style="font-size:11px;color:var(--text2)">with ${safePublicHtml(otherDrug)}</span>
          </div>
          <div style="font-size:12px;margin-top:4px;line-height:1.4;color:var(--text)">${safePublicHtml(cp.mechanism)}</div>
          ${cp.effect ? `<div style="font-size:12px;margin-top:4px;font-weight:600;color:var(--red)">${safePublicHtml(cp.effect)}</div>` : ""}
          ${cp.risk ? `<div style="font-size:12px;margin-top:2px;font-weight:600;color:var(--red)">${safePublicHtml(cp.risk)}</div>` : ""}
          ${cp.management ? `<div style="font-size:11px;margin-top:4px;font-style:italic;color:var(--text2)">Management: ${safePublicHtml(cp.management)}</div>` : ""}
        </div>`;
      });
    }

    // Cross-ref: metabolite ↔ drug matches
    const matches = (analysis.drugMatches[drugName] || []).filter(mx => !isPublicSyntheticContextRow(mx.metabolite));
    if (matches && matches.length) {
      html += `<div style="margin-top:8px;padding:8px 10px;background:var(--amberBg);border-radius:8px;border:1px solid #fde68a">
        <div style="font-size:12px;font-weight:700;color:var(--amber);margin-bottom:4px">Metabolite database overlap</div>`;
      matches.forEach(mx => {
        const inStack = activeStack.includes(mx.matchedDrug);
        html += `<div style="font-size:12px;color:#92400e">-> <strong>${safePublicHtml(publicMetaboliteLabel(mx.metabolite, drugName))}</strong> may overlap with database substance <strong>${safePublicHtml(mx.matchedDrug)}</strong>${inStack ? " <span style='color:var(--red);font-weight:700'>(in your stack)</span>" : " (in database)"}</div>`;
      });
      html += `</div>`;
    }

    html += `</div>`;
  });

  // Global cross-reference alerts
  if (analysis.enzymeConflicts.length) {
    html += `<div style="margin-top:12px;padding:12px;background:var(--redBg);border-radius:var(--radius);border:1px solid #fecaca">
      <div style="font-size:13px;font-weight:700;color:var(--red);margin-bottom:6px">🔬 Metabolite-Level Enzyme Conflicts</div>`;
    const seen = new Set();
    analysis.enzymeConflicts.forEach(c => {
      const key = `${c.inhibitor}-${c.victim}-${c.enzyme}`;
      if (seen.has(key)) return;
      seen.add(key);
      html += `<div style="font-size:12px;color:#991b1b;margin-bottom:4px;line-height:1.4">
        <strong>${safePublicHtml(c.inhibitor)}</strong>'s metabolite <em>${safePublicHtml(c.metabolite)}</em> ${safePublicHtml(c.strength)}ly inhibits ${safePublicHtml(c.enzyme)}
        -> affects <strong>${safePublicHtml(c.victim)}</strong>'s metabolite <em>${safePublicHtml(c.affectedMetabolite)}</em> (${safePublicHtml(c.activity)})
      </div>`;
    });
    html += `</div>`;
  }

  if (analysis.toxicOverlap.length) {
    html += `<div style="margin-top:8px;padding:12px;background:var(--redBg);border-radius:var(--radius);border:1px solid #fecaca">
      <div style="font-size:13px;font-weight:700;color:var(--red);margin-bottom:6px">☠ Shared Toxic Metabolite Pathways</div>`;
    analysis.toxicOverlap.forEach(t => {
      html += `<div style="font-size:12px;color:#991b1b;margin-bottom:4px">${t.drugs.map(d => `<strong>${safePublicHtml(d.drug)}</strong> -> ${safePublicHtml(d.metabolite)}`).join(" + ")} (via ${safePublicHtml(t.pathway.split(":")[0])})</div>`;
    });
    html += `</div>`;
  }

  el.innerHTML = html;
}

// Close search results when clicking outside
