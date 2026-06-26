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
  "?view=genotype&gene=CYP2D6",
  "?view=genotype&gene=CYP2D6&phenotype=poor_metabolizer",
  "?view=genotype&gene=CYP2C19&phenotype=poor_metabolizer",
  "?view=genotype&gene=SLCO1B1&relationship=transporter",
  "?view=genotype&gene=ABCB1",
  "?view=genotype&gene=ABCG2",
  "?view=genotype&gene=CYP3A4",
  "?view=genotype&gene=DPYD&phenotype=poor_metabolizer",
  "?view=genotype&gene=G6PD&phenotype=risk_allele_present",
  "?view=genotype&gene=HLA-B*57:01&phenotype=risk_allele_present",
  "?view=genotype&gene=HLA-B*15:02&phenotype=risk_allele_present",
  "?view=genotype&profile=CYP2D6:poor_metabolizer,CYP2C19:poor_metabolizer,HLA-B*57:01:risk_allele_present&gene=CYP2D6&phenotype=poor_metabolizer",
  "?view=action&action=digoxin",
  "?view=ranking&sort=total",
];

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

  const optionValues = new Set([...base.dom.window.document.querySelectorAll("#geneOptions option")].map((option) => option.value));
  const missingGenes = baseIndex.genes.filter((gene) => !optionValues.has(gene));
  if (missingGenes.length) {
    fail(`Gene picker is missing ${missingGenes.length} indexed genes. Sample: ${missingGenes.slice(0, 10).join(", ")}`);
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
    const requestedTarget = params.get("gene") || "CYP2D6";
    const gene = typeof dom.window.selectedGene === "function"
      ? dom.window.selectedGene()
      : requestedTarget.toUpperCase();
    const relationship = params.get("relationship") || "all";
    const rows = typeof dom.window.filteredGeneRelations === "function"
      ? dom.window.filteredGeneRelations()
      : (index.byGene[gene] || []).filter((row) => relationship === "all" || row.role === relationship);
    const medicationContextCount = genotypeMedicationContextCount(dom.window, rows);
    const relationshipTag = document.querySelector("#geneRelationshipTag")?.textContent || "";
    const expectedScopeLabel = requestedTarget.includes("*") ? requestedTarget : gene;
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

    if (gene === "CYP2D6" && selectedPhenotype === "poor_metabolizer") {
      const codeine = cardByMedication(document, "Codeine");
      if (!codeine) {
        fail(`${search}: CYP2D6 PM should show Codeine as a medication context.`);
      } else if (!/morphine|active-metabolite/i.test(cardText(codeine))) {
        fail(`${search}: Codeine card should expose morphine / active-metabolite context.`);
      }
      const fluoxetine = cardByMedication(document, "Fluoxetine");
      if (!fluoxetine) {
        fail(`${search}: CYP2D6 PM should show Fluoxetine in the first PGx card page.`);
      } else if (/Risk marker/i.test(cardText(fluoxetine))) {
        fail(`${search}: Fluoxetine should not be mislabeled as a risk marker.`);
      }
    }

    if (gene === "DPYD" && selectedPhenotype === "poor_metabolizer") {
      const meds = cardMedicationNames(document);
      for (const medication of ["Capecitabine", "Fluorouracil", "Tegafur"]) {
        if (!meds.includes(medication)) fail(`${search}: DPYD PM should show ${medication} as a primary medication context.`);
      }
      if (meds.includes("Fluoropyrimidines")) fail(`${search}: Fluoropyrimidines should not appear as a primary medication row.`);
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
    if (!/Digoxin/i.test(text)) fail(`${search}: Review Questions should show digoxin contexts for action=digoxin.`);
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
    if (/Gene Ranking|high-severity burden|high severity/i.test(text)) fail(`${search}: Gene Coverage should not use clinical-risk ranking language.`);
    if (!document.querySelector("#rankingRows")?.textContent.includes("CYP2D6")) fail(`${search}: ranking view should expose CYP2D6 in the top coverage page.`);
    const cyp2d6Link = [...document.querySelectorAll("#rankingRows a")].find((link) => link.textContent.trim() === "CYP2D6")?.getAttribute("href") || "";
    if (!cyp2d6Link.includes("data-views.html?view=genotype&gene=CYP2D6")) fail(`${search}: Gene Coverage CYP2D6 row should link into PGx Explorer.`);
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
