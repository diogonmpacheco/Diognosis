#!/usr/bin/env node
// Multi-index enrichment draft generator.
// Stores citations + paraphrased public factual findings only; never article text.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { resolve } from 'path';
import vm from 'vm';

const root = resolve(new URL('../..', import.meta.url).pathname);
const OUT_DIR = resolve(root, 'scripts/enrich');
const CACHE_DIR = resolve(OUT_DIR, 'cache');
const DRAFTS_PATH = resolve(OUT_DIR, 'drafts.json');
const REPORT_PATH = resolve(OUT_DIR, 'review-report.md');

const ALLOWED_FETCH_HOSTS = new Set([
  'eutils.ncbi.nlm.nih.gov',
  'www.ebi.ac.uk',
  'api.openalex.org',
  'api.semanticscholar.org',
  'api.unpaywall.org',
]);
const ALLOWED_OUTPUT_HOSTS = new Set([
  'pubmed.ncbi.nlm.nih.gov',
  'doi.org',
  'pmc.ncbi.nlm.nih.gov',
  'www.ncbi.nlm.nih.gov',
  'europepmc.org',
  'openalex.org',
  'www.semanticscholar.org',
]);
const BLOCKED_OUTPUT_HOST_PATTERNS = [
  /(^|\.)sci-hub\./i,
  /(^|\.)scihub\./i,
  /(^|\.)libgen\./i,
  /(^|\.)z-lib\./i,
  /(^|\.)zlibrary\./i,
];

const TYPE = {
  IN_VITRO: 'in_vitro',
  ANIMAL: 'animal',
  CASE_REPORT: 'case_report',
  OBSERVATIONAL: 'observational',
  CLINICAL_PK: 'clinical_pk',
  RCT: 'rct',
  META_ANALYSIS: 'meta_analysis',
  GUIDELINE: 'guideline',
  FDA_LABEL: 'fda_label',
};

function usage() {
  return `Usage:
  node scripts/enrich/pubmed-enrich.js --query "fluoxetine desipramine pharmacokinetics" --relation fluoxetine:CYP2D6 --supports fluoxetine_inhibits_CYP2D6 [--limit 10]

Options:
  --query       Literature search query string. Required unless --self-test.
  --relation    Human label for grouping report output.
  --supports    Comma-separated mechanism keys to put in draft.supports.
  --providers   Comma-separated providers: pubmed,europepmc,openalex,semanticscholar. Default: pubmed.
  --expand-citations  Expand Semantic Scholar citations/references one hop for Semantic Scholar seed hits.
  --limit       Max PubMed IDs to fetch. Default: 10.
  --email       Optional NCBI tool email.
  --mailto      Optional polite-pool email for OpenAlex.
  --api-key     Optional NCBI API key.
  --semantic-scholar-key Optional Semantic Scholar API key.
  --oa          Discover legal open-access locations via provider metadata + Unpaywall for DOI records.
  --oa-email    Email for Unpaywall. Falls back to --mailto or --email.
  --self-test   Run offline guardrail tests; no network.

Policy:
  Public abstracts, DOI metadata, labels, and guideline pages can support paraphrased qualitative facts even when full text is paywalled.
  Full text is only needed for precision upgrades such as protected tables, figures, detailed subgroup values, or claims not visible in public sources.
`;
}

function parseArgs(argv) {
  const args = {};
  const booleanArgs = new Set(['self-test', 'help', 'expand-citations', 'oa']);
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    if (booleanArgs.has(key)) args[key] = true;
    else args[key] = argv[++i];
  }
  return args;
}

function ensureAllowedFetch(url) {
  const host = new URL(url).hostname;
  if (!ALLOWED_FETCH_HOSTS.has(host)) {
    throw new Error(`Refusing non-allowlisted fetch host: ${host}`);
  }
}

function ensureAllowedOutputUrl(url) {
  if (!url) return null;
  const host = new URL(url).hostname;
  if (!ALLOWED_OUTPUT_HOSTS.has(host)) {
    throw new Error(`Refusing non-allowlisted output URL: ${host}`);
  }
  return url;
}

function ensureSafeExternalOutputUrl(url) {
  if (!url) return null;
  const parsed = new URL(url);
  if (!['https:', 'http:'].includes(parsed.protocol)) {
    throw new Error(`Refusing non-web output URL: ${url}`);
  }
  if (BLOCKED_OUTPUT_HOST_PATTERNS.some(pattern => pattern.test(parsed.hostname))) {
    throw new Error(`Refusing blocked output URL host: ${parsed.hostname}`);
  }
  return url;
}

