## MODIFIED Requirements

### Requirement: Anonymous public Share resolves current ChatGPT share format

The anonymous public-share fallback MUST support freshly-created public ChatGPT Share URLs using the current public share representation without depending on one specific undocumented payload shape. When the current page contains a readable React Router 7 turbo-stream conversation payload, DashGPT MUST be able to parse it into the existing shared-chat contract while preserving the established backend, reader, proxy, Browser and direct compatibility paths.

#### Scenario: Current React Router turbo-stream Share page is readable
- **GIVEN** a visitor submits a valid public `https://chatgpt.com/share/<id>` URL
- **AND** the retrieved Share HTML contains the conversation in `window.__reactRouterContext.streamController.enqueue(...)` graph data
- **WHEN** older/backend-compatible parsing does not produce a readable conversation
- **THEN** DashGPT MUST resolve the graph-encoded payload without executing page JavaScript
- **AND** MUST convert its visible user/assistant turns into the existing shared-chat response contract
- **AND** MUST preserve the canonical Share URL/id semantics used by capture provenance.

#### Scenario: Turbo-stream conversation contains ordered linear turns
- **GIVEN** the resolved payload exposes `linear_conversation`
- **WHEN** DashGPT prepares the shared-chat response
- **THEN** it MUST preserve that visible user/assistant order
- **AND** MUST exclude system/tool or visually hidden messages.

#### Scenario: Turbo-stream conversation contains a mapping tree
- **GIVEN** the resolved payload exposes `mapping` and `current_node`
- **WHEN** DashGPT prepares the shared-chat response
- **THEN** it MUST follow the active current-node ancestry rather than merging regenerated sibling branches
- **AND** SHOULD retain the existing deepest/newest fallback when `current_node` is unavailable.

#### Scenario: Turbo-stream payload is malformed or contains no conversation
- **WHEN** an enqueue chunk cannot be safely decoded, is not a supported graph array, or resolves without a readable conversation
- **THEN** DashGPT MUST ignore that candidate and continue through the existing compatibility/fallback chain
- **AND** MUST NOT execute arbitrary page script or expose parser internals to the visitor.

#### Scenario: Existing resolver paths still work
- **WHEN** the public Share can already be read through the existing backend JSON, reader text, proxy HTML, visible DOM, direct HTML or Browser HTML paths
- **THEN** the existing shared-chat behavior and response fields MUST remain compatible
- **AND** the new turbo-stream parser MUST NOT require credentials, authenticated ChatGPT state or a new storage/data contract.
