# Tasks: F25 ChatGPT 429 circuit breaker and staged retry backoff

- [x] Define staged per-conversation retry delays.
- [x] Add a short shared provider-pressure cooldown and reduce concurrency during pressure.
- [x] Keep unrelated ready conversations eligible after the short cooldown.
- [x] Keep canonical card identity and resumability unchanged.
- [x] Distinguish processed, saved, deferred and unresolved progress.
- [x] Add targeted deterministic verification for retry stages and circuit-breaker state.
- [ ] Verify the real authenticated Safari import against the current `develop` build.
