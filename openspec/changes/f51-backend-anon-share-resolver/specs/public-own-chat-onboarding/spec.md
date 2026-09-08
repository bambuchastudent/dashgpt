## MODIFIED Requirements

### Requirement: Anonymous public Share resolves current logged-out ChatGPT representation

DashGPT MUST resolve a genuinely public ChatGPT Share using the current logged-out public representation when available, without requiring authentication and without relying on Browser Run to bypass bot protection.

#### Scenario: Current anonymous Share JSON is available
- **GIVEN** a visitor submits a validated public `https://chatgpt.com/share/<id>` URL
- **WHEN** `https://chatgpt.com/backend-anon/share/<id>` returns a readable public conversation JSON payload
- **THEN** DashGPT MUST project it into the existing shared-chat contract
- **AND** MUST preserve canonical source URL and Share id
- **AND** MUST return the visible user/assistant branch for review as a Card.

#### Scenario: Anonymous JSON follows the displayed branch
- **GIVEN** the JSON contains `mapping` and `current_node`
- **WHEN** DashGPT creates the shared-chat response
- **THEN** it MUST follow `current_node` parent ancestry
- **AND** MUST NOT combine unrelated regenerated sibling branches
- **AND** MUST omit system, tool and visually hidden turns.

#### Scenario: Anonymous JSON is blocked or malformed
- **WHEN** the anonymous JSON path returns a challenge/HTML body, non-success HTTP response, malformed JSON or no readable turns
- **THEN** DashGPT MUST continue through the existing resolver compatibility paths
- **AND** MUST NOT expose internal route/provider/status/parser details to the visitor.

#### Scenario: No authenticated bypass
- **WHEN** public Share retrieval fails
- **THEN** DashGPT MUST NOT request or reuse ChatGPT login cookies, session tokens, passwords or account credentials
- **AND** MUST retain the existing human recovery state after all public paths are exhausted.

#### Scenario: Real public acceptance
- **WHEN** F51 is considered merge-ready
- **THEN** the production preview MUST successfully resolve the public reproduction known to open in an incognito/logged-out browser
- **AND** deterministic and browser regression gates MUST remain green.
