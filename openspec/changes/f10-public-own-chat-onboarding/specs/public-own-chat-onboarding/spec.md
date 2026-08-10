## ADDED Requirements

### Requirement: Clean public entry contains no publisher Results

The normal public `/demo/` dashboard MUST NOT load or persist the publisher's published Result catalog for a visitor.

#### Scenario: First visit on a clean device
- **GIVEN** the browser has no DashGPT user Results
- **WHEN** the visitor opens `/demo/`
- **THEN** no publisher Result card is rendered
- **AND** no publisher Result is copied into the visitor's local Vault
- **AND** a welcome/share-chat onboarding view is shown.

#### Scenario: Returning visitor with own local Results
- **GIVEN** the browser contains user-created Results
- **WHEN** the visitor opens `/demo/`
- **THEN** the user's own Results are rendered
- **AND** the publisher catalog is not mixed into them.

### Requirement: First value comes from the visitor's own chat

The empty welcome view MUST make sharing the visitor's own AI chat the primary action.

#### Scenario: Valid ChatGPT public share URL
- **GIVEN** the visitor is on the empty welcome screen
- **WHEN** they submit a supported public ChatGPT share URL
- **THEN** DashGPT reads it using the existing shared-chat endpoint
- **AND** presents a human-readable title and summary for review
- **AND** saving creates a local Result whose source points to that shared chat.

#### Scenario: Unsupported or unreadable link
- **WHEN** the visitor submits a link that cannot be imported
- **THEN** the welcome screen explains the problem in place
- **AND** no Result is created.

### Requirement: Publisher catalog stays available only in explicit public-result contexts

Published Results MUST remain accessible to existing direct Result, Semantic Dash, MCP, and public API flows without appearing in the normal personal dashboard.

#### Scenario: Direct immutable Result link
- **WHEN** a visitor opens `/demo/result/<id>/`
- **THEN** the published Result can still be resolved and displayed.

#### Scenario: Explicit showcase mode
- **WHEN** `/demo/?showcase=1` is opened
- **THEN** the published catalog may be rendered for product/reviewer testing.

### Requirement: Onboarding copy is value-first

The empty public onboarding view MUST NOT lead with Vault, local-first, immutable, verification, storage-provider, or synchronization terminology.

#### Scenario: Empty first screen
- **WHEN** the first-time visitor sees the welcome view
- **THEN** the primary message explains that sharing a chat creates a useful saved card
- **AND** technical storage controls are not the primary interface.
