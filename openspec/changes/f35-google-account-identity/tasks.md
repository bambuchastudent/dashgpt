# Tasks — F35 Show authorized Google account

## Spec / design gate
- [x] Inspect F34 Google authorization, Drive adapter, account-entry UI and overlap with open profile-metrics PR.
- [x] Create dedicated issue and OpenSpec proposal/design/spec/tasks/impact manifest before production edits.
- [ ] Strictly validate `f35-google-account-identity` before production edits and record evidence.

## Implementation
- [ ] Add a focused Drive `about.get` helper using the existing `drive.file` token.
- [ ] Keep Google account identity in memory only.
- [ ] Show display name/email after successful authorization.
- [ ] Clear identity on disconnect and token loss/reload.
- [ ] Preserve Safari original-click token request ordering.
- [ ] Preserve Google/GitHub provider exclusivity.
- [ ] Do not add OAuth scopes or persist identity into Vault/Card/binding/profile state.

## Regression coverage
- [ ] Deterministic test for `about.get` request and sanitized result.
- [ ] Regression proving identity fields never serialize into Vault/binding.
- [ ] Browser test: authorized identity visible.
- [ ] Browser test: identity clears on disconnect/reload.
- [ ] Browser test: direct Google account action still preserves user activation.
- [ ] Browser test: 360/390px account UI has no horizontal overflow.

## Verification / release
- [ ] Run targeted syntax/deterministic verification.
- [ ] Run `npm run verify:fast`.
- [ ] Run canonical `npm run verify:full` when runnable infrastructure is available.
- [ ] Verify final Cloudflare branch preview.
- [ ] Keep PR separate from F34 and profile metrics; merge only within verified/explicitly accepted risk.