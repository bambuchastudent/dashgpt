# Design

## Resolver order

1. Validate and canonicalize the public ChatGPT share URL locally.
2. Try Jina Reader against the public share page. It is a no-key public reader for basic use and returns LLM-friendly text; parse speaker-labelled text into the existing Result-source conversation shape.
3. Try AllOrigins raw proxy against the canonical ChatGPT share page and parse the returned HTML with the existing `chatgpt-share-parser`.
4. Keep the existing direct ChatGPT fetch and Cloudflare Browser Run paths as compatibility fallbacks.
5. If all providers fail, return the existing stable `SHARED_CHAT_UNREADABLE` product error without provider/status details.

Provider-specific transports are internal. The public response remains `{ sourceUrl, fetchedAt, retrieval, title, replies, ... }`.

## Reader parsing

Reader text is accepted only when it contains at least one recognizable user/assistant turn. Supported labels include headings/labels such as `You said`, `User`, `ChatGPT said`, and `Assistant`. Decorative page text is ignored. The first useful heading becomes the title; otherwise the first user turn is used as a bounded fallback title.

## Mobile handoff

The existing chat-first command remains the primary welcome action. A secondary share-link form allows anonymous visitors to paste a public ChatGPT Share URL. `?share=` pre-populates and automatically attempts that same flow, giving a future iPhone Shortcut a stable handoff target without adding native app code now.

## Security and privacy

Only canonical public `https://chatgpt.com/share/...` URLs are accepted before any third-party request. No arbitrary proxy target is possible. The resolver never receives ChatGPT credentials or private conversation URLs. The public URL is already shareable by design, but provider names remain an implementation detail and should not be shown in normal UI.

## Reliability

No single free provider is treated as authoritative. Deterministic tests mock each provider independently, assert zero unsafe arbitrary-host requests, and verify clean fallback behavior. A separate external smoke can be added without making regular CI depend on third-party uptime.
