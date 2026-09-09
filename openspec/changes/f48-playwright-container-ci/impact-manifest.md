# Impact Manifest

## Directly changed

- `.github/workflows/check.yml`
  - `browser` matrix job runtime
  - opt-in `canonical-full` job runtime
  - removal of per-job `playwright install --with-deps chromium`
- `scripts/verify-hosted-ci-performance.mjs`
  - regression assertions for exact Playwright image pin and no runtime browser install
- `openspec/changes/f48-playwright-container-ci/**`

## Intentionally unchanged

- `deterministic` job runtime and `npm run check` behavior
- final required `check` job identity and dependency graph
- Playwright desktop/mobile project definitions
- Playwright retries, workers, max-failure policy and readiness/isolation behavior
- application code, UI, storage, cards, Dashes, search, continuation and Shared Chat behavior
- dependency versions in `package.json`
- deployment/runtime infrastructure outside GitHub Actions verification

## External dependencies

- GitHub-hosted `ubuntu-latest` runner remains the host substrate.
- Browser-bearing jobs pull Microsoft's official `mcr.microsoft.com/playwright:v1.62.1-noble` image.
- npm dependency installation remains required for repository packages, but browser binaries and Linux browser runtime packages are no longer installed through Playwright at job runtime.

## Failure modes

- MCR image pull outage: browser-bearing jobs fail before tests; this is visible and does not weaken the required check.
- Playwright dependency/image version drift: deterministic verifier fails until pins match.
- Container incompatibility with existing Actions steps: PR browser shards or canonical-full fail; do not merge until resolved.

## Verification evidence required before merge

- strict OpenSpec validation for F48;
- deterministic `npm run check` on final PR head;
- successful desktop and mobile Chromium hosted shards on final PR head;
- successful final required `check` on final PR head;
- one successful opt-in literal `npm run verify:full` hosted lane on the final implementation head.
