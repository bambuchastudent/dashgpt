## ADDED Requirements

### Requirement: Personal home explains the primary DashGPT journey
The personal DashGPT root SHALL present a plain-language entry surface before advanced dashboard concepts.

#### Scenario: User opens the personal root
- **WHEN** the user opens `/demo/` outside showcase mode
- **THEN** the first dashboard content SHALL explain that DashGPT keeps useful AI work for later and SHALL expose clear actions to import ChatGPT history, save one chat, and browse saved cards

#### Scenario: User opens a non-personal surface
- **WHEN** the current page is a result page, dash page, showcase, or other non-personal entry
- **THEN** the import-first home surface SHALL NOT replace that surface's normal presentation

### Requirement: Home actions reuse canonical workflows
The home entry actions SHALL delegate to the existing import, save-chat, and gallery controls rather than duplicating their business logic.

#### Scenario: User chooses Import ChatGPT history
- **WHEN** the import action is activated
- **THEN** DashGPT SHALL open the existing ChatGPT import guide so its ZIP/JSON, live-import, privacy, resumability, and duplicate-prevention behavior remains authoritative

#### Scenario: User chooses Save one chat
- **WHEN** the save-one-chat action is activated
- **THEN** DashGPT SHALL open the existing personal Save Chat flow with ChatGPT Share URL as the primary input

#### Scenario: User chooses My cards
- **WHEN** the browse action is activated
- **THEN** DashGPT SHALL navigate focus to the existing card gallery/search without creating a new card or Dash

### Requirement: Advanced features remain available without dominating first-run UX
The home hierarchy SHALL keep existing Semantic Dashes, search, density controls, storage settings and manual result tooling available after the primary entry surface.

#### Scenario: Existing user has saved cards or Dashes
- **WHEN** the personal home renders for an existing user
- **THEN** existing saved content and advanced controls SHALL remain available and unchanged in data semantics

### Requirement: Destructive reset remains settings-scoped
The import-first home SHALL NOT promote device reset as a primary home action.

#### Scenario: User needs a clean local state
- **WHEN** the user opens Storage/Vault settings
- **THEN** the existing F38 Reset this device workflow remains the canonical reset path

### Requirement: Home entry is localized and responsive
The entry surface SHALL provide RU/EN copy and remain usable at narrow mobile widths.

#### Scenario: Russian locale
- **WHEN** the page locale resolves to Russian
- **THEN** primary home explanation and action labels SHALL render in Russian

#### Scenario: Narrow viewport
- **WHEN** the personal root is rendered at 390 CSS pixels wide
- **THEN** the home entry controls SHALL not cause horizontal page overflow