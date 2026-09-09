# Prebuilt Playwright container for hosted CI

## Problem

The F47 hosted CI design runs browser verification on `ubuntu-latest` and provisions Chromium with `npx playwright install --with-deps chromium` inside every browser shard and the opt-in canonical-full lane.

On 2026-09-09, DashGPT run `34385670227` failed before any browser test executed because APT received a `Hash Sum mismatch` from Google's Chrome package repository while Playwright was installing Linux dependencies. The deterministic shard passed. Both desktop and mobile browser shards failed during environment provisioning, so the final required `check` failed even though repository code and browser tests were never exercised.

This makes canonical verification dependent on mutable third-party APT metadata at job runtime and duplicates browser/system dependency setup across browser shards.

## Goal

Run hosted Playwright verification inside Microsoft's official Playwright image that exactly matches the repository's pinned `@playwright/test` version, so Chromium and its Linux runtime dependencies are already present before the job starts.

The change must:

- keep GitHub-hosted Ubuntu as the runner substrate;
- keep desktop and mobile Chromium projects and all F47 verification semantics;
- use the official `mcr.microsoft.com/playwright:v1.62.1-noble` image for browser-bearing jobs;
- remove runtime `playwright install --with-deps chromium` from those jobs;
- keep Node dependency installation with lifecycle scripts disabled;
- add deterministic regression assertions for the container pin and absence of runtime browser installation;
- preserve the opt-in literal `npm run verify:full` lane.

## Scope

- `.github/workflows/check.yml` browser and `canonical-full` job runtime environment;
- `scripts/verify-hosted-ci-performance.mjs` regression contract for hosted CI;
- OpenSpec F48 documentation and verification evidence.

## Non-goals

- changing Playwright test coverage, retries, workers, readiness or isolation behavior introduced by F47;
- changing `@playwright/test` from version `1.62.1`;
- changing deterministic checks to run inside a container;
- changing product, storage, UI, Shared Chat or user-facing behavior;
- introducing a custom DashGPT Docker image;
- weakening required checks or treating environment-provisioning failures as success.
