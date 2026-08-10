# Tasks

- [x] Document the known ChatGPT anti-bot 403 behavior and desired retrieval order.
- [x] Prefer rendered DOM extraction when Browser Run is configured.
- [x] Ensure successful rendered extraction performs zero raw ChatGPT fetches.
- [x] Keep direct structured parsing and rendered-payload parsing as compatibility fallbacks.
- [x] Sanitize the public unreadable-share error so HTTP/parser internals are not exposed.
- [x] Update regression tests for browser-first success, fallback behavior, invalid-host isolation, and sanitized double failure.
- [x] Run OpenSpec validation, `npm run check`, and browser tests.
- [ ] Merge only after CI is green.
