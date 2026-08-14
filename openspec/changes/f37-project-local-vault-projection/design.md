## Context

DashGPT has one portable local-first Vault v1. The browser-local Vault is the immediate working copy. Google Drive and GitHub are optional remote adapters for that same Vault rather than independent Card databases.

A local software repository needs a small provider-neutral memory surface that IDEs and coding agents can read without browser storage access or a DashGPT plugin. The project folder must not receive the user's entire personal Vault by default and must not become authoritative over canonical Cards.

F19/PR #34 proved the value of a `.dashgpt` developer-memory shape, but intentionally deferred persistence and Vault/Google integration. F37 implements a narrower production bridge: one saved Dash becomes a generated local project-memory snapshot.

## Architectural invariant

```text
canonical Card
  lives in Vault v1
  -> may be selected by a saved Dash
  -> may be projected into .dashgpt/

browser-local Vault
  <-> optional Google Drive/GitHub remote adapter

.dashgpt/
  = derived project snapshot
  != second Vault
  != sync provider
  != write-back database
```

A generated file can be deleted and regenerated without losing canonical memory.

## Why one saved Dash defines a project

The Vault can contain personal memory across unrelated topics. Exporting every Card into a source repository would leak unrelated context and make project memory noisy.

Dash already represents a saved semantic selection over canonical Cards. F37 therefore uses an existing saved Dash as the project-memory boundary:

- materialize the latest non-deleted Dash revision;
- use existing event overrides and eligibility rules;
- include `view.members` only;
- exclude proposals, exclusions and unavailable references;
- never infer membership from repository name, tags or filesystem path.

This avoids a parallel `ProjectCardMembership` entity.

## Projection model

The pure projection function accepts:

- portable Vault v1;
- a saved Dash revision / materialized Dash view.

It returns a deterministic ordered list of UTF-8 files.

### Shape

```text
.dashgpt/
├── manifest.json
├── project.md
└── cards/
    ├── <stable-card-id>.md
    └── ...
```

No session, profile, provider-binding or token directories are generated.

### Stable filenames

Card filenames are derived only from canonical `result.id` using a filesystem-safe encoding. Titles never determine identity. Updating a title therefore does not orphan/create a second projected Card file.

The encoder must be deterministic and prevent traversal (`..`, slashes, backslashes and control characters cannot escape `.dashgpt/cards/`).

### `manifest.json`

The manifest is machine-readable and contains only safe projection metadata:

```json
{
  "schemaVersion": 1,
  "kind": "dashgpt-project-memory",
  "vaultId": "vault_...",
  "vaultUpdatedAt": "...",
  "dashId": "dash_...",
  "dashRevisionId": "dashrev_...",
  "dashTitle": "...",
  "dashUpdatedAt": "...",
  "cards": [
    {
      "id": "...",
      "path": ".dashgpt/cards/...md",
      "contentVersion": 1,
      "contentHash": "sha256:..."
    }
  ]
}
```

`contentVersion` / `contentHash` are copied when present; absence remains absence rather than inventing verification.

There is no `generatedAt` based on wall-clock time because unchanged inputs should produce byte-stable output. Source-state timestamps already present in Vault/Dash are allowed.

### `project.md`

Human/agent index containing:

- generated-memory notice;
- Dash title/description;
- source Vault and Dash IDs;
- source-state timestamp;
- number of Cards;
- stable links to every generated Card Markdown path;
- short summaries where useful;
- refresh rule: regenerate from DashGPT/Vault rather than editing as an authoritative database.

### Card Markdown

Each Card file includes the stable canonical ID and safe, useful portable content using headings rather than a client-specific schema requirement.

Order:

1. title;
2. compact metadata (`Card ID`, category, tags, source when safe);
3. summary;
4. goal;
5. current state;
6. decisions;
7. facts/context;
8. constraints;
9. user preferences when already explicitly stored on the Card;
10. unresolved questions;
11. next/suggested next step;
12. relevant safe links/materials;
13. source/original conversation URL when it is HTTP(S).

Empty sections are omitted. Complex stored values are rendered conservatively as readable JSON/fenced content when they cannot be represented as short strings/lists.

