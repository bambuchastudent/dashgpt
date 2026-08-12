# Tasks: Per-conversation deferred ChatGPT retries

## 1. Spec and overlap

- [x] Inspect Feature 20 spec/design and current `develop` source runner, receiver/progress projection, verifier and browser-test surfaces.
- [x] Confirm Issue #42 supersedes Feature 20's default queue-wide behavior only for conversation-detail HTTP 429; keep 503 as a separate service-wide safety signal.
- [x] Record overlap with open Feature 23 / PR #48 without adopting launcher scope.
- [x] Strictly validate `f24-chatgpt-per-conversation-deferred-retries` before production-code edits. GitHub Actions remained blocked at repository/account infrastructure, so the exact official OpenSpec 1.8.0 command `openspec validate f24-chatgpt-per-conversation-deferred-retries --type change --strict --no-interactive` ran as a validation-only Cloudflare Worker preview `postinstall`; the Cloudflare build for commit `be8354959550ceb2e1232a797c886acc560287ce` completed successfully before any production JavaScript was edited.

## 2. Retry policy and task queue

- [x] Add a directly testable per-conversation 429 delay policy that honors valid `Retry-After`, otherwise uses bounded exponential backoff, and staggers retries by source/attempt.
- [x] Refactor conversation-detail 429 handling so the request layer returns a safe task-local defer signal instead of sleeping/global-cooling the whole queue.
- [x] Add transient ready/in-flight/deferred/unresolved task scheduling with `nextRetryAt` promotion and no busy loop when all remaining tasks are deferred.
- [x] Ensure one deferred task immediately frees a worker for unrelated ready tasks.
- [x] Keep adaptive concurrency bounded and let individual 429 lower concurrency without setting global 429 cooldown.
- [x] Preserve a conservative service-wide cooldown path for HTTP 503.
- [x] Ensure Pause/cancel aborts in-flight requests and all-deferred sleeps and prevents new retries.

## 3. Progress integration

- [x] Extend bounded import progress with a deferred/waiting count without persisting per-source retry timers.
- [x] Keep mixed ready/deferred work in `running`; expose global `rate_limited` / `Waiting for ChatGPT` only when ready and in-flight work are empty while deferred work remains.
- [x] Preserve `partial`/unresolved semantics for conversations left for a later resumable run.
- [x] Avoid per-retry whole-Vault writes; use bounded batch progress plus coarse state-transition messages.

## 4. Regression verification

- [x] Add deterministic retry-policy tests for delta-seconds `Retry-After`, HTTP-date `Retry-After`, increasing fallback backoff, upper bounds and per-source stagger.
- [x] Add generated-runner/static contracts proving conversation 429 no longer routes through shared cooldown while 503 still can.
- [x] Add/extend a source-runtime or browser regression proving a later ready conversation can complete while an earlier conversation is deferred.
- [ ] Re-run existing identity, freshness, batch persistence, privacy, storage-budget, pause/resume and browser import regressions. The deterministic identity/freshness/batch/privacy/storage subset plus new F24 contracts passed in the targeted Cloudflare build for commit `2f7f62e52236c87e6c29a1b3af9bbaa82725cb02`; executable browser regressions remain pending.
- [ ] Run `npm run verify:fast` during implementation. A dedicated Cloudflare validation build was started on commit `9c6bd47d59f3fb78139a755a0950728f5b7fa6a5` but remained `in_progress` without a conclusion; the temporary `postinstall` hook was removed and this gate is not claimed as passed.
- [ ] Run canonical `npm run verify:full` once on the final implementation head before merge while repository infrastructure permits. GitHub Actions currently refuses to start repository jobs because of the account billing/spending-limit blocker.

## 5. Acceptance and handoff

- [ ] Verify a production preview or equivalent served browser build has no import-progress/mobile regression. The clean final head `6c8c086a08f2418d83b7bb921a7a0a69ecb63038` deployed successfully to the Cloudflare preview alias, but visual desktop/mobile acceptance has not been claimed.
- [ ] Run a real authenticated ChatGPT import acceptance where practical: observe at least one 429/defer, continued progress on other conversations, and duplicate-free resume.
- [x] Update this task list and PR description with exact implementation/verification evidence, the Cloudflare preview, the pending browser/full/real acceptance gates, and the GitHub Actions billing/spending-limit blocker.
