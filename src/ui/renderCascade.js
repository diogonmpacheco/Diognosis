// Diognosis — Effect cascade visualization
// Phase F: weighted propagating confidence, convergence detection, impact scoring
// Phase A: modular source — concatenated by build.js

function renderCascade() {
  const el      = document.getElementById("cascadeBody");
  const section = document.getElementById("cascadeSection");
  if (!el) return;
  if (activeStack.length < 1) {
    hideSectionAndClear("cascadeSection", "cascadeBody");
    return;
  }
  if (section) section.style.display = "";

  const graph   = getInteractionGraph();
  const summary = buildClinicalSummary();
  const { convergencePoints, drugSummaries, highRiskPaths } = summary;

  // ── Edge label map ────────────────────────────────────────────────
  const edgeLabel = {
    [EDGE_TYPE.INHIBITS]:       '↓ inhibits',
    [EDGE_TYPE.INDUCES]:        '↑ induces',
    [EDGE_TYPE.METABOLIZED_TO]: '→ forms',
    [EDGE_TYPE.ACTIVATES]:      '→ activates',
    [EDGE_TYPE.BLOCKS]:         '✕ blocks',
    [EDGE_TYPE.SUPPRESSES]:     '↓ suppresses',
    [EDGE_TYPE.PRODUCES]:       '→ produces',
    [EDGE_TYPE.SUBSTRATE_OF]:   '→ via',
    [EDGE_TYPE.TRANSPORTED_BY]: '→ via',
    [EDGE_TYPE.COMPETES_WITH]:  '⟷ competes',
    [EDGE_TYPE.ACCUMULATES_IN]: '→ in',
  };

  // ── Node CSS class ────────────────────────────────────────────────
  function nodeClass(actor) {
    if (!actor) return 'cs-node';
    if (actor.type === ACTOR_TYPE.ENZYME)      return 'cs-node type-enzyme';
    if (actor.type === ACTOR_TYPE.METABOLITE)  return 'cs-node type-metabolite';
    if (actor.type === ACTOR_TYPE.RECEPTOR)    return 'cs-node type-receptor';
    if (actor.type === ACTOR_TYPE.FOOD || actor.type === ACTOR_TYPE.ENDOGENOUS) return 'cs-node type-food';
    if (actor.type === ACTOR_TYPE.PHENOTYPE) {
      const sev = actor.severity || 'info';
      return `cs-node type-phenotype-${sev === 'critical' ? 'critical' : sev === 'warn' ? 'warn' : 'info'}`;
    }
    return 'cs-node';
  }

  function phenotypeClass(sev) {
    return sev === 'critical' ? 'phenotype-critical' :
           sev === 'warn'     ? 'phenotype-warn'     :
           sev === 'monitor'  ? 'phenotype-monitor'  : 'phenotype-info';
  }

  // ── Render a single effect path ──────────────────────────────────
  function renderPathHTML(eff, sourceActor, showImpact) {
    const sev     = eff.terminalActor ? (eff.terminalActor.severity || 'info') : 'info';
    const confPct = Math.round(eff.confidence * 100);
    const hops    = computeHopConfidences(eff, graph);

    // Build step HTML with per-hop confidence badges
    const srcName = sourceActor ? sourceActor.name : (eff.path[0] ? eff.path[0].actorId : '?');
    let stepsHTML = `<span class="${nodeClass(sourceActor)}">${srcName}</span>`;

    hops.forEach((hop, i) => {
      const toActor = graph.actors[hop.toId];
      const arrow   = edgeLabel[hop.edgeType] || '→';
      stepsHTML += `<span class="cs-edge">${arrow}</span>`;
      // Show per-hop confidence on every step (dim if high confidence, bright if low)
      const hopClass = hop.edgeConf >= 80 ? 'cs-hop-conf high' : hop.edgeConf >= 60 ? 'cs-hop-conf mid' : 'cs-hop-conf low';
      stepsHTML += `<span class="cs-hop-wrap">`;
      stepsHTML += `<span class="${nodeClass(toActor)}">${hop.toName}</span>`;
      stepsHTML += `<span class="${hopClass}" title="Edge confidence: ${hop.edgeConf}%">${hop.edgeConf}%</span>`;
      stepsHTML += `</span>`;
    });

    // Temporal note
    const t = eff.temporal;
    let temporalNote = '';
    if (t && (t.onset || t.persistence || t.adiposeAccumulation)) {
      const parts = [];
      if (t.onset) parts.push(`onset: ${t.onset}`);
      if (t.persistence && t.persistence !== 'transient') parts.push(`persists: ${t.persistence}`);
      if (t.adiposeAccumulation) parts.push('adipose accumulation — slow release');
      if (t.reversible === false) parts.push('irreversible (enzyme resynthesis required)');
      temporalNote = parts.join(' · ');
    }

    const impactBadge = showImpact && eff.impactScore != null
      ? `<span class="cs-impact-score" title="Impact = confidence × clinical severity × structural weight">impact ${eff.impactScore}</span>`
      : '';
    const dirBadge = eff.direction !== 'unknown'
      ? `<span class="cs-dir-badge cs-dir-${eff.direction}">${eff.direction === 'increase' ? '↑ elevated' : '↓ reduced'}</span>`
      : '';

    return `<div class="cascade-chain ${phenotypeClass(sev)}">
      <div class="cascade-header">
        <span class="cascade-source">${eff.path.length + 1}-hop</span>
        <span class="cascade-conf">${confPct}% conf</span>
        ${dirBadge}
        ${impactBadge}
      </div>
      <div class="cascade-steps">${stepsHTML}</div>
      ${temporalNote ? `<div class="cascade-temporal">⏱ ${temporalNote}</div>` : ''}
    </div>`;
  }

  let html = '';

  // ── SECTION 1: Convergence Alerts ────────────────────────────────
  // Multiple drugs independently converging on the same dangerous phenotype.
  // These are the highest-priority multi-drug scenarios.
  const topConvergence = convergencePoints
    .filter(cp => cp.terminalActor && cp.combinedConfidence >= 20)
    .slice(0, 4);

  if (topConvergence.length > 0) {
    html += `<div class="cs-section-header cs-convergence-header">
      ⚠ Multi-drug convergence
      <span class="cs-section-desc">Multiple medications independently contributing to the same outcome</span>
    </div>`;

    for (const cp of topConvergence) {
      const sev = cp.terminalActor.severity || 'info';
      const severityW = cp.paths[0] ? cp.paths[0].severityWeight : 1.0;
      html += `<div class="cs-convergence-card ${phenotypeClass(sev)}">
        <div class="cs-conv-header">
          <span class="cs-conv-terminal">${cp.terminalActor.name || cp.terminal}</span>
          <span class="cs-conv-sources">${cp.drugSources.join(' + ')}</span>
          <span class="cs-conv-conf">${cp.combinedConfidence}% combined</span>
          <span class="cs-conv-impact">impact ${cp.impactScore}</span>
        </div>
        <div class="cs-conv-detail">
          ${cp.convergenceCount} contributing source${cp.convergenceCount > 1 ? 's' : ''} ·
          severity weight ${(severityW * 100).toFixed(0)}%
        </div>
        <div class="cs-conv-paths">
          ${cp.paths.slice(0, 3).map(eff => {
            const srcActor = graph.actors[eff.sourceId];
            return renderPathHTML(eff, srcActor, false);
          }).join('')}
        </div>
      </div>`;
    }
  }

  // ── SECTION 2: Per-drug high-impact paths ─────────────────────────
  if (drugSummaries.length > 0) {
    html += `<div class="cs-section-header">Effect pathways by drug</div>`;

    let totalShown = 0;
    for (const ds of drugSummaries) {
      if (totalShown >= 16) break;
      const drugActor = graph.actors[ds.drugId];
      const paths = ds.topPaths.filter(p => p.terminalActor);
      if (!paths.length) continue;

      html += `<div class="cs-drug-group">
        <div class="cs-drug-label">${ds.drug}</div>`;
      for (const eff of paths.slice(0, 4)) {
        html += renderPathHTML(eff, drugActor, true);
        totalShown++;
      }
      html += `</div>`;
    }
  }

  // ── Empty state ────────────────────────────────────────────────────
  if (!html) {
    el.innerHTML = '<div class="cascade-empty">No multi-hop effect cascades detected for this combination</div>';
    return;
  }

  // ── Footer: graph stats ────────────────────────────────────────────
  const stats = getGraphStats();
  html += `<div class="graph-stats">
    <span class="gs-pill">Nodes: ${stats.totalActors}</span>
    <span class="gs-pill">Edges: ${stats.totalEdges}</span>
    ${Object.entries(stats.actorsByType).map(([t,n]) => `<span class="gs-pill">${t}: ${n}</span>`).join('')}
    ${convergencePoints.length > 0 ? `<span class="gs-pill cs-pill-warn">${convergencePoints.length} convergence point${convergencePoints.length > 1 ? 's' : ''}</span>` : ''}
  </div>`;

  el.innerHTML = html;
}
