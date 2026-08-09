# Proposal — Shared Chat → Published Result MVP

## Why

The next useful proof is ingestion of a real AI conversation instead of manually hard-coded demo content.

For the smallest viable workflow, the user gives the DashGPT agent a public ChatGPT shared-link URL. The agent reads the shared snapshot, creates a curated Result, preserves the source URL as provenance, publishes the Result into the portable DashGPT data store, and the hosted dashboard picks it up on deployment.

This deliberately keeps summarization outside the DashGPT runtime for now. It proves the product workflow without requiring an OpenAI API key, a paid LLM API, or a final persistence backend.

## User flow

1. User creates a ChatGPT shared link and sends it to the DashGPT agent.
2. Agent validates that the URL is a ChatGPT shared-link URL and can be read.
3. Agent summarizes the useful outcome as a DashGPT Result.
4. Result is appended to the published portable JSON store with source provenance.
5. Git/Cloudflare deployment publishes the updated dashboard.
6. User opens the Result and can return to the original shared chat or generate a Context Pack.

## Later evolution

The manual agent-assisted publication step may later be replaced by MCP/app ingestion, a server endpoint, or another provider adapter. The Result schema and portable published data must survive that replacement.
