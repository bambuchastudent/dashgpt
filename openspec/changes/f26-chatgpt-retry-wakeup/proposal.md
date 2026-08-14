# F26 — ChatGPT deferred retry wakeup

## Problem

A real progressive ChatGPT history import can accumulate dozens of conversations in `waiting to retry` after detail 429 responses and then appear permanently stalled. The source runner currently waits on ordinary page timers; Safari may heavily throttle or suspend those when the ChatGPT tab is backgrounded. The F25 circuit breaker also computes a per-detail retry delay but does not apply that delay to the shared scheduler cooldown, so other ready tasks can continue probing while provider pressure is still active.

## Change

- Replace the deferred-queue long sleep with a scheduler wait that can be explicitly awakened.
- Wake the source scheduler on focus/visibility recovery and on a validated receiver `CONTROL_WAKE` message.
- While the receiver sees `rate_limited`, send a bounded wake heartbeat to the authenticated source window and stop it as soon as running resumes or the receiver unloads.
- Pass the computed detail retry delay into the shared 429 cooldown so one provider-pressure event gates the queue instead of creating a rolling retry storm.
- Keep existing deterministic conversation IDs and durable Vault cards as the resume checkpoint; no reset or completed-ID ledger is introduced.

## Non-goals

- No server-side scraping or storage of ChatGPT history.
- No attempt to bypass provider rate limits.
- No extension/service-worker dependency.
