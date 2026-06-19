#!/usr/bin/env node
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { JSDOM, VirtualConsole } from 'jsdom';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const OUT = resolve(ROOT, '.tmp', 'overview-fragmentation-index.html');
const REPORT_MD = resolve(ROOT, 'docs/audits/overview-fragmentation-audit.md');
const REPORT_JSON = resolve(ROOT, 'docs/audits/overview-fragmentation-audit.json');

const SCENARIOS = [
  { id:'tacrolimus-fluconazole', name:'Tacrolimus + fluconazole', stack:['Tacrolimus','Fluconazole'], maxConcerns:4, expectedVictim:'Tacrolimus', forbiddenTitle:/Tacrolimus may raise Fluconazole exposure/i },
  { id:'simvastatin-clarithromycin', name:'Simvastatin + clarithromycin', stack:['Simvastatin','Clarithromycin'], maxConcerns:4, expectedVictim:'Simvastatin', forbiddenTitle:/Clarithromycin exposure may rise with Simvastatin/i },
  { id:'rifampin-simvastatin', name:'Rifampin + simvastatin', stack:['Rifampin','Simvastatin'], maxConcerns:4, expectedVictim:'Simvastatin' },
  { id:'codeine-fluoxetine-cyp2d6-pm', name:'Codeine + fluoxetine + CYP2D6 PM', stack:['Codeine','Fluoxetine'], genotype:{ CYP2D6:'PM' }, maxConcerns:4, expectedTitle:/Codeine activation/i },
  { id:'clopidogrel-omeprazole-cyp2c19-pm', name:'Clopidogrel + omeprazole + CYP2C19 PM', stack:['Clopidogrel','Omeprazole'], genotype:{ CYP2C19:'PM' }, maxConcerns:4, expectedTitle:/Clopidogrel activation/i },
  { id:'irinotecan-ugt1a1-pm', name:'Irinotecan + UGT1A1 PM', stack:['Irinotecan'], genotype:{ UGT1A1:'PM' }, maxConcerns:3, expectedTitle:/SN-38|Irinotecan/i },
  { id:'capecitabine-dpyd-pm', name:'Capecitabine + DPYD PM', stack:['Capecitabine'], genotype:{ DPYD:'PM' }, maxConcerns:3, expectedTitle:/5-Fluorouracil|Capecitabine/i },
  { id:'azathioprine-allopurinol-tpmt-nudt15-pm', name:'Azathioprine + allopurinol + TPMT/NUDT15 PM', stack:['Azathioprine','Allopurinol'], genotype:{ TPMT:'PM', NUDT15:'PM' }, maxConcerns:4, expectedTitle:/Azathioprine|6-Thioguanine|6-TGN/i },
  { id:'g6pd-oxidant-stack', name:'G6PD oxidant stack', stack:['Rasburicase','Primaquine','Dapsone'], riskMarkers:{ 'G6PD deficiency':'present' }, maxConcerns:4, expectedTitle:/G6PD/i },
  { id:'succinylcholine-bche-ryr1', name:'Succinylcholine + BCHE/RYR1 context', stack:['Succinylcholine'], genotype:{ BCHE:'PM' }, riskMarkers:{ 'RYR1/CACNA1S MH variant':'present' }, maxConcerns:3, expectedTitle:/BCHE|RYR1|Succinylcholine|malignant/i },
  { id:'warfarin-ibuprofen', name:'Warfarin + ibuprofen', stack:['Warfarin','Ibuprofen'], maxConcerns:4, expectedTitle:/Bleeding burden|bleeding/i, forbiddenTitle:/Ibuprofen exposure may rise|Ibuprofen may fall/i },
  { id:'qtc-burden', name:'Haloperidol + azithromycin + methadone', stack:['Haloperidol','Azithromycin','Methadone'], maxConcerns:5, expectedTitle:/QT|burden|Methadone|Haloperidol/i },
  { id:'sertraline-linezolid', name:'Sertraline + linezolid', stack:['Sertraline','Linezolid'], maxConcerns:4, expectedTitle:/Serotonin|serotonin|Sertraline/i },
  { id:'diazepam-morphine', name:'Diazepam + morphine', stack:['Diazepam','Morphine'], maxConcerns:4, expectedTitle:/CNS|sedation|Morphine|Diazepam/i },
  { id:'fluoxetine-paroxetine-washout', name:'Fluoxetine + paroxetine washout', stack:['Fluoxetine','Paroxetine'], maxConcerns:5, expectedTitle:/Norfluoxetine|washout|persistence|Fluoxetine/i },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function norm(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function slug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

console.log('Building overview-fragmentation audit HTML...');
execFileSync(process.execPath, ['build.js', '--out', OUT], { cwd: ROOT, stdio: 'pipe' });

const browserErrors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', err => browserErrors.push(err?.message || String(err)));
virtualConsole.on('error', msg => browserErrors.push(String(msg)));

const dom = new JSDOM(readFileSync(OUT, 'utf8'), {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  virtualConsole,
  url: 'http://localhost/index.html',
});
await new Promise(resolveReady => setTimeout(resolveReady, 400));
const { window } = dom;

function drugExists(name) {
  return window.eval(`!!getDrug(${JSON.stringify(name)})`);
}

function applyScenario(scenario) {
  window.eval(`
    activeStack = [];
    userGenetics = {};
    activeGenotype = {};
    Object.keys(GENOTYPE_EFFECTS || {}).forEach(g => activeGenotype[g] = GENOTYPE_PHENOTYPE.NM);
    Object.keys(GENOTYPE_RISK_EFFECTS || {}).forEach(g => activeGenotype[g] = GENOTYPE_RISK_STATUS.ABSENT);
    renderComputationCache = null;
    currentInteractionFindings = [];
    currentClinicalConcerns = [];
  `);
  window.eval(`activeStack = ${JSON.stringify(scenario.stack)};`);
  for (const [gene, value] of Object.entries(scenario.genotype || {})) {
    const mapped = value === 'PM' ? 'GENOTYPE_PHENOTYPE.PM' :
      value === 'IM' ? 'GENOTYPE_PHENOTYPE.IM' :
      value === 'UM' ? 'GENOTYPE_PHENOTYPE.UM' :
      JSON.stringify(value);
    window.eval(`activeGenotype[${JSON.stringify(gene)}] = ${mapped};`);
  }
  for (const [marker, value] of Object.entries(scenario.riskMarkers || {})) {
    const mapped = value === 'present' ? 'GENOTYPE_RISK_STATUS.PRESENT' : JSON.stringify(value);
    window.eval(`activeGenotype[${JSON.stringify(marker)}] = ${mapped};`);
  }
  window.renderAll();
  window.setTab('overview');
}

function collectScenario(scenario) {
  const missing = scenario.stack.filter(name => !drugExists(name));
  if (missing.length) {
    return { id:scenario.id, name:scenario.name, skipped:true, missing, flags:[] };
  }
  applyScenario(scenario);
  const model = window.getRenderComputationCache();
  const concerns = model.clinicalConcerns || [];
  const rawFindings = model.findings || [];
  const titles = concerns.map(concern => concern.title || '');
  window.setTab('mechanisms');
  const mechanismRows = Array.from(window.document.querySelectorAll('#mechanismWhyBody .mechanism-why-row'));
  const mechanismTitles = mechanismRows.map(row => norm(row.querySelector('.warning-path-title')?.textContent || ''));
  const mechanismWhyPathCount = mechanismRows.length;
  window.setTab('overview');
  const flags = [];
  const maxConcerns = scenario.maxConcerns || (scenario.stack.length <= 1 ? 3 : 4);
  if (concerns.length > maxConcerns) flags.push(`too many Overview concerns (${concerns.length} > ${maxConcerns})`);
  if (concerns.length && mechanismWhyPathCount > concerns.length) {
    flags.push(`Mechanisms renders more primary paths than grouped concerns (${mechanismWhyPathCount} > ${concerns.length})`);
  }
  if (scenario.id === 'tacrolimus-fluconazole' && mechanismTitles.some(title => /^CYP2C19|^CYP2C9|^CYP3A4 behaves/i.test(title))) {
    flags.push('Tacrolimus Mechanisms exposes standalone enzyme function rows instead of grouped concern paths');
  }
  if (scenario.expectedVictim && !titles.some(title => title.toLowerCase().includes(scenario.expectedVictim.toLowerCase()))) {
    flags.push(`missing expected victim in concern title: ${scenario.expectedVictim}`);
  }
  if (scenario.expectedTitle && !titles.some(title => scenario.expectedTitle.test(title))) {
    flags.push(`missing expected title pattern ${scenario.expectedTitle}`);
  }
  if (scenario.forbiddenTitle && titles.some(title => scenario.forbiddenTitle.test(title))) {
    flags.push(`forbidden reversed title present: ${scenario.forbiddenTitle}`);
  }
  const domainVictimCounts = new Map();
  for (const concern of concerns) {
    const victims = (concern.victimActors || []).map(actor => slug(actor.id)).sort().join(',');
    const key = `${concern.clinicalConcernDomain || 'domain'}|${victims}`;
    domainVictimCounts.set(key, (domainVictimCounts.get(key) || 0) + 1);
  }
  for (const [key, count] of domainVictimCounts.entries()) {
    if (key.includes('washout_or_persistence')) continue;
    if (count > 1) flags.push(`duplicate primary domain/victim group: ${key} (${count})`);
  }
  for (const concern of concerns) {
    const sourceTypes = new Set((concern.sourceFindings || []).map(row => row.type));
    if (sourceTypes.has('phenoconversion') && sourceTypes.size === 1) {
      flags.push(`standalone phenoconversion primary concern: ${concern.title}`);
    }
    const primaryRaw = rawFindings.find(finding => finding.id === concern.primaryFindingId);
    const primaryRow = primaryRaw?.sourceRows?.[0] || {};
    if (primaryRaw?.type === 'active_moiety' && (primaryRow.netPattern === 'no_major_signal' || primaryRow.actorType === 'inactive_metabolite')) {
      flags.push(`inactive/no-signal active-moiety primary concern: ${concern.title}`);
    }
  }
  return {
    id: scenario.id,
    name: scenario.name,
    stack: scenario.stack,
    genotype: scenario.genotype || {},
    riskMarkers: scenario.riskMarkers || {},
    rawFindingCount: rawFindings.length,
    concernCount: concerns.length,
    mechanismWhyPathCount,
    titles,
    mechanismTitles,
    domains: concerns.map(concern => concern.clinicalConcernDomain),
    groupedSignals: concerns.map(concern => ({
      key: concern.clinicalConcernKey,
      title: concern.title,
      sourceFindings: (concern.sourceFindings || []).length,
      supportingSignals: (concern.supportingSignals || []).length,
      detailOnlyCount: concern.detailOnlyCount || 0,
      hiddenCount: concern.hiddenCount || 0,
    })),
    flags,
  };
}

const rows = SCENARIOS.map(collectScenario);
const failed = rows.filter(row => (row.flags || []).length);
assert(browserErrors.length === 0, `Browser errors:\n${browserErrors.join('\n')}`);

mkdirSync(dirname(REPORT_MD), { recursive: true });
const summary = {
  generatedAt: new Date().toISOString(),
  scenarioCount: rows.length,
  skipped: rows.filter(row => row.skipped).length,
  failed: failed.length,
  rows,
};
writeFileSync(REPORT_JSON, JSON.stringify(summary, null, 2));
writeFileSync(REPORT_MD, renderMarkdown(summary));

dom.window.close();
if (failed.length) {
  console.error(JSON.stringify(failed.map(row => ({ id:row.id, flags:row.flags, titles:row.titles })), null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok:true, scenarios:rows.length, skipped:summary.skipped, wrote:[REPORT_MD, REPORT_JSON] }, null, 2));

function renderMarkdown(summary) {
  const lines = [
    '# Overview Fragmentation Audit',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    `Scenarios: ${summary.scenarioCount}`,
    `Skipped: ${summary.skipped}`,
    `Failures: ${summary.failed}`,
    '',
    '| Scenario | Raw findings | Overview concerns | Mechanism paths | Domains | Flags |',
    '|---|---:|---:|---:|---|---|',
  ];
  for (const row of summary.rows) {
    lines.push(`| ${row.name}${row.skipped ? ` (skipped: ${row.missing.join(', ')})` : ''} | ${row.rawFindingCount ?? ''} | ${row.concernCount ?? ''} | ${row.mechanismWhyPathCount ?? ''} | ${(row.domains || []).join(', ')} | ${(row.flags || []).join('<br>') || 'pass'} |`);
  }
  lines.push('', '## Concern Titles', '');
  for (const row of summary.rows.filter(row => !row.skipped)) {
    lines.push(`### ${row.name}`, '');
    for (const title of row.titles || []) lines.push(`- ${title}`);
    if ((row.mechanismTitles || []).length) {
      lines.push('', 'Mechanism paths:');
      for (const title of row.mechanismTitles || []) lines.push(`- ${title}`);
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}
