// MedCheck Engine — functional phenotype / phenoconversion state

const PHENOCONVERSION_LABELS = {
  increased_function: "increased function",
  normal_function: "normal function",
  intermediate_function: "intermediate function",
  poor_function: "poor function",
  minimal_or_no_function: "minimal/no function",
};

function computePhenoconversionState(stack, genotypeState = {}, context = {}) {
  const activeNames = Array.isArray(stack) && stack.length ? stack : activeStack;
  if (!Array.isArray(activeNames) || !activeNames.length) return [];
  const run = () => {
    const enzymes = phenoconversionRelevantEnzymes(activeNames);
    const activeRows = typeof computeAllEnzymeCapacities === "function"
      ? computeAllEnzymeCapacities(activeNames)
      : [];
    const capByGene = new Map(activeRows.map(row => [row.enzyme, row]));
    const rows = [];
    for (const enzyme of enzymes) {
      const cap = capByGene.get(enzyme) || (typeof computeEnzymeCapacity === "function" ? computeEnzymeCapacity(enzyme, activeNames) : null);
      if (!cap) continue;
      const geneticPhenotype = activeGenotype?.[enzyme] || GENOTYPE_PHENOTYPE.NM;
      const capacityPct = userGenetics?.[enzyme] === "null" ? Math.min(cap.capacity_pct, 5) : cap.capacity_pct;
      const functionalPhenotype = classifyFunctionalPhenotype(enzyme, capacityPct);
      const direction = capacityPct > 120 ? "increased" : capacityPct < 75 ? "reduced" : "normal";
      const activeMoietyRows = Array.isArray(context.activeMoietyRows)
        ? context.activeMoietyRows
        : (typeof computeActiveMoietyBalance === "function" && context.skipActiveMoiety !== true
          ? computeActiveMoietyBalance(activeNames, activeGenotype || {}, { phenoconversionRows:[], skipPhenoconversion:true })
          : []);
      const row = {
        enzyme,
        geneticPhenotype,
        functionalPhenotype,
        capacityPct,
        direction,
        drivers: phenoconversionDrivers(cap, geneticPhenotype),
        affectedParents: phenoconversionAffectedParents(enzyme, activeNames, cap),
        affectedMetabolites: phenoconversionAffectedMetabolites(enzyme, activeNames),
        activeMoietyConsequences: phenoconversionConsequences(enzyme, activeMoietyRows),
        evidenceRefs: phenoconversionEvidenceRefs(enzyme, activeNames),
        reviewRequired: true,
        confidence: cap.confidence || "unknown",
        limitingFactor: cap.limiting_factor || "",
        clinicalNote: cap.clinical_note || "",
      };
      if (phenoconversionShouldInclude(row)) rows.push(row);
    }
    return summarizePhenoconversion(rows);
  };
  return typeof withActiveMoietyGenotypeState === "function"
    ? withActiveMoietyGenotypeState(genotypeState, run)
    : run();
}

function classifyFunctionalPhenotype(enzyme, capacityPct) {
  if (!Number.isFinite(capacityPct)) return "unknown";
  if (capacityPct >= 120) return "increased_function";
  if (capacityPct >= 75) return "normal_function";
  if (capacityPct >= 40) return "intermediate_function";
  if (capacityPct >= 10) return "poor_function";
  return "minimal_or_no_function";
}

function summarizePhenoconversion(rows) {
  return (rows || []).slice().sort((a, b) => phenoconversionScore(b) - phenoconversionScore(a) || a.enzyme.localeCompare(b.enzyme));
}

