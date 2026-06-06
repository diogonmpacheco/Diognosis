// MedCheck — Interaction cards, fold bars, timing, matrix
// Phase A: modular source — concatenated by build.js

function renderInteractions(interactions) {
  const el = document.getElementById("interBody");
  const countEl = document.getElementById("interCount");
  const curatedInteractions = interactions.filter(isCuratedInteractionWarning);
  if (!curatedInteractions.length) {
    el.innerHTML = '<div class="finding-empty">No curated interaction warning is documented for this stack. Check Mechanistic Interpretation for modeled pathway read-through.</div>';
    countEl.textContent = "";
    return;
  }
  countEl.textContent = `${curatedInteractions.length} curated`;
  el.innerHTML = curatedInteractions.map((i, idx) => {
    const mechText = simplifyMechanism(i);
    const traceText = buildInteractionTrace(i);
    const actionText = clinicalActionForInteraction(i);
    const studies = resolveInteractionEvidence(i);
    const hasContradiction = studies.some(s => s.contradicts && s.contradicts.length);
    const maxWeight = studies.length
      ? Math.max(...studies.map(s => EVIDENCE_WEIGHT[s.type] || 0.5))
      : null;
    const tierLabel = maxWeight
      ? studies.find(s => (EVIDENCE_WEIGHT[s.type] || 0) === maxWeight)?.type?.replace(/_/g,' ') || ''
      : '';

    const evSummary = studies.length
      ? `<div class="ev-study-count">${studies.length} supporting stud${studies.length===1?'y':'ies'} · Highest: ${tierLabel.toUpperCase()}${hasContradiction ? ' · <span style="color:var(--amber)">⚠ contradictory evidence exists</span>' : ''}</div>`
      : '';

    const hasEv = studies.length > 0;
    const reviewLabel = studies.some(s => s.reviewStatus === "verified") ? "human-reviewed evidence" : "needs evidence review";
    const reviewClass = studies.some(s => s.reviewStatus === "verified") ? "review" : "warn";
    const findingTitle = buildFindingTitle(i);
    const pathwayLabel = i.enzyme || i.category || i.type || "pathway";

    return `<div class="finding-card ${i.severity}">
      <div class="finding-top">
        <div>
          <div class="finding-title">${findingTitle}</div>
          <div class="finding-subtitle">${i.drug1} + ${i.drug2}</div>
        </div>
        <span class="finding-sev ${i.severity}">${i.severity}</span>
      </div>
      <div class="finding-effect">${i.effect}</div>
      <div class="finding-grid">
        <div class="finding-detail"><strong>Why</strong>${mechText || "Mechanism not specified."}</div>
        <div class="finding-detail"><strong>Pathway</strong>${pathwayLabel}</div>
        <div class="finding-detail"><strong>Discuss</strong>${actionText ? actionText.replace(/^Action:\s*/,"") : "Monitor in clinical context."}</div>
      </div>
      ${traceText ? `<div class="inter-trace">${traceText}</div>` : ""}
      <div class="finding-meta">
        <span class="finding-tag">${i.type || "interaction"}</span>
        ${hasEv ? `<span class="finding-tag">${studies.length} stud${studies.length===1?'y':'ies'}</span>` : '<span class="finding-tag warn">no linked study yet</span>'}
        ${hasEv ? `<span class="finding-tag ${reviewClass}">${reviewLabel}</span>` : ""}
      </div>
      ${hasEv ? `${evSummary}<div class="ev-summary-line"><span class="summary-jump" onclick="setTab('evidence')">Open Evidence tab</span> for citations and review status.</div>` : ''}
    </div>`;
  }).join("");
}

function isCuratedInteractionWarning(interaction) {
  if (!interaction) return false;
  if (interaction.type === "known-ddi" || interaction.source === "known" || interaction.sourceEngine === "curated") return true;
  return !!(interaction.evidenceRefs && interaction.evidenceRefs.length && interaction.evidenceStatus === "explicit");
}

function buildFindingTitle(i) {
  if (!i) return "Interaction finding";
  const effect = String(i.effect || "").toLowerCase();
  if (i.category === "prodrug" || /activation|active metabolite|less effective|reduced efficacy/.test(effect)) {
    return `${i.drug1} may reduce ${i.drug2} effect`;
  }
  if (i.category === "bleed" || /bleed|anticoagul|platelet/.test(effect)) {
    return `${i.drug1} and ${i.drug2} may raise bleeding risk`;
  }
  if (i.category === "qtc" || /qt|arrhythm/.test(effect)) {
    return `${i.drug1} and ${i.drug2} may add QT risk`;
  }
  if (i.category === "serotonin" || /serotonin/.test(effect)) {
    return `${i.drug1} and ${i.drug2} may add serotonin toxicity risk`;
  }
  if (i.type === "induction" || /decrease|reduced|lower|speeds/.test(effect)) {
    return `${i.drug1} may lower ${i.drug2} exposure`;
  }
  if (i.type === "inhibition" || i.type === "transporter" || /increase|higher|raises|toxicity/.test(effect)) {
    return `${i.drug1} may raise ${i.drug2} exposure`;
  }
  return `${i.drug1} and ${i.drug2} need review`;
}

