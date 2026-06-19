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
const { window } = dom;

assert(browserErrors.length === 0, `V1 contract audit emitted browser errors: ${browserErrors.join('; ')}`);
assert(window.eval('typeof buildV1FindingTrustContract === "function"'), 'V1 trust contract helper is not bundled');

const seeds = window.eval(`(() => {
  const out = [];
  const seen = new Set();
  function push(label, drugs, genotype = {}) {
    const cleanDrugs = (drugs || []).filter(name => name && getDrug(name));
    if (!cleanDrugs.length) return;
    const key = cleanDrugs.join('|') + '|' + JSON.stringify(genotype);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ label, drugs:cleanDrugs, genotype });
  }
  function pickRows(label, rows, limit) {
    for (const row of rows || []) {
      if (out.length >= 120) break;
      if (!row.drug1 || !row.drug2 || !getDrug(row.drug1) || !getDrug(row.drug2)) continue;
      push(label + ': ' + row.drug1 + ' + ' + row.drug2, [row.drug1, row.drug2]);
      if (out.filter(seed => seed.label.startsWith(label)).length >= limit) break;
    }
  }
  const knownRows = (KNOWN_DDI || []).filter(row => row && row.drug1 && row.drug2);
  pickRows('severe/critical DDI', knownRows.filter(row => /critical|severe/i.test(row.severity || '')), 28);
  pickRows('moderate DDI', knownRows.filter(row => /moderate/i.test(row.severity || '')), 28);
  pickRows('transporter DDI', knownRows.filter(row => /transporter|p-gp|oatp|oct|renal clearance/i.test([row.type, row.category, row.mechanism, row.effect].join(' '))), 18);
  pickRows('burden DDI', knownRows.filter(row => /qtc|serotonin|sedation|fall|bleed|anticholinergic|cns/i.test([row.type, row.category, row.mechanism, row.effect].join(' '))), 18);
  for (const row of COMBINATION_PRODUCTS || []) {
    if ((row.drugs || []).every(name => getDrug(name))) push('combination: ' + (row.drugs || []).join(' + '), row.drugs || []);
    if (out.filter(seed => seed.label.startsWith('combination')).length >= 10) break;
  }
  push('PGx CYP2D6 activation/clearance', ['Codeine', 'Fluoxetine'], { CYP2D6:'PM' });
  push('PGx CYP2C19 activation', ['Clopidogrel', 'Omeprazole'], { CYP2C19:'PM' });
  push('PGx DPYD toxicity', ['Capecitabine'], { DPYD:'PM' });
  push('PGx TPMT/NUDT15 toxicity', ['Azathioprine', 'Allopurinol'], { TPMT:'PM', NUDT15:'PM' });
  push('PGx UGT1A1 toxicity', ['Irinotecan'], { UGT1A1:'PM' });
  return out;
})()`);

