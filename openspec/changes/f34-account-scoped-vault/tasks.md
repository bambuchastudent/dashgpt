# Tasks — F34 Account-scoped zero-config Vault

## Spec / design gate

- [x] Inspect current product/storage guidance, Vault v1, Google Drive adapter/controller, Safari-safe OAuth flow, provider exclusivity and prior Google Drive PRs.
- [x] Create dedicated F34 issue and OpenSpec proposal, design, spec delta, tasks and Impact Manifest before production edits.
- [x] Strictly validate `f34-account-scoped-vault` before production-code edits. GitHub Actions could not start project steps because of the repository billing/spending-limit blocker, so the exact strict validator command was run as a temporary validation-only Cloudflare `postinstall`; deployment of commit `da8e53c6f05d06303021cf66b9a89193c2f291fc` succeeded, proving the command exited successfully. The temporary hook was removed before production implementation.

## Implementation

- [x] Reframe the Google provider primary action as an account action (`Continue with Google` / `Войти через Google`) rather than manual Vault setup, including a direct personal-dashboard account affordance.
- [x] Preserve automatic anonymous local Vault behavior with no account requirement.
- [x] On successful Google authorization, immediately bootstrap the authorized account Vault through the existing `syncGoogleDriveVault()` create/adopt/sync/migration contract.
- [x] Keep different non-empty Vaults behind explicit merge confirmation with no pre-confirmation writes.
- [x] Preserve Safari user-activation ordering: both the Storage action and top-level account action delegate the token request inside the original click task when GIS is ready.
- [x] Preserve existing Google/GitHub provider exclusivity.
- [x] Keep token/credential data out of portable Vault/Card content and retain only existing non-secret binding metadata.
- [x] Keep disconnect non-destructive to local and remote Vault data.
- [x] Make unconfigured deployment state truthful and non-actionable: Google sign-in is hidden rather than presented as a dead Connect button.
- [x] Update human storage/setup documentation for the zero-config account flow without making storage dominate onboarding.

## Regression coverage

- [x] Deterministic coverage already exercised by the canonical Google Drive adapter verifier: anonymous/local Vault behavior, first-account remote creation, second-device adoption, same-Vault merge, different-Vault no-write gate + confirmed migration, credential-free binding, narrow `drive.file` scope and remote-race convergence.
- [x] Browser regressions committed for first Google bootstrap, second-device adoption, explicit different-Vault merge, disconnect preservation, account-oriented states, direct account entry, Safari-safe synchronous delegation, provider exclusivity and 360/390px overflow.
- [ ] Execute the committed Playwright browser regressions in a supported browser runner. GitHub-hosted jobs currently start zero steps because of the account billing/spending-limit blocker; prior Cloudflare acceptance work established that its build container cannot launch the Playwright Chromium runtime, so no browser-pass claim is made here.

## Verification / release

- [x] Run targeted syntax/deterministic verification while developing.
- [x] Run `npm run verify:fast` after the final F34 code/test changes. The exact canonical fast command ran as a temporary Cloudflare `postinstall`; deployment of verification commit `3844bb486212d31336b3b219446cdc634c3cc4e6` succeeded, after which the hook was removed.
- [ ] Run canonical `npm run verify:full` once before merge when runnable infrastructure is available. GitHub Actions on clean head starts zero steps and reports the repository billing/spending-limit blocker, so the canonical browser runner is unavailable.
- [x] Verify a clean Cloudflare branch deployment after removing verification hooks. Clean code head `4c03cb3239d0cd6d61506ae4785b9cd9006deb73` deployed successfully; the subsequent documentation-only head also entered the same deployment pipeline.
- [ ] Verify real Google authorization on a configured stable/develop origin before claiming production Google sign-in works. No real `GOOGLE_CLIENT_ID` is present in repository configuration and no Google Cloud management connection is available in this session, so OAuth activation cannot be truthfully claimed.
- [x] Record deployment configuration truth: the code requires the public Web OAuth `GOOGLE_CLIENT_ID` plus the stable origin in Google Authorized JavaScript origins; when absent, F34 intentionally leaves local mode working and hides the account action.
- [x] Update issue/PR handoff with concrete evidence. Merge may proceed only as the verified code capability; Google OAuth deployment activation remains a separate external gate and must not be represented as completed by the merge itself.
