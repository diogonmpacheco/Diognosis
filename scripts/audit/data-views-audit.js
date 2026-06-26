#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const htmlPath = path.join(root, "data-views.html");
const html = fs.readFileSync(htmlPath, "utf8");
const pageSize = 50;

const requiredUrls = [
  "?view=genotype",
  "?view=genotype&gene=CYP2D6",
  "?view=genotype&gene=CYP2D6&phenotype=poor_metabolizer",
  "?view=genotype&gene=CYP2D6&phenotype=ultrarapid_metabolizer",
  "?view=genotype&gene=CYP2C19&phenotype=poor_metabolizer",
  "?view=genotype&gene=CYP2C9&phenotype=poor_metabolizer",
  "?view=genotype&gene=VKORC1&phenotype=poor_metabolizer",
  "?view=genotype&gene=CYP4F2&phenotype=intermediate_metabolizer",
  "?view=genotype&gene=SLCO1B1&phenotype=poor_metabolizer",
  "?view=genotype&gene=SLCO1B1&relationship=transporter",
  "?view=genotype&gene=ABCB1",
  "?view=genotype&gene=ABCG2",
  "?view=genotype&gene=CYP3A5&phenotype=intermediate_metabolizer",
  "?view=genotype&gene=CYP3A4",
  "?view=genotype&gene=CYP2B6%2FCYP3A4%2FCYP2C19",
  "?view=genotype&gene=DPYD&phenotype=poor_metabolizer",
  "?view=genotype&gene=TPMT&phenotype=poor_metabolizer",
  "?view=genotype&gene=NUDT15&phenotype=poor_metabolizer",
  "?view=genotype&gene=UGT1A1&phenotype=poor_metabolizer",
  "?view=genotype&gene=G6PD&phenotype=risk_allele_present",
  "?view=genotype&gene=HLA-B*57:01&phenotype=risk_allele_present",
  "?view=genotype&gene=HLA-B*15:02&phenotype=risk_allele_present",
  "?view=genotype&profile=CYP2D6:poor_metabolizer,CYP2C19:poor_metabolizer,HLA-B*57:01:risk_allele_present&gene=CYP2D6&phenotype=poor_metabolizer",
  "?view=action&action=digoxin",
  "?view=action&action=CYP3A4",
  "?view=ranking",
  "?view=ranking&sort=total",
];
const pathwayContextTargets = new Set(["CYP3A4"]);

const failures = [];

function fail(message) {
  failures.push(message);
}

