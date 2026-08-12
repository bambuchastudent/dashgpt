# Design: Per-conversation deferred ChatGPT retries

## Decision

Conversation-detail HTTP 429 responses become **task-local deferrals**, not queue-wide sleeps.

The source runtime keeps one bounded in-memory scheduling model:

```text
ready[]      -> eligible conversation tasks
inFlight     -> tasks currently issuing detail requests
deferred[]   -> tasks with nextRetryAt in the future
completed    -> projected/sent through the existing batch path
unresolved   -> exhausted/safe failures left for a later resumable run
```

The durable checkpoint does not change: imported cards in the existing local Vault remain the source of truth for completed work. Retry scheduling state is transient to the current ChatGPT source runtime.

## Task state

Each conversation that is missing/stale after discovery is represented transiently as:

```text
{
  item,                 // existing bounded conversation summary metadata
  attempt,              // number of 429 deferrals for this source in this run
  nextRetryAt,          // local epoch ms; 0 while ready
  lastStatus,           // safe numeric status, currently 429 when deferred
  lastErrorClass        // bounded safe label, never raw response content
}
```

No access token, cookie, account ID, authorization header, session object, request header set, or raw response body enters this task state.

## Request-layer split

`requestJson()` keeps responsibility for same-origin fetch, low bounded network concurrency, ordinary retryable server/network handling, and service-wide 503 safety behavior.

For **conversation-detail 429** specifically, `requestJson()` must not sleep and retry the same conversation internally. Instead it:

1. releases its network scheduler slot;
2. calculates the minimum per-source retry delay;
3. lowers adaptive detail concurrency conservatively without setting a global 429 cooldown;
4. throws/returns a safe structured rate-limit signal to the task scheduler.

The task scheduler owns the 429 attempt counter and deferral lifecycle.

This separation is important: sleeping inside a worker would still occupy one of the small number of workers and could block ready work when several conversations are throttled.

## Per-conversation retry delay

The retry policy is a small pure helper used by the generated source runtime and directly testable from Node verification.

Inputs:

- raw `Retry-After` value when present;
- task-local 429 attempt count;
- stable conversation/source ID;
- current time.

Rules:

1. If `Retry-After` is a valid delta-seconds or HTTP-date value, its delay is the **minimum** retry delay.
2. Otherwise use bounded exponential backoff from a conservative base delay.
3. Add a small deterministic per-source/per-attempt stagger after the minimum delay so tasks receiving the same server delay do not all re-enter at once.
4. Bound fallback exponential growth to a defined ceiling; guard absurd `Retry-After` values with a larger safety ceiling without retrying earlier than the accepted minimum inside that ceiling.
5. `nextRetryAt = now + computedDelay`; a deferred task is never promoted before that timestamp.

Deterministic source-based stagger is intentional: it has the anti-herd property of jitter while remaining reproducible in tests.

## Ready/deferred queue algorithm

Initial state:

```text
ready = every missing/stale conversation
deferred = []
inFlight = 0
```

A worker asks the queue for a task:

1. promote every deferred task whose `nextRetryAt <= now` back to ready;
2. if ready is non-empty, take one and increment `inFlight`;
3. if ready is empty but another task is in flight, wait on the existing bounded scheduler signal and re-check;
4. if ready and in-flight are empty but deferred has tasks, sleep until the earliest `nextRetryAt` (abortable by Pause), then re-check;
5. if all three are empty, this worker is complete.

On success:

- project the conversation through the unchanged bounded card projection;
- mark the task finished;
- decrement `inFlight`;
- let existing bounded batch persistence/ACK flow handle durability.

On conversation-detail 429:

- decrement `inFlight`;
- increment that task's attempt;
- if the configured per-run attempt ceiling has not been exceeded, set its `nextRetryAt` and move only that task to deferred;
- otherwise mark it `unresolved` for the next normal resumable import run;
- immediately wake queue waiters so a worker can take another ready task.

