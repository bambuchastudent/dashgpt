# Proposal: ChatGPT 429 circuit breaker and staged retry backoff

## Why

Per-conversation retries keep one throttled conversation from stopping the whole import, but repeated 429 responses can still create bursts across the remaining queue. The import also needs a clear distinction between processed conversations and cards durably saved by DashGPT.

## What changes

- Use staged per-conversation retry delays of 5, 15, 30, 60, 120 and 300 seconds, respecting a larger provider Retry-After value.
- Treat 429 as provider pressure: reduce detail concurrency to one and apply a short shared cooldown.
- Keep unrelated ready conversations eligible after that short cooldown.
- Recover concurrency cautiously after sustained successful requests.
- Show processed, saved, deferred and unresolved progress separately.
- Preserve resumability and deterministic card identity.

## Success criteria

The importer avoids request bursts, continues unrelated work, retries deferred conversations conservatively, reports durable progress accurately, and does not duplicate already saved cards after resume.
