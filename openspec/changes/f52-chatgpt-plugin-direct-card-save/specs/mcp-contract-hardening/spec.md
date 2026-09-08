## ADDED Requirements

### Requirement: Explicit direct Card save tool
The system SHALL expose a write-capable MCP tool that accepts a structured canonical Card payload distilled from the current AI conversation and persists it only after explicit user intent to save.

#### Scenario: Create a Card from current conversation
- **GIVEN** the user explicitly asks ChatGPT to save the useful outcome to DashGPT
- **AND** the caller supplies a valid structured Card payload
- **WHEN** the direct-save tool is invoked with valid DashGPT write authorization
- **THEN** DashGPT SHALL persist one canonical Card using the existing Card/Vault persistence boundary
- **AND** SHALL return a truthful created, updated, or not-persisted result
- **AND** SHALL NOT claim that a browser import still needs to be completed when persistence succeeded

#### Scenario: Update instead of duplicate
- **GIVEN** a valid stable card/source identity matches an existing Card under current DashGPT identity rules
- **WHEN** the direct-save tool is invoked again
- **THEN** DashGPT SHALL update the canonical Card rather than create a parallel duplicate
- **AND** SHALL preserve source and provenance semantics

### Requirement: Accurate write metadata
The direct-save tool SHALL advertise metadata consistent with modifying user-controlled DashGPT state and SHALL NOT describe itself as read-only.

#### Scenario: Client lists the direct-save tool
- **WHEN** an MCP client calls `tools/list`
- **THEN** the direct-save tool SHALL advertise write-capable annotations consistent with its actual behavior
- **AND** submission metadata SHALL NOT describe the tool as read-only

### Requirement: DashGPT authorization stays separate from ChatGPT access
The direct-save flow SHALL use DashGPT-controlled authorization and SHALL NOT use ChatGPT account authentication material as DashGPT storage authorization.

#### Scenario: Caller lacks valid DashGPT write authorization
- **WHEN** a caller invokes direct save without valid DashGPT write authorization
- **THEN** DashGPT SHALL return a truthful not-persisted result
- **AND** SHALL NOT attempt to derive write access from ChatGPT account state

### Requirement: Share is provenance, not retrieval dependency
When a valid ChatGPT Share URL is available from caller context, DashGPT MAY preserve it as Card provenance. Direct Card persistence SHALL NOT require DashGPT to re-fetch that Share URL from `chatgpt.com`.

#### Scenario: Save includes a Share URL
- **GIVEN** the current conversation context includes a valid ChatGPT Share URL
- **WHEN** the direct-save tool persists the Card
- **THEN** DashGPT MAY store the canonical Share URL as source provenance
- **AND** SHALL NOT require a successful server-side fetch of that Share URL before saving

### Requirement: Supported-surface claims stay accurate
Plugin, submission, and user-facing setup materials SHALL distinguish public Plugin Directory distribution from custom developer-mode MCP and SHALL describe only invocation surfaces verified by current OpenAI documentation and project testing.

#### Scenario: Setup guidance is published
- **WHEN** DashGPT documents custom MCP setup or plugin installation
- **THEN** the guidance SHALL state only verified invocation surfaces
- **AND** SHALL NOT imply that setup on one client automatically enables invocation on another client without verification
