# Tasks: Zero-DevTools ChatGPT Import Launcher

## 1. Spec and overlap

- [x] Inspect Feature 20 launcher/source/receiver implementation and current OpenSpec state.
- [x] Inspect overlap with import progress card, local Vault, onboarding, mobile layout, privacy and active import follow-ups (#41/#42/#43/#45 and PR #47).
- [x] Record browser-security truth: no DashGPT-origin cross-origin injection into `chatgpt.com`.
- [x] Define one reusable `DashGPT Import` action with browser-specific instructions rather than separate mobile product models.
- [ ] Strictly validate `f23-zero-devtools-chatgpt-import-launcher` before production-code edits.

## 2. Action generation

- [ ] Extend the existing final Feature 20 source-runner builder with a reusable `javascript:` action generator.
- [ ] Generate fresh runtime session/nonce values on every action execution rather than embedding a fixed launch pair.
- [ ] Reuse Feature 20 bridge-state/handshake hooks; do not fork source import logic.
- [ ] Add receiver auto-connect from the explicit user action where the browser permits it.
- [ ] Preserve the visible `Connect DashGPT` fallback when popup/receiver open is blocked.
- [ ] Enforce HTTPS receiver-origin normalization and a conservative generated-action size ceiling.

## 3. Product UX

- [ ] Replace normal DevTools/Console copy with a compact `DashGPT Import` setup/resume dialog.
- [ ] Add `Copy import action` and `Open ChatGPT` controls.
- [ ] Provide concise iPhone/iPad Safari instructions.
- [ ] Provide concise Android Chrome instructions.
- [ ] Provide desktop bookmarks/favorites instructions without leading with DevTools.
- [ ] Keep raw runner copy, if retained, under troubleshooting only.
- [ ] Keep Start/Continue on the same progress card and same local Vault.
- [ ] Show the target DashGPT host/origin so preview-vs-develop storage ownership is understandable.
- [ ] Ensure 360px/390px layouts have no horizontal overflow.

## 4. Deterministic verification

- [ ] Verify generated action begins with `javascript:` and targets the configured receiver origin/path.
- [ ] Verify runtime launch IDs are generated per run and fixed sentinel values do not survive action generation.
- [ ] Verify credential/session/account fixture strings are absent from the action.
- [ ] Verify action length remains below the configured ceiling.
- [ ] Verify existing Feature 20 source-runner bridge hooks still exist in action output.
- [ ] Verify existing deterministic imported-card identity/resume/batch/scheduler contracts remain green.

## 5. Browser regression coverage

- [ ] Ready/paused/partial import actions open the zero-DevTools setup flow.
- [ ] Copy action returns the complete browser action rather than raw runner text.
- [ ] iPhone-like and Android-like user agents receive platform-appropriate instructions for the same `DashGPT Import` concept.
- [ ] Mobile dialog controls remain usable at 360px and 390px without horizontal overflow.
- [ ] Simulated valid action/receiver handshake still persists progressive cards.
- [ ] Popup-blocked fallback remains truthful and retryable.

## 6. Verification and acceptance

- [ ] Run targeted launcher/source-runner verification during development.
- [ ] Run `npm run verify:fast` on the implementation head.
- [ ] Run canonical `npm run verify:full` once before merge while repository CI is runnable.
- [ ] Verify deployed preview on iPhone Safari with authenticated ChatGPT: install action, run, connect, persist at least one card, close/re-run and confirm duplicate-free resume.
- [ ] Verify deployed preview on Android Chrome with authenticated ChatGPT using the same acceptance path.
- [ ] Verify desktop Safari/Chromium regression path.
- [ ] Keep PR draft until real-device acceptance and canonical verification gates are satisfied.

## 7. Handoff

- [ ] Link PR to Issue #44 and this OpenSpec change.
- [ ] Record preview URL and exact verified browsers/devices in the PR.
- [ ] Update current-state docs only if implementation state materially changes.
