# Browser flow regression guide

Use these rules for DashGPT browser flows that depend on a direct user click, including account windows, new tabs/windows, clipboard actions, share actions, and cross-window handshakes.

## Core rule

Do not put awaited work between the user's click and the browser action that depends on that click.

Risky ordering:

```text
click
  -> await remote status
  -> await external browser library
  -> open account window
```

This may work in Chrome and still fail in Safari because Safari can stop treating the later action as part of the original click.

Preferred ordering:

```text
page initialization
  -> load configuration
  -> preload required browser library
  -> render ready state

click
  -> synchronous local guards
  -> open account window immediately
  -> await account result
  -> refresh remote/provider state
  -> synchronize only if the fresh state is still valid
```

Remote truth still matters. Revalidate it after the click-dependent browser action and before changing remote data.

## UI states

A control must not look ready while its dependency is not ready.

- `Preparing…`: dependency is loading; primary action disabled.
- `Connect …`: dependency is ready and one click can perform the action.
- `Retry …`: loading failed; retry prepares the dependency, then a new explicit click performs the browser action.
- Human failure text: account window dismissed, provider conflict, or temporary service failure.

Never report `connected`, `running`, or `synced` only because an attempt started.

## Coding checklist

Before adding an `await` to a click handler, ask whether something later in that handler still needs the original browser click.

If yes:

1. preload dependencies before the click;
2. keep only synchronous local checks before the browser action;
3. perform that browser action in the original event task;
4. do asynchronous validation after it returns;
5. stop before remote writes if fresh validation fails;
6. keep a visible retry path rather than silently repeating browser windows in the background.

Do not infer Safari support from Chrome success alone.

## Regression testing

Tests for browser-sensitive flows should verify ordering, not only the final successful state.

For Google Drive connect, the test browser records `navigator.userActivation?.isActive` at the exact moment the Google account request is made. Provider-status networking is deliberately delayed. The request must still observe active user activation.

That catches a future refactor which puts an awaited remote check before the Google account window while leaving later Drive synchronization tests green.

## Browser acceptance

When behavior depends on the lifetime of a user click, code-complete is not the same as browser-accepted.

For changed Google Drive connect behavior:

- deterministic automated ordering test;
- Chrome/Chromium smoke;
- real macOS Safari click-through;
- relevant mobile browser acceptance when that browser is explicitly claimed as supported.

If a required browser cannot be exercised in the current environment, leave the item open in `tasks.md` and the PR. Do not turn missing acceptance into a claim that the browser works.

## Product language

Normal users should see a simple flow:

`Connect Google Drive → choose account → Allow`

Browser implementation detail belongs in engineering documentation, not normal onboarding.

## Scope discipline

A browser regression fix should not silently absorb an adjacent UX redesign. In particular, the Safari Google Drive connect regression and the broader `Сохранить чат` destination/provider UX belong to separate OpenSpec changes and PRs even though both are part of the same user journey.
