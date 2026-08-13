# Feature 27 — Design

## Model

Imported ChatGPT cards store token metadata in the existing portable `result.usage` envelope. History import estimates from visible user/assistant text before distillation and marks the value with estimator `visible-text-v1` and kind `estimated`.

Project token totals are derived from current materialized canonical cards, so updating the same mutable source replaces its previous contribution.

Spent and donated totals use existing Vault v1 `profileRevisions`. Values are non-negative integer minor units with a three-letter currency. Editing appends a revision; the latest valid revision materializes deterministically.

## UI

A compact Profile / Профиль control mounts in the existing topbar. Its three-counter header can collapse. Collapse state is device-local; token totals are read-only; money totals have an explicit editor. RU/EN copy and a 360px responsive layout are required.

## Compatibility

Vault schema remains v1. Raw conversation text is not added to profile revisions. No billing, payment-provider, donation-provider, or FX integration is introduced.
