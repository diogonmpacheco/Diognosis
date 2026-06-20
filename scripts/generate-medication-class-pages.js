#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDiognosisData, normalizeName } from './enrich/lib/diognosis-source-loader.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SOURCE_PATH = resolve(ROOT, 'data/medication-class-guides.json');
const OVERVIEW_PATH = resolve(ROOT, 'medication-classes.html');
const EXAMPLES_PATH = resolve(ROOT, 'medication-class-examples.html');
const CHECK_ONLY = process.argv.includes('--check');

const VALID_TABS = new Set(['overview', 'genes-metabolites', 'timing-levels']);
const VALID_TAG_TONES = new Set(['', 'warn', 'high']);
const VALID_VALIDATION = new Set(['data-resolved']);
const LEGACY_TAB_RE = /\btab=(?:safety|pk|pgx)\b|\btab:"(?:safety|pk|pgx)"/;

function readGuideSource() {
  return JSON.parse(readFileSync(SOURCE_PATH, 'utf8'));
}

function html(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function encodeUrlValue(value) {
  return encodeURIComponent(value)
    .replace(/%2C/g, ',')
    .replace(/%3A/g, ':');
}

function buildSubstanceResolver(data) {
  const map = new Map();
  const add = (value, drug) => {
    const key = normalizeName(value);
    if (key && !map.has(key)) {
      map.set(key, { name: drug.name, id: drug.id || drug.name, key: normalizeName(drug.name) });
    }
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

function resolveGene(data, value) {
  const raw = String(value || '').trim();
  const upper = raw.toUpperCase().replace(/\s+/g, '');
  if (data.GENOTYPE_EFFECTS?.[upper]) return upper;
  if (data.GENOTYPE_RISK_EFFECTS?.[raw]) return raw;

  const riskAliases = {
    G6PD: 'G6PD deficiency',
    MTHFR: 'MTHFR C677T',
    MTRNR1: 'MT-RNR1 m.1555A>G',
    'MT-RNR1': 'MT-RNR1 m.1555A>G',
    RYR1: 'RYR1/CACNA1S MH variant',
    CACNA1S: 'RYR1/CACNA1S MH variant',
    SCN1A: 'SCN1A sodium-channel variant',
    SCN2A: 'SCN2A sodium-channel variant',
    KCNH2: 'KCNH2 long-QT variant',
    HERG: 'KCNH2 long-QT variant',
  };
  if (riskAliases[upper] && data.GENOTYPE_RISK_EFFECTS?.[riskAliases[upper]]) return riskAliases[upper];

  return Object.keys(data.GENOTYPE_RISK_EFFECTS || {}).find((key) =>
    key.toUpperCase().replace(/\s+/g, '') === upper ||
    String(data.GENOTYPE_RISK_EFFECTS[key]?.gene || '').toUpperCase().replace(/\s+/g, '') === upper
  ) || null;
}

function resolvePhenotype(value) {
  const key = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return {
    pm: 'poor_metabolizer',
    poor: 'poor_metabolizer',
    poor_metabolizer: 'poor_metabolizer',
    im: 'intermediate_metabolizer',
    intermediate: 'intermediate_metabolizer',
    intermediate_metabolizer: 'intermediate_metabolizer',
    nm: 'normal_metabolizer',
    normal: 'normal_metabolizer',
    normal_metabolizer: 'normal_metabolizer',
    um: 'ultrarapid_metabolizer',
    ultra: 'ultrarapid_metabolizer',
    ultrarapid: 'ultrarapid_metabolizer',
    ultrarapid_metabolizer: 'ultrarapid_metabolizer',
  }[key] || String(value || '').trim();
}

function isRiskPresentToken(value) {
  return /^(?:present|positive|detected|deficient|deficiency|risk_allele_present)$/i.test(String(value || '').trim());
}

function validateGenotypeToken(data, token) {
  const sep = String(token || '').lastIndexOf(':');
  if (sep <= 0) return false;
  const gene = resolveGene(data, token.slice(0, sep));
  const value = token.slice(sep + 1);
  if (!gene) return false;
  const phenotype = resolvePhenotype(value);
  if (data.GENOTYPE_EFFECTS?.[gene]?.[phenotype]) return true;
  return Boolean(data.GENOTYPE_RISK_EFFECTS?.[gene] && isRiskPresentToken(value));
}

function exampleSetKey(example, resolveSubstance) {
  return (example.substances || [])
    .map((value) => resolveSubstance(value)?.key || normalizeName(value))
    .sort()
    .join('|');
}

function validateGuides(source, data, resolveSubstance) {
  const failures = [];
  const guideIds = new Set();
  const exampleIds = new Set();
  const blockedExamples = new Map();

  const fail = (message) => failures.push(message);

  if (source.version !== 1) fail('Guide source version must be 1.');
  if (!Array.isArray(source.guides) || !source.guides.length) fail('Guide source must include guides.');

  for (const entry of source.blockedExamples || []) {
    const key = exampleSetKey(entry, resolveSubstance);
    if (key) blockedExamples.set(key, entry.reason || 'Blocked guide example.');
  }

  for (const guide of source.guides || []) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(guide.id || '')) fail(`Guide has invalid id: ${guide.id || '(missing)'}`);
    if (guideIds.has(guide.id)) fail(`Duplicate guide id: ${guide.id}`);
    guideIds.add(guide.id);
    for (const field of ['title', 'navLabel', 'overviewSummary', 'detailSummary']) {
      if (!String(guide[field] || '').trim()) fail(`${guide.id || '(missing guide)'} is missing ${field}.`);
    }
    if (!String(guide.seeMoreLabel || '').trim()) fail(`${guide.id} is missing seeMoreLabel.`);
    if (!Array.isArray(guide.tags) || !guide.tags.length) fail(`${guide.id} needs tags.`);
    for (const tag of guide.tags || []) {
      if (!String(tag.label || '').trim()) fail(`${guide.id} has an empty tag label.`);
      if (!VALID_TAG_TONES.has(tag.tone || '')) fail(`${guide.id} has invalid tag tone "${tag.tone}".`);
    }
    if (!Array.isArray(guide.examples) || !guide.examples.length) fail(`${guide.id} needs examples.`);

    const featured = (guide.examples || []).filter((example) => example.featured);
    if (!featured.length) fail(`${guide.id} should mark at least one featured example for the class guide page.`);

    for (const example of guide.examples || []) {
      const label = `${guide.id}:${example.id || '(missing example id)'}`;
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(example.id || '')) fail(`${label} has an invalid example id.`);
      if (exampleIds.has(example.id)) fail(`Duplicate example id: ${example.id}`);
      exampleIds.add(example.id);
      if (!String(example.label || '').trim()) fail(`${label} is missing label.`);
      if (!String(example.description || '').trim()) fail(`${label} is missing description.`);
      if (!VALID_TABS.has(example.tab)) fail(`${label} uses invalid tab "${example.tab}".`);
      if (!VALID_VALIDATION.has(example.validation)) fail(`${label} must declare validation:"data-resolved".`);
      if (!Array.isArray(example.substances) || !example.substances.length) fail(`${label} needs substances.`);
      for (const substance of example.substances || []) {
        if (!resolveSubstance(substance)) fail(`${label} cannot resolve substance "${substance}".`);
      }
      for (const genotype of example.genotypes || []) {
        if (!validateGenotypeToken(data, genotype)) fail(`${label} cannot resolve genotype "${genotype}".`);
      }
      const blockedReason = blockedExamples.get(exampleSetKey(example, resolveSubstance));
      if (blockedReason) fail(`${label} is blocked: ${blockedReason}`);
    }
  }

  return failures;
}

