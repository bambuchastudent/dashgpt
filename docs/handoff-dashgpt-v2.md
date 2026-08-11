# DashGPT v2 — historical handoff (superseded)

> **Superseded. Do not use this file as current project state.**
>
> This path is retained so old links do not break. The original handoff was created on 2026-08-09 while Feature 4 public submission was blocked on publisher identity review. That blocker later changed, and the repository advanced substantially through Feature 17 plus open Feature 18/19 PRs.

## Current sources of truth

Read instead:

1. `docs/product-summary.md` — canonical **card-first** product model.
2. `docs/product-conversation-guide.md` — product/usability evaluation rules.
3. `docs/development-summary.md` — current implementation workflow and repository state.
4. `docs/roadmap.md` — merged, open and planned capability state.
5. `openspec/README.md` — how to interpret historical vs current OpenSpec changes.
6. `DASH.md` — short developer operational handoff.
7. The dedicated OpenSpec change + actual PR/repository state for the capability being worked on.

If any old quotation or external link points to this file, treat the Git history as the archive of the original 2026-08-09 handoff rather than copying its old status claims into new work.

## What became stale in the original handoff

The original document described DashGPT as `result-first`, treated Feature 4 as the main active work and recorded publisher identity as `Identity in review`.

Those are no longer the current project framing/state:

- **Card** is now the canonical user-facing memory entity; existing `Result` names are implementation compatibility vocabulary.
- Semantic Dashes, Semantic Gallery, Structured Chat Continuation and Product Board dogfooding are merged.
- Chat-first/onboarding/Share resolver hardening through Feature 17 / PR #32 is merged into `develop`.
- Feature 4 task state records publisher identity as verified; public submission/approval/publication/second-user acceptance remain external gates.
- PR #33 (Feature 18 Unified Card Dashboard / My Dash) is open draft and not merged.
- PR #34 (Feature 19 Project-local Developer Memory) is open and not merged.

## Historical source conversation

The original handoff recorded this source conversation for continuity:

`https://chatgpt.com/share/6a78a99f-bff4-83eb-80ce-e51389a70861`

That link is historical provenance only; it is not the source of truth for current implementation state.

## Rule for future handoffs

Do not create another long timestamped handoff that competes with canonical docs. Prefer:

- product decisions in `docs/product-summary.md` / product guide;
- implementation process in `docs/development-summary.md`;
- ordering/state in `docs/roadmap.md`;
- scoped work in OpenSpec + GitHub Issue/PR;
- short operational NOW/DONE/NEXT/BLOCKERS in `DASH.md`.

A future handoff may link these sources and summarize the exact active scope, but repository/OpenSpec/verified PR state always wins.
