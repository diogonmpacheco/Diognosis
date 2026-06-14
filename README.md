# Diognosis

**Parent–metabolite-aware medication safety and pharmacogenomics platform for source-linked interaction review.**

Diognosis is a pre-v1, source-linked research prototype for exploring medication safety, pharmacogenomics, and mechanistic interaction signals.

Its first module, **MedCheck Engine**, checks medication stacks as connected biochemical systems. Instead of treating a medication only as a parent drug name, it models parent substances, active metabolites, toxic metabolites, enzymes, transporters, receptors, pharmacogenomic phenotypes, PK shifts, washout timing, pathway explanations, and source-linked evidence as connected actors.

**Status:** pre-v1, under active validation, pending professional clinical review, and not medical advice.

**Data:** **Drug DB v1.2.3**.

**Live app:** [diogonmpacheco.github.io/Diognosis](https://diogonmpacheco.github.io/Diognosis/)

[![CI](https://github.com/diogonmpacheco/Diognosis/actions/workflows/ci.yml/badge.svg)](https://github.com/diogonmpacheco/Diognosis/actions/workflows/ci.yml)
[![Node.js 20](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs&logoColor=white)](package.json)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Open Issues](https://img.shields.io/github/issues/diogonmpacheco/Diognosis)](https://github.com/diogonmpacheco/Diognosis/issues)
[![Live Site](https://img.shields.io/badge/live-GitHub%20Pages-222?logo=github)](https://diogonmpacheco.github.io/Diognosis/)

## MedCheck Engine

MedCheck Engine is the first module of Diognosis. It focuses on medication safety exploration, pharmacogenomics, drug-drug interactions, active and toxic metabolites, pharmacokinetic exposure shifts, transporter pathways, pathway explanations, and source-linked evidence.

The MedCheck Engine runs entirely in the browser. There are no accounts, no server, no medication data collection, and no user medication or genotype data is sent to Diognosis. The graph view uses a vendored D3 build that is bundled locally at build time.

## What Makes Diognosis Different

Most medication checkers begin with parent drug names and return pairwise warnings. Diognosis is built around parent–metabolite–gene reasoning.
That means the MedCheck Engine can separate questions that are often collapsed together:
- Is the parent drug rising?
- Is the active metabolite falling?
- Is a toxic metabolite accumulating?
- Is a prodrug failing activation?
- Has a genotype been phenoconverted by an inhibitor or inducer?
- Is the warning driven by an enzyme, transporter, receptor, metabolite, phenotype, PK shift, or washout window?
- Is the evidence label-backed, guideline-backed, clinical-PK-backed, mechanistic, or still pending professional review?

This makes Diognosis especially useful for review scenarios where the clinically important signal is not the original pill itself, but what the body turns it into — or fails to turn it into.

## Mechanistic Reasoning Layers

MedCheck Engine includes several reasoning layers designed to make parent–metabolite and gene-mediated risks easier to inspect:

| Layer | What it explains |
|---|---|
| **Active-moiety balance** | Separates parent-drug, active-metabolite, and toxic-metabolite directionality. |
| **Phenoconversion dashboard** | Shows how genotype plus inhibitors, inducers, and substrate burden can change functional enzyme status. |
| **Per-warning why graph** | Displays the pathway chain behind each major warning. |
| **Persistence & washout timeline** | Separates parent persistence, metabolite persistence, and enzyme recovery/induction offset. |
| **Evidence confidence ladder** | Distinguishes mechanistic confidence, clinical-action confidence, source type, and professional-review status. |

## Try A Demo

These links open the live app with example medication stacks already loaded:

| Demo | What it shows |
|---|---|
| [SSRI switch / washout](https://diogonmpacheco.github.io/Diognosis/index.html?substances=paroxetine,fluoxetine&tab=timing-levels) | Fluoxetine and norfluoxetine can persist for weeks. The Timing + Levels view separates parent persistence, metabolite persistence, washout rules, and enzyme recovery. |
| [Clopidogrel + CYP2C19 PM](https://diogonmpacheco.github.io/Diognosis/index.html?substances=clopidogrel,omeprazole&genotype=CYP2C19:poor_metabolizer&tab=genes-metabolites) | Clopidogrel is a prodrug. The Genes + Metabolites view shows CYP2C19 functional status and reduced active-thiol formation as an activation-failure review prompt. |
| [Codeine + CYP2D6 PM](https://diogonmpacheco.github.io/Diognosis/index.html?substances=codeine,fluoxetine&genotype=CYP2D6:poor_metabolizer&tab=genes-metabolites) | Codeine must be converted into morphine. The app separates parent codeine, active morphine, CYP2D6 phenoconversion, and the why path behind reduced activation. |
| [Simvastatin + clarithromycin](https://diogonmpacheco.github.io/Diognosis/index.html?substances=simvastatin,clarithromycin&tab=mechanisms) | Clarithromycin blocks a major simvastatin cleanup route. The Mechanisms view shows the CYP3A4 pathway chain and source-linked evidence status. |
| [Older-adult burden](https://diogonmpacheco.github.io/Diognosis/index.html?substances=amitriptyline,diazepam,diphenhydramine,oxycodone&tab=overview) | Each medicine can add sedation, confusion, or fall risk. Overview groups the main interaction findings while Review keeps evidence and diagnostics inspectable. |

The deeper examples below stress cases that are often missed when a checker only looks at parent drug names. The important signal may come from an active metabolite, a toxic metabolite, a blocked clearance pathway, or a genetic no-function state.

| Deep demo | Why it is often missed |
|---|---|
| [Azathioprine + allopurinol + TPMT/NUDT15 PM](https://diogonmpacheco.github.io/Diognosis/index.html?substances=azathioprine,allopurinol&genotype=TPMT:PM&genotype=NUDT15:PM&tab=genes-metabolites) | Allopurinol can push azathioprine down a more toxic route. The parent–metabolite view highlights 6-TGN accumulation, genotype context, and pending evidence-review status. |
| [Capecitabine + DPYD PM](https://diogonmpacheco.github.io/Diognosis/index.html?substances=capecitabine&genotype=DPYD:PM&tab=genes-metabolites) | Capecitabine is designed to become 5-FU. If DPYD cleanup is weak, the active/toxic metabolite can accumulate, so toxicity can come from the metabolite rather than the parent drug. |
| [Irinotecan + UGT1A1 PM](https://diogonmpacheco.github.io/Diognosis/index.html?substances=irinotecan&genotype=UGT1A1:PM&tab=genes-metabolites) | Irinotecan becomes SN-38, the stronger active metabolite. UGT1A1 helps clear SN-38; the app shows this as toxic-metabolite accumulation with a why path. |
| [Bupropion + clopidogrel + nebivolol + CYP2D6 no-function](https://diogonmpacheco.github.io/Diognosis/index.html?substances=bupropion,clopidogrel,nebivolol&genotype=CYP2D6:null&tab=overview) | This stack hides several parent/metabolite directions at once: bupropion parent exposure, hydroxybupropion uncertainty, nebivolol clearance, and clopidogrel activation context. |
| [G6PD oxidant stack](https://diogonmpacheco.github.io/Diognosis/index.html?substances=rasburicase,primaquine,dapsone&genotype=G6PD:deficiency&tab=genes-metabolites) | These drugs look unrelated by name, but all can stress red blood cells. The app groups G6PD risk with toxic-metabolite and oxidant-stress review prompts. |
| [Succinylcholine + BCHE/RYR1 risk](https://diogonmpacheco.github.io/Diognosis/index.html?substances=succinylcholine&genotype=BCHE:null&genotype=RYR1:present&tab=genes-metabolites) | The issue is not a common drug-drug pair. BCHE weakness can make paralysis last too long, while RYR1/CACNA1S context flags malignant-hyperthermia susceptibility. |

You can also build custom share links with:

`https://diogonmpacheco.github.io/Diognosis/index.html?substances=warfarin,ibuprofen&tab=safety`

For alternate entry points, see the [Diognosis Data Views](https://diogonmpacheco.github.io/Diognosis/data-views.html) and the [Medication Class Guides](https://diogonmpacheco.github.io/Diognosis/medication-classes.html).

---

## Privacy

Diognosis currently ships the MedCheck Engine as a static client-side app. It does not use accounts, analytics, cookies, tracking pixels, backend logging, or medication-data collection. Searches, medication stacks, genotype settings, and pasted report rows stay in your browser.

There are no routine third-party runtime requests. Evidence links, demo links, and GitHub feedback links are only opened when selected.

---

## What It Shows

Most interaction checkers return isolated warnings. MedCheck Engine instead shows how a medication stack behaves as a connected system: parent drugs, active metabolites, toxic metabolites, pharmacogenomic phenotypes, enzyme and transporter capacity, PK curves, receptor burden, Beers-style flags, washout timing, evidence, and pathway explanations.

The goal is not to replace clinical judgment. The goal is to make the mechanism visible enough for education, research, review workflows, and pharmacist or clinician verification.

Diognosis is not a clinical decision system. Source-linked evidence does not equal clinical validation. Warnings are review prompts, and severity should not be treated as clinically final until reviewed by an appropriate professional.

## Current Limitations

Diognosis is intentionally conservative about what it claims. MedCheck Engine PK curves use a one-compartment model or a relative exposure fallback, so they do not replace therapeutic drug monitoring, multi-compartment/nonlinear PK models, or active-metabolite clinical interpretation. Extreme exposure shifts may be capped for display clarity. Evidence marked `reviewRequired:true` is visible for review and discovery, but remains pending pharmacist or physician sign-off and should not be treated as professionally reviewed.

---

## Launch Stats

<!-- MEDCHECK_STATS_START -->
- **625 drugs** in DRUG_DB
- **456 evidence entries** in STUDY_DB (275 with PMIDs; 456 with source identifiers) — **456 pending professional review**, **0 professionally reviewed**
- **627 interaction pairs** (323 severe, 280 moderate, 24 mild)
- **1171 metabolite entries** across **467 parent substances** (33 first-class metabolite actors)
- **506 absolute PK simulation profiles** with relative fallback for half-life-only drugs
- **57 genotype genes** and **52 receptor score profiles**
- **43 Beers flags** and **24 washout rules**
- **4459 KB** generated bundle (93828 lines)
<!-- MEDCHECK_STATS_END -->

---

## How To Use

1. Open the [live Diognosis app](https://diogonmpacheco.github.io/Diognosis/).
2. Search for medications, supplements, foods, or substances.
3. Review the Overview, Mechanisms, Genes + Metabolites, Timing + Levels, Evidence, and Review tabs.
4. Set genotype phenotypes where relevant, or paste supported PharmGx report rows in the pharmacogenomics panel.
5. Treat every result as an explanation to review, not as medical advice.

For internals, data structures, build instructions, and validation workflow, see [Technical Notes](docs/TECHNICAL.md). For launch readiness, see the [Launch QA Matrix](docs/LAUNCH_QA_MATRIX.md), [Public Trust Model](docs/PUBLIC_TRUST.md), and [Launch Data Trust Audit](docs/LAUNCH_DATA_TRUST_AUDIT.md).

---

## Contribute / Review Data

Diognosis contains source-linked MedCheck Engine data. No evidence entry has been professionally reviewed yet. Entries marked `reviewRequired:true` are internally flagged enrichment rows, but the rest of the evidence should not be treated as verified.

The safety contract is simple: a warning should explain the pathway, affected actor, predicted direction, and supporting evidence. Severity should not be treated as clinically final without human review.

Helpful contributions include data review, missing evidence refs, duplicate or stale interaction reports, reproducible app bugs, and focused pull requests. Use the report links on warning and evidence cards, or start with the priority list in [Launch Data Trust Audit](docs/LAUNCH_DATA_TRUST_AUDIT.md). Cite public sources such as labels, guidelines, PubMed records, PMIDs, DOIs, or URLs, and keep entries pending professional review until an appropriate reviewer signs off.

---

## License

Diognosis is open source under the [MIT License](LICENSE).

You can use, modify, and build on it freely. If you use Diognosis or the MedCheck Engine in another project, please share where it is being used and include a link back to the project when practical:

`https://github.com/diogonmpacheco/Diognosis`

This attribution request is appreciated, but the license remains permissive.

---

## Disclaimer

Diognosis and the MedCheck Engine are for **educational exploration only**. They are not medical advice, not a clinical decision support system, not professionally reviewed, and do not replace professional medical advice, clinical pharmacist review, or therapeutic drug monitoring. Source-linked evidence does not equal clinical validation. Always consult a qualified doctor or pharmacist before making changes to medications.
