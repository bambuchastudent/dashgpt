# Tasks

- [x] Confirm the hosted timeout reproduces on untouched `develop` as well as F46 exact head.
- [x] Inspect current OpenSpec/development guidance and overlap with F46, product/UI, storage and continuation surfaces.
- [x] Add proposal, design, spec delta and Impact Manifest for hosted canonical-verification performance.
- [ ] Strictly validate `f47-hosted-ci-verification-performance` before repository CI/config edits.
- [ ] Make hosted dependency installation deterministic/cache-friendly without enabling lifecycle scripts.
- [ ] Configure bounded Playwright CI concurrency while preserving `fullyParallel: false`, both browser projects and `retries: 1`.
- [ ] Add deterministic regression verification for the hosted CI performance/coverage contract and wire it into `npm run check`.
- [ ] Run targeted deterministic verification for the new CI verifier.
- [ ] Run exact-head hosted `DashGPT checks` and confirm `npm run verify:full` completes inside the existing 30-minute timeout with useful headroom.
- [ ] Run canonical `npm run verify:full` once on the final implementation head before merge.
- [ ] Reconcile PR body/task evidence and merge only after final checks are green.
- [ ] Rebase/re-run PR #113 on the fixed `develop`, finish its final verification evidence, then handle #113 separately.
