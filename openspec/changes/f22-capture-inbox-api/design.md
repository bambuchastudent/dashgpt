# Design: Capture Inbox API

## Core decision

DashGPT receives already-distilled cards. It does not fetch or parse raw conversations in this capability.

```text
AI/client
  -> POST prepared CardEnvelope
  -> temporary capture channel queue
  -> My Dash polls while open
  -> validate + reconstruct canonical Result
  -> save local Vault
  -> ACK delivery
  -> remove delivery from queue
```

The local Vault remains the canonical memory. The queue is delivery infrastructure only.

## One channel, two capabilities

Each local DashGPT installation creates one capture channel on explicit setup.

The channel has:

- `channelId` — non-secret routing identifier;
- `writeToken` — may enqueue envelopes only;
- `claimToken` — may poll and acknowledge envelopes.

`writeToken` is the only credential that an AI client/integration needs. It cannot list/read pending envelopes. `claimToken` stays with the local board and is never embedded in card content.

Rotating the channel invalidates old credentials without changing already-saved cards.

## API shape

Directionally:

```text
POST /api/capture/{channelId}
Authorization: Bearer <writeToken>
Body: CardEnvelope

GET /api/capture/{channelId}?after=<cursor>&limit=<n>
Authorization: Bearer <claimToken>

POST /api/capture/{channelId}/ack
Authorization: Bearer <claimToken>
Body: { deliveryIds: [...] }
```

The exact route names may be adjusted during implementation, but the capability separation and semantics are normative.

## Polling

My Dash polls only when the personal board is active/visible.

Suggested initial behavior:

- poll immediately on personal-board startup;
- poll every ~3 seconds while recent items are arriving;
- back off progressively when idle, bounded to a modest interval;
- pause when the page is hidden/offline;
- poll immediately again on visibility/online recovery.

The polling loop never rebuilds the full gallery for every network response. Accepted cards are persisted in bounded batches and UI refresh is coalesced through the existing canonical renderer.

No separate mobile/desktop paths exist.

## Delivery and ACK semantics

ACK happens only after durable local Vault save.

For each polled batch:

1. validate envelope shape and limits;
2. reconstruct allowed canonical Result fields;
3. derive deterministic Result identity from `provider + sourceId`;
4. compare source freshness;
5. upsert missing/newer cards in one bounded local batch;
6. save the canonical Vault successfully;
7. ACK all delivery IDs that are now durably represented locally.

If local persistence fails, the receiver does not ACK those deliveries. They remain eligible for retry until TTL expiration.

A network failure after local save but before ACK is safe because replay converges to the same deterministic source Result.

## Source identity and updates

Source identity is provider-scoped:

```text
(provider, sourceId) -> deterministic mutable Result ID
```

Two envelopes for the same source do not create duplicates.

`sourceUpdatedAt` is the freshness marker:

- newer source freshness updates the same card;
- equal/older freshness is already satisfied locally and may be ACKed without rewriting the card.

`deliveryId` is transport identity only and is never used as the canonical card identity.

## Card reconstruction / trust boundary

The API accepts only a bounded CardEnvelope. The local receiver reconstructs the Result through an allowlist.

Allowed outcome fields include bounded forms of:

- title;
- summary;
- decisions;
- facts;
- constraints;
- open questions;
- next action/current state;
- tags;
- source provider/sourceId/source URL/source freshness.

Sender-controlled payloads must not directly set:

- Result ID;
- Vault ID/schema metadata;
- favorite state;
- immutable state/hash;
- Dash membership/revisions;
- activity/event history;
- arbitrary HTML/script;
- storage/sync credentials.

## Temporary queue semantics

The server-side queue is deliberately not user memory.

Requirements:

- bounded envelope size;
- bounded items per channel;
- short finite TTL for unacknowledged deliveries;
- acknowledged items removed promptly;
- no semantic indexing/search over queue contents;
- no product feature depends on queue retention after local ACK;
- queue implementation may use the smallest suitable Cloudflare primitive, but storage-provider details do not leak into the Card/Dash product model.

The implementation should prefer a per-channel primitive with simple atomic enqueue/list/ack behavior. The chosen Cloudflare binding must be documented in the implementation PR and tested for queue limits/TTL behavior.

## Failure states

- **AI retries POST:** same source may create multiple transport deliveries, but local deterministic upsert prevents duplicate cards.
- **poll request fails:** existing Vault unchanged; retry on next cadence.
- **local quota/save fails:** no ACK; show a human receiving-paused/storage-full state.
- **ACK request fails after local save:** item may be redelivered and is safely recognized as already current.
- **expired unclaimed delivery:** it is not considered saved; sender may resend the same source later.
- **invalid/oversized envelope:** reject without queueing/local mutation.
- **wrong credential capability:** reject; writer cannot read and claimant cannot be inferred from write token.

## UX

The normal board should make this feel like cards arriving, not like managing a message broker.

For a connected user, lightweight state is enough:

- `Получаю карточки` / `Receiving cards`;
- last received time;
- pending count only when useful;
- `Pause receiving` / `Resume`;
- setup/rotate controls in settings or a compact connect surface.

There is no permanent Inbox product page. Once saved, a delivery disappears conceptually and the canonical card is the only user-facing entity.

## Relationship to ordinary capture and bulk history

This is the preferred ongoing capture transport: conversation context is distilled where it already exists, then delivered as a card.

Bulk-history migration is a source problem, not a different destination model. Any future history enumerator can submit the exact same CardEnvelope stream to this Capture Inbox, so the board/queue/upsert logic does not care whether cards came from one current chat or a thousand historical chats.

## Verification strategy

### Deterministic/API tests

- write credential can enqueue but cannot read;
- claim credential can poll/ack but write capability remains separately validated;
- malformed/oversized envelopes rejected;
- queue per-channel limits and TTL enforced;
- ACK removes delivery;
- replay after lost ACK is idempotent locally;
- same source/newer freshness updates one Result;
- same source/equal or older freshness does not rewrite/duplicate;
- same title/different source IDs remain distinct;
- arbitrary Result/Vault/favorite/immutable/Dash fields cannot cross the allowlist;
- credentials never appear in persisted Result fields.

### Browser tests

- personal My Dash starts polling after connection;
- newly enqueued prepared card appears as a canonical card without page reload;
- multiple deliveries batch into bounded persistence/UI refresh;
- hidden page backs off/pauses and catches up on return;
- duplicate/replayed delivery does not duplicate the visible card;
- source update changes the same card;
- local save failure causes no ACK;
- search/Dashes/continuation work on received cards through existing paths;
- narrow mobile and desktop use the same behavior.

## Delivery dependency

F22 is stacked on Feature 20 PR #38 because it reuses the deterministic source identity and canonical progressive-upsert lessons already introduced there. It must not copy browser-specific ChatGPT source-runner behavior into the API transport.

Before implementation, strict OpenSpec validation is required. Before merge, rebase/retarget after #38 lands and run the canonical full verification once.