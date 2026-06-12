#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';

const CPIC_TIER = {
  CYP2D6: 25, CYP2C19: 25, CYP2C9: 25,
  DPYD: 25, TPMT: 25, NUDT15: 25,
  UGT1A1: 20, SLCO1B1: 20, 'HLA-B': 20,
  'HLA-A': 18, VKORC1: 20, CYP3A5: 15, CYP3A7: 5,
  CYP2B6: 15, CYP1A2: 12, CYP2E1: 8, NAT2: 10, NAT1: 6,
  ABCG2: 10, ABCB1: 8, GSTM1: 8, GSTT1: 8, GSTP1: 8,
  UGT2B7: 8, CYP3A4: 5, CYP4F2: 5,
  POR: 5, CYP2A6: 5, CYP4A11: 3,
};

const PM_IM_FREQ_EUR = {
  CYP2D6: 0.10, CYP2C19: 0.23, CYP2C9: 0.35,
  DPYD: 0.03, TPMT: 0.10, NUDT15: 0.02,
  UGT1A1: 0.10, SLCO1B1: 0.15, VKORC1: 0.37,
  CYP2B6: 0.20, CYP1A2: 0.55, CYP2E1: 0.10, NAT2: 0.50, NAT1: 0.10,
  CYP3A5: 0.75, CYP3A7: 0.05, ABCG2: 0.10, ABCB1: 0.55,
  'HLA-B': 0.06, 'HLA-A': 0.04, GSTM1: 0.50, GSTT1: 0.20, GSTP1: 0.35,
  UGT2B7: 0.15, CYP3A4: 0.05, CYP4F2: 0.30,
};

const PM_NM_FOLD = {
  CYP2D6: 10.0, CYP2C19: 5.0, CYP2C9: 3.0,
  DPYD: 20.0, TPMT: 15.0, UGT1A1: 4.0,
  SLCO1B1: 3.0, VKORC1: 3.0, CYP2B6: 4.0,
  CYP1A2: 2.5, CYP2E1: 2.0, NAT2: 2.0, NAT1: 1.5, CYP3A5: 2.0, CYP3A7: 1.5,
  ABCB1: 1.5, CYP4F2: 2.0, GSTT1: 1.5, GSTP1: 2.0, 'HLA-B': 0,
};

const TRANSPORTER_TO_GENE = {
  'P-gp': 'ABCB1',
  'P-gp (BBB)': 'ABCB1',
  MDR1: 'ABCB1',
  OATP1B1: 'SLCO1B1',
  BCRP: 'ABCG2',
  OCT2: 'SLC22A2',
  OAT1: 'SLC22A6',
  OAT3: 'SLC22A8',
  MATE1: 'SLC47A1',
};

const GENE_PATTERN = 'CYP(?:[0-9][A-Z][0-9][0-9A-Z]*|[0-9]{2}[A-Z][0-9A-Z]*)|UGT[0-9A-Z]+|NAT[0-9]|TPMT|DPYD|GST[MPT][0-9]|SLCO[0-9A-Z]+|SLC[0-9A-Z]+|ABCB[0-9]|ABCG[0-9]|VKORC1|HLA-[AB]|NUDT15|POR|OPRM1|IFNL[34]|IL28B|HTR[0-9A-Z]+|ADRB[0-9]|DRD2|ALDH2|SCN[0-9]A|KCNH2|COMT|MAO-[AB]|MTHFR|GABRG2';
const GENE_RE = new RegExp(`\\b(${GENE_PATTERN})\\b`, 'g');
const GENE_EXACT_RE = new RegExp(`^(?:${GENE_PATTERN})$`);

const args = parseArgs(process.argv.slice(2));
const root = resolve(new URL('../..', import.meta.url).pathname);
const medcheckSrc = resolve(root, args['medcheck-src'] || './src');
const catalogDir = args['catalog-dir'] ? resolve(process.cwd(), args['catalog-dir']) : null;
const outPath = resolve(root, args.out || 'scripts/audit/genotype-gap-report.json');
const mdPath = resolve(root, args.md || 'scripts/audit/genotype-gap-report.md');
const profilePath = args.profile ? resolve(process.cwd(), args.profile) : null;
const openTargetsSnapshotPath = args['open-targets-snapshot']
  ? resolve(process.cwd(), args['open-targets-snapshot'])
  : resolve(root, 'src/data/generatedOpenTargetsSnapshot.js');
const dryRun = Boolean(args['dry-run']);

main();

