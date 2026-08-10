## Purpose

Zero-Friction Mobile Demo makes DashGPT understandable before its storage architecture: a new mobile visitor sees useful AI conversations become organized, resumable cards immediately, can inspect the mechanism voluntarily, and encounters persistence choices only after creating repeated personal value.

## ADDED Requirements

### Requirement: First screen communicates product value before architecture
The `/demo/` first meaningful render SHALL present the value proposition, a populated semantic card surface, and human-facing primary actions before any storage, MCP, Vault, synchronization, immutable-verification, schema, hash, or version terminology.

#### Scenario: New mobile visitor understands the promise
- **WHEN** a visitor opens `/demo/` at a 360 CSS-pixel viewport with no prior DashGPT state
- **THEN** the visible hero says `Важное из разговоров с ИИ — всегда под рукой`
- **AND** the subtitle explains that useful outcomes, decisions, and plans become cards that are easy to find and continue
- **AND** `Показать за 20 секунд` and `Сохранить разговор` are available
- **AND** populated cards begin within the initial compact dashboard flow

#### Scenario: Technical first-run copy is absent
- **WHEN** the main dashboard is rendered for a new visitor
- **THEN** it does not expose `PRIVATE • LOCAL-FIRST`, `LOCAL · NOT SYNCED`, Vault terminology, browser-storage warnings, immutable/verified counts, MCP terminology, or an empty `No saved Dashes yet` block

#### Scenario: First meaningful render is independent
- **WHEN** the visitor has not authenticated and no AI request is available
- **THEN** the hero and deterministic demonstration board still render meaningfully

### Requirement: Demonstration content is populated but never user-owned by default
The system SHALL provide deterministic demonstration Results covering DashGPT, food, travel, home, and health themes plus demonstration Dashes `Про DashGPT`, `Что приготовить`, and `Поездки и планы`. Demonstration objects SHALL remain presentation data unless a user explicitly confirms a real save.

#### Scenario: Empty local memory still looks useful
- **WHEN** the browser Vault contains no user-created Result
- **THEN** the semantic gallery still shows expressive demonstration cards across the required themes
- **AND** the three demonstration Dashes are visible without showing an empty-Dash state in the primary demo flow

#### Scenario: Demo Results do not enter the Vault
- **WHEN** demonstration cards are rendered, opened, filtered, or shown in showcase mode
- **THEN** no demonstration Result revision is written to the user's Vault

#### Scenario: Demo Results do not count toward persistence onboarding
- **WHEN** any number of demonstration cards or Dashes are displayed or interacted with
- **THEN** the confirmed user-card count remains unchanged

### Requirement: Twenty-second story is voluntary, deterministic, and closable
`Показать за 20 секунд` SHALL open a deterministic story requiring neither AI nor keyboard input. The story SHALL be closable immediately and SHALL not block use of the dashboard.

#### Scenario: Conversation becomes a structured card
- **WHEN** the visitor starts the story
- **THEN** the UI shows an ordinary AI conversation fragment
- **AND** visually reduces it into one card
- **AND** shows a short summary, decisions, important/current facts, and next step

#### Scenario: Card joins a semantic neighborhood
- **WHEN** the story reaches placement
- **THEN** the resulting demonstration card is shown adjacent to thematically related cards using the same semantic visual language as the gallery

#### Scenario: Story completes with continuation value
- **WHEN** the final story state is reached
- **THEN** the message says `Теперь это можно найти и продолжить в любой момент.`
- **AND** actions `Открыть карточку` and `Попробовать со своим разговором` are available

#### Scenario: Visitor skips the story
- **WHEN** the visitor closes the story at any state
- **THEN** the interactive board remains available immediately
- **AND** no user data has been created

### Requirement: Main cards expose only decision-relevant information
A card on the first dashboard surface SHALL expose only its theme, title, short summary, human-readable relevance/recency cue, and semantic color identity. The entire non-control card surface SHALL open details in one tap/click.

#### Scenario: Card stays human-readable
- **WHEN** a Result has immutable metadata, content hash, tags, related materials, or internal schema fields
- **THEN** those internal fields are not shown on the compact first-screen card

#### Scenario: One tap opens the card
- **WHEN** a touch user taps the body of a card
- **THEN** the primary card detail opens without requiring a secondary `Open` button

### Requirement: Opened card uses continuation-oriented sections
The primary Result detail SHALL use the labels `Главное`, `Что решили`, `Сейчас`, and `Дальше`, and SHALL expose `Открыть исходный чат` when available plus `Продолжить разговор`. Schema/version/hash/integrity/Vault fields SHALL not be shown in this primary detail surface.

#### Scenario: Visitor finds the main decision
- **WHEN** a Result with captured decisions is opened
- **THEN** the decisions are visible under `Что решили` without inspecting technical metadata

#### Scenario: Visitor understands work can continue
- **WHEN** a Result is opened
- **THEN** `Продолжить разговор` is a prominent available action using the existing continuation destination contract

