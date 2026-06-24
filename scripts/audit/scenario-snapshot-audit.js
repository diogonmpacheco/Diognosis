#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { JSDOM, VirtualConsole } from 'jsdom';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const MANIFEST_PATH = resolve(ROOT, 'tests/scenarios/diognosis-scenarios.json');
const SNAPSHOT_PATH = resolve(ROOT, 'tests/scenarios/diognosis-model-snapshots.json');
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

    window.history.replaceState(null, '', '/index.html?reviewer=1');
    setAudienceMode('clinician', { render:false });
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
    if (typeof setTab === "function") {
      setTab("evidence");
      setTab("review");
      setTab(scenario.tab || "overview");
    }

    const evidenceRefs = unique(findings.flatMap(finding => [
      ...(finding.evidenceRefs || []),
      ...((finding.whyPath?.evidenceRefs) || []),
    ]));
    const danglingEvidenceRefs = evidenceRefs.filter(ref => !(typeof getStudy === "function" ? getStudy(ref) : STUDY_DB[ref]));
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
      primaryFindingCardCount: document.querySelectorAll("#findingBody .primary-finding-card").length,
      primaryFindingEvidenceStepCount: Array.from(document.querySelectorAll("#findingBody .primary-finding-card"))
        .filter(card => /Evidence/i.test(card.textContent || "")).length,
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
  const { dom, browserErrors } = createDom();
  await new Promise((resolveReady) => setTimeout(resolveReady, 400));
  assert(browserErrors.length === 0, `Scenario page emitted browser errors: ${browserErrors.join('; ')}`);

  const modelScenarios = [];
  for (const scenario of manifest.modelScenarios || []) {
    const result = runModelScenario(dom.window, scenario);
    const expect = scenario.expect || {};
    assert(result.findingCount > 0, `${scenario.id}: expected normalized findings`);
    assert(result.findingCardCount >= (expect.minFindingCards || 1),
      `${scenario.id}: expected at least ${expect.minFindingCards || 1} finding cards, got ${result.findingCardCount}`);
    assert(result.primaryFindingCardCount > 0,
      `${scenario.id}: expected primary public finding cards`);
    assert(result.primaryFindingEvidenceStepCount === result.primaryFindingCardCount,
      `${scenario.id}: expected every primary finding card to include an Evidence step`);
    assert(result.allFindingsHaveEvidenceLadders,
      `${scenario.id}: every major finding must carry an evidence ladder`);
    assert(result.whyPathCount >= (expect.minWhyPaths || 1),
      `${scenario.id}: expected at least ${expect.minWhyPaths || 1} structured why paths, got ${result.whyPathCount}`);
    assert(result.mechanismWhyPathCount >= (expect.minWhyPaths || 1),
      `${scenario.id}: Mechanisms tab should render why paths`);
    assert(result.rawWarningPathCount >= (expect.minWhyPaths || 1),
      `${scenario.id}: Reviewer Console should expose technical pathways`);
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
    assert(result.sections.rawWarningPaths, `${scenario.id}: Review technical pathways should render`);
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
    schemaVersion: 3,
    generatedBy: 'scripts/audit/scenario-snapshot-audit.js',
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
    console.log(`Scenario snapshot audit passed: ${modelScenarios.length} model scenarios.`);
  }

  dom.window.close();
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
