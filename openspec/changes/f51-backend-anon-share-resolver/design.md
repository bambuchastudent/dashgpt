# Design — F51 anonymous Share JSON resolver refresh

## Context

Current `src/shared-chat.js` validates public ChatGPT Share URLs and then tries a layered resolver sequence. F16 added the then-current `backend-api/share/<id>` JSON path through Jina Reader. F11/F12/F15 retain direct page, proxy and Cloudflare Browser fallbacks.

The current reproduction is known to be genuinely public because it opens in an incognito/logged-out browser, yet both F48 retry and F49 page-payload compatibility previews remain unreadable. This distinguishes access scope from server-side retrieval.

Current external evidence shows ChatGPT's logged-out web client using the `backend-anon` namespace, and a current public-share exporter uses `backend-anon/share/<id>` for the same visible public conversation contract. Cloudflare's current Browser Run documentation explicitly states Browser Run requests are identifiable as bot traffic and do not bypass target bot protection, so Browser Run remains compatibility fallback rather than the preferred retrieval path.

## Decision

### Retrieval order

Add a direct first-party anonymous JSON attempt before the current resolver chain:

1. `https://chatgpt.com/backend-anon/share/<id>` via the existing injected upstream fetch boundary;
2. existing Jina Reader `backend-api/share/<id>` JSON path;
3. existing Reader Share page;
4. existing AllOrigins raw HTML;
5. existing Browser DOM scrape;
6. existing direct Share HTML;
7. existing Browser rendered HTML.

No existing fallback is removed by F51.

### Anonymous JSON request

Use GET with browser-compatible public navigation/API headers and `Accept: application/json`. Do not send ChatGPT authentication, user cookies, account identifiers or DashGPT credentials.

A successful response must be HTTP 2xx and parse as the existing public-share JSON conversation shape. HTML challenge/interstitial bodies, malformed JSON and empty mappings are failures and continue to the next compatibility path.

### Conversation projection

Reuse `parseBackendShareJsonText()` and its existing rules:

- prefer `current_node` ancestry;
- do not mix regenerated sibling branches;
- include visible user/assistant turns only;
- exclude system/tool/visually hidden turns;
- preserve fallback-title behavior and canonical Share id.

Do not introduce a second Card/message model.

### Error behavior

Provider/status/parser details remain internal. If every path fails, keep the existing `502 SHARED_CHAT_UNREADABLE` contract and human Save-chat state. F48 may independently retry that contract when its PR is stacked/merged.

## Security and privacy

- Strict ChatGPT host/share-path validation remains before deriving any backend URL.
- `backend-anon` is used only for a Share id obtained from a validated public Share URL.
- No private/authenticated endpoints, session tokens, cookies or CAPTCHA bypass are introduced.
- No user reproduction URL or transcript is committed as a fixture.
- Existing third-party fallbacks are preserved but F51 adds no new third-party provider.

## Verification

- Strict OpenSpec validation before production edits.
- Deterministic tests for anonymous route ordering, success, malformed/challenge fallback and current-node projection.
- `npm run check` and browser suites/canonical full gate available on the branch.
- Cloudflare preview deployment.
- Real acceptance with the user-reported public Share that opens incognito; only then can F51 be called product-verified/merge-ready.
