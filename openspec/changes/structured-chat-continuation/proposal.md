## Why

DashGPT already treats Results as continuable outcomes, but the primary `Continue in new chat` action sends only a small ad-hoc prompt and, for some Results, effectively leaves the receiving assistant with little more than the title. The new chat cannot reliably distinguish prior decisions, current state, constraints, unresolved questions, resources, and the next intended step. Users must reconstruct context manually and assistants repeat completed work.

The existing Context Pack is a broader export and remains useful, but it is not the compact, action-oriented first message required by the primary continuation flow. The product needs a separate derived representation that is current, inspectable, transport-aware, localized, and safe to place in an AI prompt.

## What Changes

- Introduce a stable RU/EN Markdown `Continuation Brief` derived from the latest materialized Result at action time.
- Separate the Continuation Brief from the existing Full Context Pack and retain Context Pack as a secondary action.
- Include topic, goal, summary, current state, decisions, facts, constraints, topic-relevant user preferences, open questions, resources, suggested next step, and trusted receiving-assistant instructions when source data exists.
- Omit empty sections, apply truthful fallbacks for minimally populated Results, and never invent decisions, facts, constraints, or resolved status.
- Add an allowlisted privacy projection that excludes unrelated object fields, credentials, secret-bearing URLs, raw transcripts, hidden metadata, and source-provided instructions.
- Establish a prompt-injection boundary: Result/source text is untrusted data; only DashGPT's localized template may populate `Instructions for the assistant`.
- Replace the hard-coded ChatGPT URL builder with a target transport adapter that owns URL construction, Unicode/Markdown encoding, an explicit safe URL budget, compact-mode behavior, popup detection, and clipboard fallback.
- Add `Preview context`, editable continuation text, `Copy continuation brief`, and a full-brief copy option when compact transport is required; preview edits never mutate the Result.
- Record a content-free successful continuation activity event only after a deeplink navigation is opened or clipboard fallback plus target opening succeeds.
- Add unit, integration, and real-browser coverage for content, language, privacy, injection boundaries, size handling, popup/clipboard failures, freshness, repeated use, and mobile behavior.

## Capabilities

### New Capabilities

- `structured-chat-continuation`: current Result-to-Brief derivation, trusted/untrusted prompt boundary, preview/edit/copy UX, target-aware transport, truthful fallback, and successful-use activity tracking.

### Modified Capabilities

None. The repository has no promoted baseline capability specs under `openspec/specs/`. This change replaces the narrow legacy Feature 5 continuation implementation without rewriting its historical change document.

## Impact

- **Results/cards:** existing Results remain valid; optional structured continuation fields are additive and minimal Results use explicit non-fabricating fallbacks.
- **Feature 5 actions:** `Continue in new chat` remains primary, while preview/copy and the existing Context Pack stay secondary.
- **Context Pack:** unchanged as the larger export; it is neither embedded automatically nor used as a hidden cache for continuation.
- **Creation/update:** the portable Result sanitizer preserves explicitly supplied continuation fields; the current minimal create form is not redesigned.
- **Semantic Dashes:** member continuation reuses the same action/controller and current Result identity without changing Dash membership or summaries.
- **Semantic Gallery:** no ordering, layout, zoom, or selection behavior changes. Successful continuation uses the merged Gallery's content-free `result.activity = continue.new-chat` event shape rather than creating a parallel telemetry model.
- **Target AI:** the MVP keeps the current ChatGPT target behind one adapter; additional providers remain future adapters.
- **Privacy/storage:** only the selected Result's allowlisted, sanitized fields enter the brief. Full prompts and clipboard contents are never stored in Vault events or telemetry.
- **Compatibility:** current immutable Result hashes remain valid because absent optional fields do not change canonical payloads; newly supplied durable continuation fields participate in integrity verification.
