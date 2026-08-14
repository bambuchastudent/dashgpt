## ADDED Requirements

### Requirement: Public shell explains DashGPT in one plain-language sentence
The system SHALL show a complete one-sentence product explanation in the public DashGPT header that describes DashGPT as personal AI memory, explains that useful parts of AI conversations become connected cards, and communicates that those cards can be found, combined and continued later with context preserved.

#### Scenario: First-time visitor opens DashGPT
- **WHEN** a visitor opens `/demo/`
- **THEN** the visible header explains what DashGPT does without requiring knowledge of Vault, storage, MCP, Results or implementation terminology

### Requirement: Public description remains consistent across visible and preview surfaces
The system SHALL use the same canonical product explanation for the visible public subtitle, meta description, Open Graph description, Twitter/X description and web-app manifest description.

#### Scenario: Product message is inspected across surfaces
- **WHEN** the public document and manifest metadata are read
- **THEN** their description text matches the visible one-sentence product explanation

### Requirement: Clear product explanation is regression-tested
The system SHALL include deterministic and browser regression coverage for the canonical public product explanation.

#### Scenario: Repository verification runs
- **WHEN** focused or full verification runs
- **THEN** removal or drift of the visible one-sentence explanation or its public metadata fails verification