function phenoconversionRowsToFindings(rows) {
  return (rows || [])
    .filter(row => row && row.direction !== "normal")
    .map(row => ({
      id: phenoconversionFindingId(["finding", "phenoconversion", row.enzyme, row.functionalPhenotype]),
      type: "phenoconversion",
      title: `${row.enzyme} behaves as ${PHENOCONVERSION_LABELS[row.functionalPhenotype] || row.functionalPhenotype}`,
      severity: row.functionalPhenotype === "minimal_or_no_function" || row.functionalPhenotype === "poor_function"
        ? "moderate"
        : "monitor",
      confidence: row.confidence || "unknown",
      summary: phenoconversionSummary(row),
      affectedActors: [
        { id:row.enzyme, type:"enzyme", direction:row.direction },
        ...row.affectedParents.slice(0, 5).map(name => ({ id:name, type:"parent_drug", direction:"affected" })),
        ...row.affectedMetabolites.slice(0, 4).map(name => ({ id:name, type:"metabolite", direction:"affected" })),
      ],
      tags: uniquePhenoconversionValues([
        "Functional gene status",
        row.direction,
        PHENOCONVERSION_LABELS[row.functionalPhenotype],
        row.drivers.some(driver => driver.type === "inhibitor") ? "inhibitor-driven" : "",
        row.drivers.some(driver => driver.type === "inducer") ? "inducer-driven" : "",
        row.geneticPhenotype !== GENOTYPE_PHENOTYPE.NM ? "genotype" : "",
      ]),
      evidenceRefs: uniquePhenoconversionValues(row.evidenceRefs || []),
      reviewRequired: row.reviewRequired !== false,
      whyPath: null,
      evidenceLadder: null,
      source: "phenoconversion_engine",
      sourceRows: [row],
      groupedFindings: [],
      clinicalAction: row.clinicalNote || "",
      evidenceStatus: (row.evidenceRefs || []).length ? "source-linked; pending professional review" : "inferred/review required",
    }));
}

function phenoconversionRelevantEnzymes(stack) {
  const genes = new Set();
  for (const name of stack) {
    const drug = getDrug(name);
    if (!drug) continue;
    for (const route of (drug.routes || [])) if (route.enzyme) genes.add(route.enzyme);
    for (const inh of (drug.inh || [])) if (inh.target) genes.add(inh.target);
    for (const ind of (drug.ind || [])) if (ind.target) genes.add(ind.target);
    for (const inh of (drug.metInh || [])) if (inh.target) genes.add(inh.target);
    for (const met of (METAB[name] || [])) if (met.e) genes.add(met.e);
    for (const effect of (GENOTYPE_METABOLITE_EFFECTS || [])) {
      if (effect.parent === name && effect.enzyme) genes.add(effect.enzyme);
    }
  }
  for (const gene of Object.keys(activeGenotype || {})) {
    if ((activeGenotype || {})[gene] && (activeGenotype || {})[gene] !== GENOTYPE_PHENOTYPE.NM) genes.add(gene);
  }
  return [...genes].filter(phenoconversionIsCalibratedGene);
}

function phenoconversionIsCalibratedGene(gene) {
  return !!(GENOTYPE_EFFECTS?.[gene] || /^(CYP|UGT|DPYD|TPMT|NUDT|BCHE|SLCO|ABCB|ABCG|NAT)/i.test(String(gene || "")));
}

function phenoconversionDrivers(cap, geneticPhenotype) {
  const drivers = [];
  if (geneticPhenotype && geneticPhenotype !== GENOTYPE_PHENOTYPE.NM) {
    drivers.push({ type:"genotype", actor:cap.enzyme, strength:geneticPhenotype });
  }
  for (const inh of (cap.inhibitors || [])) drivers.push({ type:"inhibitor", actor:inh.drug, strength:inh.strength || "modeled" });
  for (const ind of (cap.inducers || [])) drivers.push({ type:"inducer", actor:ind.drug, strength:ind.strength || "modeled" });
  if (cap.substrate_burden > 0) drivers.push({ type:"substrate_burden", actor:"current stack", strength:`${Math.round(cap.substrate_burden * 100)}%` });
  return drivers;
}

function phenoconversionAffectedParents(enzyme, stack, cap) {
  const names = new Set(cap.affected_substrates || []);
  for (const name of stack) {
    const drug = getDrug(name);
    if ((drug?.routes || []).some(route => route.enzyme === enzyme)) names.add(name);
    if ((METAB[name] || []).some(met => met.e === enzyme)) names.add(name);
  }
  return [...names];
}

