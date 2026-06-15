import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { ROOT } from './medcheck-source-loader.js';
import { dedupeStagedSourceRecords, validateStagedSourceRecord } from './staged-source-schema.js';

export const ENRICHMENT_ROOT = resolve(ROOT, 'data/enrichment');
export const STAGED_DIR = resolve(ENRICHMENT_ROOT, 'staged');
export const REPORT_DIR = resolve(ROOT, 'docs/audits');

export function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

export function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeJson(path, value) {
  ensureDir(dirname(path));
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function writeText(path, value) {
  ensureDir(dirname(path));
  writeFileSync(path, value, 'utf8');
}

export function stagedFiles() {
  if (!existsSync(STAGED_DIR)) return [];
  return readdirSync(STAGED_DIR)
    .filter(name => name.endsWith('.json'))
    .map(name => join(STAGED_DIR, name))
    .sort();
}

export function loadAllStagedRecords() {
  const records = [];
  const files = [];
  for (const file of stagedFiles()) {
    const parsed = readJson(file, []);
    const rows = Array.isArray(parsed) ? parsed : parsed.records || [];
    records.push(...rows);
    files.push({ file, records: rows.length });
  }
  return { records: dedupeStagedSourceRecords(records), files };
}

export function validateStagedRecords(records = []) {
  return records.flatMap(record => {
    const result = validateStagedSourceRecord(record);
    return result.ok ? [] : [{ id: record.id || '(missing id)', errors: result.errors }];
  });
}

export function markdownTable(headers, rows) {
  const clean = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  return [
    `| ${headers.map(clean).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map(row => `| ${row.map(clean).join(' | ')} |`),
  ].join('\n');
}

export function commandSummary(label, result) {
  return {
    label,
    status: result.status,
    ok: result.status === 0,
    signal: result.signal || null,
  };
}
