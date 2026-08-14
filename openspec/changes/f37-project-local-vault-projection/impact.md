# Impact Manifest — F37 Project-local Vault Projection

## Directly changed surfaces

- saved Semantic Dash page action surface;
- new pure project-memory projection module;
- new deterministic ZIP archive builder/downloader;
- deterministic verification and browser regression coverage;
- package verification scripts/registers.

## Read-only dependencies

- `demo/vault.js`: Vault v1 validation/portable Card source;
- `demo/semantic-dashes.js`: latest revision and materialized accepted membership;
- active local Vault loaded by existing application controller;
- saved Dash route/UI.

## Explicit non-changes

- Vault schema/version;
- canonical Card/legacy Result schema or identity;
- Dash schema/update semantics;
- Google Drive OAuth scope, account identity, binding, bootstrap, remote layout or sync policy;
- GitHub storage adapter/provider exclusivity;
- search, Semantic Gallery, saved Dash membership ranking;
- Structured Continuation transport/payload;
- Worker/MCP contracts;
- raw conversation/session storage.

## Privacy blast radius

Generated `.dashgpt` files intentionally contain selected Dash member Card memory and may be committed to a repository by the developer. The implementation must therefore:

- require an explicit saved-Dash export action;
- never export the whole Vault by default;
- never serialize OAuth tokens, provider bindings, Google account identity, profile revisions or unrelated Cards;
- omit unsafe/non-HTTP(S) source URLs;
- explain that the extracted project snapshot should be reviewed before publication/commit.

## Storage/provider intersection

Google Drive/GitHub continue to synchronize the canonical Vault. `.dashgpt` is not registered as another provider and does not trigger remote synchronization. Cross-device identity relies only on existing `vaultId`, Dash IDs and Card IDs after ordinary Vault restore/adoption.

## Regression risk

Primary escaped-risk areas:

- accidental whole-Vault leakage instead of Dash members only;
- non-deterministic archive timestamps/order causing noisy project diffs;
- unsafe filename/path traversal from Card IDs;
- accidental serialization of browser/provider metadata;
- saved-Dash layout overflow on narrow screens;
- download action mutating Vault or Dash state.

Targeted deterministic/browser tests are required for each risk.
