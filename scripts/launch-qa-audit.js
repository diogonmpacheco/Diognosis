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

function includesAny(text, needles) {
  const lower = String(text || '').toLowerCase();
  return needles.some((needle) => lower.includes(String(needle).toLowerCase()));
}

function slug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function stackUrl(drugs, genotypes, tab = 'safety') {
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

console.log('Building launch QA HTML...');
execFileSync(process.execPath, ['build.js', '--out', OUT], { cwd: ROOT, stdio: 'pipe' });

const browserErrors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (err) => {
  const msg = err && err.message ? err.message : String(err);
  if (!msg.includes('Could not load script: "https://cdnjs.cloudflare.com/ajax/libs/d3/')) browserErrors.push(msg);
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

function loadCase({ drugs, genotypes = [], tab = 'safety' }) {
  window.eval(`activeStack = [];
    drugDoses && Object.keys(drugDoses).forEach(k => delete drugDoses[k]);
    userGenetics = {};
    activeGenotypeDetails = {};
    activeGenotype = {
      CYP2D6: GENOTYPE_PHENOTYPE.NM,
      CYP2C19: GENOTYPE_PHENOTYPE.NM,
      CYP2C9: GENOTYPE_PHENOTYPE.NM,
    };`);
  const url = stackUrl(drugs, genotypes, tab);
  window.history.replaceState(null, '', `/${url}`);
  window.loadUrlDemoState();
  window.renderAll();
}

function collect({ name, drugs, genotypes = [], tab = 'safety', expect }) {
  loadCase({ drugs, genotypes, tab });
  const summaryTitle = window.document.querySelector('.summary-title')?.textContent || '';
  const priority = window.document.querySelector('.summary-risk .lbl')?.textContent || '';
  const summary = window.document.getElementById('summaryBar')?.textContent || '';
  const warningText = window.eval('calcRisk()').interactions.map((i) => `${i.severity} ${i.drug1} + ${i.drug2}: ${i.mechanism} ${i.effect}`).join(' | ');
  const mechanisticText = window.document.getElementById('mechanisticBody')?.textContent || '';
  const genotypeText = window.document.getElementById('genotypeBody')?.textContent || '';
  const evidenceText = window.document.getElementById('evidenceBody')?.textContent || '';
  const refs = window.eval(`Array.from(getStackEvidenceContext().evidenceRefs || [])`);
  const knownRefs = refs.filter((ref) => window.eval(`!!STUDY_DB[${JSON.stringify(ref)}]`));
  const link = firstEvidenceLink(knownRefs.map((ref) => window.eval(`STUDY_DB[${JSON.stringify(ref)}]`))[0]);
  const url = stackUrl(drugs, genotypes, tab);

  const debug = () => JSON.stringify({
    priority, summaryTitle,
    summary: summary.slice(0, 500),
    warningText: warningText.slice(0, 500),
    mechanisticText: mechanisticText.slice(0, 500),
    genotypeText: genotypeText.slice(0, 500),
    evidenceText: evidenceText.slice(0, 500),
    activeGenotype: window.eval('activeGenotype'),
  }, null, 2);

  assert(includesAny(`${priority} ${summaryTitle} ${summary}`, expect.priority), `${name}: missing priority ${expect.priority.join(' / ')}\n${debug()}`);
  assert(includesAny(`${warningText} ${summary} ${genotypeText}`, expect.warning), `${name}: missing known warning ${expect.warning.join(' / ')}\n${debug()}`);
  assert(includesAny(`${mechanisticText} ${summary} ${warningText}`, expect.mechanism), `${name}: missing mechanism ${expect.mechanism.join(' / ')}\n${debug()}`);
  assert(includesAny(genotypeText, expect.genotype), `${name}: missing genotype/metabolite card ${expect.genotype.join(' / ')}\n${debug()}`);
  assert(includesAny(evidenceText, expect.evidence), `${name}: missing evidence text ${expect.evidence.join(' / ')}\n${debug()}`);
  assert(url.includes('substances=') && genotypes.every((g) => url.includes(encodeURIComponent(g).replace(/%3A/g, ':'))), `${name}: URL missing substances/genotypes`);

  return {
    name,
    stack: [...drugs, ...genotypes].join(' + '),
    priority: `${priority} - ${summaryTitle}`.trim(),
    warning: expect.warning[0],
    mechanism: expect.mechanism[0],
    genotypeCard: expect.genotype[0],
    evidence: expect.evidence[0],
    evidenceLink: link,
    url,
  };
}

const cases = [
  {
    name:'SSRI switch',
    drugs:['Paroxetine', 'Fluoxetine'],
    expect:{
      priority:['High-priority interaction found', 'High'],
      warning:['serotonin', 'CYP2D6 inhibition'],
      mechanism:['CYP2D6', 'serotonin'],
      genotype:['CYP2D6', 'Norfluoxetine'],
      evidence:['Paroxetine', 'Fluoxetine', 'CYP2D6'],
    },
  },
  {
    name:'CYP2D6 null',
    drugs:['Metoprolol', 'Fluoxetine'],
    genotypes:['CYP2D6:null'],
    tab:'pgx',
    expect:{
      priority:['High-priority interaction found', 'PGx High'],
      warning:['bradycardia', 'hypotension'],
      mechanism:['CYP2D6', 'metoprolol clearance'],
      genotype:['no-function CYP2D6', 'Metoprolol'],
      evidence:['Metoprolol', 'Fluoxetine', 'CYP2D6'],
    },
  },
  {
    name:'Clopidogrel',
    drugs:['Clopidogrel', 'Omeprazole'],
    genotypes:['CYP2C19:PM'],
    tab:'pgx',
    expect:{
      priority:['High-priority interaction found', 'PGx High'],
      warning:['active metabolite', 'stent thrombosis'],
      mechanism:['CYP2C19', 'bioactivation'],
      genotype:['Active thiol metabolite', 'CYP2C19'],
      evidence:['Clopidogrel', 'CYP2C19'],
    },
  },
  {
    name:'Statin',
    drugs:['Simvastatin', 'Clarithromycin'],
    genotypes:['SLCO1B1:reduced_function'],
    tab:'pgx',
    expect:{
      priority:['High-priority interaction found'],
      warning:['rhabdomyolysis'],
      mechanism:['CYP3A4', 'P-gp'],
      genotype:['SLCO1B1', 'Simvastatin'],
      evidence:['Simvastatin', 'Clarithromycin'],
    },
  },
  {
    name:'Warfarin',
    drugs:['Warfarin', 'Trimethoprim/Sulfamethoxazole'],
    genotypes:['CYP2C9:PM', 'VKORC1:sensitive'],
    tab:'pgx',
    expect:{
      priority:['High-priority interaction found', 'PGx High'],
      warning:['bleeding', 'INR'],
      mechanism:['CYP2C9', 'warfarin'],
      genotype:['VKORC1', 'CYP2C9'],
      evidence:['Warfarin', 'CYP2C9'],
    },
  },
  {
    name:'Opioid',
    drugs:['Codeine', 'Bupropion'],
    genotypes:['CYP2D6:null'],
    tab:'pgx',
    expect:{
      priority:['High-priority interaction found', 'PGx High'],
      warning:['activation blocked', 'analgesia'],
      mechanism:['CYP2D6', 'Morphine'],
      genotype:['Morphine', 'CYP2D6'],
      evidence:['Codeine', 'CYP2D6'],
    },
  },
  {
    name:'Oncology',
    drugs:['Azathioprine', 'Allopurinol'],
    genotypes:['TPMT:PM', 'NUDT15:PM'],
    tab:'pgx',
    expect:{
      priority:['High-priority interaction found', 'PGx High'],
      warning:['myelosuppression', 'toxicity'],
      mechanism:['xanthine oxidase', '6-TGN'],
      genotype:['6-thioguanine', 'TPMT'],
      evidence:['Azathioprine', 'TPMT'],
    },
  },
  {
    name:'G6PD',
    drugs:['Rasburicase', 'Primaquine', 'Dapsone'],
    genotypes:['G6PD:deficiency'],
    tab:'pgx',
    expect:{
      priority:['PGx High', 'High-priority'],
      warning:['hemolysis', 'methemoglobinemia'],
      mechanism:['oxidative', 'G6PD'],
      genotype:['G6PD deficiency', 'Primaquine'],
      evidence:['G6PD', 'Primaquine'],
    },
  },
  {
    name:'HLA',
    drugs:['Abacavir'],
    genotypes:['HLA-B*57:01:present'],
    tab:'pgx',
    expect:{
      priority:['PGx High'],
      warning:['hypersensitivity'],
      mechanism:['HLA-B*57:01', 'immune'],
      genotype:['HLA-B*57:01', 'Abacavir'],
      evidence:['Abacavir', 'HLA-B'],
    },
  },
  {
    name:'Anesthesia',
    drugs:['Succinylcholine'],
    genotypes:['BCHE:null', 'RYR1:present'],
    tab:'pgx',
    expect:{
      priority:['PGx High'],
      warning:['malignant hyperthermia', 'prolonged apnea'],
      mechanism:['BCHE', 'RYR1'],
      genotype:['BCHE', 'RYR1'],
      evidence:['Succinylcholine', 'BCHE'],
    },
  },
];

const rows = cases.map(collect);
assert(browserErrors.length === 0, `Browser errors:\n${browserErrors.join('\n')}`);

dom.window.close();
console.log(JSON.stringify(rows, null, 2));
console.log('Launch QA audit passed.');
