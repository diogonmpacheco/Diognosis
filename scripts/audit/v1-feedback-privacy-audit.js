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
  url:'http://localhost/index.html',
});

await new Promise(resolveReady => setTimeout(resolveReady, 450));
const { window } = dom;

function runCase(drugs, genotypes = []) {
  window.eval(`(() => {
    activeStack = [];
    if (typeof drugDoses !== "undefined") Object.keys(drugDoses).forEach(k => delete drugDoses[k]);
    userGenetics = {};
    activeGenotypeDetails = {};
    activeGenotype = {};
    Object.keys(GENOTYPE_EFFECTS || {}).forEach(gene => activeGenotype[gene] = GENOTYPE_PHENOTYPE.NM);
    Object.keys(GENOTYPE_RISK_EFFECTS || {}).forEach(gene => activeGenotype[gene] = GENOTYPE_RISK_STATUS.ABSENT);
    setAudienceMode('clinician', { render:false });
    setTab('overview');
  })()`);
  for (const drug of drugs) window.addDrug(drug);
  for (const token of genotypes) {
    const [gene, value] = token.split(':');
    window.eval(`(() => {
      const gene = ${JSON.stringify(gene)};
      const value = ${JSON.stringify(value)};
      const phenotype = GENOTYPE_PHENOTYPE[value] || GENOTYPE_RISK_STATUS[value] || value;
      activeGenotype[gene] = phenotype;
      userGenetics[gene] = phenotype;
    })()`);
  }
  window.renderAll();
  window.setTab('evidence');
  window.setTab('review');
  return window.eval(`(() => ({
    activeStack:[...activeStack],
    genotypeTokens:activeGenotypeUrlTokens(),
    urls:[
      ...[...document.querySelectorAll('a.feedback-link')].map(link => link.href),
      ...[...document.querySelectorAll('a.review-action-btn[href*="github.com/diogonmpacheco/Diognosis/issues/new"]')].map(link => link.href),
    ],
    contributeText:document.getElementById('contributeBody')?.textContent || '',
  }))()`);
}

function decodedIssueText(url) {
  const parsed = new URL(url);
  return [
    parsed.searchParams.get('title') || '',
    parsed.searchParams.get('body') || '',
    parsed.searchParams.get('labels') || '',
  ].join('\n');
}

const cases = [
  { name:'PGx stack', drugs:['Clopidogrel', 'Omeprazole'], genotypes:['CYP2C19:PM'] },
  { name:'Deep launch stack', drugs:['Rasburicase', 'Primaquine', 'Dapsone'], genotypes:['G6PD deficiency:PRESENT'] },
  { name:'DDI stack', drugs:['Warfarin', 'Amiodarone'], genotypes:[] },
];

const failures = [];
let checkedUrls = 0;
for (const scenario of cases) {
  const result = runCase(scenario.drugs, scenario.genotypes);
  if (!/privacy-preserving GitHub issue drafts/i.test(result.contributeText)) {
    failures.push(`${scenario.name}: Review contribution copy does not explain privacy-preserving issue drafts`);
  }
  if (!result.urls.length) failures.push(`${scenario.name}: no feedback URLs found`);
  for (const href of result.urls) {
    checkedUrls += 1;
    const parsed = new URL(href);
    const text = decodedIssueText(href);
    if (parsed.origin !== 'https://github.com' || parsed.pathname !== '/diogonmpacheco/Diognosis/issues/new') {
      failures.push(`${scenario.name}: feedback URL targets unexpected destination ${href}`);
    }
    if (/substances=|medications=|drugs=|genotype=|diogonmpacheco\.github\.io\/Diognosis\/index\.html|localhost\/index\.html/i.test(text)) {
      failures.push(`${scenario.name}: feedback URL carries share/browser URL or URL-state context: ${text.slice(0, 240)}`);
    }
    for (const drug of result.activeStack) {
      const pattern = new RegExp(`\\b${drug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (pattern.test(text)) failures.push(`${scenario.name}: feedback URL carries selected medication ${drug}`);
    }
    for (const token of result.genotypeTokens || []) {
      const [gene] = String(token).split(':');
      if (gene && new RegExp(`\\b${gene.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)) {
        failures.push(`${scenario.name}: feedback URL carries selected genotype ${token}`);
      }
    }
    if (!/Add medication or genotype context only if you intentionally want to share it publicly/i.test(text)) {
      failures.push(`${scenario.name}: feedback URL body missing intentional-sharing privacy instruction`);
    }
  }
}

assert(browserErrors.length === 0, `Feedback privacy audit emitted browser errors: ${browserErrors.join('; ')}`);
assert(checkedUrls >= 3, `Expected at least 3 feedback URLs, checked ${checkedUrls}`);
assert(failures.length === 0, `V1 feedback privacy failures:\n${failures.join('\n')}`);

console.log(`V1 feedback privacy audit passed: ${checkedUrls} GitHub issue links carry no selected medication, genotype, share URL, or browser URL context.`);
