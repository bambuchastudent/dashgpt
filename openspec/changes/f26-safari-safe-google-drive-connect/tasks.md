# Tasks — F26 Safari-safe Google Drive connect

## OpenSpec / scope

- [x] Inspect F25 Google Drive sync controller and browser tests.
- [x] Inspect F23 browser-launch requirements and F6/F25 storage overlap.
- [x] Create dedicated issue #59 and OpenSpec change.
- [x] Write proposal, design, spec delta and Impact Manifest before production edits.
- [x] Perform structural OpenSpec review before production edits: one ADDED Requirements section; every requirement uses SHALL; every scenario uses WHEN/THEN; no unrelated capability scope.
- [ ] Obtain executable OpenSpec CLI/CI validation; if project infrastructure prevents it, preserve the structural-validation evidence and record the blocker explicitly.

## Implementation

- [x] Preload the Google browser library once configured state is known.
- [x] Render preparing/ready/retry states truthfully.
- [x] Move the Google account request to the synchronous Connect click path before awaited networking.
- [x] Re-check GitHub pairing after Google returns and before Drive sync.
- [x] Preserve existing memory-only session state and Vault merge semantics.

## Regression tests

- [x] Extend the Google Drive browser fake to record `navigator.userActivation.isActive` when the account request is made.
- [x] Add delayed GitHub-status networking and assert account request still sees active user activation.
- [x] Keep existing second-device adoption, migration, provider-exclusivity and no-persisted-session-value tests in the same suite.

## Documentation

- [x] Add `docs/browser-flow-regression-guide.md` with the reusable ordering/browser-acceptance rules.
- [x] Add `docs/handoff-f26-safari-google-drive.md` for the next agent.
- [x] Record the separate `Сохранить чат` provider/destination UX as follow-up scope in the handoff instead of widening F26.

## Verification

- [ ] Run targeted syntax/check tests where the execution environment permits.
- [ ] Run `npm run verify:fast` where the execution environment permits.
- [ ] Run `npm run verify:full` once before merge where applicable.
- [ ] Verify deployed preview.
- [ ] Real macOS Safari: Storage → Connect Google Drive opens Google account UI from one click.
- [ ] Chrome regression smoke.
- [ ] Merge only with any unavailable verification explicitly recorded rather than represented as passed.
