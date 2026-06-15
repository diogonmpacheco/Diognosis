#!/usr/bin/env node
import { resolve } from 'path';
import { loadDiognosisData, ROOT, uniq } from './lib/diognosis-source-loader.js';
import { dedupeStagedSourceRecords, normalizeStagedSourceRecord } from './lib/staged-source-schema.js';
import { markdownTable, readJson, writeJson, writeText } from './lib/enrichment-common.js';

const DRAFTS = resolve(ROOT, 'scripts/enrich/drafts.json');
const OUT = resolve(ROOT, 'data/enrichment/staged/legal-literature-staged-records.json');
const REPORT_JSON = resolve(ROOT, 'data/enrichment/reports/legal-literature-report.json');
const REPORT_MD = resolve(ROOT, 'data/enrichment/reports/legal-literature-report.md');

function providerName(provenance = '') {
  const lower = String(provenance).toLowerCase();
  if (lower.includes('europe')) return 'Europe PMC';
  if (lower.includes('openalex')) return 'OpenAlex';
  if (lower.includes('unpaywall')) return 'Unpaywall';
  return 'PubMed';
}

function classifyDraft(draft, data) {
  if (!draft.pmid && !draft.doi && !draft.url) return 'identifier_missing';
  const existing = Object.values(data.STUDY_DB || {}).some(study =>
    (draft.pmid && String(study.pmid || '') === String(draft.pmid)) ||
    (draft.doi && String(study.doi || '').toLowerCase() === String(draft.doi).toLowerCase()) ||
    (draft.title && String(study.title || '').toLowerCase() === String(draft.title).toLowerCase())
  );
  if (existing) return 'duplicate_candidate';
  if (draft.needsFullText || draft.needsFullTextForPrecision) return 'needs_full_text_for_precision';
  if (draft.supports?.length) return 'possible_update_to_existing_evidence';
  return 'new_candidate';
}

function normalizeDraft(draft, data) {
  const provider = providerName(draft.provenance);
  const openAccess = draft.openAccess || {};
  const claimDrugs = uniq((draft.relation || '').split(/[:+]/).filter(Boolean));
  return normalizeStagedSourceRecord({
    source: {
      name: provider,
      sourceType: 'literature_discovery',
      url: draft.url || (draft.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${draft.pmid}/` : draft.doi ? `https://doi.org/${draft.doi}` : 'https://pubmed.ncbi.nlm.nih.gov'),
      endpoint: draft.provenance || 'metadata',
      fetchedAt: draft._createdAt || new Date().toISOString(),
      license: openAccess.license || 'metadata/public identifiers only',
      licenseUrl: openAccess.licenseUrl || '',
      attribution: draft.source || draft.journal || '',
      refreshCadence: 'weekly',
    },
    claim: {
      claimType: 'publication',
      drugs: claimDrugs,
      pathways: draft.supports || [],
      mechanismSummary: draft.quantifiedEffects?.note || draft.title || '',
      clinicalSummary: 'Legal literature draft staged for review; no automatic STUDY_DB promotion.',
    },
    evidence: {
      pmids: draft.pmid ? [draft.pmid] : [],
      dois: draft.doi ? [draft.doi] : [],
      urls: [draft.url].filter(Boolean),
      sourceIdentifiers: [draft.id, draft.provenance].filter(Boolean),
      strongestExternalTier: draft.type || draft.studyDesign || '',
      openAccess: {
        hasLegalOpenAccess: Boolean(openAccess.isOpenAccess || openAccess.hasLegalOpenAccess),
        provider: openAccess.provider || provider,
        license: openAccess.license || '',
        url: openAccess.landingUrl || openAccess.oaUrl || openAccess.url || '',
      },
    },
    mapping: {
      possibleExistingRows: draft.supports || [],
    },
    governance: {
      reviewRequired: true,
      professionalReviewStatus: 'pending',
      sourceFaithfulnessStatus: 'unreviewed',
      canAffectScoring: false,
      canAffectPublicSeverity: false,
      canBeBundledPublicly: false,
      promotionTarget: 'STUDY_DB',
    },
    notes: [`draftClassification:${classifyDraft(draft, data)}`],
    warnings: draft.limitations || [],
  });
}

function main() {
  const data = loadDiognosisData();
  const drafts = readJson(DRAFTS, []);
  const records = dedupeStagedSourceRecords(drafts.map(draft => normalizeDraft(draft, data)));
  const classifications = {};
  for (const draft of drafts) {
    const key = classifyDraft(draft, data);
    classifications[key] = (classifications[key] || 0) + 1;
  }
  const providerFailures = [];
  const report = {
    generatedAt: new Date().toISOString(),
    drafts: drafts.length,
    stagedRecords: records.length,
    draftsWithLegalOpenAccess: records.filter(record => record.evidence.openAccess.hasLegalOpenAccess).length,
    classifications,
    providerFailures,
  };
  writeJson(OUT, records);
  writeJson(REPORT_JSON, report);
  writeText(REPORT_MD, renderMarkdown(report));
  console.log(JSON.stringify({ ok: true, stagedRecords: records.length, drafts: drafts.length, providerFailures: providerFailures.length }, null, 2));
}

function renderMarkdown(report) {
  return `# Legal Literature Staging Report

Generated: ${report.generatedAt}

- Drafts: ${report.drafts}
- Staged records: ${report.stagedRecords}
- Drafts with legal OA metadata: ${report.draftsWithLegalOpenAccess}
- Provider failures: ${report.providerFailures.length}

## Draft Classifications

${markdownTable(['Classification', 'Count'], Object.entries(report.classifications))}
`;
}

main();
