// Diognosis — Genotype panel and phenotype selector
// Phase A: modular source — concatenated by build.js

const GENOTYPE_METABOLITE_RISK_KEYS = {
  G6PD: "G6PD deficiency",
};

function renderGenotypePanel() {
  const sec = document.getElementById("genotypeSection");
  const el = document.getElementById("genotypeBody");
  if (!el) return;
  if (activeStack.length < 1) {
    hideSectionAndClear("genotypeSection", "genotypeBody");
    return;
  }
  if (sec) sec.style.display = "";

  // Determine which enzymes are relevant for current stack
  const relevantEnzymes = new Set();
  const relevantRiskAlleles = new Set();
  for (const name of activeStack) {
    const drug = DRUG_DB.find(d => d.name === name);
    if (!drug) continue;
    for (const r of (drug.routes || [])) relevantEnzymes.add(r.enzyme);
    for (const i of (drug.inh || [])) relevantEnzymes.add(i.target);
    for (const i of (drug.ind || [])) relevantEnzymes.add(i.target);
    for (const i of (drug.metInh || [])) relevantEnzymes.add(i.target);
    const diversion = PATHWAY_DIVERSION[name];
    if (diversion?.primary?.enzyme) relevantEnzymes.add(diversion.primary.enzyme);
    for (const d of (diversion?.diverted || [])) {
      if (d.enzyme) relevantEnzymes.add(d.enzyme);
    }
    const genotypeMetaboliteEffects = typeof GENOTYPE_METABOLITE_EFFECTS !== 'undefined' ? GENOTYPE_METABOLITE_EFFECTS : [];
    for (const effect of genotypeMetaboliteEffects) {
      if (effect.parent === name && effect.enzyme) relevantEnzymes.add(effect.enzyme);
    }
    const genotypeRiskEffects = typeof GENOTYPE_RISK_EFFECTS !== 'undefined' ? GENOTYPE_RISK_EFFECTS : {};
    for (const [riskKey, risk] of Object.entries(genotypeRiskEffects)) {
      if ((risk.drugEffects || []).some(effect => effect.parent === name)) relevantRiskAlleles.add(riskKey);
    }
  }
  const showEnzymes = Object.keys(GENOTYPE_EFFECTS).filter(e => relevantEnzymes.has(e));
  const showRiskAlleles = Object.keys(typeof GENOTYPE_RISK_EFFECTS !== 'undefined' ? GENOTYPE_RISK_EFFECTS : {}).filter(e => relevantRiskAlleles.has(e));
  const importHtml = renderPharmGxImportCard();
  const sourcePgxContextHtml = renderSourcePgxContext();
  const pgxActionSummaryHtml = renderPgxActionSummaryCards();
  if (showEnzymes.length === 0 && showRiskAlleles.length === 0) {
    el.innerHTML = importHtml + sourcePgxContextHtml + pgxActionSummaryHtml + '<div style="color:var(--text2);font-size:12px;padding:8px">No genotype-modeled pathways in current stack.</div>';
    return;
  }

  // Selector rows
  let html = importHtml + sourcePgxContextHtml + pgxActionSummaryHtml + '<div style="margin-bottom:12px">';
  html += '<p style="font-size:12px;color:var(--text2);margin:0 0 8px">Set inherited gene or marker results here; Current Pathway Status shows stack-driven pathway changes below.</p>';
  for (const enz of showEnzymes) {
    const cur = activeGenotype[enz] || GENOTYPE_PHENOTYPE.NM;
    html += `<div class="geno-selector" style="margin-bottom:6px">
      <span class="geno-enz-label">${enz}</span>`;
    const phenotypeButtons = [
      GENOTYPE_PHENOTYPE.PM, GENOTYPE_PHENOTYPE.IM,
      GENOTYPE_PHENOTYPE.NM, GENOTYPE_PHENOTYPE.UM
    ].filter(k => GENOTYPE_EFFECTS[enz]?.[k]);
    for (const k of phenotypeButtons) {
      const label = genotypeDisplayLabel(enz, k);
      const freq = GENOTYPE_EFFECTS[enz]?.[k]?.freq_pct || '?';
      const semanticTitle = genotypeOptionTitle(enz, k);
      html += `<button class="geno-btn ${cur===k?'active':''}"
        onclick="setGenotype('${enz}','${k}')"
        title="${safeAttr(publicDisplayText(semanticTitle))}; frequency: ~${safeAttr(freq)}% of population">${safePublicHtml(label)} <span style="font-weight:400;font-size:9px">${safePublicHtml(freq)}%</span></button>`;
    }
    html += '</div>';
  }
  for (const riskKey of showRiskAlleles) {
    const risk = GENOTYPE_RISK_EFFECTS[riskKey];
    const cur = activeGenotype[riskKey] || GENOTYPE_RISK_STATUS.ABSENT;
    const buttons = [
      [GENOTYPE_RISK_STATUS.ABSENT, 'Absent'],
      [GENOTYPE_RISK_STATUS.PRESENT, 'Present'],
    ];
    html += `<div class="geno-selector" style="margin-bottom:6px">
      <span class="geno-enz-label">${risk.label}</span>`;
    for (const [status, label] of buttons) {
      const effect = risk.effects?.[status];
      html += `<button class="geno-btn ${cur===status?'active':''}"
        onclick="setGenotype('${riskKey}','${status}')"
        title="${safeAttr(publicDisplayText(effect?.note || ""))}">${safePublicHtml(label)}</button>`;
    }
    html += '</div>';
  }
  html += '</div>';

  // Effect cards for current stack
  for (const drugName of activeStack) {
    const drug = DRUG_DB.find(d => d.name === drugName);
    if (!drug) continue;
    for (const r of (drug.routes || [])) {
      const enz = r.enzyme;
      if (!GENOTYPE_EFFECTS[enz]) continue;
      const geno = activeGenotype[enz] || GENOTYPE_PHENOTYPE.NM;
      const eff = GENOTYPE_EFFECTS[enz][geno];
      if (!eff) continue;
      const fold = genotypeExposureFoldForDrug(drugName, enz, geno, eff);
      const note = genotypeExposureNoteForDrug(drugName, enz, geno, eff, fold);
      const clinicalFold = typeof clinicalFoldForDrugGene === "function" ? clinicalFoldForDrugGene(drugName, enz, geno) : null;
      const foldStr = fold === 1.0 ? '1× (baseline)' : fold > 1 ? `${fold.toFixed(1)}× ↑ AUC` : `${fold.toFixed(1)}× ↓ AUC`;
      const foldColor = fold > 2 ? 'var(--red)' : fold > 1.3 ? 'var(--amber)' : fold < 0.5 ? 'var(--amber)' : 'var(--green)';
      html += `<div id="${safeAttr(genotypeExposureCardId(drugName, enz))}" class="geno-effect-card" data-genotype-drug="${safeAttr(drugName)}" data-genotype-gene="${safeAttr(enz)}">
          <div class="geno-effect-title">${safePublicHtml(drugName)} <span style="color:var(--text2);font-size:11px;font-weight:400">via ${safePublicHtml(enz)}</span>
          <span style="float:right;font-size:18px;font-weight:800;color:${foldColor}">${safePublicHtml(foldStr)}</span>
        </div>
        ${renderGenotypeInterpretationLine(enz, geno)}
        <div class="geno-effect-note">${safePublicHtml(note)}</div>
        ${fold !== 1.0 ? `<div style="font-size:10px;color:var(--text2);margin-top:4px">Population frequency: ~${safePublicHtml(eff.freq_pct)}% | Vs NM baseline fold-change: ${safePublicHtml(fold.toFixed(1))}x${clinicalFold ? " | Drug-specific clinical fold" : ""}</div>` : ''}
      </div>`;
    }
    for (const card of getGenotypeMetaboliteEffectCards(drugName)) {
      html += renderGenotypeMetaboliteEffectCard(card);
    }
    for (const card of getGenotypeRiskEffectCards(drugName)) {
      html += renderGenotypeRiskEffectCard(card);
    }
  }
  el.innerHTML = html;
}

