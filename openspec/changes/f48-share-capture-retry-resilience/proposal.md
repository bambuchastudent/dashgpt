# F48 — Share capture retry resilience

## Why

The personal `Save chat` flow currently treats the first `/api/shared-chat` miss as a terminal user-visible failure. That is too brittle for the existing Shared Chat resolver because real public ChatGPT Share pages can be temporarily unreadable upstream even while the same URL becomes readable seconds later.

This was reproduced by the current production smoke on 2026-09-08: the fresh public fixture returned `502 SHARED_CHAT_UNREADABLE` for five consecutive attempts and then resolved successfully on attempt six. A user submitting a valid Share URL during the same window sees the red fallback state after only one attempt.

## Goal

Make one user action resilient to transient Shared Chat upstream unreadability: retry a bounded number of times with short backoff, keep the user informed in product language, and only show the existing fallback state after the retry budget is exhausted.

## Scope

- Add bounded retry behavior to the personal link-first Share capture path.
- Retry only transient resolver unreadability / request transport failures; do not blindly retry unsupported/private input or unexpected hard responses.
- Keep the canonical `/api/shared-chat` contract unchanged.
- Keep the existing structured handoff fallback available.
- Add browser regression coverage for recovery after transient failures and exhaustion of the retry budget.
- Preserve mobile usability and avoid exposing HTTP/proxy/parser details.

## Non-goals

- Replacing the Shared Chat resolver architecture.
- Changing F46 scheduled smoke classification.
- Adding authenticated ChatGPT scraping or credentials.
- Changing canonical Card identity, provenance, storage, sync, search, Semantic Gallery, Dashes, or continuation semantics.
- Mixing F39 rich-card detail work or F37 project-memory work into this change.

## Success criteria

A valid public Share URL that is transiently unreadable but becomes readable within the bounded retry window reaches the normal review state without requiring a second user click. Persistent unreadability still ends in a concise retry/fallback message, with no card created and no raw backend error exposed.
