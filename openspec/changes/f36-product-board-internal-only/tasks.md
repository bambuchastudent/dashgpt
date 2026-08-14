# Tasks — F36 Product Board internal-only navigation

## Spec / design gate
- [x] Inspect current `develop`, F9 Product Board spec, normal dashboard header and open PR overlap.
- [x] Create Issue #84 and dedicated OpenSpec proposal/design/spec delta/tasks/impact manifest.
- [ ] Strictly validate `f36-product-board-internal-only` before production edits.

## Implementation
- [ ] Remove the global Product Board action from `/demo/`.
- [ ] Preserve the direct Product Board compatibility route and existing project data/code.
- [ ] Keep Cards, Dashes, search, storage, import and continuation behavior unchanged.

## Regression coverage
- [ ] Add deterministic coverage proving the normal dashboard does not expose Product Board global navigation.
- [ ] Keep existing direct Product Board verification green.

## Verification / release
- [ ] Run targeted verification.
- [ ] Run canonical `npm run verify:full` once on the final head.
- [ ] Verify final branch preview at desktop and 360/390px widths.
- [ ] Merge the dedicated PR to `develop` after verification.
