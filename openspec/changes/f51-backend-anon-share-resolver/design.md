# Design — F51 anonymous Share JSON resolver refresh

## Context

`src/shared-chat.js` already validates public ChatGPT Share URLs and tries a layered resolver sequence. F16 added the then-current `backend-api/share/<id>` JSON path through Jina Reader. F11/F12/F15 retain page, proxy, direct and Cloudflare Browser compatibility fallbacks. The first F51 candidate added a cheap direct `backend-anon/share/<id>` preflight in `src/shared-chat-anon.js` and reused the existing JSON projection.

The exact user reproduction is confirmed genuinely public because it opens logged-out/incognito. F48, F49, the direct F51 candidate, and the refined fresh browser-session candidate all remained unreadable on preview even though repository, desktop/mobile and canonical full verification were green. Therefore the next useful step is not another speculative resolver branch: it is production diagnostic evidence from the exact failing public URL.

## Decision

### Retrieval order

Keep existing cheap paths first and the browser-context attempt only as a bounded recovery path:

1. direct first-party `https://chatgpt.com/backend-anon/share/<id>` preflight via the existing injected upstream fetch boundary;
2. existing `handleSharedChat()` compatibility chain unchanged:
   - Jina Reader `backend-api/share/<id>` JSON;
   - Reader Share page;
   - AllOrigins raw HTML;
   - Browser DOM scrape;
   - direct Share HTML;
   - Browser rendered HTML;
3. only when the delegated handler returns `502` with code `SHARED_CHAT_UNREADABLE`, the URL is an ordinary validated `/share/<id>`, and the Browser binding is available, try one fresh anonymous browser-session recovery;
4. if that recovery fails, return the original human `SHARED_CHAT_UNREADABLE` response unchanged for normal requests.

### Integration shape

Keep `src/shared-chat-anon.js` as the F51 compatibility module and export the existing direct/browser-session operations. For diagnostic requests, allow those helpers to append only sanitized stage outcomes to an in-memory trace owned by `src/worker.js`.

`src/worker.js` orchestrates `/api/shared-chat` and detects `diagnostics=1`. Normal requests use the same behavior as before. On a diagnostic request that still fails after the browser-session recovery, the Worker returns the same error/code plus a `diagnostics` object.

Because `handleSharedChat()` intentionally hides provider details, diagnostic mode MAY perform one bounded support-only replay through exported `canonicalSharedChatUrl()` + `readSharedChat()` after the normal failure. `readSharedChat()` already preserves internal per-stage failure causes in its thrown `SHARED_CHAT_UNREADABLE` error. The replay is used only to classify those causes into safe diagnostic entries; raw error/cause objects are never serialized.

### Diagnostic contract

`diagnostics=1` is an explicit support/debug request, not normal onboarding behavior. A failing response includes a compact object such as:

- `version` and generated `traceId`;
- canonical Share id only, not a copied query string;
- ordered `steps` with stable stage names;
- each step may contain only a sanitized `outcome`, numeric HTTP `status` where known, and a coarse `kind` such as `timeout`, `challenge`, `http`, `parse`, `empty`, `missing-binding`, `launch`, `navigation`, or `unknown`;
- Browser-session steps record whether the binding existed, launch/navigation reached the next milestone, and what status the same-origin anonymous JSON request returned;
- legacy resolver replay records the existing Reader/backend/page/proxy/browser/direct stage failures using the same coarse classification.

The diagnostic payload MUST NOT contain raw response bodies, HTML, JSON conversation payloads, transcript/message text, cookies, `Set-Cookie`, authorization headers, incoming request headers, account/session identifiers, passwords, project credentials, or storage credentials.

### Fresh anonymous browser session

Use the existing `BROWSER` binding with `@cloudflare/puppeteer` for full session control. The session is newly launched for this recovery attempt and is never seeded from request headers or user browser state.

The bounded sequence is:

1. launch a fresh Browser Run session;
2. create a page;
3. navigate to the already validated canonical public Share URL with a bounded timeout and `domcontentloaded` readiness;
4. from that same page context, issue a same-origin `fetch()` to `https://chatgpt.com/backend-anon/share/<validated-id>` with `credentials: "include"` and `Accept: application/json`;
5. return only status/text needed for parsing;
6. parse through `parseBackendShareJsonText()`;
7. close the browser in `finally` on every path.

`credentials: "include"` here means only cookies/state created inside this new logged-out Browser Run session. DashGPT MUST NOT copy cookies, authorization headers, account identifiers or credentials from the incoming request into the browser session.

### Bounded failure behavior

- one browser session attempt per endpoint invocation;
- bounded page navigation and in-page request timeouts;
- no CAPTCHA solving, repeated challenge loops or credential prompts;
- any navigation, challenge, non-2xx, malformed JSON, no-turn or parser failure falls back to the existing human error;
- diagnostic replay happens only when `diagnostics=1` is explicitly requested and the normal attempt already failed;
- normal requests incur no diagnostic replay cost.

### Security and privacy

- Strict ChatGPT host/share-path validation is reused before deriving any backend URL.
- Browser recovery is limited to an ordinary validated public `/share/<id>` URL and corresponding same-origin anonymous backend path.
- No user cookies, ChatGPT login/session tokens, passwords, project credentials or DashGPT storage credentials enter the browser session or diagnostic payload.
- A challenge is recorded only as a coarse outcome; its body is never returned.
- No user reproduction URL or transcript is committed as a fixture.

## Cost / operations

Browser Run already exists in deployment. F51 adds no new binding or secret. Diagnostic replay can repeat the existing public resolver sequence, but only when the caller explicitly requests `diagnostics=1` after an unresolved failure. This keeps ordinary product traffic unchanged while making a one-off mobile support report actionable.

## Verification

- Update OpenSpec first and strictly validate before diagnostic production code.
- Deterministic tests for:
  - diagnostics absent on ordinary unresolved requests;
  - diagnostics present only with `diagnostics=1` after failure;
  - direct anonymous HTTP/parse outcome classification;
  - browser binding/launch/navigation/backend status classification;
  - legacy resolver causes reduced to safe stage/kind/status entries;
  - no raw body/transcript/cookie/auth material in serialized diagnostics;
  - successful resolver paths do not emit failure diagnostics.
- Run targeted shared-chat verification and `npm run check`.
- Run desktop/mobile browser suites and final canonical `npm run verify:full`.
- Verify Cloudflare preview deployment.
- Open the diagnostic URL for the exact public reproduction from mobile, copy the returned trace, and use it to decide the next resolver fix. F51 remains draft until the real Share reaches normal Card review.
