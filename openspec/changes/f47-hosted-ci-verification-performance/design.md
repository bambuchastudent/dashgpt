# Design

## Confirmed baseline and profile

Two independent hosted runs on the same repository baseline shape exhausted the `DashGPT checks` 30-minute budget inside browser verification:

- clean `develop` at `89e173911d578d6dd6f922b4c64a369e48eac799` — run `34035512940`;
- F46 exact head `4fef4918a16df6d870a599f9127983af819296bb` — run `34035886804`.

Profiling showed dependency setup around one minute, `npm run check` in seconds, and almost all remaining time in browser waits. The first root cause was an impossible readiness condition: the fixture waited for `html[data-dashgpt-ready="true"]` although bootstrap never emitted it, turning failures into repeated 60s + retry waits.

After readiness/fail-fast/parallel scheduling was implemented, exact-head run `34164814621` completed 89 desktop tests in 4.8 minutes and 91 mobile tests in 5.8 minutes before bounded failure completion. The remaining runtime was concentrated in three concrete cases rather than general suite throughput:

- device-reset test synchronization raced the navigation it was trying to observe;
- Google Drive disconnect clicked while the account-adoption reload was still replacing the DOM;
- the 2200-card stress fixture exceeded the 5-second readiness budget because local-only startup redundantly re-persisted the already-materialized Vault.

## Optimization strategy

### 1. Repair the readiness contract and make it fail fast

Expose one explicit testability readiness signal after DashGPT demo bootstrap is genuinely complete. Keep readiness waiting separate from the general Playwright test timeout. CI uses a dedicated timeout no greater than 5 seconds; a broken bootstrap must fail in seconds, not consume the 60-second test timeout.

Preserve `retries: 1`, but a retry of a readiness failure repeats only the small readiness budget.

### 2. Make browser state isolation explicit

Every test runs in a fresh Playwright BrowserContext with no persisted cookies/localStorage/sessionStorage/storageState from another test. Add regression coverage proving browser-local state written by one context is not visible to another. Do not introduce shared mutable filesystem fixtures or a shared persistent profile.

With this isolation contract in place, use `fullyParallel: true` so tests from the same spec file may run concurrently without relying on ordering.

### 3. Synchronize tests with completed navigation, not incidental intermediate state

Tests that intentionally cause a reload/navigation must wait for the post-navigation URL/readiness condition that uniquely identifies the new document. They must not treat an already-matching pathname, a binding write that occurs before reload, or a transiently visible button as proof that navigation has completed.

Fixtures that seed browser storage through `addInitScript` must be one-shot when the tested behavior itself reloads the page; otherwise the seed can overwrite the result after navigation and create false failures.

### 4. Remove redundant local-only large-Vault persistence

`reloadFromVault()` loads the existing local Vault, materializes Results and then currently calls `persistRuntimeResults()`. On a local-only personal route there is no published catalog to merge, so this writes the same already-stored Results back into the same Vault.

That is disproportionately expensive because each `putResult()` validates the whole Vault and linearly searches Results, and each favorite update also validates state. Repeating those operations for thousands of already-present Results creates superlinear startup work and blocked the main thread for the 2200-card stress case.

The startup fast path is semantic, not test-only:

- when no published Results are being reconciled, treat the materialized local Vault as already durable;
- skip Result/favorite re-upsert and avoid a redundant Vault save;
- still update runtime rendering/storage status/summary normally;
- when published Results are present and must be merged with local state, preserve the existing persistence path so merged durable state is written exactly as before;
- explicit user mutations such as create/update/favorite continue using the normal persistence path.

Regression coverage must prove large local Vault startup reaches readiness within the dedicated readiness budget and that stored Results are not lost or rewritten semantically.

### 5. Use bounded worker parallelism

Use two Playwright workers per browser job. This allows useful overlap without oversubscribing a standard hosted runner.

### 6. Parallelize desktop and mobile at the GitHub-job level

Run desktop Chromium and mobile Chromium as separate hosted jobs so they receive separate runner CPU/memory. The hosted required gate is decomposed into deterministic `npm run check`, desktop Chromium, mobile Chromium, and a lightweight final `check` aggregator preserving the existing required-check name.

Collectively these jobs remain equivalent to the canonical full verification surface. `npm run verify:full` remains the canonical local/full command and is run once on the final implementation head before merge.

### 7. Fail systemic browser breakage early

Healthy runs execute the complete browser surface. Failing browser jobs stop after a small `maxFailures` budget so a systemic defect returns a red signal quickly while retaining enough failures for diagnosis.

### 8. Enforce a sub-10-minute hosted budget

Use explicit per-job budgets:

- deterministic job: at most 5 minutes;
- each desktop/mobile browser job: at most 9 minutes;
- final aggregator: at most 2 minutes.

Because browser projects run concurrently, workflow wall-clock is the longest browser shard plus a short aggregator rather than the sum of both projects.

### 9. Keep dependency policy unchanged; remove avoidable install work

Current `develop` has no committed `package-lock.json`, so F47 does not introduce `npm ci`, lockfile-keyed caching or a new dependency-lock policy. Keep `npm install --ignore-scripts` and suppress audit/funding work (`--no-audit --no-fund`).

## Regression contract

Deterministic/browser verification rejects accidental regressions including:

- readiness marker required but not emitted;
- readiness timeout reverting to the 60-second test timeout;
- shared/persistent Playwright state;
- loss of desktop or mobile Chromium coverage;
- disabled CI retries;
- loss of bounded worker scheduling or `maxFailures`;
- hosted CI no longer collectively executing deterministic + desktop + mobile verification;
- loss of the final required `check` aggregator;
- browser-job timeout above the sub-10-minute budget;
- local-only startup reintroducing redundant per-Result persistence that makes the large-Vault readiness stress case miss the fast readiness budget;
- switching required checks back to self-hosted runners.

## Performance acceptance

Acceptance requires deterministic checks in their own fast job, desktop/mobile browser jobs running concurrently, complete healthy-run project coverage, normal PR feedback below 10 minutes, systemic readiness failure preferably visible under 2 minutes after setup, no browser job longer than 9 minutes, the 2200-card local startup stress case completing inside the browser readiness contract, and final canonical `npm run verify:full` succeeding on the implementation head before merge.

## Risks and trade-offs

Job-level parallelization increases concurrent runner usage while reducing developer wall-clock. `fullyParallel: true` exposes hidden order coupling, so context isolation and navigation synchronization are explicit. The large-Vault fast path must only skip writes that are provably redundant; published/local reconciliation and user mutations retain the durable write path. The repository still resolves npm dependencies without a committed lockfile; F47 does not broaden into dependency-policy work.