function simplifyMechanism(i) {
  if (i.mechanism) return i.mechanism;
  if (i.type === "inhibition") return `${i.drug1} slows the breakdown of ${i.drug2} by blocking ${i.enzyme}`;
  if (i.type === "induction") return `${i.drug1} speeds up the breakdown of ${i.drug2} by activating ${i.enzyme}`;
  if (i.type === "pharmacodynamic") return `Both medications have similar effects that add up`;
  if (i.type === "combination") return `Drug combination creates new substance or amplified effect`;
  if (i.type === "transporter") return `${i.drug1} blocks ${i.enzyme} transporter, increasing ${i.drug2} levels`;
  if (i.type === "metabolite-chain") return `${i.drug1}'s metabolite inhibits ${i.enzyme}, affecting ${i.drug2} metabolism`;
  return "";
}

function buildInteractionTrace(i) {
  if (!i) return "";
  if (i.type === "metabolite-chain") return `Path: ${i.drug1} changes an active metabolite/inhibitor, then ${i.enzyme || i.category || "the pathway"} changes ${i.drug2} exposure.`;
  if (i.type === "inhibition") return `Path: ${i.drug1} inhibits ${i.enzyme || "a clearance pathway"}, so ${i.drug2} exposure can rise.`;
  if (i.type === "induction") return `Path: ${i.drug1} induces ${i.enzyme || "a clearance pathway"}, so ${i.drug2} exposure can fall.`;
  if (i.type === "transporter" || i.category === "transporter") return `Path: ${i.drug1} changes ${i.enzyme || i.category || "transporter"} movement, so ${i.drug2} tissue or blood exposure can shift.`;
  if (i.category === "prodrug") return `Path: ${i.drug1} affects ${i.drug2} activation, so active-metabolite formation or clinical effect may fall.`;
  if (i.category === "bleed") return `Path: ${i.drug1} and ${i.drug2} add anticoagulant or platelet effects, raising bleeding risk.`;
  if (i.category === "serotonin") return `Path: ${i.drug1} and ${i.drug2} add serotonergic effects, raising serotonin-toxicity risk.`;
  if (i.category === "qtc") return `Path: ${i.drug1} and ${i.drug2} add repolarization effects, raising QTc risk.`;
  if (i.mechanism) return `Path: ${i.drug1} plus ${i.drug2}: ${i.mechanism}`;
  return "";
}

function clinicalActionForInteraction(i) {
  if (!i) return "";
  if (i.severity === "severe") {
    if (i.category === "bleed") return "Action: avoid or use specialist monitoring for bleeding risk.";
    if (i.category === "prodrug") return "Action: consider an alternative that does not need the blocked activation pathway.";
    if (i.category === "transporter") return "Action: avoid combination or monitor levels/toxicity closely.";
    return "Action: avoid combination when possible or use clinician-guided dose/monitoring plan.";
  }
  if (i.severity === "moderate") return "Action: monitor response/adverse effects; dose or timing adjustment may be needed.";
  return "Action: usually monitor; context matters.";
}

function renderFoldBars() {
  const el = document.getElementById("foldBody");
  el.innerHTML = activeStack.map(name => {
    const result = calcFold(name);
    const fold = result.fold;
    const drug = getDrug(name);
    const isProdrug = drug && drug.prodrug;

    let color, tagText, tagColor;
    if (fold >= 4) { color = "var(--red)"; tagText = "DANGER"; tagColor = "background:var(--redBg);color:var(--red)"; }
    else if (fold >= 2) { color = "var(--amber)"; tagText = "HIGH"; tagColor = "background:var(--amberBg);color:var(--amber)"; }
    else if (fold >= 1.5) { color = "var(--amber)"; tagText = "ELEVATED"; tagColor = "background:var(--amberBg);color:var(--amber)"; }
    else if (fold <= 0.5) { color = isProdrug ? "var(--red)" : "var(--blue)"; tagText = isProdrug ? "REDUCED" : "LOW"; tagColor = isProdrug ? "background:var(--redBg);color:var(--red)" : "background:var(--blueBg);color:var(--blue)"; }
    else { color = "var(--green)"; tagText = "NORMAL"; tagColor = "background:var(--greenBg);color:var(--green)"; }

    // Normalize bar width: 1× = 50%, scale proportionally
    const barPct = Math.min(100, Math.max(5, (fold / 5) * 100));
    const normalPct = 20; // where 1× sits

    // Show details
    const detailText = result.details.length
      ? result.details.map(d => `${d.perpetrator}: ${d.enzyme} ${d.type} (${d.strength})`).join(", ")
      : "No interactions affecting levels";

    const metaboliteRows = (typeof getGenotypeMetaboliteEffectCards === 'function'
      ? getGenotypeMetaboliteEffectCards(name)
      : []
    ).map(card => renderFoldMetaboliteRow(card)).join("");
    const contextRows = renderFoldExposureContextRows(name);

    return `<div class="fold-row">
      <div class="fold-name">${name}</div>
      <div class="fold-bar-wrap">
        <div class="fold-bar" style="width:${barPct}%;background:${color}">${fold.toFixed(1)}×</div>
      </div>
      <div class="fold-val" style="color:${color}">${fold.toFixed(1)}×<span class="fold-tag" style="${tagColor}">${tagText}</span></div>
    </div>${contextRows}${metaboliteRows}`;
  }).join("");
}

