// Diognosis — Graph construction and effect traversal
// Phase A: modular source — concatenated by build.js

function toGraphId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function getDrugGraphId(drugName) {
  const drug = getDrug(drugName);
  return drug ? (drug.id || toGraphId(drug.name)) : toGraphId(drugName);
}

function getMetaboliteGraphId(name) {
  const rawId = toGraphId(name);
  return METABOLITE_ACTOR_ALIASES[rawId] || rawId;
}

// Build the unified interaction graph from all data sources
let _interactionGraph = null;
function getInteractionGraph() {
  if (_interactionGraph) return _interactionGraph;
  _interactionGraph = buildInteractionGraph();
  return _interactionGraph;
}

function invalidateGraph() { _interactionGraph = null; }

function buildInteractionGraph() {
  const actors = {};  // id → actor node
  const edges = [];   // {from, to, type, properties}

  // ── 1. Drugs ──
  for (const drug of DRUG_DB) {
    const did = drug.id || toGraphId(drug.name);
    actors[did] = { id:did, type:ACTOR_TYPE.DRUG, name:drug.name, data:drug };

    for (const route of (drug.routes || [])) {
      edges.push({ from:did, to:route.enzyme, type:EDGE_TYPE.SUBSTRATE_OF,
        props:{fraction:route.fraction, saturable:route.saturable, nonLinear:route.nonLinear, evidence:route.evidence} });
    }
    for (const inh of (drug.inh || [])) {
      edges.push({ from:did, to:inh.target, type:EDGE_TYPE.INHIBITS,
        props:{strength:inh.strength, mechanism:inh.mechanism, doseDependent:inh.doseDependent,
               timeDependent:inh.timeDependent, autoInhibition:inh.autoInhibition, evidence:inh.evidence} });
    }
    for (const ind of (drug.ind || [])) {
      edges.push({ from:did, to:ind.target, type:EDGE_TYPE.INDUCES,
        props:{strength:ind.strength, evidence:ind.evidence} });
    }
  }

  // ── 2. Metabolites from METAB ──
  for (const [drugName, metList] of Object.entries(METAB)) {
    const parentId = getDrugGraphId(drugName);
    for (const met of metList) {
      const metId = getMetaboliteGraphId(met.n);
      // Check if we have a detailed actor entry
      const detailed = METABOLITE_ACTORS[metId];
      actors[metId] = detailed || {
        id:metId, type:ACTOR_TYPE.METABOLITE, name:met.n, parentDrug:drugName,
        formingEnzyme:met.e, active:isMetaboliteActive(met),
        activity:normalizeMetaboliteActivity(met.a),
        role:met.role || null,
        halfLife:met.t || null, potencyRatio:null, data:met
      };

      // Parent → metabolite edge
      edges.push({ from:parentId, to:metId, type:EDGE_TYPE.METABOLIZED_TO,
        props:{enzyme:met.e, fraction:met.p/100, note:met.note, activity:normalizeMetaboliteActivity(met.a), role:met.role || null, evidenceRefs:met.evidenceRefs || []} });

      // Metabolite → forming enzyme (substrate_of)
      edges.push({ from:metId, to:met.e, type:EDGE_TYPE.SUBSTRATE_OF,
        props:{fraction:met.p/100, role:'formation_context', evidenceRefs:met.evidenceRefs || []} });

      // Detailed metabolite clearance routes. These are distinct from the
      // parent→metabolite formation route and may carry lower-confidence
      // provenance (for example hydroxybupropion/CYP2D6).
      if (detailed && detailed.routes) {
        for (const route of detailed.routes) {
          edges.push({ from:metId, to:route.enzyme, type:EDGE_TYPE.SUBSTRATE_OF,
            props:{fraction:route.fraction, role:route.role || 'clearance',
              evidence:route.evidence, evidenceRefs:route.evidenceRefs || route.evidence?.refs || []} });
        }
      }

      // Metabolite inhibitions (from METAB inh field)
      if (met.inh) {
        for (const inh of met.inh) {
          const detailedInh = detailed?.inh?.find(i => i.target === inh.e);
          edges.push({ from:metId, to:inh.e, type:EDGE_TYPE.INHIBITS,
            props:{strength:inh.s, mechanism:detailedInh?.mechanism, temporal:detailedInh?.temporal,
              evidence:detailedInh?.evidence, evidenceRefs:detailedInh?.evidenceRefs || detailedInh?.evidence?.refs || []} });
        }
      }
      // Metabolite inhibitions (from METABOLITE_ACTORS)
      if (detailed && detailed.inh) {
        for (const inh of detailed.inh) {
          // Avoid duplicate edges if already added from met.inh
          if (!met.inh || !met.inh.some(i => i.e === inh.target)) {
            edges.push({ from:metId, to:inh.target, type:EDGE_TYPE.INHIBITS,
              props:{strength:inh.strength, mechanism:inh.mechanism, temporal:inh.temporal,
                evidence:inh.evidence, evidenceRefs:inh.evidenceRefs || inh.evidence?.refs || []} });
          }
        }
      }
    }
  }

  // ── 3. Food/Xenobiotic Actors ──
  for (const [fid, food] of Object.entries(FOOD_ACTORS)) {
    actors[fid] = food;
    for (const route of (food.routes || [])) {
      edges.push({ from:fid, to:route.enzyme, type:EDGE_TYPE.SUBSTRATE_OF,
        props:{fraction:route.fraction, evidence:route.evidence, evidenceRefs:route.evidenceRefs || route.evidence?.refs || []} });
    }
    for (const inh of (food.inh || [])) {
      edges.push({ from:fid, to:inh.target, type:EDGE_TYPE.INHIBITS,
        props:{strength:inh.strength, mechanism:inh.mechanism, evidence:inh.evidence, evidenceRefs:inh.evidenceRefs || inh.evidence?.refs || []} });
    }
    for (const ind of (food.ind || [])) {
      edges.push({ from:fid, to:ind.target, type:EDGE_TYPE.INDUCES,
        props:{strength:ind.strength, mechanism:ind.mechanism, evidence:ind.evidence, evidenceRefs:ind.evidenceRefs || ind.evidence?.refs || []} });
    }
  }

  // ── 4. Endogenous Actors ──
  for (const [eid, endo] of Object.entries(ENDOGENOUS_ACTORS)) {
    actors[eid] = endo;
    for (const route of (endo.routes || [])) {
      edges.push({ from:eid, to:route.enzyme, type:EDGE_TYPE.SUBSTRATE_OF,
        props:{fraction:route.fraction} });
    }
  }

  // ── 5. Enzyme Actors ──
  for (const [eid, enz] of Object.entries(ENZYME_ACTORS)) {
    actors[eid] = enz;
  }

  // ── 6b. Receptor Actors ──
  for (const [rid, rec] of Object.entries(RECEPTOR_ACTORS)) {
    actors[rid] = rec;
    // Receptor → Phenotype edges (PRODUCES)
    for (const pid of (rec.produces || [])) {
      if (PHENOTYPE_ACTORS[pid]) {
        edges.push({ from:rid, to:pid, type:EDGE_TYPE.PRODUCES,
          props:{mechanism:'receptor_activation', confidence:'high'} });
      }
    }
  }

  // ── 6c. Phenotype Actors ──
  for (const [pid, phen] of Object.entries(PHENOTYPE_ACTORS)) {
    actors[pid] = phen;
  }

  // ── 7. Receptor→Drug connection edges ──
  // Wire known agonist/antagonist relationships between drugs and receptors
  const RECEPTOR_DRUG_EDGES = [
    // Opioid receptor agonists → mu-opioid
    {from:'morphine',        to:'mu-opioid-receptor', type:EDGE_TYPE.ACTIVATES,  props:{strength:'full_agonist', tissue:TISSUE_COMPARTMENT.BRAIN}},
    {from:'o-desmethyltramadol', to:'mu-opioid-receptor', type:EDGE_TYPE.ACTIVATES, props:{strength:'full_agonist', tissue:TISSUE_COMPARTMENT.BRAIN}},
    {from:'oxymorphone',     to:'mu-opioid-receptor', type:EDGE_TYPE.ACTIVATES,  props:{strength:'full_agonist', tissue:TISSUE_COMPARTMENT.BRAIN}},
    {from:'hydromorphone',   to:'mu-opioid-receptor', type:EDGE_TYPE.ACTIVATES,  props:{strength:'full_agonist', tissue:TISSUE_COMPARTMENT.BRAIN}},
    // When CYP2D6 is inhibited, prodrug opioids fail to reach mu-opioid → SUPPRESSES analgesia
    {from:'hydroxybupropion', to:'analgesia_phenotype', type:EDGE_TYPE.SUPPRESSES, props:{
      mechanism:'CYP2D6_inhibition_blocks_prodrug_opioid_activation',
      confidence:'high', temporal:{onset:'hours', duration:'days'}}},
    // Serotonergic drugs activate serotonin syndrome risk via 5-HT accumulation
    {from:'serotonin',       to:'5-ht2a-receptor',    type:EDGE_TYPE.ACTIVATES,  props:{strength:'endogenous'}},
    {from:'tyramine',        to:'mao-a-enzyme',        type:EDGE_TYPE.SUBSTRATE_OF, props:{fraction:0.8}},
    // PXR agonists (rifampin/St.John's Wort) induce CYP3A4 via NR1I2
    {from:'nr1i2-pregnane-x', to:'cyp3a4_induction_phenotype', type:EDGE_TYPE.PRODUCES, props:{confidence:'high'}},
    // Solanidine chronic burden → CYP2D6 burden phenotype
    {from:'solanidine',      to:'cyp2d6_burden_phenotype', type:EDGE_TYPE.PRODUCES, props:{
      mechanism:'chronic_competitive_substrate_burden',
      temporal:{onset:'days_to_weeks', persistent:true, adiposeAccumulation:true},
      confidence:'low', note:'Hypothesis: chronic CYP2D6 occupancy in PM/null genotype'}},
  ];
  for (const re of RECEPTOR_DRUG_EDGES) {
    // Only push if both ends exist (or from is a known metabolite/food/endo)
    edges.push(re);
  }

  // ── 6. Transporter Actors (with CYP-parity enrichment) ──
  const transporterEdgeSeen = new Set();  // dedup key: "from|to|type"
  for (const [tid, trn] of Object.entries(TRANSPORTER_ACTORS)) {
    actors[tid] = trn;

    // 6a. Substrate edges from TRANSPORTER_ACTORS.substrates[]
    for (const subName of (trn.substrates || [])) {
      const subId = toGraphId(subName);
      const key = `${subId}|${tid}|${EDGE_TYPE.TRANSPORTED_BY}`;
      if (!transporterEdgeSeen.has(key)) {
        transporterEdgeSeen.add(key);
        edges.push({ from:subId, to:tid, type:EDGE_TYPE.TRANSPORTED_BY,
          props:{role:'substrate', direction:trn.direction, tissue:trn.tissue} });
      }
    }

    // 6b. Inhibitor edges from TRANSPORTER_ACTORS.inhibitors[]
    for (const inh of (trn.inhibitors || [])) {
      const inhId = toGraphId(inh.name);
      const key = `${inhId}|${tid}|${EDGE_TYPE.INHIBITS}`;
      if (!transporterEdgeSeen.has(key)) {
        transporterEdgeSeen.add(key);
        edges.push({ from:inhId, to:tid, type:EDGE_TYPE.INHIBITS,
          props:{strength:inh.strength, evidence:inh.evidence, isTransporter:true} });
      }
    }

    // 6c. Inducer edges from TRANSPORTER_ACTORS.inducers[]
    for (const ind of (trn.inducers || [])) {
      const indId = toGraphId(ind.name);
      const key = `${indId}|${tid}|${EDGE_TYPE.INDUCES}`;
      if (!transporterEdgeSeen.has(key)) {
        transporterEdgeSeen.add(key);
        edges.push({ from:indId, to:tid, type:EDGE_TYPE.INDUCES,
          props:{strength:ind.strength, evidence:ind.evidence, isTransporter:true} });
      }
    }

    // 6d. DDI edges from TRANSPORTER_DDI (with evidence propagation)
    for (const tddi of TRANSPORTER_DDI) {
      if (tddi.transporter === tid || tddi.transporter.startsWith(tid)) {
        const subId = toGraphId(tddi.substrate);
        const inhId = toGraphId(tddi.inhibitor);
        const subKey = `${subId}|${tid}|${EDGE_TYPE.TRANSPORTED_BY}`;
        if (!transporterEdgeSeen.has(subKey) && (actors[subId] || DRUG_DB.find(d => toGraphId(d.name) === subId))) {
          transporterEdgeSeen.add(subKey);
          edges.push({ from:subId, to:tid, type:EDGE_TYPE.TRANSPORTED_BY,
            props:{role:'substrate', evidence:tddi.evidence, foldChange:tddi.evidence?.foldChange} });
        }
        const inhKey = `${inhId}|${tid}|${EDGE_TYPE.INHIBITS}`;
        if (!transporterEdgeSeen.has(inhKey) && (actors[inhId] || DRUG_DB.find(d => toGraphId(d.name) === inhId))) {
          transporterEdgeSeen.add(inhKey);
          edges.push({ from:inhId, to:tid, type:EDGE_TYPE.INHIBITS,
            props:{strength:tddi.severity === 'critical' ? 'strong' : 'moderate',
                   effect:tddi.effect, mechanism:tddi.mechanism, evidence:tddi.evidence, isTransporter:true} });
        }
      }
    }
  }

  // ── 7. Pathway Diversion edges ──
  for (const [drugName, pd] of Object.entries(PATHWAY_DIVERSION)) {
    const parentId = getDrugGraphId(drugName);
    const primaryMetId = getMetaboliteGraphId(pd.primary.metabolite);
    if (!actors[primaryMetId]) {
      actors[primaryMetId] = { id:primaryMetId, type:ACTOR_TYPE.METABOLITE, name:pd.primary.metabolite,
        parentDrug:drugName, active:isMetaboliteActive({a:pd.primary.activity}), activity:normalizeMetaboliteActivity(pd.primary.activity), data:pd.primary };
    }
    edges.push({ from:parentId, to:primaryMetId, type: isMetaboliteActive({a:pd.primary.activity}) ? EDGE_TYPE.ACTIVATES : EDGE_TYPE.METABOLIZED_TO,
      props:{enzyme:pd.primary.enzyme, fraction:pd.primary.pct/100, isPrimary:true, activity:normalizeMetaboliteActivity(pd.primary.activity)} });
    for (const div of (pd.diverted || [])) {
      const divMetId = getMetaboliteGraphId(div.metabolite);
      if (!actors[divMetId]) {
        actors[divMetId] = { id:divMetId, type:ACTOR_TYPE.METABOLITE, name:div.metabolite,
          parentDrug:drugName, active:isMetaboliteActive({a:div.activity}), activity:normalizeMetaboliteActivity(div.activity), data:div };
      }
      edges.push({ from:parentId, to:divMetId, type:EDGE_TYPE.METABOLIZED_TO,
        props:{enzyme:div.enzyme, fraction:div.pct/100, isDiversion:true, note:div.note, activity:normalizeMetaboliteActivity(div.activity)} });
    }
  }

  // Count substrates per enzyme AND transporter
  for (const e of edges) {
    if (e.type === EDGE_TYPE.SUBSTRATE_OF && actors[e.to] && actors[e.to].type === ACTOR_TYPE.ENZYME) {
      actors[e.to].substrateCount = (actors[e.to].substrateCount || 0) + 1;
    }
    if (e.type === EDGE_TYPE.TRANSPORTED_BY && actors[e.to] && actors[e.to].type === ACTOR_TYPE.TRANSPORTER) {
      actors[e.to].substrateCount = (actors[e.to].substrateCount || 0) + 1;
    }
  }

  return { actors, edges, built: Date.now() };
}

