// MedCheck — Mechanistic interpretation layer
// Evidence-backed warnings remain authoritative; this layer explains pathway math.

const MECHANISTIC_PREDICTION_GENES = [
  "CYP2D6","CYP2C19","CYP2C9","CYP3A5","CYP2B6","UGT1A1",
  "DPYD","TPMT","NUDT15","SLCO1B1","ABCG2","ABCB1","NAT2",
  "G6PD","BCHE"
];

const MECHANISTIC_SEVERITY_WORDS = /toxic|toxicity|cytotoxic|nephrotoxic|hepatotoxic|myelosuppression|hemolysis|methemoglobin|qt|arrhythm|bleed|respiratory depression|apnea|paralysis|narrow|contraindicat|avoid/i;

function isMechanisticPredictionGene(gene) {
  return MECHANISTIC_PREDICTION_GENES.includes(gene);
}

function selectedMechanisticPhenotype(gene) {
  if (gene === "G6PD") {
    const riskKey = "G6PD deficiency";
    if (activeGenotype[gene] === GENOTYPE_PHENOTYPE.PM || activeGenotype[riskKey] === GENOTYPE_RISK_STATUS.PRESENT) return GENOTYPE_PHENOTYPE.PM;
  }
  return activeGenotype[gene] || GENOTYPE_PHENOTYPE.NM;
}

function phenotypeIsNonReference(phenotype) {
  return phenotype && phenotype !== GENOTYPE_PHENOTYPE.NM && phenotype !== "normal";
}

function mechanisticPhenotypeLabel(gene, phenotype) {
  return typeof phenotypeLabelForGene === "function" ? phenotypeLabelForGene(gene, phenotype) : phenotypeLabel(phenotype);
}

function phenotypeDirectionForEnzyme(gene, phenotype) {
  const fold = GENOTYPE_EFFECTS[gene]?.[phenotype]?.auc_fold || 1;
  if (fold > 1.15) return "slower";
  if (fold < 0.85) return "faster";
  return "reference";
}

function knownDdiCoversPair(a, b, pathway) {
  const pa = String(a || "").toLowerCase();
  const pb = String(b || "").toLowerCase();
  const pw = String(pathway || "").toLowerCase();
  return (KNOWN_DDI || []).some(ddi => {
    const d1 = String(ddi.drug1 || "").toLowerCase();
    const d2 = String(ddi.drug2 || "").toLowerCase();
    const samePair = (d1 === pa && d2 === pb) || (d1 === pb && d2 === pa);
    if (!samePair) return false;
    if (!pw) return true;
    return String(ddi.category || ddi.enzyme || ddi.mechanism || "").toLowerCase().includes(pw) ||
      String(ddi.effect || "").toLowerCase().includes(pw);
  });
}

function curatedDdiForPair(a, b) {
  const pa = String(a || "").toLowerCase();
  const pb = String(b || "").toLowerCase();
  return (KNOWN_DDI || []).find(ddi => {
    const d1 = String(ddi.drug1 || "").toLowerCase();
    const d2 = String(ddi.drug2 || "").toLowerCase();
    return (d1 === pa && d2 === pb) || (d1 === pb && d2 === pa);
  });
}

function routeFraction(route) {
  return Number.isFinite(route?.fraction) ? route.fraction : 0.25;
}

