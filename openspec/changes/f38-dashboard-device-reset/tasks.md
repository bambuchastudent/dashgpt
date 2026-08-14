# Tasks — F38 dashboard device reset

## 1. OpenSpec gate

- [x] Inspect current dashboard, Vault, Google Drive sync, GitHub sync and fresh-import bootstrap overlap.
- [x] Create proposal, spec delta, design and Impact Manifest.
- [x] Run initial `openspec validate f38-dashboard-device-reset --type change --strict --no-interactive` before production edits. Validation-only commit `1e507e02234c31fc54b0b573434e49da2d792fd5` completed successfully in Cloudflare Workers build `577d6910-a814-433e-9306-76657a3daa01`; production implementation had not started.
- [ ] Re-run strict OpenSpec validation after replacing provider-specific cancellation with the centralized `dashgpt.*` write-barrier design, still before production edits.

## 2. Reset domain boundary

- [ ] Add a testable device-reset helper that enumerates/removes only `dashgpt.*` localStorage/sessionStorage keys.
- [ ] Reuse existing GitHub status/disconnect API and require successful paired disconnect before local deletion.
- [ ] Install a temporary `dashgpt.*` storage write barrier before cleanup so late/in-flight sync cannot rehydrate old local state.
- [ ] Emit a reset lifecycle signal for cooperative components while keeping the write barrier as the enforcement boundary.
- [ ] Preserve unrelated origin storage/writes and all remote Vault content.
- [ ] Restore the original storage writer if cleanup fails before navigation.
- [ ] Navigate successful reset to `/demo/` and rely on normal fresh-start bootstrap.

## 3. Dashboard UX

- [ ] Add RU/EN `Device data` / `Данные устройства` reset entry to the existing Storage/Vault dialog.
- [ ] Add explicit two-step destructive confirmation with remote-preservation/reconnect explanation.
- [ ] Add human retryable error state when safe provider disconnect or reset preparation cannot complete.
- [ ] Keep the reset surface usable without horizontal overflow at 360px and 390px.

## 4. Provider compatibility

- [ ] Verify Google Drive binding/local Vault cannot be restored by an in-flight continuation after the write barrier is active.
- [ ] Verify GitHub is disconnected before local deletion and cannot restore DashGPT browser state after the write barrier is active.
- [ ] Preserve existing provider exclusivity and Safari Google authorization behavior outside reset without provider-internal production changes.

## 5. Regression coverage

- [ ] Add deterministic verification for namespaced cleanup, write-barrier behavior and unrelated-key preservation.
- [ ] Verify GitHub disconnect ordering and failure atomicity.
- [ ] Verify Google local binding cleanup with no remote delete request.
- [ ] Add Playwright coverage for discoverability, confirmation, reset/fresh bootstrap, unrelated-key survival and mobile overflow.
- [ ] Run targeted syntax/deterministic verification and affected provider tests.

## 6. Delivery verification

- [ ] Run canonical `npm run verify:full` once before merge if the repository runner can execute it; otherwise record the exact infrastructure blocker without claiming green.
- [ ] Verify the production-shaped branch preview on desktop and a relevant mobile viewport.
- [ ] Keep the dedicated PR to `develop` linked to Issue #93 and this OpenSpec change.
- [ ] Record verification/preview evidence and reconcile this task list before requesting merge.
