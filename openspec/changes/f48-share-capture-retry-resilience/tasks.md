# Tasks — F48 Share capture retry resilience

- [x] Inspect current `develop` Shared Chat resolver, Save-chat flow, F36/F45/F46 OpenSpec overlap, and current production smoke evidence.
- [x] Define bounded transient retry behavior and non-goals.
- [ ] Validate this OpenSpec change before modifying production code.
- [ ] Implement bounded retry classification/backoff in the personal link-first Share capture path.
- [ ] Keep retry progress human-readable and preserve the existing terminal fallback state.
- [ ] Add regression: transient `SHARED_CHAT_UNREADABLE` failures recover within one user submit action.
- [ ] Add regression: exhausted transient retries show human fallback, expose no raw backend detail, and create no card.
- [ ] Run targeted Save-chat regression verification.
- [ ] Run canonical `npm run verify:full` once before marking the PR merge-ready.
- [ ] Verify the current preview in desktop and narrow mobile viewport, including the retry progress state.
- [ ] Update PR/handoff with concrete verification results and any remaining blocker.