function estimateDrugEnzymePrediction(perpetratorName, victimName, mode, mod, route) {
  const curatedDdi = curatedDdiForPair(perpetratorName, victimName);
  const pathwayCurated = knownDdiCoversPair(perpetratorName, victimName, route.enzyme);

  const fraction = routeFraction(route);
  const strength = mod.strength || "moderate";
  const mult = mode === "inhibition"
    ? (INH_MULT[strength] || 1.5)
    : (IND_MULT[strength] || 0.7);
  const estimatedFold = mode === "inhibition"
    ? ((1 - fraction) + fraction * mult)
    : ((1 - fraction) + fraction * mult);
  const victim = getDrug(victimName);
  const prodrug = !!victim?.prodrug;
  const direction = mode === "inhibition"
    ? (prodrug ? "reduced active-metabolite formation" : "higher parent exposure")
    : (prodrug ? "higher active-metabolite formation" : "lower parent exposure");
  const text = `${victim?.note || ""} ${route.enzyme} ${direction}`;
  const priority = (victim?.props?.narrowTherapeutic || victim?.props?.nti || victim?.props?.qtcRisk >= 2 || MECHANISTIC_SEVERITY_WORDS.test(text))
    ? "higher clinical review"
    : "clinical context";

  return {
    id:`mech-ddi-${toGraphId(perpetratorName)}-${toGraphId(victimName)}-${route.enzyme}-${mode}`,
    kind:"medication-enzyme",
    title:`${perpetratorName} may ${mode === "inhibition" ? "raise" : "lower"} ${victimName} exposure through ${route.enzyme}`,
    subtitle:curatedDdi
      ? `Mechanistic read-through of a source-linked ${curatedDdi.severity || "known"} interaction.`
      : `Model prediction from ${perpetratorName} ${mode} of ${route.enzyme}; no direct source-linked pair study linked.`,
    pathway:route.enzyme,
    drugs:[perpetratorName, victimName],
    direction,
    clinicalMeaning:prodrug
      ? `${victimName} is treated as a prodrug or active-metabolite-dependent medicine, so ${route.enzyme} changes may alter effect rather than just parent level.`
      : `${victimName} uses ${route.enzyme} for about ${Math.round(fraction * 100)}% of modeled clearance, so ${perpetratorName} could shift exposure.`,
    action:priority === "higher clinical review"
      ? "Treat as an experimental high-review signal: check dose, monitoring, alternatives, and whether a direct study or label exists."
      : "Use as a prompt to verify the pathway and monitor response or adverse effects.",
    estimate:Number.isFinite(estimatedFold) ? Number(estimatedFold.toFixed(2)) : null,
    confidence:route.evidence?.confidence || mod.evidence?.confidence || "modeled",
    source:"route_plus_enzyme_modifier",
    documented:!!curatedDdi || pathwayCurated,
    curatedSeverity:curatedDdi?.severity || null,
  };
}

function getMedicationEnzymeMechanisticPredictions(stack = activeStack) {
  if (!stack || stack.length < 2) return [];
  const out = [];
  const seen = new Set();
  for (const perpetratorName of stack) {
    const perpetrator = getDrug(perpetratorName);
    if (!perpetrator) continue;
    const modifiers = [
      ...getAllInhibitions(perpetrator).map(mod => ({ mode:"inhibition", mod })),
      ...(perpetrator.ind || []).map(mod => ({ mode:"induction", mod })),
    ];
    for (const victimName of stack) {
      if (victimName === perpetratorName) continue;
      const victim = getDrug(victimName);
      if (!victim) continue;
      for (const { mode, mod } of modifiers) {
        for (const route of (victim.routes || [])) {
          if (!route?.enzyme || route.enzyme !== mod.target) continue;
          const pred = estimateDrugEnzymePrediction(perpetratorName, victimName, mode, mod, route);
          if (!pred) continue;
          const key = pred.id;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(pred);
        }
      }
    }
  }
  return out;
}

function estimateDrugGenotypePrediction(parentName, route, phenotype) {
  const gene = route.enzyme;
  const effect = GENOTYPE_EFFECTS[gene]?.[phenotype];
  if (!effect) return null;
  const fraction = routeFraction(route);
  const fold = Number.isFinite(effect.auc_fold)
    ? ((1 - fraction) + fraction * effect.auc_fold)
    : null;
  const drug = getDrug(parentName);
  const prodrug = !!drug?.prodrug;
  const enzymeDirection = phenotypeDirectionForEnzyme(gene, phenotype);
  if (enzymeDirection === "reference") return null;
  const direction = enzymeDirection === "slower"
    ? (prodrug ? "reduced active-metabolite formation" : "higher parent exposure")
    : (prodrug ? "higher active-metabolite formation" : "lower parent exposure");
  return {
    id:`mech-pgx-drug-${toGraphId(parentName)}-${gene}`,
    kind:"genotype-drug",
    title:`${gene} ${mechanisticPhenotypeLabel(gene, phenotype)} may change ${parentName}`,
    subtitle:"Mechanistic genotype read-through from the selected phenotype and the drug's modeled pathway fraction.",
    pathway:gene,
    drugs:[parentName],
    direction,
    clinicalMeaning:prodrug
      ? `${parentName} is active-metabolite dependent, so ${gene} ${mechanisticPhenotypeLabel(gene, phenotype)} may change effect more than parent exposure.`
      : `${parentName} uses ${gene} for about ${Math.round(fraction * 100)}% of modeled clearance, so this phenotype may shift exposure.`,
    action:"Use this as pathway context alongside the evidence-backed pharmacogenomics warning and dose guidance.",
    estimate:Number.isFinite(fold) ? Number(fold.toFixed(2)) : null,
    confidence:route.evidence?.confidence || effect.confidence || "modeled",
    source:"drug_route_plus_genotype",
    documented:!!(PHARMGKB_EVIDENCE[gene]?.pairs || []).some(pair => pair.drug === parentName),
  };
}

