# Impact Manifest — F34 Account-scoped zero-config Vault

## User-visible surfaces

- Personal dashboard/account affordance for Google-backed memory.
- Storage dialog Google provider copy/actions/states.
- Different-Vault merge confirmation.
- Connected/reconnect/disconnect state language.
- Mobile Storage/account layout.

## Runtime modules expected to change

- `demo/google-drive-sync.js` — account-oriented authorization/bootstrap controller and UI state.
- Potentially a small focused module if account UI needs separation; avoid duplicating Drive storage logic.
- `package.json` only to register new deterministic/browser regression files in existing checks when needed.

## Runtime modules explicitly reused without semantic duplication

- `demo/vault.js` — local Vault v1, merge and portable credential boundary.
- `demo/google-drive-storage.js` — Drive discovery/create/adopt/merge/update contract and `drive.file` scope.
- `src/google-drive-config.js` — public client-id/config endpoint.
- existing GitHub sync/provider exclusivity hooks.

## Data/storage impact

- No Vault schema migration.
- No Card schema migration.
- Existing `dashgpt.google-drive.binding.v1` remains compatible.
- No Google access token, email, subject/account ID, refresh token or secret is added to persisted Vault/Card data.
- Existing remote `DashGPT/dashgpt-vault.json` remains the storage object.

## Security/privacy impact

- Keep exact Google Drive `drive.file` scope.
- Keep token session-memory-only.
- Keep public Web OAuth client ID non-secret but environment-configured.
- No central DashGPT user/card database.
- Anonymous/local mode remains available.
- Different Vault identities cannot overwrite each other without explicit consent.

## Compatibility risks

- Safari popup/user-activation regression if any awaited operation moves before `requestAccessToken()`.
- Existing Google bindings must render as returning linked state, not be invalidated by copy changes.
- Provider exclusivity must continue to block simultaneous Google/GitHub remote writes.
- A misleading unconfigured Google action could regress the exact Safari/deployment confusion reported by users.
- Remote adoption may reload the page; account UX must not imply the short-lived token survives reload.

## External deployment dependency

Real authorization requires a Google Web OAuth client with the deployment origin registered and `GOOGLE_CLIENT_ID` configured in the Worker environment. Code can be correct while a deployment remains unconfigured. This must remain a separately verified activation state.

## Verification impact

- Existing Google Drive storage deterministic tests.
- Existing Google Drive browser sync tests.
- Existing Safari shortcut/user-activation regression.
- Existing remote-provider exclusivity tests.
- New account-oriented state/bootstrap regression coverage.
- `verify:fast` and canonical `verify:full` when runners are available.
- Cloudflare branch preview/mobile inspection and real stable-origin Google acceptance when configured.
