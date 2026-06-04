#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import vm from 'vm';

const root = resolve(new URL('../..', import.meta.url).pathname);
const args = new Set(process.argv.slice(2));
const json = args.has('--json');
const outArg = process.argv.find(a => a.startsWith('--out='));

const files = [
  'src/data/constants.js',
  'src/data/rules.js',
  'src/data/drugs.js',
  'src/data/enzymes.js',
  'src/data/metabolites.js',
  'src/data/transporters.js',
  'src/data/actors.js',
  'src/data/evidence.js',
  'src/data/interactions.js',
];

const source = files.map(file => readFileSync(resolve(root, file), 'utf8')).join('\n');
const data = JSON.parse(vm.runInNewContext(`${source}
JSON.stringify((() => {
  const ddiCount = {};
  for (const ddi of KNOWN_DDI || []) {
    for (const name of [ddi.drug1, ddi.drug2]) {
      if (name) ddiCount[name] = (ddiCount[name] || 0) + 1;
    }
  }
  return { drugs:DRUG_DB, metabolites:METAB, ddiCount };
})())`, { console }));

const hasMetabolites = new Set(Object.keys(data.metabolites || {}));
const priorityClass = /antiarrhythmic|doac|anticoag|antiplatelet|antipsychotic|atypical ap|typical ap|ssri|snri|tca|anticonvulsant|opioid|azole|antifungal|antiviral|antiretroviral|chemotherapy|kinase|immunosuppress|transplant|jak|egfr|bcr-abl|nitrate|pde5|stimulant|adhd|maoi/i;
const genotypeRoute = /CYP2D6|CYP2C19|CYP2C9|CYP3A4|CYP3A5|CYP2B6|UGT|NAT2|DPYD|TPMT|SLCO1B1|ABCB1|ABCG2/;

function scoreDrug(drug) {
  const ddi = data.ddiCount[drug.name] || 0;
  const props = drug.props || {};
  const route = (drug.routes || []).map(r => r.enzyme).join('/');
  let score = ddi * 4;
  if (priorityClass.test(drug.cls || '')) score += 12;
  if (genotypeRoute.test(route)) score += 8;
  if (drug.prodrug) score += 12;
  if ((props.qtcRisk || 0) >= 2 || (props.qtc || 0) >= 2) score += 10;
  if ((props.bleedingRisk || 0) >= 2 || (props.bleed || 0) >= 2) score += 8;
  if (props.narrowTherapeuticIndex || props.nti || props.ntI) score += 12;
  return score;
}

const missing = data.drugs
  .filter(drug => !hasMetabolites.has(drug.name))
  .map(drug => ({
    name: drug.name,
    class: drug.cls,
    route: (drug.routes || []).map(r => r.enzyme).join('/'),
    ddiPairs: data.ddiCount[drug.name] || 0,
    score: scoreDrug(drug),
  }))
  .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

const report = {
  generatedAt: new Date().toISOString(),
  counts: {
    drugs: data.drugs.length,
    metaboliteParents: hasMetabolites.size,
    missingParents: missing.length,
    highPriorityMissing: missing.filter(row => row.score >= 24).length,
  },
  topMissing: missing.slice(0, 50),
};

if (outArg) {
  writeFileSync(resolve(root, outArg.slice('--out='.length)), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

if (json) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  console.log(`Metabolite coverage: ${report.counts.metaboliteParents}/${report.counts.drugs} drug parents mapped`);
  console.log(`Missing parent maps: ${report.counts.missingParents} (${report.counts.highPriorityMissing} high-priority)`);
  console.log('');
  for (const row of report.topMissing.slice(0, 20)) {
    console.log(`${String(row.score).padStart(2)}  ${row.name} — ${row.class} — ${row.route || 'route not modeled'} — ${row.ddiPairs} DDI pairs`);
  }
}
