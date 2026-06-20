#!/usr/bin/env node
import { resolve } from 'path';
import { loadDiognosisData, normalizeName, ROOT, uniq } from '../enrich/lib/diognosis-source-loader.js';
import { markdownTable, readJson, writeJson, writeText } from '../enrich/lib/enrichment-common.js';

const OUT_JSON = resolve(ROOT, 'docs/audits/stage-10-standards-full-audit.json');
const OUT_MD = resolve(ROOT, 'docs/audits/stage-10-standards-full-audit.md');
const check = process.argv.includes('--check');

const publicV1Substances = [
  'Allopurinol',
  'Amitriptyline',
  'Azathioprine',
  'Bupropion',
  'Capecitabine',
  'Clarithromycin',
  'Clopidogrel',
  'Codeine',
  'Dapsone',
  'Diazepam',
  'Diphenhydramine',
  'Fluoxetine',
  'Ibuprofen',
  'Irinotecan',
  'Metoprolol',
  'Nebivolol',
  'Omeprazole',
  'Oxycodone',
  'Paroxetine',
  'Primaquine',
  'Rasburicase',
  'Simvastatin',
  'Succinylcholine',
  'Warfarin',
  'Amiodarone',
];

const launchScenarios = [
  {
    id:'thiopurine-marrow-toxicity',
    label:'Thiopurine marrow toxicity',
    drugs:['Azathioprine', 'Allopurinol'],
    genes:['TPMT', 'NUDT15'],
    expectedActionGenes:['TPMT', 'NUDT15'],
  },
  {
    id:'fluoropyrimidine-toxicity',
    label:'Fluoropyrimidine toxicity',
    drugs:['Capecitabine'],
    genes:['DPYD'],
    expectedActionGenes:['DPYD'],
  },
  {
    id:'irinotecan-sn38-toxicity',
    label:'Irinotecan SN-38 toxicity',
    drugs:['Irinotecan'],
    genes:['UGT1A1'],
    expectedActionGenes:['UGT1A1'],
  },
  {
    id:'g6pd-oxidant-stack',
    label:'G6PD oxidant stack',
    drugs:['Rasburicase', 'Primaquine', 'Dapsone'],
    genes:['G6PD deficiency'],
    expectedActionGenes:['G6PD deficiency'],
  },
  {
    id:'anesthesia-pharmacogenetics',
    label:'Anesthesia pharmacogenetics',
    drugs:['Succinylcholine'],
    genes:['BCHE', 'RYR1/CACNA1S MH variant'],
    expectedActionGenes:['BCHE', 'RYR1/CACNA1S MH variant'],
  },
];

const data = loadDiognosisData(['src/data/clinicalStandards.js']);
const medicationGuides = readJson(resolve(ROOT, 'data/medication-class-guides.json'), { guides: [] });
const cpicStaged = readJson(resolve(ROOT, 'data/enrichment/staged/cpic-staged-records.json'), []);
const clinpgxStaged = readJson(resolve(ROOT, 'data/enrichment/staged/clinpgx-staged-records.json'), []);

const drugByKey = buildDrugLookup(data.DRUG_DB || []);
const rxNormByKey = new Map((data.EXTERNAL_SUBSTANCE_MAPPINGS || []).map(row => [normalizeName(row.substance), row]));
const markerMappings = data.PGX_MARKER_MAPPINGS || {};
const actionSummaries = data.PGX_ACTION_SUMMARIES || [];

const allDrugNames = (data.DRUG_DB || []).map(drug => drug.name).filter(Boolean);
const allDrugRxNorm = coverageForNames(allDrugNames);
const publicRxNorm = coverageForNames(publicV1Substances);
const launchDrugNames = uniq(launchScenarios.flatMap(row => row.drugs));
const launchRxNorm = coverageForNames(launchDrugNames);
const classGuideDrugNames = collectMedicationClassGuideSubstances(medicationGuides);
const classGuideRxNorm = coverageForNames(classGuideDrugNames);
const actionDrugNames = uniq(actionSummaries.flatMap(actionDrugNamesForRow));
const actionDrugRxNorm = coverageForNames(actionDrugNames);

