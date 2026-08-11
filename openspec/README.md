# DashGPT OpenSpec — current-state guide

This file explains how to interpret `openspec/` in the current repository.

## Source-of-truth rule

OpenSpec changes describe **scoped implementation decisions at the time they were made**. They are not a second product glossary and should not be rewritten retroactively just because product terminology later evolved.

The canonical current product model lives in `docs/product-summary.md`:

- **Card** is the primary user-facing memory entity.
- Search, Semantic Gallery and Dashes operate on the same canonical cards.
- Separate user-facing Results and Living Topics are not current product entities.
- Existing `Result` names in code, APIs, data and historical specs remain compatibility/implementation vocabulary until a dedicated migration changes them.

## Why many merged changes are still under `openspec/changes/`

The repository currently has no fully reconciled top-level capability-spec archive. Historical and partially completed changes remain under `openspec/changes/`, and CI deliberately validates only change directories modified by a PR.

Therefore **directory presence does not mean a capability is active, unmerged or unfinished**. Check the change tasks, current `develop`, PR state and `docs/roadmap.md`.

Do not mass-rewrite or mass-archive historical changes merely to make their wording match today's product language. Preserve implementation history and reconcile lifecycle state deliberately.

## Current `develop` reconciliation

### Merged implementation history

These changes correspond to implementation already merged into `develop`:

- `m1-local-result-vertical-slice`
- `f2-shared-chat-publish`
- `f3-immutable-pages-chatgpt-plugin`
- `f7-semantic-dashes` — PR #18
- `f8-semantic-gallery-ux` — PR #19
- `structured-chat-continuation` — PR #20
- `f9-living-product-board` — PR #21
- `f10-public-own-chat-onboarding` — PR #24
- `f11-shared-chat-fetch-hardening` — PR #25
- `f12-shared-chat-visible-dom` — PR #26
- `f13-share-import-no-direct-403` — PR #27
- `f14-chat-first-onboarding` — PR #28
- `f15-anonymous-share-resolver` — PR #30
- `f16-fresh-share-backend-resolver` — PR #31
- `f17-share-resolver-regression-safety-net` — PR #32

`f5-semantic-result-cards` remains historical planning: its dedicated PR #10 was closed without merge. Do not cite that PR as merged evidence; overlapping behavior in current code must be attributed to the actual later merged implementation that contains it.

### Umbrella changes with remaining external/future work

`f4-plugin-directory-submission` has merged implementation/submission-packet work, but public submission, approval, publication and second-user acceptance remain incomplete external gates.

`f6-zero-install-private-sync` has merged architecture, Vault core and GitHub adapter implementation. Production GitHub activation still requires protected secrets plus a real private-repository smoke test; Google Drive, Profile and later portability slices remain unimplemented and should be separated into dedicated future changes rather than silently widening one implementation PR.

### Open feature work not in `develop`

- PR #33: `f18-unified-card-dashboard` — draft. This is the active card-first `My Dash` UI consolidation, but it is **not merged**.
- PR #34: `f19-project-local-developer-memory` — open prototype. It is **not merged**.

Their OpenSpec directories live on their feature branches and are intentionally absent from current `develop` until merge.

## Required workflow for a production capability

1. Inspect `docs/product-summary.md`, `docs/development-summary.md`, this file, relevant existing changes and the actual code.
2. Inspect overlap with cards, Dashes, search, storage, continuation, UI and affected compatibility contracts.
3. Use a dedicated OpenSpec change for one capability.
4. Prepare a proposal, spec delta, verifiable `tasks.md`, and `design.md` when behavior/data/UX/architecture changes. Add an Impact Manifest when blast radius matters.
5. Strictly validate the change before editing production code.
6. Implement only approved scope. Update OpenSpec first if scope changes.
7. Add regression coverage and run targeted verification during development.
8. Run the canonical full repository verification once before PR/merge while applicable.
9. Verify important UI changes in a production preview and relevant mobile viewport.
10. Keep independent capabilities in independent PRs and link the PR to its OpenSpec change.
11. Reconcile tasks/current-state docs after meaningful state changes. Archive/sync completed changes deliberately when the repository has a validated capability-baseline/archive workflow.

Strict validation command used by current CI:

```bash
openspec validate <change-id> --type change --strict --no-interactive
```

`.github/workflows/openspec.yml` validates only changed OpenSpec change directories, so old-format historical changes do not become accidental blockers for unrelated work.

## Truthfulness rule

Never infer `implemented`, `merged`, `deployed`, `product_verified` or `publicly_available` from a proposal, task list, directory name or demo fixture alone. Use repository/PR/deployment evidence appropriate to that state.
