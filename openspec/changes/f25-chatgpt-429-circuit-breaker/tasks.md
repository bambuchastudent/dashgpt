# Tasks: F25 ChatGPT 429 circuit breaker and staged retry backoff

- [x] Inspect F20/F24 import scheduling, progress semantics, Safari launcher integration and current source runner.
- [x] Record the superseded F24 decision and define F25 staged retry/circuit-breaker behavior.
- [ ] Strictly validate `f25-chatgpt-429-circuit-breaker` before production-code changes.
- [ ] Replace fallback conversation-detail 429 delay policy with 5/15/30/60/120/300 second stages while preserving valid `Retry-After` minimums and deterministic stagger.
- [ ] Extend the shared detail scheduler with bounded provider-pressure state for 429 bursts.
- [ ] On detail 429, defer only the affected conversation, reduce concurrency to one, and activate/extend a short shared cooldown.
- [ ] Ensure unrelated ready conversations resume after the short shared cooldown instead of waiting for the deferred conversation's full retry time.
- [ ] Add cautious success-based circuit-breaker recovery.
- [ ] Make the ChatGPT source overlay distinguish processed, durably saved/ACKed, deferred and unresolved counts.
- [ ] Keep cache/storage/auth clearing out of automatic 429 recovery.
- [ ] Add/update deterministic helper verification for staged delays, Retry-After and stagger.
- [ ] Add/update generated-runner verification for 429 circuit-breaker behavior and absence of cache clearing.
- [ ] Add browser/source-runtime regression showing a later ready chat progresses after shared cooldown and before the first deferred chat's retry time.
- [ ] Run targeted syntax/verification gates.
- [ ] Run canonical repository verification when CI/runtime availability permits.
- [ ] Verify Cloudflare preview behavior in Safari with a clean/resumable import state.
- [ ] Open PR to `develop`, link Issue #55 and this OpenSpec change, and report any CI infrastructure blocker truthfully.
