# Tasks — F49 React Router Share payload compatibility

- [x] Inspect current product/development/OpenSpec guidance and `develop` implementation.
- [x] Inspect overlap with F11/F12/F15/F16/F17 resolver behavior plus F36/F45 capture and F46/F48 resilience work.
- [x] Capture the persistent reproduction as a format-compatibility problem without committing the user's Share URL/content.
- [x] Strictly validate `f49-react-router-share-payload` before modifying production code.
- [x] Implement a cycle-safe React Router 7 turbo-stream graph decoder in `src/shared-chat.js`.
- [x] Convert resolved `linear_conversation` / `mapping` data through existing visible-message rules and shared-chat response semantics.
- [x] Integrate the parser as a compatibility fallback without changing retrieval providers or endpoint fields.
- [x] Add deterministic regressions for indexed-key graph resolution, ordering/filtering, malformed chunks and fallback title behavior.
- [x] Run targeted shared-chat parser/resolver verification through the deterministic `npm run check` gate.
- [x] Run `npm run check` in GitHub Actions.
- [x] Run the desktop and mobile Playwright browser suites in GitHub Actions (the current `develop` equivalent of `npm run test:browser`).
- [x] Verify Cloudflare preview deployment for the current implementation head.
- [ ] Verify the fresh reproduction Share resolves through preview without raw parser/provider details.
- [x] Update PR/handoff with concrete verification evidence and keep the exact reproduction check as the remaining blocker.
