# DashGPT

> **Experimental project.** DashGPT explores new ways to represent AI conversations as reusable, structured knowledge — turning useful parts of chats into cards that can be searched, grouped, connected by meaning and continued later. The project is evolving and should not be treated as a production-ready product yet.

DashGPT is a user-controlled memory layer for AI conversations. It distills useful outcomes — decisions, plans, research conclusions, instructions, project state and other reusable context — into **canonical cards** that can be found, grouped and continued later.

The product is **card-first, not chat-first**: raw conversations are sources. Cards are the reusable memory objects.

The same cards power the Semantic Gallery, search, saved **Dashes** and structured continuation. A Dash is a saved semantic view/group of cards; it does not create a parallel knowledge object.

> DashGPT keeps useful parts of AI conversations as cards so they can be found and continued later.

## Current implementation note

`develop` still contains legacy/internal `Result` names in schemas, routes, data files and MCP tool names. Treat those as compatibility/implementation vocabulary, **not as a separate product entity**. New product work should use **Card** unless it is referring to an existing code/API identifier literally.

Current `develop` includes the merged Semantic Dashes, Semantic Gallery, Structured Chat Continuation, Product Board dogfooding, chat-first/share onboarding and Share-resolver hardening through Feature 17.

Open PRs are not shipped state:

- PR #33 — Feature 18, Unified Card Dashboard / `My Dash` — draft, not in `develop`.
- PR #34 — Feature 19, Project-local Developer Memory prototype — open, not in `develop`.

## Start here

For humans and agents:

1. `docs/product-summary.md` — **what we are building** and canonical product terminology.
2. `docs/product-conversation-guide.md` — product-evaluation and usability rules.
3. `docs/development-summary.md` — **how we build it**.
4. `docs/roadmap.md` — merged, active and planned capability state.
5. `openspec/README.md` — how to interpret current vs historical OpenSpec changes.
6. `AGENTS.md` — minimal instructions for coding agents.
7. `docs/bootstrap.md` — current contributor/OpenSpec workflow.

## Core constraints

- Cards are the canonical user-facing memory object.
- No separate user-facing Results or Living Topics model.
- Private by default; local-first and cloud-optional.
- User-owned, portable data and open continuation formats.
- Storage/provider implementation must not redefine the product model.
- Direct AI conversation → distill → save/update card is the preferred everyday capture flow.
- Shared links, Share Sheet/Shortcuts and bulk browser import are additional capture/migration paths, not the architectural foundation.
- ChatGPT is one client of DashGPT, not the system of record.
- New users should see product value before storage, Vault, MCP or synchronization internals.

## Development method

DashGPT is developed spec-first. For production capabilities, inspect existing OpenSpec overlap, create/use a dedicated change, validate it before production code, implement only approved scope, add regression coverage and run the repository verification gates before PR/merge.

Repository + OpenSpec + verified PR state are the source of truth for implementation status. Never infer that a discussed or open-PR feature is already working in `develop`.
