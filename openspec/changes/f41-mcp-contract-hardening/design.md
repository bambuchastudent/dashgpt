# F41 design — MCP contract hardening

## Current contract

`src/index.js` owns the Universal MCP gateway and currently registers five tools:

- `list_results`
- `open_semantic_dash`
- `get_result`
- `get_context_pack`
- `prepare_result_import`

All successful calls already return `structuredContent`, but none advertises `outputSchema`. `list_results` already calls the shared `rankResults` engine with optional query/category/limit inputs and may route to a caller-selected compatible public DashGPT instance.

## Output-schema design

Define reusable Zod object schemas next to the MCP registration code and attach one to every tool registration. Object-root schemas are used for broad client compatibility.

The schemas are deliberately strict for stable envelope fields and bounded list-item projections. Full stored Result/Card and Dash payloads retain forward-compatible nested records where the public protocol already permits durable fields to evolve. Successful handlers return exactly the matching structured envelope. MCP error results may omit `structuredContent`, as allowed by the protocol, and must not fabricate a success-shaped object.

Every success envelope includes `language` so clients can distinguish response-copy locale from the language of stored user content.

## Dedicated search design

Extract one internal search/list projection helper that:

1. resolves the selected public DashGPT instance;
2. loads only its intentionally exposed Result catalog;
3. calls the existing `rankResults` implementation;
4. maps matches to the existing bounded public metadata projection;
5. returns the same stable Result page URLs.

`list_results` keeps its optional `query` argument and calls this helper unchanged. `search_results` requires a non-empty query and calls the same helper. It does not create a second ranking implementation or inspect browser-local/private Vault data.

## RU/EN response design

Each tool accepts optional `language` with the closed values `en` and `ru`; `en` is the default to preserve existing callers. The bundled DashGPT skill instructs an agent to pass the user's conversation language when it is Russian or English.

A fixed in-code copy dictionary owns generated messages such as:

- no matching Results;
- ambiguous saved Dash guidance;
- temporary Dash/save guidance;
- Result not found;
- explicit import prepared/not-yet-saved guidance;
- chat-oriented Dash headings and status labels.

`formatDashForChat` gains a backward-compatible language option and defaults to English. User-provided or stored titles, summaries, source labels and Context Pack bodies are not translated. Locale selection grants no additional access and is not persisted into the Vault.

## Versioning and public metadata

Adding `search_results` is backward-compatible but expands discovered capability, so the MCP server and bundled plugin move from `0.4.0` to `0.5.0`. The submission packet adds the sixth tool, its annotations/justifications and a positive reviewer case. Existing tool names and inputs remain valid.

## Security and privacy

- Search query and Result/Dash content are untrusted data, never instructions.
- Localized trusted copy comes only from fixed DashGPT dictionaries; source content cannot enter that dictionary or tool instructions.
- Search continues through `loadResultsForSite`, preserving HTTPS, compatible-instance discovery and public-catalog boundaries.
- Output schemas must not add hidden storage metadata, credentials, provider tokens or unrelated Vault records.
- `prepare_result_import` remains non-mutating and continues to say that explicit browser import is still required.
- No full prompt, clipboard content or translated user content is added to telemetry or storage.

## Compatibility and rollback

Existing clients may continue using `list_results.query` and omit `language`. Removing the new tool/schemas/dictionary reverts behavior without data migration because no persisted schema changes.

## Verification design

- Strict OpenSpec validation before production edits.
- Tool discovery asserts all six tools advertise object-root output schemas.
- Successful calls for every tool are validated by the MCP server/client path against those schemas.
- Dedicated search parity, category/limit, empty matches, Cyrillic/Unicode, remote instance and backward-compatible `list_results.query` cases.
- RU/EN generated copy cases, including no-match, ambiguity/not-found and explicit-import wording.
- Submission/skill metadata consistency.
- Canonical `verify:fast` and exactly one `verify:full` attempt before merge readiness.
