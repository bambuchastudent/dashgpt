# Tasks — F32 Color-first Semantic Gallery overview

## Spec / design gate
- [x] Rebase the F32 branch onto current `develop` and inspect Feature 8 Gallery, current import/tag enrichment, saved Dashes and active overlapping changes.
- [x] Update Issue #46 with the latest Color → Tag → Time priority, 32-color palette and one-screen ~2,200-card requirement.
- [x] Refresh proposal, design, spec delta and Impact Manifest before production edits.
- [ ] Strictly validate `f32-semantic-gallery-overview-sorting` before production edits.

## Implementation
- [ ] Make Color the default sort and control order `Color → Tag → Time` using isolated versioned presentation state.
- [ ] Add deterministic 32-slot palette projection from existing semantic hue and apply it consistently to rendered Gallery cards.
- [ ] Implement Color tie priority: palette → tag → meaningful time → stable ID.
- [ ] Keep Tag and Time alternatives deterministic and selection-neutral.
- [ ] Implement viewport-aware compact/heat-map planning with one mounted tile per card.
- [ ] Make representative ~2,200-card desktop and 360/390px selections fit on one screen at minimum density.
- [ ] Preserve focus/open identity for heat-map tiles and deterministic overflow only beyond useful map capacity.

## Regression coverage
- [ ] Verify exactly 32 palette slots and stable card-to-slot mapping.
- [ ] Verify Color default/control order and Color/Tag/Time comparator contracts.
- [ ] Verify sorting preserves exact membership.
- [ ] Verify 20/50/100 compact fit and ~2,200 desktop/360/390px heat-map fit.
- [ ] Verify heat-map cards remain focusable/openable and no horizontal overflow.

## Verification / release
- [ ] Run targeted deterministic verification during implementation.
- [ ] Run canonical `npm run verify:full` once on final head when a supported runner is available; record infrastructure failure truthfully if it cannot execute.
- [ ] Verify production-shaped branch preview at desktop and 360/390px.
- [ ] Merge PR #71 to `develop` after verification.
