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

const MAX_ALIAS_COLLISIONS = 30;
const MAX_CLASS_PLACEHOLDERS = 20;
const MAX_DUPLICATE_FACTS = 25;

function scriptSources() {
  const dom = new JSDOM(html);
  return [...dom.window.document.querySelectorAll("script")].map((script) => {
    const src = script.getAttribute("src");
    if (!src) return { filename:"data-views.html:inline", code:script.textContent || "" };
    const file = path.resolve(root, src.replace(/^\.\//, ""));
    return { filename:file, code:fs.readFileSync(file, "utf8") };
  });
}

function loadIndex() {
  const consoleErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("error", (message) => consoleErrors.push(String(message)));
  virtualConsole.on("jsdomError", (error) => consoleErrors.push(error.message));
  const dom = new JSDOM(html, {
    url:"http://localhost/data-views.html?view=ranking",
    runScripts:"outside-only",
    pretendToBeVisual:true,
    virtualConsole,
  });
  const context = dom.getInternalVMContext();
  for (const source of scriptSources()) vm.runInContext(source.code, context, { filename:source.filename });
  return { index:dom.window.DATA_VIEW_INDEX, consoleErrors };
}

const failures = [];
function fail(message) {
  failures.push(message);
}

const { index, consoleErrors } = loadIndex();
if (consoleErrors.length) fail(`Console/runtime errors while loading data views: ${consoleErrors.join(" | ")}`);
if (!index) fail("DATA_VIEW_INDEX missing.");

if (index) {
  const hygiene = index.dataHygiene || {};
  const kindCounts = hygiene.substanceKindCounts || {};
  const relationWithoutFactKey = index.relations.filter((row) => !row.factKey);
  const relationWithoutKinds = index.relations.filter((row) => !row.subjectSubstanceKind);
  const canonicalById = new Map((index.canonicalSubstances || []).map((item) => [item.id, item]));
  const entityMissingCanonical = index.entities.filter((entity) => !canonicalById.has(entity.id));
  const canonicalMissingKind = (index.canonicalSubstances || []).filter((item) => !item.substanceKind);
  const orphanMetabolites = hygiene.orphanMetaboliteSubstances || [];
  const unresolvedSubjects = hygiene.unresolvedRelationSubjects || [];
  const aliasCollisions = hygiene.aliasCollisions || index.aliasCollisions || [];
  const duplicateFacts = hygiene.duplicateFacts || [];
  const classPlaceholders = hygiene.classPlaceholderSubstances || [];

  if (!index.canonicalSubstances?.length) fail("Canonical substance export is empty.");
  if (!index.canonicalFacts?.length) fail("Canonical fact export is empty.");
  if (entityMissingCanonical.length) fail(`Entities missing canonical export rows: ${entityMissingCanonical.slice(0, 10).map((item) => item.name).join(", ")}`);
  if (canonicalMissingKind.length) fail(`Canonical substances missing substanceKind: ${canonicalMissingKind.slice(0, 10).map((item) => item.name).join(", ")}`);
  if (relationWithoutFactKey.length) fail(`Relations missing canonical fact keys: ${relationWithoutFactKey.length}`);
  if (relationWithoutKinds.length) fail(`Relations missing subject substance kind: ${relationWithoutKinds.length}`);
  if (orphanMetabolites.length) fail(`Metabolite substances without parentIds: ${orphanMetabolites.slice(0, 10).join(", ")}`);
  if (unresolvedSubjects.length) fail(`Unresolved relation subjects: ${unresolvedSubjects.slice(0, 10).join(", ")}`);
  if ((kindCounts.parent_drug || 0) < 1000) fail(`Expected at least 1000 parent drugs after classification, found ${kindCounts.parent_drug || 0}.`);
  if ((kindCounts.active_metabolite || 0) < 1000) fail(`Expected at least 1000 active metabolite/active-context substances, found ${kindCounts.active_metabolite || 0}.`);
  if (aliasCollisions.length > MAX_ALIAS_COLLISIONS) {
    fail(`Alias collisions exceed budget ${MAX_ALIAS_COLLISIONS}: ${aliasCollisions.length}. Sample: ${aliasCollisions.slice(0, 5).map((row) => `${row.alias} => ${row.first?.canonicalName} / ${row.second?.canonicalName}`).join("; ")}`);
  }
  if (duplicateFacts.length > MAX_DUPLICATE_FACTS) {
    fail(`Canonical duplicate facts exceed budget ${MAX_DUPLICATE_FACTS}: ${duplicateFacts.length}. Sample: ${duplicateFacts.slice(0, 5).map((row) => `${row.role}:${row.subject}:${row.object}`).join("; ")}`);
  }
  if (classPlaceholders.length > MAX_CLASS_PLACEHOLDERS) {
    fail(`Class placeholders exceed budget ${MAX_CLASS_PLACEHOLDERS}: ${classPlaceholders.length}. Sample: ${classPlaceholders.slice(0, 10).join(", ")}`);
  }

  console.log(JSON.stringify({
    ok:failures.length === 0,
    canonicalSubstances:index.canonicalSubstances.length,
    canonicalFacts:index.canonicalFacts.length,
    aliasRows:index.aliasRows.length,
    aliasCollisions:aliasCollisions.length,
    duplicateFacts:duplicateFacts.length,
    orphanMetabolites:orphanMetabolites.length,
    classPlaceholders:classPlaceholders.length,
    substanceKindCounts:kindCounts,
    budgets:{
      aliasCollisions:MAX_ALIAS_COLLISIONS,
      duplicateFacts:MAX_DUPLICATE_FACTS,
      classPlaceholders:MAX_CLASS_PLACEHOLDERS,
    },
  }, null, 2));
}

if (failures.length) {
  console.error(`data hygiene audit failed with ${failures.length} issue(s):`);
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}