function renderFoldExposureContextRows(name) {
  const drug = getDrug(name);
  if (!drug) return "";
  const selfInh = (drug.inh || []).filter(inh =>
    inh.autoInhibition && drug.routes.some(route => route.enzyme === inh.target)
  );
  if (!selfInh.length) return "";
  const doseInfo = DOSE_TIERS[name];
  const tier = getDoseTier(name);
  const doseLabel = doseInfo?.tiers?.[tier]?.label || "selected dose";
  return selfInh.map(inh => {
    const exposureFold = estimateSelfInhibitionDoseFold(name, inh);
    const foldText = exposureFold ? `${exposureFold.toFixed(1)}x` : "dose-linked";
    const dosePhrase = inh.doseDependent
      ? `${doseLabel}: ~${foldText} parent exposure vs standard-dose NM baseline`
      : `nonlinear ${inh.target} self-inhibition`;
    const label = `${dosePhrase}; nonlinear ${inh.target} self-inhibition`;
    return renderFoldSubRow({
      title:`${name} parent`,
      subtitle:"self-inhibition context",
      tagText:`PARENT ${exposureFold && exposureFold < 1 ? "↓" : "↑"}`.trim(),
      color:"var(--amber)",
      summary:label,
      valueText:exposureFold ? foldText : "",
      fold:exposureFold,
    });
  }).join("");
}

function estimateSelfInhibitionDoseFold(name, inh) {
  const drug = getDrug(name);
  if (!drug || !inh) return null;
  const route = drug.routes.find(r => r.enzyme === inh.target);
  if (!route) return null;
  const genePheno = typeof userGenetics !== 'undefined' ? userGenetics[route.enzyme] : null;
  const clinEnz = CLINICAL_FOLD[name]?.[route.enzyme];
  const clinFold = clinEnz && (genePheno === "poor" || genePheno === "null")
    ? clinEnz[genePheno]
    : null;
  const clinBaseMult = clinFold && route.fraction > 0
    ? Math.max(0.01, (clinFold - (1 - route.fraction)) / route.fraction)
    : 1.0;
  const doseMod = inh.doseDependent ? getDoseModifier(name) : 1.0;
  const baseGamma = route.saturable || route.nonLinear ? 2.5 : 1.8;
  const gamma = genePheno === "null" ? 1.0 :
    genePheno === "poor" ? baseGamma * 0.6 :
    baseGamma;
  const enzymeMult = clinBaseMult * Math.pow(doseMod || 1, gamma);
  const remaining = Math.max(0, 1 - route.fraction);
  const fold = route.fraction * enzymeMult + remaining;
  return Math.round(fold * 100) / 100;
}

function renderFoldMetaboliteRow(card) {
  const { effect, phenotypeEffect } = card;
  const fold = phenotypeEffect.fold || null;
  const isIncrease = phenotypeEffect.direction === "increase";
  const isDecrease = phenotypeEffect.direction === "decrease";
  const foldStr = fold
    ? `${phenotypeEffect.estimated ? "~" : ""}${fold.toFixed(fold === 1 ? 1 : fold >= 10 ? 1 : 2)}x`
    : "";
  const tagText = isIncrease ? "INCREASE" : isDecrease ? "DECREASE" :
    phenotypeEffect.direction === "baseline" ? "BASELINE" : "CONTEXT";
  const color = isIncrease && fold && fold >= 10 ? "var(--red)" :
    isIncrease ? "var(--amber)" :
    isDecrease ? "var(--green)" :
    "var(--text2)";
  const summary = phenotypeEffect.direction === "baseline"
    ? "reference level (NM)"
    : fold && fold !== 1
    ? `${foldStr} / ${phenotypeEffect.label}${phenotypeEffect.estimated ? " (model estimate)" : ""}`
    : phenotypeEffect.label;
  const signal = getExposureSignalLabel(effect, phenotypeEffect);
  const action = effect.clinicalAction || clinicalActionForMetaboliteEffect(effect, phenotypeEffect);

  return renderFoldSubRow({
    title:effect.metaboliteName,
    subtitle:`from ${effect.parent}`,
    tagText,
    color,
    summary:`${signal}: ${summary}${action ? ` · ${action}` : ""}`,
    valueText:foldStr,
    fold,
  });
}

