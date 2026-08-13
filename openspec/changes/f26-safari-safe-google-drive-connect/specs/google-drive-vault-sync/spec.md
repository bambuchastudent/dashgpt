## ADDED Requirements

### Requirement: Google Drive connect preserves the explicit browser user-click path
The system SHALL issue the Google account popup request directly from the user's explicit `Connect Google Drive` click without awaiting provider-status networking, timers, dynamic script loading, or unrelated asynchronous work first.

#### Scenario: User connects in a strict desktop browser
- **WHEN** the Google browser library is ready and the user presses `Connect Google Drive`
- **THEN** DashGPT SHALL invoke the Google account request before any new asynchronous provider-status refresh begins

#### Scenario: Provider-status networking is slow
- **WHEN** provider-status networking is deliberately delayed after the user presses Connect
- **THEN** the Google account request SHALL still observe active browser user activation because it was issued before that networking boundary

### Requirement: Google readiness is truthful before Connect becomes actionable
The system SHALL preload the Google browser library after deployment configuration is known and SHALL NOT present an enabled Connect action while the required browser library is still unavailable.

#### Scenario: Google library is loading
- **WHEN** Google Drive is configured but the Google browser library has not finished loading
- **THEN** DashGPT SHALL show a preparing state and the primary Connect action SHALL not falsely appear ready

#### Scenario: Google library finishes loading
- **WHEN** the Google browser library becomes available
- **THEN** DashGPT SHALL render an enabled `Connect Google Drive` action without requiring a page reload

#### Scenario: Google library fails to load
- **WHEN** the browser cannot load the Google browser library
- **THEN** DashGPT SHALL show a human retry state and SHALL NOT claim that the account connection started

### Requirement: Remote-provider exclusivity is rechecked before Drive synchronization
The system SHALL preserve the one-active-remote-provider rule even though the Google account request now occurs before a fresh server-status request.

#### Scenario: GitHub was already known active
- **WHEN** the latest known provider state says GitHub is paired and Google Drive is not already bound
- **THEN** DashGPT SHALL keep Google Connect disabled and SHALL NOT request Google account access

#### Scenario: GitHub becomes active while Google account UI is open
- **WHEN** Google returns successfully but a fresh provider-status check reports GitHub is now active
- **THEN** DashGPT SHALL stop before Google Drive synchronization and SHALL explain that GitHub must be disconnected first

### Requirement: Browser-sensitive connect behavior requires Safari acceptance evidence
Browser automation SHALL not be the only completion evidence for changes that depend on popup/user-activation behavior.

#### Scenario: Browser-sensitive Google Drive connect change is prepared for merge
- **WHEN** a production change modifies the ordering of Google account launch, popup handling, or browser user activation
- **THEN** the verification checklist SHALL include a real macOS Safari click-through in addition to deterministic automated regression coverage

#### Scenario: Chromium automation passes but Safari acceptance has not been performed
- **WHEN** Chromium tests pass but the required macOS Safari acceptance has not been performed
- **THEN** project documentation SHALL report Safari acceptance as an open verification item rather than claiming complete browser support

### Requirement: Browser launch regression guidance remains portable
The project SHALL keep a short engineering recommendation document describing the user-activation rule, browser matrix expectations, and truthful loading/failure states for future agents.

#### Scenario: A future agent changes a popup, share-sheet, clipboard, or cross-window launch flow
- **WHEN** that change depends on a browser user gesture
- **THEN** the agent SHALL treat awaited work before the privileged browser action as a regression risk and SHALL verify the affected browser family explicitly