On other terminal detail failure:

- mark only that task unresolved using the existing safe failure behavior.

## Adaptive concurrency and service-wide signals

Feature 20's low bounded adaptive concurrency remains.

A 429 no longer sets global `cooldownUntil`. It may lower the current detail concurrency by one (minimum one) and reset the success streak. Sustained successful detail requests may cautiously restore concurrency up to the existing low maximum.

HTTP 503 remains a service-wide safety signal in this change:

- it may set shared `cooldownUntil`;
- it may reduce concurrency to one;
- ready tasks do not issue requests until that service cooldown expires.

This preserves a conservative escape hatch without treating every individual 429 as proof that every other conversation must stop.

## Progress semantics

Add a bounded `deferred`/waiting count to the existing progress payload/result projection. It is operational status, not a second job entity.

Mixed state example:

```text
Imported 384 of 2123
17 waiting to retry
1739 remaining overall
state = running
```

The import remains `running` while any ready or in-flight conversation can still make progress, even if some tasks are deferred.

Only when:

```text
ready = 0
inFlight = 0
deferred > 0
```

may the source publish the whole operation as `rate_limited` / `Waiting for ChatGPT`.

When the earliest deferred task becomes ready, the source publishes `running` again. Existing bounded BATCH progress snapshots carry the current deferred count during mixed progress; state-transition messages must not cause unbounded per-task whole-Vault rewrites.

The final `partial` state still uses `unresolved` for tasks intentionally left for a later run. A task currently cooling down is not counted as unresolved until it actually exhausts the current run's retry policy or the run is stopped.

## Pause/cancel

Pause continues to abort in-flight fetches through the existing `AbortController`.

The queue's all-deferred sleep is implemented with the same abortable sleep primitive. Therefore Pause:

- rejects queue sleeps promptly;
- prevents promotion/issuance of new deferred retries;
- sends the existing PAUSED message;
- leaves already durably imported cards untouched.

Deferred task state itself is not persisted. On a later launch, missing/stale conversation IDs naturally re-enter the normal discovery queue through Feature 20's existing durable-card freshness checkpoint.

## Receiver / progress storage

The receiver may extend the progress-card machine data with:

```text
deferred: <bounded non-negative count>
```

It does not persist per-source `attempt`, `nextRetryAt`, status, or error detail.

`SOURCE_STATE` is handled only for coarse `running`/`rate_limited` transitions; bounded BATCH progress carries mixed deferred counts. This avoids turning every task retry event into a full Vault save.

## Compatibility

Unchanged:

- `conversationId` identity and deterministic Result/Card ID;
- imported card source provenance;
- batch size and postMessage payload bounds;
- receiver ACK only after successful Vault persistence;
- retry after lost ACK via stable source freshness;
- existing card sanitization/privacy rules;
- My Dash/Search/Gallery/Dash membership semantics;
- completion/removal semantics of the operational import card.

## Branch overlap

Open Feature 23 / PR #48 packages the same generated source runner into browser-specific launch adapters. F24 does not alter launcher behavior. When branches integrate, the launcher must consume the final F24 runner without reintroducing the old queue-wide 429 cooldown.

## Verification design

Deterministic tests should exercise the pure retry-delay helper and generated-runner contracts, including:

- `Retry-After: 3` produces a delay >= 3000 ms;
- an HTTP-date in the future is not retried earlier than that date;
- fallback backoff grows with attempts and remains bounded;
- two different source IDs receive different deterministic stagger values for the same minimum delay;
- the generated runner contains separate ready/deferred queue state and does not route detail 429 through global cooldown;
- global service cooldown remains reachable for 503;
- deferred progress count crosses the bridge without credentials/raw bodies.

A browser/source-runtime regression should simulate or assert the lifecycle where one task is deferred and a later ready task still completes before the first task's retry time. Existing import identity, Vault, privacy and mobile/browser tests stay in the full gate.
