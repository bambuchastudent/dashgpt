# DashGPT — Roadmap

This roadmap is intentionally high-level. Detailed work belongs in OpenSpec changes/specs.

## M0 — Project bootstrap

Goal: make the repository understandable and operable by multiple AI providers without relying on chat history.

Exit criteria:

- product and development summaries exist
- roadmap exists
- minimal agent entry instructions exist
- OpenSpec is initialized locally for target agents
- first implementation change is proposed and reviewed

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

## Current milestone

**M0 — Project bootstrap**

Next implementation milestone: **M1 — Local-first Result vertical slice**.
