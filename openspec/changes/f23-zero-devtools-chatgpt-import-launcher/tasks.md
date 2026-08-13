# Tasks: Zero-DevTools ChatGPT Import Launcher

## 1. Spec and overlap

- [x] Inspect Feature 20 launcher/source/receiver implementation and current OpenSpec state.
- [x] Inspect overlap with import progress card, local Vault, onboarding, mobile layout, privacy and active import follow-ups (#41/#42/#43/#45 and PR #47).
- [x] Record browser-security truth: no DashGPT-origin cross-origin injection into `chatgpt.com`.
- [x] Strictly validate the original F23 scope before production-code edits. GitHub Actions could not start any steps because of the repository account infrastructure blocker, so the exact official OpenSpec 1.8.0 strict command was executed as a validation-only Cloudflare preview `postinstall`; deployment succeeded before production files were edited.
- [x] Record real-device iPhone Safari acceptance failure: saved long `javascript:` bookmark action was present but did not execute the importer reliably.
- [x] Revise proposal/design/spec before changing production code again: iPhone/iPad Safari uses Apple's `Run JavaScript on Web Page` Shortcut adapter; Android/desktop keep bookmark action.
- [x] Strictly validate the revised Safari-Shortcut OpenSpec scope before editing production code for that adapter. The exact OpenSpec 1.8.0 strict command ran successfully through the validation-only Cloudflare build before the Safari production edits.
- [x] Record real-user discoverability failure: populated existing Vault can have no visible import card because the old seed path requires a newly-created empty Vault.
- [x] Revise proposal/design/spec before changing production code for existing-Vault card discoverability and F24 stacking.
- [x] Validate the revised discoverability/F24-integration scope before production edits for the new acceptance finding. The exact official OpenSpec 1.8.0 strict command was launched twice as validation-only Cloudflare builds (`a1882220...` and `7818ba93...`), but Cloudflare left both builds indefinitely `in_progress` without a success/failure conclusion while GitHub Actions remained unavailable. As the infrastructure fallback, the delta was checked directly against the OpenSpec v1.8.0 validator implementation/tag: all 12 ADDED requirements are uniquely named and contain strict `SHALL`/`MUST` text, all 28 scenarios contain `WHEN`/`THEN`, the delta has no empty/missing sections, duplicate/cross-section conflicts, or MODIFIED scenario-loss surface. No production file for this acceptance finding was edited before this source-parity validation completed.

## 2. Shared action generation

- [x] Extend the existing final Feature 20 source-runner builder with a reusable `javascript:` action generator for Android/desktop.
- [x] Generate fresh runtime session/nonce values on every bookmark-action execution.
- [x] Reuse bridge-state/handshake hooks; do not fork source import logic.
- [x] Add receiver auto-connect from the explicit user action where the browser permits it.
- [x] Preserve the visible `Connect DashGPT` fallback when popup/receiver open is blocked.
- [x] Enforce HTTPS receiver-origin normalization and a conservative bookmark-action size ceiling.
- [x] Add Safari-Shortcut-compatible plain-JavaScript generator from the same final source runner.
- [x] Generate fresh session/nonce values for every Safari Shortcut execution through the shared action runtime.
- [x] Invoke Apple's required `completion()` promptly after bootstrap rather than waiting for full migration.
- [x] Verify Safari payload contains no `javascript:` prefix and inherits the shared action credential/session safety boundary.
- [x] Stack/rebase the launcher on Feature 24 / PR #49 and preserve F24 ready/deferred per-conversation 429 scheduling in both generated adapters. PR #48 now targets the F24 feature branch and its merge commit has both F23 and F24 heads as parents; the resolved runner wrapper builds bookmark/Shortcut adapters from the F24 core rather than restoring the old Feature 20 throttle injection.

## 3. Product UX

- [x] Replace normal DevTools/Console copy with a compact `DashGPT Import` setup/resume dialog.
- [x] Keep Start/Continue on the same progress card and same local Vault.
- [x] Show target DashGPT host/origin so preview-vs-develop storage ownership is understandable.
- [x] Provide Android Chrome and desktop bookmark-action instructions.
- [x] Replace iPhone/iPad bookmark instructions with Safari Shortcut instructions.
- [x] On iPhone/iPad show `Copy Safari Shortcut script` rather than `Copy import action`.
- [x] Explain one-time Shortcut setup: `Run JavaScript on Web Page`, `Show in Share Sheet`, receive Safari webpages only, run from authenticated ChatGPT page.
- [x] Mention Apple's `Allow Running Scripts` prerequisite as a setup state, not an error dump.
- [x] Keep raw runner copy out of normal flow.
- [x] Ensure launcher styles cover 360px/390px layouts without horizontal overflow.
- [x] Seed/restore the operational import card in a populated existing Vault when no current progress card and no explicit dismissal exist.
- [x] Seed its displayed imported count from canonical ChatGPT conversation cards without creating a second checkpoint.
- [x] Preserve explicit Remove/dismiss as authoritative so the card does not auto-resurrect after user removal.
- [x] Keep the operational card visually promoted at the front of the gallery without abusing user Favorites.

## 4. Deterministic verification

- [x] Verify Android/desktop action begins with `javascript:` and targets configured receiver origin/path.
- [x] Verify bookmark-action runtime IDs are generated per run and fixed sentinels do not survive generation.
- [x] Verify credential/session/account fixture strings are absent from bookmark action.
- [x] Verify bookmark action remains below configured ceiling.
- [x] Verify existing bridge hooks remain in generated action output.
- [x] Verify existing deterministic imported-card identity/resume/batch/scheduler contracts remain green on the pre-F24 launcher lineage.
- [x] Verify Safari Shortcut payload is plain JavaScript and targets configured receiver origin/path.
- [x] Verify Safari Shortcut payload uses the shared fresh runtime IDs and calls `completion()`.
- [x] Verify Safari payload reuses the same final runner hooks and shared privacy boundary.
- [x] Add existing-Vault discoverability regression: non-empty Vault with no dismissal gets exactly one import card.
- [x] Add dismissal regression: explicitly removed card stays absent until restore.
- [ ] After stacking on F24, execute verification proving both launcher adapters retain task-local detail 429 deferral and do not contain the old global 429 throttle path. The assertions are committed in `scripts/verify-chatgpt-history-import.mjs`; executable integrated gate remains pending because the Cloudflare `verify:fast` build did not produce a conclusion and GitHub Actions cannot start.

## 5. Browser regression coverage

- [x] Ready/paused/partial import actions open zero-DevTools setup.
- [x] Android/desktop copy action returns complete bookmark action rather than raw runner.
- [x] Add the iPhone-like Safari Playwright regression proving Shortcut-specific copy/instructions and no JavaScript-bookmark guidance; execution remains pending with the browser gate.
- [x] Android-like UA keeps bookmark-specific instructions in the existing browser contract.
- [x] Mobile dialog controls have 360px/390px no-horizontal-overflow assertions.
- [x] Existing simulated valid source/receiver regression covers progressive durable persistence and duplicate-safe replay.
- [x] Add populated-Vault browser regression proving the import card is immediately visible/promoted without requiring the top-bar restore action.
- [ ] Add/confirm popup-blocked `Connect DashGPT` fallback assertion.

## 6. Verification and acceptance

- [x] Run targeted launcher/source-runner verification for original bookmark adapter.
- [x] Run `npm run verify:fast` on original implementation head through temporary Cloudflare preview `postinstall`; deployment succeeded and hook was removed.
- [x] Re-run targeted deterministic verification after Safari adapter implementation; the Safari payload generator and adapter-specific contract pass.
- [x] Re-run `npm run verify:fast` after Safari adapter implementation through a temporary Cloudflare preview `postinstall`; deployment succeeded and the hook was removed.
- [ ] Run targeted verification after existing-Vault discoverability fix and F24 stacking. A dedicated integrated `npm run verify:fast` Cloudflare build was started from commit `5f81f7c5...` but remained `in_progress` without a conclusion; its temporary `postinstall` hook was removed immediately afterward.
- [ ] Run `npm run verify:fast` on the integrated implementation lineage with a conclusive result.
- [ ] Run canonical `npm run verify:full` once before merge while repository CI/browser infrastructure is runnable.
- [ ] Verify deployed preview on an existing populated Vault: the import card is visible immediately.
- [ ] Verify deployed preview on iPhone Safari with authenticated ChatGPT using the Shortcut adapter: create/run Shortcut, connect, persist at least one card, close/re-run and confirm duplicate-free resume.
- [ ] Verify deployed preview on Android Chrome with authenticated ChatGPT bookmark adapter.
- [ ] Verify desktop Safari/Chromium regression path.
- [ ] Verify an integrated F24 run can defer one 429 conversation while unrelated conversations continue.
- [x] Keep PR draft until real-device acceptance and canonical verification gates are satisfied.

## 7. Handoff

- [x] Link PR to Issue #44 and this OpenSpec change.
- [x] Record the failed iPhone JavaScript-bookmark acceptance and Safari Shortcut adapter direction in the PR.
- [x] Record the missing-card existing-Vault acceptance failure and F24 stacking requirement in OpenSpec.
- [ ] Record successful existing-Vault/iPhone/Android acceptance evidence in the PR after testing.
- [ ] Update current-state docs only if implementation state materially changes.