function loadSeed(seed) {
  window.eval(`(() => {
    activeStack = [];
    currentInteractionFindings = [];
    currentClinicalConcerns = [];
    currentPublicFindingPresentations = [];
    renderComputationCache = null;
    lazyRenderState = { evidenceKey:'', reviewKey:'' };
    if (typeof drugDoses !== "undefined") Object.keys(drugDoses).forEach(k => delete drugDoses[k]);
    userGenetics = {};
    activeGenotypeDetails = {};
    activeGenotype = {
      CYP2D6: GENOTYPE_PHENOTYPE.NM,
      CYP2C19: GENOTYPE_PHENOTYPE.NM,
      CYP2C9: GENOTYPE_PHENOTYPE.NM,
    };
    activeTab = 'overview';
    setAudienceMode('clinician', { render:false });
  })()`);
  for (const [gene, value] of Object.entries(seed.genotype || {})) {
    window.eval(`(() => {
      const gene = ${JSON.stringify(gene)};
      const value = ${JSON.stringify(value)};
      const phenotype = GENOTYPE_PHENOTYPE[value] || value;
      activeGenotype[gene] = phenotype;
      userGenetics[gene] = phenotype;
    })()`);
  }
  for (const drug of seed.drugs) window.addDrug(drug);
  window.renderAll();
  return window.eval(`(() => ({
    presentations:getCurrentPublicFindingPresentations().map(presentation => ({
      id:presentation.id,
      title:presentation.title,
      severity:presentation.severity,
      trustContract:presentation.trustContract,
      cardText:document.getElementById(presentation.targetElementId)?.textContent || '',
      sourceActionCount:document.getElementById(presentation.targetElementId)?.querySelectorAll('.finding-actions .related-finding-btn').length || 0,
      directSourceCount:document.getElementById(presentation.targetElementId)?.querySelectorAll('a.source-link').length || 0,
      discussionGuideCount:document.getElementById(presentation.targetElementId)?.querySelectorAll('.finding-discussion').length || 0,
      monitoringGuideCount:document.getElementById(presentation.targetElementId)?.querySelectorAll('.finding-monitoring').length || 0,
      directSourceEligible:(presentation.trustContract?.evidenceRefs || []).some(ref => {
        const study = typeof getStudy === 'function' ? getStudy(ref) : STUDY_DB[ref];
        return !!(study && (study.pmid || study.doi || study.url));
      }),
    })),
    scopeVisible:document.getElementById('scopeSection')?.style.display !== 'none',
    scopeText:document.getElementById('scopeBody')?.textContent || '',
    scopeCount:document.getElementById('scopeCount')?.textContent || '',
    handoffText:typeof buildV1HandoffSummaryText === 'function' ? buildV1HandoffSummaryText() : '',
  }))()`);
}