// ── Graph Query Functions ──

// Get all edges from/to an actor of a given type
function getEdges(graph, actorId, edgeType, direction) {
  if (direction === 'out') return graph.edges.filter(e => e.from === actorId && (!edgeType || e.type === edgeType));
  if (direction === 'in')  return graph.edges.filter(e => e.to === actorId && (!edgeType || e.type === edgeType));
  return graph.edges.filter(e => (e.from === actorId || e.to === actorId) && (!edgeType || e.type === edgeType));
}

// Get all actors of a given type
function getActorsByType(graph, type) {
  return Object.values(graph.actors).filter(a => a.type === type);
}

// Get actor by name (fuzzy match)
function getActor(graph, nameOrId) {
  // Try raw key first (handles mixed-case IDs like "P-gp", "CYP2D6")
  if (graph.actors[nameOrId]) return graph.actors[nameOrId];
  const id = toGraphId(nameOrId);
  return graph.actors[id] || Object.values(graph.actors).find(a => toGraphId(a.name) === id);
}

// ── Chain Traversal ──
// Finds multi-hop interaction chains: drug → metabolite → enzyme → affected drug
// This is the core graph traversal that replaces drug-centric heuristics.

function findInteractionChains(graph, actorIds, maxDepth) {
  maxDepth = maxDepth || 4;
  const chains = [];
  const visited = new Set();

  function traverse(actorId, path, depth) {
    if (depth > maxDepth) return;
    const key = actorId + ':' + depth;
    if (visited.has(key)) return;
    visited.add(key);

    const outEdges = getEdges(graph, actorId, null, 'out');
    for (const edge of outEdges) {
      const target = edge.to;
      const targetActor = graph.actors[target];

      if (edge.type === EDGE_TYPE.METABOLIZED_TO || edge.type === EDGE_TYPE.ACTIVATES) {
        // Follow the metabolite chain — metabolite may have its own effects
        const newPath = [...path, {actor:actorId, edge, target}];
        // Check if metabolite has outgoing inhibition/induction edges
        const metEffects = getEdges(graph, target, null, 'out');
        for (const metEdge of metEffects) {
          if (metEdge.type === EDGE_TYPE.INHIBITS || metEdge.type === EDGE_TYPE.INDUCES) {
            // This metabolite affects an enzyme — find all victims
            const enzymeId = metEdge.to;
            const victims = getEdges(graph, enzymeId, EDGE_TYPE.SUBSTRATE_OF, 'in')
              .filter(e => e.from !== actorId && e.from !== target);  // exclude self
            for (const victimEdge of victims) {
              // Only report if the victim's parent drug is in the active set
              const victimActor = graph.actors[victimEdge.from];
              const victimDrug = victimActor ? (victimActor.parentDrug || victimActor.name) : victimEdge.from;
              if (actorIds.some(aid => toGraphId(aid) === toGraphId(victimDrug) || toGraphId(aid) === victimEdge.from)) {
                chains.push({
                  source: path[0] ? path[0].actor : actorId,
                  chain: [...newPath, {actor:target, edge:metEdge, target:enzymeId}, {actor:enzymeId, edge:victimEdge, target:victimEdge.from}],
                  type: metEdge.type === EDGE_TYPE.INHIBITS ? 'metabolite_inhibition_chain' : 'metabolite_induction_chain',
                  perpetratorMetabolite: graph.actors[target],
                  enzyme: enzymeId,
                  victim: victimEdge.from,
                  strength: metEdge.props.strength,
                });
              }
            }
          }
        }
        // Continue traversal through metabolite
        traverse(target, [...path, {actor:actorId, edge, target}], depth + 1);
      }

      if (edge.type === EDGE_TYPE.INHIBITS || edge.type === EDGE_TYPE.INDUCES) {
        // Direct inhibition/induction — find victims
        const victims = getEdges(graph, target, EDGE_TYPE.SUBSTRATE_OF, 'in')
          .filter(e => actorIds.some(aid => toGraphId(aid) === e.from) && e.from !== actorId);
        for (const victimEdge of victims) {
          chains.push({
            source: path[0] ? path[0].actor : actorId,
            chain: [...path, {actor:actorId, edge, target}, {actor:target, edge:victimEdge, target:victimEdge.from}],
            type: edge.type === EDGE_TYPE.INHIBITS ? 'direct_inhibition' : 'direct_induction',
            enzyme: target,
            victim: victimEdge.from,
            strength: edge.props.strength,
          });
        }
      }
    }
    visited.delete(key);
  }

  // Traverse from each active actor
  for (const aid of actorIds) {
    const id = toGraphId(aid);
    if (graph.actors[id]) {
      traverse(id, [], 0);
    }
  }

  return chains;
}

