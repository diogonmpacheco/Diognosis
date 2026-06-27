// Diognosis — D3.js interaction network graph
// Phase A: modular source — concatenated by build.js

function renderInteractionGraph() {
  const sec = document.getElementById("graphSection");
  const el = document.getElementById("graphBody");
  if (!el) return;
  if (activeStack.length < 1) {
    hideSectionAndClear("graphSection", "graphBody");
    return;
  }
  if (sec) sec.style.display = "";

  const graph = getInteractionGraph();

  // Build D3 nodes/edges filtered to relevant actors (depth-limited)
  const relevantIds = new Set();
  for (const drugName of activeStack) {
    const drugId = graphDrugIdForName(drugName);
    relevantIds.add(drugId);
    // Add direct neighbors
    for (const e of (graph.edges||[])) {
      if (e.from === drugId || e.to === drugId) {
        relevantIds.add(e.from);
        relevantIds.add(e.to);
        // Add one more hop
        for (const e2 of (graph.edges||[])) {
          if (e2.from === e.to || e2.to === e.from) {
            if (relevantIds.size < 50) { relevantIds.add(e2.from); relevantIds.add(e2.to); }
          }
        }
      }
    }
  }
  const nodes = Object.values(graph.actors)
    .filter(a => relevantIds.has(a.id))
    .slice(0, 60)
    .map(a => ({ id: a.id, name: a.name || a.id, type: a.type }));
  const nodeSet = new Set(nodes.map(n => n.id));
  const links = (graph.edges||[])
    .filter(e => nodeSet.has(e.from) && nodeSet.has(e.to))
    .map(e => ({ source: e.from, target: e.to, type: e.type }));

  // Color by actor type
  const typeColor = {
    [ACTOR_TYPE.DRUG]:         '#6366f1',
    [ACTOR_TYPE.METABOLITE]:   '#8b5cf6',
    [ACTOR_TYPE.ENZYME]:       '#3b82f6',
    [ACTOR_TYPE.TRANSPORTER]:  '#06b6d4',
    [ACTOR_TYPE.FOOD]:         '#10b981',
    [ACTOR_TYPE.ENVIRONMENTAL]:'#84cc16',
    [ACTOR_TYPE.ENDOGENOUS]:   '#f59e0b',
    [ACTOR_TYPE.RECEPTOR]:     '#f97316',
    [ACTOR_TYPE.PHENOTYPE]:    '#ef4444',
  };
  const edgeColor = {
    [EDGE_TYPE.INHIBITS]:       '#ef4444',
    [EDGE_TYPE.INDUCES]:        '#22c55e',
    [EDGE_TYPE.METABOLIZED_TO]: '#8b5cf6',
    [EDGE_TYPE.SUBSTRATE_OF]:   '#6366f1',
    [EDGE_TYPE.TRANSPORTED_BY]: '#06b6d4',
    [EDGE_TYPE.ACTIVATES]:      '#22c55e',
    [EDGE_TYPE.BLOCKS]:         '#ef4444',
    [EDGE_TYPE.PRODUCES]:       '#f59e0b',
  };

  // Legend
  const shownTypes = [...new Set(nodes.map(n => n.type))];
  let legendHTML = '<div class="d3-legend">';
  for (const t of shownTypes) {
    legendHTML += `<div class="d3-legend-item"><div class="d3-legend-dot" style="background:${typeColor[t]||'#999'}"></div>${t}</div>`;
  }
  legendHTML += '</div>';

  el.innerHTML = renderNetworkOverview(nodes, links, graph) + legendHTML + `<div id="d3-graph-container"></div>
    <div class="network-help">Hover nodes to highlight connections. Drag to reposition. Scroll to zoom.</div>`;

  // D3 rendering (deferred to next tick so DOM is ready)
  requestAnimationFrame(() => {
    const container = document.getElementById("d3-graph-container");
    if (!container || typeof d3 === 'undefined') {
      container && (container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text2);font-size:12px">D3.js loading… refresh to render graph.</div>');
      return;
    }
    container.innerHTML = '';
    const W = container.clientWidth || 600;
    const H = 420;

    const svg = d3.select(container).append('svg')
      .attr('width', W).attr('height', H)
      .style('background', 'transparent');

    // Arrowhead marker
    svg.append('defs').append('marker')
      .attr('id','arrowhead').attr('viewBox','0 -4 8 8').attr('refX',16).attr('refY',0)
      .attr('markerWidth',6).attr('markerHeight',6).attr('orient','auto')
      .append('path').attr('d','M0,-4L8,0L0,4').attr('fill','#999').attr('opacity',0.7);

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(80).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-180))
      .force('center', d3.forceCenter(W/2, H/2))
      .force('collision', d3.forceCollide().radius(28));

    const link = svg.append('g').selectAll('line').data(links).join('line')
      .attr('stroke', d => edgeColor[d.type] || '#aaa')
      .attr('stroke-width', 1.5).attr('stroke-opacity', 0.6)
      .attr('marker-end','url(#arrowhead)');

    const isActive = id => activeStack.some(n => graphDrugIdForName(n) === id);
    const node = svg.append('g').selectAll('circle').data(nodes).join('circle')
      .attr('r', d => isActive(d.id) ? 14 : 9)
      .attr('fill', d => typeColor[d.type] || '#999')
      .attr('stroke', d => isActive(d.id) ? '#fff' : 'transparent')
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event,d) => { if(!event.active) sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
        .on('drag',  (event,d) => { d.fx=event.x; d.fy=event.y; })
        .on('end',   (event,d) => { if(!event.active) sim.alphaTarget(0); d.fx=null; d.fy=null; })
      );

    const label = svg.append('g').selectAll('text').data(nodes).join('text')
      .text(d => d.name.length > 14 ? d.name.substring(0,12)+'…' : d.name)
      .attr('font-size', d => isActive(d.id) ? 11 : 9)
      .attr('fill', 'var(--text1)').attr('text-anchor','middle')
      .attr('dy', d => isActive(d.id) ? 24 : 18)
      .attr('pointer-events','none');

    // Tooltip
    const tooltip = d3.select(container).append('div')
      .style('position','absolute').style('background','var(--card)').style('border','1px solid var(--border)')
      .style('border-radius','6px').style('padding','6px 8px').style('font-size','11px')
      .style('pointer-events','none').style('opacity',0).style('max-width','180px');

    node.on('mouseover', (event, d) => {
        const connected = links.filter(l => l.source.id === d.id || l.target.id === d.id);
        tooltip.html(`<strong>${d.name}</strong><br><span style="color:var(--text2)">${d.type}</span>`)
          .style('opacity',1).style('left',(event.offsetX+10)+'px').style('top',(event.offsetY-20)+'px');
        link.attr('stroke-opacity', l => (l.source.id===d.id||l.target.id===d.id) ? 1.0 : 0.1);
        node.attr('opacity', n => (n.id===d.id || connected.some(l=>l.source.id===n.id||l.target.id===n.id)) ? 1 : 0.25);
      })
      .on('mouseout', () => {
        tooltip.style('opacity',0);
        link.attr('stroke-opacity', 0.6);
        node.attr('opacity',1);
      });

    // Zoom
    svg.call(d3.zoom().scaleExtent([0.3,3]).on('zoom', e => {
      svg.selectAll('g').attr('transform', e.transform);
    }));

    sim.on('tick', () => {
      link.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
      node.attr('cx',d=>d.x).attr('cy',d=>d.y);
      label.attr('x',d=>d.x).attr('y',d=>d.y);
    });
  });
}

