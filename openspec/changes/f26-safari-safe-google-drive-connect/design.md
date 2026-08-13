# Design — Safari-safe Google Drive connect

## Existing flow

`demo/google-drive-sync.js` currently handles a Connect click approximately as:

1. refresh GitHub provider state with `await fetch(...)`;
2. load Google Identity Services if needed;
3. request Google sign-in;
4. synchronize the Vault.

The first awaited network boundary can consume Safari's transient user activation before the popup request occurs.

## New flow

### Initialization

After `/api/storage/google/config` and initial GitHub status are known:

- if Google Drive is configured and GitHub is not the active provider, begin loading the Google Identity Services script in the background;
- render `Preparing Google sign-in…` while the script is loading;
- enable `Connect Google Drive` only when `google.accounts.oauth2` is available;
- if the script load fails, show a human retry action. Retrying loads the library first; the next explicit Connect click opens Google sign-in.

### Connect click

The Connect click path must be synchronous until the Google popup request has been issued:

```text
click
  -> local/config/provider guards only
  -> requestAccessToken() immediately
  -> await Google response
  -> refresh GitHub provider state
  -> if provider conflict: stop before Drive sync
  -> sync Vault
```

No `await fetch`, timeout, dynamic script load, or unrelated Promise must precede `requestAccessToken()`.

### Provider exclusivity

The initial GitHub status remains the UI guard. Because server state can change after page load, the controller refreshes GitHub status after Google returns and before any Drive synchronization. If GitHub became active, DashGPT stops and asks the user to disconnect it; no Drive write occurs.

### Failure states

- Google library loading: Connect disabled, explicit preparing message.
- Google library failed: retry-loading action is available; no false claim that Google sign-in launched.
- popup dismissed/blocked: existing human error state remains.
- provider conflict after Google returns: stop before synchronization.

## Regression strategy

The browser test fake Google library records `navigator.userActivation.isActive` when `requestAccessToken()` is invoked. A deliberately delayed GitHub-status route ensures a regression that reintroduces an awaited status request before Google would observe inactive user activation.

Browser automation is not a substitute for Safari acceptance. The OpenSpec tasks require a real macOS Safari click-through for browser-sensitive launch/sign-in changes.

## Security and privacy

No changes to Drive scope, file access rules, Vault schema, or local-first behavior. The existing short-lived browser-session Google access value remains memory-only and is never written to browser storage.
