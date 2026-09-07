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

#### Scenario: Maintainer requests literal hosted canonical proof
- **WHEN** the repository owner includes `[verify:full]` in a pull-request title
- **THEN** hosted CI MUST run one additional Ubuntu job that executes the literal `npm run verify:full` command on that pull-request head
- **AND** the final `check` aggregator MUST require that optional job to succeed while the marker is present
- **AND** pull requests without the marker MUST skip that duplicate full lane so normal feedback retains the optimized parallel critical path.

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

#### Scenario: Large gallery layout is stress-tested
- **WHEN** browser verification exercises the 2200-card gallery overview case
- **THEN** it MUST retain 2200 real card nodes and use the real gallery overview module in Chromium
- **AND** MUST assert the heat-map representation, complete card selection/order, bounded semantic palette and viewport overflow/layout behavior
- **AND** SHOULD run through an isolated same-origin component harness rather than unrelated full-application bootstrap and persistence paths
- **AND** MUST NOT reduce the card count or replace the browser layout assertion with a pure unit-only check solely to improve CI runtime.

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
- **WHEN** a CI performance change would skip deterministic verifiers, remove a browser project, disable retries, reduce the 2200-card stress surface or otherwise reduce healthy-run coverage
- **THEN** it MUST NOT be treated as an implementation of this requirement
- **AND** MUST require a separate explicit specification and coverage decision.