function cachePath(url) {
  const key = createHash('sha256').update(url).digest('hex');
  return resolve(CACHE_DIR, `${key}.json`);
}

async function fetchJson(url) {
  ensureAllowedFetch(url);
  mkdirSync(CACHE_DIR, { recursive: true });
  const path = cachePath(url);
  if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'));
  const res = await fetch(url, { headers: { 'user-agent': 'MedCheck enrichment tool; citation metadata only' } });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${res.statusText}: ${url}`);
  const text = await res.text();
  writeFileSync(path, text, 'utf8');
  return JSON.parse(text);
}

async function fetchProviderJson(url, headers = {}) {
  ensureAllowedFetch(url);
  mkdirSync(CACHE_DIR, { recursive: true });
  const path = cachePath(url);
  if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'));
  const res = await fetch(url, {
    headers: {
      'user-agent': 'MedCheck enrichment tool; citation metadata only',
      ...headers,
    },
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${res.statusText}: ${url}`);
  const text = await res.text();
  writeFileSync(path, text, 'utf8');
  return JSON.parse(text);
}

async function fetchText(url) {
  ensureAllowedFetch(url);
  mkdirSync(CACHE_DIR, { recursive: true });
  const path = resolve(CACHE_DIR, `${createHash('sha256').update(url).digest('hex')}.xml`);
  if (existsSync(path)) return readFileSync(path, 'utf8');
  const res = await fetch(url, { headers: { 'user-agent': 'MedCheck enrichment tool; citation metadata only' } });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${res.statusText}: ${url}`);
  const text = await res.text();
  writeFileSync(path, text, 'utf8');
  return text;
}

function xmlText(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return match ? cleanXml(match[1]) : null;
}

function xmlTexts(xml, tag) {
  return [...xml.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi'))].map(m => cleanXml(m[1]));
}

function cleanXml(value) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/\s+/g, ' ')
    .trim();
}

function loadLiveData() {
  const files = ['src/data/constants.js', 'src/data/evidence.js'];
  const code = `${files.map(f => readFileSync(resolve(root, f), 'utf8')).join('\n')}
JSON.stringify({
  studyIds: Object.keys(STUDY_DB),
  identifiers: Object.values(STUDY_DB).map(s => ({ id:s.id, pmid:s.pmid || null, doi:s.doi || null, title:s.title || '' })),
  tiers: EVIDENCE_TIER
})`;
  return JSON.parse(vm.runInNewContext(code, { console }));
}

function loadExistingDrafts() {
  if (!existsSync(DRAFTS_PATH)) return [];
  return JSON.parse(readFileSync(DRAFTS_PATH, 'utf8'));
}

function saveDrafts(drafts) {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(DRAFTS_PATH, `${JSON.stringify(drafts, null, 2)}\n`, 'utf8');
}

function normalizeTitle(title) {
  return String(title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function relationQuery(args) {
  const query = args.query?.trim();
  if (!query) throw new Error('--query is required');
  return query;
}

function ncbiParams(args) {
  const params = new URLSearchParams({
    db: 'pubmed',
    retmode: 'json',
    tool: 'medcheck-enrichment',
  });
  if (args.email) params.set('email', args.email);
  if (args['api-key']) params.set('api_key', args['api-key']);
  return params;
}

async function searchPubMed(query, args) {
  const params = ncbiParams(args);
  params.set('term', query);
  params.set('retmax', String(Number(args.limit || 10)));
  const data = await fetchJson(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${params}`);
  return data.esearchresult?.idlist || [];
}

