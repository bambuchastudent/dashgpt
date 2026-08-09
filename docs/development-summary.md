# DashGPT — Development Summary

This file answers one question only: **how are we building DashGPT?**

Do not put product requirements here; those belong in `product-summary.md`.

## Development principles

1. **Spec-driven development.** Significant implementation work starts from an explicit spec/change, not an ad-hoc chat instruction.
2. **Repository is the durable project memory.** A new agent must be able to understand the current milestone without reconstructing the project from chat history.
3. **Provider-agnostic workflow.** Planning and implementation may move among Claude, Codex, GitHub Copilot, OpenCode and local/cheap models.
4. **Strong models for reasoning-heavy work; cheaper/local models for execution where practical.** Model choice is an execution concern, not project state.
5. **Short global instructions; detailed workflow in specs/skills.** Do not turn `AGENTS.md` into a project encyclopedia.
6. **Ground against the repository.** Specs do not replace reading/testing the real codebase.
7. **Handoffs are explicit.** Work should leave task/spec state understandable to another agent.

## Initial SDD framework decision

**OpenSpec is the initial SDD framework.**

Why it is preferred for this project at bootstrap:

- DashGPT is explicitly multi-provider/multi-agent.
- OpenSpec can configure multiple agent tools for the same repository.
- It generates both skills and tool-specific commands.
- Its change-oriented workflow is lightweight enough that specs can evolve with milestones.
- Its local CLI provides a human browsing/status surface in addition to agent commands.

This is a reversible tooling decision. Product specs and project knowledge must remain readable without OpenSpec.

## Tooling baseline

### Required baseline

- Git
- OpenSpec for SDD/change lifecycle
- minimal `AGENTS.md` as the universal entry/router
- automated tests and CI as objective verification

### Coding agents

Coding agents are replaceable clients of the same repository state. Initially target compatibility with:

- Claude Code
- Codex
- GitHub Copilot (including JetBrains where supported)
- OpenCode
- local/cheap models when capable

### Code intelligence/editing

- **Serena:** preferred optional tool for symbol-aware navigation and precise code changes/refactoring when useful.
- **Graphify:** optional lightweight repository map/context reduction tool; not a core dependency.
- **CodeGraphContext or equivalent:** optional alternative if a continuously maintained code graph becomes valuable.

Do not require any of these tools for correctness of the repository.

### Multi-agent task state

Start with OpenSpec artifacts/tasks. Introduce a dedicated dependency/task system such as Beads only when parallel agents and cross-task blockers make the extra state worthwhile.

## Agent responsibility split

Recommended default routing, not a hard product requirement:

- architecture, product clarification, spec review, difficult debugging → strong reasoning model
- straightforward implementation, tests, formatting, mechanical refactors → cheaper/local model where quality is sufficient
- repository/symbol exploration → native code tools, Serena and/or optional graph tooling
- durable decisions/milestones → repository specs/docs, never model memory alone

## Spec lifecycle

For a meaningful change:

1. Read `docs/product-summary.md`.
2. Read this file and `docs/roadmap.md`.
3. Inspect the relevant repository state.
4. Explore unclear scope before committing to a proposal.
5. Create/review an OpenSpec change.
6. Implement only the agreed scope.
7. Test and verify against the spec.
8. Update/archive the change and leave a useful handoff/current state.

## Documentation separation rule

Keep these concerns separate:

- `docs/product-summary.md` = WHAT DashGPT is and must do.
- `docs/development-summary.md` = HOW the team/agents build it.
- `docs/roadmap.md` = milestone ordering and current delivery intent.
- OpenSpec changes/specs = detailed scoped work.
- ADRs = durable architectural decisions and their rationale.

## Published page implementation

Standalone Result pages use one shared client-side renderer rather than copied per-Result HTML.

