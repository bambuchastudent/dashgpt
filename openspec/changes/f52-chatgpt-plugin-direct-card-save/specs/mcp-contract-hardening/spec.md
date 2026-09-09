## ADDED Requirements

### Requirement: Explicit direct Card save tool
The system SHALL expose a write-capable MCP tool named `upsert_card` that accepts a structured canonical Card payload distilled from the current AI conversation and persists it only after explicit user intent to save.

#### Scenario: Create a Card from current conversation
- **GIVEN** the user explicitly asks ChatGPT to save the useful outcome to DashGPT
- **AND** the caller supplies a valid structured Card payload
- **WHEN** `upsert_card` is invoked with valid DashGPT write authorization
- **THEN** DashGPT SHALL persist one canonical Card using the existing Card/Vault persistence boundary
- **AND** SHALL return a truthful `created` or `updated` result
- **AND** SHALL NOT claim that a browser import still needs to be completed when persistence succeeded

#### Scenario: Update instead of duplicate
- **GIVEN** a valid stable card/source identity matches an existing Card under current DashGPT identity rules
- **WHEN** `upsert_card` is invoked again
- **THEN** DashGPT SHALL reuse the canonical Card identity and increment the content version rather than create a parallel duplicate
- **AND** SHALL preserve source and provenance semantics

### Requirement: Direct plugin writes use MCP OAuth
The direct-save tool SHALL require a DashGPT OAuth grant scoped to private Card writes and SHALL expose the MCP authorization discovery/challenge metadata required for ChatGPT to link the user.

#### Scenario: Client lists the direct-save tool
- **WHEN** an MCP client calls `tools/list`
- **THEN** `upsert_card` SHALL declare an OAuth2 security scheme with the bounded Card-write scope
- **AND** SHALL advertise write-capable annotations consistent with its actual behavior

#### Scenario: Caller is not linked
- **WHEN** `upsert_card` is invoked without a valid Card-write grant
- **THEN** DashGPT SHALL NOT persist the Card
- **AND** SHALL return an MCP authentication challenge that points to the protected-resource metadata
- **AND** SHALL NOT attempt to derive write access from ChatGPT account state

#### Scenario: Caller grant is invalid for this resource
- **WHEN** the supplied grant is expired, lacks the Card-write scope, or is not minted for the current DashGPT MCP resource
- **THEN** DashGPT SHALL reject the write
- **AND** SHALL return a reauthorization challenge rather than mutating the Vault

### Requirement: OAuth authorization codes are single-use
The authorization-code flow SHALL use PKCE S256 and SHALL ensure each authorization code can be redeemed at most once.

#### Scenario: Valid authorization code is redeemed
- **GIVEN** a pending OAuth transaction completed Google authorization successfully
- **WHEN** the client exchanges its authorization code with the matching PKCE verifier, client identity, redirect URI and resource
- **THEN** DashGPT SHALL atomically consume the authorization code
- **AND** SHALL issue one short-lived Card-write bearer grant

#### Scenario: Authorization code is replayed
- **GIVEN** an authorization code has already been redeemed
- **WHEN** the same or another caller attempts to redeem it again
- **THEN** DashGPT SHALL reject the exchange as an invalid grant
- **AND** SHALL NOT issue another bearer grant

### Requirement: OAuth state remains ephemeral infrastructure
Pending authorization requests and one-time authorization codes MAY be stored in ephemeral server-side authorization state, but that state SHALL NOT contain or become canonical user memory.

#### Scenario: OAuth state is stored
- **WHEN** DashGPT stores a pending authorization transaction or one-time authorization code
- **THEN** the record SHALL be bounded by a short expiry
- **AND** SHALL contain only authorization transaction/provider data needed to complete the OAuth exchange
- **AND** SHALL NOT contain conversation text, Card payloads, Vault JSON, Dash definitions or Search state

### Requirement: Google Drive is the first direct-write Vault provider
The first `upsert_card` persistence implementation SHALL write to the user's Google Drive-backed DashGPT Vault using the existing `drive.file` access boundary and existing DashGPT folder/file conventions.

#### Scenario: Existing Drive Vault
- **GIVEN** the linked user already has a valid DashGPT Vault file in Google Drive
- **WHEN** `upsert_card` is authorized and invoked
- **THEN** DashGPT SHALL load and validate that Vault
- **AND** SHALL apply the canonical Card upsert
- **AND** SHALL write the resulting Vault back to the same user-owned Drive file

#### Scenario: First Drive Card
- **GIVEN** the linked user's Drive does not yet contain a DashGPT Vault
- **WHEN** `upsert_card` is authorized and invoked
- **THEN** DashGPT SHALL create the standard DashGPT folder/Vault using existing provider conventions
- **AND** SHALL persist the new canonical Card there

### Requirement: OAuth authorization does not become hosted memory
The OAuth bridge SHALL be authorization infrastructure only. Canonical Card and Vault content SHALL remain in user-controlled DashGPT storage and SHALL NOT be persisted in a DashGPT-hosted Card database by this change.

#### Scenario: Authorization completes
- **WHEN** a user grants the bounded Google Drive permission needed by the plugin
- **THEN** DashGPT MAY issue a short-lived authorization grant for the MCP write tool
- **AND** SHALL NOT store conversation/Card content as part of the authorization state
- **AND** SHALL NOT serialize provider authorization into canonical Card/Vault content or tool output

### Requirement: Share is provenance, not retrieval dependency
When a valid ChatGPT Share URL is available from caller context, DashGPT MAY preserve it as Card provenance. Direct Card persistence SHALL NOT require DashGPT to re-fetch that Share URL from `chatgpt.com`.

#### Scenario: Save includes a Share URL
- **GIVEN** the current conversation context includes a valid ChatGPT Share URL
- **WHEN** `upsert_card` persists the Card
- **THEN** DashGPT SHALL canonicalize and MAY store the Share URL as source provenance
- **AND** SHALL NOT require a successful server-side fetch of that Share URL before saving

### Requirement: Supported-surface claims stay accurate
Plugin, submission, and user-facing setup materials SHALL distinguish public Plugin Directory distribution from custom developer-mode MCP and SHALL describe only invocation surfaces verified by current OpenAI documentation and project testing.

#### Scenario: Setup guidance is published
- **WHEN** DashGPT documents custom MCP setup or plugin installation
- **THEN** the guidance SHALL state only verified invocation surfaces
- **AND** SHALL NOT imply that setup on one client automatically enables invocation on another client without verification