function getDrugGenotypeMechanisticPredictions(stack = activeStack) {
  const out = [];
  const seen = new Set();
  for (const parentName of stack || []) {
    const drug = getDrug(parentName);
    if (!drug) continue;
    for (const route of (drug.routes || [])) {
      const gene = route.enzyme;
      if (!isMechanisticPredictionGene(gene) || !GENOTYPE_EFFECTS[gene]) continue;
      const phenotype = selectedMechanisticPhenotype(gene);
      if (!phenotypeIsNonReference(phenotype)) continue;
      const pred = estimateDrugGenotypePrediction(parentName, route, phenotype);
      if (!pred || seen.has(pred.id)) continue;
      seen.add(pred.id);
      out.push(pred);
    }
  }
  return out;
}

function metaboliteClinicalDirection(met, gene, phenotype, role) {
  const enzymeDirection = phenotypeDirectionForEnzyme(gene, phenotype);
  const active = met.a === "active" || met.a === "active_form" || met.role === "active_form";
  const toxic = met.a === "toxic" || /toxic|hemolysis|methemoglobin|reactive|nephrotoxic|hepatotoxic/i.test(`${met.note || ""} ${met.n || ""}`);
  const inactive = met.a === "inactive" || (!active && !toxic);

  if (role === "clearance") {
    if (enzymeDirection === "slower") return {
      direction:"metabolite may accumulate",
      clinicalMeaning:toxic ? "toxic metabolite exposure may rise" : active ? "active metabolite exposure may rise" : "inactive metabolite may persist longer",
    };
    if (enzymeDirection === "faster") return {
      direction:"metabolite may clear faster",
      clinicalMeaning:active ? "active metabolite effect may fall" : toxic ? "toxic metabolite exposure may fall" : "metabolite exposure may fall",
    };
  }

  if (enzymeDirection === "slower") return {
    direction:"metabolite formation may fall",
    clinicalMeaning:active ? "active metabolite effect may be reduced" : toxic ? "toxic metabolite formation may be reduced, while parent exposure may rise" : inactive ? "parent drug may persist because inactivation is slower" : "metabolite formation may fall",
  };
  if (enzymeDirection === "faster") return {
    direction:"metabolite formation may rise",
    clinicalMeaning:active ? "active metabolite effect may increase" : toxic ? "toxic metabolite formation may increase" : inactive ? "parent drug may clear faster through inactivation" : "metabolite formation may rise",
  };
  return null;
}

function hasExplicitGenotypeMetaboliteRule(parentName, metaboliteName, gene) {
  const metId = getMetaboliteGraphId(metaboliteName);
  return (GENOTYPE_METABOLITE_EFFECTS || []).some(effect =>
    effect.parent === parentName &&
    effect.enzyme === gene &&
    (effect.metaboliteId === metId || effect.metaboliteName === metaboliteName)
  );
}

