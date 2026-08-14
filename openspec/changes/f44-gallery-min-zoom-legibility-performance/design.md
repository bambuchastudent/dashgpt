# Design

## UX contract

Minimum density remains a whole-selection semantic overview. F44 changes the smallest representation from color-only to color-plus-text: every mounted tile renders one clipped identity/content cue even when F32 selects heat-map or overflow mode.

For compact tiles, the existing title remains and a one-line summary cue becomes visible. For heat-map/overflow tiles, the tile exposes a single short cue derived from summary text when available and otherwise from title text. The cue is intentionally clipped rather than allowed to grow the tile, so text never changes the overview plan or removes cards from the board.

## Rendering

F44 stores the short cue on each card as presentation-only DOM state and renders it through a lightweight pseudo-element in heat-map/overflow mode. This avoids cloning card bodies or adding thousands of extra interactive nodes. Native/accessibility identity remains available from the canonical title.

## Zoom performance

Two expensive paths are narrowed:

1. Transient pinch/trackpad updates are coalesced so CSS geometry variables are written at most once per animation frame. The logical visual scale is still updated immediately so gesture math remains continuous.
2. FLIP reflow animation is bounded to small/medium boards. Large boards commit directly without capturing two `getBoundingClientRect()` snapshots for every card.

The threshold is a presentation-performance guard only; it does not affect card presence, ordering, focusability, or open behavior.

## F32 refresh separation

The F32 observer currently uses the same full refresh path for card-tree mutations, density-detail changes and resize. F44 splits these paths:

- card-tree changes and explicit sort changes may re-materialize/sort/palette the current board;
- density-detail changes and viewport resize only recompute the overview plan and text presentation.

This preserves ordering semantics while avoiding Vault materialization and sort work during ordinary zoom interaction.

## Compatibility

No stored Card schema, Vault event, Dash membership, semantic palette, sort preference, or continuation contract changes. The implementation remains shared by My Dash and Semantic Dash Gallery roots.
