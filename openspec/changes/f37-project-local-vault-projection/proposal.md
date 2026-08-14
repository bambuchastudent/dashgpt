## Why

DashGPT already keeps canonical Cards in a local-first Vault and can optionally carry that same Vault between devices through Google Drive or GitHub. Developer work still has a missing bridge: a repository opened in an IDE cannot see the relevant DashGPT memory as ordinary local project files.

The earlier F19/PR #34 prototype explored a provider-neutral developer-memory visualization, but it explicitly deferred filesystem persistence, Vault integration and synchronization. Implementing those concerns inside F19 now would silently widen a prototype that was designed to remain isolated.

The production capability therefore needs a separate contract: derive a project-local `.dashgpt/` folder from the same canonical Vault, scoped to one saved Dash, without turning the project folder into a second source of truth or exposing the user's unrelated personal memory.

## What Changes

- Add a deterministic project-memory projection from one saved Dash in Vault v1.
- Keep canonical Cards in the existing Vault as the authoritative memory; `.dashgpt/` is generated read-only output.
- Preserve existing Dash membership semantics: accepted/current members are exported; proposals, excluded/unavailable references and unrelated Vault cards are not.
- Generate an IDE-readable `.dashgpt/` tree containing a manifest, compact project index and one Markdown file per exported canonical Card.
- Add a saved-Dash action that downloads a deterministic archive containing the `.dashgpt/` tree so Safari and Chromium users do not depend on direct arbitrary host-filesystem write APIs.
- Reuse the existing source `vaultId`, Dash ID/revision and canonical Card IDs in the projection so identity survives ordinary Google-backed second-device restore.
- Keep Google Drive as an optional remote copy of `dashgpt-vault.json`; do not create a second Google sync artifact or widen OAuth scope.
- Add deterministic and browser regression coverage for membership, identity, privacy, archive contents and narrow/mobile UX.

## Capabilities

### New Capabilities

- `project-local-vault-projection`: saved-Dash-to-`.dashgpt` export over canonical Vault Cards.

### Modified Capabilities

None. Vault v1, Google Drive sync, saved Dash semantics, provider exclusivity, Card identity and continuation contracts remain unchanged.

## Scope Boundaries

This change does not implement `.dashgpt` write-back, filesystem watching, a coding-agent capture adapter, an IDE extension, MCP write tools, raw session export, arbitrary whole-Vault export into repositories, a new Google Drive object, broader Google scopes, or direct synchronization between `.dashgpt/` folders.

The archive is transport only. Extracted project files are a derived snapshot and can always be regenerated from the source Vault/Dash.

## Impact and Intersections

- **Cards:** canonical Cards/legacy Results remain authoritative. Export uses sanitized portable fields only.
- **Dashes:** a saved Dash defines project membership. No project-membership entity is added.
- **Vault:** source `vaultId` and Vault timestamps are referenced in the projection; Vault schema is unchanged.
- **Google Drive:** existing F25/F34 account/Vault flow remains the cross-device path. The projection never stores OAuth/account identity.
- **GitHub storage:** provider exclusivity and Vault adapter behavior are unchanged; a repository may separately commit generated `.dashgpt` files if the user chooses.
- **Privacy:** only selected Dash member Card content is exported. Profile revisions, credentials, provider bindings and unrelated Vault state are excluded.
- **Structured Continuation:** the generated Markdown exposes compatible project context but does not alter current continuation payloads.
- **F19 / PR #34:** retained as a visualization prototype; F37 owns production projection/download behavior.
