# Design

## Confirmed baseline and profile

Two independent hosted runs on the same repository baseline shape exhausted the `DashGPT checks` 30-minute budget inside browser verification:

- clean `develop` at `89e173911d578d6dd6f922b4c64a369e48eac799` — run `34035512940`;
- F46 exact head `4fef4918a16df6d870a599f9127983af819296bb` — run `34035886804`.

Profiling showed dependency setup around one minute, `npm run check` in seconds, and almost all remaining time in browser waits. The first root cause was an impossible readiness condition: the fixture waited for `html[data-dashgpt-ready="true"]` although bootstrap never emitted it, turning failures into repeated 60s + retry waits.

After readiness/fail-fast/parallel scheduling was implemented, exact-head run `34164814621` completed 89 desktop tests in 4.8 minutes and 91 mobile tests in 5.8 minutes before bounded failure completion. The remaining runtime was concentrated in test-harness problems rather than general suite throughput:

- device-reset synchronization treated an already-matching pathname as proof a replacement navigation had completed;
- Google Drive disconnect clicked while the earlier account-adoption reload was still replacing the DOM;
- the 2200-card gallery layout stress case bootstrapped the full application and Vault machinery even though its assertion target is gallery ordering/layout behavior.

## Optimization strategy

### 1. Repair the readiness contract and make it fail fast

Expose one explicit testability readiness signal after DashGPT demo bootstrap is genuinely complete. Keep readiness waiting separate from the general Playwright test timeout. CI uses a dedicated timeout no greater than 5 seconds; a broken bootstrap fails in seconds rather than consuming the 60-second test timeout. Preserve `retries: 1`.

### 2. Make browser state isolation explicit

Every test runs in a fresh Playwright BrowserContext with no persisted cookies/localStorage/sessionStorage/storageState from another test. Add regression coverage proving browser-local state does not leak. With this isolation contract in place, use `fullyParallel: true`.

### 3. Synchronize tests with completed navigation, not incidental intermediate state

Tests that intentionally cause reload/navigation wait for the post-navigation document/readiness condition that uniquely identifies the new document. They do not treat an already-matching pathname, a binding write that occurs before reload, or a transiently visible button as proof navigation completed.

Storage seeding through `addInitScript` is one-shot when the tested behavior itself reloads; otherwise the seed can overwrite the behavior under test after navigation.

### 4. Isolate the 2200-card gallery stress case from unrelated app startup

The stress test exists to verify that the gallery module can order and lay out 2200 cards as a one-screen heat map in a real Chromium viewport. Bootstrapping the entire application, import plumbing, Vault persistence and unrelated UI for that one assertion adds cost and confounds failures.

Use a same-origin component harness inside the Playwright test:

- open a lightweight same-origin resource without DashGPT application bootstrap;
- install minimal gallery DOM required by `gallery-overview-sorting.js`;
- seed the real Vault-shaped 2200 Result fixture in that isolated test context;
- dynamically import and initialize the real gallery overview module;
- drive the real density control and assert the same heat-map representation, card count/order, palette bounds and viewport overflow/layout properties;
- keep ordinary end-to-end app tests responsible for bootstrap, routing and card interaction behavior.

This preserves real browser/CSS/module coverage while removing unrelated startup work. The stress test must not be replaced with a pure unit test or reduced card count merely for speed.

### 5. Use bounded worker parallelism

Use two Playwright workers per browser job. This allows useful overlap without oversubscribing a standard hosted runner.

### 6. Parallelize desktop and mobile at the GitHub-job level

Run desktop Chromium and mobile Chromium as separate hosted jobs so they receive separate runner CPU/memory. The hosted required gate is decomposed into deterministic `npm run check`, desktop Chromium, mobile Chromium, and a lightweight final `check` aggregator preserving the existing required-check name.

Collectively these jobs remain equivalent to the canonical full verification surface. `npm run verify:full` remains the canonical local/full command and is run once on the final implementation head before merge.

### 7. Fail systemic browser breakage early

Healthy runs execute the complete browser surface. Failing browser jobs stop after a small `maxFailures` budget so a systemic defect returns a red signal quickly while retaining enough failures for diagnosis.

### 8. Enforce a sub-10-minute hosted budget

Use explicit per-job budgets: deterministic at most 5 minutes, each desktop/mobile browser job at most 9 minutes, and final aggregator at most 2 minutes. Because browser projects run concurrently, workflow wall-clock is the longest browser shard plus a short aggregator rather than the sum of both projects.

### 9. Keep dependency policy unchanged; remove avoidable install work

Current `develop` has no committed `package-lock.json`, so F47 does not introduce `npm ci`, lockfile-keyed caching or a new dependency-lock policy. Keep `npm install --ignore-scripts` and suppress audit/funding work (`--no-audit --no-fund`).

## Regression contract

Verification rejects accidental regressions including a missing readiness signal, readiness timeout reverting to the 60-second test timeout, shared/persistent Playwright state, loss of desktop/mobile coverage, disabled CI retries, loss of bounded workers or `maxFailures`, loss of the final `check` aggregator, browser-job timeout above the sub-10-minute budget, navigation tests regressing to transient pre-reload synchronization, the 2200-card stress test returning to a slow full-app bootstrap path or reducing its real card/layout coverage, and any return to self-hosted runners.

## Performance acceptance

Acceptance requires deterministic checks in their own fast job, desktop/mobile browser jobs running concurrently, complete healthy-run project coverage, normal PR feedback below 10 minutes, systemic readiness failure preferably visible under 2 minutes after setup, no browser job longer than 9 minutes, the isolated 2200-card gallery stress case retaining real Chromium layout coverage without dominating shard runtime, and final canonical `npm run verify:full` succeeding on the implementation head before merge.

## Risks and trade-offs

Job-level parallelization increases concurrent runner usage while reducing developer wall-clock. `fullyParallel: true` exposes hidden order coupling, so context isolation and navigation synchronization are explicit. The isolated gallery harness must exercise the real module and CSS behavior rather than a simplified mock. The repository still resolves npm dependencies without a committed lockfile; F47 does not broaden into dependency-policy work.
