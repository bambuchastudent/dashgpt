# Google-backed DashGPT Vault — deployment setup

DashGPT remains local-first: every browser can use an automatic local Vault without registration. On a deployment configured for Google authorization, the user can choose **Continue with Google**. DashGPT then automatically discovers or creates that Google account's remote DashGPT Vault and keeps the local browser as the immediate working copy.

The user does not manually create, name or select a Vault.

## What the user grants

DashGPT requests exactly:

```text
https://www.googleapis.com/auth/drive.file
```

Do not add broad `drive`, `drive.readonly`, or metadata-wide scopes.

The adapter creates and manages only its own visible Drive content:

```text
DashGPT/
  dashgpt-vault.json
```

The OAuth access token is kept in browser memory only. The browser may persist the Drive folder/file IDs, Vault ID and remote version metadata, but never an access token, refresh token, Google email/account identifier or client secret in the portable Vault.

## User flow

### Anonymous/local

The browser automatically creates or loads its local Vault. Cards, search, Dashes and continuation work without sign-in or remote storage.

### Continue with Google

After Google authorization DashGPT immediately runs account-Vault bootstrap:

- no remote DashGPT Vault exists → create it from the current local Vault;
- remote Vault exists and this browser has no meaningful local memory → adopt the remote Vault, preserving its `vaultId` and Card identities;
- local and remote share a `vaultId` → merge/sync them;
- both are meaningful but have different `vaultId` values → write neither side and ask once whether to merge this device into the Google Vault.

After bootstrap, the local Vault remains the working copy and the existing bounded/debounced sync path persists changes remotely while authorization is valid.

On page reload the short-lived token is intentionally gone. Existing local cards remain available. A durable non-secret Drive binding allows the UI to show **Reconnect Google** when remote synchronization is needed again.

### Disconnect

Disconnect removes the browser's Google token/binding state only. It does not delete the local Vault or `DashGPT/dashgpt-vault.json` from Drive.

## Google Cloud setup

1. Open the Google Cloud project that owns the DashGPT OAuth application.
2. Enable **Google Drive API**.
3. Configure the **Google Auth Platform / OAuth consent screen**:
   - app name: `DashGPT`;
   - add only the Drive file scope used by the application;
   - while the app is in testing, add acceptance Google accounts as test users when required by Google's publishing state.
4. Create an OAuth client of type **Web application**.
5. Add every stable DashGPT browser origin that may start authorization under **Authorized JavaScript origins**, for example:

   ```text
   https://<production-origin>
   https://<acceptance-origin>
   ```

   Add origins only; do not add `/demo/` paths.
6. Copy the Web client ID. It normally ends in `.apps.googleusercontent.com`.

The GIS browser token flow uses the public Web client ID. Do not put a Google client secret in DashGPT browser code, repository files or Worker variables.

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

`wrangler.jsonc` intentionally does not contain a real client ID: forks and branch previews must not silently share a production OAuth identity. Configure the variable in the deployment environment for each stable origin intended to support real Google authorization.

If the variable is absent, DashGPT must stay fully usable locally and must not show a deceptively actionable Google sign-in control.

## Acceptance flow

### Device A — first account Vault

1. Open DashGPT with meaningful local cards.
2. Press **Continue with Google**.
3. Complete Google authorization.
4. Verify Drive now contains `DashGPT/dashgpt-vault.json`.
5. Verify DashGPT reports the Google-backed Vault as synchronized.
6. Verify the remote Vault contains the existing local cards and the same `vaultId`.

### Device B — same account

1. Open the same configured DashGPT origin on another browser/device with no meaningful local cards.
2. Press **Continue with Google** and authorize the same Google account.
3. Verify the existing remote Vault is adopted automatically.
4. Verify the remote `vaultId` and canonical Card IDs are preserved.
5. Reload and verify the cards remain usable locally while the UI asks for Google reauthorization only when another remote sync is needed.

### Two different non-empty Vaults

1. Create meaningful local data under a different local `vaultId`.
2. Continue with a Google account containing an existing DashGPT Vault.
3. Verify DashGPT shows one explicit merge choice and writes neither side yet.
4. Choose **Merge this device into my Google Vault**.
5. Verify the remote `vaultId` remains canonical and both sets of cards are present locally and remotely.

### Provider exclusivity

1. With GitHub sync paired, verify Google account bootstrap is blocked until GitHub is disconnected.
2. With a Google Drive binding, verify GitHub Connect/auto-sync remains blocked until Google is disconnected.

## Failure checks

- Deny or close Google consent: local Vault unchanged.
- Expire authorization: local Vault remains readable; UI asks to reconnect for the next remote sync.
- Simulate Drive 429/5xx: local changes remain safe and are not presented as remotely synced.
- Delete/corrupt the Drive Vault file: local data remains intact and a human-readable recovery state is shown.
- Disconnect: local and Drive data both remain intact.

## Production activation gate

Code merge and OAuth activation are separate states. Before claiming Google-backed DashGPT memory works for ordinary users on a stable deployment, record evidence for:

- `GOOGLE_CLIENT_ID` configured in that Worker environment;
- the exact stable origin registered as an Authorized JavaScript origin;
- one real desktop Google authorization;
- one real mobile Google authorization;
- Device A → Device B adoption using the same Google account;
- same-Vault changes merged without Card duplication;
- explicit different-Vault migration;
- no broader Drive permission requested;
- canonical `npm run verify:full` when repository browser infrastructure is runnable.
