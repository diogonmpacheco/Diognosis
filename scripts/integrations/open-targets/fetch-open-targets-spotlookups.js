#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..', '..');
const ENDPOINT = 'https://api.platform.opentargets.org/api/v4/graphql';
const DEFAULT_SEED = resolve(__dirname, 'spotlight-substances.json');
const DEFAULT_OUT_DIR = resolve(__dirname, 'input');
const DEFAULT_AUDIT = resolve(ROOT, 'docs/OPEN_TARGETS_REAL_IMPORT_AUDIT.md');

const DRUG_QUERY = `query OpenTargetsDrug($chemblId: String!, $aePage: Pagination!) {
  meta {
    apiVersion { x y z }
    dataVersion { year month iteration }
    name
    product
  }
  drug(chemblId: $chemblId) {
    id
    name
    drugType
    synonyms
    tradeNames
    maximumClinicalStage
    description
    drugWarnings {
      warningType
      description
      toxicityClass
      year
      country
      references { source id url }
    }
    adverseEvents(page: $aePage) {
      count
      criticalValue
      rows {
        name
        count
        meddraCode
        logLR
      }
    }
    pharmacogenomics {
      evidenceLevel
      pgxCategory
      phenotypeText
      targetFromSourceId
      datasourceId
      genotypeAnnotationText
      variantRsId
      haplotypeFromSourceId
      genotype
      variantId
      target {
        id
        approvedSymbol
      }
      drugs {
        drugId
        drugFromSource
        drug {
          id
          name
        }
      }
    }
    mechanismsOfAction {
      rows {
        mechanismOfAction
        actionType
        targetName
        references { source ids urls }
        targets {
          id
          approvedSymbol
          safetyLiabilities {
            event
            eventId
            datasource
            url
            literature
            effects { direction dosing }
            studies { description type name }
            biosamples { tissueLabel cellLabel }
          }
        }
      }
    }
  }
}`;

