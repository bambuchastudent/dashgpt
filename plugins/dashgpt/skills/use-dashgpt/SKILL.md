---
name: use-dashgpt
description: Find durable knowledge in the connected DashGPT site, continue from a Result, or save the useful outcome of the current conversation as an immutable Result.
---

Use the connected DashGPT MCP server as the source of truth for published Results.

1. Use `list_results` when the user is looking for prior knowledge, decisions, recipes, plans, or project state.
2. Use `get_result` when a specific Result id is known or after selecting a Result from search.
3. Use `get_context_pack` when the user wants to continue work from an existing Result in the current conversation or hand it off elsewhere.
4. When the user asks to save, publish, remember, or send the useful outcome of the current conversation to DashGPT, distill the conversation into a concise Result and call `prepare_result_import`.
5. The Result should keep the useful outcome, durable decisions, relevant tags, provenance when available, and the next intended action. Do not dump the raw conversation or tool chatter into the Result.
6. Before calling `prepare_result_import`, omit secrets, passwords, API keys, payment data, private document identifiers, and other sensitive personal data unless the user explicitly asks for that exact data to be saved and it is necessary for the Result.
7. `prepare_result_import` does not silently write to the site. Present its returned import URL to the user as the explicit **Open in DashGPT** action.
8. Treat Results marked `immutable: true` as durable published content. A renderer or visual redesign may change how the page looks without changing the knowledge itself.
9. If published knowledge needs correction, create an explicit new Result/content revision rather than silently rewriting the old immutable Result.
10. Preserve source provenance when it is relevant to the user's request.
