# Feature 25 — Google Drive Vault sync across devices

## Why

DashGPT already has a portable local Vault and a GitHub storage adapter, but Feature 6 Slice C — Google Drive sync — is still unimplemented. That leaves normal phone/desktop use dependent on browser-local storage or a developer-oriented GitHub setup.

For ordinary users, the expected storage flow is simpler: keep working locally, explicitly connect Google Drive, and see the same canonical cards after connecting DashGPT on another device.

The implementation must preserve the established local-first/product model. Google authorization is a storage adapter concern, not a DashGPT account system and not a new card database.

## Product decision

DashGPT SHALL add Google Drive as an optional Vault v1 synchronization adapter.

The standard flow is:

`local Vault -> Connect Google Drive -> Google consent -> sync -> another device -> Connect Google Drive -> same Vault/cards`

The browser-local Vault remains the immediate working copy and remains usable offline.

## Authorization decision

The browser SHALL use Google Identity Services for explicit user authorization and request only:

`https://www.googleapis.com/auth/drive.file`

DashGPT SHALL NOT request broad `drive` or `drive.readonly` access.

The Google OAuth Web client ID is non-secret deployment configuration. OAuth access tokens remain transient browser memory and MUST NOT be serialized into Vault data, card content, local binding metadata, URLs or logs.

Because browser access tokens are short-lived, synchronization after token expiry SHALL require a fresh user-driven Google authorization gesture; local writes remain safe and visibly unsynced meanwhile.

## Storage decision

DashGPT SHALL create/discover a visible `DashGPT` folder and a portable `dashgpt-vault.json` file that the app created or was explicitly given access to. The file uses the existing portable Vault v1 JSON representation; Google-specific file/folder IDs and remote revision metadata stay outside the Vault schema.

The Drive file SHALL carry private app properties sufficient for deterministic rediscovery by the same DashGPT OAuth application without scanning or reading unrelated Drive files.

## Cross-device behavior

When the remote Drive Vault does not exist, DashGPT creates it from the current local Vault.

When a remote Vault exists:

- if the local device contains no meaningful user Vault content, DashGPT adopts the remote Vault and preserves its `vaultId` and canonical Card IDs;
- if local and remote use the same `vaultId`, DashGPT merges through existing Vault v1 rules before writing either side;
- if both local and remote contain meaningful content under different `vaultId`s, DashGPT MUST NOT silently combine or replace them. The UI requires an explicit migration choice before merging local objects into the selected remote Vault.

The ChatGPT import operational/system card alone does not make a fresh device a conflicting user Vault.

## What changes

- dedicated F25 OpenSpec change implementing Feature 6 Slice C;
- Google OAuth configuration/status endpoint exposing only the non-secret client ID/configured state;
- pure browser Drive adapter for discovery, create, download, update and merge;
- local non-secret Drive binding metadata;
- Storage dialog section for Connect/Reconnect, Sync now and Disconnect;
- automatic initial adoption/merge after successful authorization;
- debounced session-scoped sync while a valid access token is held;
- clear offline/expired/error states that never make local cards inaccessible;
- deterministic adapter and browser regression tests;
- deployment runbook for Google Cloud OAuth/Drive API activation.

## What does not change

- Cards remain canonical; no Google-specific Card type is introduced.
- Dashes/search/continuation continue reading the same local Vault projection.
- Google credentials are not persisted in the Vault.
- Raw ChatGPT transcripts are not added to cloud sync.
- GitHub remains a separate optional storage adapter.
- DashGPT does not add mandatory registration, a user database or a proprietary remote memory store.
- This PR does not add background refresh tokens or server-side Google account sessions.

## Acceptance

1. An unconfigured deployment keeps local Vault behavior unchanged and explains that Google Drive sync is not configured.
2. A configured deployment can start Google authorization from an explicit user action using only `drive.file`.
3. First sync creates/discovers one DashGPT-managed Drive Vault without broad Drive access.
4. A second device with no meaningful local content can authorize the same Google account and adopt the remote Vault, preserving `vaultId`, Card IDs, Dashes and events.
5. Same-vault concurrent content is merged with the existing Vault v1 rules rather than last-write-wins.
6. Different non-empty Vault IDs require an explicit migration decision before data is combined.
7. Access-token expiry/provider failure leaves local data readable and marked unsynced.
8. Disconnect removes local Google binding/authorization state but deletes neither the local Vault nor Drive data.
9. Export/import remains available regardless of Google connection state.
10. Provider tokens/credentials never appear in portable Vault serialization.
