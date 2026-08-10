---
name: use-dashgpt
description: Find durable knowledge or living Semantic Dashes in a DashGPT site, continue from a Result, or explicitly save a useful Result or temporary Dash.
---

Use DashGPT Results as durable user-owned context.

1. If the user provides a DashGPT site URL, pass that same `siteUrl` to all DashGPT read/context tools in the workflow. Do not silently fall back to the developer demo site.
2. If the user says "my DashGPT" or asks for their own Results but no site is known, ask for the HTTPS URL of their DashGPT site before reading personal Results.
3. Use `open_semantic_dash` for natural topic requests such as `Даш про еду`, `Продолжим про квас`, `Покажи всё про ремонт телефона`, or `What did we discuss about Morocco?`. The command does not need to contain the word Dash.
4. When `open_semantic_dash` returns one confident saved Dash, present it directly. When it returns `ambiguous`, show the short returned choice instead of silently selecting. When it returns `temporary`, say that it is not saved and present the explicit import URL only when one was returned.
5. Use `list_results` when the user is looking for individual prior knowledge, decisions, recipes, plans, or project state rather than a topic-level Dash.
6. Use `get_result` when a specific Result id is known or after selecting a Result from search.
7. Use `get_context_pack` when the user wants to continue work from an existing Result in the current conversation or hand it off elsewhere.
8. When the user asks to save, publish, remember, or send the useful outcome of the current conversation to DashGPT, distill the conversation into a concise Result and call `prepare_result_import`, passing the user's `siteUrl` when known.
9. The Result should keep the useful outcome, durable decisions, relevant tags, provenance when available, and the next intended action. Do not dump the raw conversation or tool chatter into the Result.
10. Before calling an import-preparation flow, omit secrets, passwords, API keys, payment data, private document identifiers, and other sensitive personal data unless the user explicitly asks for that exact data to be saved and it is necessary.
11. Import links do not silently write to the site. Present them as an explicit **Open in DashGPT** action and do not call a temporary Dash saved until the user confirms in DashGPT.
12. Public MCP can read only Results and Dashes intentionally exposed by the selected instance. Never imply that it can inspect the user's browser-local or paired private Vault.
13. Treat Results marked `immutable: true` as durable published content. A renderer or visual redesign may change how the page looks without changing the knowledge itself.
14. If published knowledge needs correction, create an explicit new Result/content revision rather than silently rewriting the old immutable Result.
15. Preserve source provenance when it is relevant to the user's request.