const modeledGenes = Object.keys(data.GENOTYPE_EFFECTS || {}).sort();
const riskMarkers = Object.keys(data.GENOTYPE_RISK_EFFECTS || {}).sort();
const mappedMarkerGenes = Object.keys(markerMappings).sort();
const actionGenes = uniq(actionSummaries.map(row => row.gene)).sort();
const launchGeneCoverage = launchScenarios.map(scenario => ({
  id:scenario.id,
  label:scenario.label,
  genes:scenario.genes.map(gene => geneCoverageRow(gene)),
}));
const actionGeneMarkerGaps = actionGenes.filter(gene => !hasMarkerMapping(gene));
const modeledGeneMarkerGaps = modeledGenes.filter(gene => !hasMarkerMapping(gene));
const riskMarkerGaps = riskMarkers.filter(gene => !hasMarkerMapping(gene));
const pharmGkbPairs = flattenPharmGkbPairs();
const studyEvidenceRows = buildStudyEvidenceRows();

const launchActionCoverage = launchScenarios.map(scenario => {
  const rows = [];
  for (const gene of scenario.expectedActionGenes) {
    rows.push({
      gene,
      covered: scenario.drugs.some(drug => hasActionSummaryFor(gene, drug)),
      matchedDrugs: scenario.drugs.filter(drug => hasActionSummaryFor(gene, drug)),
      evidenceBacked: scenario.drugs.some(drug => hasLocalEvidenceFor(gene, drug)),
    });
  }
  return { id:scenario.id, label:scenario.label, rows };
});
const launchActionGaps = launchActionCoverage.flatMap(scenario =>
  scenario.rows.filter(row => !row.covered).map(row => ({
    scenario:scenario.label,
    gene:row.gene,
    evidenceBacked:row.evidenceBacked,
  }))
);

const cpicLikePairs = pharmGkbPairs.filter(row => row.isCpicLike);
const resolvedCpicLikePairs = cpicLikePairs.filter(row => resolveDrugName(row.drug));
const cpicLikeActionGapRows = resolvedCpicLikePairs
  .filter(row => !hasActionSummaryFor(row.gene, row.drug));
const cpicLikeRxNormGapRows = resolvedCpicLikePairs
  .filter(row => !hasRxNorm(row.drug));
const cpicLikeActionGaps = cpicLikeActionGapRows.slice(0, 50);
const cpicLikeRxNormGaps = cpicLikeRxNormGapRows.slice(0, 50);

