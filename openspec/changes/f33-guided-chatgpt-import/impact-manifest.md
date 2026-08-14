# Impact Manifest — F33 Guided ChatGPT history import

## Directly changed surfaces

- personal dashboard top actions / migration discoverability;
- Storage dialog import/export copy and ChatGPT migration entry;
- ChatGPT official export guidance and progress UI;
- bootstrap wiring for the new guided-import module;
- browser regression coverage and repository verification scripts.

## Reused but not redesigned

- F29 ZIP/JSON parser, normalizer, import batching, source identity, and canonical card upsert;
- F28 semantic enrichment of imported cards;
- F20/F23 operational/live import flow;
- local Vault v1 persistence;
- existing Google Drive/GitHub Vault synchronization;
- My Dash/Search/Semantic Gallery/Semantic Dashes/continuation consumers.

## Data / storage blast radius

No schema migration and no new persistent object type. Raw ChatGPT export bytes remain ephemeral browser File data. The resulting canonical cards and import progress continue to use existing Vault semantics.

## Security / privacy

No new server endpoint and no raw export upload. The only new external navigation is a normal user-clicked link to official OpenAI export instructions.

## Compatibility risks to verify

- topbar action wrapping on narrow mobile screens;
- Storage dialog layout with the additional import section;
- duplicate event/listener installation on reload/bootstrap;
- existing import card interception remains functional;
- provider sync controls are triggered only after local success and remain optional;
- explicit Vault import/export actions continue to call their current handlers after label changes.

## Explicitly unaffected

Google OAuth configuration, provider scope/exclusivity, Vault schema, ChatGPT live-import scheduler/backoff, card merge semantics, repository storage providers, and semantic classifier rules.
