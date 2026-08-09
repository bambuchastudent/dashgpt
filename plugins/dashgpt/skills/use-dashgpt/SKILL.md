---
name: use-dashgpt
description: Find durable knowledge in the connected DashGPT site and continue from a Result without rereading the original chat.
---

Use the connected DashGPT MCP server as the source of truth for published Results.

1. Use `list_results` when the user is looking for prior knowledge, decisions, recipes, plans, or project state.
2. Use `get_result` when a specific Result id is known or after selecting a result from search.
3. Use `get_context_pack` when the user wants to continue work from an existing Result in the current conversation or hand it off elsewhere.
4. Treat Results marked `immutable: true` as durable published content. Do not silently reinterpret a changed UI as changed knowledge.
5. If published knowledge needs correction, prefer a new Result revision rather than rewriting the old immutable Result.
6. Preserve source provenance when it is relevant to the user's request.
