#!/usr/bin/env node
import { createHash } from 'crypto';
import { existsSync } from 'fs';
import { isAbsolute, relative, resolve } from 'path';
import { ROOT } from './lib/diognosis-source-loader.js';
import { readJson, writeJson } from './lib/enrichment-common.js';

const TARGETS = [
  {
    provider: 'clinpgx',
    rawIndex: 'data/enrichment/snapshots/clinpgx-raw/index.json',
    metadata: 'data/enrichment/snapshots/clinpgx-snapshot-metadata.json',
    cacheRoot: 'data/enrichment/cache/clinpgx',
    endpointSeparator: '_',
  },
  {
    provider: 'cpic',
    rawIndex: 'data/enrichment/snapshots/cpic-raw/index.json',
    metadata: 'data/enrichment/snapshots/cpic-snapshot-metadata.json',
    cacheRoot: 'data/enrichment/cache/cpic',
    endpointSeparator: '-',
  },
];

function repoRelativePath(path) {
  if (!path) return '';
  return (isAbsolute(path) ? relative(ROOT, path) : path).replace(/\\/g, '/');
}

function queryCacheKey(entry) {
  if (entry.cacheKey) return entry.cacheKey;
  return createHash('sha256')
    .update(JSON.stringify({
      url: entry.url || '',
      endpoint: entry.endpoint || '',
      params: entry.params || {},
      status: entry.status || '',
      responseSha256: entry.responseSha256 || entry.sha256 || '',
    }))
    .digest('hex');
}

function endpointPrefix(endpoint, separator) {
  return String(endpoint || 'source')
    .replace(/\//g, separator)
    .replace(/[^A-Za-z0-9_-]/g, separator)
    .replace(new RegExp(`${separator}+`, 'g'), separator)
    .replace(new RegExp(`^${separator}|${separator}$`, 'g'), '') || 'source';
}

function normalizeEntry(entry, target) {
  const next = { ...entry };
  const cacheKey = queryCacheKey(next);
  const cacheId = next.cacheId || `${endpointPrefix(next.endpoint, target.endpointSeparator)}-${cacheKey.slice(0, 12)}`;
  if (next.file) next.file = repoRelativePath(next.file);
  next.cacheId = cacheId;
  next.cacheKey = cacheKey;
  next.cacheFile = repoRelativePath(next.cacheFile || `${target.cacheRoot}/${cacheId}.json`);
  if (next.sha256 && !next.responseSha256) next.responseSha256 = next.sha256;
  return next;
}

function publicFailure(entry, target) {
  const normalized = normalizeEntry(entry, target);
  return {
    endpoint: normalized.endpoint || '',
    params: normalized.params || {},
    status: normalized.status || '',
    records: normalized.records || 0,
    cacheId: normalized.cacheId,
    cacheKey: normalized.cacheKey,
    cacheFile: normalized.cacheFile,
    responseSha256: normalized.responseSha256 || normalized.sha256 || '',
    error: normalized.error || undefined,
  };
}

const summary = [];

for (const target of TARGETS) {
  const rawIndexPath = resolve(ROOT, target.rawIndex);
  if (existsSync(rawIndexPath)) {
    const index = readJson(rawIndexPath, {});
    index.fetched = (index.fetched || []).map(entry => normalizeEntry(entry, target));
    index.providerFailures = (index.providerFailures || []).map(entry => normalizeEntry(entry, target));
    writeJson(rawIndexPath, index);
    summary.push({ file: target.rawIndex, fetched: index.fetched.length, providerFailures: index.providerFailures.length });
  }

  const metadataPath = resolve(ROOT, target.metadata);
  if (existsSync(metadataPath)) {
    const metadata = readJson(metadataPath, {});
    metadata.providerFailures = (metadata.providerFailures || []).map(entry => publicFailure(entry, target));
    writeJson(metadataPath, metadata);
    summary.push({ file: target.metadata, providerFailures: metadata.providerFailures.length });
  }
}

console.log(JSON.stringify({ ok: true, sanitized: summary }, null, 2));
