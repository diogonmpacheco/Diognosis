#!/usr/bin/env node
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { JSDOM, VirtualConsole } from 'jsdom';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, '.tmp', 'launch-qa-index.html');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function norm(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function includesAny(text, needles) {
  const lower = norm(text).toLowerCase();
  return needles.some((needle) => lower.includes(String(needle).toLowerCase()));
}

function slug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function stackUrl(drugs, genotypes, tab = 'genes-metabolites') {
  const parts = [`substances=${drugs.map(slug).join(',')}`];
  for (const genotype of genotypes) parts.push(`genotype=${encodeURIComponent(genotype).replace(/%3A/g, ':')}`);
  parts.push(`tab=${tab}`);
  return `index.html?${parts.join('&')}`;
}

function firstEvidenceLink(study) {
  if (!study) return '';
  if (study.url) return study.url;
  if (study.doi) return `https://doi.org/${study.doi}`;
  if (study.pmid) return `https://pubmed.ncbi.nlm.nih.gov/${study.pmid}/`;
  return study.id;
}

const PANEL_DEFS = [
  { name:'risk', sectionId:'riskSection', bodyId:'riskBody' },
  { name:'known interactions', sectionId:'interSection', bodyId:'interBody' },
  { name:'combination alerts', sectionId:'comboSection', bodyId:'comboBody' },
  { name:'mechanistic interpretation', sectionId:'mechanisticSection', bodyId:'mechanisticBody' },
  { name:'transporter interactions', sectionId:'transporterSection', bodyId:'transporterBody' },
  { name:'interaction grid', sectionId:'matrixSection', bodyId:'matrixBody' },
  { name:'alternatives', sectionId:'altSection', bodyId:'altBody' },
  { name:'fold exposure', sectionId:'foldSection', bodyId:'foldBody' },
  { name:'genotype effects', sectionId:'genotypeSection', bodyId:'genotypeBody' },
  { name:'metabolites', sectionId:'metabSection', bodyId:'metabBody' },
  { name:'downstream effects', sectionId:'cascadeSection', bodyId:'cascadeBody' },
  { name:'side-effect burden', sectionId:'phenoAccumSection', bodyId:'phenoAccumBody' },
  { name:'PK simulation', sectionId:'pkSimSection', bodyId:'pkSimBody' },
  { name:'washout calendar', sectionId:'washoutSection', bodyId:'washoutBody' },
  { name:'burden flags', sectionId:'burdenSection', bodyId:'burdenBody' },
  { name:'network', sectionId:'graphSection', bodyId:'graphBody' },
  { name:'evidence', sectionId:'evidenceSection', bodyId:'evidenceBody' },
  { name:'review queue', sectionId:'qualitySection', bodyId:'qualityBody' },
];

const DEEP_CASES = [
  {
    name:'Thiopurine marrow toxicity',
    why:'Allopurinol changes thiopurine metabolism; TPMT/NUDT15 loss-of-function shifts toward cytotoxic 6-TGN.',
    drugs:['Azathioprine', 'Allopurinol'],
    genotypes:['TPMT:PM', 'NUDT15:PM'],
    expect:{
      summary:['myelosuppression', '6-Thioguanine', 'TPMT'],
      fold:['6-Thioguanine', '6-TGN', 'CBC'],
      genotype:['TPMT', 'NUDT15', 'Azathioprine'],
      metabolites:['6-Mercaptopurine', '6-Thioguanine'],
      evidence:['Azathioprine', 'CPIC', 'Allopurinol'],
      feedback:['Report data issue', 'Suggest evidence fix'],
    },
  },
  {
    name:'Fluoropyrimidine fatal toxicity',
    why:'Capecitabine looks like a parent prodrug, but the safety-critical actor is 5-FU accumulation when DPYD is deficient.',
    drugs:['Capecitabine'],
    genotypes:['DPYD:PM'],
    expect:{
      summary:['DPYD', '5-Fluorouracil', 'life-threatening toxicity'],
      fold:['5-Fluorouracil', 'life-threatening toxicity'],
      genotype:['DPYD', 'Capecitabine'],
      metabolites:['5-Fluorouracil', 'DPYD'],
      evidence:['Fluoropyrimidines', 'DPYD', 'CPIC'],
      feedback:['Suggest evidence fix'],
    },
  },
  {
    name:'Irinotecan SN-38 toxicity',
    why:'The parent drug is less informative than SN-38 exposure and UGT1A1 detoxification capacity.',
    drugs:['Irinotecan'],
    genotypes:['UGT1A1:PM'],
    expect:{
      summary:['UGT1A1', 'SN-38', 'CBC'],
      fold:['SN-38', 'monitor CBC'],
      genotype:['UGT1A1', 'Irinotecan'],
      metabolites:['SN-38', 'UGT1A1'],
      evidence:['Irinotecan', 'UGT1A1'],
      feedback:['Suggest evidence fix'],
    },
  },
  {
    name:'G6PD oxidant stack',
    why:'Several oxidant drugs can look unrelated by parent name, but converge on red-cell oxidative reserve.',
    drugs:['Rasburicase', 'Primaquine', 'Dapsone'],
    genotypes:['G6PD:deficiency'],
    expect:{
      summary:['G6PD deficiency', 'Rasburicase', 'contraindicated'],
      fold:['hemolysis', 'methemoglobinemia', 'G6PD'],
      genotype:['G6PD deficiency', 'Primaquine', 'Dapsone'],
      metabolites:['Primaquine', 'Dapsone hydroxylamine'],
      evidence:['G6PD', 'Rasburicase'],
      risk:['genotype/metabolite critical alert'],
      forbiddenRisk:['MINIMAL', 'Risk score: 0/100'],
      feedback:['Suggest evidence fix'],
    },
  },
  {
    name:'Anesthesia pharmacogenetics',
    why:'Succinylcholine risk is driven by BCHE hydrolysis plus malignant-hyperthermia susceptibility, not by a normal DDI pair.',
    drugs:['Succinylcholine'],
    genotypes:['BCHE:null', 'RYR1:present'],
    expect:{
      summary:['BCHE', 'Succinylcholine', 'prolonged paralysis'],
      fold:['Neuromuscular blockade', 'prolonged paralysis'],
      genotype:['BCHE', 'RYR1'],
      metabolites:['Succinylmonocholine', 'malignant hyperthermia'],
      evidence:['Succinylcholine', 'BCHE'],
      feedback:['Suggest evidence fix'],
    },
  },
];

console.log('Building launch QA HTML...');
execFileSync(process.execPath, ['build.js', '--out', OUT], { cwd: ROOT, stdio: 'pipe' });

const browserErrors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (err) => {
  const msg = err && err.message ? err.message : String(err);
  browserErrors.push(msg);
});
virtualConsole.on('error', (msg) => browserErrors.push(String(msg)));

