# Design — F32 Color-first Semantic Gallery overview

## Existing surfaces

Feature 8 already owns semantic hue, stable semantic grouping, five Gallery density levels, focus preservation and the same canonical-card renderer for My Dash and saved Semantic Dashes. F28 supplies canonical import tags. F32 composes on those surfaces rather than introducing a second map/card model.

## Sort priority

The visible controls and default state are ordered:

`Color → Tag → Time`

A fresh or invalid sort preference resolves to `color`. F32 uses a new versioned presentation-state key so an older Time-default draft cannot silently preserve the superseded default.

- **Color:** palette slot ascending → primary canonical tag → newest meaningful card timestamp → stable ID.
- **Tag:** primary canonical tag → palette slot → newest meaningful timestamp → stable ID. Untagged cards remain last.
- **Time:** newest meaningful timestamp → palette slot → primary tag → stable ID.

Opening or continuing a card is not a meaningful Time update. Create/update and explicit Dash membership changes may contribute to meaningful time as already defined by the Gallery activity model.

## 32-color semantic palette

The existing `semanticHue(result)` remains the semantic source signal. F32 quantizes it to exactly 32 evenly spaced hue slots around the color wheel:

- palette size: `32`;
- step: `360 / 32 = 11.25°`;
- slot: nearest step to the normalized semantic hue;
- display hue: `slot * 11.25°`.

The mapping is deterministic and independent of density, sorting, viewport, card activity and storage order. The same card therefore retains the same palette slot across overview/standard/focus modes until its semantic metadata materially changes.

F32 applies the palette hue to the existing semantic CSS variables; it does not persist another color field or mutate canonical cards.

## Whole-board overview

At the minimum Gallery density, F32 measures the currently rendered Gallery width, the viewport height available below the Gallery heading and the exact current card count.

1. Try a compact-card grid with short identity text.
2. If the full selection cannot fit at the compact useful floor, switch to a semantic heat map.
3. Heat-map mode renders exactly one focusable/openable tile per selected canonical card. Text and secondary controls may be visually hidden, but accessible/native card identity remains available.
4. Grid columns and rows are calculated together to maximize useful tile area while keeping every tile inside the available overview rectangle.

Target heat-map floors are intentionally small because this mode is an orientation map rather than a reading surface. The representative ~2,200-card set must fit at desktop and 360/390px widths. F32 may use deterministic vertical overflow only for collections that exceed even the defined heat-map capacity; it never removes, samples, aggregates or paginates cards.

## Color-map continuity

Because Color is the default order and same-slot cards are contiguous, maximum zoom-out reads as bands/neighborhoods of the 32 semantic colors rather than a random checkerboard. Tag and Time remain explicit alternative views and never change the underlying palette assignment.

## Compatibility

Sorting is applied only after the current accessible selection exists. F32 reorders DOM cards but does not change the selected IDs, search/category/favorite state, saved Dash membership, card identity or Vault objects.

## Mobile and accessibility

The control group remains operable at 360/390px without horizontal overflow. Heat-map cards remain normal focusable `.result-card` elements; keyboard/touch activation opens the same canonical card. A native title/accessible identity is retained when visible text is suppressed.
