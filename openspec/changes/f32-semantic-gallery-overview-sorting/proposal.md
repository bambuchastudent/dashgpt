## Why

The most zoomed-out Gallery must behave like a semantic memory map: the user should see the whole current card set at once and immediately understand the color distribution. The previous F32 draft made Time the default, which no longer matches the product decision.

## What Changes

- **Color** becomes the default and first sort mode; **Tag** is second; **Time** is third.
- Semantic display colors are quantized into a deterministic **32-color palette** while preserving the existing semantic hue as the source signal.
- Color order groups cards by palette slot, then canonical tag, then meaningful time.
- At minimum/overview zoom, ordinary sets use compact cards when they fit; larger sets use a one-card-per-tile semantic heat map sized from the available width and height.
- The representative ~2,200-card imported history must fit on one desktop or 360/390px screen without pagination, sampling, aggregation, or missing cards.
- My Dash, search/filter subsets and saved Semantic Dashes reuse the same behavior and canonical cards.

## Scope

This is a Gallery presentation capability. It does not change card identity, Vault schema, search membership, Dash membership, import transport, tag generation, or storage providers. The 32-color palette is a deterministic presentation projection of existing semantic card metadata; it does not create a new taxonomy entity.
