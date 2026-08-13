# Tasks

- [x] Inspect current `develop` import projection, receiver sanitization, fast batch path, Vault allowlists, Search, Semantic Gallery and Semantic Dashes.
- [x] Inspect current open PR overlap, especially #56 and #63.
- [x] Inspect DashGPT skill/app submission state and verify that public F4 publication remains externally incomplete.
- [x] Choose local deterministic enrichment as the required bulk-import baseline; reject mandatory external LLM calls for this scope.
- [x] Define bounded enrichment version/backfill semantics that preserve canonical source identity.
- [ ] Strictly validate `f28-import-semantic-enrichment` before production edits.
- [ ] Add the local serializable semantic classifier to the ChatGPT source projection and bump the enrichment-aware source version.
- [ ] Preserve ChatGPT provenance while storing content-oriented category/tags and bounded enrichment version.
- [ ] Make normal receiver freshness and same-timestamp update logic semantic-enrichment aware.
- [ ] Make import fast-path update logic identical to the normal receiver for semantic backfill.
- [ ] Tighten the DashGPT skill direct-save tag contract and submission verifier/tests as needed.
- [ ] Add deterministic classifier fixtures for Russian, English and mixed-language conversations.
- [ ] Add regression coverage for tag bounds/generic-term filtering, semantic hue/grouping, same-timestamp backfill, identity preservation and idempotent reruns.
- [ ] Verify existing import pause/resume, progressive batching and durable ACK contracts remain green.
- [ ] Run targeted verification for F28.
- [ ] Run `npm run verify:full` once before merge while applicable.
- [ ] Verify the production-shaped preview and a relevant mobile viewport if rendered UI behavior changes beyond metadata-driven color/tag content.
- [ ] Reconcile PR notes with #56/#63 rebase requirements and record any infrastructure blocker truthfully.