function parseArgs(argv) {
  const args = {
    seed: DEFAULT_SEED,
    outDir: DEFAULT_OUT_DIR,
    audit: DEFAULT_AUDIT,
    maxAdverseEvents: 8,
    maxPharmacogenomics: 12,
    maxTargetSafetyPerTarget: 6,
    maxTargetSafetyPerDrug: 12,
  };
  for (let idx = 0; idx < argv.length; idx += 1) {
    const arg = argv[idx];
    if (arg === '--seed') args.seed = resolve(argv[++idx]);
    else if (arg === '--out-dir') args.outDir = resolve(argv[++idx]);
    else if (arg === '--audit') args.audit = resolve(argv[++idx]);
    else if (arg === '--max-adverse-events') args.maxAdverseEvents = Number(argv[++idx]);
    else if (arg === '--max-pharmacogenomics') args.maxPharmacogenomics = Number(argv[++idx]);
    else if (arg === '--max-target-safety-per-target') args.maxTargetSafetyPerTarget = Number(argv[++idx]);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  for (const key of ['maxAdverseEvents', 'maxPharmacogenomics', 'maxTargetSafetyPerTarget', 'maxTargetSafetyPerDrug']) {
    if (!Number.isFinite(args[key]) || args[key] < 0) throw new Error(`--${key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)} must be a non-negative number`);
  }
  return args;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function releaseFromMeta(meta) {
  const version = meta?.dataVersion || {};
  const parts = [version.year, version.month, version.iteration].filter(value => value != null && String(value).trim());
  return parts.length ? parts.join('.') : 'unknown';
}

async function graphQl(query, variables) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json();
  if (!response.ok || body.errors) {
    const message = body.errors?.map(error => error.message).join('; ') || `${response.status} ${response.statusText}`;
    throw new Error(`Open Targets GraphQL request failed: ${message}`);
  }
  return body.data;
}

function writeRows(outDir, fileName, metadata, rows) {
  const outPath = resolve(outDir, fileName);
  writeFileSync(outPath, `${JSON.stringify({ metadata, rows }, null, 2)}\n`, 'utf8');
  return outPath;
}

function firstReferenceUrl(warning) {
  return (warning?.references || []).map(ref => ref?.url).find(Boolean) || null;
}

function warningIsBlackBox(warning) {
  return /black\s*box|boxed/i.test(`${warning?.warningType || ''} ${warning?.toxicityClass || ''} ${warning?.description || ''}`);
}

function warningIsWithdrawal(warning) {
  return /withdraw|discontinu/i.test(`${warning?.warningType || ''} ${warning?.toxicityClass || ''} ${warning?.description || ''}`);
}

function normalizeMolecule(seed, drug) {
  const warnings = drug.drugWarnings || [];
  return {
    id: drug.id,
    name: drug.name,
    diognosisName: seed.diognosisName,
    drugType: drug.drugType || null,
    maximumClinicalStage: drug.maximumClinicalStage || null,
    isApproved: /approval/i.test(String(drug.maximumClinicalStage || '')),
    blackBoxWarning: warnings.some(warningIsBlackBox),
    hasBeenWithdrawn: warnings.some(warningIsWithdrawal),
    synonyms: drug.synonyms || [],
    tradeNames: drug.tradeNames || [],
    description: drug.description || null,
    openTargetsIdentityDecision: seed.identityDecision || 'provisional_context_import',
    openTargetsIdentityReviewedBy: seed.identityReviewedBy || null,
    openTargetsIdentityReviewedAt: seed.identityReviewedAt || null,
    openTargetsIdentityReviewRationale: seed.identityReviewRationale || null,
    openTargetsIdentityNote: seed.note || null,
  };
}

function normalizeWarningRows(seed, drug, release) {
  return (drug.drugWarnings || []).map((warning, idx) => ({
    id: `ot_warning_${drug.id}_${idx}`,
    drugId: drug.id,
    drugName: drug.name,
    diognosisName: seed.diognosisName,
    warningType: warning.warningType || warning.toxicityClass || 'drug_warning',
    toxicityClass: warning.toxicityClass || null,
    description: warning.description || warning.warningType || warning.toxicityClass || 'Open Targets drug warning',
    year: warning.year || null,
    country: warning.country || null,
    sourceUrl: firstReferenceUrl(warning),
    datasource: 'Open Targets drugWarnings',
    release,
  }));
}

function normalizeFaersRows(seed, drug, release, limit) {
  const adverse = drug.adverseEvents || {};
  return (adverse.rows || []).slice(0, limit).map((event, idx) => ({
    id: `ot_faers_${drug.id}_${idx}`,
    drugId: drug.id,
    drugName: drug.name,
    diognosisName: seed.diognosisName,
    eventName: event.name || 'FAERS adverse event signal',
    adverseEvent: event.name || null,
    meddraCode: event.meddraCode || null,
    count: event.count || null,
    logLR: event.logLR || null,
    criticalValue: adverse.criticalValue || null,
    evidenceLevel: 'FAERS signal; indication and co-medication confounding require Diognosis review',
    description: event.name || 'FAERS adverse event signal',
    datasource: 'Open Targets pharmacovigilance / FAERS',
    release,
  }));
}

function pgxEvidenceRank(row) {
  const level = String(row.evidenceLevel || '');
  if (/1a/i.test(level)) return 5;
  if (/1b/i.test(level)) return 4;
  if (/2a/i.test(level)) return 3;
  if (/2b/i.test(level)) return 2;
  if (/3/i.test(level)) return 1;
  return 0;
}

function extractGeneSymbol(text) {
  const match = String(text || '').match(/\b(HLA-[AB]|CYP[0-9][A-Z][0-9A-Z]*|DPYD|TPMT|NUDT15|UGT1A1|SLCO1B1|VKORC1|ABCB1|ABCG2|CYP1A2|CYP3A5|CYP2B6|CYP2C9|CYP2C19|CYP2D6|DRD2|HTR2A|GSTM1|TYMS|P2RY12|ESR1)\b/i);
  return match ? match[1].toUpperCase() : null;
}

function pgxGeneSymbol(pgx) {
  const approved = pgx.target?.approvedSymbol || null;
  if (approved && !/^ENSG/i.test(approved)) return approved;
  return extractGeneSymbol([
    pgx.genotypeAnnotationText,
    pgx.phenotypeText,
    pgx.haplotypeFromSourceId,
    pgx.variantRsId,
    pgx.variantId,
    pgx.genotype,
  ].filter(Boolean).join(' ')) || approved || pgx.targetFromSourceId || null;
}

function normalizePgxRows(seed, drug, release, limit) {
  const seen = new Set();
  const rows = [];
  const sorted = [...(drug.pharmacogenomics || [])]
    .sort((a, b) => pgxEvidenceRank(b) - pgxEvidenceRank(a));
  for (const pgx of sorted) {
    const geneSymbol = pgxGeneSymbol(pgx);
    const variant = pgx.haplotypeFromSourceId || pgx.variantRsId || pgx.variantId || pgx.genotype || null;
    const phenotypeText = pgx.phenotypeText || pgx.genotypeAnnotationText || 'ClinPGx pharmacogenomic annotation';
    const key = [drug.id, geneSymbol, variant, phenotypeText, pgx.pgxCategory, pgx.evidenceLevel]
      .map(value => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim())
      .join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      id: `ot_clinpgx_${drug.id}_${rows.length}`,
      drugId: drug.id,
      drugName: drug.name,
      diognosisName: seed.diognosisName,
      geneSymbol,
      targetId: pgx.target?.id || pgx.targetFromSourceId || null,
      variant,
      phenotypeText,
      drugResponseCategory: pgx.pgxCategory || null,
      clinicalAnnotationLevel: pgx.evidenceLevel || null,
      genotypeAnnotationText: pgx.genotypeAnnotationText || null,
      datasource: pgx.datasourceId || 'clinpgx',
      release,
    });
    if (rows.length >= limit) break;
  }
  return rows;
}

