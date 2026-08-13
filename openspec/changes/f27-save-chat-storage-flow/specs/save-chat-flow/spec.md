## ADDED Requirements

### Requirement: Personal Save chat opens the chat capture dialog
The system SHALL make the personal dashboard `Save chat` / `Сохранить чат` action open the structured chat-capture dialog and SHALL NOT open the generic manual Add Result form for that personal action.

#### Scenario: Existing user presses Save chat
- **WHEN** a personal user with existing cards presses the topbar Save-chat action
- **THEN** DashGPT SHALL open the structured chat-capture dialog
- **AND** the generic manual Result form SHALL remain closed

#### Scenario: Generic Result creation outside personal Save-chat mode
- **WHEN** the generic Add Result action is used outside the personal Save-chat mode
- **THEN** existing manual Result creation SHALL remain available

### Requirement: Save chat explains local-first storage
The system SHALL state that a captured card is saved to the local browser Vault first and SHALL keep local save available without requiring a remote provider.

#### Scenario: No remote provider is connected
- **WHEN** the Save-chat dialog opens with no remote provider connected
- **THEN** the local device SHALL be shown as active
- **AND** the user SHALL still be able to complete capture and save locally

#### Scenario: User saves without choosing a provider
- **WHEN** the user reviews a valid captured Result and saves it without connecting Google Drive or GitHub
- **THEN** exactly one visitor-owned local Result SHALL be created using the existing ChatGPT-handoff provenance

### Requirement: Remote providers are sync choices for the same cards
The system SHALL present Google Drive and GitHub as optional synchronization choices for the same canonical Vault/cards and SHALL NOT present them as separate card destinations or card types.

#### Scenario: Storage choices render
- **WHEN** the Save-chat dialog opens
- **THEN** it SHALL show the local device plus Google Drive and GitHub rows with human-readable status/actions
- **AND** it SHALL communicate that one remote provider is active at a time

#### Scenario: A remote provider is already connected
- **WHEN** canonical storage state says Google Drive or GitHub is connected
- **THEN** the dialog SHALL show that provider as the active synchronization choice rather than asking the user to create another copy of the card

### Requirement: Google Drive action reuses the canonical connector
The system SHALL delegate the Save-chat Google Drive action to the already-initialized Google Drive controller and SHALL preserve the browser click-ordering rule established by F26.

#### Scenario: Google Drive is ready
- **WHEN** the user presses `Connect Google Drive` in the Save-chat dialog and the canonical Drive controller is ready
- **THEN** DashGPT SHALL start the existing Google Drive connection flow directly from that user action
- **AND** SHALL NOT create a second Drive adapter or separate Vault

#### Scenario: Google Drive is preparing or blocked
- **WHEN** the canonical Drive controller cannot connect yet
- **THEN** the Save-chat dialog SHALL show the canonical preparing/blocked state or offer the existing Storage details
- **AND** local card saving SHALL remain available

### Requirement: GitHub setup reuses the repository-scoped Storage flow
The system SHALL reuse the existing GitHub repository/folder setup instead of duplicating GitHub pairing fields inside Save chat.

#### Scenario: User chooses GitHub setup
- **WHEN** the user presses the GitHub setup action in Save chat
- **THEN** DashGPT SHALL open the canonical Storage dialog focused on the GitHub provider controls

### Requirement: Existing first-card and Share flows remain compatible
The system SHALL preserve first-card chat-first onboarding and anonymous Share fallback while adding the reusable Save-chat dialog for the topbar action.

#### Scenario: Clean personal device
- **WHEN** the clean-user welcome renders
- **THEN** the existing command/paste first-card flow and anonymous Share fallback SHALL remain available

#### Scenario: Import operation card exposes Save chat before the first user card
- **WHEN** the import operation card exists and the topbar Save-chat action is visible
- **THEN** pressing Save chat SHALL open the same dedicated capture dialog without removing the import card

### Requirement: Save-chat flow is usable at 360px
The system SHALL render the Save-chat dialog without horizontal overflow at a 360px viewport and SHALL keep the local storage explanation, provider actions, capture fields, review, and save action usable.

#### Scenario: Narrow mobile viewport
- **WHEN** the Save-chat dialog is opened at 360px wide
- **THEN** provider rows/actions SHALL stack or wrap without horizontal overflow and the capture/review controls SHALL remain reachable
