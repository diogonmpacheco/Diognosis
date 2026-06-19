// Diognosis — App initialization
// Phase A: modular source — concatenated by build.js

document.addEventListener("click", function(e) {
  if (!e.target.closest(".search-wrap")) {
    closeSearchResults();
  }
});

const DEMO_CASES = {
  'ssri-switch': {
    drugs: ['Paroxetine', 'Fluoxetine'],
    tab: 'overview',
  },
  'clopidogrel-cyp2c19': {
    drugs: ['Clopidogrel', 'Omeprazole'],
    genotype: { CYP2C19: GENOTYPE_PHENOTYPE.PM },
    tab: 'genes-metabolites',
  },
  'codeine-cyp2d6': {
    drugs: ['Codeine', 'Fluoxetine'],
    genotype: { CYP2D6: GENOTYPE_PHENOTYPE.PM },
    tab: 'genes-metabolites',
  },
  'statin-inhibitor': {
    drugs: ['Simvastatin', 'Clarithromycin'],
    tab: 'timing-levels',
  },
  'older-adult-burden': {
    drugs: ['Amitriptyline', 'Diazepam', 'Diphenhydramine', 'Oxycodone'],
    tab: 'overview',
  },
  'thiopurine-marrow-toxicity': {
    drugs: ['Azathioprine', 'Allopurinol'],
    genotype: { TPMT: GENOTYPE_PHENOTYPE.PM, NUDT15: GENOTYPE_PHENOTYPE.PM },
    tab: 'genes-metabolites',
  },
  'fluoropyrimidine-dpyd-toxicity': {
    drugs: ['Capecitabine'],
    genotype: { DPYD: GENOTYPE_PHENOTYPE.PM },
    tab: 'genes-metabolites',
  },
  'irinotecan-sn38-toxicity': {
    drugs: ['Irinotecan'],
    genotype: { UGT1A1: GENOTYPE_PHENOTYPE.PM },
    tab: 'genes-metabolites',
  },
  'g6pd-oxidant-stack': {
    drugs: ['Rasburicase', 'Primaquine', 'Dapsone'],
    genotype: { 'G6PD deficiency': GENOTYPE_RISK_STATUS.PRESENT },
    tab: 'genes-metabolites',
  },
  'anesthesia-pgx-risk': {
    drugs: ['Succinylcholine'],
    genotype: { BCHE: GENOTYPE_PHENOTYPE.PM, 'RYR1/CACNA1S MH variant': GENOTYPE_RISK_STATUS.PRESENT },
    tab: 'genes-metabolites',
  },
};