const stagedSummary = summarizeStagedRecords(cpicStaged, clinpgxStaged);
const report = {
  generatedAt:new Date().toISOString(),
  standardsVersion:data.CLINICAL_STANDARDS_VERSION,
  counts:{
    drugs:allDrugNames.length,
    rxNormMappings:data.EXTERNAL_SUBSTANCE_MAPPINGS?.length || 0,
    pgxMarkerRows:Object.values(markerMappings).reduce((sum, rows) => sum + (rows || []).length, 0),
    pgxMarkerGenes:mappedMarkerGenes.length,
    pgxActionSummaries:actionSummaries.length,
    pgxActionDrugs:actionDrugNames.length,
    modeledGenes:modeledGenes.length,
    riskMarkers:riskMarkers.length,
    stagedCpicRecords:cpicStaged.length,
    stagedClinPgxRecords:clinpgxStaged.length,
  },
  rxNorm:{
    allDrugs:allDrugRxNorm,
    publicV1:publicRxNorm,
    launchScenarios:launchRxNorm,
    medicationClassGuides:classGuideRxNorm,
    pgxActionDrugs:actionDrugRxNorm,
  },
  pgxMarkers:{
    mappedMarkerGenes,
    actionGenes,
    actionGeneMarkerGaps,
    modeledGeneMarkerGaps:{ count:modeledGeneMarkerGaps.length, sample:modeledGeneMarkerGaps.slice(0, 30) },
    riskMarkerGaps,
    launchGeneCoverage,
  },
  actionability:{
    launchActionCoverage,
    launchActionGaps,
    cpicLikePairs:{
      total:cpicLikePairs.length,
      resolved:resolvedCpicLikePairs.length,
      missingActionSummaryCount:cpicLikeActionGapRows.length,
      missingActionSummarySample:cpicLikeActionGaps,
      missingRxNormCount:cpicLikeRxNormGapRows.length,
      missingRxNormSample:cpicLikeRxNormGaps,
    },
  },
  stagedSources:stagedSummary,
  uiBoundary:{
    reviewerConsole:'Covered by scripts/audit/v1-standards-coverage-audit.js for RxNorm summary, marker rows, CPIC actions, standards gaps, and SNOMED boundary.',
    v1Handoff:'Covered by scripts/audit/v1-standards-coverage-audit.js for standards identity text.',
    patientMode:'Patient mode intentionally avoids technical RxNorm/PGx/PMID wording; standards details belong in clinician/reviewer/handoff surfaces.',
    runtimePrivacy:'No live standards API calls are made by the browser; standards rows are local static data and release-checked by privacy-static audit.',
  },
  decisions:buildDecisions(),
};

if (!check) {
  writeJson(OUT_JSON, report);
  writeText(OUT_MD, renderMarkdown(report));
}

console.log(JSON.stringify({
  ok:true,
  rxNorm:{
    publicV1:`${publicRxNorm.mapped}/${publicRxNorm.total}`,
    launchScenarios:`${launchRxNorm.mapped}/${launchRxNorm.total}`,
    medicationClassGuides:`${classGuideRxNorm.mapped}/${classGuideRxNorm.total}`,
  },
  pgxMarkers:{
    actionGeneGaps:actionGeneMarkerGaps.length,
    launchMissing:launchGeneCoverage.flatMap(row => row.genes.filter(gene => !gene.covered)).length,
    riskMarkerGaps:riskMarkerGaps.length,
  },
  actionability:{
    launchActionGaps:launchActionGaps.length,
    cpicLikeMissingActionTotal:cpicLikeActionGapRows.length,
    cpicLikeMissingRxNormTotal:cpicLikeRxNormGapRows.length,
  },
  wrote:check ? null : { json:OUT_JSON, markdown:OUT_MD },
}, null, 2));

function buildDrugLookup(drugs) {
  const map = new Map();
  for (const drug of drugs) {
    const names = [
      drug.id,
      drug.name,
      drug.cls,
      ...(drug.aliases || []),
      ...(drug.brandNames || []),
      ...(drug.brands || []),
    ].filter(Boolean);
    for (const name of names) {
      const key = normalizeName(name);
      if (key && !map.has(key)) map.set(key, drug);
    }
  }
  return map;
}

function resolveDrugName(name) {
  const drug = drugByKey.get(normalizeName(name));
  return drug?.name || null;
}

function hasRxNorm(name) {
  const resolved = resolveDrugName(name) || name;
  return rxNormByKey.has(normalizeName(resolved));
}

function coverageForNames(names) {
  const rows = uniq(names).map(name => {
    const resolved = resolveDrugName(name);
    return {
      input:name,
      resolved:resolved || null,
      recognized:Boolean(resolved),
      mapped:Boolean(resolved && hasRxNorm(resolved)),
    };
  });
  const recognized = rows.filter(row => row.recognized);
  const mapped = recognized.filter(row => row.mapped);
  return {
    total:recognized.length,
    inputs:rows.length,
    unrecognized:rows.filter(row => !row.recognized).map(row => row.input).sort(),
    mapped:mapped.length,
    unmapped:recognized.filter(row => !row.mapped).map(row => row.resolved).sort(),
  };
}