function getExposureSignalLabel(effect, phenotypeEffect) {
  const signal = effect.exposureSignal || phenotypeEffect.exposureSignal || "";
  if (signal === "parent") return "parent context";
  if (signal === "active_moiety") return "active-moiety context";
  if (signal === "metabolite" || !signal) return "metabolite level";
  return signal.replace(/_/g, " ");
}

function clinicalActionForMetaboliteEffect(effect, phenotypeEffect) {
  if (!phenotypeEffect || phenotypeEffect.direction === "baseline") return "";
  if (effect.enzyme === "DPYD") return "avoid or specialist-dose fluoropyrimidines";
  if (effect.enzyme === "TPMT") return "reduce/avoid thiopurine and monitor CBC";
  if (effect.enzyme === "UGT1A1") return "monitor CBC and consider lower irinotecan start";
  if (phenotypeEffect.direction === "decrease" && /prodrug|activation|active metabolite|bioactivation/i.test(effect.note || "")) return "monitor efficacy or consider non-activated alternative";
  if (phenotypeEffect.direction === "increase") return "monitor toxicity or reduce exposure when clinically appropriate";
  return "interpret with parent row";
}

function renderFoldSubRow({ title, subtitle, tagText, color, summary, valueText = "", fold = null }) {
  const hasFoldBar = Number.isFinite(fold) && fold > 0;
  if (hasFoldBar) {
    const barPct = Math.min(100, Math.max(5, (fold / 5) * 100));
    return `<div class="fold-row fold-metabolite-row fold-quantified-row">
      <div class="fold-name fold-metabolite-name">${title} <span>${subtitle}</span></div>
      <div class="fold-subbar-cell">
        <div class="fold-bar-wrap fold-metabolite-bar-wrap">
          <div class="fold-bar fold-metabolite-bar" style="width:${barPct}%;background:${color}">${valueText}</div>
        </div>
        <div class="fold-metabolite-note" style="color:${color}"><span class="fold-tag fold-metabolite-tag">${tagText}</span> ${summary}</div>
      </div>
      <div class="fold-val fold-metabolite-val" style="color:${color}">${valueText}</div>
    </div>`;
  }
  return `<div class="fold-row fold-metabolite-row">
    <div class="fold-name fold-metabolite-name">${title} <span>${subtitle}</span></div>
    <div class="fold-metabolite-note" style="color:${color}"><span class="fold-tag fold-metabolite-tag">${tagText}</span> ${summary}</div>
    <div class="fold-val fold-metabolite-val" style="color:${color}">${valueText}</div>
  </div>`;
}

function renderMatrix(interactions) {
  const el = document.getElementById("matrixBody");
  if (activeStack.length < 2) { el.innerHTML = ""; return; }
  const drugs = activeStack;
  // Build lookup
  const lookup = {};
  interactions.forEach(i => {
    const k1 = `${i.drug1}|${i.drug2}`, k2 = `${i.drug2}|${i.drug1}`;
    if (!lookup[k1] || severityRank(i.severity) > severityRank(lookup[k1].severity)) lookup[k1] = i;
    if (!lookup[k2] || severityRank(i.severity) > severityRank(lookup[k2].severity)) lookup[k2] = i;
  });

  const shortName = n => n.length > 12 ? n.slice(0,11) + "…" : n;

  let html = '<div class="matrix-wrap"><table class="matrix"><tr><th></th>';
  drugs.forEach(d => html += `<th>${shortName(d)}</th>`);
  html += "</tr>";
  drugs.forEach((row,ri) => {
    html += `<tr><th>${shortName(row)}</th>`;
    drugs.forEach((col,ci) => {
      if (ri === ci) { html += '<td class="m-self">—</td>'; return; }
      const key = `${row}|${col}`;
      const inter = lookup[key];
      if (inter) {
        html += `<td><span class="m-sev ${inter.severity}">${inter.severity.charAt(0).toUpperCase()}</span></td>`;
      } else {
        html += '<td style="color:#cbd5e1">✓</td>';
      }
    });
    html += "</tr>";
  });
  html += "</table></div>";
  el.innerHTML = html;
}

function severityRank(s) { return s === "severe" ? 3 : s === "moderate" ? 2 : 1; }

// ── renderEvidenceExplorer — full study browser ──
// Shows all STUDY_DB entries that are relevant to the current drug stack,
// filterable by evidence tier. Each card shows full provenance.