function main() {
  try {
    log('Reading MedCheck Engine src...');
    const medcheck = readMedcheck(medcheckSrc);
    log('Reading optional external PGx catalog...');
    const catalog = readCatalog(catalogDir);
    log('Reading optional Open Targets/ClinPGx snapshot...');
    const openTargets = readOpenTargetsSnapshot(openTargetsSnapshotPath);
    log('Scoring gaps...');
    const report = buildReport(medcheck, catalog, profilePath, openTargets);
    log('Writing report...');
    if (!dryRun) {
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      writeFileSync(mdPath, markdown(report), 'utf8');
    }
    process.stdout.write(`${JSON.stringify({
      genotypePanel: report.genotypePanel.length,
      referencedGenes: report.allReferencedGenes.length,
      missingFromPanel: report.gapAnalysis.missingFromPanel.length,
      critical: report.gapAnalysis.missingFromPanel.filter((g) => g.nullImpactClass === 'CRITICAL').length,
      high: report.gapAnalysis.missingFromPanel.filter((g) => g.nullImpactClass === 'HIGH').length,
      catalogGenes: report.catalogSummary.totalGenes,
      openTargetsClinPgxPairs: report.openTargetsClinPgx.coveredPairs.length + report.openTargetsClinPgx.missingHighEvidencePairs.length,
      openTargetsUnsupportedGenes: report.openTargetsClinPgx.unsupportedGenes.length,
      wrote: dryRun ? null : { json: outPath, markdown: mdPath },
    }, null, 2)}\n`);
  } catch (err) {
    console.error(err?.stack || String(err));
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    if (key === 'dry-run') {
      parsed[key] = true;
    } else {
      parsed[key] = argv[i + 1];
      i += 1;
    }
  }
  return parsed;
}

function readMedcheck(srcDir) {
  const files = {
    constants: readOptional(join(srcDir, 'data/constants.js')),
    rules: readOptional(join(srcDir, 'data/rules.js')),
    enzymes: readOptional(join(srcDir, 'data/enzymes.js')),
    drugs: readOptional(join(srcDir, 'data/drugs.js')),
    interactions: readOptional(join(srcDir, 'data/interactions.js')),
    evidence: readOptional(join(srcDir, 'data/evidence.js')),
    transporters: readOptional(join(srcDir, 'data/transporters.js')),
    receptors: readOptional(join(srcDir, 'data/pharmacology.js')),
    metabolites: readOptional(join(srcDir, 'data/metabolites.js')),
  };

  const found = new Map();
  const drugRefs = new Map();
  const severity = new Map();

  const genotypePanel = new Set([
    ...objectKeys(files.constants, 'GENOTYPE_EFFECTS'),
  ]);
  const metaboliteRuleGenes = new Set(genotypeMetaboliteGenes(files.rules));
  const warningCardGenes = new Set([
    ...riskEffectGenes(files.constants),
    ...objectKeys(files.enzymes, 'PHARMGKB_EVIDENCE'),
  ]);
  const riskEffects = objectKeys(files.constants, 'GENOTYPE_RISK_EFFECTS');
  for (const riskKey of riskEffects) {
    const gene = riskKey.match(/^HLA-[AB]/)?.[0] || riskKey;
    genotypePanel.add(gene);
    warningCardGenes.add(gene);
    addFound(found, gene, 'GENOTYPE_RISK_EFFECTS');
  }
  for (const gene of riskEffectGenes(files.constants)) {
    genotypePanel.add(gene);
    addFound(found, gene, 'GENOTYPE_RISK_EFFECTS');
  }

  for (const gene of genotypePanel) addFound(found, gene, 'GENOTYPE_EFFECTS');
  for (const gene of objectKeys(files.enzymes, 'ENZYME_ACTORS')) addFound(found, gene, 'ENZYME_ACTORS');
  for (const gene of arrayValues(files.enzymes, 'GENE_ENZYMES')) addFound(found, gene, 'GENE_ENZYMES');
  for (const gene of genesFromTransporterActors(files.transporters)) addFound(found, gene, 'TRANSPORTER_ACTORS');

  scanGenes(files.drugs, 'DRUG_DB', found);
  scanGenes(files.interactions, 'KNOWN_DDI', found);
  scanGenes(files.evidence, 'STUDY_DB', found);
  scanGenes(files.transporters, 'TRANSPORTER_DDI', found);
  scanGenes(files.receptors, 'RECEPTOR_SCORES', found);
  scanGenes(files.metabolites, 'METABOLITE_ACTORS', found);

  for (const { gene, drug } of routeDrugPairs(files.drugs)) {
    addFound(found, gene, 'DRUG_DB');
    addDrug(drugRefs, gene, drug);
  }
  for (const { gene, drugA, drugB, sev } of ddiPairs(files.interactions)) {
    addFound(found, gene, 'KNOWN_DDI');
    if (drugA) addDrug(drugRefs, gene, drugA);
    if (drugB) addDrug(drugRefs, gene, drugB);
    if (sev) addSeverity(severity, gene, sev);
  }
  for (const { gene, substrate, inhibitor, sev } of transporterPairs(files.transporters)) {
    addFound(found, gene, 'TRANSPORTER_DDI');
    if (substrate) addDrug(drugRefs, gene, substrate);
    if (inhibitor) addDrug(drugRefs, gene, inhibitor);
    if (sev) addSeverity(severity, gene, sev);
  }

  const allReferencedGenes = new Set([...found.keys()].filter(isGeneLike));
  const missingFromPanel = [...allReferencedGenes].filter((gene) => !genotypePanel.has(gene));

  return {
    version: readPackageVersion(),
    genotypePanel,
    allReferencedGenes,
    missingFromPanel,
    found,
    drugRefs,
    severity,
    metaboliteRuleGenes,
    warningCardGenes,
  };
}

