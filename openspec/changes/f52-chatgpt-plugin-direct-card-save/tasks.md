# Tasks — F52 ChatGPT plugin direct Card save

- [x] Inspect existing plugin submission packet, MCP contract hardening spec, and current Share-capture failure context.
- [x] Define direct-save scope without mixing F50 Share recovery or resolver changes.
- [x] Add proposal, design, spec delta and impact manifest.
- [ ] Run strict OpenSpec validation and record result before production code.
- [ ] Inspect existing canonical Card/Vault persistence and auth boundaries narrowly.
- [ ] Implement the smallest truthful direct-save MCP tool using existing canonical Card persistence semantics.
- [ ] Preserve stable identity/provenance and deterministic upsert behavior.
- [ ] Ensure the tool rejects/does not rely on ChatGPT cookies, tokens or OpenAI credentials for DashGPT authorization.
- [ ] Update MCP annotations, `chatgpt-app-submission.json`, bundled plugin skill and submission packet.
- [ ] Add regression verification for input/output schema, write annotations, persistence/upsert and auth/safety boundaries.
- [ ] Run targeted verification and `npm run check`.
- [ ] Run canonical `npm run verify:full` once on the final candidate.
- [ ] Verify any changed public/plugin setup UX in production preview and narrow mobile viewport where applicable.
- [ ] Confirm supported-surface wording: custom MCP web-only; do not claim native-mobile direct save unless separately verified.
- [ ] Mark PR ready only when verification is green and plugin/submission artifacts match actual server behavior.