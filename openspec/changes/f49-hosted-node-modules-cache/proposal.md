# Hosted Node dependency cache

## Problem

After F48 moved browser-bearing jobs to the pinned official Playwright container, DashGPT no longer installs Chromium and Linux browser dependencies at workflow runtime. However, `.github/workflows/check.yml` still runs the same `npm install --ignore-scripts --no-audit --no-fund` independently in the deterministic shard, both browser matrix shards, and the optional `canonical-full` lane.

When `package.json` is unchanged, rebuilding the same `node_modules` tree in every hosted job adds repeated setup time without increasing verification coverage.

## Goal

Reuse an exact GitHub Actions cache of `node_modules` across hosted canonical shards and skip npm installation when that cache is restored exactly.

The change must:

- preserve F47/F48 verification coverage, required-check semantics and Playwright container behavior;
- cache `node_modules` in deterministic, browser and optional canonical-full jobs;
- use an explicit versioned key coupled to Linux, Node 22 and the current `package.json` hash;
- skip `npm install` only on an exact cache hit;
- preserve `npm install --ignore-scripts --no-audit --no-fund` on cache misses;
- treat the cache as a CI acceleration layer only, because the repository still has no committed npm lockfile;
- add deterministic regression assertions for cache path/key and install-on-miss behavior;
- verify at least one repeated unchanged-dependency run produces a real cache hit before merge.

## Scope

- `.github/workflows/check.yml` dependency setup in deterministic, browser and `canonical-full` jobs;
- `scripts/verify-hosted-ci-performance.mjs` hosted-CI regression contract;
- OpenSpec F49 documentation and evidence.

## Non-goals

- adding `package-lock.json`, `npm ci`, or changing dependency policy;
- changing dependency versions;
- changing browser coverage, retries, workers, isolation, readiness or timeouts;
- changing product/UI/storage/cards/Dashes/search/continuation/Shared Chat behavior;
- serializing browser jobs behind a shared dependency-preparation job;
- weakening verification when cache restore misses or fails.
