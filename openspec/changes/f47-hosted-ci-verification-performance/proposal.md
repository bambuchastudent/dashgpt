# Hosted CI canonical verification performance

## Problem

After PR #117 moved DashGPT canonical verification from the dedicated macOS self-hosted runner to `ubuntu-latest`, both the clean `develop` baseline and PR #113 exact head exhaust the existing 30-minute `DashGPT checks` job budget while still inside browser verification.

Profiling the hosted run shows this is not ordinary Playwright throughput:

- dependency setup is about one minute total;
- `npm run check` completes in seconds;
- repeated tests consumed the 60-second test timeout waiting for `html[data-dashgpt-ready="true"]`, and CI retry repeated the same wait;
- the browser fixture required that readiness marker after every local demo navigation, while the application bootstrap did not emit it;
- after repairing readiness, the 2200-card stress case exposed a second real bottleneck: local-only startup materializes the existing Vault and then redundantly persists every already-stored Result again, while `putResult()` validates/searches the growing Vault on every call, producing superlinear startup cost.

The same baseline behavior on untouched `develop` demonstrates a verification defect rather than an F46 regression. Raising the job timeout would only hide it.

## Goal

Restore fast, reliable GitHub-hosted canonical verification with a pull-request wall-clock target below 10 minutes while preserving the complete healthy-run verification surface:

- keep `npm run verify:full` as the canonical local/full command;
- preserve all deterministic `npm run check` coverage;
- preserve both Playwright projects and CI retries;
- make demo readiness explicit and bounded so bootstrap failures fail in seconds rather than minutes;
- make browser tests independently runnable with fresh browser state;
- enable safe Playwright parallelism after isolation is explicit;
- parallelize desktop and mobile CI work at the GitHub-job level;
- stop systemic failing browser jobs after a small bounded number of failures while retaining full coverage on healthy runs;
- remove redundant local-only Vault re-persistence so large existing Vaults can become ready within the fast readiness budget without changing stored content semantics;
- avoid non-verification install overhead where it is safe to do so.

## Scope

- `.github/workflows/check.yml` hosted CI setup and job-level parallelization;
- `playwright.config.mjs` bounded CI concurrency, fail-fast budget and isolation-compatible scheduling;
- `tests/playwright-fixture.mjs` bounded readiness waiting and explicit per-test state hygiene;
- demo bootstrap readiness signaling used by the test harness, without user-facing UI/API behavior changes;
- `demo/app.js` startup persistence path, limited to avoiding redundant rewrites of an already-materialized local-only Vault while preserving merge/persistence semantics when published data must be reconciled;
- browser regression coverage for readiness, isolation, reload synchronization and large-Vault startup behavior;
- deterministic regression verification for the hosted-CI contract;
- `package.json` wiring needed for those verifiers;
- OpenSpec/current development-state documentation for the verification behavior.

## Repository constraint discovered during specification

Current `develop` has no committed `package-lock.json`. F47 therefore MUST NOT pretend `npm ci` or lockfile-keyed npm caching is available, and MUST NOT silently introduce a repository-wide dependency-lock migration just to optimize this CI defect. The existing no-lifecycle-scripts install boundary remains intact.

## Non-goals

- changing user-facing product/API behavior or Vault data semantics;
- changing F46 Shared Chat smoke classification semantics;
- removing desktop or mobile browser coverage;
- disabling CI retries merely to reduce runtime;
- converting back to self-hosted runners;
- adding a package-lock/dependency-policy migration;
- masking the issue by increasing `timeout-minutes`.
