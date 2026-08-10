# DashGPT GitHub Storage — activation runbook

This runbook activates the GitHub Vault adapter implemented by Feature 6 Slice B.

The application code is safe to deploy before these values exist: without GitHub App configuration, local Vault behavior continues normally and the GitHub UI reports that remote sync is not configured.

## 1. Register the public GitHub App

Use this pre-filled GitHub registration URL on the account that will own the DashGPT GitHub App:

https://github.com/settings/apps/new?name=DashGPT+Storage&description=Private+user-owned+Vault+synchronization+for+DashGPT&url=https%3A%2F%2Fdashgpt.dimkashir.workers.dev%2Fdemo%2F&setup_url=https%3A%2F%2Fdashgpt.dimkashir.workers.dev%2Fapi%2Fstorage%2Fgithub%2Fsetup&setup_on_update=false&public=true&webhook_active=false&contents=write

Expected settings:

- Name: `DashGPT Storage` (choose another clear name if GitHub reports that it is already taken)
- Homepage: `https://dashgpt.dimkashir.workers.dev/demo/`
- Setup URL: `https://dashgpt.dimkashir.workers.dev/api/storage/github/setup`
- Redirect on update: disabled; the setup endpoint expects a DashGPT-initiated pending pairing session
- Public: enabled, so another DashGPT user can install the same app
- Webhooks: disabled for this slice
- Repository permissions → Contents: **Read and write**
- No user OAuth authorization is required

Do not add unrelated repository or account permissions.

## 2. Record the non-secret app identity

After creating the app, record:

- App ID → `GITHUB_APP_ID`
- App slug (the slug in the GitHub App URL) → `GITHUB_APP_SLUG`

These values are identifiers, not user credentials, but the current deployment reads them from environment bindings together with the secrets below.

## 3. Generate the GitHub App private key

In the GitHub App settings, generate one private key and keep the downloaded `.pem` file private.

Do **not**:

- commit the PEM file to this repository;
- paste the private key into ChatGPT;
- put it in a DashGPT Vault, Result, Context Pack or URL.

The Worker accepts GitHub's downloaded PEM form through `GITHUB_APP_PRIVATE_KEY`.

## 4. Configure Worker secrets

Configure these values on the production `dashgpt` Cloudflare Worker:

- `GITHUB_APP_ID`
- `GITHUB_APP_SLUG`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_SESSION_SECRET`

`GITHUB_SESSION_SECRET` should be a new high-entropy random value used only for HMAC-signing the pending/session cookies.

With Wrangler, use interactive secret input so values do not appear in shell history:

```bash
npx wrangler secret put GITHUB_APP_ID
npx wrangler secret put GITHUB_APP_SLUG
npx wrangler secret put GITHUB_APP_PRIVATE_KEY
npx wrangler secret put GITHUB_SESSION_SECRET
```

For `GITHUB_APP_PRIVATE_KEY`, paste the complete PEM including the BEGIN/END lines into Wrangler's secret prompt. Prefer Cloudflare Dashboard secret entry if multiline terminal entry is inconvenient.

## 5. Real acceptance smoke test

Use a private disposable repository or a dedicated folder in a private repository.

1. Open DashGPT Storage.
2. Paste the repository/folder URL.
3. Choose `Connect GitHub`.
4. In GitHub, install the app on **only that repository**.
5. Return to DashGPT through the setup redirect.
6. Confirm the storage badge becomes `LOCAL + GITHUB · SYNCED`.
7. Confirm the repository contains the configured Vault root (default `.dashgpt/`) with `dashgpt-vault.json`, `results/` and state objects.
8. Favorite/unfavorite or create a local Result.
9. Confirm a later sync creates one DashGPT sync commit and the local UI remains usable throughout.
10. Refresh/reopen DashGPT and confirm remote state merges back into the same Vault id.
11. Disconnect GitHub and confirm the local Vault remains present.

## 6. Security acceptance

Before calling Slice B fully activated, verify:

- GitHub installation was limited to the selected repository;
- the GitHub App has no permissions beyond required metadata plus Contents read/write;
- no PAT or installation token appears in browser localStorage/sessionStorage;
- exported Vault JSON contains no GitHub token, private key or session value;
- removing network access leaves local Results readable;
- a second sync with no Vault changes creates no additional commit;
- a different pre-existing `vaultId` in the target folder returns a visible conflict instead of overwriting it.