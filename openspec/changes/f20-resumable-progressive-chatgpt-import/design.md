# Design: Resumable Progressive ChatGPT History Import

## Architecture decision

The imported conversation card is the durable checkpoint.

DashGPT does not create a second import database and does not require a monolithic exported JSON before cards become useful. Every accepted ChatGPT conversation is converted to one compact mutable Result with a deterministic ID and written through the existing browser Vault path.

Conceptually:

```text
ChatGPT conversation metadata/detail
  -> compact card candidate
  -> validated browser message batch
  -> deterministic Result upsert
  -> save existing local Vault
  -> acknowledge source batch
  -> periodically refresh My Dash
```

If execution stops after the Vault save but before the source receives the acknowledgement, the same source ID is safely retried and converges to the same Result ID.

## Delivery dependency

The import launcher/progress surface is a first-class card in the PR #33 `My Dash` gallery. This change is therefore developed as a stacked branch based on `feature/f18-unified-card-dashboard` while #33 is open. Before final merge, after #33 lands, this branch must be rebased/retargeted to `develop` and the full verification rerun.

The change must not duplicate My Dash shell, search, saved-Dash navigation or Semantic Gallery behavior.

## Default import card

A clean/new browser Vault receives one mutable system Result before normal personal-onboarding routing decides whether the Vault is empty.

Stable identity:

```text
id: dashgpt-chatgpt-history-import
source.provider: dashgpt
source.type: system-operation
source.sourceId: chatgpt-history-import
immutable: false
```

The same Result is updated through these states:

- `ready`
- `waiting_for_source`
- `running`
- `rate_limited`
- `paused`
- `partial`
- `completed`

Human-facing title/summary/status/next text is derived from a small machine-readable state object stored on the mutable Result's existing `result` field, for example:

```json
{
  "kind": "chatgpt-history-import-progress",
  "state": "paused",
  "discovered": 2123,
  "imported": 184,
  "failed": 0,
  "updatedAt": "...",
  "lastSuccessAt": "..."
}
```

No completed-ID list is stored on the progress card.

The active/incomplete card receives operational display priority in My Dash without changing the user's explicit favorite/star state. Completion removes that automatic priority.

The default card is seeded only for a genuinely clean/new personal Vault. Existing populated Vaults are not silently injected with a new card merely because the feature deploys. A separate explicit Import action may restore/create the card for an existing user without changing this new-user rule.

Removing the completed operational card must not remove imported conversation cards. The implementation may physically remove the mutable progress Result or retain a hidden tombstone according to the smallest compatible Vault change, but it must not silently respawn for a user who completed and removed it.

## Deterministic imported-card identity

Every ChatGPT source conversation is keyed by its provider conversation ID.

```text
provider = chatgpt
source.type = conversation
source.sourceId = <conversation-id>
result.id = chatgpt-conversation-<conversation-id>
```

The receiver must never deduplicate by title, date, summary text or semantic similarity.

`putResult` already replaces a mutable Result with the same ID. The importer reuses that behavior rather than inventing another upsert store.

The source conversation's update time is persisted as the Result `publishedAt` freshness marker. During resume, the receiver returns the known source IDs plus their current `publishedAt`. The source runner skips equal/older conversations and refetches a conversation whose provider update time is newer.

This provides deterministic update semantics without persisting account IDs or a second completed-ID ledger.

## Compact card projection

The first PR does not claim LLM-quality distillation of every historical conversation. It creates useful, bounded cards without a required model API.

For each conversation:

- title: provider conversation title, bounded;
- summary: latest substantial visible assistant text, falling back to latest substantial visible user text, bounded to a product limit;
- current state: latest meaningful user turn when useful, separately bounded;
- category: a human import category such as `ChatGPT` / localized equivalent;
- tags: small deterministic title-derived/provider tags;
- facts: small metadata facts such as imported source and message count when available;
- source: provider/type/sourceId/original conversation URL;
- publishedAt: provider update time;
- immutable: false;
- contentVersion: 1 for the mutable imported source card.

The raw full message mapping/transcript is not stored in the Vault by this change.

The summary/current-state limits must keep a synthetic 2,500-card Vault comfortably below the browser-local quota target used by verification. If real persistence reaches quota, the receiver pauses truthfully and does not acknowledge unsaved items.

## Launcher and browser security boundary

