# Spec — Zero-install privacy, personalization and portable sync

## 1. Architectural boundaries

DashGPT MUST treat conversational context, DashGPT domain state and durable storage as separate layers.

### 1.1 Chat-native context

Chat-native context MAY include the current conversation, ChatGPT Project context, saved/user personalization that is available to the assistant, and other provider-native context supplied to the current turn.

Chat-native context:

- MAY influence wording, ranking, suggested categories and continuation behavior;
- MUST NOT be treated as the authoritative record of a DashGPT Result;
- MUST NOT be required to reconstruct a user's vault;
- MUST NOT be silently copied into durable DashGPT Profile fields.

If a future ChatGPT/OpenAI platform capability exposes explicit app-owned persistent storage with inspectable read/write semantics, it MAY be implemented as another storage adapter. The domain model MUST NOT depend on that future capability.

### 1.2 DashGPT domain state

DashGPT domain state includes Results and revisions, provenance, user-state events, explicit profile revisions, assets and sync-independent identifiers.

The domain representation MUST remain provider-neutral.

### 1.3 Storage adapters

Storage adapters transport/read/write vault objects. Provider-specific authentication, tokens, etags, commit SHAs, Drive IDs and similar transport metadata MUST remain outside durable Result content.

## 2. Zero-install user experience

DashGPT MUST support an **unpaired mode** in which a user can start using the ChatGPT plugin/app without a pre-existing personal deployment.

In unpaired mode DashGPT MAY:

- distill the current chat into a pending Result;
- generate a continuation/context representation;
- preview what would be saved;
- explain storage choices;
- accept a storage link for pairing.

In unpaired mode DashGPT MUST NOT say that a Result is durably saved unless a durable storage operation actually succeeded.

The first durable-save interaction SHOULD require no infrastructure concepts. The preferred flow is:

1. user starts a normal ChatGPT conversation with DashGPT;
2. user asks to save/use a Result;
3. if storage is already paired, save normally;
4. otherwise accept a supported storage link or offer local-vault initialization;
5. request only the provider authorization required for that adapter;
6. save the pending Result and report the resulting durable location/state.

Cloudflare deployment, MCP configuration, API keys and manual repository bootstrapping MUST NOT be required for this standard path.

## 3. Storage locator / link discovery

DashGPT MUST define a small provider-neutral `StorageLocator` representation containing at least:

- adapter type;
- user-visible location;
- canonical provider/resource identifier when resolved;
- capabilities such as read/write/sync;
- authorization state represented separately from vault data.

A resolver SHOULD recognize at minimum:

- compatible DashGPT instance URLs;
- GitHub repository and repository-path URLs;
- Google Drive folder URLs;
- a local-vault action initiated from the DashGPT web UI.

Pasting a link MUST NOT itself grant access. Authorization remains an explicit provider flow.

Unsupported or ambiguous links MUST fail safely and explain what kinds of locations are supported without sending the link to unrelated providers.

## 4. DashGPT Vault v1

The durable portable storage unit is a **DashGPT Vault**.

A vault MUST be inspectable without a proprietary DashGPT backend and SHOULD use UTF-8 JSON plus ordinary asset files.

Recommended v1 layout:

```text
dashgpt-vault.json
results/<result-id>/<content-version>-<content-hash>.json
events/<yyyy-mm>/<event-id>.json
profile/<profile-revision-id>.json
assets/<sha256>/<filename>
```

`dashgpt-vault.json` contains schema/version metadata and vault identity but MUST NOT contain provider credentials.

Result records remain immutable knowledge revisions. Existing Result hashing rules remain valid; synchronization metadata MUST NOT enter `contentHash`.

`events/` is append-only user state for operations such as favorite/unfavorite, archive/unarchive, pinning and other mutable presentation/user state. Event IDs MUST be globally collision-resistant so synchronization can union event sets rather than overwrite a monolithic state file.

Profile revisions are explicit, user-approved snapshots or revisions. A new profile change creates a new revision rather than silently rewriting historical profile content.

Derived search indexes, caches and rendered Markdown MAY exist locally but MUST be disposable and MUST NOT be required to recover the vault.

## 5. Personalization / DashGPT Profile

DashGPT MAY maintain a compact durable profile for stable preferences that improve the product across providers, for example:

- preferred language(s);
- preferred answer/summary density;
- stable interaction preferences;
- user-selected defaults for Result behavior;
- explicitly approved interests or working preferences.

The durable profile MUST be inspectable and editable by the user.

A preference inferred only from conversation or ChatGPT Memory MUST remain session/provider context until the user explicitly saves or approves it for the DashGPT Profile.

