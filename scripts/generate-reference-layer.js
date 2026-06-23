#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import { loadDiognosisData, normalizeName } from './lib/diognosis-source-loader.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const GUIDE_PATH = resolve(ROOT, 'data/medication-class-guides.json');
const INDEX_PATH = resolve(ROOT, 'index.html');
const REFERENCE_PATH = resolve(ROOT, 'reference/index.html');
const FACTS_JSON_PATH = resolve(ROOT, 'data/diognosis-facts.json');
const FACTS_JSONL_PATH = resolve(ROOT, 'data/diognosis-facts.jsonl');
const LLMS_PATH = resolve(ROOT, 'llms.txt');
const SITEMAP_PATH = resolve(ROOT, 'sitemap.xml');
const CHECK_ONLY = process.argv.includes('--check');
const BASE_URL = 'https://diogonmpacheco.github.io/Diognosis/';
const BOUNDARY = 'Educational medication-safety reference only. Not medical advice, not a clinical decision support system, and not professionally reviewed. Do not start, stop, or change medicines without a qualified doctor or pharmacist.';

function html(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeJsonScript(value) {
  return JSON.stringify(value, null, 2).replace(/<\//g, '<\\/');
}

function slug(value) {
  return String(value || 'fact')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'fact';
}

function encodeUrlValue(value) {
  return encodeURIComponent(value)
    .replace(/%2C/g, ',')
    .replace(/%3A/g, ':');
}

function readGuideSource() {
  return JSON.parse(readFileSync(GUIDE_PATH, 'utf8'));
}

function buildSubstanceResolver(data) {
  const map = new Map();
  const add = (value, drug) => {
    const key = normalizeName(value);
    if (key && !map.has(key)) map.set(key, drug);
  };

  for (const drug of data.DRUG_DB || []) {
    const aliases = [
      drug.name,
      drug.id,
      ...(drug.brandNames || []),
      ...(drug.aliases || []),
      ...(typeof data.getDrugAliases === 'function' ? data.getDrugAliases(drug) : []),
    ];
    for (const alias of aliases) add(alias, drug);
  }

  return (value) => map.get(normalizeName(value)) || null;
}

function unique(values = []) {
  return [...new Set(values.filter((value) => value != null && String(value).trim() !== ''))];
}

function exampleHref(example, audience = 'patient') {
  const params = [
    ['substances', example.substances.join(',')],
    ...(example.genotypes || []).map((genotype) => ['genotype', genotype]),
    ['audience', audience],
    ['tab', 'overview'],
  ];
  return `./index.html?${params.map(([key, value]) => `${encodeURIComponent(key)}=${encodeUrlValue(value)}`).join('&')}`;
}

function absoluteUrl(relativePath) {
  return new URL(relativePath.replace(/^\.\//, ''), BASE_URL).toString();
}

function textContent(document, selector) {
  return String(document.querySelector(selector)?.textContent || '').replace(/\s+/g, ' ').trim();
}

function loadRuntime() {
  if (!existsSync(INDEX_PATH)) {
    throw new Error('index.html is missing. Run npm run build before generating the reference layer.');
  }
  const browserErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('error', (message) => browserErrors.push(String(message)));
  virtualConsole.on('jsdomError', (error) => browserErrors.push(error.message));
  const dom = new JSDOM(readFileSync(INDEX_PATH, 'utf8'), {
    runScripts:'dangerously',
    resources:'usable',
    pretendToBeVisual:true,
    virtualConsole,
    url:'http://localhost/index.html',
  });
  return { dom, browserErrors };
}

async function waitForRuntime(dom) {
  await new Promise((resolveReady) => setTimeout(resolveReady, 500));
  const ready = dom.window.eval(`typeof renderAll === "function" && typeof buildPublicFindingPresentations === "function"`);
  if (!ready) throw new Error('Diognosis runtime did not load expected presentation APIs.');
}

function runtimeJson(window, expression) {
  return window.eval(`JSON.parse(JSON.stringify(${expression}))`);
}

function resetRuntime(window, example, audience) {
  const path = exampleHref(example, audience).replace(/^\./, '');
  window.history.replaceState(null, '', path);
  window.loadUrlDemoState();
  window.eval(`renderComputationCache = null;
    currentInteractionFindings = [];
    currentClinicalConcerns = [];
    currentPublicFindingPresentations = [];
    if (typeof drugDoses !== "undefined") Object.keys(drugDoses).forEach(k => delete drugDoses[k]);`);
  window.setAudienceMode(audience, { render:false });
  window.renderAll();
}

function renderAudience(window, example, audience) {
  resetRuntime(window, example, audience);
  const { document } = window;
  const titleSelector = audience === 'patient'
    ? '#findingBody .patient-question-card .patient-question-title'
    : '#findingBody .primary-finding-card .finding-title';
  const bodySelector = audience === 'patient'
    ? '#findingBody .patient-question-card .finding-discussion-text'
    : '#findingBody .primary-finding-card .finding-discussion-text';
  const titles = [...document.querySelectorAll(titleSelector)].map((node) => node.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const bodies = [...document.querySelectorAll(bodySelector)].map((node) => node.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const cache = runtimeJson(window, `(() => {
    const cache = getRenderComputationCache();
    const presentations = buildPublicFindingPresentations(cache.clinicalConcerns || []);
    return {
      presentations:presentations.map(p => ({
        id:p.id,
        title:p.title,
        severity:p.severity,
        affectedSubstances:p.affectedSubstances || [],
        whatChanged:p.whatChanged,
        whyItMatters:p.whyItMatters,
        whatToReview:p.whatToReview,
        evidenceSummary:p.evidenceSummary,
        tags:p.tags || [],
        evidenceRefs:p.trustContract?.evidenceRefs || p.evidenceRefs || p.sourceFinding?.evidenceRefs || [],
        sourceLinked:!!p.trustContract?.sourceLinked,
        reviewed:!!p.trustContract?.reviewed,
        clinicalReviewStatus:p.trustContract?.clinicalReviewStatus || "professional sign-off not claimed",
        concernCategory:p.trustContract?.concernCategory || p.sourceFinding?.clinicalConcernDomain || "",
        expectedChange:p.trustContract?.expectedChange || "",
        sourceFindingTitle:p.sourceFinding?.title || "",
        sourceFindingEvidenceStatus:p.sourceFinding?.evidenceStatus || ""
      })),
      clinicalConcerns:(cache.clinicalConcerns || []).map(c => ({
        title:c.title,
        severity:c.severity,
        clinicalConcernDomain:c.clinicalConcernDomain,
        evidenceRefs:c.evidenceRefs || [],
        evidenceStatus:c.evidenceStatus || ""
      }))
    };
  })()`);
  return {
    titles,
    bodies,
    topTitle:titles[0] || '',
    topBody:bodies[0] || '',
    summary:textContent(document, '#summaryBar'),
    presentations:cache.presentations,
    clinicalConcerns:cache.clinicalConcerns,
  };
}

function evidenceDetails(window, refs) {
  const jsonRefs = JSON.stringify(refs);
  const details = runtimeJson(window, `(() => {
    const refs = ${jsonRefs};
    return refs.map(ref => {
      const study = typeof getStudy === "function" ? getStudy(ref) : (typeof STUDY_DB !== "undefined" ? STUDY_DB[ref] : null);
      const url = typeof publicEvidenceReferenceUrl === "function" ? publicEvidenceReferenceUrl(ref) : "";
      return {
        ref,
        title:study?.title || ref,
        type:study?.type || "",
        pmid:study?.pmid || "",
        doi:study?.doi || "",
        url:url || study?.url || ""
      };
    });
  })()`);
  return details.map((source) => ({
    ...source,
    directUrl:!isInternalAdapterRef(source.ref) && !!source.url,
  }));
}

function isInternalAdapterRef(ref = '') {
  return /(?:coverage_adapter|enrichment_adapter|expansion_pack_adapter|review_adapter)/i.test(String(ref || ''));
}

function buildFact(window, data, resolveSubstance, guide, example, index) {
  const patient = renderAudience(window, example, 'patient');
  const clinician = renderAudience(window, example, 'clinician');
  const presentation = clinician.presentations[0] || patient.presentations[0] || {};
  const refs = unique([
    ...(presentation.evidenceRefs || []),
    ...(clinician.clinicalConcerns[0]?.evidenceRefs || []),
  ]);
  const resolvedSubstances = (example.substances || []).map((value) => {
    const drug = resolveSubstance(value);
    return {
      input:value,
      name:drug?.name || value,
      id:drug?.id || value,
      class:drug?.cls || '',
    };
  });
  const version = runtimeJson(window, `({ engine:DIOGNOSIS_VERSION.engine, drugDb:DIOGNOSIS_VERSION.drugDb, schema:DIOGNOSIS_VERSION.schema, released:DIOGNOSIS_VERSION.released })`);
  const stats = runtimeJson(window, `typeof DIOGNOSIS_STATS !== "undefined" ? DIOGNOSIS_STATS : { generatedAt:"" }`);
  const evidenceSources = evidenceDetails(window, refs);
  const id = slug(`${guide.id}-${example.id || index}`);
  const lastmod = String(stats.generatedAt || version.released || '').slice(0, 10) || version.released || '2026-06-10';
  const sourceUrls = unique(evidenceSources.filter((source) => source.directUrl).map((source) => source.url).filter(Boolean));

  return {
    schema:'diognosis.reference-fact.v1',
    id,
    label:example.label,
    guideId:guide.id,
    guideTitle:guide.title,
    factType:(example.genotypes || []).length ? 'interaction_or_pgx_example' : 'interaction_example',
    substances:resolvedSubstances,
    genotypes:example.genotypes || [],
    severity:presentation.severity || clinician.clinicalConcerns[0]?.severity || 'info',
    priority:presentation.severity || clinician.clinicalConcerns[0]?.severity || 'info',
    patientSummary:patient.topTitle,
    patientQuestion:patient.topBody,
    clinicianSummary:clinician.topTitle || presentation.title || '',
    mechanismSummary:presentation.whatChanged || clinician.topBody || '',
    clinicalRationale:presentation.whyItMatters || '',
    reviewAction:presentation.whatToReview || '',
    evidenceSummary:presentation.evidenceSummary || clinician.clinicalConcerns[0]?.evidenceStatus || '',
    evidenceStatus:clinician.clinicalConcerns[0]?.evidenceStatus || presentation.evidenceSummary || '',
    evidenceRefs:refs,
    evidenceSources,
    sourceUrls,
    sourceLinked:!!presentation.sourceLinked || refs.length > 0,
    professionalReviewStatus:presentation.clinicalReviewStatus || 'professional sign-off not claimed',
    professionalReviewed:!!presentation.reviewed,
    boundary:BOUNDARY,
    appUrl:absoluteUrl(exampleHref(example, 'patient')),
    clinicianAppUrl:absoluteUrl(exampleHref(example, 'clinician')),
    referenceUrl:absoluteUrl(`reference/index.html#${id}`),
    generatedFrom:{
      source:'data/medication-class-guides.json',
      exampleId:example.id,
      validation:example.validation || '',
    },
    version,
    generatedAt:stats.generatedAt || '',
    lastmod,
  };
}

function validateFacts(facts, browserErrors) {
  const failures = [];
  const fail = (message) => failures.push(message);
  if (browserErrors.length) fail(`Runtime browser errors: ${browserErrors.join(' | ')}`);
  if (facts.length < 50 || facts.length > 100) fail(`Reference layer should expose 50-100 facts, got ${facts.length}.`);
  const ids = new Set();
  for (const fact of facts) {
    if (ids.has(fact.id)) fail(`Duplicate fact id: ${fact.id}`);
    ids.add(fact.id);
    if (!fact.patientSummary) fail(`${fact.id} is missing patientSummary.`);
    if (!fact.patientQuestion) fail(`${fact.id} is missing patientQuestion.`);
    if (!fact.clinicianSummary) fail(`${fact.id} is missing clinicianSummary.`);
    if (!fact.mechanismSummary) fail(`${fact.id} is missing mechanismSummary.`);
    if (!fact.evidenceStatus && !fact.evidenceSummary) fail(`${fact.id} is missing evidence status.`);
    if (!fact.evidenceRefs.length && fact.sourceLinked) fail(`${fact.id} is sourceLinked without evidence refs.`);
    if (!fact.evidenceRefs.length && !/model|insufficient|not source-linked/i.test(`${fact.evidenceSummary} ${fact.evidenceStatus}`)) {
      fail(`${fact.id} has no evidence refs and no clear model-only/insufficient boundary.`);
    }
    if (!fact.boundary.includes('Not medical advice')) fail(`${fact.id} is missing the not-medical-advice boundary.`);
    if (/\b(?:AUC|Cmax|SN-38|5-Fluorouracil|thiol metabolite|Endoxifen)\b/i.test(fact.patientSummary)) {
      fail(`${fact.id} patientSummary exposes technical metabolite or PK copy: ${fact.patientSummary}`);
    }
  }
  return failures;
}

function factsPayload(facts) {
  const generatedAt = facts[0]?.generatedAt || '';
  const lastmod = facts[0]?.lastmod || '2026-06-10';
  return {
    schema:'diognosis.reference-facts.v1',
    generatedAt,
    lastmod,
    source:'Generated from the committed Diognosis app runtime and data/medication-class-guides.json validated examples.',
    boundary:BOUNDARY,
    factCount:facts.length,
    sourceLinkedFacts:facts.filter((fact) => fact.sourceLinked).length,
    professionalReviewedFacts:facts.filter((fact) => fact.professionalReviewed).length,
    facts,
  };
}

function renderEvidenceLinks(fact) {
  const linked = fact.evidenceSources
    .filter((source) => source.directUrl && source.url)
    .slice(0, 5);
  if (!linked.length) {
    return '<p class="muted">No direct public source URL is available in the top exported evidence refs. See evidenceRefs in the JSON export.</p>';
  }
  return `<ul class="source-list">
${linked.map((source) => `        <li><a href="${html(source.url)}">${html(source.pmid ? `PMID ${source.pmid}` : source.doi ? `DOI ${source.doi}` : source.ref)}</a><span>${html(source.title)}</span></li>`).join('\n')}
      </ul>`;
}

function renderReferencePage(payload) {
  const jsonLd = {
    '@context':'https://schema.org',
    '@type':'Dataset',
    name:'Diognosis V1 Reference Facts',
    description:'Static source-linked educational medication and pharmacogenomic reference facts generated from the Diognosis app runtime.',
    url:absoluteUrl('reference/index.html'),
    license:'https://opensource.org/license/mit',
    isAccessibleForFree:true,
    dateModified:payload.lastmod,
    creator:{ '@type':'Person', name:'Diogo Pacheco' },
    distribution:[
      { '@type':'DataDownload', encodingFormat:'application/json', contentUrl:absoluteUrl('data/diognosis-facts.json') },
      { '@type':'DataDownload', encodingFormat:'application/x-ndjson', contentUrl:absoluteUrl('data/diognosis-facts.jsonl') },
    ],
    hasPart:payload.facts.slice(0, 85).map((fact) => ({
      '@type':'MedicalWebPage',
      name:fact.label,
      url:fact.referenceUrl,
      description:fact.patientSummary,
      medicalAudience:[
        { '@type':'MedicalAudience', audienceType:'Patient' },
        { '@type':'MedicalAudience', audienceType:'Clinician' },
      ],
    })),
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Diognosis V1 Reference Facts</title>
  <meta name="description" content="Static source-linked Diognosis reference facts for medication interaction and pharmacogenomic retrieval, audit, and search discovery.">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${BASE_URL}reference/index.html">
  <link rel="stylesheet" href="../assets/auxiliary-pages.css">
  <script type="application/ld+json">${safeJsonScript(jsonLd)}</script>
  <style>
    :root{--bg:#f1f0ec;--card:#fff;--card2:#f7f6f2;--text:#17181b;--text2:#6c7077;--border:#e8e7e0;--accent:#137a6a;--accentBg:#e7f1ee;--red:#c23a34;--redBg:#fbeceb;--amber:#a8781b;--amberBg:#f6edda;--radius:14px}
    *{box-sizing:border-box}
    html{scroll-behavior:smooth}
    body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.5}
    header{padding:28px 18px 18px;background:linear-gradient(180deg,var(--card),var(--bg));border-bottom:1px solid var(--border)}
    main,.top{max-width:1060px;margin:0 auto}
    main{padding:18px}
    a{color:var(--accent);font-weight:750;text-decoration:none}
    p{margin:0;color:var(--text2)}
    h1{font-size:30px;line-height:1.1;margin:0 0 8px;font-weight:850}
    h2{font-size:18px;margin:0 0 8px}
    .back{display:inline-block;margin:0 14px 14px 0;font-size:13px}
    .intro,.fact,.downloads{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:13px}
    .fact{display:grid;gap:12px}
    .fact-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .panel{background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:12px}
    .label{font-size:11px;font-weight:850;text-transform:uppercase;color:var(--text2);letter-spacing:.02em;margin-bottom:5px}
    .summary{font-weight:850;color:var(--text)}
    .meta{display:flex;flex-wrap:wrap;gap:6px}
    .tag{display:inline-flex;border-radius:999px;padding:3px 8px;font-size:11px;font-weight:850;background:var(--accentBg);color:var(--accent)}
    .tag.warn{background:var(--amberBg);color:var(--amber)}
    .tag.high{background:var(--redBg);color:var(--red)}
    .muted{font-size:12px;color:var(--text2)}
    .source-list{margin:0;padding-left:18px;color:var(--text2)}
    .source-list span{display:block;font-size:12px;color:var(--text2)}
    .downloads{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
    .download{display:block;background:var(--accentBg);border-radius:10px;padding:10px 11px}
    .fact-nav{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
    .fact-nav a{font-size:12px;padding:6px 8px;border-radius:999px;background:var(--accentBg)}
    @media (max-width:760px){main{padding:14px}.fact-grid,.downloads{grid-template-columns:1fr}h1{font-size:25px}}
  </style>
</head>
<body>
  <header>
    <div class="top">
      <div class="aux-brand">
        <img src="../assets/logo-mark.png" alt="" width="30" height="30">
        <div><strong>Diognosis</strong><span>Reference facts</span></div>
      </div>
      <a class="back" href="../index.html">Back to Diognosis</a>
      <a class="back" href="../data-views.html">Data views</a>
      <a class="back" href="../medication-classes.html">Class guides</a>
      <h1>Diognosis V1 Reference Facts</h1>
      <p>Static patient and clinician summaries generated from the same local Diognosis runtime used by the app. This page is designed for humans, search crawlers, LLM retrieval, and audit checks without loading the full app bundle.</p>
      <div class="support-strip" aria-label="Reference fact snapshot">
        <span><strong>${html(payload.factCount)}</strong> facts</span>
        <span><strong>${html(payload.sourceLinkedFacts)}</strong> source-linked</span>
        <span><strong>${html(payload.professionalReviewedFacts)}</strong> professionally reviewed</span>
        <span class="support-boundary">Educational only; no runtime uploads</span>
      </div>
      <nav class="fact-nav" aria-label="Reference fact anchors">
${payload.facts.slice(0, 24).map((fact) => `        <a href="#${html(fact.id)}">${html(fact.label)}</a>`).join('\n')}
      </nav>
    </div>
  </header>
  <main>
    <section class="intro">
      <h2>Boundary</h2>
      <p>${html(payload.boundary)}</p>
    </section>
    <section class="downloads" aria-label="Machine-readable reference downloads">
      <a class="download" href="../data/diognosis-facts.json"><strong>JSON facts</strong><br><span class="muted">Full metadata and facts array</span></a>
      <a class="download" href="../data/diognosis-facts.jsonl"><strong>JSONL facts</strong><br><span class="muted">One fact per line for RAG pipelines</span></a>
      <a class="download" href="../llms.txt"><strong>llms.txt</strong><br><span class="muted">Curated retrieval entry points</span></a>
    </section>
${payload.facts.map((fact) => `    <article class="fact" id="${html(fact.id)}">
      <div>
        <div class="meta">
          <span class="tag${fact.severity === 'severe' || fact.severity === 'critical' ? ' high' : fact.severity === 'moderate' ? ' warn' : ''}">${html(fact.severity)}</span>
          <span class="tag">${html(fact.guideTitle)}</span>
          <span class="tag">${html(fact.factType)}</span>
        </div>
        <h2>${html(fact.label)}</h2>
        <p class="muted">${html(fact.substances.map((item) => item.name).join(' + '))}${fact.genotypes.length ? `; ${html(fact.genotypes.join(', '))}` : ''}</p>
      </div>
      <div class="fact-grid">
        <div class="panel">
          <div class="label">Patient-safe summary</div>
          <p class="summary">${html(fact.patientSummary)}</p>
          <p>${html(fact.patientQuestion)}</p>
        </div>
        <div class="panel">
          <div class="label">Clinician/mechanism summary</div>
          <p class="summary">${html(fact.clinicianSummary)}</p>
          <p>${html(fact.mechanismSummary)}</p>
        </div>
      </div>
      <div class="panel">
        <div class="label">Evidence status</div>
        <p>${html(fact.evidenceStatus || fact.evidenceSummary)}</p>
        ${renderEvidenceLinks(fact)}
      </div>
      <div class="meta">
        <a class="tag" href="${html(fact.appUrl)}">Open patient view</a>
        <a class="tag" href="${html(fact.clinicianAppUrl)}">Open clinician view</a>
      </div>
    </article>`).join('\n')}
  </main>
</body>
</html>
`;
}

function renderLlms(payload) {
  return `# Diognosis

> Source-linked educational medication and pharmacogenomic interaction review. Diognosis is not medical advice, not a clinical decision support system, and not professionally reviewed.

## Best Retrieval Entry Points

- [V1 Reference Facts](${BASE_URL}reference/index.html): static patient and clinician summaries generated from the app runtime.
- [Facts JSON](${BASE_URL}data/diognosis-facts.json): full canonical fact payload with metadata.
- [Facts JSONL](${BASE_URL}data/diognosis-facts.jsonl): one fact per line for retrieval pipelines.
- [Data Views](${BASE_URL}data-views.html): alternate views over genotype, action, and ranking data.
- [Medication Class Guides](${BASE_URL}medication-classes.html): common class-based example entry points.
- [Live App](${BASE_URL}): local-browser Diognosis application.

## Boundary

${payload.boundary}

## Snapshot

- Facts: ${payload.factCount}
- Source-linked facts: ${payload.sourceLinkedFacts}
- Professionally reviewed facts: ${payload.professionalReviewedFacts}
- Last modified: ${payload.lastmod}
`;
}

function renderSitemap(payload) {
  const lastmod = payload.lastmod;
  const entries = [
    ['', 'weekly', '1.0'],
    ['medication-classes.html', 'monthly', '0.8'],
    ['medication-class-examples.html', 'monthly', '0.7'],
    ['data-views.html', 'monthly', '0.8'],
    ['reference/index.html', 'weekly', '0.9'],
    ['data/diognosis-facts.json', 'weekly', '0.5'],
    ['data/diognosis-facts.jsonl', 'weekly', '0.5'],
    ['llms.txt', 'weekly', '0.4'],
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(([path, changefreq, priority]) => `  <url>
    <loc>${html(absoluteUrl(path))}</loc>
    <lastmod>${html(lastmod)}</lastmod>
    <changefreq>${html(changefreq)}</changefreq>
    <priority>${html(priority)}</priority>
  </url>`).join('\n')}
</urlset>
`;
}

function writeOrCheck(filePath, content, failures) {
  if (CHECK_ONLY) {
    const existing = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
    if (existing !== content) {
      failures.push(`${relative(ROOT, filePath)} is stale. Run node scripts/generate-reference-layer.js.`);
    }
    return;
  }
  mkdirSync(dirname(filePath), { recursive:true });
  const existing = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
  if (existing !== content) writeFileSync(filePath, content, 'utf8');
}

function serializeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function serializeJsonl(facts) {
  return `${facts.map((fact) => JSON.stringify(fact)).join('\n')}\n`;
}

const source = readGuideSource();
const data = loadDiognosisData();
const resolveSubstance = buildSubstanceResolver(data);
const { dom, browserErrors } = loadRuntime();
await waitForRuntime(dom);

const facts = [];
let index = 0;
for (const guide of source.guides || []) {
  for (const example of guide.examples || []) {
    facts.push(buildFact(dom.window, data, resolveSubstance, guide, example, index++));
  }
}
dom.window.close();

const failures = validateFacts(facts, browserErrors);
const payload = factsPayload(facts);
const referenceHtml = renderReferencePage(payload);
const llmsText = renderLlms(payload);
const sitemap = renderSitemap(payload);

writeOrCheck(FACTS_JSON_PATH, serializeJson(payload), failures);
writeOrCheck(FACTS_JSONL_PATH, serializeJsonl(facts), failures);
writeOrCheck(REFERENCE_PATH, referenceHtml, failures);
writeOrCheck(LLMS_PATH, llmsText, failures);
writeOrCheck(SITEMAP_PATH, sitemap, failures);

if (failures.length) {
  console.error('Reference layer generation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok:true,
  mode:CHECK_ONLY ? 'check' : 'write',
  facts:facts.length,
  sourceLinkedFacts:payload.sourceLinkedFacts,
  professionalReviewedFacts:payload.professionalReviewedFacts,
  outputs:[
    relative(ROOT, REFERENCE_PATH),
    relative(ROOT, FACTS_JSON_PATH),
    relative(ROOT, FACTS_JSONL_PATH),
    relative(ROOT, LLMS_PATH),
    relative(ROOT, SITEMAP_PATH),
  ],
}, null, 2));
