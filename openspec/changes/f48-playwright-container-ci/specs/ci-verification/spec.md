## ADDED Requirements

### Requirement: Hosted browser verification MUST use a version-matched prebuilt Playwright runtime

DashGPT hosted jobs that launch Playwright browsers MUST use an official prebuilt Playwright runtime pinned to the same Playwright release as the repository test dependency, rather than resolving browser binaries and Linux browser dependencies from mutable package repositories during every workflow run.

#### Scenario: Browser matrix prepares its runtime
- **WHEN** the hosted `browser` matrix job starts
- **THEN** it MUST run inside the official Playwright container image pinned to version `1.62.1` on Ubuntu Noble
- **AND** the image version MUST match the repository's pinned `@playwright/test` version
- **AND** the job MUST NOT execute `npx playwright install --with-deps chromium`
- **AND** it MUST still execute both `desktop-chromium` and `mobile-chromium` projects through the existing matrix.

#### Scenario: Literal canonical proof prepares its runtime
- **WHEN** the opt-in `canonical-full` hosted job executes
- **THEN** it MUST use the same version-matched official Playwright container runtime as the browser matrix
- **AND** it MUST NOT install Chromium or Linux browser dependencies at workflow runtime
- **AND** it MUST still execute the literal `npm run verify:full` command.

#### Scenario: Chromium executes in the container
- **WHEN** Chromium is launched by a hosted browser-bearing job
- **THEN** the job container SHOULD use host IPC as recommended for Playwright Chromium container execution
- **AND** F47 browser retries, worker bounds, isolation, diagnostics, timeouts and final required-check semantics MUST remain unchanged.

#### Scenario: Playwright dependency version changes
- **WHEN** the repository changes its pinned `@playwright/test` version
- **THEN** deterministic repository verification MUST detect a stale hosted Playwright image version
- **AND** the image pin MUST be updated to the matching Playwright release before hosted browser verification is considered valid.

#### Scenario: Third-party package metadata is transiently inconsistent
- **WHEN** an external browser-related APT repository has stale or mismatched package metadata
- **THEN** ordinary DashGPT hosted browser verification MUST NOT depend on refreshing that repository through `playwright install --with-deps`
- **AND** repository browser tests MUST still be able to start using the prebuilt runtime image, subject to availability of the pinned container image itself.
