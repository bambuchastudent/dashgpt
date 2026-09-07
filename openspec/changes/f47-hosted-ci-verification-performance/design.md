# Design

## Confirmed baseline and profile

Two independent hosted runs on the same repository baseline shape exhausted the `DashGPT checks` 30-minute budget inside browser verification:

- clean `develop` at `89e173911d578d6dd6f922b4c64a369e48eac799` — run `34035512940`;
- F46 exact head `4fef4918a16df6d870a599f9127983af819296bb` — run `34035886804`.

The F47 profiling run confirms the time distribution:

- npm dependency install: ~31 seconds;
- Chromium/dependency provisioning: ~25 seconds;
- `npm run check`: ~5 seconds;
- browser phase: virtually the entire remaining job budget.

The browser phase is not slow because healthy tests need 30 minutes. It is repeatedly waiting for an impossible readiness condition. `tests/playwright-fixture.mjs` waits for `html[data-dashgpt-ready="true"]` after local demo navigation, but current demo bootstrap never emits that marker. Each affected test therefore burns the global 60-second test timeout, then `retries: 1` burns another 60 seconds. With many affected tests, the job reaches 30 minutes before useful suite completion.

## Optimization strategy

### 1. Repair the readiness contract and make it fail fast

Expose one explicit testability readiness signal after DashGPT demo bootstrap is genuinely complete. The signal is not user-facing product state; it exists so browser automation can distinguish "application ready" from "application failed to initialize".

Keep the browser fixture readiness wait separate from the general Playwright test timeout. Local demo readiness should normally settle in well under a second; CI therefore uses a small bounded readiness timeout (target 5 seconds). A broken bootstrap must fail in seconds, not consume the 60-second test timeout.

Preserve `retries: 1`, but a retry of a readiness failure repeats only the small readiness budget.

### 2. Make browser state isolation explicit

Every test must run in a fresh Playwright BrowserContext with no persisted cookies/localStorage/sessionStorage/storageState from another test. The shared demo server remains read-only/static and is not a state-sharing channel.

Add regression coverage proving browser-local state written by one isolated context is not visible to another. Do not introduce shared mutable filesystem fixtures or a shared persistent profile.

Once this isolation contract is in place, enable `fullyParallel: true` so tests from the same spec file may run concurrently without relying on file ordering.

### 3. Use bounded worker parallelism

Use a bounded worker count appropriate to GitHub-hosted runners rather than unbounded CPU-derived defaults. Two workers per browser job is the initial ceiling. This allows useful overlap without oversubscribing a standard hosted runner.

### 4. Parallelize desktop and mobile at the GitHub-job level

Desktop Chromium and mobile Chromium are independent projects. Run them as separate hosted jobs so they receive separate runner CPU/memory instead of competing inside one 2-core machine.

The hosted required gate may therefore be decomposed into:

- deterministic `npm run check` job;
- desktop Chromium browser job;
- mobile Chromium browser job.

Collectively these jobs MUST be equivalent to the canonical full verification surface. `npm run verify:full` remains the canonical local/full command and must be run once on the final implementation head before merge, while PR CI is optimized for wall-clock through equivalent parallel jobs.

### 5. Fail systemic browser breakage early

Healthy runs execute the complete browser surface. Failing browser jobs should not continue through dozens of identical bootstrap failures. Configure a small CI `maxFailures` budget so a systemic defect returns a red signal quickly while still providing more than one failure for diagnosis.

This does not weaken healthy-run coverage; it bounds wasted runtime after the job is already conclusively failing.

### 6. Keep dependency policy unchanged; remove avoidable install work

Current `develop` has no committed `package-lock.json`, so F47 does not introduce `npm ci`, lockfile-keyed caching, or a new dependency-lock policy. Keep `npm install --ignore-scripts` semantics and suppress install-time audit/funding work that is not part of repository verification (`--no-audit --no-fund`).

## Regression contract

Extend deterministic verification so accidental regressions are rejected, including:

- readiness marker required by the browser fixture but not emitted by bootstrap;
- readiness timeout reverting to the 60-second test timeout;
- shared/persistent Playwright storage state across tests;
- losing desktop or mobile Chromium coverage;
- disabling CI retries;
- removing bounded worker scheduling;
- reverting to serialized file-level execution without an explicit reason;
- removing the CI max-failure bound;
- hosted CI no longer collectively executing deterministic + desktop + mobile verification;
- switching required checks back to self-hosted runners.

## Performance acceptance

The primary product-development target is pull-request feedback below 10 minutes under normal GitHub-hosted execution. Acceptance requires:

- deterministic check completion in its own fast job;
- desktop and mobile browser jobs executing concurrently;
- healthy browser jobs completing their full project coverage;
- systemic readiness/bootstrap failure becoming visible in well under 10 minutes and preferably under 2 minutes after setup;
- final canonical `npm run verify:full` completing on the implementation head before merge.

The existing 30-minute timeout remains a hard safety ceiling, not an expected runtime.

## Risks and trade-offs

Job-level desktop/mobile parallelization increases concurrent runner usage and may increase total runner-minutes while substantially lowering developer wall-clock. This is an intentional trade-off for PR feedback latency.

`fullyParallel: true` is safe only because each test uses isolated browser context state and the test suite does not rely on shared mutable filesystem/server state. Regression coverage protects this assumption.

The repository still resolves dependencies without a lockfile. F47 intentionally does not broaden into dependency-policy work.
