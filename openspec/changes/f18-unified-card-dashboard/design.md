# Design: Unified Card Dashboard

## Architecture decision

The change keeps the existing domain model and collapses presentation, not storage. `Result` remains the durable card object; saved Semantic Dashes remain reference-only revisions over Result IDs; `My Dash` is a virtual home selection computed from currently eligible personal Results.

The implementation is intentionally additive around the existing Feature 7/8 controllers. `demo/unified-dashboard.js` owns the new shell and selection-save composition, while `demo/unified-dashboard-routing.js` preserves reversible search scope across saved-Dash and all-card contexts. The existing Result/Vault/Semantic Gallery renderers remain authoritative.

## View state model

The personal shell has three mutually exclusive gallery contexts:

1. `home` — `My Dash`, all eligible cards subject only to ordinary category/favorite filters.
2. `temporary` — the current search/filter-derived selection, explicitly marked unsaved.
3. `dash:<id>` — a materialized saved Semantic Dash.

The Semantic Gallery receives only the Result array for the active context. Density/ordering code therefore remains membership-agnostic and cannot change membership.

## URL/history

- `/demo/` is canonical home.
- Search/filter state stays on the home shell and is restored from existing versioned gallery UI state; it does not create a Result page or Results route.
- Existing `/demo/dashes/<dash-id>/` deep links remain valid and render the unified shell with `Dash: <name>` context.
- When a saved-Dash search widens to all personal cards, the same query moves to the existing `/demo/` gallery with reversible `scope=all&fromDash=<dash-id>` context instead of invoking a second renderer.
- Switching that temporary all-card context back to the saved Dash carries `q=<query>` to the saved-Dash route and restores the query there.
- Clearing an all-card query that originated in a saved Dash returns to the full source Dash.
- `/demo/dash/dashgpt-product/` remains the stable Product Board route and uses the unified `Dash: ...` / `Back to My Dash` context language.
- Existing Result routes remain unchanged.
- Browser back/forward continues to delegate to existing route handlers; the routing adapter observes route-surface changes so the visible unified context is rebuilt when required.

## My Dash

`My Dash` is reserved UI identity only. No `dashRevision`, Vault event, or storage object is created for it. The home selection is derived from the same personal Result set already loaded by the dashboard after access/publisher filtering.

The legacy Living Topics/Semantic Dashes DOM is retained only as a hidden compatibility mount for the existing Feature 7 controller. It is not exposed as a top-level user surface and does not create a parallel content model.

## Saved Dash navigation

A compact `My Dashes` control is rendered in the home header. It contains a permanent first item for `My Dash`, followed by current non-deleted saved Dash revisions. On narrow screens it behaves as a disclosure/bottom-sheet-style panel; on desktop it remains compact and collapsible.

Selecting a Dash uses the existing saved-Dash route and materialization logic. The selected Dash header always includes its true name, accessible member count, and a `Back to My Dash` action.

## Search and temporary selections

Home search continues to use the shared semantic ranker. Any non-empty query or non-default filter state changes the header to `Selection: <query/filter>` and `Not saved`. Empty selections cannot be saved.

Inside a saved Dash, search filters only currently materialized members by default. The scope control switches between `In this Dash` and `All cards`. `All cards` deliberately reuses the existing My Dash Semantic Gallery rather than cloning a card renderer; `fromDash` preserves the source context and allows the user to switch back with the same query. Clearing the widened query restores the full saved Dash.

Saving a temporary selection reuses the existing Semantic Dash Review-mode creation path. It derives a title from the query/category, retains Result references only, and requires explicit dialog confirmation. Exact membership duplicate detection runs before persistence and offers open-existing, update-existing, or save-with-another-name choices; no silent duplicate is allowed.

## Localization

A shared dictionary boundary in `demo/unified-dashboard.js` supplies new shell labels for `en` and `ru`, with English fallback. Runtime adapters reuse that boundary instead of introducing hardcoded alternate translations.

Required labels include My Dash, My Dashes, All cards, Saved Dash, Selection, Not saved, Save as Dash, Back to My Dash, In this Dash, All cards, and empty-state copy.

## Gallery reuse

`demo/semantic-gallery.js` remains the single ordering/density engine. Home and temporary searches use the existing main gallery; saved Dash members continue through the existing `renderDashMemberGallery` composition. Existing semantic hue, activity ordering, remembered order, focus restoration, zoom, and membership invariants remain intact.

No second saved-Dash or all-card card renderer is introduced by Feature 18.

## Product Board

The Product Board keeps its dedicated domain rendering and stable `/demo/dash/dashgpt-product/` route. `demo/unified-product-board.js` adapts only its shell copy/context: it presents `Dash: DashGPT Product Board`, `Saved Dash`, `Cards`, and `Back to My Dash`. Product Board data, immutable member Results, reconciliation, continuation, and status logic are untouched.

## Privacy and ownership

Eligibility is evaluated before a Result can enter home/search/Dash selections. Saved Dashes keep Result IDs only; deleting a Dash never deletes Results. Publisher/demo cards never become personal production-home content merely because a public catalog exists. Temporary selections remain browser UI state until explicit Review-mode save.

## Verification strategy

Repository discovery initially found no `verify:fast` or `verify:full` package aliases on `develop`; the authoritative gates were `npm run check` and `npm run test:browser`. Feature 18 adds aliases without changing those underlying semantics:

- `npm run verify:fast` syntax-checks the unified adapters and runs the deterministic unified-dashboard contract verifier.
- `npm run verify:full` expands to the existing full `npm run check` plus Playwright browser suite.

CI continues to run the repository's existing check/browser gates, which are semantically the same full verification. The final PR readiness decision requires both strict OpenSpec validation and the complete check/browser workflow to be green on the final implementation commit.

Required coverage:
- virtual My Dash creates no Dash revision;
- saved Dash navigation and deletion isolation;
- temporary search is not persisted;
- reference-only selection save and duplicate detection;
- saved Dash search scope and reversible all-card widening;
- gallery membership invariant across density changes;
- deep-link/back-forward context;
- Product Board route/shell compatibility;
- keyboard focus restoration through existing Gallery behavior;
- 360px unified-shell flow and horizontal-overflow check;
- existing immutable Result, Vault, continuation, Semantic Dash/Gallery, Product Board and Share import checks remain green.
