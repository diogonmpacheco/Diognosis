// MedCheck — Core interaction finder, risk calculator, metabolite analysis
// Phase A: modular source — concatenated by build.js

function normalizeInteractionRisk(interaction) {
  const evidenceRefs = [...new Set(interaction.evidenceRefs || [])];
  const confidence = interaction.confidence ||
    interaction.evidence?.confidence ||
    (evidenceRefs.length ? "high" : "moderate");
  const sourceEngine = interaction.sourceEngine ||
    interaction.source ||
    (interaction.type === "known-ddi" ? "curated" :
      interaction.type === "transporter" ? "transporter" :
      interaction.type === "combination" ? "combination" :
      interaction.type === "pharmacodynamic" ? "phenotype" :
      interaction.type && interaction.type.includes("metabolite") ? "graph" :
      "enzyme");
  const evidenceStatus = evidenceRefs.length
    ? "explicit"
    : (interaction.severity === "severe" ? "needs_review" : "rule_based");
  return Object.assign({
    id: [
      interaction.drug1 || "unknown",
      interaction.drug2 || "unknown",
      interaction.type || "interaction",
      interaction.enzyme || "pathway"
    ].join("|").replace(/\s+/g, "_").toLowerCase(),
    sourceEngine,
    affectedPathway: interaction.enzyme || interaction.category || "unknown",
    contributingDrugs: [interaction.drug1, interaction.drug2].filter(Boolean),
    evidenceRefs,
    evidenceStatus,
    confidence,
    clinicalAction: interaction.clinicalAction || interaction.management || null,
  }, interaction, {
    sourceEngine,
    affectedPathway: interaction.enzyme || interaction.category || "unknown",
    contributingDrugs: [interaction.drug1, interaction.drug2].filter(Boolean),
    evidenceRefs,
    evidenceStatus,
    confidence,
  });
}

function auditInteractionEvidence(interactions) {
  const unknownEvidenceRefs = [];
  const severeWithoutEvidenceRefs = [];
  for (const ix of interactions) {
    for (const ref of (ix.evidenceRefs || [])) {
      if (!STUDY_DB[ref]) unknownEvidenceRefs.push({ interactionId: ix.id, ref });
    }
    if (ix.severity === "severe" && ix.evidenceStatus !== "explicit") {
      severeWithoutEvidenceRefs.push({
        interactionId: ix.id,
        drugs: ix.contributingDrugs,
        sourceEngine: ix.sourceEngine,
        affectedPathway: ix.affectedPathway,
      });
    }
  }
  return {
    unknownEvidenceRefs,
    severeWithoutEvidenceRefs,
    severeWithoutEvidenceRefCount: severeWithoutEvidenceRefs.length,
  };
}

