# Fresh ChatGPT Share backend resolver

## Problem

The anonymous Share flow introduced by f15 can still fail for freshly-created public ChatGPT Share URLs even when those URLs are publicly readable. Live production verification showed that:

- `https://chatgpt.com/share/<id>` can return HTTP 200 outside the Worker;
- Jina Reader can render the same fresh share immediately;
- Jina Reader can also read `https://chatgpt.com/backend-api/share/<id>` and expose the current public conversation JSON;
- DashGPT still returned `SHARED_CHAT_UNREADABLE` because it only understood the legacy page payload / markdown path.

This is a parser and retrieval-order defect, not evidence that the visitor's public share is private.

## Change

Prefer the current public share JSON through the existing anonymous resolver boundary. Parse its conversation mapping into the same DashGPT shared-chat contract, then retain the existing page-reader, raw-proxy, Browser Run and direct compatibility paths.

## Success criteria

A newly-created public ChatGPT Share URL can be resolved without waiting for a legacy HTML payload or cache warm-up. Resolver/provider details remain hidden from the visitor. Live smoke must include at least two real public Share URLs, including a fresh link that previously failed in production.
