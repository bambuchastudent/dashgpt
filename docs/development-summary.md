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

Feature 4 follows this explicitly under `openspec/changes/f4-plugin-directory-submission/` with separate proposal, spec and task state.

## Documentation separation rule

Keep these concerns separate:

- `docs/product-summary.md` = WHAT DashGPT is and must do.
- `docs/development-summary.md` = HOW the team/agents build it.
- `docs/roadmap.md` = milestone ordering and current delivery intent.
- OpenSpec changes/specs = detailed scoped work.
- ADRs = durable architectural decisions and their rationale.
- `DASH.md` = short operational NOW / DONE / NEXT / BLOCKERS state, mirrored to the phone UI.

## Published page implementation

Standalone Result pages use one shared client-side renderer rather than copied per-Result HTML.

- Cloudflare Workers Static Assets serves the SPA shell for `/demo/result/<id>/` routes.
- Dashboard and Result pages share the same `index.html`, JavaScript and CSS, so renderer/style updates apply to old pages automatically.
- Published knowledge stays in `demo/data/results.json`, separate from presentation code.
- Published Results carry `schemaVersion`, `immutable`, `contentVersion` and `contentHash`.
- The hash covers stable Result identity plus durable knowledge fields. Optional structured continuation fields such as goal, current state, facts, constraints, preferences, questions, links, related material and language participate when present; presentation/local state and activity events are deliberately excluded.
- `scripts/verify-results.mjs` deterministically canonicalizes those fields and rejects a catalog whose stored SHA-256 no longer matches its immutable content.
- The browser independently recomputes the same digest and shows verified, unverified or mismatch state.
- Corrections should become explicit new revisions rather than edits to old immutable Results.

The durable architecture rationale is recorded in `docs/adr/0001-shared-renderer-immutable-results.md`.

## Structured chat continuation implementation

`demo/continuation.js` owns the dependency-free Continuation Brief domain, RU/EN templates and the current target transport adapter. It projects only allowlisted Result fields, filters credential-shaped values and unsafe URLs, renders source content only as data, and appends trusted assistant instructions solely from DashGPT-owned templates.

Every continuation action resolves the Result by id again before generation. The prepared transport explicitly selects full deeplink, priority-preserving compact deeplink or clipboard mode from encoded URL bytes; no path truncates the Markdown or falls back to the title. Preview edits are transient and transport success writes only a content-free `result.activity` event through the existing Vault boundary.

The target adapter owns the deeplink, byte budget, encoding and fallback policy so future providers do not leak transport assumptions into the brief renderer. Browser code opens a blank target synchronously, isolates `opener`, and then either navigates it with the prepared payload or copies the exact brief with a truthful manual-paste message.

## ChatGPT / Codex plugin implementation

The plugin package lives under `plugins/dashgpt/` and uses the stable manifest identifier `dashgpt`. The repository also exposes it through `.agents/plugins/marketplace.json` for repo-scoped/local testing.

The public-plugin implementation uses one **Universal MCP gateway** rather than assuming one MCP URL per user. The stable production endpoint is the deployment's `/mcp`; read/context tools accept an optional `siteUrl` to target another compatible DashGPT deployment.

Current MCP tools:

- `list_results`
- `open_semantic_dash`
- `get_result`
- `get_context_pack`
- `prepare_result_import`

`list_results`, `open_semantic_dash`, `get_result` and `get_context_pack` are read-only but open-world because they may fetch a user-selected public DashGPT site. `open_semantic_dash` can reopen an intentionally exposed saved Dash, return ambiguity choices, or prepare an explicit `#dash-import=` temporary preview; it cannot inspect an unexposed private browser Vault. `prepare_result_import` remains non-mutating at tool-call time: it builds schema-v1 immutable Result data, computes the content hash and returns an explicit `/demo/#import=...` URL for the chosen site.

A remote `siteUrl` is accepted only as HTTPS and is treated as DashGPT data only after compatible instance discovery. DashGPT instance protocol v1 exposes:

- `GET /.well-known/dashgpt.json`
- `GET /api/dashgpt/results`
- `GET /api/dashgpt/results/<id>`
- `GET /api/dashgpt/context/<id>`
- `GET /api/dashgpt/dashes`

This is intentionally a public/read-only MVP protocol. Private catalogs and automatic server-side writes will need a future authenticated protocol rather than weakening the current explicit-import boundary.

The durable rationale is recorded in `docs/adr/0002-universal-mcp-instance-protocol.md`.

## Public plugin submission implementation

Public submission material lives with the plugin package in `plugins/dashgpt/SUBMISSION.md`. It keeps the portal-facing listing copy, production MCP configuration, domain-verification runbook, starter prompts, reviewer tests, availability decision slot and release notes reviewable in Git.

The Worker exposes `/.well-known/openai-apps-challenge`; it returns exactly the configured `OPENAI_APPS_CHALLENGE` environment value when the submission portal provides a verification token.

The repository does not invent or require a `plugin_asdk_app...` id for the public submission path. Local/private connection mappings may still use `.app.json` when a real registered connection exists, but the public submission is based on the production MCP URL scanned by the platform.

## Project status surface

`DASH.md` is the short operational status source. `scripts/sync-dash.mjs` deterministically generates `demo/data/dash.json`, and CI rejects drift. The shared frontend renders that state at `/demo/dash/` so project progress is readable from a phone without opening GitHub.

## Verification

`.github/workflows/check.yml` runs the project checks on active feature branches and PRs.

`npm run check` currently covers:

- JavaScript syntax
- `DASH.md` ↔ mobile DASH synchronization
- immutable Result catalog hashes
- plugin manifest + repo marketplace identity
- MCP initialization and tool discovery
- tool annotations
- local Result/context retrieval
- public DashGPT instance discovery/read endpoints
- deterministic remote-instance routing
- explicit import-link generation for a selected DashGPT site
- semantic Result ranking and saved/temporary Dash routing
- Dash Review proposals, override precedence and inaccessible-Result redaction
- Dash Vault/GitHub object round trips and backward-compatible Vault loading
- public support/privacy/terms assets
- Result deep-link routing
- OpenAI domain-verification challenge behavior
- Continuation Brief structure, localization, privacy filtering and encoded-size boundaries
- current-Result rebuild, preview/edit/copy, transport fallback and content-free activity behavior

`npm run test:browser` runs the Playwright continuation flows against the real demo in desktop and narrow mobile projects. CI installs its pinned Chromium runtime before that browser-level gate.

Cloudflare branch previews are deployment verification. Production tracks `develop`; the stable UI entry point is `/demo/`, the operational status page is `/demo/dash/`, and the plugin endpoint is `/mcp`.

## Current development state

Status: **Structured Chat Continuation is implemented under the validated `structured-chat-continuation` OpenSpec change in draft PR #20 to `develop`; local quality and desktop/mobile Playwright CI are green.**

Feature 7 Semantic Dashes is merged in PR #18 and Feature 8 Semantic Gallery in PR #19. Structured Chat Continuation is rebased on both; it reuses Gallery's content-free activity value and routes existing Continue controls through one controller without changing Gallery ordering, density, zoom, Semantic Navigator or card layout.

External/manual release gates after merge:

- OpenAI Platform submitter must have Apps Management write access
- publisher developer/business identity must be verified
- create the DashGPT public plugin draft in the platform submission portal
- scan production `/mcp` and complete domain verification
- fill listing, prompts, tests, availability and release notes; submit for review
- after approval, publish the reviewed version
- validate from a second ChatGPT account against a separate DashGPT deployment
- only after that second-user proof mark the MVP complete and prepare the DashGPT v2 handoff
