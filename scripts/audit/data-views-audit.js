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
  "?view=genotype&gene=CYP2C19",
  "?view=genotype&gene=SLCO1B1&relationship=transporter",
  "?view=genotype&gene=ABCB1",
  "?view=genotype&gene=ABCG2",
  "?view=genotype&gene=CYP3A4",
  "?view=genotype&gene=DPYD",
  "?view=action&action=digoxin",
  "?view=classes&class=SSRI",
  "?view=ranking&sort=total",
  "?view=patient&patientProfile=CYP2D6 PM, CYP2C19 PM, SLCO1B1 PM&patientMeds=Codeine,Fluoxetine,Tamoxifen,Metoprolol,Warfarin,Fluconazole",
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

function classExpectedRows(index, classQuery) {
  const query = classQuery.toLowerCase();
  return index.relations.filter((row) => (row.class || "").toLowerCase().includes(query) || row.subject.toLowerCase().includes(query));
}

function patientExpectedRows(index, profileText, medsText) {
  const meds = medsText.split(",").map((item) => item.trim()).filter(Boolean);
  const medKeys = new Set(meds.map(index.normalize));
  const profileGenes = new Set(index.genes.filter((gene) => profileText.toUpperCase().includes(gene)));
  return index.relations.filter((row) => {
    const medHit = medKeys.has(index.normalize(row.subject)) || medKeys.has(index.normalize(row.object));
    const geneHit = row.gene && profileGenes.has(row.gene);
    const pairHit = row.object && medKeys.has(index.normalize(row.subject)) && medKeys.has(index.normalize(row.object));
    return pairHit || (medHit && (geneHit || row.source === "KNOWN_DDI" || row.source === "TRANSPORTER_DDI"));
  });
}

const base = loadPage("?view=genotype&gene=CYP2D6");
const baseIndex = base.dom.window.DATA_VIEW_INDEX;
if (!baseIndex) {
  fail("DATA_VIEW_INDEX was not created.");
} else {
  if (!baseIndex.relations.length) fail("DATA_VIEW_INDEX has zero relations.");

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
    const relationshipTag = document.querySelector("#geneRelationshipTag")?.textContent || "";
    if (!relationshipTag.toUpperCase().includes(gene)) fail(`${search}: relationship map tag is not scoped to ${gene}. Found: ${relationshipTag || "(missing)"}`);
    if (gene === "CYP3A4" && /CYP2D6\s+PM|Complete loss of analgesia/i.test(document.querySelector("#view-genotype")?.textContent || "")) {
      fail(`${search}: CYP3A4 genotype view includes CYP2D6-specific Codeine clinical text.`);
    }
    if (rows.length && visibleRows(document, "#geneSubstanceRows tr") === 0) fail(`${search}: genotype view rendered zero rows for ${rows.length} index matches.`);
    expectPager(document, "#genePager", rows.length, "genotype", search);
  }

  if (view === "action") {
    const rows = actionExpectedRows(index, params.get("action") || "");
    if (rows.length && visibleRows(document, "#actionCards .row") === 0) fail(`${search}: action view rendered zero rows for ${rows.length} index matches.`);
    for (const group of ["Avoid", "Adjust Dose", "Switch/Alternative", "Monitor", "Informational"]) {
      if (!document.querySelector("#actionCards")?.textContent.includes(group)) fail(`${search}: missing action group ${group}.`);
    }
  }

  if (view === "classes") {
    const rows = classExpectedRows(index, params.get("class") || "");
    if (rows.length && visibleRows(document, "#classList .row") === 0) fail(`${search}: class view rendered zero rows for ${rows.length} index matches.`);
    if (!document.querySelector("#classCountTag")?.textContent.match(/\d+ groups/)) fail(`${search}: class view missing visible group count.`);
  }

  if (view === "ranking") {
    const rows = Number((document.querySelector("#rankingCountTag")?.textContent.match(/\d+/) || [0])[0]);
    if (rows && visibleRows(document, "#rankingRows tr") === 0) fail(`${search}: ranking view rendered zero rows for ${rows} displayed matches.`);
    expectPager(document, "#rankingPager", rows, "ranking", search);
    if (!document.querySelector("#rankingCountTag")?.textContent.match(/\d+ genes/)) fail(`${search}: ranking view missing visible gene count.`);
    if (!document.querySelector("#rankingRows")?.textContent.includes("CYP2D6")) fail(`${search}: ranking view should expose CYP2D6 in the top ranking page.`);
  }

  if (view === "patient") {
    const rows = patientExpectedRows(index, params.get("patientProfile") || "", params.get("patientMeds") || "");
    if (rows.length && visibleRows(document, "#patientImpactList .row") === 0) fail(`${search}: patient view rendered zero rows for ${rows.length} index matches.`);
    expectPager(document, "#patientPager", rows.length, "patient", search);
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
  relations:baseIndex.relations.length,
  genes:baseIndex.genes.length,
}, null, 2));