function runKnownDdiPairContractSweep() {
  return window.eval(`(() => {
    const failures = [];
    let failureCount = 0;
    function addFailure(message) {
      failureCount += 1;
      if (failures.length < 80) failures.push(message);
    }
    const severityValue = { critical:5, severe:4, moderate:3, monitor:2, mild:2, low:1, info:1, unknown:0 };
    const pairs = [];
    const seen = new Set();
    for (const row of KNOWN_DDI || []) {
      if (!row?.drug1 || !row?.drug2 || !getDrug(row.drug1) || !getDrug(row.drug2)) continue;
      const key = [row.drug1, row.drug2].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ key, drugs:[row.drug1, row.drug2] });
    }

    function resetPair(drugs) {
      activeStack = drugs.slice();
      currentInteractionFindings = [];
      currentClinicalConcerns = [];
      currentPublicFindingPresentations = [];
      renderComputationCache = null;
      lazyRenderState = { evidenceKey:'', reviewKey:'' };
      if (typeof drugDoses !== "undefined") Object.keys(drugDoses).forEach(k => delete drugDoses[k]);
      userGenetics = {};
      activeGenotypeDetails = {};
      activeGenotype = {};
      Object.keys(GENOTYPE_EFFECTS || {}).forEach(gene => activeGenotype[gene] = GENOTYPE_PHENOTYPE.NM);
      Object.keys(GENOTYPE_RISK_EFFECTS || {}).forEach(gene => activeGenotype[gene] = GENOTYPE_RISK_STATUS.ABSENT);
      activeTab = 'overview';
      setAudienceMode('clinician', { render:false });
    }

    function plainText(html) {
      return String(html || "").replace(/<[^>]+>/g, " ").replace(/\\s+/g, " ").trim();
    }

    function firstVisibleRefsHaveDirectSource(presentation, trust) {
      const refs = [...new Set([
        ...(trust?.evidenceRefs || []),
        ...(presentation.sourceFinding?.evidenceRefs || []),
        ...(presentation.signal?.evidenceRefs || []),
      ])].filter(Boolean).slice(0, 3);
      return refs.some(ref => {
        const study = typeof getStudy === 'function' ? getStudy(ref) : STUDY_DB[ref];
        return !!(study && (study.pmid || study.doi || study.url));
      });
    }

    let checkedPairs = 0;
    let highPriorityPairs = 0;
    let highPriorityWithoutPublicConcern = 0;
    let checkedPresentations = 0;
    let sourceLinkedPresentations = 0;
    let directSourceEligiblePresentations = 0;

    for (const pair of pairs) {
      resetPair(pair.drugs);
      const cache = getRenderComputationCache();
      const findings = cache.findings || [];
      const presentations = buildPublicFindingPresentations(cache.clinicalConcerns || []);
      checkedPairs += 1;
      const highPriority = findings.some(finding =>
        (severityValue[finding.severity] || 0) >= 3 ||
        (finding.evidenceRefs || []).length ||
        finding.clinicalAction
      );
      if (highPriority) highPriorityPairs += 1;
      if (highPriority && !presentations.length) {
        highPriorityWithoutPublicConcern += 1;
        addFailure(pair.drugs.join(' + ') + ': high-priority engine signal has no public concern presentation');
      }
      for (const presentation of presentations) {
        checkedPresentations += 1;
        const trust = presentation.trustContract;
        const label = pair.drugs.join(' + ') + ': ' + (presentation.title || presentation.id || 'presentation');
        if (!trust) {
          addFailure(label + ' missing trust contract');
          continue;
        }
        if (!trust.ready || (trust.missingFields || []).length) {
          addFailure(label + ' missing contract fields ' + (trust.missingFields || []).join(', '));
        }
        if (!trust.affected || trust.affected === 'Current medication stack') {
          addFailure(label + ' has weak affected-actor label');
        }
        if ((presentation.severity === 'critical' || presentation.severity === 'severe') && !trust.limitationStatus) {
          addFailure(label + ' severe/critical contract missing limitation status');
        }
        const cardHtml = renderPublicFindingCard(presentation);
        const cardText = plainText(cardHtml);
        if (/pending professional review|review prompt|top-250|top-100|coverage adapter|route adapter|bulk_/i.test(cardText)) {
          addFailure(label + ' leaks internal wording in public card');
        }
        if (!/Concern|Evidence|Confidence/i.test(cardText)) {
          addFailure(label + ' public card does not expose trust strip');
        }
        if (!/Discussion guide/i.test(cardText)) {
          addFailure(label + ' public card missing clinician discussion guide');
        }
        if (!/Monitoring focus/i.test(cardText)) {
          addFailure(label + ' public card missing monitoring focus');
        }
        if (trust.sourceLinked) {
          sourceLinkedPresentations += 1;
          if (!/related-finding-btn/.test(cardHtml)) addFailure(label + ' source-linked card missing source action');
        }
        if (firstVisibleRefsHaveDirectSource(presentation, trust)) {
          directSourceEligiblePresentations += 1;
          if (!/class="[^"]*source-link/.test(cardHtml)) addFailure(label + ' missing direct PMID/DOI/source link');
        }
      }
    }

    return {
      totalPairs:pairs.length,
      checkedPairs,
      highPriorityPairs,
      highPriorityWithoutPublicConcern,
      checkedPresentations,
      sourceLinkedPresentations,
      directSourceEligiblePresentations,
      failureCount,
      failures,
    };
  })()`);
}

const failures = [];
let checkedPresentations = 0;
let checkedSeeds = 0;
let seedsWithoutFindings = 0;

