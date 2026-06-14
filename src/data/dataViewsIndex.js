// MedCheck Engine data views derived index
// Builds a single static-browser index for alternate data navigation pages.

(function buildDataViewsIndex(global) {
  const rawNorm = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  const normalizeLookup = typeof normalizeDrugLookupKey === "function" ? normalizeDrugLookupKey : global.normalizeDrugLookupKey;
  const getDrugLookup = typeof getDrug === "function" ? getDrug : global.getDrug;
  const getDrugAliasesLookup = typeof getDrugAliases === "function" ? getDrugAliases : global.getDrugAliases;
  const genotypePhenotype = typeof GENOTYPE_PHENOTYPE !== "undefined" ? GENOTYPE_PHENOTYPE : global.GENOTYPE_PHENOTYPE;
  const geneSemanticsSource = typeof GENE_SEMANTICS !== "undefined" ? GENE_SEMANTICS : global.GENE_SEMANTICS;
  const transporterActors = typeof TRANSPORTER_ACTORS !== "undefined" ? TRANSPORTER_ACTORS : global.TRANSPORTER_ACTORS;
  const lookupKey = (value) => typeof normalizeLookup === "function"
    ? normalizeLookup(value)
    : String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const sentence = (value) => String(value || "").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  const stripParenthetical = (value) => String(value || "").replace(/\s*\([^)]*\)/g, "").trim();
  const asArray = (value) => Array.isArray(value) ? value : [];
  const upper = (value) => String(value || "").trim().toUpperCase();
  const safeId = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const uniq = (values) => [...new Set(values.filter(Boolean))];

  const drugs = asArray(typeof DRUG_DB !== "undefined" ? DRUG_DB : global.DRUG_DB);
  const metabSource = typeof METAB !== "undefined" ? METAB : global.METAB;
  const pgxSource = typeof PHARMGKB_EVIDENCE !== "undefined" ? PHARMGKB_EVIDENCE : global.PHARMGKB_EVIDENCE;
  const genotypeEffectsSource = typeof GENOTYPE_EFFECTS !== "undefined" ? GENOTYPE_EFFECTS : global.GENOTYPE_EFFECTS;
  const genotypeRiskEffectsSource = typeof GENOTYPE_RISK_EFFECTS !== "undefined" ? GENOTYPE_RISK_EFFECTS : global.GENOTYPE_RISK_EFFECTS;
  const pathwayDiversionSource = typeof PATHWAY_DIVERSION !== "undefined" ? PATHWAY_DIVERSION : global.PATHWAY_DIVERSION;
  const metab = metabSource && typeof metabSource === "object" ? metabSource : {};
  const pgx = pgxSource && typeof pgxSource === "object" ? pgxSource : {};
  const genotypeEffects = genotypeEffectsSource && typeof genotypeEffectsSource === "object" ? genotypeEffectsSource : {};
  const genotypeRiskEffects = genotypeRiskEffectsSource && typeof genotypeRiskEffectsSource === "object" ? genotypeRiskEffectsSource : {};
  const geneSemantics = geneSemanticsSource && typeof geneSemanticsSource === "object" ? geneSemanticsSource : {};
  const knownDdi = asArray(typeof KNOWN_DDI !== "undefined" ? KNOWN_DDI : global.KNOWN_DDI);
  const transporterDdi = asArray(typeof TRANSPORTER_DDI !== "undefined" ? TRANSPORTER_DDI : global.TRANSPORTER_DDI);
  const genotypeMetaboliteEffects = asArray(typeof GENOTYPE_METABOLITE_EFFECTS !== "undefined" ? GENOTYPE_METABOLITE_EFFECTS : global.GENOTYPE_METABOLITE_EFFECTS);
  const highImpactMetaboliteRelations = asArray(typeof HIGH_IMPACT_METABOLITE_RELATIONS !== "undefined" ? HIGH_IMPACT_METABOLITE_RELATIONS : global.HIGH_IMPACT_METABOLITE_RELATIONS);
  const pathwayDiversion = pathwayDiversionSource && typeof pathwayDiversionSource === "object" ? pathwayDiversionSource : {};

  const actorMaps = [
    typeof FOOD_ACTORS !== "undefined" ? FOOD_ACTORS : global.FOOD_ACTORS,
    typeof ENDOGENOUS_ACTORS !== "undefined" ? ENDOGENOUS_ACTORS : global.ENDOGENOUS_ACTORS,
    transporterActors,
    typeof METABOLITE_ACTORS !== "undefined" ? METABOLITE_ACTORS : global.METABOLITE_ACTORS,
    typeof RECEPTOR_ACTORS !== "undefined" ? RECEPTOR_ACTORS : global.RECEPTOR_ACTORS,
    typeof PHENOTYPE_ACTORS !== "undefined" ? PHENOTYPE_ACTORS : global.PHENOTYPE_ACTORS,
    typeof ENZYME_ACTORS !== "undefined" ? ENZYME_ACTORS : global.ENZYME_ACTORS,
  ].filter((map) => map && typeof map === "object");

  const entities = [];
  const entityByKey = new Map();
  const drugByKey = new Map();
  const concepts = new Set(["NSAIDs", "Estradiol / endogenous estrogens", "CYP3A oncology substrates"]);

  function addEntity(entity, aliases = []) {
    if (!entity || !entity.name) return entity;
    const id = entity.id || safeId(`${entity.kind}-${entity.name}`);
    const full = {
      id,
      name: entity.name,
      kind: entity.kind || "external",
      class: entity.class || sentence(entity.kind || "external"),
      linkable: Boolean(entity.linkable),
      record: entity.record || null,
    };
    const existing = entityByKey.get(lookupKey(full.name));
    const stored = existing || full;
    if (!existing) entities.push(stored);
    for (const alias of uniq([full.name, id, stripParenthetical(full.name), ...aliases])) {
      if (!alias) continue;
      entityByKey.set(lookupKey(alias), stored);
      entityByKey.set(rawNorm(alias), stored);
    }
    return stored;
  }

  for (const drug of drugs) {
    const aliases = [
      drug.id,
      ...(drug.brandNames || []),
      ...(typeof getDrugAliasesLookup === "function" ? getDrugAliasesLookup(drug) : []),
    ];
    const entity = addEntity({ id:drug.id, name:drug.name, kind:"drug", class:drug.cls || "Substance", linkable:true, record:drug }, aliases);
    for (const alias of uniq([drug.name, drug.id, ...aliases])) {
      drugByKey.set(lookupKey(alias), drug);
      drugByKey.set(rawNorm(alias), drug);
    }
  }

  for (const [parent, entries] of Object.entries(metab)) {
    for (const item of entries || []) {
      addEntity({
        id:`metabolite-${safeId(item.n)}`,
        name:item.n,
        kind:"metabolite",
        class:`Metabolite${item.a ? ` / ${sentence(item.a)}` : ""}`,
        linkable:false,
        record:{ ...item, parent },
      }, [stripParenthetical(item.n)]);
    }
  }

  for (const map of actorMaps) {
    for (const actor of Object.values(map)) {
      addEntity({
        id:actor.id || safeId(actor.name),
        name:actor.name || actor.id,
        kind:actor.type || "actor",
        class:sentence(actor.type || "actor"),
        linkable:false,
        record:actor,
      }, [actor.id]);
      for (const name of actor.substrates || []) addEntity({ name, kind:"external", class:"External substance", linkable:false }, [stripParenthetical(name)]);
      for (const item of actor.inhibitors || []) addEntity({ name:item.name, kind:"external", class:"External substance", linkable:false }, [stripParenthetical(item.name)]);
      for (const item of actor.inducers || []) addEntity({ name:item.name, kind:"external", class:"External substance", linkable:false }, [stripParenthetical(item.name)]);
    }
  }

  for (const concept of concepts) addEntity({ name:concept, kind:"concept", class:"Concept", linkable:false });

  function riskGeneFromKey(riskKey) {
    const key = String(riskKey || "");
    if (/^HLA-[AB]/.test(key)) return key.match(/^HLA-[AB]/)[0];
    if (/^G6PD\b/i.test(key)) return "G6PD";
    if (/^MT-RNR1\b/i.test(key)) return "MT-RNR1";
    if (/^MTHFR\b/i.test(key)) return "MTHFR";
    if (/^GABRG2\b/i.test(key)) return "GABRG2";
    if (/^SCN1A\b/i.test(key)) return "SCN1A";
    if (/^SCN2A\b/i.test(key)) return "SCN2A";
    if (/^KCNH2\b/i.test(key)) return "KCNH2";
    if (/^RYR1\/CACNA1S\b/i.test(key)) return "RYR1";
    return key.split(/[:/_\s]/)[0];
  }

  function addGeneEntity(gene) {
    const value = upper(gene);
    if (!value) return;
    addEntity({ id:`gene-${safeId(value)}`, name:value, kind:"gene", class:"Gene", linkable:false }, [gene]);
  }

  for (const drug of drugs) {
    for (const route of drug.routes || []) addGeneEntity(route.enzyme);
    for (const item of drug.inh || []) addGeneEntity(item.target);
    for (const item of drug.ind || []) addGeneEntity(item.target);
  }
  for (const entries of Object.values(metab)) {
    for (const item of entries || []) addGeneEntity(item.e);
  }
  for (const gene of Object.keys(genotypeEffects)) addGeneEntity(gene);
  for (const riskKey of Object.keys(genotypeRiskEffects)) addGeneEntity(riskGeneFromKey(riskKey));
  for (const item of genotypeMetaboliteEffects) addGeneEntity(item.enzyme);
  for (const item of highImpactMetaboliteRelations) addGeneEntity(item.gene || item.enzyme);
  for (const item of Object.values(pathwayDiversion)) {
    for (const path of [item.primary, ...(item.diverted || [])].filter(Boolean)) addGeneEntity(path.enzyme);
  }
  for (const gene of Object.keys(pgx)) addGeneEntity(gene);
  for (const item of transporterDdi) addGeneEntity(item.transporter);
  for (const map of actorMaps) {
    for (const actor of Object.values(map)) {
      addGeneEntity(actor.gene);
      for (const route of actor.routes || []) addGeneEntity(route.enzyme);
      for (const item of actor.inh || []) addGeneEntity(item.target);
      for (const item of actor.ind || []) addGeneEntity(item.target);
    }
  }

  function getDrugRecord(name) {
    if (!name) return null;
    const direct = typeof getDrugLookup === "function" ? getDrugLookup(name) : null;
    if (direct) return direct;
    const stripped = stripParenthetical(name);
    return drugByKey.get(lookupKey(name)) || drugByKey.get(rawNorm(name)) ||
      (stripped && stripped !== name ? (drugByKey.get(lookupKey(stripped)) || drugByKey.get(rawNorm(stripped)) || (typeof getDrugLookup === "function" ? getDrugLookup(stripped) : null)) : null) ||
      null;
  }

  function getEntity(name) {
    if (!name) return null;
    const drug = getDrugRecord(name);
    if (drug) return entityByKey.get(lookupKey(drug.name)) || addEntity({ id:drug.id, name:drug.name, kind:"drug", class:drug.cls, linkable:true, record:drug });
    const stripped = stripParenthetical(name);
    return entityByKey.get(lookupKey(name)) || entityByKey.get(rawNorm(name)) ||
      (stripped && stripped !== name ? (entityByKey.get(lookupKey(stripped)) || entityByKey.get(rawNorm(stripped))) : null) ||
      addEntity({ name, kind:"external", class:"External substance", linkable:false });
  }

  function linkSubstanceIds(names) {
    return uniq(asArray(names).map((name) => getDrugRecord(name)?.id));
  }

  function isActiveDescriptor(value) {
    const text = String(value || "").toLowerCase();
    if (/inactive|not active/.test(text)) return false;
    return /\bactive\b|\bactive_/.test(text);
  }

  function routeFormsActiveMetabolite(drug, route) {
    const routeGene = upper(route.enzyme);
    const metaboliteRows = asArray(metab[drug.name]);
    if (metaboliteRows.some((item) => upper(item.e) === routeGene && isActiveDescriptor(`${item.role || ""} ${item.a || ""}`))) return true;
    if (/activ/i.test(`${route.role || ""} ${route.enzyme || ""}`)) return true;
    return Boolean(drug.prodrug && (drug.routes || []).length === 1);
  }

  function severityRank(severity) {
    return ({ red:0, high:0, critical:0, severe:0, amber:1, moderate:1, violet:2, green:3, low:3 })[String(severity || "").toLowerCase()] ?? 2;
  }

  function displaySeverity(value, fallback = "green") {
    const text = String(value || fallback).toLowerCase();
    if (/critical|severe|red|fatal|contraind/.test(text)) return "red";
    if (/high|moderate|amber|dose|monitor/.test(text)) return "amber";
    if (/context|metabolite|violet|external/.test(text)) return "violet";
    return "green";
  }

  function classifyAction(text, severity, role) {
    const value = `${text || ""} ${severity || ""} ${role || ""}`.toLowerCase();
    if (/avoid|contraindicat|fatal|black box|ineffective|failure|do not use/.test(value)) return "Avoid";
    if (/alternative|switch|replace|non-cyp|preferred|use .*instead/.test(value)) return "Switch/Alternative";
    if (/dose|reduce|increase|titrate|auc|level|clearance|fold|tdm|limit/.test(value)) return "Adjust Dose";
    if (/monitor|risk|watch|check|review|ecg|inr|toxicity|bleed|myopathy/.test(value)) return "Monitor";
    return "Informational";
  }

  const relations = [];
  const relationIds = new Set();

  function addRelation(input) {
    const subject = input.subject || input.substance || input.drug || input.parent || input.title;
    const subjectEntity = getEntity(subject);
    const objectEntity = input.object ? getEntity(input.object) : null;
    const gene = input.gene ? upper(input.gene) : "";
    const role = input.role || "context";
    const actionText = input.actionText || input.action || input.signal || input.mechanism || "Review";
    const actionGroup = input.actionGroup || classifyAction(actionText, input.severity, role);
    const linkSubstances = linkSubstanceIds(input.linkSubstances || input.meds || [subject, input.object].filter(Boolean));
    const idBase = [
      input.source || "source",
      role,
      gene,
      subjectEntity?.name || subject,
      objectEntity?.name || input.object || "",
      actionText,
    ].join("|");
    const id = input.id || safeId(idBase);
    if (relationIds.has(id)) return null;
    relationIds.add(id);
    const relation = {
      id,
      source:input.source || "Unknown",
      role,
      gene,
      subject:subjectEntity?.name || subject,
      object:objectEntity?.name || input.object || "",
      entityKind:subjectEntity?.kind || "unresolved",
      class:input.class || subjectEntity?.class || "Unclassified",
      severity:displaySeverity(input.severity, input.severityFallback || "green"),
      actionGroup,
      actionText,
      evidenceLevel:input.evidenceLevel || "",
      signal:input.signal || actionText,
      linkSubstances,
      phenotype:input.phenotype || "",
      searchText:"",
    };
    relation.searchText = [
      relation.source, relation.role, relation.gene, relation.subject, relation.object, relation.entityKind,
      relation.class, relation.severity, relation.actionGroup, relation.actionText, relation.evidenceLevel, relation.signal,
    ].join(" ").toLowerCase();
    relations.push(relation);
    return relation;
  }

  for (const drug of drugs) {
    for (const route of drug.routes || []) {
      const activationRoute = Boolean(drug.prodrug && routeFormsActiveMetabolite(drug, route));
      addRelation({
        source:"DRUG_DB",
        role:"parent",
        gene:route.enzyme,
        subject:drug.name,
        class:drug.cls,
        severity:activationRoute ? "red" : "amber",
        signal:`${route.enzyme} route${route.fraction ? `, fraction ${Math.round(route.fraction * 100)}%` : ""}`,
        actionText:activationRoute ? "activation review" : drug.prodrug ? "non-activating route review" : "exposure review",
        evidenceLevel:route.evidence?.confidence || "",
      });
    }
    for (const item of drug.inh || []) {
      addRelation({
        source:"DRUG_DB",
        role:"modulator",
        gene:item.target,
        subject:drug.name,
        class:drug.cls,
        severity:item.strength === "strong" ? "red" : "amber",
        signal:`${sentence(item.strength)} ${item.target} inhibition`,
        actionText:"phenoconversion flag",
        evidenceLevel:item.evidence?.confidence || "",
      });
    }
    for (const item of drug.ind || []) {
      addRelation({
        source:"DRUG_DB",
        role:"modulator",
        gene:item.target,
        subject:drug.name,
        class:drug.cls,
        severity:"amber",
        signal:`${sentence(item.strength)} ${item.target} induction`,
        actionText:"loss-of-effect flag",
        evidenceLevel:item.evidence?.confidence || "",
      });
    }
  }

  for (const [parent, entries] of Object.entries(metab)) {
    for (const item of entries || []) {
      addRelation({
        source:"METAB",
        role:"metabolite",
        gene:item.e,
        subject:parent,
        object:item.n,
        severity:item.a?.includes("toxic") ? "red" : "violet",
        signal:`${item.n} (${sentence(item.a)})`,
        actionText:isActiveDescriptor(`${item.role || ""} ${item.a || ""}`) ? "activation review" : "metabolite review",
        evidenceLevel:(item.evidenceRefs || []).length ? "linked" : "",
      });
    }
  }

  for (const [gene, phenotypes] of Object.entries(genotypeEffects)) {
    for (const [phenotype, effect] of Object.entries(phenotypes || {})) {
      addRelation({
        source:"GENOTYPE_EFFECTS",
        role:"risk",
        gene,
        subject:gene,
        object:phenotype,
        severity:phenotype === genotypePhenotype?.PM ? "amber" : "green",
        signal:effect.note || `${gene} ${phenotype}`,
        actionText:effect.note || "genotype context",
        phenotype,
        evidenceLevel:effect.freq_pct == null ? "" : `freq ${effect.freq_pct}%`,
      });
    }
  }

  for (const [riskKey, effect] of Object.entries(genotypeRiskEffects)) {
    const gene = riskGeneFromKey(riskKey);
    addRelation({
      source:"GENOTYPE_RISK_EFFECTS",
      role:"risk",
      gene,
      subject:gene,
      severity:"red",
      signal:`${riskKey}: ${effect.note || effect.label || "risk context"}`,
      actionText:effect.note || effect.label || "risk context",
      evidenceLevel:effect.evidenceLevel || "",
    });
  }

  for (const item of genotypeMetaboliteEffects) {
    addRelation({
      source:"GENOTYPE_METABOLITE_EFFECTS",
      role:"metabolite",
      gene:item.enzyme,
      subject:item.parent,
      object:item.metaboliteName || item.metaboliteId,
      severity:item.effects?.[genotypePhenotype?.PM]?.direction === "increase" ? "red" : "violet",
      signal:item.metaboliteName || item.metaboliteId,
      actionText:item.note || "genotype-specific metabolite effect",
      evidenceLevel:(item.evidenceRefs || []).length ? "linked" : "",
    });
  }

  for (const [parent, item] of Object.entries(pathwayDiversion)) {
    const paths = [
      ...(item.primary ? [{ path:item.primary, primary:true }] : []),
      ...(item.diverted || []).filter(Boolean).map((path) => ({ path, primary:false })),
    ];
    for (const { path, primary } of paths) {
      const pathSignal = primary
        ? item.clinicalImpact || path.note || path.metabolite || "pathway diversion"
        : `${path.metabolite || "diverted metabolite"}${path.activity ? ` (${sentence(path.activity)})` : ""}`;
      addRelation({
        source:"PATHWAY_DIVERSION",
        role:"metabolite",
        gene:path.enzyme,
        subject:parent,
        object:path.metabolite,
        severity:primary ? item.severity === "critical" ? "red" : item.severity === "high" ? "amber" : "violet" : "violet",
        signal:pathSignal,
        actionText:primary ? item.clinicalImpact || item.pmEffect || "pathway review" : "diverted pathway review",
        evidenceLevel:item.evidenceLevel || "",
      });
    }
  }

  for (const item of highImpactMetaboliteRelations) {
    addRelation({
      source:"HIGH_IMPACT_METABOLITE_RELATIONS",
      role:"metabolite",
      gene:item.gene || item.enzyme,
      subject:item.parent || item.drug,
      object:item.metaboliteName || item.metabolite,
      severity:item.severity || "amber",
      signal:item.impact || item.summary || item.note || "high-impact metabolite relation",
      actionText:item.recommendation || item.action || item.note || "metabolite review",
      evidenceLevel:(item.evidenceRefs || []).length ? "linked" : "",
    });
  }

  for (const [gene, entry] of Object.entries(pgx)) {
    for (const pair of entry.pairs || []) {
      addRelation({
        source:"PHARMGKB_EVIDENCE",
        role:"evidence",
        gene,
        subject:pair.drug,
        severity:pair.level === "A" ? "red" : pair.level === "B" ? "amber" : "green",
        signal:pair.action,
        actionText:pair.action,
        evidenceLevel:pair.level || "",
      });
    }
  }

  for (const item of knownDdi) {
    addRelation({
      source:"KNOWN_DDI",
      role:"ddi",
      subject:item.drug1,
      object:item.drug2,
      class:item.category || "DDI",
      severity:item.severity === "severe" ? "red" : item.severity === "moderate" ? "amber" : "green",
      signal:item.mechanism || item.effect || "interaction",
      actionText:item.effect || item.management || item.mechanism || "Review interaction",
      evidenceLevel:item.evidence?.confidence || "",
      linkSubstances:[item.drug1, item.drug2],
    });
  }

  for (const item of transporterDdi) {
    const actor = Object.values(transporterActors || {}).find((candidate) => String(item.transporter || "").includes(candidate.id) || String(item.transporter || "").includes(candidate.gene));
    addRelation({
      source:"TRANSPORTER_DDI",
      role:"transporter",
      gene:actor?.gene || item.transporter,
      subject:item.substrate,
      object:item.inhibitor,
      class:item.transporter || "Transporter",
      severity:item.severity === "critical" || item.severity === "high" ? "red" : item.severity === "moderate" ? "amber" : "green",
      signal:item.effect,
      actionText:`${item.effect || ""}; ${item.mechanism || ""}`.replace(/^; /, ""),
      evidenceLevel:item.evidence?.confidence || "",
      linkSubstances:[item.substrate, item.inhibitor],
    });
  }

  for (const map of actorMaps) {
    for (const actor of Object.values(map)) {
      const actorName = actor.name || actor.id;
      for (const route of actor.routes || []) {
        const routeGene = upper(route.enzyme);
        const formingGene = upper(actor.formingEnzyme);
        const routeAction = route.note || (formingGene && routeGene === formingGene ? actor.note : `${route.enzyme} route review`);
        addRelation({
          source:"ACTOR_MAP",
          role:"parent",
          gene:route.enzyme,
          subject:actorName,
          class:sentence(actor.type || "actor"),
          severity:"violet",
          signal:`${route.enzyme} route${route.fraction ? `, fraction ${Math.round(route.fraction * 100)}%` : ""}`,
          actionText:routeAction,
          evidenceLevel:route.evidence?.confidence || "",
        });
      }
      for (const item of actor.inh || []) {
        addRelation({
          source:"ACTOR_MAP",
          role:"modulator",
          gene:item.target,
          subject:actorName,
          class:sentence(actor.type || "actor"),
          severity:item.strength === "strong" ? "red" : "amber",
          signal:`${sentence(item.strength)} ${item.target} inhibition`,
          actionText:actor.note || "actor modulation review",
          evidenceLevel:item.evidence?.confidence || "",
        });
      }
      for (const item of actor.ind || []) {
        addRelation({
          source:"ACTOR_MAP",
          role:"modulator",
          gene:item.target,
          subject:actorName,
          class:sentence(actor.type || "actor"),
          severity:"amber",
          signal:`${sentence(item.strength)} ${item.target} induction`,
          actionText:actor.note || "actor modulation review",
          evidenceLevel:item.evidence?.confidence || "",
        });
      }
      if (actor.gene) {
        for (const name of actor.substrates || []) {
          addRelation({
            source:"ACTOR_MAP",
            role:"transporter",
            gene:actor.gene,
            subject:name,
            object:actorName,
            severity:"amber",
            signal:`${actorName} substrate`,
            actionText:actor.clinicalSignificance || "transporter genetics context",
          });
        }
        for (const item of actor.inhibitors || []) {
          addRelation({
            source:"ACTOR_MAP",
            role:"modulator",
            gene:actor.gene,
            subject:item.name,
            object:actorName,
            severity:item.strength === "strong" ? "red" : "amber",
            signal:`${sentence(item.strength)} transporter inhibition`,
            actionText:actor.clinicalSignificance || "transporter inhibition context",
          });
        }
        for (const item of actor.inducers || []) {
          addRelation({
            source:"ACTOR_MAP",
            role:"modulator",
            gene:actor.gene,
            subject:item.name,
            object:actorName,
            severity:"amber",
            signal:`${sentence(item.strength)} transporter induction`,
            actionText:actor.clinicalSignificance || "transporter induction context",
          });
        }
      }
    }
  }

  const byGene = {};
  const byClass = {};
  const byActionGroup = {};
  const byEntity = {};
  for (const relation of relations) {
    if (relation.gene) (byGene[relation.gene] ||= []).push(relation);
    (byClass[relation.class || "Unclassified"] ||= []).push(relation);
    (byActionGroup[relation.actionGroup] ||= []).push(relation);
    for (const name of [relation.subject, relation.object].filter(Boolean)) {
      const key = lookupKey(name);
      (byEntity[key] ||= []).push(relation);
    }
  }

  const rankRelation = (a, b) => severityRank(a.severity) - severityRank(b.severity) ||
    (a.evidenceLevel || "").localeCompare(b.evidenceLevel || "") ||
    a.subject.localeCompare(b.subject) ||
    a.role.localeCompare(b.role);

  for (const bucket of [...Object.values(byGene), ...Object.values(byClass), ...Object.values(byActionGroup), ...Object.values(byEntity)]) {
    bucket.sort(rankRelation);
  }
  relations.sort(rankRelation);

  const modeledGeneKeys = new Set([
    ...Object.keys(genotypeEffects),
    ...Object.keys(geneSemantics),
    ...Object.keys(pgx),
  ].map(upper).filter((gene) => byGene[gene]?.length));
  const modeledGenotypes = [...modeledGeneKeys].map((gene) => {
    const semantics = geneSemantics[gene] || {};
    return {
      key:`gene:${gene}`,
      gene,
      label:gene,
      kind:"modeled_gene",
      axis:semantics.axis || "evidence",
      stateLabel:semantics.phenotypeStateLabel || `${gene} genotype context`,
      useLabel:semantics.modelUseLabel || "genotype/evidence context",
      relationCount:byGene[gene]?.length || 0,
      phenotypeValues:Object.keys(genotypeEffects[gene] || {}),
      phenotypeLabels:semantics.optionLabels || semantics.phenotypeLabels || {},
    };
  });
  for (const riskKey of Object.keys(genotypeRiskEffects)) {
    const gene = upper(riskGeneFromKey(riskKey));
    modeledGenotypes.push({
      key:`risk:${riskKey}`,
      gene,
      label:riskKey,
      kind:"risk_variant",
      axis:"risk_allele",
      stateLabel:`${riskKey} risk allele`,
      useLabel:"risk-allele safety context",
      relationCount:(byGene[gene] || []).filter((row) => row.searchText.includes(String(riskKey).toLowerCase())).length,
      phenotypeValues:["risk_allele_present", "risk_allele_absent"],
      phenotypeLabels:{ risk_allele_present:"Present", risk_allele_absent:"Absent" },
      riskKey,
    });
  }
  modeledGenotypes.sort((a, b) => {
    const axisOrder = { activity_score:0, transport:1, deficiency:2, sensitivity:3, response:4, expression:5, risk_allele:6, evidence:7 };
    return (axisOrder[a.axis] ?? 9) - (axisOrder[b.axis] ?? 9) || a.label.localeCompare(b.label);
  });

  function appLink(names, opts = {}) {
    const substances = linkSubstanceIds(names).join(",");
    if (!substances) return "./index.html";
    const params = new URLSearchParams();
    params.set("substances", substances);
    if (opts.genotype) params.set("genotype", opts.genotype);
    params.set("tab", opts.tab || "genes-metabolites");
    return `./index.html?${params.toString().replaceAll("%2C", ",").replaceAll("%3A", ":")}`;
  }

  global.DATA_VIEW_INDEX = {
    entities,
    relations,
    byGene,
    byClass,
    byActionGroup,
    byEntity,
    genes:Object.keys(byGene).sort(),
    modeledGenotypes,
    getDrugRecord,
    getEntity,
    appLink,
    normalize:lookupKey,
    rawNorm,
    classifyAction,
    severityRank,
  };
})(globalThis);
