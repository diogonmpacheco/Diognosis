#!/usr/bin/env node
import { resolve } from 'path';
import { loadMedcheckData, ROOT, severityValue, uniq } from '../enrich/lib/medcheck-source-loader.js';
import { loadAllStagedRecords, markdownTable, readJson, writeJson, writeText } from '../enrich/lib/enrichment-common.js';

const OUT_JSON = resolve(ROOT, 'docs/audits/enrichment-coverage-audit.json');
const OUT_MD = resolve(ROOT, 'docs/audits/enrichment-coverage-audit.md');
const check = process.argv.includes('--check');

const HIGH_RISK_CLASS = /transplant|immunosuppress|oncology|chemotherapy|anticoag|antiplatelet|antiarrhythmic|opioid|ssri|snri|tca|antipsychotic|azole|macrolide|rifamycin|booster|hiv|antiviral|antifungal|maoi/i;
const PGX_ROUTE = /CYP2D6|CYP2C19|CYP2C9|CYP3A4|CYP3A5|CYP2B6|UGT|DPYD|TPMT|NUDT15|SLCO1B1|ABCB1|ABCG2|VKORC1|BCHE|G6PD/;

function ddiKey(a, b) {
  return [a, b].map(value => String(value || '').toLowerCase()).sort().join('|');
}

function sourceRefs(row) {
  return uniq([
    ...(row.evidenceRefs || []),
    ...(row.refs || []),
    ...(row.evidence?.refs || []),
    ...(row.evidence?.sources || []),
  ]);
}

function drugScore(drug, context) {
  const ddiCount = context.ddiCount.get(drug.name) || 0;
  const routeText = (drug.routes || []).map(route => route.enzyme).join('/');
  let score = ddiCount * 3;
  if (HIGH_RISK_CLASS.test(`${drug.name} ${drug.cls || ''}`)) score += 18;
  if (PGX_ROUTE.test(routeText)) score += 12;
  if (drug.prodrug) score += 14;
  if (drug.props?.narrowTherapeuticIndex || drug.props?.nti || drug.props?.ntI) score += 18;
  if ((drug.props?.qtcRisk || drug.props?.qtc || 0) >= 2) score += 10;
  if ((drug.props?.bleedingRisk || drug.props?.bleed || 0) >= 2) score += 8;
  return score;
}

function buildDrugCoverage(data) {
  const ddiCount = new Map();
  const evidenceByDrug = new Map();
  for (const row of data.KNOWN_DDI || []) {
    for (const name of [row.drug1, row.drug2].filter(Boolean)) ddiCount.set(name, (ddiCount.get(name) || 0) + 1);
    if (sourceRefs(row).length) {
      for (const name of [row.drug1, row.drug2].filter(Boolean)) {
        const refs = evidenceByDrug.get(name) || new Set();
        sourceRefs(row).forEach(ref => refs.add(ref));
        evidenceByDrug.set(name, refs);
      }
    }
  }
  const metaboliteParents = new Set(Object.keys(data.METAB || {}));
  const actorParents = new Set(Object.values(data.METABOLITE_ACTORS || {}).map(actor => actor.parentDrug).filter(Boolean));
  const pkKeys = new Set(Object.keys(data.PK_PARAMS || {}));
  const temporalKeys = new Set(Object.keys(data.TEMPORAL_PROFILES || {}));
  const washoutKeys = new Set(Object.keys(data.WASHOUT_DAYS || {}));
  const rows = (data.DRUG_DB || []).map(drug => {
    const routeText = (drug.routes || []).map(route => route.enzyme).join('/');
    const gaps = [];
    if (!evidenceByDrug.has(drug.name)) gaps.push('no direct DDI/evidence refs');
    if (!(ddiCount.get(drug.name) || 0)) gaps.push('no DDI rows');
    if (!metaboliteParents.has(drug.name)) gaps.push('no metabolite map');
    if (!actorParents.has(drug.name)) gaps.push('no active/toxic actor');
    if (!pkKeys.has(drug.id) && !pkKeys.has(String(drug.name || '').toLowerCase())) gaps.push('no PK profile');
    if (PGX_ROUTE.test(routeText) && !Object.keys(data.GENOTYPE_EFFECTS || {}).some(gene => routeText.includes(gene))) gaps.push('route gene not selectable');
    if (!temporalKeys.has(drug.id) && !washoutKeys.has(drug.id)) gaps.push('no timing/washout context');
    const score = drugScore(drug, { ddiCount }) + gaps.length * 4;
    return { name: drug.name, class: drug.cls || '', score, ddiPairs: ddiCount.get(drug.name) || 0, route: routeText, gaps };
  }).filter(row => row.gaps.length)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return rows;
}

