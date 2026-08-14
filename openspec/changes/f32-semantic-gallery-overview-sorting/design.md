## Context

Feature 8 already owns gallery density, semantic hue presentation, gestures, focus anchoring, complete membership at every density, and local presentation state. Feature 18 makes that gallery the primary My Dash surface. F32 changes presentation order and minimum-density geometry only.

## Goals

- Default to chronological newest-first ordering over the current selection.
- Offer deterministic Color and Tag ordering without mutating cards.
- Keep the exact selected card-ID set under every mode and density.
- Make minimum zoom show the whole board for realistic large memories, including roughly 2,000 cards.
- Keep every card mounted and reachable if an extreme collection still exceeds the heat-map floor.
- Apply one implementation to My Dash and Semantic Dash member galleries.

## Decisions

### Selection remains upstream of ordering

The gallery receives the complete accessible selection produced by All, search, category, favorite, or Dash logic. Ordering operates only on that array.

### Time is the default

Time compares the latest valid value among `updatedAt`, `publishedAt`, and `createdAt`, newest first. Meaningful `created`, `updated`, `dash.add`, and `dash.remove` activity may supply a newer mutation timestamp when present. Stable card ID settles exact ties. Open, source-open, and continue activity are intentionally excluded so merely viewing an older card does not make it look new.

### Color order reuses existing hue

Color sorts by the existing deterministic `semanticHue(result)` coordinate. Exact hue ties use Time, then stable ID. The mode never changes or persists color.

### Tag order uses canonical tag precedence

Tag derives one primary group from the first normalized non-empty `result.tags` entry. Cards without a useful tag use a final `~untagged` group. Inside a tag group, Time applies, then hue, then stable ID. A multi-tag card still appears exactly once.

F32 consumes canonical tags and does not classify, import, enrich, or backfill them.

### Sort preference is isolated versioned presentation state

F32 stores only `sortMode: time | color | tag` under the dedicated browser key `dashgpt.demo.gallery-sort.v1`, defaulting to `time` when absent or malformed. Feature 8's existing gallery-state key remains untouched and continues to own density, active filters/query, focus hints, and remembered ordering metadata.

Keeping the new preference isolated avoids a migration of unrelated presentation state and means existing Feature 8 state remains byte-for-byte compatible. Sort mode is device-local presentation state and never enters canonical cards, Vault events, search state, or Dash membership.

### Minimum density has two fit tiers

At density index 0 the controller computes an overview plan from current grid width, available viewport height, mounted card count, gap, and visual target floors.

The first tier is a compact identifiable card: approximately 56x42 CSS px on desktop and 44x36 CSS px on narrow mobile. It keeps semantic color, category, and a short title cue.

If the complete selection cannot fit at that floor, the same planner switches to a semantic heat-map tier rather than immediately falling back to scrolling. Heat-map targets are approximately 10x10 CSS px on desktop and 6x6 CSS px on narrow mobile, with smaller gaps. At this tier title/category text is visually hidden, but each canonical card remains one distinct semantic-color tile, retains its focus/open behavior and accessible name, and receives a native hover title cue.

For each tier and candidate column count, rows are `ceil(count / columns)` and tile width/height come from the available geometry. The chosen candidate maximizes the limiting normalized tile dimension. A representative ~2,200-card collection is expected to fit in the heat-map tier on desktop and 390px mobile geometry.

### Extreme collections use truthful overflow

Only if the full selection cannot fit even at the heat-map visual floor does the planner select deterministic minimum-map geometry and allow rows to extend vertically. Every selected card remains mounted, focusable, and reachable through ordinary scrolling. F32 does not paginate, sample, hide semantic groups, virtualize membership, or collapse multiple cards into one aggregate tile.

### Overview tiles remain navigable

Compact overview cards keep semantic color and a text identity cue. Heat-map tiles keep one visual tile per canonical card, semantic color, focus outline, existing card activation, accessible `aria-label`, and native hover title. Zooming back in restores normal Feature 8 card content because F32 changes presentation only.

### My Dash and Dash galleries share one path

A small post-render controller observes the existing `.gallery-region` surfaces. It operates only on already-rendered canonical `.result-card` children: it may reorder those same nodes and apply overview geometry, but it never creates or removes membership. This lets My Dash and accepted Semantic Dash member galleries share one path without duplicating search, Dash, or card-rendering logic.

Both surfaces expose Time, Color, and Tag through the same ordering primitives and persisted sort preference. Sort choice is presentation state, not part of the membership selection key.

### Recompute overview on meaningful change

The planner runs when minimum density is committed, viewport/root geometry changes, or mounted card membership changes. Other density levels retain Feature 8 responsive card-width behavior and focus anchoring. DOM reordering is skipped when the current card-ID sequence already matches the requested order so the observer cannot create a self-triggered reorder loop.

## Verification

Deterministic tests cover Time, Color, Tag, membership invariance, isolated sort-state behavior, 20/50/100-card compact fit, ~2,200-card heat-map fit, extreme-collection overflow, and narrow mobile geometry. Browser tests cover controls, persistence, full mounted membership, heat-map activation, and no horizontal overflow.

## Trade-offs

Pure Time no longer keeps themes contiguous by default; Color and Tag are the explicit semantic alternatives. Heat-map tiles intentionally stop being text-readable at very large counts: their purpose is whole-memory orientation by semantic color and relative density, while hover/focus/open and zoom-in provide identity/detail. Extreme collections beyond the map floor still use truthful vertical overflow instead of fake one-pixel compliance.
