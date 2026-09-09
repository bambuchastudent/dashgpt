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
- [x] Run one opt-in literal `npm run verify:full` hosted lane: `canonical-full` passed in warm run `34403090802`.
- [x] Confirm final required `check` passes: ordinary implementation run `34402782912` and warm full run `34403090802` both passed.
- [x] Run a later unchanged-dependency hosted verification and confirm exact container cache hit(s) skip npm installation: in `34403090802`, deterministic, desktop, mobile and canonical-full all restored the dependency cache and skipped `npm install`.
- [x] Reconcile PR body/tasks with verification evidence; production behavior is unchanged by this documentation-only evidence commit.
- [ ] Merge F49 into `develop` only after the final documentation head re-passes OpenSpec, deterministic, desktop, mobile, literal canonical-full and required `check`.