// ── Graph Statistics ──
function getGraphStats() {
  const g = getInteractionGraph();
  const byType = {};
  for (const a of Object.values(g.actors)) {
    byType[a.type] = (byType[a.type] || 0) + 1;
  }
  const edgesByType = {};
  for (const e of g.edges) {
    edgesByType[e.type] = (edgesByType[e.type] || 0) + 1;
  }
  return { totalActors:Object.keys(g.actors).length, totalEdges:g.edges.length, actorsByType:byType, edgesByType };
}

// ── traverseEffects — Systems Pharmacology Cascade Simulator ──
//
// Given a starting node, traverses the interaction graph forward to find ALL
// downstream effects, with:
//   • cycle protection (visited set keyed by actorId+depth)
//   • confidence decay (each hop multiplies confidence by edge weight)
//   • temporal modifiers (onset, persistence, reversibility)
//   • competitive burden tracking (enzyme occupancy accumulates)
//
// Returns an array of Effect objects:
//   {
//     path:       [{actorId, actor, edgeType, edgeProps}],
//     terminal:   actorId,       // last node in chain
//     terminalActor: actor,
//     confidence: 0–1,           // decayed across hops
//     direction:  'increase'|'decrease'|'mixed'|'unknown',
//     temporal:   { onset, persistence, reversible }
//   }
//
// maxDepth controls traversal depth (default 6 to reach phenotype nodes).
// Confidence decay per hop follows edge evidence quality:
//   high=0.95, moderate=0.80, low=0.60, unknown=0.50
//
function traverseEffects(startNodeId, maxDepth) {
  maxDepth = maxDepth || 6;
  const graph = getInteractionGraph();
  const results = [];
  const visitedKey = new Set();  // actorId|depth → cycle protection

  // Edge confidence decay — delegates to computeEdgeConfidence() which uses EVIDENCE_WEIGHT tiers
  // This means edges with evidenceRefs pointing to FDA_LABEL/GUIDELINE studies decay slower
  // than edges with only low-tier in vitro evidence.
  const CONF_DECAY = { high:0.95, moderate:0.80, low:0.60, unknown:0.50 }; // fallback for plain strings

  // Direction inference from edge type + inhibitor/inducer polarity
  function inferDirection(currentDir, edgeType, edgeProps) {
    if (edgeType === EDGE_TYPE.INHIBITS || edgeType === EDGE_TYPE.SUPPRESSES || edgeType === EDGE_TYPE.BLOCKS) {
      return currentDir === 'increase' ? 'decrease' : currentDir === 'decrease' ? 'increase' : 'decrease';
    }
    if (edgeType === EDGE_TYPE.INDUCES || edgeType === EDGE_TYPE.ACTIVATES || edgeType === EDGE_TYPE.PRODUCES) {
      return currentDir === 'unknown' ? 'increase' : currentDir;
    }
    if (edgeType === EDGE_TYPE.METABOLIZED_TO || edgeType === EDGE_TYPE.TRANSPORTED_BY) {
      return currentDir; // neutral — depends on metabolite activity
    }
    return currentDir;
  }

  // Merge temporal info along path
  function mergeTemporalModifier(accumulated, edgeProps) {
    const t = edgeProps && edgeProps.temporal;
    if (!t) return accumulated;
    return {
      onset:        t.onset || accumulated.onset || null,
      persistence:  t.persistent ? 'chronic' : (t.duration || accumulated.persistence || 'transient'),
      reversible:   t.reversible !== undefined ? t.reversible : (accumulated.reversible !== undefined ? accumulated.reversible : true),
      adiposeAccumulation: t.adiposeAccumulation || accumulated.adiposeAccumulation || false,
    };
  }

  function dfs(actorId, path, confidence, direction, temporal, depth) {
    if (depth > maxDepth) return;
    const visitKey = `${actorId}|${depth}`;
    if (visitedKey.has(visitKey)) return;
    visitedKey.add(visitKey);

    const actor = graph.actors[actorId];

    // Record terminal phenotype/receptor as a result
    if (actor && (actor.type === ACTOR_TYPE.PHENOTYPE || actor.type === ACTOR_TYPE.RECEPTOR) && path.length > 0) {
      results.push({
        path: [...path],
        terminal: actorId,
        terminalActor: actor,
        confidence: Math.round(confidence * 100) / 100,
        direction,
        temporal: { ...temporal },
      });
      // Don't stop — continue through receptor to phenotype if possible
    }

    // Get outgoing edges from this actor
    const outEdges = (graph.edges || []).filter(e => e.from === actorId);

    for (const edge of outEdges) {
      const targetId = edge.to;
      const targetActor = graph.actors[targetId];

      // Skip cycles via pure actor ID loop-check
      if (path.some(step => step.actorId === targetId)) continue;

      // Decay confidence using evidence-weighted computeEdgeConfidence()
      // This respects STUDY_DB tier hierarchy: FDA_LABEL edges decay slower than IN_VITRO edges
      const decay = computeEdgeConfidence(edge);
      const newConf = confidence * decay;

      // Prune extremely low confidence paths (< 5%)
      if (newConf < 0.05) continue;

      const newDir = inferDirection(direction, edge.type, edge.props);
      const newTemporal = mergeTemporalModifier(temporal, edge.props);

      const newPath = [...path, {
        actorId,
        actor: actor || null,
        edgeType: edge.type,
        edgeProps: edge.props || {},
        toId: targetId,
      }];

      dfs(targetId, newPath, newConf, newDir, newTemporal, depth + 1);
    }

    visitedKey.delete(visitKey);
  }

  dfs(startNodeId, [], 1.0, 'unknown', {}, 0);

  // Sort by confidence descending, then by path length ascending
  results.sort((a, b) => b.confidence !== a.confidence
    ? b.confidence - a.confidence
    : a.path.length - b.path.length);

  return results;
}

