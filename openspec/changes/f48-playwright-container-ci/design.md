# Design

## Decision

Use a GitHub Actions job container for every hosted job that actually launches Playwright browsers:

```yaml
container:
  image: mcr.microsoft.com/playwright:v1.62.1-noble
  options: --ipc=host
```

Apply this to the `browser` matrix job and the opt-in `canonical-full` job. Leave `deterministic` and the lightweight `check` aggregator on the normal `ubuntu-latest` host.

The repository pins `@playwright/test` to `1.62.1`, so the container tag is deliberately pinned to the same Playwright release. The Noble image is based on Ubuntu 24.04 and already contains Playwright browser binaries plus required system dependencies; the npm Playwright package continues to come from the repository dependency installation.

## Why a job container

The observed failure happened inside `playwright install --with-deps`, specifically while APT refreshed Google's Chrome repository metadata. Retrying that installation reduces but does not remove the dependency on mutable external package indexes. A prebuilt Playwright image moves browser/system dependency resolution to image publication time and makes each CI run consume a known browser runtime directly.

A job-level container is preferable to manually invoking `docker run` because checkout, Node setup, npm install, browser execution and diagnostic upload stay in the existing GitHub Actions job model.

## Version coupling

The image version MUST match the repository's pinned `@playwright/test` version. F48 intentionally does not automate version derivation because GitHub Actions container image fields are configuration resolved before ordinary repository scripts run. The deterministic hosted-CI verifier will assert the current exact pair so a future Playwright dependency upgrade fails locally/CI until the image pin is updated in the same change.

## IPC

Chromium is run with `--ipc=host`, matching Playwright's documented Docker recommendation for Chromium to avoid constrained shared-memory behavior. No additional privileged container options are introduced.

## Verification contract

`verify-hosted-ci-performance.mjs` will be changed from asserting that browser jobs execute `npx playwright install --with-deps chromium` to asserting that:

- the browser matrix and `canonical-full` jobs reference `mcr.microsoft.com/playwright:v1.62.1-noble`;
- the workflow contains no runtime `playwright install --with-deps chromium` command;
- the existing browser matrix, retries, timeouts, artifact diagnostics and literal canonical lane remain intact.

The PR should first pass strict OpenSpec validation. After implementation it must pass `npm run check`, both browser shards, the final `check`, and one opt-in literal `npm run verify:full` run before merge.

## Rollback

If GitHub Actions container execution proves incompatible with the existing workflow, revert F48 rather than silently restoring runtime APT provisioning with weakened checks. A different prebuilt-runtime approach would require an updated spec/design decision.
