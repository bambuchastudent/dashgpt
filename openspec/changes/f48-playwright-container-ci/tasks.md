# Tasks

- [x] Inspect current hosted workflow, Playwright dependency pin and F47 overlap.
- [x] Confirm run `34385670227` failed before browser tests because `playwright install --with-deps chromium` hit an external APT `Hash Sum mismatch`.
- [x] Confirm Microsoft publishes `mcr.microsoft.com/playwright:v1.62.1-noble` and that the version matches DashGPT `@playwright/test` `1.62.1`.
- [x] Prepare F48 proposal, design, CI-verification spec delta and Impact Manifest.
- [ ] Strictly validate F48 OpenSpec before production workflow edits.
- [ ] Run browser matrix and `canonical-full` inside the pinned official Playwright container with host IPC.
- [ ] Remove runtime `npx playwright install --with-deps chromium` from browser-bearing jobs.
- [ ] Update deterministic hosted-CI regression verification for image/version coupling and absence of runtime browser installation.
- [ ] Run targeted deterministic verification on the implementation head.
- [ ] Run hosted desktop and mobile browser shards and confirm both execute tests successfully.
- [ ] Run one opt-in literal `npm run verify:full` hosted lane on the final implementation head.
- [ ] Confirm final required `check` passes on the final implementation head.
- [ ] Merge the F48 PR into `develop` only after the required evidence is green.
