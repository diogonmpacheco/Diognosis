// MedCheck — Enzyme occupancy, inhibition fold-change, gut extraction
// Phase A: modular source — concatenated by build.js

function getAllInhibitions(drug) {
  // Combine parent drug inhibitions + metabolite-mediated inhibitions
  // Returns [{target, strength, mechanism, doseDependent, timeDependent, ...}] using normalized DRUG_DB field names
  let allInh = (drug.inh || []).map(i => ({
    target: i.target, strength: i.strength,
    mechanism: i.mechanism, doseDependent: i.doseDependent,
    timeDependent: i.timeDependent, autoInhibition: i.autoInhibition,
    evidence: i.evidence
  }));
  if (drug.metInh && drug.metInh.length) {
    for (const mi of drug.metInh) {
      const existing = allInh.find(i => i.target === mi.target);
      if (!existing) {
        allInh.push({target: mi.target, strength: mi.strength,
          mechanism: mi.mechanism, doseDependent: mi.doseDependent,
          timeDependent: mi.timeDependent, evidence: mi.evidence});
      } else {
        const existStr = INH_MULT[existing.strength] || 1;
        const newStr = INH_MULT[mi.strength] || 1;
        if (newStr > existStr) {
          existing.strength = mi.strength;
          existing.mechanism = mi.mechanism || existing.mechanism;
        }
      }
    }
  }
  return allInh;
}