// ── traverseEffectsForStack — run traverseEffects for all active actors ──
// Returns {nodeId → effects[]} map for the current medication stack.
// Focuses on paths that terminate at Phenotype nodes (the clinically meaningful outcomes).
function traverseEffectsForStack() {
  const graph = getInteractionGraph();
  const results = {};
  const allNodeIds = [];

  // Collect: drugs in stack + their first-order metabolites
  for (const drugName of activeStack) {
    const drugId = toGraphId(drugName);
    allNodeIds.push(drugId);
    // Add metabolites for this drug
    const metabEdges = (graph.edges || []).filter(e =>
      e.from === drugId &&
      (e.type === EDGE_TYPE.METABOLIZED_TO || e.type === EDGE_TYPE.ACTIVATES));
    for (const me of metabEdges) {
      if (graph.actors[me.to]) allNodeIds.push(me.to);
    }
  }

  for (const nid of [...new Set(allNodeIds)]) {
    const effects = traverseEffects(nid, 6);
    // Only keep paths that reach phenotype nodes or > 1 hop
    const relevant = effects.filter(e =>
      e.terminalActor &&
      (e.terminalActor.type === ACTOR_TYPE.PHENOTYPE || e.path.length >= 2));
    if (relevant.length > 0) results[nid] = relevant;
  }
  return results;
}

