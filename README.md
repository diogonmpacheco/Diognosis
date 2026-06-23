<img src="assets/logo-mark.png" alt="Diognosis" width="84">

# Diognosis

**Mechanistic medication intelligence platform for source-linked review of parent drugs, metabolites, pharmacogenomics, timing, and pathway-driven safety signals.**

Diognosis is a mechanistic medication intelligence platform that models parent substances, active and toxic metabolites, enzymes, transporters, receptors, pharmacogenomic phenotypes, PK shifts, washout timing, pathway explanations, and source-linked evidence as **connected actors** rather than isolated parent-drug names.

**Live app:** [diogonmpacheco.github.io/Diognosis](https://diogonmpacheco.github.io/Diognosis/) · [Reference Facts](https://diogonmpacheco.github.io/Diognosis/reference/) · [Data Views](https://diogonmpacheco.github.io/Diognosis/data-views.html) · [Medication Class Guides](https://diogonmpacheco.github.io/Diognosis/medication-classes.html)

**Machine-readable reference:** [Facts JSON](https://diogonmpacheco.github.io/Diognosis/data/diognosis-facts.json) · [Facts JSONL](https://diogonmpacheco.github.io/Diognosis/data/diognosis-facts.jsonl) · [llms.txt](https://diogonmpacheco.github.io/Diognosis/llms.txt)

**Data:** **Drug DB v1.2.3**.

![Status](https://img.shields.io/badge/status-V1%20platform-0f766e.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-24%2B-339933.svg)
![Drug DB](https://img.shields.io/badge/Drug%20DB-v1.2.3-6c7077.svg)
![Live](https://img.shields.io/badge/live-GitHub%20Pages-222.svg)

---

> **⚠️ Not medical advice.** Diognosis is a source-linked mechanistic review platform under active validation. Results should not be treated as clinically final, professionally signed off, or sufficient on their own for medication decisions.

---

## Development Transparency

Diognosis is an AI-assisted, vibe-coded research project built by **Diogo Pacheco** in collaboration with OpenAI Codex and ChatGPT. Diogo directs the product vision, data priorities, clinical-safety boundaries, and final acceptance of changes. AI assistance is used for implementation, refactoring, tests, documentation, and data-organization support.

> **Note:** AI-assisted development does not mean clinical validation. Professional clinical sign-off remains a later review layer.

## Medication Safety Explorer

Diognosis focuses on mechanistic medication intelligence across pharmacogenomics, drug-drug interactions, active and toxic metabolites, pharmacokinetic exposure shifts, transporter pathways, pathway explanations, and source-linked evidence.

> **Runs entirely in the browser.** There are no accounts, no server, no medication data collection, and no user medication or genotype data is sent to Diognosis. The graph view uses a vendored D3 build bundled locally at build time.

## What Makes Diognosis Different

Most medication checkers begin with parent drug names and return pairwise warnings. Diognosis is built around **parent–metabolite–gene reasoning** — separating questions that are often collapsed together:

- Is the **parent drug** rising?
- Is the **active metabolite** falling?
- Is a **toxic metabolite** accumulating?
- Is a **prodrug** failing activation?
- Has a **genotype** been phenoconverted by an inhibitor or inducer?
- Is the warning driven by an enzyme, transporter, receptor, metabolite, phenotype, PK shift, or washout window?
- Is the evidence label-backed, guideline-backed, clinical-PK-backed, mechanistic, source-integrated, or still missing a direct source?

This makes Diognosis especially useful for review scenarios where the clinically important signal is not the original pill itself, but **what the body turns it into — or fails to turn it into**.

## Mechanistic Reasoning Layers

| Layer | What it explains |
|---|---|
| **Active-moiety balance** | Separates parent-drug, active-metabolite, and toxic-metabolite directionality. |
| **Phenoconversion dashboard** | Shows how genotype plus inhibitors, inducers, and substrate burden can change functional enzyme status. |
| **Per-warning why graph** | Displays the pathway chain behind each major warning. |
| **Persistence & washout timeline** | Separates parent persistence, metabolite persistence, and enzyme recovery / induction offset. |
| **Evidence confidence ladder** | Distinguishes mechanistic confidence, clinical-action confidence, source type, and professional-review status. |

## Try a Demo

These links open the live app with example medication stacks already loaded:

| Demo | What it shows |
|---|---|
| [**SSRI switch / washout**](https://diogonmpacheco.github.io/Diognosis/index.html?substances=paroxetine,fluoxetine&tab=timing-levels) | Fluoxetine and norfluoxetine can persist for weeks. Timing + Levels separates parent persistence, metabolite persistence, washout rules, and enzyme recovery. |
| [**Clopidogrel + CYP2C19 PM**](https://diogonmpacheco.github.io/Diognosis/index.html?substances=clopidogrel,omeprazole&genotype=CYP2C19:poor_metabolizer&tab=genes-metabolites) | Clopidogrel is a prodrug. Genes + Metabolites shows CYP2C19 functional status and reduced active-thiol formation as an activation-failure prompt. |
| [**Codeine + CYP2D6 PM**](https://diogonmpacheco.github.io/Diognosis/index.html?substances=codeine,fluoxetine&genotype=CYP2D6:poor_metabolizer&tab=genes-metabolites) | Codeine must convert into morphine. The app separates parent codeine, active morphine, CYP2D6 phenoconversion, and the why path behind reduced activation. |
| [**Simvastatin + clarithromycin**](https://diogonmpacheco.github.io/Diognosis/index.html?substances=simvastatin,clarithromycin&tab=mechanisms) | Clarithromycin blocks a major simvastatin cleanup route. Mechanisms shows the CYP3A4 pathway chain and source-linked evidence status. |
| [**Older-adult burden**](https://diogonmpacheco.github.io/Diognosis/index.html?substances=amitriptyline,diazepam,diphenhydramine,oxycodone&tab=overview) | Each medicine can add sedation, confusion, or fall risk. Overview groups the main interaction findings while Clinician mode keeps evidence and mechanisms inspectable. |

<details>
<summary><strong>Deep demos</strong> — cases often missed when a checker only looks at parent drug names</summary>

<br>

The important signal may come from an active metabolite, a toxic metabolite, a blocked clearance pathway, or a genetic no-function state.

| Deep demo | Why it is often missed |
|---|---|
| [Azathioprine + allopurinol + TPMT/NUDT15 PM](https://diogonmpacheco.github.io/Diognosis/index.html?substances=azathioprine,allopurinol&genotype=TPMT:PM&genotype=NUDT15:PM&tab=genes-metabolites) | Allopurinol can push azathioprine down a more toxic route. The parent–metabolite view highlights 6-TGN accumulation, genotype context, and source-integrated evidence status. |
| [Capecitabine + DPYD PM](https://diogonmpacheco.github.io/Diognosis/index.html?substances=capecitabine&genotype=DPYD:PM&tab=genes-metabolites) | Capecitabine is designed to become 5-FU. If DPYD cleanup is weak, the active/toxic metabolite can accumulate, so toxicity can come from the metabolite rather than the parent drug. |
| [Irinotecan + UGT1A1 PM](https://diogonmpacheco.github.io/Diognosis/index.html?substances=irinotecan&genotype=UGT1A1:PM&tab=genes-metabolites) | Irinotecan becomes SN-38, the stronger active metabolite. UGT1A1 helps clear SN-38; the app shows this as toxic-metabolite accumulation with a why path. |
| [Bupropion + clopidogrel + nebivolol + CYP2D6 no-function](https://diogonmpacheco.github.io/Diognosis/index.html?substances=bupropion,clopidogrel,nebivolol&genotype=CYP2D6:null&tab=overview) | This stack hides several parent/metabolite directions at once: bupropion parent exposure, hydroxybupropion uncertainty, nebivolol clearance, and clopidogrel activation context. |
| [G6PD oxidant stack](https://diogonmpacheco.github.io/Diognosis/index.html?substances=rasburicase,primaquine,dapsone&genotype=G6PD:deficiency&tab=genes-metabolites) | These drugs look unrelated by name, but all can stress red blood cells. The app groups G6PD risk with toxic-metabolite and oxidant-stress screening signals. |
| [Succinylcholine + BCHE/RYR1 risk](https://diogonmpacheco.github.io/Diognosis/index.html?substances=succinylcholine&genotype=BCHE:null&genotype=RYR1:present&tab=genes-metabolites) | The issue is not a common drug-drug pair. BCHE weakness can make paralysis last too long, while RYR1/CACNA1S context flags malignant-hyperthermia susceptibility. |

</details>

You can also build custom share links:

```
https://diogonmpacheco.github.io/Diognosis/index.html?substances=warfarin,ibuprofen&tab=overview
```

The plain-language Patient view is the default public experience. Add `audience=clinician` for the fuller mechanistic review surface.

---

## Privacy

Diognosis ships as a static client-side app. It does not use accounts, analytics, cookies, tracking pixels, backend logging, or medication-data collection. Searches, medication stacks, genotype settings, and pasted report rows stay in your browser.

There are no routine third-party runtime requests. Evidence links, demo links, and GitHub feedback links are only opened when selected.

## What It Shows

Most interaction checkers return isolated warnings. Diognosis instead shows how a medication stack behaves as a **connected system**: parent drugs, active metabolites, toxic metabolites, pharmacogenomic phenotypes, enzyme and transporter capacity, PK curves, receptor burden, Beers-style flags, washout timing, evidence, and pathway explanations.

The goal is not to replace clinical judgment. It is to make mechanism, timing, actor-level changes, and source-linked support visible enough for education, research, review workflows, and pharmacist or clinician verification.

> **⚠️ Diognosis is not a clinical decision system.** Source-linked evidence does not equal clinical validation. Warnings are mechanistic review signals, and severity should not be treated as clinically final without appropriate professional judgment.

## Data Governance

Diognosis V1 ships committed, source-linked static data. There is no active enrichment pipeline in the fork path: new evidence should be added directly to the source data with identifiers, boundary notes, and validation passing.

Source-linked does not mean professionally reviewed. Public evidence can be source-integrated for V1 without claiming professional sign-off, and future professional clinical reviews remain a separate metadata layer.

## Current Limitations

Diognosis is intentionally conservative about what it claims:

- PK curves use a one-compartment model or relative-exposure fallback — they **do not** replace therapeutic drug monitoring, multi-compartment/nonlinear PK models, or active-metabolite clinical interpretation.
- Extreme exposure shifts may be capped for display clarity.
- Source-linked evidence is included for V1 traceability, but professional sign-off is not claimed unless explicit sign-off metadata exists.

---

## Launch Stats

<!-- DIOGNOSIS_STATS_START -->
- **1549 drugs** in DRUG_DB
- **502 evidence entries** in STUDY_DB (269 with PMIDs; 502 source-integrated for V1; 0 with v3 professional sign-off)
- **3183 interaction pairs** (1610 severe, 1538 moderate, 35 mild)
- **2817 metabolite entries** across **1549 parent substances** (2375 first-class metabolite actors)
- **1407 absolute PK simulation profiles** with relative fallback for half-life-only drugs
- **69 genotype genes** and **588 receptor score profiles**
- **1251 RxNorm identity mappings**, **42 PGx marker rows**, and **14 CPIC-linked action summaries**
- **218 Beers flags** and **1411 washout rules**
- **3264 KB** generated bundle (2376 lines)
<!-- DIOGNOSIS_STATS_END -->

---

## How To Use

1. Open the [live Diognosis app](https://diogonmpacheco.github.io/Diognosis/).
2. Search for medications, supplements, foods, or substances.
3. Use **Patient mode** for plain-language priority signals and discussion questions, or **Clinician mode** for Overview, Mechanisms, Genes + Metabolites, Timing + Levels, and Evidence.
4. Set genotype phenotypes where relevant, or paste supported PharmGx report rows in the pharmacogenomics panel.
5. Treat every result as an explanation to review, **not as medical advice**.

> **Tip:** The Reviewer Console is not part of the normal V1 surface. It is available only through `?reviewer=1` for data review, QA, and contribution workflows; reviewer mode forces the clinician-style surface instead of mixing with Patient mode.

For internals, data structures, build instructions, and validation workflow, see [Technical Notes](docs/TECHNICAL.md) and the [Data Model](docs/DATA_MODEL.md). For launch readiness, see the [Launch QA Matrix](docs/LAUNCH_QA_MATRIX.md), [Public Trust Model](docs/PUBLIC_TRUST.md), and [Launch Data Trust Audit](docs/LAUNCH_DATA_TRUST_AUDIT.md). For redesign or wrapper apps, the built page exposes a small `window.DIOGNOSIS_V1` runtime handoff contract documented in [Technical Notes](docs/TECHNICAL.md#runtime-handoff-contract).

GitHub Pages uses the workflow in `.github/workflows/pages.yml` to build the app from `src/` with the lean `npm run pages:check` deploy gate; tagged releases, public launch claims, and clinical-review milestones use the deeper `npm run release:check`.

---

## Contribute / Review Data

Diognosis contains source-linked data. **No evidence entry has professional sign-off metadata yet.** Source integration means the claim is traceable to a committed source; it does not mean the claim has been clinically verified.

> **The safety contract is simple:** a warning should explain the pathway, affected actor, predicted direction, and supporting evidence. Severity should not be treated as clinically final without explicit professional sign-off.

Helpful contributions include data review, missing evidence refs, duplicate or stale interaction reports, reproducible app bugs, and focused pull requests. Use the report links on warning and evidence cards, or start with the priority list in [Launch Data Trust Audit](docs/LAUNCH_DATA_TRUST_AUDIT.md). Cite public sources such as labels, guidelines, PubMed records, PMIDs, DOIs, or URLs, and keep professional sign-off metadata separate until an appropriate reviewer signs off.

---

## License

Diognosis is open source under the [MIT License](LICENSE).

You can use, modify, and build on it freely. If you use Diognosis in another project, please share where it is being used and include a link back when practical:

```
https://github.com/diogonmpacheco/Diognosis
```

This attribution request is appreciated, but the license remains permissive.

---

## Disclaimer

> **⚠️ Diognosis is a mechanistic medication intelligence platform for educational and source-linked review.** It is **not** medical advice, **not** a clinical decision support system, and **not** professionally signed off. Source-linked evidence does not equal clinical validation. **Always consult a qualified doctor or pharmacist before making changes to medications.**