const dom = new JSDOM(readFileSync(OUT, 'utf8'), {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  virtualConsole,
  url: 'http://localhost/index.html',
});

await new Promise((resolveReady) => setTimeout(resolveReady, 400));
const { window } = dom;

function loadCase({ drugs, genotypes = [], tab = 'genes-metabolites' }) {
  window.eval(`
    activeStack = [];
    if (typeof drugDoses !== "undefined") Object.keys(drugDoses).forEach(k => delete drugDoses[k]);
    userGenetics = {};
    activeGenotypeDetails = {};
    activeGenotype = {};
    Object.keys(GENOTYPE_EFFECTS || {}).forEach(g => activeGenotype[g] = GENOTYPE_PHENOTYPE.NM);
    Object.keys(GENOTYPE_RISK_EFFECTS || {}).forEach(g => activeGenotype[g] = GENOTYPE_RISK_STATUS.ABSENT);
  `);
  const url = stackUrl(drugs, genotypes, tab);
  window.history.replaceState(null, '', `/${url}`);
  window.loadUrlDemoState();
  window.renderAll();
  window.setTab(tab);
}

function panelState(def) {
  const section = window.document.getElementById(def.sectionId);
  const body = window.document.getElementById(def.bodyId);
  return {
    name:def.name,
    visible:section ? section.style.display !== 'none' : false,
    text:norm(body?.textContent || ''),
  };
}

