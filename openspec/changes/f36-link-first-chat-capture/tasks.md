# F36 tasks

## 1. OpenSpec gate

- [x] Inspect current product summary, OpenSpec guide, F27 Save-chat flow, F33 guided import, existing shared-chat resolver, current `develop`, and overlapping open PRs.
- [x] Create dedicated F36 proposal, design, save-chat-flow spec delta, tasks, and Impact Manifest.
- [ ] Run `openspec validate f36-link-first-chat-capture --type change --strict --no-interactive` before production edits and record evidence/blocker truthfully.

## 2. Link-first Save chat implementation

- [ ] Put a required ChatGPT link field first in the existing-user Save-chat capture section.
- [ ] Normalize supported ChatGPT Share URL forms without introducing a second resolver.
- [ ] Reject private `/c/...` links with human Share-link guidance.
- [ ] Resolve valid public Share links through `/api/shared-chat`.
- [ ] Derive reviewable title/summary from the resolver payload.
- [ ] Save the canonical Share URL in existing card source provenance.
- [ ] Reuse/update an existing canonical card for the same normalized Share URL instead of duplicating it.
- [ ] Keep the existing JSON handoff/copy-command capture as a secondary fallback.
- [ ] Keep local-first save, provider sync/exclusivity, and F26 Google click ordering unchanged.

## 3. Regression coverage

- [ ] Existing-user Save chat opens the dedicated dialog, not generic Add Result.
- [ ] Link field renders before fallback handoff controls.
- [ ] Mock public Share URL resolves into review and saves one card.
- [ ] Saved card keeps canonical `source.url` and `chatgpt-share` provenance.
- [ ] Repeating the same Share URL does not create another user-visible card.
- [ ] Private `/c/...` URL shows human recovery guidance and saves nothing.
- [ ] Existing structured JSON fallback still saves correctly.
- [ ] Existing Google Drive active-user-click regression remains green.
- [ ] Existing GitHub storage delegation remains green.
- [ ] 360px flow has no horizontal overflow.

## 4. Verification / delivery

- [ ] Run targeted syntax/deterministic verification for changed production/test files.
- [ ] Run the affected Save-chat browser tests when a supported browser runner is available.
- [ ] Run canonical `npm run verify:full` once before merge when applicable; if the existing GitHub billing/runner blocker persists, record that accurately rather than claiming a pass.
- [ ] Verify the production-shaped branch preview and 360px viewport when available.
- [ ] Open a PR against `develop`, link Issue #86 and this OpenSpec change, then merge to `develop` after the required verification/evidence gate.
- [ ] Update this task list / handoff state with final verification and merge evidence.
