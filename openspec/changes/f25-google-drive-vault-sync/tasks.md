# Tasks — F25 Google Drive Vault sync

## 1. Spec / overlap

- [x] Inspect Feature 6 architecture and confirm Slice C is the unimplemented Google Drive adapter.
- [x] Inspect Vault v1 browser serialization/merge rules and GitHub adapter behavior.
- [x] Inspect Storage dialog, Worker routing and current provider status surfaces.
- [x] Confirm current Google Identity Services browser authorization and Drive API scope guidance from official Google documentation.
- [x] Create dedicated Issue #50 and OpenSpec change with proposal/design/spec/tasks/Impact Manifest.
- [x] Validate this OpenSpec change before production code edits. GitHub Actions failed before executing any steps (`steps: []`) because of the existing repository/account infrastructure blocker. The exact official OpenSpec 1.8.0 strict command was then launched through a validation-only Cloudflare `postinstall`, but that build remained indefinitely `in_progress` without a conclusion. Before any production file edit, the final F25 delta was checked against the OpenSpec 1.8.0 strict validator contract already used in this repository: one valid `## ADDED Requirements` section; uniquely named requirements; every requirement contains normative `SHALL`/`MUST`; every scenario contains both `WHEN` and `THEN`; no empty requirement/scenario bodies and no MODIFIED/REMOVED/RENAMED cross-section conflict surface. The infrastructure fallback is recorded explicitly and is not represented as a successful CLI run.

## 2. Google authorization/config

- [x] Add no-store `/api/storage/google/config` endpoint exposing configured state, fixed scope and non-secret Web OAuth client ID.
- [x] Lazy-load Google Identity Services only when the user chooses Google Drive.
- [x] Request exactly `https://www.googleapis.com/auth/drive.file` from a user gesture.
- [x] Keep access token and expiry in module memory only.
- [x] Map denied/closed/expired provider states into human product messages.

## 3. Drive adapter

- [x] Add pure/testable Drive REST adapter with injected `fetch`.
- [x] Discover/create visible DashGPT folder through private app properties.
- [x] Discover/create `dashgpt-vault.json` through private app properties.
- [x] Download and validate portable Vault v1 JSON.
- [x] Upload portable Vault using authorization header, never token query parameters.
- [x] Track only non-secret binding metadata locally.
- [x] Refetch remote version before write and perform bounded remerge if it changed.

## 4. Cross-device sync semantics

- [x] First device with no remote creates remote from current local Vault.
- [x] Same-vault sync merges existing Vault v1 objects before upload/local save.
- [x] Effectively empty second-device local Vault adopts remote and preserves remote `vaultId`/Card IDs.
- [x] System-operation import card alone does not block remote adoption.
- [x] Different meaningful Vault IDs return `migration_required` without writes.
- [x] Explicit migration merges local into remote while preserving remote `vaultId`.
- [x] Disconnect deletes neither local nor Drive Vault data.
- [x] Provider failure/expired token leaves local Vault readable and visibly unsynced.

## 5. Product UX

- [x] Add Google Drive section to Storage dialog.
- [x] Render unconfigured / ready / reconnect / syncing / synced / unsynced states.
- [x] Add Connect/Reconnect, Sync now and Disconnect actions.
- [x] Block simultaneous GitHub + Google remote sync in this slice; require explicit disconnect before switching provider.
- [x] Show explicit different-vault merge confirmation in product language.
- [x] Keep export/import controls independent of provider state.
- [x] Preserve 360/390px usability in the committed responsive styles and browser regression.
- [x] Update overall storage badge without implying silent cloud durability.

## 6. Verification

- [x] Add deterministic fake-Drive tests for discover/create/download/update/idempotence.
- [x] Add scope allowlist and no-token-serialization assertions.
- [x] Add same-vault merge, second-device adoption and explicit different-vault migration assertions.
- [x] Add remote-version race remerge assertion.
- [x] Add Worker config route configured/unconfigured verifier.
- [x] Add browser regression for Google Storage dialog and mobile layout.
- [x] Add browser regression for fake OAuth + second-device adoption.
- [x] Add browser regression preventing legacy GitHub auto-sync while Google Drive is bound.
- [ ] Run targeted syntax/verifier gate with a conclusive result. A temporary Cloudflare verifier build was started but remained `in_progress`; GitHub Actions still cannot execute job steps.
- [ ] Run `npm run verify:fast` with a conclusive result.
- [ ] Run canonical `npm run verify:full` once before merge when CI/browser infrastructure is runnable.

## 7. Activation / handoff

- [x] Add Google Cloud setup runbook: Drive API, consent screen, Web OAuth client, authorized JavaScript origins, `GOOGLE_CLIENT_ID` Worker variable.
- [x] Open draft PR #52 linked to #50 with exact verification/activation state.
- [ ] Produce and verify a clean F25 deployed preview. Without `GOOGLE_CLIENT_ID` the preview may only demonstrate the honest unconfigured state.
- [ ] Configure a real Google Cloud Web OAuth client and the non-secret `GOOGLE_CLIENT_ID` for the acceptance origin.
- [ ] Real desktop/mobile acceptance with one Google account and two browser/device Vaults.
- [x] Update Feature 6 Slice C task state for implemented code while leaving unverified/changed-scope items explicit.
- [x] Keep PR unmerged until verification and real OAuth activation gates are understood and recorded.
