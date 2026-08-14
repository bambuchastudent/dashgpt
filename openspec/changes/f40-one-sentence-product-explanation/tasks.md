# Tasks

## 1. Spec gate

- [x] Inspect current public header copy, branding metadata, current product model and overlapping branding OpenSpec history.
- [x] Create a dedicated proposal, design and spec delta for the one-sentence product explanation.
- [x] Strictly validate `f40-one-sentence-product-explanation` before production-code edits.

## 2. Product copy

- [x] Replace the abstract public subtitle with the canonical one-sentence explanation.
- [x] Align meta, Open Graph, Twitter/X and manifest descriptions with the canonical explanation.

## 3. Regression coverage

- [x] Update deterministic branding verification to assert visible and metadata copy.
- [x] Update Playwright branding coverage to assert the visible explanation.

## 4. Verification and integration

- [x] Run targeted verification on the final implementation content: deterministic branding verification passed and both desktop/mobile Playwright branding tests passed.
- [x] Run canonical `npm run verify:full` once on the final implementation content. The run reached an unrelated existing ChatGPT history-import assertion at `scripts/verify-chatgpt-history-import.mjs:272` (`6 !== 5`); the F40-specific verification passed before that failure.
- [x] Verify the public shell in a relevant mobile viewport through the `mobile-chromium` Playwright project (390×844).
- [ ] Merge the dedicated PR into `develop` after reviewing the unrelated full-suite failure boundary.
