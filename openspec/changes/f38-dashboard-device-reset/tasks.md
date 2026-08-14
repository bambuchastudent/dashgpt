# Tasks — F38 dashboard device reset

## 1. OpenSpec gate

- [x] Inspect current dashboard, Vault, Google Drive sync, GitHub sync and fresh-import bootstrap overlap.
- [x] Create proposal, spec delta, design and Impact Manifest.
- [x] Run `openspec validate f38-dashboard-device-reset --type change --strict --no-interactive` before production edits. Validation-only commit `1e507e02234c31fc54b0b573434e49da2d792fd5` completed successfully in Cloudflare Workers build `577d6910-a814-433e-9306-76657a3daa01`; production implementation had not started.

## 2. Reset domain boundary

- [ ] Add a testable device-reset helper that enumerates/removes only `dashgpt.*` localStorage/sessionStorage keys.
- [ ] Reuse existing GitHub status/disconnect API and require successful paired disconnect before local deletion.
- [ ] Dispatch/reset provider lifecycle before local deletion so pending Google/GitHub sync cannot rehydrate state.
- [ ] Preserve unrelated origin storage and all remote Vault content.
- [ ] Navigate successful reset to `/demo/` and rely on normal fresh-start bootstrap.

## 3. Dashboard UX

- [ ] Add RU/EN `Device data` / `Данные устройства` reset entry to the existing Storage/Vault dialog.
- [ ] Add explicit two-step destructive confirmation with remote-preservation/reconnect explanation.
- [ ] Add human retryable error state when safe provider disconnect cannot complete.
- [ ] Keep the reset surface usable without horizontal overflow at 360px and 390px.

## 4. Provider integration

- [ ] Google Drive controller cancels pending sync and clears transient token/identity state on device-reset lifecycle without remote deletion.
- [ ] GitHub controller cancels pending sync on device-reset lifecycle and does not issue remote Vault deletion.
- [ ] Preserve existing provider exclusivity and Safari Google authorization behavior outside reset.

## 5. Regression coverage

- [ ] Add deterministic verification for namespaced cleanup and unrelated-key preservation.
- [ ] Verify GitHub disconnect ordering and failure atomicity.
- [ ] Verify Google local binding/session cleanup with no remote delete request.
- [ ] Add Playwright coverage for discoverability, confirmation, reset/fresh bootstrap and mobile overflow.
- [ ] Run targeted syntax/deterministic verification and affected provider tests.

## 6. Delivery verification

- [ ] Run canonical `npm run verify:full` once before merge if the repository runner can execute it; otherwise record the exact infrastructure blocker without claiming green.
- [ ] Verify the production-shaped branch preview on desktop and a relevant mobile viewport.
- [ ] Keep the dedicated PR to `develop` linked to Issue #93 and this OpenSpec change.
- [ ] Record verification/preview evidence and reconcile this task list before requesting merge.
