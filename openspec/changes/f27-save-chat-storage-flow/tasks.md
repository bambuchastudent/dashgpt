# Tasks — F27 coherent Save chat + storage flow

## OpenSpec / scope

- [x] Inspect current personal Save-chat button behavior in `demo/app.js` and `demo/public-onboarding.js`.
- [x] Inspect F14 chat-first onboarding, F18 unified dashboard, F25/F26 Google Drive sync, and existing GitHub storage flow.
- [x] Create Issue #62 and dedicated F27 OpenSpec change.
- [x] Write proposal, design, spec delta and Impact Manifest before production edits.
- [x] Structural validation: one ADDED Requirements section; every requirement uses SHALL; every scenario uses WHEN/THEN; no new card/provider data model.

## Implementation

- [ ] Add cancelable add-result request boundary so personal mode can replace the generic form without breaking other routes.
- [ ] Build reusable personal Save-chat dialog using existing structured ChatGPT capture/parser/review/local-save behavior.
- [ ] Show local device as always-active storage and Google Drive/GitHub as optional sync choices.
- [ ] Expose a synchronous canonical Google Drive connect entry point and use it from Save chat without violating F26 click ordering.
- [ ] Reuse canonical GitHub Storage setup rather than duplicating its repository field.
- [ ] Keep clean onboarding and anonymous Share compatibility intact.
- [ ] Add responsive Save-chat dialog styles.

## Tests

- [ ] Existing user: Save chat opens dedicated capture dialog and generic Add Result form stays closed.
- [ ] Valid Result envelope saves exactly one local ChatGPT-handoff card.
- [ ] Local-only save works with no provider connected.
- [ ] Provider panel shows Google Drive and GitHub choices for the same card/Vault.
- [ ] Google action delegates to canonical connection entry point without an awaited module-load boundary.
- [ ] GitHub action opens/focuses existing Storage provider setup.
- [ ] 360px Save-chat dialog has no horizontal overflow.
- [ ] Existing first-card onboarding and anonymous Share tests remain unchanged/passing.

## Verification

- [ ] Run executable OpenSpec validation when infrastructure permits.
- [ ] Run targeted checks / `npm run verify:fast` when infrastructure permits.
- [ ] Run canonical `npm run verify:full` once before merge where applicable.
- [ ] Verify Cloudflare preview/build.
- [ ] Verify personal Save-chat UX in desktop Safari and 360px mobile viewport.
- [ ] Merge to `develop` with unavailable gates recorded accurately.