function readCatalog(baseDir) {
  const empty = { genes: new Set(), byGene: new Map(), note: 'No external PGx catalog directory supplied.' };
  if (!baseDir) return empty;
  const studiesDir = join(baseDir, 'data/pgx/studies');
  if (!existsSync(studiesDir)) return { ...empty, note: `External PGx catalog studies directory not found: ${studiesDir}` };

  const byGene = new Map();
  for (const file of readdirSync(studiesDir).filter((name) => name.endsWith('.json'))) {
    try {
      const study = JSON.parse(readFileSync(join(studiesDir, file), 'utf8'));
      const gene = normalizeGene(study.gene || study?.variant?.gene);
      if (!gene) continue;
      if (!byGene.has(gene)) {
        byGene.set(gene, { studies: 0, drugs: new Set(), evidence: new Set(), categories: new Set(), pmids: new Set(), snps: new Set() });
      }
      const row = byGene.get(gene);
      row.studies += 1;
      for (const drug of asArray(study.drugs || study.drug)) row.drugs.add(String(drug));
      if (study.evidence_level) row.evidence.add(String(study.evidence_level));
      if (study.category) row.categories.add(String(study.category));
      if (study?.source?.pmid) row.pmids.add(String(study.source.pmid));
      for (const snp of asArray(study.snps)) {
        if (snp?.rsid) row.snps.add(String(snp.rsid));
        for (const interpretation of Object.keys(snp?.interpretations || {})) row.snps.add(`${snp?.rsid || 'snp'}:${interpretation}`);
      }
    } catch (err) {
      console.error(`Could not parse external PGx catalog study ${file}: ${err.message}`);
    }
  }
  return { genes: new Set(byGene.keys()), byGene, note: null };
}

function readOpenTargetsSnapshot(snapshotPath) {
  const empty = {
    enabled: false,
    path: snapshotPath,
    release: null,
    summary: null,
    pairs: [],
    note: snapshotPath ? `Open Targets snapshot not found: ${snapshotPath}` : 'No Open Targets snapshot supplied.',
  };
  if (!snapshotPath || !existsSync(snapshotPath)) return empty;
  try {
    const text = readFileSync(snapshotPath, 'utf8');
    const match = text.match(/const\s+GENERATED_OPEN_TARGETS_SNAPSHOT\s*=\s*Object\.freeze\(([\s\S]*?)\);\s*$/);
    if (!match) return { ...empty, note: 'Could not find GENERATED_OPEN_TARGETS_SNAPSHOT in snapshot file.' };
    const snapshot = JSON.parse(match[1]);
    const crosswalkByChembl = new Map();
    for (const row of snapshot.crosswalk || []) {
      if (!row.chemblId) continue;
      const list = crosswalkByChembl.get(row.chemblId) || [];
      list.push(row);
      crosswalkByChembl.set(row.chemblId, list);
    }
    const pairs = [];
    for (const facts of Object.values(snapshot.contextByChemblId || {})) {
      for (const fact of facts || []) {
        if (!isOpenTargetsClinPgxFact(fact)) continue;
        const gene = normalizeGene(fact.targetGene || extractFirstGene(fact.label) || extractFirstGene(fact.riskMarker));
        if (!gene) continue;
        const mappedRows = crosswalkByChembl.get(fact.chemblId) || [];
        for (const row of mappedRows.length ? mappedRows : [{ medcheckName: null, medcheckId: null }]) {
          pairs.push({
            gene,
            drug: row.medcheckName || fact.chemblId,
            medcheckId: row.medcheckId || null,
            chemblId: fact.chemblId,
            openTargetsDrugId: fact.openTargetsDrugId || fact.chemblId,
            sourceEvidenceLevel: fact.sourceEvidenceLevel || null,
            drugResponseCategory: fact.drugResponseCategory || null,
            riskMarker: fact.riskMarker || null,
            label: fact.label || null,
            source: fact.source || 'Open Targets',
            openTargetsRelease: fact.openTargetsRelease || snapshot.release || null,
            openTargetsSourceDataset: fact.openTargetsSourceDataset || fact.factType || null,
          });
        }
      }
    }
    return {
      enabled: true,
      path: snapshotPath,
      release: snapshot.release || snapshot.summary?.release || null,
      summary: snapshot.summary || null,
      pairs,
      note: null,
    };
  } catch (err) {
    return { ...empty, note: `Could not parse Open Targets snapshot: ${err.message}` };
  }
}

