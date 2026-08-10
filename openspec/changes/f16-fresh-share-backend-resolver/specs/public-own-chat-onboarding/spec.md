## MODIFIED Requirements

### Requirement: Anonymous public Share resolves current ChatGPT share format

The anonymous public-share fallback MUST support freshly-created public ChatGPT Share URLs using the current public share representation, without depending on the legacy HTML payload format.

#### Scenario: Fresh public Share JSON is available through resolver
- **GIVEN** a visitor submits a valid public `https://chatgpt.com/share/<id>` URL
- **WHEN** the current public share JSON can be read through the configured resolver boundary
- **THEN** DashGPT MUST convert its visible user/assistant conversation path into the existing shared-chat contract
- **AND** MUST return a reviewable conversation without waiting for cache warm-up or legacy HTML parsing.

#### Scenario: Current-node conversation branch
- **GIVEN** the public share mapping contains branches or regenerated responses
- **WHEN** `current_node` is present
- **THEN** DashGPT MUST follow that node's parent path and MUST NOT combine unrelated sibling branches.

#### Scenario: Backend resolver fails
- **WHEN** the current public share JSON path fails or is unreadable
- **THEN** DashGPT MUST continue through the existing page-reader, proxy, browser and direct compatibility paths
- **AND** MUST NOT expose provider names, HTTP status details or parser internals to the visitor.

#### Scenario: Live regression verification
- **WHEN** the resolver change is considered ready to merge
- **THEN** a live production smoke MUST successfully resolve at least two real public ChatGPT Share URLs
- **AND** one fixture MUST be a freshly-created link that previously reproduced `SHARED_CHAT_UNREADABLE`.
