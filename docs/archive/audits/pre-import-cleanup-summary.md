# Pre-Import Cleanup Summary

## Date

2026-06-15

## Changes Completed

- Risk-marker normalized findings now surface modeled risk markers such as G6PD, BCHE, RYR1/CACNA1S, HLA-B, and HLA-A contexts as review prompts in the shared finding model.
- Toxic-metabolite active-moiety rows can show risk-marker toxic context without implying a modeled exposure increase.
- Evidence and Review surfaces are lazily rendered when opened, while preserving diagnostics, raw paths, and evidence ledgers.
- Overview cards now show compact why summaries; detailed causal chains remain in Mechanisms and raw path JSON remains in Review.
- Persistence timeline rows are deduplicated by meaningful actor, parent, persistence type, and risk window.
- The legacy metabolite panel is now labeled as a raw/supporting metabolite map and collapses by default when interpreted parent-metabolite rows exist.
- Mobile guards were added for active-moiety direction cards and warning-path JSON overflow.
- Timing + Levels burden wording now explains why persistence and accumulation can affect medication-burden flags.

## Test Commands

- `npm run build` — pass
- `npm run smoke` — pass
- `npm run regression` — pass
- `npm run validate` — pass
- `npm run validate:strict` — pass
- `npm test` — pass
- `npm run launch:qa` — pass
- `npm run release:check` — pass

## Remaining Follow-Up

- Continue to monitor Evidence and Review density as more local datasets are added.
- Consider adding lightweight UI filters for large Review subsections if future local scenarios become harder to scan.
