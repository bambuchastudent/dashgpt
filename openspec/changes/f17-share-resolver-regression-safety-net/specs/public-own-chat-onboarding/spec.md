## MODIFIED Requirements

### Requirement: Anonymous Share import MUST have regression coverage across parser, UX, and production

The anonymous public ChatGPT Share flow MUST be protected by deterministic contract tests and recurring live production checks.

#### Scenario: Current public backend JSON changes within supported shapes
- **WHEN** the resolver receives a supported current ChatGPT public Share JSON mapping
- **THEN** deterministic tests MUST verify current-branch ordering, hidden/system exclusion, useful text extraction, and fallback title behavior.

#### Scenario: Clean browser Share onboarding
- **WHEN** a clean visitor opens the personal welcome and uses the Share fallback or `?share=` handoff
- **THEN** browser tests MUST verify the visitor can preview and save only their own Result
- **AND** publisher Results MUST remain absent.

#### Scenario: Upstream or deployment regression
- **WHEN** production can no longer resolve known public ChatGPT Share fixtures
- **THEN** a recurring live smoke workflow MUST fail
- **AND** the workflow MUST retry a bounded number of transient failures before declaring the regression
- **AND** success MUST be independent of the specific resolver provider used.

#### Scenario: Resolver implementation refactor
- **WHEN** resolver fallback order or parser internals change
- **THEN** the normal PR verification MUST still assert the stable `/api/shared-chat` response contract and the stable user-facing error boundary.
