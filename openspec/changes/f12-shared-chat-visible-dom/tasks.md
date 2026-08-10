# Tasks

- [x] Reproduce the production failure: direct ChatGPT share fetch returns 403 while the URL is publicly readable in a normal browser.
- [x] Confirm the existing Browser Run fallback still depends on embedded React/legacy payload parsing.
- [ ] Add rendered DOM extraction using Browser Run `/scrape` and role-bearing message selectors.
- [ ] Preserve the current shared-chat response contract consumed by onboarding.
- [ ] Add regression tests for 403 + visible DOM success, duplicate/noise filtering, and unreadable challenge DOM.
- [ ] Run OpenSpec validation, `npm run check`, and browser tests.
- [ ] Merge only after CI is green.
