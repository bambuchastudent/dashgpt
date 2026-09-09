# Tasks

- [x] Inspect F47/F48 hosted verification design and current `develop` workflow.
- [x] Confirm F48 is merged and dependency caching must be a separate follow-up change.
- [x] Confirm the repository has no committed npm lockfile and keep dependency-lock migration out of F49 scope.
- [x] Prepare F49 proposal, design, CI-verification spec delta and Impact Manifest.
- [ ] Strictly validate F49 OpenSpec before production workflow edits.
- [ ] Add versioned `node_modules` caching to deterministic, browser and canonical-full jobs.
- [ ] Skip `npm install --ignore-scripts --no-audit --no-fund` only on exact cache hits; preserve it on misses.
- [ ] Extend `verify-hosted-ci-performance.mjs` for cache path/key and conditional install behavior.
- [ ] Run targeted deterministic verification on the implementation head.
- [ ] Run hosted desktop and mobile browser shards on the final implementation head.
- [ ] Run one opt-in literal `npm run verify:full` hosted lane on the final implementation head.
- [ ] Confirm final required `check` passes.
- [ ] Run a later unchanged-dependency hosted verification and confirm an exact cache hit skips npm installation.
- [ ] Reconcile PR body/tasks with final evidence.
- [ ] Merge F49 into `develop` only after all required evidence is green.
