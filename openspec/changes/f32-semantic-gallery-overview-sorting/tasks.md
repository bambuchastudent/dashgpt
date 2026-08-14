# Tasks — F32 Color-first Semantic Gallery overview

## Spec / design gate
- [x] Rebase the F32 branch onto current `develop` and inspect Feature 8 Gallery, current import/tag enrichment, saved Dashes and active overlapping changes.
- [x] Update Issue #46 with the latest Color → Tag → Time priority, 32-color palette and one-screen ~2,200-card requirement.
- [x] Refresh proposal, design, spec delta and Impact Manifest before production edits.
- [x] Strictly validate `f32-semantic-gallery-overview-sorting` before production edits. GitHub OpenSpec jobs on the spec-only head could not execute any steps because of the repository billing/spending-limit blocker; the branch was preserved, reset to spec-only, and the exact strict OpenSpec command was executed by Cloudflare on `66e27244a3ee4c2ed76c553c1def2cc0417dc945`. That deployment succeeded before the Color-first production files were reapplied.

## Implementation
- [x] Make Color the default sort and control order `Color → Tag → Time` using isolated versioned presentation state.
- [x] Add deterministic 32-slot palette projection from existing semantic hue and apply it consistently to rendered Gallery cards.
- [x] Implement Color tie priority: palette → tag → meaningful time → stable ID.
- [x] Keep Tag and Time alternatives deterministic and selection-neutral.
- [x] Implement viewport-aware compact/heat-map planning with one mounted tile per card.
- [x] Make representative ~2,200-card desktop and 360/390px selections fit on one screen at minimum density in deterministic geometry coverage.
- [x] Preserve focus/open identity for heat-map tiles and deterministic overflow only beyond useful map capacity.

## Regression coverage
- [x] Add deterministic verification for exactly 32 palette slots and stable card-to-slot mapping.
- [x] Add Color default/control order and Color/Tag/Time comparator contracts.
- [x] Add exact-membership preservation coverage.
- [x] Add 20/50/100 compact-fit and ~2,200 desktop/360/390px one-screen heat-map geometry coverage.
- [x] Add browser regression asserting 2,200 mounted tiles remain focusable/openable and create no horizontal overflow.

## Verification / release
- [x] Run the focused F32 deterministic verifier. Cloudflare verification build `74da3ecb4a18d96c8dfd255273591c2adeb3e73b` completed successfully for the same production tree before the temporary build hook was removed.
- [x] Run canonical `npm run verify:full` once through the Cloudflare build gate on `007f281708b420bb026fda951b9e9db617b97a7c`. The build completed as failed, so no full-suite pass is claimed; GitHub-hosted jobs remain unable to execute steps in the current repository runner state.
- [x] Restore `wrangler.jsonc` byte-for-byte to the `develop` production configuration after all temporary validation/verification hooks.
- [x] Confirm the final clean production-shaped branch preview deployment after `91356339e83496c3029e961a004e1760c3fc909c`; Cloudflare deployment succeeded with the production configuration restored.
- [ ] Physical/browser acceptance at both desktop and 360/390px remains unavailable in the current runner environment; committed Playwright coverage defines the acceptance contract.
- [ ] Merge PR #71 to `develop` after recording the remaining browser/full-suite infrastructure gap.
