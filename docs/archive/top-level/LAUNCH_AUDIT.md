# Diognosis Launch Audit

Date: 2026-06-09

This audit covers engineering consistency, release metadata, automated validation, and data-integrity checks for the public Diognosis static app and its MedCheck Engine module. It does not replace pharmacist, physician, or domain-expert review of individual clinical claims.

## Scope

- README, changelog, version metadata, generated stats, and public bundle consistency
- Data graph references across drugs, evidence entries, DDI pairs, route fractions, metabolites, and trust flags
- Severe interaction provenance coverage
- Runtime smoke and regression behavior for representative medication and genotype stacks
- Pending-review badge behavior for unreviewed enrichment drafts

Browser link behavior was excluded from this pass because it was manually tested before the audit.

## Automated Gates

The release gate rebuilds the app and runs:

- Metadata verification
- Database audit
- Regression checks
- Smoke checks
- Strict validation
- Whitespace checks
- Evidence ledger check
- Genotype gap audit

Current release stats:

- 625 drugs
- 456 evidence entries
- 627 interaction pairs
- 57 genotype genes
- 33 metabolite actors
- 52 receptor score profiles
- 456 evidence entries pending professional review
- 295 launch-enrichment entries marked `reviewRequired:true` for internal enrichment/scoring control
- 229 internal launch-enrichment entries feed graph confidence calculations
- 155 internal launch-enrichment entries feed DDI evidence-profile calculations

## Additional Audit Checks

The launch audit also checked for:

- Duplicate drug names
- Duplicate DDI pairs
- Missing DDI drug references
- Missing evidence references
- Conflicting trust flags, such as entries marked both professionally reviewed and review-required
- Draft evidence entries not marked review-required
- Severe DDI pairs without evidence references
- Invalid route fractions
- Orphan metabolite parent links
- Runtime errors across source-linked and mixed medication/genotype stacks
- Genotype coverage gaps with launch-blocking null impact scores

No blocking issues were found in those checks.

## Fixes Applied

- Updated release date metadata from 2026-05-29 to 2026-06-03.
- Added a v3.5.5 changelog entry covering the PharmGx importer, pending-review evidence handling, severe-pair provenance batch, and latest validation pass.
- Rebuilt generated stats and the single-file app bundle.
- Added genotype panel coverage for ABCB1, CYP1A2, CYP3A4, GSTM1, UGT2B7, MTHFR C677T, and GABRG2 risk-marker handling.
- Removed bundled OpenPGx-specific audit language; the gap audit now supports optional local external PGx catalogs without shipping third-party catalog data.
- Refreshed the genotype gap audit: 0 critical and 0 high-priority panel gaps remain for launch.

## Residual Risks

- All evidence entries remain pending professional review; no current evidence row should be presented as professionally verified.
- The 295 `reviewRequired:true` launch-enrichment entries are visible for review workflows and can feed calculations through explicit refs or support-key matching, but that internal flag does not mean the remaining entries are professionally reviewed.
- Diognosis and the MedCheck Engine are explanatory and educational tools, not clinical decision support systems.
- The PharmGx importer accepts normalized phenotype and risk-marker rows; it is not a raw DNA or star-allele caller.
- D3.js is vendored locally and bundled at build time for graph visualization; the privacy/static audit now fails on external runtime resources, tracking surface, unexpected storage, or live Open Targets API calls.
- A public 1.0 release still needs a product decision on tagging. Recommendation: publish the current engine as a public preview, then tag `v1.0.0` after review UX and DNA-import hardening land.
