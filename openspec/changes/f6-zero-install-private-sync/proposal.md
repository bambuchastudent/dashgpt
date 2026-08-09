# Feature 6 — Zero-install privacy, personalization and portable sync

## Why

DashGPT is already local-first and private-by-default, but the current MVP still makes a personal DashGPT instance feel like a prerequisite. That is too much setup for the intended product experience.

A new user should be able to start from ChatGPT immediately. If they already have a storage location, the normal setup should be as simple as giving DashGPT one link and completing only the provider authorization that is actually required.

ChatGPT conversation history, Projects and Memory can improve continuity and personalization, but they are conversational context, not a reliable structured DashGPT system of record. DashGPT must not depend on hidden or provider-specific memory behavior to preserve Results.

## Product decision

DashGPT separates three concerns:

1. **Chat-native context** — current conversation, Project context and available ChatGPT personalization may influence how DashGPT speaks and what it considers relevant. This layer is optional and non-authoritative.
2. **DashGPT personal state** — Results, revisions, favorites, profile preferences and storage metadata use provider-neutral schemas controlled by DashGPT.
3. **User-owned vault** — durable DashGPT state is stored in a portable vault that can live locally or synchronize through replaceable adapters such as GitHub and Google Drive.

The desired onboarding is:

`start chat -> use DashGPT immediately -> optionally paste one storage link -> authorize provider if needed -> durable sync is active`

A user MUST NOT need to deploy Cloudflare, create a repository manually, configure an API key, or understand MCP merely to begin using DashGPT.

## What changes

- Add an explicit **unpaired/chat-first mode**. DashGPT can distill, preview and hand off Results before a vault is connected, but MUST NOT claim that such Results are durably stored by DashGPT.
- Introduce a provider-neutral **DashGPT Vault** format for durable personal state.
- Treat browser storage as a working local cache/vault, not as the only persistence model.
- Add a storage-adapter boundary with initial targets:
  - local/browser vault;
  - local filesystem/local Git vault;
  - private GitHub repository or repository path;
  - Google Drive folder;
  - compatible DashGPT instance.
- Add **storage-link discovery**: a user may paste a supported link and DashGPT identifies the adapter and the minimum next authorization/setup step.
- Add a small **DashGPT Profile** for explicit user-approved preferences such as language, interaction style and stable working preferences. Inferred ChatGPT context may affect the current interaction but MUST NOT be silently copied into this profile.
- Keep raw chat history out of the vault by default. Save distilled Results and selected provenance; raw conversation content requires an explicit user choice.
- Make provider changes portable: users can export, move or mirror the same vault between storage adapters without changing Result identity.
- Preserve immutable Result guarantees across sync. Sync MUST NOT silently rewrite immutable knowledge.

## Privacy model

- Local-first remains the default architecture.
- Cloud synchronization is opt-in and names the provider receiving data.
- Credentials/tokens are adapter secrets and MUST NOT be serialized into the vault.
- The minimum data necessary for the requested operation is transferred.
- A provider failure MUST NOT make an already available local vault unreadable.
- Users can inspect/export the portable vault without a proprietary DashGPT backend.
- Future encrypted-vault mode is allowed by the format, but encryption is not required for the first adapter implementation.

## Acceptance

1. A new user can invoke DashGPT in ChatGPT without having deployed a personal DashGPT site.
2. Before a vault is connected, DashGPT clearly distinguishes conversational/pending state from durable saved state.
3. A supported GitHub, Google Drive, local or DashGPT-storage link can select the corresponding adapter without requiring the user to understand implementation details.
4. Provider authorization remains explicit; DashGPT never asks users to paste long-lived secrets into a conversation.
5. The same Result identity and durable content can move between supported storage adapters.
6. ChatGPT Memory/Project context is never the authoritative store for Result records or sync metadata.
7. Durable personalization contains only explicit/user-approved profile data; inferred conversational context is not silently persisted.
8. Raw chats are not synced by default.
9. Immutable Results never use last-write-wins to hide divergent content.
10. Losing network access to GitHub/Drive does not prevent use of already-cached local data.
