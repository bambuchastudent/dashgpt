## Context

Developer conversations are fragmented across AI clients. DashGPT needs a project-local representation that is readable by humans and arbitrary agents, while preserving the existing card-first product model and local-first privacy principle.

The prototype deliberately separates three concerns:

1. **Portable memory contract** — ordinary files under `.dashgpt`.
2. **Canonical knowledge** — cards and explicit relationships.
3. **Visualization** — a renderer that can run in a browser or later inside an IDE WebView.

Raw sessions are optional evidence, not the primary retrieval surface.

## Design Principles

### Cards are memory; sessions are evidence

A session can be discarded without destroying the project knowledge already distilled into cards. A card may reference one or more sessions, commits, pull requests, files or tests as evidence.

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

Developer metadata is optional:
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

The new standalone route loads one fixture and renders four views without changing the main dashboard.

### Project Map

Cards are grouped into semantic neighborhoods. Within each neighborhood the renderer shows status, outcome identity and relationship hints. Selecting a card opens a detail panel with causal history and evidence.

### Timeline

Cards are ordered by meaningful project timestamps and rendered as semantic work events rather than commit log entries.

### Results

Results are derived from the same cards, grouped by status/kind, so no parallel Result entity is introduced.

### Sessions

Sessions show which clients contributed to the project and which canonical cards were distilled from them. They are visually secondary to outcomes.

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
- all four views render;
- project map cards are based on fixture cards;
- selecting a card exposes decision/outcome/evidence;
- session provenance links back to canonical cards;
- 390px mobile rendering has no horizontal overflow;
- the prototype does not expose a control that claims automatic capture is active.
