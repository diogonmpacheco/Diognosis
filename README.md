# MedCheck

A private, client-side pharmacology graph for exploring how drugs, genes, metabolites, foods, transporters, receptor burden, washout timing, and PK exposure act together as one system.

**Live app:** [diogonmpacheco.github.io/medcheck](https://diogonmpacheco.github.io/medcheck/)

[![CI](https://github.com/diogonmpacheco/medcheck/actions/workflows/ci.yml/badge.svg)](https://github.com/diogonmpacheco/medcheck/actions/workflows/ci.yml)
[![Node.js 20](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs&logoColor=white)](package.json)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Open Issues](https://img.shields.io/github/issues/diogonmpacheco/medcheck)](https://github.com/diogonmpacheco/medcheck/issues)
[![Live Site](https://img.shields.io/badge/live-GitHub%20Pages-222?logo=github)](https://diogonmpacheco.github.io/medcheck/)

MedCheck runs entirely in the browser. There are no accounts, no server, no medication data collection, and no user medication or genotype data is sent to MedCheck. The graph view loads D3 from a public CDN unless you self-host that asset.

Current data release: **Drug DB v1.2.3**, last reviewed **2026-06-04**.

---

## Try A Demo

These links open the live app with example medication stacks already loaded:

| Demo | What it shows |
|---|---|
| [SSRI switch / washout](https://diogonmpacheco.github.io/medcheck/index.html?substances=paroxetine,fluoxetine&tab=safety) | Long half-life, persistent CYP2D6 inhibition, serotonin/QT context |
| [Clopidogrel + CYP2C19 PM](https://diogonmpacheco.github.io/medcheck/index.html?substances=clopidogrel,omeprazole&genotype=CYP2C19:poor_metabolizer&tab=pgx) | Prodrug activation, genotype effect, PPI interaction |
| [Codeine + CYP2D6 PM](https://diogonmpacheco.github.io/medcheck/index.html?substances=codeine,fluoxetine&genotype=CYP2D6:poor_metabolizer&tab=pgx) | Active-metabolite failure risk with CYP2D6 poor metabolism |
| [Simvastatin + clarithromycin](https://diogonmpacheco.github.io/medcheck/index.html?substances=simvastatin,clarithromycin&tab=pk) | CYP3A4 inhibition, exposure shift, PK simulation |
| [Older-adult burden](https://diogonmpacheco.github.io/medcheck/index.html?substances=amitriptyline,diazepam,diphenhydramine,oxycodone&tab=safety) | Anticholinergic, sedative, fall-risk, and Beers-style burden |

You can also build custom share links with:

`https://diogonmpacheco.github.io/medcheck/index.html?substances=warfarin,ibuprofen&tab=safety`

For alternate entry points, see the [MedCheck Data Views](https://diogonmpacheco.github.io/medcheck/data-views.html) and the [Medication Class Guides](https://diogonmpacheco.github.io/medcheck/medication-classes.html).

---

## Privacy

MedCheck is a static client-side app. It does not use accounts, analytics, cookies, tracking pixels, backend logging, or medication-data collection. Searches, medication stacks, genotype settings, and pasted report rows stay in your browser.

The only routine third-party request is the D3 graph library loaded from CDN for visualization; no medication stack, genotype setting, or search content is sent with that request.

---

## What It Shows

Most interaction checkers return isolated warnings. MedCheck instead shows how a medication stack behaves as a connected system: interaction warnings, pharmacogenomics, metabolites, PK curves, evidence, receptor burden, Beers-style flags, and washout timing.

The project is intended for education, research, and review workflows. It is not a clinical decision system.

## Current Limitations

MedCheck is intentionally conservative about what it claims. PK curves use a one-compartment model or a relative exposure fallback, so they do not replace therapeutic drug monitoring, multi-compartment/nonlinear PK models, or active-metabolite clinical interpretation. Extreme exposure shifts may be capped for display clarity. Evidence marked `reviewRequired:true` is visible for review and discovery, but remains pending pharmacist or physician sign-off and should not be treated as professionally reviewed.

---

## Launch Stats

<!-- MEDCHECK_STATS_START -->
- **625 drugs** in DRUG_DB
- **455 evidence entries** in STUDY_DB (274 with PMIDs; 455 with source identifiers) — **455 pending professional review**, **0 professionally reviewed**
- **627 interaction pairs** (323 severe, 280 moderate, 24 mild)
- **1171 metabolite entries** across **467 parent substances** (33 first-class metabolite actors)
- **506 absolute PK simulation profiles** with relative fallback for half-life-only drugs
- **57 genotype genes** and **52 receptor score profiles**
- **13 Beers flags** and **8 washout rules**
- **2154 KB** generated bundle (33940 lines)
<!-- MEDCHECK_STATS_END -->

---

## How To Use

1. Open the [live app](https://diogonmpacheco.github.io/medcheck/).
2. Search for medications, supplements, foods, or substances.
3. Review safety, pharmacogenomics, PK, evidence, graph, burden, and washout panels.
4. Set genotype phenotypes where relevant, or paste supported PharmGx report rows in the pharmacogenomics panel.
5. Treat every result as an explanation to review, not as medical advice.

For internals, data structures, build instructions, and validation workflow, see [Technical Notes](docs/TECHNICAL.md). For launch readiness, see the [Launch QA Matrix](docs/LAUNCH_QA_MATRIX.md) and [Launch Data Trust Audit](docs/LAUNCH_DATA_TRUST_AUDIT.md).

---

## Contribute / Review Data

MedCheck contains source-linked data. No evidence entry has been professionally reviewed yet. Entries marked `reviewRequired:true` are internally flagged enrichment rows, but the rest of the evidence should not be treated as verified.

The safety contract is simple: a warning should explain the pathway, affected actor, predicted direction, and supporting evidence. Severity should not be treated as clinically final without human review.

Helpful contributions include data review, missing evidence refs, duplicate or stale interaction reports, reproducible app bugs, and focused pull requests. For data review, start with the priority list in [Launch Data Trust Audit](docs/LAUNCH_DATA_TRUST_AUDIT.md), cite public sources such as labels, guidelines, PubMed records, PMIDs, DOIs, or URLs, and keep entries pending professional review until an appropriate reviewer signs off.

---

## License

MedCheck is open source under the [MIT License](LICENSE).

You can use, modify, and build on it freely. If you use MedCheck in another project, please share where it is being used and include a link back to the project when practical:

`https://github.com/diogonmpacheco/medcheck`

This attribution request is appreciated, but the license remains permissive.

---

## Disclaimer

This tool is for **educational purposes only**. It does not replace professional medical advice, clinical pharmacist review, or therapeutic drug monitoring. Always consult a qualified doctor or pharmacist before making changes to medications.
