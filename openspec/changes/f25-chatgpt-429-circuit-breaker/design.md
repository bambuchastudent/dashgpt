# Design: ChatGPT 429 circuit breaker and staged retry backoff

## Scheduling model

Keep Feature 24's bounded task queues:

```text
ready[]
running
 deferred[]
completed[]
unresolved
```

Each conversation remains independently retryable. F25 adds provider-pressure state to the existing detail-request scheduler:

```text
{
  limit,
  active,
  cooldownUntil,
  successStreak,
  rateLimitStreak,
  lastRateLimitAt
}
```

This state is transient to the source runtime and contains no credentials or raw provider data.

## Per-conversation retry stages

Fallback retry stages are fixed and deterministic:

```text
attempt 1 -> 5 seconds
attempt 2 -> 15 seconds
attempt 3 -> 30 seconds
attempt 4 -> 60 seconds
attempt 5 -> 120 seconds
attempt 6+ -> 300 seconds
```

A valid `Retry-After` header is treated as a minimum delay. The final delay is:

```text
max(stageDelay, retryAfterDelay) + deterministicSourceStagger
```

The stagger stays small and deterministic so retries for many conversations do not re-enter at exactly the same millisecond while tests remain reproducible.

## Soft circuit breaker

A conversation-detail 429 has two effects:

1. defer that conversation using its own staged retry time;
2. signal provider pressure to the shared detail scheduler.

Provider-pressure handling:

- immediately reduce detail concurrency to 1;
- set or extend a short shared cooldown before any new detail request can acquire the scheduler;
- do not move unrelated ready tasks into the deferred queue;
- after the shared cooldown, continue walking ready tasks one at a time;
- if another 429 arrives soon after, extend the shared cooldown conservatively;
- successful detail requests reduce the rate-limit streak and, after a sustained success streak, may restore concurrency up to the existing low maximum.

The shared cooldown is deliberately much shorter than the per-conversation 5..300 second retry stages. Its purpose is to stop a burst, not to make one throttled conversation block unrelated work.

### Circuit-breaker delay

Use a bounded short provider-pressure schedule such as:

```text
first recent 429  -> 5 seconds
second            -> 10 seconds
third             -> 15 seconds
later             -> 30 seconds max
```

A provider `Retry-After` on the triggering response may raise this minimum. This cooldown gates new detail request acquisition through the existing scheduler.

The rate-limit streak should decay/reset after a quiet period or enough successful requests so one old 429 does not permanently slow the import.

## Why not clear cache

HTTP 429 is an explicit server response indicating request pressure/quota. Clearing browser HTTP cache or Safari website data does not reliably change that server-side decision. It can also destroy authentication/session state or local DashGPT progress and cause unnecessary replay.

Therefore F25 SHALL NOT use cache clearing as automatic rate-limit recovery.

## Progress semantics

The source runtime already tracks:

- `processedCurrent`: chats whose current-run task is completed/skipped/unresolved;
- `importedThisRun`: cards accepted/updated by receiver ACK;
- `deferredCurrent`;
- `unresolved`.

The overlay must make the distinction explicit. Example:

```text
205 / 2104 processed
193 saved in DashGPT
9 waiting to retry
0 for next launch
```

`importedThisRun` alone is not the total saved count because some cards may have existed before this run and were skipped as current. The source has `knownFreshness` from receiver handshake, so a truthful durable count can be reported as:

```text
savedTotal = known-current-at-start + accepted/updated this run
```

If receiver ACK payloads expose an authoritative total imported count, prefer that instead. The displayed number must represent durable receiver/Vault state, not merely projected or buffered cards.

Batching remains bounded and ACK remains the durability boundary.

## Pause/resume

Pause aborts in-flight requests and shared/deferred waits through the existing AbortController. No retry timer is persisted.

On a later launch:

- durable cards reconstruct completed work;
- missing/stale conversations are rediscovered;
- retry stages start fresh for those missing conversations;
- no completed card is replayed solely because the prior source runtime was closed.

## Compatibility and superseded F24 decision

Preserved from F24:

- per-conversation deferred tasks;
- unrelated ready work can still proceed;
- bounded low concurrency;
- transient credential-free retry state;
- durable Vault checkpoint;
- no per-task whole-Vault rewrite.

Superseded from F24:

- detail 429 is no longer forbidden from setting shared `cooldownUntil`.

The new rule is: detail 429 MUST defer only its own conversation, but MAY/SHALL also activate a short shared provider-pressure cooldown that gates new detail requests without delaying them until that conversation's own retry time.

## Verification

Targeted verification should prove:

- delay helper follows 5/15/30/60/120/300 stages;
- Retry-After remains a minimum;
- source stagger remains deterministic;
- 429 calls both per-task deferral and provider-pressure throttling;
- circuit breaker reduces concurrency to one and sets shared cooldown;
- ready tasks are not moved to deferred because of another task's 429;
- a later ready task can execute after the short shared cooldown but before the first task's longer retry time;
- repeated 429s extend the short cooldown instead of creating a request burst;
- successful requests can recover concurrency;
- progress distinguishes processed and durable saved counts;
- no browser cache/storage clearing code is introduced.