function collectMedicationClassGuideSubstances(guides) {
  return uniq((guides.guides || []).flatMap(guide =>
    (guide.examples || []).flatMap(example => example.substances || [])
  ));
}

function actionDrugNamesForRow(row) {
  return uniq([row.drug, ...(row.drugs || [])].filter(Boolean));
}

function canonicalGeneCandidates(gene) {
  const raw = String(gene || '').trim();
  const upper = raw.toUpperCase();
  if (/^G6PD/.test(upper)) return ['G6PD', raw];
  if (/^RYR1\/CACNA1S/.test(upper)) return ['RYR1', 'CACNA1S', raw];
  if (/^HLA-B/.test(upper)) return ['HLA-B', raw];
  if (/^HLA-A/.test(upper)) return ['HLA-A', raw];
  return [upper, raw];
}

function hasMarkerMapping(gene) {
  return canonicalGeneCandidates(gene).some(candidate => (markerMappings[candidate] || []).length);
}

function geneCoverageRow(gene) {
  const candidates = canonicalGeneCandidates(gene);
  const matched = candidates.find(candidate => (markerMappings[candidate] || []).length) || null;
  return {
    gene,
    covered:Boolean(matched),
    matched,
    markerRows:matched ? markerMappings[matched].length : 0,
  };
}

function hasActionSummaryFor(gene, drug) {
  const geneCandidates = canonicalGeneCandidates(gene).map(normalizeName);
  const drugKey = normalizeName(resolveDrugName(drug) || drug);
  return actionSummaries.some(row => {
    if (!geneCandidates.includes(normalizeName(row.gene))) return false;
    return actionDrugNamesForRow(row).some(name => normalizeName(resolveDrugName(name) || name) === drugKey);
  });
}

function hasPharmGkbPair(gene, drug) {
  const geneCandidates = canonicalGeneCandidates(gene).map(normalizeName);
  const drugKey = normalizeName(resolveDrugName(drug) || drug);
  return pharmGkbPairs.some(row =>
    geneCandidates.includes(normalizeName(row.gene)) &&
    normalizeName(resolveDrugName(row.drug) || row.drug) === drugKey
  );
}

function hasLocalEvidenceFor(gene, drug) {
  if (hasPharmGkbPair(gene, drug)) return true;
  const geneKeys = canonicalGeneCandidates(gene).map(normalizeName).filter(Boolean);
  const drugKey = normalizeName(resolveDrugName(drug) || drug);
  if (!drugKey) return false;
  return studyEvidenceRows.some(row =>
    row.text.includes(drugKey) &&
    geneKeys.some(geneKey => row.text.includes(geneKey))
  );
}

function buildStudyEvidenceRows() {
  return Object.values(data.STUDY_DB || {}).map(study => ({
    id:study.id || '',
    text:normalizeName(JSON.stringify(study)),
  }));
}

function flattenPharmGkbPairs() {
  const rows = [];
  for (const [gene, block] of Object.entries(data.PHARMGKB_EVIDENCE || {})) {
    for (const pair of block.pairs || []) {
      const guidelineText = `${block.guideline || ''} ${pair.guidelineName || ''} ${pair.guidelineUrl || ''} ${(pair.evidenceRefs || []).join(' ')}`;
      rows.push({
        gene,
        drug:pair.drug || '',
        level:pair.level || '',
        guideline:block.guideline || pair.guidelineName || '',
        guidelineUrl:pair.guidelineUrl || '',
        classification:pair.classification || '',
        evidenceRefs:pair.evidenceRefs || [],
        isCpicLike:/\bCPIC\b|clinpgx\.org\/guideline/i.test(guidelineText),
        resolvedDrug:resolveDrugName(pair.drug || ''),
      });
    }
  }
  return rows;
}

