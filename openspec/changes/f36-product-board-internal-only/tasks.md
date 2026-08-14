# Tasks — F36 Product Board internal-only navigation

## Spec / design gate
- [x] Inspect current `develop`, F9 Product Board spec, normal dashboard header and open PR overlap.
- [x] Create Issue #84 and dedicated OpenSpec proposal/design/spec delta/tasks/impact manifest.
- [x] Strictly validate `f36-product-board-internal-only` before production edits. The exact strict validator ran as a temporary Cloudflare `postinstall` on commit `1172137e845d63ca1680d5fa55678c92897dbf32`; that deployment succeeded before `demo/index.html` was changed.

## Implementation
- [x] Remove the global Product Board action from `/demo/`.
- [x] Preserve the direct Product Board compatibility route and existing project data/code.
- [x] Keep Cards, Dashes, search, storage, import and continuation behavior unchanged.

## Regression coverage
- [x] Add deterministic coverage proving the normal dashboard does not expose Product Board global navigation.
- [x] Add Playwright coverage for the missing global link while retaining the existing direct-route test.
- [x] Keep existing direct Product Board deterministic verification green after updating its superseded discoverability assertion.

## Verification / release
- [x] Run repository deterministic verification: `npm run check` completed successfully in the Cloudflare build for commit `3fe959a3d4164ff16cec2385680a325f38ce4833`.
- [ ] Run canonical `npm run verify:full` on runnable browser infrastructure. Two Cloudflare attempts were made, including explicit Chromium installation; the build environment could not complete the browser gate. GitHub Actions also currently creates zero-step failed jobs, so it cannot provide the canonical browser gate for this PR.
- [x] Verify a clean final branch preview deploys successfully after all temporary validation hooks are removed.
- [ ] Merge the dedicated PR to `develop` under the user's explicit direct-to-develop instruction, with the browser-infrastructure gap recorded rather than misreported as green.
