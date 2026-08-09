# DashGPT — Roadmap

This roadmap is intentionally high-level. Detailed work belongs in OpenSpec changes/specs.

## M0 — Project bootstrap

Goal: make the repository understandable and operable by multiple AI providers without relying on chat history.

Status: **complete enough to proceed**.

## M1 — Local-first Result vertical slice

Goal: prove the core product loop locally with no cloud dependency.

Scope:

- Result domain model
- local persistence
- create/import Result
- browse/open Results
- basic search
- favorites
- Context Pack generation/export
- minimal usable laptop/mobile-responsive web UI

Exit criterion: a user can save a useful outcome and export enough context to continue it elsewhere.

Status: **merged into `develop`**.

## Tactical Feature 2 — Shared chat → published Result

Goal: prove ingestion of a real AI conversation before building the full API/MCP import layer.

Target flow:

public ChatGPT shared link → assistant/agent summary → published DashGPT Result → searchable card with source provenance.

MVP constraints:

- agent-mediated summarization is acceptable
- no mandatory model API inside DashGPT
- Git-backed published Result catalog is acceptable as temporary storage
- browser-local Results must not be lost

Status: **merged into `develop` and proven with a real shared chat**.

## Tactical Feature 3 — Immutable Result pages + current topic map

Goal: make Results durable as linkable pages while allowing the DashGPT presentation to evolve globally.

Scope:

- one shared Result page renderer
- stable `/demo/result/<id>` routes
- common published Result schema
- explicit immutable flag and content integrity digest
- current/latest Results at the top of the dashboard
- indexed category mindmap for topic navigation
- publish and review a second real shared-chat Result

Constraint: updating the renderer must not silently modify already-published durable Result content.

Status: **in progress on `feature/f3-immutable-results-mindmap`**.

## M2 — Project state and human summaries

Goal: make DashGPT explain current state, especially on a phone.

Scope candidates:

- Project entity/state
- concise/normal/detailed summary representations
- current / done / next / blockers
- related Results and sources
- deterministic fallback summaries without mandatory LLM API

## M3 — MCP core

Goal: expose DashGPT knowledge and continuation context to replaceable agents.

Scope candidates:

- search/get/create/update Result
- get project state
- generate/get Context Pack
- related/context retrieval
- local authentication/authorization boundary as required

## M4 — ChatGPT and external-agent integration

Goal: use the same DashGPT core from ChatGPT and other MCP-capable clients.

Scope candidates:

- ChatGPT app/plugin integration
- save Result from conversation
- retrieve DashGPT context from conversation
- continue/new-chat/export UX
- validate Claude/Codex/OpenCode interoperability

## M5 — Private quick deploy

Goal: a non-DevOps user can deploy a private instance with minimal setup.

Target experience:

GitHub + Cloudflare accounts → guided setup → protected DashGPT instance.

Constraints:

- cloud remains optional
- private-by-default
- hosted storage adapters must not redefine the core domain model
- self-hosted/local parity remains possible

## M6 — Rich knowledge layer

Potential scope after the core loop is proven:

- image-first Results and richer assets
- automatic category/topic summaries
- relationship graph
- version history
- richer provenance
- selective sharing/publication
- old-chat import pipelines
- smarter context-size selection and relevance ranking

## Current delivery intent

**Active: Tactical Feature 3 — Immutable Result pages + current topic map.**

After this slice is reviewed, continue with roadmap **M2 — Project state and human summaries**, unless real usage exposes a more important ingestion/storage blocker.