function calcFold(drugName) {
  const drug = getDrug(drugName);
  if (!drug || drug.routes.length === 0) return { fold: 1, details: [], prodrug: drug ? drug.prodrug : 0, nonlinear: false, autoInhibited: false };

  let details = [];
  let routeResults = [];
  let isNonlinear = false;
  let isAutoInhibited = false;

  // Check for clinical PK fold data (observed in studies, overrides generic model)
  const clinData = CLINICAL_FOLD[drugName];

  // AUTO-INHIBITION: Check if this drug inhibits its own metabolic enzymes
  const selfInhibitions = {};
  if (drug.inh) {
    for (const inh of drug.inh) {
      if (inh.autoInhibition && drug.routes.some(r => r.enzyme === inh.target)) {
        selfInhibitions[inh.target] = inh;
        isAutoInhibited = true;
      }
    }
  }

  for (const route of drug.routes) {
    let enzymeMult = 1;
    let routeDetails = [];
    const genePheno = userGenetics[route.enzyme];
    const isSaturable = route.saturable || route.nonLinear;

    // CLINICAL FOLD CEILING: if we have observed data for this drug+enzyme,
    // use the null fold as an absolute ceiling — no model can exceed reality
    const clinEnz = clinData && clinData[route.enzyme];
    const clinNullFold = clinEnz && clinEnz["null"];
    // Back-calculate the max enzymeMult that would produce the null fold
    const clinNullMult = clinNullFold && route.fraction > 0
      ? (clinNullFold - (1 - route.fraction)) / route.fraction : null;

    // GENETICS: if clinical data exists for this genotype, use it directly
    // Otherwise fall back to generic multiplier from PHENOTYPE_OPTIONS
    let geneticMult = 1.0;
    let usedClinicalGenetics = false;
    if (clinEnz && (genePheno === "poor" || genePheno === "null")) {
      const clinFold = clinEnz[genePheno];
      if (clinFold !== undefined) {
        usedClinicalGenetics = true;
        geneticMult = (clinFold - (1 - route.fraction)) / route.fraction;
        if (geneticMult < 0.01) geneticMult = 0.01;
      }
    }
    if (!usedClinicalGenetics) {
      geneticMult = getPhenotypeMult(route.enzyme);
    }

    if (geneticMult !== 1.0) {
      enzymeMult = geneticMult;
      routeDetails = [{ perpetrator: "Genetics", enzyme: route.enzyme, type: "genetic", strength: genePheno || "normal", mult: geneticMult }];
    }

    // AUTO-INHIBITION + NONLINEAR PK
    // For auto-inhibiting drugs (Paroxetine, Fluoxetine), the auto-inhibition is
    // BASELINE — every patient taking the drug experiences it. So normal metabolizer
    // at standard dose = fold 1.0. The clinical PM/null folds already incorporate
    // auto-inhibition at steady state (Shimoda 2002, Jornil 2010 PBPK).
    //
    // Dose scaling uses VARIABLE NONLINEARITY (gamma):
    //   Normal: high gamma (steep — auto-inhibition amplifies dose changes)
    //   PM:     moderate gamma (less enzyme → less auto-inhibition to amplify)
    //   Null:   gamma=1.0 (no enzyme → linear, auto-inhibition irrelevant)
    //
    // This produces the correct pharmacological behavior:
    //   - At HIGH doses: PM/normal ratio COMPRESSES (auto-inhibition saturates normals)
    //   - At LOW doses: PM/normal ratio EXPANDS (genetics dominate when less auto-inh)
    //   - Doubling dose → disproportionate exposure increase (literature: 15× trough)
    const selfInh = selfInhibitions[route.enzyme];
    if (selfInh && clinNullFold) {
      // ═══ CLINICAL AUTO-INHIBITOR MODEL ═══
      // Handles all genotypes: normal, poor, null
      const selfDoseMod = selfInh.doseDependent ? getDoseModifier(drugName) : 1.0;

      // Base enzyme multiplier from genetics (or 1.0 for normal)
      let baseMult;
      if (genePheno === "null" && usedClinicalGenetics) {
        baseMult = geneticMult; // from clinical null fold back-calculation
      } else if ((genePheno === "poor") && usedClinicalGenetics) {
        baseMult = geneticMult; // from clinical poor fold back-calculation
      } else {
        baseMult = 1.0; // normal metabolizer — auto-inhibition is baseline
      }

      // Variable gamma: steeper nonlinearity for more functional enzyme
      // because auto-inhibition amplifies dose changes when enzyme is present
      const baseGamma = isSaturable ? 2.5 : 1.8;
      let gamma;
      if (genePheno === "null") {
        gamma = 1.0; // no enzyme → linear dose-response
      } else if (genePheno === "poor") {
        gamma = baseGamma * 0.6; // reduced enzyme → less nonlinearity
      } else {
        gamma = baseGamma; // full enzyme → full nonlinear auto-inhibition
      }

      // Apply nonlinear dose scaling
      if (selfDoseMod !== 1.0 && selfDoseMod > 0) {
        const doseScale = Math.pow(selfDoseMod, gamma);
        enzymeMult = baseMult * doseScale;
      } else {
        enzymeMult = baseMult;
      }

      // Floor
      if (enzymeMult < 0.01) enzymeMult = 0.01;

      isNonlinear = !!isSaturable;
      isAutoInhibited = true;
      routeDetails = [{ perpetrator: drugName + " (self)", enzyme: route.enzyme, type: "auto-inhibition",
        strength: selfInh.strength, mult: selfDoseMod, mechanism: selfInh.mechanism || "reversible" }];
      if (genePheno === "poor" || genePheno === "null") {
        routeDetails.push({ perpetrator: "Genetics", enzyme: route.enzyme, type: "genetic",
          strength: genePheno, mult: baseMult });
      }
    } else if (selfInh && genePheno !== "null") {
      // ═══ GENERIC MODEL: no clinical data, non-null genotype ═══
      const selfDoseMod = selfInh.doseDependent ? getDoseModifier(drugName) : 1.0;
      const selfMult = selfInh.mechanism === "mechanism_based"
        ? (INH_MULT[selfInh.strength] || 1) * selfDoseMod * 1.3
        : (INH_MULT[selfInh.strength] || 1) * selfDoseMod * 0.7;
      let autoMult = enzymeMult * selfMult;
      if (autoMult > 20) autoMult = 20;
      enzymeMult = autoMult;
      routeDetails.push({ perpetrator: drugName + " (self)", enzyme: route.enzyme, type: "auto-inhibition",
        strength: selfInh.strength, mult: selfMult, mechanism: selfInh.mechanism || "reversible" });

      // Nonlinear PK for generic model
      if (isSaturable && enzymeMult > 1.5) {
        isNonlinear = true;
        const nlExponent = enzymeMult > 3 ? 1.5 : 1.3;
        const linearFold = route.fraction * enzymeMult + (1 - route.fraction);
        const nlFold = Math.pow(linearFold, nlExponent);
        if (route.fraction > 0) {
          enzymeMult = (nlFold - (1 - route.fraction)) / route.fraction;
        }
        routeDetails.push({ perpetrator: "Nonlinear PK", enzyme: route.enzyme, type: "nonlinear",
          strength: "saturable", mult: nlExponent, note: "Michaelis-Menten amplification" });
      }
    } else if (selfInh && genePheno === "null") {
      // Null genotype + no clinical data: enzyme absent, auto-inhibition irrelevant
      // geneticMult already set from PHENOTYPE_OPTIONS
      isAutoInhibited = true;
    } else {
      // No auto-inhibition: nonlinear PK only
      if (isSaturable && enzymeMult > 1.5) {
        isNonlinear = true;
        const nlExponent = enzymeMult > 3 ? 1.5 : 1.3;
        const linearFold = route.fraction * enzymeMult + (1 - route.fraction);
        let nlFold = Math.pow(linearFold, nlExponent);
        if (clinNullFold && nlFold > clinNullFold) nlFold = clinNullFold;
        if (route.fraction > 0) {
          enzymeMult = (nlFold - (1 - route.fraction)) / route.fraction;
        }
        routeDetails.push({ perpetrator: "Nonlinear PK", enzyme: route.enzyme, type: "nonlinear",
          strength: "saturable", mult: nlExponent, note: "Michaelis-Menten amplification" });
      }
    }

    // DDI: external drug inhibitions/inductions
    for (const otherName of activeStack) {
      if (otherName === drugName) continue;
      const other = getDrug(otherName);
      if (!other) continue;

      const allInh = getAllInhibitions(other);

      for (const inh of allInh) {
        if (inh.target === route.enzyme) {
          let mult = INH_MULT[inh.strength] || 1;

          // Dose-dependent inhibition
          if (inh.doseDependent) {
            mult *= getDoseModifier(otherName);
          }
          // Mechanism-based inhibition
          if (inh.mechanism === "mechanism_based" || inh.timeDependent) {
            mult *= 1.3;
          }

          let combinedMult;
          if (genePheno === "null") {
            // Null genotype: enzyme already gone, inhibitor adds nothing
            combinedMult = geneticMult;
          } else {
            // Combine genetics + DDI multiplicatively
            combinedMult = geneticMult * mult;
            // Apply auto-inhibition on top if present (ONLY for generic model)
            // For clinical auto-inhibitors, auto-inhibition is baseline — no stacking needed
            if (selfInh && selfInh.mechanism === "mechanism_based" && !clinNullFold) {
              const selfDM = selfInh.doseDependent ? getDoseModifier(drugName) : 1.0;
              combinedMult *= (INH_MULT[selfInh.strength] || 1) * selfDM * 0.5; // reduced weight when stacking
            }
            // Cap by clinical null fold (skip if negative — prodrug clinical folds
            // represent active metabolite efficacy, not parent drug AUC)
            if (clinNullMult && clinNullMult > 0 && combinedMult > clinNullMult) {
              combinedMult = clinNullMult;
            }
          }

          // Nonlinear amplification on DDI
          if (isSaturable && combinedMult > 1.5) {
            const linearFold = route.fraction * combinedMult + (1 - route.fraction);
            const nlExp = combinedMult > 3 ? 1.5 : 1.3;
            let nlFold = Math.pow(linearFold, nlExp);
            if (clinNullFold && nlFold > clinNullFold) nlFold = clinNullFold;
            if (route.fraction > 0) {
              combinedMult = (nlFold - (1 - route.fraction)) / route.fraction;
            }
          }

          if (combinedMult > enzymeMult) {
            enzymeMult = combinedMult;
            if (genePheno === "null") {
              routeDetails = [{ perpetrator: "Genetics", enzyme: route.enzyme, type: "genetic", strength: genePheno, mult: geneticMult }];
            } else {
              const inhDetail = { perpetrator: otherName, enzyme: route.enzyme, type: "inhibits", strength: inh.strength, mult: combinedMult };
              if (inh.mechanism === "mechanism_based") inhDetail.mechanism = "mechanism_based";
              if (inh.timeDependent) inhDetail.timeDependent = true;
              if (inh.doseDependent) inhDetail.doseDependent = true;
              routeDetails = [inhDetail];
              if (geneticMult > 1) {
                routeDetails.push({ perpetrator: "Genetics", enzyme: route.enzyme, type: "genetic", strength: genePheno, mult: geneticMult });
              }
              if (selfInhibitions[route.enzyme]) {
                routeDetails.push({ perpetrator: drugName + " (self)", enzyme: route.enzyme, type: "auto-inhibition",
                  strength: selfInhibitions[route.enzyme].strength, mult: INH_MULT[selfInhibitions[route.enzyme].strength] || 1 });
              }
            }
          }
        }
      }
      // Check induction
      for (const ind of other.ind) {
        if (ind.target === route.enzyme) {
          if (genePheno === "null") continue;
          const mult = IND_MULT[ind.strength] || 1;
          const combinedMult = geneticMult > 1 ? mult : mult / geneticMult;
          if (combinedMult < enzymeMult) {
            enzymeMult = combinedMult;
            routeDetails = [{ perpetrator: otherName, enzyme: route.enzyme, type: "induces", strength: ind.strength, mult: combinedMult }];
          }
        }
      }
    }

    // Final clinical fold ceiling enforcement
    // For auto-inhibiting drugs using the clinical model, dose scaling can legitimately
    // push fold above the genetic null fold (nonlinear PK at high doses).
    // Only apply ceiling for non-auto-inhibitor pathways (DDI/genetics only).
    if (clinNullMult && clinNullMult > 0 && enzymeMult > clinNullMult && !(selfInh && clinNullFold)) {
      enzymeMult = clinNullMult;
    }

    routeResults.push({ enzyme: route.enzyme, fraction: route.fraction, enzymeMult, details: routeDetails });
  }

  // ═══ DYNAMIC ROUTE FRACTIONS ═══
  // When an enzyme is inhibited, its metabolic capacity drops and other routes
  // compensate by absorbing proportionally more of the drug load.
  // This recalculates effective fractions based on remaining enzyme activity.
  //
  // Model: effective_fraction_i = nominal_fraction_i × capacity_i / Σ(nominal_fraction_j × capacity_j)
  // where capacity = 1/enzymeMult (higher mult = more inhibition = less capacity)
  // Then fold = Σ(effective_fraction_i × enzymeMult_i) + remaining_fraction

  const hasInhibition = routeResults.some(r => r.enzymeMult > 1.3);
  const hasInduction = routeResults.some(r => r.enzymeMult < 0.8);

  let fold;
  if ((hasInhibition || hasInduction) && routeResults.length >= 2) {
    // Dynamic fractions: redistribute load based on remaining capacity
    // Capacity of each route is inversely proportional to its enzymeMult
    // (inhibited enzyme → less capacity → drug reroutes to other pathways)
    const capacities = routeResults.map(r => ({
      enzyme: r.enzyme,
      nomFrac: r.fraction,
      capacity: Math.max(0.01, 1 / r.enzymeMult), // inverse of inhibition fold
      enzymeMult: r.enzymeMult,
      details: r.details
    }));
    const totalWeightedCap = capacities.reduce((s, c) => s + c.nomFrac * c.capacity, 0);
    const remainFrac = 1 - routeResults.reduce((s, r) => s + r.fraction, 0);

    let totalFold = 0;
    for (const c of capacities) {
      // Effective fraction after redistribution
      const effFrac = totalWeightedCap > 0
        ? (c.nomFrac * c.capacity / totalWeightedCap) * (1 - remainFrac)
        : c.nomFrac;
      totalFold += effFrac * c.enzymeMult;
    }
    totalFold += remainFrac;
    fold = Math.round(totalFold * 100) / 100;

    // Collect details from all routes
    for (const r of routeResults) {
      if (r.details.length) details.push(...r.details);
    }
  } else {
    // Simple linear model — no redistribution needed
    let totalFold_simple = 0;
    let totalFrac_simple = 0;
    for (const r of routeResults) {
      totalFold_simple += r.fraction * r.enzymeMult;
      totalFrac_simple += r.fraction;
      if (r.details.length) details.push(...r.details);
    }
    const remainFrac = 1 - totalFrac_simple;
    fold = Math.round((totalFold_simple + remainFrac) * 100) / 100;
  }

  return { fold, details, prodrug: drug.prodrug || 0, nonlinear: isNonlinear, autoInhibited: isAutoInhibited };
}

