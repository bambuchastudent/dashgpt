# Tasks: Zero-DevTools ChatGPT Import Launcher

## 1. Spec and overlap

- [x] Inspect Feature 20 launcher/source/receiver implementation and current OpenSpec state.
- [x] Inspect overlap with import progress card, local Vault, onboarding, mobile layout, privacy and active import follow-ups (#41/#42/#43/#45 and PR #47).
- [x] Record browser-security truth: no DashGPT-origin cross-origin injection into `chatgpt.com`.
- [x] Strictly validate the original F23 scope before production-code edits. GitHub Actions could not start any steps because of the repository account infrastructure blocker, so the exact official OpenSpec 1.8.0 strict command was executed as a validation-only Cloudflare preview `postinstall`; deployment succeeded before production files were edited.
- [x] Record real-device iPhone Safari acceptance failure: saved long `javascript:` bookmark action was present but did not execute the importer reliably.
- [x] Revise proposal/design/spec before changing production code again: iPhone/iPad Safari uses Apple's `Run JavaScript on Web Page` Shortcut adapter; Android/desktop keep bookmark action.
- [ ] Strictly validate the revised Safari-Shortcut OpenSpec scope before editing production code for that adapter.

## 2. Shared action generation

- [x] Extend the existing final Feature 20 source-runner builder with a reusable `javascript:` action generator for Android/desktop.
- [x] Generate fresh runtime session/nonce values on every bookmark-action execution.
- [x] Reuse Feature 20 bridge-state/handshake hooks; do not fork source import logic.
- [x] Add receiver auto-connect from the explicit user action where the browser permits it.
- [x] Preserve the visible `Connect DashGPT` fallback when popup/receiver open is blocked.
- [x] Enforce HTTPS receiver-origin normalization and a conservative bookmark-action size ceiling.
- [ ] Add Safari-Shortcut-compatible plain-JavaScript generator from the same final Feature 20 runner.
- [ ] Generate fresh session/nonce values for every Safari Shortcut execution.
- [ ] Invoke Apple's required `completion()` promptly after bootstrap rather than waiting for full migration.
- [ ] Verify Safari payload contains no `javascript:` prefix and no credential/session fixtures.

## 3. Product UX

- [x] Replace normal DevTools/Console copy with a compact `DashGPT Import` setup/resume dialog.
- [x] Keep Start/Continue on the same progress card and same local Vault.
- [x] Show target DashGPT host/origin so preview-vs-develop storage ownership is understandable.
- [x] Provide Android Chrome and desktop bookmark-action instructions.
- [ ] Replace iPhone/iPad bookmark instructions with Safari Shortcut instructions.
- [ ] On iPhone/iPad show `Copy Safari Shortcut script` rather than `Copy import action`.
- [ ] Explain one-time Shortcut setup: `Run JavaScript on Web Page`, `Show in Share Sheet`, receive Safari webpages only, run from authenticated ChatGPT page.
- [ ] Mention Apple's `Allow Running Scripts` prerequisite as a setup state, not an error dump.
- [x] Keep raw runner copy out of normal flow.
- [x] Ensure launcher styles cover 360px/390px layouts without horizontal overflow.

## 4. Deterministic verification

- [x] Verify Android/desktop action begins with `javascript:` and targets configured receiver origin/path.
- [x] Verify bookmark-action runtime IDs are generated per run and fixed sentinels do not survive generation.
- [x] Verify credential/session/account fixture strings are absent from bookmark action.
- [x] Verify bookmark action remains below configured ceiling.
- [x] Verify existing Feature 20 bridge hooks remain in generated action output.
- [x] Verify existing deterministic imported-card identity/resume/batch/scheduler contracts remain green.
- [ ] Verify Safari Shortcut payload is plain JavaScript and targets configured receiver origin/path.
- [ ] Verify Safari Shortcut payload creates fresh runtime IDs and calls `completion()`.
- [ ] Verify Safari payload reuses the same final Feature 20 runner hooks and contains no credential fixtures.

## 5. Browser regression coverage

- [x] Ready/paused/partial import actions open zero-DevTools setup.
- [x] Android/desktop copy action returns complete bookmark action rather than raw runner.
- [ ] iPhone-like Safari UA receives Shortcut-specific copy and instructions with no JavaScript-bookmark guidance.
- [x] Android-like UA receives bookmark-specific instructions.
- [x] Mobile dialog controls have 360px/390px no-horizontal-overflow assertions.
- [x] Existing simulated valid source/receiver regression covers progressive durable persistence and duplicate-safe replay.
- [ ] Add/confirm popup-blocked `Connect DashGPT` fallback assertion.

## 6. Verification and acceptance

- [x] Run targeted launcher/source-runner verification for original bookmark adapter.
- [x] Run `npm run verify:fast` on original implementation head through temporary Cloudflare preview `postinstall`; deployment succeeded and hook was removed.
- [ ] Re-run targeted verification after Safari adapter implementation.
- [ ] Re-run `npm run verify:fast` after Safari adapter implementation.
- [ ] Run canonical `npm run verify:full` once before merge while repository CI/browser infrastructure is runnable.
- [ ] Verify deployed preview on iPhone Safari with authenticated ChatGPT using the Shortcut adapter: create/run Shortcut, connect, persist at least one card, close/re-run and confirm duplicate-free resume.
- [ ] Verify deployed preview on Android Chrome with authenticated ChatGPT bookmark adapter.
- [ ] Verify desktop Safari/Chromium regression path.
- [x] Keep PR draft until real-device acceptance and canonical verification gates are satisfied.

## 7. Handoff

- [x] Link PR to Issue #44 and this OpenSpec change.
- [ ] Record revised preview URL plus failed bookmark acceptance and successful Shortcut/Android acceptance evidence in the PR.
- [ ] Update current-state docs only if implementation state materially changes.
