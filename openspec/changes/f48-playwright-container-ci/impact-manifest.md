# Impact Manifest

## Directly changed

- `.github/workflows/check.yml`
  - `browser` matrix job runtime
  - opt-in `canonical-full` job runtime
  - removal of per-job `playwright install --with-deps chromium`
  - shared `node_modules` cache restore for deterministic/browser/canonical-full jobs
  - npm install only on exact cache miss
- `scripts/verify-hosted-ci-performance.mjs`
  - regression assertions for exact Playwright image pin and no runtime browser install
  - regression assertions for dependency cache key/path and install-on-miss behavior
- `openspec/changes/f48-playwright-container-ci/**`

## Intentionally unchanged

- deterministic verification command (`npm run check`) and normal host runtime
- final required `check` job identity and dependency graph
- Playwright desktop/mobile project definitions
- Playwright retries, workers, max-failure policy and readiness/isolation behavior
- application code, UI, storage, cards, Dashes, search, continuation and Shared Chat behavior
- dependency versions in `package.json`
- absence of a committed npm lockfile; F48 does not introduce `package-lock.json` or `npm ci`
- deployment/runtime infrastructure outside GitHub Actions verification

## External dependencies

- GitHub-hosted `ubuntu-latest` runner remains the host substrate.
- Browser-bearing jobs pull Microsoft's official `mcr.microsoft.com/playwright:v1.62.1-noble` image.
- GitHub Actions cache storage is used to reuse `node_modules` across runs with the exact versioned key.
- npm registry access remains required on cache misses, but exact cache hits skip npm installation entirely.

## Cache boundary

The cache key is coupled to Linux runner OS, Node 22, a manually bumpable cache schema version and the current `package.json` hash. Because the repository has no committed npm lockfile, this is a performance cache only. It MUST NOT be presented as reproducible dependency resolution.

## Failure modes

- MCR image pull outage: browser-bearing jobs fail before tests; this remains visible and does not weaken the required check.
- Playwright dependency/image version drift: deterministic verifier fails until pins match.
- Container incompatibility with existing Actions steps: PR browser shards or canonical-full fail; do not merge until resolved.
- Dependency cache miss/eviction: job falls back to the existing safe npm install command and verification continues.
- Stale/unsafe cache contract: rotate the explicit cache-key version or remove the cache optimization; do not weaken verification commands.
- GitHub cache service outage: restoration may miss/fail according to the action behavior; ordinary install remains the intended fallback path where the cache step itself completes without an exact hit.

## Verification evidence required before merge

- strict OpenSpec validation for the cache-expanded F48 scope;
- deterministic `npm run check` on final PR head;
- successful desktop and mobile Chromium hosted shards on final PR head;
- successful final required `check` on final PR head;
- one successful opt-in literal `npm run verify:full` hosted lane on the final implementation head;
- a repeated unchanged-dependency hosted run demonstrating an exact `node_modules` cache hit and skipped npm installation.
