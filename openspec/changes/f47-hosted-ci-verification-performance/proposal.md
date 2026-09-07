# Hosted CI canonical verification performance

## Problem

After PR #117 moved DashGPT canonical verification from the dedicated macOS self-hosted runner to `ubuntu-latest`, both the clean `develop` baseline and PR #113 exact head exhaust the existing 30-minute `DashGPT checks` job budget while still inside browser verification.

Profiling shows this is not ordinary Playwright throughput: dependency setup is about one minute, `npm run check` completes in seconds, and the original browser fixture repeatedly consumed 60-second timeouts waiting for a readiness marker bootstrap did not emit. After readiness/fail-fast/parallel scheduling was repaired, the remaining time concentrated in a few test-harness issues: reload races and a 2200-card gallery layout stress test that unnecessarily bootstrapped the entire application/Vault path instead of isolating the gallery module it intends to measure.

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
- make reload-causing tests synchronize with the completed new document rather than transient pre-reload state;
- run the 2200-card gallery stress case in an isolated same-origin browser component harness so it measures real Chromium layout/module behavior without paying unrelated full-app bootstrap/persistence cost;
- provide an explicit opt-in hosted lane for the literal `npm run verify:full` command so maintainers can obtain one-command canonical proof without adding duplicate work to every PR;
- avoid non-verification install overhead where it is safe to do so.

## Scope

- `.github/workflows/check.yml` hosted CI setup, job-level parallelization and opt-in literal canonical verification;
- `playwright.config.mjs` bounded CI concurrency, fail-fast budget and isolation-compatible scheduling;
- `tests/playwright-fixture.mjs` bounded readiness waiting and explicit per-test state hygiene;
- demo bootstrap readiness signaling used by the test harness, without user-facing UI/API behavior changes;
- browser regression coverage and existing specs for readiness, isolation, completed-navigation synchronization and isolated gallery stress behavior;
- deterministic regression verification for the hosted-CI contract;
- `package.json` wiring needed for those verifiers;
- OpenSpec/current development-state documentation for the verification behavior.

## Repository constraint discovered during specification

Current `develop` has no committed `package-lock.json`. F47 therefore MUST NOT pretend `npm ci` or lockfile-keyed npm caching is available, and MUST NOT silently introduce a repository-wide dependency-lock migration just to optimize this CI defect. The existing no-lifecycle-scripts install boundary remains intact.

## Non-goals

- changing user-facing product/API/Vault behavior;
- changing F46 Shared Chat smoke classification semantics;
- removing desktop or mobile browser coverage;
- disabling CI retries merely to reduce runtime;
- converting back to self-hosted runners;
- adding a package-lock/dependency-policy migration;
- weakening the 2200-card gallery behavior assertion merely to make CI green;
- making the literal full-verification lane run on every pull request;
- masking the issue by increasing `timeout-minutes`.
