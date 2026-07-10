// Diognosis — Evidence explorer panel
// Phase A: modular source — concatenated by build.js

function renderEvidenceExplorer() {
  const el = document.getElementById("evidenceBody");
  const section = document.getElementById("evidenceSection");
  const countEl = document.getElementById("evidenceCount");
  if (!el) return;

  if (activeStack.length < 1) {
    hideSectionAndClear("evidenceSection", "evidenceBody", "evidenceCount");
    return;
  }

  // Collect all relevant studies for current stack.
  // Public trust status keeps authority sources, primary literature, and modeled
  // context separate. Modeled context is never presented as clinical authority.
  const relevantStudies = new Map();
  const drugNames = activeStack.map(n => n.toLowerCase());
  const geneNames = Object.keys(activeGenotype || {}).map(n => n.toLowerCase());
  const stackContext = typeof getStackEvidenceContext === "function"
    ? getStackEvidenceContext()
    : { evidenceRefs:new Set() };
  const pgxActionRows = typeof getPgxActionSummariesForStack === "function"
    ? getPgxActionSummariesForStack(activeStack, activeGenotype || {})
    : [];
  const pgxActionEvidenceRefs = new Set(pgxActionRows.flatMap(row => row.evidenceRefs || []));
  const pendingCalculationContext = typeof getRenderComputationCache === "function"
    ? getRenderComputationCache().pendingCalculationContext
    : (typeof getActivePendingCalculationContext === "function" ? getActivePendingCalculationContext() : null);
  const cache = typeof getRenderComputationCache === "function" ? getRenderComputationCache() : null;
  const findings = cache
    ? ((cache.clinicalConcerns || []).length ? cache.clinicalConcerns : cache.findings)
    : (typeof buildInteractionFindings === "function"
      ? buildInteractionFindings(activeStack, activeGenotype || {}, { interactions:activeStack.length >= 2 ? calcRisk().interactions : [] })
      : []);

  const studyEntries = typeof getEvidenceStudyEntries === "function"
    ? getEvidenceStudyEntries(pendingCalculationContext)
    : Object.entries(STUDY_DB);
  for (const [sid, study] of studyEntries) {
    if (study.public === false) continue;
    const title = (study.title || '').toLowerCase();
    const source = (study.source || '').toLowerCase();
    const supports = (study.supports || []).join(' ').toLowerCase();
    const relevantToStack = drugNames.some(name =>
      title.includes(name) || source.includes(name) || supports.includes(name)) ||
      geneNames.some(name => title.includes(name) || source.includes(name) || supports.includes(name)) ||
      stackContext.evidenceRefs?.has?.(sid) ||
      pgxActionEvidenceRefs.has(sid);
    if (!relevantToStack) continue;
    relevantStudies.set(sid, study);
  }

  if (relevantStudies.size === 0 && !findings.length) {
    hideSectionAndClear("evidenceSection", "evidenceBody", "evidenceCount");
    return;
  }

  if (section) section.style.display = "";

  const combinedStudies = [...relevantStudies.values()]
    .sort((a, b) => {
      return (EVIDENCE_WEIGHT[b.type] || 0) - (EVIDENCE_WEIGHT[a.type] || 0);
    });
  const findingEvidenceRefs = new Set([
    ...(findings || []).flatMap(finding => finding.evidenceRefs || []),
    ...pgxActionEvidenceRefs,
  ]);
  const findingLinkedStudies = combinedStudies.filter(study => findingEvidenceRefs.has(study.id));
  const focusedStudies = findingLinkedStudies.length ? findingLinkedStudies : combinedStudies.slice(0, Math.min(12, combinedStudies.length));
  const additionalStudies = combinedStudies.filter(study => !focusedStudies.includes(study));
  const standardMode = typeof isReviewerMode === "function" && !isReviewerMode();
  const sourceDetailsState = standardMode ? "" : " open";

  if (countEl) {
    const authorityCount = combinedStudies.filter(study => typeof isAuthorityEvidence === "function" && isAuthorityEvidence(study)).length;
    const primaryCount = combinedStudies.filter(study => typeof isPrimaryLiteratureEvidence === "function" && isPrimaryLiteratureEvidence(study)).length;
    countEl.textContent = `${authorityCount} authority · ${primaryCount} primary-literature · ${combinedStudies.length} linked total`;
  }

  // Tier filter buttons span the focused source cards, not every stack-adjacent entry.
  const tiers = [...new Set(focusedStudies.map(s => s.type).filter(Boolean))].sort();
  const tierFilterHTML = focusedStudies.length ? `<div class="ev-explorer-filter" id="evFilterWrap">
    <button type="button" class="ev-filter-btn active" aria-pressed="true" data-action="filter-evidence" data-tier="">All (${focusedStudies.length})</button>
    ${tiers.map(t => {
      const count = focusedStudies.filter(s => s.type === t).length;
      return `<button type="button" class="ev-filter-btn" aria-pressed="false" data-action="filter-evidence" data-tier="${safeAttr(t)}">${safePublicHtml(t.replace(/_/g,' '))} (${count})</button>`;
    }).join('')}
  </div>` : '';

  const cardsHTML = focusedStudies
    .map(s => `<div class="ev-explorer-card" data-tier="${s.type || 'uncategorized'}">${studyCardHTML(s)}</div>`)
    .join('') || `<div class="ev-explorer-empty" style="color:var(--text2);font-size:13px;padding:8px 4px">No evidence entries match this stack yet.</div>`;
  const additionalCardsHTML = additionalStudies.length
    ? (standardMode
      ? `<div class="ev-source-empty">Broader stack-matched source entries are not shown in the default V1 view because they are not primary citations for the ranked findings.</div>`
      : additionalStudies.map(s => `<div class="ev-explorer-card" data-tier="${s.type || 'uncategorized'}">${studyCardHTML(s)}</div>`).join(""))
    : `<div class="ev-source-empty">No additional stack-matched sources beyond the current findings.</div>`;
  const focusedSourceBrowser = `<details class="ev-source-details"${sourceDetailsState}>
    <summary>Source details for current findings (${focusedStudies.length})</summary>
    <div class="ev-source-note">These cards expand the citations directly attached to the current finding priorities. Use the ledger above for the quickest trust check.</div>
    ${tierFilterHTML}
    <div id="evCardsContainer">${cardsHTML}</div>
  </details>`;
  const additionalSourceBrowser = additionalStudies.length ? `<details class="ev-source-details"${sourceDetailsState}>
    <summary>Additional matching sources (${additionalStudies.length})</summary>
    <div class="ev-source-note">These linked entries match the selected stack but are not the primary citations for the ranked findings.</div>
    <div id="evAdditionalCardsContainer">${additionalCardsHTML}</div>
  </details>` : "";
  const ladderLedger = renderEvidenceLadderLedger(findings);
  const sourceStrengthStrip = renderEvidenceAtAGlance(focusedStudies, findings, combinedStudies);

  const reviewNotice = `<div class="ev-review-notice" style="margin-bottom:10px;border:1px solid var(--amber);background:var(--amberBg);border-radius:8px;padding:8px 10px;font-size:11px;color:var(--amber);line-height:1.5">
    Authority-linked means the claim points to an official regulator or recognized guideline. Primary-literature linked means it points to a claim-specific study. Modeled context is kept separate and cannot preserve severe output. Diognosis has no independent professional sign-off and is not medical advice.
  </div>`;

  el.innerHTML = reviewNotice + sourceStrengthStrip + ladderLedger + focusedSourceBrowser + additionalSourceBrowser;
}

