# AGENTS.md

DashGPT is developed spec-first and must remain understandable across different AI providers.

Before meaningful work:

1. Read `docs/product-summary.md` — canonical product model and terminology.
2. For product discussion or feature evaluation, read `docs/product-conversation-guide.md`.
3. Read `docs/development-summary.md` — development workflow and verification rules.
4. Read `docs/roadmap.md` — merged, active and planned capability state.
5. Read `openspec/README.md`, then inspect the dedicated OpenSpec change/spec for the task.
6. Inspect the actual repository and relevant PR state before proposing or reporting code changes.

Rules:

- **Card is the canonical product entity.** Existing `Result` identifiers are legacy implementation/compatibility vocabulary unless a current approved change says otherwise.
- Do not introduce separate user-facing Results or Living Topics as parallel product models.
- Do not mix product requirements with development-process decisions.
- Do not implement a production capability outside its dedicated, validated OpenSpec change.
- Inspect overlap with cards, Dashes, search, storage, continuation and UI before implementation.
- Update OpenSpec first if approved scope changes.
- Add regression tests for changed behavior and escaped bugs.
- Keep separate capabilities in separate PRs.
- Do not reconstruct durable decisions from chat history when they belong in the repository.
- Never report an open PR, discussed feature or prototype as merged/deployed without repository evidence.
- Keep global instructions short; put detailed workflow in specs/skills.
- Prefer objective verification: tests, static checks, browser checks, builds and spec acceptance criteria.
- Leave task/spec/current-state documentation understandable to the next agent.

For future capability discussions, prefer a GitHub Issue as the durable product/PR handoff before opening the implementation change/PR when the capability is not already active.

Optional code-intelligence tools when available:

- Graphify for repository/dependency understanding with reduced loaded context.
- Serena for focused symbol-aware navigation and modifications.

If they are unavailable, use narrow repository inspection and record the fallback rather than blocking work.

For a fresh checkout and current OpenSpec commands, read `docs/bootstrap.md`.
