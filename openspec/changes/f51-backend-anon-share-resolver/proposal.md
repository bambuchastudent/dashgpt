# F51 — Anonymous Share JSON resolver refresh

## Problem

A genuinely public ChatGPT Share URL can open in a logged-out/incognito browser while DashGPT still returns `SHARED_CHAT_UNREADABLE`. F48 proved retries only help transient failures. F49's page-payload compatibility parser did not resolve the exact reproduction. The first F51 candidate then added a direct `backend-anon/share/<id>` request, passed deterministic/browser/full verification, deployed successfully, and still failed the exact logged-out public acceptance.

That failed acceptance narrows the remaining difference: current public-share clients can establish anonymous browser state by opening the public Share page before requesting `backend-anon`. A current public exporter follows exactly that sequence in one fresh browser context. A direct server fetch has no such page-created anonymous cookie/context state.

Cloudflare Browser Run remains bot-identifiable and is not an access-control or anti-bot bypass. It is, however, already bound to DashGPT and can model a fresh logged-out navigation/request sequence without using the visitor's ChatGPT session.

## Goal

Resolve genuinely public ChatGPT Shares using the cheapest current first-party JSON path when possible, and add one bounded fresh anonymous browser-session recovery path for public links that exhaust the existing resolver chain, while preserving all Card/capture contracts and never reusing user authentication state.

## Scope

- keep the cheap direct `https://chatgpt.com/backend-anon/share/<id>` preflight for public `/share/<id>` links;
- keep the existing Reader/backend/page/proxy/Browser/direct compatibility chain unchanged;
- only after that chain exhausts with `SHARED_CHAT_UNREADABLE`, allow one bounded fresh Browser Run session for an ordinary validated public Share;
- in that fresh session, navigate to the canonical public Share page, then request `backend-anon/share/<id>` from the same logged-out browser context with only anonymous state created by that navigation;
- parse successful JSON through the existing `parseBackendShareJsonText()` projection and current-node branch semantics;
- close the browser session on success or failure and fall back to the original human unreadable response if the session cannot read the public conversation;
- never import, forward, request or persist the visitor's ChatGPT cookies, login/session tokens, account identifiers or credentials;
- keep `/api/shared-chat`, canonical Card identity/provenance, storage, continuation, Search, Gallery and Dashes unchanged;
- add deterministic orchestration/regression coverage and rerun canonical verification plus the exact production-preview acceptance.

## Non-goals

- authenticated/private ChatGPT capture;
- bypassing CAPTCHA, Turnstile, project membership or bot protection;
- replaying user browser cookies or ChatGPT account state;
- changing F48 retry behavior;
- changing F49 parser behavior;
- adding a new third-party proxy provider;
- changing Card detail/F39 or project-memory/F37.
