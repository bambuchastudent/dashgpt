# Tasks

- [x] Capture the real `waiting to retry` stall as issue #91.
- [x] Define self-waking deferred retry and shared 429 cooldown behavior before production changes.
- [x] Make deferred queue waits explicitly wakeable.
- [x] Wake the source scheduler on validated receiver control, focus, and visibility recovery.
- [x] Add a bounded receiver wake heartbeat while rate-limited.
- [x] Pass computed detail retry delay into the shared scheduler cooldown.
- [x] Add deterministic regression verification for generated source runner + receiver heartbeat contracts.
- [ ] Run targeted verification and merge to `develop` only after the checks pass.
