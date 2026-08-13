# Design — ChatGPT export import

## Existing model

DashGPT keeps canonical cards in the existing local-first Vault. Live ChatGPT history import already turns conversations into canonical cards and records source provenance. Google Drive and GitHub synchronize the same Vault after cards are created.

## Input model

F29 accepts user-selected official ChatGPT export inputs:

- a ZIP archive containing exported ChatGPT data;
- `conversations.json`;
- numbered conversation JSON files used by larger exports.

Files are read only in the browser. Raw export bytes and raw conversation bodies are never posted to DashGPT infrastructure and the archive itself is not persisted.

## Parsing

A small export adapter normalizes supported export shapes into a common conversation record. Conversation message trees are flattened in chronological order by following the current-node lineage when available; if a compatible export lacks that metadata, stable message creation order is used.

The adapter extracts only fields needed for distillation/provenance: stable conversation id, title, timestamps, and user/assistant text content. Unsupported/non-text message parts are ignored unless they contain plain text.

## Card creation

The export path reuses the same canonical card construction semantics as live history import. Each imported conversation receives deterministic source provenance based on the ChatGPT conversation id. The same source key is used to detect cards previously created by live import or earlier export runs.

F29 does not invent a second card type or duplicate the whole transcript into the card. Cards contain the useful distilled result fields already used by DashGPT.

## Deduplication and repeatability

Import is idempotent by stable ChatGPT conversation identity. Existing cards with matching ChatGPT source identity are skipped or materially updated only through the existing canonical update semantics; they are never blindly duplicated. A second import of the same export must not increase the card count.

## Progress and failure isolation

The importer processes conversations incrementally and yields between batches so large exports do not freeze the page. UI state reports discovered, imported, duplicate/skipped, failed, and remaining counts. A malformed conversation is isolated and does not discard already imported cards.

## UX

The existing import operation card becomes the entry point for two human-facing choices:

- `Надёжно всю историю` — recommended official export import;
- `Быстро последние чаты` — existing live browser import.

For large histories the export route is visually recommended. The UI explains that parsing stays on the device and that remote sync happens only through the already-configured Vault provider.

## Compatibility

Existing live import remains available. Existing My Dash/search/gallery/storage/continuation consume the same cards and need no parallel result model.
