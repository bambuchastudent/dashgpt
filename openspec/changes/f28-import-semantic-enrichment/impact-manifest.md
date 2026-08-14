# Impact Manifest

## Canonical card / Vault

- Imported ChatGPT cards move from provider-oriented category/tags to content-oriented semantic metadata.
- Semantic projection version is stored under bounded `result` metadata; source provenance schema is unchanged.
- Stable card ID, provider/source identity, original URL, provider timestamp, favorites and events remain preserved.

## ChatGPT live import

- F28 composes on the merged F25 runner/circuit breaker and advances the semantic-aware source revision to 5.
- HELLO freshness becomes semantic-projection aware for revision 5.
- A dedicated semantic receiver owns revision-5 BATCH messages, persists them once, and prevents duplicate legacy fast-path handling.
- Pause/resume, batching, session/origin validation and ACK-after-save remain unchanged.

## Official ZIP/JSON import

- The F29 export normalizer derives the same semantic category/tags from selected visible messages.
- Export batches use the same semantic store/backfill rule as live import.
- Existing file parsing, progress UI, local-first storage and remote-sync handoff remain unchanged.

## Semantic surfaces

- Search, Semantic Gallery and Semantic Dashes continue to use the same canonical cards.
- Existing hue/signature functions receive better category/tag inputs; no separate semantic database or taxonomy is introduced.

## DashGPT skill/app

- Direct-save instructions require 2–5 compact meaning-oriented tags and explicitly avoid dependence on an unspecified summarize skill.
- Public plugin/app publication status is unchanged.

## Open PR overlap

- #72/F25 is merged and treated as the runner baseline.
- F29 export import is merged and included in F28 scope.
- #63 remains draft and must rebase after F28 so usage and semantic enrichment compose.

## Privacy / cost

- No new network/model dependency.
- No provider credentials or raw conversation bodies are persisted as semantic metadata.
- No per-conversation model billing is introduced.

## Regression risk

Medium-high around import receiver ownership and source-runner composition, requiring targeted F25/F28 verification. Medium semantic risk because category/tag changes intentionally affect search/grouping/color. Low storage-migration risk because projection metadata is optional and backwards compatible.
