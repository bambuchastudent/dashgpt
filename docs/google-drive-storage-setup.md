# Google Drive Vault sync — deployment setup

Feature 25 keeps DashGPT local-first and adds Google Drive as an optional remote copy of the same portable Vault v1.

The browser uses Google Identity Services (GIS) OAuth token authorization. No Google client secret or DashGPT account database is required.

## What the user grants

DashGPT requests exactly:

```text
https://www.googleapis.com/auth/drive.file
```

Do not add broad `drive`, `drive.readonly`, or metadata-wide scopes for this feature.

The adapter creates and manages its own visible Drive content:

```text
DashGPT/
  dashgpt-vault.json
```

The OAuth access token is kept in browser memory only. The local browser may persist the Drive folder/file IDs, Vault ID and remote version metadata, but never an access token.

## Google Cloud setup

1. Open the Google Cloud project that will own the DashGPT OAuth application.
2. Enable **Google Drive API** for that project.
3. Configure the **Google Auth Platform / OAuth consent screen**:
   - app name: `DashGPT`;
   - add only the Drive file scope used by the application;
   - while the app is in testing, add the Google accounts used for acceptance as test users if Google requires it for the selected publishing state.
4. Create an OAuth client of type **Web application**.
5. Add every DashGPT browser origin that is allowed to start Google authorization under **Authorized JavaScript origins**. Add origins only, for example:

   ```text
   https://<your-production-origin>
   https://<your-acceptance-preview-origin>
   ```

   Do not add `/demo/` paths to an origin entry.
6. Copy the Web client ID. It normally ends in `.apps.googleusercontent.com`.

The GIS browser token flow uses the public Web client ID. Do not put a Google client secret in DashGPT browser code, repository files, or Worker variables for this feature.

## DashGPT Worker configuration

Set the non-secret deployment variable:

```text
GOOGLE_CLIENT_ID=<web-oauth-client-id>.apps.googleusercontent.com
```

The Worker exposes only this public client ID plus the fixed `drive.file` scope through:

```text
GET /api/storage/google/config
```

The response is `cache-control: no-store`.

`wrangler.jsonc` intentionally does not contain a real client ID so forks and previews do not accidentally share a production OAuth identity. Configure the variable in the Cloudflare Worker/deployment environment for each environment that should support real Google authorization.

## Acceptance flow

### Device A — create remote Vault

1. Open DashGPT and confirm local cards are present.
2. Open **Storage**.
3. Press **Connect Google Drive**.
4. Complete Google account selection/consent.
5. Verify Drive now contains `DashGPT/dashgpt-vault.json`.
6. Verify DashGPT reports local + Google Drive synchronization.

### Device B — restore same Vault

1. Open the same DashGPT origin on a second browser/device with no meaningful local cards.
2. Open **Storage** → **Connect Google Drive**.
3. Authorize the same Google account.
4. Verify the remote Vault is adopted locally.
5. Verify the remote `vaultId` and canonical Card IDs are preserved.
6. Verify cards are usable after a reload even without an active OAuth token.

### Two different non-empty Vaults

1. Create meaningful local data under a different local `vaultId`.
2. Connect the Google account containing an existing DashGPT Vault.
3. Verify DashGPT shows an explicit migration choice and writes neither side yet.
4. Choose **Merge this device into Google Drive**.
5. Verify the remote `vaultId` remains canonical and both sets of cards are present.

### Provider exclusivity

1. With GitHub sync paired, open Storage.
2. Verify Google Drive Connect is blocked until GitHub is disconnected.
3. With Google Drive bound, verify GitHub Connect/auto-sync is blocked until Google Drive is disconnected.

## Failure checks

- Deny or close Google consent: local Vault unchanged.
- Expire authorization: local Vault remains readable; Storage asks to reconnect for the next remote sync.
- Simulate Drive 429/5xx: local changes remain safe and are not presented as remotely synced.
- Delete/corrupt the Drive Vault file: local data remains intact and a human-readable recovery state is shown.
- Press Disconnect: the browser binding is removed, but neither local cards nor Drive files are deleted.

## Production release gate

Before merging/deploying as generally usable Google sync, record evidence for:

- one real desktop authorization;
- one real mobile authorization;
- Device A → Device B adoption using the same Google account;
- same-Vault changes merged without Card duplication;
- explicit different-Vault migration;
- no broad Drive permission requested;
- `npm run verify:full` when repository CI/browser infrastructure is runnable.