function findInteractions() {
  const interactions = [];
  const seen = new Set();
  const drugs = activeStack.map(getDrug).filter(Boolean);

  // ── Phase B: compute enzyme capacity map upfront ──────────────────
  // Gives every interaction card access to the global enzyme state so
  // it can explain WHY the severity is what it is (not just a fold number).
  const _enzymeCapacities = computeAllEnzymeCapacities(activeStack);
  const enzymeCapacityMap = {};
  for (const ec of _enzymeCapacities) {
    enzymeCapacityMap[ec.enzyme] = ec;
  }

  // 1. CHECK KNOWN DDI PAIRS FIRST (highest priority)
  for (const ddi of KNOWN_DDI) {
    if (activeStack.includes(ddi.drug1) && activeStack.includes(ddi.drug2)) {
      const key = [ddi.drug1, ddi.drug2, "known"].sort().join("|");
      if (!seen.has(key)) {
        seen.add(key);
        const calibratedSeverity = calibrateDdiSeverity(ddi);
        interactions.push({
          drug1: ddi.drug1, drug2: ddi.drug2, enzyme: ddi.category,
          type: "known-ddi", strength: calibratedSeverity, effect: ddi.effect,
          severity: calibratedSeverity, rawSeverity: ddi.severity, mechanism: ddi.mechanism, source: "known",
          evidence: ddi.evidence,
          evidenceRefs: ddi.evidenceRefs || [],
          enzymeCapacity: enzymeCapacityMap[ddi.category] || null,
        });
      }
    }
  }

  // 2. ENZYME-BASED DDI with DYNAMIC SEVERITY SCORING
  // Severity now accounts for: inhibition strength, fraction metabolized, mechanism type,
  // genotype context (PM + inhibitor = phenoconversion), nonlinear PK, and evidence confidence
  for (let i = 0; i < activeStack.length; i++) {
    for (let j = 0; j < activeStack.length; j++) {
      if (i === j) continue;
      const perpetrator = getDrug(activeStack[i]);
      const victim = getDrug(activeStack[j]);
      if (!perpetrator || !victim) continue;

      const allInh = getAllInhibitions(perpetrator);

      for (const inh of allInh) {
        for (const route of victim.routes) {
          if (inh.target === route.enzyme) {
            const key = [activeStack[i], activeStack[j], inh.target, "inh"].sort().join("|");
            const knownKey = [activeStack[i], activeStack[j], "known"].sort().join("|");
            if (!seen.has(key) && !seen.has(knownKey)) {
              seen.add(key);
              let mult = INH_MULT[inh.strength] || 1;
              const isProdrug = victim.prodrug;

              // DOSE-DEPENDENT INHIBITION: scale by user-selected dose tier
              if (inh.doseDependent) {
                mult *= getDoseModifier(activeStack[i]);
              }

              // MECHANISM-BASED: irreversible inhibitors accumulate effect over time
              if (inh.mechanism === "mechanism_based" || inh.timeDependent) {
                mult *= 1.3;
              }

              // BASE FOLD: linear model
              let impactFold = route.fraction * mult + (1 - route.fraction);

              // NONLINEAR PK AMPLIFICATION: saturable routes show disproportionate AUC increase
              if ((route.saturable || route.nonLinear) && impactFold > 1.5) {
                const nlExp = impactFold > 3 ? 1.5 : 1.3;
                impactFold = Math.pow(impactFold, nlExp);
              }

              // GENOTYPE CONTEXT: if user has reduced enzyme, DDI compounds the effect
              const victimGeno = userGenetics[route.enzyme];
              let genoMultiplier = 1;
              if (victimGeno === "poor") genoMultiplier = 1.5; // PM + inhibitor = functional null
              else if (victimGeno === "intermediate") genoMultiplier = 1.2;
              const effectiveFold = impactFold * genoMultiplier;

              // DYNAMIC SEVERITY: continuous scoring, not just categorical
              let sevScore = 0;
              sevScore += Math.min(effectiveFold - 1, 5) * 20; // up to 100 pts for fold change
              if (isProdrug && route.fraction >= 0.3) sevScore += 30; // prodrug activation blocked
              if (inh.mechanism === "mechanism_based") sevScore += 15; // irreversible
              if (victimGeno === "poor" || victimGeno === "null") sevScore += 20; // genetic vulnerability
              if (victim.props && victim.props.narrowTherapeutic) sevScore += 25; // narrow TI drug

              // Evidence confidence adjusts severity display
              const confidence = inh.evidence ? inh.evidence.confidence : "moderate";
              if (confidence === "low") sevScore *= 0.7; // reduce for low-confidence data

              let sev;
              if (sevScore >= 60 || effectiveFold >= 4) sev = "severe";
              else if (sevScore >= 30 || effectiveFold >= 2) sev = "moderate";
              else sev = "mild";

              // DOSE-DEPENDENT flag: inhibition varies with perpetrator dose
              const doseInfo = DOSE_TIERS[activeStack[i]];
              const doseTierKey = getDoseTier(activeStack[i]);
              const doseDep = inh.doseDependent && doseInfo
                ? ` (at ${doseInfo.tiers[doseTierKey]?.label || doseTierKey} dose)`
                : inh.doseDependent ? " (dose-dependent)" : "";

              interactions.push({
                drug1: activeStack[i], drug2: activeStack[j], enzyme: inh.target,
                type: isProdrug ? "prodrug-inhibition" : "inhibition",
                strength: inh.strength,
                effect: isProdrug
                  ? `↓ ${activeStack[j]} efficacy (prodrug activation blocked via ${inh.target})${doseDep}`
                  : `↑ ${activeStack[j]} levels (~${effectiveFold.toFixed(1)}× AUC)${doseDep}`,
                severity: sev, sevScore: Math.round(sevScore),
                foldEffect: mult, fraction: route.fraction, impactFold: effectiveFold,
                genotypeContext: victimGeno !== "normal" ? victimGeno : null,
                nonlinear: !!(route.saturable || route.nonLinear),
                mechanismBased: inh.mechanism === "mechanism_based",
                doseDependent: !!inh.doseDependent,
                confidence: confidence,
                enzymeCapacity: enzymeCapacityMap[inh.target] || null,
                mechanism: isProdrug
                  ? `${activeStack[i]} ${inh.strength}ly inhibits ${inh.target} (${Math.round(route.fraction*100)}% of ${activeStack[j]} activation), reducing active metabolite formation${inh.mechanism === "mechanism_based" ? " [irreversible MBI]" : ""}`
                  : `${activeStack[i]} ${inh.strength}ly inhibits ${inh.target}, which metabolizes ${Math.round(route.fraction*100)}% of ${activeStack[j]} → ~${effectiveFold.toFixed(1)}× blood levels${inh.mechanism === "mechanism_based" ? " [irreversible MBI]" : ""}${victimGeno && victimGeno !== "normal" ? ` [${victimGeno} metabolizer — compounded]` : ""}`
              });
            }
          }
        }
      }
      for (const ind of perpetrator.ind) {
        for (const route of victim.routes) {
          if (ind.target === route.enzyme) {
            const key = [activeStack[i], activeStack[j], ind.target, "ind"].sort().join("|");
            const knownKey = [activeStack[i], activeStack[j], "known"].sort().join("|");
            if (!seen.has(key) && !seen.has(knownKey)) {
              seen.add(key);
              const isProdrug = victim.prodrug;
              const victimGeno = userGenetics[route.enzyme];

              // Dynamic severity for induction
              let indSev;
              if (ind.strength === "strong" && route.fraction >= 0.3) indSev = "severe";
              else if (ind.strength === "strong" || (ind.strength === "moderate" && route.fraction >= 0.3)) indSev = "moderate";
              else indSev = "mild";
              // Genotype context: PM + inducer might partially restore function
              if (victimGeno === "poor" && !isProdrug) indSev = "mild"; // induction of impaired enzyme = minimal impact

              const confidence = ind.evidence ? ind.evidence.confidence : "moderate";

              interactions.push({
                drug1: activeStack[i], drug2: activeStack[j], enzyme: ind.target,
                type: isProdrug ? "prodrug-induction" : "induction",
                strength: ind.strength,
                effect: isProdrug
                  ? `↑ ${activeStack[j]} activation (more active metabolite formed)`
                  : `↓ ${activeStack[j]} levels`,
                severity: indSev,
                foldEffect: IND_MULT[ind.strength] || 1, fraction: route.fraction,
                confidence: confidence,
                enzymeCapacity: enzymeCapacityMap[ind.target] || null,
                mechanism: isProdrug
                  ? `${activeStack[i]} ${ind.strength}ly induces ${ind.target}, increasing ${activeStack[j]} prodrug activation`
                  : `${activeStack[i]} ${ind.strength}ly induces ${ind.target}, which metabolizes ${Math.round(route.fraction*100)}% of ${activeStack[j]}${victimGeno && victimGeno !== "normal" ? ` [${victimGeno} metabolizer]` : ""}`
              });
            }
          }
        }
      }
    }
  }

  // 3. PHARMACODYNAMIC INTERACTIONS

  // QTc additivity
  const qtcDrugs = drugs.filter(d => (d.props.qtcRisk||0) >= 2);
  if (qtcDrugs.length >= 2) {
    interactions.push({
      drug1: qtcDrugs[0].name, drug2: qtcDrugs[1].name, enzyme: "QTc",
      type: "pharmacodynamic", strength: "additive",
      effect: "↑ QTc prolongation risk",
      severity: "severe",
      mechanism: `Multiple QTc-prolonging agents: ${qtcDrugs.map(d=>d.name).join(", ")}`
    });
  }

  // Serotonin syndrome
  const seroDrugs = drugs.filter(d => d.props.serotonergic);
  if (seroDrugs.length >= 2) {
    const key = "serotonin-syndrome";
    if (!seen.has(key)) {
      seen.add(key);
      interactions.push({
        drug1: seroDrugs[0].name, drug2: seroDrugs[1].name, enzyme: "5-HT",
        type: "pharmacodynamic", strength: "additive",
        effect: "↑ Serotonin syndrome risk",
        severity: "severe",
        mechanism: `Multiple serotonergic agents: ${seroDrugs.map(d=>d.name).join(", ")}`
      });
    }
  }

  // CNS depression
  const sedDrugs = drugs.filter(d => d.props.sedation);
  if (sedDrugs.length >= 2) {
    interactions.push({
      drug1: sedDrugs[0].name, drug2: sedDrugs[1].name, enzyme: "CNS",
      type: "pharmacodynamic", strength: "additive",
      effect: "↑ Sedation / CNS depression",
      severity: sedDrugs.length >= 3 ? "severe" : "moderate",
      mechanism: `Multiple CNS depressants: ${sedDrugs.map(d=>d.name).join(", ")}`
    });
  }

  // BLEEDING RISK — anticoagulants + antiplatelets + NSAIDs + SSRIs/SNRIs
  const bleedDrugs = drugs.filter(d => (d.props.bleedingRisk||0) >= 1);
  if (bleedDrugs.length >= 2) {
    const highBleed = bleedDrugs.filter(d => (d.props.bleedingRisk||0) >= 2);
    const sev = highBleed.length >= 2 ? "severe" : "moderate";
    const key = "bleed-additive";
    if (!seen.has(key)) {
      seen.add(key);
      interactions.push({
        drug1: bleedDrugs[0].name, drug2: bleedDrugs[1].name, enzyme: "Hemostasis",
        type: "pharmacodynamic", strength: "additive",
        effect: "↑ Bleeding risk",
        severity: sev,
        mechanism: `Multiple agents affecting hemostasis: ${bleedDrugs.map(d=>d.name+" ("+d.cls+")").join(", ")}`
      });
    }
  }

  // ANTICHOLINERGIC BURDEN
  const achDrugs = drugs.filter(d => (d.props.anticholinergic||0) >= 1);
  if (achDrugs.length >= 2) {
    const totalBurden = achDrugs.reduce((s,d) => s + (d.props.anticholinergic||0), 0);
    interactions.push({
      drug1: achDrugs[0].name, drug2: achDrugs[1].name, enzyme: "ACh",
      type: "pharmacodynamic", strength: "additive",
      effect: "↑ Anticholinergic burden (confusion, dry mouth, constipation, urinary retention)",
      severity: totalBurden >= 4 ? "severe" : "moderate",
      mechanism: `Cumulative anticholinergic load (score ${totalBurden}): ${achDrugs.map(d=>d.name).join(", ")}`
    });
  }

  // NEPHROTOXICITY — Triple whammy and others
  const nephroDrugs = drugs.filter(d => d.props.nephrotoxic);
  if (nephroDrugs.length >= 2) {
    const isTripleWhammy = nephroDrugs.some(d=>d.cls.includes("NSAID")) &&
      nephroDrugs.some(d=>d.cls.includes("ACE")||d.cls.includes("ARB")) &&
      nephroDrugs.some(d=>d.cls.includes("Diuretic"));
    interactions.push({
      drug1: nephroDrugs[0].name, drug2: nephroDrugs[1].name, enzyme: "Renal",
      type: "pharmacodynamic", strength: "additive",
      effect: isTripleWhammy ? "↑↑ Acute kidney injury risk (TRIPLE WHAMMY)" : "↑ Nephrotoxicity risk",
      severity: isTripleWhammy ? "severe" : "moderate",
      mechanism: isTripleWhammy
        ? `NSAID + RAAS blocker + diuretic: ${nephroDrugs.map(d=>d.name).join(", ")} — 30% increased AKI risk`
        : `Multiple nephrotoxic agents: ${nephroDrugs.map(d=>d.name).join(", ")}`
    });
  }

  // HYPERKALEMIA
  const hkDrugs = drugs.filter(d => d.props.hyperkalemia);
  if (hkDrugs.length >= 2) {
    interactions.push({
      drug1: hkDrugs[0].name, drug2: hkDrugs[1].name, enzyme: "K+",
      type: "pharmacodynamic", strength: "additive",
      effect: "↑ Hyperkalemia risk",
      severity: hkDrugs.length >= 3 ? "severe" : "moderate",
      mechanism: `Multiple potassium-retaining agents: ${hkDrugs.map(d=>d.name).join(", ")}`
    });
  }

  // SEIZURE THRESHOLD
  const szDrugs = drugs.filter(d => d.props.seizureRisk);
  if (szDrugs.length >= 2) {
    interactions.push({
      drug1: szDrugs[0].name, drug2: szDrugs[1].name, enzyme: "Seizure",
      type: "pharmacodynamic", strength: "additive",
      effect: "↑ Seizure risk (lowered threshold)",
      severity: szDrugs.length >= 3 ? "severe" : "moderate",
      mechanism: `Multiple drugs that lower seizure threshold: ${szDrugs.map(d=>d.name).join(", ")}`
    });
  }

  // HYPOTENSION
  const htDrugs = drugs.filter(d => d.props.hypotension);
  if (htDrugs.length >= 3) {
    interactions.push({
      drug1: htDrugs[0].name, drug2: htDrugs[1].name, enzyme: "BP",
      type: "pharmacodynamic", strength: "additive",
      effect: "↑ Hypotension / orthostatic risk",
      severity: htDrugs.length >= 4 ? "severe" : "moderate",
      mechanism: `${htDrugs.length} blood pressure-lowering agents: ${htDrugs.map(d=>d.name).join(", ")}`
    });
  }


  // HEPATOTOXICITY ADDITIVITY
  const hepatoDrugs = drugs.filter(d => (d.props.hepatotoxic||0) >= 1);
  if (hepatoDrugs.length >= 2) {
    const highHepato = hepatoDrugs.filter(d => (d.props.hepatotoxic||0) >= 2);
    const key = "hepato-additive";
    if (!seen.has(key)) {
      seen.add(key);
      interactions.push({
        drug1: hepatoDrugs[0].name, drug2: hepatoDrugs[1].name, enzyme: "Liver",
        type: "pharmacodynamic", strength: "additive",
        effect: "\u2191 Hepatotoxicity risk (additive liver injury)",
        severity: highHepato.length >= 2 ? "severe" : "moderate",
        mechanism: `Multiple hepatotoxic agents: ${hepatoDrugs.map(d=>d.name).join(", ")}`
      });
    }
  }

  // HYPONATREMIA (SIADH)
  const hypoNaDrugs = drugs.filter(d => (d.props.hyponatremia||0) >= 1);
  if (hypoNaDrugs.length >= 2) {
    const key = "hypoNa-additive";
    if (!seen.has(key)) {
      seen.add(key);
      interactions.push({
        drug1: hypoNaDrugs[0].name, drug2: hypoNaDrugs[1].name, enzyme: "Na+",
        type: "pharmacodynamic", strength: "additive",
        effect: "\u2191 Hyponatremia risk (SIADH/dilutional)",
        severity: hypoNaDrugs.some(d => (d.props.hyponatremia||0) >= 2) ? "severe" : "moderate",
        mechanism: `Multiple hyponatremia-inducing agents: ${hypoNaDrugs.map(d=>d.name).join(", ")}`
      });
    }
  }

  // MYOPATHY/RHABDOMYOLYSIS (statins + interacting drugs)
  const musculoDrugs = drugs.filter(d => (d.props.musculoskeletal||0) >= 1);
  if (musculoDrugs.length >= 2) {
    const hasStatin = musculoDrugs.some(d => d.cls === "Statin");
    const key = "musculo-additive";
    if (!seen.has(key)) {
      seen.add(key);
      interactions.push({
        drug1: musculoDrugs[0].name, drug2: musculoDrugs[1].name, enzyme: "Muscle",
        type: "pharmacodynamic", strength: "additive",
        effect: hasStatin ? "\u2191 Rhabdomyolysis risk (statin + myotoxic agent)" : "\u2191 Myopathy/tendinopathy risk",
        severity: hasStatin ? "severe" : "moderate",
        mechanism: `Multiple myotoxic agents: ${musculoDrugs.map(d=>d.name).join(", ")}${hasStatin ? " — monitor CK levels" : ""}`
      });
    }
  }

  // MYELOSUPPRESSION
  const myeloDrugs = drugs.filter(d => (d.props.myelosuppression||0) >= 1);
  if (myeloDrugs.length >= 2) {
    const key = "myelo-additive";
    if (!seen.has(key)) {
      seen.add(key);
      interactions.push({
        drug1: myeloDrugs[0].name, drug2: myeloDrugs[1].name, enzyme: "Bone Marrow",
        type: "pharmacodynamic", strength: "additive",
        effect: "\u2191 Myelosuppression risk (pancytopenia, neutropenia)",
        severity: myeloDrugs.filter(d => (d.props.myelosuppression||0) >= 2).length >= 2 ? "severe" : "moderate",
        mechanism: `Multiple myelosuppressive agents: ${myeloDrugs.map(d=>d.name).join(", ")} — monitor CBC`
      });
    }
  }

  // PHOTOSENSITIVITY
  const photoDrugs = drugs.filter(d => (d.props.photoSens||0) >= 1);
  if (photoDrugs.length >= 2) {
    const key = "photo-additive";
    if (!seen.has(key)) {
      seen.add(key);
      interactions.push({
        drug1: photoDrugs[0].name, drug2: photoDrugs[1].name, enzyme: "Skin/UV",
        type: "pharmacodynamic", strength: "additive",
        effect: "\u2191 Photosensitivity risk — increased sun burn/phototoxicity",
        severity: "mild",
        mechanism: `Multiple photosensitizing agents: ${photoDrugs.map(d=>d.name).join(", ")} — use SPF 50+ sunscreen`
      });
    }
  }

    // 4. COMBINATION PRODUCT INTERACTIONS
  COMBINATION_PRODUCTS.forEach(cp => {
    const allPresent = cp.drugs.every(d => activeStack.includes(d));
    if (!allPresent) return;
    const key = cp.drugs.sort().join("|") + "|combo|" + cp.type;
    if (seen.has(key)) return;
    seen.add(key);
    const sevMap = { critical: "severe", high: "severe", moderate: "moderate", low: "mild" };
    const sev = sevMap[cp.severity] || "moderate";
    interactions.push({
      drug1: cp.drugs[0], drug2: cp.drugs[1], enzyme: cp.type.replace(/_/g, " "),
      type: "combination", strength: cp.severity,
      effect: cp.effect || cp.risk || `${cp.type.replace(/_/g, " ")} risk`,
      severity: sev,
      mechanism: cp.mechanism,
      source: "combination"
    });
  });

  // 5. TRANSPORTER-MEDIATED DDI
  TRANSPORTER_DDI.forEach(t => {
    const subPresent = activeStack.includes(t.substrate);
    const inhPresent = activeStack.includes(t.inhibitor) ||
      (t.inhibitor === "NSAIDs" && activeStack.some(n => { const d = getDrug(n); return d && d.cls === "NSAID"; }));
    if (!subPresent || !inhPresent) return;
    const actualInh = t.inhibitor === "NSAIDs"
      ? activeStack.find(n => { const d = getDrug(n); return d && d.cls === "NSAID"; })
      : t.inhibitor;
    const key = [t.substrate, actualInh, t.transporter, "transporter"].sort().join("|");
    if (seen.has(key)) return;
    seen.add(key);
    const sevMap = { critical: "severe", high: "severe", moderate: "moderate", low: "mild" };
    const sev = sevMap[t.severity] || "moderate";
    interactions.push({
      drug1: actualInh, drug2: t.substrate, enzyme: t.transporter,
      type: "transporter", strength: t.severity,
      effect: t.effect,
      severity: sev,
      mechanism: t.mechanism,
      source: "transporter"
    });
  });

  // 6. GRAPH-BASED METABOLITE CHAIN INTERACTIONS
  // Uses the interaction graph to detect multi-hop chains that pairwise enzyme matching misses.
  // Examples: Drug A → metabolite → inhibits enzyme → blocks Drug B metabolite → affects Drug C
  try {
    const graph = getInteractionGraph();
    const chains = findInteractionChains(graph, activeStack, 4);

    for (const chain of chains) {
      // Build a dedup key from the chain components
      const sourceActor = graph.actors[chain.source];
      const victimActor = graph.actors[chain.victim];
      const sourceName = sourceActor ? (sourceActor.data ? sourceActor.data.name || sourceActor.name : sourceActor.name) : chain.source;
      const victimName = victimActor ? (victimActor.data ? victimActor.data.name || victimActor.name : victimActor.name) : chain.victim;

      // Skip if source or victim is not a drug in the active stack
      const sourceInStack = activeStack.find(n => toGraphId(n) === chain.source);
      const victimInStack = activeStack.find(n => toGraphId(n) === chain.victim);
      if (!sourceInStack || !victimInStack) continue;
      if (sourceInStack === victimInStack) continue; // skip self-interactions

      const chainKey = [sourceInStack, victimInStack, chain.enzyme, chain.type].sort().join("|");
      // Check if the pairwise approach already found this interaction
      const pairwiseKey = [sourceInStack, victimInStack, chain.enzyme, "inh"].sort().join("|");
      const pairwiseKey2 = [sourceInStack, victimInStack, chain.enzyme, "ind"].sort().join("|");
      const knownKey = [sourceInStack, victimInStack, "known"].sort().join("|");

      if (seen.has(chainKey) || seen.has(pairwiseKey) || seen.has(pairwiseKey2) || seen.has(knownKey)) continue;
      seen.add(chainKey);

      // Build human-readable chain description
      let chainDesc = '';
      const metabName = chain.perpetratorMetabolite
        ? (chain.perpetratorMetabolite.name || chain.perpetratorMetabolite.id)
        : null;

      if (chain.type === 'metabolite_inhibition_chain' && metabName) {
        chainDesc = `${sourceInStack} → ${metabName} (active metabolite) → inhibits ${chain.enzyme} → ↑ ${victimInStack} levels`;
      } else if (chain.type === 'metabolite_induction_chain' && metabName) {
        chainDesc = `${sourceInStack} → ${metabName} → induces ${chain.enzyme} → ↓ ${victimInStack} levels`;
      } else if (chain.type === 'direct_inhibition') {
        continue; // already caught by pairwise — skip to avoid duplicates
      } else if (chain.type === 'direct_induction') {
        continue; // already caught by pairwise
      } else {
        chainDesc = `${chain.type}: ${sourceInStack} → ${chain.enzyme} → ${victimInStack}`;
      }

      // Determine severity from chain strength
      const sevMap = { strong: "severe", moderate: "moderate", weak: "mild" };
      const sev = sevMap[chain.strength] || "moderate";

      // Get the victim drug's route fraction for this enzyme
      const victimDrug = getDrug(victimInStack);
      const victimRoute = victimDrug ? (victimDrug.routes || []).find(r => r.enzyme === chain.enzyme) : null;
      const victimIsProdrug = victimDrug && victimDrug.prodrug;
      const fraction = victimRoute ? victimRoute.fraction : 0;

      // Only report if meaningful impact (metabolite on a minor pathway is not clinically significant)
      if (fraction < 0.1 && !victimIsProdrug) continue;

      interactions.push({
        drug1: sourceInStack, drug2: victimInStack, enzyme: chain.enzyme,
        type: chain.type === 'metabolite_inhibition_chain'
          ? (victimIsProdrug ? "prodrug-inhibition" : "metabolite-chain")
          : "metabolite-chain",
        strength: chain.strength,
        effect: victimIsProdrug
          ? `↓ ${victimInStack} efficacy (activation blocked via metabolite chain)`
          : `↑ ${victimInStack} levels (metabolite-mediated ${chain.enzyme} inhibition)`,
        severity: sev,
        mechanism: chainDesc,
        source: "graph",
        confidence: "moderate",
        graphChain: chain
      });
    }
  } catch (e) {
    // Graph engine error should never break the core interaction finder
    console.error('Graph chain traversal error:', e);
  }

  // Sort by severity
  interactions.sort((a,b) => {
    const sev = { severe: 3, moderate: 2, mild: 1 };
    return (sev[b.severity]||0) - (sev[a.severity]||0);
  });

  return interactions.map(normalizeInteractionRisk);
}

