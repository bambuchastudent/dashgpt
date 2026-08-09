# ADR 0002 — Universal MCP gateway with DashGPT instance protocol

Status: accepted for MVP

Date: 2026-08-09

## Context

The DashGPT MVP must be demonstrable by another person against that person's own DashGPT site. Hard-coding the developer's Result catalog would fail the product acceptance criterion.

The current public OpenAI plugin submission path expects most plugins to provide one Universal MCP URL. Template MCP URLs are a restricted path that requires prior OpenAI approval and are not a safe foundation for an independent MVP.

DashGPT also wants self-hosted deployments to remain first-class rather than turning the central service into the permanent system of record.

## Decision

Submit one public Universal MCP endpoint for DashGPT and make the read/context tools instance-neutral.

- Public plugin MCP endpoint: one stable DashGPT gateway `/mcp`.
- `list_results`, `get_result`, and `get_context_pack` accept an optional HTTPS `siteUrl`.
- When `siteUrl` is supplied, the gateway verifies the target through the DashGPT instance discovery document and reads that site's public Result protocol.
- When `siteUrl` is omitted, the gateway may use its own deployment as the demo/default instance.
- `prepare_result_import` accepts the destination `siteUrl` but remains non-mutating: it returns an explicit browser import URL rather than silently writing remote state.

Define DashGPT instance protocol v1:

- `GET /.well-known/dashgpt.json`
- `GET /api/dashgpt/results`
- `GET /api/dashgpt/results/<id>`
- `GET /api/dashgpt/context/<id>`

Remote instance reads require HTTPS and a compatible discovery manifest before Result data is trusted as DashGPT data.

## Consequences

Positive:

- one public plugin identity/MCP URL can work with many independently hosted DashGPT sites;
- the second-user MVP test can prove the plugin is not bound to developer data;
- self-hosted sites remain the source of truth for their own published Results;
- no database/authenticated central write API is required for the first public MVP;
- the browser import remains explicit and reviewable by the user.

Trade-offs:

- the universal gateway performs open-world reads to user-selected public DashGPT sites and must keep validation/privacy/tool annotations accurate;
- private Result catalogs will need a future authenticated instance protocol rather than this anonymous public-read MVP;
- a user or assistant must identify the intended DashGPT site unless a later account/profile binding supplies it;
- public plugin review and publisher verification remain external release gates.

## Revisit when

Reconsider this architecture when DashGPT adds authenticated private per-user data, automatic account/site binding, server-side Result writes, or an approved tenant-specific MCP mechanism that offers a cleaner user experience without weakening self-hosting portability.
