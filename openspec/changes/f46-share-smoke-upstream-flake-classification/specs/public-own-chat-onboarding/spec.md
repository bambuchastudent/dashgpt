## MODIFIED Requirements

### Requirement: Anonymous Share import MUST have regression coverage across parser, UX, and production

The anonymous public ChatGPT Share flow MUST be protected by deterministic contract tests and recurring live production checks whose failure semantics distinguish product contract regressions from transient external upstream unreadability.

#### Scenario: Current public backend JSON changes within supported shapes
- **WHEN** the resolver receives a supported current ChatGPT public Share JSON mapping
- **THEN** deterministic tests MUST verify current-branch ordering, hidden/system exclusion, useful text extraction, and fallback title behavior.

#### Scenario: Clean browser Share onboarding
- **WHEN** a clean visitor opens the personal welcome and uses the Share fallback or `?share=` handoff
- **THEN** browser tests MUST verify the visitor can preview and save only their own Result
- **AND** publisher Results MUST remain absent.

#### Scenario: Scheduled smoke encounters transient public upstream unreadability
- **WHEN** a recurring scheduled live smoke exhausts bounded retries for one or more known fixtures
- **AND** the final failures are only network timeout/transport unavailability or the stable `SHARED_CHAT_UNREADABLE` upstream boundary
- **THEN** the workflow MUST record visible warning diagnostics for every affected fixture
- **AND** MUST evaluate all configured fixtures before final classification
- **AND** MUST NOT fail the scheduled workflow solely for those upstream-only failures.

#### Scenario: Strict smoke encounters unresolved public upstream unreadability
- **WHEN** a push-triggered or manually dispatched live smoke exhausts bounded retries for a known fixture with upstream-only unreadability
- **THEN** the workflow MUST evaluate all configured fixtures
- **AND** MUST fail after classification so maintainers retain a strict regression/release signal.

#### Scenario: Production smoke observes an unexpected contract failure
- **WHEN** any live smoke receives HTTP 200 with an invalid normalized conversation contract, an unexpected HTTP status, or an unexpected error payload
- **THEN** the workflow MUST fail regardless of trigger type
- **AND** MUST preserve diagnostics that identify the affected fixture without exposing credentials.

#### Scenario: Resolver implementation refactor
- **WHEN** resolver fallback order or parser internals change
- **THEN** the normal PR verification MUST still assert the stable `/api/shared-chat` response contract and the stable user-facing error boundary.
