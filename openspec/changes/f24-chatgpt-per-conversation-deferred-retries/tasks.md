# Tasks: Per-conversation deferred ChatGPT retries

## 1. Spec and overlap

- [x] Inspect Feature 20 spec/design and current `develop` source runner, receiver/progress projection, verifier and browser-test surfaces.
- [x] Confirm Issue #42 supersedes Feature 20's default queue-wide behavior only for conversation-detail HTTP 429; keep 503 as a separate service-wide safety signal.
- [x] Record overlap with open Feature 23 / PR #48 without adopting launcher scope.
- [ ] Strictly validate `f24-chatgpt-per-conversation-deferred-retries` before production-code edits.

## 2. Retry policy and task queue

- [ ] Add a directly testable per-conversation 429 delay policy that honors valid `Retry-After`, otherwise uses bounded exponential backoff, and staggers retries by source/attempt.
- [ ] Refactor conversation-detail 429 handling so the request layer returns a safe task-local defer signal instead of sleeping/global-cooling the whole queue.
- [ ] Add transient ready/in-flight/deferred/unresolved task scheduling with `nextRetryAt` promotion and no busy loop when all remaining tasks are deferred.
- [ ] Ensure one deferred task immediately frees a worker for unrelated ready tasks.
- [ ] Keep adaptive concurrency bounded and let individual 429 lower concurrency without setting global 429 cooldown.
- [ ] Preserve a conservative service-wide cooldown path for HTTP 503.
- [ ] Ensure Pause/cancel aborts in-flight requests and all-deferred sleeps and prevents new retries.

## 3. Progress integration

- [ ] Extend bounded import progress with a deferred/waiting count without persisting per-source retry timers.
- [ ] Keep mixed ready/deferred work in `running`; expose global `rate_limited` / `Waiting for ChatGPT` only when ready and in-flight work are empty while deferred work remains.
- [ ] Preserve `partial`/unresolved semantics for conversations left for a later resumable run.
- [ ] Avoid per-retry whole-Vault writes; use bounded batch progress plus coarse state-transition messages.

## 4. Regression verification

- [ ] Add deterministic retry-policy tests for delta-seconds `Retry-After`, HTTP-date `Retry-After`, increasing fallback backoff, upper bounds and per-source stagger.
- [ ] Add generated-runner/static contracts proving conversation 429 no longer routes through shared cooldown while 503 still can.
- [ ] Add/extend a source-runtime or browser regression proving a later ready conversation can complete while an earlier conversation is deferred.
- [ ] Re-run existing identity, freshness, batch persistence, privacy, storage-budget, pause/resume and browser import regressions.
- [ ] Run `npm run verify:fast` during implementation.
- [ ] Run canonical `npm run verify:full` once on the final implementation head before merge while repository infrastructure permits.

## 5. Acceptance and handoff

- [ ] Verify a production preview or equivalent served browser build has no import-progress/mobile regression.
- [ ] Run a real authenticated ChatGPT import acceptance where practical: observe at least one 429/defer, continued progress on other conversations, and duplicate-free resume.
- [ ] Update this task list and current-state handoff/PR description with exact verification evidence and any infrastructure blocker.
