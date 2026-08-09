# Feature 4 spec — DashGPT public plugin MVP

## 1. Public plugin identity

- Package id remains `dashgpt`.
- Customer-facing name remains **DashGPT**.
- The plugin is an MCP + skill plugin intended for the universal Plugins Directory shared by ChatGPT and Codex.
- Public listing metadata must include a concise description, long description, category, website, support URL, privacy URL and terms URL.
- Publisher identity in the submission must match a verified OpenAI Platform developer or business identity.

## 2. Universal MCP architecture

OpenAI's normal public submission path expects a Universal MCP URL. DashGPT must therefore submit one fixed production MCP endpoint.

The universal MCP endpoint must not assume that its own deployed catalog is the user's catalog. Read-oriented tools accept an optional `siteUrl` identifying a public DashGPT instance. When omitted, the server may use its own instance for demo/default behavior.

A remote site is considered a DashGPT instance only when it:

- uses HTTPS;
- exposes `/.well-known/dashgpt.json` declaring the DashGPT instance protocol;
- exposes the public Result endpoints defined below.

The gateway must reject malformed, unsupported or non-HTTPS targets with a clear error.

## 3. Public DashGPT instance protocol v1

Every hosted DashGPT instance exposes:

- `GET /.well-known/dashgpt.json` — product/protocol discovery;
- `GET /api/dashgpt/results` — published Result catalog;
- `GET /api/dashgpt/results/<id>` — one published Result;
- `GET /api/dashgpt/context/<id>` — Context Pack for one published Result.

The protocol is intentionally read-only for the MVP. Browser import remains an explicit user action.

## 4. MCP tools

### `list_results`

- Optional `siteUrl`, query, category and limit.
- Returns compact Result metadata and stable page URLs from the selected instance.
- `readOnlyHint=true`, `destructiveHint=false`, `openWorldHint=true` because the tool may read a user-selected public site.

### `get_result`

- Requires Result id; optional `siteUrl`.
- Reads exactly one Result from the selected instance.
- Same read/open-world annotations as `list_results`.

### `get_context_pack`

- Requires Result id; optional `siteUrl`.
- Returns the selected instance's portable Context Pack.
- Same read/open-world annotations as `list_results`.

### `prepare_result_import`

- Distills caller-provided title/summary/category/tags/decisions/next/source into an immutable Result payload.
- Optional `siteUrl` selects the destination DashGPT site.
- Returns an explicit user-opened import URL.
- Calling the tool itself must not mutate external state.
- `readOnlyHint=true`, `destructiveHint=false`, `openWorldHint=false`.

## 5. Privacy and safety

- Tool responses must not contain auth secrets, debug payloads or unnecessary personal identifiers.
- Plugin instructions must tell the assistant not to persist secrets or personal document identifiers unless the user explicitly requests that exact data and it is necessary.
- Public privacy policy must describe browser-local imports, published Results, shared-chat ingestion, remote-instance reads and self-hosting responsibility.
- Public terms and support pages must be reachable from the listing.

## 6. Submission readiness

Repository submission material must contain:

- listing copy and URLs;
- production MCP URL and domain-verification instructions;
- accurate tool annotations;
- starter prompts;
- at least five positive reviewer test cases;
- at least three negative reviewer test cases;
- country/region recommendation;
- initial release notes;
- manual prerequisites: Apps Management Write permission and verified publisher identity.

## 7. Acceptance

Automated checks must cover:

- manifest identity;
- MCP initialize/tool discovery;
- public instance discovery and read endpoints;
- local/default Result reads;
- remote-instance routing using a deterministic test fixture;
- Context Pack retrieval;
- explicit import-link generation and integrity hash;
- domain verification challenge behavior;
- public policy/support pages existing.

Human MVP acceptance requires a second person's separate DashGPT site and ChatGPT account. They must be able to use the public DashGPT plugin to read their own Result, obtain a Context Pack, and explicitly save/import a new Result into their own site.
