# Proposal: ChatGPT 429 circuit breaker and staged retry backoff

## Why

Feature 24 changed conversation-detail HTTP 429 handling from queue-wide blocking to per-conversation deferred retries. That prevents one throttled chat from freezing unrelated work, but real Safari imports show a second failure mode: while individual tasks are deferred, the runner can continue issuing fresh detail requests quickly enough to produce a burst of additional 429 responses across the queue.

The source overlay also currently reports `processed` before all projected cards have been persisted and ACKed by DashGPT. Because cards are flushed in bounded batches, the source can legitimately be ahead of the durable Vault by part of a batch, which looks like lost cards to the user.

## What changes

1. Replace the generic fallback exponential delay for conversation-detail 429 with the explicit staged schedule:

   `5s -> 15s -> 30s -> 60s -> 120s -> 300s`

   A valid provider `Retry-After` remains a minimum and is never violated. A small deterministic per-source stagger may still be added after the minimum delay.

2. Treat a detail 429 as both:
   - a per-conversation deferral; and
   - a provider-pressure signal that activates a short shared circuit-breaker cooldown and reduces detail concurrency to one.

3. Keep walking unrelated ready conversations after the short shared cooldown. Do not block the queue for the full retry delay of the conversation that received 429.

4. Repeated 429s extend the circuit breaker conservatively. Sustained successful detail responses allow cautious recovery to the existing low maximum concurrency.

5. Expose source progress with distinct meanings for:
   - processed in the current source runtime;
   - durably saved/ACKed in DashGPT;
   - deferred/waiting to retry;
   - unresolved for a later launch.

6. Do not clear browser HTTP cache, Safari website data, authentication state, or the durable DashGPT Vault in response to 429. Cache clearing is not a reliable remedy for provider rate limits and risks replaying already completed work.

## Scope

In scope:

- generated ChatGPT source runner scheduling;
- deterministic retry-delay helper;
- bounded circuit-breaker state;
- source overlay progress wording;
- source/receiver progress snapshots where needed for truthful saved counts;
- targeted verification and regression coverage.

Out of scope:

- changing conversation identity or card IDs;
- changing Vault storage schema beyond bounded existing progress fields;
- replacing the current import transport;
- adding background server-side crawling;
- clearing provider/browser caches;
- persisting credentials, raw provider responses or per-chat retry timers.

## Compatibility

Feature 20 resumability remains authoritative: imported cards in the Vault are the durable checkpoint. Feature 24's per-conversation deferred queue remains, but its earlier decision that detail 429 must never activate a shared cooldown is superseded by this change.

## Success criteria

- fallback retry delays follow 5/15/30/60/120/300 seconds;
- valid `Retry-After` is respected as a minimum;
- one throttled chat is deferred independently;
- a burst of 429s cannot cause an immediate request storm across the remaining queue;
- ready work continues after a short provider-pressure cooldown;
- success cautiously restores concurrency;
- UI distinguishes processed from durably saved/ACKed;
- pause/resume and duplicate prevention remain intact;
- no cache clearing or durable-state reset is introduced.
