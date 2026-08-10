## Context

The current dashboard filters a merged published/local Result array and renders every match into a fixed one/two/three-column grid. Feature 5 derives semantic hues from category/title/tags but does not use that coordinate for order. Vault v1 already separates immutable Result revisions from append-only mutable events. The concurrent Feature 7 change introduces Semantic Dashes and a shared semantic ranker, but Dash membership, review proposals, and access eligibility are separate concerns from gallery presentation.

The gallery must therefore operate on an already-authorized, already-selected array, preserve the Result model, and reuse Feature 7's normalized semantic concepts rather than introduce a second competing Dash/search engine.

## Goals / Non-Goals

**Goals:**

- Keep semantic neighbors adjacent while allowing recent work to move only inside its topic.
- Produce a deterministic order that is stable across reloads and small presentation changes.
- Render the complete current selection at every density and make overview useful on desktop and mobile.
- Make touch/trackpad zoom feel continuous, then snap to a small number of legible states.
- Preserve the card or point under the gesture closely enough that the user does not lose their place.
- Persist explicit activity portably and presentation state locally without mutating Results.
- Keep the implementation dependency-free and testable with the repository's Node verifier baseline.

**Non-Goals:**

- Replacing Feature 7 semantic retrieval, changing filters/search results, or changing Dash membership.
- Recomputing or persisting semantic colors.
- Adding card edit UI, category navigation, manual drag order, a graph/canvas, or pagination.
- Using browser page zoom as gallery zoom.

## Decisions

### 1. Gallery receives a complete selection and never owns filtering

The input contract is an ordered-agnostic array of Results already selected and authorized by the caller, plus a stable selection key such as `all`, `category:Food`, `search:<normalized query>`, or `dash:<dashId>`.

The pipeline is:

```text
accessible Results -> All/search/filter/Dash selection -> gallery ordering -> complete grid
```

Density changes only CSS/layout state. They do not slice the array, invoke search, change Dash scope, hide semantic groups, or paginate. At minimum density every selected Result still has one card in the DOM; ordinary page scrolling handles overflow.

This boundary lets Feature 7 apply access eligibility before semantics and pass a materialized Dash selection without exposing inaccessible Result text to the gallery.

### 2. Use a semantic-signature adapter, not a second Dash/search ranker

Gallery ordering consumes a signature equivalent to:

```js
{ groupKey, groupRank, position }
```

`groupKey` is the stable thematic neighborhood, `groupRank` orders neighborhoods, and `position` provides a deterministic within-neighborhood semantic tie. The fallback implementation derives the signature from the exact Feature 5 semantic inputs and anchors while preserving the existing hue formula. A dominant known anchor keeps small title/tag hash perturbations inside the same group; an unknown concept uses its normalized existing category as a stable fallback group, and only a Result without category falls back to a fixed 45-degree hue band. The existing hue itself remains unchanged and presentation-only.

The integrated dashboard calls Feature 7's shared `semanticTerms` normalizer over the same category/title/tag semantic inputs and uses the first stable normalized concept as `groupKey`. A deterministic hash of that key supplies one group rank, while the unchanged Feature 5 hue remains the within-group position and visual. Results without a shared Feature 7 concept use the fallback signature above. The gallery does not copy Feature 7 confidence thresholds, score inaccessible Results, or use hue as Dash relevance.

Groups are ordered only by `groupRank` and `groupKey`; activity can never change group order. A Result whose dominant semantic group genuinely changes may move groups, but a small score/color perturbation that leaves `groupKey` intact cannot cause a cross-dashboard jump.

### 3. Order activity lexicographically inside each semantic group

For every Result, derive the following latest timestamps:

1. `continuedAt`: `continue.new-chat` or `source.open`;
2. `openedAt`: card detail/modal or standalone Result page open;
3. `updatedAt`: card edit/update or Dash add/remove activity, with an explicit Result update timestamp when one already exists;
4. `createdAt`: Result-create activity, otherwise an existing `createdAt`, otherwise `publishedAt`.

