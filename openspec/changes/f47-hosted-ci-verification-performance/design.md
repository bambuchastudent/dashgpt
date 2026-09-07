# Design

## Confirmed baseline

Two independent hosted runs on the same repository baseline shape exhausted the `DashGPT checks` 30-minute budget inside `npm run verify:full`:

- clean `develop` at `89e173911d578d6dd6f922b4c64a369e48eac799` — run `34035512940`;
- F46 exact head `4fef4918a16df6d870a599f9127983af819296bb` — run `34035886804`.

PR #117 did not introduce the 30-minute limit; it replaced the self-hosted runner with `ubuntu-latest` and changed Chromium provisioning to include Linux dependencies. The timeout therefore reflects hosted-runner execution performance, not a new looser/tighter policy.

## Optimization strategy

Use the least risky forms of parallelism first and preserve the canonical command.

### 1. Keep dependency policy unchanged; remove avoidable install work

Current `develop` has no committed `package-lock.json`, so F47 does not introduce `npm ci`, lockfile-keyed caching, or a new dependency-lock policy. Keep `npm install --ignore-scripts` semantics and suppress install-time audit/funding work that is not part of repository verification (`--no-audit --no-fund`).

A future lockfile migration can be specified separately if the project wants deterministic dependency resolution; it is not needed to fix this browser scheduling defect.

### 2. Explicit Playwright CI concurrency

The browser suite has two Chromium projects (desktop and mobile) and `fullyParallel: false`. Preserve that setting so tests within a spec keep their existing ordering assumptions. Configure a bounded explicit CI worker count rather than relying on the hosted runner's CPU-derived default.

Use two CI workers. This permits file/project work to overlap while avoiding unbounded Chromium processes. Local/non-CI behavior remains Playwright default behavior.

Do not remove `retries: 1`; retry cost is paid only when a test needs a retry and remains valuable flake diagnostics.

### 3. Preserve one canonical gate

`npm run verify:full` remains `npm run check && npm run test:browser`. The normal `DashGPT checks` workflow continues invoking that exact command so repository policy, local reproduction and required CI all describe the same gate.

### 4. Regression contract

Add a deterministic verifier for the hosted-CI performance contract. It should reject accidental regressions such as:

- switching the canonical job away from hosted Ubuntu;
- re-enabling install lifecycle scripts or unnecessary audit/funding work;
- no longer invoking `npm run verify:full`;
- removing either desktop or mobile Chromium project;
- disabling CI retries;
- reverting CI worker scheduling to an unbounded or effectively serial configuration;
- weakening `fullyParallel: false` without a separate isolation review.

Wire the verifier into `npm run check` so future CI/config edits must update the contract deliberately.

## Escalation if two workers are insufficient

If the exact-head hosted benchmark still approaches/exceeds the 30-minute job budget, update this OpenSpec before widening implementation to GitHub job-level project/shard matrices. Matrix sharding can reduce wall-clock further but changes CI architecture, required-check aggregation and runner-minute consumption, so it is not silently mixed into the first implementation.

## Performance acceptance

A successful exact-head `DashGPT checks` run must complete `npm run verify:full` inside the existing 30-minute job timeout with material headroom. The preferred target is below 20 minutes on normal hosted execution; the hard contract is coverage-preserving completion within the configured budget, not a guaranteed cloud-runtime SLA.

## Risks and trade-offs

Two browser workers consume more CPU/memory concurrently than an effectively serial hosted run. This is bounded and observable. Because `fullyParallel` remains false, concurrency stays at the spec-file/project scheduler layer rather than forcing tests from the same file to execute concurrently.

The repository still resolves dependencies without a lockfile. F47 intentionally does not broaden into dependency-policy work; its regression verifier protects the existing install safety boundary rather than claiming reproducibility that the repository does not currently provide.
