# F49 — React Router Share payload compatibility

## Why

A valid ChatGPT `https://chatgpt.com/share/<id>` can remain `SHARED_CHAT_UNREADABLE` even after the bounded client retry added by F48. That means the failure is not always transient: the current resolver can exhaust every retrieval path while the public page is using a newer server-rendered payload shape that DashGPT does not understand.

Current 2026 ChatGPT Share pages have been observed embedding conversation data in a React Router 7 turbo-stream payload (`window.__reactRouterContext.streamController.enqueue(...)`). The existing DashGPT parser dependency is pinned to `chatgpt-share-parser@0.1.1` and the resolver's compatibility paths still assume older payload/DOM/backend shapes. A fresh user-reported public Share reproduced the persistent unreadable state on 2026-09-08 after the F48 retry budget was exhausted.

This overlaps historical F11/F12/F15/F16/F17 work: strict URL validation, Browser fallback, anonymous resolver providers, current backend JSON parsing, and regression safety nets remain valid. The missing capability is parsing the current turbo-stream page payload when the backend JSON path is blocked or unavailable.

## Goal

Teach the existing `/api/shared-chat` resolver to extract a readable public conversation from the current React Router 7 turbo-stream page representation while preserving the same shared-chat response contract and all existing fallbacks.

## Scope

- Add a defensive parser for React Router 7 `streamController.enqueue(...)` payloads from validated ChatGPT Share HTML.
- Resolve the flat graph representation, including indexed object keys and slot references, cycle-safely.
- Deep-search the resolved graph for a conversation object containing `mapping` or `linear_conversation`.
- Convert that conversation through the existing visible user/assistant message rules and title fallback behavior.
- Integrate the parser as a compatibility fallback around existing raw/direct/browser HTML parsing without changing `/api/shared-chat` response fields.
- Add deterministic regression coverage for a representative turbo-stream payload, malformed payloads, hidden/system/tool filtering, and conversation ordering.
- Keep existing Jina/backend, page-reader, proxy, Browser DOM, direct HTML and Browser HTML paths intact.

## Non-goals

- Authenticated/private ChatGPT access, cookies, tokens, CAPTCHA bypass, or workspace access-control bypass.
- Replacing the existing resolver architecture or removing provider fallbacks.
- Changing F48 retry behavior or F46 smoke classification.
- Changing canonical Card identity, provenance, storage, sync, search, Semantic Gallery, Dashes, continuation, or F39 rich-card detail.
- Preserving every rich attachment/tool widget in this compatibility fix.

## Success criteria

A public Share whose conversation is only available to DashGPT through the current React Router turbo-stream page payload resolves into the existing shared-chat contract instead of `SHARED_CHAT_UNREADABLE`. Legacy/backend/DOM paths remain compatible, malformed payloads fail closed into the existing fallback chain, deterministic parser regressions pass, and the current preview can resolve the fresh reproduction link without exposing parser or provider internals to the user.
