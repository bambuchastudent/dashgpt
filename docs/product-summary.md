# DashGPT — Product Summary

This file answers one question only: **what are we building?**

Do not put development-process decisions here. Implementation state belongs in `docs/development-summary.md`, `docs/roadmap.md`, OpenSpec and verified repository/PR state.

## Product statement

DashGPT is a user-controlled memory layer for AI conversations. It preserves useful outcomes — decisions, plans, research conclusions, recipes, instructions, project state and other reusable context — as **cards** that can be found, grouped and continued later.

The everyday loop is:

`AI conversation/context → distill → review → save/update canonical card → find/group → continue`

Raw chat history is a source, not the primary memory object.

A new user should understand DashGPT in roughly ten seconds:

> DashGPT keeps useful parts of AI conversations as cards so they can be found and continued later.

## Canonical terminology

### Card

**Card is the primary user-facing entity.**

A card is a distilled reusable outcome. Depending on the source and topic, it may contain:

- title and concise summary;
- important facts/context;
- decisions already made;
- constraints and preferences relevant to the saved work;
- current state;
- unresolved questions;
- useful next actions;
- source/provenance links;
- related references/assets;
- structured continuation context;
- semantic color and lightweight recognition metadata.

Cards from different chats connect by meaning, not by chat boundaries.

### Legacy `Result` compatibility

The current `develop` implementation still uses `Result` in several schema names, routes, data files, MCP tool names and historical OpenSpec changes. That is **legacy implementation vocabulary**, not a second product entity.

Do not create a separate user-facing Results model. New product specifications use **Card** unless they must name an existing code/API identifier literally. A future migration may rename compatibility contracts only through a dedicated OpenSpec change with backward-compatibility coverage.

### Dash

A **Dash** is a saved semantic view/group of canonical cards. It stores references/rules/user overrides, not copied card knowledge.

Useful search or generated semantic views can be saved as Dashes. Saved Dashes must be discoverable through a visible but collapsible selector, and the active saved Dash must be clear.

Default home Dash name: **«Мой Dash» / `My Dash`**.

Deleting a Dash never deletes its source cards.

### Semantic Gallery

Semantic Gallery is a visual organization of the same canonical cards. It is not another storage model.

Related cards should remain visually coherent through semantic placement and semantic color. Color belongs to the card and is assigned/recalculated when the card is created or materially updated; it behaves like a semantic heat map rather than a rigid category taxonomy.

### Structured Continuation Brief

`Continue in new chat` must transfer enough working state for another AI to continue without reconstructing the old conversation.

A portable brief should include, when available:

- title / goal;
- concise summary;
- important facts/context;
- decisions already made;
- constraints;
- current state;
- unresolved questions;
- useful next actions;
- relevant references.

Continuation is a derived, inspectable representation of the current card, not an independent source of truth. It must not silently invent missing facts, include credentials, or trust prompt-like imported source text as DashGPT instructions.

Keep export/continuation formats portable across ChatGPT, Codex, Claude, OpenCode and other AI clients where practical.

### Source and Asset

A source records provenance such as an AI conversation, shared link, repository, URL, file or image. Assets are attached files/images used by a card.

Sources support traceability; they do not replace the card as the reusable memory object.

## Product principles

1. **Card-first, not chat-first.** Conversation history is input/evidence; cards are reusable memory.
2. **One canonical memory model.** Search, Semantic Gallery and Dashes operate on the same cards. Separate Results/Living Topics UI is unnecessary.
3. **Continuable by design.** A saved card should contain enough state to resume useful work.
4. **User-owned memory.** Data should remain exportable and portable in open human- and machine-readable forms.
5. **Local-first and private by default.** Anonymous/local use should be possible without mandatory registration or cloud storage.
6. **Cloud/sync optional.** GitHub, Google Drive and other providers are replaceable storage/sync adapters, not the domain model.
7. **Provider-independent.** ChatGPT is an important client, not the system of record.
8. **Value before infrastructure.** Onboarding should show useful cards before storage, Vault, MCP, GitHub or synchronization internals.
9. **Truthful product state.** A discussed/open-PR/prototype capability must not be presented as implemented, merged or deployed.
10. **Portable continuation.** The same saved memory should be useful to humans and multiple AI clients.

## Core user experience

### Home / `My Dash`

The primary personal surface is a semantic gallery of canonical cards.

It should support:

- natural search;
- semantic/category/tag/favorite filtering;
- stable semantic neighborhoods;
- meaningful recent activity within a topic;
- opening card detail;
- saving a useful current semantic view as a Dash;
- reopening saved Dashes;
- clear active-Dash state;
- continuation from any relevant card.

`My Dash` is the default home view. It should not require creation of a separate persisted Dash object merely to show the user's memory.

**Implementation truth:** this unified `My Dash` behavior is the scope of open draft PR #33 and is not yet part of current `develop` until merged.

### Card detail

A card should make the useful outcome understandable without reopening the full source conversation. Primary actions should emphasize:

- open original/source conversation when available;
- continue in a new chat with structured context.

