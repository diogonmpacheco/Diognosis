#!/usr/bin/env node
import { resolve } from 'path';
import { loadMedcheckData, ROOT, severityValue, uniq } from './lib/medcheck-source-loader.js';
import { dedupeStagedSourceRecords, normalizeStagedSourceRecord } from './lib/staged-source-schema.js';
import { writeJson } from './lib/enrichment-common.js';

const CPIC_GENES = new Set([
  'CYP2D6', 'CYP2C19', 'CYP2C9', 'CYP2B6', 'CYP3A5', 'CYP4F2',
  'DPYD', 'TPMT', 'NUDT15', 'UGT1A1', 'SLCO1B1', 'VKORC1',
  'HLA-A', 'HLA-B', 'G6PD', 'BCHE', 'IFNL3', 'IFNL4',
]);

const DEFAULT_OUT = resolve(ROOT, 'data/enrichment/staged/cpic-staged-records.json');
const DEFAULT_META = resolve(ROOT, 'data/enrichment/snapshots/cpic-snapshot-metadata.json');

function parseArgs(argv) {
  const args = { out: DEFAULT_OUT, metadata: DEFAULT_META, limit: 120 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') args.out = resolve(ROOT, argv[++i]);
    else if (arg.startsWith('--out=')) args.out = resolve(ROOT, arg.slice(6));
    else if (arg === '--metadata') args.metadata = resolve(ROOT, argv[++i]);
    else if (arg.startsWith('--metadata=')) args.metadata = resolve(ROOT, arg.slice(11));
    else if (arg === '--limit') args.limit = Number(argv[++i]);
    else if (arg.startsWith('--limit=')) args.limit = Number(arg.slice(8));
  }
  return args;
}

function highRiskScore(drug, ddiCount = 0) {
  const text = `${drug.name} ${drug.cls || ''} ${(drug.routes || []).map(route => route.enzyme).join(' ')}`;
  let score = ddiCount * 3;
  if (/transplant|immunosuppress|oncology|chemotherapy|anticoag|antiplatelet|antiarrhythmic|opioid|ssri|snri|tca|antipsychotic|azole|macrolide|rifamycin|booster/i.test(text)) score += 20;
  if (drug.prodrug) score += 16;
  if (drug.props?.narrowTherapeuticIndex || drug.props?.nti || drug.props?.ntI) score += 18;
  if ((drug.props?.qtcRisk || drug.props?.qtc || 0) >= 2) score += 10;
  return score;
}

function sourceBase(fetchedAt) {
  return {
    name: 'CPIC Data',
    sourceType: 'structured_guideline',
    url: 'https://api.cpicpgx.org',
    endpoint: 'local-check-mode',
    fetchedAt,
    license: 'source-specific',
    licenseUrl: 'https://cpicpgx.org',
    attribution: 'CPIC Data review candidate; confirm current CPIC source before promotion.',
    refreshCadence: 'weekly',
  };
}

function makeRecord({ fetchedAt, gene, drug, claimType, evidenceRefs = [], sourceIdentifiers = [], mechanismSummary, clinicalSummary, warnings = [] }) {
  return normalizeStagedSourceRecord({
    source: sourceBase(fetchedAt),
    claim: {
      claimType,
      genes: gene ? [gene] : [],
      drugs: drug ? [drug] : [],
      pathways: gene ? [gene] : [],
      mechanismSummary,
      clinicalSummary,
    },
    evidence: {
      sourceIdentifiers,
      urls: ['https://cpicpgx.org'],
      strongestExternalTier: claimType === 'publication' ? 'GUIDELINE' : 'structured_guideline',
      openAccess: {
        hasLegalOpenAccess: false,
        provider: 'CPIC Data',
        license: 'source-specific',
        url: 'https://cpicpgx.org',
      },
    },
    mapping: {
      matchedDiognosisDrugs: drug ? [drug] : [],
      matchedGenes: gene ? [gene] : [],
      matchedEvidenceRefs: evidenceRefs,
    },
    governance: {
      reviewRequired: true,
      professionalReviewStatus: 'pending',
      sourceFaithfulnessStatus: 'unreviewed',
      canAffectScoring: false,
      canAffectPublicSeverity: false,
      canBeBundledPublicly: false,
      promotionTarget: null,
    },
    notes: ['Generated in CPIC check mode from local Diognosis coverage. Fetch/verify CPIC Data before promotion.'],
    warnings,
  });
}