async function fetchPubMedArticles(pmids, args) {
  if (!pmids.length) return [];
  const params = ncbiParams(args);
  params.set('id', pmids.join(','));
  params.set('rettype', 'abstract');
  params.set('retmode', 'xml');
  const xml = await fetchText(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?${params}`);
  return [...xml.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g)].map(m => parseArticle(m[1]));
}

function parseArticle(xml) {
  const pmid = xmlText(xml, 'PMID');
  const title = xmlText(xml, 'ArticleTitle') || '';
  const journal = xmlText(xml, 'Title') || xmlText(xml, 'ISOAbbreviation') || '';
  const year = Number(xmlText(xml, 'Year')) || null;
  const abstract = xmlTexts(xml, 'AbstractText').join(' ');
  const pubTypes = xmlTexts(xml, 'PublicationType').map(t => t.toLowerCase());
  const doiMatch = xml.match(/<ArticleId[^>]+IdType="doi"[^>]*>([\s\S]*?)<\/ArticleId>/i);
  const doi = doiMatch ? cleanXml(doiMatch[1]) : null;
  const lastNames = xmlTexts(xml, 'LastName');
  return {
    pmid,
    doi,
    title,
    year,
    source: journal,
    journal,
    firstAuthor: lastNames[0] || 'unknown',
    pubTypes,
    abstract,
    url: ensureAllowedOutputUrl(`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`),
    provenance: 'search:pubmed',
  };
}

function providersFromArgs(args) {
  return (args.providers || 'pubmed')
    .split(',')
    .map(p => p.trim().toLowerCase())
    .filter(Boolean);
}

function providerHeaders(provider, args) {
  if (provider === 'semanticscholar' && args['semantic-scholar-key']) {
    return { 'x-api-key': args['semantic-scholar-key'] };
  }
  return {};
}

function reconstructOpenAlexAbstract(index) {
  if (!index || typeof index !== 'object') return '';
  const words = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const pos of positions || []) words[pos] = word;
  }
  return words.filter(Boolean).join(' ');
}

function firstAuthorName(authors) {
  if (!authors || !authors.length) return 'unknown';
  const first = authors[0];
  if (typeof first === 'string') return first.split(/\s+/).slice(-1)[0] || 'unknown';
  return first.name || first.display_name || first.author?.display_name || 'unknown';
}

function normalizeArticle(article) {
  const doi = article.doi ? String(article.doi).replace(/^https?:\/\/doi\.org\//i, '').toLowerCase() : null;
  const pmid = article.pmid ? String(article.pmid).replace(/^https?:\/\/pubmed\.ncbi\.nlm\.nih\.gov\//i, '').replace(/\/$/, '') : null;
  const url = article.url || (doi ? `https://doi.org/${doi}` : pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : null);
  return {
    pmid,
    doi,
    title: article.title || '',
    year: article.year || null,
    source: article.source || article.journal || '',
    journal: article.journal || article.source || '',
    firstAuthor: article.firstAuthor || firstAuthorName(article.authors),
    pubTypes: article.pubTypes || [],
    abstract: article.abstract || '',
    url: ensureAllowedOutputUrl(url),
    oa: normalizeOpenAccess(article.oa),
    provenance: article.provenance,
    providerId: article.providerId || null,
  };
}

function normalizeOpenAccess(oa = {}) {
  const landingUrl = oa.landingUrl || oa.oaUrl || oa.url || null;
  const pdfUrl = oa.pdfUrl || null;
  return {
    isOpenAccess: Boolean(oa.isOpenAccess || oa.is_oa || landingUrl || pdfUrl),
    status: oa.status || oa.oa_status || null,
    source: oa.source || null,
    license: oa.license || null,
    landingUrl: landingUrl ? ensureSafeExternalOutputUrl(landingUrl) : null,
    pdfUrl: pdfUrl ? ensureSafeExternalOutputUrl(pdfUrl) : null,
    evidence: oa.evidence || null,
  };
}

async function searchEuropePmc(query, args) {
  const params = new URLSearchParams({
    query,
    format: 'json',
    pageSize: String(Number(args.limit || 10)),
  });
  const data = await fetchProviderJson(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params}`);
  return (data.resultList?.result || []).map(row => normalizeArticle({
    pmid: row.pmid || null,
    doi: row.doi || null,
    title: row.title,
    year: row.pubYear ? Number(row.pubYear) : null,
    source: row.journalTitle,
    journal: row.journalTitle,
    firstAuthor: (row.authorString || '').split(',')[0] || 'unknown',
    pubTypes: row.pubTypeList?.pubType || [],
    abstract: row.abstractText || '',
    url: row.doi ? `https://doi.org/${row.doi}` : row.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${row.pmid}/` : `https://europepmc.org/article/${row.source || 'MED'}/${row.id}`,
    oa: {
      isOpenAccess: row.isOpenAccess === 'Y' || row.inEPMC === 'Y' || row.hasPDF === 'Y',
      status: row.isOpenAccess === 'Y' ? 'oa' : null,
      source: 'europepmc',
      landingUrl: row.pmcid ? `https://pmc.ncbi.nlm.nih.gov/articles/${row.pmcid}/` : null,
      pdfUrl: null,
      evidence: row.hasPDF === 'Y' ? 'Europe PMC reports PDF availability' : null,
    },
    provenance: 'search:europepmc',
    providerId: row.id,
  }));
}

