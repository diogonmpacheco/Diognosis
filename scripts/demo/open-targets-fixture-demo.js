#!/usr/bin/env node
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { JSDOM, VirtualConsole } from 'jsdom';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const MANIFEST_PATH = resolve(ROOT, 'tests/scenarios/medcheck-scenarios.json');
const OUT_DIR = resolve(ROOT, '.tmp/open-targets-fixture-demo');
const OUT_SNAPSHOT_JS = resolve(OUT_DIR, 'generatedOpenTargetsFixtureSnapshot.js');
const OUT_AUDIT_MD = resolve(OUT_DIR, 'OPEN_TARGETS_FIXTURE_AUDIT.md');
const OUT_BASE_HTML = resolve(OUT_DIR, 'open-targets-fixture-demo.html');
const OUT_SCENARIO_DIR = resolve(OUT_DIR, 'scenarios');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function scenarioQuery(scenario) {
  const params = new URLSearchParams();
  if ((scenario.stack || []).length) params.set('substances', scenario.stack.join(','));
  for (const [gene, value] of Object.entries(scenario.genotype || {})) {
    params.append('genotype', `${gene}:${value}`);
  }
  if (scenario.tab) params.set('tab', scenario.tab);
  return `?${params.toString().replace(/%2C/g, ',').replace(/%3A/g, ':')}`;
}

function insertScenarioBootstrap(html, scenario) {
  const marker = '<script>\n// Diognosis / MedCheck Engine bundle';
  const query = scenarioQuery(scenario);
  const bootstrap = `<script>\nhistory.replaceState(null, '', '${query}');\n</script>\n`;
  assert(html.includes(marker), 'Could not find generated MedCheck bundle marker in fixture demo HTML.');
  return html.replace(marker, bootstrap + marker);
}

function replaceSnapshot(html, fixtureSnapshotSource) {
  const startMarker = 'const OPEN_TARGETS_SNAPSHOT_SCHEMA_VERSION = 1;';
  const endMarker = '\n\n// ═══ engine/evidenceEngine.js ═══';
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  assert(start >= 0 && end >= 0, 'Could not find Open Targets snapshot block in index.html. Run npm run build first.');
  return html.slice(0, start) + fixtureSnapshotSource.trim() + html.slice(end);
}

async function verifyScenarioPage(filePath, scenario) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (err) => errors.push(err?.message || String(err)));
  virtualConsole.on('error', (msg) => errors.push(String(msg)));
  const html = readFileSync(filePath, 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole,
    url: 'http://localhost/',
  });
  await new Promise((resolveReady) => setTimeout(resolveReady, 400));
  const document = dom.window.document;
  const cards = document.querySelectorAll('.external-context-card').length;
  const activeEvidence = document.querySelector('#tab-evidence')?.classList.contains('active') || false;
  const activeGenesMetabolites = document.querySelector('#tab-genes-metabolites')?.classList.contains('active') || false;
  const expectedTabActive = scenario.tab === 'genes-metabolites' ? activeGenesMetabolites : scenario.tab === 'evidence' ? activeEvidence : true;
  dom.window.close();
  assert(errors.length === 0, `${scenario.id}: demo page emitted errors: ${errors.join('; ')}`);
  assert(cards >= scenario.minExternalContextCards,
    `${scenario.id}: expected at least ${scenario.minExternalContextCards} external context cards, got ${cards}`);
  assert(expectedTabActive, `${scenario.id}: expected ${scenario.tab} tab to be active`);
  return { id: scenario.id, cards };
}

async function run() {
  assert(existsSync(resolve(ROOT, 'index.html')), 'index.html is missing. Run npm run build first.');
  const manifest = readJson(MANIFEST_PATH);
  const fixture = manifest.openTargetsFixture || {};

  mkdirSync(OUT_SCENARIO_DIR, { recursive: true });
  const importerOutput = execFileSync(process.execPath, [
    'scripts/integrations/open-targets/import-open-targets.js',
    '--input-dir', fixture.inputDir,
    '--manual-crosswalk', fixture.manualCrosswalk,
    '--release', fixture.release || 'fixture',
    '--out-js', OUT_SNAPSHOT_JS,
    '--out-md', OUT_AUDIT_MD,
  ], { cwd: ROOT, encoding: 'utf8' });
  const importerReport = JSON.parse(importerOutput);

  const baseHtml = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
  const fixtureSnapshotSource = readFileSync(OUT_SNAPSHOT_JS, 'utf8');
  const fixtureHtml = replaceSnapshot(baseHtml, fixtureSnapshotSource);
  writeFileSync(OUT_BASE_HTML, fixtureHtml, 'utf8');

  const scenarioOutputs = [];
  for (const scenario of manifest.scenarios || []) {
    const outputPath = resolve(OUT_SCENARIO_DIR, `${scenario.id}.html`);
    writeFileSync(outputPath, insertScenarioBootstrap(fixtureHtml, scenario), 'utf8');
    scenarioOutputs.push({ ...await verifyScenarioPage(outputPath, scenario), path: outputPath });
  }

  console.log(JSON.stringify({
    ok: true,
    note: 'Fixture demo pages use test-only Open Targets data. Production index.html is unchanged.',
    fixtureSummary: importerReport.summary,
    baseDemo: OUT_BASE_HTML,
    scenarioDemos: scenarioOutputs,
  }, null, 2));
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
