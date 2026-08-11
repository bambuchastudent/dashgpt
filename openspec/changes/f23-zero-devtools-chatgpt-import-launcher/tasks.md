# Tasks: Zero-DevTools ChatGPT Import Launcher

## 1. Spec and overlap

- [x] Inspect Feature 20 launcher/source/receiver implementation and current OpenSpec state.
- [x] Inspect overlap with import progress card, local Vault, onboarding, mobile layout, privacy and active import follow-ups (#41/#42/#43/#45 and PR #47).
- [x] Record browser-security truth: no DashGPT-origin cross-origin injection into `chatgpt.com`.
- [x] Define one reusable `DashGPT Import` action with browser-specific instructions rather than separate mobile product models.
- [x] Strictly validate `f23-zero-devtools-chatgpt-import-launcher` before production-code edits. GitHub Actions could not start any steps because of the repository account infrastructure blocker, so the exact official OpenSpec 1.8.0 strict command was executed as a validation-only Cloudflare preview `postinstall`; the deployment succeeded before production files were edited.

## 2. Action generation

- [x] Extend the existing final Feature 20 source-runner builder with a reusable `javascript:` action generator.
- [x] Generate fresh runtime session/nonce values on every action execution rather than embedding a fixed launch pair.
- [x] Reuse Feature 20 bridge-state/handshake hooks; do not fork source import logic.
- [x] Add receiver auto-connect from the explicit user action where the browser permits it.
- [x] Preserve the visible `Connect DashGPT` fallback when popup/receiver open is blocked.
- [x] Enforce HTTPS receiver-origin normalization and a conservative generated-action size ceiling.

## 3. Product UX

- [x] Replace normal DevTools/Console copy with a compact `DashGPT Import` setup/resume dialog.
- [x] Add `Copy import action` and `Open ChatGPT` controls.
- [x] Provide concise iPhone/iPad Safari instructions.
- [x] Provide concise Android Chrome instructions.
- [x] Provide desktop bookmarks/favorites instructions without leading with DevTools.
- [x] Keep raw runner copy, if retained, under troubleshooting only. The normal launcher no longer exposes/copies the raw runner.
- [x] Keep Start/Continue on the same progress card and same local Vault.
- [x] Show the target DashGPT host/origin so preview-vs-develop storage ownership is understandable.
- [x] Ensure the launcher styles cover 360px/390px layouts without horizontal overflow; browser assertions are added and still await the runnable full browser gate.

## 4. Deterministic verification

- [x] Verify generated action begins with `javascript:` and targets the configured receiver origin/path.
- [x] Verify runtime launch IDs are generated per run and fixed sentinel values do not survive action generation.
- [x] Verify credential/session/account fixture strings are absent from the action.
- [x] Verify action length remains below the configured ceiling.
- [x] Verify existing Feature 20 source-runner bridge hooks still exist in action output.
- [x] Verify existing deterministic imported-card identity/resume/batch/scheduler contracts remain green.

## 5. Browser regression coverage

- [x] Ready/paused/partial import actions open the zero-DevTools setup flow in the browser test contract.
- [x] Copy action returns the complete browser action rather than raw runner text in the browser test contract.
- [x] iPhone-like and Android-like user agents have platform-appropriate assertions for the same `DashGPT Import` concept.
- [x] Mobile dialog controls have 360px/390px no-horizontal-overflow assertions.
- [x] Existing simulated valid source/receiver regression still covers progressive durable card persistence and duplicate-safe replay.
- [ ] Add/confirm an explicit browser assertion for the popup-blocked `Connect DashGPT` fallback if the final real-device path exposes a regression there.

## 6. Verification and acceptance

- [x] Run targeted launcher/source-runner verification during development through the deterministic import verifier.
- [x] Run `npm run verify:fast` on the implementation head. GitHub Actions could not execute, so the exact repository command ran as a temporary Cloudflare preview `postinstall`; deployment succeeded, then the hook was removed.
- [ ] Run canonical `npm run verify:full` once before merge while repository CI/browser infrastructure is runnable.
- [ ] Verify deployed preview on iPhone Safari with authenticated ChatGPT: install action, run, connect, persist at least one card, close/re-run and confirm duplicate-free resume.
- [ ] Verify deployed preview on Android Chrome with authenticated ChatGPT using the same acceptance path.
- [ ] Verify desktop Safari/Chromium regression path.
- [x] Keep PR draft until real-device acceptance and canonical verification gates are satisfied.

## 7. Handoff

- [x] Link PR to Issue #44 and this OpenSpec change.
- [ ] Record the final implementation preview URL and exact verified browsers/devices in the PR after deployment/acceptance.
- [ ] Update current-state docs only if implementation state materially changes.
