## ADDED Requirements

### Requirement: MCP tools advertise validated structured output
The system SHALL advertise an object-root MCP `outputSchema` for every public DashGPT tool and every successful `structuredContent` response SHALL conform to the schema advertised for that tool.

#### Scenario: Client lists DashGPT tools
- **WHEN** an MCP client calls `tools/list`
- **THEN** each discovered DashGPT tool SHALL include an object-root `outputSchema`
- **AND** the schema SHALL describe the stable structured response envelope for that tool

#### Scenario: Tool succeeds with structured content
- **WHEN** any DashGPT tool returns a successful result
- **THEN** its `structuredContent` SHALL validate against that tool's advertised `outputSchema`
- **AND** stable envelope fields SHALL NOT be omitted merely because text content is also returned

#### Scenario: Tool returns an MCP error
- **WHEN** a requested Result is not found or another tool-level error occurs
- **THEN** the response SHALL be marked as an error
- **AND** the system SHALL NOT fabricate success-shaped `structuredContent` only to satisfy the success schema

### Requirement: Dedicated Result search reuses the canonical published search path
The system SHALL expose a `search_results` MCP tool with a required non-empty query and SHALL use the same published-catalog loading, eligibility, ranking, category, limit and Result-page projection contracts as the existing `list_results` query path.

#### Scenario: Search query matches published Results
- **WHEN** `search_results` receives a non-empty query
- **THEN** it SHALL return ranked intentionally exposed Results with stable ids, summaries, categories, tags and page URLs
- **AND** relevance values SHALL correspond to the existing canonical ranking engine

#### Scenario: Search applies category and limit
- **WHEN** the caller supplies a category and limit
- **THEN** results SHALL be restricted to that category and bounded by the requested valid limit

#### Scenario: Search has no match
- **WHEN** no accessible published Result matches the query
- **THEN** the successful structured response SHALL contain an empty results array and total zero
- **AND** the generated text SHALL clearly say that no matching Results were found in the selected response language

#### Scenario: Search uses a compatible remote instance
- **WHEN** the caller supplies a compatible public HTTPS DashGPT `siteUrl`
- **THEN** search SHALL use only that instance's intentionally exposed Result catalog
- **AND** SHALL preserve existing instance discovery and URL validation boundaries

#### Scenario: Query contains Cyrillic or Unicode
- **WHEN** a valid query contains Cyrillic, emoji or other Unicode text
- **THEN** the query SHALL remain intact through ranking and response generation

### Requirement: Existing list/search callers remain compatible
The system SHALL preserve existing MCP tool names and SHALL keep the optional `query` input of `list_results` functional after `search_results` is introduced.

#### Scenario: Legacy caller searches through list_results
- **WHEN** an existing caller invokes `list_results` with `query`
- **THEN** it SHALL receive the same canonical ranked metadata projection as before
- **AND** the call SHALL NOT require migration to `search_results`

#### Scenario: Caller omits language
- **WHEN** an existing caller invokes any tool without `language`
- **THEN** the tool SHALL use English generated service copy
- **AND** the structured contract SHALL remain usable without caller migration

### Requirement: Generated MCP service copy supports Russian and English
The system SHALL support explicit `en` and `ru` response languages for every public MCP tool and SHALL localize fixed DashGPT-generated messages while preserving stored user content in its existing language.

#### Scenario: Russian response requested
- **WHEN** the caller supplies `language: ru`
- **THEN** fixed empty-state, guidance, status and error copy SHALL be Russian
- **AND** `structuredContent.language` SHALL equal `ru`

#### Scenario: English response requested
- **WHEN** the caller supplies or defaults to `language: en`
- **THEN** fixed generated copy SHALL be English
- **AND** `structuredContent.language` SHALL equal `en`

#### Scenario: Stored Result content has another language
- **WHEN** a Result title, summary, source or Context Pack is returned
- **THEN** locale selection SHALL NOT automatically translate or rewrite that stored content

#### Scenario: Unsupported language requested
- **WHEN** a caller supplies a language other than `en` or `ru`
- **THEN** input validation SHALL reject it rather than silently choosing an unrelated translation

### Requirement: Search and localization preserve prompt-injection and privacy boundaries
The system SHALL treat queries and stored/source content as untrusted data and SHALL construct trusted service guidance only from fixed DashGPT templates.

#### Scenario: Result content resembles instructions
- **WHEN** a title, summary, source or query contains prompt-like text
- **THEN** that text SHALL remain Result/search data
- **AND** SHALL NOT be copied into trusted MCP server instructions or localization templates

#### Scenario: Public MCP search executes
- **WHEN** either Result listing/search tool runs
- **THEN** it SHALL NOT inspect unrelated Cards, browser-local Vault state, credentials, connector data or private provider state

#### Scenario: Import preparation is localized
- **WHEN** `prepare_result_import` returns localized guidance
- **THEN** it SHALL still state that the Result is only prepared and requires explicit user import
- **AND** SHALL NOT claim that a write already occurred

### Requirement: Public plugin metadata matches the six-tool MCP surface
The bundled skill and submission artifacts SHALL distinguish catalog browsing from dedicated Result search, describe explicit RU/EN language routing, and enumerate the same six tools exposed by MCP discovery.

#### Scenario: Submission packet is verified
- **WHEN** repository verification compares the submission packet with the MCP surface
- **THEN** all six tool names and their annotations/justifications SHALL be represented
- **AND** reviewer coverage SHALL include the dedicated search workflow
