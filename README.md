# DashGPT

DashGPT is a private, local-first dashboard for useful AI conversation outcomes and portable working context across AI agents.

DashGPT is **result-first, not chat-first**: it stores useful outcomes, decisions, artifacts, summaries, sources and continuation context rather than treating raw chat history as the primary object.

Semantic Dashes turn related Results from multiple conversations into saved, refreshable topic views. They keep references and user overrides rather than copying Result content.

## Start here

For humans and agents:

1. `docs/product-summary.md` — **what we are building**.
2. `docs/development-summary.md` — **how we are building it**.
3. `docs/roadmap.md` — current milestones.
4. `AGENTS.md` — minimal instructions for coding agents.
5. `docs/bootstrap.md` — first local/OpenSpec setup commands.

## Core constraints

- Private by default.
- Local-first and cloud-optional.
- Git-provider agnostic.
- Portable data and open context export.
- Same knowledge/state backend serves a detailed laptop view, concise phone summaries, and machine-readable agent context.
- ChatGPT is one client of DashGPT, not the system of record.

## Development method

The project is developed spec-first. OpenSpec is the initial SDD framework; project/product state remains in the repository so that Claude, Codex, GitHub Copilot, OpenCode, local models, and future agents can pick up the same milestones without reconstructing context from chat history.

See `docs/bootstrap.md` to begin.
