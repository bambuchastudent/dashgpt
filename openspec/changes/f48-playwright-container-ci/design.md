# Design

## Decision

Use a GitHub Actions job container for every hosted job that actually launches Playwright browsers:

```yaml
container:
  image: mcr.microsoft.com/playwright:v1.62.1-noble
  options: --ipc=host
```

Apply this to the `browser` matrix job and the opt-in `canonical-full` job. Leave `deterministic` and the lightweight `check` aggregator on the normal `ubuntu-latest` host.

The repository pins `@playwright/test` to `1.62.1`, so the container tag is deliberately pinned to the same Playwright release. The Noble image already contains the matching Playwright browser binaries plus required system dependencies; the npm Playwright package continues to come from repository dependencies.

## Why a job container

The observed failure happened inside `playwright install --with-deps`, specifically while APT refreshed Google's Chrome repository metadata. Retrying that installation reduces but does not remove the dependency on mutable external package indexes. A prebuilt Playwright image moves browser/system dependency resolution to image publication time and makes each CI run consume a known browser runtime directly.

A job-level container is preferable to manually invoking `docker run` because checkout, Node setup, dependency restore, browser execution and diagnostic upload stay in the existing GitHub Actions job model.

## Node dependency cache

Canonical shards also reuse a GitHub Actions cache for the repository `node_modules` directory.

Each dependency-bearing job performs:

1. checkout;
2. Node 22 setup;
3. restore `node_modules` through `actions/cache@v4`;
4. execute `npm install --ignore-scripts --no-audit --no-fund` only when the exact cache key is absent;
5. execute the existing verification command.

The cache key is explicitly versioned and coupled to the current execution contract:

```text
dashgpt-node-modules-v1-${runner.os}-node22-${hashFiles('package.json')}
```

The `v1` prefix is a manual escape hatch for invalidating the cache if the dependency-install contract changes without a manifest change. `runner.os`, Node 22 and `package.json` prevent accidental reuse across the current material inputs.

DashGPT currently has no committed npm lockfile, so this cache is intentionally an acceleration layer rather than a claim of dependency reproducibility. A cache miss still uses the existing install command and npm resolution semantics. F48 does not introduce `package-lock.json` or `npm ci`; that would be a separate dependency-policy change.

The same cache contract is used by deterministic, browser and optional canonical-full jobs. Concurrent cold shards may each install before the first cache entry is committed, but subsequent runs with the same key can skip installation entirely; preserving F47 job-level parallelism is more important than serializing every shard behind a dependency-preparation job.

## Version coupling

The image version MUST match the repository's pinned `@playwright/test` version. F48 intentionally does not automate version derivation because GitHub Actions container image fields are resolved before ordinary repository scripts run. The deterministic hosted-CI verifier will assert the current exact pair so a future Playwright dependency upgrade fails until the image pin is updated in the same change.

## IPC

Chromium is run with `--ipc=host`, matching Playwright's documented Docker recommendation for Chromium to avoid constrained shared-memory behavior. No additional privileged container options are introduced.

## Verification contract

`verify-hosted-ci-performance.mjs` will assert that:

- the browser matrix and `canonical-full` jobs reference `mcr.microsoft.com/playwright:v1.62.1-noble`;
- the workflow contains no runtime `playwright install --with-deps chromium` command;
- dependency-bearing jobs use `actions/cache@v4` for `node_modules` with the versioned Node/package-manifest key;
- `npm install --ignore-scripts --no-audit --no-fund` is conditional on `cache-hit != 'true'`;
- no lockfile/`npm ci` claim is introduced by this optimization;
- the existing browser matrix, retries, timeouts, artifact diagnostics and literal canonical lane remain intact.

After updating the spec, strict OpenSpec validation must pass before workflow edits. The final PR head must pass `npm run check`, both browser shards, the final `check`, and one opt-in literal `npm run verify:full` run. A second hosted run with an unchanged dependency key should demonstrate a real `node_modules` cache hit and skipped npm installation before merge.

## Rollback

If GitHub Actions container execution proves incompatible with the existing workflow, revert the container portion rather than silently restoring runtime APT provisioning with weakened checks. If `node_modules` caching proves unsafe or unreliable, remove/rotate the cache optimization while keeping the prebuilt browser runtime; do not weaken verification commands.
