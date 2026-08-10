## MODIFIED Requirements

### Requirement: First value comes from the visitor's own chat

The empty welcome view MUST make sharing the visitor's own AI chat the primary fallback action for users who are not capturing directly from the DashGPT plugin.

#### Scenario: Valid ChatGPT public share URL with rendered DOM available
- **GIVEN** the visitor submits a supported public ChatGPT share URL
- **AND** rendered DOM extraction is available
- **WHEN** DashGPT reads the share
- **THEN** DashGPT MUST use the rendered conversation without first issuing a raw server-to-server request to ChatGPT
- **AND** the onboarding MUST present the resulting title and summary for review.

#### Scenario: Rendered extraction unavailable or fails
- **GIVEN** the rendered extraction path is unavailable or cannot read the conversation
- **WHEN** DashGPT imports a supported public ChatGPT share URL
- **THEN** DashGPT MAY attempt compatible fallback retrieval methods
- **AND** success MUST preserve the existing shared-chat response contract.

#### Scenario: All retrieval methods fail
- **WHEN** a supported public ChatGPT share cannot be read by any supported method
- **THEN** the onboarding MUST show a stable user-facing explanation
- **AND** MUST NOT expose upstream HTTP status codes, anti-bot details, parser implementation names, or raw transport errors.
