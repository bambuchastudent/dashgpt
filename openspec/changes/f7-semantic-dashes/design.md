## Context

See `proposal.md` for motivation and `specs/semantic-dashes/spec.md` for the observable contract.

The current dashboard merges immutable published Results with a browser-local Vault, filters them with duplicated substring searches, and renders one Result collection. Vault v1 stores immutable Result revisions plus append-only mutable-state events and already maps those objects to provider-neutral GitHub files. The public stateless MCP reads only the selected instance's published Result catalog; it has no authenticated path into a user's browser-local or paired private GitHub Vault. `/demo/dash/` is already reserved for the repository's operational `DASH.md` status view.

The change must therefore add a Dash domain model without changing Result hashes, reuse the Vault/event merge rules, share semantic ranking between browser and Worker, and preserve the public/private instance boundary.

In the product handoff, `Card` maps to the repository's existing `Result` entity. This change does not add a parallel Card schema or migrate Result identity.

## Existing capability overlap

The pre-change OpenSpec/repository audit established these integration boundaries:

- `f5-semantic-result-cards` owns the current Result-card presentation and continuation-first actions; Semantic Dashes reuse those Result identities/actions and replace duplicated search scoring with the shared ranker.
- M1 dashboard code owns category/favorite/search behavior; the new collection is additive and uses `/demo/dashes/<dash-id>/`, while the existing operational `/demo/dash/` route remains untouched.
- `f6-zero-install-private-sync` and its merged Vault/GitHub slices own provider-neutral persistence; Dash revisions/events extend Vault v1 and the existing object layout without introducing a storage-provider adapter.
- `f3-immutable-pages-chatgpt-plugin` and `f4-plugin-directory-submission` own the public instance/MCP boundary; the Dash endpoint/tool are additive and can read only intentionally exposed instance catalogs.
- Existing change directories remain unarchived historical/active inputs and have legacy validation state; this change does not rewrite their specs or task history.

## Goals / Non-Goals

**Goals:**

- Make Dash definitions, revisions, membership references, and overrides portable through the existing Vault abstraction.
- Provide one deterministic, local semantic ranking implementation for Result search, temporary-Dash construction, saved-Dash lookup, and related-Dash discovery.
- Keep access checks structurally ahead of ranking and summary generation.
- Make Review-mode behavior and ambiguous matching deterministic enough for fixture tests.
- Add compatible dashboard, instance, and MCP surfaces without making private Vault data public.
- Leave the data model capable of supporting Automatic mode and future authenticated instance storage.

**Non-Goals:**

- Hosted embeddings, mandatory LLM summarization, or a new model/API dependency.
- OAuth or identity work that exposes a paired private Vault to the current public MCP endpoint.
- A Google Drive adapter, cross-device conflict-resolution UI, public collaborative Dashes, or graph visualization.
- Renaming or replacing the existing operational `/demo/dash/` project-status route.
- Copying Result content into Dash revisions or altering immutable Result hashing.

## Decisions

### 1. Store semantic intent as a versioned portable definition

Each Dash revision stores a reference-only shape equivalent to:

```json
{
  "schemaVersion": 1,
  "dashId": "dash_...",
  "dashRevisionId": "dashrev_...",
  "baseRevisionId": null,
  "title": "Еда",
  "description": "Рецепты, продукты и домашняя еда",
  "semanticDefinition": {
    "query": "еда",
    "normalizedTerms": ["concept:food"],
    "engineVersion": 1
  },
  "scope": {
    "providers": ["*"],
    "sourceTypes": ["*"],
    "includeArchived": false
  },
  "updateMode": "review",
  "automaticResultIds": ["result-a"],
  "suggestedResultIds": ["result-b"],
  "createdAt": "...",
  "lastUpdatedAt": "..."
}
```

`query` preserves the normalized topical portion of the user's intent after command-word stripping, `normalizedTerms` makes the saved definition inspectable and stable, and `engineVersion` makes future re-indexing explicit. No embedding or Result text is stored in the definition. Title/description edits and semantic refreshes create new revisions with `baseRevisionId`; revisions are append-only and sync by identity.

Alternative considered: persist a numeric embedding. Rejected for the MVP because it would introduce model/version/provider coupling and is not inspectable. Alternative considered: persist only the raw query. Rejected because a stored normalization/version is needed to explain and deterministically migrate semantic behavior.

### 2. Keep dynamic membership snapshots separate from append-only overrides

Dynamic membership (`automaticResultIds`, `suggestedResultIds`) belongs to a Dash revision and can be recalculated. User intent belongs to Vault events. The event schema is additively extended with optional `dashId` and Dash membership fields and supports these types:

- `dash.pin` — boolean pin state for a Result reference;
- `dash.exclude` — boolean exclusion/rejection state;
- `dash.manual` — boolean explicit manual membership;
- `dash.accept` — boolean Review proposal decision;
- `dash.delete` — boolean Dash tombstone.