function buildCombinationGaps(data) {
  const existing = new Set((data.KNOWN_DDI || []).map(row => ddiKey(row.drug1, row.drug2)));
  const drugs = data.DRUG_DB || [];
  const byName = new Map(drugs.map(drug => [drug.name, drug]));
  const classMatch = pattern => drugs.filter(drug => pattern.test(`${drug.name} ${drug.cls || ''}`));
  const cyp3aSubs = drugs.filter(drug => (drug.routes || []).some(route => route.enzyme === 'CYP3A4'));
  const cyp2c19Subs = drugs.filter(drug => (drug.routes || []).some(route => route.enzyme === 'CYP2C19') || drug.prodrug);
  const cyp2d6Prodrugs = drugs.filter(drug => drug.prodrug && (drug.routes || []).some(route => route.enzyme === 'CYP2D6'));
  const pairs = [];
  const add = (a, b, theme, score) => {
    if (!a || !b || a === b || existing.has(ddiKey(a, b))) return;
    pairs.push({ drug1: a, drug2: b, theme, score });
  };
  for (const inhibitor of classMatch(/azole|macrolide|ritonavir|cobicistat/i).slice(0, 12)) {
    for (const sub of cyp3aSubs.slice(0, 80)) add(inhibitor.name, sub.name, 'CYP3A inhibitor + CYP3A substrate', 80);
  }
  for (const inducer of classMatch(/rifampin|carbamazepine|phenytoin|St\.? John's Wort/i).slice(0, 12)) {
    for (const sub of cyp3aSubs.slice(0, 80)) add(inducer.name, sub.name, 'CYP3A/P-gp inducer + substrate', 75);
  }
  for (const inhibitor of classMatch(/omeprazole|fluconazole|fluoxetine|fluvoxamine/i).slice(0, 20)) {
    for (const sub of cyp2c19Subs.slice(0, 60)) add(inhibitor.name, sub.name, 'CYP2C19 inhibitor + CYP2C19/prodrug substrate', 70);
  }
  for (const inhibitor of classMatch(/fluoxetine|paroxetine|bupropion|quinidine/i).slice(0, 20)) {
    for (const sub of cyp2d6Prodrugs.slice(0, 40)) add(inhibitor.name, sub.name, 'CYP2D6 inhibitor + prodrug', 72);
  }
  for (const a of classMatch(/warfarin|apixaban|rivaroxaban|dabigatran|edoxaban/i)) {
    for (const b of classMatch(/nsaid|ibuprofen|naproxen|aspirin|ssri|snri|azole|amiodarone|antiplatelet/i)) add(a.name, b.name, 'anticoagulant/antiplatelet bleeding stack', 78);
  }
  for (const a of ['Tacrolimus', 'Cyclosporine', 'Sirolimus', 'Everolimus'].filter(name => byName.has(name))) {
    for (const b of classMatch(/azole|macrolide|ritonavir|cobicistat|rifampin|carbamazepine|phenytoin/i)) add(a, b.name, 'transplant immunosuppressant + inhibitor/inducer', 90);
  }
  return [...new Map(pairs.map(row => [`${row.theme}|${ddiKey(row.drug1, row.drug2)}`, row])).values()]
    .sort((a, b) => b.score - a.score || a.theme.localeCompare(b.theme))
    .slice(0, 100);
}

function buildPgxGaps(data, staged) {
  const modeledGenes = new Set(Object.keys(data.GENOTYPE_EFFECTS || {}));
  const stagedPairs = staged
    .filter(record => ['CPIC Data', 'ClinPGx'].includes(record.source?.name))
    .flatMap(record => (record.claim?.genes || []).flatMap(gene => (record.claim?.drugs || ['']).map(drug => ({
      source: record.source.name,
      gene,
      drug,
      id: record.id,
      claimType: record.claim?.claimType,
      geneModeled: modeledGenes.has(gene),
    }))));
  const unsupported = stagedPairs.filter(row => row.gene && !row.geneModeled);
  const modeledWithoutStructured = [...modeledGenes]
    .filter(gene => !stagedPairs.some(row => row.gene === gene))
    .map(gene => ({ source: 'Internal Diognosis curated data', gene, drug: '', claimType: 'modeled_without_structured_stage' }));
  return [...unsupported, ...modeledWithoutStructured].slice(0, 100);
}

function buildMetaboliteGaps(data) {
  const actorsByParent = new Map();
  for (const actor of Object.values(data.METABOLITE_ACTORS || {})) {
    const list = actorsByParent.get(actor.parentDrug) || [];
    list.push(actor);
    actorsByParent.set(actor.parentDrug, list);
  }
  const rows = [];
  for (const [parent, mets] of Object.entries(data.METAB || {})) {
    const actors = actorsByParent.get(parent) || [];
    for (const met of mets || []) {
      const actor = actors.find(row => row.name === met.n || row.id === met.id);
      const gaps = [];
      if (!actor) gaps.push('metabolite row has no actor');
      if (!met.evidenceRefs?.length && !actor?.evidenceRefs?.length) gaps.push('no evidence refs');
      if (actor && !actor.formingEnzyme && !met.e) gaps.push('no formation edge');
      if (actor && !actor.routes?.length && !actor.clearanceEnzyme) gaps.push('no clearance route');
      if (actor && !actor.halfLife && !met.t) gaps.push('no persistence data');
      if (gaps.length) rows.push({ parent, metabolite: met.n || actor?.name || met.id || 'unknown', gaps, score: gaps.length * 10 + (/active|toxic/i.test(`${met.a || ''} ${actor?.type || ''}`) ? 20 : 0) });
    }
  }
  return rows.sort((a, b) => b.score - a.score || a.parent.localeCompare(b.parent)).slice(0, 100);
}

function buildEvidenceGaps(data) {
  return (data.KNOWN_DDI || [])
    .filter(row => severityValue(row.severity) >= severityValue('severe') || /critical/i.test(row.severity || ''))
    .map(row => ({
      drug1: row.drug1,
      drug2: row.drug2,
      severity: row.severity || '',
      category: row.category || '',
      refs: sourceRefs(row),
      gap: sourceRefs(row).length ? 'pending professional review/source tier check' : 'no STUDY_DB refs',
      score: severityValue(row.severity) * 20 + (sourceRefs(row).length ? 0 : 30),
    }))
    .filter(row => row.gap)
    .sort((a, b) => b.score - a.score)
    .slice(0, 100);
}

function sourceCoverage(staged) {
  const names = ['PubMed', 'Europe PMC', 'OpenAlex', 'Unpaywall', 'CPIC Data', 'ClinPGx'];
  return Object.fromEntries(names.map(name => [name.toLowerCase().replace(/\s+/g, '_'), {
    stagedRecords: staged.filter(record => record.source?.name === name).length,
    pendingReview: staged.filter(record => record.source?.name === name && record.governance?.reviewRequired !== false).length,
  }]));
}

function main() {
  const data = loadMedcheckData();
  const { records: staged } = loadAllStagedRecords();
  const topMissingDrugs = buildDrugCoverage(data);
  const topMissingPairs = buildCombinationGaps(data);
  const topPgxGaps = buildPgxGaps(data, staged);
  const topMetaboliteGaps = buildMetaboliteGaps(data);
  const topEvidenceGaps = buildEvidenceGaps(data);
  const drafts = readJson(resolve(ROOT, 'scripts/enrich/drafts.json'), []);
  const report = {
    generated_at: new Date().toISOString(),
    counts: {
      drugs: data.DRUG_DB.length,
      ddi_pairs: data.KNOWN_DDI.length,
      study_entries: Object.keys(data.STUDY_DB || {}).length,
      staged_records: staged.length,
      literature_drafts: drafts.length,
      high_priority_missing_drugs: topMissingDrugs.filter(row => row.score >= 40).length,
      high_priority_missing_pairs: topMissingPairs.filter(row => row.score >= 80).length,
      pgx_gaps: topPgxGaps.length,
      metabolite_gaps: topMetaboliteGaps.length,
      evidence_gaps: topEvidenceGaps.length,
    },
    top_missing_drugs: topMissingDrugs.slice(0, 30),
    top_missing_pairs: topMissingPairs.slice(0, 30),
    top_pgx_gaps: topPgxGaps.slice(0, 30),
    top_metabolite_gaps: topMetaboliteGaps.slice(0, 30),
    top_evidence_gaps: topEvidenceGaps.slice(0, 30),
    source_coverage: sourceCoverage(staged),
    recommended_review_batches: [
      { id: 'p1-structured-pgx', reason: 'CPIC/ClinPGx structured records and unsupported genes', count: topPgxGaps.length },
      { id: 'p1-severe-evidence', reason: 'Severe/critical warnings needing source-tier/review checks', count: topEvidenceGaps.length },
      { id: 'p2-metabolite-map', reason: 'Metabolite actors missing evidence, clearance, or persistence', count: topMetaboliteGaps.length },
      { id: 'p2-missing-pairs', reason: 'Class-rule likely missing DDI combinations', count: topMissingPairs.length },
    ],
  };
  if (!check) {
    writeJson(OUT_JSON, report);
    writeText(OUT_MD, renderMarkdown(report));
  }
  console.log(JSON.stringify({ ok: true, counts: report.counts, topMissingDrug: report.top_missing_drugs[0]?.name || null, wrote: check ? null : { json: OUT_JSON, markdown: OUT_MD } }, null, 2));
}

function renderMarkdown(report) {
  return `# Enrichment Coverage Audit

Generated: ${report.generated_at}

${markdownTable(['Metric', 'Count'], Object.entries(report.counts).map(([k, v]) => [k, v]))}

## Top Missing Drugs

${markdownTable(['Drug', 'Class', 'Score', 'Gaps'], report.top_missing_drugs.slice(0, 15).map(row => [row.name, row.class, row.score, row.gaps.join('; ')]))}

## Top Missing Combinations

${markdownTable(['Drug 1', 'Drug 2', 'Theme', 'Score'], report.top_missing_pairs.slice(0, 15).map(row => [row.drug1, row.drug2, row.theme, row.score]))}

## Top PGx Gaps

${markdownTable(['Source', 'Gene', 'Drug', 'Claim'], report.top_pgx_gaps.slice(0, 15).map(row => [row.source, row.gene, row.drug, row.claimType]))}

## Top Metabolite Gaps

${markdownTable(['Parent', 'Metabolite', 'Gaps'], report.top_metabolite_gaps.slice(0, 15).map(row => [row.parent, row.metabolite, row.gaps.join('; ')]))}

## Top Evidence Gaps

${markdownTable(['Drug 1', 'Drug 2', 'Severity', 'Gap'], report.top_evidence_gaps.slice(0, 15).map(row => [row.drug1, row.drug2, row.severity, row.gap]))}
`;
}

main();