function filterEvidenceTier(tier, btn) {
  // Update active button
  const wrap = document.getElementById('evFilterWrap');
  if (wrap) wrap.querySelectorAll('.ev-filter-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-pressed', 'false');
  });
  if (btn) {
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
  }
  // Show/hide cards
  const container = document.getElementById('evCardsContainer');
  if (!container) return;
  container.querySelectorAll('.ev-explorer-card').forEach(card => {
    card.style.display = (!tier || card.dataset.tier === tier) ? '' : 'none';
  });
}

function renderEvidenceLadderLedger(findings = []) {
  const rowsByRef = new Map();
  for (const finding of findings || []) {
    for (const ref of finding.evidenceRefs || []) {
      const study = typeof getStudy === "function" ? getStudy(ref) : STUDY_DB[ref];
      if (!study) continue;
      const row = rowsByRef.get(ref) || {
        ref,
        study,
        findings: [],
        ladder: computeEvidenceLadder([ref], { sourceLinked:true, calculationBearing:true }),
      };
      row.findings.push(finding.title || finding.id || "Finding");
      rowsByRef.set(ref, row);
    }
  }
  const sourceLinkedFindings = findings.filter(finding => finding.evidenceLadder?.sourceLinked);
  const noRefFindings = findings.length - sourceLinkedFindings.length;
  const authorityFindings = findings.filter(finding => finding.evidenceLadder?.authorityLinked);
  const modeledFindings = findings.filter(finding => finding.evidenceLadder?.modeledOnly || !finding.evidenceLadder?.sourceLinked);
  const rows = [...rowsByRef.values()].sort((a, b) =>
    (EVIDENCE_WEIGHT[b.study.type] || 0) - (EVIDENCE_WEIGHT[a.study.type] || 0) ||
    String(a.study.title || "").localeCompare(String(b.study.title || ""))
  );
  const rowHtml = rows.length ? rows.slice(0, 18).map(row => {
    const ladder = row.ladder;
    const tier = ladder.strongestTier && ladder.strongestTier !== "unknown" ? ladder.strongestTier.replace(/_/g, " ") : "unknown";
    const identifiers = ladder.publicIdentifiers?.length ? ladder.publicIdentifiers.join(" · ") : "source-linked entry";
    const title = publicEvidenceTitle(row.study);
    const relatedButton = typeof renderRelatedFindingButton === "function"
      ? renderRelatedFindingButton({ terms:row.findings, evidenceRefs:[row.ref] }, "Open finding")
      : "";
    return `<div class="evidence-ledger-row">
      <div class="evidence-ledger-head">
        <div>
          <div class="evidence-ledger-title">${safePublicHtml(title)}</div>
          <div class="evidence-ledger-meta">${safePublicHtml(tier.toLowerCase())} · ${safePublicHtml(identifiers)}</div>
        </div>
        <span class="ev-review-badge ${ladder.authorityLinked ? "reviewed" : "needs-review"}">${safePublicHtml(sourceSupportStatusLabel(ladder.sourceSupportStatus))}</span>
      </div>
      <div class="evidence-ledger-support">${safePublicHtml([...new Set(row.findings)].slice(0, 4).join(" · "))}</div>
      ${relatedButton ? `<div class="supporting-actions">${relatedButton}</div>` : ""}
      <div class="finding-meta">
        <span class="finding-tag">source: ${safePublicHtml(typeof compactReviewStatus === "function" ? compactReviewStatus(sourceSupportStatusLabel(ladder.sourceSupportStatus)) : sourceSupportStatusLabel(ladder.sourceSupportStatus))}</span>
        <span class="finding-tag">mechanistic: ${safePublicHtml(ladder.mechanisticConfidence)}</span>
        <span class="finding-tag">clinical action: ${safePublicHtml(typeof compactReviewStatus === "function" ? compactReviewStatus(String(ladder.clinicalActionConfidence).replace(/_/g, " ")) : String(ladder.clinicalActionConfidence).replace(/_/g, " "))}</span>
        <span class="finding-tag">independent sign-off: ${safePublicHtml(ladder.professionalReviewStatus === "reviewed" ? "recorded" : "not recorded")}</span>
        <span class="finding-tag">${row.study.quantifiedEffects ? "calculation-bearing context" : "qualitative context"}</span>
      </div>
    </div>`;
  }).join("") : `<div class="evidence-ledger-empty">Some findings are modeled review prompts and do not yet have linked source refs. Source absence is shown on each finding card.</div>`;
  return `<div class="evidence-ledger" id="evidenceLadderLedger">
    <div class="evidence-ledger-summary">
      <div><strong>${safePublicHtml(String(findings.length))}</strong><span>current findings</span></div>
      <div><strong>${safePublicHtml(String(authorityFindings.length))}</strong><span>authority-linked findings</span></div>
      <div><strong>${safePublicHtml(String(modeledFindings.length))}</strong><span>modeled findings</span></div>
      <div><strong>${safePublicHtml(String(noRefFindings))}</strong><span>inferred / no refs</span></div>
    </div>
    <div class="evidence-ledger-label">Evidence Browser / Evidence Ledger</div>
    <div class="evidence-ledger-list">${rowHtml}</div>
  </div>`;
}

