# F51 — Anonymous Share JSON resolver refresh

## Problem

A genuinely public ChatGPT Share URL can open in a logged-out/incognito browser while DashGPT still returns `SHARED_CHAT_UNREADABLE`. F48 proves retries only help transient failures, and F49's additional page parser does not help when the Worker never receives a readable conversation payload.

The current resolver prefers the older `backend-api/share/<id>` route through Jina Reader, then other automated page/browser fallbacks. Current 2026 ChatGPT clients also expose a logged-out anonymous route at `backend-anon/share/<id>`. Independent current implementations use that route for public Share export, while Cloudflare documents that Browser Run traffic remains explicitly bot-identifiable and does not bypass target bot protection.

## Goal

Make link-first capture use the current anonymous ChatGPT share JSON route as the cheapest first-party public-data path, while retaining all existing compatibility fallbacks and human error states.

## Scope

- add a first-party `https://chatgpt.com/backend-anon/share/<id>` retrieval attempt before the existing Reader/backend/page/proxy/browser/direct fallbacks;
- parse the response through the existing public-share JSON projection and current-node branch semantics;
- use ordinary anonymous browser-navigation/request headers only; no credentials, account cookies, session tokens or access-control bypass;
- reject non-JSON/challenge/error responses and continue through existing fallbacks;
- keep `/api/shared-chat` response fields, Card identity/provenance, storage, continuation, search, Gallery and Dashes unchanged;
- add deterministic resolver-order/success/failure regressions;
- verify on production preview with the public reproduction that opens logged-out.

## Non-goals

- authenticated/private ChatGPT capture;
- bypassing CAPTCHA, Turnstile or bot protection;
- changing F48 retry behavior;
- changing F49 parser behavior;
- adding new third-party proxy providers;
- changing Card detail/F39 or project-memory/F37.