Inside one group, compare the tuple in that exact order, with a present timestamp ahead of an absent timestamp and newer timestamps first. If all activity components tie, use the previously remembered order for that selection, then semantic `position`, then stable Result ID. This directly implements the requested priority and prevents a group-external move.

The remembered order is only a final tie-break inside the same current group. It cannot keep a Result in an obsolete group or override new explicit activity. New cards therefore enter the front of their own group through `createdAt`, while unrelated groups retain their internal order.

### 4. Activity is append-only Vault state, never viewport telemetry

A portable activity event has the additive Vault v1 shape:

```json
{
  "schemaVersion": 1,
  "eventId": "evt_...",
  "type": "result.activity",
  "resultId": "result-id",
  "value": "opened | continue.new-chat | source.open | updated | created | dash.add | dash.remove",
  "createdAt": "2026-08-10T12:00:00.000Z"
}
```

Only explicit actions append events. Rendering, intersection/visibility, scrolling, hover, focus, and zoom do not. Repeated identical actions on one Result inside a 30-second debounce window reuse the existing latest event to avoid accidental double-click growth. Events contain no title, summary, source URL, semantic text, or credentials.

The existing UI records modal/page open, original-source transition, new-chat continuation, and local creation. The exported event helper accepts edit/update and Dash add/remove signals so those surfaces can call the same contract as they land. Favorite toggles are not ordering activity in this change.

### 5. Use five snapped density levels and three content modes

The fixed density model is:

| Density | Scale | Detail | Intent |
| --- | ---: | --- | --- |
| Overview | 0.62 | compact | semantic color + clamped identity for every selected Result |
| Dense | 0.78 | medium | title + short summary/key label |
| Standard | 1.00 | medium | existing baseline card density |
| Comfortable | 1.18 | expanded | more summary, tags, next action, primary actions |
| Focus | 1.36 | expanded | fewer large cards and the most usable action area |

For every level, JavaScript sets `--gallery-zoom-scale` and `--gallery-font-scale`. The second value is exactly `Math.min(zoomScale, 1)`. Card minimum width grows with zoom, but typography never exceeds the existing 100% size. Compact/medium/expanded are discrete at snap points so content does not flicker during a pinch; transient gesture scale changes card geometry continuously while retaining the current detail mode until snapping.

Compact cards keep a two-line title and semantic treatment and remain openable by pointer and keyboard. Medium adds a bounded summary and key label. Expanded exposes the longer summary, tags/related cues, next action, favorite, Page/Open, original-source, and continuation actions already supported by the card/detail hierarchy. Long text uses line clamp and overflow wrapping rather than clipping outside the card.

### 6. Gesture handling uses internal scale and preserves an anchor

Touch uses Pointer Events with two active touch pointers. The transient scale is:

```text
clamp(startScale * currentDistance / startDistance, 0.62, 1.36)
```

The gallery uses `touch-action: pan-y`, retaining vertical single-finger scrolling while preventing the browser page pinch from taking over inside the gallery. Pointer completion snaps to the nearest density.

Trackpads use the browser convention of a `wheel` event with `ctrlKey` for pinch where supported; ordinary wheel scrolling is untouched. Safari-style gesture events are an additive fallback. A visible native range input plus decrease/increase buttons provide mouse, keyboard, assistive-technology, and non-gesture operation.

Before a scale/layout update, the controller resolves the card under the gesture midpoint (or the focused/viewport-center card), records its rectangle, updates scale, and on the next animation frame adjusts scroll by the rectangle delta. Card reflow uses a short FLIP/Web Animations transition when motion is allowed; `prefers-reduced-motion` disables it.

### 7. Responsive grid uses auto-fit with no placeholder holes