async function searchOpenAlex(query, args) {
  const params = new URLSearchParams({
    search: query,
    'per-page': String(Number(args.limit || 10)),
  });
  if (args.mailto || args.email) params.set('mailto', args.mailto || args.email);
  const data = await fetchProviderJson(`https://api.openalex.org/works?${params}`);
  return (data.results || []).map(row => normalizeArticle({
    pmid: row.ids?.pmid || null,
    doi: row.doi || null,
    title: row.title || row.display_name,
    year: row.publication_year || null,
    source: row.primary_location?.source?.display_name || row.host_venue?.display_name || '',
    journal: row.primary_location?.source?.display_name || row.host_venue?.display_name || '',
    authors: row.authorships?.map(a => a.author?.display_name).filter(Boolean) || [],
    pubTypes: [row.type, row.type_crossref].filter(Boolean),
    abstract: reconstructOpenAlexAbstract(row.abstract_inverted_index),
    url: row.doi || row.id,
    oa: {
      isOpenAccess: row.open_access?.is_oa || false,
      status: row.open_access?.oa_status || null,
      source: row.open_access?.oa_url ? 'openalex' : null,
      landingUrl: row.open_access?.oa_url || row.primary_location?.landing_page_url || null,
      pdfUrl: row.primary_location?.pdf_url || row.best_oa_location?.pdf_url || null,
      license: row.primary_location?.license || row.best_oa_location?.license || null,
    },
    provenance: 'search:openalex',
    providerId: row.id,
  }));
}

async function searchSemanticScholar(query, args) {
  const params = new URLSearchParams({
    query,
    limit: String(Number(args.limit || 10)),
    fields: 'paperId,title,year,venue,authors,abstract,externalIds,publicationTypes,citationCount,isOpenAccess,openAccessPdf',
  });
  const headers = providerHeaders('semanticscholar', args);
  const data = await fetchProviderJson(`https://api.semanticscholar.org/graph/v1/paper/search?${params}`, headers);
  const seeds = (data.data || []).map(row => semanticScholarArticle(row, 'search:semanticscholar'));
  if (!args['expand-citations']) return seeds;
  const expanded = [];
  for (const seed of seeds.filter(s => s.providerId).slice(0, Math.min(3, seeds.length))) {
    expanded.push(...await fetchSemanticScholarEdges(seed.providerId, 'citations', headers));
    expanded.push(...await fetchSemanticScholarEdges(seed.providerId, 'references', headers));
  }
  return [...seeds, ...expanded];
}

function semanticScholarArticle(row, provenance) {
  const external = row.externalIds || {};
  return normalizeArticle({
    pmid: external.PubMed || null,
    doi: external.DOI || null,
    title: row.title,
    year: row.year || null,
    source: row.venue || '',
    journal: row.venue || '',
    authors: row.authors || [],
    pubTypes: row.publicationTypes || [],
    abstract: row.abstract || '',
    url: row.url || (external.DOI ? `https://doi.org/${external.DOI}` : `https://www.semanticscholar.org/paper/${row.paperId}`),
    oa: {
      isOpenAccess: row.isOpenAccess || false,
      status: row.isOpenAccess ? 'oa' : null,
      source: row.openAccessPdf?.url ? 'semanticscholar' : null,
      landingUrl: row.openAccessPdf?.url || null,
      pdfUrl: row.openAccessPdf?.url || null,
    },
    provenance,
    providerId: row.paperId,
  });
}

async function fetchSemanticScholarEdges(paperId, edgeType, headers) {
  const fields = edgeType === 'citations'
    ? 'citingPaper.paperId,citingPaper.title,citingPaper.year,citingPaper.venue,citingPaper.authors,citingPaper.abstract,citingPaper.externalIds,citingPaper.publicationTypes,citingPaper.isOpenAccess,citingPaper.openAccessPdf'
    : 'citedPaper.paperId,citedPaper.title,citedPaper.year,citedPaper.venue,citedPaper.authors,citedPaper.abstract,citedPaper.externalIds,citedPaper.publicationTypes,citedPaper.isOpenAccess,citedPaper.openAccessPdf';
  const params = new URLSearchParams({ limit: '20', fields });
  const data = await fetchProviderJson(`https://api.semanticscholar.org/graph/v1/paper/${paperId}/${edgeType}?${params}`, headers);
  const key = edgeType === 'citations' ? 'citingPaper' : 'citedPaper';
  return (data.data || [])
    .map(edge => edge[key])
    .filter(Boolean)
    .map(row => semanticScholarArticle(row, `citation-graph:semanticscholar:${edgeType}`));
}

