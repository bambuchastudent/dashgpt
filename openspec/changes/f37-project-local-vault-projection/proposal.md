## Why

DashGPT already keeps canonical Cards in a local-first Vault and can optionally carry that same Vault between devices through Google Drive or GitHub. Developer work still has a missing bridge: the same project memory that is understandable on the DashGPT site is not available as ordinary local project files to an IDE or coding agent.

The earlier F19/PR #34 prototype explored a provider-neutral developer-memory visualization, but it explicitly deferred Vault integration and project-local persistence. F37 turns that direction into one coherent product capability rather than inventing a second developer-memory product.

The core requirement is: **one saved Dash is the project memory on the site, and `.dashgpt/` is the local filesystem representation of that same Dash for IDEs and AI agents.**

## What Changes

- Treat one existing saved Dash as the project-memory boundary over canonical Vault Cards.
- Add a **Project view** inside the normal saved-Dash site experience, derived from the same Card IDs/membership rather than a separate Product Board or developer database.
- The Project view SHALL visually summarize the current project: Cards, concise state, next steps and relationships, while retaining normal Card navigation.
- Add a deterministic `.dashgpt/` projection of that exact same saved Dash for local repositories.
- Keep canonical Cards in the existing Vault as authoritative memory; both the site Project view and `.dashgpt/` are projections of the same source state.
- Generate an IDE/agent-readable `.dashgpt/` tree containing a tiny README, machine manifest, visual/human `project.md` and one Markdown file per current accepted Card.
- Keep Card IDs, Dash ID/revision and `vaultId` stable between site and filesystem representations.
- Reuse existing Google Drive/GitHub Vault synchronization for cross-device continuity; do not create another Google storage mechanism for `.dashgpt`.
- Provide a browser-compatible way to materialize the local `.dashgpt/` snapshot; archive download is a fallback transport, not a new user-facing memory model.
- Add deterministic/browser regression coverage proving that the site Project view and filesystem projection are derived from the same current Dash members.

## Capabilities

### New Capabilities

- `project-local-vault-projection`: one saved Dash rendered as a developer-readable Project view on the site and as a portable `.dashgpt/` filesystem representation.

### Modified Capabilities

None. Vault v1, Google Drive sync, saved Dash membership semantics, provider exclusivity, Card identity, search and continuation contracts remain unchanged.

## Scope Boundaries

This change does not create a parallel Product Board, Project entity or second Card store. It does not implement `.dashgpt` write-back, filesystem watching, automatic coding-agent capture, an IDE extension, MCP write tools, raw session export, arbitrary whole-Vault repository export, a new Google Drive object, broader Google scopes, or direct synchronization between `.dashgpt/` folders.

The site remains the normal visual management surface. `.dashgpt/` exists so local tools can understand the same saved Dash without access to browser storage.

## Impact and Intersections

- **Cards:** canonical Cards/legacy Results remain authoritative and are reused everywhere.
- **Dashes/site UX:** an opened saved Dash gains a Project view over its current members; normal Gallery/Card views continue to use the same IDs.
- **Vault:** source `vaultId` and Vault timestamps identify the underlying memory; Vault schema is unchanged.
- **Google Drive:** existing F25/F34 account/Vault flow remains the cross-device path. Restoring the same Vault restores the same Dash/Card IDs that regenerate both site Project view and `.dashgpt`.
- **GitHub storage:** provider exclusivity and Vault adapter behavior are unchanged; generated project files are independent of the remote Vault provider.
- **Privacy:** only selected Dash member Card content enters the project representation. Profile revisions, credentials, provider bindings and unrelated Vault state stay out.
- **Structured Continuation:** Project view/Markdown expose compatible state but do not change current continuation payloads.
- **F19 / PR #34:** its useful Project State visualization direction is folded into the saved-Dash Project view; F37 owns the production Vault-backed behavior rather than exposing F19 as a separate general-user surface.
