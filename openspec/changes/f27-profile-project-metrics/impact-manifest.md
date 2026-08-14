# Feature 27 — Impact Manifest

## Affected surfaces

- ChatGPT history source runner and batch import usage metadata.
- Existing canonical card `result.usage` envelope.
- Existing Vault v1 `profileRevisions`.
- Personal topbar profile UI and responsive styling.
- Regression verification.

## Compatibility constraints

Do not regress stable card IDs, re-import idempotency, My Dash, saved Dashes, search, Semantic Gallery, continuation, Vault portability, remote sync, Safari import, onboarding, or Product Board routing.

## Data boundary

Cards store numeric token usage plus provenance. Profile revisions store aggregate spent/donated amounts and currency. Raw conversation text is not copied into profile revisions and no financial credentials are stored.
