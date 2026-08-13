# Tasks: F25 ChatGPT 429 circuit breaker and staged retry backoff

- [x] Inspect F20/F24 import scheduling, progress semantics, Safari launcher integration and current source runner.
- [x] Record the superseded F24 decision and define F25 staged retry/circuit-breaker behavior.
- [x] Strictly validate `f25-chatgpt-429-circuit-breaker` before production-code changes. GitHub Actions remains blocked by the repository/account billing-spending-limit issue, so the exact OpenSpec 1.8.0 command `openspec validate f25-chatgpt-429-circuit-breaker --type change --strict --no-interactive` ran as the temporary Cloudflare preview `postinstall` on commit `44ee684011a8adc3426f9ab6734383ce797753a5`; Cloudflare reported the deployment successful before any production import JavaScript was changed.
- [x] Replace fallback conversation-detail 429 delay policy with 5/15/30/60/120/300 second stages while preserving valid `Retry-After` minimums and deterministic stagger.
- [x] Extend the shared detail scheduler with bounded provider-pressure state for 429 bursts.
- [x] On detail 429, defer only the affected conversation, reduce concurrency to one, and activate/extend a short shared cooldown.
- [x] Ensure unrelated ready conversations remain eligible and resume after the short shared cooldown instead of waiting for the deferred conversation's full retry time.
- [x] Add cautious success-based circuit-breaker recovery.
- [x] Make the ChatGPT source overlay distinguish processed, durably saved/ACKed, deferred and unresolved counts.
- [x] Keep cache/storage/auth clearing out of automatic 429 recovery.
- [x] Add/update deterministic helper verification for staged delays, Retry-After and stagger.
- [x] Add/update generated-runner verification for 429 circuit-breaker behavior and absence of cache clearing.
- [ ] Add/complete executable browser/source-runtime regression showing a later ready chat progresses after shared cooldown and before the first deferred chat's retry time. Static/generated-runner contracts are green; real Safari acceptance is the next executable evidence.
- [x] Run targeted syntax/verification gates. Commit `fef50b57df436a51258195ef1833a2adcbfe874d` ran syntax checks plus the F25 verifier, existing history-import verifier and Safari Shortcut verifier through the temporary Cloudflare preview `postinstall`; deployment succeeded.
- [ ] Run canonical repository verification when CI/runtime availability permits. GitHub Actions currently does not start repository jobs because of the existing billing/spending-limit blocker.
- [ ] Verify real Cloudflare preview behavior in authenticated Mac Safari with a clean/resumable import state. Clean production-head commit `a4f94ae1ddc0dbd31b0cd990d38cbf6b6f012aed` deployed successfully; manual Safari acceptance is pending.
- [x] Open draft PR #56 to `develop`, link Issue #55 and this OpenSpec change, and update the PR with implementation/verification evidence.
