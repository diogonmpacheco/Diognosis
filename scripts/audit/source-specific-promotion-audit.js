#!/usr/bin/env node
import { loadDiognosisData } from '../enrich/lib/diognosis-source-loader.js';

const args = new Set(process.argv.slice(2));
const check = args.has('--check');
const data = loadDiognosisData(['src/engine/phenotypeEngine.js']);
const promotions = data.SOURCE_SPECIFIC_PROMOTIONS || {};
const diagnostics = data.SOURCE_SPECIFIC_PROMOTION_DIAGNOSTICS || {};
const surfaces = data.SOURCE_SPECIFIC_PROMOTION_SURFACES || ['ddi', 'pk', 'washout', 'metabolite', 'pgx', 'transporter', 'burden'];
const failures = [];

function key(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function pairKey(a, b) {
  return [key(a), key(b)].sort().join('|');
}

function tableRow(table, drugName) {
  const candidates = [
    key(drugName),
    String(drugName || '').trim().toLowerCase(),
    String(drugName || '').trim(),
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (table?.[candidate]) return table[candidate];
  }
  return null;
}

function transporterKey(row) {
  return [key(row.substrate), key(row.inhibitor), key(row.transporter)].join('|');
}

function hasRefs(row, refs = []) {
  return refs.every(ref => (row?.evidenceRefs || []).includes(ref));
}

function hasPendingMeta(row, id) {
  return row?.sourceSpecific === true &&
    row?.sourceSpecificPromotion === true &&
    row?.sourceSpecificPromotionId === id &&
    row?.reviewRequired === true &&
    row?.verified === false &&
    row?.promotionStatus === 'source_specific_pending_review';
}

function assertRow(surface, promotion, row, label) {
  if (!row) {
    failures.push(`${surface}:${promotion.id} missing live row ${label}`);
    return;
  }
  if (!hasRefs(row, promotion.evidenceRefs || [])) failures.push(`${surface}:${promotion.id} live row missing evidence refs`);
  if (!hasPendingMeta(row, promotion.id)) failures.push(`${surface}:${promotion.id} live row missing pending source-specific metadata`);
}

for (const surface of surfaces) {
  if (!Array.isArray(promotions[surface])) failures.push(`${surface}: promotions surface missing`);
}

for (const { surface, id, ref } of diagnostics.missingEvidenceRefs || []) {
  failures.push(`${surface}:${id} dangling evidence ref ${ref}`);
}
for (const { surface, id } of diagnostics.missingTargets || []) {
  failures.push(`${surface}:${id} promotion target not found`);
}

for (const surface of surfaces) {
  const expected = promotions[surface]?.length || 0;
  const applied = diagnostics.applied?.[surface]?.length || 0;
  if (expected !== applied) failures.push(`${surface}: expected ${expected} applied promotions but found ${applied}`);
}

for (const promotion of promotions.ddi || []) {
  const row = (data.KNOWN_DDI || []).find(item => pairKey(item.drug1, item.drug2) === pairKey(promotion.drug1, promotion.drug2));
  assertRow('ddi', promotion, row, `${promotion.drug1}+${promotion.drug2}`);
}

for (const promotion of promotions.pk || []) {
  assertRow('pk', promotion, tableRow(data.PK_PARAMS, promotion.drug), promotion.drug);
}

for (const promotion of promotions.washout || []) {
  assertRow('washout', promotion, tableRow(data.WASHOUT_DAYS, promotion.drug), promotion.drug);
}

for (const promotion of promotions.metabolite || []) {
  const row = (data.METAB?.[promotion.parent] || []).find(item => item.n === promotion.metaboliteName);
  assertRow('metabolite', promotion, row, `${promotion.parent}/${promotion.metaboliteName}`);
}

for (const promotion of promotions.pgx || []) {
  const pair = data.PHARMGKB_EVIDENCE?.[promotion.gene]?.pairs?.find(item => item.drug === promotion.drug);
  const effect = (data.GENOTYPE_METABOLITE_EFFECTS || []).find(item =>
    item.parent === promotion.metaboliteParent &&
    item.enzyme === promotion.metaboliteEnzyme
  );
  assertRow('pgx', promotion, pair, `${promotion.gene}/${promotion.drug}`);
  assertRow('pgx', promotion, effect, `${promotion.metaboliteParent}/${promotion.metaboliteEnzyme}`);
}

for (const promotion of promotions.transporter || []) {
  const row = (data.TRANSPORTER_DDI || []).find(item => transporterKey(item) === transporterKey(promotion));
  assertRow('transporter', promotion, row, `${promotion.substrate}/${promotion.inhibitor}/${promotion.transporter}`);
}

for (const promotion of promotions.burden || []) {
  const table = promotion.table === 'beers' ? data.BEERS_FLAGS : data.PHENOTYPE_SCORES;
  assertRow('burden', promotion, tableRow(table, promotion.drug), `${promotion.table}/${promotion.drug}`);
}

const counts = Object.fromEntries(surfaces.map(surface => [surface, promotions[surface]?.length || 0]));
const minimums = { ddi:7, pk:7, washout:7, metabolite:8, pgx:5, transporter:4, burden:5 };
for (const [surface, minimum] of Object.entries(minimums)) {
  if ((counts[surface] || 0) < minimum) failures.push(`${surface}: expected at least ${minimum} promotions`);
}

const report = {
  ok:failures.length === 0,
  version:diagnostics.version,
  counts,
  totalApplied:diagnostics.totalApplied || 0,
  missingEvidenceRefs:diagnostics.missingEvidenceRefs || [],
  missingTargets:diagnostics.missingTargets || [],
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (check && failures.length) process.exit(1);