function computeGutExtraction(drugName) {
  const drug = DRUG_DB.find(d => d.name.toLowerCase() === drugName.toLowerCase());
  if (!drug) return null;
  // Estimate CYP3A4 gut-wall extraction from route data
  const cyp3a4Route = (drug.routes||[]).find(r => r.enzyme === 'CYP3A4');
  const pgpTransporter = (drug.routes||[]).find(r => r.enzyme === 'P-gp' || r.enzyme === 'ABCB1');
  const Emetab = cyp3a4Route ? Math.min(cyp3a4Route.fraction * 0.5, 0.9) : 0;
  const Etransporter = pgpTransporter ? Math.min(pgpTransporter.fraction * 0.3, 0.7) : 0;
  const Fg = (1 - Emetab) * (1 - Etransporter);
  // Check if inhibitors are active
  const activeInhibitors = activeStack.filter(n => n !== drugName);
  const cyp3a4Inhib = activeInhibitors.filter(n => {
    const d = DRUG_DB.find(dd => dd.name === n);
    return d?.inh?.some(i => i.target === 'CYP3A4');
  });
  const pgpInhib = activeInhibitors.filter(n => {
    const d = DRUG_DB.find(dd => dd.name === n);
    return d?.inh?.some(i => i.target === 'P-gp' || i.target === 'ABCB1');
  });
  return {
    Emetab: Math.round(Emetab * 100),
    Etransporter: Math.round(Etransporter * 100),
    Fg: Math.round(Fg * 100) / 100,
    cyp3a4Inhibitors: cyp3a4Inhib,
    pgpInhibitors: pgpInhib,
    note: `Gut-wall: CYP3A4 extraction ${Math.round(Emetab*100)}%, P-gp efflux ${Math.round(Etransporter*100)}%, net Fg=${Math.round(Fg*100)}%`
  };
}

