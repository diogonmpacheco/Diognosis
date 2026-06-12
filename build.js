#!/usr/bin/env node
// Diognosis build script
// Concatenates all src/ modules in dependency order and injects into HTML template.
// Default output: index.html (root — GitHub Pages compatible)
//
// Usage:  node build.js [--minify] [--out <path>]
//         npm run build         → index.html
//         npm run build:min     → index.html (minified)

import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, 'src');
const VENDOR_D3_PATH = resolve(__dirname, 'vendor/d3/d3.v7.8.5.min.js');
const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
const MINIFY = args.includes('--minify');
const outIdx = args.indexOf('--out');
// Default: index.html at repo root (GitHub Pages serves from root or /docs)
const OUT_PATH = outIdx >= 0 ? resolve(args[outIdx + 1]) : resolve(__dirname, 'index.html');

// ── Module load order (dependency-first) ─────────────────────────────────────
// Rule: a module must appear AFTER all modules it depends on globally.
const MODULE_ORDER = [
  // ── Data layer (no cross-module deps within layer) ──
  'data/constants.js',      // ACTOR_TYPE, EDGE_TYPE, EVIDENCE_TIER, GENOTYPE_PHENOTYPE, INH_MULT, IND_MULT
  'data/rules.js',          // engine/display rule weights, PK intervals, phenotype thresholds
  'data/drugs.js',          // DRUG_DB, MEDCHECK_VERSION, BRAND_NAMES, DOSE_TIERS, getDrug
  'data/enzymes.js',        // GENE_ENZYMES, PHARMGKB_EVIDENCE, userGenetics, ENZYME_ACTORS, CV_ESTIMATES
  'data/metabolites.js',    // METAB, SIDER_PD, METABOLITE_ACTORS
  'data/transporters.js',   // TRANSPORTER_DDI, TRANSPORTER_ACTORS
  'data/actors.js',         // FOOD_ACTORS, ENDOGENOUS_ACTORS, RECEPTOR_ACTORS, PHENOTYPE_ACTORS
  'data/pharmacology.js',   // TEMPORAL_PROFILES, PK_PARAMS, PHENOTYPE_SCORES, WASHOUT_DAYS, ACB_SCORES, BEERS_FLAGS
  'data/evidence.js',       // STUDY_DB, INGESTION_QUEUE, createStudyDraft, reviewStudyDraft
  'data/interactions.js',   // PATHWAY_DIVERSION, COMBINATION_PRODUCTS, KNOWN_DDI
  'data/generatedStats.js', // MEDCHECK_STATS generated from source data
  'data/generatedOpenTargetsSnapshot.js', // static external context snapshot
  'data/generatedOpenTargetsPromotionQueue.js', // static Open Targets review/promotion queue
  'data/generatedOpenTargetsReviewTargets.js', // static first review target decisions

  // ── Engine layer (depends on data layer) ──
  'engine/evidenceEngine.js',     // evidenceConfidence, getStudy, computeEdgeConfidence, studyCardHTML
  'engine/pathwayEngine.js',      // buildInteractionGraph, traverseEffects, getTemporalProfile
  'engine/enzymeEngine.js',       // getAllInhibitions, calcFold, computeGutExtraction, foldChangeBands
  'engine/pkEngine.js',           // pkConcentration, pkCurve, genotypeAdjustedPK
  'engine/pkRelativeEngine.js',   // pkRelativeForDrug, universal relative exposure fallback
  'engine/phenotypeEngine.js',    // computePhenotypeAccumulation, computeWashoutCalendar
  'engine/scoringEngine.js',      // computeAdverseBurden
  'engine/interactionEngine.js',  // findInteractions, calcRisk, analyzeMetabolites
  'engine/mechanisticPredictionEngine.js', // experimental route/metabolite predictions

  // ── UI layer (depends on engine + data) ──
  'ui/renderSafe.js',         // escaping helpers for generated/imported strings
  'ui/renderCore.js',         // addDrug, removeDrug, renderAll, renderMedList
  'ui/renderInteractions.js', // renderInteractions, renderFoldBars, renderMatrix, renderTiming
  'ui/renderMechanisticPredictions.js', // experimental predictions below warnings
  'ui/renderEvidence.js',     // renderEvidenceExplorer
  'ui/renderExternalSafetyContext.js', // imported external context cards
  'ui/renderCascade.js',      // renderCascade
  'ui/renderAlternatives.js', // renderAlternatives, renderGenetics, renderMetabolites, etc.
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

function buildBundle() {
  console.log(`Building Diognosis / MedCheck Engine bundle (${MINIFY ? 'minified' : 'development'})...`);

  const parts = [`// Diognosis / MedCheck Engine bundle — built ${new Date().toISOString()}\n// DO NOT EDIT: auto-generated by build.js\n\n`];

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

function generateMechanisticCurationGaps() {
  const script = resolve(__dirname, 'scripts/audit/mechanistic-curation-gaps.js');
  if (!existsSync(script)) return;
  execSync(`"${process.execPath}" "${script}"`, { cwd: __dirname, stdio: 'inherit' });
}

function injectIntoTemplate(bundle) {
  const templatePath = resolve(SRC, 'index.template.html');
  const template = readFileSync(templatePath, 'utf8');
  const d3Bundle = readFileSync(VENDOR_D3_PATH, 'utf8');
  // Use a function replacer — prevents $& / $1 / $` special substitutions in
  // String.prototype.replace() from corrupting bundle content (e.g. the "\\$&"
  // in highlight()'s RegExp call would otherwise expand to the placeholder text).
  const withD3 = template.replace(
    '<script>/* D3_BUNDLE */</script>',
    () => `<script>\n${d3Bundle}\n</script>`
  );
  if (withD3 === template) {
    throw new Error('Template placeholder not found: <script>/* D3_BUNDLE */</script>');
  }
  const injected = withD3.replace(
    '<script>/* MEDCHECK_BUNDLE */</script>',
    () => `<script>\n${bundle}\n</script>`
  );
  if (injected === withD3) {
    throw new Error('Template placeholder not found: <script>/* MEDCHECK_BUNDLE */</script>');
  }
  return injected;
}

// ── Main ──
try {
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  generateStats();
  generateMechanisticCurationGaps();
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
