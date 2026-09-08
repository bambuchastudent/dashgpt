# Design — F51 anonymous Share JSON resolver refresh

## Context

`src/shared-chat.js` already validates public ChatGPT Share URLs and tries a layered resolver sequence. F16 added the then-current `backend-api/share/<id>` JSON path through Jina Reader. F11/F12/F15 retain page, proxy, direct and Cloudflare Browser compatibility fallbacks. The first F51 candidate added a cheap direct `backend-anon/share/<id>` preflight in `src/shared-chat-anon.js` and reused the existing JSON projection.

The exact user reproduction is confirmed genuinely public because it opens logged-out/incognito. F48, F49 and the direct F51 candidate all remained unreadable on preview even though repository, desktop/mobile and canonical full verification were green. Therefore the remaining difference is not retry budget, access scope, or basic JSON projection.

A current public-share exporter demonstrates a relevant logged-out sequence: it opens the public Share page first, then requests `backend-anon/share/<id>` from the same fresh browser context. That navigation can establish anonymous cookies/state which a direct Worker fetch does not have. Cloudflare Browser Run is bot-identifiable and must not be treated as a protection bypass, but a fresh browser session can faithfully preserve page-created anonymous state across the two same-origin requests.

## Decision

### Retrieval order

Keep existing cheap paths first and add the browser-context attempt only as a bounded recovery path:

1. direct first-party `https://chatgpt.com/backend-anon/share/<id>` preflight via the existing injected upstream fetch boundary;
2. existing `handleSharedChat()` compatibility chain unchanged:
   - Jina Reader `backend-api/share/<id>` JSON;
   - Reader Share page;
   - AllOrigins raw HTML;
   - Browser DOM scrape;
   - direct Share HTML;
   - Browser rendered HTML;
3. only when the delegated handler returns `502` with code `SHARED_CHAT_UNREADABLE`, the URL is an ordinary validated `/share/<id>`, and the Browser binding is available, try one fresh anonymous browser-session recovery;
4. if that recovery fails, return the original human `SHARED_CHAT_UNREADABLE` response unchanged.

This keeps the more expensive session path off the happy path and prevents a new hard dependency on Browser Run.

### Integration shape

Keep `src/shared-chat-anon.js` as the F51 compatibility module and export two narrow operations:

- `tryAnonymousSharedChat(request, env)` — existing cheap direct JSON preflight;
- `tryBrowserSessionSharedChat(request, env)` — fresh anonymous browser-session recovery.

`src/worker.js` orchestrates them only for `/api/shared-chat`:

1. direct anonymous preflight;
2. existing `handleSharedChat()`;
3. inspect a cloned response only to determine whether the result is exactly `SHARED_CHAT_UNREADABLE`;
4. then attempt the browser-session recovery;
5. otherwise return the delegated response unchanged.

No Card/message model, endpoint schema or provider-specific error is introduced.

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

For deterministic tests, `env.DASHGPT_ANON_BROWSER_FETCH` may inject the browser-session result without launching Browser Run. Production uses that hook only when explicitly provided by the test/runtime environment; normal deployed behavior uses the `BROWSER` binding.

### Bounded failure behavior

- one browser session attempt per endpoint invocation;
- bounded page navigation and in-page request timeouts;
- no CAPTCHA solving, repeated challenge loops or credential prompts;
- any navigation, challenge, non-2xx, malformed JSON, no-turn or parser failure returns `null` to orchestration;
- the original existing human unreadable response is returned unchanged when recovery misses.

F48 remains a separate client retry capability; F51 does not change its retry budget or classification.

### Conversation projection

Both direct and browser-session JSON reuse `parseBackendShareJsonText()`:

- prefer `current_node` ancestry;
- do not mix regenerated sibling branches;
- include visible user/assistant turns only;
- exclude system/tool/visually hidden turns;
- preserve fallback-title behavior and canonical Share id.

## Security and privacy

- Strict ChatGPT host/share-path validation is reused before deriving any backend URL.
- Browser recovery is limited to an ordinary validated public `/share/<id>` URL and the corresponding same-origin `backend-anon/share/<id>` path.
- No user cookies, ChatGPT login/session tokens, passwords, project credentials or DashGPT storage credentials enter the browser session.
- The new session starts logged out and uses only state created by the public ChatGPT page itself.
- Browser Run is not used to solve CAPTCHA/Turnstile or bypass access controls; a challenge is simply a failed public retrieval path.
- No user reproduction URL or transcript is committed as a fixture.

## Cost / operations

Browser Run already exists in the deployment. F51 adds no new binding or secret, but the recovery path can consume additional browser time. To bound that cost it runs only after the direct preflight and the entire existing resolver chain have failed, and only once per endpoint invocation.

## Verification

- Update OpenSpec first and require strict validation before this refinement reaches production code.
- Deterministic tests for:
  - existing direct-anon success;
  - no session launch after any existing resolver success;
  - session recovery only after exact `SHARED_CHAT_UNREADABLE`;
  - same canonical Share/backend ids passed to the injected session hook;
  - browser-session success using existing JSON projection;
  - browser-session miss preserving the original human 502 response;
  - invalid/unsupported URLs never launching a session.
- Run targeted shared-chat verification and `npm run check`.
- Run desktop/mobile browser suites and final canonical `npm run verify:full`.
- Verify Cloudflare preview deployment.
- Re-run the exact user-reported public Share on preview. Only a normal reviewable Card result makes F51 product-verified/merge-ready.
