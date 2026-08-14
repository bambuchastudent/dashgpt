# Proposal: Import semantic enrichment

## Why

ChatGPT history import already writes canonical cards, but the legacy projection derives tags mostly from the conversation title and treats `ChatGPT` as semantic metadata. Those fields are already rendered and consumed by Search, Semantic Gallery and Semantic Dashes, so weak import metadata prevents imported history from forming the intended semantic heat map.

Issue #43 proposed fixing this only through a later reindex. The product decision for F28 moves semantic enrichment to capture/import time while retaining a safe in-place repair path for legacy imported cards.

Since the original F28 draft, `develop` gained both the F25 429 circuit breaker and the F29 official ChatGPT ZIP/JSON importer. F28 therefore applies one semantic projection contract to both live import and official-export import instead of allowing the recommended import path to keep source-oriented tags.

## What changes

- Derive bounded category/tags from visible conversation content already available to each import path.
- Use a deterministic local classifier; no external LLM, API key, semantic upload, or per-conversation model billing is required.
- Preserve `source.provider=chatgpt` and source identity purely as provenance.
- Store semantic projection version in bounded card projection metadata (`result.kind` + `result.semanticEnrichmentVersion`) so legacy imports can be distinguished without changing the source allowlist.
- Allow same-provider-timestamp repair of narrowly recognized legacy imports while preserving the deterministic canonical card ID.
- Make live-import freshness omit only legacy weakly-enriched cards for a semantic-aware runner.
- Make the official ZIP/JSON importer use the same semantic candidate/store path and same-timestamp repair rule.
- Require direct DashGPT AI capture to emit 2–5 compact meaning-oriented tags from the distilled outcome rather than relying on an unspecified summarize skill.
- Keep existing Search, Semantic Gallery, Semantic Dashes and card renderer on the same canonical cards; no parallel index/result entity is introduced.

## Preserved behavior

- stable ChatGPT conversation ID -> deterministic mutable card ID;
- F25 retry/circuit-breaker and truthful progress behavior;
- ACK only after durable Vault save;
- pause/resume and bounded progressive batches;
- source provenance and original-chat links;
- user-owned local-first storage;
- no duplicate card on re-import.

## Compatibility

- F25/#72 is already merged into `develop`; F28 composes semantic projection on top of its source runner and advances the semantic-aware source revision rather than replacing retry behavior.
- F29 official export import is already merged and is part of this capability.
- Draft PR #63 (profile/token metrics) also changes projection freshness/versioning; it must rebase after F28 and compose usage enrichment with semantic enrichment rather than suppress either.
- Existing Safari/bootstrap/import-card fixes keep their protocol/identity responsibilities unchanged.

## Scope boundaries

Not included: paid LLM enrichment, third-party semantic services, a new taxonomy/index object, merge-card UX, throughput tuning beyond preserved F25 behavior, profile/token UI, or claiming the DashGPT ChatGPT app is publicly listed before its external publication gates complete.

## Verification direction

Prove representative RU/EN/mixed conversations produce useful bounded tags; generic provider words do not dominate; live and ZIP/JSON import converge on the same semantic card shape; semantic hue/signature responds to category/tags; legacy cards upgrade at the same remote timestamp without duplication; repeated runs converge; F25 durability/retry behavior remains green; and the DashGPT skill contract requires meaning-oriented tags.
