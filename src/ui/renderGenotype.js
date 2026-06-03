// MedCheck — Genotype panel and phenotype selector
// Phase A: modular source — concatenated by build.js

function renderGenotypePanel() {
  const sec = document.getElementById("genotypeSection");
  const el = document.getElementById("genotypeBody");
  if (!el) return;
  if (activeStack.length < 1) { if (sec) sec.style.display = "none"; return; }
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
  if (showEnzymes.length === 0 && showRiskAlleles.length === 0) {
    el.innerHTML = importHtml + '<div style="color:var(--text2);font-size:12px;padding:8px">No genotype-modeled pathways in current stack.</div>';
    return;
  }

  // Selector rows
  let html = importHtml + '<div style="margin-bottom:12px">';
  html += '<p style="font-size:12px;color:var(--text2);margin:0 0 8px">Set your genotype result to see how it changes predicted exposure or safety risk:</p>';
  for (const enz of showEnzymes) {
    const cur = activeGenotype[enz] || GENOTYPE_PHENOTYPE.NM;
    html += `<div class="geno-selector" style="margin-bottom:6px">
      <span class="geno-enz-label">${enz}</span>`;
    const phenotypeButtons = [
      [GENOTYPE_PHENOTYPE.PM,'PM'],[GENOTYPE_PHENOTYPE.IM,'IM'],
      [GENOTYPE_PHENOTYPE.NM,'NM'],[GENOTYPE_PHENOTYPE.UM,'UM']
    ].filter(([k]) => GENOTYPE_EFFECTS[enz]?.[k]);
    for (const [k, label] of phenotypeButtons) {
      const freq = GENOTYPE_EFFECTS[enz]?.[k]?.freq_pct || '?';
      html += `<button class="geno-btn ${cur===k?'active':''}"
        onclick="setGenotype('${enz}','${k}')"
        title="Frequency: ~${freq}% of population">${label} <span style="font-weight:400;font-size:9px">${freq}%</span></button>`;
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
        title="${effect?.note || ''}">${label}</button>`;
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
      const fold = eff.auc_fold;
      const foldStr = fold === 1.0 ? '1× (baseline)' : fold > 1 ? `${fold.toFixed(1)}× ↑ AUC` : `${fold.toFixed(1)}× ↓ AUC`;
      const foldColor = fold > 2 ? 'var(--red)' : fold > 1.3 ? 'var(--amber)' : fold < 0.5 ? 'var(--amber)' : 'var(--green)';
      html += `<div class="geno-effect-card">
        <div class="geno-effect-title">${drugName} <span style="color:var(--text2);font-size:11px;font-weight:400">via ${enz}</span>
          <span style="float:right;font-size:18px;font-weight:800;color:${foldColor}">${foldStr}</span>
        </div>
        <div class="geno-effect-note">${eff.note}</div>
        ${fold !== 1.0 ? `<div style="font-size:10px;color:var(--text2);margin-top:4px">Population frequency: ~${eff.freq_pct}% | Vs NM baseline fold-change: ${fold.toFixed(1)}×</div>` : ''}
      </div>`;
    }
    for (const card of getGenotypeMetaboliteEffectCards(drugName)) {
      html += renderGenotypeMetaboliteEffectCard(card);
    }
    for (const card of getGenotypeRiskEffectCards(drugName)) {
      html += renderGenotypeRiskEffectCard(card);
    }
  }
  // CPIC evidence for current genotype, restricted to the active stack.
  const genoStudies = getStackRelevantGenotypeStudies();
  if (genoStudies.length) {
    html += `<div style="font-size:11px;font-weight:700;color:var(--text2);margin:10px 0 5px;text-transform:uppercase;letter-spacing:0.5px">Relevant Studies for Selected Genotypes</div>`;
    for (const s of genoStudies.slice(0,5)) {
      const pct = Math.round((EVIDENCE_WEIGHT[s.type]||0.5)*100);
      html += `<div style="font-size:11px;padding:5px 8px;border-radius:6px;background:var(--card2);margin-bottom:4px;display:flex;justify-content:space-between;align-items:center">
        <span>${s.title.substring(0,70)}${s.title.length>70?'…':''}</span>
        <span style="font-size:10px;color:var(--text2);margin-left:8px;white-space:nowrap">${s.type} · ${pct}%</span>
      </div>`;
    }
  }
  el.innerHTML = html;
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

function studyMatchesStackContext(study, context) {
  if (context.evidenceRefs.has(study.id)) return true;
  const searchText = normalizeEvidenceToken([
    study.id,
    study.title,
    study.source,
    study.journal,
    study.studyDesign,
    (study.supports || []).join(' '),
    (study.quantifiedEffects && JSON.stringify(study.quantifiedEffects)) || ''
  ].join(' '));
  return context.tokens.some(token => searchText.includes(token));
}

function getStackRelevantGenotypeStudies() {
  const selectedPhenotypes = Object.values(activeGenotype);
  const context = getStackEvidenceContext();
  return Object.values(STUDY_DB)
    .filter(s =>
      s.public !== false &&
      s.reviewRequired !== true &&   // quarantine: keep unreviewed drafts out of genotype evidence
      (s.phenotypes || []).some(p => selectedPhenotypes.includes(p)) &&
      studyMatchesStackContext(s, context)
    )
    .sort((a,b) => {
      const aDirect = context.evidenceRefs.has(a.id) ? 1 : 0;
      const bDirect = context.evidenceRefs.has(b.id) ? 1 : 0;
      if (aDirect !== bDirect) return bDirect - aDirect;
      return (EVIDENCE_WEIGHT[b.type]||0) - (EVIDENCE_WEIGHT[a.type]||0);
    });
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
  const { risk, status, riskEffect, drugEffect } = card;
  const isPresent = status === GENOTYPE_RISK_STATUS.PRESENT;
  const label = isPresent ? 'risk allele present' : 'risk allele absent';
  const foldColor = isPresent ? 'var(--red)' : 'var(--green)';
  const refs = (drugEffect.evidenceRefs || []).filter(ref => STUDY_DB[ref]);
  const evidenceText = refs.length
    ? refs.map(ref => {
      const study = STUDY_DB[ref];
      return study.pmid ? `PMID:${study.pmid}` : (study.doi ? `DOI:${study.doi}` : ref);
    }).join(' · ')
    : 'Evidence pending';
  return `<div class="geno-effect-card">
    <div class="geno-effect-title">${drugEffect.parent} <span style="color:var(--text2);font-size:11px;font-weight:400">with ${risk.label}</span>
      <span style="float:right;font-size:18px;font-weight:800;color:${foldColor}">${label}</span>
    </div>
    <div class="geno-effect-note">${isPresent ? drugEffect.note : riskEffect.note}</div>
    <div style="font-size:10px;color:var(--text2);margin-top:4px">${drugEffect.phenotype}: ${isPresent ? drugEffect.clinicalAction : riskEffect.label} · ${evidenceText}</div>
  </div>`;
}

function getSelectedGenotypePhenotype(enzyme) {
  return activeGenotype[enzyme] || GENOTYPE_PHENOTYPE.NM;
}

function getSelectedEnzymeExposureMult(enzyme, geno, inhibitorContext = []) {
  const genotypeMult = getSelectedGenotypeExposureMult(enzyme, geno);
  const inhibitorMult = getSelectedInhibitorExposureMult(inhibitorContext);
  return Math.max(genotypeMult, inhibitorMult);
}

function getSelectedGenotypeExposureMult(enzyme, geno) {
  if (typeof userGenetics !== 'undefined' && userGenetics[enzyme] === "null") return 20;
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
  if (!effect || !effect.enzyme || !GENOTYPE_EFFECTS[effect.enzyme]) return false;
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
  const refs = (effect.evidenceRefs || []).filter(ref => STUDY_DB[ref]);
  const evidenceText = refs.length
    ? refs.map(ref => {
      const study = STUDY_DB[ref];
      return study.pmid ? `PMID:${study.pmid}` : (study.doi ? `DOI:${study.doi}` : ref);
    }).join(' · ')
    : 'Evidence pending';
  const signal = typeof getExposureSignalLabel === 'function' ? getExposureSignalLabel(effect, phenotypeEffect) : 'metabolite level';
  const action = effect.clinicalAction || (typeof clinicalActionForMetaboliteEffect === 'function' ? clinicalActionForMetaboliteEffect(effect, phenotypeEffect) : '');
  return `<div class="geno-effect-card">
    <div class="geno-effect-title">${effect.metaboliteName} <span style="color:var(--text2);font-size:11px;font-weight:400">from ${effect.parent} via ${effect.enzyme}</span>
      <span style="float:right;font-size:18px;font-weight:800;color:${foldColor}">${foldStr}</span>
    </div>
    <div class="geno-effect-note">${effect.note}</div>
    <div style="font-size:10px;color:var(--text2);margin-top:4px">${signal}: ${phenotypeEffect.label}${action ? ` · ${action}` : ""} · ${evidenceText}</div>
  </div>`;
}

function setGenotype(enzyme, phenotype) {
  if (GENOTYPE_EFFECTS[enzyme]) setGenotypeState(enzyme, phenotype);
  else activeGenotype[enzyme] = phenotype;
  renderAll();
}

function renderPharmGxImportCard() {
  const id = "pharmgxImportText";
  return `<div class="geno-import-card">
    <div class="geno-import-title">DNA / PharmGx report import <span>local preview</span></div>
    <div class="geno-import-note">Paste gene phenotype rows from a ClawBio-style PharmGx report, or simple JSON/CSV with gene and phenotype/status fields. Nothing is uploaded.</div>
    <textarea id="${id}" class="geno-import-text" placeholder="CYP2C19 | *1/*2 | Intermediate Metabolizer&#10;CYP2D6 | *4/*4 | Poor Metabolizer&#10;HLA-B*57:01 | detected"></textarea>
    <div class="geno-import-actions">
      <button onclick="applyPharmGxImport()">Apply genotypes</button>
      <span id="pharmgxImportStatus"></span>
    </div>
  </div>`;
}

function applyPharmGxImport() {
  const input = document.getElementById("pharmgxImportText");
  const parsed = parsePharmGxImport(input?.value || "");
  const applied = [];
  for (const row of parsed) {
    if (applyPharmGxRow(row)) applied.push(row.gene);
  }
  if (applied.length) renderAll();
  const status = document.getElementById("pharmgxImportStatus");
  if (status) status.textContent = applied.length
    ? `Applied ${applied.length}: ${applied.join(", ")}`
    : "No supported MedCheck genes found";
}

function applyPharmGxRow(row) {
  if (!row?.gene) return false;
  if (GENOTYPE_EFFECTS[row.gene]) return setGenotypeState(row.gene, row.phenotype);
  if (typeof GENOTYPE_RISK_EFFECTS !== 'undefined' && GENOTYPE_RISK_EFFECTS[row.gene] && row.status) {
    activeGenotype[row.gene] = row.status;
    return true;
  }
  return false;
}

function parsePharmGxImport(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];
  const jsonRows = parsePharmGxJson(raw);
  if (jsonRows.length) return jsonRows;
  return raw.split(/\r?\n/)
    .map(parsePharmGxLine)
    .filter(Boolean);
}

function parsePharmGxJson(raw) {
  try {
    const data = JSON.parse(raw);
    const rows = Array.isArray(data) ? data :
      (data.gene_profiles || data.geneProfiles || data.genes || data.results || []);
    if (!Array.isArray(rows)) return [];
    return rows.map(row => parsePharmGxObjectRow(row)).filter(Boolean);
  } catch (_) {
    return [];
  }
}

function parsePharmGxObjectRow(row) {
  const gene = [
    row.gene, row.Gene, row.symbol, row.variant, row.allele, row.marker, row.name
  ].map(normalizePharmGxGene).find(Boolean);
  if (!gene) return null;
  const value = row.phenotype || row.Phenotype || row.metabolizerStatus || row.status || row.result || row.value;
  const phenotype = phenotypeTextToGenotype(value);
  const status = riskTextToStatus(value);
  if (GENOTYPE_EFFECTS[gene] && phenotype) return { gene, phenotype };
  if (typeof GENOTYPE_RISK_EFFECTS !== 'undefined' && GENOTYPE_RISK_EFFECTS[gene] && status) return { gene, status };
  return null;
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
  const phenotypeText = parts.slice().reverse().find(p => phenotypeTextToGenotype(p));
  const phenotype = phenotypeTextToGenotype(phenotypeText || clean);
  const statusText = parts.slice().reverse().find(p => riskTextToStatus(p));
  const status = riskTextToStatus(statusText || clean);
  if (GENOTYPE_EFFECTS[gene] && phenotype) return { gene, phenotype };
  if (typeof GENOTYPE_RISK_EFFECTS !== 'undefined' && GENOTYPE_RISK_EFFECTS[gene] && status) return { gene, status };
  return null;
}

function normalizePharmGxGene(value) {
  const gene = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  if (GENOTYPE_EFFECTS[gene]) return gene;
  if (typeof GENOTYPE_RISK_EFFECTS === 'undefined') return null;
  const riskKey = Object.keys(GENOTYPE_RISK_EFFECTS).find(key =>
    key.toUpperCase().replace(/\s+/g, "") === gene ||
    (GENOTYPE_RISK_EFFECTS[key].gene || "").toUpperCase().replace(/\s+/g, "") === gene
  );
  return riskKey || null;
}

function phenotypeTextToGenotype(value) {
  const text = String(value || "").toLowerCase();
  if (!text) return null;
  if (/ultra|rapid metabolizer|increased function|increased_function/.test(text)) return GENOTYPE_PHENOTYPE.UM;
  if (/intermediate|decreased function|decreased_function|decreased expression|decreased_expression|decreased\/intermediate/.test(text)) return GENOTYPE_PHENOTYPE.IM;
  if (/poor|non[- ]?express|no function|no_function|high warfarin sensitivity|risk allele present/.test(text)) return GENOTYPE_PHENOTYPE.PM;
  if (/normal|reference|standard|expressor|normal function|normal metabolizer/.test(text)) return GENOTYPE_PHENOTYPE.NM;
  return null;
}

function riskTextToStatus(value) {
  const text = String(value || "").toLowerCase();
  if (!text) return null;
  if (/absent|negative|not detected|not present|normal|no variant|wild[- ]?type/.test(text)) return GENOTYPE_RISK_STATUS.ABSENT;
  if (/present|positive|detected|carrier|risk allele|deficient|variant found|pathogenic/.test(text)) return GENOTYPE_RISK_STATUS.PRESENT;
  return null;
}

// ── renderPhenotypeAccumulation (#6) ────────────────────────────────
