# Tasks

- [x] Add a spec delta for live Shared Chat smoke failure semantics.
- [x] Add an Impact Manifest covering monitoring/email/regression blast radius.
- [x] Strictly validate `f46-share-smoke-upstream-flake-classification` before production workflow edits.
- [x] Change the live smoke to probe all fixtures before deciding the final result.
- [x] Classify exhausted `HTTP 000` and `502 SHARED_CHAT_UNREADABLE` as upstream-only degradation.
- [x] Keep scheduled upstream-only degradation non-fatal with visible warnings/summary diagnostics.
- [x] Keep push/manual upstream failures strict and keep unexpected/malformed production responses fatal on every trigger.
- [x] Reset per-attempt response state and bound retry timing within the job timeout.
- [x] Add deterministic regression verification and wire it into `npm run check`.
- [x] Run targeted verification for the new smoke verifier (`Shared Chat live smoke upstream-flake classification checks passed.`).
- [x] Preserve the F47 hosted-CI performance contract while rebasing F46 onto current `develop`.
- [x] Run final exact-head OpenSpec validation and hosted DashGPT checks on the rebased F46 head.
- [x] Run `npm run verify:full` once on the final F46 implementation head before merge.
- [ ] Confirm final PR checks and merge #113 only after the rebased exact head is green.
- [ ] Observe the merged `develop` Shared Chat live production smoke and confirm scheduled upstream-only degradation remains warning/green while strict triggers remain red on unresolved upstream failures.
