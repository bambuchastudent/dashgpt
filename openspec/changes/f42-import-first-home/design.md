# Design: Import-first personal home

## Entry hierarchy

The personal root gets one new presentation-only entry layer before the existing summary, Dashes and gallery.

Order:

1. product explanation;
2. primary actions;
3. lightweight privacy/resume note;
4. existing working-memory/dashboard content.

## CTA delegation

The home layer MUST NOT reimplement import or save logic.

- `Import ChatGPT history` delegates to `#chatgptImportGuideButton`, which owns ZIP/JSON and live-import entry.
- `Save one chat` delegates to `#addResultButton`, which the personal onboarding layer already maps to the canonical Save Chat dialog.
- `My cards` scrolls/focuses the existing `#galleryRegion` / `#searchInput` surface.

If a delegated control is not ready at first paint, the home action retries after bootstrap on a bounded event-loop delay; it must not invent a fallback import protocol.

## Presentation

The entry surface is injected only for the personal `/demo/` root and not showcase/result/dash pages. Copy follows the same RU/EN locale rule used by existing personal onboarding/import UI.

Advanced dashboard sections remain unchanged in capability. The new layer visually separates a `Start here` area from advanced topics rather than deleting Semantic Dashes.

## Reset placement

F38 device reset stays under Storage/Vault. The home layer may mention Settings but MUST NOT expose destructive reset as a primary CTA.

## Verification

Static verification checks stable CTA IDs, delegated canonical controls, personal-root scoping and absence of duplicate import/save implementations. Browser coverage checks action routing and a 390px no-horizontal-overflow contract.