function isOpenTargetsClinPgxFact(fact) {
  const text = `${fact?.factType || ''} ${fact?.openTargetsSourceDataset || ''} ${fact?.source || ''} ${fact?.label || ''}`.toLowerCase();
  return /pharmacogen|clinpgx|pharmgkb|drug response|star allele/.test(text);
}

function extractFirstGene(value) {
  const match = String(value || '').match(GENE_RE);
  return match ? normalizeGene(match[0]) : '';
}

function buildOpenTargetsClinPgx(medcheck, openTargets) {
  const rows = (openTargets.pairs || []).map((pair) => {
    const hasGenotypeSelector = medcheck.genotypePanel.has(pair.gene);
    const hasMetaboliteRule = medcheck.metaboliteRuleGenes.has(pair.gene);
    const hasWarningCard = medcheck.warningCardGenes.has(pair.gene);
    const highEvidence = isHighOpenTargetsEvidence(pair.sourceEvidenceLevel, pair.label);
    return {
      ...pair,
      hasGenotypeSelector,
      hasMetaboliteRule,
      hasWarningCard,
      sourceEvidenceLevel: pair.sourceEvidenceLevel || 'not_specified',
      highEvidence,
    };
  }).sort((a, b) => a.gene.localeCompare(b.gene) || String(a.drug).localeCompare(String(b.drug)));

  const coveredPairs = rows.filter(row => row.hasGenotypeSelector || row.hasMetaboliteRule || row.hasWarningCard);
  const missingHighEvidencePairs = rows.filter(row =>
    row.highEvidence &&
    !row.hasGenotypeSelector &&
    !row.hasMetaboliteRule &&
    !row.hasWarningCard
  );
  const unsupportedGenes = [...new Set(rows
    .filter(row => !row.hasGenotypeSelector)
    .map(row => row.gene))]
    .sort()
    .map(gene => ({
      gene,
      pairCount: rows.filter(row => row.gene === gene).length,
      highEvidencePairCount: rows.filter(row => row.gene === gene && row.highEvidence).length,
      hasMetaboliteRule: medcheck.metaboliteRuleGenes.has(gene),
      hasWarningCard: medcheck.warningCardGenes.has(gene),
    }));
  const unsupportedRiskMarkers = rows
    .filter(row => row.riskMarker && !row.hasWarningCard && !row.hasMetaboliteRule)
    .map(row => ({
      gene: row.gene,
      drug: row.drug,
      riskMarker: row.riskMarker,
      sourceEvidenceLevel: row.sourceEvidenceLevel,
      hasGenotypeSelector: row.hasGenotypeSelector,
      hasMetaboliteRule: row.hasMetaboliteRule,
      hasWarningCard: row.hasWarningCard,
    }));

  return {
    enabled: openTargets.enabled,
    note: openTargets.note,
    snapshotPath: openTargets.path,
    release: openTargets.release,
    sourceSummary: openTargets.summary,
    coveredPairs,
    missingHighEvidencePairs,
    unsupportedGenes,
    unsupportedRiskMarkers,
  };
}