// ═══════════════════════════════════════════════════════════════════
// POPULATION VARIABILITY (#8)
// Inter-individual CV% → SD bands on fold-change estimates
// ═══════════════════════════════════════════════════════════════════

// CV_ESTIMATES — coefficient of variation for key enzyme fold-changes
// Sources: clinical PK DDI literature; typical inter-individual variability
function foldChangeBands(centralFold, enzyme) {
  const cv = CV_ESTIMATES[enzyme] || CV_ESTIMATES.DEFAULT;
  const logMid = Math.log(centralFold);
  const logSD = cv; // log-normal approximation: SD ≈ CV in log space
  return {
    low:  Math.exp(logMid - logSD),
    mid:  centralFold,
    high: Math.exp(logMid + logSD),
    cv_pct: Math.round(cv * 100),
  };
}

// ═══════════════════════════════════════════════════════════════════
// PHASE B — DETERMINISTIC ENZYME CAPACITY MODEL
//
// enzymeCapacity = baseline × genotypeFactor × inhibitorReduction
//                           × inducerIncrease × competitiveSubstrateBurden
//
// Returns global enzyme state for the FULL active stack, not just a
// per-substrate fold-change. Used by findInteractions() and the
// Enzyme Burden UI to explain WHY an interaction is severe.
//
// Model conventions:
//   capacity_pct = 100  → NM with no DDI (reference)
//   capacity_pct < 20   → severely impaired; all substrates at high risk
//   capacity_pct > 300  → strongly induced; substrates may lose efficacy
//
// Multiplicative rule (log-additive physiology):
//   capacity = 100 × genotypeFactor
//                  × Π_inhibitors(1 / INH_MULT[strength] × MBI_factor)
//                  × Π_inducers(1 / IND_MULT[strength])
//
// Competitive substrate burden adds a per-substrate occupancy penalty
// when multiple high-fraction substrates compete for the same enzyme.
// ═══════════════════════════════════════════════════════════════════

