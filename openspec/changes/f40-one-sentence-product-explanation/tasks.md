# Tasks

## 1. Spec gate

- [x] Inspect current public header copy, branding metadata, current product model and overlapping branding OpenSpec history.
- [x] Create a dedicated proposal, design and spec delta for the one-sentence product explanation.
- [ ] Strictly validate `f40-one-sentence-product-explanation` before production-code edits.

## 2. Product copy

- [ ] Replace the abstract public subtitle with the canonical one-sentence explanation.
- [ ] Align meta, Open Graph, Twitter/X and manifest descriptions with the canonical explanation.

## 3. Regression coverage

- [ ] Update deterministic branding verification to assert visible and metadata copy.
- [ ] Update Playwright branding coverage to assert the visible explanation.

## 4. Verification and integration

- [ ] Run targeted verification on the final implementation head.
- [ ] Run canonical `npm run verify:full` on the final implementation head.
- [ ] Verify the public shell in a relevant mobile viewport.
- [ ] Merge the dedicated PR into `develop` after verification passes.
