# AGENTS.md

DashGPT is developed spec-first and must remain understandable across different AI providers.

Before meaningful work:

1. Read `docs/product-summary.md` — what we are building.
2. For product discussion or feature evaluation, read `docs/product-conversation-guide.md` — usability, public ChatGPT App, prior-art and correctness gates.
3. Read `docs/development-summary.md` — how we are building it.
4. Read `docs/roadmap.md` — current milestone and ordering.
5. Read the active OpenSpec change/spec for the task.
6. Inspect the actual repository before proposing code changes.

Rules:

- Do not mix product requirements with development-process decisions.
- Do not implement significant work outside an approved/active spec change.
- Do not send a feature to OpenSpec before its user journey, prior art, native-platform fit and correctness criteria are evaluated.
- Do not reconstruct durable decisions from chat history when they belong in the repository.
- Keep global instructions short; put detailed workflow in specs/skills.
- Prefer objective verification: tests, static checks, build and spec acceptance criteria.
- Leave task/spec state understandable to the next agent.
- Provider-specific tools are optional. Do not make the project depend on one coding agent.

Optional tools when available:

- Serena for symbol-aware exploration and precise edits/refactors.
- Graphify or another code-graph tool for context reduction on larger codebases.

For initial setup and first OpenSpec commands, read `docs/bootstrap.md`.
