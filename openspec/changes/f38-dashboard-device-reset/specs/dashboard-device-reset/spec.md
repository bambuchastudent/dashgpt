## ADDED Requirements

### Requirement: Dashboard SHALL expose a device reset from the existing storage/settings surface
The personal DashGPT dashboard SHALL provide a discoverable destructive reset action inside the existing Storage/Vault surface rather than requiring manual browser settings.

#### Scenario: User opens Storage from My Dash
- **WHEN** the user opens the current dashboard Storage/Vault surface
- **THEN** a `Reset this device` action SHALL be available
- **AND** the action SHALL NOT execute until the user opens and confirms a second destructive confirmation step

### Requirement: Device reset SHALL return DashGPT to its normal fresh-browser state
A successful reset SHALL remove the current device's DashGPT-owned memory and presentation/import state and then run the normal fresh-start bootstrap.

#### Scenario: User confirms reset
- **WHEN** the reset completes successfully
- **THEN** the previous local Vault Cards, events, Dash revisions and profile revisions SHALL no longer be present on this device
- **AND** DashGPT-owned search/gallery/import/onboarding/session state from the previous session SHALL no longer be present
- **AND** the browser SHALL navigate to `/demo/`
- **AND** the resulting state SHALL match the product's current fresh-browser bootstrap, including any required system onboarding/import card

### Requirement: Reset SHALL delete only DashGPT-owned browser storage
DashGPT SHALL bound browser cleanup to its own namespaced state.

#### Scenario: Origin contains unrelated storage
- **WHEN** reset removes browser state
- **THEN** localStorage and sessionStorage keys beginning with `dashgpt.` SHALL be removed
- **AND** unrelated keys not beginning with `dashgpt.` SHALL remain unchanged
- **AND** the implementation SHALL NOT use `localStorage.clear()`, broad cookie deletion or browser-wide cache/history deletion

### Requirement: Remote Vault content SHALL survive a device reset
Reset SHALL be a local-device operation, not a remote-memory deletion operation.

#### Scenario: Google Drive is bound before reset
- **WHEN** the user resets this device
- **THEN** the browser's Google binding SHALL be removed with other DashGPT-owned local state
- **AND** late or in-flight browser synchronization SHALL NOT be able to restore DashGPT local state before navigation completes
- **AND** DashGPT SHALL NOT delete the remote Google Drive Vault file

#### Scenario: GitHub storage is paired before reset
- **WHEN** the user resets this device
- **THEN** DashGPT SHALL disconnect the existing GitHub pairing before local storage is removed
- **AND** late or in-flight browser synchronization SHALL NOT be able to restore DashGPT local state before navigation completes
- **AND** DashGPT SHALL NOT delete Vault content from the paired GitHub repository

### Requirement: Reset SHALL prevent automatic remote rehydration
DashGPT SHALL establish a safe disconnected device state before deleting local memory so that reset cannot immediately refill the browser from an active or in-flight provider operation.

#### Scenario: GitHub disconnect fails
- **WHEN** an active GitHub pairing cannot be disconnected
- **THEN** DashGPT SHALL abort before deleting the local Vault or DashGPT browser state
- **AND** SHALL show a human-readable retryable error
- **AND** SHALL NOT claim that reset completed

#### Scenario: In-flight code attempts to write old DashGPT state
- **WHEN** reset has passed remote-disconnect checks and is ready to clear browser state
- **THEN** DashGPT SHALL install a temporary write barrier for keys beginning with `dashgpt.` before local deletion
- **AND** the barrier SHALL allow unrelated origin storage writes to continue
- **AND** the barrier SHALL remain effective until immediate navigation tears down the current page
- **AND** if the barrier cannot be installed, reset SHALL abort before deleting local state

### Requirement: Confirmation SHALL explain the recovery boundary
The destructive confirmation SHALL distinguish device cleanup from remote deletion.

#### Scenario: User reviews reset confirmation
- **WHEN** the confirmation dialog is shown
- **THEN** it SHALL explain that local Cards, Dashes and import/presentation state on this device will be removed
- **AND** SHALL explain that Google Drive/GitHub remote Vault content is preserved
- **AND** SHALL explain that reconnecting preserved remote storage later may restore old memory
- **AND** SHALL offer a non-destructive cancel action
