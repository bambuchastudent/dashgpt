# DashGPT — Safari + Save chat handoff

## Goal

Continue from the current `develop` state after fixing the macOS Safari Google Drive launch regression and replacing the misleading personal `Сохранить чат` action with a coherent local-first capture flow.

## Repository state

- Repository: `bambuchastudent/dashgpt`
- Base/source of truth: `develop`
- F26 Issue #59 — Safari-safe Google Drive connect — **merged**
- F26 PR #60 — **merged**, squash commit `a1d9f6da6e62a8e625db175f4ec6b357b11ccfde`
- F27 Issue #62 — coherent Save chat flow with storage choices — **merged**
- F27 PR #64 — **merged**, squash commit `0b695da7d437974f861d477f32c59d0c40ac0cd1`
- F26 OpenSpec: `openspec/changes/f26-safari-safe-google-drive-connect/`
- F27 OpenSpec: `openspec/changes/f27-save-chat-storage-flow/`

## What F26 fixed

### User-visible bug

`Storage → Connect Google Drive` could work in Chrome while appearing inert in Safari on macOS.

### Root cause

The F25 controller awaited remote/provider work before asking the Google browser library to open its account window. Safari is stricter about the lifetime of the original user click, so the account request could happen after browser user activation was lost.

The reusable rule is:

```text
WRONG
click -> await network -> account window

RIGHT
preload dependency -> click -> account window immediately -> await result -> fresh provider check -> sync
```

### Implemented behavior

- Google browser library preloads before Connect becomes actionable.
- Preparing/retry states are truthful.
- `requestAccessToken()` runs in the original click task before awaited provider networking.
- GitHub provider state is refreshed after Google returns and before Drive synchronization.
- A provider conflict stops before remote writes.
- Google access remains session-memory-only.
- Drive scope, Vault schema, Drive file layout, provider exclusivity, and merge rules are unchanged.

### Regression coverage

`tests/google-drive-sync.spec.mjs` records `navigator.userActivation?.isActive` at the exact Google account request while provider networking is deliberately delayed.

Engineering guidance lives in:

`docs/browser-flow-regression-guide.md`

## What F27 fixed

### User-visible bug

The personal dashboard displayed `+ Сохранить чат`, but the click still opened the generic manual `Add Result` form. Google Drive and GitHub were hidden in a separate Storage surface, so the action did not match the product promise.

### Implemented behavior

`Сохранить чат` now opens a dedicated capture dialog which:

- explains that the card is saved to the local browser Vault first;
- shows `This device`, Google Drive, and GitHub in one understandable storage section;
- treats Google Drive and GitHub as optional sync providers for the **same** cards/Vault;
- keeps one-remote-provider-at-a-time semantics;
- reuses the existing structured ChatGPT command → Result envelope → review → local save flow;
- delegates Google Drive synchronously to the canonical F26-safe Connect control;
- sends GitHub setup to the canonical repository/folder Storage flow instead of duplicating it;
- attempts canonical provider synchronization after local save when a usable provider session is already active;
- keeps the generic manual Result form unchanged outside personal Save-chat mode.

### Production files

- `demo/public-onboarding.js`
- `demo/onboarding.css`

Core `demo/app.js`, `demo/google-drive-sync.js`, and `demo/github-sync.js` were intentionally not changed by F27.

### Regression coverage

`tests/save-chat-flow.spec.mjs` covers:

- existing user Save chat opens the dedicated dialog rather than generic Add Result;
- local save creates one ChatGPT-handoff Result without requiring a remote account;
- Google Drive + GitHub choices are visible as sync providers;
- Save-chat Google delegation preserves active browser user activation;
- GitHub setup opens/focuses canonical Storage controls;
- 360px flow has no horizontal overflow.

## Verification state

Do **not** convert missing infrastructure evidence into a green claim.

Known evidence:

- F26 PR Cloudflare preview build succeeded before merge.
- F27 PR Cloudflare preview build succeeded for the production code before merge.
- GitHub `check` / OpenSpec jobs have repeatedly been prevented from starting project steps by the repository/account Actions infrastructure state. Therefore `npm run verify:fast`, `npm run verify:full`, and executable OpenSpec validation are not claimed as passed from those runs.
- Structural OpenSpec review was completed before production edits for both F26 and F27.

Still required for real browser acceptance:

1. On the production/develop origin in **macOS Safari**, open Storage and press `Connect Google Drive`; verify Google account UI opens from the first click once the control says it is ready.
2. In macOS Safari, press `Сохранить чат`; verify the dedicated local/Google/GitHub capture dialog opens and the old Add Result form does not.
3. From that Save-chat dialog, press Google Drive and verify the Google account UI still opens directly.
4. Save one card while Google Drive is connected; verify the same card appears after sync on a second device.
5. Run a Chrome smoke and relevant mobile viewport acceptance.
6. Run canonical automated verification once GitHub Actions or another trusted execution environment is available.

## Constraints to preserve

- Card remains the canonical user-facing entity.
- Local browser Vault remains the primary working copy.
- Google Drive/GitHub synchronize the same Vault/cards; they are not card types.
- One remote provider at a time unless a future OpenSpec change explicitly redesigns that contract.
- No broad Google Drive access.
- Do not persist short-lived Google browser access values.
- Browser user-gesture flows must follow `docs/browser-flow-regression-guide.md`.
- Any new production capability must get its own OpenSpec change before code.

## Useful links

- Production: `https://dashgpt.dimkashir.workers.dev/demo/?personal=1`
- Google config: `https://dashgpt.dimkashir.workers.dev/api/storage/google/config`
- F26 Issue: `https://github.com/bambuchastudent/dashgpt/issues/59`
- F26 PR: `https://github.com/bambuchastudent/dashgpt/pull/60`
- F27 Issue: `https://github.com/bambuchastudent/dashgpt/issues/62`
- F27 PR: `https://github.com/bambuchastudent/dashgpt/pull/64`
