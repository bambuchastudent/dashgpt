## ADDED Requirements

### Requirement: Hosted canonical verification MUST reuse unchanged Node dependencies

DashGPT hosted canonical verification MUST reuse a materialized Node dependency tree when its relevant cache inputs are unchanged, while preserving the existing verification commands and safe install boundary on cache misses.

#### Scenario: Exact dependency cache hit
- **WHEN** a deterministic, browser or opt-in canonical-full job restores an exact dependency cache for the current Linux runner OS, Node 22 and `package.json`
- **THEN** the cached path MUST be `node_modules`
- **AND** the job MUST skip `npm install`
- **AND** it MUST execute the same verification command and coverage as an uncached job.

#### Scenario: Dependency cache miss
- **WHEN** the exact dependency cache is absent
- **THEN** the job MUST execute `npm install --ignore-scripts --no-audit --no-fund`
- **AND** the resulting `node_modules` MUST be eligible for cache persistence
- **AND** verification MUST continue normally after installation.

#### Scenario: Dependency declarations change
- **WHEN** `package.json` changes
- **THEN** the exact dependency cache key MUST change
- **AND** the prior materialized dependency tree MUST NOT count as an exact hit for the changed manifest.

#### Scenario: Cache schema requires invalidation
- **WHEN** maintainers change the dependency-cache contract without changing `package.json`
- **THEN** the cache key MUST contain an explicit manually bumpable version component so old entries can be invalidated.

#### Scenario: Repository has no committed npm lockfile
- **WHEN** hosted verification restores or creates the dependency cache while no npm lockfile is committed
- **THEN** the cache MUST be treated only as a CI performance optimization
- **AND** the change MUST NOT introduce `npm ci` or claim deterministic dependency resolution
- **AND** a dependency-lock policy change MUST remain a separate capability/change.

#### Scenario: Browser jobs use the dependency cache
- **WHEN** desktop or mobile Playwright verification executes inside the F48 version-matched Playwright container
- **THEN** dependency caching MUST NOT alter the pinned container image, browser project selection, retries, worker bounds, isolation, diagnostics or required-check semantics.

#### Scenario: Warm hosted verification repeats unchanged dependency inputs
- **WHEN** a later hosted run executes with the same dependency cache key after a successful cache-producing run
- **THEN** at least one canonical dependency-bearing job SHOULD restore an exact cache hit
- **AND** merge evidence for F49 MUST demonstrate that npm installation was skipped on such a hit.