The grid uses `repeat(auto-fit, minmax(min(100%, var(--gallery-card-min)), 1fr))`. Desktop base card width is 280px; narrow viewports use 220px. At overview scale this permits multiple compact cards on a phone; at focus scale it naturally returns to one column. Every card participates in normal document flow, so there are no masonry holes, overlap, absolute positioning, or hidden pages.

Resize changes the physical column count but not logical Result order. The same ordered DOM sequence is used on desktop, tablet, and mobile.

### 8. Split portable activity from device presentation state

Result activity belongs in Vault events so a synchronized Vault can carry recency. Gallery presentation uses the local key `dashgpt.demo.gallery-state.v1` with a versioned, sanitized payload containing density index, active category/favorite/query controls, selection key, focused Result hint, and a bounded map of remembered Result-ID orders.

No Result text, semantic score, credentials, or provider authorization data enters this UI state. Unknown density values and stale Result IDs are ignored. Reload restores controls before the first dashboard render, preventing a visible reset. Zoom writes only density state and never overwrites the active selection.

### 9. Semantic Dashes integration remains one-way

Feature 7 owns Dash definitions, eligibility, Review proposals, membership, and semantic retrieval. Feature 8 owns the layout of whichever eligible members Feature 7 chooses to display. The integration point is `selectionKey = dash:<id>`, the materialized accepted-member array, and Feature 7's exported concept normalizer.

The live Semantic Dash detail surface passes accepted members to a small gallery-render callback. It keeps Review proposals, pin/exclude/manual membership actions, privacy filtering, and aggregate Dash content outside the gallery. Member cards use the same five-level controller and the same saved density as the main dashboard, but remember order under their own Dash key. Explicit original/continue/pin/exclude/restore actions record the shared activity kinds; rendering the Dash does not.

This PR does not change `/demo/dash/` or special-case `DashGPT / Product discussions`. The Dash subset fixtures and UI contract verify that all supplied eligible IDs remain mounted and the real Dash renderer uses the shared controller without a second gallery algorithm.

### 10. Verification is deterministic and dependency-free

A Node verifier exercises multi-topic fixtures, all activity tiers, cross-group isolation, previous-order ties, duplicate/reload determinism, zoom math, column monotonicity, full-selection invariance, saved-state restoration, search/Dash subset invariance, long identity preservation, and activity-event debounce. UI contract checks assert visible controls, gesture listeners, internal zoom variables, font cap, auto-fit grid, compact identity, overflow handling, and reduced-motion behavior.

No browser automation dependency is added. Cloudflare preview remains the manual final gesture/visual check after the deterministic suite passes.

## Risks / Trade-offs

- **A Result can match more than one Feature 7 concept.** The normalized concept list is stable-sorted and the first concept is the deterministic group; changing that shared vocabulary is an explicit semantic-engine change and is captured by identical-input fixtures.
- **Lexicographic continuation priority can keep an old continued card ahead of a newly opened card.** This matches the stated signal priority exactly; future decay would be a product change requiring new fixtures/spec.
- **CSS reflow cannot be perfectly continuous on every low-power phone.** Animation is requestAnimationFrame-batched, content mode stays snapped during the gesture, and reduced-motion remains correct.
- **Trackpad pinch event shapes vary by browser.** `ctrlKey` wheel plus gesture-event fallback covers current browser conventions, while the visible control is always available.
- **Activity events add Vault volume.** A 30-second same-action debounce prevents accidental bursts; compaction can later preserve latest semantic state without changing this event meaning.

## Migration / Rollout

1. Deploy readers that already accept generic Vault events; old Vaults simply have no Result activity and fall back to published/create timestamps.
2. Enable deterministic ordering and saved presentation state without changing the current selection.
3. Enable visible density controls and gesture handlers.
4. Render Feature 7's already-materialized accepted Dash members through the same controller and shared semantic concept adapter, without changing membership or proposals.
5. Verify real touch and trackpad behavior in the branch preview before marking the final manual task complete.
