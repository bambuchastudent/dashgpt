# Tasks

## 1. Spec gate and current-state inspection
- [x] Confirm GitHub issue #37 product input and no-extension/plugin constraint.
- [x] Inspect PR #33 My Dash ownership and choose stacked delivery instead of duplicating its dashboard shell.
- [x] Inspect `demo/vault.js` mutable Result upsert, source fields, browser-local persistence and materialization.
- [x] Inspect `demo/app.js` Vault adapter, gallery rendering, Result creation, storage import and runtime refresh surfaces.
- [x] Inspect `demo/public-onboarding.js`, `demo/unified-onboarding.js`, `demo/catalog-bootstrap.js`, Semantic Gallery/Dash and continuation compatibility surfaces.
- [x] Record real Safari evidence: 2,123 conversations discovered and fixed concurrency 8 producing sustained 429 retry storms.
- [x] Record Graphify/Serena unavailability and focused GitHub/repository inspection fallback in the proposal Impact Manifest.
- [x] Strictly validate `f20-resumable-progressive-chatgpt-import` in CI before any production-code commit (OpenSpec validation run 127, success).

## 2. Default My Dash import card
- [x] Add one deterministic mutable import Result for a genuinely clean/new Vault before normal personal onboarding decides the Vault is empty.
- [ ] Keep one stable card ID and machine-readable progress state across ready/waiting/running/rate-limited/paused/partial/completed states.
- [x] Give active/incomplete import card operational visual priority without writing/changing the user's favorite event.
- [x] Ensure existing populated Vaults are not silently seeded on deployment.
- [x] Add completion removal behavior that leaves all imported conversation cards untouched and does not respawn the completed removed card.
- [x] Provide an explicit restore/start path for an existing user without creating a second import card.

## 3. Deterministic imported-card projection
- [x] Implement stable `chatgpt conversationId -> Result ID` mapping and provider/source provenance.
- [x] Use source update time as deterministic freshness marker for skip/update decisions.
- [x] Build bounded compact card projection from current-branch conversation content without persisting the full raw transcript/mapping.
- [x] Bound title, summary, current-state, tags/facts and source metadata for browser-local storage safety.
- [x] Verify same source twice converges to one card; same title/different source IDs stay distinct; newer source updates same card.

## 4. Browser launcher and local transport
- [x] `Start import` opens the supported `chatgpt.com` source context and prepares/copies the same-origin source runner.
- [x] Show a truthful waiting state and exactly one explicit browser-required execution instruction; do not claim cross-origin injection/eval.
- [x] Generate transient per-launch session/nonce state that is not persisted as card/provider credential content.
- [x] Implement allowlisted `postMessage` protocol with exact ChatGPT origin, session/nonce, version and payload-size validation.
- [x] Reconstruct/sanitize incoming card candidates so the source cannot set favorite state, Vault identity, immutable hashes, Dash membership or arbitrary events.
- [ ] Reject wrong-origin/session/oversized messages with bounded safe diagnostics and zero Vault mutation.
- [ ] Handle opener/receiver-unavailable state truthfully and keep the migration resumable.

## 5. Same-origin ChatGPT source runner
- [x] Reuse the verified Safari prototype lessons for authenticated `/api/auth/session`, conversation list pagination, active + archived discovery and detail current-branch extraction.
- [x] Keep access token, account ID, cookies/session payloads and authorization headers inside the ChatGPT source context only.
- [x] Implement bounded diagnostic events containing no credentials or full conversation bodies.
- [x] Support cancellation/pause with abortable waits and requests.
- [x] Send bounded card batches with backpressure and wait for durable receiver ACKs instead of buffering the full history.

## 6. Adaptive global scheduling
- [x] Start detail retrieval at conservative 1-2 concurrency with a low maximum.
- [x] Centralize cooldown so one 429/503 throttles the shared queue rather than independent workers retrying together.
- [x] Respect `Retry-After`; otherwise apply bounded exponential backoff + jitter.
- [x] Reduce concurrency after throttling and only increase after a sustained success streak.
- [x] Keep transiently throttled items resumable instead of converting a rate-limit burst into permanent mass failure.
- [ ] Add deterministic scheduler tests proving no independent 429 retry storm.

## 7. Batch Vault persistence and resume
- [x] Persist card upserts + progress-card update once per bounded batch through existing Vault save behavior.
- [x] ACK a source batch only after durable Vault save succeeds.
- [ ] On save/quota failure, send no durable ACK and leave sources eligible for retry.
- [x] Build receiver-known `sourceId -> publishedAt` state from materialized imported cards at handshake; do not persist a second completed-ID ledger.
- [x] Resume by rediscovering and processing only missing/stale source IDs.
- [x] Verify crash-after-save/before-ACK does not create duplicates on replay.

## 8. Progressive UI without import-time degradation
- [x] Coalesce runtime gallery refreshes separately from batch-save cadence; do not rebuild a 2,000-card gallery after every conversation.
- [x] Update progress-card counters/state at a bounded cadence while imports continue.
- [ ] Make accepted cards searchable/usable before total completion through the existing canonical renderer.
- [ ] Verify normal My Dash search/favorites/saved Dash behavior remains responsive during simulated progressive import.
- [ ] Add 360px import-card controls and no-horizontal-overflow coverage.

## 9. Storage-size and privacy regression coverage
- [x] Add synthetic 2,500-card compact projection fixture and enforce the agreed browser-local Vault size budget/guard behavior.
- [x] Verify no raw full transcript mapping is stored in imported Result fixtures.
- [ ] Verify tokens, account IDs, cookies, authorization headers and session payloads are absent from messages, cards, progress state and diagnostics.
- [ ] Verify malformed/untrusted message payloads cannot mutate unrelated Results, favorite events, Dash revisions or Vault identity.

## 10. Compatibility regression coverage
- [ ] Keep PR #33 My Dash/unified-shell tests green.
- [ ] Keep Semantic Gallery ordering/density, Semantic Dashes, Structured Continuation, Vault/GitHub storage, immutable Result, Share/onboarding, Product Board, Worker/MCP checks green.
- [ ] Verify imported cards participate through normal search/Dash/continuation paths with no parallel imported-card renderer/store.
- [x] Verify completion/removal of the operational card never deletes imported conversation cards.

## 11. Real Safari acceptance
- [ ] Verify source launcher + opener/message bridge in authenticated Safari on a bounded disposable slice before claiming it works.
- [ ] Verify adaptive scheduler avoids the prior concurrency-8 429 storm on a larger slice.
- [ ] Verify imported cards appear progressively in DashGPT during a real run.
- [ ] Close the ChatGPT source tab mid-import, confirm already durable cards remain, relaunch and verify missing/stale work resumes without duplicates.
- [ ] Run a large-history completion attempt or a sufficiently representative bounded run and record any upstream rate-limit constraints truthfully.

## 12. Verification and PR lifecycle
- [x] After strict OpenSpec CI is green, begin production implementation; no production-code commit before that gate.
- [x] Run focused verification during implementation.
- [ ] Run canonical `npm run verify:full` once on the final implementation head while applicable.
- [x] Re-run strict OpenSpec validation after scope/spec/task changes.
- [ ] Verify production branch preview on desktop and narrow mobile viewport.
- [x] While PR #33 remains open, keep this PR stacked on `feature/f18-unified-card-dashboard`.
- [ ] After #33 merges, rebase/retarget to `develop`, rerun strict OpenSpec and canonical full verification, and only then mark ready for merge.
