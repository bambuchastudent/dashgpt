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

Status: **merged into `develop` and proven with a real shared chat**.

## Tactical Feature 3 — Immutable Result pages + DashGPT ChatGPT plugin MVP

Goal: turn the useful internal demo into something that can be shown and connected as a real product surface.

Scope:

- stable `/demo/result/<id>/` pages
- one shared renderer so presentation updates apply to old Result pages
- immutable-content flag plus content digest and CI/browser verification
- another real shared-chat Result published as a standalone page
- per-instance MCP endpoint
- ChatGPT reads Results and Context Packs from the connected instance
- ChatGPT can distill the current conversation and prepare an explicit immutable Result import for the connected instance
- plugin package with stable identity `dashgpt`
- ChatGPT developer-mode connection
- second-person / second-instance demo proving the integration is not hard-coded to the developer site

MVP completion gate:

**DashGPT is not considered MVP-complete until another person can connect ChatGPT to their own DashGPT site and demonstrate both reading their Results and saving a useful current conversation outcome into their own site.**

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

Tactical Feature 3 implements the first MCP subset early so the ChatGPT MVP can be tested before the full MCP milestone.

## M4 — ChatGPT and external-agent integration

Goal: use the same DashGPT core from ChatGPT and other MCP-capable clients.

Scope candidates:

- production ChatGPT plugin integration
- save Result from conversation
- retrieve DashGPT context from conversation
- continue/new-chat/export UX
- validate Claude/Codex/OpenCode interoperability

Tactical Feature 3 proves the first bidirectional ChatGPT flow early; later M4 work replaces tactical MVP transport/storage with the full integration architecture.

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

**Active: Tactical Feature 3 — Immutable Result pages + DashGPT ChatGPT plugin MVP.**

Do not move on to polish or broader project-state work until the standalone page and real bidirectional ChatGPT connection are demonstrated against a second DashGPT instance.
