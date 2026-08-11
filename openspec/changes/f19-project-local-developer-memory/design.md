## Context

Developer conversations are fragmented across AI clients. DashGPT needs a project-local representation that is readable by humans and arbitrary agents, while preserving the existing card-first product model and local-first privacy principle.

The prototype deliberately separates three concerns:

1. **Portable memory contract** — ordinary files under `.dashgpt`.
2. **Canonical knowledge** — cards and explicit relationships.
3. **Visualization** — a renderer that can run in a browser or later inside an IDE WebView.

Raw sessions are optional evidence, not the primary retrieval surface.

The first renderer iteration grouped cards semantically but made project comprehension too indirect. The revised renderer therefore treats **current project state** as the first visual question and semantic neighborhoods as a secondary organizing signal.

## Design Principles

### Cards are memory; sessions are evidence

A session can be discarded without destroying the project knowledge already distilled into cards. A card may reference one or more sessions, commits, pull requests, files or tests as evidence.

### Project state is derived from cards, not a second task system

Developer cards can carry optional `workstream`, `stage`, `stageLabel`, `progress[]` and `priority` metadata. The renderer derives Now/Shipped/Next and workstream views from those same cards. No parallel project-item entity is introduced.

### Current state before archive

The initial viewport should answer, in order:

1. What is DashGPT building now?
2. What user capability does each active change add?
3. What is already shipped?
4. What is next?
5. How does this work compose into the product?

Only after that should the user need to inspect individual evidence, sessions or historical timelines.

### AI-readable without DashGPT

The portable contract must remain useful when DashGPT is not installed. A generic coding agent can read `.dashgpt/project.md`, then inspect `.dashgpt/cards/` and follow relationships using stable IDs.

Binary semantic indexes are derived/cache state only and are never the sole representation of knowledge.

### Provider-neutral provenance

Source clients are metadata values such as `copilot`, `opencode`, `cline`, `codex`, `claude-code`, `local`, or another free-form identifier. Core schemas never depend on one provider.

### Local-first session privacy

The contract distinguishes shareable project memory from local evidence. A future implementation may gitignore `.dashgpt/local/` and `.dashgpt/sessions/` by default. This prototype does not persist real user sessions.

## Portable `.dashgpt` Shape

```text
.dashgpt/
├── manifest.json
├── project.md
├── cards/
│   └── <card-id>.md|json
├── relations.json
├── shared/
│   └── ...
├── sessions/
│   └── ...          # optional evidence; normally local/private
├── local/
│   └── ...          # explicitly device/user-local
└── index/
    └── ...          # derived and rebuildable
```

The prototype fixture is a single JSON document mirroring the same logical model so the renderer can remain static and deterministic.

## Prototype Data Model

### Project

- `id`
- `title`
- `summary`
- `branch`
- `updatedAt`
- optional `productSpine[]` describing the current product flow in human terms

### Card

Required:
- `id`
- `title`
- `summary`
- `kind`
- `status`
- `semanticHue`
- `createdAt`
- `updatedAt`

Developer/project-state metadata is optional:
- `workstream` — human project area such as Memory, Capture, Experience, Reliability, Developer Tools
- `stage` — `shipped`, `active`, `prototype`, `next`, or another portable stage token
- `stageLabel` — verified human-facing state such as `PR #34 · ready` or `In develop`
- `priority` — deterministic display priority inside a stage/workstream
- `progress[]` — compact verified milestones (`OpenSpec ✓`, `Code ✓`, `Tests ✓`, `Merge pending`)
- `problem`
- `decision`
- `outcome`
- `files[]`
- `evidence[]`
- `sessionIds[]`
- `tags[]`

### Relation

- `from`
- `to`
- `kind`

Prototype kinds include `led-to`, `implements`, `validates`, and `related`.

### Session

- `id`
- `client`
- `model`
- `startedAt`
- `endedAt`
- `messageCount`
- `summary`
- `cardIds[]`

The prototype intentionally does not include full raw transcripts.

## Visual Architecture

The standalone route loads one fixture and renders four views without changing the main dashboard.

### Project State (primary)

The first view has three layers.

**Product spine** — a compact horizontal/stacked explanation of how DashGPT capabilities compose into user value, e.g. Capture → Cards → Semantic organization → Continue → Developer memory.

**Now** — active cards shown prominently with human outcome copy and a visible progress/evidence rail. An active change must be understandable without opening the card.

**Workstreams** — cards grouped by human project area. Each card shows stage, concise outcome and relevant evidence label. Semantic hue remains a visual accent rather than the main structure.

A small Shipped / Active / Next summary makes the project trajectory legible at a glance.

### Timeline

Cards are ordered by meaningful project timestamps and rendered as semantic work events rather than commit log entries.

### Results

Results are derived from the same cards, grouped by stage/status/kind, so no parallel Result entity is introduced.

### Sessions

Sessions show which clients contributed to the project and which canonical cards were distilled from them. They are visually secondary to outcomes.

## Card Detail

Selecting any project-state card opens the existing engineering detail path: problem → decision → outcome, code/files, evidence, contributing sessions and explicit relations. The primary view must not depend on this detail panel to explain what the active work is doing.

## Renderer Boundary

The prototype uses plain HTML/CSS/JavaScript and static JSON. The renderer owns no storage and mutates no project state. Later IDE plugins can host the same renderer in a WebView and provide a filesystem/MCP adapter.

## Future Adapter Contract (not implemented)

A future provider-neutral adapter can expose operations such as:

- `dashgpt.context(task)`
- `dashgpt.search(query)`
- `dashgpt.get(cardId)`
- `dashgpt.save(card)`
- `dashgpt.finishSession(session)`

This PR must not implement these operations or imply automatic capture exists.

## Privacy and Git Policy

The prototype UI labels session data as local evidence. Future production defaults should keep raw sessions uncommitted unless the user explicitly changes policy. Shared project cards should contain distilled knowledge only and should avoid secrets or unnecessary transcript material.

## Compatibility

No existing card schema, immutable hash, Vault event, Semantic Dash, search selection, continuation payload, storage provider, worker API or MCP tool is changed. The prototype route consumes an isolated fixture.

## Verification

Browser tests verify:
- Project State is the default view;
- active work is visible without opening a card and exposes human outcome + progress state;
- product spine and workstreams render from fixture data;
- Timeline, Results and Sessions reuse the same canonical cards;
- selecting a card exposes decision/outcome/evidence;
- session provenance links back to canonical cards;
- 390px mobile rendering has no horizontal overflow;
- the prototype does not expose a control that claims automatic capture is active.
