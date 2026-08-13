# Impact Manifest

## Canonical card / Vault

- Imported mutable card category/tags change from source-oriented defaults to content-oriented semantic metadata.
- `source.enrichmentVersion` is added to the bounded source allowlist for imported cards.
- Stable card ID, provider/source identity, original URL, provider timestamp, favorites and events remain preserved.

## ChatGPT import

- Source runner projection gains local deterministic enrichment and a source-version bump.
- HELLO freshness becomes enrichment-aware for the new runner.
- Standard and fast BATCH paths gain the same narrowly-scoped same-timestamp semantic-backfill rule.
- Pause/resume, batching, origin/session validation and ACK-after-save remain unchanged.

## Semantic surfaces

- Search, Semantic Gallery and Semantic Dashes continue to use the same canonical cards.
- Existing hue/signature functions receive better category/tag inputs; no separate semantic database or user-facing taxonomy is introduced.

## DashGPT skill/app

- Skill instructions tighten the direct-save tag quality contract.
- Public plugin/app publication status is unchanged; external F4 submission/approval gates remain separate.

## Open PR overlap

- #56: source-runner wrapper hooks/scheduling overlap; preserve projection hooks during rebase.
- #63: source-version, HELLO freshness, source projection and same-timestamp enrichment overlap; rebase must compose usage and semantic enrichment.
- #54/#47: import/bootstrap/Safari overlap but no intended behavioral scope change.

## Privacy / cost

- No new network/model dependency.
- No provider credentials or conversation bodies are persisted as semantic metadata.
- No per-conversation model billing is introduced.

## Regression risk

High enough to require targeted import tests because both receiver paths must make identical update decisions. Medium semantic risk because category/tag changes affect search/grouping/color by design. Low storage-migration risk because the new source field is optional and backwards compatible.
