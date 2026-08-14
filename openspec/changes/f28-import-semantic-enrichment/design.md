# Design: Import semantic enrichment

## Data paths

Live ChatGPT detail -> visible user/assistant messages -> generated source projection -> semantic-aware BATCH receiver -> canonical mutable Vault card.

Official ChatGPT ZIP/JSON -> export normalizer -> the same semantic candidate/store contract -> canonical mutable Vault card.

Both then feed the existing canonical surfaces: Search / Semantic Gallery / Semantic Dashes / card tags.

## Deterministic local classifier

Use one pure serializable classifier receiving only title plus bounded visible message text. Normalize Unicode, ignore generic/provider words, score title more strongly, weight user text above assistant prose, recognize a compact multilingual concept vocabulary, and retain useful canonical topic tokens such as `github`, `openspec`, `safari`, `salmon`, `travel`, or `spanish` when present.

Example output:

```js
{ category: "Software", tags: ["software", "github", "openspec", "import"] }
```

Category is a broad semantic anchor; tags retain finer meaning. `ChatGPT` stays under source provenance, not semantic category/tags.

The classifier is self-contained/serializable because the generated live runner executes on `chatgpt.com`. The export importer can call the same module directly.

## Projection version and backfill

Semantic projection metadata is stored under the card's bounded `result` projection metadata:

```js
{ kind: "chatgpt-conversation-projection", semanticEnrichmentVersion: 1 }
```

No source allowlist/schema expansion is required. A legacy import is narrowly recognized as a ChatGPT conversation card without the current projection version that still carries the old provider-oriented category/tag shape. This intentionally avoids overwriting cards already materially recategorized by the user.

The merged F25 runner is source revision 4. F28 composes on top of it and advances the live semantic-aware source revision to 5, preserving every F25 retry/circuit-breaker hook. HELLO freshness omits only recognized legacy semantic imports. Same-timestamp replacement is allowed only when the existing card needs this semantic backfill and the incoming candidate carries the current semantic projection version.

The official export importer uses the same semantic store update rule so live and export paths converge on one canonical card shape.

## Heat-map behavior

No extra heat-map storage is added:

```text
category + title + tags -> semantic signature/hue -> Semantic Gallery grouping and card color
```

Better import fields automatically improve existing color/grouping/filter inputs.

## Direct DashGPT AI capture

`plugins/dashgpt/skills/use-dashgpt/SKILL.md` requires 2–5 compact meaning-oriented tags from the distilled outcome. Generic provider/process tags such as `chatgpt`, `conversation`, or `result` are excluded unless genuinely the topic. The skill must not depend on another unspecified `summarize` skill to satisfy the tag contract.

## Privacy and failure

No external semantic request, API key, or cloud index is added. Conversation bodies remain transient in the existing import runtime. Low-confidence classification falls back to bounded lexical tags plus `Other`; it does not fail import or revert to provider-oriented semantics.

## Compatibility

- Preserve F25 429 retry scheduling, durable ACK counting, and truthful source progress.
- Include F29 ZIP/JSON import in the semantic projection contract.
- Draft F27/#63 must later compose its usage projection/freshness with F28 after rebasing.
- Bootstrap/Safari/import-card behavior remains unchanged except installing the semantic receiver ahead of the legacy fast receiver for semantic-aware batches.

## Verification

Cover RU/EN/mixed fixtures, useful tag retention, generic-word filtering, source revision 5, generated action size, semantic hue/signature response, live/export parity, same-timestamp backfill, identity/idempotency, F25 regression verification, direct-skill tag contract, strict OpenSpec validation, canonical repository verification, and production-shaped preview.
