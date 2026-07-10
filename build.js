#!/usr/bin/env node
// Diognosis build script
// Concatenates all src/ modules in dependency order and injects into HTML template.
// Default output: index.html (root — GitHub Pages compatible)
//
// Usage:  node build.js [--dev] [--out <path>]
//         npm run build         → index.html (minified)
//         npm run build:dev     → readable development bundle

import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, 'src');
const VENDOR_D3_PATH = resolve(__dirname, 'vendor/d3/d3.v7.8.5.min.js');
const V1_CSS_PATH = resolve(__dirname, 'assets/app-v1.css');
const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
const DEV_BUILD = args.includes('--dev');
const MINIFY = !DEV_BUILD || args.includes('--minify');
const outIdx = args.indexOf('--out');
// Default: index.html at repo root (GitHub Pages serves from root or /docs)
const OUT_PATH = outIdx >= 0 ? resolve(args[outIdx + 1]) : resolve(__dirname, 'index.html');

// ── Module load order (dependency-first) ─────────────────────────────────────
// Rule: a module must appear AFTER all modules it depends on globally.
const MODULE_ORDER = [
  // ── Data layer (no cross-module deps within layer) ──
  'data/constants.js',      // ACTOR_TYPE, EDGE_TYPE, EVIDENCE_TIER, GENOTYPE_PHENOTYPE, INH_MULT, IND_MULT
  'data/rules.js',          // engine/display rule weights, PK intervals, phenotype thresholds
  'data/drugs.js',          // DRUG_DB, DIOGNOSIS_VERSION, BRAND_NAMES, DOSE_TIERS, getDrug
  'data/enzymes.js',        // GENE_ENZYMES, PHARMGKB_EVIDENCE, userGenetics, ENZYME_ACTORS, CV_ESTIMATES
  'data/metabolites.js',    // METAB, SIDER_PD, METABOLITE_ACTORS
  'data/transporters.js',   // TRANSPORTER_DDI, TRANSPORTER_ACTORS
  'data/actors.js',         // FOOD_ACTORS, ENDOGENOUS_ACTORS, RECEPTOR_ACTORS, PHENOTYPE_ACTORS
  'data/pharmacology.js',   // TEMPORAL_PROFILES, PK_PARAMS, PHENOTYPE_SCORES, WASHOUT_DAYS, ACB_SCORES, BEERS_FLAGS
  'data/evidence.js',       // STUDY_DB, INGESTION_QUEUE, createStudyDraft, reviewStudyDraft
  'data/clinicalStandards.js', // RxNorm/PGx marker crosswalks and review-gated PGx action summaries
  'data/interactions.js',   // PATHWAY_DIVERSION, COMBINATION_PRODUCTS, KNOWN_DDI
  'data/sourceSpecificPromotions.js', // source-backed rows promoted across live calculation surfaces
  'data/generatedStats.js', // DIOGNOSIS_STATS generated from source data

  // ── Engine layer (depends on data layer) ──
  'engine/evidenceEngine.js',     // evidenceConfidence, getStudy, computeEdgeConfidence, studyCardHTML
  'engine/evidenceConfidenceEngine.js', // per-finding evidence confidence ladders
  'engine/pathwayEngine.js',      // buildInteractionGraph, traverseEffects, getTemporalProfile
  'engine/enzymeEngine.js',       // getAllInhibitions, calcFold, computeGutExtraction, foldChangeBands
  'engine/pkEngine.js',           // pkConcentration, pkCurve, genotypeAdjustedPK
  'engine/pkRelativeEngine.js',   // pkRelativeForDrug, universal relative exposure fallback
  'engine/phenotypeEngine.js',    // computePhenotypeAccumulation, computeWashoutCalendar
  'engine/scoringEngine.js',      // computeAdverseBurden
  'engine/interactionEngine.js',  // findInteractions, calcRisk, analyzeMetabolites
  'engine/activeMoietyEngine.js', // parent/metabolite direction and active-moiety balance
  'engine/phenoconversionEngine.js', // genotype plus inhibitors/inducers/substrate burden
  'engine/persistenceTimelineEngine.js', // parent/metabolite persistence, washout, enzyme recovery
  'engine/riskMarkerFindingEngine.js', // risk-marker findings and conservative causal paths
  'engine/findingEngine.js',      // normalized Interaction Finding model
  'engine/warningPathEngine.js',  // per-warning causal path objects
  'engine/clinicalConcernEngine.js', // Overview clinical concern grouping/presentation layer
  'engine/mechanisticPredictionEngine.js', // experimental route/metabolite predictions

  // ── UI layer (depends on engine + data) ──
  'ui/renderSafe.js',         // escaping helpers for generated/imported strings
  'ui/renderCore.js',         // addDrug, removeDrug, renderAll, renderMedList
  'ui/runtimeFacade.js',      // stable V1 handoff API for wrapper/redesign apps
  'ui/renderInteractions.js', // renderInteractions, renderFoldBars, renderMatrix, renderTiming
  'ui/renderMechanisticPredictions.js', // experimental predictions below warnings
  'ui/renderEvidence.js',     // renderEvidenceExplorer
  'ui/renderActiveMoiety.js', // Parent-Metabolite Balance panel
  'ui/renderPhenoconversion.js', // Functional Gene Status dashboard
  'ui/renderPersistenceTimeline.js', // Persistence & Washout timeline
  'ui/renderWhyPath.js', // compact warning path cards and raw review paths
  'ui/renderReview.js', // Review tab summary, diagnostics, and contribution actions
  'ui/renderCascade.js',      // renderCascade
  'ui/renderAlternatives.js', // renderGenetics, renderMetabolites, etc. (legacy filename)
  'ui/renderGenotype.js',     // renderGenotypePanel, setGenotype
  'ui/renderPhenotype.js',    // renderPhenotypeAccumulation
  'ui/renderPK.js',           // renderPKSimulation
  'ui/renderGraph.js',        // renderInteractionGraph
  'ui/renderBurden.js',       // renderWashoutCalendar, renderAdverseBurden

  // ── Bootstrap (must be last — calls renderAll) ──
  'main.js',
];

