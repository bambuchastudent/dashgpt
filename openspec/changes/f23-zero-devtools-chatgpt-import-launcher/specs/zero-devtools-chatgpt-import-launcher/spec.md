## Purpose

Zero-DevTools ChatGPT Import Launcher lets ordinary users start and resume the existing Feature 20 ChatGPT history migration from supported mobile and desktop browsers without opening Developer Tools, while preserving the same local-first receiver, durable card identity and browser security boundaries.

## ADDED Requirements

### Requirement: Normal import launch does not require Developer Tools
The system SHALL provide a supported normal launch/resume flow that does not require the user to open a JavaScript Console, Web Inspector or other Developer Tools surface.

#### Scenario: User starts import on a supported browser
- **WHEN** the user invokes `Start import` or `Continue import`
- **THEN** DashGPT presents the reusable `DashGPT Import` browser action setup/run flow and SHALL NOT instruct the user to open DevTools as the primary path

#### Scenario: Diagnostic fallback is retained
- **WHEN** a diagnostic raw runner copy remains available
- **THEN** it is visually secondary/troubleshooting-only and the normal product flow remains DevTools-free

### Requirement: One reusable browser action works across supported mobile and desktop browsers
The system SHALL use one provider-neutral product concept named `DashGPT Import`, with browser-specific setup instructions only where interaction mechanics differ.

#### Scenario: iPhone Safari user sets up import
- **WHEN** the current browser is supported iPhone/iPad Safari
- **THEN** DashGPT explains how to save/edit the `DashGPT Import` browser action and run it on the authenticated ChatGPT page without installing an extension/plugin

#### Scenario: Android Chrome user sets up import
- **WHEN** the current browser is supported Android Chrome
- **THEN** DashGPT explains how to save/edit and invoke the same `DashGPT Import` action from the authenticated ChatGPT browser page

#### Scenario: Desktop user sets up import
- **WHEN** the current browser supports JavaScript bookmark actions on desktop
- **THEN** the same action can be saved/run from bookmarks/favorites without requiring a separate desktop import architecture

### Requirement: The browser action executes only in the ChatGPT source context
The generated action SHALL execute the existing same-origin source runtime only when the current page origin is the supported ChatGPT origin and SHALL NOT bypass cross-origin browser security.

#### Scenario: Action runs on ChatGPT
- **WHEN** the user explicitly runs the saved action while the current page origin is `https://chatgpt.com`
- **THEN** the Feature 20 source runtime may begin source setup and receiver connection

#### Scenario: Action runs on another origin
- **WHEN** the saved action is invoked on a page whose origin is not the supported ChatGPT origin
- **THEN** the runtime refuses to perform ChatGPT history requests and no DashGPT Vault mutation occurs

### Requirement: Every action run creates fresh transient launch identity
The action SHALL generate new transient session and nonce values for each execution and SHALL NOT embed a reusable authentication/session token in the saved action.

#### Scenario: Same action runs twice
- **WHEN** the user runs the same saved `DashGPT Import` action twice
- **THEN** each run uses new transient session/nonce values while targeting the same configured DashGPT receiver origin/path

#### Scenario: Saved action is inspected
- **WHEN** the generated action payload is inspected
- **THEN** it contains no ChatGPT access token, cookie, account ID, authorization header, session object or conversation content

### Requirement: The action reuses Feature 20 source and receiver behavior
The action SHALL reuse the existing Feature 20 source runtime, receiver protocol, deterministic imported-card identity and ACK-after-durable-save semantics rather than implementing a second migration pipeline.

#### Scenario: Action establishes receiver handshake
- **WHEN** a valid action launch connects to the configured DashGPT receiver
- **THEN** the normal Feature 20 `HELLO -> READY -> DISCOVERED/BATCH -> ACK -> COMPLETE` protocol and validation rules remain authoritative

#### Scenario: Action resumes an existing mobile Vault
- **WHEN** the local Vault already contains imported ChatGPT cards and the action runs again
- **THEN** the receiver returns current source freshness and already-current conversations are skipped without duplicate cards

### Requirement: Receiver connection is attempted from the explicit user action and has a human fallback
The normal action flow SHALL attempt to open/connect the DashGPT receiver in response to the user's explicit action and SHALL preserve a visible fallback when the browser blocks that receiver window.

#### Scenario: Receiver window is allowed
- **WHEN** the browser permits the receiver window from the action gesture
- **THEN** the source connects to that receiver and import can proceed without a DevTools step

#### Scenario: Receiver window is blocked
- **WHEN** the browser blocks the automatic receiver open
- **THEN** the ChatGPT source overlay exposes a human `Connect DashGPT` retry action and does not falsely claim import is running

### Requirement: Setup UI is understandable on narrow mobile viewports
The launcher SHALL provide compact human instructions and controls that fit supported narrow mobile viewports without horizontal overflow.

#### Scenario: 360px viewport opens launcher
- **WHEN** the action setup dialog is rendered at 360 CSS pixels wide
- **THEN** all instructions and primary actions remain reachable without horizontal scrolling

#### Scenario: User copies action
- **WHEN** the user presses `Copy import action`
- **THEN** DashGPT copies the complete generated `javascript:` action for the current receiver origin and confirms the copy state without exposing raw implementation diagnostics by default

### Requirement: The generated action has a deterministic size and safety guard
The system SHALL enforce a conservative generated-action size ceiling and SHALL fail verification rather than silently shipping an unexpectedly oversized or credential-bearing action.

#### Scenario: Verification generates production action
- **WHEN** deterministic verification builds the action for a representative HTTPS receiver origin
- **THEN** the payload starts with `javascript:`, targets only the configured receiver origin/path, generates runtime session/nonce values, contains no credential fixture values and remains below the configured maximum length

#### Scenario: Action exceeds supported bound
- **WHEN** a source-runtime change makes the generated action exceed the configured safe ceiling
- **THEN** repository verification fails and the launcher architecture must be reconsidered before merge

### Requirement: Unsupported browser states are truthful
The system SHALL not claim that the native ChatGPT app or a browser without usable saved JavaScript actions can execute the browser action.

#### Scenario: Native ChatGPT app captures the link
- **WHEN** launching ChatGPT leaves the supported browser context
- **THEN** DashGPT explains that history import must continue in the browser and does not claim the native app is importing

#### Scenario: Saved JavaScript actions are unavailable
- **WHEN** capability/acceptance testing determines the current browser cannot execute the action
- **THEN** DashGPT presents a clear unsupported/fallback state without asking the user to disable browser security or install an undeclared prerequisite

### Requirement: Existing Feature 20 import semantics remain unchanged outside launcher scope
The change SHALL NOT alter stable conversation identity, imported-card projection, scheduler behavior, Vault batching, progress-card data ownership, search/Dash behavior or credential handling except where strictly needed to launch the existing source runtime.

#### Scenario: Existing duplicate-safe resume regression runs
- **WHEN** the repository Feature 20 idempotency/resume tests execute after this change
- **THEN** the same source IDs still converge to one canonical imported card and current cards remain skipped/updated according to existing freshness rules

#### Scenario: Existing rate-limit and persistence regressions run
- **WHEN** Feature 20 scheduler and batch persistence tests execute
- **THEN** their behavior remains unchanged by the launcher implementation