const ENZYME_SUBSTRATES_CACHE = {};  // populated lazily by computeEnzymeCapacity

/**
 * computeEnzymeCapacity(enzyme, stack)
 *
 * Returns an object describing the current functional capacity of one enzyme
 * across all drugs in the active stack.
 *
 * @param {string} enzyme   — e.g. 'CYP2D6', 'CYP3A4', 'P-gp'
 * @param {string[]} stack  — array of drug names (defaults to activeStack)
 * @returns {EnzymeCapacity}
 *
 * EnzymeCapacity {
 *   enzyme           : string
 *   capacity_pct     : number   — 0..∞, 100=normal, <20=critical
 *   genotype_factor  : number   — contribution from PM/IM/NM/UM
 *   genotype_phenotype: string  — 'NM' / 'IM' / 'PM' / 'UM'
 *   inhibitors       : InhibitorRecord[]
 *   inducers         : InducerRecord[]
 *   substrate_burden : number   — 0..1, competitive occupancy factor
 *   affected_substrates: string[]
 *   limiting_factor  : string   — human-readable summary
 *   clinical_note    : string   — actionable guidance
 *   confidence       : 'high'|'moderate'|'low'
 * }
 */
function computeEnzymeCapacity(enzyme, stack) {
  const drugList = stack || activeStack;

  // ── 1. Genotype factor ──────────────────────────────────────────
  // Use the new GENOTYPE_EFFECTS if available; fall back to legacy userGenetics
  let genotypeFactor = 1.0;
  let genotypePhenotype = 'NM';
  let genotypeNote = '';

  // New genotype system (Phase 5+)
  if (activeGenotype && activeGenotype[enzyme]) {
    const pheno = activeGenotype[enzyme]; // e.g. 'poor_metabolizer'
    const effects = GENOTYPE_EFFECTS[enzyme] && GENOTYPE_EFFECTS[enzyme][pheno];
    if (effects) {
      // genotypeFactor = 1/auc_fold (higher AUC = lower enzyme capacity)
      genotypeFactor = effects.auc_fold > 0 ? 1 / effects.auc_fold : 0.05;
      genotypePhenotype = Object.keys(GENOTYPE_PHENOTYPE).find(k => GENOTYPE_PHENOTYPE[k] === pheno) || pheno;
      genotypeNote = effects.note || '';
    }
  } else if (userGenetics[enzyme]) {
    // Legacy system
    const legacyMult = getPhenotypeMult(enzyme);
    genotypeFactor = legacyMult > 0 ? 1 / legacyMult : 0.05;
    genotypePhenotype = userGenetics[enzyme];
  }

  // ── 2. Inhibitor reductions ─────────────────────────────────────
  const inhibitorRecords = [];
  let inhibitorProduct = 1.0;  // cumulative reduction (multiply together)

  for (const drugName of drugList) {
    const drug = getDrug(drugName);
    if (!drug) continue;
    const allInh = getAllInhibitions(drug);
    for (const inh of allInh) {
      if (inh.target !== enzyme) continue;
      const baseMult = INH_MULT[inh.strength] || 1;
      // MBI adds irreversible component → amplify by 1.3
      const mbiFactor = (inh.mechanism === 'mechanism_based' || inh.timeDependent) ? 1.3 : 1.0;
      // Dose-dependent inhibition
      const doseFactor = inh.doseDependent ? getDoseModifier(drugName) : 1.0;
      const effectiveMult = baseMult * mbiFactor * doseFactor;
      const reductionFactor = 1 / effectiveMult;  // 1 = no reduction, 0.2 = 80% reduced
      inhibitorProduct *= reductionFactor;
      inhibitorRecords.push({
        drug: drugName,
        strength: inh.strength,
        mechanism: inh.mechanism || 'competitive',
        mbi: mbiFactor > 1,
        dose_dependent: !!inh.doseDependent,
        effective_mult: Math.round(effectiveMult * 100) / 100,
        reduction_pct: Math.round((1 - reductionFactor) * 100),
      });
    }
  }

  // ── 3. Inducer effects ──────────────────────────────────────────
  const inducerRecords = [];
  let inducerProduct = 1.0;  // cumulative induction (>1 = capacity increased)

  for (const drugName of drugList) {
    const drug = getDrug(drugName);
    if (!drug) continue;
    for (const ind of (drug.ind || [])) {
      if (ind.target !== enzyme) continue;
      const indMult = IND_MULT[ind.strength] || 1;  // <1 = substrate AUC decreases
      // Capacity increases when AUC decreases: capacity_factor = 1/indMult
      const capacityIncrease = 1 / indMult;
      inducerProduct *= capacityIncrease;
      inducerRecords.push({
        drug: drugName,
        strength: ind.strength,
        auc_fold_on_substrate: Math.round(indMult * 100) / 100,
        capacity_increase_factor: Math.round(capacityIncrease * 100) / 100,
        induction_pct: Math.round((capacityIncrease - 1) * 100),
      });
    }
  }

  // If both inhibited and induced: net capacity can cancel (rifampin + ketoconazole)
  // Real pharmacology is complex; we use simple product as first approximation
  // Minimum from genotype: null enzyme cannot be induced (already absent)
  let rawCapacity = genotypeFactor * inhibitorProduct * inducerProduct;
  if (genotypeFactor < 0.05 && inducerProduct > 1) {
    // Cannot induce a null enzyme
    rawCapacity = genotypeFactor * inhibitorProduct;
  }

  // ── 4. Competitive substrate burden ────────────────────────────
  // When multiple high-fraction substrates compete, each experiences
  // a proportional occupancy cost. Model: burden = 1 - Σ(fractions)/2
  // (conservative: assume partial competition, not perfect displacement)
  const affectedSubstrates = [];
  let totalCompetingFraction = 0;
  for (const drugName of drugList) {
    const drug = getDrug(drugName);
    if (!drug) continue;
    const route = (drug.routes || []).find(r => r.enzyme === enzyme);
    if (route && route.fraction > 0.2) {  // only significant substrates
      affectedSubstrates.push(drugName);
      totalCompetingFraction += route.fraction;
    }
  }
  // Burden penalty: each extra high-fraction substrate adds ~10% occupancy cost
  const substrateBurden = affectedSubstrates.length > 1
    ? Math.min(0.5, (affectedSubstrates.length - 1) * 0.10)
    : 0;
  const finalCapacity = rawCapacity * (1 - substrateBurden);

  // ── 5. Capacity percentage and classification ───────────────────
  const capacity_pct = Math.round(Math.max(1, Math.min(1000, finalCapacity * 100)));

  // ── 6. Limiting factor and clinical note ───────────────────────
  const limitParts = [];
  if (genotypeFactor < 0.8) {
    limitParts.push(`${genotypePhenotype} (${Math.round(genotypeFactor*100)}% of NM)`);
  }
  for (const inh of inhibitorRecords) {
    const label = inh.mbi ? `${inh.drug} (${inh.strength} MBI)` : `${inh.drug} (${inh.strength} inhibitor)`;
    limitParts.push(label);
  }
  for (const ind of inducerRecords) {
    limitParts.push(`${ind.drug} (${ind.strength} inducer, +${ind.induction_pct}%)`);
  }
  if (substrateBurden > 0) {
    limitParts.push(`substrate competition (${affectedSubstrates.length} drugs)`);
  }

  const limiting_factor = limitParts.length > 0
    ? limitParts.join(' + ')
    : 'No significant impairment';

  // Clinical note based on severity
  let clinical_note = '';
  if (capacity_pct <= 10) {
    clinical_note = `${enzyme} near-zero functional activity. All substrates at extreme exposure risk. Avoid new ${enzyme} substrates. Consider therapeutic drug monitoring.`;
  } else if (capacity_pct <= 25) {
    clinical_note = `${enzyme} severely impaired (<25% normal). Substrates at 3–10× AUC increase. Dose reductions required for all significant ${enzyme} substrates.`;
  } else if (capacity_pct <= 50) {
    clinical_note = `${enzyme} moderately impaired (<50% normal). Substrates at 2–4× AUC increase. Monitor for adverse effects.`;
  } else if (capacity_pct <= 75) {
    clinical_note = `${enzyme} mildly impaired. Minor substrate AUC increases expected.`;
  } else if (capacity_pct >= 300) {
    clinical_note = `${enzyme} strongly induced. Substrates may have insufficient exposure — consider dose adjustment or switch.`;
  } else if (capacity_pct >= 200) {
    clinical_note = `${enzyme} moderately induced. Substrates may need higher doses.`;
  }

  // Confidence: high if we have clinical genotype + strong evidence inhibitors
  const hasHiFiGenotype = !!(activeGenotype && activeGenotype[enzyme]);
  const hasStrongInh = inhibitorRecords.some(i => i.strength === 'strong');
  const confidence = hasHiFiGenotype && (hasStrongInh || inhibitorRecords.length === 0)
    ? 'high' : inhibitorRecords.length > 0 ? 'moderate' : 'low';

  return {
    enzyme,
    capacity_pct,
    genotype_factor: Math.round(genotypeFactor * 1000) / 1000,
    genotype_phenotype: genotypePhenotype,
    genotype_note: genotypeNote,
    inhibitors: inhibitorRecords,
    inducers: inducerRecords,
    substrate_burden: Math.round(substrateBurden * 100) / 100,
    affected_substrates: affectedSubstrates,
    limiting_factor,
    clinical_note,
    confidence,
  };
}

