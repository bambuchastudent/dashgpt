# Hosted CI canonical verification performance

## Problem

After PR #117 moved DashGPT canonical verification from the dedicated macOS self-hosted runner to `ubuntu-latest`, both the clean `develop` baseline and PR #113 exact head exhaust the existing 30-minute `DashGPT checks` job budget while still inside browser verification.

Profiling the hosted run shows this is not ordinary Playwright throughput:

- dependency setup is about one minute total;
- `npm run check` completes in about five seconds;
- Playwright starts 186 tests;
- repeated tests then consume the full 60-second test timeout waiting for `html[data-dashgpt-ready="true"]`, and CI retry repeats the same wait;
- the current browser fixture requires that readiness marker after every local demo navigation, but the application bootstrap does not emit it.

This turns one bootstrap/test-harness defect into a long sequence of 60s + 60s failures. The same behavior on untouched `develop` demonstrates a baseline verification defect rather than an F46 regression. Raising the job timeout would only hide it.

## Goal

Restore fast, reliable GitHub-hosted canonical verification with a pull-request wall-clock target below 10 minutes while preserving the complete healthy-run verification surface:

- keep `npm run verify:full` as the canonical local/full command;
- preserve all deterministic `npm run check` coverage;
- preserve both Playwright projects and CI retries;
- make demo readiness explicit and bounded so bootstrap failures fail in seconds rather than minutes;
- make browser tests independently runnable with fresh browser state;
- enable safe Playwright parallelism after isolation is explicit;
- parallelize desktop and mobile CI work at the GitHub-job level when useful for wall-clock time;
- stop systemic failing browser jobs after a small bounded number of failures while retaining full coverage on healthy runs;
- avoid non-verification install overhead where it is safe to do so.

## Scope

- `.github/workflows/check.yml` hosted CI setup and job-level parallelization;
- `playwright.config.mjs` bounded CI concurrency, fail-fast budget and isolation-compatible scheduling;
- `tests/playwright-fixture.mjs` bounded readiness waiting and explicit per-test state hygiene;
- demo bootstrap readiness signaling used by the test harness, without user-visible UI/API behavior changes;
- browser regression coverage for readiness/isolation behavior;
- deterministic regression verification for the hosted-CI contract;
- `package.json` wiring needed for those verifiers;
- OpenSpec/current development-state documentation for the verification behavior.

## Repository constraint discovered during specification

Current `develop` has no committed `package-lock.json`. F47 therefore MUST NOT pretend `npm ci` or lockfile-keyed npm caching is available, and MUST NOT silently introduce a repository-wide dependency-lock migration just to optimize this CI defect. The existing no-lifecycle-scripts install boundary remains intact.

## Non-goals

- changing user-facing product/API behavior;
- changing F46 Shared Chat smoke classification semantics;
- removing desktop or mobile browser coverage;
- disabling CI retries merely to reduce runtime;
- converting back to self-hosted runners;
- adding a package-lock/dependency-policy migration;
- masking the issue by increasing `timeout-minutes`.