function renderSourcePgxContext() {
  if (typeof isReviewerMode === "function" && !isReviewerMode()) return "";
  const cache = typeof getRenderComputationCache === "function" ? getRenderComputationCache() : {};
  const context = cache.sourceIntegrationContext;
  const sourceCore = cache.sourceCoreContext;
  const rows = (context?.matchedRecords || []).filter(row =>
    (row.genes || []).length ||
    /pgx|gene|allele|variant|guideline|clinical_annotation/i.test(row.claimType || "")
  ).slice(0, 6);
  const coreRows = (sourceCore?.matchedCandidates || []).filter(row =>
    row.candidateBucket === "pgxCandidates" ||
    /PGx|curated PGx rules|gene/i.test(`${row.suggestedTarget || ""} ${row.candidateCategory || ""}`)
  ).slice(0, 6);
  if (!rows.length && !coreRows.length) return "";
  return `<div class="external-context-notice" style="margin-bottom:10px">
    External PGx source context is available for this stack, including ${safePublicHtml(String(coreRows.length))} candidate${coreRows.length === 1 ? "" : "s"}. It is not used for gene-result interpretation, scoring, or public severity.
  </div>
  <div class="source-context-grid" style="margin-bottom:12px">
    ${rows.map(row => `<div class="source-context-card">
      <div class="source-context-head">
        <span class="ev-review-badge needs-review">Source verification</span>
        <span class="ev-review-badge needs-review">Not used for scoring</span>
      </div>
      <div class="source-context-title">${safePublicHtml(row.title || row.id || "PGx source context")}</div>
      <div class="source-context-meta">${safeTextList([
        row.sourceName ? `Source: ${publicDisplayText(row.sourceName)}` : "",
        (row.genes || []).length ? `Genes: ${row.genes.slice(0, 6).join(", ")}` : "",
        (row.drugs || []).length ? `Drugs: ${row.drugs.slice(0, 6).join(", ")}` : "",
        row.claimType ? `Claim: ${publicDisplayText(formatPendingReviewToken(row.claimType))}` : "",
        (row.evidenceIdentifiers || []).length ? `Evidence: ${row.evidenceIdentifiers.slice(0, 3).map(value => publicDisplayText(value)).join(", ")}` : "",
      ].filter(Boolean), "<br>")}</div>
    </div>`).join("")}
    ${coreRows.map(row => `<div class="source-context-card">
      <div class="source-context-head">
        <span class="ev-review-badge needs-review">PGx candidate</span>
        <span class="ev-review-badge needs-review">Source verification</span>
      </div>
      <div class="source-context-title">${safePublicHtml(row.gene || "Gene context")} ${row.drug ? `+ ${safePublicHtml(row.drug)}` : ""}</div>
      <div class="source-context-meta">${safeTextList([
        row.sourceName ? `Source: ${publicDisplayText(row.sourceName)}` : "",
        row.ruleKind ? `Rule kind: ${publicDisplayText(formatPendingReviewToken(row.ruleKind))}` : "",
        row.suggestedTarget ? `Target: ${publicDisplayText(row.suggestedTarget)}` : "",
        (row.evidenceIdentifiers || []).length ? `Evidence: ${row.evidenceIdentifiers.slice(0, 3).map(value => publicDisplayText(value)).join(", ")}` : "",
      ].filter(Boolean), "<br>")}</div>
    </div>`).join("")}
	  </div>`;
	}

function renderPgxActionSummaryCards() {
  if (typeof getPgxActionSummariesForStack !== "function") return "";
  const rows = getPgxActionSummariesForStack(activeStack, activeGenotype || {});
  if (!rows.length) return "";
  return `<div class="pgx-action-wrap">
    <div class="pgx-action-title">Guideline-Linked Review Context</div>
    <div class="pgx-action-grid">
      ${rows.map(renderPgxActionSummaryCard).join("")}
    </div>
  </div>`;
}

function renderPgxActionSummaryCard(row = {}) {
  const phenotype = row.phenotype ? phenotypeLabelForGene(row.gene, row.phenotype) : "selected phenotype";
  const evidenceCount = (row.evidenceRefs || []).length;
  const markers = (row.markerMappings || []).slice(0, 4).map(marker =>
    marker.dbsnp ? `${marker.label} (${marker.dbsnp})` : marker.label
  );
  const externalIds = (row.matchedDrugs || [])
    .flatMap(name => typeof getExternalIdentifiersForSubstance === "function" ? getExternalIdentifiersForSubstance(name) : [])
    .map(item => item.label);
  const evidenceButton = evidenceCount
    ? `<button type="button" class="related-finding-btn secondary" onclick="focusPriorityFinding('evidence','evidenceLadderLedger')">Evidence</button>`
    : "";
  return `<div class="pgx-action-card">
    <div class="pgx-action-head">
      <div>
        <div class="pgx-action-name">${safePublicHtml(row.title || "PGx action summary")}</div>
        <div class="pgx-action-meta">${safePublicHtml([row.source || "Guideline", row.level ? `Level ${row.level}` : "", row.gene, phenotype].filter(Boolean).join(" · "))}</div>
      </div>
      <span class="ev-review-badge needs-review">source context</span>
    </div>
    <div class="pgx-action-step"><strong>What changed</strong>${safePublicHtml(row.whatChanged || "")}</div>
    <div class="pgx-action-step"><strong>What to review</strong>${safePublicHtml(row.reviewDirection || "")}</div>
    <div class="pgx-action-step muted"><strong>Boundary</strong>${safePublicHtml(row.safetyBoundary || "This is source-linked review context, not medical advice.")}</div>
    <div class="finding-meta">
      ${(row.matchedDrugs || []).map(name => `<span class="finding-tag">${safePublicHtml(name)}</span>`).join("")}
      ${externalIds.slice(0, 3).map(id => `<span class="finding-tag">${safePublicHtml(id)}</span>`).join("")}
      ${markers.slice(0, 3).map(label => `<span class="finding-tag">${safePublicHtml(label)}</span>`).join("")}
      <span class="finding-tag">${safePublicHtml(evidenceCount ? `${evidenceCount} linked source${evidenceCount === 1 ? "" : "s"}` : "source needed")}</span>
    </div>
    <div class="finding-actions">${evidenceButton}${row.guidelineUrl ? `<a class="related-finding-btn secondary" href="${safeAttr(row.guidelineUrl)}" target="_blank" rel="noopener">Guideline</a>` : ""}</div>
  </div>`;
}

