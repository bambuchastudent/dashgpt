# Proposal: Unified Card Dashboard — My Dash

## Why

The personal dashboard currently exposes several overlapping concepts at once: Results, Living Topics, Result cards, and Semantic Dashes. The underlying product model is already simpler than the UI: Results are the durable content objects, while Semantic Dashes are reference-only views over those Results. The home experience should expose that simpler model directly.

## What changes

- Rename the personal home surface to `My Dash` / `Мой Dash`.
- Make the existing Semantic Gallery the primary page content.
- Remove separate top-level `Living Topics` and `Results` sections from the personal home.
- Keep `My Dash` virtual: it represents all currently eligible personal cards and does not create a Dash revision or Vault record.
- Turn dashboard search/filter state into a temporary, explicitly unsaved selection.
- Allow a non-empty temporary selection to be saved through the existing Review-mode Semantic Dash model without copying Result content.
- Make saved Dashes discoverable from one `My Dashes` control and always show the selected Dash context.
- Render saved Dash members through the same Semantic Gallery controller used by home/search.
- Preserve existing Result, Vault, continuation, Product Board, privacy, immutable-hash, and storage contracts.
- Preserve deep links, while canonicalizing the new home and saved-Dash shell.
- Add RU and EN user-facing copy through a small localization boundary rather than hardcoding new labels throughout controllers.

## Impact Manifest

### Confirmed entry points
- `demo/index.html` — current personal dashboard shell, Living Topics block, Result controls, gallery.
- `demo/app.js` — Result selection, filtering, gallery ordering/zoom, route coordination, persistence.
- `demo/semantic-dash-ui.js` — saved Dash list/detail, temporary Dash creation, Review-mode save, Dash routes.
- `demo/semantic-gallery.js` — existing shared gallery ordering and density behavior; reused, not replaced.
- `demo/styles.css`, `demo/semantic-dashes.css`, `demo/gallery.css` — shell, Dash, and gallery presentation.
- `scripts/verify-ui-contract.mjs`, `scripts/verify-semantic-dashes.mjs`, `scripts/verify-semantic-gallery.mjs`, Playwright tests — regression surface.

### Tooling check
- Graphify: unavailable in this ChatGPT/GitHub connector environment.
- Serena: unavailable in this ChatGPT/GitHub connector environment.
- Fallback: repository tree inspection, GitHub file retrieval, existing verifier contracts, and symbol-level edits only after confirming current implementations.

### Compatibility radius
- Semantic Dashes (Feature 7 / PR #18)
- Semantic Gallery UX (Feature 8 / PR #19)
- Structured Chat Continuation (PR #20)
- Living Product Board (PR #21/#22)
- chat-first onboarding and anonymous Share import (PR #28/#30–32)
- Vault/GitHub storage and immutable Result contracts

## Non-goals

No new Result schema, immutable hash projection, semantic color algorithm, storage provider, automatic Dash save, transcript transfer, or card-content redesign. `My Dash` is not persisted as a Semantic Dash.
