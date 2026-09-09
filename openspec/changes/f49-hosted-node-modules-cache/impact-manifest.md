# Impact Manifest

## Directly changed

- `.github/workflows/check.yml`
  - dependency setup in `deterministic`, `browser`, and `canonical-full`
  - `node_modules` restore through `actions/cache@v4`
  - npm install only on cache miss
- `scripts/verify-hosted-ci-performance.mjs`
  - regression assertions for cache path/key and conditional install semantics
- `openspec/changes/f49-hosted-node-modules-cache/**`

## Intentionally unchanged

- F48 official Playwright container pin and host IPC behavior
- final required `check` job identity and dependency graph
- deterministic/browser verification commands and coverage
- Playwright projects, retries, workers, max-failure policy, readiness and isolation
- dependency versions in `package.json`
- absence of a committed npm lockfile; F49 does not introduce `package-lock.json` or `npm ci`
- application/product behavior and deployment runtime

## External dependencies

- GitHub Actions cache storage is used for the `node_modules` acceleration layer.
- npm registry access remains required on cache misses.
- Existing GitHub-hosted Ubuntu and Microsoft Playwright container dependencies remain unchanged from F48.

## Failure modes

- Cache miss/eviction: fall back to the existing npm install command; verification remains authoritative.
- Concurrent cold shards: more than one job may install before the first cache save completes; later runs should hit the shared key.
- Stale cache contract: bump the explicit cache version or remove the cache optimization.
- Cache-service outage: do not treat verification as passed merely because setup infrastructure failed.

## Verification evidence required before merge

- strict F49 OpenSpec validation before production workflow edits;
- deterministic `npm run check` on final head;
- successful desktop and mobile hosted browser shards;
- successful final required `check`;
- one successful opt-in literal `npm run verify:full` lane;
- a later run with unchanged dependency inputs showing exact `node_modules` cache hit and skipped npm installation.
