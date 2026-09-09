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

### Requirement: Hosted canonical shards MUST reuse unchanged Node dependencies

DashGPT hosted verification SHOULD avoid rebuilding the same repository `node_modules` tree in every job when the dependency inputs are unchanged, without weakening the existing install safety boundary or claiming lockfile reproducibility that the repository does not have.

#### Scenario: Exact Node dependency cache hit
- **WHEN** a deterministic, browser or opt-in canonical-full job restores an exact dependency cache for Linux, Node 22 and the current `package.json`
- **THEN** the cached path MUST be `node_modules`
- **AND** the job MUST skip `npm install`
- **AND** it MUST proceed to the same verification command and coverage as an uncached job.

#### Scenario: Node dependency cache miss
- **WHEN** the exact dependency cache is absent
- **THEN** the job MUST execute `npm install --ignore-scripts --no-audit --no-fund`
- **AND** the resulting `node_modules` MUST be eligible to populate the versioned cache for later jobs/runs
- **AND** a cache miss MUST NOT weaken or skip verification.

#### Scenario: Dependency manifest changes
- **WHEN** `package.json` changes
- **THEN** the dependency cache key MUST change
- **AND** the previous `node_modules` cache MUST NOT be treated as an exact hit for the new manifest.

#### Scenario: Cache contract changes
- **WHEN** maintainers need to invalidate dependency caches without changing `package.json`
- **THEN** the cache key MUST contain an explicit manually bumpable version component.

#### Scenario: No committed lockfile exists
- **WHEN** hosted CI uses the dependency cache while the repository has no committed npm lockfile
- **THEN** the cache MUST be described only as a CI acceleration layer
- **AND** F48 MUST NOT introduce `npm ci` or claim deterministic dependency resolution
- **AND** a dependency-lock policy change MUST remain separate from this optimization.