async function enrichOpenAccess(articles, args) {
  if (!args.oa) return articles;
  const email = args['oa-email'] || args.mailto || args.email;
  if (!email) {
    console.warn('Open-access discovery skipped: --oa requires --oa-email, --mailto, or --email for Unpaywall.');
    return articles;
  }
  const enriched = [];
  for (const article of articles) {
    const existing = normalizeOpenAccess(article.oa);
    if (!article.doi || existing.isOpenAccess) {
      enriched.push({ ...article, oa: existing });
      continue;
    }
    try {
      const params = new URLSearchParams({ email });
      const doi = encodeURIComponent(article.doi);
      const data = await fetchProviderJson(`https://api.unpaywall.org/v2/${doi}?${params}`);
      const best = data.best_oa_location || {};
      enriched.push({
        ...article,
        oa: normalizeOpenAccess({
          isOpenAccess: data.is_oa || false,
          status: data.oa_status || null,
          source: best.host_type ? `unpaywall:${best.host_type}` : 'unpaywall',
          landingUrl: best.url_for_landing_page || data.oa_locations?.[0]?.url_for_landing_page || null,
          pdfUrl: best.url_for_pdf || null,
          license: best.license || null,
          evidence: best.evidence || null,
        }),
      });
    } catch (err) {
      enriched.push({ ...article, oa: { ...existing, error: err.message } });
    }
  }
  return enriched;
}

async function searchProvider(provider, query, args) {
  if (provider === 'pubmed') {
    const ids = await searchPubMed(query, args);
    return fetchPubMedArticles(ids, args);
  }
  if (provider === 'europepmc') return searchEuropePmc(query, args);
  if (provider === 'openalex') return searchOpenAlex(query, args);
  if (provider === 'semanticscholar') return searchSemanticScholar(query, args);
  throw new Error(`Unknown provider: ${provider}`);
}

