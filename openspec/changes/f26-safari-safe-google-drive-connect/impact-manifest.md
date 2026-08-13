# Impact Manifest — F26 Safari-safe Google Drive connect

## Primary production files

- `demo/google-drive-sync.js`
  - Google browser-library readiness state.
  - Connect-click ordering.
  - post-Google provider conflict recheck.
- `tests/google-drive-sync.spec.mjs`
  - browser user-activation regression evidence.
  - delayed provider-status scenario.

## Documentation

- `docs/browser-user-activation-recommendations.md`
- `docs/handoff-f26-safari-google-drive.md`
- F26 OpenSpec artifacts.

## Existing capabilities affected

- F25 Google Drive Vault sync: implementation ordering only; Drive API, Vault identity and merge contract unchanged.
- F6 zero-install private sync: one-active-provider rule remains authoritative.
- F23 browser launcher: adds a reusable browser user-activation lesson but does not change history-import adapters.

## Data / storage blast radius

None. No Vault schema changes, no Drive file-layout changes, no migration, no new persistent state.

## Security / privacy blast radius

No broader external access and no new stored credential/session material. The change reduces popup-launch fragility without changing the existing memory-only session design.

## UX blast radius

Storage dialog only:
- Google Drive Connect can temporarily show `Preparing Google sign-in…` while the browser library loads.
- A failed library load becomes a visible retry/preparing state instead of an apparently inert action.

## Failure modes to verify

- Google library slow or unavailable.
- GitHub paired before Connect.
- GitHub pairing changes while Google account UI is open.
- Google popup dismissed.
- macOS Safari user-activation behavior.
- Chrome remains functional.