function isHighOpenTargetsEvidence(level, label) {
  return /(^|[^a-z0-9])(1a|1b|level\s*1|high|strong|guideline|cpic|fda|clinical annotation)([^a-z0-9]|$)/i.test(`${level || ''} ${label || ''}`);
}

function buildReport(medcheck, catalog, profilePathArg, openTargets) {
  const covered = [...medcheck.genotypePanel].sort();
  const missing = medcheck.missingFromPanel
    .map((gene) => decorateGap(gene, medcheck, catalog, classFor(gene, medcheck, catalog)))
    .sort(sortGap);

  const absent = [...catalog.genes]
    .filter((gene) => !medcheck.allReferencedGenes.has(gene))
    .map((gene) => decorateGap(gene, medcheck, catalog, 'CLASS_C'))
    .sort(sortGap);

  const profile = buildProfile(profilePathArg, [...missing, ...absent]);
  const openTargetsClinPgx = buildOpenTargetsClinPgx(medcheck, openTargets);

  return {
    generated: new Date().toISOString(),
    medcheckVersion: medcheck.version,
    genotypePanel: covered,
    allReferencedGenes: [...medcheck.allReferencedGenes].sort(),
    gapAnalysis: {
      missingFromPanel: missing,
      absentFromMedCheck: absent,
      covered,
    },
    catalogSummary: {
      note: catalog.note,
      totalGenes: catalog.genes.size,
      classA: [...catalog.genes].filter((gene) => medcheck.genotypePanel.has(gene)).length,
      classB: [...catalog.genes].filter((gene) => medcheck.allReferencedGenes.has(gene) && !medcheck.genotypePanel.has(gene)).length,
      classC: [...catalog.genes].filter((gene) => !medcheck.allReferencedGenes.has(gene)).length,
      topPriorityClassC: absent.filter((g) => g.nullImpactClass === 'CRITICAL' || g.nullImpactClass === 'HIGH').slice(0, 10).map((g) => g.gene),
    },
    openTargetsClinPgx,
    personalProfile: profile,
  };
}

function decorateGap(gene, medcheck, catalog, catalogClass) {
  const open = catalog.byGene.get(gene);
  const drugs = new Set([...(medcheck.drugRefs.get(gene) || []), ...(open?.drugs || [])]);
  const breakdown = scoreBreakdown(gene, drugs.size, medcheck.severity.get(gene));
  const nullImpactScore = Math.min(100, Math.round(Object.values(breakdown).reduce((sum, value) => sum + value, 0)));
  return {
    gene,
    foundIn: [...(medcheck.found.get(gene) || [])].sort(),
    catalogClass,
    catalogDrugs: [...(open?.drugs || [])].sort(),
    catalogEvidenceLevel: bestEvidence(open?.evidence),
    catalogStudyCount: open?.studies || 0,
    catalogSnpCount: open?.snps?.size || 0,
    drugsAffected: [...drugs].sort(),
    nullImpactScore,
    nullImpactClass: impactClass(nullImpactScore),
    scoreBreakdown: breakdown,
    recommendation: recommendation(gene, catalogClass, nullImpactScore, open?.studies || 0),
  };
}

function scoreBreakdown(gene, drugCount, worstSeverity) {
  const fold = gene.startsWith('HLA-') ? 20 : (PM_NM_FOLD[gene] ?? 1.0);
  return {
    cpicTier: CPIC_TIER[gene] ?? 3,
    drugCount: Math.min(15, drugCount * 3),
    afrequency: Math.round(((PM_IM_FREQ_EUR[gene] ?? 0.05) * 20) * 10) / 10,
    safetyClass: safetyScore(worstSeverity),
    genotypeVariance: Math.min(10, Math.round((fold / 20 * 10) * 10) / 10),
  };
}

function recommendation(gene, catalogClass, score, studyCount) {
  if (catalogClass === 'CLASS_C') {
    return `${gene} is absent from MedCheck Engine. Consider adding source data before a genotype panel if it remains high priority (${score}); external catalog studies available: ${studyCount}.`;
  }
  if (score >= 70) return `Add a genotype panel for ${gene} in the next genotype expansion pass; the null impact is critical.`;
  if (score >= 45) return `Plan a ${gene} genotype panel after critical gaps; enough MedCheck Engine logic references it that missing personalization may matter.`;
  if (score >= 20) return `Track ${gene}; add a panel when adding more drug-specific evidence.`;
  return `Document ${gene}; current modeled impact appears low.`;
}

