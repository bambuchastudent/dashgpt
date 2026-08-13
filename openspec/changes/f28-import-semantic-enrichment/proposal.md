# Proposal: Import semantic enrichment

## Why

ChatGPT history import already writes canonical cards, but the current projection only derives tags from the conversation title and the receiver forces `category: ChatGPT`. The fields exist and the card renderer already displays them, yet they describe the source more than the conversation meaning. Semantic Gallery, Search and Semantic Dashes therefore receive weak inputs and imported history does not form the intended semantic heat map.

Issue #43 previously proposed fixing this only through a later DashGPT reindex. The 2026-08-13 product decision supersedes that boundary: semantic tags must be produced during import, while legacy cards still need a safe in-place enrichment path.

## What changes

- ChatGPT source projection derives bounded semantic metadata from visible conversation content already fetched for import, not title alone.
- The baseline classifier is deterministic and local to the browser source runner. It does not call an external LLM, require an API key, or upload the Vault.
- `source.provider=chatgpt` remains provenance; content category and tags become meaning-oriented inputs.
- Imported cards record an enrichment version in bounded source metadata so legacy imports can be distinguished from enriched cards.
- The receiver treats same-source-timestamp enrichment of a legacy imported card as a valid material update while preserving the deterministic canonical ID.
- Freshness handshakes omit legacy weakly-enriched cards for an enrichment-aware source runner so a resumable run can repair them without replaying already-enriched cards.
- Direct DashGPT AI capture instructions require bounded meaning-oriented tags rather than relying on an unspecified summarize skill.
- Existing Semantic Gallery/Search/Semantic Dash behavior continues to consume the same canonical cards; no parallel index/result entity is introduced.

## Model choice

The required baseline is local deterministic enrichment. A future optional LLM enrichment layer may improve labels only if separately specified with consent, privacy, cost/rate-limit and fallback behavior. F28 does not add a model/network dependency.

## Preserved behavior

- stable ChatGPT `conversationId` -> deterministic mutable card ID;
- ACK only after durable Vault save;
- pause/resume and progressive bounded batches;
- source provenance and original-chat links;
- user-owned local-first storage;
- canonical card rendering, Search, Semantic Gallery and Dashes;
- no duplicate card per re-import.

## Open PR compatibility

F28 starts from `develop` and deliberately does not absorb unrelated feature scope.

- PR #56 changes source-runner retry/circuit-breaker wrapper behavior. F28 keeps the `projectConversation` shape/hooks compatible and moves enrichment into the core projection contract.
- PR #63 changes source versioning, HELLO freshness and same-timestamp usage backfill. Its later rebase must combine usage freshness with F28 semantic freshness instead of letting either enrichment suppress the other.
- PR #54 and #47 affect import-card/bootstrap/Safari flows and must keep the same receiver protocol and durable card identity.

## Scope boundaries

Not included:

- paid/per-conversation LLM calls during bulk import;
- silently sending history to a third-party semantic service;
- a new user-facing taxonomy/index object;
- card merge UX changes;
- unrelated import throughput tuning;
- claiming the DashGPT ChatGPT app is publicly listed before the external `f4-plugin-directory-submission` gates are complete.

## Verification direction

Prove representative RU, EN and mixed-language conversations produce meaning-oriented tags; generic/source words do not dominate; semantic hue/grouping reacts to enrichment; legacy cards upgrade at the same remote timestamp without ID duplication; repeated runs converge; import durability/resume semantics stay intact; and the DashGPT skill/submission checks require relevant bounded tags for direct capture.
