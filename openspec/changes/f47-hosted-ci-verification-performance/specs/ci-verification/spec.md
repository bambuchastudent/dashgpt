## ADDED Requirements

### Requirement: Hosted canonical verification MUST preserve full healthy-run coverage within a sub-10-minute CI feedback budget

DashGPT pull-request and `develop` verification MUST preserve deterministic and browser coverage while using bounded hosted-runner parallelism, explicit browser-state isolation and fail-fast diagnostics so the hosted verification critical path remains below 10 minutes of execution.

#### Scenario: Hosted verification runs
- **WHEN** the repository-owner pull-request or `develop` push check executes on GitHub-hosted Ubuntu
- **THEN** the hosted gate MUST collectively retain all `npm run check` verification
- **AND** MUST execute both `desktop-chromium` and `mobile-chromium` Playwright projects
- **AND** MUST retain CI browser retries
- **AND** healthy runs MUST execute the complete deterministic and browser surface
- **AND** desktop/mobile browser jobs MUST run concurrently rather than serially
- **AND** no browser job MAY have an execution timeout greater than 9 minutes.

#### Scenario: Canonical full verification remains reproducible
- **WHEN** a maintainer needs one local/full repository gate
- **THEN** `npm run verify:full` MUST remain the canonical command covering deterministic checks plus both browser projects
- **AND** it MUST be run once on the final F47 implementation head before merge.

#### Scenario: Existing required check remains authoritative
- **WHEN** hosted verification is decomposed into deterministic and browser jobs
- **THEN** a final lightweight job named `check` MUST depend on all canonical shards
- **AND** MUST fail if any deterministic, desktop or mobile shard fails
- **AND** MUST preserve the existing required-check identity used by repository policy.

#### Scenario: Demo navigation becomes ready
- **WHEN** a browser test navigates to the local DashGPT demo
- **THEN** demo bootstrap MUST emit an explicit readiness signal after required initialization completes
- **AND** the browser fixture MUST wait for that signal with a small dedicated timeout no greater than 5 seconds in CI
- **AND** a missing readiness signal MUST fail quickly instead of consuming the 60-second general test timeout.

#### Scenario: Browser tests are isolated
- **WHEN** multiple Playwright tests execute concurrently
- **THEN** each test MUST use fresh browser-context state
- **AND** cookies, localStorage, sessionStorage and configured storage state MUST NOT leak from another test
- **AND** the browser suite MUST NOT rely on shared mutable filesystem or persistent browser-profile state for ordering.

#### Scenario: Browser navigation mutates persistent state
- **WHEN** a test action causes DashGPT to reload or replace the document after changing local state
- **THEN** the test MUST synchronize on the completed post-navigation document/readiness state
- **AND** storage seeding used by the test MUST NOT replay on that navigation and overwrite the behavior under test.

#### Scenario: Large local Vault starts without reconciliation work
- **WHEN** DashGPT starts from an already-durable local Vault and there are no published Results to reconcile into it
- **THEN** startup MUST NOT re-upsert every materialized Result and favorite into the same Vault
- **AND** MUST preserve the existing durable Results/events unchanged
- **AND** MUST still render storage status, summary and the complete local card set
- **AND** the 2200-card local stress fixture MUST reach the explicit readiness signal within the dedicated browser readiness budget under normal hosted execution.

#### Scenario: Published Results require reconciliation
- **WHEN** startup merges published Results with local durable state
- **THEN** merged durable state MUST continue to use the existing persistence behavior
- **AND** the large-Vault fast path MUST NOT skip writes required to preserve merged data semantics.

#### Scenario: Browser work is parallelized
- **WHEN** Playwright runs in hosted CI
- **THEN** desktop and mobile projects SHOULD execute in independent hosted jobs
- **AND** each browser job MUST use bounded worker scheduling
- **AND** `fullyParallel: true` MAY be enabled only with the isolation contract and regression coverage in this change.

#### Scenario: Systemic browser failure occurs
- **WHEN** multiple browser tests fail in one CI job
- **THEN** the job MUST stop after a small bounded maximum-failure count
- **AND** MUST retain enough failures to diagnose a systemic defect
- **AND** MUST NOT spend the full job budget repeating the same bootstrap failure.

#### Scenario: Hosted dependencies are installed
- **WHEN** the canonical GitHub-hosted jobs prepare Node dependencies
- **THEN** they MUST keep lifecycle scripts disabled for the existing install boundary
- **AND** SHOULD avoid audit/funding work that is not part of repository verification
- **AND** MUST NOT claim lockfile/`npm ci` reproducibility unless a committed lockfile exists.

#### Scenario: A future optimization proposes less healthy-run coverage
- **WHEN** a CI performance change would skip deterministic verifiers, remove a browser project, or disable retries
- **THEN** it MUST NOT be treated as an implementation of this requirement
- **AND** MUST require a separate explicit specification and coverage decision.
