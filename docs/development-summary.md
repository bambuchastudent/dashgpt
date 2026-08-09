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
- ADRs (when introduced) = durable architectural decisions and their rationale.

## Current development state

Status: **M1 merged; Feature 2 shared-chat publishing MVP in progress**.

Completed:

- repository bootstrap and durable product/development summaries
- M1 local-first Result → dashboard → Context Pack vertical slice
- mobile-responsive static demo
- Cloudflare Workers static deployment
- project-level Cloudflare MCP configuration for supported agent clients
- first real seeded Results used to validate the information model

Active change:

- `openspec/changes/f2-shared-chat-publish/`
- branch: `feature/m2-shared-chat-publish`
- goal: allow an external assistant to turn a public shared-chat URL into a published DashGPT Result without introducing a mandatory model API
- MVP publication storage: Git-backed `demo/data/results.json`
- browser-local Results remain supported and are merged with published Results

Next verification:

- publish one real user-provided ChatGPT shared link end-to-end
- confirm the new card appears after Cloudflare deployment without clearing local storage
- confirm source provenance and Context Pack output
- then merge the Feature 2 change into `develop`
