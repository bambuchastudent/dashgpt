# Feature 26 — Profile project metrics

## Why

DashGPT preserves useful AI work as portable cards, but it has no compact profile view for project-wide usage and project money totals. The requested surface should be small, local-first and honest about what DashGPT can actually measure.

ChatGPT history import can see visible conversation text, but it does not expose authoritative provider token billing or trustworthy per-conversation cost. The product must therefore distinguish estimates from provider-reported usage and must not fabricate money values from token estimates.

## What Changes

- Add a compact Profile / Профиль disclosure to the personal top bar.
- Add a hideable metrics header with estimated token usage, spent total and donated total.
- Estimate ChatGPT history tokens from the selected visible user/assistant message text before card distillation and persist explicit estimator provenance on the canonical card.
- Aggregate token usage from current materialized canonical cards so re-importing a stable mutable conversation does not double-count it.
- Store spent/donated values as explicit user-maintained project-metrics revisions in existing Vault v1 `profileRevisions`.
- Store money in integer minor units with an explicit three-letter currency; do not perform FX conversion.
- Keep collapse/expanded state as a device-local presentation preference rather than a Vault revision.
- Add RU/EN copy, accessibility behavior, responsive 360px styling and regression coverage.

## Impact

The change touches ChatGPT history capture metadata, optional Result fields, Vault profile revision materialization, the personal topbar, Vault portability tests and UI tests. Cards remain canonical; Dashes, search, Semantic Gallery and continuation semantics do not change.

Payment-provider integrations, donation-provider integrations, ChatGPT/OpenAI billing scraping, API-key billing, FX conversion and a separate analytics dashboard are out of scope.
