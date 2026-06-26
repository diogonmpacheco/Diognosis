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
  "?view=genotype&gene=CYP2C19",
  "?view=genotype&gene=SLCO1B1&relationship=transporter",
  "?view=genotype&gene=ABCB1",
  "?view=genotype&gene=ABCG2",
  "?view=genotype&gene=CYP3A4",
  "?view=genotype&gene=DPYD",
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

function visibleRows(document, selector) {
  return [...document.querySelectorAll(selector)].filter((node) => !/No indexed|No matching|No edges|No impacts/.test(node.textContent || "")).length;
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

function genotypeMedicationContextCount(index, rows) {
  const contexts = new Set();
  for (const row of rows) {
    const subjectDrug = index.getDrugRecord(row.subject);
    if (subjectDrug) {
      contexts.add(subjectDrug.name);
      continue;
    }
    const linked = (row.linkSubstances || [])
      .map((name) => index.getDrugRecord(name))
      .find(Boolean);
    if (linked) contexts.add(linked.name);
  }
  return contexts.size;
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
  if (/Unresolved/i.test(document.body.textContent || "")) fail(`${search}: visible unresolved text rendered.`);
  if (!index) {
    fail(`${search}: missing DATA_VIEW_INDEX.`);
    continue;
  }

  if (view === "genotype") {
    const gene = (params.get("gene") || "CYP2D6").toUpperCase();
    const relationship = params.get("relationship") || "all";
    const rows = (index.byGene[gene] || []).filter((row) => relationship === "all" || row.role === relationship);
    const medicationContextCount = genotypeMedicationContextCount(index, rows);
    const relationshipTag = document.querySelector("#geneRelationshipTag")?.textContent || "";
    if (!relationshipTag.toUpperCase().includes(gene)) fail(`${search}: relationship map tag is not scoped to ${gene}. Found: ${relationshipTag || "(missing)"}`);
    if (gene === "CYP3A4" && /CYP2D6\s+PM|Complete loss of analgesia/i.test(document.querySelector("#view-genotype")?.textContent || "")) {
      fail(`${search}: CYP3A4 genotype view includes CYP2D6-specific Codeine clinical text.`);
    }
    if (rows.length && visibleRows(document, "#geneSubstanceRows tr") === 0) fail(`${search}: genotype view rendered zero rows for ${rows.length} index matches.`);
    if (rows.length && !/Affected Medication Contexts/i.test(document.querySelector("#view-genotype")?.textContent || "")) {
      fail(`${search}: PGx Explorer should label grouped medication contexts.`);
    }
    const reviewLinks = [...document.querySelectorAll("#geneSubstanceRows a.pgx-review-link")].map((link) => link.getAttribute("href") || "");
    if (rows.length && !reviewLinks.some((href) => href.includes("index.html?substances="))) {
      fail(`${search}: PGx Explorer medication rows should link back to Diognosis review.`);
    }
    if (params.get("phenotype") && !reviewLinks.some((href) => href.includes(`genotype=${gene}:${params.get("phenotype")}`))) {
      fail(`${search}: PGx Explorer back-links should preserve selected genotype phenotype.`);
    }
    expectPager(document, "#genePager", medicationContextCount, "genotype", search);
  }

  if (view === "action") {
    const rows = actionExpectedRows(index, params.get("action") || "");
    if (rows.length && visibleRows(document, "#actionCards .row") === 0) fail(`${search}: action view rendered zero rows for ${rows.length} index matches.`);
    for (const group of ["Use-together review", "Dose/timing review", "Option review", "Monitoring review", "Context only"]) {
      if (!document.querySelector("#actionCards")?.textContent.includes(group)) fail(`${search}: missing action group ${group}.`);
    }
  }

  if (view === "ranking") {
    const rows = Number((document.querySelector("#rankingCountTag")?.textContent.match(/\d+/) || [0])[0]);
    if (rows && visibleRows(document, "#rankingRows tr") === 0) fail(`${search}: ranking view rendered zero rows for ${rows} displayed matches.`);
    expectPager(document, "#rankingPager", rows, "ranking", search);
    if (!document.querySelector("#rankingCountTag")?.textContent.match(/\d+ genes/)) fail(`${search}: ranking view missing visible gene count.`);
    if (!document.querySelector("#rankingRows")?.textContent.includes("CYP2D6")) fail(`${search}: ranking view should expose CYP2D6 in the top ranking page.`);
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
