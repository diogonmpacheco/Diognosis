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

function assertSubset(actualValues, expectedValues, label) {
  const actual = new Set((actualValues || []).map(String));
  for (const expected of expectedValues || []) {
    assert(actual.has(String(expected)),
      `${label}: expected ${expected}, got ${[...actual].join(', ') || 'none'}`);
  }
}

function assertTermsPresent(text, terms, label) {
  const normalized = String(text || '').toLowerCase();
  for (const term of terms || []) {
    assert(normalized.includes(String(term).toLowerCase()),
      `${label}: expected rendered scenario text to include "${term}"`);
  }
}

function runScenario(window, scenario, fixtureSnapshot) {
  return window.eval(`((scenario, fixtureSnapshot) => {
    function phenotypeFromToken(gene, token) {
      const value = String(token || "").toLowerCase();
      if (GENOTYPE_EFFECTS[gene]) {
        if (["pm", "poor", "poor_metabolizer", "null", "no_function", "no function"].includes(value)) return GENOTYPE_PHENOTYPE.PM;
        if (["im", "intermediate", "intermediate_metabolizer"].includes(value)) return GENOTYPE_PHENOTYPE.IM;
        if (["um", "ultrarapid", "ultrarapid_metabolizer"].includes(value)) return GENOTYPE_PHENOTYPE.UM;
        if (["rapid", "rapid_metabolizer"].includes(value)) return GENOTYPE_PHENOTYPE.RM;
        return GENOTYPE_PHENOTYPE.NM;
      }
      if (GENOTYPE_RISK_EFFECTS[gene]) {
        return ["present", "detected", "positive", "risk", "deficiency", "deficient", "variant"].includes(value)
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

function runModelScenario(window, scenario) {
  return window.eval(`((scenario) => {
    function phenotypeFromToken(gene, token) {
      const value = String(token || "").toLowerCase();
      if (GENOTYPE_EFFECTS[gene]) {
        if (["pm", "poor", "poor_metabolizer", "null", "no_function", "no function"].includes(value)) return GENOTYPE_PHENOTYPE.PM;
        if (["im", "intermediate", "intermediate_metabolizer"].includes(value)) return GENOTYPE_PHENOTYPE.IM;
        if (["um", "ultrarapid", "ultrarapid_metabolizer"].includes(value)) return GENOTYPE_PHENOTYPE.UM;
        if (["rapid", "rapid_metabolizer"].includes(value)) return GENOTYPE_PHENOTYPE.RM;
        return GENOTYPE_PHENOTYPE.NM;
      }
      if (GENOTYPE_RISK_EFFECTS[gene]) {
        return ["present", "detected", "positive", "risk", "deficiency", "deficient", "variant"].includes(value)
          ? GENOTYPE_RISK_STATUS.PRESENT
          : GENOTYPE_RISK_STATUS.ABSENT;
      }
      return token;
    }

    function unique(values) {
      return [...new Set((values || []).filter(Boolean).map(String))].sort();
    }

    function sectionVisible(sectionId) {
      const section = document.getElementById(sectionId);
      return Boolean(section && section.style.display !== "none");
    }

    function sectionPanel(sectionId) {
      const section = document.getElementById(sectionId);
      return section?.closest(".tab-panel")?.id || "";
    }

    function findingTypes(findings) {
      const out = [];
      for (const finding of findings || []) {
        if (finding.type) out.push(finding.type);
        for (const grouped of finding.groupedFindings || []) if (grouped.type) out.push(grouped.type);
        for (const row of finding.sourceRows || []) {
          if (row?.netPattern) out.push("active_moiety");
          if (row?.functionalPhenotype) out.push("phenoconversion");
          if (row?.persistenceType) out.push("timing_washout");
        }
      }
      return unique(out);
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

    const risk = calcRisk();
    const activeMoietyRows = typeof computeActiveMoietyBalance === "function" ? computeActiveMoietyBalance(activeStack, activeGenotype) : [];
    const phenoconversionRows = typeof computePhenoconversionState === "function" ? computePhenoconversionState(activeStack, activeGenotype, { activeMoietyRows }) : [];
    const timelineRows = typeof computePersistenceTimeline === "function" ? computePersistenceTimeline(activeStack, activeGenotype) : [];
    const findings = typeof buildInteractionFindings === "function"
      ? buildInteractionFindings(activeStack, activeGenotype, {
          interactions:activeStack.length >= 2 ? risk.interactions : [],
          activeMoietyRows,
          phenoconversionRows,
          timelineRows,
        })
      : [];
    currentInteractionFindings = findings;
    renderAll();
    if (typeof setTab === "function") setTab(scenario.tab || "overview");

    const evidenceRefs = unique(findings.flatMap(finding => [
      ...(finding.evidenceRefs || []),
      ...((finding.whyPath?.evidenceRefs) || []),
    ]));
    const danglingEvidenceRefs = evidenceRefs.filter(ref => !STUDY_DB[ref]);
    const overviewText = document.getElementById("findingBody")?.textContent || "";
    const mechanismText = document.getElementById("mechanismWhyBody")?.textContent || "";
    const genesText = document.getElementById("activeMoietyBody")?.textContent + " " + document.getElementById("phenoconversionBody")?.textContent + " " + document.getElementById("genotypeBody")?.textContent;
    const timingText = document.getElementById("persistenceTimelineBody")?.textContent + " " + document.getElementById("washoutBody")?.textContent + " " + document.getElementById("pkSimBody")?.textContent;
    const evidenceText = document.getElementById("evidenceBody")?.textContent || "";
    const reviewText = document.getElementById("warningPathBody")?.textContent + " " + document.getElementById("reviewSummaryBody")?.textContent + " " + document.getElementById("scenarioSnapshotBody")?.textContent;
    const combinedText = [overviewText, mechanismText, genesText, timingText, evidenceText, reviewText].join(" ");
    const findingCards = Array.from(document.querySelectorAll("#findingBody .finding-card"));
    const reviewedCardClaims = findingCards.filter(card => /professionally reviewed/i.test(card.textContent || "")).length;
    const reviewedLadderClaims = findings.filter(finding => finding.evidenceLadder?.professionalReviewStatus === "reviewed").length;
    const severityCounts = risk.interactions.reduce((acc, ix) => {
      const key = ix.severity || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return {
      id: scenario.id,
      stack: [...activeStack],
      genotype: scenario.genotype || {},
      riskScore: risk.score,
      riskLevel: risk.level,
      interactionCount: risk.interactions.length,
      severityCounts,
      topInteractions: risk.interactions.slice(0, 5).map(${simplifyInteraction.toString()}),
      findingCount: findings.length,
      findingTypes: findingTypes(findings),
      findingCardCount: findingCards.length,
      evidenceLadderCount: document.querySelectorAll("#findingBody .evidence-ladder-compact").length,
      allFindingsHaveEvidenceLadders: findings.every(finding => finding.evidenceLadder && finding.evidenceLadder.clinicalActionConfidence),
      whyPathCount: findings.filter(finding => finding.whyPath?.nodes?.length && finding.whyPath?.edges?.length).length,
      mechanismWhyPathCount: document.querySelectorAll("#mechanismWhyBody .why-path").length,
      rawWarningPathCount: document.querySelectorAll("#warningPathBody .warning-path-row").length,
      evidenceLedgerPresent: Boolean(document.getElementById("evidenceLadderLedger")),
      falseReviewedClaims: reviewedCardClaims + reviewedLadderClaims,
      danglingEvidenceRefs,
      activeMoietyPatterns: unique(activeMoietyRows.map(row => row.netPattern)),
      activeMoietyActors: unique(activeMoietyRows.map(row => row.actor)),
      phenoconversionGenes: unique(phenoconversionRows.map(row => row.enzyme)),
      phenoconversionDirections: unique(phenoconversionRows.map(row => row.direction)),
      persistenceTypes: unique(timelineRows.map(row => row.persistenceType)),
      persistenceActors: unique(timelineRows.map(row => row.actor)),
      sections: {
        findings: sectionVisible("findingSection"),
        mechanismsWhy: sectionVisible("mechanismWhySection"),
        functionalGenes: sectionVisible("phenoconversionSection"),
        parentMetabolite: sectionVisible("activeMoietySection"),
        persistence: sectionVisible("persistenceTimelineSection"),
        evidence: sectionVisible("evidenceSection"),
        reviewSummary: sectionVisible("reviewSummarySection"),
        rawWarningPaths: sectionVisible("warningPathSection"),
      },
      sectionPanels: {
        findings: sectionPanel("findingSection"),
        mechanismsWhy: sectionPanel("mechanismWhySection"),
        functionalGenes: sectionPanel("phenoconversionSection"),
        parentMetabolite: sectionPanel("activeMoietySection"),
        persistence: sectionPanel("persistenceTimelineSection"),
        evidence: sectionPanel("evidenceSection"),
        reviewSummary: sectionPanel("reviewSummarySection"),
        rawWarningPaths: sectionPanel("warningPathSection"),
      },
      combinedText,
    };
  })(${JSON.stringify(scenario)})`);
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

  const modelScenarios = [];
  for (const scenario of manifest.modelScenarios || []) {
    const result = runModelScenario(dom.window, scenario);
    const expect = scenario.expect || {};
    assert(result.findingCount > 0, `${scenario.id}: expected normalized findings`);
    assert(result.findingCardCount >= (expect.minFindingCards || 1),
      `${scenario.id}: expected at least ${expect.minFindingCards || 1} finding cards, got ${result.findingCardCount}`);
    assert(result.evidenceLadderCount > 0,
      `${scenario.id}: expected compact evidence ladder on finding cards`);
    assert(result.allFindingsHaveEvidenceLadders,
      `${scenario.id}: every major finding must carry an evidence ladder`);
    assert(result.whyPathCount >= (expect.minWhyPaths || 1),
      `${scenario.id}: expected at least ${expect.minWhyPaths || 1} structured why paths, got ${result.whyPathCount}`);
    assert(result.mechanismWhyPathCount >= (expect.minWhyPaths || 1),
      `${scenario.id}: Mechanisms tab should render why paths`);
    assert(result.rawWarningPathCount >= (expect.minWhyPaths || 1),
      `${scenario.id}: Review tab should expose raw warning paths`);
    assert(result.evidenceLedgerPresent,
      `${scenario.id}: Evidence tab should expose the evidence ladder ledger`);
    assert(result.falseReviewedClaims === 0,
      `${scenario.id}: finding cards or ladders falsely claim professional review`);
    assert(result.danglingEvidenceRefs.length === 0,
      `${scenario.id}: dangling evidence refs ${result.danglingEvidenceRefs.join(', ')}`);
    assert(result.sections.findings, `${scenario.id}: Overview findings section should render`);
    assert(result.sections.mechanismsWhy, `${scenario.id}: Mechanisms why-path section should render`);
    assert(result.sections.parentMetabolite, `${scenario.id}: Genes + Metabolites parent-metabolite section should render`);
    assert(result.sections.persistence, `${scenario.id}: Timing + Levels persistence section should render`);
    assert(result.sections.evidence, `${scenario.id}: Evidence section should render`);
    assert(result.sections.reviewSummary, `${scenario.id}: Review summary section should render`);
    assert(result.sections.rawWarningPaths, `${scenario.id}: Review raw warning paths should render`);
    assert(result.sectionPanels.findings === 'tab-overview',
      `${scenario.id}: findings should live in Overview, got ${result.sectionPanels.findings}`);
    assert(result.sectionPanels.mechanismsWhy === 'tab-mechanisms',
      `${scenario.id}: why paths should live in Mechanisms, got ${result.sectionPanels.mechanismsWhy}`);
    assert(result.sectionPanels.parentMetabolite === 'tab-genes-metabolites',
      `${scenario.id}: parent-metabolite details should live in Genes + Metabolites, got ${result.sectionPanels.parentMetabolite}`);
    assert(result.sectionPanels.persistence === 'tab-timing-levels',
      `${scenario.id}: persistence should live in Timing + Levels, got ${result.sectionPanels.persistence}`);
    assert(result.sectionPanels.reviewSummary === 'tab-review',
      `${scenario.id}: review summary should live in Review, got ${result.sectionPanels.reviewSummary}`);
    assertSubset(result.findingTypes, expect.findingTypes || [], `${scenario.id} finding types`);
    assertSubset(result.activeMoietyPatterns, expect.activeMoietyPatterns || [], `${scenario.id} active-moiety patterns`);
    assertSubset(result.phenoconversionGenes, expect.phenoconversionGenes || [], `${scenario.id} phenoconverted genes`);
    assertSubset(result.persistenceTypes, expect.persistenceTypes || [], `${scenario.id} persistence types`);
    assertTermsPresent(result.combinedText, expect.terms || [], scenario.id);
    delete result.combinedText;
    modelScenarios.push(result);
  }

  const actual = {
    schemaVersion: 2,
    generatedBy: 'scripts/audit/scenario-snapshot-audit.js',
    fixtureImport: {
      release: summary.release,
      mappedRows: summary.mappedRows,
      contextFactsIncluded: summary.contextFactsIncluded,
      datasetCounts: summary.datasetCounts,
      inputFingerprint: summary.inputFingerprint,
    },
    scenarios,
    modelScenarios,
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
    console.log(`Scenario snapshot audit passed: ${scenarios.length} external scenarios, ${modelScenarios.length} model scenarios, ${summary.contextFactsIncluded} fixture context facts.`);
  }

  dom.window.close();
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
