# Design — F35 Show authorized Google account

## Existing boundary

F34 already obtains a Google OAuth access token with only `https://www.googleapis.com/auth/drive.file`, stores the token in module memory, and keeps only non-secret Drive binding metadata in local storage. F35 must not weaken that boundary.

## Identity source

Use Google Drive API v3:

`GET https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress,photoLink,me)`

The request uses the same Bearer token as Vault sync. No new OAuth scopes are requested.

## Session model

Add an in-memory `googleAccountIdentity` value in the Google sync controller. It is populated only after a successful OAuth token is received. Identity fields are sanitized to strings and never written to Vault v1 or the durable Google Drive binding.

On page reload there is no access token, therefore no current authorized-account identity is claimed. The UI shows the existing reconnect state until OAuth happens again.

On disconnect, token and identity are cleared immediately.

## UI

Google account section:
- authorized: show `displayName · emailAddress` when both are available, otherwise whichever exists;
- reconnect/no token: do not show stale account identity;
- failure to fetch identity: Vault bootstrap may continue, but UI says account details are unavailable rather than inventing identity.

Compact personal-dashboard account affordance may show the email when space permits; Storage remains the authoritative detailed surface.

## Privacy

Do not persist:
- email address;
- display name;
- Drive permission ID;
- photo URL;
- access/refresh token;
- Google account subject.

No identity values enter Cards, Dashes, profile revisions, Vault export, or `dashgpt.google-drive.binding.v1`.

## Error handling

`about.get` 401 follows reconnect behavior. Other identity lookup failures do not delete or overwrite local/remote Vault data. Sync errors and identity errors remain distinguishable.

## Testing

Add deterministic coverage for Drive `about.get`, field sanitization and no persistence. Browser coverage verifies account identity appears after authorization, disappears after disconnect/reload, and mobile layout remains safe.