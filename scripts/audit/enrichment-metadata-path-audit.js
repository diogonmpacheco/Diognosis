#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';
import { ROOT } from '../enrich/lib/medcheck-source-loader.js';

const SCAN_ROOTS = [
  'data/enrichment/snapshots',
  'data/enrichment/staged',
  'data/enrichment/review-queue',
  'docs/audits',
  'src/data/generatedLivePendingReview.js',
  'src/data/generatedPendingReviewEnrichment.js',
  'src/data/generatedPendingCoreEnrichment.js',
].map(path => resolve(ROOT, path));

const ABSOLUTE_PATH_PATTERNS = [
  /\/Users\//,
  /file:\/\/\/Users\//,
  /Documents\/GitHub\/medcheck/,
  new RegExp(ROOT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
];

function walk(path) {
  if (!existsSync(path)) return [];
  const stat = statSync(path);
  if (stat.isFile()) return [path];
  if (!stat.isDirectory()) return [];
  return readdirSync(path)
    .flatMap(name => walk(join(path, name)));
}

function isScannable(path) {
  return /\.(json|md|js)$/i.test(path);
}

function lineFor(text, index) {
  return text.slice(0, index).split('\n').length;
}

const files = SCAN_ROOTS.flatMap(walk).filter(isScannable);
const failures = [];

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const pattern of ABSOLUTE_PATH_PATTERNS) {
    const match = pattern.exec(text);
    if (!match) continue;
    failures.push({
      file: relative(ROOT, file).replace(/\\/g, '/'),
      line: lineFor(text, match.index),
      pattern: pattern.source,
    });
    break;
  }
}

if (failures.length) {
  console.error('Enrichment metadata path audit failed: local absolute paths were found.');
  console.error(JSON.stringify({ failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  scannedFiles: files.length,
  message: 'No local absolute paths found in enrichment metadata/report surfaces.',
}, null, 2));
