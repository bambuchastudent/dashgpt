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

Implementation PR: `#12` (`feature/f6-vault-core`).

## Slice B — GitHub sync

- [ ] Recognize supported GitHub repository/path links as StorageLocators.
- [ ] Add explicit GitHub authorization flow with minimum practical permissions.
- [ ] Implement GitHub adapter against Vault v1 object operations.
- [ ] Support offline local writes and later push/pull synchronization.
- [ ] Add deterministic GitHub adapter contract tests and conflict fixtures.

## Slice C — Google Drive sync

- [ ] Recognize supported Google Drive folder links as StorageLocators.
- [ ] Add explicit Google authorization flow.
- [ ] Implement Drive adapter against the same Vault v1 contract.
- [ ] Reuse adapter contract tests and prove provider-neutral Result identity.

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