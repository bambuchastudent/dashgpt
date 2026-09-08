# Design — F48 Share capture retry resilience

## Context

`resolveSharedChatCard()` in `demo/public-onboarding.js` currently performs one fetch to `/api/shared-chat`. Any failed response immediately becomes the terminal red Save-chat state. The backend already tries several resolver strategies inside one request, but real production evidence shows that an entire request can still end as `SHARED_CHAT_UNREADABLE` while a later request for the same public Share succeeds.

The latest production smoke for the fresh public fixture on 2026-09-08 failed with `502 SHARED_CHAT_UNREADABLE` on attempts 1–5 and succeeded on attempt 6. The user-facing flow has no equivalent retry budget today.

## Decision

Keep retry ownership in the interactive Save-chat client instead of multiplying all backend resolver work inside every API request.

The client will:

1. Normalize/validate the Share URL once.
2. Attempt the canonical `/api/shared-chat` request up to six times.
3. Retry when:
   - the request fails at the transport layer; or
   - the endpoint responds with `502` and JSON code `SHARED_CHAT_UNREADABLE`.
4. Use short bounded backoff between attempts.
5. Update the existing live status text with human language while retrying.
6. Immediately stop on unexpected hard responses instead of hiding a real contract failure behind retries.
7. Preserve the existing final fallback message after retry exhaustion.

## Why six attempts

The production smoke already demonstrated a real current-format Share that required six attempts before success. Matching that bounded budget gives the interactive path a chance to recover from the same transient condition without creating an unbounded loop.

## UX

Initial state remains `Читаю общий разговор…`.

On transient misses, the same status line changes to a concise message such as `ChatGPT отвечает нестабильно. Пробую ещё раз (3/6)…`. No HTTP status, resolver name, proxy name, or parser implementation detail is shown.

On eventual success, the normal review state and `Готово. Проверь карточку и сохрани.` message are used.

On exhaustion, the existing understandable retry/fallback state remains visible and the structured handoff fallback stays available.

## Failure classification

Retryable:
- fetch/network exception;
- HTTP 502 with payload code `SHARED_CHAT_UNREADABLE`.

Not retryable:
- URL validation failures before the request;
- other HTTP/error payloads, because they may indicate a real application contract problem.

## Data and architecture impact

None. No schema changes. No new storage. No Card identity changes. No resolver API contract changes. The same normalized Share URL remains source provenance when capture succeeds.

## Verification

Add Playwright regressions to `tests/save-chat-flow.spec.mjs`:
- first attempts return `502 SHARED_CHAT_UNREADABLE`, a later attempt returns 200, and the review appears from one submit action;
- all retryable attempts fail, final UI is human-readable, no raw code/HTTP detail is shown, and no card is created.

Run targeted Save-chat tests, OpenSpec validation, and final `npm run verify:full`. Verify the dialog at the existing narrow mobile viewport.
