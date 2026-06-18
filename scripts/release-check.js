#!/usr/bin/env node
// Diognosis release checklist
// Rebuilds the bundle, verifies release metadata, and runs the full local gate.

import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import vm from 'vm';

const node = process.execPath;

function run(label, command, args = []) {
  console.log(`\n▶ ${label}`);
  execFileSync(command, args, { stdio: 'inherit' });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function extractDiognosisBundle(html) {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .filter((match) => !/\bsrc\s*=/.test(match[0]));
  if (!scripts.length) throw new Error('Could not find generated bundle in index.html.');
  return scripts[scripts.length - 1][1];
}

function loadBundleContext() {
  const html = readFileSync('index.html', 'utf8');
  const bundle = extractDiognosisBundle(html);

  const elements = {};
  const context = {
    console,
    document: {
      getElementById(id) {
        return elements[id] || (elements[id] = {
          innerHTML: '', textContent: '', style: {},
          classList: { add(){}, remove(){}, toggle(){} },
          setAttribute(){}, removeAttribute(){},
          nextElementSibling: { classList: { toggle(){} } },
        });
      },
      addEventListener(){},
      querySelector(){ return null; },
      querySelectorAll(){ return []; },
      createElement(){ return { className:'', textContent:'', style:{} }; },
    },
    window: { addEventListener(){}, location: { search: '' }, history: { replaceState(){} } },
    localStorage: { getItem(){ return null; }, setItem(){} },
    navigator: { userAgent: '' },
    d3: undefined,
    setTimeout(){},
    clearTimeout(){},
  };
  vm.createContext(context);
  vm.runInContext(`${bundle}
globalThis.__RELEASE_CHECK__ = { DRUG_DB, STUDY_DB, DIOGNOSIS_VERSION };`, context);
  return context.__RELEASE_CHECK__;
}

run('Build index.html', node, ['build.js']);

console.log('\n▶ Verify release metadata');
const { DRUG_DB, STUDY_DB, DIOGNOSIS_VERSION } = loadBundleContext();
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const readme = readFileSync('README.md', 'utf8');
const index = readFileSync('index.html', 'utf8');
const smoke = readFileSync('scripts/smoke-check.js', 'utf8');
const regression = readFileSync('scripts/regression-check.js', 'utf8');

assert(pkg.version === DIOGNOSIS_VERSION.engine, `package.json version ${pkg.version} does not match DIOGNOSIS_VERSION.engine ${DIOGNOSIS_VERSION.engine}`);
assert(new RegExp(`engine\\s*:\\s*["']${DIOGNOSIS_VERSION.engine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(index), 'index.html engine metadata is stale; run build.js');
assert(new RegExp(`drugDb\\s*:\\s*["']${DIOGNOSIS_VERSION.drugDb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(index), 'index.html Drug DB metadata is stale; run build.js');
assert(smoke.includes(`'${DIOGNOSIS_VERSION.engine}'`) || smoke.includes(`"${DIOGNOSIS_VERSION.engine}"`), 'smoke-check.js expected engine version is stale');
assert(regression.includes(`'${DIOGNOSIS_VERSION.engine}'`) || regression.includes(`"${DIOGNOSIS_VERSION.engine}"`), 'regression-check.js expected engine version is stale');
assert(readme.includes(`**${DRUG_DB.length} drugs**`), `README drug count is stale; expected ${DRUG_DB.length}`);
assert(readme.includes(`**Drug DB v${DIOGNOSIS_VERSION.drugDb}**`), `README Drug DB version is stale; expected ${DIOGNOSIS_VERSION.drugDb}`);
assert(readme.includes(`**${Object.keys(STUDY_DB).length} evidence entries** in STUDY_DB`), `README study count is stale; expected ${Object.keys(STUDY_DB).length}`);

console.log(`✓ Engine ${DIOGNOSIS_VERSION.engine}`);
console.log(`✓ Drug DB ${DIOGNOSIS_VERSION.drugDb}`);
console.log(`✓ ${DRUG_DB.length} drugs`);
console.log(`✓ ${Object.keys(STUDY_DB).length} evidence entries`);

run('Database audit', node, ['scripts/database-audit.js']);
run('Data views audit', node, ['scripts/audit/data-views-audit.js']);
run('Evidence ledger check', node, ['scripts/check-evidence.js']);
run('Generated artifact boundary audit', node, ['scripts/audit/generated-artifact-boundary-audit.js']);
run('Evidence review UI audit', node, ['scripts/audit/evidence-review-ui-audit.js']);
run('Evidence calculation audit', node, ['scripts/audit/evidence-calculation-audit.js']);
run('External context firewall audit', node, ['scripts/audit/external-context-firewall-audit.js']);
run('External context UI audit', node, ['scripts/audit/external-safety-context-ui-audit.js']);
run('Source registry audit', node, ['scripts/audit/source-registry-audit.js']);
run('Promotion boundary audit', node, ['scripts/audit/promotion-boundary-audit.js']);
run('Review overlay audit', node, ['scripts/audit/review-overlay-audit.js']);
run('Curated draft audit', node, ['scripts/audit/curated-draft-audit.js']);
run('Label source boundary audit', node, ['scripts/audit/label-source-boundary-audit.js']);
run('Scenario snapshot audit', node, ['scripts/audit/scenario-snapshot-audit.js']);
run('Deep launch QA audit', node, ['scripts/launch-qa-audit.js']);
run('Regression check', node, ['scripts/regression-check.js']);
run('Smoke check', node, ['scripts/smoke-check.js']);
run('Strict validation', node, ['scripts/validate-db.js', '--strict']);
run('Privacy/static audit', node, ['scripts/audit/privacy-static-audit.js']);
run('Whitespace diff check', 'git', ['diff', '--check']);

console.log('\nRelease check passed.');