// ── buildEffectChainLabel — human-readable cascade string ──
// Example: "Paroxetine → inhibits CYP2D6 → ↓ Codeine → ↓ Morphine → ↓ Analgesic Effect"
function buildEffectChainLabel(startActor, effects, graph) {
  if (!effects || effects.length === 0) return null;
  const best = effects[0]; // highest confidence
  const labels = [];

  // Start node
  labels.push(startActor ? startActor.name : best.path[0]?.actorId || '?');

  for (const step of best.path) {
    const edgeSymbol = {
      [EDGE_TYPE.INHIBITS]:       '↓ inhibits',
      [EDGE_TYPE.INDUCES]:        '↑ induces',
      [EDGE_TYPE.METABOLIZED_TO]: '→',
      [EDGE_TYPE.ACTIVATES]:      '→ activates',
      [EDGE_TYPE.BLOCKS]:         '✕ blocks',
      [EDGE_TYPE.SUPPRESSES]:     '↓ suppresses',
      [EDGE_TYPE.PRODUCES]:       '→ produces',
      [EDGE_TYPE.SUBSTRATE_OF]:   '→ metabolized by',
      [EDGE_TYPE.TRANSPORTED_BY]: '→ transported by',
      [EDGE_TYPE.COMPETES_WITH]:  '⟷ competes',
      [EDGE_TYPE.ACCUMULATES_IN]: '→ accumulates in',
    }[step.edgeType] || '→';

    const toActor = graph.actors[step.toId];
    const toName = toActor ? toActor.name : step.toId;
    labels.push(`${edgeSymbol} ${toName}`);
  }

  const dir = best.direction === 'decrease' ? '↓' : best.direction === 'increase' ? '↑' : '';
  const terminal = best.terminalActor ? best.terminalActor.name : best.terminal;
  if (dir && terminal) labels.push(`${dir} ${terminal}`);

  return labels.join(' → ');
}

