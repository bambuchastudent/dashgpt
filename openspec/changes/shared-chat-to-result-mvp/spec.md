# Spec — Shared Chat → Published Result MVP

## Functional requirements

1. The workflow SHALL accept a ChatGPT shared-link URL as source provenance.
2. The shared-link URL SHALL match the official `https://chatgpt.com/share/<conversation-ID>` shape before publication.
3. A published Result SHALL contain at minimum: stable id, title, summary, category, tags, decisions, next step and publication marker.
4. When available, a published Result SHALL contain source type, source URL and a human-readable source label.
5. Published Results SHALL live outside the application JavaScript in a portable JSON data file.
6. The dashboard SHALL fetch published Results at startup and merge them with browser-local Results.
7. A refresh of published data SHALL update published Result content while preserving the user's local favorite state for an existing Result.
8. Browser-local Results SHALL survive publication refreshes.
9. Result details SHALL expose a source link when provenance is available.
10. Generated Context Packs SHALL include the source URL when provenance is available.
11. Failure to refresh the published JSON SHALL not destroy locally cached Results.

## MVP publication mechanism

For this change, an agent may perform the summarization and Git publication step. DashGPT runtime-side LLM summarization is explicitly not required.

## Non-goals

- scraping private/non-shared ChatGPT conversations
- automatic in-browser ChatGPT authentication
- final database/storage architecture
- background ingestion queue
- automatic category taxonomy
- paid LLM API requirement
- MCP ingestion endpoint

## Acceptance

The slice is accepted when a real readable ChatGPT shared link can be turned into a new published Result by the agent, deployed, opened in DashGPT, traced back to its source link, and exported as a Context Pack without overwriting existing local Results.
