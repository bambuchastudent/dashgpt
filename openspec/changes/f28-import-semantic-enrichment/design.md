# Design: Import semantic enrichment

## Data path

ChatGPT conversation detail -> visible user/assistant messages -> `projectConversation()` -> validated BATCH candidate -> canonical mutable Vault card -> Search / Semantic Gallery / Semantic Dashes.

Today the projection uses title-only tags and the receiver hard-codes category `ChatGPT`. Rendering already shows tags and the semantic UI already reads category/title/tags, so F28 fixes the projection and legacy update rules rather than creating a parallel semantic entity.

## Deterministic local classifier

Add one pure serializable classifier to the source-runner core. It receives only the projected title and bounded visible message text already fetched by the import. It normalizes Unicode, ignores common/generic words, scores title terms more strongly than message terms, weighs user text more strongly than assistant prose, and recognizes a compact multilingual concept vocabulary aligned with current Semantic Dash concepts.

Output is bounded, for example:

```js
{ category: "Software", tags: ["software", "github", "openspec", "import"] }
```

Category is a broad semantic anchor when present; tags retain finer meaning. ChatGPT remains provenance under `source.provider`, not the semantic category. The classifier is self-contained because the generated runner executes on `chatgpt.com` without importing DashGPT modules there.

## Enrichment version and backfill

Extend allowed imported source metadata with numeric `enrichmentVersion`. F28 writes version `1`.

A legacy semantic import is narrowly recognized as a ChatGPT conversation card without the current enrichment version and still carrying the Feature 20 source-oriented category. This avoids replacing a card already materially recategorized by the user.

The F28 source runner increments its core source version. During HELLO, enrichment-aware freshness omits only recognized legacy semantic imports so they are reprojected. Both normal and fast BATCH paths allow a same-timestamp update only when the existing card needs semantic backfill and the incoming card has the current enrichment version. ID, source identity and provider timestamp remain unchanged.

## Heat-map behavior

No additional heat-map storage is added. Existing canonical inputs remain:

```text
category + title + tags -> semantic terms/signature/hue -> Semantic Gallery grouping and card hue
```

Tests prove unrelated imported topics no longer collapse merely because their provider is ChatGPT, while related topics remain visually coherent.

## Direct DashGPT AI capture

Tighten `plugins/dashgpt/skills/use-dashgpt/SKILL.md`: direct card capture must emit a small bounded set of meaning-oriented tags from the distilled outcome, prefer reusable concepts/topics, and avoid generic provider/client tags unless they are genuinely the subject. Bulk history import remains self-sufficient and does not depend on any unspecified summarize skill or extra model call.

## Open PR compatibility

PR #56 owns retry/circuit-breaker behavior. Keep the core `projectConversation(payload, summary)` declaration and current facts projection compatible with its wrapper hooks.

PR #63 owns usage metrics and currently adds its own source-version/freshness and same-timestamp backfill logic. After F28 rebase, freshness must require both applicable enrichments and same-timestamp update must compose rather than let usage or semantic metadata suppress the other. F28 does not absorb profile/token UI scope.

PR #54/#47 retain their bootstrap/Safari responsibilities; receiver protocol, deterministic card identity and durable ACK semantics stay unchanged.

## Privacy and failure

No external semantic request, API key or cloud index is added. Conversation bodies remain transient in the existing source runtime; only compact projected card fields cross the bridge. Low classification confidence falls back to bounded lexical tags plus a neutral content category instead of failing the import.

## Verification

Cover classifier RU/EN/mixed fixtures, sanitizer/backfill logic, normal/fast path parity, semantic hue/grouping response, source-version freshness, identity/idempotency and the DashGPT skill contract. Run the canonical repository verification before merge when CI/runtime infrastructure can execute it.
