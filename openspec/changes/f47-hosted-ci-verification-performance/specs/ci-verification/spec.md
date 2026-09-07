## ADDED Requirements

### Requirement: Hosted canonical verification MUST preserve full coverage within the CI job budget

DashGPT pull-request and `develop` verification MUST keep the canonical deterministic and browser coverage while using bounded hosted-runner parallelism so healthy branches complete within the configured CI timeout.

#### Scenario: Canonical hosted verification runs
- **WHEN** the repository-owner pull-request or `develop` push check executes on GitHub-hosted Ubuntu
- **THEN** it MUST invoke the canonical `npm run verify:full` command
- **AND** MUST retain all `npm run check` verification
- **AND** MUST execute both `desktop-chromium` and `mobile-chromium` Playwright projects
- **AND** MUST retain CI browser retries
- **AND** MUST complete inside the configured 30-minute job budget under normal hosted execution.

#### Scenario: Browser work is parallelized
- **WHEN** Playwright runs in CI
- **THEN** the configuration MUST permit bounded multi-worker scheduling instead of relying on an effectively serial hosted default
- **AND** MUST preserve `fullyParallel: false` unless a separate isolation review/spec explicitly changes that behavior.

#### Scenario: Hosted dependencies are installed
- **WHEN** the canonical GitHub-hosted job prepares Node dependencies
- **THEN** it MUST keep lifecycle scripts disabled for the existing install boundary
- **AND** SHOULD avoid audit/funding work that is not part of canonical repository verification
- **AND** MUST NOT claim lockfile/`npm ci` reproducibility unless a committed lockfile exists.

#### Scenario: A future optimization proposes less coverage
- **WHEN** a CI performance change would skip deterministic verifiers, remove a browser project, disable retries, or otherwise reduce the canonical verification surface
- **THEN** it MUST NOT be treated as an implementation of this requirement
- **AND** MUST require a separate explicit specification and coverage decision.

#### Scenario: Bounded workers remain insufficient
- **WHEN** exact-head hosted evidence still approaches or exceeds the job timeout after bounded worker/install optimization
- **THEN** job-level project/shard parallelism MAY be proposed
- **AND** the OpenSpec design/impact MUST be updated before changing required-check architecture or runner-minute consumption materially.