function getMetaboliteGenotypeMechanisticPredictions(stack = activeStack) {
  const out = [];
  const seen = new Set();
  for (const parentName of stack || []) {
    const mets = METAB[parentName] || [];
    for (const met of mets) {
      const gene = met.e;
      if (!isMechanisticPredictionGene(gene) || !GENOTYPE_EFFECTS[gene]) continue;
      const phenotype = selectedMechanisticPhenotype(gene);
      if (!phenotypeIsNonReference(phenotype)) continue;
      const documented = hasExplicitGenotypeMetaboliteRule(parentName, met.n, gene);
      const impact = metaboliteClinicalDirection(met, gene, phenotype, "formation");
      if (!impact) continue;
      const key = `${parentName}|${met.n}|${gene}|formation`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id:`mech-pgx-${toGraphId(parentName)}-${getMetaboliteGraphId(met.n)}-${gene}`,
        kind:"genotype-metabolite",
        title:`${gene} ${mechanisticPhenotypeLabel(gene, phenotype)} may change ${met.n}`,
        subtitle:documented
          ? `Mechanistic read-through of a source-linked genotype-metabolite rule for ${parentName}.`
          : `Model prediction from ${parentName} -> ${met.n}; no direct genotype-metabolite rule linked.`,
        pathway:gene,
        drugs:[parentName],
        metabolite:met.n,
        direction:impact.direction,
        clinicalMeaning:impact.clinicalMeaning,
        action:MECHANISTIC_SEVERITY_WORDS.test(`${met.note || ""} ${impact.clinicalMeaning}`)
          ? "Treat as an experimental high-review signal because the metabolite is active, toxic, or safety-relevant."
          : "Use as a prompt to verify whether the metabolite shift matters clinically.",
        estimate:null,
        confidence:met.evidenceRefs?.length ? "curated_pathway" : "modeled",
        source:"metabolite_pathway_plus_genotype",
        documented,
      });
    }
  }

  const graph = typeof getInteractionGraph === "function" ? getInteractionGraph() : null;
  if (graph) {
    for (const parentName of stack || []) {
      const parentId = getDrugGraphId(parentName);
      const metEdges = (graph.edges || []).filter(e => e.from === parentId && e.type === EDGE_TYPE.METABOLIZED_TO);
      for (const edge of metEdges) {
        const actor = graph.actors[edge.to];
        if (!actor?.routes?.length) continue;
        for (const route of actor.routes) {
          const gene = route.enzyme;
          if (!isMechanisticPredictionGene(gene) || !GENOTYPE_EFFECTS[gene]) continue;
          const phenotype = selectedMechanisticPhenotype(gene);
          if (!phenotypeIsNonReference(phenotype)) continue;
          const documented = hasExplicitGenotypeMetaboliteRule(parentName, actor.name, gene);
          const met = { n:actor.name, a:actor.active ? "active" : "inactive", note:actor.note || actor.toxicity?.mechanism || "" };
          const impact = metaboliteClinicalDirection(met, gene, phenotype, "clearance");
          if (!impact) continue;
          const key = `${parentName}|${actor.id}|${gene}|clearance`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({
            id:`mech-pgx-clear-${toGraphId(parentName)}-${actor.id}-${gene}`,
            kind:"genotype-metabolite",
            title:`${gene} ${mechanisticPhenotypeLabel(gene, phenotype)} may change ${actor.name}`,
            subtitle:documented
              ? `Mechanistic read-through of a source-linked metabolite-clearance rule for ${parentName}.`
              : `Model prediction from metabolite clearance route; no direct genotype-metabolite rule linked.`,
            pathway:gene,
            drugs:[parentName],
            metabolite:actor.name,
            direction:impact.direction,
            clinicalMeaning:impact.clinicalMeaning,
            action:MECHANISTIC_SEVERITY_WORDS.test(`${actor.note || ""} ${impact.clinicalMeaning}`)
              ? "Treat as an experimental high-review signal because the metabolite is active, toxic, or safety-relevant."
              : "Use as a prompt to verify whether the metabolite shift matters clinically.",
            estimate:null,
            confidence:route.evidence?.confidence || "modeled",
            source:"metabolite_clearance_plus_genotype",
            documented,
          });
        }
      }
    }
  }

  return out;
}

function getMechanisticPredictions(stack = activeStack) {
  const predictions = [
    ...getMedicationEnzymeMechanisticPredictions(stack),
    ...getDrugGenotypeMechanisticPredictions(stack),
    ...getMetaboliteGenotypeMechanisticPredictions(stack),
  ];
  return predictions
    .filter(Boolean)
    .sort((a, b) => {
      const high = p => MECHANISTIC_SEVERITY_WORDS.test(`${p.title} ${p.clinicalMeaning} ${p.action}`) ? 1 : 0;
      if (high(a) !== high(b)) return high(b) - high(a);
      return String(a.title).localeCompare(String(b.title));
    });
}
