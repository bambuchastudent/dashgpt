# Design: Unified Card Dashboard

## Architecture decision

The change keeps the existing domain model and collapses presentation, not storage. `Result` remains the durable card object; saved Semantic Dashes remain reference-only revisions over Result IDs; `My Dash` is a virtual home selection computed from currently eligible personal Results.

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
- `/demo/dash/dashgpt-product/` remains the stable Product Board route and retains its existing Product Board behavior while using the same top-level navigation language.
- Existing Result routes remain unchanged.
- Browser back/forward delegates to existing route handlers and must restore the visible context header rather than showing stale home copy.

## My Dash

`My Dash` is reserved UI identity only. No `dashRevision`, Vault event, or storage object is created for it. The home selection is derived from the same personal Result set already loaded by the dashboard after access/publisher filtering.

## Saved Dash navigation

A compact `My Dashes` control is rendered in the home header. It contains a permanent first item for `My Dash`, followed by current non-deleted saved Dash revisions. On narrow screens it behaves as a disclosure/drawer-style panel; on desktop it remains compact and collapsible.

Selecting a Dash uses the existing saved-Dash route and materialization logic. The selected Dash header always includes its true name, accessible member count, and a `Back to My Dash` action.

## Search and temporary selections

Home search continues to use the shared semantic ranker. Any non-empty query or non-default filter state changes the header to `Selection: <query/filter>` and `Not saved`. Empty selections cannot be saved.

Inside a saved Dash, search filters only currently materialized members by default. A compact scope control can switch to all personal cards. Clearing the query restores the full source context.

For the first implementation slice, saving a temporary selection reuses the existing Semantic Dash Review-mode creation path. It derives a title from the query, retains Result references only, and requires the existing explicit confirmation path. Duplicate detection uses current saved Dash identity/membership before persistence; no silent duplicate is allowed.

## Localization

Add a small dictionary boundary for new shell labels with `en` and `ru`. Language is resolved from `document.documentElement.lang`/browser locale with English fallback. Existing legacy strings outside this PR remain unchanged unless they are on the unified shell.

Required labels include My Dash, My Dashes, All cards, Saved Dash, Selection, Not saved, Save as Dash, Back to My Dash, In this Dash, All cards, and empty-state copy.

## Gallery reuse

`demo/semantic-gallery.js` remains the single ordering/density engine. Home, temporary search, and saved Dash contexts all feed their selected Result IDs into that controller. Existing semantic hue, activity ordering, remembered order, focus restoration, zoom, and membership invariants remain intact.

## Product Board

The Product Board keeps its dedicated domain rendering and stable `/demo/dash/dashgpt-product/` route. Navigation back to the personal home uses the new `My Dash` wording. This PR does not rewrite Product Board data or status reconciliation.

## Privacy and ownership

Eligibility is evaluated before a Result can enter home/search/Dash selections. Saved Dashes keep Result IDs only; deleting a Dash never deletes Results. Publisher/demo cards never become personal home content merely because a public catalog exists. Temporary selections remain browser UI state until explicit Review-mode save.

## Verification strategy

Repository discovery found no `verify:fast` or `verify:full` package scripts on current `develop`; the existing gates are `npm run check` and `npm run test:browser`. This change will not silently pretend otherwise. Focused verifiers will be run through the existing script entry points, and CI remains the authoritative full gate unless the repository adds the requested aliases in-scope without changing their semantics.

Required coverage:
- virtual My Dash creates no Dash revision;
- saved Dash navigation and deletion isolation;
- temporary search is not persisted;
- saved Dash search scope;
- gallery membership invariant across density changes;
- deep-link/back-forward context;
- Product Board route compatibility;
- keyboard focus restoration;
- 360px unified-shell flow;
- existing immutable Result, Vault, continuation, Semantic Dash/Gallery and Share import checks remain green.
