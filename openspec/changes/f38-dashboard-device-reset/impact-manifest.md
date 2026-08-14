# Impact Manifest — F38 dashboard device reset

## User-visible surfaces

- Personal `/demo/` dashboard Storage/Vault dialog.
- New reset confirmation dialog and localized RU/EN copy.
- Post-reset navigation to the normal personal dashboard bootstrap.

## Durable browser state

Affected by successful reset:

- canonical local Vault (`dashgpt.demo.vault.v1`) including Cards, events, Dash revisions and profile revisions;
- legacy DashGPT local storage keys that use the `dashgpt.` namespace;
- gallery/search/presentation state;
- ChatGPT history/import receiver/progress/onboarding state stored under `dashgpt.*`;
- Google Drive durable browser binding stored under `dashgpt.*`;
- DashGPT namespaced `sessionStorage` state.

Explicitly unaffected:

- non-`dashgpt.*` local/session storage owned by other origin features;
- browser cookies/history/cache outside the DashGPT reset contract;
- remote Google Drive Vault content;
- remote GitHub repository Vault content.

## Remote/provider behavior

- Reuses the existing GitHub status/disconnect API; no new GitHub permission or delete endpoint.
- Installs one temporary `dashgpt.*` browser-storage write barrier immediately before local cleanup so in-flight provider continuations cannot rehydrate old local state before navigation.
- Emits a device-reset lifecycle signal for cooperative components without requiring provider-internal reset logic.
- Google OAuth scope remains `drive.file`; no remote Drive deletion call.
- Existing Google/GitHub provider exclusivity and merge semantics remain unchanged after a later reconnect.

## Code likely touched

- new browser reset helper/controller under `demo/`;
- `demo/catalog-bootstrap.js` to initialize the settings/reset controller;
- new reset-specific stylesheet or storage stylesheet integration for destructive-section/dialog layout;
- deterministic reset verifier and browser test;
- `package.json` verification wiring.

Provider sync implementation files are deliberately not required by this change: the namespaced write barrier centralizes protection from current and future browser-state writers.

## Compatibility contracts

Must preserve:

- Vault v1 schema and canonical Card identity model;
- current fresh-start/import-card bootstrap invariant;
- account-scoped remote Vault preservation on disconnect;
- Safari Google user-activation ordering outside the reset path;
- current dashboard/Dash/search behavior before reset;
- unrelated origin storage writes while the short-lived DashGPT barrier is active.

## Blast-radius controls

- No `localStorage.clear()`.
- No wildcard remote deletion.
- GitHub disconnect must succeed before local mutation when pairing is active.
- Production reset helper only deletes the `dashgpt.` namespace.
- Temporary write barrier only suppresses `setItem` for `dashgpt.*` keys and is torn down by immediate navigation (or explicitly restored on pre-navigation failure).
- Browser tests explicitly seed unrelated keys and verify they survive and remain writable.