/**
 * computeAllEnzymeCapacities(stack)
 *
 * Computes enzyme capacity for every enzyme relevant to the current stack.
 * Returns an array of EnzymeCapacity objects sorted by severity (lowest first).
 */
function computeAllEnzymeCapacities(stack) {
  const drugList = stack || activeStack;

  // Collect all enzymes touched by any drug in the stack
  const enzymesInvolved = new Set();
  for (const drugName of drugList) {
    const drug = getDrug(drugName);
    if (!drug) continue;
    for (const r of (drug.routes || [])) enzymesInvolved.add(r.enzyme);
    for (const i of (drug.inh || [])) enzymesInvolved.add(i.target);
    for (const i of (drug.ind || [])) enzymesInvolved.add(i.target);
    const allInh = getAllInhibitions(drug);
    for (const i of allInh) enzymesInvolved.add(i.target);
  }
  // Also include any actively-set genotype enzymes
  if (activeGenotype) {
    for (const e of Object.keys(activeGenotype)) enzymesInvolved.add(e);
  }

  const results = [];
  for (const enzyme of enzymesInvolved) {
    const cap = computeEnzymeCapacity(enzyme, drugList);
    // Only include enzymes with meaningful effects
    if (cap.capacity_pct < 80 || cap.capacity_pct > 130 || cap.inhibitors.length > 0 || cap.inducers.length > 0) {
      results.push(cap);
    }
  }

  // Sort by severity: near-zero capacity first, then induced, then mildly impaired
  results.sort((a, b) => {
    const sevA = a.capacity_pct < 50 ? a.capacity_pct : (a.capacity_pct > 200 ? 1000 - a.capacity_pct : a.capacity_pct);
    const sevB = b.capacity_pct < 50 ? b.capacity_pct : (b.capacity_pct > 200 ? 1000 - b.capacity_pct : b.capacity_pct);
    return sevA - sevB;
  });

  return results;
}

