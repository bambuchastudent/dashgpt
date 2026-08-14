# F36 tasks

## 1. OpenSpec gate

- [x] Inspect current product summary, OpenSpec guide, F27 Save-chat flow, F33 guided import, existing shared-chat resolver, current `develop`, and overlapping open PRs.
- [x] Create dedicated F36 proposal, design, save-chat-flow spec delta, tasks, and Impact Manifest.
- [x] Run `openspec validate f36-link-first-chat-capture --type change --strict --no-interactive` before production edits. Evidence: temporary validation-only Cloudflare build commit `7c9f92c3f9f14ddce12ffd26d5e3e6a1f28eaa9e` deployed successfully; the hook was removed before production implementation.

## 2. Link-first Save chat implementation

- [x] Put a required ChatGPT link field first in the existing-user Save-chat capture section.
- [x] Normalize supported ChatGPT Share URL forms without introducing a second resolver.
- [x] Reject private `/c/...` links with human Share-link guidance.
- [x] Resolve valid public Share links through `/api/shared-chat`.
- [x] Derive reviewable title/summary from the resolver payload.
- [x] Save the canonical Share URL in existing card source provenance.
- [x] Reuse/update an existing canonical card for the same normalized Share URL instead of duplicating it.
- [x] Keep the existing JSON handoff/copy-command capture as a secondary fallback.
- [x] Keep local-first save, provider sync/exclusivity, and F26 Google click ordering unchanged.

## 3. Regression coverage added

- [x] Existing-user Save chat opens the dedicated dialog, not generic Add Result.
- [x] Link field renders before fallback handoff controls and receives initial focus.
- [x] Mock public Share URL resolves into review and saves one card.
- [x] Saved card keeps canonical `source.url` and `chatgpt-share` provenance.
- [x] Repeating the same Share URL does not create another user-visible card.
- [x] Private `/c/...` URL shows human recovery guidance, does not call the resolver, and saves nothing.
- [x] Existing structured JSON fallback remains covered.
- [x] Existing Google Drive active-user-click regression remains in the affected suite.
- [x] Existing GitHub storage delegation remains in the affected suite.
- [x] 360px no-horizontal-overflow regression remains in the affected suite and now asserts the link-first control.

## 4. Verification / delivery

- [x] Run targeted syntax checks for `demo/public-onboarding.js` and `tests/save-chat-flow.spec.mjs`, plus canonical `npm run verify:fast`. Evidence: temporary verification-only Cloudflare build commit `ed78bdb6f6b175a933d64516ae87d69235da46d5` deployed successfully; verification hook/trigger were then removed.
- [ ] Execute the affected Save-chat Playwright suite in a supported browser runner. A temporary Cloudflare attempt (`bf426f56e262889f8f8672a1675f7098b3bb7394`) did not complete as a successful deployment, so no browser-test pass is claimed from that environment; the temporary hook/trigger were removed.
- [ ] Run canonical `npm run verify:full`. GitHub-hosted jobs currently start with zero steps (`runner_id: 0`) because account payments/spending limits block the runner, so no full-suite pass is claimed.
- [x] Verify a clean production-shaped branch deployment after implementation and verification-hook cleanup. Clean F36 head `74aae6ddf69ba36fb4f66cdf1aea944f27a9160f` deployed successfully at the stable branch preview before the later documentation-only verification notes.
- [ ] Independently exercise the 360px flow in an actual browser preview; regression coverage is committed, but browser execution is not claimed while the available runners are blocked/unusable.
- [x] Open PR #87 against `develop`, linked to Issue #86 and this OpenSpec change.
- [ ] Merge PR #87 to `develop` and verify the resulting `develop` head.
