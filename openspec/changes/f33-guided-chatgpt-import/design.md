# Design — Guided ChatGPT history import

## Existing behavior to preserve

F29 already owns the official export parser and canonical import semantics:

```text
ChatGPT ZIP / JSON
  -> local browser parser
  -> existing canonical ChatGPT card upsert
  -> local Vault
  -> existing My Dash / Search / Gallery / Dashes / continuation
  -> optional existing Vault sync
```

F33 changes discoverability and guidance, not this data path.

## Product placement

Bulk history migration is a bootstrap/migration capability, not the primary everyday capture flow. Therefore F33 adds a visible secondary import entry without making archive import the dominant dashboard action.

Two permanent entry points use the same guide:

1. a secondary `Import ChatGPT` / `Импорт ChatGPT` action in the personal dashboard top actions;
2. an `Import ChatGPT history` section inside the existing Storage dialog, where users already look for import/sync.

The existing operational import card and first-run onboarding remain compatible but are no longer the only discoverability mechanisms.

## Guide UX

Opening either permanent entry shows one guide dialog with the official export path:

1. `ChatGPT → Settings → Data Controls → Export data` and confirm the export;
2. when OpenAI says the export is ready, download the ZIP;
3. return to DashGPT and select the ZIP.

The guide also states that `conversations.json` and numbered conversation JSON files are accepted for already-unpacked exports.

The primary action is `Choose ChatGPT ZIP / JSON`. A secondary official-help link opens OpenAI's export documentation. A tertiary `Quick recent chats` action may delegate to the existing live importer.

The guide must say that selected archive bytes and raw conversation bodies are parsed on this device and are not uploaded to DashGPT infrastructure.

## Implementation structure

Add a focused UI orchestration module:

`demo/chatgpt-import-guide.js`

Responsibilities:

- install the permanent topbar action;
- install the Storage ChatGPT-import section;
- disambiguate the existing Vault export/import button labels;
- create/reuse one guide dialog and one file input;
- call the exported F29 `importChatGptExportFiles()` implementation;
- render reading/importing/completion/error progress from F29 callbacks;
- trigger the already-visible active remote Vault sync control after a successful local import when one exists;
- reload/view the canonical cards after completion.

The module SHALL NOT parse ChatGPT export formats itself and SHALL NOT create canonical cards directly.

`catalog-bootstrap.js` initializes the guide only on the same personal root where ChatGPT history import is supported.

## Import identity and semantic enrichment

F33 calls the same F29 import function, which in current develop composes with F28 semantic enrichment. Stable ChatGPT `sourceId` remains the idempotency key. Repeating the same file through the new guide therefore converges on the same canonical cards.

## Vault control disambiguation

The existing Storage control `Import / merge` means importing a DashGPT Vault bundle, not ChatGPT history. F33 changes only the visible label to `Import DashGPT Vault` and the corresponding export label to `Export DashGPT Vault`.

No Vault import/export implementation changes.

## Local-first privacy

The browser File objects are passed only to the existing local parser. No new fetch/XHR route is introduced for archive contents. The only external navigation in the guide is an ordinary user-clicked help link.

Optional Google Drive/GitHub sync happens only after canonical cards are already written to the local Vault and continues to sync the Vault object model rather than the source archive.

## Responsive behavior

At 360px:

- the topbar action may wrap with existing topbar controls but must not create horizontal overflow;
- guide actions stack vertically;
- numbered steps and progress text wrap normally;
- the Storage import section stays within the existing dialog width.

## Failure states

- unsupported/invalid archive: keep current Vault and show the existing F29 human-readable parser error in the guide;
- partial malformed export: preserve successful cards and show failed count from F29;
- remote provider unavailable after local success: local completion remains successful; remote synchronization can be retried through existing provider UI;
- user closes the file chooser: no state change.

## Compatibility / non-goals

F33 does not modify:

- ChatGPT live-import source runner or 429 policy;
- F28 semantic classification rules;
- F29 parser/normalizer/ZIP implementation;
- Vault schema or canonical card identity;
- Google OAuth configuration;
- provider exclusivity;
- card merge semantics.