function graphDrugIdForName(name) {
  if (typeof getDrugGraphId === "function") return getDrugGraphId(name);
  return toGraphId(name);
}

function renderNetworkOverview(nodes = [], links = [], graph = {}) {
  const activeIds = new Set((activeStack || []).map(graphDrugIdForName));
  const typeCounts = nodes.reduce((acc, node) => {
    const key = networkTypeLabel(node.type);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const directLinks = links
    .filter(link => activeIds.has(link.source) || activeIds.has(link.target))
    .sort((a, b) => networkEdgeWeight(b.type) - networkEdgeWeight(a.type))
    .slice(0, 6);
  const pathRows = directLinks.map(link => {
    const source = graph.actors?.[link.source] || nodes.find(node => node.id === link.source);
    const target = graph.actors?.[link.target] || nodes.find(node => node.id === link.target);
    return `<div class="network-route-row">
      <span class="network-route-node">${safePublicHtml(source?.name || link.source)}</span>
      <span class="network-route-edge ${safePublicHtml(networkEdgeClass(link.type))}">${safePublicHtml(networkEdgeLabel(link.type))}</span>
      <span class="network-route-node">${safePublicHtml(target?.name || link.target)}</span>
    </div>`;
  }).join("");
  const dominantTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([label, count]) => `<div><strong>${safePublicHtml(String(count))}</strong><span>${safePublicHtml(label)}</span></div>`)
    .join("");
  const selectedLabel = (activeStack || []).slice(0, 4).join(" + ");
  return `<div class="network-overview">
    <div class="network-overview-head">
      <div>
        <div class="network-kicker">Network at a glance</div>
        <div class="network-title">${safePublicHtml(selectedLabel || "Selected stack")}</div>
      </div>
      <div class="network-count">${safePublicHtml(String(nodes.length))} actors · ${safePublicHtml(String(links.length))} links</div>
    </div>
    <div class="network-summary-grid">
      ${dominantTypes || `<div><strong>0</strong><span>visible actors</span></div>`}
    </div>
    <div class="network-route-list">
      <div class="network-route-label">Top visible routes</div>
      ${pathRows || `<div class="network-empty">No direct routes are visible for this stack yet.</div>`}
    </div>
  </div>`;
}

function networkTypeLabel(type) {
  const labels = {
    [ACTOR_TYPE.DRUG]:"Substances",
    [ACTOR_TYPE.METABOLITE]:"Metabolites",
    [ACTOR_TYPE.ENZYME]:"Enzymes",
    [ACTOR_TYPE.TRANSPORTER]:"Transporters",
    [ACTOR_TYPE.FOOD]:"Food / supplement",
    [ACTOR_TYPE.ENVIRONMENTAL]:"Context",
    [ACTOR_TYPE.ENDOGENOUS]:"Endogenous",
    [ACTOR_TYPE.RECEPTOR]:"Receptors",
    [ACTOR_TYPE.PHENOTYPE]:"Effects",
  };
  return labels[type] || "Other actors";
}

function networkEdgeLabel(type) {
  const labels = {
    [EDGE_TYPE.INHIBITS]:"inhibits",
    [EDGE_TYPE.INDUCES]:"induces",
    [EDGE_TYPE.METABOLIZED_TO]:"forms",
    [EDGE_TYPE.SUBSTRATE_OF]:"uses pathway",
    [EDGE_TYPE.TRANSPORTED_BY]:"transported by",
    [EDGE_TYPE.ACTIVATES]:"activates",
    [EDGE_TYPE.BLOCKS]:"blocks",
    [EDGE_TYPE.PRODUCES]:"produces",
    [EDGE_TYPE.SUPPRESSES]:"suppresses",
    [EDGE_TYPE.COMPETES_WITH]:"competes",
    [EDGE_TYPE.ACCUMULATES_IN]:"accumulates in",
  };
  return labels[type] || String(type || "links to").replace(/_/g, " ");
}

function networkEdgeClass(type) {
  if (type === EDGE_TYPE.INHIBITS || type === EDGE_TYPE.BLOCKS || type === EDGE_TYPE.SUPPRESSES) return "down";
  if (type === EDGE_TYPE.INDUCES || type === EDGE_TYPE.ACTIVATES || type === EDGE_TYPE.PRODUCES) return "up";
  return "neutral";
}

function networkEdgeWeight(type) {
  const weights = {
    [EDGE_TYPE.INHIBITS]:9,
    [EDGE_TYPE.INDUCES]:8,
    [EDGE_TYPE.METABOLIZED_TO]:7,
    [EDGE_TYPE.ACTIVATES]:7,
    [EDGE_TYPE.TRANSPORTED_BY]:6,
    [EDGE_TYPE.SUBSTRATE_OF]:5,
  };
  return weights[type] || 1;
}

// ── renderWashoutCalendar (#9) ──────────────────────────────────────
