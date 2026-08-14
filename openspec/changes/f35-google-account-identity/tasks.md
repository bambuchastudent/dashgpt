# Tasks — F35 Show authorized Google account

## Spec / design gate
- [x] Inspect F34 Google authorization, Drive adapter, account-entry UI and overlap with open profile-metrics PR.
- [x] Create dedicated issue and OpenSpec proposal/design/spec/tasks/impact manifest before production edits.
- [x] Strictly validate `f35-google-account-identity` before production edits. The exact strict validator command ran as a temporary Cloudflare `postinstall` on commit `c1ba2262b14f901b4304c4206f9b340b7f7b0fb1`; the deployment succeeded, proving the command exited successfully. The temporary hook was removed before production implementation.

## Implementation
- [x] Add a focused Drive `about.get` helper using the existing `drive.file` token.
- [x] Keep Google account identity in memory only.
- [x] Show display name/email after successful authorization in the Google account storage surface.
- [x] Clear identity on disconnect and token loss/reload.
- [x] Preserve Safari original-click token request ordering; identity lookup happens only after the token request has already been initiated inside the click task.
- [x] Preserve Google/GitHub provider exclusivity.
- [x] Do not add OAuth scopes or persist identity into Vault/Card/binding/profile state.

## Regression coverage
- [x] Deterministic test for `about.get` request, Bearer token usage, field list, sanitization and formatting.
- [x] Regression proving identity/token extras are stripped from the durable Google Drive binding and never enter created Vault content.
- [x] Browser test: authorized identity visible after Google authorization.
- [x] Browser test: identity clears on reload without a token and on disconnect.
- [x] Browser test: direct Google account action still preserves user activation.
- [x] Browser test: 390px account UI has no horizontal overflow.

## Verification / release
- [x] Run targeted syntax/deterministic verification through the canonical fast gate.
- [x] Run `npm run verify:fast`: temporary Cloudflare `postinstall` on commit `7509710592ba8d38efe88f75a4ff715bdb00afd5` completed successfully, then the hook was removed.
- [ ] Run canonical `npm run verify:full` when runnable infrastructure is available. GitHub Actions continues to start zero steps because of the account billing/spending-limit blocker, so no browser-pass claim is made.
- [ ] Verify final clean Cloudflare branch preview after the verification hook is removed.
- [x] Keep PR separate from F34 and profile metrics; merge only within verified/explicitly accepted risk.
