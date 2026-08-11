# DashGPT — Contributor / OpenSpec Bootstrap

This is the shortest path from a fresh checkout to a correctly scoped DashGPT change **today**.

The repository is already bootstrapped. Do not follow old instructions that treat the project as M0 or ask you to create the M1 change again.

## 1. Clone current `develop`

```bash
git clone git@github.com:bambuchastudent/dashgpt.git
cd dashgpt
git checkout develop
```

Use a current Node.js 22 environment, matching CI.

Install dependencies with the package manager appropriate to the checkout. The current repository does not depend on a build step merely to inspect the docs/specs.

## 2. Read current sources of truth

Read in this order:

```text
docs/product-summary.md
docs/product-conversation-guide.md
docs/development-summary.md
docs/roadmap.md
openspec/README.md
AGENTS.md
```

Then inspect the actual code and relevant OpenSpec/PR state for the capability you are touching.

Key terminology rule: **Card is the canonical product entity.** Existing `Result` identifiers are legacy implementation/compatibility names unless you are referring to a literal current contract.

## 3. OpenSpec setup

OpenSpec is already used by the repository. You normally need the CLI, not a new initialization:

```bash
npm install --global @fission-ai/openspec@latest
openspec --version
```

**Do not run `openspec init` on an existing DashGPT checkout as normal setup.** That old bootstrap instruction is obsolete and risks regenerating provider-specific files over an established repository.

Useful inspection commands depend on the installed OpenSpec version. The repository's CI contract for change validation is:

```bash
openspec validate <change-id> --type change --strict --no-interactive
```

Read `.github/workflows/openspec.yml` before changing workflow assumptions.

## 4. Before creating a production change

First determine whether the work is:

- already implemented on `develop`;
- present only in an open PR/branch;
- historical OpenSpec work;
- a new capability;
- an external activation/release step.

`openspec/changes/` is not itself an active-work list. Read `openspec/README.md` and verify PR/repository state.

For a future capability that is not already active, prefer a GitHub Issue as the durable handoff containing the full product/OpenSpec input before starting implementation.

## 5. Create/use the dedicated OpenSpec change

For one production capability:

1. inspect overlapping changes/code;
2. create or continue one dedicated change;
3. prepare proposal;
4. prepare spec delta;
5. add `design.md` when behavior/data/UX/architecture changes;
6. create verifiable `tasks.md`;
7. add an Impact Manifest when blast radius matters;
8. strictly validate the change;
9. only then edit production code.

If implementation scope changes, update and revalidate OpenSpec **before** widening production code.

Historical merged change artifacts should not be mass-rewritten merely to replace old `Result` vocabulary with `Card`; they describe the implementation scope that existed at the time.

## 6. Repository verification on current `develop`

Current scripts available on `develop` are:

```bash
npm run check
npm run test:browser
```

Use focused checks during development. Before PR/merge, run the full applicable repository/browser gate required by the change.

Open Feature 18 PR #33 introduces `verify:fast` and `verify:full` on its branch. Until that PR (or an equivalent change) merges, those scripts are **not** a valid command for a clean current `develop` checkout.

Important UI changes also require verification in a production preview and a relevant mobile viewport; do not infer user-visible correctness from unit/static checks alone.

## 7. Code-intelligence tools

When available:

- use Graphify for dependency/repository understanding with reduced context;
- use Serena for focused code navigation/modifications.

When unavailable, use narrow repository search/tree/symbol inspection and record the fallback where relevant. Do not block correctness on optional tooling.

## 8. PR and handoff rules

- Keep separate capabilities in separate PRs.
- Link the PR to its OpenSpec change.
- Add regression tests for changed behavior and escaped bugs.
- Never claim a feature is merged/deployed/working without evidence for that exact state.
- Update roadmap/tasks/current-state docs when the project state materially changes.
- Keep credentials, private keys and secrets out of chat, repository and portable memory.

## Current orientation

At the time of this reconciliation:

- `develop` contains merged work through Feature 17 / PR #32;
- PR #33 (`f18-unified-card-dashboard`) is an open draft and is not in `develop`;
- PR #34 (`f19-project-local-developer-memory`) is open and is not in `develop`;
- Feature 4 public-app release and Feature 6 production GitHub activation still have external/manual gates.

Always re-check repository/PR state rather than treating this paragraph as permanent truth.
