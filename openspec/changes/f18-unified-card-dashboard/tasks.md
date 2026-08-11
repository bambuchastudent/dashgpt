# Tasks

## 1. Spec gate and current-state inspection
- [x] Confirm `develop`, active PRs, and that `f18-unified-card-dashboard` is free.
- [x] Inspect current Semantic Dashes, Semantic Gallery, Product Board, continuation, onboarding, Vault/storage entry points.
- [x] Record Graphify/Serena availability and fallback inspection method in the Impact Manifest.
- [x] Strictly validate `f18-unified-card-dashboard` before production-code changes.

## 2. Unified shell
- [x] Replace personal-home Living Topics + Results information architecture with one `My Dash` shell; keep the old Dash mount hidden only for Feature 7 controller compatibility.
- [x] Add compact `My Dashes` navigation with permanent My Dash first item.
- [x] Keep selected saved-Dash title visible when navigation is collapsed.
- [x] Keep existing storage/Result creation contracts available without adding a new persistence model.

## 3. View-state and search composition
- [x] Add explicit home / temporary / saved-Dash gallery context state.
- [x] Preserve existing search/category/favorite behavior for My Dash.
- [x] Mark non-default home selections as unsaved and prevent empty saves.
- [x] Add saved-Dash search with `In this Dash` default and reversible `All cards` scope using the existing My Dash gallery.
- [x] Clearing widened search restores the source saved Dash.

## 4. Saved Dash integration
- [x] Reuse current Semantic Dash revisions/materialization and Review-mode save path.
- [x] Route saved-Dash members through the existing Semantic Gallery controller.
- [x] Preserve overrides, refresh, edit, delete-without-Result-delete, proposals, activity, continuation, and privacy behavior by composing around Feature 7 rather than replacing it.
- [x] Prevent silent duplicate saves of equivalent temporary selections.

## 5. URL/history and Product Board compatibility
- [x] Keep `/demo/` canonical for My Dash.
- [x] Preserve existing saved Dash and Result deep links.
- [x] Preserve route context through full navigation and existing popstate handlers; add adapter resynchronization for saved/home route surfaces.
- [x] Preserve `/demo/dash/dashgpt-product/` and adapt only its shell to `Dash: DashGPT Product Board`, `Cards`, and `Back to My Dash`.

## 6. Localization and mobile UX
- [x] Add one RU/EN dictionary boundary for unified-shell labels with EN fallback.
- [x] Reuse the same localization boundary from routing and Product Board shell adapters.
- [x] Add 360px no-overflow and compact saved-Dash navigation coverage.
- [x] Preserve existing Semantic Gallery keyboard navigation/focus-restoration implementation and verifier coverage.

## 7. Regression coverage
- [x] Add deterministic verifier coverage for virtual My Dash, temporary selection state, saved-Dash reference ownership and equivalent-membership duplicate detection.
- [x] Add Playwright coverage for home search/save, saved-Dash search, reversible all-card scope, Product Board unified context, and the 360px flow.
- [ ] Confirm immutable Result, Semantic Dashes, Semantic Gallery, Structured Continuation, Vault, GitHub storage, MCP/Worker, Share import, onboarding, Product Board and all new browser gates are green on the final implementation commit.

## 8. Verification and PR
- [ ] Run focused final verification for changed files/contracts on the final implementation commit.
- [ ] Run one authoritative final full repository/browser verification through existing CI/current scripts.
- [ ] Re-run strict OpenSpec validation after the final spec/task updates.
- [x] Open separate draft PR #33 against `develop` with the OpenSpec change and compatibility/verification notes.
- [ ] Mark PR ready only after the final strict OpenSpec and full repository/browser gates are green.
