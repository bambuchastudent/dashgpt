## Purpose

Zero-DevTools ChatGPT Import Launcher lets ordinary users start and resume the existing Feature 20/F24 ChatGPT history migration from supported mobile and desktop browsers without opening Developer Tools, while preserving the same local-first receiver, durable card identity and browser security boundaries.

## ADDED Requirements

### Requirement: The import card is discoverable in existing local Vaults
The system SHALL use the operational `Import ChatGPT history` card as the normal launcher entry point even when the local Vault already contains other cards, unless the user explicitly dismissed that operational card.

#### Scenario: Existing Vault has cards but no import progress card
- **WHEN** DashGPT opens a local Vault that contains normal or imported cards, has no current ChatGPT import progress card, and has no explicit active dismissal for that card
- **THEN** DashGPT SHALL create the operational import card using the current count of already-imported ChatGPT cards and SHALL visually promote it using the existing operational-card treatment

#### Scenario: User explicitly removed the import card
- **WHEN** the latest dismissal state for the import progress card is explicit dismissal/removal
- **THEN** DashGPT SHALL NOT automatically recreate the card on subsequent loads

#### Scenario: User restores a dismissed import card
- **WHEN** the user invokes the explicit restore/import action after dismissal
- **THEN** DashGPT SHALL clear the dismissal state, restore the same operational card, and retain duplicate-safe imported-card state

### Requirement: Normal import launch does not require Developer Tools
The system SHALL provide a supported normal launch/resume flow that does not require the user to open a JavaScript Console, Web Inspector or other Developer Tools surface.

#### Scenario: User starts import on a supported browser
- **WHEN** the user invokes `Start import` or `Continue import`
- **THEN** DashGPT presents the supported `DashGPT Import` setup/run flow for that browser and SHALL NOT instruct the user to open DevTools as the primary path

#### Scenario: Diagnostic fallback is retained
- **WHEN** a diagnostic raw runner copy remains available
- **THEN** it is visually secondary/troubleshooting-only and the normal product flow remains DevTools-free

### Requirement: DashGPT Import uses one shared importer with platform-appropriate execution adapters
The system SHALL expose one product concept named `DashGPT Import` while allowing the same final source runner to be executed through a browser-supported adapter.

#### Scenario: iPhone or iPad Safari user sets up import
- **WHEN** the current browser is supported iPhone/iPad Safari
- **THEN** DashGPT offers a Safari Shortcut setup using Apple's `Run JavaScript on Web Page` action and SHALL NOT instruct the user to rely on a JavaScript bookmark as the supported iOS path

#### Scenario: Android Chrome user sets up import
- **WHEN** the current browser is supported Android Chrome
- **THEN** DashGPT explains how to save/edit and invoke the `DashGPT Import` JavaScript bookmark action from the authenticated ChatGPT browser page

#### Scenario: Desktop user sets up import
- **WHEN** the current desktop browser supports JavaScript bookmark actions
- **THEN** the same bookmark-action adapter can be saved/run from bookmarks/favorites without requiring a separate desktop import architecture

### Requirement: Safari Shortcut payload reuses the final source runner and completes the Shortcut promptly
The iPhone/iPad Safari adapter SHALL generate plain JavaScript for Apple's `Run JavaScript on Web Page` action, SHALL reuse the existing final ChatGPT source runtime, and SHALL invoke the Shortcuts completion handler promptly instead of waiting for the full migration.

#### Scenario: User copies Safari Shortcut script
- **WHEN** an iPhone/iPad Safari user presses the Safari script copy action
- **THEN** DashGPT copies plain JavaScript rather than a `javascript:` URL and the payload includes the documented `completion()` call

#### Scenario: Safari Shortcut runs on ChatGPT
- **WHEN** the user runs the configured `DashGPT Import` Shortcut from the Safari Share Sheet on authenticated `https://chatgpt.com`
- **THEN** the final source runtime begins source setup/receiver connection and the Shortcut action itself is allowed to complete without waiting for all conversations to import

### Requirement: The launcher executes only in the ChatGPT source context
Every adapter SHALL execute the existing same-origin source runtime only when the current page origin is the supported ChatGPT origin and SHALL NOT bypass cross-origin browser security.

#### Scenario: Launcher runs on ChatGPT
- **WHEN** the user explicitly runs `DashGPT Import` while the current page origin is `https://chatgpt.com`
- **THEN** the source runtime may begin source setup and receiver connection

#### Scenario: Launcher runs on another origin
- **WHEN** an adapter is invoked on a page whose origin is not the supported ChatGPT origin
- **THEN** the runtime refuses to perform ChatGPT history requests and no DashGPT Vault mutation occurs

### Requirement: Every launcher run creates fresh transient launch identity
Every adapter SHALL generate new transient session and nonce values for each execution and SHALL NOT embed a reusable authentication/session token in the saved adapter payload.

#### Scenario: Same launcher runs twice
- **WHEN** the user runs the same configured `DashGPT Import` adapter twice
- **THEN** each run uses new transient session/nonce values while targeting the same configured DashGPT receiver origin/path

