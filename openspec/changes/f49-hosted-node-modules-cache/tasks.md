# Tasks

- [x] Inspect F47/F48 hosted verification design and current `develop` workflow.
- [x] Confirm F48 is merged and dependency caching must be a separate follow-up change.
- [x] Confirm the repository has no committed npm lockfile and keep dependency-lock migration out of F49 scope.
- [x] Prepare F49 proposal, design, CI-verification spec delta and Impact Manifest.
- [x] Strictly validate F49 OpenSpec before production workflow edits: run `34402607595` passed.
- [x] Add versioned `node_modules` caching to deterministic, browser and canonical-full jobs.
- [x] Skip `npm install --ignore-scripts --no-audit --no-fund` only on exact cache hits; preserve it on misses.
- [x] Extend `verify-hosted-ci-performance.mjs` for cache path/key and conditional install behavior.
- [x] Run targeted deterministic verification on the implementation head: `deterministic` passed in `34402782912`, with an exact dependency-cache hit and the npm install step skipped.
- [x] Run hosted desktop and mobile browser shards on the implementation head: both passed in `34402782912`; the first container run populated the container-side dependency cache.
- [ ] Run one opt-in literal `npm run verify:full` hosted lane on the final implementation head.
- [x] Confirm the ordinary final required `check` passes on the implementation head: run `34402782912` passed.
- [ ] Run a later unchanged-dependency hosted verification and confirm exact container cache hit(s) skip npm installation.
- [ ] Reconcile PR body/tasks with final evidence.
- [ ] Merge F49 into `develop` only after all required evidence is green.
