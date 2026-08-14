# F44 — Gallery minimum-zoom legibility and performance

## Problem

F32 made it possible to keep very large card selections on one screen by switching minimum density from compact cards to a semantic heat map. In that heat-map representation all visible card content is hidden. The result preserves presence and color but loses the user's ability to understand what an individual card is about without opening or hovering it.

Large selections also make density changes feel sluggish. The current zoom path may measure every card before and after a committed density change for FLIP animation, while the F32 observer re-materializes and re-sorts the Gallery even when the only mutation is a density-detail attribute change.

## Proposed change

- Keep a visible, clipped short text cue on every minimum-density tile, including heat-map and overflow representations.
- Prefer a compact summary cue; fall back to the card title when no summary is present.
- Preserve the F32 whole-selection layout contract: no sampling, aggregation, pagination, or card removal to make room for text.
- Keep full accessible/native identity for tiny tiles where the visible cue is necessarily abbreviated.
- Avoid all-card geometry measurement/FLIP animation for large Gallery selections.
- Coalesce transient pinch/trackpad zoom writes to animation frames.
- Treat density-only Gallery mutations and resize as overview-layout refreshes rather than reasons to re-materialize and re-sort the Vault.

## Non-goals

- Changing canonical Card data or semantic-color assignment.
- Changing Color/Tag/Time ordering semantics.
- Introducing virtualization, pagination, sampling, aggregation, or a second card representation model.
- Redesigning standard/comfortable/focus densities.
