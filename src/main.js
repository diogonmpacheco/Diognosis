// MedCheck — App initialization
// Phase A: modular source — concatenated by build.js

document.addEventListener("click", function(e) {
  if (!e.target.closest(".search-wrap")) {
    document.getElementById("searchResults").classList.remove("show");
  }
});

// Initialize
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