function scriptSources() {
  const dom = new JSDOM(html);
  return [...dom.window.document.querySelectorAll("script")].map((script) => {
    const src = script.getAttribute("src");
    if (src) {
      const file = path.resolve(root, src.replace(/^\.\//, ""));
      return { filename:file, code:fs.readFileSync(file, "utf8") };
    }
    return { filename:"data-views.html:inline", code:script.textContent || "" };
  });
}

function loadPage(search) {
  const consoleErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("error", (message) => consoleErrors.push(String(message)));
  virtualConsole.on("jsdomError", (error) => consoleErrors.push(error.message));

  const dom = new JSDOM(html, {
    url:`http://localhost/data-views.html${search}`,
    runScripts:"outside-only",
    pretendToBeVisual:true,
    virtualConsole,
  });
  dom.window.addEventListener("error", (event) => consoleErrors.push(event.message));

  const context = dom.getInternalVMContext();
  for (const source of scriptSources()) {
    vm.runInContext(source.code, context, { filename:source.filename });
  }
  return { dom, consoleErrors };
}

function activePanel(document) {
  return document.querySelector(".view.active");
}

function activeText(document) {
  const panel = activePanel(document);
  return `${document.querySelector("#pageTitle")?.textContent || ""} ${document.querySelector("#pageCopy")?.textContent || ""} ${panel?.textContent || ""}`;
}

function visibleRows(document, selector) {
  const panel = activePanel(document);
  if (!panel) return 0;
  return [...panel.querySelectorAll(selector)].filter((node) => !/No indexed|No matching|No edges|No impacts|No linkable/.test(node.textContent || "")).length;
}

function expectPager(document, selector, expectedTotal, label, search) {
  const text = document.querySelector(selector)?.textContent || "";
  if (!text.includes(`of ${expectedTotal}`)) {
    fail(`${search}: ${label} pager does not expose total ${expectedTotal}. Found: ${text || "(missing)"}`);
  }
  if (expectedTotal > pageSize && !text.includes(`Showing ${pageSize} of ${expectedTotal}`)) {
    fail(`${search}: ${label} pager should show first ${pageSize} of ${expectedTotal}. Found: ${text}`);
  }
}

function actionExpectedRows(index, action) {
  const terms = action.toLowerCase().split(",").map((term) => term.trim()).filter(Boolean);
  return index.relations.filter((row) => terms.some((term) => row.searchText.includes(term)));
}

function genotypeMedicationContextCount(window, rows) {
  if (typeof window.buildPgxMedicationGroups === "function") return window.buildPgxMedicationGroups(rows).length;
  const contexts = new Set();
  for (const row of rows) {
    const meds = typeof window.relationMedicationNames === "function" ? window.relationMedicationNames(row) : [];
    meds.forEach((name) => contexts.add(name));
  }
  return contexts.size;
}

function pgxCards(document) {
  return [...document.querySelectorAll("#view-genotype.active #geneSubstanceRows .pgx-medication-card")];
}

function cardByMedication(document, medication) {
  const normalized = String(medication || "").toLowerCase();
  return pgxCards(document).find((card) => (card.querySelector("h4")?.textContent || "").trim().toLowerCase() === normalized);
}

function cardText(card) {
  return (card?.textContent || "").replace(/\s+/g, " ").trim();
}

function cardHref(card) {
  return card?.querySelector(".pgx-review-link")?.getAttribute("href") || card?.querySelector("a.text-link")?.getAttribute("href") || "";
}

function cardMedicationNames(document) {
  return pgxCards(document).map((card) => (card.querySelector("h4")?.textContent || "").trim()).filter(Boolean);
}

const base = loadPage("?view=genotype&gene=CYP2D6");
const baseIndex = base.dom.window.DATA_VIEW_INDEX;
if (!baseIndex) {
  fail("DATA_VIEW_INDEX was not created.");
} else {
  if (!baseIndex.relations.length) fail("DATA_VIEW_INDEX has zero relations.");
  if (!baseIndex.canonicalSubstances?.length) fail("DATA_VIEW_INDEX has zero canonical substances.");
  if (!baseIndex.canonicalFacts?.length) fail("DATA_VIEW_INDEX has zero canonical facts.");
  if (!Array.isArray(baseIndex.aliasRows)) fail("DATA_VIEW_INDEX is missing aliasRows.");
  const snapshotText = base.dom.window.document.querySelector(".support-strip")?.textContent || "";
  if (!/Local static data; no runtime uploads/i.test(snapshotText)) {
    fail("Data Views support strip should disclose local static data boundary.");
  }
  if (!snapshotText.includes(String(baseIndex.relations.length))) {
    fail(`Data Views support strip should expose relation count ${baseIndex.relations.length}. Found: ${snapshotText || "(missing)"}`);
  }
  if (!snapshotText.includes(String(baseIndex.genes.length))) {
    fail(`Data Views support strip should expose gene count ${baseIndex.genes.length}. Found: ${snapshotText || "(missing)"}`);
  }
  const bodyText = base.dom.window.document.body.textContent || "";
  if (!/PGx Explorer/i.test(bodyText) || !/Medication-context boundary/i.test(bodyText)) {
    fail("PGx Explorer should expose a visible gene-first title and medication-context safety boundary.");
  }

  const unresolved = baseIndex.relations.filter((row) => row.entityKind === "unresolved");
  if (unresolved.length) {
    fail(`Found ${unresolved.length} unresolved relation subjects. Sample: ${unresolved.slice(0, 5).map((row) => `${row.source}:${row.subject}`).join(", ")}`);
  }

  const brokenLinks = baseIndex.relations.filter((row) => (row.linkSubstances || []).some((name) => !baseIndex.getDrugRecord(name)));
  if (brokenLinks.length) {
    fail(`Found ${brokenLinks.length} relations with broken app link substances. Sample: ${brokenLinks.slice(0, 5).map((row) => `${row.source}:${row.subject}`).join(", ")}`);
  }

  const genotypePhraseLeaks = baseIndex.relations.filter((row) => {
    if (!row.gene) return false;
    const text = `${row.signal || ""} ${row.actionText || ""}`;
    const matches = [...text.matchAll(/\b(CYP\d[A-Z0-9]*|SLCO1B1|ABCB1|ABCG2|DPYD|TPMT|NUDT15|G6PD|VKORC1)\s+(PM|IM|UM|NM|poor metabolizer|intermediate metabolizer|ultrarapid metabolizer)\b/gi)];
    return matches.some((match) => match[1].toUpperCase() !== row.gene);
  });
  if (genotypePhraseLeaks.length) {
    fail(`Found ${genotypePhraseLeaks.length} relations with genotype-status text assigned to a different gene. Sample: ${genotypePhraseLeaks.slice(0, 5).map((row) => `${row.source}:${row.gene}:${row.subject}`).join(", ")}`);
  }

  const codeineCyp3aLeaks = (baseIndex.byGene.CYP3A4 || []).filter((row) =>
    row.subject === "Codeine" && /CYP2D6\s+PM|Complete loss of analgesia|no analgesic effect|activation review/i.test(`${row.signal || ""} ${row.actionText || ""}`));
  if (codeineCyp3aLeaks.length) {
    fail(`Codeine CYP3A4 rows include CYP2D6-specific activation/loss text. Sample: ${codeineCyp3aLeaks.map((row) => `${row.source}:${row.signal}`).slice(0, 5).join(", ")}`);
  }
  const cyp3a4TacrolimusLeaks = (baseIndex.byGene.CYP3A4 || []).filter((row) =>
    row.subject === "Tacrolimus" && /CYP3A5\s+express/i.test(`${row.signal || ""} ${row.actionText || ""}`));
  if (cyp3a4TacrolimusLeaks.length) {
    fail(`CYP3A4 should not own CYP3A5 tacrolimus expression guidance. Sample: ${cyp3a4TacrolimusLeaks.map((row) => `${row.source}:${row.signal}`).slice(0, 5).join(", ")}`);
  }
  const cyp3a5TacrolimusEvidence = (baseIndex.byGene.CYP3A5 || []).filter((row) =>
    row.subject === "Tacrolimus" && /express|clearance|trough|dose/i.test(`${row.signal || ""} ${row.actionText || ""}`));
  if (!cyp3a5TacrolimusEvidence.length) {
    fail("CYP3A5 should retain tacrolimus expression evidence/context.");
  }

  const optionValues = new Set([...base.dom.window.document.querySelectorAll("#geneSearch option")].map((option) => option.value));
  const expectedPickerTargets = (baseIndex.modeledGenotypes || [])
    .filter((item) => (item.phenotypeValues || []).length && item.relationCount > 0)
    .map((item) => item.kind === "risk_variant" ? (item.riskKey || item.label) : item.gene)
    .filter((value) => value && !/CYP[^,;]*\/|\/[^,;]*CYP/i.test(value) && !pathwayContextTargets.has(String(value).toUpperCase()));
  const missingPickerTargets = [...new Set(expectedPickerTargets)].filter((value) => !optionValues.has(value));
  if (missingPickerTargets.length) {
    fail(`PGx picker is missing ${missingPickerTargets.length} reportable targets. Sample: ${missingPickerTargets.slice(0, 10).join(", ")}`);
  }
  const pathwayContextPickerTargets = [...optionValues].filter((value) => pathwayContextTargets.has(String(value).toUpperCase()));
  if (pathwayContextPickerTargets.length) {
    fail(`PGx picker exposes pathway-context genes as reportable PGx targets. Sample: ${pathwayContextPickerTargets.join(", ")}`);
  }
  const compositeCypPickerTargets = [...optionValues].filter((value) => /CYP[^,;]*\/|\/[^,;]*CYP/i.test(value));
  if (compositeCypPickerTargets.length) {
    fail(`PGx picker exposes composite CYP route labels. Sample: ${compositeCypPickerTargets.slice(0, 10).join(", ")}`);
  }
}

for (const search of requiredUrls) {
  const { dom, consoleErrors } = loadPage(search);
  const { document } = dom.window;
  const index = dom.window.DATA_VIEW_INDEX;
  const params = new URLSearchParams(search);
  let view = params.get("view");
  if (view === "network") view = "ranking";

  if (consoleErrors.length) fail(`${search}: console/runtime errors: ${consoleErrors.join(" | ")}`);
  const expectedActiveId = `view-${view}`;
  if (activePanel(document)?.id !== expectedActiveId) {
    fail(`${search}: active panel should be ${expectedActiveId}, found ${activePanel(document)?.id || "(missing)"}.`);
  }
  if (/Unresolved/i.test(activeText(document))) fail(`${search}: visible unresolved text rendered.`);
  if (!index) {
    fail(`${search}: missing DATA_VIEW_INDEX.`);
    continue;
  }

  if (view === "genotype") {
    const requestedTarget = params.get("gene") || "";
    const selectedTarget = document.querySelector("#geneSearch")?.value || "";
    const gene = typeof dom.window.selectedGene === "function"
      ? dom.window.selectedGene()
      : selectedTarget.toUpperCase();
    const relationship = params.get("relationship") || "all";
    const rows = typeof dom.window.filteredGeneRelations === "function"
      ? dom.window.filteredGeneRelations()
      : (index.byGene[gene] || []).filter((row) => relationship === "all" || row.role === relationship);
    const medicationContextCount = genotypeMedicationContextCount(dom.window, rows);
    const relationshipTag = document.querySelector("#geneRelationshipTag")?.textContent || "";
    const expectedScopeLabel = selectedTarget.includes("*") ? selectedTarget : gene;
    if (!params.get("gene") && !params.get("profile")) {
      const text = activeText(document);
      if (selectedTarget) fail(`${search}: PGx Explorer should not select a default gene on first load. Found: ${selectedTarget}.`);
      if (!/Choose a reported gene or marker result/i.test(text) || !/Choose result/i.test(text)) fail(`${search}: PGx Explorer should render a neutral choose-result state.`);
      if (visibleRows(document, "#geneSubstanceRows .pgx-medication-card") !== 0) fail(`${search}: PGx Explorer first load should not render medication cards before a result is selected.`);
      if (/CYP2D6\s+·\s+inherited CYP2D6 activity phenotype/i.test(text)) fail(`${search}: PGx Explorer first load should not show CYP2D6 as a default.`);
    }
    const pickerGroups = [...document.querySelectorAll("#geneSearch optgroup")].map((item) => item.label || "");
    if (pickerGroups.some((label) => /Exploratory coverage genes|Transporter \/ exposure genes/i.test(label))) {
      fail(`${search}: PGx Explorer selector should not expose exploratory coverage groups.`);
    }
    const pickerValues = [...document.querySelectorAll("#geneSearch option")].map((option) => option.value || "");
    if (pickerValues.some((value) => /CYP[^,;]*\/|\/[^,;]*CYP/i.test(value))) {
      fail(`${search}: PGx Explorer selector should not expose composite CYP route labels.`);
    }
    if (/CYP[^,;]*\/|\/[^,;]*CYP/i.test(requestedTarget)) {
      if (/CYP[^,;]*\/|\/[^,;]*CYP/i.test(selectedTarget)) fail(`${search}: composite CYP route URL should not remain selected.`);
      if (selectedTarget || rows.length || visibleRows(document, "#geneSubstanceRows .pgx-medication-card") !== 0) fail(`${search}: composite CYP route URL should render the neutral choose-result state.`);
    }
    if (pathwayContextTargets.has(requestedTarget.toUpperCase())) {
      if (selectedTarget) fail(`${search}: pathway-context gene should not remain selected in PGx Explorer. Found: ${selectedTarget}.`);
      if (rows.length || visibleRows(document, "#geneSubstanceRows .pgx-medication-card") !== 0) fail(`${search}: pathway-context gene should render the neutral choose-result state in PGx Explorer.`);
    }
    if (params.get("profile")) {
      if (!/PGx Profile/i.test(relationshipTag)) fail(`${search}: relationship map tag should show PGx Profile for multi-result URLs. Found: ${relationshipTag || "(missing)"}`);
    } else if (!relationshipTag.toUpperCase().includes(expectedScopeLabel.toUpperCase())) {
      fail(`${search}: relationship map tag is not scoped to ${expectedScopeLabel}. Found: ${relationshipTag || "(missing)"}`);
    }
    if (gene === "CYP3A4" && /CYP2D6\s+PM|Complete loss of analgesia/i.test(document.querySelector("#view-genotype")?.textContent || "")) {
      fail(`${search}: CYP3A4 genotype view includes CYP2D6-specific Codeine clinical text.`);
    }
    if (rows.length && visibleRows(document, "#geneSubstanceRows .pgx-medication-card") === 0) fail(`${search}: genotype view rendered zero medication cards for ${rows.length} index matches.`);
    if (rows.length && !/Affected Medication Contexts/i.test(document.querySelector("#view-genotype")?.textContent || "")) {
      fail(`${search}: PGx Explorer should label grouped medication contexts.`);
    }
    const reviewLinks = [...document.querySelectorAll("#geneSubstanceRows a.pgx-review-link")].map((link) => link.getAttribute("href") || "");
    if (rows.length && !reviewLinks.some((href) => href.includes("index.html?substances="))) {
      fail(`${search}: PGx Explorer medication rows should link back to Diognosis review.`);
    }
    const selectedPhenotype = params.get("phenotype");
    const isRiskMarkerTarget = selectedPhenotype === "risk_allele_present" && /[*:]|deficiency|variant|m\./i.test(requestedTarget);
    const expectedGenotypeToken = gene === "G6PD" && selectedPhenotype === "risk_allele_present"
      ? "G6PD:deficiency"
      : isRiskMarkerTarget
        ? `${requestedTarget}:present`
        : `${gene}:${selectedPhenotype}`;
    if (selectedPhenotype && !reviewLinks.some((href) => href.includes(`genotype=${expectedGenotypeToken}`))) {
      fail(`${search}: PGx Explorer back-links should preserve selected genotype phenotype.`);
    }
    expectPager(document, "#genePager", medicationContextCount, "genotype", search);

    if (gene === "CYP2C19" && selectedPhenotype === "poor_metabolizer") {
      const cards = pgxCards(document);
      const clopidogrel = cardByMedication(document, "Clopidogrel");
      if (!clopidogrel) {
        fail(`${search}: CYP2C19 PM should show Clopidogrel as a medication context.`);
      } else {
        if (cards.indexOf(clopidogrel) > 2) fail(`${search}: Clopidogrel should appear near the top for CYP2C19 PM.`);
        if (!/active thiol|active-metabolite/i.test(cardText(clopidogrel))) fail(`${search}: Clopidogrel card should expose active-thiol / active-metabolite context.`);
        const href = cardHref(clopidogrel);
        if (!/substances=clopidogrel/.test(href) || !/genotype=CYP2C19:poor_metabolizer/.test(href) || !/tab=genes-metabolites/.test(href)) {
          fail(`${search}: Clopidogrel card has incorrect Diognosis back-link: ${href}`);
        }
      }
    }

    if (gene === "CYP2D6" && ["poor_metabolizer", "ultrarapid_metabolizer"].includes(selectedPhenotype)) {
      const codeine = cardByMedication(document, "Codeine");
      if (!codeine) {
        fail(`${search}: CYP2D6 extreme-function context should show Codeine as a medication context.`);
      } else if (!/morphine|active-metabolite/i.test(cardText(codeine))) {
        fail(`${search}: Codeine card should expose morphine / active-metabolite context.`);
      }
      const tramadol = cardByMedication(document, "Tramadol");
      if (!tramadol) {
        fail(`${search}: CYP2D6 extreme-function context should show Tramadol as a medication context.`);
      } else if (!/o-desmethyltramadol|active-metabolite/i.test(cardText(tramadol))) {
        fail(`${search}: Tramadol card should expose O-desmethyltramadol / active-metabolite context.`);
      }
    }

    if (gene === "CYP2D6" && selectedPhenotype === "poor_metabolizer") {
      const metoprolol = cardByMedication(document, "Metoprolol");
      if (!metoprolol) {
        fail(`${search}: CYP2D6 PM should show Metoprolol as a parent-exposure/hemodynamic medication context.`);
      } else if (!/Metoprolol|O-Desmethylmetoprolol|Guideline\/source-linked/i.test(cardText(metoprolol))) {
        fail(`${search}: Metoprolol card should expose source-linked CYP2D6 exposure/metabolite context.`);
      }
      const fluoxetine = cardByMedication(document, "Fluoxetine");
      if (!fluoxetine) {
        fail(`${search}: CYP2D6 PM should show Fluoxetine in the first PGx card page.`);
      } else if (/Risk marker/i.test(cardText(fluoxetine))) {
        fail(`${search}: Fluoxetine should not be mislabeled as a risk marker.`);
      }
    }

    if (["CYP2C9", "VKORC1", "CYP4F2"].includes(gene) && ["poor_metabolizer", "intermediate_metabolizer"].includes(selectedPhenotype)) {
      const warfarin = cardByMedication(document, "Warfarin");
      if (!warfarin) {
        fail(`${search}: ${gene} warfarin PGx context should show Warfarin as a medication context.`);
      } else if (!/Warfarin|INR|dose sensitivity|Vitamin K|Guideline\/source/i.test(cardText(warfarin))) {
        fail(`${search}: Warfarin card should expose algorithm/source-linked anticoagulation context.`);
      }
    }

    if (gene === "SLCO1B1" && selectedPhenotype === "poor_metabolizer") {
      for (const medication of ["Simvastatin", "Atorvastatin", "Rosuvastatin"]) {
        const card = cardByMedication(document, medication);
        if (!card) {
          fail(`${search}: SLCO1B1 reduced function should show ${medication} statin context.`);
        } else if (!/OATP1B1|SLCO1B1|exposure|Guideline\/source/i.test(cardText(card))) {
          fail(`${search}: ${medication} card should expose OATP1B1/statin exposure context.`);
        }
      }
    }

    if (gene === "CYP3A5" && selectedPhenotype === "intermediate_metabolizer") {
      const tacrolimus = cardByMedication(document, "Tacrolimus");
      if (!tacrolimus) {
        fail(`${search}: CYP3A5 expresser context should show Tacrolimus.`);
      } else if (!/Tacrolimus exposure|trough|CYP3A5|Guideline\/source/i.test(cardText(tacrolimus))) {
        fail(`${search}: Tacrolimus card should expose CYP3A5 expression / trough context.`);
      }
      if (/CYP3A4[^\\n]{0,80}CYP3A5 express/i.test(activeText(document))) {
        fail(`${search}: CYP3A5 tacrolimus expression context should not be presented as CYP3A4 guidance.`);
      }
    }

    if (gene === "DPYD" && selectedPhenotype === "poor_metabolizer") {
      const meds = cardMedicationNames(document);
      for (const medication of ["Capecitabine", "Fluorouracil", "Tegafur"]) {
        if (!meds.includes(medication)) fail(`${search}: DPYD PM should show ${medication} as a primary medication context.`);
      }
      if (meds.includes("Fluoropyrimidines")) fail(`${search}: Fluoropyrimidines should not appear as a primary medication row.`);
    }

    if (["TPMT", "NUDT15"].includes(gene) && selectedPhenotype === "poor_metabolizer") {
      for (const medication of ["Azathioprine", "Mercaptopurine", "Thioguanine"]) {
        const card = cardByMedication(document, medication);
        if (!card) {
          fail(`${search}: ${gene} poor function should show ${medication} thiopurine context.`);
        } else if (!/6-TGN|Thioguanine|toxic\/metabolite|Guideline\/source|Metabolite\/source/i.test(cardText(card))) {
          fail(`${search}: ${medication} card should expose thiopurine toxic-metabolite/source context.`);
        }
      }
    }

    if (gene === "UGT1A1" && selectedPhenotype === "poor_metabolizer") {
      const irinotecan = cardByMedication(document, "Irinotecan");
      if (!irinotecan) {
        fail(`${search}: UGT1A1 poor function should show Irinotecan context.`);
      } else if (!/SN-38|toxicity|Guideline\/source/i.test(cardText(irinotecan))) {
        fail(`${search}: Irinotecan card should expose SN-38 toxicity/source context.`);
      }
    }

    if (gene === "G6PD" && selectedPhenotype === "risk_allele_present") {
      const text = activeText(document);
      if (!/Present/i.test(text)) fail(`${search}: G6PD risk-marker status should render as Present.`);
      const meds = cardMedicationNames(document);
      for (const medication of ["Rasburicase", "Primaquine", "Dapsone", "Tafenoquine", "Nitrofurantoin"]) {
        if (!meds.includes(medication)) fail(`${search}: G6PD present should show ${medication} context.`);
      }
      const g6pdLinks = pgxCards(document).map(cardHref).filter(Boolean);
      if (!g6pdLinks.some((href) => /genotype=G6PD:deficiency/.test(href))) {
        fail(`${search}: G6PD medication cards should link back with the Diognosis G6PD deficiency genotype token.`);
      }
    }

    if (requestedTarget === "HLA-B*57:01" && selectedPhenotype === "risk_allele_present") {
      const text = activeText(document);
      if (!/HLA-B\*57:01/i.test(text)) fail(`${search}: HLA-B*57:01 selection should render the exact allele marker.`);
      const abacavir = cardByMedication(document, "Abacavir");
      if (!abacavir) fail(`${search}: HLA-B*57:01 present should show Abacavir context.`);
      if (cardByMedication(document, "Carbamazepine")) fail(`${search}: HLA-B*57:01 should not pull in HLA-B*15:02 Carbamazepine context.`);
      const href = cardHref(abacavir);
      if (!/genotype=HLA-B\*57:01:present/.test(href)) fail(`${search}: HLA-B*57:01 Abacavir link should preserve exact allele marker. Found: ${href}`);
    }

    if (requestedTarget === "HLA-B*15:02" && selectedPhenotype === "risk_allele_present") {
      const text = activeText(document);
      if (!/HLA-B\*15:02/i.test(text)) fail(`${search}: HLA-B*15:02 selection should render the exact allele marker.`);
      for (const medication of ["Carbamazepine", "Oxcarbazepine", "Phenytoin"]) {
        if (!cardByMedication(document, medication)) fail(`${search}: HLA-B*15:02 present should show ${medication} context.`);
      }
      if (cardByMedication(document, "Abacavir")) fail(`${search}: HLA-B*15:02 should not pull in HLA-B*57:01 Abacavir context.`);
      const carbamazepine = cardByMedication(document, "Carbamazepine");
      const href = cardHref(carbamazepine);
      if (!/genotype=HLA-B\*15:02:present/.test(href)) fail(`${search}: HLA-B*15:02 Carbamazepine link should preserve exact allele marker. Found: ${href}`);
    }

    if (params.get("profile")) {
      const text = activeText(document);
      if (!/PGx Profile/i.test(text) || !/3 selected results/i.test(text)) fail(`${search}: PGx Profile should render selected-result summary.`);
      const chips = [...document.querySelectorAll("#profileResultChips .profile-chip")].map((chip) => chip.textContent || "");
      for (const label of ["CYP2D6", "CYP2C19", "HLA-B*57:01"]) {
        if (!chips.some((chip) => chip.includes(label))) fail(`${search}: PGx Profile chips should include ${label}.`);
      }
      for (const medication of ["Clopidogrel", "Codeine", "Abacavir"]) {
        const card = cardByMedication(document, medication);
        if (!card) {
          fail(`${search}: PGx Profile should show ${medication}.`);
          continue;
        }
        const href = cardHref(card);
        for (const token of ["CYP2D6:poor_metabolizer", "CYP2C19:poor_metabolizer", "HLA-B*57:01:present"]) {
          if (!href.includes(`genotype=${token}`)) fail(`${search}: ${medication} profile link should preserve ${token}. Found: ${href}`);
        }
      }
    }
  }

  if (view === "action") {
    const rows = actionExpectedRows(index, params.get("action") || "");
    const text = activeText(document);
    if (rows.length && visibleRows(document, "#actionCards .action-context-card") === 0) fail(`${search}: action view rendered zero medication-context cards for ${rows.length} index matches.`);
    for (const group of ["Use-together review", "Dose/timing review", "Treatment-plan context", "Monitoring review", "Context-only"]) {
      if (!text.includes(group)) fail(`${search}: missing Review Questions group ${group}.`);
    }
    if (/Option review|Review prompts/i.test(text)) fail(`${search}: Review Questions should not expose old option/prompt wording.`);
    const requestedAction = params.get("action") || "";
    if (requestedAction === "digoxin" && !/Digoxin/i.test(text)) fail(`${search}: Review Questions should show digoxin contexts for action=digoxin.`);
    if (requestedAction === "CYP3A4" && !/CYP3A4/i.test(text)) fail(`${search}: Review Questions should show CYP3A4 pathway contexts for action=CYP3A4.`);
    if (/Amitriptyline TCAEvidenceMetaboliteParent|Codeine OpioidMetaboliteEvidenceParent/i.test(text)) {
      fail(`${search}: Review Questions active panel is leaking default CYP2D6 PGx rows.`);
    }
  }

  if (view === "ranking") {
    const rows = Number((document.querySelector("#rankingCountTag")?.textContent.match(/\d+/) || [0])[0]);
    if (rows && visibleRows(document, "#rankingRows tr") === 0) fail(`${search}: ranking view rendered zero rows for ${rows} displayed matches.`);
    expectPager(document, "#rankingPager", rows, "ranking", search);
    if (!document.querySelector("#rankingCountTag")?.textContent.match(/\d+ genes/)) fail(`${search}: ranking view missing visible gene count.`);
    const text = activeText(document);
    if (!/Gene Coverage/i.test(text)) fail(`${search}: ranking view should be labeled Gene Coverage.`);
    if (/Gene Ranking|high-severity burden|high severity|coverage score/i.test(text)) fail(`${search}: Gene Coverage should not use clinical-risk or synthetic-score ranking language.`);
    if (!/Broad pathway genes such as CYP3A4 can rank high/i.test(text) || !/not a patient-risk score/i.test(text) || !/actionable by itself/i.test(text)) {
      fail(`${search}: Gene Coverage should explain broad pathway counts without implying clinical risk or standalone actionability.`);
    }
    if ([...document.querySelectorAll("#rankingSort option")].some((option) => option.value === "score" || /coverage score/i.test(option.textContent || ""))) fail(`${search}: Gene Coverage sort options should not expose synthetic coverage scores.`);
    if (!params.get("sort") && document.querySelector("#rankingSort")?.value !== "priority") fail(`${search}: Gene Coverage should default to priority medication contexts.`);
    const rankedGenes = [...document.querySelectorAll("#rankingRows .rank-gene a")].map((link) => link.textContent.trim()).filter(Boolean);
    if (rankedGenes.some((gene) => /CYP[^,;]*\/|\/[^,;]*CYP/i.test(gene))) fail(`${search}: Gene Coverage should not rank composite CYP route labels as genes.`);
    const firstRankingCells = [...document.querySelectorAll("#rankingRows tr:first-child td")].map((cell) => (cell.textContent || "").replace(/\s+/g, " ").trim());
    if (!params.get("sort") && firstRankingCells.length) {
      const firstGene = firstRankingCells[1] || "";
      const priorityContexts = Number(firstRankingCells[2]);
      const contextRows = Number(firstRankingCells[3]);
      if (!Number.isFinite(priorityContexts) || !Number.isFinite(contextRows) || priorityContexts <= 0 || contextRows <= priorityContexts) {
        fail(`${search}: default Gene Coverage row should show priority contexts before larger raw context rows. Found: ${firstRankingCells.join(" | ")}`);
      }
      if (firstGene === "CYP3A4" && priorityContexts >= 1000) fail(`${search}: CYP3A4 should show priority-context count, not the old volume/score count. Found ${priorityContexts}.`);
    }
    if (!document.querySelector("#rankingRows")?.textContent.includes("CYP2D6")) fail(`${search}: ranking view should expose CYP2D6 in the top coverage page.`);
    const cyp2d6Link = [...document.querySelectorAll("#rankingRows a")].find((link) => link.textContent.trim() === "CYP2D6")?.getAttribute("href") || "";
    if (!cyp2d6Link.includes("data-views.html?view=genotype&gene=CYP2D6")) fail(`${search}: Gene Coverage CYP2D6 row should link into PGx Explorer.`);
    const cyp3a4Link = [...document.querySelectorAll("#rankingRows a")].find((link) => link.textContent.trim() === "CYP3A4")?.getAttribute("href") || "";
    if (cyp3a4Link && !cyp3a4Link.includes("data-views.html?view=action&action=CYP3A4")) fail(`${search}: Gene Coverage CYP3A4 row should link to pathway-context Review Questions, not PGx Explorer.`);
  }

}

if (failures.length) {
  console.error(`data-views audit failed with ${failures.length} issue(s):`);
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok:true,
  urls:requiredUrls.length,
  entities:baseIndex.entities.length,
  canonicalSubstances:baseIndex.canonicalSubstances?.length || 0,
  relations:baseIndex.relations.length,
  canonicalFacts:baseIndex.canonicalFacts?.length || 0,
  aliasCollisions:baseIndex.aliasCollisions?.length || 0,
  genes:baseIndex.genes.length,
}, null, 2));
