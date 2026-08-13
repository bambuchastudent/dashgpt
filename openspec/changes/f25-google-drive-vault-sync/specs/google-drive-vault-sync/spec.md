## ADDED Requirements

### Requirement: Google Drive synchronization is an optional local-first Vault adapter
The system SHALL keep the browser-local DashGPT Vault as the immediate working copy while allowing the user to explicitly synchronize the same portable Vault v1 through Google Drive.

#### Scenario: Google Drive is not connected
- **WHEN** a user has not authorized Google Drive or authorization is unavailable
- **THEN** local cards, Dashes, search, continuation, export and import remain usable without Google Drive

#### Scenario: Google Drive synchronization succeeds
- **WHEN** an authorized Google Drive sync completes
- **THEN** the local Vault and selected Drive Vault represent the same merged portable Vault state and canonical Card identities remain unchanged

### Requirement: Google authorization uses the narrow Drive file scope
The system SHALL initiate Google authorization only from an explicit user action and SHALL request exactly `https://www.googleapis.com/auth/drive.file` for this adapter.

#### Scenario: User connects Google Drive
- **WHEN** the user presses Connect or Reconnect Google Drive on a configured deployment
- **THEN** DashGPT starts Google Identity Services authorization for `drive.file` without requesting broad `drive`, `drive.readonly`, metadata-wide or unrelated Google scopes

#### Scenario: Deployment has no Google OAuth client configured
- **WHEN** `GOOGLE_CLIENT_ID` is absent
- **THEN** the Storage UI reports Google Drive sync as not configured and local Vault behavior remains unchanged

### Requirement: Google credentials never enter durable DashGPT state
The system MUST keep Google OAuth access tokens transient to browser runtime memory and MUST NOT serialize them into the Vault, Cards, Dashes, local provider binding metadata, URLs or logs.

#### Scenario: Access token is received
- **WHEN** Google returns an OAuth access token
- **THEN** the token is used only in Authorization headers for Google API requests and is not written to localStorage, sessionStorage or Vault JSON

#### Scenario: Token expires
- **WHEN** the current access token is expired or rejected
- **THEN** automatic remote sync stops, local writes remain available, the provider is shown as needing reconnect, and a new token requires a user-driven authorization gesture

### Requirement: DashGPT stores a visible portable Vault file in Google Drive
The system SHALL create or discover a DashGPT-managed visible Drive folder and `dashgpt-vault.json` file using the existing portable Vault v1 representation.

#### Scenario: No managed Drive Vault exists
- **WHEN** authorization succeeds and the app cannot discover a DashGPT-managed Drive Vault file
- **THEN** it creates a visible `DashGPT` folder and portable `dashgpt-vault.json` using app-private properties for deterministic rediscovery

#### Scenario: Managed Drive Vault already exists
- **WHEN** authorization succeeds and one managed Drive Vault is discoverable
- **THEN** DashGPT downloads and validates that Vault before deciding whether to adopt, merge or require migration

#### Scenario: Drive contains unrelated files
- **WHEN** the user has unrelated Drive files
- **THEN** DashGPT does not enumerate or read their contents as part of normal Vault discovery

### Requirement: Provider metadata remains outside the Vault domain model
The system SHALL keep Google file/folder IDs, remote version metadata and OAuth configuration outside portable Card/Result content and outside the provider-neutral Vault schema.

#### Scenario: Drive binding is persisted locally
- **WHEN** a Drive Vault is connected on a device
- **THEN** DashGPT MAY store non-secret binding metadata such as folder ID, file ID, Vault ID, modified time and remote version, but MUST NOT store authorization tokens in that binding

### Requirement: A fresh second device adopts the existing remote Vault identity
The system SHALL allow an effectively empty local device to adopt an existing remote Drive Vault while preserving the remote `vaultId` and canonical Card identities.

#### Scenario: Local Vault contains no meaningful user content
- **WHEN** a remote Drive Vault exists with a different `vaultId` and the local Vault contains no meaningful user Cards, Dashes, profile revisions or user-state events
- **THEN** DashGPT replaces the synthetic local Vault with the validated remote Vault and preserves the remote `vaultId`

