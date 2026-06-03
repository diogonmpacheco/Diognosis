# MedCheck

A private, client-side pharmacology graph for exploring drug interactions, pharmacogenomics, metabolites, foods, transporters, receptor burden, washout timing, and PK exposure.

**Live app:** [diogonmpacheco.github.io/medcheck](https://diogonmpacheco.github.io/medcheck/)

[![CI](https://github.com/diogonmpacheco/medcheck/actions/workflows/ci.yml/badge.svg)](https://github.com/diogonmpacheco/medcheck/actions/workflows/ci.yml)
[![Node.js 20](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs&logoColor=white)](package.json)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Open Issues](https://img.shields.io/github/issues/diogonmpacheco/medcheck)](https://github.com/diogonmpacheco/medcheck/issues)
[![Live Site](https://img.shields.io/badge/live-GitHub%20Pages-222?logo=github)](https://diogonmpacheco.github.io/medcheck/)

MedCheck runs entirely in the browser. There are no accounts, no server, no API calls, and no medication data collection.

Current data release: **Drug DB v1.2.3**, last reviewed **2026-05-29**.

---

## Try A Demo

These links open the live app with example medication stacks already loaded:

| Demo | What it shows |
|---|---|
| [SSRI switch / washout](https://diogonmpacheco.github.io/medcheck/index.html?demo=ssri-switch) | Long half-life, persistent CYP2D6 inhibition, serotonin/QT context |
| [Clopidogrel + CYP2C19 PM](https://diogonmpacheco.github.io/medcheck/index.html?demo=clopidogrel-cyp2c19) | Prodrug activation, genotype effect, PPI interaction |
| [Codeine + CYP2D6 PM](https://diogonmpacheco.github.io/medcheck/index.html?demo=codeine-cyp2d6) | Active-metabolite failure risk with CYP2D6 poor metabolism |
| [Simvastatin + clarithromycin](https://diogonmpacheco.github.io/medcheck/index.html?demo=statin-inhibitor) | CYP3A4 inhibition, exposure shift, PK simulation |
| [Older-adult burden](https://diogonmpacheco.github.io/medcheck/index.html?demo=older-adult-burden) | Anticholinergic, sedative, fall-risk, and Beers-style burden |

You can also build custom share links with:

`https://diogonmpacheco.github.io/medcheck/index.html?drugs=Warfarin,Ibuprofen&tab=safety`

---

## Why It Exists

Most interaction checkers return isolated warnings. MedCheck tries to show the underlying pharmacology:

- which enzyme, transporter, metabolite, receptor, or phenotype is involved
- whether the issue is parent-drug accumulation, active-metabolite failure, receptor burden, or washout timing
- how genotype and co-medications change predicted exposure
- which evidence entries support the signal, and which entries still require human review

The project is intended for education, research, and review workflows. It is not a clinical decision system.

---

## What It Can Explore

- Drug-drug interactions and known curated DDI pairs
- CYP and transporter substrate/inhibitor/inducer pathways
- Pharmacogenomics across CYP2D6, CYP2C19, CYP2C9, CYP3A5, SLCO1B1, HLA risk alleles, G6PD, DPYD, TPMT, UGT1A1, NUDT15, and more
- Parent/metabolite divergence for prodrugs and active or toxic metabolites
- PK curves with absolute parameters where available, plus relative-exposure fallback curves when only half-life data exists
- Receptor occupancy and syndrome-style burden detection
- Anticholinergic, sedative, fall-risk, Beers, and washout summaries
- Evidence browsing with review-required entries clearly separated

---

## Live Source Stats

<!-- MEDCHECK_STATS_START -->
- **316 drugs** in DRUG_DB
- **224 evidence entries** in STUDY_DB (169 with PMIDs)
- **235 curated DDI pairs** (147 severe, 83 moderate, 5 mild)
- **25 genotype genes**, **27 metabolite actors**, **52 receptor score profiles**
- **13 Beers flags** and **8 washout rules**
- **1074 KB** generated bundle (22300 lines)
<!-- MEDCHECK_STATS_END -->

---

## How To Use

1. Open the [live app](https://diogonmpacheco.github.io/medcheck/).
2. Search for medications, supplements, foods, or substances.
3. Review safety, pharmacogenomics, PK, evidence, graph, burden, and washout panels.
4. Set genotype phenotypes where relevant.
5. Treat every result as an explanation to review, not as medical advice.

For implementation details, data structures, build instructions, and validation workflow, see [Technical Notes](docs/TECHNICAL.md).

---

## Review Status

MedCheck contains curated data and live enrichment entries. Live enrichment entries are marked `reviewRequired:true` and are intended for pharmacist or physician review before any clinical use.

The safety contract is simple: a warning should explain the pathway, affected actor, predicted direction, and supporting evidence. Severity should not be treated as clinically final without human review.

---

## License

MedCheck is open source under the [MIT License](LICENSE).

You can use, modify, and build on it freely. If you use MedCheck in another project, please share where it is being used and include a link back to the project when practical:

`https://github.com/diogonmpacheco/medcheck`

This attribution request is appreciated, but the license remains permissive.

---

## Disclaimer

This tool is for **educational purposes only**. It does not replace professional medical advice, clinical pharmacist review, or therapeutic drug monitoring. Always consult a qualified doctor or pharmacist before making changes to medications.
