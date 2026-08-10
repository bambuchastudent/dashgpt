# Design

## Retrieval order

1. If the Cloudflare `BROWSER` binding is available, call Browser Run `scrape` for visible ChatGPT message turns and the page heading.
2. If rendered DOM extraction succeeds, return immediately and do not perform a raw fetch to `chatgpt.com`.
3. If rendered extraction is unavailable or fails, attempt the existing direct HTML fetch + structured parser.
4. As a final compatibility fallback, use Browser Run `content` + structured parser when Browser Run is available.

This order avoids a known predictable anti-bot failure in the normal production path while retaining compatibility with older share-page representations and local/test environments without Browser Run.

## Error boundary

Internal retrieval errors may retain status/parser information for diagnostics, but the public `/api/shared-chat` response exposes only a stable error code and human-facing message. Upstream status codes such as 403 are not part of the product contract.

## Security

The existing strict HTTPS host allowlist remains before any external retrieval. No arbitrary URL browsing or fetching is introduced.