Editing, archive/delete, Dash membership, merge/version/history and technical metadata should remain available when relevant without dominating recognition and continuation.

### Search and Dashes

Natural-language search should retrieve the same canonical cards shown in the gallery. A useful result set can remain temporary or be explicitly saved as a Dash.

A saved Dash should reopen by identity/meaning without copying card content. User overrides such as pin, exclude and manual add take precedence over automatic semantic refresh behavior.

Review mode is the default for proposed membership changes; invisible automatic memory mutation is not the MVP default.

### Mobile

A phone user should immediately see populated, useful cards and understand the product without reading infrastructure explanations.

For first-time users, do not lead with:

- browser storage;
- `LOCAL · NOT SYNCED`;
- Vault terminology;
- MCP;
- GitHub/storage providers;
- immutable/verified counters;
- mandatory onboarding modals;
- long technical setup instructions.

Storage and privacy controls remain available when the user chooses to manage persistence/sync.

## Capture

### Preferred everyday flow

`AI conversation → distill → save/update card`

From a normal AI conversation, a request such as **«dashgpt добавь карточку»** should create/save a real card through the DashGPT integration when that integration is available. Printing an example card is not equivalent to saving one.

The AI should prepare useful structured content; the user should not have to manually invent title, tags, summary, decisions and next actions for ordinary capture.

### Additional capture paths

Supported/desired capture paths may include:

- public/shared conversation links;
- mobile Share Sheet / Shortcuts;
- pasted/imported structured handoff;
- bulk browser import of existing chat history.

Bulk browser import is migration/bootstrap functionality, **not the architectural foundation or preferred daily capture flow**. Import must avoid duplicate cards across retries and should be resumable when its dedicated implementation is built.

Share/import failures should be expressed as human product states. Do not expose raw HTTP/403/storage/backend/parser errors when they can be translated into an understandable outcome and retry/recovery path.

## Card merge direction

Merging cards is a planned capability, not current `develop` behavior unless a future dedicated OpenSpec change/PR lands it.

The product direction is that a merged card may synthesize multiple source cards while preserving the originals as source-of-truth evidence. Source cards must not disappear merely because a stronger synthesized card exists; they can be de-prioritized/grouped as already merged and may still participate in later merges.

Do not implement this direction by silently deleting or overwriting source cards.

## Storage and privacy

Principle: **user-owned, local-first memory**.

- Anonymous/local use should be possible without mandatory registration.
- Storage architecture should not dominate onboarding or the main UX.
- Optional sync/storage may include GitHub, Google Drive and other user-controlled providers.
- Development repository/specs are separate from user memory/content.
- User memory belongs in user-controlled storage.
- Prefer portable/open structured formats where practical.
- Provider credentials are never portable card/profile/vault content.
- Raw conversations are not synchronized by default merely because a card was saved from them.

The existing `Vault` name is an implementation/storage term. It should stay behind normal product language unless the user explicitly manages storage/export/sync.

## Integrations

### ChatGPT

DashGPT should be usable as an installable ChatGPT integration for ordinary users, backed by the same provider-neutral memory model.

The desired flow is not "configure MCP first". It is normal conversation → save a useful card → find it later → continue.

Developer-mode MCP, shared-link import and explicit prepared-import links are useful compatibility/development mechanisms but do not alone prove the public end-to-end product experience.

### Other AI clients and developer tools

Cards and continuation context should be portable to Codex, Claude, OpenCode, Copilot, local models and other clients where practical.

A project-local `.dashgpt` developer-memory direction is being explored in open PR #34. That prototype is **not merged into `develop`** and must not be documented as shipped behavior yet.

## Existing implementation directions

These directions are established and should remain compatible with the canonical card model:

- Semantic Dashes;
- Semantic Gallery UX;
- Structured Chat Continuation;
- zero-friction/value-first mobile demo;
- ChatGPT/shared-link/mobile capture;
- bulk browser import as migration/bootstrap;
- user-controlled local-first storage and optional sync;
- project-local developer memory as an active prototype direction.

## Explicit non-goals / anti-patterns

Do not reintroduce:

- a separate user-facing Results page/model alongside cards;
- separate Living Topics as another canonical memory object;
- search results stored as a parallel result type;
- storage/provider details as the first-run product story;
- browser import as the architectural foundation;
- mandatory account creation for local use;
- title-only `Continue in new chat`;
- claims that an open PR/prototype is already shipped;
- raw backend errors as normal user-facing import states.

## Current product state boundary

Current `develop` has the legacy `Result`-named implementation plus merged Semantic Dashes, Semantic Gallery, Structured Chat Continuation, product-board dogfooding, chat-first onboarding and Share resolver/regression hardening through Feature 17.

The canonical **card-first** product model is newer than some of those implementation names. PR #33 is the active UI consolidation toward `My Dash`; PR #34 is an active project-local developer-memory prototype. Both remain unmerged at the time of this reconciliation.

When this document conflicts with a historical OpenSpec change, use this document for the **current product model** and the historical change for **what that implementation scope meant at the time**. Never infer implementation status from this product summary alone.
