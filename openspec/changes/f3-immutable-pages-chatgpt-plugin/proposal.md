# Feature 3 — Immutable Result pages + DashGPT ChatGPT plugin MVP

## Why

Feature 2 proved that a real shared ChatGPT conversation can become a published DashGPT Result. The next MVP gap is demonstrability: a Result needs a stable page that survives visual redesigns without changing its knowledge, and ChatGPT needs to be able to read a DashGPT instance as an actual plugin/MCP integration.

The MVP is only convincing if the same integration can be demonstrated against a second person's DashGPT site rather than developer-only hard-coded data.

## Scope

- Add stable standalone Result routes under `/demo/result/<id>/`.
- Use one common renderer for dashboard and Result pages so future presentation changes update old pages automatically.
- Separate immutable published content from mutable presentation.
- Add `immutable` and `contentVersion` metadata to published Results.
- Add a CI guard that prevents in-place edits/removal/unlocking of already immutable Result content.
- Publish the second user-provided shared chat as a sanitized immutable Result page.
- Add a read-only `/mcp` endpoint exposing published Results and Context Packs.
- Add a plugin package under `plugins/dashgpt/` with stable plugin id `dashgpt`.
- Prepare the repository for ChatGPT developer-mode registration and later plugin packaging with the real registered MCP connection id.

## Explicitly not in this change

- Public Plugin Directory submission/approval.
- Inventing or committing a fake `plugin_asdk_app...` id before ChatGPT registration.
- General write/update tools from ChatGPT.
- OAuth/multi-tenant hosted account infrastructure.
- Final revision graph/editing UX.
- UI redesign beyond what is needed to support the shared page shell.

## Privacy

The second shared conversation contains personal-document material that is not needed for the useful Result. The published Result must omit personal identifiers and preserve only the camping/fishing planning knowledge relevant to the outcome.
