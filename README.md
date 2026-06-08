# PharmTrace

**AI-assisted medication safety and pharmacogenomics platform.**

PharmTrace is an AI-assisted medication safety and pharmacogenomics platform in active development.

Its first module, the MedCheck Engine, explores drug-drug interactions, pharmacogenomics, active and toxic metabolites, pharmacokinetic exposure shifts, transporter pathways, medication class effects, and source-linked evidence through a privacy-preserving static web application.

Status: pre-v1, source-linked, actively validated, and pending future professional clinical review.

**Live app:** [diogonmpacheco.github.io/PharmTrace](https://diogonmpacheco.github.io/PharmTrace/)

[![CI](https://github.com/diogonmpacheco/PharmTrace/actions/workflows/ci.yml/badge.svg)](https://github.com/diogonmpacheco/PharmTrace/actions/workflows/ci.yml)
[![Node.js 20](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs&logoColor=white)](package.json)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Open Issues](https://img.shields.io/github/issues/diogonmpacheco/PharmTrace)](https://github.com/diogonmpacheco/PharmTrace/issues)
[![Live Site](https://img.shields.io/badge/live-GitHub%20Pages-222?logo=github)](https://diogonmpacheco.github.io/PharmTrace/)

## MedCheck Engine

MedCheck Engine is the first module of PharmTrace. It focuses on medication safety exploration, pharmacogenomics, drug-drug interactions, active and toxic metabolites, pharmacokinetic exposure shifts, transporter pathways, and source-linked evidence.

The MedCheck Engine runs entirely in the browser. There are no accounts, no server, no medication data collection, and no user medication or genotype data is sent to PharmTrace. The graph view loads D3 from a public CDN unless you self-host that asset.

## Naming Note

This project was initially developed under the working name “MedCheck”. The broader platform is now named “PharmTrace”, with “MedCheck Engine” preserved as the name of the first medication-safety module.

The GitHub repository and Pages URL now use `PharmTrace`. Some internal engine identifiers still use `MEDCHECK_*` because they name the first module and preserve build compatibility.

Current data release: **Drug DB v1.2.3**, last reviewed **2026-06-04**.

---

## Try A Demo

These links open the live app with example medication stacks already loaded:

| Demo | What it shows |
|---|---|
| [SSRI switch / washout](https://diogonmpacheco.github.io/PharmTrace/index.html?substances=paroxetine,fluoxetine&tab=safety) | Fluoxetine stays in the body for weeks. Adding paroxetine before it clears can keep the same cleanup pathway blocked and can stack serotonin/QT warning signals. |
| [Clopidogrel + CYP2C19 PM](https://diogonmpacheco.github.io/PharmTrace/index.html?substances=clopidogrel,omeprazole&genotype=CYP2C19:poor_metabolizer&tab=pgx) | Clopidogrel is a prodrug: the body must turn it on. A slow CYP2C19 genotype plus omeprazole can reduce activation, so the pill may give less antiplatelet effect than expected. |
| [Codeine + CYP2D6 PM](https://diogonmpacheco.github.io/PharmTrace/index.html?substances=codeine,fluoxetine&genotype=CYP2D6:poor_metabolizer&tab=pgx) | Codeine must be converted into morphine to work well. A slow CYP2D6 genotype, or a CYP2D6 blocker like fluoxetine, can leave more inactive parent drug and less pain-relieving metabolite. |
| [Simvastatin + clarithromycin](https://diogonmpacheco.github.io/PharmTrace/index.html?substances=simvastatin,clarithromycin&tab=pk) | Clarithromycin blocks one of simvastatin's main cleanup routes. Simvastatin can rise higher than intended, increasing muscle-toxicity concern. |
| [Older-adult burden](https://diogonmpacheco.github.io/PharmTrace/index.html?substances=amitriptyline,diazepam,diphenhydramine,oxycodone&tab=safety) | Each medicine can add sedation, confusion, or fall risk. The important signal is the combined burden, not only one pair of drugs. |

For deeper v1 QA, these examples stress problems that are often missed because the danger is not only the parent drug name. It may come from what the body turns the drug into, what the body fails to clear, or a genetic weakness that only appears when the pathway is modeled.

| Deep demo | Why it is often missed |
|---|---|
| [Azathioprine + allopurinol + TPMT/NUDT15 PM](https://diogonmpacheco.github.io/PharmTrace/index.html?substances=azathioprine,allopurinol&genotype=TPMT:PM&genotype=NUDT15:PM&tab=pgx) | Allopurinol can push azathioprine down a more toxic route. If TPMT or NUDT15 cleanup is weak, the toxic 6-TGN metabolite can build up and threaten bone marrow. |
| [Capecitabine + DPYD PM](https://diogonmpacheco.github.io/PharmTrace/index.html?substances=capecitabine&genotype=DPYD:PM&tab=pgx) | Capecitabine is designed to become 5-FU. If DPYD cleanup is weak, that active cancer-drug metabolite can accumulate, so toxicity can come from the metabolite rather than the parent drug. |
| [Irinotecan + UGT1A1 PM](https://diogonmpacheco.github.io/PharmTrace/index.html?substances=irinotecan&genotype=UGT1A1:PM&tab=pgx) | Irinotecan becomes SN-38, the stronger active metabolite. UGT1A1 helps clear SN-38; if that pathway is weak, diarrhea and low-blood-count risk can rise. |
| [Bupropion + codeine + CYP2D6 PM](https://diogonmpacheco.github.io/PharmTrace/index.html?substances=bupropion,codeine&genotype=CYP2D6:PM&tab=pgx) | Bupropion is not just the parent pill: its hydroxybupropion metabolite helps block CYP2D6. Codeine needs CYP2D6 to become morphine, so pain relief can drop when the pathway is blocked or genetically slow. |
| [G6PD oxidant stack](https://diogonmpacheco.github.io/PharmTrace/index.html?substances=rasburicase,primaquine,dapsone&genotype=G6PD:deficiency&tab=pgx) | These drugs look unrelated by name, but all can stress red blood cells. With G6PD deficiency, that shared stress can trigger red-cell breakdown or methemoglobinemia. |
| [Succinylcholine + BCHE/RYR1 risk](https://diogonmpacheco.github.io/PharmTrace/index.html?substances=succinylcholine&genotype=BCHE:null&genotype=RYR1:present&tab=pgx) | The issue is not a common drug-drug pair. BCHE weakness can make paralysis last too long, while RYR1 risk can point to malignant hyperthermia susceptibility during anesthesia. |

You can also build custom share links with:

`https://diogonmpacheco.github.io/PharmTrace/index.html?substances=warfarin,ibuprofen&tab=safety`

For alternate entry points, see the [PharmTrace Data Views](https://diogonmpacheco.github.io/PharmTrace/data-views.html) and the [Medication Class Guides](https://diogonmpacheco.github.io/PharmTrace/medication-classes.html).

---

## Privacy

PharmTrace currently ships the MedCheck Engine as a static client-side app. It does not use accounts, analytics, cookies, tracking pixels, backend logging, or medication-data collection. Searches, medication stacks, genotype settings, and pasted report rows stay in your browser.

The only routine third-party request is the D3 graph library loaded from CDN for visualization; no medication stack, genotype setting, or search content is sent with that request.

---

## What It Shows

Most interaction checkers return isolated warnings. MedCheck Engine instead shows how a medication stack behaves as a connected system: interaction warnings, pharmacogenomics, metabolites, PK curves, evidence, receptor burden, Beers-style flags, and washout timing.

The project is intended for education, research, and review workflows. It is not a clinical decision system.

## Current Limitations

PharmTrace is intentionally conservative about what it claims. MedCheck Engine PK curves use a one-compartment model or a relative exposure fallback, so they do not replace therapeutic drug monitoring, multi-compartment/nonlinear PK models, or active-metabolite clinical interpretation. Extreme exposure shifts may be capped for display clarity. Evidence marked `reviewRequired:true` is visible for review and discovery, but remains pending pharmacist or physician sign-off and should not be treated as professionally reviewed.

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
- **2169 KB** generated bundle (34317 lines)
<!-- MEDCHECK_STATS_END -->

---

## How To Use

1. Open the [live PharmTrace app](https://diogonmpacheco.github.io/PharmTrace/).
2. Search for medications, supplements, foods, or substances.
3. Review MedCheck Engine safety, pharmacogenomics, PK, evidence, graph, burden, and washout panels.
4. Set genotype phenotypes where relevant, or paste supported PharmGx report rows in the pharmacogenomics panel.
5. Treat every result as an explanation to review, not as medical advice.

For internals, data structures, build instructions, and validation workflow, see [Technical Notes](docs/TECHNICAL.md). For launch readiness, see the [Launch QA Matrix](docs/LAUNCH_QA_MATRIX.md), [Public Trust Model](docs/PUBLIC_TRUST.md), and [Launch Data Trust Audit](docs/LAUNCH_DATA_TRUST_AUDIT.md).

---

## Contribute / Review Data

PharmTrace contains source-linked MedCheck Engine data. No evidence entry has been professionally reviewed yet. Entries marked `reviewRequired:true` are internally flagged enrichment rows, but the rest of the evidence should not be treated as verified.

The safety contract is simple: a warning should explain the pathway, affected actor, predicted direction, and supporting evidence. Severity should not be treated as clinically final without human review.

Helpful contributions include data review, missing evidence refs, duplicate or stale interaction reports, reproducible app bugs, and focused pull requests. Use the report links on warning and evidence cards, or start with the priority list in [Launch Data Trust Audit](docs/LAUNCH_DATA_TRUST_AUDIT.md). Cite public sources such as labels, guidelines, PubMed records, PMIDs, DOIs, or URLs, and keep entries pending professional review until an appropriate reviewer signs off.

---

## License

PharmTrace is open source under the [MIT License](LICENSE).

You can use, modify, and build on it freely. If you use PharmTrace or the MedCheck Engine in another project, please share where it is being used and include a link back to the project when practical:

`https://github.com/diogonmpacheco/PharmTrace`

This attribution request is appreciated, but the license remains permissive.

---

## Disclaimer

PharmTrace and the MedCheck Engine are for **educational exploration only**. They are not medical advice, not a clinical decision support system, not professionally clinically reviewed, and do not replace professional medical advice, clinical pharmacist review, or therapeutic drug monitoring. Source-linked evidence does not equal clinical validation. Always consult a qualified doctor or pharmacist before making changes to medications.
