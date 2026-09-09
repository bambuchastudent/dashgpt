# Prebuilt Playwright container and reusable dependency cache for hosted CI

## Problem

The F47 hosted CI design runs browser verification on `ubuntu-latest` and provisions Chromium with `npx playwright install --with-deps chromium` inside every browser shard and the opt-in canonical-full lane.

On 2026-09-09, DashGPT run `34385670227` failed before any browser test executed because APT received a `Hash Sum mismatch` from Google's Chrome package repository while Playwright was installing Linux dependencies. The deterministic shard passed. Both desktop and mobile browser shards failed during environment provisioning, so the final required `check` failed even though repository code and browser tests were never exercised.

The workflow also executes the same Node dependency installation independently in deterministic, desktop, mobile and optional canonical-full jobs. On every cold job this spends roughly the same setup time rebuilding `node_modules`, even when `package.json` has not changed.

Together these make canonical verification slower and more dependent on repeated external provisioning than necessary.

## Goal

Run hosted Playwright verification inside Microsoft's official Playwright image that exactly matches the repository's pinned `@playwright/test` version, and reuse a GitHub Actions `node_modules` cache across canonical shards when the Node/package manifest inputs have not changed.

The change must:

- keep GitHub-hosted Ubuntu as the runner substrate;
- keep desktop and mobile Chromium projects and all F47 verification semantics;
- use the official `mcr.microsoft.com/playwright:v1.62.1-noble` image for browser-bearing jobs;
- remove runtime `playwright install --with-deps chromium` from those jobs;
- cache `node_modules` with an explicit versioned key coupled to Linux, Node 22 and `package.json`;
- skip `npm install` on an exact dependency-cache hit;
- on a cache miss, keep the existing `npm install --ignore-scripts --no-audit --no-fund` boundary;
- treat the cache only as an acceleration layer, not as dependency reproducibility, because the repository still has no committed lockfile;
- add deterministic regression assertions for the container pin, absence of runtime browser installation, cache key and install-on-miss behavior;
- preserve the opt-in literal `npm run verify:full` lane.

## Scope

- `.github/workflows/check.yml` dependency setup plus browser and `canonical-full` runtime environment;
- `scripts/verify-hosted-ci-performance.mjs` regression contract for hosted CI;
- OpenSpec F48 documentation and verification evidence.

## Non-goals

- changing Playwright test coverage, retries, workers, readiness or isolation behavior introduced by F47;
- changing `@playwright/test` from version `1.62.1`;
- changing deterministic checks to run inside a container;
- introducing `package-lock.json`, `npm ci`, or a repository-wide dependency-lock policy migration;
- changing product, storage, UI, Shared Chat or user-facing behavior;
- introducing a custom DashGPT Docker image;
- weakening required checks or treating environment-provisioning failures as success.
