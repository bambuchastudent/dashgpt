# Proposal — Guided ChatGPT history import

Issue: #74

## Problem

F29 already imports the official ChatGPT export locally from ZIP/JSON into canonical DashGPT cards, but the user-facing path is still too easy to miss. Existing users can open Storage and see an ambiguous `Import / merge` control for DashGPT Vault data without any obvious explanation of how to migrate ChatGPT history.

That makes a working capability feel absent.

## Proposed change

Add a permanent, secondary `Import ChatGPT history` entry for the personal DashGPT site and a matching import section inside Storage. Both open one short guide that explains the official export flow and then lets the user select the ZIP/JSON file directly.

The guide SHALL reuse the existing F29 parser/importer and canonical ChatGPT source identity. It does not introduce another importer, card type, storage model, or server-side upload path.

Rename the Storage Vault controls so `Import / merge` becomes `Import DashGPT Vault` and the corresponding export control is equally explicit.

## User-visible result

An existing user with a populated Vault can find ChatGPT migration immediately, read three concrete steps on the site, choose the official ZIP, watch import progress, and then use the imported canonical cards normally.

## Scope boundaries

- Keep official ZIP/JSON import as the recommended bulk-history route.
- Keep the live browser importer as a secondary quick/recent route.
- Preserve local-only parsing of raw ChatGPT export data.
- Preserve existing F28 semantic enrichment and F29 deduplication/canonical identity.
- Preserve Google Drive/GitHub as optional synchronization of the resulting Vault, not archive-upload destinations.
- Do not configure or redesign Google Drive in this change.
- Do not change Vault schema, live-import scheduling, or card merge semantics.