function legacyPhenotypeToGenotype(phenotype) {
  if (!phenotype || phenotype === "normal") return GENOTYPE_PHENOTYPE.NM;
  if (phenotype === "null" || phenotype === "poor") return GENOTYPE_PHENOTYPE.PM;
  if (phenotype === "intermediate") return GENOTYPE_PHENOTYPE.IM;
  if (phenotype === "ultrarapid" || phenotype === "rapid") return GENOTYPE_PHENOTYPE.UM;
  return phenotype;
}

function selectedPhenotypeForEnzyme(enzyme) {
  return activeGenotype?.[enzyme] || GENOTYPE_PHENOTYPE.NM;
}

function phenotypeExposureFold(enzyme, phenotype) {
  const normalized = legacyPhenotypeToGenotype(phenotype);
  return GENOTYPE_EFFECTS?.[enzyme]?.[normalized]?.auc_fold || 1.0;
}

function metaboliteActorForParent(parentName) {
  const graph = getInteractionGraph();
  const parentId = getDrugGraphId(parentName);
  return (graph.edges || [])
    .filter(e => e.from === parentId && e.type === EDGE_TYPE.METABOLIZED_TO)
    .map(e => graph.actors[e.to])
    .filter(actor => actor && actor.type === ACTOR_TYPE.METABOLITE && actor.active);
}

