// MedCheck — App initialization
// Phase A: modular source — concatenated by build.js

document.addEventListener("click", function(e) {
  if (!e.target.closest(".search-wrap")) {
    document.getElementById("searchResults").classList.remove("show");
  }
});

const DEMO_CASES = {
  'ssri-switch': {
    drugs: ['Paroxetine', 'Fluoxetine'],
    tab: 'safety',
  },
  'clopidogrel-cyp2c19': {
    drugs: ['Clopidogrel', 'Omeprazole'],
    genotype: { CYP2C19: GENOTYPE_PHENOTYPE.PM },
    tab: 'pgx',
  },
  'codeine-cyp2d6': {
    drugs: ['Codeine', 'Fluoxetine'],
    genotype: { CYP2D6: GENOTYPE_PHENOTYPE.PM },
    tab: 'pgx',
  },
  'statin-inhibitor': {
    drugs: ['Simvastatin', 'Clarithromycin'],
    tab: 'pk',
  },
  'older-adult-burden': {
    drugs: ['Amitriptyline', 'Diazepam', 'Diphenhydramine', 'Oxycodone'],
    tab: 'safety',
  },
};

function loadUrlDemoState() {
  const params = getUrlStateParams();
  const demo = DEMO_CASES[params.demo || ''];
  const drugParam = params.drugs;
  const drugNames = demo ? demo.drugs : (drugParam ? drugParam.split(',').map(d => d.trim()) : []);
  if (drugNames.length) {
    activeStack = drugNames
      .map(resolveUrlDrugName)
      .filter((name, idx, arr) => name && arr.indexOf(name) === idx);
  }

  const genotypeSpec = { ...(demo?.genotype || {}) };
  const genotypeParam = params.genotype;
  if (genotypeParam) {
    genotypeParam.split(/[;,]/).forEach(pair => {
      const [gene, phenotype] = pair.split(':').map(v => v && v.trim());
      if (gene && phenotype && GENOTYPE_EFFECTS[gene] && GENOTYPE_EFFECTS[gene][phenotype]) {
        genotypeSpec[gene] = phenotype;
      }
    });
  }
  for (const [gene, phenotype] of Object.entries(genotypeSpec)) {
    if (GENOTYPE_EFFECTS[gene] && GENOTYPE_EFFECTS[gene][phenotype]) activeGenotype[gene] = phenotype;
  }

  const tab = params.tab || demo?.tab;
  if (['safety', 'pgx', 'pk', 'evidence'].includes(tab)) activeTab = tab;
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
    if (key) out[key] = val;
  });
  return out;
}

function resolveUrlDrugName(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const direct = getDrug(raw);
  if (direct) return direct.name;
  const slug = toGraphId(raw);
  const match = DRUG_DB.find(d =>
    d.id === raw ||
    d.id === slug ||
    d.name.toLowerCase() === raw.toLowerCase() ||
    toGraphId(d.name) === slug ||
    (BRAND_NAMES[d.name] || []).some(brand => brand.toLowerCase() === raw.toLowerCase() || toGraphId(brand) === slug)
  );
  return match ? match.name : null;
}

// Initialize
loadUrlDemoState();
renderGenetics();
renderAll();

// ── Populate version display ──
(function() {
  const v = MEDCHECK_VERSION;
  const el = (id) => document.getElementById(id);
  if (el("ver-engine")) {
    el("ver-engine").textContent = v.engine;
    el("ver-db").textContent = v.drugDb;
    el("ver-count").textContent = v.drugCount;
    el("ver-schema").textContent = v.schema;
    el("ver-date").textContent = v.released;
  }
  const statsLine = el("statsLine");
  if (statsLine && typeof MEDCHECK_STATS !== "undefined") {
    statsLine.textContent = `${MEDCHECK_STATS.drugs} drugs · ${MEDCHECK_STATS.studies} evidence entries · ${MEDCHECK_STATS.ddiPairs} curated DDI pairs · ${MEDCHECK_STATS.genotypeGenes} genotype genes`;
  }
})();