function normalizeTargetSafetyRows(seed, drug, release, maxPerTarget, maxPerDrug) {
  const rows = [];
  for (const moa of drug.mechanismsOfAction?.rows || []) {
    for (const target of moa.targets || []) {
      for (const liability of (target.safetyLiabilities || []).slice(0, maxPerTarget)) {
        rows.push({
          id: `ot_target_safety_${drug.id}_${target.id}_${rows.length}`,
          drugId: drug.id,
          drugName: drug.name,
          diognosisName: seed.diognosisName,
          targetGeneSymbol: target.approvedSymbol || moa.targetName || null,
          targetId: target.id || null,
          targetName: moa.targetName || null,
          actionType: moa.actionType || null,
          mechanismOfAction: moa.mechanismOfAction || null,
          toxicityClass: liability.event || 'target safety liability',
          eventId: liability.eventId || null,
          description: liability.studies?.[0]?.description || liability.event || 'Open Targets target safety liability',
          evidenceLevel: [liability.datasource, liability.studies?.[0]?.type].filter(Boolean).join(' / ') || 'Open Targets target safety',
          datasource: liability.datasource || 'Open Targets target safety',
          sourceUrl: liability.url || (liability.literature ? `PMID:${liability.literature}` : null),
          release,
        });
        if (rows.length >= maxPerDrug) return rows;
      }
    }
  }
  return rows;
}

