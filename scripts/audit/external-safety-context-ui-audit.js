#!/usr/bin/env node
import { readFileSync } from 'fs';
import { JSDOM, VirtualConsole } from 'jsdom';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const html = readFileSync('index.html', 'utf8');
const browserErrors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (err) => {
  const msg = err && err.message ? err.message : String(err);
  browserErrors.push(msg);
});
virtualConsole.on('error', (msg) => browserErrors.push(String(msg)));

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  virtualConsole,
  url: 'http://localhost/',
});

await new Promise((resolveReady) => setTimeout(resolveReady, 400));

const report = dom.window.eval(`(() => {
  const fixture = {
    schemaVersion: 1,
    release: "fixture-2026-06",
    summary: { release: "fixture-2026-06" },
    crosswalk: [
      {
        medcheckId: "paroxetine",
        medcheckName: "Paroxetine <img src=x onerror='window.__otXss=1'>",
        medcheckClass: "SSRI",
        openTargetsDrugId: "CHEMBL.PAROXETINE",
        chemblId: "CHEMBL.PAROXETINE",
        openTargetsName: "Paroxetine <img src=x onerror='window.__otXss=1'>",
        blackBoxWarning: "<img src=x onerror='window.__otXss=1'> black-box context",
        hasBeenWithdrawn: false,
        matchStatus: "manual",
        matchConfidence: 1,
      }
    ],
    contextByChemblId: {
      "CHEMBL.PAROXETINE": [
        {
          id: "ot_fixture_faers",
          chemblId: "CHEMBL.PAROXETINE",
          openTargetsDrugId: "CHEMBL.PAROXETINE",
          openTargetsRelease: "fixture-2026-06 <img src=x onerror='window.__otXss=1'>",
          openTargetsSourceDataset: "faersSignificant",
          sourceCategory: "open_targets_context",
          importedContextOnly: true,
          notSeverityBearing: true,
          reviewRequired: true,
          reviewDecision: "unreviewed",
          factType: "faersSignificant",
          label: "FAERS ADR <script>window.__otXss=1</script>",
          warningType: "serotonin syndrome <img src=x onerror='window.__otXss=1'>",
          sourceEvidenceLevel: "signal only; confounding possible",
          source: "Open Targets pharmacovigilance <img src=x onerror='window.__otXss=1'>",
        },
        {
          id: "ot_fixture_pgx",
          chemblId: "CHEMBL.PAROXETINE",
          openTargetsSourceDataset: "pharmacogenetics",
          factType: "pharmacogenetics",
          label: "CYP2D6 response annotation <svg onload='window.__otXss=1'></svg>",
          targetGene: "CYP2D6<script>",
          sourceEvidenceLevel: "ClinPGx level 2A",
          drugResponseCategory: "toxicity",
          riskMarker: "*4/*4 <img src=x onerror='window.__otXss=1'>",
          source: "ClinPGx / PharmGKB <script>window.__otXss=1</script>",
        },
        {
          id: "ot_fixture_target_safety",
          chemblId: "CHEMBL.PAROXETINE",
          openTargetsSourceDataset: "targetSafety",
          factType: "targetSafety",
          label: "hERG / KCNH2 liability <math><mtext>x</mtext></math>",
          targetGene: "KCNH2 <img src=x onerror='window.__otXss=1'>",
          sourceEvidenceLevel: "curated target safety <iframe srcdoc='<script>window.__otXss=1</script>'></iframe>",
          source: "Open Targets target safety <object data='javascript:alert(1)'></object>",
        }
      ]
    },
    truncatedContextCounts: {},
  };

  activeStack = ["Paroxetine", "Codeine"];
  renderAll();
  const before = calcRisk();
  const beforeJson = JSON.stringify(before);
  const contexts = collectOpenTargetsSafetyContext(activeStack, fixture);
  renderExternalSafetyContext(fixture);
  const after = calcRisk();
  const body = document.getElementById("externalContextBody");
  const section = document.getElementById("externalContextSection");
  const actualEventAttrs = Array.from(body.querySelectorAll("*")).flatMap(el =>
    Array.from(el.attributes).filter(attr => /^on/i.test(attr.name)).map(attr => attr.name)
  );
  const javascriptHrefs = Array.from(body.querySelectorAll("[href]"))
    .map(el => el.getAttribute("href") || "")
    .filter(href => /^javascript:/i.test(href));
  const dangerousTagCount = body.querySelectorAll("img,script,svg,math,iframe,object,embed,style,link").length;

  return {
    contextCount: contexts.length,
    cardCount: body.querySelectorAll(".external-context-card").length,
    sectionVisible: section.style.display !== "none",
    countText: document.getElementById("externalContextCount").textContent,
    riskSame: beforeJson === JSON.stringify(after),
    beforeScore: before.score,
    afterScore: after.score,
    warningCountBefore: before.interactions.length,
    warningCountAfter: after.interactions.length,
    xssFlag: window.__otXss === 1,
    actualImages: body.querySelectorAll("img").length,
    actualScripts: body.querySelectorAll("script").length,
    dangerousTagCount,
    actualEventAttrs,
    javascriptHrefs,
    reviewBadges: body.querySelectorAll(".ev-review-badge.needs-review").length,
    contextOnlyNotes: (body.textContent.match(/Context only/g) || []).length,
    text: body.textContent,
  };
})()`);

assert(browserErrors.length === 0, `External safety context UI audit emitted browser errors: ${browserErrors.join('; ')}`);
assert(report.contextCount === 4, `Expected four fixture context cards, got ${report.contextCount}`);
assert(report.cardCount === 4, `Expected four rendered context cards, got ${report.cardCount}`);
assert(report.sectionVisible === true, 'External safety context section should be visible for fixture context');
assert(report.countText.includes('not risk-scoring'), `Expected non-scoring count label, got ${report.countText}`);
assert(report.riskSame === true, `External context cards must not alter calcRisk(); before ${report.beforeScore}, after ${report.afterScore}`);
assert(report.warningCountBefore === report.warningCountAfter, 'External context cards changed interaction count');
assert(report.xssFlag === false, 'Malicious imported fixture executed script/event handler');
assert(report.actualImages === 0, 'Malicious imported fixture created an image element');
assert(report.actualScripts === 0, 'Malicious imported fixture created a script element');
assert(report.dangerousTagCount === 0, `Malicious imported fixture created dangerous DOM tags: ${report.dangerousTagCount}`);
assert(report.actualEventAttrs.length === 0, `Rendered context contains inline event attributes: ${report.actualEventAttrs.join(', ')}`);
assert(report.javascriptHrefs.length === 0, 'Rendered context contains javascript: hrefs');
assert(report.reviewBadges === 4, `Expected every card to carry a review badge, got ${report.reviewBadges}`);
assert(report.contextOnlyNotes === 4, `Expected every card to state context-only status, got ${report.contextOnlyNotes}`);
assert(report.text.includes('needs Diognosis review'), 'Expected Diognosis review badge text');

console.log('External safety context UI audit passed: imported context renders safely and does not alter calcRisk().');
