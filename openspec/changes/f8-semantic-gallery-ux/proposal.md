## Why

The dashboard currently renders a static card grid in storage order. Semantic color exists, and Semantic Dashes are being specified separately, but the Result surface does not yet make nearby topics feel like memorable regions, prioritize recent work inside those regions, or let the user move naturally between overview and detail.

A large collection therefore becomes harder to scan even though DashGPT already has the information needed to present it as a memory gallery.

## What Changes

- Add a semantic gallery ordering layer that keeps related Results together and ranks activity only inside each semantic group.
- Record explicit Result interactions as append-only mutable Vault events without changing immutable Result knowledge or treating viewport appearance as activity.
- Add five internal density levels, from an all-items overview to a content-rich focus view.
- Support touch pinch, browser-supported trackpad pinch, a visible range control, and plus/minus buttons.
- Keep text at or below its existing 100% size with `fontScale = min(zoomScale, 1)`.
- Adapt card content predictably across compact, medium, and expanded detail levels while always preserving a semantic visual and readable identity.
- Preserve the current selection, filters, search query, gallery density, focus hint, and stable tie order across dashboard reloads.
- Keep zoom selection-neutral: all Results already selected by All, category/favorite filters, search, or a Semantic Dash remain mounted and available at every density.
- Add deterministic ordering, activity, zoom, responsive-layout, long-title, state-restoration, search-selection, and Dash-selection fixture tests.

## Capabilities

### New Capabilities

- `semantic-gallery-ux`: Stable semantic grouping, within-topic activity ordering, adaptive gallery density, input gestures, scale-aware card detail, and presentation-state restoration.

### Modified Capabilities

None. There are no promoted baseline capability specs under `openspec/specs/`. This change consumes the existing Result/dashboard selection and defines an adapter boundary for the concurrent `semantic-dashes` change without rewriting its domain contract.

## Scope Boundaries

This change does not alter semantic color generation, Result immutable fields or hashes, Dash definitions or membership rules, search relevance, storage-provider authorization, manual card dragging, graph relationships, pagination, browser-page zoom, or category navigation. A future category/color navigator remains a separate change.

## Impact and Intersections

- **Cards / Feature 5:** reuses the existing deterministic semantic visual coordinate and continuation-first actions; semantic colors remain presentation-derived and unchanged.
- **Semantic map:** uses a small adapter returning a stable semantic group and position. It reuses the shared Semantic Dashes concept normalizer, with current semantic-color anchors/category as fallback, while preserving the exact Feature 5 hue.
- **Semantic Dashes / Feature 7:** renders the already-materialized accepted-member array through the same gallery controller under `dash:<id>`. Gallery zoom never changes Dash membership, proposals, scope, or privacy eligibility; Dash-specific actions remain owned by Feature 7.
- **Dashboard / search / filters:** ordering runs only after the existing selection pipeline. Zoom never clears or recomputes category, favorites, query, or Dash scope.
- **Vault / Feature 6:** adds content-free `result.activity` events containing only Result ID, activity kind, and timestamp. Device-specific density/filter presentation stays in browser UI state rather than immutable Result content.
- **Compatibility:** existing Vault v1 payloads remain valid, Result content hashes stay byte-for-byte unchanged, and the operational `/demo/dash/` route remains unrelated.