for (const seed of seeds) {
  const result = loadSeed(seed);
  const presentations = result.presentations || [];
  if (!result.scopeVisible || !/Selected|Recognized|Concerns|Source-linked|Limit:/i.test(result.scopeText || '')) {
    failures.push(`${seed.label}: Review Scope panel missing required coverage and limit wording`);
  }
  if (/this list is safe|proved safe|no risk/i.test(result.scopeText || '')) {
    failures.push(`${seed.label}: Review Scope panel implies safety instead of bounded review`);
  }
  if (!/Diognosis V1 review summary|Review scope|Top concerns|Boundaries|Share link:/i.test(result.handoffText || '')) {
    failures.push(`${seed.label}: V1 handoff summary missing required sections`);
  }
  if (!seed.drugs.every(drug => (result.handoffText || '').includes(drug))) {
    failures.push(`${seed.label}: V1 handoff summary does not preserve stack drugs`);
  }
  if (!/not medical advice|not .*proof of safety|Do not start, stop, or change medication/i.test(result.handoffText || '')) {
    failures.push(`${seed.label}: V1 handoff summary missing patient-safe boundaries`);
  }
  if (/this list is safe|proved safe|no risk/i.test(result.handoffText || '')) {
    failures.push(`${seed.label}: V1 handoff summary implies safety instead of bounded review`);
  }
  if (!presentations.length) {
    seedsWithoutFindings += 1;
    continue;
  }
  checkedSeeds += 1;
  for (const presentation of presentations) {
    checkedPresentations += 1;
    const trust = presentation.trustContract;
    if (!trust) {
      failures.push(`${seed.label}: ${presentation.title} missing trust contract`);
      continue;
    }
    if (!trust.ready || (trust.missingFields || []).length) {
      failures.push(`${seed.label}: ${presentation.title} missing contract fields ${trust.missingFields.join(', ')}`);
    }
    if (!trust.affected || trust.affected === 'Current medication stack') {
      failures.push(`${seed.label}: ${presentation.title} has weak affected-actor label`);
    }
    if ((presentation.severity === 'critical' || presentation.severity === 'severe') && !trust.limitationStatus) {
      failures.push(`${seed.label}: ${presentation.title} severe/critical card missing limitation status`);
    }
    if (/pending professional review|review prompt|top-250|top-100|coverage adapter|route adapter/i.test(presentation.cardText || '')) {
      failures.push(`${seed.label}: ${presentation.title} leaks internal wording in Overview card`);
    }
    if (presentation.cardText && !/Concern|Evidence|Confidence/i.test(presentation.cardText)) {
      failures.push(`${seed.label}: ${presentation.title} card does not expose trust strip`);
    }
    if (presentation.discussionGuideCount < 1 || !/Discussion guide/i.test(presentation.cardText || '')) {
      failures.push(`${seed.label}: ${presentation.title} missing clinician discussion guide`);
    }
    if (presentation.monitoringGuideCount < 1 || !/Monitoring focus/i.test(presentation.cardText || '')) {
      failures.push(`${seed.label}: ${presentation.title} missing monitoring focus`);
    }
    if (trust.sourceLinked && presentation.sourceActionCount < 1) {
      failures.push(`${seed.label}: ${presentation.title} source-linked card missing source action`);
    }
    if (presentation.directSourceEligible && presentation.directSourceCount < 1) {
      failures.push(`${seed.label}: ${presentation.title} card missing direct PMID/DOI/source link`);
    }
  }
}

const pairSweep = runKnownDdiPairContractSweep();
failures.push(...pairSweep.failures);
if (pairSweep.failureCount > pairSweep.failures.length) {
  failures.push(`All-pair contract sweep had ${pairSweep.failureCount - pairSweep.failures.length} additional failure(s) not shown.`);
}

assert(seeds.length >= 80, `Expected broad V1 audit seed coverage, got ${seeds.length}`);
assert(checkedSeeds >= 50, `Expected at least 50 seeds with public findings, got ${checkedSeeds}; ${seedsWithoutFindings} had no public findings`);
assert(checkedPresentations >= 80, `Expected at least 80 public presentations, got ${checkedPresentations}`);
assert(pairSweep.totalPairs >= 3000, `Expected all-pair V1 contract sweep to cover at least 3000 DDI pairs, got ${pairSweep.totalPairs}`);
assert(pairSweep.checkedPairs === pairSweep.totalPairs, `All-pair V1 contract sweep skipped pairs: ${pairSweep.checkedPairs}/${pairSweep.totalPairs}`);
assert(pairSweep.highPriorityPairs >= 2500, `Expected broad high-priority DDI coverage, got ${pairSweep.highPriorityPairs}`);
assert(pairSweep.highPriorityWithoutPublicConcern === 0, `All-pair sweep found ${pairSweep.highPriorityWithoutPublicConcern} high-priority pair(s) without public concerns`);
assert(pairSweep.checkedPresentations >= 3000, `Expected all-pair sweep to check at least 3000 public presentations, got ${pairSweep.checkedPresentations}`);
assert(failures.length === 0, `V1 finding contract failures:\n${failures.slice(0, 30).join('\n')}`);

console.log(`V1 finding contract audit passed: ${checkedPresentations} rendered public finding presentations across ${checkedSeeds} data-derived stacks, plus ${pairSweep.checkedPresentations} presentations across ${pairSweep.checkedPairs} shipped DDI pairs.`);
