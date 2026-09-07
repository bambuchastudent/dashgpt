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
- browser tests that intentionally reload/navigate
  - one-shot storage seeding and completed-navigation synchronization.
- demo bootstrap/app readiness plumbing
  - non-visual `data-dashgpt-ready` testability signal after required initialization.
- `demo/app.js`
  - avoid redundant per-Result persistence when startup is materializing an already-durable local-only Vault;
  - preserve normal persistence for published/local reconciliation and explicit mutations.
- browser regression coverage for context/storage isolation, readiness and large-Vault startup.
- deterministic verification for the CI/config/test-harness contract.

## Maintainer-visible impact

Pull-request feedback moves from repeated 30-minute cancellations to parallel browser shards with a hard 9-minute execution ceiling and a normal target below 10 minutes. Systemic bootstrap failures become red quickly rather than consuming repeated 60-second test + retry budgets.

Healthy runs retain the complete deterministic, desktop Chromium and mobile Chromium verification surface. Hosted CI reports through the existing `check` required-check identity. `npm run verify:full` remains the canonical one-command full gate for final/local verification.

## User-visible performance impact

Large local Vaults should open materially faster because DashGPT no longer rewrites thousands of already-durable local Results during startup when no published catalog reconciliation is needed. Card/Vault contents and persistence semantics remain unchanged.

## Preserved gates and semantics

- all existing `npm run check` verifiers;
- both desktop Chromium and mobile Chromium Playwright projects;
- CI `retries: 1`;
- Playwright 60-second general per-test timeout for genuinely long behavior;
- repository-owner CI execution guard;
- `ubuntu-latest` hosted runner policy;
- `npm install --ignore-scripts` safety boundary;
- final-head canonical `npm run verify:full` before merge;
- existing required `check` status identity via aggregator;
- published/local merge persistence and explicit mutation persistence;
- existing Vault Result/event semantics.

## Behavior intentionally changed

- readiness/bootstrap failure has its own <=5-second wait budget rather than inheriting the 60-second test timeout;
- browser specs may execute fully parallel because each test must be isolated;
- desktop/mobile projects run on separate hosted runners;
- each browser job has a hard timeout no greater than 9 minutes;
- a failing browser job may stop after a small maximum-failure threshold;
- local-only startup skips redundant re-persistence of already-durable materialized Results.

## Explicitly unaffected

- user-facing Cards, Dashes, search, Semantic Gallery and continuation semantics;
- storage/sync/import data model and remote-provider behavior;
- Shared Chat resolver behavior;
- F46 scheduled-vs-strict smoke classification;
- deployment configuration and credentials;
- repository dependency-lock policy.

## Main risks

- Job-level parallelization increases concurrent runner usage while reducing developer wall-clock.
- `fullyParallel: true` exposes hidden test-order coupling; explicit context isolation and navigation synchronization protect against it.
- The readiness marker must represent completed bootstrap, not merely DOM load.
- The local-only startup fast path must skip only provably redundant writes; published reconciliation and user mutations must remain durable.
- Preserving `check` as an aggregator is required so branch protection cannot ignore browser failures.
