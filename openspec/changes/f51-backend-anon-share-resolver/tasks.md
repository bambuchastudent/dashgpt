# Tasks — F51 anonymous Share JSON resolver refresh

- [x] Reproduce the product failure with a genuinely public Share that opens logged-out/incognito.
- [x] Inspect current product/development/OpenSpec guidance and F11/F12/F15/F16/F17/F46/F48/F49 overlap.
- [x] Identify current logged-out `backend-anon/share/<id>` evidence and Browser Run bot-identification constraints.
- [x] Strictly validate `f51-backend-anon-share-resolver` before production code changes.
- [x] Add validated `backend-anon/share/<id>` URL derivation and anonymous JSON fetch.
- [x] Prefer anonymous JSON before existing resolver/provider fallbacks.
- [x] Reuse existing current-node/visibility projection without changing endpoint/Card contracts.
- [x] Add deterministic regressions for success, ordering and failure fallthrough.
- [x] Run targeted shared-chat verification through the deterministic repository gate.
- [x] Run `npm run check` in GitHub Actions.
- [x] Run desktop and narrow-mobile browser verification in GitHub Actions.
- [ ] Run the canonical `npm run verify:full` gate once on the final candidate.
- [x] Verify Cloudflare preview deployment.
- [ ] Verify the exact public reproduction resolves through preview and reaches normal Card review.
- [ ] Reconcile tasks/PR status and mark ready only with real acceptance evidence.
