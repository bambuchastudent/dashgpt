# DashGPT — Bootstrap Instructions

This is the shortest path from a fresh clone to the first spec-driven implementation change.

## Why OpenSpec first

DashGPT must be developed by interchangeable providers/agents. OpenSpec is the initial SDD framework because one repository can be configured for multiple coding tools and the durable artifacts stay in the project rather than in one provider's chat history.

This is a tooling choice, not a product dependency.

## 1. Clone and inspect

```bash
git clone git@github.com:bambuchastudent/dashgpt.git
cd dashgpt
git checkout develop
```

Read first:

```text
docs/product-summary.md
docs/development-summary.md
docs/roadmap.md
AGENTS.md
```

## 2. Install OpenSpec

Prerequisite: Node.js 20.19.0+.

```bash
npm install -g @fission-ai/openspec@latest
openspec --version
```

## 3. Initialize for the agents we expect to use

Start with the core profile and configure the same repository for the main clients:

```bash
openspec init --tools claude,codex,github-copilot,opencode --profile core
```

If one of those clients is not installed on the machine, either initialize interactively with only the tools present or rerun/update later.

Useful inspection commands:

```bash
openspec list
openspec view
openspec status --help
```

After upgrading OpenSpec or changing tool/profile configuration:

```bash
openspec update
```

## 4. First agent interaction — explore before writing code

In a supported AI coding assistant chat, start with an exploration pass. Command syntax can differ by client; use the OpenSpec command exposed by that client.

Intent/prompt:

```text
/opsx:explore
Read AGENTS.md, docs/product-summary.md, docs/development-summary.md and docs/roadmap.md.
We are in M0 bootstrap and preparing M1.
Identify contradictions, missing product decisions, risky assumptions and questions that must be answered before the first implementation change.
Do not implement anything and do not redesign the product beyond the documented scope.
```

Review the answer. Fix real contradictions in the repository before generating implementation work.

## 5. First implementation change — M1

Once the bootstrap review is satisfactory, create the first change:

```text
/opsx:propose m1-local-result-vertical-slice
Build the first local-first DashGPT vertical slice defined in docs/roadmap.md.
The user must be able to create/import a Result, persist it locally, browse and search Results, mark favorites, open Result details, and generate/copy/export a Context Pack for continuation in another chat or agent.
The core must not require Cloudflare, GitHub APIs or a paid LLM API.
Keep the implementation intentionally small and preserve provider/storage portability.
Use docs/product-summary.md as product requirements and docs/development-summary.md as development constraints.
```

Before implementation, review the generated proposal/spec/design/tasks and resolve ambiguous architecture decisions explicitly.

Then implement the accepted change:

```text
/opsx:apply m1-local-result-vertical-slice
```

When the change is complete and verified, sync/archive it according to the generated workflow:

```text
/opsx:sync m1-local-result-vertical-slice
/opsx:archive m1-local-result-vertical-slice
```

## 6. When more control is needed

The default `core` workflow is deliberately small. If we later want explicit incremental artifact creation and verification commands, configure the expanded workflow:

```bash
openspec config profile
openspec update
```

Then use the generated commands such as `new`, `continue`, `ff` and `verify` where useful rather than adding a second SDD framework.

## 7. Tooling policy for M1

- Use the strongest available reasoning model to review product/spec/architecture decisions.
- Implementation can be delegated to cheaper/local models when they can satisfy the same spec and tests.
- Serena may be used for symbol-aware code work once a codebase exists.
- Graphify/code-graph tooling is optional and should be added only when repository size/context cost justifies it.
- Do not add Beads or another task system during M0/M1 unless parallel-agent task dependencies become a real problem.

## Definition of a successful bootstrap

M0 is complete when:

- OpenSpec is initialized for the desired agents.
- Agents can discover the same product/development/roadmap context from the repo.
- The M1 OpenSpec change exists and has been reviewed.
- No implementation decision depends solely on a previous chat conversation.
