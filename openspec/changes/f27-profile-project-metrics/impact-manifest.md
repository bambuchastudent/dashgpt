# Feature 27 — Impact Manifest

## Affected surfaces

- Current F25/F26 ChatGPT history source/freshness pipeline and batch import usage enrichment.
- Existing canonical card `result.usage` envelope.
- Existing Vault v1 `profileRevisions`.
- Current general-user topbar/profile UI and responsive styling.
- Deterministic and browser regression verification.

## Compatibility constraints

Do not regress stable card IDs, same-source re-import idempotency, F25 provider-pressure backoff, F26 retry wakeup, semantic enrichment/tagging, link-first capture, export/guided import, My Dash, Color-first F32 Gallery ordering, saved Dashes, search, continuation, Vault portability, Google/GitHub sync, Safari import focus, onboarding, or the Product Board internal-only boundary.

F27 SHALL adapt to the current import implementation. It SHALL NOT restore an older `chatgpt-history-source-runner`, bootstrap snapshot, or pre-F26 freshness policy from the original conflict-blocked branch.

## Data boundary

Cards store numeric token usage plus provenance. Profile revisions store explicit spent/donated amounts and currency. Raw conversation text is not copied into profile revisions and no financial credentials, provider billing data, inferred prices, or FX state are stored.