function relationTokens(relation) {
  const raw = String(relation || '');
  const [primaryRaw, secondaryRaw = ''] = raw.split(':');
  const normalize = value => String(value || '')
    .toLowerCase()
    .replace(/<[^>]+>/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter(token => token.length >= 3 && !['and', 'the', 'with', 'active', 'context', 'metabolite', 'metabolites', 'serum', 'exposure'].includes(token));
  return {
    primary: normalize(primaryRaw),
    secondary: normalize(secondaryRaw),
  };
}

function articleMatchesRelation(article, relation) {
  const { primary, secondary } = relationTokens(relation);
  if (!primary.length && !secondary.length) return true;
  const haystack = normalizeTitle(`${article.title || ''} ${article.abstract || ''}`);
  const hasAny = tokens => tokens.some(token => haystack.includes(token));
  const primaryOk = primary.length ? hasAny(primary) : true;
  const secondaryOk = secondary.length ? hasAny(secondary) : true;
  return primaryOk && secondaryOk;
}

function tierFromArticle(article) {
  const haystack = `${article.pubTypes.join(' ')} ${article.title} ${article.abstract}`.toLowerCase();
  if (haystack.includes('guideline')) return TYPE.GUIDELINE;
  if (haystack.includes('meta-analysis') || haystack.includes('systematic review')) return TYPE.META_ANALYSIS;
  if (haystack.includes('randomized controlled trial')) return TYPE.RCT;
  if (haystack.includes('case reports')) return TYPE.CASE_REPORT;
  if (haystack.includes('observational') || haystack.includes('cohort') || haystack.includes('case-control')) return TYPE.OBSERVATIONAL;
  if (haystack.includes('in vitro') || haystack.includes('microsome') || haystack.includes('recombinant')) return TYPE.IN_VITRO;
  if (haystack.includes('pharmacokinetic') || haystack.includes('auc') || haystack.includes('cmax') || haystack.includes('clearance')) return TYPE.CLINICAL_PK;
  return TYPE.OBSERVATIONAL;
}

function extractQuantifiedEffects(abstract, relation) {
  const text = abstract || '';
  const effects = {};
  const cleanText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const metricSentences = cleanText
    .split(/(?<=[.;:])\s+/)
    .map(s => s.trim())
    .filter(s => /auc|area under|cmax|trough|concentration|clearance|half-?life|ratio|fold|%|ng\/ml|µm|um\*h|ng x h|ng\*h|dose-corrected/i.test(s));

  const nMatch = cleanText.match(/\b(?:n\s*=\s*|in\s+|including\s+|from\s+)(\d{1,5})\s+(?:healthy\s+)?(?:subjects|patients|volunteers|participants|children|adults|individuals)\b/i) ||
    cleanText.match(/\b(\d{1,5})\s+(?:healthy\s+)?(?:subjects|patients|volunteers|participants|children|adults|individuals)\b/i);

  const foldRanges = [];
  const foldValues = [];
  for (const sentence of metricSentences) {
    for (const match of sentence.matchAll(/(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(?:-| )?fold/gi)) {
      foldRanges.push({ min: Number(match[1]), max: Number(match[2]), context: sentence });
    }
    for (const match of sentence.matchAll(/(?:varied|differed|increased|decreased|higher|lower|raised|reduced|exposure|auc|cmax|concentration|clearance|ratio)[^.;]{0,100}?(\d+(?:\.\d+)?)\s*(?:-| )?fold/gi)) {
      foldValues.push({ value: Number(match[1]), context: sentence });
    }
    for (const match of sentence.matchAll(/(\d+(?:\.\d+)?)\s*(?:-| )?fold\s+(?:higher|lower|increase|decrease|difference|change|variation)/gi)) {
      foldValues.push({ value: Number(match[1]), context: sentence });
    }
  }

  const pctChanges = [];
  for (const sentence of metricSentences) {
    for (const match of sentence.matchAll(/(?:clearance|auc|cmax|exposure|concentration|ratio|formation|inhibition|response)[^.;]{0,100}?(\d+(?:\.\d+)?)\s*%/gi)) {
      pctChanges.push({ value: Number(match[1]), context: sentence });
    }
  }

  const groupValues = [];
  for (const sentence of metricSentences) {
    const metric = (sentence.match(/\b(AUC(?:0-[∞\w]+)?|area under[^,.;:]*|Cmax|clearance|trough|concentration|half-?life|ratio)\b/i) || [])[1];
    const valueMatches = [...sentence.matchAll(/(\d{1,4}(?:,\d{3})*(?:\.\d+)?)\s*(?:±|\+\/-|to|-|–)?\s*(?:\d{1,4}(?:,\d{3})*(?:\.\d+)?)?\s*(?:ng\/ml\s*x\s*h|ng\/ml\*h|ng\*h\/ml|ng\/ml|µm\*h|μm\*h|um\*h|l\/h|h\b|hours?\b)?/gi)]
      .map(m => Number(m[1].replace(/,/g, '')))
      .filter(v => Number.isFinite(v));
    if (metric && valueMatches.length >= 2) {
      groupValues.push({ metric: metric.replace(/\s+/g, ' '), values: valueMatches.slice(0, 8), context: sentence });
    }
  }

  if (foldRanges.length) effects.foldRange = foldRanges[0];
  if (foldValues.length) {
    effects.foldChange = foldValues[0].value;
    if (/auc|area under|exposure/i.test(foldValues[0].context)) effects.aucFold = foldValues[0].value;
  }
  if (pctChanges.length) {
    effects.percentChange = pctChanges[0].value;
    if (/clearance/i.test(pctChanges[0].context)) effects.clearanceReductionPct = pctChanges[0].value;
  }
  if (groupValues.length) effects.groupMetricValues = groupValues.slice(0, 3);
  if (metricSentences.length) effects.publicMetricSentences = metricSentences.slice(0, 3);

  const hasExtractedMetric = Boolean(
    foldRanges.length ||
    foldValues.length ||
    pctChanges.length ||
    groupValues.length
  );
  if (hasExtractedMetric) {
    const bits = [];
    if (effects.foldRange) bits.push(`${effects.foldRange.min}-${effects.foldRange.max}-fold range`);
    else if (effects.foldChange) bits.push(`approximately ${effects.foldChange}-fold change`);
    if (effects.percentChange) bits.push(`about ${effects.percentChange}% change`);
    if (effects.groupMetricValues) bits.push(`${effects.groupMetricValues.length} public metric sentence${effects.groupMetricValues.length === 1 ? '' : 's'} with grouped values`);
    effects.note = `Public abstract/metadata extraction for ${relation || 'target relation'} found ${bits.join(' and ')}. Requires human review before promotion.`;
  } else {
    effects.note = `Citation appears relevant to ${relation || 'target relation'}, but no quantitative value was extractable from public abstract/metadata.`;
  }
  return { effects, n: nMatch ? Number(nMatch[1]) : null, hasNumber: hasExtractedMetric };
}

function studyDesign(article, tier) {
  if (tier === TYPE.RCT) return 'randomized_controlled_trial';
  if (tier === TYPE.META_ANALYSIS) return 'meta_analysis_or_systematic_review';
  if (tier === TYPE.IN_VITRO) return 'in_vitro_mechanistic_study';
  if (tier === TYPE.CASE_REPORT) return 'case_report';
  if (/pharmacokinetic|auc|cmax|clearance/i.test(`${article.title} ${article.abstract}`)) return 'clinical_pk';
  return 'observational_or_screened_pubmed_record';
}

function draftId(article, relation) {
  const rel = String(relation || 'relation').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const author = String(article.firstAuthor || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '');
  return `draft_${rel}_${author}${article.year || 'nd'}_${article.pmid}`;
}

function makeDraft(article, args) {
  const tier = tierFromArticle(article);
  const extraction = extractQuantifiedEffects(article.abstract, args.relation);
  const doi = article.doi ? String(article.doi).toLowerCase() : null;
  const doiUrl = doi ? ensureAllowedOutputUrl(`https://doi.org/${doi}`) : null;
  const sourceBasis = article.abstract
    ? 'public_abstract_or_metadata'
    : 'public_citation_metadata';
  return {
    id: draftId(article, args.relation),
    _status: 'pending_review',
    type: tier,
    title: article.title,
    year: article.year,
    source: article.source,
    journal: article.journal,
    pmid: article.pmid || null,
    doi,
    url: doiUrl || article.url,
    studyDesign: studyDesign(article, tier),
    n: extraction.n,
    phenotypes: [],
    quantifiedEffects: extraction.effects,
    temporal: {},
    supports: (args.supports || '').split(',').map(s => s.trim()).filter(Boolean),
    contradicts: [],
    limitations: extraction.hasNumber
      ? ['Public abstract/metadata extraction only; requires human review before promotion']
      : ['Public metadata/abstract supports qualitative context only; do not promote a quantitative rule without full text, open source, label, or guideline confirmation'],
    confidence: extraction.hasNumber ? 'moderate' : 'low',
    publicFactsUsable: true,
    sourceBasis,
    needsFullText: false,
    needsFullTextForPrecision: !extraction.hasNumber,
    openAccess: article.oa || normalizeOpenAccess(),
    provenance: article.provenance || 'search:unknown',
    verified: false,
    verifyNote: 'Enrichment draft; requires human pharmacist/physician review before STUDY_DB promotion',
    _createdAt: new Date().toISOString(),
  };
}

function dedupeDrafts(candidates, liveData, existingDrafts) {
  const livePmids = new Set(liveData.identifiers.map(x => x.pmid).filter(Boolean).map(String));
  const liveDois = new Set(liveData.identifiers.map(x => x.doi).filter(Boolean).map(x => String(x).toLowerCase()));
  const liveTitles = new Set(liveData.identifiers.map(x => normalizeTitle(x.title)).filter(Boolean));
  const draftKeys = new Set(existingDrafts.map(d => d.doi ? String(d.doi).toLowerCase() : d.pmid || normalizeTitle(d.title)).filter(Boolean));
  const kept = [];
  const skipped = [];
  for (const draft of candidates) {
    const key = draft.doi ? String(draft.doi).toLowerCase() : draft.pmid || normalizeTitle(draft.title);
    const liveHit = (draft.pmid && livePmids.has(String(draft.pmid))) ||
      (draft.doi && liveDois.has(String(draft.doi).toLowerCase())) ||
      liveTitles.has(normalizeTitle(draft.title));
    if (liveHit) skipped.push({ id: draft.id, reason: 'already_in_STUDY_DB', title: draft.title });
    else if (draftKeys.has(key)) skipped.push({ id: draft.id, reason: 'already_in_drafts', title: draft.title });
    else {
      draftKeys.add(key);
      kept.push(draft);
    }
  }
  return { kept, skipped };
}

function writeReport({ relation, query, added, skipped, providerErrors = [] }) {
  const previous = existsSync(REPORT_PATH) ? readFileSync(REPORT_PATH, 'utf8') : '# MedCheck Enrichment Review Report\n';
  const lines = [
    '',
    `## ${relation || query}`,
    '',
    `Run: ${new Date().toISOString()}`,
    `Query: \`${query}\``,
    `Added drafts: ${added.length}`,
    `Skipped duplicates: ${skipped.length}`,
    providerErrors.length ? `Provider warnings: ${providerErrors.length}` : null,
    '',
    '| Draft | Tier | PMID/DOI | Provenance | OA | Finding | Confidence | Public facts usable | Precision full text? |',
    '|---|---|---|---|---|---|---|---|---|',
  ].filter(Boolean);
  for (const draft of added) {
    const id = draft.pmid ? `PMID:${draft.pmid}` : draft.doi ? `DOI:${draft.doi}` : 'identifier missing';
    const oa = draft.openAccess?.isOpenAccess
      ? `[OA](${draft.openAccess.landingUrl || draft.openAccess.pdfUrl || draft.url})${draft.openAccess.status ? ` ${draft.openAccess.status}` : ''}`
      : 'paywalled/unknown';
    lines.push(`| ${draft.id} | ${draft.type} | ${id} | ${draft.provenance} | ${oa} | ${draft.quantifiedEffects.note} | ${draft.confidence} | ${draft.publicFactsUsable ? 'yes' : 'no'} | ${draft.needsFullTextForPrecision ? 'yes' : 'no'} |`);
  }
  if (skipped.length) {
    lines.push('', 'Skipped:', ...skipped.map(s => `- ${s.reason}: ${s.title}`));
  }
  if (providerErrors.length) {
    lines.push('', 'Provider warnings:', ...providerErrors.map(e => `- ${e.provider}: ${e.message}`));
  }
  writeFileSync(REPORT_PATH, `${previous.trimEnd()}\n${lines.join('\n')}\n`, 'utf8');
}

function selfTest() {
  let refused = false;
  try {
    ensureAllowedFetch('https://sci-hub.se/example');
  } catch {
    refused = true;
  }
  if (!refused) throw new Error('Allowlist self-test failed');
  for (const allowed of [
    'https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=test',
    'https://api.openalex.org/works?search=test',
    'https://api.semanticscholar.org/graph/v1/paper/search?query=test',
    'https://api.unpaywall.org/v2/10.1000/test?email=test@example.com',
  ]) ensureAllowedFetch(allowed);
  let blockedOutput = false;
  try {
    ensureSafeExternalOutputUrl('https://sci-hub.se/example.pdf');
  } catch {
    blockedOutput = true;
  }
  if (!blockedOutput) throw new Error('Blocked output URL self-test failed');
  const extraction = extractQuantifiedEffects('Drug exposure AUC increased 2.4-fold and clearance decreased 40% in 12 subjects.', 'test');
  if (extraction.effects.aucFold !== 2.4 || extraction.effects.clearanceReductionPct !== 40 || extraction.n !== 12) {
    throw new Error('Extraction self-test failed');
  }
  const oaAbstract = reconstructOpenAlexAbstract({ Drug: [0], exposure: [1], increased: [2] });
  if (oaAbstract !== 'Drug exposure increased') throw new Error('OpenAlex abstract reconstruction self-test failed');
  if (!articleMatchesRelation({ title:'Clopidogrel active metabolite by CYP2C19 phenotype', abstract:'' }, 'clopidogrel:CYP2C19_active_metabolite')) {
    throw new Error('Relation positive-match self-test failed');
  }
  if (articleMatchesRelation({ title:'Voriconazole therapy and CYP2C19 phenotype', abstract:'' }, 'clopidogrel:CYP2C19_active_metabolite')) {
    throw new Error('Relation mismatch self-test failed');
  }
  console.log('Enrichment self-test passed.');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  if (args['self-test']) {
    selfTest();
    return;
  }
  const query = relationQuery(args);
  const relation = args.relation || query;
  const liveData = loadLiveData();
  const existingDrafts = loadExistingDrafts();
  const providers = providersFromArgs(args);
  const articles = [];
  const providerErrors = [];
  for (const provider of providers) {
    try {
      const found = await searchProvider(provider, query, args);
      articles.push(...found);
    } catch (err) {
      providerErrors.push({ provider, message: err.message });
      console.warn(`Provider skipped (${provider}): ${err.message}`);
    }
  }
  if (!articles.length && providerErrors.length) {
    throw new Error(`All providers failed for query: ${query}`);
  }
  const relationMatchedArticles = [];
  const relationSkipped = [];
  for (const article of articles) {
    if (articleMatchesRelation(article, relation)) relationMatchedArticles.push(article);
    else relationSkipped.push({ id: article.pmid || article.doi || normalizeTitle(article.title), reason: 'relation_mismatch', title: article.title });
  }
  const articlesWithOpenAccess = await enrichOpenAccess(relationMatchedArticles, args);
  const candidates = articlesWithOpenAccess.map(article => makeDraft(article, { ...args, relation }));
  const { kept, skipped } = dedupeDrafts(candidates, liveData, existingDrafts);
  saveDrafts([...existingDrafts, ...kept]);
  writeReport({ relation, query, added: kept, skipped: skipped.concat(relationSkipped), providerErrors });
  console.log(`Enrichment complete: ${kept.length} draft(s), ${skipped.length} duplicate(s), ${relationSkipped.length} relation mismatch(es), providers: ${providers.join(',')}.`);
  console.log(`Drafts: ${DRAFTS_PATH}`);
  console.log(`Report: ${REPORT_PATH}`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