function renderEvidenceAtAGlance(focusedStudies = [], findings = [], allStudies = []) {
  const groups = evidenceAtAGlanceGroups(focusedStudies);
  const sourceLinkedFindings = (findings || []).filter(finding => finding.evidenceLadder?.sourceLinked).length;
  const authoritySources = (focusedStudies || []).filter(study => typeof isAuthorityEvidence === "function" && isAuthorityEvidence(study)).length;
  const quantifiedStudies = (focusedStudies || []).filter(study => study.quantifiedEffects).length;
  const strongest = focusedStudies.length
    ? focusedStudies.reduce((best, study) => (EVIDENCE_WEIGHT[study.type] || 0) > (EVIDENCE_WEIGHT[best.type] || 0) ? study : best, focusedStudies[0])
    : null;
  const strongestLabel = strongest?.type ? strongest.type.replace(/_/g, " ") : "none yet";
  const tiles = groups.map(group => `<div class="evidence-glance-tile ${safePublicHtml(group.className)}">
    <strong>${safePublicHtml(String(group.count))}</strong>
    <span>${safePublicHtml(group.label)}</span>
    <small>${safePublicHtml(group.note)}</small>
  </div>`).join("");
  return `<div class="evidence-at-glance">
    <div class="evidence-glance-head">
      <div>
        <div class="evidence-glance-kicker">Evidence at a glance</div>
        <div class="evidence-glance-title">${safePublicHtml(String(authoritySources))} authority source${authoritySources === 1 ? "" : "s"} · ${safePublicHtml(String(sourceLinkedFindings))} linked finding${sourceLinkedFindings === 1 ? "" : "s"} · strongest tier: ${safePublicHtml(strongestLabel.toLowerCase())}</div>
      </div>
      <div class="evidence-glance-count">${safePublicHtml(String(focusedStudies.length))} focused source${focusedStudies.length === 1 ? "" : "s"}</div>
    </div>
    <div class="evidence-glance-grid">${tiles}</div>
    <div class="evidence-glance-note">${safePublicHtml(String(quantifiedStudies))} focused source${quantifiedStudies === 1 ? "" : "s"} include quantified exposure/effect data. Broader stack-matched sources (${safePublicHtml(String(allStudies.length))}) stay collapsed below unless they directly support the ranked findings.</div>
  </div>`;
}