function computeActorExposureDeltas(stack) {
  const drugList = stack || activeStack;
  const rows = [];
  const seen = new Set();

  for (const name of drugList) {
    const parentFold = calcFold(name);
    rows.push({
      id:getDrugGraphId(name), parent:name, name, type:"parent",
      fold:parentFold.fold, direction:parentFold.fold > 1.15 ? "increase" : parentFold.fold < 0.85 ? "decrease" : "baseline",
      confidence:"modeled", driver:parentFold.details[0] ? `${parentFold.details[0].enzyme} ${parentFold.details[0].strength}` : "current stack",
    });

    for (const actor of metaboliteActorForParent(name)) {
      if (seen.has(actor.id)) continue;
      seen.add(actor.id);

      let best = null;
      for (const effect of GENOTYPE_METABOLITE_EFFECTS || []) {
        if (effect.parent !== name || effect.metaboliteId !== actor.id) continue;
        const pheno = selectedPhenotypeForEnzyme(effect.enzyme);
        const pe = effect.effects?.[pheno];
        if (!pe || pe.direction === "baseline" || pe.direction === "uncertain") continue;
        best = {
          id:actor.id, parent:name, name:actor.name, type:"metabolite",
          fold:pe.fold || null, direction:pe.direction,
          qualitative:pe.qualitative || !pe.fold,
          confidence:pe.estimated ? "estimated" : "evidence",
          driver:`${effect.enzyme} ${pheno.replace(/_metabolizer/g,"").replace(/_/g," ")}`,
          note:pe.label,
        };
      }

      if (!best) {
        const clearanceRoute = (actor.routes || []).find(r => {
          const fold = phenotypeExposureFold(r.enzyme, selectedPhenotypeForEnzyme(r.enzyme));
          return fold !== 1;
        });
        if (clearanceRoute) {
          const pheno = selectedPhenotypeForEnzyme(clearanceRoute.enzyme);
          const fold = phenotypeExposureFold(clearanceRoute.enzyme, pheno);
          const low = clearanceRoute.evidence?.confidence === "low";
          best = {
            id:actor.id, parent:name, name:actor.name, type:"metabolite",
            fold:low ? null : fold, direction:fold > 1 ? "increase" : "decrease",
            qualitative:low, confidence:low ? "low" : "modeled",
            driver:`${clearanceRoute.enzyme} ${pheno.replace(/_metabolizer/g,"").replace(/_/g," ")}`,
            note:low ? "directional low-confidence clearance context" : "clearance route",
          };
        }
      }

      if (!best && actor.formingEnzyme) {
        const pheno = selectedPhenotypeForEnzyme(actor.formingEnzyme);
        const formationFold = phenotypeExposureFold(actor.formingEnzyme, pheno);
        if (formationFold !== 1) {
          best = {
            id:actor.id, parent:name, name:actor.name, type:"metabolite",
            fold:1 / formationFold, direction:formationFold > 1 ? "decrease" : "increase",
            confidence:"modeled",
            driver:`${actor.formingEnzyme} formation`,
            note:"formation changes opposite to parent exposure",
          };
        }
      }

      if (best) rows.push(best);
    }
  }

  return rows.sort((a, b) => {
    const mag = row => row.fold ? Math.abs(Math.log(row.fold)) : (row.direction === "baseline" ? 0 : 0.2);
    return mag(b) - mag(a);
  });
}

function traverseFromGenotype(enzyme, phenotype, opts) {
  const graph = getInteractionGraph();
  const pheno = legacyPhenotypeToGenotype(phenotype || selectedPhenotypeForEnzyme(enzyme));
  const aucFold = phenotypeExposureFold(enzyme, pheno);
  const maxDepth = opts?.maxDepth || 3;
  const rows = [];
  const seen = new Set();

  const candidateEdges = (graph.edges || []).filter(e =>
    e.to === enzyme &&
    (e.type === EDGE_TYPE.SUBSTRATE_OF || e.type === EDGE_TYPE.METABOLIZED_TO)
  );

  for (const edge of candidateEdges) {
    const actor = graph.actors[edge.from];
    if (!actor || ![ACTOR_TYPE.DRUG, ACTOR_TYPE.METABOLITE, ACTOR_TYPE.FOOD].includes(actor.type)) continue;
    const role = edge.props?.role || "clearance";
    const isFormationContext = role === "formation_context";
    const low = edge.props?.evidence?.confidence === "low";
    const fold = isFormationContext ? (aucFold ? 1 / aucFold : 1) : aucFold;
    const direction = fold > 1.05 ? "increase" : fold < 0.95 ? "decrease" : "baseline";
    const key = `${actor.id}|${role}|${direction}`;
    if (seen.has(key) || direction === "baseline") continue;
    seen.add(key);

    rows.push({
      actorId:actor.id,
      name:actor.name,
      parentDrug:actor.parentDrug || null,
      type:actor.type,
      enzyme,
      phenotype:pheno,
      direction,
      fold:low ? null : Math.round(fold * 100) / 100,
      confidence:low ? "low" : (edge.props?.evidence?.confidence || "modeled"),
      evidenceRefs:edge.props?.evidenceRefs || [],
      chain:`${enzyme} ${pheno.replace(/_metabolizer/g,"").replace(/_/g," ")} → ${role.replace(/_/g," ")} → ${actor.name}`,
    });

    if (actor.type === ACTOR_TYPE.DRUG && maxDepth > 1) {
      const metaboliteEdges = (graph.edges || []).filter(e =>
        e.from === actor.id && e.type === EDGE_TYPE.METABOLIZED_TO
      );
      for (const me of metaboliteEdges) {
        const met = graph.actors[me.to];
        if (!met || !met.active) continue;
        rows.push({
          actorId:met.id,
          name:met.name,
          parentDrug:actor.name,
          type:met.type,
          enzyme,
          phenotype:pheno,
          direction:isFormationContext ? direction : "context",
          fold:null,
          confidence:"chain",
          evidenceRefs:me.props?.evidenceRefs || met.evidenceRefs || [],
          chain:`${enzyme} ${pheno.replace(/_metabolizer/g,"").replace(/_/g," ")} → ${actor.name} → ${met.name}`,
        });
      }
    }
  }

  return rows.sort((a, b) => {
    const score = r => (r.fold ? Math.abs(Math.log(r.fold)) : 0.25) * (r.confidence === "low" ? 0.5 : 1);
    return score(b) - score(a);
  });
}

// ═══════════════════════════════════════════════════════════════════
// EVIDENCE UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

// getStudy(id) — returns a STUDY_DB entry or null
