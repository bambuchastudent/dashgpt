# DashGPT — F26 Safari Google Drive handoff

## Goal

Finish and verify the Safari-on-macOS regression fix for `Connect Google Drive`, then keep future browser-sensitive launch changes from repeating the same mistake.

## Repository state

- Repository: `bambuchastudent/dashgpt`
- Base: `develop`
- Feature branch: `feature/f26-safari-safe-google-drive-connect`
- Issue: #59 — `Feature 26: Safari-safe Google Drive connect`
- OpenSpec: `openspec/changes/f26-safari-safe-google-drive-connect/`
- F25 Google Drive sync is already merged into `develop`.

## User-visible bug

In Chrome, `Storage → Connect Google Drive` can work. In Safari on macOS the same button can appear to do nothing.

## Root cause

The F25 controller performed an asynchronous GitHub-provider status request before asking the Google browser library to open the account window. Safari is stricter about the lifetime of the original user click. By the time the account request happened, the browser could consider that click finished.

The important lesson is ordering, not a Safari-specific workaround:

```text
WRONG
click -> await network -> account window

RIGHT
preload dependency -> click -> account window immediately -> await result -> fresh provider check -> sync
```

## Decisions already made

- Google browser library is preloaded after configuration/provider state is known.
- While it is unavailable, the UI shows `Preparing Google sign-in…` and does not present a falsely ready Connect action.
- The Connect handler requests the Google account window in the original click task with no awaited networking first.
- After Google returns, GitHub provider state is refreshed before Drive synchronization.
- If GitHub became active, stop before Drive synchronization.
- Existing Drive scope, Vault schema, Drive file location, provider exclusivity, merge rules, and memory-only browser session behavior stay unchanged.
- Real macOS Safari acceptance is a required gate for this browser-sensitive behavior; Chromium automation alone must not be reported as full Safari verification.

## Implemented files

### Production

`demo/google-drive-sync.js`

Key changes:
- `googleSignInReady()`
- `gisLoadError`
- `prepareGoogleSignIn()`
- truthful preparing/retry rendering
- non-async `connectGoogleDrive()` with immediate account request
- post-account provider refresh before sync

### Regression test

`tests/google-drive-sync.spec.mjs`

The fake Google library records:

```js
navigator.userActivation?.isActive
```

at the exact moment the account request is made. The provider-status route can be deliberately delayed. The regression test requires user activation to remain true and then confirms the remote Vault can still be adopted.

### Documentation

- `docs/browser-flow-regression-guide.md`
- this handoff

## OpenSpec artifacts

Already created before production edits:

- `.openspec.yaml`
- `proposal.md`
- `design.md`
- `specs/google-drive-vault-sync/spec.md`
- `tasks.md`
- `impact-manifest.md`

The spec adds requirements for:
- direct user-click ordering;
- truthful Google-library readiness;
- provider exclusivity recheck before synchronization;
- real Safari acceptance for browser-sensitive changes;
- reusable browser-flow regression guidance.

## Constraints

- Do not broaden Google Drive access.
- Do not persist the short-lived Google browser session value.
- Do not add automatic GitHub + Google mirroring.
- Do not change Vault identity or merge semantics.
- Do not silently mix the separate `Сохранить чат` UX redesign into F26.

## Remaining work

1. Inspect the final branch diff for accidental scope widening.
2. Update F26 `tasks.md` to mark completed implementation/test/docs work.
3. Run available targeted verification and OpenSpec validation.
4. Run `npm run verify:fast` and the canonical `npm run verify:full` if the environment allows it; report infrastructure blockers explicitly if it does not.
5. Create/deploy the PR preview.
6. On a real Mac Safari: open Storage, wait until Connect is ready, press `Connect Google Drive`, and verify the Google account UI opens from that one click.
7. Run a Chrome smoke.
8. Merge to `develop` only with the actual verification state recorded accurately.

## Separate follow-up capability

The user also reported that `+ Сохранить чат` currently leads to an unclear generic flow and does not make storage destinations/providers understandable.

That should be a separate OpenSpec change/PR after F26. Product direction for it:

- `Сохранить чат` should open one coherent capture flow rather than a generic `Add Result` form or confusing navigation.
- The flow should make clear that the card is saved to the local Vault first.
- It should show current remote state and offer direct `Connect Google Drive` / GitHub setup when appropriate.
- Google/GitHub are sync destinations for the same canonical cards, not separate card types.
- Keep value-first language; do not expose storage implementation details as onboarding.

Do not implement that follow-up by modifying F26 scope retroactively.

## Useful links

- Issue: `https://github.com/bambuchastudent/dashgpt/issues/59`
- Current user-facing site: `https://dashgpt.dimkashir.workers.dev/demo/?personal=1`
- Google config status: `https://dashgpt.dimkashir.workers.dev/api/storage/google/config`