function evidenceAtAGlanceGroups(studies = []) {
  const hasType = type => studies.filter(study => study.type === type).length;
  const authority = studies.filter(study => typeof isAuthorityEvidence === "function" && isAuthorityEvidence(study)).length;
  const labelGuidance = hasType(EVIDENCE_TIER.FDA_LABEL) + hasType(EVIDENCE_TIER.GUIDELINE);
  const clinical = hasType(EVIDENCE_TIER.META_ANALYSIS) + hasType(EVIDENCE_TIER.RCT) + hasType(EVIDENCE_TIER.CLINICAL_PK);
  const observational = hasType(EVIDENCE_TIER.OBSERVATIONAL) + hasType(EVIDENCE_TIER.CASE_REPORT);
  const mechanism = hasType(EVIDENCE_TIER.IN_VITRO) + hasType(EVIDENCE_TIER.ANIMAL) + hasType(EVIDENCE_TIER.MECHANISTIC) + hasType(EVIDENCE_TIER.REVIEW);
  return [
    { label:"Authority sources", count:authority, className:"guidance", note:"Regulator or recognized guideline" },
    { label:"Label / guideline", count:Math.max(0, labelGuidance - authority), className:"guidance", note:"Linked label or guideline context" },
    { label:"Clinical PK / trials", count:clinical, className:"clinical", note:"Human exposure or trial evidence" },
    { label:"Human observations", count:observational, className:"observational", note:"Clinical reports and cohorts" },
    { label:"Mechanistic context", count:mechanism, className:"mechanistic", note:"Biology, in-vitro, or review context" },
  ];
}