- Cloudflare Workers Static Assets serves the SPA shell for `/demo/result/<id>/` routes.
- Dashboard and Result pages share the same `index.html`, JavaScript and CSS, so renderer/style updates apply to old pages automatically.
- Published knowledge stays in `demo/data/results.json`, separate from presentation code.
- Published Results carry `schemaVersion`, `immutable`, `contentVersion` and `contentHash`.
- The hash covers stable Result identity plus durable knowledge fields (`id`, title, summary, category, tags, decisions, next and source); presentation/local state is deliberately excluded.
- `scripts/verify-results.mjs` deterministically canonicalizes those fields and rejects a catalog whose stored SHA-256 no longer matches its immutable content.
- The browser independently recomputes the same digest and shows verified, unverified or mismatch state.
- Corrections should become explicit new revisions rather than edits to old immutable Results.

The durable architecture rationale is recorded in `docs/adr/0001-shared-renderer-immutable-results.md`.

## ChatGPT plugin implementation

The plugin package lives under `plugins/dashgpt/` and uses the stable manifest identifier `dashgpt`. The repository also exposes it through `.agents/plugins/marketplace.json` for repo-scoped testing.

Each DashGPT deployment exposes an MCP endpoint at `/mcp`. The Worker uses Cloudflare Agents' stateless `createMcpHandler` with the official Model Context Protocol server SDK rather than a handwritten protocol implementation.

Current MCP tools:

- `list_results`
- `get_result`
- `get_context_pack`
- `prepare_result_import`

The first three read an instance's published Results. `prepare_result_import` distills a supplied Result payload into schema v1, computes the immutable content hash, and returns an explicit `/demo/#import=...` URL. Opening that URL verifies the hash in the browser and stores the Result locally. This is a tactical MVP write path: it avoids a database/auth write API while still making user intent explicit.

The same plugin package can therefore be tested against another DashGPT deployment by registering that deployment's `/mcp` endpoint in ChatGPT developer mode. A public production plugin will need a durable production connection/auth architecture rather than hard-coding developer data.

ChatGPT MCP connection wiring (`.app.json`) is added only after a deployed endpoint has been registered in ChatGPT developer mode and a real `plugin_asdk_app...` connection id exists; do not invent that id in source control.

For future public submission, the Worker already has `/.well-known/openai-apps-challenge`; it returns the exact `OPENAI_APPS_CHALLENGE` environment value when configured.

## Verification

`.github/workflows/quality.yml` runs the project checks on the active feature branch and PRs.

`npm run check` currently covers:

- JavaScript syntax
- immutable Result catalog hashes
- plugin manifest + repo marketplace identity
- MCP initialization and tool discovery
- Result/context retrieval
- explicit plugin import-link generation
- Result deep-link routing
- OpenAI domain-verification challenge behavior

Cloudflare branch previews remain deployment verification; production is `develop` and the stable demo entry point is `/demo/`.

## Current development state

Status: **Feature 2 merged; Feature 3 immutable pages + DashGPT ChatGPT plugin MVP in progress**.

Completed before this change:

- repository bootstrap and durable product/development summaries
- M1 local-first Result → dashboard → Context Pack vertical slice
- Feature 2 shared-chat → published Result ingestion
- mobile-responsive Cloudflare Workers demo under `/demo/`
- Git-backed published Result catalog with source provenance

Active change:

- PR #6 / branch `feature/m3-immutable-pages-chatgpt-plugin`
- shared `/demo/result/<id>/` renderer
- immutable Result digests with repository + browser verification
- sanitized Result from the second shared conversation
- official stateless `/mcp` implementation
- explicit ChatGPT → DashGPT import-link MVP
- stable `dashgpt` plugin package, skill and repo marketplace
- MVP privacy/terms pages and future domain-verification endpoint

Next verification:

- make the repository quality workflow green
- make the Cloudflare feature deployment green
- verify a standalone Result page and `/mcp`
- connect the deployed MCP endpoint in ChatGPT developer mode as **DashGPT**
- record the real registered connection id in `.app.json`
- test the same plugin flow against a second/separate DashGPT deployment
- only then treat the friend/demo-user MVP gate as satisfied
