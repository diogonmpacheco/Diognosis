#!/usr/bin/env node
// Diognosis Pages deploy checklist
// Fast confidence gate for live testing. The full pre-release gate remains scripts/release-check.js.

import { existsSync, readFileSync } from 'fs';
import { node, run, verifyReleaseMetadata } from './lib/release-check-common.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function verifyAuxiliaryPages() {
  const requiredArtifactFiles = [
    'data-views.html',
    'medication-classes.html',
    'medication-class-examples.html',
    'reference/index.html',
    'data/diognosis-facts.json',
    'data/diognosis-facts.jsonl',
    'llms.txt',
    'assets/logo-mark.png',
    'assets/auxiliary-pages.css',
    'manifest.json',
    'icon-32.png',
    'icon-180.png',
    'icon-192.png',
    'icon-512.png',
    'og-image.png',
    'robots.txt',
    'sitemap.xml',
    'src/data/dataViewsIndex.js',
  ];
  const requiredSourceFiles = [
    'data/medication-class-guides.json',
    'scripts/generate-medication-class-pages.js',
    'scripts/generate-reference-layer.js',
  ];
  for (const file of [...requiredArtifactFiles, ...requiredSourceFiles]) {
    assert(existsSync(file), `Pages auxiliary file is missing: ${file}`);
  }
  const workflow = readFileSync('.github/workflows/pages.yml', 'utf8');
  for (const file of requiredArtifactFiles.filter(file => !file.startsWith('src/data/'))) {
    assert(workflow.includes(file), `Pages workflow does not deploy ${file}`);
  }
  assert(/cp src\/data\/\*\.js dist\/src\/data\//.test(workflow), 'Pages workflow must deploy data-views source data files');
  const dataViews = readFileSync('data-views.html', 'utf8');
  assert(dataViews.includes('dataSnapshotRelations') && dataViews.includes('Local static data; no runtime uploads'),
    'Data Views page should expose the current data snapshot and local-data boundary');
  for (const file of ['medication-classes.html', 'medication-class-examples.html']) {
    const html = readFileSync(file, 'utf8');
    assert(html.includes('support-strip') && html.includes('validated examples') && html.includes('Static examples; no runtime uploads'),
      `${file} should expose the generated class-guide snapshot and static-example boundary`);
  }
  const facts = JSON.parse(readFileSync('data/diognosis-facts.json', 'utf8'));
  const jsonlLines = readFileSync('data/diognosis-facts.jsonl', 'utf8').trim().split('\n').filter(Boolean);
  const reference = readFileSync('reference/index.html', 'utf8');
  const llms = readFileSync('llms.txt', 'utf8');
  assert(facts.schema === 'diognosis.reference-facts.v1' && facts.factCount >= 50 && facts.factCount <= 100,
    `Reference facts payload should expose 50-100 facts, got ${facts.factCount || 0}`);
  assert(jsonlLines.length === facts.factCount, 'Reference JSONL should contain one line per canonical fact');
  assert(facts.facts.every((fact) => fact.summary && fact.reviewQuestion && fact.mechanismSummary && fact.evidenceStatus && fact.boundary),
    'Every reference fact should expose public summary, review question, mechanism summary, evidence status, and boundary');
  assert(reference.includes('application/ld+json') && reference.includes('Diognosis V1 Reference Facts') && reference.includes('Educational only; no runtime uploads'),
    'Reference page should expose JSON-LD, title, and local/static boundary');
  assert(llms.includes('V1 Reference Facts') && llms.includes('Facts JSONL') && llms.includes('not medical advice'),
    'llms.txt should route retrieval systems to the reference layer and boundary');
  console.log('✓ Auxiliary Pages files and workflow artifact entries');
}

run('Generate medication class guide pages', node, ['scripts/generate-medication-class-pages.js']);
run('Build index.html', node, ['build.js']);
run('Generate reference layer', node, ['scripts/generate-reference-layer.js']);
run('Reference layer drift check', node, ['scripts/generate-reference-layer.js', '--check']);
verifyReleaseMetadata();
verifyAuxiliaryPages();

run('Smoke check', node, ['scripts/smoke-check.js']);
run('Privacy/static audit', node, ['scripts/audit/privacy-static-audit.js']);
run('Whitespace diff check', 'git', ['diff', '--check']);

console.log('\nPages deploy check passed.');
console.log('Run npm run release:check before tagged releases, public launch claims, or clinical-review milestones.');