function renderQualityDashboard() {
  const section = document.getElementById("qualitySection");
  const el = document.getElementById("qualityBody");
  const countEl = document.getElementById("qualityCount");
  if (!el) return;
  if (typeof isReviewerMode === "function" && !isReviewerMode()) {
    hideSectionAndClear("qualitySection", "qualityBody", "qualityCount");
    return;
  }
  if (activeStack.length < 1) {
    hideSectionAndClear("qualitySection", "qualityBody", "qualityCount");
    return;
  }

  const studies = Object.values(STUDY_DB || {});
  const publicStudies = studies.filter(s => s.public !== false);
  const traceableStudies = publicStudies.filter(s => s.pmid || s.doi || s.url || s.source);
  const qualitative = [];
  const quantified = [];
  const missingSignals = [];
  for (const effect of GENOTYPE_METABOLITE_EFFECTS || []) {
    for (const [phenotype, pe] of Object.entries(effect.effects || {})) {
      if (!pe || pe.direction === "baseline" || pe.direction === "uncertain") continue;
      if (pe.qualitative) qualitative.push(`${effect.parent} -> ${effect.metaboliteName} ${phenotype}`);
      if (pe.fold) quantified.push(`${effect.parent} -> ${effect.metaboliteName} ${phenotype}`);
    }
    if (!effect.exposureSignal) missingSignals.push(`${effect.parent} -> ${effect.metaboliteName}`);
  }
  const estimatedFoldCount = (document.getElementById("foldBody")?.textContent || "").match(/model estimate/g)?.length || 0;
  const knownDdiMissingRefs = (KNOWN_DDI || []).filter(d => !d.evidenceRefs || d.evidenceRefs.length === 0).length;
  const stackStudies = publicStudies.filter(s => activeStack.some(name =>
    JSON.stringify([s.id,s.title,s.source,s.supports,s.quantifiedEffects]).toLowerCase().includes(name.toLowerCase())
  ));
  const authorityStudies = publicStudies.filter(s => typeof isAuthorityEvidence === "function" && isAuthorityEvidence(s));
  const primaryLiteratureStudies = publicStudies.filter(s => typeof isPrimaryLiteratureEvidence === "function" && isPrimaryLiteratureEvidence(s));
  const modeledStudies = studies.filter(s => typeof isModeledContextEvidence === "function" && isModeledContextEvidence(s));

  if (section) section.style.display = "";
  if (countEl) countEl.textContent = `${authorityStudies.length} authority · ${primaryLiteratureStudies.length} primary-literature`;

  const issueItems = [
    ...missingSignals.slice(0,3).map(x => `<div class="quality-item"><strong>Schema upgrade:</strong> add explicit exposure/action metadata for ${safePublicHtml(x)}</div>`),
    knownDdiMissingRefs ? `<div class="quality-item"><strong>Interaction provenance:</strong> ${knownDdiMissingRefs} interaction rows still rely on inline evidence instead of STUDY_DB refs.</div>` : ""
  ].filter(Boolean).join("");

  el.innerHTML = `
    <div class="quality-grid">
      <div class="quality-tile"><div class="quality-num">${DRUG_DB.length}</div><div class="quality-label">Drugs</div><div class="quality-note">Current searchable database</div></div>
      <div class="quality-tile"><div class="quality-num">${authorityStudies.length}</div><div class="quality-label">Authority Sources</div><div class="quality-note">Regulator and recognized guideline links</div></div>
      <div class="quality-tile"><div class="quality-num">${primaryLiteratureStudies.length}</div><div class="quality-label">Primary Literature</div><div class="quality-note">Claim-specific PMID or DOI records</div></div>
      <div class="quality-tile"><div class="quality-num">${modeledStudies.length}</div><div class="quality-label">Modeled Context</div><div class="quality-note">Hidden from public evidence and not severity-bearing</div></div>
      <div class="quality-tile"><div class="quality-num">${stackStudies.length}</div><div class="quality-label">Stack-Matched Sources</div><div class="quality-note">Public evidence matching the current list</div></div>
      <div class="quality-tile"><div class="quality-num">${quantified.length}</div><div class="quality-label">Quantified Gene Effects</div><div class="quality-note">Metabolite/active-form rows with numeric folds</div></div>
      <div class="quality-tile"><div class="quality-num">${qualitative.length}</div><div class="quality-label">Qualitative Gene Effects</div><div class="quality-note">Shown without invented fold numbers</div></div>
      <div class="quality-tile"><div class="quality-num">${traceableStudies.length}</div><div class="quality-label">Traceable Source IDs</div><div class="quality-note">Entries with source, PMID, DOI, or URL metadata</div></div>
      <div class="quality-tile"><div class="quality-num">${estimatedFoldCount}</div><div class="quality-label">Live Model Estimates</div><div class="quality-note">Estimated folds visible in the current stack</div></div>
    </div>
    ${issueItems ? `<div class="quality-list">${issueItems}</div>` : `<div class="quality-list"><div class="quality-item"><strong>Current stack:</strong> no structural quality warnings surfaced by the local dashboard.</div></div>`}
  `;
}

// ── renderCascade — Explainable Graph Output ──
// Renders the traverseEffects() results as a visual pathway chain.
// Each chain shows: Source → edge → Node → edge → ... → Phenotype
// Color-coded by phenotype severity; confidence shown as percentage.