function loadModule(relPath) {
  const fullPath = relPath === 'main.js'
    ? resolve(SRC, relPath)
    : resolve(SRC, relPath);
  try {
    return readFileSync(fullPath, 'utf8');
  } catch (e) {
    throw new Error(`Failed to load module ${relPath}: ${e.message}`);
  }
}

export function buildBundle() {
  console.log(`Building Diognosis bundle (${MINIFY ? 'minified' : 'development'})...`);

  const parts = [`// Diognosis bundle — built ${new Date().toISOString()}\n// DO NOT EDIT: auto-generated by build.js\n\n`];

  for (const mod of MODULE_ORDER) {
    const content = loadModule(mod);
    parts.push(`\n// ═══ ${mod} ═══\n`);
    parts.push(content);
  }

  let bundle = parts.join('');

  if (MINIFY) {
    // Write temp bundle and minify with esbuild
    const tmpDir = resolve(__dirname, '.tmp');
    const tmpPath = resolve(tmpDir, '_tmp_bundle.js');
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(tmpPath, bundle);
    try {
      const esbuildBin = require.resolve('esbuild/bin/esbuild');
      execSync(`"${esbuildBin}" "${tmpPath}" --bundle=false --minify --outfile="${tmpPath}.min.js"`, {
        cwd: __dirname, stdio: 'pipe'
      });
      bundle = readFileSync(`${tmpPath}.min.js`, 'utf8');
    } catch (e) {
      console.warn('Minification failed, using unminified bundle:', e.message);
    }
  }

  return bundle;
}

function generateStats() {
  const script = resolve(__dirname, 'scripts/gen-stats.js');
  if (!existsSync(script)) return;
  execSync(`"${process.execPath}" "${script}"`, { cwd: __dirname, stdio: 'inherit' });
}

export function injectIntoTemplate(bundle) {
  const templatePath = resolve(SRC, 'index.template.html');
  const template = readFileSync(templatePath, 'utf8');
  const d3Bundle = readFileSync(VENDOR_D3_PATH, 'utf8');
  const v1Css = readFileSync(V1_CSS_PATH, 'utf8');
  const withV1Styles = template.replace(
    '<style>/* V1_STYLES */</style>',
    () => `<style>\n${v1Css}\n</style>`
  );
  if (withV1Styles === template) {
    throw new Error('Template placeholder not found: <style>/* V1_STYLES */</style>');
  }
  // Use a function replacer — prevents $& / $1 / $` special substitutions in
  // String.prototype.replace() from corrupting bundle content (e.g. the "\\$&"
  // in highlight()'s RegExp call would otherwise expand to the placeholder text).
  const withD3 = withV1Styles.replace(
    '<script>/* D3_BUNDLE */</script>',
    () => `<script>\n${d3Bundle}\n</script>`
  );
  if (withD3 === withV1Styles) {
    throw new Error('Template placeholder not found: <script>/* D3_BUNDLE */</script>');
  }
  const injected = withD3.replace(
    '<script>/* DIOGNOSIS_BUNDLE */</script>',
    () => `<script>\n${bundle}\n</script>`
  );
  if (injected === withD3) {
    throw new Error('Template placeholder not found: <script>/* DIOGNOSIS_BUNDLE */</script>');
  }
  return applyContentSecurityPolicy(injected);
}

export function applyContentSecurityPolicy(html) {
  const scriptHashes = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1] || '')
    .filter(content => content.trim())
    .map(content => `'sha256-${createHash('sha256').update(content, 'utf8').digest('base64')}'`);
  if (!scriptHashes.length) throw new Error('Cannot build CSP: no inline scripts found.');
  const policy = [
    "default-src 'self'",
    `script-src ${scriptHashes.join(' ')}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "manifest-src 'self'",
    "media-src 'none'",
    "frame-src 'none'",
  ].join('; ');
  const secured = html.replace('content="/* CSP_POLICY */"', () => `content="${policy}"`);
  if (secured === html) throw new Error('Template placeholder not found: /* CSP_POLICY */');
  return secured;
}

// ── Main ──
export function runBuild() {
  try {
    mkdirSync(dirname(OUT_PATH), { recursive: true });
    generateStats();
    const bundle = buildBundle();
    const html = injectIntoTemplate(bundle);
    writeFileSync(OUT_PATH, html, 'utf8');
    generateStats();

    const sizeKB = Math.round(Buffer.byteLength(html, 'utf8') / 1024);
    const lineCount = html.split('\n').length;
    console.log(`✓ Output: ${OUT_PATH}`);
    console.log(`  Size: ${sizeKB} KB | Lines: ${lineCount}`);

    // Quick syntax check of the generated JavaScript bundle.
    const checkDir = resolve(__dirname, '.tmp');
    const checkPath = resolve(checkDir, '_bundle_check.js');
    mkdirSync(checkDir, { recursive: true });
    writeFileSync(checkPath, bundle, 'utf8');
    execSync(`"${process.execPath}" --check "${checkPath}"`, { stdio: 'pipe' });
    rmSync(checkPath, { force: true });

    console.log('Build complete.');
  } catch (e) {
    console.error('Build failed:', e.message);
    process.exit(1);
  }
}

const isMainModule = Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) runBuild();
