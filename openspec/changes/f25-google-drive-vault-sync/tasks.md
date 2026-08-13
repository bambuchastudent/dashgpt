# Tasks — F25 Google Drive Vault sync

## 1. Spec / overlap

- [x] Inspect Feature 6 architecture and confirm Slice C is the unimplemented Google Drive adapter.
- [x] Inspect Vault v1 browser serialization/merge rules and GitHub adapter behavior.
- [x] Inspect Storage dialog, Worker routing and current provider status surfaces.
- [x] Confirm current Google Identity Services browser authorization and Drive API scope guidance from official Google documentation.
- [x] Create dedicated Issue #50 and OpenSpec change with proposal/design/spec/tasks/Impact Manifest.
- [ ] Strictly validate this OpenSpec change before production code edits.

## 2. Google authorization/config

- [ ] Add no-store `/api/storage/google/config` endpoint exposing configured state, fixed scope and non-secret Web OAuth client ID.
- [ ] Lazy-load Google Identity Services only when the user chooses Google Drive.
- [ ] Request exactly `https://www.googleapis.com/auth/drive.file` from a user gesture.
- [ ] Keep access token and expiry in module memory only.
- [ ] Map denied/closed/expired provider states into human product messages.

## 3. Drive adapter

- [ ] Add pure/testable Drive REST adapter with injected `fetch`.
- [ ] Discover/create visible DashGPT folder through private app properties.
- [ ] Discover/create `dashgpt-vault.json` through private app properties.
- [ ] Download and validate portable Vault v1 JSON.
- [ ] Upload portable Vault using authorization header, never token query parameters.
- [ ] Track only non-secret binding metadata locally.
- [ ] Refetch remote version before write and perform bounded remerge if it changed.

## 4. Cross-device sync semantics

- [ ] First device with no remote creates remote from current local Vault.
- [ ] Same-vault sync merges existing Vault v1 objects before upload/local save.
- [ ] Effectively empty second-device local Vault adopts remote and preserves remote `vaultId`/Card IDs.
- [ ] System-operation import card alone does not block remote adoption.
- [ ] Different meaningful Vault IDs return `migration_required` without writes.
- [ ] Explicit migration merges local into remote while preserving remote `vaultId`.
- [ ] Disconnect deletes neither local nor Drive Vault data.
- [ ] Provider failure/expired token leaves local Vault readable and visibly unsynced.

## 5. Product UX

- [ ] Add Google Drive section to Storage dialog.
- [ ] Render unconfigured / ready / reconnect / syncing / synced / unsynced states.
- [ ] Add Connect/Reconnect, Sync now and Disconnect actions.
- [ ] Show explicit different-vault merge confirmation in product language.
- [ ] Keep export/import controls independent of provider state.
- [ ] Preserve 360/390px usability and no horizontal overflow.
- [ ] Update overall storage badge without implying silent cloud durability.

## 6. Verification

- [ ] Add deterministic fake-Drive tests for discover/create/download/update/idempotence.
- [ ] Verify scope allowlist and no token serialization.
- [ ] Verify same-vault merge, second-device adoption and explicit different-vault migration.
- [ ] Verify remote-version race remerge.
- [ ] Verify Worker config route configured/unconfigured behavior.
- [ ] Add browser regression for Google Storage dialog and mobile layout.
- [ ] Add browser regression for fake OAuth + second-device adoption.
- [ ] Run targeted syntax/verifier gate.
- [ ] Run `npm run verify:fast`.
- [ ] Run canonical `npm run verify:full` once before merge when CI/browser infrastructure is runnable.

## 7. Activation / handoff

- [ ] Add Google Cloud setup runbook: Drive API, consent screen, Web OAuth client, authorized JavaScript origins, `GOOGLE_CLIENT_ID` Worker variable.
- [ ] Open draft PR linked to #50 with exact verification/activation state.
- [ ] Produce deployed preview.
- [ ] Real desktop/mobile acceptance with one Google account and two browser/device Vaults.
- [ ] Update Feature 6 Slice C task state only for completed verified behavior.
- [ ] Keep PR unmerged until verification/real OAuth activation gates are understood and recorded.