#### Scenario: Generated payload is inspected
- **WHEN** either adapter payload is inspected
- **THEN** it contains no ChatGPT access token, cookie, account ID, authorization header, session object or conversation content

### Requirement: All adapters reuse current import and scheduler behavior
The launcher SHALL reuse the existing source runtime, receiver protocol, deterministic imported-card identity and ACK-after-durable-save semantics rather than implementing a second migration pipeline. When Feature 24 is integrated, the launcher SHALL preserve its per-conversation deferred-429 scheduler semantics.

#### Scenario: Launcher establishes receiver handshake
- **WHEN** a valid launcher execution connects to the configured DashGPT receiver
- **THEN** the normal `HELLO -> READY -> DISCOVERED/BATCH -> ACK -> COMPLETE` protocol and validation rules remain authoritative

#### Scenario: Launcher resumes an existing mobile Vault
- **WHEN** the local Vault already contains imported ChatGPT cards and `DashGPT Import` runs again
- **THEN** the receiver returns current source freshness and already-current conversations are skipped without duplicate cards

#### Scenario: One conversation receives 429 after F24 integration
- **WHEN** the integrated launcher runs a source runtime in which one conversation-detail request receives HTTP 429 while unrelated work is ready
- **THEN** the launcher SHALL preserve F24 behavior where only that conversation is deferred and SHALL NOT restore a launcher-specific/global 429 cooldown

### Requirement: Receiver connection is attempted from the explicit user action and has a human fallback
The normal launcher flow SHALL attempt to open/connect the DashGPT receiver in response to the user's explicit action and SHALL preserve a visible fallback when the browser blocks that receiver window.

#### Scenario: Receiver window is allowed
- **WHEN** the browser permits the receiver window from the launcher gesture
- **THEN** the source connects to that receiver and import can proceed without a DevTools step

#### Scenario: Receiver window is blocked
- **WHEN** the browser blocks the automatic receiver open
- **THEN** the ChatGPT source overlay exposes a human `Connect DashGPT` retry action and does not falsely claim import is running

### Requirement: Setup UI is understandable on narrow mobile viewports
The launcher SHALL provide compact human instructions and controls that fit supported narrow mobile viewports without horizontal overflow.

#### Scenario: 360px viewport opens launcher
- **WHEN** the setup dialog is rendered at 360 CSS pixels wide
- **THEN** all instructions and primary actions remain reachable without horizontal scrolling

#### Scenario: iPhone user opens launcher
- **WHEN** an iPhone-like Safari environment opens the setup dialog
- **THEN** the primary copy action and instructions refer to a Safari Shortcut and the Safari Share Sheet rather than editing a JavaScript bookmark URL

#### Scenario: Android user opens launcher
- **WHEN** an Android-like Chrome environment opens the setup dialog
- **THEN** the primary copy action and instructions refer to the saved JavaScript bookmark action

### Requirement: Generated adapters have deterministic safety guards
The system SHALL verify that generated launcher payloads preserve receiver targeting, transient identity and credential boundaries, and SHALL fail verification rather than silently shipping an invalid adapter.

#### Scenario: Verification generates Android/desktop bookmark action
- **WHEN** deterministic verification builds the bookmark action for a representative HTTPS receiver origin
- **THEN** the payload starts with `javascript:`, targets only the configured receiver origin/path, generates runtime session/nonce values, contains no credential fixture values and remains below the configured maximum length

#### Scenario: Verification generates Safari Shortcut script
- **WHEN** deterministic verification builds the Safari Shortcut payload
- **THEN** the payload is plain JavaScript, targets only the configured receiver origin/path, generates runtime session/nonce values, invokes `completion()`, contains no credential fixture values and reuses the final source-runner hooks

### Requirement: Unsupported browser states are truthful
The system SHALL not claim that the native ChatGPT app or an execution mechanism that failed real-device acceptance is supported.

#### Scenario: Native ChatGPT app captures the link
- **WHEN** launching ChatGPT leaves the supported browser context
- **THEN** DashGPT explains that history import must continue in the browser and does not claim the native app is importing

#### Scenario: iPhone JavaScript bookmark was saved but does not execute reliably
- **WHEN** the user is on iPhone/iPad Safari
- **THEN** DashGPT directs the user to the Safari Shortcut adapter and SHALL NOT ask them to keep retrying the JavaScript bookmark path

### Requirement: Existing import semantics remain unchanged outside launcher/discoverability scope
The change SHALL NOT alter stable conversation identity, imported-card projection, Vault batching, search/Dash behavior or credential handling. After stacking on F24 it SHALL consume, not reimplement, F24 scheduler/progress semantics.

#### Scenario: Existing duplicate-safe resume regression runs
- **WHEN** the repository idempotency/resume tests execute after this change
- **THEN** the same source IDs still converge to one canonical imported card and current cards remain skipped/updated according to existing freshness rules

#### Scenario: Existing rate-limit and persistence regressions run
- **WHEN** F24 scheduler and batch persistence tests execute after integration
- **THEN** per-conversation deferred retries, durable ACK behavior and bounded progress remain unchanged by the launcher implementation
