# Design — Google Drive Vault sync across devices

## Context

Feature 6 already established a provider-neutral Vault v1 and local-first merge rules. Slice A implemented browser Vault persistence/export/import; Slice B implemented GitHub sync. Slice C was reserved for Google Drive but has no runtime implementation.

The user-visible problem is not “add another cloud database.” It is: let the same portable Vault move between phone and desktop with ordinary Google authorization and minimal setup.

## Goals

- preserve one canonical local Vault model;
- add Google Drive as a replaceable storage adapter;
- request the narrowest practical Google scope;
- make a second-device restore obvious and safe;
- keep tokens out of durable DashGPT state;
- avoid mandatory DashGPT registration/backend identity;
- keep local/offline operation first-class.

## Non-goals

- background daemon sync after the browser tab/session has ended;
- server-side refresh-token storage;
- broad Drive browsing/search;
- syncing arbitrary user-selected Drive files;
- raw transcript backup;
- merging unrelated Vaults without a user decision;
- replacing GitHub sync or export/import.

## Authorization architecture

Use Google Identity Services (GIS) browser OAuth token model.

Deployment exposes only:

```json
{
  "configured": true,
  "clientId": "...apps.googleusercontent.com",
  "scope": "https://www.googleapis.com/auth/drive.file"
}
```

The OAuth client ID is public configuration. No client secret is used by the browser token flow.

`google.accounts.oauth2.initTokenClient()` is initialized only after the user chooses Connect/Reconnect. The returned access token is kept in module memory together with `expiresAt`. It is never written to localStorage/sessionStorage/Vault/URL.

When the token expires, automatic sync stops and the UI reports that Google authorization must be refreshed. A new access token is requested only from another explicit user action.

## Drive storage shape

Use visible My Drive content rather than hidden appData so the user retains an ordinary inspectable/exportable file:

```text
DashGPT/
  dashgpt-vault.json
```

Both folder and file are created by DashGPT with private `appProperties`:

- folder: `dashgptKind=folder-v1`
- vault file: `dashgptKind=vault-v1`

The vault file also stores `dashgptVaultId=<vaultId>` as an app property after creation/update so a binding can be inspected without downloading unrelated files.

The adapter queries only app-created/app-authorized files visible under `drive.file`; it does not request global Drive read access.

## Local binding metadata

Persist only non-secret adapter metadata under a dedicated local key:

```json
{
  "version": 1,
  "provider": "google-drive",
  "folderId": "...",
  "fileId": "...",
  "vaultId": "vault_...",
  "modifiedTime": "...",
  "remoteVersion": "..."
}
```

This binding can survive reload and communicate “Google Drive was connected here,” but it is not sufficient to access Drive. A fresh OAuth token is still required.

Disconnect deletes this binding and transient token state only.

## Adapter module split

### `demo/google-drive-storage.js`

Pure/testable adapter logic:

- constants/scope;
- authorized REST request wrapper;
- list/discover managed folder and vault file;
- create folder/vault file;
- download portable Vault;
- upload portable Vault;
- classify local Vault as effectively empty vs meaningful;
- same-vault merge/adoption/migration decision logic;
- sync function returning merged Vault + binding + status.

Network access is dependency-injected through `fetchFn` for deterministic tests.

### `demo/google-drive-sync.js`

Browser UI/controller:

- read deployment config;
- lazy-load GIS script;
- request token on user click;
- call pure adapter sync;
- ask explicit confirmation when different non-empty Vault IDs require migration;
- save merged/adopted local Vault;
- render configured / reconnect / connected / syncing / unsynced states;
- schedule debounced session sync after local Vault changes while token is valid;
- disconnect without deleting either data copy.

### Worker config route

`GET /api/storage/google/config` returns only configured state, client ID and fixed scope. No token exchange occurs on the Worker in this slice.

## Sync state machine

### No remote vault

1. Authorize.
2. Create/find DashGPT folder.
3. Create `dashgpt-vault.json` from local portable Vault.
4. Persist non-secret binding.
5. Mark local + Google synced.

### Remote exists, same `vaultId`

1. Download remote.
2. `mergeVaults(remote, local)` so the remote identity stays canonical.
3. Upload merged if content differs.
4. Save same merged Vault locally.
5. Update binding metadata.

### Remote exists, local effectively empty, different `vaultId`

Fresh browser-local state frequently has a generated local `vaultId` plus operational/system cards. Treat that as an uninitialized device if it contains no meaningful user cards/events/dashes/profile revisions.

1. Download remote.
2. Replace local with portable remote Vault.
3. Preserve remote `vaultId` and all canonical Card IDs.
4. Do not upload a synthetic local identity over it.

### Remote exists, both meaningful, different `vaultId`

Return a `migration_required` result without writing either side.

UI explains both local and Drive Vault IDs/counts and asks for explicit confirmation: “Merge this device into Google Drive.” If confirmed:

1. merge `local` into `remote` (`mergeVaults(remote, local)`), preserving remote `vaultId`;
2. upload merged remote;
3. save merged remote locally;
4. record binding.

There is no silent replacement or silent unrelated-vault union.

## Meaningful-local classification

The operational ChatGPT import progress card (`system-operation`) is not user memory and MUST NOT block second-device adoption.

Meaningful local content includes:

- any non-system Card/Result;
- any user-state event not solely tied to dismissing/restoring a system operation;
- any Dash revision;
- any profile revision.

This classifier is intentionally conservative: uncertainty means migration confirmation, not automatic replacement.

## Remote update safety

Each discovery/download returns Drive `version` and `modifiedTime`. Before upload, the adapter refetches metadata for the bound file. If the remote version changed since download, it downloads again and re-merges before writing. The adapter performs a bounded retry rather than overwriting a newly changed remote snapshot blindly.

The browser slice does not claim perfect distributed locking. Vault merge semantics make replay/idempotence safe for normal races, while explicit version re-read reduces lost updates.

## UI

Storage dialog adds a Google Drive provider card next to GitHub:

- unconfigured: “Google Drive sync is not configured on this deployment yet.”
- ready: `Connect Google Drive`;
- bound but no token: `Reconnect Google Drive` + “local changes are safe; reconnect to sync”;
- authorized: `Sync now`, `Disconnect`;
- synced status includes local + Google Drive;
- different-vault state explains the choice in product language and requires confirmation.

No raw OAuth errors or tokens are shown. Human states are mapped from provider failures.

## Security/privacy

- exact scope allowlist: `drive.file` only;
- no `drive`, `drive.readonly`, metadata-wide scopes;
- Authorization header only; access token never placed in query parameters;
- no token persistence;
- no credentials in Vault serialization or binding metadata;
- no raw transcript addition;
- Drive disconnect is non-destructive;
- OAuth client ID endpoint is no-store and returns no secret.

## Verification strategy

Deterministic Node tests cover adapter behavior with fake Drive REST responses. Browser tests cover Storage dialog state and second-device adoption by injecting a fake GIS + fetch implementation. Existing Vault/GitHub tests remain unchanged.

Because Google OAuth itself cannot be completed in automated CI without a real account, production activation includes a real-device/manual acceptance gate after the Google Cloud Web client is configured.
