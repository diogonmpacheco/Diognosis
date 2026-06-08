#!/usr/bin/env node
// MedCheck release checklist
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

function loadBundleContext() {
  const html = readFileSync('index.html', 'utf8');
  const match = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/);
  if (!match) throw new Error('Could not find generated bundle in index.html.');

  const elements = {};
  const context = {
    console,
    document: {
      getElementById(id) {
        return elements[id] || (elements[id] = {
          innerHTML: '', textContent: '', style: {},
          classList: { add(){}, remove(){}, toggle(){} },
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
  vm.runInContext(`${match[1]}
globalThis.__RELEASE_CHECK__ = { DRUG_DB, STUDY_DB, MEDCHECK_VERSION };`, context);
  return context.__RELEASE_CHECK__;
}

run('Build index.html', node, ['build.js']);

console.log('\n▶ Verify release metadata');
const { DRUG_DB, STUDY_DB, MEDCHECK_VERSION } = loadBundleContext();
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const readme = readFileSync('README.md', 'utf8');
const index = readFileSync('index.html', 'utf8');
const smoke = readFileSync('scripts/smoke-check.js', 'utf8');
const regression = readFileSync('scripts/regression-check.js', 'utf8');

assert(pkg.version === MEDCHECK_VERSION.engine, `package.json version ${pkg.version} does not match MEDCHECK_VERSION.engine ${MEDCHECK_VERSION.engine}`);
assert(index.includes(`engine: "${MEDCHECK_VERSION.engine}"`), 'index.html engine metadata is stale; run build.js');
assert(index.includes(`drugDb: "${MEDCHECK_VERSION.drugDb}"`), 'index.html Drug DB metadata is stale; run build.js');
assert(smoke.includes(`'${MEDCHECK_VERSION.engine}'`) || smoke.includes(`"${MEDCHECK_VERSION.engine}"`), 'smoke-check.js expected engine version is stale');
assert(regression.includes(`'${MEDCHECK_VERSION.engine}'`) || regression.includes(`"${MEDCHECK_VERSION.engine}"`), 'regression-check.js expected engine version is stale');
assert(readme.includes(`**${DRUG_DB.length} drugs**`), `README drug count is stale; expected ${DRUG_DB.length}`);
assert(readme.includes(`**Drug DB v${MEDCHECK_VERSION.drugDb}**`), `README Drug DB version is stale; expected ${MEDCHECK_VERSION.drugDb}`);
assert(readme.includes(`**${Object.keys(STUDY_DB).length} evidence entries** in STUDY_DB`), `README study count is stale; expected ${Object.keys(STUDY_DB).length}`);

console.log(`✓ Engine ${MEDCHECK_VERSION.engine}`);
console.log(`✓ Drug DB ${MEDCHECK_VERSION.drugDb}`);
console.log(`✓ ${DRUG_DB.length} drugs`);
console.log(`✓ ${Object.keys(STUDY_DB).length} evidence entries`);

run('Database audit', node, ['scripts/database-audit.js']);
run('Data views audit', node, ['scripts/audit/data-views-audit.js']);
run('Evidence review UI audit', node, ['scripts/audit/evidence-review-ui-audit.js']);
run('Regression check', node, ['scripts/regression-check.js']);
run('Smoke check', node, ['scripts/smoke-check.js']);
run('Strict validation', node, ['scripts/validate-db.js', '--strict']);
run('Whitespace diff check', 'git', ['diff', '--check']);

console.log('\nRelease check passed.');
