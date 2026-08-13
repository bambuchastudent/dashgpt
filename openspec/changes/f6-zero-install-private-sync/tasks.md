# Tasks — Feature 6

## Specification / architecture

- [x] Define zero-install/chat-first onboarding boundary.
- [x] Define ChatGPT-native context as optional personalization context, not a DashGPT database.
- [x] Define provider-neutral DashGPT Vault v1 direction.
- [x] Define privacy/data-minimization rules.
- [x] Define storage-link discovery and explicit authorization boundary.
- [x] Define local-first synchronization and immutable conflict rules.
- [x] Define explicit/user-approved DashGPT Profile boundary.
- [x] Define phased GitHub / Google Drive / local / DashGPT-instance adapter delivery.
- [x] Review/merge Feature 6 architecture PR before implementation (`#11`).

## Slice A — Vault core + migration

- [x] Add Vault v1 schema/validators and portable object identifiers.
- [x] Replace direct browser Result persistence with the Vault storage boundary while preserving current UI behavior.
- [x] Add local/browser adapter and migration from `dashgpt.demo.results.v2`.
- [x] Add append-only user-state events for favorite/archive-style state.
- [x] Add vault export/import round-trip.
- [x] Add paired / unpaired / unsynced status surfaces.
- [x] Add regression tests for immutable conflicts and no credential serialization.

Implementation PR: `#12` (`feature/f6-vault-core`), merged into `develop`.

## Slice B — GitHub sync

- [x] Recognize supported GitHub repository/path links as StorageLocators.
- [x] Add explicit GitHub App installation flow with minimum practical repository permissions.
- [x] Keep GitHub installation tokens server-side and pairing metadata in signed HttpOnly cookies.
- [x] Implement GitHub adapter against Vault v1 object operations.
- [x] Store Vault data as ordinary GitHub files under a selected root.
- [x] Merge local/remote Vault state before writing and reject different `vaultId` targets.
- [x] Commit one atomic Git tree/commit per logical synchronization.
- [x] Preserve local/offline usability and allow later retry after provider failure.
- [x] Add deterministic GitHub adapter contract tests, empty-repository initialization, idempotence checks and conflict fixtures.
- [x] Add browser pairing/sync/disconnect UX without PAT/token input.
- [x] Add privacy disclosure, accepted ADR 0004 and activation runbook.
- [x] Merge implementation PR `#13` into `develop`.
- [x] Register the public GitHub App (`4544269`, `dashgpt-storage`) and configure its non-secret identity in Worker vars.
- [ ] Configure `GITHUB_APP_PRIVATE_KEY` and `GITHUB_SESSION_SECRET` as production Worker secrets.
- [ ] Run the real private-repository acceptance smoke test from `docs/github-storage-setup.md`.

Implementation PR: `#13` (`feature/f6-github-sync`), merged into `develop`.

## Slice C — Google Drive sync

- [ ] Recognize supported Google Drive folder links as StorageLocators. F25 intentionally does not require a pasted Drive folder URL: DashGPT creates/discovers its own app-managed visible `DashGPT/dashgpt-vault.json`. Generic Drive StorageLocator input remains a separate follow-up if it is still useful.
- [x] Add explicit Google authorization flow. Implemented in draft PR `#52` / F25 using Google Identity Services and the narrow `drive.file` scope; real OAuth activation still requires deployment `GOOGLE_CLIENT_ID` and acceptance evidence.
- [x] Implement Drive adapter against the same Vault v1 contract. F25 includes create/discover/download/update, second-device adoption, same-vault merge, explicit different-vault migration and remote-version remerge.
- [ ] Reuse adapter contract tests and prove provider-neutral Result identity. Deterministic and browser assertions are committed in F25, but the repository verification infrastructure has not yet produced a conclusive execution result.

Implementation PR: `#52` (`feature/f25-google-drive-vault-sync`), open draft.

## Slice D — Personalization

- [ ] Add inspectable/editable DashGPT Profile revisions.
- [ ] Add explicit `save this preference` / approval path from conversational context.
- [ ] Ensure inferred-only ChatGPT context never appears in vault serialization.
- [ ] Add privacy tests for profile promotion and sensitive-data minimization.

## Slice E — Instance integration and portability

- [ ] Extend/refactor the existing DashGPT instance protocol onto the storage adapter/vault boundary.
- [ ] Add provider switch / mirror / export workflow.
- [ ] Remove first-use dependency on a personal `siteUrl` deployment.
- [ ] Demonstrate one vault moved between local, GitHub and Drive without changing Result identity.
