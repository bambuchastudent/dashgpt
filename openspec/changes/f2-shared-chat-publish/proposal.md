# Feature 2 — Shared chat → published Result

## Why

DashGPT needs a useful ingestion path before building a full importer or model backend.

The fastest MVP is agent-mediated publishing:

1. the user sends a public ChatGPT shared-chat URL to an assistant/agent;
2. the agent reads the public conversation;
3. the agent distills it into a DashGPT Result;
4. the agent publishes that Result into the repository-backed Result catalog;
5. the existing Cloudflare deployment picks it up and the card appears in DashGPT.

This proves real chat → curated Result without coupling the core to a particular paid LLM API or requiring browser-side scraping.

## Scope

- Add a repository-backed published Result catalog at `demo/data/results.json`.
- Make the demo load published Results at startup and merge them with browser-local Results.
- Published content is canonical for title/summary/tags/decisions/next/source; local favorite state remains local.
- Show source provenance when a Result came from a shared chat.
- Include source provenance in generated Context Packs.
- Define a stable Result shape an external assistant can publish through Git/GitHub.

## Explicitly not in this MVP

- In-browser fetching or scraping of ChatGPT shared links.
- A Cloudflare Worker summarization endpoint.
- Mandatory Workers AI/OpenAI/Anthropic API usage.
- Authentication for a general write API.
- Automatic background syncing of private conversations.

## Privacy note

Only deliberately shared/public conversation URLs are valid inputs for this flow. Publishing a summary into DashGPT creates a separate durable Result; removing the original shared link does not automatically remove the published Result.