function markdown(report) {
  const critical = report.gapAnalysis.missingFromPanel.filter((g) => g.nullImpactClass === 'CRITICAL');
  const high = report.gapAnalysis.missingFromPanel.filter((g) => g.nullImpactClass === 'HIGH');
  const rest = report.gapAnalysis.missingFromPanel.filter((g) => g.nullImpactClass !== 'CRITICAL' && g.nullImpactClass !== 'HIGH');
  const openOnly = report.gapAnalysis.absentFromMedCheck.filter((g) => g.nullImpactScore >= 20).slice(0, 50);
  const ot = report.openTargetsClinPgx;
  return `# Genotype Gap Audit

Generated: ${report.generated}

## Executive Summary

- Genotype panel genes: ${report.genotypePanel.length}
- Referenced MedCheck Engine genes: ${report.allReferencedGenes.length}
- Missing panel genes: ${report.gapAnalysis.missingFromPanel.length}
- Critical gaps: ${critical.length}
- High gaps: ${high.length}
- External catalog genes read: ${report.catalogSummary.totalGenes}${report.catalogSummary.note ? `\n- External catalog note: ${report.catalogSummary.note}` : ''}
- Open Targets/ClinPGx covered pairs: ${ot.coveredPairs.length}
- Open Targets/ClinPGx missing high-evidence pairs: ${ot.missingHighEvidencePairs.length}
- Open Targets/ClinPGx unsupported genes: ${ot.unsupportedGenes.length}${ot.note ? `\n- Open Targets/ClinPGx note: ${ot.note}` : ''}

## Critical Gaps

${table(critical)}

## High Gaps

${table(high)}

## Moderate / Low Gaps

${rest.length ? rest.map((g) => `- ${g.gene}: ${g.nullImpactClass} (${g.nullImpactScore}) — ${g.foundIn.join(', ') || 'source-only reference'}`).join('\n') : 'None.'}

## External-Catalog-Only Genes

Genes in the optional external PGx catalog but absent from MedCheck Engine, sorted by impact score.

${table(openOnly)}

## Open Targets / ClinPGx Gap Audit

This section reads the local generated Open Targets snapshot when available. It is audit-only; Open Targets-derived PGx facts remain context until reviewed.

Snapshot release: ${ot.release || 'not specified'}

### Covered PGx Pairs

${openTargetsPairTable(ot.coveredPairs)}

### Missing High-Evidence PGx Pairs

${openTargetsPairTable(ot.missingHighEvidencePairs)}

### Unsupported Genes

${ot.unsupportedGenes.length ? ot.unsupportedGenes.map((row) => `- ${row.gene}: ${row.pairCount} pair(s), ${row.highEvidencePairCount} high-evidence; metabolite rule: ${row.hasMetaboliteRule ? 'yes' : 'no'}; warning card: ${row.hasWarningCard ? 'yes' : 'no'}`).join('\n') : 'None.'}

### Unsupported Risk Markers

${ot.unsupportedRiskMarkers.length ? ot.unsupportedRiskMarkers.map((row) => `- ${row.gene} / ${row.drug}: ${row.riskMarker} (${row.sourceEvidenceLevel})`).join('\n') : 'None.'}

## Covered Genes

${report.gapAnalysis.covered.join(', ')}

No third-party catalog data is bundled in Diognosis by this audit script. If a local external catalog is supplied, its metadata is used only for local prioritization unless manually reviewed and imported.
`;
}

function openTargetsPairTable(rows) {
  if (!rows.length) return 'None.';
  const head = '| Gene | Drug | Evidence | Selector | Metabolite Rule | Warning Card | Marker |\n|---|---|---|---|---|---|---|';
  const body = rows.slice(0, 60).map((row) => `| ${row.gene} | ${row.drug || '-'} | ${row.sourceEvidenceLevel || '-'} | ${row.hasGenotypeSelector ? 'yes' : 'no'} | ${row.hasMetaboliteRule ? 'yes' : 'no'} | ${row.hasWarningCard ? 'yes' : 'no'} | ${row.riskMarker || '-'} |`);
  return [head, ...body].join('\n');
}

function table(rows) {
  if (!rows.length) return 'None.';
  const head = '| Gene | In MedCheck Engine? | CPIC Tier | Impact Score | Drugs Affected | External Studies Available |\n|---|---|---:|---:|---|---:|';
  const body = rows.map((g) => `| ${g.gene} | ${g.catalogClass === 'CLASS_C' ? 'No' : 'Yes'} | ${g.scoreBreakdown.cpicTier} | ${g.nullImpactScore} | ${g.drugsAffected.slice(0, 8).join(', ') || '-'}${g.drugsAffected.length > 8 ? ', ...' : ''} | ${g.catalogStudyCount} |`);
  return [head, ...body].join('\n');
}