function exampleHref(example) {
  const params = [
    ['substances', example.substances.join(',')],
    ...(example.genotypes || []).map((genotype) => ['genotype', genotype]),
    ['tab', example.tab],
  ];
  return `./index.html?${params.map(([key, value]) => `${encodeURIComponent(key)}=${encodeUrlValue(value)}`).join('&')}`;
}

function tagHtml(tag) {
  const tone = tag.tone ? ` ${html(tag.tone)}` : '';
  return `<span class="tag${tone}">${html(tag.label)}</span>`;
}

function sharedHead({ title, description, canonicalPath, extraCss = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${html(title)} | Diognosis</title>
  <meta name="description" content="${html(description)}">
  <link rel="canonical" href="https://diogonmpacheco.github.io/Diognosis/${html(canonicalPath)}">
  <style>
    :root{--bg:#f8fafc;--card:#fff;--text:#0f172a;--text2:#64748b;--accent:#2563eb;--accentBg:#dbeafe;--border:#e2e8f0;--red:#dc2626;--redBg:#fee2e2;--amber:#d97706;--amberBg:#fef3c7;--green:#16a34a;--greenBg:#dcfce7;--radius:12px;--shadow:0 1px 3px rgba(15,23,42,.08)}
    *{box-sizing:border-box}
    html{scroll-behavior:smooth}
    body{margin:0;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--bg);color:var(--text);line-height:1.5}
    header{padding:28px 18px 18px;background:linear-gradient(180deg,var(--card),var(--bg));border-bottom:1px solid var(--border)}
    main{margin:0 auto;padding:18px}
    p{margin:0;color:var(--text2)}
    a{color:var(--accent);font-weight:750;text-decoration:none}
    .top{margin:0 auto}
    .back{display:inline-block;margin:0 14px 14px 0;font-size:13px}
    h1{font-size:29px;line-height:1.1;margin:0 0 8px;font-weight:850;letter-spacing:0}
    h2{font-size:18px;line-height:1.2;margin:0}
    .tagline{display:flex;flex-wrap:wrap;gap:6px;margin-top:auto}
    .tag{font-size:11px;font-weight:800;border-radius:999px;padding:3px 8px;background:var(--greenBg);color:var(--green)}
    .tag.warn{background:var(--amberBg);color:var(--amber)}
    .tag.high{background:var(--redBg);color:var(--red)}
${extraCss}
  </style>
  <link rel="stylesheet" href="assets/auxiliary-pages.css">
</head>`;
}

function generatedComment() {
  return '<!-- Generated from data/medication-class-guides.json by scripts/generate-medication-class-pages.js. Do not edit by hand. -->';
}

function renderGuideCard(guide) {
  const featured = guide.examples.filter((example) => example.featured).slice(0, 3);
  const examples = featured.length ? featured : guide.examples.slice(0, 3);
  const seeMoreLabel = guide.seeMoreLabel || guide.navLabel.toLowerCase();
  return `      <section class="guide" id="${html(guide.id)}">
        <h2>${html(guide.title)}</h2>
        <p>${html(guide.overviewSummary)}</p>
        <div class="links">
${examples.map((example) => `          <a href="${html(exampleHref(example))}">${html(example.label)}</a>`).join('\n')}
          <a class="see-more" href="./medication-class-examples.html#${html(guide.id)}">See more ${html(seeMoreLabel)} examples</a>
        </div>
        <div class="tagline">${guide.tags.map(tagHtml).join('')}</div>
      </section>`;
}

function renderOverviewPage(source) {
  const extraCss = `    main{max-width:940px}
    .top{max-width:940px}
    .intro{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:14px 16px;margin-bottom:14px}
    .intro strong{color:var(--text)}
    .guide-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .guide{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:16px;display:flex;flex-direction:column;gap:10px}
    .guide p{font-size:14px}
    .links{display:grid;gap:7px}
    .links a{display:block;padding:9px 10px;border-radius:8px;background:var(--accentBg)}
    .see-more{display:inline-flex;align-items:center;justify-content:center;margin-top:2px;padding:9px 10px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--accent)}
    @media (max-width:760px){.guide-grid{grid-template-columns:1fr}main{padding:14px}h1{font-size:25px}}`;

  return `${generatedComment()}
${sharedHead({
  title: 'Medication Class Interaction Guides',
  description: 'Diognosis MedCheck Engine medication class guides for common, high-scale medication groups: statins, blood pressure drugs, anticoagulants, diabetes medicines, pain medicines, psychiatry, anti-infectives, acid suppression, hormones, and oncology/transplant examples.',
  canonicalPath: 'medication-classes.html',
  extraCss,
})}
<body>
  <header>
    <div class="top">
      <div class="aux-brand">
        <img src="assets/logo-mark.png" alt="" width="30" height="30">
        <div><strong>Diognosis</strong><span>Medication class guides</span></div>
      </div>
      <a class="back" href="./index.html">Back to Diognosis</a>
      <a class="back" href="./data-views.html">Data views</a>
      <h1>Medication Class Interaction Guides</h1>
      <p>High-yield MedCheck Engine starting points for common medication groups and known interaction patterns: pharmacogenomics, CYP inhibition or induction, active metabolites, transporters, bleeding, QT, electrolytes, acid suppression, and PK exposure.</p>
    </div>
  </header>
  <main>
    <section class="intro">
      <p><strong>Scale-first grouping.</strong> These guides prioritize classes many people actually use, not only rare high-severity specialist drugs. The first links are quick-start examples; each card then opens a longer set of known examples.</p>
      <p style="margin-top:8px">Scale lens: CDC/NCHS reports broad prescription-drug and office-visit drug-therapy use, with analgesics and antihyperlipidemic agents among frequent therapeutic classes; ClinCalc DrugStats adds recent MEPS-derived signals such as statin, GLP-1/GIP, SGLT2, and anticoagulant utilization. <a href="https://www.cdc.gov/nchs/fastats/drug-use-therapeutic.htm">CDC/NCHS</a> · <a href="https://clincalc.com/blog/2025/08/clincalc-drugstats-most-commonly-prescribed-medications-in-2023/">ClinCalc DrugStats</a></p>
    </section>

    <div class="guide-grid">
${source.guides.map(renderGuideCard).join('\n\n')}
    </div>
  </main>
</body>
</html>
`;
}

function renderExampleCard(example) {
  return `        <a class="example" href="${html(exampleHref(example))}"><strong>${html(example.label)}</strong><span>${html(example.description)}</span></a>`;
}

function renderExamplesSection(guide) {
  return `    <section class="guide" id="${html(guide.id)}">
      <h2>${html(guide.title)}</h2>
      <p>${html(guide.detailSummary)}</p>
      <div class="examples">
${guide.examples.map(renderExampleCard).join('\n')}
      </div>
      <div class="tagline">${guide.tags.map(tagHtml).join('')}</div>
    </section>`;
}

function renderExamplesPage(source) {
  const extraCss = `    main{max-width:980px}
    .top{max-width:980px}
    h2{font-size:20px;margin:0 0 6px}
    .note,.guide{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:16px;margin-bottom:13px}
    .note strong{color:var(--text)}
    .nav{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0}
    .nav a{font-size:12px;padding:7px 9px;border-radius:999px;background:var(--accentBg)}
    .examples{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}
    .example{display:block;padding:10px 11px;border-radius:10px;border:1px solid var(--border);background:#fbfdff}
    .example strong{display:block;color:var(--text);font-size:14px;margin-bottom:3px}
    .example span{display:block;color:var(--text2);font-size:12px;font-weight:600}
    .tagline{margin-top:10px}
    @media (max-width:760px){main{padding:14px}.examples{grid-template-columns:1fr}h1{font-size:25px}}`;

  return `${generatedComment()}
${sharedHead({
  title: 'Expanded Medication Class Examples',
  description: 'Expanded Diognosis MedCheck Engine medication class example lists for common high-scale drug groups and known interaction patterns.',
  canonicalPath: 'medication-class-examples.html',
  extraCss,
})}
<body>
  <header>
    <div class="top">
      <div class="aux-brand">
        <img src="assets/logo-mark.png" alt="" width="30" height="30">
        <div><strong>Diognosis</strong><span>Expanded class examples</span></div>
      </div>
      <a class="back" href="./medication-classes.html">Back to class guides</a>
      <a class="back" href="./index.html">Back to Diognosis</a>
      <h1>Expanded Medication Class Examples</h1>
      <p>Longer example sets for common, high-scale medication groups. Each link opens the Diognosis app with a focused MedCheck Engine stack.</p>
      <nav class="nav" aria-label="Medication class example sections">
${source.guides.map((guide) => `        <a href="#${html(guide.id)}">${html(guide.navLabel)}</a>`).join('\n')}
      </nav>
    </div>
  </header>
  <main>
    <section class="note">
      <p><strong>Not a clinical ranking.</strong> These are discovery prompts for common-use or high-review-burden classes. All MedCheck Engine evidence remains source-linked and pending professional review.</p>
      <p style="margin-top:8px">Scale rationale uses public U.S. prescription-use signals from <a href="https://www.cdc.gov/nchs/fastats/drug-use-therapeutic.htm">CDC/NCHS</a> and MEPS-derived <a href="https://clincalc.com/blog/2025/08/clincalc-drugstats-most-commonly-prescribed-medications-in-2023/">ClinCalc DrugStats</a>; examples are chosen because they are useful MedCheck Engine discovery prompts, not because they are the most dangerous combinations.</p>
    </section>

${source.guides.map(renderExamplesSection).join('\n\n')}
  </main>
</body>
</html>
`;
}

function verifyGeneratedHtml(name, content) {
  const failures = [];
  if (LEGACY_TAB_RE.test(content)) failures.push(`${name} includes a legacy tab alias.`);
  if (/paroxetine,fluoxetine|tamoxifen,paroxetine/i.test(content)) {
    failures.push(`${name} includes a blocked weak example.`);
  }
  return failures;
}

function writeOrCheck(filePath, content, failures) {
  const existing = readFileSync(filePath, 'utf8');
  if (CHECK_ONLY) {
    if (existing !== content) {
      failures.push(`${relative(ROOT, filePath)} is stale. Run node scripts/generate-medication-class-pages.js.`);
    }
    return;
  }
  if (existing !== content) writeFileSync(filePath, content, 'utf8');
}

const source = readGuideSource();
const data = loadDiognosisData();
const resolveSubstance = buildSubstanceResolver(data);
const failures = validateGuides(source, data, resolveSubstance);
const overview = renderOverviewPage(source);
const examples = renderExamplesPage(source);

failures.push(...verifyGeneratedHtml('medication-classes.html', overview));
failures.push(...verifyGeneratedHtml('medication-class-examples.html', examples));

if (!failures.length) {
  writeOrCheck(OVERVIEW_PATH, overview, failures);
  writeOrCheck(EXAMPLES_PATH, examples, failures);
}

if (failures.length) {
  console.error('Medication class guide generation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const exampleCount = source.guides.reduce((sum, guide) => sum + guide.examples.length, 0);
console.log(JSON.stringify({
  ok: true,
  mode: CHECK_ONLY ? 'check' : 'write',
  guides: source.guides.length,
  examples: exampleCount,
  source: relative(ROOT, SOURCE_PATH),
  outputs: [relative(ROOT, OVERVIEW_PATH), relative(ROOT, EXAMPLES_PATH)],
}, null, 2));