function calcRisk() {
  const interactions = findInteractions();
  let score = 0;
  const factors = [];

  // CONTRAINDICATED known DDIs get extra weight
  const contraindicated = interactions.filter(i => i.effect && i.effect.includes("CONTRAINDICATED")).length;
  const severe = interactions.filter(i => i.severity === "severe").length;
  const moderate = interactions.filter(i => i.severity === "moderate").length;
  const mild = interactions.filter(i => i.severity === "mild").length;

  // CONFIDENCE-WEIGHTED SCORING: interactions with high evidence get full weight,
  // moderate gets 85%, low gets 60%. Known DDIs always get full weight.
  const confWeight = { high: 1.0, moderate: 0.85, low: 0.6 };
  for (const ix of interactions) {
    const w = ix.evidence ? (confWeight[ix.evidence.confidence] || 0.85) : (ix.source === "known" ? 1.0 : 0.85);
    if (ix.effect && ix.effect.includes("CONTRAINDICATED")) score += 60 * w;
    else if (ix.severity === "severe") score += 30 * w;
    else if (ix.severity === "moderate") score += 15 * w;
    else score += 5 * w;
  }

  // FOLD-CHANGE MAGNITUDE BONUS — high AUC changes are dangerous regardless of category
  const foldResults = activeStack.map(n => calcFold(n));
  const maxFoldResult = foldResults.reduce((best, r) => r.fold > best.fold ? r : best, { fold: 1 });
  const minFoldResult = foldResults.reduce((worst, r) => r.fold < worst.fold ? r : worst, { fold: 1 });
  const maxFold = maxFoldResult.fold;
  const minFold = minFoldResult.fold;

  if (maxFold >= 4) { score += 35; factors.push({ label: `${maxFold.toFixed(1)}× blood level increase — dangerous`, color: "red" }); }
  else if (maxFold >= 3) { score += 25; factors.push({ label: `${maxFold.toFixed(1)}× blood level increase`, color: "red" }); }
  else if (maxFold >= 2) { score += 15; factors.push({ label: `${maxFold.toFixed(1)}× blood level increase`, color: "amber" }); }
  if (minFold <= 0.3) { score += 20; factors.push({ label: `${minFold.toFixed(1)}× blood level — major reduction`, color: "red" }); }
  else if (minFold <= 0.5) { score += 10; factors.push({ label: `${minFold.toFixed(1)}× blood level decrease`, color: "amber" }); }

  // NONLINEAR PK WARNING — flag when saturable kinetics amplify AUC changes
  const nlDrugs = foldResults.filter(r => r.nonlinear && r.fold > 1.5);
  if (nlDrugs.length) {
    score += 10;
    factors.push({ label: `Nonlinear PK: AUC changes amplified for ${nlDrugs.length} drug${nlDrugs.length>1?"s":""}`, color: "red" });
  }

  // AUTO-INHIBITION WARNING
  const autoInhDrugs = foldResults.filter(r => r.autoInhibited);
  if (autoInhDrugs.length) {
    factors.push({ label: `${autoInhDrugs.length} drug${autoInhDrugs.length>1?"s":""} with auto-inhibition at steady state`, color: "amber" });
  }

  // MECHANISM-BASED INHIBITION — irreversible inhibitors are more dangerous
  const mbiInteractions = interactions.filter(i => i.mechanismBased);
  if (mbiInteractions.length) {
    score += 10;
    factors.push({ label: `${mbiInteractions.length} irreversible (mechanism-based) inhibition${mbiInteractions.length>1?"s":""}`, color: "red" });
  }

  // Prodrug efficacy reduction bonus
  const prodrugBlocked = interactions.filter(i => i.type === "prodrug-inhibition");
  const knownProdrug = interactions.filter(i => i.type === "known-ddi" && i.enzyme === "prodrug");
  if (prodrugBlocked.length) {
    const worstProdrug = prodrugBlocked.reduce((worst, i) => (i.fraction||0) > (worst.fraction||0) ? i : worst, prodrugBlocked[0]);
    if (worstProdrug.fraction >= 0.3) { score += 25; factors.push({ label: `${worstProdrug.drug2} prodrug activation significantly blocked`, color: "red" }); }
    else { score += 10; factors.push({ label: `${worstProdrug.drug2} prodrug activation partially blocked`, color: "amber" }); }
  } else if (knownProdrug.length) {
    const worst = knownProdrug[0];
    if (worst.severity === "severe") { score += 30; factors.push({ label: `${worst.drug2||worst.drug1} prodrug activation blocked (clinical evidence)`, color: "red" }); }
    else { score += 10; factors.push({ label: `${worst.drug2||worst.drug1} prodrug activation reduced`, color: "amber" }); }
  }

  // PD risk — confidence-weighted: use evidence from DRUG_DB props where available
  const drugs = activeStack.map(getDrug).filter(Boolean);
  const qtcDrugs = drugs.filter(d=>(d.props.qtcRisk||0)>=2);
  if (qtcDrugs.length >= 2) { score += 20; factors.push({ label: "QTc prolongation risk", color: "red" }); }
  const seroDrugs = drugs.filter(d=>d.props.serotonergic);
  if (seroDrugs.length >= 2) { score += 15; factors.push({ label: "Serotonin syndrome risk", color: "red" }); }
  if (drugs.filter(d=>(d.props.bleedingRisk||0)>=2).length >= 2) { score += 15; factors.push({ label: "High bleeding risk", color: "red" }); }
  else if (drugs.filter(d=>(d.props.bleedingRisk||0)>=1).length >= 2) factors.push({ label: "Bleeding risk", color: "amber" });
  const achDrugs = drugs.filter(d=>(d.props.anticholinergic||0)>=1);
  if (achDrugs.length >= 2) {
    const totalBurden = achDrugs.reduce((s,d) => s + (d.props.anticholinergic||0), 0);
    if (totalBurden >= 4) { score += 15; factors.push({ label: `High anticholinergic burden (score ${totalBurden})`, color: "red" }); }
    else factors.push({ label: "Anticholinergic burden", color: "amber" });
  }
  if (drugs.filter(d=>d.props.nephrotoxic).length >= 2) { score += 10; factors.push({ label: "Nephrotoxicity risk", color: "amber" }); }
  if (drugs.filter(d=>d.props.hyperkalemia).length >= 2) { score += 10; factors.push({ label: "Hyperkalemia risk", color: "amber" }); }
  if (drugs.filter(d=>d.props.seizureRisk).length >= 2) { score += 10; factors.push({ label: "Seizure threshold lowered", color: "amber" }); }
  if (drugs.filter(d=>d.props.sedation).length >= 3) { score += 10; factors.push({ label: "Heavy CNS depression", color: "red" }); }
  if (activeStack.length >= 8) factors.push({ label: `${activeStack.length} medications (polypharmacy)`, color: "amber" });

  // Combination product risk
  const comboInteractions = interactions.filter(i => i.source === "combination");
  const criticalCombos = comboInteractions.filter(i => i.strength === "critical");
  if (criticalCombos.length) { score += 25; factors.push({ label: `${criticalCombos.length} critical combination alert${criticalCombos.length>1?"s":""}`, color: "red" }); }
  else if (comboInteractions.length) factors.push({ label: `${comboInteractions.length} combination alert${comboInteractions.length>1?"s":""}`, color: "amber" });

  // Transporter DDI risk
  const transporterInteractions = interactions.filter(i => i.source === "transporter");
  const criticalTransporters = transporterInteractions.filter(i => i.strength === "critical");
  if (criticalTransporters.length) { score += 20; factors.push({ label: `${criticalTransporters.length} critical transporter interaction${criticalTransporters.length>1?"s":""}`, color: "red" }); }
  else if (transporterInteractions.length) factors.push({ label: `${transporterInteractions.length} transporter interaction${transporterInteractions.length>1?"s":""}`, color: "amber" });

  // Pathway diversion risk (genetics-triggered)
  const pdActive = activeStack.filter(name => {
    const pd = PATHWAY_DIVERSION[name];
    if (!pd) return false;
    const enzyme = pd.primary.enzyme;
    return userGenetics[enzyme] === "poor" || userGenetics[enzyme] === "null";
  });
  if (pdActive.length) { score += 15 * pdActive.length; factors.push({ label: `${pdActive.length} pathway diversion${pdActive.length>1?"s":""} active (genetics)`, color: "red" }); }

  if (severe) factors.unshift({ label: `${severe} severe interaction${severe>1?"s":""}`, color: "red" });
  if (moderate) factors.push({ label: `${moderate} moderate`, color: "amber" });
  if (mild) factors.push({ label: `${mild} mild`, color: "green" });

  score = Math.min(100, Math.round(score));
  let level, color;
  if (score >= 60) { level = "HIGH RISK"; color = "var(--red)"; }
  else if (score >= 30) { level = "MODERATE RISK"; color = "var(--amber)"; }
  else if (score > 0) { level = "LOW RISK"; color = "var(--green)"; }
  else { level = "MINIMAL"; color = "var(--green)"; }

  return { score, level, color, factors, interactions };
}

