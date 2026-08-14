# Proposal — F34 Account-scoped zero-config Vault

## Why

DashGPT already has a portable local Vault and a Google Drive adapter, but the current product surface treats Google Drive as an optional technical provider that the user must understand and manually connect. A normal user should not have to create, name, or reason about a Vault.

For anonymous use, the existing automatic local browser Vault is the correct behavior. After Google authorization, the same product should automatically discover or create that Google account's DashGPT Vault and use it as the user's remote continuation point across devices.

## What changes

- Reframe the primary Google action from `Connect Google Drive` to a human account action (`Continue with Google` / `Sign in with Google`).
- Preserve anonymous local-first startup with no account requirement.
- On successful Google authorization, immediately bootstrap the account-scoped remote Vault using the existing Google Drive adapter:
  - create a remote Vault from the local Vault when none exists;
  - adopt an existing remote Vault when the local Vault is effectively empty;
  - merge/sync when both sides already share a Vault identity;
  - require one explicit merge decision when two meaningful different Vaults exist.
- Keep the browser-local Vault as the immediate working copy and existing debounced synchronization as the normal write path after bootstrap.
- Keep access tokens session-memory-only and provider binding metadata non-secret.
- Keep Google and GitHub mutually exclusive under the existing provider-exclusivity rules.
- Make disconnect/sign-out non-destructive to both local and Drive data.

## User-visible result

A user can use DashGPT without registration. If they choose Google authorization, DashGPT automatically gives them their own user-owned synchronized Vault in that Google Drive. Authorizing the same Google account on another browser/device restores the same memory without a separate storage setup flow.

## Non-goals

- No DashGPT-hosted account database or card database.
- No mandatory sign-in.
- No Vault schema or canonical Card schema change.
- No broader Google Drive permission than the existing `drive.file` scope.
- No Google + GitHub simultaneous mirroring.
- No change to ChatGPT import semantics, Semantic Gallery, Dashes, continuation, or card merge semantics.
- No storage-provider identity embedded into canonical cards.

## Compatibility

This change builds on the existing Vault v1, Google Drive Vault sync, Safari-safe OAuth launch ordering, remote-provider exclusivity and local-first product model. Existing Google Drive bindings remain compatible and are presented as an already-linked account state rather than migrated to a new storage format.
