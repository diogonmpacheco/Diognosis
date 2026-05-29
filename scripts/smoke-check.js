#!/usr/bin/env node
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { JSDOM, VirtualConsole } from 'jsdom';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, '.tmp', 'smoke-index.html');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function evalInPage(win, expression) {
  return win.eval(expression);
}

console.log('Building smoke-test HTML...');
execFileSync(process.execPath, ['build.js', '--out', OUT], { cwd: ROOT, stdio: 'pipe' });

const html = readFileSync(OUT, 'utf8');
const browserErrors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (err) => {
  const msg = err && err.message ? err.message : String(err);
  if (!msg.includes('Could not load script: "https://cdnjs.cloudflare.com/ajax/libs/d3/')) {
    browserErrors.push(msg);
  }
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

const { window } = dom;
const doc = window.document;

assert(doc.title.includes('MedCheck'), 'Page title did not load');
assert(doc.getElementById('ver-engine')?.textContent === '3.5.2', 'Version strip did not render engine 3.5.2');
assert(evalInPage(window, 'DRUG_DB.length') >= 200, 'Drug database did not load');
assert(evalInPage(window, 'MEDCHECK_VERSION.engine') === '3.5.2', 'MEDCHECK_VERSION is not 3.5.2');

window.addDrug('Paroxetine');
window.addDrug('Codeine');
await new Promise((resolveReady) => setTimeout(resolveReady, 100));

assert(evalInPage(window, 'activeStack.length') === 2, 'Medication stack did not update');
assert(doc.getElementById('medCount')?.textContent.includes('2'), 'Medication count did not update');

const risk = evalInPage(window, 'calcRisk()');
assert(risk && Array.isArray(risk.interactions), 'Risk engine did not return interactions');
assert(risk.score > 0, 'Risk score should be positive for Paroxetine + Codeine');

const cyp2d6 = evalInPage(window, 'computeEnzymeCapacity("CYP2D6", ["Paroxetine", "Codeine"])');
assert(cyp2d6.capacity_pct < 100, 'CYP2D6 capacity should be impaired by Paroxetine');
assert(cyp2d6.inhibitors.some((i) => i.drug === 'Paroxetine'), 'CYP2D6 capacity did not identify Paroxetine');

const pk = evalInPage(window, 'pkSteadyStateMetrics(PK_PARAMS.paroxetine, pkGetTau("Paroxetine"))');
assert(pk.accum > 1, 'Paroxetine accumulation factor should be above 1');
assert(pk.t_to_ss_days > 0, 'Paroxetine steady-state time should be positive');

const summary = evalInPage(window, 'buildClinicalSummary()');
assert(summary && Array.isArray(summary.allEffects), 'Clinical summary did not return path effects');

assert(browserErrors.length === 0, `Browser errors:\n${browserErrors.join('\n')}`);

dom.window.close();
console.log('Smoke check passed.');
