## ADDED Requirements

### Requirement: Authorized Google account identity SHALL be visible
After successful Google authorization DashGPT SHALL show which Google account owns the active authorization used for Google Vault access.

#### Scenario: Drive user identity is available
- **WHEN** Google authorization succeeds and Drive `about.get` returns the current user
- **THEN** DashGPT SHALL show the returned email address
- **AND** SHALL show the display name when available
- **AND** SHALL associate that display only with the active authorization session

#### Scenario: Identity lookup fails without token expiry
- **WHEN** Vault authorization succeeds but current-user details cannot be fetched
- **THEN** DashGPT SHALL NOT invent or reuse a stale account identity
- **AND** SHALL keep local memory safe
- **AND** MAY continue Vault bootstrap when the underlying Drive authorization remains valid

### Requirement: Account identity SHALL NOT widen OAuth permissions
F35 SHALL use the existing Google Drive authorization scope and SHALL NOT add a separate identity permission.

#### Scenario: User authorizes Google
- **WHEN** DashGPT requests Google authorization
- **THEN** the requested scope SHALL remain exactly `https://www.googleapis.com/auth/drive.file`
- **AND** DashGPT SHALL NOT add `openid`, `email`, `profile`, Google People scopes, broad Drive scopes, or other identity scopes for this capability

### Requirement: Google identity SHALL remain ephemeral display metadata
Google account identity SHALL NOT become portable DashGPT memory or durable provider-binding state.

#### Scenario: Identity is returned
- **WHEN** Drive returns display name, email address, photo link, permission ID or equivalent identity fields
- **THEN** DashGPT SHALL keep them outside Vault v1, canonical Cards, Dashes, profile revisions and `dashgpt.google-drive.binding.v1`
- **AND** Vault export SHALL NOT contain those identity fields

#### Scenario: Browser reloads without a token
- **WHEN** an existing Google Drive binding remains but the in-memory OAuth token is gone
- **THEN** DashGPT SHALL NOT claim which Google account is currently authorized
- **AND** SHALL show the existing reconnect state

#### Scenario: User disconnects Google
- **WHEN** the user disconnects Google from the browser
- **THEN** the displayed Google identity SHALL be cleared immediately
- **AND** local and remote Vault data SHALL remain intact

### Requirement: F34 authorization safety SHALL be preserved
Displaying account identity SHALL NOT regress Safari user activation or remote-provider exclusivity.

#### Scenario: Safari user activates Google authorization
- **WHEN** the user presses the Google account action and GIS is ready
- **THEN** token request SHALL still occur in the original click task before any awaited identity request

#### Scenario: GitHub provider is active
- **WHEN** provider exclusivity blocks Google authorization
- **THEN** no Google identity lookup SHALL occur and no Google identity SHALL be displayed
