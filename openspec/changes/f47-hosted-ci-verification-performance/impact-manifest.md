# Impact Manifest

## Directly affected

- `.github/workflows/check.yml`
  - deterministic/browser job decomposition;
  - desktop/mobile hosted parallelism;
  - final `check` aggregator preserving required-check identity;
  - explicit sub-10-minute shard budgets;
  - bounded failure runtime;
  - avoidable npm install overhead.
- `playwright.config.mjs`
  - isolation-safe full parallel scheduling;
  - bounded CI workers;
  - bounded maximum failure count;
  - existing retry/general timeout preservation.
- `tests/playwright-fixture.mjs`
  - dedicated fast readiness timeout;
  - explicit fresh browser-state expectations.
- demo bootstrap/app readiness plumbing
  - non-visual `data-dashgpt-ready` testability signal after required initialization.
- browser regression coverage for context/storage isolation and readiness.
- deterministic verification for the CI/config/test-harness contract.
- `npm run check` wiring for the verifier.

## Maintainer-visible impact

Pull-request feedback should move from repeated 30-minute cancellations to a hard architecture whose browser shards cannot execute longer than 9 minutes and whose normal critical path is below 10 minutes. A systemic bootstrap failure should become red quickly instead of consuming repeated 60-second test + retry budgets.

Healthy runs retain the complete deterministic, desktop Chromium and mobile Chromium verification surface. Hosted CI executes that surface as independent parallel jobs and reports through the existing `check` required-check identity. `npm run verify:full` remains the canonical one-command full gate for final/local verification.

## Preserved gates

- all existing `npm run check` verifiers;
- both desktop Chromium and mobile Chromium Playwright projects;
- CI `retries: 1`;
- Playwright 60-second general per-test timeout for genuinely long test behavior;
- repository-owner CI execution guard;
- `ubuntu-latest` hosted runner policy;
- `npm install --ignore-scripts` safety boundary;
- final-head canonical `npm run verify:full` before merge;
- existing required `check` status identity via aggregator.

## Behavior intentionally changed

- readiness/bootstrap failure has its own <=5-second wait budget rather than inheriting the 60-second test timeout;
- browser specs may execute fully parallel because each test must be isolated;
- desktop/mobile projects run on separate hosted runners;
- each browser job has a hard timeout no greater than 9 minutes;
- a failing browser job may stop after a small maximum-failure threshold instead of executing every remaining test after the result is already conclusively red.

## Explicitly unaffected

- user-facing Cards, Dashes, search, Semantic Gallery and continuation behavior;
- storage/sync/import persistence semantics;
- Shared Chat resolver behavior;
- F46 scheduled-vs-strict smoke classification;
- deployment configuration and credentials;
- repository dependency-lock policy (no lockfile is introduced by F47).

## Main risks

- Job-level parallelization increases concurrent runner usage and may increase total runner-minutes while reducing developer wall-clock.
- `fullyParallel: true` exposes hidden test-order coupling if any exists; explicit context isolation plus regression coverage is required before relying on it.
- The readiness marker must represent completed bootstrap, not merely DOM load, or tests could become faster but racy.
- Preserving `check` as an aggregator is required so branch protection cannot accidentally ignore browser failures.
- The repository still resolves npm dependencies without a committed lockfile; F47 does not claim to fix that separate reproducibility concern.