function renderAudit({ seed, release, meta, rowsByDataset, missing }) {
  const counts = Object.fromEntries(Object.entries(rowsByDataset).map(([key, rows]) => [key, rows.length]));
  const substanceRows = seed.substances.map(item => `| ${item.diognosisName} | ${item.chemblId} | ${item.identityDecision || 'provisional'} | ${String(item.note || '').replace(/\|/g, '\\|')} |`).join('\n');
  return `# Open Targets Real Import Audit

Generated by \`scripts/integrations/open-targets/fetch-open-targets-spotlookups.js\`.

This is a build-time/offline import. The browser must never call Open Targets directly. The generated rows are source context only until Diognosis review promotes a signal.

## Source

- Endpoint: ${ENDPOINT}
- Open Targets release: ${release}
- Product: ${meta?.product || 'not specified'}
- API: ${meta?.apiVersion ? [meta.apiVersion.x, meta.apiVersion.y, meta.apiVersion.z].filter(Boolean).join('.') : 'not specified'}

## Dataset Counts

| Dataset | Rows |
| --- | ---: |
| molecule | ${counts.molecule || 0} |
| drugWarnings | ${counts.drugWarnings || 0} |
| faersSignificant | ${counts.faersSignificant || 0} |
| pharmacogenetics | ${counts.pharmacogenetics || 0} |
| targetSafety | ${counts.targetSafety || 0} |

## Identity Seed

| Diognosis substance | ChEMBL/Open Targets ID | Identity decision | Note |
| --- | --- | --- | --- |
${substanceRows}

${missing.length ? `## Missing Drug Lookups\n\n${missing.map(item => `- ${item.diognosisName} (${item.chemblId})`).join('\n')}\n\n` : ''}## Safety Contract

- These data are imported from saved local JSON files under \`scripts/integrations/open-targets/input/\`.
- Every imported context fact must default to \`reviewRequired: true\`, \`importedContextOnly: true\`, and \`notSeverityBearing: true\`.
- FAERS-derived rows are signal context only because reporting bias, indication confounding, and co-medication confounding are not resolved here.
- ChEMBL/Open Targets drug entities are molecule-centric; Diognosis combination-product logic remains authoritative.
`;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const seed = readJson(args.seed);
  const rowsByDataset = {
    molecule: [],
    drugWarnings: [],
    faersSignificant: [],
    pharmacogenetics: [],
    targetSafety: [],
  };
  const missing = [];
  let release = null;
  let meta = null;

  mkdirSync(args.outDir, { recursive: true });
  for (const item of seed.substances || []) {
    if (!item.chemblId) {
      missing.push(item);
      continue;
    }
    const data = await graphQl(DRUG_QUERY, {
      chemblId: item.chemblId,
      aePage: { index: 0, size: args.maxAdverseEvents },
    });
    meta = meta || data.meta || null;
    release = release || releaseFromMeta(data.meta);
    if (!data.drug) {
      missing.push(item);
      continue;
    }
    rowsByDataset.molecule.push(normalizeMolecule(item, data.drug));
    rowsByDataset.drugWarnings.push(...normalizeWarningRows(item, data.drug, release));
    rowsByDataset.faersSignificant.push(...normalizeFaersRows(item, data.drug, release, args.maxAdverseEvents));
    rowsByDataset.pharmacogenetics.push(...normalizePgxRows(item, data.drug, release, args.maxPharmacogenomics));
    rowsByDataset.targetSafety.push(...normalizeTargetSafetyRows(item, data.drug, release, args.maxTargetSafetyPerTarget, args.maxTargetSafetyPerDrug));
  }

  const metadata = {
    schemaVersion: 1,
    source: ENDPOINT,
    release,
    generatedBy: 'scripts/integrations/open-targets/fetch-open-targets-spotlookups.js',
  };
  const files = {
    molecule: writeRows(args.outDir, 'molecule-open-targets-spotlookups.json', metadata, rowsByDataset.molecule),
    drugWarnings: writeRows(args.outDir, 'drug-warnings-open-targets-spotlookups.json', metadata, rowsByDataset.drugWarnings),
    faersSignificant: writeRows(args.outDir, 'faers-open-targets-spotlookups.json', metadata, rowsByDataset.faersSignificant),
    pharmacogenetics: writeRows(args.outDir, 'pharmacogenetics-open-targets-spotlookups.json', metadata, rowsByDataset.pharmacogenetics),
    targetSafety: writeRows(args.outDir, 'target-safety-open-targets-spotlookups.json', metadata, rowsByDataset.targetSafety),
  };
  mkdirSync(dirname(args.audit), { recursive: true });
  writeFileSync(args.audit, renderAudit({ seed, release, meta, rowsByDataset, missing }), 'utf8');

  console.log(JSON.stringify({
    ok: true,
    release,
    files,
    counts: Object.fromEntries(Object.entries(rowsByDataset).map(([key, rows]) => [key, rows.length])),
    missing,
  }, null, 2));
}

run().catch(error => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
