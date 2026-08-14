# Design — F34 Account-scoped zero-config Vault

## Existing architecture reused

The current browser already creates a Vault v1 automatically in local storage and treats it as the immediate working copy. The Google Drive adapter already:

- requests only `https://www.googleapis.com/auth/drive.file`;
- creates/discovers `DashGPT/dashgpt-vault.json`;
- persists only non-secret binding metadata locally;
- keeps OAuth access tokens in module memory;
- creates a remote Vault for the first device;
- adopts a remote Vault for an effectively empty second device;
- merges matching Vault identities;
- refuses to overwrite two meaningful different Vaults until explicit migration confirmation;
- disconnects non-destructively;
- blocks simultaneous GitHub/Google provider use.

F34 changes the account/bootstrap UX and controller semantics; it does not create a new storage engine.

## Account-scoped Vault model

Google authorization is both the user gesture that grants access and the way DashGPT reaches storage owned by that Google account. DashGPT does not need a central user table to map an identity to a Vault: the app-managed Drive file is discovered inside the currently authorized account using the existing app properties.

The account flow is:

```text
anonymous browser
  -> automatic local Vault
  -> user chooses Continue with Google
  -> GIS access token (memory only)
  -> discover DashGPT folder/file in that Google account
     -> no file: create from local Vault
     -> file + empty local: adopt remote Vault
     -> file + same vaultId: merge/sync
     -> file + different meaningful local: explicit merge decision
  -> save non-secret Drive binding
  -> local Vault remains immediate working copy
  -> existing debounced sync keeps remote current
```

On another browser/device, the same Google account reaches the same app-created Drive file. No user-visible Vault creation step is required.

## UX state model

The technical `Google Drive sync` section remains available inside Storage, but primary wording is account-oriented.

States:

- **Anonymous/local:** `Continue with Google` is available; local cards are already usable.
- **Preparing:** Google Identity Services script is being prepared; no disabled fake-connect affordance should imply Drive is usable when deployment configuration is missing.
- **Authorized/bootstrap:** account access has been granted and DashGPT is discovering/creating the account Vault.
- **Connected/synced:** show that this browser is using the user's Google-backed DashGPT memory; `Sync now` remains secondary storage management.
- **Reconnect:** the durable Drive binding exists but the short-lived OAuth token expired/reloaded; local memory stays usable and the next remote operation requires Google authorization again.
- **Different Vaults:** show one explicit merge choice with both card counts and state that neither side changes before confirmation.
- **Disconnected:** binding/token are removed from the browser only; both data copies remain.
- **Unconfigured deployment:** explain that Google sign-in is unavailable on this deployment and keep local mode fully functional; do not present an actionable Connect button.

## Safari/user activation

F26 established that `requestAccessToken()` must be called inside the original click task on Safari. F34 preserves that ordering. No awaited provider-status fetch, timer, GIS load or other async boundary may be inserted between the user's account button click and the token request when GIS is ready.

GIS should be prepared before the button becomes actionable. If it is not ready, the first click may only trigger script preparation and clearly ask the user to click again after readiness; it must not claim authorization occurred.

## Existing binding compatibility

`dashgpt.google-drive.binding.v1` remains unchanged. A browser already linked by earlier releases is treated as a returning linked account. F34 does not need to know or persist the Google email/profile identity to restore the remote Vault; the fresh OAuth token determines which account can access the bound file, and Drive requests fail safely if the user authorizes another account.

No Google account ID, email, token, refresh token, client secret or provider credential enters Vault v1.

## Local/remote conflict policy

The remote Vault remains canonical only after the user explicitly confirms migration when both local and remote Vaults are meaningful and have different `vaultId` values. `mergeVaults(remote, local)` preserves the remote identity while bringing local cards/events/revisions into it. Before confirmation, neither local nor remote Vault is rewritten.

This policy prevents an anonymous browser with valuable cards from silently replacing an existing account memory and prevents an existing account Vault from silently deleting anonymous work.

## Deployment configuration

The browser OAuth flow still requires a public Google Web OAuth client ID exposed by `/api/storage/google/config`. F34 does not introduce a secret. Deployments intended for real user sign-in must provide `GOOGLE_CLIENT_ID` and register the deployment origins as Authorized JavaScript origins in the Google OAuth client.

Because the client ID is public but environment-specific, repository code must continue to support environment configuration rather than assuming every fork shares the same OAuth identity. Production/develop activation evidence is separate from code correctness and must be recorded before claiming real Google authorization works there.

## Testing strategy

Deterministic tests cover account-Vault bootstrap decisions and credential boundaries through the existing storage adapter. Browser coverage covers the account-oriented UI, Safari-preserving synchronous GIS request delegation, first-account create, second-device adoption, explicit migration, disconnect, provider exclusivity and narrow mobile layout.

No test may serialize a real OAuth token into fixtures that resemble portable Vault content.
