# Design — Dashboard device reset

## Context

DashGPT currently keeps the immediate working Vault and presentation/import state in browser storage while optional remote providers can synchronize the same Vault. Google Drive binding metadata is browser-local; GitHub pairing is represented by the existing storage API and can remain active independently of browser `localStorage`.

The reset therefore needs an ordered lifecycle instead of a generic storage wipe.

## UX placement

Use the existing dashboard Storage/Vault dialog. It is already the place where the user sees the current Vault and remote provider state, so reset belongs there without introducing a separate infrastructure-centric Settings product area.

Add a small `Device data` section below the ordinary export/import/provider controls with one secondary destructive `Reset this device` action. Clicking it opens a dedicated confirmation dialog.

The confirmation states:

- Cards, Dashes, local Vault, search/gallery preferences and import progress on this device are removed;
- Google Drive/GitHub remote Vault content is not deleted;
- reconnecting a preserved remote provider later can restore that memory;
- the operation returns the browser to DashGPT's normal first-run state.

## Reset lifecycle

`performDeviceReset()` is the domain boundary and accepts injected browser storage/fetch hooks for deterministic testing.

1. Query GitHub provider status through the existing same-origin API.
2. If paired, POST the existing `/api/storage/github/disconnect` operation.
3. If that disconnect fails, stop and leave browser storage untouched.
4. Dispatch a `dashgpt:device-resetting` event so in-page Google/GitHub controllers cancel pending sync timers and discard transient authorization/session state.
5. Enumerate only keys beginning with the DashGPT-owned `dashgpt.` prefix in `localStorage` and `sessionStorage` and remove them.
6. Navigate with `location.replace('/demo/')` so a saved-Dash/result route does not survive in history as the post-reset destination.
7. Normal bootstrap creates a new local Vault and any system card that a truly fresh browser receives.

The helper deliberately does not call Cache Storage, clear cookies, clear all origin storage, or invoke any remote-content deletion endpoint.

## Remote-provider behavior

### Google Drive

Google access tokens are transient in the current module and the durable Drive binding is a `dashgpt.*` local key. The reset lifecycle event cancels pending sync and clears transient token/identity state; prefix deletion removes the durable binding. The remote Drive Vault file remains untouched.

### GitHub

GitHub pairing is server-side and therefore must be disconnected before local deletion. Existing GitHub Vault content remains in the user's repository. Reset never calls a repository/Vault delete operation.

## Fresh-state invariant

F38 does not define “clean” as literally zero DOM cards. It defines clean as **the same state a new browser would reach through current bootstrap**. If the existing import bootstrap intentionally seeds its operational card, that card may appear after reset. User-imported Cards, saved Dashes, progress, events and presentation state from the previous local Vault must not survive.

## Failure model

- GitHub status unavailable: treat as a reset blocker when pairing state cannot be established safely; show a human error and preserve local state.
- GitHub disconnect failure: preserve local state and let the user retry.
- Local key removal failure: report the failure and do not claim reset completed.
- Navigation only happens after successful local cleanup.

## Security/privacy

The implementation never uploads local content for reset, never broadens OAuth permissions, and never serializes Google identity/token data. Remote copies are preserved by default because remote deletion would be a materially stronger destructive action than requested.

## Verification strategy

- deterministic Node verifier for key enumeration, unrelated-key preservation, remote endpoint ordering and failure atomicity;
- Playwright coverage for dashboard discoverability, confirmation, actual browser reset/fresh bootstrap and 360/390px overflow;
- existing provider/sync suites remain regression gates;
- canonical full verification remains required before merge when a supported runner can execute it.