F37 does not read browser/provider secrets because those values are not Card fields and are not accepted as projection input.

## Archive transport

Browsers cannot portably write arbitrary repository directories. In particular, Safari/WebKit supports the origin-private File System Standard but does not expose the Chromium-style picker methods as a general direct project-folder contract. F37 therefore uses a deterministic ZIP download as the universal first transport.

The ZIP contains paths beginning with `.dashgpt/` and uses stored (uncompressed) entries for a small dependency-free deterministic implementation.

Determinism rules:

- sort entries lexicographically by path;
- UTF-8 filenames/content;
- fixed ZIP metadata timestamp rather than current wall clock;
- stable CRC32 implementation;
- no random archive comment/extra fields.

The downloaded archive name is derived from the Dash title with a stable safe fallback such as `dashgpt-project-memory.zip`; archive filename itself is not canonical identity.

## Saved-Dash UX

On `/demo/dashes/<dashId>/`, add a secondary `Download .dashgpt` action next to Refresh/Edit/Delete.

On click:

1. materialize the current saved Dash from the active local Vault;
2. build the project projection from accepted members;
3. build/download the ZIP entirely in the browser;
4. show a short success/failure product message without exposing raw provider/storage internals.

Downloading does not mutate Vault state or trigger Google/GitHub sync because the canonical memory did not change.

The action is available even when no remote provider is connected; local-first mode remains first-class.

## Google Drive composition

F25/F34 remain authoritative for account/Vault continuity:

```text
Device A local Vault V
 -> Google Drive DashGPT/dashgpt-vault.json (same V)
 -> Device B authorizes same account
 -> existing adoption/merge rules restore V
 -> F37 export of Dash D references same vaultId + Card IDs
```

F37:

- does not request an OAuth token;
- does not call Drive APIs;
- does not add Drive files/folders;
- does not store account email/display name/photo;
- does not alter `dashgpt.google-drive.binding.v1`;
- does not widen `drive.file`;
- does not change provider exclusivity.

A different `vaultId` simply generates a manifest with a different source identity. F37 never auto-merges unrelated Vaults.

## Privacy and repository policy

A repository may be shared more broadly than the user's Vault. Therefore the user must explicitly choose/download a saved Dash; there is no automatic whole-Vault repository export.

Generated `.dashgpt` can contain the selected Cards' actual summaries/facts/decisions. The UI/project index should remind the developer to review content before committing the folder to a shared/public repository.

F37 does not add a `.gitignore` automatically because project memory may intentionally be committed for team/agent portability. A future capability may add per-project share/local policies.

## Failure states

- missing/deleted Dash -> export unavailable; no archive generated;
- zero accepted members -> generate a valid empty project projection or disable export with a human explanation; product behavior should be deterministic and tested;
- unavailable referenced Card -> omitted as existing Dash materialization already does, with counts available in the Dash UI;
- invalid unsafe source URL -> omit from Markdown rather than serialize a dangerous scheme;
- archive creation/download exception -> show `Could not prepare .dashgpt package` and leave Vault untouched.

## Compatibility

No Vault schema, Card schema, immutable hash, Dash revision model, Google Drive adapter, GitHub adapter, search selection, Semantic Gallery layout, Structured Continuation payload, worker API or MCP tool changes.

F37 consumes existing `portableVault()` / Dash materialization behavior and adds an isolated projection/archive module plus one saved-Dash UI action.

## Verification

Deterministic Node verification covers:

- exactly one projected Markdown file per materialized member;
- excluded/proposal/unrelated Cards absent;
- stable safe filenames;
- deterministic manifest/project/card bytes;
- source Vault/Dash/Card identity preservation;
- no provider/account/credential fields;
- changed one-Card input changes only expected projection entries;
- ZIP central/local directory integrity and exact entry set.

Browser regression covers:

- saved Dash exposes `Download .dashgpt`;
- browser download contains `.dashgpt/manifest.json`, `project.md`, expected Cards only;
- local Vault is unchanged before/after download;
- Google-backed binding/identity is not serialized into archive content;
- no horizontal overflow at 360/390px.