function getHighestGenotypePrioritySignal() {
  if (!activeStack.length) return null;
  const signals = [];
  for (const drugName of activeStack) {
    const drug = getDrug(drugName);
    if (!drug) continue;

    for (const route of (drug.routes || [])) {
      const enzyme = route.enzyme;
      if (!GENOTYPE_EFFECTS[enzyme]) continue;
      const phenotype = activeGenotype[enzyme] || GENOTYPE_PHENOTYPE.NM;
      const effect = GENOTYPE_EFFECTS[enzyme]?.[phenotype];
      if (!effect || phenotype === GENOTYPE_PHENOTYPE.NM || effect.auc_fold === 1) continue;
      const fold = genotypeExposureFoldForDrug(drugName, enzyme, phenotype, effect);
      const note = genotypeExposureNoteForDrug(drugName, enzyme, phenotype, effect, fold);
      const nebivololCyp2d6 = isNebivololCyp2d6Signal(drugName, enzyme);
      const warfarinCyp2c9 = isWarfarinCyp2c9Signal(drugName, enzyme);
      const statinSlco1b1 = isStatinSlco1b1Signal(drugName, enzyme);
      const actionSummary = typeof getPgxActionSummaryForDrugGene === "function"
        ? getPgxActionSummaryForDrugGene(drugName, enzyme, phenotype)
        : null;
      let score = scoreGenotypeExposureSignal(fold, note, drug);
      if (nebivololCyp2d6) score = Math.min(score, 60);
      if (score < 30) continue;
      signals.push({
        kind:"exposure",
        score,
        label:score >= 70 ? "Gene High" : "Gene Watch",
        headline:`${enzyme} genotype may change ${drugName} exposure`,
        summary:publicDisplayText(`${drugName} is in your list and ${enzyme} is set to ${phenotypeLabelForGene(enzyme, phenotype)}. ${note}`),
        why:publicDisplayText(`${drugName} depends on ${enzyme}, and the selected ${enzyme} phenotype is not the reference state.`),
        changes:warfarinCyp2c9
          ? "CYP2C9 reduced function can slow S-warfarin clearance and increase INR/bleeding sensitivity; VKORC1, CYP4F2, clinical factors, interactions, diet, and INR response remain part of the same dosing context."
          : statinSlco1b1
          ? `${drugName} exposure and statin-associated muscle symptom risk can rise when SLCO1B1/OATP1B1 uptake is reduced; dose intensity, transporter inhibitors, renal/hepatic context, and symptoms still matter.`
          : nebivololCyp2d6
          ? "Nebivolol parent exposure can be higher in CYP2D6 poor/null status; clinical response is usually checked with pulse, blood pressure, and symptoms."
          : `Expected parent-drug exposure shifts to about ${fold}x the normal-metabolizer baseline.`,
        review:actionSummary?.reviewDirection || (nebivololCyp2d6
          ? "Review pulse, blood pressure, dizziness/syncope, breathing symptoms, dose tolerance, and CYP2D6 inhibitors; routine genotype-only dose change is not established."
          : score >= 70
          ? "Review dose sensitivity, toxicity signs, inhibitors/inducers, and whether therapeutic monitoring or an alternative is preferred."
          : "Review whether the exposure shift changes monitoring, dose, or follow-up."),
        nextStep:nebivololCyp2d6
          ? "Discuss monitoring before changing dose or adding interacting medicines."
          : score >= 70
          ? "Review the pharmacogenomics finding before changing dose or adding inhibitors."
          : "Review the pharmacogenomics panel and monitor dose-sensitive effects.",
        evidenceRefs:[...(drug.evidenceRefs || []), ...(actionSummary?.evidenceRefs || [])],
        targetTab:"genes-metabolites",
        targetElementId:genotypeExposureCardId(drugName, enzyme),
      });
    }

    for (const card of getGenotypeMetaboliteEffectCards(drugName)) {
      const { effect, phenotypeEffect, geno } = card;
      if (geno === GENOTYPE_PHENOTYPE.NM) continue;
      const score = scoreGenotypeMetaboliteSignal(effect, phenotypeEffect);
      if (score < 30) continue;
      const direction = phenotypeEffect.direction === "decrease" ? "reduce" : "increase";
      const actionSummary = typeof getPgxActionSummaryForDrugGene === "function"
        ? getPgxActionSummaryForDrugGene(effect.parent, effect.enzyme, geno)
        : null;
      signals.push({
        kind:"metabolite",
        score,
        label:score >= 70 ? "Gene High" : "Gene Watch",
        headline:`${effect.enzyme} genotype may ${direction} ${effect.metaboliteName}`,
        summary:publicDisplayText(`${effect.parent} is in your list and ${effect.enzyme} is set to ${phenotypeLabelForGene(effect.enzyme, geno)}. ${phenotypeEffect.label || effect.note}`),
        why:`${effect.parent} has a genotype-sensitive metabolite pathway through ${effect.enzyme}.`,
        changes:phenotypeEffect.fold
          ? `${publicMetaboliteLabel(effect, effect.parent)} is expected to shift to about ${phenotypeEffect.fold}x the normal-metabolizer reference.`
          : `${publicMetaboliteLabel(effect, effect.parent)} is expected to ${direction}; the direction is modeled but the fold is not calibrated.`,
        review:actionSummary?.reviewDirection || effect.clinicalAction || (score >= 70
          ? "Review whether standard medication assumptions still apply before relying on efficacy or safety."
          : "Review metabolite-level context and relevant monitoring."),
        nextStep:score >= 70
          ? "Review the pharmacogenomics finding before relying on this medication effect."
          : "Review metabolite-level pharmacogenomics context.",
        evidenceRefs:[...(effect.evidenceRefs || []), ...(actionSummary?.evidenceRefs || [])],
        targetTab:"genes-metabolites",
        targetElementId:genotypeMetaboliteCardId(effect),
      });
    }

    for (const card of getGenotypeRiskEffectCards(drugName)) {
      const { riskKey, risk, status, riskEffect, drugEffect } = card;
      if (status !== GENOTYPE_RISK_STATUS.PRESENT) continue;
      const score = riskEffect.severity === "high" ? 90 : riskEffect.severity === "moderate" ? 60 : 35;
      signals.push({
        kind:"risk",
        score,
        label:score >= 70 ? "Gene High" : "Gene Watch",
        headline:`${risk.label} conflicts with ${drugEffect.parent}`,
        summary:publicDisplayText(`${drugEffect.parent} is in your list and ${risk.label} is selected as present. ${drugEffect.clinicalAction || drugEffect.note}`),
        why:`${risk.label} is a medication-specific risk marker for ${drugEffect.parent}.`,
        changes:drugEffect.note,
        review:drugEffect.clinicalAction || "Review whether this medication should be avoided or substituted.",
        nextStep:score >= 70
          ? "Review this genotype-medication safety warning before using this medication."
          : "Review this genotype-medication context with the rest of the profile.",
        evidenceRefs:[...(drugEffect.evidenceRefs || [])],
        targetTab:"genes-metabolites",
        targetElementId:genotypeRiskCardId(riskKey, drugEffect.parent),
      });
    }
  }
  signals.sort((a,b) => b.score - a.score);
  return signals[0] || null;
}