Events continue to use globally unique IDs and deterministic `(createdAt, eventId)` ordering. An exclusion wins over dynamic, accepted, manual, or pinned inclusion until explicitly reversed. Pin/manual/accept states are independent so unpinning does not silently reverse a manual addition. Delete is a Dash tombstone; it does not remove revisions, events, or Results.

Alternative considered: store pins/exclusions directly on the latest Dash object. Rejected because concurrent provider merges would overwrite user decisions and diverge from the existing Vault event architecture.

### 3. Extend Vault v1 additively with Dash revisions

Portable Vault objects gain an optional `dashRevisions` array. Loading a pre-feature Vault treats a missing array as `[]`; current Results, events, and profile revisions retain their meaning. Sanitizers allow only Dash schema fields and extended event fields.

Provider-neutral object layout adds:

```text
dashes/<dash-id>/<dash-revision-id>.json
```

The Vault manifest remains schema version 1 because the field is optional and old Vault payloads remain valid. GitHub object serialization reads/writes these files beside existing `results/`, `events/`, and `profile/` objects. Multiple concurrent revision heads are preserved; projection selects a deterministic head and exposes a conflict count instead of deleting alternatives.

Alternative considered: encode a Dash as a Result. Rejected because it conflates reference views with immutable knowledge, complicates deletion semantics, and risks recursive copies. Alternative considered: bump the whole Vault schema to v2. Rejected because the extension is additive and would unnecessarily block existing Vault v1 data and adapters.

### 4. Use one deterministic lexical-semantic engine with an explicit version

A pure shared module, importable by both browser code and the Worker, performs:

1. Unicode/lowercase normalization and punctuation folding;
2. removal of Dash/open/show/continue intent words in supported natural commands;
3. lightweight prefix/stem normalization;
4. concept expansion using a small inspectable multilingual lexicon (initially Russian, English, and Spanish terms needed by fixtures), with `DashGPT` and `Product` represented as independent general signals rather than a special product-discussion entity;
5. weighted matching across title, tags, category, summary, decisions, next action, status, existing Result body/result/instructions/link/open-question/continuation fields, and source metadata;
6. phrase/exact-token bonuses and bounded character-trigram similarity for misspellings;
7. normalization to a `0..1` score with deterministic tie-breaking by stable ID.

The same `rankResults()` replaces dashboard/MCP substring-only search and powers Dash membership. Exact substring matches remain a strong signal, so existing search behavior does not regress. Derived tokens/scores are disposable and never enter Result `contentHash`.

Initial thresholds are named/versioned constants rather than call-site literals:

- Result accepted/high confidence: `0.42`;
- Result proposal floor: `0.22`;
- Saved Dash confident match: top score at least `0.62` and margin at least `0.12` over the second candidate;
- Saved Dash ambiguous candidate: score at least `0.50` and within `0.12` of the top candidate.

Thresholds may be calibrated only with deterministic fixtures; any semantic behavior change increments `engineVersion` and updates the design/spec fixtures.

Alternative considered: reuse semantic card hue as similarity. Rejected because hue is a presentation coordinate with broad anchors and a hash perturbation, not a relevance metric. Its concept vocabulary may be shared, but its numeric color output is not an index.

### 5. Filter eligibility before every semantic operation

Callers provide an already authorized Result set plus scope metadata. A shared eligibility filter removes unavailable, deleted, disallowed-provider/source, out-of-scope, and (by default) archived Results before tokenization. The semantic engine never sees their text.

Dash revisions store only opaque Result IDs. Materialization resolves each reference against the current eligible map. An unresolved reference becomes `{ status: "unavailable" }` for authorized Dash owners, with no title, summary, tags, source URL, or cached excerpt. Public instance/MCP output never receives private Dash definitions in the first place.

Alternative considered: score all known Results and redact after selection. Rejected because scores, counts, group labels, and summaries would leak inaccessible content indirectly.

### 6. Review refresh is a deterministic projection

For a saved Dash in `review` mode:

1. filter currently eligible Results;
2. rank them against the saved semantic definition;
3. apply exclusion/rejection events first;
4. retain accessible pin/manual/accepted overrides;
5. retain prior automatic members only while they remain high-confidence, while preserving content-free opaque references whose current eligibility fails or cannot be established so access loss remains visible;
6. put newly high-confidence or proposal-floor candidates not previously accepted into `suggestedResultIds`;
7. create a new Dash revision that records the refresh time and resulting reference snapshots without copying Result content;
8. materialize member/proposal/unavailable groups and regenerate the aggregate summary.

Saving a temporary Dash establishes the initial high-confidence set as its accepted automatic snapshot; later Results are new proposals. `automatic` is a reserved enum value but is rejected/disabled by MVP UI and validation. A future Automatic implementation can change step 6 to direct inclusion while reusing the same exclusions and pins.

### 7. Aggregate summaries are derived, bounded, and never durable card caches

The aggregate summary is generated on every materialization from accessible included Results only. The MVP uses a deterministic extractive summary: group by category/concept, report counts, and include bounded leading titles plus the first non-duplicate summary sentence. Related Dashes are derived by comparing semantic definitions and returned as IDs/titles only when those Dashes are accessible.

