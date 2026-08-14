# F41 — MCP contract hardening

## Why

DashGPT's public MCP currently returns useful `structuredContent`, but its five tools do not advertise `outputSchema`. Clients therefore have to infer result shapes and cannot validate successful tool output against the discovered tool contract.

Individual Result discovery is also hidden inside the optional `query` argument of `list_results`. That remains compatible, but a dedicated `search_results` tool gives receiving agents a clearer routing decision between browsing the catalog and searching for prior knowledge.

Finally, fixed MCP service messages are currently English-only even when the user works in Russian. This makes empty states, ambiguity, import guidance and failures inconsistent with the user's conversation language.

## What changes

- Add explicit MCP `outputSchema` declarations to every existing tool and the new `search_results` tool.
- Add a dedicated `search_results` tool with required query input that reuses the existing published-Result ranking, filtering and remote-instance path.
- Keep `list_results.query` working for backward compatibility.
- Add an explicit `language: en | ru` input to every MCP tool; English remains the compatibility default.
- Localize only fixed DashGPT-generated response copy and structured response locale metadata.
- Keep stored Result/Card/Dash titles, summaries, sources and Context Packs byte-for-byte in their stored language unless an existing formatter already derives display-only labels.
- Update the bundled skill, public submission packet and contract tests for the six-tool surface.
- Bump the MCP/plugin minor version because tool discovery gains a new compatible capability.

## What does not change

- No authenticated private-Vault access.
- No direct or silent Result/Card write.
- No automatic translation of saved content.
- No new search index, embedding service or model call.
- No change to semantic ranking thresholds or eligible published data.
- No UI, Card/Vault schema, Semantic Gallery, import-runner or provider-sync redesign.

## Success

An MCP client discovers six tools with object-root output schemas; every successful structured response conforms to its advertised schema; `search_results` returns the same ranked public matches as the existing query path; Russian and English service copy is deterministic; public/private and explicit-import boundaries remain unchanged.

Issue: #104
Target: `develop`
