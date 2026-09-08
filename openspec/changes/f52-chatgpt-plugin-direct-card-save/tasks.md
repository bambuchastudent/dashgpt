# Tasks — F52 ChatGPT plugin direct Card save

- [x] Inspect existing plugin submission packet, MCP contract hardening spec, and current Share-capture failure context.
- [x] Define direct-save scope without mixing F50 Share recovery or resolver changes.
- [x] Add proposal, design, spec delta and impact manifest.
- [x] Run initial strict OpenSpec validation; diagnose and correct delta-format failure before production code.
- [x] Inspect existing canonical Card/Vault persistence and auth boundaries narrowly.
- [x] Choose the smallest approved write boundary: MCP OAuth bridge to the existing Google Drive-backed user-owned Vault.
- [ ] Re-run strict OpenSpec validation for the concrete OAuth/Drive scope before production code.
- [ ] Implement MCP OAuth discovery/challenge and bounded PKCE authorization flow without hosted Card storage.
- [ ] Implement `upsert_card` using existing Google Drive Vault layout and canonical Card persistence semantics.
- [ ] Preserve stable identity/provenance and deterministic upsert behavior.
- [ ] Ensure authorization/provider grants never enter Card/Vault content, tool output, URLs, logs or fixtures.
- [ ] Update MCP annotations/security schemes, `chatgpt-app-submission.json`, bundled plugin skill and submission packet.
- [ ] Add regression verification for OAuth discovery/challenge, scope/audience/expiry/PKCE, provider persistence/upsert and auth isolation.
- [ ] Run targeted verification and `npm run check`.
- [ ] Run canonical `npm run verify:full` once on the final candidate.
- [ ] Verify changed plugin authorization product states in production preview where deployment configuration permits.
- [ ] Confirm supported-surface wording: custom MCP web-only; do not claim native-mobile direct save until a published plugin is explicitly verified there.
- [ ] Mark PR ready only when verification is green and plugin/submission artifacts match actual server behavior.
