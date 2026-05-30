#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import vm from 'vm';
import { collectStats } from './collect-stats.js';

const root = resolve(new URL('..', import.meta.url).pathname);
const files = [
  'src/data/constants.js',
  'src/data/rules.js',
  'src/data/drugs.js',
  'src/data/enzymes.js',
  'src/data/metabolites.js',
  'src/data/transporters.js',
  'src/data/actors.js',
  'src/data/pharmacology.js',
  'src/data/evidence.js',
  'src/data/interactions.js',
];

const code = `${files.map((file) => readFileSync(resolve(root, file), 'utf8')).join('\n')}
JSON.stringify((() => {
  const highTiers = new Set([
    EVIDENCE_TIER.FDA_LABEL,
    EVIDENCE_TIER.GUIDELINE,
    EVIDENCE_TIER.RCT,
    EVIDENCE_TIER.META_ANALYSIS,
    EVIDENCE_TIER.CLINICAL_PK,
  ]);
  function evidenceProfile(ddi) {
    const refs = ddi.evidenceRefs || [];
    const studies = refs.map((id) => STUDY_DB[id]).filter(Boolean);
    const sourceText = ((ddi.evidence?.sources || []).join(' ') + ' ' + (ddi.evidence?.confidence || '')).toLowerCase();
    const hasHighTierStudy = studies.some((study) => highTiers.has(study.type));
    const hasQuantifiedClinicalPk = studies.some((study) =>
      study.type === EVIDENCE_TIER.CLINICAL_PK &&
      study.quantifiedEffects &&
      (study.quantifiedEffects.aucFold || study.quantifiedEffects.clearanceReductionPct || study.quantifiedEffects.oddsRatio)
    );
    const hasStrongInline = /fda|label|cpic|guideline|clinical pk|meta-analysis|rct/.test(sourceText) && ddi.evidence?.confidence === 'high';
    return {
      refs,
      studies: studies.map((study) => ({ id: study.id, type: study.type, pmid: study.pmid || null, doi: study.doi || null })),
      hasHighTierStudy,
      hasQuantifiedClinicalPk,
      hasStrongInline,
      missingRefs: refs.filter((id) => !STUDY_DB[id]),
    };
  }
  return KNOWN_DDI.map((ddi) => {
    const profile = evidenceProfile(ddi);
    let recommended = ddi.severity;
    let rationale = 'Kept original severity.';
    if (ddi.severity === 'severe' && !(profile.hasHighTierStudy || profile.hasQuantifiedClinicalPk || profile.hasStrongInline)) {
      recommended = 'moderate';
      rationale = 'Severe requires FDA label, guideline, RCT, meta-analysis, quantified clinical PK, or high-confidence inline regulatory/guideline support.';
    } else if (ddi.severity === 'severe') {
      rationale = 'Severe support threshold met.';
    }
    return {
      drug1: ddi.drug1,
      drug2: ddi.drug2,
      category: ddi.category,
      oldSeverity: ddi.severity,
      recommendedSeverity: recommended,
      changed: ddi.severity !== recommended,
      rationale,
      evidence: profile,
    };
  });
})())`;

const rows = JSON.parse(vm.runInNewContext(code, { console }));
const stats = collectStats();
const changed = rows.filter((row) => row.changed);
const severeAfter = rows.filter((row) => row.recommendedSeverity === 'severe').length;

const lines = [
  '# MedCheck Severity Report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  `Known DDI pairs: ${rows.length}`,
  `Original severe: ${stats.severeDdi}`,
  `Recommended severe: ${severeAfter}`,
  `Recommended downgrades: ${changed.length}`,
  '',
  '| Pair | Category | Old | Recommended | Evidence | Rationale |',
  '|---|---:|---:|---:|---|---|',
];

for (const row of rows) {
  const evidence = row.evidence.studies.length
    ? row.evidence.studies.map((study) => `${study.id} (${study.type}${study.pmid ? ` PMID:${study.pmid}` : ''}${study.doi ? ` DOI:${study.doi}` : ''})`).join('<br>')
    : (row.evidence.hasStrongInline ? 'High-confidence inline regulatory/guideline source' : 'No linked high-tier source');
  lines.push(`| ${row.drug1} + ${row.drug2} | ${row.category} | ${row.oldSeverity} | ${row.recommendedSeverity} | ${evidence} | ${row.rationale} |`);
}

writeFileSync(resolve(root, 'scripts/severity-report.md'), `${lines.join('\n')}\n`, 'utf8');
writeFileSync(resolve(root, 'scripts/severity-report.json'), `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
console.log(`Severity report written: ${changed.length} recommended downgrades, ${severeAfter} severe remain.`);