function phenoconversionAffectedMetabolites(enzyme, stack) {
  const names = new Set();
  for (const parent of stack) {
    for (const met of (METAB[parent] || [])) {
      const metId = typeof activeMoietyMetaboliteId === "function" ? activeMoietyMetaboliteId(met.n) : "";
      const actor = metId && typeof activeMoietyActor === "function" ? activeMoietyActor(metId) : null;
      if (met.e === enzyme || actor?.formingEnzyme === enzyme || (actor?.routes || []).some(route => route.enzyme === enzyme)) {
        names.add(actor?.name || met.n);
      }
    }
    for (const effect of (GENOTYPE_METABOLITE_EFFECTS || [])) {
      if (effect.parent === parent && effect.enzyme === enzyme) names.add(effect.metaboliteName || effect.metaboliteId);
    }
  }
  return [...names];
}

function phenoconversionConsequences(enzyme, activeMoietyRows = []) {
  return uniquePhenoconversionValues((activeMoietyRows || [])
    .filter(row => row.formationPathway === enzyme || row.clearancePathway === enzyme)
    .filter(row => row.netPattern && row.netPattern !== "no_major_signal")
    .map(row => `${row.parent} -> ${row.actor}: ${(ACTIVE_MOIETY_PATTERN_LABELS[row.netPattern] || row.netPattern).replace(/_/g, " ")}`));
}

function phenoconversionEvidenceRefs(enzyme, stack) {
  const refs = new Set();
  for (const name of stack) {
    const drug = getDrug(name);
    for (const route of (drug?.routes || [])) {
      if (route.enzyme === enzyme) for (const ref of (route.evidenceRefs || route.evidence?.refs || [])) refs.add(ref);
    }
    for (const inh of [...(drug?.inh || []), ...(drug?.metInh || [])]) {
      if (inh.target === enzyme) for (const ref of (inh.evidenceRefs || inh.evidence?.refs || [])) refs.add(ref);
    }
    for (const ind of (drug?.ind || [])) {
      if (ind.target === enzyme) for (const ref of (ind.evidenceRefs || ind.evidence?.refs || [])) refs.add(ref);
    }
    for (const effect of (GENOTYPE_METABOLITE_EFFECTS || [])) {
      if (effect.parent === name && effect.enzyme === enzyme) for (const ref of (effect.evidenceRefs || [])) refs.add(ref);
    }
  }
  return [...refs];
}

function phenoconversionShouldInclude(row) {
  return row.direction !== "normal" || row.drivers.length > 0 || row.affectedParents.length > 0 || row.affectedMetabolites.length > 0;
}

function phenoconversionScore(row) {
  const functional = { minimal_or_no_function:5, poor_function:4, intermediate_function:3, increased_function:2, normal_function:1 }[row.functionalPhenotype] || 0;
  return functional * 100 + row.drivers.length * 10 + row.activeMoietyConsequences.length * 15 + (row.evidenceRefs.length ? 5 : 0);
}

function phenoconversionSummary(row) {
  const genetic = String(row.geneticPhenotype || GENOTYPE_PHENOTYPE.NM).replace(/_/g, " ");
  const functional = PHENOCONVERSION_LABELS[row.functionalPhenotype] || row.functionalPhenotype;
  const driverText = row.drivers.length
    ? ` Drivers: ${row.drivers.map(driver => `${driver.actor} ${driver.type}`.trim()).slice(0, 3).join(", ")}.`
    : "";
  const affected = row.affectedParents.length ? ` Affects ${row.affectedParents.slice(0, 3).join(", ")}.` : "";
  return `${row.enzyme} genetic phenotype is ${genetic}; functional phenotype is ${functional} (${row.capacityPct}% capacity).${driverText}${affected}`;
}

function uniquePhenoconversionValues(values = []) {
  return [...new Set((values || []).map(value => String(value || "").trim()).filter(Boolean))];
}

function phenoconversionFindingId(parts = []) {
  return uniquePhenoconversionValues(parts).join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