function phenotypeLabel(phenotype) {
  if (phenotype === GENOTYPE_PHENOTYPE.PM) return "poor metabolizer";
  if (phenotype === GENOTYPE_PHENOTYPE.IM) return "intermediate metabolizer";
  if (phenotype === GENOTYPE_PHENOTYPE.UM) return "ultrarapid metabolizer";
  if (phenotype === GENOTYPE_RISK_STATUS.PRESENT) return "present";
  if (phenotype === GENOTYPE_RISK_STATUS.ABSENT) return "absent";
  return "normal metabolizer";
}

function genotypeDomToken(value) {
  return String(value || "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function genotypeExposureCardId(drugName, enzyme) {
  return `geno-exposure-${genotypeDomToken(drugName)}-${genotypeDomToken(enzyme)}`;
}

function genotypeMetaboliteCardId(effect = {}) {
  return `geno-metabolite-${genotypeDomToken(effect.parent)}-${genotypeDomToken(effect.enzyme)}-${genotypeDomToken(effect.metaboliteId || effect.metaboliteName)}`;
}

function genotypeRiskCardId(riskKey, parent) {
  return `geno-risk-${genotypeDomToken(riskKey)}-${genotypeDomToken(parent)}`;
}

function genotypeExposureFoldForDrug(drugName, enzyme, phenotype, effect = {}) {
  const clinicalFold = typeof clinicalFoldForDrugGene === "function" ? clinicalFoldForDrugGene(drugName, enzyme, phenotype) : null;
  if (Number.isFinite(clinicalFold)) return clinicalFold;
  return Number.isFinite(effect.auc_fold) ? effect.auc_fold : 1;
}

function genotypeExposureNoteForDrug(drugName, enzyme, phenotype, effect = {}, fold = null) {
  const value = Number.isFinite(fold) ? fold : genotypeExposureFoldForDrug(drugName, enzyme, phenotype, effect);
  const clinicalFold = typeof clinicalFoldForDrugGene === "function" ? clinicalFoldForDrugGene(drugName, enzyme, phenotype) : null;
  const phenotypeText = phenotypeLabelForGene(enzyme, phenotype);
  if (isNebivololCyp2d6Signal(drugName, enzyme)) {
    const foldText = Number.isFinite(value) ? `about ${value}x in PK studies` : "substantially higher in PK studies";
    return `Nebivolol has CYP2D6 clinical PK data for ${phenotypeText}: parent exposure can be ${foldText}, but prescribing information does not recommend a routine dose change based on CYP2D6 status alone. Review pulse, blood pressure, symptoms, and co-medications.`;
  }
  if (isWarfarinCyp2c9Signal(drugName, enzyme)) {
    const foldText = Number.isFinite(value) ? `about ${value}x in this model` : "higher";
    return `Warfarin has CYP2C9/VKORC1/CYP4F2 dosing guidance for ${phenotypeText}: reduced CYP2C9 can raise S-warfarin exposure (${foldText}) and INR/bleeding sensitivity, but any dosing decision must use a validated warfarin algorithm plus INR follow-up.`;
  }
  if (isStatinSlco1b1Signal(drugName, enzyme)) {
    const foldText = Number.isFinite(value) ? `about ${value}x in this model` : "higher";
    return `${drugName} has CPIC-linked SLCO1B1/OATP1B1 statin guidance for ${phenotypeText}: reduced uptake can raise statin exposure (${foldText}) and statin-associated muscle symptom risk. Review dose intensity, interacting drugs, prior tolerance, CK/symptoms, and ASCVD treatment target.`;
  }
  const direction = value > 1.15
    ? "higher parent exposure"
    : value < 0.85
    ? "lower parent exposure or reduced active-metabolite formation"
    : "near-baseline parent exposure";
  if (Number.isFinite(clinicalFold)) {
    return `${drugName} has drug-specific ${enzyme} clinical PK data for ${phenotypeText}: ${direction} is modeled at about ${value}x the normal-metabolizer baseline. Review dose sensitivity, adverse-effect monitoring, and other inhibitors or inducers.`;
  }
  if (value !== 1) {
    return `${drugName} uses ${enzyme}; ${phenotypeText} gives a class-level estimate of ${direction} at about ${value}x the normal-metabolizer baseline. Review drug-specific evidence and co-medications.`;
  }
  return `${drugName} uses ${enzyme}; the selected phenotype is the reference state for this model.`;
}

function isNebivololCyp2d6Signal(drugName, enzyme) {
  return String(drugName || "").toLowerCase() === "nebivolol" && enzyme === "CYP2D6";
}

function isWarfarinCyp2c9Signal(drugName, enzyme) {
  return String(drugName || "").toLowerCase() === "warfarin" && enzyme === "CYP2C9";
}

function isStatinSlco1b1Signal(drugName, enzyme) {
  return enzyme === "SLCO1B1" && /^(?:simvastatin|atorvastatin|rosuvastatin)$/i.test(String(drugName || ""));
}

function phenotypeLabelForGene(gene, phenotype) {
  const semantics = getGeneSemantics(gene);
  if (semantics.phenotypeLabels?.[phenotype]) return semantics.phenotypeLabels[phenotype];
  if (semantics.axis === GENE_SEMANTIC_AXIS.EXPRESSION) {
    if (phenotype === GENOTYPE_PHENOTYPE.PM) return "non-expresser";
    if (phenotype === GENOTYPE_PHENOTYPE.IM) return "intermediate expresser";
    if (phenotype === GENOTYPE_PHENOTYPE.UM) return "high expresser";
    return "reference expression";
  }
  if (semantics.axis === GENE_SEMANTIC_AXIS.COPY_NUMBER_NULL) {
    if (phenotype === GENOTYPE_PHENOTYPE.PM) return `${gene} null`;
    if (phenotype === GENOTYPE_PHENOTYPE.IM) return `reduced ${gene} detox context`;
    return `${gene} present`;
  }
  if (semantics.axis === GENE_SEMANTIC_AXIS.DEFICIENCY) {
    if (phenotype === GENOTYPE_PHENOTYPE.PM) return "deficient / very low activity";
    if (phenotype === GENOTYPE_PHENOTYPE.IM) return "partial activity";
    return "normal activity";
  }
  if (semantics.axis === GENE_SEMANTIC_AXIS.SENSITIVITY) {
    if (phenotype === GENOTYPE_PHENOTYPE.PM) return "increased sensitivity";
    if (phenotype === GENOTYPE_PHENOTYPE.UM) return "relative resistance";
    return phenotypeLabel(phenotype).replace("metabolizer", "context");
  }
  if (semantics.axis === GENE_SEMANTIC_AXIS.RESPONSE) {
    if (phenotype === GENOTYPE_PHENOTYPE.PM) return "reduced/unfavorable response context";
    if (phenotype === GENOTYPE_PHENOTYPE.IM) return "intermediate response context";
    if (phenotype === GENOTYPE_PHENOTYPE.UM) return "higher/alternate response context";
    return "reference response context";
  }
  if (semantics.axis === GENE_SEMANTIC_AXIS.TRANSPORT) {
    if (phenotype === GENOTYPE_PHENOTYPE.PM) return "low transporter function";
    if (phenotype === GENOTYPE_PHENOTYPE.IM) return "reduced transporter function";
    if (phenotype === GENOTYPE_PHENOTYPE.UM) return "increased transporter function";
    return "normal transporter function";
  }
  return phenotypeLabel(phenotype);
}

function genotypeOptionTitle(gene, phenotype) {
  const interpretation = buildGeneInterpretation(gene, phenotype, { reportedLabel:genotypeDisplayLabel(gene, phenotype), source:"manual_selector" });
  return `${interpretation.functionalState}; model use: ${interpretation.modelUse}`;
}

function escapeHtml(value) {
  if (typeof safeHtml === "function") return safeHtml(value);
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderGenotypeInterpretationLine(gene, phenotype) {
  const detail = activeGenotypeDetails?.[gene] || buildGeneInterpretation(gene, phenotype);
  const reported = escapeHtml(detail.reportedLabel || genotypeDisplayLabel(gene, phenotype));
  const interpreted = escapeHtml(detail.functionalState || phenotypeLabelForGene(gene, phenotype));
  const modelUse = escapeHtml(detail.modelUse || "");
  const scope = escapeHtml((detail.compartments || []).join(", "));
  const nullLike = ["inherited_no_function","copy_number_null","inherited_deficiency","erythrocyte_deficiency"].includes(detail.mechanism);
  const phenoconversion = nullLike
    ? '<span style="color:var(--text2)">Inherited null/deficiency context; inhibitors should not be double-counted as if they removed enzyme again.</span>'
    : detail.phenoconversion
      ? '<span style="color:var(--text2)">Inherited baseline; medication inhibitors can phenoconvert remaining activity, mostly as systemic/liver pathway context.</span>'
      : '<span style="color:var(--text2)">Not modeled as reversible liver-only phenoconversion.</span>';
  return `<div style="font-size:10px;color:var(--text2);margin:2px 0 5px">
    Reported: <b>${reported}</b> · Interpreted as: <b>${interpreted}</b>${modelUse ? ` · Model use: ${modelUse}` : ""}${scope ? ` · Scope: ${scope}` : ""}<br>${phenoconversion}
  </div>`;
}

function scoreGenotypeExposureSignal(fold, note, drug) {
  const text = `${note || ""} ${drug?.note || ""}`.toLowerCase();
  let score = 0;
  if (fold >= 5 || fold <= 0.3) score = 75;
  else if (fold >= 3 || fold <= 0.5) score = 65;
  else if (fold >= 2 || fold <= 0.7) score = 50;
  else if (fold >= 1.4 || fold <= 0.8) score = 35;
  if (/contraindicat|avoid|life-threatening|fatal|severe|toxicity|bleeding|arrhythmia|respiratory depression|myelosuppression/.test(text)) score += 15;
  if (drug?.props?.nti || drug?.props?.qtcRisk >= 2 || drug?.props?.myelosuppressionRisk >= 2) score += 10;
  return Math.min(95, score);
}

function scoreGenotypeMetaboliteSignal(effect, phenotypeEffect) {
  const fold = phenotypeEffect.fold || null;
  const text = `${effect.note || ""} ${effect.clinicalAction || ""} ${phenotypeEffect.label || ""}`.toLowerCase();
  let score = 35;
  if (fold) {
    if (fold >= 5 || fold <= 0.3) score = 75;
    else if (fold >= 3 || fold <= 0.5) score = 65;
    else if (fold >= 2 || fold <= 0.7) score = 50;
  }
  if (/contraindicat|avoid|life-threatening|fatal|severe|toxicity|failure risk|analgesia failure|stent thrombosis|myelosuppression|respiratory depression|drastically reduced|weekly cbc|close cbc/.test(text)) score += 20;
  if (/cpic/.test(text) && /avoid|drastically reduced|myelosuppression/.test(text)) score = Math.max(score, 75);
  if (/prodrug|active metabolite|key active|opioid-active/.test(text) && phenotypeEffect.direction === "decrease") score += 10;
  return Math.min(95, score);
}

function normalizeEvidenceToken(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function addEvidenceTokens(tokens, value) {
  const normalized = normalizeEvidenceToken(value);
  if (!normalized) return;
  tokens.add(normalized);
  for (const part of normalized.split(/\s+/)) {
    if (part.length >= 4 && !part.startsWith('cyp')) tokens.add(part);
  }
}

function getStackEvidenceContext() {
  const tokens = new Set();
  const evidenceRefs = new Set();
  const graph = getInteractionGraph();

  for (const drugName of activeStack) {
    const drug = getDrug(drugName);
    const parentId = getDrugGraphId(drugName);
    addEvidenceTokens(tokens, drugName);
    addEvidenceTokens(tokens, parentId);
    for (const brand of (drug?.brandNames || [])) addEvidenceTokens(tokens, brand);
    for (const ref of (drug?.evidenceRefs || [])) evidenceRefs.add(ref);

    for (const met of (METAB[drugName] || [])) {
      const metId = getMetaboliteGraphId(met.n);
      addEvidenceTokens(tokens, met.n);
      addEvidenceTokens(tokens, metId);
      for (const ref of (met.evidenceRefs || [])) evidenceRefs.add(ref);
    }

    for (const edge of graph.edges.filter(e => e.from === parentId)) {
      const target = graph.actors[edge.to];
      if (target?.type === ACTOR_TYPE.METABOLITE) {
        addEvidenceTokens(tokens, target.id);
        addEvidenceTokens(tokens, target.name);
        for (const ref of (target.evidenceRefs || [])) evidenceRefs.add(ref);
        for (const ref of (edge.props?.evidenceRefs || [])) evidenceRefs.add(ref);
      }
    }
  }

  return { tokens:[...tokens], evidenceRefs };
}

function getGenotypeMetaboliteEffectCards(drugName) {
  if (typeof GENOTYPE_METABOLITE_EFFECTS === 'undefined') return [];
  return GENOTYPE_METABOLITE_EFFECTS
    .filter(effect => effect.parent === drugName && showGenotypeMetaboliteEffect(effect))
    .map(effect => {
      const geno = getSelectedGenotypePhenotype(effect.enzyme);
      let phenotypeEffect = effect.effects?.[geno];
      const inhibitorContext = getActiveEnzymeInhibitionContext(effect.enzyme, drugName);
      if ((!phenotypeEffect || phenotypeEffect.direction === "baseline") && inhibitorContext.length) {
        phenotypeEffect = getInhibitionMetaboliteEffect(effect, inhibitorContext);
      }
      if (phenotypeEffect && phenotypeEffect.direction !== "baseline" && !phenotypeEffect.fold && !phenotypeEffect.qualitative) {
        const estimatedFold = estimateMetaboliteEffectFold(effect, phenotypeEffect, inhibitorContext, geno);
        if (estimatedFold) phenotypeEffect = { ...phenotypeEffect, fold:estimatedFold, estimated:true };
      }
      if (!phenotypeEffect) return null;
      return { effect, geno, phenotypeEffect };
    })
    .filter(Boolean);
}

function getGenotypeRiskEffectCards(drugName) {
  if (typeof GENOTYPE_RISK_EFFECTS === 'undefined') return [];
  return Object.entries(GENOTYPE_RISK_EFFECTS)
    .map(([riskKey, risk]) => {
      const status = activeGenotype[riskKey] || GENOTYPE_RISK_STATUS.ABSENT;
      const riskEffect = risk.effects?.[status];
      const drugEffect = (risk.drugEffects || []).find(effect => effect.parent === drugName);
      if (!drugEffect || !riskEffect) return null;
      return { riskKey, risk, status, riskEffect, drugEffect };
    })
    .filter(Boolean);
}

function renderGenotypeRiskEffectCard(card) {
  const { riskKey, risk, status, riskEffect, drugEffect } = card;
  const isPresent = status === GENOTYPE_RISK_STATUS.PRESENT;
  const label = isPresent ? 'risk allele present' : 'risk allele absent';
  const foldColor = isPresent ? 'var(--red)' : 'var(--green)';
  const refs = (drugEffect.evidenceRefs || []).filter(ref => typeof getStudy === "function" ? getStudy(ref) : STUDY_DB[ref]);
  const evidenceText = refs.length
    ? refs.map(publicEvidenceReferenceLabel).join(' · ')
    : 'Evidence not linked yet';
  return `<div id="${safeAttr(genotypeRiskCardId(riskKey, drugEffect.parent))}" class="geno-effect-card">
    <div class="geno-effect-title">${safePublicHtml(drugEffect.parent)} <span style="color:var(--text2);font-size:11px;font-weight:400">with ${safePublicHtml(risk.label)}</span>
      <span style="float:right;font-size:18px;font-weight:800;color:${foldColor}">${safePublicHtml(label)}</span>
    </div>
    <div class="geno-effect-note">${safePublicHtml(isPresent ? drugEffect.note : riskEffect.note)}</div>
    <div style="font-size:10px;color:var(--text2);margin-top:4px">${safePublicHtml(drugEffect.phenotype)}: ${safePublicHtml(isPresent ? drugEffect.clinicalAction : riskEffect.label)} · ${safePublicHtml(evidenceText)}</div>
  </div>`;
}

function getSelectedGenotypePhenotype(enzyme) {
  const riskKey = GENOTYPE_METABOLITE_RISK_KEYS[enzyme];
  if (riskKey && activeGenotype[enzyme]) return activeGenotype[enzyme];
  if (riskKey) {
    return activeGenotype[riskKey] === GENOTYPE_RISK_STATUS.PRESENT
      ? GENOTYPE_PHENOTYPE.PM
      : GENOTYPE_PHENOTYPE.NM;
  }
  return activeGenotype[enzyme] || GENOTYPE_PHENOTYPE.NM;
}

function getSelectedEnzymeExposureMult(enzyme, geno, inhibitorContext = []) {
  const genotypeMult = getSelectedGenotypeExposureMult(enzyme, geno);
  const inhibitorMult = getSelectedInhibitorExposureMult(inhibitorContext);
  return Math.max(genotypeMult, inhibitorMult);
}

function getSelectedGenotypeExposureMult(enzyme, geno) {
  if (typeof userGenetics !== 'undefined' && userGenetics[enzyme] === "null") {
    return typeof getNullExposureMultiplier === "function" ? getNullExposureMultiplier(enzyme) : 20;
  }
  return GENOTYPE_EFFECTS[enzyme]?.[geno]?.auc_fold || 1;
}

function getSelectedInhibitorExposureMult(inhibitorContext = []) {
  return inhibitorContext.reduce((max, inh) => {
    let mult = (INH_MULT[inh.strength] || 1) * (inh.doseMod || 1);
    if (inh.mechanism === "mechanism_based" || inh.mechanism === "time-dependent") mult *= 1.3;
    return Math.max(max, mult);
  }, 1);
}

function estimateFormationFold(enzyme, geno, inhibitorContext = []) {
  const genotypeMult = getSelectedGenotypeExposureMult(enzyme, geno);
  const inhibitorMult = getSelectedInhibitorExposureMult(inhibitorContext);
  const genotypeFormationFold = genotypeMult ? 1 / genotypeMult : 1;
  if (inhibitorMult > 1) return Math.min(genotypeFormationFold, 1 / inhibitorMult);
  return genotypeFormationFold;
}

function estimateMetaboliteEffectFold(effect, phenotypeEffect, inhibitorContext, geno) {
  const actor = typeof METABOLITE_ACTORS !== 'undefined' ? METABOLITE_ACTORS[effect.metaboliteId] : null;
  const formedByTarget = actor?.formingEnzyme === effect.enzyme;
  const route = actor?.routes?.find(r => r.enzyme === effect.enzyme);
  const enzymeMult = getSelectedEnzymeExposureMult(effect.enzyme, geno, inhibitorContext);

  if (phenotypeEffect.direction === "decrease") {
    if (formedByTarget) {
      const formationFold = estimateFormationFold(effect.enzyme, geno, inhibitorContext);
      if (!formationFold || formationFold === 1) return null;
      return Math.round(Math.max(0.05, formationFold) * 100) / 100;
    }
    if (!enzymeMult || enzymeMult === 1) return null;
    return Math.round(Math.max(0.05, 1 / enzymeMult) * 100) / 100;
  }

  if (phenotypeEffect.direction !== "increase") return null;
  if (formedByTarget) {
    const formationFold = estimateFormationFold(effect.enzyme, geno, inhibitorContext);
    if (!formationFold || formationFold === 1) return null;
    return Math.round(Math.max(0.05, formationFold) * 100) / 100;
  }
  if (!enzymeMult || enzymeMult === 1 || !route) return null;
  const remaining = Math.max(0, 1 - route.fraction);
  const fold = remaining + route.fraction * enzymeMult;
  return Math.round(fold * 100) / 100;
}

function getActiveEnzymeInhibitionContext(enzyme, subjectDrugName) {
  if (!enzyme || typeof activeStack === 'undefined') return [];
  const inhibitors = [];
  for (const name of activeStack) {
    const drug = getDrug(name);
    if (!drug) continue;
    const allInh = typeof getAllInhibitions === 'function'
      ? getAllInhibitions(drug)
      : (drug.inh || []);
    for (const inh of allInh) {
      if (inh.target !== enzyme) continue;
      const doseMod = inh.doseDependent ? getDoseModifier(name) : 1.0;
      inhibitors.push({
        name,
        isSelf: name === subjectDrugName,
        strength: inh.strength || "inhibitor",
        mechanism: inh.mechanism || (inh.timeDependent ? "time-dependent" : ""),
        doseDependent: !!inh.doseDependent,
        doseMod,
      });
      break;
    }
  }
  return inhibitors;
}

function getInhibitionMetaboliteEffect(effect, inhibitorContext) {
  const hasSelfOnly = inhibitorContext.every(i => i.isSelf);
  const names = inhibitorContext.map(i => i.isSelf ? `${i.name} itself` : i.name).join(", ");
  const hasStrong = inhibitorContext.some(i => i.strength === "strong");
  const direction = effect.inhibitionDirection || (effect.effects?.[GENOTYPE_PHENOTYPE.PM]?.direction);
  if (!direction || direction === "baseline") return null;
  const label = effect.inhibitionLabel ||
    (direction === "increase"
      ? `${hasSelfOnly ? "self-inhibition" : `${names} inhibition`} context: higher metabolite exposure expected; fold not calibrated`
      : `${hasSelfOnly ? "self-inhibition" : `${names} inhibition`} context: lower active metabolite formation expected; fold not calibrated`);
  return {
    direction,
    label,
    fold:effect.inhibitionFold,
    inhibitorContext:names,
    strength:hasStrong ? "strong" : inhibitorContext[0]?.strength,
  };
}

function showGenotypeMetaboliteEffect(effect) {
  if (!effect || !effect.enzyme) return false;
  if (!GENOTYPE_EFFECTS[effect.enzyme] && !GENOTYPE_METABOLITE_RISK_KEYS[effect.enzyme]) return false;
  if (effect.systemic) return true;
  const metId = effect.metaboliteId;
  const listed = (METAB[effect.parent] || []).some(m => getMetaboliteGraphId(m.n) === metId);
  if (listed) return true;
  const graph = getInteractionGraph();
  const parentId = getDrugGraphId(effect.parent);
  return graph.edges.some(e => e.from === parentId && e.to === metId);
}

function renderGenotypeMetaboliteEffectCard(card) {
  const { effect, phenotypeEffect } = card;
  const fold = phenotypeEffect.fold || null;
  const isIncrease = phenotypeEffect.direction === "increase";
  const isDecrease = phenotypeEffect.direction === "decrease";
  const foldStr = fold
    ? (fold === 1.0 ? "1x (baseline)" : fold > 1 ? `${fold.toFixed(1)}x ↑ level` : `${fold.toFixed(2)}x ↓ level`)
    : phenotypeEffect.label;
  const foldColor = isIncrease && fold && fold >= 10 ? 'var(--red)' :
    isIncrease ? 'var(--amber)' :
    isDecrease ? 'var(--green)' :
    'var(--text2)';
  const refs = (effect.evidenceRefs || []).filter(ref => typeof getStudy === "function" ? getStudy(ref) : STUDY_DB[ref]);
  const evidenceText = refs.length
    ? refs.map(publicEvidenceReferenceLabel).join(' · ')
    : 'Evidence not linked yet';
  const metaboliteLabel = publicMetaboliteLabel({
    metaboliteName:effect.metaboliteName,
    name:effect.metaboliteName,
    evidenceRefs:effect.evidenceRefs || [],
    syntheticContext:effect.syntheticContext,
    publicFacing:effect.publicFacing,
  }, effect.parent);
  const signal = typeof getExposureSignalLabel === 'function' ? getExposureSignalLabel(effect, phenotypeEffect) : 'metabolite level';
  const action = effect.clinicalAction || (typeof clinicalActionForMetaboliteEffect === 'function' ? clinicalActionForMetaboliteEffect(effect, phenotypeEffect) : '');
  return `<div id="${safeAttr(genotypeMetaboliteCardId(effect))}" class="geno-effect-card">
    <div class="geno-effect-title">${safePublicHtml(metaboliteLabel)} <span style="color:var(--text2);font-size:11px;font-weight:400">from ${safePublicHtml(effect.parent)} via ${safePublicHtml(effect.enzyme)}</span>
      <span style="float:right;font-size:18px;font-weight:800;color:${foldColor}">${safePublicHtml(foldStr)}</span>
    </div>
    ${renderGenotypeInterpretationLine(effect.enzyme, card.geno)}
    <div class="geno-effect-note">${safePublicHtml(effect.note)}</div>
    <div style="font-size:10px;color:var(--text2);margin-top:4px">${safePublicHtml(signal)}: ${safePublicHtml(phenotypeEffect.label)}${action ? ` · ${safePublicHtml(action)}` : ""} · ${safePublicHtml(evidenceText)}</div>
  </div>`;
}

function setGenotype(enzyme, phenotype) {
  if (GENOTYPE_EFFECTS[enzyme]) setGenotypeState(enzyme, phenotype, { reportedLabel:genotypeDisplayLabel(enzyme, phenotype), source:"manual_selector" });
  else {
    activeGenotype[enzyme] = phenotype;
    if (typeof activeGenotypeDetails !== "undefined") activeGenotypeDetails[enzyme] = buildRiskInterpretation(enzyme, phenotype, { source:"manual_selector" });
  }
  renderAll();
}

function renderPharmGxImportCard() {
  const id = "pharmgxImportText";
  return `<div class="geno-import-card">
    <div class="geno-import-title">DNA / PharmGx report import <span>local preview</span></div>
    <div class="geno-import-note">Paste gene phenotype rows from a PharmGx report or structured text with gene and phenotype/status fields. Nothing is uploaded.</div>
    <textarea id="${id}" class="geno-import-text" placeholder="CYP2C19 | *1/*2 | Intermediate Metabolizer&#10;CYP2D6 | *4/*4 | Poor Metabolizer&#10;HLA-B*57:01 | detected"></textarea>
    <div class="geno-import-actions">
      <button onclick="applyPharmGxImport()">Apply genotypes</button>
      <span id="pharmgxImportStatus"></span>
    </div>
  </div>`;
}

function applyPharmGxImport() {
  const input = document.getElementById("pharmgxImportText");
  const result = parsePharmGxImportDetailed(input?.value || "");
  const parsed = result.rows;
  const applied = [];
  for (const row of parsed) {
    if (applyPharmGxRow(row)) applied.push(row.gene);
  }
  if (applied.length) renderAll();
  const status = document.getElementById("pharmgxImportStatus");
  if (status) {
    const skippedText = result.skipped.length ? ` · skipped ${result.skipped.length}` : "";
    status.textContent = applied.length
      ? `Applied ${applied.length}: ${applied.join(", ")}${skippedText}`
      : `No supported Diognosis genes found${skippedText}`;
    if (result.skipped.length) status.title = `Skipped: ${result.skipped.slice(0,8).join("; ")}`;
  }
}

function applyPharmGxRow(row) {
  if (!row?.gene) return false;
  if (GENOTYPE_EFFECTS[row.gene]) return setGenotypeState(row.gene, row.phenotype, row.interpretation || row);
  if (typeof GENOTYPE_RISK_EFFECTS !== 'undefined' && GENOTYPE_RISK_EFFECTS[row.gene] && row.status) {
    activeGenotype[row.gene] = row.status;
    if (typeof activeGenotypeDetails !== "undefined") activeGenotypeDetails[row.gene] = buildRiskInterpretation(row.gene, row.status, row.interpretation || row);
    return true;
  }
  return false;
}

function parsePharmGxImport(text) {
  return parsePharmGxImportDetailed(text).rows;
}

function parsePharmGxImportDetailed(text) {
  const raw = String(text || "").trim();
  if (!raw) return { rows:[], skipped:[] };
  const jsonRows = parsePharmGxJson(raw);
  if (jsonRows.rows.length || jsonRows.skipped.length) return jsonRows;
  const rows = [];
  const skipped = [];
  for (const line of raw.split(/\r?\n/)) {
    const parsed = parsePharmGxLine(line);
    if (parsed) rows.push(parsed);
    else if (line.trim() && !line.trim().startsWith("|---") && !/^gene\s*[,\t|]/i.test(line.trim())) skipped.push(line.trim());
  }
  return { rows, skipped };
}

function parsePharmGxJson(raw) {
  try {
    const data = JSON.parse(raw);
    const sourceRows = normalizePharmGxJsonRows(data);
    if (!sourceRows.length) return { rows:[], skipped:[] };
    const rows = [];
    const skipped = [];
    for (const row of sourceRows) {
      const parsed = parsePharmGxObjectRow(row);
      if (parsed) rows.push(parsed);
      else skipped.push(typeof row === "string" ? row : JSON.stringify(row));
    }
    return { rows, skipped };
  } catch (_) {
    return { rows:[], skipped:[] };
  }
}

function normalizePharmGxJsonRows(data) {
  if (Array.isArray(data)) return data;
  const nested = data?.gene_profiles || data?.geneProfiles || data?.genes || data?.results || data?.profile || data?.genotypes;
  if (Array.isArray(nested)) return nested;
  if (nested && typeof nested === "object") return Object.entries(nested).map(([gene, value]) => ({ gene, value }));
  if (data && typeof data === "object") {
    const objectKeys = ["gene", "Gene", "symbol", "variant", "allele", "marker", "name"];
    if (objectKeys.some(key => data[key])) return [data];
    return Object.entries(data).map(([gene, value]) => ({ gene, value }));
  }
  return [];
}

function parsePharmGxObjectRow(row) {
  const gene = [
    row.gene, row.Gene, row.symbol, row.variant, row.allele, row.marker, row.name
  ].map(normalizePharmGxGene).find(Boolean);
  if (!gene) return null;
  const value = row.phenotype || row.Phenotype || row.metabolizerStatus || row.status || row.result || row.value;
  const reportedLabel = pharmGxObjectReportedLabel(row, value);
  const phenotype = phenotypeTextToGenotype(value, gene);
  const status = riskTextToStatus(value, gene);
  if (GENOTYPE_EFFECTS[gene] && phenotype?.phenotype) {
    return { gene, phenotype:phenotype.phenotype, interpretation:{ ...phenotype, reportedLabel } };
  }
  if (typeof GENOTYPE_RISK_EFFECTS !== 'undefined' && GENOTYPE_RISK_EFFECTS[gene] && status) {
    return { gene, status, interpretation:buildRiskInterpretation(gene, status, { reportedLabel }) };
  }
  return null;
}

function pharmGxObjectReportedLabel(row, value) {
  const reported = [
    row.genotype,
    row.Genotype,
    row.diplotype,
    row.Diplotype,
    row.alleles,
    row.Alleles,
    value,
  ].map(v => String(v || "").trim()).filter(Boolean);
  return [...new Set(reported)].join(" / ") || String(value || "").trim();
}

function parsePharmGxLine(line) {
  const clean = line.trim();
  if (!clean || clean.startsWith("|---") || /^gene\s*[,\t|]/i.test(clean)) return null;
  const parts = clean
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/\s*\|\s*|,|\t/)
    .map(p => p.trim())
    .filter(Boolean);
  const gene = normalizePharmGxGene(parts.find(p => normalizePharmGxGene(p)));
  if (!gene) return null;
  const phenotypeText = parts.slice().reverse().find(p => phenotypeTextToGenotype(p, gene));
  const phenotype = phenotypeTextToGenotype(phenotypeText || clean, gene);
  const statusText = parts.slice().reverse().find(p => riskTextToStatus(p, gene));
  const status = riskTextToStatus(statusText || clean, gene);
  const reportedLabel = pharmGxLineReportedLabel(parts, gene, phenotypeText || statusText || clean);
  if (GENOTYPE_EFFECTS[gene] && phenotype?.phenotype) {
    return { gene, phenotype:phenotype.phenotype, interpretation:{ ...phenotype, reportedLabel } };
  }
  if (typeof GENOTYPE_RISK_EFFECTS !== 'undefined' && GENOTYPE_RISK_EFFECTS[gene] && status) {
    return { gene, status, interpretation:buildRiskInterpretation(gene, status, { reportedLabel }) };
  }
  return null;
}

function pharmGxLineReportedLabel(parts, gene, fallback) {
  const reported = parts.filter(part => normalizePharmGxGene(part) !== gene);
  return reported.length ? reported.join(" / ") : String(fallback || "").trim();
}

function normalizePharmGxGene(value) {
  const gene = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  if (GENOTYPE_EFFECTS[gene]) return gene;
  const genotypeAliases = {
    IL28B: "IFNL3",
    MUOPIOIDRECEPTOR: "OPRM1",
    MOR: "OPRM1",
    OCT1: "SLC22A1",
    OCT2: "SLC22A2",
    MATE1: "SLC47A1",
  };
  if (genotypeAliases[gene] && GENOTYPE_EFFECTS[genotypeAliases[gene]]) return genotypeAliases[gene];
  if (typeof GENOTYPE_RISK_EFFECTS === 'undefined') return null;
  const riskAliases = {
    MTHFR: "MTHFR C677T",
    GABRG2: "GABRG2 variant",
    G6PD: "G6PD deficiency",
    MTRNR1: "MT-RNR1 m.1555A>G",
    "MT-RNR1": "MT-RNR1 m.1555A>G",
    RYR1: "RYR1/CACNA1S MH variant",
    CACNA1S: "RYR1/CACNA1S MH variant",
    SCN1A: "SCN1A sodium-channel variant",
    SCN2A: "SCN2A sodium-channel variant",
    KCNH2: "KCNH2 long-QT variant",
    HERG: "KCNH2 long-QT variant",
  };
  if (riskAliases[gene] && GENOTYPE_RISK_EFFECTS[riskAliases[gene]]) return riskAliases[gene];
  const exactRiskKey = Object.keys(GENOTYPE_RISK_EFFECTS).find(key =>
    key.toUpperCase().replace(/\s+/g, "") === gene
  );
  if (exactRiskKey) return exactRiskKey;
  const geneMatches = Object.keys(GENOTYPE_RISK_EFFECTS).filter(key =>
    (GENOTYPE_RISK_EFFECTS[key].gene || "").toUpperCase().replace(/\s+/g, "") === gene
  );
  return geneMatches.length === 1 ? geneMatches[0] : null;
}

function phenotypeTextToGenotype(value, gene = null) {
  return typeof normalizeGenePhenotypeInput === "function"
    ? normalizeGenePhenotypeInput(gene, value)
    : null;
}

function riskTextToStatus(value, gene = null) {
  const text = String(value || "").toLowerCase();
  if (!text) return null;
  const normalized = text.replace(/[_-]+/g, " ");
  const riskKey = gene && typeof GENOTYPE_RISK_EFFECTS !== "undefined" ? GENOTYPE_RISK_EFFECTS[gene] : null;
  if (riskKey && /deficient|deficiency/.test(normalized)) return GENOTYPE_RISK_STATUS.PRESENT;
  if (/absent|negative|not detected|not present|normal|no variant|wild ?type|hom cc|hom ref/.test(normalized)) return GENOTYPE_RISK_STATUS.ABSENT;
  if (/present|positive|detected|carrier|risk allele|deficient|variant found|pathogenic|null|hom tt|hom alt|hetero|contraindicated/.test(normalized)) return GENOTYPE_RISK_STATUS.PRESENT;
  return null;
}

// ── renderPhenotypeAccumulation (#6) ────────────────────────────────
