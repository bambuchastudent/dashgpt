## 1. Specification gate

- [x] 1.1 Inspect Feature 8 Semantic Gallery, Feature 18 My Dash, search/filter, Semantic Dash, and active PR overlap.
- [x] 1.2 Record the newest product decision in existing Issue #46 and supersede semantic-first recent-cluster default behavior.
- [x] 1.3 Prepare proposal, design, spec delta, tasks, and Impact Manifest for F32.
- [ ] 1.4 Strictly validate `f32-semantic-gallery-overview-sorting` before production-code changes. GitHub Actions is currently blocked before runner start by repository account billing/spending-limit state; structural validation was inspected manually but does not replace the canonical gate.

## 2. Ordering primitives and presentation state

- [x] 2.1 Add `time`, `color`, and `tag` deterministic ordering modes with Time as default.
- [x] 2.2 Ensure Time uses meaningful card/source timestamps rather than open/continue viewing activity.
- [x] 2.3 Preserve exact membership and semantic hue across every ordering mode.
- [x] 2.4 Persist sort mode in isolated versioned browser presentation state without rewriting Feature 8 gallery state.
- [x] 2.5 Add targeted deterministic ordering/state regression tests, including final untagged grouping.

## 3. Whole-board overview fit

- [x] 3.1 Extend the deterministic planner to compact-card and semantic heat-map fit tiers.
- [x] 3.2 Keep compact semantic color/category/title tiles when the full set fits at the readable compact floor.
- [x] 3.3 For realistic large histories around 2,200 cards, fit one semantic-color tile per canonical card when the heat-map floor permits.
- [x] 3.4 Preserve focus/open/accessible identity and a native hover cue for heat-map tiles.
- [x] 3.5 Add truthful overflow only after the heat-map floor is exceeded; never paginate, aggregate, sample, or hide cards.
- [x] 3.6 Recompute overview planning after relevant resize, density, and membership changes.
- [x] 3.7 Add deterministic 20/50/100 compact-fit, ~2,200 heat-map-fit, extreme overflow, and narrow-mobile planner tests.

## 4. UI integration

- [x] 4.1 Add visible Time/Color/Tag ordering control to My Dash.
- [x] 4.2 Apply the same ordering control/path to accepted Semantic Dash member galleries.
- [x] 4.3 Preserve current selection and canonical card nodes while changing ordering mode.
- [x] 4.4 Keep sort mode persistent across reload and compatible with search/category/favorite state.
- [x] 4.5 Add browser regression proving large heat-map membership plus desktop/narrow no-horizontal-overflow behavior.

## 5. Verification and delivery

- [x] 5.1 Run targeted deterministic ordering/planner verification during implementation; this caught and fixed untagged collation before delivery.
- [ ] 5.2 Run relevant unified-dashboard/browser checks for changed surfaces. Blocked because GitHub-hosted runner does not start while the account reports a billing/spending-limit issue.
- [ ] 5.3 Run canonical `npm run verify:full` once on the final code head. Blocked by the same GitHub-hosted runner issue.
- [ ] 5.4 Verify the production preview interactively on desktop and narrow mobile, including representative full-set overview and all three ordering modes. Cloudflare deployment succeeds, but interactive browser verification is not claimed yet.
- [x] 5.5 Update PR description with implemented capability, targeted test evidence, CI blocker, and preview link.
- [x] 5.6 Keep PR based on current `develop` and do not mix F28 tag-generation/import implementation into F32.
