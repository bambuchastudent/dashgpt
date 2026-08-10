# Tasks

- [x] Document the known ChatGPT anti-bot 403 behavior and desired retrieval order.
- [ ] Prefer rendered DOM extraction when Browser Run is configured.
- [ ] Ensure successful rendered extraction performs zero raw ChatGPT fetches.
- [ ] Keep direct structured parsing and rendered-payload parsing as compatibility fallbacks.
- [ ] Sanitize the public unreadable-share error so HTTP/parser internals are not exposed.
- [ ] Update regression tests for browser-first success, fallback behavior, invalid-host isolation, and sanitized double failure.
- [ ] Run OpenSpec validation, `npm run check`, and browser tests.
- [ ] Merge only after CI is green.
