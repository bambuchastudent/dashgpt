# Tasks

- [ ] Add a spec delta for live Shared Chat smoke failure semantics.
- [ ] Add an Impact Manifest covering monitoring/email/regression blast radius.
- [ ] Strictly validate `f46-share-smoke-upstream-flake-classification` before production workflow edits.
- [ ] Change the live smoke to probe all fixtures before deciding the final result.
- [ ] Classify exhausted `HTTP 000` and `502 SHARED_CHAT_UNREADABLE` as upstream-only degradation.
- [ ] Keep scheduled upstream-only degradation non-fatal with visible warnings/summary diagnostics.
- [ ] Keep push/manual upstream failures strict and keep unexpected/malformed production responses fatal on every trigger.
- [ ] Reset per-attempt response state and bound retry timing within the job timeout.
- [ ] Add deterministic regression verification and wire it into `npm run check`.
- [ ] Run targeted verification for the new smoke verifier.
- [ ] Run `npm run verify:full` once before merge while applicable.
- [ ] Confirm PR checks and inspect the workflow diff before merge.
