# ADR 0004 — GitHub App adapter for private Vault synchronization

Status: accepted

## Context

Feature 6 introduces replaceable remote storage adapters for the user-owned DashGPT Vault. GitHub is the first remote adapter.

A traditional OAuth App would require broad classic repository scopes for private repository content writes. Asking users to paste personal access tokens into DashGPT or ChatGPT would violate the product's privacy boundary and make credential leakage into chat, URLs or portable Vault content much easier.

GitHub Apps provide repository-scoped installation permissions and short-lived installation access tokens. A user can install a public GitHub App on only selected repositories, while the app requests only the repository permissions required for synchronization.

GitHub's Git Data API can create blobs, a tree and one commit, then atomically advance the selected branch reference. This is preferable to creating one repository commit per Vault object.

## Decision

DashGPT GitHub synchronization uses a **public GitHub App** with repository **Contents: read/write** permission.

The adapter MUST NOT ask users to paste a GitHub PAT, OAuth token or installation token into ChatGPT or the DashGPT browser UI.

The standard flow is:

1. The user pastes a GitHub repository or folder URL into DashGPT Storage.
2. DashGPT resolves it to a provider-neutral `StorageLocator`.
3. The Worker stores that pending locator in a short-lived HMAC-signed HttpOnly cookie.
4. The user installs the DashGPT GitHub App and selects the repository in GitHub's own installation UI.
5. GitHub redirects to the configured DashGPT setup URL with an installation id.
6. DashGPT verifies that the installation can access the pending target repository.
7. DashGPT stores only the installation id plus non-secret locator metadata in a signed HttpOnly session cookie.
8. Each sync creates a short-lived installation token server-side, constrained to the selected repository and `Contents: write`.
9. The browser sends/receives portable Vault data through the DashGPT Worker; the GitHub token is never returned to browser JavaScript.

## Repository representation

The GitHub adapter maps Vault v1 to ordinary files under a selected root (default `.dashgpt/`):

```text
.dashgpt/
  dashgpt-vault.json
  results/<result-id>/<revision>.json
  events/<yyyy-mm>/<event-id>.json
  profile/<profile-revision-id>.json
```

The representation is provider-neutral and can be reconstructed without a proprietary DashGPT database.

## Synchronization commit

A synchronization MUST merge remote and local Vault object sets first.

If the remote folder contains a different `vaultId`, synchronization stops with a visible conflict instead of silently replacing either Vault.

When changes exist, the adapter:

1. creates blobs for changed Vault objects;
2. creates one Git tree based on the current branch tree;
3. creates one commit whose parent is the branch head observed during the sync;
4. advances the branch reference without force.

If the branch changes concurrently, the update is treated as a synchronization race and the caller retries against the newer remote state. Force-push is not used.

An idempotent sync that produces no changed Vault objects MUST NOT create another Git commit.

## Credential boundary

GitHub App private keys and DashGPT session-signing secrets are deployment secrets. They MUST NOT be committed to the repository, included in Vault exports, stored in localStorage, embedded in URLs, or exposed in MCP Context Packs.

Installation access tokens are short-lived server-side credentials and MUST NOT be returned to the browser.

The browser-side session cookie is HttpOnly, Secure and SameSite=Lax and contains only signed non-secret pairing metadata.

## Consequences

### Positive

- Users grant access to selected repositories rather than a broad account-level classic OAuth scope.
- No long-lived GitHub credential enters chat or browser storage.
- Vault data remains ordinary files that the user can inspect, clone and move.
- One sync normally creates one understandable Git commit.
- Git's branch fast-forward rules become an additional concurrency guard.

### Costs

- DashGPT needs one public GitHub App registration and a securely stored app private key.
- GitHub sync depends on the shared DashGPT Worker for token minting/proxying; fully local Git authentication can be a separate adapter later.
- A real integration smoke test requires installing the GitHub App on a test repository.

## Rejected alternatives

### Paste a PAT into DashGPT

Rejected. It creates an unnecessary secret-handling surface in chat/browser UX and is incompatible with the zero-secret portable Vault boundary.

### Traditional OAuth App with classic `repo` scope

Rejected for the standard path because it is broader than the selected-repository GitHub App model.

### One Contents API commit per Vault object

Rejected as the normal sync path because a single logical synchronization could create many noisy commits and expose partial progress if interrupted.