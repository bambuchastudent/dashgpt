# Tasks

## 1. Spec gate and current-state inspection
- [x] Confirm `develop`, active PRs, and that `f18-unified-card-dashboard` is free.
- [x] Inspect current Semantic Dashes, Semantic Gallery, Product Board, continuation, onboarding, Vault/storage entry points.
- [x] Record Graphify/Serena availability and fallback inspection method in the Impact Manifest.
- [ ] Strictly validate `f18-unified-card-dashboard` before production-code changes.

## 2. Unified shell
- [ ] Replace personal-home Living Topics + Results information architecture with one `My Dash` shell.
- [ ] Add compact `My Dashes` navigation with permanent My Dash first item.
- [ ] Keep selected saved-Dash title visible when navigation is collapsed.
- [ ] Keep storage/Result creation available without making them primary first-screen concepts.

## 3. View-state and search composition
- [ ] Add explicit home / temporary / saved-Dash gallery context state.
- [ ] Preserve existing search/category/favorite behavior for My Dash.
- [ ] Mark non-default home selections as unsaved and prevent empty saves.
- [ ] Add saved-Dash search with `In this Dash` default and `All cards` scope.
- [ ] Clearing search restores the source context.

## 4. Saved Dash integration
- [ ] Reuse current Semantic Dash revisions/materialization and Review-mode save path.
- [ ] Route saved-Dash members through the existing Semantic Gallery controller.
- [ ] Preserve overrides, refresh, edit, delete-without-Result-delete, proposals, activity, continuation, and privacy behavior.
- [ ] Prevent silent duplicate saves of equivalent temporary selections.

## 5. URL/history and Product Board compatibility
- [ ] Keep `/demo/` canonical for My Dash.
- [ ] Preserve existing saved Dash and Result deep links.
- [ ] Restore correct context after reload/back/forward/result return.
- [ ] Preserve `/demo/dash/dashgpt-product/` and Product Board behavior.

## 6. Localization and mobile UX
- [ ] Add one RU/EN dictionary boundary for unified-shell labels with EN fallback.
- [ ] Remove new hardcoded unified-shell labels from controllers.
- [ ] Verify 360px no-overflow and compact saved-Dash navigation.
- [ ] Preserve keyboard navigation/focus restoration.

## 7. Regression coverage
- [ ] Add deterministic verifier coverage for virtual My Dash, temporary selection non-persistence, saved-Dash reference ownership, deletion isolation, scope search, history context, Product Board compatibility, and zoom membership invariance.
- [ ] Extend Playwright coverage for the 360px unified flow.
- [ ] Keep immutable Result, Semantic Dashes, Semantic Gallery, Structured Continuation, Vault, GitHub storage, MCP/Worker, Share import, onboarding, and Product Board gates green.

## 8. Verification and PR
- [ ] Run focused current-repository verification for changed files/contracts.
- [ ] Run one authoritative full repository/browser verification through existing CI/current scripts.
- [ ] Re-run strict OpenSpec validation after implementation if the spec changes.
- [ ] Open a separate PR against `develop` with OpenSpec change link and explicit compatibility/verification notes.
