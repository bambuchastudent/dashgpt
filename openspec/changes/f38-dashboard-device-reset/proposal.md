# F38 — Dashboard device reset

## Why

The personal dashboard has no supported way to return the current browser to DashGPT's clean first-run state. Manual browser-data deletion is hard to discover and becomes unsafe now that the same browser state participates in local Vault storage, import progress, presentation state and optional Google Drive/GitHub synchronization.

A reset must not be implemented as generic browser-cache deletion. DashGPT owns specific local state, and an active remote provider can otherwise repopulate a just-cleared browser.

## What changes

- Add a destructive `Reset this device` action to the existing Storage/Vault surface used from the dashboard.
- Require a second confirmation that explains the local deletion and remote preservation boundary.
- Before local deletion, disconnect an active GitHub pairing; abort if that disconnect cannot complete.
- Stop in-page remote synchronization, then remove DashGPT-owned `dashgpt.*` local/session state only.
- Remove the local Google Drive binding/token session by the same device-reset lifecycle without deleting the remote Google Vault.
- Return to `/demo/` and let the normal fresh-start bootstrap create the new local Vault and any required system onboarding/import card.

## Source-of-truth / overlap

This change composes existing behavior rather than defining a second storage model:

- Vault v1 and canonical Cards remain the memory source of truth on the device.
- F18 unified dashboard / My Dash remains the card UI.
- F25 Google Drive Vault sync and F34 account-scoped Vault define remote adoption/sync behavior.
- Existing GitHub sync owns its repository pairing and `/api/storage/github/disconnect` boundary.
- F33/F20 import state and bootstrap remain unchanged; reset removes their browser state and fresh bootstrap may recreate the normal operational import card.

## Safety boundary

Reset means **reset this device**, not delete memory everywhere.

Remote Google Drive and GitHub Vault content is preserved. Reconnecting later may restore that remote memory and the confirmation must say so. Unrelated origin storage must survive; `localStorage.clear()` and broad browser cache/cookie deletion are forbidden.

## Out of scope

- remote Vault deletion;
- Card/Vault schema changes;
- selective per-Card or per-Dash deletion;
- browser-wide cache/history/cookie clearing;
- provider OAuth/scope changes;
- changes to first-run/import-card bootstrap semantics.

## Success

From the current dashboard a user can open the existing Storage/Vault surface, choose reset, understand the consequence, confirm once, and arrive at the normal clean first-run DashGPT state on that device without deleting a recoverable remote Vault or unrelated browser state.