function summarizeStagedRecords(cpicRecords, clinpgxRecords) {
  const countByClaim = records => records.reduce((acc, record) => {
    const type = record.claim?.claimType || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  return {
    cpic:{
      records:cpicRecords.length,
      claimTypes:countByClaim(cpicRecords),
      scoringEnabled:cpicRecords.filter(record => record.governance?.canAffectScoring).length,
    },
    clinpgx:{
      records:clinpgxRecords.length,
      claimTypes:countByClaim(clinpgxRecords),
      scoringEnabled:clinpgxRecords.filter(record => record.governance?.canAffectScoring).length,
    },
  };
}

function buildDecisions() {
  return [
    {
      area:'RxNorm',
      status:publicRxNorm.unmapped.length === 0 && launchRxNorm.unmapped.length === 0 && actionDrugRxNorm.unmapped.length === 0 ? 'pass-for-v1-core' : 'gap',
      decision:'Public V1/demo substances, launch scenario drugs, and PGx action drugs should stay fully mapped. Full 1549-drug RxNorm coverage is not a V1 blocker but should be expanded by priority surface.',
      nextAction:classGuideRxNorm.unmapped.length ? 'Prioritize RxNorm rows for public medication-class guide examples before broad database coverage.' : 'Maintain current V1 core coverage.',
    },
    {
      area:'PGx marker identity',
      status:actionGeneMarkerGaps.length === 0 ? 'pass-for-action-genes' : 'gap',
      decision:'Every CPIC-linked action gene should have local marker identity rows. Broad modeled genes and risk-marker genes need separate curation before they can be called standards-complete.',
      nextAction:riskMarkerGaps.length ? 'Define a risk-marker identity model for G6PD, RYR1/CACNA1S, BCHE, HLA-A, MT-RNR1, and similar non-CYP markers.' : 'Maintain current action-gene marker coverage.',
    },
    {
      area:'CPIC/actionability',
      status:launchActionGaps.length ? 'gap' : 'pass-for-launch',
      decision:'Launch scenarios should disclose whether they have CPIC-linked action context, not only mechanistic findings.',
      nextAction:launchActionGaps.length ? 'Start with evidence-backed launch gaps: UGT1A1 + irinotecan, G6PD oxidant stack, and RYR1/CACNA1S + succinylcholine; keep BCHE separate because its source basis is anesthesia/FDA label rather than CPIC.' : 'Maintain current launch action coverage.',
    },
    {
      area:'SNOMED/FHIR',
      status:'explicitly-out-of-scope-for-v1',
      decision:'The app does not ingest diagnoses, symptoms, EHR records, or patient identifiers, so SNOMED CT and FHIR integration are not part of V1 standards coverage.',
      nextAction:'Keep the current SNOMED boundary language until diagnosis/symptom ingestion exists.',
    },
  ];
}

function renderMarkdown(report) {
  const summaryRows = [
    ['All recognized drugs', report.rxNorm.allDrugs.mapped, report.rxNorm.allDrugs.total, report.rxNorm.allDrugs.unmapped.slice(0, 10).join(', ') || 'none'],
    ['Public V1/demo substances', report.rxNorm.publicV1.mapped, report.rxNorm.publicV1.total, report.rxNorm.publicV1.unmapped.join(', ') || 'none'],
    ['Launch scenario drugs', report.rxNorm.launchScenarios.mapped, report.rxNorm.launchScenarios.total, report.rxNorm.launchScenarios.unmapped.join(', ') || 'none'],
    ['Medication-class guide substances', report.rxNorm.medicationClassGuides.mapped, report.rxNorm.medicationClassGuides.total, report.rxNorm.medicationClassGuides.unmapped.slice(0, 15).join(', ') || 'none'],
    ['PGx action drugs', report.rxNorm.pgxActionDrugs.mapped, report.rxNorm.pgxActionDrugs.total, report.rxNorm.pgxActionDrugs.unmapped.join(', ') || 'none'],
  ];
  const launchRows = report.actionability.launchActionCoverage.flatMap(scenario =>
    scenario.rows.map(row => [
      scenario.label,
      row.gene,
      row.covered ? 'yes' : 'no',
      row.evidenceBacked ? 'yes' : 'no',
      row.matchedDrugs.join(', ') || 'none',
    ])
  );
  const markerRows = report.pgxMarkers.launchGeneCoverage.flatMap(scenario =>
    scenario.genes.map(row => [
      scenario.label,
      row.gene,
      row.covered ? 'yes' : 'no',
      row.matched || 'none',
      row.markerRows,
    ])
  );
  const decisionRows = report.decisions.map(row => [row.area, row.status, row.decision, row.nextAction]);
  const cpicGapRows = report.actionability.cpicLikePairs.missingActionSummarySample.slice(0, 20)
    .map(row => [row.gene, row.drug, row.level, row.guideline || 'unknown', row.resolvedDrug || 'unresolved']);

  return `# Stage 10 Standards Full Audit

Generated: ${report.generatedAt}

This audit corrects Stage 10 from a patch-focused pass into a full standards inventory. It separates current V1 pass/fail surfaces from broader standards work that should remain explicit backlog.

## Verdict

Stage 10 is not standards-complete if "complete" means every launch scenario has full CPIC/actionability and marker identity parity. The core public/demo RxNorm surface is covered, and CPIC action genes have marker rows, but launch-level action gaps remain for UGT1A1/irinotecan, G6PD oxidant review, and anesthesia risk-marker review. Broad RxNorm coverage is intentionally far below the full database size.

## Counts

- Drug database rows: ${report.counts.drugs}
- RxNorm mappings: ${report.counts.rxNormMappings}
- PGx marker rows: ${report.counts.pgxMarkerRows} across ${report.counts.pgxMarkerGenes} genes/markers
- PGx action summaries: ${report.counts.pgxActionSummaries}
- Modeled genotype genes: ${report.counts.modeledGenes}
- Risk-marker entries: ${report.counts.riskMarkers}
- Staged CPIC records: ${report.counts.stagedCpicRecords}
- Staged ClinPGx records: ${report.counts.stagedClinPgxRecords}

## RxNorm Coverage

${markdownTable(['Surface', 'Mapped', 'Recognized total', 'Sample gaps'], summaryRows)}

## Launch Actionability Coverage

${markdownTable(['Scenario', 'Gene/marker', 'PGx action summary', 'Local evidence', 'Matched action drugs'], launchRows)}

## Launch Marker Identity Coverage

${markdownTable(['Scenario', 'Gene/marker', 'Marker rows', 'Matched key', 'Row count'], markerRows)}

## CPIC-like Pair Gaps

- CPIC-like rows in local PHARMGKB_EVIDENCE: ${report.actionability.cpicLikePairs.total}
- Resolved local drug pairs: ${report.actionability.cpicLikePairs.resolved}
- Resolved CPIC-like rows without PGX_ACTION_SUMMARIES: ${report.actionability.cpicLikePairs.missingActionSummaryCount}
- Resolved CPIC-like rows lacking RxNorm: ${report.actionability.cpicLikePairs.missingRxNormCount}

${markdownTable(['Gene', 'Drug', 'Level', 'Guideline', 'Resolved drug'], cpicGapRows.length ? cpicGapRows : [['none', 'none', 'none', 'none', 'none']])}

## Decisions

${markdownTable(['Area', 'Status', 'Decision', 'Next action'], decisionRows)}

## UI And Boundary Audit

- Reviewer Console: ${report.uiBoundary.reviewerConsole}
- V1 handoff: ${report.uiBoundary.v1Handoff}
- Patient mode: ${report.uiBoundary.patientMode}
- Runtime privacy: ${report.uiBoundary.runtimePrivacy}
`;
}
