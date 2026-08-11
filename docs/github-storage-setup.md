# DashGPT GitHub Storage — activation runbook

This runbook covers the remaining production activation of the GitHub storage adapter implemented by Feature 6 Slice B.

## Current state

Already completed in the repository/project:

- GitHub storage implementation is merged.
- Public GitHub App is registered.
- App ID: `4544269`.
- App slug: `dashgpt-storage`.
- Non-secret app identity is configured in the Worker configuration.

Still required before calling production GitHub sync activated:

1. configure protected production secrets;
2. run one real private disposable-repository acceptance smoke test;
3. verify idempotence, disconnect behavior and secret isolation.

Local memory remains usable when GitHub sync is unavailable.

## 1. Protected secrets

Required production Worker secrets:

- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_SESSION_SECRET`

The GitHub App private key is generated/downloaded from the existing `dashgpt-storage` GitHub App settings.

`GITHUB_SESSION_SECRET` must be a new high-entropy value used only for signing DashGPT GitHub pairing/session state.

Do **not**:

- commit the PEM/private key;
- paste it into ChatGPT or an issue/PR;
- put it in a card, legacy Result, Context Pack, URL or portable Vault;
- store it in browser localStorage/sessionStorage.

Configure secrets using Cloudflare's protected secret mechanism. With Wrangler, interactive input avoids command-line values:

```bash
npx wrangler secret put GITHUB_APP_PRIVATE_KEY
npx wrangler secret put GITHUB_SESSION_SECRET
```

Prefer Cloudflare Dashboard secret entry if multiline PEM entry is inconvenient.

The non-secret `GITHUB_APP_ID` / `GITHUB_APP_SLUG` identifiers do not need to be re-created merely to activate this existing app.

## 2. Real acceptance smoke test

Use a **private disposable repository** or a disposable dedicated folder in a private repository.

1. Open the current DashGPT storage management surface.
2. Select/paste the private repository/folder URL supported by the GitHub StorageLocator flow.
3. Choose the GitHub connection action.
4. In GitHub, install/authorize `dashgpt-storage` for **only the disposable repository**.
5. Return through the DashGPT setup flow.
6. Confirm the UI reports the repository as paired/synchronized without exposing tokens.
7. Confirm the repository contains the configured DashGPT Vault root (current default `.dashgpt/`).
8. Confirm the current compatibility layout is written, including the vault manifest and legacy `results/` objects where applicable. Product terminology is Card; the `results/` folder name is an existing storage compatibility detail until separately migrated.
9. Create/update/favorite a local card through the current UI behavior and synchronize.
10. Confirm one logical synchronization creates one atomic Git commit.
11. Synchronize again with no memory change and confirm no additional commit is created.
12. Refresh/reopen DashGPT and confirm remote state merges into the same Vault id.
13. Disconnect GitHub and confirm local memory remains present and usable.

## 3. Security acceptance

Before marking production GitHub sync activated, verify:

- GitHub installation is limited to the selected repository;
- the app has no unrelated permissions beyond those required by the implemented adapter;
- browser storage contains no GitHub installation token/private key/session secret;
- exported portable memory contains no GitHub token/private key/session value;
- removing network access leaves local cards/legacy Result records readable;
- no-op re-sync is idempotent;
- a different pre-existing `vaultId` in the target root produces a visible conflict instead of overwrite;
- failure leaves local memory usable and retryable.

## 4. Historical registration details

The original setup runbook included a pre-filled GitHub App creation URL and registration instructions. Those steps are no longer the current activation blocker because the public app already exists.

If the app ever has to be recreated deliberately, use the accepted architecture in `docs/adr/0004-github-app-vault-sync.md` and current GitHub App documentation rather than assuming an old pre-filled registration URL is still correct.

## Completion rule

Do not mark Feature 6 GitHub production activation complete because code is merged or `/api/storage/github/status` responds. Completion requires the protected-secret configuration **and** the real private-repository smoke test above.
