#!/usr/bin/env node
// Validate enrichment batch manifests without running literature discovery.

import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(new URL('../..', import.meta.url).pathname);
const batchDir = resolve(root, 'scripts/enrich');
const batchFiles = readdirSync(batchDir)
  .filter(name => name.endsWith('-batch.json'))
  .map(name => resolve(batchDir, name));

const errors = [];

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function requireArray(item, field, path) {
  if (!Array.isArray(item[field])) errors.push(`${path}.${field} must be an array`);
}

function requireNonEmptyString(item, field, path) {
  if (typeof item[field] !== 'string' || !item[field].trim()) {
    errors.push(`${path}.${field} must be a non-empty string`);
  }
}

function validateSubstance(substance, path) {
  for (const field of ['id', 'name', 'class', 'transporterRelevance']) requireNonEmptyString(substance, field, path);
  for (const field of ['routes', 'inhibitors', 'inducers', 'substrates', 'importantMetabolites', 'evidenceRefs']) {
    requireArray(substance, field, path);
  }
  if (substance.reviewRequired !== true) errors.push(`${path}.reviewRequired must be true for public-facts synthesis`);
  for (const [index, route] of (substance.routes || []).entries()) {
    requireNonEmptyString(route, 'pathway', `${path}.routes[${index}]`);
    requireNonEmptyString(route, 'clinicalRelevance', `${path}.routes[${index}]`);
  }
}

function validateDdiPair(pair, path) {
  for (const field of ['drug1', 'drug2', 'severity', 'category', 'mechanism', 'effect']) requireNonEmptyString(pair, field, path);
  requireArray(pair, 'evidenceRefs', path);
  if (pair.reviewRequired !== true) errors.push(`${path}.reviewRequired must be true for public-facts synthesis`);
}

for (const file of batchFiles) {
  const rel = file.slice(root.length + 1);
  let batch;
  try {
    batch = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`${rel} is not valid JSON: ${error.message}`);
    continue;
  }

  requireNonEmptyString(batch, 'description', rel);
  requireArray(batch, 'queries', rel);

  const substanceKeys = new Map();
  for (const [index, substance] of (batch.substances || []).entries()) {
    const path = `${rel}.substances[${index}]`;
    validateSubstance(substance, path);
    const terms = [substance.id, substance.name, ...(substance.brandNames || [])];
    for (const term of terms) {
      const key = normalize(term);
      if (!key) continue;
      const owner = substanceKeys.get(key);
      if (owner && owner !== substance.id) {
        errors.push(`${path} duplicates normalized name/brand "${term}" already owned by ${owner}`);
      }
      substanceKeys.set(key, substance.id);
    }
  }

  const ddiKeys = new Set();
  for (const [index, pair] of (batch.ddiPairs || []).entries()) {
    const path = `${rel}.ddiPairs[${index}]`;
    validateDdiPair(pair, path);
    const key = [normalize(pair.drug1), normalize(pair.drug2)].sort().join('|');
    if (ddiKeys.has(key)) errors.push(`${path} duplicates DDI pair ${pair.drug1}+${pair.drug2}`);
    ddiKeys.add(key);
  }

  for (const [index, query] of (batch.queries || []).entries()) {
    const path = `${rel}.queries[${index}]`;
    requireNonEmptyString(query, 'relation', path);
    requireNonEmptyString(query, 'query', path);
    requireArray(query, 'supports', path);
  }
}

if (errors.length) {
  console.error(`Enrichment batch validation failed with ${errors.length} issue${errors.length === 1 ? '' : 's'}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validated ${batchFiles.length} enrichment batch manifest${batchFiles.length === 1 ? '' : 's'}.`);
