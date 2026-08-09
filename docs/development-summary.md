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

## Published Result rendering and immutability

Published Result content and page presentation are separate concerns.

- Published Results remain structured records in the Result catalog.
- All Result URLs are rendered by one shared application renderer instead of generating copied HTML pages.
- Renderer/CSS/navigation changes therefore update old Result pages without rewriting their stored content.
- Published records use `schemas/result.v1.schema.json` as the current portable contract.
- Durable fields are canonicalized deterministically and protected with SHA-256 content hashes.
- `immutable: true`, `contentVersion` and `contentHash` make the boundary visible and machine-checkable.
- Favorite state and other local presentation/user state are deliberately outside the durable content hash.
- Browser verification uses WebCrypto; repository verification uses `scripts/verify-results.mjs`.
- The current deterministic JSON canonicalization is intentionally small. RFC 8785 JCS is the standards-based upgrade path if cross-language signatures or stronger interoperability require a formal canonicalization contract.

Cloudflare serves the common renderer for stable `/demo/result/<id>` routes. This is a deployment adapter; the Result model itself is not Cloudflare-specific.

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
- ADRs/architecture notes = durable architectural decisions and rationale.

## Current development state

Status: **M1 and Feature 2 merged; Feature 3 immutable Result pages + topic map in progress**.

Completed:

- repository bootstrap and durable product/development summaries
- M1 local-first Result → dashboard → Context Pack vertical slice
- Cloudflare Workers deployment with `develop` as production branch
- Feature 2 shared ChatGPT link → published Git-backed Result flow
- source provenance in Result details and Context Packs
- first real shared-chat Result published end-to-end

Active change:

- branch: `feature/f3-immutable-results-mindmap`
- common shared renderer for stable Result pages
- schema + immutable flag + SHA-256 content integrity
- current/latest Results before the archive
- indexed category mindmap for topic navigation
- second real shared-chat Result, with personal document data intentionally excluded from publication

Next verification:

- run syntax and immutable-content checks
- verify feature deployment and stable deep-link Result routes
- inspect category mindmap on mobile
- review the second published Result page
- merge only after review
