# Impact Manifest

## Directly affected

- `demo/gallery-overview-sorting.js` — minimum-density presentation and refresh scheduling.
- `demo/semantic-gallery.js` — zoom/reflow scheduling and large-board animation guard.
- Semantic Gallery verification/tests covering F32 overview and zoom behavior.

## Product behavior

- My Dash and Semantic Dash minimum-density Gallery tiles gain visible clipped text cues.
- Whole-selection overview, semantic palette, card ordering and card actionability remain unchanged.
- Large Gallery density changes avoid all-card geometry animation and avoid unrelated Vault materialization/sorting on density/resize.

## Data/storage

No canonical Card, Vault, Dash, event, persistence or migration changes.

## Security/privacy

No new network access, storage provider, permissions, secrets or public/private boundary changes. Visible cues are derived only from card content already rendered in the current Gallery selection.

## Regression surface

- Gallery density controls, pinch/trackpad gestures and resize.
- F32 Color/Tag/Time sort controls.
- Whole-board compact/heat-map/overflow planning on desktop and mobile.
- Card focus/open behavior at minimum density.