A DashGPT page cannot open `chatgpt.com` and inject/evaluate JavaScript inside that cross-origin document. This is a browser security invariant, not an implementation bug.

Therefore the first PR's normal zero-install launcher is:

1. User presses `Start import` on the My Dash import card.
2. DashGPT creates a transient per-launch nonce/session identifier and opens the authenticated `https://chatgpt.com/` source context.
3. DashGPT prepares/copies the source runner text for the user and explains the single explicit same-origin execution gesture required by the browser (for the tested Safari flow, paste once into Web Inspector Console).
4. After that runner starts inside ChatGPT's origin, the migration proceeds progressively without repeated manual copying per conversation.

The UI must not claim that the DashGPT button itself injected code into ChatGPT.

A future browser-native shortcut/bookmarklet may reduce that remaining gesture, but it is not required for correctness and must not become an extension/plugin prerequisite.

## Local cross-window transport

The primary bridge is browser `postMessage`, not an HTTP upload endpoint.

The DashGPT launcher opens the ChatGPT source context so the source runner can use the existing DashGPT opener/receiver window reference where browser policy preserves it.

Protocol directionally:

```text
source -> HELLO(sessionId, nonce, sourceVersion)
receiver -> READY(knownSourceFreshness, limits)
source -> DISCOVERED(total, archivedCount)
source -> BATCH(sequence, cards[], sourceProgress)
receiver -> ACK(sequence, accepted, skipped, updated, durableImportedCount)
source -> COMPLETE(total)
receiver -> COMPLETE_ACK(...)
```

Receiver validation:

- `event.origin` must equal the supported ChatGPT origin;
- message type/version must be allowlisted;
- session/nonce must match the current transient launch;
- cards per batch and serialized payload size are bounded;
- every card candidate is sanitized and reconstructed by DashGPT rather than trusted as arbitrary Result/Vault content;
- no incoming message may set favorite state, immutable hashes, Dash membership, Vault IDs or arbitrary activity events.

If browser cross-origin opener policy severs the reference, the runner must stop with a safe human diagnostic and the progress card remains resumable. The first implementation must be verified in real Safari before claiming this bridge works there.

## Batch persistence and acknowledgement

The receiver writes bounded batches rather than saving one conversation at a time.

Directionally:

- source detail fetches run with small adaptive concurrency;
- card candidates accumulate to a small batch (for example 5-20 items, exact value determined by measurement/tests);
- source sends one batch and waits for durable ACK before allowing unbounded further buffering;
- receiver loads/uses the current Vault, performs deterministic upserts, updates the progress Result, then calls the existing Vault save once;
- only after `saveBrowserVault` succeeds is the batch acknowledged.

This converts a 2,000-conversation import from thousands of whole-Vault serializations to a bounded number of batch saves.

If quota/persistence fails, the batch is not acknowledged. A later resume safely retries those source IDs.

## Runtime Gallery refresh

Durable persistence and visual refresh are separate cadences.

The user should see imported cards appear progressively, but the app must not rebuild a 2,000-card Semantic Gallery after every single accepted conversation.

The receiver/app integration therefore coalesces UI refreshes, for example after a bounded number of accepted cards or a short time window. The existing app/Vault/semantic gallery remains the only canonical renderer.

The progress card itself may update more frequently in-place as long as that update does not cause unbounded full-gallery re-rendering.

## Resume algorithm

No separate durable completed-ID list is required.

On every source launch:

1. receiver materializes local imported ChatGPT cards and builds `sourceId -> publishedAt` for this provider/type;
2. source rediscovers current active + archived conversation metadata;
3. source skips IDs already imported at equal/newer freshness;
4. source fetches only missing or stale conversation details;
5. failed/transiently throttled items remain missing/stale and therefore naturally retry next launch;
6. progress counts are recalculated from the current discovery + durable known set.

This makes repeated full launches idempotent and makes crash recovery independent of whether an auxiliary checkpoint write happened after the card write.

## Adaptive global scheduler

The source runner starts conservatively, targeting 1-2 concurrent detail requests rather than 8.

Rules:

- one shared scheduler owns all detail requests;
- a meaningful 429/503 throttling response can pause the entire queue;
- honor `Retry-After` when present;
- otherwise use bounded exponential backoff with jitter;
- reduce concurrency to 1 after throttling;
- only cautiously increase after a sustained success streak, with a low maximum;
- workers consult one shared cooldown timestamp before issuing another detail request;
- no independent worker retry storms;
- cancellation/pause aborts in-flight work and prevents new scheduling;
- transient throttling does not permanently fail a conversation after a small fixed retry burst; unresolved items remain resumable.

