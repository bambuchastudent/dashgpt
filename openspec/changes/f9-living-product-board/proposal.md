# Proposal: Living Product Board

## Why

DashGPT currently has two diverging status surfaces: the real Result/Semantic Dash product UI and `/demo/dash/`, which renders a separately generated textual project-status snapshot. PR #18 (Semantic Dashes) and PR #19 (Semantic Gallery UX) are merged, while the textual status can remain stale. Product topics discussed in ChatGPT are not represented as independently trackable Results, and browser-local state cannot serve as a shared product board.

The product should dogfood its own primitives: durable Result cards remain the memory units and a saved Semantic Dash becomes the living product board.

## What changes

- Evolve the existing public `dashgpt-product` Semantic Dash into **DashGPT Product Board** with a stable `/demo/dash/dashgpt-product/` route and `/demo/dash/` compatibility entry point.
- Represent significant DashGPT product topics as ordinary Results with stable IDs, delivery status, product area, decision/current-state/next-action metadata, OpenSpec/PR/preview/production references, continuation instructions, timestamps, and provenance.
- Render board summary/status from current board Results instead of duplicating a manual status report.
- Add explicit stages: `idea`, `specified`, `in_development`, `merged`, `deployed`, `product_verified`, `blocked`, `archived`.
- Add deterministic review-mode reconciliation metadata for linked GitHub work. GitHub evidence may advance delivery state only through explicit rules and must not overwrite product decisions or private notes.
- Expose refresh/save timestamps, update source, stale/pending state, and a serious structured continuation package for the board.
- Add visible entry points from the normal demo/Dash surfaces.
- Keep Automatic mutation disabled for MVP.

## Initial board topics

- Semantic Dashes — merged (PR #18, OpenSpec `f7-semantic-dashes`).
- Semantic Gallery UX — merged; deployment/product verification represented separately (PR #19, OpenSpec `f8-semantic-gallery-ux`).
- Semantic Navigator — idea unless an existing OpenSpec change is found.
- Localization — idea unless an existing OpenSpec change is found.
- Developer Fast Path — idea unless an existing OpenSpec change is found.
- Structured Chat Continuation — idea until its own OpenSpec/PR exists.
- Chat-to-Result capture — idea.
- Portability/storage slices — represented explicitly rather than collapsed to one ambiguous done state.

## Scope boundaries

This change SHALL NOT:

- alter Feature 7 or Feature 8 completed OpenSpec history;
- store raw private chat transcripts on the public board;
- make browser `localStorage` the public board source of truth;
- add invisible automatic board mutation;
- treat `merged` as `deployed` or `deployed` as `product_verified`;
- implement the separate Semantic Navigator, localization, Structured Chat Continuation transport, Chat-to-Result capture, or remaining storage adapters themselves.

## Verification

- Strict OpenSpec validation before production code.
- Deterministic board fixture/status validation.
- Existing `npm run check` remains green.
- Route/UI contract covers both stable and compatibility board URLs.
- Result integrity checks continue to pass; board metadata must not silently rewrite previously published immutable knowledge.
- Manual preview verifies the board shows current topic states and navigation/continuation affordances on desktop and narrow mobile.

