# Feature 5 — Semantic Result cards

## Why

DashGPT cards currently use one visual treatment regardless of meaning, while category labels are discrete. The dashboard should make semantic neighborhoods visible at a glance without turning categories into a rigid color lookup table.

## What changes

- Give every Result a deterministic semantic visual coordinate derived from its category, title and tags.
- Render that coordinate as a subtle card heatmap/accent. Semantically related Results should look related; mixed/intermediate topics should land between category anchors.
- Keep the semantic color presentation-derived: immutable Result knowledge must not be rewritten just to change the renderer.
- Make Result details action-first: source chat and continuation are primary when available; Context Pack moves behind a secondary disclosure/menu.
- Results without a source chat still support continuation from their distilled Result summary.

## Acceptance

1. Existing cards visibly differ by semantic topic.
2. Food Results are visually close to one another; Home, Trips and DashGPT occupy distinct neighborhoods.
3. A Result's visual is deterministic across reloads but is not a fixed `category -> color` mapping: title/tags perturb the coordinate within the category neighborhood.
4. Card/detail UX does not put Context Pack on equal footing with the primary actions.
5. Immutable content hashes remain valid because renderer metadata is not added to durable content.
