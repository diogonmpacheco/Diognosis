#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const SRC = resolve(ROOT, 'src');
const OUT = resolve(ROOT, 'scripts/audit/mechanistic-curation-gaps.md');

const MODULES = [
  'data/constants.js',
  'data/rules.js',
  'data/drugs.js',
  'data/enzymes.js',
  'data/metabolites.js',
  'data/transporters.js',
  'data/actors.js',
  'data/pharmacology.js',
  'data/evidence.js',
  'data/interactions.js',
];

const source = MODULES
  .map(rel => readFileSync(resolve(SRC, rel), 'utf8'))
  .join('\n\n') + `

const geneSet = new Set([
  "CYP2D6","CYP2C19","CYP2C9","CYP3A5","CYP2B6","UGT1A1",
  "DPYD","TPMT","NUDT15","SLCO1B1","ABCG2","ABCB1","NAT2",
  "G6PD","BCHE"
]);

function knownPair(a, b, pathway) {
  const pa = String(a || "").toLowerCase();
  const pb = String(b || "").toLowerCase();
  const pw = String(pathway || "").toLowerCase();
  const inKnownDdi = (KNOWN_DDI || []).some(ddi => {
    const d1 = String(ddi.drug1 || "").toLowerCase();
    const d2 = String(ddi.drug2 || "").toLowerCase();
    const samePair = (d1 === pa && d2 === pb) || (d1 === pb && d2 === pa);
    if (!samePair) return false;
    return true;
  });
  if (inKnownDdi) return true;

  return Object.values(STUDY_DB || {}).some(study => {
    const evidenceText = [
      study.title,
      study.source,
      study.journal,
      study.quantifiedEffects?.note,
      ...(study.supports || []),
    ].join(" ").toLowerCase();
    return evidenceText.includes(pa) && evidenceText.includes(pb);
  });
}

function modStrengthValue(strength) {
  if (strength === "strong") return 3;
  if (strength === "moderate") return 2;
  if (strength === "weak") return 1;
  return 1;
}

function routeFraction(route) {
  return Number.isFinite(route && route.fraction) ? route.fraction : 0.25;
}

function riskWords(text) {
  return /toxic|toxicity|cytotoxic|nephrotoxic|hepatotoxic|myelosuppression|hemolysis|methemoglobin|qt|arrhythm|bleed|respiratory depression|apnea|paralysis|narrow|contraindicat|avoid/i.test(text || "");
}

function drugByName(name) {
  return (DRUG_DB || []).find(drug => drug.name === name);
}

function metaboliteActivityScore(met) {
  const text = [met.n, met.a, met.role, met.note].join(" ");
  if (riskWords(text) || met.a === "toxic" || met.role === "toxic_form") return 35;
  if (met.a === "active" || met.a === "active_form" || met.role === "active_form" || /active|potent/i.test(text)) return 25;
  return 0;
}

function actorForMetabolite(metName) {
  const id = metaboliteId(metName);
  return Object.values(METABOLITE_ACTORS || {}).find(actor =>
    actor.id === id || actor.name === metName || textIncludesMetabolite(actor.name, metName)
  );
}

function metaboliteModifiers(met) {
  const actor = actorForMetabolite(met.n);
  const raw = [
    ...((met.inh || []).map(mod => ({ mode:"inhibition", target:mod.e || mod.target, strength:mod.s || mod.strength || "modeled", source:"METAB" }))),
    ...((met.ind || []).map(mod => ({ mode:"induction", target:mod.e || mod.target, strength:mod.s || mod.strength || "modeled", source:"METAB" }))),
    ...((actor?.inh || []).map(mod => ({ mode:"inhibition", target:mod.e || mod.target, strength:mod.s || mod.strength || "modeled", source:"METABOLITE_ACTORS" }))),
    ...((actor?.ind || []).map(mod => ({ mode:"induction", target:mod.e || mod.target, strength:mod.s || mod.strength || "modeled", source:"METABOLITE_ACTORS" }))),
  ].filter(mod => mod.target);

  const seen = new Set();
  return raw.filter(mod => {
    const key = [mod.mode, mod.target, mod.strength].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectMetaboliteMediatedCandidates() {
  const rows = [];
  const seen = new Set();
  for (const [parent, metabolites] of Object.entries(METAB || {})) {
    const parentDrug = drugByName(parent);
    if (!parentDrug) continue;
    for (const met of metabolites || []) {
      const actor = actorForMetabolite(met.n);
      if ((actor?.evidenceRefs || []).length) continue;
      const modifiers = metaboliteModifiers(met);
      if (!modifiers.length) continue;
      const metScore = metaboliteActivityScore(met);
      if (metScore === 0 && !(met.evidenceRefs || []).length) continue;

    for (const victim of DRUG_DB) {
        if (victim.name === parent) continue;
        for (const mod of modifiers) {
        for (const route of (victim.routes || [])) {
            if (!route || route.enzyme !== mod.target) continue;
            if (knownPair(parent, victim.name, route.enzyme)) continue;
            if (knownPair(met.n, victim.name, route.enzyme)) continue;
            const key = [parent, met.n, victim.name, route.enzyme, mod.mode].join('|');
          if (seen.has(key)) continue;
          seen.add(key);
          const fraction = routeFraction(route);
          const strength = modStrengthValue(mod.strength);
          const highRisk = riskWords([victim.name, victim.cls, victim.note, route.enzyme].join(" ")) ||
            victim.props?.narrowTherapeutic || victim.props?.nti || victim.props?.qtcRisk >= 2;
            const priority = strength * 20 + Math.round(fraction * 40) + metScore + (highRisk ? 25 : 0) + (victim.prodrug ? 15 : 0);
            if (priority < 80) continue;
          rows.push({
              parent,
              metabolite:met.n,
            victim:victim.name,
            pathway:route.enzyme,
              mode:mod.mode,
            strength:mod.strength || "modeled",
            fraction,
            priority,
              source:mod.source,
            rationale:victim.prodrug
              ? "victim is prodrug/active-metabolite dependent"
              : highRisk
              ? "victim has high-risk exposure or safety context"
                : "metabolite-mediated pathway suggests a meaningful exposure shift",
          });
        }
      }
    }
    }
  }
  return rows.sort((a,b) => b.priority - a.priority || a.parent.localeCompare(b.parent));
}

function explicitMetaboliteRule(parent, metName, gene) {
  const id = String(metName || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return (GENOTYPE_METABOLITE_EFFECTS || []).some(effect =>
    effect.parent === parent && effect.enzyme === gene &&
    (effect.metaboliteName === metName || effect.metaboliteId === id)
  );
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function metaboliteId(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function textIncludesMetabolite(text, metName) {
  const haystack = normalizeText(text);
  const needle = normalizeText(metName);
  const shortNeedle = normalizeText(String(metName || "").replace(/\([^)]*\)/g, " "));
  if (!needle) return false;
  return haystack.includes(needle) ||
    haystack.includes(shortNeedle) ||
    needle.includes(haystack) ||
    shortNeedle.includes(haystack) ||
    haystack.includes(needle.replace(/ rr oh bupropion/g, ""));
}

function metaboliteEvidenceKnown(met, parent, gene) {
  const refs = met.evidenceRefs || [];
  if (refs.length) return true;
  return Object.values(STUDY_DB || {}).some(study => {
    const evidenceText = [
      study.title,
      study.source,
      study.journal,
      study.quantifiedEffects?.note,
      ...(study.supports || []),
    ].join(" ");
    return textIncludesMetabolite(evidenceText, met.n) &&
      normalizeText(evidenceText).includes(normalizeText(parent)) &&
      normalizeText(evidenceText).includes(normalizeText(gene));
  });
}

function pathwayDiversionKnown(parent, metName, gene) {
  const pd = PATHWAY_DIVERSION?.[parent];
  if (!pd) return false;
  const routes = [pd.primary, ...(pd.diverted || [])].filter(Boolean);
  return routes.some(route =>
    route.enzyme === gene &&
    textIncludesMetabolite(route.metabolite, metName)
  );
}

function metaboliteActorKnown(parent, metName, gene) {
  const id = metaboliteId(metName);
  return Object.values(METABOLITE_ACTORS || {}).some(actor => {
    const sameMetabolite = actor.id === id || actor.name === metName || textIncludesMetabolite(actor.name, metName);
    if (!sameMetabolite) return false;
    if (actor.parentDrug && actor.parentDrug !== parent) return false;
    if (actor.formingEnzyme === gene) return true;
    if ((actor.routes || []).some(route => route.enzyme === gene)) return true;
    if ((actor.evidenceRefs || []).length) return true;
    return false;
  });
}

function knownGenotypeMetaboliteContext(parent, met, gene) {
  return explicitMetaboliteRule(parent, met.n, gene) ||
    metaboliteEvidenceKnown(met, parent, gene) ||
    pathwayDiversionKnown(parent, met.n, gene) ||
    metaboliteActorKnown(parent, met.n, gene);
}

function collectGenotypeMetaboliteCandidates() {
  const rows = [];
  for (const [parent, metabolites] of Object.entries(METAB || {})) {
    for (const met of metabolites || []) {
      const gene = met.e;
      if (!geneSet.has(gene) || !GENOTYPE_EFFECTS[gene]) continue;
      if (knownGenotypeMetaboliteContext(parent, met, gene)) continue;
      const highRisk = riskWords([met.n, met.a, met.note].join(" "));
      const active = met.a === "active" || met.a === "active_form" || met.role === "active_form";
      const priority = (highRisk ? 70 : active ? 55 : 35) + (met.evidenceRefs?.length ? 10 : 0);
      if (priority < 45) continue;
      rows.push({
        parent,
        metabolite:met.n,
        gene,
        activity:met.a || "context",
        priority,
        rationale:highRisk
          ? "metabolite is toxic/safety-relevant"
          : active
          ? "metabolite is active or active-form context"
          : "selected genotype gene forms a modeled metabolite",
      });
    }
  }
  return rows.sort((a,b) => b.priority - a.priority || a.parent.localeCompare(b.parent));
}

globalThis.__MECH_REPORT__ = {
  metaboliteMediatedCandidates: collectMetaboliteMediatedCandidates(),
  genotypeMetaboliteCandidates: collectGenotypeMetaboliteCandidates(),
};
`;

