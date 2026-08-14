## ADDED Requirements

### Requirement: Save chat accepts ChatGPT Project shared-chat links
The system SHALL accept supported ChatGPT Project shared-chat URLs in the primary Save-chat field, SHALL resolve them through the canonical shared-chat capability, and SHALL preserve their canonical Project URL as source provenance when capture succeeds.

#### Scenario: Project shared-chat link is submitted
- **WHEN** the user submits a supported `chatgpt.com/g/<project-or-gpt-slug>/shared/c/<conversation-id>` URL
- **THEN** the Save-chat form SHALL accept it instead of showing the classic-Share-only validation error
- **AND** SHALL send its canonical Project shared-chat URL to the existing shared-chat endpoint
- **AND** if resolution succeeds SHALL preserve that canonical Project URL as the card source provenance

#### Scenario: Accepted Project link cannot be read anonymously
- **WHEN** a Project shared-chat link is syntactically supported but the shared-chat resolver cannot obtain readable content
- **THEN** DashGPT SHALL show an understandable retry/fallback state rather than claiming the URL format is invalid
- **AND** SHALL keep the existing structured handoff/import fallback available
- **AND** SHALL NOT create a card from unreadable content

#### Scenario: Classic Share capture remains compatible
- **WHEN** the user submits an existing `chatgpt.com/share/<id>` or supported legacy `/s/<id>` link
- **THEN** the existing link-first capture behavior SHALL remain unchanged
