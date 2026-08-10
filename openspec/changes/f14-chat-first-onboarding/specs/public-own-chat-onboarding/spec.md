## MODIFIED Requirements

### Requirement: First value comes from the visitor's own chat

The empty welcome view MUST make the visitor's current AI conversation the primary source of the first Result and MUST NOT depend on automated retrieval of a public ChatGPT share page.

#### Scenario: Clean device or private browser
- **GIVEN** the visitor opens the personal DashGPT root with no saved Results
- **WHEN** the welcome view renders
- **THEN** no publisher/demo Results MUST be shown or written to the local Vault
- **AND** the primary action MUST instruct the visitor to prepare the current ChatGPT conversation for DashGPT
- **AND** the primary welcome flow MUST NOT call `/api/shared-chat` or fetch `chatgpt.com`.

#### Scenario: Visitor prepares a Result in ChatGPT
- **GIVEN** the visitor is in the original ChatGPT conversation they want to save
- **WHEN** they use the DashGPT onboarding command
- **THEN** the command MUST request a concise structured Result envelope containing title, summary, category, tags, decisions, and next action
- **AND** it MUST request the useful outcome rather than the raw transcript.

#### Scenario: Valid Result envelope is pasted into DashGPT
- **GIVEN** the visitor pastes a valid portable DashGPT Result envelope
- **WHEN** DashGPT parses it
- **THEN** DashGPT MUST show the title and summary for review
- **AND** saving MUST create exactly one visitor-owned local Result
- **AND** provenance MUST indicate a ChatGPT handoff rather than a scraped public URL.

#### Scenario: Invalid pasted content
- **WHEN** the visitor pastes content that cannot be interpreted as a DashGPT Result envelope
- **THEN** DashGPT MUST keep the welcome view usable
- **AND** MUST show a short human-facing correction message
- **AND** MUST NOT expose parser, transport, HTTP, or infrastructure errors.

#### Scenario: Public-share compatibility remains available
- **GIVEN** an integration explicitly calls the supported shared-chat compatibility endpoint
- **WHEN** that endpoint is used outside the primary welcome flow
- **THEN** existing security boundaries and response compatibility MUST remain intact.
