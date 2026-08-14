# Proposal — F35 Show authorized Google account

## Why

F34 made Google authorization the zero-config path to the user's Google-backed DashGPT Vault, but the UI still does not say which Google account granted the active token. This is confusing on devices where several Google accounts are signed in and makes it harder to understand which Drive owns the current remote Vault.

## What changes

- After successful Google authorization, fetch the current Drive user identity through Google Drive API `about.get`.
- Show at least the Google account email and, when returned, display name in the Google account/storage UI.
- Reuse the existing `https://www.googleapis.com/auth/drive.file` scope. Do not request `openid`, `email`, `profile`, broad Drive scopes, or a new consent surface.
- Treat Google identity as ephemeral session/display metadata tied to the current access token.
- Do not persist email, display name, permission ID, photo URL or OAuth credential data into Vault v1, canonical Cards, Dashes, profile revisions, or provider binding metadata.
- On disconnect or authorization loss, clear the displayed identity and fall back to the existing reconnect state.
- Preserve F34 Safari click-task authorization ordering and Google/GitHub exclusivity.

## User-visible result

After Google authorization the user sees exactly which account is currently connected, for example:

`Dmitrii Kashirin · bambuchastudent@gmail.com`

This appears in the Google account section and can also inform the compact top-level Google account affordance without turning DashGPT into a central account system.

## Non-goals

- No central DashGPT account/profile database.
- No Google profile stored in the portable Vault.
- No additional OAuth scopes.
- No Google People API or OpenID Connect integration.
- No change to Vault identity, Card schema, sync conflict policy, ChatGPT import, Dashes, or profile metrics.