#### Scenario: Visitor returns to board
- **WHEN** the visitor closes the detail or follows the visible back control on a standalone page
- **THEN** the semantic board is the obvious return destination

### Requirement: Saving a conversation requires review before persistence
The primary creation action SHALL be named `Сохранить разговор`. The system SHALL show a review headed `Вот что DashGPT сохранит` before writing a new Result into the Vault.

#### Scenario: User reviews prepared content
- **WHEN** capture/import input has enough information to prepare a card
- **THEN** the review shows editable title and summary plus removable optional material before confirmation

#### Scenario: Cancel does not create a card
- **WHEN** the user cancels from capture or review
- **THEN** no Result revision, `created` activity, or confirmed-user-card count is added

#### Scenario: Confirmation creates and groups the card
- **WHEN** the user explicitly confirms the review
- **THEN** the Result is persisted through the existing local Result path
- **AND** the confirmed-user-card count increases once
- **AND** the dashboard renders the card using existing semantic-gallery grouping so it appears with its closest theme rather than in a hard-coded slot

### Requirement: Persistence onboarding occurs only after demonstrated value
The dashboard SHALL NOT request synchronization/persistence on first open. It SHALL first offer persistence when three Results have been explicitly confirmed through the user save flow, excluding demonstration content.

#### Scenario: Third confirmed card triggers a gentle offer
- **WHEN** the confirmed user-card count changes from two to three
- **THEN** a non-blocking bottom sheet says `Сохранить свою память?`
- **AND** explains that three useful cards can be kept long-term and opened on other devices
- **AND** offers `Сохранить мои карточки` and `Не сейчас`

#### Scenario: Dismissal never blocks work
- **WHEN** the user selects `Не сейчас`
- **THEN** the sheet closes, the board remains fully usable, and it is not shown again on every open

#### Scenario: Dismissal requires five more cards before repeat
- **WHEN** the user dismissed at confirmed count N
- **THEN** no repeat offer is shown before confirmed count N+5

#### Scenario: Persistence action does not advertise unavailable providers
- **WHEN** the user chooses `Сохранить мои карточки`
- **THEN** the UI opens only persistence management that works in the current build
- **AND** the value-triggered flow does not advertise non-working Google Drive or GitHub actions

### Requirement: Showcase mode is a safe presentation mode
The query `/demo/?showcase=1` SHALL show the strongest populated board and emphasize the deterministic story without creating fictitious user-owned memory.

#### Scenario: Investor opens showcase mode
- **WHEN** `/demo/?showcase=1` is opened
- **THEN** the populated board is visible, technical statuses are absent from the main presentation, and `Показать за 20 секунд` is prominent

#### Scenario: Showcase returns to real board
- **WHEN** the story completes or is closed in showcase mode
- **THEN** the same real interactive dashboard remains available
- **AND** no demonstration object has been persisted as user data

### Requirement: Mobile interaction works from 360 pixels with one hand
The primary flow SHALL support 360 CSS-pixel width, touch targets of at least 44 CSS pixels, no horizontal page overflow, one-tap card opening, obvious board return, and story use without keyboard input.

#### Scenario: Narrow mobile layout is usable
- **WHEN** the dashboard is rendered at 360 CSS pixels
- **THEN** the hero actions, demo controls, gallery, cards, dialogs, and bottom sheet fit without horizontal page scrolling
- **AND** primary interactive targets meet the 44-pixel minimum hit area

#### Scenario: Mobile Safari viewport changes
- **WHEN** browser chrome changes the usable viewport height
- **THEN** modal/sheet content remains reachable and does not depend solely on legacy fixed `vh` sizing

### Requirement: Verification makes the demo contract explicit
The repository SHALL provide a fast F9-focused verification command and a full project verification command. The existing `npm run check` command SHALL remain a compatibility path to the full verification suite.

#### Scenario: Fast verification is run during implementation
- **WHEN** `npm run verify:fast` is executed
- **THEN** JavaScript syntax and F9/core UI contract checks run without requiring remote AI/auth

#### Scenario: Full verification runs once before PR creation
- **WHEN** `npm run verify:full` is executed before opening the F9 PR
- **THEN** all existing project verification plus F9 checks run

### Requirement: Grandmother test is recorded without fabricated evidence
The PR SHALL contain a manual grandmother-test record covering product-purpose comprehension, one-tap card opening, decision discovery, continuation discovery, and return to board. Automated checks SHALL NOT be represented as a human test.

#### Scenario: Human test is completed
- **WHEN** a person with no prior DashGPT explanation performs the test
- **THEN** the PR records whether product purpose was understood within 10 seconds, a card was opened within 20 seconds, the main decision and continuation action were found, return to board succeeded, and no pre-save MCP/Vault/storage question arose

#### Scenario: Human test has not yet occurred
- **WHEN** no real uninstructed person has performed the test
- **THEN** the PR marks the manual acceptance item pending rather than claiming fabricated success