function buildCpicRecords() {
  const data = loadMedcheckData();
  const fetchedAt = new Date().toISOString();
  const ddiCount = new Map();
  for (const row of data.KNOWN_DDI) {
    for (const name of [row.drug1, row.drug2].filter(Boolean)) ddiCount.set(name, (ddiCount.get(name) || 0) + 1);
  }
  const records = [];

  for (const study of Object.values(data.STUDY_DB || {})) {
    const text = `${study.title || ''} ${study.source || ''}`.toLowerCase();
    if (!text.includes('cpic')) continue;
    const genes = uniq([...(study.phenotypes || []), ...(study.supports || [])]
      .flatMap(value => String(value).match(/[A-Z0-9-]+/g) || [])
      .filter(value => CPIC_GENES.has(value)));
    for (const gene of genes.length ? genes : ['']) {
      records.push(makeRecord({
        fetchedAt,
        gene,
        drug: '',
        claimType: 'publication',
        evidenceRefs: [study.id].filter(Boolean),
        sourceIdentifiers: [study.id, study.pmid && `PMID:${study.pmid}`, study.doi && `DOI:${study.doi}`].filter(Boolean),
        mechanismSummary: `Existing Diognosis evidence references CPIC: ${study.title || study.id}.`,
        clinicalSummary: 'Review whether this CPIC-linked evidence should support a curated PGx rule or STUDY_DB update.',
      }));
    }
  }

  const candidates = [];
  for (const drug of data.DRUG_DB || []) {
    for (const route of drug.routes || []) {
      if (!CPIC_GENES.has(route.enzyme)) continue;
      candidates.push({
        drug: drug.name,
        gene: route.enzyme,
        score: highRiskScore(drug, ddiCount.get(drug.name) || 0),
        reason: drug.prodrug ? 'prodrug route' : route.evidence?.confidence ? `${route.evidence.confidence} route evidence` : 'modeled route',
      });
    }
  }
  for (const row of data.GENOTYPE_METABOLITE_EFFECTS || []) {
    if (!CPIC_GENES.has(row.enzyme)) continue;
    candidates.push({
      drug: row.parent,
      gene: row.enzyme,
      metabolite: row.metaboliteName || row.metaboliteId,
      score: 35,
      reason: 'modeled genotype-metabolite effect',
      evidenceRefs: row.evidenceRefs || [],
    });
  }

  for (const row of candidates
    .sort((a, b) => b.score - a.score || a.drug.localeCompare(b.drug))
    .slice(0, Number.isFinite(parseArgs(process.argv.slice(2)).limit) ? parseArgs(process.argv.slice(2)).limit : 120)) {
    records.push(makeRecord({
      fetchedAt,
      gene: row.gene,
      drug: row.drug,
      claimType: 'coverage_gap',
      evidenceRefs: row.evidenceRefs || [],
      sourceIdentifiers: [`cpic-review-candidate:${row.gene}:${row.drug}`],
      mechanismSummary: `${row.drug} is modeled with ${row.gene}${row.metabolite ? ` and ${row.metabolite}` : ''}.`,
      clinicalSummary: `Check CPIC Data for structured guideline, recommendation, test-alert, allele, and publication coverage before any promotion.`,
      warnings: [`Local CPIC check-mode candidate (${row.reason}); not a fetched CPIC recommendation.`],
    }));
  }
  return dedupeStagedSourceRecords(records);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const records = buildCpicRecords();
  const metadata = {
    schema: 'diognosis.cpic-snapshot-metadata.v1',
    generatedAt: new Date().toISOString(),
    mode: 'check',
    source: 'CPIC Data',
    fetched: false,
    stagedRecords: records.length,
    note: 'Check mode uses local Diognosis PGx coverage and CPIC-linked evidence to create review candidates. Run fetch mode only when provider access is intentionally allowed.',
  };
  writeJson(args.out, records);
  writeJson(args.metadata, metadata);
  console.log(JSON.stringify({ ok: true, stagedRecords: records.length, out: args.out, metadata: args.metadata }, null, 2));
}

main();
