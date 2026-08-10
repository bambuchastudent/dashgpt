## MODIFIED Requirements

### Requirement: First value comes from the visitor's own chat

The empty welcome view MUST make sharing the visitor's own AI chat the primary action and MUST import a public ChatGPT share when the conversation is readable either from its embedded payload or from the rendered visible DOM.

#### Scenario: Direct fetch is blocked but rendered conversation is visible
- **GIVEN** the visitor submits a valid public `https://chatgpt.com/share/...` URL
- **AND** ChatGPT returns HTTP 403 to the Worker's direct fetch
- **WHEN** Cloudflare Browser Run renders the public share page
- **AND** visible message elements expose user/assistant roles and text
- **THEN** DashGPT extracts those visible turns
- **AND** returns them in the same shared-chat response shape used by onboarding
- **AND** the visitor can review and save the first card.

#### Scenario: Browser page is a challenge or contains no readable turns
- **GIVEN** direct retrieval fails
- **WHEN** Browser Run does not expose any readable conversation turns
- **THEN** DashGPT reports that the public share could not be read
- **AND** no Result is created.

### Requirement: Shared-chat ingestion does not depend solely on undocumented hydration payloads

DashGPT MUST NOT require ChatGPT's React Flight or legacy `__NEXT_DATA__` payload to be present when the rendered public page already contains the readable conversation.

#### Scenario: Hydration parser fails after successful render
- **WHEN** the Browser Run page renders readable message elements but embedded-payload parsing fails
- **THEN** visible DOM extraction is used as the fallback source of truth for message text and roles.
