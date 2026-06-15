#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { extname, join, resolve } from 'path';
import { ROOT } from '../enrich/lib/diognosis-source-loader.js';
import { loadAllStagedRecords, readJson } from '../enrich/lib/enrichment-common.js';

const ALLOWLIST = resolve(ROOT, 'data/enrichment/provider-allowlist.json');
const SEARCH_DIRS = [
  resolve(ROOT, 'data/enrichment'),
  resolve(ROOT, 'docs/enrichment'),
  resolve(ROOT, 'docs/automations'),
];

const allowlist = readJson(ALLOWLIST, { blockedHostPatterns: [], forbidden: [] });
const { records } = loadAllStagedRecords();
const errors = [];

for (const record of records) {
  if (!record.source?.license) errors.push(`${record.id}: missing source license`);
  if (record.governance?.canAffectScoring) errors.push(`${record.id}: unreviewed staged record can affect scoring`);
  if (record.governance?.canAffectPublicSeverity) errors.push(`${record.id}: unreviewed staged record can affect public severity`);
  if (record.governance?.professionalReviewStatus === 'reviewed') errors.push(`${record.id}: staged record is marked reviewed`);
}

for (const file of listFiles(SEARCH_DIRS)) {
  const text = readFileSync(file, 'utf8');
  const urls = text.match(/https?:\/\/[^\s"'<>),]+/g) || [];
  for (const url of urls) {
    let host = '';
    try {
      host = new URL(url).hostname;
    } catch {
      continue;
    }
    for (const pattern of allowlist.blockedHostPatterns || []) {
      if (new RegExp(pattern, 'i').test(host)) errors.push(`${file}: forbidden URL host ${host}`);
    }
  }
  if (extname(file).toLowerCase() === '.pdf') errors.push(`${file}: PDF stored in enrichment boundary`);
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, stagedRecords: records.length, scannedFiles: listFiles(SEARCH_DIRS).length }, null, 2));

function listFiles(dirs) {
  const out = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    visit(dir);
  }
  return out;

  function visit(path) {
    const stats = statSync(path);
    if (stats.isDirectory()) {
      for (const entry of readdirSync(path)) visit(join(path, entry));
    } else if (['.json', '.md', '.txt', '.pdf'].includes(extname(path).toLowerCase())) {
      out.push(path);
    }
  }
}
