# Feature 26 — Impact Manifest

## Affected surfaces

ChatGPT history source runner and import batch fast path; existing canonical Card `result.usage` metadata; Vault profile revisions; topbar profile UI; profile CSS; regression tests and verification scripts.

The Vault Result field allowlist does not change: usage reuses the existing portable `result` envelope. Existing Vault object layout also does not need behavior changes because profile revisions are already serialized under `profile/`; both portability paths require regression coverage.

## Compatibility constraints

Do not regress canonical Card IDs, re-import idempotency, My Dash, saved Dashes, search, Semantic Gallery, continuation, Vault export/import, remote sync, Safari import, onboarding, or Product Board routing.

## Data boundary

Cards store numeric token usage plus provenance only. Profile revisions store aggregate spent/donated amounts and currency only. Raw conversation text is not copied into profile revisions and no financial credentials are stored.
