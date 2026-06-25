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

assert(browserErrors.length === 0, `V1 PK audit emitted browser errors: ${browserErrors.join('; ')}`);

const result = window.eval(`(() => {
  const failures = [];
  let failureCount = 0;
  function addFailure(message) {
    failureCount += 1;
    if (failures.length < 80) failures.push(message);
  }

  function resetStack(stack, genotypeState = {}) {
    activeStack = stack.slice();
    currentInteractionFindings = [];
    currentClinicalConcerns = [];
    currentPublicFindingPresentations = [];
    renderComputationCache = null;
    lazyRenderState = { evidenceKey:'', reviewKey:'' };
    userGenetics = {};
    activeGenotypeDetails = {};
    activeGenotype = {};
    Object.keys(GENOTYPE_EFFECTS || {}).forEach(gene => activeGenotype[gene] = GENOTYPE_PHENOTYPE.NM);
    Object.keys(GENOTYPE_RISK_EFFECTS || {}).forEach(marker => activeGenotype[marker] = GENOTYPE_RISK_STATUS.ABSENT);
    for (const [gene, phenotype] of Object.entries(genotypeState || {})) {
      activeGenotype[gene] = phenotype;
      userGenetics[gene] = phenotype;
    }
    setAudienceMode('clinician', { render:false });
    renderPKSimulation();
  }

  function pathStats(d) {
    const nums = [...String(d || '').matchAll(/-?\\d+(?:\\.\\d+)?/g)].map(match => Number(match[0]));
    const xs = [];
    const ys = [];
    for (let i = 0; i < nums.length - 1; i += 2) {
      xs.push(nums[i]);
      ys.push(nums[i + 1]);
    }
    return {
      points:xs.length,
      uniqueX:new Set(xs.map(value => value.toFixed(1))).size,
      uniqueY:new Set(ys.map(value => value.toFixed(1))).size,
      finite:nums.every(Number.isFinite),
    };
  }

  function cardHasNonBlankCurve(card) {
    const svg = card?.querySelector('svg.pk-svg');
    if (!svg) return false;
    const strokePaths = [...svg.querySelectorAll('path')]
      .map(path => path.getAttribute('d') || '')
      .filter(d => /^M/.test(d));
    return strokePaths.some(d => {
      const stats = pathStats(d);
      return stats.finite && stats.points >= 20 && stats.uniqueX >= 10 && stats.uniqueY >= 4;
    });
  }

  let eligible = 0;
  let absolute = 0;
  let relative = 0;
  let compressed = 0;

  for (const drug of DRUG_DB || []) {
    const absoluteModel = !!getPKParams(drug.name);
    const relativeModel = !absoluteModel && !!pkRelativeForDrug(drug.name, { nPoints:20 });
    if (!absoluteModel && !relativeModel) continue;
    eligible += 1;
    if (absoluteModel) absolute += 1;
    else relative += 1;

    resetStack([drug.name]);
    const section = document.getElementById('pkSimSection');
    const body = document.getElementById('pkSimBody');
    const card = body?.querySelector('.pk-card');
    const text = body?.textContent || '';
    if (section?.style.display === 'none') addFailure(drug.name + ': PK section hidden for eligible drug');
    if (!card) {
      addFailure(drug.name + ': missing PK card');
      continue;
    }
    if (!cardHasNonBlankCurve(card)) addFailure(drug.name + ': PK SVG curve is blank or under-sampled');
    if (!/AUC/i.test(text) || !/Modeled peak/i.test(text)) addFailure(drug.name + ': missing AUC/modeled peak metric labels');
    if (!/Educational model only/i.test(text)) addFailure(drug.name + ': missing PK safety disclaimer');
    if (absoluteModel && !/modeled estimate/i.test(text)) addFailure(drug.name + ': missing modeled estimate badge');
    if (relativeModel && !/relative estimate/i.test(text)) addFailure(drug.name + ': missing relative estimate badge');
    if (/Curve window compressed/i.test(text)) compressed += 1;
  }

  resetStack(['Simvastatin', 'Clarithromycin']);
  const ddiCards = [...document.querySelectorAll('#pkSimBody .pk-card')];
  const simvastatinCard = ddiCards.find(card => /Simvastatin/i.test(card.textContent || ''));
  const simvastatinText = simvastatinCard?.textContent || '';
  const simvastatinSvg = simvastatinCard?.querySelector('svg.pk-svg');
  const simvastatinStrokePaths = simvastatinSvg
    ? [...simvastatinSvg.querySelectorAll('path')].map(path => path.getAttribute('d') || '').filter(d => /^M/.test(d))
    : [];
  if (!simvastatinCard) addFailure('Simvastatin + clarithromycin: missing Simvastatin PK card');
  else {
    if (!/DDI t½/i.test(simvastatinText)) addFailure('Simvastatin + clarithromycin: missing DDI half-life badge');
    if (!/AUC shift/i.test(simvastatinText)) addFailure('Simvastatin + clarithromycin: missing AUC shift label');
    if (simvastatinStrokePaths.length < 2) addFailure('Simvastatin + clarithromycin: missing adjusted PK curve path');
    if (!cardHasNonBlankCurve(simvastatinCard)) addFailure('Simvastatin + clarithromycin: adjusted PK chart is blank');
  }

  return { eligible, absolute, relative, compressed, failureCount, failures };
})()`);

assert(result.eligible >= 1500, `Expected at least 1500 PK-eligible profiles, got ${result.eligible}`);
assert(result.absolute >= 1400, `Expected at least 1400 absolute PK profiles, got ${result.absolute}`);
assert(result.relative >= 75, `Expected at least 75 relative fallback PK profiles, got ${result.relative}`);
assert(result.compressed >= 100, `Expected compressed-window coverage for short-acting profiles, got ${result.compressed}`);
assert(result.failureCount === 0, `V1 PK visualization failures:\n${result.failures.slice(0, 30).join('\n')}`);

console.log(`V1 PK visualization audit passed: ${result.absolute} absolute profiles, ${result.relative} relative fallback profiles, ${result.compressed} compressed short-acting curves, and one DDI-adjusted AUC curve.`);