const context = { console };
vm.runInNewContext(source, context, { filename: 'mechanistic-curation-gaps.vm.js' });
const report = context.__MECH_REPORT__;

function table(rows, columns, limit = rows.length) {
  if (!rows.length) return '_No candidates after excluding known parent-enzyme, curated DDI, metabolite-actor, pathway-diversion, and evidence-backed relations._';
  const slice = rows.slice(0, limit);
  const header = `| ${columns.map(c => c.label).join(' | ')} |`;
  const sep = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = slice.map(row => `| ${columns.map(c => String(c.value(row)).replace(/\|/g, '/')).join(' | ')} |`);
  const more = rows.length > limit ? [``, `_Showing ${limit} of ${rows.length} generated candidates._`] : [];
  return [header, sep, ...body, ...more].join('\n');
}

const generated = new Date().toISOString();
const md = `# Mechanistic Curation Gap Audit

Generated: ${generated}

This internal audit is generated from MedCheck source data. It lists graph-derived curation gaps that are **not already represented by MedCheck's curated DDI, metabolite, genotype-metabolite, pathway-diversion, metabolite-actor, or evidence layers**. Treat every row as an enrichment task, not as a discovered interaction or clinical guidance.

## What Counts Here

- Metabolite-mediated candidates: a parent substance forms a metabolite, that metabolite inhibits or induces an enzyme/transporter, and another substance depends on that pathway. Basic parent-drug CYP matching is intentionally excluded.
- Genotype-metabolite candidates: a selected high-value genotype gene forms a modeled active/toxic metabolite, excluding relations already covered by curated metabolite evidence, pathway-diversion rules, metabolite actors, or direct genotype-metabolite rules.
- These entries are useful for enrichment searches and pharmacist/clinician review before any website promotion.

## Summary

- ${report.metaboliteMediatedCandidates.length} metabolite-mediated candidate relations
- ${report.genotypeMetaboliteCandidates.length} genotype-metabolite candidate relations

## Metabolite-Mediated Candidates

${table(report.metaboliteMediatedCandidates, [
  { label:'Parent', value:r => r.parent },
  { label:'Metabolite', value:r => r.metabolite },
  { label:'Victim', value:r => r.victim },
  { label:'Pathway', value:r => r.pathway },
  { label:'Mode', value:r => r.mode },
  { label:'Strength', value:r => r.strength },
  { label:'Route fraction', value:r => Math.round(r.fraction * 100) + '%' },
  { label:'Why it matters', value:r => r.rationale },
])}

## Genotype-Metabolite Candidates

${table(report.genotypeMetaboliteCandidates, [
  { label:'Medication', value:r => r.parent },
  { label:'Metabolite', value:r => r.metabolite },
  { label:'Gene', value:r => r.gene },
  { label:'Metabolite activity', value:r => r.activity },
  { label:'Why it matters', value:r => r.rationale },
])}

## Review Policy

Before promoting any row into evidence-backed warnings, look for public labels, CPIC/DPWG guidance, PubMed abstracts, Europe PMC, OpenAlex, Semantic Scholar, or open full text. If only the mechanism exists, keep it internal or in the experimental prediction layer.
`;

const falseNovelGuards = [
  {
    label: 'Bupropion -> Hydroxybupropion is already curated',
    pattern: /\|\s*Bupropion\s*\|[^|\n]*Hydroxybupropion/i,
  },
  {
    label: 'Hydroxybupropion CYP2D6 context is already curated',
    pattern: /Hydroxybupropion/i,
  },
  {
    label: 'Bupropion + Codeine is already a curated DDI',
    pattern: /\|\s*Bupropion\s*\|\s*Codeine\s*\|/i,
  },
  {
    label: 'Atazanavir bilirubin/UGT1A1 context is already curated',
    pattern: /\|\s*Atazanavir\s*\|[^|\n]*bilirubin/i,
  },
  {
    label: 'Dapsone hydroxylamine/CYP2C9 context is already curated',
    pattern: /\|\s*Dapsone\s*\|[^|\n]*hydroxylamine/i,
  },
];
const falseNovelHits = falseNovelGuards.filter(guard => guard.pattern.test(md));
if (falseNovelHits.length) {
  throw new Error(`Known relations leaked into mechanistic curation-gap audit: ${falseNovelHits.map(hit => hit.label).join('; ')}`);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, md, 'utf8');
console.log(`Mechanistic curation-gap audit written: ${OUT}`);
