# Proposal: Unified Card Dashboard — My Dash

## Why

The personal dashboard currently exposes several overlapping concepts at once: Results, Living Topics, Result cards, and Semantic Dashes. The underlying product model is already simpler than the UI: Results are the durable content objects, while Semantic Dashes are reference-only views over those Results. The home experience should expose that simpler model directly.

## What changes

- Rename the personal home surface to `My Dash` / `Мой Dash`.
- Make the existing Semantic Gallery the primary page content.
- Remove separate top-level `Living Topics` and `Results` surfaces from the personal home; the legacy Dash mount remains hidden only for compatibility with the existing Feature 7 controller.
- Keep `My Dash` virtual: it represents all currently eligible personal cards and does not create a Dash revision or Vault record.
- Turn dashboard search/filter state into a temporary, explicitly unsaved selection.
- Allow a non-empty temporary selection to be saved through the existing Review-mode Semantic Dash model without copying Result content.
- Make saved Dashes discoverable from one `My Dashes` control and always show the selected Dash context.
- Render saved Dash members through the same Semantic Gallery controller already used by Feature 8.
- Make saved-Dash search scope reversible: `In this Dash` stays inside the materialized Dash, while `All cards` moves the same query to the existing My Dash gallery and keeps the source Dash context for return/clear.
- Preserve existing Result, Vault, continuation, Product Board, privacy, immutable-hash, and storage contracts.
- Preserve deep links, while canonicalizing the new home and saved-Dash shell.
- Add RU and EN user-facing copy through a shared localization boundary.

## Impact Manifest

### Confirmed existing entry points
- `demo/index.html` — personal dashboard shell, legacy Living Topics mount, Result controls, gallery.
- `demo/app.js` — Result selection, filtering, gallery ordering/zoom, route coordination, persistence.
- `demo/semantic-dash-ui.js` — saved Dash materialization/detail, Review-mode controls, Dash routes.
- `demo/semantic-dashes.js` — semantic ranking, Dash revision semantics, eligibility.
- `demo/semantic-gallery.js` — shared gallery ordering/density behavior; reused, not replaced.
- `demo/vault.js` — local Result/Dash persistence and materialization.
- `demo/dash.js` / `demo/product-board.js` — stable Product Board rendering and data behavior.
- existing verifier and Playwright gates — regression surface.

### Feature 18 implementation surface
- `demo/unified-dashboard.js` — virtual My Dash shell, temporary selection context, My Dashes navigation, reference-only selection save, duplicate handling, saved-Dash context/search composition, RU/EN copy.
- `demo/unified-dashboard-routing.js` — reversible `In this Dash` / `All cards` query routing without a parallel card renderer.
- `demo/unified-product-board.js` — Product Board shell/context adaptation only; data/reconciliation stay unchanged.
- `demo/unified-dashboard.css` — unified context/menu/mobile styles.
- `demo/catalog-bootstrap.js` — loads the unified adapters after existing application modules.
- `scripts/verify-unified-dashboard.mjs` — deterministic domain/ownership checks.
- `tests/unified-dashboard.spec.mjs` — My Dash/save/saved-Dash/360px browser flow.
- `tests/unified-dashboard-scope.spec.mjs` — reversible all-card scope browser flow.
- `tests/unified-product-board.spec.mjs` — stable Product Board route in the unified shell.
- `package.json` — adds Feature 18 checks plus `verify:fast` / `verify:full` aliases over existing repository gates.

### Tooling check
- Graphify: unavailable in this ChatGPT/GitHub connector environment.
- Serena: unavailable in this ChatGPT/GitHub connector environment.
- Fallback used: repository tree inspection, GitHub file retrieval/search, existing verifier contracts, and narrow additive adapters after confirming current symbols/routes.

### Compatibility radius
- Semantic Dashes (Feature 7 / PR #18)
- Semantic Gallery UX (Feature 8 / PR #19)
- Structured Chat Continuation (PR #20)
- Living Product Board (PR #21/#22)
- chat-first onboarding and anonymous Share import (PR #28/#30–32)
- Vault/GitHub storage and immutable Result contracts

## Non-goals

No new Result schema, immutable hash projection, semantic color algorithm, storage provider, automatic Dash save, transcript transfer, or card-content redesign. `My Dash` is not persisted as a Semantic Dash.
