## MODIFIED Requirements

### Requirement: First value comes from the visitor's own chat

The empty welcome view MUST make sharing the visitor's own AI chat the primary action, and supported public ChatGPT share URLs MUST remain importable when direct server retrieval is blocked but a configured browser-rendering fallback can read the public page.

#### Scenario: Direct public share retrieval succeeds
- **GIVEN** the visitor submits a supported public ChatGPT share URL
- **WHEN** the direct server request returns readable share HTML
- **THEN** DashGPT parses it and presents a human-readable title and summary for review
- **AND** no browser fallback is used.

#### Scenario: Direct retrieval is blocked with 403
- **GIVEN** the visitor submits a valid public ChatGPT share URL
- **AND** the direct server request is rejected with HTTP 403
- **WHEN** Cloudflare Browser Run can load the public page
- **THEN** DashGPT parses the browser-rendered HTML
- **AND** presents the same review/save flow instead of surfacing the direct 403.

#### Scenario: Both retrieval methods fail
- **WHEN** neither direct retrieval nor the browser fallback can provide a readable public share page
- **THEN** the welcome screen explains that the shared conversation could not be read
- **AND** no Result is created.

### Requirement: Shared-chat retrieval remains tightly scoped

DashGPT MUST NOT turn the browser fallback into an arbitrary web-fetch proxy.

#### Scenario: Unsupported host or path
- **WHEN** `/api/shared-chat` receives a URL outside the supported public ChatGPT share hosts/path shapes
- **THEN** the request is rejected before direct or browser retrieval occurs.
