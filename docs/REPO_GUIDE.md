# Diognosis Repo Guide

This is the plain-English map for working in the Diognosis repo without having to understand every internal script.

Diognosis is a static browser app. The live site is built from committed source files, committed data files, and generated public reference files. There is no backend runtime for normal use.

## Start Here

Most work fits into one of three buckets:

| Work | Edit these files first | Then run |
|---|---|---|
| App UI or behavior | `src/index.template.html`, `src/main.js`, `src/ui/`, `src/engine/` | `npm test` |
| Medication, evidence, gene, PK, or safety data | `src/data/*.js` except generated files | `npm test`, then `npm run pages:check` |
| Public reference / guide content | `data/medication-class-guides.json`, `src/data/*.js`, docs | `npm run pages:check` |

Do not treat the `scripts/` folder as a manual checklist. Most scripts are internal checks called by a smaller set of commands.

## Commands That Matter

| Command | When to use it | What it means |
|---|---|---|
| `npm test` | Fast local confidence check after normal changes | Builds the app, runs smoke/regression checks, validates data strictly, and checks evidence citations. |
| `npm run pages:check` | Before pushing changes that should go live | Runs the same practical gate used by the GitHub Pages workflow, including generated public pages and reference files. |
| `npm run release:check` | Before launch claims, tagged releases, or clinical/data confidence claims | Runs the deep V1 audit gate. This is intentionally heavier than the live deploy check. |
| `npm run build` | Only when you need a local root `index.html` | Generates a local bundle. The root `index.html` is ignored and should not be edited by hand. |

The GitHub Pages workflow runs `npm run pages:check` on `main`, then uploads the generated/static site files.

## Source Of Truth

These are the files people should usually review and edit:

| Area | Files |
|---|---|
| Main app shell and styling | `src/index.template.html` |
| App boot and shared state | `src/main.js` |
| User interface | `src/ui/` |
| Interaction and pharmacology logic | `src/engine/` |
| Curated medication, gene, metabolite, PK, and evidence data | `src/data/` |
| Medication class guide source | `data/medication-class-guides.json` |
| Static assets | `assets/`, `manifest.json`, `robots.txt`, root app icons, `og-image.png` |
| Human-facing docs | `README.md`, `docs/` |

Generated files should be regenerated from source, not manually edited.

## Generated And Public Artifacts

Some generated files are intentionally committed because the live site, public docs, or machine-readable reference layer need them.

| File or folder | Produced by | Commit it? | Edit by hand? |
|---|---|---|---|
| `index.html` at the repo root | `npm run build`, `pages:check`, `release:check` | No. It is ignored locally. | No |
| `src/data/generatedStats.js` | `scripts/gen-stats.js`, called by `build.js` | Yes, when it changes from intended source/data changes. | No |
| Launch stats in `README.md` and launch docs | `scripts/gen-stats.js`, called by `build.js` | Yes, when they change from intended source/data changes. | No |
| `reference/index.html` | `scripts/generate-reference-layer.js` | Yes | No |
| `data/diognosis-facts.json` | `scripts/generate-reference-layer.js` | Yes | No |
| `data/diognosis-facts.jsonl` | `scripts/generate-reference-layer.js` | Yes | No |
| `llms.txt` | `scripts/generate-reference-layer.js` | Yes | No |
| `sitemap.xml` | `scripts/generate-reference-layer.js` | Yes | No |
| `medication-classes.html` | `scripts/generate-medication-class-pages.js` | Yes | No |
| `medication-class-examples.html` | `scripts/generate-medication-class-pages.js` | Yes | No |
| `manifest.json`, `icon-*.png`, `og-image.png`, `robots.txt` | Static public site assets | Yes | Usually no |
| `dist/` | GitHub Pages workflow | No | No |
| `.tmp/`, `docs/audits/`, old report outputs | Local checks and audits | No | No |

If a generated file changes after `npm run pages:check`, commit it only when the source change explains the generated difference.

## Script Map

Directly useful scripts are exposed through `package.json` commands. Prefer those commands.

| Script area | Purpose | Usual action |
|---|---|---|
| `scripts/pages-check.js` | Live deploy gate | Run through `npm run pages:check`. |
| `scripts/release-check.js` | Deep V1 release gate | Run through `npm run release:check`. |
| `scripts/test-gate.js` | Local test bundle | Run through `npm test`. |
| `scripts/generate-reference-layer.js` | Builds machine-readable reference facts, JSONL, `llms.txt`, and sitemap | Let `pages:check` run it, or run directly only when debugging reference drift. |
| `scripts/generate-medication-class-pages.js` | Builds medication class public pages | Let `pages:check` run it. |
| `scripts/audit/` | Individual safety, privacy, data, UI, and release audits | Do not run one-by-one unless a gate fails and points there. |
| `scripts/lib/` | Shared helper code for the gates | Do not run directly. |
| `scripts/reference-snapshots/` | Committed validation baselines | Do not edit unless intentionally accepting a data-contract change. |

## What Can Be Ignored

These are not part of the source people should review during normal app work:

- `.tmp/`
- `dist/`
- root `index.html`
- untracked audit/report outputs
- individual audit script names, unless a failing command points to one

These can usually be deleted locally if they are getting in the way, because the repo either ignores them or regenerates them.

## What Not To Delete Casually

Keep these unless a separate cleanup proves they are unused:

- `scripts/pages-check.js`, `scripts/release-check.js`, and anything they call
- `scripts/audit/` files called by `release:check`
- `scripts/reference-snapshots/*.json`
- committed public reference files under `reference/`, `data/diognosis-facts.*`, `llms.txt`, and `sitemap.xml`
- committed generated public pages for medication class guides

Those files may look like extra machinery, but they currently protect the live app, the public reference layer, or the V1 safety boundary.

## Simple Release Flow

1. Make the source or data change.
2. Run `npm test`.
3. Run `npm run pages:check` before anything that should go live.
4. Run `npm run release:check` before public launch claims, version tags, or major data-confidence claims.
5. Review changed files.
6. Commit source changes and any generated tracked artifacts that came from those changes.
7. Push `main`; GitHub Pages builds and deploys the live site.

For most day-to-day work, `npm test` plus `npm run pages:check` is the practical path.
