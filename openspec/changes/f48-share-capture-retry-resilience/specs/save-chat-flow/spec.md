## MODIFIED Requirements

### Requirement: Unsupported or unreadable links are human product states
The system SHALL translate unsupported/private ChatGPT URLs and shared-chat retrieval failures into understandable recovery guidance and SHALL NOT expose raw backend, HTTP, proxy or parser implementation errors in the Save-chat UI. For a supported public Share URL, the interactive Save-chat path SHALL automatically retry bounded transient shared-chat unreadability before presenting the terminal fallback state.

#### Scenario: Private ChatGPT conversation URL is pasted
- **WHEN** the user submits a `chatgpt.com/c/...` conversation URL
- **THEN** DashGPT SHALL explain that a public ChatGPT Share link is required
- **AND** SHALL tell the user to use ChatGPT Share and paste the resulting link
- **AND** SHALL NOT attempt to store credentials or authenticated page content

#### Scenario: Public Share is transiently unreadable and then resolves
- **WHEN** the user submits a supported public Share URL
- **AND** the canonical shared-chat endpoint first reports transient unreadability or a transient request transport failure
- **AND** a later attempt within the bounded retry budget returns a readable conversation
- **THEN** DashGPT SHALL continue automatically without requiring another user submit action
- **AND** SHALL show human-readable retry progress while waiting
- **AND** SHALL populate the normal review state after recovery
- **AND** SHALL preserve the canonical Share URL as source provenance

#### Scenario: Public Share remains unreadable after bounded retries
- **WHEN** the supported public Share URL remains transiently unreadable through the retry budget
- **THEN** DashGPT SHALL show a concise retry/fallback message
- **AND** SHALL keep the structured handoff fallback available
- **AND** SHALL NOT expose raw HTTP status, resolver, proxy, parser, or `SHARED_CHAT_UNREADABLE` implementation details
- **AND** SHALL NOT create a card

#### Scenario: Resolver returns an unexpected hard failure
- **WHEN** the shared-chat endpoint returns a failure outside the transient retry classification
- **THEN** DashGPT SHALL stop retrying rather than masking the unexpected contract failure behind repeated requests
- **AND** SHALL still present the user with human product recovery guidance
- **AND** SHALL NOT create a card