The optimization objective is reliable total completion, not peak requests per second.

## Source runner privacy

The ChatGPT source runner may transiently read `/api/auth/session` and authenticated private conversation endpoints inside the user's already-authenticated ChatGPT origin.

It must never send or serialize to DashGPT:

- access token;
- cookies;
- account ID;
- session object;
- authorization headers;
- raw request headers;
- raw full diagnostic response bodies.

Only bounded conversation-derived card candidates, source IDs/freshness metadata, counts and safe status diagnostics cross the browser message bridge.

## Import-card lifecycle

### Ready

- prominent new-user card;
- `Start import` primary action;
- 0 imported.

### Waiting for source

- ChatGPT opened / source runner prepared;
- one clear instruction for the browser-required same-origin execution gesture;
- no claim that import is running until receiver HELLO succeeds.

### Running

- imported / discovered / remaining counters;
- `Pause` action;
- last successful persistence time.

### Rate limited

- human state such as `Waiting for ChatGPT`;
- shared cooldown automatically resumes while source context remains alive.

### Paused/interrupted

- durable imported cards remain visible/searchable;
- `Continue import` recreates transient launch state and rediscovery.

### Partial

- shows unresolved count;
- retry continues only missing/stale source IDs even though discovery may enumerate the full list.

### Completed

- imported equals current discovered total;
- operational priority removed;
- `View imported cards` and `Remove this card` actions;
- removal does not touch imported cards.

## Search, Dashes and continuation

Imported cards are ordinary materialized Results as soon as their batch is durable.

Therefore:

- My Dash/Semantic Gallery sees them through the normal app refresh;
- search uses the existing ranker;
- saved Dashes may include them according to current eligibility/membership rules;
- Continuation operates on the imported compact card like any other mutable Result;
- future card merge can use the stable source provenance.

No special imported-card collection is introduced.

## Failure behavior

- **429 / server throttling:** progress card says waiting/rate-limited; queue globally cools down and later resumes.
- **source tab closes:** no more requests; progress card becomes paused/interrupted when the receiver detects loss/timeout on the next relevant interaction; already durable cards stay intact.
- **receiver tab closes:** source runner stops after missing ACK/heartbeat; no unacknowledged item is considered imported.
- **Vault quota/save failure:** no ACK; show safe storage-full state; do not pretend completion.
- **same conversation delivered twice:** deterministic mutable ID converges to one card.
- **same title on different conversations:** distinct source IDs produce distinct cards.
- **source conversation updated:** newer provider update time replaces the same mutable imported Result.
- **unsafe/unexpected message:** reject without mutating Vault.

## Verification strategy

### Deterministic domain tests

- default card seeding only on clean/new Vault;
- one stable progress-card ID through lifecycle updates;
- deterministic source ID -> Result ID mapping;
- same source twice is idempotent;
- same title/different source IDs stay distinct;
- newer freshness updates same Result, older/equal freshness skips;
- progress card/favorite isolation;
- compact projection size limits;
- synthetic 2,500-card storage-size guard;
- batch ACK occurs only after successful Vault save;
- failed save produces no ACK/checkpoint advancement;
- safe origin/session/message validation;
- token/session/account identifiers are absent from card/message/diagnostic fixtures;
- scheduler global cooldown and no independent 429 retry storm.

### Browser tests

- clean My Dash displays the import card first/prominently;
- Start import opens the supported ChatGPT target and shows the truthful prepared-runner instruction state;
- simulated valid source messages progressively add cards without duplicate IDs;
- imported cards appear before completion;
- reload/resume skips already-current imported sources;
- pause/partial/completion lifecycle;
- completion removal leaves imported cards untouched;
- 360px card controls and no horizontal overflow;
- existing My Dash/search/saved Dash/continuation/onboarding browser flows remain green.

### Real Safari acceptance

Before claiming the full source bridge works in Safari, run a real authenticated Safari test against a disposable/bounded slice first, then a larger history. Verify opener/message behavior, same-origin source requests, adaptive throttling, progressive Vault writes, resume after closing/reopening the ChatGPT source tab, and no duplicates.

Mock/Playwright success alone is not sufficient evidence for the private ChatGPT web API behavior.
