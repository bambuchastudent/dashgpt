# Proposal: Resumable Progressive ChatGPT History Import

## Why

The standalone Safari history-export prototype proved that large real ChatGPT histories are not a good fit for a one-shot `fetch everything -> build one giant JSON -> download -> import` workflow.

A real authenticated Safari run discovered 2,123 unique conversations. Fixed detail concurrency of 8 triggered sustained HTTP 429 responses, independent worker retries amplified the throttling, and a closed source tab destroyed all in-page execution state. Even when the export eventually succeeds, the user sees no DashGPT value until the entire history has finished and a second import step is performed.

DashGPT already has the right destination model: canonical Result/Card objects in the user's local-first Vault. The importer should therefore progressively upsert each captured conversation into that existing model, use the imported cards themselves as the durable checkpoint, and show migration state through a normal My Dash card.

## What changes

- Add one stable ChatGPT-history import card for a clean/new My Dash. It is the launcher and progress surface, not a separate Import Jobs product.
- Keep the card identity stable through ready, waiting-for-source, running, rate-limited, paused/interrupted, partial, completed and removed/hidden lifecycle states.
- Preserve the normal chat-first new-user capture flow: the system import card does not count as the user's first saved conversation and does not replace `Save current chat` onboarding.
- Make `Start import` open the authenticated `chatgpt.com` source context and prepare the same-origin source runner for the user. Because a DashGPT origin cannot inject JavaScript into a cross-origin ChatGPT page, the first PR truthfully requires one explicit same-origin execution gesture rather than pretending automatic cross-origin `eval` is possible.
- Use a zero-install browser-native bridge after the source runner starts: bounded `postMessage` batches from the ChatGPT page to the DashGPT opener/receiver, with strict origin/session validation and acknowledgements only after durable Vault writes.
- Reuse the existing browser-local Vault, materialization, search, Semantic Gallery and Semantic Dash paths. No parallel `importedChats` database is introduced.
- Give every imported ChatGPT conversation a deterministic Result ID derived from its stable ChatGPT conversation ID and preserve `source.provider = chatgpt`, `source.type = conversation`, `source.sourceId`, and the original conversation URL.
- Treat the set of durably stored imported conversation cards as the checkpoint. A restart rediscovers ChatGPT history and skips already-current source IDs instead of persisting a second giant completed-ID ledger.
- Use ChatGPT conversation update time as the imported Result's source freshness marker so a later run can update the same deterministic card when the source changed.
- Persist compact cards, not raw full transcripts: title, bounded deterministic summary/current-state excerpt, small metadata/facts, source provenance and semantic tags. This keeps browser-local storage bounded and stays aligned with the card-first product model.
- Persist in bounded batches and acknowledge only after the batch and progress card are saved. The source runner keeps backpressure and does not buffer the entire history.
- Avoid the existing per-Result whole-Vault validation cost during bulk migration: an import-only batch fast path applies already-sanitized mutable upserts in memory, then uses the normal `saveBrowserVault` validation/sanitization once per durable batch.
- Replace fixed high concurrency with a coordinated adaptive scheduler. One meaningful 429 pauses the shared queue, respects `Retry-After` when available, reduces concurrency, and retries later without turning transient throttling into permanent mass failure.
- Separate durable persistence from Gallery materialization. A hidden receiver does not repeatedly reload while importing; returning to DashGPT performs one bounded refresh so already-durable cards appear through the canonical renderer.
- On source-tab loss, keep all accepted cards and resume remaining/stale conversations on the next launch without duplicates.
- On completion, remove automatic prominence. Removing the completed operational card does not delete imported cards.
- Keep optional Vault sync (GitHub/Drive/etc.) completely separate from import. The import writes to the same local Vault first; normal sync may mirror it later according to existing storage rules.

## Product constraint: no extension/plugin prerequisite

This capability must not require a browser extension, ChatGPT plugin, MCP browser helper, userscript manager or another installed background component.

A normal DashGPT page also cannot continue executing authenticated ChatGPT same-origin requests after the ChatGPT source context is gone. Therefore this PR promises resumability, not fake background execution:

```text
ChatGPT source context alive -> capture can progress
source context gone          -> already accepted cards remain
source relaunched            -> rediscover, compare deterministic source IDs/freshness, continue remaining work
```

## Impact Manifest

### Confirmed existing entry points

