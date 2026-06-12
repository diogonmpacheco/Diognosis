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

const report = dom.window.eval(`(() => {
  const contextId = "ev_open_targets_context_fixture";
  const promotedId = "ev_open_targets_promoted_fixture";
  STUDY_DB[contextId] = {
    id: contextId,
    type: EVIDENCE_TIER.FDA_LABEL,
    title: "Open Targets context fixture",
    source: "Open Targets",
    studyDesign: "external_context_fixture",
    reviewRequired: true,
    sourceCategory: SOURCE_CATEGORY.OPEN_TARGETS_CONTEXT,
    importedContextOnly: true,
    notSeverityBearing: true,
    reviewDecision: REVIEW_DECISION.UNREVIEWED,
    openTargetsDrugId: "CHEMBL.FIXTURE",
    chemblId: "CHEMBL.FIXTURE",
    openTargetsRelease: "fixture",
    openTargetsSourceDataset: "drugWarnings",
    supports: ["fixture_open_targets_context"],
  };
  STUDY_DB[promotedId] = {
    id: promotedId,
    type: EVIDENCE_TIER.FDA_LABEL,
    title: "Promoted Open Targets context fixture",
    source: "Open Targets",
    studyDesign: "external_context_fixture",
    reviewRequired: true,
    sourceCategory: SOURCE_CATEGORY.OPEN_TARGETS_CONTEXT,
    importedContextOnly: false,
    notSeverityBearing: false,
    reviewDecision: REVIEW_DECISION.PROMOTED_FOR_SEVERITY,
    openTargetsDrugId: "CHEMBL.PROMOTED",
    chemblId: "CHEMBL.PROMOTED",
    openTargetsRelease: "fixture",
    openTargetsSourceDataset: "drugWarnings",
    supports: ["fixture_promoted_context"],
  };

  const contextOnlyDdi = {
    drug1: "Fixture A",
    drug2: "Fixture B",
    severity: "severe",
    evidenceRefs: [contextId],
    evidence: { confidence: "low", sources: [] },
  };
  const promotedDdi = {
    drug1: "Fixture A",
    drug2: "Fixture C",
    severity: "severe",
    evidenceRefs: [promotedId],
    evidence: { confidence: "low", sources: [] },
  };
  const contextEdge = {
    from: "fixture_a",
    to: "CYP3A4",
    type: EDGE_TYPE.INHIBITS,
    props: { evidenceRefs: [contextId] },
  };

  const contextProfile = getDdiEvidenceProfile(contextOnlyDdi);
  const promotedProfile = getDdiEvidenceProfile(promotedDdi);
  const normalizedContext = normalizeEvidence(contextOnlyDdi);

  const result = {
    contextIsExternal: isExternalContextEvidence(STUDY_DB[contextId]),
    contextSeverityBearing: isSeverityBearingEvidence(STUDY_DB[contextId]),
    contextHighTier: contextProfile.hasHighTierStudy,
    contextOnlyStudies: contextProfile.contextOnlyStudies.length,
    contextSeverityBearingStudies: contextProfile.severityBearingStudies.length,
    contextCalibratedSeverity: calibrateDdiSeverity(contextOnlyDdi),
    contextEdgeConfidence: computeEdgeConfidence(contextEdge),
    normalizedContextStudyCount: normalizedContext.studyCount,
    normalizedContextOnlyCount: normalizedContext.contextOnlyStudyCount,
    promotedIsExternal: isExternalContextEvidence(STUDY_DB[promotedId]),
    promotedSeverityBearing: isSeverityBearingEvidence(STUDY_DB[promotedId]),
    promotedHighTier: promotedProfile.hasHighTierStudy,
    promotedCalibratedSeverity: calibrateDdiSeverity(promotedDdi),
  };

  delete STUDY_DB[contextId];
  delete STUDY_DB[promotedId];
  return result;
})()`);

assert(browserErrors.length === 0, `External context firewall audit emitted browser errors: ${browserErrors.join('; ')}`);
assert(report.contextIsExternal === true, 'Fixture Open Targets context should be recognized as external context');
assert(report.contextSeverityBearing === false, 'Unreviewed Open Targets context must not be severity-bearing');
assert(report.contextHighTier === false, 'Unreviewed Open Targets context must not count as high-tier severity evidence');
assert(report.contextOnlyStudies === 1, `Expected one context-only study, got ${report.contextOnlyStudies}`);
assert(report.contextSeverityBearingStudies === 0, `Expected zero severity-bearing context studies, got ${report.contextSeverityBearingStudies}`);
assert(report.contextCalibratedSeverity === 'moderate', `External context alone must not preserve severe severity, got ${report.contextCalibratedSeverity}`);
assert(report.contextEdgeConfidence <= 0.5, `External context alone must not raise edge confidence, got ${report.contextEdgeConfidence}`);
assert(report.normalizedContextStudyCount === 0, `Severity normalization should ignore context-only studies, got ${report.normalizedContextStudyCount}`);
assert(report.normalizedContextOnlyCount === 1, `Severity normalization should retain context count for audit, got ${report.normalizedContextOnlyCount}`);
assert(report.promotedIsExternal === true, 'Promoted fixture should still be recognized as external provenance');
assert(report.promotedSeverityBearing === true, 'Explicitly promoted external context should be severity-bearing');
assert(report.promotedHighTier === true, 'Promoted external context should count once review fields allow it');
assert(report.promotedCalibratedSeverity === 'severe', `Promoted high-tier context should preserve severe severity, got ${report.promotedCalibratedSeverity}`);

console.log('External context firewall audit passed: unreviewed Open Targets-style context stays non-severity-bearing.');
