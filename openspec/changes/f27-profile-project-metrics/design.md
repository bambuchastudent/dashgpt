# Feature 27 — Design

## Model

Imported ChatGPT cards store token metadata in the existing portable `result.usage` envelope. History import estimates from visible user/assistant text before distillation and marks it `visible-text-v1` / `estimated`.

Project totals use current materialized cards only.

### Existing-card backfill

Cards imported before F27 have no usage. `knownChatGptFreshness` SHALL advertise only cards that already have valid usage, so legacy cards are fetched once more. The batch importer MAY accept the same `publishedAt` only when valid incoming usage enriches a card that lacks usage. After enrichment normal freshness resumes; older source content never replaces newer content.

Spent and donated totals use existing Vault v1 `profileRevisions` as non-negative integer minor units plus a three-letter currency.

## UI

Profile / Профиль mounts in the topbar. The header collapses; collapse state is device-local. Tokens are read-only; money is explicitly editable. RU/EN and 360px are required.

## Compatibility

Vault schema remains v1. No raw transcript is added to profile revisions and no billing/payment/FX integration is introduced.