// ═══════════════════════════════════════════════════════════════════
// PHASE F: WEIGHTED PROPAGATING CONFIDENCE & CONVERGENCE DETECTION
//
// Three new capabilities layered on top of the existing traversal:
//   1. EDGE_TYPE_BASE_WEIGHT   — structural reliability per edge type
//   2. traverseWithConvergence — detects multi-source paths to same phenotype
//   3. rankPathsByImpact       — confidence × severity × structural integrity score
//   4. buildClinicalSummary    — single entry point for cascade rendering
// ═══════════════════════════════════════════════════════════════════

// computeHopConfidences — returns cumulative confidence at each step of a traversal path.
// Used by the cascade renderer to show per-hop decay (not just final confidence).
function computeHopConfidences(eff, graph) {
  const hops = [];
  let cumConf = 1.0;
  const edges = graph.edges;
  for (const step of eff.path) {
    const edge = edges.find(e => e.from === step.actorId && e.to === step.toId);
    const decay = edge ? computeEdgeConfidence(edge) : 0.5;
    cumConf = cumConf * decay;
    hops.push({
      fromId:   step.actorId,
      fromName: step.actor ? step.actor.name : step.actorId,
      toId:     step.toId,
      toName:   graph.actors[step.toId] ? graph.actors[step.toId].name : step.toId,
      edgeType: step.edgeType,
      edgeConf: Math.round(decay * 100),
      cumConf:  Math.round(cumConf * 100),
    });
  }
  return hops;
}

