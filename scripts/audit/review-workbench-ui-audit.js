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
  activeStack = ["Paroxetine", "Codeine"];
  renderAll();
  const beforeRisk = JSON.stringify(calcRisk());
  renderReviewWorkbench();
  const afterRisk = JSON.stringify(calcRisk());
  const body = document.getElementById("reviewWorkbenchBody");
  const section = document.getElementById("reviewWorkbenchSection");
  const firstRows = body.querySelectorAll('[data-review-kind="first_target"]').length;
  const pgxRows = body.querySelectorAll('[data-review-kind="pgx"]').length;
  const promotionRows = body.querySelectorAll('[data-review-kind="promotion"]').length;
  const internalRows = body.querySelectorAll('[data-review-kind="internal"]').length;
  const realRowCount = body.querySelectorAll(".review-workbench-row").length;
  const filter = body.querySelector('[data-review-workbench-filter="pgx"]');
  filter?.click();
  const visibleKinds = Array.from(body.querySelectorAll(".review-workbench-row"))
    .filter(row => row.style.display !== "none")
    .map(row => row.getAttribute("data-review-kind"));

  renderReviewWorkbench({
    snapshot: {
      crosswalk: [
        { medcheckName:"Paroxetine", medcheckId:"paroxetine", chemblId:"CHEMBL_XSS", openTargetsDrugId:"CHEMBL_XSS" }
      ]
    },
    evidenceQueue: [
      {
        id:"ev_xss",
        title:"<img src=x onerror='window.__reviewWorkbenchXss=1'>",
        evidenceType:"guideline<script>",
        source:"javascript:alert(1)",
        professionalReviewStatus:"pending_professional_review",
        reviewDecision:"unreviewed",
        priorityTier:"critical_review",
        priorityScore:99,
        priorityReasons:["<script>window.__reviewWorkbenchXss=1</script>"],
        calculationBearing:true,
        severeCriticalPairs:[{ pair:"Paroxetine + Codeine", severity:"severe" }]
      }
    ],
    reviewTargets: [
      {
        medcheckName:"Paroxetine",
        chemblId:"CHEMBL_XSS",
        genes:["CYP2D6<script>", "UGT1A1<img src=x onerror='window.__reviewWorkbenchXss=1'>"],
        status:"completed_review_target",
        disposition:"linked_to_diognosis_evidence",
        linkedContextRowCount:1,
        evidenceRefs:["ev_xss"],
        scenarioId:"xss",
        evidenceTask:"<img src=x onerror='window.__reviewWorkbenchXss=1'>",
        coverage:{ selectorGenes:["CYP2D6"], metaboliteRules:[], warningCardGenes:[] }
      }
    ],
    pgxRoadmap: {
      pairs: [
        {
          medcheckName:"Paroxetine",
          chemblId:"CHEMBL_XSS",
          gene:"CYP2D6<script>",
          classification:"covered_keep_context",
          promotionDecision:"keep_context",
          riskMarker:"<img src=x onerror='window.__reviewWorkbenchXss=1'>",
          reviewerRationale:"<script>window.__reviewWorkbenchXss=1</script>"
        }
      ]
    },
    promotionQueue: [
      {
        id:"ot_xss",
        medcheckNames:["Paroxetine", "Codeine <img src=x onerror='window.__reviewWorkbenchXss=1'>"],
        chemblId:"CHEMBL_XSS",
        dataset:"faersSignificant",
        label:"FAERS <img src=x onerror='window.__reviewWorkbenchXss=1'>",
        reviewDecision:"keep_context",
        priorityScore:50,
        release:"fixture <script>window.__reviewWorkbenchXss=1</script>",
        targetGene:"CYP2D6 <svg onload='window.__reviewWorkbenchXss=1'></svg>",
        sourceEvidenceLevel:"signal <math><mtext>x</mtext></math>",
        suggestedAction:"<script>window.__reviewWorkbenchXss=1</script>",
        notSeverityBearing:true
      }
    ]
  });
  const maliciousBody = document.getElementById("reviewWorkbenchBody");
  const actualEventAttrs = Array.from(maliciousBody.querySelectorAll("*")).flatMap(el =>
    Array.from(el.attributes).filter(attr => /^on/i.test(attr.name)).map(attr => attr.name)
  );
  const javascriptHrefs = Array.from(maliciousBody.querySelectorAll("[href]"))
    .map(el => el.getAttribute("href") || "")
    .filter(href => /^javascript:/i.test(href));
  const dangerousTagCount = maliciousBody.querySelectorAll("img,script,svg,math,iframe,object,embed,style,link").length;

  return {
    sectionVisible: section.style.display !== "none",
    countText: document.getElementById("reviewWorkbenchCount").textContent,
    rowCount: realRowCount,
    firstRows,
    pgxRows,
    promotionRows,
    internalRows,
    visibleKinds,
    riskSame: beforeRisk === afterRisk,
    maliciousImages: maliciousBody.querySelectorAll("img").length,
    maliciousScripts: maliciousBody.querySelectorAll("script").length,
    dangerousTagCount,
    actualEventAttrs,
    javascriptHrefs,
    xssFlag: window.__reviewWorkbenchXss === 1,
    text: maliciousBody.textContent,
  };
})()`);

assert(browserErrors.length === 0, `Review workbench UI emitted browser errors: ${browserErrors.join('; ')}`);
assert(report.sectionVisible === true, 'Review workbench should be visible for a stack with generated review data');
assert(/review row/i.test(report.countText), `Review workbench count should report rows, got "${report.countText}"`);
assert(report.rowCount > 0, 'Expected review workbench rows');
assert(report.firstRows > 0, 'Expected first-review target rows for Codeine/Paroxetine stack');
assert(report.pgxRows > 0, 'Expected PGx roadmap rows for Codeine/Paroxetine stack');
assert(report.promotionRows > 0, 'Expected Open Targets promotion rows for Codeine/Paroxetine stack');
assert(report.internalRows > 0, 'Expected internal evidence review rows for Codeine/Paroxetine stack');
assert(report.visibleKinds.length > 0 && report.visibleKinds.every(kind => kind === 'pgx'), 'PGx filter should hide non-PGx rows');
assert(report.riskSame === true, 'Rendering the review workbench must not alter calcRisk()');
assert(report.maliciousImages === 0, 'Malicious review fixture created an image element');
assert(report.maliciousScripts === 0, 'Malicious review fixture created a script element');
assert(report.dangerousTagCount === 0, `Malicious review fixture created dangerous DOM tags: ${report.dangerousTagCount}`);
assert(report.actualEventAttrs.length === 0, `Review workbench rendered inline event attributes: ${report.actualEventAttrs.join(', ')}`);
assert(report.javascriptHrefs.length === 0, 'Review workbench rendered javascript: hrefs');
assert(report.xssFlag === false, 'Malicious review fixture executed script/event handler');
assert(report.text.includes('FAERS'), 'Expected fixture text to render as escaped review text');

console.log(`Review workbench UI audit passed: ${report.rowCount} real rows, filters work, no risk mutation or unsafe imported HTML.`);