function classFor(gene, medcheck, catalog) {
  if (catalog.genes.has(gene) && medcheck.genotypePanel.has(gene)) return 'CLASS_A';
  if (catalog.genes.has(gene) && medcheck.allReferencedGenes.has(gene)) return 'CLASS_B';
  if (catalog.genes.has(gene)) return 'CLASS_C';
  return 'MEDCHECK_ONLY';
}

function impactClass(score) {
  if (score >= 70) return 'CRITICAL';
  if (score >= 45) return 'HIGH';
  if (score >= 20) return 'MODERATE';
  return 'LOW';
}

function sortGap(a, b) {
  return b.nullImpactScore - a.nullImpactScore || a.gene.localeCompare(b.gene);
}

function safetyScore(sev) {
  if (sev === 'nti' || sev === 'critical') return 15;
  if (sev === 'severe' || sev === 'high') return 10;
  if (sev === 'moderate') return 5;
  return 0;
}

function addSeverity(map, gene, sev) {
  const current = safetyScore(map.get(gene));
  if (safetyScore(sev) > current) map.set(gene, sev);
}

function bestEvidence(evidenceSet) {
  if (!evidenceSet || !evidenceSet.size) return null;
  const order = ['established', 'high', 'moderate', 'low'];
  const values = [...evidenceSet];
  return order.find((needle) => values.some((value) => value.toLowerCase().includes(needle))) || values.sort()[0];
}

function buildProfile(profilePathArg, gaps) {
  const base = {
    note: 'Optional section — provide --profile with gene=phenotype JSON to score personal impact.',
    genes: {},
  };
  if (!profilePathArg) return base;
  try {
    const profile = JSON.parse(readFileSync(profilePathArg, 'utf8'));
    for (const gap of gaps) {
      const phenotype = profile[gap.gene];
      if (!phenotype || phenotype === 'NM' || phenotype === 'normal_metabolizer') continue;
      base.genes[gap.gene] = {
        phenotype,
        message: phenotype === 'unknown'
          ? 'genotype unknown — gap prevents personalized prediction'
          : 'YOU ARE AFFECTED BY THIS GAP — your non-NM phenotype is not modeled in MedCheck Engine for this gene',
        drugsAffected: gap.drugsAffected,
        estimatedFold: PM_NM_FOLD[gap.gene] ?? 1.0,
      };
    }
  } catch (err) {
    base.note = `Could not read profile: ${err.message}`;
  }
  return base;
}

function readPackageVersion() {
  try {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
    return pkg.version || null;
  } catch {
    return null;
  }
}