/* ================================================================
   METABOLITE CROSS-REFERENCING ENGINE
   Checks: (a) metabolite ↔ drug matches in DB
           (b) metabolite-level enzyme conflicts between stacked drugs
           (c) shared toxic metabolite pathways
   ================================================================ */

function analyzeMetabolites() {
  if (!activeStack.length) return { perDrug: {}, drugMatches: {}, enzymeConflicts: [], toxicOverlap: [] };

  // Collect all metabolite names for cross-referencing
  const allMetabs = {};
  activeStack.forEach(drugName => {
    const mets = METAB[drugName];
    if (!mets) return;
    mets.forEach(m => {
      if (!allMetabs[m.n]) allMetabs[m.n] = [];
      allMetabs[m.n].push(drugName);
    });
  });

  // (a) Does any metabolite match a drug in the DB?
  const drugMatches = {};
  activeStack.forEach(drugName => {
    const mets = METAB[drugName];
    if (!mets) return;
    mets.forEach(m => {
      DRUG_DB.forEach(d => {
        const mn = m.n.toLowerCase();
        const dn = d.name.toLowerCase();
        if (mn.includes(dn) || dn.includes(mn.split(" ")[0])) {
          if (d.name !== drugName) {
            if (!drugMatches[drugName]) drugMatches[drugName] = [];
            drugMatches[drugName].push({ metabolite: m, matchedDrug: d.name });
          }
        }
      });
    });
  });

  // (b) Metabolite-level enzyme conflicts between different drugs
  const enzymeConflicts = [];
  activeStack.forEach(drugName => {
    const mets = METAB[drugName];
    if (!mets) return;
    mets.forEach(m => {
      if (m.inh) {
        m.inh.forEach(inh => {
          activeStack.forEach(otherDrug => {
            if (otherDrug === drugName) return;
            const otherMets = METAB[otherDrug];
            if (!otherMets) return;
            otherMets.forEach(om => {
              if (om.e === inh.target && om.a !== "inactive") {
                enzymeConflicts.push({
                  inhibitor: drugName, metabolite: m.n, enzyme: inh.target, strength: inh.strength,
                  victim: otherDrug, affectedMetabolite: om.n, activity: om.a
                });
              }
            });
          });
        });
      }
    });
  });

  // (c) Shared toxic metabolite pathways
  const toxicOverlap = [];
  const toxicMets = {};
  activeStack.forEach(drugName => {
    const mets = METAB[drugName];
    if (!mets) return;
    mets.forEach(m => {
      if (m.a === "toxic") {
        const key = m.e + ":" + m.a;
        if (!toxicMets[key]) toxicMets[key] = [];
        toxicMets[key].push({ drug: drugName, metabolite: m.n, note: m.note });
      }
    });
  });
  for (const [key, items] of Object.entries(toxicMets)) {
    if (items.length >= 2) toxicOverlap.push({ pathway: key, drugs: items });
  }

  return { drugMatches, enzymeConflicts, toxicOverlap };
}

/* ================================================================
   UI FUNCTIONS
   ================================================================ */
