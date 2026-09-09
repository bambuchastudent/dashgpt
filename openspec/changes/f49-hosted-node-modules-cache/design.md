# Design

## Decision

Use `actions/cache@v4` directly in every canonical job that needs repository Node dependencies. Cache the repository `node_modules` directory and conditionally run the existing npm install command only when the cache action reports no exact hit.

Each dependency-bearing job follows:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: 22
- name: Restore Node dependencies
  id: node-modules-cache
  uses: actions/cache@v4
  with:
    path: node_modules
    key: dashgpt-node-modules-v1-${{ runner.os }}-node22-${{ hashFiles('package.json') }}
- if: steps.node-modules-cache.outputs.cache-hit != 'true'
  run: npm install --ignore-scripts --no-audit --no-fund
```

Apply the same contract to `deterministic`, `browser`, and `canonical-full`. The lightweight final `check` job needs no dependencies and remains unchanged.

## Cache key

The key contains:

- `dashgpt-node-modules-v1`: explicit manually bumpable cache schema/version;
- `${{ runner.os }}`: prevents cross-OS reuse;
- `node22`: couples the cache to the current Node major used by hosted CI;
- `${{ hashFiles('package.json') }}`: invalidates the cache when dependency declarations change.

The repository currently has no committed npm lockfile. Therefore F49 deliberately does not claim reproducible dependency resolution: the first cache miss for a new key resolves dependencies with the existing `npm install` behavior and the resulting tree becomes an acceleration snapshot for subsequent exact hits.

## Why cache node_modules rather than only npm downloads

Caching the npm download directory would reduce network transfer but would still run `npm install` in every shard. The stated goal is to avoid spending job time reconstructing unchanged dependencies, so F49 caches the materialized `node_modules` tree and skips installation on exact hits.

## Parallel cold runs

Desktop, mobile and deterministic jobs stay parallel. On the first cold run for a new key they may all miss and independently install because GitHub cache persistence happens at job completion. F49 accepts this one-time duplication rather than introducing a serial dependency-preparation job that would lengthen the healthy critical path. Later unchanged runs should restore the shared key and skip npm installation.

## Safety boundary

A cache hit changes only setup work, never the verification command. Cache misses retain `--ignore-scripts --no-audit --no-fund`. No install scripts are enabled, no dependency versions are changed, and no required check becomes optional.

If the cache contract becomes stale or unsafe, bump `v1` to a new version or remove the optimization; do not weaken verification.

## Verification

`verify-hosted-ci-performance.mjs` must assert:

- `actions/cache@v4` is present for dependency-bearing jobs;
- cached path is `node_modules`;
- the key includes the explicit version, runner OS, Node 22 and `hashFiles('package.json')`;
- each npm install is guarded by `steps.node-modules-cache.outputs.cache-hit != 'true'`;
- install flags remain `--ignore-scripts --no-audit --no-fund`;
- F48 Playwright image/runtime assertions remain intact.

Before merge, strict OpenSpec validation must pass before implementation, then the final head must pass deterministic, desktop, mobile, final `check`, one opt-in literal `npm run verify:full`, and a repeated unchanged-dependency run showing an exact cache hit and skipped npm install.
