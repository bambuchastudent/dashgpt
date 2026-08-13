# Feature 26 — Impact Manifest

## Affected surfaces

ChatGPT history source runner and importer; optional Result usage metadata; Vault profile revisions; topbar profile UI; profile CSS; regression tests and verification scripts.

Existing Vault object layout should not need behavior changes because profile revisions are already serialized under `profile/`; this behavior requires regression coverage.

## Compatibility constraints

Do not regress canonical Card IDs, re-import idempotency, My Dash, saved Dashes, search, Semantic Gallery, continuation, Vault export/import, remote sync, Safari import, onboarding, or Product Board routing.

## Data boundary

Profile metrics store aggregate numeric values and usage provenance only. Raw conversation text is not copied into profile revisions.
