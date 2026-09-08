## MODIFIED Requirements

### Requirement: Anonymous public Share resolves current logged-out ChatGPT representation

DashGPT MUST resolve a genuinely public ChatGPT Share using current logged-out public representations when available, without requiring user authentication and without using Browser Run as an access-control or anti-bot bypass.

#### Scenario: Current anonymous Share JSON is directly available
- **GIVEN** a visitor submits a validated public `https://chatgpt.com/share/<id>` URL
- **WHEN** `https://chatgpt.com/backend-anon/share/<id>` directly returns a readable public conversation JSON payload
- **THEN** DashGPT MUST project it into the existing shared-chat contract
- **AND** MUST preserve canonical source URL and Share id
- **AND** MUST return the visible user/assistant branch for review as a Card.

#### Scenario: Public JSON requires fresh logged-out page context
- **GIVEN** the direct anonymous JSON attempt and all existing compatibility resolver paths are unreadable
- **AND** the existing endpoint result is exactly `SHARED_CHAT_UNREADABLE`
- **AND** the submitted URL is an ordinary validated public `/share/<id>` URL
- **AND** the Browser binding is available
- **WHEN** DashGPT performs its final public recovery attempt
- **THEN** it MAY launch one fresh logged-out browser session
- **AND** MUST first navigate that session to the canonical public Share page
- **AND** MUST request the corresponding same-origin `backend-anon/share/<id>` from that same session
- **AND** any cookies/state sent by that request MUST have been created inside that fresh anonymous session rather than copied from the visitor.

#### Scenario: Browser-context anonymous JSON succeeds
- **WHEN** the fresh browser-session request returns readable public conversation JSON
- **THEN** DashGPT MUST project it through the same existing public-share JSON contract
- **AND** MUST identify the retrieval as a successful public recovery path
- **AND** MUST close the browser session.

#### Scenario: Anonymous JSON follows the displayed branch
- **GIVEN** public-share JSON contains `mapping` and `current_node`
- **WHEN** DashGPT creates the shared-chat response
- **THEN** it MUST follow `current_node` parent ancestry
- **AND** MUST NOT combine unrelated regenerated sibling branches
- **AND** MUST omit system, tool and visually hidden turns.

#### Scenario: Existing resolver succeeds before browser-session recovery
- **WHEN** the direct anonymous preflight or any existing Reader/proxy/Browser/direct compatibility path returns a valid conversation
- **THEN** DashGPT MUST return that result
- **AND** MUST NOT launch the additional fresh browser-session recovery.

#### Scenario: Browser recovery is blocked or malformed
- **WHEN** fresh-session navigation or its anonymous JSON request returns a challenge, non-success response, malformed JSON, no readable turns or another public retrieval failure
- **THEN** DashGPT MUST close the session
- **AND** MUST return the original existing human unreadable state for normal requests
- **AND** MUST NOT expose internal route/provider/status/parser details unless the caller explicitly requested sanitized diagnostics.

#### Scenario: Explicit mobile-safe diagnostics for unresolved public Share
- **GIVEN** an ordinary validated public Share still ends as `SHARED_CHAT_UNREADABLE`
- **WHEN** the caller explicitly requests `/api/shared-chat?...&diagnostics=1`
- **THEN** the failure response MUST include a compact diagnostic trace suitable for copying from a mobile browser
- **AND** the trace MUST identify resolver stages and sanitized outcomes such as success/miss, safe HTTP status, timeout/challenge/parser classification, Browser binding availability, browser navigation/session milestones, and a generated trace id
- **AND** the trace MUST NOT include raw upstream response bodies, transcript/message text, cookies, authorization headers, ChatGPT account/session identifiers, passwords, project credentials, DashGPT storage credentials or copied user browser state.

#### Scenario: Normal user error remains human
- **WHEN** the same unresolved Share is requested without `diagnostics=1`
- **THEN** DashGPT MUST preserve the existing human `SHARED_CHAT_UNREADABLE` response
- **AND** MUST NOT add provider/internal diagnostic detail to normal onboarding copy.

#### Scenario: No authenticated bypass or user-session replay
- **WHEN** public Share retrieval fails
- **THEN** DashGPT MUST NOT request, import, copy, persist or replay ChatGPT login cookies, authorization/session tokens, passwords, account identifiers or project credentials from the visitor
- **AND** MUST NOT solve CAPTCHA/Turnstile or join restricted projects
- **AND** MUST retain the existing human recovery state after all public paths are exhausted.

#### Scenario: Bounded browser usage
- **WHEN** the final public recovery path is eligible
- **THEN** DashGPT MUST make at most one fresh browser-session recovery attempt per `/api/shared-chat` invocation
- **AND** MUST use bounded navigation/request timeouts
- **AND** MUST close the browser on success or failure.

#### Scenario: Real public acceptance
- **WHEN** F51 is considered merge-ready
- **THEN** the production preview MUST successfully resolve the exact public reproduction known to open in an incognito/logged-out browser
- **AND** deterministic, desktop, mobile and canonical full regression gates MUST remain green.
