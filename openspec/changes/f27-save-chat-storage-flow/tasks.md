# Tasks — F27 coherent Save chat + storage flow

## OpenSpec / scope

- [x] Inspect current personal Save-chat button behavior in `demo/app.js` and `demo/public-onboarding.js`.
- [x] Inspect F14 chat-first onboarding, F18 unified dashboard, F25/F26 Google Drive sync, and existing GitHub storage flow.
- [x] Create Issue #62 and dedicated F27 OpenSpec change.
- [x] Write proposal, design, spec delta and Impact Manifest before production edits.
- [x] Structural validation: one ADDED Requirements section; every requirement uses SHALL; every scenario uses WHEN/THEN; no new card/provider data model.
- [ ] Executable OpenSpec validation is unavailable because the current GitHub Actions infrastructure does not start project steps.

## Implementation

- [x] Intercept the personal topbar action in capture phase so the generic app controller remains unchanged on other routes.
- [x] Build reusable personal Save-chat dialog using existing structured ChatGPT capture/parser/review/local-save behavior.
- [x] Show local device as always-active storage and Google Drive/GitHub as optional sync choices.
- [x] Delegate the Save-chat Google action synchronously to the existing canonical `#connectGoogleDriveButton` without awaited work first.
- [x] Reuse canonical GitHub Storage setup rather than duplicating its repository field.
- [x] Keep clean onboarding and anonymous Share code paths untouched by the repeated Save-chat dialog.
- [x] Add responsive Save-chat dialog styles.

## Tests

- [x] Add regression case: existing user Save chat opens dedicated capture dialog and generic Add Result form stays closed.
- [x] Add regression case: valid Result envelope saves exactly one local ChatGPT-handoff card without a remote provider.
- [x] Add regression case: provider panel shows Google Drive and GitHub choices for the same card/Vault.
- [x] Add regression case: Google action reaches the canonical F26 connection path with active browser user activation.
- [x] Add regression case: GitHub action opens/focuses existing Storage provider setup.
- [x] Add regression case: 360px Save-chat dialog has no horizontal overflow.
- [ ] Execute the new Playwright suite and existing first-card/Share suites when the test runner is available.

## Verification

- [ ] `npm run verify:fast`: unavailable through the current GitHub Actions runner; no green result claimed.
- [ ] `npm run verify:full`: unavailable through the current GitHub Actions runner; no green result claimed.
- [x] Cloudflare Workers build for the PR head succeeded and produced the F27 branch preview.
- [ ] Real desktop Safari: personal Save chat opens the dedicated dialog and Google Drive delegation opens the account flow when the production OAuth origin is used.
- [ ] 360px real/mobile acceptance beyond the authored Playwright regression.
- [x] Merge decision records unavailable verification explicitly rather than representing it as passed.
