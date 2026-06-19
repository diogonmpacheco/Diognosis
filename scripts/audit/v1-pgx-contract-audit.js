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

await new Promise((resolveReady) => setTimeout(resolveReady, 450));
const { window } = dom;

assert(browserErrors.length === 0, `V1 PGx audit emitted browser errors: ${browserErrors.join('; ')}`);
assert(window.eval('typeof buildV1GenotypeSignalTrustContract === "function"'), 'V1 genotype trust contract helper is not bundled');

const result = window.eval(`(() => {
  const failures = [];
  let failureCount = 0;

  function addFailure(message) {
    failureCount += 1;
    if (failures.length < 80) failures.push(message);
  }

  function resetCase(stack, genotypeState = {}) {
    activeStack = stack.slice();
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
    Object.keys(GENOTYPE_RISK_EFFECTS || {}).forEach(marker => activeGenotype[marker] = GENOTYPE_RISK_STATUS.ABSENT);
    for (const [gene, phenotype] of Object.entries(genotypeState || {})) {
      activeGenotype[gene] = phenotype;
      userGenetics[gene] = phenotype;
    }
    activeTab = 'overview';
    setAudienceMode('clinician', { render:false });
    renderAll();
  }

  function directSourceEligible(presentation, trust) {
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

  function assertPublicCase(label, options = {}) {
    const presentations = getCurrentPublicFindingPresentations();
    const body = document.getElementById('findingBody');
    const bodyText = body?.textContent || '';
    if (!presentations.length) {
      addFailure(label + ': no public PGx/risk finding presentation');
      return;
    }
    if (/pending professional review|review prompt|top-250|top-100|coverage adapter|route adapter|bulk_/i.test(bodyText)) {
      addFailure(label + ': public PGx card leaks internal wording');
    }
    if (!/Concern|Evidence|Confidence/i.test(bodyText)) {
      addFailure(label + ': public PGx card does not expose trust strip');
    }
    let ready = 0;
    let sourceLinked = 0;
    let directEligible = 0;
    let directLinks = 0;
    for (const presentation of presentations) {
      const trust = presentation.trustContract;
      if (!trust) {
        addFailure(label + ': ' + (presentation.title || presentation.id || 'presentation') + ' missing trust contract');
        continue;
      }
      if (!trust.ready || (trust.missingFields || []).length) {
        addFailure(label + ': ' + (presentation.title || presentation.id || 'presentation') + ' missing contract fields ' + (trust.missingFields || []).join(', '));
      } else {
        ready += 1;
      }
      if (trust.sourceLinked) sourceLinked += 1;
      if (directSourceEligible(presentation, trust)) directEligible += 1;
      const el = document.getElementById(presentation.targetElementId);
      if (el?.querySelectorAll('a.source-link')?.length) directLinks += 1;
    }
    if (options.requireSourceLinked && sourceLinked < 1) addFailure(label + ': no source-linked public PGx contract');
    if (directEligible > 0 && directLinks < 1) addFailure(label + ': direct PMID/DOI/source-eligible PGx card missing direct source link');
    if (ready < 1) addFailure(label + ': no V1-ready public PGx contract');
  }

  const actionCases = [];
  const actionGenes = new Set();
  for (const row of PGX_ACTION_SUMMARIES || []) {
    actionGenes.add(row.gene);
    for (const drug of mappedDrugNamesForAction(row)) {
      if (!getDrug(drug)) continue;
      for (const phenotype of row.phenotypes || []) {
        actionCases.push({ id:row.id, drug, gene:row.gene, phenotype });
      }
    }
  }

  for (const gene of actionGenes) {
    if (!getPgxMarkerMappings(gene).length) {
      addFailure('CPIC-linked PGx action gene ' + gene + ' lacks local star-allele/dbSNP/HLA marker mappings');
    }
  }

  for (const item of actionCases) {
    resetCase([item.drug], { [item.gene]:item.phenotype });
    const label = 'CPIC action ' + item.id + ' / ' + item.drug + ' / ' + item.gene + ' ' + item.phenotype;
    const actionRows = getPgxActionSummariesForStack(activeStack, activeGenotype || {});
    const standards = buildClinicalStandardsCoverage(activeStack, activeGenotype || {});
    const signal = getHighestGenotypePrioritySignal();
    if (!actionRows.length) addFailure(label + ': CPIC-linked PGx action row is not visible');
    if (!standards.pgxActionCount) addFailure(label + ': standards coverage does not count the PGx action');
    if (!standards.markerMappingCount) addFailure(label + ': standards coverage does not expose marker identity rows');
    if (!signal || signal.score < 30) addFailure(label + ': no prioritized genotype signal');
    assertPublicCase(label, { requireSourceLinked:true });
  }

  const riskCases = [];
  for (const [marker, risk] of Object.entries(GENOTYPE_RISK_EFFECTS || {})) {
    for (const effect of risk.drugEffects || []) {
      if (getDrug(effect.parent)) riskCases.push({ marker, drug:effect.parent });
    }
  }

  for (const item of riskCases) {
    resetCase([item.drug], { [item.marker]:GENOTYPE_RISK_STATUS.PRESENT });
    const label = 'Risk marker ' + item.marker + ' / ' + item.drug;
    const signal = getHighestGenotypePrioritySignal();
    if (!signal || signal.score < 30) addFailure(label + ': no prioritized risk-marker signal');
    assertPublicCase(label, { requireSourceLinked:true });
  }

  const highMetaboliteCases = [];
  for (const effect of GENOTYPE_METABOLITE_EFFECTS || []) {
    if (!getDrug(effect.parent) || !GENOTYPE_EFFECTS[effect.enzyme]) continue;
    for (const [phenotype, phenotypeEffect] of Object.entries(effect.effects || {})) {
      if (phenotype === GENOTYPE_PHENOTYPE.NM || phenotypeEffect.direction === 'baseline') continue;
      resetCase([effect.parent], { [effect.enzyme]:phenotype });
      const card = getGenotypeMetaboliteEffectCards(effect.parent).find(item => item.effect === effect);
      if (!card) continue;
      const score = scoreGenotypeMetaboliteSignal(card.effect, card.phenotypeEffect);
      if (score >= 70) {
        highMetaboliteCases.push({
          parent:effect.parent,
          enzyme:effect.enzyme,
          metabolite:effect.metaboliteName || effect.metaboliteId,
          phenotype,
          score,
        });
      }
    }
  }

  for (const item of highMetaboliteCases) {
    resetCase([item.parent], { [item.enzyme]:item.phenotype });
    const label = 'High-priority genotype-metabolite row ' + item.parent + ' / ' + item.enzyme + ' / ' + item.metabolite + ' / ' + item.phenotype;
    const signal = getHighestGenotypePrioritySignal();
    if (!signal || signal.score < 30) addFailure(label + ': no prioritized genotype-metabolite signal');
    assertPublicCase(label, { requireSourceLinked:true });
  }

  return {
    actionCases:actionCases.length,
    actionGenes:actionGenes.size,
    riskCases:riskCases.length,
    highMetaboliteCases:highMetaboliteCases.length,
    failureCount,
    failures,
  };
})()`);

assert(result.actionCases >= 20, `Expected at least 20 CPIC-linked PGx action cases, got ${result.actionCases}`);
assert(result.actionGenes >= 8, `Expected at least 8 CPIC-linked PGx action genes, got ${result.actionGenes}`);
assert(result.riskCases >= 40, `Expected at least 40 risk-marker drug cases, got ${result.riskCases}`);
assert(result.highMetaboliteCases >= 15, `Expected at least 15 high-priority genotype-metabolite cases, got ${result.highMetaboliteCases}`);
assert(result.failureCount === 0, `V1 PGx contract failures:\n${result.failures.slice(0, 30).join('\n')}`);

console.log(`V1 PGx contract audit passed: ${result.actionCases} CPIC-linked action cases, ${result.riskCases} risk-marker drug cases, and ${result.highMetaboliteCases} high-priority genotype-metabolite cases.`);
