#!/usr/bin/env node
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';
import { JSDOM, VirtualConsole } from 'jsdom';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const MANIFEST_PATH = resolve(ROOT, 'tests/scenarios/medcheck-scenarios.json');
const SNAPSHOT_PATH = resolve(ROOT, 'tests/scenarios/medcheck-model-snapshots.json');
const TMP_DIR = resolve(ROOT, '.tmp/open-targets-fixture');
const TMP_SNAPSHOT_JS = resolve(TMP_DIR, 'generatedOpenTargetsFixtureSnapshot.js');
const TMP_AUDIT_MD = resolve(TMP_DIR, 'OPEN_TARGETS_FIXTURE_AUDIT.md');
const UPDATE = process.argv.includes('--update');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function buildFixtureSnapshot(manifest) {
  mkdirSync(TMP_DIR, { recursive: true });
  const fixture = manifest.openTargetsFixture || {};
  const stdout = execFileSync(process.execPath, [
    'scripts/integrations/open-targets/import-open-targets.js',
    '--input-dir', fixture.inputDir,
    '--manual-crosswalk', fixture.manualCrosswalk,
    '--release', fixture.release || 'fixture',
    '--out-js', TMP_SNAPSHOT_JS,
    '--out-md', TMP_AUDIT_MD,
  ], { cwd: ROOT, encoding: 'utf8' });
  const importerReport = JSON.parse(stdout);
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${readFileSync(TMP_SNAPSHOT_JS, 'utf8')}
globalThis.__SNAPSHOT__ = GENERATED_OPEN_TARGETS_SNAPSHOT;`, context);
  return { importerReport, snapshot: context.__SNAPSHOT__ };
}

function createDom() {
  const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
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
    url: 'http://localhost/',
  });
  return { dom, browserErrors };
}

function simplifyInteraction(ix) {
  return {
    pair: [ix.drug1, ix.drug2].filter(Boolean).join(' + '),
    severity: ix.severity || null,
    type: ix.type || null,
    source: ix.source || null,
    enzyme: ix.enzyme || ix.affectedPathway || null,
  };
}

function runScenario(window, scenario, fixtureSnapshot) {
  return window.eval(`((scenario, fixtureSnapshot) => {
    function phenotypeFromToken(gene, token) {
      const value = String(token || "").toLowerCase();
      if (GENOTYPE_EFFECTS[gene]) {
        if (["pm", "poor", "poor_metabolizer"].includes(value)) return GENOTYPE_PHENOTYPE.PM;
        if (["im", "intermediate", "intermediate_metabolizer"].includes(value)) return GENOTYPE_PHENOTYPE.IM;
        if (["um", "ultrarapid", "ultrarapid_metabolizer"].includes(value)) return GENOTYPE_PHENOTYPE.UM;
        if (["rapid", "rapid_metabolizer"].includes(value)) return GENOTYPE_PHENOTYPE.RM;
        return GENOTYPE_PHENOTYPE.NM;
      }
      if (GENOTYPE_RISK_EFFECTS[gene]) {
        return ["present", "detected", "positive", "risk"].includes(value)
          ? GENOTYPE_RISK_STATUS.PRESENT
          : GENOTYPE_RISK_STATUS.ABSENT;
      }
      return token;
    }

    activeStack = [...(scenario.stack || [])];
    userGenetics = {};
    activeGenotypeDetails = {};
    activeGenotype = {};
    Object.keys(GENOTYPE_EFFECTS || {}).forEach(gene => { activeGenotype[gene] = GENOTYPE_PHENOTYPE.NM; });
    Object.keys(GENOTYPE_RISK_EFFECTS || {}).forEach(gene => { activeGenotype[gene] = GENOTYPE_RISK_STATUS.ABSENT; });
    for (const [gene, token] of Object.entries(scenario.genotype || {})) {
      const phenotype = phenotypeFromToken(gene, token);
      if (GENOTYPE_EFFECTS[gene]) setGenotypeState(gene, phenotype, { reportedLabel:String(token), source:"scenario_manifest" });
      else if (GENOTYPE_RISK_EFFECTS[gene]) {
        activeGenotype[gene] = phenotype;
        activeGenotypeDetails[gene] = buildRiskInterpretation(gene, phenotype, { reportedLabel:String(token), source:"scenario_manifest" });
      }
    }
    activeTab = scenario.tab || "overview";
    renderAll();

    const before = calcRisk();
    const beforeJson = JSON.stringify(before);
    const contexts = collectOpenTargetsSafetyContext(activeStack, fixtureSnapshot);
    renderExternalSafetyContext(fixtureSnapshot);
    const after = calcRisk();
    const section = document.getElementById("externalContextSection");
    const body = document.getElementById("externalContextBody");
    const cards = Array.from(body?.querySelectorAll(".external-context-card") || []);
    const datasets = [...new Set(contexts.map(ctx => ctx.openTargetsSourceDataset).filter(Boolean))].sort();
    const severityCounts = before.interactions.reduce((acc, ix) => {
      const key = ix.severity || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return {
      id: scenario.id,
      stack: [...activeStack],
      genotype: scenario.genotype || {},
      riskScore: before.score,
      riskLevel: before.level,
      interactionCount: before.interactions.length,
      severityCounts,
      factorCount: before.factors.length,
      topInteractions: before.interactions.slice(0, 5).map(${simplifyInteraction.toString()}),
      externalContextCount: contexts.length,
      externalContextDatasets: datasets,
      externalContextCardCount: cards.length,
      externalContextSectionVisible: section?.style.display !== "none",
      externalContextCountText: document.getElementById("externalContextCount")?.textContent || "",
      externalContextReviewBadges: cards.filter(card => /needs Diognosis review/.test(card.textContent || "")).length,
      riskUnchangedAfterExternalContext: beforeJson === JSON.stringify(after),
      afterRiskScore: after.score,
      afterInteractionCount: after.interactions.length,
    };
  })(${JSON.stringify(scenario)}, ${JSON.stringify(fixtureSnapshot)})`);
}

async function run() {
  const manifest = readJson(MANIFEST_PATH);
  const { importerReport, snapshot: fixtureSnapshot } = buildFixtureSnapshot(manifest);
  const fixtureExpectations = manifest.openTargetsFixture || {};
  const summary = importerReport.summary || {};
  assert(summary.mappedRows >= fixtureExpectations.minMappedRows,
    `Fixture importer mapped ${summary.mappedRows}; expected at least ${fixtureExpectations.minMappedRows}`);
  assert(summary.contextFactsIncluded >= fixtureExpectations.minContextFactsIncluded,
    `Fixture importer included ${summary.contextFactsIncluded} context facts; expected at least ${fixtureExpectations.minContextFactsIncluded}`);

  const { dom, browserErrors } = createDom();
  await new Promise((resolveReady) => setTimeout(resolveReady, 400));
  assert(browserErrors.length === 0, `Scenario page emitted browser errors: ${browserErrors.join('; ')}`);

  const scenarios = [];
  for (const scenario of manifest.scenarios || []) {
    const result = runScenario(dom.window, scenario, fixtureSnapshot);
    for (const dataset of scenario.expectedExternalDatasets || []) {
      assert(result.externalContextDatasets.includes(dataset),
        `${scenario.id}: expected external dataset ${dataset}, got ${result.externalContextDatasets.join(', ') || 'none'}`);
    }
    assert(result.externalContextCount >= scenario.minExternalContextCards,
      `${scenario.id}: expected at least ${scenario.minExternalContextCards} external cards, got ${result.externalContextCount}`);
    assert(result.externalContextCardCount === result.externalContextCount,
      `${scenario.id}: rendered card count ${result.externalContextCardCount} does not match context count ${result.externalContextCount}`);
    assert(result.externalContextReviewBadges === result.externalContextCardCount,
      `${scenario.id}: every external context card must carry a review badge`);
    if (scenario.mustNotAlterRisk) {
      assert(result.riskUnchangedAfterExternalContext,
        `${scenario.id}: external context changed calcRisk() from ${result.riskScore} to ${result.afterRiskScore}`);
      assert(result.interactionCount === result.afterInteractionCount,
        `${scenario.id}: external context changed interaction count`);
    }
    scenarios.push(result);
  }

  const actual = {
    schemaVersion: 1,
    generatedBy: 'scripts/audit/scenario-snapshot-audit.js',
    fixtureImport: {
      release: summary.release,
      mappedRows: summary.mappedRows,
      contextFactsIncluded: summary.contextFactsIncluded,
      datasetCounts: summary.datasetCounts,
      inputFingerprint: summary.inputFingerprint,
    },
    scenarios,
  };

  if (UPDATE) {
    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, stableJson(actual), 'utf8');
    console.log(`Scenario model snapshots updated: ${SNAPSHOT_PATH}`);
  } else {
    if (!existsSync(SNAPSHOT_PATH)) {
      throw new Error('Scenario snapshots are missing. Run node scripts/audit/scenario-snapshot-audit.js --update.');
    }
    const expected = readJson(SNAPSHOT_PATH);
    assert(stableJson(actual) === stableJson(expected),
      'Scenario model snapshots are stale. Run node scripts/audit/scenario-snapshot-audit.js --update and review the diff.');
    console.log(`Scenario snapshot audit passed: ${scenarios.length} scenarios, ${summary.contextFactsIncluded} fixture context facts.`);
  }

  dom.window.close();
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