- `demo/vault.js` — canonical Vault v1, Result sanitization, mutable Result semantics, local browser persistence, materialization and merge behavior. Reused without a Feature 20 schema/store fork.
- `demo/app.js` — active Result collection, gallery rendering, search, continuation and storage UI. Reused as the only canonical card renderer; no import renderer was added.
- `demo/public-onboarding.js` — clean-user capture flow; adjusted so the system import card does not suppress normal first-user-card onboarding.
- `demo/unified-onboarding.js` — PR #33 My Dash context; adjusted to avoid a duplicate empty My Dash header when the import card makes the canonical dashboard visible.
- `demo/unified-dashboard.js` / routing adapters — PR #33 canonical My Dash and saved-Dash shell.
- `demo/semantic-gallery.js` — shared semantic ordering/density behavior.
- `demo/semantic-dashes.js` / `demo/semantic-dash-ui.js` — search/ranking and saved Dash membership over the same canonical Result IDs.
- `demo/continuation.js` — continuation behavior over current Results; imported cards participate normally once materialized.
- `demo/catalog-bootstrap.js` — Feature 20 is scoped to personal My Dash / receiver entry, installs the batch receiver before the lifecycle receiver, and leaves showcase/published deep links untouched.
- existing browser/Vault/Share/continuation/verifier gates — regression radius.

### Implemented Feature 20 surface

- `demo/chatgpt-history-import.js` — stable import card, deterministic source identity, compact receiver sanitization, lifecycle protocol, launcher/pause/complete actions and pending-UI coordination.
- `demo/chatgpt-history-source-runner.js` — generated same-origin ChatGPT source runner; auth discovery, active+archived pagination, selected-branch extraction, adaptive global scheduler, batch backpressure, pause and safe source state.
- `demo/chatgpt-history-import-batch.js` — strict BATCH-only fast path: sanitize each candidate, apply deterministic mutable upserts in memory, perform one canonical full Vault validation/save per batch, ACK only after that durable save, and refresh the canonical gallery once when the user returns.
- `demo/catalog-bootstrap.js` — personal-only Feature 20 module ordering and receiver installation.
- `demo/public-onboarding.js` — import system card excluded from first-user-card semantics.
- `demo/unified-onboarding.js` — one canonical My Dash context when import card and chat-first onboarding coexist.
- `scripts/verify-chatgpt-history-import.mjs` — deterministic seed/idempotency/freshness/privacy/storage-budget/adaptive-runner/batch-fast-path contracts.
- `tests/chatgpt-history-import.spec.mjs` — browser lifecycle, launcher, origin/session rejection, pause, progressive persistence, replay/update and completion-removal coverage.
- existing onboarding/unified-onboarding tests — updated only for the intentional system-card presence while preserving zero user cards.
- `package.json` — includes Feature 20 source and fast-path checks in repository verification.

### Deliberately unchanged core surfaces

- `demo/vault.js` — no new schema, import database or provider-specific persistence model.
- `demo/app.js` — no second renderer or importer-owned runtime Result collection.
- Semantic Dash, Semantic Gallery, continuation and sync domain semantics remain unchanged.

### Active-change overlap

- PR #33 (`Feature 18: Unified Card Dashboard — My Dash`) is open and owns the canonical My Dash shell. This implementation is stacked on its head instead of copying or overriding that work.
- PR #33 had pre-existing browser race failures on its own head; those are being fixed in #33 itself rather than hidden inside Feature 20.
- Current Share/onboarding import changes remain separate; this feature is bulk authenticated-history migration, not public Share resolution.
- Canonical Card Merge (#36) remains separate; this change only preserves stable source provenance so imported cards can participate safely later.

### Tooling check

- Graphify: unavailable in this ChatGPT/GitHub connector environment.
- Serena: unavailable in this ChatGPT/GitHub connector environment.
- Fallback inspection used: repository/PR tree inspection, focused file retrieval, existing Vault/App/OpenSpec contracts, and deterministic verification through repository CI.

### Privacy/security radius

- ChatGPT access tokens, cookies, session objects, authorization headers and account IDs are transient source-page transport state only and never enter cards, progress state or Vault storage.
- Cross-window messages accept only the expected ChatGPT origin, expected protocol/version, a per-launch nonce/session identifier and bounded payload sizes.
- Conversation content is never POSTed to a DashGPT server merely to perform the migration; the browser bridge is local between source and receiver contexts.
- Full raw transcripts are not persisted by this PR.
- Receiver candidates are reconstructed through an allowlist before the import-only fast path can mutate the in-memory Vault, and the normal Vault sanitizer/validator still runs once before every durable batch ACK.

## Non-goals

- Browser extension/plugin packaging.
- True execution after the ChatGPT source context has closed.
- A separate Import Jobs database/screen.
- Full transcript archival.
- LLM-quality semantic distillation of every historical conversation.
- New cloud storage/sync semantics.
- Changes to Semantic Dash membership rules, semantic color rules, Structured Continuation semantics, or card merge behavior.
- Unlimited/high fixed request concurrency.