#### Scenario: Local Vault contains only system operation state
- **WHEN** the only local Result is an operational/system Card such as ChatGPT import progress and no meaningful user state exists
- **THEN** that system Card does not prevent second-device adoption of the remote Vault

### Requirement: Same-Vault synchronization reuses existing Vault merge semantics
The system SHALL merge local and remote content using existing Vault v1 rules whenever both sides have the same `vaultId`.

#### Scenario: Same Vault changed on both devices
- **WHEN** local and remote copies with the same `vaultId` contain different valid Cards/events/Dash revisions
- **THEN** DashGPT merges them with existing immutable conflict/event/profile rules before persisting the merged Vault locally and remotely

#### Scenario: Same Vault is already identical
- **WHEN** local and remote portable Vault content is identical
- **THEN** synchronization is idempotent and does not create duplicate Card identities or unnecessary semantic changes

### Requirement: Different non-empty Vaults require explicit migration
The system MUST NOT silently merge or replace two meaningful Vaults that have different `vaultId` values.

#### Scenario: Both local and remote Vaults contain meaningful user data
- **WHEN** authorization discovers a remote Vault with a different `vaultId` and the local Vault also contains meaningful user data
- **THEN** synchronization returns a migration-required product state without writing either side

#### Scenario: User confirms migration into Google Drive
- **WHEN** the user explicitly chooses to merge this device into the selected Drive Vault
- **THEN** DashGPT merges local objects into the remote Vault, preserves the remote `vaultId`, writes the merged remote, and saves that same merged Vault locally

#### Scenario: User declines migration
- **WHEN** the user does not confirm the different-Vault migration
- **THEN** neither local nor remote Vault content is modified

### Requirement: Remote changes are rechecked before upload
The system SHALL reduce lost-update risk by checking the managed Drive file remote version before uploading a merged Vault.

#### Scenario: Remote version changed after download
- **WHEN** Drive reports that the managed Vault file version changed after DashGPT downloaded it and before upload
- **THEN** DashGPT downloads the newer remote Vault and performs a bounded remerge before attempting the write

### Requirement: Google Drive provider failures never make local memory unavailable
The system SHALL preserve local usability and truthful unsynced state when Google authorization or Drive API access fails.

#### Scenario: Drive request fails temporarily
- **WHEN** Drive returns a transient network, quota, 429 or 5xx failure
- **THEN** local Vault data remains readable, unsynced local changes remain intact, and the UI offers a later retry without claiming remote durability

#### Scenario: Remote Vault is malformed
- **WHEN** downloaded Drive content is not a valid portable Vault v1
- **THEN** DashGPT rejects the remote content, preserves the local Vault unchanged, and presents a human-readable recovery state

### Requirement: Disconnect is non-destructive
The system SHALL disconnect Google Drive without deleting local or remote Vault data.

#### Scenario: User disconnects Google Drive
- **WHEN** the user chooses Disconnect
- **THEN** DashGPT clears local Google binding/transient authorization state, keeps the local Vault, and leaves the Drive folder/file untouched

### Requirement: Storage UI exposes Google Drive in product language
The system SHALL expose Google Drive connect, reconnect, synchronization and migration states in the existing Storage dialog without requiring users to understand OAuth implementation details.

#### Scenario: Provider is configured but not connected
- **WHEN** the Storage dialog opens on a configured deployment without an active Google binding
- **THEN** it shows a clear Connect Google Drive action and states that local data stays on the device until connected

#### Scenario: Provider binding exists but token is unavailable
- **WHEN** a previous non-secret Drive binding exists after reload but no valid token is held
- **THEN** the UI shows Reconnect Google Drive and explains that local changes are safe but not currently synchronized

#### Scenario: Provider is authorized and synchronized
- **WHEN** sync succeeds in the current session
- **THEN** the Storage UI and storage badge truthfully identify local + Google Drive synchronized state

#### Scenario: Storage dialog is narrow
- **WHEN** the UI is rendered at supported narrow mobile widths
- **THEN** Google Drive controls remain operable without horizontal overflow
