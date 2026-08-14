# Tasks — F38 dashboard device reset

## 1. OpenSpec gate

- [x] Inspect current dashboard, Vault, Google Drive sync, GitHub sync and fresh-import bootstrap overlap.
- [x] Create proposal, spec delta, design and Impact Manifest.
- [x] Run initial `openspec validate f38-dashboard-device-reset --type change --strict --no-interactive` before production edits. Validation-only commit `1e507e02234c31fc54b0b573434e49da2d792fd5` completed successfully in Cloudflare Workers build `577d6910-a814-433e-9306-76657a3daa01`; production implementation had not started.
- [ ] Re-run strict OpenSpec validation after replacing provider-specific cancellation with the centralized `dashgpt.*` write-barrier design. The revised OpenSpec was committed before production edits, but repeat GitHub Actions validation is blocked before job startup by the repository account billing/spending-limit state; do not report this gate as green.

## 2. Reset domain boundary

- [x] Add a testable device-reset helper that enumerates/removes only `dashgpt.*` localStorage/sessionStorage keys.
- [x] Reuse existing GitHub status/disconnect API and require successful paired disconnect before local deletion.
- [x] Reject unavailable/malformed GitHub pairing status rather than assuming an unsafe disconnected state.
- [x] Install a temporary `dashgpt.*` storage write barrier before cleanup so late/in-flight sync cannot rehydrate old local state.
- [x] Emit a reset lifecycle signal for cooperative components while keeping the write barrier as the enforcement boundary.
- [x] Preserve unrelated origin storage/writes and all remote Vault content.
- [x] Restore the original storage writer if cleanup fails before cleanup completes; keep the barrier active if cleanup succeeded but navigation fails.
- [x] Navigate successful reset to `/demo/` and rely on normal fresh-start bootstrap.

## 3. Dashboard UX

- [x] Add RU/EN `Device data` / `Данные устройства` reset entry to the existing Storage/Vault dialog.
- [x] Add explicit two-step destructive confirmation with remote-preservation/reconnect explanation.
- [x] Add human retryable error state when safe provider disconnect or reset preparation cannot complete.
- [x] Prevent Escape/cancel from hiding an already-running destructive reset.
- [x] Add responsive CSS and Playwright assertions for the 390px no-horizontal-overflow contract.

## 4. Provider compatibility

- [x] Verify deterministically that `dashgpt.*` late writes, including the Google Drive binding/local Vault keys, are rejected while unrelated writes remain allowed.
- [x] Verify deterministically that GitHub disconnect happens before the write barrier and local deletion, and disconnect failure preserves local state.
- [x] Preserve existing provider exclusivity and Safari Google authorization behavior by making no provider-internal production changes.

## 5. Regression coverage

- [x] Add deterministic verification for namespaced cleanup, write-barrier behavior and unrelated-key preservation.
- [x] Verify GitHub status/disconnect ordering, malformed-status safety and disconnect failure atomicity.
- [x] Verify Google local binding is included in namespaced cleanup and no Google remote-delete operation is introduced by the reset path.
- [x] Add Playwright coverage for discoverability, confirmation, reset/fresh bootstrap, unrelated-key survival and mobile overflow.
- [x] Run `node --check` on the reset controller/verifier and execute the deterministic verifier locally: `verify-device-reset: ok`.
- [ ] Run the affected provider/browser suites on a repository runner; GitHub Actions currently fails before job startup because of the account billing/spending-limit blocker.

## 6. Delivery verification

- [ ] Run canonical `npm run verify:full` once before merge. The available GitHub Actions runner currently does not start because of the account billing/spending-limit blocker, so full verification is not claimed green.
- [ ] Verify the production-shaped branch preview on desktop and a relevant mobile viewport. Cloudflare Workers preview build `7bcff82f-9266-4db6-b156-c03afb4907f5` remained `in_progress`; a final-head preview has therefore not been claimed verified.
- [x] Keep the dedicated PR #95 to `develop` linked to Issue #93 and this OpenSpec change.
- [x] Record verification evidence and blockers in this task list and PR description without claiming blocked checks as green.