// rankPathsByImpact — scores each effect path as:
//   impactScore = confidence × severityWeight × geometricMean(edgeBaseWeights)
// Geometric mean of edge base weights captures structural integrity of the entire path.
function rankPathsByImpact(effects) {
  return effects.map(eff => {
    const severityW = PHENOTYPE_SEVERITY_WEIGHT[eff.terminal] || 1.0;
    // Geometric mean of base weights across hops (rewards short, reliable paths)
    const n = eff.path.length || 1;
    const logSum = eff.path.reduce((acc, step) => acc + Math.log(EDGE_TYPE_BASE_WEIGHT[step.edgeType] || 0.70), 0);
    const structuralW = Math.exp(logSum / n);  // geometric mean
    const impactScore = Math.round(eff.confidence * severityW * structuralW * 100);
    return Object.assign({}, eff, { impactScore, severityWeight: severityW, structuralWeight: Math.round(structuralW * 100) });
  }).sort((a, b) => b.impactScore - a.impactScore);
}

// traverseWithConvergence — runs traverseEffects from all active source nodes
// and identifies CONVERGENCE POINTS: multiple independent drugs contributing to
// the same downstream phenotype. These are the highest-risk multi-drug scenarios.
//
// Returns:
//   bySource:          { nodeId → effects[] }
//   convergencePoints: ranked convergence objects
//   allEffects:        flat array with sourceId attached
function traverseWithConvergence(maxDepth) {
  maxDepth = maxDepth || 6;
  const graph = getInteractionGraph();

  // Collect all active source nodes (drugs + their immediate metabolites)
  const sourceNodes = [];
  for (const drugName of activeStack) {
    const drugId = toGraphId(drugName);
    if (graph.actors[drugId]) sourceNodes.push(drugId);
    graph.edges
      .filter(e => e.from === drugId &&
        (e.type === EDGE_TYPE.METABOLIZED_TO || e.type === EDGE_TYPE.ACTIVATES))
      .forEach(e => { if (graph.actors[e.to]) sourceNodes.push(e.to); });
  }
  const uniqueSources = [...new Set(sourceNodes)];

  // Run traversal from each source
  const bySource = {};
  const allEffects = [];
  for (const srcId of uniqueSources) {
    const effects = traverseEffects(srcId, maxDepth);
    bySource[srcId] = effects;
    for (const eff of effects) {
      allEffects.push(Object.assign({}, eff, { sourceId: srcId }));
    }
  }

  // Group by terminal node
  const byTerminal = {};
  for (const eff of allEffects) {
    if (!byTerminal[eff.terminal]) byTerminal[eff.terminal] = [];
    byTerminal[eff.terminal].push(eff);
  }

  // Identify convergence: ≥ 2 distinct DRUG sources → same terminal
  const convergencePoints = [];
  for (const [terminal, effs] of Object.entries(byTerminal)) {
    // Map sources back to their parent drug names
    const sourceToParent = {};
    for (const srcId of uniqueSources) {
      // The source is either a drug or a metabolite; find its parent drug
      const actor = graph.actors[srcId];
      const parentDrug = (actor && actor.parentDrug) ? actor.parentDrug : (actor ? actor.name : srcId);
      sourceToParent[srcId] = parentDrug;
    }

    const drugSources = [...new Set(
      effs.map(e => sourceToParent[e.sourceId] || e.sourceId)
    )];
    if (drugSources.length < 2) continue;

    const terminalActor = graph.actors[terminal];
    const severityW = PHENOTYPE_SEVERITY_WEIGHT[terminal] || 1.0;

    // Combined probability: P(at least one fires) = 1 − Π(1 − P_i)
    // Uses max confidence per drug source to avoid double-counting same drug's paths
    const perDrugMaxConf = drugSources.map(drug => {
      const srcIds = uniqueSources.filter(s => (sourceToParent[s] || s) === drug);
      const maxConf = Math.max(0, ...effs.filter(e => srcIds.includes(e.sourceId)).map(e => e.confidence));
      return maxConf;
    });
    const combinedConf = 1 - perDrugMaxConf.reduce((prod, p) => prod * (1 - p), 1);
    const rankedPaths = rankPathsByImpact(effs).slice(0, 6);

    convergencePoints.push({
      terminal,
      terminalActor,
      drugSources,
      paths: rankedPaths,
      combinedConfidence: Math.round(combinedConf * 100),
      impactScore: Math.round(combinedConf * severityW * 100),
      convergenceCount: drugSources.length,
    });
  }

  convergencePoints.sort((a, b) => b.impactScore - a.impactScore);
  return { bySource, convergencePoints, allEffects };
}

