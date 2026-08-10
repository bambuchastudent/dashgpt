## Why

Useful DashGPT Results already preserve outcomes from individual conversations, but related Results remain scattered across chats and storage locations. Users need a durable topic-level memory surface that can be reopened by meaning, refreshed as new accessible Results appear, and corrected without copying or mutating the underlying Results.

## What Changes

- Introduce a saved `Dash` definition and revision model whose membership consists only of Result references.
- Build temporary semantic dashes from a natural-language topic across all Results currently accessible in the selected scope, and require an explicit save action before they become durable.
- Reopen a saved dash from an inexact natural-language query, opening one confident match directly and returning a short choice for materially ambiguous matches.
- Add Review-mode refresh: existing dynamic members are recalculated, new high-confidence Results become proposals, and rejected/excluded Results stay out.
- Separate semantic membership from append-only user overrides for pin, exclude, manual add, suggestion decisions, and dash deletion.
- Materialize a privacy-safe aggregate summary only from Results that remain accessible at read/update time; inaccessible references become content-free placeholders.
- Show saved dashes on the dashboard and add dash detail actions for Result/source opening, continuation, refresh, override management, rename/description editing, and deletion without deleting Results.
- Add provider-neutral instance/MCP read and explicit-import surfaces so an assistant can load an accessible dash into the current chat or prepare a temporary dash for explicit saving.
- Keep `Review` as the only enabled update mode in this PR while versioning the model so `Automatic` can be added later without changing Result identity or override semantics.
- Add deterministic tests for semantic matching, ambiguity, refresh proposals, overrides, multi-dash membership, Vault portability, privacy filtering, dashboard behavior, and chat/MCP output.

## Capabilities

### New Capabilities

- `semantic-dashes`: Creation, persistence, semantic reopening, Review-mode refresh, privacy-safe materialization, dashboard presentation, and chat loading of living topic views over accessible Results.

### Modified Capabilities

None. The repository has no promoted baseline capability specs under `openspec/specs/`; this change integrates with the existing Result, dashboard, search, MCP, and Vault implementations without retroactively rewriting their legacy change documents.

## Impact

- **Domain/Vault:** additive Dash revisions and Dash-targeted append-only events in Vault v1; existing Vaults without Dash data remain valid.
- **Search:** one deterministic local semantic scorer replaces duplicated substring-only matching in dashboard and MCP Result retrieval.
- **Dashboard:** new Dash collection/detail views and explicit temporary-to-saved flow, while existing Result cards and continuation-first actions remain compatible.
- **Instance/MCP:** additive Dash discovery/read/import behavior; only data exposed by the selected compatible instance is available to the public MCP surface.
- **Privacy:** eligibility filtering occurs before scoring, membership resolution, and summary generation; private browser/GitHub Vault contents are not made public to solve chat access.
- **Storage providers:** provider-neutral Vault object serialization is extended; no new provider synchronization adapter is introduced.
- **Compatibility:** immutable Result schemas and `contentHash` inputs do not change, and deleting a Dash never deletes a Result.
