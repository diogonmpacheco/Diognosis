import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import vm from 'vm';

export const node = process.execPath;

export function run(label, command, args = []) {
  console.log(`\n▶ ${label}`);
  const startedAt = Date.now();
  let passed = false;
  try {
    execFileSync(command, args, { stdio: 'inherit' });
    passed = true;
  } finally {
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`${passed ? '✓' : '✗'} ${label} ${passed ? 'completed' : 'failed'} in ${elapsed}s`);
  }
}

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function extractDiognosisBundle(html) {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .filter((match) => !/\bsrc\s*=/.test(match[0]));
  if (!scripts.length) throw new Error('Could not find generated bundle in index.html.');
  return scripts[scripts.length - 1][1];
}

export function loadBundleContext() {
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

export function verifyReleaseMetadata() {
  console.log('\n▶ Verify release metadata');
  const startedAt = Date.now();
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
  console.log(`✓ Verify release metadata completed in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);

  return { DRUG_DB, STUDY_DB, DIOGNOSIS_VERSION };
}
