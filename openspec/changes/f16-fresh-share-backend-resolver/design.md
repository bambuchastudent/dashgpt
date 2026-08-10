# Design

## Retrieval order

1. Resolve `https://chatgpt.com/backend-api/share/<id>` through the anonymous Reader boundary.
2. Parse the returned public share JSON into the existing `{title,replies,...}` contract.
3. If unavailable/unreadable, fall back to Reader-rendered `/share/<id>` markdown.
4. Then try raw HTML proxy, Browser Run DOM, direct HTML and Browser Run HTML compatibility paths.

## Public share JSON parsing

The resolver response may be raw JSON or wrapped by Reader metadata (`Title`, `URL Source`, `Markdown Content`). Locate and parse the JSON object, then derive the visible conversation path from `mapping`.

Prefer `current_node` when present and follow `parent` pointers to root. Otherwise select the deepest/latest leaf and follow its parent path. Include visible `user` and `assistant` messages only. Ignore system/developer messages and messages explicitly marked visually hidden. Normalize text parts and deduplicate identical adjacent turns.

## Privacy/security

The original target remains restricted to known ChatGPT share hosts before any external request. The external resolver sees only a URL the visitor explicitly made public. Provider errors and upstream status codes are never returned to onboarding.

## Verification

Unit/contract tests cover raw/wrapped backend JSON, provider ordering, branch selection, hidden/system filtering and existing fallbacks. A separate live smoke hits real production with both an older known-good public share and the fresh share that reproduced the failure.
