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
- reload-causing browser specs
  - one-shot storage seeding and completed-navigation synchronization.
- gallery overview browser stress coverage
  - same-origin minimal component harness using the real gallery module and real 2200-card DOM/layout surface rather than full app bootstrap.
- demo bootstrap readiness plumbing
  - non-visual `data-dashgpt-ready` testability signal after required initialization.
- deterministic verification for the CI/config/test-harness contract.

## Maintainer-visible impact

Pull-request feedback moves from repeated 30-minute cancellations to parallel browser shards with a hard 9-minute execution ceiling and a normal target below 10 minutes. Systemic bootstrap failures become red quickly rather than consuming repeated 60-second test + retry budgets.

Healthy runs retain the complete deterministic, desktop Chromium and mobile Chromium verification surface. Hosted CI reports through the existing `check` required-check identity. `npm run verify:full` remains the canonical one-command full gate for final/local verification.

## Preserved gates and product semantics

- all existing `npm run check` verifiers;
- both desktop Chromium and mobile Chromium Playwright projects;
- CI `retries: 1`;
- Playwright 60-second general per-test timeout for genuinely long behavior;
- 2200-card real Chromium gallery layout stress coverage;
- repository-owner CI execution guard;
- `ubuntu-latest` hosted runner policy;
- `npm install --ignore-scripts` safety boundary;
- final-head canonical `npm run verify:full` before merge;
- existing required `check` status identity via aggregator;
- user-facing Cards, Vault, storage/sync/import and gallery semantics.

## Behavior intentionally changed

- readiness/bootstrap failure has its own <=5-second wait budget rather than inheriting the 60-second test timeout;
- browser specs may execute fully parallel because each test must be isolated;
- desktop/mobile projects run on separate hosted runners;
- each browser job has a hard timeout no greater than 9 minutes;
- a failing browser job may stop after a small maximum-failure threshold;
- reload-causing tests wait for the replacement document instead of transient intermediate state;
- the 2200-card gallery stress test isolates the real gallery component from unrelated app bootstrap cost while keeping the same card-count/layout assertions.

## Explicitly unaffected

- production Vault persistence behavior;
- user-facing Cards, Dashes, search, Semantic Gallery and continuation behavior;
- storage/sync/import data model and remote-provider behavior;
- Shared Chat resolver behavior;
- F46 scheduled-vs-strict smoke classification;
- deployment configuration and credentials;
- repository dependency-lock policy.

## Main risks

- Job-level parallelization increases concurrent runner usage while reducing developer wall-clock.
- `fullyParallel: true` exposes hidden test-order coupling; explicit context isolation and navigation synchronization protect against it.
- The readiness marker must represent completed bootstrap, not merely DOM load.
- The isolated gallery harness must exercise the real module/CSS/DOM behavior rather than a simplified mock.
- Preserving `check` as an aggregator is required so branch protection cannot ignore browser failures.