function loadUrlDemoState() {
  const params = getUrlStateParams();
  const demo = DEMO_CASES[params.demo || ''];
  const audience = normalizeAudienceMode(params.audience || params.view || demo?.audience);
  if (audience) setAudienceMode(audience, { render:false });
  const drugParam = params.substances || params.drugs || params.medications;
  const drugNames = demo ? demo.drugs : (drugParam ? drugParam.split(',').map(d => d.trim()) : []);
  if ((drugNames.length || params.genotype) && typeof resetActiveGenotypeState === "function") resetActiveGenotypeState();
  if (drugNames.length) {
    const seen = new Set();
    activeStack = drugNames
      .map(name => resolveUrlDrugName(name, { preserveUnknown:true }))
      .filter(name => {
        if (!name) return false;
        const key = stackSelectionDedupeKey(name);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  const genotypeSpec = {};
  for (const [gene, phenotype] of Object.entries(demo?.genotype || {})) {
    const riskEffects = typeof GENOTYPE_RISK_EFFECTS !== "undefined" ? GENOTYPE_RISK_EFFECTS : {};
    if (riskEffects[gene] && Object.values(GENOTYPE_RISK_STATUS).includes(phenotype)) {
      genotypeSpec[gene] = { status:phenotype, reportedLabel:phenotype, mechanism:"demo" };
    } else {
      genotypeSpec[gene] = { phenotype, reportedLabel:phenotype, mechanism:"demo" };
    }
  }
  const genotypeParam = params.genotype;
  if (genotypeParam) {
    const genotypeParams = Array.isArray(genotypeParam) ? genotypeParam : [genotypeParam];
    genotypeParams.forEach(param => {
      String(param || '').split(/[;,]/).forEach(pair => {
        const sep = pair.lastIndexOf(':');
        const rawGene = sep >= 0 ? pair.slice(0, sep).trim() : pair.trim();
        const rawPhenotype = sep >= 0 ? pair.slice(sep + 1).trim() : "";
        const gene = rawGene && typeof normalizePharmGxGene === "function"
          ? (normalizePharmGxGene(rawGene) || rawGene.toUpperCase())
          : (rawGene ? rawGene.toUpperCase() : "");
        const parsed = normalizeUrlPhenotype(gene, rawPhenotype);
        if (gene && parsed?.phenotype && GENOTYPE_EFFECTS[gene] && GENOTYPE_EFFECTS[gene][parsed.phenotype]) {
          genotypeSpec[gene] = parsed;
        } else if (gene && parsed?.status && typeof GENOTYPE_RISK_EFFECTS !== "undefined" && GENOTYPE_RISK_EFFECTS[gene]) {
          genotypeSpec[gene] = parsed;
        }
      });
    });
  }
  for (const [gene, spec] of Object.entries(genotypeSpec)) {
    const phenotype = spec?.phenotype || spec;
    if (GENOTYPE_EFFECTS[gene] && GENOTYPE_EFFECTS[gene][phenotype]) setGenotypeState(gene, phenotype, spec);
    else if (typeof GENOTYPE_RISK_EFFECTS !== "undefined" && GENOTYPE_RISK_EFFECTS[gene] && spec?.status) {
      activeGenotype[gene] = spec.status;
      if (typeof activeGenotypeDetails !== "undefined") activeGenotypeDetails[gene] = buildRiskInterpretation(gene, spec.status, spec);
    }
  }

  const tab = params.tab || demo?.tab;
  if (tab) setActiveTab(tab);
  if (demo && params.demo && !params.substances) replaceDemoUrlWithSubstances(demo);
}

function getUrlStateParams() {
  const searchParams = parseQueryParams(window.location.search || '');
  const hashParams = parseHashParams(window.location.hash || '');
  return { ...searchParams, ...hashParams };
}

function parseHashParams(hash) {
  const raw = String(hash || '').replace(/^#/, '').replace(/^\/?/, '');
  if (!raw) return {};
  if (raw.includes('=') || raw.includes('&')) return parseQueryParams(raw.replace(/^\?/, ''));
  if (DEMO_CASES[raw]) return { demo:raw };
  return {};
}

function parseQueryParams(search) {
  const out = {};
  String(search || '').replace(/^\?/, '').split('&').forEach(part => {
    if (!part) return;
    const eq = part.indexOf('=');
    const rawKey = eq >= 0 ? part.slice(0, eq) : part;
    const rawVal = eq >= 0 ? part.slice(eq + 1) : '';
    const key = decodeURIComponent(rawKey.replace(/\+/g, ' '));
    const val = decodeURIComponent(rawVal.replace(/\+/g, ' '));
    if (!key) return;
    if (key === 'genotype') {
      if (!Array.isArray(out.genotype)) out.genotype = out.genotype ? [out.genotype] : [];
      out.genotype.push(val);
    } else {
      out[key] = val;
    }
  });
  return out;
}

function normalizeUrlPhenotype(geneOrValue, maybeValue) {
  const gene = maybeValue === undefined ? null : geneOrValue;
  const value = maybeValue === undefined ? geneOrValue : maybeValue;
  if (gene && typeof GENOTYPE_RISK_EFFECTS !== "undefined" && GENOTYPE_RISK_EFFECTS[gene]) {
    const status = typeof riskTextToStatus === "function" ? riskTextToStatus(value, gene) : null;
    if (status) return { gene, status, reportedLabel:String(value || "").trim(), mechanism:status };
  }
  const parsed = typeof normalizeGenePhenotypeInput === "function"
    ? normalizeGenePhenotypeInput(gene, value)
    : null;
  if (parsed) return parsed;
  const status = typeof riskTextToStatus === "function" ? riskTextToStatus(value, gene) : null;
  if (status) return { gene, status, reportedLabel:String(value || "").trim(), mechanism:status };
  return { gene, phenotype:String(value || "").trim(), reportedLabel:String(value || "").trim(), mechanism:"raw" };
}

function resolveUrlDrugName(value, options = {}) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const slug = toGraphId(raw);
  const exactDrug = DRUG_DB.find(d =>
    d.id === raw ||
    d.name.toLowerCase() === raw.toLowerCase()
  );
  const keyedActor = (typeof FOOD_ACTORS !== "undefined" && (FOOD_ACTORS[raw] || FOOD_ACTORS[slug])) ||
    (typeof ENDOGENOUS_ACTORS !== "undefined" && (ENDOGENOUS_ACTORS[raw] || ENDOGENOUS_ACTORS[slug])) ||
    null;
  if (keyedActor && !exactDrug) return keyedActor.id;
  const direct = getDrug(raw);
  if (direct) return direct.name;
  const actor = typeof getSupplementActor === "function" ? getSupplementActor(raw) : null;
  if (actor) return actor.id;
  const match = DRUG_DB.find(d =>
    d.id === raw ||
    d.id === slug ||
    d.name.toLowerCase() === raw.toLowerCase() ||
    toGraphId(d.name) === slug ||
    (typeof getDrugSearchTerms === "function" ? getDrugSearchTerms(d) : (BRAND_NAMES[d.name] || []))
      .some(term => String(term || "").toLowerCase() === raw.toLowerCase() || toGraphId(term) === slug)
  );
  if (match) return match.name;
  return options.preserveUnknown ? sanitizeUrlUnknownSubstance(raw) : null;
}

function sanitizeUrlUnknownSubstance(value) {
  const cleaned = String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[<>`{}[\]\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .trim();
  if (!cleaned || !/[a-z0-9]/i.test(cleaned)) return null;
  if (/^(?:null|undefined|nan)$/i.test(cleaned)) return null;
  if (cleaned === cleaned.toLowerCase()) {
    return cleaned.replace(/\b([a-z])/g, letter => letter.toUpperCase());
  }
  return cleaned;
}

function stackSelectionDedupeKey(value) {
  const actor = typeof getStackSupplementActor === "function" ? getStackSupplementActor(value) : null;
  if (actor) return `actor:${actor.id}`;
  const drug = typeof getStackDrug === "function" ? getStackDrug(value) : getDrug(value);
  if (drug) return `drug:${drug.id || toGraphId(drug.name)}`;
  const normalized = typeof normalizeDrugLookupKey === "function"
    ? normalizeDrugLookupKey(value)
    : String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return `unknown:${normalized || toGraphId(String(value || ""))}`;
}

function replaceDemoUrlWithSubstances(demo) {
  if (!window.history || typeof window.history.replaceState !== 'function') return;
  const query = [
    ['substances', demo.drugs.map(slugForUrlDrugName).join(',')],
    ...Object.entries(demo.genotype || {}).map(([gene, phenotype]) => ['genotype', demoGenotypeUrlToken(gene, phenotype)]),
    ['tab', resolveTabAlias(demo.tab || 'overview')],
  ].map(([key, value]) => `${encodeURIComponent(key)}=${encodeUrlStateValue(value)}`).join('&');
  const path = (window.location.pathname || '').endsWith('/')
    ? `${window.location.pathname}index.html`
    : (window.location.pathname || 'index.html');
  window.history.replaceState(null, '', `${path}?${query}`);
}

function demoGenotypeUrlToken(gene, phenotype) {
  if (gene === "G6PD deficiency" && phenotype === GENOTYPE_RISK_STATUS.PRESENT) return "G6PD:deficiency";
  if (gene === "RYR1/CACNA1S MH variant" && phenotype === GENOTYPE_RISK_STATUS.PRESENT) return "RYR1:present";
  return `${gene}:${phenotype}`;
}

function slugForUrlDrugName(name) {
  const drug = getDrug(name);
  return drug?.id || toGraphId(name);
}

function encodeUrlStateValue(value) {
  return encodeURIComponent(value).replace(/%2C/g, ',').replace(/%3A/g, ':');
}

// Initialize
loadUrlDemoState();
renderGenetics();
renderAll();
installV1RuntimeFacade();

// ── Populate version display ──
(function() {
  const v = DIOGNOSIS_VERSION;
  const el = (id) => document.getElementById(id);
  const currentDrugCount = typeof DIOGNOSIS_STATS !== "undefined" && DIOGNOSIS_STATS.drugs
    ? DIOGNOSIS_STATS.drugs
    : (Array.isArray(DRUG_DB) ? DRUG_DB.length : v.drugCount);
  if (el("ver-engine")) {
    el("ver-engine").textContent = v.engine;
    el("ver-db").textContent = v.drugDb;
    el("ver-count").textContent = currentDrugCount;
    el("ver-schema").textContent = v.schema;
    el("ver-date").textContent = v.released;
  }
  const statsLine = el("statsLine");
  if (statsLine && typeof DIOGNOSIS_STATS !== "undefined") {
    const pendingProfessionalReview = DIOGNOSIS_STATS.pendingProfessionalReviewStudies ??
      Math.max(0, (DIOGNOSIS_STATS.studies || 0) - (DIOGNOSIS_STATS.professionalReviewedStudies || 0));
    const evidenceLabel = `${DIOGNOSIS_STATS.studies} source-linked evidence entries (${pendingProfessionalReview} not professionally reviewed; ${DIOGNOSIS_STATS.professionalReviewedStudies || 0} professionally reviewed)`;
    const metaboliteLabel = DIOGNOSIS_STATS.metaboliteEntries
      ? `${DIOGNOSIS_STATS.metaboliteEntries} metabolites across ${DIOGNOSIS_STATS.metaboliteParents} parent substances`
      : null;
    const pkLabel = DIOGNOSIS_STATS.pkParams
      ? `${DIOGNOSIS_STATS.pkParams} absolute PK profiles`
      : null;
    statsLine.textContent = [
      `${DIOGNOSIS_STATS.drugs} drugs`,
      evidenceLabel,
      `${DIOGNOSIS_STATS.ddiPairs} interaction pairs`,
      metaboliteLabel,
      pkLabel,
      `${DIOGNOSIS_STATS.genotypeGenes} genotype genes`,
    ].filter(Boolean).join(" · ");
  }
})();
