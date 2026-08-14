## ADDED Requirements

### Requirement: Anonymous use SHALL remain automatically local-first
DashGPT SHALL create or load the browser-local Vault without requiring account creation or remote storage authorization.

#### Scenario: User opens DashGPT without signing in
- **WHEN** a browser opens the personal DashGPT experience without a Google account authorization
- **THEN** DashGPT SHALL create or load the existing local Vault automatically
- **AND** normal card capture, search, Dashes and continuation SHALL remain usable locally
- **AND** the user SHALL NOT be forced through registration or storage setup

### Requirement: Google authorization SHALL bootstrap the user's remote Vault automatically
Successful Google authorization SHALL immediately discover or create the DashGPT Vault accessible in the authorized Google account using the existing app-managed Drive storage contract.

#### Scenario: Authorized account has no DashGPT Vault
- **WHEN** Google authorization succeeds and no app-managed DashGPT Vault exists in that Drive
- **THEN** DashGPT SHALL create the remote Vault from the current local Vault
- **AND** SHALL bind the browser to that remote Vault without asking the user to manually create or name storage

#### Scenario: Authorized account has a Vault and the browser is effectively empty
- **WHEN** Google authorization succeeds, a remote DashGPT Vault exists, and the local Vault has no meaningful user memory
- **THEN** DashGPT SHALL adopt the remote Vault locally
- **AND** SHALL preserve the remote `vaultId` and canonical Card identities

#### Scenario: Local and remote already share Vault identity
- **WHEN** Google authorization succeeds and local and remote Vaults share the same `vaultId`
- **THEN** DashGPT SHALL merge/synchronize them using existing Vault v1 convergence behavior

### Requirement: Different meaningful Vaults SHALL require explicit merge consent
DashGPT SHALL NOT silently overwrite either a meaningful anonymous/local Vault or an existing account Vault when their `vaultId` values differ.

#### Scenario: Both local and remote Vaults contain meaningful memory
- **WHEN** Google authorization finds a meaningful remote Vault with a different `vaultId` from the meaningful local Vault
- **THEN** DashGPT SHALL show an explicit merge decision with enough local/remote context to understand the conflict
- **AND** SHALL write neither Vault before the user confirms

#### Scenario: User confirms merge
- **WHEN** the user confirms the different-Vault merge
- **THEN** DashGPT SHALL merge local memory into the remote Vault
- **AND** SHALL preserve the remote `vaultId` as the account Vault identity
- **AND** SHALL save the merged Vault locally and remotely

#### Scenario: User keeps them separate
- **WHEN** the user declines the merge
- **THEN** DashGPT SHALL keep both existing Vaults unchanged

### Requirement: Google account access SHALL remain a storage adapter boundary
Google identity and credentials SHALL NOT become canonical Card or portable Vault content.

#### Scenario: Google authorization succeeds
- **WHEN** DashGPT receives a Google OAuth access token
- **THEN** the token SHALL remain outside portable Vault serialization
- **AND** no Google email, account identifier, refresh token, client secret or access token SHALL be written into canonical Cards or Vault v1
- **AND** the Drive adapter SHALL continue to request only `https://www.googleapis.com/auth/drive.file`

### Requirement: Connected browsers SHALL continue to use local working state with remote synchronization
After account bootstrap, DashGPT SHALL keep the local Vault as the immediate working copy and SHALL reuse existing synchronization behavior for remote persistence.

#### Scenario: User changes local memory after account bootstrap
- **WHEN** a bound browser changes its local Vault and has valid Google authorization
- **THEN** DashGPT SHALL schedule synchronization through the existing bounded/debounced Google Drive path
- **AND** SHALL NOT require a manual Vault export/import operation

#### Scenario: OAuth token expires or page reloads
- **WHEN** the durable Drive binding exists but the in-memory Google token is no longer valid
- **THEN** local memory SHALL remain usable
- **AND** DashGPT SHALL request reauthorization only when remote synchronization is needed

### Requirement: Disconnect SHALL be non-destructive
Disconnecting or signing out of Google storage SHALL remove browser authorization/binding state without deleting memory.

#### Scenario: User disconnects Google
- **WHEN** the user disconnects the Google-backed account state from the browser
- **THEN** DashGPT SHALL remove the browser's Google token/binding state
- **AND** SHALL NOT delete the local Vault
- **AND** SHALL NOT delete the remote DashGPT folder or Vault file

### Requirement: Provider exclusivity and Safari authorization safety SHALL be preserved
F34 SHALL preserve the existing Google/GitHub remote-provider exclusivity and Safari user-activation ordering.

#### Scenario: GitHub storage is active
- **WHEN** the browser is paired to GitHub storage and has no existing Google binding
- **THEN** the Google account action SHALL be blocked until GitHub is disconnected

#### Scenario: Google binding exists
- **WHEN** the browser has a Google Drive binding
- **THEN** GitHub connect/automatic synchronization SHALL remain blocked under the existing exclusivity contract

#### Scenario: Safari user activates Google account authorization
- **WHEN** GIS is ready and the user presses the Google account action
- **THEN** DashGPT SHALL request the Google token inside that original user-activation task
- **AND** SHALL NOT insert an awaited network/timer boundary before the token request

### Requirement: Google sign-in availability SHALL be truthful
A deployment SHALL expose the Google account action as usable only when its public OAuth client configuration is present and Google Identity Services can be prepared.

#### Scenario: Deployment lacks Google OAuth configuration
- **WHEN** `/api/storage/google/config` reports no configured client ID
- **THEN** DashGPT SHALL keep local mode working
- **AND** SHALL explain that Google sign-in is unavailable on this deployment
- **AND** SHALL NOT show a deceptively actionable Google connect/sign-in control

#### Scenario: Deployment is configured
- **WHEN** the public Web OAuth client ID is configured and GIS is ready
- **THEN** DashGPT SHALL present the account action as available
- **AND** successful authorization SHALL enter automatic account-Vault bootstrap
