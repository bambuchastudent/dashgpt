# Impact Manifest — F25 Google Drive Vault sync

## Directly affected production surfaces

- `demo/index.html` — Storage dialog gets Google Drive controls and loads the Google sync controller.
- `demo/google-drive-storage.js` — new provider adapter over portable Vault v1.
- `demo/google-drive-sync.js` — new browser authorization/sync controller.
- `demo/vault.js` — reused as canonical serialization/merge source; change only if a small shared classifier/helper is required.
- `src/worker.js` — new non-secret Google OAuth configuration route.
- `package.json` — syntax/targeted verification registration.

## Directly affected tests/docs

- new deterministic Google Drive adapter verifier;
- new Playwright Storage-dialog/second-device regression;
- existing Vault/UI/worker verification must remain green;
- `docs/google-drive-storage-setup.md` activation runbook;
- Feature 6 task state updated only after implementation evidence exists.

## Domain/model impact

None. Cards/Results, Dashes, events, profile revisions and continuation remain provider-neutral Vault v1 objects. Google Drive IDs and OAuth state are adapter metadata only.

## Storage impact

Adds one optional remote copy of the portable Vault under a DashGPT-created visible Drive folder/file. Local browser storage remains the working copy and offline source.

Different-vault migration is explicit. Same-vault merge reuses existing `mergeVaults` semantics. No second remote database is introduced.

## Privacy/security impact

High enough to require explicit review because OAuth and cloud transfer are introduced.

Controls:

- only `https://www.googleapis.com/auth/drive.file` scope;
- no Google client secret in browser or repository;
- access token memory-only;
- no token in Vault/local binding/URL/logs;
- no raw chat transcript sync;
- no broad Drive browsing;
- disconnect is non-destructive;
- user sees Google Drive as the receiving provider before authorization.

## Deployment impact

New optional Worker variable:

- `GOOGLE_CLIENT_ID`

External Google Cloud configuration required for activation:

- enable Google Drive API;
- configure OAuth consent screen;
- create Web OAuth client;
- authorize the deployed DashGPT JavaScript origins.

Unconfigured deployments stay local-first and functional.

## Compatibility impact

- Existing browser Vault data remains readable unchanged.
- GitHub sync remains independent.
- Export/import format remains Vault v1.
- No card ID migration.
- Second device adopts remote `vaultId` when local content is effectively empty.

## Failure modes to verify

- OAuth popup denied/closed;
- token expiration;
- Drive 401/403/429/5xx;
- Drive file deleted/moved;
- duplicate managed files;
- remote changes between download and upload;
- different non-empty local/remote Vault IDs;
- malformed remote JSON;
- quota/storage failure while saving merged local Vault;
- narrow/mobile Storage dialog overflow.