Dash revisions do not persist aggregate prose or copied Result snippets. Therefore losing access removes the underlying text from the next summary automatically. Revision `lastUpdatedAt` is durable, and a materialized Dash reports the later of that timestamp and its latest append-only override event so accepted/excluded membership changes have an accurate update time.

Alternative considered: persist an LLM-generated summary. Rejected because it can retain inaccessible content, requires invalidation provenance, and violates the no-required-model MVP constraint.

### 8. Dashboard adds `/demo/dashes/` while preserving `/demo/dash/`

The main dashboard gains a saved-Dashes section and a topic input. Temporary preview and saved detail use the shared SPA renderer; deep links use `/demo/dashes/<dash-id>/`. `/demo/dash/` remains the operational project-status view.

The Dash detail view presents summary, leading members, proposals, unavailable count, related Dashes, and update time. Member rows reuse existing Result page/source/continuation actions. Context Pack remains in the Result's secondary `More` action. Rename/description changes create a revision; pin/exclude/manual/proposal/delete actions append events and persist through the active Vault adapter.

Hash-fragment import uses `#dash-import=<base64url-json>` and contains only the Dash definition and Result IDs, never Result bodies or credentials. Opening it shows a preview and requires a Save confirmation, mirroring the existing explicit Result-import boundary.

### 9. Instance and MCP additions are read-only plus explicit import

The compatible instance protocol keeps version 1 and additively advertises:

- `GET /api/dashgpt/dashes` for Dash definitions intentionally exposed by that instance;
- `POST` is not added;
- the MCP tool `open_semantic_dash(query, siteUrl?, limit?)` loads the selected instance's exposed Dashes and Results, resolves confident/ambiguous/no-saved cases, refreshes in memory, and returns a bounded chat representation;
- when only a temporary Dash exists, the tool returns an explicit dashboard import URL rather than writing.

Remote v1 instances that do not advertise a Dashes endpoint are treated as having zero exposed saved Dashes, and temporary Dash construction still works from their Results endpoint.

This design intentionally does not let public MCP read browser-local or paired private GitHub Vault data. Full private saved-Dash reopening from ChatGPT requires a future authenticated instance/Vault surface (aligned with Feature 6 Slice E), not a privacy bypass in this PR. The MVP chat acceptance applies to Dashes/Results the selected instance already exposes and always allows a temporary Dash over exposed Results.

### 10. Tests enforce domain behavior before UI strings

A new deterministic verifier covers semantic scores, confident/ambiguous Dash selection, temporary save, Review refresh, accept/reject, pin/exclude/manual precedence, one Result in multiple Dashes, deletion isolation, summary invalidation, related Dashes, Vault merge/object round trips, and inaccessible sentinel leakage. Existing smoke tests cover MCP discovery/tool execution and remote-instance fallback. UI contract tests cover saved-Dash rendering, explicit Save, source/continuation actions, and disabled Automatic mode.

No browser automation dependency is added; current tests are Node assertions plus Worker fixtures, consistent with the repository baseline.

## Risks / Trade-offs

- **[Lexical semantics is weaker than embeddings for novel topics]** → Keep scores explainable, include multilingual concept fixtures, use proposal review for uncertainty, and version the engine so an optional embedding adapter can be added later.
- **[Thresholds may over/under-match a small catalog]** → Centralize thresholds and lock representative food, DashGPT Product, travel, and phone-repair cases in tests, including ambiguity negatives.
- **[Revision arrays grow over time]** → Revisions are small and reference-only; compaction can later preserve heads/ancestry without changing Result data or event semantics.
- **[Old application code would ignore additive Dash fields if a user rolls back]** → Existing Results remain safe; rollout documentation recommends exporting the Vault before downgrade. GitHub object paths remain ordinary files and are not deleted by this change.
- **[Public MCP cannot reopen a browser-private saved Dash]** → State this boundary in tool output and UI; never solve it by exposing private data. Future authenticated instance storage can reuse the exact Dash/Vault model.
- **[Deterministic extractive summaries are less fluent]** → Prefer privacy correctness and reproducibility in the MVP; an optional summarizer can later consume the same already-filtered materialized view.

## Migration Plan

1. Deploy readers that accept missing `dashRevisions` and extended optional event fields before any Dash write is possible.
2. Add semantic/domain tests and provider-neutral object round-trip tests.
3. Enable dashboard temporary preview/save and migrate the current local Vault lazily by treating missing Dash arrays as empty; do not rewrite immutable Results.
4. Add instance/MCP read and import-link behavior after the shared domain tests pass.
5. Roll out with Review mode only. Existing users see an empty Dashes section until they save or import one.
6. Rollback removes Dash UI/tools but leaves Result data untouched. Dash object files/events can remain dormant for a later redeploy; users should retain/export their Vault before using an older client that does not preserve unknown fields.

## Open Questions

- Which additional language concept packs should ship after Russian, English, and Spanish fixtures demonstrate the engine contract? Adding vocabulary does not change the data model or surface contract but requires an `engineVersion` increment and regression fixtures.