Sensitive personal information MUST NOT be promoted into the DashGPT Profile merely because it is present in conversation context.

The profile MUST NOT become a shadow copy of ChatGPT Memory.

## 6. Privacy and data minimization

DashGPT MUST be private by default.

- Raw chat transcripts MUST NOT be stored or synchronized by default.
- A Result SHOULD contain distilled useful knowledge plus selected provenance sufficient to continue the work.
- If raw chat/file content is about to be copied into a vault, the action MUST be explicit and visible.
- Cloud sync MUST identify the receiving provider.
- Provider credentials MUST NOT be written to the vault, Result, Context Pack, URL fragment or chat-visible configuration payload.
- Storage adapters SHOULD request the narrowest practical authorization scope.
- Deleting/disconnecting an adapter MUST NOT implicitly delete a local vault unless the user explicitly requests deletion.
- Export MUST remain possible without an active cloud provider.

An encrypted-vault mode MAY be added later. Vault v1 MUST avoid assumptions that would make client-side encryption impossible, including reliance on server-side parsing for core identity or revision semantics.

## 7. Local-first synchronization

Durable local writes SHOULD commit to the local vault/cache first and then synchronize when a remote adapter is available.

The sync engine MUST operate on immutable/revisioned vault objects rather than a provider-specific database schema.

### 7.1 Result merge

If both sides contain the same Result revision identity and the same content hash, it is the same object.

If the same logical Result/version identifier appears with different immutable content hashes, sync MUST preserve both sides as a conflict/divergence and MUST NOT silently use last-write-wins.

A resolved knowledge correction becomes an explicit new Result revision.

### 7.2 Event merge

User-state events are append-only and are merged by event ID. Duplicate IDs with identical hashes collapse. Duplicate IDs with different payload hashes are integrity conflicts.

The current favorite/archive/etc. state is derived deterministically from the merged event stream.

### 7.3 Profile merge

Profile revisions MUST retain ancestry/base metadata sufficient to detect concurrent edits. Concurrent profile heads MUST be preserved and surfaced for resolution rather than silently discarding one side.

### 7.4 Offline behavior

A temporary provider outage MUST NOT make already available local Results unreadable. Unsynced local changes MUST remain queued and visible as unsynced until a later successful synchronization.

## 8. Initial adapters and ordering

Feature 6 implementation SHOULD be delivered in slices rather than one large storage rewrite.

### Slice A — Vault core + migration

- define Vault v1 schemas;
- migrate current browser-local Result state into the vault model;
- keep the existing UI working;
- expose paired/unpaired/sync status;
- test round-trip export/import.

### Slice B — GitHub sync

- recognize GitHub storage links;
- use explicit OAuth/app authorization rather than pasted tokens;
- read/write a private repo or selected repo path;
- prove offline local writes followed by sync;
- prove moving the same vault to another compatible adapter does not change Result identity.

### Slice C — Google Drive sync

- recognize Drive folder links;
- use explicit Google authorization;
- sync the same Vault v1 objects without a Drive-specific domain model;
- run the same adapter contract tests used for GitHub.

### Slice D — Personalization boundary

- expose DashGPT Profile inspection/editing;
- allow explicit promotion of a conversational preference into the profile;
- prove that unsaved inferred context is not serialized into the vault;
- keep ChatGPT-native context optional.

### Slice E — Compatible DashGPT instance + migration UX

- adapt the existing instance protocol to the same vault/storage abstraction;
- provide provider-switch/mirror/export UX;
- remove any remaining assumption that `siteUrl` deployment is required for first use.

## 9. Adapter contract

Every writable storage adapter MUST support equivalent conceptual operations:

- resolve/describe location;
- report capabilities and authorization state;
- list/read vault objects;
- write immutable vault objects;
- detect remote version/etag changes;
- synchronize/push pending objects;
- disconnect without destroying the portable vault.

Adapter contract tests MUST run against deterministic fixtures. Product behavior MUST NOT depend on GitHub- or Drive-specific object shapes above this boundary.

## 10. Acceptance tests

Automated or deterministic integration tests MUST cover:

1. plugin/app startup with no personal instance configured;
2. unpaired Result preparation without a false durable-save claim;
3. browser/local vault round trip;
4. StorageLocator recognition for supported provider link shapes;
5. vault serialization containing no credentials;
6. raw chat absent from a normal Result save;
7. explicit profile preference round trip;
8. inferred-only preference absent from durable profile serialization;
9. immutable Result conflict preservation;
10. append-only event merge;
11. offline local write followed by successful later sync;
12. equivalent adapter contract behavior for GitHub and Google Drive fixtures as those adapters land.
