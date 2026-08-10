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

This tactical MVP proved the integration shape; later storage work removes the assumption that a personal deployed site is required before first use.

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

## Tactical Feature 6 — Zero-install privacy, personalization and portable sync

Goal: make first use begin in chat while durable DashGPT data remains private, portable and user-owned.

Target experience:

`start chat -> use DashGPT immediately -> paste a storage link or choose local vault -> authorize only that provider -> sync`

Scope is split into implementation slices:

- Vault v1 core and migration away from direct browser `localStorage` coupling
- local/browser + local filesystem/local Git storage boundary
- GitHub synchronization adapter
- Google Drive synchronization adapter
- explicit DashGPT Profile separate from inferred ChatGPT context
- storage-link discovery and minimal pairing UX
- local-first offline queue and conflict-preserving synchronization
- refactor compatible DashGPT instances onto the same storage/vault model

Privacy constraints:

- ChatGPT Memory/Project context may personalize the interaction but is not the DashGPT Result database
- raw chats are not synchronized by default
- cloud sync is opt-in
- provider credentials never enter the portable vault
- immutable Result conflicts are preserved rather than silently overwritten

Status: **architecture, Vault v1 core and GitHub synchronization implementation are merged; production GitHub activation remains an external secret/configuration smoke-test gate**.

## Tactical Feature 7 — Semantic Dashes

Goal: let a user treat Results from multiple conversations as one living topic without copying or merging the underlying Results.

MVP scope:

- saved Dash entity with reference-only membership
- semantic topic preview and explicit save
- fuzzy reopening from natural chat commands
- Review-mode refresh with proposals
- pin, exclude and manual-add overrides
- aggregate summary derived only from currently accessible Results
- dashboard, current-chat/MCP and source-continuation surfaces
- backward-compatible Vault v1 persistence and deterministic verification

Automatic update mode remains architecturally possible but disabled in this first change. Private Vault access from a hosted ChatGPT tool remains behind the authenticated storage/runtime work; the public MCP surface can use only an instance's intentionally exposed catalog.

Status: **implementation PR #18 active under `openspec/changes/f7-semantic-dashes/`**.

## M5 — Optional private quick deploy

Goal: a non-DevOps user who wants a hosted personal instance can deploy one with minimal setup.

Target experience:

GitHub + Cloudflare accounts → guided setup → protected DashGPT instance.

This is an optional advanced/self-hosted path, not the standard first-use requirement.

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

**Active: Tactical Feature 7 — Semantic Dashes.**

Feature 6's production GitHub activation and the public plugin release remain external tracks. Semantic Dashes reuse the existing Result search and Vault abstractions without weakening those privacy boundaries.
