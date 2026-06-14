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

await new Promise((resolveReady) => setTimeout(resolveReady, 400));

const report = dom.window.eval(`(() => {
  const graph = getInteractionGraph();
  const graphPendingEvidence = new Set();
  const ddiPendingEvidence = new Set();
  const pendingOnlySevereCalibrated = [];

  for (const edge of graph.edges || []) {
    const studies = resolveEvidenceRefs(edge.props?.evidenceRefs || [], getEdgeEvidenceSupportKeys(edge));
    for (const study of studies) {
      if (study.reviewRequired === true) graphPendingEvidence.add(study.id);
    }
  }

  for (const ddi of KNOWN_DDI || []) {
    const profile = getDdiEvidenceProfile(ddi);
    for (const study of profile.studies || []) {
      if (study.reviewRequired === true) ddiPendingEvidence.add(study.id);
    }
    const onlyPending = ["severe", "critical"].includes(ddi.severity) &&
      (ddi.evidenceRefs || []).length &&
      (ddi.evidenceRefs || []).every(ref => STUDY_DB[ref]?.reviewRequired === true);
    if (onlyPending && calibrateDdiSeverity(ddi) === "severe") {
      pendingOnlySevereCalibrated.push({ pair: ddi.drug1 + " + " + ddi.drug2, refs: ddi.evidenceRefs });
    }
  }

  const fluoxetineEdge = graph.edges.find(edge =>
    edge.from === "fluoxetine" &&
    edge.to === "CYP2D6" &&
    edge.type === EDGE_TYPE.INHIBITS
  );
  const fluoxetineStudies = fluoxetineEdge
    ? resolveEvidenceRefs(fluoxetineEdge.props?.evidenceRefs || [], getEdgeEvidenceSupportKeys(fluoxetineEdge))
    : [];
  activeStack = ['Codeine', 'Fluoxetine'];
  userGenetics = {};
  activeGenotype = {
    CYP2D6: GENOTYPE_PHENOTYPE.PM,
    CYP2C19: GENOTYPE_PHENOTYPE.NM,
    CYP2C9: GENOTYPE_PHENOTYPE.NM,
    CYP3A4: GENOTYPE_PHENOTYPE.NM,
  };
  const findings = buildInteractionFindings(activeStack, activeGenotype, { interactions:calcRisk().interactions });
  const findingEvidenceRefs = [...new Set(findings.flatMap(finding => finding.evidenceRefs || []))];
  const danglingFindingEvidenceRefs = findingEvidenceRefs.filter(ref => !STUDY_DB[ref]);

  return {
    graphPendingEvidenceCount: graphPendingEvidence.size,
    ddiPendingEvidenceCount: ddiPendingEvidence.size,
    pendingOnlySevereCalibratedCount: pendingOnlySevereCalibrated.length,
    fluoxetineEdgeFound: Boolean(fluoxetineEdge),
    fluoxetineEdgeConfidence: fluoxetineEdge ? computeEdgeConfidence(fluoxetineEdge) : null,
    fluoxetinePendingEvidenceCount: fluoxetineStudies.filter(study => study.reviewRequired === true).length,
    fluoxetineEvidenceCount: fluoxetineStudies.length,
    findingCount: findings.length,
    findingEvidenceLadderCount: findings.filter(finding => finding.evidenceLadder?.clinicalActionConfidence).length,
    findingReviewedClaimCount: findings.filter(finding => finding.evidenceLadder?.professionalReviewStatus === 'reviewed' || finding.reviewRequired === false).length,
    severeFindingWithoutRefsOrReviewRequired: findings.filter(finding => ['severe','critical'].includes(finding.severity) && !(finding.evidenceRefs || []).length && finding.reviewRequired !== true).length,
    danglingFindingEvidenceRefs,
  };
})()`);

assert(browserErrors.length === 0, `Evidence calculation audit emitted browser errors: ${browserErrors.join('; ')}`);
assert(report.graphPendingEvidenceCount > 0, 'Expected pending-review evidence to feed graph edge confidence calculations');
assert(report.ddiPendingEvidenceCount > 0, 'Expected pending-review evidence to feed DDI evidence profile calculations');
assert(report.pendingOnlySevereCalibratedCount > 0, 'Expected at least one severe DDI supported only by pending-review refs to remain calculation-bearing');
assert(report.fluoxetineEdgeFound, 'Expected Fluoxetine -> CYP2D6 inhibition edge to exist');
assert(report.fluoxetinePendingEvidenceCount > 0, 'Expected Fluoxetine/CYP2D6 support-key evidence to include pending-review studies');
assert(report.fluoxetineEdgeConfidence > 0.5, `Expected Fluoxetine/CYP2D6 edge confidence to reflect linked support evidence, got ${report.fluoxetineEdgeConfidence}`);
assert(report.findingCount > 0, 'Expected normalized findings for Codeine + Fluoxetine + CYP2D6 PM');
assert(report.findingEvidenceLadderCount === report.findingCount, `Expected every normalized finding to carry an evidence ladder, got ${report.findingEvidenceLadderCount}/${report.findingCount}`);
assert(report.findingReviewedClaimCount === 0, 'Normalized findings must not claim professional review without review metadata');
assert(report.severeFindingWithoutRefsOrReviewRequired === 0, 'Severe/critical findings without refs must remain reviewRequired');
assert(report.danglingFindingEvidenceRefs.length === 0, `Normalized findings contain dangling evidence refs: ${report.danglingFindingEvidenceRefs.join(', ')}`);

console.log(`Evidence calculation audit passed: ${report.graphPendingEvidenceCount} pending studies feed graph confidence; ${report.ddiPendingEvidenceCount} feed DDI profiles.`);
