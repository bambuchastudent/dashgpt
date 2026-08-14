# Feature 27 — Design

## Model

Imported ChatGPT canonical cards store token metadata in the existing portable `result.usage` envelope. History import estimates from visible user/assistant text before distillation and marks it `visible-text-v1` / `estimated`.

Project totals use current materialized canonical cards only. F27 does not add an analytics Result type, a second card store, or a second source of truth.

### Existing-card backfill

Cards imported before F27 may have no usage. The current F26 history-import freshness/retry pipeline SHALL advertise only cards that already have valid usage as fully current for the F27 enrichment dimension. A legacy card without valid usage MAY be fetched once more for usage enrichment.

The receiver MAY accept the same `publishedAt` only when valid incoming usage enriches the same canonical card that lacks usage. The existing stable source/card identity, F25/F26 retry/backoff/wakeup behavior, semantic enrichment, and idempotent persistence remain authoritative. F27 SHALL NOT restore or fork an older source runner implementation. After enrichment, normal freshness handling resumes; older source content never replaces newer content.

Spent and donated totals use existing Vault v1 `profileRevisions` as non-negative integer minor units plus a three-letter currency.

## UI

Profile / Профиль mounts in the current general-user topbar without exposing internal Product Board UI. The header collapses; collapse state is device-local. Tokens are read-only; money is explicitly editable. RU/EN and 360px are required.

## Compatibility

Vault schema remains v1. Cards, saved Dashes, Search, Semantic Gallery, continuation, Google/GitHub Vault sync, link-first capture, export/guided import, Safari receiver focus, F26 retry wakeup, and the Color-first F32 Gallery remain canonical/current behavior.

No raw transcript is added to profile revisions and no billing, payment, pricing, FX, or provider-cost integration is introduced. Money totals are explicit user-entered data and are never inferred from token estimates.
