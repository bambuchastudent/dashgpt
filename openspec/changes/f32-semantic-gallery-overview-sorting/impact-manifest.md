# Impact Manifest — F32 Color-first Semantic Gallery overview

## Directly changed

- Gallery sort/default presentation state.
- Gallery maximum-zoom layout planning.
- Semantic display-color projection to a 32-slot palette.
- Gallery bootstrap wiring and focused deterministic/browser regression coverage.

## Reused surfaces

- Feature 8 `semanticHue(result)` as the semantic source signal.
- Existing canonical cards and `.result-card` renderer.
- Existing Search/filter selection and saved Semantic Dash membership.
- Existing F28 canonical tags.
- Existing Vault activity events for meaningful timestamps.

## Intentionally unchanged

- Card/Vault schema and immutable content hashes.
- Import transport, retry/backoff and semantic tag generation.
- Search ranking/membership.
- Dash persistence/membership semantics.
- Storage providers and continuation behavior.
- Browser/page zoom; F32 remains internal Gallery density only.

## Risks

- Reordering a large mounted DOM set can regress interaction performance.
- Quantized colors could accidentally drift between densities if another renderer rewrites semantic CSS variables after F32.
- A stale Time-default presentation key could defeat the new Color-first product decision.
- A fixed-column implementation could regress the one-screen ~2,200-card overview on mobile.

## Verification

- Strict OpenSpec validation before production edits.
- Deterministic checks for 32 unique palette slots, stable palette assignment and Color/Tag/Time priority.
- Deterministic layout checks for 20/50/100 and ~2,200 cards at desktop and 360/390px widths.
- Browser coverage for control order/default, one-screen overview, all-card membership, focus/open behavior and no horizontal overflow.
- Canonical `npm run verify:full` once on final head when the repository runner can execute it; any infrastructure blocker is reported rather than treated as a pass.
- Production-shaped branch preview inspection before merge.