function objectKeys(text, name) {
  const body = balancedObjectBody(text, name);
  if (!body) return [];
  const keys = new Set();
  const re = /(?:^|[\n,{]\s*)(?:['"]([A-Za-z0-9:*_-]+)['"]|([A-Za-z][A-Za-z0-9_-]*))\s*:/g;
  let match;
  while ((match = re.exec(body))) keys.add(normalizeGene(match[1] || match[2]));
  return [...keys].filter(isGeneLike);
}

function riskEffectGenes(text) {
  const body = balancedObjectBody(text, 'GENOTYPE_RISK_EFFECTS');
  if (!body) return [];
  return [...body.matchAll(/\bgene\s*:\s*['"]([A-Z0-9-]+)['"]/g)]
    .map((m) => normalizeGene(m[1]))
    .filter(isGeneLike);
}

function genotypeMetaboliteGenes(text) {
  const body = balancedArrayBody(text, 'GENOTYPE_METABOLITE_EFFECTS');
  if (!body) return [];
  return [...new Set((body.match(GENE_RE) || []).map(normalizeGene).filter(isGeneLike))];
}

function arrayValues(text, name) {
  const match = text.match(new RegExp(`const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
  if (!match) return [];
  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => normalizeGene(m[1])).filter(isGeneLike);
}

function balancedObjectBody(text, name) {
  const idx = text.indexOf(name);
  if (idx < 0) return null;
  const start = text.indexOf('{', idx);
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return text.slice(start + 1, i);
  }
  return null;
}

function balancedArrayBody(text, name) {
  const idx = text.indexOf(name);
  if (idx < 0) return null;
  const start = text.indexOf('[', idx);
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (char === '[') depth += 1;
    if (char === ']') depth -= 1;
    if (depth === 0) return text.slice(start + 1, i);
  }
  return null;
}

function scanGenes(text, source, found) {
  for (const raw of text.match(GENE_RE) || []) addFound(found, normalizeGene(raw), source);
  for (const [name, gene] of Object.entries(TRANSPORTER_TO_GENE)) {
    if (text.includes(name)) addFound(found, gene, source);
  }
}

function genesFromTransporterActors(text) {
  const genes = new Set();
  for (const match of text.matchAll(/gene\s*:\s*['"]([^'"]+)['"]/g)) genes.add(normalizeGene(match[1]));
  return [...genes].filter(isGeneLike);
}

function routeDrugPairs(text) {
  const rows = [];
  const drugRe = /\{id\s*:\s*(["']).*?\1\s*,\s*name\s*:\s*(["'])(.*?)\2[\s\S]*?(?=\n\{id\s*:|\nconst MEDCHECK_VERSION|$)/g;
  let drug;
  while ((drug = drugRe.exec(text))) {
    const block = drug[0];
    const drugName = drug[3];
    for (const raw of block.match(GENE_RE) || []) rows.push({ gene: normalizeGene(raw), drug: drugName });
    for (const enzyme of [...block.matchAll(/enzyme\s*:\s*["']([^"']+)["']/g)].map((m) => m[1])) {
      rows.push({ gene: normalizeGene(TRANSPORTER_TO_GENE[enzyme] || enzyme), drug: drugName });
    }
    if (/narrow therapeutic index|NTI/i.test(block)) {
      for (const raw of block.match(GENE_RE) || []) rows.push({ gene: normalizeGene(raw), drug: drugName, nti: true });
    }
  }
  return rows.filter((row) => isGeneLike(row.gene));
}

function ddiPairs(text) {
  const rows = [];
  for (const match of text.matchAll(/\{drug1\s*:\s*(["'])(.*?)\1\s*,\s*drug2\s*:\s*(["'])(.*?)\3[\s\S]*?\},?/g)) {
    const block = match[0];
    const sev = block.match(/severity\s*:\s*["']([^"']+)["']/)?.[1];
    const genes = new Set((block.match(GENE_RE) || []).map(normalizeGene));
    for (const enzyme of [...block.matchAll(/enzyme\s*:\s*["']([^"']+)["']/g)].map((m) => m[1])) genes.add(normalizeGene(TRANSPORTER_TO_GENE[enzyme] || enzyme));
    for (const gene of genes) if (isGeneLike(gene)) rows.push({ gene, drugA: match[2], drugB: match[4], sev });
  }
  return rows;
}

function transporterPairs(text) {
  const rows = [];
  for (const match of text.matchAll(/\{substrate\s*:\s*(["'])(.*?)\1\s*,\s*inhibitor\s*:\s*(["'])(.*?)\3[\s\S]*?\},?/g)) {
    const block = match[0];
    const sev = block.match(/severity\s*:\s*["']([^"']+)["']/)?.[1];
    const transporters = block.match(/transporter\s*:\s*["']([^"']+)["']/)?.[1] || '';
    const genes = new Set((block.match(GENE_RE) || []).map(normalizeGene));
    for (const part of transporters.split('/')) genes.add(normalizeGene(TRANSPORTER_TO_GENE[part.trim()] || part.trim()));
    for (const gene of genes) if (isGeneLike(gene)) rows.push({ gene, substrate: match[2], inhibitor: match[4], sev });
  }
  return rows;
}

function addFound(map, rawGene, source) {
  const gene = normalizeGene(rawGene);
  if (!isGeneLike(gene)) return;
  if (!map.has(gene)) map.set(gene, new Set());
  map.get(gene).add(source);
}

function addDrug(map, rawGene, drug) {
  const gene = normalizeGene(rawGene);
  if (!isGeneLike(gene) || !drug) return;
  if (!map.has(gene)) map.set(gene, new Set());
  map.get(gene).add(drug);
}

function normalizeGene(gene) {
  if (!gene) return '';
  const trimmed = String(gene).trim();
  if (TRANSPORTER_TO_GENE[trimmed]) return TRANSPORTER_TO_GENE[trimmed];
  return trimmed.toUpperCase().replace(/^HLA-([AB])\*.*/, 'HLA-$1');
}

function isGeneLike(gene) {
  return Boolean(gene && GENE_EXACT_RE.test(gene));
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function readOptional(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

function log(message) {
  console.error(message);
}