// buildClinicalSummary — the single entry point for the cascade render layer.
// Integrates traversal results, convergence detection, enzyme capacity (Phase B),
// and impact ranking into one structured summary object.
function buildClinicalSummary() {
  const graph = getInteractionGraph();
  const { bySource, convergencePoints, allEffects } = traverseWithConvergence(6);

  // Per-drug top paths (ranked by impact)
  const drugSummaries = [];
  for (const drugName of activeStack) {
    const drugId = toGraphId(drugName);
    const srcEffects = bySource[drugId] || [];
    const rankedPaths = rankPathsByImpact(srcEffects).slice(0, 6);
    if (rankedPaths.length > 0) {
      drugSummaries.push({
        drug: drugName, drugId,
        topPaths: rankedPaths,
        maxImpact: rankedPaths[0].impactScore,
      });
    }
  }
  drugSummaries.sort((a, b) => b.maxImpact - a.maxImpact);

  // High-risk paths: confidence > 40% AND severity multiplier ≥ 1.3
  const highRiskPaths = allEffects.filter(e =>
    e.confidence > 0.40 && (PHENOTYPE_SEVERITY_WEIGHT[e.terminal] || 0) >= 1.3
  );

  // Enzyme capacities from Phase B
  let enzymeCapacities = [];
  try { enzymeCapacities = computeAllEnzymeCapacities(activeStack); } catch (_) {}

  return { drugSummaries, convergencePoints, allEffects, highRiskPaths, enzymeCapacities };
}

// ── Temporal Pharmacology Engine (Phase 1 Infrastructure) ──
//
// This is the foundational layer for future time-dimension simulation.
// Phase 1 stores temporal properties on edges; Phase 2 will simulate
// concentration × time × occupancy curves.
//
// Key concepts encoded here:
//   onset        — how quickly the effect begins (hours → days → weeks)
//   duration     — how long the effect persists
//   reversible   — whether stopping the drug restores function
//   adiposeAccumulation — whether the compound depots in adipose for slow release
//
// TEMPORAL CLASSIFICATION TABLE
// ────────────────────────────────────────────────────────────────────
// Actor               | Mechanism    | Onset     | Offset (washout)
// Fluoxetine/Norfluox | MBI CYP2D6   | 1-2 weeks | 5 weeks
// Paroxetine          | MBI CYP2D6   | days      | 2-3 weeks
// Amiodarone          | MBI CYP2D6   | weeks     | months
// Rifampin            | CYP3A4 ind.  | 1-2 weeks | 1-2 weeks
// Carbamazepine       | auto-ind.    | 2-4 weeks | 2-3 weeks
// Solanidine          | competitive  | days-wks  | weeks (adipose depot)
// Bergamottin         | MBI CYP3A4   | hours     | 24-72h (gut resynthesis)
// ────────────────────────────────────────────────────────────────────
//
// ═══════════════════════════════════════════════════════════════════
// EVIDENCE ENTITY SYSTEM — Phase 1
// Evidence as first-class objects, not embedded metadata.
// Each study is a reusable node that can support multiple graph edges.
// Architecture: STUDY_DB[id] → evidence entity → referenced by edges via evidenceRefs[]
// ═══════════════════════════════════════════════════════════════════

// ── Evidence Tier Hierarchy ──
