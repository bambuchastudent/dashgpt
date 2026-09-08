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
- [x] Run `npm run verify:full` once before merge while applicable. The F46 verifier passes. The canonical run then stops on the existing `scripts/verify-ui-contract.mjs:16` `semanticHue(result)` assertion; an isolated hosted run from untouched `develop` reproduced the exact same failure, confirming it is a baseline blocker unrelated to F46.
- [ ] Confirm final PR checks before merge. The workflow diff has been inspected and temporary hosted validation completed, but the repository's normal self-hosted OpenSpec/full-check jobs for #113 remain queued; do not merge while those required checks are unresolved.