function collect({ name, why, drugs, genotypes = [], tab = 'genes-metabolites', expect }) {
  loadCase({ drugs, genotypes, tab });

  const summary = norm(window.document.getElementById('summaryBar')?.textContent || '');
  const risk = norm(window.document.getElementById('riskBody')?.textContent || '');
  const fold = norm(window.document.getElementById('foldBody')?.textContent || '');
  const genotype = norm(window.document.getElementById('genotypeBody')?.textContent || '');
  const metabolites = norm(window.document.getElementById('metabBody')?.textContent || '');
  const evidence = norm(window.document.getElementById('evidenceBody')?.textContent || '');
  const feedbackText = norm(window.document.body.textContent || '');
  const refs = window.eval(`Array.from(getStackEvidenceContext().evidenceRefs || [])`);
  const knownRefs = refs.filter((ref) => window.eval(`!!STUDY_DB[${JSON.stringify(ref)}]`));
  const evidenceLink = firstEvidenceLink(knownRefs.map((ref) => window.eval(`STUDY_DB[${JSON.stringify(ref)}]`))[0]);
  const feedbackLinks = Array.from(window.document.querySelectorAll('a.feedback-link')).map(a => a.getAttribute('href') || '');
  const panels = PANEL_DEFS.map(panelState);
  const visiblePanels = panels.filter(p => p.visible).map(p => p.name);

  const debug = () => JSON.stringify({
    summary: summary.slice(0, 500),
    risk: risk.slice(0, 500),
    fold: fold.slice(0, 500),
    genotype: genotype.slice(0, 500),
    metabolites: metabolites.slice(0, 500),
    evidence: evidence.slice(0, 500),
    visiblePanels,
    staleHiddenPanels: panels.filter(p => !p.visible && p.text).map(p => ({ name:p.name, text:p.text.slice(0, 120) })),
  }, null, 2);

  assert(includesAny(summary, expect.summary), `${name}: missing expected summary signal ${expect.summary.join(' / ')}\n${debug()}`);
  if (expect.risk) {
    assert(includesAny(risk, expect.risk), `${name}: missing risk-panel signal ${expect.risk.join(' / ')}\n${debug()}`);
  }
  for (const term of expect.forbiddenRisk || []) {
    assert(!risk.includes(term), `${name}: forbidden risk-panel text ${term}\n${debug()}`);
  }
  assert(includesAny(fold, expect.fold), `${name}: missing fold/metabolite exposure signal ${expect.fold.join(' / ')}\n${debug()}`);
  assert(includesAny(genotype, expect.genotype), `${name}: missing genotype signal ${expect.genotype.join(' / ')}\n${debug()}`);
  assert(includesAny(metabolites, expect.metabolites), `${name}: missing metabolite panel signal ${expect.metabolites.join(' / ')}\n${debug()}`);
  assert(includesAny(evidence, expect.evidence), `${name}: missing evidence signal ${expect.evidence.join(' / ')}\n${debug()}`);
  for (const term of expect.feedback) {
    assert(feedbackText.includes(term), `${name}: missing feedback link text ${term}\n${debug()}`);
  }
  assert(feedbackLinks.length >= 1, `${name}: expected contextual feedback links\n${debug()}`);
  assert(feedbackLinks.every(href => href.includes('github.com/diogonmpacheco/Diognosis/issues/new')), `${name}: feedback link does not target GitHub issues\n${debug()}`);

  for (const panel of panels) {
    if (panel.visible) {
      assert(panel.text.length > 0, `${name}: visible panel "${panel.name}" rendered empty\n${debug()}`);
    } else {
      assert(panel.text.length === 0, `${name}: hidden panel "${panel.name}" retained stale text\n${debug()}`);
    }
  }

  return {
    name,
    why,
    stack:[...drugs, ...genotypes].join(' + '),
    visiblePanels,
    feedbackLinks:feedbackLinks.length,
    evidenceLink,
    url:stackUrl(drugs, genotypes, tab),
  };
}

const rows = DEEP_CASES.map(collect);
assert(browserErrors.length === 0, `Browser errors:\n${browserErrors.join('\n')}`);

dom.window.close();
console.log(JSON.stringify(rows, null, 2));
console.log('Launch QA audit passed.');
