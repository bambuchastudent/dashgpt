# Tasks — F34 Account-scoped zero-config Vault

## Spec / design gate

- [x] Inspect current product/storage guidance, Vault v1, Google Drive adapter/controller, Safari-safe OAuth flow, provider exclusivity and prior Google Drive PRs.
- [x] Create dedicated F34 issue and OpenSpec proposal, design, spec delta, tasks and Impact Manifest before production edits.
- [x] Strictly validate `f34-account-scoped-vault` before production-code edits. GitHub Actions could not start project steps because of the repository billing/spending-limit blocker, so the exact strict validator command was run as a temporary validation-only Cloudflare `postinstall`; deployment of commit `da8e53c6f05d06303021cf66b9a89193c2f291fc` succeeded, proving the command exited successfully. The temporary hook was removed before production implementation.

## Implementation

- [ ] Reframe the Google provider primary action as an account action (`Continue with Google` / equivalent) rather than manual Vault setup.
- [ ] Preserve automatic anonymous local Vault behavior with no account requirement.
- [ ] On successful Google authorization, immediately bootstrap the authorized account Vault through the existing `syncGoogleDriveVault()` create/adopt/sync/migration contract.
- [ ] Keep different non-empty Vaults behind explicit merge confirmation with no pre-confirmation writes.
- [ ] Preserve Safari user-activation ordering: token request occurs in the original click task when GIS is ready.
- [ ] Preserve existing Google/GitHub provider exclusivity.
- [ ] Keep token/credential data out of portable Vault/Card content and retain only existing non-secret binding metadata.
- [ ] Keep disconnect non-destructive to local and remote Vault data.
- [ ] Make unconfigured deployment state truthful and non-actionable.
- [ ] Update human storage/setup documentation for the zero-config account flow without making storage dominate onboarding.

## Regression coverage

- [ ] Deterministic coverage: anonymous local Vault remains independent of account configuration.
- [ ] Deterministic coverage: first-account bootstrap creates a remote Vault from local state.
- [ ] Deterministic coverage: second effectively empty browser adopts the same remote Vault identity/cards.
- [ ] Deterministic coverage: same-Vault merge remains idempotent.
- [ ] Deterministic coverage: different meaningful Vaults require explicit migration and write neither side first.
- [ ] Deterministic coverage: confirmed migration preserves remote identity and both memory sets.
- [ ] Credential regression: OAuth/account credential fields never serialize into portable Vault content.
- [ ] Browser coverage: account-oriented Google action and connected/reconnect/disconnect states.
- [ ] Browser coverage: Safari-safe synchronous token request delegation remains protected.
- [ ] Browser coverage: GitHub/Google provider exclusivity remains protected.
- [ ] Browser coverage: narrow mobile layout has no horizontal overflow.

## Verification / release

- [ ] Run targeted syntax/deterministic verification while developing.
- [ ] Run `npm run verify:fast` after implementation.
- [ ] Run canonical `npm run verify:full` once before merge when runnable infrastructure is available.
- [ ] Verify final Cloudflare branch preview and relevant mobile state.
- [ ] Verify real Google authorization on a configured stable/develop origin before claiming production Google sign-in works.
- [ ] Record whether `GOOGLE_CLIENT_ID`/Authorized JavaScript origins are actually configured; do not equate code merge with OAuth deployment activation.
- [ ] Update issue/PR handoff with concrete evidence, then merge to `develop` only within verified/explicitly accepted risk.
